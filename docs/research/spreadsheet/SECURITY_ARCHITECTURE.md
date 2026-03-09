# POLLN Security Architecture

**Version**: 1.0.0
**Last Updated**: 2025-03-09
**Status**: Comprehensive Security Blueprint
**Scope**: POLLN Spreadsheet LOG System

---

## Executive Summary

This document provides a comprehensive security architecture for the POLLN Spreadsheet LOG System, addressing authentication, authorization, data protection, API security, WebSocket security, infrastructure hardening, compliance requirements, and security testing methodologies. The architecture follows defense-in-depth principles, zero-trust security models, and industry best practices including OWASP, NIST, and CIS benchmarks.

### Security Philosophy

**Zero Trust + Defense in Depth + Inspectability**

```
┌─────────────────────────────────────────────────────────────┐
│                 POLLN SECURITY LAYERS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LAYER 7: Monitoring & Audit (SIEM, Logging, Alerts)        │
│  ─────────────────────────────────────────────────────────  │
│  LAYER 6: Application Security (Code Review, Testing)        │
│  ─────────────────────────────────────────────────────────  │
│  LAYER 5: API & WebSocket Security (Rate Limit, Auth)        │
│  ─────────────────────────────────────────────────────────  │
│  LAYER 4: Data Security (Encryption, PII Protection)         │
│  ─────────────────────────────────────────────────────────  │
│  LAYER 3: Identity & Access Management (IAM, MFA)           │
│  ─────────────────────────────────────────────────────────  │
│  LAYER 2: Network Security (Firewall, Segmentation)         │
│  ─────────────────────────────────────────────────────────  │
│  LAYER 1: Infrastructure Security (Container, Host)          │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  PRINCIPLE: Every layer is independently secured            │
│  INSPECTABILITY: All actions are auditable and traceable     │
└─────────────────────────────────────────────────────────────┘
```

---

## Table of Contents

