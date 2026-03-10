/**
 * POLLN Spreadsheet Backend - WebSocket Authentication Middleware
 *
 * WebSocket connection authentication with JWT validation, session management,
 * permission checking, and rate limiting.
 *
 * Features:
 * - JWT token validation on connection
 * - Token refresh during connection
 * - Session validation and tracking
 * - Permission checks per message
 * - Connection rate limiting
 * - User context attachment
 *
 * Performance: <50ms connection establishment
 */

import { EventEmitter } from 'events';
import { verify, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { AuthService, TokenPayload } from '../../auth/AuthService.js';
import { Permission, ResourceType } from '../../auth/Permissions.js';
import { WSSessionManager } from './WSSessionManager.js';
import { WSAuthorizer } from './WSAuthorizer.js';
import { WSMetrics } from './WSMetrics.js';

/**
 * WebSocket connection context
 */
export interface WSConnectionContext {
  userId: string;
  username: string;
  email: string;
  role: string;
  permissions: Permission[];
  sessionId: string;
  connectedAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent?: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  context?: WSConnectionContext;
  error?: string;
  errorCode?: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'RATE_LIMITED' | 'SESSION_INVALID' | 'INSUFFICIENT_PERMISSIONS';
}

/**
 * Message permission check result
 */
export interface MessageAuthResult {
  allowed: boolean;
  error?: string;
  reason?: string;
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

/**
 * WebSocket authentication middleware configuration
 */
export interface WSAuthMiddlewareConfig {
  // JWT secret (must match AuthService)
  jwtSecret: string;
  // Connection rate limiting (connections per minute per IP)
  maxConnectionsPerMinute: number;
  // Connection rate limiting window (milliseconds)
  rateLimitWindow: number;
  // Session timeout (milliseconds)
  sessionTimeout: number;
  // Token refresh threshold (milliseconds before expiry)
  tokenRefreshThreshold: number;
  // Enable admin override
  enableAdminOverride: boolean;
}

/**
 * WebSocket authentication middleware
 *
 * Validates JWT tokens on connection, manages sessions,
 * checks permissions per message, and enforces rate limits.
 */
export class WSAuthMiddleware extends EventEmitter {
  private config: Required<WSAuthMiddlewareConfig>;
  private authService: AuthService;
  private sessionManager: WSSessionManager;
  private authorizer: WSAuthorizer;
  private metrics: WSMetrics;
  private rateLimitMap: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    authService: AuthService,
    sessionManager: WSSessionManager,
    authorizer: WSAuthorizer,
    metrics: WSMetrics,
    config: Partial<WSAuthMiddlewareConfig> = {}
  ) {
    super();

    this.authService = authService;
    this.sessionManager = sessionManager;
    this.authorizer = authorizer;
    this.metrics = metrics;

    this.config = {
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET || 'change-me-in-production',
      maxConnectionsPerMinute: config.maxConnectionsPerMinute || 60,
      rateLimitWindow: config.rateLimitWindow || 60000, // 1 minute
      sessionTimeout: config.sessionTimeout || 3600000, // 1 hour
      tokenRefreshThreshold: config.tokenRefreshThreshold || 300000, // 5 minutes
      enableAdminOverride: config.enableAdminOverride !== false,
    };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Authenticate WebSocket connection
   * Performance target: <50ms
   */
  async authenticateConnection(
    token: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<AuthResult> {
    const startTime = Date.now();

    try {
      // Check rate limit
      const rateLimitResult = this.checkRateLimit(ipAddress);
      if (!rateLimitResult.allowed) {
        this.metrics.recordConnectionAttempt('rate_limited');
        return {
          success: false,
          error: 'Rate limit exceeded',
          errorCode: 'RATE_LIMITED',
        };
      }

      // Verify JWT token
      const verificationResult = this.verifyToken(token);
      if (!verificationResult.valid) {
        this.metrics.recordConnectionAttempt('invalid_token');
        return {
          success: false,
          error: verificationResult.error,
          errorCode: verificationResult.errorCode,
        };
      }

      const payload = verificationResult.payload!;

      // Check if session is still valid
      const sessionValid = await this.sessionManager.validateSession(payload.sub);
      if (!sessionValid) {
        this.metrics.recordConnectionAttempt('session_invalid');
        return {
          success: false,
          error: 'Session expired or invalid',
          errorCode: 'SESSION_INVALID',
        };
      }

      // Create connection context
      const context: WSConnectionContext = {
        userId: payload.sub,
        username: payload.username,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions,
        sessionId: this.generateSessionId(),
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        ipAddress,
        userAgent,
      };

      // Register session
      await this.sessionManager.registerConnection(context);

      // Record metrics
      const duration = Date.now() - startTime;
      this.metrics.recordConnectionEstablishment(context.role, duration);
      this.metrics.recordConnectionAttempt('success');

      // Check if token needs refresh
      if (this.shouldRefreshToken(payload)) {
        this.emit('tokenRefreshNeeded', {
          userId: context.userId,
          sessionId: context.sessionId,
        });
      }

      this.emit('connectionAuthenticated', context);

      return {
        success: true,
        context,
      };
    } catch (error) {
      console.error('[WSAuthMiddleware] Authentication error:', error);
      this.metrics.recordConnectionAttempt('error');
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }

  /**
   * Verify JWT token
   * Performance: <10ms
   */
  private verifyToken(token: string): {
    valid: boolean;
    payload?: TokenPayload;
    error?: string;
    errorCode?: AuthResult['errorCode'];
  } {
    try {
      const payload = verify(token, this.config.jwtSecret) as TokenPayload;

      // Check token type
      if (payload.type !== 'access') {
        return {
          valid: false,
          error: 'Invalid token type',
          errorCode: 'INVALID_TOKEN',
        };
      }

      return { valid: true, payload };
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        return {
          valid: false,
          error: 'Token expired',
          errorCode: 'EXPIRED_TOKEN',
        };
      }
      if (error instanceof JsonWebTokenError) {
        return {
          valid: false,
          error: 'Invalid token',
          errorCode: 'INVALID_TOKEN',
        };
      }
      return {
        valid: false,
        error: 'Token verification failed',
        errorCode: 'INVALID_TOKEN',
      };
    }
  }

  /**
   * Check rate limit for IP address
   */
  private checkRateLimit(ipAddress: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    let entry = this.rateLimitMap.get(ipAddress);

    // Initialize entry if not exists or expired
    if (!entry || now >= entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + this.config.rateLimitWindow,
      };
      this.rateLimitMap.set(ipAddress, entry);
    }

    // Check if blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      };
    }

    // Increment counter
    entry.count++;

    // Check if limit exceeded
    if (entry.count > this.config.maxConnectionsPerMinute) {
      // Block for rate limit window
      entry.blockedUntil = now + this.config.rateLimitWindow;
      this.emit('rateLimitExceeded', {
        ipAddress,
        count: entry.count,
        limit: this.config.maxConnectionsPerMinute,
      });
      return {
        allowed: false,
        retryAfter: Math.ceil(this.config.rateLimitWindow / 1000),
      };
    }

    return { allowed: true };
  }

  /**
   * Check if token should be refreshed
   */
  private shouldRefreshToken(payload: TokenPayload): boolean {
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - now;
    return timeUntilExpiry * 1000 < this.config.tokenRefreshThreshold;
  }

  /**
   * Authorize message (check permissions)
   * Performance target: <5ms
   */
  async authorizeMessage(
    context: WSConnectionContext,
    messageType: string,
    payload: unknown
  ): Promise<MessageAuthResult> {
    try {
      // Update last activity
      context.lastActivity = Date.now();
      await this.sessionManager.updateActivity(context.sessionId);

      // Admin override - allow all operations
      if (this.config.enableAdminOverride && context.role === 'admin') {
        return { allowed: true };
      }

      // Check permissions based on message type
      const authResult = await this.authorizer.authorizeMessage(
        context,
        messageType,
        payload
      );

      if (!authResult.allowed) {
        this.metrics.recordUnauthorizedAttempt(context.role, messageType);
        return authResult;
      }

      return { allowed: true };
    } catch (error) {
      console.error('[WSAuthMiddleware] Authorization error:', error);
      return {
        allowed: false,
        error: 'Authorization failed',
        reason: 'Internal error during authorization check',
      };
    }
  }

  /**
   * Handle disconnection
   */
  async handleDisconnect(context: WSConnectionContext, code: number, reason?: string): Promise<void> {
    await this.sessionManager.unregisterConnection(context.sessionId);
    this.metrics.recordDisconnection(context.role, code);

    this.emit('connectionDisconnected', {
      context,
      code,
      reason,
    });
  }

  /**
   * Refresh token for active connection
   */
  async refreshToken(context: WSConnectionContext, newToken: string): Promise<boolean> {
    try {
      const verificationResult = this.verifyToken(newToken);
      if (!verificationResult.valid) {
        return false;
      }

      // Update context with new permissions
      context.permissions = verificationResult.payload!.permissions;

      this.emit('tokenRefreshed', {
        userId: context.userId,
        sessionId: context.sessionId,
      });

      return true;
    } catch (error) {
      console.error('[WSAuthMiddleware] Token refresh error:', error);
      return false;
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean rate limit entries
    for (const [ip, entry] of this.rateLimitMap.entries()) {
      if (now >= entry.resetAt && (!entry.blockedUntil || now >= entry.blockedUntil)) {
        this.rateLimitMap.delete(ip);
      }
    }
  }

  /**
   * Get rate limit status for IP
   */
  getRateLimitStatus(ipAddress: string): {
    remaining: number;
    resetAt: number;
    blocked: boolean;
  } {
    const entry = this.rateLimitMap.get(ipAddress);
    const now = Date.now();

    if (!entry || now >= entry.resetAt) {
      return {
        remaining: this.config.maxConnectionsPerMinute,
        resetAt: now + this.config.rateLimitWindow,
        blocked: false,
      };
    }

    return {
      remaining: Math.max(0, this.config.maxConnectionsPerMinute - entry.count),
      resetAt: entry.resetAt,
      blocked: !!(entry.blockedUntil && now < entry.blockedUntil),
    };
  }

  /**
   * Shutdown middleware
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.rateLimitMap.clear();
    this.removeAllListeners();
  }

  /**
   * Get middleware statistics
   */
  getStats(): {
    rateLimitEntries: number;
    config: Required<WSAuthMiddlewareConfig>;
  } {
    return {
      rateLimitEntries: this.rateLimitMap.size,
      config: this.config,
    };
  }
}

/**
 * Create middleware instance with default dependencies
 */
export function createWSAuthMiddleware(
  authService: AuthService,
  config?: Partial<WSAuthMiddlewareConfig>
): WSAuthMiddleware {
  const sessionManager = new WSSessionManager(authService);
  const authorizer = new WSAuthorizer();
  const metrics = new WSMetrics();

  return new WSAuthMiddleware(authService, sessionManager, authorizer, metrics, config);
}

export default WSAuthMiddleware;
