/**
 * Cell Explainer
 *
 * Explains cell decisions and reasoning in plain language.
 * Transforms technical cell states into human-readable explanations.
 */

import { CellType, CellState, CellReference, ReasoningTrace, SensationType } from '../core/types.js';
import { ParsedQuery, QueryType } from './QueryParser.js';

/**
 * Explanation detail level
 */
export enum ExplanationDetail {
  BRIEF = 'brief',
  STANDARD = 'standard',
  DETAILED = 'detailed',
}

/**
 * Explanation result
 */
export interface Explanation {
  summary: string;
  details: string[];
  confidence: number;
  suggestions?: string[];
}

/**
 * Cell information for explanation
 */
export interface CellInfo {
  id: string;
  type: CellType;
  state: CellState;
  value: unknown;
  confidence?: number;
  error?: string;
  reasoning?: ReasoningTrace;
  sensations?: Array<{
    type: SensationType;
    source: CellReference;
    value: unknown;
  }>;
  history?: Array<{
    value: unknown;
    timestamp: number;
  }>;
}

/**
 * Cell Explainer
 *
 * Generates plain language explanations for cell behavior
 */
export class CellExplainer {
  /**
   * Explain a cell's current state
   */
  explainCell(cell: CellInfo, detail: ExplanationDetail = ExplanationDetail.STANDARD): Explanation {
    const summary = this.generateCellSummary(cell);
    const details = this.generateCellDetails(cell, detail);
    const suggestions = this.generateSuggestions(cell);

    return {
      summary,
      details,
      confidence: cell.confidence || 0,
      suggestions,
    };
  }

  /**
   * Explain a query result
   */
  explainQuery(query: ParsedQuery, results: CellReference[]): string {
    switch (query.type) {
      case QueryType.FILTER:
        return this.explainFilterQuery(query, results);

      case QueryType.AGGREGATE:
        return this.explainAggregateQuery(query, results);

      case QueryType.SEARCH:
        return this.explainSearchQuery(query, results);

      case QueryType.TREND:
        return this.explainTrendQuery(query, results);

      case QueryType.EXPLAIN:
        return this.explainExplainQuery(query, results);

      case QueryType.HIGHLIGHT:
        return this.explainHighlightQuery(query, results);

      default:
        return `Found ${results.length} cells matching your criteria.`;
    }
  }

  /**
   * Explain why a cell is in error state
   */
  explainError(cell: CellInfo): Explanation {
    const summary = `${this.cellPositionToText(cell.id)} is showing an error`;
    const details: string[] = [];

    details.push(`Error: ${cell.error || 'Unknown error'}`);
    details.push(`Cell type: ${this.cellTypeToText(cell.type)}`);

    if (cell.reasoning) {
      details.push('The cell encountered an error during processing.');
      if (cell.reasoning.steps.length > 0) {
        details.push(`Last action: ${cell.reasoning.steps[cell.reasoning.steps.length - 1].description}`);
      }
    }

    const suggestions = this.generateErrorSuggestions(cell);

    return {
      summary,
      details,
      confidence: 0,
      suggestions,
    };
  }

  /**
   * Explain a cell's reasoning process
   */
  explainReasoning(cell: CellInfo): Explanation {
    if (!cell.reasoning) {
      return {
        summary: `${this.cellPositionToText(cell.id)} has no reasoning trace available`,
        details: [],
        confidence: 0,
      };
    }

    const summary = `${this.cellPositionToText(cell.id)} processed a request`;
    const details: string[] = [];

    details.push(`Process took ${cell.reasoning.totalTime}ms`);
    details.push(`Completed ${cell.reasoning.steps.length} reasoning steps`);
    details.push(`Overall confidence: ${(cell.reasoning.confidence * 100).toFixed(1)}%`);

    if (cell.reasoning.steps.length > 0) {
      details.push('\nReasoning steps:');
      cell.reasoning.steps.forEach((step, i) => {
        details.push(`${i + 1}. ${step.description} (${(step.confidence * 100).toFixed(1)}% confidence)`);
      });
    }

    return {
      summary,
      details,
      confidence: cell.reasoning.confidence,
    };
  }

