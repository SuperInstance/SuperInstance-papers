/**
 * API Middleware for POLLN WebSocket Server
 * Authentication, rate limiting, and validation
 */

import type {
  APIToken,
  AuthenticatedClient,
  RateLimitTracker,
  RateLimitConfig,
  ClientMessage,
  APIError,
  ErrorCode,
  Permission,
} from './types.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Authentication Middleware
// ============================================================================

export class AuthenticationMiddleware {
  private tokens: Map<string, APIToken> = new Map();
  private clients: Map<string, AuthenticatedClient> = new Map();
  private defaultRateLimit: RateLimitConfig = {
    requestsPerMinute: 100,
    burstLimit: 10,
    windowMs: 60000,
  };

  /**
   * Generate a new API token
   */
  generateToken(
    gardenerId: string,
    permissions: Permission[],
    expiresIn: number = 24 * 60 * 60 * 1000 // 24 hours default
  ): string {
    const token = uuidv4();
    const now = Date.now();

    const apiToken: APIToken = {
      token,
      gardenerId,
      permissions,
      createdAt: now,
      expiresAt: now + expiresIn,
      rateLimit: this.defaultRateLimit,
    };

    this.tokens.set(token, apiToken);
    return token;
  }

  /**
   * Revoke a token
   */
  revokeToken(token: string): boolean {
    // Also remove any authenticated clients using this token
    const apiToken = this.tokens.get(token);
    if (apiToken) {
      // Collect client IDs to delete first
      const clientsToDelete: string[] = [];
      for (const [clientId, client] of this.clients) {
        if (client.token === token) {
          clientsToDelete.push(clientId);
        }
      }
      // Delete the clients
      for (const clientId of clientsToDelete) {
        this.clients.delete(clientId);
      }
    }
    return this.tokens.delete(token);
  }

  /**
   * Validate a token
   */
  validateToken(token: string): APIToken | null {
    const apiToken = this.tokens.get(token);
    if (!apiToken) {
      return null;
    }

    // Check expiration
    if (Date.now() > apiToken.expiresAt) {
      this.tokens.delete(token);
      return null;
    }

    return apiToken;
  }

  /**
   * Authenticate a client connection
   */
  authenticate(clientId: string, token: string): AuthenticatedClient | null {
    const apiToken = this.validateToken(token);
    if (!apiToken) {
      return null;
    }

    const client: AuthenticatedClient = {
      id: clientId,
      gardenerId: apiToken.gardenerId,
      permissions: apiToken.permissions,
      token,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.clients.set(clientId, client);
    return client;
  }

  /**
   * Deauthenticate a client
   */
  deauthenticate(clientId: string): boolean {
    return this.clients.delete(clientId);
  }

  /**
   * Get client by ID
   */
  getClient(clientId: string): AuthenticatedClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Update client activity
   */
  updateActivity(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastActivity = Date.now();
    }
  }

  /**
   * Check if client has permission
   */
  hasPermission(
    client: AuthenticatedClient,
    resource: string,
    action: string
  ): boolean {
    return client.permissions.some(
      (p) => p.resource === resource && p.actions.includes(action)
    );
  }

  /**
   * Get all authenticated clients
   */
  getAllClients(): AuthenticatedClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens(): number {
    let count = 0;
    const now = Date.now();

    for (const [token, apiToken] of this.tokens) {
      if (now > apiToken.expiresAt) {
        this.tokens.delete(token);
        count++;
      }
    }

    return count;
  }
}

// ============================================================================
// Rate Limiting Middleware
// ============================================================================

export class RateLimitMiddleware {
  private trackers: Map<string, RateLimitTracker> = new Map();
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      requestsPerMinute: config?.requestsPerMinute ?? 100,
      burstLimit: config?.burstLimit ?? 10,
      windowMs: config?.windowMs ?? 60000,
    };
  }

  /**
   * Check if a request is allowed
   */
  checkLimit(clientId: string): boolean {
    const tracker = this.getOrCreateTracker(clientId);
    const now = Date.now();

    // Reset window if expired
    if (now >= tracker.resetAt) {
      tracker.count = 0;
      tracker.resetAt = now + this.config.windowMs;
      tracker.burstTokens = this.config.burstLimit;
    }

    // Check burst limit first
    if (tracker.burstTokens > 0) {
      tracker.burstTokens--;
      tracker.count++;
      return true;
    }

    // Check rate limit
    if (tracker.count < this.config.requestsPerMinute) {
      tracker.count++;
      return true;
    }

    return false;
  }

  /**
   * Get remaining requests for a client
   */
  getRemainingRequests(clientId: string): number {
    const tracker = this.trackers.get(clientId);
    if (!tracker) {
      return this.config.requestsPerMinute;
    }

    const now = Date.now();
    if (now >= tracker.resetAt) {
      return this.config.requestsPerMinute;
    }

    return Math.max(0, this.config.requestsPerMinute - tracker.count);
  }

  /**
   * Get time until reset
   */
  getResetTime(clientId: number): number {
    const tracker = this.trackers.get(clientId.toString());
    if (!tracker) {
      return 0;
    }

    const now = Date.now();
    return Math.max(0, tracker.resetAt - now);
  }

  /**
   * Get or create a tracker for a client
   */
  private getOrCreateTracker(clientId: string): RateLimitTracker {
    let tracker = this.trackers.get(clientId);

    if (!tracker) {
      tracker = {
        count: 0,
        resetAt: Date.now() + this.config.windowMs,
        burstTokens: this.config.burstLimit,
      };
      this.trackers.set(clientId, tracker);
    }

    return tracker;
  }

  /**
   * Clean up old trackers
   */
  cleanup(): number {
    let count = 0;
    const now = Date.now();
    const threshold = now + this.config.windowMs;

    for (const [clientId, tracker] of this.trackers) {
      if (now > tracker.resetAt + this.config.windowMs) {
        this.trackers.delete(clientId);
        count++;
      }
    }

    return count;
  }
}

