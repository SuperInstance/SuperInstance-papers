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
import { sign, verify, Algorithm } from 'jsonwebtoken';

// ============================================================================
// JWT Authentication Types
// ============================================================================

export interface JWTConfig {
  secret: string;
  algorithm: Algorithm;
  accessTokenExpiry: number; // seconds
  refreshTokenExpiry: number; // seconds
  issuer: string;
  audience: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// ============================================================================
// Authentication Middleware (JWT-based)
// ============================================================================

export class AuthenticationMiddleware {
  private tokens: Map<string, APIToken> = new Map();
  private clients: Map<string, AuthenticatedClient> = new Map();
  private refreshTokens: Map<string, { gardenerId: string; expiresAt: number }> = new Map();
  private jwtConfig: JWTConfig;
  private defaultRateLimit: RateLimitConfig = {
    requestsPerMinute: 100,
    burstLimit: 10,
    windowMs: 60000,
  };

  constructor(jwtConfig?: Partial<JWTConfig>) {
    this.jwtConfig = {
      secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
      algorithm: 'HS256',
      accessTokenExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY || '3600', 10),
      refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY || '604800', 10),
      issuer: process.env.JWT_ISSUER || 'polln-api',
      audience: process.env.JWT_AUDIENCE || 'polln-clients',
      ...jwtConfig,
    };
  }

  /**
   * Generate JWT token pair for a gardener
   */
  generateTokenPair(
    gardenerId: string,
    permissions: Permission[],
    additionalClaims?: Record<string, unknown>
  ): TokenPair {
    const now = Math.floor(Date.now() / 1000);

    // Access token with permissions
    const accessToken = sign(
      {
        sub: gardenerId,
        permissions,
        type: 'access',
        iat: now,
        jti: uuidv4(),
        ...additionalClaims,
      },
      this.jwtConfig.secret,
      {
        algorithm: this.jwtConfig.algorithm,
        expiresIn: this.jwtConfig.accessTokenExpiry,
        issuer: this.jwtConfig.issuer,
        audience: this.jwtConfig.audience,
      }
    );

    // Refresh token (minimal claims)
    const refreshTokenId = uuidv4();
    const refreshToken = sign(
      {
        sub: gardenerId,
        type: 'refresh',
        jti: refreshTokenId,
        iat: now,
      },
      this.jwtConfig.secret,
      {
        algorithm: this.jwtConfig.algorithm,
        expiresIn: this.jwtConfig.refreshTokenExpiry,
        issuer: this.jwtConfig.issuer,
        audience: this.jwtConfig.audience,
      }
    );

    // Store refresh token
    this.refreshTokens.set(refreshTokenId, {
      gardenerId,
      expiresAt: now + this.jwtConfig.refreshTokenExpiry,
    });

    return {
      accessToken,
      refreshToken,
      expiresAt: now + this.jwtConfig.accessTokenExpiry,
    };
  }

  /**
   * Validate access token
   */
  validateAccessToken(token: string): { gardenerId: string; permissions: Permission[] } | null {
    try {
      const decoded = verify(token, this.jwtConfig.secret, {
        algorithms: [this.jwtConfig.algorithm],
        issuer: this.jwtConfig.issuer,
        audience: this.jwtConfig.audience,
      }) as {
        sub: string;
        permissions: Permission[];
        type: string;
      };

      if (decoded.type !== 'access') {
        return null;
      }

      return {
        gardenerId: decoded.sub,
        permissions: decoded.permissions,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): TokenPair | null {
    try {
      const decoded = verify(refreshToken, this.jwtConfig.secret, {
        algorithms: [this.jwtConfig.algorithm],
        issuer: this.jwtConfig.issuer,
        audience: this.jwtConfig.audience,
      }) as {
        sub: string;
        type: string;
        jti: string;
      };

      if (decoded.type !== 'refresh') {
        return null;
      }

      // Check if refresh token is still valid
      const storedToken = this.refreshTokens.get(decoded.jti);
      if (!storedToken || storedToken.gardenerId !== decoded.sub) {
        return null;
      }

      // Get user permissions (in production, fetch from database)
      // For now, use default permissions
      const permissions: Permission[] = [
        { resource: 'colony', actions: ['read', 'write'] },
        { resource: 'agent', actions: ['read', 'write'] },
        { resource: 'dream', actions: ['read', 'write'] },
        { resource: 'stats', actions: ['read'] },
      ];

      // Generate new token pair
      this.refreshTokens.delete(decoded.jti); // Invalidate old refresh token
      return this.generateTokenPair(decoded.sub, permissions);
    } catch (error) {
      return null;
    }
  }

  /**
   * Revoke refresh token
   */
  revokeRefreshToken(refreshToken: string): boolean {
    try {
      const decoded = verify(refreshToken, this.jwtConfig.secret, {
        algorithms: [this.jwtConfig.algorithm],
        issuer: this.jwtConfig.issuer,
        audience: this.jwtConfig.audience,
      }) as { jti: string };

      return this.refreshTokens.delete(decoded.jti);
    } catch {
      return false;
    }
  }

  /**
   * Cleanup expired refresh tokens
   */
  cleanupExpiredTokens(): number {
    let count = 0;
    const now = Math.floor(Date.now() / 1000);

    const refreshEntries = Array.from(this.refreshTokens.entries());
    for (const [tokenId, token] of refreshEntries) {
      if (token.expiresAt < now) {
        this.refreshTokens.delete(tokenId);
        count++;
      }
    }

    // Also cleanup old API tokens
    const tokenEntries = Array.from(this.tokens.entries());
    for (const [token, apiToken] of tokenEntries) {
      if (Date.now() > apiToken.expiresAt) {
        this.tokens.delete(token);
        count++;
      }
    }

    return count;
  }

  /**
   * Generate a new API token (legacy, for backwards compatibility)
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
      const clientEntries = Array.from(this.clients.entries());
      for (const [clientId, client] of clientEntries) {
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
   * Validate a token (legacy, for backwards compatibility)
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
    // Try JWT validation first
    const jwtValidated = this.validateAccessToken(token);
    if (jwtValidated) {
      const client: AuthenticatedClient = {
        id: clientId,
        gardenerId: jwtValidated.gardenerId,
        permissions: jwtValidated.permissions,
        token,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
      };

      this.clients.set(clientId, client);
      return client;
    }

    // Fall back to legacy token validation
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
}

// ============================================================================
// Per-Colony Rate Limiting
// ============================================================================

export interface ColonyRateLimitConfig {
  colonyRequestsPerMinute: number;
  colonyBurstLimit: number;
  userRequestsPerMinute: number;
  userBurstLimit: number;
  resourceLimits: Map<string, { readPerMinute: number; writePerMinute: number }>;
  windowMs: number;
}

export interface ColonyRateLimitTracker {
  colonyId: string;
  colonyTracker: RateLimitTracker;
  userTrackers: Map<string, RateLimitTracker>;
  resourceTrackers: Map<string, RateLimitTracker>;
}

export class ColonyAwareRateLimitMiddleware {
  private config: ColonyRateLimitConfig;
  private colonyTrackers: Map<string, ColonyRateLimitTracker> = new Map();

  constructor(config?: Partial<ColonyRateLimitConfig>) {
    this.config = {
      colonyRequestsPerMinute: 1000,
      colonyBurstLimit: 100,
      userRequestsPerMinute: 100,
      userBurstLimit: 10,
      resourceLimits: new Map([
        ['colony', { readPerMinute: 200, writePerMinute: 50 }],
        ['agent', { readPerMinute: 500, writePerMinute: 100 }],
        ['dream', { readPerMinute: 100, writePerMinute: 10 }],
        ['stats', { readPerMinute: 300, writePerMinute: 0 }],
      ]),
      windowMs: 60000,
      ...config,
    };
  }

  /**
   * Check if a request is allowed
   */
  checkLimit(
    colonyId: string,
    userId: string,
    resource: string,
    action: 'read' | 'write'
  ): {
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  } {
    // Get or create colony tracker
    const colonyTracker = this.getOrCreateColonyTracker(colonyId);
    const now = Date.now();

    // Check colony-level limit
    if (!this.checkTracker(colonyTracker.colonyTracker, now, this.config.colonyRequestsPerMinute)) {
      return {
        allowed: false,
        reason: 'Colony rate limit exceeded',
        retryAfter: colonyTracker.colonyTracker.resetAt - now,
      };
    }

    // Check user-level limit
    const userTracker = this.getOrCreateUserTracker(colonyTracker, userId);
    if (!this.checkTracker(userTracker, now, this.config.userRequestsPerMinute)) {
      return {
        allowed: false,
        reason: 'User rate limit exceeded',
        retryAfter: userTracker.resetAt - now,
      };
    }

    // Check resource-level limit
    const resourceLimit = this.config.resourceLimits.get(resource);
    if (resourceLimit) {
      const resourceTracker = this.getOrCreateResourceTracker(
        colonyTracker,
        resource
      );
      const limit = action === 'read'
        ? resourceLimit.readPerMinute
        : resourceLimit.writePerMinute;

      if (limit === 0) {
        return {
          allowed: false,
          reason: `Resource ${resource} does not allow ${action} operations`,
        };
      }

      if (!this.checkTrackerWithLimit(resourceTracker, now, limit)) {
        return {
          allowed: false,
          reason: `Resource ${resource} rate limit exceeded`,
          retryAfter: resourceTracker.resetAt - now,
        };
      }
    }

    // Increment counters
    this.incrementTracker(colonyTracker.colonyTracker);
    this.incrementTracker(userTracker);

    const resourceTracker = colonyTracker.resourceTrackers.get(resource);
    if (resourceTracker) {
      this.incrementTracker(resourceTracker);
    }

    return { allowed: true };
  }

  /**
   * Get remaining requests for a user in a colony
   */
  getRemainingRequests(colonyId: string, userId: string): {
    colony: number;
    user: number;
  } {
    const colonyTracker = this.colonyTrackers.get(colonyId);
    if (!colonyTracker) {
      return {
        colony: this.config.colonyRequestsPerMinute,
        user: this.config.userRequestsPerMinute,
      };
    }

    const userTracker = colonyTracker.userTrackers.get(userId);

    return {
      colony: Math.max(
        0,
        this.config.colonyRequestsPerMinute - colonyTracker.colonyTracker.count
      ),
      user: userTracker
        ? Math.max(0, this.config.userRequestsPerMinute - userTracker.count)
        : this.config.userRequestsPerMinute,
    };
  }

  /**
   * Reset limits for a colony
   */
  resetColonyLimits(colonyId: string): void {
    this.colonyTrackers.delete(colonyId);
  }

  /**
   * Reset limits for a user
   */
  resetUserLimits(colonyId: string, userId: string): void {
    const colonyTracker = this.colonyTrackers.get(colonyId);
    if (colonyTracker) {
      colonyTracker.userTrackers.delete(userId);
    }
  }

  /**
   * Cleanup old trackers
   */
  cleanup(): number {
    let count = 0;
    const now = Date.now();

    const colonyEntries = Array.from(this.colonyTrackers.entries());
    for (const [colonyId, colonyTracker] of colonyEntries) {
      // Clean up user trackers
      const userEntries = Array.from(colonyTracker.userTrackers.entries());
      for (const [userId, userTracker] of userEntries) {
        if (now > userTracker.resetAt + this.config.windowMs) {
          colonyTracker.userTrackers.delete(userId);
          count++;
        }
      }

      // Clean up resource trackers
      const resourceEntries = Array.from(colonyTracker.resourceTrackers.entries());
      for (const [resource, resourceTracker] of resourceEntries) {
        if (now > resourceTracker.resetAt + this.config.windowMs) {
          colonyTracker.resourceTrackers.delete(resource);
          count++;
        }
      }

      // Remove colony if no users or resources
      if (
        colonyTracker.userTrackers.size === 0 &&
        colonyTracker.resourceTrackers.size === 0
      ) {
        this.colonyTrackers.delete(colonyId);
        count++;
      }
    }

    return count;
  }

  private getOrCreateColonyTracker(colonyId: string): ColonyRateLimitTracker {
    let tracker = this.colonyTrackers.get(colonyId);

    if (!tracker) {
      tracker = {
        colonyId,
        colonyTracker: this.createTracker(),
        userTrackers: new Map(),
        resourceTrackers: new Map(),
      };
      this.colonyTrackers.set(colonyId, tracker);
    }

    return tracker;
  }

  private getOrCreateUserTracker(
    colonyTracker: ColonyRateLimitTracker,
    userId: string
  ): RateLimitTracker {
    let tracker = colonyTracker.userTrackers.get(userId);

    if (!tracker) {
      tracker = this.createTracker();
      colonyTracker.userTrackers.set(userId, tracker);
    }

    return tracker;
  }

  private getOrCreateResourceTracker(
    colonyTracker: ColonyRateLimitTracker,
    resource: string
  ): RateLimitTracker {
    let tracker = colonyTracker.resourceTrackers.get(resource);

    if (!tracker) {
      tracker = this.createTracker();
      colonyTracker.resourceTrackers.set(resource, tracker);
    }

    return tracker;
  }

  private createTracker(): RateLimitTracker {
    return {
      count: 0,
      resetAt: Date.now() + this.config.windowMs,
      burstTokens: this.config.userBurstLimit,
    };
  }

  private checkTracker(tracker: RateLimitTracker, now: number, limit: number): boolean {
    // Reset window if expired
    if (now >= tracker.resetAt) {
      tracker.count = 0;
      tracker.resetAt = now + this.config.windowMs;
      tracker.burstTokens = this.config.userBurstLimit;
      return true;
    }

    // Check burst limit first
    if (tracker.burstTokens > 0) {
      return true;
    }

    // Check rate limit
    return tracker.count < limit;
  }

  private checkTrackerWithLimit(
    tracker: RateLimitTracker,
    now: number,
    limit: number
  ): boolean {
    // Reset window if expired
    if (now >= tracker.resetAt) {
      tracker.count = 0;
      tracker.resetAt = now + this.config.windowMs;
      return true;
    }

    return tracker.count < limit;
  }

  private incrementTracker(tracker: RateLimitTracker): void {
    if (tracker.burstTokens > 0) {
      tracker.burstTokens--;
    }
    tracker.count++;
  }
}

// ============================================================================
// Rate Limiting Middleware (Legacy)
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

    const trackerEntries = Array.from(this.trackers.entries());
    for (const [clientId, tracker] of trackerEntries) {
      // Clean up trackers that haven't been used for more than a window
      // (i.e., their reset time has passed by more than the window duration)
      if (now > tracker.resetAt + this.config.windowMs) {
        this.trackers.delete(clientId);
        count++;
      }
    }

    return count;
  }
}

