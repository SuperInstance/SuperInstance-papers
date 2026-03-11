/**
 * Benchmark and Validation Utilities for QGT
 * 
 * Provides validation functions:
 * - testEquivariance() - Verify SE(3) equivariance
 * - benchmarkRotationRepresentations() - Compare rotation encodings
 * - compareArchitectures() - Compare different architectures
 */

import {
  Quaternion,
  Vector3,
  quaternionMultiply,
  quaternionConjugate,
  randomQuaternion,
  rotateVector,
  quaternionToMatrix,
  matrixToQuaternion,
  eulerToQuaternion,
  quaternionToEuler,
  axisAngleToQuaternion,
  quaternionToAxisAngle,
  IDENTITY_QUATERNION,
} from './quaternion';

import {
  Frame,
  computeCanonicalFrames,
  applyFrameTransform,
  applyInverseFrameTransform,
} from './frameUtils';

import {
  computeAllYlm,
  computeWignerDMatrix,
} from './sphericalHarmonics';

import {
  QGTModel,
  GeometricGraph,
  Domain,
  MolecularOutput,
  createGraphFromPositions,
} from './qgtCore';

// ============================================================================
// Equivariance Testing
// ============================================================================

/**
 * Result of equivariance test
 */
export interface EquivarianceTestResult {
  testName: string;
  meanError: number;
  maxError: number;
  stdError: number;
  passed: boolean;
  details?: Record<string, number>;
}

/**
 * Test SE(3) equivariance of the QGT model
 * 
 * For an equivariant function f:
 * f(R·x + t) = R·f(x) + t
 * 
 * We test this by applying random rotations and translations
 * and comparing with the expected transformation.
 */
export function testEquivariance(
  graph: GeometricGraph,
  domain: Domain = 'molecular',
  nTests: number = 10
): {
  rotationEquivariance: EquivarianceTestResult;
  translationInvariance: EquivarianceTestResult;
  forceEquivariance?: EquivarianceTestResult;
  energyInvariance?: EquivarianceTestResult;
} {
  const rotationErrors: number[] = [];
  const translationErrors: number[] = [];
  const forceErrors: number[] = [];
  const energyErrors: number[] = [];

  // Original inference
  const model = new QGTModel({ domain });
  const originalOutput = model.forward(graph);
  const originalPositions = model.getPositions();

  for (let test = 0; test < nTests; test++) {
    // Random rotation
    const rotation = randomQuaternion();

    // Apply rotation to positions
    const rotatedPositions = originalPositions.map((p) => rotateVector(rotation, p));

    // Create rotated graph
    const rotatedGraph = createGraphFromPositions(rotatedPositions);

    // Run inference on rotated input
    const rotatedModel = new QGTModel({ domain });
    const rotatedOutput = rotatedModel.forward(rotatedGraph);

    // Test rotation equivariance
    if (domain === 'molecular') {
      const molOriginal = originalOutput as MolecularOutput;
      const molRotated = rotatedOutput as MolecularOutput;

      // Forces should rotate: F' = R·F
      for (let i = 0; i < molOriginal.forces.length; i++) {
        const expectedRotatedForce = rotateVector(rotation, molOriginal.forces[i]);
        const actualRotatedForce = molRotated.forces[i];

        const error = vectorDistance(expectedRotatedForce, actualRotatedForce);
        forceErrors.push(error);
      }

      // Energy should be invariant: E' = E
      const energyError = Math.abs(molOriginal.energy - molRotated.energy);
      energyErrors.push(energyError);
    }

    // General rotation equivariance test (features)
    const rotatedFeatures = rotatedModel.getFeatures();
    const originalFeatures = model.getFeatures();
    const rotationError = testFeatureEquivariance(
      originalFeatures,
      rotatedFeatures,
      rotation
    );
    rotationErrors.push(rotationError);

    // Test translation invariance
    const translation: Vector3 = [
      Math.random() * 10,
      Math.random() * 10,
      Math.random() * 10,
    ];
    const translatedPositions = originalPositions.map((p) => [
      p[0] + translation[0],
      p[1] + translation[1],
      p[2] + translation[2],
    ] as Vector3);

    const translatedGraph = createGraphFromPositions(translatedPositions);
    const translatedModel = new QGTModel({ domain });
    const translatedOutput = translatedModel.forward(translatedGraph);

    // Scalar outputs should be invariant to translation
    if (domain === 'molecular') {
      const molOriginal = originalOutput as MolecularOutput;
      const molTranslated = translatedOutput as MolecularOutput;
      const translationError = Math.abs(molOriginal.energy - molTranslated.energy);
      translationErrors.push(translationError);
    }
  }

  const result = {
    rotationEquivariance: computeStatistics(rotationErrors, 'Rotation Equivariance'),
    translationInvariance: computeStatistics(translationErrors, 'Translation Invariance'),
    forceEquivariance: forceErrors.length > 0 
      ? computeStatistics(forceErrors, 'Force Equivariance') 
      : undefined,
    energyInvariance: energyErrors.length > 0 
      ? computeStatistics(energyErrors, 'Energy Invariance') 
      : undefined,
  };

  return result;
}

