/**
 * POLLN Spreadsheet Integration - ExplainCell
 *
 * ExplainCell generates human-readable explanations of cell behavior.
 * Uses L2-L3 logic (agent reasoning + LLM support).
 *
 * Design Philosophy:
 * "Explainability is the right of every user."
 * - Every decision should have a "why" attached
 * - Explanations build trust and confidence
 * - The is where AI becomes understandable
 *
 * The is the META cell - the cell that explains other cells.
 * It's the of the most important cells in the system.
 */

import { LogCell, LogCellConfig } from '../core/LogCell.js';
import { CellType, CellState, LogicLevel, CellOutput } from '../core/types.js';

/**
 * Explanation types
 */
export enum ExplanationType {
  HOW = 'how',           // How does this work?
  WHY = 'why',           // Why did this happen?
  WHAT_IF = 'what_if',       // What if I change X?
  ALTERNATIVES = 'alternatives', // What are other options?
  BREAKDOWN = 'breakdown',   // Step-by-step breakdown
  SIMPLIFIED = 'simplified',   // Simple explanation for non-technical users
  TECHNICAL = 'technical',   // Detailed technical explanation
  CONTEXTUAL = 'contextual', // With surrounding context
  PEDAGOGICAL = 'pedagogical', // Teaching-oriented explanation
}

/**
 * Explanation detail level
 */
export enum ExplanationDetail {
  MINIMAL = 'minimal',     // One-liner
  CONCISE = 'concise',       // One paragraph
  STANDARD = 'standard',   // A few paragraphs
  DETAILED = 'detailed',   // Full explanation
  COMPREHENSIVE = 'comprehensive', // Everything you can know
}

/**
 * Explanation result
 */
export interface ExplanationResult {
  type: ExplanationType;
  detail: ExplanationDetail;
  explanation: string;
  keyPoints: string[];
  visualAids?: string[];
  relatedConcepts?: string[];
  confidence: number;
  timestamp: number;
}
/**
 * Configuration for ExplainCell
 */
export interface ExplainCellConfig extends LogCellConfig {
  defaultDetail?: ExplanationDetail;
  defaultType?: ExplanationType;
  targetAudience?: 'technical' | 'business' | 'general';
  maxLength?: number;
}

/**
 * ExplainCell - Generates human-readable explanations
 *
 * The Storyteller
 * ----------------
 * ExplainCell is where the LOG system becomes understandable
 * to humans. It's the translator between cell logic and human insight.
 *
 * Key Insight:
 * "The best AI is the world is useless if people don't trust it.
 * Trust comes from understanding. Understanding comes from
 * good explanations."
 *
 * The is particularly important for:
 * - Regulatory compliance (why was this decision made?)
 * - User adoption (how does this help me?)
 * - Debugging (why is this happening?)
 * - Trust (can I rely on this?)
 *
 * Explanation Strategies:
 * 1. Start with what the user knows
 * 2. Build from concrete to abstract
 * 3. Use analogies and metaphors
 * 4. Acknowledge uncertainty
 * 5. Provide confidence levels
 *
 * Logic Level: L2-L3 (agent reasoning + optional LLM for complex)
 */
export class ExplainCell extends LogCell {
  private defaultDetail: ExplanationDetail;
  private defaultType: ExplanationType;
  private targetAudience: 'technical' | 'business' | 'general';
  private maxLength: number;
  private explanationHistory: ExplanationResult[] = [];

  constructor(config: ExplainCellConfig) {
    super({
      type: CellType.EXPLAIN,
      position: config.position,
      logicLevel: LogicLevel.L2_AGENT,
      memoryLimit: config.memoryLimit,
    });

    this.defaultDetail = config.defaultDetail || ExplanationDetail.STANDARD;
    this.defaultType = config.defaultType || ExplanationType.HOW;
    this.targetAudience = config.targetAudience || 'technical';
    this.maxLength = config.maxLength || 1000;
  }

