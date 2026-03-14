/**
 * NLPExplainer - Main Equipment Class
 * 
 * Equipment that generates human-readable descriptions of cell logic and operations.
 * Transforms complex decision logic into natural language explanations that answer
 * not just WHAT was decided, but WHY it was decided.
 */

import type {
  Equipment,
  EquipmentSlot,
  OriginCore,
  Tile,
  CostMetrics,
  BenefitMetrics,
  TriggerThresholds,
  EquipmentDescription,
} from './types.js';

import { LogicTranslator } from './LogicTranslator.js';
import { ConfidenceExplainer } from './ConfidenceExplainer.js';
import type {
  SupportedLanguage,
  NLPExplanation,
  NLPExplainerOptions,
  LogicPattern,
  TileExplanation,
  DecisionExplanation,
  ChainExplanation,
  ReasoningStep,
  AuditTrailEntry,
  ConfidenceExplanation,
  ConfidenceFactor,
} from './types.js';

/**
 * NLPExplainer Equipment
 * 
 * This equipment transforms cell logic into natural language descriptions,
 * explaining WHY decisions were made, mapping confidence scores to human-
 * understandable terms, and generating audit trails in prose form.
 */
export class NLPExplainer implements Equipment {
  readonly name = 'NLPExplainer';
  readonly slot: EquipmentSlot = 'EXPLANATION';
  readonly version = '1.0.0';
  readonly description = 'Generates human-readable descriptions of cell logic and operations';
  
  readonly cost: CostMetrics = {
    memoryBytes: 30 * 1024 * 1024, // 30MB
    cpuPercent: 10,
    latencyMs: 200,
    costPerUse: 0.0005,
  };
  
  readonly benefit: BenefitMetrics = {
    accuracyBoost: 0.05,
    speedMultiplier: 1.0,
    confidenceBoost: 0.1,
    capabilityGain: [
      'natural_language_explanation',
      'why_analysis',
      'confidence_translation',
      'audit_trail_generation',
      'multi_language_support',
      'reasoning_chain_explanation',
    ],
  };
  
  readonly triggerThresholds: TriggerThresholds = {
    equipWhen: [
      { metric: 'need_explanation', operator: '==', value: true },
      { metric: 'audit_required', operator: '==', value: true },
    ],
    unequipWhen: [
      { metric: 'memory', operator: '>', value: 0.9 },
    ],
    callTeacher: { low: 0.2, high: 0.7 },
  };
  
  private translator: LogicTranslator;
  private confidenceExplainer: ConfidenceExplainer;
  private explanationCache: Map<string, NLPExplanation>;
  private options: NLPExplainerOptions;
  
  constructor(options: NLPExplainerOptions = {}) {
    this.options = {
      language: 'en',
      detailLevel: 'normal',
      includeReasoningChain: true,
      includeAuditTrail: true,
      includeConfidenceExplanation: true,
      maxLength: 5000,
      targetAudience: 'general',
      ...options,
    };
    
    this.translator = new LogicTranslator(
      this.options.language,
      this.options.customTerminology
    );
    this.confidenceExplainer = new ConfidenceExplainer(this.options.language);
    this.explanationCache = new Map();
  }

  /**
   * Equip the agent with this equipment
   */
  async equip(_agent: OriginCore): Promise<void> {
    this.explanationCache.clear();
  }

  /**
   * Unequip the agent from this equipment
   */
  async unequip(_agent: OriginCore): Promise<void> {
    this.explanationCache.clear();
  }

  /**
   * Get equipment description
   */
  describe(): EquipmentDescription {
    return {
      name: this.name,
      slot: this.slot,
      purpose: this.description,
      whenToUse: [
        'When you need to explain LLM decisions to users',
        'When generating audit trails for compliance',
        'When translating confidence scores to human terms',
        'When explaining multi-step reasoning chains',
        'When providing explanations in multiple languages',
      ],
      whenToRemove: [
        'When memory is critically low',
        'When explanation generation is no longer needed',
      ],
      dependencies: [],
      conflicts: [],
    };
  }

  /**
   * Convert this equipment to a Tile
   */
  asTile(): Tile {
    return {
      inputType: {
        type: 'composite',
        properties: {
          logic: { type: 'object' },
          context: { type: 'object' },
          options: { type: 'object' },
        },
      },
      outputType: {
        type: 'composite',
        properties: {
          explanation: { type: 'object' },
          auditTrail: { type: 'array' },
          insights: { type: 'array' },
        },
      },
      compute: (input: unknown) => {
        const typedInput = input as { logic: LogicPattern; options?: NLPExplainerOptions };
        return this.explain(typedInput.logic, typedInput.options);
      },
      confidence: (_input: unknown) => 0.95,
      trace: (_input: unknown) => `NLPExplainer.explain()`,
    };
  }

