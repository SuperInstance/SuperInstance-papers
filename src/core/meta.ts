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
 * Mathematical Foundations:
 * - Attractor Dynamics: Gene regulatory network model
 * - Information Theory: Entropy-based exploration
 * - Multi-Armed Bandits: Thompson sampling for type selection
 * - Stability-Plasticity: Elastic weight consolidation
 *
 * Based on FINAL_INTEGRATION.md and pluripotent-agents-research.md
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import type { AgentConfig } from './types.js';
import { TileCategory, RoleAgent, TaskAgent, CoreAgent } from './agents.js';

// ============================================================================
// MATHEMATICAL TYPES
// ============================================================================

/**
 * Agent type identifier
 */
export type AgentType = 'task' | 'role' | 'core';

/**
 * Beta distribution parameters for Thompson sampling
 */
interface BetaDistribution {
  alpha: number;  // Success count + 1
  beta: number;   // Failure count + 1
}

/**
 * Attractor basin in state space
 */
interface AttractorBasin {
  type: AgentType;
  center: number[];      // Center in capability space
  depth: number;         // Stability (deeper = more stable)
  transitionProbs: Map<AgentType, number>;
}

/**
 * Signal accumulator with decay
 */
interface SignalAccumulator {
  total: number;
  count: number;
  lastUpdate: number;
  weightedSum: number;
}

/**
 * Fisher information for parameter importance (EWC)
 */
interface FisherInformation {
  capability: string;
  importance: number;
  optimalValue: number;
}

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
  agentType: AgentType;
  urgency: number;  // 0-1, how quickly to differentiate
  context: Map<string, unknown>;
  timestamp: number;
  confidence?: number;  // Signal reliability (0-1)
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

  // Advanced parameters
  signalDecayRate: number;      // How fast signals fade (λ in exponential decay)
  explorationScale: number;     // How much entropy affects exploration
  attractionStrength: number;   // How strongly attractors pull (α)
  fisherRegularization: number; // EWC regularization (λ_EWC)
  banditLearningRate: number;   // Non-stationary bandit update rate
}

/**
 * Record of a differentiation event
 */
export interface DifferentiationRecord {
  id: string;
  timestamp: number;
  fromState: MetaTileState;
  toType: AgentType;
  signal: DifferentiationSignal;
  success: boolean;
  confidence: number;
  entropy: number;
  attractorForce: number;
}

/**
 * Differentiation decision result
 */
export interface DifferentiationDecision {
  type: AgentType | null;
  confidence: number;
  reason: string;
  cost?: ReDifferentiationCost;
  signals?: Map<AgentType, number>;
}

/**
 * Cost of re-differentiation
 */
interface ReDifferentiationCost {
  knowledgeLoss: number;
  transitionEnergy: number;
  stabilityPenalty: number;
}

// ============================================================================
// MATHEMATICAL FUNCTIONS
// ============================================================================

/**
 * Sample from Beta distribution using Marsaglia's method
 */
function betaSample(alpha: number, beta: number): number {
  if (alpha <= 0 || beta <= 0) return 0.5;

  const u = Math.random();
  const v = Math.random();

  const x = Math.pow(u, 1 / alpha);
  const y = Math.pow(v, 1 / beta);

  return x / (x + y);
}

/**
 * Compute Shannon entropy
 * H(X) = -Σ p_i * log(p_i)
 */
