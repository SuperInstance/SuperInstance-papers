/**
 * @file telemetry/types.ts
 * @brief Core type definitions for the POLLN telemetry and analytics system
 *
 * This file defines all TypeScript types, interfaces, and enums used throughout
 * the telemetry system. It provides type safety for event collection, privacy
 * management, and data export functionality.
 *
 * @copyright Copyright (c) 2026 POLLN
 * @license MIT
 */

/**
 * Unique identifier for anonymized users
 * Generated using cryptographic hashing to prevent re-identification
 */
export type AnonymousUserId = string;

/**
 * Session identifier for tracking user sessions
 * Automatically expires after inactivity period
 */
export type SessionId = string;

/**
 * Unique identifier for individual events
 */
export type EventId = string;

/**
 * Timestamp in ISO 8601 format
 */
export type Timestamp = string;

/**
 * Event priority levels determining processing and retention
 */
export enum EventPriority {
  /** Critical events requiring immediate attention */
  CRITICAL = 'critical',

  /** Important events for analysis */
  HIGH = 'high',

  /** Standard events */
  NORMAL = 'normal',

  /** Low-priority events sampled during high load */
  LOW = 'low',

  /** Debug events only collected in development */
  DEBUG = 'debug',
}

/**
 * Event categories for grouping and filtering
 */
export enum EventCategory {
  /** User interactions with the UI */
  UI = 'ui',

  /** Cell operations and transformations */
  CELL = 'cell',

  /** System performance metrics */
  PERFORMANCE = 'performance',

  /** Errors and exceptions */
  ERROR = 'error',

  /** Feature usage tracking */
  FEATURE = 'feature',

  /** User lifecycle events */
  LIFECYCLE = 'lifecycle',

  /** Collaboration events */
  COLLABORATION = 'collaboration',

  /** Security events */
  SECURITY = 'security',

  /** Custom application events */
  CUSTOM = 'custom',
}

/**
 * Privacy levels determining data handling
 */
export enum PrivacyLevel {
  /** Contains PII - maximum protection required */
  SENSITIVE = 'sensitive',

  /** Potentially identifying information */
  PERSONAL = 'personal',

  /** Anonymous but linkable data */
  ANONYMOUS = 'anonymous',

  /** Fully aggregated data */
  AGGREGATED = 'aggregated',
}

/**
 * Consent status for data collection
 */
export enum ConsentStatus {
  /** User explicitly opted in */
  OPTED_IN = 'opted_in',

  /** User explicitly opted out */
  OPTED_OUT = 'opted_out',

  /** User hasn't provided consent */
  PENDING = 'pending',

  /** Consent not required for this data */
  NOT_REQUIRED = 'not_required',
}

/**
 * Data retention policies
 */
export enum RetentionPolicy {
  /** Retain for 24 hours */
  DAY_1 = '1d',

  /** Retain for 7 days */
  DAY_7 = '7d',

  /** Retain for 30 days */
  DAY_30 = '30d',

  /** Retain for 90 days */
  DAY_90 = '90d',

  /** Retain for 1 year */
  YEAR_1 = '1y',

  /** Retain indefinitely */
  INDEFINITE = 'indefinite',
}

/**
 * Export destination platforms
 */
export enum ExportPlatform {
  /** Mixpanel analytics platform */
  MIXPANEL = 'mixpanel',

  /** Amplitude analytics platform */
  AMPLITUDE = 'amplitude',

  /** PostHog analytics platform */
  POSTHOG = 'posthog',

  /** Custom webhook endpoint */
  WEBHOOK = 'webhook',

  /** Local file storage */
  LOCAL_FILE = 'local_file',

  /** Cloud storage (S3, GCS, etc.) */
  CLOUD_STORAGE = 'cloud_storage',
}

/**
 * Sampling strategies for high-volume events
 */
export enum SamplingStrategy {
  /** No sampling - collect all events */
  NONE = 'none',

  /** Random sampling based on percentage */
  RANDOM = 'random',

  /** Sample based on user ID hash (consistent per user) */
  CONSISTENT_HASH = 'consistent_hash',

  /** Sample based on session ID hash */
  SESSION_HASH = 'session_hash',

  /** Adaptive sampling based on system load */
  ADAPTIVE = 'adaptive',
}

/**
 * Base telemetry event interface
 * All events must extend this interface
 */