  // ============================================
  // Language Management
  // ============================================

  /**
   * Get current language setting
   */
  getLanguage(): SupportedLanguage {
    return this.options.language ?? 'en';
  }

  /**
   * Set language for explanations
   */
  setLanguage(language: SupportedLanguage): void {
    this.options.language = language;
    this.translator.setLanguage(language);
    this.confidenceExplainer.setLanguage(language);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return ['en', 'es', 'zh'];
  }

  // ============================================
  // Main API Methods
  // ============================================

  /**
   * Explain a logic pattern
   */
  explain(pattern: LogicPattern, options?: NLPExplainerOptions): NLPExplanation {
    const mergedOptions = { ...this.options, ...options };
    const cacheKey = this.getCacheKey(pattern, mergedOptions);
    
    // Check cache
    const cached = this.explanationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate explanation using translator
    const explanation = this.translator.buildExplanation(pattern, mergedOptions.detailLevel);
    
    // Add audit trail if requested
    if (mergedOptions.includeAuditTrail) {
      explanation.auditTrail = this.generateAuditTrail(pattern);
    }

    // Cache the result
    this.explanationCache.set(cacheKey, explanation);
    
    return explanation;
  }

  /**
   * Explain a tile and its logic
   */
  explainTile(tileId: string, tileName: string, logic: LogicPattern): TileExplanation {
    return {
      tileId,
      tileName,
      explanation: this.explain(logic),
      pattern: logic,
    };
  }

  /**
   * Explain a specific decision
   */
  explainDecision(
    decisionId: string,
    decision: string,
    reasoning: string,
    confidence: number,
    alternatives: Array<{ description: string; whyRejected: string }> = []
  ): DecisionExplanation {
    const confidenceExplanation = this.confidenceExplainer.explainConfidence(confidence);
    
    // Create a pattern from the decision
    const pattern: LogicPattern = {
      id: decisionId,
      name: decision,
      type: 'decision',
      structure: {
        complexity: 2,
        stepCount: 1,
        isNested: false,
        branchingFactor: alternatives.length + 1,
      },
      inputs: [],
      outputs: [{
        id: 'output-1',
        name: 'decision',
        value: decision,
        type: 'string',
        isFinal: true,
      }],
      conditions: [],
      transformations: [],
      confidence,
    };

    const fullExplanation = this.explain(pattern);
    
    // Enhance with reasoning
    fullExplanation.details.why = reasoning;
    fullExplanation.details.alternatives = alternatives.length > 0
      ? alternatives.map(a => `${a.description} (${a.whyRejected})`).join('; ')
      : undefined;

    return {
      decisionId,
      decision,
      reasoning,
      alternatives,
      confidence: confidenceExplanation,
      fullExplanation,
    };
  }

  /**
   * Explain a reasoning chain
   */
  explainReasoningChain(
    chainId: string,
    steps: Array<{
      premise: string;
      conclusion: string;
      evidence?: string[];
      confidence: number;
    }>
  ): ChainExplanation {
    const reasoningSteps: ReasoningStep[] = steps.map((step, i) => ({
      id: `step-${i}`,
      description: `${step.premise} → ${step.conclusion}`,
      premise: step.premise,
      conclusion: step.conclusion,
      evidence: step.evidence ?? [],
      confidence: step.confidence,
      nextStepId: i < steps.length - 1 ? `step-${i + 1}` : undefined,
    }));

    // Build connections
    const connections = reasoningSteps.slice(0, -1).map((step, i) => ({
      fromStepId: step.id,
      toStepId: reasoningSteps[i + 1].id,
      relationship: 'leads_to',
    }));

    // Calculate overall confidence
    const overallConfidence = reasoningSteps.reduce((sum, s) => sum + s.confidence, 0) / reasoningSteps.length;
    const finalConclusion = reasoningSteps[reasoningSteps.length - 1]?.conclusion ?? '';

    // Create pattern for full explanation
    const pattern: LogicPattern = {
      id: chainId,
      name: 'Reasoning Chain',
      type: 'composition',
      structure: {
        complexity: Math.min(5, steps.length),
        stepCount: steps.length,
        isNested: false,
        branchingFactor: 1,
      },
      inputs: [],
      outputs: [{
        id: 'chain-output',
        name: 'conclusion',
        value: finalConclusion,
        type: 'string',
        isFinal: true,
      }],
      conditions: [],
      transformations: [],
      confidence: overallConfidence,
    };

    const fullExplanation = this.explain(pattern);
    fullExplanation.reasoningChain = reasoningSteps;
    fullExplanation.summary = this.buildChainSummary(reasoningSteps);

    return {
      chainId,
      summary: fullExplanation.summary,
      steps: reasoningSteps,
      connections,
      conclusion: finalConclusion,
      fullExplanation,
    };
  }

