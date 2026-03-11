/**
 * SMPbotGPUExecutor.ts - GPU Execution Wrapper for SMPbot Inference
 *
 * Provides high-level interface for executing SMPbot inference and
 * confidence propagation on GPU using WGSL compute shaders.
 */

import { ComputeShaders } from '../ComputeShaders.js';
import { GPUMemoryManager } from './GPUMemoryManager.js';
import { ModelManager, ModelGPUInfo } from './ModelManager.js';

export interface SMPbotGPUState {
  seedHash: number;
  modelId: number;
  promptHash: number;
  inputTensor: Float32Array; // 512 elements
  outputTensor: Float32Array; // 512 elements
  confidence: number;
  timestamp: number;
  flags: number;
}

export interface InferenceConfig {
  numBots: number;
  batchSize: number;
  timeStep: number;
  workgroupSize: number;
  executionMode: 'simple' | 'batch' | 'pipeline';
}

export interface ConfidencePropagationConfig {
  maxIterations: number;
  convergenceThreshold: number;
  dampingFactor: number;
  propagationMode: 'sequential' | 'parallel' | 'grid';
}

/**
 * SMPbot GPU Executor
 */
export class SMPbotGPUExecutor {
  private computeShaders: ComputeShaders;
  private memoryManager: GPUMemoryManager;
  private modelManager: ModelManager;
  private device: GPUDevice | null = null;

  // Shader pipelines
  private inferencePipeline: GPUComputePipeline | null = null;
  private confidencePipeline: GPUComputePipeline | null = null;
  private batchPipeline: GPUComputePipeline | null = null;

  // Buffers
  private inputBuffer: GPUBuffer | null = null;
  private outputBuffer: GPUBuffer | null = null;
  private configBuffer: GPUBuffer | null = null;

  constructor() {
    this.computeShaders = new ComputeShaders();
    this.memoryManager = new GPUMemoryManager();
    this.modelManager = new ModelManager(this.memoryManager);
  }

  /**
   * Initialize GPU executor
   */
  async initialize(): Promise<boolean> {
    // Initialize compute shaders
    const initialized = await this.computeShaders.initialize();
    if (!initialized) {
      console.error('Failed to initialize compute shaders:', this.computeShaders.getFallbackReason());
      return false;
    }

    // Get device from compute shaders
    // Note: ComputeShaders doesn't expose device directly, would need modification
    // For now, assume initialization succeeded
    console.log('SMPbot GPU Executor initialized');
    return true;
  }

  /**
   * Load inference shader
   */
  async loadInferenceShader(): Promise<boolean> {
    const shaderCode = await this.loadShader('smpbot_inference.wgsl');
    if (!shaderCode) {
      return false;
    }

    // Load shader with multiple entry points
    const success = this.computeShaders.loadShader('smpbot_inference', shaderCode, {
      workgroupSize: [64, 1, 1],
      entryPoint: 'simple_inference',
    });

    if (success) {
      console.log('Inference shader loaded successfully');
    }

    return success;
  }

  /**
   * Load confidence propagation shader
   */
  async loadConfidenceShader(): Promise<boolean> {
    const shaderCode = await this.loadShader('confidence_propagation.wgsl');
    if (!shaderCode) {
      return false;
    }

    const success = this.computeShaders.loadShader('confidence_propagation', shaderCode, {
      workgroupSize: [64, 1, 1],
      entryPoint: 'propagate_confidence',
    });

    if (success) {
      console.log('Confidence propagation shader loaded successfully');
    }

    return success;
  }

  /**
   * Load batch processing shader
   */
  async loadBatchShader(): Promise<boolean> {
    const shaderCode = await this.loadShader('batch_processing.wgsl');
    if (!shaderCode) {
      return false;
    }

    const success = this.computeShaders.loadShader('batch_processing', shaderCode, {
      workgroupSize: [256, 1, 1],
      entryPoint: 'process_batch',
    });

    if (success) {
      console.log('Batch processing shader loaded successfully');
    }

    return success;
  }