1. [Threat Model](#1-threat-model)
2. [Authentication Security](#2-authentication-security)
3. [API Security](#3-api-security)
4. [Data Security](#4-data-security)
5. [WebSocket Security](#5-websocket-security)
6. [Infrastructure Security](#6-infrastructure-security)
7. [Compliance](#7-compliance)
8. [Security Testing](#8-security-testing)
9. [Security Checklist](#9-security-checklist)
10. [Implementation Priorities](#10-implementation-priorities)

---

## 1. Threat Model

### 1.1 Attack Surface Analysis

```
┌──────────────────────────────────────────────────────────────┐
│                    POLLN ATTACK SURFACE                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Web UI     │  │    API       │  │  WebSocket   │        │
│  │   (HTTPS)    │  │   (REST)     │  │   (WSS)       │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│         │                  │                  │                │
│         └──────────────────┼──────────────────┘                │
│                            │                                   │
│                   ┌────────▼────────┐                          │
│                   │  Auth Gateway   │                          │
│                   │   (JWT/OAuth)   │                          │
│                   └────────┬────────┘                          │
│                            │                                   │
│         ┌──────────────────┼──────────────────┐                │
│         │                  │                  │                │
│  ┌──────▼──────┐  ┌───────▼───────┐  ┌───────▼───────┐       │
│  │  Cell Logic │  │   Database    │  │   External    │       │
│  │  Engine     │  │  (PostgreSQL) │  │   Services    │       │
│  └─────────────┘  └───────────────┘  └───────────────┘       │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Threat Actors

| Actor Type | Motivation | Capability | Likelihood | Impact |
|------------|------------|------------|------------|--------|
| **Script Kiddies** | Notoriety, fun | Low-Medium | High | Low-Medium |
| **Hacktivists** | Political agenda | Medium | Medium | Medium |
| **Cybercriminals** | Financial gain | High | High | High |
| **Insiders** | Revenge, espionage | High | Medium | Critical |
| **APT Groups** | Long-term access | Very High | Low | Critical |
| **Competitors** | Intellectual property | High | Low | High |

### 1.3 Attack Vectors

#### 1.3.1 Injection Attacks

**SQL Injection (SQLi)**
```typescript
// ❌ VULNERABLE
const query = `SELECT * FROM cells WHERE id = '${cellId}'`;

// ✅ SECURE - Parameterized Query
const query = 'SELECT * FROM cells WHERE id = $1';
await db.query(query, [cellId]);
```

**NoSQL Injection**
```typescript
// ❌ VULNERABLE
const query = { $where: `this.id == '${userId}'` };

// ✅ SECURE - Typed Query
const query = { id: new ObjectId(userId) };
```

**Command Injection**
```typescript
// ❌ VULNERABLE
exec(`cp ${file} /tmp/`);

// ✅ SECURE - Use library functions
fs.copyFile(file, '/tmp/' + sanitizeFilename(file));
```

#### 1.3.2 Cross-Site Scripting (XSS)

**Stored XSS**
```typescript
// ❌ VULNERABLE
cell.innerHTML = userContent;

// ✅ SECURE - Sanitize
cell.textContent = userContent;
// OR
cell.innerHTML = DOMPurify.sanitize(userContent);
```

**Reflected XSS**
```typescript
// ❌ VULNERABLE
res.send(`Hello ${req.query.name}`);

// ✅ SECURE - Encode output
res.send(`Hello ${escapeHtml(req.query.name)}`);
```

**DOM-based XSS**
```typescript
// ❌ VULNERABLE
element.innerHTML = location.hash;

// ✅ SECURE
element.textContent = location.hash.substring(1);
```

#### 1.3.3 Cross-Site Request Forgery (CSRF)

```typescript
// ❌ VULNERABLE - No CSRF protection
app.post('/transfer', transferMoney);

// ✅ SECURE - CSRF Token
import csrf from 'csurf';
const csrfProtection = csrf({ cookie: true });
app.post('/transfer', csrfProtection, transferMoney);

// ✅ SECURE - SameSite Cookie
session({
  cookie: {
    sameSite: 'strict',
    secure: true,
    httpOnly: true
  }
});
```

#### 1.3.4 Denial of Service (DoS)

**Volumetric Attacks**
- Flood network bandwidth
- DDoS amplification attacks

**Protocol Attacks**
- SYN flood
- HTTP slowloris

**Application Layer Attacks**
- Expensive queries
- Resource exhaustion
- WebSocket connection floods

#### 1.3.5 Man-in-the-Middle (MitM)

- SSL/TLS stripping
- Downgrade attacks
- ARP spoofing
- DNS spoofing

#### 1.3.6 Session Hijacking

- Session fixation
- Session sidejacking
- Cross-site scripting (XSS) token theft

### 1.4 Impact Assessment

```
┌─────────────────────────────────────────────────────────────┐
│                    IMPACT MATRIX                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  IMPACT LEVELS:                                              │
│  • CRITICAL: System compromise, data breach, regulatory fines │
│  • HIGH: Service disruption, data exposure                   │
│  • MEDIUM: Limited impact, user inconvenience               │
│  • LOW: Minimal impact, easily recoverable                   │
│                                                              │
│  THREAT → IMPACT MAPPING:                                    │
│  ┌────────────────────┬──────────────────────────────────┐   │
│  │ SQL Injection       │ CRITICAL (data breach)           │   │
│  │ XSS                 │ MEDIUM (user session compromise) │   │
│  │ CSRF                │ MEDIUM (unauthorized actions)    │   │
│  │ DoS                 │ HIGH (service unavailability)    │   │
│  │ Insider Threat      │ CRITICAL (data exfiltration)     │   │
│  │ API Key Leak        │ CRITICAL (resource abuse)        │   │
│  │ Zero-Day            │ CRITICAL (system compromise)     │   │
│  └────────────────────┴──────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Security

### 2.1 JWT Best Practices

#### 2.1.1 JWT Structure and Claims

```typescript
interface JWTPayload {
  // Standard claims
  iss: string;        // Issuer (domain)
  sub: string;        // Subject (user ID)
  aud: string;        // Audience (application)
  exp: number;        // Expiration (seconds since epoch)
  nbf: number;        // Not Before
  iat: number;        // Issued At
  jti: string;        // JWT ID (unique token identifier)

  // Custom claims
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;  // For token revocation
}

interface JWTHeader {
  alg: 'RS256';       // Algorithm (RS256 recommended)
  typ: 'JWT';         // Token type
  kid: string;        // Key ID (for key rotation)
}
```

#### 2.1.2 Secure JWT Generation

```typescript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

class JWTService {
  private privateKey: string;
  private publicKey: string;
  private keyId: string;

  constructor() {
    // Load keys from environment or KMS
    this.privateKey = process.env.JWT_PRIVATE_KEY!;
    this.publicKey = process.env.JWT_PUBLIC_KEY!;
    this.keyId = process.env.JWT_KEY_ID!;
  }

  generateToken(payload: JWTPayload): string {
    const now = Math.floor(Date.now() / 1000);

    return jwt.sign(
      {
        ...payload,
        iat: now,
        nbf: now,
        jti: crypto.randomUUID()
      },
      this.privateKey,
      {
        algorithm: 'RS256',  // Use RS256, not HS256
        keyid: this.keyId,
        expiresIn: '15m',   // Short-lived access token
        issuer: 'https://polln.ai',
        audience: 'polln-spreadsheet'
      }
    );
  }

  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: 'https://polln.ai',
        audience: 'polln-spreadsheet'
      }) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
```

#### 2.1.3 Refresh Token Pattern

```typescript
class RefreshTokenService {
  async generateRefreshToken(userId: string): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store in database with rotation tracking
    await db.refreshTokens.create({
      token,
      userId,
      expiresAt,
      createdAt: new Date(),
      rotated: false,
      revoked: false
    });

    return { token, expiresAt };
  }

  async rotateRefreshToken(oldToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Verify old token
    const tokenRecord = await db.refreshTokens.findOne({
      where: { token: oldToken, revoked: false }
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new Error('Invalid refresh token');
    }

    // Mark old token as rotated
    await db.refreshTokens.update(tokenRecord.id, { rotated: true });

    // Generate new tokens
    const user = await db.users.findOne(tokenRecord.userId);
    const accessToken = jwtService.generateToken({
      userId: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      sessionId: crypto.randomUUID()
    });

    const refreshToken = await this.generateRefreshToken(user.id);

    return { accessToken, refreshToken: refreshToken.token };
  }
}
```

### 2.2 Token Storage Strategies

#### 2.2.1 Cookie Storage (Recommended for Web)

```typescript
import { Response } from 'express';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  // Access token - HttpOnly, Secure, SameSite
  res.cookie('access_token', accessToken, {
    httpOnly: true,      // Prevents XSS
    secure: true,        // HTTPS only
    sameSite: 'strict',  // Prevents CSRF
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
    domain: '.polln.ai'  // Subdomain sharing
  });

  // Refresh token - HttpOnly, Secure, SameSite
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/auth/refresh',
    domain: '.polln.ai'
  });
}
```

#### 2.2.2 Memory Storage (Recommended for SPAs)

```typescript
class TokenManager {
  private accessToken: string | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  setTokens(accessToken: string, expiresIn: number) {
    this.accessToken = accessToken;

    // Auto-refresh before expiration
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(
      () => this.refreshAccessToken(),
      (expiresIn - 60) * 1000 // Refresh 1 minute before expiry
    );
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      this.clearTokens();
      return;
    }

    try {
      const response = await fetch('/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const { accessToken, refreshToken: newRefreshToken } = await response.json();
        this.setTokens(accessToken, 15 * 60); // 15 minutes
        localStorage.setItem('refresh_token', newRefreshToken);
      } else {
        this.clearTokens();
        window.location.href = '/login';
      }
    } catch (error) {
      this.clearTokens();
      window.location.href = '/login';
    }
  }

  clearTokens() {
    this.accessToken = null;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    localStorage.removeItem('refresh_token');
  }
}
```

### 2.3 Session Management

#### 2.3.1 Session Configuration

```typescript
import session from 'express-session';
import RedisStore from 'connect-redis';

const sessionConfig = {
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:'
  }),
  secret: process.env.SESSION_SECRET!,
  name: 'sessionId',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,        // HTTPS only
    httpOnly: true,      // Prevent XSS
    sameSite: 'strict',  // Prevent CSRF
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
    domain: '.polln.ai'
  },
  rolling: true,         // Reset expiration on activity
  proxy: true            // Trust X-Forwarded-* headers
};

app.use(session(sessionConfig));
```

#### 2.3.2 Session Fixation Prevention

```typescript
app.use((req, res, next) => {
  if (req.session && !req.session.createdAt) {
    // Regenerate session on first authentication
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.createdAt = Date.now();
      next();
    });
  } else {
    next();
  }
});

// After login
app.post('/login', async (req, res) => {
  // Authenticate user
  const user = await authenticateUser(req.body);

  // Regenerate session to prevent fixation
  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Session error');

    req.session.userId = user.id;
    req.session.roles = user.roles;

    res.json({ success: true });
  });
});
```

### 2.4 Multi-Factor Authentication (MFA)

#### 2.4.1 TOTP Implementation (Time-based OTP)

```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

class MFAService {
  async generateSecret(userId: string): Promise<{
    secret: string;
    qrCode: string;
  }> {
    const secret = speakeasy.generateSecret({
      name: `POLLN Spreadsheet (${userId})`,
      issuer: 'POLLN',
      length: 32
    });

    // Store encrypted secret
    await db.users.update(userId, {
      mfaSecret: this.encrypt(secret.base32),
      mfaEnabled: false
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    return { secret: secret.base32, qrCode };
  }

  verifyTOTP(userId: string, token: string): boolean {
    const user = db.users.findOne(userId);
    const decryptedSecret = this.decrypt(user.mfaSecret);

    return speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after
      algorithm: 'sha512'
    });
  }

  private encrypt(text: string): string {
    // Use KMS or crypto.encrypt
    return crypto.encrypt(text);
  }

  private decrypt(encrypted: string): string {
    // Use KMS or crypto.decrypt
    return crypto.decrypt(encrypted);
  }
}
```

#### 2.4.2 Backup Codes

```typescript
class BackupCodeService {
  async generateBackupCodes(userId: string): Promise<string[]> {
    const codes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Hash codes before storing
    const hashedCodes = codes.map(code =>
      crypto.createHash('sha256').update(code).digest('hex')
    );

    await db.backupCodes.createMany({
      userId,
      codes: hashedCodes,
      createdAt: new Date()
    });

    return codes; // Return plain codes to user (one-time display)
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const hashedCode = crypto.createHash('sha256')
      .update(code.toLowerCase())
      .digest('hex');

    const backupCode = await db.backupCodes.findOne({
      userId,
      code: hashedCode,
      used: false
    });

    if (!backupCode) return false;

    // Mark as used
    await db.backupCodes.update(backupCode.id, { used: true });

    return true;
  }
}
```

### 2.5 OAuth/OpenID Connect Integration

#### 2.5.1 OAuth 2.0 Configuration

```typescript
import { OAuth2Client } from 'google-auth-library';
import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';

// Google OAuth
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

passport.use('google', new OAuth2Strategy({
    authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenURL: 'https://oauth2.googleapis.com/token',
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_REDIRECT_URI!,
    scope: ['openid', 'profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    // Find or create user
    let user = await db.users.findOne({ googleId: profile.id });

    if (!user) {
      user = await db.users.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        avatar: profile.photos[0].value,
        verified: true
      });
    }

    return done(null, user);
  }
));
```

#### 2.5.2 OpenID Connect

```typescript
import { Issuer, Strategy } from 'openid-client';

async function setupOpenIDConnect() {
  const issuer = await Issuer.discover('https://accounts.google.com/.well-known/openid-configuration');

  const client = new issuer.Client({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uris: [process.env.GOOGLE_REDIRECT_URI!],
    response_types: ['code'],
    scope: 'openid profile email'
  });

  passport.use('oidc', new Strategy({
      client
    },
    async (tokenSet, userinfo, done) => {
      // Verify userinfo
      const user = await db.users.findOne({ email: userinfo.email });
      return done(null, user);
    }
  ));
}
```

---

## 3. API Security

### 3.1 Rate Limiting Strategies

#### 3.1.1 Token Bucket Algorithm

```typescript
import Redis from 'ioredis';

class RateLimiter {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async checkLimit(
    identifier: string,
    limit: number,
    window: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - window;

    const pipeline = this.redis.pipeline();

    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count current requests
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, now, `${now}-${crypto.randomUUID()}`);

    // Set expiration
    pipeline.expire(key, Math.ceil(window / 1000));

    const results = await pipeline.exec();
    const count = results![1][1] as number;

    return {
      allowed: count < limit,
      remaining: Math.max(0, limit - count - 1)
    };
  }
}

// Usage
const rateLimiter = new RateLimiter();

app.use(async (req, res, next) => {
  const identifier = req.user?.id || req.ip;
  const { allowed, remaining } = await rateLimiter.checkLimit(
    `api:${identifier}`,
    100, // 100 requests
    60000 // per minute
  );

  res.setHeader('X-RateLimit-Limit', '100');
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', new Date(Date.now() + 60000).toISOString());

  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  next();
});
```

#### 3.1.2 Sliding Window Log

```typescript
class SlidingWindowLimiter {
  async checkLimit(
    identifier: string,
    limit: number,
    window: number
  ): Promise<boolean> {
    const key = `sliding:${identifier}`;
    const now = Date.now();
    const windowStart = now - window;

    // Get requests in current window
    const requests = await redis.zrangebyscore(
      key,
      windowStart,
      now,
      'WITHSCORES'
    );

    // Add current request
    await redis.zadd(key, now, `${now}-${crypto.randomUUID()}`);

    // Clean old requests
    await redis.zremrangebyscore(key, 0, windowStart);

    return requests.length < limit;
  }
}
```

#### 3.1.3 Per-Endpoint Limits

```typescript
const endpointLimits = {
  '/api/cells': { limit: 1000, window: 3600000 }, // 1000/hour
  '/api/cells/:id/evaluate': { limit: 100, window: 60000 }, // 100/minute
  '/api/colony': { limit: 10, window: 60000 }, // 10/minute
  '/api/auth/login': { limit: 5, window: 300000 } // 5/5 minutes
};

function applyRateLimit(endpoint: string) {
  const config = endpointLimits[endpoint] || { limit: 100, window: 60000 };

  return async (req, res, next) => {
    const identifier = req.user?.id || req.ip;
    const key = `${endpoint}:${identifier}`;

    const { allowed } = await rateLimiter.checkLimit(
      key,
      config.limit,
      config.window
    );

    if (!allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit: config.limit,
        window: config.window
      });
    }

    next();
  };
}

app.post('/api/auth/login', applyRateLimit('/api/auth/login'), loginHandler);
app.get('/api/cells', applyRateLimit('/api/cells'), getCellsHandler);
```

### 3.2 Input Validation

#### 3.2.1 Schema Validation with Zod

```typescript
import { z } from 'zod';

// Cell creation schema
const CreateCellSchema = z.object({
  type: z.enum(['input', 'output', 'transform', 'filter', 'aggregate']),
  position: z.object({
    row: z.number().int().min(0),
    column: z.number().int().min(0)
  }),
  formula: z.string().max(1000).optional(),
  dependencies: z.array(z.string()).max(100).default([]),
  metadata: z.record(z.any()).optional()
});

// Cell update schema
const UpdateCellSchema = z.object({
  formula: z.string().max(1000).optional(),
  metadata: z.record(z.any()).optional()
}).partial();

// Colony creation schema
const CreateColonySchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  description: z.string().max(500).optional(),
  config: z.object({
    agentCount: z.number().int().min(1).max(10000),
    communication: z.object({
      protocol: z.enum(['http', 'websocket', 'message-queue']),
      timeout: z.number().int().min(100).max(60000)
    })
  }).optional()
});

// Validation middleware
function validate(schema: z.ZodSchema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors
        });
      }
      next(error);
    }
  };
}

app.post('/api/cells', validate(CreateCellSchema), createCellHandler);
```

#### 3.2.2 SQL Injection Prevention

```typescript
import pg from 'pg';

const { Pool } = pg;

class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync('/path/to/ca-certificate.crt').toString()
      }
    });
  }

  async getCell(id: string): Promise<Cell | null> {
    // ✅ Parameterized query - prevents SQLi
    const result = await this.pool.query(
      'SELECT * FROM cells WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async searchCells(filters: CellFilters): Promise<Cell[]> {
    // ✅ Dynamic query with parameterization
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.type) {
      conditions.push(`type = $${paramIndex}`);
      values.push(filters.type);
      paramIndex++;
    }

    if (filters.createdAfter) {
      conditions.push(`created_at > $${paramIndex}`);
      values.push(filters.createdAfter);
      paramIndex++;
    }

    const query = `
      SELECT * FROM cells
      ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `;
    values.push(filters.limit || 100);

    const result = await this.pool.query(query, values);
    return result.rows;
  }
}
```

#### 3.2.3 NoSQL Injection Prevention

```typescript
import { ObjectId } from 'mongodb';

class MongoCellRepository {
  async findById(id: string): Promise<Cell | null> {
    // ✅ Use ObjectId to prevent injection
    try {
      const objectId = new ObjectId(id);
      return await db.cells.findOne({ _id: objectId });
    } catch {
      return null;
    }
  }

  async findComplex(query: CellQuery): Promise<Cell[]> {
    const mongoQuery: any = {};

    // ✅ Type-safe query building
    if (query.type) {
      mongoQuery.type = query.type;
    }

    if (query.minValue !== undefined) {
      mongoQuery.value = { ...mongoQuery.value, $gte: query.minValue };
    }

    if (query.maxValue !== undefined) {
      mongoQuery.value = { ...mongoQuery.value, $lte: query.maxValue };
    }

    return await db.cells.find(mongoQuery).toArray();
  }
}
```

### 3.3 Output Encoding

#### 3.3.1 HTML Encoding

```typescript
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// OR use a library
import * as sanitizeHtml from 'sanitize-html';

function sanitizeUserContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a'],
    allowedAttributes: {
      'a': ['href']
    },
    allowedIframeHostnames: []
  });
}
```

#### 3.3.2 JSON Encoding

```typescript
import escape from 'escape-html';

app.get('/api/cells/:id', (req, res) => {
  const cell = getCell(req.params.id);

  // ✅ Prevent JSON injection
  const safeCell = {
    id: cell.id,
    type: cell.type,
    // Sanitize user-provided strings
    name: escape(cell.name),
    description: escape(cell.description),
    value: cell.value
  };

  res.json(safeCell);
});
```

#### 3.3.3 URL Encoding

```typescript
import { URL } from 'url';

function buildSafeUrl(baseUrl: string, path: string, query: Record<string, string>): string {
  const url = new URL(path, baseUrl);

  Object.entries(query).forEach(([key, value]) => {
    // URL Component encoding
    url.searchParams.append(key, encodeURIComponent(value));
  });

  return url.toString();
}

// Usage
const url = buildSafeUrl('https://api.polln.ai', '/search', {
  q: userQuery,
  type: 'cells'
});
```

### 3.4 API Key Management

#### 3.4.1 API Key Generation

```typescript
class APIKeyService {
  async generateKey(userId: string, scopes: string[]): Promise<{
    key: string;
    keyId: string;
  }> {
    const keyId = crypto.randomBytes(16).toString('hex');
    const keySecret = crypto.randomBytes(32).toString('base64url');

    // Store hashed key (never plaintext)
    await db.apiKeys.create({
      keyId,
      keyHash: crypto.createHash('sha256').update(keySecret).digest('hex'),
      userId,
      scopes,
      createdAt: new Date(),
      lastUsed: null,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    });

    // Return full key (only time user sees it)
    const key = `polln_${keyId}_${keySecret}`;

    return { key, keyId };
  }

  async verifyKey(key: string): Promise<{
    valid: boolean;
    userId?: string;
    scopes?: string[];
  }> {
    const [prefix, keyId, keySecret] = key.split('_');

    if (prefix !== 'polln' || !keyId || !keySecret) {
      return { valid: false };
    }

    const keyRecord = await db.apiKeys.findOne({ keyId });

    if (!keyRecord || keyRecord.revoked) {
      return { valid: false };
    }

    if (keyRecord.expiresAt < new Date()) {
      return { valid: false };
    }

    const keyHash = crypto.createHash('sha256').update(keySecret).digest('hex');

    if (keyHash !== keyRecord.keyHash) {
      return { valid: false };
    }

    // Update last used
    await db.apiKeys.update(keyRecord.id, { lastUsed: new Date() });

    return {
      valid: true,
      userId: keyRecord.userId,
      scopes: keyRecord.scopes
    };
  }

  async revokeKey(keyId: string, userId: string): Promise<boolean> {
    const result = await db.apiKeys.updateOne(
      { keyId, userId },
      { revoked: true, revokedAt: new Date() }
    );

    return result.modifiedCount > 0;
  }
}
```

#### 3.4.2 API Key Middleware

```typescript
function apiKeyAuth(requiredScopes: string[] = []) {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const verification = await apiKeyService.verifyKey(apiKey);

    if (!verification.valid) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Check scopes
    const hasRequiredScopes = requiredScopes.every(scope =>
      verification.scopes!.includes(scope)
    );

    if (!hasRequiredScopes) {
      return res.status(403).json({ error: 'Insufficient scopes' });
    }

    req.user = {
      id: verification.userId,
      type: 'api-key',
      scopes: verification.scopes
    };

    next();
  };
}

// Usage
app.post('/api/cells',
  apiKeyAuth(['cells:write']),
  createCellHandler
);

app.get('/api/cells',
  apiKeyAuth(['cells:read']),
  getCellsHandler
);
```

### 3.5 GraphQL Security Considerations

#### 3.5.1 Query Depth Limiting

```typescript
import { parse, visit, GraphQLSchema } from 'graphql';

function getMaxQueryDepth(query: string, schema: GraphQLSchema): number {
  const ast = parse(query);
  let maxDepth = 0;

  visit(ast, {
    Field(node, key, parent, path, ancestors) {
      const depth = ancestors.length;
      maxDepth = Math.max(maxDepth, depth);
    }
  });

  return maxDepth;
}

function depthLimitMiddleware(maxDepth: number) {
  return (req, res, next) => {
    const query = req.body.query;

    if (!query) {
      return next();
    }

    const depth = getMaxQueryDepth(query, schema);

    if (depth > maxDepth) {
      return res.status(400).json({
        error: `Query depth ${depth} exceeds maximum depth of ${maxDepth}`
      });
    }

    next();
  };
}

app.use('/graphql', depthLimitMiddleware(7));
```

#### 3.5.2 Query Complexity Analysis

```typescript
interface ComplexityRule {
  fieldName: string;
  complexity: number;
  multiplier?: (args: any) => number;
}

const complexityRules: ComplexityRule[] = [
  { fieldName: 'cells', complexity: 1 },
  { fieldName: 'cell', complexity: 1 },
  {
    fieldName: 'colony',
    complexity: 10,
    multiplier: (args) => args.limit || 1
  },
  {
    fieldName: 'nestedDependencies',
    complexity: 5,
    multiplier: (args) => args.depth || 1
  }
];

function calculateQueryComplexity(query: string, variables: any): number {
  const ast = parse(query);
  let totalComplexity = 0;

  visit(ast, {
    Field(node) {
      const rule = complexityRules.find(r => r.fieldName === node.name.value);

      if (rule) {
        const multiplier = rule.multiplier
          ? rule.multiplier(getArgumentsValues(node, variables))
          : 1;

        totalComplexity += rule.complexity * multiplier;
      }
    }
  });

  return totalComplexity;
}

function complexityLimitMiddleware(maxComplexity: number) {
  return (req, res, next) => {
    const { query, variables } = req.body;

    if (!query) {
      return next();
    }

    const complexity = calculateQueryComplexity(query, variables);

    if (complexity > maxComplexity) {
      return res.status(400).json({
        error: `Query complexity ${complexity} exceeds maximum of ${maxComplexity}`
      });
    }

    next();
  };
}

app.use('/graphql', complexityLimitMiddleware(1000));
```

#### 3.5.3 Authorization Directives

```typescript
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { defaultFieldResolver, GraphQLField } from 'graphql';

class AuthDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    const requiredRole = this.args.requires;

    field.resolve = async function (...args) {
      const [source, {}, { user }] = args;

      if (!user) {
        throw new Error('Authentication required');
      }

      if (requiredRole && !user.roles.includes(requiredRole)) {
        throw new Error(`Role "${requiredRole}" required`);
      }

      return resolve.apply(this, args);
    };
  }
}

class RateLimitDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    const limit = this.args.limit;
    const window = this.args.window;

    field.resolve = async function (...args) {
      const [source, {}, { user }] = args;

      const key = `graphql:${user.id}:${field.name}`;
      const { allowed } = await rateLimiter.checkLimit(key, limit, window);

      if (!allowed) {
        throw new Error('Rate limit exceeded');
      }

      return resolve.apply(this, args);
    };
  }
}

// Schema definition
const typeDefs = `
  directive @auth(requires: String) on FIELD_DEFINITION
  directive @rateLimit(limit: Int, window: Int) on FIELD_DEFINITION

  type Cell {
    id: ID!
    type: String!
    value: String
    colony: Colony @rateLimit(limit: 10, window: 60000)
  }

  type Colony {
    id: ID!
    name: String!
    agents: [Agent!]! @auth(requires: "ADMIN")
  }

  type Query {
    cell(id: ID!): Cell @auth(requires: "USER")
    cells: [Cell!]!
  }
`;
```

#### 3.5.4 Disable Introspection in Production

```typescript
import { GraphQLServer } from 'graphql-yoga';

const server = new GraphQLServer({
  typeDefs,
  resolvers,
  context: ({ request }) => ({
    user: request.user
  })
});

// Disable introspection in production
if (process.env.NODE_ENV === 'production') {
  const serverOptions = server.options;
  serverOptions.validationRules = [
    ...serverOptions.validationRules,
    (context) => {
      if (context.isIntrospection) {
        throw new Error('Introspection is disabled in production');
      }
    }
  };
}
```

---

## 4. Data Security

### 4.1 Encryption at Rest

#### 4.1.1 Database Encryption (PostgreSQL)

```sql
-- Enable Transparent Data Encryption (TDE)
-- Requires: PostgreSQL with pgcrypto extension

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Column-level encryption
CREATE TABLE encrypted_cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encrypted_value BYTEA, -- Encrypted data
    metadata JSONB
);

-- Encryption function
CREATE OR REPLACE FUNCTION encrypt_data(data TEXT, key TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(data, key);
END;
$$ LANGUAGE plpgsql;

-- Decryption function
CREATE OR REPLACE FUNCTION decrypt_data(encrypted_data BYTEA, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_data, key);
END;
$$ LANGUAGE plpgsql;

-- Usage
INSERT INTO encrypted_cells (encrypted_value)
VALUES (encrypt_data('sensitive data', pgp_sym_encrypt('secret', 'encryption-key')));

SELECT id, decrypt_data(encrypted_value, 'encryption-key') as value
FROM encrypted_cells;
```

#### 4.1.2 Application-Level Encryption

```typescript
import crypto from 'crypto';

class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  private ivLength = 16;  // 128 bits
  private authTagLength = 16;

  constructor(private masterKey: Buffer) {
    if (masterKey.length !== this.keyLength) {
      throw new Error(`Key must be ${this.keyLength} bytes`);
    }
  }

  encrypt(plaintext: string): {
    encrypted: string;
    iv: string;
    authTag: string;
  } {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.masterKey,
      iv
    );

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.masterKey,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // For field-level encryption
  encryptField(field: string, value: any): string {
    const plaintext = JSON.stringify(value);
    const { encrypted, iv, authTag } = this.encrypt(plaintext);

    // Store as: encrypted:iv:authTag
    return `${encrypted}:${iv}:${authTag}`;
  }

  decryptField(encryptedField: string): any {
    const [encrypted, iv, authTag] = encryptedField.split(':');
    const decrypted = this.decrypt(encrypted, iv, authTag);
    return JSON.parse(decrypted);
  }
}

// Usage
const encryptionService = new EncryptionService(
  Buffer.from(process.env.ENCRYPTION_MASTER_KEY!, 'hex')
);

// Encrypt before saving
const cellData = {
  type: 'transform',
  formula: '=SUM(A1:A10)',
  // Encrypt PII
  owner: encryptionService.encryptField('owner', 'user@example.com')
};

// Decrypt after reading
const decrypted = encryptionService.decryptField(cellData.owner);
```

### 4.2 Encryption in Transit (TLS)

#### 4.2.1 HTTPS Configuration (Node.js)

```typescript
import https from 'https';
import fs from 'fs';
import express from 'express';

const app = express();

// HTTPS options
const httpsOptions = {
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem'),
  ca: fs.readFileSync('/path/to/ca-bundle.crt'),
  minVersion: 'TLSv1.2', // Require TLS 1.2 or higher
  ciphers: [
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305'
  ].join(':'),
  honorCipherOrder: true,
  rejectUnauthorized: true
};

// Create HTTPS server
const server = https.createServer(httpsOptions, app);

// HSTS header
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  next();
});

server.listen(443);
```

#### 4.2.2 TLS Configuration for Database

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt').toString(),
    cert: fs.readFileSync('/path/to/client-certificate.crt').toString(),
    key: fs.readFileSync('/path/to/client-key.pem').toString(),
    minVersion: 'TLSv1.2'
  }
});
```

### 4.3 Field-Level Encryption

#### 4.3.1 PII Field Encryption

```typescript
import { Transform, TransformOptions } from 'stream';

class FieldEncryptor {
  private piiFields = ['email', 'phone', 'ssn', 'creditCard'];

  encryptObject(obj: Record<string, any>): Record<string, any> {
    const encrypted = { ...obj };

    for (const field of this.piiFields) {
      if (encrypted[field]) {
        encrypted[field] = encryptionService.encryptField(
          field,
          encrypted[field]
        );
      }
    }

    return encrypted;
  }

  decryptObject(obj: Record<string, any>): Record<string, any> {
    const decrypted = { ...obj };

    for (const field of this.piiFields) {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          decrypted[field] = encryptionService.decryptField(
            decrypted[field]
          );
        } catch {
          // Field not encrypted, leave as-is
        }
      }
    }

    return decrypted;
  }
}

// Usage with database
const fieldEncryptor = new FieldEncryptor();

async function createUser(userData: CreateUserDto): Promise<User> {
  // Encrypt PII before saving
  const encryptedData = fieldEncryptor.encryptObject(userData);

  return await db.users.create(encryptedData);
}

async function getUser(userId: string): Promise<User> {
  const user = await db.users.findOne({ id: userId });

  // Decrypt PII after reading
  return fieldEncryptor.decryptObject(user);
}
```

### 4.4 Key Management (KMS)

#### 4.4.1 AWS KMS Integration

```typescript
import { KMSClient, DecryptCommand, EncryptCommand } from '@aws-sdk/client-kms';

const kmsClient = new KMSClient({
  region: process.env.AWS_REGION
});

class KMSService {
  private keyId: string;

  constructor() {
    this.keyId = process.env.KMS_KEY_ID!;
  }

  async encrypt(plaintext: string): Promise<string> {
    const command = new EncryptCommand({
      KeyId: this.keyId,
      Plaintext: Buffer.from(plaintext)
    });

    const response = await kmsClient.send(command);
    return Buffer.from(response.CiphertextBlob!).toString('base64');
  }

  async decrypt(ciphertext: string): Promise<string> {
    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(ciphertext, 'base64')
    });

    const response = await kmsClient.send(command);
    return response.Plaintext!.toString();
  }

  async generateDataKey(): Promise<{
    plaintextKey: string;
    encryptedKey: string;
  }> {
    const { GenerateDataKeyCommand } = await import('@aws-sdk/client-kms');

    const command = new GenerateDataKeyCommand({
      KeyId: this.keyId,
      KeySpec: 'AES_256'
    });

    const response = await kmsClient.send(command);

    return {
      plaintextKey: Buffer.from(response.Plaintext!).toString('base64'),
      encryptedKey: Buffer.from(response.CiphertextBlob!).toString('base64')
    };
  }
}
```

#### 4.4.2 Key Rotation

```typescript
class KeyRotationService {
  async rotateMasterKey(): Promise<void> {
    // Generate new master key
    const newMasterKey = crypto.randomBytes(32);

    // Encrypt with KMS
    const kmsService = new KMSService();
    const encryptedNewKey = await kmsService.encrypt(
      newMasterKey.toString('hex')
    );

    // Store in database (versioned)
    await db.encryptionKeys.create({
      version: Date.now(),
      encryptedKey: encryptedNewKey,
      createdAt: new Date(),
      isActive: true
    });

    // Deactivate old key
    await db.encryptionKeys.updateMany(
      { isActive: true },
      { isActive: false, rotatedAt: new Date() }
    );

    // Re-encrypt sensitive data with new key
    await this.reencryptData(newMasterKey);
  }

  private async reencryptData(newKey: Buffer): Promise<void> {
    const batchSize = 100;
    let offset = 0;

    while (true) {
      const records = await db.encryptedData.find()
        .limit(batchSize)
        .skip(offset)
        .toArray();

      if (records.length === 0) break;

      for (const record of records) {
        // Decrypt with old key
        const oldService = new EncryptionService(record.keyVersion);
        const plaintext = oldService.decryptField(record.encryptedData);

        // Encrypt with new key
        const newService = new EncryptionService(newKey);
        const reencrypted = newService.encryptField('data', plaintext);

        await db.encryptedData.update(record.id, {
          encryptedData: reencrypted,
          keyVersion: newKey.toString('hex'),
          reencryptedAt: new Date()
        });
      }

      offset += batchSize;
    }
  }
}
```

### 4.5 PII Handling

#### 4.5.1 Data Classification

```typescript
enum DataClassification {
  PUBLIC = 'public',           // Safe to share
  INTERNAL = 'internal',       // Company internal only
  CONFIDENTIAL = 'confidential', // Sensitive business data
  RESTRICTED = 'restricted'     // PII, regulated data
}

interface DataObject {
  data: any;
  classification: DataClassification;
  retentionPeriod: number; // days
}

const dataClassificationRules = {
  // Cell data
  cellType: { classification: DataClassification.PUBLIC },
  cellFormula: { classification: DataClassification.INTERNAL },
  cellValue: { classification: DataClassification.INTERNAL },

  // User data
  userName: { classification: DataClassification.PUBLIC },
  userEmail: { classification: DataClassification.RESTRICTED },
  userPhone: { classification: DataClassification.RESTRICTED },
  userAddress: { classification: DataClassification.RESTRICTED },
  userSSN: { classification: DataClassification.RESTRICTED },

  // Colony data
  colonyName: { classification: DataClassification.INTERNAL },
  colonyConfig: { classification: DataClassification.CONFIDENTIAL },
  colonyMetrics: { classification: DataClassification.CONFIDENTIAL }
};

function classifyData(field: string, value: any): DataClassification {
  const rule = dataClassificationRules[field];
  return rule?.classification || DataClassification.INTERNAL;
}
```

#### 4.5.2 GDPR Compliance

```typescript
class GDPRService {
  // Right to Access (DSAR - Data Subject Access Request)
  async exportUserData(userId: string): Promise<{
    userData: any;
    cellData: any;
    colonyData: any;
    auditLog: any;
  }> {
    const userData = await db.users.findOne({ id: userId });
    const cellData = await db.cells.find({ ownerId: userId }).toArray();
    const colonyData = await db.colonies.find({ ownerId: userId }).toArray();
    const auditLog = await db.auditLogs.find({ userId }).toArray();

    return {
      userData: this.sanitizeForExport(userData),
      cellData,
      colonyData,
      auditLog
    };
  }

  // Right to Erasure ("Right to be Forgotten")
  async deleteUserData(userId: string): Promise<void> {
    // Soft delete (keep for legal requirements)
    await db.users.update(userId, {
      deleted: true,
      deletedAt: new Date(),
      dataPurged: true
    });

    // Anonymize cells
    await db.cells.updateMany(
      { ownerId: userId },
      {
        ownerId: null,
        anonymized: true
      }
    );

    // Log deletion
    await db.auditLogs.create({
      action: 'GDPR_ERASURE',
      userId,
      timestamp: new Date(),
      metadata: { reason: 'User request' }
    });
  }

  // Right to Rectification
  async updateUserData(
    userId: string,
    updates: Partial<User>
  ): Promise<User> {
    const oldData = await db.users.findOne({ id: userId });

    const updated = await db.users.update(userId, updates);

    // Audit trail
    await db.auditLogs.create({
      action: 'GDPR_RECTIFICATION',
      userId,
      timestamp: new Date(),
      changes: this.diff(oldData, updated)
    });

    return updated;
  }

  // Right to Portability
  async exportUserDataMachineReadable(userId: string): Promise<{
    json: string;
    csv: string;
  }> {
    const data = await this.exportUserData(userId);

    return {
      json: JSON.stringify(data, null, 2),
      csv: this.convertToCSV(data)
    };
  }

  private sanitizeForExport(data: any): any {
    // Remove sensitive fields
    const { passwordHash, mfaSecret, ...sanitized } = data;
    return sanitized;
  }

  private diff(oldData: any, newData: any): Record<string, { from: any; to: any }> {
    const changes: Record<string, any> = {};

    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          from: oldData[key],
          to: newData[key]
        };
      }
    }

    return changes;
  }

  private convertToCSV(data: any): string {
    // Convert to CSV format
    // Implementation depends on data structure
    return '';
  }
}

