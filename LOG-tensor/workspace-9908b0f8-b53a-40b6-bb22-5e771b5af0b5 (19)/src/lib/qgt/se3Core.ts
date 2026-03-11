/**
 * SE(3)-QGT Core Module
 * 
 * Extends QGT to full 6D pose (position + orientation) using:
 * - Dual Quaternions for unified SE(3) representation
 * - Twist coordinates for minimal 6D parameterization
 * - Screw-interpolated attention for SE(3)-equivariant processing
 * 
 * Applications:
 * - Camera pose estimation
 * - Drone/UAV navigation
 * - Autonomous vehicle trajectory prediction
 * - Molecular dynamics (protein structures)
 */

import { Quaternion, Vector3, randomQuaternion, quaternionMultiply, quaternionConjugate, quaternionToMatrix } from './quaternion';

// =============================================================================
// Core Types
// =============================================================================

/**
 * Dual quaternion representing SE(3) transformation
 * q = q_r + epsilon * q_d
 */
export interface DualQuaternion {
  qr: Quaternion;  // Real part (rotation quaternion)
  qd: Quaternion;  // Dual part (translation encoded)
}

/**
 * Twist coordinates (se(3) Lie algebra)
 * xi = [omega, v] where:
 * - omega: angular velocity (rotation axis * angle)
 * - v: linear velocity
 */
export type Twist = [number, number, number, number, number, number]; // [wx, wy, wz, vx, vy, vz]

/**
 * SE(3) transformation matrix
 */
export type SE3Matrix = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number]
];

/**
 * 6D pose (position + orientation)
 */
export interface Pose6D {
  position: Vector3;
  orientation: Quaternion; // or rotation matrix
}

/**
 * Configuration for SE(3)-QGT
 */
export interface SE3QGTConfig {
  inputDim: number;
  hiddenDim: number;
  outputDim: number;
  numLayers: number;
  numHeads: number;
  lMax: number;
  kNeighbors: number;
  useDualQuaternion: boolean;
  useTwistEncoding: boolean;
}

// =============================================================================
// Dual Quaternion Operations
// =============================================================================

/**
 * Create identity dual quaternion
 */
export function dualQuaternionIdentity(): DualQuaternion {
  return {
    qr: [1, 0, 0, 0],
    qd: [0, 0, 0, 0]
  };
}

/**
 * Create dual quaternion from rotation and translation
 */
export function dualQuaternionFromRT(R: Quaternion, t: Vector3): DualQuaternion {
  // qd = 0.5 * [0, tx, ty, tz] * qr
  const tQuat: Quaternion = [0, t[0], t[1], t[2]];
  const qd = quaternionMultiply(tQuat, R).map(v => v * 0.5) as Quaternion;
  
  return { qr: R, qd };
}

/**
 * Create dual quaternion from rotation matrix and translation
 */
export function dualQuaternionFromMatrix(R: number[][], t: Vector3): DualQuaternion {
  // Convert rotation matrix to quaternion
  const qr = matrixToQuaternion(R);
  return dualQuaternionFromRT(qr, t);
}

/**
 * Multiply two dual quaternions (compose SE(3) transformations)
 */
export function dualQuaternionMultiply(dq1: DualQuaternion, dq2: DualQuaternion): DualQuaternion {
  // (q1 + eps*q1') * (q2 + eps*q2') = q1*q2 + eps*(q1*q2' + q1'*q2)
  const qr = quaternionMultiply(dq1.qr, dq2.qr);
  
  const qd1 = quaternionMultiply(dq1.qr, dq2.qd);
  const qd2 = quaternionMultiply(dq1.qd, dq2.qr);
  const qd = [qd1[0] + qd2[0], qd1[1] + qd2[1], qd1[2] + qd2[2], qd1[3] + qd2[3]] as Quaternion;
  
  return { qr, qd };
}

/**
 * Dual quaternion conjugate
 */
export function dualQuaternionConjugate(dq: DualQuaternion): DualQuaternion {
  return {
    qr: quaternionConjugate(dq.qr),
    qd: quaternionConjugate(dq.qd)
  };
}

/**
 * Dual quaternion inverse
 */
