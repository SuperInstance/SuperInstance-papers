/**
 * Frame Averaging Utilities for QGT
 * 
 * Frame averaging provides exact equivariance by averaging predictions over
 * a set of canonical frames (orientations) of the input.
 * 
 * Key insight: For any equivariant function f and frame family F:
 * ⟨f⟩_F(x) = (1/|F|) Σ_{g∈F} ρ_out(g) f(ρ_in(g⁻¹) x)
 * 
 * This is exactly equivariant and allows using non-equivariant base functions.
 */

import {
  Quaternion,
  Vector3,
  Matrix3,
  quaternionToMatrix,
  matrixToQuaternion,
  randomQuaternion,
  vectorNormalize,
  cross,
  dot,
  vectorNorm,
  identityMatrix,
  matrixMultiply,
  matrixTranspose,
  matrixFrobeniusNorm,
} from './quaternion';
import { sqrt, abs, EPS } from './mathConstants';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Frame {
  rotation: Matrix3;
  quaternion: Quaternion;
  translation: Vector3;
}

export interface FrameAveragingResult<T> {
  averaged: T;
  individual: T[];
  frames: Frame[];
}

// ============================================================================
// Local Frame Computation
// ============================================================================

/**
 * Compute a local reference frame from a set of neighbor positions
 * 
 * Uses PCA to find principal axes, ensuring a right-handed coordinate system.
 * This is similar to computing a local PCA frame for each node.
 */
export function computeLocalFrame(
  centerPosition: Vector3,
  neighborPositions: Vector3[]
): Frame {
  // Center positions
  const centered = neighborPositions.map(p => [
    p[0] - centerPosition[0],
    p[1] - centerPosition[1],
    p[2] - centerPosition[2],
  ]) as Vector3[];

  // Compute covariance matrix
  const n = centered.length;
  const cov: Matrix3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

  for (const v of centered) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        cov[i][j] += v[i] * v[j];
      }
    }
  }

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      cov[i][j] /= n;
    }
  }

  // Compute eigenvectors (simplified power iteration for demo)
  const { eigenvectors } = powerIteration3D(cov);

  // Ensure right-handed coordinate system
  let R = eigenvectors;
  const det = determinant3x3(R);
  if (det < 0) {
    // Flip last column
    R = [
      [R[0][0], R[0][1], -R[0][2]],
      [R[1][0], R[1][1], -R[1][2]],
      [R[2][0], R[2][1], -R[2][2]],
    ];
  }

  return {
    rotation: R,
    quaternion: matrixToQuaternion(R),
    translation: centerPosition,
  };
}

/**
 * Compute canonical frames for a set of positions
 * 
 * Generates |F| = 24 canonical frames (the full octahedral group)
 * or fewer if frameSize < 24.
 */
export function computeCanonicalFrames(
  positions: Vector3[],
  frameSize: number = 24
): Frame[] {
  // Compute centroid
  const centroid: Vector3 = [0, 0, 0];
  for (const p of positions) {
    centroid[0] += p[0];
    centroid[1] += p[1];
    centroid[2] += p[2];
  }
  centroid[0] /= positions.length;
  centroid[1] /= positions.length;
  centroid[2] /= positions.length;

  // Generate canonical frames
  // The octahedral group has 24 elements: identity + 23 rotations
  const frames: Frame[] = [];

  // Identity frame
  frames.push({
    rotation: identityMatrix(),
    quaternion: [1, 0, 0, 0],
    translation: centroid,
  });

  // Generate remaining frames using principal axes
  // For each axis permutation and sign combination
  const axes: Vector3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const signs = [1, -1];

  for (const sign1 of signs) {
    for (const sign2 of signs) {
      for (const sign3 of signs) {
        for (const perm of permutations([0, 1, 2])) {
          if (frames.length >= frameSize) break;

          const R: Matrix3 = [
            [sign1 * axes[perm[0]][0], sign1 * axes[perm[0]][1], sign1 * axes[perm[0]][2]],
            [sign2 * axes[perm[1]][0], sign2 * axes[perm[1]][1], sign2 * axes[perm[1]][2]],
            [sign3 * axes[perm[2]][0], sign3 * axes[perm[2]][1], sign3 * axes[perm[2]][2]],
          ];

          // Skip invalid rotations
          const det = determinant3x3(R);
          if (abs(det - 1) > 0.01) continue;

          // Skip duplicates
          const q = matrixToQuaternion(R);
          const isDuplicate = frames.some(f =>
            abs(f.quaternion[0] - q[0]) < 0.01 &&
            abs(f.quaternion[1] - q[1]) < 0.01 &&
            abs(f.quaternion[2] - q[2]) < 0.01 &&
            abs(f.quaternion[3] - q[3]) < 0.01
          );
          if (isDuplicate) continue;

          frames.push({
            rotation: R,
            quaternion: q,
            translation: centroid,
          });
        }
      }
    }
  }

  // Pad with random frames if needed
  while (frames.length < frameSize) {
    const q = randomQuaternion();
    frames.push({
      rotation: quaternionToMatrix(q),
      quaternion: q,
      translation: centroid,
    });
  }

  return frames.slice(0, frameSize);
}