// Data Retention
class DataRetentionService {
  async applyRetentionPolicy(): Promise<void> {
    const now = new Date();

    // Delete audit logs older than 1 year
    await db.auditLogs.deleteMany({
      timestamp: {
        $lt: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      }
    });

    // Archive deleted users after 30 days
    await db.users.updateMany(
      {
        deleted: true,
        deletedAt: {
          $lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      {
        archived: true,
        dataPurged: true
      }
    );
  }
}
```

#### 4.5.3 CCPA Compliance

```typescript
class CCPAService {
  // Right to Know
  async discloseDataCollected(userId: string): Promise<{
    categories: string[];
    pieces: any[];
    sources: string[];
    businessPurposes: string[];
  }> {
    const userData = await this.getUserData(userId);

    return {
      categories: this.getCategories(userData),
      pieces: userData,
      sources: ['Direct input', 'Third-party integrations'],
      businessPurposes: [
        'Provide spreadsheet services',
        'Improve product features',
        'Communicate with users'
      ]
    };
  }

  // Right to Delete
  async requestDeletion(userId: string): Promise<void> {
    // Similar to GDPR erasure
    await gdprService.deleteUserData(userId);
  }

  // Right to Opt-Out
  async optOutSale(userId: string): Promise<void> {
    await db.users.update(userId, {
      dataSaleOptOut: true,
      optOutTimestamp: new Date()
    });
  }

  // Right to Non-Discrimination
  async ensureNonDiscrimination(userId: string): Promise<void> {
    const user = await db.users.findOne({ id: userId });

    if (user.dataSaleOptOut) {
      // Ensure no service degradation
      // Same pricing, same access, same quality
    }
  }

  private getCategories(userData: any): string[] {
    const categories: string[] = [];

    if (userData.email) categories.push('Identifiers');
    if (userData.name) categories.push('Personal information');
    if (userData.usage) categories.push('Usage data');
    if (userData.location) categories.push('Geolocation');

    return categories;
  }

  private async getUserData(userId: string): Promise<any[]> {
    const user = await db.users.findOne({ id: userId });
    const cells = await db.cells.find({ ownerId: userId }).toArray();
    const colonies = await db.colonies.find({ ownerId: userId }).toArray();

    return [user, ...cells, ...colonies];
  }
}
```

---

## 5. WebSocket Security

### 5.1 Authentication Mechanisms

#### 5.1.1 Token-Based Authentication

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';

const wss = new WebSocketServer({
  port: 8080,
  verifyClient: async (info, cb) => {
    try {
      // Extract token from query string or header
      const token = new URL(info.req.url!, 'http://localhost')
        .searchParams.get('token');

      if (!token) {
        return cb(false, 401, 'Unauthorized');
      }

      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_PUBLIC_KEY!);

      // Attach user to request
      (info.req as any).user = decoded;

      cb(true);
    } catch (error) {
      cb(false, 401, 'Invalid token');
    }
  }
});

wss.on('connection', (ws: WebSocket, req) => {
  const user = (req as any).user;

  console.log(`User ${user.userId} connected`);

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());

      // Process authenticated message
      await handleMessage(ws, user, message);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });
});
```

#### 5.1.2 Session-Based Authentication

```typescript
import session from 'express-session';
import * as ws from 'ws';

function upgradeAuth(request: any, socket: any, head: Buffer) {
  session({
    secret: process.env.SESSION_SECRET!,
    saveUninitialized: false,
    resave: false
  })(request as any, {} as any, () => {
    // Check if user is authenticated
    if (!request.session || !request.session.userId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Upgrade connection
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
}

const server = http.createServer(app);
server.on('upgrade', upgradeAuth);
```

### 5.2 Authorization Checks

#### 5.2.1 Per-Message Authorization

```typescript
interface AuthContext {
  userId: string;
  roles: string[];
  permissions: string[];
}

interface WSMessage {
  type: string;
  resource: string;
  action: string;
  data: any;
}

function authorizeMessage(context: AuthContext, message: WSMessage): boolean {
  const { resource, action } = message;

  // Check permission
  const requiredPermission = `${resource}:${action}`;
  if (!context.permissions.includes(requiredPermission)) {
    return false;
  }

  // Check role-based access
  if (resource === 'colony' && action === 'delete') {
    return context.roles.includes('ADMIN');
  }

  return true;
}

wss.on('connection', (ws: WebSocket, req) => {
  const user = (req as any).user as AuthContext;

  ws.on('message', (data: Buffer) => {
    const message: WSMessage = JSON.parse(data.toString());

    // Authorize
    if (!authorizeMessage(user, message)) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Unauthorized',
        code: 'FORBIDDEN'
      }));
      return;
    }

    // Process message
    handleMessage(ws, user, message);
  });
});
```

#### 5.2.2 Resource-Level Authorization

```typescript
class ResourceAuthorization {
  async canAccessCell(userId: string, cellId: string): Promise<boolean> {
    const cell = await db.cells.findOne({ id: cellId });

    if (!cell) return false;

    // Owner can always access
    if (cell.ownerId === userId) return true;

    // Check shared access
    const sharedAccess = await db.cellAccess.findOne({
      cellId,
      userId
    });

    return !!sharedAccess;
  }

  async canModifyColony(userId: string, colonyId: string): Promise<boolean> {
    const colony = await db.colonies.findOne({ id: colonyId });
    const user = await db.users.findOne({ id: userId });

    if (!colony || !user) return false;

    // Owner can modify
    if (colony.ownerId === userId) return true;

    // Admin can modify
    if (user.roles.includes('ADMIN')) return true;

    // Check editor role
    const membership = await db.colonyMembers.findOne({
      colonyId,
      userId
    });

    return membership?.role === 'EDITOR';
  }
}

const resourceAuth = new ResourceAuthorization();

wss.on('connection', (ws: WebSocket, req) => {
  const user = (req as any).user;

  ws.on('message', async (data: Buffer) => {
    const message = JSON.parse(data.toString());

    // Resource-level authorization
    if (message.resource === 'cell') {
      const canAccess = await resourceAuth.canAccessCell(
        user.userId,
        message.data.cellId
      );

      if (!canAccess) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Access denied to cell'
        }));
        return;
      }
    }

    // Process message
    await handleMessage(ws, user, message);
  });
});
```

### 5.3 Message Validation

#### 5.3.1 Schema Validation

```typescript
import { z } from 'zod';

// Message schemas
const CellUpdateSchema = z.object({
  type: z.literal('cell:update'),
  cellId: z.string().uuid(),
  value: z.any(),
  timestamp: z.number()
});

const ColonyCommandSchema = z.object({
  type: z.literal('colony:command'),
  colonyId: z.string().uuid(),
  command: z.enum(['start', 'stop', 'scale', 'reset']),
  params: z.record(z.any()).optional()
});

const WSMessageSchema = z.discriminatedUnion('type', [
  CellUpdateSchema,
  ColonyCommandSchema
]);

function validateMessage(data: unknown) {
  try {
    return WSMessageSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid message: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (data: Buffer) => {
    try {
      const parsed = JSON.parse(data.toString());
      const message = validateMessage(parsed);

      // Process valid message
      handleMessage(ws, message);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });
});
```

#### 5.3.2 Message Size Limits

```typescript
const MAX_MESSAGE_SIZE = 1024 * 1024; // 1 MB
const MAX_MESSAGE_RATE = 100; // messages per second

class WebSocketConnection {
  private messageCount: number = 0;
  private lastReset: number = Date.now();

  constructor(private ws: WebSocket, private userId: string) {
    this.setupLimits();
  }

  private setupLimits() {
    // Message size limit
    this.ws.on('message', (data: Buffer) => {
      if (data.length > MAX_MESSAGE_SIZE) {
        this.ws.send(JSON.stringify({
          type: 'error',
          message: 'Message too large',
          maxSize: MAX_MESSAGE_SIZE
        }));
        this.ws.close(1009, 'Message too large');
        return;
      }

      // Rate limit
      this.messageCount++;
      const now = Date.now();

      if (now - this.lastReset >= 1000) {
        // Reset counter every second
        this.messageCount = 0;
        this.lastReset = now;
      }

      if (this.messageCount > MAX_MESSAGE_RATE) {
        this.ws.send(JSON.stringify({
          type: 'error',
          message: 'Rate limit exceeded',
          limit: MAX_MESSAGE_RATE
        }));
        this.ws.close(1008, 'Rate limit exceeded');
        return;
      }
    });
  }
}
```

### 5.4 Rate Limiting Per Connection

```typescript
class WebSocketRateLimiter {
  private connections = new Map<string, number[]>();

  checkLimit(userId: string, limit: number, window: number): boolean {
    const now = Date.now();
    const timestamps = this.connections.get(userId) || [];

    // Remove old timestamps
    const validTimestamps = timestamps.filter(
      ts => now - ts < window
    );

    // Check limit
    if (validTimestamps.length >= limit) {
      return false;
    }

    // Add current timestamp
    validTimestamps.push(now);
    this.connections.set(userId, validTimestamps);

    return true;
  }

  removeConnection(userId: string) {
    this.connections.delete(userId);
  }
}

const wsRateLimiter = new WebSocketRateLimiter();

wss.on('connection', (ws: WebSocket, req) => {
  const user = (req as any).user;

  ws.on('message', (data: Buffer) => {
    // Check rate limit
    const allowed = wsRateLimiter.checkLimit(
      user.userId,
      100, // 100 messages
      60000 // per minute
    );

    if (!allowed) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Rate limit exceeded'
      }));
      return;
    }

    // Process message
    handleMessage(ws, user, JSON.parse(data.toString()));
  });

  ws.on('close', () => {
    wsRateLimiter.removeConnection(user.userId);
  });
});
```

---

## 6. Infrastructure Security

### 6.1 Container Security

#### 6.1.1 Docker Hardening

```dockerfile
# Use minimal, signed base image
FROM node:20-alpine AS builder

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install security updates
RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init

# Multi-stage build
FROM node:20-alpine

# Copy only necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set security options
USER nodejs
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Use read-only root filesystem
RUN mkdir -p /tmp && \
    chown -R nodejs:nodejs /tmp

# Set security headers
ENV NODE_ENV=production
ENV PORT=8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# Read-only root filesystem (requires volume for /tmp)
# VOLUME ["/tmp"]
```

#### 6.1.2 Docker Security Options

```yaml
# docker-compose.yml with security options
version: '3.8'

services:
  app:
    build: .
    security_opt:
      - no-new-privileges:true
      - seccomp:seccomp-profile.json
      - apparmor:docker-apparmor-profile
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
    user: "1001:1001"
    networks:
      - internal
    environment:
      - NODE_ENV=production
    secrets:
      - db_password
      - jwt_secret

networks:
  internal:
    driver: bridge
    internal: true

secrets:
  db_password:
    external: true
  jwt_secret:
    external: true
```

#### 6.1.3 Kubernetes Hardening

```yaml
# deployment.yaml with security context
apiVersion: apps/v1
kind: Deployment
metadata:
  name: polln-app
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: polln
    spec:
      serviceAccountName: polln-service-account
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: app
        image: polln:latest
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1001
          capabilities:
            drop:
            - ALL
            add:
            - NET_BIND_SERVICE
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
```

### 6.2 Network Segmentation

#### 6.2.1 VPC Configuration

```typescript
// AWS VPC configuration
const vpcConfig = {
  cidrBlock: '10.0.0.0/16',
  enableDnsHostnames: true,
  enableDnsSupport: true,

  subnets: {
    public: {
      cidr: '10.0.1.0/24',
      accessibility: 'public',
      resources: ['load-balancer']
    },
    private: {
      cidr: '10.0.2.0/24',
      accessibility: 'private',
      resources: ['application']
    },
    data: {
      cidr: '10.0.3.0/24',
      accessibility: 'private-isolated',
      resources: ['database', 'redis', 'queue']
    }
  },

  securityGroups: {
    loadBalancer: {
      ingress: [
        { protocol: 'TCP', port: 443, source: '0.0.0.0/0' },
        { protocol: 'TCP', port: 80, source: '0.0.0.0/0' }
      ],
      egress: [
        { protocol: 'TCP', port: 8080, destination: '10.0.2.0/24' }
      ]
    },

    application: {
      ingress: [
        { protocol: 'TCP', port: 8080, source: '10.0.1.0/24' }
      ],
      egress: [
        { protocol: 'TCP', port: 5432, destination: '10.0.3.0/24' }, // PostgreSQL
        { protocol: 'TCP', port: 6379, destination: '10.0.3.0/24' }, // Redis
        { protocol: 'TCP', port: 443, destination: '0.0.0.0/0' }      // External APIs
      ]
    },

    database: {
      ingress: [
        { protocol: 'TCP', port: 5432, source: '10.0.2.0/24' }
      ],
      egress: []
    }
  }
};
```

#### 6.2.2 Network Policies (Kubernetes)

```yaml
# Network policy to restrict traffic
apiVersion: networking.k8s.io/v1
kind:NetworkPolicy
metadata:
  name: polln-network-policy
spec:
  podSelector:
    matchLabels:
      app: polln
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443
```

### 6.3 Secret Management (Vault)

#### 6.3.1 HashiCorp Vault Integration

```typescript
import { Client } from 'node-vault';

class VaultService {
  private client: Client;

  constructor() {
    this.client = new Client({
      endpoint: process.env.VAULT_ADDR!,
      token: process.env.VAULT_TOKEN!
    });
  }

  async writeSecret(path: string, data: Record<string, any>): Promise<void> {
    await this.client.write(`secret/data/${path}`, {
      data
    });
  }

  async readSecret(path: string): Promise<Record<string, any> | null> {
    try {
      const result = await this.client.read(`secret/data/${path}`);
      return result.data.data;
    } catch (error) {
      if (error.response?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async getDatabaseCredentials(): Promise<{
    username: string;
    password: string;
  }> {
    // Generate dynamic credentials
    const result = await this.client.write('database/creds/polln-role', {
      ttl: '1h'
    });

    return {
      username: result.data.username,
      password: result.data.password
    };
  }

  async revokeDatabaseCredentials(leaseId: string): Promise<void> {
    await this.client.put(`sys/leases/revoke/${leaseId}`);
  }
}

// Usage
const vaultService = new VaultService();

// Get database credentials (rotated automatically)
const dbCreds = await vaultService.getDatabaseCredentials();

// Use credentials
const pool = new Pool({
  host: 'postgres.internal',
  user: dbCreds.username,
  password: dbCreds.password,
  database: 'polln'
});

// Revoke when done (or let TTL expire)
await vaultService.revokeDatabaseCredentials(dbCreds.leaseId);
```

#### 6.3.2 AWS Secrets Manager Integration

```typescript
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  RotateSecretCommand
} from '@aws-sdk/client-secrets-manager';

class AWSSecretsService {
  private client: SecretsManagerClient;

  constructor() {
    this.client = new SecretsManagerClient({ region: process.env.AWS_REGION });
  }

  async getSecret(secretName: string): Promise<any> {
    const command = new GetSecretValueCommand({
      SecretId: secretName
    });

    const response = await this.client.send(command);

    if (response.SecretString) {
      return JSON.parse(response.SecretString);
    }

    if (response.SecretBinary) {
      return JSON.parse(
        Buffer.from(response.SecretBinary).toString('utf-8')
      );
    }

    throw new Error('Secret not found');
  }

  async getDatabaseCredentials(): Promise<{
    username: string;
    password: string;
    host: string;
    port: number;
    dbname: string;
  }> {
    return await this.getSecret('polln/prod/database');
  }

  async rotateSecret(secretName: string): Promise<void> {
    const command = new RotateSecretCommand({
      SecretId: secretName
    });

    await this.client.send(command);
  }
}
```

### 6.4 Security Monitoring (SIEM)

#### 6.4.1 Structured Logging

```typescript
import pino from 'pino';

const logger = pino({
  name: 'polln-security',
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { severity: label };
    }
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'user.email',
      'user.phone'
    ],
    remove: true
  }
});

// Security event logging
function logSecurityEvent(event: {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
}) {
  logger.warn({
    ...event,
    timestamp: new Date().toISOString(),
    event_type: 'security'
  });
}

// Usage
logSecurityEvent({
  type: 'AUTHENTICATION_FAILURE',
  severity: 'medium',
  userId: undefined,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  details: {
    reason: 'Invalid credentials',
    username: req.body.username
  }
});
```

#### 6.4.2 Alerting Rules

```typescript
interface AlertRule {
  name: string;
  condition: (events: SecurityEvent[]) => boolean;
  action: (events: SecurityEvent[]) => void;
  cooldown: number; // milliseconds
}

class SecurityMonitor {
  private alertRules: AlertRule[] = [
    {
      name: 'Brute Force Attack',
      condition: (events) => {
        const failedAuths = events.filter(
          e => e.type === 'AUTHENTICATION_FAILURE'
        );

        // 10+ failed auths from same IP in 5 minutes
        return failedAuths.length >= 10;
      },
      action: (events) => {
        const ip = events[0].ipAddress;
        firewall.blockIP(ip, 3600); // Block for 1 hour
        notifySecurityTeam({
          type: 'BRUTE_FORCE',
          ip,
          count: events.length
        });
      },
      cooldown: 300000 // 5 minutes
    },

    {
      name: 'Privilege Escalation Attempt',
      condition: (events) => {
        return events.some(
          e => e.type === 'UNAUTHORIZED_ADMIN_ACCESS'
        );
      },
      action: (events) => {
        notifySecurityTeam({
          type: 'PRIVILEGE_ESCALATION',
          events
        });
      },
      cooldown: 60000 // 1 minute
    },

    {
      name: 'Data Exfiltration',
      condition: (events) => {
        const exports = events.filter(
          e => e.type === 'DATA_EXPORT'
        );

        // Large export or multiple exports
        return exports.some(e => e.details.size > 100_000_000) ||
               exports.length > 10;
      },
      action: (events) => {
        notifySecurityTeam({
          type: 'DATA_EXFILTRATION',
          events
        });
      },
      cooldown: 60000
    }
  ];

  async evaluateRules(events: SecurityEvent[]): Promise<void> {
    for (const rule of this.alertRules) {
      if (await this.shouldTrigger(rule, events)) {
        rule.action(events);
        await this.recordTrigger(rule);
      }
    }
  }

  private async shouldTrigger(rule: AlertRule, events: SecurityEvent[]): Promise<boolean> {
    // Check cooldown
    const lastTriggered = await this.getLastTriggerTime(rule.name);
    const now = Date.now();

    if (lastTriggered && now - lastTriggered < rule.cooldown) {
      return false;
    }

    return rule.condition(events);
  }

  private async getLastTriggerTime(ruleName: string): Promise<number | null> {
    const key = `alert:${ruleName}:lastTriggered`;
    const value = await redis.get(key);
    return value ? parseInt(value) : null;
  }

  private async recordTrigger(rule: AlertRule): Promise<void> {
    const key = `alert:${rule.name}:lastTriggered`;
    await redis.set(key, Date.now(), 'PX', rule.cooldown);
  }
}
```

#### 6.4.3 SIEM Integration

```typescript
interface SIEMEvent {
  timestamp: string;
  severity: string;
  category: string;
  source: string;
  message: string;
  details: Record<string, any>;
}

class SIEMService {
  async sendToSIEM(event: SIEMEvent): Promise<void> {
    // Send to Elasticsearch / Splunk / Sumo Logic
    await axios.post(
      process.env.SIEM_ENDPOINT!,
      event,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SIEM_TOKEN}`
        }
      }
    );
  }

  async forwardSecurityEvents(events: SecurityEvent[]): Promise<void> {
    for (const event of events) {
      const siemEvent: SIEMEvent = {
        timestamp: event.timestamp,
        severity: event.severity,
        category: 'security',
        source: 'polln-app',
        message: event.type,
        details: {
          userId: event.userId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          ...event.details
        }
      };

      await this.sendToSIEM(siemEvent);
    }
  }
}
```

---

## 7. Compliance

### 7.1 SOC 2 Type II Requirements

#### 7.1.1 Security Controls

```
SOC 2 SECURITY CRITERIA CHECKLIST
├── Access Control
│   ├── User provisioning and deprovisioning
│   ├── Role-based access control (RBAC)
│   ├── Multi-factor authentication (MFA)
│   ├── Periodic access reviews
│   └── Privileged access management
│
├── System Monitoring
│   ├── Log collection and retention (90+ days)
│   ├── Real-time alerting
│   ├── Intrusion detection/prevention
│   ├── Performance monitoring
│   └── Security incident tracking
│
├── Change Management
│   ├── Formal change approval process
│   ├── Testing before production
│   ├── Rollback procedures
│   ├── Change documentation
│   └── Configuration management
│
├── Incident Response
│   ├── Incident response plan
│   ├── Incident classification
│   ├── Escalation procedures
│   ├── Post-incident review
│   └── Notification procedures
│
├── Vulnerability Management
│   ├── Regular vulnerability scanning
│   ├── Patch management process
│   ├── Penetration testing
│   ├── Security code review
│   └── Third-party risk assessment
│
├── Data Security
│   ├── Encryption at rest
│   ├── Encryption in transit
│   ├── Data classification
│   ├── Backup and recovery
│   └── Data retention policies
│
└── Vendor Management
    ├── Vendor risk assessments
    ├── Contractual security requirements
    ├── Vendor monitoring
    ├── Third-party audits
    └── Service level agreements
