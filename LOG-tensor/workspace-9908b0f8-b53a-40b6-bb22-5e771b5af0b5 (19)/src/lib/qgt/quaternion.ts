/**
 * Quaternion Utilities for QGT (Quaternion Geometric Transformer)
 * 
 * Quaternions provide the best numerical stability for 3D rotation representation
 * with no gimbal lock issues and smooth interpolation via SLERP.
 * 
 * A quaternion q = w + xi + yj + zk is stored as [w, x, y, z]
 */

import { sqrt, acos, sin, cos, abs, PI } from './mathConstants';

// ============================================================================
// Type Definitions
// ============================================================================

export type Quaternion = [number, number, number, number]; // [w, x, y, z]
export type Vector3 = [number, number, number];
export type Matrix3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

// ============================================================================
// Core Quaternion Operations
// ============================================================================

/**
 * Multiply two quaternions: q1 * q2
 * 
 * Quaternion multiplication follows:
 * (w1 + x1*i + y1*j + z1*k) * (w2 + x2*i + y2*j + z2*k)
 * 
 * Where: i² = j² = k² = ijk = -1
 */
export function quaternionMultiply(q1: Quaternion, q2: Quaternion): Quaternion {
  const [w1, x1, y1, z1] = q1;
  const [w2, x2, y2, z2] = q2;

  return [
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2, // w
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2, // x
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2, // y
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2, // z
  ];
}

/**
 * Compute quaternion conjugate: q*
 * For unit quaternions, this gives the inverse rotation.
 */
export function quaternionConjugate(q: Quaternion): Quaternion {
  return [q[0], -q[1], -q[2], -q[3]];
}

/**
 * Compute quaternion norm: ||q||
 */
export function quaternionNorm(q: Quaternion): number {
  return sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
}

/**
 * Normalize quaternion to unit length
 */
export function quaternionNormalize(q: Quaternion): Quaternion {
  const norm = quaternionNorm(q);
  if (norm < 1e-10) {
    return [1, 0, 0, 0]; // Identity quaternion for zero input
  }
  return [q[0] / norm, q[1] / norm, q[2] / norm, q[3] / norm];
}

/**
 * Convert quaternion to 3x3 rotation matrix
 * 
 * Uses the standard formula:
 * R = [[1-2(y²+z²), 2(xy-wz), 2(xz+wy)],
 *      [2(xy+wz), 1-2(x²+z²), 2(yz-wx)],
 *      [2(xz-wy), 2(yz+wx), 1-2(x²+y²)]]
 */
export function quaternionToMatrix(q: Quaternion): Matrix3 {
  const [w, x, y, z] = quaternionNormalize(q);

  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];
}

/**
 * Convert 3x3 rotation matrix to quaternion
 * 
 * Uses Shepperd's method for numerical stability.
 */
export function matrixToQuaternion(R: Matrix3): Quaternion {
  const [[m00, m01, m02], [m10, m11, m12], [m20, m21, m22]] = R;

  const trace = m00 + m11 + m22;

  if (trace > 0) {
    const s = sqrt(trace + 1) * 2; // s = 4*w
    const w = 0.25 * s;
    const x = (m21 - m12) / s;
    const y = (m02 - m20) / s;
    const z = (m10 - m01) / s;
    return quaternionNormalize([w, x, y, z]);
  } else if (m00 > m11 && m00 > m22) {
    const s = sqrt(1 + m00 - m11 - m22) * 2; // s = 4*x
    const w = (m21 - m12) / s;
    const x = 0.25 * s;
    const y = (m10 + m01) / s;
    const z = (m02 + m20) / s;
    return quaternionNormalize([w, x, y, z]);
  } else if (m11 > m22) {
    const s = sqrt(1 + m11 - m00 - m22) * 2; // s = 4*y
    const w = (m02 - m20) / s;
    const x = (m10 + m01) / s;
    const y = 0.25 * s;
    const z = (m21 + m12) / s;
    return quaternionNormalize([w, x, y, z]);
  } else {
    const s = sqrt(1 + m22 - m00 - m11) * 2; // s = 4*z
    const w = (m10 - m01) / s;
    const x = (m02 + m20) / s;
    const y = (m21 + m12) / s;
    const z = 0.25 * s;
    return quaternionNormalize([w, x, y, z]);
  }
}

