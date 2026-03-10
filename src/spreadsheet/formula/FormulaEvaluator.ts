/**
 * Formula Evaluator
 *
 * Evaluates parsed formulas with context and dependency resolution.
 * Handles circular reference detection and provides detailed results.
 */

import { FunctionRegistry } from './FunctionRegistry.js';
import {
  ParsedFormula,
  EvaluationContext,
  FormulaResult,
  CellValue,
  ValueType,
  FormulaError,
  ErrorType,
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
  BinaryOperator,
  UnaryOperator,
} from './types.js';

/**
 * Evaluation state for tracking circular references
 */
interface EvaluationState {
  currentCell: string;
  evaluating: Set<string>;
  dependencies: Set<string>;
}

/**
 * Formula Evaluator
 *
 * Evaluates formulas with context and tracks dependencies.
 */
export class FormulaEvaluator {
  private functionRegistry: FunctionRegistry;

  constructor(functionRegistry?: FunctionRegistry) {
    this.functionRegistry = functionRegistry || new FunctionRegistry();
  }

  /**
   * Evaluate a parsed formula with context
   */
  evaluate(formula: ParsedFormula, context: EvaluationContext): FormulaResult {
    const state: EvaluationState = {
      currentCell: context.currentCell || '',
      evaluating: new Set(),
      dependencies: new Set(),
    };

    // Add current cell to evaluation stack
    if (state.currentCell) {
      state.evaluating.add(state.currentCell);
    }

    try {
      const value = this.evaluateNode(formula.ast, context, state);
      const type = this.getValueType(value);
      const error = this.extractError(value);

      return {
        value,
        error,
        type,
        dependencies: Array.from(state.dependencies),
      };
    } catch (err) {
      return {
        value: this.errorToString(ErrorType.VALUE, err instanceof Error ? err.message : 'Evaluation error'),
        error: {
          type: ErrorType.VALUE,
          message: err instanceof Error ? err.message : 'Unknown error',
        },
        type: ValueType.ERROR,
        dependencies: Array.from(state.dependencies),
      };
    }
  }

  /**
   * Evaluate multiple formulas in batch
   */
  evaluateBatch(formulas: ParsedFormula[], context: EvaluationContext): FormulaResult[] {
    return formulas.map((formula) => this.evaluate(formula, context));
  }

  /**
   * Evaluate a single AST node
   */
  private evaluateNode(
    node: ASTNode,
    context: EvaluationContext,
    state: EvaluationState
  ): CellValue {
    switch (node.type) {
      case 'NUMBER_LITERAL':
        return this.evaluateNumberLiteral(node as NumberLiteralNode);

      case 'STRING_LITERAL':
        return this.evaluateStringLiteral(node as StringLiteralNode);

      case 'BOOLEAN_LITERAL':
        return this.evaluateBooleanLiteral(node as BooleanLiteralNode);

      case 'ERROR_LITERAL':
        return this.evaluateErrorLiteral(node as ErrorLiteralNode);

      case 'CELL_REFERENCE':
        return this.evaluateCellReference(node as CellReferenceNode, context, state);

      case 'RANGE_REFERENCE':
        return this.evaluateRangeReference(node as RangeReferenceNode, context, state);

      case 'NAMED_REFERENCE':
        return this.evaluateNamedReference(node as NamedReferenceNode, context, state);

      case 'BINARY_OPERATION':
        return this.evaluateBinaryOperation(node as BinaryOperationNode, context, state);

      case 'UNARY_OPERATION':
        return this.evaluateUnaryOperation(node as UnaryOperationNode, context, state);

      case 'FUNCTION_CALL':
        return this.evaluateFunctionCall(node as FunctionCallNode, context, state);

      default:
        return this.errorToString(ErrorType.VALUE, `Unknown node type: ${node.type}`);
    }
  }

  /**
   * Evaluate a number literal
   */
  private evaluateNumberLiteral(node: NumberLiteralNode): number {
    return node.value;
  }

  /**
   * Evaluate a string literal
   */
  private evaluateStringLiteral(node: StringLiteralNode): string {
    return node.value;
  }

  /**
   * Evaluate a boolean literal
   */
  private evaluateBooleanLiteral(node: BooleanLiteralNode): boolean {
    return node.value;
  }

  /**
   * Evaluate an error literal
   */
  private evaluateErrorLiteral(node: ErrorLiteralNode): string {
    return node.value;
  }