// ============================================================================
// Validation Middleware
// ============================================================================

export class ValidationMiddleware {
  /**
   * Validate a client message
   */
  validateMessage(message: unknown): message is ClientMessage {
    if (!message || typeof message !== 'object') {
      return false;
    }

    const msg = message as Record<string, unknown>;

    // Check required fields
    if (typeof msg.id !== 'string' || !msg.id) {
      return false;
    }

    if (typeof msg.timestamp !== 'number' || msg.timestamp <= 0) {
      return false;
    }

    if (typeof msg.type !== 'string' || !msg.type) {
      return false;
    }

    // Validate timestamp is not too old (5 minutes max)
    const maxAge = 5 * 60 * 1000;
    if (Date.now() - msg.timestamp > maxAge) {
      return false;
    }

    return true;
  }

  /**
   * Validate subscription payload
   */
  validateSubscription(type: string, payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const p = payload as Record<string, unknown>;

    if (type === 'subscribe:colony' || type === 'unsubscribe:colony') {
      return typeof p.colonyId === 'string' && Array.isArray(p.events);
    }

    if (type === 'subscribe:agent' || type === 'unsubscribe:agent') {
      return typeof p.agentId === 'string' && Array.isArray(p.events);
    }

    if (type === 'subscribe:dreams' || type === 'unsubscribe:dreams') {
      return typeof p.colonyId === 'string';
    }

    return false;
  }

  /**
   * Validate command payload
   */
  validateCommand(type: string, payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const p = payload as Record<string, unknown>;

    if (type === 'command:spawn') {
      return typeof p.typeId === 'string';
    }

    if (type === 'command:despawn') {
      return typeof p.agentId === 'string';
    }

    if (type === 'command:activate' || type === 'command:deactivate') {
      return typeof p.agentId === 'string';
    }

    if (type === 'command:dream') {
      return true; // Optional parameters
    }

    return false;
  }

  /**
   * Validate query payload
   */
  validateQuery(type: string, payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const p = payload as Record<string, unknown>;

    if (type === 'query:stats') {
      return true; // All optional
    }

    if (type === 'query:agents') {
      return typeof p.colonyId === 'string';
    }

    if (type === 'query:agent') {
      return typeof p.agentId === 'string';
    }

    if (type === 'query:config') {
      return true; // All optional
    }

    return false;
  }
}

// ============================================================================
// Error Factory
// ============================================================================

export class APIErrorFactory {
  static create(code: ErrorCode, message?: string, details?: Record<string, unknown>): APIError {
    const messages: Record<ErrorCode, string> = {
      UNAUTHORIZED: 'Authentication required',
      FORBIDDEN: 'Insufficient permissions',
      NOT_FOUND: 'Resource not found',
      INVALID_PAYLOAD: 'Invalid request payload',
      RATE_LIMITED: 'Rate limit exceeded',
      INTERNAL_ERROR: 'Internal server error',
      AGENT_NOT_FOUND: 'Agent not found',
      COLONY_NOT_FOUND: 'Colony not found',
      COMMAND_FAILED: 'Command execution failed',
    };

    return {
      code,
      message: message ?? messages[code],
      details,
    };
  }

  static unauthorized(message?: string): APIError {
    return this.create('UNAUTHORIZED', message);
  }

  static forbidden(message?: string): APIError {
    return this.create('FORBIDDEN', message);
  }

  static notFound(resource: string): APIError {
    return this.create('NOT_FOUND', `${resource} not found`);
  }

  static invalidPayload(details?: Record<string, unknown>): APIError {
    return this.create('INVALID_PAYLOAD', undefined, details);
  }

  static rateLimited(): APIError {
    return this.create('RATE_LIMITED');
  }

  static internalError(message?: string): APIError {
    return this.create('INTERNAL_ERROR', message);
  }
}
