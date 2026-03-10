/**
 * Function Registry
 *
 * Manages built-in and custom spreadsheet functions.
 * Provides function registration, type checking, and invocation.
 */

import {
  FunctionImplementation,
  FunctionSignature,
  FunctionCategory,
  CellValue,
  ValueType,
  FormulaError,
  ErrorType,
} from './types.js';

/**
 * Registry for spreadsheet functions
 */
export class FunctionRegistry {
  private functions: Map<string, FunctionImplementation>;

  constructor() {
    this.functions = new Map();
    this.registerBuiltInFunctions();
  }

  /**
   * Register a new function
   */
  register(implementation: FunctionImplementation): void {
    const name = implementation.signature.name.toUpperCase();
    this.functions.set(name, implementation);
  }

  /**
   * Get a function by name
   */
  get(name: string): FunctionImplementation | undefined {
    return this.functions.get(name.toUpperCase());
  }

  /**
   * Check if a function exists
   */
  has(name: string): boolean {
    return this.functions.has(name.toUpperCase());
  }

  /**
   * Get all function names
   */
  getFunctionNames(): string[] {
    return Array.from(this.functions.keys()).sort();
  }

  /**
   * Get functions by category
   */
  getFunctionsByCategory(category: FunctionCategory): FunctionImplementation[] {
    return Array.from(this.functions.values()).filter(
      (f) => f.signature.category === category
    );
  }

  /**
   * Validate function arguments
   */
  validate(name: string, args: CellValue[]): FormulaError | null {
    const func = this.get(name);
    if (!func) {
      return {
        type: ErrorType.NAME,
        message: `Unknown function: ${name}`,
      };
    }

    const { minArgs, maxArgs, variadic, argTypes } = func.signature;

    // Check argument count
    if (!variadic && args.length < minArgs) {
      return {
        type: ErrorType.MISSING_ARGUMENT,
        message: `${name} expects at least ${minArgs} argument(s), got ${args.length}`,
      };
    }

    if (args.length > maxArgs) {
      return {
        type: ErrorType.INVALID_ARGUMENT,
        message: `${name} expects at most ${maxArgs} argument(s), got ${args.length}`,
      };
    }

    // Check argument types
    if (argTypes) {
      for (let i = 0; i < Math.min(args.length, argTypes.length); i++) {
        const argType = this.getValueType(args[i]);
        const expectedType = argTypes[i];

        if (expectedType !== ValueType.EMPTY && argType !== expectedType && argType !== ValueType.EMPTY) {
          // Allow type coercion for number/string
          if (
            !(
              (expectedType === ValueType.NUMBER && argType === ValueType.STRING) ||
              (expectedType === ValueType.STRING && argType === ValueType.NUMBER)
            )
          ) {
            return {
              type: ErrorType.VALUE,
              message: `${name} argument ${i + 1} expects ${expectedType}, got ${argType}`,
            };
          }
        }
      }
    }

    // Run custom validation if provided
    if (func.validate) {
      return func.validate(...args);
    }

    return null;
  }

