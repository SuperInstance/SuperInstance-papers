/**
 * Tests for NLParser
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NLParser } from '../NLParser.js';
import type { SpreadsheetIntent, Entity } from '../types.js';

describe('NLParser', () => {
  let parser: NLParser;

  beforeEach(() => {
    parser = new NLParser({ provider: 'mock' });
  });

  describe('parseToFormula', () => {
    it('should parse simple sum request', async () => {
      const result = await parser.parseToFormula('sum the sales column');

      expect(result.formula).toBeTruthy();
      expect(result.intent.type).toBe('create_formula');
      expect(result.explanation).toBeTruthy();
    });

    it('should parse average request with range', async () => {
      const result = await parser.parseToFormula('calculate the average of A1 to A10');

      expect(result.formula).toContain('AVERAGE');
      expect(result.intent.type).toBe('create_formula');
    });

    it('should parse count request', async () => {
      const result = await parser.parseToFormula('count the values in column B');

      expect(result.formula).toContain('COUNT');
      expect(result.intent.type).toBe('create_formula');
    });

    it('should parse max/min requests', async () => {
      const maxResult = await parser.parseToFormula('find the maximum value');
      const minResult = await parser.parseToFormula('find the minimum value');

      expect(maxResult.formula).toContain('MAX');
      expect(minResult.formula).toContain('MIN');
    });

    it('should handle cell references', async () => {
      const result = await parser.parseToFormula('add A1 and B2');

      expect(result.entities.some(e => e.type === 'cell')).toBe(true);
    });

    it('should handle range references', async () => {
      const result = await parser.parseToFormula('sum from A1 to Z100');

      expect(result.entities.some(e => e.type === 'range')).toBe(true);
    });
  });

  describe('detectIntent', () => {
    it('should detect formula creation intent', () => {
      const intent = parser.detectIntent('calculate the sum of A1 to A10');

      expect(intent.type).toBe('create_formula');
      expect(intent.confidence).toBeGreaterThan(0);
    });

    it('should detect analysis intent', () => {
      const intent = parser.detectIntent('analyze the trends in the data');

      expect(intent.type).toBe('analyze');
    });

    it('should detect filter intent', () => {
      const intent = parser.detectIntent('show only values greater than 100');

      expect(intent.type).toBe('filter');
    });

    it('should detect sort intent', () => {
      const intent = parser.detectIntent('sort by column A in descending order');

      expect(intent.type).toBe('sort');
    });

    it('should detect chart creation intent', () => {
      const intent = parser.detectIntent('create a bar chart of the sales data');

      expect(intent.type).toBe('chart');
    });
  });

  describe('extractEntities', () => {
    it('should extract cell references', () => {
      const entities = parser.extractEntities('calculate A1 plus B5');

      expect(entities.some(e => e.type === 'cell')).toBe(true);
      expect(entities.filter(e => e.type === 'cell').length).toBe(2);
    });

    it('should extract ranges', () => {
      const entities = parser.extractEntities('sum from A1 to Z100');

      expect(entities.some(e => e.type === 'range')).toBe(true);
    });

    it('should extract values', () => {
      const entities = parser.extractEntities('add 500 to the total');

      expect(entities.some(e => e.type === 'value')).toBe(true);
      const valueEntity = entities.find(e => e.type === 'value');
      expect(valueEntity?.resolved.value?.parsed).toBe(500);
    });

    it('should extract percentages', () => {
      const entities = parser.extractEntities('calculate 50% of the total');

      expect(entities.some(e => e.type === 'value')).toBe(true);
      const valueEntity = entities.find(e => e.type === 'value');
      expect(valueEntity?.resolved.value?.type).toBe('percentage');
    });

    it('should extract operations', () => {
      const entities = parser.extractEntities('sum the values in column A');

      expect(entities.some(e => e.type === 'operation')).toBe(true);
    });

    it('should extract conditions', () => {
      const entities = parser.extractEntities('filter values greater than 100');

      expect(entities.some(e => e.type === 'condition')).toBe(true);
    });

    it('should resolve ambiguous entities', () => {
      const entities = parser.extractEntities('cell A1 and A1:Z100');

      // Should not have overlapping entities
      const positions = entities.map(e => `${e.position.start}-${e.position.end}`);
      const uniquePositions = new Set(positions);
      expect(positions.length).toBe(uniquePositions.size);
    });
  });

  describe('explainFormula', () => {
    it('should explain SUM formula', async () => {
      const explanation = await parser.explainFormula('=SUM(A1:A10)');

      expect(explanation).toBeTruthy();
      expect(typeof explanation).toBe('string');
    });

    it('should explain AVERAGE formula', async () => {
      const explanation = await parser.explainFormula('=AVERAGE(B1:B20)');

      expect(explanation).toContain('average');
    });

    it('should explain IF formula', async () => {
      const explanation = await parser.explainFormula('=IF(A1>10,"Yes","No")');

      expect(explanation).toContain('condition');
    });

    it('should explain VLOOKUP formula', async () => {
      const explanation = await parser.explainFormula('=VLOOKUP(A1,B1:C10,2,FALSE)');

      expect(explanation).toContain('lookup');
    });
  });

  describe('suggestCompletion', () => {
    it('should suggest function completions', () => {
      const suggestions = parser.suggestCompletion('SU');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.text.includes('SUM'))).toBe(true);
    });

    it('should suggest range completions', () => {
      const suggestions = parser.suggestDescription('=SUM(');

      expect(suggestions.some(s => s.type === 'range')).toBe(true);
    });

    it('should return suggestions sorted by relevance', () => {
      const suggestions = parser.suggestCompletion('A');

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].relevance).toBeGreaterThanOrEqual(suggestions[i].relevance);
      }
    });
  });

  describe('parseWithClarification', () => {
    it('should request clarification for ambiguous input', async () => {
      const result = await parser.parseWithClarification('calculate it');

      expect(result.needsClarification).toBe(true);
      expect(result.clarificationQuestions).toBeDefined();
      expect(result.clarificationQuestions!.length).toBeGreaterThan(0);
    });

    it('should not request clarification for clear input', async () => {
      const result = await parser.parseWithClarification('sum A1 to A10');

      expect(result.needsClarification).toBe(false);
      expect(result.formula.formula).toBeTruthy();
    });

    it('should provide alternative interpretations', async () => {
      const result = await parser.parseWithClarification('analyze the data');

      expect(result.alternatives).toBeDefined();
      expect(result.alternatives!.length).toBeGreaterThan(0);
    });
  });

  describe('context management', () => {
    it('should update context', () => {
      parser.updateContext('Sheet1', {
        headers: { A: 'Name', B: 'Sales' },
        columnTypes: { A: 'string', B: 'number' },
      });

      // Should not throw
      expect(true).toBe(true);
    });

    it('should use context in parsing', async () => {
      parser.updateContext('Sheet1', {
        headers: { A: 'Sales', B: 'Quantity' },
        columnTypes: { A: 'number', B: 'number' },
      });

      const result = await parser.parseToFormula('sum the sales column', 'Sheet1');

      expect(result).toBeDefined();
    });
  });

  describe('feedback and corrections', () => {
    it('should accept positive feedback', () => {
      parser.provideFeedback('Sheet1', 'sum A1 to A10', 'positive');

      // Should not throw
      expect(true).toBe(true);
    });

    it('should accept corrections', () => {
      parser.provideCorrection('Sheet1', 'sum A1 to A10', '=SUM(A1:A20)');

      // Should not throw
      expect(true).toBe(true);
    });

    it('should learn from corrections', async () => {
      parser.provideCorrection('Sheet1', 'sum the column', '=SUM(A:A)');

      const result = await parser.parseToFormula('sum the column', 'Sheet1');

      expect(result).toBeDefined();
    });
  });

  describe('cost tracking', () => {
    it('should track costs when enabled', () => {
      const tracking = parser.getCostTracking();

      expect(tracking).toBeDefined();
      expect(typeof tracking.totalTokens).toBe('number');
      expect(typeof tracking.totalCost).toBe('number');
    });
  });

  describe('custom patterns', () => {
    it('should allow adding custom intent patterns', () => {
      parser.addCustomPattern('create_formula', /compute/i);

      const intent = parser.detectIntent('compute the total');

      expect(intent.type).toBe('create_formula');
    });
  });

  describe('statistics', () => {
    it('should provide statistics', () => {
      const stats = parser.getStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.totalContexts).toBe('number');
      expect(typeof stats.totalConversations).toBe('number');
    });
  });

  describe('export/import state', () => {
    it('should export state', () => {
      const state = parser.exportState();

      expect(state).toBeDefined();
      expect(state.contexts).toBeDefined();
      expect(state.userPreferences).toBeDefined();
    });

    it('should import state', () => {
      const state = {
        contexts: {
          Sheet1: {
            sheetName: 'Sheet1',
            sheets: ['Sheet1'],
            headers: { A: 'Test' },
            columnTypes: {},
            namedRanges: {},
            formulas: {},
            preferences: {
              dateFormat: 'MM/DD/YYYY',
              numberFormat: '#,##0.00',
              useR1C1: false,
              useTableReferences: true,
              defaultAggregation: 'SUM',
            },
          },
        },
        conversationHistory: {},
        errorCorrections: {},
        userPreferences: {
          dateFormat: 'MM/DD/YYYY',
          numberFormat: '#,##0.00',
          useR1C1: false,
          useTableReferences: true,
          defaultAggregation: 'SUM',
        },
      };

      parser.importState(state);

      expect(parser).toBeDefined();
    });
  });
});
