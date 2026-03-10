/**
 * Formula Generator for Natural Language Spreadsheet Queries
 *
 * Converts intents and entities into Excel-compatible formulas,
 * with optimization and completion suggestions.
 */

import type {
  SpreadsheetIntent,
  Entity,
  ParsedFormula,
  Suggestion,
  ResolvedEntity,
} from './types.js';

/**
 * Generates formulas from natural language intent
 */
export class FormulaGenerator {
  private functionRegistry: Map<string, FunctionDefinition> = new Map();

  constructor() {
    this.initializeFunctions();
  }

  /**
   * Initialize Excel function registry
   */
  private initializeFunctions(): void {
    const functions: FunctionDefinition[] = [
      {
        name: 'SUM',
        minParams: 1,
        maxParams: 255,
        category: 'math',
        description: 'Adds all numbers in a range',
        template: 'SUM({range})',
      },
      {
        name: 'AVERAGE',
        minParams: 1,
        maxParams: 255,
        category: 'statistical',
        description: 'Calculates the average',
        template: 'AVERAGE({range})',
      },
      {
        name: 'COUNT',
        minParams: 1,
        maxParams: 255,
        category: 'statistical',
        description: 'Counts numbers in a range',
        template: 'COUNT({range})',
      },
      {
        name: 'MAX',
        minParams: 1,
        maxParams: 255,
        category: 'statistical',
        description: 'Finds the maximum value',
        template: 'MAX({range})',
      },
      {
        name: 'MIN',
        minParams: 1,
        maxParams: 255,
        category: 'statistical',
        description: 'Finds the minimum value',
        template: 'MIN({range})',
      },
      {
        name: 'IF',
        minParams: 2,
        maxParams: 3,
        category: 'logical',
        description: 'Tests a condition',
        template: 'IF({condition}, {value_if_true}, {value_if_false})',
      },
      {
        name: 'VLOOKUP',
        minParams: 3,
        maxParams: 4,
        category: 'lookup',
        description: 'Looks up values in a table',
        template: 'VLOOKUP({lookup_value}, {table_array}, {col_index_num}, {range_lookup})',
      },
      {
        name: 'SUMIF',
        minParams: 2,
        maxParams: 3,
        category: 'math',
        description: 'Sums values that meet criteria',
        template: 'SUMIF({range}, {criteria}, {sum_range})',
      },
      {
        name: 'COUNTIF',
        minParams: 2,
        maxParams: 2,
        category: 'statistical',
        description: 'Counts values that meet criteria',
        template: 'COUNTIF({range}, {criteria})',
      },
      {
        name: 'AVERAGEIF',
        minParams: 2,
        maxParams: 3,
        category: 'statistical',
        description: 'Averages values that meet criteria',
        template: 'AVERAGEIF({range}, {criteria}, {average_range})',
      },
    ];

    for (const func of functions) {
      this.functionRegistry.set(func.name, func);
    }
  }

  /**
   * Generate formula from intent and entities
   */
  generateFromIntent(intent: SpreadsheetIntent, entities: Entity[]): ParsedFormula {
    const { type, action } = intent;

    switch (type) {
      case 'create_formula':
        return this.generateCalculationFormula(action, entities);
      case 'analyze':
        return this.generateAnalysisFormula(action, entities);
      case 'aggregate':
        return this.generateAggregateFormula(action, entities);
      case 'filter':
        return this.generateFilterFormula(action, entities);
      case 'validate':
        return this.generateValidationFormula(action, entities);
      case 'transform':
        return this.generateTransformFormula(action, entities);
      default:
        return this.generateGenericFormula(action, entities);
    }
  }

  /**
   * Generate calculation formula
   */
  private generateCalculationFormula(action: string, entities: Entity[]): ParsedFormula {
    const operations = this.getEntitiesByType(entities, 'operation');
    const ranges = this.getEntitiesByType(entities, 'range');
    const values = this.getEntitiesByType(entities, 'value');

    let formula = '';
    let explanation = '';

    if (operations.length > 0 && ranges.length > 0) {
      const op = operations[0].resolved.operation;
      const range = ranges[0].resolved.range;

      if (op && range) {
        formula = `${op.excelName}(${range.start}:${range.end})`;
        explanation = `Calculate the ${op.name} of values from ${range.start} to ${range.end}`;
      }
    } else if (ranges.length > 0 && values.length > 0) {
      // Direct calculation with values
      const range = ranges[0].resolved.range;
      const value = values[0].resolved.value;

      if (range && value) {
        formula = `=SUM(${range.start}:${range.end}) * ${value.parsed}`;
        explanation = `Multiply the sum of ${range.start}:${range.end} by ${value.parsed}`;
      }
    }

    return {
      formula,
      explanation,
      intent: { type: 'create_formula', confidence: 0.8, action },
      entities,
      complexity: this.calculateComplexity(formula),
      warnings: [],
    };
  }