```

#### 7.1.2 Implementation Checklist

```typescript
// SOC 2 Compliance Monitoring
class SOC2Monitor {
  async auditAccessControl(): Promise<void> {
    // Check for orphaned accounts
    const orphanedAccounts = await db.users.find({
      lastLogin: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
    }).toArray();

    if (orphanedAccounts.length > 0) {
      logger.warn('Orphaned accounts detected', {
        count: orphanedAccounts.length,
        accounts: orphanedAccounts.map(a => a.id)
      });
    }

    // Verify MFA enforcement
    const mfaExempt = await db.users.find({
      mfaEnabled: false,
      roles: { $in: ['ADMIN', 'EDITOR'] }
    }).toArray();

    if (mfaExempt.length > 0) {
      logger.warn('Privileged users without MFA', {
        count: mfaExempt.length
      });
    }
  }

  async auditChangeManagement(): Promise<void> {
    // Verify all changes have approval
    const unapprovedChanges = await db.changes.find({
      approvedBy: null,
      deployedAt: { $ne: null }
    }).toArray();

    if (unapprovedChanges.length > 0) {
      logger.error('Unapproved changes detected', {
        count: unapprovedChanges.length
      });
    }
  }

  async auditDataRetention(): Promise<void> {
    // Check for data past retention period
    const expiredData = await db.auditLogs.find({
      timestamp: {
        $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      }
    }).toArray();

    if (expiredData.length > 0) {
      logger.warn('Expired audit logs not deleted', {
        count: expiredData.length
      });

      // Automatic cleanup
      await db.auditLogs.deleteMany({
        timestamp: {
          $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      });
    }
  }
}
```

### 7.2 GDPR Compliance

#### 7.2.1 GDPR Implementation Checklist

```typescript
// GDPR Compliance Tracker
class GDPRCompliance {
  private requirements = {
    // Article 7: Conditions for Consent
    consent: {
      implemented: true,
      evidence: 'User consent forms stored in database',
      lastReview: '2025-01-15'
    },

    // Article 15: Right of Access
    rightToAccess: {
      implemented: true,
      evidence: 'GDPRService.exportUserData()',
      lastReview: '2025-01-15'
    },

    // Article 16: Right to Rectification
    rightToRectification: {
      implemented: true,
      evidence: 'GDPRService.updateUserData()',
      lastReview: '2025-01-15'
    },

    // Article 17: Right to Erasure
    rightToErasure: {
      implemented: true,
      evidence: 'GDPRService.deleteUserData()',
      lastReview: '2025-01-15'
    },

    // Article 18: Right to Restrict Processing
    rightToRestrict: {
      implemented: true,
      evidence: 'User processing restrictions in database',
      lastReview: '2025-01-15'
    },

    // Article 20: Right to Data Portability
    rightToPortability: {
      implemented: true,
      evidence: 'GDPRService.exportUserDataMachineReadable()',
      lastReview: '2025-01-15'
    },

    // Article 25: Data Protection by Design
    privacyByDesign: {
      implemented: true,
      evidence: 'Field-level encryption, PII classification',
      lastReview: '2025-01-15'
    },

    // Article 32: Security of Processing
    dataSecurity: {
      implemented: true,
      evidence: 'Encryption at rest and in transit',
      lastReview: '2025-01-15'
    },

    // Article 33: Notification of Personal Data Breach
    breachNotification: {
      implemented: true,
      evidence: 'Breach detection and notification system',
      lastReview: '2025-01-15'
    },

    // Article 34: Communication of Personal Data Breach
    breachCommunication: {
      implemented: true,
      evidence: 'User breach notification templates',
      lastReview: '2025-01-15'
    }
  };