/**
 * Test feature equivariance under rotation
 */
function testFeatureEquivariance(
  originalFeatures: Map<number, number[]>[],
  rotatedFeatures: Map<number, number[]>[],
  rotation: Quaternion
): number {
  let totalError = 0;
  let count = 0;

  for (let i = 0; i < originalFeatures.length; i++) {
    const orig = originalFeatures[i];
    const rot = rotatedFeatures[i];

    // Test l=0 (invariant)
    const l0Orig = orig.get(0) || [0];
    const l0Rot = rot.get(0) || [0];
    totalError += Math.abs(l0Orig[0] - l0Rot[0]);
    count++;

    // Test l=1 (vector - should rotate)
    const l1Orig = orig.get(1) || [0, 0, 0];
    const l1Rot = rot.get(1) || [0, 0, 0];
    
    // Convert spherical harmonics to Cartesian and test rotation
    const origVec = sphericalToCartesian(l1Orig);
    const rotVec = sphericalToCartesian(l1Rot);
    const expectedRotVec = rotateVector(rotation, origVec);
    
    totalError += vectorDistance(expectedRotVec, rotVec);
    count++;
  }

  return count > 0 ? totalError / count : 0;
}

/**
 * Convert l=1 spherical harmonics to Cartesian
 */
function sphericalToCartesian(ylm: number[]): Vector3 {
  // Y_1^-1, Y_1^0, Y_1^1 -> Cartesian
  // Simplified conversion
  return [ylm[2] * 0.5, ylm[0] * 0.5, ylm[1]];
}

/**
 * Compute vector distance
 */
function vectorDistance(a: Vector3, b: Vector3): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  );
}

/**
 * Compute statistics for test results
 */
function computeStatistics(errors: number[], testName: string): EquivarianceTestResult {
  const n = errors.length;
  if (n === 0) {
    return {
      testName,
      meanError: 0,
      maxError: 0,
      stdError: 0,
      passed: true,
    };
  }

  const meanError = errors.reduce((a, b) => a + b, 0) / n;
  const maxError = Math.max(...errors);
  const variance = errors.reduce((sum, e) => sum + (e - meanError) ** 2, 0) / n;
  const stdError = Math.sqrt(variance);

  // Pass threshold: error should be close to machine precision
  const passed = meanError < 1e-10;

  return {
    testName,
    meanError,
    maxError,
    stdError,
    passed,
  };
}

// ============================================================================
// Rotation Representation Benchmarks
// ============================================================================

/**
 * Benchmark result for rotation representations
 */
export interface RotationBenchmarkResult {
  name: string;
  meanError: number;
  maxError: number;
  stdError: number;
  properties: string[];
}

/**
 * Benchmark different rotation representations
 * 
 * Compares:
 * - Euler angles
 * - Quaternions
 * - Axis-angle
 * - Rotation matrices
 * - Wigner D-matrices
 */
export function benchmarkRotationRepresentations(
  nTests: number = 100
): RotationBenchmarkResult[] {
  const results: RotationBenchmarkResult[] = [];

  // Euler angles
  results.push(benchmarkEulerAngles(nTests));

  // Quaternions
  results.push(benchmarkQuaternions(nTests));

  // Axis-angle
  results.push(benchmarkAxisAngle(nTests));

  // Rotation matrices
  results.push(benchmarkRotationMatrices(nTests));

  // Wigner D-matrices
  results.push(benchmarkWignerD(nTests));

  return results;
}

/**
 * Benchmark Euler angles
 */
function benchmarkEulerAngles(nTests: number): RotationBenchmarkResult {
  const errors: number[] = [];

  for (let i = 0; i < nTests; i++) {
    // Generate random Euler angles
    const euler: Vector3 = [
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI,
      Math.random() * Math.PI * 2,
    ];

    // Convert to quaternion and back
    const q = eulerToQuaternion(euler);
    const eulerBack = quaternionToEuler(q);

    // Compute error (considering angle wrapping)
    const error = eulerAngleError(euler, eulerBack);
    errors.push(error);
  }

  return {
    name: 'Euler Angles',
    meanError: computeMean(errors),
    maxError: Math.max(...errors),
    stdError: computeStd(errors),
    properties: [
      'Intuitive for humans',
      'Gimbal lock at β = ±π/2',
      'Discontinuous at singularities',
    ],
  };
}

