/**
 * Muscle Memory
 * 
 * Extracts trigger patterns from learned behavior when unequipping.
 * Allows learned behaviors to persist as automatic triggers.
 */

import type { DistilledKnowledge } from './DistillationEngine';

export interface MuscleMemoryConfig {
  /** Minimum confidence threshold for pattern extraction */
  extractionThreshold: number;
  /** Minimum successful applications required */
  minApplications: number;
  /** Whether to consolidate similar patterns */
  consolidationEnabled: boolean;
  /** Similarity threshold for consolidation */
  consolidationThreshold: number;
  /** Maximum triggers to extract */
  maxTriggers: number;
}

export interface TriggerPattern {
  /** Unique identifier for this trigger */
  id: string;
  /** Name describing the trigger */
  name: string;
  /** Conditions that activate this trigger */
  conditions: TriggerCondition[];
  /** Action to take when triggered */
  action: TriggerAction;
  /** Confidence in this trigger */
  confidence: number;
  /** Source knowledge that generated this trigger */
  sourceKnowledge: string[];
  /** Times this trigger has been activated */
  activationCount: number;
  /** Success rate of activations */
  successRate: number;
  /** When this trigger was created */
  createdAt: number;
}

export interface TriggerCondition {
  /** Metric or feature to check */
  metric: string;
  /** Comparison operator */
  operator: '<' | '>' | '<=' | '>=' | '==' | '!=' | 'contains' | 'matches';
  /** Value to compare against */
  value: unknown;
  /** Weight of this condition */
  weight: number;
}

export interface TriggerAction {
  /** Type of action */
  type: 'call_teacher' | 'use_knowledge' | 'adjust_confidence' | 'skip_teacher';
  /** Parameters for the action */
  params: Record<string, unknown>;
  /** Priority of this action */
  priority: number;
}

export interface ExtractionResult {
  /** Successfully extracted triggers */
  triggers: TriggerPattern[];
  /** Knowledge that was converted */
  convertedKnowledge: string[];
  /** Knowledge that was too weak to convert */
  skippedKnowledge: string[];
  /** Consolidation results */
  consolidations: ConsolidationResult[];
  /** Overall extraction quality */
  quality: number;
}

export interface ConsolidationResult {
  /** IDs of triggers that were consolidated */
  sourceIds: string[];
  /** The consolidated trigger */
  result: TriggerPattern;
  /** Similarity score that triggered consolidation */
  similarity: number;
}

export interface MuscleMemoryState {
  /** All stored trigger patterns */
  triggers: Map<string, TriggerPattern>;
  /** Recent activations for learning */
  recentActivations: Array<{
    triggerId: string;
    timestamp: number;
    success: boolean;
  }>;
  /** Performance metrics */
  metrics: MuscleMemoryMetrics;
}

export interface MuscleMemoryMetrics {
  /** Total triggers stored */
  totalTriggers: number;
  /** Average trigger confidence */
  averageConfidence: number;
  /** Total activations across all triggers */
  totalActivations: number;
  /** Overall success rate */
  overallSuccessRate: number;
  /** Knowledge conversion rate */
  conversionRate: number;
}

/**
 * MuscleMemory extracts behavioral patterns from learned knowledge
 * and converts them into automatic triggers.
 */
export class MuscleMemory {
  private config: MuscleMemoryConfig;
  private state: MuscleMemoryState;

  constructor(config: Partial<MuscleMemoryConfig> = {}) {
    this.config = {
      extractionThreshold: config.extractionThreshold ?? 0.7,
      minApplications: config.minApplications ?? 3,
      consolidationEnabled: config.consolidationEnabled ?? true,
      consolidationThreshold: config.consolidationThreshold ?? 0.8,
      maxTriggers: config.maxTriggers ?? 50,
    };

    this.state = {
      triggers: new Map(),
      recentActivations: [],
      metrics: {
        totalTriggers: 0,
        averageConfidence: 0,
        totalActivations: 0,
        overallSuccessRate: 0,
        conversionRate: 0,
      },
    };
  }