  async generateComplianceReport(): Promise<{
    compliant: string[];
    nonCompliant: string[];
    needsReview: string[];
  }> {
    const compliant: string[] = [];
    const nonCompliant: string[] = [];
    const needsReview: string[] = [];

    for (const [requirement, status] of Object.entries(this.requirements)) {
      if (status.implemented) {
        compliant.push(requirement);
      } else {
        nonCompliant.push(requirement);
      }

      const lastReview = new Date(status.lastReview);
      const daysSinceReview = (Date.now() - lastReview.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceReview > 365) {
        needsReview.push(requirement);
      }
    }

    return { compliant, nonCompliant, needsReview };
  }
}
```

### 7.3 CCPA Compliance

#### 7.3.1 CCPA Implementation

```typescript
// CCPA Compliance Service
class CCPACompliance {
  async discloseInformationCollected(userId: string): Promise<{
    categories: string[];
    pieces: any[];
  }> {
    // Categories of information collected
    const user = await db.users.findOne({ id: userId });
    const cells = await db.cells.find({ ownerId: userId }).toArray();

    const categories = this.getCategories(user, cells);

    return {
      categories,
      pieces: [user, ...cells]
    };
  }

  async deleteInformation(userId: string): Promise<void> {
    // Similar to GDPR right to erasure
    await gdprService.deleteUserData(userId);
  }

