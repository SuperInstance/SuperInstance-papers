/**
 * @file telemetry/Exporter.ts
 * @brief Export telemetry data to analytics platforms with format transformation
 *
 * This file implements data export functionality to various analytics platforms
 * including Mixpanel, Amplitude, PostHog, webhooks, and local file storage.
 * Handles format transformation, batch processing, scheduling, and retry logic.
 *
 * @copyright Copyright (c) 2026 POLLN
 * @license MIT
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import {
  BaseEvent,
  ExportPlatform,
  ExportResult,
  ExportPlatformConfig,
  Timestamp,
  EventCategory,
} from './types.js';
import { PrivacyManager } from './PrivacyManager.js';

/**
 * Export queue entry
 */
interface ExportQueueEntry {
  events: BaseEvent[];
  platform: ExportPlatform;
  attempt: number;
  lastAttempt: Timestamp;
}

/**
 * Platform-specific formatter
 */
type PlatformFormatter = (events: BaseEvent[]) => unknown;

/**
 * Platform sender function
 */
type PlatformSender = (data: unknown, config: ExportPlatformConfig) => Promise<boolean>;

/**
 * Export statistics
 */
interface ExportStats {
  totalExports: number;
  successfulExports: number;
  failedExports: number;
  eventsExported: number;
  lastExportTime: Timestamp | null;
  byPlatform: Record<ExportPlatform, { success: number; failed: number; events: number }>;
}

/**
 * Exporter class
 * Handles export of telemetry events to various platforms
 */
export class Exporter {
  private readonly privacyManager: PrivacyManager;
  private readonly platforms: Map<ExportPlatform, ExportPlatformConfig>;
  private readonly exportQueue: Map<ExportPlatform, ExportQueueEntry[]>;
  private readonly formatters: Map<ExportPlatform, PlatformFormatter>;
  private readonly senders: Map<ExportPlatform, PlatformSender>;
  private readonly exportTimers: Map<ExportPlatform, NodeJS.Timeout>;
  private readonly stats: ExportStats;
  private isShuttingDown = false;

  /**
   * Create a new Exporter
   * @param privacyManager - Privacy manager instance
   * @param platformConfigs - Platform configurations
   */
  constructor(
    privacyManager: PrivacyManager,
    platformConfigs: ExportPlatformConfig[]
  ) {
    this.privacyManager = privacyManager;
    this.platforms = new Map();
    this.exportQueue = new Map();
    this.formatters = new Map();
    this.senders = new Map();
    this.exportTimers = new Map();

    // Initialize platforms
    for (const config of platformConfigs) {
      if (config.enabled) {
        this.platforms.set(config.platform, config);
        this.exportQueue.set(config.platform, []);
      }
    }

    // Initialize formatters
    this.initializeFormatters();

    // Initialize senders
    this.initializeSenders();

    // Initialize stats
    this.stats = {
      totalExports: 0,
      successfulExports: 0,
      failedExports: 0,
      eventsExported: 0,
      lastExportTime: null,
      byPlatform: {
        [ExportPlatform.MIXPANEL]: { success: 0, failed: 0, events: 0 },
        [ExportPlatform.AMPLITUDE]: { success: 0, failed: 0, events: 0 },
        [ExportPlatform.POSTHOG]: { success: 0, failed: 0, events: 0 },
        [ExportPlatform.WEBHOOK]: { success: 0, failed: 0, events: 0 },
        [ExportPlatform.LOCAL_FILE]: { success: 0, failed: 0, events: 0 },
        [ExportPlatform.CLOUD_STORAGE]: { success: 0, failed: 0, events: 0 },
      },
    };

    // Start scheduled exports
    this.startScheduledExports();
  }

  /**
   * Initialize platform formatters
   */
  private initializeFormatters(): void {
    // Mixpanel formatter
    this.formatters.set(ExportPlatform.MIXPANEL, events => {
      return events.map(event => ({
        event: event.type,
        properties: {
          distinct_id: event.userId,
          time: new Date(event.timestamp).getTime() / 1000,
          ...this.transformProperties(event),
        },
      }));
    });

    // Amplitude formatter
    this.formatters.set(ExportPlatform.AMPLITUDE, events => {
      return events.map(event => ({
        event_type: event.type,
        user_id: event.userId,
        time: new Date(event.timestamp).getTime(),
        event_properties: this.transformProperties(event),
        user_properties: {},
        app_version: event.context?.appVersion,
        platform: event.context?.os,
      }));
    });

    // PostHog formatter
    this.formatters.set(ExportPlatform.POSTHOG, events => {
      return events.map(event => ({
        event: event.type,
        distinct_id: event.userId,
        timestamp: event.timestamp,
        properties: {
          ...this.transformProperties(event),
          $context: event.context,
        },
      }));
    });

    // Webhook formatter
    this.formatters.set(ExportPlatform.WEBHOOK, events => {
      return {
        version: '1.0',
        exported_at: new Date().toISOString(),
        events: events.map(event => ({
          id: event.id,
          type: event.type,
          timestamp: event.timestamp,
          user_id: event.userId,
          session_id: event.sessionId,
          properties: event.properties,
          context: event.context,
        })),
      };
    });

    // Local file formatter (JSON lines)
    this.formatters.set(ExportPlatform.LOCAL_FILE, events => {
      return events.map(event => JSON.stringify(event)).join('\n');
    });

    // Cloud storage formatter (JSON array)
    this.formatters.set(ExportPlatform.CLOUD_STORAGE, events => {
      return JSON.stringify({
        version: '1.0',
        exported_at: new Date().toISOString(),
        events,
      }, null, 2);
    });
  }

