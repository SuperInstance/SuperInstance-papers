/**
 * POLLN Error Classes
 *
 * Hierarchical error class system for structured error handling.
 * Provides typed errors with rich metadata for debugging and user messaging.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ErrorContext,
  ErrorResponse,
} from './types.js';
import type { ErrorCode } from './ErrorCodes.js';

/**
 * Base POLLN error class with rich metadata
 */
export class PollnError extends Error {
  /**
   * Unique identifier for this error instance
   */
  public readonly correlationId: string;

  /**
   * Machine-readable error code
   */
  public readonly code: ErrorCode;

  /**
   * HTTP status code
   */
  public readonly statusCode: number;

  /**
   * Additional error details
   */
  public readonly details?: Record<string, unknown>;

  /**
   * Timestamp when the error occurred
   */
  public readonly timestamp: Date;

  /**
   * Error context for debugging
   */
  public readonly context?: ErrorContext;

  /**
   * Original error that caused this error
   */
  public readonly cause?: Error;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    details?: Record<string, unknown>,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.context = context;
    this.cause = cause;
    this.correlationId = uuidv4();
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to standard error response format
   */
  toResponse(): ErrorResponse {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      correlationId: this.correlationId,
      timestamp: this.timestamp.toISOString(),
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }

  /**
   * Convert to JSON for serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      correlationId: this.correlationId,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      cause: this.cause?.message,
    };
  }

  /**
   * Create a PollnError from a generic Error
   */
  static fromError(
    error: Error,
    defaultCode: ErrorCode = 'INTERNAL_ERROR',
    context?: ErrorContext
  ): PollnError {
    if (error instanceof PollnError) {
      return error;
    }

    return new PollnError(
      error.message,
      defaultCode,
      500,
      undefined,
      context,
      error
    );
  }
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

/**
 * Base class for validation errors
 */
export class ValidationError extends PollnError {
  constructor(
    message: string,
    code: ErrorCode,
    details?: Record<string, unknown>,
    context?: ErrorContext
  ) {
    super(message, code, 400, details, context);
  }
}

/**
 * Invalid cell reference error
 */
export class InvalidCellError extends ValidationError {
  constructor(cellRef: string, context?: ErrorContext) {
    super(
      `Invalid cell reference: ${cellRef}`,
      'INVALID_CELL',
      { cellRef },
      context
    );
  }
}

/**
 * Invalid formula error
 */
export class InvalidFormulaError extends ValidationError {
  constructor(
    formula: string,
    reason: string,
    context?: ErrorContext
  ) {
    super(
      `Invalid formula: ${reason}`,
      'INVALID_FORMULA',
      { formula, reason },
      context
    );
  }
}

/**
 * Invalid value error
 */
export class InvalidValueError extends ValidationError {
  constructor(
    value: unknown,
    expectedType: string,
    context?: ErrorContext
  ) {
    super(
      `Invalid value: expected ${expectedType}`,
      'INVALID_VALUE',
      { value, expectedType },
      context
    );
  }
}

/**
 * Invalid range error
 */
export class InvalidRangeError extends ValidationError {
  constructor(range: string, context?: ErrorContext) {
    super(
      `Invalid range: ${range}`,
      'INVALID_RANGE',
      { range },
      context
    );
  }
}

/**
 * Type mismatch error
 */
export class TypeMismatchError extends ValidationError {
  constructor(
    value: unknown,
    expectedType: string,
    actualType: string,
    context?: ErrorContext
  ) {
    super(
      `Type mismatch: expected ${expectedType}, got ${actualType}`,
      'TYPE_MISMATCH',
      { value, expectedType, actualType },
      context
    );
  }
}

/**
 * Formula parse error
 */
export class FormulaParseError extends ValidationError {
  constructor(
    formula: string,
    parseError: string,
    context?: ErrorContext
  ) {
    super(
      `Failed to parse formula: ${parseError}`,
      'FORMULA_PARSE_ERROR',
      { formula, parseError },
      context
    );
  }
}

/**
 * Circular dependency error
 */
export class CircularDependencyError extends ValidationError {
  constructor(
    path: string[],
    context?: ErrorContext
  ) {
    super(
      `Circular dependency detected: ${path.join(' → ')}`,
      'CIRCULAR_DEPENDENCY',
      { path },
      context
    );
  }
}

/**
 * Division by zero error
 */
export class DivisionByZeroError extends ValidationError {
  constructor(context?: ErrorContext) {
    super(
      'Division by zero',
      'DIVISION_BY_ZERO',
      undefined,
      context
    );
  }
}

// ============================================================================
// PERMISSION ERRORS
// ============================================================================

/**
 * Base class for permission errors
 */
export class PermissionError extends PollnError {
  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 403,
    details?: Record<string, unknown>,
    context?: ErrorContext
  ) {
    super(message, code, statusCode, details, context);
  }
}

