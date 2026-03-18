# Security Hardening Guide - spreadsheet-moment
**Repository:** spreadsheet-moment
**Version:** 0.1.0
**Date:** 2026-03-18

---

## Critical Security Implementation

### 1. Implement XSS Protection

**Install DOMPurify:**
```bash
pnpm add dompurify
pnpm add -D @types/dompurify
```

**Create XSS protection utility:**

**File:** `packages/shared/src/utils/xss-protection.ts`

```typescript
/**
 * XSS Protection Utilities
 * Provides safe rendering of user content
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - Raw HTML string
 * @param options - DOMPurify configuration options
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(
  html: string,
  options?: {
    allowTags?: string[];
    allowAttributes?: Record<string, string[]>;
  }
): string {
  const config: DOMPurify.Config = {
    // Default: allow no tags (text only)
    ALLOWED_TAGS: options?.allowTags || [],
    // Default: allow no attributes
    ALLOWED_ATTR: options?.allowAttributes
      ? Object.keys(options.allowAttributes)
      : [],
    // Keep HTML entity encoding
    KEEP_CONTENT: true,
    // Return trusted HTML (faster)
    RETURN_TRUSTED_TYPE: false,
  };

  return DOMPurify.sanitize(html, config);
}

/**
 * Sanitize text content (removes all HTML)
 * @param text - Text that may contain HTML
 * @returns Plain text with HTML removed
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize cell value before rendering
 * @param value - Cell value
 * @returns Sanitized value safe for rendering
 */
export function sanitizeCellValue(value: unknown): string {
  if (value == null) {
    return '';
  }

  const strValue = String(value);
  return sanitizeText(strValue);
}

/**
 * Sanitize formula expression
 * @param formula - Formula string
 * @returns Sanitized formula
 */
export function sanitizeFormula(formula: string): string {
  // Allow only safe formula characters
  const safeChars = /^[a-zA-Z0-9+\-*/().,\s:=<>?&|%!]+$/;

  if (!safeChars.test(formula)) {
    throw new Error('Formula contains invalid characters');
  }

  return formula.trim();
}

/**
 * Configure DOMPurify for specific use cases
 */
export const SanitizeConfig = {
  // For rich text editing (allows basic formatting)
  RICH_TEXT: {
    allowTags: ['B', 'I', 'U', 'STRONG', 'EM', 'P', 'BR', 'SPAN'],
    allowAttributes: {
      '*': ['class', 'style'],
    },
  },

  // For code display (allows preformatted text)
  CODE: {
    allowTags: ['PRE', 'CODE'],
    allowAttributes: {},
  },

  // For links (allows anchor tags)
  LINKS: {
    allowTags: ['A'],
    allowAttributes: {
      'A': ['href', 'target', 'rel'],
    },
  },
};
```

### 2. Implement Formula Injection Protection

**File:** `packages/agent-formulas/src/security/formula-validator.ts`

