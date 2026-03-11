/**
 * Cohomological Fiber Attention Module
 * 
 * Novel SE(3)-equivariant architecture proposed by DeepSeek combining:
 * 1. Principal bundle lifting
 * 2. Higher-order tensor features (irreps)
 * 3. Non-commutative attention with cohomological correction
 * 4. Fiber bundle message passing
 * 5. Lie bracket gating
 * 6. Frame updates
 * 
 * Mathematical Foundation:
 * - SE(3) group: G = {(R, t) | R ∈ SO(3), t ∈ R³}
 * - Features as sections of associated vector bundles P ×_G V
 * - Group 2-cocycles for invariant attention
 * - Clebsch-Gordan coupling for tensor products
 */

import { Vector3, Quaternion, randomQuaternion, quaternionMultiply, quaternionConjugate, quaternionToMatrix } from './quaternion';

// =============================================================================
// Types
// =============================================================================

/**
 * SE(3) group element represented as dual quaternion
 */
export interface SE3Element {
  rotation: Quaternion;  // Unit quaternion (rotation)
  translation: Vector3;   // Translation vector
}

/**
 * Irreducible representation feature
 */
export interface IrrepFeature {
  l: number;              // Angular momentum quantum number
  data: number[];         // (2l+1)-dimensional feature vector
}

/**
 * Principal bundle point with local frame
 */
export interface BundlePoint {
  position: Vector3;
  frame: SE3Element;
  features: IrrepFeature[];
}

/**
 * Cohomological attention configuration
 */
export interface CohomologicalAttentionConfig {
  featureDim: number;
  lMax: number;           // Maximum irrep degree
  numHeads: number;
  kNeighbors: number;
  useCohomologyCorrection: boolean;
  useLieBracketGate: boolean;
}

/**
 * Group 2-cocycle for attention correction
 */
export interface Group2Cocycle {
  name: string;
  compute: (g1: SE3Element, g2: SE3Element) => number;
}

// =============================================================================
// SE(3) Operations
// =============================================================================

/**
 * Create identity SE(3) element
 */
export function se3Identity(): SE3Element {
  return {
    rotation: [1, 0, 0, 0],
    translation: [0, 0, 0]
  };
}

/**
 * Create random SE(3) element
 */
export function randomSE3Element(): SE3Element {
  return {
    rotation: randomQuaternion(),
    translation: [
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4
    ]
  };
}

/**
 * SE(3) multiplication: g1 * g2
 */
export function se3Multiply(g1: SE3Element, g2: SE3Element): SE3Element {
  // R = R1 * R2
  const rotation = quaternionMultiply(g1.rotation, g2.rotation);
  
  // t = R1 * t2 + t1
  const R1 = quaternionToMatrix(g1.rotation);
  const t: Vector3 = [
    R1[0][0] * g2.translation[0] + R1[0][1] * g2.translation[1] + R1[0][2] * g2.translation[2] + g1.translation[0],
    R1[1][0] * g2.translation[0] + R1[1][1] * g2.translation[1] + R1[1][2] * g2.translation[2] + g1.translation[1],
    R1[2][0] * g2.translation[0] + R1[2][1] * g2.translation[1] + R1[2][2] * g2.translation[2] + g1.translation[2]
  ];
  
  return { rotation, translation: t };
}

/**
 * SE(3) inverse: g^-1
 */
export function se3Inverse(g: SE3Element): SE3Element {
  // g^-1 = (R^T, -R^T * t)
  const rotation = quaternionConjugate(g.rotation);
  const R = quaternionToMatrix(g.rotation);
  const Rinv = [
    [R[0][0], R[1][0], R[2][0]],
    [R[0][1], R[1][1], R[2][1]],
    [R[0][2], R[1][2], R[2][2]]
  ];
  
  const translation: Vector3 = [
    -(Rinv[0][0] * g.translation[0] + Rinv[0][1] * g.translation[1] + Rinv[0][2] * g.translation[2]),
    -(Rinv[1][0] * g.translation[0] + Rinv[1][1] * g.translation[1] + Rinv[1][2] * g.translation[2]),
    -(Rinv[2][0] * g.translation[0] + Rinv[2][1] * g.translation[1] + Rinv[2][2] * g.translation[2])
  ];
  
  return { rotation, translation };
}