  /**
   * Generate analysis formula
   */
  private generateAnalysisFormula(action: string, entities: Entity[]): ParsedFormula {
    const ranges = this.getEntitiesByType(entities, 'range');

    let formula = '';
    let explanation = '';

    if (ranges.length > 0) {
      const range = ranges[0].resolved.range;
      if (range) {
        // Generate multiple analysis formulas
        formula = `=AVERAGE(${range.start}:${range.end})`;
        explanation = `Analyze the average of values from ${range.start} to ${range.end}`;
      }
    }

    return {
      formula,
      explanation,
      intent: { type: 'analyze', confidence: 0.8, action },
      entities,
      complexity: this.calculateComplexity(formula),
      warnings: [],
    };
  }

  /**
   * Generate aggregate formula
   */
  private generateAggregateFormula(action: string, entities: Entity[]): ParsedFormula {
    const operations = this.getEntitiesByType(entities, 'operation');
    const ranges = this.getEntitiesByType(entities, 'range');

    let formula = '';
    let explanation = '';

    // Default to SUM if no operation specified
    const operation = operations.length > 0 ? operations[0] : {
      resolved: { operation: { name: 'sum', excelName: 'SUM', parameters: [] } }
    };

    if (ranges.length > 0) {
      const range = ranges[0].resolved.range;
      const op = operation.resolved.operation;

      if (range && op) {
        formula = `${op.excelName}(${range.start}:${range.end})`;
        explanation = `Aggregate using ${op.name} from ${range.start} to ${range.end}`;
      }
    }

    return {
      formula,
      explanation,
      intent: { type: 'aggregate', confidence: 0.8, action },
      entities,
      complexity: this.calculateComplexity(formula),
      warnings: [],
    };
  }

  /**
   * Generate filter formula
   */
  private generateFilterFormula(action: string, entities: Entity[]): ParsedFormula {
    const conditions = this.getEntitiesByType(entities, 'condition');
    const ranges = this.getEntitiesByType(entities, 'range');

    let formula = '';
    let explanation = '';

    if (conditions.length > 0 && ranges.length > 0) {
      const condition = conditions[0].resolved.condition;
      const range = ranges[0].resolved.range;

      if (condition && range) {
        formula = `FILTER(${range.start}:${range.end}, ${range.start}:${range.start}${condition.operator}"${condition.operand}")`;
        explanation = `Filter ${range.start}:${range.end} where values are ${condition.operator} ${condition.operand}`;
      }
    }

    return {
      formula,
      explanation,
      intent: { type: 'filter', confidence: 0.8, action },
      entities,
      complexity: this.calculateComplexity(formula),
      warnings: [],
    };
  }

  /**
   * Generate validation formula
   */
  private generateValidationFormula(action: string, entities: Entity[]): ParsedFormula {
    const conditions = this.getEntitiesByType(entities, 'condition');
    const cells = this.getEntitiesByType(entities, 'cell');

    let formula = '';
    let explanation = '';

    if (conditions.length > 0 && cells.length > 0) {
      const condition = conditions[0].resolved.condition;
      const cell = cells[0].resolved.cellReference;

      if (condition && cell) {
        formula = `=IF(${cell}${condition.operator}"${condition.operand}", "Valid", "Invalid")`;
        explanation = `Validate that ${cell} is ${condition.operator} ${condition.operand}`;
      }
    }

    return {
      formula,
      explanation,
      intent: { type: 'validate', confidence: 0.8, action },
      entities,
      complexity: this.calculateComplexity(formula),
      warnings: [],
    };
  }

  /**
   * Generate transform formula
   */
  private generateTransformFormula(action: string, entities: Entity[]): ParsedFormula {
    const cells = this.getEntitiesByType(entities, 'cell');

    let formula = '';
    let explanation = '';

    if (cells.length > 0) {
      const cell = cells[0].resolved.cellReference;
      if (cell) {
        // Detect transformation type from action
        const actionLower = action.toLowerCase();

        if (actionLower.includes('upper') || actionLower.includes('uppercase')) {
          formula = `=UPPER(${cell})`;
          explanation = `Convert ${cell} to uppercase`;
        } else if (actionLower.includes('lower') || actionLower.includes('lowercase')) {
          formula = `=LOWER(${cell})`;
          explanation = `Convert ${cell} to lowercase`;
        } else if (actionLower.includes('proper') || actionLower.includes('title')) {
          formula = `=PROPER(${cell})`;
          explanation = `Convert ${cell} to proper case`;
        } else if (actionLower.includes('trim')) {
          formula = `=TRIM(${cell})`;
          explanation = `Remove extra spaces from ${cell}`;
        } else {
          formula = `=${cell}`;
          explanation = `Reference ${cell}`;
        }
      }
    }

    return {
      formula,
      explanation,
      intent: { type: 'transform', confidence: 0.8, action },
      entities,
      complexity: this.calculateComplexity(formula),
      warnings: [],
    };
  }

