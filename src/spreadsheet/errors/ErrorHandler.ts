/**
 * Error Handler for POLLN Spreadsheets
 *
 * Centralized error handling with user-friendly messaging,
 * retry logic detection, and comprehensive logging.
 */

import type {
  ErrorResponse,
  ErrorSeverity,
} from './types.js';
import type { ErrorCode } from './ErrorCodes.js';
import {
  PollnError,
  ValidationError,
  PermissionError,
  BusinessLogicError,
  SystemError,
  NetworkError,
  ExternalServiceError,
} from './PollnError.js';
import { ErrorLogger } from './ErrorLogger.js';
import { getErrorCodeMetadata, getUserMessage } from './ErrorCodes.js';

/**
 * User-friendly message templates
 */
const USER_MESSAGES: Record<string, string> = {
  // Validation errors
  INVALID_CELL: 'The cell reference you entered is not valid. Please check and try again.',
  INVALID_FORMULA: 'There is a problem with your formula. Please check the syntax.',
  INVALID_VALUE: 'The value you entered is not valid for this field.',
  INVALID_RANGE: 'The cell range is not valid. Use a format like A1:B10.',
  TYPE_MISMATCH: 'The type of data you entered does not match what is expected.',
  FORMULA_PARSE_ERROR: 'Could not understand the formula. Please check for errors.',
  CIRCULAR_DEPENDENCY: 'There is a circular reference in your formulas. Please remove it.',
  DIVISION_BY_ZERO: 'You cannot divide by zero. Please check your formula.',

  // Permission errors
  ACCESS_DENIED: 'You do not have permission to access this resource.',
  RESOURCE_NOT_FOUND: 'The resource you are looking for could not be found.',
  READ_ONLY: 'This resource is read-only and cannot be modified.',
  AUTHENTICATION_FAILED: 'Your authentication failed. Please log in again.',
  INSUFFICIENT_PERMISSIONS: 'You do not have sufficient permissions for this action.',

  // Business logic errors
  VERSION_CONFLICT: 'This resource was modified by someone else. Please refresh and try again.',
  QUOTA_EXCEEDED: 'You have exceeded your quota. Please wait or contact support.',
  LOCKED_CELL: 'This cell is currently locked by another user.',
  SPREADSHEET_FULL: 'The spreadsheet has reached its maximum size.',
  DEPENDENCY_FAILED: 'A required operation failed. Please try again.',

  // System errors
  DATABASE_ERROR: 'A database error occurred. Please try again later.',
  MEMORY_ERROR: 'The system is out of memory. Please close other applications.',
  COMPUTATION_ERROR: 'An error occurred during calculation.',
  INTERNAL_ERROR: 'An internal error occurred. Our team has been notified.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',

  // Network errors
  NETWORK_ERROR: 'A network error occurred. Please check your connection.',
  TIMEOUT: 'The operation took too long to complete. Please try again.',
  CONNECTION_LOST: 'Your connection was lost. Please check your internet.',
  REQUEST_TOO_LARGE: 'Your request is too large. Please reduce the data size.',

  // External service errors
  EXTERNAL_API_ERROR: 'An external service returned an error. Please try again.',
  EXTERNAL_API_TIMEOUT: 'An external service is taking too long to respond.',
  EXTERNAL_API_UNAVAILABLE: 'An external service is unavailable. Please try again later.',
};

/**
 * Suggested actions for common errors
 */
const SUGGESTED_ACTIONS: Record<string, string[]> = {
  INVALID_FORMULA: [
    'Check for typos in function names',
    'Ensure all parentheses are balanced',
    'Verify cell references are correct',
  ],
  CIRCULAR_DEPENDENCY: [
    'Review the formulas in the affected cells',
    'Remove or break the circular reference',
    'Consider using intermediate cells for complex calculations',
  ],
  VERSION_CONFLICT: [
    'Refresh the page to see the latest changes',
    'Reapply your modifications',
    'Consider using automatic save to avoid conflicts',
  ],
  NETWORK_ERROR: [
    'Check your internet connection',
    'Try refreshing the page',
    'Contact support if the issue persists',
  ],
  TIMEOUT: [
    'Check your connection speed',
    'Reduce the amount of data',
    'Try again later',
  ],
};

