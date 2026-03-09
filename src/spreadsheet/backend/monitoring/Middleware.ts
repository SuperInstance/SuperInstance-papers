/**
 * Middleware.ts
 *
 * Express middleware for automatic HTTP metrics collection.
 * Tracks request duration, status codes, paths, and methods.
 */

import { Request, Response, NextFunction } from 'express';
import { getMetricsCollector, MetricLabels } from './MetricsCollector';

/**
 * Middleware options
 */
export interface MetricsMiddlewareOptions {
  /**
   * Exclude specific paths from metrics
   */
  excludePaths?: string[];

  /**
   * Custom label extractor function
   */
  labelExtractor?: (req: Request, res: Response) => Partial<MetricLabels>;

  /**
   * Whether to track response size
   */
  trackResponseSize?: boolean;

  /**
   * Whether to track request body size
   */
  trackRequestSize?: boolean;
}

/**
 * Request duration store for async tracking
 */
interface RequestDurationStore {
  startTime: number;
  labels: Partial<MetricLabels>;
}

const requestDurationMap = new WeakMap<Request, RequestDurationStore>();

/**
 * Create Express middleware for metrics collection
 */
export function createMetricsMiddleware(options: MetricsMiddlewareOptions = {}) {
  const {
    excludePaths = [],
    labelExtractor,
    trackResponseSize = true,
    trackRequestSize = false,
  } = options;

  const metrics = getMetricsCollector();

  return (req: Request, res: Response, next: NextFunction) => {
    // Check if path should be excluded
    if (excludePaths.some(path => req.path.match(path))) {
      return next();
    }

    // Extract labels
    const labels: Partial<MetricLabels> = {
      method: req.method,
      path: normalizePath(req.path),
    };

    // Apply custom label extractor
    if (labelExtractor) {
      Object.assign(labels, labelExtractor(req, res));
    }

    // Track request size if enabled
    if (trackRequestSize && req.headers['content-length']) {
      const requestSize = parseInt(req.headers['content-length'], 10);
      metrics.observeResponseSize(requestSize, labels.path || req.path);
    }

    // Store request start time
    requestDurationMap.set(req, {
      startTime: Date.now(),
      labels,
    });

    // Track response size if enabled
    if (trackResponseSize) {
      const originalSend = res.send;
      res.send = function(this: Response, ...args: any[]) {
        const chunk = args[0];
        if (chunk && typeof chunk !== 'function') {
          const size = Buffer.byteLength(typeof chunk === 'string' ? chunk : JSON.stringify(chunk));
          metrics.observeResponseSize(size, labels.path || req.path);
        }
        return originalSend.apply(this, args);
      };
    }

    // Handle response finish
    res.on('finish', () => {
      const durationData = requestDurationMap.get(req);
      if (!durationData) return;

      const duration = (Date.now() - durationData.startTime) / 1000; // Convert to seconds
      const finalLabels: MetricLabels = {
        ...durationData.labels,
        status_code: res.statusCode.toString(),
      };

      // Increment request counter
      metrics.incrementHttpRequests(finalLabels);

      // Observe request duration
      metrics.observeHttpRequestDuration(duration, finalLabels);

      // Track errors
      if (res.statusCode >= 400) {
        metrics.incrementErrors({
          error_type: res.statusCode >= 500 ? 'server_error' : 'client_error',
          cell_type: 'http',
        });
      }
    });

    next();
  };
}

/**
 * Normalize path by replacing path parameters with placeholders
 */
function normalizePath(path: string): string {
  // Replace UUIDs
  path = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':uuid'
  );

  // Replace numbers
  path = path.replace(/\d+/g, ':id');

  // Replace common patterns
  path = path.replace(/\/[a-f0-9]{24}/g, ':mongoId');
  path = path.replace(/\/[a-zA-Z0-9_-]{20,}/g, ':token');

  return path;
}

/**
 * Middleware to track errors
 */
export function createErrorMetricsMiddleware() {
  const metrics = getMetricsCollector();

  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    metrics.incrementErrors({
      error_type: err.name || 'unknown',
      cell_type: 'middleware',
    });

    next(err);
  };
}

/**
 * Track async operation duration
 */
export function trackAsyncOperation<T>(
  operationName: string,
  labels: Partial<MetricLabels>,
  fn: () => Promise<T>
): Promise<T> {
  const metrics = getMetricsCollector();
  const startTime = Date.now();

  return fn()
    .then(result => {
      const duration = (Date.now() - startTime) / 1000;
      metrics.observeHttpRequestDuration(duration, {
        ...labels,
        path: operationName,
        status_code: 'success',
      });
      return result;
    })
    .catch(error => {
      const duration = (Date.now() - startTime) / 1000;
      metrics.observeHttpRequestDuration(duration, {
        ...labels,
        path: operationName,
        status_code: 'error',
      });
      metrics.incrementErrors({
        error_type: error.name || 'unknown',
        cell_type: operationName,
      });
      throw error;
    });
}

/**
 * Track synchronous operation duration
 */
export function trackOperation<T>(
  operationName: string,
  labels: Partial<MetricLabels>,
  fn: () => T
): T {
  const metrics = getMetricsCollector();
  const startTime = Date.now();

  try {
    const result = fn();
    const duration = (Date.now() - startTime) / 1000;
    metrics.observeHttpRequestDuration(duration, {
      ...labels,
      path: operationName,
      status_code: 'success',
    });
    return result;
  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000;
    metrics.observeHttpRequestDuration(duration, {
      ...labels,
      path: operationName,
      status_code: 'error',
    });
    metrics.incrementErrors({
      error_type: error.name || 'unknown',
      cell_type: operationName,
    });
    throw error;
  }
}

/**
 * Decorator for tracking method performance
 */
export function TrackOperation(operationName?: string, labels?: Partial<MetricLabels>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const metrics = getMetricsCollector();
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = (Date.now() - startTime) / 1000;

        metrics.observeHttpRequestDuration(duration, {
          method: 'METHOD',
          path: name,
          status_code: 'success',
          ...labels,
        });

        return result;
      } catch (error: any) {
        const duration = (Date.now() - startTime) / 1000;

        metrics.observeHttpRequestDuration(duration, {
          method: 'METHOD',
          path: name,
          status_code: 'error',
          ...labels,
        });

        metrics.incrementErrors({
          error_type: error.name || 'unknown',
          cell_type: name,
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Middleware to track active connections
 */
export function createConnectionTrackingMiddleware() {
  const metrics = getMetricsCollector();
  let activeRequests = 0;

  return (req: Request, res: Response, next: NextFunction) => {
    activeRequests++;
    metrics.setActiveConnections(activeRequests, 'http');

    res.on('finish', () => {
      activeRequests--;
      metrics.setActiveConnections(activeRequests, 'http');
    });

    next();
  };
}

/**
 * Predefined middleware for common use cases
 */
export const metricsMiddleware = createMetricsMiddleware({
  excludePaths: ['/health', '/readiness', '/metrics'],
  trackResponseSize: true,
  trackRequestSize: true,
});

export const errorMetricsMiddleware = createErrorMetricsMiddleware();
export const connectionTrackingMiddleware = createConnectionTrackingMiddleware();
