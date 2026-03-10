/**
 * Circuit Breaker for POLLN Spreadsheets
 *
 * Implements the circuit breaker pattern to prevent cascading failures
 * and provide automatic recovery when services become available again.
 */

import {
  CircuitBreakerConfig,
  CircuitSnapshot,
  CircuitState,
} from './types.js';
import { CircuitBreakerOpenError } from './PollnError.js';

/**
 * Circuit breaker state tracking
 */
interface CircuitBreakerState {
  /** Current state */
  state: CircuitState;
  /** Number of failures in current window */
  failureCount: number;
  /** Number of successes in current window */
  successCount: number;
  /** Last failure timestamp */
  lastFailureTime?: number;
  /** Last success timestamp */
  lastSuccessTime?: number;
  /** When the circuit will attempt recovery */
  nextAttemptTime?: number;
  /** Window start time for counting failures */
  windowStartTime: number;
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private config: Required<CircuitBreakerConfig>;
  private state: CircuitBreakerState;
  private stateChangedCallbacks: Array<(state: CircuitState) => void> = [];

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      name: config.name,
      failureThreshold: config.failureThreshold ?? 5,
      timeout: config.timeout ?? 60000, // 1 minute
      resetTimeout: config.resetTimeout ?? 30000, // 30 seconds
      successThreshold: config.successThreshold ?? 2,
      onOpen: config.onOpen ?? (() => {}),
      onClose: config.onClose ?? (() => {}),
      onHalfOpen: config.onHalfOpen ?? (() => {}),
    };

    this.state = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      windowStartTime: Date.now(),
    };
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state.state === CircuitState.OPEN) {
      // Check if we should attempt recovery
      if (Date.now() >= this.state.nextAttemptTime!) {
        this.transitionToHalfOpen();
      } else {
        throw new CircuitBreakerOpenError(
          this.config.name,
          this.state.nextAttemptTime! - Date.now()
        );
      }
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
   * Handle successful execution
   */
  private onSuccess(): void {
    this.state.successCount++;
    this.state.lastSuccessTime = Date.now();

    if (this.state.state === CircuitState.HALF_OPEN) {
      // In half-open, successes count toward closing
      if (this.state.successCount >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    } else {
      // In closed state, reset failure count on success
      if (this.state.successCount >= this.config.failureThreshold) {
        this.resetFailureCount();
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    // Check if we've exceeded the threshold
    if (this.shouldOpenCircuit()) {
      this.transitionToOpen();
    }
  }

  /**
   * Check if circuit should open
   */
  private shouldOpenCircuit(): boolean {
    const now = Date.now();
    const windowElapsed = now - this.state.windowStartTime;

    // Reset window if timeout has passed
    if (windowElapsed > this.config.timeout) {
      this.state.windowStartTime = now;
      this.state.failureCount = 0;
      return false;
    }

    return this.state.failureCount >= this.config.failureThreshold;
  }

  /**
   * Transition to open state
   */
  private transitionToOpen(): void {
    this.state.state = CircuitState.OPEN;
    this.state.nextAttemptTime = Date.now() + this.config.resetTimeout;
    this.config.onOpen();
    this.notifyStateChanged(CircuitState.OPEN);
  }

  /**
   * Transition to half-open state
   */
  private transitionToHalfOpen(): void {
    this.state.state = CircuitState.HALF_OPEN;
    this.state.successCount = 0;
    this.config.onHalfOpen();
    this.notifyStateChanged(CircuitState.HALF_OPEN);
  }

  /**
   * Transition to closed state
   */
  private transitionToClosed(): void {
    this.state.state = CircuitState.CLOSED;
    this.resetFailureCount();
    this.config.onClose();
    this.notifyStateChanged(CircuitState.CLOSED);
  }

  /**
   * Reset failure count and window
   */
  private resetFailureCount(): void {
    this.state.failureCount = 0;
    this.state.successCount = 0;
    this.state.windowStartTime = Date.now();
  }

  /**
   * Notify state change subscribers
   */
  private notifyStateChanged(state: CircuitState): void {
    this.stateChangedCallbacks.forEach(callback => callback(state));
  }

  /**
   * Get current circuit snapshot
   */
  getSnapshot(): CircuitSnapshot {
    return {
      state: this.state.state,
      failureCount: this.state.failureCount,
      successCount: this.state.successCount,
      lastFailureTime: this.state.lastFailureTime,
      lastSuccessTime: this.state.lastSuccessTime,
      nextAttemptTime: this.state.nextAttemptTime,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state.state;
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit is closed
   */
  isClosed(): boolean {
    return this.state.state === CircuitState.CLOSED;
  }

  /**
   * Manually open the circuit
   */
  open(): void {
    this.transitionToOpen();
  }

  /**
   * Manually close the circuit
   */
  close(): void {
    this.transitionToClosed();
  }

  /**
   * Reset the circuit to closed state
   */
  reset(): void {
    this.transitionToClosed();
  }

  /**
   * Subscribe to state changes
   */
  onStateChanged(callback: (state: CircuitState) => void): () => void {
    this.stateChangedCallbacks.push(callback);
    return () => {
      const index = this.stateChangedCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateChangedCallbacks.splice(index, 1);
      }
    };
  }
}

/**
 * Circuit breaker registry for managing multiple breakers
 */
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {}

  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  /**
   * Get or create a circuit breaker
   */
  getOrCreate(config: CircuitBreakerConfig): CircuitBreaker {
    let breaker = this.breakers.get(config.name);

    if (!breaker) {
      breaker = new CircuitBreaker(config);
      this.breakers.set(config.name, breaker);
    }

    return breaker;
  }

  /**
   * Get an existing circuit breaker
   */
  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): boolean {
    return this.breakers.delete(name);
  }

  /**
   * Get all circuit breakers
   */
  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get snapshots of all circuit breakers
   */
  getAllSnapshots(): Map<string, CircuitSnapshot> {
    const snapshots = new Map<string, CircuitSnapshot>();

    Array.from(this.breakers.entries()).forEach(([name, breaker]) => {
      snapshots.set(name, breaker.getSnapshot());
    });

    return snapshots;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    Array.from(this.breakers.values()).forEach(breaker => breaker.reset());
  }
}

/**
 * Convenience function to get circuit breaker registry
 */
export function getCircuitBreakerRegistry(): CircuitBreakerRegistry {
  return CircuitBreakerRegistry.getInstance();
}

/**
 * Convenience function to get or create a circuit breaker
 */
export function getCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
  return CircuitBreakerRegistry.getInstance().getOrCreate(config);
}