  /**
   * Extract trigger patterns from learned knowledge
   */
  extractFromKnowledge(knowledgeBase: DistilledKnowledge[]): ExtractionResult {
    const triggers: TriggerPattern[] = [];
    const convertedKnowledge: string[] = [];
    const skippedKnowledge: string[] = [];

    // Filter knowledge by quality thresholds
    const eligibleKnowledge = knowledgeBase.filter(k => 
      k.confidence >= this.config.extractionThreshold &&
      k.successfulApplications >= this.config.minApplications
    );

    for (const knowledge of eligibleKnowledge) {
      const trigger = this.convertKnowledgeToTrigger(knowledge);
      if (trigger) {
        triggers.push(trigger);
        convertedKnowledge.push(knowledge.patternId);
      } else {
        skippedKnowledge.push(knowledge.patternId);
      }
    }

    // Track skipped knowledge for analytics
    for (const knowledge of knowledgeBase) {
      if (!eligibleKnowledge.includes(knowledge)) {
        skippedKnowledge.push(knowledge.patternId);
      }
    }

    // Consolidate similar triggers
    let consolidations: ConsolidationResult[] = [];
    let finalTriggers = triggers;
    
    if (this.config.consolidationEnabled) {
      const result = this.consolidateTriggers(triggers);
      finalTriggers = result.triggers;
      consolidations = result.consolidations;
    }

    // Limit number of triggers
    if (finalTriggers.length > this.config.maxTriggers) {
      finalTriggers = finalTriggers
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, this.config.maxTriggers);
    }

    // Store triggers
    for (const trigger of finalTriggers) {
      this.state.triggers.set(trigger.id, trigger);
    }

    // Update metrics
    this.updateMetrics();

    const quality = this.calculateExtractionQuality(
      triggers.length,
      convertedKnowledge.length,
      skippedKnowledge.length
    );