  /**
   * Execute a function
   */
  execute(name: string, args: CellValue[]): CellValue {
    const func = this.get(name);

    if (!func) {
      return this.createError(ErrorType.NAME, `Unknown function: ${name}`);
    }

    // Validate arguments
    const error = this.validate(name, args);
    if (error) {
      return this.createError(error.type, error.message);
    }

    try {
      return func.implementation(...args);
    } catch (err) {
      if (err instanceof FormulaError) {
        return this.createError(err.type, err.message);
      }
      return this.createError(ErrorType.VALUE, `Error in ${name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the type of a value
   */
  private getValueType(value: CellValue): ValueType {
    if (value === null || value === undefined) {
      return ValueType.EMPTY;
    }

    if (typeof value === 'number') {
      return ValueType.NUMBER;
    }

    if (typeof value === 'string') {
      // Check if it's an error code
      if (value.startsWith('#') && value.endsWith('!')) {
        return ValueType.ERROR;
      }
      return ValueType.STRING;
    }

    if (typeof value === 'boolean') {
      return ValueType.BOOLEAN;
    }

    if (Array.isArray(value)) {
      return ValueType.ARRAY;
    }

    return ValueType.EMPTY;
  }

  /**
   * Create an error value
   */
  private createError(type: ErrorType, message: string): string {
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
   * Register all built-in functions
   */
  private registerBuiltInFunctions(): void {
    this.registerMathFunctions();
    this.registerStatisticalFunctions();
    this.registerTextFunctions();
    this.registerLogicalFunctions();
    this.registerInformationFunctions();
  }

  /**
   * Register math functions
   */
  private registerMathFunctions(): void {
    // ABS
    this.register({
      signature: {
        name: 'ABS',
        minArgs: 1,
        maxArgs: 1,
        variadic: false,
        argTypes: [ValueType.NUMBER],
        returnType: ValueType.NUMBER,
        description: 'Returns the absolute value of a number',
        category: FunctionCategory.MATH,
      },
      implementation: (x: CellValue) => {
        if (typeof x !== 'number') return '#VALUE!';
        return Math.abs(x);
      },
    });

    // SUM
    this.register({
      signature: {
        name: 'SUM',
        minArgs: 1,
        maxArgs: Infinity,
        variadic: true,
        argTypes: [ValueType.NUMBER],
        returnType: ValueType.NUMBER,
        description: 'Adds all the numbers in a range of cells',
        category: FunctionCategory.MATH,
      },
      implementation: (...args: CellValue[]) => {
        let sum = 0;
        for (const arg of args) {
          if (typeof arg === 'number') {
            sum += arg;
          } else if (Array.isArray(arg)) {
            sum += this.sumArray(arg);
          }
        }
        return sum;
      },
    });

    // ROUND
    this.register({
      signature: {
        name: 'ROUND',
        minArgs: 1,
        maxArgs: 2,
        variadic: false,
        argTypes: [ValueType.NUMBER, ValueType.NUMBER],
        returnType: ValueType.NUMBER,
        description: 'Rounds a number to a specified number of digits',
        category: FunctionCategory.MATH,
      },
      implementation: (x: CellValue, digits: CellValue = 0) => {
        if (typeof x !== 'number' || typeof digits !== 'number') return '#VALUE!';
        const multiplier = Math.pow(10, digits);
        return Math.round(x * multiplier) / multiplier;
      },
    });

    // FLOOR
    this.register({
      signature: {
        name: 'FLOOR',
        minArgs: 1,
        maxArgs: 2,
        variadic: false,
        argTypes: [ValueType.NUMBER, ValueType.NUMBER],
        returnType: ValueType.NUMBER,
        description: 'Rounds a number down to the nearest multiple of significance',
        category: FunctionCategory.MATH,
      },
      implementation: (x: CellValue, significance: CellValue = 1) => {
        if (typeof x !== 'number' || typeof significance !== 'number') return '#VALUE!';
        if (significance === 0) return 0;
        return Math.floor(x / significance) * significance;
      },
    });

    // CEILING
    this.register({
      signature: {
        name: 'CEILING',
        minArgs: 1,
        maxArgs: 2,
        variadic: false,
        argTypes: [ValueType.NUMBER, ValueType.NUMBER],
        returnType: ValueType.NUMBER,
        description: 'Rounds a number up to the nearest multiple of significance',
        category: FunctionCategory.MATH,
      },
      implementation: (x: CellValue, significance: CellValue = 1) => {
        if (typeof x !== 'number' || typeof significance !== 'number') return '#VALUE!';
        if (significance === 0) return 0;
        return Math.ceil(x / significance) * significance;
      },
    });

    // POWER
    this.register({
      signature: {
        name: 'POWER',
        minArgs: 2,
        maxArgs: 2,
        variadic: false,
        argTypes: [ValueType.NUMBER, ValueType.NUMBER],
        returnType: ValueType.NUMBER,
        description: 'Returns a number raised to a power',
        category: FunctionCategory.MATH,
      },
      implementation: (x: CellValue, y: CellValue) => {
        if (typeof x !== 'number' || typeof y !== 'number') return '#VALUE!';
        return Math.pow(x, y);
      },
    });

    // SQRT
    this.register({
      signature: {
        name: 'SQRT',
        minArgs: 1,
        maxArgs: 1,
        variadic: false,
        argTypes: [ValueType.NUMBER],
        returnType: ValueType.NUMBER,
        description: 'Returns the square root of a number',
        category: FunctionCategory.MATH,
      },
      implementation: (x: CellValue) => {
        if (typeof x !== 'number') return '#VALUE!';
        if (x < 0) return '#NUM!';
        return Math.sqrt(x);
      },
    });

    // MOD
    this.register({
      signature: {
        name: 'MOD',
        minArgs: 2,
        maxArgs: 2,
        variadic: false,
        argTypes: [ValueType.NUMBER, ValueType.NUMBER],
        returnType: ValueType.NUMBER,
        description: 'Returns the remainder after division',
        category: FunctionCategory.MATH,
      },
      implementation: (x: CellValue, y: CellValue) => {
        if (typeof x !== 'number' || typeof y !== 'number') return '#VALUE!';
        if (y === 0) return '#DIV/0!';
        return x % y;
      },
    });

    // INT
    this.register({
      signature: {
        name: 'INT',
        minArgs: 1,
        maxArgs: 1,
        variadic: false,
        argTypes: [ValueType.NUMBER],
        returnType: ValueType.NUMBER,
        description: 'Rounds a number down to the nearest integer',
        category: FunctionCategory.MATH,
      },
      implementation: (x: CellValue) => {
        if (typeof x !== 'number') return '#VALUE!';
        return Math.floor(x);
      },
    });
  }

  /**
   * Register statistical functions
   */
  private registerStatisticalFunctions(): void {
    // AVERAGE
    this.register({
      signature: {
        name: 'AVERAGE',
        minArgs: 1,
        maxArgs: Infinity,
        variadic: true,
        argTypes: [ValueType.NUMBER],
        returnType: ValueType.NUMBER,
        description: 'Returns the average of its arguments',
        category: FunctionCategory.STATISTICAL,
      },
      implementation: (...args: CellValue[]) => {
        const values = this.extractNumbers(args);
        if (values.length === 0) return '#DIV/0!';
        const sum = values.reduce((a, b) => a + b, 0);
        return sum / values.length;
      },
    });

    // COUNT
    this.register({
      signature: {
        name: 'COUNT',
        minArgs: 1,
        maxArgs: Infinity,
        variadic: true,
        returnType: ValueType.NUMBER,
        description: 'Counts how many numbers are in the list of arguments',
        category: FunctionCategory.STATISTICAL,
      },
      implementation: (...args: CellValue[]) => {
        return this.extractNumbers(args).length;
      },
    });

    // COUNTA
    this.register({
      signature: {
        name: 'COUNTA',
        minArgs: 1,
        maxArgs: Infinity,
        variadic: true,
        returnType: ValueType.NUMBER,
        description: 'Counts how many values are in the list of arguments',
        category: FunctionCategory.STATISTICAL,
      },
      implementation: (...args: CellValue[]) => {
        return this.extractValues(args).length;
      },
    });

    // MIN
    this.register({
      signature: {
        name: 'MIN',
        minArgs: 1,
        maxArgs: Infinity,
        variadic: true,
        argTypes: [ValueType.NUMBER],
        returnType: ValueType.NUMBER,
        description: 'Returns the minimum value in a list of arguments',
        category: FunctionCategory.STATISTICAL,
      },
      implementation: (...args: CellValue[]) => {
        const values = this.extractNumbers(args);
        if (values.length === 0) return 0;
        return Math.min(...values);
      },
    });

    // MAX
    this.register({
      signature: {
        name: 'MAX',
        minArgs: 1,
        maxArgs: Infinity,
        variadic: true,
        argTypes: [ValueType.NUMBER],
        returnType: ValueType.NUMBER,
        description: 'Returns the maximum value in a list of arguments',
        category: FunctionCategory.STATISTICAL,
      },
      implementation: (...args: CellValue[]) => {
        const values = this.extractNumbers(args);
        if (values.length === 0) return 0;
        return Math.max(...values);
      },
    });

    // MEDIAN
    this.register({
      signature: {
        name: 'MEDIAN',
        minArgs: 1,
        maxArgs: Infinity,
        variadic: true,
        argTypes: [ValueType.NUMBER],
        returnType: ValueType.NUMBER,
        description: 'Returns the median of the given numbers',
        category: FunctionCategory.STATISTICAL,
      },
      implementation: (...args: CellValue[]) => {
        const values = this.extractNumbers(args).sort((a, b) => a - b);
        if (values.length === 0) return '#NUM!';
        const mid = Math.floor(values.length / 2);
        if (values.length % 2 === 0) {
          return (values[mid - 1] + values[mid]) / 2;
        }
        return values[mid];
      },
    });
  }

  /**
   * Register text functions
   */
  private registerTextFunctions(): void {
    // CONCATENATE
    this.register({
      signature: {
        name: 'CONCATENATE',
        minArgs: 1,
        maxArgs: Infinity,
        variadic: true,
        returnType: ValueType.STRING,
        description: 'Joins several text strings into one text string',
        category: FunctionCategory.TEXT,
      },
      implementation: (...args: CellValue[]) => {
        return args.map((arg) => String(arg ?? '')).join('');
      },
    });

    // LEFT
    this.register({
      signature: {
        name: 'LEFT',
        minArgs: 1,
        maxArgs: 2,
        variadic: false,
        returnType: ValueType.STRING,
        description: 'Returns the specified number of characters from the start of a text string',
        category: FunctionCategory.TEXT,
      },
      implementation: (text: CellValue, numChars: CellValue = 1) => {
        if (text === null || text === undefined) return '#VALUE!';
        const str = String(text);
        const num = typeof numChars === 'number' ? numChars : 1;
        return str.substring(0, num);
      },
    });

    // RIGHT
    this.register({
      signature: {
        name: 'RIGHT',
        minArgs: 1,
        maxArgs: 2,
        variadic: false,
        returnType: ValueType.STRING,
        description: 'Returns the specified number of characters from the end of a text string',
        category: FunctionCategory.TEXT,
      },
      implementation: (text: CellValue, numChars: CellValue = 1) => {
        if (text === null || text === undefined) return '#VALUE!';
        const str = String(text);
        const num = typeof numChars === 'number' ? numChars : 1;
        return str.substring(Math.max(0, str.length - num));
      },
    });

    // MID
    this.register({
      signature: {
        name: 'MID',
        minArgs: 3,
        maxArgs: 3,
        variadic: false,
        returnType: ValueType.STRING,
        description: 'Returns the characters from the middle of a text string',
        category: FunctionCategory.TEXT,
      },
      implementation: (text: CellValue, startNum: CellValue, numChars: CellValue) => {
        if (text === null || text === undefined) return '#VALUE!';
        const str = String(text);
        const start = typeof startNum === 'number' ? startNum : 1;
        const num = typeof numChars === 'number' ? numChars : 0;
        return str.substring(start - 1, start - 1 + num);
      },
    });

    // LEN
    this.register({
      signature: {
        name: 'LEN',
        minArgs: 1,
        maxArgs: 1,
        variadic: false,
        returnType: ValueType.NUMBER,
        description: 'Returns the number of characters in a text string',
        category: FunctionCategory.TEXT,
      },
      implementation: (text: CellValue) => {
        if (text === null || text === undefined) return '#VALUE!';
        return String(text).length;
      },
    });

    // UPPER
    this.register({
      signature: {
        name: 'UPPER',
        minArgs: 1,
        maxArgs: 1,
        variadic: false,
        returnType: ValueType.STRING,
        description: 'Converts text to uppercase',
        category: FunctionCategory.TEXT,
      },
      implementation: (text: CellValue) => {
        if (text === null || text === undefined) return '#VALUE!';
        return String(text).toUpperCase();
      },
    });

    // LOWER
    this.register({
      signature: {
        name: 'LOWER',
        minArgs: 1,
        maxArgs: 1,
        variadic: false,
        returnType: ValueType.STRING,
        description: 'Converts text to lowercase',
        category: FunctionCategory.TEXT,
      },
      implementation: (text: CellValue) => {
        if (text === null || text === undefined) return '#VALUE!';
        return String(text).toLowerCase();
      },
    });

    // TRIM
    this.register({
      signature: {
        name: 'TRIM',
        minArgs: 1,
        maxArgs: 1,
        variadic: false,
        returnType: ValueType.STRING,
        description: 'Removes spaces from text',
        category: FunctionCategory.TEXT,
      },
      implementation: (text: CellValue) => {
        if (text === null || text === undefined) return '#VALUE!';
        return String(text).trim().replace(/\s+/g, ' ');
      },
    });
  }

  /**
   * Register logical functions
   */
  private registerLogicalFunctions(): void {
    // IF
    this.register({
      signature: {
        name: 'IF',
        minArgs: 2,
        maxArgs: 3,
        variadic: false,
        returnType: ValueType.BOOLEAN,
        description: 'Specifies a logical test to perform',
        category: FunctionCategory.LOGICAL,
      },
      implementation: (test: CellValue, valueIfTrue: CellValue, valueIfFalse: CellValue = false) => {
        // Convert test to boolean
        const condition = this.toBoolean(test);
        return condition ? valueIfTrue : valueIfFalse;
      },
    });

    // AND
    this.register({
      signature: {
        name: 'AND',
        minArgs: 1,
        maxArgs: Infinity,
        variadic: true,
        returnType: ValueType.BOOLEAN,
        description: 'Returns TRUE if all arguments are TRUE',
        category: FunctionCategory.LOGICAL,
      },
      implementation: (...args: CellValue[]) => {
        return args.every((arg) => this.toBoolean(arg));
      },
    });

    // OR
    this.register({
      signature: {
        name: 'OR',
        minArgs: 1,
        maxArgs: Infinity,
        variadic: true,
        returnType: ValueType.BOOLEAN,
        description: 'Returns TRUE if any argument is TRUE',
        category: FunctionCategory.LOGICAL,
      },
      implementation: (...args: CellValue[]) => {
        return args.some((arg) => this.toBoolean(arg));
      },
    });

    // NOT
    this.register({
      signature: {
        name: 'NOT',
        minArgs: 1,
        maxArgs: 1,
        variadic: false,
        returnType: ValueType.BOOLEAN,
        description: 'Reverses the logic of its argument',
        category: FunctionCategory.LOGICAL,
      },
      implementation: (logical: CellValue) => {
        return !this.toBoolean(logical);
      },
    });

    // TRUE
    this.register({
      signature: {
        name: 'TRUE',
        minArgs: 0,
        maxArgs: 0,
        variadic: false,
        returnType: ValueType.BOOLEAN,
        description: 'Returns the logical value TRUE',
        category: FunctionCategory.LOGICAL,
      },
      implementation: () => true,
    });

    // FALSE
    this.register({
      signature: {
        name: 'FALSE',
        minArgs: 0,
        maxArgs: 0,
        variadic: false,
        returnType: ValueType.BOOLEAN,
        description: 'Returns the logical value FALSE',
        category: FunctionCategory.LOGICAL,
      },
      implementation: () => false,
    });
  }

  /**
   * Register information functions
   */
  private registerInformationFunctions(): void {
    // ISNUMBER
    this.register({
      signature: {
        name: 'ISNUMBER',
        minArgs: 1,
        maxArgs: 1,
        variadic: false,
        returnType: ValueType.BOOLEAN,
        description: 'Returns TRUE if the value is a number',
        category: FunctionCategory.INFORMATION,
      },
      implementation: (value: CellValue) => {
        return typeof value === 'number' && !isNaN(value);
      },
    });

    // ISTEXT
    this.register({
      signature: {
        name: 'ISTEXT',
        minArgs: 1,
        maxArgs: 1,
        variadic: false,
        returnType: ValueType.BOOLEAN,
        description: 'Returns TRUE if the value is text',
        category: FunctionCategory.INFORMATION,
      },
      implementation: (value: CellValue) => {
        return typeof value === 'string';
      },
    });

    // ISLOGICAL
    this.register({
      signature: {
        name: 'ISLOGICAL',
        minArgs: 1,
        maxArgs: 1,
        variadic: false,
        returnType: ValueType.BOOLEAN,
        description: 'Returns TRUE if the value is a logical value',
        category: FunctionCategory.INFORMATION,
      },
      implementation: (value: CellValue) => {
        return typeof value === 'boolean';
      },
    });

    // ISBLANK
    this.register({
      signature: {
        name: 'ISBLANK',
        minArgs: 1,
        maxArgs: 1,
        variadic: false,
        returnType: ValueType.BOOLEAN,
        description: 'Returns TRUE if the value is blank',
        category: FunctionCategory.INFORMATION,
      },
      implementation: (value: CellValue) => {
        return value === null || value === undefined;
      },
    });

    // ISERROR
    this.register({
      signature: {
        name: 'ISERROR',
        minArgs: 1,
        maxArgs: 1,
        variadic: false,
        returnType: ValueType.BOOLEAN,
        description: 'Returns TRUE if the value is an error',
        category: FunctionCategory.INFORMATION,
      },
      implementation: (value: CellValue) => {
        if (typeof value === 'string') {
          return value.startsWith('#') && value.endsWith('!');
        }
        return false;
      },
    });

    // NA
    this.register({
      signature: {
        name: 'NA',
        minArgs: 0,
        maxArgs: 0,
        variadic: false,
        returnType: ValueType.ERROR,
        description: 'Returns the error value #N/A',
        category: FunctionCategory.INFORMATION,
      },
      implementation: () => '#N/A',
    });
  }

  /**
   * Convert a value to boolean
   */
  private toBoolean(value: CellValue): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
    return false;
  }

  /**
   * Extract numbers from arguments (handles nested arrays)
   */
  private extractNumbers(args: CellValue[]): number[] {
    const numbers: number[] = [];

    for (const arg of args) {
      if (typeof arg === 'number' && !isNaN(arg)) {
        numbers.push(arg);
      } else if (Array.isArray(arg)) {
        numbers.push(...this.extractNumbers(arg));
      }
    }

    return numbers;
  }

  /**
   * Extract all non-null values from arguments
   */
  private extractValues(args: CellValue[]): CellValue[] {
    const values: CellValue[] = [];

    for (const arg of args) {
      if (arg !== null && arg !== undefined) {
        if (Array.isArray(arg)) {
          values.push(...this.extractValues(arg));
        } else {
          values.push(arg);
        }
      }
    }

    return values;
  }

  /**
   * Sum an array (handles nested arrays)
   */
  private sumArray(arr: CellValue[]): number {
    let sum = 0;
    for (const item of arr) {
      if (typeof item === 'number') {
        sum += item;
      } else if (Array.isArray(item)) {
        sum += this.sumArray(item);
      }
    }
    return sum;
  }
}
