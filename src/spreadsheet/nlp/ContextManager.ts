/**
 * Context Manager for Natural Language Spreadsheet Queries
 *
 * Maintains spreadsheet context, conversation history, and learns
 * from user corrections and preferences.
 */

import type {
  SpreadsheetContext,
  ConversationEntry,
  ErrorCorrection,
  UserPreferences,
  ParsedFormula,
} from './types.js';

/**
 * Manages spreadsheet context for NLP understanding
 */
export class ContextManager {
  private contexts: Map<string, SpreadsheetContext> = new Map();
  private conversationHistory: Map<string, ConversationEntry[]> = new Map();
  private errorCorrections: Map<string, ErrorCorrection[]> = new Map();
  private userPreferences: UserPreferences;

  constructor() {
    this.userPreferences = this.getDefaultPreferences();
  }

  /**
   * Get default user preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      dateFormat: 'MM/DD/YYYY',
      numberFormat: '#,##0.00',
      useR1C1: false,
      useTableReferences: true,
      defaultAggregation: 'SUM',
    };
  }

  /**
   * Set or update spreadsheet context
   */
  setContext(sheetName: string, context: Partial<SpreadsheetContext>): void {
    const existing = this.contexts.get(sheetName) || this.createDefaultContext(sheetName);
    const updated = { ...existing, ...context, preferences: this.userPreferences };
    this.contexts.set(sheetName, updated);
  }

  /**
   * Get spreadsheet context
   */
  getContext(sheetName: string): SpreadsheetContext | undefined {
    return this.contexts.get(sheetName);
  }

  /**
   * Create default context for a sheet
   */
  private createDefaultContext(sheetName: string): SpreadsheetContext {
    return {
      sheetName,
      sheets: [sheetName],
      headers: {},
      columnTypes: {},
      namedRanges: {},
      formulas: {},
      preferences: this.userPreferences,
    };
  }

  /**
   * Update headers for a sheet
   */
  updateHeaders(sheetName: string, headers: Record<string, string>): void {
    const context = this.contexts.get(sheetName);
    if (context) {
      context.headers = { ...context.headers, ...headers };
      this.contexts.set(sheetName, context);
    }
  }

  /**
   * Update column types for a sheet
   */
  updateColumnTypes(sheetName: string, types: Record<string, 'number' | 'string' | 'date' | 'boolean'>): void {
    const context = this.contexts.get(sheetName);
    if (context) {
      context.columnTypes = { ...context.columnTypes, ...types };
      this.contexts.set(sheetName, context);
    }
  }

  /**
   * Add named range
   */
  addNamedRange(sheetName: string, name: string, range: string): void {
    const context = this.contexts.get(sheetName);
    if (context) {
      context.namedRanges = { ...context.namedRanges, [name]: range };
      this.contexts.set(sheetName, context);
    }
  }

  /**
   * Add conversation entry
   */
  addConversationEntry(
    sheetName: string,
    input: string,
    output: ParsedFormula
  ): void {
    const history = this.conversationHistory.get(sheetName) || [];

    history.push({
      timestamp: new Date(),
      input,
      output,
    });

    // Keep only last 50 entries
    if (history.length > 50) {
      history.shift();
    }

    this.conversationHistory.set(sheetName, history);
  }

  /**
   * Get conversation history
   */
  getConversationHistory(sheetName: string): ConversationEntry[] {
    return this.conversationHistory.get(sheetName) || [];
  }

  /**
   * Add user feedback
   */
  addFeedback(
    sheetName: string,
    timestamp: Date,
    feedback: 'positive' | 'negative' | 'neutral'
  ): void {
    const history = this.conversationHistory.get(sheetName) || [];
    const entry = history.find(e => e.timestamp.getTime() === timestamp.getTime());

    if (entry) {
      entry.feedback = feedback;
      this.conversationHistory.set(sheetName, history);

      // Learn from feedback
      this.learnFromFeedback(entry, feedback);
    }
  }

  /**
   * Add user correction
   */
  addCorrection(
    sheetName: string,
    timestamp: Date,
    correction: string
  ): void {
    const history = this.conversationHistory.get(sheetName) || [];
    const entry = history.find(e => e.timestamp.getTime() === timestamp.getTime());

    if (entry) {
      entry.corrections = correction;
      this.conversationHistory.set(sheetName, history);

      // Create error correction
      this.createErrorCorrection(entry, correction);
    }
  }

  /**
   * Learn from user feedback
   */
  private learnFromFeedback(
    entry: ConversationEntry,
    feedback: 'positive' | 'negative' | 'neutral'
  ): void {
    if (feedback === 'positive') {
      // Strengthen patterns that led to good results
      const patterns = this.extractPatterns(entry.input, entry.output);
      // TODO: Store patterns for future use
    } else if (feedback === 'negative') {
      // Weaken patterns that led to bad results
      const patterns = this.extractPatterns(entry.input, entry.output);
      // TODO: Downweight patterns
    }
  }