export interface BaseEvent {
  /** Unique event identifier */
  id: EventId;

  /** Event type name */
  type: string;

  /** Event category */
  category: EventCategory;

  /** Event timestamp (ISO 8601) */
  timestamp: Timestamp;

  /** Anonymous user identifier */
  userId: AnonymousUserId;

  /** Session identifier */
  sessionId: SessionId;

  /** Event priority */
  priority: EventPriority;

  /** Privacy level */
  privacyLevel: PrivacyLevel;

  /** Additional event properties */
  properties?: Record<string, unknown>;

  /** Event context (device, app version, etc.) */
  context?: EventContext;
}

/**
 * Event context information
 */
export interface EventContext {
  /** Application version */
  appVersion?: string;

  /** Operating system */
  os?: string;

  /** Browser name and version */
  browser?: string;

  /** Device type */
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';

  /** Screen resolution */
  screenResolution?: string;

  /** Locale/language */
  locale?: string;

  /** Timezone */
  timezone?: string;

  /** Custom context fields */
  custom?: Record<string, unknown>;
}

/**
 * UI interaction event
 */
export interface UIEvent extends BaseEvent {
  type: 'ui_click' | 'ui_hover' | 'ui_scroll' | 'ui_focus' | 'ui_blur';
  category: EventCategory.UI;
  properties: {
    /** Element identifier or class */
    element?: string;

    /** Element text content (sanitized) */
    text?: string;

    /** Parent container */
    container?: string;

    /** Click coordinates */
    coordinates?: { x: number; y: number };

    /** Navigation target */
    target?: string;
  };
}

/**
 * Cell operation event
 */
export interface CellEvent extends BaseEvent {
  type: 'cell_create' | 'cell_update' | 'cell_delete' | 'cell_transform';
  category: EventCategory.CELL;
  properties: {
    /** Cell type */
    cellType: string;

    /** Cell location (row, column) */
    location?: { row: number; column: string | number };

    /** Transformation applied */
    transformation?: string;

    /** Data size (bytes) */
    dataSize?: number;
  };
}

/**
 * Performance metrics event
 */
export interface PerformanceEvent extends BaseEvent {
  type: 'perf_metric' | 'perf_slow' | 'perf_timeout';
  category: EventCategory.PERFORMANCE;
  properties: {
    /** Metric name */
    metric: string;

    /** Duration in milliseconds */
    duration: number;

    /** Performance threshold */
    threshold?: number;

    /** Operation name */
    operation?: string;
  };
}

/**
 * Error event
 */
export interface ErrorEvent extends BaseEvent {
  type: 'error_runtime' | 'error_network' | 'error_validation';
  category: EventCategory.ERROR;
  properties: {
    /** Error message (sanitized) */
    message: string;

    /** Error code */
    code?: string;

    /** Stack trace (sanitized) */
    stack?: string;

    /** Component where error occurred */
    component?: string;

    /** User action that triggered error */
    action?: string;
  };
}

/**
 * Feature usage event
 */
export interface FeatureEvent extends BaseEvent {
  type: 'feature_use' | 'feature_discover' | 'feature_abandon';
  category: EventCategory.FEATURE;
  properties: {
    /** Feature name */
    feature: string;

    /** Feature version */
    version?: string;

    /** Usage duration */
    duration?: number;

    /** Feature parameters (sanitized) */
    parameters?: Record<string, unknown>;
  };
}

/**
 * User lifecycle event
 */
export interface LifecycleEvent extends BaseEvent {
  type: 'session_start' | 'session_end' | 'user_identify' | 'user_alias';
  category: EventCategory.LIFECYCLE;
  properties: {
    /** Session duration (ms) */
    duration?: number;

    /** Previous session ID */
    previousSessionId?: SessionId;

    /** User properties (sanitized) */
    userProperties?: Record<string, unknown>;
  };
}

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  /** Enable/disable telemetry */
  enabled: boolean;

  /** Sampling rate (0-1) */
  samplingRate: number;

  /** Sampling strategy */
  samplingStrategy: SamplingStrategy;

  /** Batch size for event transmission */
  batchSize: number;

  /** Batch flush interval (ms) */
  flushInterval: number;

  /** Maximum queue size */
  maxQueueSize: number;

  /** Data retention policy */
  retentionPolicy: RetentionPolicy;

  /** Default consent status */
  defaultConsent: ConsentStatus;

  /** Export platforms configuration */
  exportPlatforms: ExportPlatformConfig[];

  /** Privacy configuration */
  privacy: PrivacyConfig;
}

