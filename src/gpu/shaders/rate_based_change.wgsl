/**
 * Rate-Based Change Mechanics - WGSL Shader Library
 *
 * Implements GPU-accelerated rate-based change operations:
 * 1. Parallel Rate Calculation (r = Δx/Δt)
 * 2. Parallel Acceleration Calculation (a = Δr/Δt)
 * 3. Deadband Evaluation for Rate Anomaly Detection
 * 4. Batch State Reconstruction from Rates (x(t) = x₀ + ∫r(τ)dτ)
 * 5. Higher-Order Rate Analysis (jerk, snap, crackle, pop)
 *
 * Based on POLLN Rate-Based Change Mechanics White Paper:
 * - Mathematical foundation: x(t) = x₀ + ∫r(τ)dτ
 * - Discrete approximation: x_{n+1} = x_n + r_n Δt + O(Δt²)
 * - Rate deadbands: [r_min, r_max] for anomaly detection
 * - Higher-order rates: acceleration, jerk, snap, etc.
 */

// ============================================================================
// STRUCTURES AND TYPES
// ============================================================================

/**
 * Rate Measurement - Represents a rate value with metadata
 */
struct RateMeasurement {
  value: f32,           // Rate value (Δx/Δt)
  timestamp: f32,       // Measurement timestamp (ms)
  uncertainty: f32,     // Measurement uncertainty [0, 1]
  confidence: f32,      // Confidence in measurement [0, 1]
  cell_id: u32          // Source cell identifier
};

/**
 * Acceleration Measurement - Second-order rate
 */
struct AccelerationMeasurement {
  value: f32,           // Acceleration value (Δr/Δt)
  timestamp: f32,       // Measurement timestamp
  rate_id: u32,         // Source rate measurement ID
  confidence: f32       // Confidence in measurement
};

/**
 * Deadband Configuration - Rate anomaly detection thresholds
 */
struct DeadbandConfig {
  lower_threshold: f32,   // r_min (lower bound)
  upper_threshold: f32,   // r_max (upper bound)
  hysteresis: f32,        // Hysteresis width for state changes
  adaptation_rate: f32,   // Rate for adaptive deadbands (0-1)
  anomaly_score: f32      // Current anomaly score [0, 1]
};

/**
 * Rate History - Time series of rate measurements
 */
struct RateHistory {
  measurements: array<RateMeasurement, 32>,  // Circular buffer of rates
  count: u32,                                // Number of valid measurements
  head: u32,                                 // Index of most recent measurement
  tail: u32,                                 // Index of oldest measurement
  mean_rate: f32,                            // Exponential moving average
  variance: f32,                             // Rate variance
  last_update: f32                           // Timestamp of last update
};

/**
 * Cell Rate State - Complete rate state for a cell
 */
struct CellRateState {
  cell_id: u32,                 // Cell identifier
  current_value: f32,           // Current cell value (x_n)
  current_rate: f32,            // Current rate (r_n)
  current_acceleration: f32,    // Current acceleration (a_n)
  deadband: DeadbandConfig,     // Deadband configuration
  history: RateHistory,         // Rate history
  state_reconstructed: f32,     // State reconstructed from rates
  reconstruction_error: f32,    // Error between actual and reconstructed state
  anomaly_detected: u32         // 1 if anomaly detected, 0 otherwise
};

/**
 * Batch Rate System - For parallel processing of multiple cells
 */
struct BatchRateSystem {
  num_cells: u32,
  cells: array<CellRateState, 1024>,  // Up to 1024 cells
  time_step: f32,                     // Discrete time step (ms)
  decay_rate: f32,                    // Rate decay for adaptive deadbands
  learning_rate: f32,                 // Learning rate for statistics
  max_history_length: u32             // Maximum history length per cell
};

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Rate calculation modes
 */
const RATE_MODE_FORWARD_DIFFERENCE: u32 = 0u;
const RATE_MODE_BACKWARD_DIFFERENCE: u32 = 1u;
const RATE_MODE_CENTRAL_DIFFERENCE: u32 = 2u;
const RATE_MODE_HIGH_ORDER: u32 = 3u;

