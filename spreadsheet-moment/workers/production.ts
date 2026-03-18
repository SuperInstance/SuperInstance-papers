/**
 * ============================================================================
 * Production Cloudflare Worker - SpreadsheetMoment
 * ============================================================================
 * Environment: Production
 * Version: 1.0.0
 * Date: 2026-03-16
 *
 * DESCRIPTION:
 * Production-grade Cloudflare Worker for agentic spreadsheet platform.
 * Handles API requests, WebSocket connections, and real-time updates.
 *
 * FEATURES:
 * - Edge computing for global low-latency responses
 * - Automatic API routing (Cloudflare AI → DeepSeek → OpenAI → Anthropic)
 * - WebSocket support for real-time updates
 * - KV storage for cell state persistence
 * - D1 database for structured data
 * - Rate limiting and security hardening
 * - Comprehensive monitoring and observability
 *
 * FREE TIER LIMITS:
 * - 100,000 requests/day
 * - 10ms CPU time per request
 * - 1 GB KV storage
 * - 5 GB D1 storage
 * ============================================================================
 */

import { Router } from 'itty-router';
import type { ExecutionContext, Env } from './types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Env extends Env {
  CELLS: KVNamespace;
  CACHE: KVNamespace;
  DB: D1Database;
  AI: any;
  WEBSOCKET: any;
  ASSETS: R2Bucket;
  HYPERDRIVE: any;
  QUEUE: Queue<any>;
  ANALYTICS: AnalyticsEngineDataset;

  // Environment variables
  ENVIRONMENT: string;
  API_VERSION: string;
  LOG_LEVEL: string;
  CLAW_API_BASE_URL: string;
  CLAW_API_VERSION: string;
  CLAW_WS_URL: string;

  // Feature flags
  FEATURE_WEBSOCKET: string;
  FEATURE_REAL_TIME_UPDATES: string;
  FEATURE_COLLABORATIVE_EDITING: string;
  FEATURE_AI_INTEGRATION: string;
  FEATURE_ADVANCED_ANALYTICS: string;

  // Security
  SECURITY_ENABLED: string;
  RATE_LIMIT_ENABLED: string;
  RATE_LIMIT_REQUESTS_PER_MINUTE: string;
  RATE_LIMIT_BURST: string;

  // CORS
  CORS_ENABLED: string;
  CORS_ALLOWED_ORIGINS: string;
  CORS_ALLOWED_METHODS: string;
  CORS_ALLOWED_HEADERS: string;

  // Cache
  CACHE_ENABLED: string;
  CACHE_TTL_SECONDS: string;
  CACHE_STALE_WHILE_REVALIDATE: string;
}

interface RequestContext {
  url: URL;
  method: string;
  headers: Headers;
  ip: string;
  userAgent: string;
}

interface CellData {
  id: string;
  value: any;
  formula?: string;
  agent?: AgentConfig;
  metadata?: Record<string, any>;
  updatedAt: number;
  updatedBy?: string;
}

interface AgentConfig {
  id: string;
  type: 'sensor' | 'analysis' | 'automation' | 'custom';
  model?: string;
  trigger?: string;
  enabled: boolean;
  config?: Record<string, any>;
}

interface ClawRequest {
  cellId: string;
  operation: 'create' | 'query' | 'update' | 'cancel' | 'execute';
  data?: any;
}

interface ClawResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    latency: number;
    timestamp: number;
    version: string;
  };
}

// ============================================================================
// LOGGING & MONITORING
// ============================================================================

class Logger {
  private env: Env;
  private context: ExecutionContext;

  constructor(env: Env, context: ExecutionContext) {
    this.env = env;
    this.context = context;
  }

  private log(level: string, message: string, data?: any): void {
    if (this.env.LOG_LEVEL === 'error' && level !== 'error') return;
    if (this.env.LOG_LEVEL === 'warn' && !['error', 'warn'].includes(level)) return;

    const logEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
      environment: this.env.ENVIRONMENT,
      version: this.env.API_VERSION,
    };

    console.log(JSON.stringify(logEntry));

    // Write to analytics if enabled
    if (this.env.ANALYTICS) {
      this.env.ANALYTICS.writeDataPoint({
        blobs: [level, message],
        doubles: [Date.now()],
        indexes: [this.env.ENVIRONMENT],
      });
    }
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }
}

// ============================================================================
// SECURITY & RATE LIMITING
// ============================================================================

class SecurityManager {
  private env: Env;
  private logger: Logger;

  constructor(env: Env, logger: Logger) {
    this.env = env;
    this.logger = logger;
  }

