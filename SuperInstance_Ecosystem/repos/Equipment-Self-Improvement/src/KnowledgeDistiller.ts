/**
 * KnowledgeDistiller - Distills knowledge into stable patterns
 * 
 * Analyzes agent behavior and outcomes to extract reusable patterns
 * that can be encoded into stable tile structures for efficient tiling.
 */

export interface KnowledgePattern {
  id: string;
  name: string;
  description: string;
  category: PatternCategory;
  conditions: PatternCondition[];
  actions: PatternAction[];
  outcomes: PatternOutcome[];
  confidence: number;
  usageCount: number;
  successRate: number;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
  stability: number; // 0-1, how stable this pattern is
  maturity: number; // 0-1, how mature/refined this pattern is
}

export type PatternCategory = 
  | 'decision'
  | 'transformation'
  | 'validation'
  | 'optimization'
  | 'coordination'
  | 'recovery'
  | 'learning'
  | 'communication';

export interface PatternCondition {
  type: 'input' | 'state' | 'context' | 'temporal' | 'metric';
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'matches' | 'exists';
  value: unknown;
  weight: number; // Importance of this condition
}

export interface PatternAction {
  type: string;
  parameters: Record<string, unknown>;
  priority: number;
  dependencies: string[]; // IDs of other patterns this depends on
}

export interface PatternOutcome {
  metric: string;
  expectedValue: number;
  tolerance: number;
  observedValues: number[];
  confidence: number;
}

export interface DistillationResult {
  id: string;
  timestamp: Date;
  sourceCount: number;
  patternsExtracted: number;
  patternsRefined: number;
  patternsDiscarded: number;
  averageConfidence: number;
  knowledgeGain: number;
  recommendations: string[];
}

export interface DistillationConfig {
  minSampleSize: number;
  minConfidence: number;
  minSuccessRate: number;
  maxPatterns: number;
  stabilityThreshold: number;
  maturityIncrement: number;
  decayRate: number;
}

export interface AgentObservation {
  id: string;
  timestamp: Date;
  agentId: string;
  context: Record<string, unknown>;
  inputs: Record<string, unknown>;
  actions: Array<{
    type: string;
    parameters: Record<string, unknown>;
    result: unknown;
    success: boolean;
  }>;
  outcomes: Record<string, number>;
  success: boolean;
  duration: number;
}

export class KnowledgeDistiller {
  private patterns: Map<string, KnowledgePattern> = new Map();
  private observations: AgentObservation[] = [];
  private config: DistillationConfig;
  private distillationHistory: DistillationResult[] = [];

  constructor(config?: Partial<DistillationConfig>) {
    this.config = {
      minSampleSize: 10,
      minConfidence: 0.7,
      minSuccessRate: 0.6,
      maxPatterns: 1000,
      stabilityThreshold: 0.8,
      maturityIncrement: 0.1,
      decayRate: 0.01,
      ...config
    };
  }

  /**
   * Add an observation for distillation
   */
  addObservation(observation: Omit<AgentObservation, 'id' | 'timestamp'>): AgentObservation {
    const fullObservation: AgentObservation = {
      ...observation,
      id: this.generateId(),
      timestamp: new Date()
    };

    this.observations.push(fullObservation);
    this.trimObservations();

    // Try to match existing patterns
    this.matchAndRecord(fullObservation);

    return fullObservation;
  }

  /**
   * Add multiple observations
   */
  addObservations(observations: Array<Omit<AgentObservation, 'id' | 'timestamp'>>): AgentObservation[] {
    return observations.map(o => this.addObservation(o));
  }

  /**
   * Run distillation process to extract and refine patterns
   */
  distill(): DistillationResult {
    const startTime = Date.now();
    const sourceCount = this.observations.length;

    // Extract new patterns
    const newPatterns = this.extractPatterns();
    
    // Refine existing patterns
    const refinedPatterns = this.refinePatterns();
    
    // Discard unstable patterns
    const discardedCount = this.discardUnstablePatterns();

    // Calculate metrics
    const patterns = Array.from(this.patterns.values());
    const averageConfidence = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
      : 0;

    // Calculate knowledge gain
    const knowledgeGain = this.calculateKnowledgeGain(newPatterns, refinedPatterns);

    const result: DistillationResult = {
      id: this.generateId(),
      timestamp: new Date(),
      sourceCount,
      patternsExtracted: newPatterns.length,
      patternsRefined: refinedPatterns,
      patternsDiscarded: discardedCount,
      averageConfidence,
      knowledgeGain,
      recommendations: this.generateRecommendations(patterns)
    };

    this.distillationHistory.push(result);
    return result;
  }