/**
 * Reconstruction methods
 */
const RECONSTRUCTION_EULER: u32 = 0u;
const RECONSTRUCTION_MIDPOINT: u32 = 1u;
const RECONSTRUCTION_RUNGE_KUTTA_4: u32 = 2u;
const RECONSTRECTION_ADAPTIVE: u32 = 3u;

/**
 * Deadband adaptation modes
 */
const DEADBAND_STATIC: u32 = 0u;
const DEADBAND_ADAPTIVE_MEAN: u32 = 1u;
const DEADBAND_ADAPTIVE_VARIANCE: u32 = 2u;
const DEADBAND_ADAPTIVE_BOTH: u32 = 3u;

/**
 * Mathematical constants
 */
const PI: f32 = 3.141592653589793;
const E: f32 = 2.718281828459045;
const SQRT2: f32 = 1.4142135623730951;
const SQRT2PI: f32 = 2.5066282746310002;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate forward difference rate: r_n = (x_n - x_{n-1}) / (t_n - t_{n-1})
 */
fn calculate_forward_difference(
  current_value: f32,
  previous_value: f32,
  current_time: f32,
  previous_time: f32
) -> f32 {
  let delta_value: f32 = current_value - previous_value;
  let delta_time: f32 = current_time - previous_time;

  // Avoid division by zero
  if (abs(delta_time) < 0.001) {
    return 0.0;
  }

  return delta_value / delta_time;
}

/**
 * Calculate backward difference rate (more stable)
 */
fn calculate_backward_difference(
  values: ptr<function, array<f32>>,
  times: ptr<function, array<f32>>,
  count: u32
) -> f32 {
  if (count < 2) {
    return 0.0;
  }

  // Use 2-point backward difference: r_n = (x_n - x_{n-1}) / (t_n - t_{n-1})
  let delta_value: f32 = values[count - 1] - values[count - 2];
  let delta_time: f32 = times[count - 1] - times[count - 2];

  if (abs(delta_time) < 0.001) {
    return 0.0;
  }

  return delta_value / delta_time;
}

/**
 * Calculate central difference rate (more accurate)
 */
fn calculate_central_difference(
  values: ptr<function, array<f32>>,
  times: ptr<function, array<f32>>,
  count: u32
) -> f32 {
  if (count < 3) {
    return calculate_backward_difference(values, times, count);
  }

  // Central difference: r_n = (x_{n+1} - x_{n-1}) / (t_{n+1} - t_{n-1})
  let delta_value: f32 = values[count - 1] - values[count - 3];
  let delta_time: f32 = times[count - 1] - times[count - 3];

  if (abs(delta_time) < 0.001) {
    return 0.0;
  }

  return delta_value / delta_time;
}

/**
 * Calculate higher-order rate using 4-point backward difference
 */
fn calculate_high_order_rate(
  values: ptr<function, array<f32>>,
  times: ptr<function, array<f32>>,
  count: u32
) -> f32 {
  if (count < 4) {
    return calculate_central_difference(values, times, count);
  }

  // 4-point backward difference formula for first derivative
  // r_n = (3x_n - 4x_{n-1} + x_{n-2}) / (2Δt) + O(Δt²)
  let x_n: f32 = values[count - 1];
  let x_n1: f32 = values[count - 2];
  let x_n2: f32 = values[count - 3];

  // Use average time step for stability
  let dt1: f32 = times[count - 1] - times[count - 2];
  let dt2: f32 = times[count - 2] - times[count - 3];
  let avg_dt: f32 = (dt1 + dt2) * 0.5;

  if (abs(avg_dt) < 0.001) {
    return 0.0;
  }

  return (3.0 * x_n - 4.0 * x_n1 + x_n2) / (2.0 * avg_dt);
}

/**
 * Calculate acceleration from rate history
 */
fn calculate_acceleration(
  rates: ptr<function, array<f32>>,
  times: ptr<function, array<f32>>,
  count: u32
) -> f32 {
  if (count < 2) {
    return 0.0;
  }

  // Acceleration = Δr/Δt
  let delta_rate: f32 = rates[count - 1] - rates[count - 2];
  let delta_time: f32 = times[count - 1] - times[count - 2];

  if (abs(delta_time) < 0.001) {
    return 0.0;
  }

  return delta_rate / delta_time;
}

