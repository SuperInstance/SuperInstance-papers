/**
 * Monitoring Middleware - Request/Response Monitoring
 *
 * Middleware for monitoring HTTP requests and WebSocket connections:
 * - Request/response logging
 * - Performance metrics collection
 * - Error tracking
 * - Request tracing
 *
 * @packageDocumentation
 * @version 1.0.0 - Week 4: Production Deployment
 */

import { MetricsCollector, MetricCategory } from '../monitoring/MetricsCollector';

// ============================================================================
// REQUEST METADATA
// ============================================================================

/**
 * Request metadata for tracking
 */
export interface RequestMetadata {
  /** Request ID for tracing */
  requestId: string;

  /** Timestamp when request started */
  startTime: number;

  /** HTTP method */
  method: string;

  /** Request endpoint/path */
  endpoint: string;

  /** Request headers (sanitized) */
  headers: Record<string, string>;

  /** Request body size */
  bodySize?: number;

  /** Custom tags */
  tags?: Record<string, string>;
}

/**
 * Response metadata for tracking
 */
export interface ResponseMetadata {
  /** Response status code */
  statusCode: number;

  /** Response body size */
  bodySize?: number;

  /** Response headers */
  headers: Record<string, string>;

  /** Custom tags */
  tags?: Record<string, string>;
}

/**
 * Error metadata for tracking
 */
export interface ErrorMetadata {
  /** Error type */
  errorType: string;

  /** Error message */
  errorMessage: string;

  /** Error stack trace */
  stackTrace?: string;

  /** Custom tags */
  tags?: Record<string, string>;
}

// ============================================================================
// MONITORING MIDDLEWARE
// ============================================================================

/**
 * Monitoring middleware configuration
 */
export interface MonitoringMiddlewareConfig {
  /** Metrics collector instance */
  metricsCollector?: MetricsCollector;

  /** Enable request logging */
  logRequests?: boolean;

  /** Enable response logging */
  logResponses?: boolean;

  /** Enable error logging */
  logErrors?: boolean;

  /** Enable performance tracking */
  trackPerformance?: boolean;

  /** Sanitize headers (remove sensitive data) */
  sanitizeHeaders?: boolean;

  /** Headers to sanitize */
  sensitiveHeaders?: string[];

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Monitoring middleware for HTTP/WebSocket monitoring
 *
 * Usage:
 * ```typescript
 * const middleware = new MonitoringMiddleware({
 *   logRequests: true,
 *   logResponses: true,
 *   trackPerformance: true
 * });
 *
 * // Monitor fetch request
 * const response = await middleware.monitorFetch({
 *   url: 'https://api.example.com/claws',
 *   method: 'POST',
 *   headers: { 'Authorization': 'Bearer token' },
 *   body: JSON.stringify(data)
 * });
 * ```
 */
export class MonitoringMiddleware {
  private config: Required<MonitoringMiddlewareConfig>;
  private metricsCollector: MetricsCollector;
  private activeRequests: Map<string, RequestMetadata> = new Map();

  constructor(config: MonitoringMiddlewareConfig = {}) {
    this.config = {
      metricsCollector: config.metricsCollector || (() => {
        // Lazy import to avoid circular dependencies
        const { getMetricsCollector } = require('../monitoring/MetricsCollector');
        return getMetricsCollector();
      })(),
      logRequests: config.logRequests !== false,
      logResponses: config.logResponses !== false,
      logErrors: config.logErrors !== false,
      trackPerformance: config.trackPerformance !== false,
      sanitizeHeaders: config.sanitizeHeaders !== false,
      sensitiveHeaders: config.sensitiveHeaders || ['authorization', 'cookie', 'set-cookie', 'x-api-key'],
      debug: config.debug || false
    };

    this.metricsCollector = this.config.metricsCollector;
  }

  // ========================================================================
  // REQUEST MONITORING
  // ========================================================================

