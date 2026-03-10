/**
 * POLLN Spreadsheet Backend - Audit Middleware
 *
 * Express middleware for automatic audit logging of requests.
 * Integrates with AuditLogger for comprehensive compliance tracking.
 *
 * Features:
 * - Request/response logging
 * - User context extraction
 * - Sensitive data masking
 * - Performance tracking
 * - Error logging
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAuditLogger, AuditEvent, AuditOutcome, AuditSeverity } from './AuditLogger.js';
import { AuditCategory } from './EventTypes.js';

/**
 * Middleware options
 */
export interface AuditMiddlewareOptions {
  // Log request body
  logBody?: boolean;

  // Log response body
  logResponseBody?: boolean;

  // Log request headers
  logHeaders?: boolean;

  // Log query parameters
  logQuery?: boolean;

  // Mask sensitive data
  maskSensitiveData?: boolean;

  // Sensitive field names to mask
  sensitiveFields?: string[];

  // Paths to exclude from logging
  excludePaths?: string[];

  // Minimum log level
  logLevel?: 'info' | 'error' | 'all';

  // Custom event type mapper
  eventTypeMapper?: (req: Request) => string;

  // Custom category mapper
  categoryMapper?: (req: Request) => AuditCategory;

  // Custom severity mapper
  severityMapper?: (req: Request, res: Response) => AuditSeverity;

  // Performance tracking
  trackPerformance?: boolean;

  // Log slow requests only
  slowThreshold?: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: AuditMiddlewareOptions = {
  logBody: true,
  logResponseBody: false,
  logHeaders: false,
  logQuery: true,
  maskSensitiveData: true,
  sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'],
  excludePaths: ['/health', '/ping', '/metrics'],
  logLevel: 'all',
  trackPerformance: true,
  slowThreshold: 1000, // 1 second
};

/**
 * Extended request with audit metadata
 */
export interface AuditedRequest extends Request {
  auditId?: string;
  auditStartTime?: number;
  auditMetadata?: {
    userId?: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    path?: string;
    method?: string;
    query?: Record<string, string>;
  };
}

/**
 * Response time tracker
 */
interface ResponseTimeData {
  auditId: string;
  startTime: number;
  path: string;
  method: string;
}

/**
 * Create audit middleware
 */
export function auditMiddleware(options: AuditMiddlewareOptions = {}): (req: AuditedRequest, res: Response, next: NextFunction) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const auditLogger = getAuditLogger();
  const responseTimes = new Map<string, ResponseTimeData>();

  return (req: AuditedRequest, res: Response, next: NextFunction): void => {
    // Check if path should be excluded
    if (opts.excludePaths?.includes(req.path)) {
      next();
      return;
    }

    // Generate audit ID
    const auditId = uuidv4();
    const startTime = Date.now();

    // Attach audit metadata to request
    req.auditId = auditId;
    req.auditStartTime = startTime;
    req.auditMetadata = {
      userAgent: req.headers['user-agent'],
      ipAddress = getClientIp(req),
      path: req.path,
      method: req.method,
      query: req.query as Record<string, string>,
    };

    // Extract user from request (if authenticated)
    const user = (req as any).user;
    if (user) {
      req.auditMetadata.userId = user.id;
      req.auditMetadata.sessionId = user.sessionId;
    }

    // Track response time
    responseTimes.set(auditId, {
      auditId,
      startTime,
      path: req.path,
      method: req.method,
    });

    // Capture response
    const originalJson = res.json;
    const originalSend = res.send;
    let responseBody: any;

    res.json = function(body: any) {
      responseBody = body;
      return originalJson.call(this, body);
    };

    res.send = function(body: any) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Log on response finish
    res.on('finish', async () => {
      const endTime = Date.now();
      const latency = endTime - startTime;
      const timeData = responseTimes.get(auditId);
      responseTimes.delete(auditId);

      // Determine if should log
      const shouldLog = shouldLogRequest(req, res, opts, latency);

      if (!shouldLog) {
        return;
      }

      // Create audit event
      const event = await createAuditEvent(req, res, responseBody, latency, opts);
      if (event) {
        try {
          await auditLogger.log(event);
        } catch (error) {
          console.error('[AuditMiddleware] Failed to log event:', error);
        }
      }
    });

    next();
  };
}

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.connection?.socket as any)?.remoteAddress ||
    'unknown'
  );
}

/**
 * Determine if request should be logged
 */
function shouldLogRequest(req: Request, res: Response, options: AuditMiddlewareOptions, latency: number): boolean {
  // Check log level
  if (options.logLevel === 'error' && res.statusCode < 400) {
    return false;
  }

  // Check slow request threshold
  if (options.slowThreshold && latency < options.slowThreshold) {
    return false;
  }

  return true;
}