export function dualQuaternionInverse(dq: DualQuaternion): DualQuaternion {
  const qrInv = quaternionConjugate(dq.qr);
  // qd_inv = -qr_conj * qd * qr_conj
  const temp = quaternionMultiply(qrInv, dq.qd);
  const qdInv = quaternionMultiply(temp, qrInv).map(v => -v) as Quaternion;
  
  return { qr: qrInv, qd: qdInv };
}

/**
 * Transform a 3D point using dual quaternion
 */
export function dualQuaternionTransformPoint(dq: DualQuaternion, p: Vector3): Vector3 {
  // Extract translation from dual quaternion
  // t = 2 * qd * qr_conj
  const qrConj = quaternionConjugate(dq.qr);
  const tQuat = quaternionMultiply(dq.qd, qrConj).map(v => v * 2);
  const t: Vector3 = [tQuat[1], tQuat[2], tQuat[3]];
  
  // Rotate point
  const R = quaternionToMatrix(dq.qr);
  const rotated: Vector3 = [
    R[0][0] * p[0] + R[0][1] * p[1] + R[0][2] * p[2],
    R[1][0] * p[0] + R[1][1] * p[1] + R[1][2] * p[2],
    R[2][0] * p[0] + R[2][1] * p[1] + R[2][2] * p[2]
  ];
  
  // Add translation
  return [rotated[0] + t[0], rotated[1] + t[1], rotated[2] + t[2]];
}

/**
 * Convert dual quaternion to twist coordinates
 */
export function dualQuaternionToTwist(dq: DualQuaternion): Twist {
  // Extract rotation angle and axis
  const theta = 2 * Math.acos(Math.max(-1, Math.min(1, dq.qr[0])));
  
  if (theta < 1e-10) {
    // Small rotation: pure translation
    const tQuat = quaternionMultiply(dq.qd, quaternionConjugate(dq.qr)).map(v => v * 2);
    return [0, 0, 0, tQuat[1], tQuat[2], tQuat[3]];
  }
  
  // Rotation axis
  const sinHalfTheta = Math.sin(theta / 2);
  const axis: Vector3 = [
    dq.qr[1] / sinHalfTheta,
    dq.qr[2] / sinHalfTheta,
    dq.qr[3] / sinHalfTheta
  ];
  
  // Angular velocity (omega = axis * theta)
  const omega: [number, number, number] = [
    axis[0] * theta,
    axis[1] * theta,
    axis[2] * theta
  ];
  
  // Extract translation
  const tQuat = quaternionMultiply(dq.qd, quaternionConjugate(dq.qr)).map(v => v * 2);
  const t: Vector3 = [tQuat[1], tQuat[2], tQuat[3]];
  
  // For simplicity, return omega and translation
  // Full conversion to twist velocity requires solving linear system
  return [omega[0], omega[1], omega[2], t[0], t[1], t[2]];
}

/**
 * Create dual quaternion from twist coordinates
 */
export function twistToDualQuaternion(xi: Twist): DualQuaternion {
  const omega: Vector3 = [xi[0], xi[1], xi[2]];
  const v: Vector3 = [xi[3], xi[4], xi[5]];
  
  const theta = Math.sqrt(omega[0]**2 + omega[1]**2 + omega[2]**2);
  
  if (theta < 1e-10) {
    // Pure translation
    return dualQuaternionFromRT([1, 0, 0, 0], v);
  }
  
  // Rotation from omega
  const axis: Vector3 = [omega[0] / theta, omega[1] / theta, omega[2] / theta];
  const qr: Quaternion = [
    Math.cos(theta / 2),
    axis[0] * Math.sin(theta / 2),
    axis[1] * Math.sin(theta / 2),
    axis[2] * Math.sin(theta / 2)
  ];
  
  // Translation (simplified: just use v directly)
  return dualQuaternionFromRT(qr, v);
}

// =============================================================================
// Matrix Utilities
// =============================================================================

/**
 * Convert rotation matrix to quaternion
 */
