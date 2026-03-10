/**
 * FeatureFlagManager - Core flag management system
 *
 * Manages feature flags with:
 * - Environment-specific configuration
 * - User segmentation
 * - Percentage rollout
 * - A/B testing support
 * - Kill switch capability
 * - Flag evaluation targeting 100ms
 */

import { EventEmitter } from 'events';
import { FlagStorage } from './FlagStorage.js';
import { UserSegmenter } from './UserSegmenter.js';
import { ExperimentTracker } from './ExperimentTracker.js';

/**
 * Flag state enum
 */
export enum FlagState {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ROLLOUT = 'rollout',
  EXPERIMENT = 'experiment'
}

/**
 * Flag type enum
 */
export enum FlagType {
  BOOLEAN = 'boolean',        // Simple on/off
  PERCENTAGE = 'percentage',  // Gradual rollout
  EXPERIMENT = 'experiment',  // A/B test
  MULTIVARIATE = 'multivariate' // Multiple variants
}

/**
 * Flag definition interface
 */
export interface FlagDefinition {
  id: string;
  name: string;
  description: string;
  type: FlagType;
  state: FlagState;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  environment: string;          // development, staging, production
  tags: string[];

  // Type-specific config
  defaultValue: any;
  rules: FlagRule[];

  // Rollout config
  rolloutPercentage?: number;   // 0-100
  rolloutStrategy?: 'gradual' | 'immediate' | 'scheduled';

  // Experiment config
  experimentId?: string;
  variants?: VariantConfig[];

  // Kill switch
  killSwitchEnabled: boolean;
  killSwitchReason?: string;

  // Audit
  lastEvaluatedAt?: Date;
  evaluationCount: number;
}

/**
 * Flag rule interface
 */
export interface FlagRule {
  id: string;
  name: string;
  condition: RuleCondition;
  value: any;
  priority: number;  // Higher priority evaluated first
  enabled: boolean;
}

/**
 * Rule condition interface
 */
export interface RuleCondition {
  type: 'user_id' | 'segment' | 'attribute' | 'percentage' | 'custom';
  operator: 'equals' | 'contains' | 'matches' | 'in' | 'gt' | 'lt' | 'gte' | 'lte';
  value: any;
  attribute?: string;  // For attribute-based rules
}

/**
 * Variant config for experiments
 */
export interface VariantConfig {
  id: string;
  name: string;
  description: string;
  weight: number;  // 0-1, should sum to 1 across all variants
  payload: any;
  isControl?: boolean;
}

/**
 * Evaluation context
 */
export interface EvaluationContext {
  userId: string;
  sessionId?: string;
  attributes?: Record<string, any>;
  environment?: string;
  timestamp?: Date;
}

/**
 * Evaluation result
 */
export interface EvaluationResult {
  flagId: string;
  value: any;
  matchedRule?: string;
  variant?: string;
  reason: string;
  evaluationTime: number;  // milliseconds
  timestamp: Date;
}

/**
 * Rollout plan
 */
export interface RolloutPlan {
  flagId: string;
  steps: RolloutStep[];
  currentStep: number;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Rollout step
 */
export interface RolloutStep {
  percentage: number;
  duration: number;  // minutes
  waitDuration: number;  // minutes between steps
  threshold?: {
    metric: string;
    operator: 'gt' | 'lt' | 'equals';
    value: number;
  };
}

/**
 * FeatureFlagManager options
 */
export interface FeatureFlagManagerOptions {
  storage: FlagStorage;
  segmenter: UserSegmenter;
  experimentTracker?: ExperimentTracker;
  environment: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;  // milliseconds
  evaluationTimeout?: number;  // milliseconds
  metricsEnabled?: boolean;
}

/**
 * FeatureFlagManager - Main flag management class
 */
export class FeatureFlagManager extends EventEmitter {
  private storage: FlagStorage;
  private segmenter: UserSegmenter;
  private experimentTracker?: ExperimentTracker;
  private environment: string;
  private cacheEnabled: boolean;
  private cacheTTL: number;
  private evaluationTimeout: number;
  private metricsEnabled: boolean;

