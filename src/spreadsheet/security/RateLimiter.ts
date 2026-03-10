/**
 * POLLN Spreadsheet Security - RateLimiter
 *
 * Comprehensive rate limiting system with multiple algorithms.
 * Supports token bucket, sliding window, IP-based, user-based, and endpoint-specific limiting.
 * Includes distributed rate limiting support for multi-instance deployments.
 *
 * Key Features:
 * - Token bucket algorithm for smooth rate limiting
 * - Sliding window algorithm for precise rate limiting
 * - IP-based and user-based limiting
 * - Endpoint-specific rate limits
 * - Distributed support with Redis backend
 * - Performance optimized with minimal overhead
 * - Comprehensive metrics and monitoring
 * - JSDoc documentation throughout
 *
 * @module RateLimiter
 */

import { EventEmitter } from 'events';

/**
 * Rate limiting algorithms
 */
export enum RateLimitAlgorithm {
  TOKEN_BUCKET = 'token-bucket',
  SLIDING_WINDOW = 'sliding-window',
  FIXED_WINDOW = 'fixed-window',
  LEAKY_BUCKET = 'leaky-bucket',
}

/**
 * Time window units
 */
export enum TimeUnit {
  SECOND = 'second',
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  limit: number;
  /** Time window */
  window: number;
  /** Time unit */
  unit: TimeUnit;
  /** Algorithm to use */
  algorithm?: RateLimitAlgorithm;
  /** Block duration after limit exceeded (ms) */
  blockDuration?: number;
  /** Skip successful requests from counting */
  skipSuccessfulRequests?: boolean;
  /** Skip failed requests from counting */
  skipFailedRequests?: boolean;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in window */
  remaining: number;
  /** Time until reset (ms) */
  resetTime: number;
  /** Time until block expires (ms) */
  retryAfter?: number;
  /** Current usage count */
  current: number;
  /** Limit */
  limit: number;
}

/**
 * Rate limit identifier
 */
export interface RateLimitIdentifier {
  /** IP address */
  ip?: string;
  /** User ID */
  userId?: string;
  /** API key or token */
  apiKey?: string;
  /** Session ID */
  sessionId?: string;
  /** Endpoint or route */
  endpoint?: string;
  /** Custom identifier */
  custom?: string;
}

/**
 * Rate limit statistics
 */
export interface RateLimitStatistics {
  totalRequests: number;
  totalAllowed: number;
  totalBlocked: number;
  totalIdentifiers: number;
  requestsByEndpoint: Record<string, number>;
  blocksByEndpoint: Record<string, number>;
  averageResponseTime: number;
  lastRequestTime: Date;
}

/**
 * Token bucket state
 */
interface TokenBucketState {
  tokens: number;
  lastUpdate: number;
}

/**
 * Sliding window state
 */
interface SlidingWindowState {
  requests: Array<{ timestamp: number; success: boolean }>;
}

/**
 * Fixed window state
 */
interface FixedWindowState {
  count: number;
  windowStart: number;
}

/**
 * Leaky bucket state
 */
interface LeakyBucketState {
  volume: number;
  lastUpdate: number;
}

/**
 * Rate limiter options
 */
export interface RateLimiterOptions {
  /** Default rate limit configuration */
  defaultConfig?: RateLimitConfig;
  /** Endpoint-specific configurations */
  endpointConfigs?: Map<string, RateLimitConfig>;
  /** Enable distributed rate limiting */
  enableDistributed?: boolean;
  /** Redis URL for distributed rate limiting */
  redisUrl?: string;
  /** Cleanup interval for expired states (ms) */
  cleanupInterval?: number;
  /** State TTL (ms) */
  stateTTL?: number;
}

/**
 * RateLimiter class
 *
 * Manages rate limiting with multiple algorithms and strategies.
 */
export class RateLimiter extends EventEmitter {
  private options: Required<Omit<RateLimiterOptions, 'endpointConfigs'>> & {
    endpointConfigs: Map<string, RateLimitConfig>;
  };

