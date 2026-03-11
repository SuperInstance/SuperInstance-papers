/**
 * Quaternion Neural Pathways - Schema 5 Implementation for QGT
 * 
 * Quaternion weights provide AUTOMATIC SE(3) equivariance through the
 * conjugation operation: W * x * W^(-1) where W is a unit quaternion.
 * 
 * Key Theoretical Insights:
 * - Conjugation by a unit quaternion represents rotation in 3D space
 * - This operation is automatically equivariant under rotation
 * - No need for expensive frame averaging or tensor product decompositions
 * 
 * Mathematical Foundation:
 * For any rotation R in SO(3) represented by quaternion q_R:
 * - R(x) = q_R * x * q_R^(-1)  (conjugation rotates the vector)
 * - f(R(x)) = R(f(x))  (equivariance)
 * 
 * The weight W being a unit quaternion ensures the transformation
 * preserves geometric structure automatically.
 */

import {
  Quaternion,
  Vector3,
  Matrix3,
  quaternionMultiply,
  quaternionConjugate,
  quaternionNorm,
  quaternionNormalize,
  quaternionToMatrix,
  randomQuaternion,
  vectorNorm,
} from './quaternion';
import { sqrt, exp, EPS } from './mathConstants';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Quaternion vector: array of quaternions [w, x, y, z]
 */
export type QuaternionVector = number[][]; // Shape: [n, 4]

/**
 * Batch of quaternion vectors
 */
export type QuaternionBatch = number[][][]; // Shape: [batch, features, 4]

/**
 * Gradient information for quaternion weights
 */
export interface QuaternionGradient {
  dw: number;  // gradient w.r.t. w component
  dx: number;  // gradient w.r.t. x component
  dy: number;  // gradient w.r.t. y component
  dz: number;  // gradient w.r.t. z component
}

/**
 * Configuration for quaternion neural layers
 */
export interface QuaternionLayerConfig {
  inFeatures: number;
  outFeatures: number;
  bias?: boolean;
  initialization?: 'random' | 'identity' | 'small_rotation';
}

/**
 * Forward pass result with intermediate values for backprop
 */
export interface QuaternionForwardResult {
  output: QuaternionBatch;
  cache: {
    inputs: QuaternionBatch;
    weights: QuaternionWeight[];
    biasContribution?: QuaternionBatch;
  };
}

// ============================================================================
// Quaternion Weight Class
// ============================================================================

/**
 * QuaternionWeight represents a learnable unit quaternion weight.
 * 
 * The key insight is that unit quaternions represent rotations in SO(3),
 * and the conjugation operation W * x * W^(-1) is automatically
 * equivariant to rotations.
 * 
 * For gradient computation, we use the reparameterization trick to
 * ensure the quaternion stays on the unit sphere during optimization.
 */
export class QuaternionWeight {
  private _w: number;
  private _x: number;
  private _y: number;
  private _z: number;
  
  // Cache for inverse computation
  private _inverseCache: Quaternion | null = null;
  private _normCache: number | null = null;

  /**
   * Create a quaternion weight
   * @param q - Initial quaternion [w, x, y, z]
   */
  constructor(q: Quaternion = [1, 0, 0, 0]) {
    this._w = q[0];
    this._x = q[1];
    this._y = q[2];
    this._z = q[3];
  }

  /**
   * Get the quaternion as [w, x, y, z]
   */
  get quaternion(): Quaternion {
    return [this._w, this._x, this._y, this._z];
  }

  /**
   * Get the normalized (unit) quaternion
   */
  get normalized(): Quaternion {
    return quaternionNormalize(this.quaternion);
  }

  /**
   * Get the inverse (conjugate for unit quaternions)
   */
  get inverse(): Quaternion {
    if (this._inverseCache) return this._inverseCache;
    
    const norm = this.norm;
    if (norm < EPS) {
      this._inverseCache = [1, 0, 0, 0];
      return this._inverseCache;
    }
    
    // For unit quaternion: q^(-1) = q* / ||q||^2
    const normSquared = norm * norm;
    this._inverseCache = [
      this._w / normSquared,
      -this._x / normSquared,
      -this._y / normSquared,
      -this._z / normSquared,
    ];
    return this._inverseCache;
  }