  /**
   * Generate generic formula
   */
  private generateGenericFormula(action: string, entities: Entity[]): ParsedFormula {
    const operations = this.getEntitiesByType(entities, 'operation');
    const ranges = this.getEntitiesByType(entities, 'range');

    let formula = '=';
    let explanation = '';

    if (operations.length > 0) {
      const op = operations[0].resolved.operation;
      if (op) {
        formula += op.excelName + '(';
        explanation = `Apply ${op.name} operation`;
      }
    }

    if (ranges.length > 0) {
      const range = ranges[0].resolved.range;
      if (range) {
        formula += `${range.start}:${range.end})`;
        explanation += ` to range ${range.start}:${range.end}`;
      }
    } else {
      formula += ')';
    }

    return {
      formula,
      explanation,
      intent: { type: 'create_formula', confidence: 0.7, action },
      entities,
      complexity: this.calculateComplexity(formula),
      warnings: [],
    };
  }

  /**
   * Optimize formula for performance
   */
  optimizeFormula(formula: string): string {
    let optimized = formula;

    // Remove unnecessary parentheses
    optimized = optimized.replace(/\(\)/g, '()');

    // Use IFERROR instead of IF(ISERROR(...))
    optimized = optimized.replace(
      /IF\(ISERROR\(([^)]+)\),([^,]+),\1\)/g,
      'IFERROR($1,$2)'
    );

    // Use SUMIFS instead of SUMIF with array formulas
    optimized = optimized.replace(
      /SUM\(IF\(([^,]+),([^,]+),([^)]+)\)\)/g,
      'SUMIFS($2,$1,$3)'
    );

    // Convert nested IFs to IFS (if available)
    const nestedIfPattern = /IF\(([^,]+),([^,]+),IF\(([^,]+),([^,]+),([^)]+)\)\)/;
    if (nestedIfPattern.test(optimized)) {
      optimized = optimized.replace(
        nestedIfPattern,
        'IFS($1,$2,$3,$4)'
      );
    }

    return optimized;
  }

  /**
   * Suggest completions for partial formula
   */
  suggestCompletion(partial: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const upperPartial = partial.toUpperCase();

    // Get the last token
    const tokens = partial.split(/[(),\s]+/);
    const lastToken = tokens[tokens.length - 1];

    // Suggest functions
    if (lastToken.length >= 2) {
      for (const [name, def] of this.functionRegistry.entries()) {
        if (name.startsWith(lastToken.toUpperCase())) {
          suggestions.push({
            text: name + '(',
            label: name,
            description: def.description,
            relevance: 0.9,
            type: 'function',
          });
        }
      }
    }

    // Suggest ranges if we have a comma (expecting a parameter)
    if (partial.includes(',') || partial.includes('(')) {
      suggestions.push({
        text: 'A1:A100',
        label: 'Range A1:A100',
        description: 'Typical data range',
        relevance: 0.7,
        type: 'range',
      });
    }

    // Sort by relevance
    suggestions.sort((a, b) => b.relevance - a.relevance);

    return suggestions.slice(0, 10);
  }

  /**
   * Calculate formula complexity
   */
  private calculateComplexity(formula: string): number {
    let complexity = 0;

    // Count function calls
    const functionCalls = formula.match(/[A-Z][A-Z0-9_]+\(/g);
    complexity += (functionCalls?.length || 0) * 2;

    // Count nested parentheses
    let maxDepth = 0;
    let currentDepth = 0;
    for (const char of formula) {
      if (char === '(') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === ')') {
        currentDepth--;
      }
    }
    complexity += maxDepth * 3;

    // Count operators
    const operators = formula.match(/[+\-*/^&=<>]/g);
    complexity += operators?.length || 0;

    return complexity;
  }

  /**
   * Get entities by type
   */
  private getEntitiesByType(entities: Entity[], type: Entity['type']): Entity[] {
    return entities.filter(e => e.type === type);
  }

  /**
   * Get function definition
   */
  getFunction(name: string): FunctionDefinition | undefined {
    return this.functionRegistry.get(name.toUpperCase());
  }

  /**
   * Get all function names
   */
  getAllFunctions(): string[] {
    return Array.from(this.functionRegistry.keys());
  }

  /**
   * Get functions by category
   */
  getFunctionsByCategory(category: string): FunctionDefinition[] {
    return Array.from(this.functionRegistry.values()).filter(
      f => f.category === category
    );
  }
}

/**
 * Function definition
 */
interface FunctionDefinition {
  name: string;
  minParams: number;
  maxParams: number;
  category: string;
  description: string;
  template: string;
}