  async optOutSale(userId: string): Promise<void> {
    await db.users.update(userId, {
      dataSaleOptOut: true,
      optOutTimestamp: new Date()
    });

    // Notify data partners
    await this.notifyDataPartners(userId);
  }

  async requestNonDiscrimination(userId: string): Promise<void> {
    const user = await db.users.findOne({ id: userId });

    // Ensure no service degradation
    // Same pricing, access, quality
    if (user.dataSaleOptOut) {
      // Verify service level
      await this.verifyServiceLevel(userId);
    }
  }

  private getCategories(user: any, cells: any[]): string[] {
    const categories: string[] = [];

    if (user.email) categories.push('Identifiers');
    if (user.name) categories.push('Personal information');
    if (user.address) categories.push('Geolocation');
    if (cells.length > 0) categories.push('Usage data');

    return categories;
  }

  private async notifyDataPartners(userId: string): Promise<void> {
    // Notify analytics, advertising, etc.
    await analyticsService.deleteUser(userId);
    await advertisingService.deleteUser(userId);
  }

  private async verifyServiceLevel(userId: string): Promise<void> {
    // Check that user has same access as before
    const user = await db.users.findOne({ id: userId });

    if (user.serviceLevel !== 'full') {
      throw new Error('Service degradation detected');
    }
  }
}
```

### 7.4 Audit Logging

#### 7.4.1 Comprehensive Audit Log

```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  action: string;
  resource: string;
  resourceId?: string;
  outcome: 'success' | 'failure' | 'error';
  details: Record<string, any>;
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
}

