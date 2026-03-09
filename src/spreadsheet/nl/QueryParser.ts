/**
 * Natural Language Query Parser
 *
 * Converts natural language queries into structured query objects.
 * Uses pattern matching and keyword extraction (no external AI required).
 */

import { CellType, CellState } from '../core/types.js';

/**
 * Query types
 */
export enum QueryType {
  FILTER = 'filter',
  AGGREGATE = 'aggregate',
  SEARCH = 'search',
  TREND = 'trend',
  EXPLAIN = 'explain',
  HIGHLIGHT = 'highlight',
}

/**
 * Query operators
 */
export enum QueryOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_EQUAL = 'greater_equal',
  LESS_EQUAL = 'less_equal',
  CONTAINS = 'contains',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists',
}

/**
 * Query condition
 */
export interface QueryCondition {
  field: string;
  operator: QueryOperator;
  value: unknown;
}

/**
 * Parsed query structure
 */
export interface ParsedQuery {
  type: QueryType;
  conditions?: QueryCondition[];
  searchTerm?: string;
  targetCell?: string;
  aggregateFunction?: 'sum' | 'average' | 'count' | 'min' | 'max';
  trendDirection?: 'up' | 'down';
  cellRange?: { start: string; end: string };
  column?: string;
  row?: number;
}

/**
 * Parse result
 */
export interface ParseResult {
  success: boolean;
  query?: ParsedQuery;
  error?: string;
}

/**
 * Query Parser
 *
 * Parses natural language queries into structured format
 */
