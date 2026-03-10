/**
 * POLLN Rate Limiter
 * Token bucket and sliding window rate limiting
 */

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  windowStart: number;
}

/**
 * Rate limiter options
 */
export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (identifier: string) => string;
}

/**
 * Rate limiter result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Rate Limiter Class
 * Implements token bucket and sliding window algorithms
 */
export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private options: Required<RateLimiterOptions>;

  constructor(options: RateLimiterOptions) {
    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
      keyGenerator: options.keyGenerator || ((id) => id)
    };
  }

  /**
   * Check if request is allowed
   */
  check(identifier: string, skipCheck?: boolean): RateLimitResult {
    const key = this.options.keyGenerator(identifier);
    const now = Date.now();

    let entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        windowStart: now,
        resetTime: now + this.options.windowMs
      };
      this.store.set(key, entry);
    }

    // Check if limit exceeded
    const allowed = entry.count < this.options.maxRequests;
    const remaining = Math.max(0, this.options.maxRequests - entry.count);
    const retryAfter = allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000);

    // Increment count if not skipping
    if (allowed && !skipCheck) {
      entry.count++;
      this.store.set(key, entry);
    }

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return {
      allowed,
      limit: this.options.maxRequests,
      remaining,
      resetTime: entry.resetTime,
      retryAfter
    };
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    const key = this.options.keyGenerator(identifier);
    this.store.delete(key);
  }

  /**
   * Get current count for identifier
   */
  getCount(identifier: string): number {
    const key = this.options.keyGenerator(identifier);
    const entry = this.store.get(key);
    return entry?.count || 0;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get all rate limit entries
   */
  getAllEntries(): Map<string, RateLimitEntry> {
    return new Map(this.store);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear();
  }
}

/**
 * Sliding Window Rate Limiter
 * More accurate but memory intensive
 */
export class SlidingWindowRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private options: Required<RateLimiterOptions>;

  constructor(options: RateLimiterOptions) {
    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
      keyGenerator: options.keyGenerator || ((id) => id)
    };
  }

  /**
   * Check if request is allowed using sliding window
   */
  check(identifier: string): RateLimitResult {
    const key = this.options.keyGenerator(identifier);
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    // Get existing requests or initialize
    let timestamps = this.requests.get(key) || [];

    // Filter out timestamps outside the window
    timestamps = timestamps.filter(t => t > windowStart);

    // Check if limit exceeded
    const allowed = timestamps.length < this.options.maxRequests;
    const remaining = Math.max(0, this.options.maxRequests - timestamps.length);

    // Add current timestamp if allowed
    if (allowed) {
      timestamps.push(now);
      this.requests.set(key, timestamps);
    }

    // Calculate retry after
    const retryAfter = allowed ? undefined : Math.ceil((timestamps[0] - windowStart) / 1000);

    return {
      allowed,
      limit: this.options.maxRequests,
      remaining,
      resetTime: now + this.options.windowMs,
      retryAfter
    };
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    const key = this.options.keyGenerator(identifier);
    this.requests.delete(key);
  }

  /**
   * Get current count for identifier
   */
  getCount(identifier: string): number {
    const key = this.options.keyGenerator(identifier);
    const timestamps = this.requests.get(key) || [];
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    return timestamps.filter(t => t > windowStart).length;
  }

  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    for (const [key, timestamps] of this.requests.entries()) {
      const filtered = timestamps.filter(t => t > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    }
  }
}

/**
 * Rate limit middleware factory
 */
export function createRateLimitMiddleware(options: RateLimiterOptions) {
  const limiter = new RateLimiter(options);

  return async (req: any, res: any, next: any) => {
    // Get identifier from IP, API key, or user ID
    const identifier = req.user?.id || req.apiKey || req.ip || 'anonymous';

    const result = limiter.check(identifier);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter?.toString() || '60');
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: result.retryAfter
      });
    }

    next();
  };
}
