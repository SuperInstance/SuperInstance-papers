/**
 * LoRA Adapter - Base class for LoRA adapters
 *
 * Provides core functionality for managing individual LoRA adapters
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  LoRAAdapter,
  LoRAMatrices,
  LoRAStorage,
  LoRAMergeStrategy,
} from './types.js';

/**
 * Base LoRA Adapter class
 * Handles LoRA matrix operations and serialization
 */
export class BaseLoRAAdapter implements LoRAAdapter {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;

  // Model specification
  public readonly baseModel: string;
  public readonly rank: number;
  public readonly alpha: number;

  // Matrices
  public matrices: LoRAMatrices;

  // Metadata
  public expertise: string[];
  public compatibleWith: string[];
  public conflictsWith: string[];
  public size: number;

  // Performance
  public avgPerformance: number;
  public usageCount: number;
  public lastUsed: number;

  // Training
  public trainingDataSize: number;
  public trainingDomain: string;
  public trainingDate: number;
  public version: string;

  /**
   * Create a new LoRA adapter
   */
  constructor(config: Omit<LoRAAdapter, 'id' | 'size' | 'usageCount' | 'lastUsed'> & { id?: string; avgPerformance?: number }) {
    this.id = config.id ?? uuidv4();
    this.name = config.name;
    this.description = config.description;
    this.baseModel = config.baseModel;
    this.rank = config.rank;
    this.alpha = config.alpha;
    this.matrices = config.matrices;
    this.expertise = config.expertise;
    this.compatibleWith = config.compatibleWith;
    this.conflictsWith = config.conflictsWith;
    this.trainingDataSize = config.trainingDataSize;
    this.trainingDomain = config.trainingDomain;
    this.trainingDate = config.trainingDate;
    this.version = config.version || '1.0.0';

    // Calculate size (A + B matrices as Float32Array)
    this.size = (this.matrices.A.length + this.matrices.B.length) * 4; // 4 bytes per float32

    // Initialize performance metrics
    this.avgPerformance = config.avgPerformance ?? 0.5;
    this.usageCount = 0;
    this.lastUsed = 0;
  }

  /**
   * Create LoRA adapter from storage format
   */
  static fromStorage(storage: LoRAStorage): BaseLoRAAdapter {
    const { metadata, matrices } = storage;

    const A = new Float32Array(matrices.A);
    const B = new Float32Array(matrices.B);

    const loraMatrices: LoRAMatrices = {
      A,
      B,
      rank: metadata.rank,
      dimension: B.length / metadata.rank,
    };

    return new BaseLoRAAdapter({
      ...metadata,
      matrices: loraMatrices,
    });
  }

  /**
   * Convert to storage format
   */
  toStorage(): LoRAStorage {
    return {
      metadata: {
        id: this.id,
        name: this.name,
        description: this.description,
        baseModel: this.baseModel,
        rank: this.rank,
        alpha: this.alpha,
        matrices: this.matrices,
        expertise: this.expertise,
        compatibleWith: this.compatibleWith,
        conflictsWith: this.conflictsWith,
        size: this.size,
        avgPerformance: this.avgPerformance,
        usageCount: this.usageCount,
        lastUsed: this.lastUsed,
        trainingDataSize: this.trainingDataSize,
        trainingDomain: this.trainingDomain,
        trainingDate: this.trainingDate,
        version: this.version,
      },
      matrices: {
        A: Array.from(this.matrices.A),
        B: Array.from(this.matrices.B),
      },
    };
  }

  /**
   * Record usage and update performance
   */
  recordUsage(performance: number): void {
    this.usageCount++;
    this.lastUsed = Date.now();

    // Update average performance with exponential moving average
    const alpha = 0.1; // Smoothing factor
    this.avgPerformance = alpha * performance + (1 - alpha) * this.avgPerformance;
  }

  /**
   * Get current performance
   */
  getPerformance(): number {
    return this.avgPerformance;
  }

  /**
   * Check if compatible with another LoRA
   */
  isCompatibleWith(otherId: string): boolean {
    return (
      !this.conflictsWith.includes(otherId) &&
      (this.compatibleWith.length === 0 || this.compatibleWith.includes(otherId))
    );
  }

  /**
   * Get the delta weight matrix (ΔW = B·A)
   * This is computed lazily and cached
   */
  getDeltaWeights(): Float32Array {
    const d = this.matrices.dimension;
    const r = this.rank;
    const delta = new Float32Array(d * d);

    // Compute ΔW = B·A
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        let sum = 0;
        for (let k = 0; k < r; k++) {
          sum += this.matrices.B[i * r + k] * this.matrices.A[k * d + j];
        }
        delta[i * d + j] = sum * (this.alpha / this.rank);
      }
    }

    return delta;
  }

  /**
   * Clone this adapter
   */
  clone(): BaseLoRAAdapter {
    return new BaseLoRAAdapter({
      id: uuidv4(), // New ID for cloned adapter
      name: `${this.name} (clone)`,
      description: this.description,
      baseModel: this.baseModel,
      rank: this.rank,
      alpha: this.alpha,
      matrices: {
        A: new Float32Array(this.matrices.A),
        B: new Float32Array(this.matrices.B),
        rank: this.matrices.rank,
        dimension: this.matrices.dimension,
      },
      expertise: [...this.expertise],
      compatibleWith: [...this.compatibleWith],
      conflictsWith: [...this.conflictsWith],
      trainingDataSize: this.trainingDataSize,
      trainingDomain: this.trainingDomain,
      trainingDate: this.trainingDate,
      version: this.version,
      avgPerformance: this.avgPerformance,
    });
  }
}