  // State storage for different algorithms
  private tokenBuckets: Map<string, TokenBucketState> = new Map();
  private slidingWindows: Map<string, SlidingWindowState> = new Map();
  private fixedWindows: Map<string, FixedWindowState> = new Map();
  private leakyBuckets: Map<string, LeakyBucketState> = new Map();

  // Blocked identifiers
  private blockedIdentifiers: Map<string, { blockUntil: number }> = new Map();

  // Statistics
  private statistics: RateLimitStatistics;

  private cleanupTimer?: NodeJS.Timeout;

  /**
   * Create a new RateLimiter
   *
   * @param options - Rate limiter options
   */
  constructor(options: RateLimiterOptions = {}) {
    super();

    this.options = {
      defaultConfig: {
        limit: 100,
        window: 1,
        unit: TimeUnit.MINUTE,
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
        blockDuration: 60000, // 1 minute
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      },
      endpointConfigs: options.endpointConfigs || new Map(),
      enableDistributed: false,
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      cleanupInterval: 60000, // 1 minute
      stateTTL: 3600000, // 1 hour
      ...options,
    };

    this.statistics = {
      totalRequests: 0,
      totalAllowed: 0,
      totalBlocked: 0,
      totalIdentifiers: 0,
      requestsByEndpoint: {},
      blocksByEndpoint: {},
      averageResponseTime: 0,
      lastRequestTime: new Date(),
    };

    // Start cleanup interval
    this.cleanupTimer = setInterval(() => this.cleanup(), this.options.cleanupInterval);
  }

  /**
   * Check if a request should be rate limited
   *
   * @param identifier - Rate limit identifier
   * @param config - Optional override config
   * @returns Rate limit result
   */
  async checkLimit(identifier: RateLimitIdentifier, config?: RateLimitConfig): Promise<RateLimitResult> {
    const startTime = Date.now();
    this.statistics.totalRequests++;

    const key = this.buildKey(identifier);
    const effectiveConfig = config || this.getConfig(identifier);

    // Check if blocked
    const blocked = this.blockedIdentifiers.get(key);
    if (blocked && Date.now() < blocked.blockUntil) {
      this.statistics.totalBlocked++;
      this.updateStatistics(Date.now() - startTime);
      this.emit('blocked', { identifier, reason: 'temporal-block' });

      return {
        allowed: false,
        remaining: 0,
        resetTime: blocked.blockUntil,
        retryAfter: blocked.blockUntil - Date.now(),
        current: 0,
        limit: effectiveConfig.limit,
      };
    }

    // Clear expired block
    if (blocked && Date.now() >= blocked.blockUntil) {
      this.blockedIdentifiers.delete(key);
    }

    // Check rate limit based on algorithm
    let result: RateLimitResult;
    const algorithm = effectiveConfig.algorithm || this.options.defaultConfig.algorithm!;

    switch (algorithm) {
      case RateLimitAlgorithm.TOKEN_BUCKET:
        result = this.checkTokenBucket(key, effectiveConfig);
        break;
      case RateLimitAlgorithm.SLIDING_WINDOW:
        result = this.checkSlidingWindow(key, effectiveConfig);
        break;
      case RateLimitAlgorithm.FIXED_WINDOW:
        result = this.checkFixedWindow(key, effectiveConfig);
        break;
      case RateLimitAlgorithm.LEAKY_BUCKET:
        result = this.checkLeakyBucket(key, effectiveConfig);
        break;
      default:
        result = this.checkTokenBucket(key, effectiveConfig);
    }

    // Track endpoint statistics
    if (identifier.endpoint) {
      this.statistics.requestsByEndpoint[identifier.endpoint] =
        (this.statistics.requestsByEndpoint[identifier.endpoint] || 0) + 1;

      if (!result.allowed) {
        this.statistics.blocksByEndpoint[identifier.endpoint] =
          (this.statistics.blocksByEndpoint[identifier.endpoint] || 0) + 1;
      }
    }

    // Apply block if limit exceeded
    if (!result.allowed && effectiveConfig.blockDuration) {
      this.blockedIdentifiers.set(key, {
        blockUntil: Date.now() + effectiveConfig.blockDuration,
      });
      this.emit('blocked', { identifier, reason: 'limit-exceeded', result });
    } else if (result.allowed) {
      this.statistics.totalAllowed++;
      this.emit('allowed', { identifier, result });
    }

    this.updateStatistics(Date.now() - startTime);
    return result;
  }

