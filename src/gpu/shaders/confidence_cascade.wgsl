/**
 * Confidence Cascade Computations - WGSL Shader Library
 *
 * Implements GPU-accelerated confidence cascade operations:
 * 1. Deadband Trigger Evaluations (parallel detection)
 * 2. Cascade Level Propagation (multi-level confidence flow)
 * 3. Intelligent Activation Functions (non-linear confidence transforms)
 * 4. Batch Processing of Cascade Events (parallel event handling)
 *
 * Based on POLLN Confidence Cascade Architecture:
 * - Deadband triggers for intelligent activation
 * - Multi-level confidence propagation
 * - Rate-based change mechanics
 * - Intelligent thresholding and gating
 */

// ============================================================================
// STRUCTURES AND TYPES
// ============================================================================

/**
 * Confidence Level - Represents confidence at a specific cascade level
 */
struct ConfidenceLevel {
  value: f32,           // Confidence value [0, 1]
  uncertainty: f32,     // Uncertainty measure [0, 1]
  stability: f32,       // Stability metric [0, 1]
  last_update: f32,     // Time since last update
  trend: f32           // Rate of change (-1 to 1)
};

/**
 * Deadband Trigger - Threshold-based activation trigger
 */
struct DeadbandTrigger {
  lower_threshold: f32,   // Lower activation threshold
  upper_threshold: f32,   // Upper activation threshold
  hysteresis: f32,        // Hysteresis width
  deadband_width: f32,    // Deadband width (inactive region)
  activation_state: u32,  // Current activation state (0=inactive, 1=active)
  last_activation: f32    // Time of last activation
};

/**
 * Cascade Level - A level in the confidence cascade
 */
struct CascadeLevel {
  level_index: u32,               // Level index (0 = input, higher = more abstract)
  confidence: ConfidenceLevel,    // Confidence at this level
  triggers: array<DeadbandTrigger, 8>,  // Up to 8 triggers per level
  child_levels: array<u32, 4>,    // Indices of child levels
  parent_levels: array<u32, 2>,   // Indices of parent levels
  propagation_weight: f32,        // Weight for propagation to next level
  aggregation_function: u32       // Function for aggregating inputs
};

/**
 * Cascade Event - An event in the cascade system
 */
struct CascadeEvent {
  event_id: u32,
  source_level: u32,
  target_level: u32,
  confidence_delta: f32,
  timestamp: f32,
  event_type: u32,      // 0=propagation, 1=activation, 2=decay, 3=reset
  priority: u32
};

/**
 * Cascade System - Complete confidence cascade system
 */
struct CascadeSystem {
  num_levels: u32,
  levels: array<CascadeLevel, 32>,  // Up to 32 levels
  events: array<CascadeEvent, 1024>, // Event buffer
  event_count: u32,
  time_step: f32,
  decay_rate: f32,
  propagation_speed: f32
};

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Activation function types
 */
const ACTIVATION_LINEAR: u32 = 0u;
const ACTIVATION_SIGMOID: u32 = 1u;
const ACTIVATION_TANH: u32 = 2u;
const ACTIVATION_RELU: u32 = 3u;
const ACTIVATION_LEAKY_RELU: u32 = 4u;
const ACTIVATION_ELU: u32 = 5u;
const ACTIVATION_SOFTPLUS: u32 = 6u;
const ACTIVATION_GAUSSIAN: u32 = 7u;

/**
 * Aggregation function types
 */
const AGGREGATION_MEAN: u32 = 0u;
const AGGREGATION_MAX: u32 = 1u;
const AGGREGATION_MIN: u32 = 2u;
const AGGREGATION_SUM: u32 = 3u;
const AGGREGATION_WEIGHTED_SUM: u32 = 4u;
const AGGREGATION_GEOMETRIC_MEAN: u32 = 5u;
const AGGREGATION_HARMONIC_MEAN: u32 = 6u;

/**
 * Event types
 */
const EVENT_PROPAGATION: u32 = 0u;
const EVENT_ACTIVATION: u32 = 1u;
const EVENT_DECAY: u32 = 2u;
const EVENT_RESET: u32 = 3u;
const EVENT_THRESHOLD_CROSSING: u32 = 4u;
const EVENT_STABILITY_CHANGE: u32 = 5u;

/**
 * Mathematical constants
 */
const E: f32 = 2.718281828459045;
const LN2: f32 = 0.6931471805599453;
const SQRT2PI: f32 = 2.5066282746310002;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sigmoid activation function
 */
