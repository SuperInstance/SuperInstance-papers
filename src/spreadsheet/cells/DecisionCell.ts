/**
 * POLLN Spreadsheet Integration - DecisionCell
 *
 * DecisionCell makes decisions based on analysis and rules.
 * Uses L2-L3 logic (agent reasoning + LLM support).
 *
 * Design Philosophy:
 * "Decisions are where knowledge meets action."
 * - This cell bridges the gap between understanding (AnalysisCell)
 *   and doing (ActionCell).
 * - The Knowledge-Action Interface
 * - Weight of evidence vs urgency
 * - Confidence thresholds for action
 *
 * Decision Architecture:
 * - Receives inputs from AnalysisCells
 * - Applies decision rules/logic
 * - Outputs decisions with reasoning traces
 * - Can escalate to LLM for complex decisions
 */

import { LogCell, LogCellConfig } from '../core/LogCell.js';
import { CellType, CellState, LogicLevel, CellOutput } from '../core/types.js';

/**
 * Decision types
 */
export enum DecisionType {
  BINARY = 'binary',           // Yes/No decision
  MULTI_CHOICE = 'multi_choice', // Choose from multiple options
  THRESHOLD = 'threshold',   // Decision when threshold crossed
  WEIGHTED = 'weighted',     // Weighted combination of factors
  PRIORITY = 'priority',     // Priority-based ranking
  CONDITIONAL = 'conditional', // If-then-else logic
  OPTIMIZATION = 'optimization', // Optimize for a goal
  RISK_BASED = 'risk_based', // Decision based on risk assessment
}

/**
 * Decision outcome
 */
export interface DecisionOutcome {
  decision: string;
  confidence: number;
  reasoning: string[];
  alternatives?: Array<{
    option: string;
    score: number;
  }>;
  riskLevel?: 'low' | 'medium' | 'high';
  reversible?: boolean;
}

 /**
 * Decision rule
 */
export interface DecisionRule {
  name: string;
  type: DecisionType;
  condition: (context: unknown) => boolean;
  action: (context: unknown) => string;
  weight?: number;
  fallback?: string;
}

/**
 * Configuration for DecisionCell
 */
export interface DecisionCellConfig extends LogCellConfig {
  decisionType: DecisionType;
  rules?: DecisionRule[];
  options?: string[];
  threshold?: number;
  optimizationGoal?: 'minimize' | 'maximize';
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
}

/**
 * DecisionCell - Makes decisions based on analysis and rules
 *
 * The Bridge Between Knowledge and Action
 * --------------------------------------
 * DecisionCell is where insights become actions. It's the "executive"
 * function of the cell system.
 *
 * Key Insight from Research:
 * "The prefrontal cortex (analogous to DecisionCell) doesn't just
 * choose - it weighs evidence, considers alternatives, and commits
 * only when confidence is sufficient."
 *
 * Decision-Making Framework:
 * 1. Gather evidence from AnalysisCells
 * 2. Evaluate each option against rules
 * 3. Calculate confidence scores
 * 4. Consider alternatives and reversibility
 * 5. Make the decision with full reasoning trace
 *
 * Task-First vs Knowledge-First:
 * - Task-first: "What should we do?" → Decides quickly, acts fast
 * - Knowledge-first: "What do we know?" → Gathers more, decides slowly
 * - DecisionCell balances both: enough knowledge to be confident,
 *   fast enough to be useful
 *
 * Logic Level: L2-L3 (agent reasoning + optional LLM for complex)
 */
export class DecisionCell extends LogCell {
  private decisionType: DecisionType;
  private rules: DecisionRule[];
  private options: string[];
  private threshold: number;
  private optimizationGoal: 'minimize' | 'maximize';
  private riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  private decisionHistory: DecisionOutcome[] = [];

  constructor(config: DecisionCellConfig) {
    super({
      type: CellType.DECISION,
      position: config.position,
      logicLevel: LogicLevel.L2_AGENT,
      memoryLimit: config.memoryLimit,
    });

    this.decisionType = config.decisionType;
    this.rules = config.rules || [];
    this.options = config.options || [];
    this.threshold = config.threshold || 0.5;
    this.optimizationGoal = config.optimizationGoal || 'maximize';
    this.riskTolerance = config.riskTolerance || 'moderate';
  }

