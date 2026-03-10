/**
 * POLLN Webhook Receiver
 *
 * HTTP server for receiving webhooks from external services.
 * Handles signature verification, event routing, and replay prevention.
 */

import { EventEmitter } from 'events';
import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import { URL } from 'url';
import * as crypto from 'crypto';
import {
  WebhookRequest,
  WebhookRoute,
  IntegrationConnector,
} from '../types.js';

// ============================================================================
// Webhook Receiver Configuration
// ============================================================================

export interface WebhookReceiverConfig {
  port: number;
  host?: string;
  path?: string;
  secret?: string;
  verifySignature?: boolean;
  enableCORS?: boolean;
  maxPayloadSize?: number;
  timeout?: number;
  replayPrevention?: boolean;
  replayWindow?: number; // milliseconds
}

// ============================================================================
// Webhook Event
// ============================================================================

export interface ReceivedWebhook {
  id: string;
  integrationId: string;
  source: string;
  eventType: string;
  payload: any;
  headers: Record<string, string>;
  signature?: string;
  timestamp: number;
  receivedAt: number;
}

// ============================================================================
// Webhook Receiver
// ============================================================================

export class WebhookReceiver extends EventEmitter {
  private config: WebhookReceiverConfig;
  private server: Server | null = null;
  private routes: Map<string, WebhookRoute> = new Map();
  private integrations: Map<string, IntegrationConnector> = new Map();
  private isRunning: boolean = false;

  // Replay prevention
  private processedIds = new Set<string>();
  private processedIdExpiry = new Map<string, number>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Metrics
  private metrics = {
    totalReceived: 0,
    totalProcessed: 0,
    totalFailed: 0,
    totalRejected: 0,
    startTime: Date.now(),
  };

  constructor(config: WebhookReceiverConfig) {
    super();
    this.config = {
      host: '0.0.0.0',
      path: '/webhook',
      verifySignature: true,
      enableCORS: true,
      maxPayloadSize: 10 * 1024 * 1024, // 10MB
      timeout: 30000, // 30 seconds
      replayPrevention: true,
      replayWindow: 300000, // 5 minutes
      ...config,
    };
  }

  // ========================================================================
  // Server Lifecycle
  // ========================================================================

  /**
   * Start the webhook receiver server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Webhook receiver is already running');
    }

    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res).catch(error => {
          this.sendError(res, 500, 'Internal server error');
          this.emit('error', {
            message: 'Error handling request',
            error: error.message,
            timestamp: Date.now(),
          });
        });
      });

      this.server.on('error', (error: Error) => {
        this.emit('error', {
          message: 'Server error',
          error: error.message,
          timestamp: Date.now(),
        });
        reject(error);
      });

      this.server.listen(
        this.config.port,
        this.config.host,
        () => {
          this.isRunning = true;
          this.startCleanupInterval();

          this.emit('started', {
            port: this.config.port,
            host: this.config.host,
            path: this.config.path,
            timestamp: Date.now(),
          });

          resolve();
        }
      );
    });
  }

  /**
   * Stop the webhook receiver server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((error: Error | undefined) => {
          if (error) {
            reject(error);
          } else {
            this.isRunning = false;
            this.stopCleanupInterval();

            this.emit('stopped', {
              timestamp: Date.now(),
            });

            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // ========================================================================
  // Route Management
  // ========================================================================

  /**
   * Register a webhook route
   */
  registerRoute(routeId: string, route: WebhookRoute): void {
    this.routes.set(routeId, route);

    // Register integration if provided
    if (route.integrationId && !this.integrations.has(route.integrationId)) {
      this.emit('warning', {
        message: `Integration ${route.integrationId} not registered for route ${routeId}`,
        timestamp: Date.now(),
      });
    }

    this.emit('route:registered', {
      routeId,
      integrationId: route.integrationId,
      cellId: route.cellId,
      timestamp: Date.now(),
    });
  }

