/**
 * POLLN Spreadsheet Error Handling
 *
 * Comprehensive error handling system with:
 * - Typed error classes
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - React error boundaries
 * - Structured logging
 */

// Core types
export type {
  ErrorResponse,
  RetryOptions,
  CircuitBreakerConfig,
  CircuitSnapshot,
  ErrorContext,
  SensitivePattern,
  ErrorLoggerConfig,
  ErrorBoundaryProps,
  ErrorComponentProps,
  ErrorMetrics,
  UserMessageMapping,
} from './types.js';

// Enums (exported as values, which also exports the type)
export { ErrorSeverity, ErrorCategory, CircuitState } from './types.js';

// Error codes
export type { ErrorCode } from './ErrorCodes.js';
export {
  getErrorCodeMetadata,
  getAllErrorCodes,
  getErrorCodesByCategory,
  getUserMessage,
  isRetryableCode,
  getStatusCode,
} from './ErrorCodes.js';

// Error classes
export {
  PollnError,
  ValidationError,
  InvalidCellError,
  InvalidFormulaError,
  InvalidValueError,
  InvalidRangeError,
  TypeMismatchError,
  FormulaParseError,
  CircularDependencyError,
  DivisionByZeroError,
  PermissionError,
  AccessDeniedError,
  ResourceNotFoundError,
  ReadOnlyError,
  AuthenticationFailedError,
  InsufficientPermissionsError,
  BusinessLogicError,
  VersionConflictError,
  QuotaExceededError,
  LockedCellError,
  SpreadsheetFullError,
  DependencyFailedError,
  SystemError,
  DatabaseError,
  MemoryError,
  ComputationError,
  InternalError,
  ServiceUnavailableError,
  NetworkError,
  NetworkConnectionError,
  TimeoutError,
  ConnectionLostError,
  RequestTooLargeError,
  ExternalServiceError,
  ExternalApiError,
  ExternalApiTimeoutError,
  ExternalServiceUnavailableError,
  CircuitBreakerOpenError,
} from './PollnError.js';

// Error handler
export {
  ErrorHandler,
  globalErrorHandler,
  handleError,
  isRetryable,
  toUserMessage,
  logError,
  alertError,
} from './ErrorHandler.js';

// Error logger
export {
  ErrorLogger,
  globalErrorLogger,
  logError as logStructuredError,
  redactSensitiveData,
} from './ErrorLogger.js';

// Circuit breaker
export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  getCircuitBreakerRegistry,
  getCircuitBreaker,
} from './CircuitBreaker.js';

// Retry manager
export {
  RetryManager,
  globalRetryManager,
  retry,
  withBackoff,
  withCircuitBreaker,
  withRetryAndCircuitBreaker,
} from './RetryManager.js';

// React components (import from .tsx file)
// Uncomment if using JSX:
// export {
//   ErrorBoundary,
//   withErrorBoundary,
//   useErrorHandler,
//   useAsyncErrorHandler,
//   ErrorDisplay,
//   DefaultErrorComponent,
// } from './ErrorBoundary.tsx';
