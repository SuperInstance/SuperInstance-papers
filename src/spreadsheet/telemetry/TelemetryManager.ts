/**
 * @file telemetry/TelemetryManager.ts
 * @brief Core telemetry management including event collection, batching, and session tracking
 *
 * This file implements the main TelemetryManager class that coordinates all telemetry
 * operations including event collection, batching, session tracking, privacy controls,
 * and integration with the analytics collector and exporter.
 *
 * @copyright Copyright (c) 2026 POLLN
 * @license MIT
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  BaseEvent,
  TelemetryConfig,
  AnonymousUserId,
  SessionId,
  EventId,
  Timestamp,
  Session,
  ConsentStatus,
  EventCategory,
  EventPriority,
  PrivacyLevel,
  DEFAULT_PRIVACY_CONFIG,
  DEFAULT_COLLECTOR_CONFIG,
  DEFAULT_ROLLUP_CONFIG,
} from './types.js';
import { PrivacyManager } from './PrivacyManager.js';
import { AnalyticsCollector } from './AnalyticsCollector.js';
import { Aggregator } from './Aggregator.js';
import { Exporter, getDefaultExportPlatforms } from './Exporter.js';
import { validateEvent, getEventSchema } from './EventTypes.js';

/**
 * Telemetry event queue entry
 */
interface QueuedEvent {
  event: BaseEvent;
  timestamp: number;
  retries: number;
}

/**
 * Session tracking data
 */
interface SessionData {
  sessionId: SessionId;
  userId: AnonymousUserId;
  startTime: Timestamp;
  lastActivity: Timestamp;
  eventCount: number;
  metadata: Record<string, unknown>;
}

/**
 * Telemetry Manager class
 * Main coordinator for all telemetry operations
 */
export class TelemetryManager {
  private readonly config: TelemetryConfig;
  private readonly privacyManager: PrivacyManager;
  private readonly analyticsCollector: AnalyticsCollector;
  private readonly aggregator: Aggregator;
  private readonly exporter: Exporter;

  private readonly eventQueue: QueuedEvent[];
  private currentSession: SessionData | null = null;
  private userId: AnonymousUserId;
  private flushTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private sessionTimeoutTimer: NodeJS.Timeout | null = null;

  /**
   * Create a new TelemetryManager
   * @param config - Telemetry configuration
   */
  constructor(config?: Partial<TelemetryConfig>) {
    this.config = this.mergeConfig(config);
    this.privacyManager = new PrivacyManager(this.config.privacy);
    this.analyticsCollector = new AnalyticsCollector(
      this.privacyManager,
      DEFAULT_COLLECTOR_CONFIG
    );
    this.aggregator = new Aggregator(DEFAULT_ROLLUP_CONFIG);
    this.exporter = new Exporter(this.privacyManager, this.config.exportPlatforms);
    this.eventQueue = [];

    // Generate or retrieve user ID
    this.userId = this.generateUserId();

    // Initialize session
    this.startSession();

    // Start flush timer
    this.startFlushTimer();

    // Start session timeout monitoring
    this.startSessionTimeoutMonitoring();
  }

  /**
   * Merge user config with defaults
   * @param config - User configuration
   * @returns Merged configuration
   */
  private mergeConfig(config?: Partial<TelemetryConfig>): TelemetryConfig {
    return {
      enabled: config?.enabled ?? true,
      samplingRate: config?.samplingRate ?? 1.0,
      samplingStrategy: config?.samplingStrategy ?? 'none',
      batchSize: config?.batchSize ?? 100,
      flushInterval: config?.flushInterval ?? 60000, // 1 minute
      maxQueueSize: config?.maxQueueSize ?? 10000,
      retentionPolicy: config?.retentionPolicy ?? '90d',
      defaultConsent: config?.defaultConsent ?? ConsentStatus.PENDING,
      exportPlatforms: config?.exportPlatforms ?? getDefaultExportPlatforms(),
      privacy: { ...DEFAULT_PRIVACY_CONFIG, ...config?.privacy },
    };
  }

