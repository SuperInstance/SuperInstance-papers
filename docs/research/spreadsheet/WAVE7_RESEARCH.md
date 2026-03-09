# WAVE 7 RESEARCH: Authentication, Rate Limiting, and Cell Garden

**POLLN Spreadsheet Integration - Enterprise-Grade Features**

**Document Version:** 1.0
**Date:** 2026-03-09
**Status:** RESEARCH PHASE
**Focus:** Security, Scalability, and Visualization

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Part I: Authentication & Authorization](#part-i-authentication--authorization)
3. [Part II: Rate Limiting & Abuse Prevention](#part-ii-rate-limiting--abuse-prevention)
4. [Part III: Cell Garden - Ecosystem Visualization](#part-iii-cell-garden---ecosystem-visualization)
5. [Implementation Roadmap](#implementation-roadmap)
6. [API Specifications](#api-specifications)
7. [Security Considerations](#security-considerations)
8. [Testing Strategy](#testing-strategy)

---

## Executive Summary

Wave 7 introduces enterprise-grade features for the POLLN spreadsheet system:

1. **Authentication & Authorization** - JWT-based auth, RBAC, API key management, session handling
2. **Rate Limiting & Abuse Prevention** - Multi-tier rate limiting, IP throttling, DDoS protection, fair usage
3. **Cell Garden** - Novel visualization system for exploring interconnected cell ecosystems

**Key Innovation:** The Cell Garden transforms spreadsheet cells into a visualizable, explorable ecosystem where users can see entanglement networks, growth patterns, and emergent behaviors.

**Integration Points:** Builds on existing POLLN security modules (`src/core/security/`, `src/api/rate-limit.ts`) and spreadsheet architecture (`docs/research/spreadsheet/ARCHITECTURE.md`).

---

## Part I: Authentication & Authorization

### 1.1 Overview

Spreadsheet-based AI agents require robust authentication to:
- Prevent unauthorized access to sensitive data
- Enable multi-user collaboration with proper permissions
- Track usage for billing and analytics
- Protect against malicious agent injection

### 1.2 Authentication Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Authentication Flow                        │
└─────────────────────────────────────────────────────────────┘

User → Spreadsheet Client → POLLN Runtime → Auth Service
                │                  │            │
                │                  │            ├─ JWT Issuance
                │                  │            ├─ Token Validation
                │                  │            ├─ User Lookup
                │                  │            └─ Session Management
                │                  │
                ▼                  ▼
         [Platform Auth]     [Agent Auth]
                │                  │
                └─────┬────────────┘
                      │
                      ▼
              [Authenticated Session]
                      │
                      ├─ JWT Token (bearer)
                      ├─ API Key (for service accounts)
                      ├─ Session ID (for WebSocket)
                      └─ User Context (permissions, quotas)
```

### 1.3 JWT-Based Authentication

#### 1.3.1 Token Structure

```typescript
/**
 * JWT Payload for POLLN Spreadsheet Authentication
 */
interface PollnJWTClaims {
  // Standard JWT claims
  iss: string;        // Issuer (api.polln.io)
  sub: string;        // User ID
  aud: string;        // Audience (spreadsheet-runtime)
  exp: number;        // Expiration
  iat: number;        // Issued at
  jti: string;        // JWT ID (unique token identifier)

  // POLLN-specific claims
  polln: {
    userId: string;
    spreadsheetId?: string;
    accountId: string;
    tier: 'free' | 'pro' | 'enterprise';
    permissions: Permission[];
    quotas: ResourceQuota;
    agentLimits: AgentLimits;
  };
}

/**
 * Permission enum for spreadsheet operations
 */
enum Permission {
  // Cell operations
  READ_CELLS = 'spreadsheet:cells:read',
  WRITE_CELLS = 'spreadsheet:cells:write',
  CREATE_AGENTS = 'spreadsheet:agents:create',
  MODIFY_AGENTS = 'spreadsheet:agents:modify',
  DELETE_AGENTS = 'spreadsheet:agents:delete',

  // Learning operations
  ENABLE_LEARNING = 'spreadsheet:learning:enable',
  ENABLE_REINFORCEMENT = 'spreadsheet:learning:reinforce',

  // Network operations
  CONNECT_AGENTS = 'spreadsheet:agents:connect',
  NETWORK_VISUALIZE = 'spreadsheet:agents:visualize',

  // Collaboration
  SHARE_SPREADSHEET = 'spreadsheet:share',
  IMPORT_AGENTS = 'spreadsheet:agents:import',

  // Admin
  MANAGE_API_KEYS = 'account:apikeys',
  VIEW_USAGE = 'account:usage',
  MANAGE_BILLING = 'account:billing',
}
```

#### 1.3.2 Token Issuance

```typescript
/**
 * JWT Token Issuer for POLLN
 */
class PollnTokenIssuer {
  private keyManager: KeyManager;
  private signatureService: SignatureService;
  private config: AuthConfig;

  constructor(
    keyManager: KeyManager,
    signatureService: SignatureService,
    config: AuthConfig
  ) {
    this.keyManager = keyManager;
    this.signatureService = signatureService;
    this.config = config;
  }

  /**
   * Issue JWT token for user
   */
  async issueToken(user: User, context: AuthContext): Promise<string> {
    const now = Date.now();
    const expiresAt = now + this.config.tokenExpiration;

    const claims: PollnJWTClaims = {
      iss: this.config.issuer,
      sub: user.id,
      aud: 'spreadsheet-runtime',
      exp: Math.floor(expiresAt / 1000),
      iat: Math.floor(now / 1000),
      jti: this.generateTokenId(),

      polln: {
        userId: user.id,
        spreadsheetId: context.spreadsheetId,
        accountId: user.accountId,
        tier: user.tier,
        permissions: await this.getUserPermissions(user),
        quotas: await this.getUserQuotas(user),
        agentLimits: await this.getAgentLimits(user),
      },
    };

    // Sign token using existing signature service
    const signed = this.signatureService.sign(claims, this.config.signingKeyId);

    // Encode as JWT
    return this.encodeJWT(signed);
  }

  /**
   * Refresh token (short-lived refresh token)
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Validate refresh token
    const payload = this.validateRefreshToken(refreshToken);
    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    // Get user
    const user = await this.userService.getUser(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Issue new tokens
    const accessToken = await this.issueToken(user, { spreadsheetId: payload.spreadsheetId });
    const newRefreshToken = await this.issueRefreshToken(user);

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Validate token
   */
  validateToken(token: string): PollnJWTClaims | null {
    try {
      // Decode JWT
      const signed = this.decodeJWT(token);

      // Verify signature
      if (!this.signatureService.verifySignedData(signed)) {
        return null;
      }

      const claims = signed.data as PollnJWTClaims;

      // Check expiration
      if (Date.now() > claims.exp * 1000) {
        return null;
      }

      // Check audience
      if (claims.aud !== 'spreadsheet-runtime') {
        return null;
      }

      return claims;
    } catch (error) {
      return null;
    }
  }

  private encodeJWT(signed: SignedData<any>): string {
    const header = {
      alg: signed.signature.algorithm,
      typ: 'JWT',
      kid: signed.signature.keyId,
    };

    const encodedHeader = base64urlEncode(JSON.stringify(header));
    const encodedPayload = base64urlEncode(JSON.stringify(signed.data));
    const encodedSignature = base64urlEncode(signed.signature.value);

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  }

  private decodeJWT(token: string): SignedData<any> {
    const [headerStr, payloadStr, signatureStr] = token.split('.');
    const header = JSON.parse(base64urlDecode(headerStr));
    const payload = JSON.parse(base64urlDecode(payloadStr));

    return {
      data: payload,
      signature: {
        algorithm: header.alg,
        value: base64urlDecode(signatureStr),
        keyId: header.kid,
        timestamp: payload.iat * 1000,
      },
    };
  }

  private generateTokenId(): string {
    return randomBytes(16).toString('hex');
  }
}
```

### 1.4 Role-Based Access Control (RBAC)

#### 1.4.1 Role Definitions

```typescript
/**
 * Role definitions for POLLN spreadsheet
 */
enum SpreadsheetRole {
  // Platform roles
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  COLLABORATOR = 'collaborator',

  // Custom roles
  ANALYST = 'analyst',
  OPERATOR = 'operator',
  ADMIN = 'admin',
}

/**
 * Role-to-permission mapping
 */
const ROLE_PERMISSIONS: Record<SpreadsheetRole, Permission[]> = {
  [SpreadsheetRole.OWNER]: [
    // All permissions
    ...Object.values(Permission),
  ],

  [SpreadsheetRole.EDITOR]: [
    Permission.READ_CELLS,
    Permission.WRITE_CELLS,
    Permission.CREATE_AGENTS,
    Permission.MODIFY_AGENTS,
    Permission.DELETE_AGENTS,
    Permission.ENABLE_LEARNING,
    Permission.ENABLE_REINFORCEMENT,
    Permission.CONNECT_AGENTS,
    Permission.NETWORK_VISUALIZE,
  ],

  [SpreadsheetRole.VIEWER]: [
    Permission.READ_CELLS,
    Permission.NETWORK_VISUALIZE,
  ],

  [SpreadsheetRole.COLLABORATOR]: [
    Permission.READ_CELLS,
    Permission.WRITE_CELLS,
    Permission.CREATE_AGENTS,
    Permission.MODIFY_AGENTS,
    Permission.DELETE_AGENTS,
    Permission.CONNECT_AGENTS,
    Permission.SHARE_SPREADSHEET,
  ],

  [SpreadsheetRole.ANALYST]: [
    Permission.READ_CELLS,
    Permission.CREATE_AGENTS,
    Permission.MODIFY_AGENTS,
    Permission.ENABLE_LEARNING,
    Permission.NETWORK_VISUALIZE,
  ],

  [SpreadsheetRole.OPERATOR]: [
    Permission.READ_CELLS,
    Permission.WRITE_CELLS,
    Permission.MODIFY_AGENTS,
    Permission.ENABLE_REINFORCEMENT,
    Permission.CONNECT_AGENTS,
  ],

  [SpreadsheetRole.ADMIN]: [
    Permission.READ_CELLS,
    Permission.WRITE_CELLS,
    Permission.CREATE_AGENTS,
    Permission.MODIFY_AGENTS,
    Permission.DELETE_AGENTS,
    Permission.ENABLE_LEARNING,
    Permission.ENABLE_REINFORCEMENT,
    Permission.CONNECT_AGENTS,
    Permission.NETWORK_VISUALIZE,
    Permission.SHARE_SPREADSHEET,
    Permission.IMPORT_AGENTS,
    Permission.MANAGE_API_KEYS,
    Permission.VIEW_USAGE,
  ],
};
```

#### 1.4.2 Permission Checker

```typescript
/**
 * Permission checker for spreadsheet operations
 */
class PermissionChecker {
  private rbac: RBACService;

  constructor(rbac: RBACService) {
    this.rbac = rbac;
  }

  /**
   * Check if user has permission
   */
  async hasPermission(
    user: User,
    permission: Permission,
    context: {
      spreadsheetId: string;
      agentId?: string;
      resourceType?: 'cell' | 'agent' | 'spreadsheet';
    }
  ): Promise<boolean> {
    // Get user's roles for this spreadsheet
    const roles = await this.rbac.getUserRoles(user.id, context.spreadsheetId);

    // Check if any role grants the permission
    for (const role of roles) {
      const rolePermissions = ROLE_PERMISSIONS[role] || [];
      if (rolePermissions.includes(permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check multiple permissions (AND logic)
   */
  async hasAllPermissions(
    user: User,
    permissions: Permission[],
    context: AuthContext
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (!await this.hasPermission(user, permission, context)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check multiple permissions (OR logic)
   */
  async hasAnyPermission(
    user: User,
    permissions: Permission[],
    context: AuthContext
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(user, permission, context)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Authorization middleware for API
   */
  authorize(requiredPermission: Permission) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const user = req.user;
      const context = {
        spreadsheetId: req.params.spreadsheetId,
        agentId: req.params.agentId,
      };

      const hasPermission = await this.hasPermission(user, requiredPermission, context);

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Missing permission: ${requiredPermission}`,
        });
      }

      next();
    };
  }
}
```

### 1.5 API Key Management

#### 1.5.1 API Key Structure

```typescript
/**
 * API Key for service accounts and integrations
 */
interface APIKey {
  id: string;
  keyId: string;          // Public key identifier
  keySecret: string;      // Encrypted secret
  name: string;           // Human-readable name
  accountId: string;
  userId: string;          // Owner
  createdAt: number;
  expiresAt?: number;
  lastUsedAt?: number;
  scopes: string[];        // Permission scopes
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  ipWhitelist?: string[]; // Allowed IP addresses
  status: 'active' | 'revoked' | 'expired';
  metadata: Record<string, any>;
}

/**
 * API Key Service
 */
class APIKeyService {
  private storage: APIKeyStorage;
  private crypto: EncryptionService;
  private config: APIKeyConfig;

  constructor(storage: APIKeyStorage, crypto: EncryptionService, config: APIKeyConfig) {
    this.storage = storage;
    this.crypto = crypto;
    this.config = config;
  }

  /**
   * Create new API key
   */
  async createKey(request: CreateAPIKeyRequest): Promise<APIKeyResponse> {
    const keyId = this.generateKeyId();
    const keySecret = this.generateKeySecret();

    // Encrypt secret
    const encryptedSecret = this.crypto.encrypt(keySecret);

    const apiKey: APIKey = {
      id: generateId(),
      keyId,
      keySecret: encryptedSecret.data,
      name: request.name,
      accountId: request.accountId,
      userId: request.userId,
      createdAt: Date.now(),
      expiresAt: request.expiresIn ? Date.now() + request.expiresIn : undefined,
      scopes: request.scopes,
      rateLimit: request.rateLimit,
      ipWhitelist: request.ipWhitelist,
      status: 'active',
      metadata: request.metadata || {},
    };

    await this.storage.save(apiKey);

    // Return full key (only time it's visible)
    return {
      keyId,
      keySecret, // Plaintext, only returned once
      apiKey: `${keyId}.${keySecret}`,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
    };
  }

  /**
   * Validate API key
   */
  async validateKey(keyString: string): Promise<APIKey | null> {
    const [keyId, keySecret] = keyString.split('.');

    if (!keyId || !keySecret) {
      return null;
    }

    const apiKey = await this.storage.findById(keyId);
    if (!apiKey) {
      return null;
    }

    // Check status
    if (apiKey.status !== 'active') {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && Date.now() > apiKey.expiresAt) {
      apiKey.status = 'expired';
      await this.storage.save(apiKey);
      return null;
    }

    // Verify secret
    const decryptedSecret = this.crypto.decrypt(apiKey.keySecret);
    if (decryptedSecret !== keySecret) {
      return null;
    }

    // Update last used
    apiKey.lastUsedAt = Date.now();
    await this.storage.save(apiKey);

    return apiKey;
  }

  /**
   * Revoke API key
   */
  async revokeKey(keyId: string, userId: string): Promise<boolean> {
    const apiKey = await this.storage.findById(keyId);
    if (!apiKey || apiKey.userId !== userId) {
      return false;
    }

    apiKey.status = 'revoked';
    await this.storage.save(apiKey);
    return true;
  }

  /**
   * List API keys for user
   */
  async listKeys(userId: string): Promise<APIKeySummary[]> {
    const keys = await this.storage.findByUser(userId);
    return keys.map(key => ({
      id: key.id,
      keyId: key.keyId,
      name: key.name,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      status: key.status,
      scopes: key.scopes,
    }));
  }

  private generateKeyId(): string {
    // Generate readable key ID (prefix + random)
    const prefix = 'polln';
    const random = randomBytes(8).toString('base64').slice(0, 8);
    return `${prefix}_${random}`;
  }

  private generateKeySecret(): string {
    return randomBytes(32).toString('base64');
  }
}
```

### 1.6 Session Management

```typescript
/**
 * Session management for WebSocket and long-lived connections
 */
interface Session {
  id: string;
  userId: string;
  spreadsheetId?: string;
  token: string;          // JWT token
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    platform?: 'excel' | 'sheets' | 'airtable';
  };
}

class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private storage: SessionStorage;
  private config: SessionConfig;

  constructor(storage: SessionStorage, config: SessionConfig) {
    this.storage = storage;
    this.config = config;
  }

  /**
   * Create session
   */
  async createSession(request: CreateSessionRequest): Promise<Session> {
    const session: Session = {
      id: generateId(),
      userId: request.userId,
      spreadsheetId: request.spreadsheetId,
      token: request.token,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionTimeout,
      lastActivityAt: Date.now(),
      metadata: request.metadata,
    };

    await this.storage.save(session);
    this.sessions.set(session.id, session);

    return session;
  }

  /**
   * Get session
   */
  async getSession(sessionId: string): Promise<Session | null> {
    // Check memory cache
    let session = this.sessions.get(sessionId);

    if (!session) {
      // Check persistent storage
      session = await this.storage.findById(sessionId);
      if (session) {
        this.sessions.set(sessionId, session);
      }
    }

    if (!session) {
      return null;
    }

    // Check expiration
    if (Date.now() > session.expiresAt) {
      await this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.lastActivityAt = Date.now();
      await this.storage.save(session);
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    await this.storage.delete(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  async cleanup(): Promise<number> {
    let count = 0;
    const now = Date.now();

    for (const [id, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        await this.deleteSession(id);
        count++;
      }
    }

    return count;
  }
}
```

---

## Part II: Rate Limiting & Abuse Prevention

### 2.1 Overview

Build on existing `src/api/rate-limit.ts` to add:
- Multi-tier rate limiting (global, per-user, per-spreadsheet, per-agent)
- IP-based throttling
- DDoS protection
- Fair usage policies
- Dynamic rate limit adjustment

### 2.2 Multi-Tier Rate Limiting

```
┌─────────────────────────────────────────────────────────────┐
│                 Rate Limiting Tiers                         │
└─────────────────────────────────────────────────────────────┘

Tier 1: Global Rate Limit (Runtime-wide)
├─ Protect overall system capacity
├─ Prevent DDoS attacks
└─ Limit: 10,000 req/sec

Tier 2: Per-Account Rate Limit
├─ Fair resource allocation
├─ Tier-based quotas (Free/Pro/Enterprise)
└─ Limit: 100 req/min (Free), 1000 req/min (Pro), unlimited (Enterprise)

Tier 3: Per-Spreadsheet Rate Limit
├─ Prevent spreadsheet abuse
├─ Resource isolation
└─ Limit: 60 req/min per spreadsheet

Tier 4: Per-Agent Rate Limit
├─ Prevent agent spam
├─ Cost control
└─ Limit: 10 req/min per agent

Tier 5: IP-Based Rate Limit
├─ Prevent brute force
├─ Block malicious IPs
└─ Limit: 20 req/min per IP
```

### 2.3 Enhanced Rate Limiter

```typescript
/**
 * Multi-tier rate limiter extending existing implementation
 */
class MultiTierRateLimiter extends EventEmitter {
  private limiters: Map<string, RateLimiter> = new Map();
  private storage: RateLimitStorage;
  private config: MultiTierConfig;

  constructor(storage: RateLimitStorage, config: MultiTierConfig) {
    super();
    this.storage = storage;
    this.config = config;

    this.initializeLimiters();
  }

  /**
   * Initialize all tier limiters
   */
  private initializeLimiters(): void {
    // Tier 1: Global
    this.limiters.set('global', new RateLimiter({
      maxRequests: this.config.global.maxRequests,
      windowMs: this.config.global.windowMs,
      algorithm: 'sliding-window',
      keyPrefix: 'ratelimit:global',
      distributed: true,
    }, this.storage));

    // Tier 2: Per-account
    this.limiters.set('account', new RateLimiter({
      maxRequests: this.config.account.maxRequests,
      windowMs: this.config.account.windowMs,
      algorithm: 'token-bucket',
      keyPrefix: 'ratelimit:account',
      distributed: true,
    }, this.storage));

    // Tier 3: Per-spreadsheet
    this.limiters.set('spreadsheet', new RateLimiter({
      maxRequests: this.config.spreadsheet.maxRequests,
      windowMs: this.config.spreadsheet.windowMs,
      algorithm: 'token-bucket',
      keyPrefix: 'ratelimit:spreadsheet',
      distributed: true,
    }, this.storage));

    // Tier 4: Per-agent
    this.limiters.set('agent', new RateLimiter({
      maxRequests: this.config.agent.maxRequests,
      windowMs: this.config.agent.windowMs,
      algorithm: 'token-bucket',
      keyPrefix: 'ratelimit:agent',
      distributed: false,
    }, this.storage));

    // Tier 5: Per-IP
    this.limiters.set('ip', new RateLimiter({
      maxRequests: this.config.ip.maxRequests,
      windowMs: this.config.ip.windowMs,
      algorithm: 'sliding-window',
      keyPrefix: 'ratelimit:ip',
      distributed: true,
    }, this.storage));
  }

  /**
   * Check all rate limit tiers
   */
  async checkLimit(request: RateLimitRequest): Promise<RateLimitResult> {
    const results: RateLimitResult[] = [];

    // Check global limit
    const globalResult = await this.limiters.get('global')!.checkLimit('global');
    results.push(globalResult);
    if (!globalResult.allowed) {
      return this.createDeniedResult('global', globalResult);
    }

    // Check account limit
    const accountResult = await this.limiters.get('account')!.checkLimit(request.accountId);
    results.push(accountResult);
    if (!accountResult.allowed) {
      return this.createDeniedResult('account', accountResult);
    }

    // Check spreadsheet limit
    if (request.spreadsheetId) {
      const spreadsheetResult = await this.limiters.get('spreadsheet')!.checkLimit(request.spreadsheetId);
      results.push(spreadsheetResult);
      if (!spreadsheetResult.allowed) {
        return this.createDeniedResult('spreadsheet', spreadsheetResult);
      }
    }

    // Check agent limit
    if (request.agentId) {
      const agentResult = await this.limiters.get('agent')!.checkLimit(request.agentId);
      results.push(agentResult);
      if (!agentResult.allowed) {
        return this.createDeniedResult('agent', agentResult);
      }
    }

    // Check IP limit
    if (request.ipAddress) {
      const ipResult = await this.limiters.get('ip')!.checkLimit(request.ipAddress);
      results.push(ipResult);
      if (!ipResult.allowed) {
        return this.createDeniedResult('ip', ipResult);
      }
    }

    // All limits passed
    this.emit('allowed', { request, results });

    return {
      allowed: true,
      remaining: Math.min(...results.map(r => r.remaining)),
      resetAt: Math.min(...results.map(r => r.resetAt)),
      tierResults: results,
    };
  }

  /**
   * Create denied result with details
   */
  private createDeniedResult(tier: string, result: RateLimitResult): RateLimitResult {
    this.emit('blocked', { tier, result });

    return {
      allowed: false,
      remaining: 0,
      resetAt: result.resetAt,
      retryAfter: result.retryAfter,
      tier: tier,
      reason: `Rate limit exceeded at ${tier} tier`,
    };
  }

  /**
   * Get dynamic limits for account tier
   */
  async getAccountLimits(accountId: string): Promise<AccountLimits> {
    const account = await this.accountService.getAccount(accountId);

    switch (account.tier) {
      case 'free':
        return {
          maxRequests: 100,
          windowMs: 60000,
          maxAgents: 10,
          maxSpreadsheets: 3,
        };
      case 'pro':
        return {
          maxRequests: 1000,
          windowMs: 60000,
          maxAgents: 100,
          maxSpreadsheets: 50,
        };
      case 'enterprise':
        return {
          maxRequests: Infinity,
          windowMs: 60000,
          maxAgents: Infinity,
          maxSpreadsheets: Infinity,
        };
    }
  }

  /**
   * Adjust rate limits dynamically
   */
  async adjustLimits(accountId: string, usage: UsageMetrics): Promise<void> {
    // Implement dynamic adjustment based on usage patterns
    // Increase limits for legitimate high-usage users
    // Decrease limits for abusers
  }
}
```

### 2.4 DDoS Protection

```typescript
/**
 * DDoS Protection System
 */
class DDoSProtection {
  private rateLimiter: MultiTierRateLimiter;
  private ipBlacklist: Set<string> = new Set();
  private ipReputation: Map<string, number> = new Map();
  private config: DDoSConfig;

  constructor(rateLimiter: MultiTierRateLimiter, config: DDoSConfig) {
    this.rateLimiter = rateLimiter;
    this.config = config;
  }

  /**
   * Check request for DDoS indicators
   */
  async checkRequest(request: IncomingMessage): Promise<DDoSResult> {
    const ipAddress = this.extractIP(request);

    // Check IP blacklist
    if (this.ipBlacklist.has(ipAddress)) {
      return {
        allowed: false,
        reason: 'IP blacklisted',
        score: 1.0,
      };
    }

    // Check IP reputation
    const reputation = this.ipReputation.get(ipAddress) ?? 1.0;
    if (reputation < this.config.reputationThreshold) {
      return {
        allowed: false,
        reason: 'Low IP reputation',
        score: reputation,
      };
    }

    // Check request patterns
    const patterns = await this.analyzePatterns(ipAddress);
    if (patterns.suspicious) {
      return {
        allowed: false,
        reason: 'Suspicious request patterns',
        score: patterns.score,
      };
    }

    // Check rate limits
    const rateLimitResult = await this.rateLimiter.checkLimit({
      accountId: request.accountId || 'anonymous',
      ipAddress: ipAddress,
    });

    if (!rateLimitResult.allowed) {
      // Decrease IP reputation
      this.updateReputation(ipAddress, -0.1);

      // If reputation is very low, blacklist
      if (this.ipReputation.get(ipAddress)!.toFixed(2) < '0.2') {
        this.ipBlacklist.add(ipAddress);
      }
    }

    return {
      allowed: rateLimitResult.allowed,
      reason: rateLimitResult.allowed ? 'OK' : rateLimitResult.reason,
      score: reputation,
    };
  }

  /**
   * Analyze request patterns for suspicious activity
   */
  private async analyzePatterns(ipAddress: string): Promise<PatternAnalysis> {
    const recentRequests = await this.getRecentRequests(ipAddress, 60);

    // Check for patterns
    const uniquePaths = new Set(recentRequests.map(r => r.path));
    const uniqueUserAgents = new Set(recentRequests.map(r => r.userAgent));
    const requestFrequency = recentRequests.length / 60; // per second

    let score = 0;
    let suspicious = false;

    // High frequency of requests
    if (requestFrequency > 10) {
      score += 0.3;
    }

    // Low path diversity (potential scraping)
    if (uniquePaths.size < 3 && recentRequests.length > 20) {
      score += 0.2;
    }

    // Missing or suspicious user agent
    if (uniqueUserAgents.size === 0 || this.hasSuspiciousUserAgent(recentRequests[0]?.userAgent)) {
      score += 0.2;
    }

    // Distributed attack pattern (many IPs, same pattern)
    const distributedScore = await this.checkDistributedPattern(recentRequests);
    score += distributedScore;

    if (score > this.config.suspiciousThreshold) {
      suspicious = true;
    }

    return { suspicious, score };
  }

  /**
   * Update IP reputation
   */
  private updateReputation(ipAddress: string, delta: number): void {
    const current = this.ipReputation.get(ipAddress) ?? 1.0;
    const updated = Math.max(0, Math.min(1, current + delta));
    this.ipReputation.set(ipAddress, updated);
  }

  /**
   * Extract IP address from request
   */
  private extractIP(request: IncomingMessage): string {
    // Check X-Forwarded-For header (for proxy setups)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      return (forwardedFor as string).split(',')[0].trim();
    }

    // Fall back to socket address
    const socket = (request as any).socket;
    return socket?.remoteAddress || 'unknown';
  }
}
```

### 2.5 Fair Usage Policy

```typescript
/**
 * Fair usage enforcement
 */
class FairUsagePolicy {
  private quotas: Map<string, UsageQuota> = new Map();
  private storage: QuotaStorage;
  private config: FairUsageConfig;

  constructor(storage: QuotaStorage, config: FairUsageConfig) {
    this.storage = storage;
    this.config = config;
  }

  /**
   * Check quota before operation
   */
  async checkQuota(accountId: string, operation: QuotaOperation): Promise<QuotaResult> {
    const quota = await this.getQuota(accountId);
    const usage = await this.getUsage(accountId);

    // Check specific quota type
    switch (operation.type) {
      case 'agent-invocation':
        if (usage.agentInvocations >= quota.maxAgentInvocations) {
          return { allowed: false, reason: 'Agent invocation limit exceeded', resetAt: quota.resetAt };
        }
        break;

      case 'llm-tokens':
        if (usage.llmTokens + operation.amount > quota.maxLLMTokens) {
          return { allowed: false, reason: 'LLM token quota exceeded', resetAt: quota.resetAt };
        }
        break;

      case 'storage':
        if (usage.storageBytes + operation.amount > quota.maxStorageBytes) {
          return { allowed: false, reason: 'Storage quota exceeded', resetAt: quota.resetAt };
        }
        break;

      case 'agents':
        if (usage.agentCount >= quota.maxAgents) {
          return { allowed: false, reason: 'Agent count limit exceeded', resetAt: quota.resetAt };
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Record usage
   */
  async recordUsage(accountId: string, operation: QuotaOperation): Promise<void> {
    const usage = await this.getUsage(accountId);

    switch (operation.type) {
      case 'agent-invocation':
        usage.agentInvocations++;
        break;

      case 'llm-tokens':
        usage.llmTokens += operation.amount;
        break;

      case 'storage':
        usage.storageBytes += operation.amount;
        break;

      case 'agents':
        usage.agentCount += operation.amount;
        break;
    }

    await this.storage.save(accountId, usage);
  }

  /**
   * Reset quotas (called periodically)
   */
  async resetQuotas(accountId: string): Promise<void> {
    const quota = await this.getQuota(accountId);
    const usage = await this.getUsage(accountId);

    // Reset to zero but keep agent count
    usage.agentInvocations = 0;
    usage.llmTokens = 0;
    // Note: storageBytes and agentCount are not reset

    await this.storage.save(accountId, usage);
    quota.resetAt = this.calculateNextReset();
    await this.storage.saveQuota(accountId, quota);
  }

  /**
   * Get quota for account
   */
  private async getQuota(accountId: string): Promise<UsageQuota> {
    let quota = this.quotas.get(accountId);
    if (!quota) {
      quota = await this.storage.loadQuota(accountId);
      if (!quota) {
        // Create default quota based on account tier
        quota = this.createDefaultQuota(accountId);
        await this.storage.saveQuota(accountId, quota);
      }
      this.quotas.set(accountId, quota);
    }
    return quota;
  }

  /**
   * Get usage for account
   */
  private async getUsage(accountId: string): Promise<UsageMetrics> {
    const usage = await this.storage.loadUsage(accountId);
    return usage || {
      agentInvocations: 0,
      llmTokens: 0,
      storageBytes: 0,
      agentCount: 0,
    };
  }

  private createDefaultQuota(accountId: string): UsageQuota {
    // Get account tier and set appropriate quota
    return {
      accountId,
      maxAgentInvocations: 1000,
      maxLLMTokens: 100000,
      maxStorageBytes: 1024 * 1024 * 100, // 100 MB
      maxAgents: 10,
      resetAt: this.calculateNextReset(),
    };
  }

  private calculateNextReset(): number {
    // Reset at midnight
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }
}
```

---

## Part III: Cell Garden - Ecosystem Visualization

### 3.1 Overview

**Cell Garden** is a novel visualization feature that transforms spreadsheet cells into an explorable ecosystem. It provides:

- **Ecosystem Visualization**: See all cells as nodes in a living network
- **Entanglement Networks**: Visualize connections and dependencies between cells
- **Growth Patterns**: Track how cells evolve over time
- **Interactive Exploration**: Click to inspect, zoom to explore, filter to focus

**Metaphor**: The spreadsheet becomes a garden where cells are plants, connections are roots, and data flows are nutrients.

### 3.2 Conceptual Design

```
┌─────────────────────────────────────────────────────────────┐
│                    CELL GARDEN VIEW                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿               │
│   │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │   │
│   │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │   │
│   A1─A2─A3─A4─A5─A6─A7─A8─A9─A10─A11─A12─A13─A14─A15─A16  │
│   │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │   │
│   │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │   │
│   └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘   │
│         │     │     │     │     │     │     │     │        │
│         ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼        │
│   [Input] [Transform] [Analysis] [Output] Cells             │
│         │     │     │     │                                │
│         └─────┴─────┴─────┘                                │
│                    │                                       │
│                    ▼                                       │
│              [Connections]                                 │
│                                                              │
│   View Controls:                                             │
│   [Zoom] [Filter] [Time] [Layout] [Export]                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Legend:
🌱 Seed Cell (Input)
🌿 Growing Cell (Processing)
🌳 Mature Cell (Output)
🍂 Decaying Cell (Inactive)
🔗 Connection (Dependency)
```

### 3.3 Cell Garden Architecture

```typescript
/**
 * Cell Garden - Visualization System
 */
interface CellGardenConfig {
  // Visual settings
  layout: 'force' | 'hierarchical' | 'circular' | 'grid';
  colorScheme: 'type' | 'status' | 'age' | 'activity';
  nodeSize: 'uniform' | 'degree' | 'activity';

  // Interaction
  enableZoom: boolean;
  enablePan: boolean;
  enableSelection: boolean;
  enableDrag: boolean;

  // Animation
  animateGrowth: boolean;
  animateConnections: boolean;
  animationSpeed: number;

  // Filtering
  showInactive: boolean;
  showConnections: boolean;
  minConnectionStrength: number;
  cellTypeFilter: CellType[];
}

/**
 * Cell Garden Visualization
 */
class CellGarden {
  private colony: SpreadsheetColony;
  private renderer: GardenRenderer;
  private interactionHandler: GardenInteraction;
  private config: CellGardenConfig;

  constructor(colony: SpreadsheetColony, config: CellGardenConfig) {
    this.colony = colony;
    this.config = config;
    this.renderer = new GardenRenderer(config);
    this.interactionHandler = new GardenInteraction(this);
  }

  /**
   * Render the garden
   */
  render(container: HTMLElement): void {
    // Extract graph from colony
    const graph = this.extractGraph();

    // Apply layout
    const layout = this.applyLayout(graph);

    // Render using canvas/SVG/D3
    this.renderer.render(container, layout);

    // Set up interactions
    this.interactionHandler.attach(container);
  }

  /**
   * Extract graph from colony
   */
  private extractGraph(): GardenGraph {
    const nodes: GardenNode[] = [];
    const edges: GardenEdge[] = [];

    // Create nodes from cells
    for (const [cellAddress, binding] of this.colony.bindings) {
      const agent = this.colony.agents.get(binding.agentId);
      if (!agent) continue;

      nodes.push({
        id: cellAddress,
        type: agent.type,
        status: agent.status,
        position: this.parseCellPosition(cellAddress),
        age: Date.now() - binding.createdAt,
        activity: this.calculateActivity(agent),
        connections: 0,
      });
    }

    // Create edges from connections
    for (const [cellAddress, binding] of this.colony.bindings) {
      const agent = this.colony.agents.get(binding.agentId);
      if (!agent) continue;

      for (const connection of agent.connections) {
        edges.push({
          id: connection.id,
          source: cellAddress,
          target: this.findCellByAgent(connection.toAgentId),
          strength: connection.weight,
          type: 'dependency',
        });
      }
    }

    // Create edges from dependencies
    for (const edge of this.colony.dependencyGraph.edges) {
      edges.push({
        id: `dep_${edge.from}_${edge.to}`,
        source: edge.from,
        target: edge.to,
        strength: 1.0,
        type: 'data',
      });
    }

    return { nodes, edges };
  }

  /**
   * Apply layout algorithm
   */
  private applyLayout(graph: GardenGraph): LayoutGraph {
    switch (this.config.layout) {
      case 'force':
        return this.forceDirectedLayout(graph);

      case 'hierarchical':
        return this.hierarchicalLayout(graph);

      case 'circular':
        return this.circularLayout(graph);

      case 'grid':
        return this.gridLayout(graph);
    }
  }

  /**
   * Force-directed layout (physics-based)
   */
  private forceDirectedLayout(graph: GardenGraph): LayoutGraph {
    // Use D3 force simulation or custom implementation
    const simulation = new ForceSimulation()
      .nodes(graph.nodes)
      .links(graph.edges)
      .force('charge', forceManyBody().strength(-100))
      .force('link', forceLink(graph.edges).id(d => d.id).distance(100))
      .force('center', forceCenter(canvasWidth / 2, canvasHeight / 2))
      .force('collision', forceCollide().radius(30));

    // Run simulation
    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }

    return {
      nodes: graph.nodes.map(n => ({
        ...n,
        x: n.x!,
        y: n.y!,
      })),
      edges: graph.edges,
    };
  }

  /**
   * Hierarchical layout (tree-based)
   */
  private hierarchicalLayout(graph: GardenGraph): LayoutGraph {
    // Use dependency levels for Y coordinate
    // Use position in sheet for X coordinate

    const levels = new Map<number, GardenNode[]>();

    // Group by dependency level
    for (const node of graph.nodes) {
      const level = this.colony.dependencyGraph.nodes.get(node.id)?.evaluationOrder ?? 0;
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(node);
    }

    // Assign positions
    const positionedNodes: PositionedNode[] = [];
    const levelHeight = 150;
    const nodeSpacing = 100;

    for (const [level, nodes] of levels) {
      const y = level * levelHeight + 100;

      // Sort by sheet position
      nodes.sort((a, b) => {
        const posA = this.parseCellPosition(a.id);
        const posB = this.parseCellPosition(b.id);
        return (posA.col - posB.col) || (posA.row - posB.row);
      });

      nodes.forEach((node, index) => {
        const x = (index - nodes.length / 2) * nodeSpacing + canvasWidth / 2;
        positionedNodes.push({ ...node, x, y });
      });
    }

    return {
      nodes: positionedNodes,
      edges: graph.edges,
    };
  }

  /**
   * Calculate node activity level
   */
  private calculateActivity(agent: SpreadsheetAgent): number {
    const recent = agent.cellStats;
    const timeSinceLastRecalc = Date.now() - recent.lastRecalc;

    // Activity decreases over time
    const recencyFactor = Math.max(0, 1 - timeSinceLastRecalc / (24 * 60 * 60 * 1000));

    // Activity increases with error rate (problems)
    const errorFactor = recent.errorCount / Math.max(1, recent.recalcCount);

    return recencyFactor * (1 + errorFactor * 0.5);
  }

  /**
   * Handle cell selection
   */
  selectCell(cellId: string): void {
    // Highlight selected cell
    // Show details in side panel
    // Zoom to cell
    this.renderer.highlightCell(cellId);
    this.emit('cell:selected', { cellId });
  }

  /**
   * Filter cells
   */
  filterCells(filter: CellFilter): void {
    // Apply filter and re-render
    const filtered = this.applyFilter(filter);
    this.renderer.update(filtered);
  }

  /**
   * Show time-lapse of garden growth
   */
  showTimeLapse(from: number, to: number, steps: number): void {
    // Animate garden evolution over time
    const snapshots = this.generateSnapshots(from, to, steps);
    this.renderer.animate(snapshots);
  }

  /**
   * Export garden as image/data
   */
  export(format: 'png' | 'svg' | 'json' | 'graphml'): Blob | string {
    switch (format) {
      case 'png':
        return this.renderer.exportPNG();

      case 'svg':
        return this.renderer.exportSVG();

      case 'json':
        return JSON.stringify(this.extractGraph(), null, 2);

      case 'graphml':
        return this.toGraphML(this.extractGraph());
    }
  }
}
```

### 3.4 Garden Renderer

```typescript
/**
 * Garden Renderer - Canvas/SVG rendering
 */
class GardenRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: CellGardenConfig;
  private camera: Camera;

  constructor(config: CellGardenConfig) {
    this.config = config;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.camera = new Camera();
  }

  /**
   * Render garden to container
   */
  render(container: HTMLElement, layout: LayoutGraph): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply camera transform
    this.ctx.save();
    this.ctx.translate(this.camera.x, this.camera.y);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);

    // Draw edges first (so nodes are on top)
    this.drawEdges(layout.edges);

    // Draw nodes
    this.drawNodes(layout.nodes);

    this.ctx.restore();
  }

  /**
   * Draw edges (connections)
   */
  private drawEdges(edges: GardenEdge[]): void {
    for (const edge of edges) {
      const source = edge.source as any;
      const target = edge.target as any;

      // Skip if source or target not visible
      if (!source.x || !target.x) continue;

      // Calculate edge style
      const opacity = this.config.showConnections ? edge.strength : 0;
      if (opacity < this.config.minConnectionStrength) continue;

      // Draw edge
      this.ctx.beginPath();
      this.ctx.moveTo(source.x, source.y);
      this.ctx.lineTo(target.x, target.y);

      // Style based on type
      switch (edge.type) {
        case 'dependency':
          this.ctx.strokeStyle = `rgba(100, 100, 100, ${opacity})`;
          this.ctx.lineWidth = 1;
          break;

        case 'data':
          this.ctx.strokeStyle = `rgba(0, 150, 255, ${opacity})`;
          this.ctx.lineWidth = 2;
          break;
      }

      // Animated dashes for active connections
      if (this.config.animateConnections) {
        this.ctx.setLineDash([5, 5]);
        this.ctx.lineDashOffset = -Date.now() / 20;
      }

      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  /**
   * Draw nodes (cells)
   */
  private drawNodes(nodes: PositionedNode[]): void {
    for (const node of nodes) {
      // Skip inactive cells
      if (node.status === 'inactive' && !this.config.showInactive) continue;

      // Apply filter
      if (!this.matchesFilter(node)) continue;

      // Calculate node properties
      const size = this.calculateNodeSize(node);
      const color = this.calculateNodeColor(node);
      const position = { x: node.x, y: node.y };

      // Draw node
      this.ctx.beginPath();
      this.ctx.arc(position.x, position.y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();

      // Draw border
      this.ctx.strokeStyle = this.getBorderColor(node);
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Draw label
      if (this.camera.zoom > 0.5) {
        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(node.id, position.x, position.y + size + 15);
      }

      // Draw activity indicator
      if (node.activity > 0.5) {
        this.drawActivityIndicator(position, size, node.activity);
      }
    }
  }

  /**
   * Calculate node size based on config
   */
  private calculateNodeSize(node: PositionedNode): number {
    switch (this.config.nodeSize) {
      case 'uniform':
        return 20;

      case 'degree':
        return 15 + (node.connections || 0) * 2;

      case 'activity':
        return 15 + node.activity * 15;
    }
  }

  /**
   * Calculate node color based on config
   */
  private calculateNodeColor(node: PositionedNode): string {
    switch (this.config.colorScheme) {
      case 'type':
        return this.getTypeColor(node.type);

      case 'status':
        return this.getStatusColor(node.status);

      case 'age':
        return this.getAgeColor(node.age);

      case 'activity':
        return this.getActivityColor(node.activity);
    }
  }

  private getTypeColor(type: CellType): string {
    const colors: Record<CellType, string> = {
      'input': '#4CAF50',      // Green
      'output': '#2196F3',     // Blue
      'transform': '#FF9800',  // Orange
      'filter': '#9C27B0',     // Purple
      'aggregate': '#F44336',  // Red
      'validate': '#00BCD4',   // Cyan
      'analysis': '#FFEB3B',   // Yellow
      'prediction': '#E91E63', // Pink
      'decision': '#795548',   // Brown
    };
    return colors[type] || '#9E9E9E';
  }

  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'active': '#4CAF50',
      'inactive': '#9E9E9E',
      'error': '#F44336',
      'loading': '#FF9800',
    };
    return colors[status] || '#9E9E9E';
  }

  private getAgeColor(age: number): string {
    // Younger = brighter, older = darker
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const ratio = Math.min(1, age / maxAge);
    const lightness = 80 - ratio * 50;
    return `hsl(120, 50%, ${lightness}%)`;
  }

  private getActivityColor(activity: number): string {
    // More active = redder
    const hue = 120 - activity * 120;
    return `hsl(${hue}, 70%, 50%)`;
  }

  /**
   * Draw activity indicator (pulsing ring)
   */
  private drawActivityIndicator(position: {x: number, y: number}, size: number, activity: number): void {
    const pulseSize = size + 5 + Math.sin(Date.now() / 200) * 3;
    const alpha = 0.3 + activity * 0.3;

    this.ctx.beginPath();
    this.ctx.arc(position.x, position.y, pulseSize, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(255, 100, 100, ${alpha})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  /**
   * Highlight selected cell
   */
  highlightCell(cellId: string): void {
    // Find node and draw highlight
    // Implementation...
  }

  /**
   * Export as PNG
   */
  exportPNG(): Blob {
    return new Blob([this.canvas.toDataURL('image/png')], { type: 'image/png' });
  }

  /**
   * Export as SVG
   */
  exportSVG(): string {
    // Convert canvas to SVG
    // Implementation...
    return '';
  }
}
```

### 3.5 Interaction Handler

```typescript
/**
 * Garden Interaction Handler
 */
class GardenInteraction {
  private garden: CellGarden;
  private renderer: GardenRenderer;
  private selectedCell: string | null = null;
  private hoveredCell: string | null = null;

  constructor(garden: CellGarden) {
    this.garden = garden;
    this.renderer = garden['renderer'];
  }

  /**
   * Attach interaction handlers to container
   */
  attach(container: HTMLElement): void {
    // Mouse events
    container.addEventListener('click', this.handleClick.bind(this));
    container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    container.addEventListener('wheel', this.handleWheel.bind(this));

    // Touch events
    container.addEventListener('touchstart', this.handleTouchStart.bind(this));
    container.addEventListener('touchmove', this.handleTouchMove.bind(this));
    container.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Drag events
    container.addEventListener('mousedown', this.handleDragStart.bind(this));
    container.addEventListener('mouseup', this.handleDragEnd.bind(this));
  }

  /**
   * Handle click (select cell)
   */
  private handleClick(event: MouseEvent): void {
    const cellId = this.getCellAtPosition(event);
    if (cellId) {
      this.selectedCell = cellId;
      this.garden.selectCell(cellId);
      this.showCellDetails(cellId);
    }
  }

  /**
   * Handle mouse move (hover effect)
   */
  private handleMouseMove(event: MouseEvent): void {
    const cellId = this.getCellAtPosition(event);
    if (cellId !== this.hoveredCell) {
      this.hoveredCell = cellId;

      // Update cursor
      if (cellId) {
        this.renderer.getCanvas().style.cursor = 'pointer';
      } else {
        this.renderer.getCanvas().style.cursor = 'default';
      }

      // Show tooltip
      if (cellId) {
        this.showTooltip(cellId, event);
      }
    }
  }

  /**
   * Handle wheel (zoom)
   */
  private handleWheel(event: WheelEvent): void {
    event.preventDefault();

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    this.renderer.getCamera().zoom *= zoomFactor;

    this.garden.render(this.renderer.getCanvas().parentElement!);
  }

  /**
   * Handle drag start
   */
  private handleDragStart(event: MouseEvent): void {
    // Start panning
    this.isDragging = true;
    this.dragStart = { x: event.clientX, y: event.clientY };
  }

  /**
   * Handle drag end
   */
  private handleDragEnd(event: MouseEvent): void {
    this.isDragging = false;
  }

  /**
   * Get cell at position
   */
  private getCellAtPosition(event: {clientX: number, clientY: number}): string | null {
    const rect = this.renderer.getCanvas().getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Transform to world coordinates
    const camera = this.renderer.getCamera();
    const worldX = (x - camera.x) / camera.zoom;
    const worldY = (y - camera.y) / camera.zoom;

    // Find node at position
    const graph = this.garden['extractGraph']();
    for (const node of graph.nodes) {
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 20) { // Node radius
        return node.id;
      }
    }

    return null;
  }

  /**
   * Show cell details panel
   */
  private showCellDetails(cellId: string): void {
    const binding = this.garden['colony'].bindings.get(cellId);
    const agent = binding ? this.garden['colony'].agents.get(binding.agentId) : null;

    if (!agent) return;

    // Show details in side panel
    const details = {
      id: cellId,
      type: agent.type,
      status: agent.status,
      successRate: agent.successRate,
      valueFunction: agent.valueFunction,
      executions: agent.executionCount,
      connections: agent.connections.length,
    };

    // Emit event for UI to handle
    this.garden.emit('show-details', details);
  }

  /**
   * Show tooltip
   */
  private showTooltip(cellId: string, event: MouseEvent): void {
    const binding = this.garden['colony'].bindings.get(cellId);
    const agent = binding ? this.garden['colony'].agents.get(binding.agentId) : null;

    if (!agent) return;

    // Show tooltip near cursor
    const tooltip = {
      x: event.clientX + 15,
      y: event.clientY + 15,
      title: cellId,
      content: `${agent.type}: ${agent.status}`,
    };

    this.garden.emit('show-tooltip', tooltip);
  }
}
```

### 3.6 Time-Lapse Animation

```typescript
/**
 * Garden Time-Lapse - Show evolution over time
 */
class GardenTimeLapse {
  private garden: CellGarden;
  private history: GardenSnapshot[];

  constructor(garden: CellGarden) {
    this.garden = garden;
    this.history = [];
  }

  /**
   * Capture snapshot
   */
  captureSnapshot(): void {
    const snapshot: GardenSnapshot = {
      timestamp: Date.now(),
      graph: this.garden['extractGraph'](),
      colony: this.cloneColony(),
    };

    this.history.push(snapshot);

    // Keep only last N snapshots
    if (this.history.length > 100) {
      this.history.shift();
    }
  }

  /**
   * Generate time-lapse animation
   */
  generateSnapshots(from: number, to: number, steps: number): GardenSnapshot[] {
    const snapshots: GardenSnapshot[] = [];
    const duration = to - from;
    const stepSize = duration / steps;

    for (let i = 0; i <= steps; i++) {
      const time = from + i * stepSize;
      const snapshot = this.getSnapshotAtTime(time);

      if (snapshot) {
        snapshots.push(snapshot);
      }
    }

    return snapshots;
  }

  /**
   * Get snapshot at specific time
   */
  private getSnapshotAtTime(time: number): GardenSnapshot | null {
    // Find closest snapshot
    let closest: GardenSnapshot | null = null;
    let minDiff = Infinity;

    for (const snapshot of this.history) {
      const diff = Math.abs(snapshot.timestamp - time);
      if (diff < minDiff) {
        minDiff = diff;
        closest = snapshot;
      }
    }

    return closest;
  }

  /**
   * Play animation
   */
  async play(from: number, to: number, steps: number): Promise<void> {
    const snapshots = this.generateSnapshots(from, to, steps);

    for (const snapshot of snapshots) {
      // Render snapshot
      this.garden.render(snapshot.graph);

      // Wait for next frame
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

---

## Implementation Roadmap

### Phase 1: Authentication (4 weeks)

**Week 1: JWT Infrastructure**
- Token issuer service
- Token validation middleware
- Key rotation
- [ ] Write JWT service
- [ ] Integrate with existing crypto module
- [ ] Unit tests for token issuance/validation

**Week 2: RBAC System**
- Role definitions
- Permission checker
- Role assignment
- [ ] Implement RBAC service
- [ ] Create permission middleware
- [ ] Integration tests

**Week 3: API Key Management**
- API key creation/validation
- Key storage and encryption
- Key revocation
- [ ] API key service
- [ ] Admin UI for key management
- [ ] Tests

**Week 4: Session Management**
- Session creation/validation
- WebSocket session handling
- Session cleanup
- [ ] Session service
- [ ] WebSocket integration
- [ ] Tests

### Phase 2: Rate Limiting (3 weeks)

**Week 1: Multi-Tier Rate Limiter**
- Extend existing rate-limit.ts
- Multi-tier checks
- [ ] MultiTierRateLimiter class
- [ ] Integration with API
- [ ] Tests

**Week 2: DDoS Protection**
- IP reputation tracking
- Pattern analysis
- Blacklist management
- [ ] DDoSProtection class
- [ ] IP tracking service
- [ ] Tests

**Week 3: Fair Usage Policy**
- Quota management
- Usage tracking
- Quota enforcement
- [ ] FairUsagePolicy class
- [ ] Dashboard integration
- [ ] Tests

### Phase 3: Cell Garden (6 weeks)

**Week 1: Graph Extraction**
- Extract nodes/edges from colony
- Build dependency graph
- [ ] CellGarden class
- [ ] Graph extraction
- [ ] Tests

**Week 2: Layout Algorithms**
- Force-directed layout
- Hierarchical layout
- Circular layout
- [ ] Layout implementations
- [ ] Performance optimization
- [ ] Tests

**Week 3: Rendering**
- Canvas renderer
- SVG renderer
- Color schemes
- [ ] GardenRenderer class
- [ ] Multiple renderers
- [ ] Tests

**Week 4: Interaction**
- Click selection
- Hover tooltips
- Zoom/pan
- [ ] GardenInteraction class
- [ ] Event handlers
- [ ] Tests

**Week 5: Animation**
- Growth animation
- Connection animation
- Time-lapse
- [ ] Animation system
- [ ] GardenTimeLapse
- [ ] Tests

**Week 6: UI Integration**
- Side panel
- Controls
- Export
- [ ] React components
- [ ] Integration with platform
- [ ] E2E tests

---

## API Specifications

### Authentication Endpoints

```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/verify
GET    /api/auth/me

POST   /api/keys
GET    /api/keys
GET    /api/keys/:keyId
DELETE /api/keys/:keyId
POST   /api/keys/:keyId/revoke

GET    /api/sessions
GET    /api/sessions/:sessionId
DELETE /api/sessions/:sessionId
```

### Rate Limiting Endpoints

```
GET    /api/rate-limits/status
GET    /api/rate-limits/quota
GET    /api/rate-limits/usage
POST   /api/rate-limits/adjust
```

### Cell Garden Endpoints

```
GET    /api/garden/:spreadsheetId
GET    /api/garden/:spreadsheetId/snapshot
GET    /api/garden/:spreadsheetId/timelapse
POST   /api/garden/:spreadsheetId/export
GET    /api/garden/:spreadsheetId/cell/:cellId
```

---

## Security Considerations

### Authentication Security

1. **JWT Security**
   - Use strong signing algorithms (HS512, RS512)
   - Short expiration times (15 minutes for access tokens)
   - Secure key storage and rotation
   - Validate all tokens on each request

2. **API Key Security**
   - Encrypt keys at rest
   - Never return key secret after creation
   - Implement IP whitelisting
   - Rate limit API key usage

3. **Session Security**
   - Use secure, HTTP-only cookies
   - Implement session timeout
   - Invalidate sessions on logout
   - Track concurrent sessions

### Rate Limiting Security

1. **Prevent Bypass**
   - Check all tiers (global → account → spreadsheet → agent → IP)
   - Use distributed storage for multi-instance deployments
   - Implement request fingerprinting

2. **DDoS Protection**
   - IP reputation scoring
   - Pattern analysis
   - Automatic blacklisting
   - Rate limit escalation

3. **Fair Usage**
   - Enforce quotas at multiple levels
   - Track usage accurately
   - Provide usage visibility
   - Implement graceful degradation

### Cell Garden Security

1. **Data Access**
   - Only show cells user has permission to view
   - Filter sensitive data
   - Implement access control on all endpoints

2. **Performance**
   - Limit graph size for rendering
   - Implement virtualization for large gardens
   - Cache rendered views

---

## Testing Strategy

### Unit Tests

```typescript
// Authentication tests
describe('PollnTokenIssuer', () => {
  it('should issue valid JWT token');
  it('should validate token signature');
  it('should reject expired tokens');
  it('should refresh tokens');
});

// Rate limiting tests
describe('MultiTierRateLimiter', () => {
  it('should enforce global limits');
  it('should enforce account limits');
  it('should enforce spreadsheet limits');
  it('should enforce agent limits');
  it('should enforce IP limits');
});

// Cell Garden tests
describe('CellGarden', () => {
  it('should extract graph from colony');
  it('should apply force-directed layout');
  it('should apply hierarchical layout');
  it('should filter cells');
  it('should export as PNG');
});
```

### Integration Tests

```typescript
// Authentication flow tests
describe('Authentication Flow', () => {
  it('should authenticate user and issue token');
  it('should protect endpoints without token');
  it('should refresh expired token');
  it('should revoke API keys');
});

// Rate limiting flow tests
describe('Rate Limiting Flow', () => {
  it('should rate limit anonymous requests');
  it('should enforce account quotas');
  it('should block DDoS attacks');
  it('should adjust limits dynamically');
});

// Cell Garden flow tests
describe('Cell Garden Flow', () => {
  it('should render garden from colony');
  it('should handle cell selection');
  it('should filter cells');
  it('should play time-lapse animation');
});
```

### E2E Tests

```typescript
// Full authentication flow
it('should login, access protected resource, and logout');

// Full rate limiting flow
it('should enforce limits across multiple requests');

// Full cell garden flow
it('should load garden, select cell, view details, export');
```

---

## Conclusion

Wave 7 adds enterprise-grade features to POLLN:

1. **Authentication & Authorization** - Complete JWT-based auth system with RBAC
2. **Rate Limiting & Abuse Prevention** - Multi-tier protection against abuse
3. **Cell Garden** - Innovative visualization for exploring cell ecosystems

These features enable POLLN to scale from personal use to enterprise deployments while maintaining inspectability and user control.

**Key Files to Create:**
- `src/api/auth/jwt-issuer.ts`
- `src/api/auth/rbac.ts`
- `src/api/auth/api-keys.ts`
- `src/api/auth/session-manager.ts`
- `src/api/rate-limit/multi-tier.ts`
- `src/api/rate-limit/ddos-protection.ts`
- `src/api/rate-limit/fair-usage.ts`
- `src/spreadsheet/garden/cell-garden.ts`
- `src/spreadsheet/garden/renderer.ts`
- `src/spreadsheet/garden/interaction.ts`
- `src/spreadsheet/garden/timelapse.ts`

**Integration Points:**
- Existing `src/core/security/crypto.ts` for signing/encryption
- Existing `src/api/rate-limit.ts` for rate limiting foundation
- Spreadsheet colony system for graph data
- Platform UI components for rendering

---

**Document Status:** RESEARCH COMPLETE
**Next Phase:** Implementation Planning
**Estimated Implementation:** 13 weeks
**Complexity:** High (Enterprise-grade features)
**Priority:** High (Required for production deployment)