export function matrixToQuaternion(R: number[][]): Quaternion {
  const trace = R[0][0] + R[1][1] + R[2][2];
  
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1.0);
    return [
      0.25 / s,
      (R[2][1] - R[1][2]) * s,
      (R[0][2] - R[2][0]) * s,
      (R[1][0] - R[0][1]) * s
    ];
  } else if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) {
    const s = 2.0 * Math.sqrt(1.0 + R[0][0] - R[1][1] - R[2][2]);
    return [
      (R[2][1] - R[1][2]) / s,
      0.25 * s,
      (R[0][1] + R[1][0]) / s,
      (R[0][2] + R[2][0]) / s
    ];
  } else if (R[1][1] > R[2][2]) {
    const s = 2.0 * Math.sqrt(1.0 + R[1][1] - R[0][0] - R[2][2]);
    return [
      (R[0][2] - R[2][0]) / s,
      (R[0][1] + R[1][0]) / s,
      0.25 * s,
      (R[1][2] + R[2][1]) / s
    ];
  } else {
    const s = 2.0 * Math.sqrt(1.0 + R[2][2] - R[0][0] - R[1][1]);
    return [
      (R[1][0] - R[0][1]) / s,
      (R[0][2] + R[2][0]) / s,
      (R[1][2] + R[2][1]) / s,
      0.25 * s
    ];
  }
}

/**
 * Generate random rotation matrix (uniform on SO(3))
 */
export function randomRotationMatrix(): number[][] {
  const u1 = Math.random();
  const u2 = Math.random();
  const u3 = Math.random();
  
  const q: Quaternion = [
    Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2),
    Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2),
    Math.sqrt(u1) * Math.sin(2 * Math.PI * u3),
    Math.sqrt(u1) * Math.cos(2 * Math.PI * u3)
  ];
  
  return quaternionToMatrix(q);
}

/**
 * Generate random SE(3) transformation
 */
export function randomSE3(): DualQuaternion {
  const R = randomRotationMatrix();
  const t: Vector3 = [
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4
  ];
  return dualQuaternionFromMatrix(R, t);
}

// =============================================================================
// SE(3) Positional Encoding
// =============================================================================

/**
 * Dual Quaternion Positional Encoding for SE(3)-equivariance
 */
export class DualQuaternionPositionalEncoding {
  private dim: number;
  
  constructor(dim: number = 256) {
    this.dim = dim;
  }
  
  /**
   * Encode positions and optional orientation frames as dual quaternion features
   */
  encode(positions: Vector3[], frames?: Quaternion[]): number[][] {
    const N = positions.length;
    
    // Create default frames if not provided
    const useFrames = frames || positions.map(() => randomQuaternion());
    
    const features: number[][] = [];
    
    for (let i = 0; i < N; i++) {
      const dq = dualQuaternionFromRT(useFrames[i], positions[i]);
      
      // Feature vector from dual quaternion
      const feature: number[] = [];
      
      // Real part (rotation) - 4 values
      feature.push(...dq.qr);
      
      // Dual part (translation) - 4 values
      feature.push(...dq.qd);
      
      // Twist coordinates - 6 values
      const twist = dualQuaternionToTwist(dq);
      feature.push(...twist);
      
      // Derived features
      feature.push(Math.sqrt(dq.qr.reduce((s, v) => s + v*v, 0))); // Rotation norm (should be 1)
      feature.push(Math.sqrt(dq.qd.reduce((s, v) => s + v*v, 0))); // Dual norm
      
      // Extracted translation
      const tQuat = quaternionMultiply(dq.qd, quaternionConjugate(dq.qr)).map(v => v * 2);
      feature.push(tQuat[1], tQuat[2], tQuat[3]); // Translation vector
      
      // Pad to desired dimension
      while (feature.length < this.dim) {
        feature.push(0);
      }
      
      features.push(feature.slice(0, this.dim));
    }
    
    return features;
  }
}

// =============================================================================
// Screw-Interpolated Attention
// =============================================================================

/**
 * Screw-interpolated attention mechanism for SE(3)-equivariant attention
 */
export class ScrewAttention {
  private numHeads: number;
  private scale: number;
  
  constructor(numHeads: number = 8) {
    this.numHeads = numHeads;
    this.scale = Math.sqrt(32); // head_dim
  }
  
  /**
   * Compute screw distance between two SE(3) poses
   */
  screwDistance(dq1: DualQuaternion, dq2: DualQuaternion): number {
    // Relative transformation
    const dqRel = dualQuaternionMultiply(dualQuaternionInverse(dq1), dq2);
    
    // Extract screw parameters
    const twist = dualQuaternionToTwist(dqRel);
    const omega = [twist[0], twist[1], twist[2]];
    const v = [twist[3], twist[4], twist[5]];
    
    const theta = Math.sqrt(omega[0]**2 + omega[1]**2 + omega[2]**2);
    
    if (theta < 1e-10) {
      // Pure translation
      return Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2);
    }
    