  /**
   * Evaluate a cell reference
   */
  private evaluateCellReference(
    node: CellReferenceNode,
    context: EvaluationContext,
    state: EvaluationState
  ): CellValue {
    const ref = this.formatCellReference(node);

    // Track dependency
    state.dependencies.add(ref);
    context.onAccessCell?.(ref);

    // Check for circular reference
    if (state.evaluating.has(ref)) {
      return this.errorToString(ErrorType.CIRCULAR, `Circular reference detected: ${ref}`);
    }

    // Check if cell is being evaluated
    if (context.isEvaluating?.(ref)) {
      return this.errorToString(ErrorType.CIRCULAR, `Circular reference detected: ${ref}`);
    }

    // Get cell value
    try {
      return context.getCellValue(ref);
    } catch (err) {
      return this.errorToString(ErrorType.REFERENCE, `Cannot resolve reference: ${ref}`);
    }
  }

  /**
   * Evaluate a range reference
   */
  private evaluateRangeReference(
    node: RangeReferenceNode,
    context: EvaluationContext,
    state: EvaluationState
  ): CellValue {
    const ref = this.formatRangeReference(node);

    // Track dependency
    state.dependencies.add(ref);
    context.onAccessCell?.(ref);

    try {
      return context.getRangeValue(ref);
    } catch (err) {
      return this.errorToString(ErrorType.REFERENCE, `Cannot resolve range: ${ref}`);
    }
  }

  /**
   * Evaluate a named reference
   */
  private evaluateNamedReference(
    node: NamedReferenceNode,
    context: EvaluationContext,
    state: EvaluationState
  ): CellValue {
    const name = node.name;

    // Track dependency
    state.dependencies.add(name);
    context.onAccessCell?.(name);

    const value = context.getNamedValue(name);

    if (value === undefined) {
      return this.errorToString(ErrorType.NAME, `Unknown name: ${name}`);
    }

    return value;
  }

  /**
   * Evaluate a binary operation
   */
  private evaluateBinaryOperation(
    node: BinaryOperationNode,
    context: EvaluationContext,
    state: EvaluationState
  ): CellValue {
    const left = this.evaluateNode(node.left, context, state);
    const right = this.evaluateNode(node.right, context, state);

    // Short-circuit if either side is an error
    if (this.isError(left)) return left;
    if (this.isError(right)) return right;

    switch (node.operator) {
      case BinaryOperator.ADD:
        return this.evaluateAdd(left, right);

      case BinaryOperator.SUBTRACT:
        return this.evaluateSubtract(left, right);

      case BinaryOperator.MULTIPLY:
        return this.evaluateMultiply(left, right);

      case BinaryOperator.DIVIDE:
        return this.evaluateDivide(left, right);

      case BinaryOperator.POWER:
        return this.evaluatePower(left, right);

      case BinaryOperator.CONCATENATE:
        return this.evaluateConcatenate(left, right);

      case BinaryOperator.EQUAL:
        return this.evaluateEqual(left, right);

      case BinaryOperator.NOT_EQUAL:
        return this.evaluateNotEqual(left, right);

      case BinaryOperator.LESS_THAN:
        return this.evaluateLessThan(left, right);

      case BinaryOperator.LESS_EQUAL:
        return this.evaluateLessEqual(left, right);

      case BinaryOperator.GREATER_THAN:
        return this.evaluateGreaterThan(left, right);

      case BinaryOperator.GREATER_EQUAL:
        return this.evaluateGreaterEqual(left, right);

      default:
        return this.errorToString(ErrorType.VALUE, `Unknown operator: ${node.operator}`);
    }
  }

  /**
   * Evaluate a unary operation
   */
  private evaluateUnaryOperation(
    node: UnaryOperationNode,
    context: EvaluationContext,
    state: EvaluationState
  ): CellValue {
    const operand = this.evaluateNode(node.operand, context, state);

    // Short-circuit if operand is an error
    if (this.isError(operand)) return operand;

    switch (node.operator) {
      case UnaryOperator.NEGATE:
        return this.evaluateNegate(operand);

      case UnaryOperator.PLUS:
        return this.evaluateUnaryPlus(operand);

      case UnaryOperator.PERCENT:
        return this.evaluatePercent(operand);

      case UnaryOperator.LOGICAL_NOT:
        return this.evaluateLogicalNot(operand);

      default:
        return this.errorToString(ErrorType.VALUE, `Unknown operator: ${node.operator}`);
    }
  }