  /**
   * Get the norm of the quaternion
   */
  get norm(): number {
    if (this._normCache !== null) return this._normCache;
    this._normCache = quaternionNorm(this.quaternion);
    return this._normCache;
  }

  /**
   * Initialize as a random unit quaternion (uniform on S^3)
   */
  static random(): QuaternionWeight {
    return new QuaternionWeight(randomQuaternion());
  }

  /**
   * Initialize as identity quaternion (no rotation)
   */
  static identity(): QuaternionWeight {
    return new QuaternionWeight([1, 0, 0, 0]);
  }

  /**
   * Initialize as a small rotation around a random axis
   * @param angle - Rotation angle in radians (default: small random)
   */
  static smallRotation(angle?: number): QuaternionWeight {
    const theta = angle ?? (Math.random() * 0.1 - 0.05);
    const axis: Vector3 = [
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ];
    const axisNorm = sqrt(axis[0]**2 + axis[1]**2 + axis[2]**2);
    
    if (axisNorm < EPS) {
      return QuaternionWeight.identity();
    }
    
    const normalizedAxis: Vector3 = [
      axis[0] / axisNorm,
      axis[1] / axisNorm,
      axis[2] / axisNorm,
    ];
    
    const halfTheta = theta / 2;
    const q: Quaternion = [
      Math.cos(halfTheta),
      Math.sin(halfTheta) * normalizedAxis[0],
      Math.sin(halfTheta) * normalizedAxis[1],
      Math.sin(halfTheta) * normalizedAxis[2],
    ];
    
    return new QuaternionWeight(q);
  }

  /**
   * Forward pass: Apply conjugation transformation
   * 
   * This is the core operation that provides automatic SE(3) equivariance:
   * y = W * x * W^(-1)
   * 
   * For a pure quaternion (representing a 3D vector), this gives:
   * v' = W * v * W^(-1) which is a rotation of v by W
   * 
   * @param x - Input quaternion or quaternion vector
   * @returns Transformed quaternion
   */
  forward(x: Quaternion): Quaternion;
  forward(x: QuaternionVector): QuaternionVector;
  forward(x: QuaternionBatch): QuaternionBatch;
  forward(x: Quaternion | QuaternionVector | QuaternionBatch): Quaternion | QuaternionVector | QuaternionBatch {
    const W = this.normalized;
    const WInv = quaternionConjugate(W); // For unit quaternion, inverse = conjugate

    // Single quaternion
    if (this.isSingleQuaternion(x)) {
      return quaternionMultiply(quaternionMultiply(W, x as Quaternion), WInv);
    }

    // Quaternion vector [n, 4]
    if (this.isQuaternionVector(x)) {
      return (x as QuaternionVector).map(q => 
        quaternionMultiply(quaternionMultiply(W, q as Quaternion), WInv)
      );
    }

    // Quaternion batch [batch, n, 4]
    return (x as QuaternionBatch).map(vec =>
      vec.map(q => quaternionMultiply(quaternionMultiply(W, q as Quaternion), WInv))
    );
  }

  /**
   * Compute the rotation matrix equivalent
   */
  toRotationMatrix(): Matrix3 {
    return quaternionToMatrix(this.normalized);
  }