  /**
   * Unregister a webhook route
   */
  unregisterRoute(routeId: string): void {
    const deleted = this.routes.delete(routeId);

    if (deleted) {
      this.emit('route:unregistered', {
        routeId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get all registered routes
   */
  getRoutes(): Map<string, WebhookRoute> {
    return new Map(this.routes);
  }

  // ========================================================================
  // Integration Management
  // ========================================================================

  /**
   * Register an integration connector
   */
  registerIntegration(integration: IntegrationConnector): void {
    this.integrations.set(integration.id, integration);

    this.emit('integration:registered', {
      integrationId: integration.id,
      timestamp: Date.now(),
    });
  }

  /**
   * Unregister an integration connector
   */
  unregisterIntegration(integrationId: string): void {
    this.integrations.delete(integrationId);

    // Remove routes associated with this integration
    for (const [routeId, route] of this.routes.entries()) {
      if (route.integrationId === integrationId) {
        this.routes.delete(routeId);
      }
    }

    this.emit('integration:unregistered', {
      integrationId,
      timestamp: Date.now(),
    });
  }

  // ========================================================================
  // Request Handling
  // ========================================================================

  /**
   * Handle incoming HTTP request
   */
  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const startTime = Date.now();

    // Set CORS headers if enabled
    if (this.config.enableCORS) {
      this.setCORSHeaders(res);
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
      this.sendError(res, 405, 'Method not allowed');
      return;
    }

    // Check path
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    if (url.pathname !== this.config.path) {
      this.sendError(res, 404, 'Not found');
      return;
    }

    // Check content type
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      this.sendError(res, 400, 'Content-Type must be application/json');
      return;
    }

    // Check content length
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > (this.config.maxPayloadSize || 0)) {
      this.sendError(res, 413, 'Payload too large');
      return;
    }

    try {
      // Read and parse request body
      const body = await this.readRequestBody(req);
      const payload = JSON.parse(body);

      // Generate webhook ID
      const webhookId = this.generateWebhookId(payload, req.headers);

      // Check for replay attacks
      if (this.config.replayPrevention && this.isProcessed(webhookId)) {
        this.metrics.totalRejected++;
        this.sendError(res, 409, 'Duplicate webhook request');
        this.emit('replay:detected', {
          webhookId,
          timestamp: Date.now(),
        });
        return;
      }

      // Create webhook request
      const webhookRequest: WebhookRequest = {
        headers: this.normalizeHeaders(req.headers),
        body: payload,
        signature: req.headers['x-hub-signature-256'] ||
                  req.headers['x-hub-signature'] ||
                  req.headers['x-signature'] as string,
        timestamp: parseInt(req.headers['x-request-timestamp'] as string || Date.now().toString(), 10),
        id: webhookId,
      };

      // Verify signature if enabled
      if (this.config.verifySignature && webhookRequest.signature) {
        const isValid = await this.verifySignature(
          body,
          webhookRequest.signature,
          this.config.secret
        );

        if (!isValid) {
          this.metrics.totalRejected++;
          this.sendError(res, 401, 'Invalid signature');
          this.emit('signature:invalid', {
            webhookId,
            timestamp: Date.now(),
          });
          return;
        }
      }

      // Route webhook
      const result = await this.routeWebhook(webhookRequest, url);

      if (result.success) {
        // Mark as processed
        this.markProcessed(webhookId);

        this.metrics.totalProcessed++;
        this.sendSuccess(res, result.data);

        this.emit('webhook:processed', {
          webhookId,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        });
      } else {
        this.metrics.totalFailed++;
        this.sendError(res, 500, result.error || 'Processing failed');

        this.emit('webhook:failed', {
          webhookId,
          error: result.error,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        });
      }

      this.metrics.totalReceived++;
    } catch (error: any) {
      this.metrics.totalFailed++;
      this.sendError(res, 400, error.message || 'Bad request');

      this.emit('webhook:error', {
        error: error.message,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Route webhook to appropriate integration/cell
   */
  private async routeWebhook(
    request: WebhookRequest,
    url: URL
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Extract route ID from URL query parameters or headers
    const routeId = url.searchParams.get('route') ||
                   request.headers['x-webhook-route'] as string;

    if (!routeId) {
      return { success: false, error: 'No route specified' };
    }

    const route = this.routes.get(routeId);
    if (!route) {
      return { success: false, error: 'Route not found' };
    }

    // Get integration
    const integration = this.integrations.get(route.integrationId);
    if (!integration) {
      return { success: false, error: 'Integration not found' };
    }

    // Transform data if transform function provided
    const data = route.transform
      ? route.transform(request.body)
      : request.body;

    try {
      // Send to integration
      await integration.receive('webhook', data);

      // Send to cell if specified
      if (route.cellId) {
        this.emit('cell:data', {
          cellId: route.cellId,
          source: route.integrationId,
          data,
          timestamp: Date.now(),
        });
      }

      return { success: true, data: { received: true } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ========================================================================
  // Signature Verification
  // ========================================================================

  /**
   * Verify webhook signature
   */
  private async verifySignature(
    payload: string,
    signature: string,
    secret?: string
  ): Promise<boolean> {
    if (!secret) {
      // If no secret configured, skip verification
      return true;
    }

    try {
      // Extract hash algorithm and signature
      const [algorithm, hash] = signature.split('=');

      if (!algorithm || !hash) {
        return false;
      }

      // Create HMAC
      const hmac = crypto.createHmac(algorithm, secret);
      hmac.update(payload);
      const digest = hmac.digest('hex');

      // Compare signatures using timing-safe comparison
      const signatureBuffer = Buffer.from(signature);
      const digestBuffer = Buffer.from(`${algorithm}=${digest}`);

      return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
    } catch (error) {
      return false;
    }
  }

  // ========================================================================
  // Replay Prevention
  // ========================================================================

  /**
   * Check if webhook ID has already been processed
   */
  private isProcessed(webhookId: string): boolean {
    return this.processedIds.has(webhookId);
  }

  /**
   * Mark webhook ID as processed
   */
  private markProcessed(webhookId: string): void {
    this.processedIds.add(webhookId);
    this.processedIdExpiry.set(
      webhookId,
      Date.now() + (this.config.replayWindow || 300000)
    );
  }

  /**
   * Clean up expired webhook IDs
   */
  private cleanupProcessedIds(): void {
    const now = Date.now();

    for (const [id, expiry] of this.processedIdExpiry.entries()) {
      if (now > expiry) {
        this.processedIds.delete(id);
        this.processedIdExpiry.delete(id);
      }
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupProcessedIds();
    }, 60000); // Every minute
  }

  /**
   * Stop cleanup interval
   */
  private stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Generate webhook ID from payload and headers
   */
  private generateWebhookId(
    payload: any,
    headers: IncomingMessage['headers']
  ): string {
    const id = headers['x-request-id'] ||
              headers['x-github-delivery'] ||
              headers['x-event-id'] as string;

    if (id) {
      return id;
    }

    // Generate ID from payload hash
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');

    return `${Date.now()}_${hash.substring(0, 16)}`;
  }

  /**
   * Read request body
   */
  private readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';

      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();

        // Check payload size
        if (body.length > (this.config.maxPayloadSize || 0)) {
          req.destroy();
          reject(new Error('Payload too large'));
        }
      });

      req.on('end', () => {
        resolve(body);
      });

      req.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * Normalize HTTP headers
   */
  private normalizeHeaders(
    headers: IncomingMessage['headers']
  ): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers || {})) {
      if (value) {
        normalized[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
      }
    }

    return normalized;
  }

  /**
   * Set CORS headers
   */
  private setCORSHeaders(res: ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hub-Signature, X-Hub-Signature-256');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  /**
   * Send success response
   */
  private sendSuccess(res: ServerResponse, data?: any): void {
    res.writeHead(200, {
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify({ success: true, data }));
  }

  /**
   * Send error response
   */
  private sendError(
    res: ServerResponse,
    statusCode: number,
    message: string
  ): void {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
    });
    res.end(
      JSON.stringify({
        success: false,
        error: message,
        timestamp: Date.now(),
      })
    );
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Check if receiver is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
    };
  }

  /**
   * Get server URL
   */
  getServerUrl(): string {
    return `http://${this.config.host}:${this.config.port}${this.config.path}`;
  }
}