  /**
   * Generate audit trail in prose form
   */
  generateAuditTrail(pattern: LogicPattern): AuditTrailEntry[] {
    const entries: AuditTrailEntry[] = [];
    const baseTime = Date.now();

    // Input entry
    const usedInputs = pattern.inputs.filter(i => i.wasUsed);
    if (usedInputs.length > 0) {
      entries.push({
        id: `audit-input-${baseTime}`,
        timestamp: baseTime,
        action: 'input_received',
        actor: 'system',
        description: this.translator.describeInputs(usedInputs),
        result: `${usedInputs.length} inputs processed`,
        confidence: 1.0,
      });
    }

    // Condition evaluation entries
    for (let i = 0; i < pattern.conditions.length; i++) {
      const cond = pattern.conditions[i];
      entries.push({
        id: `audit-cond-${baseTime}-${i}`,
        timestamp: baseTime + (i + 1) * 100,
        action: 'condition_evaluated',
        actor: 'logic_engine',
        description: cond.reasoning,
        result: cond.result ? 'condition_passed' : 'condition_failed',
        confidence: cond.confidence,
      });
    }

    // Transformation entries
    for (let i = 0; i < pattern.transformations.length; i++) {
      const t = pattern.transformations[i];
      entries.push({
        id: `audit-transform-${baseTime}-${i}`,
        timestamp: baseTime + (pattern.conditions.length + i + 1) * 100,
        action: 'transformation_applied',
        actor: 'transform_engine',
        description: t.description,
        result: `transformed to ${typeof t.outputAfter}`,
        confidence: 0.95,
      });
    }

    // Decision output entry
    const finalOutputs = pattern.outputs.filter(o => o.isFinal);
    if (finalOutputs.length > 0) {
      entries.push({
        id: `audit-output-${baseTime}`,
        timestamp: baseTime + (pattern.conditions.length + pattern.transformations.length + 1) * 100,
        action: 'output_generated',
        actor: 'system',
        description: this.translator.describeOutputs(finalOutputs),
        result: `${finalOutputs.length} outputs generated`,
        confidence: pattern.confidence,
      });
    }

    return entries;
  }

  /**
   * Explain a confidence score
   */
  explainConfidence(score: number, factors?: ConfidenceFactor[]): ConfidenceExplanation {
    return this.confidenceExplainer.explainConfidence(score, factors);
  }

  /**
   * Compare two confidence scores
   */
  compareConfidence(score1: number, score2: number): string {
    return this.confidenceExplainer.compareScores(score1, score2);
  }

  // ============================================
  // WHY Analysis
  // ============================================

  /**
   * Explain WHY a decision was made
   */
  explainWhy(pattern: LogicPattern): string {
    const lines: string[] = [];
    const phrases = this.translator.getTranslations().phrases;

    // Start with the main decision
    lines.push(this.explainWhat(pattern));
    lines.push('');

    // Explain the reasoning
    lines.push(phrases.the_reason_is + ':');
    
    // Add condition reasoning
    for (const cond of pattern.conditions) {
      const prefix = cond.result ? '✓' : '✗';
      lines.push(`  ${prefix} ${cond.reasoning}`);
    }

    // Add transformation reasoning
    for (const t of pattern.transformations) {
      lines.push(`  • ${t.reasoning}`);
    }

    // Add confidence context
    lines.push('');
    lines.push(this.translator.describeConfidence(pattern.confidence));

    return lines.join('\n');
  }

  /**
   * Explain WHAT was decided
   */
  explainWhat(pattern: LogicPattern): string {
    const finalOutputs = pattern.outputs.filter(o => o.isFinal);
    if (finalOutputs.length === 0) {
      return this.getLanguage() === 'zh'
        ? '没有产生最终决策'
        : this.getLanguage() === 'es'
        ? 'No se produjo ninguna decisión final'
        : 'No final decision was produced';
    }

    const outputValues = finalOutputs.map(o => {
      if (typeof o.value === 'string') return `"${o.value}"`;
      return String(o.value);
    }).join(', ');

    return this.getLanguage() === 'zh'
      ? `最终决策是：${outputValues}`
      : this.getLanguage() === 'es'
      ? `La decisión final fue: ${outputValues}`
      : `The final decision was: ${outputValues}`;
  }