  /**
   * Extract new patterns from observations
   */
  private extractPatterns(): KnowledgePattern[] {
    const newPatterns: KnowledgePattern[] = [];

    // Group observations by success and similarity
    const successfulObservations = this.observations.filter(o => o.success);
    const failedObservations = this.observations.filter(o => !o.success);

    // Extract patterns from successful observations
    const successPatterns = this.extractPatternsFromGroup(successfulObservations, true);
    
    // Extract anti-patterns from failed observations
    const failurePatterns = this.extractPatternsFromGroup(failedObservations, false);

    // Merge and create patterns
    for (const pattern of [...successPatterns, ...failurePatterns]) {
      if (this.patterns.size >= this.config.maxPatterns) break;
      
      // Check if similar pattern already exists
      const existingPattern = this.findSimilarPattern(pattern);
      if (existingPattern) {
        // Merge with existing
        this.mergePatterns(existingPattern, pattern);
      } else {
        // Add new pattern
        this.patterns.set(pattern.id, pattern);
        newPatterns.push(pattern);
      }
    }

    return newPatterns;
  }

  /**
   * Extract patterns from a group of observations
   */
  private extractPatternsFromGroup(
    observations: AgentObservation[],
    isSuccess: boolean
  ): KnowledgePattern[] {
    const patterns: KnowledgePattern[] = [];

    if (observations.length < this.config.minSampleSize) {
      return patterns;
    }

    // Cluster observations by action type
    const actionClusters = this.clusterByActionType(observations);

    for (const [actionType, cluster] of actionClusters) {
      if (cluster.length < this.config.minSampleSize) continue;

      // Find common conditions
      const conditions = this.extractCommonConditions(cluster);
      
      // Extract action patterns
      const actions = this.extractActionPatterns(cluster, actionType);
      
      // Extract outcome patterns
      const outcomes = this.extractOutcomePatterns(cluster);

      // Calculate confidence and success rate
      const successRate = cluster.filter(o => o.success).length / cluster.length;
      const confidence = this.calculatePatternConfidence(cluster, conditions);

      if (confidence >= this.config.minConfidence && 
          (isSuccess ? successRate >= this.config.minSuccessRate : true)) {
        
        const pattern: KnowledgePattern = {
          id: this.generateId(),
          name: this.generatePatternName(actionType, conditions),
          description: this.generatePatternDescription(actionType, conditions, isSuccess),
          category: this.categorizePattern(actionType, conditions),
          conditions,
          actions,
          outcomes,
          confidence,
          usageCount: cluster.length,
          successRate: isSuccess ? successRate : 1 - successRate,
          createdAt: new Date(),
          updatedAt: new Date(),
          stability: 0.5, // Start with moderate stability
          maturity: 0.1   // Start with low maturity
        };

        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Cluster observations by action type
   */
  private clusterByActionType(observations: AgentObservation[]): Map<string, AgentObservation[]> {
    const clusters = new Map<string, AgentObservation[]>();

    for (const obs of observations) {
      if (obs.actions.length === 0) continue;

      const primaryAction = obs.actions[0].type;
      const existing = clusters.get(primaryAction) || [];
      existing.push(obs);
      clusters.set(primaryAction, existing);
    }

    return clusters;
  }

  /**
   * Extract common conditions from a cluster of observations
   */
  private extractCommonConditions(observations: AgentObservation[]): PatternCondition[] {
    const conditions: PatternCondition[] = [];
    const inputKeys = new Set<string>();
    const contextKeys = new Set<string>();

    // Collect all keys
    for (const obs of observations) {
      Object.keys(obs.inputs).forEach(k => inputKeys.add(k));
      Object.keys(obs.context).forEach(k => contextKeys.add(k));
    }

    // Find common input conditions
    for (const key of inputKeys) {
      const values = observations
        .map(o => o.inputs[key])
        .filter(v => v !== undefined);

      if (values.length >= observations.length * 0.7) {
        // Check if values are consistent
        const uniqueValues = new Set(values.map(v => JSON.stringify(v)));
        
        if (uniqueValues.size === 1) {
          conditions.push({
            type: 'input',
            field: key,
            operator: 'equals',
            value: values[0],
            weight: 1.0
          });
        } else if (this.isNumericPattern(values)) {
          const stats = this.calculateStats(values as number[]);
          conditions.push({
            type: 'input',
            field: key,
            operator: 'greater_than',
            value: stats.mean - stats.stdDev * 2,
            weight: 0.8
          });
        }
      }
    }

    // Find common context conditions
    for (const key of contextKeys) {
      const values = observations
        .map(o => o.context[key])
        .filter(v => v !== undefined);

      if (values.length >= observations.length * 0.7) {
        const uniqueValues = new Set(values.map(v => JSON.stringify(v)));
        
        if (uniqueValues.size === 1) {
          conditions.push({
            type: 'context',
            field: key,
            operator: 'equals',
            value: values[0],
            weight: 1.0
          });
        }
      }
    }

    return conditions;
  }

  /**
   * Extract action patterns from observations
   */
  private extractActionPatterns(
    observations: AgentObservation[],
    actionType: string
  ): PatternAction[] {
    const actions: PatternAction[] = [];

    // Find common parameters
    const paramSets = observations
      .map(o => o.actions.find(a => a.type === actionType)?.parameters)
      .filter((p): p is Record<string, unknown> => p !== undefined);

    if (paramSets.length === 0) {
      actions.push({
        type: actionType,
        parameters: {},
        priority: 1,
        dependencies: []
      });
      return actions;
    }

    // Find common parameter values
    const commonParams: Record<string, unknown> = {};
    const paramKeys = new Set(paramSets.flatMap(p => Object.keys(p)));

    for (const key of paramKeys) {
      const values = paramSets.map(p => p[key]).filter(v => v !== undefined);
      const uniqueValues = new Set(values.map(v => JSON.stringify(v)));

      if (uniqueValues.size === 1 && values.length >= paramSets.length * 0.7) {
        commonParams[key] = values[0];
      }
    }

    actions.push({
      type: actionType,
      parameters: commonParams,
      priority: 1,
      dependencies: []
    });

    return actions;
  }

  /**
   * Extract outcome patterns from observations
   */
  private extractOutcomePatterns(observations: AgentObservation[]): PatternOutcome[] {
    const outcomes: PatternOutcome[] = [];
    const metricKeys = new Set(observations.flatMap(o => Object.keys(o.outcomes)));

    for (const key of metricKeys) {
      const values = observations
        .map(o => o.outcomes[key])
        .filter((v): v is number => typeof v === 'number');

      if (values.length > 0) {
        const stats = this.calculateStats(values);
        
        outcomes.push({
          metric: key,
          expectedValue: stats.mean,
          tolerance: stats.stdDev * 2,
          observedValues: values.slice(-100), // Keep last 100
          confidence: Math.min(values.length / observations.length, 1)
        });
      }
    }

    return outcomes;
  }

  /**
   * Calculate pattern confidence
   */
  private calculatePatternConfidence(
    observations: AgentObservation[],
    conditions: PatternCondition[]
  ): number {
    if (observations.length < this.config.minSampleSize) return 0;

    // Base confidence on sample size
    const sampleConfidence = Math.min(observations.length / 100, 1);

    // Adjust based on condition weights
    const avgConditionWeight = conditions.length > 0
      ? conditions.reduce((sum, c) => sum + c.weight, 0) / conditions.length
      : 0.5;

    // Adjust based on consistency
    const consistency = this.calculateConsistency(observations);

    return sampleConfidence * 0.4 + avgConditionWeight * 0.3 + consistency * 0.3;
  }

  /**
   * Calculate consistency of observations
   */
  private calculateConsistency(observations: AgentObservation[]): number {
    if (observations.length < 2) return 0;

    // Check duration consistency
    const durations = observations.map(o => o.duration);
    const durationStats = this.calculateStats(durations);
    const durationConsistency = durationStats.stdDev / durationStats.mean || 0;

    // Check outcome consistency
    const outcomeKeys = new Set(observations.flatMap(o => Object.keys(o.outcomes)));
    let outcomeConsistency = 1;

    for (const key of outcomeKeys) {
      const values = observations
        .map(o => o.outcomes[key])
        .filter((v): v is number => typeof v === 'number');
      
      if (values.length > 1) {
        const stats = this.calculateStats(values);
        const cv = stats.stdDev / stats.mean || 0;
        outcomeConsistency *= (1 - Math.min(cv, 1));
      }
    }

    return Math.min(1, (1 - durationConsistency) * 0.5 + outcomeConsistency * 0.5);
  }

  /**
   * Refine existing patterns based on new observations
   */
  private refinePatterns(): number {
    let refinedCount = 0;

    for (const [id, pattern] of this.patterns) {
      // Find matching observations
      const matchingObs = this.observations.filter(o => this.matchesPattern(o, pattern));

      if (matchingObs.length < 5) continue;

      // Update success rate
      const newSuccessRate = matchingObs.filter(o => o.success).length / matchingObs.length;
      pattern.successRate = pattern.successRate * 0.7 + newSuccessRate * 0.3;

      // Update conditions based on new data
      const newConditions = this.extractCommonConditions(matchingObs);
      pattern.conditions = this.mergeConditions(pattern.conditions, newConditions);

      // Update outcomes
      for (const obs of matchingObs.slice(-50)) {
        for (const outcome of pattern.outcomes) {
          const value = obs.outcomes[outcome.metric];
          if (typeof value === 'number') {
            outcome.observedValues.push(value);
            if (outcome.observedValues.length > 100) {
              outcome.observedValues.shift();
            }
            // Recalculate expected value
            const stats = this.calculateStats(outcome.observedValues);
            outcome.expectedValue = stats.mean;
            outcome.tolerance = stats.stdDev * 2;
          }
        }
      }

      // Update stability and maturity
      pattern.stability = Math.min(1, pattern.stability + 0.05);
      pattern.maturity = Math.min(1, pattern.maturity + this.config.maturityIncrement);
      pattern.updatedAt = new Date();

      refinedCount++;
    }

    return refinedCount;
  }

  /**
   * Discard unstable patterns
   */
  private discardUnstablePatterns(): number {
    let discardedCount = 0;
    const toDelete: string[] = [];

    for (const [id, pattern] of this.patterns) {
      // Apply decay to stability
      pattern.stability *= (1 - this.config.decayRate);

      // Check if pattern should be discarded
      if (pattern.stability < 0.1 || 
          pattern.successRate < 0.3 ||
          pattern.confidence < this.config.minConfidence * 0.5) {
        toDelete.push(id);
        discardedCount++;
      }
    }

    for (const id of toDelete) {
      this.patterns.delete(id);
    }

    return discardedCount;
  }

  /**
   * Match observation to pattern and record usage
   */
  private matchAndRecord(observation: AgentObservation): void {
    for (const pattern of this.patterns.values()) {
      if (this.matchesPattern(observation, pattern)) {
        pattern.usageCount++;
        pattern.lastUsed = new Date();
        
        // Update outcome values
        for (const outcome of pattern.outcomes) {
          const value = observation.outcomes[outcome.metric];
          if (typeof value === 'number') {
            outcome.observedValues.push(value);
          }
        }
      }
    }
  }

  /**
   * Check if observation matches a pattern
   */
  private matchesPattern(observation: AgentObservation, pattern: KnowledgePattern): boolean {
    for (const condition of pattern.conditions) {
      let value: unknown;

      switch (condition.type) {
        case 'input':
          value = observation.inputs[condition.field];
          break;
        case 'context':
          value = observation.context[condition.field];
          break;
        default:
          continue;
      }

      if (!this.evaluateCondition(value, condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(value: unknown, condition: PatternCondition): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'greater_than':
        return typeof value === 'number' && typeof condition.value === 'number' && value > condition.value;
      case 'less_than':
        return typeof value === 'number' && typeof condition.value === 'number' && value < condition.value;
      case 'contains':
        return typeof value === 'string' && typeof condition.value === 'string' && value.includes(condition.value);
      case 'matches':
        return typeof value === 'string' && typeof condition.value === 'string' && new RegExp(condition.value).test(value);
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  /**
   * Find a similar existing pattern
   */
  private findSimilarPattern(pattern: KnowledgePattern): KnowledgePattern | undefined {
    for (const existing of this.patterns.values()) {
      if (existing.category !== pattern.category) continue;
      if (existing.actions[0]?.type !== pattern.actions[0]?.type) continue;

      // Check condition similarity
      const similarity = this.calculateConditionSimilarity(
        existing.conditions,
        pattern.conditions
      );

      if (similarity > 0.8) {
        return existing;
      }
    }

    return undefined;
  }

  /**
   * Calculate similarity between condition sets
   */
  private calculateConditionSimilarity(
    conditions1: PatternCondition[],
    conditions2: PatternCondition[]
  ): number {
    if (conditions1.length === 0 && conditions2.length === 0) return 1;
    if (conditions1.length === 0 || conditions2.length === 0) return 0;

    let matches = 0;

    for (const c1 of conditions1) {
      for (const c2 of conditions2) {
        if (c1.type === c2.type && 
            c1.field === c2.field && 
            c1.operator === c2.operator &&
            JSON.stringify(c1.value) === JSON.stringify(c2.value)) {
          matches++;
          break;
        }
      }
    }

    return matches / Math.max(conditions1.length, conditions2.length);
  }

  /**
   * Merge two patterns
   */
  private mergePatterns(target: KnowledgePattern, source: KnowledgePattern): void {
    // Update usage count
    target.usageCount += source.usageCount;

    // Weighted average of success rates
    const totalUsage = target.usageCount + source.usageCount;
    target.successRate = 
      (target.successRate * target.usageCount + source.successRate * source.usageCount) / totalUsage;

    // Merge conditions
    target.conditions = this.mergeConditions(target.conditions, source.conditions);

    // Update confidence
    target.confidence = Math.max(target.confidence, source.confidence);

    // Merge outcomes
    for (const sourceOutcome of source.outcomes) {
      const targetOutcome = target.outcomes.find(o => o.metric === sourceOutcome.metric);
      if (targetOutcome) {
        targetOutcome.observedValues.push(...sourceOutcome.observedValues);
        if (targetOutcome.observedValues.length > 100) {
          targetOutcome.observedValues = targetOutcome.observedValues.slice(-100);
        }
      } else {
        target.outcomes.push(sourceOutcome);
      }
    }

    target.updatedAt = new Date();
  }

  /**
   * Merge condition sets
   */
  private mergeConditions(
    conditions1: PatternCondition[],
    conditions2: PatternCondition[]
  ): PatternCondition[] {
    const merged = [...conditions1];

    for (const c2 of conditions2) {
      const existing = merged.find(
        c => c.type === c2.type && c.field === c2.field && c.operator === c2.operator
      );

      if (existing) {
        // Update weight
        existing.weight = Math.max(existing.weight, c2.weight);
      } else {
        merged.push(c2);
      }
    }

    return merged;
  }

  /**
   * Categorize a pattern based on its characteristics
   */
  private categorizePattern(actionType: string, conditions: PatternCondition[]): PatternCategory {
    // Heuristic categorization based on action type and conditions
    const decisionActions = ['decide', 'choose', 'select', 'evaluate'];
    const transformActions = ['transform', 'convert', 'process', 'apply'];
    const validateActions = ['validate', 'check', 'verify', 'assert'];
    const optimizeActions = ['optimize', 'improve', 'enhance', 'refine'];
    const coordinateActions = ['coordinate', 'sync', 'delegate', 'distribute'];
    const recoverActions = ['recover', 'retry', 'fallback', 'restore'];
    const learnActions = ['learn', 'train', 'update', 'adapt'];
    const communicateActions = ['send', 'receive', 'broadcast', 'notify'];

    const actionLower = actionType.toLowerCase();

    if (decisionActions.some(a => actionLower.includes(a))) return 'decision';
    if (transformActions.some(a => actionLower.includes(a))) return 'transformation';
    if (validateActions.some(a => actionLower.includes(a))) return 'validation';
    if (optimizeActions.some(a => actionLower.includes(a))) return 'optimization';
    if (coordinateActions.some(a => actionLower.includes(a))) return 'coordination';
    if (recoverActions.some(a => actionLower.includes(a))) return 'recovery';
    if (learnActions.some(a => actionLower.includes(a))) return 'learning';
    if (communicateActions.some(a => actionLower.includes(a))) return 'communication';

    // Check conditions for hints
    const hasValidationCondition = conditions.some(c => 
      c.field.includes('valid') || c.field.includes('check') || c.field.includes('verify')
    );
    if (hasValidationCondition) return 'validation';

    const hasOptimizationCondition = conditions.some(c =>
      c.field.includes('optimize') || c.field.includes('improve') || c.field.includes('score')
    );
    if (hasOptimizationCondition) return 'optimization';

    return 'decision'; // Default
  }

  /**
   * Generate pattern name
   */
  private generatePatternName(actionType: string, conditions: PatternCondition[]): string {
    const conditionStr = conditions
      .slice(0, 2)
      .map(c => `${c.field}_${c.operator}`)
      .join('_');

    return `${actionType}_${conditionStr}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  /**
   * Generate pattern description
   */
  private generatePatternDescription(
    actionType: string,
    conditions: PatternCondition[],
    isSuccess: boolean
  ): string {
    const type = isSuccess ? 'Successful' : 'Anti-pattern for';
    const conditionStr = conditions.length > 0
      ? ` when ${conditions.map(c => c.field).join(', ')}`
      : '';

    return `${type} ${actionType} pattern${conditionStr}`;
  }

  /**
   * Calculate knowledge gain from distillation
   */
  private calculateKnowledgeGain(
    newPatterns: KnowledgePattern[],
    _refinedCount: number
  ): number {
    let gain = 0;

    for (const pattern of newPatterns) {
      // Gain based on confidence and uniqueness
      gain += pattern.confidence * (1 - pattern.maturity);
    }

    return gain;
  }

  /**
   * Generate recommendations based on patterns
   */
  private generateRecommendations(patterns: KnowledgePattern[]): string[] {
    const recommendations: string[] = [];

    // Find patterns with high success rate
    const topPatterns = patterns
      .filter(p => p.successRate > 0.9 && p.confidence > 0.8)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);

    if (topPatterns.length > 0) {
      recommendations.push(
        `Consider encoding top patterns into tiles: ${topPatterns.map(p => p.name).join(', ')}`
      );
    }

    // Find unstable patterns
    const unstablePatterns = patterns.filter(p => p.stability < 0.5);
    if (unstablePatterns.length > 3) {
      recommendations.push(
        `${unstablePatterns.length} patterns are unstable. Consider gathering more observations.`
      );
    }

    // Find low confidence patterns
    const lowConfidencePatterns = patterns.filter(p => p.confidence < 0.6);
    if (lowConfidencePatterns.length > 5) {
      recommendations.push(
        'Many patterns have low confidence. Review observation quality and conditions.'
      );
    }

    // Category distribution
    const categoryCount = new Map<PatternCategory, number>();
    for (const p of patterns) {
      categoryCount.set(p.category, (categoryCount.get(p.category) || 0) + 1);
    }

    const dominant = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (dominant) {
      recommendations.push(
        `Pattern distribution dominated by ${dominant[0]} (${dominant[1]} patterns). Consider diversifying.`
      );
    }

    return recommendations;
  }

  /**
   * Get all patterns
   */
  getPatterns(): KnowledgePattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: PatternCategory): KnowledgePattern[] {
    return Array.from(this.patterns.values()).filter(p => p.category === category);
  }

  /**
   * Get top patterns by confidence
   */
  getTopPatterns(limit: number = 10): KnowledgePattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  /**
   * Get patterns suitable for tiling (high stability and maturity)
   */
  getStablePatterns(): KnowledgePattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.stability >= this.config.stabilityThreshold && p.maturity >= 0.7);
  }

  /**
   * Get pattern by ID
   */
  getPattern(id: string): KnowledgePattern | undefined {
    return this.patterns.get(id);
  }

  /**
   * Get distillation history
   */
  getDistillationHistory(): DistillationResult[] {
    return [...this.distillationHistory];
  }

  /**
   * Clear observations
   */
  clearObservations(): void {
    this.observations = [];
  }

  /**
   * Helper: Check if values are numeric
   */
  private isNumericPattern(values: unknown[]): boolean {
    return values.every(v => typeof v === 'number');
  }

  /**
   * Helper: Calculate statistics
   */
  private calculateStats(values: number[]): { mean: number; stdDev: number; min: number; max: number } {
    const n = values.length;
    if (n === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  /**
   * Helper: Generate unique ID
   */
  private generateId(): string {
    return `kd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Trim observations to max size
   */
  private trimObservations(): void {
    const maxSize = 10000;
    if (this.observations.length > maxSize) {
      this.observations = this.observations.slice(-maxSize);
    }
  }
}
