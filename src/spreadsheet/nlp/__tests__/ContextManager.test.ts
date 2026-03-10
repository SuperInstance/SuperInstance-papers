/**
 * Tests for ContextManager
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContextManager } from '../ContextManager.js';
import type { SpreadsheetContext, ParsedFormula, UserPreferences } from '../types.js';

describe('ContextManager', () => {
  let manager: ContextManager;

  beforeEach(() => {
    manager = new ContextManager();
  });

  describe('context management', () => {
    it('should create default context for new sheet', () => {
      const context = manager.getContext('Sheet1');

      expect(context).toBeDefined();
      expect(context?.sheetName).toBe('Sheet1');
      expect(context?.sheets).toContain('Sheet1');
    });

    it('should set and update context', () => {
      manager.setContext('Sheet1', {
        headers: { A: 'Name', B: 'Sales' },
      });

      const context = manager.getContext('Sheet1');

      expect(context?.headers).toEqual({ A: 'Name', B: 'Sales' });
    });

    it('should maintain separate contexts for different sheets', () => {
      manager.setContext('Sheet1', {
        headers: { A: 'ColumnA' },
      });

      manager.setContext('Sheet2', {
        headers: { A: 'ColumnB' },
      });

      const context1 = manager.getContext('Sheet1');
      const context2 = manager.getContext('Sheet2');

      expect(context1?.headers.A).toBe('ColumnA');
      expect(context2?.headers.A).toBe('ColumnB');
    });

    it('should update headers', () => {
      manager.updateHeaders('Sheet1', { A: 'Name', B: 'Sales' });

      const context = manager.getContext('Sheet1');

      expect(context?.headers).toEqual({ A: 'Name', B: 'Sales' });
    });

    it('should update column types', () => {
      manager.updateColumnTypes('Sheet1', {
        A: 'string',
        B: 'number',
        C: 'date',
      });

      const context = manager.getContext('Sheet1');

      expect(context?.columnTypes).toEqual({
        A: 'string',
        B: 'number',
        C: 'date',
      });
    });

    it('should add named ranges', () => {
      manager.addNamedRange('Sheet1', 'SalesData', 'A1:Z100');
      manager.addNamedRange('Sheet1', 'TotalSales', 'B1:B100');

      const context = manager.getContext('Sheet1');

      expect(context?.namedRanges['SalesData']).toBe('A1:Z100');
      expect(context?.namedRanges['TotalSales']).toBe('B1:B100');
    });
  });

  describe('conversation history', () => {
    it('should add conversation entry', () => {
      const parsedFormula: ParsedFormula = {
        formula: '=SUM(A1:A10)',
        explanation: 'Sum the values',
        intent: {
          type: 'create_formula',
          confidence: 0.9,
          action: 'sum the values',
        },
        entities: [],
        complexity: 2,
        warnings: [],
      };

      manager.addConversationEntry('Sheet1', 'sum A1 to A10', parsedFormula);

      const history = manager.getConversationHistory('Sheet1');

      expect(history.length).toBe(1);
      expect(history[0].input).toBe('sum A1 to A10');
      expect(history[0].output).toEqual(parsedFormula);
    });

    it('should maintain conversation order', () => {
      const parsedFormula: ParsedFormula = {
        formula: '=SUM(A1:A10)',
        explanation: 'Sum the values',
        intent: {
          type: 'create_formula',
          confidence: 0.9,
          action: 'sum the values',
        },
        entities: [],
        complexity: 2,
        warnings: [],
      };

      manager.addConversationEntry('Sheet1', 'first', parsedFormula);
      manager.addConversationEntry('Sheet1', 'second', parsedFormula);
      manager.addConversationEntry('Sheet1', 'third', parsedFormula);

      const history = manager.getConversationHistory('Sheet1');

      expect(history[0].input).toBe('first');
      expect(history[1].input).toBe('second');
      expect(history[2].input).toBe('third');
    });

    it('should limit history to 50 entries', () => {
      const parsedFormula: ParsedFormula = {
        formula: '=A1',
        explanation: 'Reference',
        intent: {
          type: 'create_formula',
          confidence: 0.9,
          action: 'reference',
        },
        entities: [],
        complexity: 1,
        warnings: [],
      };

      for (let i = 0; i < 100; i++) {
        manager.addConversationEntry('Sheet1', `entry ${i}`, parsedFormula);
      }

      const history = manager.getConversationHistory('Sheet1');

      expect(history.length).toBe(50);
    });

    it('should maintain separate histories for different sheets', () => {
      const parsedFormula: ParsedFormula = {
        formula: '=A1',
        explanation: 'Reference',
        intent: {
          type: 'create_formula',
          confidence: 0.9,
          action: 'reference',
        },
        entities: [],
        complexity: 1,
        warnings: [],
      };

      manager.addConversationEntry('Sheet1', 'input1', parsedFormula);
      manager.addConversationEntry('Sheet2', 'input2', parsedFormula);

      const history1 = manager.getConversationHistory('Sheet1');
      const history2 = manager.getConversationHistory('Sheet2');

      expect(history1.length).toBe(1);
      expect(history2.length).toBe(1);
      expect(history1[0].input).toBe('input1');
      expect(history2[0].input).toBe('input2');
    });
  });

  describe('feedback and corrections', () => {
    it('should add feedback to conversation entry', () => {
      const parsedFormula: ParsedFormula = {
        formula: '=SUM(A1:A10)',
        explanation: 'Sum the values',
        intent: {
          type: 'create_formula',
          confidence: 0.9,
          action: 'sum the values',
        },
        entities: [],
        complexity: 2,
        warnings: [],
      };

      manager.addConversationEntry('Sheet1', 'sum A1 to A10', parsedFormula);
      const history = manager.getConversationHistory('Sheet1');
      const timestamp = history[0].timestamp;

      manager.addFeedback('Sheet1', timestamp, 'positive');

      const updatedHistory = manager.getConversationHistory('Sheet1');
      expect(updatedHistory[0].feedback).toBe('positive');
    });

    it('should add correction to conversation entry', () => {
      const parsedFormula: ParsedFormula = {
        formula: '=SUM(A1:A10)',
        explanation: 'Sum the values',
        intent: {
          type: 'create_formula',
          confidence: 0.9,
          action: 'sum the values',
        },
        entities: [],
        complexity: 2,
        warnings: [],
      };

      manager.addConversationEntry('Sheet1', 'sum the column', parsedFormula);
      const history = manager.getConversationHistory('Sheet1');
      const timestamp = history[0].timestamp;

      manager.addCorrection('Sheet1', timestamp, '=SUM(A:A)');

      const updatedHistory = manager.getConversationHistory('Sheet1');
      expect(updatedHistory[0].corrections).toBe('=SUM(A:A)');
    });

    it('should create error corrections from user corrections', () => {
      const parsedFormula: ParsedFormula = {
        formula: '=SUM(A1:A10)',
        explanation: 'Sum the values',
        intent: {
          type: 'create_formula',
          confidence: 0.9,
          action: 'sum the values',
        },
        entities: [],
        complexity: 2,
        warnings: [],
      };

      manager.addConversationEntry('Sheet1', 'sum the column', parsedFormula);
      const history = manager.getConversationHistory('Sheet1');
      const timestamp = history[0].timestamp;

      manager.addCorrection('Sheet1', timestamp, '=SUM(A:A)');

      const corrections = manager.getErrorCorrections();
      expect(corrections.size).toBeGreaterThan(0);
    });

    it('should apply error corrections', () => {
      const parsedFormula: ParsedFormula = {
        formula: '=SUM(A1:A10)',
        explanation: 'Sum the values',
        intent: {
          type: 'create_formula',
          confidence: 0.9,
          action: 'sum the column',
        },
        entities: [],
        complexity: 2,
        warnings: [],
      };

      manager.addConversationEntry('Sheet1', 'sum the column', parsedFormula);
      const history = manager.getConversationHistory('Sheet1');
      const timestamp = history[0].timestamp;

      const correction = '=SUM(A:A)';
      manager.addCorrection('Sheet1', timestamp, correction);

      const applied = manager.applyErrorCorrection('=SUM(A1:A10)', 'sum the column');

      expect(applied).toBe(correction);
    });

    it('should return null when no correction exists', () => {
      const applied = manager.applyErrorCorrection('=SUM(A1:A10)', 'unknown input');

      expect(applied).toBeNull();
    });
  });

  describe('relevant context', () => {
    it('should get relevant context for formula generation', () => {
      manager.setContext('Sheet1', {
        headers: { A: 'Sales' },
        columnTypes: { A: 'number' },
      });

      const parsedFormula: ParsedFormula = {
        formula: '=SUM(A:A)',
        explanation: 'Sum sales',
        intent: {
          type: 'create_formula',
          confidence: 0.9,
          action: 'sum the sales',
        },
        entities: [],
        complexity: 2,
        warnings: [],
      };

      manager.addConversationEntry('Sheet1', 'sum the sales', parsedFormula);

      const relevant = manager.getRelevantContext('Sheet1', 'sum the sales');

      expect(relevant.context.headers.A).toBe('Sales');
      expect(relevant.recentHistory.length).toBe(1);
    });

    it('should return recent history (last 5 entries)', () => {
      const parsedFormula: ParsedFormula = {
        formula: '=A1',
        explanation: 'Reference',
        intent: {
          type: 'create_formula',
          confidence: 0.9,
          action: 'reference',
        },
        entities: [],
        complexity: 1,
        warnings: [],
      };

      for (let i = 0; i < 10; i++) {
        manager.addConversationEntry('Sheet1', `entry ${i}`, parsedFormula);
      }

      const relevant = manager.getRelevantContext('Sheet1', 'test');

      expect(relevant.recentHistory.length).toBe(5);
      expect(relevant.recentHistory[0].input).toBe('entry 5');
      expect(relevant.recentHistory[4].input).toBe('entry 9');
    });
  });

  describe('user preferences', () => {
    it('should have default preferences', () => {
      const prefs = manager.getPreferences();

      expect(prefs.dateFormat).toBe('MM/DD/YYYY');
      expect(prefs.numberFormat).toBe('#,##0.00');
      expect(prefs.useR1C1).toBe(false);
      expect(prefs.useTableReferences).toBe(true);
      expect(prefs.defaultAggregation).toBe('SUM');
    });

    it('should update user preferences', () => {
      manager.updatePreferences({
        dateFormat: 'DD/MM/YYYY',
        defaultAggregation: 'AVERAGE',
      });

      const prefs = manager.getPreferences();

      expect(prefs.dateFormat).toBe('DD/MM/YYYY');
      expect(prefs.defaultAggregation).toBe('AVERAGE');
    });

    it('should propagate preferences to all contexts', () => {
      manager.setContext('Sheet1', {});
      manager.setContext('Sheet2', {});

      manager.updatePreferences({
        useR1C1: true,
      });

      const context1 = manager.getContext('Sheet1');
      const context2 = manager.getContext('Sheet2');

      expect(context1?.preferences.useR1C1).toBe(true);
      expect(context2?.preferences.useR1C1).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should calculate statistics', () => {
      const parsedFormula: ParsedFormula = {
        formula: '=SUM(A1:A10)',
        explanation: 'Sum',
        intent: {
          type: 'create_formula',
          confidence: 0.9,
          action: 'sum',
        },
        entities: [],
        complexity: 2,
        warnings: [],
      };

      manager.setContext('Sheet1', {});
      manager.setContext('Sheet2', {});

      manager.addConversationEntry('Sheet1', 'input1', {
        ...parsedFormula,
        intent: { ...parsedFormula.intent, confidence: 0.8 },
      });

      manager.addConversationEntry('Sheet1', 'input2', {
        ...parsedFormula,
        intent: { ...parsedFormula.intent, confidence: 0.9 },
      });

      manager.addConversationEntry('Sheet2', 'input3', parsedFormula);

      manager.addCorrection('Sheet1', new Date(), 'correction1');
      manager.addCorrection('Sheet2', new Date(), 'correction2');

      const stats = manager.getStatistics();

      expect(stats.totalContexts).toBe(2);
      expect(stats.totalConversations).toBe(3);
      expect(stats.totalCorrections).toBe(2);
      expect(stats.averageConfidence).toBeCloseTo(0.866, 2);
    });

    it('should handle empty statistics', () => {
      const stats = manager.getStatistics();

      expect(stats.totalContexts).toBe(0);
      expect(stats.totalConversations).toBe(0);
      expect(stats.averageConfidence).toBe(0);
    });
  });

  describe('state persistence', () => {
    it('should export state', () => {
      manager.setContext('Sheet1', {
        headers: { A: 'Test' },
      });

      const parsedFormula: ParsedFormula = {
        formula: '=SUM(A1:A10)',
        explanation: 'Sum',
        intent: {
          type: 'create_formula',
          confidence: 0.9,
          action: 'sum',
        },
        entities: [],
        complexity: 2,
        warnings: [],
      };

      manager.addConversationEntry('Sheet1', 'input', parsedFormula);

      const state = manager.exportState();

      expect(state.contexts).toBeDefined();
      expect(state.conversationHistory).toBeDefined();
      expect(state.errorCorrections).toBeDefined();
      expect(state.userPreferences).toBeDefined();
      expect(state.contexts.Sheet1).toBeDefined();
    });

    it('should import state', () => {
      const state = {
        contexts: {
          Sheet1: {
            sheetName: 'Sheet1',
            sheets: ['Sheet1'],
            headers: { A: 'Imported' },
            columnTypes: {},
            namedRanges: {},
            formulas: {},
            preferences: manager.getPreferences(),
          },
        },
        conversationHistory: {
          Sheet1: [
            {
              timestamp: new Date(),
              input: 'imported input',
              output: {
                formula: '=A1',
                explanation: 'Imported',
                intent: {
                  type: 'create_formula',
                  confidence: 0.9,
                  action: 'imported',
                },
                entities: [],
                complexity: 1,
                warnings: [],
              },
            },
          ],
        },
        errorCorrections: {},
        userPreferences: {
          dateFormat: 'YYYY-MM-DD',
          numberFormat: '#.##0,00',
          useR1C1: true,
          useTableReferences: false,
          defaultAggregation: 'AVERAGE',
        },
      };

      manager.importState(state);

      const context = manager.getContext('Sheet1');
      expect(context?.headers.A).toBe('Imported');

      const prefs = manager.getPreferences();
      expect(prefs.dateFormat).toBe('YYYY-MM-DD');
      expect(prefs.useR1C1).toBe(true);

      const history = manager.getConversationHistory('Sheet1');
      expect(history[0].input).toBe('imported input');
    });
  });

  describe('clearing data', () => {
    it('should clear conversation history for a sheet', () => {
      const parsedFormula: ParsedFormula = {
        formula: '=A1',
        explanation: 'Reference',
        intent: {
          type: 'create_formula',
          confidence: 0.9,
          action: 'reference',
        },
        entities: [],
        complexity: 1,
        warnings: [],
      };

      manager.addConversationEntry('Sheet1', 'input', parsedFormula);

      expect(manager.getConversationHistory('Sheet1').length).toBe(1);

      manager.clearHistory('Sheet1');

      expect(manager.getConversationHistory('Sheet1').length).toBe(0);
    });

    it('should clear all conversation history', () => {
      const parsedFormula: ParsedFormula = {
        formula: '=A1',
        explanation: 'Reference',
        intent: {
          type: 'create_formula',
          confidence: 0.9,
          action: 'reference',
        },
        entities: [],
        complexity: 1,
        warnings: [],
      };

      manager.addConversationEntry('Sheet1', 'input1', parsedFormula);
      manager.addConversationEntry('Sheet2', 'input2', parsedFormula);

      expect(manager.getConversationHistory('Sheet1').length).toBe(1);
      expect(manager.getConversationHistory('Sheet2').length).toBe(1);

      manager.clearAllHistory();

      expect(manager.getConversationHistory('Sheet1').length).toBe(0);
      expect(manager.getConversationHistory('Sheet2').length).toBe(0);
    });

    it('should clear all contexts', () => {
      manager.setContext('Sheet1', {});
      manager.setContext('Sheet2', {});

      expect(manager.getContext('Sheet1')).toBeDefined();
      expect(manager.getContext('Sheet2')).toBeDefined();

      manager.clearAllContexts();

      expect(manager.getContext('Sheet1')).toBeUndefined();
      expect(manager.getContext('Sheet2')).toBeUndefined();
    });
  });
});