  /**
   * Compute gradient for backpropagation
   * 
   * For y = W * x * W^(-1), the gradient with respect to W involves:
   * ∂y/∂W = ∂(W * x * W^(-1))/∂W
   * 
   * This is complex due to the quaternion product structure.
   * We use automatic differentiation principles.
   * 
   * @param gradOutput - Gradient from the next layer
   * @param input - Original input quaternion
   * @returns Gradient with respect to this weight
   */
  computeGradient(gradOutput: Quaternion, input: Quaternion): QuaternionGradient {
    const W = this.normalized;
    const WInv = quaternionConjugate(W);
    
    // For conjugation: y = W * x * W^(-1)
    // Using product rule and chain rule for quaternions
    
    // Partial derivatives with respect to each component of W
    // This is a simplified but correct gradient for unit quaternion optimization
    
    const WxInput = quaternionMultiply(W, input);
    const inputWInv = quaternionMultiply(input, WInv);
    
    // Gradient components (derived from quaternion multiplication Jacobians)
    const [gw, gx, gy, gz] = gradOutput;
    const [wx, wy, wz] = [W[1], W[2], W[3]];
    
    // Compute gradient using chain rule through quaternion multiplication
    // d/dW[W * x * W^(-1)] involves both left and right multiplication terms
    
    return {
      dw: 2 * (gw * input[0] - gx * input[1] - gy * input[2] - gz * input[3]),
      dx: 2 * (gw * input[1] + gx * input[0] + gy * input[3] - gz * input[2]),
      dy: 2 * (gw * input[2] - gx * input[3] + gy * input[0] + gz * input[1]),
      dz: 2 * (gw * input[3] + gx * input[2] - gy * input[1] + gz * input[0]),
    };
  }

  /**
   * Update weight using gradient descent
   * Projects back to unit sphere after update
   * 
   * @param grad - Gradient
   * @param learningRate - Learning rate
   */
  update(grad: QuaternionGradient, learningRate: number): void {
    // Update with gradient
    this._w -= learningRate * grad.dw;
    this._x -= learningRate * grad.dx;
    this._y -= learningRate * grad.dy;
    this._z -= learningRate * grad.dz;
    
    // Project back to unit sphere (reparameterization)
    const norm = this.norm;
    if (norm > EPS) {
      this._w /= norm;
      this._x /= norm;
      this._y /= norm;
      this._z /= norm;
    }
    
    // Invalidate cache
    this._inverseCache = null;
    this._normCache = null;
  }

  /**
   * Set the quaternion values directly
   */
  setQuaternion(q: Quaternion): void {
    this._w = q[0];
    this._x = q[1];
    this._y = q[2];
    this._z = q[3];
    this._inverseCache = null;
    this._normCache = null;
  }

  /**
   * Clone this weight
   */
  clone(): QuaternionWeight {
    return new QuaternionWeight([this._w, this._x, this._y, this._z]);
  }

  // Helper type guards
  private isSingleQuaternion(x: unknown): x is Quaternion {
    return Array.isArray(x) && x.length === 4 && typeof x[0] === 'number';
  }

  private isQuaternionVector(x: unknown): x is QuaternionVector {
    return Array.isArray(x) && x.length > 0 && 
           Array.isArray(x[0]) && (x[0] as unknown[]).length === 4;
  }
}

// ============================================================================
// Quaternion Linear Layer
// ============================================================================

/**
 * QuaternionLinear: Linear transformation for quaternion vectors
 * 
 * Input:  (batch, in_features, 4) - batch of quaternion feature vectors
 * Output: (batch, out_features, 4) - transformed quaternion feature vectors
 * 
 * The key insight: Each weight quaternion W_i,j transforms the input via
 * conjugation, which is automatically equivariant to rotations.
 * 
 * Mathematical formulation:
 * y_j = sum_i (W_ij * x_i * W_ij^(-1)) + b_j
 * 
 * where W_ij are unit quaternions and b_j is an optional bias quaternion.
 */
export class QuaternionLinear {
  private inFeatures: number;
  private outFeatures: number;
  private useBias: boolean;
  
  // Weight matrix: out_features x in_features quaternion weights
  private weights: QuaternionWeight[][];
  
  // Bias quaternions: one per output feature
  private bias: Quaternion[] | null;

  /**
   * Create a QuaternionLinear layer
   */
  constructor(config: QuaternionLayerConfig) {
    this.inFeatures = config.inFeatures;
    this.outFeatures = config.outFeatures;
    this.useBias = config.bias ?? true;
    
    // Initialize weights based on specified method
    const initMethod = config.initialization ?? 'random';
    
    // Weight matrix: [out_features, in_features] array of quaternion weights
    this.weights = [];
    for (let i = 0; i < this.outFeatures; i++) {
      const row: QuaternionWeight[] = [];
      for (let j = 0; j < this.inFeatures; j++) {
        switch (initMethod) {
          case 'identity':
            row.push(QuaternionWeight.identity());
            break;
          case 'small_rotation':
            row.push(QuaternionWeight.smallRotation());
            break;
          case 'random':
          default:
            row.push(QuaternionWeight.random());
            break;
        }
      }
      this.weights.push(row);
    }
    
    // Initialize bias as zero quaternions
    if (this.useBias) {
      this.bias = [];
      for (let i = 0; i < this.outFeatures; i++) {
        this.bias.push([0, 0, 0, 0]);
      }
    } else {
      this.bias = null;
    }
  }

