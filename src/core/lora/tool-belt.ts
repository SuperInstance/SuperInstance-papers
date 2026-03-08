/**
 * LoRA Tool Belt Manager
 *
 * Manages loading, caching, and swapping of LoRA adapters for agents
 * Acts as a library of expertise that agents can draw from
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  LoRAAdapter,
  LoRAComposition,
  LoRAInComposition,
  LoRALibraryConfig,
  LoRAMemoryState,
  LoRAMemoryConfig,
  LoRASwapRequestPayload,
  LoRASwapResponsePayload,
  LoRAMergeStrategy,
  LoRANormalization,
} from './types.js';
import { BaseLoRAAdapter, computeInterference, mergeLoRAsLinear, mergeLoRAsSVD, optimizeWeights } from './lora-adapter.js';

/**
 * LRU Cache implementation for LoRA adapters
 */
class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists
    this.cache.delete(key);

    // Add to end
    this.cache.set(key, value);

    // Evict oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value as K;
      this.cache.delete(firstKey);
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  values(): IterableIterator<V> {
    return this.cache.values();
  }
}

/**
 * LoRA Library - Manages the collection of available LoRA adapters
 */
export class LoRALibrary {
  private config: LoRALibraryConfig;
  private loras: Map<string, LoRAAdapter> = new Map();
  private cache: LRUCache<string, LoRAAdapter>;
  private memoryStates: Map<string, LoRAMemoryState> = new Map();
  private interferenceMatrix: Map<string, Map<string, number>> = new Map();

  constructor(config: LoRALibraryConfig) {
    this.config = config;
    this.cache = new LRUCache(config.cacheSize);
  }

  /**
   * Initialize the library by loading LoRA metadata from disk
   */
  async initialize(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.loraDirectory);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = join(this.config.loraDirectory, file);
          const metadata = JSON.parse(await fs.readFile(filePath, 'utf-8'));

