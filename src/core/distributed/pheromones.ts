/**
 * POLLN Distributed Pheromone Fields
 * Distributed pheromone system for stigmergic coordination
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type {
  PheromoneField,
  PheromoneGradient,
  PheromoneQuery,
  PheromoneUpdate,
  DistributedConfig,
} from './types.js';
import { DistributedBackend, createBackend } from './backend.js';

// ============================================================================
// DISTRIBUTED PHEROMONE STORAGE
// ============================================================================

export class DistributedPheromones extends EventEmitter {
  private backend: DistributedBackend;
  private config: DistributedConfig;
  private localFields: Map<string, PheromoneField> = new Map();
  private subscriptionId: string | null = null;
  private evaporationTimer: ReturnType<typeof setInterval> | null = null;
  private readonly DEFAULT_TTL_MS = 300000; // 5 minutes
  private readonly EVAPORATION_INTERVAL_MS = 30000; // 30 seconds

  constructor(config: DistributedConfig) {
    super();
    this.config = config;
    this.backend = createBackend(config);
  }

  async start(): Promise<void> {
    await this.backend.connect();

    // Subscribe to pheromone update channel
    this.subscriptionId = await this.backend.subscribe(
      'polln.pheromones',
      async (msg) => {
        await this.handlePheromoneUpdate(msg);
      }
    );

    // Start evaporation cycle
    this.startEvaporation();
  }

  async stop(): Promise<void> {
    if (this.evaporationTimer) {
      clearInterval(this.evaporationTimer);
      this.evaporationTimer = null;
    }

    if (this.subscriptionId) {
      await this.backend.unsubscribe(this.subscriptionId);
    }

    await this.backend.disconnect();
  }

  /**
   * Deposit a pheromone field at specified coordinates
   */
  async deposit(
    coordinates: number[],
    intensity: number,
    type: string,
    ttlMs: number = this.DEFAULT_TTL_MS
  ): Promise<PheromoneField> {
    const field: PheromoneField = {
      id: uuidv4(),
      coordinates,
      intensity: Math.max(0, Math.min(1, intensity)),
      type,
      nodeId: this.config.nodeId,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    // Store locally
    this.localFields.set(field.id, field);

    // Persist to backend
    const key = `pheromone:${field.id}`;
    await this.backend.set(key, field, ttlMs);

    // Broadcast to cluster
    const message = {
      id: uuidv4(),
      sourceNodeId: this.config.nodeId,
      channel: 'polln.pheromones',
      payload: {
        type: 'deposit',
        field,
      },
      timestamp: Date.now(),
      requiresAck: false,
    };

    await this.backend.publish('polln.pheromones', message);

    this.emit('deposited', field);

    return field;
  }

  /**
   * Query for pheromone fields within a radius
   */
  async query(query: PheromoneQuery): Promise<PheromoneField[]> {
    // Get all field IDs from backend
    const keys = await this.backend.keys('pheromone:*');
    const fields: PheromoneField[] = [];

    for (const key of keys) {
      const field = await this.backend.get(key) as PheromoneField;
      if (!field) continue;
      if (field.expiresAt < Date.now()) continue;

      // Check type filter
      if (query.types && !query.types.includes(field.type)) {
        continue;
      }

      // Check intensity filter
      if (query.minIntensity && field.intensity < query.minIntensity) {
        continue;
      }

      // Check distance
      if (query.radius !== undefined) {
        const distance = this.calculateDistance(query.coordinates, field.coordinates);
        if (distance > query.radius) {
          continue;
        }
      }

      fields.push(field);
    }

    // Sort by intensity (descending)
    fields.sort((a, b) => b.intensity - a.intensity);

    return fields;
  }

  /**
   * Calculate gradient at a point for a specific pheromone type
   */
  async calculateGradient(
    coordinates: number[],
    type: string,
    radius: number = 1.0
  ): Promise<PheromoneGradient[]> {
    const fields = await this.query({
      coordinates,
      radius,
      types: [type],
      minIntensity: 0.01,
    });

    const gradients: PheromoneGradient[] = [];

    for (const field of fields) {
      const direction = this.calculateDirection(coordinates, field.coordinates);
      const magnitude = field.intensity / this.calculateDistance(coordinates, field.coordinates);

      gradients.push({
        fieldId: field.id,
        direction,
        magnitude,
        type: field.type,
      });
    }

    // Sort by magnitude (descending)
    gradients.sort((a, b) => b.magnitude - a.magnitude);

    return gradients;
  }

  /**
   * Reinforce a pheromone field (increase intensity)
   */
  async reinforce(fieldId: string, deltaIntensity: number = 0.1): Promise<void> {
    const field = await this.backend.get(`pheromone:${fieldId}`) as PheromoneField;
    if (!field) return;

    const newIntensity = Math.min(1, field.intensity + deltaIntensity);
    const ttl = field.expiresAt - Date.now();

    await this.deposit(
      field.coordinates,
      newIntensity,
      field.type,
      ttl
    );
  }

  /**
   * Get the strongest pheromone field at a location
   */
  async getStrongest(
    coordinates: number[],
    type: string,
    radius: number = 1.0
  ): Promise<PheromoneField | null> {
    const fields = await this.query({
      coordinates,
      radius,
      types: [type],
    });

    return fields.length > 0 ? fields[0] : null;
  }

  /**
   * Evaporate all pheromone fields (reduce intensity over time)
   */
  async evaporate(rate: number = 0.1): Promise<void> {
    const keys = await this.backend.keys('pheromone:*');
    const now = Date.now();

    for (const key of keys) {
      const field = await this.backend.get(key) as PheromoneField;
      if (!field) continue;

      // Skip if already expired
      if (field.expiresAt < now) {
        await this.backend.delete(key);
        this.localFields.delete(field.id);
        continue;
      }

      // Reduce intensity
      const newIntensity = Math.max(0, field.intensity * (1 - rate));

      if (newIntensity < 0.01) {
        // Too weak, remove it
        await this.backend.delete(key);
        this.localFields.delete(field.id);
        this.emit('evaporated', field);
      } else {
        // Update intensity
        const updated: PheromoneField = {
          ...field,
          intensity: newIntensity,
        };

        const ttl = field.expiresAt - now;
        await this.backend.set(key, updated, ttl);
        this.localFields.set(field.id, updated);
      }
    }
  }

  /**
   * Clear all pheromone fields
   */
  async clear(): Promise<void> {
    const keys = await this.backend.keys('pheromone:*');
    for (const key of keys) {
      await this.backend.delete(key);
    }
    this.localFields.clear();
    this.emit('cleared');
  }

  /**
   * Get statistics about pheromone fields
   */
  async getStats(): Promise<{
    totalCount: number;
    byType: Record<string, number>;
    averageIntensity: number;
    totalIntensity: number;
  }> {
    const keys = await this.backend.keys('pheromone:*');
    const byType: Record<string, number> = {};
    let totalIntensity = 0;

    for (const key of keys) {
      const field = await this.backend.get(key) as PheromoneField;
      if (!field || field.expiresAt < Date.now()) continue;

      byType[field.type] = (byType[field.type] || 0) + 1;
      totalIntensity += field.intensity;
    }

    const count = Object.values(byType).reduce((sum, count) => sum + count, 0);

    return {
      totalCount: count,
      byType,
      averageIntensity: count > 0 ? totalIntensity / count : 0,
      totalIntensity,
    };
  }

  private async handlePheromoneUpdate(msg: any): Promise<void> {
    const payload = msg.payload as { type: string; field: PheromoneField };

    if (msg.sourceNodeId === this.config.nodeId) {
      return; // Ignore our own messages
    }

    if (payload.type === 'deposit') {
      const field = payload.field;
      const key = `pheromone:${field.id}`;
      const ttl = field.expiresAt - Date.now();

      await this.backend.set(key, field, ttl);
      this.localFields.set(field.id, field);
      this.emit('deposited', field);
    }
  }

  private startEvaporation(): void {
    this.evaporationTimer = setInterval(async () => {
      await this.evaporate();
    }, this.EVAPORATION_INTERVAL_MS);
  }

  private calculateDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return Infinity;
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  private calculateDirection(from: number[], to: number[]): number[] {
    const distance = this.calculateDistance(from, to);
    if (distance === 0 || distance === Infinity) {
      return new Array(from.length).fill(0);
    }

    return to.map((coord, i) => (coord - from[i]) / distance);
  }
}