  // In-memory cache
  private flagCache: Map<string, { flag: FlagDefinition; expiresAt: number }>;
  private evaluationCache: Map<string, { result: EvaluationResult; expiresAt: number }>;

  constructor(options: FeatureFlagManagerOptions) {
    super();

    this.storage = options.storage;
    this.segmenter = options.segmenter;
    this.experimentTracker = options.experimentTracker;
    this.environment = options.environment;
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cacheTTL = options.cacheTTL ?? 60000; // 1 minute default
    this.evaluationTimeout = options.evaluationTimeout ?? 100; // 100ms target
    this.metricsEnabled = options.metricsEnabled ?? true;

    this.flagCache = new Map();
    this.evaluationCache = new Map();

    // Subscribe to storage events
    this.storage.on('flagUpdated', (flag) => this.handleFlagUpdate(flag));
    this.storage.on('flagDeleted', (flagId) => this.handleFlagDelete(flagId));
  }

  /**
   * Create a new feature flag
   */
  async createFlag(definition: Omit<FlagDefinition, 'id' | 'createdAt' | 'updatedAt' | 'evaluationCount'>): Promise<FlagDefinition> {
    const flag: FlagDefinition = {
      ...definition,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      evaluationCount: 0,
      environment: definition.environment || this.environment
    };

    await this.storage.createFlag(flag);
    this.emit('flagCreated', flag);

    return flag;
  }

  /**
   * Update an existing flag
   */
  async updateFlag(flagId: string, updates: Partial<FlagDefinition>): Promise<FlagDefinition> {
    const existing = await this.getFlag(flagId);
    if (!existing) {
      throw new Error(`Flag ${flagId} not found`);
    }

    const updated: FlagDefinition = {
      ...existing,
      ...updates,
      id: flagId, // Preserve ID
      createdAt: existing.createdAt, // Preserve creation time
      updatedAt: new Date()
    };

    await this.storage.updateFlag(flagId, updated);
    this.invalidateCache(flagId);
    this.emit('flagUpdated', updated);

    return updated;
  }

  /**
   * Delete a flag
   */
  async deleteFlag(flagId: string): Promise<void> {
    await this.storage.deleteFlag(flagId);
    this.invalidateCache(flagId);
    this.emit('flagDeleted', flagId);
  }

  /**
   * Get a flag by ID
   */
  async getFlag(flagId: string): Promise<FlagDefinition | null> {
    // Check cache first
    const cached = this.flagCache.get(flagId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.flag;
    }

    const flag = await this.storage.getFlag(flagId);
    if (flag && this.cacheEnabled) {
      this.flagCache.set(flagId, {
        flag,
        expiresAt: Date.now() + this.cacheTTL
      });
    }

    return flag;
  }

  /**
   * List all flags
   */
  async listFlags(filters?: {
    environment?: string;
    state?: FlagState;
    type?: FlagType;
    tags?: string[];
  }): Promise<FlagDefinition[]> {
    return this.storage.listFlags(filters);
  }

