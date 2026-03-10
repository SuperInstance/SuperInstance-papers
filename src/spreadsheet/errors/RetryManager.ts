/**
 * Retry Manager for POLLN Spreadsheets
 *
 * Advanced retry logic with exponential backoff,
 * jitter, circuit breaker integration, and configurable policies.
 */

import type { RetryOptions } from './types.js';
import { PollnError } from './PollnError.js';
import { CircuitBreaker, getCircuitBreaker } from './CircuitBreaker.js';

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  retryableCodes: [],
  shouldRetry: () => true,
  onRetry: () => {},
};

/**
 * Retry manager for handling transient failures
 */
export class RetryManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Execute a function with retry logic
   */
  async retry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error | undefined;
    let delay = config.initialDelay;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        if (attempt === config.maxRetries || !this.shouldRetry(lastError, config)) {
          throw lastError;
        }

        // Call retry callback
        config.onRetry(attempt + 1, lastError);

        // Wait before retrying
        await this.sleep(delay);

        // Calculate next delay with exponential backoff and jitter
        delay = this.calculateDelay(delay, config);
      }
    }

    throw lastError;
  }

  /**
   * Execute with exponential backoff
   */
  async withBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    return this.retry(fn, { maxRetries });
  }

  /**
   * Execute with circuit breaker protection
   */
  async withCircuitBreaker<T>(
    fn: () => Promise<T>,
    breakerName: string
  ): Promise<T> {
    let breaker = this.circuitBreakers.get(breakerName);

    if (!breaker) {
      breaker = getCircuitBreaker({ name: breakerName });
      this.circuitBreakers.set(breakerName, breaker);
    }

    return breaker.execute(fn);
  }

  /**
   * Execute with both retry and circuit breaker
   */
  async withRetryAndCircuitBreaker<T>(
    fn: () => Promise<T>,
    options?: RetryOptions & { breakerName?: string }
  ): Promise<T> {
    const { breakerName, ...retryOptions } = options ?? {};

    if (breakerName) {
      return this.withCircuitBreaker(
        () => this.retry(fn, retryOptions),
        breakerName
      );
    }

    return this.retry(fn, retryOptions);
  }

  /**
   * Determine if an error should be retried
   */
  private shouldRetry(error: Error, config: Required<RetryOptions>): boolean {
    // Check custom retry condition first
    if (!config.shouldRetry(error)) {
      return false;
    }

    // Check if it's a PollnError
    if (error instanceof PollnError) {
      // Check if code is in retryable list
      if (config.retryableCodes.length > 0) {
        return config.retryableCodes.includes(error.code);
      }

      // Use default retryable codes
      return this.isDefaultRetryable(error);
    }

    // Retry network errors
    if (
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if PollnError is retryable by default
   */
  private isDefaultRetryable(error: PollnError): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'CONNECTION_LOST',
      'DATABASE_ERROR',
      'EXTERNAL_API_ERROR',
      'EXTERNAL_API_TIMEOUT',
      'EXTERNAL_API_UNAVAILABLE',
      'SERVICE_UNAVAILABLE',
      'VERSION_CONFLICT',
      'QUOTA_EXCEEDED',
      'LOCKED_CELL',
      'DEPENDENCY_FAILED',
      'COMPUTATION_ERROR',
    ];

    return retryableCodes.includes(error.code);
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(
    currentDelay: number,
    config: Required<RetryOptions>
  ): number {
    // Exponential backoff
    const exponentialDelay = currentDelay * config.backoffMultiplier;

    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * config.jitterFactor * (Math.random() * 2 - 1);
    const delayWithJitter = exponentialDelay + jitter;

    // Cap at max delay
    return Math.min(delayWithJitter, config.maxDelay);
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(breakerName: string): string | undefined {
    const breaker = this.circuitBreakers.get(breakerName);
    return breaker?.getState();
  }

  /**
   * Reset a specific circuit breaker
   */
  resetCircuitBreaker(breakerName: string): void {
    const breaker = this.circuitBreakers.get(breakerName);
    breaker?.reset();
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    Array.from(this.circuitBreakers.values()).forEach(breaker => breaker.reset());
  }
}

/**
 * Global retry manager instance
 */
export const globalRetryManager = new RetryManager();

/**
 * Convenience function to retry with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  return globalRetryManager.retry(fn, options);
}

/**
 * Convenience function to retry with backoff
 */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  maxRetries?: number
): Promise<T> {
  return globalRetryManager.withBackoff(fn, maxRetries);
}

/**
 * Convenience function to retry with circuit breaker
 */
export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  breakerName: string
): Promise<T> {
  return globalRetryManager.withCircuitBreaker(fn, breakerName);
}

/**
 * Convenience function to retry with both strategies
 */
export async function withRetryAndCircuitBreaker<T>(
  fn: () => Promise<T>,
  options?: RetryOptions & { breakerName?: string }
): Promise<T> {
  return globalRetryManager.withRetryAndCircuitBreaker(fn, options);
}