  /**
   * Load shader from file
   */
  private async loadShader(filename: string): Promise<string | null> {
    try {
      // In real implementation, would load from file system
      // For now, return embedded shader code
      if (filename === 'smpbot_inference.wgsl') {
        return this.getInferenceShaderCode();
      } else if (filename === 'confidence_propagation.wgsl') {
        return this.getConfidenceShaderCode();
      } else if (filename === 'batch_processing.wgsl') {
        return this.getBatchShaderCode();
      }
      return null;
    } catch (error) {
      console.error(`Failed to load shader ${filename}:`, error);
      return null;
    }
  }

  /**
   * Get embedded inference shader code
   */
  private getInferenceShaderCode(): string {
    // Return simplified shader code for demonstration
    return `
      @group(0) @binding(0) var<storage, read> input_bots: array<SMPbotState>;
      @group(0) @binding(1) var<storage, read_write> output_bots: array<SMPbotState>;
      @group(0) @binding(2) var<storage, read> model_params: array<f32>;
      @group(0) @binding(3) var<uniform> config: InferenceConfig;

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

      struct InferenceConfig {
        num_bots: u32,
        batch_size: u32,
        model_params_offset: u32,
        time_step: f32,
        workgroup_size: u32,
        num_workgroups: u32,
        padding: vec2<u32>,
      }

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let bot_index = global_id.x;
        if (bot_index >= config.num_bots) {
          return;
        }

        var bot = input_bots[bot_index];
        let input_size = 64u;
        let output_size = 64u;

        // Simple inference for demonstration
        for (var i: u32 = 0u; i < output_size; i = i + 1u) {
          var sum: f32 = 0.0;
          for (var j: u32 = 0u; j < input_size; j = j + 1u) {
            let weight_idx = config.model_params_offset + i * input_size + j;
            sum = sum + bot.input_tensor[j] * model_params[weight_idx];
          }
          let bias_idx = config.model_params_offset + output_size * input_size + i;
          sum = sum + model_params[bias_idx];
          bot.output_tensor[i] = tanh(sum);
        }

        bot.timestamp = bot.timestamp + config.time_step;

        // Simple confidence calculation
        var mean: f32 = 0.0;
        for (var i: u32 = 0u; i < output_size; i = i + 1u) {
          mean = mean + bot.output_tensor[i];
        }
        mean = mean / f32(output_size);

        var variance: f32 = 0.0;
        for (var i: u32 = 0u; i < output_size; i = i + 1u) {
          let diff = bot.output_tensor[i] - mean;
          variance = variance + diff * diff;
        }
        variance = variance / f32(output_size);
        bot.confidence = 1.0 / (1.0 + sqrt(variance));

        output_bots[bot_index] = bot;
      }
    `;
  }

  /**
   * Get embedded confidence shader code
   */
  private getConfidenceShaderCode(): string {
    return `
      @group(0) @binding(0) var<storage, read_write> nodes: array<ConfidenceNode>;
      @group(0) @binding(1) var<storage, read> edges: array<ConfidenceEdge>;
      @group(0) @binding(2) var<uniform> config: PropagationConfig;

      struct ConfidenceNode {
        bot_id: u32,
        confidence: f32,
        input_count: u32,
        output_count: u32,
        padding: vec2<u32>,
      }

      struct ConfidenceEdge {
        source_id: u32,
        target_id: u32,
        weight: f32,
        is_sequential: u32,
        padding: vec2<u32>,
      }

      struct PropagationConfig {
        num_nodes: u32,
        num_edges: u32,
        max_iterations: u32,
        convergence_threshold: f32,
        damping_factor: f32,
        time_step: f32,
        padding: vec2<u32>,
      }

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
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
              incoming_confidence = incoming_confidence * edge_confidence;
            } else {
              incoming_confidence = incoming_confidence + edge_confidence;
              incoming_count = incoming_count + 1u;
            }
          }
        }

        // Apply composition rules
        var new_confidence: f32;
        if (incoming_count > 0u) {
          new_confidence = incoming_confidence / f32(incoming_count);
        } else {
          new_confidence = incoming_confidence;
        }

        // Apply damping
        new_confidence = mix(original_confidence, new_confidence, config.damping_factor);
        new_confidence = clamp(new_confidence, 0.0, 1.0);

        // Zone-based constraints
        let old_zone = select(0u, select(1u, 2u, original_confidence < 0.75), original_confidence < 0.9);
        let new_zone = select(0u, select(1u, 2u, new_confidence < 0.75), new_confidence < 0.9);

        if (!(old_zone == 0u && new_zone == 2u) && !(old_zone == 1u && new_zone == 2u)) {
          node.confidence = new_confidence;
        } else {
          node.confidence = max(original_confidence, new_confidence * 0.5);
        }

        nodes[node_index] = node;
      }
    `;
  }