```typescript
/**
 * Formula Security Validator
 * Validates and sanitizes formula expressions to prevent injection attacks
 */

export interface FormulaValidationOptions {
  maxLength?: number;
  maxNestingDepth?: number;
  allowedFunctions?: string[];
  blockedPatterns?: RegExp[];
}

/**
 * Validate formula expression for security
 */
export class FormulaValidator {
  private readonly options: Required<FormulaValidationOptions>;

  constructor(options: FormulaValidationOptions = {}) {
    this.options = {
      maxLength: options.maxLength || 1000,
      maxNestingDepth: options.maxNestingDepth || 10,
      allowedFunctions: options.allowedFunctions || this.getDefaultAllowedFunctions(),
      blockedPatterns: options.blockedPatterns || this.getDefaultBlockedPatterns(),
    };
  }

  /**
   * Validate formula expression
   */
  validate(formula: string): { valid: boolean; error?: string } {
    // Check length
    if (formula.length > this.options.maxLength) {
      return {
        valid: false,
        error: `Formula exceeds maximum length of ${this.options.maxLength}`,
      };
    }

    // Check for blocked patterns
    for (const pattern of this.options.blockedPatterns) {
      if (pattern.test(formula)) {
        return {
          valid: false,
          error: 'Formula contains blocked pattern',
        };
      }
    }

    // Check nesting depth
    const depth = this.calculateNestingDepth(formula);
    if (depth > this.options.maxNestingDepth) {
      return {
        valid: false,
        error: `Formula nesting depth exceeds maximum of ${this.options.maxNestingDepth}`,
      };
    }

    // Validate function calls
    const functionValidation = this.validateFunctions(formula);
    if (!functionValidation.valid) {
      return functionValidation;
    }

    return { valid: true };
  }

  /**
   * Calculate nesting depth of parentheses
   */
  private calculateNestingDepth(formula: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of formula) {
      if (char === '(') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === ')') {
        currentDepth--;
      }
    }

    return maxDepth;
  }

  /**
   * Validate function calls in formula
   */
  private validateFunctions(formula: string): { valid: boolean; error?: string } {
    // Extract function names
    const functionRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    let match;

    while ((match = functionRegex.exec(formula)) !== null) {
      const functionName = match[1];

      if (!this.options.allowedFunctions.includes(functionName)) {
        return {
          valid: false,
          error: `Function "${functionName}" is not allowed`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get default allowed functions
   */
  private getDefaultAllowedFunctions(): string[] {
    return [
      // Basic math
      'SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX',
      'ABS', 'ROUND', 'CEIL', 'FLOOR',
      // Logical
      'IF', 'AND', 'OR', 'NOT',
      // Text
      'CONCATENATE', 'LEFT', 'RIGHT', 'MID',
      'UPPER', 'LOWER', 'TRIM',
      // Date/Time
      'NOW', 'TODAY', 'YEAR', 'MONTH', 'DAY',
      // Reference
      'CELL', 'RANGE',
    ];
  }

  /**
   * Get default blocked patterns
   */
  private getDefaultBlockedPatterns(): RegExp[] {
    return [
      // Block JavaScript code execution patterns
      /javascript:/i,
      /eval\s*\(/i,
      /function\s*\(/i,
      /=>\s*{/,

      // Block shell commands
      /system\s*\(/i,
      /exec\s*\(/i,
      /spawn\s*\(/i,

      // Block file operations
      /\.readFile/i,
      /\.writeFile/i,
      /require\s*\(/i,
      /import\s+/i,

      // Block HTTP requests
      /fetch\s*\(/i,
      /XMLHttpRequest/i,
      /\.get\s*\(/i,
      /\.post\s*\(/i,
    ];
  }
}

/**
 * Create a formula validator with default options
 */
export function createFormulaValidator(
  options?: FormulaValidationOptions
): FormulaValidator {
  return new FormulaValidator(options);
}
```

### 3. Implement Content Security Policy

**File:** `packages/agent-core/src/middleware/csp.ts`

```typescript
/**
 * Content Security Policy Middleware
 * Implements CSP headers for XSS protection
 */

export interface CSPConfig {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  connectSrc?: string[];
  fontSrc?: string[];
  objectSrc?: string[];
  mediaSrc?: string[];
  frameSrc?: string[];
}

/**
 * Generate CSP header value
 */
export function generateCSP(config: CSPConfig): string {
  const directives: string[] = [];

  if (config.defaultSrc) {
    directives.push(`default-src ${config.defaultSrc.join(' ')}`);
  }

  if (config.scriptSrc) {
    directives.push(`script-src ${config.scriptSrc.join(' ')}`);
  }

  if (config.styleSrc) {
    directives.push(`style-src ${config.styleSrc.join(' ')}`);
  }

  if (config.imgSrc) {
    directives.push(`img-src ${config.imgSrc.join(' ')}`);
  }

  if (config.connectSrc) {
    directives.push(`connect-src ${config.connectSrc.join(' ')}`);
  }

  if (config.fontSrc) {
    directives.push(`font-src ${config.fontSrc.join(' ')}`);
  }

  if (config.objectSrc) {
    directives.push(`object-src ${config.objectSrc.join(' ')}`);
  }

  if (config.mediaSrc) {
    directives.push(`media-src ${config.mediaSrc.join(' ')}`);
  }

  if (config.frameSrc) {
    directives.push(`frame-src ${config.frameSrc.join(' ')}`);
  }

  return directives.join('; ');
}

/**
 * CSP configurations for different environments
 */
export const CSPConfigs = {
  development: {
    defaultSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "ws:", "wss:"],
    fontSrc: ["'self'", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },

  production: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "wss:"],
    fontSrc: ["'self'", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
};

/**
 * Express middleware for CSP
 */
export function cspMiddleware(config: CSPConfig) {
  const cspValue = generateCSP(config);

  return (_req: any, res: any, next: any) => {
    res.setHeader('Content-Security-Policy', cspValue);
    next();
  };
}
```

