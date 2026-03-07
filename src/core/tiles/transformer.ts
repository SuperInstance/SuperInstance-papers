/**
 * POLLN Transformer Tile
 *
 * A tile that uses transformer-like attention mechanism
 * for processing inputs with context-aware weighting.
 */

import { v4 } from 'uuid';
import {
  BaseTile,
  TileCategory,
  TileConfig,
  TileContext,
  TileResult,
  Observation,
  PollenGrain,
} from '../tile.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input for transformer tile
 */
export interface TransformerInput {
  tokens: number[][];  // Sequence of token embeddings
  context?: Record<string, unknown>;
}

/**
 * Output from transformer tile
 */
export interface TransformerOutput {
  embedding: number[];  // Output embedding
  attention: number[];  // Attention weights
  confidence: number;
}

/**
 * Transformer tile configuration
 */
export interface TransformerTileConfig extends TileConfig {
  embeddingDim: number;
  numHeads: number;
  maxSequenceLength: number;
  attentionDropout?: number;
}

// ============================================================================
// TRANSFORMER TILE
// ============================================================================

/**
 * TransformerTile - Uses attention mechanism for processing
 *
 * Features:
 * - Multi-head attention simulation
 * - Context-aware weighting
 * - Learns which input features matter most
 */
export class TransformerTile extends BaseTile<TransformerInput, TransformerOutput> {
  private embeddingDim: number;
  private numHeads: number;
  private maxSeqLen: number;
  private attentionDropout: number;

  // Learnable parameters
  private queryWeights: number[];
  private keyWeights: number[];
  private valueWeights: number[];
  private outputWeights: number[];

  constructor(config: TransformerTileConfig) {
    super({
      ...config,
      name: config.name || 'transformer',
      category: config.category ?? TileCategory.ROLE,
    });

    this.embeddingDim = config.embeddingDim;
    this.numHeads = config.numHeads;
    this.maxSeqLen = config.maxSequenceLength;
    this.attentionDropout = config.attentionDropout ?? 0.1;

    // Initialize attention weights
    const weightSize = this.embeddingDim * this.embeddingDim;
    this.queryWeights = this.initializeWeights(weightSize);
    this.keyWeights = this.initializeWeights(weightSize);
    this.valueWeights = this.initializeWeights(weightSize);
    this.outputWeights = this.initializeWeights(this.embeddingDim);
  }

  /**
   * Execute transformer-style processing
   */
  async execute(
    input: TransformerInput,
    context: TileContext
  ): Promise<TileResult<TransformerOutput>> {
    const startTime = Date.now();
    const { tokens } = input;

    // Truncate if needed
    const seq = tokens.slice(0, this.maxSeqLen);
    const seqLen = seq.length;

    if (seqLen === 0) {
      return {
        output: {
          embedding: new Array(this.embeddingDim).fill(0),
          attention: [],
          confidence: 0,
        },
        success: false,
        confidence: 0,
        executionTimeMs: Date.now() - startTime,
        energyUsed: 0,
        observations: [],
      };
    }

    // Compute Q, K, V projections
    const queries = this.project(seq, this.queryWeights);
    const keys = this.project(seq, this.keyWeights);
    const values = this.project(seq, this.valueWeights);

    // Compute attention scores
    const attentionWeights = this.computeAttention(queries, keys);

    // Apply dropout during training (use variant selection as proxy)
    const variant = this.selectVariant(context.temperature ?? 1.0);
    const effectiveAttention = variant.avgReward > 0.5
      ? attentionWeights
      : this.applyDropout(attentionWeights, this.attentionDropout);

    // Weighted sum of values
    const output = this.weightedSum(values, effectiveAttention);

    // Final projection
    const finalEmbedding = this.finalProject(output);

    // Calculate confidence based on attention distribution entropy
    const avgEntropy = this.calculateAttentionEntropy(effectiveAttention);
    const confidence = 1 / (1 + avgEntropy);

    return {
      output: {
        embedding: finalEmbedding,
        attention: effectiveAttention.flat(),
        confidence,
      },
      success: true,
      confidence,
      executionTimeMs: Date.now() - startTime,
      energyUsed: seqLen * this.embeddingDim * 4, // Estimate
      observations: this.createObservations(input, finalEmbedding, confidence),
    };
  }

