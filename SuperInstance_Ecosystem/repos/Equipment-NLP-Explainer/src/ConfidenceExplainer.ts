/**
 * ConfidenceExplainer - Explains confidence scores in plain terms
 * 
 * This module translates numeric confidence scores into human-readable
 * explanations with context about what factors influenced the score.
 */

import type {
  SupportedLanguage,
  ConfidenceExplanation,
  ConfidenceFactor,
} from './types.js';

/**
 * Confidence thresholds and their descriptions
 */
interface ConfidenceThreshold {
  min: number;
  max: number;
  level: string;
  description: string;
  interpretation: string;
  recommendation: string;
}

/**
 * Thresholds for each language
 */
const CONFIDENCE_THRESHOLDS: Record<SupportedLanguage, ConfidenceThreshold[]> = {
  en: [
    {
      min: 0.9,
      max: 1.0,
      level: 'very high',
      description: 'Very high confidence',
      interpretation: 'The system is extremely certain about this decision. The result can be trusted with near-absolute certainty.',
      recommendation: 'No additional verification needed. This result can be used directly.',
    },
    {
      min: 0.75,
      max: 0.9,
      level: 'high',
      description: 'High confidence',
      interpretation: 'The system is very confident about this decision. The result is likely correct but there is a small margin of uncertainty.',
      recommendation: 'Consider using the result directly, but critical applications may benefit from a quick verification.',
    },
    {
      min: 0.6,
      max: 0.75,
      level: 'moderate',
      description: 'Moderate confidence',
      interpretation: 'The system has reasonable confidence in this decision, but there is meaningful uncertainty. The result may require human judgment.',
      recommendation: 'Review the result, especially for critical decisions. Consider the context and potential impact.',
    },
    {
      min: 0.4,
      max: 0.6,
      level: 'low',
      description: 'Low confidence',
      interpretation: 'The system has limited confidence in this decision. The result should be treated as a suggestion rather than a definitive answer.',
      recommendation: 'Manual review is recommended. Do not use this result for critical decisions without verification.',
    },
    {
      min: 0.0,
      max: 0.4,
      level: 'very low',
      description: 'Very low confidence',
      interpretation: 'The system has very little confidence in this decision. The result is unreliable and should not be used without significant validation.',
      recommendation: 'Manual review is required. Consider gathering more information or using alternative methods.',
    },
  ],
  es: [
    {
      min: 0.9,
      max: 1.0,
      level: 'muy alta',
      description: 'Confianza muy alta',
      interpretation: 'El sistema está extremadamente seguro de esta decisión. El resultado se puede confiar con casi total certeza.',
      recommendation: 'No se necesita verificación adicional. Este resultado se puede usar directamente.',
    },
    {
      min: 0.75,
      max: 0.9,
      level: 'alta',
      description: 'Alta confianza',
      interpretation: 'El sistema está muy seguro de esta decisión. El resultado probablemente sea correcto pero hay un pequeño margen de incertidumbre.',
      recommendation: 'Considere usar el resultado directamente, pero las aplicaciones críticas pueden beneficiarse de una verificación rápida.',
    },
    {
      min: 0.6,
      max: 0.75,
      level: 'moderada',
      description: 'Confianza moderada',
      interpretation: 'El sistema tiene una confianza razonable en esta decisión, pero hay una incertidumbre significativa. El resultado puede requerir juicio humano.',
      recommendation: 'Revise el resultado, especialmente para decisiones críticas. Considere el contexto y el impacto potencial.',
    },
    {
      min: 0.4,
      max: 0.6,
      level: 'baja',
      description: 'Baja confianza',
      interpretation: 'El sistema tiene una confianza limitada en esta decisión. El resultado debe tratarse como una sugerencia en lugar de una respuesta definitiva.',
      recommendation: 'Se recomienda una revisión manual. No use este resultado para decisiones críticas sin verificación.',
    },
    {
      min: 0.0,
      max: 0.4,
      level: 'muy baja',
      description: 'Confianza muy baja',
      interpretation: 'El sistema tiene muy poca confianza en esta decisión. El resultado no es fiable y no debe usarse sin una validación significativa.',
      recommendation: 'Se requiere revisión manual. Considere reunir más información o usar métodos alternativos.',
    },
  ],
  zh: [
    {
      min: 0.9,
      max: 1.0,
      level: '非常高',
      description: '非常高的置信度',
      interpretation: '系统对这个决策非常确定。结果几乎可以绝对信任。',
      recommendation: '无需额外验证。此结果可直接使用。',
    },
    {
      min: 0.75,
      max: 0.9,
      level: '高',
      description: '高置信度',
      interpretation: '系统对这个决策很有信心。结果很可能是正确的，但存在少量不确定性。',
      recommendation: '可以考虑直接使用结果，但关键应用可能需要快速验证。',
    },
    {
      min: 0.6,
      max: 0.75,
      level: '中等',
      description: '中等置信度',
      interpretation: '系统对这个决策有一定信心，但存在明显的不确定性。结果可能需要人工判断。',
      recommendation: '建议审查结果，特别是对于关键决策。考虑上下文和潜在影响。',
    },
    {
      min: 0.4,
      max: 0.6,
      level: '低',
      description: '低置信度',
      interpretation: '系统对这个决策信心有限。结果应被视为建议而非确定答案。',
      recommendation: '建议人工审查。不要在未经验证的情况下将此结果用于关键决策。',
    },
    {
      min: 0.0,
      max: 0.4,
      level: '非常低',
      description: '非常低的置信度',
      interpretation: '系统对这个决策几乎没有信心。结果不可靠，不应在未经重大验证的情况下使用。',
      recommendation: '需要人工审查。考虑收集更多信息或使用替代方法。',
    },
  ],
};