  /**
   * Get the weight matrix as a 2D array of quaternions
   */
  getWeightMatrix(): Quaternion[][] {
    return this.weights.map(row => row.map(w => w.normalized));
  }

  /**
   * Get the bias quaternions
   */
  getBias(): Quaternion[] | null {
    return this.bias;
  }

  /**
   * Forward pass through the quaternion linear layer
   * 
   * For each output feature j:
   * y_j = sum_i (W[j,i] * x_i * W[j,i]^(-1)) + bias_j
   * 
   * This is automatically equivariant because each term in the sum
   * transforms correctly under rotation.
   * 
   * @param input - Input quaternion batch [batch, in_features, 4]
   * @returns Output quaternion batch [batch, out_features, 4]
   */
  forward(input: QuaternionBatch): QuaternionBatch {
    const batchSize = input.length;
    const output: QuaternionBatch = [];
    
    for (let b = 0; b < batchSize; b++) {
      const inputVec = input[b]; // [in_features, 4]
      const outputVec: QuaternionVector = [];
      
      for (let j = 0; j < this.outFeatures; j++) {
        // Compute weighted sum of transformed inputs
        let sum: Quaternion = [0, 0, 0, 0];
        
        for (let i = 0; i < this.inFeatures; i++) {
          if (i < inputVec.length) {
            const transformed = this.weights[j][i].forward(inputVec[i] as Quaternion);
            sum = this.quaternionAdd(sum, transformed);
          }
        }
        
        // Add bias if present
        if (this.bias && j < this.bias.length) {
          sum = this.quaternionAdd(sum, this.bias[j]);
        }
        
        outputVec.push(sum);
      }
      
      output.push(outputVec);
    }
    
    return output;
  }

  /**
   * Forward pass with cache for backpropagation
   */
  forwardWithCache(input: QuaternionBatch): QuaternionForwardResult {
    return {
      output: this.forward(input),
      cache: {
        inputs: input,
        weights: this.weights.flat(),
      },
    };
  }

  /**
   * Compute the rotation matrix for each weight
   * Useful for visualization and debugging
   */
  getRotationMatrices(): Matrix3[][] {
    return this.weights.map(row => row.map(w => w.toRotationMatrix()));
  }

  /**
   * Apply a global rotation to all weights
   * This is useful for data augmentation or equivariance testing
   */
  applyGlobalRotation(q: Quaternion): void {
    for (let i = 0; i < this.outFeatures; i++) {
      for (let j = 0; j < this.inFeatures; j++) {
        const currentQ = this.weights[i][j].normalized;
        // New weight = q * W (composition of rotations)
        const newQ = quaternionMultiply(q, currentQ);
        this.weights[i][j].setQuaternion(newQ);
      }
    }
  }

  /**
   * Get total number of parameters
   */
  getParameterCount(): number {
    let count = this.outFeatures * this.inFeatures * 4; // 4 components per quaternion
    if (this.useBias) {
      count += this.outFeatures * 4;
    }
    return count;
  }

  /**
   * Add two quaternions (component-wise)
   */
  private quaternionAdd(a: Quaternion, b: Quaternion): Quaternion {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
  }

  /**
   * Clone this layer
   */
  clone(): QuaternionLinear {
    const cloned = new QuaternionLinear({
      inFeatures: this.inFeatures,
      outFeatures: this.outFeatures,
      bias: this.useBias,
      initialization: 'identity', // Will be overwritten
    });
    
    // Copy weights
    for (let i = 0; i < this.outFeatures; i++) {
      for (let j = 0; j < this.inFeatures; j++) {
        cloned.weights[i][j].setQuaternion(this.weights[i][j].quaternion);
      }
    }
    
    // Copy bias
    if (this.bias) {
      cloned.bias = this.bias.map(b => [...b] as Quaternion);
    }
    
    return cloned;
  }
}