/**
 * Create audit event from request/response
 */
async function createAuditEvent(
  req: AuditedRequest,
  res: Response,
  responseBody: any,
  latency: number,
  options: AuditMiddlewareOptions
): Promise<AuditEvent | null> {
  const user = (req as any).user;

  // Determine outcome
  const outcome = res.statusCode >= 400 ? AuditOutcome.FAILURE : AuditOutcome.SUCCESS;

  // Determine severity
  const severity = options.severityMapper?.(req, res) || getSeverityFromStatusCode(res.statusCode);

  // Determine event type
  const eventType = options.eventTypeMapper?.(req) || getEventTypeFromRequest(req);

  // Determine category
  const category = options.categoryMapper?.(req) || getCategoryFromPath(req.path);

  // Get actor information
  const actor = {
    id: user?.id || 'anonymous',
    type: user?.id ? 'user' as const : 'system' as const,
    username: user?.username,
    email: user?.email,
    role: user?.role,
    ipAddress: req.auditMetadata?.ipAddress,
    userAgent: req.auditMetadata?.userAgent,
    sessionId: req.auditMetadata?.sessionId,
  };

  // Get request details
  const requestData = {
    id: req.auditId || uuidv4(),
    method: req.method,
    path: req.path,
    headers: options.logHeaders ? filterHeaders(req.headers) : undefined,
    query: options.logQuery ? maskSensitiveFields(req.query as Record<string, any>, options) : undefined,
  };

  // Get response details
  const responseData = {
    statusCode: res.statusCode,
    latency,
  };

  // Get resource information
  const resource = {
    type: getResourceTypeFromPath(req.path),
    id: req.params.id || req.params.resourceId,
    path: req.path,
  };

  // Build context
  const context = {
    environment: process.env.NODE_ENV || 'development',
    metadata: {
      body: options.logBody ? maskSensitiveFields(req.body, options) : undefined,
      response: options.logResponseBody ? responseBody : undefined,
      params: req.params,
    },
  };

  // Build event
  const event: Omit<AuditEvent, 'id' | 'timestamp' | 'receivedAt' | 'compliance'> = {
    eventType,
    category,
    severity,
    outcome,
    actor,
    action: {
      operation: req.method,
      resourceType: resource.type,
      resourceId: resource.id,
      description: `${req.method} ${req.path}`,
    },
    resource,
    request: requestData,
    response: responseData,
    context,
  };

  return event as AuditEvent;
}

/**
 * Get severity from HTTP status code
 */
function getSeverityFromStatusCode(statusCode: number): AuditSeverity {
  if (statusCode >= 500) return AuditSeverity.CRITICAL;
  if (statusCode >= 400) return AuditSeverity.HIGH;
  if (statusCode >= 300) return AuditSeverity.MEDIUM;
  return AuditSeverity.LOW;
}

/**
 * Get event type from request
 */
function getEventTypeFromRequest(req: Request): string {
  const method = req.method.toLowerCase();
  const path = req.path;

  if (path.includes('/auth')) {
    if (path.includes('/login')) return method === 'post' ? 'login_success' : 'login_failed';
    if (path.includes('/logout')) return 'logout';
  }

  if (path.includes('/api/cells')) {
    if (method === 'get') return 'cell_read';
    if (method === 'post') return 'cell_created';
    if (method === 'put' || method === 'patch') return 'cell_updated';
    if (method === 'delete') return 'cell_deleted';
  }

  if (path.includes('/api/sheets')) {
    if (method === 'get') return 'sheet_read';
    if (method === 'post') return 'sheet_created';
    if (method === 'delete') return 'sheet_deleted';
  }

  return `api_${method}`;
}

/**
 * Get category from path
 */
function getCategoryFromPath(path: string): AuditCategory {
  if (path.includes('/auth')) return AuditCategory.AUTHENTICATION;
  if (path.includes('/api/users')) return AuditCategory.USER_MANAGEMENT;
  if (path.includes('/api/permissions')) return AuditCategory.AUTHORIZATION;
  if (path.includes('/api/cells') || path.includes('/api/sheets')) return AuditCategory.DATA_MODIFICATION;
  if (path.includes('/admin')) return AuditCategory.CONFIGURATION;
  return AuditCategory.SYSTEM;
}

/**
 * Get resource type from path
 */