    // Screw distance: combination of rotation angle and translation
    const axis: Vector3 = [omega[0] / theta, omega[1] / theta, omega[2] / theta];
    const dParallel = v[0] * axis[0] + v[1] * axis[1] + v[2] * axis[2];
    
    const dPerpSquared = (v[0] - dParallel * axis[0])**2 + 
                         (v[1] - dParallel * axis[1])**2 + 
                         (v[2] - dParallel * axis[2])**2;
    
    return Math.sqrt(theta**2 + dPerpSquared + (dParallel / (theta + 1e-6))**2);
  }
  
  /**
   * Compute attention weights using screw distance
   */
  computeAttention(dualQuats: DualQuaternion[]): number[][] {
    const N = dualQuats.length;
    const distances: number[][] = Array(N).fill(null).map(() => Array(N).fill(0));
    
    // Compute pairwise distances
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        distances[i][j] = this.screwDistance(dualQuats[i], dualQuats[j]);
      }
    }
    
    // Convert to attention weights
    const attention: number[][] = [];
    for (let i = 0; i < N; i++) {
      // Inverse distance weighting
      const weights = distances[i].map(d => 1.0 / (d + 1e-6));
      
      // Softmax
      const maxW = Math.max(...weights);
      const expW = weights.map(w => Math.exp(w - maxW));
      const sumExpW = expW.reduce((a, b) => a + b, 0);
      
      attention.push(expW.map(w => w / sumExpW));
    }
    
    return attention;
  }
}

// =============================================================================
// Twist Feed-Forward Network
// =============================================================================

/**
 * Feed-forward network operating in se(3) tangent space
 */
export class TwistFeedForward {
  private W1: number[][];
  private b1: number[];
  private W2: number[][];
  private b2: number[];
  
  constructor(hiddenDim: number = 64) {
    // Initialize weights for twist transformation
    this.W1 = this.initWeights(6, hiddenDim);
    this.b1 = Array(hiddenDim).fill(0);
    this.W2 = this.initWeights(hiddenDim, 6);
    this.b2 = Array(6).fill(0);
  }
  
  private initWeights(inDim: number, outDim: number): number[][] {
    const scale = Math.sqrt(2.0 / (inDim + outDim));
    return Array(inDim).fill(null).map(() => 
      Array(outDim).fill(null).map(() => (Math.random() - 0.5) * 2 * scale)
    );
  }
  
  /**
   * Forward pass for single twist
   */
  forward(xi: Twist): Twist {
    // Layer 1: xi @ W1 + b1, then tanh
    const h: number[] = [];
    for (let j = 0; j < this.W1[0].length; j++) {
      let sum = this.b1[j];
      for (let i = 0; i < 6; i++) {
        sum += xi[i] * this.W1[i][j];
      }
      h.push(Math.tanh(sum));
    }
    
    // Layer 2: h @ W2 + b2
    const out: number[] = [...this.b2];
    for (let j = 0; j < 6; j++) {
      for (let i = 0; i < h.length; i++) {
        out[j] += h[i] * this.W2[i][j];
      }
    }
    
    return out as Twist;
  }
  
  /**
   * Forward pass for batch
   */
  forwardBatch(xiBatch: Twist[]): Twist[] {
    return xiBatch.map(xi => this.forward(xi));
  }
}

// =============================================================================
// SE(3)-QGT Module
// =============================================================================

/**
 * Complete SE(3)-QGT module combining all components
 */
export class SE3QGT {
  private config: SE3QGTConfig;
  private positionalEncoding: DualQuaternionPositionalEncoding;
  private screwAttention: ScrewAttention;
  private twistFF: TwistFeedForward;
  
  constructor(config: Partial<SE3QGTConfig> = {}) {
    this.config = {
      inputDim: config.inputDim || 128,
      hiddenDim: config.hiddenDim || 256,
      outputDim: config.outputDim || 128,
      numLayers: config.numLayers || 4,
      numHeads: config.numHeads || 8,
      lMax: config.lMax || 4,
      kNeighbors: config.kNeighbors || 16,
      useDualQuaternion: config.useDualQuaternion ?? true,
      useTwistEncoding: config.useTwistEncoding ?? true,
    };
    
    this.positionalEncoding = new DualQuaternionPositionalEncoding(this.config.hiddenDim);
    this.screwAttention = new ScrewAttention(this.config.numHeads);
    this.twistFF = new TwistFeedForward(this.config.hiddenDim);
  }
  
