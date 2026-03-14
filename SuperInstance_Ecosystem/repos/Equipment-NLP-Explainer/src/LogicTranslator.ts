/**
 * LogicTranslator - Translates logic patterns to natural language
 * 
 * This module handles the conversion of formal logic patterns into
 * human-readable natural language descriptions in multiple languages.
 */

import type {
  SupportedLanguage,
  TranslationStrings,
  LogicPattern,
  LogicStructure,
  EvaluatedCondition,
  AppliedTransformation,
  PatternInput,
  PatternOutput,
  NLPExplanation,
  ExplanationDetails,
  ExplanationStep,
  ReasoningStep,
} from './types.js';

/**
 * Translations for all supported languages
 */
const TRANSLATIONS: Record<SupportedLanguage, TranslationStrings> = {
  en: {
    confidenceLevels: {
      veryHigh: 'very high confidence',
      high: 'high confidence',
      moderate: 'moderate confidence',
      low: 'low confidence',
      veryLow: 'very low confidence',
    },
    logicTypes: {
      conditional: 'conditional decision',
      selection: 'selection from options',
      ranking: 'ranking operation',
      filtering: 'filtering operation',
      aggregation: 'aggregation process',
      generation: 'content generation',
      verification: 'verification check',
    },
    transformationTypes: {
      map: 'mapping transformation',
      filter: 'filtering transformation',
      reduce: 'reduction operation',
      transform: 'general transformation',
      compose: 'composition operation',
      split: 'splitting operation',
      merge: 'merging operation',
      extract: 'extraction operation',
    },
    operators: {
      equals: 'equals',
      notEquals: 'does not equal',
      lessThan: 'is less than',
      greaterThan: 'is greater than',
      lessThanOrEqual: 'is less than or equal to',
      greaterThanOrEqual: 'is greater than or equal to',
      contains: 'contains',
      startsWith: 'starts with',
      endsWith: 'ends with',
      matches: 'matches pattern',
      in: 'is in',
      notIn: 'is not in',
      exists: 'exists',
      notExists: 'does not exist',
    },
    phrases: {
      because: 'because',
      therefore: 'therefore',
      however: 'however',
      additionally: 'additionally',
      consequently: 'consequently',
      as_a_result: 'as a result',
      this_means_that: 'this means that',
      the_reason_is: 'the reason is that',
      based_on: 'based on',
      taking_into_account: 'taking into account',
    },
    audit: {
      step_prefix: 'Step',
      decision_made: 'A decision was made',
      input_received: 'Input was received',
      output_generated: 'Output was generated',
      confidence_assessed: 'Confidence was assessed',
      condition_evaluated: 'A condition was evaluated',
      transformation_applied: 'A transformation was applied',
    },
  },
  es: {
    confidenceLevels: {
      veryHigh: 'muy alta confianza',
      high: 'alta confianza',
      moderate: 'confianza moderada',
      low: 'baja confianza',
      veryLow: 'muy baja confianza',
    },
    logicTypes: {
      conditional: 'decisión condicional',
      selection: 'selección de opciones',
      ranking: 'operación de clasificación',
      filtering: 'operación de filtrado',
      aggregation: 'proceso de agregación',
      generation: 'generación de contenido',
      verification: 'verificación',
    },
    transformationTypes: {
      map: 'transformación de mapeo',
      filter: 'transformación de filtrado',
      reduce: 'operación de reducción',
      transform: 'transformación general',
      compose: 'operación de composición',
      split: 'operación de división',
      merge: 'operación de fusión',
      extract: 'operación de extracción',
    },
    operators: {
      equals: 'es igual a',
      notEquals: 'no es igual a',
      lessThan: 'es menor que',
      greaterThan: 'es mayor que',
      lessThanOrEqual: 'es menor o igual que',
      greaterThanOrEqual: 'es mayor o igual que',
      contains: 'contiene',
      startsWith: 'comienza con',
      endsWith: 'termina con',
      matches: 'coincide con el patrón',
      in: 'está en',
      notIn: 'no está en',
      exists: 'existe',
      notExists: 'no existe',
    },
    phrases: {
      because: 'porque',
      therefore: 'por lo tanto',
      however: 'sin embargo',
      additionally: 'además',
      consequently: 'consecuentemente',
      as_a_result: 'como resultado',
      this_means_that: 'esto significa que',
      the_reason_is: 'la razón es que',
      based_on: 'basado en',
      taking_into_account: 'teniendo en cuenta',
    },
    audit: {
      step_prefix: 'Paso',
      decision_made: 'Se tomó una decisión',
      input_received: 'Se recibió entrada',
      output_generated: 'Se generó salida',
      confidence_assessed: 'Se evaluó la confianza',
      condition_evaluated: 'Se evaluó una condición',
      transformation_applied: 'Se aplicó una transformación',
    },
  },
  zh: {
    confidenceLevels: {
      veryHigh: '非常高的置信度',
      high: '高置信度',
      moderate: '中等置信度',
      low: '低置信度',
      veryLow: '非常低的置信度',
    },
    logicTypes: {
      conditional: '条件判断',
      selection: '选项选择',
      ranking: '排序操作',
      filtering: '过滤操作',
      aggregation: '聚合过程',
      generation: '内容生成',
      verification: '验证检查',
    },
    transformationTypes: {
      map: '映射转换',
      filter: '过滤转换',
      reduce: '归约操作',
      transform: '通用转换',
      compose: '组合操作',
      split: '拆分操作',
      merge: '合并操作',
      extract: '提取操作',
    },
    operators: {
      equals: '等于',
      notEquals: '不等于',
      lessThan: '小于',
      greaterThan: '大于',
      lessThanOrEqual: '小于等于',
      greaterThanOrEqual: '大于等于',
      contains: '包含',
      startsWith: '开头是',
      endsWith: '结尾是',
      matches: '匹配模式',
      in: '在...中',
      notIn: '不在...中',
      exists: '存在',
      notExists: '不存在',
    },
    phrases: {
      because: '因为',
      therefore: '因此',
      however: '然而',
      additionally: '此外',
      consequently: '结果',
      as_a_result: '作为结果',
      this_means_that: '这意味着',
      the_reason_is: '原因是',
      based_on: '基于',
      taking_into_account: '考虑到',
    },
    audit: {
      step_prefix: '步骤',
      decision_made: '做出了决定',
      input_received: '接收到输入',
      output_generated: '生成了输出',
      confidence_assessed: '评估了置信度',
      condition_evaluated: '评估了条件',
      transformation_applied: '应用了转换',
    },
  },
};

