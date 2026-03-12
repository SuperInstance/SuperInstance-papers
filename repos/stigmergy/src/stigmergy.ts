/**
 * POLLN Stigmergic Coordination
 *
 * Indirect coordination through environmental modifications.
 * Like ants leaving pheromone trails, agents leave signals in shared space
 * that influence others' behavior.
 *
 * Based on FINAL_INTEGRATION.md: Stigmergic Pattern Distribution
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

// ============================================================================
// PHEROMONE TYPES
// ============================================================================

export enum PheromoneType {
  PATHWAY = 'PATHWAY',
  RESOURCE = 'RESOURCE',
  DANGER = 'DANGER',
  NEST = 'NEST',
  RECRUIT = 'RECRUIT',
}

export interface Pheromone {
  id: string;
  type: PheromoneType;
  sourceId: string;
  strength: number;
  position: Position;
  metadata: Map<string, unknown>;
  createdAt: number;
  halfLife: number;
}

export interface Position {
  topic?: string;
  taskType?: string;
  contextHash?: string;
  coordinates?: number[];
}

export interface StigmergyConfig {
  maxPheromones: number;
  defaultHalfLife: number;
  evaporationInterval: number;
  detectionRadius: number;
  reinforcementRate: number;
}

// ============================================================================
// STIGMERGY SYSTEM
// ============================================================================

export class Stigmergy extends EventEmitter {
  private config: StigmergyConfig;
  private pheromones: Map<string, Pheromone> = new Map();
  private grid: Map<string, string[]> = new Map();
  private evaporationTimer: ReturnType<typeof setInterval> | null = null;
  private stats = {
    totalDeposited: 0,
    totalEvaporated: 0,
    totalFollowed: 0,
    byType: {} as Record<PheromoneType, number>,
  };

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
    this.stats.byType = {
      [PheromoneType.PATHWAY]: 0,
      [PheromoneType.RESOURCE]: 0,
      [PheromoneType.DANGER]: 0,
      [PheromoneType.NEST]: 0,
      [PheromoneType.RECRUIT]: 0,
    };
    this.startEvaporation();
  }

  deposit(
    sourceId: string,
    type: PheromoneType,
    position: Position,
    strength: number = 1.0,
    metadata: Map<string, unknown> = new Map()
  ): Pheromone {
    const pheromone: Pheromone = {
      id: uuidv4(),
      type,
      sourceId,
      strength: Math.min(1, Math.max(0, strength)),
      position,
      metadata,
      createdAt: Date.now(),
      halfLife: this.config.defaultHalfLife,
    };

    if (this.pheromones.size >= this.config.maxPheromones) {
      this.evaporateOldest();
    }

    this.pheromones.set(pheromone.id, pheromone);
    this.addToGrid(pheromone);

    this.stats.totalDeposited++;
    this.stats.byType[type]++;

    this.emit('deposit', {
      id: pheromone.id,
      type,
      sourceId,
      position,
    });

    return pheromone;
  }

  follow(pheromoneId: string, followerId: string): void {
    const pheromone = this.pheromones.get(pheromoneId);
    if (!pheromone) return;

    pheromone.strength = Math.min(
      1,
      pheromone.strength + this.config.reinforcementRate
    );
    this.stats.totalFollowed++;
    this.emit('followed', { pheromoneId, followerId });
  }

  detect(
    position: Position,
    types?: PheromoneType[]
  ): {
    nearby: Pheromone[];
    strongest: Pheromone | null;
  } {
    const nearby: Pheromone[] = [];

    for (const pheromone of this.pheromones.values()) {
      const distance = this.distance(position, pheromone.position);
      if (distance <= this.config.detectionRadius) {
        if (!types || types.includes(pheromone.type)) {
          nearby.push(pheromone);
        }
      }
    }

    nearby.sort((a, b) => b.strength - a.strength);
    return {
      nearby,
      strongest: nearby[0] || null,
    };
  }

  evaporate(): void {
    const now = Date.now();
    const toEvaporate: string[] = [];

    for (const [id, pheromone] of this.pheromones) {
      const age = now - pheromone.createdAt;
      const decayFactor = Math.pow(0.5, age / pheromone.halfLife);
      pheromone.strength *= decayFactor;

      if (pheromone.strength < 0.01) {
        toEvaporate.push(id);
      }
    }

    for (const id of toEvaporate) {
      const pheromone = this.pheromones.get(id);
      if (pheromone) {
        this.stats.byType[pheromone.type]--;
      }
      this.pheromones.delete(id);
      this.stats.totalEvaporated++;
    }

    this.emit('evaporated', { count: toEvaporate.length });
  }

  reset(): void {
    this.pheromones.clear();
    this.grid.clear();
    this.stats = {
      totalDeposited: 0,
      totalEvaporated: 0,
      totalFollowed: 0,
      byType: {
        [PheromoneType.PATHWAY]: 0,
        [PheromoneType.RESOURCE]: 0,
        [PheromoneType.DANGER]: 0,
        [PheromoneType.NEST]: 0,
        [PheromoneType.RECRUIT]: 0,
      },
    };
    this.emit('reset');
  }

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  shutdown(): void {
    if (this.evaporationTimer) {
      clearInterval(this.evaporationTimer);
    }
  }

  private startEvaporation(): void {
    this.evaporationTimer = setInterval(() => {
      this.evaporate();
    }, this.config.evaporationInterval);
  }

  private evaporateOldest(): void {
    let oldest: Pheromone | null = null;
    for (const pheromone of this.pheromones.values()) {
      if (!oldest || pheromone.createdAt < oldest.createdAt) {
        oldest = pheromone;
      }
    }
    if (oldest) {
      this.pheromones.delete(oldest.id);
      this.stats.totalEvaporated++;
    }
  }

  private addToGrid(pheromone: Pheromone): void {
    const key = this.positionToKey(pheromone.position);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(pheromone.id);
  }

  private positionToKey(position: Position): string {
    if (position.coordinates) {
      return `${Math.floor(position.coordinates[0] * 10)},${Math.floor(position.coordinates[1] * 10)}`;
    }
    return position.topic || position.taskType || 'default';
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
}

// ============================================================================
// TRAIL FOLLOWER
// ============================================================================

export class TrailFollower {
  private stigmergy: Stigmergy;
  private agentId: string;
  private followedTrails: Set<string> = new Set();

  constructor(stigmergy: Stigmergy, agentId: string) {
    this.stigmergy = stigmergy;
    this.agentId = agentId;
  }

  followTrail(
    currentPosition: Position,
    targetType: PheromoneType
  ): { found: boolean; pheromone: Pheromone | null; direction?: Position } {
    const detected = this.stigmergy.detect(currentPosition, [targetType]);

    if (!detected.strongest) {
      return { found: false, pheromone: null };
    }

    this.stigmergy.follow(detected.strongest.id, this.agentId);
    this.followedTrails.add(detected.strongest.id);

    return {
      found: true,
      pheromone: detected.strongest,
      direction: detected.strongest.position,
    };
  }

  leaveSignal(
    type: PheromoneType,
    position: Position,
    strength: number = 1.0,
    metadata: Map<string, unknown> = new Map()
  ): Pheromone {
    return this.stigmergy.deposit(this.agentId, type, position, strength, metadata);
  }

  getFollowedCount(): number {
    return this.followedTrails.size;
  }
}