export class QueryParser {
  // Patterns for different query types
  private patterns = {
    // Filter patterns
    filter: [
      /show (?:me )?(?:all )?cells?(?: with)?(?: value)? ([><=]+)\s*(\d+(?:\.\d+)?)/i,
      /show (?:me )?(?:all )?cells?(?: with)?(?: value)? (?:greater|more|higher) than (\d+(?:\.\d+)?)/i,
      /show (?:me )?(?:all )?cells?(?: with)?(?: value)? (?:less|lower|smaller) than (\d+(?:\.\d+)?)/i,
      /show (?:me )?(?:all )?cells?(?: with)?(?: value)? (?:equal|equals to|=) (\d+(?:\.\d+)?)/i,
      /(?:show|list|display|filter) (?:me )?(?:all )?(.+?) cells?/i,
      /(?:show|list|display) (?:me )?(?:all )?cells?(?: with)? (.+)/i,
    ],

    // Aggregate patterns
    aggregate: [
      /what(?:'s| is)?(?: the)? (sum|average|avg|mean|count|min|max) of (.+)/i,
      /calculate (?:the )?(sum|average|avg|mean|count|min|max)(?: of)? (.+)/i,
      /(.+?) (?:sum|average|avg|mean|count|min|max)/i,
    ],

    // Trend patterns
    trend: [
      /which cells?(?: are)?(?: )?(trending|going) (up|down|higher|lower)/i,
      /show (?:me )?(?:all )?trending (up|down) cells?/i,
    ],

    // Explain patterns
    explain: [
      /explain (?:why )?(.+?)(?: shows| has| is)?(?: an)?(.+)?/i,
      /why (?:does )?(.+?)(?: show| have| is)?(?: an)?(.+)?/i,
    ],

    // Search patterns
    search: [
      /search (?:for )?["'](.+?)["']/i,
      /find (?:cells? )?(?:containing|with) ["'](.+?)["']/i,
    ],

    // Highlight patterns
    highlight: [
      /highlight (?:all )?(.+?) cells?/i,
    ],
  };

  // Keyword mappings
  private cellTypeKeywords: Record<string, CellType> = {
    'prediction': CellType.PREDICTION,
    'predictions': CellType.PREDICTION,
    'decision': CellType.DECISION,
    'decisions': CellType.DECISION,
    'analysis': CellType.ANALYSIS,
    'explain': CellType.EXPLAIN,
    'input': CellType.INPUT,
    'output': CellType.OUTPUT,
    'transform': CellType.TRANSFORM,
    'filter': CellType.FILTER,
    'aggregate': CellType.AGGREGATE,
    'validate': CellType.VALIDATE,
    'validation': CellType.VALIDATE,
    'storage': CellType.STORAGE,
  };

  private stateKeywords: Record<string, CellState> = {
    'error': CellState.ERROR,
    'errors': CellState.ERROR,
    'processing': CellState.PROCESSING,
    'dormant': CellState.DORMANT,
    'sensing': CellState.SENSING,
    'emitting': CellState.EMITTING,
    'learning': CellState.LEARNING,
  };

  /**
   * Parse a natural language query
   */
  parse(input: string): ParseResult {
    const trimmed = input.trim();

    if (!trimmed) {
      return { success: false, error: 'Empty query' };
    }

    // Try each pattern type
    let result = this.tryFilterPatterns(trimmed);
    if (result.success) return result;

    result = this.tryAggregatePatterns(trimmed);
    if (result.success) return result;

    result = this.tryTrendPatterns(trimmed);
    if (result.success) return result;

    result = this.tryExplainPatterns(trimmed);
    if (result.success) return result;

    result = this.trySearchPatterns(trimmed);
    if (result.success) return result;

    result = this.tryHighlightPatterns(trimmed);
    if (result.success) return result;

    // Fallback: try generic keyword extraction
    return this.extractFromKeywords(trimmed);
  }

  /**
   * Try filter patterns
   */
  private tryFilterPatterns(input: string): ParseResult {
    for (const pattern of this.patterns.filter) {
      const match = input.match(pattern);
      if (match) {
        const conditions: QueryCondition[] = [];

        // Numeric comparison
        if (match[1] && /^[><=]+$/.test(match[1])) {
          const operator = match[1].trim();
          const value = parseFloat(match[2]);

          conditions.push({
            field: 'value',
            operator: this.mapComparisonOperator(operator),
            value,
          });

          return {
            success: true,
            query: {
              type: QueryType.FILTER,
              conditions,
            },
          };
        }

        // Text-based comparison
        if (match[1]) {
          const cellType = this.mapCellType(match[1]);
          const cellState = this.mapCellState(match[1]);

          if (cellType) {
            conditions.push({
              field: 'type',
              operator: QueryOperator.EQUALS,
              value: cellType,
            });
          }

          if (cellState) {
            conditions.push({
              field: 'state',
              operator: QueryOperator.EQUALS,
              value: cellState,
            });
          }

          if (conditions.length > 0) {
            return {
              success: true,
              query: {
                type: QueryType.FILTER,
                conditions,
              },
            };
          }
        }
      }
    }

    // Check for "greater than X" pattern
    const greaterMatch = input.match(/(?:greater|more|higher) than (\d+(?:\.\d+)?)/i);
    if (greaterMatch) {
      return {
        success: true,
        query: {
          type: QueryType.FILTER,
          conditions: [
            {
              field: 'value',
              operator: QueryOperator.GREATER_THAN,
              value: parseFloat(greaterMatch[1]),
            },
          ],
        },
      };
    }

    // Check for "less than X" pattern
    const lessMatch = input.match(/(?:less|lower|smaller) than (\d+(?:\.\d+)?)/i);
    if (lessMatch) {
      return {
        success: true,
        query: {
          type: QueryType.FILTER,
          conditions: [
            {
              field: 'value',
              operator: QueryOperator.LESS_THAN,
              value: parseFloat(lessMatch[1]),
            },
          ],
        },
      };
    }

    return { success: false, error: 'No filter pattern matched' };
  }

  /**
   * Try aggregate patterns
   */
  private tryAggregatePatterns(input: string): ParseResult {
    for (const pattern of this.patterns.aggregate) {
      const match = input.match(pattern);
      if (match) {
        const func = this.mapAggregateFunction(match[1]);
        const target = match[2].trim();

        return {
          success: true,
          query: {
            type: QueryType.AGGREGATE,
            aggregateFunction: func,
            cellRange: this.parseCellRange(target),
            column: this.parseColumnReference(target),
          },
        };
      }
    }

    return { success: false, error: 'No aggregate pattern matched' };
  }

  /**
   * Try trend patterns
   */
  private tryTrendPatterns(input: string): ParseResult {
    for (const pattern of this.patterns.trend) {
      const match = input.match(pattern);
      if (match) {
        const direction = match[1].toLowerCase();
        const trendDirection = direction === 'up' || direction === 'higher' ? 'up' : 'down';

        return {
          success: true,
          query: {
            type: QueryType.TREND,
            trendDirection,
          },
        };
      }
    }

    return { success: false, error: 'No trend pattern matched' };
  }

  /**
   * Try explain patterns
   */
  private tryExplainPatterns(input: string): ParseResult {
    for (const pattern of this.patterns.explain) {
      const match = input.match(pattern);
      if (match) {
        const cellRef = this.extractCellReference(match[1]);

        return {
          success: true,
          query: {
            type: QueryType.EXPLAIN,
            targetCell: cellRef,
          },
        };
      }
    }

    return { success: false, error: 'No explain pattern matched' };
  }

  /**
   * Try search patterns
   */
  private trySearchPatterns(input: string): ParseResult {
    for (const pattern of this.patterns.search) {
      const match = input.match(pattern);
      if (match) {
        return {
          success: true,
          query: {
            type: QueryType.SEARCH,
            searchTerm: match[1],
          },
        };
      }
    }

    return { success: false, error: 'No search pattern matched' };
  }

  /**
   * Try highlight patterns
   */
  private tryHighlightPatterns(input: string): ParseResult {
    for (const pattern of this.patterns.highlight) {
      const match = input.match(pattern);
      if (match) {
        const cellType = this.mapCellType(match[1]);

        if (cellType) {
          return {
            success: true,
            query: {
              type: QueryType.HIGHLIGHT,
              conditions: [
                {
                  field: 'type',
                  operator: QueryOperator.EQUALS,
                  value: cellType,
                },
              ],
            },
          };
        }
      }
    }

    return { success: false, error: 'No highlight pattern matched' };
  }

  /**
   * Extract from keywords as fallback
   */
  private extractFromKeywords(input: string): ParseResult {
    const lowerInput = input.toLowerCase();
    const conditions: QueryCondition[] = [];

    // Check for cell type keywords
    for (const [keyword, cellType] of Object.entries(this.cellTypeKeywords)) {
      if (lowerInput.includes(keyword)) {
        conditions.push({
          field: 'type',
          operator: QueryOperator.EQUALS,
          value: cellType,
        });
        break;
      }
    }

    // Check for state keywords
    for (const [keyword, state] of Object.entries(this.stateKeywords)) {
      if (lowerInput.includes(keyword)) {
        conditions.push({
          field: 'state',
          operator: QueryOperator.EQUALS,
          value: state,
        });
        break;
      }
    }

    if (conditions.length > 0) {
      return {
        success: true,
        query: {
          type: QueryType.FILTER,
          conditions,
        },
      };
    }

    return { success: false, error: 'Could not parse query' };
  }

  /**
   * Map comparison operator string to enum
   */
  private mapComparisonOperator(op: string): QueryOperator {
    switch (op.trim()) {
      case '>':
      case 'greater':
        return QueryOperator.GREATER_THAN;
      case '<':
      case 'less':
        return QueryOperator.LESS_THAN;
      case '>=':
      case 'greater_equal':
        return QueryOperator.GREATER_EQUAL;
      case '<=':
      case 'less_equal':
        return QueryOperator.LESS_EQUAL;
      case '=':
      case '==':
      default:
        return QueryOperator.EQUALS;
    }
  }

  /**
   * Map text to cell type
   */
  private mapCellType(text: string): CellType | null {
    const lowerText = text.toLowerCase().trim();
    return this.cellTypeKeywords[lowerText] || null;
  }

  /**
   * Map text to cell state
   */
  private mapCellState(text: string): CellState | null {
    const lowerText = text.toLowerCase().trim();
    return this.stateKeywords[lowerText] || null;
  }

  /**
   * Map aggregate function
   */
  private mapAggregateFunction(func: string): 'sum' | 'average' | 'count' | 'min' | 'max' {
    const lowerFunc = func.toLowerCase();
    switch (lowerFunc) {
      case 'sum':
        return 'sum';
      case 'average':
      case 'avg':
      case 'mean':
        return 'average';
      case 'count':
        return 'count';
      case 'min':
        return 'min';
      case 'max':
        return 'max';
      default:
        return 'count';
    }
  }

  /**
   * Parse cell range (e.g., "A1:B10")
   */
  private parseCellRange(text: string): { start: string; end: string } | undefined {
    const rangeMatch = text.match(/([A-Z]+\d+):([A-Z]+\d+)/i);
    if (rangeMatch) {
      return {
        start: rangeMatch[1].toUpperCase(),
        end: rangeMatch[2].toUpperCase(),
      };
    }
    return undefined;
  }

  /**
   * Parse column reference (e.g., "column B" or just "B")
   */
  private parseColumnReference(text: string): string | undefined {
    const colMatch = text.match(/column\s+([A-Z])/i);
    if (colMatch) {
      return colMatch[1].toUpperCase();
    }

    // Check if just a column letter
    if (/^[A-Z]$/i.test(text.trim())) {
      return text.trim().toUpperCase();
    }

    return undefined;
  }

  /**
   * Extract cell reference from text
   */
  private extractCellReference(text: string): string | undefined {
    const cellMatch = text.match(/([A-Z]+\d+)/i);
    return cellMatch ? cellMatch[1].toUpperCase() : undefined;
  }
}