fn sigmoid(x: f32) -> f32 {
  return 1.0 / (1.0 + exp(-x));
}

/**
 * Hyperbolic tangent activation
 */
fn tanh_activation(x: f32) -> f32 {
  var ex: f32 = exp(x);
  var enx: f32 = exp(-x);
  return (ex - enx) / (ex + enx);
}

/**
 * Rectified Linear Unit (ReLU)
 */
fn relu(x: f32) -> f32 {
  return max(0.0, x);
}

/**
 * Leaky ReLU activation
 */
fn leaky_relu(x: f32, alpha: f32) -> f32 {
  return select(x, alpha * x, x < 0.0);
}

/**
 * Exponential Linear Unit (ELU)
 */
fn elu(x: f32, alpha: f32) -> f32 {
  return select(x, alpha * (exp(x) - 1.0), x < 0.0);
}

/**
 * Softplus activation
 */
fn softplus(x: f32) -> f32 {
  return log(1.0 + exp(x));
}

/**
 * Gaussian activation
 */
fn gaussian_activation(x: f32, mean: f32, stddev: f32) -> f32 {
  var z: f32 = (x - mean) / stddev;
  return exp(-0.5 * z * z) / (stddev * SQRT2PI);
}

/**
 * Apply activation function based on type
 */
fn apply_activation(x: f32, activation_type: u32, params: vec4<f32>) -> f32 {
  switch (activation_type) {
    case ACTIVATION_LINEAR: {
      return x;
    }
    case ACTIVATION_SIGMOID: {
      return sigmoid(x);
    }
    case ACTIVATION_TANH: {
      return tanh_activation(x);
    }
    case ACTIVATION_RELU: {
      return relu(x);
    }
    case ACTIVATION_LEAKY_RELU: {
      return leaky_relu(x, params.x);
    }
    case ACTIVATION_ELU: {
      return elu(x, params.x);
    }
    case ACTIVATION_SOFTPLUS: {
      return softplus(x);
    }
    case ACTIVATION_GAUSSIAN: {
      return gaussian_activation(x, params.x, params.y);
    }
    default: {
      return x;
    }
  }
}

/**
 * Apply aggregation function
 */
fn apply_aggregation(values: ptr<function, array<f32>>, count: u32, agg_type: u32, weights: ptr<function, array<f32>>) -> f32 {
  if (count == 0u) {
    return 0.0;
  }

  switch (agg_type) {
    case AGGREGATION_MEAN: {
      var sum: f32 = 0.0;
      for (var i: u32 = 0; i < count; i = i + 1) {
        sum = sum + values[i];
      }
      return sum / f32(count);
    }
    case AGGREGATION_MAX: {
      var max_val: f32 = values[0];
      for (var i: u32 = 1; i < count; i = i + 1) {
        max_val = max(max_val, values[i]);
      }
      return max_val;
    }
    case AGGREGATION_MIN: {
      var min_val: f32 = values[0];
      for (var i: u32 = 1; i < count; i = i + 1) {
        min_val = min(min_val, values[i]);
      }
      return min_val;
    }
    case AGGREGATION_SUM: {
      var sum: f32 = 0.0;
      for (var i: u32 = 0; i < count; i = i + 1) {
        sum = sum + values[i];
      }
      return sum;
    }
    case AGGREGATION_WEIGHTED_SUM: {
      var sum: f32 = 0.0;
      var weight_sum: f32 = 0.0;
      for (var i: u32 = 0; i < count; i = i + 1) {
        sum = sum + values[i] * weights[i];
        weight_sum = weight_sum + weights[i];
      }
      return weight_sum > 0.0 ? sum / weight_sum : 0.0;
    }
    case AGGREGATION_GEOMETRIC_MEAN: {
      var product: f32 = 1.0;
      for (var i: u32 = 0; i < count; i = i + 1) {
        product = product * max(values[i], 0.0001);
      }
      return pow(product, 1.0 / f32(count));
    }
    case AGGREGATION_HARMONIC_MEAN: {
      var reciprocal_sum: f32 = 0.0;
      for (var i: u32 = 0; i < count; i = i + 1) {
        reciprocal_sum = reciprocal_sum + 1.0 / max(values[i], 0.0001);
      }
      return f32(count) / reciprocal_sum;
    }
    default: {
      return values[0];
    }
  }
}

