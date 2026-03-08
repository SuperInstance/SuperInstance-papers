# POLLN Security Implementation Guide

**Sprint 8: Security Hardening**
**Generated:** 2026-03-07
**Version:** 0.1.0

---

## Table of Contents

1. [Task 4.8.1: WebSocket API Security Audit](#task-481-websocket-api-security-audit)
2. [Task 4.8.2: Per-Colony Rate Limiting](#task-482-per-colony-rate-limiting)
3. [Task 4.8.3: Input Validation Enhancement](#task-483-input-validation-enhancement)
4. [Task 4.8.4: A2A Package Signing](#task-484-a2a-package-signing)
5. [Task 4.8.5: Federated Sync Encryption](#task-485-federated-sync-encryption)
6. [Task 4.8.6: Security Configuration](#task-486-security-configuration)
7. [Task 4.8.7: Audit Logging Enhancement](#task-487-audit-logging-enhancement)
8. [Task 4.8.8: Security Best Practices](#task-488-security-best-practices)

---

## Task 4.8.1: WebSocket API Security Audit

### Overview

Enhance the security of the WebSocket API server with JWT authentication, TLS enforcement, and origin validation.

### Implementation Specifications

#### 1. JWT-Based Authentication

**File:** `src/api/middleware.ts`

**Current Implementation:**
```typescript
export class AuthenticationMiddleware {
  private tokens: Map<string, APIToken> = new Map();

  generateToken(gardenerId: string, permissions: Permission[], expiresIn: number): string {
    const token = uuidv4(); // ⚠️ Insecure
    // ... store token
    return token;
  }
}
```

**New Implementation:**
```typescript
import { sign, verify, Algorithm } from 'jsonwebtoken';

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

export class AuthenticationMiddleware {
  private config: JWTConfig;
  private refreshTokens: Map<string, { gardenerId: string; expiresAt: number }> = new Map();

  constructor(config?: Partial<JWTConfig>) {
    this.config = {
      secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
      algorithm: 'HS256',
      accessTokenExpiry: 3600, // 1 hour
      refreshTokenExpiry: 604800, // 7 days
      issuer: process.env.JWT_ISSUER || 'polln-api',
      audience: process.env.JWT_AUDIENCE || 'polln-clients',
      ...config,
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
        ...additionalClaims,
      },
      this.config.secret,
      {
        algorithm: this.config.algorithm,
        expiresIn: this.config.accessTokenExpiry,
        issuer: this.config.issuer,
        audience: this.config.audience,
        issuedAt: now,
        jwtid: uuidv4(),
      }
    );

    // Refresh token (minimal claims)
    const refreshTokenId = uuidv4();
    const refreshToken = sign(
      {
        sub: gardenerId,
        type: 'refresh',
        jti: refreshTokenId,
      },
      this.config.secret,
      {
        algorithm: this.config.algorithm,
        expiresIn: this.config.refreshTokenExpiry,
        issuer: this.config.issuer,
        audience: this.config.audience,
        issuedAt: now,
      }
    );

    // Store refresh token
    this.refreshTokens.set(refreshTokenId, {
      gardenerId,
      expiresAt: now + this.config.refreshTokenExpiry,
    });

    return {
      accessToken,
      refreshToken,
      expiresAt: now + this.config.accessTokenExpiry,
    };
  }

  /**
   * Validate access token
   */
  validateAccessToken(token: string): { gardenerId: string; permissions: Permission[] } | null {
    try {
      const decoded = verify(token, this.config.secret, {
        algorithms: [this.config.algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience,
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
      const decoded = verify(refreshToken, this.config.secret, {
        algorithms: [this.config.algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience,
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
      const decoded = verify(refreshToken, this.config.secret, {
        algorithms: [this.config.algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience,
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

    for (const [tokenId, token] of this.refreshTokens) {
      if (token.expiresAt < now) {
        this.refreshTokens.delete(tokenId);
        count++;
      }
    }

    return count;
  }

  /**
   * Authenticate a client connection
   */
  authenticate(clientId: string, token: string): AuthenticatedClient | null {
    const validated = this.validateAccessToken(token);
    if (!validated) {
      return null;
    }

    const client: AuthenticatedClient = {
      id: clientId,
      gardenerId: validated.gardenerId,
      permissions: validated.permissions,
      token,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    };

    return client;
  }
}
```

#### 2. WebSocket Security Enhancements

**File:** `src/api/server.ts`

```typescript
import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';

export interface WebSocketSecurityConfig {
  enableTLS: boolean;
  allowedOrigins: string[];
  maxConnections: number;
  maxConnectionsPerIP: number;
  messageSizeLimit: number;
  enableCompression: boolean;
}

export class POLLNServer extends EventEmitter {
  private wsSecurityConfig: WebSocketSecurityConfig;
  private ipConnectionCounts: Map<string, number> = new Map();

  constructor(config: POLLNServerConfig) {
    super();
    this.config = config;

    // WebSocket security configuration
    this.wsSecurityConfig = {
      enableTLS: process.env.NODE_ENV === 'production',
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['localhost'],
      maxConnections: parseInt(process.env.MAX_WS_CONNECTIONS || '1000', 10),
      maxConnectionsPerIP: parseInt(process.env.MAX_WS_CONNECTIONS_PER_IP || '10', 10),
      messageSizeLimit: parseInt(process.env.WS_MESSAGE_SIZE_LIMIT || '10485760', 10), // 10MB
      enableCompression: process.env.WS_ENABLE_COMPRESSION !== 'false',
    };
  }

  async start(): Promise<void> {
    if (this.wsServer) {
      throw new Error('Server already started');
    }

    this.startedAt = Date.now();

    // Create HTTP server
    this.httpServer = createHttpServer();

    // Create WebSocket server with security
    this.wsServer = new WebSocketServer({
      server: this.httpServer,
      path: '/api/ws',
      maxPayload: this.wsSecurityConfig.messageSizeLimit,
      verifyClient: this.verifyClient.bind(this), // Add client verification
    });

    // Setup connection handling
    this.wsServer.on('connection', this.handleConnection.bind(this));

    // Start server
    return new Promise((resolve, reject) => {
      this.httpServer!.listen(this.config.port, this.config.host, () => {
        this.emit('started', {
          port: this.config.port,
          host: this.config.host || '0.0.0.0',
        });
        resolve();
      });

      this.httpServer!.on('error', reject);
    });
  }

  /**
   * Verify WebSocket client before connection
   */
  private verifyClient(
    info: { origin: string; secure: boolean; req: IncomingMessage },
    cb: (result: boolean, code?: number, reason?: string) => void
  ): void {
    // Validate origin
    const origin = info.origin;
    const allowedOrigin = this.wsSecurityConfig.allowedOrigins.some(allowed =>
      origin.includes(allowed)
    );

    if (!allowedOrigin) {
      this.stats.rateLimits.rejected++;
      cb(false, 403, 'Origin not allowed');
      return;
    }

    // Check TLS in production
    if (this.wsSecurityConfig.enableTLS && !info.secure) {
      this.stats.rateLimits.rejected++;
      cb(false, 403, 'TLS required');
      return;
    }

    // Check connection limit
    if (this.connections.size >= this.wsSecurityConfig.maxConnections) {
      this.stats.rateLimits.rejected++;
      cb(false, 503, 'Server connection limit reached');
      return;
    }

    // Check per-IP connection limit
    const ip = info.req.socket.remoteAddress;
    const ipCount = this.ipConnectionCounts.get(ip || '') || 0;

    if (ipCount >= this.wsSecurityConfig.maxConnectionsPerIP) {
      this.stats.rateLimits.rejected++;
      cb(false, 429, 'Too many connections from this IP');
      return;
    }

    cb(true);
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientId = this.generateClientId();
    const ip = req.socket.remoteAddress;

    // Update IP connection count
    if (ip) {
      this.ipConnectionCounts.set(ip, (this.ipConnectionCounts.get(ip) || 0) + 1);
    }

    // Track connection
    this.stats.connections.total++;
    this.stats.connections.active++;

    const connectionInfo: ConnectionInfo = {
      id: clientId,
      clientId,
      connectedAt: Date.now(),
      subscriptions: [],
      isAuthenticated: false,
      ip,
    };

    this.connections.set(clientId, connectionInfo);
    this.emit('connection:opened', { clientId, ip });

    // Setup WebSocket handlers
    ws.on('message', (data: Buffer) => this.handleMessage(clientId, ws, data));
    ws.on('close', () => this.handleDisconnection(clientId, ws, ip));
    ws.on('error', (error) => this.handleError(clientId, error));
    ws.on('pong', () => this.handlePong(clientId, ws));

    // Send welcome message if auth not required
    if (!this.config.auth?.enableAuth) {
      this.sendMessage(ws, {
        id: this.generateMessageId(),
        timestamp: Date.now(),
        type: 'event:colony',
        payload: {
          message: 'Connected to POLLN WebSocket API',
          serverTime: Date.now(),
        },
      });
    }
  }

  private handleDisconnection(clientId: string, ws: WebSocket, ip?: string): void {
    const connection = this.connections.get(clientId);
    if (!connection) {
      return;
    }

    // Deauthenticate if needed
    if (connection.isAuthenticated) {
      this.auth.deauthenticate(clientId);
      this.stats.connections.authenticated--;
    }

    // Update IP connection count
    if (ip) {
      const count = this.ipConnectionCounts.get(ip) || 0;
      if (count > 1) {
        this.ipConnectionCounts.set(ip, count - 1);
      } else {
        this.ipConnectionCounts.delete(ip);
      }
    }

    // Clean up
    this.connections.delete(clientId);
    this.subscriptions.delete(clientId);
    this.stats.connections.active--;

    this.emit('connection:closed', { clientId });
  }
}
```

### Testing Requirements

```typescript
// src/api/__tests__/jwt-auth.test.ts
import { AuthenticationMiddleware } from '../middleware.js';

describe('AuthenticationMiddleware - JWT', () => {
  let auth: AuthenticationMiddleware;

  beforeEach(() => {
    auth = new AuthenticationMiddleware({
      secret: 'test-secret',
      accessTokenExpiry: 3600,
      refreshTokenExpiry: 604800,
    });
  });

  describe('generateTokenPair', () => {
    it('should generate valid access and refresh tokens', () => {
      const permissions = [
        { resource: 'colony', actions: ['read', 'write'] },
      ];

      const tokens = auth.generateTokenPair('gardener-1', permissions);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresAt).toBeGreaterThan(Date.now() / 1000);
    });

    it('should include permissions in access token', () => {
      const permissions = [
        { resource: 'colony', actions: ['read', 'write'] },
        { resource: 'agent', actions: ['read'] },
      ];

      const tokens = auth.generateTokenPair('gardener-1', permissions);
      const validated = auth.validateAccessToken(tokens.accessToken);

      expect(validated).toBeDefined();
      expect(validated?.permissions).toEqual(permissions);
    });
  });

  describe('validateAccessToken', () => {
    it('should validate correct access token', () => {
      const tokens = auth.generateTokenPair('gardener-1', []);
      const validated = auth.validateAccessToken(tokens.accessToken);

      expect(validated).toBeDefined();
      expect(validated?.gardenerId).toBe('gardener-1');
    });

    it('should reject invalid token', () => {
      const validated = auth.validateAccessToken('invalid-token');
      expect(validated).toBeNull();
    });

    it('should reject refresh token used as access token', () => {
      const tokens = auth.generateTokenPair('gardener-1', []);
      const validated = auth.validateAccessToken(tokens.refreshToken);

      expect(validated).toBeNull();
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new tokens with valid refresh token', () => {
      const oldTokens = auth.generateTokenPair('gardener-1', []);
      const newTokens = auth.refreshAccessToken(oldTokens.refreshToken);

      expect(newTokens).toBeDefined();
      expect(newTokens?.accessToken).not.toBe(oldTokens.accessToken);
      expect(newTokens?.refreshToken).not.toBe(oldTokens.refreshToken);
    });

    it('should reject invalid refresh token', () => {
      const newTokens = auth.refreshAccessToken('invalid-token');
      expect(newTokens).toBeNull();
    });
  });
});
```

---

## Task 4.8.2: Per-Colony Rate Limiting

### Overview

Implement granular rate limiting that tracks usage per colony, per user, and per resource type.

### Implementation Specifications

**File:** `src/api/middleware.ts`

```typescript
export interface ColonyRateLimitConfig {
  // Colony-level limits
  colonyRequestsPerMinute: number;
  colonyBurstLimit: number;

  // User-level limits (within colony)
  userRequestsPerMinute: number;
  userBurstLimit: number;

  // Resource-specific limits
  resourceLimits: Map<string, {
    readPerMinute: number;
    writePerMinute: number;
  }>;

  // Window duration
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
        ['stats', { readPerMinute: 300, writePerMinute: 0 }], // read-only
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
    if (!this.checkTracker(colonyTracker.colonyTracker, now)) {
      return {
        allowed: false,
        reason: 'Colony rate limit exceeded',
        retryAfter: colonyTracker.colonyTracker.resetAt - now,
      };
    }

    // Check user-level limit
    const userTracker = this.getOrCreateUserTracker(colonyTracker, userId);
    if (!this.checkTracker(userTracker, now)) {
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

    for (const [colonyId, colonyTracker] of this.colonyTrackers) {
      // Clean up user trackers
      for (const [userId, userTracker] of colonyTracker.userTrackers) {
        if (now > userTracker.resetAt + this.config.windowMs) {
          colonyTracker.userTrackers.delete(userId);
          count++;
        }
      }

      // Clean up resource trackers
      for (const [resource, resourceTracker] of colonyTracker.resourceTrackers) {
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

  private checkTracker(tracker: RateLimitTracker, now: number): boolean {
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
    return tracker.count < this.config.userRequestsPerMinute;
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
```

### Integration with Message Handler

**File:** `src/api/handlers.ts`

```typescript
export class MessageHandler {
  private colonyRateLimit: ColonyAwareRateLimitMiddleware;

  constructor(config?: { colonyRateLimit?: Partial<ColonyRateLimitConfig> }) {
    this.colonyRateLimit = new ColonyAwareRateLimitMiddleware(
      config?.colonyRateLimit
    );
  }

  async handleMessage(message: ClientMessage, context: HandlerContext): Promise<ServerMessage | null> {
    // Extract colony ID, resource, and action from message
    const { colonyId, resource, action } = this.extractRequestInfo(message, context);

    if (colonyId && resource && action) {
      // Check rate limit
      const limitCheck = this.colonyRateLimit.checkLimit(
        colonyId,
        context.client.gardenerId,
        resource,
        action
      );

      if (!limitCheck.allowed) {
        return this.createErrorResponse(
          message.id,
          APIErrorFactory.rateLimited()
        );
      }
    }

    // ... existing message handling logic
  }

  private extractRequestInfo(
    message: ClientMessage,
    context: HandlerContext
  ): { colonyId?: string; resource: string; action: 'read' | 'write' } {
    // Extract colony ID
    let colonyId: string | undefined;
    const payload = message.payload as Record<string, unknown>;

    if ('colonyId' in payload && typeof payload.colonyId === 'string') {
      colonyId = payload.colonyId;
    } else if ('agentId' in payload && typeof payload.agentId === 'string') {
      // Find colony by agent ID
      for (const [cid, colony] of context.colonies) {
        if (colony.getAgent(payload.agentId as string)) {
          colonyId = cid;
          break;
        }
      }
    }

    // Determine resource and action
    const messageType = message.type;

    let resource = 'colony';
    let action: 'read' | 'write' = 'read';

    if (messageType.startsWith('query:')) {
      action = 'read';
      if (messageType === 'query:stats') resource = 'stats';
      else if (messageType === 'query:agents' || messageType === 'query:agent') resource = 'agent';
    } else if (messageType.startsWith('command:')) {
      action = 'write';
      if (messageType === 'command:spawn' || messageType === 'command:despawn') resource = 'agent';
      else if (messageType === 'command:dream') resource = 'dream';
    } else if (messageType.startsWith('subscribe:') || messageType.startsWith('unsubscribe:')) {
      action = 'read';
      if (messageType.includes('agent')) resource = 'agent';
      else if (messageType.includes('dreams')) resource = 'dream';
      else if (messageType.includes('stats')) resource = 'stats';
    }

    return { colonyId, resource, action };
  }
}
```

---

## Task 4.8.3: Input Validation Enhancement

### Overview

Comprehensive input validation and sanitization to prevent injection attacks.

### Implementation Specifications

**File:** `src/api/middleware.ts`

```typescript
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
      maxMessageAge: 5 * 60 * 1000, // 5 minutes
      maxPayloadSize: 10 * 1024 * 1024, // 10MB
      maxStringLength: 10000,
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
        msg.payload = this.sanitizePayload(msg.payload);
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
```

---

## Task 4.8.4: A2A Package Signing

### Overview

Implement cryptographic signing for A2A packages to ensure integrity and authenticity.

### Implementation Specifications

**File:** `src/core/communication.ts`

```typescript
import { createSign, createVerify, generateKeyPairSync, createHash } from 'crypto';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface SignedA2APackage<T = unknown> extends A2APackage<T> {
  signature: string;
  signerPublicKey: string;
  signatureAlgorithm: string;
}

export class A2APackageSystem extends EventEmitter {
  private config: A2APackageSystemConfig;
  private packages: Map<string, A2APackage> = new Map();
  private messageHistory: Map<string, A2APackage[]> = new Map();
  private causalChains: Map<string, string[]> = new Map();

  // Signing
  private agentKeys: Map<string, KeyPair> = new Map();
  private trustedPublicKeys: Map<string, string> = new Map();

  // Replay protection
  private seenPackageSignatures: Set<string> = new Set();
  private signatureCleanupInterval: NodeJS.Timeout;

  constructor(config?: Partial<A2APackageSystemConfig>) {
    super();
    this.config = {
      historySize: 100,
      defaultPrivacyLevel: PrivacyLevel.COLONY,
      defaultLayer: SubsumptionLayer.HABITUAL,
      ...config,
    };

    // Cleanup old signatures every hour
    this.signatureCleanupInterval = setInterval(() => {
      this.cleanupOldSignatures();
    }, 60 * 60 * 1000);
  }

  /**
   * Generate key pair for an agent
   */
  generateAgentKeyPair(agentId: string): KeyPair {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    const keyPair: KeyPair = { publicKey, privateKey };
    this.agentKeys.set(agentId, keyPair);

    this.emit('keypair_generated', { agentId, publicKey: publicKey.substring(0, 20) + '...' });

    return keyPair;
  }

  /**
   * Register a trusted public key
   */
  registerTrustedKey(agentId: string, publicKey: string): void {
    this.trustedPublicKeys.set(agentId, publicKey);
    this.emit('trusted_key_registered', { agentId });
  }

  /**
   * Revoke an agent's key pair
   */
  revokeAgentKeys(agentId: string): void {
    this.agentKeys.delete(agentId);
    this.trustedPublicKeys.delete(agentId);
    this.emit('keys_revoked', { agentId });
  }

  /**
   * Create a signed A2A package
   */
  async createSignedPackage<T>(
    senderId: string,
    receiverId: string,
    type: string,
    payload: T,
    options?: {
      privacyLevel?: PrivacyLevel;
      layer?: SubsumptionLayer;
      parentIds?: string[];
      dpMetadata?: PackageMetadata;
    }
  ): Promise<SignedA2APackage<T>> {
    // Get or generate sender keys
    let keyPair = this.agentKeys.get(senderId);
    if (!keyPair) {
      keyPair = this.generateAgentKeyPair(senderId);
    }

    const id = uuidv4();
    const timestamp = Date.now();
    const causalChainId = uuidv4();

    const pkg: A2APackage<T> = {
      id,
      timestamp,
      senderId,
      receiverId,
      type,
      payload,
      parentIds: options?.parentIds || [],
      causalChainId,
      privacyLevel: options?.privacyLevel || this.config.defaultPrivacyLevel,
      layer: options?.layer || this.config.defaultLayer,
      dpMetadata: options?.dpMetadata,
    };

    // Sign the package
    const signature = this.signPackage(pkg, keyPair.privateKey);

    const signedPkg: SignedA2APackage<T> = {
      ...pkg,
      signature,
      signerPublicKey: keyPair.publicKey,
      signatureAlgorithm: 'RSA-SHA256',
    };

    // Store package
    this.packages.set(id, signedPkg);

    // Add to sender history
    this.addToHistory(senderId, signedPkg as A2APackage);

    // Track causal chain
    this.updateCausalChain(signedPkg as A2APackage);

    // Record signature for replay protection
    this.seenPackageSignatures.add(signature);

    this.emit('package_created', signedPkg);

    return signedPkg;
  }

  /**
   * Sign a package
   */
  private signPackage<T>(pkg: A2APackage<T>, privateKey: string): string {
    // Create deterministic payload for signing
    const payloadToSign = this.createSigningPayload(pkg);

    const sign = createSign('SHA256');
    sign.update(payloadToSign);
    sign.end();

    return sign.sign(privateKey, 'hex');
  }

  /**
   * Create deterministic payload for signing
   */
  private createSigningPayload<T>(pkg: A2APackage<T>): string {
    // Use a canonical JSON representation
    const canonical = {
      id: pkg.id,
      timestamp: pkg.timestamp,
      senderId: pkg.senderId,
      receiverId: pkg.receiverId,
      type: pkg.type,
      payload: pkg.payload,
      parentIds: pkg.parentIds.sort(),
      causalChainId: pkg.causalChainId,
      privacyLevel: pkg.privacyLevel,
      layer: pkg.layer,
    };

    return JSON.stringify(canonical);
  }

  /**
   * Verify a signed package
   */
  verifyPackage<T>(signedPkg: SignedA2APackage<T>): {
    valid: boolean;
    reason?: string;
  } {
    // Check for replay attack
    if (this.seenPackageSignatures.has(signedPkg.signature)) {
      // Check if this is the original package (allow same signature from same package ID)
      const existing = this.packages.get(signedPkg.id);
      if (!existing || (existing as SignedA2APackage).signature !== signedPkg.signature) {
        return { valid: false, reason: 'Replay attack detected' };
      }
    }

    // Verify signature
    const payloadToSign = this.createSigningPayload(signedPkg);

    try {
      const verify = createVerify('SHA256');
      verify.update(payloadToSign);
      verify.end();

      const isValid = verify.verify(signedPkg.signerPublicKey, signedPkg.signature, 'hex');

      if (!isValid) {
        return { valid: false, reason: 'Invalid signature' };
      }

      // Verify sender matches public key
      const expectedPublicKey = this.trustedPublicKeys.get(signedPkg.senderId);
      if (expectedPublicKey && expectedPublicKey !== signedPkg.signerPublicKey) {
        return { valid: false, reason: 'Public key mismatch for sender' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: `Verification error: ${error}` };
    }
  }

  /**
   * Receive and verify a signed package
   */
  async receiveSignedPackage<T>(
    signedPkg: SignedA2APackage<T>
  ): Promise<{ success: boolean; package?: A2APackage<T>; error?: string }> {
    // Verify the package
    const verification = this.verifyPackage(signedPkg);

    if (!verification.valid) {
      this.emit('package_rejected', {
        packageId: signedPkg.id,
        reason: verification.reason,
      });

      return {
        success: false,
        error: verification.reason,
      };
    }

    // Store the verified package
    this.packages.set(signedPkg.id, signedPkg as A2APackage);
    this.addToHistory(signedPkg.receiverId, signedPkg as A2APackage);
    this.updateCausalChain(signedPkg as A2APackage);
    this.seenPackageSignatures.add(signedPkg.signature);

    this.emit('package_received', signedPkg);

    return {
      success: true,
      package: signedPkg as A2APackage<T>,
    };
  }

  /**
   * Cleanup old signatures
   */
  private cleanupOldSignatures(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    // Get packages older than max age
    const oldPackageIds: string[] = [];

    for (const [id, pkg] of this.packages) {
      if (now - pkg.timestamp > maxAge) {
        oldPackageIds.push(id);
      }
    }

    // Remove their signatures
    for (const id of oldPackageIds) {
      const pkg = this.packages.get(id) as SignedA2APackage;
      if (pkg && pkg.signature) {
        this.seenPackageSignatures.delete(pkg.signature);
      }
    }
  }

  /**
   * Get package hash
   */
  getPackageHash<T>(pkg: A2APackage<T>): string {
    const payload = this.createSigningPayload(pkg);
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Clear history and cleanup
   */
  clearHistory(): void {
    this.packages.clear();
    this.messageHistory.clear();
    this.causalChains.clear();
    this.seenPackageSignatures.clear();

    if (this.signatureCleanupInterval) {
      clearInterval(this.signatureCleanupInterval);
    }
  }
}
```

---

## Task 4.8.5: Federated Sync Encryption

### Overview

Add encryption for federated KV-cache synchronization to protect data in transit.

### Implementation Specifications

**File:** `src/core/kvfederated.ts`

```typescript
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

export interface EncryptionConfig {
  algorithm: string; // e.g., 'aes-256-gcm'
  keyDerivation: {
    algorithm: 'scrypt';
    saltLength: number;
    N: number; // CPU/memory cost parameter
    r: number; // Block size parameter
    p: number; // Parallelization parameter
    keyLength: number;
  };
}

export interface EncryptedAnchorSyncPackage {
  version: string;
  encryptedData: {
    ciphertext: string;
    iv: string;
    authTag: string;
  };
  metadata: {
    sourceColonyId: string;
    roundNumber: number;
    timestamp: number;
    anchorsCount: number;
    compressionRatio: number;
    encryptionAlgorithm: string;
  };
  signature: string;
}

export class FederatedKVSync extends EventEmitter {
  private config: FederatedKVSyncConfig;
  private anchorPool: KVAnchorPool;
  private privacyBudgets: Map<string, AnchorPrivacyBudget> = new Map();
  private aggregatedAnchors: Map<string, AggregatedAnchor> = new Map();
  private syncHistory: AnchorSyncPackage[] = [];
  private currentRound: number = 0;

  // Encryption
  private encryptionConfig: EncryptionConfig;
  private colonyKeys: Map<string, Buffer> = new Map();

  constructor(
    anchorPool: KVAnchorPool,
    config?: Partial<FederatedKVSyncConfig>
  ) {
    super();

    this.anchorPool = anchorPool;
    this.config = {
      defaultPrivacyTier: 'MEADOW',
      enableDifferentialPrivacy: true,
      noiseDistribution: 'gaussian',
      privacyBudgets: {
        LOCAL: { epsilon: Infinity, delta: 1.0 },
        COLONY: { epsilon: 2.0, delta: 1e-4 },
        MEADOW: { epsilon: 1.0, delta: 1e-5 },
        RESEARCH: { epsilon: 0.5, delta: 1e-6 },
        PUBLIC: { epsilon: 0.3, delta: 1e-7 },
      },
      minQualityForSharing: 0.7,
      maxAnchorsPerSync: 50,
      minCrossColonyReuse: 2,
      aggregationMethod: 'quality-weighted',
      minParticipatingColonies: 2,
      qualityWeightExponent: 2,
      syncInterval: 60000,
      maxSyncRounds: 100,
      ...config,
    };

    // Initialize encryption config
    this.encryptionConfig = {
      algorithm: 'aes-256-gcm',
      keyDerivation: {
        algorithm: 'scrypt',
        saltLength: 32,
        N: 16384,
        r: 8,
        p: 1,
        keyLength: 32,
      },
    };

    // Initialize master key from environment
    const masterKeyHex = process.env.FEDERATED_ENCRYPTION_KEY;
    if (masterKeyHex) {
      this.masterKey = Buffer.from(masterKeyHex, 'hex');
    } else {
      // Generate a random master key (WARNING: This should be persisted securely in production)
      this.masterKey = randomBytes(32);
      console.warn('Generated random encryption key. Set FEDERATED_ENCRYPTION_KEY environment variable for persistence.');
    }
  }

  private masterKey: Buffer;

  /**
   * Set encryption key for a colony
   */
  setColonyKey(colonyId: string, key: Buffer): void {
    this.colonyKeys.set(colonyId, key);
    this.emit('colony_key_set', { colonyId });
  }

  /**
   * Derive encryption key for a colony
   */
  private deriveColonyKey(colonyId: string): Buffer {
    // Check if we already have a key for this colony
    const existingKey = this.colonyKeys.get(colonyId);
    if (existingKey) {
      return existingKey;
    }

    // Derive a key from the master key and colony ID
    const salt = createHash('sha256')
      .update(colonyId)
      .digest();

    const key = scryptSync(
      this.masterKey,
      salt,
      this.encryptionConfig.keyDerivation.keyLength,
      {
        N: this.encryptionConfig.keyDerivation.N,
        r: this.encryptionConfig.keyDerivation.r,
        p: this.encryptionConfig.keyDerivation.p,
      }
    );

    this.colonyKeys.set(colonyId, key);
    return key;
  }

  /**
   * Encrypt anchor sync package
   */
  async encryptSyncPackage(
    syncPackage: AnchorSyncPackage
  ): Promise<EncryptedAnchorSyncPackage> {
    const colonyId = syncPackage.sourceColonyId;
    const key = this.deriveColonyKey(colonyId);

    // Serialize the package
    const plaintext = JSON.stringify(syncPackage);

    // Generate random IV
    const iv = randomBytes(16);

    // Create cipher
    const cipher = createCipheriv(this.encryptionConfig.algorithm, key, iv);

    // Encrypt the data
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Create encrypted package
    const encryptedPackage: EncryptedAnchorSyncPackage = {
      version: '1.0',
      encryptedData: {
        ciphertext,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      },
      metadata: {
        sourceColonyId: syncPackage.sourceColonyId,
        roundNumber: syncPackage.roundNumber,
        timestamp: syncPackage.timestamp,
        anchorsCount: syncPackage.anchors.length,
        compressionRatio: syncPackage.metadata.compressionRatio,
        encryptionAlgorithm: this.encryptionConfig.algorithm,
      },
      signature: '', // Will be added below
    };

    // Sign the encrypted package
    encryptedPackage.signature = this.signEncryptedPackage(encryptedPackage, colonyId);

    return encryptedPackage;
  }

  /**
   * Decrypt anchor sync package
   */
  async decryptSyncPackage(
    encryptedPackage: EncryptedAnchorSyncPackage,
    sourceColonyId: string
  ): Promise<AnchorSyncPackage> {
    // Verify signature first
    if (!this.verifyEncryptedPackage(encryptedPackage, sourceColonyId)) {
      throw new Error('Invalid signature for encrypted package');
    }

    // Derive the key
    const key = this.deriveColonyKey(sourceColonyId);

    // Create decipher
    const iv = Buffer.from(encryptedPackage.encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedPackage.encryptedData.authTag, 'hex');

    const decipher = createDecipheriv(this.encryptionConfig.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let plaintext;
    try {
      plaintext = decipher.update(encryptedPackage.encryptedData.ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }

    // Parse the package
    const syncPackage: AnchorSyncPackage = JSON.parse(plaintext);
    return syncPackage;
  }

  /**
   * Sign encrypted package
   */
  private signEncryptedPackage(
    encryptedPackage: EncryptedAnchorSyncPackage,
    colonyId: string
  ): string {
    const sign = createSign('SHA256');

    // Create signing payload
    const signingPayload = JSON.stringify({
      version: encryptedPackage.version,
      ciphertext: encryptedPackage.encryptedData.ciphertext,
      iv: encryptedPackage.encryptedData.iv,
      metadata: encryptedPackage.metadata,
    });

    sign.update(signingPayload);

    // Use colony key for signing (in production, use separate signing key)
    const key = this.deriveColonyKey(colonyId);
    sign.end();

    return sign.sign(key, 'hex');
  }

  /**
   * Verify encrypted package signature
   */
  private verifyEncryptedPackage(
    encryptedPackage: EncryptedAnchorSyncPackage,
    colonyId: string
  ): boolean {
    const verify = createVerify('SHA256');

    // Create verification payload
    const verificationPayload = JSON.stringify({
      version: encryptedPackage.version,
      ciphertext: encryptedPackage.encryptedData.ciphertext,
      iv: encryptedPackage.encryptedData.iv,
      metadata: encryptedPackage.metadata,
    });

    verify.update(verificationPayload);
    verify.end();

    // Use colony key for verification
    const key = this.deriveColonyKey(colonyId);

    return verify.verify(key, encryptedPackage.signature, 'hex');
  }

  /**
   * Prepare encrypted anchors for sharing
   */
  async prepareEncryptedAnchorsForSharing(
    colonyId: string,
    privacyTier?: PrivacyTier
  ): Promise<EncryptedAnchorSyncPackage> {
    // Prepare the sync package
    const syncPackage = await this.prepareAnchorsForSharing(colonyId, privacyTier);

    // Encrypt it
    return this.encryptSyncPackage(syncPackage);
  }

  /**
   * Receive and decrypt anchors from colony
   */
  async receiveEncryptedAnchorsFromColony(
    encryptedPackage: EncryptedAnchorSyncPackage
  ): Promise<number> {
    // Decrypt the package
    const syncPackage = await this.decryptSyncPackage(
      encryptedPackage,
      encryptedPackage.metadata.sourceColonyId
    );

    // Process the decrypted package
    return this.receiveAnchorsFromColony(syncPackage);
  }

  /**
   * Rotate encryption key for a colony
   */
  async rotateColonyKey(colonyId: string): Promise<void> {
    // Generate new key
    const newKey = randomBytes(32);
    this.colonyKeys.set(colonyId, newKey);

    this.emit('colony_key_rotated', { colonyId });
  }
}
```

---

## Task 4.8.6: Security Configuration

### Overview

Centralized security configuration with environment-based overrides and validation.

### Implementation Specifications

**File:** `src/core/safety.ts`

```typescript
export interface SecurityConfig {
  // Authentication
  auth: {
    enableJWT: boolean;
    jwtSecret?: string;
    jwtAlgorithm: string;
    accessTokenExpiry: number;
    refreshTokenExpiry: number;
  };

  // Rate limiting
  rateLimit: {
    enablePerColony: boolean;
    colonyRequestsPerMinute: number;
    userRequestsPerMinute: number;
    burstLimit: number;
    windowMs: number;
  };

  // Encryption
  encryption: {
    enableFederatedEncryption: boolean;
    encryptionKey?: string;
    algorithm: string;
    keyRotationInterval: number;
  };

  // Validation
  validation: {
    maxMessageAge: number;
    maxPayloadSize: number;
    maxStringLength: number;
    sanitizeStrings: boolean;
  };

  // WebSocket
  websocket: {
    enableTLS: boolean;
    allowedOrigins: string[];
    maxConnections: number;
    maxConnectionsPerIP: number;
  };

  // Audit logging
  audit: {
    enableImmutableLogs: boolean;
    logRetentionDays: number;
    sensitiveOperations: string[];
  };

  // Privacy
  privacy: {
    enforcePrivacyLevels: boolean;
    defaultPrivacyTier: PrivacyTier;
    enableDifferentialPrivacy: boolean;
  };

  // Federation
  federation: {
    requireColonyAuth: boolean;
    enableOutlierDetection: boolean;
    maxAnchorsPerSync: number;
  };
}

export class SecurityConfigManager {
  private config: SecurityConfig;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || process.env.SECURITY_CONFIG_PATH || '.polln-security.json';
    this.config = this.loadConfig();
    this.validateConfig();
  }

  /**
   * Load configuration from file and environment
   */
  private loadConfig(): SecurityConfig {
    let fileConfig: Partial<SecurityConfig> = {};

    // Load from file if it exists
    if (fs.existsSync(this.configPath)) {
      try {
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        fileConfig = JSON.parse(fileContent);
      } catch (error) {
        console.warn(`Failed to load security config from ${this.configPath}:`, error);
      }
    }

    // Merge with environment variables
    const envConfig: Partial<SecurityConfig> = {
      auth: {
        enableJWT: process.env.JWT_ENABLED === 'true',
        jwtSecret: process.env.JWT_SECRET,
        jwtAlgorithm: process.env.JWT_ALGORITHM || 'HS256',
        accessTokenExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY || '3600', 10),
        refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY || '604800', 10),
      },
      encryption: {
        enableFederatedEncryption: process.env.FEDERATED_ENCRYPTION_ENABLED !== 'false',
        encryptionKey: process.env.FEDERATED_ENCRYPTION_KEY,
        algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
        keyRotationInterval: parseInt(process.env.KEY_ROTATION_INTERVAL || '2592000', 10), // 30 days
      },
      websocket: {
        enableTLS: process.env.NODE_ENV === 'production',
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['localhost'],
        maxConnections: parseInt(process.env.MAX_WS_CONNECTIONS || '1000', 10),
        maxConnectionsPerIP: parseInt(process.env.MAX_WS_CONNECTIONS_PER_IP || '10', 10),
      },
    };

    // Default configuration
    const defaultConfig: SecurityConfig = {
      auth: {
        enableJWT: true,
        jwtAlgorithm: 'HS256',
        accessTokenExpiry: 3600,
        refreshTokenExpiry: 604800,
      },
      rateLimit: {
        enablePerColony: true,
        colonyRequestsPerMinute: 1000,
        userRequestsPerMinute: 100,
        burstLimit: 10,
        windowMs: 60000,
      },
      encryption: {
        enableFederatedEncryption: true,
        algorithm: 'aes-256-gcm',
        keyRotationInterval: 2592000,
      },
      validation: {
        maxMessageAge: 5 * 60 * 1000,
        maxPayloadSize: 10 * 1024 * 1024,
        maxStringLength: 10000,
        sanitizeStrings: true,
      },
      websocket: {
        enableTLS: false,
        allowedOrigins: ['localhost'],
        maxConnections: 1000,
        maxConnectionsPerIP: 10,
      },
      audit: {
        enableImmutableLogs: true,
        logRetentionDays: 30,
        sensitiveOperations: [
          'agent:spawn',
          'agent:despawn',
          'colony:create',
          'colony:delete',
          'auth:token:generate',
          'auth:token:revoke',
          'federation:sync',
        ],
      },
      privacy: {
        enforcePrivacyLevels: true,
        defaultPrivacyTier: PrivacyLevel.COLONY,
        enableDifferentialPrivacy: true,
      },
      federation: {
        requireColonyAuth: true,
        enableOutlierDetection: true,
        maxAnchorsPerSync: 50,
      },
    };

    // Merge all configurations (env > file > defaults)
    return this.deepMerge(defaultConfig, this.deepMerge(fileConfig, envConfig));
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    const errors: string[] = [];

    // Validate JWT configuration
    if (this.config.auth.enableJWT && !this.config.auth.jwtSecret) {
      errors.push('JWT_SECRET must be set when JWT authentication is enabled');
    }

    // Validate encryption key
    if (this.config.encryption.enableFederatedEncryption && !this.config.encryption.encryptionKey) {
      errors.push('FEDERATED_ENCRYPTION_KEY must be set when federated encryption is enabled');
    }

    // Validate rate limits
    if (this.config.rateLimit.colonyRequestsPerMinute < this.config.rateLimit.userRequestsPerMinute) {
      errors.push('Colony rate limit must be greater than or equal to user rate limit');
    }

    if (errors.length > 0) {
      throw new Error(`Security configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Get specific section of configuration
   */
  getSection<K extends keyof SecurityConfig>(section: K): SecurityConfig[K] {
    return { ...this.config[section] };
  }

  /**
   * Update configuration section
   */
  updateSection<K extends keyof SecurityConfig>(
    section: K,
    updates: Partial<SecurityConfig[K]>
  ): void {
    this.config[section] = { ...this.config[section], ...updates };
    this.validateConfig();
    this.saveConfig();
  }

  /**
   * Save configuration to file
   */
  private saveConfig(): void {
    try {
      const configToSave = { ...this.config };

      // Remove sensitive values from saved config
      delete (configToSave.auth as any).jwtSecret;
      delete (configToSave.encryption as any).encryptionKey;

      fs.writeFileSync(
        this.configPath,
        JSON.stringify(configToSave, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save security configuration:', error);
    }
  }

  /**
   * Deep merge objects
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const output = { ...target };

    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        output[key] = this.deepMerge(
          (target as any)[key],
          (source as any)[key]
        );
      } else {
        (output as any)[key] = (source as any)[key];
      }
    }

    return output;
  }
}
```

---

## Task 4.8.7: Audit Logging Enhancement

### Overview

Enhance audit logging with cryptographic signing and structured logging.

### Implementation Specifications

**File:** `src/core/safety.ts`

```typescript
import { createHash, createSign, createVerify } from 'crypto';

export interface AuditLogConfig {
  enableImmutableLogs: boolean;
  logSigningKey?: string;
  logRetentionDays: number;
  sensitiveOperations: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  operation: string;
  userId?: string;
  agentId?: string;
  colonyId?: string;
  details: Record<string, unknown>;
  severity: SafetySeverity;
  result: 'success' | 'failure' | 'partial';
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface ImmutableAuditEntry {
  entry: AuditEntry;
  previousHash: string;
  hash: string;
  signature: string;
}

export class EnhancedAuditLogger {
  private config: AuditLogConfig;
  private auditLog: ImmutableAuditEntry[] = [];
  private logSigningKeyPair?: { publicKey: string; privateKey: string };
  private logFilePath: string;

  constructor(config?: Partial<AuditLogConfig>) {
    this.config = {
      enableImmutableLogs: true,
      logRetentionDays: 30,
      sensitiveOperations: [],
      logLevel: 'info',
      ...config,
    };

    this.logFilePath = process.env.AUDIT_LOG_PATH || '.polln/audit.log';

    // Generate signing keys if enabled
    if (this.config.enableImmutableLogs) {
      const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });
      this.logSigningKeyPair = {
        publicKey: publicKey.export({ type: 'spki', format: 'pem' }) as string,
        privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
      };
    }

    // Load existing logs
    this.loadLogs();

    // Start cleanup interval
    setInterval(() => this.cleanupOldLogs(), 60 * 60 * 1000); // Every hour
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
    // Check log level
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[entry.level] < levels[this.config.logLevel]) {
      return;
    }

    const auditEntry: AuditEntry = {
      ...entry,
      id: uuidv4(),
      timestamp: Date.now(),
    };

    // Create immutable entry if enabled
    if (this.config.enableImmutableLogs && this.logSigningKeyPair) {
      const immutableEntry = this.createImmutableEntry(auditEntry);
      this.auditLog.push(immutableEntry);

      // Write to file
      await this.appendToFile(immutableEntry);
    } else {
      // Simple log entry
      this.auditLog.push({
        entry: auditEntry,
        previousHash: '',
        hash: '',
        signature: '',
      } as ImmutableAuditEntry);

      await this.appendToFile({ entry: auditEntry });
    }

    // Emit event
    this.emit('audit_logged', auditEntry);
  }

  /**
   * Create an immutable audit entry
   */
  private createImmutableEntry(entry: AuditEntry): ImmutableAuditEntry {
    const previousHash = this.auditLog.length > 0
      ? this.auditLog[this.auditLog.length - 1].hash
      : '';

    // Create hash
    const entryData = JSON.stringify(entry) + previousHash;
    const hash = createHash('sha256').update(entryData).digest('hex');

    // Sign the hash
    const sign = createSign('SHA256');
    sign.update(hash);
    sign.end();
    const signature = sign.sign(this.logSigningKeyPair!.privateKey, 'hex');

    return {
      entry,
      previousHash,
      hash,
      signature,
    };
  }

  /**
   * Verify audit log integrity
   */
  verifyLogIntegrity(): {
    valid: boolean;
    issues: Array<{ index: number; issue: string }>;
  } {
    const issues: Array<{ index: number; issue: string }> = [];

    for (let i = 0; i < this.auditLog.length; i++) {
      const entry = this.auditLog[i];

      // Verify hash chain
      const entryData = JSON.stringify(entry.entry) + entry.previousHash;
      const expectedHash = createHash('sha256').update(entryData).digest('hex');
      if (entry.hash !== expectedHash) {
        issues.push({ index: i, issue: 'Hash mismatch' });
      }

      // Verify signature
      const verify = createVerify('SHA256');
      verify.update(entry.hash);
      verify.end();
      const signatureValid = verify.verify(
        this.logSigningKeyPair!.publicKey,
        entry.signature,
        'hex'
      );
      if (!signatureValid) {
        issues.push({ index: i, issue: 'Invalid signature' });
      }

      // Verify chain
      if (i > 0 && entry.previousHash !== this.auditLog[i - 1].hash) {
        issues.push({ index: i, issue: 'Chain break detected' });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Query audit logs
   */
  query(filters: {
    userId?: string;
    agentId?: string;
    colonyId?: string;
    operation?: string;
    category?: string;
    startTime?: number;
    endTime?: number;
    level?: AuditEntry['level'];
    limit?: number;
  }): AuditEntry[] {
    let results = this.auditLog.map(e => e.entry);

    // Apply filters
    if (filters.userId) {
      results = results.filter(e => e.userId === filters.userId);
    }
    if (filters.agentId) {
      results = results.filter(e => e.agentId === filters.agentId);
    }
    if (filters.colonyId) {
      results = results.filter(e => e.colonyId === filters.colonyId);
    }
    if (filters.operation) {
      results = results.filter(e => e.operation === filters.operation);
    }
    if (filters.category) {
      results = results.filter(e => e.category === filters.category);
    }
    if (filters.startTime) {
      results = results.filter(e => e.timestamp >= filters.startTime!);
    }
    if (filters.endTime) {
      results = results.filter(e => e.timestamp <= filters.endTime!);
    }
    if (filters.level) {
      results = results.filter(e => e.level === filters.level);
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Get audit statistics
   */
  getStatistics(): {
    totalEntries: number;
    entriesByLevel: Record<string, number>;
    entriesByCategory: Record<string, number>;
    entriesByOperation: Record<string, number>;
    timeRange: { earliest: number; latest: number };
  } {
    const entries = this.auditLog.map(e => e.entry);

    return {
      totalEntries: entries.length,
      entriesByLevel: entries.reduce((acc, e) => {
        acc[e.level] = (acc[e.level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      entriesByCategory: entries.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      entriesByOperation: entries.reduce((acc, e) => {
        acc[e.operation] = (acc[e.operation] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      timeRange: {
        earliest: Math.min(...entries.map(e => e.timestamp)),
        latest: Math.max(...entries.map(e => e.timestamp)),
      },
    };
  }

  /**
   * Export audit logs
   */
  async export(format: 'json' | 'csv' = 'json'): Promise<string> {
    const entries = this.auditLog.map(e => e.entry);

    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    } else if (format === 'csv') {
      const headers = Object.keys(entries[0]).join(',');
      const rows = entries.map(e =>
        Object.values(e).map(v =>
          typeof v === 'object' ? JSON.stringify(v) : v
        ).join(',')
      );
      return [headers, ...rows].join('\n');
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Load logs from file
   */
  private loadLogs(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const data = fs.readFileSync(this.logFilePath, 'utf8');
        const lines = data.trim().split('\n');

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            this.auditLog.push(entry);
          } catch {
            // Skip invalid lines
          }
        }
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  }

  /**
   * Append log entry to file
   */
  private async appendToFile(entry: ImmutableAuditEntry | { entry: AuditEntry }): Promise<void> {
    try {
      const line = JSON.stringify(entry) + '\n';
      await fs.promises.appendFile(this.logFilePath, line);
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Cleanup old logs
   */
  private cleanupOldLogs(): void {
    const cutoffTime = Date.now() - this.config.logRetentionDays * 24 * 60 * 60 * 1000;

    const originalLength = this.auditLog.length;
    this.auditLog = this.auditLog.filter(e => e.entry.timestamp > cutoffTime);

    const removed = originalLength - this.auditLog.length;
    if (removed > 0) {
      console.log(`Cleaned up ${removed} old audit log entries`);
    }
  }
}
```

---

## Task 4.8.8: Security Best Practices

### Overview

Document security best practices for developers and operators.

### Best Practices Guide

**File:** `docs/SECURITY_BEST_PRACTICES.md`

```markdown
# POLLN Security Best Practices

This guide outlines security best practices for developers and operators working with POLLN.

## For Developers

### 1. Authentication & Authorization

**DO:**
- Always use JWT-based authentication for API access
- Implement principle of least privilege for permissions
- Validate tokens on every request
- Use short-lived access tokens (1 hour or less)
- Implement refresh token rotation

**DON'T:**
- Hardcode credentials in source code
- Share JWT secrets across environments
- Use UUID tokens without cryptographic signing
- Store tokens in local storage (use httpOnly cookies)

### 2. Input Validation

**DO:**
- Validate all input at API boundaries
- Sanitize strings to remove dangerous patterns
- Limit payload sizes to prevent DoS
- Use TypeScript for type safety
- Validate message timestamps

**DON'T:**
- Trust client-side validation
- Accept input without length limits
- Allow arbitrary object keys
- Skip validation for internal APIs

### 3. Cryptography

**DO:**
- Use standard algorithms (AES-256-GCM, RSA-2048+, SHA-256)
- Generate random IVs for each encryption
- Sign all sensitive communications
- Rotate encryption keys regularly
- Use authenticated encryption (AEAD)

**DON'T:**
- Roll your own cryptography
- Use deprecated algorithms (MD5, SHA1, RC4)
- Reuse IVs or nonces
- Store encryption keys with data
- Use ECB mode for encryption

### 4. Rate Limiting

**DO:**
- Implement per-user rate limits
- Use token bucket algorithms
- Track limits across multiple connections
- Implement graceful degradation
- Monitor and alert on limit breaches

**DON'T:**
- Use IP-based rate limiting only
- Allow unlimited burst capacity
- Block all requests when limit reached
- Forget rate limits on reconnection

### 5. Logging & Monitoring

**DO:**
- Log all security-relevant events
- Include correlation IDs in logs
- Use structured logging formats
- Protect log integrity with signing
- Regularly audit log access

**DON'T:**
- Log sensitive data (passwords, tokens)
- Log full request payloads
- Store logs without access controls
- Ignore failed authentication attempts
- Ship logs to untrusted destinations

## For Operators

### 1. Environment Configuration

**Required Variables:**
```bash
# JWT Configuration
JWT_SECRET=<random-32-bytes>
JWT_ALGORITHM=HS256
JWT_ACCESS_EXPIRY=3600
JWT_REFRESH_EXPIRY=604800

# Encryption
FEDERATED_ENCRYPTION_KEY=<hex-encoded-32-bytes>
ENCRYPTION_ALGORITHM=aes-256-gcm
KEY_ROTATION_INTERVAL=2592000

# WebSocket Security
ALLOWED_ORIGINS=https://yourdomain.com
MAX_WS_CONNECTIONS=1000
MAX_WS_CONNECTIONS_PER_IP=10

# Audit Logging
AUDIT_LOG_PATH=/var/log/polln/audit.log
AUDIT_LOG_RETENTION_DAYS=30
```

### 2. Key Management

**Generating Keys:**
```bash
# JWT Secret (32 bytes)
openssl rand -base64 32

# Encryption Key (32 bytes, hex encoded)
openssl rand -hex 32
```

**Key Rotation:**
```bash
# Rotate JWT secret
1. Generate new secret
2. Update JWT_SECRET environment variable
3. Restart services
4. Monitor for authentication failures
5. Keep old secret for 1 access token expiry period

# Rotate encryption key
1. Generate new encryption key
2. Run key rotation process
3. Verify data can still be decrypted
4. Archive old key securely
5. Delete old key after retention period
```

### 3. Deployment Security

**Production Checklist:**
- [ ] TLS enabled on all endpoints
- [ ] Strong cipher suites configured
- [ ] Firewall rules configured
- [ ] Intrusion detection enabled
- [ ] Log aggregation configured
- [ ] Backup encryption enabled
- [ ] Access logging enabled
- [ ] Security monitoring configured

### 4. Monitoring & Alerts

**Key Metrics to Monitor:**
- Failed authentication attempts
- Rate limit violations
- Unusual API usage patterns
- Encryption/decryption failures
- Signature verification failures
- Resource exhaustion indicators
- Audit log anomalies

**Alert Thresholds:**
```yaml
alerts:
  - name: High failed auth rate
    condition: failed_auth_rate > 10%
    duration: 5m
    severity: warning

  - name: Rate limit abuse
    condition: rate_limit_violations > 100/min
    duration: 1m
    severity: critical

  - name: Signature verification failures
    condition: signature_failures > 10/min
    duration: 1m
    severity: warning
```

### 5. Incident Response

**Security Incident Process:**
1. **Detection:** Identify unusual activity
2. **Containment:** Isolate affected systems
3. **Investigation:** Analyze audit logs
4. **Remediation:** Apply fixes
5. **Recovery:** Restore services
6. **Post-Mortem:** Document and improve

**Escalation Matrix:**
| Severity | Response Time | Escalation |
|----------|---------------|------------|
| Critical | 15 minutes | CTO, Security Team |
| High | 1 hour | Engineering Lead |
| Medium | 4 hours | Team Lead |
| Low | 1 day | Developer |

## Code Review Checklist

### Security Review

Before merging code, verify:

- [ ] All inputs are validated
- [ ] No hardcoded credentials
- [ ] Secrets from environment variables
- [ ] Cryptographic operations use standard libraries
- [ ] Error messages don't leak sensitive information
- [ ] Audit logging for sensitive operations
- [ ] Rate limiting on resource-intensive operations
- [ ] Proper authentication and authorization
- [ ] No SQL/command injection vulnerabilities
- [ ] Dependencies are up-to-date

### Performance Review

- [ ] No unnecessary encryption/decryption
- [ ] Efficient use of cryptographic operations
- [ ] Proper key caching (not password caching)
- [ ] Appropriate rate limit intervals
- [ ] Log sampling for high-volume events

## Common Pitfalls

### 1. Token Leakage
❌ **Bad:** Sending tokens in URLs
✅ **Good:** Using Authorization header

### 2. Timing Attacks
❌ **Bad:** Direct string comparison for secrets
✅ **Good:** Using timing-safe comparison

### 3. Error Messages
❌ **Bad:** "User not found" vs "Invalid password"
✅ **Good:** "Invalid credentials" for both

### 4. Key Storage
❌ **Bad:** Keys in code or config files
✅ **Good:** Keys from secure vault

### 5. Log Exposure
❌ **Bad:** Logging request bodies with tokens
✅ **Good:** Redacting sensitive fields

## Testing Security

### Unit Tests
```typescript
describe('Security', () => {
  it('should reject invalid JWT tokens', () => {
    // Test token validation
  });

  it('should sanitize dangerous input', () => {
    // Test input sanitization
  });

  it('should enforce rate limits', () => {
    // Test rate limiting
  });
});
```

### Integration Tests
```typescript
describe('Security Integration', () => {
  it('should prevent unauthorized access', () => {
    // Test authentication flow
  });

  it('should encrypt federated data', () => {
    // Test encryption in transit
  });
});
```

### Security Tests
```bash
# Dependency vulnerability scan
npm audit

# Static analysis
npm run lint:security

# Penetration testing
./scripts/security-test.sh
```

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
- [TLS Configuration](https://wiki.mozilla.org/Security/Server_Side_TLS)
```

---

## Implementation Priority

### Phase 1 (Week 1-2) - Critical Security
1. JWT authentication (Task 4.8.1)
2. Input validation (Task 4.8.3)
3. Security configuration system (Task 4.8.6)

### Phase 2 (Week 3-4) - Data Protection
1. A2A package signing (Task 4.8.4)
2. Federated sync encryption (Task 4.8.5)
3. Enhanced audit logging (Task 4.8.7)

### Phase 3 (Week 5-6) - Access Control
1. Per-colony rate limiting (Task 4.8.2)
2. Security best practices documentation (Task 4.8.8)

---

*Document Version: 1.0*
*Last Updated: 2026-03-07*
*Status: Implementation Guide*
