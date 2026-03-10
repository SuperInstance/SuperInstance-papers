/**
 * @file telemetry/index.ts
 * @brief Main export module for the POLLN telemetry system
 *
 * This file re-exports all telemetry functionality and provides factory functions
 * for easy instantiation of the telemetry system.
 *
 * @copyright Copyright (c) 2026 POLLN
 * @license MIT
 */

// Type exports
export type {
  AnonymousUserId,
  SessionId,
  EventId,
  Timestamp,
  EventPriority,
  EventCategory,
  PrivacyLevel,
  ConsentStatus,
  RetentionPolicy,
  ExportPlatform,
  SamplingStrategy,
  BaseEvent,
  UIEvent,
  CellEvent,
  PerformanceEvent,
  ErrorEvent,
  FeatureEvent,
  LifecycleEvent,
  EventContext,
  TelemetryConfig,
  ExportPlatformConfig,
  PrivacyConfig,
  Session,
  AggregatedStats,
  ExportResult,
  ConsentRecord,
  PIIDetectionResult,
  PIIType,
  TelemetryManagerOptions,
} from './types.js';

// Class exports
export { TelemetryManager, DEFAULT_TELEMETRY_CONFIG } from './TelemetryManager.js';
export { PrivacyManager, DEFAULT_PRIVACY_CONFIG } from './PrivacyManager.js';
export { AnalyticsCollector, DEFAULT_COLLECTOR_CONFIG } from './AnalyticsCollector.js';
export { Aggregator, DEFAULT_ROLLUP_CONFIG } from './Aggregator.js';
export { Exporter, getDefaultExportPlatforms } from './Exporter.js';

// Event types and validation
export {
  // Schemas
  CLICK_EVENT_SCHEMA,
  HOVER_EVENT_SCHEMA,
  SCROLL_EVENT_SCHEMA,
  CELL_CREATE_SCHEMA,
  CELL_UPDATE_SCHEMA,
  CELL_TRANSFORM_SCHEMA,
  PERF_METRIC_SCHEMA,
  PERF_SLOW_SCHEMA,
  ERROR_RUNTIME_SCHEMA,
  ERROR_NETWORK_SCHEMA,
  ERROR_VALIDATION_SCHEMA,
  FEATURE_USE_SCHEMA,
  FEATURE_DISCOVER_SCHEMA,
  SESSION_START_SCHEMA,
  SESSION_END_SCHEMA,
  EVENT_REGISTRY,

  // Functions
  getEventSchema,
  validateEvent,
  registerEventSchema,
  unregisterEventSchema,
  getRegisteredEventTypes,
  detectPII,

  // Types
  EventSchema,
  ValidationResult,
  ValidationError,
  EventRegistry,
  PropertyType,
  Validator,
} from './EventTypes.js';

// Factory functions
/**
 * Create a new telemetry manager with default configuration
 * @param config - Optional configuration overrides
 * @returns New TelemetryManager instance
 *
 * @example
 * ```typescript
 * const telemetry = createTelemetryManager({
 *   enabled: true,
 *   samplingRate: 0.1, // Sample 10% of events
 * });
 *
 * // Track an event
 * telemetry.trackEvent('feature_use', EventCategory.FEATURE, {
 *   feature: 'cell_transformations',
 * });
 * ```
 */
export function createTelemetryManager(config?: Partial<TelemetryConfig>) {
  const { TelemetryManager } = require('./TelemetryManager.js');
  return new TelemetryManager(config);
}

/**
 * Create a telemetry manager with minimal configuration for development
 * @returns New TelemetryManager instance configured for development
 *
 * @example
 * ```typescript
 * const telemetry = createDevTelemetryManager();
 * // Events are exported to local files only
 * // No sampling
 * // No consent required
 * ```
 */
export function createDevTelemetryManager() {
  return createTelemetryManager({
    enabled: true,
    samplingRate: 1.0,
    samplingStrategy: 'none',
    batchSize: 10,
    flushInterval: 5000,
    defaultConsent: ConsentStatus.NOT_REQUIRED,
    exportPlatforms: [
      {
        platform: ExportPlatform.LOCAL_FILE,
        enabled: true,
        interval: 5000,
        batchSize: 10,
        retry: {
          maxAttempts: 1,
          backoffMs: 1000,
          maxBackoffMs: 5000,
        },
        options: {
          outputDir: './telemetry-exports',
        },
      },
    ],
    privacy: {
      piiDetection: false,
      anonymization: false,
      anonymizeIP: false,
      requireConsent: false,
      consentExpiration: 0,
      enforceRetention: false,
      allowedPIIPatterns: [],
      blockedPIIPatterns: [],
    },
  });
}