// ============================================================================
// DEADBAND TRIGGER OPERATIONS
// ============================================================================

/**
 * Evaluate deadband trigger
 * Returns true if trigger should activate
 */
fn evaluate_deadband_trigger(
  trigger: ptr<function, DeadbandTrigger>,
  input_value: f32,
  current_time: f32
) -> bool {
  var lower: f32 = trigger.lower_threshold;
  var upper: f32 = trigger.upper_threshold;
  var hysteresis: f32 = trigger.hysteresis;
  var deadband: f32 = trigger.deadband_width;
  var state: u32 = trigger.activation_state;

  // Calculate effective thresholds with hysteresis
  var effective_lower: f32 = lower;
  var effective_upper: f32 = upper;

  if (state == 1u) {
    // Currently active, apply hysteresis to prevent rapid toggling
    effective_lower = lower - hysteresis;
    effective_upper = upper + hysteresis;
  }

  // Check deadband region
  var mid_point: f32 = (lower + upper) * 0.5;
  var deadband_lower: f32 = mid_point - deadband * 0.5;
  var deadband_upper: f32 = mid_point + deadband * 0.5;

  // Check if in deadband (inactive region)
  if (input_value >= deadband_lower && input_value <= deadband_upper) {
    return false;
  }

  // Check activation conditions
  var should_activate: bool = false;

  if (input_value >= effective_upper) {
    should_activate = true;
  } else if (input_value <= effective_lower) {
    should_activate = false;
  } else {
    // In hysteresis region, maintain current state
    should_activate = state == 1u;
  }

  // Update trigger state
  if (should_activate != (state == 1u)) {
    trigger.activation_state = select(0u, 1u, should_activate);
    trigger.last_activation = current_time;
  }

  return should_activate;
}

/**
 * Evaluate multiple triggers in parallel
 */
fn evaluate_triggers_parallel(
  triggers: ptr<function, array<DeadbandTrigger>>,
  input_values: ptr<function, array<f32>>,
  num_triggers: u32,
  current_time: f32
) -> array<u32> {
  var results: array<u32, 32>;

  for (var i: u32 = 0; i < num_triggers; i = i + 1) {
    var trigger: DeadbandTrigger = triggers[i];
    var input_value: f32 = input_values[i];
    var activated: bool = evaluate_deadband_trigger(&trigger, input_value, current_time);
    results[i] = select(0u, 1u, activated);
    triggers[i] = trigger; // Update trigger state
  }

  return results;
}

// ============================================================================
// CONFIDENCE PROPAGATION
// ============================================================================

/**
 * Update confidence level with decay
 */
fn update_confidence_with_decay(
  confidence: ptr<function, ConfidenceLevel>,
  new_value: f32,
  time_step: f32,
  decay_rate: f32
) {
  var old_value: f32 = confidence.value;
  var uncertainty: f32 = confidence.uncertainty;
  var stability: f32 = confidence.stability;
  var last_update: f32 = confidence.last_update;
  var trend: f32 = confidence.trend;

  // Apply decay based on time since last update
  var decay_factor: f32 = exp(-decay_rate * (last_update + time_step));
  var decayed_value: f32 = old_value * decay_factor;

  // Blend new value with decayed old value
  var blend_factor: f32 = 1.0 - exp(-time_step * 10.0); // Fast blending
  var blended_value: f32 = mix(decayed_value, new_value, blend_factor);

  // Update trend (rate of change)
  var new_trend: f32 = (blended_value - old_value) / max(time_step, 0.001);
  trend = mix(trend, new_trend, 0.1); // Smooth trend update

  // Update uncertainty based on change magnitude
  var change_magnitude: f32 = abs(blended_value - old_value);
  uncertainty = mix(uncertainty, change_magnitude, 0.2);

  // Update stability (inverse of uncertainty)
  stability = 1.0 / (1.0 + uncertainty * 10.0);

  // Update confidence level
  confidence.value = blended_value;
  confidence.uncertainty = uncertainty;
  confidence.stability = stability;
  confidence.last_update = 0.0; // Reset since we just updated
  confidence.trend = trend;
}

/**
 * Propagate confidence between levels
 */