  /**
   * Evaluate a function call
   */
  private evaluateFunctionCall(
    node: FunctionCallNode,
    context: EvaluationContext,
    state: EvaluationState
  ): CellValue {
    const name = node.name;
    const args = node.arguments.map((arg) => this.evaluateNode(arg, context, state));

    // Check if any argument is an error
    for (const arg of args) {
      if (this.isError(arg)) return arg;
    }

    return this.functionRegistry.execute(name, args);
  }

  // ==========================================================================
  // Binary Operations
  // ==========================================================================

  private evaluateAdd(left: CellValue, right: CellValue): CellValue {
    if (typeof left === 'number' && typeof right === 'number') {
      return left + right;
    }

    if (typeof left === 'string' || typeof right === 'string') {
      return String(left ?? '') + String(right ?? '');
    }

    return this.errorToString(ErrorType.VALUE, 'Cannot add these types');
  }

  private evaluateSubtract(left: CellValue, right: CellValue): CellValue {
    if (typeof left === 'number' && typeof right === 'number') {
      return left - right;
    }

    return this.errorToString(ErrorType.VALUE, 'Cannot subtract these types');
  }

  private evaluateMultiply(left: CellValue, right: CellValue): CellValue {
    if (typeof left === 'number' && typeof right === 'number') {
      return left * right;
    }

    return this.errorToString(ErrorType.VALUE, 'Cannot multiply these types');
  }

  private evaluateDivide(left: CellValue, right: CellValue): CellValue {
    if (typeof left === 'number' && typeof right === 'number') {
      if (right === 0) {
        return this.errorToString(ErrorType.DIVIDE_BY_ZERO, 'Division by zero');
      }
      return left / right;
    }

    return this.errorToString(ErrorType.VALUE, 'Cannot divide these types');
  }

  private evaluatePower(left: CellValue, right: CellValue): CellValue {
    if (typeof left === 'number' && typeof right === 'number') {
      return Math.pow(left, right);
    }

    return this.errorToString(ErrorType.VALUE, 'Cannot power these types');
  }

  private evaluateConcatenate(left: CellValue, right: CellValue): CellValue {
    return String(left ?? '') + String(right ?? '');
  }

  private evaluateEqual(left: CellValue, right: CellValue): CellValue {
    return this.compareValues(left, right, (a, b) => a === b);
  }

  private evaluateNotEqual(left: CellValue, right: CellValue): CellValue {
    return this.compareValues(left, right, (a, b) => a !== b);
  }

  private evaluateLessThan(left: CellValue, right: CellValue): CellValue {
    return this.compareValues(left, right, (a, b) => a < b);
  }

  private evaluateLessEqual(left: CellValue, right: CellValue): CellValue {
    return this.compareValues(left, right, (a, b) => a <= b);
  }

  private evaluateGreaterThan(left: CellValue, right: CellValue): CellValue {
    return this.compareValues(left, right, (a, b) => a > b);
  }

  private evaluateGreaterEqual(left: CellValue, right: CellValue): CellValue {
    return this.compareValues(left, right, (a, b) => a >= b);
  }

  // ==========================================================================
  // Unary Operations
  // ==========================================================================

  private evaluateNegate(operand: CellValue): CellValue {
    if (typeof operand === 'number') {
      return -operand;
    }
    return this.errorToString(ErrorType.VALUE, 'Cannot negate this type');
  }

  private evaluateUnaryPlus(operand: CellValue): CellValue {
    if (typeof operand === 'number') {
      return +operand;
    }
    return this.errorToString(ErrorType.VALUE, 'Cannot apply unary plus to this type');
  }

  private evaluatePercent(operand: CellValue): CellValue {
    if (typeof operand === 'number') {
      return operand / 100;
    }
    return this.errorToString(ErrorType.VALUE, 'Cannot apply percent to this type');
  }

