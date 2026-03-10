/**
 * Formula Parser and Evaluator Tests
 *
 * Comprehensive test suite for the formula system.
 */

import { describe, it, expect } from '@jest/globals';
import { FormulaParser } from './FormulaParser.js';
import { FormulaEvaluator } from './FormulaEvaluator.js';
import { FunctionRegistry } from './FunctionRegistry.js';
import { EvaluationContext } from './types.js';

/**
 * Create a mock evaluation context
 */
function createMockContext(
  cellValues: Record<string, any> = {},
  rangeValues: Record<string, any[][]> = {}
): EvaluationContext {
  return {
    getCellValue: (ref: string) => {
      if (ref in cellValues) {
        return cellValues[ref];
      }
      return null;
    },
    getRangeValue: (ref: string) => {
      if (ref in rangeValues) {
        return rangeValues[ref];
      }
      return [[]];
    },
    getNamedValue: (name: string) => {
      if (name in cellValues) {
        return cellValues[name];
      }
      return undefined;
    },
  };
}

describe('FormulaParser', () => {
  const parser = new FormulaParser();

  describe('tokenization', () => {
    it('should tokenize a simple formula', () => {
      const tokens = parser.tokenize('1+2');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].type).toBe('NUMBER');
      expect(tokens[0].value).toBe('1');
    });

    it('should tokenize cell references', () => {
      const tokens = parser.tokenize('A1+B2');
      expect(tokens.some((t) => t.type === 'CELL_REFERENCE' && t.value === 'A1')).toBe(true);
      expect(tokens.some((t) => t.type === 'CELL_REFERENCE' && t.value === 'B2')).toBe(true);
    });

    it('should tokenize function calls', () => {
      const tokens = parser.tokenize('SUM(A1,B2)');
      expect(tokens.some((t) => t.type === 'FUNCTION_NAME' && t.value === 'SUM')).toBe(true);
    });

    it('should tokenize strings', () => {
      const tokens = parser.tokenize('"hello world"');
      expect(tokens[0].type).toBe('STRING');
      expect(tokens[0].value).toBe('hello world');
    });

    it('should tokenize numbers with decimals', () => {
      const tokens = parser.tokenize('3.14');
      expect(tokens[0].type).toBe('NUMBER');
      expect(tokens[0].value).toBe('3.14');
    });

    it('should tokenize scientific notation', () => {
      const tokens = parser.tokenize('1.5e-10');
      expect(tokens[0].type).toBe('NUMBER');
      expect(tokens[0].value).toBe('1.5e-10');
    });

    it('should tokenize range references', () => {
      const tokens = parser.tokenize('A1:B2');
      expect(tokens[0].type).toBe('RANGE_REFERENCE');
      expect(tokens[0].value).toBe('A1:B2');
    });

    it('should tokenize sheet references', () => {
      const tokens = parser.tokenize('Sheet1!A1');
      expect(tokens[0].type).toBe('CELL_REFERENCE');
      expect(tokens[0].value).toBe('Sheet1!A1');
    });

    it('should tokenize absolute references', () => {
      const tokens = parser.tokenize('$A$1');
      expect(tokens[0].type).toBe('CELL_REFERENCE');
      expect(tokens[0].value).toBe('$A$1');
    });

    it('should tokenize error literals', () => {
      const tokens = parser.tokenize('#N/A');
      expect(tokens[0].type).toBe('ERROR');
      expect(tokens[0].value).toBe('#N/A');
    });
  });

  describe('parsing', () => {
    it('should parse a simple arithmetic expression', () => {
      const parsed = parser.parse('1+2*3');
      expect(parsed.ast.type).toBe('BINARY_OPERATION');
    });

    it('should parse function calls', () => {
      const parsed = parser.parse('SUM(A1,B2)');
      expect(parsed.ast.type).toBe('FUNCTION_CALL');
    });

    it('should extract dependencies', () => {
      const parsed = parser.parse('SUM(A1,B2)');
      expect(parsed.dependencies.length).toBeGreaterThan(0);
    });

    it('should validate correct formulas', () => {
      const result = parser.validate('SUM(1,2,3)');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid formulas', () => {
      const result = parser.validate('SUM(');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('FunctionRegistry', () => {
  const registry = new FunctionRegistry();

  describe('math functions', () => {
    it('should execute SUM', () => {
      const result = registry.execute('SUM', [1, 2, 3, 4, 5]);
      expect(result).toBe(15);
    });

    it('should execute AVERAGE', () => {
      const result = registry.execute('AVERAGE', [1, 2, 3, 4, 5]);
      expect(result).toBe(3);
    });

    it('should execute MIN', () => {
      const result = registry.execute('MIN', [5, 2, 8, 1, 9]);
      expect(result).toBe(1);
    });

    it('should execute MAX', () => {
      const result = registry.execute('MAX', [5, 2, 8, 1, 9]);
      expect(result).toBe(9);
    });

    it('should execute COUNT', () => {
      const result = registry.execute('COUNT', [1, 2, 3, 'text', null]);
      expect(result).toBe(3);
    });

    it('should execute ABS', () => {
      const result = registry.execute('ABS', [-5]);
      expect(result).toBe(5);
    });

    it('should execute ROUND', () => {
      const result = registry.execute('ROUND', [3.14159, 2]);
      expect(result).toBe(3.14);
    });

    it('should execute POWER', () => {
      const result = registry.execute('POWER', [2, 3]);
      expect(result).toBe(8);
    });

    it('should execute SQRT', () => {
      const result = registry.execute('SQRT', [16]);
      expect(result).toBe(4);
    });

    it('should handle division by zero in MOD', () => {
      const result = registry.execute('MOD', [10, 0]);
      expect(result).toBe('#DIV/0!');
    });
  });

  describe('text functions', () => {
    it('should execute CONCATENATE', () => {
      const result = registry.execute('CONCATENATE', ['Hello', ' ', 'World']);
      expect(result).toBe('Hello World');
    });

    it('should execute LEFT', () => {
      const result = registry.execute('LEFT', ['Hello', 2]);
      expect(result).toBe('He');
    });

    it('should execute RIGHT', () => {
      const result = registry.execute('RIGHT', ['Hello', 2]);
      expect(result).toBe('lo');
    });

    it('should execute MID', () => {
      const result = registry.execute('MID', ['Hello', 2, 2]);
      expect(result).toBe('el');
    });

    it('should execute LEN', () => {
      const result = registry.execute('LEN', ['Hello']);
      expect(result).toBe(5);
    });

    it('should execute UPPER', () => {
      const result = registry.execute('UPPER', ['hello']);
      expect(result).toBe('HELLO');
    });

    it('should execute LOWER', () => {
      const result = registry.execute('LOWER', ['HELLO']);
      expect(result).toBe('hello');
    });

    it('should execute TRIM', () => {
      const result = registry.execute('TRIM', ['  hello   world  ']);
      expect(result).toBe('hello world');
    });
  });

  describe('logical functions', () => {
    it('should execute IF with true condition', () => {
      const result = registry.execute('IF', [true, 'yes', 'no']);
      expect(result).toBe('yes');
    });

    it('should execute IF with false condition', () => {
      const result = registry.execute('IF', [false, 'yes', 'no']);
      expect(result).toBe('no');
    });

    it('should execute AND', () => {
      const result = registry.execute('AND', [true, true, true]);
      expect(result).toBe(true);
    });

    it('should execute AND with false', () => {
      const result = registry.execute('AND', [true, false, true]);
      expect(result).toBe(false);
    });

    it('should execute OR', () => {
      const result = registry.execute('OR', [false, true, false]);
      expect(result).toBe(true);
    });

    it('should execute OR with all false', () => {
      const result = registry.execute('OR', [false, false, false]);
      expect(result).toBe(false);
    });

    it('should execute NOT', () => {
      const result = registry.execute('NOT', [true]);
      expect(result).toBe(false);
    });

    it('should execute TRUE', () => {
      const result = registry.execute('TRUE', []);
      expect(result).toBe(true);
    });

    it('should execute FALSE', () => {
      const result = registry.execute('FALSE', []);
      expect(result).toBe(false);
    });
  });

  describe('information functions', () => {
    it('should execute ISNUMBER', () => {
      expect(registry.execute('ISNUMBER', [42])).toBe(true);
      expect(registry.execute('ISNUMBER', ['text'])).toBe(false);
    });

    it('should execute ISTEXT', () => {
      expect(registry.execute('ISTEXT', ['text'])).toBe(true);
      expect(registry.execute('ISTEXT', [42])).toBe(false);
    });

    it('should execute ISLOGICAL', () => {
      expect(registry.execute('ISLOGICAL', [true])).toBe(true);
      expect(registry.execute('ISLOGICAL', [42])).toBe(false);
    });

    it('should execute ISBLANK', () => {
      expect(registry.execute('ISBLANK', [null])).toBe(true);
      expect(registry.execute('ISBLANK', [42])).toBe(false);
    });

    it('should execute ISERROR', () => {
      expect(registry.execute('ISERROR', ['#N/A'])).toBe(true);
      expect(registry.execute('ISERROR', [42])).toBe(false);
    });
  });
});

describe('FormulaEvaluator', () => {
  const parser = new FormulaParser();
  const evaluator = new FormulaEvaluator();

  describe('basic evaluation', () => {
    it('should evaluate simple arithmetic', () => {
      const parsed = parser.parse('1+2');
      const context = createMockContext();
      const result = evaluator.evaluate(parsed, context);

      expect(result.value).toBe(3);
      expect(result.error).toBeUndefined();
    });

    it('should evaluate operator precedence', () => {
      const parsed = parser.parse('1+2*3');
      const context = createMockContext();
      const result = evaluator.evaluate(parsed, context);

      expect(result.value).toBe(7);
    });

    it('should evaluate parentheses', () => {
      const parsed = parser.parse('(1+2)*3');
      const context = createMockContext();
      const result = evaluator.evaluate(parsed, context);

      expect(result.value).toBe(9);
    });

    it('should evaluate cell references', () => {
      const parsed = parser.parse('A1+B2');
      const context = createMockContext({
        A1: 10,
        B2: 20,
      });
      const result = evaluator.evaluate(parsed, context);

      expect(result.value).toBe(30);
    });

    it('should track dependencies', () => {
      const parsed = parser.parse('A1+B2');
      const context = createMockContext({
        A1: 10,
        B2: 20,
      });
      const result = evaluator.evaluate(parsed, context);

      expect(result.dependencies).toContain('A1');
      expect(result.dependencies).toContain('B2');
    });
  });

  describe('function evaluation', () => {
    it('should evaluate SUM with cell references', () => {
      const parsed = parser.parse('SUM(A1,B2,C3)');
      const context = createMockContext({
        A1: 10,
        B2: 20,
        C3: 30,
      });
      const result = evaluator.evaluate(parsed, context);

      expect(result.value).toBe(60);
    });

    it('should evaluate IF function', () => {
      const parsed = parser.parse('IF(A1>10,"large","small")');
      const context = createMockContext({
        A1: 15,
      });
      const result = evaluator.evaluate(parsed, context);

      expect(result.value).toBe('large');
    });

    it('should evaluate CONCATENATE', () => {
      const parsed = parser.parse('CONCATENATE(A1," ",B2)');
      const context = createMockContext({
        A1: 'Hello',
        B2: 'World',
      });
      const result = evaluator.evaluate(parsed, context);

      expect(result.value).toBe('Hello World');
    });
  });

  describe('error handling', () => {
    it('should handle division by zero', () => {
      const parsed = parser.parse('10/0');
      const context = createMockContext();
      const result = evaluator.evaluate(parsed, context);

      expect(result.value).toBe('#DIV/0!');
      expect(result.error).toBeDefined();
    });

    it('should handle missing cell references', () => {
      const parsed = parser.parse('A1+B2');
      const context = createMockContext({
        A1: 10,
        // B2 is missing
      });
      const result = evaluator.evaluate(parsed, context);

      expect(result.value).toBe(10); // Missing values treated as 0 or null
    });

    it('should handle unknown functions', () => {
      const parsed = parser.parse('UNKNOWNFUNC(1)');
      const context = createMockContext();
      const result = evaluator.evaluate(parsed, context);

      expect(result.value).toBe('#NAME?');
      expect(result.error).toBeDefined();
    });

    it('should handle type errors', () => {
      const parsed = parser.parse('SUM("text")');
      const context = createMockContext();
      const result = evaluator.evaluate(parsed, context);

      // SUM should handle non-numbers gracefully
      expect(result.value).toBe(0);
    });
  });

  describe('comparison operations', () => {
    it('should evaluate equality', () => {
      const parsed = parser.parse('A1=B2');
      const context = createMockContext({
        A1: 10,
        B2: 10,
      });
      const result = evaluator.evaluate(parsed, context);

      expect(result.value).toBe(true);
    });

    it('should evaluate inequality', () => {
      const parsed = parser.parse('A1>B2');
      const context = createMockContext({
        A1: 15,
        B2: 10,
      });
      const result = evaluator.evaluate(parsed, context);

      expect(result.value).toBe(true);
    });

    it('should evaluate less than or equal', () => {
      const parsed = parser.parse('A1<=B2');
      const context = createMockContext({
        A1: 10,
        B2: 15,
      });
      const result = evaluator.evaluate(parsed, context);

      expect(result.value).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  const parser = new FormulaParser();
  const evaluator = new FormulaEvaluator();

  it('should evaluate complex nested formulas', () => {
    const parsed = parser.parse('IF(AVERAGE(A1,B2,C3)>10,SUM(A1,B2,C3),0)');
    const context = createMockContext({
      A1: 5,
      B2: 15,
      C3: 20,
    });
    const result = evaluator.evaluate(parsed, context);

    expect(result.value).toBe(40); // Average is > 10, so return sum
  });

  it('should evaluate text manipulation', () => {
    const parsed = parser.parse('CONCATENATE(UPPER(A1)," ",LEFT(B2,1))');
    const context = createMockContext({
      A1: 'hello',
      B2: 'world',
    });
    const result = evaluator.evaluate(parsed, context);

    expect(result.value).toBe('HELLO w');
  });

  it('should evaluate mathematical expressions', () => {
    const parsed = parser.parse('SQRT(POWER(A1,2)+POWER(B2,2))');
    const context = createMockContext({
      A1: 3,
      B2: 4,
    });
    const result = evaluator.evaluate(parsed, context);

    expect(result.value).toBe(5); // sqrt(9 + 16) = 5
  });

  it('should handle batch evaluation', () => {
    const formulas = [
      parser.parse('SUM(A1,B2)'),
      parser.parse('AVERAGE(A1,B2)'),
      parser.parse('A1*B2'),
    ];
    const context = createMockContext({
      A1: 10,
      B2: 20,
    });
    const results = evaluator.evaluateBatch(formulas, context);

    expect(results[0].value).toBe(30);
    expect(results[1].value).toBe(15);
    expect(results[2].value).toBe(200);
  });
});

describe('Performance Tests', () => {
  const parser = new FormulaParser();
  const evaluator = new FormulaEvaluator();

  it('should parse complex formulas quickly', () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      parser.parse('SUM(A1,B2,C3,D4,E5,F6,G7,H8,I9,J10)*2+100');
    }
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
  });

  it('should evaluate formulas quickly', () => {
    const parsed = parser.parse('SUM(A1,B2,C3,D4,E5,F6,G7,H8,I9,J10)');
    const context = createMockContext({
      A1: 1,
      B2: 2,
      C3: 3,
      D4: 4,
      E5: 5,
      F6: 6,
      G7: 7,
      H8: 8,
      I9: 9,
      J10: 10,
    });

    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      evaluator.evaluate(parsed, context);
    }
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
  });
});