fn propagate_confidence(
  source_level: ptr<function, CascadeLevel>,
  target_level: ptr<function, CascadeLevel>,
  propagation_weight: f32,
  time_step: f32
) -> f32 {
  var source_confidence: ConfidenceLevel = source_level.confidence;
  var target_confidence: ConfidenceLevel = target_level.confidence;

  // Calculate propagation amount based on weights and stability
  var propagation_amount: f32 = source_confidence.value * propagation_weight;
  var stability_factor: f32 = source_confidence.stability * target_confidence.stability;

  // Apply activation function from target level
  var activation_params: vec4<f32> = vec4<f32>(0.1, 0.5, 0.0, 0.0); // Default params
  var activated_propagation: f32 = apply_activation(
    propagation_amount * stability_factor,
    target_level.aggregation_function,
    activation_params
  );

  // Update target confidence
  update_confidence_with_decay(
    &target_confidence,
    activated_propagation,
    time_step,
    0.1 // Default decay rate
  );

  target_level.confidence = target_confidence;

  return activated_propagation;
}

/**
 * Cascade confidence through multiple levels
 */
fn cascade_propagation(
  system: ptr<function, CascadeSystem>,
  start_level: u32,
  max_depth: u32
) {
  var num_levels: u32 = system.num_levels;
  var time_step: f32 = system.time_step;

  // Use stack for breadth-first propagation
  var stack: array<u32, 32>;
  var stack_size: u32 = 0u;

  // Initialize with start level
  stack[stack_size] = start_level;
  stack_size = stack_size + 1u;

  var visited: array<u32, 32>;

  while (stack_size > 0u) {
    // Pop from stack
    stack_size = stack_size - 1u;
    var current_level_idx: u32 = stack[stack_size];

    // Mark as visited
    visited[current_level_idx] = 1u;

    var current_level: CascadeLevel = system.levels[current_level_idx];

    // Propagate to child levels
    for (var i: u32 = 0; i < 4u; i = i + 1u) {
      var child_idx: u32 = current_level.child_levels[i];
      if (child_idx < num_levels && visited[child_idx] == 0u) {
        var child_level: CascadeLevel = system.levels[child_idx];

        var propagation_amount: f32 = propagate_confidence(
          &current_level,
          &child_level,
          current_level.propagation_weight,
          time_step
        );

        system.levels[child_idx] = child_level;

        // Push child to stack if propagation was significant
        if (propagation_amount > 0.01 && stack_size < 31u) {
          stack[stack_size] = child_idx;
          stack_size = stack_size + 1u;
        }
      }
    }
  }
}

// ============================================================================
// EVENT PROCESSING
// ============================================================================

/**
 * Process cascade events in parallel
 */
fn process_cascade_events(
  system: ptr<function, CascadeSystem>,
  events: ptr<function, array<CascadeEvent>>,
  num_events: u32
) {
  var num_levels: u32 = system.num_levels;
  var time_step: f32 = system.time_step;
  var decay_rate: f32 = system.decay_rate;

  for (var i: u32 = 0; i < num_events; i = i + 1) {
    var event: CascadeEvent = events[i];

    if (event.source_level >= num_levels || event.target_level >= num_levels) {
      continue;
    }

    var source_level: CascadeLevel = system.levels[event.source_level];
    var target_level: CascadeLevel = system.levels[event.target_level];

    switch (event.event_type) {
      case EVENT_PROPAGATION: {
        propagate_confidence(
          &source_level,
          &target_level,
          event.confidence_delta,
          time_step
        );
        break;
      }
      case EVENT_ACTIVATION: {
        // Direct activation of target level
        update_confidence_with_decay(
          &target_level.confidence,
          event.confidence_delta,
          time_step,
          decay_rate
        );
        break;
      }
      case EVENT_DECAY: {
        // Apply decay to target level
        var decayed_value: f32 = target_level.confidence.value * exp(-decay_rate * time_step);
        update_confidence_with_decay(
          &target_level.confidence,
          decayed_value,
          time_step,
          decay_rate
        );
        break;
      }
      case EVENT_RESET: {
        // Reset target level confidence
        target_level.confidence.value = 0.0;
        target_level.confidence.uncertainty = 1.0;
        target_level.confidence.stability = 0.0;
        target_level.confidence.trend = 0.0;
        target_level.confidence.last_update = 0.0;
        break;
      }
      case EVENT_THRESHOLD_CROSSING: {
        // Check if confidence crosses threshold
        var current_value: f32 = target_level.confidence.value;
        if (abs(current_value - event.confidence_delta) < 0.1) {
          // Threshold crossed, trigger propagation
          propagate_confidence(
            &source_level,
            &target_level,
            1.0, // Full propagation
            time_step
          );
        }
        break;
      }
      case EVENT_STABILITY_CHANGE: {
        // Update stability based on event
        target_level.confidence.stability = clamp(
          target_level.confidence.stability + event.confidence_delta,
          0.0,
          1.0
        );
        break;
      }
    }

    // Update levels in system
    system.levels[event.source_level] = source_level;
    system.levels[event.target_level] = target_level;
  }
}

