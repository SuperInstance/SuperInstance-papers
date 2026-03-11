/**
 * Spherical Harmonics and Wigner-D Matrix Utilities for QGT
 * 
 * Spherical harmonics Y_l^m(θ, φ) provide a basis for functions on the sphere,
 * transforming equivariantly under rotations via Wigner-D matrices.
 * 
 * Key properties:
 * - Y_l^m transforms under rotation R as: D^l(R) Y_l^m
 * - Wigner-D matrices are irreducible representations of SO(3)
 * - Clebsch-Gordan coefficients enable tensor products
 */

import { Quaternion, Vector3, Matrix3, quaternionToMatrix, vectorNormalize } from './quaternion';
import { sqrt, abs, sin, cos, exp, pow, PI, factorial, doubleFactorial, binomial, EPS } from './mathConstants';

// ============================================================================
// Type Definitions
// ============================================================================

export type SphericalHarmonicCoefficients = Map<string, Complex>; // Key: "l,m"
export type WignerDMatrix = Complex[][]; // (2l+1) x (2l+1) complex matrix

interface Complex {
  re: number;
  im: number;
}

// ============================================================================
// Complex Number Operations
// ============================================================================

function complex(re: number, im: number = 0): Complex {
  return { re, im };
}

function complexAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

function complexMul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

function complexConj(a: Complex): Complex {
  return { re: a.re, im: -a.im };
}

function complexMagnitude(a: Complex): number {
  return sqrt(a.re * a.re + a.im * a.im);
}

// ============================================================================
// Spherical Harmonics Y_l^m(θ, φ)
// ============================================================================

/**
 * Compute associated Legendre polynomial P_l^m(x)
 * 
 * P_l^m(x) = (-1)^m (1-x²)^{m/2} d^m/dx^m P_l(x)
 */
function associatedLegendre(l: number, m: number, x: number): number {
  // Handle edge cases
  if (abs(x) > 1 + EPS) return 0;
  if (m < 0 || m > l) return 0;

  // Use recurrence relation
  // P_m^m = (-1)^m (2m-1)!! (1-x²)^{m/2}
  // P_{m+1}^m = x (2m+1) P_m^m
  // (l-m) P_l^m = x (2l-1) P_{l-1}^m - (l+m-1) P_{l-2}^m

  let pmm = 1.0;
  if (m > 0) {
    const somx2 = sqrt((1 - x) * (1 + x));
    let fact = 1.0;
    for (let i = 1; i <= m; i++) {
      pmm *= (-fact) * somx2;
      fact += 2.0;
    }
  }

  if (l === m) return pmm;

  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmmp1;

  let pll = 0.0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = ((2 * ll - 1) * x * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }

  return pll;
}

/**
 * Compute spherical harmonic Y_l^m(θ, φ)
 * 
 * Y_l^m(θ, φ) = √((2l+1)/(4π) * (l-m)!/(l+m)!) * P_l^m(cos θ) * e^{imφ}
 * 
 * @param l - Angular momentum (l = 0, 1, 2, ...)
 * @param m - Magnetic quantum number (-l ≤ m ≤ l)
 * @param theta - Polar angle (from z-axis)
 * @param phi - Azimuthal angle (from x-axis)
 */
export function computeYlm(l: number, m: number, theta: number, phi: number): Complex {
  const cosTheta = cos(theta);
  const sinTheta = sin(theta);

  // Normalization factor
  const absM = abs(m);
  const normalization = sqrt(
    ((2 * l + 1) / (4 * PI)) *
    (factorial(l - absM) / factorial(l + absM))
  );

  // Associated Legendre polynomial
  const Plm = associatedLegendre(l, absM, cosTheta);

  // Condon-Shortley phase
  const phase = m >= 0 ? 1 : pow(-1, m) * factorial(l + absM) / factorial(l - absM);

  // Complex exponential
  const expPhi = { re: cos(absM * phi), im: sin(absM * phi) };

  // Final value
  const value = complex(normalization * Plm * phase);
  return complexMul(value, expPhi);
}

/**
 * Compute all spherical harmonics up to l_max for a given direction
 * 
 * @param direction - Unit vector pointing in direction (θ, φ)
 * @param l_max - Maximum angular momentum
 */
export function computeAllYlm(direction: Vector3, l_max: number): Map<string, Complex> {
  const result = new Map<string, Complex>();

  // Convert direction to spherical coordinates
  const [x, y, z] = direction;
  const r = sqrt(x * x + y * y + z * z);
  if (r < EPS) {
    // Handle zero vector
    for (let l = 0; l <= l_max; l++) {
      for (let m = -l; m <= l; m++) {
        result.set(`${l},${m}`, complex(m === 0 ? sqrt((2 * l + 1) / (4 * PI)) : 0));
      }
    }
    return result;
  }

  const theta = acos(z / r);
  const phi = atan2(y, x);

  for (let l = 0; l <= l_max; l++) {
    for (let m = -l; m <= l; m++) {
      result.set(`${l},${m}`, computeYlm(l, m, theta, phi));
    }
  }

  return result;
}