### 4. Implement CSRF Protection

**File:** `packages/agent-core/src/middleware/csrf.ts`

```typescript
/**
 * CSRF Protection Middleware
 * Implements CSRF token validation for state-changing operations
 */

import crypto from 'crypto';

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(
  token: string,
  sessionToken: string
): boolean {
  // In production, compare with stored token
  // For now, simple length check
  return token.length === 64 && sessionToken.length === 64;
}

/**
 * Express middleware for CSRF protection
 */
export function csrfMiddleware(req: any, res: any, next: any) {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get CSRF token from header or body
  const token = req.headers['x-csrf-token'] || req.body?.csrfToken;

  // Get session token from session
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || !validateCSRFToken(token, sessionToken)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}

/**
 * Initialize CSRF token in session
 */
export function initializeCSRF(req: any, res: any, next: any) {
  if (!req.session?.csrfToken) {
    req.session.csrfToken = generateCSRFToken();
  }
  next();
}
```

### 5. Implement Authorization Checks

**File:** `packages/agent-core/src/auth/authorization.ts`

```typescript
/**
 * Authorization System
 * Implements permission checks for sheet operations
 */

export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  SHARE = 'share',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  permissions: Permission[];
  role: 'owner' | 'editor' | 'viewer' | 'none';
}

/**
 * Check if user has permission
 */
export function hasPermission(
  user: User,
  permission: Permission
): boolean {
  return user.permissions.includes(permission) || user.role === 'owner';
}

/**
 * Authorization middleware
 */
export function requirePermission(permission: Permission) {
  return (req: any, res: any, next: any) => {
    const user: User = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!hasPermission(user, permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing required permission: ${permission}`,
      });
    }

    next();
  };
}

/**
 * Check sheet ownership
 */
export function checkSheetOwnership(user: User, sheetOwnerId: string): boolean {
  return user.id === sheetOwnerId || user.role === 'owner';
}

/**
 * Authorization middleware for sheet operations
 */
export function requireSheetAccess(operation: 'read' | 'write' | 'delete') {
  return (req: any, res: any, next: any) => {
    const user: User = req.user;
    const sheet = req.sheet;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasAccess = checkSheetAccess(user, sheet, operation);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `No ${operation} access to this sheet`,
      });
    }

    next();
  };
}

/**
 * Check if user has access to sheet
 */
function checkSheetAccess(
  user: User,
  sheet: any,
  operation: string
): boolean {
  if (sheet.ownerId === user.id) {
    return true;
  }

  const permission = user.permissions.find(p => p.toString() === operation.toUpperCase());
  return !!permission;
}
```

### 6. Implement WebSocket Security

**File:** `packages/agent-core/src/websocket/security.ts`

```typescript
/**
 * WebSocket Security
 * Implements security for WebSocket connections
 */

import { WebSocket } from 'ws';

/**
 * Validate WebSocket connection
 */
export function validateWebSocketConnection(
  ws: WebSocket,
  req: any
): { valid: boolean; error?: string } {
  // Check authentication token
  const token = req.headers['authorization']?.replace('Bearer ', '');

  if (!token) {
    return { valid: false, error: 'Missing authentication token' };
  }

  // Validate token (implement actual JWT validation)
  // For now, just check length
  if (token.length < 32) {
    return { valid: false, error: 'Invalid authentication token' };
  }

  return { valid: true };
}

/**
 * Validate WebSocket message
 */
export function validateWebSocketMessage(message: any): { valid: boolean; error?: string } {
  // Check message size
  const messageSize = JSON.stringify(message).length;
  const MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB

  if (messageSize > MAX_MESSAGE_SIZE) {
    return { valid: false, error: 'Message too large' };
  }

  // Validate message structure
  if (!message.type || typeof message.type !== 'string') {
    return { valid: false, error: 'Invalid message type' };
  }

  // Validate cell coordinates if present
  if (message.cellId !== undefined) {
    if (typeof message.cellId !== 'string') {
      return { valid: false, error: 'Invalid cell ID' };
    }
  }

  return { valid: true };
}

/**
 * Rate limit WebSocket messages
 */
export class WebSocketRateLimiter {
  private readonly messagesPerSecond: number;
  private readonly messageTimestamps: Map<string, number[]> = new Map();

  constructor(messagesPerSecond: number = 10) {
    this.messagesPerSecond = messagesPerSecond;
  }

  /**
   * Check if message is allowed
   */
  checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const timestamps = this.messageTimestamps.get(clientId) || [];