/**
 * Calculate jerk (third derivative) from acceleration history
 */
fn calculate_jerk(
  accelerations: ptr<function, array<f32>>,
  times: ptr<function, array<f32>>,
  count: u32
) -> f32 {
  if (count < 2) {
    return 0.0;
  }

  // Jerk = Δa/Δt
  let delta_acceleration: f32 = accelerations[count - 1] - accelerations[count - 2];
  let delta_time: f32 = times[count - 1] - times[count - 2];

  if (abs(delta_time) < 0.001) {
    return 0.0;
  }

  return delta_acceleration / delta_time;
}

/**
 * Euler integration: x_{n+1} = x_n + r_n * Δt
 */
fn euler_integration(
  current_state: f32,
  rate: f32,
  time_step: f32
) -> f32 {
  return current_state + rate * time_step;
}

/**
 * Midpoint method (2nd order Runge-Kutta)
 */
fn midpoint_integration(
  current_state: f32,
  rate: f32,
  time_step: f32,
  rate_function: ptr<function, (f32) -> f32>
) -> f32 {
  let k1: f32 = rate;
  let midpoint_state: f32 = current_state + k1 * time_step * 0.5;
  let k2: f32 = (*rate_function)(midpoint_state);

  return current_state + k2 * time_step;
}

/**
 * Runge-Kutta 4th order integration
 */
fn runge_kutta_4_integration(
  current_state: f32,
  rate: f32,
  time_step: f32,
  rate_function: ptr<function, (f32) -> f32>
) -> f32 {
  let k1: f32 = rate;
  let state2: f32 = current_state + k1 * time_step * 0.5;
  let k2: f32 = (*rate_function)(state2);
  let state3: f32 = current_state + k2 * time_step * 0.5;
  let k3: f32 = (*rate_function)(state3);
  let state4: f32 = current_state + k3 * time_step;
  let k4: f32 = (*rate_function)(state4);

  return current_state + (k1 + 2.0 * k2 + 2.0 * k3 + k4) * time_step / 6.0;
}

/**
 * Evaluate deadband for anomaly detection
 */
fn evaluate_deadband(
  rate: f32,
  deadband: ptr<function, DeadbandConfig>
) -> bool {
  let lower: f32 = deadband.lower_threshold;
  let upper: f32 = deadband.upper_threshold;
  let hysteresis: f32 = deadband.hysteresis;

  // Apply hysteresis if currently in anomaly state
  let effective_lower: f32 = lower;
  let effective_upper: f32 = upper;

  if (deadband.anomaly_score > 0.5) {
    effective_lower = lower - hysteresis;
    effective_upper = upper + hysteresis;
  }

  // Check if rate is outside deadband
  return rate < effective_lower || rate > effective_upper;
}

/**
 * Update adaptive deadband based on rate statistics
 */
fn update_adaptive_deadband(
  deadband: ptr<function, DeadbandConfig>,
  mean_rate: f32,
  variance: f32,
  adaptation_rate: f32,
  k_sigma: f32
) {
  // Update thresholds based on mean and variance
  let new_lower: f32 = mean_rate - k_sigma * sqrt(variance);
  let new_upper: f32 = mean_rate + k_sigma * sqrt(variance);

  // Apply adaptation with learning rate
  deadband.lower_threshold = mix(deadband.lower_threshold, new_lower, adaptation_rate);
  deadband.upper_threshold = mix(deadband.upper_threshold, new_upper, adaptation_rate);

  // Update anomaly score based on variance (higher variance = more sensitive)
  let sensitivity: f32 = 1.0 / (1.0 + sqrt(variance) * 10.0);
  deadband.anomaly_score = deadband.anomaly_score * sensitivity;
}

/**
 * Update rate history circular buffer
 */
