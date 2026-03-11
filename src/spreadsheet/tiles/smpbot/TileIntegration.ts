/**
 * Tile System Integration Plan for SMPbots
 *
 * Integration strategy for SMPbot = Seed + Model + Prompt = Stable Output
 * with existing tile system architecture.
 */

import { ITile, Tile, Schema, ValidationResult, SerializedTile, TileConfig } from '../core/Tile';
import SMPbot, { ConcreteSMPbot } from './ConcreteSMPbot';

// ============================================================================
// SMPBOT AS TILE ADAPTER
// ============================================================================

/**
 * Adapter to make SMPbot compatible with existing tile system
 */
export class SMPbotAsTile<I, O> extends Tile<I, O> {
  private bot: SMPbot<I, O>;

  constructor(bot: SMPbot<I, O>, config: TileConfig = {}) {
    super(
      bot.seed.schema,
      createOutputSchema(bot),
      {
        id: config.id || `smpbot_tile_${bot.id}`,
        version: config.version || '1.0.0',
        ...config,
      }
    );
    this.bot = bot;
  }

  async discriminate(input: I): Promise<O> {
    // Delegate to SMPbot with tile-specific error handling
    try {
      return await this.bot.discriminate(input);
    } catch (error) {
      // Convert SMPbot errors to tile errors
      throw new TileExecutionError(
        `SMPbot discrimination failed: ${error.message}`,
        this.id,
        error
      );
    }
  }

  async confidence(input: I): Promise<number> {
    // Combine SMPbot confidence with tile confidence logic
    const botConfidence = await this.bot.confidence(input);
    const stabilityFactor = this.bot.stabilityScore;

    // Apply tile-specific confidence adjustments
    const tileConfidence = botConfidence * stabilityFactor;

    // Ensure valid confidence range
    return Math.max(0, Math.min(1, tileConfidence));
  }

  async trace(input: I): Promise<string> {
    // Combine SMPbot trace with tile trace
    const botTrace = await this.bot.trace(input);
    const peekState = await this.bot.peek(input).catch(() => null);

    let trace = `SMPbot Tile: ${this.id}\n`;
    trace += `Bot: ${botTrace}\n`;

    if (peekState) {
      trace += `Inference State: Step ${peekState.step}, Confidence Trajectory: ${peekState.confidenceTrajectory.join(' → ')}\n`;
    }

    trace += `Tile Configuration: ${JSON.stringify(this.config, null, 2)}`;

    return trace;
  }

  /**
   * Get the underlying SMPbot
   */
  getSMPbot(): SMPbot<I, O> {
    return this.bot;
  }

  /**
   * Create a new tile from an updated SMPbot
   */
  withUpdatedBot(updatedBot: SMPbot<I, O>): SMPbotAsTile<I, O> {
    return new SMPbotAsTile(updatedBot, this.config);
  }
}

// ============================================================================
// SMPBOT TILE REGISTRY
// ============================================================================

/**
 * Registry for SMPbot tiles with version management
 */
export class SMPbotTileRegistry {
  private tiles: Map<string, SMPbotAsTile<unknown, unknown>> = new Map();
  private versions: Map<string, string[]> = new Map();

  /**
   * Register an SMPbot tile
   */
  register(tile: SMPbotAsTile<unknown, unknown>): void {
    const bot = tile.getSMPbot();
    const botId = bot.id;

    this.tiles.set(botId, tile);

    // Track versions
    if (!this.versions.has(botId)) {
      this.versions.set(botId, []);
    }
    this.versions.get(botId)!.push(bot.version);

    console.log(`Registered SMPbot tile: ${botId} v${bot.version}`);
  }

  /**
   * Get SMPbot tile by ID
   */
  get(botId: string): SMPbotAsTile<unknown, unknown> | undefined {
    return this.tiles.get(botId);
  }