  /**
   * Explain what a cell type does
   */
  explainCellType(type: CellType): string {
    const explanations: Record<CellType, string> = {
      [CellType.INPUT]: 'Receives and validates input data from users or external sources.',
      [CellType.OUTPUT]: 'Aggregates and formats results for display or export.',
      [CellType.TRANSFORM]: 'Converts data from one format to another using specified transformations.',
      [CellType.FILTER]: 'Filters data based on specified conditions and criteria.',
      [CellType.AGGREGATE]: 'Combines multiple values into summary statistics (sum, average, count, etc.).',
      [CellType.VALIDATE]: 'Checks data against rules and constraints to ensure validity.',
      [CellType.ANALYSIS]: 'Performs analytical operations on data (statistics, patterns, correlations).',
      [CellType.PREDICTION]: 'Makes predictions about future values based on historical data.',
      [CellType.DECISION]: 'Evaluates conditions and makes decisions based on business rules.',
      [CellType.EXPLAIN]: 'Provides explanations and insights about cell behavior and decisions.',
      [CellType.STORAGE]: 'Stores data for later retrieval and use by other cells.',
      [CellType.NOTIFY]: 'Sends notifications when specific conditions are met.',
      [CellType.TRIGGER]: 'Triggers actions when specific conditions occur.',
      [CellType.SCHEDULE]: 'Executes operations on a schedule or at specific times.',
      [CellType.COORDINATE]: 'Coordinates operations across multiple cells.',
    };

    return explanations[type] || 'Performs operations on data.';
  }

  /**
   * Generate cell summary
   */
  private generateCellSummary(cell: CellInfo): string {
    const position = this.cellPositionToText(cell.id);
    const typeText = this.cellTypeToText(cell.type);
    const stateText = this.cellStateToText(cell.state);

    let summary = `${position} (${typeText}) is ${stateText}`;

    if (cell.state === CellState.ERROR && cell.error) {
      summary += `: ${cell.error}`;
    } else if (cell.value !== undefined && cell.value !== null) {
      const valueText = this.valueToText(cell.value);
      summary += ` with value: ${valueText}`;
    }

    if (cell.confidence !== undefined) {
      summary += ` (${(cell.confidence * 100).toFixed(1)}% confidence)`;
    }

    return summary;
  }

  /**
   * Generate cell details
   */
  private generateCellDetails(cell: CellInfo, detail: ExplanationDetail): string[] {
    const details: string[] = [];

    if (detail === ExplanationDetail.BRIEF) {
      return details;
    }

    // Add type explanation
    details.push(`Cell Type: ${this.cellTypeToText(cell.type)}`);
    details.push(`Description: ${this.explainCellType(cell.type)}`);

    // Add state information
    details.push(`Current State: ${this.cellStateToText(cell.state)}`);

    // Add sensations if available
    if (cell.sensations && cell.sensations.length > 0) {
      details.push(`\nMonitoring ${cell.sensations.length} other cells:`);
      cell.sensations.forEach((sensation) => {
        details.push(
          `- ${this.cellPositionToText(sensation.source.id || '')}: ${this.sensationTypeToText(sensation.type)}`
        );
      });
    }

    // Add history if available and detailed
    if (detail === ExplanationDetail.DETAILED && cell.history && cell.history.length > 1) {
      details.push(`\nRecent history (${cell.history.length} changes):`);
      const recent = cell.history.slice(-5);
      recent.forEach((entry) => {
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        details.push(`[${timestamp}] ${this.valueToText(entry.value)}`);
      });
    }

    return details;
  }

  /**
   * Generate suggestions
   */
  private generateSuggestions(cell: CellInfo): string[] {
    const suggestions: string[] = [];

    if (cell.state === CellState.ERROR) {
      suggestions.push(...this.generateErrorSuggestions(cell));
    } else if (cell.confidence !== undefined && cell.confidence < 0.7) {
      suggestions.push('Consider providing more training data to improve confidence');
      suggestions.push('Review the reasoning trace to identify uncertainty sources');
    } else if (cell.type === CellType.PREDICTION) {
      suggestions.push('Monitor prediction accuracy over time');
      suggestions.push('Consider adjusting the prediction horizon if accuracy is low');
    } else if (cell.type === CellType.DECISION) {
      suggestions.push('Review decision rules to ensure alignment with business logic');
      suggestions.push('Test decisions against edge cases');
    }

    return suggestions;
  }

  /**
   * Generate error suggestions
   */
  private generateErrorSuggestions(cell: CellInfo): string[] {
    const suggestions: string[] = [];

    if (cell.error?.includes('validation')) {
      suggestions.push('Check input data format and types');
      suggestions.push('Review validation rules for this cell');
    } else if (cell.error?.includes('dependency')) {
      suggestions.push('Ensure all upstream cells are functioning correctly');
      suggestions.push('Check for circular references');
    } else if (cell.error?.includes('timeout')) {
      suggestions.push('Consider increasing timeout threshold');
      suggestions.push('Optimize cell logic for faster execution');
    } else {
      suggestions.push('Review cell configuration and inputs');
      suggestions.push('Check the reasoning trace for more details');
    }

    return suggestions;
  }