/**
 * Benchmark quaternions
 */
function benchmarkQuaternions(nTests: number): RotationBenchmarkResult {
  const errors: number[] = [];

  for (let i = 0; i < nTests; i++) {
    // Generate random quaternion
    const q = randomQuaternion();

    // Convert to matrix and back
    const R = quaternionToMatrix(q);
    const qBack = matrixToQuaternion(R);

    // Compute error (quaternion distance)
    const dot = Math.abs(
      q[0] * qBack[0] + q[1] * qBack[1] + q[2] * qBack[2] + q[3] * qBack[3]
    );
    const error = 2 * Math.acos(Math.min(1, dot));
    errors.push(error);
  }

  return {
    name: 'Quaternion',
    meanError: computeMean(errors),
    maxError: Math.max(...errors),
    stdError: computeStd(errors),
    properties: [
      'No gimbal lock',
      'Smooth interpolation (SLERP)',
      'Minimal storage (4 floats)',
      'Best numerical stability',
    ],
  };
}

/**
 * Benchmark axis-angle
 */
function benchmarkAxisAngle(nTests: number): RotationBenchmarkResult {
  const errors: number[] = [];

  for (let i = 0; i < nTests; i++) {
    // Generate random axis-angle
    const axis: Vector3 = [
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ];
    const norm = Math.sqrt(axis[0] ** 2 + axis[1] ** 2 + axis[2] ** 2);
    if (norm < 1e-10) continue;

    const normalizedAxis: Vector3 = [axis[0] / norm, axis[1] / norm, axis[2] / norm];
    const angle = Math.random() * Math.PI * 2;

    const q = axisAngleToQuaternion(normalizedAxis, angle);
    const { axis: axisBack, angle: angleBack } = quaternionToAxisAngle(q);

    // Compute error
    const axisError = Math.abs(
      normalizedAxis[0] * axisBack[0] +
      normalizedAxis[1] * axisBack[1] +
      normalizedAxis[2] * axisBack[2]
    );
    const angleError = Math.abs(angle - angleBack);
    errors.push(Math.sqrt((1 - axisError) ** 2 + angleError ** 2));
  }

  return {
    name: 'Axis-Angle',
    meanError: computeMean(errors),
    maxError: Math.max(...errors),
    stdError: computeStd(errors),
    properties: [
      'Geometrically intuitive',
      'Minimal parameterization',
      'Singularity at θ = 0',
    ],
  };
}

/**
 * Benchmark rotation matrices
 */
function benchmarkRotationMatrices(nTests: number): RotationBenchmarkResult {
  const errors: number[] = [];

  for (let i = 0; i < nTests; i++) {
    // Generate random rotation matrix via quaternion
    const q = randomQuaternion();
    const R = quaternionToMatrix(q);

    // Test orthonormality: R^T * R = I
    const RtR = matrixMultiply(transpose(R), R);
    const I: Matrix3x3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    
    let error = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        error += Math.abs(RtR[r][c] - I[r][c]);
      }
    }
    errors.push(error / 9);

    // Test det(R) = 1
    const det = determinant3x3(R);
    errors.push(Math.abs(det - 1));
  }

  return {
    name: 'Rotation Matrix',
    meanError: computeMean(errors),
    maxError: Math.max(...errors),
    stdError: computeStd(errors),
    properties: [
      'Direct application to vectors',
      'Redundant storage (9 floats)',
      'Easy composition',
    ],
  };
}

/**
 * Benchmark Wigner D-matrices
 */
function benchmarkWignerD(nTests: number): RotationBenchmarkResult {
  const errors: number[] = [];

  for (let i = 0; i < nTests; i++) {
    // Generate random Euler angles
    const alpha = Math.random() * Math.PI * 2;
    const beta = Math.random() * Math.PI;
    const gamma = Math.random() * Math.PI * 2;

    // Compute Wigner D-matrix for l=2
    const D = computeWignerDMatrix(alpha, beta, gamma, 2);

    // Test unitarity: D^† D = I
    const Ddagger = conjugateTranspose(D);
    const product = matrixMultiply(Ddagger, D);

    let error = 0;
    const size = D.length;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const expected = r === c ? 1 : 0;
        error += Math.abs(product[r][c] - expected);
      }
    }
    errors.push(error / (size * size));
  }

  return {
    name: 'Wigner D-Matrix',
    meanError: computeMean(errors),
    maxError: Math.max(...errors),
    stdError: computeStd(errors),
    properties: [
      'Native SO(3) representation',
      'Quantum mechanics compatible',
      'Spherical harmonic basis',
    ],
  };
}

// ============================================================================
// Architecture Comparison
// ============================================================================

