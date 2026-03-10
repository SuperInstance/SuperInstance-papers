/**
 * AST Builder
 *
 * Builds an abstract syntax tree from a stream of tokens using
 * recursive descent parsing with operator precedence.
 *
 * Grammar:
 * expression ::= logicalOr
 * logicalOr ::= logicalAnd ('OR' logicalAnd)*
 * logicalAnd ::= comparison ('AND' comparison)*
 * comparison ::= concatenation (('=' | '<>' | '<' | '>' | '<=' | '>=') concatenation)*
 * concatenation ::= additive ('&' additive)*
 * additive ::= multiplicative (('+' | '-') multiplicative)*
 * multiplicative ::= exponent (('*' | '/') exponent)*
 * exponent ::= unary ('^' unary)?
 * unary ::= ('-' | '+' | 'NOT' | '%')* primary
 * primary ::= NUMBER | STRING | BOOLEAN | cellRef | functionCall | '(' expression ')'
 */

import {
  Token,
  TokenType,
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
  FormulaError,
  ErrorType,
  Precedence,
} from './types.js';

/**
 * Parser exception for internal error handling
 */
class ParserError extends Error {
  constructor(
    message: string,
    public token: Token,
    public errorType: ErrorType = ErrorType.SYNTAX
  ) {
    super(message);
    this.name = 'ParserError';
  }
}

/**
 * AST Builder for formulas
 */
