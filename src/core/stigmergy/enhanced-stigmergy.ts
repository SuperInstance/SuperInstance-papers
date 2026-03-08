/**
 * POLLN Enhanced Stigmergy
 *
 * Extends the base stigmergy system with:
 * - Signal decay modeling
 * - Pheromone trail visualization
 * - Multi-signal interference handling
 * - Adaptive signal strength
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  PheromoneType,
  Pheromone,
  Position,
  StigmergyConfig,
} from '../../coordination/stigmergy';

// ============================================================================
// ENHANCED TYPES
// ============================================================================

export interface DecayModel {
  type: 'exponential' | 'linear' | 'logistic' | 'custom';
  parameters: DecayParameters;
}

export interface DecayParameters {
  rate?: number;           // For exponential
  halfLife?: number;       // For exponential
  slope?: number;          // For linear
  midpoint?: number;       // For logistic
  steepness?: number;      // For logistic
  customFn?: (t: number) => number; // For custom
}

export interface TrailVisualization {
  trailId: string;
  pheromoneIds: string[];
  path: Position[];
  strengthProfile: number[];
  createdAt: number;
  lastUpdate: number;
}

export interface InterferencePattern {
  position: Position;
  types: PheromoneType[];
  interference: number;     // -1 (destructive) to 1 (constructive)
  netEffect: number;
}

export interface AdaptiveStrengthConfig {
  baseStrength: number;
  minStrength: number;
  maxStrength: number;
  reinforcementMultiplier: number;
  decayMultiplier: number;
  crowdingThreshold: number;
}

// ============================================================================
// ENHANCED STIGMERGY
// ============================================================================

export class EnhancedStigmergy extends EventEmitter {
  private config: StigmergyConfig;
  private pheromones: Map<string, Pheromone> = new Map();
  private trails: Map<string, TrailVisualization> = new Map();
  private decayModels: Map<PheromoneType, DecayModel> = new Map();
  private adaptiveConfig: AdaptiveStrengthConfig;
  private evaporationTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<StigmergyConfig> = {}) {
    super();
    this.config = {
      maxPheromones: 1000,
      defaultHalfLife: 60000,
      evaporationInterval: 5000,
      detectionRadius: 0.5,
      reinforcementRate: 0.1,
      ...config,
    };

    this.adaptiveConfig = {
      baseStrength: 1.0,
      minStrength: 0.1,
      maxStrength: 2.0,
      reinforcementMultiplier: 1.1,
      decayMultiplier: 0.95,
      crowdingThreshold: 10,
    };

    // Set default decay models
    this.setDefaultDecayModels();
    this.startEvaporation();
  }

  // ========================================================================
  // DECAY MODELING
  // ========================================================================

  /**
   * Set decay model for a pheromone type
   */
  setDecayModel(type: PheromoneType, model: DecayModel): void {
    this.decayModels.set(type, model);
  }

  /**
   * Get decay model for a pheromone type
   */
  getDecayModel(type: PheromoneType): DecayModel {
    return this.decayModels.get(type) || this.getDefaultDecayModel();
  }

  /**
   * Calculate decayed strength
   */
  calculateDecay(pheromone: Pheromone, elapsed: number): number {
    const model = this.getDecayModel(pheromone.type);
    const initialStrength = 1.0; // Assume deposited at full strength

    switch (model.type) {
      case 'exponential':
        if (model.parameters.halfLife) {
          return initialStrength * Math.pow(0.5, elapsed / model.parameters.halfLife);
        }
        if (model.parameters.rate) {
          return initialStrength * Math.exp(-model.parameters.rate * elapsed);
        }
        return initialStrength * Math.exp(-elapsed / this.config.defaultHalfLife);

      case 'linear':
        const slope = model.parameters.slope || (1 / this.config.defaultHalfLife);
        return Math.max(0, initialStrength - slope * elapsed);

      case 'logistic':
        const midpoint = model.parameters.midpoint || (this.config.defaultHalfLife / 2);
        const steepness = model.parameters.steepness || 0.1;
        return initialStrength / (1 + Math.exp(steepness * (elapsed - midpoint)));

      case 'custom':
        if (model.parameters.customFn) {
          return model.parameters.customFn(elapsed);
        }
        return initialStrength * Math.exp(-elapsed / this.config.defaultHalfLife);

      default:
        return initialStrength * Math.exp(-elapsed / this.config.defaultHalfLife);
    }
  }

  /**
   * Predict future strength
   */
  predictStrength(pheromone: Pheromone, futureTime: number): number {
    const elapsed = (Date.now() - pheromone.createdAt) + futureTime;
    return this.calculateDecay(pheromone, elapsed);
  }

  // ========================================================================
  // TRAIL VISUALIZATION
  // ========================================================================

  /**
   * Start a new trail
   */
  startTrail(initialPosition: Position): string {
    const trailId = uuidv4();
    const trail: TrailVisualization = {
      trailId,
      pheromoneIds: [],
      path: [initialPosition],
      strengthProfile: [],
      createdAt: Date.now(),
      lastUpdate: Date.now(),
    };

    this.trails.set(trailId, trail);
    return trailId;
  }

  /**
   * Add to trail
   */
  addToTrail(
    trailId: string,
    pheromoneId: string,
    position: Position,
    strength: number
  ): void {
    const trail = this.trails.get(trailId);
    if (!trail) return;

    trail.pheromoneIds.push(pheromoneId);
    trail.path.push(position);
    trail.strengthProfile.push(strength);
    trail.lastUpdate = Date.now();
  }

  /**
   * Get trail visualization
   */
  getTrailVisualization(trailId: string): TrailVisualization | null {
    return this.trails.get(trailId) || null;
  }

  /**
   * Get all trail visualizations
   */
  getAllTrails(): TrailVisualization[] {
    return Array.from(this.trails.values());
  }

  /**
   * Visualize trail as simplified data for UI
   */
  visualizeTrail(trailId: string): {
    id: string;
    points: Array<{ x: number; y: number; strength: number }>;
    age: number;
    totalLength: number;
    avgStrength: number;
  } | null {
    const trail = this.trails.get(trailId);
    if (!trail) return null;

    const points = trail.path.map((pos, i) => {
      const coords = pos.coordinates || [0, 0];
      return {
        x: coords[0] || 0,
        y: coords[1] || 0,
        strength: trail.strengthProfile[i] || 0,
      };
    });

    const age = Date.now() - trail.createdAt;
    const totalLength = this.calculateTrailLength(trail);
    const avgStrength = trail.strengthProfile.reduce((a, b) => a + b, 0) / trail.strengthProfile.length;

    return {
      id: trailId,
      points,
      age,
      totalLength,
      avgStrength,
    };
  }

  /**
   * Calculate trail length
   */
  private calculateTrailLength(trail: TrailVisualization): number {
    let length = 0;
    for (let i = 1; i < trail.path.length; i++) {
      const prev = trail.path[i - 1].coordinates || [0, 0];
      const curr = trail.path[i].coordinates || [0, 0];
      const dx = curr[0] - prev[0];
      const dy = curr[1] - prev[1];
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  // ========================================================================
  // INTERFERENCE HANDLING
  // ========================================================================

  /**
   * Detect interference at a position
   */
  detectInterference(position: Position): InterferencePattern[] {
    const patterns: InterferencePattern[] = [];
    const nearby = this.findNearbyPheromones(position, this.config.detectionRadius);

    // Group by type
    const byType = new Map<PheromoneType, Pheromone[]>();
    for (const pheromone of nearby) {
      if (!byType.has(pheromone.type)) {
        byType.set(pheromone.type, []);
      }
      byType.get(pheromone.type)!.push(pheromone);
    }

    // Calculate interference between types
    const types = Array.from(byType.keys());
    for (let i = 0; i < types.length; i++) {
      for (let j = i + 1; j < types.length; j++) {
        const type1 = types[i];
        const type2 = types[j];
        const pheromones1 = byType.get(type1) || [];
        const pheromones2 = byType.get(type2) || [];

        // Calculate average strengths
        const avg1 = pheromones1.reduce((sum, p) => sum + p.strength, 0) / pheromones1.length;
        const avg2 = pheromones2.reduce((sum, p) => sum + p.strength, 0) / pheromones2.length;

        // Determine interference type
        const interference = this.calculateInterferenceType(type1, type2);

        // Calculate net effect
        const netEffect = (avg1 + avg2) * interference;

        patterns.push({
          position,
          types: [type1, type2],
          interference,
          netEffect,
        });
      }
    }

    return patterns;
  }

  /**
   * Calculate interference type between two pheromone types
   */
  private calculateInterferenceType(type1: PheromoneType, type2: PheromoneType): number {
    // Define interference patterns
    const constructivePairs: Set<string> = new Set([
      `${PheromoneType.PATHWAY}-${PheromoneType.RECRUIT}`,
      `${PheromoneType.RESOURCE}-${PheromoneType.RECRUIT}`,
    ]);

    const destructivePairs: Set<string> = new Set([
      `${PheromoneType.DANGER}-${PheromoneType.PATHWAY}`,
      `${PheromoneType.DANGER}-${PheromoneType.RECRUIT}`,
    ]);

    const key1 = `${type1}-${type2}`;
    const key2 = `${type2}-${type1}`;

    if (constructivePairs.has(key1) || constructivePairs.has(key2)) {
      return 1.2; // Constructive
    }

    if (destructivePairs.has(key1) || destructivePairs.has(key2)) {
      return -0.5; // Destructive
    }

    return 1.0; // Neutral
  }

  /**
   * Apply interference to signal strength
   */
  applyInterference(pheromone: Pheromone, position: Position): number {
    const patterns = this.detectInterference(position);
    let modifier = 1.0;

    for (const pattern of patterns) {
      if (pattern.types.includes(pheromone.type)) {
        modifier *= (1 + pattern.interference * 0.1);
      }
    }

    return pheromone.strength * modifier;
  }

  // ========================================================================
  // ADAPTIVE STRENGTH
  // ========================================================================

  /**
   * Calculate adaptive strength based on conditions
   */
  calculateAdaptiveStrength(
    type: PheromoneType,
    position: Position,
    baseStrength: number = this.adaptiveConfig.baseStrength
  ): number {
    // Check for crowding
    const nearby = this.findNearbyPheromones(position, this.config.detectionRadius);
    const crowdingFactor = this.calculateCrowdingFactor(nearby);

    // Check for interference
    const interference = this.detectInterference(position);
    let interferenceModifier = 1.0;
    for (const pattern of interference) {
      if (pattern.types.includes(type)) {
        interferenceModifier *= (1 + pattern.netEffect * 0.1);
      }
    }

    // Calculate final strength
    let strength = baseStrength * crowdingFactor * interferenceModifier;

    // Clamp to bounds
    strength = Math.max(this.adaptiveConfig.minStrength, strength);
    strength = Math.min(this.adaptiveConfig.maxStrength, strength);

    return strength;
  }

  /**
   * Calculate crowding factor
   */
  private calculateCrowdingFactor(nearby: Pheromone[]): number {
    if (nearby.length < this.adaptiveConfig.crowdingThreshold) {
      return 1.0;
    }

    // Reduce strength in crowded areas
    const excess = nearby.length - this.adaptiveConfig.crowdingThreshold;
    return 1.0 / (1.0 + excess * 0.1);
  }

  /**
   * Reinforce signal with adaptive multiplier
   */
  reinforceAdaptive(pheromoneId: string): void {
    const pheromone = this.pheromones.get(pheromoneId);
    if (!pheromone) return;

    const nearby = this.findNearbyPheromones(pheromone.position, this.config.detectionRadius);
    const crowdingFactor = this.calculateCrowdingFactor(nearby);

    const reinforcement = this.config.reinforcementRate * this.adaptiveConfig.reinforcementMultiplier * crowdingFactor;
    pheromone.strength = Math.min(1, pheromone.strength + reinforcement);
  }

  // ========================================================================
  // DEPOSIT AND DETECT
  // ========================================================================

  /**
   * Deposit pheromone with adaptive strength
   */
  deposit(
    sourceId: string,
    type: PheromoneType,
    position: Position,
    strength: number = 1.0,
    metadata: Map<string, unknown> = new Map()
  ): Pheromone {
    // Calculate adaptive strength
    const adaptiveStrength = this.calculateAdaptiveStrength(type, position, strength);

    const pheromone: Pheromone = {
      id: uuidv4(),
      type,
      sourceId,
      strength: adaptiveStrength,
      position,
      metadata,
      createdAt: Date.now(),
      halfLife: this.config.defaultHalfLife,
    };

    this.pheromones.set(pheromone.id, pheromone);

    this.emit('deposit', {
      id: pheromone.id,
      type,
      sourceId,
      position,
      strength: adaptiveStrength,
    });

    return pheromone;
  }

  /**
   * Detect pheromones with interference applied
   */
  detect(
    position: Position,
    types?: PheromoneType[]
  ): {
    nearby: Pheromone[];
    strongest: Pheromone | null;
    interference: InterferencePattern[];
  } {
    const nearby: Pheromone[] = [];
    const interference = this.detectInterference(position);

    for (const pheromone of this.pheromones.values()) {
      const distance = this.distance(position, pheromone.position);
      if (distance <= this.config.detectionRadius) {
        if (!types || types.includes(pheromone.type)) {
          // Apply interference
          const adjustedStrength = this.applyInterference(pheromone, position);
          nearby.push({
            ...pheromone,
            strength: adjustedStrength,
          });
        }
      }
    }

    nearby.sort((a, b) => b.strength - a.strength);

    return {
      nearby,
      strongest: nearby[0] || null,
      interference,
    };
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  private findNearbyPheromones(position: Position, radius: number): Pheromone[] {
    const nearby: Pheromone[] = [];
    for (const pheromone of this.pheromones.values()) {
      const distance = this.distance(position, pheromone.position);
      if (distance <= radius) {
        nearby.push(pheromone);
      }
    }
    return nearby;
  }

  private distance(a: Position, b: Position): number {
    if (a.coordinates && b.coordinates) {
      const dx = (a.coordinates[0] || 0) - (b.coordinates[0] || 0);
      const dy = (a.coordinates[1] || 0) - (b.coordinates[1] || 0);
      return Math.sqrt(dx * dx + dy * dy);
    }
    if (a.topic && b.topic && a.topic === b.topic) {
      return 0;
    }
    return 1;
  }

  private setDefaultDecayModels(): void {
    const exponentialModel: DecayModel = {
      type: 'exponential',
      parameters: { halfLife: this.config.defaultHalfLife },
    };

    for (const type of Object.values(PheromoneType)) {
      this.decayModels.set(type, exponentialModel);
    }
  }

  private getDefaultDecayModel(): DecayModel {
    return {
      type: 'exponential',
      parameters: { halfLife: this.config.defaultHalfLife },
    };
  }

  private startEvaporation(): void {
    this.evaporationTimer = setInterval(() => {
      this.evaporate();
    }, this.config.evaporationInterval);
  }

  private evaporate(): void {
    const now = Date.now();
    const toEvaporate: string[] = [];

    for (const [id, pheromone] of this.pheromones) {
      const elapsed = now - pheromone.createdAt;
      const decayedStrength = this.calculateDecay(pheromone, elapsed);
      pheromone.strength = decayedStrength;

      if (pheromone.strength < 0.01) {
        toEvaporate.push(id);
      }
    }

    for (const id of toEvaporate) {
      this.pheromones.delete(id);
    }

    this.emit('evaporated', { count: toEvaporate.length });
  }

  /**
   * Get statistics
   */
  getStats(): {
    pheromoneCount: number;
    trailCount: number;
    byType: Record<PheromoneType, number>;
  } {
    const byType: Record<PheromoneType, number> = {
      [PheromoneType.PATHWAY]: 0,
      [PheromoneType.RESOURCE]: 0,
      [PheromoneType.DANGER]: 0,
      [PheromoneType.NEST]: 0,
      [PheromoneType.RECRUIT]: 0,
    };

    for (const pheromone of this.pheromones.values()) {
      byType[pheromone.type]++;
    }

    return {
      pheromoneCount: this.pheromones.size,
      trailCount: this.trails.size,
      byType,
    };
  }

  /**
   * Reset
   */
  reset(): void {
    this.pheromones.clear();
    this.trails.clear();
    this.emit('reset');
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    if (this.evaporationTimer) {
      clearInterval(this.evaporationTimer);
    }
  }
}