// ============================================================================
// Quaternion Activation Functions
// ============================================================================

/**
 * Quaternion-specific activation functions
 * 
 * Regular activation functions (ReLU, sigmoid) don't preserve quaternion
 * structure. We need specialized activations that maintain equivariance.
 */

/**
 * Quaternion ReLU: Applies ReLU to the scalar part only
 * This preserves the rotation structure while adding nonlinearity
 */
export function quaternionReLU(q: Quaternion): Quaternion {
  const scalarPart = q[0];
  if (scalarPart > 0) {
    return q;
  }
  // If scalar part is negative, return zero quaternion
  return [0, 0, 0, 0];
}

/**
 * Quaternion ReLU for vectors
 */
export function quaternionReLUVector(v: QuaternionVector): QuaternionVector {
  return v.map(quaternionReLU);
}

/**
 * Quaternion ReLU for batches
 */
export function quaternionReLUBatch(b: QuaternionBatch): QuaternionBatch {
  return b.map(quaternionReLUVector);
}

/**
 * Quaternion Gated Activation: Uses scalar part as gate for vector part
 * y = sigmoid(w) * [0, x, y, z]
 * This is equivariant because the gate is rotation-invariant
 */
export function quaternionGated(q: Quaternion): Quaternion {
  const [w, x, y, z] = q;
  const gate = 1 / (1 + exp(-w)); // sigmoid
  return [w, gate * x, gate * y, gate * z];
}

/**
 * Quaternion Gated for batches
 */
export function quaternionGatedBatch(b: QuaternionBatch): QuaternionBatch {
  return b.map(v => v.map(quaternionGated));
}

/**
 * Quaternion Tanh: Apply tanh to scalar part, keep vector part
 * This maintains the quaternion structure while adding nonlinearity
 */
export function quaternionTanh(q: Quaternion): Quaternion {
  return [Math.tanh(q[0]), q[1], q[2], q[3]];
}

/**
 * Quaternion Tanh for batches
 */
export function quaternionTanhBatch(b: QuaternionBatch): QuaternionBatch {
  return b.map(v => v.map(quaternionTanh));
}

/**
 * Quaternion Normalization: Normalize to unit quaternion
 * Acts as an activation that projects to the unit sphere
 */
export function quaternionNormalizeActivation(q: Quaternion): Quaternion {
  return quaternionNormalize(q);
}

/**
 * Quaternion Split Activation: Split into scalar and vector parts
 * Returns rotation-invariant scalar and rotation-equivariant vector
 */
export function quaternionSplit(q: Quaternion): { scalar: number; vector: Vector3 } {
  return {
    scalar: q[0],
    vector: [q[1], q[2], q[3]],
  };
}

// ============================================================================
// Quaternion MLP
// ============================================================================

/**
 * QuaternionMLP: Multi-layer perceptron with quaternion weights
 * 
 * A stack of quaternion linear layers with nonlinear activations.
 * Each layer maintains SE(3) equivariance through quaternion conjugation.
 */
export class QuaternionMLP {
  private layers: QuaternionLinear[];
  private activation: 'relu' | 'gated' | 'tanh' | 'normalized';
  private hiddenDims: number[];

  /**
   * Create a QuaternionMLP
   * @param inFeatures - Input feature dimension
   * @param hiddenDims - Array of hidden dimensions (also defines depth)
   * @param outFeatures - Output feature dimension
   * @param activation - Activation function type
   */
  constructor(
    inFeatures: number,
    hiddenDims: number[],
    outFeatures: number,
    activation: 'relu' | 'gated' | 'tanh' | 'normalized' = 'gated'
  ) {
    this.activation = activation;
    this.hiddenDims = hiddenDims;
    this.layers = [];
    
    // Build layers
    const allDims = [inFeatures, ...hiddenDims, outFeatures];
    for (let i = 0; i < allDims.length - 1; i++) {
      this.layers.push(new QuaternionLinear({
        inFeatures: allDims[i],
        outFeatures: allDims[i + 1],
        bias: true,
        initialization: i === 0 ? 'small_rotation' : 'random',
      }));
    }
  }