  /**
   * Initialize platform senders
   */
  private initializeSenders(): void {
    // Note: These are placeholder implementations
    // In production, you would use the actual SDK APIs

    this.senders.set(ExportPlatform.MIXPANEL, async (data, config) => {
      // Placeholder: Use Mixpanel SDK
      console.log('[Mixpanel Export]', data);
      return true;
    });

    this.senders.set(ExportPlatform.AMPLITUDE, async (data, config) => {
      // Placeholder: Use Amplitude SDK
      console.log('[Amplitude Export]', data);
      return true;
    });

    this.senders.set(ExportPlatform.POSTHOG, async (data, config) => {
      // Placeholder: Use PostHog SDK
      console.log('[PostHog Export]', data);
      return true;
    });

    this.senders.set(ExportPlatform.WEBHOOK, async (data, config) => {
      if (!config.endpoint) {
        console.error('[Webhook Export] No endpoint configured');
        return false;
      }

      try {
        const response = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.options?.headers as Record<string, string>),
          },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        return response.ok;
      } catch (error) {
        console.error('[Webhook Export] Error:', error);
        return false;
      }
    });

    this.senders.set(ExportPlatform.LOCAL_FILE, async (data, config) => {
      try {
        const outputDir = config.options?.outputDir as string || './telemetry-exports';
        const filename = `telemetry_${Date.now()}.jsonl`;
        const filepath = join(outputDir, filename);

        // Ensure directory exists
        await fs.mkdir(outputDir, { recursive: true });

        // Write to file
        await fs.writeFile(filepath, data as string, 'utf-8');

        console.log(`[Local File Export] Exported to ${filepath}`);
        return true;
      } catch (error) {
        console.error('[Local File Export] Error:', error);
        return false;
      }
    });

    this.senders.set(ExportPlatform.CLOUD_STORAGE, async (data, config) => {
      // Placeholder: Use AWS SDK, GCS SDK, or Azure SDK
      console.log('[Cloud Storage Export]', data);
      return true;
    });
  }

  /**
   * Transform event properties for export
   * @param event - Event to transform
   * @returns Transformed properties
   */
  private transformProperties(event: BaseEvent): Record<string, unknown> {
    // Remove sensitive properties
    const sanitized = this.privacyManager.sanitizeObject(event.properties || {});

    // Add metadata
    return {
      ...sanitized,
      category: event.category,
      priority: event.priority,
      privacy_level: event.privacyLevel,
      session_id: event.sessionId,
    };
  }

  /**
   * Queue events for export
   * @param events - Events to export
   * @param platforms - Target platforms (all if not specified)
   */
  queueExport(events: BaseEvent[], platforms?: ExportPlatform[]): void {
    const targetPlatforms = platforms || Array.from(this.platforms.keys());

    for (const platform of targetPlatforms) {
      const config = this.platforms.get(platform);
      if (!config) continue;

      const queue = this.exportQueue.get(platform) || [];

      // Add events to queue
      queue.push({
        events,
        platform,
        attempt: 0,
        lastAttempt: new Date().toISOString() as Timestamp,
      });

      this.exportQueue.set(platform, queue);

      // Export immediately if batch size reached
      if (this.getQueueSize(platform) >= config.batchSize) {
        void this.exportToPlatform(platform);
      }
    }
  }

  /**
   * Export events to a specific platform
   * @param platform - Platform to export to
   * @returns Export result
   */
  async exportToPlatform(platform: ExportPlatform): Promise<ExportResult> {
    const config = this.platforms.get(platform);
    if (!config) {
      return {
        platform,
        eventCount: 0,
        success: false,
        error: 'Platform not configured',
        timestamp: new Date().toISOString() as Timestamp,
      };
    }

    const queue = this.exportQueue.get(platform) || [];
    if (queue.length === 0) {
      return {
        platform,
        eventCount: 0,
        success: true,
        timestamp: new Date().toISOString() as Timestamp,
      };
    }

    // Collect all events from queue
    const allEvents = queue.flatMap(entry => entry.events);
    this.exportQueue.set(platform, []);

    // Format events for platform
    const formatter = this.formatters.get(platform);
    if (!formatter) {
      return {
        platform,
        eventCount: 0,
        success: false,
        error: 'No formatter configured',
        timestamp: new Date().toISOString() as Timestamp,
      };
    }

    const formattedData = formatter(allEvents);

    // Attempt export with retry logic
    let success = false;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= config.retry.maxAttempts; attempt++) {
      const sender = this.senders.get(platform);
      if (!sender) {
        lastError = 'No sender configured';
        break;
      }

      try {
        success = await sender(formattedData, config);
        if (success) {
          break;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }

      // Exponential backoff
      if (attempt < config.retry.maxAttempts) {
        const backoff = Math.min(
          config.retry.backoffMs * Math.pow(2, attempt - 1),
          config.retry.maxBackoffMs
        );
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }

    // Update stats
    this.updateStats(platform, success, allEvents.length);

    return {
      platform,
      eventCount: allEvents.length,
      success,
      error: lastError,
      timestamp: new Date().toISOString() as Timestamp,
    };
  }

  /**
   * Export to all configured platforms
   * @returns Export results
   */
  async exportToAll(): Promise<ExportResult[]> {
    const platforms = Array.from(this.platforms.keys());
    const results = await Promise.all(
      platforms.map(platform => this.exportToPlatform(platform))
    );

    return results;
  }

  /**
   * Start scheduled exports
   */
  private startScheduledExports(): void {
    for (const [platform, config] of this.platforms.entries()) {
      const timer = setInterval(() => {
        if (!this.isShuttingDown) {
          void this.exportToPlatform(platform);
        }
      }, config.interval);

      this.exportTimers.set(platform, timer);
    }
  }

  /**
   * Stop scheduled exports
   */
  stopScheduledExports(): void {
    for (const timer of this.exportTimers.values()) {
      clearInterval(timer);
    }
    this.exportTimers.clear();
  }

  /**
   * Get queue size for a platform
   * @param platform - Platform to check
   * @returns Queue size
   */
  getQueueSize(platform: ExportPlatform): number {
    return this.exportQueue.get(platform)?.reduce((sum, entry) => sum + entry.events.length, 0) || 0;
  }

  /**
   * Get all queue sizes
   * @returns Queue sizes by platform
   */
  getAllQueueSizes(): Record<ExportPlatform, number> {
    const sizes: Record<string, number> = {};
    for (const platform of this.platforms.keys()) {
      sizes[platform] = this.getQueueSize(platform);
    }
    return sizes as Record<ExportPlatform, number>;
  }

  /**
   * Update export statistics
   * @param platform - Platform
   * @param success - Whether export succeeded
   * @param eventCount - Number of events exported
   */
  private updateStats(platform: ExportPlatform, success: boolean, eventCount: number): void {
    this.stats.totalExports++;
    this.stats.eventsExported += eventCount;

    if (success) {
      this.stats.successfulExports++;
      this.stats.byPlatform[platform].success++;
      this.stats.byPlatform[platform].events += eventCount;
    } else {
      this.stats.failedExports++;
      this.stats.byPlatform[platform].failed++;
    }

    this.stats.lastExportTime = new Date().toISOString() as Timestamp;
  }

  /**
   * Get export statistics
   * @returns Export statistics
   */
  getStats(): ExportStats {
    return { ...this.stats };
  }

  /**
   * Flush all pending exports
   * @returns Export results
   */
  async flush(): Promise<ExportResult[]> {
    return this.exportToAll();
  }

  /**
   * Shutdown exporter gracefully
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.stopScheduledExports();

    // Flush remaining exports
    await this.flush();

    // Wait a bit for in-flight exports to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  /**
   * Add or update a platform configuration
   * @param config - Platform configuration
   */
  updatePlatformConfig(config: ExportPlatformConfig): void {
    this.platforms.set(config.platform, config);

    if (config.enabled && !this.exportQueue.has(config.platform)) {
      this.exportQueue.set(config.platform, []);

      // Start scheduled export for new platform
      const timer = setInterval(() => {
        if (!this.isShuttingDown) {
          void this.exportToPlatform(config.platform);
        }
      }, config.interval);

      this.exportTimers.set(config.platform, timer);
    } else if (!config.enabled) {
      // Stop scheduled export and remove platform
      const timer = this.exportTimers.get(config.platform);
      if (timer) {
        clearInterval(timer);
        this.exportTimers.delete(config.platform);
      }
      this.platforms.delete(config.platform);
      this.exportQueue.delete(config.platform);
    }
  }

  /**
   * Get configured platforms
   * @returns Array of configured platforms
   */
  getConfiguredPlatforms(): ExportPlatform[] {
    return Array.from(this.platforms.keys());
  }
}

/**
 * Default export platform configurations
 */
export function getDefaultExportPlatforms(): ExportPlatformConfig[] {
  return [
    {
      platform: ExportPlatform.LOCAL_FILE,
      enabled: true,
      interval: 60000, // 1 minute
      batchSize: 100,
      retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        maxBackoffMs: 10000,
      },
      options: {
        outputDir: './telemetry-exports',
      },
    },
  ];
}