// ============================================================================
// GRADIENT-BASED TASK ALLOCATION
// ============================================================================

export class GradientTaskAllocator {
  private pheromones: DistributedPheromones;

  constructor(pheromones: DistributedPheromones) {
    this.pheromones = pheromones;
  }

  /**
   * Allocate a task based on pheromone gradients
   * Returns the direction of strongest gradient for the task type
   */
  async allocateTask(
    currentLocation: number[],
    taskType: string,
    searchRadius: number = 2.0
  ): Promise<{
    allocated: boolean;
    targetLocation: number[] | null;
    confidence: number;
    gradient: PheromoneGradient | null;
  }> {
    const gradients = await this.pheromones.calculateGradient(
      currentLocation,
      taskType,
      searchRadius
    );

    if (gradients.length === 0) {
      return {
        allocated: false,
        targetLocation: null,
        confidence: 0,
        gradient: null,
      };
    }

    const strongest = gradients[0];

    // Calculate target location
    const targetLocation = currentLocation.map((coord, i) =>
      coord + strongest.direction[i] * strongest.magnitude
    );

    return {
      allocated: true,
      targetLocation,
      confidence: Math.min(1, strongest.magnitude),
      gradient: strongest,
    };
  }

  /**
   * Mark a task location with pheromones
   */
  async markTaskLocation(
    location: number[],
    taskType: string,
    intensity: number = 0.5,
    ttlMs: number = 300000
  ): Promise<PheromoneField> {
    return await this.pheromones.deposit(location, intensity, taskType, ttlMs);
  }

  /**
   * Reinforce a task location after successful completion
   */
  async reinforceTaskLocation(fieldId: string): Promise<void> {
    await this.pheromones.reinforce(fieldId, 0.2);
  }
}
