/**
 * Error Logger for POLLN Spreadsheets
 *
 * Structured logging with correlation tracking,
 * sensitive data redaction, and context preservation.
 */

import type {
  ErrorContext,
  ErrorLoggerConfig,
  SensitivePattern,
} from './types.js';
import type { PollnError } from './PollnError.js';
import { ErrorSeverity } from './types.js';
import {
  ValidationError,
  PermissionError,
  BusinessLogicError,
  SystemError,
  NetworkError,
  ExternalServiceError,
} from './PollnError.js';

/**
 * Default sensitive data patterns
 */
const DEFAULT_SENSITIVE_PATTERNS: SensitivePattern[] = [
  {
    pattern: /("password"\s*:\s*")([^"]+)"/gi,
    replacement: '$1***REDACTED***"',
    description: 'Password fields',
  },
  {
    pattern: /("token"\s*:\s*")([^"]+)"/gi,
    replacement: '$1***REDACTED***"',
    description: 'Token fields',
  },
  {
    pattern: /("apiKey"\s*:\s*")([^"]+)"/gi,
    replacement: '$1***REDACTED***"',
    description: 'API key fields',
  },
  {
    pattern: /("secret"\s*:\s*")([^"]+)"/gi,
    replacement: '$1***REDACTED***"',
    description: 'Secret fields',
  },
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '***@***.***',
    description: 'Email addresses',
  },
  {
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: '****-****-****-****',
    description: 'Credit card numbers',
  },
  {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '***-**-****',
    description: 'SSN numbers',
  },
];

/**
 * Error logger with structured logging capabilities
 */
export class ErrorLogger {
  private config: Required<ErrorLoggerConfig>;
  private errorBuffer: Array<{ error: PollnError; timestamp: number }> = [];

  constructor(config?: ErrorLoggerConfig) {
    this.config = {
      minSeverity: config?.minSeverity ?? ErrorSeverity.LOW,
      includeStackTrace: config?.includeStackTrace ?? true,
      logToConsole: config?.logToConsole ?? true,
      logEndpoint: config?.logEndpoint ?? '',
      sensitivePatterns: config?.sensitivePatterns ?? DEFAULT_SENSITIVE_PATTERNS,
      defaultContext: config?.defaultContext ?? {},
    };
  }

  /**
   * Log an error with context
   */
  public logError(
    error: PollnError,
    context?: Partial<ErrorContext> & { severity?: ErrorSeverity; alert?: boolean; timestamp?: string }
  ): void {
    const severity = context?.severity ?? this.getErrorSeverity(error);
    const shouldLog = this.shouldLog(severity);

    if (!shouldLog) {
      return;
    }

    const logEntry = this.createLogEntry(error, context);

    if (this.config.logToConsole) {
      this.logToConsole(logEntry);
    }

    if (this.config.logEndpoint) {
      this.sendToEndpoint(logEntry);
    }

    // Add to buffer for batch processing
    this.errorBuffer.push({
      error,
      timestamp: Date.now(),
    });

    // Keep buffer size manageable
    if (this.errorBuffer.length > 1000) {
      this.errorBuffer.shift();
    }
  }

  /**
   * Log multiple errors at once
   */
  public logErrors(errors: Array<{ error: PollnError; context?: Partial<ErrorContext> }>): void {
    errors.forEach(({ error, context }) => {
      this.logError(error, context);
    });
  }

  /**
   * Get recent errors from buffer
   */
  public getRecentErrors(count: number = 10): Array<{ error: PollnError; timestamp: number }> {
    return this.errorBuffer.slice(-count);
  }

  /**
   * Clear error buffer
   */
  public clearBuffer(): void {
    this.errorBuffer = [];
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    total: number;
    byCode: Record<string, number>;
    bySeverity: Record<ErrorSeverity, number>;
  } {
    const stats = {
      total: this.errorBuffer.length,
      byCode: {} as Record<string, number>,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      } as Record<ErrorSeverity, number>,
    };

    for (const { error } of this.errorBuffer) {
      stats.byCode[error.code] = (stats.byCode[error.code] || 0) + 1;
      const severity = this.getErrorSeverity(error);
      stats.bySeverity[severity]++;
    }

