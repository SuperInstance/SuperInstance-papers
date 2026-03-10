/**
 * Error Handling Types for POLLN Spreadsheets
 *
 * Provides comprehensive TypeScript types for error handling,
 * including error responses, retry options, and circuit breaker states.
 */

/**
 * Standard error response format for API responses
 */
export interface ErrorResponse {
  /** Error type/category */
  error: string;
  /** Machine-readable error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
  /** Unique identifier for this error instance */
  correlationId: string;
  /** ISO timestamp of when the error occurred */
  timestamp: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Stack trace (development only) */
  stack?: string;
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  /** Low severity - informational */
  LOW = 'low',
  /** Medium severity - warning */
  MEDIUM = 'medium',
  /** High severity - error */
  HIGH = 'high',
  /** Critical severity - system failure */
  CRITICAL = 'critical',
}

/**
 * Error category for grouping and filtering
 */
export enum ErrorCategory {
  /** Validation and input errors */
  VALIDATION = 'validation',
  /** Permission and authorization errors */
  PERMISSION = 'permission',
  /** Business logic errors */
  BUSINESS_LOGIC = 'business_logic',
  /** System and infrastructure errors */
  SYSTEM = 'system',
  /** Network and communication errors */
  NETWORK = 'network',
  /** External service errors */
  EXTERNAL = 'external',
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Backoff multiplier (default: 2 for exponential) */
  backoffMultiplier?: number;
  /** Jitter factor to add randomness (0-1) */
  jitterFactor?: number;
  /** Whether to retry on specific error codes */
  retryableCodes?: string[];
  /** Custom retry condition */
  shouldRetry?: (error: Error) => boolean;
  /** Callback before each retry attempt */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Circuit breaker states
 */
export enum CircuitState {
  /** Circuit is closed - requests flow through */
  CLOSED = 'closed',
  /** Circuit is open - requests are blocked */
  OPEN = 'open',
  /** Circuit is half-open - testing if service recovered */
  HALF_OPEN = 'half_open',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Name of the circuit breaker */
  name: string;
  /** Number of failures before opening */
  failureThreshold?: number;
  /** Time window for counting failures (ms) */
  timeout?: number;
  /** How long to stay open before attempting recovery (ms) */
  resetTimeout?: number;
  /** Number of successful calls to close circuit in half-open */
  successThreshold?: number;
  /** Callback when circuit opens */
  onOpen?: () => void;
  /** Callback when circuit closes */
  onClose?: () => void;
  /** Callback when circuit transitions to half-open */
  onHalfOpen?: () => void;
}

/**
 * Circuit breaker state snapshot
 */
export interface CircuitSnapshot {
  /** Current state */
  state: CircuitState;
  /** Number of failures in current window */
  failureCount: number;
  /** Number of successes in current window */
  successCount: number;
  /** Last failure timestamp */
  lastFailureTime?: number;
  /** Last success timestamp */
  lastSuccessTime?: number;
  /** When the circuit will attempt recovery */
  nextAttemptTime?: number;
}

/**
 * Error logging context
 */
export interface ErrorContext {
  /** Where the error occurred */
  location?: string;
  /** User ID if available */
  userId?: string;
  /** Session ID for tracking */
  sessionId?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Stack trace */
  stack?: string;
}

/**
 * Sensitive data patterns for redaction
 */
export interface SensitivePattern {
  /** Pattern regex */
  pattern: RegExp;
  /** Replacement string */
  replacement: string;
  /** Pattern description */
  description: string;
}

/**
 * Error logging configuration
 */
export interface ErrorLoggerConfig {
  /** Minimum severity to log */
  minSeverity?: ErrorSeverity;
  /** Whether to include stack traces */
  includeStackTrace?: boolean;
  /** Whether to log to console */
  logToConsole?: boolean;
  /** Custom log endpoint */
  logEndpoint?: string;
  /** Sensitive data patterns to redact */
  sensitivePatterns?: SensitivePattern[];
  /** Additional context to include */
  defaultContext?: Partial<ErrorContext>;
}

/**
 * Error boundary component props
 */
export interface ErrorBoundaryProps {
  /** Child components to render */
  children: any;
  /** Fallback UI to render on error */
  fallback?: any | ((error: Error, retry: () => void) => any);
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: any) => void;
  /** Custom error component */
  ErrorComponent?: any;
}

/**
 * Props for error display component
 */
export interface ErrorComponentProps {
  /** The error that occurred */
  error: Error;
  /** Function to retry the operation */
  retry: () => void;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Error metrics for monitoring
 */
export interface ErrorMetrics {
  /** Total errors in time window */
  totalErrors: number;
  /** Errors by category */
  errorsByCategory: Record<ErrorCategory, number>;
  /** Errors by severity */
  errorsBySeverity: Record<ErrorSeverity, number>;
  /** Most common error codes */
  topErrorCodes: Array<{ code: string; count: number }>;
  /** Time window start */
  windowStart: number;
  /** Time window end */
  windowEnd: number;
}

/**
 * User-friendly error message mapping
 */
export interface UserMessageMapping {
  /** Error code */
  code: string;
  /** User-friendly message */
  message: string;
  /** Suggested actions */
  actions?: string[];
  /** Severity for display */
  severity: ErrorSeverity;
}