function computeEntropy(probabilities: number[]): number {
  let entropy = 0;
  for (const p of probabilities) {
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

/**
 * Normalize to probability distribution
 */
function normalize(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + Math.max(0, b), 0);
  if (sum === 0) return values.map(() => 1 / values.length);
  return values.map(v => Math.max(0, v) / sum);
}

/**
 * Compute potential energy in state space
 * E(x) = -Σ w_ij * x_i * x_j + Σ θ_i * x_i + (λ/2) * Σ x_i²
 */
function computePotentialEnergy(
  state: number[],
  weights: number[][],
  biases: number[],
  regularization: number
): number {
  let energy = 0;

  // Interaction term: -Σ w_ij * x_i * x_j
  for (let i = 0; i < state.length; i++) {
    for (let j = 0; j < state.length; j++) {
      energy -= weights[i][j] * state[i] * state[j];
    }
  }

  // Bias term: +Σ θ_i * x_i
  for (let i = 0; i < state.length; i++) {
    energy += biases[i] * state[i];
  }

  // Regularization: +(λ/2) * Σ x_i²
  for (let i = 0; i < state.length; i++) {
    energy += (regularization / 2) * state[i] * state[i];
  }

  return energy;
}

/**
 * Compute gradient of potential energy (force toward attractor)
 */
function computeAttractorForce(
  state: number[],
  weights: number[][],
  biases: number[],
  regularization: number
): number[] {
  const force: number[] = [];

  for (let i = 0; i < state.length; i++) {
    // -∂E/∂x_i = Σ w_ij * x_j - θ_i - λ * x_i
    let f = 0;

    for (let j = 0; j < state.length; j++) {
      f += weights[i][j] * state[j];
    }

    f -= biases[i];
    f -= regularization * state[i];

    force.push(f);
  }

  return force;
}

// ============================================================================
// META TILE IMPLEMENTATION
// ============================================================================

/**
 * MetaTile - Pluripotent agent with advanced mathematical foundations
 *
 * Uses:
 * 1. Attractor Dynamics - Gene regulatory network model for state stability
 * 2. Thompson Sampling - Multi-armed bandit for type selection
 * 3. Information Theory - Entropy-based exploration control
 * 4. Elastic Weight Consolidation - Protection against catastrophic forgetting
 */
export class MetaTile extends EventEmitter {
  public readonly id: string;
  public state: MetaTileState = MetaTileState.UNDIFFERENTIATED;
  public currentAgent: TaskAgent | RoleAgent | CoreAgent | null = null;
  public differentiationCount: number = 0;

  private config: MetaTileConfig;
  private signalBuffer: DifferentiationSignal[] = [];
  private differentiationHistory: DifferentiationRecord[] = [];
  private lastDifferentiationTime: number = 0;

  // Mathematical state
  private signalAccumulators: Map<AgentType, SignalAccumulator> = new Map();
  private banditPosteriors: Map<AgentType, BetaDistribution> = new Map();
  private capabilityState: number[] = [0, 0, 0]; // [task, role, core] activation
  private interactionWeights: number[][]; // GRN weights
  private fisherInformation: FisherInformation[] = [];

  // Attractor basins for each type
  private attractorBasins: Map<AgentType, AttractorBasin> = new Map([
    ['task', {
      type: 'task',
      center: [1, 0, 0],
      depth: 0.8,
      transitionProbs: new Map([['task', 0.9], ['role', 0.08], ['core', 0.02]])
    }],
    ['role', {
      type: 'role',
      center: [0, 1, 0],
      depth: 0.9,
      transitionProbs: new Map([['task', 0.1], ['role', 0.85], ['core', 0.05]])
    }],
    ['core', {
      type: 'core',
      center: [0, 0, 1],
      depth: 1.0,
      transitionProbs: new Map([['task', 0.05], ['role', 0.05], ['core', 0.9]])
    }]
  ]);

  constructor(config: Partial<MetaTileConfig> & { id: string }) {
    super();
    this.id = config.id;

    // Default configuration with mathematical parameters
    this.config = {
      potential: DifferentiationPotential.UNIVERSAL,
      environmentalSensitivity: 0.7,
      differentiationThreshold: 0.6,
      reDifferentiationCooldown: 300000, // 5 minutes
      maxDifferentiations: 3,
      signalDecayRate: 0.1,
      explorationScale: 0.2,
      attractionStrength: 0.5,
      fisherRegularization: 0.01,
      banditLearningRate: 0.1,
      ...config,
    };

    // Initialize signal accumulators
    for (const type of ['task', 'role', 'core'] as AgentType[]) {
      this.signalAccumulators.set(type, {
        total: 0,
        count: 0,
        lastUpdate: 0,
        weightedSum: 0
      });
      this.banditPosteriors.set(type, { alpha: 1, beta: 1 }); // Uniform prior
    }

    // Initialize interaction weights (symmetric GRN)
    this.interactionWeights = [
      [0.5, -0.2, -0.3],  // task inhibits role/core
      [-0.2, 0.6, -0.2],  // role inhibits task/core
      [-0.3, -0.2, 0.8]   // core inhibits task/role
    ];
  }

  /**
   * Sense environmental signals with decay-weighted accumulation
   */
  sense(signal: DifferentiationSignal): void {
    // Add confidence if not provided
    const fullSignal = {
      ...signal,
      confidence: signal.confidence ?? 0.5,
      timestamp: signal.timestamp ?? Date.now()
    };

    this.signalBuffer.push(fullSignal);

    // Trim buffer
    if (this.signalBuffer.length > 100) {
      this.signalBuffer.shift();
    }

    // Update signal accumulator with exponential decay
    const accumulator = this.signalAccumulators.get(fullSignal.agentType)!;
    const now = Date.now();
    const timeSinceUpdate = now - accumulator.lastUpdate;

    // Apply decay to existing weighted sum
    const decayFactor = Math.exp(-this.config.signalDecayRate * timeSinceUpdate / 1000);
    accumulator.weightedSum *= decayFactor;
    accumulator.total *= decayFactor;

    // Add new signal
    accumulator.weightedSum += fullSignal.urgency * (fullSignal.confidence ?? 0.5);
    accumulator.total += fullSignal.urgency;
    accumulator.count++;
    accumulator.lastUpdate = now;

    this.emit('signal_received', fullSignal);

    // Check if should differentiate
    const decision = this.computeDifferentiationDecision();
    if (decision.type) {
      this.initiateDifferentiation(fullSignal, decision);
    }
  }

  /**
   * Compute differentiation decision using all mathematical models
   */
  private computeDifferentiationDecision(): DifferentiationDecision {
    // Check state constraints
    if (this.state === MetaTileState.DIFFERENTIATING ||
        this.state === MetaTileState.RE_DIFFERENTIATING) {
      return { type: null, confidence: 0, reason: 'already_differentiating' };
    }

    // Check cooldown
    if (this.state === MetaTileState.DIFFERENTIATED) {
      const cooldownEnd = this.lastDifferentiationTime + this.config.reDifferentiationCooldown;
      if (Date.now() < cooldownEnd) {
        return { type: null, confidence: 0, reason: 'cooldown' };
      }
      if (this.differentiationCount >= this.config.maxDifferentiations) {
        return { type: null, confidence: 0, reason: 'max_differentiations' };
      }
    }

    // Get aggregated signal strengths
    const signalStrengths = this.getAggregatedSignalStrengths();

    // 1. Thompson Sampling (Multi-Armed Bandit)
    const banditChoice = this.thompsonSample();

    // 2. Attractor Dynamics
    this.updateCapabilityState(signalStrengths);
    const attractorChoice = this.findNearestAttractor();

    // 3. Information-Theoretic Exploration
    const entropy = this.computeDecisionEntropy(signalStrengths);
    const explorationBonus = this.config.explorationScale * entropy;

    // 4. Combine decisions
    const scores = new Map<AgentType, number>();

    for (const type of ['task', 'role', 'core'] as AgentType[]) {
      if (!this.canBecome(type)) continue;

      const signalScore = signalStrengths.get(type) ?? 0;
      const banditScore = banditChoice === type ? 0.15 : 0;
      const attractorScore = attractorChoice === type ? 0.1 : 0;

      // Scale signal score to not penalize for confidence
      // Signal already has confidence baked in from accumulator
      const adjustedSignal = signalScore * 2; // Boost signal contribution

      scores.set(type, adjustedSignal + banditScore + attractorScore + explorationBonus * Math.random() * 0.1);
    }

    // Find best type
    let bestType: AgentType | null = null;
    let bestScore = 0;

    for (const [type, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    // Check threshold
    const threshold = this.config.differentiationThreshold;
    if (bestScore < threshold) {
      return {
        type: null,
        confidence: bestScore / threshold,
        reason: 'below_threshold',
        signals: signalStrengths
      };
    }

    return {
      type: bestType,
      confidence: bestScore,
      reason: 'decision_made',
      signals: signalStrengths
    };
  }

  /**
   * Thompson Sampling for type selection
   */
  private thompsonSample(): AgentType {
    let bestSample = -Infinity;
    let bestType: AgentType = 'task';

    for (const [type, posterior] of this.banditPosteriors) {
      if (!this.canBecome(type)) continue;

      const sample = betaSample(posterior.alpha, posterior.beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestType = type;
      }
    }

    return bestType;
  }

  /**
   * Update capability state using attractor dynamics
   */
  private updateCapabilityState(signalStrengths: Map<AgentType, number>): void {
    const biases = [
      signalStrengths.get('task') ?? 0,
      signalStrengths.get('role') ?? 0,
      signalStrengths.get('core') ?? 0
    ];

    // Gradient descent on potential energy
    const force = computeAttractorForce(
      this.capabilityState,
      this.interactionWeights,
      biases,
      this.config.fisherRegularization
    );

    // Update state with force
    for (let i = 0; i < this.capabilityState.length; i++) {
      this.capabilityState[i] += this.config.attractionStrength * force[i];
      this.capabilityState[i] = Math.max(0, Math.min(1, this.capabilityState[i]));
    }
  }

  /**
   * Find nearest attractor basin
   */
  private findNearestAttractor(): AgentType {
    let nearestType: AgentType = 'task';
    let minDistance = Infinity;

    for (const [type, basin] of this.attractorBasins) {
      if (!this.canBecome(type)) continue;

      // Euclidean distance to basin center
      let distance = 0;
      for (let i = 0; i < this.capabilityState.length; i++) {
        distance += Math.pow(this.capabilityState[i] - basin.center[i], 2);
      }
      distance = Math.sqrt(distance);

      // Weight by basin depth (deeper = more attractive)
      const weightedDistance = distance / basin.depth;

      if (weightedDistance < minDistance) {
        minDistance = weightedDistance;
        nearestType = type;
      }
    }

    return nearestType;
  }

  /**
   * Compute decision entropy for exploration control
   */
  private computeDecisionEntropy(signalStrengths: Map<AgentType, number>): number {
    const values = [
      signalStrengths.get('task') ?? 0,
      signalStrengths.get('role') ?? 0,
      signalStrengths.get('core') ?? 0
    ];

    const probs = normalize(values);
    return computeEntropy(probs);
  }

  /**
   * Get aggregated signal strengths with decay
   */
  private getAggregatedSignalStrengths(): Map<AgentType, number> {
    const strengths = new Map<AgentType, number>();
    const now = Date.now();

    for (const [type, accumulator] of this.signalAccumulators) {
      // Apply decay since last update
      const timeSinceUpdate = now - accumulator.lastUpdate;
      const decayFactor = Math.exp(-this.config.signalDecayRate * timeSinceUpdate / 1000);

      const adjustedStrength = accumulator.total > 0
        ? (accumulator.weightedSum * decayFactor) / accumulator.total
        : 0;

      strengths.set(type, adjustedStrength * this.config.environmentalSensitivity);
    }

    return strengths;
  }

  /**
   * Check if META tile can differentiate into given type
   */
  canBecome(type: AgentType): boolean {
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
   * Initiate differentiation with mathematical tracking
   */
  private async initiateDifferentiation(
    signal: DifferentiationSignal,
    decision: DifferentiationDecision
  ): Promise<void> {
    const previousState = this.state;
    this.state = this.state === MetaTileState.DIFFERENTIATED
      ? MetaTileState.RE_DIFFERENTIATING
      : MetaTileState.DIFFERENTIATING;

    const targetAgentType = decision.type!;

    this.emit('differentiation_started', {
      from: previousState,
      to: targetAgentType,
      decision,
    });

    try {
      // Compute re-differentiation cost if applicable
      let cost: ReDifferentiationCost | undefined;
      if (previousState === MetaTileState.DIFFERENTIATED) {
        cost = this.computeReDifferentiationCost(
          this.currentAgent?.config.typeId as AgentType,
          targetAgentType
        );
      }

      // Store Fisher information for EWC
      this.updateFisherInformation();

      // Create the differentiated agent
      this.currentAgent = this.createAgent(targetAgentType, signal.context);

      // Initialize the new agent
      if (this.currentAgent) {
        await this.currentAgent.initialize();
      }

      this.state = MetaTileState.DIFFERENTIATED;
      this.lastDifferentiationTime = Date.now();
      this.differentiationCount++;

      // Update bandit posterior (success)
      this.updateBanditPosterior(targetAgentType, true);

      // Reset capability state to attractor
      const basin = this.attractorBasins.get(targetAgentType)!;
      this.capabilityState = [...basin.center];

      const record: DifferentiationRecord = {
        id: uuidv4(),
        timestamp: Date.now(),
        fromState: previousState,
        toType: targetAgentType,
        signal,
        success: true,
        confidence: decision.confidence,
        entropy: this.computeDecisionEntropy(decision.signals ?? new Map()),
        attractorForce: this.computeAttractorMagnitude(),
      };
      this.differentiationHistory.push(record);

      this.emit('differentiation_complete', {
        type: targetAgentType,
        agent: this.currentAgent,
        record,
        cost,
      });
    } catch (error) {
      // Update bandit posterior (failure)
      this.updateBanditPosterior(targetAgentType, false);

      this.state = previousState;
      const record: DifferentiationRecord = {
        id: uuidv4(),
        timestamp: Date.now(),
        fromState: previousState,
        toType: targetAgentType,
        signal,
        success: false,
        confidence: decision.confidence,
        entropy: 0,
        attractorForce: 0,
      };
      this.differentiationHistory.push(record);

      this.emit('differentiation_failed', {
        error,
        record,
      });
    }
  }

  /**
   * Compute re-differentiation cost
   */
  private computeReDifferentiationCost(
    from: AgentType,
    to: AgentType
  ): ReDifferentiationCost {
    const basin = this.attractorBasins.get(from)!;
    const transitionProb = basin.transitionProbs.get(to) ?? 0;

    const timeSinceLast = Date.now() - this.lastDifferentiationTime;

    return {
      knowledgeLoss: 1 - transitionProb,
      transitionEnergy: 1 / (1 + timeSinceLast / 1000),
      stabilityPenalty: 1 / (1 + Math.log(timeSinceLast / 1000 + 1))
    };
  }

  /**
   * Update Fisher information for EWC
   */
  private updateFisherInformation(): void {
    // Simplified: store current capability state as important parameters
    this.fisherInformation = this.capabilityState.map((value, i) => ({
      capability: ['task', 'role', 'core'][i],
      importance: Math.abs(value),
      optimalValue: value
    }));
  }

  /**
   * Update bandit posterior with outcome
   */
  private updateBanditPosterior(type: AgentType, success: boolean): void {
    const posterior = this.banditPosteriors.get(type)!;

    if (success) {
      posterior.alpha += this.config.banditLearningRate;
    } else {
      posterior.beta += this.config.banditLearningRate;
    }
  }

  /**
   * Compute magnitude of attractor force
   */
  private computeAttractorMagnitude(): number {
    const biases = [0, 0, 0];
    const force = computeAttractorForce(
      this.capabilityState,
      this.interactionWeights,
      biases,
      this.config.fisherRegularization
    );
    return Math.sqrt(force.reduce((sum, f) => sum + f * f, 0));
  }

  /**
   * Create the appropriate agent type
   */
  private createAgent(
    type: AgentType,
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
   * Get signal strength for a type (public API)
   */
  getSignalStrength(type: AgentType): number {
    const strengths = this.getAggregatedSignalStrengths();
    return strengths.get(type) ?? 0;
  }

  /**
   * Get differentiation history
   */
  getHistory(): DifferentiationRecord[] {
    return [...this.differentiationHistory];
  }

  /**
   * Get current state info with mathematical diagnostics
   */
  getStatus(): {
    id: string;
    state: MetaTileState;
    potential: DifferentiationPotential;
    currentType: string | null;
    differentiationCount: number;
    signalStrengths: Record<AgentType, number>;
    capabilityState: number[];
    entropy: number;
    banditPosteriors: Record<AgentType, { alpha: number; beta: number }>;
  } {
    const signalStrengths = this.getAggregatedSignalStrengths();

    return {
      id: this.id,
      state: this.state,
      potential: this.config.potential,
      currentType: this.currentAgent?.config.typeId || null,
      differentiationCount: this.differentiationCount,
      signalStrengths: {
        task: signalStrengths.get('task') ?? 0,
        role: signalStrengths.get('role') ?? 0,
        core: signalStrengths.get('core') ?? 0,
      },
      capabilityState: [...this.capabilityState],
      entropy: this.computeDecisionEntropy(signalStrengths),
      banditPosteriors: {
        task: this.banditPosteriors.get('task')!,
        role: this.banditPosteriors.get('role')!,
        core: this.banditPosteriors.get('core')!,
      },
    };
  }
}

// ============================================================================
// META TILE MANAGER
// ============================================================================

/**
 * Manages a pool of META tiles with population dynamics
 */
export class MetaTileManager extends EventEmitter {
  private metaTiles: Map<string, MetaTile> = new Map();
  private globalSignals: DifferentiationSignal[] = [];
  private typeDistribution: Map<AgentType, number> = new Map([
    ['task', 0],
    ['role', 0],
    ['core', 0]
  ]);

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
      reDifferentiationCooldown: 300000,
      maxDifferentiations: 3,
      signalDecayRate: 0.1,
      explorationScale: 0.2,
      attractionStrength: 0.5,
      fisherRegularization: 0.01,
      banditLearningRate: 0.1,
      ...config,
    };

    const metaTile = new MetaTile(fullConfig);
    this.metaTiles.set(metaTile.id, metaTile);

    // Forward events
    metaTile.on('differentiation_complete', (data) => {
      this.typeDistribution.set(data.type, (this.typeDistribution.get(data.type) ?? 0) + 1);
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
      confidence: signal.confidence ?? 0.5,
    };

    this.globalSignals.push(fullSignal);

    if (this.globalSignals.length > 1000) {
      this.globalSignals.shift();
    }

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
  getDifferentiatedByType(type: AgentType): MetaTile[] {
    return Array.from(this.metaTiles.values())
      .filter(m =>
        m.state === MetaTileState.DIFFERENTIATED &&
        m.currentAgent?.config.typeId === type
      );
  }

  /**
   * Compute Shannon diversity index of type distribution
   */
  computeDiversity(): number {
    const total = Array.from(this.typeDistribution.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;

    const probs = Array.from(this.typeDistribution.values()).map(n => n / total);
    return computeEntropy(probs);
  }

  /**
   * Get statistics with diversity metrics
   */
  getStats(): {
    total: number;
    undifferentiated: number;
    differentiated: { task: number; role: number; core: number };
    diversity: number;
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
      diversity: this.computeDiversity(),
      recentSignals: this.globalSignals.length,
    };
  }
}