          // Load the LoRA adapter
          await this.loadLoRA(metadata.id);
        }
      }

      // Compute interference matrix for all loaded LoRAs
      this.computeInterferenceMatrix();
    } catch (error) {
      console.warn(`LoRA library initialization warning: ${error}`);
    }
  }

  /**
   * Load a LoRA adapter from disk
   */
  async loadLoRA(loraId: string): Promise<LoRAAdapter | null> {
    // Check if already loaded
    if (this.loras.has(loraId)) {
      return this.loras.get(loraId)!;
    }

    // Check cache
    const cached = this.cache.get(loraId);
    if (cached) {
      return cached;
    }

    try {
      const metadataPath = join(this.config.loraDirectory, loraId, 'metadata.json');
      const matricesPath = join(this.config.loraDirectory, loraId, 'matrices.safetensors');

      // Load metadata
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

      // Load matrices (simplified - in production use safetensors library)
      const matricesData = JSON.parse(await fs.readFile(matricesPath.replace('.safetensors', '.json'), 'utf-8'));

      const adapter = new BaseLoRAAdapter({
        ...metadata,
        matrices: {
          A: new Float32Array(matricesData.A),
          B: new Float32Array(matricesData.B),
          rank: metadata.rank,
          dimension: matricesData.dimension,
        },
      });

      // Store in library and cache
      this.loras.set(loraId, adapter);
      this.cache.set(loraId, adapter);

      // Initialize memory state
      this.memoryStates.set(loraId, {
        loraId,
        size: adapter.size,
        lastAccessed: Date.now(),
        accessCount: 0,
        isLoaded: false,
      });

      return adapter;
    } catch (error) {
      console.error(`Failed to load LoRA ${loraId}:`, error);
      return null;
    }
  }

  /**
   * Get a LoRA adapter by ID
   */
  getLoRA(loraId: string): LoRAAdapter | undefined {
    const lora = this.loras.get(loraId);
    if (lora) {
      // Update memory state
      const state = this.memoryStates.get(loraId);
      if (state) {
        state.lastAccessed = Date.now();
        state.accessCount++;
      }
    }
    return lora;
  }

  /**
   * Find compatible LoRAs for a given task
   */
  findLoRAs(task: string, maxCount: number = 3): LoRAAdapter[] {
    // Task embedding (simplified - in production use proper embeddings)
    const taskLower = task.toLowerCase();

    const candidates = Array.from(this.loras.values())
      .map(lora => {
        // Compute relevance score based on expertise overlap
        const relevance = lora.expertise.filter(exp =>
          taskLower.includes(exp.toLowerCase()) || exp.toLowerCase().includes(taskLower.split(' ')[0])
        ).length / Math.max(lora.expertise.length, 1);

        return {
          lora,
          score: relevance + (0.5 * lora.avgPerformance), // Combine relevance and performance
        };
      })
      .filter(({ score }) => score > 0.2) // Minimum threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCount)
      .map(({ lora }) => lora);

    return candidates;
  }

  /**
   * Create a new LoRA composition
   */
  createComposition(agentId: string, loras: LoRAInComposition[]): LoRAComposition {
    return {
      id: uuidv4(),
      agentId,
      loras,
      strategy: this.config.defaultStrategy,
      normalization: this.config.defaultNormalization,
      performance: undefined,
      lastEvaluated: undefined,
    };
  }

  /**
   * Merge LoRAs in a composition
   */
  mergeLoRAs(composition: LoRAComposition): Float32Array {
    const lorasWithWeights = composition.loras
      .map(({ loraId, weight }) => {
        const lora = this.loras.get(loraId);
        return lora ? { adapter: lora, weight } : null;
      })
      .filter((l): l is { adapter: LoRAAdapter; weight: number } => l !== null);

    if (lorasWithWeights.length === 0) {
      return new Float32Array(0);
    }

    // Get dimension from first LoRA
    const dimension = lorasWithWeights[0].adapter.matrices.dimension;

    switch (composition.strategy) {
      case 'linear':
        return mergeLoRAsLinear(lorasWithWeights, dimension);

      case 'svd':
        // Use rank of largest LoRA
        const maxRank = Math.max(...lorasWithWeights.map(l => l.adapter.rank));
        return mergeLoRAsSVD(lorasWithWeights, dimension, maxRank);

      case 'tied':
        // For tied, use linear merge (simplified)
        return mergeLoRAsLinear(lorasWithWeights, dimension);

      default:
        return mergeLoRAsLinear(lorasWithWeights, dimension);
    }
  }

  /**
   * Check for conflicts in a composition
   */
  checkConflicts(composition: LoRAComposition): string[] {
    const conflicts: string[] = [];
    const activeIds = new Set(composition.loras.map(l => l.loraId));

    for (const { loraId } of composition.loras) {
      const lora = this.loras.get(loraId);
      if (!lora) continue;

      for (const conflictId of lora.conflictsWith) {
        if (activeIds.has(conflictId)) {
          conflicts.push(`${loraId} conflicts with ${conflictId}`);
        }
      }
    }

    return conflicts;
  }

  /**
   * Predict performance of a composition
   */
  predictPerformance(composition: LoRAComposition): number {
    let score = 0;
    let totalWeight = 0;

    for (const { loraId, weight } of composition.loras) {
      const lora = this.loras.get(loraId);
      if (lora) {
        score += weight * lora.avgPerformance;
        totalWeight += weight;
      }
    }

    if (totalWeight > 0) {
      score /= totalWeight;
    }

    // Penalty for many LoRAs (interference)
    const loraCount = composition.loras.length;
    const interferencePenalty = 1 - (0.05 * (loraCount - 1));

    return score * Math.max(0.5, interferencePenalty);
  }

  /**
   * Compute interference matrix for all LoRAs
   */
  private computeInterferenceMatrix(): void {
    const loraIds = Array.from(this.loras.keys());

    for (const id1 of loraIds) {
      const row = new Map<string, number>();

      for (const id2 of loraIds) {
        if (id1 === id2) {
          row.set(id2, 0);
        } else {
          const lora1 = this.loras.get(id1);
          const lora2 = this.loras.get(id2);

          if (lora1 && lora2) {
            row.set(id2, computeInterference(lora1, lora2));
          }
        }
      }

      this.interferenceMatrix.set(id1, row);
    }
  }

  /**
   * Get interference between two LoRAs
   */
  getInterference(loraId1: string, loraId2: string): number {
    const row = this.interferenceMatrix.get(loraId1);
    return row?.get(loraId2) ?? 0;
  }

  /**
   * Optimize LoRA weights for a composition
   */
  optimizeCompositionWeights(composition: LoRAComposition, task: string): LoRAComposition {
    const loras = composition.loras
      .map(({ loraId }) => this.loras.get(loraId))
      .filter((l): l is LoRAAdapter => l !== undefined);

    // Build interference matrix
    const n = loras.length;
    const interferenceMatrix: number[][] = [];

    for (let i = 0; i < n; i++) {
      interferenceMatrix[i] = [];
      for (let j = 0; j < n; j++) {
        interferenceMatrix[i][j] = this.getInterference(loras[i].id, loras[j].id);
      }
    }

    // Optimize weights
    const optimizedWeights = optimizeWeights(loras, task, interferenceMatrix);

    // Update composition with new weights
    const optimized: LoRAComposition = {
      ...composition,
      loras: composition.loras.map((l, i) => ({
        ...l,
        weight: optimizedWeights[i] ?? l.weight,
      })),
    };

    return optimized;
  }

  /**
   * List all available LoRAs
   */
  listLoRAs(): LoRAAdapter[] {
    return Array.from(this.loras.values());
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    totalSize: number;
    cachedCount: number;
    loadedCount: number;
    loraStats: LoRAMemoryState[];
  } {
    const cachedCount = this.cache.size();
    const loadedCount = Array.from(this.memoryStates.values()).filter(s => s.isLoaded).length;
    const totalSize = Array.from(this.memoryStates.values()).reduce((sum, s) => sum + s.size, 0);

    return {
      totalSize,
      cachedCount,
      loadedCount,
      loraStats: Array.from(this.memoryStates.values()),
    };
  }

  /**
   * Shutdown the library and cleanup resources
   */
  async shutdown(): Promise<void> {
    this.cache.clear();
    this.loras.clear();
    this.memoryStates.clear();
    this.interferenceMatrix.clear();
  }
}

