/**
 * POLLN Circuit Breaker
 * Circuit breaker pattern for fault tolerance
 */

import type { CircuitBreakerConfig, CircuitBreakerState } from './types.js';

/**
 * Circuit breaker states
 */
export enum CBState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  threshold: number; // failure rate threshold (0-1)
  timeout: number; // timeout in ms
  halfOpenTimeout: number; // time to stay in half-open state
  recoveryThreshold: number; // successful requests needed to recover
  monitoringPeriod?: number; // period to calculate failure rate
  minimumCalls?: number; // minimum calls before opening circuit
}

/**
 * Circuit breaker result
 */
export interface CircuitBreakerResult {
  allowed: boolean;
  state: CBState;
  reason?: string;
}

/**
 * Circuit Breaker Class
 * Implements the circuit breaker pattern
 */
export class CircuitBreaker {
  private state: CBState = CBState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private totalCalls: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;
  private failureTimes: number[] = [];

  private config: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions) {
    this.config = {
      threshold: options.threshold,
      timeout: options.timeout,
      halfOpenTimeout: options.halfOpenTimeout,
      recoveryThreshold: options.recoveryThreshold,
      monitoringPeriod: options.monitoringPeriod || 60000, // 1 minute
      minimumCalls: options.minimumCalls || 10
    };
  }

  /**
   * Execute request through circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.allowRequest();

    if (!result.allowed) {
      throw new Error(`Circuit breaker is ${result.state}: ${result.reason || 'Request not allowed'}`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if request is allowed
   */
  allowRequest(): CircuitBreakerResult {
    const now = Date.now();

    // Check if we should attempt to transition from open to half-open
    if (this.state === CBState.OPEN && now >= this.nextAttemptTime) {
      this.transitionTo(CBState.HALF_OPEN);
      return {
        allowed: true,
        state: this.state,
        reason: 'Half-open state: attempting recovery'
      };
    }

    switch (this.state) {
      case CBState.CLOSED:
        return {
          allowed: true,
          state: this.state
        };

      case CBState.OPEN:
        return {
          allowed: false,
          state: this.state,
          reason: `Circuit is open. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`
        };

      case CBState.HALF_OPEN:
        return {
          allowed: true,
          state: this.state,
          reason: 'Half-open: testing service availability'
        };

      default:
        return {
          allowed: false,
          state: this.state,
          reason: 'Unknown state'
        };
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    const now = Date.now();
    this.successes++;
    this.totalCalls++;

    if (this.state === CBState.HALF_OPEN) {
      if (this.successes >= this.config.recoveryThreshold) {
        this.transitionTo(CBState.CLOSED);
      }
    } else if (this.state === CBState.CLOSED) {
      // Clean up old failure times
      this.cleanupOldFailures(now);
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    const now = Date.now();
    this.failures++;
    this.totalCalls++;
    this.lastFailureTime = now;
    this.failureTimes.push(now);

    // Clean up old failures first
    this.cleanupOldFailures(now);

    if (this.state === CBState.HALF_OPEN) {
      // Failed in half-open state, go back to open
      this.transitionTo(CBState.OPEN);
    } else if (this.state === CBState.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpenCircuit()) {
        this.transitionTo(CBState.OPEN);
      }
    }
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    // Need minimum calls before opening
    if (this.totalCalls < this.config.minimumCalls) {
      return false;
    }

    // Check failure rate
    const failureRate = this.failures / this.totalCalls;
    return failureRate >= this.config.threshold;
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CBState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === CBState.OPEN) {
      this.nextAttemptTime = Date.now() + this.config.halfOpenTimeout;
    }

    if (newState === CBState.CLOSED) {
      this.reset();
    }

    if (newState === CBState.HALF_OPEN) {
      this.successes = 0;
    }
  }

  /**
   * Clean up old failure times
   */
  private cleanupOldFailures(now: number): void {
    const cutoff = now - this.config.monitoringPeriod;
    this.failureTimes = this.failureTimes.filter(t => t > cutoff);
    this.failures = this.failureTimes.length;
  }

  /**
   * Reset circuit breaker
   */
  private reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.totalCalls = 0;
    this.failureTimes = [];
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  /**
   * Force open the circuit
   */
  forceOpen(): void {
    this.transitionTo(CBState.OPEN);
  }

  /**
   * Force close the circuit
   */
  forceClose(): void {
    this.transitionTo(CBState.CLOSED);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalCalls: this.totalCalls,
      failureRate: this.totalCalls > 0 ? (this.failures / this.totalCalls) : 0,
      successRate: this.totalCalls > 0 ? (this.successes / this.totalCalls) : 0,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }
}

/**
 * Circuit breaker registry for managing multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  register(name: string, options: CircuitBreakerOptions): CircuitBreaker {
    const breaker = new CircuitBreaker(options);
    this.breakers.set(name, breaker);
    return breaker;
  }

  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  getAllStats(): Record<string, ReturnType<CircuitBreaker['getStats']>> {
    const stats: Record<string, any> = {};
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    options?: CircuitBreakerOptions
  ): Promise<T> {
    let breaker = this.get(name);

    if (!breaker && options) {
      breaker = this.register(name, options);
    }

    if (!breaker) {
      // No circuit breaker configured, execute directly
      return await fn();
    }

    return await breaker.execute(fn);
  }
}