    return stats;
  }

  /**
   * Redact sensitive data from a string
   */
  public redactSensitiveData(data: string): string {
    let redacted = data;

    for (const { pattern, replacement } of this.config.sensitivePatterns) {
      redacted = redacted.replace(pattern, replacement);
    }

    return redacted;
  }

  /**
   * Add custom sensitive pattern
   */
  public addSensitivePattern(pattern: SensitivePattern): void {
    this.config.sensitivePatterns.push(pattern);
  }

  /**
   * Update logger configuration
   */
  public updateConfig(config: Partial<ErrorLoggerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      sensitivePatterns: config.sensitivePatterns ?? this.config.sensitivePatterns,
    };
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(
    error: PollnError,
    context?: Partial<ErrorContext> & { severity?: ErrorSeverity; alert?: boolean; timestamp?: string }
  ): Record<string, unknown> {
    const baseContext = { ...this.config.defaultContext };
    const errorContext = { ...baseContext, ...context };

    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      correlationId: error.correlationId,
      code: error.code,
      message: this.redactSensitiveData(error.message),
      severity: context?.severity ?? this.getErrorSeverity(error),
      category: this.getCategory(error),
      context: this.redactContext(errorContext),
    } as Record<string, unknown>;

    if (error.details) {
      (entry as Record<string, unknown>).details = this.redactObject(error.details);
    }

    if (error.cause) {
      (entry as Record<string, unknown>).cause = {
        message: this.redactSensitiveData(error.cause.message),
        name: error.cause.name,
      };
    }

    if (this.config.includeStackTrace && error.stack) {
      (entry as Record<string, unknown>).stack = error.stack;
    }

    if (context?.alert) {
      (entry as Record<string, unknown>).alert = true;
    }

    return entry;
  }

  /**
   * Redact sensitive data from an object
   */
  private redactObject(obj: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};
    const json = JSON.stringify(obj);
    const redactedJson = this.redactSensitiveData(json);

    try {
      return JSON.parse(redactedJson);
    } catch {
      return obj;
    }
  }

  /**
   * Redact sensitive data from context
   */
  private redactContext(context: Partial<ErrorContext>): Partial<ErrorContext> {
    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string') {
        redacted[key] = this.redactSensitiveData(value);
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactObject(
          value as Record<string, unknown>
        );
      } else {
        redacted[key] = value;
      }
    }

    return redacted as Partial<ErrorContext>;
  }

  /**
   * Log to console with appropriate level
   */
  private logToConsole(entry: Record<string, unknown>): void {
    const severity = entry.severity as ErrorSeverity;
    const message = `[${entry.code}] ${entry.message}`;

    switch (severity) {
      case ErrorSeverity.LOW:
        console.debug(message, entry);
        break;
      case ErrorSeverity.MEDIUM:
        console.info(message, entry);
        break;
      case ErrorSeverity.HIGH:
        console.warn(message, entry);
        break;
      case ErrorSeverity.CRITICAL:
        console.error(message, entry);
        break;
    }
  }

  /**
   * Send log entry to external endpoint
   */
  private async sendToEndpoint(entry: Record<string, unknown>): Promise<void> {
    if (!this.config.logEndpoint) {
      return;
    }

    try {
      await fetch(this.config.logEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch (sendError) {
      // Don't let logging errors break the application
      console.warn('Failed to send log to endpoint:', sendError);
    }
  }

  /**
   * Determine if error should be logged based on severity
   */
  private shouldLog(severity: ErrorSeverity): boolean {
    const levels = [ErrorSeverity.LOW, ErrorSeverity.MEDIUM, ErrorSeverity.HIGH, ErrorSeverity.CRITICAL];
    const minLevel = levels.indexOf(this.config.minSeverity);
    const currentLevel = levels.indexOf(severity);

    return currentLevel >= minLevel;
  }

  /**
   * Get error severity from error code
   */
  private getErrorSeverity(error: PollnError): ErrorSeverity {
    // Map error codes to severity
    const criticalCodes = ['INTERNAL_ERROR', 'DATABASE_ERROR', 'MEMORY_ERROR', 'SERVICE_UNAVAILABLE'];
    const highCodes = [
      'ACCESS_DENIED',
      'VERSION_CONFLICT',
      'QUOTA_EXCEEDED',
      'CIRCULAR_DEPENDENCY',
      'NETWORK_ERROR',
    ];
    const mediumCodes = [
      'INVALID_CELL',
      'INVALID_FORMULA',
      'INVALID_VALUE',
      'RESOURCE_NOT_FOUND',
      'TIMEOUT',
    ];

    if (criticalCodes.includes(error.code)) {
      return ErrorSeverity.CRITICAL;
    }
    if (highCodes.includes(error.code)) {
      return ErrorSeverity.HIGH;
    }
    if (mediumCodes.includes(error.code)) {
      return ErrorSeverity.MEDIUM;
    }
    return ErrorSeverity.LOW;
  }

  /**
   * Get error category from error code
   */
  private getCategory(error: PollnError): string {
    if (error instanceof ValidationError) {
      return 'validation';
    }
    if (error instanceof PermissionError) {
      return 'permission';
    }
    if (error instanceof BusinessLogicError) {
      return 'business_logic';
    }
    if (error instanceof SystemError) {
      return 'system';
    }
    if (error instanceof NetworkError) {
      return 'network';
    }
    if (error instanceof ExternalServiceError) {
      return 'external';
    }
    return 'unknown';
  }
}

/**
 * Global error logger instance
 */
export const globalErrorLogger = new ErrorLogger();

/**
 * Convenience function to log an error
 */
export function logError(
  error: PollnError,
  context?: Partial<ErrorContext> & { severity?: ErrorSeverity }
): void {
  globalErrorLogger.logError(error, context);
}

/**
 * Convenience function to redact sensitive data
 */
export function redactSensitiveData(data: string): string {
  return globalErrorLogger.redactSensitiveData(data);
}
