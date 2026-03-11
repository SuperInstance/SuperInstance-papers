// batch_processing.wgsl - Batch Processing and Result Aggregation
//
// Processes batches of SMPbots with optimized memory access patterns
// and aggregates results for efficient GPU execution.

// Batch configuration
struct BatchConfig {
  total_bots: u32,
  batch_size: u32,
  num_batches: u32,
  results_per_bot: u32,
  aggregation_mode: u32, // 0 = none, 1 = sum, 2 = avg, 3 = max, 4 = min
  enable_sorting: u32,
  sort_key: u32, // 0 = confidence, 1 = timestamp, 2 = model_id
  padding: vec2<u32>,
}

// Batch descriptor
struct BatchDescriptor {
  start_idx: u32,
  end_idx: u32,
  model_id: u32,
  priority: f32,
  status: u32, // 0 = pending, 1 = processing, 2 = complete
  padding: vec2<u32>,
}

// Aggregation result
struct AggregationResult {
  sum: array<f32, 512>,
  count: u32,
  min: array<f32, 512>,
  max: array<f32, 512>,
  mean: array<f32, 512>,
  variance: array<f32, 512>,
}

// Storage buffers
@group(0) @binding(0) var<storage, read> input_bots: array<SMPbotState>;
@group(0) @binding(1) var<storage, read_write> output_bots: array<SMPbotState>;
@group(0) @binding(2) var<storage, read_write> batch_descriptors: array<BatchDescriptor>;
@group(0) @binding(3) var<storage, read_write> aggregation_results: array<AggregationResult>;
@group(0) @binding(4) var<uniform> config: BatchConfig;

// SMPbotState from inference shader (redefined for completeness)
struct SMPbotState {
  seed_hash: u32,
  model_id: u32,
  prompt_hash: u32,
  input_tensor: array<f32, 512>,
  output_tensor: array<f32, 512>,
  confidence: f32,
  timestamp: f32,
  flags: u32,
  padding: vec3<u32>,
}

// Process single batch
@compute @workgroup_size(256)
fn process_batch(@builtin(global_invocation_id) global_id: vec3<u32>,
                 @builtin(local_invocation_id) local_id: vec3<u32>) {
  let batch_index = global_id.x;

  if (batch_index >= config.num_batches) {
    return;
  }

  var batch = batch_descriptors[batch_index];
  let start_idx = batch.start_idx;
  let end_idx = min(batch.end_idx, config.total_bots);
  let batch_size = end_idx - start_idx;

  // Shared memory for batch processing
  var<workgroup> shared_inputs: array<array<f32, 64>, 4>;
  var<workgroup> shared_outputs: array<array<f32, 64>, 4>;

  let local_idx = local_id.x;
  let items_per_thread = (batch_size + 255u) / 256u;
  let thread_start = start_idx + local_idx * items_per_thread;
  let thread_end = min(thread_start + items_per_thread, end_idx);

  // Process assigned items
  for (var i: u32 = thread_start; i < thread_end; i = i + 1u) {
    var bot = input_bots[i];

    // Simple processing (would call inference shader in real implementation)
    for (var j: u32 = 0u; j < 64u; j = j + 1u) {
      var sum: f32 = 0.0;
      for (var k: u32 = 0u; k < 64u; k = k + 1u) {
        sum = sum + bot.input_tensor[k] * 0.01; // Simplified
      }
      bot.output_tensor[j] = tanh(sum);
    }

    // Update confidence based on output variance
    var mean: f32 = 0.0;
    for (var j: u32 = 0u; j < 64u; j = j + 1u) {
      mean = mean + bot.output_tensor[j];
    }
    mean = mean / 64.0;

    var variance: f32 = 0.0;
    for (var j: u32 = 0u; j < 64u; j = j + 1u) {
      let diff = bot.output_tensor[j] - mean;
      variance = variance + diff * diff;
    }
    variance = variance / 64.0;

    bot.confidence = 1.0 / (1.0 + sqrt(variance));
    bot.timestamp = bot.timestamp + 1.0;

    output_bots[i] = bot;
  }

  // Mark batch as complete
  batch.status = 2u; // complete
  batch_descriptors[batch_index] = batch;

  workgroupBarrier();
}