/**
 * Factor analysis templates for each language
 */
const FACTOR_TEMPLATES: Record<SupportedLanguage, Record<string, { positive: string; negative: string; neutral: string }>> = {
  en: {
    data_quality: {
      positive: 'The input data quality was high, contributing positively to confidence.',
      negative: 'Issues with input data quality reduced confidence in the result.',
      neutral: 'Input data quality was acceptable.',
    },
    pattern_match: {
      positive: 'The logic pattern matched well with known reliable patterns.',
      negative: 'The logic pattern deviated from typical reliable patterns.',
      neutral: 'The logic pattern was within expected parameters.',
    },
    historical_accuracy: {
      positive: 'Similar decisions in the past have been accurate.',
      negative: 'Similar decisions in the past have had lower accuracy.',
      neutral: 'Limited historical data available for comparison.',
    },
    context_clarity: {
      positive: 'The context was clear and unambiguous.',
      negative: 'The context had some ambiguities that affected certainty.',
      neutral: 'The context was moderately clear.',
    },
    constraint_satisfaction: {
      positive: 'All constraints were satisfied.',
      negative: 'Some constraints were not fully satisfied.',
      neutral: 'Most constraints were satisfied.',
    },
    evidence_strength: {
      positive: 'Strong supporting evidence was available.',
      negative: 'Limited or weak supporting evidence was available.',
      neutral: 'Adequate supporting evidence was available.',
    },
    alternative_overlap: {
      positive: 'The decision was clearly distinct from alternatives.',
      negative: 'Multiple alternatives had similar scores, reducing certainty.',
      neutral: 'The decision was reasonably distinct from alternatives.',
    },
  },
  es: {
    data_quality: {
      positive: 'La calidad de los datos de entrada fue alta, contribuyendo positivamente a la confianza.',
      negative: 'Problemas con la calidad de los datos de entrada redujeron la confianza en el resultado.',
      neutral: 'La calidad de los datos de entrada fue aceptable.',
    },
    pattern_match: {
      positive: 'El patrón lógico coincidió bien con patrones fiables conocidos.',
      negative: 'El patrón lógico se desvió de los patrones fiables típicos.',
      neutral: 'El patrón lógico estaba dentro de los parámetros esperados.',
    },
    historical_accuracy: {
      positive: 'Decisiones similares en el pasado han sido precisas.',
      negative: 'Decisiones similares en el pasado han tenido menor precisión.',
      neutral: 'Datos históricos limitados disponibles para comparación.',
    },
    context_clarity: {
      positive: 'El contexto era claro e inequívoco.',
      negative: 'El contexto tenía algunas ambigüedades que afectaron la certeza.',
      neutral: 'El contexto era moderadamente claro.',
    },
    constraint_satisfaction: {
      positive: 'Se satisficieron todas las restricciones.',
      negative: 'Algunas restricciones no se satisficieron completamente.',
      neutral: 'Se satisficieron la mayoría de las restricciones.',
    },
    evidence_strength: {
      positive: 'Había evidencia de apoyo sólida disponible.',
      negative: 'Evidencia de apoyo limitada o débil disponible.',
      neutral: 'Evidencia de apoyo adecuada disponible.',
    },
    alternative_overlap: {
      positive: 'La decisión fue claramente distinta de las alternativas.',
      negative: 'Múltiples alternativas tuvieron puntuaciones similares, reduciendo la certeza.',
      neutral: 'La decisión fue razonablemente distinta de las alternativas.',
    },
  },
  zh: {
    data_quality: {
      positive: '输入数据质量较高，对置信度有正面贡献。',
      negative: '输入数据质量问题降低了结果的置信度。',
      neutral: '输入数据质量可接受。',
    },
    pattern_match: {
      positive: '逻辑模式与已知的可靠模式匹配良好。',
      negative: '逻辑模式偏离了典型的可靠模式。',
      neutral: '逻辑模式在预期参数范围内。',
    },
    historical_accuracy: {
      positive: '过去的类似决策证明准确。',
      negative: '过去的类似决策准确性较低。',
      neutral: '可用于比较的历史数据有限。',
    },
    context_clarity: {
      positive: '上下文清晰明确。',
      negative: '上下文存在一些歧义，影响了确定性。',
      neutral: '上下文较为清晰。',
    },
    constraint_satisfaction: {
      positive: '所有约束条件都得到满足。',
      negative: '部分约束条件未完全满足。',
      neutral: '大多数约束条件得到满足。',
    },
    evidence_strength: {
      positive: '有强有力的支持证据。',
      negative: '支持证据有限或较弱。',
      neutral: '有足够的支持证据。',
    },
    alternative_overlap: {
      positive: '决策与备选方案明显区分。',
      negative: '多个备选方案得分相近，降低了确定性。',
      neutral: '决策与备选方案区分度合理。',
    },
  },
};