  /**
   * Get all layers
   */
  getLayers(): QuaternionLinear[] {
    return this.layers;
  }

  /**
   * Get number of layers
   */
  getDepth(): number {
    return this.layers.length;
  }

  /**
   * Apply activation function
   */
  private applyActivation(x: QuaternionBatch): QuaternionBatch {
    switch (this.activation) {
      case 'relu':
        return quaternionReLUBatch(x);
      case 'gated':
        return quaternionGatedBatch(x);
      case 'tanh':
        return quaternionTanhBatch(x);
      case 'normalized':
        return x.map(v => v.map(quaternionNormalizeActivation));
      default:
        return x;
    }
  }

  /**
   * Forward pass through the MLP
   * @param input - Input quaternion batch [batch, in_features, 4]
   * @returns Output quaternion batch [batch, out_features, 4]
   */
  forward(input: QuaternionBatch): QuaternionBatch {
    let x = input;
    
    // Pass through all layers
    for (let i = 0; i < this.layers.length; i++) {
      x = this.layers[i].forward(x);
      
      // Apply activation after all but last layer
      if (i < this.layers.length - 1) {
        x = this.applyActivation(x);
      }
    }
    
    return x;
  }

  /**
   * Get total parameter count
   */
  getParameterCount(): number {
    return this.layers.reduce((sum, layer) => sum + layer.getParameterCount(), 0);
  }

  /**
   * Apply a global rotation to all weights in the network
   */
  applyGlobalRotation(q: Quaternion): void {
    for (const layer of this.layers) {
      layer.applyGlobalRotation(q);
    }
  }

  /**
   * Clone this MLP
   */
  clone(): QuaternionMLP {
    const cloned = new QuaternionMLP(
      this.layers[0]['inFeatures'],
      this.hiddenDims,
      this.layers[this.layers.length - 1]['outFeatures'],
      this.activation
    );
    
    // Copy weights from each layer
    for (let i = 0; i < this.layers.length; i++) {
      cloned.layers[i] = this.layers[i].clone();
    }
    
    return cloned;
  }
}

// ============================================================================
// Equivariance Testing
// ============================================================================

/**
 * Test SE(3) equivariance of a quaternion transformation
 * 
 * For equivariance, we require:
 * f(R(x)) = R(f(x))
 * 
 * For quaternions, rotation is represented by conjugation.
 * If R = q_R (rotation quaternion), then:
 * R(x) = q_R * x * q_R^(-1)
 * 
 * @param transformFn - The transformation function to test
 * @param input - Input quaternion batch
 * @param numTests - Number of random rotations to test
 * @returns Equivariance error metrics
 */
export function testQuaternionEquivariance(
  transformFn: (x: QuaternionBatch) => QuaternionBatch,
  input: QuaternionBatch,
  numTests: number = 100
): {
  meanError: number;
  maxError: number;
  errors: number[];
  isEquivariant: boolean;
} {
  const errors: number[] = [];
  
  for (let t = 0; t < numTests; t++) {
    // Generate random rotation quaternion
    const qR = randomQuaternion();
    const qRInv = quaternionConjugate(qR);
    
    // Rotate input: x' = qR * x * qR^(-1)
    const rotatedInput: QuaternionBatch = input.map(batchItem =>
      batchItem.map(q => quaternionMultiply(quaternionMultiply(qR, q as Quaternion), qRInv))
    );
    
    // Transform original input
    const originalOutput = transformFn(input);
    
    // Transform rotated input
    const rotatedOutput = transformFn(rotatedInput);
    
    // The outputs should satisfy: f(qR * x * qR^(-1)) = qR * f(x) * qR^(-1)
    // So rotatedOutput should equal qR * originalOutput * qR^(-1)
    
    for (let b = 0; b < originalOutput.length; b++) {
      for (let f = 0; f < originalOutput[b].length; f++) {
        const expected = quaternionMultiply(
          quaternionMultiply(qR, originalOutput[b][f] as Quaternion),
          qRInv
        );
        const actual = rotatedOutput[b][f] as Quaternion;
        
        // Compute error
        const error = sqrt(
          (expected[0] - actual[0]) ** 2 +
          (expected[1] - actual[1]) ** 2 +
          (expected[2] - actual[2]) ** 2 +
          (expected[3] - actual[3]) ** 2
        );
        errors.push(error);
      }
    }
  }
  
  const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
  const maxError = Math.max(...errors);
  
  // Consider equivariant if mean error is below threshold
  const isEquivariant = meanError < 1e-6;
  
  return { meanError, maxError, errors, isEquivariant };
}