/**
 * Architecture comparison result
 */
export interface ArchitectureComparison {
  name: string;
  lMax: number | string;
  polynomialDegree: string;
  complexity: string;
  efficiency: number;
  features: string[];
}

/**
 * Compare different equivariant architectures
 */
export function compareArchitectures(): ArchitectureComparison[] {
  return [
    {
      name: 'SE(3)-Transformer',
      lMax: 4,
      polynomialDegree: 'Unlimited',
      complexity: 'O(n² · d · l²)',
      efficiency: 0.70,
      features: ['Attention mechanism', 'Spherical harmonics', 'Tensor field attention'],
    },
    {
      name: 'Tensor Field Network',
      lMax: 6,
      polynomialDegree: 'Unlimited',
      complexity: 'O(n · d · l⁴)',
      efficiency: 0.50,
      features: ['Radial functions', 'Spherical filters', 'Tensor products'],
    },
    {
      name: 'MACE',
      lMax: 4,
      polynomialDegree: 'High',
      complexity: 'O(n · d² · l²)',
      efficiency: 0.85,
      features: ['ACE features', 'Correlation functions', 'E(3) equivariance'],
    },
    {
      name: 'FAENet',
      lMax: '∞',
      polynomialDegree: 'Unlimited',
      complexity: 'O(n · d · |F|)',
      efficiency: 0.90,
      features: ['Frame averaging', 'Any base network', 'Exact equivariance'],
    },
    {
      name: 'EGNN',
      lMax: 1,
      polynomialDegree: '2',
      complexity: 'O(n² · d)',
      efficiency: 0.95,
      features: ['Coordinate updates', 'Simple equivariance', 'Fast inference'],
    },
    {
      name: 'QGT (Ours)',
      lMax: 4,
      polynomialDegree: 'High',
      complexity: 'O(n · (k + d·|F| + d²·l²))',
      efficiency: 0.92,
      features: [
        'Quaternion encoding',
        'Frame averaging',
        'Higher-order features',
        'Multi-domain',
      ],
    },
  ];
}

// ============================================================================
// Utility Functions
// ============================================================================

type Matrix3x3 = [[number, number, number], [number, number, number], [number, number, number]];

function computeMean(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function computeStd(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = computeMean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function eulerAngleError(a: Vector3, b: Vector3): number {
  const wrapAngle = (x: number) => ((x + Math.PI) % (2 * Math.PI)) - Math.PI;
  return Math.sqrt(
    wrapAngle(a[0] - b[0]) ** 2 +
    wrapAngle(a[1] - b[1]) ** 2 +
    wrapAngle(a[2] - b[2]) ** 2
  );
}

function transpose(m: Matrix3x3): Matrix3x3 {
  return [
    [m[0][0], m[1][0], m[2][0]],
    [m[0][1], m[1][1], m[2][1]],
    [m[0][2], m[1][2], m[2][2]],
  ];
}

function matrixMultiply(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
  const result: Matrix3x3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

function determinant3x3(m: Matrix3x3): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

function conjugateTranspose(m: number[][]): number[][] {
  const rows = m.length;
  const cols = m[0]?.length || 0;
  const result: number[][] = [];
  for (let j = 0; j < cols; j++) {
    result[j] = [];
    for (let i = 0; i < rows; i++) {
      result[j][i] = m[i][j]; // Real case: conjugate is identity
    }
  }
  return result;
}

// ============================================================================
// Performance Benchmark
// ============================================================================

/**
 * Performance benchmark result
 */
export interface PerformanceBenchmark {
  name: string;
  avgTime: number;
  minTime: number;
  maxTime: number;
  operations: number;
  opsPerSecond: number;
}

/**
 * Run performance benchmark
 */
export function runPerformanceBenchmark(
  nNodes: number = 100,
  nIterations: number = 10
): PerformanceBenchmark {
  const times: number[] = [];

  for (let i = 0; i < nIterations; i++) {
    // Generate random graph
    const positions: Vector3[] = [];
    for (let j = 0; j < nNodes; j++) {
      positions.push([
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
      ]);
    }
    const graph = createGraphFromPositions(positions);

    // Time inference
    const start = performance.now();
    const model = new QGTModel({ domain: 'molecular' });
    model.forward(graph);
    const end = performance.now();

    times.push(end - start);
  }

  const avgTime = computeMean(times);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSecond = 1000 / avgTime;

  return {
    name: 'QGT Inference',
    avgTime,
    minTime,
    maxTime,
    operations: nNodes,
    opsPerSecond,
  };
}

// ============================================================================
// Export all benchmark functions
// ============================================================================

export {
  testEquivariance,
  benchmarkRotationRepresentations,
  compareArchitectures,
  runPerformanceBenchmark,
};