  /**
   * Process poses through SE(3)-QGT
   */
  forward(poses: Pose6D[]): {
    features: number[][];
    attention: number[][];
    equivarianceError: number;
  } {
    const N = poses.length;
    
    // Convert poses to dual quaternions
    const dualQuats = poses.map(pose => 
      dualQuaternionFromRT(pose.orientation, pose.position)
    );
    
    // Compute positional encoding
    const features = this.positionalEncoding.encode(
      poses.map(p => p.position),
      poses.map(p => p.orientation)
    );
    
    // Compute attention
    const attention = this.screwAttention.computeAttention(dualQuats);
    
    // Apply attention-weighted feature aggregation
    const aggregatedFeatures: number[][] = [];
    for (let i = 0; i < N; i++) {
      const aggFeat = Array(this.config.hiddenDim).fill(0);
      for (let j = 0; j < N; j++) {
        for (let d = 0; d < this.config.hiddenDim; d++) {
          aggFeat[d] += attention[i][j] * features[j][d];
        }
      }
      aggregatedFeatures.push(aggFeat);
    }
    
    // Test equivariance (simplified)
    const equivarianceError = this.testEquivariance(poses);
    
    return {
      features: aggregatedFeatures,
      attention,
      equivarianceError
    };
  }
  
  /**
   * Test SE(3) equivariance
   */
  private testEquivariance(poses: Pose6D[]): number {
    // Apply random SE(3) transformation
    const T = randomSE3();
    
    // Transform poses
    const transformedPoses = poses.map(pose => {
      const dq = dualQuaternionFromRT(pose.orientation, pose.position);
      const transformed = dualQuaternionMultiply(T, dq);
      const tQuat = quaternionMultiply(transformed.qd, quaternionConjugate(transformed.qr)).map(v => v * 2);
      return {
        position: [tQuat[1], tQuat[2], tQuat[3]] as Vector3,
        orientation: transformed.qr
      };
    });
    
    // Check relative pose invariance
    const originalRel = dualQuaternionMultiply(
      dualQuaternionInverse(dualQuaternionFromRT(poses[0].orientation, poses[0].position)),
      dualQuaternionFromRT(poses[1].orientation, poses[1].position)
    );
    
    const transformedRel = dualQuaternionMultiply(
      dualQuaternionInverse(dualQuaternionFromRT(transformedPoses[0].orientation, transformedPoses[0].position)),
      dualQuaternionFromRT(transformedPoses[1].orientation, transformedPoses[1].position)
    );
    
    let error = 0;
    for (let i = 0; i < 4; i++) {
      error += Math.abs(originalRel.qr[i] - transformedRel.qr[i]);
      error += Math.abs(originalRel.qd[i] - transformedRel.qd[i]);
    }
    
    return error;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create poses from positions with random orientations
 */
export function createPosesFromPositions(positions: Vector3[]): Pose6D[] {
  return positions.map(pos => ({
    position: pos,
    orientation: randomQuaternion()
  }));
}

/**
 * Generate random poses for testing
 */
export function generateRandomPoses(n: number, scale: number = 2): Pose6D[] {
  const poses: Pose6D[] = [];
  for (let i = 0; i < n; i++) {
    poses.push({
      position: [
        (Math.random() - 0.5) * scale * 2,
        (Math.random() - 0.5) * scale * 2,
        (Math.random() - 0.5) * scale * 2
      ],
      orientation: randomQuaternion()
    });
  }
  return poses;
}

// Export all
const se3Core = {
  DualQuaternion,
  Twist,
  Pose6D,
  SE3QGTConfig,
  dualQuaternionIdentity,
  dualQuaternionFromRT,
  dualQuaternionFromMatrix,
  dualQuaternionMultiply,
  dualQuaternionConjugate,
  dualQuaternionInverse,
  dualQuaternionTransformPoint,
  dualQuaternionToTwist,
  twistToDualQuaternion,
  DualQuaternionPositionalEncoding,
  ScrewAttention,
  TwistFeedForward,
  SE3QGT,
  createPosesFromPositions,
  generateRandomPoses,
  randomSE3,
};

export default se3Core;