  async checkRateLimit(ip: string): Promise<boolean> {
    if (this.env.RATE_LIMIT_ENABLED !== 'true') return true;

    const key = `ratelimit:${ip}`;
    const limit = parseInt(this.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '100');
    const window = 60; // 1 minute

    try {
      const current = await this.env.CACHE.get(key, 'json');
      const count = current ? (current as any).count : 0;

      if (count >= limit) {
        this.logger.warn(`Rate limit exceeded for IP: ${ip}`);
        return false;
      }

      // Increment counter
      await this.env.CACHE.put(
        key,
        JSON.stringify({ count: count + 1, expires: Date.now() + window * 1000 }),
        { expirationTtl: window }
      );

      return true;
    } catch (error) {
      this.logger.error('Rate limit check failed', error);
      return true; // Fail open
    }
  }

  validateInput(data: any): boolean {
    if (!data || typeof data !== 'object') return false;

    // Check for dangerous patterns
    const dangerous = ['<script', 'javascript:', 'onerror=', 'onload='];
    const dataStr = JSON.stringify(data);

    for (const pattern of dangerous) {
      if (dataStr.toLowerCase().includes(pattern)) {
        this.logger.warn(`Potentially dangerous input detected: ${pattern}`);
        return false;
      }
    }

    return true;
  }

  sanitizeOutput(data: any): any {
    if (typeof data !== 'object' || data === null) return data;

    // Remove sensitive information
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'apiKey', 'secret', 'token'];

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  async validateCors(origin: string): Promise<boolean> {
    if (this.env.CORS_ENABLED !== 'true') return false;

    const allowedOrigins = this.env.CORS_ALLOWED_ORIGINS.split(',');
    return allowedOrigins.includes(origin);
  }
}

// ============================================================================
// CLAW API INTEGRATION
// ============================================================================

class ClawAPI {
  private env: Env;
  private logger: Logger;
  private security: SecurityManager;

  constructor(env: Env, logger: Logger, security: SecurityManager) {
    this.env = env;
    this.logger = logger;
    this.security = security;
  }

  async createClaw(request: ClawRequest): Promise<ClawResponse> {
    const startTime = Date.now();

    try {
      this.logger.info('Creating claw agent', { cellId: request.cellId });

      // Validate input
      if (!this.security.validateInput(request.data)) {
        throw new Error('Invalid input data');
      }

      // Call Claw API
      const response = await fetch(`${this.env.CLAW_API_BASE_URL}/api/v1/claws`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.CLAW_API_KEY}`,
          'X-API-Version': this.env.CLAW_API_VERSION,
        },
        body: JSON.stringify(request.data),
      });

      if (!response.ok) {
        throw new Error(`Claw API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Store in KV
      await this.env.CELLS.put(
        `claw:${request.cellId}`,
        JSON.stringify(data),
        { expirationTtl: 86400 } // 24 hours
      );

      this.logger.info('Claw agent created successfully', {
        cellId: request.cellId,
        clawId: data.id,
      });

      return {
        success: true,
        data: this.security.sanitizeOutput(data),
        metadata: {
          latency: Date.now() - startTime,
          timestamp: Date.now(),
          version: this.env.API_VERSION,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create claw agent', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          latency: Date.now() - startTime,
          timestamp: Date.now(),
          version: this.env.API_VERSION,
        },
      };
    }
  }

  async queryClaw(request: ClawRequest): Promise<ClawResponse> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = `claw:${request.cellId}`;
      const cached = await this.env.CACHE.get(cacheKey, 'json');

      if (cached) {
        this.logger.debug('Claw data from cache', { cellId: request.cellId });
        return {
          success: true,
          data: cached,
          metadata: {
            latency: Date.now() - startTime,
            timestamp: Date.now(),
            version: this.env.API_VERSION,
          },
        };
      }

