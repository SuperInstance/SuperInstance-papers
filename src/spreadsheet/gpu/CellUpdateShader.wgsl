/**
 * CellUpdateShader.wgsl - WebGPU Compute Shader for Cell Updates
 *
 * Parallel cell processing for spreadsheet operations.
 * Each cell processes independently based on its configuration.
 */

// Cell state structure
struct CellState {
  value: f32,           // Current cell value
  previousValue: f32,   // Previous value (for velocity calculation)
  velocity: f32,        // Rate of change
  acceleration: f32,    // Trend acceleration
  timestamp: f32,       // Last update timestamp
  flags: u32,           // State flags (active, error, etc.)
  _padding: f32,        // Alignment padding
}

// Cell configuration structure
struct CellConfig {
  operation: u32,       // Operation type (sum, avg, max, min, etc.)
  inputCount: u32,      // Number of input cells
  inputOffset: u32,     // Offset to input cell indices
  threshold: f32,       // Threshold for validation
  weight: f32,          // Weight for aggregation
}

// Global configuration buffer
struct GlobalConfig {
  cellCount: u32,       // Total number of cells
  currentTime: f32,     // Current timestamp
  deltaTime: f32,       // Time since last update
  decayRate: f32,       // Value decay rate
  _padding: f32,        // Alignment padding
}

// Input buffer: Read-only cell states
@group(0) @binding(0)
var<storage, read> inputCells: array<CellState>;

// Output buffer: Writable cell states
@group(0) @binding(1)
var<storage, read_write> outputCells: array<CellState>;

// Config buffer: Global configuration
@group(0) @binding(2)
var<uniform> config: GlobalConfig;

// Input indices buffer (shared)
@group(0) @binding(3)
var<storage, read> inputIndices: array<u32>;

// Operation constants
const OP_NOP: u32 = 0u;
const OP_COPY: u32 = 1u;
const OP_SUM: u32 = 2u;
const OP_AVG: u32 = 3u;
const OP_MAX: u32 = 4u;
const OP_MIN: u32 = 5u;
const OP_PRODUCT: u32 = 6u;
const OP_DIFF: u32 = 7u;
const OP_VELOCITY: u32 = 8u;
const OP_ACCELERATION: u32 = 9u;
const OP_THRESHOLD: u32 = 10u;
const OP_WEIGHTED_SUM: u32 = 11u;
const OP_DECAY: u32 = 12u;

// Flag constants
const FLAG_ACTIVE: u32 = 1u;
const FLAG_ERROR: u32 = 2u;
const FLAG_MODIFIED: u32 = 4u;

/**
 * Main compute function - processes one cell per invocation
 */
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let cellIndex = global_id.x;

  // Bounds check
  if (cellIndex >= config.cellCount) {
    return;
  }

  // Read current cell state
  var currentState = inputCells[cellIndex];
  var newState = currentState;

  // Skip inactive cells
  if ((currentState.flags & FLAG_ACTIVE) == 0u) {
    outputCells[cellIndex] = newState;
    return;
  }

  // Calculate velocity and acceleration
  let deltaTime = config.currentTime - currentState.timestamp;
  if (deltaTime > 0.0) {
    newState.velocity = (currentState.value - currentState.previousValue) / deltaTime;
    newState.acceleration = newState.velocity - currentState.velocity;
  }

  // Apply decay if configured
  if (config.decayRate > 0.0) {
    newState.value = newState.value * (1.0 - config.decayRate * config.deltaTime);
  }

  // Update timestamp
  newState.timestamp = config.currentTime;
  newState.previousValue = currentState.value;

  // Mark as not modified (will be set by specific operations)
  newState.flags = newState.flags & (~FLAG_MODIFIED);

  // Store result
  outputCells[cellIndex] = newState;
}

/**
 * Advanced cell update with operation support
 */
@compute @workgroup_size(64)
fn updateWithOperation(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let cellIndex = global_id.x;

  if (cellIndex >= config.cellCount) {
    return;
  }

  var currentState = inputCells[cellIndex];
  var newState = currentState;

  if ((currentState.flags & FLAG_ACTIVE) == 0u) {
    outputCells[cellIndex] = newState;
    return;
  }

  // Calculate velocity and acceleration
  let deltaTime = config.currentTime - currentState.timestamp;
  if (deltaTime > 0.0) {
    newState.velocity = (currentState.value - currentState.previousValue) / deltaTime;
  }

  // Apply operation based on cell type
  // This is a placeholder - actual operation would be determined by cell metadata
  let operation = OP_NOP; // Would come from cell config

  switch (operation) {
    case OP_SUM: {
      // Sum of input cells
      newState.value = 0.0;
      // Would iterate over input cells
    }
    case OP_AVG: {
      // Average of input cells
      newState.value = 0.0;
    }
    case OP_MAX: {
      // Maximum of input cells
      newState.value = 0.0;
    }
    case OP_MIN: {
      // Minimum of input cells
      newState.value = 0.0;
    }
    case OP_DECAY: {
      // Apply decay
      newState.value = newState.value * (1.0 - config.decayRate * config.deltaTime);
    }
    default: {
      // No operation
    }
  }

  newState.timestamp = config.currentTime;
  newState.previousValue = currentState.value;
  newState.flags = newState.flags | FLAG_MODIFIED;

  outputCells[cellIndex] = newState;
}