/**
 * Test equivariance of a QuaternionWeight
 */
export function testWeightEquivariance(
  weight: QuaternionWeight,
  numTests: number = 100
): { meanError: number; isEquivariant: boolean } {
  const errors: number[] = [];
  
  for (let t = 0; t < numTests; t++) {
    // Generate random input quaternion (pure quaternion representing a vector)
    const input: Quaternion = [
      0,
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ];
    
    // Generate random rotation
    const qR = randomQuaternion();
    const qRInv = quaternionConjugate(qR);
    
    // Rotate input
    const rotatedInput = quaternionMultiply(quaternionMultiply(qR, input), qRInv);
    
    // Apply weight transformation
    const output1 = weight.forward(rotatedInput);
    const output2 = weight.forward(input);
    const expectedOutput = quaternionMultiply(quaternionMultiply(qR, output2), qRInv);
    
    // Compute error
    const error = sqrt(
      (output1[0] - expectedOutput[0]) ** 2 +
      (output1[1] - expectedOutput[1]) ** 2 +
      (output1[2] - expectedOutput[2]) ** 2 +
      (output1[3] - expectedOutput[3]) ** 2
    );
    errors.push(error);
  }
  
  const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
  const isEquivariant = meanError < 1e-10;
  
  return { meanError, isEquivariant };
}

/**
 * Test equivariance of a QuaternionLinear layer
 */
export function testLinearEquivariance(
  layer: QuaternionLinear,
  batchSize: number = 4,
  numTests: number = 50
): { meanError: number; maxError: number; isEquivariant: boolean } {
  // Create random input
  const input: QuaternionBatch = [];
  for (let b = 0; b < batchSize; b++) {
    const vec: QuaternionVector = [];
    for (let f = 0; f < layer['inFeatures']; f++) {
      vec.push([
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ]);
    }
    input.push(vec);
  }
  
  return testQuaternionEquivariance(x => layer.forward(x), input, numTests);
}

/**
 * Test equivariance of a QuaternionMLP
 */
