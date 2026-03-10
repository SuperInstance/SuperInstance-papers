/**
 * Tests for Retry Manager
 */

import { describe, it, expect, beforeEach, vi, useFakeTimers } from '@jest/globals';
import { RetryManager, globalRetryManager } from '../RetryManager.js';
import { PollnError, NetworkError, InvalidCellError } from '../PollnError.js';

describe('RetryManager', () => {
  let manager: RetryManager;

  beforeEach(() => {
    manager = new RetryManager();
    vi.clearAllMocks();
  });

  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      await expect(manager.retry(fn)).resolves.toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      useFakeTimers();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error', 'NETWORK_ERROR', 0))
        .mockResolvedValue('success');

      const promise = manager.retry(fn, { maxRetries: 2, initialDelay: 100 });

      // First attempt fails
      await vi.runAllTimersAsync();

      // Second attempt succeeds
      await promise;

      expect(fn).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('should not retry non-retryable error', async () => {
      const fn = vi.fn().mockRejectedValue(new InvalidCellError('ZZ999'));

      await expect(manager.retry(fn)).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should respect max retries', async () => {
      useFakeTimers();
      const fn = vi.fn().mockRejectedValue(new NetworkError('Network error', 'NETWORK_ERROR', 0));

      await expect(
        manager.retry(fn, { maxRetries: 2, initialDelay: 100 })
      ).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
      vi.useRealTimers();
    });

    it('should use exponential backoff', async () => {
      useFakeTimers();
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      global.setTimeout = vi.fn().mockImplementation((cb, delay) => {
        delays.push(delay);
        return originalSetTimeout(cb, delay);
      }) as unknown as typeof setTimeout;

      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error', 'NETWORK_ERROR', 0))
        .mockRejectedValueOnce(new NetworkError('Network error', 'NETWORK_ERROR', 0))
        .mockResolvedValue('success');

      await manager.retry(fn, {
        maxRetries: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
      });

      // Check exponential backoff
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(200); // 100 * 2

      global.setTimeout = originalSetTimeout;
      vi.useRealTimers();
    });

    it('should apply jitter', async () => {
      useFakeTimers();
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      global.setTimeout = vi.fn().mockImplementation((cb, delay) => {
        delays.push(delay);
        return originalSetTimeout(cb, delay);
      }) as unknown as typeof setTimeout;

      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error', 'NETWORK_ERROR', 0))
        .mockResolvedValue('success');

      await manager.retry(fn, {
        maxRetries: 1,
        initialDelay: 100,
        jitterFactor: 0.5,
      });

      // Should have some jitter
      expect(delays[0]).not.toBe(100);
      expect(delays[0]).toBeGreaterThan(50);
      expect(delays[0]).toBeLessThan(150);

      global.setTimeout = originalSetTimeout;
      vi.useRealTimers();
    });

    it('should respect max delay', async () => {
      useFakeTimers();
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      global.setTimeout = vi.fn().mockImplementation((cb, delay) => {
        delays.push(delay);
        return originalSetTimeout(cb, delay);
      }) as unknown as typeof setTimeout;

      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error', 'NETWORK_ERROR', 0))
        .mockRejectedValueOnce(new NetworkError('Network error', 'NETWORK_ERROR', 0))
        .mockResolvedValue('success');

      await manager.retry(fn, {
        maxRetries: 3,
        initialDelay: 100,
        backoffMultiplier: 10,
        maxDelay: 150,
      });

      // Should cap at max delay
      delays.forEach(delay => {
        expect(delay).toBeLessThanOrEqual(150);
      });

      global.setTimeout = originalSetTimeout;
      vi.useRealTimers();
    });

    it('should call onRetry callback', async () => {
      useFakeTimers();
      const onRetry = vi.fn();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error', 'NETWORK_ERROR', 0))
        .mockResolvedValue('success');

      await manager.retry(fn, {
        maxRetries: 2,
        initialDelay: 100,
        onRetry,
      });

      await vi.runAllTimersAsync();

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
      vi.useRealTimers();
    });

    it('should respect custom shouldRetry', async () => {
      const fn = vi.fn().mockRejectedValue(new NetworkError('Network error', 'NETWORK_ERROR', 0));
      const shouldRetry = vi.fn().mockReturnValue(false);

      await expect(
        manager.retry(fn, {
          maxRetries: 3,
          shouldRetry,
        })
      ).rejects.toThrow();

      expect(shouldRetry).toHaveBeenCalled();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should filter by retryable codes', async () => {
      const fn = vi.fn().mockRejectedValue(
        new PollnError('Custom error', 'INTERNAL_ERROR', 500)
      );

      await expect(
        manager.retry(fn, {
          maxRetries: 3,
          retryableCodes: ['INTERNAL_ERROR'],
        })
      ).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('withBackoff', () => {
    it('should retry with exponential backoff', async () => {
      useFakeTimers();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error', 'NETWORK_ERROR', 0))
        .mockResolvedValue('success');

      await expect(manager.withBackoff(fn, 2)).resolves.toBe('success');

      expect(fn).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });

  describe('withCircuitBreaker', () => {
    it('should use circuit breaker', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      await expect(manager.withCircuitBreaker(fn, 'test-breaker')).resolves.toBe(
        'success'
      );

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after failures', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('failure'));

      // Trip the circuit breaker
      for (let i = 0; i < 5; i++) {
        await expect(manager.withCircuitBreaker(fn, 'test-breaker')).rejects.toThrow();
      }

      // Should be open now
      await expect(manager.withCircuitBreaker(fn, 'test-breaker')).rejects.toThrow();
    });
  });

  describe('withRetryAndCircuitBreaker', () => {
    it('should combine retry and circuit breaker', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error', 'NETWORK_ERROR', 0))
        .mockResolvedValue('success');

      useFakeTimers();

      await expect(
        manager.withRetryAndCircuitBreaker(fn, {
          breakerName: 'test-breaker',
          maxRetries: 2,
          initialDelay: 100,
        })
      ).resolves.toBe('success');

      expect(fn).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });

  describe('circuit breaker management', () => {
    it('should get circuit breaker state', () => {
      manager.withCircuitBreaker(async () => {}, 'test-breaker');

      const state = manager.getCircuitBreakerState('test-breaker');
      expect(state).toBeDefined();
    });

    it('should reset circuit breaker', () => {
      manager.withCircuitBreaker(async () => {}, 'test-breaker');

      manager.resetCircuitBreaker('test-breaker');

      const state = manager.getCircuitBreakerState('test-breaker');
      expect(state).toBe('closed');
    });

    it('should reset all circuit breakers', () => {
      manager.withCircuitBreaker(async () => {}, 'breaker1');
      manager.withCircuitBreaker(async () => {}, 'breaker2');

      manager.resetAllCircuitBreakers();

      expect(manager.getCircuitBreakerState('breaker1')).toBe('closed');
      expect(manager.getCircuitBreakerState('breaker2')).toBe('closed');
    });
  });
});

describe('globalRetryManager', () => {
  it('should be singleton instance', () => {
    expect(globalRetryManager).toBeInstanceOf(RetryManager);
  });
});
