/**
 * POLLN META Tiles - Pluripotent Agents
 *
 * META tiles are undifferentiated agents that can transform into
 * specialized roles based on environmental needs.
 *
 * Like stem cells in biology, they:
 * - Start undifferentiated
 * - Sense environmental demands
 * - Differentiate into needed specializations
 * - Can re-differentiate if conditions change
 *
 * Based on FINAL_INTEGRATION.md: META Tiles concept
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import type { AgentConfig } from './types.js';
import { TileCategory, RoleAgent, TaskAgent, CoreAgent } from './agents.js';

// ============================================================================
// META TILE TYPES
// ============================================================================

/**
 * Differentiation potential - what a META tile can become
 */
export enum DifferentiationPotential {
  TASK = 'TASK',       // Can become task agents
  ROLE = 'ROLE',       // Can become role agents
  CORE = 'CORE',       // Can become core agents
  UNIVERSAL = 'UNIVERSAL', // Can become any type
}

/**
 * Environmental signals that trigger differentiation
 */
export interface DifferentiationSignal {
  type: 'demand' | 'stress' | 'opportunity' | 'succession';
  agentType: 'task' | 'role' | 'core';
  urgency: number;  // 0-1, how quickly to differentiate
  context: Map<string, unknown>;
  timestamp: number;
}

/**
 * META Tile state
 */
export enum MetaTileState {
  UNDIFFERENTIATED = 'UNDIFFERENTIATED',
  DIFFERENTIATING = 'DIFFERENTIATING',
  DIFFERENTIATED = 'DIFFERENTIATED',
  RE_DIFFERENTIATING = 'RE_DIFFERENTIATING',
}

/**
 * Configuration for META tile
 */
export interface MetaTileConfig {
  id: string;
  potential: DifferentiationPotential;
  environmentalSensitivity: number; // 0-1, how reactive to signals
  differentiationThreshold: number; // Signal strength needed to differentiate
  reDifferentiationCooldown: number; // MS before re-differentiation allowed
  maxDifferentiations: number; // Max times can re-differentiate
}

/**
 * Record of a differentiation event
 */
export interface DifferentiationRecord {
  id: string;
  timestamp: number;
  fromState: MetaTileState;
  toType: 'task' | 'role' | 'core';
  signal: DifferentiationSignal;
  success: boolean;
}

// ============================================================================
// META TILE IMPLEMENTATION
// ============================================================================

/**
 * MetaTile - Pluripotent agent that can become any type
 *
 * Lifecycle:
 * 1. Born undifferentiated (META state)
 * 2. Monitors environmental signals
 * 3. Differentiates when threshold met
 * 4. Can re-differentiate if conditions change
 */
export class MetaTile extends EventEmitter {
  public readonly id: string;
  public state: MetaTileState = MetaTileState.UNDIFFERENTIATED;
  public currentAgent: TaskAgent | RoleAgent | CoreAgent | null = null;

  private config: MetaTileConfig;
  private signalBuffer: DifferentiationSignal[] = [];
  private differentiationHistory: DifferentiationRecord[] = [];
  private lastDifferentiationTime: number = 0;
  private differentiationCount: number = 0;

  constructor(config: MetaTileConfig) {
    super();
    this.id = config.id;
    this.config = config;
  }

  /**
   * Sense environmental signals
   */
  sense(signal: DifferentiationSignal): void {
    this.signalBuffer.push(signal);

    // Trim buffer to last 100 signals
    if (this.signalBuffer.length > 100) {
      this.signalBuffer.shift();
    }

    this.emit('signal_received', signal);

    // Check if should differentiate
    if (this.shouldDifferentiate(signal)) {
      this.initiateDifferentiation(signal);
    }
  }

