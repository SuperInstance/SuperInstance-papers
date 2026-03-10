/**
 * Formula Engine Type Definitions
 *
 * Core types and interfaces for the POLLN spreadsheet formula system.
 * Provides Excel-compatible formula parsing and evaluation.
 */

/**
 * Token types produced by the tokenizer
 */
export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  ERROR = 'ERROR',

  // Identifiers
  CELL_REFERENCE = 'CELL_REFERENCE',
  RANGE_REFERENCE = 'RANGE_REFERENCE',
  FUNCTION_NAME = 'FUNCTION_NAME',
  NAMED_RANGE = 'NAMED_RANGE',

  // Operators
  PLUS = 'PLUS',           // +
  MINUS = 'MINUS',         // -
  MULTIPLY = 'MULTIPLY',   // *
  DIVIDE = 'DIVIDE',       // /
  POWER = 'POWER',         // ^
  CONCATENATE = 'CONCATENATE', // &
  PERCENT = 'PERCENT',     // %

  // Comparison operators
  EQUAL = 'EQUAL',         // =
  NOT_EQUAL = 'NOT_EQUAL', // <>
  LESS_THAN = 'LESS_THAN', // <
  LESS_EQUAL = 'LESS_EQUAL', // <=
  GREATER_THAN = 'GREATER_THAN', // >
  GREATER_EQUAL = 'GREATER_EQUAL', // >=

  // Logical operators
  LOGICAL_NOT = 'LOGICAL_NOT', // NOT
  LOGICAL_AND = 'LOGICAL_AND', // AND
  LOGICAL_OR = 'LOGICAL_OR',   // OR

  // Punctuation
  LEFT_PAREN = 'LEFT_PAREN',   // (
  RIGHT_PAREN = 'RIGHT_PAREN', // )
  COMMA = 'COMMA',             // ,
  COLON = 'COLON',             // :
  SEMICOLON = 'SEMICOLON',     // ;
  BANG = 'BANG',               // !

  // Special
  WHITESPACE = 'WHITESPACE',
  EOF = 'EOF',
}

/**
 * Token produced by lexical analysis
 */
export interface Token {
  type: TokenType;
  value: string;
  position: number;
  length: number;
}

/**
 * AST node types
 */
export enum ASTNodeType {
  // Literal nodes
  NUMBER_LITERAL = 'NUMBER_LITERAL',
  STRING_LITERAL = 'STRING_LITERAL',
  BOOLEAN_LITERAL = 'BOOLEAN_LITERAL',
  ERROR_LITERAL = 'ERROR_LITERAL',

  // Reference nodes
  CELL_REFERENCE = 'CELL_REFERENCE',
  RANGE_REFERENCE = 'RANGE_REFERENCE',
  NAMED_REFERENCE = 'NAMED_REFERENCE',

  // Operator nodes
  BINARY_OPERATION = 'BINARY_OPERATION',
  UNARY_OPERATION = 'UNARY_OPERATION',

  // Function nodes
  FUNCTION_CALL = 'FUNCTION_CALL',

  // Array nodes
  ARRAY_LITERAL = 'ARRAY_LITERAL',
}

/**
 * Base AST node interface
 */
export interface ASTNode {
  type: ASTNodeType;
  position: number;
}

/**
 * Number literal node
 */
export interface NumberLiteralNode extends ASTNode {
  type: ASTNodeType.NUMBER_LITERAL;
  value: number;
}

/**
 * String literal node
 */
export interface StringLiteralNode extends ASTNode {
  type: ASTNodeType.STRING_LITERAL;
  value: string;
}

/**
 * Boolean literal node
 */
export interface BooleanLiteralNode extends ASTNode {
  type: ASTNodeType.BOOLEAN_LITERAL;
  value: boolean;
}

/**
 * Error literal node
 */
export interface ErrorLiteralNode extends ASTNode {
  type: ASTNodeType.ERROR_LITERAL;
  value: string; // #NULL!, #DIV/0!, #VALUE!, #REF!, #NAME?, #NUM!, #N/A
}

/**
 * Cell reference node
 */
export interface CellReferenceNode extends ASTNode {
  type: ASTNodeType.CELL_REFERENCE;
  sheet?: string;
  column: string; // A, B, C, ..., AA, AB, ...
  row: number;
  absolute: {
    sheet: boolean;
    column: boolean;
    row: boolean;
  };
}

/**
 * Range reference node
 */
export interface RangeReferenceNode extends ASTNode {
  type: ASTNodeType.RANGE_REFERENCE;
  sheet?: string;
  start: {
    column: string;
    row: number;
    absolute: { column: boolean; row: boolean };
  };
  end: {
    column: string;
    row: number;
    absolute: { column: boolean; row: boolean };
  };
}

/**
 * Named reference node
 */
export interface NamedReferenceNode extends ASTNode {
  type: ASTNodeType.NAMED_REFERENCE;
  name: string;
}

/**
 * Binary operation node
 */
export interface BinaryOperationNode extends ASTNode {
  type: ASTNodeType.BINARY_OPERATION;
  operator: BinaryOperator;
  left: ASTNode;
  right: ASTNode;
}

/**
 * Binary operators
 */
export enum BinaryOperator {
  ADD = '+',
  SUBTRACT = '-',
  MULTIPLY = '*',
  DIVIDE = '/',
  POWER = '^',
  CONCATENATE = '&',
  EQUAL = '=',
  NOT_EQUAL = '<>',
  LESS_THAN = '<',
  LESS_EQUAL = '<=',
  GREATER_THAN = '>',
  GREATER_EQUAL = '>=',
}

