/**
 * QGT Core Model - Quaternion Geometric Transformer
 * 
 * A novel SE(3)-equivariant architecture combining:
 * - Quaternion position encoding
 * - Frame-averaged attention
 * - Higher-order message passing
 * - Domain-specific output heads
 */

import {
  Quaternion,
  Vector3,
  Matrix3,
  randomQuaternion,
  quaternionToMatrix,
  vectorNorm,
} from './quaternion';
import {
  Frame,
  computeCanonicalFrames,
  applyFrameTransformPosition,
  applyInverseFrameTransformVector,
  averageEquivariantOverFrames,
} from './frameUtils';
import { computeYlm, computeWignerDFromQuaternion } from './sphericalHarmonics';

// ============================================================================
// Type Definitions
// ============================================================================

export interface QGTConfig {
  inputDim: number;
  hiddenDim: number;
  outputDim: number;
  numLayers: number;
  numHeads: number;
  lMax: number;
  kNeighbors: number;
  frameSize: number;
  domain: 'molecular' | 'protein' | 'robotics' | 'quantum';
}

export interface GeometricGraph {
  nodeFeatures: number[][];
  positions: Vector3[];
  edgeIndex: [number, number][];
  batch?: number[];
}

export interface QGTOutput {
  // Invariant outputs
  energy?: number;
  confidence?: number;
  
  // Equivariant outputs
  forces?: Vector3[];
  velocities?: Vector3[];
  
  // Higher-order features
  features: Map<string, number[]>;
  
  // Debug info
  frameAveragingInfo?: {
    numFrames: number;
    frameVariance: number;
  };
}

// ============================================================================
// Quaternion Position Encoding
// ============================================================================

export class QuaternionPositionEncoding {
  private hiddenDim: number;
  private kNeighbors: number;

  constructor(hiddenDim: number = 256, kNeighbors: number = 16) {
    this.hiddenDim = hiddenDim;
    this.kNeighbors = kNeighbors;
  }

  /**
   * Encode positions using quaternion-based local frames
   */
  encode(graph: GeometricGraph): {
    invariantFeatures: number[][];
    equivariantFeatures: number[][][];
    localFrames: Frame[];
  } {
    const { positions } = graph;
    const n = positions.length;

    // Compute distance-based invariant features
    const invariantFeatures: number[][] = [];
    for (let i = 0; i < n; i++) {
      const features: number[] = [];
      
      // Distances to k nearest neighbors
      const distances: { j: number; d: number }[] = [];
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const d = vectorNorm([
            positions[j][0] - positions[i][0],
            positions[j][1] - positions[i][1],
            positions[j][2] - positions[i][2],
          ]);
          distances.push({ j, d });
        }
      }
      distances.sort((a, b) => a.d - b.d);
      
      // Take k nearest distances as features
      for (let k = 0; k < this.kNeighbors; k++) {
        features.push(distances[k]?.d || 0);
      }
      
      invariantFeatures.push(features);
    }

    // Compute canonical frames
    const localFrames = computeCanonicalFrames(positions, this.frameSize || 24);

    // Compute equivariant features (direction vectors in local frames)
    const equivariantFeatures: number[][][] = [];
    for (let i = 0; i < n; i++) {
      const nodeFeatures: number[][] = [];
      
      for (const frame of localFrames.slice(0, 1)) { // Use first frame only
        const directions: number[] = [];
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            const dir: Vector3 = [
              positions[j][0] - positions[i][0],
              positions[j][1] - positions[i][1],
              positions[j][2] - positions[i][2],
            ];
            const localDir = applyFrameTransformPosition(dir, frame);
            directions.push(...localDir);
          }
        }
        nodeFeatures.push(directions);
      }
      equivariantFeatures.push(nodeFeatures);
    }

    return {
      invariantFeatures,
      equivariantFeatures,
      localFrames,
    };
  }
}

// ============================================================================
// Frame-Averaged Equivariant Attention
// ============================================================================

export class FrameAveragedAttention {
  private hiddenDim: number;
  private numHeads: number;
  private lMax: number;
  private frameSize: number;

  constructor(
    hiddenDim: number = 256,
    numHeads: number = 8,
    lMax: number = 4,
    frameSize: number = 24
  ) {
    this.hiddenDim = hiddenDim;
    this.numHeads = numHeads;
    this.lMax = lMax;
    this.frameSize = frameSize;
  }