  /**
   * Generate anonymous user ID
   * @returns Anonymous user ID
   */
  private generateUserId(): AnonymousUserId {
    // Try to get existing user ID from storage
    // For now, generate a new one
    const rawId = uuidv4();
    return this.privacyManager.anonymizeIdentifier(rawId, 'polln-telemetry');
  }

  /**
   * Start a new session
   */
  private startSession(): void {
    const sessionId = `session_${uuidv4()}` as SessionId;
    const startTime = new Date().toISOString() as Timestamp;

    this.currentSession = {
      sessionId,
      userId: this.userId,
      startTime,
      lastActivity: startTime,
      eventCount: 0,
      metadata: {},
    };

    // Track session start event
    this.trackEvent('session_start', EventCategory.LIFECYCLE, {
      startTime,
      previousSessionId: undefined,
    });
  }

  /**
   * End current session
   */
  private endSession(): void {
    if (!this.currentSession) return;

    const endTime = new Date().toISOString() as Timestamp;
    const duration =
      new Date(endTime).getTime() - new Date(this.currentSession.startTime).getTime();

    // Track session end event
    this.trackEvent('session_end', EventCategory.LIFECYCLE, {
      duration,
      eventCount: this.currentSession.eventCount,
    });

    // Flush any pending events
    void this.flush();

    this.currentSession = null;
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (!this.isShuttingDown) {
        void this.flush();
      }
    }, this.config.flushInterval);
  }

  /**
   * Start session timeout monitoring
   */
  private startSessionTimeoutMonitoring(): void {
    if (this.sessionTimeoutTimer) {
      clearTimeout(this.sessionTimeoutTimer);
    }

    // 30 minutes of inactivity ends the session
    const SESSION_TIMEOUT = 30 * 60 * 1000;

    this.sessionTimeoutTimer = setInterval(() => {
      if (this.currentSession) {
        const lastActivity = new Date(this.currentSession.lastActivity).getTime();
        const now = Date.now();

        if (now - lastActivity > SESSION_TIMEOUT) {
          this.endSession();
          this.startSession();
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Track an event
   * @param type - Event type
   * @param category - Event category
   * @param properties - Event properties
   * @param priority - Event priority (optional)
   * @returns Event ID or null if not tracked
   */
  trackEvent(
    type: string,
    category: EventCategory,
    properties?: Record<string, unknown>,
    priority?: EventPriority
  ): EventId | null {
    if (!this.config.enabled) {
      return null;
    }

    // Check consent
    if (!this.hasConsent()) {
      return null;
    }

    // Apply sampling
    if (!this.shouldSample(type)) {
      return null;
    }

    // Get event schema
    const schema = getEventSchema(type);
    if (!schema) {
      console.warn(`[Telemetry] Unknown event type: ${type}`);
      return null;
    }

    // Create event
    const event: BaseEvent = {
      id: this.generateEventId(),
      type,
      category,
      timestamp: new Date().toISOString() as Timestamp,
      userId: this.userId,
      sessionId: this.currentSession?.sessionId || ('unknown' as SessionId),
      priority: priority || schema.priority,
      privacyLevel: schema.privacyLevel,
      properties: properties || {},
      context: this.getEventContext(),
    };

    // Validate event
    const validation = validateEvent(event);
    if (!validation.valid) {
      console.warn('[Telemetry] Event validation failed:', validation.errors);
      return null;
    }

    // Sanitize event properties
    event.properties = this.privacyManager.sanitizeObject(event.properties);

    // Update session activity
    if (this.currentSession) {
      this.currentSession.lastActivity = event.timestamp;
      this.currentSession.eventCount++;
    }

    // Add to queue
    this.queueEvent(event);

    // Add to aggregator
    this.aggregator.aggregate([event]);

    // Record journey step
    this.analyticsCollector.recordJourneyStep(
      event.sessionId,
      type,
      properties?.feature as string
    );

    return event.id;
  }

  /**
   * Generate unique event ID
   * @returns Event ID
   */
  private generateEventId(): EventId {
    return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Get event context
   * @returns Event context
   */
  private getEventContext(): Record<string, unknown> {
    return {
      appVersion: process.env.npm_package_version || '1.0.0',
      os: process.platform,
      locale: process.env.LANG || 'en-US',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  /**
   * Queue an event for processing
   * @param event - Event to queue
   */
  private queueEvent(event: BaseEvent): void {
    // Check queue size limit
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      // Remove oldest event
      this.eventQueue.shift();
    }

    this.eventQueue.push({
      event,
      timestamp: Date.now(),
      retries: 0,
    });

    // Flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      void this.flush();
    }
  }

  /**
   * Check if event should be sampled
   * @param type - Event type
   * @returns Whether to track this event
   */
  private shouldSample(type: string): boolean {
    if (this.config.samplingRate >= 1.0) {
      return true;
    }

    switch (this.config.samplingStrategy) {
      case 'none':
        return true;

      case 'random':
        return Math.random() < this.config.samplingRate;

      case 'consistent_hash':
        const hash = crypto
          .createHash('md5')
          .update(this.userId + type)
          .digest('hex');
        const hashValue = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
        return hashValue < this.config.samplingRate;

      case 'session_hash':
        const sessionHash = crypto
          .createHash('md5')
          .update((this.currentSession?.sessionId || '') + type)
          .digest('hex');
        const sessionHashValue = parseInt(sessionHash.substring(0, 8), 16) / 0xffffffff;
        return sessionHashValue < this.config.samplingRate;

      case 'adaptive':
        // Sample low-priority events more
        const schema = getEventSchema(type);
        const factor = schema?.priority === EventPriority.LOW ? 0.5 : 1.0;
        return Math.random() < this.config.samplingRate * factor;

      default:
        return true;
    }
  }

  /**
   * Check if user has given consent
   * @returns Whether user has consented
   */
  private hasConsent(): boolean {
    return this.privacyManager.hasConsent(this.userId);
  }

  /**
   * Flush queued events to exporter
   * @returns Number of events flushed
   */
  async flush(): Promise<number> {
    if (this.eventQueue.length === 0) {
      return 0;
    }

    // Get events from queue
    const events = this.eventQueue.splice(0, this.eventQueue.length);

    // Send to exporter
    const queuedEvents = events.map(entry => entry.event);
    this.exporter.queueExport(queuedEvents);

    // Also get analytics collector events
    const collectorEvents = this.analyticsCollector.getQueuedEvents();
    if (collectorEvents.length > 0) {
      this.exporter.queueExport(collectorEvents);
      this.analyticsCollector.clearQueuedEvents();
    }

    return queuedEvents.length;
  }

  /**
   * Set consent status
   * @param status - Consent status
   * @param categories - Category-specific consent
   */
  setConsent(
    status: ConsentStatus,
    categories?: {
      analytics?: boolean;
      marketing?: boolean;
      performance?: boolean;
    }
  ): void {
    this.privacyManager.updateConsent(this.userId, status, categories);

    if (status === ConsentStatus.OPTED_OUT) {
      // Clear pending data
      this.eventQueue.length = 0;
    }
  }

  /**
   * Get current session information
   * @returns Session information or null
   */
  getSession(): Session | null {
    if (!this.currentSession) {
      return null;
    }

    return {
      id: this.currentSession.sessionId,
      userId: this.currentSession.userId,
      startTime: this.currentSession.startTime,
      endTime: null,
      eventCount: this.currentSession.eventCount,
      metadata: this.currentSession.metadata,
    };
  }

  /**
   * Get user ID
   * @returns Anonymous user ID
   */
  getUserId(): AnonymousUserId {
    return this.userId;
  }

  /**
   * Get aggregated statistics
   * @param hours - Number of hours to look back
   * @returns Aggregated statistics
   */
  getStats(hours = 24) {
    const end = new Date().toISOString() as Timestamp;
    const start = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString() as Timestamp;

    return this.aggregator.getStats(start, end);
  }

  /**
   * Get performance metrics from analytics collector
   * @param metricName - Metric name
   * @returns Performance statistics
   */
  getPerformanceStats(metricName: string) {
    return this.analyticsCollector.getPerformanceStats(metricName);
  }

  /**
   * Get top errors from analytics collector
   * @param limit - Maximum number of errors
   * @returns Top errors
   */
  getTopErrors(limit = 10) {
    return this.analyticsCollector.getTopErrors(limit);
  }

  /**
   * Get feature usage statistics
   * @returns Feature usage map
   */
  getFeatureUsageStats() {
    return this.analyticsCollector.getFeatureUsageStats(this.userId);
  }

  /**
   * Get export statistics
   * @returns Export statistics
   */
  getExportStats() {
    return this.exporter.getStats();
  }

  /**
   * Get consent statistics
   * @returns Consent statistics
   */
  getConsentStats() {
    return this.privacyManager.getConsentStats();
  }

  /**
   * Export user data (GDPR/CCPA right to access)
   * @returns User data export
   */
  exportUserData() {
    return {
      userId: this.userId,
      consent: this.privacyManager.exportConsentData(this.userId),
      sessions: this.getSession(),
      stats: this.getStats(24 * 30), // 30 days
      featureUsage: this.getFeatureUsageStats(),
    };
  }

  /**
   * Delete user data (GDPR/CCPA right to be forgotten)
   */
  deleteUserData(): void {
    // Revoke all consent
    this.privacyManager.revokeAllConsent(this.userId);

    // Clear queue
    this.eventQueue.length = 0;

    // Delete user data from privacy manager
    this.privacyManager.deleteUserData(this.userId);

    // Generate new user ID
    this.userId = this.generateUserId();

    // Start new session
    this.startSession();
  }

  /**
   * Shutdown telemetry manager gracefully
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Stop timers
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.sessionTimeoutTimer) {
      clearTimeout(this.sessionTimeoutTimer);
      this.sessionTimeoutTimer = null;
    }

    // End session
    this.endSession();

    // Flush remaining events
    await this.flush();

    // Shutdown exporter
    await this.exporter.shutdown();
  }

  /**
   * Enable telemetry
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable telemetry
   */
  disable(): void {
    this.config.enabled = false;
    this.eventQueue.length = 0;
  }

  /**
   * Check if telemetry is enabled
   * @returns Whether telemetry is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get configuration
   * @returns Current configuration (sans sensitive data)
   */
  getConfig(): Partial<TelemetryConfig> {
    return {
      enabled: this.config.enabled,
      samplingRate: this.config.samplingRate,
      samplingStrategy: this.config.samplingStrategy,
      batchSize: this.config.batchSize,
      flushInterval: this.config.flushInterval,
      maxQueueSize: this.config.maxQueueSize,
      retentionPolicy: this.config.retentionPolicy,
      defaultConsent: this.config.defaultConsent,
      exportPlatforms: this.config.exportPlatforms.map(p => ({
        ...p,
        apiKey: p.apiKey ? '***REDACTED***' : undefined,
      })),
      privacy: this.config.privacy,
    };
  }

  /**
   * Update configuration
   * @param updates - Configuration updates
   */
  updateConfig(updates: Partial<TelemConfig>): void {
    Object.assign(this.config, updates);

    // Update export platforms if changed
    if (updates.exportPlatforms) {
      for (const platformConfig of updates.exportPlatforms) {
        this.exporter.updatePlatformConfig(platformConfig);
      }
    }
  }
}

/**
 * Default telemetry configuration
 */
export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  enabled: true,
  samplingRate: 1.0,
  samplingStrategy: 'none',
  batchSize: 100,
  flushInterval: 60000,
  maxQueueSize: 10000,
  retentionPolicy: '90d',
  defaultConsent: ConsentStatus.PENDING,
  exportPlatforms: getDefaultExportPlatforms(),
  privacy: DEFAULT_PRIVACY_CONFIG,
};

/**
 * TelemetryConfig type alias for backwards compatibility
 */
type TeleConfig = Partial<TelemetryConfig>;
