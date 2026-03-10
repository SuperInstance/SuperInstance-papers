/**
 * Tests for ScreenReaderHelper
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScreenReaderHelper, FormulaParser } from '../ScreenReaderHelper';
import { CellState } from '../types';

describe('FormulaParser', () => {
  describe('parseFormula', () => {
    it('should parse simple SUM formula', () => {
      const formula = '=SUM(A1:A10)';
      const parsed = FormulaParser.parseFormula(formula);
      expect(parsed).toContain('sum of');
      expect(parsed).toContain('A 1');
      expect(parsed).toContain('A 10');
    });

    it('should parse IF formula', () => {
      const formula = '=IF(A1>10, "High", "Low")';
      const parsed = FormulaParser.parseFormula(formula);
      expect(parsed).toContain('if');
      expect(parsed).toContain('greater than');
    });

    it('should parse complex nested formula', () => {
      const formula = '=IF(AVERAGE(A1:A10)>100, MAX(B1:B10), MIN(C1:C10))';
      const parsed = FormulaParser.parseFormula(formula);
      expect(parsed).toContain('if');
      expect(parsed).toContain('average of');
      expect(parsed).toContain('maximum of');
      expect(parsed).toContain('minimum of');
    });

    it('should handle arithmetic operators', () => {
      const formula = '=A1+B2*C3^2';
      const parsed = FormulaParser.parseFormula(formula);
      expect(parsed).toContain('plus');
      expect(parsed).toContain('times');
      expect(parsed).toContain('to the power of');
    });

    it('should handle comparison operators', () => {
      const formula = '=IF(A1>=B1, "Pass", "Fail")';
      const parsed = FormulaParser.parseFormula(formula);
      expect(parsed).toContain('greater than or equal to');
    });
  });

  describe('extractCellReferences', () => {
    it('should extract cell references from formula', () => {
      const formula = '=SUM(A1, B2, C3)';
      const refs = FormulaParser.extractCellReferences(formula);
      expect(refs).toEqual(['A1', 'B2', 'C3']);
    });

    it('should remove duplicate references', () => {
      const formula = '=A1+A1+B2';
      const refs = FormulaParser.extractCellReferences(formula);
      expect(refs).toEqual(['A1', 'B2']);
    });

    it('should handle range references', () => {
      const formula = '=SUM(A1:A10)';
      const refs = FormulaParser.extractCellReferences(formula);
      expect(refs).toContain('A1');
      expect(refs).toContain('A10');
    });
  });
});

describe('ScreenReaderHelper', () => {
  let helper: ScreenReaderHelper;

  beforeEach(() => {
    helper = new ScreenReaderHelper();
  });

  describe('announceCellPosition', () => {
    it('should announce basic cell position', () => {
      const announcement = helper.announceCellPosition({ row: 1, column: 1, columnLabel: 'A' });
      expect(announcement).toBe('Cell A1');
    });

    it('should announce position with additional info', () => {
      const announcement = helper.announceCellPosition(
        { row: 5, column: 3, columnLabel: 'C' },
        'selected'
      );
      expect(announcement).toBe('Cell C5, selected');
    });

    it('should handle large column labels', () => {
      const announcement = helper.announceCellPosition({ row: 1, column: 28, columnLabel: 'AB' });
      expect(announcement).toBe('Cell AB1');
    });
  });

  describe('announceCellValue', () => {
    it('should announce numeric value', () => {
      const state: CellState = {
        id: 'A1',
        value: 42,
        position: { row: 1, column: 1, columnLabel: 'A' },
        type: 'input',
        editable: true,
        selected: false,
      };

      const announcement = helper.announceCellValue(state);
      expect(announcement).toContain('Cell A1');
      expect(announcement).toContain('42');
    });

    it('should announce string value', () => {
      const state: CellState = {
        id: 'A1',
        value: 'Hello',
        position: { row: 1, column: 1, columnLabel: 'A' },
        type: 'input',
        editable: true,
        selected: false,
      };

      const announcement = helper.announceCellValue(state);
      expect(announcement).toContain('Hello');
    });

    it('should announce empty value', () => {
      const state: CellState = {
        id: 'A1',
        value: '',
        position: { row: 1, column: 1, columnLabel: 'A' },
        type: 'input',
        editable: true,
        selected: false,
      };

      const announcement = helper.announceCellValue(state);
      expect(announcement).toContain('empty');
    });

    it('should announce boolean value', () => {
      const state: CellState = {
        id: 'A1',
        value: true,
        position: { row: 1, column: 1, columnLabel: 'A' },
        type: 'input',
        editable: true,
        selected: false,
      };

      const announcement = helper.announceCellValue(state);
      expect(announcement).toContain('true');
    });

    it('should announce array value', () => {
      const state: CellState = {
        id: 'A1',
        value: [1, 2, 3, 4, 5],
        position: { row: 1, column: 1, columnLabel: 'A' },
        type: 'input',
        editable: true,
        selected: false,
      };

      const announcement = helper.announceCellValue(state);
      expect(announcement).toContain('list of 5 items');
    });

    it('should announce cell type', () => {
      const state: CellState = {
        id: 'A1',
        value: 42,
        position: { row: 1, column: 1, columnLabel: 'A' },
        type: 'analysis',
        editable: false,
        selected: false,
      };

      const announcement = helper.announceCellValue(state);
      expect(announcement).toContain('type: analysis');
    });

    it('should announce formula', () => {
      const state: CellState = {
        id: 'A1',
        value: 100,
        formula: '=SUM(B1:B10)',
        position: { row: 1, column: 1, columnLabel: 'A' },
        type: 'output',
        editable: false,
        selected: false,
      };

      const announcement = helper.announceCellValue(state);
      expect(announcement).toContain('formula');
      expect(announcement).toContain('sum of');
    });

    it('should announce selected state', () => {
      const state: CellState = {
        id: 'A1',
        value: 42,
        position: { row: 1, column: 1, columnLabel: 'A' },
        type: 'input',
        editable: true,
        selected: true,
      };

      const announcement = helper.announceCellValue(state);
      expect(announcement).toContain('selected');
    });

    it('should announce editable state', () => {
      const state: CellState = {
        id: 'A1',
        value: 42,
        position: { row: 1, column: 1, columnLabel: 'A' },
        type: 'input',
        editable: true,
        selected: false,
      };

      const announcement = helper.announceCellValue(state);
      expect(announcement).toContain('editable');
    });
  });

  describe('announceValueChange', () => {
    it('should announce value change', () => {
      const announcement = helper.announceValueChange('A1', 10, 20);
      expect(announcement).toContain('Cell A1');
      expect(announcement).toContain('10');
      expect(announcement).toContain('20');
      expect(announcement).toContain('changed from');
      expect(announcement).toContain('to');
    });

    it('should announce value change with timestamp', () => {
      const timestamp = Date.now() - 500;
      const announcement = helper.announceValueChange('A1', 10, 20, timestamp);
      expect(announcement).toContain('just now');
    });
  });

  describe('announceSelectionChange', () => {
    it('should announce single cell selection', () => {
      const announcement = helper.announceSelectionChange(['A1'], 0);
      expect(announcement).toContain('Selected 1 cell');
      expect(announcement).toContain('A1');
    });

    it('should announce multiple cell selection', () => {
      const announcement = helper.announceSelectionChange(['A1', 'B2', 'C3'], 0);
      expect(announcement).toContain('Selected 3 cells');
    });

    it('should limit cell list in announcement', () => {
      const cells = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6'];
      const announcement = helper.announceSelectionChange(cells, 0);
      expect(announcement).toContain('and 1 more');
    });

    it('should announce deselection', () => {
      const announcement = helper.announceSelectionChange([], 5);
      expect(announcement).toContain('Selected 0 cells');
    });
  });

  describe('announceError', () => {
    it('should announce error with message', () => {
      const announcement = helper.announceError('A1', 'Division by zero');
      expect(announcement).toContain('Error in cell A1');
      expect(announcement).toContain('Division by zero');
    });
  });

  describe('announceNavigation', () => {
    it('should announce navigation', () => {
      const announcement = helper.announceNavigation('A1', 'B2', 'down');
      expect(announcement).toContain('Moved down');
      expect(announcement).toContain('from A1');
      expect(announcement).toContain('to B2');
    });
  });

  describe('announceGridContext', () => {
    it('should announce grid context', () => {
      const announcement = helper.announceGridContext('C5', 100, 26);
      expect(announcement).toContain('At C5');
      expect(announcement).toContain('100 rows');
      expect(announcement).toContain('26 columns');
    });
  });

  describe('createTableSummary', () => {
    it('should create summary with all info', () => {
      const summary = helper.createTableSummary({
        rows: 10,
        columns: 5,
        hasHeaders: true,
        title: 'Sales Data',
        description: 'Monthly sales figures',
      });

      expect(summary).toContain('Sales Data');
      expect(summary).toContain('Monthly sales figures');
      expect(summary).toContain('10 rows');
      expect(summary).toContain('5 columns');
      expect(summary).toContain('headers');
    });

    it('should create minimal summary', () => {
      const summary = helper.createTableSummary({
        rows: 5,
        columns: 3,
        hasHeaders: false,
      });

      expect(summary).toContain('5 rows');
      expect(summary).toContain('3 columns');
    });
  });

  describe('getCellTypeDescription', () => {
    it('should return description for known cell types', () => {
      expect(helper.getCellTypeDescription('input')).toContain('data entry');
      expect(helper.getCellTypeDescription('output')).toContain('results');
      expect(helper.getCellTypeDescription('analysis')).toContain('insights');
    });

    it('should return generic description for unknown type', () => {
      const description = helper.getCellTypeDescription('unknown');
      expect(description).toBe('Cell');
    });
  });

  describe('announcement history', () => {
    it('should add to history', () => {
      helper.addToHistory('Test message 1');
      helper.addToHistory('Test message 2');

      const history = helper.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Test message 1');
      expect(history[1].message).toBe('Test message 2');
    });

    it('should limit history size', () => {
      for (let i = 0; i < 100; i++) {
        helper.addToHistory(`Message ${i}`);
      }

      const history = helper.getHistory();
      expect(history.length).toBeLessThanOrEqual(50);
    });

    it('should get limited history', () => {
      for (let i = 0; i < 20; i++) {
        helper.addToHistory(`Message ${i}`);
      }

      const history = helper.getHistory(5);
      expect(history).toHaveLength(5);
    });

    it('should clear history', () => {
      helper.addToHistory('Test message');
      helper.clearHistory();

      const history = helper.getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('generateSummary', () => {
    it('should generate comprehensive summary', () => {
      const summary = helper.generateSummary({
        totalCells: 100,
        populatedCells: 45,
        errors: 2,
        selectedCells: 5,
        hasUnsavedChanges: true,
      });

      expect(summary).toContain('100 cells');
      expect(summary).toContain('45 populated');
      expect(summary).toContain('2 errors');
      expect(summary).toContain('5 selected');
      expect(summary).toContain('unsaved changes');
    });

    it('should generate minimal summary', () => {
      const summary = helper.generateSummary({
        totalCells: 50,
        populatedCells: 10,
        errors: 0,
        selectedCells: 0,
        hasUnsavedChanges: false,
      });

      expect(summary).toContain('50 cells');
      expect(summary).toContain('10 populated');
    });
  });
});