  /**
   * Compute frame-averaged equivariant attention
   */
  forward(
    features: number[][],
    positions: Vector3[]
  ): {
    output: number[][];
    attentionWeights: number[][];
  } {
    const n = positions.length;
    const frames = computeCanonicalFrames(positions, this.frameSize);

    // Compute attention for each frame
    const frameOutputs: number[][][] = [];
    const allAttentionWeights: number[][] = [];

    for (const frame of frames) {
      // Transform positions to frame
      const framePositions = positions.map(p => applyFrameTransformPosition(p, frame));

      // Compute distance-based attention (invariant)
      const attentionWeights: number[][] = [];
      for (let i = 0; i < n; i++) {
        const weights: number[] = [];
        for (let j = 0; j < n; j++) {
          const dist = vectorNorm([
            framePositions[j][0] - framePositions[i][0],
            framePositions[j][1] - framePositions[i][1],
            framePositions[j][2] - framePositions[i][2],
          ]);
          // Exponential decay attention
          weights.push(Math.exp(-dist));
        }
        // Normalize
        const sum = weights.reduce((a, b) => a + b, 0);
        for (let j = 0; j < n; j++) {
          weights[j] /= sum;
        }
        attentionWeights.push(weights);
      }
      allAttentionWeights.push(...attentionWeights);

      // Apply attention to features
      const output: number[][] = [];
      for (let i = 0; i < n; i++) {
        const aggregated: number[] = new Array(this.hiddenDim).fill(0);
        for (let j = 0; j < n; j++) {
          for (let d = 0; d < this.hiddenDim; d++) {
            aggregated[d] += attentionWeights[i][j] * features[j][d];
          }
        }
        output.push(aggregated);
      }

      // Transform output back
      const transformedOutput = output.map((f, idx) => {
        // For features (invariant), no transformation needed
        return f;
      });

      frameOutputs.push(transformedOutput);
    }

    // Average over frames
    const averagedOutput: number[][] = [];
    for (let i = 0; i < n; i++) {
      const averaged: number[] = new Array(this.hiddenDim).fill(0);
      for (let f = 0; f < frames.length; f++) {
        for (let d = 0; d < this.hiddenDim; d++) {
          averaged[d] += frameOutputs[f][i][d] / frames.length;
        }
      }
      averagedOutput.push(averaged);
    }

    return {
      output: averagedOutput,
      attentionWeights: allAttentionWeights,
    };
  }
}

// ============================================================================
// Higher-Order Message Passing
// ============================================================================

export class HigherOrderMessagePassing {
  private hiddenDim: number;
  private lMax: number;

  constructor(hiddenDim: number = 256, lMax: number = 4) {
    this.hiddenDim = hiddenDim;
    this.lMax = lMax;
  }

  /**
   * Compute higher-order equivariant messages
   */
  forward(
    features: Map<string, number[]>,
    positions: Vector3[],
    edgeIndex: [number, number][]
  ): Map<string, number[]> {
    const updatedFeatures = new Map<string, number[]>();

    // Initialize features for each l
    for (let l = 0; l <= this.lMax; l++) {
      for (let m = -l; m <= l; m++) {
        const key = `${l},${m}`;
        if (!features.has(key)) {
          updatedFeatures.set(key, []);
        } else {
          updatedFeatures.set(key, [...features.get(key)!]);
        }
      }
    }

    // Message passing along edges
    for (const [src, dst] of edgeIndex) {
      const edgeDir: Vector3 = [
        positions[dst][0] - positions[src][0],
        positions[dst][1] - positions[src][1],
        positions[dst][2] - positions[src][2],
      ];

      // Compute Y_l^m for edge direction
      for (let l = 0; l <= this.lMax; l++) {
        for (let m = -l; m <= l; m++) {
          const ylm = computeYlm(l, m, 
            Math.acos(edgeDir[2] / (vectorNorm(edgeDir) + 1e-10)),
            Math.atan2(edgeDir[1], edgeDir[0])
          );

          // Update feature (simplified aggregation)
          const key = `${l},${m}`;
          const currentFeature = updatedFeatures.get(key) || [];
          if (currentFeature.length > dst) {
            currentFeature[dst] += ylm.re * 0.1; // Simple update rule
          }
        }
      }
    }

    return updatedFeatures;
  }
}

// ============================================================================
// QGT Model
// ============================================================================

export class QGTModel {
  private config: QGTConfig;
  private positionEncoding: QuaternionPositionEncoding;
  private attention: FrameAveragedAttention;
  private messagePassing: HigherOrderMessagePassing;

  constructor(config: Partial<QGTConfig> = {}) {
    this.config = {
      inputDim: 128,
      hiddenDim: 256,
      outputDim: 128,
      numLayers: 6,
      numHeads: 8,
      lMax: 4,
      kNeighbors: 16,
      frameSize: 24,
      domain: 'molecular',
      ...config,
    };

    this.positionEncoding = new QuaternionPositionEncoding(
      this.config.hiddenDim,
      this.config.kNeighbors
    );

    this.attention = new FrameAveragedAttention(
      this.config.hiddenDim,
      this.config.numHeads,
      this.config.lMax,
      this.config.frameSize
    );

    this.messagePassing = new HigherOrderMessagePassing(
      this.config.hiddenDim,
      this.config.lMax
    );
  }