/**
 * Spherical Linear Interpolation (SLERP) between two quaternions
 * 
 * Provides smooth rotation interpolation:
 * SLERP(q1, q2, t) = q1 * sin((1-t)*θ)/sin(θ) + q2 * sin(t*θ)/sin(θ)
 * 
 * Where θ is the angle between quaternions.
 */
export function quaternionSlerp(q1: Quaternion, q2: Quaternion, t: number): Quaternion {
  // Normalize both quaternions
  const v1 = quaternionNormalize(q1);
  const v2 = quaternionNormalize(q2);

  // Compute dot product (cosine of angle)
  let dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2] + v1[3] * v2[3];

  // If negative dot, negate one quaternion to take shorter path
  if (dot < 0) {
    v2[0] = -v2[0];
    v2[1] = -v2[1];
    v2[2] = -v2[2];
    v2[3] = -v2[3];
    dot = -dot;
  }

  // If quaternions are very close, use linear interpolation
  if (dot > 0.9995) {
    return quaternionNormalize([
      v1[0] + t * (v2[0] - v1[0]),
      v1[1] + t * (v2[1] - v1[1]),
      v1[2] + t * (v2[2] - v1[2]),
      v1[3] + t * (v2[3] - v1[3]),
    ]);
  }

  // SLERP formula
  const theta_0 = acos(dot);
  const theta = theta_0 * t;
  const sin_theta = sin(theta);
  const sin_theta_0 = sin(theta_0);

  const s0 = cos(theta) - dot * sin_theta / sin_theta_0;
  const s1 = sin_theta / sin_theta_0;

  return quaternionNormalize([
    v1[0] * s0 + v2[0] * s1,
    v1[1] * s0 + v2[1] * s1,
    v1[2] * s0 + v2[2] * s1,
    v1[3] * s0 + v2[3] * s1,
  ]);
}

/**
 * Generate a random unit quaternion (uniform distribution on SO(3))
 * 
 * Uses the method from: K. Shoemake, "Uniform random rotations"
 */
export function randomQuaternion(): Quaternion {
  const u1 = Math.random();
  const u2 = Math.random();
  const u3 = Math.random();

  const sqrt1 = sqrt(1 - u1);
  const sqrt2 = sqrt(u1);

  return [
    sqrt1 * sin(2 * PI * u2), // w
    sqrt1 * cos(2 * PI * u2), // x
    sqrt2 * sin(2 * PI * u3), // y
    sqrt2 * cos(2 * PI * u3), // z
  ];
}

/**
 * Generate random rotation matrix
 */
export function randomRotationMatrix(): Matrix3 {
  return quaternionToMatrix(randomQuaternion());
}

// ============================================================================
// Quaternion-Vector Operations
// ============================================================================

/**
 * Rotate a 3D vector by a quaternion
 * 
 * v' = q * v * q*
 * Optimized formula: v' = v + 2*w*(v×xyz) + 2*(xyz×(v×xyz))
 */
export function rotateVector(q: Quaternion, v: Vector3): Vector3 {
  const [w, x, y, z] = quaternionNormalize(q);
  const [vx, vy, vz] = v;

  // Cross product v × xyz
  const cx = vy * z - vz * y;
  const cy = vz * x - vx * z;
  const cz = vx * y - vy * x;

  // Cross product xyz × (v × xyz)
  const cx2 = y * cz - z * cy;
  const cy2 = z * cx - x * cz;
  const cz2 = x * cy - y * cx;

  return [
    vx + 2 * w * cx + 2 * cx2,
    vy + 2 * w * cy + 2 * cy2,
    vz + 2 * w * cz + 2 * cz2,
  ];
}

/**
 * Rotate multiple vectors by a quaternion
 */
export function rotateVectors(q: Quaternion, vectors: Vector3[]): Vector3[] {
  return vectors.map(v => rotateVector(q, v));
}