/**
 * Access denied error
 */
export class AccessDeniedError extends PermissionError {
  constructor(
    resource: string,
    userId?: string,
    context?: ErrorContext
  ) {
    super(
      `Access denied to resource: ${resource}`,
      'ACCESS_DENIED',
      403,
      { resource, userId },
      context
    );
  }
}

/**
 * Resource not found error
 */
export class ResourceNotFoundError extends PermissionError {
  constructor(
    resourceType: string,
    resourceId: string,
    context?: ErrorContext
  ) {
    super(
      `${resourceType} not found: ${resourceId}`,
      'RESOURCE_NOT_FOUND',
      404,
      { resourceType, resourceId },
      context
    );
  }
}

/**
 * Read-only error
 */
export class ReadOnlyError extends PermissionError {
  constructor(
    resource: string,
    context?: ErrorContext
  ) {
    super(
      `Resource is read-only: ${resource}`,
      'READ_ONLY',
      403,
      { resource },
      context
    );
  }
}

/**
 * Authentication failed error
 */
export class AuthenticationFailedError extends PermissionError {
  constructor(context?: ErrorContext) {
    super(
      'Authentication failed',
      'AUTHENTICATION_FAILED',
      401,
      undefined,
      context
    );
  }
}

/**
 * Insufficient permissions error
 */
export class InsufficientPermissionsError extends PermissionError {
  constructor(
    requiredPermission: string,
    context?: ErrorContext
  ) {
    super(
      `Insufficient permissions: ${requiredPermission} required`,
      'INSUFFICIENT_PERMISSIONS',
      403,
      { requiredPermission },
      context
    );
  }
}

// ============================================================================
// BUSINESS LOGIC ERRORS
// ============================================================================

/**
 * Base class for business logic errors
 */
export class BusinessLogicError extends PollnError {
  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    details?: Record<string, unknown>,
    context?: ErrorContext
  ) {
    super(message, code, statusCode, details, context);
  }
}

/**
 * Version conflict error
 */
export class VersionConflictError extends BusinessLogicError {
  constructor(
    resource: string,
    expectedVersion: number,
    actualVersion: number,
    context?: ErrorContext
  ) {
    super(
      `Version conflict for ${resource}: expected ${expectedVersion}, got ${actualVersion}`,
      'VERSION_CONFLICT',
      409,
      { resource, expectedVersion, actualVersion },
      context
    );
  }
}

/**
 * Quota exceeded error
 */
export class QuotaExceededError extends BusinessLogicError {
  constructor(
    quotaType: string,
    current: number,
    limit: number,
    context?: ErrorContext
  ) {
    super(
      `Quota exceeded: ${quotaType} (${current}/${limit})`,
      'QUOTA_EXCEEDED',
      429,
      { quotaType, current, limit },
      context
    );
  }
}

/**
 * Locked cell error
 */
export class LockedCellError extends BusinessLogicError {
  constructor(
    cellRef: string,
    lockedBy?: string,
    context?: ErrorContext
  ) {
    super(
      `Cell is locked: ${cellRef}${lockedBy ? ` by ${lockedBy}` : ''}`,
      'LOCKED_CELL',
      423,
      { cellRef, lockedBy },
      context
    );
  }
}

/**
 * Spreadsheet full error
 */
export class SpreadsheetFullError extends BusinessLogicError {
  constructor(
    currentSize: number,
    maxSize: number,
    context?: ErrorContext
  ) {
    super(
      `Spreadsheet is full: ${currentSize}/${maxSize} cells`,
      'SPREADSHEET_FULL',
      413,
      { currentSize, maxSize },
      context
    );
  }
}

/**
 * Dependency failed error
 */
export class DependencyFailedError extends BusinessLogicError {
  constructor(
    dependency: string,
    reason: string,
    context?: ErrorContext
  ) {
    super(
      `Dependency failed: ${dependency} - ${reason}`,
      'DEPENDENCY_FAILED',
      424,
      { dependency, reason },
      context
    );
  }
}

// ============================================================================
// SYSTEM ERRORS
// ============================================================================

/**
 * Base class for system errors
 */
export class SystemError extends PollnError {
  constructor(
    message: string,
    code: ErrorCode,
    details?: Record<string, unknown>,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(message, code, 500, details, context, cause);
  }
}

/**
 * Database error
 */
export class DatabaseError extends SystemError {
  constructor(
    operation: string,
    cause?: Error,
    context?: ErrorContext
  ) {
    super(
      `Database error during ${operation}`,
      'DATABASE_ERROR',
      { operation },
      context,
      cause
    );
  }
}

/**
 * Memory error
 */