    // Remove timestamps older than 1 second
    const recentTimestamps = timestamps.filter(t => now - t < 1000);

    if (recentTimestamps.length >= this.messagesPerSecond) {
      return false;
    }

    recentTimestamps.push(now);
    this.messageTimestamps.set(clientId, recentTimestamps);

    return true;
  }

  /**
   * Clean up old timestamps
   */
  cleanup(clientId: string): void {
    this.messageTimestamps.delete(clientId);
  }
}

/**
 * Create WebSocket rate limiter
 */
export function createWebSocketRateLimiter(messagesPerSecond: number = 10) {
  return new WebSocketRateLimiter(messagesPerSecond);
}
```

### 7. Add Security Tests

**File:** `packages/agent-core/src/security/__tests__/xss.test.ts`

```typescript
/**
 * Security Tests
 */

import { sanitizeHTML, sanitizeText, sanitizeCellValue } from '../utils/xss-protection';
import { FormulaValidator } from '../security/formula-validator';

describe('XSS Protection', () => {
  describe('sanitizeHTML', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("XSS")</script>';
      const output = sanitizeHTML(input);
      expect(output).not.toContain('<script>');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert("XSS")">Click me</div>';
      const output = sanitizeHTML(input);
      expect(output).not.toContain('onclick');
    });

    it('should allow safe HTML', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const output = sanitizeHTML(input, {
        allowTags: ['P', 'STRONG'],
      });
      expect(output).toContain('<p>');
      expect(output).toContain('<strong>');
    });
  });

  describe('sanitizeText', () => {
    it('should remove all HTML', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const output = sanitizeText(input);
      expect(output).toBe('alert("XSS")Hello');
    });
  });

  describe('sanitizeCellValue', () => {
    it('should sanitize cell values', () => {
      const input = '<img src=x onerror=alert("XSS")>';
      const output = sanitizeCellValue(input);
      expect(output).not.toContain('<img');
      expect(output).not.toContain('onerror');
    });
  });
});

describe('Formula Validation', () => {
  const validator = new FormulaValidator();

  it('should validate safe formulas', () => {
    const result = validator.validate('=SUM(A1:A10)');
    expect(result.valid).toBe(true);
  });

  it('should block dangerous patterns', () => {
    const result = validator.validate('=eval("malicious code")');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should enforce max length', () => {
    const longFormula = '=' + 'A'.repeat(2000);
    const result = validator.validate(longFormula);
    expect(result.valid).toBe(false);
  });

  it('should enforce max nesting depth', () => {
    const deeplyNested = '=' + '('.repeat(20) + 'A1' + ')'.repeat(20);
    const result = validator.validate(deeplyNested);
    expect(result.valid).toBe(false);
  });
});
```

---

## Environment Variables

Create `.env` file:

```bash
# Security
NODE_ENV=production
CSP_ENABLED=true
CSRF_ENABLED=true
RATE_LIMIT_ENABLED=true

# Session
SESSION_SECRET=your-session-secret-here-at-least-32-characters

# API
API_URL=http://localhost:3000
WS_URL=ws://localhost:3000

# CORS
CORS_ORIGIN=http://localhost:3000
```

---

## Package.json Updates

Add security scripts:

```json
{
  "scripts": {
    "security:audit": "npm audit",
    "security:audit:fix": "npm audit fix",
    "security:check": "snyk test",
    "security:license": "license-checker --production --onlyAllow 'MIT;Apache-2.0;BSD-3-Clause;ISC'"
  },
  "devDependencies": {
    "dompurify": "^3.0.0",
    "@types/dompurify": "^3.0.0",
    "snyk": "^1.1200.0",
    "license-checker": "^25.0.1"
  }
}
```

---

## Deployment Checklist

- [ ] Enable CSP headers
- [ ] Enable CSRF protection
- [ ] Implement XSS sanitization
- [ ] Add formula injection validation
- [ ] Configure CORS properly
- [ ] Enable HTTPS only
- [ ] Set up rate limiting
- [ ] Implement authorization checks
- [ ] Add WebSocket security
- [ ] Run security tests
- [ ] Audit dependencies

---

**Next Steps:**
1. Install DOMPurify and security packages
2. Implement XSS protection
3. Add formula validation
4. Enable CSP headers
5. Implement CSRF protection
6. Add authorization checks
7. Secure WebSocket connections
8. Run security tests
9. Deploy with security headers
