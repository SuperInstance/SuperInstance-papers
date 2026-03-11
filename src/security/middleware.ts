/**
 * Security Middleware for POLLN
 * Integrates security features with existing API middleware
 */

import { WebSocket } from 'ws';
import { createHash } from 'crypto';
import { SecurityConfig, SecurityConfigManager } from './config.js';
import { SecurityAuditLogger, AuditEventType, AuditSeverity, AuditOutcome } from './audit.js';

export interface ConnectionInfo {
  id: string;
  ip: string;
  userAgent?: string;
  connectedAt: number;
  lastActivity: number;
  userId?: string;
  colonyId?: string;
  token?: string;
}

export interface RateLimitInfo {
  userId: string;
  colonyId?: string;
  endpoint: string;
  resource?: string;
  action?: 'read' | 'write';
}

export class SecurityMiddleware {
  private configManager: SecurityConfigManager;
  private auditLogger: SecurityAuditLogger;
  private connections: Map<string, ConnectionInfo> = new Map();
  private rateLimitCounters: Map<string, {
    count: number;
    resetAt: number;
    burstTokens: number;
  }> = new Map();

  constructor(config?: Partial<SecurityConfig>) {
    this.configManager = new SecurityConfigManager(config);
    this.auditLogger = new SecurityAuditLogger(this.configManager.getConfig());

    // Validate configuration
    const configErrors = this.configManager.validateConfig();
    if (configErrors.length > 0) {
      console.warn('Security configuration warnings:', configErrors);
    }

    // Cleanup old rate limit counters periodically
    setInterval(() => this.cleanupRateLimitCounters(), 60000); // Every minute
  }

  /**
   * Verify WebSocket client connection
   */
  verifyClient(info: { origin: string; secure: boolean; req: any }, callback: (result: boolean, code?: number, message?: string) => void): void {
    const config = this.configManager.getConfig();
    const ip = info.req.headers['x-forwarded-for'] || info.req.socket.remoteAddress;
    const userAgent = info.req.headers['user-agent'];

    // Check TLS requirement
    if (config.websocket.requireTLS && !info.secure) {
      this.auditLogger.logSecurityEvent(
        'tls_required',
        'warning',
        'failure',
        { ip, origin: info.origin }
      );
      return callback(false, 403, 'TLS required');
    }

    // Verify origin
    if (config.validation.allowedOrigins.length > 0) {
      const origin = info.origin || '';
      const isAllowed = config.validation.allowedOrigins.some(allowed => {
        if (allowed === '*') return true;
        if (allowed.startsWith('*.')) {
          const domain = allowed.slice(2);
          return origin.endsWith(domain);
        }
        return origin.includes(allowed);
      });

      if (!isAllowed) {
        this.auditLogger.logSecurityEvent(
          'origin_not_allowed',
          'warning',
          'failure',
          { ip, origin: info.origin, allowedOrigins: config.validation.allowedOrigins }
        );
        return callback(false, 403, 'Origin not allowed');
      }
    }

    // Check connection limits per IP
    const ipConnections = Array.from(this.connections.values())
      .filter(conn => conn.ip === ip).length;

    if (ipConnections >= config.websocket.maxConnectionsPerIP) {
      this.auditLogger.logRateLimitExceeded(
        { id: ip, type: 'system', ip },
        { type: 'connection', id: 'ip_connections' },
        { current: ipConnections, limit: config.websocket.maxConnectionsPerIP }
      );
      return callback(false, 429, 'Too many connections from this IP');
    }

    callback(true);
  }

  /**
   * Register a new connection
   */
  registerConnection(
    connectionId: string,
    ip: string,
    userAgent?: string,
    userId?: string,
    colonyId?: string,
    token?: string
  ): void {
    const connectionInfo: ConnectionInfo = {
      id: connectionId,
      ip,
      userAgent,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      userId,
      colonyId,
      token,
    };

    this.connections.set(connectionId, connectionInfo);

    this.auditLogger.logAuthentication(
      'login',
      { id: userId || 'unknown', type: 'user', ip, userAgent },
      'success',
      { connectionId, colonyId }
    );
  }