/**
 * Sensation diffusion shader
 * Propagates cell values to neighboring cells
 */
@compute @workgroup_size(64)
fn sensationDiffusion(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let cellIndex = global_id.x;

  if (cellIndex >= config.cellCount) {
    return;
  }

  var currentState = inputCells[cellIndex];
  var newState = currentState;

  if ((currentState.flags & FLAG_ACTIVE) == 0u) {
    outputCells[cellIndex] = newState;
    return;
  }

  // Diffusion coefficient
  let diffusionRate = 0.1;
  var influence = 0.0;

  // Sample neighboring cells (simplified - would need actual neighbor list)
  // This is a placeholder for actual diffusion logic
  let neighborCount = 4u;
  for (var i = 0u; i < neighborCount; i = i + 1u) {
    let neighborIndex = (cellIndex + i) % config.cellCount;
    let neighborValue = inputCells[neighborIndex].value;
    influence = influence + (neighborValue - currentState.value);
  }

  newState.value = currentState.value + diffusionRate * influence / f32(neighborCount);
  newState.timestamp = config.currentTime;

  outputCells[cellIndex] = newState;
}

/**
 * Velocity-based update shader
 * Updates cells based on their rate of change
 */
@compute @workgroup_size(64)
fn velocityUpdate(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let cellIndex = global_id.x;

  if (cellIndex >= config.cellCount) {
    return;
  }

  var currentState = inputCells[cellIndex];
  var newState = currentState;

  if ((currentState.flags & FLAG_ACTIVE) == 0u) {
    outputCells[cellIndex] = newState;
    return;
  }

  // Calculate velocity
  let deltaTime = config.currentTime - currentState.timestamp;
  if (deltaTime > 0.0) {
    newState.velocity = (currentState.value - currentState.previousValue) / deltaTime;
  }

  // Exponential smoothing of velocity
  let smoothingFactor = 0.3;
  newState.velocity = mix(currentState.velocity, newState.velocity, smoothingFactor);

  // Update value based on velocity
  newState.value = currentState.value + newState.velocity * config.deltaTime;

  // Update timestamps
  newState.timestamp = config.currentTime;
  newState.previousValue = currentState.value;

  outputCells[cellIndex] = newState;
}

/**
 * Threshold validation shader
 * Marks cells that exceed thresholds
 */
@compute @workgroup_size(64)
fn thresholdValidation(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let cellIndex = global_id.x;

  if (cellIndex >= config.cellCount) {
    return;
  }

  var currentState = inputCells[cellIndex];
  var newState = currentState;

  // Threshold check (would come from cell config)
  let threshold = 100.0;
  let minThreshold = -100.0;

  if (newState.value > threshold || newState.value < minThreshold) {
    newState.flags = newState.flags | FLAG_ERROR;
  } else {
    newState.flags = newState.flags & (~FLAG_ERROR);
  }

  newState.timestamp = config.currentTime;

  outputCells[cellIndex] = newState;
}

/**
 * Aggregation shader
 * Combines multiple cell values into one
 */
@compute @workgroup_size(64)
fn aggregateCells(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let cellIndex = global_id.x;

  if (cellIndex >= config.cellCount) {
    return;
  }

  var currentState = inputCells[cellIndex];
  var newState = currentState;

  if ((currentState.flags & FLAG_ACTIVE) == 0u) {
    outputCells[cellIndex] = newState;
    return;
  }

  // Aggregation logic
  // This would aggregate from input cells specified in cell config
  var sum = 0.0;
  var count = 0u;

  // Placeholder aggregation
  let inputStart = 0u;
  let inputEnd = min(inputStart + 10u, config.cellCount);

  for (var i = inputStart; i < inputEnd; i = i + 1u) {
    if (i != cellIndex) {
      sum = sum + inputCells[i].value;
      count = count + 1u;
    }
  }

  if (count > 0u) {
    newState.value = sum / f32(count);
  }

  newState.timestamp = config.currentTime;

  outputCells[cellIndex] = newState;
}