export class ASTBuilder {
  private tokens: Token[];
  private position: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.position = 0;
  }

  /**
   * Build the AST from tokens
   */
  build(): ASTNode {
    try {
      const node = this.parseExpression();

      // Check that we consumed all tokens (except EOF)
      if (!this.isAtEnd() && this.peek().type !== TokenType.EOF) {
        throw new ParserError(
          `Unexpected token: ${this.peek().value}`,
          this.peek(),
          ErrorType.SYNTAX
        );
      }

      return node;
    } catch (error) {
      if (error instanceof ParserError) {
        return this.createErrorNode(error.errorType, error.message, error.token);
      }
      return this.createErrorNode(ErrorType.SYNTAX, 'Parse error', this.peek());
    }
  }

  /**
   * Parse an expression (entry point)
   */
  private parseExpression(): ASTNode {
    return this.parseLogicalOr();
  }

  /**
   * Parse logical OR operations
   */
  private parseLogicalOr(): ASTNode {
    let left = this.parseLogicalAnd();

    while (this.matchFunctionName('OR')) {
      const operator = BinaryOperator.CONCATENATE; // Placeholder - we need OR operator
      const right = this.parseLogicalAnd();
      left = this.createBinaryOperationNode(operator, left, right);
    }

    return left;
  }

  /**
   * Parse logical AND operations
   */
  private parseLogicalAnd(): ASTNode {
    let left = this.parseComparison();

    while (this.matchFunctionName('AND')) {
      const operator = BinaryOperator.CONCATENATE; // Placeholder - we need AND operator
      const right = this.parseComparison();
      left = this.createBinaryOperationNode(operator, left, right);
    }

    return left;
  }

  /**
   * Parse comparison operations
   */
  private parseComparison(): ASTNode {
    let left = this.parseConcatenation();

    while (true) {
      const token = this.peek();

      if (this.match(TokenType.EQUAL)) {
        const right = this.parseConcatenation();
        left = this.createBinaryOperationNode(BinaryOperator.EQUAL, left, right);
      } else if (this.match(TokenType.NOT_EQUAL)) {
        const right = this.parseConcatenation();
        left = this.createBinaryOperationNode(BinaryOperator.NOT_EQUAL, left, right);
      } else if (this.match(TokenType.LESS_THAN)) {
        const right = this.parseConcatenation();
        left = this.createBinaryOperationNode(BinaryOperator.LESS_THAN, left, right);
      } else if (this.match(TokenType.LESS_EQUAL)) {
        const right = this.parseConcatenation();
        left = this.createBinaryOperationNode(BinaryOperator.LESS_EQUAL, left, right);
      } else if (this.match(TokenType.GREATER_THAN)) {
        const right = this.parseConcatenation();
        left = this.createBinaryOperationNode(BinaryOperator.GREATER_THAN, left, right);
      } else if (this.match(TokenType.GREATER_EQUAL)) {
        const right = this.parseConcatenation();
        left = this.createBinaryOperationNode(BinaryOperator.GREATER_EQUAL, left, right);
      } else {
        break;
      }
    }

    return left;
  }

  /**
   * Parse concatenation operations
   */
  private parseConcatenation(): ASTNode {
    let left = this.parseAdditive();

    while (this.match(TokenType.CONCATENATE)) {
      const right = this.parseAdditive();
      left = this.createBinaryOperationNode(BinaryOperator.CONCATENATE, left, right);
    }

    return left;
  }

  /**
   * Parse additive operations (+, -)
   */
  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();

    while (true) {
      if (this.match(TokenType.PLUS)) {
        const right = this.parseMultiplicative();
        left = this.createBinaryOperationNode(BinaryOperator.ADD, left, right);
      } else if (this.match(TokenType.MINUS)) {
        const right = this.parseMultiplicative();
        left = this.createBinaryOperationNode(BinaryOperator.SUBTRACT, left, right);
      } else {
        break;
      }
    }

    return left;
  }

  /**
   * Parse multiplicative operations (*, /)
   */
  private parseMultiplicative(): ASTNode {
    let left = this.parseExponent();

    while (true) {
      if (this.match(TokenType.MULTIPLY)) {
        const right = this.parseExponent();
        left = this.createBinaryOperationNode(BinaryOperator.MULTIPLY, left, right);
      } else if (this.match(TokenType.DIVIDE)) {
        const right = this.parseExponent();
        left = this.createBinaryOperationNode(BinaryOperator.DIVIDE, left, right);
      } else {
        break;
      }
    }

    return left;
  }

  /**
   * Parse exponentiation (^)
   */
  private parseExponent(): ASTNode {
    let left = this.parseUnary();

    if (this.match(TokenType.POWER)) {
      const right = this.parseExponent(); // Right-associative
      left = this.createBinaryOperationNode(BinaryOperator.POWER, left, right);
    }

    return left;
  }

  /**
   * Parse unary operations (-, +, NOT, %)
   */
  private parseUnary(): ASTNode {
    const token = this.peek();

    if (this.match(TokenType.MINUS)) {
      const operand = this.parseUnary();
      return this.createUnaryOperationNode(UnaryOperator.NEGATE, operand, token);
    }

    if (this.match(TokenType.PLUS)) {
      const operand = this.parseUnary();
      return this.createUnaryOperationNode(UnaryOperator.PLUS, operand, token);
    }

    if (this.match(TokenType.PERCENT)) {
      const operand = this.parseUnary();
      return this.createUnaryOperationNode(UnaryOperator.PERCENT, operand, token);
    }

    if (this.matchFunctionName('NOT')) {
      const operand = this.parseUnary();
      return this.createUnaryOperationNode(UnaryOperator.LOGICAL_NOT, operand, token);
    }

    return this.parsePrimary();
  }

  /**
   * Parse primary expressions
   */
  private parsePrimary(): ASTNode {
    const token = this.peek();

    // Parenthesized expression
    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.parseExpression();
      if (!this.match(TokenType.RIGHT_PAREN)) {
        throw new ParserError(
          'Expected closing parenthesis',
          this.peek(),
          ErrorType.SYNTAX
        );
      }
      return expr;
    }

    // Number literal
    if (this.match(TokenType.NUMBER)) {
      return this.createNumberLiteralNode(token);
    }

    // String literal
    if (this.match(TokenType.STRING)) {
      return this.createStringLiteralNode(token);
    }

    // Boolean literals (TRUE, FALSE)
    if (this.matchFunctionName('TRUE')) {
      return this.createBooleanLiteralNode(token, true);
    }

    if (this.matchFunctionName('FALSE')) {
      return this.createBooleanLiteralNode(token, false);
    }

    // Error literal
    if (this.match(TokenType.ERROR)) {
      return this.createErrorLiteralNode(token);
    }

    // Cell reference
    if (this.match(TokenType.CELL_REFERENCE)) {
      return this.parseCellReference(token);
    }

    // Range reference
    if (this.match(TokenType.RANGE_REFERENCE)) {
      return this.parseRangeReference(token);
    }

    // Named range
    if (this.match(TokenType.NAMED_RANGE)) {
      return this.createNamedReferenceNode(token);
    }

    // Function call
    if (this.match(TokenType.FUNCTION_NAME)) {
      return this.parseFunctionCall(token);
    }

    throw new ParserError(
      `Unexpected token: ${token.value}`,
      token,
      ErrorType.SYNTAX
    );
  }

  /**
   * Parse a cell reference
   */
  private parseCellReference(token: Token): CellReferenceNode {
    const ref = token.value;
    const parts = ref.split('!');

    let sheet: string | undefined;
    let cellRef: string;

    if (parts.length === 2) {
      sheet = parts[0];
      cellRef = parts[1];
    } else {
      cellRef = ref;
    }

    // Parse absolute/relative references
    const columnMatch = cellRef.match(/^(\$?)([A-Z]+)(\$?)(\d+)$/);

    if (!columnMatch) {
      throw new ParserError(
        `Invalid cell reference: ${ref}`,
        token,
        ErrorType.REFERENCE
      );
    }

    const [, absCol, column, absRow, rowStr] = columnMatch;
    const row = parseInt(rowStr, 10);

    return {
      type: 'CELL_REFERENCE',
      position: token.position,
      sheet,
      column,
      row,
      absolute: {
        sheet: false, // Sheet names can't be absolute
        column: absCol === '$',
        row: absRow === '$',
      },
    };
  }

  /**
   * Parse a range reference
   */
  private parseRangeReference(token: Token): RangeReferenceNode {
    const ref = token.value;
    const parts = ref.split('!');

    let sheet: string | undefined;
    let rangeRef: string;

    if (parts.length === 2) {
      sheet = parts[0];
      rangeRef = parts[1];
    } else {
      rangeRef = ref;
    }

    // Split by colon
    const [startRef, endRef] = rangeRef.split(':');

    // Parse start cell
    const startMatch = startRef.match(/^(\$?)([A-Z]+)(\$?)(\d+)$/);
    if (!startMatch) {
      throw new ParserError(
        `Invalid range start: ${startRef}`,
        token,
        ErrorType.REFERENCE
      );
    }

    const [, startAbsCol, startCol, startAbsRow, startRowStr] = startMatch;

    // Parse end cell
    const endMatch = endRef.match(/^(\$?)([A-Z]+)(\$?)(\d+)$/);
    if (!endMatch) {
      throw new ParserError(
        `Invalid range end: ${endRef}`,
        token,
        ErrorType.REFERENCE
      );
    }

    const [, endAbsCol, endCol, endAbsRow, endRowStr] = endMatch;

    return {
      type: 'RANGE_REFERENCE',
      position: token.position,
      sheet,
      start: {
        column: startCol,
        row: parseInt(startRowStr, 10),
        absolute: {
          column: startAbsCol === '$',
          row: startAbsRow === '$',
        },
      },
      end: {
        column: endCol,
        row: parseInt(endRowStr, 10),
        absolute: {
          column: endAbsCol === '$',
          row: endAbsRow === '$',
        },
      },
    };
  }

  /**
   * Parse a function call
   */
  private parseFunctionCall(token: Token): FunctionCallNode {
    const name = token.value;
    const args: ASTNode[] = [];

    if (!this.match(TokenType.LEFT_PAREN)) {
      throw new ParserError(
        `Expected '(' after function name: ${name}`,
        this.peek(),
        ErrorType.SYNTAX
      );
    }

    // Parse arguments
    while (!this.isAtEnd() && this.peek().type !== TokenType.RIGHT_PAREN) {
      args.push(this.parseExpression());

      // Check for comma separator
      if (!this.match(TokenType.COMMA)) {
        break;
      }
    }

    if (!this.match(TokenType.RIGHT_PAREN)) {
      throw new ParserError(
        `Expected ')' after function arguments`,
        this.peek(),
        ErrorType.SYNTAX
      );
    }

    return {
      type: 'FUNCTION_CALL',
      position: token.position,
      name,
      arguments: args,
    };
  }

  /**
   * Check if we're at the end of input
   */
  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  /**
   * Get the current token
   */
  private peek(): Token {
    return this.tokens[this.position];
  }

  /**
   * Check if current token matches type and consume it
   */
  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  /**
   * Check if current token is a function name with specific value
   */
  private matchFunctionName(name: string): boolean {
    const token = this.peek();
    if (token.type === TokenType.FUNCTION_NAME && token.value.toUpperCase() === name.toUpperCase()) {
      this.advance();
      return true;
    }
    return false;
  }

  /**
   * Check if current token matches type
   */
  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  /**
   * Advance to the next token
   */
  private advance(): void {
    if (!this.isAtEnd()) {
      this.position++;
    }
  }

  /**
   * Create a number literal node
   */
  private createNumberLiteralNode(token: Token): NumberLiteralNode {
    return {
      type: 'NUMBER_LITERAL',
      position: token.position,
      value: parseFloat(token.value),
    };
  }

  /**
   * Create a string literal node
   */
  private createStringLiteralNode(token: Token): StringLiteralNode {
    return {
      type: 'STRING_LITERAL',
      position: token.position,
      value: token.value,
    };
  }

  /**
   * Create a boolean literal node
   */
  private createBooleanLiteralNode(token: Token, value: boolean): BooleanLiteralNode {
    return {
      type: 'BOOLEAN_LITERAL',
      position: token.position,
      value,
    };
  }

  /**
   * Create an error literal node
   */
  private createErrorLiteralNode(token: Token): ErrorLiteralNode {
    return {
      type: 'ERROR_LITERAL',
      position: token.position,
      value: token.value,
    };
  }

  /**
   * Create an error node
   */
  private createErrorNode(errorType: ErrorType, message: string, token: Token): ErrorLiteralNode {
    // Map error types to Excel error codes
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

    return {
      type: 'ERROR_LITERAL',
      position: token.position,
      value: errorMap[errorType] || '#VALUE!',
    };
  }

  /**
   * Create a named reference node
   */
  private createNamedReferenceNode(token: Token): NamedReferenceNode {
    return {
      type: 'NAMED_REFERENCE',
      position: token.position,
      name: token.value,
    };
  }

  /**
   * Create a binary operation node
   */
  private createBinaryOperationNode(
    operator: BinaryOperator,
    left: ASTNode,
    right: ASTNode
  ): BinaryOperationNode {
    return {
      type: 'BINARY_OPERATION',
      position: left.position,
      operator,
      left,
      right,
    };
  }

  /**
   * Create a unary operation node
   */
  private createUnaryOperationNode(
    operator: UnaryOperator,
    operand: ASTNode,
    token: Token
  ): UnaryOperationNode {
    return {
      type: 'UNARY_OPERATION',
      position: token.position,
      operator,
      operand,
    };
  }
}