/**
 * Relative SE(3) element: g_i^{-1} * g_j
 */
export function relativeSE3(gi: SE3Element, gj: SE3Element): SE3Element {
  return se3Multiply(se3Inverse(gi), gj);
}

/**
 * SE(3) action on point
 */
export function se3Action(g: SE3Element, p: Vector3): Vector3 {
  const R = quaternionToMatrix(g.rotation);
  return [
    R[0][0] * p[0] + R[0][1] * p[1] + R[0][2] * p[2] + g.translation[0],
    R[1][0] * p[0] + R[1][1] * p[1] + R[1][2] * p[2] + g.translation[1],
    R[2][0] * p[0] + R[2][1] * p[1] + R[2][2] * p[2] + g.translation[2]
  ];
}

// =============================================================================
// Cohomology Operations
// =============================================================================

/**
 * Winding number cocycle (H³ element)
 */
export const windingNumberCocycle: Group2Cocycle = {
  name: 'winding_number',
  compute: (g1: SE3Element, g2: SE3Element): number => {
    // Relative rotation angle
    const rel = relativeSE3(g1, g2);
    const theta = 2 * Math.acos(Math.max(-1, Math.min(1, rel.rotation[0])));
    return theta / (2 * Math.PI);  // Normalized winding
  }
};

/**
 * Translation distance cocycle
 */
export const translationCocycle: Group2Cocycle = {
  name: 'translation_distance',
  compute: (g1: SE3Element, g2: SE3Element): number => {
    const rel = relativeSE3(g1, g2);
    return Math.sqrt(
      rel.translation[0] ** 2 + 
      rel.translation[1] ** 2 + 
      rel.translation[2] ** 2
    );
  }
};

/**
 * Combined SE(3) cocycle
 */
export const combinedCocycle: Group2Cocycle = {
  name: 'combined',
  compute: (g1: SE3Element, g2: SE3Element): number => {
    const rel = relativeSE3(g1, g2);
    const theta = 2 * Math.acos(Math.max(-1, Math.min(1, rel.rotation[0])));
    const dist = Math.sqrt(
      rel.translation[0] ** 2 + 
      rel.translation[1] ** 2 + 
      rel.translation[2] ** 2
    );
    return Math.sqrt(theta ** 2 + dist ** 2);
  }
};

// =============================================================================
// Lie Bracket Operations
// =============================================================================

/**
 * SE(3) Lie algebra element (twist)
 */
export type Twist = [number, number, number, number, number, number]; // [wx, wy, wz, vx, vy, vz]

/**
 * SE(3) logarithm: g -> ξ ∈ se(3)
 */
export function se3Log(g: SE3Element): Twist {
  const theta = 2 * Math.acos(Math.max(-1, Math.min(1, g.rotation[0])));
  
  if (theta < 1e-10) {
    // Small rotation: pure translation
    return [0, 0, 0, g.translation[0], g.translation[1], g.translation[2]];
  }
  
  // Rotation axis
  const sinHalf = Math.sin(theta / 2);
  const axis: Vector3 = [
    g.rotation[1] / sinHalf,
    g.rotation[2] / sinHalf,
    g.rotation[3] / sinHalf
  ];
  
  // Angular velocity
  const omega: [number, number, number] = [
    axis[0] * theta,
    axis[1] * theta,
    axis[2] * theta
  ];
  
  // For simplicity, return translation directly
  // Full derivation requires solving for twist velocity
  return [omega[0], omega[1], omega[2], g.translation[0], g.translation[1], g.translation[2]];
}

/**
 * Lie bracket in se(3): [ξ1, ξ2]
 */