  /**
   * Make a decision based on input context
   */
  async decide(context: unknown): Promise<CellOutput> {
    this.state = CellState.PROCESSING;

    try {
      let outcome: DecisionOutcome;

      switch (this.decisionType) {
      case DecisionType.BINARY:
        outcome = this.makeBinaryDecision(context);
        break;

      case DecisionType.MULTI_CHOICE:
        outcome = this.makeMultiChoiceDecision(context);
        break;

      case DecisionType.THRESHOLD:
        outcome = this.makeThresholdDecision(context);
        break;

      case DecisionType.WEIGHTED:
        outcome = this.makeWeightedDecision(context);
        break;

      case DecisionType.PRIORITY:
        outcome = this.makePriorityDecision(context);
        break;

      case DecisionType.CONDITIONAL:
        outcome = this.makeConditionalDecision(context);
        break;

      case DecisionType.OPTIMIZATION:
        outcome = this.makeOptimizationDecision(context);
        break;

      case DecisionType.RISK_BASED:
        outcome = this.makeRiskBasedDecision(context);
        break;

      default:
        throw new Error(`Unknown decision type: ${this.decisionType}`);
      }

      this.state = CellState.EMITTING;
      this.decisionHistory.push(outcome);

      return {
        success: true,
        value: outcome,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        error: error instanceof Error ? error.message : 'Decision failed',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Binary decision (Yes/No)
   */
  private makeBinaryDecision(context: unknown): DecisionOutcome {
    const evidence = this.gatherEvidence(context);
    const confidence = this.calculateConfidence(evidence);
    const decision = confidence >= this.threshold ? 'yes' : 'no';

    return {
      decision,
      confidence,
      reasoning: [
        `Evidence score: ${evidence.toFixed(2)}`,
        `Confidence threshold: ${this.threshold}`,
        `Decision: ${decision.toUpperCase()}`,
      ],
      riskLevel: confidence < 0.7 ? 'high' : confidence < 0.85 ? 'medium' : 'low',
      reversible: true,
    };
  }

  /**
   * Multi-choice decision
   */
  private makeMultiChoiceDecision(context: unknown): DecisionOutcome {
    const scores = this.scoreOptions(context);
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const [best, bestScore] = sorted[0];
    const alternatives = sorted.slice(1, 4).map(([option, score]) => ({
    option,
    score,
  }));

    return {
      decision: best,
      confidence: bestScore,
      reasoning: [
        `Evaluated ${this.options.length} options`,
        `Best option: ${best} (score: ${bestScore.toFixed(2)})`,
        ...alternatives.map((a) => `Alternative: ${a.option} (${a.score.toFixed(2)})`),
      ],
      alternatives,
      riskLevel: bestScore < 0.6 ? 'high' : bestScore < 0.8 ? 'medium' : 'low',
    };
  }

  /**
   * Threshold-based decision
   */
  private makeThresholdDecision(context: unknown): DecisionOutcome {
    const value = this.extractValue(context);
    const crossed = value >= this.threshold;

    return {
      decision: crossed ? 'threshold_crossed' : 'threshold_not_crossed',
      confidence: Math.abs(value - this.threshold) / Math.max(value, this.threshold),
      reasoning: [
        `Current value: ${value}`,
        `Threshold: ${this.threshold}`,
        crossed
          ? `Threshold crossed by ${(value - this.threshold).toFixed(2)}`
          : `Below threshold by ${(this.threshold - value).toFixed(2)}`,
      ],
      riskLevel: 'low',
      reversible: true,
    };
  }

  /**
   * Weighted decision (combining multiple factors)
   */
  private makeWeightedDecision(context: unknown): DecisionOutcome {
    const factors = this.evaluateFactors(context);
    const weightedScore = factors.reduce((sum, { score, weight }) => sum + score * weight, 0);
    const totalWeight = factors.reduce((sum, { weight }) => sum + weight, 0);
    const normalizedScore = weightedScore / totalWeight;

    const decision = normalizedScore >= 0.5 ? 'proceed' : 'abort';

    return {
      decision,
      confidence: normalizedScore,
      reasoning: [
        ...factors.map((f) => `${f.name}: ${(f.score * 100).toFixed(0)}% (weight: ${f.weight})`),
        `Weighted score: ${(normalizedScore * 100).toFixed(0)}%`,
      ],
      riskLevel: normalizedScore < 0.6 ? 'high' : normalizedScore < 0.8 ? 'medium' : 'low',
    };
  }

  /**
   * Priority-based decision
   */
  private makePriorityDecision(context: unknown): DecisionOutcome {
    const priorities = this.calculatePriorities(context);
    const sorted = priorities.sort((a, b) => b.priority - a.priority);

    return {
      decision: sorted[0].action,
      confidence: sorted[0].priority / 100,
      reasoning: [
        `Priority ranking:`,
        ...sorted.slice(0, 3).map((p, i) => `${i + 1}. ${p.action} (priority: ${p.priority})`),
      ],
      riskLevel: 'low',
    };
  }

  /**
   * Conditional decision (if-then-else)
   */
  private makeConditionalDecision(context: unknown): DecisionOutcome {
    for (const rule of this.rules) {
      if (rule.condition(context)) {
        const decision = rule.action(context);
        return {
          decision,
          confidence: 0.9,
          reasoning: [
            `Rule matched: ${rule.name}`,
            `Action: ${decision}`,
          ],
          riskLevel: 'low',
          reversible: true,
        };
      }
    }

    // No rule matched - use fallback
    const fallback = this.rules[0]?.fallback || 'no_action';
    return {
      decision: fallback,
      confidence: 0.5,
      reasoning: ['No rule matched, using fallback'],
      riskLevel: 'medium',
    };
  }

  /**
   * Optimization decision (minimize/maximize)
   */
  private makeOptimizationDecision(context: unknown): DecisionOutcome {
    const options = this.generateOptimizationOptions(context);
    const scored = options.map((opt) => ({
      ...opt,
      score: this.evaluateOptimizationScore(opt),
    }));

    const sorted = scored.sort((a, b) =>
      this.optimizationGoal === 'maximize' ? b.score - a.score : a.score - b.score
    );

    const best = sorted[0];

    return {
      decision: best.action,
      confidence: 0.85,
      reasoning: [
        `Optimization goal: ${this.optimizationGoal}`,
        `Best option: ${best.action} (score: ${best.score.toFixed(2)})`,
      ],
      alternatives: sorted.slice(1, 4).map((a) => ({
        option: a.action,
        score: a.score,
      })),
      riskLevel: 'medium',
    };
  }

  /**
   * Risk-based decision
   */
  private makeRiskBasedDecision(context: unknown): DecisionOutcome {
    const riskAnalysis = this.analyzeRisk(context);
    const adjustedThreshold = this.adjustThresholdForRisk();

    const decision = riskAnalysis.overallRisk < adjustedThreshold ? 'proceed' : 'caution';

    return {
      decision,
      confidence: 1 - riskAnalysis.overallRisk,
      reasoning: [
        `Risk analysis:`,
        ...riskAnalysis.factors.map((f) => `- ${f.name}: ${(f.risk * 100).toFixed(0)}% risk`),
        `Overall risk: ${(riskAnalysis.overallRisk * 100).toFixed(0)}%`,
        `Risk tolerance: ${this.riskTolerance} (threshold: ${adjustedThreshold})`,
      ],
      riskLevel: riskAnalysis.overallRisk < 0.3 ? 'low' : riskAnalysis.overallRisk < 0.6 ? 'medium' : 'high',
    };
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private gatherEvidence(context: unknown): number {
    // Simplified evidence gathering
    if (typeof context === 'object' && context !== null) {
      const obj = context as Record<string, unknown>;
      const values = Object.values(obj).filter((v) => typeof v === 'number');
      if (values.length > 0) {
        return values.reduce((sum, v) => sum + (v as number), 0) / values.length;
      }
    }
    return 0.5; // Default evidence score
  }

  private calculateConfidence(evidence: number): number {
    // Convert evidence to confidence (0-1 scale)
    return Math.min(1, Math.max(0, evidence / 100));
  }

  private scoreOptions(context: unknown): Map<string, number> {
    const scores = new Map<string, number>();

    for (const option of this.options) {
      const score = this.evaluateOption(option, context);
      scores.set(option, score);
    }

    return scores;
  }

  private evaluateOption(option: string, context: unknown): number {
    // Simplified option evaluation
    const contextStr = JSON.stringify(context);
    const hash = contextStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 100) / 100;
  }

  private extractValue(context: unknown): number {
    if (typeof context === 'number') {
      return context;
    }
    if (typeof context === 'object' && context !== null) {
      const values = Object.values(context).filter((v) => typeof v === 'number');
      if (values.length > 0) {
        return values[0] as number;
      }
    }
    return 0;
  }

  private evaluateFactors(context: unknown): Array<{
    name: string;
    score: number;
    weight: number;
  }> {
    // Simplified factor evaluation
    const factors: Array<{ name: string; score: number; weight: number }> = [];

    if (typeof context === 'object' && context !== null) {
      const entries = Object.entries(context as Record<string, unknown>);
      entries.forEach(([key, value], index) => {
        if (typeof value === 'number') {
          factors.push({
            name: key,
            score: (value as number) / 100,
            weight: 1 / entries.length,
          });
        }
      });
    }

    return factors;
  }

  private calculatePriorities(context: unknown): Array<{
    action: string;
    priority: number;
  }> {
    // Simplified priority calculation
    const priorities: Array<{ action: string; priority: number }> = [];

    for (const rule of this.rules) {
      if (rule.condition(context)) {
        priorities.push({
          action: rule.action(context),
          priority: (rule.weight || 50) * (Math.random() * 0.5 + 0.75),
        });
      }
    }

    return priorities;
  }

  private generateOptimizationOptions(context: unknown): Array<{
    action: string;
    params: Record<string, unknown>;
  }> {
    const options: Array<{ action: string; params: Record<string, unknown> }> = [];

    for (const option of this.options) {
      options.push({
        action: option,
        params: typeof context === 'object' && context !== null
          ? context as Record<string, unknown>
          : {},
      });
    }

    return options;
  }

  private evaluateOptimizationScore(option: {
    action: string;
    params: Record<string, unknown>;
  }): number {
    // Simplified optimization scoring
    const paramValues = Object.values(option.params).filter((v) => typeof v === 'number');
    if (paramValues.length === 0) {
      return paramValues[0] as number;
    }
    return 0.5;
  }

  private analyzeRisk(context: unknown): {
    factors: Array<{ name: string; risk: number }>;
    overallRisk: number;
  } {
    // Simplified risk analysis
    const factors: Array<{ name: string; risk: number }> = [];

    if (typeof context === 'object' && context !== null) {
      const entries = Object.entries(context as Record<string, unknown>);
      entries.forEach(([key, value]) => {
        if (typeof value === 'number') {
          factors.push({
            name: key,
            risk: 1 - Math.min(1, (value as number) / 100),
          });
        }
      });
    }

    const overallRisk = factors.length > 0
      ? factors.reduce((sum, f) => sum + f.risk, 0) / factors.length
      : 0.5;

    return { factors, overallRisk };
  }

  private adjustThresholdForRisk(): number {
    switch (this.riskTolerance) {
    case 'conservative':
      return 0.3;
    case 'aggressive':
      return 0.7;
    default:
      return 0.5;
    }
  }

  /**
   * Add a decision rule
   */
  addRule(rule: DecisionRule): void {
    this.rules.push(rule);
  }

  /**
   * Get decision history
   */
  getDecisionHistory(): DecisionOutcome[] {
    return [...this.decisionHistory];
  }

  /**
   * Create the processing logic for this cell
   */
  protected createProcessingLogic(): any {
    return {
      type: 'decision',
      decisionType: this.decisionType,
      logic: this.logicLevel,
    };
  }
}
