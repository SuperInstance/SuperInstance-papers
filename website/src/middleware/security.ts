/**
 * Security middleware for SuperInstance website
 * Implements security headers, CSP, and security best practices
 */

import type { APIContext, MiddlewareNext } from 'astro';

// Security headers configuration
const SECURITY_HEADERS = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://cdn.jsdelivr.net",
    "connect-src 'self' https://api.superinstance.ai https://plausible.io",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "block-all-mixed-content",
    "upgrade-insecure-requests",
  ].join('; '),

  // X-Frame-Options (legacy, but still useful)
  'X-Frame-Options': 'DENY',

  // X-Content-Type-Options
  'X-Content-Type-Options': 'nosniff',

  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy (formerly Feature Policy)
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'serial=()',
    'bluetooth=()',
    'fullscreen=(self)',
    'picture-in-picture=(self)',
  ].join(', '),

  // Strict Transport Security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // X-XSS-Protection (legacy, but still useful)
  'X-XSS-Protection': '1; mode=block',

  // Cross-Origin Embedder Policy
  'Cross-Origin-Embedder-Policy': 'require-corp',

  // Cross-Origin Opener Policy
  'Cross-Origin-Opener-Policy': 'same-origin',

  // Cross-Origin Resource Policy
  'Cross-Origin-Resource-Policy': 'same-origin',
};

// Educational website specific headers (COPPA compliance)
const EDUCATIONAL_HEADERS = {
  // COPPA compliance - indicate site is directed to children under 13
  'X-Content-Type-Options': 'nosniff',
  'Permissions-Policy': 'interest-cohort=()', // Disable FLoC tracking
};

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
};

/**
 * Security middleware function
 */
export async function securityMiddleware(context: APIContext, next: MiddlewareNext) {
  const response = await next();

  // Skip security headers for development environment
  if (process.env.NODE_ENV === 'development') {
    return response;
  }

  // Add security headers to response
  const headers = new Headers(response.headers);

  // Apply security headers
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    headers.set(header, value);
  });

  // Apply educational-specific headers
  Object.entries(EDUCATIONAL_HEADERS).forEach(([header, value]) => {
    headers.set(header, value);
  });

  // Add security headers for API responses
  if (context.url.pathname.startsWith('/api/')) {
    headers.set('Access-Control-Allow-Origin', 'https://superinstance.ai');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }

  // Create new response with security headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Input validation helper for forms
 */
export function validateFormInput(input: Record<string, any>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for common injection patterns
  const injectionPatterns = [
    /<script\b[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /document\./i,
    /window\./i,
    /alert\s*\(/i,
    /confirm\s*\(/i,
    /prompt\s*\(/i,
  ];

  Object.entries(input).forEach(([key, value]) => {
    if (typeof value === 'string') {
      // Check for injection patterns
      injectionPatterns.forEach(pattern => {
        if (pattern.test(value)) {
          errors.push(`Potential injection detected in field: ${key}`);
        }
      });

      // Check for excessive length
      if (value.length > 10000) {
        errors.push(`Field ${key} exceeds maximum length`);
      }

      // Check for SQL injection patterns
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|ALTER|CREATE|TRUNCATE)\b)/i,
        /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
        /(\b(OR|AND)\b\s+['"][^'"]+['"]\s*=\s*['"][^'"]+['"])/i,
        /(--|\/\*|\*\/|;)/,
      ];

      sqlPatterns.forEach(pattern => {
        if (pattern.test(value)) {
          errors.push(`Potential SQL injection detected in field: ${key}`);
        }
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize HTML input to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';

  // Remove script tags and event handlers
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '');

  // Allow safe HTML tags for educational content
  const allowedTags = [
    'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
    'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span', 'section', 'article', 'header', 'footer',
  ];

  const allowedAttributes = {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class', 'id', 'style'],
  };

  // Basic sanitization - in production, use a library like DOMPurify
  // This is a simplified version for demonstration
  sanitized = sanitized.replace(/<(\/?)(\w+)[^>]*>/g, (match, slash, tag) => {
    const lowerTag = tag.toLowerCase();
    if (allowedTags.includes(lowerTag)) {
      // Remove unsafe attributes
      const safeMatch = match.replace(/\s+(\w+)\s*=\s*["'][^"']*["']/g, (attrMatch, attrName) => {
        const lowerAttr = attrName.toLowerCase();
        if (allowedAttributes['*']?.includes(lowerAttr) ||
            allowedAttributes[lowerTag as keyof typeof allowedAttributes]?.includes(lowerAttr)) {
          return attrMatch;
        }
        return '';
      });
      return safeMatch;
    }
    return '';
  });

  return sanitized;
}

/**
 * Generate CSRF token for forms
 */
export function generateCsrfToken(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false;

  // Use timing-safe comparison
  const crypto = require('crypto');
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(sessionToken)
  );
}

/**
 * Security configuration for educational website
 */
export const securityConfig = {
  // COPPA compliance settings
  coppa: {
    enabled: true,
    ageVerification: true,
    parentalConsent: true,
    dataRetentionDays: 30,
    noPersonalInfoCollection: true,
  },

  // FERPA compliance (for educational records)
  ferpa: {
    enabled: true,
    studentDataProtection: true,
    directoryInformationOptOut: true,
    educationalRecordsAccess: true,
  },

  // GDPR compliance
  gdpr: {
    enabled: true,
    cookieConsent: true,
    dataPortability: true,
    rightToErasure: true,
    dataProcessingAgreement: true,
  },

  // Security monitoring
  monitoring: {
    errorTracking: true,
    securityLogging: true,
    intrusionDetection: true,
    regularAudits: true,
  },

  // Authentication security
  authentication: {
    requireStrongPasswords: true,
    multiFactorAuth: false, // Optional for educational site
    sessionTimeout: 30 * 60, // 30 minutes in seconds
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60, // 15 minutes in seconds
  },
};

/**
 * Log security events for monitoring
 */
export function logSecurityEvent(event: {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    ...event,
  };

  // In production, this would send to a security monitoring service
  console.log(`[SECURITY] ${timestamp} - ${event.type}: ${event.message}`);

  // Log to file in production
  if (process.env.NODE_ENV === 'production') {
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(process.cwd(), 'logs', 'security');

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `${timestamp.split('T')[0]}.json`);
    const logData = fs.existsSync(logFile)
      ? JSON.parse(fs.readFileSync(logFile, 'utf8'))
      : [];

    logData.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
  }
}