class AuditLogger {
  async log(event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event
    };

    // Store in database
    await db.auditLogs.create(auditLog);

    // Forward to SIEM
    if (event.sensitivity === 'critical') {
      await siemService.forwardSecurityEvents([event]);
    }

    // Real-time alert for critical events
    if (event.sensitivity === 'critical' && event.outcome !== 'success') {
      await securityMonitor.evaluateRules([event]);
    }
  }

  // Audit helpers for common actions
  async logAuthentication(params: {
    userId?: string;
    ipAddress: string;
    userAgent: string;
    outcome: 'success' | 'failure';
    details: Record<string, any>;
  }): Promise<void> {
    await this.log({
      ...params,
      action: 'AUTHENTICATION',
      resource: 'session',
      sensitivity: params.outcome === 'success' ? 'medium' : 'high'
    });
  }

  async logDataAccess(params: {
    userId: string;
    resource: string;
    resourceId: string;
    ipAddress: string;
    userAgent: string;
    outcome: 'success' | 'failure';
    details: Record<string, any>;
  }): Promise<void> {
    await this.log({
      ...params,
      action: 'DATA_ACCESS',
      sensitivity: 'medium'
    });
  }

  async logDataModification(params: {
    userId: string;
    resource: string;
    resourceId: string;
    ipAddress: string;
    userAgent: string;
    outcome: 'success' | 'failure';
    details: Record<string, any>;
  }): Promise<void> {
    await this.log({
      ...params,
      action: 'DATA_MODIFICATION',
      sensitivity: 'high'
    });
  }

  async logPrivilegeEscalation(params: {
    userId: string;
    ipAddress: string;
    userAgent: string;
    outcome: 'success' | 'failure';
    details: Record<string, any>;
  }): Promise<void> {
    await this.log({
      ...params,
      action: 'PRIVILEGE_ESCALATION',
      resource: 'user',
      resourceId: params.userId,
      sensitivity: 'critical'
    });
  }
}

// Usage
const auditLogger = new AuditLogger();

// On login
await auditLogger.logAuthentication({
  userId: user.id,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  outcome: 'success',
  details: { method: 'password' }
});

// On data access
await auditLogger.logDataAccess({
  userId: user.id,
  resource: 'cell',
  resourceId: cellId,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  outcome: 'success',
  details: { accessType: 'read' }
});
```

#### 7.4.2 Audit Log Retention and Archival

```typescript
class AuditLogArchiver {
  async archiveOldLogs(): Promise<void> {
    const retentionDays = 90; // SOC 2 requires 90+ days
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    // Get old logs
    const oldLogs = await db.auditLogs.find({
      timestamp: { $lt: cutoffDate }
    }).toArray();

    // Compress and store in S3/Glacier
    const archiveData = JSON.stringify(oldLogs);
    const archiveId = `audit-logs-${Date.now()}.json.gz`;

    await s3.upload({
      Bucket: 'polln-audit-archives',
      Key: archiveId,
      Body: zlib.gzipSync(archiveData),
      StorageClass: 'GLACIER' // Long-term storage
    }).promise();

    // Delete from database
    await db.auditLogs.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    logger.info(`Archived ${oldLogs.length} audit logs`, {
      archiveId,
      cutoffDate
    });
  }

  async retrieveArchive(archiveId: string): Promise<any[]> {
    const object = await s3.getObject({
      Bucket: 'polln-audit-archives',
      Key: archiveId
    }).promise();

    const decompressed = zlib.gunzipSync(object.Body!).toString();
    return JSON.parse(decompressed);
  }
}
```

---

## 8. Security Testing

### 8.1 SAST Tools

#### 8.1.1 ESLint Security Plugins

```json
// .eslintrc.json
{
  "extends": [
    "plugin:security/recommended"
  ],
  "plugins": ["security"],
  "rules": {
    "security/detect-buffer-noassert": "error",
    "security/detect-child-process": "error",
    "security/detect-disable-mustache-escape": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-non-literal-fs-filename": "warn",
    "security/detect-non-literal-regexp": "error",
    "security/detect-non-literal-require": "error",
    "security/detect-object-injection": "warn",
    "security/detect-possible-timing-attacks": "error",
    "security/detect-pseudoRandomBytes": "error"
  }
}
```

#### 8.1.2 TypeScript Security Analysis

```json
// tsconfig.json with strict settings
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true
  }
}
```

#### 8.1.3 Snyk for Dependency Scanning

```bash
# Install Snyk
npm install -g snyk

# Authenticate
snyk auth

# Test for vulnerabilities
snyk test

# Monitor for new vulnerabilities
snyk monitor

# Snyk in CI/CD
snyk test --severity-threshold=high
```

```typescript
// package.json scripts
{
  "scripts": {
    "snyk-test": "snyk test --severity-threshold=high",
    "snyk-monitor": "snyk monitor",
    "snyk-protect": "snyk protect"
  }
}
```

### 8.2 DAST Tools

#### 8.2.1 OWASP ZAP Configuration

```bash
# Install OWASP ZAP
# https://www.zaproxy.org/

# Run ZAP in daemon mode
zap.sh -daemon -port 8080 -config api.disablekey=true

# Run automated scan
zap-cli quick-scan --self-contained \
  --start-options '-config api.disablekey=true' \
  https://polln.ai

# Generate report
zap-cli report -o zap-report.html -f html
```

#### 8.2.2 Burp Suite Integration

```typescript
// Burp Suite API integration
class BurpScanner {
  async scanTarget(targetUrl: string): Promise<{
    vulnerabilities: any[];
    risk: string;
  }> {
    // Start scan via Burp API
    const response = await axios.post(
      'http://localhost:1337/v0.1/scan',
      {
        url: targetUrl,
        scan_configurations: ['Audit all items']
      },
      {
        headers: {
          'Authorization': 'Bearer YOUR_BURP_API_KEY'
        }
      }
    );

    const scanId = response.data.scan_id;

    // Poll for completion
    let scan = await this.getScanStatus(scanId);
    while (scan.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 5000));
      scan = await this.getScanStatus(scanId);
    }

    return {
      vulnerabilities: scan.vulnerabilities,
      risk: scan.risk
    };
  }

  private async getScanStatus(scanId: string): Promise<any> {
    const response = await axios.get(
      `http://localhost:1337/v0.1/scan/${scanId}`,
      {
        headers: {
          'Authorization': 'Bearer YOUR_BURP_API_KEY'
        }
      }
    );

    return response.data;
  }
}
```

### 8.3 Penetration Testing

#### 8.3.1 Penetration Test Plan

```
POLLN PENETRATION TEST PLAN
├── Reconnaissance
│   ├── Information gathering
│   ├── DNS enumeration
│   ├── Subdomain discovery
│   └── Technology fingerprinting
│
├── Vulnerability Assessment
│   ├── Automated scanning
│   ├── Manual testing
│   ├── Configuration review
│   └── API testing
│
├── Exploitation
│   ├── Authentication bypass
│   ├── Authorization bypass
│   ├── Injection attacks
│   ├── XSS/CSRF
│   └── Business logic flaws
│
├── Post-Exploitation
│   ├── Privilege escalation
│   ├── Data exfiltration
│   ├── Lateral movement
│   └── Persistence
│
└── Reporting
    ├── Executive summary
    ├── Technical findings
    ├── Risk assessment
    ├── Remediation recommendations
    └── Re-testing results
```

#### 8.3.2 Common Penetration Test Scenarios

```typescript
// Penetration test scenarios
const penTestScenarios = [
  {
    name: 'SQL Injection',
    category: 'Injection',
    severity: 'Critical',
    description: 'Test for SQL injection in cell queries',
    testCases: [
      "' OR '1'='1",
      "1' UNION SELECT * FROM users--",
      "'; DROP TABLE cells;--"
    ]
  },

  {
    name: 'XSS in Cell Values',
    category: 'Client-Side',
    severity: 'High',
    description: 'Test XSS in cell content rendering',
    testCases: [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '"><script>alert(String.fromCharCode(88,83,83))</script>'
    ]
  },

  {
    name: 'CSRF in Cell Updates',
    category: 'Client-Side',
    severity: 'High',
    description: 'Test CSRF protection on cell mutations',
    testCases: [
      'POST without CSRF token',
      'POST with referrer spoofing',
      'GET-based state change'
    ]
  },

  {
    name: 'IDOR in Cell Access',
    category: 'Authorization',
    severity: 'High',
    description: 'Test for direct object reference bypass',
    testCases: [
      'Access another user\'s cell by ID',
      'Modify another user\'s cell',
      'Delete another user\'s cell'
    ]
  },

  {
    name: 'Rate Limiting Bypass',
    category: 'Denial of Service',
    severity: 'Medium',
    description: 'Test rate limiting on API endpoints',
    testCases: [
      'Parallel requests from single IP',
      'IP rotation',
      'Distributed requests'
    ]
  }
];
```

### 8.4 Vulnerability Scanning

#### 8.4.1 Automated Vulnerability Scanner

```typescript
class VulnerabilityScanner {
  async scanApplication(url: string): Promise<{
    vulnerabilities: Vulnerability[];
    summary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  }> {
    const vulnerabilities: Vulnerability[] = [];

    // Scan for common vulnerabilities
    vulnerabilities.push(...await this.scanSQLInjection(url));
    vulnerabilities.push(...await this.scanXSS(url));
    vulnerabilities.push(...await this.scanCSRF(url));
    vulnerabilities.push(...await this.scanSecurityHeaders(url));
    vulnerabilities.push(...await this.scanTLSConfiguration(url));
    vulnerabilities.push(...await this.scanOpenPorts(url));
    vulnerabilities.push(...await this.scanDirectoryTraversal(url));

    // Calculate summary
    const summary = {
      critical: vulnerabilities.filter(v => v.severity === 'Critical').length,
      high: vulnerabilities.filter(v => v.severity === 'High').length,
      medium: vulnerabilities.filter(v => v.severity === 'Medium').length,
      low: vulnerabilities.filter(v => v.severity === 'Low').length
    };

    return { vulnerabilities, summary };
  }

  private async scanSQLInjection(url: string): Promise<Vulnerability[]> {
    const payloads = [
      "' OR '1'='1",
      "1' UNION SELECT * FROM users--",
      "'; DROP TABLE cells;--"
    ];

    const vulnerabilities: Vulnerability[] = [];

    for (const payload of payloads) {
      try {
        const response = await axios.get(`${url}/api/cells?id=${payload}`);

        if (response.data.includes('error')) {
          vulnerabilities.push({
            type: 'SQL Injection',
            severity: 'Critical',
            description: 'Potential SQL injection vulnerability',
            evidence: payload,
            url: `${url}/api/cells?id=${payload}`
          });
        }
      } catch (error) {
        // Expected error
      }
    }

    return vulnerabilities;
  }

  private async scanSecurityHeaders(url: string): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    const response = await axios.get(url);
    const headers = response.headers;

    const requiredHeaders = [
      { name: 'Strict-Transport-Security', severity: 'High' },
      { name: 'X-Content-Type-Options', severity: 'Medium' },
      { name: 'X-Frame-Options', severity: 'Medium' },
      { name: 'Content-Security-Policy', severity: 'High' },
      { name: 'X-XSS-Protection', severity: 'Low' },
      { name: 'Referrer-Policy', severity: 'Low' },
      { name: 'Permissions-Policy', severity: 'Medium' }
    ];