fn update_rate_history(
  history: ptr<function, RateHistory>,
  rate: f32,
  timestamp: f32,
  max_length: u32
) {
  // Add new measurement
  let new_measurement: RateMeasurement;
  new_measurement.value = rate;
  new_measurement.timestamp = timestamp;
  new_measurement.uncertainty = 0.1; // Default uncertainty
  new_measurement.confidence = 0.8; // Default confidence
  new_measurement.cell_id = 0u; // Will be set by caller

  // Update circular buffer
  let head: u32 = history.head;
  history.measurements[head] = new_measurement;

  // Update head pointer
  history.head = (head + 1u) % max_length;

  // Update tail if buffer is full
  if (history.count >= max_length) {
    history.tail = (history.tail + 1u) % max_length;
  } else {
    history.count = history.count + 1u;
  }

  // Update statistics (exponential moving average)
  let alpha: f32 = 0.1; // Learning rate for statistics
  history.mean_rate = mix(history.mean_rate, rate, alpha);

  // Update variance (exponential moving variance)
  let delta: f32 = rate - history.mean_rate;
  history.variance = mix(history.variance, delta * delta, alpha);

  // Update timestamp
  history.last_update = timestamp;
}

// ============================================================================
// COMPUTE SHADERS
// ============================================================================

/**
 * Compute shader for parallel rate calculation
 * Processes multiple cells in parallel
 */
@group(0) @binding(0)
var<storage, read_write> cell_values: array<f32>;

@group(0) @binding(1)
var<storage, read_write> cell_timestamps: array<f32>;

@group(0) @binding(2)
var<storage, read_write> previous_values: array<f32>;

@group(0) @binding(3)
var<storage, read_write> previous_timestamps: array<f32>;

@group(0) @binding(4)
var<storage, read_write> calculated_rates: array<f32>;

@group(0) @binding(5)
var<uniform> rate_params: vec4<f32>;  // x: current_time, y: time_step, z: rate_mode, w: num_cells

@compute @workgroup_size(64)
fn calculate_rates_kernel(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx: u32 = global_id.x;
  let num_cells: u32 = u32(rate_params.w);
  let rate_mode: u32 = u32(rate_params.z);

  if (idx >= num_cells) {
    return;
  }

  let current_value: f32 = cell_values[idx];
  let current_time: f32 = cell_timestamps[idx];
  let previous_value: f32 = previous_values[idx];
  let previous_time: f32 = previous_timestamps[idx];

  var rate: f32 = 0.0;

  // Calculate rate based on selected mode
  switch (rate_mode) {
    case RATE_MODE_FORWARD_DIFFERENCE: {
      rate = calculate_forward_difference(
        current_value,
        previous_value,
        current_time,
        previous_time
      );
      break;
    }
    case RATE_MODE_BACKWARD_DIFFERENCE: {
      // For backward difference, we need more history
      // Using forward difference as fallback
      rate = calculate_forward_difference(
        current_value,
        previous_value,
        current_time,
        previous_time
      );
      break;
    }
    case RATE_MODE_CENTRAL_DIFFERENCE: {
      // Central difference requires more history
      // Using forward difference as fallback
      rate = calculate_forward_difference(
        current_value,
        previous_value,
        current_time,
        previous_time
      );
      break;
    }
    case RATE_MODE_HIGH_ORDER: {
      // High-order requires more history
      // Using forward difference as fallback
      rate = calculate_forward_difference(
        current_value,
        previous_value,
        current_time,
        previous_time
      );
      break;
    }
    default: {
      rate = calculate_forward_difference(
        current_value,
        previous_value,
        current_time,
        previous_time
      );
      break;
    }
  }

  // Store calculated rate
  calculated_rates[idx] = rate;

  // Update previous values for next iteration
  previous_values[idx] = current_value;
  previous_timestamps[idx] = current_time;
}

/**
 * Compute shader for parallel acceleration calculation
 */
@group(0) @binding(0)
var<storage, read_write> rate_values: array<f32>;

@group(0) @binding(1)
var<storage, read_write> rate_timestamps: array<f32>;

@group(0) @binding(2)
var<storage, read_write> previous_rates: array<f32>;

@group(0) @binding(3)
var<storage, read_write> previous_rate_times: array<f32>;