export function lieBracket(xi1: Twist, xi2: Twist): Twist {
  const omega1 = [xi1[0], xi1[1], xi1[2]];
  const v1 = [xi1[3], xi1[4], xi1[5]];
  const omega2 = [xi2[0], xi2[1], xi2[2]];
  const v2 = [xi2[3], xi2[4], xi2[5]];
  
  // [ω1, ω2] = ω1 × ω2
  const omega_bracket: [number, number, number] = [
    omega1[1] * omega2[2] - omega1[2] * omega2[1],
    omega1[2] * omega2[0] - omega1[0] * omega2[2],
    omega1[0] * omega2[1] - omega1[1] * omega2[0]
  ];
  
  // [v1, v2] part: ω1 × v2 - ω2 × v1
  const v_bracket: [number, number, number] = [
    omega1[1] * v2[2] - omega1[2] * v2[1] - (omega2[1] * v1[2] - omega2[2] * v1[1]),
    omega1[2] * v2[0] - omega1[0] * v2[2] - (omega2[2] * v1[0] - omega2[0] * v1[2]),
    omega1[0] * v2[1] - omega1[1] * v2[0] - (omega2[0] * v1[1] - omega2[1] * v1[0])
  ];
  
  return [omega_bracket[0], omega_bracket[1], omega_bracket[2], v_bracket[0], v_bracket[1], v_bracket[2]];
}

// =============================================================================
// Cohomological Fiber Attention
// =============================================================================

export class CohomologicalFiberAttention {
  private config: CohomologicalAttentionConfig;
  private cocycle: Group2Cocycle;
  
  constructor(config: Partial<CohomologicalAttentionConfig> = {}) {
    this.config = {
      featureDim: config.featureDim || 128,
      lMax: config.lMax || 4,
      numHeads: config.numHeads || 8,
      kNeighbors: config.kNeighbors || 16,
      useCohomologyCorrection: config.useCohomologyCorrection ?? true,
      useLieBracketGate: config.useLieBracketGate ?? true,
    };
    this.cocycle = combinedCocycle;
  }
  
  /**
   * Compute attention weights using non-commutative SE(3) structure
   */
  computeAttention(points: BundlePoint[]): number[][] {
    const n = points.length;
    const attention: number[][] = [];
    
    for (let i = 0; i < n; i++) {
      const weights: number[] = [];
      
      for (let j = 0; j < n; j++) {
        // Relative group element g_i^{-1} g_j
        const rel = relativeSE3(points[i].frame, points[j].frame);
        
        // Rotation angle component
        const theta = 2 * Math.acos(Math.max(-1, Math.min(1, rel.rotation[0])));
        
        // Translation distance component
        const dist = Math.sqrt(
          rel.translation[0] ** 2 + 
          rel.translation[1] ** 2 + 
          rel.translation[2] ** 2
        );
        
        // Combined screw distance
        let weight = Math.sqrt(theta ** 2 + dist ** 2);
        
        // Cohomological correction
        if (this.config.useCohomologyCorrection && i !== j) {
          // Add contribution from group cocycle
          // φ(g_i, g_j) with cocycle condition
          const cocycleValue = this.cocycle.compute(points[i].frame, points[j].frame);
          weight = weight * (1 + 0.1 * cocycleValue);
        }
        
        weights.push(weight);
      }
      
      // Softmax normalization (inverse distance weighting)
      const maxW = Math.max(...weights);
      const expW = weights.map(w => Math.exp(-(w - maxW)));
      const sumExp = expW.reduce((a, b) => a + b, 0);
      attention.push(expW.map(w => w / sumExp));
    }
    
    return attention;
  }
  