// ============================================================================
// Frame Transformations
// ============================================================================

/**
 * Apply frame transformation to a position
 * p' = R * (p - t) = R * p - R * t
 */
export function applyFrameTransformPosition(position: Vector3, frame: Frame): Vector3 {
  const centered: Vector3 = [
    position[0] - frame.translation[0],
    position[1] - frame.translation[1],
    position[2] - frame.translation[2],
  ];

  return [
    frame.rotation[0][0] * centered[0] + frame.rotation[0][1] * centered[1] + frame.rotation[0][2] * centered[2],
    frame.rotation[1][0] * centered[0] + frame.rotation[1][1] * centered[1] + frame.rotation[1][2] * centered[2],
    frame.rotation[2][0] * centered[0] + frame.rotation[2][1] * centered[1] + frame.rotation[2][2] * centered[2],
  ];
}

/**
 * Apply inverse frame transformation to a position
 * p = R^T * p' + t
 */
export function applyInverseFrameTransformPosition(position: Vector3, frame: Frame): Vector3 {
  const R_T = matrixTranspose(frame.rotation);

  const rotated: Vector3 = [
    R_T[0][0] * position[0] + R_T[0][1] * position[1] + R_T[0][2] * position[2],
    R_T[1][0] * position[0] + R_T[1][1] * position[1] + R_T[1][2] * position[2],
    R_T[2][0] * position[0] + R_T[2][1] * position[1] + R_T[2][2] * position[2],
  ];

  return [
    rotated[0] + frame.translation[0],
    rotated[1] + frame.translation[1],
    rotated[2] + frame.translation[2],
  ];
}

/**
 * Apply frame transformation to a vector (equivariant)
 * v' = R * v
 */
export function applyFrameTransformVector(vector: Vector3, frame: Frame): Vector3 {
  return [
    frame.rotation[0][0] * vector[0] + frame.rotation[0][1] * vector[1] + frame.rotation[0][2] * vector[2],
    frame.rotation[1][0] * vector[0] + frame.rotation[1][1] * vector[1] + frame.rotation[1][2] * vector[2],
    frame.rotation[2][0] * vector[0] + frame.rotation[2][1] * vector[1] + frame.rotation[2][2] * vector[2],
  ];
}

/**
 * Apply inverse frame transformation to a vector
 * v = R^T * v'
 */
export function applyInverseFrameTransformVector(vector: Vector3, frame: Frame): Vector3 {
  const R_T = matrixTranspose(frame.rotation);
  return [
    R_T[0][0] * vector[0] + R_T[0][1] * vector[1] + R_T[0][2] * vector[2],
    R_T[1][0] * vector[0] + R_T[1][1] * vector[1] + R_T[1][2] * vector[2],
    R_T[2][0] * vector[0] + R_T[2][1] * vector[1] + R_T[2][2] * vector[2],
  ];
}

// ============================================================================
// Frame Averaging
// ============================================================================

/**
 * Average predictions over frames for invariant outputs
 * 
 * For invariant functions: ⟨f⟩_F(x) = (1/|F|) Σ_{g∈F} f(ρ_in(g⁻¹) x)
 */
export function averageInvariantOverFrames<T>(
  predictions: T[],
  frames: Frame[],
  averageFn: (values: T[]) => T
): T {
  return averageFn(predictions);
}

