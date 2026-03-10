/**
 * POLLN Integration Connectors - Type Definitions
 *
 * Comprehensive type system for external service integrations.
 * Provides base interfaces, configuration types, events, and error handling.
 */

import { CellId, CellReference } from '../core/types.js';

// ============================================================================
// Base Connector Interfaces
// ============================================================================

/**
 * Base interface for all integration connectors
 */
export interface IntegrationConnector {
  /**
   * Unique identifier for this connector instance
   */
  readonly id: string;

  /**
   * Human-readable name of the integration
   */
  readonly name: string;

  /**
   * Integration type (slack, teams, github, database, etc.)
   */
  readonly type: IntegrationType;

  /**
   * Current connection state
   */
  readonly state: ConnectionState;

  /**
   * Initialize the connector with configuration
   */
  initialize(config: IntegrationConfig): Promise<void>;

  /**
   * Connect to the external service
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the external service
   */
  disconnect(): Promise<void>;

  /**
   * Check if connector is currently connected
   */
  isConnected(): boolean;

  /**
   * Send data through the connector
   */
  send(operation: string, data: any): Promise<IntegrationResult>;

  /**
   * Receive data from the connector
   */
  receive?(event: string, data: any): Promise<void>;

  /**
   * Health check for the connection
   */
  healthCheck(): Promise<HealthStatus>;

  /**
   * Get connector metrics
   */
  getMetrics(): IntegrationMetrics;

  /**
   * Clean up resources
   */
  dispose(): Promise<void>;
}

/**
 * Integration type enumeration
 */
export enum IntegrationType {
  SLACK = 'slack',
  TEAMS = 'teams',
  GITHUB = 'github',
  DATABASE = 'database',
  WEBHOOK = 'webhook',
  CUSTOM = 'custom',
}

/**
 * Connection state enumeration
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
  DISABLED = 'disabled',
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Base configuration for all integrations
 */
export interface IntegrationConfig {
  /**
   * Unique identifier for this integration
   */
  id: string;

  /**
   * Integration type
   */
  type: IntegrationType;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Enable/disable the integration
   */
  enabled: boolean;

  /**
   * Connection credentials
   */
  credentials: CredentialConfig;

  /**
   * Rate limiting configuration
   */
  rateLimit?: RateLimitConfig;

  /**
   * Retry configuration
   */
  retry?: RetryConfig;

  /**
   * Webhook configuration
   */
  webhook?: WebhookConfig;

  /**
   * Cell mapping configuration
   */
  cellMapping?: CellMappingConfig;

  /**
   * Custom configuration options
   */
  options?: Record<string, any>;
}

/**
 * Credential configuration
 */
export interface CredentialConfig {
  /**
   * API token/key
   */
  apiToken?: string;

  /**
   * OAuth configuration
   */
  oauth?: OAuthConfig;

  /**
   * Basic authentication
   */
  basic?: BasicAuthConfig;

  /**
   * Custom headers
   */
  headers?: Record<string, string>;

  /**
   * Query parameters
   */
  params?: Record<string, string>;
}

/**
 * OAuth configuration
 */
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * Basic authentication configuration
 */
export interface BasicAuthConfig {
  username: string;
  password: string;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /**
   * Maximum requests per window
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Burst size (for token bucket algorithm)
   */
  burstSize?: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   */
  maxAttempts: number;

  /**
   * Initial retry delay in milliseconds
   */
  initialDelay: number;

  /**
   * Maximum retry delay in milliseconds
   */
  maxDelay: number;

  /**
   * Backoff multiplier
   */
  backoffMultiplier: number;

  /**
   * HTTP status codes to retry
   */
  retryableStatusCodes: number[];
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  /**
   * Webhook URL
   */
  url: string;

  /**
   * Secret for signature verification
   */
  secret?: string;

  /**
   * Events to subscribe to
   */
  events: string[];

  /**
   * Enable/disable webhook
   */
  enabled: boolean;
}

/**
 * Cell mapping configuration
 */
export interface CellMappingConfig {
  /**
   * Map external events to cells
   */
  eventToCell: Record<string, CellId>;

  /**
   * Map cell outputs to external operations
   */
  cellToOperation: Record<CellId, string>;

  /**
   * Transform functions for data
   */
  transforms?: Record<string, (data: any) => any>;
}

// ============================================================================
// Result and Error Types
// ============================================================================

/**
 * Integration operation result
 */
export interface IntegrationResult {
  /**
   * Operation success status
   */
  success: boolean;

  /**
   * Result data
   */
  data?: any;

  /**
   * Error information if failed
   */
  error?: IntegrationError;

  /**
   * Execution metadata
   */
  metadata: ResultMetadata;
}

/**
 * Result metadata
 */
export interface ResultMetadata {
  /**
   * Timestamp of operation
   */
  timestamp: number;

  /**
   * Operation duration in milliseconds
   */
  duration: number;

  /**
   * Number of retries attempted
   */
  retries: number;

  /**
   * Rate limit information
   */
  rateLimit?: RateLimitInfo;