  /**
   * Get all registered SMPbot tiles
   */
  getAll(): SMPbotAsTile<unknown, unknown>[] {
    return Array.from(this.tiles.values());
  }

  /**
   * Get SMPbot tile versions
   */
  getVersions(botId: string): string[] {
    return this.versions.get(botId) || [];
  }

  /**
   * Find SMPbot tiles by type
   */
  findByType(type: string): SMPbotAsTile<unknown, unknown>[] {
    return this.getAll().filter(tile => {
      const bot = tile.getSMPbot();
      return bot.model.type === type;
    });
  }

  /**
   * Find SMPbot tiles by stability threshold
   */
  findByStability(minStability: number): SMPbotAsTile<unknown, unknown>[] {
    return this.getAll().filter(tile => {
      const bot = tile.getSMPbot();
      return bot.stabilityScore >= minStability;
    });
  }
}

// ============================================================================
// SMPBOT TILE COMPOSITION
// ============================================================================

/**
 * Specialized composition for SMPbot tiles
 */
export class SMPbotTileComposition {
  /**
   * Sequential composition with confidence propagation
   */
  static sequential<I, M, O>(
    tile1: SMPbotAsTile<I, M>,
    tile2: SMPbotAsTile<M, O>
  ): SMPbotAsTile<I, O> {
    const bot1 = tile1.getSMPbot();
    const bot2 = tile2.getSMPbot();

    // Create composed SMPbot
    const composedBot = this.createComposedBot(bot1, bot2);

    // Create tile from composed bot
    return new SMPbotAsTile(composedBot, {
      id: `${tile1.id}_seq_${tile2.id}`,
      version: '1.0.0',
    });
  }

  /**
   * Parallel composition with result merging
   */
  static parallel<I, O1, O2>(
    tile1: SMPbotAsTile<I, O1>,
    tile2: SMPbotAsTile<I, O2>
  ): SMPbotAsTile<I, [O1, O2]> {
    const bot1 = tile1.getSMPbot();
    const bot2 = tile2.getSMPbot();

    // Create parallel SMPbot
    const parallelBot = this.createParallelBot(bot1, bot2);

    // Create tile from parallel bot
    return new SMPbotAsTile(parallelBot, {
      id: `${tile1.id}_par_${tile2.id}`,
      version: '1.0.0',
    });
  }

  /**
   * Conditional composition
   */
  static conditional<I, O>(
    predicate: (input: I) => boolean,
    ifTrue: SMPbotAsTile<I, O>,
    ifFalse: SMPbotAsTile<I, O>
  ): SMPbotAsTile<I, O> {
    const trueBot = ifTrue.getSMPbot();
    const falseBot = ifFalse.getSMPbot();

    // Create conditional SMPbot
    const conditionalBot = this.createConditionalBot(predicate, trueBot, falseBot);

    return new SMPbotAsTile(conditionalBot, {
      id: `${ifTrue.id}_cond_${ifFalse.id}`,
      version: '1.0.0',
    });
  }

  private static createComposedBot<I, M, O>(
    bot1: SMPbot<I, M>,
    bot2: SMPbot<M, O>
  ): SMPbot<I, O> {
    // Create a new SMPbot that composes the two bots
    // This is a simplified implementation
    return {
      ...bot1,
      async discriminate(input: I): Promise<O> {
        const intermediate = await bot1.discriminate(input);
        return await bot2.discriminate(intermediate);
      },
      async confidence(input: I): Promise<number> {
        const c1 = await bot1.confidence(input);
        const intermediate = await bot1.discriminate(input);
        const c2 = await bot2.confidence(intermediate);
        return c1 * c2; // Multiplicative composition
      },
      // Other methods would need proper implementation
    } as SMPbot<I, O>;
  }