  /**
   * Update connection activity
   */
  updateActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string, reason = 'disconnected'): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);

      this.auditLogger.logAuthentication(
        'logout',
        { id: connection.userId || 'unknown', type: 'user', ip: connection.ip },
        'success',
        { connectionId, reason, duration: Date.now() - connection.connectedAt }
      );
    }
  }

  /**
   * Check rate limit
   */
  checkRateLimit(limitInfo: RateLimitInfo): {
    allowed: boolean;
    remaining: number;
    resetAfter: number;
  } {
    const config = this.configManager.getConfig();
    if (!config.rateLimiting.enabled) {
      return { allowed: true, remaining: Infinity, resetAfter: 0 };
    }

    const now = Date.now();
    const windowMs = config.rateLimiting.windowMs;

    // Create rate limit key based on the most specific identifier
    let rateLimitKey: string;

    if (limitInfo.userId && limitInfo.colonyId && limitInfo.resource && limitInfo.action) {
      // Most specific: user + colony + resource + action
      rateLimitKey = `user:${limitInfo.userId}:colony:${limitInfo.colonyId}:resource:${limitInfo.resource}:action:${limitInfo.action}`;
    } else if (limitInfo.userId && limitInfo.colonyId) {
      // User + colony
      rateLimitKey = `user:${limitInfo.userId}:colony:${limitInfo.colonyId}`;
    } else if (limitInfo.userId) {
      // User only
      rateLimitKey = `user:${limitInfo.userId}`;
    } else if (limitInfo.colonyId) {
      // Colony only
      rateLimitKey = `colony:${limitInfo.colonyId}`;
    } else {
      // Global
      rateLimitKey = 'global';
    }

    // Get or create counter
    let counter = this.rateLimitCounters.get(rateLimitKey);
    if (!counter) {
      counter = {
        count: 0,
        resetAt: now + windowMs,
        burstTokens: this.getBurstLimit(limitInfo),
      };
      this.rateLimitCounters.set(rateLimitKey, counter);
    }

    // Reset counter if window expired
    if (now >= counter.resetAt) {
      counter.count = 0;
      counter.resetAt = now + windowMs;
      counter.burstTokens = this.getBurstLimit(limitInfo);
    }

    // Determine limit based on specificity
    const limit = this.getRateLimit(limitInfo);

    // Check burst tokens first
    if (counter.burstTokens > 0) {
      counter.burstTokens--;
      counter.count++;
      return {
        allowed: true,
        remaining: Math.max(0, limit - counter.count),
        resetAfter: counter.resetAt - now,
      };
    }

    // Check rate limit
    if (counter.count < limit) {
      counter.count++;
      return {
        allowed: true,
        remaining: Math.max(0, limit - counter.count),
        resetAfter: counter.resetAt - now,
      };
    }

    // Rate limit exceeded
    this.auditLogger.logRateLimitExceeded(
      { id: limitInfo.userId || 'unknown', type: 'user' },
      { type: 'rate_limit', id: rateLimitKey },
      {
        limit,
        current: counter.count,
        endpoint: limitInfo.endpoint,
        resource: limitInfo.resource,
        action: limitInfo.action,
      }
    );

    return {
      allowed: false,
      remaining: 0,
      resetAfter: counter.resetAt - now,
    };
  }

  /**
   * Validate message payload
   */
  validateMessage(message: unknown): {
    valid: boolean;
    error?: string;
    sanitized?: unknown;
  } {
    const config = this.configManager.getConfig();

    if (!message || typeof message !== 'object') {
      return { valid: false, error: 'Message must be an object' };
    }

    const msg = message as Record<string, unknown>;

    // Validate required fields
    if (typeof msg.id !== 'string' || !msg.id) {
      return { valid: false, error: 'Message ID is required' };
    }

    if (typeof msg.timestamp !== 'number' || msg.timestamp <= 0) {
      return { valid: false, error: 'Valid timestamp is required' };
    }

    // Check message age
    const maxAge = config.validation.maxMessageAge;
    if (Date.now() - msg.timestamp > maxAge) {
      return { valid: false, error: 'Message is too old' };
    }

    // Check if timestamp is in the future (with tolerance)
    if (msg.timestamp > Date.now() + 60000) {
      return { valid: false, error: 'Message timestamp is in the future' };
    }

    // Validate payload size
    try {
      const payloadSize = JSON.stringify(msg.payload).length;
      if (payloadSize > config.validation.maxPayloadSize) {
        return { valid: false, error: 'Payload too large' };
      }
    } catch {
      return { valid: false, error: 'Invalid payload' };
    }

    // Sanitize payload if enabled
    let sanitized = msg.payload;
    if (config.validation.sanitizeStrings) {
      try {
        sanitized = this.sanitizePayload(msg.payload);
      } catch (error) {
        return { valid: false, error: `Sanitization failed: ${error}` };
      }
    }

    return { valid: true, sanitized };
  }

  /**
   * Get security headers for HTTP responses
   */
  getSecurityHeaders(): Record<string, string> {
    const headers = this.configManager.getSecurityHeaders();
    headers['Content-Security-Policy'] = this.configManager.getCSPHeader();
    return headers;
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    eventType: AuditEventType,
    severity: AuditSeverity,
    outcome: AuditOutcome,
    action: string,
    details?: Record<string, unknown>
  ): string {
    return this.auditLogger.logSecurityEvent(action, severity, outcome, details);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    total: number;
    byUser: Record<string, number>;
    byIP: Record<string, number>;
    byColony: Record<string, number>;
  } {
    const stats = {
      total: this.connections.size,
      byUser: {} as Record<string, number>,
      byIP: {} as Record<string, number>,
      byColony: {} as Record<string, number>,
    };

    // Use Array.from to iterate over Map values
    const connections = Array.from(this.connections.values());
    for (const connection of connections) {
      if (connection.userId) {
        stats.byUser[connection.userId] = (stats.byUser[connection.userId] || 0) + 1;
      }
      stats.byIP[connection.ip] = (stats.byIP[connection.ip] || 0) + 1;
      if (connection.colonyId) {
        stats.byColony[connection.colonyId] = (stats.byColony[connection.colonyId] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Cleanup inactive connections
   */
  cleanupInactiveConnections(timeoutMs = 300000): number { // 5 minutes default
    const now = Date.now();
    let count = 0;

    const connectionEntries = Array.from(this.connections.entries());
    for (const [connectionId, connection] of connectionEntries) {
      if (now - connection.lastActivity > timeoutMs) {
        this.removeConnection(connectionId, 'inactive_timeout');
        count++;
      }
    }

    return count;
  }

  /**
   * Get audit logger instance
   */
  getAuditLogger(): SecurityAuditLogger {
    return this.auditLogger;
  }

  /**
   * Get config manager instance
   */
  getConfigManager(): SecurityConfigManager {
    return this.configManager;
  }

  /**
   * Private helper methods
   */

  private getRateLimit(limitInfo: RateLimitInfo): number {
    const config = this.configManager.getConfig();

    if (limitInfo.userId && limitInfo.colonyId && limitInfo.resource && limitInfo.action) {
      // Most specific limit
      return Math.min(
        config.rateLimiting.perUserRequestsPerMinute,
        config.rateLimiting.perColonyRequestsPerMinute
      );
    } else if (limitInfo.userId && limitInfo.colonyId) {
      // User + colony limit
      return config.rateLimiting.perUserRequestsPerMinute;
    } else if (limitInfo.userId) {
      // User limit
      return config.rateLimiting.perUserRequestsPerMinute;
    } else if (limitInfo.colonyId) {
      // Colony limit
      return config.rateLimiting.perColonyRequestsPerMinute;
    } else {
      // Global limit
      return config.rateLimiting.requestsPerMinute;
    }
  }

  private getBurstLimit(limitInfo: RateLimitInfo): number {
    const config = this.configManager.getConfig();

    if (limitInfo.userId && limitInfo.colonyId) {
      return config.rateLimiting.perUserBurstLimit;
    } else if (limitInfo.userId) {
      return config.rateLimiting.perUserBurstLimit;
    } else if (limitInfo.colonyId) {
      return config.rateLimiting.perColonyBurstLimit;
    } else {
      return config.rateLimiting.burstLimit;
    }
  }

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

  private sanitizeString(str: string): string {
    const config = this.configManager.getConfig();

    // Check length
    if (str.length > config.validation.maxStringLength) {
      throw new Error(`String exceeds maximum length of ${config.validation.maxStringLength}`);
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
      /data:/gi, // Data URLs
      /vbscript:/gi, // VBScript
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        throw new Error('Potentially dangerous content detected');
      }
    }

    return sanitized;
  }

  private isValidKey(key: string): boolean {
    // Check length
    if (key.length > 100) {
      return false;
    }

    // Check for dangerous keys
    const dangerousKeys = ['__proto__', 'constructor', 'prototype', '__defineGetter__', '__defineSetter__'];
    if (dangerousKeys.includes(key)) {
      return false;
    }

    // Check for valid characters
    return /^[a-zA-Z0-9_:.-]+$/.test(key);
  }

  private cleanupRateLimitCounters(): void {
    const now = Date.now();
    const windowMs = this.configManager.getConfig().rateLimiting.windowMs;

    const counterEntries = Array.from(this.rateLimitCounters.entries());
    for (const [key, counter] of counterEntries) {
      // Remove counters that haven't been used for more than 2 windows
      if (now > counter.resetAt + (windowMs * 2)) {
        this.rateLimitCounters.delete(key);
      }
    }
  }
}