  /**
   * External request ID
   */
  requestId?: string;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  /**
   * Remaining requests in current window
   */
  remaining: number;

  /**
   * Time until reset in milliseconds
   */
  resetTime: number;

  /**
   * Limit for current window
   */
  limit: number;
}

/**
 * Integration error
 */
export interface IntegrationError {
  /**
   * Error code
   */
  code: ErrorCode;

  /**
   * Human-readable message
   */
  message: string;

  /**
   * Detailed error information
   */
  details?: any;

  /**
   * Original error that caused this
   */
  cause?: Error;

  /**
   * Whether error is retryable
   */
  retryable: boolean;

  /**
   * Suggested retry delay in milliseconds
   */
  retryDelay?: number;
}

/**
 * Error code enumeration
 */
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',

  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // Client errors
  BAD_REQUEST = 'BAD_REQUEST',
  INVALID_INPUT = 'INVALID_INPUT',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Integration-specific
  WEBHOOK_FAILED = 'WEBHOOK_FAILED',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  OPERATION_NOT_SUPPORTED = 'OPERATION_NOT_SUPPORTED',

  // Polln-specific
  CELL_NOT_FOUND = 'CELL_NOT_FOUND',
  CELL_MAPPING_FAILED = 'CELL_MAPPING_FAILED',
  TRANSFORM_FAILED = 'TRANSFORM_FAILED',
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Integration event
 */
export interface IntegrationEvent {
  /**
   * Event type
   */
  type: EventType;

  /**
   * Integration that emitted the event
   */
  integrationId: string;

  /**
   * Event payload
   */
  payload: any;

  /**
   * Event timestamp
   */
  timestamp: number;

  /**
   * Event ID (for deduplication)
   */
  id: string;

  /**
   * Correlation ID for tracing
   */
  correlationId?: string;
}

/**
 * Event type enumeration
 */
export enum EventType {
  // Connection events
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',

  // Data events
  DATA_RECEIVED = 'data_received',
  DATA_SENT = 'data_sent',
  DATA_FAILED = 'data_failed',

  // Rate limit events
  RATE_LIMIT_APPROACH = 'rate_limit_approach',
  RATE_LIMIT_REACHED = 'rate_limit_reached',

  // Lifecycle events
  INITIALIZED = 'initialized',
  DISPOSED = 'disposed',
  HEALTH_CHECK = 'health_check',
}

// ============================================================================
// Health and Metrics
// ============================================================================

/**
 * Health status
 */
export interface HealthStatus {
  /**
   * Overall health status
   */
  status: HealthState;

  /**
   * Detailed health information
   */
  details: HealthDetails;

  /**
   * Last check timestamp
   */
  lastCheck: number;
}

/**
 * Health state enumeration
 */
export enum HealthState {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

/**
 * Detailed health information
 */
export interface HealthDetails {
  /**
   * Connection health
   */
  connection: boolean;

  /**
   * Authentication status
   */
  authentication: boolean;

  /**
   * Rate limit status
   */
  rateLimit: boolean;

  /**
   * Any error messages
   */
  errors: string[];

  /**
   * Additional details
   */
  [key: string]: any;
}

/**
 * Integration metrics
 */
export interface IntegrationMetrics {
  /**
   * Total operations performed
   */
  totalOperations: number;

  /**
   * Successful operations
   */
  successfulOperations: number;

  /**
   * Failed operations
   */
  failedOperations: number;

  /**
   * Average operation duration in milliseconds
   */
  averageDuration: number;

  /**
   * Last operation timestamp
   */
  lastOperation?: number;

  /**
   * Data sent in bytes
   */
  bytesSent: number;

  /**
   * Data received in bytes
   */
  bytesReceived: number;

  /**
   * Rate limit hits
   */
  rateLimitHits: number;

  /**
   * Retry attempts
   */
  retryAttempts: number;

  /**
   * Uptime percentage (0-100)
   */
  uptime: number;
}

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Incoming webhook request
 */
export interface WebhookRequest {
  /**
   * Request headers
   */
  headers: Record<string, string>;

  /**
   * Request body
   */
  body: any;

  /**
   * Request signature (if available)
   */
  signature?: string;

  /**
   * Request timestamp
   */
  timestamp: number;

  /**
   * Request ID
   */
  id: string;
}

/**
 * Webhook routing information
 */
export interface WebhookRoute {
  /**
   * Integration ID to route to
   */
  integrationId: string;

  /**
   * Cell ID to notify
   */
  cellId?: CellId;

  /**
   * Transform function to apply
   */
  transform?: (data: any) => any;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Event listener function type
 */
export type EventListener = (event: IntegrationEvent) => void | Promise<void>;

/**
 * Connection callback type
 */
export type ConnectionCallback = (state: ConnectionState) => void;

/**
 * Data callback type
 */
export type DataCallback = (data: any) => void | Promise<void>;

/**
 * Error callback type
 */
export type ErrorCallback = (error: IntegrationError) => void;