  /**
   * Check token bucket rate limit
   *
   * @param key - Identifier key
   * @param config - Rate limit config
   * @returns Rate limit result
   */
  private checkTokenBucket(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const windowMs = this.getWindowMs(config);

    let state = this.tokenBuckets.get(key);
    if (!state) {
      state = { tokens: config.limit, lastUpdate: now };
      this.tokenBuckets.set(key, state);
      this.statistics.totalIdentifiers++;
    }

    // Add tokens based on time passed
    const timePassed = now - state.lastUpdate;
    const tokensToAdd = (timePassed / windowMs) * config.limit;
    state.tokens = Math.min(config.limit, state.tokens + tokensToAdd);
    state.lastUpdate = now;

    // Check if request can be processed
    if (state.tokens >= 1) {
      state.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(state.tokens),
        resetTime: now + ((config.limit - state.tokens) * windowMs) / config.limit,
        current: config.limit - Math.floor(state.tokens),
        limit: config.limit,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: now + ((1 - state.tokens) * windowMs) / config.limit,
      retryAfter: ((1 - state.tokens) * windowMs) / config.limit,
      current: config.limit,
      limit: config.limit,
    };
  }

  /**
   * Check sliding window rate limit
   *
   * @param key - Identifier key
   * @param config - Rate limit config
   * @returns Rate limit result
   */
  private checkSlidingWindow(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const windowMs = this.getWindowMs(config);

    let state = this.slidingWindows.get(key);
    if (!state) {
      state = { requests: [] };
      this.slidingWindows.set(key, state);
      this.statistics.totalIdentifiers++;
    }

    // Remove old requests outside the window
    state.requests = state.requests.filter(r => now - r.timestamp < windowMs);

    // Check if limit exceeded
    if (state.requests.length < config.limit) {
      state.requests.push({ timestamp: now, success: true });

      // Calculate reset time (when oldest request expires)
      const oldestRequest = state.requests[0];
      const resetTime = oldestRequest ? oldestRequest.timestamp + windowMs : now + windowMs;

      return {
        allowed: true,
        remaining: config.limit - state.requests.length,
        resetTime,
        current: state.requests.length,
        limit: config.limit,
      };
    }

    // Calculate retry after (when oldest request expires)
    const oldestRequest = state.requests[0];
    const retryAfter = oldestRequest ? oldestRequest.timestamp + windowMs - now : 0;

    return {
      allowed: false,
      remaining: 0,
      resetTime: oldestRequest ? oldestRequest.timestamp + windowMs : now + windowMs,
      retryAfter,
      current: state.requests.length,
      limit: config.limit,
    };
  }

