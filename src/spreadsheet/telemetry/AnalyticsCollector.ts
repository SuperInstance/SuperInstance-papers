/**
 * @file telemetry/AnalyticsCollector.ts
 * @brief Usage metrics, performance tracking, and feature analytics collection
 *
 * This file implements comprehensive analytics collection including usage metrics,
 * performance monitoring, error tracking, feature usage analysis, and user journey
 * mapping for the POLLN spreadsheet application.
 *
 * @copyright Copyright (c) 2026 POLLN
 * @license MIT
 */

import { performance } from 'perf_hooks';
import {
  BaseEvent,
  EventCategory,
  EventId,
  EventPriority,
  PerformanceEvent,
  ErrorEvent,
  FeatureEvent,
  AnonymousUserId,
  SessionId,
  Timestamp,
  LifecycleEvent,
} from './types.js';
import { PrivacyManager } from './PrivacyManager.js';

/**
 * Performance metric entry
 */
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Timestamp;
  metadata?: Record<string, unknown>;
}

/**
 * Feature usage entry
 */
interface FeatureUsageEntry {
  feature: string;
  timestamp: Timestamp;
  duration?: number;
  success: boolean;
  properties?: Record<string, unknown>;
}

/**
 * Error tracking entry
 */
interface ErrorEntry {
  message: string;
  code?: string;
  stack?: string;
  component: string;
  timestamp: Timestamp;
  count: number;
}

/**
 * User journey step
 */
interface JourneyStep {
  action: string;
  timestamp: Timestamp;
  feature?: string;
  duration?: number;
}

/**
 * Analytics collector configuration
 */
export interface AnalyticsCollectorConfig {
  /** Enable/disable collection */
  enabled: boolean;

  /** Performance tracking configuration */
  performance: {
    enabled: boolean;
    slowThreshold: number; // ms
    timeoutThreshold: number; // ms
    sampleRate: number;
  };

  /** Error tracking configuration */
  errors: {
    enabled: boolean;
    maxStackFrames: number;
    includeContext: boolean;
  };

  /** Feature usage configuration */
  features: {
    enabled: boolean;
    trackDuration: boolean;
    trackParameters: boolean;
  };

  /** User journey configuration */
  journey: {
    enabled: boolean;
    maxSteps: number;
    sessionTimeout: number; // ms
  };
}

/**
 * Analytics Collector class
 * Collects and manages analytics data for the telemetry system
 */
export class AnalyticsCollector {
  private readonly privacyManager: PrivacyManager;
  private readonly config: AnalyticsCollectorConfig;
  private readonly performanceMetrics: Map<string, PerformanceMetric[]>;
  private readonly errorCounts: Map<string, ErrorEntry>;
  private readonly featureUsage: Map<string, FeatureUsageEntry[]>;
  private readonly userJourneys: Map<SessionId, JourneyStep[]>;
  private readonly activeOperations: Map<string, number>;
  private eventQueue: BaseEvent[] = [];

  /**
   * Create a new AnalyticsCollector
   * @param privacyManager - Privacy manager instance
   * @param config - Collector configuration
   */
  constructor(privacyManager: PrivacyManager, config?: Partial<AnalyticsCollectorConfig>) {
    this.privacyManager = privacyManager;
    this.config = this.mergeConfig(config);
    this.performanceMetrics = new Map();
    this.errorCounts = new Map();
    this.featureUsage = new Map();
    this.userJourneys = new Map();
    this.activeOperations = new Map();
  }

  /**
   * Merge user config with defaults
   * @param config - User configuration
   * @returns Merged configuration
   */
  private mergeConfig(config?: Partial<AnalyticsCollectorConfig>): AnalyticsCollectorConfig {
    return {
      enabled: config?.enabled ?? true,
      performance: {
        enabled: config?.performance?.enabled ?? true,
        slowThreshold: config?.performance?.slowThreshold ?? 1000,
        timeoutThreshold: config?.performance?.timeoutThreshold ?? 10000,
        sampleRate: config?.performance?.sampleRate ?? 1.0,
      },
      errors: {
        enabled: config?.errors?.enabled ?? true,
        maxStackFrames: config?.errors?.maxStackFrames ?? 10,
        includeContext: config?.errors?.includeContext ?? true,
      },
      features: {
        enabled: config?.features?.enabled ?? true,
        trackDuration: config?.features?.trackDuration ?? true,
        trackParameters: config?.features?.trackParameters ?? false,
      },
      journey: {
        enabled: config?.journey?.enabled ?? true,
        maxSteps: config?.journey?.maxSteps ?? 100,
        sessionTimeout: config?.journey?.sessionTimeout ?? 30 * 60 * 1000, // 30 min
      },
    };
  }