function getResourceTypeFromPath(path: string): string {
  if (path.includes('/cells')) return 'cell';
  if (path.includes('/sheets')) return 'sheet';
  if (path.includes('/workbooks')) return 'workbook';
  if (path.includes('/users')) return 'user';
  if (path.includes('/auth')) return 'auth';
  return 'api';
}

/**
 * Filter sensitive headers
 */
function filterHeaders(headers: any): Record<string, string> {
  const filtered: Record<string, string> = {};
  const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];

  for (const [key, value] of Object.entries(headers)) {
    if (!sensitiveHeaders.includes(key.toLowerCase())) {
      filtered[key] = value as string;
    }
  }

  return filtered;
}

/**
 * Mask sensitive fields in object
 */
function maskSensitiveFields(obj: any, options: AuditMiddlewareOptions): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (!options.maskSensitiveData) {
    return obj;
  }

  const sensitivePatterns = options.sensitiveFields || [];
  const masked: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitivePatterns.some(pattern => keyLower.includes(pattern.toLowerCase()));

    if (isSensitive) {
      masked[key] = '***REDACTED***';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      masked[key] = maskSensitiveFields(obj[key], options);
    } else {
      masked[key] = obj[key];
    }
  }

  return masked;
}

/**
 * Error handler middleware for audit logging
 */
export function auditErrorHandler(options: AuditMiddlewareOptions = {}): (err: Error, req: AuditedRequest, res: Response, next: NextFunction) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const auditLogger = getAuditLogger();

  return async (err: Error, req: AuditedRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const startTime = req.auditStartTime || Date.now();
    const latency = Date.now() - startTime;

    const event: Omit<AuditEvent, 'id' | 'timestamp' | 'receivedAt' | 'compliance'> = {
      eventType: 'error',
      category: AuditCategory.SYSTEM,
      severity: AuditSeverity.HIGH,
      outcome: AuditOutcome.FAILURE,
      actor: {
        id: user?.id || 'anonymous',
        type: user?.id ? 'user' : 'system',
        username: user?.username,
        email: user?.email,
        ipAddress: req.auditMetadata?.ipAddress,
        userAgent: req.auditMetadata?.userAgent,
        sessionId: req.auditMetadata?.sessionId,
      },
      action: {
        operation: req.method,
        resourceType: getResourceTypeFromPath(req.path),
        description: `Error: ${err.message}`,
      },
      resource: {
        type: getResourceTypeFromPath(req.path),
        path: req.path,
      },
      request: {
        id: req.auditId || uuidv4(),
        method: req.method,
        path: req.path,
        headers: opts.logHeaders ? filterHeaders(req.headers) : undefined,
        query: opts.logQuery ? req.query as Record<string, string> : undefined,
      },
      response: {
        statusCode: res.statusCode || 500,
        latency,
      },
      context: {
        environment: process.env.NODE_ENV || 'development',
        metadata: {
          error: {
            name: err.name,
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
          },
        },
      },
    };

    try {
      await auditLogger.log(event as AuditEvent);
    } catch (logError) {
      console.error('[AuditErrorHandler] Failed to log error:', logError);
    }

    next(err);
  };
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitor(options: AuditMiddlewareOptions = {}): (req: AuditedRequest, res: Response, next: NextFunction) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const auditLogger = getAuditLogger();

  return (req: AuditedRequest, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    res.on('finish', async () => {
      const latency = Date.now() - startTime;

      // Log slow requests
      if (opts.slowThreshold && latency > opts.slowThreshold) {
        const event: Omit<AuditEvent, 'id' | 'timestamp' | 'receivedAt' | 'compliance'> = {
          eventType: 'slow_request',
          category: AuditCategory.PERFORMANCE,
          severity: AuditSeverity.MEDIUM,
          outcome: AuditOutcome.SUCCESS,
          actor: {
            id: (req as any).user?.id || 'anonymous',
            type: (req as any).user?.id ? 'user' : 'system',
          },
          action: {
            operation: req.method,
            resourceType: getResourceTypeFromPath(req.path),
            description: `Slow request detected: ${req.method} ${req.path} (${latency}ms)`,
          },
          resource: {
            type: getResourceTypeFromPath(req.path),
            path: req.path,
          },
          request: {
            id: req.auditId || uuidv4(),
            method: req.method,
            path: req.path,
          },
          response: {
            statusCode: res.statusCode,
            latency,
          },
          context: {
            environment: process.env.NODE_ENV || 'development',
          },
        };

        try {
          await auditLogger.log(event as AuditEvent);
        } catch (error) {
          console.error('[PerformanceMonitor] Failed to log slow request:', error);
        }
      }
    });

    next();
  };
}

export default {
  auditMiddleware,
  auditErrorHandler,
  performanceMonitor,
};