@group(0) @binding(4)
var<storage, read_write> calculated_accelerations: array<f32>;

@group(0) @binding(5)
var<uniform> acceleration_params: vec4<f32>;  // x: current_time, y: time_step, z: calculation_mode, w: num_rates

@compute @workgroup_size(64)
fn calculate_accelerations_kernel(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx: u32 = global_id.x;
  let num_rates: u32 = u32(acceleration_params.w);

  if (idx >= num_rates) {
    return;
  }

  let current_rate: f32 = rate_values[idx];
  let current_time: f32 = rate_timestamps[idx];
  let previous_rate: f32 = previous_rates[idx];
  let previous_time: f32 = previous_rate_times[idx];

  // Calculate acceleration (second derivative)
  var acceleration: f32 = 0.0;
  let delta_rate: f32 = current_rate - previous_rate;
  let delta_time: f32 = current_time - previous_time;

  if (abs(delta_time) > 0.001) {
    acceleration = delta_rate / delta_time;
  }

  // Store calculated acceleration
  calculated_accelerations[idx] = acceleration;

  // Update previous values for next iteration
  previous_rates[idx] = current_rate;
  previous_rate_times[idx] = current_time;
}

/**
 * Compute shader for deadband anomaly detection
 */
@group(0) @binding(0)
var<storage, read_write> rates_for_deadband: array<f32>;

@group(0) @binding(1)
var<storage, read_write> deadband_configs: array<DeadbandConfig>;

@group(0) @binding(2)
var<storage, read_write> anomaly_results: array<u32>;

@group(0) @binding(3)
var<storage, read_write> anomaly_scores: array<f32>;

@group(0) @binding(4)
var<uniform> deadband_params: vec4<f32>;  // x: adaptation_rate, y: k_sigma, z: hysteresis_scale, w: num_cells

@compute @workgroup_size(64)
fn detect_anomalies_kernel(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx: u32 = global_id.x;
  let num_cells: u32 = u32(deadband_params.w);

  if (idx >= num_cells) {
    return;
  }

  var deadband: DeadbandConfig = deadband_configs[idx];
  let rate: f32 = rates_for_deadband[idx];

  // Check if rate is outside deadband
  let is_anomaly: bool = evaluate_deadband(rate, &deadband);

  // Update anomaly score
  if (is_anomaly) {
    deadband.anomaly_score = min(deadband.anomaly_score + 0.1, 1.0);
  } else {
    deadband.anomaly_score = max(deadband.anomaly_score - 0.05, 0.0);
  }

  // Apply adaptive deadband updates if enabled
  let adaptation_rate: f32 = deadband_params.x;
  let k_sigma: f32 = deadband_params.y;

  if (adaptation_rate > 0.0) {
    // In a real implementation, we would use rate statistics here
    // For now, we'll just scale based on anomaly score
    let mean_rate: f32 = 0.0; // Would come from rate history
    let variance: f32 = 1.0; // Would come from rate history

    update_adaptive_deadband(
      &deadband,
      mean_rate,
      variance,
      adaptation_rate,
      k_sigma
    );
  }

  // Store results
  deadband_configs[idx] = deadband;
  anomaly_results[idx] = select(0u, 1u, is_anomaly);
  anomaly_scores[idx] = deadband.anomaly_score;
}

/**
 * Compute shader for state reconstruction from rates
 */
@group(0) @binding(0)
var<storage, read_write> initial_states: array<f32>;

@group(0) @binding(1)
var<storage, read_write> reconstruction_rates: array<f32>;

@group(0) @binding(2)
var<storage, read_write> reconstructed_states: array<f32>;

@group(0) @binding(3)
var<storage, read_write> reconstruction_errors: array<f32>;

@group(0) @binding(4)
var<uniform> reconstruction_params: vec4<f32>;  // x: time_step, y: reconstruction_method, z: learning_rate, w: num_cells

