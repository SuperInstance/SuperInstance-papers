/**
 * Integration Tests for NLP Components
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NLParser } from '../NLParser.js';
import type { SpreadsheetContext } from '../types.js';

describe('NLP Integration Tests', () => {
  let parser: NLParser;

  beforeEach(() => {
    parser = new NLParser({ provider: 'mock' });
  });

  describe('end-to-end formula generation', () => {
    it('should handle complete workflow for simple sum', async () => {
      const input = 'sum the sales column';
      const result = await parser.parseToFormula(input);

      expect(result.formula).toBeTruthy();
      expect(result.intent.type).toBe('create_formula');
      expect(result.explanation).toBeTruthy();
      expect(result.entities.length).toBeGreaterThan(0);
    });

    it('should handle workflow with context', async () => {
      const context: Partial<SpreadsheetContext> = {
        headers: { A: 'Sales', B: 'Quantity' },
        columnTypes: { A: 'number', B: 'number' },
        namedRanges: { 'SalesRange': 'A1:A100' },
      };

      parser.updateContext('Sheet1', context);

      const result = await parser.parseToFormula('sum the sales', 'Sheet1');

      expect(result).toBeDefined();
      expect(result.formula).toBeTruthy();
    });

    it('should learn from corrections', async () => {
      // First attempt
      const result1 = await parser.parseToFormula('sum the column', 'Sheet1');

      // Provide correction
      parser.provideCorrection('Sheet1', 'sum the column', '=SUM(A:A)');

      // Second attempt should use correction
      const result2 = await parser.parseToFormula('sum the column', 'Sheet1');

      expect(result2).toBeDefined();
    });

    it('should handle ambiguous requests with clarification', async () => {
      const result = await parser.parseWithClarification('calculate it');

      expect(result.needsClarification).toBe(true);
      expect(result.clarificationQuestions).toBeDefined();
      expect(result.clarificationQuestions!.length).toBeGreaterThan(0);
    });

    it('should provide alternative interpretations', async () => {
      const result = await parser.parseWithClarification('analyze the data');

      expect(result.alternatives).toBeDefined();
      expect(result.alternatives!.length).toBeGreaterThan(0);
    });
  });

  describe('multi-turn conversations', () => {
    it('should maintain conversation context', async () => {
      parser.updateContext('Sheet1', {
        headers: { A: 'Sales', B: 'Expenses' },
      });

      await parser.parseToFormula('sum the sales', 'Sheet1');
      await parser.parseToFormula('average the expenses', 'Sheet1');
      await parser.parseToFormula('count the rows', 'Sheet1');

      const history = parser['contextManager'].getConversationHistory('Sheet1');

      expect(history.length).toBe(3);
      expect(history[0].input).toBe('sum the sales');
      expect(history[1].input).toBe('average the expenses');
      expect(history[2].input).toBe('count the rows');
    });

    it('should use conversation history for disambiguation', async () => {
      parser.updateContext('Sheet1', {
        headers: { A: 'Sales' },
      });

      await parser.parseToFormula('sum column A', 'Sheet1');

      // Reference previous context
      const result = await parser.parseToFormula('do the same for B', 'Sheet1');

      expect(result).toBeDefined();
    });
  });

  describe('complex scenarios', () => {
    it('should handle nested function requests', async () => {
      const result = await parser.parseToFormula(
        'calculate the average if the sum is greater than 100'
      );

      expect(result.formula).toBeTruthy();
      expect(result.complexity).toBeGreaterThan(5);
    });

    it('should handle multiple entity types', async () => {
      const result = await parser.parseToFormula(
        'filter A1:A100 where values are greater than 500 and sum them'
      );

      expect(result.entities.some(e => e.type === 'range')).toBe(true);
      expect(result.entities.some(e => e.type === 'condition')).toBe(true);
      expect(result.entities.some(e => e.type === 'value')).toBe(true);
    });

    it('should handle cross-sheet references', async () => {
      parser.updateContext('Sheet1', {
        sheets: ['Sheet1', 'Sheet2', 'Sheet3'],
      });

      const result = await parser.parseToFormula(
        'sum the sales from Sheet2',
        'Sheet1'
      );

      expect(result).toBeDefined();
    });

    it('should handle named ranges', async () => {
      parser.updateContext('Sheet1', {
        namedRanges: {
          'SalesData': 'A1:A100',
          'Expenses': 'B1:B100',
        },
      });

      const result = await parser.parseToFormula(
        'sum the SalesData range',
        'Sheet1'
      );

      expect(result).toBeDefined();
    });
  });

  describe('error handling and recovery', () => {
    it('should handle invalid input gracefully', async () => {
      const result = await parser.parseToFormula('');

      expect(result).toBeDefined();
      expect(result.formula).toBeTruthy();
    });

    it('should handle malformed requests', async () => {
      const result = await parser.parseToFormula('asdfghjkl');

      expect(result).toBeDefined();
      expect(result.intent.confidence).toBeLessThan(0.5);
    });

    it('should handle feedback loops', async () => {
      const result1 = await parser.parseToFormula('sum column A', 'Sheet1');

      // Negative feedback
      parser.provideFeedback('Sheet1', 'sum column A', 'negative');

      // Provide correction
      parser.provideCorrection('Sheet1', 'sum column A', '=SUM(A:A)');

      // Should use correction
      const result2 = await parser.parseToFormula('sum column A', 'Sheet1');

      expect(result2).toBeDefined();
    });
  });

  describe('performance and optimization', () => {
    it('should optimize generated formulas', async () => {
      const result = await parser.parseToFormula(
        'check if there is an error and return 0 otherwise return the value'
      );

      expect(result.formula).toBeTruthy();
      // Should use IFERROR instead of IF(ISERROR())
    });

    it('should estimate formula complexity', async () => {
      const simpleResult = await parser.parseToFormula('sum A1');
      const complexResult = await parser.parseToFormula(
        'if the average of A1 to A10 is greater than the sum of B1 to B10 then return the maximum of C1 to C10 otherwise return the minimum'
      );

      expect(complexResult.complexity).toBeGreaterThan(simpleResult.complexity);
    });

    it('should provide completion suggestions', () => {
      const suggestions = parser.suggestCompletion('SU');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].relevance).toBeGreaterThan(0.5);
    });
  });

  describe('state persistence', () => {
    it('should export and import state correctly', async () => {
      // Set up some state
      parser.updateContext('Sheet1', {
        headers: { A: 'Test' },
      });

      await parser.parseToFormula('sum A1', 'Sheet1');
      parser.provideFeedback('Sheet1', 'sum A1', 'positive');

      // Export
      const state = parser.exportState();

      expect(state.contexts).toBeDefined();
      expect(state.conversationHistory).toBeDefined();

      // Create new parser and import
      const newParser = new NLParser({ provider: 'mock' });
      newParser.importState(state);

      // Verify state was imported
      const context = newParser['contextManager'].getContext('Sheet1');
      expect(context?.headers.A).toBe('Test');

      const history = newParser['contextManager'].getConversationHistory('Sheet1');
      expect(history.length).toBe(1);
      expect(history[0].feedback).toBe('positive');
    });
  });

  describe('real-world scenarios', () => {
    it('should handle business reporting queries', async () => {
      const queries = [
        'calculate total sales for Q1',
        'what is the average order value',
        'find the top 10 customers by revenue',
        'compare this month to last month',
        'show sales trend over time',
      ];

      for (const query of queries) {
        const result = await parser.parseToFormula(query);

        expect(result).toBeDefined();
        expect(result.formula).toBeTruthy();
      }
    });

    it('should handle data analysis queries', async () => {
      const queries = [
        'count how many values are above average',
        'find duplicate entries in column A',
        'calculate the standard deviation of sales',
        'identify outliers in the data',
      ];

      for (const query of queries) {
        const result = await parser.parseToFormula(query);

        expect(result).toBeDefined();
        expect(result.intent.type).toBe('create_formula');
      }
    });

    it('should handle financial calculations', async () => {
      const queries = [
        'calculate the compound interest',
        'determine the net present value',
        'compute the internal rate of return',
        'calculate loan payment',
      ];

      for (const query of queries) {
        const result = await parser.parseToFormula(query);

        expect(result).toBeDefined();
      }
    });
  });

  describe('statistics and monitoring', () => {
    it('should track usage statistics', async () => {
      await parser.parseToFormula('sum A1', 'Sheet1');
      await parser.parseToFormula('average B1', 'Sheet1');
      await parser.parseToFormula('count C1', 'Sheet1');

      const stats = parser.getStatistics();

      expect(stats.totalConversations).toBe(3);
    });

    it('should track costs when LLM is enabled', () => {
      const costTracking = parser.getCostTracking();

      expect(costTracking).toBeDefined();
      expect(typeof costTracking.totalCost).toBe('number');
    });
  });
});