// Aggregate batch results
@compute @workgroup_size(256)
fn aggregate_results(@builtin(global_invocation_id) global_id: vec3<u32>,
                     @builtin(local_invocation_id) local_id: vec3<u32>) {
  let aggregation_index = global_id.x;

  if (aggregation_index >= config.num_batches) {
    return;
  }

  var batch = batch_descriptors[aggregation_index];
  if (batch.status != 2u) { // Not complete
    return;
  }

  let start_idx = batch.start_idx;
  let end_idx = min(batch.end_idx, config.total_bots);

  var result = aggregation_results[aggregation_index];
  let local_idx = local_id.x;

  // Initialize aggregation
  if (local_idx == 0u) {
    result.count = 0u;
    for (var i: u32 = 0u; i < 512u; i = i + 1u) {
      result.sum[i] = 0.0;
      result.min[i] = 1e9;
      result.max[i] = -1e9;
    }
  }

  workgroupBarrier();

  // Each thread processes a subset of bots in the batch
  let items_per_thread = ((end_idx - start_idx) + 255u) / 256u;
  let thread_start = start_idx + local_idx * items_per_thread;
  let thread_end = min(thread_start + items_per_thread, end_idx);

  // Thread-local aggregation
  var local_sum: array<f32, 512>;
  var local_min: array<f32, 512>;
  var local_max: array<f32, 512>;
  var local_count: u32 = 0u;

  for (var i: u32 = 0u; i < 512u; i = i + 1u) {
    local_sum[i] = 0.0;
    local_min[i] = 1e9;
    local_max[i] = -1e9;
  }

  for (var i: u32 = thread_start; i < thread_end; i = i + 1u) {
    let bot = output_bots[i];
    local_count = local_count + 1u;

    for (var j: u32 = 0u; j < 64u; j = j + 1u) { // Only first 64 elements for efficiency
      let value = bot.output_tensor[j];
      local_sum[j] = local_sum[j] + value;
      local_min[j] = min(local_min[j], value);
      local_max[j] = max(local_max[j], value);
    }
  }

  // Shared memory for reduction
  var<workgroup> shared_sums: array<array<f32, 64>, 4>;
  var<workgroup> shared_mins: array<array<f32, 64>, 4>;
  var<workgroup> shared_maxs: array<array<f32, 64>, 4>;
  var<workgroup> shared_counts: array<u32, 256>;

  // Store thread-local results
  for (var i: u32 = 0u; i < 64u; i = i + 1u) {
    shared_sums[local_idx / 64u][i] = local_sum[i];
    shared_mins[local_idx / 64u][i] = local_min[i];
    shared_maxs[local_idx / 64u][i] = local_max[i];
  }
  shared_counts[local_idx] = local_count;

  workgroupBarrier();

  // Reduction within workgroup
  if (local_idx < 128u) {
    for (var i: u32 = 0u; i < 64u; i = i + 1u) {
      shared_sums[local_idx / 64u][i] = shared_sums[local_idx / 64u][i] + shared_sums[(local_idx + 128u) / 64u][i];
      shared_mins[local_idx / 64u][i] = min(shared_mins[local_idx / 64u][i], shared_mins[(local_idx + 128u) / 64u][i]);
      shared_maxs[local_idx / 64u][i] = max(shared_maxs[local_idx / 64u][i], shared_maxs[(local_idx + 128u) / 64u][i]);
    }
    shared_counts[local_idx] = shared_counts[local_idx] + shared_counts[local_idx + 128u];
  }

  workgroupBarrier();

  if (local_idx < 64u) {
    for (var i: u32 = 0u; i < 64u; i = i + 1u) {
      shared_sums[local_idx / 64u][i] = shared_sums[local_idx / 64u][i] + shared_sums[(local_idx + 64u) / 64u][i];
      shared_mins[local_idx / 64u][i] = min(shared_mins[local_idx / 64u][i], shared_mins[(local_idx + 64u) / 64u][i]);
      shared_maxs[local_idx / 64u][i] = max(shared_maxs[local_idx / 64u][i], shared_maxs[(local_idx + 64u) / 64u][i]);
    }
    shared_counts[local_idx] = shared_counts[local_idx] + shared_counts[local_idx + 64u];
  }

  workgroupBarrier();

  if (local_idx < 32u) {
    for (var i: u32 = 0u; i < 64u; i = i + 1u) {
      shared_sums[local_idx / 64u][i] = shared_sums[local_idx / 64u][i] + shared_sums[(local_idx + 32u) / 64u][i];
      shared_mins[local_idx / 64u][i] = min(shared_mins[local_idx / 64u][i], shared_mins[(local_idx + 32u) / 64u][i]);
      shared_maxs[local_idx / 64u][i] = max(shared_maxs[local_idx / 64u][i], shared_maxs[(local_idx + 32u) / 64u][i]);
    }
    shared_counts[local_idx] = shared_counts[local_idx] + shared_counts[local_idx + 32u];
  }

  workgroupBarrier();

  // Final reduction by first warp
  if (local_idx < 16u) {
    for (var i: u32 = 0u; i < 64u; i = i + 1u) {
      shared_sums[local_idx / 64u][i] = shared_sums[local_idx / 64u][i] + shared_sums[(local_idx + 16u) / 64u][i];
      shared_mins[local_idx / 64u][i] = min(shared_mins[local_idx / 64u][i], shared_mins[(local_idx + 16u) / 64u][i]);
      shared_maxs[local_idx / 64u][i] = max(shared_maxs[local_idx / 64u][i], shared_maxs[(local_idx + 16u) / 64u][i]);
    }
    shared_counts[local_idx] = shared_counts[local_idx] + shared_counts[local_idx + 16u];
  }

  workgroupBarrier();

  // Store final results
  if (local_idx == 0u) {
    result.count = shared_counts[0];
    for (var i: u32 = 0u; i < 64u; i = i + 1u) {
      result.sum[i] = shared_sums[0][i];
      result.min[i] = shared_mins[0][i];
      result.max[i] = shared_maxs[0][i];

      if (result.count > 0u) {
        result.mean[i] = result.sum[i] / f32(result.count);
      }
    }

    // Calculate variance in a second pass (simplified)
    for (var i: u32 = 0u; i < 64u; i = i + 1u) {
      result.variance[i] = 0.0;
    }

    aggregation_results[aggregation_index] = result;
  }
}