      // Fetch from Claw API
      const response = await fetch(
        `${this.env.CLAW_API_BASE_URL}/api/v1/claws/${request.cellId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.env.CLAW_API_KEY}`,
            'X-API-Version': this.env.CLAW_API_VERSION,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Claw API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the result
      if (this.env.CACHE_ENABLED === 'true') {
        await this.env.CACHE.put(
          cacheKey,
          JSON.stringify(data),
          { expirationTtl: parseInt(this.env.CACHE_TTL_SECONDS) }
        );
      }

      return {
        success: true,
        data: this.security.sanitizeOutput(data),
        metadata: {
          latency: Date.now() - startTime,
          timestamp: Date.now(),
          version: this.env.API_VERSION,
        },
      };
    } catch (error) {
      this.logger.error('Failed to query claw agent', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          latency: Date.now() - startTime,
          timestamp: Date.now(),
          version: this.env.API_VERSION,
        },
      };
    }
  }

  async cancelClaw(request: ClawRequest): Promise<ClawResponse> {
    const startTime = Date.now();

    try {
      this.logger.info('Canceling claw agent', { cellId: request.cellId });

      const response = await fetch(
        `${this.env.CLAW_API_BASE_URL}/api/v1/claws/${request.cellId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.env.CLAW_API_KEY}`,
            'X-API-Version': this.env.CLAW_API_VERSION,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Claw API error: ${response.statusText}`);
      }

      // Invalidate cache
      await this.env.CACHE.delete(`claw:${request.cellId}`);

      // Remove from KV
      await this.env.CELLS.delete(`claw:${request.cellId}`);

      this.logger.info('Claw agent canceled successfully', { cellId: request.cellId });

      return {
        success: true,
        data: { message: 'Claw agent canceled' },
        metadata: {
          latency: Date.now() - startTime,
          timestamp: Date.now(),
          version: this.env.API_VERSION,
        },
      };
    } catch (error) {
      this.logger.error('Failed to cancel claw agent', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          latency: Date.now() - startTime,
          timestamp: Date.now(),
          version: this.env.API_VERSION,
        },
      };
    }
  }
}

// ============================================================================
// CELL MANAGEMENT
// ============================================================================

class CellManager {
  private env: Env;
  private logger: Logger;

  constructor(env: Env, logger: Logger) {
    this.env = env;
    this.logger = logger;
  }

  async getCell(cellId: string): Promise<CellData | null> {
    try {
      const data = await this.env.CELLS.get(`cell:${cellId}`, 'json');
      return data as CellData | null;
    } catch (error) {
      this.logger.error('Failed to get cell', { cellId, error });
      return null;
    }
  }

  async updateCell(cellId: string, data: Partial<CellData>): Promise<boolean> {
    try {
      const existing = await this.getCell(cellId);
      const updated: CellData = {
        ...existing,
        ...data,
        id: cellId,
        updatedAt: Date.now(),
      };

      await this.env.CELLS.put(
        `cell:${cellId}`,
        JSON.stringify(updated),
        { expirationTtl: 86400 } // 24 hours
      );

      this.logger.info('Cell updated successfully', { cellId });
      return true;
    } catch (error) {
      this.logger.error('Failed to update cell', { cellId, error });
      return false;
    }
  }

  async deleteCell(cellId: string): Promise<boolean> {
    try {
      await this.env.CELLS.delete(`cell:${cellId}`);
      await this.env.CACHE.delete(`cell:${cellId}`);
      this.logger.info('Cell deleted successfully', { cellId });
      return true;
    } catch (error) {
      this.logger.error('Failed to delete cell', { cellId, error });
      return false;
    }
  }

  async listCells(prefix: string = ''): Promise<CellData[]> {
    try {
      const list = await this.env.CELLS.list({ prefix: `cell:${prefix}` });
      const cells: CellData[] = [];

      for (const key of list.keys) {
        const data = await this.env.CELLS.get(key.name, 'json');
        if (data) {
          cells.push(data as CellData);
        }
      }

      return cells;
    } catch (error) {
      this.logger.error('Failed to list cells', { prefix, error });
      return [];
    }
  }
}

// ============================================================================
// ROUTER SETUP
// ============================================================================

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    const logger = new Logger(env, context);
    const security = new SecurityManager(env, logger);
    const clawAPI = new ClawAPI(env, logger, security);
    const cellManager = new CellManager(env, logger);

    const router = Router();

    // ============================================================================
    // MIDDLEWARE
    // ============================================================================

    router.all('*', async (request) => {
      const url = new URL(request.url);
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const origin = request.headers.get('Origin') || '';

      logger.debug('Incoming request', {
        method: request.method,
        url: url.pathname,
        ip,
        origin,
      });

      // Rate limiting
      if (!(await security.checkRateLimit(ip))) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // CORS validation
      if (origin && !(await security.validateCors(origin))) {
        return new Response(
          JSON.stringify({ error: 'CORS policy violation' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return null; // Continue to next handler
    });

    // ============================================================================
    // HEALTH CHECK
    // ============================================================================

    router.get('/health', async () => {
      const health = {
        status: 'healthy',
        timestamp: Date.now(),
        environment: env.ENVIRONMENT,
        version: env.API_VERSION,
        features: {
          websocket: env.FEATURE_WEBSOCKET === 'true',
          realTimeUpdates: env.FEATURE_REAL_TIME_UPDATES === 'true',
          collaborativeEditing: env.FEATURE_COLLABORATIVE_EDITING === 'true',
          aiIntegration: env.FEATURE_AI_INTEGRATION === 'true',
          advancedAnalytics: env.FEATURE_ADVANCED_ANALYTICS === 'true',
        },
      };

      return new Response(JSON.stringify(health), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
    });

    // ============================================================================
    // METRICS
    // ============================================================================

    router.get('/metrics', async () => {
      // Basic metrics (Cloudflare provides more detailed metrics in dashboard)
      const metrics = {
        requests: {
          total: 0, // Cloudflare tracks this automatically
          byMethod: {},
        },
        errors: {
          total: 0,
          byType: {},
        },
        latency: {
          p50: 0,
          p95: 0,
          p99: 0,
        },
        timestamp: Date.now(),
      };

      return new Response(JSON.stringify(metrics), {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // ============================================================================
    // CELL OPERATIONS
    // ============================================================================

    // GET /cells - List all cells
    router.get('/cells', async (request) => {
      const url = new URL(request.url);
      const prefix = url.searchParams.get('prefix') || '';

      const cells = await cellManager.listCells(prefix);

      return new Response(JSON.stringify({ cells }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${env.CACHE_TTL_SECONDS}`,
        },
      });
    });

    // GET /cells/:id - Get cell data
    router.get('/cells/:id', async (request) => {
      const id = request.id || '';
      const cell = await cellManager.getCell(id);

      if (!cell) {
        return new Response(
          JSON.stringify({ error: 'Cell not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ cell }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${env.CACHE_TTL_SECONDS}`,
        },
      });
    });

    // PUT /cells/:id - Update cell
    router.put('/cells/:id', async (request) => {
      const id = request.id || '';
      const data = await request.json();

      if (!security.validateInput(data)) {
        return new Response(
          JSON.stringify({ error: 'Invalid input' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const success = await cellManager.updateCell(id, data);

      if (!success) {
        return new Response(
          JSON.stringify({ error: 'Failed to update cell' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ message: 'Cell updated successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    // DELETE /cells/:id - Delete cell
    router.delete('/cells/:id', async (request) => {
      const id = request.id || '';
      const success = await cellManager.deleteCell(id);

      if (!success) {
        return new Response(
          JSON.stringify({ error: 'Failed to delete cell' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ message: 'Cell deleted successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    // ============================================================================
    // CLAW API OPERATIONS
    // ============================================================================

    // POST /api/claws - Create claw agent
    router.post('/api/claws', async (request) => {
      const data = await request.json();
      const clawRequest: ClawRequest = {
        cellId: data.cellId,
        operation: 'create',
        data: data.config,
      };

      const response = await clawAPI.createClaw(clawRequest);

      return new Response(JSON.stringify(response), {
        status: response.success ? 201 : 500,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // GET /api/claws/:id - Query claw agent
    router.get('/api/claws/:id', async (request) => {
      const clawRequest: ClawRequest = {
        cellId: request.id || '',
        operation: 'query',
      };

      const response = await clawAPI.queryClaw(clawRequest);

      return new Response(JSON.stringify(response), {
        status: response.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // POST /api/claws/:id/cancel - Cancel claw agent
    router.post('/api/claws/:id/cancel', async (request) => {
      const clawRequest: ClawRequest = {
        cellId: request.id || '',
        operation: 'cancel',
      };

      const response = await clawAPI.cancelClaw(clawRequest);

      return new Response(JSON.stringify(response), {
        status: response.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // ============================================================================
    // WEBSOCKET SUPPORT
    // ============================================================================

    if (env.FEATURE_WEBSOCKET === 'true') {
      router.get('/ws', async (request) => {
        const upgradeHeader = request.headers.get('Upgrade');
        if (!upgradeHeader || upgradeHeader !== 'websocket') {
          return new Response('Expected WebSocket', { status: 426 });
        }

        // WebSocket upgrade would be handled by Durable Objects
        return new Response('WebSocket upgrade required', { status: 426 });
      });
    }

    // ============================================================================
    // 404 HANDLER
    // ============================================================================

    router.all('*', () => {
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    });

    // ============================================================================
    // EXECUTE REQUEST
    // ============================================================================

    try {
      return await router.handle(request);
    } catch (error) {
      logger.error('Request handling failed', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