  /**
   * Check if signal strength exceeds differentiation threshold
   */
  private shouldDifferentiate(signal: DifferentiationSignal): boolean {
    // Already differentiated and cooling down
    if (this.state !== MetaTileState.UNDIFFERENTIATED &&
        this.state !== MetaTileState.DIFFERENTIATED) {
      return false;
    }

    // Check if can re-differentiate
    if (this.state === MetaTileState.DIFFERENTIATED) {
      const cooldownEnd = this.lastDifferentiationTime + this.config.reDifferentiationCooldown;
      if (Date.now() < cooldownEnd) {
        return false;
      }
      if (this.differentiationCount >= this.config.maxDifferentiations) {
        return false;
      }
    }

    // Check potential matches signal
    if (!this.canBecome(signal.agentType)) {
      return false;
    }

    // Check signal strength vs threshold
    const adjustedStrength = signal.urgency * this.config.environmentalSensitivity;
    return adjustedStrength >= this.config.differentiationThreshold;
  }

  /**
   * Check if META tile can differentiate into given type
   */
  canBecome(type: 'task' | 'role' | 'core'): boolean {
    switch (this.config.potential) {
      case DifferentiationPotential.UNIVERSAL:
        return true;
      case DifferentiationPotential.TASK:
        return type === 'task';
      case DifferentiationPotential.ROLE:
        return type === 'role';
      case DifferentiationPotential.CORE:
        return type === 'core';
      default:
        return false;
    }
  }

  /**
   * Initiate differentiation into specific type
   */
  private async initiateDifferentiation(signal: DifferentiationSignal): Promise<void> {
    const previousState = this.state;
    this.state = this.state === MetaTileState.DIFFERENTIATED
      ? MetaTileState.RE_DIFFERENTIATING
      : MetaTileState.DIFFERENTIATING;

    this.emit('differentiation_started', {
      from: previousState,
      to: signal.agentType,
      signal,
    });

    try {
      // Create the differentiated agent
      this.currentAgent = this.createAgent(signal.agentType, signal.context);

      // Initialize the new agent
      if (this.currentAgent) {
        await this.currentAgent.initialize();
      }

      this.state = MetaTileState.DIFFERENTIATED;
      this.lastDifferentiationTime = Date.now();
      this.differentiationCount++;

      const record: DifferentiationRecord = {
        id: uuidv4(),
        timestamp: Date.now(),
        fromState: previousState,
        toType: signal.agentType,
        signal,
        success: true,
      };
      this.differentiationHistory.push(record);

      this.emit('differentiation_complete', {
        type: signal.agentType,
        agent: this.currentAgent,
        record,
      });
    } catch (error) {
      this.state = previousState;
      const record: DifferentiationRecord = {
        id: uuidv4(),
        timestamp: Date.now(),
        fromState: previousState,
        toType: signal.agentType,
        signal,
        success: false,
      };
      this.differentiationHistory.push(record);

      this.emit('differentiation_failed', {
        error,
        record,
      });
    }
  }

  /**
   * Create the appropriate agent type
   */
  private createAgent(
    type: 'task' | 'role' | 'core',
    context: Map<string, unknown>
  ): TaskAgent | RoleAgent | CoreAgent | null {
    const baseConfig: AgentConfig = {
      id: `${this.id}-${type}-${Date.now()}`,
      typeId: type,
      categoryId: type === 'task' ? 'ephemeral' : type,
      modelFamily: 'meta-differentiated',
      defaultParams: Object.fromEntries(context),
      inputTopics: [],
      outputTopic: 'output',
      minExamples: type === 'task' ? 1 : type === 'role' ? 10 : 100,
      requiresWorldModel: type === 'core',
    };

    switch (type) {
      case 'task':
        return new TaskAgent(baseConfig);
      case 'role':
        return new RoleAgent(baseConfig);
      case 'core':
        return new CoreAgent(baseConfig);
      default:
        return null;
    }
  }