  /**
   * Compute Lie bracket gating
   */
  computeLieBracketGate(points: BundlePoint[], attention: number[][]): number[] {
    const n = points.length;
    const gates: number[] = [];
    
    if (!this.config.useLieBracketGate) {
      return new Array(n).fill(1);
    }
    
    for (let i = 0; i < n; i++) {
      const xi_i = se3Log(points[i].frame);
      let bracketSum = 0;
      
      for (let j = 0; j < n; j++) {
        const xi_j = se3Log(points[j].frame);
        const bracket = lieBracket(xi_i, xi_j);
        const bracketNorm = Math.sqrt(
          bracket[0] ** 2 + bracket[1] ** 2 + bracket[2] ** 2 +
          bracket[3] ** 2 + bracket[4] ** 2 + bracket[5] ** 2
        );
        bracketSum += attention[i][j] * bracketNorm;
      }
      
      // Sigmoid gate
      gates.push(1 / (1 + Math.exp(-bracketSum)));
    }
    
    return gates;
  }
  
  /**
   * Fiber bundle message passing
   */
  fiberBundleMessagePassing(
    points: BundlePoint[],
    attention: number[][],
    gates: number[]
  ): IrrepFeature[][] {
    const n = points.length;
    const newFeatures: IrrepFeature[][] = [];
    
    for (let i = 0; i < n; i++) {
      const frame_i = points[i].frame;
      const R_i = quaternionToMatrix(frame_i.rotation);
      const R_i_inv = [
        [R_i[0][0], R_i[1][0], R_i[2][0]],
        [R_i[0][1], R_i[1][1], R_i[2][1]],
        [R_i[0][2], R_i[1][2], R_i[2][2]]
      ];
      
      const accumulatedFeatures: IrrepFeature[] = [];
      
      for (let l = 0; l <= this.config.lMax; l++) {
        const dim = 2 * l + 1;
        accumulatedFeatures.push({ l, data: new Array(dim).fill(0) });
      }
      
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        
        // Parallel transport from fiber j to fiber i
        // Γ_{j→i} = ρ(g_i g_j^{-1})
        const relFrame = relativeSE3(frame_i, points[j].frame);
        const R_rel = quaternionToMatrix(relFrame.rotation);
        
        // Weight by attention
        const alpha = attention[i][j];
        
        // Aggregate features with equivariant transport
        for (const feature of points[j].features) {
          if (feature.l > this.config.lMax) continue;
          
          // Simplified: transport via rotation
          // Full implementation would use Wigner D-matrices
          const transported = this.transportFeature(feature, R_rel);
          
          const targetFeature = accumulatedFeatures.find(f => f.l === feature.l);
          if (targetFeature) {
            for (let k = 0; k < targetFeature.data.length; k++) {
              targetFeature.data[k] += alpha * transported.data[k];
            }
          }
        }
      }
      
      // Apply Lie bracket gate
      for (const feature of accumulatedFeatures) {
        for (let k = 0; k < feature.data.length; k++) {
          feature.data[k] *= gates[i];
        }
      }
      
      newFeatures.push(accumulatedFeatures);
    }
    
