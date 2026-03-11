/**
 * Geometric Tensor Operations - WGSL Shader Library
 *
 * Implements GPU-accelerated geometric tensor computations:
 * 1. Pythagorean Tensor Operations (3-4-5, 5-12-13, 8-15-17 triangles)
 * 2. Wigner-D Harmonic Evaluations for SO(3) group
 * 3. Tensor Contractions and Expansions
 * 4. Geometric Transformations and Rotations
 *
 * Based on POLLN Geometric Tensor Mathematics Philosophy:
 * - Permutations, Folds, and Spin relationships
 * - Pythagorean Prime Numbers as "easy snaps" for calculation
 * - Reality-Bending SuperInstance mathematics
 */

// ============================================================================
// STRUCTURES AND TYPES
// ============================================================================

/**
 * Pythagorean Triple - Whole number right triangle
 * Used for geometric "easy snaps" in calculations
 */
struct PythagoreanTriple {
  a: f32,
  b: f32,
  c: f32,  // Hypotenuse
  angle: f32  // Angle opposite side a (in radians)
};

/**
 * Geometric Tensor - Multi-dimensional geometric data
 */
struct GeometricTensor {
  // Tensor dimensions
  rank: u32,
  shape: array<u32, 4>,  // Up to 4 dimensions

  // Data storage (flattened)
  data: array<f32>,

  // Geometric properties
  metric: array<f32, 16>,  // 4x4 metric tensor (for up to 4D)
  curvature: f32,
  symmetry_group: u32
};

/**
 * WignerDParams - Parameters for Wigner-D matrix computation
 */
struct WignerDParams {
  j: f32,      // Total angular momentum
  m: f32,      // Magnetic quantum number (row)
  mp: f32,     // Magnetic quantum number (column)
  alpha: f32,  // Euler angle α (rotation about z)
  beta: f32,   // Euler angle β (rotation about y)
  gamma: f32   // Euler angle γ (rotation about z)
};

/**
 * SO3Rotation - Rotation in 3D space
 */
struct SO3Rotation {
  quaternion: vec4<f32>,  // (x, y, z, w) quaternion representation
  matrix: mat3x3<f32>,    // 3x3 rotation matrix
  euler_angles: vec3<f32> // (α, β, γ) Euler angles
};

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Common Pythagorean Triples with their angles (in radians)
 * These provide "easy snaps" for geometric calculations
 */
const PYTHAGOREAN_TRIPLES: array<PythagoreanTriple, 8> = array<PythagoreanTriple, 8>(
  // Classic triples
  PythagoreanTriple(3.0, 4.0, 5.0, 0.643501),      // ~36.87°
  PythagoreanTriple(5.0, 12.0, 13.0, 0.394791),    // ~22.62°
  PythagoreanTriple(8.0, 15.0, 17.0, 0.489957),    // ~28.07°
  PythagoreanTriple(7.0, 24.0, 25.0, 0.283794),    // ~16.26°

  // Scaled triples
  PythagoreanTriple(6.0, 8.0, 10.0, 0.643501),     // Scaled 3-4-5
  PythagoreanTriple(9.0, 12.0, 15.0, 0.643501),    // Scaled 3-4-5
  PythagoreanTriple(10.0, 24.0, 26.0, 0.394791),   // Scaled 5-12-13
  PythagoreanTriple(16.0, 30.0, 34.0, 0.489957)    // Scaled 8-15-17
);

/**
 * Mathematical constants
 */
const PI: f32 = 3.141592653589793;
const TWO_PI: f32 = 6.283185307179586;
const HALF_PI: f32 = 1.5707963267948966;
const SQRT2: f32 = 1.4142135623730951;
const SQRT3: f32 = 1.7320508075688772;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Factorial function (approximation for small n)
 */
fn factorial(n: u32) -> f32 {
  var result: f32 = 1.0;
  for (var i: u32 = 2; i <= n; i = i + 1) {
    result = result * f32(i);
  }
  return result;
}

/**
 * Binomial coefficient C(n, k)
 */
