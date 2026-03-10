/**
 * Natural Language Parser for POLLN Spreadsheets
 *
 * Main entry point for natural language to formula conversion.
 * Coordinates intent recognition, entity extraction, and formula generation.
 */

import { IntentRecognizer } from './IntentRecognizer.js';
import { EntityExtractor } from './EntityExtractor.js';
import { FormulaGenerator } from './FormulaGenerator.js';
import { NLPEngine } from './NLPEngine.js';
import { ContextManager } from './ContextManager.js';
import type {
  SpreadsheetIntent,
  Entity,
  ParsedFormula,
  NLParseResult,
  NLPEngineConfig,
  SpreadsheetContext,
  Suggestion,
  ClarificationQuestion,
} from './types.js';

/**
 * Main parser for natural language spreadsheet queries
 */
export class NLParser {
  private intentRecognizer: IntentRecognizer;
  private entityExtractor: EntityExtractor;
  private formulaGenerator: FormulaGenerator;
  private nlpEngine: NLPEngine;
  private contextManager: ContextManager;
  private useLLM: boolean;

  constructor(config?: NLPEngineConfig) {
    this.intentRecognizer = new IntentRecognizer();
    this.entityExtractor = new EntityExtractor();
    this.formulaGenerator = new FormulaGenerator();
    this.nlpEngine = new NLPEngine(config || { provider: 'mock' });
    this.contextManager = new ContextManager();
    this.useLLM = !!config?.apiKey;
  }

  /**
   * Parse natural language to formula
   */
  async parseToFormula(text: string, sheetName?: string): Promise<ParsedFormula> {
    // Extract entities
    const entities = this.entityExtractor.extractEntities(text);
    const resolvedEntities = this.entityExtractor.resolveAmbiguities(entities);

    // Detect intent
    const intent = this.intentRecognizer.detectIntent(text, resolvedEntities);

    // Get relevant context
    let context: SpreadsheetContext | undefined;
    let relevantCorrections: any[] = [];

    if (sheetName) {
      const relevantContext = this.contextManager.getRelevantContext(sheetName, text);
      context = relevantContext.context;
      relevantCorrections = relevantContext.relevantCorrections;

      // Check for error corrections
      const corrected = this.contextManager.applyErrorCorrection('', text);
      if (corrected) {
        return {
          formula: corrected,
          explanation: 'Corrected based on previous feedback',
          intent,
          entities: resolvedEntities,
          complexity: 1,
          warnings: [],
        };
      }
    }

    // Generate formula
    let parsedFormula: ParsedFormula;

    if (this.useLLM && intent.confidence < 0.7) {
      // Use LLM for low confidence predictions
      try {
        parsedFormula = await this.nlpEngine.generateFormula(text, context);
      } catch (error) {
        // Fallback to rule-based generation
        parsedFormula = this.formulaGenerator.generateFromIntent(intent, resolvedEntities);
      }
    } else {
      // Use rule-based generation
      parsedFormula = this.formulaGenerator.generateFromIntent(intent, resolvedEntities);
    }

    // Apply optimization
    parsedFormula.formula = this.formulaGenerator.optimizeFormula(parsedFormula.formula);

    // Add to conversation history
    if (sheetName) {
      this.contextManager.addConversationEntry(sheetName, text, parsedFormula);
    }

    return parsedFormula;
  }

  /**
   * Parse with clarification for ambiguous requests
   */
  async parseWithClarification(text: string, sheetName?: string): Promise<NLParseResult> {
    // Extract entities
    const entities = this.entityExtractor.extractEntities(text);
    const resolvedEntities = this.entityExtractor.resolveAmbiguities(entities);

    // Detect intent
    const intent = this.intentRecognizer.detectIntent(text, resolvedEntities);

    // Check if clarification is needed
    const needsClarification = this.shouldClarify(text, intent, resolvedEntities);

    if (needsClarification) {
      return {
        formula: {
          formula: '',
          explanation: 'Clarification needed',
          intent,
          entities: resolvedEntities,
          complexity: 0,
          warnings: ['Ambiguous request'],
        },
        needsClarification: true,
        clarificationQuestions: this.generateClarificationQuestions(text, resolvedEntities),
      };
    }

    // Generate formula
    const formula = await this.parseToFormula(text, sheetName);

    // Get alternatives
    const alternativeIntents = this.intentRecognizer.getAlternativeIntents(text, resolvedEntities);
    const alternatives = alternativeIntents.map(altIntent =>
      this.formulaGenerator.generateFromIntent(altIntent, resolvedEntities)
    );

    return {
      formula,
      needsClarification: false,
      alternatives: alternatives.slice(0, 3),
    };
  }

  /**
   * Explain formula in natural language
   */
  async explainFormula(formula: string, sheetName?: string): Promise<string> {
    let context: SpreadsheetContext | undefined;

    if (sheetName) {
      context = this.contextManager.getContext(sheetName);
    }

    if (this.useLLM) {
      try {
        return await this.nlpEngine.explainFormula(formula, context);
      } catch (error) {
        // Fallback to simple explanation
        return this.generateSimpleExplanation(formula);
      }
    }

    return this.generateSimpleExplanation(formula);
  }

  /**
   * Detect intent from text
   */
  detectIntent(text: string): SpreadsheetIntent {
    const entities = this.entityExtractor.extractEntities(text);
    return this.intentRecognizer.detectIntent(text, entities);
  }

  /**
   * Extract entities from text
   */
  extractEntities(text: string): Entity[] {
    const entities = this.entityExtractor.extractEntities(text);
    return this.entityExtractor.resolveAmbiguities(entities);
  }