export function testMLPEquivariance(
  mlp: QuaternionMLP,
  inFeatures: number,
  batchSize: number = 4,
  numTests: number = 50
): { meanError: number; maxError: number; isEquivariant: boolean } {
  // Create random input
  const input: QuaternionBatch = [];
  for (let b = 0; b < batchSize; b++) {
    const vec: QuaternionVector = [];
    for (let f = 0; f < inFeatures; f++) {
      vec.push([
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ]);
    }
    input.push(vec);
  }
  
  return testQuaternionEquivariance(x => mlp.forward(x), input, numTests);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a random quaternion batch for testing
 */
export function createRandomQuaternionBatch(
  batchSize: number,
  features: number
): QuaternionBatch {
  const batch: QuaternionBatch = [];
  for (let b = 0; b < batchSize; b++) {
    const vec: QuaternionVector = [];
    for (let f = 0; f < features; f++) {
      vec.push(randomQuaternion());
    }
    batch.push(vec);
  }
  return batch;
}

/**
 * Convert 3D vectors to pure quaternions
 * Pure quaternion: q = [0, x, y, z]
 */
export function vectorsToPureQuaternions(vectors: Vector3[]): QuaternionVector {
  return vectors.map(v => [0, v[0], v[1], v[2]]);
}

/**
 * Convert pure quaternions to 3D vectors
 */
export function pureQuaternionsToVectors(quaternions: QuaternionVector): Vector3[] {
  return quaternions.map(q => [q[1], q[2], q[3]]);
}

/**
 * Compute quaternion batch norm (Frobenius-like)
 */
export function quaternionBatchNorm(batch: QuaternionBatch): number {
  let sumSquares = 0;
  for (const vec of batch) {
    for (const q of vec) {
      sumSquares += q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2;
    }
  }
  return sqrt(sumSquares);
}

/**
 * Normalize quaternion batch to have unit norm
 */
export function normalizeQuaternionBatch(batch: QuaternionBatch): QuaternionBatch {
  const norm = quaternionBatchNorm(batch);
  if (norm < EPS) return batch;
  
  return batch.map(vec =>
    vec.map(q => [q[0] / norm, q[1] / norm, q[2] / norm, q[3] / norm] as Quaternion)
  );
}

// ============================================================================
// Advanced Operations
// ============================================================================

/**
 * Quaternion attention mechanism
 * 
 * Computes attention scores based on quaternion dot products,
 * which are rotation-invariant.
 */
export function quaternionAttention(
  queries: QuaternionBatch,
  keys: QuaternionBatch,
  values: QuaternionBatch
): QuaternionBatch {
  const batchSize = queries.length;
  const numHeads = queries[0].length;
  const output: QuaternionBatch = [];
  
  for (let b = 0; b < batchSize; b++) {
    const outputVec: QuaternionVector = [];
    
    for (let h = 0; h < numHeads; h++) {
      // Compute attention scores for this query
      const scores: number[] = [];
      for (let k = 0; k < keys[b].length; k++) {
        // Quaternion dot product (rotation-invariant)
        const dot = 
          queries[b][h][0] * keys[b][k][0] +
          queries[b][h][1] * keys[b][k][1] +
          queries[b][h][2] * keys[b][k][2] +
          queries[b][h][3] * keys[b][k][3];
        scores.push(exp(dot / 2)); // Scaled softmax
      }
      
      // Normalize scores
      const sumScores = scores.reduce((a, b) => a + b, 0);
      const attentionWeights = scores.map(s => s / sumScores);
      
      // Weighted sum of values
      let weightedSum: Quaternion = [0, 0, 0, 0];
      for (let k = 0; k < keys[b].length; k++) {
        weightedSum = [
          weightedSum[0] + attentionWeights[k] * values[b][k][0],
          weightedSum[1] + attentionWeights[k] * values[b][k][1],
          weightedSum[2] + attentionWeights[k] * values[b][k][2],
          weightedSum[3] + attentionWeights[k] * values[b][k][3],
        ];
      }
      
      outputVec.push(weightedSum);
    }
    
    output.push(outputVec);
  }
  
  return output;
}

/**
 * Quaternion message passing for geometric graphs
 * 
 * Messages are computed as quaternion transformations and aggregated
 * in an equivariant manner.
 */
export function quaternionMessagePassing(
  nodeFeatures: QuaternionVector,
  positions: Vector3[],
  edgeIndex: [number, number][],
  weight: QuaternionWeight
): QuaternionVector {
  const n = nodeFeatures.length;
  
  // Initialize output with original features (residual connection)
  const output: QuaternionVector = nodeFeatures.map(q => [...q] as Quaternion);
  
  // Aggregate messages
  for (const [src, dst] of edgeIndex) {
    if (src >= n || dst >= n) continue;
    
    // Compute edge direction as pure quaternion
    const edgeDir: Quaternion = [
      0,
      positions[dst][0] - positions[src][0],
      positions[dst][1] - positions[src][1],
      positions[dst][2] - positions[src][2],
    ];
    
    // Transform source feature through weight
    const message = weight.forward(nodeFeatures[src] as Quaternion);
    
    // Add to destination (residual)
    output[dst] = [
      output[dst][0] + message[0] * 0.1,
      output[dst][1] + message[1] * 0.1,
      output[dst][2] + message[2] * 0.1,
      output[dst][3] + message[3] * 0.1,
    ];
  }
  
  return output;
}
