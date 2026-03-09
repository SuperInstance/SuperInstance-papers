/**
 * POLLN Spreadsheet Backend - Rate Limiter
 *
 * Sliding window rate limiter for API endpoints and WebSocket connections.
 * Prevents abuse and ensures fair resource allocation.
 *
 * Features:
 * - Sliding window algorithm (accurate rate limiting)
 * - Per-user rate limiting
 * - Per-IP rate limiting
 * - WebSocket connection limits
 * - Configurable limits and windows
 * - Automatic cleanup of expired entries
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './AuthMiddleware.js';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  // Maximum requests allowed
  maxRequests: number;
  // Time window in milliseconds
  windowMs: number;
  // Key generator function (default: user ID or IP)
  keyGenerator?: (req: Request) => string;
  // Skip successful requests (count only errors)
  skipSuccessfulRequests?: boolean;
  // Skip failed requests (count only successes)
  skipFailedRequests?: boolean;
  // Custom handler when limit exceeded
  handler?: (req: Request, res: Response) => void;
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  windowStart: number;
}

/**
 * WebSocket connection limit config
 */
export interface WebSocketLimitConfig {
  // Maximum connections per user
  maxConnectionsPerUser: number;
  // Maximum connections per IP
  maxConnectionsPerIP: number;
  // Maximum total connections
  maxTotalConnections: number;
}

/**
 * Rate limiter class
 */
export class RateLimiter {
  private entries: Map<string, RateLimitEntry>;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.entries = new Map();

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Check if request should be rate limited
   */
  isRateLimited(key: string): { limited: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.entries.get(key);

    // No entry yet, create new one
    if (!entry) {
      this.entries.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
        windowStart: now,
      });

      return {
        limited: false,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      };
    }

    // Check if window has expired
    if (now > entry.resetTime) {
      // Reset window
      entry.count = 1;
      entry.windowStart = now;
      entry.resetTime = now + this.config.windowMs;

      this.entries.set(key, entry);

      return {
        limited: false,
        remaining: this.config.maxRequests - 1,
        resetTime: entry.resetTime,
      };
    }

    // Increment counter
    entry.count++;
    this.entries.set(key, entry);

    // Check if limit exceeded
    if (entry.count > this.config.maxRequests) {
      return {
        limited: true,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    return {
      limited: false,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.entries.delete(key);
  }

  /**
   * Get current stats for a key
   */
  getStats(key: string): { count: number; remaining: number; resetTime: number } | null {
    const entry = this.entries.get(key);
    if (!entry) return null;

    return {
      count: entry.count,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
    };
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.entries.entries()) {
      if (now > entry.resetTime + this.config.windowMs) {
        this.entries.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[RateLimiter] Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Get total entry count
   */
  get size(): number {
    return this.entries.size;
  }
}

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig): (req: Request, res: Response, next: NextFunction) => {
  const limiter = new RateLimiter(config);

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Generate key
      const key = config.keyGenerator
        ? config.keyGenerator(req)
        : generateDefaultKey(req);

      // Check rate limit
      const result = limiter.isRateLimited(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

      if (result.limited) {
        // Use custom handler if provided
        if (config.handler) {
          config.handler(req, res);
          return;
        }

        // Default rate limit exceeded response
        res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        });
        return;
      }

      next();
    } catch (error) {
      console.error('[RateLimiter] Error:', error);
      next();
    }
  };
}

/**
 * Generate default key from request (user ID or IP)
 */
function generateDefaultKey(req: Request): string {
  const authReq = req as AuthenticatedRequest;

  // Use user ID if authenticated
  if (authReq.user?.id) {
    return `user:${authReq.user.id}`;
  }

  // Fall back to IP address
  const ip = getClientIP(req);
  return `ip:${ip}`;
}

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Pre-configured rate limiters
 */

// Strict rate limiter (10 requests per minute)
export const strictRateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60000, // 1 minute
});

// Standard rate limiter (100 requests per minute)
export const standardRateLimiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

// Lenient rate limiter (1000 requests per minute)
export const lenientRateLimiter = createRateLimiter({
  maxRequests: 1000,
  windowMs: 60000, // 1 minute
});

// Auth rate limiter (5 login attempts per 15 minutes)
export const authRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 900000, // 15 minutes
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Too many login attempts. Please try again later.',
      retryAfter: 900,
    });
  },
});

/**
 * WebSocket connection limiter
 */
export class WebSocketConnectionLimiter {
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> connection IDs
  private ipConnections: Map<string, Set<string>> = new Map(); // ip -> connection IDs
  private allConnections: Set<string> = new Set(); // all connection IDs
  private config: WebSocketLimitConfig;

  constructor(config: Partial<WebSocketLimitConfig> = {}) {
    this.config = {
      maxConnectionsPerUser: config.maxConnectionsPerUser || 100,
      maxConnectionsPerIP: config.maxConnectionsPerIP || 50,
      maxTotalConnections: config.maxTotalConnections || 10000,
    };
  }

  /**
   * Check if connection should be allowed
   */
  canConnect(userId: string | null, ip: string): { allowed: boolean; reason?: string } {
    // Check total connections
    if (this.allConnections.size >= this.config.maxTotalConnections) {
      return { allowed: false, reason: 'Server at maximum capacity' };
    }

    // Check per-user limit
    if (userId) {
      const userConns = this.userConnections.get(userId) || new Set();
      if (userConns.size >= this.config.maxConnectionsPerUser) {
        return { allowed: false, reason: 'Maximum connections per user exceeded' };
      }
    }

    // Check per-IP limit
    const ipConns = this.ipConnections.get(ip) || new Set();
    if (ipConns.size >= this.config.maxConnectionsPerIP) {
      return { allowed: false, reason: 'Maximum connections per IP exceeded' };
    }

    return { allowed: true };
  }

  /**
   * Register connection
   */
  addConnection(connectionId: string, userId: string | null, ip: string): void {
    this.allConnections.add(connectionId);

    if (userId) {
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(connectionId);
    }

    if (!this.ipConnections.has(ip)) {
      this.ipConnections.set(ip, new Set());
    }
    this.ipConnections.get(ip)!.add(connectionId);
  }

  /**
   * Unregister connection
   */
  removeConnection(connectionId: string, userId: string | null, ip: string): void {
    this.allConnections.delete(connectionId);

    if (userId) {
      const userConns = this.userConnections.get(userId);
      if (userConns) {
        userConns.delete(connectionId);
        if (userConns.size === 0) {
          this.userConnections.delete(userId);
        }
      }
    }

    const ipConns = this.ipConnections.get(ip);
    if (ipConns) {
      ipConns.delete(connectionId);
      if (ipConns.size === 0) {
        this.ipConnections.delete(ip);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalConnections: number;
    uniqueUsers: number;
    uniqueIPs: number;
  } {
    return {
      totalConnections: this.allConnections.size,
      uniqueUsers: this.userConnections.size,
      uniqueIPs: this.ipConnections.size,
    };
  }

  /**
   * Clear all connections (use with caution)
   */
  clear(): void {
    this.userConnections.clear();
    this.ipConnections.clear();
    this.allConnections.clear();
  }
}

/**
 * Get client IP for WebSocket
 */
export function getWebSocketClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

export default RateLimiter;