  private static createParallelBot<I, O1, O2>(
    bot1: SMPbot<I, O1>,
    bot2: SMPbot<I, O2>
  ): SMPbot<I, [O1, O2]> {
    return {
      ...bot1,
      async discriminate(input: I): Promise<[O1, O2]> {
        const [result1, result2] = await Promise.all([
          bot1.discriminate(input),
          bot2.discriminate(input),
        ]);
        return [result1, result2];
      },
      async confidence(input: I): Promise<number> {
        const [c1, c2] = await Promise.all([
          bot1.confidence(input),
          bot2.confidence(input),
        ]);
        return (c1 + c2) / 2; // Average composition
      },
      // Other methods would need proper implementation
    } as SMPbot<I, [O1, O2]>;
  }

  private static createConditionalBot<I, O>(
    predicate: (input: I) => boolean,
    trueBot: SMPbot<I, O>,
    falseBot: SMPbot<I, O>
  ): SMPbot<I, O> {
    return {
      ...trueBot,
      async discriminate(input: I): Promise<O> {
        if (predicate(input)) {
          return await trueBot.discriminate(input);
        } else {
          return await falseBot.discriminate(input);
        }
      },
      async confidence(input: I): Promise<number> {
        if (predicate(input)) {
          return await trueBot.confidence(input);
        } else {
          return await falseBot.confidence(input);
        }
      },
      // Other methods would need proper implementation
    } as SMPbot<I, O>;
  }
}

// ============================================================================
// SMPBOT TILE FACTORY
// ============================================================================

/**
 * Factory for creating SMPbot tiles from various configurations
 */
export class SMPbotTileFactory {
  /**
   * Create SMPbot tile from existing SMPbot
   */
  static fromSMPbot<I, O>(bot: SMPbot<I, O>, config?: TileConfig): SMPbotAsTile<I, O> {
    return new SMPbotAsTile(bot, config);
  }

  /**
   * Create SMPbot tile from components
   */
  static fromComponents<I, O>(
    seed: Seed<I>,
    model: Model<I, O>,
    prompt: Prompt<I, O>,
    config?: TileConfig
  ): SMPbotAsTile<I, O> {
    const bot = new ConcreteSMPbot(seed, model, prompt, {
      id: config?.id || `smpbot_${model.id}`,
      version: config?.version || '1.0.0',
    });

    return new SMPbotAsTile(bot, config);
  }

  /**
   * Create SMPbot tile from serialized configuration
   */
  static fromSerialized(serialized: SerializedSMPbotConfig): SMPbotAsTile<unknown, unknown> {
    // Deserialize components
    const seed = this.deserializeSeed(serialized.seed);
    const model = this.deserializeModel(serialized.model);
    const prompt = this.deserializePrompt(serialized.prompt);

    // Create SMPbot
    const bot = new ConcreteSMPbot(seed, model, prompt, {
      id: serialized.id,
      version: serialized.version,
    });

    return new SMPbotAsTile(bot, serialized.tileConfig);
  }

  /**
   * Create specialized SMPbot tiles
   */
  static createScriptbot<I, O>(
    rules: Rule[],
    schema: Schema<I>,
    config?: TileConfig
  ): SMPbotAsTile<I, O> {
    // Create script-based SMPbot
    const seed = new ConcreteSeed('scriptbot_seed', '1.0.0', 'knowledge', {}, schema);
    const model = this.createScriptModel(rules);
    const prompt = new ConcretePrompt('script_prompt', '1.0.0', 'Execute script rules');

    return this.fromComponents(seed, model, prompt, config);
  }

  /**
   * Create teacher tile (full LLM) wrapper
   */
  static createTeacherTile<I, O>(
    llmModel: LLMModel,
    reasoningDepth: number,
    config?: TileConfig
  ): SMPbotAsTile<I, O> {
    // Create teacher tile as SMPbot
    const seed = new ConcreteSeed('teacher_seed', '1.0.0', 'knowledge', {}, Schemas.any);
    const model = this.createLLMModel(llmModel, reasoningDepth);
    const prompt = new ConcretePrompt('teacher_prompt', '1.0.0', 'Provide detailed reasoning');

    return this.fromComponents(seed, model, prompt, config);
  }

