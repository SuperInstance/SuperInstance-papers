/**
 * Formula Engine - Public API
 *
 * POLLN Spreadsheet Formula Parser and Evaluator
 * Excel-compatible formula parsing and evaluation system.
 *
 * @example
 * ```typescript
 * import { FormulaParser, FormulaEvaluator } from '@polln/spreadsheet/formula';
 *
 * // Create parser and evaluator
 * const parser = new FormulaParser();
 * const evaluator = new FormulaEvaluator();
 *
 * // Parse a formula
 * const parsed = parser.parse('=SUM(A1,B2,C3)');
 *
 * // Create evaluation context
 * const context = {
 *   getCellValue: (ref) => {
 *     // Return cell values
 *   },
 *   getRangeValue: (ref) => {
 *     // Return range values
 *   },
 *   getNamedValue: (name) => {
 *     // Return named values
 *   },
 * };
 *
 * // Evaluate the formula
 * const result = evaluator.evaluate(parsed, context);
 * console.log(result.value); // Result of SUM
 * ```
 */

// ============================================================================
// Core Classes
// ============================================================================

export { FormulaParser } from './FormulaParser.js';
export { FormulaEvaluator } from './FormulaEvaluator.js';
export { FunctionRegistry } from './FunctionRegistry.js';
export { Tokenizer } from './Tokenizer.js';
export { ASTBuilder } from './ASTBuilder.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type {
  // Core types
  ParsedFormula,
  EvaluationContext,
  FormulaResult,
  CellValue,
  ValidationResult,
  FormulaWarning,

  // AST nodes
  ASTNode,
  NumberLiteralNode,
  StringLiteralNode,
  BooleanLiteralNode,
  ErrorLiteralNode,
  CellReferenceNode,
  RangeReferenceNode,
  NamedReferenceNode,
  BinaryOperationNode,
  UnaryOperationNode,
  FunctionCallNode,
  ArrayLiteralNode,

  // Tokens
  Token,

  // Errors
  FormulaError,

  // Functions
  FunctionSignature,
  FunctionImplementation,
} from './types.js';

// ============================================================================
// Enums
// ============================================================================

export {
  TokenType,
  ASTNodeType,
  BinaryOperator,
  UnaryOperator,
  ValueType,
  ErrorType,
  Precedence,
  FunctionCategory,
} from './types.js';

// ============================================================================
// Convenience Factory Functions
// ============================================================================

import { FormulaParser as Parser } from './FormulaParser.js';
import { FormulaEvaluator as Evaluator } from './FormulaEvaluator.js';
import { FunctionRegistry as Registry } from './FunctionRegistry.js';

/**
 * Create a formula parser with optional custom function registry
 */
export function createFormulaParser(functionRegistry?: Registry): Parser {
  return new Parser(functionRegistry);
}

/**
 * Create a formula evaluator with optional custom function registry
 */
export function createFormulaEvaluator(functionRegistry?: Registry): Evaluator {
  return new Evaluator(functionRegistry);
}

/**
 * Create a function registry with all built-in functions
 */
export function createFunctionRegistry(): Registry {
  return new Registry();
}

/**
 * Parse and evaluate a formula in one step
 *
 * @param formula - Formula string (with or without leading '=')
 * @param context - Evaluation context with cell/range values
 * @returns Evaluation result
 *
 * @example
 * ```typescript
 * const result = evaluateFormula('SUM(A1,B2)', {
 *   getCellValue: (ref) => ref === 'A1' ? 10 : 20,
 *   getRangeValue: () => [[]],
 *   getNamedValue: () => undefined,
 * });
 * console.log(result.value); // 30
 * ```
 */
export function evaluateFormula(
  formula: string,
  context: EvaluationContext
): FormulaResult {
  const parser = createFormulaParser();
  const evaluator = createFormulaEvaluator();

  const parsed = parser.parse(formula);
  return evaluator.evaluate(parsed, context);
}

/**
 * Validate a formula without evaluating it
 *
 * @param formula - Formula string to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validateFormula('SUM(A1,B2');
 * if (!result.valid) {
 *   console.error('Formula errors:', result.errors);
 * }
 * ```
 */
export function validateFormula(formula: string): ValidationResult {
  const parser = createFormulaParser();
  return parser.validate(formula);
}

/**
 * Extract cell dependencies from a formula
 *
 * @param formula - Formula string
 * @returns Array of cell reference strings
 *
 * @example
 * ```typescript
 * const deps = getDependencies('SUM(A1,B2)+C3');
 * console.log(deps); // ['A1', 'B2', 'C3']
 * ```
 */
export function getDependencies(formula: string): string[] {
  const parser = createFormulaParser();
  return parser.getDependencies(formula);
}

/**
 * Register a custom function
 *
 * @param name - Function name
 * @param implementation - Function implementation
 * @param signature - Function signature for type checking
 *
 * @example
 * ```typescript
 * registerFunction(
 *   'MYFUNCTION',
 *   (x, y) => x * 2 + y,
 *   {
 *     name: 'MYFUNCTION',
 *     minArgs: 2,
 *     maxArgs: 2,
 *     variadic: false,
 *     returnType: ValueType.NUMBER,
 *     description: 'Doubles x and adds y',
 *     category: FunctionCategory.MATH,
 *   }
 * );
 * ```
 */
export function registerFunction(
  name: string,
  implementation: (...args: any[]) => any,
  signature: Partial<FunctionSignature> & { name: string }
): void {
  const registry = createFunctionRegistry();
  registry.register({
    signature: {
      minArgs: 0,
      maxArgs: 0,
      variadic: false,
      returnType: ValueType.EMPTY,
      description: '',
      category: FunctionCategory.MATH,
      ...signature,
    },
    implementation,
  });
}

// Re-import FunctionSignature type for use in registerFunction
import type { FunctionSignature } from './types.js';
