/**
 * Natural Language Query Engine
 *
 * Parses and executes natural language queries against spreadsheet cells.
 * Provides an intuitive interface for users to interact with cells.
 */

import { CellType, CellState, SensationType, CellReference } from '../core/types.js';
import { QueryParser, ParsedQuery, QueryType, QueryCondition, QueryOperator } from './QueryParser.js';
import { CellExplainer } from './CellExplainer.js';

/**
 * Query result
 */
export interface QueryResult {
  success: boolean;
  results: CellReference[];
  count: number;
  explanation: string;
  error?: string;
}

/**
 * Cell data interface for queries
 */
export interface CellData {
  id: string;
  type: CellType;
  state: CellState;
  position: { row: number; col: number };
  value: unknown;
  confidence?: number;
  error?: string;
}

/**
 * Query execution context
 */
export interface QueryContext {
  cells: Map<string, CellData>;
  cellHistory: Map<string, Array<{ value: unknown; timestamp: number }>>;
}

/**
 * NL Query Engine
 *
 * Main engine for parsing and executing natural language queries
 */
export class NLQueryEngine {
  private parser: QueryParser;
  private explainer: CellExplainer;

  constructor() {
    this.parser = new QueryParser();
    this.explainer = new CellExplainer();
  }

  /**
   * Execute a natural language query
   */
  async executeQuery(query: string, context: QueryContext): Promise<QueryResult> {
    try {
      // Parse the query
      const parsed = this.parser.parse(query);

      if (!parsed.success || !parsed.query) {
        return {
          success: false,
          results: [],
          count: 0,
          explanation: parsed.error || 'Failed to parse query',
          error: parsed.error,
        };
      }

      // Execute based on query type
      const results = await this.executeQueryInternal(parsed.query, context);

      // Generate explanation
      const explanation = this.explainer.explainQuery(parsed.query, results);

      return {
        success: true,
        results,
        count: results.length,
        explanation,
      };
    } catch (error) {
      return {
        success: false,
        results: [],
        count: 0,
        explanation: 'Error executing query',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a parsed query
   */
  private async executeQueryInternal(query: ParsedQuery, context: QueryContext): Promise<CellReference[]> {
    switch (query.type) {
      case QueryType.FILTER:
        return this.executeFilter(query, context);

      case QueryType.AGGREGATE:
        return this.executeAggregate(query, context);

      case QueryType.SEARCH:
        return this.executeSearch(query, context);

      case QueryType.TREND:
        return this.executeTrend(query, context);

      case QueryType.EXPLAIN:
        return this.executeExplain(query, context);

      default:
        return [];
    }
  }

  /**
   * Execute filter query
   */
  private executeFilter(query: ParsedQuery, context: QueryContext): CellReference[] {
    const results: CellReference[] = [];

    for (const [cellId, cell] of Array.from(context.cells.entries())) {
      if (this.matchesConditions(cell, query.conditions || [], context)) {
        results.push({
          id: cellId,
          row: cell.position.row,
          col: cell.position.col,
        });
      }
    }

    return results;
  }

  /**
   * Execute aggregate query
   */
  private executeAggregate(query: ParsedQuery, context: QueryContext): CellReference[] {
    // Aggregate queries return summary, not filtered cells
    // For now, return all cells that match type filter
    return this.executeFilter(query, context);
  }

  /**
   * Execute search query
   */
  private executeSearch(query: ParsedQuery, context: QueryContext): CellReference[] {
    const searchTerm = query.searchTerm?.toLowerCase() || '';
    const results: CellReference[] = [];

    for (const [cellId, cell] of Array.from(context.cells.entries())) {
      // Search in cell value
      if (String(cell.value).toLowerCase().includes(searchTerm)) {
        results.push({
          id: cellId,
          row: cell.position.row,
          col: cell.position.col,
        });
        continue;
      }

      // Search in cell ID
      if (cellId.toLowerCase().includes(searchTerm)) {
        results.push({
          id: cellId,
          row: cell.position.row,
          col: cell.position.col,
        });
      }
    }

    return results;
  }

  /**
   * Execute trend query
   */
  private executeTrend(query: ParsedQuery, context: QueryContext): CellReference[] {
    const results: CellReference[] = [];
    const trendDirection = query.trendDirection || 'up';

    for (const [cellId, cell] of Array.from(context.cells.entries())) {
      const history = context.cellHistory.get(cellId);
      if (!history || history.length < 2) continue;

      // Calculate trend
      const recent = history.slice(-3);
      let isTrending = false;

      if (trendDirection === 'up') {
        isTrending = this.isTrendingUp(recent);
      } else if (trendDirection === 'down') {
        isTrending = this.isTrendingDown(recent);
      }

      if (isTrending) {
        results.push({
          id: cellId,
          row: cell.position.row,
          col: cell.position.col,
        });
      }
    }

    return results;
  }

  /**
   * Execute explain query
   */
  private executeExplain(query: ParsedQuery, context: QueryContext): CellReference[] {
    // Explain queries return specific cells
    const targetCellId = query.targetCell;
    if (!targetCellId) return [];

    const cell = context.cells.get(targetCellId);
    if (!cell) return [];

    return [
      {
        id: targetCellId,
        row: cell.position.row,
        col: cell.position.col,
      },
    ];
  }

  /**
   * Check if cell matches conditions
   */
  private matchesConditions(cell: CellData, conditions: QueryCondition[], context: QueryContext): boolean {
    return conditions.every((condition) => this.matchesCondition(cell, condition, context));
  }

  /**
   * Check if cell matches single condition
   */
  private matchesCondition(cell: CellData, condition: QueryCondition, context: QueryContext): boolean {
    switch (condition.field) {
      case 'type':
        return this.compareValue(cell.type, condition.operator, condition.value);

      case 'state':
        return this.compareValue(cell.state, condition.operator, condition.value);

      case 'value':
        return this.compareValue(cell.value, condition.operator, condition.value);

      case 'confidence':
        return this.compareValue(cell.confidence || 0, condition.operator, condition.value);

      case 'error':
        return condition.operator === QueryOperator.EXISTS
          ? cell.error !== undefined
          : this.compareValue(cell.error, condition.operator, condition.value);

      default:
        return false;
    }
  }

  /**
   * Compare values based on operator
   */
  private compareValue(actual: unknown, operator: QueryOperator, expected: unknown): boolean {
    switch (operator) {
      case QueryOperator.EQUALS:
        return actual === expected;

      case QueryOperator.NOT_EQUALS:
        return actual !== expected;

      case QueryOperator.GREATER_THAN:
        return typeof actual === 'number' && typeof expected === 'number' && actual > expected;

      case QueryOperator.LESS_THAN:
        return typeof actual === 'number' && typeof expected === 'number' && actual < expected;

      case QueryOperator.GREATER_EQUAL:
        return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;

      case QueryOperator.LESS_EQUAL:
        return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;

      case QueryOperator.CONTAINS:
        return String(actual).toLowerCase().includes(String(expected).toLowerCase());

      case QueryOperator.EXISTS:
        return actual !== undefined && actual !== null;

      case QueryOperator.NOT_EXISTS:
        return actual === undefined || actual === null;

      default:
        return false;
    }
  }

  /**
   * Check if values are trending up
   */
  private isTrendingUp(values: Array<{ value: unknown; timestamp: number }>): boolean {
    if (values.length < 2) return false;

    for (let i = 1; i < values.length; i++) {
      const prev = typeof values[i - 1].value === 'number' ? (values[i - 1].value as number) : 0;
      const curr = typeof values[i].value === 'number' ? (values[i].value as number) : 0;
      if (curr <= prev) return false;
    }

    return true;
  }

  /**
   * Check if values are trending down
   */
  private isTrendingDown(values: Array<{ value: unknown; timestamp: number }>): boolean {
    if (values.length < 2) return false;

    for (let i = 1; i < values.length; i++) {
      const prev = typeof values[i - 1].value === 'number' ? (values[i - 1].value as number) : 0;
      const curr = typeof values[i].value === 'number' ? (values[i].value as number) : 0;
      if (curr >= prev) return false;
    }

    return true;
  }

  /**
   * Get query suggestions based on input
   */
  getSuggestions(input: string): string[] {
    const suggestions: string[] = [];
    const lowerInput = input.toLowerCase();

    // Filter suggestions
    if (lowerInput.includes('show') || lowerInput.includes('filter') || lowerInput.includes('cells')) {
      suggestions.push(
        'Show me cells with value > 100',
        'Which cells have errors?',
        'Show all prediction cells',
        'Filter cells where confidence < 0.5'
      );
    }

    // Trend suggestions
    if (lowerInput.includes('trend') || lowerInput.includes('trending')) {
      suggestions.push('Which cells are trending up?', 'Which cells are trending down?');
    }

    // Aggregate suggestions
    if (lowerInput.includes('average') || lowerInput.includes('sum') || lowerInput.includes('count')) {
      suggestions.push('What\'s the average of column B?', 'Count all cells with errors');
    }

    // Explain suggestions
    if (lowerInput.includes('explain') || lowerInput.includes('why')) {
      suggestions.push('Explain why A1 shows an error', 'Why is this cell red?');
    }

    // Search suggestions
    if (lowerInput.includes('search') || lowerInput.includes('find')) {
      suggestions.push('Search for "sales"', 'Find cells containing "error"');
    }

    return suggestions;
  }
}
