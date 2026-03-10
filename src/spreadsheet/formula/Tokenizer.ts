/**
 * Formula Tokenizer
 *
 * Converts formula strings into a stream of tokens for parsing.
 * Handles Excel-compatible formula syntax including:
 * - Numbers (integers, decimals, scientific notation)
 * - Strings (quoted with double quotes)
 * - Cell references (A1, $A$1, Sheet1!A1)
 * - Range references (A1:B2, Sheet1!A1:B2)
 * - Operators and punctuation
 * - Function names
 * - Named ranges
 */

import { TokenType, Token, FormulaError, ErrorType } from './types.js';

/**
 * Tokenizer for formula strings
 */
export class Tokenizer {
  private formula: string;
  private position: number;
  private length: number;

  constructor(formula: string) {
    this.formula = formula;
    this.position = 0;
    this.length = formula.length;
  }

  /**
   * Tokenize the entire formula string
   */
  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.position < this.length) {
      const char = this.peek();

      // Skip whitespace
      if (this.isWhitespace(char)) {
        this.advance();
        continue;
      }

      // Try different token types in order
      const token = this.tryNumberToken() ||
                    this.tryStringToken() ||
                    this.tryCellReferenceToken() ||
                    this.tryFunctionNameToken() ||
                    this.tryOperatorToken() ||
                    this.tryPunctuationToken() ||
                    this.tryErrorToken() ||
                    this.createError(ErrorType.SYNTAX, `Unexpected character: ${char}`);

      if (token.type === TokenType.ERROR) {
        tokens.push(token);
        break;
      }

      tokens.push(token);
    }

    // Add EOF token
    tokens.push({
      type: TokenType.EOF,
      value: '',
      position: this.position,
      length: 0,
    });

    return tokens;
  }

  /**
   * Try to parse a number token
   */
  private tryNumberToken(): Token | null {
    const start = this.position;
    let hasDigit = false;
    let hasDecimal = false;

    // Check for leading minus (unary operator, not part of number in our grammar)
    // We'll handle this at the parser level

    // Parse integer part
    while (this.position < this.length && this.isDigit(this.peek())) {
      hasDigit = true;
      this.advance();
    }

    // Parse decimal part
    if (this.position < this.length && this.peek() === '.') {
      hasDecimal = true;
      this.advance();

      while (this.position < this.length && this.isDigit(this.peek())) {
        hasDigit = true;
        this.advance();
      }
    }

    // Parse scientific notation
    if (hasDigit && this.position < this.length) {
      const char = this.peek();
      if (char === 'e' || char === 'E') {
        this.advance();

        // Optional + or -
        if (this.position < this.length && (this.peek() === '+' || this.peek() === '-')) {
          this.advance();
        }

        // Must have at least one digit
        let hasExpDigit = false;
        while (this.position < this.length && this.isDigit(this.peek())) {
          hasExpDigit = true;
          this.advance();
        }

        if (!hasExpDigit) {
          // Invalid scientific notation, backtrack
          this.position = start;
          return null;
        }
      }
    }

    if (hasDigit) {
      const value = this.formula.substring(start, this.position);
      return {
        type: TokenType.NUMBER,
        value,
        position: start,
        length: this.position - start,
      };
    }

    this.position = start;
    return null;
  }

  /**
   * Try to parse a string token
   */
  private tryStringToken(): Token | null {
    if (this.peek() !== '"') {
      return null;
    }

    const start = this.position;
    this.advance(); // Skip opening quote

    let value = '';
    let escaped = false;

    while (this.position < this.length) {
      const char = this.peek();

      if (char === '"' && !escaped) {
        this.advance(); // Skip closing quote
        return {
          type: TokenType.STRING,
          value,
          position: start,
          length: this.position - start,
        };
      }

      if (char === '"' && escaped) {
        value += '"';
        escaped = false;
      } else {
        value += char;
      }

      this.advance();
    }

    // Unclosed string
    return this.createError(ErrorType.SYNTAX, 'Unclosed string literal');
  }

  /**
   * Try to parse a cell reference or range
   */
  private tryCellReferenceToken(): Token | null {
    const start = this.position;

    // Sheet name (optional) - ends with !
    let hasSheet = false;
    while (this.position < this.length && this.peek() !== '!') {
      this.advance();
      hasSheet = true;
    }

    if (hasSheet && this.position < this.length && this.peek() === '!') {
      this.advance();
    } else if (hasSheet) {
      // Not a sheet reference, backtrack
      this.position = start;
      hasSheet = false;
    }

    // Column letters
    const columnStart = this.position;
    while (this.position < this.length && this.isLetter(this.peek())) {
      this.advance();
    }

    // Check if we're at a range separator (:)
    if (this.position < this.length && this.peek() === ':') {
      const hasColumn = this.position > columnStart;
      if (hasColumn) {
        this.advance(); // Skip :

        // Parse second part of range
        while (this.position < this.length && this.isLetter(this.peek())) {
          this.advance();
        }

        // Row number
        while (this.position < this.length && this.isDigit(this.peek())) {
          this.advance();
        }

        const value = this.formula.substring(start, this.position);
        return {
          type: TokenType.RANGE_REFERENCE,
          value,
          position: start,
          length: this.position - start,
        };
      }
    }

    // Row number
    const rowStart = this.position;
    while (this.position < this.length && this.isDigit(this.peek())) {
      this.advance();
    }

    const hasRow = this.position > rowStart;
    const hasColumn = this.position > columnStart;

    // Check if this is a valid cell reference (column + row)
    if (hasColumn && hasRow) {
      const value = this.formula.substring(start, this.position);
      return {
        type: TokenType.CELL_REFERENCE,
        value,
        position: start,
        length: this.position - start,
      };
    }

    // Check for named range (just letters, no numbers)
    if (hasColumn && !hasRow) {
      const value = this.formula.substring(start, this.position);
      // Only treat as named range if it doesn't look like a function call
      if (this.position >= this.length || this.peek() !== '(') {
        return {
          type: TokenType.NAMED_RANGE,
          value,
          position: start,
          length: this.position - start,
        };
      }
    }

    this.position = start;
    return null;
  }

  /**
   * Try to parse a function name
   */
  private tryFunctionNameToken(): Token | null {
    const start = this.position;

    // Function name starts with a letter
    if (!this.isLetter(this.peek())) {
      return null;
    }

    // Parse function name (letters, numbers, underscores, periods)
    while (this.position < this.length) {
      const char = this.peek();
      if (this.isLetter(char) || this.isDigit(char) || char === '_' || char === '.') {
        this.advance();
      } else {
        break;
      }
    }

    // Check if followed by opening parenthesis
    if (this.position < this.length && this.peek() === '(') {
      const value = this.formula.substring(start, this.position);
      return {
        type: TokenType.FUNCTION_NAME,
        value,
        position: start,
        length: this.position - start,
      };
    }

    // Not a function call, backtrack
    this.position = start;
    return null;
  }

  /**
   * Try to parse an operator token
   */
  private tryOperatorToken(): Token | null {
    const start = this.position;
    const char = this.peek();

    // Multi-character operators
    if (this.position + 1 < this.length) {
      const next = this.formula[this.position + 1];
      const twoChar = char + next;

      if (twoChar === '<>') {
        this.position += 2;
        return {
          type: TokenType.NOT_EQUAL,
          value: twoChar,
          position: start,
          length: 2,
        };
      }

      if (twoChar === '<=') {
        this.position += 2;
        return {
          type: TokenType.LESS_EQUAL,
          value: twoChar,
          position: start,
          length: 2,
        };
      }

      if (twoChar === '>=') {
        this.position += 2;
        return {
          type: TokenType.GREATER_EQUAL,
          value: twoChar,
          position: start,
          length: 2,
        };
      }
    }

    // Single-character operators
    this.position++;

    switch (char) {
      case '+':
        return {
          type: TokenType.PLUS,
          value: char,
          position: start,
          length: 1,
        };

      case '-':
        return {
          type: TokenType.MINUS,
          value: char,
          position: start,
          length: 1,
        };

      case '*':
        return {
          type: TokenType.MULTIPLY,
          value: char,
          position: start,
          length: 1,
        };

      case '/':
        return {
          type: TokenType.DIVIDE,
          value: char,
          position: start,
          length: 1,
        };

      case '^':
        return {
          type: TokenType.POWER,
          value: char,
          position: start,
          length: 1,
        };

      case '&':
        return {
          type: TokenType.CONCATENATE,
          value: char,
          position: start,
          length: 1,
        };

      case '%':
        return {
          type: TokenType.PERCENT,
          value: char,
          position: start,
          length: 1,
        };

      case '=':
        return {
          type: TokenType.EQUAL,
          value: char,
          position: start,
          length: 1,
        };

      case '<':
        return {
          type: TokenType.LESS_THAN,
          value: char,
          position: start,
          length: 1,
        };

      case '>':
        return {
          type: TokenType.GREATER_THAN,
          value: char,
          position: start,
          length: 1,
        };

      default:
        this.position = start;
        return null;
    }
  }

  /**
   * Try to parse punctuation
   */
  private tryPunctuationToken(): Token | null {
    const start = this.position;
    const char = this.peek();

    this.position++;

    switch (char) {
      case '(':
        return {
          type: TokenType.LEFT_PAREN,
          value: char,
          position: start,
          length: 1,
        };

      case ')':
        return {
          type: TokenType.RIGHT_PAREN,
          value: char,
          position: start,
          length: 1,
        };

      case ',':
        return {
          type: TokenType.COMMA,
          value: char,
          position: start,
          length: 1,
        };

      case ':':
        return {
          type: TokenType.COLON,
          value: char,
          position: start,
          length: 1,
        };

      case ';':
        return {
          type: TokenType.SEMICOLON,
          value: char,
          position: start,
          length: 1,
        };

      case '!':
        return {
          type: TokenType.BANG,
          value: char,
          position: start,
          length: 1,
        };

      default:
        this.position = start;
        return null;
    }
  }

  /**
   * Try to parse an error literal
   */
  private tryErrorToken(): Token | null {
    const start = this.position;

    // Error literals start with #
    if (this.peek() !== '#') {
      return null;
    }

    this.advance();

    // Parse error name
    while (this.position < this.length) {
      const char = this.peek();
      if (this.isLetter(char) || char === '?' || char === '!') {
        this.advance();
      } else {
        break;
      }
    }

    // Check if followed by !
    if (this.position < this.length && this.peek() === '!') {
      this.advance();
      const value = this.formula.substring(start, this.position);
      return {
        type: TokenType.ERROR,
        value,
        position: start,
        length: this.position - start,
      };
    }

    this.position = start;
    return null;
  }

  /**
   * Get the current character without advancing
   */
  private peek(): string {
    if (this.position >= this.length) {
      return '\0';
    }
    return this.formula[this.position];
  }

  /**
   * Advance to the next character
   */
  private advance(): void {
    this.position++;
  }

  /**
   * Check if a character is a digit
   */
  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  /**
   * Check if a character is a letter
   */
  private isLetter(char: string): boolean {
    return (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z');
  }

  /**
   * Check if a character is whitespace
   */
  private isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\n' || char === '\r';
  }

  /**
   * Create an error token
   */
  private createError(type: ErrorType, message: string): Token {
    return {
      type: TokenType.ERROR,
      value: message,
      position: this.position,
      length: 0,
    };
  }
}