  /**
   * Monitor an HTTP fetch request
   */
  async monitorFetch(
    input: RequestInfo | URL,
    init?: RequestInit & { tags?: Record<string, string> }
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method || 'GET').toUpperCase();
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Create request metadata
    const requestMetadata: RequestMetadata = {
      requestId,
      startTime,
      method,
      endpoint: this.extractEndpoint(url),
      headers: this.sanitizeHeaders(init?.headers || {}),
      bodySize: this.calculateBodySize(init?.body),
      tags: init?.tags
    };

    // Track active request
    this.activeRequests.set(requestId, requestMetadata);

    // Log request
    if (this.config.logRequests) {
      this.logRequest(requestMetadata);
    }

    try {
      // Make the actual request
      const response = await fetch(input, init);
      const duration = Date.now() - startTime;

      // Create response metadata
      const responseMetadata: ResponseMetadata = {
        statusCode: response.status,
        bodySize: parseInt(response.headers.get('content-length') || '0'),
        headers: this.sanitizeHeaders(Object.fromEntries(response.headers.entries())),
        tags: init?.tags
      };

      // Log response
      if (this.config.logResponses) {
        this.logResponse(requestMetadata, responseMetadata, duration);
      }

      // Track metrics
      if (this.config.trackPerformance) {
        this.metricsCollector.recordHttpRequest(
          method,
          requestMetadata.endpoint,
          responseMetadata.statusCode,
          duration,
          {
            ...requestMetadata.tags,
            ...responseMetadata.tags,
            request_id: requestId
          }
        );
      }

      // Check for errors
      if (!response.ok) {
        this.metricsCollector.recordHttpError(
          method,
          requestMetadata.endpoint,
          `HTTP ${response.status}`,
          response.status,
          {
            ...requestMetadata.tags,
            request_id: requestId
          }
        );
      }

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Create error metadata
      const errorMetadata: ErrorMetadata = {
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stackTrace: error instanceof Error ? error.stack : undefined,
        tags: init?.tags
      };

      // Log error
      if (this.config.logErrors) {
        this.logError(requestMetadata, errorMetadata, duration);
      }

      // Track error metrics
      this.metricsCollector.recordError(
        errorMetadata.errorType,
        errorMetadata.errorMessage,
        {
          ...requestMetadata.tags,
          method,
          endpoint: requestMetadata.endpoint,
          request_id: requestId
        }
      );

      throw error;

    } finally {
      // Remove from active requests
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Monitor WebSocket message
   */
  monitorWebSocketMessage(
    messageType: string,
    latencyMs: number,
    tags?: Record<string, string>
  ): void {
    this.metricsCollector.recordWebSocketMessage(messageType, latencyMs, tags);
  }

  /**
   * Monitor WebSocket connection
   */
  monitorWebSocketConnection(connected: boolean, tags?: Record<string, string>): void {
    if (connected) {
      this.metricsCollector.recordWebSocketConnection(tags);
    } else {
      this.metricsCollector.recordWebSocketDisconnection('normal', tags);
    }
  }

  /**
   * Monitor WebSocket error
   */
  monitorWebSocketError(error: Error, tags?: Record<string, string>): void {
    this.metricsCollector.recordError(
      'WebSocketError',
      error.message,
      {
        ...tags,
        error_type: error.constructor.name
      }
    );
  }

  // ========================================================================
  // LOGGING METHODS
  // ========================================================================

  /**
   * Log request
   */
  private logRequest(metadata: RequestMetadata): void {
    const logData = {
      type: 'request',
      requestId: metadata.requestId,
      timestamp: new Date(metadata.startTime).toISOString(),
      method: metadata.method,
      endpoint: metadata.endpoint,
      headers: metadata.headers,
      bodySize: metadata.bodySize,
      tags: metadata.tags
    };

    this.debugLog('→ Request:', logData);
  }

  /**
   * Log response
   */
  private logResponse(
    requestMetadata: RequestMetadata,
    responseMetadata: ResponseMetadata,
    duration: number
  ): void {
    const logData = {
      type: 'response',
      requestId: requestMetadata.requestId,
      timestamp: new Date().toISOString(),
      method: requestMetadata.method,
      endpoint: requestMetadata.endpoint,
      statusCode: responseMetadata.statusCode,
      duration: `${duration}ms`,
      headers: responseMetadata.headers,
      bodySize: responseMetadata.bodySize,
      tags: responseMetadata.tags
    };

    this.debugLog('← Response:', logData);
  }

  /**
   * Log error
   */
  private logError(
    requestMetadata: RequestMetadata,
    errorMetadata: ErrorMetadata,
    duration: number
  ): void {
    const logData = {
      type: 'error',
      requestId: requestMetadata.requestId,
      timestamp: new Date().toISOString(),
      method: requestMetadata.method,
      endpoint: requestMetadata.endpoint,
      errorType: errorMetadata.errorType,
      errorMessage: errorMetadata.errorMessage,
      duration: `${duration}ms`,
      tags: errorMetadata.tags
    };

    this.debugLog('✗ Error:', logData);
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Extract endpoint from URL
   */
  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search;
    } catch {
      return url;
    }
  }