  private static deserializeSeed(serialized: SerializedSeed): Seed<unknown> {
    // Simplified deserialization
    return new ConcreteSeed(
      serialized.id,
      serialized.version,
      serialized.type as any,
      serialized.data,
      serialized.schema as Schema<unknown>
    );
  }

  private static deserializeModel(serialized: SerializedModel): Model<unknown, unknown> {
    // Simplified deserialization
    return {
      id: serialized.id,
      type: serialized.type,
      parameters: serialized.parameters,
      loaded: false,
      async load() { this.loaded = true; },
      async unload() { this.loaded = false; },
      async predict(input: unknown): Promise<unknown> {
        // Placeholder implementation
        return input;
      },
      async confidence(input: unknown): Promise<number> {
        return 0.8;
      },
    };
  }

  private static deserializePrompt(serialized: SerializedPrompt): Prompt<unknown, unknown> {
    // Simplified deserialization
    return new ConcretePrompt(
      serialized.id,
      serialized.version,
      serialized.template,
      serialized.constraints,
      serialized.context,
      serialized.examples
    );
  }

  private static createScriptModel(rules: Rule[]): Model<unknown, unknown> {
    return {
      id: 'script_model',
      type: 'script',
      parameters: { rules },
      loaded: true,
      async load() {},
      async unload() {},
      async predict(input: unknown): Promise<unknown> {
        // Execute rules
        for (const rule of rules) {
          if (rule.condition(input)) {
            return rule.action(input);
          }
        }
        return input;
      },
      async confidence(input: unknown): Promise<number> {
        return 1.0; // Scripts are deterministic
      },
    };
  }

  private static createLLMModel(llmModel: LLMModel, reasoningDepth: number): Model<unknown, unknown> {
    return {
      id: 'llm_model',
      type: 'llm',
      parameters: { llmModel, reasoningDepth },
      loaded: false,
      async load() {
        console.log('Loading LLM model...');
        this.loaded = true;
      },
      async unload() {
        this.loaded = false;
      },
      async predict(input: unknown): Promise<unknown> {
        // Placeholder LLM inference
        return `LLM reasoning (depth: ${reasoningDepth}): ${JSON.stringify(input)}`;
      },
      async confidence(input: unknown): Promise<number> {
        return 0.9; // High confidence for LLM
      },
    };
  }
}

// ============================================================================
// SMPBOT TILE MONITORING
// ============================================================================

/**
 * Monitoring integration for SMPbot tiles
 */
export class SMPbotTileMonitor {
  private stabilityScores: Map<string, number[]> = new Map();
  private confidenceHistory: Map<string, number[]> = new Map();
  private errorCounts: Map<string, number> = new Map();

  /**
   * Record tile execution
   */
  recordExecution(tileId: string, confidence: number, success: boolean): void {
    // Record confidence
    if (!this.confidenceHistory.has(tileId)) {
      this.confidenceHistory.set(tileId, []);
    }
    this.confidenceHistory.get(tileId)!.push(confidence);

    // Record errors
    if (!success) {
      this.errorCounts.set(tileId, (this.errorCounts.get(tileId) || 0) + 1);
    }

    // Keep only recent history
    const maxHistory = 100;
    const history = this.confidenceHistory.get(tileId)!;
    if (history.length > maxHistory) {
      history.splice(0, history.length - maxHistory);
    }
  }

  /**
   * Update stability score for tile
   */
  updateStability(tileId: string, stabilityScore: number): void {
    if (!this.stabilityScores.has(tileId)) {
      this.stabilityScores.set(tileId, []);
    }
    this.stabilityScores.get(tileId)!.push(stabilityScore);

    // Keep only recent scores
    const maxScores = 50;
    const scores = this.stabilityScores.get(tileId)!;
    if (scores.length > maxScores) {
      scores.splice(0, scores.length - maxScores);
    }
  }