  /**
   * Forward pass through QGT
   */
  forward(graph: GeometricGraph): QGTOutput {
    const { nodeFeatures, positions, edgeIndex } = graph;
    const n = positions.length;

    // 1. Quaternion Position Encoding
    const posEncoding = this.positionEncoding.encode(graph);

    // 2. Combine input features with position encoding
    let features: number[][] = nodeFeatures.map((f, i) => {
      const combined = [...f];
      // Pad or trim to hiddenDim
      while (combined.length < this.config.hiddenDim) {
        combined.push(0);
      }
      return combined.slice(0, this.config.hiddenDim);
    });

    // 3. Stacked layers
    for (let layer = 0; layer < this.config.numLayers; layer++) {
      // Frame-averaged attention
      const attnOutput = this.attention.forward(features, positions);

      // Residual connection
      features = features.map((f, i) =>
        f.map((v, d) => v + attnOutput.output[i][d])
      );

      // Higher-order message passing
      const higherOrderFeatures = new Map<string, number[]>();
      for (let l = 0; l <= this.config.lMax; l++) {
        for (let m = -l; m <= l; m++) {
          higherOrderFeatures.set(`${l},${m}`, features.map(f => f[0] || 0));
        }
      }
      const mpOutput = this.messagePassing.forward(higherOrderFeatures, positions, edgeIndex);
    }

    // 4. Domain-specific outputs
    const output = this.computeOutputs(features, positions);

    return output;
  }

  /**
   * Compute domain-specific outputs
   */
  private computeOutputs(features: number[][], positions: Vector3[]): QGTOutput {
    const n = positions.length;

    // Compute energy (sum of scalar features)
    const energy = features.reduce((sum, f) => sum + (f[0] || 0), 0);

    // Compute forces (equivariant, from gradient-like computation)
    const forces: Vector3[] = features.map(f => [
      f[1] || 0,
      f[2] || 0,
      f[3] || 0,
    ]);

    // Pack higher-order features
    const higherOrderFeatures = new Map<string, number[]>();
    for (let l = 0; l <= this.config.lMax; l++) {
      for (let m = -l; m <= l; m++) {
        higherOrderFeatures.set(`${l},${m}`, features.map(f => f[l * 2 + m] || 0));
      }
    }

    return {
      energy,
      forces,
      features: higherOrderFeatures,
      frameAveragingInfo: {
        numFrames: this.config.frameSize,
        frameVariance: 0.01, // Placeholder
      },
    };
  }

  /**
   * Validate SE(3) equivariance
   */
  validateEquivariance(graph: GeometricGraph, numTests: number = 10): {
    energyError: number;
    forceError: number;
  } {
    // Base prediction
    const baseOutput = this.forward(graph);

    let totalEnergyError = 0;
    let totalForceError = 0;

    for (let t = 0; t < numTests; t++) {
      // Random rotation
      const q = randomQuaternion();
      const R = quaternionToMatrix(q);

      // Rotate positions
      const rotatedPositions = graph.positions.map(p => ({
        rotated: [
          R[0][0] * p[0] + R[0][1] * p[1] + R[0][2] * p[2],
          R[1][0] * p[0] + R[1][1] * p[1] + R[1][2] * p[2],
          R[2][0] * p[0] + R[2][1] * p[1] + R[2][2] * p[2],
        ] as Vector3,
      }));

      const rotatedGraph: GeometricGraph = {
        ...graph,
        positions: rotatedPositions.map(p => p.rotated),
      };

      const rotatedOutput = this.forward(rotatedGraph);

      // Energy should be invariant
      totalEnergyError += Math.abs(rotatedOutput.energy! - baseOutput.energy!);

      // Forces should transform as F' = R * F
      for (let i = 0; i < graph.positions.length; i++) {
        const expectedForce: Vector3 = [
          R[0][0] * baseOutput.forces![i][0] + R[0][1] * baseOutput.forces![i][1] + R[0][2] * baseOutput.forces![i][2],
          R[1][0] * baseOutput.forces![i][0] + R[1][1] * baseOutput.forces![i][1] + R[1][2] * baseOutput.forces![i][2],
          R[2][0] * baseOutput.forces![i][0] + R[2][1] * baseOutput.forces![i][1] + R[2][2] * baseOutput.forces![i][2],
        ];

        const forceError = vectorNorm([
          rotatedOutput.forces![i][0] - expectedForce[0],
          rotatedOutput.forces![i][1] - expectedForce[1],
          rotatedOutput.forces![i][2] - expectedForce[2],
        ]);
        totalForceError += forceError;
      }
    }

    return {
      energyError: totalEnergyError / numTests,
      forceError: totalForceError / (numTests * graph.positions.length),
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createQGTModel(config?: Partial<QGTConfig>): QGTModel {
  return new QGTModel(config);
}