  /**
   * Evaluate a flag for a given context
   */
  async evaluateFlag(flagId: string, context: EvaluationContext): Promise<EvaluationResult> {
    const startTime = Date.now();

    // Check kill switch first
    const flag = await this.getFlag(flagId);
    if (!flag) {
      return {
        flagId,
        value: false,
        reason: 'Flag not found',
        evaluationTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }

    if (flag.killSwitchEnabled) {
      return {
        flagId,
        value: false,
        reason: flag.killSwitchReason || 'Kill switch enabled',
        evaluationTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }

    // Check environment match
    if (flag.environment !== this.environment && flag.environment !== 'all') {
      return {
        flagId,
        value: flag.defaultValue,
        reason: `Environment mismatch (flag: ${flag.environment}, current: ${this.environment})`,
        evaluationTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }

    // Check evaluation cache
    const cacheKey = this.getEvaluationCacheKey(flagId, context);
    const cachedResult = this.evaluationCache.get(cacheKey);
    if (cachedResult && cachedResult.expiresAt > Date.now()) {
      return cachedResult.result;
    }

    // Evaluate based on flag type
    let result: EvaluationResult;

    switch (flag.type) {
      case FlagType.BOOLEAN:
        result = await this.evaluateBooleanFlag(flag, context, startTime);
        break;
      case FlagType.PERCENTAGE:
        result = await this.evaluatePercentageFlag(flag, context, startTime);
        break;
      case FlagType.EXPERIMENT:
        result = await this.evaluateExperimentFlag(flag, context, startTime);
        break;
      case FlagType.MULTIVARIATE:
        result = await this.evaluateMultivariateFlag(flag, context, startTime);
        break;
      default:
        result = {
          flagId,
          value: flag.defaultValue,
          reason: 'Unknown flag type',
          evaluationTime: Date.now() - startTime,
          timestamp: new Date()
        };
    }

    // Cache result
    if (this.cacheEnabled) {
      this.evaluationCache.set(cacheKey, {
        result,
        expiresAt: Date.now() + this.cacheTTL
      });
    }

    // Update evaluation count
    await this.incrementEvaluationCount(flagId);

    // Emit metrics
    if (this.metricsEnabled) {
      this.emit('flagEvaluated', {
        flagId,
        value: result.value,
        evaluationTime: result.evaluationTime,
        context
      });
    }

    return result;
  }

  /**
   * Evaluate multiple flags at once
   */
  async evaluateFlags(flagIds: string[], context: EvaluationContext): Promise<Map<string, EvaluationResult>> {
    const results = new Map<string, EvaluationResult>();
    const evaluations = flagIds.map(async (flagId) => {
      const result = await this.evaluateFlag(flagId, context);
      results.set(flagId, result);
    });

    await Promise.all(evaluations);
    return results;
  }

  /**
   * Enable a flag
   */
  async enableFlag(flagId: string): Promise<FlagDefinition> {
    return this.updateFlag(flagId, { state: FlagState.ENABLED });
  }

  /**
   * Disable a flag
   */
  async disableFlag(flagId: string): Promise<FlagDefinition> {
    return this.updateFlag(flagId, { state: FlagState.DISABLED });
  }

  /**
   * Enable kill switch for a flag
   */
  async enableKillSwitch(flagId: string, reason?: string): Promise<FlagDefinition> {
    return this.updateFlag(flagId, {
      killSwitchEnabled: true,
      killSwitchReason: reason,
      state: FlagState.DISABLED
    });
  }

  /**
   * Disable kill switch for a flag
   */
  async disableKillSwitch(flagId: string): Promise<FlagDefinition> {
    return this.updateFlag(flagId, {
      killSwitchEnabled: false,
      killSwitchReason: undefined
    });
  }

  /**
   * Start a percentage rollout
   */
  async startRollout(flagId: string, plan: RolloutPlan): Promise<void> {
    const flag = await this.getFlag(flagId);
    if (!flag) {
      throw new Error(`Flag ${flagId} not found`);
    }

    await this.updateFlag(flagId, {
      type: FlagType.PERCENTAGE,
      state: FlagState.ROLLOUT,
      rolloutPercentage: plan.steps[0].percentage,
      rolloutStrategy: 'gradual'
    });

    // Start rollout process
    this.executeRolloutSteps(flagId, plan);
  }

  /**
   * Get flag evaluation statistics
   */
  async getFlagStats(flagId: string): Promise<{
    evaluationCount: number;
    trueCount: number;
    falseCount: number;
    avgEvaluationTime: number;
  }> {
    return this.storage.getFlagStats(flagId);
  }

  /**
   * Private: Evaluate boolean flag
   */
  private async evaluateBooleanFlag(
    flag: FlagDefinition,
    context: EvaluationContext,
    startTime: number
  ): Promise<EvaluationResult> {
    // Check if flag is enabled
    if (flag.state !== FlagState.ENABLED) {
      return {
        flagId: flag.id,
        value: flag.defaultValue,
        reason: `Flag is ${flag.state}`,
        evaluationTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }

    // Evaluate rules in priority order
    const sortedRules = [...flag.rules].sort((a, b) => b.priority - a.priority);
    for (const rule of sortedRules) {
      if (!rule.enabled) continue;

      if (await this.evaluateRule(rule, context)) {
        return {
          flagId: flag.id,
          value: rule.value,
          matchedRule: rule.id,
          reason: `Matched rule: ${rule.name}`,
          evaluationTime: Date.now() - startTime,
          timestamp: new Date()
        };
      }
    }

    return {
      flagId: flag.id,
      value: flag.defaultValue,
      reason: 'No rules matched, using default',
      evaluationTime: Date.now() - startTime,
      timestamp: new Date()
    };
  }

  /**
   * Private: Evaluate percentage flag
   */
  private async evaluatePercentageFlag(
    flag: FlagDefinition,
    context: EvaluationContext,
    startTime: number
  ): Promise<EvaluationResult> {
    const percentage = flag.rolloutPercentage ?? 0;
    const bucket = await this.segmenter.getPercentageBucket(context.userId, flag.id);

    const isEnabled = bucket < percentage;

    return {
      flagId: flag.id,
      value: isEnabled,
      reason: `Percentage rollout: ${percentage}%, user in bucket ${bucket}`,
      evaluationTime: Date.now() - startTime,
      timestamp: new Date()
    };
  }

  /**
   * Private: Evaluate experiment flag
   */
  private async evaluateExperimentFlag(
    flag: FlagDefinition,
    context: EvaluationContext,
    startTime: number
  ): Promise<EvaluationResult> {
    if (!this.experimentTracker) {
      return {
        flagId: flag.id,
        value: flag.defaultValue,
        reason: 'Experiment tracker not configured',
        evaluationTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }

    if (!flag.experimentId) {
      return {
        flagId: flag.id,
        value: flag.defaultValue,
        reason: 'No experiment configured',
        evaluationTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }

    const assignment = await this.experimentTracker.getVariant(
      flag.experimentId,
      context.userId,
      context
    );

    return {
      flagId: flag.id,
      value: assignment.variant.payload,
      variant: assignment.variant.id,
      reason: `Experiment variant: ${assignment.variant.name}`,
      evaluationTime: Date.now() - startTime,
      timestamp: new Date()
    };
  }

  /**
   * Private: Evaluate multivariate flag
   */
  private async evaluateMultivariateFlag(
    flag: FlagDefinition,
    context: EvaluationContext,
    startTime: number
  ): Promise<EvaluationResult> {
    if (!flag.variants || flag.variants.length === 0) {
      return {
        flagId: flag.id,
        value: flag.defaultValue,
        reason: 'No variants configured',
        evaluationTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }

    const bucket = await this.segmenter.getPercentageBucket(context.userId, flag.id);
    const variant = this.selectVariantByWeight(bucket, flag.variants);

    return {
      flagId: flag.id,
      value: variant.payload,
      variant: variant.id,
      reason: `Multivariate: ${variant.name}`,
      evaluationTime: Date.now() - startTime,
      timestamp: new Date()
    };
  }

  /**
   * Private: Evaluate a single rule
   */
  private async evaluateRule(rule: FlagRule, context: EvaluationContext): Promise<boolean> {
    const { type, operator, value, attribute } = rule.condition;

    switch (type) {
      case 'user_id':
        return this.evaluateCondition(context.userId, operator, value);

      case 'segment':
        const segment = await this.segmenter.getSegment(context.userId);
        return this.evaluateCondition(segment, operator, value);

      case 'attribute':
        if (!context.attributes || !attribute) return false;
        const attrValue = context.attributes[attribute];
        return this.evaluateCondition(attrValue, operator, value);

      case 'percentage':
        const bucket = await this.segmenter.getPercentageBucket(context.userId, rule.id);
        return bucket < (value as number);

      case 'custom':
        // Custom rules would be evaluated by a pluggable function
        return false;

      default:
        return false;
    }
  }

  /**
   * Private: Evaluate a condition
   */
  private evaluateCondition(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'contains':
        return Array.isArray(actual) ? actual.includes(expected) : String(actual).includes(expected);
      case 'matches':
        return new RegExp(expected).test(actual);
      case 'in':
        return Array.isArray(expected) ? expected.includes(actual) : false;
      case 'gt':
        return actual > expected;
      case 'lt':
        return actual < expected;
      case 'gte':
        return actual >= expected;
      case 'lte':
        return actual <= expected;
      default:
        return false;
    }
  }

  /**
   * Private: Select variant by weight
   */
  private selectVariantByWeight(bucket: number, variants: VariantConfig[]): VariantConfig {
    let cumulative = 0;
    const scaledBucket = bucket / 100;

    for (const variant of variants) {
      cumulative += variant.weight;
      if (scaledBucket <= cumulative) {
        return variant;
      }
    }

    return variants[variants.length - 1];
  }

  /**
   * Private: Execute rollout steps
   */
  private async executeRolloutSteps(flagId: string, plan: RolloutPlan): Promise<void> {
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];

      // Wait before starting step
      if (i > 0) {
        await this.sleep(step.waitDuration * 60 * 1000);
      }

      // Update percentage
      await this.updateFlag(flagId, { rolloutPercentage: step.percentage });

      // Wait for step duration
      await this.sleep(step.duration * 60 * 1000);

      // Check threshold if configured
      if (step.threshold) {
        const stats = await this.getFlagStats(flagId);
        const thresholdMet = this.checkThreshold(stats, step.threshold);

        if (!thresholdMet) {
          this.emit('rolloutPaused', { flagId, step: i, reason: 'Threshold not met' });
          return;
        }
      }
    }

    // Rollout complete
    await this.updateFlag(flagId, { state: FlagState.ENABLED });
    this.emit('rolloutComplete', { flagId });
  }

  /**
   * Private: Check if threshold is met
   */
  private checkThreshold(stats: any, threshold: any): boolean {
    const value = stats[threshold.metric];
    switch (threshold.operator) {
      case 'gt': return value > threshold.value;
      case 'lt': return value < threshold.value;
      case 'equals': return value === threshold.value;
      default: return false;
    }
  }

  /**
   * Private: Handle flag update event
   */
  private handleFlagUpdate(flag: FlagDefinition): void {
    this.invalidateCache(flag.id);
    this.emit('flagChanged', flag);
  }

  /**
   * Private: Handle flag delete event
   */
  private handleFlagDelete(flagId: string): void {
    this.invalidateCache(flagId);
  }

  /**
   * Private: Invalidate cache for a flag
   */
  private invalidateCache(flagId: string): void {
    this.flagCache.delete(flagId);
    // Clear all evaluation cache entries for this flag
    for (const [key] of this.evaluationCache) {
      if (key.startsWith(`${flagId}:`)) {
        this.evaluationCache.delete(key);
      }
    }
  }

  /**
   * Private: Increment evaluation count
   */
  private async incrementEvaluationCount(flagId: string): Promise<void> {
    const flag = await this.getFlag(flagId);
    if (flag) {
      await this.storage.updateFlag(flagId, {
        evaluationCount: flag.evaluationCount + 1,
        lastEvaluatedAt: new Date()
      });
    }
  }

  /**
   * Private: Get evaluation cache key
   */
  private getEvaluationCacheKey(flagId: string, context: EvaluationContext): string {
    return `${flagId}:${context.userId}:${JSON.stringify(context.attributes || {})}`;
  }

  /**
   * Private: Generate unique ID
   */
  private generateId(): string {
    return `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private: Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