@compute @workgroup_size(64)
fn reconstruct_states_kernel(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx: u32 = global_id.x;
  let num_cells: u32 = u32(reconstruction_params.w);
  let time_step: f32 = reconstruction_params.x;
  let method: u32 = u32(reconstruction_params.y);

  if (idx >= num_cells) {
    return;
  }

  let initial_state: f32 = initial_states[idx];
  let rate: f32 = reconstruction_rates[idx];

  var reconstructed_state: f32 = initial_state;

  // Reconstruct state based on selected method
  switch (method) {
    case RECONSTRUCTION_EULER: {
      reconstructed_state = euler_integration(initial_state, rate, time_step);
      break;
    }
    case RECONSTRUCTION_MIDPOINT: {
      // For midpoint method, we need a rate function
      // Using Euler as fallback
      reconstructed_state = euler_integration(initial_state, rate, time_step);
      break;
    }
    case RECONSTRUCTION_RUNGE_KUTTA_4: {
      // For RK4, we need a rate function
      // Using Euler as fallback
      reconstructed_state = euler_integration(initial_state, rate, time_step);
      break;
    }
    default: {
      reconstructed_state = euler_integration(initial_state, rate, time_step);
      break;
    }
  }

  // Calculate reconstruction error (would compare with actual state)
  let actual_state: f32 = initial_state; // In real implementation, this would be the actual current state
  let error: f32 = abs(reconstructed_state - actual_state);

  // Store results
  reconstructed_states[idx] = reconstructed_state;
  reconstruction_errors[idx] = error;
}

/**
 * Compute shader for batch rate system update
 * Updates all cells in a batch system
 */
@group(0) @binding(0)
var<storage, read_write> batch_system: BatchRateSystem;

@group(0) @binding(1)
var<storage, read_write> batch_inputs: array<f32>;

@group(0) @binding(2)
var<storage, read_write> batch_timestamps: array<f32>;

@group(0) @binding(3)
var<uniform> batch_params: vec4<f32>;  // x: current_time, y: time_step, z: update_mode, w: batch_id

@compute @workgroup_size(64)
fn update_batch_system_kernel(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx: u32 = global_id.x;
  let num_cells: u32 = batch_system.num_cells;

  if (idx >= num_cells) {
    return;
  }

  var cell_state: CellRateState = batch_system.cells[idx];
  let input_value: f32 = batch_inputs[idx];
  let input_time: f32 = batch_timestamps[idx];
  let time_step: f32 = batch_params.y;

  // Calculate rate from current and previous value
  let rate: f32 = calculate_forward_difference(
    input_value,
    cell_state.current_value,
    input_time,
    cell_state.history.last_update
  );

  // Update rate history
  update_rate_history(
    &cell_state.history,
    rate,
    input_time,
    batch_system.max_history_length
  );

  // Calculate acceleration from rate history
  var rate_history: array<f32, 32>;
  var time_history: array<f32, 32>;
  var history_count: u32 = 0u;

  // Extract rate history for acceleration calculation
  let head: u32 = cell_state.history.head;
  let tail: u32 = cell_state.history.tail;
  let count: u32 = cell_state.history.count;

  for (var i: u32 = 0u; i < count; i = i + 1u) {
    let hist_idx: u32 = (tail + i) % batch_system.max_history_length;
    let measurement: RateMeasurement = cell_state.history.measurements[hist_idx];

    if (history_count < 32u) {
      rate_history[history_count] = measurement.value;
      time_history[history_count] = measurement.timestamp;
      history_count = history_count + 1u;
    }
  }

  // Calculate acceleration if we have enough history
  var acceleration: f32 = 0.0;
  if (history_count >= 2u) {
    acceleration = calculate_acceleration(&rate_history, &time_history, history_count);
  }

  // Update cell state
  cell_state.current_value = input_value;
  cell_state.current_rate = rate;
  cell_state.current_acceleration = acceleration;

  // Check for anomalies using deadband
  let is_anomaly: bool = evaluate_deadband(rate, &cell_state.deadband);
  cell_state.anomaly_detected = select(0u, 1u, is_anomaly);

  // Reconstruct state from rates (for validation)
  cell_state.state_reconstructed = euler_integration(
    cell_state.state_reconstructed,
    rate,
    time_step
  );

  // Calculate reconstruction error
  cell_state.reconstruction_error = abs(cell_state.current_value - cell_state.state_reconstructed);

  // Update adaptive deadband if enabled
  if (cell_state.deadband.adaptation_rate > 0.0) {
    update_adaptive_deadband(
      &cell_state.deadband,
      cell_state.history.mean_rate,
      cell_state.history.variance,
      cell_state.deadband.adaptation_rate,
      2.0 // k_sigma = 2.0 (95% confidence interval)
    );
  }

  // Store updated cell state
  batch_system.cells[idx] = cell_state;
}