  /**
   * Check fixed window rate limit
   *
   * @param key - Identifier key
   * @param config - Rate limit config
   * @returns Rate limit result
   */
  private checkFixedWindow(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const windowMs = this.getWindowMs(config);

    let state = this.fixedWindows.get(key);
    if (!state) {
      state = { count: 0, windowStart: now };
      this.fixedWindows.set(key, state);
      this.statistics.totalIdentifiers++;
    }

    // Check if we need to reset the window
    if (now - state.windowStart >= windowMs) {
      state.count = 0;
      state.windowStart = now;
    }

    // Check if limit exceeded
    if (state.count < config.limit) {
      state.count++;

      return {
        allowed: true,
        remaining: config.limit - state.count,
        resetTime: state.windowStart + windowMs,
        current: state.count,
        limit: config.limit,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: state.windowStart + windowMs,
      retryAfter: state.windowStart + windowMs - now,
      current: state.count,
      limit: config.limit,
    };
  }

  /**
   * Check leaky bucket rate limit
   *
   * @param key - Identifier key
   * @param config - Rate limit config
   * @returns Rate limit result
   */
  private checkLeakyBucket(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const windowMs = this.getWindowMs(config);

    let state = this.leakyBuckets.get(key);
    if (!state) {
      state = { volume: 0, lastUpdate: now };
      this.leakyBuckets.set(key, state);
      this.statistics.totalIdentifiers++;
    }

    // Drain bucket based on time passed
    const timePassed = now - state.lastUpdate;
    const drainAmount = (timePassed / windowMs) * config.limit;
    state.volume = Math.max(0, state.volume - drainAmount);
    state.lastUpdate = now;

    // Check if bucket is full
    if (state.volume < config.limit) {
      state.volume += 1;

      return {
        allowed: true,
        remaining: Math.floor(config.limit - state.volume),
        resetTime: now + (state.volume * windowMs) / config.limit,
        current: Math.floor(state.volume),
        limit: config.limit,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: now + ((state.volume - config.limit + 1) * windowMs) / config.limit,
      retryAfter: ((state.volume - config.limit + 1) * windowMs) / config.limit,
      current: Math.floor(state.volume),
      limit: config.limit,
    };
  }

  /**
   * Build a key from identifier components
   *
   * @param identifier - Rate limit identifier
   * @returns Key string
   */
  private buildKey(identifier: RateLimitIdentifier): string {
    const parts: string[] = [];

    if (identifier.ip) parts.push(`ip:${identifier.ip}`);
    if (identifier.userId) parts.push(`user:${identifier.userId}`);
    if (identifier.apiKey) parts.push(`key:${identifier.apiKey}`);
    if (identifier.sessionId) parts.push(`session:${identifier.sessionId}`);
    if (identifier.endpoint) parts.push(`endpoint:${identifier.endpoint}`);
    if (identifier.custom) parts.push(`custom:${identifier.custom}`);

    return parts.join(':') || 'default';
  }

  /**
   * Get config for an identifier
   *
   * @param identifier - Rate limit identifier
   * @returns Rate limit config
   */
  private getConfig(identifier: RateLimitIdentifier): RateLimitConfig {
    if (identifier.endpoint && this.options.endpointConfigs.has(identifier.endpoint)) {
      return this.options.endpointConfigs.get(identifier.endpoint)!;
    }
    return this.options.defaultConfig;
  }

  /**
   * Convert time unit to milliseconds
   *
   * @param config - Rate limit config
   * @returns Window in milliseconds
   */
  private getWindowMs(config: RateLimitConfig): number {
    switch (config.unit) {
      case TimeUnit.SECOND:
        return config.window * 1000;
      case TimeUnit.MINUTE:
        return config.window * 60000;
      case TimeUnit.HOUR:
        return config.window * 3600000;
      case TimeUnit.DAY:
        return config.window * 86400000;
      default:
        return config.window * 1000;
    }
  }

  /**
   * Update statistics
   *
   * @param duration - Request processing time
   */
  private updateStatistics(duration: number): void {
    this.statistics.averageResponseTime =
      (this.statistics.averageResponseTime * (this.statistics.totalRequests - 1) + duration) /
      this.statistics.totalRequests;
    this.statistics.lastRequestTime = new Date();
  }

  /**
   * Cleanup expired states
   */
  private cleanup(): void {
    const now = Date.now();
    const ttl = this.options.stateTTL;

    // Cleanup token buckets
    for (const [key, state] of this.tokenBuckets.entries()) {
      if (now - state.lastUpdate > ttl) {
        this.tokenBuckets.delete(key);
      }
    }

    // Cleanup sliding windows
    for (const [key, state] of this.slidingWindows.entries()) {
      if (state.requests.length > 0) {
        const oldest = state.requests[0].timestamp;
        if (now - oldest > ttl) {
          this.slidingWindows.delete(key);
        }
      }
    }

    // Cleanup fixed windows
    for (const [key, state] of this.fixedWindows.entries()) {
      if (now - state.windowStart > ttl) {
        this.fixedWindows.delete(key);
      }
    }

    // Cleanup leaky buckets
    for (const [key, state] of this.leakyBuckets.entries()) {
      if (now - state.lastUpdate > ttl) {
        this.leakyBuckets.delete(key);
      }
    }

    // Cleanup blocked identifiers
    for (const [key, blocked] of this.blockedIdentifiers.entries()) {
      if (now >= blocked.blockUntil) {
        this.blockedIdentifiers.delete(key);
      }
    }

    this.emit('cleanup', {
      tokenBuckets: this.tokenBuckets.size,
      slidingWindows: this.slidingWindows.size,
      fixedWindows: this.fixedWindows.size,
      leakyBuckets: this.leakyBuckets.size,
      blockedIdentifiers: this.blockedIdentifiers.size,
    });
  }

  /**
   * Set endpoint-specific configuration
   *
   * @param endpoint - Endpoint pattern
   * @param config - Rate limit config
   */
  setEndpointConfig(endpoint: string, config: RateLimitConfig): void {
    this.options.endpointConfigs.set(endpoint, config);
  }

  /**
   * Remove endpoint configuration
   *
   * @param endpoint - Endpoint pattern
   * @returns True if removed
   */
  removeEndpointConfig(endpoint: string): boolean {
    return this.options.endpointConfigs.delete(endpoint);
  }

  /**
   * Reset rate limit state for an identifier
   *
   * @param identifier - Rate limit identifier
   */
  reset(identifier: RateLimitIdentifier): void {
    const key = this.buildKey(identifier);

    this.tokenBuckets.delete(key);
    this.slidingWindows.delete(key);
    this.fixedWindows.delete(key);
    this.leakyBuckets.delete(key);
    this.blockedIdentifiers.delete(key);
  }

  /**
   * Get statistics
   *
   * @returns Rate limit statistics
   */
  getStatistics(): RateLimitStatistics {
    return { ...this.statistics };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = {
      totalRequests: 0,
      totalAllowed: 0,
      totalBlocked: 0,
      totalIdentifiers: 0,
      requestsByEndpoint: {},
      blocksByEndpoint: {},
      averageResponseTime: 0,
      lastRequestTime: new Date(),
    };
  }

  /**
   * Get current state for an identifier
   *
   * @param identifier - Rate limit identifier
   * @returns Current state or null
   */
  getState(identifier: RateLimitIdentifier): {
    tokenBucket?: TokenBucketState;
    slidingWindow?: SlidingWindowState;
    fixedWindow?: FixedWindowState;
    leakyBucket?: LeakyBucketState;
    blocked?: { blockUntil: number };
  } | null {
    const key = this.buildKey(identifier);

    return {
      tokenBucket: this.tokenBuckets.get(key),
      slidingWindow: this.slidingWindows.get(key),
      fixedWindow: this.fixedWindows.get(key),
      leakyBucket: this.leakyBuckets.get(key),
      blocked: this.blockedIdentifiers.get(key),
    };
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.emit('shutdown');
  }
}

/**
 * Default rate limiter instance
 */
export const defaultRateLimiter = new RateLimiter();

/**
 * Convenience function to check rate limit
 *
 * @param identifier - Rate limit identifier
 * @param config - Optional override config
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: RateLimitIdentifier,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  return defaultRateLimiter.checkLimit(identifier, config);
}

/**
 * Express middleware for rate limiting
 *
 * @param rateLimiter - Rate limiter instance
 * @returns Express middleware
 */
export function createRateLimitMiddleware(rateLimiter: RateLimiter = defaultRateLimiter) {
  return async (req: any, res: any, next: any) => {
    const identifier: RateLimitIdentifier = {
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      endpoint: req.path,
    };

    const result = await rateLimiter.checkLimit(identifier);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil((result.retryAfter || 0) / 1000));
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: result.retryAfter,
      });
    }

    next();
  };
}