// ============================================================================
// Validation Middleware (Enhanced)
// ============================================================================

export interface ValidationConfig {
  maxMessageAge: number; // milliseconds
  maxPayloadSize: number; // bytes
  maxStringLength: number;
  allowedMimeTypes: string[];
  sanitizeStrings: boolean;
  validateJson: boolean;
}

export class ValidationMiddleware {
  private config: ValidationConfig;

  constructor(config?: Partial<ValidationConfig>) {
    this.config = {
      maxMessageAge: parseInt(process.env.VALIDATION_MAX_MESSAGE_AGE || '300000', 10),
      maxPayloadSize: parseInt(process.env.VALIDATION_MAX_PAYLOAD_SIZE || '10485760', 10),
      maxStringLength: parseInt(process.env.VALIDATION_MAX_STRING_LENGTH || '10000', 10),
      allowedMimeTypes: ['application/json', 'text/plain'],
      sanitizeStrings: true,
      validateJson: true,
      ...config,
    };
  }

  /**
   * Validate a client message
   */
  validateMessage(message: unknown): message is ClientMessage {
    if (!message || typeof message !== 'object') {
      return false;
    }

    const msg = message as Record<string, unknown>;

    // Check required fields
    if (typeof msg.id !== 'string' || !msg.id || msg.id.length > 100) {
      return false;
    }

    // Validate ID format (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(msg.id)) {
      return false;
    }