  /**
   * Start tracking a performance operation
   * @param operationName - Name of the operation
   * @param userId - User ID
   * @param sessionId - Session ID
   * @returns Operation ID for later tracking
   */
  startPerformanceOperation(
    operationName: string,
    userId: AnonymousUserId,
    sessionId: SessionId
  ): string {
    if (!this.config.enabled || !this.config.performance.enabled) {
      return '';
    }

    const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.activeOperations.set(operationId, performance.now());

    return operationId;
  }

  /**
   * End tracking a performance operation
   * @param operationId - Operation ID from startPerformanceOperation
   * @param userId - User ID
   * @param sessionId - Session ID
   * @param metadata - Additional metadata
   */
  endPerformanceOperation(
    operationId: string,
    userId: AnonymousUserId,
    sessionId: SessionId,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.enabled || !this.config.performance.enabled || !operationId) {
      return;
    }

    const startTime = this.activeOperations.get(operationId);
    if (!startTime) {
      return;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    this.activeOperations.delete(operationId);

    // Sample based on configuration
    if (Math.random() > this.config.performance.sampleRate) {
      return;
    }

    // Determine event type based on duration
    let eventType: PerformanceEvent['type'];
    let priority: EventPriority;

    if (duration > this.config.performance.timeoutThreshold) {
      eventType = 'perf_timeout';
      priority = EventPriority.CRITICAL;
    } else if (duration > this.config.performance.slowThreshold) {
      eventType = 'perf_slow';
      priority = EventPriority.HIGH;
    } else {
      eventType = 'perf_metric';
      priority = EventPriority.NORMAL;
    }

    const event: PerformanceEvent = {
      id: this.generateEventId(),
      type: eventType,
      category: EventCategory.PERFORMANCE,
      timestamp: new Date().toISOString() as Timestamp,
      userId,
      sessionId,
      priority,
      privacyLevel: 'aggregated' as const,
      properties: {
        metric: operationId.split('_')[0],
        duration: Math.round(duration),
        threshold: this.config.performance.slowThreshold,
        operation: operationId,
        ...metadata,
      },
    };

    this.queueEvent(event);
    this.storePerformanceMetric(operationId.split('_')[0], duration, new Date().toISOString() as Timestamp, metadata);
  }

  /**
   * Store a performance metric
   * @param name - Metric name
   * @param duration - Duration in ms
   * @param timestamp - Timestamp
   * @param metadata - Additional metadata
   */
  private storePerformanceMetric(
    name: string,
    duration: number,
    timestamp: Timestamp,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.performanceMetrics.has(name)) {
      this.performanceMetrics.set(name, []);
    }

    const metrics = this.performanceMetrics.get(name)!;
    metrics.push({
      name,
      duration,
      timestamp,
      metadata,
    });