/**
 * LoRA Tool Belt - Manages active LoRAs for an agent
 */
export class LoRAToolBelt {
  private library: LoRALibrary;
  private agentId: string;
  private currentComposition: LoRAComposition | null = null;
  private swapHistory: LoRASwapRequestPayload[] = [];

  constructor(library: LoRALibrary, agentId: string) {
    this.library = library;
    this.agentId = agentId;
  }

  /**
   * Initialize with a set of LoRAs
   */
  async initialize(loraIds: string[]): Promise<void> {
    const loras: LoRAInComposition[] = loraIds.map((id, i) => ({
      loraId: id,
      weight: 1.0 / loraIds.length,
    }));

    this.currentComposition = this.library.createComposition(this.agentId, loras);
  }

  /**
   * Process a swap request
   */
  async processSwapRequest(request: LoRASwapRequestPayload): Promise<LoRASwapResponsePayload> {
    const startTime = Date.now();

    // Validate request
    const conflicts = this.library.checkConflicts(request.currentComposition);

    if (conflicts.length > 0) {
      return {
        success: false,
        reason: `Conflicts detected: ${conflicts.join(', ')}`,
      };
    }

    // Apply changes
    const newComposition = this.applyChanges(
      request.currentComposition,
      request.requestedChanges
    );

    // Check max LoRAs
    if (newComposition.loras.length > this.library['config'].maxLoRAsPerAgent) {
      return {
        success: false,
        reason: `Too many LoRAs: ${newComposition.loras.length} > ${this.library['config'].maxLoRAsPerAgent}`,
      };
    }

    // Update current composition
    this.currentComposition = newComposition;

    // Record swap
    this.swapHistory.push(request);

    const swapTime = Date.now() - startTime;

    return {
      success: true,
      newComposition,
      estimatedPerformance: this.library.predictPerformance(newComposition),
      swapTimeMs: swapTime,
    };
  }

  /**
   * Apply LoRA changes to a composition
   */
  private applyChanges(
    composition: LoRAComposition,
    changes: Array<{ loraId: string; action: 'add' | 'remove' | 'adjust'; weight?: number }>
  ): LoRAComposition {
    const newLoras = [...composition.loras];

    for (const change of changes) {
      switch (change.action) {
        case 'add':
          if (!newLoras.find(l => l.loraId === change.loraId)) {
            newLoras.push({
              loraId: change.loraId,
              weight: change.weight ?? 0.5,
            });
          }
          break;

        case 'remove':
          const removeIndex = newLoras.findIndex(l => l.loraId === change.loraId);
          if (removeIndex >= 0) {
            newLoras.splice(removeIndex, 1);
          }
          break;

        case 'adjust':
          const adjustLora = newLoras.find(l => l.loraId === change.loraId);
          if (adjustLora && change.weight !== undefined) {
            adjustLora.weight = change.weight;
          }
          break;
      }
    }

    // Renormalize if needed
    const normalizedLoras = this.normalizeWeights(newLoras, composition.normalization);

    return {
      ...composition,
      id: uuidv4(),
      loras: normalizedLoras,
    };
  }

  /**
   * Normalize LoRA weights
   */
  private normalizeWeights(loras: LoRAInComposition[], normalization: LoRANormalization): LoRAInComposition[] {
    if (normalization === 'none') {
      return loras;
    }

    if (loras.length === 0) {
      return loras;
    }

    const weights = loras.map(l => l.weight);

    let normalizedWeights: number[];

    switch (normalization) {
      case 'sum_to_1':
        const sum = weights.reduce((a, b) => a + b, 0);
        normalizedWeights = sum > 0 ? weights.map(w => w / sum) : weights;
        break;

      case 'softmax':
        const max = Math.max(...weights);
        const exps = weights.map(w => Math.exp(w - max));
        const expSum = exps.reduce((a, b) => a + b, 0);
        normalizedWeights = exps.map(e => e / expSum);
        break;

      default:
        normalizedWeights = weights;
    }

    return loras.map((l, i) => ({
      ...l,
      weight: normalizedWeights[i],
    }));
  }

  /**
   * Get current composition
   */
  getCurrentComposition(): LoRAComposition | null {
    return this.currentComposition;
  }

  /**
   * Merge current LoRAs
   */
  mergeCurrentLoRAs(): Float32Array {
    if (!this.currentComposition) {
      return new Float32Array(0);
    }

    return this.library.mergeLoRAs(this.currentComposition);
  }

  /**
   * Auto-select LoRAs for a task
   */
  async autoSelectLoRAs(task: string, maxCount: number = 3): Promise<LoRAComposition> {
    const candidates = this.library.findLoRAs(task, maxCount);

    const loras: LoRAInComposition[] = candidates.map(lora => ({
      loraId: lora.id,
      weight: 1.0 / candidates.length,
    }));

    this.currentComposition = this.library.createComposition(this.agentId, loras);

    return this.currentComposition;
  }

  /**
   * Get swap history
   */
  getSwapHistory(): LoRASwapRequestPayload[] {
    return [...this.swapHistory];
  }
}