// Sort bots within batch by confidence
@compute @workgroup_size(256)
fn sort_batch(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let batch_index = global_id.x;

  if (batch_index >= config.num_batches) {
    return;
  }

  var batch = batch_descriptors[batch_index];
  let start_idx = batch.start_idx;
  let end_idx = min(batch.end_idx, config.total_bots);
  let batch_size = end_idx - start_idx;

  if (batch_size <= 1u || config.enable_sorting == 0u) {
    return;
  }

  // Bitonic sort within workgroup (simplified)
  // In real implementation, would use more sophisticated sorting

  // Shared memory for sorting
  var<workgroup> shared_keys: array<f32, 256>;
  var<workgroup> shared_indices: array<u32, 256>;

  let local_idx = local_id.x;

  // Load data into shared memory
  if (local_idx < batch_size) {
    let bot_idx = start_idx + local_idx;
    let bot = output_bots[bot_idx];

    // Select sort key
    var key: f32;
    switch (config.sort_key) {
      case 0u: { key = bot.confidence; }
      case 1u: { key = bot.timestamp; }
      case 2u: { key = f32(bot.model_id); }
      default: { key = bot.confidence; }
    }

    shared_keys[local_idx] = key;
    shared_indices[local_idx] = bot_idx;
  } else {
    shared_keys[local_idx] = -1e9;
    shared_indices[local_idx] = 0xFFFFFFFFu;
  }

  workgroupBarrier();

  // Simple bubble sort for demonstration (inefficient but simple)
  // Real implementation would use bitonic or radix sort
  for (var i: u32 = 0u; i < batch_size; i = i + 1u) {
    for (var j: u32 = 0u; j < batch_size - i - 1u; j = j + 1u) {
      if (shared_keys[j] < shared_keys[j + 1u]) { // Descending sort
        // Swap keys
        let temp_key = shared_keys[j];
        shared_keys[j] = shared_keys[j + 1u];
        shared_keys[j + 1u] = temp_key;

        // Swap indices
        let temp_idx = shared_indices[j];
        shared_indices[j] = shared_indices[j + 1u];
        shared_indices[j + 1u] = temp_idx;
      }
    }
  }

  workgroupBarrier();

  // Write back sorted order (would need temporary buffer in real implementation)
  // For now, just mark as sorted
  if (local_idx == 0u) {
    // In real implementation, would reorder bots based on shared_indices
  }
}

// Merge aggregation results across batches
@compute @workgroup_size(64)
fn merge_aggregations(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let result_index = global_id.x;

  if (result_index >= 512u) { // Only process first 512 elements
    return;
  }

  // Global aggregation across all batches
  var global_sum: f32 = 0.0;
  var global_min: f32 = 1e9;
  var global_max: f32 = -1e9;
  var global_count: u32 = 0u;

  for (var i: u32 = 0u; i < config.num_batches; i = i + 1u) {
    let result = aggregation_results[i];
    if (result.count > 0u && result_index < 64u) {
      global_sum = global_sum + result.sum[result_index];
      global_min = min(global_min, result.min[result_index]);
      global_max = max(global_max, result.max[result_index]);
      global_count = global_count + result.count;
    }
  }

  // Store global statistics (would use separate buffer in real implementation)
  // For now, just demonstrate the computation
}