// ============================================================================
// COMPUTE SHADERS
// ============================================================================

/**
 * Compute shader for deadband trigger evaluation
 */
@group(0) @binding(0)
var<storage, read_write> input_values: array<f32>;

@group(0) @binding(1)
var<storage, read_write> trigger_states: array<DeadbandTrigger>;

@group(0) @binding(2)
var<storage, read_write> activation_results: array<u32>;

@group(0) @binding(3)
var<uniform> trigger_params: vec4<f32>;  // x: current_time, y: hysteresis_scale, z: deadband_scale, w: num_triggers

@compute @workgroup_size(64)
fn evaluate_triggers_kernel(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx: u32 = global_id.x;
  let num_triggers: u32 = u32(trigger_params.w);

  if (idx >= num_triggers) {
    return;
  }

  var trigger: DeadbandTrigger = trigger_states[idx];
  var input_value: f32 = input_values[idx];
  var current_time: f32 = trigger_params.x;

  // Scale thresholds based on parameters
  trigger.hysteresis = trigger.hysteresis * trigger_params.y;
  trigger.deadband_width = trigger.deadband_width * trigger_params.z;

  var activated: bool = evaluate_deadband_trigger(&trigger, input_value, current_time);

  // Update trigger state
  trigger_states[idx] = trigger;
  activation_results[idx] = select(0u, 1u, activated);
}

/**
 * Compute shader for confidence propagation
 */
@group(0) @binding(0)
var<storage, read_write> confidence_levels: array<ConfidenceLevel>;

@group(0) @binding(1)
var<storage, read_write> cascade_levels: array<CascadeLevel>;

@group(0) @binding(2)
var<storage, read_write> propagation_results: array<f32>;

@group(0) @binding(3)
var<uniform> propagation_params: vec4<f32>;  // x: time_step, y: decay_rate, z: propagation_speed, w: num_levels

@compute @workgroup_size(64)
fn propagate_confidence_kernel(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx: u32 = global_id.x;
  let num_levels: u32 = u32(propagation_params.w);

  if (idx >= num_levels) {
    return;
  }

  var level: CascadeLevel = cascade_levels[idx];
  var confidence: ConfidenceLevel = confidence_levels[idx];

  // Update confidence with decay
  update_confidence_with_decay(
    &confidence,
    confidence.value, // No external input, just decay
    propagation_params.x, // time_step
    propagation_params.y  // decay_rate
  );

  // Propagate to child levels
  var total_propagation: f32 = 0.0;
  var child_count: u32 = 0u;

  for (var i: u32 = 0; i < 4u; i = i + 1u) {
    var child_idx: u32 = level.child_levels[i];
    if (child_idx < num_levels) {
      var child_level: CascadeLevel = cascade_levels[child_idx];
      var child_confidence: ConfidenceLevel = confidence_levels[child_idx];

      var propagation_amount: f32 = propagate_confidence(
        &level,
        &child_level,
        level.propagation_weight,
        propagation_params.x
      );

      total_propagation = total_propagation + propagation_amount;
      child_count = child_count + 1u;

      // Update child level
      cascade_levels[child_idx] = child_level;
      confidence_levels[child_idx] = child_confidence;
    }
  }

  // Update current level
  level.confidence = confidence;
  cascade_levels[idx] = level;
  confidence_levels[idx] = confidence;

  // Store propagation result
  propagation_results[idx] = child_count > 0u ? total_propagation / f32(child_count) : 0.0;
}

/**
 * Compute shader for cascade event processing
 */
@group(0) @binding(0)
var<storage, read_write> cascade_events: array<CascadeEvent>;

@group(0) @binding(1)
var<storage, read_write> cascade_system: CascadeSystem;

@group(0) @binding(2)
var<storage, read_write> event_results: array<f32>;

@group(0) @binding(3)
var<uniform> event_params: vec4<f32>;  // x: current_time, y: max_events, z: event_decay, w: processing_mode