  /**
   * Create error correction from user correction
   */
  private createErrorCorrection(entry: ConversationEntry, correction: string): void {
    const errorCorrection: ErrorCorrection = {
      error: entry.output.formula,
      correction,
      explanation: `User corrected: ${correction}`,
      confidence: 0.9,
    };

    const sheetCorrections = this.errorCorrections.get(entry.output.intent.action) || [];
    sheetCorrections.push(errorCorrection);

    // Keep only last 20 corrections
    if (sheetCorrections.length > 20) {
      sheetCorrections.shift();
    }

    this.errorCorrections.set(entry.output.intent.action, sheetCorrections);
  }

  /**
   * Extract patterns from input-output pair
   */
  private extractPatterns(input: string, output: ParsedFormula): string[] {
    const patterns: string[] = [];

    // Extract operation words
    const operationWords = input.match(/(sum|total|average|count|calculate|compute)/gi);
    if (operationWords) {
      patterns.push(...operationWords.map(w => w.toLowerCase()));
    }

    // Extract entity patterns
    const cellPatterns = input.match(/[A-Z]\d+/g);
    if (cellPatterns) {
      patterns.push(...cellPatterns);
    }

    return patterns;
  }

  /**
   * Get relevant context for formula generation
   */
  getRelevantContext(sheetName: string, input: string): {
    context: SpreadsheetContext;
    recentHistory: ConversationEntry[];
    relevantCorrections: ErrorCorrection[];
  } {
    const context = this.contexts.get(sheetName) || this.createDefaultContext(sheetName);
    const history = this.conversationHistory.get(sheetName) || [];
    const corrections = this.errorCorrections.get(input) || [];

    // Get recent history (last 5 entries)
    const recentHistory = history.slice(-5);

    return {
      context,
      recentHistory,
      relevantCorrections: corrections,
    };
  }

  /**
   * Apply error correction to formula
   */
  applyErrorCorrection(formula: string, input: string): string | null {
    const corrections = this.errorCorrections.get(input) || [];

    for (const correction of corrections) {
      if (formula === correction.error) {
        return correction.correction;
      }
    }

    return null;
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Partial<UserPreferences>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences };

    // Update all contexts with new preferences
    for (const [sheetName, context] of this.contexts.entries()) {
      context.preferences = this.userPreferences;
      this.contexts.set(sheetName, context);
    }
  }

  /**
   * Get user preferences
   */
  getPreferences(): UserPreferences {
    return { ...this.userPreferences };
  }

  /**
   * Get error corrections
   */
  getErrorCorrections(): Map<string, ErrorCorrection[]> {
    return new Map(this.errorCorrections);
  }

  /**
   * Clear conversation history for a sheet
   */
  clearHistory(sheetName: string): void {
    this.conversationHistory.delete(sheetName);
  }

  /**
   * Clear all conversation history
   */
  clearAllHistory(): void {
    this.conversationHistory.clear();
  }

  /**
   * Clear all contexts
   */
  clearAllContexts(): void {
    this.contexts.clear();
  }

  /**
   * Export state for persistence
   */
  exportState(): {
    contexts: Record<string, SpreadsheetContext>;
    conversationHistory: Record<string, ConversationEntry[]>;
    errorCorrections: Record<string, ErrorCorrection[]>;
    userPreferences: UserPreferences;
  } {
    return {
      contexts: Object.fromEntries(this.contexts.entries()),
      conversationHistory: Object.fromEntries(this.conversationHistory.entries()),
      errorCorrections: Object.fromEntries(this.errorCorrections.entries()),
      userPreferences: this.userPreferences,
    };
  }

  /**
   * Import state from persistence
   */
  importState(state: {
    contexts?: Record<string, SpreadsheetContext>;
    conversationHistory?: Record<string, ConversationEntry[]>;
    errorCorrections?: Record<string, ErrorCorrection[]>;
    userPreferences?: UserPreferences;
  }): void {
    if (state.contexts) {
      this.contexts = new Map(Object.entries(state.contexts));
    }

    if (state.conversationHistory) {
      this.conversationHistory = new Map(Object.entries(state.conversationHistory));
    }

    if (state.errorCorrections) {
      this.errorCorrections = new Map(Object.entries(state.errorCorrections));
    }

    if (state.userPreferences) {
      this.userPreferences = state.userPreferences;
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalContexts: number;
    totalConversations: number;
    totalCorrections: number;
    averageConfidence: number;
  } {
    let totalConversations = 0;
    let totalCorrections = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const history of this.conversationHistory.values()) {
      totalConversations += history.length;

      for (const entry of history) {
        totalConfidence += entry.output.intent.confidence;
        confidenceCount++;
      }
    }

    for (const corrections of this.errorCorrections.values()) {
      totalCorrections += corrections.length;
    }

    return {
      totalContexts: this.contexts.size,
      totalConversations,
      totalCorrections,
      averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
    };
  }
}