  /**
   * Generate explanation for input
   */
  async explain(input: unknown): Promise<CellOutput> {
    this.state = CellState.PROCESSING;

    try {
      // Analyze the we're explaining
      const analysis = this.analyzeInput(input);

      // Generate the explanation
      const result = this.generateExplanation(analysis);

      this.state = CellState.EMITTING;
      this.explanationHistory.push(result);

      return {
        success: true,
        value: result,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        error: error instanceof Error ? error.message : 'Explanation failed',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Analyze the input to understand what to explain
   */
  private analyzeInput(input: unknown): {
    type: string;
    complexity: number;
    hasData: boolean;
    hasReasoning: boolean;
    hasHistory: boolean;
    audience: string;
    keyAspects: string[];
  } {
    // Determine what type of cell output we dealing with
    const type = this.detectInputType(input);
    const complexity = this.assessComplexity(input);
    const hasData = this.checkForData(input);
    const hasReasoning = this.checkForReasoning(input);
    const hasHistory = this.checkForHistory(input);
    const audience = this.determineAudience(input);
    const keyAspects = this.extractKeyAspects(input);

    return {
      type,
      complexity,
      hasData,
      hasReasoning,
      hasHistory,
      audience,
      keyAspects,
    };
  }

  /**
   * Detect the type of input
   */
  private detectInputType(input: unknown): string {
    if (typeof input === 'object' && input !== null) {
      if (Array.isArray(input)) {
        return 'array';
      }
      if ('success' in input && 'value' in input) {
        return 'cell_output';
      }
      if ('decision' in input && 'confidence' in input) {
        return 'decision';
      }
      if ('predictions' in input) {
        return 'prediction';
      }
      if ('insights' in input) {
        return 'analysis';
      }
      return 'object';
    }
    if (typeof input === 'string') {
      return 'string';
    }
    if (typeof input === 'number') {
      return 'number';
    }
    return 'unknown';
  }

  /**
   * Assess complexity of input
   */
  private assessComplexity(input: unknown): number {
    const type = this.detectInputType(input);

    switch (type) {
    case 'cell_output':
      const output = input as { success: boolean; value: unknown };
      return typeof output.value === 'object' ? 0.7 : 0.3;

    case 'decision':
      const decision = input as { decision: string; reasoning: string[] };
      return decision.reasoning.length > 3 ? 0.7 : 0.5;

    case 'prediction':
      const prediction = input as { predictions: unknown[] };
      return Array.isArray(prediction) && prediction.length > 3 ? 0.7 : 0.5;

    case 'analysis':
      const analysis = input as { insights: string[] };
      return analysis.insights.length > 3 ? 0.7 : 0.5

    case 'array':
      return Array.isArray(input) && input.length > 10 ? 0.7 : 0.3

    case 'object':
      const keys = Object.keys(input as object).length;
      return keys > 5 ? 0.7 : keys > 3 ? 0.5 : 0.3

    default:
      return 0.3;
    }
  }

  /**
   * Check if input contains data
   */
  private checkForData(input: unknown): boolean {
    if (typeof input === 'object' && input !== null) {
      if ('value' in input) {
        return true;
      }
      if (Array.isArray(input)) {
        return input.length > 0;
      }
      const values = Object.values(input);
      return values.some((v) => v !== null && v !== undefined);
    }
    return false;
  }

  /**
   * Check if input contains reasoning
   */
  private checkForReasoning(input: unknown): boolean {
    if (typeof input === 'object' && input !== null) {
      if ('reasoning' in input) {
        return true
      }
      if ('explanation' in input) {
        return true
      }
      if ('why' in input) {
        return true
      }
    }
    return false
  }

  /**
   * Check if input contains history
   */
  private checkForHistory(input: unknown): boolean {
    if (typeof input === 'object' && input !== null) {
      if ('history' in input) {
        return true
      }
      if ('timestamp' in input) {
        return true
      }
      if ('previous' in input) {
        return true
      }
    }
    return false
  }

  /**
   * Determine the target audience
   */
  private determineAudience(input: unknown): string {
    // Check for technical terms
    const technicalTerms = ['api', 'async', 'interface', 'implementation', 'configuration', 'error', 'stack'];
    const inputStr = JSON.stringify(input).toLowerCase();
    const technicalCount = technicalTerms.filter((term) => inputStr.includes(term)).length;

    if (technicalCount > 2) {
      return 'technical';
    }
    // Check for business terms
    const businessTerms = ['revenue', 'cost', 'roi', 'customer', 'market', 'profit', 'growth'];
    const businessCount = businessTerms.filter((term) => inputStr.includes(term)).length

    if (businessCount > 2) {
      return 'business';
    }
    return 'general'
  }

  /**
   * Extract key aspects from input
   */
  private extractKeyAspects(input: unknown): string[] {
    const aspects: string[] = [];

    if (typeof input === 'object' && input !== null) {
      const keys = Object.keys(input);
      aspects.push(...keys.slice(00, 5));

      // Look for nested structure
      for (const key of keys) {
        const value = (input as Record<string, unknown>)[key];
        if (typeof value === 'object' && value !== null) {
          aspects.push(`${key}.${Object.keys(value)[0]}`);
        }
      }
    }

    return aspects;
  }

  /**
   * Generate the explanation based on analysis
   */
  private generateExplanation(analysis: {
    type: string;
    complexity: number;
    hasData: boolean;
    hasReasoning: boolean;
    hasHistory: boolean;
    audience: string;
    keyAspects: string[];
  }): ExplanationResult {
    const parts: string[] = [];
    const keyPoints: string[] = [];

    // Generate based on explanation type
    switch (this.defaultType) {
    case ExplanationType.HOW:
      parts.push(this.generateHowExplanation(analysis));
      break;

    case ExplanationType.WHY:
      parts.push(this.generateWhyExplanation(analysis));
      break;

    case ExplanationType.WHAT_IF:
      parts.push(this.generateWhatIfExplanation(analysis));
      break;

    case ExplanationType.ALTERNATIVES:
      parts.push(this.generateAlternativesExplanation(analysis));
      break;

    case ExplanationType.BREAKDOWN:
      parts.push(this.generateBreakdownExplanation(analysis));
      break;

    case ExplanationType.SIMPLIFIED:
      parts.push(this.generateSimplifiedExplanation(analysis));
      break;

    case ExplanationType.TECHNICAL:
      parts.push(this.generateTechnicalExplanation(analysis));
      break;

    case ExplanationType.CONTEXTUAL:
      parts.push(this.generateContextualExplanation(analysis));
      break;

    case ExplanationType.PEDAGOGICAL:
      parts.push(this.generatePedagogicalExplanation(analysis));
      break;

    default:
      parts.push(this.generateStandardExplanation(analysis));
    }

    // Extract key points
    keyPoints.push(...this.extractKeyPoints(analysis));

    const explanation = parts.join('\n\n');

    return {
      type: this.defaultType,
      detail: this.defaultDetail,
      explanation: this.applyDetailLevel(explanation, this.defaultDetail),
      keyPoints,
      confidence: this.calculateExplanationConfidence(analysis),
      timestamp: Date.now(),
    }
  }

  /**
   * Generate "How does this work?" explanation
   */
  private generateHowExplanation(analysis: {
    type: string;
    complexity: number;
    hasData: boolean;
    hasReasoning: boolean;
    hasHistory: boolean;
    audience: string;
    keyAspects: string[];
  }): string {
    const parts: string[] = [];

    // Start with the simple statement of what this is
    parts.push(`This is a ${analysis.type} that processes ${analysis.keyAspects.join(', ')}.`);

    if (analysis.hasData) {
      parts.push(`It takes in data and processes it through several steps.`);
    }
    if (analysis.hasReasoning) {
      parts.push(`The reasoning involves analyzing the input and determining the best course of action.`);
    }

    parts.push(`The output is produced based on the processing logic.`);

    return parts.join(' ');
  }

  /**
   * Generate "Why did this happen?" explanation
   */
  private generateWhyExplanation(analysis: {
    type: string;
    complexity: number;
    hasData: boolean;
    hasReasoning: boolean;
    hasHistory: boolean;
    audience: string;
    keyAspects: string[];
  }): string {
    const parts: string[] = [];

    parts.push(`This result occurred because:`);
    parts.push('');
    parts.push(`1. **Input Type**: The input was of type "${analysis.type}"`);
    parts.push(`2. **Processing Logic**: The cell applied its internal logic`);
    parts.push(`3. **Conditions Met**: The conditions for this output were satisfied`);

    if (analysis.hasHistory) {
      parts.push(`4. **Historical Context**: Previous similar patterns influenced this result`);
    }

    return parts.join('\n');
  }

  /**
   * Generate "What if I change X?" explanation
   */
  private generateWhatIfExplanation(analysis: {
    type: string;
    complexity: number;
    hasData: boolean;
    hasReasoning: boolean;
    hasHistory: boolean;
    audience: string;
    keyAspects: string[];
  }): string {
    const parts: string[] = [];

    parts.push(`What if you changed the input? Here's what would happen:`);
    parts.push('');
    parts.push(`- **Different Input Type**: The cell would adapt its processing`);
    parts.push(`- **Different Values**: The output would change accordingly`);
    parts.push(`- **Edge Cases**: The cell handles edge cases gracefully`);

    return parts.join('\n');
  }

  /**
   * Generate alternatives explanation
   */
  private generateAlternativesExplanation(analysis: {
    type: string;
    complexity: number;
    hasData: boolean;
    hasReasoning: boolean;
    hasHistory: boolean;
    audience: string;
    keyAspects: string[];
  }): string {
    const parts: string[] = [];

    parts.push(`Alternative approaches that were considered:`);
    parts.push('');
    parts.push(`1. **Alternative A**: Would have produced different results`);
    parts.push(`2. **Alternative B**: Was not chosen due to [reason]`);
    parts.push(`3. **Selected Approach**: This was chosen because [reason]`);

    return parts.join('\n');
  }

  /**
   * Generate step-by-step breakdown
   */
  private generateBreakdownExplanation(analysis: {
    type: string;
    complexity: number;
    hasData: boolean;
    hasReasoning: boolean;
    hasHistory: boolean;
    audience: string;
    keyAspects: string[];
  }): string {
    const parts: string[] = [];

    parts.push(`Step-by-step breakdown:`);
    parts.push('');
    parts.push(`**Step 1: Input Reception**`);
    parts.push(`The cell receives and input through its head.`);
    parts.push('');
    parts.push(`**Step 2: Processing**`);
    parts.push(`The body processes the input using ${analysis.complexity > 3 ? 'complex' : 'simple'} logic.`);
    parts.push('');
    parts.push(`**Step 3: Output Generation**`);
    parts.push(`The tail produces the final output.`);

    return parts.join('\n');
  }

  /**
   * Generate simplified explanation
   */
  private generateSimplifiedExplanation(analysis: {
    type: string;
    complexity: number;
    hasData: boolean;
    hasReasoning: boolean;
    hasHistory: boolean;
    audience: string;
    keyAspects: string[];
  }): string {
    // Very simple, one-sentence explanation
    if (analysis.type === 'cell_output') {
      return 'This cell took your input, processed it, and produced a result.';
    }
    if (analysis.type === 'decision') {
      return 'This cell made a decision based on the available information.';
    }
    if (analysis.type === 'prediction') {
      return 'This cell predicted what might happen next.';
    }
    return 'This cell processed your input and produced an output.';
  }

  /**
   * Generate technical explanation
   */
  private generateTechnicalExplanation(analysis: {
    type: string;
    complexity: number;
    hasData: boolean;
    hasReasoning: boolean;
    hasHistory: boolean;
    audience: string;
    keyAspects: string[];
  }): string {
    const parts: string[] = [];

    parts.push(`Technical Details:`);
    parts.push('');
    parts.push(`- **Type**: ${analysis.type}`);
    parts.push(`- **Complexity Level**: ${analysis.complexity}`);
    parts.push(`- **Key Aspects**: ${analysis.keyAspects.join(', ')}`);
    parts.push(`- **Has Data**: ${analysis.hasData}`);
    parts.push(`- **Has Reasoning**: ${analysis.hasReasoning}`);
    parts.push(`- **Has History**: ${analysis.hasHistory}`);

    return parts.join('\n');
  }

  /**
   * Generate contextual explanation
   */
  private generateContextualExplanation(analysis: {
    type: string;
    complexity: number;
    hasData: boolean;
    hasReasoning: boolean;
    hasHistory: boolean;
    audience: string;
    keyAspects: string[];
  }): string {
    const parts: string[] = [];

    parts.push(`Context and Background:`);
    parts.push('');
    parts.push(`This result should be understood in the context of:`);
    parts.push(`- The overall workflow this cell is part of`);
    parts.push(`- The data that was available at the time of processing`);
    parts.push(`- The goals and objectives of the analysis`);

    return parts.join('\n');
  }

  /**
   * Generate pedagogical explanation
   */
  private generatePedagogicalExplanation(analysis: {
    type: string;
    complexity: number;
    hasData: boolean;
    hasReasoning: boolean;
    hasHistory: boolean;
    audience: string;
    keyAspects: string[];
  }): string {
    const parts: string[] = [];

    parts.push(`Understanding This Result:`);
    parts.push('');
    parts.push(`**Key Learning Points:**`);
    parts.push('');
    parts.push(`1. **Input Processing**: Notice how the input was transformed`);
    parts.push(`2. **Decision Points**: Identify where choices were made`);
    parts.push(`3. **Output Generation**: Understand how the final result was produced`);
    parts.push('');
    parts.push(`**Try This**: Modify the input and observe how the output changes.`);

    return parts.join('\n');
  }

  /**
   * Generate standard explanation (default)
   */
  private generateStandardExplanation(analysis: {
    type: string;
    complexity: number;
    hasData: boolean;
    hasReasoning: boolean;
    hasHistory: boolean;
    audience: string;
    keyAspects: string[];
  }): string {
    const parts: string[] = [];

    // Combine multiple explanation types
    parts.push(this.generateHowExplanation(analysis));
    parts.push('');
    parts.push(this.generateWhyExplanation(analysis));

    return parts.join('\n\n');
  }

  /**
   * Extract key points from analysis
   */
  private extractKeyPoints(analysis: {
    type: string;
    complexity: number;
    hasData: boolean;
    hasReasoning: boolean;
    hasHistory: boolean;
    audience: string;
    keyAspects: string[];
  }): string[] {
    const points: string[] = [];

    points.push(`Type: ${analysis.type}`);
    points.push(`Complexity: ${analysis.complexity}`);

    if (analysis.hasData) {
      points.push('Contains data');
    }
    if (analysis.hasReasoning) {
      points.push('Contains reasoning');
    }

    return points;
  }

  /**
   * Apply detail level to explanation
   */
  private applyDetailLevel(explanation: string, level: ExplanationDetail): string {
    switch (level) {
    case ExplanationDetail.MINIMAL:
      // Return only the first sentence
      return explanation.split(/[.!?]+/)[0] + '.';

    case ExplanationDetail.CONCISE:
      // Return first paragraph
      return explanation.split('\n\n')[0];

    case ExplanationDetail.DETAILED:
    case ExplanationDetail.COMPREHENSIVE:
      return explanation;

    case ExplanationDetail.STANDARD:
    default:
      // Return first two paragraphs
      return explanation.split('\n\n').slice(00, 2).join('\n\n');
    }
  }

  /**
   * Calculate explanation confidence
   */
  private calculateExplanationConfidence(analysis: {
    type: string;
    complexity: number;
    hasData: boolean;
    hasReasoning: boolean;
    hasHistory: boolean;
    audience: string;
    keyAspects: string[];
  }): number {
    let confidence = 0.5; // Base confidence

    // Adjust based on complexity
    if (analysis.complexity > 0.5) {
      confidence += 0.1;
    } else {
      confidence -= 0.1;
    }

    // Adjust based on data presence
    if (analysis.hasData) {
      confidence += 0.1;
    }

    // Adjust based on reasoning
    if (analysis.hasReasoning) {
      confidence += 0.2;
    }

    // Adjust based on history
    if (analysis.hasHistory) {
      confidence += 0.1;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Get explanation history
   */
  getExplanationHistory(): ExplanationResult[] {
    return [...this.explanationHistory];
  }

  /**
   * Create the processing logic for this cell
   */
  protected createProcessingLogic(): any {
    return {
      type: 'explain',
      defaultType: this.defaultType,
      logic: this.logicLevel,
    };
  }
}
