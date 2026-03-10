/**
 * Tests for Circuit Breaker
 */

import { describe, it, expect, beforeEach, vi, useFakeTimers } from '@jest/globals';
import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  getCircuitBreakerRegistry,
  getCircuitBreaker,
} from '../CircuitBreaker.js';
import { CircuitBreakerOpenError } from '../PollnError.js';
import { CircuitState } from '../types.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;
  let mockOnOpen: ReturnType<typeof vi.fn>;
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockOnHalfOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnOpen = vi.fn();
    mockOnClose = vi.fn();
    mockOnHalfOpen = vi.fn();

    breaker = new CircuitBreaker({
      name: 'test-breaker',
      failureThreshold: 3,
      timeout: 10000,
      resetTimeout: 5000,
      successThreshold: 2,
      onOpen: mockOnOpen,
      onClose: mockOnClose,
      onHalfOpen: mockOnHalfOpen,
    });
  });

  describe('initial state', () => {
    it('should start in closed state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.isClosed()).toBe(true);
      expect(breaker.isOpen()).toBe(false);
    });

    it('should have correct snapshot', () => {
      const snapshot = breaker.getSnapshot();

      expect(snapshot.state).toBe(CircuitState.CLOSED);
      expect(snapshot.failureCount).toBe(0);
      expect(snapshot.successCount).toBe(0);
    });
  });

  describe('successful execution', () => {
    it('should execute function successfully', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      await expect(breaker.execute(fn)).resolves.toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should track successes', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      await breaker.execute(fn);
      await breaker.execute(fn);

      const snapshot = breaker.getSnapshot();
      expect(snapshot.successCount).toBe(2);
    });
  });

  describe('failed execution', () => {
    it('should track failures', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('failure'));

      await expect(breaker.execute(fn)).rejects.toThrow();
      await expect(breaker.execute(fn)).rejects.toThrow();

      const snapshot = breaker.getSnapshot();
      expect(snapshot.failureCount).toBe(2);
    });

    it('should open after threshold', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('failure'));

      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(mockOnOpen).toHaveBeenCalledTimes(1);
    });

    it('should reject when open', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('failure'));

      // Trip the breaker
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      // Should be open now
      await expect(breaker.execute(fn)).rejects.toThrow(CircuitBreakerOpenError);
    });
  });

  describe('recovery', () => {
    useFakeTimers();

    it('should transition to half-open after reset timeout', async () => {
      const failFn = vi.fn().mockRejectedValue(new Error('failure'));
      const successFn = vi.fn().mockResolvedValue('success');

      // Trip the breaker
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failFn)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Fast-forward past reset timeout
      vi.advanceTimersByTime(6000);

      // Should transition to half-open
      await expect(breaker.execute(successFn)).resolves.toBe('success');
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
      expect(mockOnHalfOpen).toHaveBeenCalledTimes(1);
    });

    it('should close after successful attempts in half-open', async () => {
      const failFn = vi.fn().mockRejectedValue(new Error('failure'));
      const successFn = vi.fn().mockResolvedValue('success');

      // Trip the breaker
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failFn)).rejects.toThrow();
      }

      // Fast-forward and transition to half-open
      vi.advanceTimersByTime(6000);
      await breaker.execute(successFn);

      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      // More successes should close it
      await breaker.execute(successFn);

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should reopen on failure in half-open', async () => {
      const failFn = vi.fn().mockRejectedValue(new Error('failure'));
      const successFn = vi.fn().mockResolvedValue('success');

      // Trip the breaker
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failFn)).rejects.toThrow();
      }

      // Fast-forward and transition to half-open
      vi.advanceTimersByTime(6000);
      await breaker.execute(successFn);

      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Failure should reopen
      await expect(breaker.execute(failFn)).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('manual control', () => {
    it('should manually open', () => {
      breaker.open();

      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(mockOnOpen).toHaveBeenCalledTimes(1);
    });

    it('should manually close', () => {
      breaker.open();
      breaker.close();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should reset', () => {
      breaker.open();
      breaker.reset();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      const snapshot = breaker.getSnapshot();
      expect(snapshot.failureCount).toBe(0);
    });
  });

  describe('state change notifications', () => {
    it('should notify state changes', () => {
      const callback = vi.fn();
      const unsubscribe = breaker.onStateChanged(callback);

      breaker.open();
      expect(callback).toHaveBeenCalledWith(CircuitState.OPEN);

      breaker.close();
      expect(callback).toHaveBeenCalledWith(CircuitState.CLOSED);

      unsubscribe();

      breaker.open();
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    registry = getCircuitBreakerRegistry();
    registry.resetAll();
  });

  describe('getOrCreate', () => {
    it('should create new breaker', () => {
      const breaker = registry.getOrCreate({
        name: 'new-breaker',
      });

      expect(breaker).toBeInstanceOf(CircuitBreaker);
    });

    it('should return existing breaker', () => {
      const breaker1 = registry.getOrCreate({
        name: 'test-breaker',
      });
      const breaker2 = registry.getOrCreate({
        name: 'test-breaker',
      });

      expect(breaker1).toBe(breaker2);
    });
  });

  describe('get', () => {
    it('should return existing breaker', () => {
      const breaker1 = registry.getOrCreate({
        name: 'test-breaker',
      });
      const breaker2 = registry.get('test-breaker');

      expect(breaker1).toBe(breaker2);
    });

    it('should return undefined for non-existent breaker', () => {
      const breaker = registry.get('non-existent');
      expect(breaker).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should remove breaker', () => {
      registry.getOrCreate({ name: 'test-breaker' });
      const removed = registry.remove('test-breaker');

      expect(removed).toBe(true);
      expect(registry.get('test-breaker')).toBeUndefined();
    });

    it('should return false for non-existent breaker', () => {
      const removed = registry.remove('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('getAllSnapshots', () => {
    it('should return snapshots of all breakers', () => {
      registry.getOrCreate({ name: 'breaker1' });
      registry.getOrCreate({ name: 'breaker2' });

      const snapshots = registry.getAllSnapshots();

      expect(snapshots.size).toBe(2);
      expect(snapshots.has('breaker1')).toBe(true);
      expect(snapshots.has('breaker2')).toBe(true);
    });
  });

  describe('resetAll', () => {
    it('should reset all breakers', () => {
      const breaker1 = registry.getOrCreate({ name: 'breaker1' });
      const breaker2 = registry.getOrCreate({ name: 'breaker2' });

      breaker1.open();
      breaker2.open();

      registry.resetAll();

      expect(breaker1.getState()).toBe(CircuitState.CLOSED);
      expect(breaker2.getState()).toBe(CircuitState.CLOSED);
    });
  });
});

describe('getCircuitBreaker', () => {
  it('should get or create breaker', () => {
    const breaker1 = getCircuitBreaker({ name: 'test' });
    const breaker2 = getCircuitBreaker({ name: 'test' });

    expect(breaker1).toBe(breaker2);
  });
});