/**
 * LogicTranslator class for converting logic to natural language
 */
export class LogicTranslator {
  private language: SupportedLanguage;
  private translations: TranslationStrings;
  private customTerminology: Map<string, string>;

  constructor(language: SupportedLanguage = 'en', customTerminology: Record<string, string> = {}) {
    this.language = language;
    this.translations = TRANSLATIONS[language];
    this.customTerminology = new Map(Object.entries(customTerminology));
  }

  /**
   * Get current language
   */
  getLanguage(): SupportedLanguage {
    return this.language;
  }

  /**
   * Set language
   */
  setLanguage(language: SupportedLanguage): void {
    this.language = language;
    this.translations = TRANSLATIONS[language];
  }

  /**
   * Get translations for current language
   */
  getTranslations(): TranslationStrings {
    return this.translations;
  }

  /**
   * Translate a single term
   */
  translate(term: string): string {
    return this.customTerminology.get(term) ?? term;
  }

  /**
   * Translate a logic pattern to natural language
   */
  translatePattern(pattern: LogicPattern): string {
    const lines: string[] = [];

    // Start with pattern name and type
    lines.push(this.translatePatternType(pattern));

    // Describe the structure
    if (pattern.structure.complexity > 2) {
      lines.push(this.describeComplexity(pattern.structure));
    }

    // Describe inputs
    lines.push(this.describeInputs(pattern.inputs));

    // Describe conditions evaluated
    if (pattern.conditions.length > 0) {
      lines.push(this.describeConditions(pattern.conditions));
    }

    // Describe transformations
    if (pattern.transformations.length > 0) {
      lines.push(this.describeTransformations(pattern.transformations));
    }

    // Describe outputs
    lines.push(this.describeOutputs(pattern.outputs));

    // Add confidence statement
    lines.push(this.describeConfidence(pattern.confidence));

    return lines.filter(Boolean).join(' ');
  }