export class MemoryError extends SystemError {
  constructor(
    requested: number,
    available: number,
    context?: ErrorContext
  ) {
    super(
      `Insufficient memory: requested ${requested}, available ${available}`,
      'MEMORY_ERROR',
      { requested, available },
      context
    );
  }
}

/**
 * Computation error
 */
export class ComputationError extends SystemError {
  constructor(
    operation: string,
    reason: string,
    context?: ErrorContext
  ) {
    super(
      `Computation error in ${operation}: ${reason}`,
      'COMPUTATION_ERROR',
      { operation, reason },
      context
    );
  }
}

/**
 * Internal error
 */
export class InternalError extends SystemError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(
      `Internal error: ${message}`,
      'INTERNAL_ERROR',
      details,
      context,
      cause
    );
  }
}

/**
 * Service unavailable error
 */
export class ServiceUnavailableError extends PollnError {
  constructor(
    service: string,
    reason?: string,
    context?: ErrorContext
  ) {
    super(
      `Service unavailable: ${service}${reason ? ` - ${reason}` : ''}`,
      'SERVICE_UNAVAILABLE',
      503,
      { service, reason },
      context
    );
  }
}

// ============================================================================
// NETWORK ERRORS
// ============================================================================

/**
 * Base class for network errors
 */
export class NetworkError extends PollnError {
  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 0,
    details?: Record<string, unknown>,
    context?: ErrorContext
  ) {
    super(message, code, statusCode, details, context);
  }
}

/**
 * Generic network error
 */
export class NetworkConnectionError extends NetworkError {
  constructor(
    url: string,
    cause?: Error,
    context?: ErrorContext
  ) {
    super(
      `Network error connecting to ${url}`,
      'NETWORK_ERROR',
      0,
      { url },
      context
    );
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends NetworkError {
  constructor(
    operation: string,
    timeout: number,
    context?: ErrorContext
  ) {
    super(
      `Operation timed out: ${operation} (${timeout}ms)`,
      'TIMEOUT',
      408,
      { operation, timeout },
      context
    );
  }
}

/**
 * Connection lost error
 */
export class ConnectionLostError extends NetworkError {
  constructor(
    url: string,
    context?: ErrorContext
  ) {
    super(
      `Connection lost to ${url}`,
      'CONNECTION_LOST',
      0,
      { url },
      context
    );
  }
}

/**
 * Request too large error
 */
export class RequestTooLargeError extends NetworkError {
  constructor(
    size: number,
    maxSize: number,
    context?: ErrorContext
  ) {
    super(
      `Request too large: ${size} bytes (max: ${maxSize})`,
      'REQUEST_TOO_LARGE',
      413,
      { size, maxSize },
      context
    );
  }
}

// ============================================================================
// EXTERNAL SERVICE ERRORS
// ============================================================================

/**
 * Base class for external service errors
 */
export class ExternalServiceError extends PollnError {
  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    service: string,
    details?: Record<string, unknown>,
    context?: ErrorContext
  ) {
    super(
      message,
      code,
      statusCode,
      { service, ...details },
      context
    );
  }
}

/**
 * External API error
 */
export class ExternalApiError extends ExternalServiceError {
  constructor(
    service: string,
    apiError: string,
    statusCode: number = 502,
    context?: ErrorContext
  ) {
    super(
      `External API error from ${service}: ${apiError}`,
      'EXTERNAL_API_ERROR',
      statusCode,
      service,
      { apiError },
      context
    );
  }
}

/**
 * External API timeout
 */
export class ExternalApiTimeoutError extends ExternalServiceError {
  constructor(
    service: string,
    timeout: number,
    context?: ErrorContext
  ) {
    super(
      `External API timeout: ${service} (${timeout}ms)`,
      'EXTERNAL_API_TIMEOUT',
      504,
      service,
      { timeout },
      context
    );
  }
}

/**
 * External service unavailable
 */
export class ExternalServiceUnavailableError extends ExternalServiceError {
  constructor(
    service: string,
    reason?: string,
    context?: ErrorContext
  ) {
    super(
      `External service unavailable: ${service}${reason ? ` - ${reason}` : ''}`,
      'EXTERNAL_API_UNAVAILABLE',
      503,
      service,
      { reason },
      context
    );
  }
}

// ============================================================================
// CIRCUIT BREAKER ERRORS
// ============================================================================

/**
 * Circuit breaker is open error
 */
export class CircuitBreakerOpenError extends PollnError {
  constructor(
    breakerName: string,
    retryAfter: number,
    context?: ErrorContext
  ) {
    super(
      `Circuit breaker '${breakerName}' is open. Retry after ${retryAfter}ms`,
      'SERVICE_UNAVAILABLE',
      503,
      { breakerName, retryAfter },
      context
    );
  }
}