  /**
   * Explain HOW the decision was made
   */
  explainHow(pattern: LogicPattern): string {
    const lines: string[] = [];

    // Steps through the process
    lines.push(this.getLanguage() === 'zh'
      ? '## 决策过程'
      : this.getLanguage() === 'es'
      ? '## Proceso de Decisión'
      : '## Decision Process');

    // Input gathering
    const usedInputs = pattern.inputs.filter(i => i.wasUsed);
    if (usedInputs.length > 0) {
      lines.push('');
      lines.push(this.getLanguage() === 'zh'
        ? '### 1. 收集输入'
        : this.getLanguage() === 'es'
        ? '### 1. Recopilar Entradas'
        : '### 1. Gather Inputs');
      lines.push(this.translator.describeInputs(usedInputs));
    }

    // Condition evaluation
    if (pattern.conditions.length > 0) {
      lines.push('');
      lines.push(this.getLanguage() === 'zh'
        ? '### 2. 评估条件'
        : this.getLanguage() === 'es'
        ? '### 2. Evaluar Condiciones'
        : '### 2. Evaluate Conditions');
      lines.push(this.translator.describeConditions(pattern.conditions));
    }

    // Transformations
    if (pattern.transformations.length > 0) {
      lines.push('');
      lines.push(this.getLanguage() === 'zh'
        ? '### 3. 应用转换'
        : this.getLanguage() === 'es'
        ? '### 3. Aplicar Transformaciones'
        : '### 3. Apply Transformations');
      lines.push(this.translator.describeTransformations(pattern.transformations));
    }

    // Output generation
    lines.push('');
    lines.push(this.getLanguage() === 'zh'
      ? '### 4. 生成输出'
      : this.getLanguage() === 'es'
      ? '### 4. Generar Salida'
      : '### 4. Generate Output');
    lines.push(this.translator.describeOutputs(pattern.outputs));

    return lines.join('\n');
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Create a logic pattern from components
   */
  createPattern(
    id: string,
    name: string,
    type: LogicPattern['type'],
    inputs: Array<{ name: string; value: unknown; source: string }>,
    outputs: Array<{ name: string; value: unknown; isFinal?: boolean }>,
    conditions: Array<{ expression: string; result: boolean; reasoning: string; confidence: number }>,
    transformations: Array<{ type: string; description: string; reasoning: string }>,
    confidence: number
  ): LogicPattern {
    return {
      id,
      name,
      type,
      structure: {
        complexity: Math.min(5, conditions.length + transformations.length),
        stepCount: inputs.length + conditions.length + transformations.length + outputs.length,
        isNested: false,
        branchingFactor: conditions.filter(c => c.result).length + 1,
      },
      inputs: inputs.map((i, idx) => ({
        id: `input-${idx}`,
        name: i.name,
        value: i.value,
        type: typeof i.value,
        source: i.source,
        wasUsed: true,
      })),
      outputs: outputs.map((o, idx) => ({
        id: `output-${idx}`,
        name: o.name,
        value: o.value,
        type: typeof o.value,
        isFinal: o.isFinal ?? true,
      })),
      conditions: conditions.map((c, idx) => ({
        id: `cond-${idx}`,
        expression: c.expression,
        left: c.expression.split(' ')[0] ?? '',
        operator: c.expression.split(' ')[1] ?? '',
        right: c.expression.split(' ')[2] ?? '',
        result: c.result,
        reasoning: c.reasoning,
        confidence: c.confidence,
      })),
      transformations: transformations.map((t, idx) => ({
        id: `transform-${idx}`,
        type: t.type,
        description: t.description,
        inputBefore: undefined,
        outputAfter: undefined,
        reasoning: t.reasoning,
      })),
      confidence,
    };
  }

  /**
   * Get cached explanation
   */
  getCachedExplanation(cacheKey: string): NLPExplanation | undefined {
    return this.explanationCache.get(cacheKey);
  }

  /**
   * Clear explanation cache
   */
  clearCache(): void {
    this.explanationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.explanationCache.size,
      keys: Array.from(this.explanationCache.keys()),
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private getCacheKey(pattern: LogicPattern, options: NLPExplainerOptions): string {
    return `${pattern.id}-${options.language ?? 'en'}-${options.detailLevel ?? 'normal'}`;
  }

  private buildChainSummary(steps: ReasoningStep[]): string {
    if (steps.length === 0) {
      return this.getLanguage() === 'zh'
        ? '推理链为空'
        : this.getLanguage() === 'es'
        ? 'La cadena de razonamiento está vacía'
        : 'The reasoning chain is empty';
    }

    const firstPremise = steps[0].premise;
    const lastConclusion = steps[steps.length - 1].conclusion;
    
    return this.getLanguage() === 'zh'
      ? `从 "${firstPremise}" 开始，经过 ${steps.length} 步推理，得出结论：${lastConclusion}`
      : this.getLanguage() === 'es'
      ? `Comenzando con "${firstPremise}", tras ${steps.length} pasos de razonamiento, se concluye: ${lastConclusion}`
      : `Starting from "${firstPremise}", after ${steps.length} reasoning steps, we conclude: ${lastConclusion}`;
  }
}

export default NLPExplainer;