// ============================================================================
// Wigner-D Matrices D^l_{m,m'}(R)
// ============================================================================

/**
 * Compute Wigner small d-matrix element d^l_{m,m'}(β)
 * 
 * This is the core computation for Wigner-D matrices.
 * D^l_{m,m'}(α, β, γ) = e^{-imα} d^l_{m,m'}(β) e^{-im'γ}
 */
function wignerSmallD(l: number, m: number, mp: number, beta: number): number {
  // Simplified computation using d^l_{m,m'}(β) = <l m| R_y(β) |l m'>
  // This is a real quantity

  // Handle symmetries
  if (m < -l || m > l || mp < -l || mp > l) return 0;

  // Use the formula:
  // d^l_{m,m'}(β) = Σ_k (-1)^k (l+m)!/(k!(l+m-k)!) (l-m)!/((k+m-mp)!(l-k-m)!)
  //                 * (cos(β/2))^{2l+m-mp-2k} (sin(β/2))^{2k+mp-m}

  const cosHalf = cos(beta / 2);
  const sinHalf = sin(beta / 2);

  const kMin = Math.max(0, m - mp);
  const kMax = Math.min(l + m, l - mp);

  let sum = 0;
  for (let k = kMin; k <= kMax; k++) {
    const sign = pow(-1, k);
    const coef = binomial(l + m, k) * binomial(l - m, k + m - mp);
    sum += sign * coef * pow(cosHalf, 2 * l + m - mp - 2 * k) * pow(sinHalf, 2 * k + mp - m);
  }

  return sum;
}

/**
 * Compute Wigner D-matrix D^l(R) for a rotation R
 * 
 * The Wigner D-matrix is the irreducible representation of SO(3)
 * for angular momentum l. It has dimension (2l+1) x (2l+1).
 */
export function computeWignerD(l: number, R: Matrix3): WignerDMatrix {
  // Convert rotation matrix to Euler angles (ZYZ convention)
  const euler = matrixToEulerZYZ(R);
  const [alpha, beta, gamma] = euler;

  // Initialize matrix
  const D: WignerDMatrix = [];
  for (let i = 0; i < 2 * l + 1; i++) {
    D.push([]);
    for (let j = 0; j < 2 * l + 1; j++) {
      D[i].push(complex(0, 0));
    }
  }

  // Fill in matrix elements
  for (let m = -l; m <= l; m++) {
    for (let mp = -l; mp <= l; mp++) {
      const d = wignerSmallD(l, m, mp, beta);
      const expAlpha = complex(cos(-m * alpha), sin(-m * alpha));
      const expGamma = complex(cos(-mp * gamma), sin(-mp * gamma));

      D[m + l][mp + l] = complexMul(complexMul(expAlpha, complex(d)), expGamma);
    }
  }

  return D;
}

/**
 * Compute Wigner D-matrix from quaternion
 */
export function computeWignerDFromQuaternion(l: number, q: Quaternion): WignerDMatrix {
  const R = quaternionToMatrix(q);
  return computeWignerD(l, R);
}

// ============================================================================
// Clebsch-Gordan Coefficients
// ============================================================================

/**
 * Compute Clebsch-Gordan coefficient <l1 m1, l2 m2 | L M>
 * 
 * These coefficients appear in the tensor product of two irreducible
 * representations: |L M⟩ = Σ_{m1,m2} C^{L M}_{l1 m1, l2 m2} |l1 m1⟩ ⊗ |l2 m2⟩
 */
export function clebschGordan(
  l1: number, m1: number,
  l2: number, m2: number,
  L: number, M: number
): number {
  // Selection rules
  if (m1 + m2 !== M) return 0;
  if (L < abs(l1 - l2) || L > l1 + l2) return 0;
  if (abs(m1) > l1 || abs(m2) > l2 || abs(M) > L) return 0;

  // Compute using the Racah formula:
  // C^{L M}_{l1 m1, l2 m2} = δ_{m1+m2,M} * √(...) * Σ_k (-1)^k / (k! ...)

  const j1 = l1, j2 = l2, j = L;
  const m_j = M, m_1 = m1, m_2 = m2;

  const phase = pow(-1, j1 - j2 + m_j);
  const normFactor = sqrt(
    (2 * j + 1) *
    factorial(j + j1 - j2) * factorial(j - j1 + j2) * factorial(j1 + j2 - j) /
    (factorial(j1 + j2 + j + 1)) *
    factorial(j + m_j) * factorial(j - m_j) *
    factorial(j1 + m_1) * factorial(j1 - m_1) *
    factorial(j2 + m_2) * factorial(j2 - m_2)
  );

  const kMin = Math.max(0, -(j - j2 + m_1), -(j - j1 - m_2));
  const kMax = Math.min(j1 + j2 - j, j1 - m_1, j2 + m_2);

  let sum = 0;
  for (let k = kMin; k <= kMax; k++) {
    const term = pow(-1, k) /
      (factorial(k) *
        factorial(j1 + j2 - j - k) *
        factorial(j1 - m_1 - k) *
        factorial(j2 + m_2 - k) *
        factorial(j - j2 + m_1 + k) *
        factorial(j - j1 - m_2 + k));
    sum += term;
  }

  return phase * normFactor * sum;
}