@compute @workgroup_size(64)
fn process_events_kernel(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx: u32 = global_id.x;
  let max_events: u32 = u32(event_params.y);

  if (idx >= max_events) {
    return;
  }

  var event: CascadeEvent = cascade_events[idx];
  var system: CascadeSystem = cascade_system;

  // Skip inactive events
  if (event.event_type == 0u && event.confidence_delta == 0.0) {
    return;
  }

  // Process event based on type
  var result: f32 = 0.0;

  switch (event.event_type) {
    case EVENT_PROPAGATION: {
      if (event.source_level < system.num_levels && event.target_level < system.num_levels) {
        var source_level: CascadeLevel = system.levels[event.source_level];
        var target_level: CascadeLevel = system.levels[event.target_level];

        result = propagate_confidence(
          &source_level,
          &target_level,
          event.confidence_delta,
          system.time_step
        );

        system.levels[event.source_level] = source_level;
        system.levels[event.target_level] = target_level;
      }
      break;
    }
    case EVENT_ACTIVATION: {
      if (event.target_level < system.num_levels) {
        var target_level: CascadeLevel = system.levels[event.target_level];
        update_confidence_with_decay(
          &target_level.confidence,
          event.confidence_delta,
          system.time_step,
          system.decay_rate
        );
        system.levels[event.target_level] = target_level;
        result = event.confidence_delta;
      }
      break;
    }
    case EVENT_DECAY: {
      if (event.target_level < system.num_levels) {
        var target_level: CascadeLevel = system.levels[event.target_level];
        var decayed_value: f32 = target_level.confidence.value * exp(-system.decay_rate * system.time_step);
        update_confidence_with_decay(
          &target_level.confidence,
          decayed_value,
          system.time_step,
          system.decay_rate
        );
        system.levels[event.target_level] = target_level;
        result = decayed_value;
      }
      break;
    }
  }

  // Apply event decay (reduce confidence delta over time)
  event.confidence_delta = event.confidence_delta * exp(-event_params.z * system.time_step);

  // Update event
  cascade_events[idx] = event;
  cascade_system = system;
  event_results[idx] = result;
}

/**
 * Compute shader for batch confidence updates
 */
@group(0) @binding(0)
var<storage, read_write> batch_inputs: array<f32>;

@group(0) @binding(1)
var<storage, read_write> batch_confidences: array<ConfidenceLevel>;

@group(0) @binding(2)
var<storage, read_write> batch_outputs: array<f32>;

@group(0) @binding(3)
var<uniform> batch_params: vec4<f32>;  // x: time_step, y: decay_rate, z: learning_rate, w: batch_size

@compute @workgroup_size(64)
fn batch_confidence_update(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx: u32 = global_id.x;
  let batch_size: u32 = u32(batch_params.w);

  if (idx >= batch_size) {
    return;
  }

  var confidence: ConfidenceLevel = batch_confidences[idx];
  var input_value: f32 = batch_inputs[idx];
  var time_step: f32 = batch_params.x;
  var decay_rate: f32 = batch_params.y;
  var learning_rate: f32 = batch_params.z;

  // Update confidence with new input
  update_confidence_with_decay(
    &confidence,
    input_value,
    time_step,
    decay_rate
  );

  // Apply learning rate adjustment
  confidence.value = mix(confidence.value, input_value, learning_rate);

  // Store results
  batch_confidences[idx] = confidence;
  batch_outputs[idx] = confidence.value;
}

// ============================================================================
// MAIN ENTRY POINTS
// ============================================================================

/**
 * Main confidence cascade update function
 * Coordinates all cascade operations
 */
fn update_confidence_cascade(
  system: ptr<function, CascadeSystem>,
  inputs: ptr<function, array<f32>>,
  events: ptr<function, array<CascadeEvent>>,
  num_events: u32,
  time_step: f32
) {
  // 1. Update input level confidences
  for (var i: u32 = 0; i < system.num_levels; i = i + 1) {
    var level: CascadeLevel = system.levels[i];
    if (i < arrayLength(&inputs)) {
      update_confidence_with_decay(
        &level.confidence,
        inputs[i],
        time_step,
        system.decay_rate
      );
    }
    system.levels[i] = level;
  }

  // 2. Process events
  process_cascade_events(system, events, num_events);

  // 3. Cascade propagation
  for (var i: u32 = 0; i < system.num_levels; i = i + 1) {
    cascade_propagation(system, i, 3u); // Propagate up to 3 levels deep
  }

  // 4. Update system time
  system.time_step = time_step;
}