  /**
   * Translate pattern type to description
   */
  private translatePatternType(pattern: LogicPattern): string {
    const typeDescriptions: Record<string, string> = {
      decision: this.language === 'zh' ? '这是一个决策过程' :
                this.language === 'es' ? 'Este es un proceso de decisión' :
                'This is a decision-making process',
      transformation: this.language === 'zh' ? '这是一个转换过程' :
                      this.language === 'es' ? 'Este es un proceso de transformación' :
                      'This is a transformation process',
      validation: this.language === 'zh' ? '这是一个验证过程' :
                  this.language === 'es' ? 'Este es un proceso de validación' :
                  'This is a validation process',
      aggregation: this.language === 'zh' ? '这是一个聚合过程' :
                   this.language === 'es' ? 'Este es un proceso de agregación' :
                   'This is an aggregation process',
      branching: this.language === 'zh' ? '这是一个分支过程' :
                 this.language === 'es' ? 'Este es un proceso de ramificación' :
                 'This is a branching process',
      iteration: this.language === 'zh' ? '这是一个迭代过程' :
                 this.language === 'es' ? 'Este es un proceso de iteración' :
                 'This is an iteration process',
      composition: this.language === 'zh' ? '这是一个组合过程' :
                   this.language === 'es' ? 'Este es un proceso de composición' :
                   'This is a composition process',
      fallback: this.language === 'zh' ? '这是一个备用方案' :
                this.language === 'es' ? 'Este es un proceso de respaldo' :
                'This is a fallback process',
    };

    return typeDescriptions[pattern.type] ?? typeDescriptions.decision;
  }

  /**
   * Describe complexity level
   */
  describeComplexity(structure: LogicStructure): string {
    const phrases = this.translations.phrases;
    const stepText = this.language === 'zh'
      ? `涉及 ${structure.stepCount} 个步骤`
      : this.language === 'es'
      ? `involucrando ${structure.stepCount} pasos`
      : `involving ${structure.stepCount} steps`;

    if (structure.isNested) {
      return this.language === 'zh'
        ? `这是一个嵌套过程，${stepText}。`
        : this.language === 'es'
        ? `Este es un proceso anidado, ${stepText}.`
        : `This is a nested process, ${stepText}.`;
    }

    return `${phrases.this_means_that} ${stepText}.`;
  }

  /**
   * Describe inputs used
   */
  describeInputs(inputs: PatternInput[]): string {
    const usedInputs = inputs.filter(i => i.wasUsed);
    
    if (usedInputs.length === 0) {
      return this.language === 'zh'
        ? '没有使用任何输入。'
        : this.language === 'es'
        ? 'No se utilizó ninguna entrada.'
        : 'No inputs were used.';
    }

    if (usedInputs.length === 1) {
      const input = usedInputs[0];
      return this.language === 'zh'
        ? `使用了输入 "${input.name}"，来自 ${input.source}。`
        : this.language === 'es'
        ? `Se utilizó la entrada "${input.name}", proveniente de ${input.source}.`
        : `The input "${input.name}" was used, coming from ${input.source}.`;
    }

    const inputNames = usedInputs.map(i => `"${i.name}"`).join(', ');
    return this.language === 'zh'
      ? `使用了 ${usedInputs.length} 个输入：${inputNames}。`
      : this.language === 'es'
      ? `Se utilizaron ${usedInputs.length} entradas: ${inputNames}.`
      : `${usedInputs.length} inputs were used: ${inputNames}.`;
  }