  /**
   * Get aggregated signal strength for a type
   */
  getSignalStrength(type: 'task' | 'role' | 'core'): number {
    const relevantSignals = this.signalBuffer.filter(s => s.agentType === type);
    if (relevantSignals.length === 0) return 0;

    // Exponential decay weighted average
    const now = Date.now();
    let totalWeight = 0;
    let weightedSum = 0;

    for (const signal of relevantSignals) {
      const age = now - signal.timestamp;
      const decay = Math.exp(-age / 60000); // 1-minute half-life
      totalWeight += decay;
      weightedSum += signal.urgency * decay;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Get differentiation history
   */
  getHistory(): DifferentiationRecord[] {
    return [...this.differentiationHistory];
  }

  /**
   * Get current state info
   */
  getStatus(): {
    id: string;
    state: MetaTileState;
    potential: DifferentiationPotential;
    currentType: string | null;
    differentiationCount: number;
    signalStrengths: Record<string, number>;
  } {
    return {
      id: this.id,
      state: this.state,
      potential: this.config.potential,
      currentType: this.currentAgent?.constructor.name || null,
      differentiationCount: this.differentiationCount,
      signalStrengths: {
        task: this.getSignalStrength('task'),
        role: this.getSignalStrength('role'),
        core: this.getSignalStrength('core'),
      },
    };
  }
}

// ============================================================================
// META TILE MANAGER
// ============================================================================

/**
 * Manages a pool of META tiles and their differentiation
 */
export class MetaTileManager extends EventEmitter {
  private metaTiles: Map<string, MetaTile> = new Map();
  private globalSignals: DifferentiationSignal[] = [];

  constructor() {
    super();
  }

  /**
   * Spawn a new META tile
   */
  spawnMetaTile(config?: Partial<MetaTileConfig>): MetaTile {
    const fullConfig: MetaTileConfig = {
      id: `meta-${uuidv4()}`,
      potential: DifferentiationPotential.UNIVERSAL,
      environmentalSensitivity: 0.7,
      differentiationThreshold: 0.6,
      reDifferentiationCooldown: 300000, // 5 minutes
      maxDifferentiations: 3,
      ...config,
    };

    const metaTile = new MetaTile(fullConfig);
    this.metaTiles.set(metaTile.id, metaTile);

    // Forward events
    metaTile.on('differentiation_complete', (data) => {
      this.emit('meta_differentiated', { metaTileId: metaTile.id, ...data });
    });

    this.emit('meta_spawned', { id: metaTile.id, potential: fullConfig.potential });
    return metaTile;
  }

  /**
   * Broadcast environmental signal to all META tiles
   */
  broadcastSignal(signal: Omit<DifferentiationSignal, 'timestamp'>): void {
    const fullSignal: DifferentiationSignal = {
      ...signal,
      timestamp: Date.now(),
    };

    this.globalSignals.push(fullSignal);

    // Trim to last 1000 signals
    if (this.globalSignals.length > 1000) {
      this.globalSignals.shift();
    }

    // Broadcast to all META tiles
    for (const metaTile of this.metaTiles.values()) {
      metaTile.sense(fullSignal);
    }

    this.emit('signal_broadcast', fullSignal);
  }

  /**
   * Get undifferentiated META tiles
   */
  getUndifferentiated(): MetaTile[] {
    return Array.from(this.metaTiles.values())
      .filter(m => m.state === MetaTileState.UNDIFFERENTIATED);
  }

  /**
   * Get differentiated META tiles by type
   */
  getDifferentiatedByType(type: 'task' | 'role' | 'core'): MetaTile[] {
    return Array.from(this.metaTiles.values())
      .filter(m =>
        m.state === MetaTileState.DIFFERENTIATED &&
        m.currentAgent?.config.typeId === type
      );
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    undifferentiated: number;
    differentiated: { task: number; role: number; core: number };
    recentSignals: number;
  } {
    return {
      total: this.metaTiles.size,
      undifferentiated: this.getUndifferentiated().length,
      differentiated: {
        task: this.getDifferentiatedByType('task').length,
        role: this.getDifferentiatedByType('role').length,
        core: this.getDifferentiatedByType('core').length,
      },
      recentSignals: this.globalSignals.length,
    };
  }
}
