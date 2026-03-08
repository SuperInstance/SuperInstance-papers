/**
 * POLLN Reservoir
 *
 * Stores patterns (embeddings, KV-anchors) for later use
 * Implements cache pool with eviction policies
 *
 * Based on KV-anchor research:
 * - LRU: Least Recently Used
 * - LFU: Least Frequently Used
 * - Quality: Keep highest quality patterns
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Reservoir,
  StoredPattern,
  HydraulicConfig,
  HydraulicEvent,
  HydraulicEventType,
} from './types';

export class ReservoirManager {
  private config: HydraulicConfig;
  private reservoirs: Map<string, Reservoir> = new Map();

  constructor(config: Partial<HydraulicConfig> = {}) {
    this.config = {
      reservoirCapacity: 1000,
      reservoirEvictionPolicy: 'lru',
      reservoirQualityThreshold: 0.5,
      ...config,
      alertThresholds: {
        highPressure: 0.8,
        lowFlow: 0.1,
        highResistance: 0.7,
        lowReservoir: 0.2,
        ...config.alertThresholds,
      },
    };
  }

  /**
   * Create a new reservoir
   */
  createReservoir(id: string, capacity: number = this.config.reservoirCapacity): Reservoir {
    const reservoir: Reservoir = {
      id,
      capacity,
      currentLevel: 0,
      patterns: [],
      quality: 0,
      lastAccess: Date.now(),
    };

    this.reservoirs.set(id, reservoir);
    return reservoir;
  }

  /**
   * Get a reservoir
   */
  getReservoir(id: string): Reservoir | undefined {
    return this.reservoirs.get(id);
  }

  /**
   * Get all reservoirs
   */
  getAllReservoirs(): Map<string, Reservoir> {
    return new Map(this.reservoirs);
  }

  /**
   * Store a pattern in a reservoir
   */
  storePattern(
    reservoirId: string,
    embedding: number[],
    anchor: string,
    quality: number,
    metadata: Map<string, unknown> = new Map()
  ): StoredPattern | null {
    const reservoir = this.reservoirs.get(reservoirId);
    if (!reservoir) {
      throw new Error(`Reservoir ${reservoirId} not found`);
    }

    // Check if at capacity
    if (reservoir.currentLevel >= reservoir.capacity) {
      // Evict based on policy
      this.evictPattern(reservoirId);
    }

    // Create pattern
    const pattern: StoredPattern = {
      id: uuidv4(),
      embedding,
      anchor,
      quality: Math.max(0, Math.min(1, quality)),
      accessCount: 0,
      lastAccess: Date.now(),
      createdAt: Date.now(),
      metadata,
    };

    // Add to reservoir
    reservoir.patterns.push(pattern);
    reservoir.currentLevel++;

    // Update quality
    this.updateQuality(reservoir);

    // Check if full
    if (reservoir.currentLevel >= reservoir.capacity) {
      const event: HydraulicEvent = {
        type: HydraulicEventType.RESERVOIR_FULL,
        timestamp: Date.now(),
        severity: 'info',
        componentId: reservoirId,
        description: `Reservoir ${reservoirId} is at capacity`,
        data: {
          capacity: reservoir.capacity,
          patternCount: reservoir.currentLevel,
        },
      };
      // Note: In real implementation, you'd emit this via an event emitter
    }

    return pattern;
  }

  /**
   * Retrieve a pattern from a reservoir
   */
  retrievePattern(reservoirId: string, patternId: string): StoredPattern | null {
    const reservoir = this.reservoirs.get(reservoirId);
    if (!reservoir) return null;

    const pattern = reservoir.patterns.find(p => p.id === patternId);
    if (!pattern) return null;

    // Update access info
    pattern.accessCount++;
    pattern.lastAccess = Date.now();
    reservoir.lastAccess = Date.now();

    return pattern;
  }

  /**
   * Find similar patterns in a reservoir
   */
  findSimilarPatterns(
    reservoirId: string,
    embedding: number[],
    threshold: number = 0.8,
    limit: number = 10
  ): StoredPattern[] {
    const reservoir = this.reservoirs.get(reservoirId);
    if (!reservoir) return [];

    const similarities = reservoir.patterns.map(pattern => ({
      pattern,
      similarity: this.cosineSimilarity(embedding, pattern.embedding),
    }));

    // Filter by threshold and sort by similarity
    return similarities
      .filter(s => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(s => {
        // Update access count
        s.pattern.accessCount++;
        s.pattern.lastAccess = Date.now();
        return s.pattern;
      });
  }

  /**
   * Evict a pattern based on policy
   */
  private evictPattern(reservoirId: string): void {
    const reservoir = this.reservoirs.get(reservoirId);
    if (!reservoir || reservoir.patterns.length === 0) return;

    let evictIndex = -1;

    switch (this.config.reservoirEvictionPolicy) {
      case 'lru':
        // Least Recently Used
        let minAccess = Infinity;
        for (let i = 0; i < reservoir.patterns.length; i++) {
          if (reservoir.patterns[i].lastAccess < minAccess) {
            minAccess = reservoir.patterns[i].lastAccess;
            evictIndex = i;
          }
        }
        break;

      case 'lfu':
        // Least Frequently Used
        let minCount = Infinity;
        for (let i = 0; i < reservoir.patterns.length; i++) {
          if (reservoir.patterns[i].accessCount < minCount) {
            minCount = reservoir.patterns[i].accessCount;
            evictIndex = i;
          }
        }
        break;

      case 'quality':
        // Lowest quality
        let minQuality = Infinity;
        for (let i = 0; i < reservoir.patterns.length; i++) {
          if (reservoir.patterns[i].quality < minQuality) {
            minQuality = reservoir.patterns[i].quality;
            evictIndex = i;
          }
        }
        break;
    }

    if (evictIndex >= 0) {
      reservoir.patterns.splice(evictIndex, 1);
      reservoir.currentLevel--;
      this.updateQuality(reservoir);
    }
  }

  /**
   * Update average quality of a reservoir
   */
  private updateQuality(reservoir: Reservoir): void {
    if (reservoir.patterns.length === 0) {
      reservoir.quality = 0;
      return;
    }

    const totalQuality = reservoir.patterns.reduce(
      (sum, p) => sum + p.quality,
      0
    );
    reservoir.quality = totalQuality / reservoir.patterns.length;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }

  /**
   * Get reservoir statistics
   */
  getStats(reservoirId: string): {
    capacity: number;
    currentLevel: number;
    utilization: number;
    quality: number;
    avgAccessCount: number;
  } | null {
    const reservoir = this.reservoirs.get(reservoirId);
    if (!reservoir) return null;

    const avgAccessCount = reservoir.patterns.length > 0
      ? reservoir.patterns.reduce((sum, p) => sum + p.accessCount, 0) / reservoir.patterns.length
      : 0;

    return {
      capacity: reservoir.capacity,
      currentLevel: reservoir.currentLevel,
      utilization: reservoir.currentLevel / reservoir.capacity,
      quality: reservoir.quality,
      avgAccessCount,
    };
  }

  /**
   * Get low-quality patterns
   */
  getLowQualityPatterns(reservoirId: string, threshold: number): StoredPattern[] {
    const reservoir = this.reservoirs.get(reservoirId);
    if (!reservoir) return [];

    return reservoir.patterns.filter(p => p.quality < threshold);
  }

  /**
   * Get unused patterns
   */
  getUnusedPatterns(reservoirId: string, maxAge: number): StoredPattern[] {
    const reservoir = this.reservoirs.get(reservoirId);
    if (!reservoir) return [];

    const now = Date.now();
    return reservoir.patterns.filter(p => (now - p.lastAccess) > maxAge);
  }

  /**
   * Clear a reservoir
   */
  clearReservoir(reservoirId: string): void {
    const reservoir = this.reservoirs.get(reservoirId);
    if (!reservoir) return;

    reservoir.patterns = [];
    reservoir.currentLevel = 0;
    reservoir.quality = 0;
    reservoir.lastAccess = Date.now();
  }

  /**
   * Delete a reservoir
   */
  deleteReservoir(reservoirId: string): void {
    this.reservoirs.delete(reservoirId);
  }

  /**
   * Get all reservoir IDs
   */
  getReservoirIds(): string[] {
    return Array.from(this.reservoirs.keys());
  }
}