/**
 * Unary operation node
 */
export interface UnaryOperationNode extends ASTNode {
  type: ASTNodeType.UNARY_OPERATION;
  operator: UnaryOperator;
  operand: ASTNode;
}

/**
 * Unary operators
 */
export enum UnaryOperator {
  NEGATE = '-',
  PLUS = '+',
  PERCENT = '%',
  LOGICAL_NOT = 'NOT',
}

/**
 * Function call node
 */
export interface FunctionCallNode extends ASTNode {
  type: ASTNodeType.FUNCTION_CALL;
  name: string;
  arguments: ASTNode[];
}

/**
 * Array literal node
 */
export interface ArrayLiteralNode extends ASTNode {
  type: ASTNodeType.ARRAY_LITERAL;
  rows: ASTNode[][];
}

/**
 * Union type for all AST nodes
 */
export type FormulaAST = ASTNode;

/**
 * Parsed formula result
 */
export interface ParsedFormula {
  ast: FormulaAST;
  dependencies: CellReference[];
  hasCircularRef: boolean;
  errors: FormulaError[];
  tokens: Token[];
}

/**
 * Cell reference for dependency tracking
 */
export interface CellReference {
  sheet?: string;
  column: string;
  row: number;
  toString(): string;
}

/**
 * Evaluation context for formula evaluation
 */
export interface EvaluationContext {
  /**
   * Get the value of a cell reference
   */
  getCellValue(ref: string): CellValue;

  /**
   * Get values from a range reference
   */
  getRangeValue(ref: string): CellValue[][];

  /**
   * Get a named range or value
   */
  getNamedValue(name: string): CellValue | undefined;

  /**
   * Set a cell value (for circular ref detection)
   */
  setCellValue?(ref: string, value: CellValue): void;

  /**
   * Check if a cell is currently being evaluated (circular ref detection)
   */
  isEvaluating?(ref: string): boolean;

  /**
   * Optional callback for dependency tracking
   */
  onAccessCell?(ref: string): void;

  /**
   * Current cell being evaluated
   */
  currentCell?: string;
}

/**
 * Cell value types
 */
export type CellValue = number | string | boolean | null | CellValue[] | CellValue[][];

/**
 * Formula evaluation result
 */
export interface FormulaResult {
  value: CellValue;
  error?: FormulaError;
  type: ValueType;
  dependencies: string[];
}

/**
 * Value type enumeration
 */
export enum ValueType {
  NUMBER = 'number',
  STRING = 'string',
  BOOLEAN = 'boolean',
  ERROR = 'error',
  ARRAY = 'array',
  EMPTY = 'empty',
}

/**
 * Formula error types
 */
export enum ErrorType {
  SYNTAX = 'SYNTAX',
  REFERENCE = 'REFERENCE',
  DIVIDE_BY_ZERO = 'DIVIDE_BY_ZERO',
  VALUE = 'VALUE',
  NAME = 'NAME',
  NUM = 'NUM',
  NA = 'NA',
  CIRCULAR = 'CIRCULAR',
  INVALID_OPERATOR = 'INVALID_OPERATOR',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  MISSING_ARGUMENT = 'MISSING_ARGUMENT',
}

/**
 * Formula error
 */
export interface FormulaError {
  type: ErrorType;
  message: string;
  token?: Token;
  position?: number;
  suggestion?: string;
}

/**
 * Validation result for formula parsing
 */
export interface ValidationResult {
  valid: boolean;
  errors: FormulaError[];
  warnings: FormulaWarning[];
}

/**
 * Formula warning
 */
export interface FormulaWarning {
  type: string;
  message: string;
  position?: number;
  suggestion?: string;
}

/**
 * Operator precedence (higher = tighter binding)
 */
export enum Precedence {
  REFERENCE = 1,
  LOGICAL_OR = 2,
  LOGICAL_AND = 3,
  COMPARISON = 4,
  CONCATENATION = 5,
  ADDITIVE = 6,
  MULTIPLICATIVE = 7,
  EXPONENT = 8,
  UNARY = 9,
  FUNCTION_CALL = 10,
}

/**
 * Function signature for type checking
 */
export interface FunctionSignature {
  name: string;
  minArgs: number;
  maxArgs: number;
  variadic: boolean;
  argTypes?: ValueType[];
  returnType: ValueType;
  description: string;
  category: FunctionCategory;
}

/**
 * Function categories
 */
export enum FunctionCategory {
  MATH = 'Math',
  STATISTICAL = 'Statistical',
  TEXT = 'Text',
  LOGICAL = 'Logical',
  DATE_TIME = 'Date & Time',
  LOOKUP = 'Lookup',
  FINANCIAL = 'Financial',
  INFORMATION = 'Information',
  ENGINEERING = 'Engineering',
  DATABASE = 'Database',
  CUBE = 'Cube',
  WEB = 'Web',
}

/**
 * Function implementation
 */
export interface FunctionImplementation {
  signature: FunctionSignature;
  implementation: (...args: CellValue[]) => CellValue;
  validate?: (...args: CellValue[]) => FormulaError | null;
}

/**
 * Range information
 */
export interface Range {
  sheet?: string;
  startColumn: string;
  startRow: number;
  endColumn: string;
  endRow: number;
  toString(): string;
}