  /**
   * Describe conditions evaluated
   */
  describeConditions(conditions: EvaluatedCondition[]): string {
    const phrases = this.translations.phrases;
    const passedConditions = conditions.filter(c => c.result);
    const failedConditions = conditions.filter(c => !c.result);

    if (conditions.length === 1) {
      const cond = conditions[0];
      const resultText = cond.result
        ? (this.language === 'zh' ? '满足' : this.language === 'es' ? 'cumplió' : 'passed')
        : (this.language === 'zh' ? '不满足' : this.language === 'es' ? 'no cumplió' : 'did not pass');
      
      return this.language === 'zh'
        ? `${phrases.based_on}条件 "${cond.expression}"，该条件${resultText}。${cond.reasoning}`
        : this.language === 'es'
        ? `${phrases.based_on} la condición "${cond.expression}", que ${resultText}. ${cond.reasoning}`
        : `${phrases.based_on} the condition "${cond.expression}", which ${resultText}. ${cond.reasoning}`;
    }

    const lines: string[] = [];
    
    if (passedConditions.length > 0) {
      lines.push(this.language === 'zh'
        ? `${passedConditions.length} 个条件满足：`
        : this.language === 'es'
        ? `${passedConditions.length} condiciones cumplidas:`
        : `${passedConditions.length} conditions passed:`);
      
      for (const cond of passedConditions) {
        lines.push(`  - "${cond.expression}"`);
      }
    }

    if (failedConditions.length > 0) {
      lines.push(this.language === 'zh'
        ? `${failedConditions.length} 个条件不满足：`
        : this.language === 'es'
        ? `${failedConditions.length} condiciones no cumplidas:`
        : `${failedConditions.length} conditions failed:`);
      
      for (const cond of failedConditions) {
        lines.push(`  - "${cond.expression}"`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Describe transformations applied
   */
  describeTransformations(transformations: AppliedTransformation[]): string {
    const phrases = this.translations.phrases;
    
    if (transformations.length === 1) {
      const t = transformations[0];
      return this.language === 'zh'
        ? `${phrases.the_reason_is}应用了${t.type}转换：${t.description}。${t.reasoning}`
        : this.language === 'es'
        ? `${phrases.the_reason_is} se aplicó una transformación de ${t.type}: ${t.description}. ${t.reasoning}`
        : `${phrases.the_reason_is} a ${t.type} transformation was applied: ${t.description}. ${t.reasoning}`;
    }

    const lines: string[] = [];
    lines.push(this.language === 'zh'
      ? `应用了 ${transformations.length} 个转换：`
      : this.language === 'es'
      ? `Se aplicaron ${transformations.length} transformaciones:`
      : `${transformations.length} transformations were applied:`);

    for (const t of transformations) {
      lines.push(`  - ${t.type}: ${t.description}`);
    }

    return lines.join('\n');
  }

  /**
   * Describe outputs produced
   */
  describeOutputs(outputs: PatternOutput[]): string {
    const finalOutputs = outputs.filter(o => o.isFinal);
    
    if (finalOutputs.length === 0) {
      return this.language === 'zh'
        ? '没有产生最终输出。'
        : this.language === 'es'
        ? 'No se produjo ninguna salida final.'
        : 'No final output was produced.';
    }

    if (finalOutputs.length === 1) {
      const output = finalOutputs[0];
      return this.language === 'zh'
        ? `最终输出 "${output.name}" 的值为：${this.formatValue(output.value)}。`
        : this.language === 'es'
        ? `La salida final "${output.name}" tiene el valor: ${this.formatValue(output.value)}.`
        : `The final output "${output.name}" has the value: ${this.formatValue(output.value)}.`;
    }

    const outputNames = finalOutputs.map(o => `"${o.name}"`).join(', ');
    return this.language === 'zh'
      ? `产生了 ${finalOutputs.length} 个最终输出：${outputNames}。`
      : this.language === 'es'
      ? `Se produjeron ${finalOutputs.length} salidas finales: ${outputNames}.`
      : `${finalOutputs.length} final outputs were produced: ${outputNames}.`;
  }

  /**
   * Describe confidence level
   */
  describeConfidence(confidence: number): string {
    const levels = this.translations.confidenceLevels;
    let levelText: string;

    if (confidence >= 0.9) {
      levelText = levels.veryHigh;
    } else if (confidence >= 0.7) {
      levelText = levels.high;
    } else if (confidence >= 0.5) {
      levelText = levels.moderate;
    } else if (confidence >= 0.3) {
      levelText = levels.low;
    } else {
      levelText = levels.veryLow;
    }

    const percentage = Math.round(confidence * 100);
    
    return this.language === 'zh'
      ? `此判断的置信度为 ${percentage}%，属于${levelText}。`
      : this.language === 'es'
      ? `La confianza en este juicio es del ${percentage}%, que se considera ${levelText}.`
      : `The confidence in this judgment is ${percentage}%, which is considered ${levelText}.`;
  }

  /**
   * Format a value for display
   */
  private formatValue(value: unknown): string {
    if (value === null) {
      return this.language === 'zh' ? '空值' : this.language === 'es' ? 'nulo' : 'null';
    }
    if (value === undefined) {
      return this.language === 'zh' ? '未定义' : this.language === 'es' ? 'indefinido' : 'undefined';
    }
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Build a complete explanation for a pattern
   */
  buildExplanation(pattern: LogicPattern, _detailLevel: 'brief' | 'normal' | 'detailed' | 'comprehensive' = 'normal'): NLPExplanation {
    const steps = this.buildSteps(pattern);
    const reasoningChain = this.buildReasoningChain(pattern);
    
    return {
      id: `expl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      language: this.language,
      summary: this.translatePattern(pattern),
      details: this.buildDetails(pattern),
      steps,
      reasoningChain,
      confidenceExplanation: this.buildConfidenceExplanation(pattern.confidence, pattern.conditions),
      auditTrail: [],
      insights: this.extractInsights(pattern),
      relatedExplanations: [],
      timestamp: Date.now(),
    };
  }

  /**
   * Build explanation steps
   */
  private buildSteps(pattern: LogicPattern): ExplanationStep[] {
    const steps: ExplanationStep[] = [];
    let stepNum = 1;

    // Input step
    const usedInputs = pattern.inputs.filter(i => i.wasUsed);
    if (usedInputs.length > 0) {
      steps.push({
        stepNumber: stepNum++,
        description: this.describeInputs(usedInputs),
        type: 'input',
        result: usedInputs.map(i => this.formatValue(i.value)).join(', '),
        reasoning: this.language === 'zh'
          ? '接收并处理输入数据'
          : this.language === 'es'
          ? 'Recibir y procesar datos de entrada'
          : 'Receiving and processing input data',
        confidence: 1.0,
      });
    }

    // Processing steps (conditions)
    for (const cond of pattern.conditions) {
      steps.push({
        stepNumber: stepNum++,
        description: this.language === 'zh'
          ? `评估条件：${cond.expression}`
          : this.language === 'es'
          ? `Evaluar condición: ${cond.expression}`
          : `Evaluating condition: ${cond.expression}`,
        type: 'decision',
        result: cond.result ? 'true' : 'false',
        reasoning: cond.reasoning,
        confidence: cond.confidence,
      });
    }

    // Processing steps (transformations)
    for (const t of pattern.transformations) {
      steps.push({
        stepNumber: stepNum++,
        description: this.language === 'zh'
          ? `应用${t.type}转换`
          : this.language === 'es'
          ? `Aplicar transformación ${t.type}`
          : `Applying ${t.type} transformation`,
        type: 'processing',
        result: this.formatValue(t.outputAfter),
        reasoning: t.reasoning,
        confidence: 0.95,
      });
    }

    // Output step
    const finalOutputs = pattern.outputs.filter(o => o.isFinal);
    if (finalOutputs.length > 0) {
      steps.push({
        stepNumber: stepNum++,
        description: this.describeOutputs(finalOutputs),
        type: 'output',
        result: finalOutputs.map(o => this.formatValue(o.value)).join(', '),
        reasoning: this.language === 'zh'
          ? '生成最终结果'
          : this.language === 'es'
          ? 'Generar resultado final'
          : 'Generating final result',
        confidence: pattern.confidence,
      });
    }

    return steps;
  }

  /**
   * Build reasoning chain
   */
  private buildReasoningChain(pattern: LogicPattern): ReasoningStep[] {
    const chain: ReasoningStep[] = [];

    // Add reasoning from conditions
    for (let i = 0; i < pattern.conditions.length; i++) {
      const cond = pattern.conditions[i];
      const stepId = `reason-${i}`;

      chain.push({
        id: stepId,
        description: this.language === 'zh'
          ? `推理步骤 ${i + 1}`
          : this.language === 'es'
          ? `Paso de razonamiento ${i + 1}`
          : `Reasoning step ${i + 1}`,
        premise: `${cond.left} ${cond.operator} ${cond.right}`,
        conclusion: cond.result ? '条件满足' : '条件不满足',
        evidence: [cond.reasoning],
        confidence: cond.confidence,
        nextStepId: i < pattern.conditions.length - 1 ? `reason-${i + 1}` : undefined,
      });
    }

    return chain;
  }

  /**
   * Build detailed explanation
   */
  private buildDetails(pattern: LogicPattern): ExplanationDetails {
    const phrases = this.translations.phrases;
    
    return {
      what: this.translatePatternType(pattern),
      why: this.language === 'zh'
        ? `${phrases.the_reason_is}需要处理输入数据并做出决策。`
        : this.language === 'es'
        ? `${phrases.the_reason_is} se necesitaba procesar los datos de entrada y tomar una decisión.`
        : `${phrases.the_reason_is} input data needed to be processed and a decision made.`,
      how: this.describeTransformations(pattern.transformations) || 
           (this.language === 'zh' ? '通过条件评估处理' : 
            this.language === 'es' ? 'Procesado mediante evaluación de condiciones' :
            'Processed through condition evaluation'),
      inputs: this.describeInputs(pattern.inputs),
      outputs: this.describeOutputs(pattern.outputs),
      alternatives: undefined,
    };
  }

  /**
   * Build confidence explanation
   */
  private buildConfidenceExplanation(confidence: number, conditions: EvaluatedCondition[]): any {
    return {
      rawScore: confidence,
      level: this.getConfidenceLevel(confidence),
      description: this.describeConfidence(confidence),
      factors: conditions.map(c => ({
        name: c.expression,
        description: c.reasoning,
        impact: c.result ? 'positive' : 'negative' as const,
        magnitude: c.confidence,
      })),
      interpretation: this.getConfidenceInterpretation(confidence),
    };
  }

  /**
   * Get confidence level text
   */
  private getConfidenceLevel(confidence: number): string {
    const levels = this.translations.confidenceLevels;
    if (confidence >= 0.9) return levels.veryHigh;
    if (confidence >= 0.7) return levels.high;
    if (confidence >= 0.5) return levels.moderate;
    if (confidence >= 0.3) return levels.low;
    return levels.veryLow;
  }

  /**
   * Get confidence interpretation
   */
  private getConfidenceInterpretation(confidence: number): string {
    const percentage = Math.round(confidence * 100);
    
    if (confidence >= 0.9) {
      return this.language === 'zh'
        ? `置信度为 ${percentage}%，表示决策非常可靠，几乎可以确定结果正确。`
        : this.language === 'es'
        ? `La confianza del ${percentage}% indica que la decisión es muy fiable, con casi total certeza de que el resultado es correcto.`
        : `A ${percentage}% confidence indicates the decision is highly reliable, with near certainty that the result is correct.`;
    }
    if (confidence >= 0.7) {
      return this.language === 'zh'
        ? `置信度为 ${percentage}%，表示决策比较可靠，但建议验证结果。`
        : this.language === 'es'
        ? `La confianza del ${percentage}% indica que la decisión es bastante fiable, pero se recomienda verificar el resultado.`
        : `A ${percentage}% confidence indicates the decision is fairly reliable, but verification is recommended.`;
    }
    if (confidence >= 0.5) {
      return this.language === 'zh'
        ? `置信度为 ${percentage}%，表示决策有一定参考价值，但结果可能存在不确定性。`
        : this.language === 'es'
        ? `La confianza del ${percentage}% indica que la decisión tiene cierto valor de referencia, pero el resultado puede ser incierto.`
        : `A ${percentage}% confidence indicates the decision has some reference value, but the result may have uncertainty.`;
    }
    if (confidence >= 0.3) {
      return this.language === 'zh'
        ? `置信度为 ${percentage}%，表示决策可靠性较低，强烈建议人工审核。`
        : this.language === 'es'
        ? `La confianza del ${percentage}% indica que la decisión tiene baja fiabilidad, se recomienda encarecidamente una revisión manual.`
        : `A ${percentage}% confidence indicates the decision has low reliability, manual review is strongly recommended.`;
    }
    return this.language === 'zh'
      ? `置信度为 ${percentage}%，表示决策非常不确定，必须人工干预。`
      : this.language === 'es'
      ? `La confianza del ${percentage}% indica que la decisión es muy incierta, se requiere intervención manual.`
      : `A ${percentage}% confidence indicates the decision is very uncertain, manual intervention is required.`;
  }

  /**
   * Extract insights from a pattern
   */
  private extractInsights(pattern: LogicPattern): string[] {
    const insights: string[] = [];

    // Check for high-confidence conditions
    const highConfConditions = pattern.conditions.filter(c => c.confidence >= 0.9);
    if (highConfConditions.length > 0) {
      insights.push(this.language === 'zh'
        ? `${highConfConditions.length} 个条件具有高置信度，决策依据可靠`
        : this.language === 'es'
        ? `${highConfConditions.length} condiciones tienen alta confianza, la base de decisión es fiable`
        : `${highConfConditions.length} conditions have high confidence, decision basis is reliable`);
    }

    // Check for failed conditions
    const failedConditions = pattern.conditions.filter(c => !c.result);
    if (failedConditions.length > 0) {
      insights.push(this.language === 'zh'
        ? `${failedConditions.length} 个条件未满足，影响了最终决策`
        : this.language === 'es'
        ? `${failedConditions.length} condiciones no se cumplieron, afectando la decisión final`
        : `${failedConditions.length} conditions were not met, affecting the final decision`);
    }

    // Check for complexity
    if (pattern.structure.complexity >= 4) {
      insights.push(this.language === 'zh'
        ? '决策过程复杂，涉及多个步骤和条件'
        : this.language === 'es'
        ? 'El proceso de decisión es complejo, involucrando múltiples pasos y condiciones'
        : 'Decision process is complex, involving multiple steps and conditions');
    }

    return insights;
  }
}

export default LogicTranslator;