    if (typeof msg.timestamp !== 'number' || msg.timestamp <= 0) {
      return false;
    }

    // Validate timestamp is not too old
    const maxAge = this.config.maxMessageAge;
    if (Date.now() - msg.timestamp > maxAge) {
      return false;
    }

    // Validate timestamp is not in the future (with 1 minute tolerance)
    if (msg.timestamp > Date.now() + 60000) {
      return false;
    }

    if (typeof msg.type !== 'string' || !msg.type) {
      return false;
    }

    // Validate message type
    const validTypes = [
      'subscribe:colony', 'unsubscribe:colony',
      'subscribe:agent', 'unsubscribe:agent',
      'subscribe:dreams', 'unsubscribe:dreams',
      'subscribe:stats', 'unsubscribe:stats',
      'command:spawn', 'command:despawn',
      'command:activate', 'command:deactivate',
      'command:dream',
      'query:stats', 'query:agents', 'query:agent', 'query:config',
      'ping',
    ];

    if (!validTypes.includes(msg.type)) {
      return false;
    }

    // Validate payload size
    try {
      const payloadSize = JSON.stringify(msg.payload).length;
      if (payloadSize > this.config.maxPayloadSize) {
        return false;
      }
    } catch {
      return false;
    }

    // Sanitize payload
    if (this.config.sanitizeStrings) {
      try {
        (msg as Record<string, unknown>).payload = this.sanitizePayload(msg.payload);
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * Sanitize payload recursively
   */
  private sanitizePayload(payload: unknown): unknown {
    if (payload === null || payload === undefined) {
      return payload;
    }

    if (typeof payload === 'string') {
      return this.sanitizeString(payload);
    }

    if (typeof payload === 'number' || typeof payload === 'boolean') {
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.map(item => this.sanitizePayload(item));
    }

    if (typeof payload === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(payload)) {
        // Validate key
        if (!this.isValidKey(key)) {
          throw new Error(`Invalid key: ${key}`);
        }
        sanitized[key] = this.sanitizePayload(value);
      }
      return sanitized;
    }

    return payload;
  }

  /**
   * Sanitize a string value
   */
  private sanitizeString(str: string): string {
    // Check length
    if (str.length > this.config.maxStringLength) {
      throw new Error(`String exceeds maximum length of ${this.config.maxStringLength}`);
    }

    // Remove null bytes
    let sanitized = str.replace(/\0/g, '');

    // Remove control characters (except newline, tab, carriage return)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi, // Script tags
      /<iframe[^>]*>.*?<\/iframe>/gi, // Iframes
      /javascript:/gi, // JavaScript protocol
      /on\w+\s*=/gi, // Event handlers
      /<\?php/gi, // PHP tags
      /<%/g, // ASP tags
      /\$\{.*?\}/g, // Template literals
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        throw new Error('Potentially dangerous content detected');
      }
    }

