/**
 * POLLN Gateway Server
 * Main API gateway server implementation
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import type { GatewayConfig, GatewayContext, Request, Response } from './types.js';

/**
 * Gateway Server Class
 * Main HTTP server for the API gateway
 */
export class GatewayServer {
  private config: GatewayConfig;
  private server: ReturnType<typeof createServer>;
  private routes: Map<string, any> = new Map();
  private middleware: any[] = [];
  private metrics: any = {
    requests: [],
    totalRequests: 0,
    successfulRequests: 0,
    rateLimitExceeded: 0,
    authenticationFailed: 0
  };

  constructor(config: Partial<GatewayConfig> = {}) {
    this.config = {
      port: 3000,
      host: '0.0.0.0',
      trustProxy: true,
      routes: [],
      rateLimit: { enabled: true, windowMs: 60000, maxRequests: 100 },
      auth: {
        jwt: { enabled: true, secret: 'secret', expiresIn: '1h', refreshExpiresIn: '7d', algorithm: 'HS256', issuer: 'polln', audience: 'polln' },
        apiKey: { enabled: true, headerName: 'x-api-key', prefix: '', validator: async () => true },
        oauth: { enabled: false, providers: [], callbackURL: '/auth/callback', scopes: [] },
        session: { enabled: true, store: 'memory', ttl: 86400000, secret: 'secret', secure: false, httpOnly: true, sameSite: 'lax' }
      },
      cache: { enabled: true, ttl: 300000, store: 'memory', maxSize: 1000 },
      cors: { enabled: true, origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'], credentials: false, maxAge: 86400 },
      circuitBreaker: { enabled: true, threshold: 0.5, timeout: 60000, halfOpenTimeout: 30000, recoveryThreshold: 3 },
      timeout: 30000,
      maxBodySize: 10485760,
      ...config
    };

    this.server = createServer(this.handleRequest.bind(this));
  }

  /**
   * Start the gateway server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`=€ POLLN Gateway Server listening on ${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  /**
   * Stop the gateway server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('Gateway server stopped');
        resolve();
      });
    });
  }

  /**
   * Add a route to the gateway
   */
  addRoute(route: any): void {
    const key = `${route.methods.join(',')}:${route.path}`;
    this.routes.set(key, route);
  }

  /**
   * Add middleware
   */
  use(middleware: any): void {
    this.middleware.push(middleware);
  }

  /**
   * Handle incoming HTTP request
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Parse URL
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const method = req.method?.toUpperCase() || 'GET';

      // Create context
      const context: GatewayContext = {
        requestId,
        startTime,
        metadata: {}
      };

      // Apply middleware
      await this.applyMiddleware(req, res, context);

      // Find matching route
      const route = this.findRoute(method, url.pathname);

      if (!route) {
        this.sendErrorResponse(res, 404, 'Not Found', 'Route not found');
        return;
      }

      context.route = route;

      // Forward request to upstream
      const response = await this.forwardRequest(req, route, context);

      // Send response
      this.sendResponse(res, response);

      // Record metrics
      this.recordMetrics({
        requestId,
        method: method as any,
        path: url.pathname,
        statusCode: response.status,
        duration: Date.now() - startTime,
        userAgent: req.headers['user-agent'] || '',
        ip: req.socket.remoteAddress || '',
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Request error:', error);
      this.sendErrorResponse(res, 500, 'Internal Server Error', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Apply middleware
   */
  private async applyMiddleware(req: IncomingMessage, res: ServerResponse, context: GatewayContext): Promise<void> {
    for (const mw of this.middleware) {
      await mw(req, res, context);
    }
  }

  /**
   * Find matching route
   */
  private findRoute(method: string, path: string): any {
    const key = `${method}:${path}`;
    return this.routes.get(key);
  }

  /**
   * Forward request to upstream
   */
  private async forwardRequest(req: IncomingMessage, route: any, context: GatewayContext): Promise<any> {
    // In a real implementation, this would make an HTTP request to the upstream
    // For now, return a mock response
    return {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: { message: 'OK', requestId: context.requestId }
    };
  }

  /**
   * Send response to client
   */
  private sendResponse(res: ServerResponse, response: any): void {
    res.statusCode = response.status;

    for (const [key, value] of Object.entries(response.headers || {})) {
      res.setHeader(key, value as string);
    }

    if (typeof response.body === 'object') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(response.body));
    } else {
      res.end(response.body);
    }
  }

  /**
   * Send error response
   */
  private sendErrorResponse(res: ServerResponse, status: number, code: string, message: string): void {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: {
        code,
        message,
        timestamp: new Date().toISOString()
      }
    }));
  }

  /**
   * Record metrics
   */
  private recordMetrics(metrics: any): void {
    this.metrics.requests.push(metrics);
    this.metrics.totalRequests++;

    if (metrics.statusCode >= 200 && metrics.statusCode < 300) {
      this.metrics.successfulRequests++;
    }
  }

  /**
   * Get metrics
   */
  getMetrics(): any {
    return {
      ...this.metrics,
      requestCount: this.metrics.requests.length,
      successRate: this.metrics.totalRequests > 0
        ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<any> {
    return {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      metrics: this.getMetrics()
    };
  }
}