// ============================================================================
// MAIN ENTRY POINTS
// ============================================================================

/**
 * Main rate-based change update function
 * Coordinates all rate calculations for a batch of cells
 */
fn update_rate_based_system(
  system: ptr<function, BatchRateSystem>,
  inputs: ptr<function, array<f32>>,
  timestamps: ptr<function, array<f32>>,
  num_updates: u32,
  time_step: f32
) {
  // Update each cell in the system
  for (var i: u32 = 0; i < system.num_cells; i = i + 1) {
    if (i < num_updates) {
      var cell_state: CellRateState = system.cells[i];
      let input_value: f32 = inputs[i];
      let input_time: f32 = timestamps[i];

      // Calculate rate
      let rate: f32 = calculate_forward_difference(
        input_value,
        cell_state.current_value,
        input_time,
        cell_state.history.last_update
      );

      // Update rate history
      update_rate_history(
        &cell_state.history,
        rate,
        input_time,
        system.max_history_length
      );

      // Update cell state
      cell_state.current_value = input_value;
      cell_state.current_rate = rate;
      cell_state.history.last_update = input_time;

      // Check deadband for anomalies
      cell_state.anomaly_detected = select(
        0u,
        1u,
        evaluate_deadband(rate, &cell_state.deadband)
      );

      system.cells[i] = cell_state;
    }
  }

  // Update system time
  system.time_step = time_step;
}

/**
 * Calculate higher-order derivatives for a batch of cells
 */
fn calculate_higher_order_derivatives(
  system: ptr<function, BatchRateSystem>,
  outputs: ptr<function, array<vec4<f32>>>
) {
  // Calculate acceleration, jerk, snap for each cell
  for (var i: u32 = 0; i < system.num_cells; i = i + 1) {
    var cell_state: CellRateState = system.cells[i];

    // Extract rate and time history
    var rate_history: array<f32, 32>;
    var time_history: array<f32, 32>;
    var history_count: u32 = 0u;

    let head: u32 = cell_state.history.head;
    let tail: u32 = cell_state.history.tail;
    let count: u32 = cell_state.history.count;

    for (var j: u32 = 0u; j < count; j = j + 1u) {
      let hist_idx: u32 = (tail + j) % system.max_history_length;
      let measurement: RateMeasurement = cell_state.history.measurements[hist_idx];

      if (history_count < 32u) {
        rate_history[history_count] = measurement.value;
        time_history[history_count] = measurement.timestamp;
        history_count = history_count + 1u;
      }
    }

    // Calculate derivatives
    var acceleration: f32 = 0.0;
    var jerk: f32 = 0.0;
    var snap: f32 = 0.0;

    if (history_count >= 2u) {
      acceleration = calculate_acceleration(&rate_history, &time_history, history_count);

      // For jerk and snap, we would need acceleration history
      // For now, we'll use simplified calculations
      if (history_count >= 3u) {
        // Simplified jerk calculation
        jerk = (rate_history[history_count - 1] - 2.0 * rate_history[history_count - 2] + rate_history[history_count - 3]) /
               pow(time_history[history_count - 1] - time_history[history_count - 3], 2.0);

        // Simplified snap calculation
        if (history_count >= 4u) {
          snap = (rate_history[history_count - 1] - 3.0 * rate_history[history_count - 2] +
                  3.0 * rate_history[history_count - 3] - rate_history[history_count - 4]) /
                 pow(time_history[history_count - 1] - time_history[history_count - 4], 3.0);
        }
      }
    }

    // Store higher-order derivatives
    outputs[i] = vec4<f32>(acceleration, jerk, snap, 0.0);
  }
}