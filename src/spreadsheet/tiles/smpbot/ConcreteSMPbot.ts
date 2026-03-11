/**
 * Concrete SMPbot Implementation
 *
 * Reference implementation of SMPbot = Seed + Model + Prompt = Stable Output
 * Includes seed serialization, model management, and stability tracking.
 */

import { Tile, Schema, ValidationResult, SerializedTile, TileConfig, Schemas } from '../core/Tile';
import SMPbot, {
  Seed, SerializedSeed, Model, ModelParameters, Prompt, Constraint, Context, Example,
  Stable, StabilityComparison, InferenceState, GPUExecutionPlan
} from './SMPbot';

// ============================================================================
// CONCRETE SEED IMPLEMENTATION
// ============================================================================

/**
 * Concrete Seed implementation with serialization and versioning
 */
export class ConcreteSeed<T> implements Seed<T> {
  readonly id: string;
  readonly version: string;
  readonly type: 'cells' | 'columns' | 'range' | 'dataset' | 'knowledge';
  readonly data: T;
  readonly schema: Schema<T>;
  readonly hash: string;

  private createdAt: Date;
  private updatedAt: Date;

  constructor(
    id: string,
    version: string,
    type: 'cells' | 'columns' | 'range' | 'dataset' | 'knowledge',
    data: T,
    schema: Schema<T>
  ) {
    this.id = id;
    this.version = version;
    this.type = type;
    this.data = data;
    this.schema = schema;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.hash = this.computeHash();
  }

  serialize(): SerializedSeed {
    return {
      id: this.id,
      version: this.version,
      type: this.type,
      data: this.data,
      schema: this.schema,
      metadata: {
        size: this.computeSize(),
        createdAt: this.createdAt.toISOString(),
        updatedAt: this.updatedAt.toISOString(),
        hash: this.hash,
      },
    };
  }

