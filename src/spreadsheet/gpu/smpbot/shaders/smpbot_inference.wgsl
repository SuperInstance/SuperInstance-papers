// smpbot_inference.wgsl - Batch SMPbot Inference Shader
//
// Computes forward pass for batch of SMPbots with shared model parameters.
// Supports multiple model types with configurable layer sizes.

// SMPbot state structure (aligned to 16 bytes)
struct SMPbotState {
  // Core components
  seed_hash: u32,
  model_id: u32,
  prompt_hash: u32,

  // Input/output tensors (fixed size for simplicity)
  input_tensor: array<f32, 512>,
  output_tensor: array<f32, 512>,

  // Confidence and timing
  confidence: f32,
  timestamp: f32,

  // Flags and metadata
  flags: u32,
  padding: vec3<u32>, // Padding for alignment
}

// Model metadata structure
struct ModelMetadata {
  parameter_count: u32,
  layer_count: u32,
  layer_sizes: array<u32, 16>, // Up to 16 layers
  input_size: u32,
  output_size: u32,
  is_compressed: u32, // 0 = FP32, 1 = FP16
  compression_ratio: f32,
  padding: vec2<u32>,
}

// Inference configuration
struct InferenceConfig {
  num_bots: u32,
  batch_size: u32,
  model_params_offset: u32,
  time_step: f32,
  workgroup_size: u32,
  num_workgroups: u32,
  padding: vec2<u32>,
}

// Storage buffers
@group(0) @binding(0) var<storage, read> input_bots: array<SMPbotState>;
@group(0) @binding(1) var<storage, read_write> output_bots: array<SMPbotState>;
@group(0) @binding(2) var<storage, read> model_params: array<f32>;
@group(0) @binding(3) var<storage, read> model_metadata: array<ModelMetadata>;
@group(0) @binding(4) var<uniform> config: InferenceConfig;

// Activation functions
fn relu(x: f32) -> f32 {
  return select(0.0, x, x > 0.0);
}

fn sigmoid(x: f32) -> f32 {
  return 1.0 / (1.0 + exp(-x));
}

fn tanh_activation(x: f32) -> f32 {
  return tanh(x);
}

fn gelu(x: f32) -> f32 {
  // GELU approximation: x * 0.5 * (1.0 + tanh(sqrt(2.0 / PI) * (x + 0.044715 * x * x * x)))
  let pi: f32 = 3.141592653589793;
  let sqrt_2_over_pi: f32 = sqrt(2.0 / pi);
  let c: f32 = 0.044715;
  return 0.5 * x * (1.0 + tanh(sqrt_2_over_pi * (x + c * x * x * x)));
}

// Linear layer computation
fn linear_layer(
  input: array<f32, 512>,
  weights: ptr<function, array<f32, 512>>,
  bias: ptr<function, array<f32, 512>>,
  output: ptr<function, array<f32, 512>>,
  input_size: u32,
  output_size: u32,
  weight_offset: u32
) {
  // Matrix multiplication: output = input * weights^T + bias
  for (var i: u32 = 0u; i < output_size; i = i + 1u) {
    var sum: f32 = 0.0;

    for (var j: u32 = 0u; j < input_size; j = j + 1u) {
      let weight_idx = weight_offset + i * input_size + j;
      sum = sum + input[j] * model_params[weight_idx];
    }

    // Add bias
    let bias_idx = weight_offset + output_size * input_size + i;
    sum = sum + model_params[bias_idx];

    // Store result
    (*output)[i] = sum;
  }
}

