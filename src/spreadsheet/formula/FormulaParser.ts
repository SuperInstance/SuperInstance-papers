/**
 * Formula Parser
 *
 * Main parser interface that orchestrates tokenization, AST building,
 * validation, and dependency extraction.
 */

import { Tokenizer } from './Tokenizer.js';
import { ASTBuilder } from './ASTBuilder.js';
import { FunctionRegistry } from './FunctionRegistry.js';
import {
  Token,
  ParsedFormula,
  FormulaError,
  ValidationResult,
  FormulaWarning,
  CellReference as CellRef,
  ASTNode,
  CellReferenceNode,
  RangeReferenceNode,
  NamedReferenceNode,
  ErrorType,
  ErrorLiteralNode,
} from './types.js';

/**
 * Cell reference with toString method
 */
class CellReferenceImpl implements CellRef {
  constructor(
    public sheet: string | undefined,
    public column: string,
    public row: number
  ) {}

  toString(): string {
    if (this.sheet) {
      return `${this.sheet}!${this.column}${this.row}`;
    }
    return `${this.column}${this.row}`;
  }
}

/**
 * Formula Parser
 *
 * Orchestrates the parsing pipeline:
 * 1. Tokenization
 * 2. AST Building
 * 3. Validation
 * 4. Dependency Extraction
 */
export class FormulaParser {
  private functionRegistry: FunctionRegistry;

  constructor(functionRegistry?: FunctionRegistry) {
    this.functionRegistry = functionRegistry || new FunctionRegistry();
  }

  /**
   * Parse a formula string into a ParsedFormula
   */
  parse(formula: string): ParsedFormula {
    // Tokenize
    const tokens = this.tokenize(formula);

    // Check for tokenization errors
    const tokenErrors = this.extractTokenErrors(tokens);
    if (tokenErrors.length > 0) {
      return {
        ast: this.createErrorNode(ErrorType.SYNTAX, 'Tokenization failed', 0),
        dependencies: [],
        hasCircularRef: false,
        errors: tokenErrors,
        tokens,
      };
    }

    // Build AST
    const astBuilder = new ASTBuilder(tokens);
    const ast = astBuilder.build();

    // Check if AST is an error
    const astErrors = this.extractASTErrors(ast);
    if (astErrors.length > 0) {
      return {
        ast,
        dependencies: [],
        hasCircularRef: false,
        errors: astErrors,
        tokens,
      };
    }

    // Extract dependencies
    const dependencies = this.extractDependencies(ast);

    // Validate
    const validationErrors = this.validateAST(ast);
    const warnings = this.generateWarnings(ast, tokens);

    return {
      ast,
      dependencies,
      hasCircularRef: this.detectCircularReference(ast),
      errors: validationErrors,
      tokens,
    };
  }

  /**
   * Validate a formula string without parsing
   */
  validate(formula: string): ValidationResult {
    const parsed = this.parse(formula);

    return {
      valid: parsed.errors.length === 0,
      errors: parsed.errors,
      warnings: [], // Warnings generated separately
    };
  }

  /**
   * Tokenize a formula string
   */
  tokenize(formula: string): Token[] {
    // Remove leading '=' if present
    if (formula.startsWith('=')) {
      formula = formula.substring(1);
    }

    const tokenizer = new Tokenizer(formula);
    return tokenizer.tokenize();
  }

  /**
   * Extract cell dependencies from an AST
   */
  getDependencies(formula: string): string[] {
    const parsed = this.parse(formula);
    return parsed.dependencies.map((dep) => dep.toString());
  }

  /**
   * Tokenize and return tokens only
   */
  getTokens(formula: string): Token[] {
    return this.tokenize(formula);
  }

  /**
   * Extract token errors
   */
  private extractTokenErrors(tokens: Token[]): FormulaError[] {
    return tokens
      .filter((t) => t.type === 'ERROR')
      .map(
        (t) =>
          ({
            type: ErrorType.SYNTAX,
            message: t.value,
            position: t.position,
          } as FormulaError)
      );
  }

  /**
   * Extract errors from AST
   */
  private extractASTErrors(ast: ASTNode): FormulaError[] {
    const errors: FormulaError[] = [];

    const traverse = (node: ASTNode) => {
      if (node.type === 'ERROR_LITERAL') {
        const errorNode = node as ErrorLiteralNode;
        errors.push({
          type: this.mapErrorCodeToType(errorNode.value),
          message: `Formula error: ${errorNode.value}`,
          position: node.position,
        });
      }

      // Recurse into child nodes
      if ('left' in node) traverse((node as any).left);
      if ('right' in node) traverse((node as any).right);
      if ('operand' in node) traverse((node as any).operand);
      if ('arguments' in node) {
        for (const arg of (node as any).arguments) {
          traverse(arg);
        }
      }
    };

    traverse(ast);
    return errors;
  }