    return {
      triggers: finalTriggers,
      convertedKnowledge,
      skippedKnowledge,
      consolidations,
      quality,
    };
  }

  /**
   * Check if any triggers match the given context
   */
  checkTriggers(context: Record<string, unknown>): {
    matched: boolean;
    triggers: TriggerPattern[];
    actions: TriggerAction[];
  } {
    const matchedTriggers: TriggerPattern[] = [];

    for (const trigger of this.state.triggers.values()) {
      if (this.matchesConditions(context, trigger.conditions)) {
        matchedTriggers.push(trigger);
        trigger.activationCount++;
      }
    }

    const actions = matchedTriggers
      .sort((a, b) => b.action.priority - a.action.priority)
      .map(t => t.action);

    return {
      matched: matchedTriggers.length > 0,
      triggers: matchedTriggers,
      actions,
    };
  }

  /**
   * Record a trigger activation result for learning
   */
  recordActivation(triggerId: string, success: boolean): void {
    const trigger = this.state.triggers.get(triggerId);
    if (!trigger) return;

    // Update success rate
    const totalActivations = trigger.activationCount;
    const previousSuccessful = trigger.successRate * (totalActivations - 1);
    trigger.successRate = (previousSuccessful + (success ? 1 : 0)) / totalActivations;

    // Record for recent activations
    this.state.recentActivations.push({
      triggerId,
      timestamp: Date.now(),
      success,
    });

    // Prune old activations
    if (this.state.recentActivations.length > 100) {
      this.state.recentActivations = this.state.recentActivations.slice(-100);
    }

    // Update metrics
    this.state.metrics.totalActivations++;
    this.updateMetrics();
  }

  /**
   * Get all stored triggers
   */
  getTriggers(): TriggerPattern[] {
    return Array.from(this.state.triggers.values());
  }

  /**
   * Get trigger by ID
   */
  getTrigger(id: string): TriggerPattern | undefined {
    return this.state.triggers.get(id);
  }

  /**
   * Remove a trigger
   */
  removeTrigger(id: string): boolean {
    const result = this.state.triggers.delete(id);
    if (result) {
      this.updateMetrics();
    }
    return result;
  }

  /**
   * Get current metrics
   */
  getMetrics(): MuscleMemoryMetrics {
    return { ...this.state.metrics };
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    topTriggers: Array<{ id: string; name: string; successRate: number; activations: number }>;
    recentPerformance: number;
    recommendations: string[];
  } {
    const triggers = Array.from(this.state.triggers.values());
    
    // Top triggers by usage and success
    const topTriggers = triggers
      .sort((a, b) => 
        (b.successRate * b.activationCount) - (a.successRate * a.activationCount)
      )
      .slice(0, 10)
      .map(t => ({
        id: t.id,
        name: t.name,
        successRate: t.successRate,
        activations: t.activationCount,
      }));

    // Recent performance
    const recentSuccess = this.state.recentActivations.filter(a => a.success).length;
    const recentPerformance = this.state.recentActivations.length > 0
      ? recentSuccess / this.state.recentActivations.length
      : 0;

    // Generate recommendations
    const recommendations: string[] = [];
    
    const lowSuccessTriggers = triggers.filter(t => t.successRate < 0.5 && t.activationCount > 5);
    if (lowSuccessTriggers.length > 0) {
      recommendations.push(`Consider removing ${lowSuccessTriggers.length} low-performing triggers`);
    }

    const unusedTriggers = triggers.filter(t => t.activationCount === 0);
    if (unusedTriggers.length > 0) {
      recommendations.push(`${unusedTriggers.length} triggers have never been activated`);
    }

    if (recentPerformance < 0.6) {
      recommendations.push('Recent performance below 60% - consider re-extracting triggers');
    }

    return {
      topTriggers,
      recentPerformance,
      recommendations,
    };
  }

  /**
   * Export triggers for persistence
   */
  export(): TriggerPattern[] {
    return Array.from(this.state.triggers.values());
  }

  /**
   * Import triggers
   */
  import(triggers: TriggerPattern[]): void {
    for (const trigger of triggers) {
      this.state.triggers.set(trigger.id, trigger);
    }
    this.updateMetrics();
  }

  /**
   * Reset muscle memory
   */
  reset(): void {
    this.state.triggers.clear();
    this.state.recentActivations = [];
    this.state.metrics = {
      totalTriggers: 0,
      averageConfidence: 0,
      totalActivations: 0,
      overallSuccessRate: 0,
      conversionRate: 0,
    };
  }

  // Private methods

  private convertKnowledgeToTrigger(knowledge: DistilledKnowledge): TriggerPattern | null {
    const conditions = this.extractConditionsFromKnowledge(knowledge);
    const action = this.determineActionFromKnowledge(knowledge);

    if (conditions.length === 0 || !action) {
      return null;
    }

    return {
      id: `trigger_${knowledge.patternId}_${Date.now()}`,
      name: `Learned: ${knowledge.taskType}`,
      conditions,
      action,
      confidence: knowledge.confidence,
      sourceKnowledge: [knowledge.patternId],
      activationCount: 0,
      successRate: 1.0,
      createdAt: Date.now(),
    };
  }

  private extractConditionsFromKnowledge(knowledge: DistilledKnowledge): TriggerCondition[] {
    const conditions: TriggerCondition[] = [];
    const { inputPattern } = knowledge;

    for (let i = 0; i < inputPattern.features.length; i++) {
      const feature = inputPattern.features[i];
      const value = inputPattern.values[i];
      const weight = inputPattern.weights[i];

      // Skip low-weight features
      if (weight < 0.05) continue;

      switch (value.type) {
        case 'exact':
          conditions.push({
            metric: feature,
            operator: '==',
            value: value.value,
            weight,
          });
          break;
        case 'range':
          conditions.push({
            metric: feature,
            operator: '>=',
            value: value.min,
            weight: weight * 0.5,
          });
          conditions.push({
            metric: feature,
            operator: '<=',
            value: value.max,
            weight: weight * 0.5,
          });
          break;
        case 'fuzzy':
          conditions.push({
            metric: feature,
            operator: 'contains',
            value: value.value,
            weight,
          });
          break;
        case 'set':
          conditions.push({
            metric: feature,
            operator: 'matches',
            value: value.values,
            weight,
          });
          break;
      }
    }

    return conditions;
  }

  private determineActionFromKnowledge(knowledge: DistilledKnowledge): TriggerAction | null {
    // If knowledge is very high confidence, skip teacher call
    if (knowledge.confidence >= 0.9) {
      return {
        type: 'skip_teacher',
        params: {
          useKnowledge: knowledge.patternId,
          outputPattern: knowledge.outputPattern,
        },
        priority: 10,
      };
    }

    // If knowledge is good but might need validation
    if (knowledge.confidence >= 0.8) {
      return {
        type: 'use_knowledge',
        params: {
          knowledgeId: knowledge.patternId,
          validateWithTeacher: false,
        },
        priority: 5,
      };
    }

    // For lower confidence, suggest calling teacher but with knowledge context
    return {
      type: 'call_teacher',
      params: {
        context: knowledge.patternId,
        fallbackToKnowledge: true,
      },
      priority: 3,
    };
  }

  private matchesConditions(
    context: Record<string, unknown>,
    conditions: TriggerCondition[]
  ): boolean {
    if (conditions.length === 0) return false;

    let totalMatch = 0;
    let totalWeight = 0;

    for (const condition of conditions) {
      const value = context[condition.metric];
      const matches = this.evaluateCondition(value, condition);
      
      totalMatch += (matches ? 1 : 0) * condition.weight;
      totalWeight += condition.weight;
    }

    return totalWeight > 0 && totalMatch / totalWeight >= 0.7;
  }

  private evaluateCondition(value: unknown, condition: TriggerCondition): boolean {
    switch (condition.operator) {
      case '==':
        return value === condition.value;
      case '!=':
        return value !== condition.value;
      case '<':
        return typeof value === 'number' && value < (condition.value as number);
      case '>':
        return typeof value === 'number' && value > (condition.value as number);
      case '<=':
        return typeof value === 'number' && value <= (condition.value as number);
      case '>=':
        return typeof value === 'number' && value >= (condition.value as number);
      case 'contains':
        return typeof value === 'string' && 
               value.toLowerCase().includes((condition.value as string).toLowerCase());
      case 'matches':
        return Array.isArray(condition.value) && 
               (condition.value as unknown[]).includes(value);
      default:
        return false;
    }
  }

  private consolidateTriggers(triggers: TriggerPattern[]): {
    triggers: TriggerPattern[];
    consolidations: ConsolidationResult[];
  } {
    const consolidations: ConsolidationResult[] = [];
    const consolidated = new Set<string>();
    const result: TriggerPattern[] = [];

    for (let i = 0; i < triggers.length; i++) {
      if (consolidated.has(triggers[i].id)) continue;

      const similar: TriggerPattern[] = [triggers[i]];
      
      for (let j = i + 1; j < triggers.length; j++) {
        if (consolidated.has(triggers[j].id)) continue;

        const similarity = this.calculateSimilarity(triggers[i], triggers[j]);
        if (similarity >= this.config.consolidationThreshold) {
          similar.push(triggers[j]);
          consolidated.add(triggers[j].id);
        }
      }

      if (similar.length > 1) {
        const merged = this.mergeTriggers(similar);
        result.push(merged);
        consolidated.add(triggers[i].id);
        
        consolidations.push({
          sourceIds: similar.map(t => t.id),
          result: merged,
          similarity: this.calculateSimilarity(similar[0], similar[1]),
        });
      } else {
        result.push(triggers[i]);
      }
    }

    return { triggers: result, consolidations };
  }

  private calculateSimilarity(a: TriggerPattern, b: TriggerPattern): number {
    // Compare conditions
    const aConditions = new Set(a.conditions.map(c => `${c.metric}:${c.operator}`));
    const bConditions = new Set(b.conditions.map(c => `${c.metric}:${c.operator}`));
    
    const intersection = new Set([...aConditions].filter(x => bConditions.has(x)));
    const union = new Set([...aConditions, ...bConditions]);
    
    const conditionSimilarity = intersection.size / union.size;

    // Compare actions
    const actionSimilarity = a.action.type === b.action.type ? 1 : 0;

    // Weighted combination
    return conditionSimilarity * 0.7 + actionSimilarity * 0.3;
  }

  private mergeTriggers(triggers: TriggerPattern[]): TriggerPattern {
    const avgConfidence = triggers.reduce((sum, t) => sum + t.confidence, 0) / triggers.length;
    const totalActivations = triggers.reduce((sum, t) => sum + t.activationCount, 0);
    const avgSuccessRate = triggers.reduce((sum, t) => sum + t.successRate, 0) / triggers.length;

    // Use highest priority action
    const bestAction = triggers.reduce((best, t) => 
      t.action.priority > best.action.priority ? t : best
    ).action;

    // Merge conditions (take union with highest weights)
    const conditionMap = new Map<string, TriggerCondition>();
    for (const trigger of triggers) {
      for (const condition of trigger.conditions) {
        const key = `${condition.metric}:${condition.operator}`;
        const existing = conditionMap.get(key);
        if (!existing || condition.weight > existing.weight) {
          conditionMap.set(key, condition);
        }
      }
    }

    return {
      id: `merged_${Date.now()}`,
      name: `Merged: ${triggers.map(t => t.name).join(' + ')}`,
      conditions: Array.from(conditionMap.values()),
      action: bestAction,
      confidence: avgConfidence,
      sourceKnowledge: triggers.flatMap(t => t.sourceKnowledge),
      activationCount: totalActivations,
      successRate: avgSuccessRate,
      createdAt: Date.now(),
    };
  }

  private calculateExtractionQuality(
    triggerCount: number,
    convertedCount: number,
    skippedCount: number
  ): number {
    if (convertedCount + skippedCount === 0) return 0;

    const conversionRate = convertedCount / (convertedCount + skippedCount);
    const coverageFactor = Math.min(1, triggerCount / 10); // Good if we have 10+ triggers
    
    return conversionRate * 0.7 + coverageFactor * 0.3;
  }

  private updateMetrics(): void {
    const triggers = Array.from(this.state.triggers.values());
    
    this.state.metrics.totalTriggers = triggers.length;
    
    this.state.metrics.averageConfidence = triggers.length > 0
      ? triggers.reduce((sum, t) => sum + t.confidence, 0) / triggers.length
      : 0;

    const successfulActivations = this.state.recentActivations.filter(a => a.success).length;
    this.state.metrics.overallSuccessRate = this.state.recentActivations.length > 0
      ? successfulActivations / this.state.recentActivations.length
      : 0;
  }
}

export default MuscleMemory;