  validate(): ValidationResult {
    const errors = [];
    const warnings = [];

    if (!this.id) {
      errors.push({ code: 'MISSING_ID', message: 'Seed ID is required' });
    }

    if (!this.version) {
      warnings.push({
        code: 'MISSING_VERSION',
        message: 'Seed version not specified',
        suggestion: 'Use semantic versioning (MAJOR.MINOR.PATCH)',
      });
    }

    if (!this.schema.validate(this.data)) {
      errors.push({
        code: 'INVALID_DATA',
        message: 'Seed data does not match schema',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  update(newData: T): Seed<T> {
    const newSeed = new ConcreteSeed(
      this.id,
      this.incrementVersion('minor'),
      this.type,
      newData,
      this.schema
    );
    return newSeed;
  }

  private computeHash(): string {
    const content = JSON.stringify({
      id: this.id,
      version: this.version,
      type: this.type,
      data: this.data,
      schema: this.schema.type,
    });
    // Simple hash for demonstration - in production use proper cryptographic hash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private computeSize(): number {
    return JSON.stringify(this.data).length;
  }

  private incrementVersion(level: 'major' | 'minor' | 'patch'): string {
    const [major, minor, patch] = this.version.split('.').map(Number);
    switch (level) {
      case 'major': return `${major + 1}.0.0`;
      case 'minor': return `${major}.${minor + 1}.0`;
      case 'patch': return `${major}.${minor}.${patch + 1}`;
      default: return this.version;
    }
  }
}

// ============================================================================
// CONCRETE PROMPT IMPLEMENTATION
// ============================================================================

/**
 * Concrete Prompt implementation with template rendering and validation
 */
export class ConcretePrompt<I, O> implements Prompt<I, O> {
  readonly id: string;
  readonly version: string;
  readonly template: string;
  readonly constraints: Constraint[];
  readonly context: Context;
  readonly examples: Example<I, O>[];

  constructor(
    id: string,
    version: string,
    template: string,
    constraints: Constraint[] = [],
    context: Context = { shortTerm: {}, mediumTerm: {}, longTerm: {} },
    examples: Example<I, O>[] = []
  ) {
    this.id = id;
    this.version = version;
    this.template = template;
    this.constraints = constraints;
    this.context = context;
    this.examples = examples;
  }

  validate(input: I): ValidationResult {
    const errors = [];
    const warnings = [];

    // Check constraints
    for (const constraint of this.constraints) {
      if (!constraint.condition(input)) {
        errors.push({
          code: 'CONSTRAINT_VIOLATION',
          message: constraint.message,
        });
      }
    }

    // Check template variables (simplified)
    const variableRegex = /\{\{(\w+)\}\}/g;
    const matches = [...this.template.matchAll(variableRegex)];
    const variables = matches.map(m => m[1]);

    for (const variable of variables) {
      if (!(variable in (input as any))) {
        warnings.push({
          code: 'MISSING_VARIABLE',
          message: `Template variable "${variable}" not found in input`,
          suggestion: 'Add variable to input or remove from template',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  apply(input: I): TaskSpecification {
    // Render template with input variables
    let rendered = this.template;
    const variableRegex = /\{\{(\w+)\}\}/g;
    let match;

    while ((match = variableRegex.exec(this.template)) !== null) {
      const variable = match[1];
      const value = (input as any)[variable];
      if (value !== undefined) {
        rendered = rendered.replace(match[0], String(value));
      }
    }

    return {
      modelId: 'default', // Would come from prompt analysis
      parameters: {},
      constraints: this.constraints,
      context: this.context,
    };
  }

  explain(): string {
    return `Prompt "${this.id}" v${this.version} with ${this.constraints.length} constraints and ${this.examples.length} examples`;
  }
}

// ============================================================================
// CONCRETE SMPBOT IMPLEMENTATION
// ============================================================================

/**
 * Concrete SMPbot implementation extending Tile
 */
export class ConcreteSMPbot<I, O> extends Tile<I, O> implements SMPbot<I, O> {
  readonly seed: Seed<I>;
  readonly model: Model<I, O>;
  readonly prompt: Prompt<I, O>;

  readonly stabilityScore: number;
  readonly driftThreshold: number;
  readonly gpuCompatible: boolean;

  private inferenceHistory: InferenceState[] = [];
  private stabilityHistory: number[] = [];
  private lastStabilization: Date | null = null;

  constructor(
    seed: Seed<I>,
    model: Model<I, O>,
    prompt: Prompt<I, O>,
    config: TileConfig = {}
  ) {
    super(seed.schema, createOutputSchema(model), config);
    this.seed = seed;
    this.model = model;
    this.prompt = prompt;

    // Initialize stability properties
    this.stabilityScore = 0.8; // Default starting stability
    this.driftThreshold = 0.1; // 10% drift triggers stabilization

    // Check GPU compatibility based on model type
    this.gpuCompatible = model.type !== 'llm'; // LLMs may not be GPU-optimized
  }

  async discriminate(input: I): Promise<O> {
    // Validate input against prompt constraints
    const validation = this.prompt.validate(input);
    if (!validation.valid) {
      throw new Error(`Prompt validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Apply prompt to get task specification
    const task = this.prompt.apply(input);

    // Ensure model is loaded
    if (!this.model.loaded) {
      await this.model.load();
    }

    // Execute model prediction
    const output = await this.model.predict(input);

    // Update stability tracking
    await this.updateStability(input, output);

    return output;
  }

  async confidence(input: I): Promise<number> {
    // Base confidence from model
    const modelConfidence = await this.model.confidence(input);

    // Adjust by stability score
    const adjustedConfidence = modelConfidence * this.stabilityScore;

    // Apply prompt constraints impact
    const validation = this.prompt.validate(input);
    if (!validation.valid) {
      return adjustedConfidence * 0.5; // Reduce confidence for invalid inputs
    }

    return Math.min(1, Math.max(0, adjustedConfidence));
  }

  async trace(input: I): Promise<string> {
    const seedInfo = `Seed: ${this.seed.id} (${this.seed.type})`;
    const modelInfo = `Model: ${this.model.id} (${this.model.type})`;
    const promptInfo = `Prompt: ${this.prompt.id} v${this.prompt.version}`;
    const stabilityInfo = `Stability: ${(this.stabilityScore * 100).toFixed(1)}%`;

    return `${seedInfo} | ${modelInfo} | ${promptInfo} | ${stabilityInfo}`;
  }

  async peek(input: I): Promise<InferenceState> {
    // Simulate partial inference measurement
    // In real implementation, this would capture intermediate states

    const intermediateOutputs: unknown[] = [];
    const confidenceTrajectory: number[] = [];

    // Simulate 3-step inference
    for (let step = 0; step < 3; step++) {
      // Simulate intermediate computation
      const partialOutput = await this.simulatePartialInference(input, step);
      intermediateOutputs.push(partialOutput);

      // Simulate confidence progression
      const confidence = 0.3 + (step * 0.25); // Increasing confidence
      confidenceTrajectory.push(confidence);
    }

    const state: InferenceState = {
      step: 3,
      intermediateOutputs,
      confidenceTrajectory,
      attentionPatterns: [], // Would be populated in real implementation
      timestamp: new Date(),
    };

    this.inferenceHistory.push(state);
    return state;
  }

  async stabilize(): Promise<void> {
    console.log(`Stabilizing SMPbot ${this.id}...`);

    // Record stabilization time
    this.lastStabilization = new Date();

    // Simulate stabilization process
    // In real implementation, this would involve:
    // 1. Retraining on recent data
    // 2. Prompt optimization
    // 3. Model parameter adjustment
    // 4. Seed augmentation

    // Simulate improvement
    const improvement = 0.05 + (Math.random() * 0.1); // 5-15% improvement
    this.stabilityHistory.push(this.stabilityScore);

    // Update stability score (capped at 0.95)
    this.stabilityScore = Math.min(0.95, this.stabilityScore + improvement);

    console.log(`Stabilization complete. New stability: ${(this.stabilityScore * 100).toFixed(1)}%`);
  }

  clone(): SMPbot<I, O> {
    // Create new instance with same components
    return new ConcreteSMPbot(
      this.seed,
      this.model,
      this.prompt,
      {
        id: `${this.id}_clone_${Date.now()}`,
        version: this.version,
      }
    );
  }

  getGPUExecutionPlan(): GPUExecutionPlan | null {
    if (!this.gpuCompatible) {
      return null;
    }

    // Create GPU execution plan based on model characteristics
    return {
      gpuCount: 1,
      memoryPerGPU: 4096, // 4GB
      batchSize: 256,
      executionMode: 'parallel',
      synchronization: 'async',
      kernelOptimization: [
        {
          workgroupSize: [64, 1, 1],
          sharedMemory: 16384, // 16KB
          registerPressure: 0.7,
        },
      ],
      memoryOptimization: {
        botStateSize: 1024, // 1KB per bot
        modelParamSize: 1048576, // 1MB model
        inputTensorSize: 512,
        outputTensorSize: 512,
        alignment: 256,
      },
      communicationOptimization: {
        type: 'all-to-all',
        bandwidth: 1000, // 1GB/s
        latency: 0.1, // 100µs
      },
      execute: async (bots: SMPbot<I, O>[], inputs: I[]): Promise<O[]> => {
        // GPU batch execution simulation
        console.log(`GPU batch execution: ${bots.length} bots, ${inputs.length} inputs`);

        // In real implementation, this would use WebGPU compute shaders
        const results: O[] = [];
        for (let i = 0; i < inputs.length; i++) {
          const result = await bots[i].discriminate(inputs[i]);
          results.push(result);
        }

        return results;
      },
    };
  }

  // Private helper methods
  private async updateStability(input: I, output: O): Promise<void> {
    // Simulate stability calculation based on output consistency
    // In real implementation, this would track variance across runs

    const currentVariance = Math.random() * 0.1; // Simulated variance
    const newStability = Math.max(0, 1 - currentVariance);

    // Update with exponential moving average
    const alpha = 0.1; // Learning rate
    this.stabilityScore = alpha * newStability + (1 - alpha) * this.stabilityScore;

    // Check for drift
    if (this.stabilityHistory.length > 10) {
      const recentAvg = this.stabilityHistory.slice(-10).reduce((a, b) => a + b, 0) / 10;
      const drift = Math.abs(this.stabilityScore - recentAvg);

      if (drift > this.driftThreshold) {
        console.warn(`Drift detected in SMPbot ${this.id}: ${(drift * 100).toFixed(1)}%`);
        // In production, this would trigger automatic stabilization
      }
    }
  }

  private async simulatePartialInference(input: I, step: number): Promise<unknown> {
    // Simulate partial inference step
    // In real implementation, this would capture actual intermediate states

    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate computation

    return {
      step,
      input,
      partialResult: `partial_${step}`,
      timestamp: new Date(),
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create output schema based on model type
 */
function createOutputSchema<O>(model: Model<I, O>): Schema<O> {
  // Simplified schema creation
  // In real implementation, this would be based on model output type

  return {
    type: 'smpbot_output',
    validate: (v: unknown): v is O => {
      // Basic validation - would be model-specific
      return v !== undefined && v !== null;
    },
  };
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example: Simple text classification SMPbot
 */
export async function createExampleSMPbot(): Promise<ConcreteSMPbot<string, string>> {
  // Create seed with example data
  const seedSchema: Schema<string> = {
    type: 'string',
    validate: (v: unknown): v is string => typeof v === 'string',
  };

  const seed = new ConcreteSeed(
    'example-seed',
    '1.0.0',
    'dataset',
    'Example training data for text classification',
    seedSchema
  );

  // Create simple model
  const model: Model<string, string> = {
    id: 'text-classifier',
    type: 'ml',
    parameters: { layers: 2, units: 128 },
    loaded: false,

    async load() {
      console.log('Loading text classification model...');
      await new Promise(resolve => setTimeout(resolve, 100));
      this.loaded = true;
    },

    async unload() {
      this.loaded = false;
    },

    async predict(input: string): Promise<string> {
      // Simple classification logic
      if (input.toLowerCase().includes('positive')) return 'positive';
      if (input.toLowerCase().includes('negative')) return 'negative';
      return 'neutral';
    },

    async confidence(input: string): Promise<number> {
      // Simple confidence based on keyword presence
      const keywords = ['positive', 'negative', 'happy', 'sad', 'good', 'bad'];
      const hasKeyword = keywords.some(kw => input.toLowerCase().includes(kw));
      return hasKeyword ? 0.9 : 0.6;
    },
  };

  // Create prompt
  const prompt = new ConcretePrompt<string, string>(
    'sentiment-analysis',
    '1.0.0',
    'Classify the sentiment of: {{text}}',
    [
      {
        type: 'content',
        condition: (input: unknown) => typeof input === 'string' && input.length > 0,
        message: 'Input must be non-empty string',
      },
    ],
    { shortTerm: {}, mediumTerm: {}, longTerm: {} },
    [
      {
        input: 'I feel happy today',
        output: 'positive',
        explanation: 'Contains positive emotion word',
      },
    ]
  );

  // Create SMPbot
  return new ConcreteSMPbot(seed, model, prompt, {
    id: 'sentiment-analyzer',
    version: '1.0.0',
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ConcreteSMPbot;