fn binomial_coefficient(n: u32, k: u32) -> f32 {
  if (k > n) {
    return 0.0;
  }
  if (k == 0 || k == n) {
    return 1.0;
  }

  // Use multiplicative formula for efficiency
  var result: f32 = 1.0;
  for (var i: u32 = 1; i <= k; i = i + 1) {
    result = result * f32(n - k + i) / f32(i);
  }
  return result;
}

/**
 * Associated Legendre polynomial P_l^m(x)
 */
fn associated_legendre(l: i32, m: i32, x: f32) -> f32 {
  // Handle invalid cases
  if (abs(m) > l) {
    return 0.0;
  }

  // Compute using recurrence relations
  var pmm: f32 = 1.0;
  if (m > 0) {
    var somx2: f32 = sqrt((1.0 - x) * (1.0 + x));
    var fact: f32 = 1.0;
    for (var i: u32 = 1; i <= u32(m); i = i + 1) {
      pmm = pmm * (-fact) * somx2;
      fact = fact + 2.0;
    }
  }

  if (l == m) {
    return pmm;
  }

  var pmmp1: f32 = x * f32(2 * m + 1) * pmm;
  if (l == m + 1) {
    return pmmp1;
  }

  var pll: f32 = 0.0;
  for (var ll: i32 = m + 2; ll <= l; ll = ll + 1) {
    pll = (f32(2 * ll - 1) * x * pmmp1 - f32(ll + m - 1) * pmm) / f32(ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }

  return pll;
}

/**
 * Spherical harmonic Y_l^m(theta, phi)
 */
fn spherical_harmonic(l: i32, m: i32, theta: f32, phi: f32) -> vec2<f32> {
  // Normalization constant
  var norm: f32 = sqrt(f32(2 * l + 1) * factorial(u32(l - abs(m))) /
                       (4.0 * PI * factorial(u32(l + abs(m)))));

  // Associated Legendre polynomial
  var plm: f32 = associated_legendre(l, m, cos(theta));

  // Complex exponential
  var exp_imphi: vec2<f32> = vec2<f32>(cos(f32(m) * phi), sin(f32(m) * phi));

  // Phase factor (-1)^m for m >= 0
  var phase: f32 = 1.0;
  if (m > 0) {
    phase = select(1.0, -1.0, (u32(m) % 2u) == 1u);
  }

  var result_real: f32 = norm * plm * phase * exp_imphi.x;
  var result_imag: f32 = norm * plm * phase * exp_imphi.y;

  // For negative m, use conjugate relationship
  if (m < 0) {
    var conjugate_phase: f32 = select(1.0, -1.0, (u32(-m) % 2u) == 1u);
    result_real = result_real * conjugate_phase;
    result_imag = -result_imag * conjugate_phase;
  }

  return vec2<f32>(result_real, result_imag);
}

// ============================================================================
// PYTHAGOREAN TENSOR OPERATIONS
// ============================================================================

/**
 * Find closest Pythagorean triple for a given angle
 * Returns the triple that best approximates the target angle
 */
fn find_pythagorean_triple(target_angle: f32) -> PythagoreanTriple {
  var best_triple: PythagoreanTriple = PYTHAGOREAN_TRIPLES[0];
  var best_error: f32 = abs(target_angle - best_triple.angle);

  for (var i: u32 = 1; i < arrayLength(&PYTHAGOREAN_TRIPLES); i = i + 1) {
    var triple: PythagoreanTriple = PYTHAGOREAN_TRIPLES[i];
    var error: f32 = abs(target_angle - triple.angle);

    if (error < best_error) {
      best_error = error;
      best_triple = triple;
    }
  }

  return best_triple;
}

/**
 * Compute Pythagorean tensor contraction
 * Contracts tensors using Pythagorean triple relationships
 */
fn pythagorean_tensor_contraction(
  tensor_a: ptr<function, array<f32>>,
  tensor_b: ptr<function, array<f32>>,
  shape_a: vec3<u32>,
  shape_b: vec3<u32>,
  contraction_dims: vec2<u32>
) -> array<f32> {
  // Result shape: remove contracted dimensions
  var result_shape: vec2<u32> = vec2<u32>(
    shape_a.x * shape_a.y * shape_a.z / (shape_a.x * shape_a.y),
    shape_b.x * shape_b.y * shape_b.z / (shape_b.x * shape_b.y)
  );

  var result_size: u32 = result_shape.x * result_shape.y;
  var result: array<f32, 1024>; // Fixed size for WGSL

  // Initialize result to zero
  for (var i: u32 = 0; i < result_size; i = i + 1) {
    result[i] = 0.0;
  }

  // Perform contraction with Pythagorean scaling
  for (var i: u32 = 0; i < shape_a.x; i = i + 1) {
    for (var j: u32 = 0; j < shape_a.y; j = j + 1) {
      for (var k: u32 = 0; k < shape_a.z; k = k + 1) {
        var idx_a: u32 = i * shape_a.y * shape_a.z + j * shape_a.z + k;
        var val_a: f32 = tensor_a[idx_a];

        // Find Pythagorean scaling factor based on indices
        var angle: f32 = f32(i + j + k) * 0.1;
        var triple: PythagoreanTriple = find_pythagorean_triple(angle);
        var scale_factor: f32 = triple.c / (triple.a + triple.b);

        // Apply contraction
        for (var l: u32 = 0; l < shape_b.x; l = l + 1) {
          for (var m: u32 = 0; m < shape_b.y; m = m + 1) {
            for (var n: u32 = 0; n < shape_b.z; n = n + 1) {
              var idx_b: u32 = l * shape_b.y * shape_b.z + m * shape_b.z + n;
              var val_b: f32 = tensor_b[idx_b];

              // Compute result index (simplified)
              var idx_result: u32 = (i * shape_b.y + m) % result_size;
              result[idx_result] = result[idx_result] + val_a * val_b * scale_factor;
            }
          }
        }
      }
    }
  }

  return result;
}

// ============================================================================
// WIGNER-D HARMONIC COMPUTATIONS
// ============================================================================

/**
 * Compute Wigner-D matrix element D^j_{m,m'}(α, β, γ)
 * Using explicit formula with binomial coefficients
 */
fn wigner_d_element(params: WignerDParams) -> vec2<f32> {
  var j: f32 = params.j;
  var m: f32 = params.m;
  var mp: f32 = params.mp;
  var alpha: f32 = params.alpha;
  var beta: f32 = params.beta;
  var gamma: f32 = params.gamma;

  // Precompute trigonometric functions
  var cos_half_beta: f32 = cos(beta * 0.5);
  var sin_half_beta: f32 = sin(beta * 0.5);
  var exp_i_alpha: vec2<f32> = vec2<f32>(cos(alpha), sin(alpha));
  var exp_i_gamma: vec2<f32> = vec2<f32>(cos(gamma), sin(gamma));

  // Sum over k
  var result_real: f32 = 0.0;
  var result_imag: f32 = 0.0;

  var k_min: i32 = i32(max(0.0, mp - m));
  var k_max: i32 = i32(min(j - m, j + mp));

  for (var k: i32 = k_min; k <= k_max; k = k + 1) {
    // Binomial coefficient terms
    var term1: f32 = sqrt(
      binomial_coefficient(u32(j + m), u32(k)) *
      binomial_coefficient(u32(j - m), u32(i32(j + mp) - k))
    );

    var term2: f32 = pow(cos_half_beta, f32(2 * j + m - mp - 2 * k));
    var term3: f32 = pow(-sin_half_beta, f32(mp - m + 2 * k));

    var phase: f32 = select(1.0, -1.0, (u32(k) % 2u) == 1u);

    var amplitude: f32 = term1 * term2 * term3 * phase;

    // Complex phase from alpha and gamma
    var total_phase: f32 = -m * alpha - mp * gamma;
    var phase_real: f32 = cos(total_phase);
    var phase_imag: f32 = sin(total_phase);

    result_real = result_real + amplitude * phase_real;
    result_imag = result_imag + amplitude * phase_imag;
  }

  // Overall normalization
  var norm: f32 = sqrt(
    factorial(u32(j + m)) *
    factorial(u32(j - m)) *
    factorial(u32(j + mp)) *
    factorial(u32(j - mp))
  );

  result_real = result_real * norm;
  result_imag = result_imag * norm;

  return vec2<f32>(result_real, result_imag);
}

/**
 * Compute full Wigner-D matrix for given j and Euler angles
 */
fn compute_wigner_d_matrix(
  j: f32,
  alpha: f32,
  beta: f32,
  gamma: f32
) -> array<vec2<f32>, 256> {  // Fixed size for (2j+1)^2 elements
  var dim: i32 = i32(2.0 * j + 1.0);
  var matrix: array<vec2<f32>, 256>;

  for (var m_idx: i32 = 0; m_idx < dim; m_idx = m_idx + 1) {
    for (var mp_idx: i32 = 0; mp_idx < dim; mp_idx = mp_idx + 1) {
      var m: f32 = f32(m_idx) - j;
      var mp: f32 = f32(mp_idx) - j;

      var params: WignerDParams;
      params.j = j;
      params.m = m;
      params.mp = mp;
      params.alpha = alpha;
      params.beta = beta;
      params.gamma = gamma;

      var idx: u32 = u32(m_idx * dim + mp_idx);
      matrix[idx] = wigner_d_element(params);
    }
  }

  return matrix;
}

// ============================================================================
// TENSOR OPERATIONS
// ============================================================================

/**
 * Tensor contraction along specified dimensions
 */
fn tensor_contraction(
  tensor: ptr<function, array<f32>>,
  shape: vec3<u32>,
  dim1: u32,
  dim2: u32
) -> array<f32> {
  // Simplified 2D contraction for demonstration
  var result_size: u32 = shape.x * shape.y;
  var result: array<f32, 256>;

  for (var i: u32 = 0; i < result_size; i = i + 1) {
    result[i] = 0.0;
  }

  // Perform contraction (sum over last dimension)
  for (var i: u32 = 0; i < shape.x; i = i + 1) {
    for (var j: u32 = 0; j < shape.y; j = j + 1) {
      var sum: f32 = 0.0;
      for (var k: u32 = 0; k < shape.z; k = k + 1) {
        var idx: u32 = i * shape.y * shape.z + j * shape.z + k;
        sum = sum + tensor[idx];
      }
      result[i * shape.y + j] = sum;
    }
  }

  return result;
}

/**
 * Tensor product (outer product)
 */
fn tensor_product(
  tensor_a: ptr<function, array<f32>>,
  tensor_b: ptr<function, array<f32>>,
  size_a: u32,
  size_b: u32
) -> array<f32> {
  var result_size: u32 = size_a * size_b;
  var result: array<f32, 1024>;

  for (var i: u32 = 0; i < size_a; i = i + 1) {
    for (var j: u32 = 0; j < size_b; j = j + 1) {
      result[i * size_b + j] = tensor_a[i] * tensor_b[j];
    }
  }

  return result;
}

// ============================================================================
// COMPUTE SHADERS
// ============================================================================

/**
 * Compute shader for Pythagorean tensor operations
 */
@group(0) @binding(0)
var<storage, read_write> input_tensor: array<f32>;

@group(0) @binding(1)
var<storage, read_write> output_tensor: array<f32>;

@group(0) @binding(2)
var<uniform> params: vec4<f32>;  // x: operation_type, y: angle, z: scale, w: unused

@compute @workgroup_size(64)
fn pythagorean_tensor_transform(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx: u32 = global_id.x;

  if (idx >= arrayLength(&input_tensor)) {
    return;
  }

  let operation_type: u32 = u32(params.x);
  let angle: f32 = params.y;
  let scale: f32 = params.z;

  var input_value: f32 = input_tensor[idx];
  var output_value: f32 = 0.0;

  // Find closest Pythagorean triple
  var triple: PythagoreanTriple = find_pythagorean_triple(angle);

  // Apply transformation based on operation type
  if (operation_type == 0u) {
    // Scale by Pythagorean ratio
    output_value = input_value * (triple.c / triple.a) * scale;
  } else if (operation_type == 1u) {
    // Apply angle-based transformation
    output_value = input_value * cos(triple.angle) * scale;
  } else if (operation_type == 2u) {
    // Pythagorean normalization
    output_value = input_value / sqrt(triple.a * triple.a + triple.b * triple.b) * scale;
  }

  output_tensor[idx] = output_value;
}

/**
 * Compute shader for Wigner-D matrix multiplication
 */
@group(0) @binding(0)
var<storage, read_write> input_vector: array<vec2<f32>>;

@group(0) @binding(1)
var<storage, read_write> output_vector: array<vec2<f32>>;

@group(0) @binding(2)
var<uniform> wigner_params: vec4<f32>;  // x: j, y: alpha, z: beta, w: gamma

@compute @workgroup_size(64)
fn wigner_transform(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx: u32 = global_id.x;
  let j: f32 = wigner_params.x;
  let dim: i32 = i32(2.0 * j + 1.0);

  if (idx >= u32(dim)) {
    return;
  }

  // Compute Wigner-D matrix row
  var result_real: f32 = 0.0;
  var result_imag: f32 = 0.0;

  for (var col: i32 = 0; col < dim; col = col + 1) {
    var m: f32 = f32(idx) - j;
    var mp: f32 = f32(col) - j;

    var params: WignerDParams;
    params.j = j;
    params.m = m;
    params.mp = mp;
    params.alpha = wigner_params.y;
    params.beta = wigner_params.z;
    params.gamma = wigner_params.w;

    var matrix_element: vec2<f32> = wigner_d_element(params);
    var input_element: vec2<f32> = input_vector[u32(col)];

    // Complex multiplication: (a+bi)*(c+di) = (ac-bd) + (ad+bc)i
    result_real = result_real + matrix_element.x * input_element.x - matrix_element.y * input_element.y;
    result_imag = result_imag + matrix_element.x * input_element.y + matrix_element.y * input_element.x;
  }

  output_vector[idx] = vec2<f32>(result_real, result_imag);
}

/**
 * Compute shader for tensor contractions
 */
@group(0) @binding(0)
var<storage, read_write> tensor_a: array<f32>;

@group(0) @binding(1)
var<storage, read_write> tensor_b: array<f32>;

@group(0) @binding(2)
var<storage, read_write> result_tensor: array<f32>;

@group(0) @binding(3)
var<uniform> contraction_params: vec4<u32>;  // x: size_a, y: size_b, z: result_size, w: operation

@compute @workgroup_size(64)
fn tensor_contraction_kernel(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx: u32 = global_id.x;
  let size_a: u32 = contraction_params.x;
  let size_b: u32 = contraction_params.y;
  let result_size: u32 = contraction_params.z;
  let operation: u32 = contraction_params.w;

  if (idx >= result_size) {
    return;
  }

  // Map 1D index to 2D indices for contraction
  let i: u32 = idx / size_b;
  let j: u32 = idx % size_b;

  var sum: f32 = 0.0;

  if (operation == 0u) {
    // Dot product-like contraction
    for (var k: u32 = 0; k < min(size_a, size_b); k = k + 1) {
      sum = sum + tensor_a[i * size_b + k] * tensor_b[k * size_b + j];
    }
  } else if (operation == 1u) {
    // Outer product
    sum = tensor_a[i] * tensor_b[j];
  } else if (operation == 2u) {
    // Element-wise multiplication with Pythagorean scaling
    let angle: f32 = f32(i + j) * 0.01;
    let triple: PythagoreanTriple = find_pythagorean_triple(angle);
    let scale: f32 = triple.c / (triple.a + triple.b);

    sum = tensor_a[i] * tensor_b[j] * scale;
  }

  result_tensor[idx] = sum;
}

// ============================================================================
// MAIN ENTRY POINTS FOR DIFFERENT OPERATIONS
// ============================================================================

/**
 * Main entry point for geometric tensor pipeline
 * Dispatches to appropriate kernel based on operation type
 */
fn dispatch_geometric_operation(operation_type: u32) {
  // This function would be called from host code to set up dispatch
  // The actual dispatch happens in the host-side TypeScript code
}

/**
 * Utility to flatten tensor indices
 */
fn flatten_index(indices: vec3<u32>, strides: vec3<u32>) -> u32 {
  return indices.x * strides.x + indices.y * strides.y + indices.z * strides.z;
}

/**
 * Utility to unflatten index
 */
fn unflatten_index(flat_idx: u32, strides: vec3<u32>) -> vec3<u32> {
  var z: u32 = flat_idx % strides.z;
  var y: u32 = (flat_idx / strides.z) % strides.y;
  var x: u32 = flat_idx / (strides.y * strides.z);
  return vec3<u32>(x, y, z);
}