  /**
   * Deserialize from pollen grain
   */
  static deserialize(grain: PollenGrain): TransformerTile {
    const configData = grain.config ?? {};
    const config: TransformerTileConfig = {
      id: grain.tileId,
      name: grain.tileName,
      category: grain.category,
      embeddingDim: (configData['embeddingDim'] as number) ?? 64,
      numHeads: (configData['numHeads'] as number) ?? 4,
      maxSequenceLength: (configData['maxSeqLen'] as number) ?? 512,
      initialWeights: grain.weights,
    };

    const tile = new TransformerTile(config);

    // Restore weights from config
    if (configData['queryWeights']) {
      tile.queryWeights = configData['queryWeights'] as number[];
    }
    if (configData['keyWeights']) {
      tile.keyWeights = configData['keyWeights'] as number[];
    }
    if (configData['valueWeights']) {
      tile.valueWeights = configData['valueWeights'] as number[];
    }
    if (configData['outputWeights']) {
      tile.outputWeights = configData['outputWeights'] as number[];
    }

    return tile;
  }

  /**
   * Override serialization to include transformer weights
   */
  override serialize(): PollenGrain {
    const grain = super.serialize();
    // Store config with complex data
    grain.config = {
      embeddingDim: this.embeddingDim,
      numHeads: this.numHeads,
      maxSeqLen: this.maxSeqLen,
      queryWeights: this.queryWeights,
      keyWeights: this.keyWeights,
      valueWeights: this.valueWeights,
      outputWeights: this.outputWeights,
    };
    return grain;
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private initializeWeights(size: number): number[] {
    const weights: number[] = [];
    const scale = Math.sqrt(2 / size);
    for (let i = 0; i < size; i++) {
      weights.push((Math.random() - 0.5) * scale);
    }
    return weights;
  }

  private project(tokens: number[][], weights: number[]): number[][] {
    return tokens.map(token => {
      const projected: number[] = [];
      for (let i = 0; i < this.embeddingDim; i++) {
        let sum = 0;
        for (let j = 0; j < token.length && j < this.embeddingDim; j++) {
          const weightIdx = i * this.embeddingDim + j;
          sum += token[j] * (weights[weightIdx] ?? 0);
        }
        projected.push(sum);
      }
      return projected;
    });
  }

  private computeAttention(queries: number[][], keys: number[][]): number[][] {
    const seqLen = queries.length;
    const scores: number[][] = [];
    const scale = 1 / Math.sqrt(this.embeddingDim);

    // Compute scaled dot-product attention
    for (let i = 0; i < seqLen; i++) {
      const row: number[] = [];
      for (let j = 0; j < seqLen; j++) {
        let score = 0;
        for (let k = 0; k < this.embeddingDim; k++) {
          score += queries[i][k] * keys[j][k];
        }
        row.push(score * scale);
      }
      scores.push(row);
    }

    // Apply softmax
    return this.softmaxMatrix(scores);
  }

  private softmaxMatrix(matrix: number[][]): number[][] {
    return matrix.map(row => {
      const maxVal = Math.max(...row);
      const exps = row.map(v => Math.exp(v - maxVal));
      const sum = exps.reduce((a, b) => a + b, 0);
      return exps.map(e => e / sum);
    });
  }

  private applyDropout(attention: number[][], rate: number): number[][] {
    return attention.map(row =>
      row.map(v => (Math.random() < rate ? 0 : v / (1 - rate)))
    );
  }

  private weightedSum(values: number[][], attention: number[][]): number[] {
    const seqLen = values.length;
    const output: number[] = new Array(this.embeddingDim).fill(0);

    for (let i = 0; i < seqLen; i++) {
      for (let j = 0; j < seqLen; j++) {
        for (let k = 0; k < this.embeddingDim; k++) {
          output[k] += attention[i][j] * values[j][k];
        }
      }
    }

    // Average over sequence
    return output.map(v => v / seqLen);
  }

  private finalProject(embedding: number[]): number[] {
    return embedding.map((v, i) => v * (this.outputWeights[i] ?? 1));
  }

  private calculateAttentionEntropy(attention: number[][]): number {
    let totalEntropy = 0;
    for (const row of attention) {
      for (const p of row) {
        if (p > 0) {
          totalEntropy -= p * Math.log2(p);
        }
      }
    }
    return totalEntropy / attention.length;
  }

  private createObservations(
    input: TransformerInput,
    output: number[],
    confidence: number
  ): Observation[] {
    return [{
      timestamp: Date.now(),
      input: { tokenCount: input.tokens.length },
      output: { embeddingDim: output.length },
      reward: confidence,
      context: { hasContext: !!input.context },
    }];
  }
}