/**
 * Create a telemetry manager configured for production use
 * @param config - Required production configuration (API keys, endpoints)
 * @returns New TelemetryManager instance configured for production
 *
 * @example
 * ```typescript
 * const telemetry = createProductionTelemetryManager({
 *   mixpanelApiKey: process.env.MIXPANEL_API_KEY,
 *   amplitudeApiKey: process.env.AMPLITUDE_API_KEY,
 * });
 * ```
 */
export function createProductionTelemetryManager(config: {
  mixpanelApiKey?: string;
  amplitudeApiKey?: string;
  posthogApiKey?: string;
  webhookEndpoint?: string;
}) {
  const platforms = [];

  if (config.mixpanelApiKey) {
    platforms.push({
      platform: ExportPlatform.MIXPANEL,
      enabled: true,
      apiKey: config.mixpanelApiKey,
      interval: 60000,
      batchSize: 100,
      retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        maxBackoffMs: 30000,
      },
    });
  }

  if (config.amplitudeApiKey) {
    platforms.push({
      platform: ExportPlatform.AMPLITUDE,
      enabled: true,
      apiKey: config.amplitudeApiKey,
      interval: 60000,
      batchSize: 100,
      retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        maxMaxBackoffMs: 30000,
      },
    });
  }

  if (config.posthogApiKey) {
    platforms.push({
      platform: ExportPlatform.POSTHOG,
      enabled: true,
      apiKey: config.posthogApiKey,
      interval: 60000,
      batchSize: 100,
      retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        maxBackoffMs: 30000,
      },
    });
  }

  if (config.webhookEndpoint) {
    platforms.push({
      platform: ExportPlatform.WEBHOOK,
      enabled: true,
      endpoint: config.webhookEndpoint,
      interval: 60000,
      batchSize: 100,
      retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        maxBackoffMs: 30000,
      },
    });
  }

  return createTelemetryManager({
    enabled: true,
    samplingRate: 1.0,
    samplingStrategy: 'adaptive',
    batchSize: 100,
    flushInterval: 60000,
    defaultConsent: ConsentStatus.PENDING,
    exportPlatforms: platforms.length > 0 ? platforms : getDefaultExportPlatforms(),
    privacy: {
      piiDetection: true,
      anonymization: true,
      anonymizeIP: true,
      requireConsent: true,
      consentExpiration: 365,
      enforceRetention: true,
      allowedPIIPatterns: [],
      blockedPIIPatterns: [],
    },
  });
}

/**
 * Create a privacy manager for standalone use
 * @param config - Privacy configuration
 * @returns New PrivacyManager instance
 */
export function createPrivacyManager(config?: Partial<PrivacyConfig>) {
  const { PrivacyManager, DEFAULT_PRIVACY_CONFIG } = require('./PrivacyManager.js');
  return new PrivacyManager({ ...DEFAULT_PRIVACY_CONFIG, ...config });
}

/**
 * Create an analytics collector for standalone use
 * @param privacyManager - Privacy manager instance
 * @param config - Collector configuration
 * @returns New AnalyticsCollector instance
 */
export function createAnalyticsCollector(
  privacyManager: InstanceType<typeof PrivacyManager>,
  config?: Partial<ReturnType<typeof require('./AnalyticsCollector.js')['DEFAULT_COLLECTOR_CONFIG']>>
) {
  const { AnalyticsCollector, DEFAULT_COLLECTOR_CONFIG } = require('./AnalyticsCollector.js');
  return new AnalyticsCollector(
    privacyManager,
    { ...DEFAULT_COLLECTOR_CONFIG, ...config }
  );
}

/**
 * Create an aggregator for standalone use
 * @param config - Rollup configuration
 * @returns New Aggregator instance
 */
export function createAggregator(config?: Partial<ReturnType<typeof require('./Aggregator.js')['DEFAULT_ROLLUP_CONFIG']>>) {
  const { Aggregator, DEFAULT_ROLLUP_CONFIG } = require('./Aggregator.js');
  return new Aggregator({ ...DEFAULT_ROLLUP_CONFIG, ...config });
}

/**
 * Create an exporter for standalone use
 * @param privacyManager - Privacy manager instance
 * @param platformConfigs - Platform configurations
 * @returns New Exporter instance
 */
export function createExporter(
  privacyManager: InstanceType<typeof PrivacyManager>,
  platformConfigs: Parameters<typeof Exporter>[1]
) {
  const { Exporter } = require('./Exporter.js');
  return new Exporter(privacyManager, platformConfigs);
}

// Import required types for factory functions
import type { TelemetryConfig, PrivacyConfig } from './types.js';
import type { PrivacyManager } from './PrivacyManager.js';
import type { Exporter } from './Exporter.js';