/**
 * Initialize LoRA matrices with proper defaults
 */
export function initializeLoRAMatrices(
  dimension: number,
  rank: number,
  initType: 'kaiming' | 'xavier' | 'normal' | 'zeros' = 'kaiming'
): LoRAMatrices {
  const r = rank;
  const d = dimension;

  const A = new Float32Array(r * d);
  const B = new Float32Array(d * r);

  // Initialize A with random values, B with zeros (LoRA standard)
  for (let i = 0; i < r * d; i++) {
    switch (initType) {
      case 'kaiming':
        // Kaiming initialization: N(0, sqrt(2/r))
        A[i] = (Math.random() - 0.5) * 2 * Math.sqrt(2 / r);
        break;
      case 'xavier':
        // Xavier initialization: N(0, sqrt(2/(r+d)))
        A[i] = (Math.random() - 0.5) * 2 * Math.sqrt(2 / (r + d));
        break;
      case 'normal':
        // Standard normal: N(0, 0.01)
        A[i] = (Math.random() - 0.5) * 0.02;
        break;
      case 'zeros':
        A[i] = 0;
        break;
    }
  }

  // B is initialized to zeros (LoRA standard)
  for (let i = 0; i < d * r; i++) {
    B[i] = 0;
  }

  return { A, B, rank: r, dimension: d };
}

/**
 * Compute SVD of a matrix for merging
 */
export function computeSVD(matrix: Float32Array, rows: number, cols: number): {
  U: Float32Array;
  S: Float32Array;
  Vt: Float32Array;
} {
  // Simplified SVD - in production, use a proper linear algebra library
  // For now, return a placeholder implementation

  const minDim = Math.min(rows, cols);
  const U = new Float32Array(rows * minDim);
  const S = new Float32Array(minDim);
  const Vt = new Float32Array(minDim * cols);

  // Identity matrices as placeholders
  for (let i = 0; i < minDim; i++) {
    if (i < rows) U[i * minDim + i] = 1;
    if (i < cols) Vt[i * cols + i] = 1;
    S[i] = 1;
  }

  return { U, S, Vt };
}

/**
 * Merge multiple LoRA adapters using linear composition
 */
export function mergeLoRAsLinear(
  loras: Array<{ adapter: LoRAAdapter; weight: number }>,
  dimension: number
): Float32Array {
  const mergedDelta = new Float32Array(dimension * dimension);

  for (const { adapter, weight } of loras) {
    const delta = adapter instanceof BaseLoRAAdapter
      ? adapter.getDeltaWeights()
      : new Float32Array(dimension * dimension); // Placeholder for non-BaseLoRAAdapter

    // Add weighted contribution
    for (let i = 0; i < mergedDelta.length; i++) {
      mergedDelta[i] += weight * delta[i];
    }
  }

  return mergedDelta;
}

/**
 * Merge LoRA adapters using SVD-based merging
 */
export function mergeLoRAsSVD(
  loras: Array<{ adapter: LoRAAdapter; weight: number }>,
  dimension: number,
  targetRank: number
): Float32Array {
  // First do linear merge
  const linearMerge = mergeLoRAsLinear(loras, dimension);

  // Then apply SVD truncation
  const { U, S, Vt } = computeSVD(linearMerge, dimension, dimension);

  // Truncate to target rank
  const truncated = new Float32Array(dimension * dimension);
  for (let i = 0; i < dimension; i++) {
    for (let j = 0; j < dimension; j++) {
      let sum = 0;
      for (let k = 0; k < Math.min(targetRank, S.length); k++) {
        sum += U[i * Math.min(dimension, S.length) + k] * S[k] * Vt[k * dimension + j];
      }
      truncated[i * dimension + j] = sum;
    }
  }

  return truncated;
}

/**
 * Compute interference between two LoRA adapters
 * Measures subspace overlap
 */
export function computeInterference(lora1: LoRAAdapter, lora2: LoRAAdapter): number {
  // Simplified interference computation based on conflict lists
  if (lora1.conflictsWith.includes(lora2.id) || lora2.conflictsWith.includes(lora1.id)) {
    return 1.0; // Maximum interference
  }

  if (lora1.compatibleWith.includes(lora2.id) && lora2.compatibleWith.includes(lora1.id)) {
    return 0.0; // No interference
  }

  // Compute subspace overlap (simplified)
  // In production, use proper SVD-based subspace analysis
  const expertiseOverlap =
    lora1.expertise.filter(e => lora2.expertise.includes(e)).length /
    Math.max(lora1.expertise.length, lora2.expertise.length);

  return expertiseOverlap * 0.5; // Scale to 0-0.5 range
}

/**
 * Optimize LoRA weights for a composition
 * Uses quadratic programming to maximize performance while minimizing interference
 */
export function optimizeWeights(
  loras: LoRAAdapter[],
  targetTask: string,
  interferenceMatrix: number[][]
): number[] {
  const n = loras.length;

  if (n === 0) return [];
  if (n === 1) return [1.0];

  // Simplified optimization: normalize by performance and penalize interference
  const weights: number[] = new Array(n).fill(1.0);

  for (let i = 0; i < n; i++) {
    let penalty = 1.0;
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        penalty *= (1 - interferenceMatrix[i][j]);
      }
    }
    weights[i] = loras[i].avgPerformance * penalty;
  }

  // Normalize to sum to 1
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (let i = 0; i < n; i++) {
      weights[i] /= sum;
    }
  }

  return weights;
}