/**
 * Rotate a matrix (equivariant transformation)
 * R' = q * R * q*
 */
export function rotateMatrix(q: Quaternion, M: Matrix3): Matrix3 {
  const R = quaternionToMatrix(q);
  return matrixMultiply(R, M);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Multiply two 3x3 matrices
 */
export function matrixMultiply(A: Matrix3, B: Matrix3): Matrix3 {
  const result: Matrix3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return result;
}

/**
 * Matrix transpose
 */
export function matrixTranspose(M: Matrix3): Matrix3 {
  return [
    [M[0][0], M[1][0], M[2][0]],
    [M[0][1], M[1][1], M[2][1]],
    [M[0][2], M[1][2], M[2][2]],
  ];
}

/**
 * Compute cross product of two 3D vectors
 */
export function cross(a: Vector3, b: Vector3): Vector3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * Compute dot product of two 3D vectors
 */
export function dot(a: Vector3, b: Vector3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Compute vector norm
 */
export function vectorNorm(v: Vector3): number {
  return sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

/**
 * Normalize a 3D vector
 */
export function vectorNormalize(v: Vector3): Vector3 {
  const norm = vectorNorm(v);
  if (norm < 1e-10) {
    return [0, 0, 1]; // Default to z-axis for zero vector
  }
  return [v[0] / norm, v[1] / norm, v[2] / norm];
}

/**
 * Compute Frobenius norm of a matrix
 */
export function matrixFrobeniusNorm(M: Matrix3): number {
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      sum += M[i][j] * M[i][j];
    }
  }
  return sqrt(sum);
}

/**
 * Identity matrix
 */
export function identityMatrix(): Matrix3 {
  return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
}

/**
 * Create quaternion from axis-angle representation
 * q = [cos(θ/2), sin(θ/2) * axis]
 */
export function axisAngleToQuaternion(axis: Vector3, angle: number): Quaternion {
  const normalizedAxis = vectorNormalize(axis);
  const halfAngle = angle / 2;
  const sinHalf = sin(halfAngle);
  const cosHalf = cos(halfAngle);

  return [
    cosHalf,
    sinHalf * normalizedAxis[0],
    sinHalf * normalizedAxis[1],
    sinHalf * normalizedAxis[2],
  ];
}

/**
 * Convert quaternion to axis-angle representation
 */
export function quaternionToAxisAngle(q: Quaternion): { axis: Vector3; angle: number } {
  const [w, x, y, z] = quaternionNormalize(q);

  // Handle identity quaternion
  if (abs(w) > 0.9999) {
    return { axis: [0, 0, 1], angle: 0 };
  }

  const angle = 2 * acos(abs(w));
  const sinHalf = sqrt(1 - w * w);

  return {
    axis: [x / sinHalf, y / sinHalf, z / sinHalf],
    angle: angle,
  };
}

// ============================================================================
// Equivariance Validation
// ============================================================================

/**
 * Test SE(3) equivariance of a transformation function
 * 
 * For equivariance: f(Rx + t) = R f(x) + t
 * 
 * @param transformFn - The function to test
 * @param input - Input vector
 * @param numTests - Number of random rotations to test
 * @returns Mean equivariance error
 */
export function testEquivariance(
  transformFn: (v: Vector3) => Vector3,
  input: Vector3,
  numTests: number = 100
): { meanError: number; maxError: number; errors: number[] } {
  const errors: number[] = [];

  for (let i = 0; i < numTests; i++) {
    const q = randomQuaternion();
    const R = quaternionToMatrix(q);

    // Transform input
    const rotatedInput = rotateVector(q, input);
    const output1 = transformFn(rotatedInput);

    // Transform output
    const output = transformFn(input);
    const output2 = rotateVector(q, output);

    // Compute error
    const error = vectorNorm([
      output1[0] - output2[0],
      output1[1] - output2[1],
      output1[2] - output2[2],
    ]);

    errors.push(error);
  }

  const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
  const maxError = Math.max(...errors);

  return { meanError, maxError, errors };
}