  /**
   * Get embedded batch shader code
   */
  private getBatchShaderCode(): string {
    return `
      @group(0) @binding(0) var<storage, read> input_bots: array<SMPbotState>;
      @group(0) @binding(1) var<storage, read_write> output_bots: array<SMPbotState>;
      @group(0) @binding(2) var<uniform> config: BatchConfig;

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

      struct BatchConfig {
        total_bots: u32,
        batch_size: u32,
        num_batches: u32,
        results_per_bot: u32,
        aggregation_mode: u32,
        enable_sorting: u32,
        sort_key: u32,
        padding: vec2<u32>,
      }

      @compute @workgroup_size(256)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let batch_index = global_id.x;
        if (batch_index >= config.num_batches) {
          return;
        }

        let batch_size = config.batch_size;
        let start_idx = batch_index * batch_size;
        let end_idx = min(start_idx + batch_size, config.total_bots);

        // Process batch
        for (var i: u32 = start_idx; i < end_idx; i = i + 1u) {
          var bot = input_bots[i];

          // Simple processing
          for (var j: u32 = 0u; j < 64u; j = j + 1u) {
            var sum: f32 = 0.0;
            for (var k: u32 = 0u; k < 64u; k = k + 1u) {
              sum = sum + bot.input_tensor[k] * 0.01;
            }
            bot.output_tensor[j] = tanh(sum);
          }

          // Update confidence
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
      }
    `;
  }

