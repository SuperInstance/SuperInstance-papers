// confidence_propagation.wgsl - Confidence Cascade Computation
//
// Computes confidence propagation through SMPbot networks using
// sequential multiplication and parallel averaging rules.

// Confidence graph node
struct ConfidenceNode {
  bot_id: u32,
  confidence: f32,
  input_count: u32,
  output_count: u32,
  padding: vec2<u32>,
}

// Edge in confidence graph
struct ConfidenceEdge {
  source_id: u32,
  target_id: u32,
  weight: f32,
  is_sequential: u32, // 0 = parallel, 1 = sequential
  padding: vec2<u32>,
}

// Propagation configuration
struct PropagationConfig {
  num_nodes: u32,
  num_edges: u32,
  max_iterations: u32,
  convergence_threshold: f32,
  damping_factor: f32,
  time_step: f32,
  padding: vec2<u32>,
}

// Storage buffers
@group(0) @binding(0) var<storage, read_write> nodes: array<ConfidenceNode>;
@group(0) @binding(1) var<storage, read> edges: array<ConfidenceEdge>;
@group(0) @binding(2) var<storage, read_write> temp_confidences: array<f32>;
@group(0) @binding(3) var<uniform> config: PropagationConfig;

// Sequential composition: confidence multiplies
fn sequential_composition(c1: f32, c2: f32) -> f32 {
  return c1 * c2;
}

// Parallel composition: confidence averages
fn parallel_composition(c1: f32, c2: f32) -> f32 {
  return (c1 + c2) * 0.5;
}

// Three-zone classification
fn classify_zone(confidence: f32) -> u32 {
  // GREEN zone: high confidence
  if (confidence >= 0.9) {
    return 0u;
  }
  // YELLOW zone: moderate confidence
  else if (confidence >= 0.75) {
    return 1u;
  }
  // RED zone: low confidence
  else {
    return 2u;
  }
}

// Zone transition rules
fn can_transition(from_zone: u32, to_zone: u32) -> bool {
  // Allow transitions within same zone or to higher confidence zone
  // Disallow transitions from high to low confidence
  if (from_zone == 0u && to_zone == 2u) {
    return false; // GREEN -> RED not allowed
  }
  if (from_zone == 1u && to_zone == 2u) {
    return false; // YELLOW -> RED not allowed without verification
  }
  return true;
}

// Main confidence propagation kernel
@compute @workgroup_size(64)
fn propagate_confidence(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let node_index = global_id.x;

  if (node_index >= config.num_nodes) {
    return;
  }

  var node = nodes[node_index];
  let original_confidence = node.confidence;

  // Find incoming edges
  var incoming_confidence: f32 = 1.0;
  var incoming_count: u32 = 0u;

  for (var i: u32 = 0u; i < config.num_edges; i = i + 1u) {
    let edge = edges[i];

    if (edge.target_id == node_index) {
      let source_node = nodes[edge.source_id];
      let edge_confidence = source_node.confidence * edge.weight;

      if (edge.is_sequential == 1u) {
        // Sequential composition: multiply
        incoming_confidence = incoming_confidence * edge_confidence;
      } else {
        // Parallel composition: accumulate for averaging
        incoming_confidence = incoming_confidence + edge_confidence;
        incoming_count = incoming_count + 1u;
      }
    }
  }

  // Apply composition rules
  var new_confidence: f32;

  if (incoming_count > 0u) {
    // Had parallel edges, use average
    new_confidence = incoming_confidence / f32(incoming_count);
  } else {
    // Only sequential edges or no edges
    new_confidence = incoming_confidence;
  }

  // Apply damping factor for stability
  new_confidence = mix(
    original_confidence,
    new_confidence,
    config.damping_factor
  );

  // Clamp to valid range
  new_confidence = clamp(new_confidence, 0.0, 1.0);

  // Check zone transition validity
  let old_zone = classify_zone(original_confidence);
  let new_zone = classify_zone(new_confidence);

  if (can_transition(old_zone, new_zone)) {
    node.confidence = new_confidence;
  } else {
    // Invalid transition, apply conservative update
    node.confidence = max(original_confidence, new_confidence * 0.5);
  }

  // Store updated node
  nodes[node_index] = node;
  temp_confidences[node_index] = new_confidence;
}