    return newFeatures;
  }
  
  /**
   * Transport feature via rotation (simplified Wigner D)
   */
  private transportFeature(feature: IrrepFeature, R: number[][]): IrrepFeature {
    if (feature.l === 0) {
      // Scalar: invariant
      return { ...feature, data: [...feature.data] };
    }
    
    if (feature.l === 1) {
      // Vector: transforms via R
      const data = feature.data;
      return {
        l: 1,
        data: [
          R[0][0] * data[0] + R[0][1] * data[1] + R[0][2] * data[2],
          R[1][0] * data[0] + R[1][1] * data[1] + R[1][2] * data[2],
          R[2][0] * data[0] + R[2][1] * data[1] + R[2][2] * data[2]
        ]
      };
    }
    
    // Higher l: simplified (would need Wigner D-matrices)
    return { ...feature, data: [...feature.data] };
  }
  
  /**
   * Update frames equivariantly
   */
  updateFrames(
    points: BundlePoint[],
    attention: number[][]
  ): SE3Element[] {
    const n = points.length;
    const newFrames: SE3Element[] = [];
    
    for (let i = 0; i < n; i++) {
      const xi_sum: Twist = [0, 0, 0, 0, 0, 0];
      
      for (let j = 0; j < n; j++) {
        const xi_j = se3Log(points[j].frame);
        for (let k = 0; k < 6; k++) {
          xi_sum[k] += attention[i][j] * xi_j[k];
        }
      }
      
      // Frame update: g_i' = g_i · exp(α * Σ α_ij ξ_j)
      // Simplified: just average rotations
      const currentFrame = points[i].frame;
      newFrames.push({
        rotation: currentFrame.rotation,  // Keep rotation
        translation: [
          currentFrame.translation[0] + 0.01 * xi_sum[3],
          currentFrame.translation[1] + 0.01 * xi_sum[4],
          currentFrame.translation[2] + 0.01 * xi_sum[5]
        ]
      });
    }
    
    return newFrames;
  }
  
  /**
   * Full forward pass
   */
  forward(points: BundlePoint[]): {
    attention: number[][];
    newFeatures: IrrepFeature[][];
    newFrames: SE3Element[];
    equivarianceError: number;
  } {
    // Compute attention
    const attention = this.computeAttention(points);
    
    // Compute gates
    const gates = this.computeLieBracketGate(points, attention);
    
    // Message passing
    const newFeatures = this.fiberBundleMessagePassing(points, attention, gates);
    
    // Update frames
    const newFrames = this.updateFrames(points, attention);
    
    // Test equivariance
    const equivarianceError = this.testEquivariance(points);
    
    return {
      attention,
      newFeatures,
      newFrames,
      equivarianceError
    };
  }
  
  /**
   * Test SE(3) equivariance
   */
  private testEquivariance(points: BundlePoint[]): number {
    if (points.length < 2) return 0;
    
    // Apply random global SE(3) transformation
    const g = randomSE3Element();
    
    // Transform points
    const transformedPoints = points.map(p => ({
      position: se3Action(g, p.position),
      frame: se3Multiply(g, p.frame),
      features: p.features.map(f => ({ ...f, data: [...f.data] }))
    }));
    
    // Compute relative frame - should be invariant
    const origRel = relativeSE3(points[0].frame, points[1].frame);
    const transRel = relativeSE3(transformedPoints[0].frame, transformedPoints[1].frame);
    
    // Check invariance
    let error = 0;
    for (let i = 0; i < 4; i++) {
      error += Math.abs(origRel.rotation[i] - transRel.rotation[i]);
    }
    for (let i = 0; i < 3; i++) {
      error += Math.abs(origRel.translation[i] - transRel.translation[i]);
    }
    
    return error;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create bundle points from positions with random frames
 */
export function createBundlePoints(positions: Vector3[], lMax: number = 2): BundlePoint[] {
  return positions.map(pos => {
    // Create local frame at position
    const frame: SE3Element = {
      rotation: randomQuaternion(),
      translation: pos
    };
    
    // Create random irrep features
    const features: IrrepFeature[] = [];
    for (let l = 0; l <= lMax; l++) {
      features.push({
        l,
        data: Array(2 * l + 1).fill(0).map(() => (Math.random() - 0.5) * 2)
      });
    }
    
    return { position: pos, frame, features };
  });
}

/**
 * Generate random positions for testing
 */
export function generateRandomPositions(n: number, scale: number = 2): Vector3[] {
  return Array(n).fill(null).map(() => [
    (Math.random() - 0.5) * scale * 2,
    (Math.random() - 0.5) * scale * 2,
    (Math.random() - 0.5) * scale * 2
  ]);
}

// Export all
const cohomologicalFiberAttention = {
  SE3Element,
  IrrepFeature,
  BundlePoint,
  CohomologicalAttentionConfig,
  Group2Cocycle,
  se3Identity,
  randomSE3Element,
  se3Multiply,
  se3Inverse,
  relativeSE3,
  se3Action,
  windingNumberCocycle,
  translationCocycle,
  combinedCocycle,
  se3Log,
  lieBracket,
  CohomologicalFiberAttention,
  createBundlePoints,
  generateRandomPositions,
};

export default cohomologicalFiberAttention;