/**
 * Export platform configuration
 */
export interface ExportPlatformConfig {
  /** Platform identifier */
  platform: ExportPlatform;

  /** Enable/disable this platform */
  enabled: boolean;

  /** API key or credentials */
  apiKey?: string;

  /** API endpoint URL */
  endpoint?: string;

  /** Export interval (ms) */
  interval: number;

  /** Batch size for export */
  batchSize: number;

  /** Retry configuration */
  retry: {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
  };

  /** Platform-specific options */
  options?: Record<string, unknown>;
}

/**
 * Privacy configuration
 */
export interface PrivacyConfig {
  /** Enable PII detection and redaction */
  piiDetection: boolean;

  /** Enable data anonymization */
  anonymization: boolean;

  /** IP address anonymization */
  anonymizeIP: boolean;

  /** Require user consent */
  requireConsent: boolean;

  /** Consent expiration (days, 0 = never) */
  consentExpiration: number;

  /** Data retention enforcement */
  enforceRetention: boolean;

  /** Allowed PII patterns (regex) */
  allowedPIIPatterns: string[];

  /** Blocked PII patterns (regex) */
  blockedPIIPatterns: string[];
}

/**
 * Session information
 */
export interface Session {
  /** Session identifier */
  id: SessionId;

  /** Anonymous user identifier */
  userId: AnonymousUserId;

  /** Session start timestamp */
  startTime: Timestamp;

  /** Session end timestamp (null if active) */
  endTime: Timestamp | null;

  /** Number of events in session */
  eventCount: number;

  /** Session metadata */
  metadata: Record<string, unknown>;
}

/**
 * Aggregated statistics
 */
export interface AggregatedStats {
  /** Time window start */
  windowStart: Timestamp;

  /** Time window end */
  windowEnd: Timestamp;

  /** Total events in window */
  totalEvents: number;

  /** Events by category */
  eventsByCategory: Record<EventCategory, number>;

  /** Events by type */
  eventsByType: Record<string, number>;

  /** Unique users */
  uniqueUsers: number;

  /** Average events per user */
  avgEventsPerUser: number;

  /** Error rate */
  errorRate: number;

  /** Performance metrics */
  performance: {
    avgDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
  };
}

/**
 * Export result
 */
export interface ExportResult {
  /** Platform identifier */
  platform: ExportPlatform;

  /** Number of events exported */
  eventCount: number;

  /** Export status */
  success: boolean;

  /** Error message (if failed) */
  error?: string;

  /** Export timestamp */
  timestamp: Timestamp;
}

/**
 * Consent record
 */
export interface ConsentRecord {
  /** Anonymous user identifier */
  userId: AnonymousUserId;

  /** Current consent status */
  status: ConsentStatus;

  /** Consent timestamp */
  timestamp: Timestamp;

  /** Consent expiration (null = never) */
  expiration: Timestamp | null;

  /** Consent version */
  version: string;

  /** Specific consent categories */
  categories: {
    analytics: boolean;
    marketing: boolean;
    performance: boolean;
    security: boolean;
  };
}

/**
 * PII detection result
 */
export interface PIIDetectionResult {
  /** PII detected */
  detected: boolean;

  /** Detected PII types */
  types: PIIType[];

  /** Sanitized data */
  sanitized: string;

  /** Original data */
  original: string;

  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * PII types for detection
 */
export enum PIIType {
  /** Email address */
  EMAIL = 'email',

  /** Phone number */
  PHONE = 'phone',

  /** Credit card number */
  CREDIT_CARD = 'credit_card',

  /** Social security number */
  SSN = 'ssn',

  /** IP address */
  IP_ADDRESS = 'ip_address',

  /** Physical address */
  ADDRESS = 'address',

  /** Date of birth */
  DOB = 'dob',

  /** Full name */
  NAME = 'name',

  /** Geographic coordinates */
  GEOCOORDINATES = 'geocoordinates',
}

/**
 * Telemetry manager options
 */
export interface TelemetryManagerOptions {
  /** Custom configuration */
  config?: Partial<TelemetryConfig>;

  /** Custom user ID */
  userId?: AnonymousUserId;

  /** Custom session ID */
  sessionId?: SessionId;
}