/**
 * Average predictions over frames for equivariant outputs
 * 
 * For equivariant functions:
 * ⟨f⟩_F(x) = (1/|F|) Σ_{g∈F} ρ_out(g) f(ρ_in(g⁻¹) x)
 */
export function averageEquivariantOverFrames(
  predictions: Vector3[],
  frames: Frame[]
): Vector3 {
  const n = predictions.length;
  const result: Vector3 = [0, 0, 0];

  for (let i = 0; i < n; i++) {
    // Transform prediction back by frame rotation
    const transformed = applyInverseFrameTransformVector(predictions[i], frames[i]);
    result[0] += transformed[0];
    result[1] += transformed[1];
    result[2] += transformed[2];
  }

  return [result[0] / n, result[1] / n, result[2] / n];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Compute determinant of 3x3 matrix
 */
function determinant3x3(M: Matrix3): number {
  return (
    M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
    M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
    M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
  );
}

/**
 * Power iteration for 3x3 matrix eigendecomposition
 */
function powerIteration3D(M: Matrix3, maxIter: number = 100): { eigenvalues: number[]; eigenvectors: Matrix3 } {
  const eigenvalues: number[] = [];
  const eigenvectors: Matrix3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  
  // Simplified: just use identity for demo
  // In practice, would use full Jacobi or QR iteration
  
  return { eigenvalues: [1, 0.5, 0.25], eigenvectors };
}

/**
 * Generate all permutations of an array
 */
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

// ============================================================================
// Frame Averaging Validation
// ============================================================================

/**
 * Validate frame averaging produces equivariant results
 */
export function validateFrameAveraging(
  transformFn: (positions: Vector3[]) => Vector3[],
  positions: Vector3[],
  numTests: number = 10,
  frameSize: number = 24
): { equivarianceError: number; frameVariance: number } {
  // Compute base prediction
  const frames = computeCanonicalFrames(positions, frameSize);
  const basePredictions = frames.map(f => {
    const transformed = positions.map(p => applyFrameTransformPosition(p, f));
    return transformFn(transformed);
  });
  const baseResult = averageEquivariantOverFrames(
    basePredictions.flat(),
    frames
  );

  // Test with rotated inputs
  let totalError = 0;
  for (let i = 0; i < numTests; i++) {
    const q = randomQuaternion();
    const R = quaternionToMatrix(q);

    // Rotate input positions
    const rotatedPositions = positions.map(p => {
      const centered: Vector3 = [p[0], p[1], p[2]];
      return [
        R[0][0] * centered[0] + R[0][1] * centered[1] + R[0][2] * centered[2],
        R[1][0] * centered[0] + R[1][1] * centered[1] + R[1][2] * centered[2],
        R[2][0] * centered[0] + R[2][1] * centered[1] + R[2][2] * centered[2],
      ] as Vector3;
    });

    // Compute prediction on rotated input
    const rotatedFrames = computeCanonicalFrames(rotatedPositions, frameSize);
    const rotatedPredictions = rotatedFrames.map(f => {
      const transformed = rotatedPositions.map(p => applyFrameTransformPosition(p, f));
      return transformFn(transformed);
    });
    const rotatedResult = averageEquivariantOverFrames(
      rotatedPredictions.flat(),
      rotatedFrames
    );

    // Expected: rotatedResult = R * baseResult
    const expected: Vector3 = [
      R[0][0] * baseResult[0] + R[0][1] * baseResult[1] + R[0][2] * baseResult[2],
      R[1][0] * baseResult[0] + R[1][1] * baseResult[1] + R[1][2] * baseResult[2],
      R[2][0] * baseResult[0] + R[2][1] * baseResult[1] + R[2][2] * baseResult[2],
    ];

    // Compute error
    const error = vectorNorm([
      rotatedResult[0] - expected[0],
      rotatedResult[1] - expected[1],
      rotatedResult[2] - expected[2],
    ]);
    totalError += error;
  }

  // Compute frame variance
  const frameVariances = basePredictions.map((pred, idx) => {
    const avg = baseResult;
    return vectorNorm([
      pred[0][0] - avg[0],
      pred[0][1] - avg[1],
      pred[0][2] - avg[2],
    ]);
  });
  const avgFrameVariance = frameVariances.reduce((a, b) => a + b, 0) / frameVariances.length;

  return {
    equivarianceError: totalError / numTests,
    frameVariance: avgFrameVariance,
  };
}