  /**
   * Execute SMPbot inference on GPU
   */
  async executeInference(
    bots: SMPbotGPUState[],
    modelId: string,
    config: InferenceConfig
  ): Promise<SMPbotGPUState[]> {
    // Ensure model is loaded
    const modelInfo = await this.modelManager.ensureModelLoaded(modelId);
    if (!modelInfo) {
      throw new Error(`Failed to load model ${modelId}`);
    }

    // Create buffers
    const inputBuffer = this.createBotBuffer(bots, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    const outputBuffer = this.createOutputBuffer(bots.length);
    const configBuffer = this.createConfigBuffer(config, modelInfo);

    // Execute shader
    const workgroups = this.calculateWorkgroups(bots.length, config.workgroupSize);

    const result = await this.computeShaders.execute(
      'smpbot_inference',
      inputBuffer,
      outputBuffer,
      configBuffer,
      workgroups
    );

    // Read back results
    const outputBots = this.readBotBuffer(result.data, bots.length);

    // Cleanup
    inputBuffer.destroy();
    outputBuffer.destroy();
    configBuffer.destroy();

    return outputBots;
  }

  /**
   * Execute confidence propagation
   */
  async executeConfidencePropagation(
    nodes: Array<{ botId: number; confidence: number; inputCount: number; outputCount: number }>,
    edges: Array<{ sourceId: number; targetId: number; weight: number; isSequential: boolean }>,
    config: ConfidencePropagationConfig
  ): Promise<number[]> {
    // Create buffers
    const nodesBuffer = this.createNodesBuffer(nodes);
    const edgesBuffer = this.createEdgesBuffer(edges);
    const configBuffer = this.createConfidenceConfigBuffer(config, nodes.length, edges.length);

    // Calculate workgroups
    const workgroupSize = 64;
    const workgroups = this.calculateWorkgroups(nodes.length, workgroupSize);

    // Execute shader (would need proper pipeline setup)
    // For now, return original confidences
    return nodes.map(node => node.confidence);
  }

  /**
   * Create buffer for bot states
   */
  private createBotBuffer(bots: SMPbotGPUState[], usage: GPUBufferUsageFlags): GPUBuffer {
    // Calculate total size
    const botSize = 4 + 4 + 4 + 512 * 4 + 512 * 4 + 4 + 4 + 4 + 3 * 4; // All fields including padding
    const totalSize = bots.length * botSize;

    // Create array buffer
    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    let offset = 0;
    for (const bot of bots) {
      view.setUint32(offset, bot.seedHash, true); offset += 4;
      view.setUint32(offset, bot.modelId, true); offset += 4;
      view.setUint32(offset, bot.promptHash, true); offset += 4;

      // Input tensor (512 floats)
      for (let i = 0; i < 512; i++) {
        view.setFloat32(offset, bot.inputTensor[i] || 0, true);
        offset += 4;
      }

      // Output tensor (512 floats, initialized to 0)
      for (let i = 0; i < 512; i++) {
        view.setFloat32(offset, 0, true);
        offset += 4;
      }

      view.setFloat32(offset, bot.confidence, true); offset += 4;
      view.setFloat32(offset, bot.timestamp, true); offset += 4;
      view.setUint32(offset, bot.flags, true); offset += 4;

      // Padding (3 u32)
      view.setUint32(offset, 0, true); offset += 4;
      view.setUint32(offset, 0, true); offset += 4;
      view.setUint32(offset, 0, true); offset += 4;
    }

    return this.computeShaders.createBuffer(arrayBuffer, usage);
  }

  /**
   * Create output buffer
   */
  private createOutputBuffer(numBots: number): GPUBuffer {
    const botSize = 4 + 4 + 4 + 512 * 4 + 512 * 4 + 4 + 4 + 4 + 3 * 4;
    const totalSize = numBots * botSize;
    return this.computeShaders.createStorageBuffer(totalSize);
  }

  /**
   * Create config buffer
   */
  private createConfigBuffer(config: InferenceConfig, modelInfo: ModelGPUInfo): GPUBuffer {
    const arrayBuffer = new ArrayBuffer(32); // 8 * 4 bytes
    const view = new DataView(arrayBuffer);

    view.setUint32(0, config.numBots, true);
    view.setUint32(4, config.batchSize, true);
    view.setUint32(8, 0, true); // model_params_offset (would be actual offset)
    view.setFloat32(12, config.timeStep, true);
    view.setUint32(16, config.workgroupSize, true);
    view.setUint32(20, Math.ceil(config.numBots / config.workgroupSize), true);
    view.setUint32(24, 0, true); // padding
    view.setUint32(28, 0, true); // padding

    return this.computeShaders.createBuffer(arrayBuffer, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
  }

  /**
   * Read bot buffer results
   */
  private readBotBuffer(data: ArrayBuffer, numBots: number): SMPbotGPUState[] {
    const bots: SMPbotGPUState[] = [];
    const view = new DataView(data);

    const botSize = 4 + 4 + 4 + 512 * 4 + 512 * 4 + 4 + 4 + 4 + 3 * 4;
    let offset = 0;

    for (let i = 0; i < numBots; i++) {
      const seedHash = view.getUint32(offset, true); offset += 4;
      const modelId = view.getUint32(offset, true); offset += 4;
      const promptHash = view.getUint32(offset, true); offset += 4;

      // Input tensor (skip)
      offset += 512 * 4;

      // Output tensor
      const outputTensor = new Float32Array(512);
      for (let j = 0; j < 512; j++) {
        outputTensor[j] = view.getFloat32(offset, true);
        offset += 4;
      }

      const confidence = view.getFloat32(offset, true); offset += 4;
      const timestamp = view.getFloat32(offset, true); offset += 4;
      const flags = view.getUint32(offset, true); offset += 4;

      // Skip padding
      offset += 3 * 4;

      bots.push({
        seedHash,
        modelId,
        promptHash,
        inputTensor: new Float32Array(512), // Input not needed in output
        outputTensor,
        confidence,
        timestamp,
        flags,
      });
    }

    return bots;
  }

  /**
   * Calculate workgroups for given problem size
   */
  private calculateWorkgroups(numItems: number, workgroupSize: number): [number, number, number] {
    const workgroups = Math.ceil(numItems / workgroupSize);
    return [workgroups, 1, 1];
  }

  /**
   * Create nodes buffer for confidence propagation
   */
  private createNodesBuffer(nodes: Array<{ botId: number; confidence: number; inputCount: number; outputCount: number }>): GPUBuffer {
    const nodeSize = 4 + 4 + 4 + 4 + 2 * 4; // bot_id, confidence, input_count, output_count, padding
    const totalSize = nodes.length * nodeSize;
    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    let offset = 0;
    for (const node of nodes) {
      view.setUint32(offset, node.botId, true); offset += 4;
      view.setFloat32(offset, node.confidence, true); offset += 4;
      view.setUint32(offset, node.inputCount, true); offset += 4;
      view.setUint32(offset, node.outputCount, true); offset += 4;
      view.setUint32(offset, 0, true); offset += 4; // padding
      view.setUint32(offset, 0, true); offset += 4; // padding
    }

    return this.computeShaders.createBuffer(arrayBuffer, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
  }

  /**
   * Create edges buffer for confidence propagation
   */
  private createEdgesBuffer(edges: Array<{ sourceId: number; targetId: number; weight: number; isSequential: boolean }>): GPUBuffer {
    const edgeSize = 4 + 4 + 4 + 4 + 2 * 4; // source_id, target_id, weight, is_sequential, padding
    const totalSize = edges.length * edgeSize;
    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    let offset = 0;
    for (const edge of edges) {
      view.setUint32(offset, edge.sourceId, true); offset += 4;
      view.setUint32(offset, edge.targetId, true); offset += 4;
      view.setFloat32(offset, edge.weight, true); offset += 4;
      view.setUint32(offset, edge.isSequential ? 1 : 0, true); offset += 4;
      view.setUint32(offset, 0, true); offset += 4; // padding
      view.setUint32(offset, 0, true); offset += 4; // padding
    }

    return this.computeShaders.createBuffer(arrayBuffer, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
  }

  /**
   * Create confidence config buffer
   */
  private createConfidenceConfigBuffer(
    config: ConfidencePropagationConfig,
    numNodes: number,
    numEdges: number
  ): GPUBuffer {
    const arrayBuffer = new ArrayBuffer(32); // 8 * 4 bytes
    const view = new DataView(arrayBuffer);

    view.setUint32(0, numNodes, true);
    view.setUint32(4, numEdges, true);
    view.setUint32(8, config.maxIterations, true);
    view.setFloat32(12, config.convergenceThreshold, true);
    view.setFloat32(16, config.dampingFactor, true);
    view.setFloat32(20, 1.0, true); // time_step
    view.setUint32(24, 0, true); // padding
    view.setUint32(28, 0, true); // padding

    return this.computeShaders.createBuffer(arrayBuffer, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.computeShaders.cleanup();
    this.memoryManager.cleanup();
    this.modelManager.cleanup();
  }
}

/**
 * Singleton instance
 */
let executorInstance: SMPbotGPUExecutor | null = null;

export function getSMPbotGPUExecutor(): SMPbotGPUExecutor {
  if (!executorInstance) {
    executorInstance = new SMPbotGPUExecutor();
  }
  return executorInstance;
}