/**
 * ConfidenceExplainer class for explaining confidence scores
 */
export class ConfidenceExplainer {
  private language: SupportedLanguage;
  private thresholds: ConfidenceThreshold[];
  private factorTemplates: Record<string, { positive: string; negative: string; neutral: string }>;

  constructor(language: SupportedLanguage = 'en') {
    this.language = language;
    this.thresholds = CONFIDENCE_THRESHOLDS[language];
    this.factorTemplates = FACTOR_TEMPLATES[language];
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
    this.thresholds = CONFIDENCE_THRESHOLDS[language];
    this.factorTemplates = FACTOR_TEMPLATES[language];
  }

  /**
   * Explain a confidence score
   */
  explainConfidence(score: number, factors?: ConfidenceFactor[]): ConfidenceExplanation {
    const threshold = this.findThreshold(score);
    const percentage = Math.round(score * 100);

    return {
      rawScore: score,
      level: threshold.description,
      description: this.buildDescription(score, threshold),
      factors: factors ?? this.inferFactors(score),
      interpretation: this.buildInterpretation(score, threshold, percentage),
    };
  }

  /**
   * Get a quick level description for a score
   */
  getLevel(score: number): string {
    return this.findThreshold(score).description;
  }

  /**
   * Get recommendation for a score
   */
  getRecommendation(score: number): string {
    return this.findThreshold(score).recommendation;
  }

  /**
   * Compare two confidence scores
   */
  compareScores(score1: number, score2: number): string {
    const diff = score1 - score2;
    const percentageDiff = Math.abs(Math.round(diff * 100));

    if (Math.abs(diff) < 0.05) {
      return this.language === 'zh'
        ? `两个置信度相近（差异约 ${percentageDiff}%），决策依据相似`
        : this.language === 'es'
        ? `Ambas confianzas son similares (diferencia de ~${percentageDiff}%), la base de decisión es comparable`
        : `Both confidence levels are similar (~${percentageDiff}% difference), decision basis is comparable`;
    }

    if (diff > 0) {
      return this.language === 'zh'
        ? `第一个置信度高出 ${percentageDiff}%，结果更可靠`
        : this.language === 'es'
        ? `La primera confianza es ${percentageDiff}% más alta, el resultado es más fiable`
        : `The first confidence is ${percentageDiff}% higher, the result is more reliable`;
    }

    return this.language === 'zh'
      ? `第二个置信度高出 ${percentageDiff}%，结果更可靠`
      : this.language === 'es'
      ? `La segunda confianza es ${percentageDiff}% más alta, el resultado es más fiable`
      : `The second confidence is ${percentageDiff}% higher, the result is more reliable`;
  }