    // Keep only last 1000 metrics per name
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  /**
   * Track an error
   * @param error - Error object or message
   * @param component - Component where error occurred
   * @param userId - User ID
   * @param sessionId - Session ID
   * @param context - Additional context
   */
  trackError(
    error: Error | string,
    component: string,
    userId: AnonymousUserId,
    sessionId: SessionId,
    context?: Record<string, unknown>
  ): void {
    if (!this.config.enabled || !this.config.errors.enabled) {
      return;
    }

    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorCode = typeof error === 'string' ? undefined : (error as any).code;
    const stackTrace = typeof error === 'string' ? undefined : error.stack;

    // Sanitize error message to remove potential PII
    const piiResult = this.privacyManager.detectPII(errorMessage);
    const sanitizedMessage = piiResult.detected ? piiResult.sanitized : errorMessage;

    // Sanitize stack trace
    let sanitizedStack: string | undefined;
    if (stackTrace) {
      const stackResult = this.privacyManager.detectPII(stackTrace);
      sanitizedStack = stackResult.detected
        ? stackResult.sanitized
        : this.truncateStackTrace(stackTrace, this.config.errors.maxStackFrames);
    }

    // Create error event
    const event: ErrorEvent = {
      id: this.generateEventId(),
      type: 'error_runtime',
      category: EventCategory.ERROR,
      timestamp: new Date().toISOString() as Timestamp,
      userId,
      sessionId,
      priority: EventPriority.HIGH,
      privacyLevel: 'personal' as const,
      properties: {
        message: sanitizedMessage,
        code: errorCode,
        stack: sanitizedStack,
        component,
        action: context?.action as string,
      },
    };

    this.queueEvent(event);
    this.updateErrorCount(errorMessage, component, sanitizedStack);
  }

  /**
   * Update error count
   * @param message - Error message
   * @param component - Component name
   * @param stack - Stack trace
   */
  private updateErrorCount(message: string, component: string, stack?: string): void {
    const key = `${component}:${message}`;
    const existing = this.errorCounts.get(key);

    if (existing) {
      existing.count++;
    } else {
      this.errorCounts.set(key, {
        message,
        component,
        timestamp: new Date().toISOString() as Timestamp,
        stack,
        count: 1,
      });
    }
  }

  /**
   * Truncate stack trace to specified number of frames
   * @param stack - Stack trace
   * @param maxFrames - Maximum frames to keep
   * @returns Truncated stack trace
   */
  private truncateStackTrace(stack: string, maxFrames: number): string {
    const lines = stack.split('\n');
    if (lines.length <= maxFrames) {
      return stack;
    }

    return lines.slice(0, maxFrames).join('\n');
  }

  /**
   * Track feature usage
   * @param feature - Feature name
   * @param userId - User ID
   * @param sessionId - Session ID
   * @param properties - Feature properties
   */
  trackFeatureUse(
    feature: string,
    userId: AnonymousUserId,
    sessionId: SessionId,
    properties?: Record<string, unknown>
  ): () => void {
    if (!this.config.enabled || !this.config.features.enabled) {
      return () => {};
    }

    const startTime = this.config.features.trackDuration ? performance.now() : undefined;
    const timestamp = new Date().toISOString() as Timestamp;

    // Sanitize feature properties
    const sanitizedProperties = this.config.features.trackParameters
      ? this.privacyManager.sanitizeObject(properties || {})
      : undefined;

    // Record feature usage
    if (!this.featureUsage.has(userId)) {
      this.featureUsage.set(userId, []);
    }

    const usage: FeatureUsageEntry = {
      feature,
      timestamp,
      success: true,
      properties: sanitizedProperties,
    };

    // Record journey step
    this.recordJourneyStep(sessionId, 'feature_use', feature);

    // Return function to complete tracking
    return () => {
      if (startTime !== undefined) {
        const duration = performance.now() - startTime;
        usage.duration = duration;

        const event: FeatureEvent = {
          id: this.generateEventId(),
          type: 'feature_use',
          category: EventCategory.FEATURE,
          timestamp,
          userId,
          sessionId,
          priority: EventPriority.NORMAL,
          privacyLevel: 'anonymous' as const,
          properties: {
            feature,
            duration: Math.round(duration),
            ...sanitizedProperties,
          },
        };

        this.queueEvent(event);
      }
    };
  }

  /**
   * Record a user journey step
   * @param sessionId - Session ID
   * @param action - Action performed
   * @param feature - Feature used (optional)
   * @param duration - Action duration (optional)
   */
  recordJourneyStep(
    sessionId: SessionId,
    action: string,
    feature?: string,
    duration?: number
  ): void {
    if (!this.config.enabled || !this.config.journey.enabled) {
      return;
    }

    if (!this.userJourneys.has(sessionId)) {
      this.userJourneys.set(sessionId, []);
    }

    const journey = this.userJourneys.get(sessionId)!;

    // Add step
    journey.push({
      action,
      timestamp: new Date().toISOString() as Timestamp,
      feature,
      duration,
    });

    // Trim if exceeds max steps
    if (journey.length > this.config.journey.maxSteps) {
      journey.shift();
    }
  }