  /**
   * Get tile health metrics
   */
  getHealthMetrics(tileId: string): TileHealthMetrics {
    const confidences = this.confidenceHistory.get(tileId) || [];
    const stabilities = this.stabilityScores.get(tileId) || [];
    const errors = this.errorCounts.get(tileId) || 0;

    const avgConfidence = confidences.length > 0 ?
      confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

    const avgStability = stabilities.length > 0 ?
      stabilities.reduce((a, b) => a + b, 0) / stabilities.length : 0;

    const errorRate = confidences.length > 0 ?
      errors / confidences.length : 0;

    return {
      tileId,
      avgConfidence,
      avgStability,
      errorRate,
      totalExecutions: confidences.length,
      totalErrors: errors,
      confidenceTrend: this.calculateTrend(confidences),
      stabilityTrend: this.calculateTrend(stabilities),
    };
  }

  /**
   * Get tiles needing attention
   */
  getTilesNeedingAttention(thresholds: {
    minConfidence?: number;
    minStability?: number;
    maxErrorRate?: number;
  } = {}): string[] {
    const {
      minConfidence = 0.7,
      minStability = 0.8,
      maxErrorRate = 0.1,
    } = thresholds;

    const needingAttention: string[] = [];

    for (const tileId of this.confidenceHistory.keys()) {
      const metrics = this.getHealthMetrics(tileId);

      if (metrics.avgConfidence < minConfidence ||
          metrics.avgStability < minStability ||
          metrics.errorRate > maxErrorRate) {
        needingAttention.push(tileId);
      }
    }

    return needingAttention;
  }

  private calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 2) return 'stable';

    // Split into halves and compare
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 0.05) return 'improving';
    if (diff < -0.05) return 'declining';
    return 'stable';
  }
}

// ============================================================================
// HELPER FUNCTIONS AND TYPES
// ============================================================================

function createOutputSchema<O>(bot: SMPbot<I, O>): Schema<O> {
  // Create schema based on bot output type
  return {
    type: 'smpbot_output',
    validate: (v: unknown): v is O => {
      // Basic validation - would be bot-specific
      return v !== undefined && v !== null;
    },
  };
}

// Types for serialization
interface SerializedSMPbotConfig {
  id: string;
  version: string;
  seed: SerializedSeed;
  model: SerializedModel;
  prompt: SerializedPrompt;
  tileConfig: TileConfig;
}

interface SerializedModel {
  id: string;
  type: 'script' | 'ml' | 'llm';
  parameters: ModelParameters;
}

interface SerializedPrompt {
  id: string;
  version: string;
  template: string;
  constraints: Constraint[];
  context: Context;
  examples: Example<unknown, unknown>[];
}

interface TileHealthMetrics {
  tileId: string;
  avgConfidence: number;
  avgStability: number;
  errorRate: number;
  totalExecutions: number;
  totalErrors: number;
  confidenceTrend: 'improving' | 'stable' | 'declining';
  stabilityTrend: 'improving' | 'stable' | 'declining';
}

// Import types from other files
type Seed<T> = any;
type Model<I, O> = any;
type ModelParameters = any;
type Prompt<I, O> = any;
type Constraint = any;
type Context = any;
type Example<I, O> = any;
type Rule = any;
type LLMModel = any;

// Re-export from Tile.ts for completeness
class TileExecutionError extends Error {
  constructor(message: string, tileId: string, cause?: Error) {
    super(message);
    this.name = 'TileExecutionError';
  }
}

const Schemas = {
  any: {
    type: 'any',
    validate: (v: unknown): v is unknown => true,
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  SMPbotAsTile,
  SMPbotTileRegistry,
  SMPbotTileComposition,
  SMPbotTileFactory,
  SMPbotTileMonitor,
};