  /**
   * Explain filter query
   */
  private explainFilterQuery(query: ParsedQuery, results: CellReference[]): string {
    if (!query.conditions || query.conditions.length === 0) {
      return `Found ${results.length} cells.`;
    }

    const conditionTexts = query.conditions.map((c) => {
      return `${c.field} ${this.operatorToText(c.operator)} ${this.valueToText(c.value)}`;
    });

    return `Found ${results.length} cells where ${conditionTexts.join(' and ')}.`;
  }

  /**
   * Explain aggregate query
   */
  private explainAggregateQuery(query: ParsedQuery, results: CellReference[]): string {
    const func = query.aggregateFunction || 'count';
    const funcText = func.toUpperCase();

    if (query.column) {
      return `${funcText} of column ${query.column} across ${results.length} cells.`;
    }

    if (query.cellRange) {
      return `${funcText} of cells ${query.cellRange.start}:${query.cellRange.end} (${results.length} cells).`;
    }

    return `${funcText} calculated from ${results.length} cells.`;
  }

  /**
   * Explain search query
   */
  private explainSearchQuery(query: ParsedQuery, results: CellReference[]): string {
    const term = query.searchTerm || '';
    return `Found ${results.length} cells containing "${term}".`;
  }

  /**
   * Explain trend query
   */
  private explainTrendQuery(query: ParsedQuery, results: CellReference[]): string {
    const direction = query.trendDirection || 'up';
    const directionText = direction === 'up' ? 'increasing' : 'decreasing';

    return `Found ${results.length} cells with ${directionText} values.`;
  }

  /**
   * Explain explain query
   */
  private explainExplainQuery(query: ParsedQuery, results: CellReference[]): string {
    if (query.targetCell) {
      return `Showing explanation for ${query.targetCell}.`;
    }
    return `Providing explanations for ${results.length} cells.`;
  }

  /**
   * Explain highlight query
   */
  private explainHighlightQuery(query: ParsedQuery, results: CellReference[]): string {
    return `Highlighted ${results.length} cells matching your criteria.`;
  }

  /**
   * Convert cell ID to position text
   */
  private cellPositionToText(cellId: string): string {
    return cellId.toUpperCase();
  }

  /**
   * Convert cell type to text
   */
  private cellTypeToText(type: CellType): string {
    return type.toLowerCase().replace('_', ' ');
  }

  /**
   * Convert cell state to text
   */
  private cellStateToText(state: CellState): string {
    const stateTexts: Record<CellState, string> = {
      [CellState.DORMANT]: 'idle',
      [CellState.SENSING]: 'receiving input',
      [CellState.PROCESSING]: 'processing',
      [CellState.EMITTING]: 'producing output',
      [CellState.LEARNING]: 'learning',
      [CellState.ERROR]: 'in error state',
    };

    return stateTexts[state] || state;
  }

  /**
   * Convert sensation type to text
   */
  private sensationTypeToText(type: SensationType): string {
    const typeTexts: Record<SensationType, string> = {
      [SensationType.ABSOLUTE_CHANGE]: 'absolute change',
      [SensationType.RATE_OF_CHANGE]: 'rate of change',
      [SensationType.ACCELERATION]: 'acceleration',
      [SensationType.PRESENCE]: 'presence',
      [SensationType.PATTERN]: 'pattern recognition',
      [SensationType.ANOMALY]: 'anomaly detection',
    };

    return typeTexts[type] || type;
  }

  /**
   * Convert operator to text
   */
  private operatorToText(operator: string): string {
    const operatorTexts: Record<string, string> = {
      equals: 'equals',
      not_equals: 'does not equal',
      greater_than: 'is greater than',
      less_than: 'is less than',
      greater_equal: 'is greater than or equal to',
      less_equal: 'is less than or equal to',
      contains: 'contains',
      exists: 'exists',
      not_exists: 'does not exist',
    };

    return operatorTexts[operator] || operator;
  }

  /**
   * Convert value to text
   */
  private valueToText(value: unknown): string {
    if (value === null || value === undefined) {
      return 'empty';
    }

    if (typeof value === 'string') {
      return `"${value}"`;
    }

    if (typeof value === 'number') {
      return value.toFixed(2);
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }
}