/**
 * Central error handler for POLLN spreadsheets
 */
export class ErrorHandler {
  private logger: ErrorLogger;

  constructor(logger?: ErrorLogger) {
    this.logger = logger || new ErrorLogger();
  }

  /**
   * Handle any error and convert to standard response
   */
  public handle(error: unknown, context?: { userId?: string; sessionId?: string }): ErrorResponse {
    let pollnError: PollnError;

    // Convert unknown error to PollnError
    if (error instanceof PollnError) {
      pollnError = error;
    } else if (error instanceof Error) {
      pollnError = PollnError.fromError(error);
    } else {
      pollnError = new PollnError(
        String(error),
        'INTERNAL_ERROR',
        500,
        { originalError: error }
      );
    }

    // Log the error
    this.log(pollnError);

    // Convert to response format
    return pollnError.toResponse();
  }

  /**
   * Determine if an error is retryable
   */
  public isRetryable(error: PollnError): boolean {
    const metadata = getErrorCodeMetadata(error.code);
    return metadata.retryable;
  }

  /**
   * Get user-friendly message for an error
   */
  public toUserMessage(error: PollnError): string {
    const template = USER_MESSAGES[error.code];
    if (template) {
      return template;
    }

    // Fallback to error message
    return error.message;
  }

  /**
   * Get suggested actions for an error
   */
  public getSuggestedActions(error: PollnError): string[] {
    return SUGGESTED_ACTIONS[error.code] || [
      'Try again later',
      'Contact support if the issue persists',
    ];
  }

  /**
   * Get error severity
   */
  public getSeverity(error: PollnError): ErrorSeverity {
    const metadata = getErrorCodeMetadata(error.code);
    return metadata.severity;
  }

  /**
   * Check if error should trigger an alert
   */
  public shouldAlert(error: PollnError): boolean {
    const severity = this.getSeverity(error);
    return severity === 'high' || severity === 'critical';
  }

  /**
   * Log error with structured format
   */
  public log(error: PollnError): void {
    this.logger.logError(error, {
      severity: this.getSeverity(error),
    } as any);
  }

  /**
   * Send alert for critical errors
   */
  public alert(error: PollnError): void {
    if (!this.shouldAlert(error)) {
      return;
    }

    this.logger.logError(error, {
      severity: this.getSeverity(error),
      alert: true,
      timestamp: new Date().toISOString(),
    });

    // In production, this would send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Integrate with monitoring service (Sentry, DataDog, etc.)
      console.error('[ALERT]', {
        code: error.code,
        message: error.message,
        correlationId: error.correlationId,
        timestamp: error.timestamp,
      });
    }
  }

  /**
   * Create error response for API
   */
  public createErrorResponse(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
  ): ErrorResponse {
    const error = new PollnError(message, code, 500, details);
    return this.handle(error);
  }

  /**
   * Wrap a function with error handling
   */
  public wrap<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    context?: { userId?: string; sessionId?: string }
  ): T {
    return (async (...args: unknown[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        throw this.handle(error, context);
      }
    }) as T;
  }

  /**
   * Handle async errors in promises
   */
  public async handleAsync<T>(
    promise: Promise<T>,
    context?: { userId?: string; sessionId?: string }
  ): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      throw this.handle(error, context);
    }
  }
}

/**
 * Global error handler instance
 */
export const globalErrorHandler = new ErrorHandler();

/**
 * Convenience function to handle errors
 */
export function handleError(
  error: unknown,
  context?: { userId?: string; sessionId?: string }
): ErrorResponse {
  return globalErrorHandler.handle(error, context);
}

/**
 * Convenience function to check if error is retryable
 */
export function isRetryable(error: PollnError): boolean {
  return globalErrorHandler.isRetryable(error);
}

/**
 * Convenience function to get user message
 */
export function toUserMessage(error: PollnError): string {
  return globalErrorHandler.toUserMessage(error);
}

/**
 * Convenience function to log error
 */
export function logError(error: PollnError): void {
  globalErrorHandler.log(error);
}

/**
 * Convenience function to alert error
 */
export function alertError(error: PollnError): void {
  globalErrorHandler.alert(error);
}