/**
 * Get all non-zero Clebsch-Gordan coefficients for given l1, l2
 */
export function getClebschGordanCoefficients(l1: number, l2: number): Map<string, number> {
  const coefficients = new Map<string, number>();

  for (const L of range(abs(l1 - l2), l1 + l2 + 1)) {
    for (const M of range(-L, L + 1)) {
      for (const m1 of range(-l1, l1 + 1)) {
        const m2 = M - m1;
        if (m2 >= -l2 && m2 <= l2) {
          const cg = clebschGordan(l1, m1, l2, m2, L, M);
          if (abs(cg) > EPS) {
            coefficients.set(`${L},${M},${m1},${m2}`, cg);
          }
        }
      }
    }
  }

  return coefficients;
}

// ============================================================================
// Higher-Order Features
// ============================================================================

/**
 * Compute higher-order equivariant features from positions
 * 
 * For each edge (i, j), compute Y_l^m(θ_ij, φ_ij) where θ_ij, φ_ij
 * are the spherical coordinates of the unit vector from i to j.
 */
export function computeHigherOrderFeatures(
  positions: Vector3[],
  edgeIndex: [number, number][],
  l_max: number
): Map<string, Complex[]> {
  const features = new Map<string, Complex[]>();

  for (let l = 0; l <= l_max; l++) {
    for (let m = -l; m <= l; m++) {
      features.set(`${l},${m}`, []);
    }
  }

  for (const [i, j] of edgeIndex) {
    const direction: Vector3 = [
      positions[j][0] - positions[i][0],
      positions[j][1] - positions[i][1],
      positions[j][2] - positions[i][2],
    ];
    const normalizedDir = vectorNormalize(direction);
    const ylm = computeAllYlm(normalizedDir, l_max);

    for (const [key, value] of ylm) {
      features.get(key)?.push(value);
    }
  }

  return features;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert rotation matrix to Euler angles (ZYZ convention)
 */
function matrixToEulerZYZ(R: Matrix3): [number, number, number] {
  const [[r00, r01, r02], [r10, r11, r12], [r20, r21, r22]] = R;

  let alpha, beta, gamma;

  if (abs(r22) < 1 - EPS) {
    beta = acos(r22);
    const sinBeta = sin(beta);
    alpha = atan2(r12 / sinBeta, r02 / sinBeta);
    gamma = atan2(r21 / sinBeta, -r20 / sinBeta);
  } else {
    // Gimbal lock
    beta = r22 > 0 ? 0 : PI;
    alpha = atan2(-r01, r00);
    gamma = 0;
  }

  return [alpha, beta, gamma];
}

/**
 * atan2 function
 */
function atan2(y: number, x: number): number {
  return Math.atan2(y, x);
}

/**
 * Range generator
 */
function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i++) {
    result.push(i);
  }
  return result;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate Wigner D-matrix orthogonality
 * D^l(R) * D^l(R)^† = I
 */
export function validateWignerDOrthogonality(l: number, R: Matrix3): number {
  const D = computeWignerD(l, R);
  const size = 2 * l + 1;

  let error = 0;
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      let sum = complex(0);
      for (let k = 0; k < size; k++) {
        sum = complexAdd(sum, complexMul(D[i][k], complexConj(D[j][k])));
      }
      const expected = i === j ? 1 : 0;
      error += complexMagnitude(complex(sum.re - expected, sum.im));
    }
  }

  return error / size;
}

/**
 * Validate group homomorphism: D^l(R1 * R2) = D^l(R1) * D^l(R2)
 */
export function validateWignerDHomomorphism(
  l: number,
  R1: Matrix3,
  R2: Matrix3
): number {
  const D1 = computeWignerD(l, R1);
  const D2 = computeWignerD(l, R2);

  // Compute R1 * R2
  const R12: Matrix3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        R12[i][j] += R1[i][k] * R2[k][j];
      }
    }
  }

  const D12 = computeWignerD(l, R12);

  // Compute D1 * D2
  const size = 2 * l + 1;
  let error = 0;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      let product = complex(0);
      for (let k = 0; k < size; k++) {
        product = complexAdd(product, complexMul(D1[i][k], D2[k][j]));
      }
      error += complexMagnitude(complex(
        D12[i][j].re - product.re,
        D12[i][j].im - product.im
      ));
    }
  }

  return error / (size * size);
}