  /**
   * Suggest completions for partial input
   */
  suggestCompletion(partial: string): Suggestion[] {
    return this.formulaGenerator.suggestCompletion(partial);
  }

  /**
   * Provide feedback on a result
   */
  provideFeedback(
    sheetName: string,
    input: string,
    feedback: 'positive' | 'negative' | 'neutral',
    timestamp?: Date
  ): void {
    const history = this.contextManager.getConversationHistory(sheetName);
    const entry = history.find(e => e.input === input);

    if (entry) {
      this.contextManager.addFeedback(
        sheetName,
        timestamp || entry.timestamp,
        feedback
      );
    }
  }

  /**
   * Provide correction for a result
   */
  provideCorrection(
    sheetName: string,
    input: string,
    correction: string,
    timestamp?: Date
  ): void {
    const history = this.contextManager.getConversationHistory(sheetName);
    const entry = history.find(e => e.input === input);

    if (entry) {
      this.contextManager.addCorrection(
        sheetName,
        timestamp || entry.timestamp,
        correction
      );
    }
  }

  /**
   * Update spreadsheet context
   */
  updateContext(sheetName: string, context: Partial<SpreadsheetContext>): void {
    this.contextManager.setContext(sheetName, context);
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Partial<{
    dateFormat: string;
    numberFormat: string;
    useR1C1: boolean;
    useTableReferences: boolean;
    defaultAggregation: 'SUM' | 'AVERAGE' | 'COUNT' | 'MAX' | 'MIN';
  }>): void {
    this.contextManager.updatePreferences(preferences);
  }

  /**
   * Get cost tracking information
   */
  getCostTracking() {
    return this.nlpEngine.getCostTracking();
  }

  /**
   * Clear NLP engine cache
   */
  clearCache(): void {
    this.nlpEngine.clearCache();
  }

  /**
   * Check if clarification is needed
   */
  private shouldClarify(text: string, intent: SpreadsheetIntent, entities: Entity[]): boolean {
    // Low confidence intent
    if (intent.confidence < 0.5) {
      return true;
    }

    // No entities found but intent requires them
    if (['create_formula', 'analyze', 'aggregate'].includes(intent.type) && entities.length === 0) {
      return true;
    }

    // Ambiguous cell references
    const cellEntities = entities.filter(e => e.type === 'cell' || e.type === 'range');
    if (cellEntities.length === 0 && /[A-Z]\d+/i.test(text)) {
      return true;
    }

    return false;
  }

  /**
   * Generate clarification questions
   */
  private generateClarificationQuestions(text: string, entities: Entity[]): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    // Ask about cell references if missing
    if (!entities.some(e => e.type === 'cell' || e.type === 'range')) {
      questions.push({
        question: 'Which cells or range should be used?',
        options: ['Current selection', 'Entire column', 'Entire row', 'Specific range'],
        resolutions: {
          'Current selection': { type: 'range', text: 'SELECTION', resolved: {} },
          'Entire column': { type: 'range', text: 'A:A', resolved: {} },
          'Entire row': { type: 'range', text: '1:1', resolved: {} },
          'Specific range': { type: 'range', text: 'A1:Z100', resolved: {} },
        },
      });
    }

    // Ask about operation if ambiguous
    if (!entities.some(e => e.type === 'operation')) {
      questions.push({
        question: 'What operation should be performed?',
        options: ['Sum', 'Average', 'Count', 'Max', 'Min'],
        resolutions: {
          'Sum': { type: 'operation', text: 'SUM', resolved: {} },
          'Average': { type: 'operation', text: 'AVERAGE', resolved: {} },
          'Count': { type: 'operation', text: 'COUNT', resolved: {} },
          'Max': { type: 'operation', text: 'MAX', resolved: {} },
          'Min': { type: 'operation', text: 'MIN', resolved: {} },
        },
      });
    }

    return questions;
  }

  /**
   * Generate simple formula explanation
   */
  private generateSimpleExplanation(formula: string): string {
    const functionMatch = formula.match(/=([A-Z][A-Z0-9_]+)\(([^)]*)\)/);

    if (functionMatch) {
      const funcName = functionMatch[1];
      const params = functionMatch[2];

      const explanations: Record<string, string> = {
        'SUM': 'Adds all the numbers in the specified range',
        'AVERAGE': 'Calculates the arithmetic mean of the values',
        'COUNT': 'Counts how many numbers are in the range',
        'MAX': 'Finds the largest value in the range',
        'MIN': 'Finds the smallest value in the range',
        'IF': 'Tests a condition and returns one value if true, another if false',
        'VLOOKUP': 'Looks up a value in a table and returns a value from another column',
        'CONCATENATE': 'Joins text strings together',
      };

      return explanations[funcName] || `Uses the ${funcName} function with parameters: ${params}`;
    }

    return 'A formula that performs calculations on the specified cells';
  }

  /**
   * Export state for persistence
   */
  exportState() {
    return this.contextManager.exportState();
  }

  /**
   * Import state from persistence
   */
  importState(state: any): void {
    this.contextManager.importState(state);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return this.contextManager.getStatistics();
  }

  /**
   * Add custom intent pattern
   */
  addCustomPattern(intentType: SpreadsheetIntent['type'], pattern: RegExp): void {
    this.intentRecognizer.addCustomPattern(intentType, pattern);
  }

  /**
   * Get available functions
   */
  getAvailableFunctions(): string[] {
    return this.formulaGenerator.getAllFunctions();
  }

  /**
   * Get functions by category
   */
  getFunctionsByCategory(category: string): any[] {
    return this.formulaGenerator.getFunctionsByCategory(category);
  }
}