  private evaluateLogicalNot(operand: CellValue): CellValue {
    return !this.toBoolean(operand);
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Compare two values with a comparison function
   */
  private compareValues(
    left: CellValue,
    right: CellValue,
    compare: (a: any, b: any) => boolean
  ): boolean {
    // Handle null/empty values
    if (left === null || left === undefined || right === null || right === undefined) {
      return compare(left, right);
    }

    // Compare numbers
    if (typeof left === 'number' && typeof right === 'number') {
      return compare(left, right);
    }

    // Compare strings
    if (typeof left === 'string' && typeof right === 'string') {
      return compare(left.toLowerCase(), right.toLowerCase());
    }

    // Compare booleans
    if (typeof left === 'boolean' && typeof right === 'boolean') {
      return compare(left, right);
    }

    // Try to coerce to numbers for comparison
    const leftNum = typeof left === 'number' ? left : parseFloat(String(left));
    const rightNum = typeof right === 'number' ? right : parseFloat(String(right));

    if (!isNaN(leftNum) && !isNaN(rightNum)) {
      return compare(leftNum, rightNum);
    }

    return false;
  }

  /**
   * Convert a value to boolean
   */
  private toBoolean(value: CellValue): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes';
    }
    return false;
  }

  /**
   * Get the type of a value
   */
  private getValueType(value: CellValue): ValueType {
    if (this.isError(value)) return ValueType.ERROR;
    if (value === null || value === undefined) return ValueType.EMPTY;
    if (typeof value === 'number') return ValueType.NUMBER;
    if (typeof value === 'string') return ValueType.STRING;
    if (typeof value === 'boolean') return ValueType.BOOLEAN;
    if (Array.isArray(value)) return ValueType.ARRAY;
    return ValueType.EMPTY;
  }

  /**
   * Check if a value is an error
   */
  private isError(value: CellValue): boolean {
    if (typeof value === 'string') {
      return value.startsWith('#') && value.endsWith('!');
    }
    return false;
  }

  /**
   * Extract error from value if it's an error
   */
  private extractError(value: CellValue): FormulaError | undefined {
    if (!this.isError(value)) return undefined;

    const errorStr = String(value);
    const type = this.errorStringToType(errorStr);

    return {
      type,
      message: errorStr,
    };
  }

  /**
   * Map error string to ErrorType
   */
  private errorStringToType(error: string): ErrorType {
    const errorMap: Record<string, ErrorType> = {
      '#NULL!': ErrorType.VALUE,
      '#DIV/0!': ErrorType.DIVIDE_BY_ZERO,
      '#VALUE!': ErrorType.VALUE,
      '#REF!': ErrorType.REFERENCE,
      '#NAME?': ErrorType.NAME,
      '#NUM!': ErrorType.NUM,
      '#N/A': ErrorType.NA,
      '#CIRCULAR!': ErrorType.CIRCULAR,
    };

    return errorMap[error] || ErrorType.VALUE;
  }

  /**
   * Create an error string
   */
  private errorToString(type: ErrorType, message: string): string {
    const errorMap: Record<ErrorType, string> = {
      [ErrorType.SYNTAX]: '#VALUE!',
      [ErrorType.REFERENCE]: '#REF!',
      [ErrorType.DIVIDE_BY_ZERO]: '#DIV/0!',
      [ErrorType.VALUE]: '#VALUE!',
      [ErrorType.NAME]: '#NAME?',
      [ErrorType.NUM]: '#NUM!',
      [ErrorType.NA]: '#N/A',
      [ErrorType.CIRCULAR]: '#CIRCULAR!',
      [ErrorType.INVALID_OPERATOR]: '#VALUE!',
      [ErrorType.INVALID_ARGUMENT]: '#VALUE!',
      [ErrorType.MISSING_ARGUMENT]: '#VALUE!',
    };

    return errorMap[type] || '#VALUE!';
  }

  /**
   * Format a cell reference
   */
  private formatCellReference(node: CellReferenceNode): string {
    const sheet = node.sheet ? `${node.sheet}!` : '';
    const col = node.absolute.column ? `$${node.column}` : node.column;
    const row = node.absolute.row ? `$${node.row}` : node.row;
    return `${sheet}${col}${row}`;
  }

  /**
   * Format a range reference
   */
  private formatRangeReference(node: RangeReferenceNode): string {
    const sheet = node.sheet ? `${node.sheet}!` : '';
    const startCol = node.start.absolute.column ? `$${node.start.column}` : node.start.column;
    const startRow = node.start.absolute.row ? `$${node.start.row}` : node.start.row;
    const endCol = node.end.absolute.column ? `$${node.end.column}` : node.end.column;
    const endRow = node.end.absolute.row ? `$${node.end.row}` : node.end.row;
    return `${sheet}${startCol}${startRow}:${endCol}${endRow}`;
  }
}