  /**
   * Sanitize headers (remove sensitive data)
   */
  private sanitizeHeaders(headers: HeadersInit | Record<string, string>): Record<string, string> {
    const headersObj: Record<string, string> = {};

    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        headersObj[key] = this.shouldSanitizeHeader(key) ? '***' : value;
      });
    } else if (Array.isArray(headers)) {
      for (const [key, value] of headers) {
        headersObj[key] = this.shouldSanitizeHeader(key) ? '***' : value;
      }
    } else {
      for (const [key, value] of Object.entries(headers)) {
        headersObj[key] = this.shouldSanitizeHeader(key) ? '***' : value;
      }
    }

    return headersObj;
  }

  /**
   * Check if header should be sanitized
   */
  private shouldSanitizeHeader(headerName: string): boolean {
    if (!this.config.sanitizeHeaders) {
      return false;
    }

    const lowerHeader = headerName.toLowerCase();
    return this.config.sensitiveHeaders.some(h => h.toLowerCase() === lowerHeader);
  }

  /**
   * Calculate body size
   */
  private calculateBodySize(body: BodyInit | null | undefined): number {
    if (!body) {
      return 0;
    }

    if (typeof body === 'string') {
      return new Blob([body]).size;
    }

    if (body instanceof Blob) {
      return body.size;
    }

    if (body instanceof ArrayBuffer) {
      return body.byteLength;
    }

    if (ArrayBuffer.isView(body)) {
      return body.byteLength;
    }

    // FormData and other types are harder to calculate
    return 0;
  }

  /**
   * Get active requests
   */
  getActiveRequests(): RequestMetadata[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Debug logging
   */
  private debugLog(message: string, data?: any): void {
    if (this.config.debug) {
      if (data) {
        console.log(`[MonitoringMiddleware] ${message}`, JSON.stringify(data, null, 2));
      } else {
        console.log(`[MonitoringMiddleware] ${message}`);
      }
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create monitoring middleware with default configuration
 */
export function createMonitoringMiddleware(
  config?: MonitoringMiddlewareConfig
): MonitoringMiddleware {
  return new MonitoringMiddleware(config);
}

/**
 * Get global monitoring middleware instance
 */
let globalMiddleware: MonitoringMiddleware | null = null;

export function getMonitoringMiddleware(
  config?: MonitoringMiddlewareConfig
): MonitoringMiddleware {
  if (!globalMiddleware) {
    globalMiddleware = new MonitoringMiddleware(config);
  }
  return globalMiddleware;
}

/**
 * Reset global monitoring middleware
 */
export function resetMonitoringMiddleware(): void {
  globalMiddleware = null;
}

export default MonitoringMiddleware;
