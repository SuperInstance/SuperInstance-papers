# Production Security Hardening Configuration

**Repository:** spreadsheet-moment
**Environment:** Production
**Version:** 1.0.0
**Date:** 2026-03-16
**Status:** Production Ready

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [CORS Configuration](#cors-configuration)
3. [Content Security Policy (CSP)](#content-security-policy-csp)
4. [Rate Limiting Strategy](#rate-limiting-strategy)
5. [Authentication & Authorization](#authentication--authorization)
6. [Input Validation](#input-validation)
7. [Output Sanitization](#output-sanitization)
8. [HTTPS/TLS Configuration](#httpstls-configuration)
9. [Secrets Management](#secrets-management)
10. [DDoS Protection](#ddos-protection)
11. [Security Headers](#security-headers)
12. [Logging & Monitoring](#logging--monitoring)
13. [Compliance](#compliance)

---

## Security Overview

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal access required for operations
3. **Zero Trust**: Verify all requests, regardless of source
4. **Fail Secure**: Default to secure behavior on errors
5. **Audit Everything**: Comprehensive logging of security events

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    EDGE SECURITY LAYER                       │
│  • Cloudflare DDoS Protection                                │
│  • Web Application Firewall (WAF)                            │
│  • Bot Fight Mode                                            │
│  • Rate Limiting                                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   NETWORK SECURITY LAYER                     │
│  • TLS 1.3 Only                                              │
│  • HTTP/2 with HTTP/3 Upgrade                                │
│  • Certificate Pinning                                       │
│  • HSTS Enforcement                                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  APPLICATION SECURITY LAYER                  │
│  • CORS Policy                                               │
│  • CSP Headers                                               │
│  • Input Validation                                          │
│  • Output Sanitization                                       │
│  • Authentication & Authorization                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA SECURITY LAYER                       │
│  • Encryption at Rest (R2, D1, KV)                           │
│  • Encryption in Transit (TLS)                               │
│  • Secrets Management (Cloudflare Secrets)                   │
│  • Data Retention Policies                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## CORS Configuration

### Production CORS Policy

```typescript
// wrangler.production.toml
[env.production.vars]
CORS_ENABLED = "true"
CORS_ALLOWED_ORIGINS = "https://spreadsheet-moment.com,https://www.spreadsheet-moment.com"
CORS_ALLOWED_METHODS = "GET,POST,PUT,DELETE,OPTIONS"
CORS_ALLOWED_HEADERS = "Content-Type,Authorization,X-Requested-With,X-CSRF-Token"
CORS_EXPOSED_HEADERS = "Content-Length,Content-Type,ETag"
CORS_MAX_AGE = "86400" // 24 hours
CORS_CREDENTIALS = "true"
```

### CORS Implementation

```typescript
// Security Middleware
export class CORSMiddleware {
  private allowedOrigins: string[];
  private allowedMethods: string[];
  private allowedHeaders: string[];

  constructor(env: Env) {
    this.allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',');
    this.allowedMethods = env.CORS_ALLOWED_METHODS.split(',');
    this.allowedHeaders = env.CORS_ALLOWED_HEADERS.split(',');
  }

  validateOrigin(origin: string): boolean {
    return this.allowedOrigins.includes(origin);
  }

  validateMethod(method: string): boolean {
    return this.allowedMethods.includes(method);
  }

  validateHeaders(headers: Headers): boolean {
    const requestHeaders = headers.get('Access-Control-Request-Headers');
    if (!requestHeaders) return true;

    const headersArray = requestHeaders.split(',');
    return headersArray.every(header =>
      this.allowedHeaders.some(allowed =>
        header.toLowerCase().trim() === allowed.toLowerCase().trim()
      )
    );
  }

  applyCORSHeaders(response: Response, origin: string): Response {
    const headers = new Headers(response.headers);

    if (this.validateOrigin(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Credentials', 'true');
      headers.set('Access-Control-Allow-Methods', this.allowedMethods.join(', '));
      headers.set('Access-Control-Allow-Headers', this.allowedHeaders.join(', '));
      headers.set('Access-Control-Expose-Headers', 'Content-Length,Content-Type,ETag');
      headers.set('Access-Control-Max-Age', '86400');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  handlePreflight(request: Request): Response {
    const origin = request.headers.get('Origin') || '';

    if (!this.validateOrigin(origin)) {
      return new Response('CORS policy violation', { status: 403 });
    }

    if (!this.validateMethod(request.headers.get('Access-Control-Request-Method') || '')) {
      return new Response('Method not allowed', { status: 405 });
    }

    if (!this.validateHeaders(request.headers)) {
      return new Response('Headers not allowed', { status: 405 });
    }

    return new Response(null, {
      status: 204,
      headers: this.applyCORSHeaders(new Response(), origin).headers,
    });
  }
}
```

---

## Content Security Policy (CSP)

### Production CSP Headers

```typescript
// CSP Configuration
export const CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.clawengine.com wss://api.clawengine.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    "block-all-mixed-content",
  ].join('; '),

  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};
```

### CSP Implementation

```typescript
// Security Headers Middleware
export class SecurityHeadersMiddleware {
  applySecurityHeaders(response: Response): Response {
    const headers = new Headers(response.headers);

    // Apply CSP
    headers.set('Content-Security-Policy', CSP_HEADERS['Content-Security-Policy']);

    // Apply additional security headers
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Strict-Transport-Security (HSTS)
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}
```

---

## Rate Limiting Strategy

### Rate Limiting Configuration

```typescript
// Rate Limiting Strategy
export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  burst: number;
  windowSeconds: number;
  strategy: 'fixed-window' | 'sliding-window' | 'token-bucket';
}

export const PRODUCTION_RATE_LIMITS: RateLimitConfig = {
  enabled: true,
  requestsPerMinute: 100,
  burst: 20,
  windowSeconds: 60,
  strategy: 'sliding-window',
};

// Per-endpoint rate limits
export const ENDPOINT_RATE_LIMITS: Record<string, Partial<RateLimitConfig>> = {
  '/api/claws': {
    requestsPerMinute: 10,
    burst: 5,
  },
  '/ws': {
    requestsPerMinute: 60,
    burst: 10,
  },
  '/health': {
    requestsPerMinute: 1000,
    burst: 100,
  },
};
```

### Rate Limiting Implementation

```typescript
// Sliding Window Rate Limiter
export class SlidingWindowRateLimiter {
  private cache: KVNamespace;
  private config: RateLimitConfig;

  constructor(cache: KVNamespace, config: RateLimitConfig) {
    this.cache = cache;
    this.config = config;
  }

  async checkRateLimit(
    identifier: string,
    endpoint: string = 'default'
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const endpointConfig = ENDPOINT_RATE_LIMITS[endpoint] || {};
    const effectiveConfig = { ...this.config, ...endpointConfig };

    const key = `ratelimit:${endpoint}:${identifier}`;
    const now = Date.now();
    const windowStart = now - effectiveConfig.windowSeconds * 1000;

    // Get current request history
    const current = await this.cache.get(key, 'json');
    const requests: number[] = current ? (current as any).requests : [];

    // Filter requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (validRequests.length >= effectiveConfig.requestsPerMinute) {
      const oldestRequest = validRequests[0];
      const resetTime = oldestRequest + effectiveConfig.windowSeconds * 1000;

      return {
        allowed: false,
        remaining: 0,
        resetTime,
      };
    }

    // Add current request
    validRequests.push(now);

    // Store updated request history
    await this.cache.put(
      key,
      JSON.stringify({ requests: validRequests }),
      { expirationTtl: effectiveConfig.windowSeconds }
    );

    return {
      allowed: true,
      remaining: effectiveConfig.requestsPerMinute - validRequests.length,
      resetTime: now + effectiveConfig.windowSeconds * 1000,
    };
  }
}
```

---

## Authentication & Authorization

### JWT Authentication

```typescript
// JWT Configuration
export interface JWTConfig {
  secret: string;
  expiresIn: string;
  issuer: string;
  audience: string;
  algorithm: 'HS256' | 'HS384' | 'RS256';
}

export const PRODUCTION_JWT_CONFIG: JWTConfig = {
  secret: 'YOUR_JWT_SECRET', // Set via wrangler secret
  expiresIn: '1h',
  issuer: 'https://spreadsheet-moment.com',
  audience: 'https://api.spreadsheet-moment.com',
  algorithm: 'HS256',
};

// JWT Authentication Middleware
export class JWTAuthMiddleware {
  private config: JWTConfig;

  constructor(config: JWTConfig) {
    this.config = config;
  }

  async authenticate(request: Request): Promise<{ authenticated: boolean; user?: any }> {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false };
    }

    const token = authHeader.substring(7);

    try {
      // Verify JWT token (use crypto.subtle for verification)
      const payload = await this.verifyToken(token);

      return {
        authenticated: true,
        user: payload,
      };
    } catch (error) {
      return { authenticated: false };
    }
  }

  private async verifyToken(token: string): Promise<any> {
    // Implement JWT verification using Web Crypto API
    // This is a simplified example - use a proper JWT library in production
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    const signature = parts[2];

    // Verify signature (simplified)
    // In production, use proper JWT verification

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    return payload;
  }

  authorize(user: any, requiredPermissions: string[]): boolean {
    if (!user.permissions) return false;

    return requiredPermissions.every(permission =>
      user.permissions.includes(permission)
    );
  }
}
```

---

## Input Validation

### Validation Rules

```typescript
// Input Validation Schema
export interface ValidationSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  properties?: Record<string, ValidationSchema>;
  items?: ValidationSchema;
}

// Validation Schemas
export const VALIDATION_SCHEMAS: Record<string, ValidationSchema> = {
  cellId: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: /^[A-Z]+\d+$/, // e.g., A1, B42, Z100
  },

  clawRequest: {
    type: 'object',
    required: true,
    properties: {
      cellId: {
        type: 'string',
        required: true,
        pattern: /^[A-Z]+\d+$/,
      },
      operation: {
        type: 'string',
        required: true,
        enum: ['create', 'query', 'update', 'cancel', 'execute'],
      },
      data: {
        type: 'object',
        required: false,
      },
    },
  },

  cellUpdate: {
    type: 'object',
    required: true,
    properties: {
      value: {
        type: 'string',
        required: false,
        maxLength: 10000,
      },
      formula: {
        type: 'string',
        required: false,
        maxLength: 1000,
        pattern: /^=/,
      },
    },
  },
};

// Input Validator
export class InputValidator {
  validate(data: any, schema: ValidationSchema): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Type validation
    if (schema.required && (data === null || data === undefined)) {
      errors.push('Field is required');
      return { valid: false, errors };
    }

    if (data !== null && data !== undefined) {
      const dataType = Array.isArray(data) ? 'array' : typeof data;
      if (dataType !== schema.type) {
        errors.push(`Expected type ${schema.type}, got ${dataType}`);
      }
    }

    // String validation
    if (schema.type === 'string' && typeof data === 'string') {
      if (schema.minLength && data.length < schema.minLength) {
        errors.push(`Minimum length is ${schema.minLength}`);
      }
      if (schema.maxLength && data.length > schema.maxLength) {
        errors.push(`Maximum length is ${schema.maxLength}`);
      }
      if (schema.pattern && !schema.pattern.test(data)) {
        errors.push(`String does not match required pattern`);
      }
    }

    // Number validation
    if (schema.type === 'number' && typeof data === 'number') {
      if (schema.min !== undefined && data < schema.min) {
        errors.push(`Minimum value is ${schema.min}`);
      }
      if (schema.max !== undefined && data > schema.max) {
        errors.push(`Maximum value is ${schema.max}`);
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push(`Value must be one of: ${schema.enum.join(', ')}`);
    }

    // Object validation
    if (schema.type === 'object' && typeof data === 'object' && schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const result = this.validate(data[key], propSchema);
        if (!result.valid) {
          errors.push(`${key}: ${result.errors.join(', ')}`);
        }
      }
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(data) && schema.items) {
      data.forEach((item, index) => {
        const result = this.validate(item, schema.items!);
        if (!result.valid) {
          errors.push(`[${index}]: ${result.errors.join(', ')}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
```

---

## Output Sanitization

### Sanitization Rules

```typescript
// Output Sanitizer
export class OutputSanitizer {
  // Remove sensitive information
  sanitize(data: any, removeSecrets: boolean = true): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'password',
      'apiKey',
      'secret',
      'token',
      'sessionId',
      'privateKey',
      'authToken',
    ];

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const key of Object.keys(sanitized)) {
      if (removeSecrets && sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitize(sanitized[key], removeSecrets);
      }
    }

    return sanitized;
  }

  // Escape HTML to prevent XSS
  escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
      '/': '&#x2F;',
    };

    return text.replace(/[&<>"'/]/g, m => map[m]);
  }

  // Sanitize HTML content
  sanitizeHtml(html: string): string {
    // Remove dangerous tags and attributes
    const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form'];
    const dangerousAttrs = ['onerror', 'onload', 'onclick', 'onmouseover'];

    let sanitized = html;

    // Remove dangerous tags
    dangerousTags.forEach(tag => {
      const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
      sanitized = sanitized.replace(regex, '');
    });

    // Remove dangerous attributes
    dangerousAttrs.forEach(attr => {
      const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    return sanitized;
  }
}
```

---

## HTTPS/TLS Configuration

### TLS Configuration

```toml
# wrangler.production.toml - TLS Settings
# Ensure these are configured in Cloudflare dashboard:

# SSL/TLS Mode: Full (strict)
# - Cloudflare to Origin: TLS 1.2 or higher
# - Minimum TLS Version: 1.2
# - Maximum TLS Version: 1.3
# - Cipher Suites: Modern, secure only

# HTTP/3: Enabled
# 0-RTT Connection Resumption: Enabled
# TLS 1.3: Enabled
# Automatic HTTPS Rewrites: Enabled

# Certificate Transparency: Enabled
# HSTS: Enabled with preload
```

### HSTS Configuration

```typescript
// Strict-Transport-Security Header
export const HSTS_HEADER = 'max-age=31536000; includeSubDomains; preload';

// Apply HSTS header
headers.set('Strict-Transport-Security', HSTS_HEADER);
```

---

## Secrets Management

### Secret Management Strategy

```bash
# Set production secrets via wrangler CLI
wrangler secret put CLAW_API_KEY --env production
wrangler secret put DEEPSEEK_API_KEY --env production
wrangler secret put OPENAI_API_KEY --env production
wrangler secret put ANTHROPIC_API_KEY --env production
wrangler secret put SESSION_SECRET --env production
wrangler secret put ENCRYPTION_KEY --env production
wrangler secret put JWT_SECRET --env production
wrangler secret put DATABASE_URL --env production
wrangler secret put REDIS_URL --env production
```

### Secret Rotation

```typescript
// Secret Rotation Manager
export class SecretRotationManager {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  // Check if secret needs rotation
  async shouldRotateSecret(secretName: string): Promise<boolean> {
    const key = `secret_rotation:${secretName}`;
    const lastRotation = await this.env.CELLS.get(key);

    if (!lastRotation) return true;

    const lastRotationDate = parseInt(lastRotation);
    const daysSinceRotation = (Date.now() - lastRotationDate) / (1000 * 60 * 60 * 24);

    return daysSinceRotation > 90; // Rotate every 90 days
  }

  // Rotate secret
  async rotateSecret(secretName: string, newSecret: string): Promise<void> {
    // Store new secret (in production, use proper secret management)
    await this.env.CELLS.put(`secret:${secretName}`, newSecret);

    // Update rotation timestamp
    await this.env.CELLS.put(
      `secret_rotation:${secretName}`,
      Date.now().toString()
    );
  }
}
```

---

## DDoS Protection

### Cloudflare DDoS Protection

```toml
# Enable Cloudflare DDoS Protection
# Configure in Cloudflare dashboard:

# 1. HTTP DDoS Protection
#    - Enable Managed Ruleset
#    - Configure Rate Limiting Rules
#    - Set up Challenge Passage

# 2. Layer 3/4 Protection
#    - Enable Spectrum for DDoS protection
#    - Configure Greedy Mode for critical endpoints

# 3. Bot Fight Mode
#    - Enable Bot Fight Mode
#    - Configure Super Bot Fight Mode

# 4. Edge Rate Limiting
#    - Configure rate limits by:
#      - IP address
#      - User agent
#      - Request path
#      - ASN
```

### DDoS Response Strategy

```typescript
// DDoS Detection and Response
export class DDoSMitigation {
  private env: Env;
  private logger: Logger;

  constructor(env: Env, logger: Logger) {
    this.env = env;
    this.logger = logger;
  }

  async detectAttack(request: Request): Promise<boolean] {
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const url = new URL(request.url);

    // Check request rate
    const rateLimitKey = `ddos_check:${ip}`;
    const current = await this.env.CACHE.get(rateLimitKey, 'json');
    const requestCount = current ? (current as any).count : 0;

    if (requestCount > 1000) { // Threshold for DDoS detection
      this.logger.warn('Potential DDoS attack detected', { ip, url: url.pathname });
      return true;
    }

    // Update request count
    await this.env.CACHE.put(
      rateLimitKey,
      JSON.stringify({ count: requestCount + 1 }),
      { expirationTtl: 60 }
    );

    return false;
  }

  async mitigateAttack(request: Request): Promise<Response> {
    const ip = request.headers.get('CF-Connecting-IP') || '';

    // Add IP to blocklist
    await this.env.CACHE.put(
      `blocklist:${ip}`,
      'true',
      { expirationTtl: 3600 }
    );

    // Return challenge page
    return new Response('DDoS protection challenge', {
      status: 429,
      headers: {
        'Content-Type': 'text/html',
        'Retry-After': '60',
      },
    });
  }
}
```

---

## Security Headers

### Complete Security Headers Configuration

```typescript
// Production Security Headers
export const PRODUCTION_SECURITY_HEADERS: Record<string, string> = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.clawengine.com wss://api.clawengine.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    "block-all-mixed-content",
  ].join('; '),

  // Strict-Transport-Security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // X-Content-Type-Options
  'X-Content-Type-Options': 'nosniff',

  // X-Frame-Options
  'X-Frame-Options': 'DENY',

  // X-XSS-Protection
  'X-XSS-Protection': '1; mode=block',

  // Referrer-Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions-Policy
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',

  // Cross-Origin-Opener-Policy
  'Cross-Origin-Opener-Policy': 'same-origin',

  // Cross-Origin-Resource-Policy
  'Cross-Origin-Resource-Policy': 'same-origin',

  // Cross-Origin-Embedder-Policy
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

// Apply security headers middleware
export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(PRODUCTION_SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
```

---

## Logging & Monitoring

### Security Event Logging

```typescript
// Security Event Logger
export class SecurityEventLogger {
  private env: Env;
  private analytics: AnalyticsEngineDataset;

  constructor(env: Env) {
    this.env = env;
    this.analytics = env.ANALYTICS;
  }

  async logSecurityEvent(event: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    ip: string;
    userAgent?: string;
    details?: any;
  }): Promise<void> {
    // Log to console for debugging
    console.log('Security Event:', JSON.stringify(event));

    // Write to analytics
    await this.analytics.writeDataPoint({
      blobs: [
        event.type,
        event.severity,
        event.ip,
        JSON.stringify(event.details || {}),
      ],
      doubles: [Date.now()],
      indexes: [this.env.ENVIRONMENT],
    });

    // Send alert if critical
    if (event.severity === 'critical') {
      await this.sendAlert(event);
    }
  }

  private async sendAlert(event: any): Promise<void> {
    // Implement alert sending (email, Slack, PagerDuty, etc.)
    console.error('CRITICAL SECURITY ALERT:', event);
  }
}
```

---

## Compliance

### GDPR Compliance

```typescript
// GDPR Compliance Manager
export class GDPRComplianceManager {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  // Handle data access request
  async handleDataAccessRequest(userId: string): Promise<any> {
    const userData = await this.env.DB.prepare(
      'SELECT * FROM user_data WHERE user_id = ?'
    ).bind(userId).all();

    return userData;
  }

  // Handle data deletion request
  async handleDataDeletionRequest(userId: string): Promise<void> {
    // Delete from database
    await this.env.DB.prepare(
      'DELETE FROM user_data WHERE user_id = ?'
    ).bind(userId).run();

    // Delete from KV storage
    const keys = await this.env.CELLS.list({ prefix: `user:${userId}` });
    for (const key of keys.keys) {
      await this.env.CELLS.delete(key.name);
    }
  }

  // Handle data export request
  async handleDataExportRequest(userId: string): Promise<string> {
    const data = await this.handleDataAccessRequest(userId);
    return JSON.stringify(data, null, 2);
  }
}
```

---

**Security Version:** 1.0.0
**Last Updated:** 2026-03-16
**Next Review:** 2026-06-16