// Convergence detection kernel
@compute @workgroup_size(64)
fn detect_convergence(@builtin(global_invocation_id) global_id: vec3<u32>,
                      @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  // Shared memory for workgroup reduction
  var<workgroup> shared_diffs: array<f32, 64>;

  let local_idx = local_id.x;
  let node_index = global_id.x;

  if (node_index >= config.num_nodes) {
    shared_diffs[local_idx] = 0.0;
  } else {
    let node = nodes[node_index];
    let temp_conf = temp_confidences[node_index];
    let diff = abs(node.confidence - temp_conf);
    shared_diffs[local_idx] = diff;
  }

  workgroupBarrier();

  // Tree reduction within workgroup
  var offset: u32 = 32u;
  while (offset > 0u) {
    if (local_idx < offset) {
      shared_diffs[local_idx] = max(shared_diffs[local_idx], shared_diffs[local_idx + offset]);
    }
    workgroupBarrier();
    offset = offset / 2u;
  }

  // First thread writes workgroup result
  if (local_idx == 0u) {
    // Store max diff for this workgroup
    // In real implementation, would use atomic operations to global memory
  }
}

// Batch confidence update for SMPbot grids
@compute @workgroup_size(256)
fn batch_confidence_update(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let bot_index = global_id.x;

  if (bot_index >= config.num_nodes) {
    return;
  }

  // Simplified batch update for spreadsheet grid
  // Each bot's confidence depends on neighbors

  var node = nodes[bot_index];
  var total_confidence: f32 = 0.0;
  var neighbor_count: u32 = 0u;

  // Check 4-connected neighbors (up, down, left, right)
  let grid_width = u32(sqrt(f32(config.num_nodes)));
  let x = bot_index % grid_width;
  let y = bot_index / grid_width;

  // Up neighbor
  if (y > 0u) {
    let up_idx = bot_index - grid_width;
    total_confidence = total_confidence + nodes[up_idx].confidence;
    neighbor_count = neighbor_count + 1u;
  }

  // Down neighbor
  if (y < grid_width - 1u) {
    let down_idx = bot_index + grid_width;
    total_confidence = total_confidence + nodes[down_idx].confidence;
    neighbor_count = neighbor_count + 1u;
  }

  // Left neighbor
  if (x > 0u) {
    let left_idx = bot_index - 1u;
    total_confidence = total_confidence + nodes[left_idx].confidence;
    neighbor_count = neighbor_count + 1u;
  }

  // Right neighbor
  if (x < grid_width - 1u) {
    let right_idx = bot_index + 1u;
    total_confidence = total_confidence + nodes[right_idx].confidence;
    neighbor_count = neighbor_count + 1u;
  }

  // Update confidence based on neighbors
  if (neighbor_count > 0u) {
    let avg_neighbor_confidence = total_confidence / f32(neighbor_count);

    // Blend with own confidence
    node.confidence = mix(
      node.confidence,
      avg_neighbor_confidence,
      0.3 // Diffusion factor
    );

    // Apply zone-based constraints
    let zone = classify_zone(node.confidence);
    if (zone == 2u) { // RED zone
      // Limit minimum confidence in RED zone
      node.confidence = max(node.confidence, 0.1);
    }
  }

  nodes[bot_index] = node;
}

// Confidence normalization across network
@compute @workgroup_size(64)
fn normalize_confidences(@builtin(global_invocation_id) global_id: vec3<u32>,
                         @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  var<workgroup> shared_sum: array<f32, 64>;
  var<workgroup> shared_count: array<u32, 64>;

  let local_idx = local_id.x;
  let start_idx = workgroup_id.x * 64u;
  let node_index = start_idx + local_idx;

  // Initialize shared memory
  if (node_index < config.num_nodes) {
    shared_sum[local_idx] = nodes[node_index].confidence;
    shared_count[local_idx] = 1u;
  } else {
    shared_sum[local_idx] = 0.0;
    shared_count[local_idx] = 0u;
  }

  workgroupBarrier();

  // Reduction within workgroup
  var offset: u32 = 32u;
  while (offset > 0u) {
    if (local_idx < offset) {
      shared_sum[local_idx] = shared_sum[local_idx] + shared_sum[local_idx + offset];
      shared_count[local_idx] = shared_count[local_idx] + shared_count[local_idx + offset];
    }
    workgroupBarrier();
    offset = offset / 2u;
  }

  // Calculate workgroup average
  if (local_idx == 0u) {
    let workgroup_sum = shared_sum[0];
    let workgroup_count = shared_count[0];

    if (workgroup_count > 0u) {
      let workgroup_avg = workgroup_sum / f32(workgroup_count);

      // Store for global reduction (would use atomic in real implementation)
      // For now, just normalize within workgroup
      for (var i: u32 = 0u; i < 64u; i = i + 1u) {
        let idx = start_idx + i;
        if (idx < config.num_nodes) {
          var node = nodes[idx];
          // Normalize toward workgroup average
          node.confidence = mix(node.confidence, workgroup_avg, 0.1);
          nodes[idx] = node;
        }
      }
    }
  }
}