// Main compute shader
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let bot_index = global_id.x;

  // Check bounds
  if (bot_index >= config.num_bots) {
    return;
  }

  // Load bot state
  var bot = input_bots[bot_index];
  let model_id = bot.model_id;

  // Load model metadata
  let metadata = model_metadata[model_id];
  let layer_count = metadata.layer_count;
  let input_size = metadata.input_size;
  let output_size = metadata.output_size;

  // Get model parameters offset
  let params_offset = config.model_params_offset;

  // Temporary buffers for layer computations
  var layer_input: array<f32, 512>;
  var layer_output: array<f32, 512>;

  // Copy input to layer_input
  for (var i: u32 = 0u; i < input_size; i = i + 1u) {
    layer_input[i] = bot.input_tensor[i];
  }

  // Process each layer
  var current_offset = params_offset;
  var prev_layer_size = input_size;

  for (var layer_idx: u32 = 0u; layer_idx < layer_count; layer_idx = layer_idx + 1u) {
    let layer_size = metadata.layer_sizes[layer_idx];

    // Linear layer
    linear_layer(
      layer_input,
      &layer_input, // Temporary, would use weight pointer in real implementation
      &layer_input, // Temporary, would use bias pointer
      &layer_output,
      prev_layer_size,
      layer_size,
      current_offset
    );

    // Apply activation function (using GELU for modern models)
    for (var i: u32 = 0u; i < layer_size; i = i + 1u) {
      layer_output[i] = gelu(layer_output[i]);
    }

    // Update offsets for next layer
    current_offset = current_offset + prev_layer_size * layer_size + layer_size;
    prev_layer_size = layer_size;

    // Swap buffers for next layer
    for (var i: u32 = 0u; i < layer_size; i = i + 1u) {
      layer_input[i] = layer_output[i];
    }
  }

  // Copy final output to bot
  for (var i: u32 = 0u; i < output_size; i = i + 1u) {
    bot.output_tensor[i] = layer_output[i];
  }

  // Update timestamp and confidence
  bot.timestamp = bot.timestamp + config.time_step;

  // Simple confidence calculation based on output variance
  var mean: f32 = 0.0;
  var variance: f32 = 0.0;

  for (var i: u32 = 0u; i < output_size; i = i + 1u) {
    mean = mean + bot.output_tensor[i];
  }
  mean = mean / f32(output_size);

  for (var i: u32 = 0u; i < output_size; i = i + 1u) {
    let diff = bot.output_tensor[i] - mean;
    variance = variance + diff * diff;
  }
  variance = variance / f32(output_size);

  // Higher variance = lower confidence (more uncertain)
  bot.confidence = 1.0 / (1.0 + sqrt(variance));

  // Write back updated bot
  output_bots[bot_index] = bot;
}

// Alternative: Simplified inference for testing
@compute @workgroup_size(64)
fn simple_inference(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let bot_index = global_id.x;

  if (bot_index >= config.num_bots) {
    return;
  }

  var bot = input_bots[bot_index];
  let model_id = bot.model_id;
  let metadata = model_metadata[model_id];

  let input_size = min(metadata.input_size, 512u);
  let output_size = min(metadata.output_size, 512u);

  // Simple linear transformation for testing
  for (var i: u32 = 0u; i < output_size; i = i + 1u) {
    var sum: f32 = 0.0;

    for (var j: u32 = 0u; j < input_size; j = j + 1u) {
      let weight_idx = config.model_params_offset + i * input_size + j;
      sum = sum + bot.input_tensor[j] * model_params[weight_idx];
    }

    // Add bias
    let bias_idx = config.model_params_offset + output_size * input_size + i;
    sum = sum + model_params[bias_idx];

    // Apply activation
    bot.output_tensor[i] = tanh_activation(sum);
  }

  // Update metadata
  bot.timestamp = bot.timestamp + config.time_step;
  bot.confidence = 0.95; // Fixed confidence for testing

  output_bots[bot_index] = bot;
}

// Batch processing variant with shared memory optimization
@compute @workgroup_size(256)
fn batch_inference(@builtin(global_invocation_id) global_id: vec3<u32>,
                   @builtin(local_invocation_id) local_id: vec3<u32>) {
  // Shared memory for batch processing
  var<workgroup> shared_input: array<array<f32, 64>, 4>; // 4x64 elements
  var<workgroup> shared_weights: array<array<f32, 64>, 4>;

  let bot_index = global_id.x;
  let local_idx = local_id.x;

  if (bot_index >= config.num_bots) {
    return;
  }

  // Load bot and model data into shared memory (simplified)
  // This would be more complex in real implementation

  var bot = input_bots[bot_index];

  // Simple computation
  for (var i: u32 = 0u; i < 64u; i = i + 1u) {
    var sum: f32 = 0.0;

    for (var j: u32 = 0u; j < 64u; j = j + 1u) {
      let weight_idx = config.model_params_offset + i * 64u + j;
      sum = sum + bot.input_tensor[j] * model_params[weight_idx];
    }

    bot.output_tensor[i] = tanh_activation(sum);
  }

  bot.timestamp = bot.timestamp + config.time_step;
  bot.confidence = 0.9;

  output_bots[bot_index] = bot;

  // Synchronize workgroup
  workgroupBarrier();
}