    for (const header of requiredHeaders) {
      if (!headers[header.name.toLowerCase()]) {
        vulnerabilities.push({
          type: 'Missing Security Header',
          severity: header.severity as any,
          description: `Missing ${header.name} header`,
          evidence: `Header ${header.name} not found`,
          url
        });
      }
    }

    return vulnerabilities;
  }

  private async scanTLSConfiguration(url: string): Promise<Vulnerability[]> {
    // Use ssl-checker or similar
    const vulnerabilities: Vulnerability[] = [];

    // Check for TLS 1.2/1.3
    // Check for weak ciphers
    // Check certificate validity

    return vulnerabilities;
  }

  private async scanXSS(url: string): Promise<Vulnerability[]> {
    // XSS scanning logic
    return [];
  }

  private async scanCSRF(url: string): Promise<Vulnerability[]> {
    // CSRF scanning logic
    return [];
  }

  private async scanOpenPorts(url: string): Promise<Vulnerability[]> {
    // Port scanning logic
    return [];
  }

  private async scanDirectoryTraversal(url: string): Promise<Vulnerability[]> {
    // Directory traversal scanning logic
    return [];
  }
}
```

### 8.5 Security Code Review

#### 8.5.1 Code Review Checklist

```
SECURITY CODE REVIEW CHECKLIST
├── Authentication & Authorization
│   ├── Password hashing (bcrypt, argon2)
│   ├── Session management
│   ├── Token generation and validation
│   ├── Permission checks
│   └── MFA implementation
│
├── Input Validation
│   ├── Type checking
│   ├── Length limits
│   ├── Format validation
│   ├── Sanitization
│   └── Encoding
│
├── Output Encoding
│   ├── HTML encoding
│   ├── JavaScript encoding
│   ├── URL encoding
│   ├── CSS encoding
│   └── JSON encoding
│
├── Cryptography
│   ├── Algorithm selection
│   ├── Key management
│   ├── Random number generation
│   ├── Initialization vectors
│   └── Certificate validation
│
├── Error Handling
│   ├── No sensitive data in errors
│   ├── Generic error messages
│   ├── Proper logging
│   ├── No stack traces to client
│   └── Error code obfuscation
│
├── Data Protection
│   ├── Encryption at rest
│   ├── Encryption in transit
│   ├── PII handling
│   ├── Data retention
│   └── Secure deletion
│
└── Configuration
    ├── No hardcoded secrets
    ├── Environment-specific settings
    ├── Secure defaults
    ├── Debug mode disabled
    └── CORS configuration
```

#### 8.5.2 Automated Code Review

```typescript
class SecurityCodeReview {
  async reviewCode(filePath: string): Promise<{
    issues: CodeIssue[];
    summary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  }> {
    const code = await fs.readFile(filePath, 'utf-8');
    const issues: CodeIssue[] = [];

    // Check for hardcoded secrets
    const secretPatterns = [
      /password\s*[:=]\s*['"][^'"]+['"]/gi,
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
      /secret\s*[:=]\s*['"][^'"]+['"]/gi,
      /token\s*[:=]\s*['"][^'"]+['"]/gi
    ];

    for (const pattern of secretPatterns) {
      const matches = code.matchAll(pattern);
      for (const match of matches) {
        issues.push({
          type: 'Hardcoded Secret',
          severity: 'Critical',
          line: this.getLineNumber(code, match.index!),
          description: 'Potential hardcoded secret detected',
          code: match[0]
        });
      }
    }

    // Check for eval usage
    if (code.includes('eval(')) {
      issues.push({
        type: 'Dangerous Function',
        severity: 'High',
        description: 'Use of eval() function detected',
        code: 'eval('
      });
    }

    // Check for SQL injection
    if (code.includes('`') && code.includes('$')) {
      issues.push({
        type: 'SQL Injection',
        severity: 'Critical',
        description: 'Potential SQL injection via template literal',
        code: 'Template literal in query'
      });
    }

    // Check for XSS
    if (code.includes('innerHTML')) {
      issues.push({
        type: 'XSS',
        severity: 'High',
        description: 'Use of innerHTML without sanitization',
        code: 'innerHTML'
      });
    }

    // Calculate summary
    const summary = {
      critical: issues.filter(i => i.severity === 'Critical').length,
      high: issues.filter(i => i.severity === 'High').length,
      medium: issues.filter(i => i.severity === 'Medium').length,
      low: issues.filter(i => i.severity === 'Low').length
    };

    return { issues, summary };
  }

  private getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
  }
}
```

---

## 9. Security Checklist

### 9.1 Pre-Production Checklist

```
PRE-PRODUCTION SECURITY CHECKLIST
├── Authentication
│   ☐ MFA enforced for all admin accounts
│   ☐ Strong password policy (12+ chars, complexity)
│   ☐ Session timeout configured (15-30 min)
│   ☐ Secure session storage (HttpOnly, Secure cookies)
│   ☐ Account lockout after failed attempts
│   ☐ Password reset flow secure
│
├── Authorization
│   ☐ RBAC implemented
│   ☐ Least privilege principle
│   ☐ Resource-level permissions
│   ☐ Admin operations logged
│   ☐ Regular access reviews
│
├── Data Protection
│   ☐ Encryption at rest (AES-256)
│   ☐ Encryption in transit (TLS 1.2+)
│   ☐ Field-level encryption for PII
│   ☐ Key rotation configured
│   ☐ Backup encryption
│   ☐ Secure key storage (KMS/Vault)
│
├── API Security
│   ☐ Rate limiting implemented
│   ☐ Input validation on all endpoints
│   ☐ Output encoding
│   ☐ API key rotation
│   ☐ CORS properly configured
│   ☐ GraphQL depth limiting
│
├── WebSocket Security
│   ☐ Authentication required
│   ☐ Message validation
│   ☐ Rate limiting per connection
│   ☐ Authorization checks
│   ☐ Secure message format
│
├── Infrastructure
│   ☐ Container images scanned
│   ☐ Security policies applied
│   ☐ Network segmentation
│   ☐ Firewalls configured
│   ☐ DDoS protection
│   ☐ WAF enabled
│
├── Monitoring & Logging
│   ☐ Centralized logging
│   ☐ Security event monitoring
│   ☐ Alert configuration
│   ☐ Log retention (90+ days)
│   ☐ Audit trail enabled
│
├── Compliance
│   ☐ SOC 2 controls implemented
│   ☐ GDPR requirements met
│   ☐ CCPA requirements met
│   ☐ Privacy policy published
│   ☐ Data processing agreement
│
└── Testing
    ☐ SAST integrated
    ☐ DAST performed
    ☐ Penetration test completed
    ☐ Dependency scan
    ☐ Security code review
```

### 9.2 Continuous Monitoring Checklist

```
CONTINUOUS MONITORING CHECKLIST
├── Daily
│   ☐ Review security alerts
│   ☐ Check failed login attempts
│   ☐ Monitor rate limit violations
│   ☐ Review audit logs
│   ☐ Check for new vulnerabilities
│
├── Weekly
│   ☐ Review access logs
│   ☐ Check for unusual data access
│   ☐ Monitor API usage patterns
│   ☐ Review security incidents
│   ☐ Update threat intelligence
│
├── Monthly
│   ☐ Security metrics review
│   ☐ Compliance status check
│   ☐ Access rights review
│   ☐ Security training update
│   ☐ Incident response drill
│
└── Quarterly
    ☐ Penetration test
    ☐ Security assessment
    ☐ Compliance audit
    ☐ Risk assessment update
    ☐ Security roadmap review
```

---

## 10. Implementation Priorities

### 10.1 Phase 1: Critical (Immediate - Week 1)

```
CRITICAL SECURITY IMPLEMENTATIONS
├── Authentication
│   ☐ Implement JWT with RS256
│   ☐ Add refresh token rotation
│   ☐ Enforce MFA for admin accounts
│   ☐ Configure secure session cookies
│
├── Data Protection
│   ☐ Enable TLS 1.3
│   ☐ Implement encryption at rest
│   ☐ Add field-level encryption for PII
│   ☐ Configure KMS integration
│
├── API Security
│   ☐ Add rate limiting
│   ☐ Implement input validation
│   ☐ Add output encoding
│   ☐ Configure CORS properly
│
└── Infrastructure
    ☐ Scan container images
    ☐ Configure network segmentation
    ☐ Enable WAF
    ☐ Setup DDoS protection
```

### 10.2 Phase 2: High (Week 2-3)

```
HIGH PRIORITY SECURITY IMPLEMENTATIONS
├── Authorization
│   ☐ Implement RBAC
│   ☐ Add resource-level permissions
│   ☐ Configure admin access controls
│   ☐ Setup access reviews
│
├── WebSocket Security
│   ☐ Add authentication
│   ☐ Implement message validation
│   ☐ Add per-connection rate limiting
│   ☐ Configure authorization checks
│
├── Monitoring
│   ☐ Setup centralized logging
│   ☐ Configure security alerts
│   ☐ Implement audit logging
│   ☐ Setup SIEM integration
│
└── Compliance
    ☐ Implement GDPR controls
    ☐ Add CCPA compliance
    ☐ Setup audit log retention
    ☐ Configure data retention policies
```

### 10.3 Phase 3: Medium (Week 4-6)

```
MEDIUM PRIORITY SECURITY IMPLEMENTATIONS
├── Advanced Features
│   ☐ OAuth/OpenID Connect
│   ☐ Backup codes for MFA
│   ☐ GraphQL security directives
│   ☐ Advanced rate limiting
│
├── Testing
│   ☐ SAST integration
│   ☐ DAST implementation
│   ☐ Penetration testing
│   ☐ Security code review
│
├── Infrastructure
│   ☐ Secret management (Vault)
│   ☐ Container security policies
│   ☐ Kubernetes network policies
│   ☐ Automated security scanning
│
└── Documentation
    ☐ Security policies
    ☐ Incident response plan
    ☐ Security runbooks
    ☐ Compliance documentation
```

---

## Appendix

### A. Security Resources

- **OWASP**: https://owasp.org/
- **NIST Cybersecurity Framework**: https://www.nist.gov/cyberframework
- **CIS Benchmarks**: https://www.cisecurity.org/cis-benchmarks
- **SANS Institute**: https://www.sans.org/

### B. Security Tools

- **SAST**: ESLint, SonarQube, Semgrep, CodeQL
- **DAST**: OWASP ZAP, Burp Suite, Nessus
- **Dependency Scanning**: Snyk, npm audit, Dependabot
- **Container Security**: Trivy, Clair, Docker Bench
- **Infrastructure**: Terraform, Packer, Vault
- **Monitoring**: ELK Stack, Splunk, Datadog

### C. Compliance Frameworks

- **SOC 2**: AICPA Trust Services Criteria
- **GDPR**: General Data Protection Regulation
- **CCPA**: California Consumer Privacy Act
- **PCI DSS**: Payment Card Industry Data Security Standard
- **HIPAA**: Health Insurance Portability and Accountability Act

---

**Document Version**: 1.0.0
**Last Updated**: 2025-03-09
**Next Review**: 2025-06-09
**Maintained By**: Security Team
**Classification**: Internal

---

**Sources:**
- Web search limitations prevented real-time 2025 data retrieval; this document is based on established security best practices and industry standards up to my knowledge cutoff. For the most current security recommendations, always consult official documentation from OWASP, NIST, CIS, and your cloud provider's security guidelines.
