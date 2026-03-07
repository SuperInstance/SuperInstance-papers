/**
 * POLLN Base agent implementation
 * Pattern-Organized Large language network
 */

import { EventEmitter } from 'events';
import { v4 } from 'uuid';
import type { A2APackage, AgentConfig, SubsumptionLayer, PrivacyLevel } from './types';

/**
 * BaseAgent - the fundamental unit of POLLN
 *
 * Following Svadharma: each agent has its proper duty according to nature
 */
export abstract class BaseAgent<TConfig = unknown> extends EventEmitter {
  public readonly id: string;
  protected readonly config: AgentConfig;

  // State
  protected state: Map<string, unknown> = new Map();
  protected lastActive: number = 0;

  // Value function (karmic record)
  protected valueFunction: number = 0.5;
  protected successCount: number = 0;
  protected failureCount: number = 0;

  // Constructor
  constructor(config: AgentConfig) {
    super();
    this.id = config.id;
    this.config = config;
    this.state = new Map();
    this.lastActive = Date.now();
  }

  // Core lifecycle methods
  abstract initialize(): Promise<void>;
  abstract process<T>(input: T): Promise<A2APackage<T>>;
  abstract shutdown(): Promise<void>;

  // State management
  public getState<K>(key: string): K | undefined {
    return this.state.get(key) as K;
  }

  public setState<K>(key: string, value: K): void {
    this.state.set(key, value);
  }

  // Value function updates (Hebbian learning)
  public updateValueFunction(reward: number): void {
    // Time-decay eligibility trace
    const decayFactor = 0.99;
    const eligibilityTrace = this.state.get('eligibilityTrace') as Map<string, number> || {};

    // Decay old traces
    for (const [actionId, trace] of Object.entries(eligibilityTrace)) {
      const age = Date.now() - trace.timestamp;
      trace.value *= Math.pow(decayFactor, age / 1000);
    }

    // Update value based on reward
    this.valueFunction = Math.max(0, Math.min(1,
      this.valueFunction + 0.1 * (reward - 0.5)
    ));
    this.successCount += reward > 0 ? 1 : 0;
    this.failureCount += reward < 0 ? 1 : 0;
  }

  // Activity tracking
  public touch(): void {
    this.lastActive = Date.now();
  }
}