    return sanitized;
  }

  /**
   * Validate object key
   */
  private isValidKey(key: string): boolean {
    // Check length
    if (key.length > 100) {
      return false;
    }

    // Check for dangerous keys (like __proto__)
    if (['__proto__', 'constructor', 'prototype'].includes(key)) {
      return false;
    }

    // Check for valid characters
    return /^[a-zA-Z0-9_:.-]+$/.test(key);
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
      return (
        typeof p.colonyId === 'string' &&
        p.colonyId.length > 0 &&
        p.colonyId.length <= 100 &&
        Array.isArray(p.events) &&
        p.events.every((e: unknown) => typeof e === 'string')
      );
    }

    if (type === 'subscribe:agent' || type === 'unsubscribe:agent') {
      return (
        typeof p.agentId === 'string' &&
        p.agentId.length > 0 &&
        p.agentId.length <= 100 &&
        Array.isArray(p.events) &&
        p.events.every((e: unknown) => typeof e === 'string')
      );
    }

    if (type === 'subscribe:dreams' || type === 'unsubscribe:dreams') {
      return (
        typeof p.colonyId === 'string' &&
        p.colonyId.length > 0 &&
        p.colonyId.length <= 100
      );
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
      return (
        typeof p.typeId === 'string' &&
        p.typeId.length > 0 &&
        p.typeId.length <= 100 &&
        (p.config === undefined || typeof p.config === 'object')
      );
    }

    if (type === 'command:despawn') {
      return (
        typeof p.agentId === 'string' &&
        p.agentId.length > 0 &&
        p.agentId.length <= 100
      );
    }

    if (type === 'command:activate' || type === 'command:deactivate') {
      return (
        typeof p.agentId === 'string' &&
        p.agentId.length > 0 &&
        p.agentId.length <= 100
      );
    }

    if (type === 'command:dream') {
      // Optional parameters
      if (p.colonyId !== undefined && typeof p.colonyId !== 'string') {
        return false;
      }
      if (p.agentId !== undefined && typeof p.agentId !== 'string') {
        return false;
      }
      if (p.episodeCount !== undefined && typeof p.episodeCount !== 'number') {
        return false;
      }
      return true;
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
      // All optional
      if (p.colonyId !== undefined && typeof p.colonyId !== 'string') {
        return false;
      }
      if (p.includeAgents !== undefined && typeof p.includeAgents !== 'boolean') {
        return false;
      }
      return true;
    }

    if (type === 'query:agents') {
      if (typeof p.colonyId !== 'string' || p.colonyId.length === 0) {
        return false;
      }
      if (p.filter !== undefined && typeof p.filter !== 'object') {
        return false;
      }
      return true;
    }

    if (type === 'query:agent') {
      if (typeof p.agentId !== 'string' || p.agentId.length === 0) {
        return false;
      }
      return true;
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
