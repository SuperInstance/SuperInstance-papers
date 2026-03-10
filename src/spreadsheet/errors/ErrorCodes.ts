/**
 * Error Codes for POLLN Spreadsheets
 *
 * Comprehensive error code definitions organized by category.
 * Each error has a unique code, message, and associated metadata.
 */

import { ErrorCategory, ErrorSeverity, UserMessageMapping } from './types.js';

/**
 * Base error code metadata
 */
interface ErrorCodeMetadata {
  /** HTTP status code */
  statusCode: number;
  /** Error category */
  category: ErrorCategory;
  /** Error severity */
  severity: ErrorSeverity;
  /** Whether the error is retryable */
  retryable: boolean;
  /** User-friendly description */
  description: string;
  /** Suggested actions for users */
  actions?: string[];
}

/**
 * Error code registry
 */
const errorCodeRegistry: Record<string, ErrorCodeMetadata> = {};

/**
 * Register an error code
 */
function registerErrorCode(
  code: string,
  metadata: ErrorCodeMetadata
): void {
  errorCodeRegistry[code] = metadata;
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

registerErrorCode('INVALID_CELL', {
  statusCode: 400,
  category: ErrorCategory.VALIDATION,
  severity: ErrorSeverity.MEDIUM,
  retryable: false,
  description: 'The cell reference is invalid or does not exist',
  actions: ['Check the cell reference', 'Verify the cell exists in the spreadsheet'],
});

registerErrorCode('INVALID_FORMULA', {
  statusCode: 400,
  category: ErrorCategory.VALIDATION,
  severity: ErrorSeverity.MEDIUM,
  retryable: false,
  description: 'The formula syntax is invalid',
  actions: ['Check formula syntax', 'Verify all functions are spelled correctly', 'Ensure parentheses are balanced'],
});

registerErrorCode('INVALID_VALUE', {
  statusCode: 400,
  category: ErrorCategory.VALIDATION,
  severity: ErrorSeverity.MEDIUM,
  retryable: false,
  description: 'The value provided is invalid for this operation',
  actions: ['Check the value type', 'Ensure the value matches expected format'],
});

registerErrorCode('INVALID_RANGE', {
  statusCode: 400,
  category: ErrorCategory.VALIDATION,
  severity: ErrorSeverity.MEDIUM,
  retryable: false,
  description: 'The cell range is invalid',
  actions: ['Verify the range format (e.g., A1:B10)', 'Check that start and end cells are valid'],
});

registerErrorCode('TYPE_MISMATCH', {
  statusCode: 400,
  category: ErrorCategory.VALIDATION,
  severity: ErrorSeverity.MEDIUM,
  retryable: false,
  description: 'The value type does not match the expected type',
  actions: ['Check the expected data type', 'Convert the value to the correct type'],
});

registerErrorCode('FORMULA_PARSE_ERROR', {
  statusCode: 400,
  category: ErrorCategory.VALIDATION,
  severity: ErrorSeverity.MEDIUM,
  retryable: false,
  description: 'Failed to parse the formula',
  actions: ['Check for typos', 'Verify function names', 'Ensure proper syntax'],
});

registerErrorCode('CIRCULAR_DEPENDENCY', {
  statusCode: 400,
  category: ErrorCategory.BUSINESS_LOGIC,
  severity: ErrorSeverity.HIGH,
  retryable: false,
  description: 'Circular dependency detected in formulas',
  actions: ['Review formula dependencies', 'Remove circular references', 'Use intermediate cells if needed'],
});

registerErrorCode('DIVISION_BY_ZERO', {
  statusCode: 400,
  category: ErrorCategory.BUSINESS_LOGIC,
  severity: ErrorSeverity.MEDIUM,
  retryable: false,
  description: 'Attempt to divide by zero',
  actions: ['Check the denominator', 'Add error handling for zero values'],
});

// ============================================================================
// PERMISSION ERRORS
// ============================================================================

registerErrorCode('ACCESS_DENIED', {
  statusCode: 403,
  category: ErrorCategory.PERMISSION,
  severity: ErrorSeverity.HIGH,
  retryable: false,
  description: 'Access to the resource is denied',
  actions: ['Check your permissions', 'Contact the spreadsheet owner', 'Request access if needed'],
});

registerErrorCode('RESOURCE_NOT_FOUND', {
  statusCode: 404,
  category: ErrorCategory.PERMISSION,
  severity: ErrorSeverity.MEDIUM,
  retryable: false,
  description: 'The requested resource was not found',
  actions: ['Verify the resource exists', 'Check the URL or reference', 'Ensure you have access'],
});

registerErrorCode('READ_ONLY', {
  statusCode: 403,
  category: ErrorCategory.PERMISSION,
  severity: ErrorSeverity.MEDIUM,
  retryable: false,
  description: 'The resource is read-only',
  actions: ['Request edit permissions', 'Duplicate the resource if modifications are needed'],
});

registerErrorCode('AUTHENTICATION_FAILED', {
  statusCode: 401,
  category: ErrorCategory.PERMISSION,
  severity: ErrorSeverity.HIGH,
  retryable: false,
  description: 'Authentication failed',
  actions: ['Check your credentials', 'Ensure you are logged in', 'Try logging out and back in'],
});

registerErrorCode('INSUFFICIENT_PERMISSIONS', {
  statusCode: 403,
  category: ErrorCategory.PERMISSION,
  severity: ErrorSeverity.HIGH,
  retryable: false,
  description: 'Your permissions are insufficient for this operation',
  actions: ['Contact your administrator', 'Request elevated permissions'],
});

// ============================================================================
// BUSINESS LOGIC ERRORS
// ============================================================================

registerErrorCode('VERSION_CONFLICT', {
  statusCode: 409,
  category: ErrorCategory.BUSINESS_LOGIC,
  severity: ErrorSeverity.HIGH,
  retryable: true,
  description: 'Version conflict - the resource was modified by another user',
  actions: ['Refresh the page', 'Reapply your changes', 'Ensure no one else is editing'],
});

registerErrorCode('QUOTA_EXCEEDED', {
  statusCode: 429,
  category: ErrorCategory.BUSINESS_LOGIC,
  severity: ErrorSeverity.HIGH,
  retryable: true,
  description: 'Operation quota exceeded',
  actions: ['Wait before retrying', 'Contact support to increase quota'],
});

registerErrorCode('LOCKED_CELL', {
  statusCode: 423,
  category: ErrorCategory.BUSINESS_LOGIC,
  severity: ErrorSeverity.MEDIUM,
  retryable: true,
  description: 'The cell is locked by another user',
  actions: ['Wait for the lock to be released', 'Contact the user who locked the cell'],
});

registerErrorCode('SPREADSHEET_FULL', {
  statusCode: 413,
  category: ErrorCategory.BUSINESS_LOGIC,
  severity: ErrorSeverity.CRITICAL,
  retryable: false,
  description: 'The spreadsheet has reached its maximum size',
  actions: ['Remove unnecessary data', 'Archive old data', 'Contact support for limits'],
});

registerErrorCode('DEPENDENCY_FAILED', {
  statusCode: 424,
  category: ErrorCategory.BUSINESS_LOGIC,
  severity: ErrorSeverity.HIGH,
  retryable: true,
  description: 'A dependent operation failed',
  actions: ['Check dependent operations', 'Retry the operation', 'Review error details'],
});

// ============================================================================
// SYSTEM ERRORS
// ============================================================================

registerErrorCode('DATABASE_ERROR', {
  statusCode: 500,
  category: ErrorCategory.SYSTEM,
  severity: ErrorSeverity.CRITICAL,
  retryable: true,
  description: 'A database error occurred',
  actions: ['Try again later', 'Contact support if the issue persists'],
});

registerErrorCode('MEMORY_ERROR', {
  statusCode: 500,
  category: ErrorCategory.SYSTEM,
  severity: ErrorSeverity.CRITICAL,
  retryable: false,
  description: 'The system ran out of memory',
  actions: ['Close other applications', 'Reduce the data size', 'Contact support'],
});

registerErrorCode('COMPUTATION_ERROR', {
  statusCode: 500,
  category: ErrorCategory.SYSTEM,
  severity: ErrorSeverity.HIGH,
  retryable: true,
  description: 'An error occurred during computation',
  actions: ['Check the formula for complex operations', 'Simplify the calculation', 'Try again'],
});

registerErrorCode('INTERNAL_ERROR', {
  statusCode: 500,
  category: ErrorCategory.SYSTEM,
  severity: ErrorSeverity.CRITICAL,
  retryable: true,
  description: 'An internal error occurred',
  actions: ['Try again later', 'Contact support with the error details'],
});

registerErrorCode('SERVICE_UNAVAILABLE', {
  statusCode: 503,
  category: ErrorCategory.SYSTEM,
  severity: ErrorSeverity.CRITICAL,
  retryable: true,
  description: 'The service is temporarily unavailable',
  actions: ['Wait a few minutes', 'Check status page', 'Contact support'],
});

// ============================================================================
// NETWORK ERRORS
// ============================================================================

registerErrorCode('NETWORK_ERROR', {
  statusCode: 0,
  category: ErrorCategory.NETWORK,
  severity: ErrorSeverity.HIGH,
  retryable: true,
  description: 'A network error occurred',
  actions: ['Check your internet connection', 'Try again later', 'Contact support if issues persist'],
});

registerErrorCode('TIMEOUT', {
  statusCode: 408,
  category: ErrorCategory.NETWORK,
  severity: ErrorSeverity.HIGH,
  retryable: true,
  description: 'The operation timed out',
  actions: ['Check your connection', 'Try again', 'Reduce the data size if possible'],
});

registerErrorCode('CONNECTION_LOST', {
  statusCode: 0,
  category: ErrorCategory.NETWORK,
  severity: ErrorSeverity.HIGH,
  retryable: true,
  description: 'Connection to the server was lost',
  actions: ['Check your internet connection', 'Refresh the page', 'Try again'],
});

registerErrorCode('REQUEST_TOO_LARGE', {
  statusCode: 413,
  category: ErrorCategory.NETWORK,
  severity: ErrorSeverity.MEDIUM,
  retryable: false,
  description: 'The request is too large',
  actions: ['Reduce the data size', 'Split into smaller requests'],
});

// ============================================================================
// EXTERNAL SERVICE ERRORS
// ============================================================================

registerErrorCode('EXTERNAL_API_ERROR', {
  statusCode: 502,
  category: ErrorCategory.EXTERNAL,
  severity: ErrorSeverity.HIGH,
  retryable: true,
  description: 'An external API returned an error',
  actions: ['Try again later', 'Check if the external service is operational'],
});

registerErrorCode('EXTERNAL_API_TIMEOUT', {
  statusCode: 504,
  category: ErrorCategory.EXTERNAL,
  severity: ErrorSeverity.HIGH,
  retryable: true,
  description: 'An external API timed out',
  actions: ['Try again later', 'Check the external service status'],
});

registerErrorCode('EXTERNAL_API_UNAVAILABLE', {
  statusCode: 503,
  category: ErrorCategory.EXTERNAL,
  severity: ErrorSeverity.CRITICAL,
  retryable: true,
  description: 'An external service is unavailable',
  actions: ['Wait and try again', 'Check external service status', 'Use fallback if available'],
});

// ============================================================================
// ERROR CODE TYPE
// ============================================================================

/**
 * Valid error codes for the POLLN spreadsheet system
 */
export type ErrorCode =
  // Validation errors
  | 'INVALID_CELL'
  | 'INVALID_FORMULA'
  | 'INVALID_VALUE'
  | 'INVALID_RANGE'
  | 'TYPE_MISMATCH'
  | 'FORMULA_PARSE_ERROR'
  | 'CIRCULAR_DEPENDENCY'
  | 'DIVISION_BY_ZERO'
  // Permission errors
  | 'ACCESS_DENIED'
  | 'RESOURCE_NOT_FOUND'
  | 'READ_ONLY'
  | 'AUTHENTICATION_FAILED'
  | 'INSUFFICIENT_PERMISSIONS'
  // Business logic errors
  | 'VERSION_CONFLICT'
  | 'QUOTA_EXCEEDED'
  | 'LOCKED_CELL'
  | 'SPREADSHEET_FULL'
  | 'DEPENDENCY_FAILED'
  // System errors
  | 'DATABASE_ERROR'
  | 'MEMORY_ERROR'
  | 'COMPUTATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  // Network errors
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'CONNECTION_LOST'
  | 'REQUEST_TOO_LARGE'
  // External service errors
  | 'EXTERNAL_API_ERROR'
  | 'EXTERNAL_API_TIMEOUT'
  | 'EXTERNAL_API_UNAVAILABLE';

/**
 * Get metadata for an error code
 */
export function getErrorCodeMetadata(code: ErrorCode): ErrorCodeMetadata {
  return errorCodeRegistry[code];
}

/**
 * Get all registered error codes
 */
export function getAllErrorCodes(): ErrorCode[] {
  return Object.keys(errorCodeRegistry) as ErrorCode[];
}

/**
 * Get error codes by category
 */
export function getErrorCodesByCategory(category: ErrorCategory): ErrorCode[] {
  return Object.entries(errorCodeRegistry)
    .filter(([_, metadata]) => metadata.category === category)
    .map(([code, _]) => code as ErrorCode);
}

/**
 * Get user-friendly message for an error code
 */
export function getUserMessage(code: ErrorCode): UserMessageMapping {
  const metadata = errorCodeRegistry[code];
  return {
    code,
    message: metadata.description,
    actions: metadata.actions,
    severity: metadata.severity,
  };
}

/**
 * Check if an error code is retryable
 */
export function isRetryableCode(code: ErrorCode): boolean {
  return errorCodeRegistry[code].retryable;
}

/**
 * Get the HTTP status code for an error code
 */
export function getStatusCode(code: ErrorCode): number {
  return errorCodeRegistry[code].statusCode;
}