  /**
   * Get user journey for a session
   * @param sessionId - Session ID
   * @returns Journey steps
   */
  getUserJourney(sessionId: SessionId): JourneyStep[] {
    return this.userJourneys.get(sessionId) || [];
  }

  /**
   * Get performance statistics for a metric
   * @param metricName - Metric name
   * @returns Performance statistics
   */
  getPerformanceStats(metricName: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = this.performanceMetrics.get(metricName);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const count = durations.length;
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count,
      avg: sum / count,
      min: durations[0],
      max: durations[count - 1],
      p50: durations[Math.floor(count * 0.5)],
      p95: durations[Math.floor(count * 0.95)],
      p99: durations[Math.floor(count * 0.99)],
    };
  }

  /**
   * Get top errors by count
   * @param limit - Maximum number of errors to return
   * @returns Top errors
   */
  getTopErrors(limit = 10): ErrorEntry[] {
    return Array.from(this.errorCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get feature usage statistics
   * @param userId - User ID (optional, for specific user)
   * @returns Feature usage statistics
   */
  getFeatureUsageStats(userId?: AnonymousUserId): Map<string, number> {
    const stats = new Map<string, number>();

    if (userId) {
      const userFeatures = this.featureUsage.get(userId) || [];
      for (const usage of userFeatures) {
        stats.set(usage.feature, (stats.get(usage.feature) || 0) + 1);
      }
    } else {
      for (const features of this.featureUsage.values()) {
        for (const usage of features) {
          stats.set(usage.feature, (stats.get(usage.feature) || 0) + 1);
        }
      }
    }

    return stats;
  }

  /**
   * Get all queued events
   * @returns Queued events
   */
  getQueuedEvents(): BaseEvent[] {
    return [...this.eventQueue];
  }

  /**
   * Clear queued events
   */
  clearQueuedEvents(): void {
    this.eventQueue = [];
  }

  /**
   * Clear all collected data
   */
  clearAllData(): void {
    this.performanceMetrics.clear();
    this.errorCounts.clear();
    this.featureUsage.clear();
    this.userJourneys.clear();
    this.activeOperations.clear();
    this.eventQueue = [];
  }

  /**
   * Generate a unique event ID
   * @returns Event ID
   */
  private generateEventId(): EventId {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Queue an event for processing
   * @param event - Event to queue
   */
  private queueEvent(event: BaseEvent): void {
    this.eventQueue.push(event);
  }

  /**
   * Get collector statistics
   * @returns Collector statistics
   */
  getStats(): {
    performanceMetrics: number;
    errorCounts: number;
    featureUsage: number;
    userJourneys: number;
    queuedEvents: number;
    activeOperations: number;
  } {
    return {
      performanceMetrics: Array.from(this.performanceMetrics.values()).reduce(
        (sum, metrics) => sum + metrics.length,
        0
      ),
      errorCounts: this.errorCounts.size,
      featureUsage: Array.from(this.featureUsage.values()).reduce(
        (sum, features) => sum + features.length,
        0
      ),
      userJourneys: this.userJourneys.size,
      queuedEvents: this.eventQueue.length,
      activeOperations: this.activeOperations.size,
    };
  }
}

/**
 * Default analytics collector configuration
 */
export const DEFAULT_COLLECTOR_CONFIG: AnalyticsCollectorConfig = {
  enabled: true,
  performance: {
    enabled: true,
    slowThreshold: 1000,
    timeoutThreshold: 10000,
    sampleRate: 1.0,
  },
  errors: {
    enabled: true,
    maxStackFrames: 10,
    includeContext: true,
  },
  features: {
    enabled: true,
    trackDuration: true,
    trackParameters: false,
  },
  journey: {
    enabled: true,
    maxSteps: 100,
    sessionTimeout: 30 * 60 * 1000,
  },
};