  /**
   * Explain multiple confidence factors
   */
  explainFactors(factors: ConfidenceFactor[]): string {
    const lines: string[] = [];
    const positive = factors.filter(f => f.impact === 'positive');
    const negative = factors.filter(f => f.impact === 'negative');
    const neutral = factors.filter(f => f.impact === 'neutral');

    if (positive.length > 0) {
      lines.push(this.language === 'zh'
        ? '正面因素：'
        : this.language === 'es'
        ? 'Factores positivos:'
        : 'Positive factors:');
      for (const f of positive) {
        lines.push(`  • ${f.name}: ${f.description}`);
      }
    }

    if (negative.length > 0) {
      lines.push(this.language === 'zh'
        ? '负面因素：'
        : this.language === 'es'
        ? 'Factores negativos:'
        : 'Negative factors:');
      for (const f of negative) {
        lines.push(`  • ${f.name}: ${f.description}`);
      }
    }

    if (neutral.length > 0) {
      lines.push(this.language === 'zh'
        ? '中性因素：'
        : this.language === 'es'
        ? 'Factores neutrales:'
        : 'Neutral factors:');
      for (const f of neutral) {
        lines.push(`  • ${f.name}: ${f.description}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate confidence breakdown
   */
  generateBreakdown(
    score: number,
    componentScores: Record<string, number>
  ): string {
    const lines: string[] = [];
    const threshold = this.findThreshold(score);
    const percentage = Math.round(score * 100);

    lines.push(this.language === 'zh'
      ? `# 置信度分析报告`
      : this.language === 'es'
      ? `# Informe de Análisis de Confianza`
      : `# Confidence Analysis Report`);
    lines.push('');

    lines.push(this.language === 'zh'
      ? `## 总体置信度：${threshold.description}（${percentage}%）`
      : this.language === 'es'
      ? `## Confianza General: ${threshold.description} (${percentage}%)`
      : `## Overall Confidence: ${threshold.description} (${percentage}%)`);
    lines.push('');

    lines.push(this.language === 'zh'
      ? '### 解读'
      : this.language === 'es'
      ? '### Interpretación'
      : '### Interpretation');
    lines.push(threshold.interpretation);
    lines.push('');

    lines.push(this.language === 'zh'
      ? '### 建议'
      : this.language === 'es'
      ? '### Recomendación'
      : '### Recommendation');
    lines.push(threshold.recommendation);
    lines.push('');

    if (Object.keys(componentScores).length > 0) {
      lines.push(this.language === 'zh'
        ? '### 组成部分分析'
        : this.language === 'es'
        ? '### Análisis de Componentes'
        : '### Component Analysis');
      lines.push('');

      for (const [name, componentScore] of Object.entries(componentScores)) {
        const componentPercentage = Math.round(componentScore * 100);
        const componentThreshold = this.findThreshold(componentScore);
        lines.push(`- **${name}**: ${componentPercentage}% (${componentThreshold.level})`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Find the appropriate threshold for a score
   */
  private findThreshold(score: number): ConfidenceThreshold {
    for (const threshold of this.thresholds) {
      if (score >= threshold.min && score <= threshold.max) {
        return threshold;
      }
    }
    return this.thresholds[this.thresholds.length - 1];
  }

  /**
   * Build description for a confidence score
   */
  private buildDescription(score: number, threshold: ConfidenceThreshold): string {
    const percentage = Math.round(score * 100);
    
    return this.language === 'zh'
      ? `置信度为 ${percentage}%，属于${threshold.description}。`
      : this.language === 'es'
      ? `La confianza es del ${percentage}%, considerada ${threshold.description}.`
      : `Confidence is at ${percentage}%, considered ${threshold.description}.`;
  }

  /**
   * Build interpretation for a confidence score
   */
  private buildInterpretation(
    score: number,
    threshold: ConfidenceThreshold,
    _percentage: number
  ): string {
    const lines: string[] = [];
    
    lines.push(threshold.interpretation);
    lines.push('');
    lines.push(threshold.recommendation);

    // Add specific guidance based on score range
    if (score >= 0.9) {
      lines.push('');
      lines.push(this.language === 'zh'
        ? '提示：此结果已达到最高置信度等级，可作为确定性参考。'
        : this.language === 'es'
        ? 'Nota: Este resultado ha alcanzado el nivel más alto de confianza, puede usarse como referencia definitiva.'
        : 'Note: This result has reached the highest confidence level and can be used as a definitive reference.');
    } else if (score < 0.5) {
      lines.push('');
      lines.push(this.language === 'zh'
        ? '警告：此结果置信度较低，可能存在错误或不完整。请谨慎使用。'
        : this.language === 'es'
        ? 'Advertencia: Este resultado tiene baja confianza, puede haber errores o estar incompleto. Úselo con precaución.'
        : 'Warning: This result has low confidence and may contain errors or be incomplete. Use with caution.');
    }

    return lines.join('\n');
  }

  /**
   * Infer factors from a confidence score
   */
  private inferFactors(score: number): ConfidenceFactor[] {
    const factors: ConfidenceFactor[] = [];

    // High confidence suggests strong evidence
    if (score >= 0.8) {
      factors.push({
        name: 'evidence_strength',
        description: this.factorTemplates.evidence_strength.positive,
        impact: 'positive',
        magnitude: 0.3,
      });
      factors.push({
        name: 'pattern_match',
        description: this.factorTemplates.pattern_match.positive,
        impact: 'positive',
        magnitude: 0.25,
      });
    }
    // Moderate confidence
    else if (score >= 0.5) {
      factors.push({
        name: 'context_clarity',
        description: this.factorTemplates.context_clarity.neutral,
        impact: 'neutral',
        magnitude: 0.1,
      });
      factors.push({
        name: 'constraint_satisfaction',
        description: this.factorTemplates.constraint_satisfaction.neutral,
        impact: 'neutral',
        magnitude: 0.1,
      });
    }
    // Low confidence
    else {
      factors.push({
        name: 'data_quality',
        description: this.factorTemplates.data_quality.negative,
        impact: 'negative',
        magnitude: 0.3,
      });
      factors.push({
        name: 'alternative_overlap',
        description: this.factorTemplates.alternative_overlap.negative,
        impact: 'negative',
        magnitude: 0.25,
      });
    }

    return factors;
  }

  /**
   * Create a factor description
   */
  createFactor(
    factorType: string,
    impact: 'positive' | 'negative' | 'neutral',
    magnitude: number,
    customDescription?: string
  ): ConfidenceFactor {
    const templates = this.factorTemplates[factorType] ?? {
      positive: `Factor ${factorType} had a positive effect.`,
      negative: `Factor ${factorType} had a negative effect.`,
      neutral: `Factor ${factorType} had a neutral effect.`,
    };

    return {
      name: factorType,
      description: customDescription ?? templates[impact],
      impact,
      magnitude: Math.max(0, Math.min(1, magnitude)),
    };
  }

  /**
   * Aggregate multiple confidence scores
   */
  aggregateScores(scores: number[], method: 'average' | 'min' | 'max' | 'weighted' = 'average'): number {
    if (scores.length === 0) return 0;

    switch (method) {
      case 'average':
        return scores.reduce((a, b) => a + b, 0) / scores.length;
      case 'min':
        return Math.min(...scores);
      case 'max':
        return Math.max(...scores);
      case 'weighted':
        // Weight recent scores higher
        const weights = scores.map((_, i) => i + 1);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        return scores.reduce((sum, score, i) => sum + score * weights[i], 0) / totalWeight;
      default:
        return scores[0];
    }
  }

  /**
   * Explain why a score changed
   */
  explainScoreChange(oldScore: number, newScore: number, reason: string): string {
    const diff = newScore - oldScore;
    const percentageDiff = Math.abs(Math.round(diff * 100));
    const direction = diff > 0;

    const directionText = direction
      ? (this.language === 'zh' ? '提高' : this.language === 'es' ? 'aumentó' : 'increased')
      : (this.language === 'zh' ? '降低' : this.language === 'es' ? 'disminuyó' : 'decreased');

    const reasonText = this.language === 'zh'
      ? `原因是：${reason}`
      : this.language === 'es'
      ? `La razón fue: ${reason}`
      : `The reason was: ${reason}`;

    return this.language === 'zh'
      ? `置信度${directionText}了 ${percentageDiff}%，从 ${Math.round(oldScore * 100)}% 变为 ${Math.round(newScore * 100)}%。${reasonText}`
      : this.language === 'es'
      ? `La confianza ${directionText} un ${percentageDiff}%, de ${Math.round(oldScore * 100)}% a ${Math.round(newScore * 100)}%. ${reasonText}`
      : `Confidence ${directionText} by ${percentageDiff}%, from ${Math.round(oldScore * 100)}% to ${Math.round(newScore * 100)}%. ${reasonText}`;
  }
}

export default ConfidenceExplainer;
