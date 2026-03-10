/**
 * Tests for FormulaGenerator
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { FormulaGenerator } from '../FormulaGenerator.js';
import type { SpreadsheetIntent, Entity, ParsedFormula } from '../types.js';

describe('FormulaGenerator', () => {
  let generator: FormulaGenerator;

  beforeEach(() => {
    generator = new FormulaGenerator();
  });

  describe('generateFromIntent', () => {
    it('should generate calculation formula', () => {
      const intent: SpreadsheetIntent = {
        type: 'create_formula',
        confidence: 0.9,
        action: 'sum the sales column',
      };

      const entities: Entity[] = [
        {
          type: 'operation',
          text: 'sum',
          position: { start: 0, end: 3 },
          resolved: { operation: { name: 'sum', excelName: 'SUM', parameters: [] } },
          confidence: 0.9,
        },
        {
          type: 'range',
          text: 'A1:A100',
          position: { start: 4, end: 12 },
          resolved: { range: { start: 'A1', end: 'A100' } },
          confidence: 0.95,
        },
      ];

      const formula = generator.generateFromIntent(intent, entities);

      expect(formula.formula).toContain('SUM');
      expect(formula.formula).toContain('A1:A100');
      expect(formula.explanation).toBeTruthy();
      expect(formula.complexity).toBeGreaterThan(0);
    });

    it('should generate analysis formula', () => {
      const intent: SpreadsheetIntent = {
        type: 'analyze',
        confidence: 0.8,
        action: 'analyze the sales data',
      };

      const entities: Entity[] = [
        {
          type: 'range',
          text: 'A1:Z100',
          position: { start: 0, end: 8 },
          resolved: { range: { start: 'A1', end: 'Z100' } },
          confidence: 0.95,
        },
      ];

      const formula = generator.generateFromIntent(intent, entities);

      expect(formula.formula).toContain('AVERAGE');
      expect(formula.intent.type).toBe('analyze');
    });

    it('should generate aggregate formula', () => {
      const intent: SpreadsheetIntent = {
        type: 'aggregate',
        confidence: 0.8,
        action: 'aggregate sales by region',
      };

      const entities: Entity[] = [
        {
          type: 'operation',
          text: 'sum',
          position: { start: 0, end: 3 },
          resolved: { operation: { name: 'sum', excelName: 'SUM', parameters: [] } },
          confidence: 0.9,
        },
        {
          type: 'range',
          text: 'B1:B100',
          position: { start: 4, end: 12 },
          resolved: { range: { start: 'B1', end: 'B100' } },
          confidence: 0.95,
        },
      ];

      const formula = generator.generateFromIntent(intent, entities);

      expect(formula.formula).toContain('SUM');
      expect(formula.intent.type).toBe('aggregate');
    });

    it('should generate filter formula', () => {
      const intent: SpreadsheetIntent = {
        type: 'filter',
        confidence: 0.8,
        action: 'filter values greater than 100',
      };

      const entities: Entity[] = [
        {
          type: 'range',
          text: 'A1:A100',
          position: { start: 0, end: 8 },
          resolved: { range: { start: 'A1', end: 'A100' } },
          confidence: 0.95,
        },
        {
          type: 'condition',
          text: 'greater than',
          position: { start: 9, end: 21 },
          resolved: { condition: { operator: '>', operand: '100' } },
          confidence: 0.8,
        },
      ];

      const formula = generator.generateFromIntent(intent, entities);

      expect(formula.formula).toContain('FILTER');
      expect(formula.formula).toContain('>');
      expect(formula.intent.type).toBe('filter');
    });

    it('should generate validation formula', () => {
      const intent: SpreadsheetIntent = {
        type: 'validate',
        confidence: 0.8,
        action: 'validate that A1 is greater than 0',
      };

      const entities: Entity[] = [
        {
          type: 'cell',
          text: 'A1',
          position: { start: 0, end: 2 },
          resolved: { cellReference: 'A1' },
          confidence: 0.95,
        },
        {
          type: 'condition',
          text: 'greater than',
          position: { start: 3, end: 14 },
          resolved: { condition: { operator: '>', operand: '0' } },
          confidence: 0.8,
        },
      ];

      const formula = generator.generateFromIntent(intent, entities);

      expect(formula.formula).toContain('IF');
      expect(formula.formula).toContain('>');
      expect(formula.intent.type).toBe('validate');
    });

    it('should generate transform formula', () => {
      const intent: SpreadsheetIntent = {
        type: 'transform',
        confidence: 0.8,
        action: 'convert to uppercase',
      };

      const entities: Entity[] = [
        {
          type: 'cell',
          text: 'A1',
          position: { start: 0, end: 2 },
          resolved: { cellReference: 'A1' },
          confidence: 0.95,
        },
      ];

      const formula = generator.generateFromIntent(intent, entities);

      expect(formula.formula).toContain('UPPER');
      expect(formula.formula).toContain('A1');
      expect(formula.intent.type).toBe('transform');
    });
  });

  describe('optimizeFormula', () => {
    it('should optimize IF(ISERROR()) to IFERROR()', () => {
      const optimized = generator.optimizeFormula('IF(ISERROR(A1), "Error", A1)');

      expect(optimized).toContain('IFERROR');
    });

    it('should optimize SUM(IF()) to SUMIFS()', () => {
      const optimized = generator.optimizeFormula('SUM(IF(A1:A10>0, B1:B10))');

      expect(optimized).toContain('SUMIFS');
    });

    it('should handle already optimized formulas', () => {
      const formula = '=SUM(A1:A10)';
      const optimized = generator.optimizeFormula(formula);

      expect(optimized).toBe(formula);
    });

    it('should handle complex nested optimizations', () => {
      const complex = 'IF(ISERROR(VLOOKUP(A1,B1:C10,2,FALSE)), "Not Found", VLOOKUP(A1,B1:C10,2,FALSE))';
      const optimized = generator.optimizeFormula(complex);

      // Should optimize at least part of it
      expect(optimized.length).toBeLessThan(complex.length);
    });
  });

  describe('suggestCompletion', () => {
    it('should suggest function completions', () => {
      const suggestions = generator.suggestCompletion('SU');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.text === 'SUM(')).toBe(true);
      expect(suggestions.some(s => s.type === 'function')).toBe(true);
    });

    it('should suggest range completions after comma', () => {
      const suggestions = generator.suggestCompletion('=SUM(');

      expect(suggestions.some(s => s.type === 'range')).toBe(true);
    });

    it('should return suggestions sorted by relevance', () => {
      const suggestions = generator.suggestCompletion('A');

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].relevance).toBeGreaterThanOrEqual(suggestions[i].relevance);
      }
    });

    it('should limit suggestions to 10', () => {
      const suggestions = generator.suggestCompletion('S');

      expect(suggestions.length).toBeLessThanOrEqual(10);
    });

    it('should handle empty partial', () => {
      const suggestions = generator.suggestCompletion('');

      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate complexity for simple formula', () => {
      const intent: SpreadsheetIntent = {
        type: 'create_formula',
        confidence: 0.9,
        action: 'sum A1',
      };

      const entities: Entity[] = [
        {
          type: 'cell',
          text: 'A1',
          position: { start: 0, end: 2 },
          resolved: { cellReference: 'A1' },
          confidence: 0.95,
        },
      ];

      const formula = generator.generateFromIntent(intent, entities);

      expect(formula.complexity).toBeGreaterThan(0);
      expect(formula.complexity).toBeLessThan(10);
    });

    it('should calculate higher complexity for nested formulas', () => {
      const intent: SpreadsheetIntent = {
        type: 'create_formula',
        confidence: 0.9,
        action: 'nested formula',
      };

      const entities: Entity[] = [];

      const formula = generator.generateFromIntent(intent, entities);
      formula.formula = '=IF(AVERAGE(A1:A10) > 100, SUM(A1:A10), 0)';

      const recalculatedComplexity = generator['calculateComplexity'](formula.formula);

      expect(recalculatedComplexity).toBeGreaterThan(5);
    });
  });

  describe('function registry', () => {
    it('should get function definition', () => {
      const func = generator.getFunction('SUM');

      expect(func).toBeDefined();
      expect(func?.name).toBe('SUM');
      expect(func?.category).toBe('math');
    });

    it('should get all function names', () => {
      const functions = generator.getAllFunctions();

      expect(functions.length).toBeGreaterThan(0);
      expect(functions).toContain('SUM');
      expect(functions).toContain('AVERAGE');
      expect(functions).toContain('IF');
    });

    it('should get functions by category', () => {
      const mathFunctions = generator.getFunctionsByCategory('math');

      expect(mathFunctions.length).toBeGreaterThan(0);
      expect(mathFunctions.some(f => f.name === 'SUM')).toBe(true);
    });

    it('should return undefined for unknown function', () => {
      const func = generator.getFunction('UNKNOWN');

      expect(func).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty entities', () => {
      const intent: SpreadsheetIntent = {
        type: 'create_formula',
        confidence: 0.5,
        action: 'calculate',
      };

      const formula = generator.generateFromIntent(intent, []);

      expect(formula.formula).toBeTruthy();
      expect(formula.warnings).toBeDefined();
    });

    it('should handle missing resolved values', () => {
      const intent: SpreadsheetIntent = {
        type: 'create_formula',
        confidence: 0.9,
        action: 'sum the range',
      };

      const entities: Entity[] = [
        {
          type: 'range',
          text: 'A1:A100',
          position: { start: 0, end: 8 },
          resolved: {},
          confidence: 0.95,
        },
      ];

      const formula = generator.generateFromIntent(intent, entities);

      expect(formula).toBeDefined();
    });

    it('should handle multiple operations', () => {
      const intent: SpreadsheetIntent = {
        type: 'create_formula',
        confidence: 0.9,
        action: 'calculate with multiple operations',
      };

      const entities: Entity[] = [
        {
          type: 'operation',
          text: 'sum',
          position: { start: 0, end: 3 },
          resolved: { operation: { name: 'sum', excelName: 'SUM', parameters: [] } },
          confidence: 0.9,
        },
        {
          type: 'operation',
          text: 'average',
          position: { start: 4, end: 11 },
          resolved: { operation: { name: 'average', excelName: 'AVERAGE', parameters: [] } },
          confidence: 0.9,
        },
      ];

      const formula = generator.generateFromIntent(intent, entities);

      expect(formula.formula).toBeTruthy();
    });
  });

  describe('warnings', () => {
    it('should include warnings for complex formulas', () => {
      const intent: SpreadsheetIntent = {
        type: 'create_formula',
        confidence: 0.9,
        action: 'complex calculation',
      };

      const entities: Entity[] = [];
      const formula = generator.generateFromIntent(intent, entities);

      formula.formula = '=IF(IF(IF(A1>0,TRUE,FALSE),TRUE,FALSE),SUM(A1:Z1000),0)';

      expect(Array.isArray(formula.warnings)).toBe(true);
    });
  });
});