  /**
   * Validate AST
   */
  private validateAST(ast: ASTNode): FormulaError[] {
    const errors: FormulaError[] = [];

    const traverse = (node: ASTNode) => {
      // Validate function calls
      if (node.type === 'FUNCTION_CALL') {
        const funcCall = node as any;
        const func = this.functionRegistry.get(funcCall.name);

        if (!func) {
          errors.push({
            type: ErrorType.NAME,
            message: `Unknown function: ${funcCall.name}`,
            position: node.position,
          });
        } else {
          // Validate arguments
          const validationError = this.functionRegistry.validate(
            funcCall.name,
            funcCall.arguments.map(() => 0) // Dummy values for validation
          );

          if (validationError) {
            errors.push(validationError);
          }
        }
      }

      // Recurse into child nodes
      if ('left' in node) traverse((node as any).left);
      if ('right' in node) traverse((node as any).right);
      if ('operand' in node) traverse((node as any).operand);
      if ('arguments' in node) {
        for (const arg of (node as any).arguments) {
          traverse(arg);
        }
      }
    };

    traverse(ast);
    return errors;
  }

  /**
   * Generate warnings
   */
  private generateWarnings(ast: ASTNode, tokens: Token[]): FormulaWarning[] {
    const warnings: FormulaWarning[] = [];

    // Check for hardcoded values
    const traverse = (node: ASTNode) => {
      if (node.type === 'NUMBER_LITERAL') {
        // Could suggest using a cell reference instead
        const numNode = node as any;
        if (numNode.value > 1000 || numNode.value < -1000) {
          warnings.push({
            type: 'HARDCODED_VALUE',
            message: 'Consider using a cell reference instead of hardcoded value',
            position: node.position,
            suggestion: 'Move value to a cell and reference it',
          });
        }
      }

      if ('left' in node) traverse((node as any).left);
      if ('right' in node) traverse((node as any).right);
      if ('operand' in node) traverse((node as any).operand);
      if ('arguments' in node) {
        for (const arg of (node as any).arguments) {
          traverse(arg);
        }
      }
    };

    traverse(ast);
    return warnings;
  }

  /**
   * Extract cell dependencies from AST
   */
  private extractDependencies(ast: ASTNode): CellRef[] {
    const dependencies: CellRef[] = [];

    const traverse = (node: ASTNode) => {
      if (node.type === 'CELL_REFERENCE') {
        const ref = node as CellReferenceNode;
        dependencies.push(new CellReferenceImpl(ref.sheet, ref.column, ref.row));
      } else if (node.type === 'RANGE_REFERENCE') {
        const range = node as RangeReferenceNode;
        // Expand range into individual cell references
        const startCol = this.columnToNumber(range.start.column);
        const endCol = this.columnToNumber(range.end.column);
        const startRow = range.start.row;
        const endRow = range.end.row;

        for (let col = startCol; col <= endCol; col++) {
          for (let row = startRow; row <= endRow; row++) {
            const columnLetter = this.numberToColumn(col);
            dependencies.push(new CellReferenceImpl(range.sheet, columnLetter, row));
          }
        }
      }

      // Recurse into child nodes
      if ('left' in node) traverse((node as any).left);
      if ('right' in node) traverse((node as any).right);
      if ('operand' in node) traverse((node as any).operand);
      if ('arguments' in node) {
        for (const arg of (node as any).arguments) {
          traverse(arg);
        }
      }
    };

    traverse(ast);
    return dependencies;
  }

  /**
   * Detect circular references in formula
   * Note: This is a basic check. Full circular reference detection
   * requires tracking evaluation state across multiple cells.
   */
  private detectCircularReference(ast: ASTNode): boolean {
    // For now, we can't detect circular references without
    // knowing which cell this formula belongs to
    // This will be handled at evaluation time
    return false;
  }

  /**
   * Convert column letter to number (A=1, Z=26, AA=27, etc.)
   */
  private columnToNumber(column: string): number {
    let result = 0;
    for (let i = 0; i < column.length; i++) {
      result = result * 26 + (column.charCodeAt(i) - 64);
    }
    return result;
  }

  /**
   * Convert column number to letter (1=A, 26=Z, 27=AA, etc.)
   */
  private numberToColumn(num: number): string {
    let result = '';
    while (num > 0) {
      num--;
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result;
  }

  /**
   * Map Excel error code to ErrorType
   */
  private mapErrorCodeToType(errorCode: string): ErrorType {
    const errorMap: Record<string, ErrorType> = {
      '#NULL!': ErrorType.VALUE,
      '#DIV/0!': ErrorType.DIVIDE_BY_ZERO,
      '#VALUE!': ErrorType.VALUE,
      '#REF!': ErrorType.REFERENCE,
      '#NAME?': ErrorType.NAME,
      '#NUM!': ErrorType.NUM,
      '#N/A': ErrorType.NA,
    };

    return errorMap[errorCode] || ErrorType.VALUE;
  }

  /**
   * Create an error node
   */
  private createErrorNode(errorType: ErrorType, message: string, position: number): ASTNode {
    return {
      type: 'ERROR_LITERAL',
      position,
      value: this.errorTypeToCode(errorType),
    };
  }

  /**
   * Map ErrorType to Excel error code
   */
  private errorTypeToCode(errorType: ErrorType): string {
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

    return errorMap[errorType] || '#VALUE!';
  }
}
