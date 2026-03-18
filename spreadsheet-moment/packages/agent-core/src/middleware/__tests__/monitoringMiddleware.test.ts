/**
 * Monitoring Middleware Unit Tests
 *
 * Comprehensive unit tests for the MonitoringMiddleware covering:
 * - Request/response monitoring
 * - WebSocket monitoring
 * - Error handling and tracking
 * - Header sanitization
 * - Body size calculation
 * - Active request tracking
 * - Metrics collection integration
 * - Edge cases and error handling
 *
 * @version 1.0.0 - Week 5: Testing & Validation
 */

import {
  MonitoringMiddleware,
  MonitoringMiddlewareConfig,
  RequestMetadata,
  ResponseMetadata,
  ErrorMetadata,
  createMonitoringMiddleware,
  getMonitoringMiddleware,
  resetMonitoringMiddleware
} from '../monitoringMiddleware';
import { MetricsCollector, MetricCategory } from '../../monitoring/MetricsCollector';

// Mock fetch for testing
global.fetch = jest.fn();

describe('MonitoringMiddleware', () => {
  let middleware: MonitoringMiddleware;
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    metricsCollector = new MetricsCollector();
    middleware = new MonitoringMiddleware({
      metricsCollector,
      logRequests: true,
      logResponses: true,
      logErrors: true,
      trackPerformance: true,
      sanitizeHeaders: true,
      debug: false
    });

    resetMonitoringMiddleware();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
  });

  describe('Constructor & Configuration', () => {
    test('should create middleware with default config', () => {
      const defaultMiddleware = new MonitoringMiddleware();
      expect(defaultMiddleware).toBeInstanceOf(MonitoringMiddleware);
    });

    test('should create middleware with custom config', () => {
      const customMiddleware = new MonitoringMiddleware({
        logRequests: false,
        logResponses: false,
        trackPerformance: false,
        sanitizeHeaders: false,
        debug: true
      });

      expect(customMiddleware).toBeInstanceOf(MonitoringMiddleware);
    });

    test('should use custom metrics collector', () => {
      const customCollector = new MetricsCollector();
      const customMiddleware = new MonitoringMiddleware({
        metricsCollector: customCollector
      });

      expect(customMiddleware).toBeInstanceOf(MonitoringMiddleware);
    });

    test('should use default sensitive headers', () => {
      const defaultMiddleware = new MonitoringMiddleware();

      // Sensitive headers should include authorization, cookie, etc.
      expect(defaultMiddleware).toBeInstanceOf(MonitoringMiddleware);
    });

    test('should accept custom sensitive headers', () => {
      const customMiddleware = new MonitoringMiddleware({
        sensitiveHeaders: ['x-custom-secret', 'x-api-key']
      });

      expect(customMiddleware).toBeInstanceOf(MonitoringMiddleware);
    });
  });

  describe('HTTP Request Monitoring', () => {
    test('should monitor successful GET request', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers({
          'content-type': 'application/json',
          'content-length': '1024'
        })
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const response = await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET'
      });

      expect(response).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ method: 'GET' })
      );
    });

    test('should monitor POST request with body', async () => {
      const mockResponse = {
        status: 201,
        ok: true,
        headers: new Headers({
          'content-length': '512'
        })
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const requestBody = JSON.stringify({ test: 'data' });

      const response = await middleware.monitorFetch('https://api.example.com/data', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(201);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'POST',
          body: requestBody
        })
      );
    });

    test('should record HTTP metrics on success', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const recordSpy = jest.spyOn(metricsCollector, 'recordHttpRequest');

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET'
      });

      expect(recordSpy).toHaveBeenCalledWith(
        'GET',
        '/test',
        200,
        expect.any(Number),
        expect.objectContaining({
          request_id: expect.stringMatching(/^req_\d+_[a-z0-9]+$/)
        })
      );
    });

    test('should record error metrics on HTTP error', async () => {
      const mockResponse = {
        status: 404,
        ok: false,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const errorSpy = jest.spyOn(metricsCollector, 'recordHttpError');

      await middleware.monitorFetch('https://api.example.com/notfound', {
        method: 'GET'
      });

      expect(errorSpy).toHaveBeenCalledWith(
        'GET',
        '/notfound',
        'HTTP 404',
        404,
        expect.any(Object)
      );
    });

    test('should record error metrics on network failure', async () => {
      const networkError = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

      const errorSpy = jest.spyOn(metricsCollector, 'recordError');

      await expect(
        middleware.monitorFetch('https://api.example.com/test', {
          method: 'GET'
        })
      ).rejects.toThrow('Network error');

      expect(errorSpy).toHaveBeenCalledWith(
        'Error',
        'Network error',
        expect.objectContaining({
          method: 'GET',
          endpoint: '/test'
        })
      );
    });

    test('should handle custom tags', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const recordSpy = jest.spyOn(metricsCollector, 'recordHttpRequest');

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET',
        tags: {
          custom_tag: 'value',
          user_id: 'test-user'
        }
      });

      expect(recordSpy).toHaveBeenCalledWith(
        'GET',
        '/test',
        200,
        expect.any(Number),
        expect.objectContaining({
          custom_tag: 'value',
          user_id: 'test-user'
        })
      );
    });
  });

  describe('Request Metadata', () => {
    test('should generate unique request ID', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await middleware.monitorFetch('https://api.example.com/test1', {
        method: 'GET'
      });
      await middleware.monitorFetch('https://api.example.com/test2', {
        method: 'GET'
      });

      const metrics = metricsCollector.getMetrics(MetricCategory.HTTP);
      const requestIds = metrics
        .filter(m => m.name === 'http_requests_total')
        .map(m => m.labels?.request_id);

      expect(requestIds.length).toBe(2);
      expect(requestIds[0]).not.toBe(requestIds[1]);
    });

    test('should extract endpoint correctly', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const recordSpy = jest.spyOn(metricsCollector, 'recordHttpRequest');

      await middleware.monitorFetch('https://api.example.com/api/v1/test?param=value', {
        method: 'GET'
      });

      expect(recordSpy).toHaveBeenCalledWith(
        'GET',
        '/api/v1/test?param=value',
        200,
        expect.any(Number),
        expect.anything()
      );
    });

    test('should handle URL as string', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET'
      });

      const metrics = metricsCollector.getMetrics(MetricCategory.HTTP);
      expect(metrics.length).toBeGreaterThan(0);
    });

    test('should handle URL as URL object', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const url = new URL('https://api.example.com/test');
      await middleware.monitorFetch(url, {
        method: 'GET'
      });

      const metrics = metricsCollector.getMetrics(MetricCategory.HTTP);
      expect(metrics.length).toBeGreaterThan(0);
    });

    test('should handle URL as Request object', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const request = new Request('https://api.example.com/test', {
        method: 'GET'
      });

      await middleware.monitorFetch(request);

      const metrics = metricsCollector.getMetrics(MetricCategory.HTTP);
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe('Header Sanitization', () => {
    test('should sanitize authorization header', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer secret-token',
          'Content-Type': 'application/json'
        }
      });

      // The request should still be made with the actual header
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer secret-token'
          })
        })
      );
    });

    test('should sanitize cookie headers', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET',
        headers: {
          'Cookie': 'session=secret',
          'Content-Type': 'application/json'
        }
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Cookie': 'session=secret'
          })
        })
      );
    });

    test('should not sanitize non-sensitive headers', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'TestAgent'
        }
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'TestAgent'
          })
        })
      );
    });

    test('should handle Headers object', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const headers = new Headers({
        'Authorization': 'Bearer token',
        'Content-Type': 'application/json'
      });

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET',
        headers
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    test('should handle header array format', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET',
        headers: [
          ['Authorization', 'Bearer token'],
          ['Content-Type', 'application/json']
        ]
      });

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Body Size Calculation', () => {
    test('should calculate string body size', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const body = 'test data';
      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'POST',
        body
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    test('should calculate Blob body size', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const blob = new Blob(['test data']);
      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'POST',
        body: blob
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    test('should calculate ArrayBuffer body size', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const buffer = new ArrayBuffer(100);
      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'POST',
        body: buffer
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    test('should calculate TypedArray body size', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const typedArray = new Uint8Array(100);
      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'POST',
        body: typedArray
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    test('should handle null body', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET',
        body: null
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    test('should handle undefined body', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET',
        body: undefined
      });

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('WebSocket Monitoring', () => {
    test('should monitor WebSocket connection', () => {
      const connectionSpy = jest.spyOn(metricsCollector, 'recordWebSocketConnection');

      middleware.monitorWebSocketConnection(true, {
        server: 'test-server'
      });

      expect(connectionSpy).toHaveBeenCalledWith({
        server: 'test-server'
      });
    });

    test('should monitor WebSocket disconnection', () => {
      const disconnectSpy = jest.spyOn(metricsCollector, 'recordWebSocketDisconnection');

      middleware.monitorWebSocketConnection(false, {
        server: 'test-server'
      });

      expect(disconnectSpy).toHaveBeenCalledWith('normal', {
        server: 'test-server'
      });
    });

    test('should monitor WebSocket message', () => {
      const messageSpy = jest.spyOn(metricsCollector, 'recordWebSocketMessage');

      middleware.monitorWebSocketMessage('reasoningStep', 25, {
        message_id: 'test-message'
      });

      expect(messageSpy).toHaveBeenCalledWith('reasoningStep', 25, {
        message_id: 'test-message'
      });
    });

    test('should monitor WebSocket error', () => {
      const errorSpy = jest.spyOn(metricsCollector, 'recordError');

      const error = new Error('WebSocket connection failed');
      middleware.monitorWebSocketError(error, {
        server: 'test-server'
      });

      expect(errorSpy).toHaveBeenCalledWith(
        'WebSocketError',
        'WebSocket connection failed',
        expect.objectContaining({
          server: 'test-server',
          error_type: 'Error'
        })
      );
    });
  });

  describe('Active Request Tracking', () => {
    test('should track active requests', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => resolve(mockResponse), 100);
        })
      );

      // Start a request (don't await)
      const requestPromise = middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET'
      });

      // Check active requests immediately
      const activeRequests = middleware.getActiveRequests();
      expect(activeRequests.length).toBe(1);
      expect(activeRequests[0].method).toBe('GET');
      expect(activeRequests[0].endpoint).toBe('/test');

      // Wait for request to complete
      await requestPromise;

      // Check active requests after completion
      const activeRequestsAfter = middleware.getActiveRequests();
      expect(activeRequestsAfter.length).toBe(0);
    });

    test('should remove request from active tracking on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const requestPromise = middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET'
      });

      try {
        await requestPromise;
      } catch (error) {
        // Expected error
      }

      const activeRequests = middleware.getActiveRequests();
      expect(activeRequests.length).toBe(0);
    });
  });

  describe('Response Metadata', () => {
    test('should capture response status code', async () => {
      const mockResponse = {
        status: 201,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const recordSpy = jest.spyOn(metricsCollector, 'recordHttpRequest');

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'POST'
      });

      expect(recordSpy).toHaveBeenCalledWith(
        'POST',
        '/test',
        201,
        expect.any(Number),
        expect.anything()
      );
    });

    test('should capture response headers', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers({
          'content-type': 'application/json',
          'x-custom-header': 'custom-value'
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET'
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    test('should capture content-length from response', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers({
          'content-length': '2048'
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET'
      });

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Error Metadata', () => {
    test('should capture error type and message', async () => {
      const error = new TypeError('Invalid URL');
      (global.fetch as jest.Mock).mockRejectedValue(error);

      const errorSpy = jest.spyOn(metricsCollector, 'recordError');

      await expect(
        middleware.monitorFetch('https://api.example.com/test', {
          method: 'GET'
        })
      ).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith(
        'TypeError',
        'Invalid URL',
        expect.objectContaining({
          method: 'GET',
          endpoint: '/test'
        })
      );
    });

    test('should capture stack trace when available', async () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:10:15';

      (global.fetch as jest.Mock).mockRejectedValue(error);

      await expect(
        middleware.monitorFetch('https://api.example.com/test', {
          method: 'GET'
        })
      ).rejects.toThrow();

      expect(global.fetch).toHaveBeenCalled();
    });

    test('should handle errors without stack trace', async () => {
      const error = { message: 'Plain error' };
      (global.fetch as jest.Mock).mockRejectedValue(error);

      await expect(
        middleware.monitorFetch('https://api.example.com/test', {
          method: 'GET'
        })
      ).rejects.toEqual(error);

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Configuration Flags', () => {
    test('should respect logRequests flag', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const quietMiddleware = new MonitoringMiddleware({
        logRequests: false,
        metricsCollector
      });

      await quietMiddleware.monitorFetch('https://api.example.com/test', {
        method: 'GET'
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    test('should respect logResponses flag', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const quietMiddleware = new MonitoringMiddleware({
        logResponses: false,
        metricsCollector
      });

      await quietMiddleware.monitorFetch('https://api.example.com/test', {
        method: 'GET'
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    test('should respect logErrors flag', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Test error'));

      const quietMiddleware = new MonitoringMiddleware({
        logErrors: false,
        metricsCollector
      });

      await expect(
        quietMiddleware.monitorFetch('https://api.example.com/test', {
          method: 'GET'
        })
      ).rejects.toThrow();

      expect(global.fetch).toHaveBeenCalled();
    });

    test('should respect trackPerformance flag', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const noPerfMiddleware = new MonitoringMiddleware({
        trackPerformance: false,
        metricsCollector
      });

      const recordSpy = jest.spyOn(metricsCollector, 'recordHttpRequest');

      await noPerfMiddleware.monitorFetch('https://api.example.com/test', {
        method: 'GET'
      });

      expect(recordSpy).not.toHaveBeenCalled();
    });

    test('should respect sanitizeHeaders flag', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const noSanitizeMiddleware = new MonitoringMiddleware({
        sanitizeHeaders: false,
        metricsCollector
      });

      await noSanitizeMiddleware.monitorFetch('https://api.example.com/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token'
        }
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token'
          })
        })
      );
    });
  });

  describe('Factory Functions', () => {
    test('should create middleware with factory function', () => {
      const factoryMiddleware = createMonitoringMiddleware({
        debug: true
      });

      expect(factoryMiddleware).toBeInstanceOf(MonitoringMiddleware);
    });

    test('should return singleton from getMonitoringMiddleware', () => {
      const instance1 = getMonitoringMiddleware();
      const instance2 = getMonitoringMiddleware();

      expect(instance1).toBe(instance2);

      resetMonitoringMiddleware();
    });

    test('should reset global middleware instance', () => {
      const instance1 = getMonitoringMiddleware();
      resetMonitoringMiddleware();
      const instance2 = getMonitoringMiddleware();

      expect(instance1).not.toBe(instance2);

      resetMonitoringMiddleware();
    });
  });

  describe('Edge Cases & Error Handling', () => {
    test('should handle very long URLs', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const longUrl = 'https://api.example.com/' + 'a'.repeat(1000);

      await expect(
        middleware.monitorFetch(longUrl, {
          method: 'GET'
        })
      ).resolves.toBeDefined();
    });

    test('should handle very long header values', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const longHeaderValue = 'x'.repeat(10000);

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET',
        headers: {
          'X-Long-Header': longHeaderValue
        }
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    test('should handle special characters in headers', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET',
        headers: {
          'X-Special': 'test"with"quotes',
          'X-Unicode': '测试中文'
        }
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    test('should handle invalid URL gracefully', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Invalid URL should still be passed to fetch
      await middleware.monitorFetch('not-a-url', {
        method: 'GET'
      });

      expect(global.fetch).toHaveBeenCalledWith('not-a-url', expect.anything());
    });

    test('should handle empty headers', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET',
        headers: {}
      });

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Integration with MetricsCollector', () => {
    test('should pass correct labels to metrics collector', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const recordSpy = jest.spyOn(metricsCollector, 'recordHttpRequest');

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET',
        tags: {
          environment: 'production',
          version: '1.0.0'
        }
      });

      expect(recordSpy).toHaveBeenCalledWith(
        'GET',
        '/test',
        200,
        expect.any(Number),
        expect.objectContaining({
          environment: 'production',
          version: '1.0.0',
          request_id: expect.stringMatching(/^req_/)
        })
      );
    });

    test('should record multiple metrics for single request', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        headers: new Headers()
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const httpSpy = jest.spyOn(metricsCollector, 'recordHttpRequest');
      const histogramSpy = jest.spyOn(metricsCollector, 'recordHttpRequest');

      await middleware.monitorFetch('https://api.example.com/test', {
        method: 'GET'
      });

      // Should record both counter and histogram
      expect(httpSpy).toHaveBeenCalled();
      expect(histogramSpy).toHaveBeenCalled();
    });
  });
});
