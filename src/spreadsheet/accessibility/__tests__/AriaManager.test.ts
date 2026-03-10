/**
 * Tests for AriaManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AriaManager } from '../AriaManager';
import { CellState } from '../types';

describe('AriaManager', () => {
  let ariaManager: AriaManager;
  let testElement: HTMLElement;

  beforeEach(() => {
    ariaManager = new AriaManager();

    // Create test element
    testElement = document.createElement('div');
    testElement.id = 'test-element';
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    ariaManager.destroy();
    if (testElement.parentNode) {
      document.body.removeChild(testElement);
    }
  });

  describe('setLabel', () => {
    it('should set aria-label on element', () => {
      ariaManager.setLabel(testElement, 'Test Label');
      expect(testElement.getAttribute('aria-label')).toBe('Test Label');
    });
  });

  describe('setLabelledBy', () => {
    it('should set aria-labelledby on element', () => {
      ariaManager.setLabelledBy(testElement, 'label-id');
      expect(testElement.getAttribute('aria-labelledby')).toBe('label-id');
    });
  });

  describe('setDescription', () => {
    it('should create description element and set aria-describedby', () => {
      ariaManager.setDescription(testElement, 'Test Description');
      const describedBy = testElement.getAttribute('aria-describedby');

      expect(describedBy).toBeTruthy();

      const descElement = document.getElementById(describedBy!);
      expect(descElement).toBeTruthy();
      expect(descElement?.textContent).toBe('Test Description');
    });
  });

  describe('setDescribedBy', () => {
    it('should set aria-describedby on element', () => {
      ariaManager.setDescribedBy(testElement, 'desc-id');
      expect(testElement.getAttribute('aria-describedby')).toBe('desc-id');
    });
  });

  describe('setRole', () => {
    it('should set role on element', () => {
      ariaManager.setRole(testElement, 'button');
      expect(testElement.getAttribute('role')).toBe('button');
    });
  });

  describe('setAriaAttributes', () => {
    it('should set multiple ARIA attributes', () => {
      ariaManager.setAriaAttributes(testElement, {
        'aria-label': 'Test',
        'aria-disabled': 'true',
        'aria-expanded': 'false',
      });

      expect(testElement.getAttribute('aria-label')).toBe('Test');
      expect(testElement.getAttribute('aria-disabled')).toBe('true');
      expect(testElement.getAttribute('aria-expanded')).toBe('false');
    });

    it('should not set undefined attributes', () => {
      ariaManager.setAriaAttributes(testElement, {
        'aria-label': 'Test',
        'aria-description': undefined,
      });

      expect(testElement.getAttribute('aria-label')).toBe('Test');
      expect(testElement.hasAttribute('aria-description')).toBe(false);
    });
  });

  describe('announceLiveRegion', () => {
    it('should announce polite message', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      ariaManager.announceLiveRegion('Test message', 'polite');

      // Check if live region was created
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeTruthy();

      consoleSpy.mockRestore();
    });

    it('should announce assertive message', () => {
      ariaManager.announceLiveRegion('Urgent message', 'assertive');

      const assertiveRegion = document.querySelector('[aria-live="assertive"]');
      expect(assertiveRegion).toBeTruthy();
    });

    it('should not duplicate same message', () => {
      ariaManager.announceLiveRegion('Same message', 'polite');
      ariaManager.announceLiveRegion('Same message', 'polite');

      // Should not cause duplicate announcements
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeTruthy();
    });
  });

  describe('updateCellState', () => {
    it('should set role based on cell type', () => {
      const cell = document.createElement('div');
      cell.id = 'test-cell';
      document.body.appendChild(cell);

      const state: CellState = {
        id: 'test-cell',
        value: 42,
        position: { row: 1, column: 1, columnLabel: 'A' },
        type: 'input',
        editable: true,
        selected: false,
      };

      ariaManager.updateCellState('test-cell', state);

      expect(cell.getAttribute('role')).toBe('textbox');

      document.body.removeChild(cell);
    });

    it('should set aria-label with cell info', () => {
      const cell = document.createElement('div');
      cell.id = 'test-cell';
      document.body.appendChild(cell);

      const state: CellState = {
        id: 'test-cell',
        value: 'test value',
        position: { row: 1, column: 1, columnLabel: 'A' },
        type: 'output',
        editable: false,
        selected: false,
      };

      ariaManager.updateCellState('test-cell', state);

      const label = cell.getAttribute('aria-label');
      expect(label).toContain('Cell A1');
      expect(label).toContain('output');
      expect(label).toContain('test value');

      document.body.removeChild(cell);
    });

    it('should set aria-readonly for textbox role', () => {
      const cell = document.createElement('div');
      cell.id = 'test-cell';
      document.body.appendChild(cell);

      const state: CellState = {
        id: 'test-cell',
        value: 42,
        position: { row: 1, column: 1, columnLabel: 'A' },
        type: 'input',
        editable: false,
        selected: false,
      };

      ariaManager.updateCellState('test-cell', state);

      expect(cell.getAttribute('aria-readonly')).toBe('true');

      document.body.removeChild(cell);
    });

    it('should set aria-invalid when error present', () => {
      const cell = document.createElement('div');
      cell.id = 'test-cell';
      document.body.appendChild(cell);

      const state: CellState = {
        id: 'test-cell',
        value: 42,
        position: { row: 1, column: 1, columnLabel: 'A' },
        type: 'input',
        editable: true,
        selected: false,
        error: 'Invalid value',
      };

      ariaManager.updateCellState('test-cell', state);

      expect(cell.getAttribute('aria-invalid')).toBe('true');

      document.body.removeChild(cell);
    });

    it('should announce value change when changed', () => {
      const cell = document.createElement('div');
      cell.id = 'test-cell';
      document.body.appendChild(cell);

      const state: CellState = {
        id: 'test-cell',
        value: 42,
        position: { row: 1, column: 1, columnLabel: 'A' },
        type: 'output',
        editable: false,
        selected: false,
        changed: true,
      };

      ariaManager.updateCellState('test-cell', state);

      // Check for announcement
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeTruthy();

      document.body.removeChild(cell);
    });
  });

  describe('setGridAttributes', () => {
    it('should set grid ARIA attributes', () => {
      const grid = document.createElement('div');
      ariaManager.setGridAttributes(grid, 10, 5);

      expect(grid.getAttribute('role')).toBe('grid');
      expect(grid.getAttribute('aria-rowcount')).toBe('10');
      expect(grid.getAttribute('aria-colcount')).toBe('5');
    });
  });

  describe('setRowAttributes', () => {
    it('should set row ARIA attributes', () => {
      const row = document.createElement('div');
      ariaManager.setRowAttributes(row, 3);

      expect(row.getAttribute('role')).toBe('row');
      expect(row.getAttribute('aria-rowindex')).toBe('3');
    });
  });

  describe('setColumnHeaderAttributes', () => {
    it('should set column header ARIA attributes', () => {
      const header = document.createElement('div');
      ariaManager.setColumnHeaderAttributes(header, 2, 'Column B');

      expect(header.getAttribute('role')).toBe('columnheader');
      expect(header.getAttribute('aria-colindex')).toBe('2');
      expect(header.getAttribute('aria-label')).toBe('Column B');
      expect(header.getAttribute('aria-sort')).toBe('none');
    });
  });

  describe('setRowHeaderAttributes', () => {
    it('should set row header ARIA attributes', () => {
      const header = document.createElement('div');
      ariaManager.setRowHeaderAttributes(header, 1, 'Row 1');

      expect(header.getAttribute('role')).toBe('rowheader');
      expect(header.getAttribute('aria-rowindex')).toBe('1');
      expect(header.getAttribute('aria-label')).toBe('Row 1');
    });
  });

  describe('setCellAttributes', () => {
    it('should set cell ARIA attributes', () => {
      const cell = document.createElement('div');
      ariaManager.setCellAttributes(cell, 3, 5, true);

      expect(cell.getAttribute('role')).toBe('gridcell');
      expect(cell.getAttribute('aria-rowindex')).toBe('3');
      expect(cell.getAttribute('aria-colindex')).toBe('5');
      expect(cell.getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('setExpanded', () => {
    it('should set aria-expanded', () => {
      ariaManager.setExpanded(testElement, true);
      expect(testElement.getAttribute('aria-expanded')).toBe('true');

      ariaManager.setExpanded(testElement, false);
      expect(testElement.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('setBusy', () => {
    it('should set aria-busy', () => {
      ariaManager.setBusy(testElement, true);
      expect(testElement.getAttribute('aria-busy')).toBe('true');

      ariaManager.setBusy(testElement, false);
      expect(testElement.getAttribute('aria-busy')).toBe('false');
    });
  });

  describe('setDisabled', () => {
    it('should set aria-disabled', () => {
      ariaManager.setDisabled(testElement, true);
      expect(testElement.getAttribute('aria-disabled')).toBe('true');

      ariaManager.setDisabled(testElement, false);
      expect(testElement.getAttribute('aria-disabled')).toBe('false');
    });
  });

  describe('setRequired', () => {
    it('should set aria-required', () => {
      ariaManager.setRequired(testElement, true);
      expect(testElement.getAttribute('aria-required')).toBe('true');

      ariaManager.setRequired(testElement, false);
      expect(testElement.getAttribute('aria-required')).toBe('false');
    });
  });

  describe('setInvalid', () => {
    it('should set aria-invalid', () => {
      ariaManager.setInvalid(testElement, true);
      expect(testElement.getAttribute('aria-invalid')).toBe('true');

      ariaManager.setInvalid(testElement, false);
      expect(testElement.getAttribute('aria-invalid')).toBe('false');

      ariaManager.setInvalid(testElement, 'spelling');
      expect(testElement.getAttribute('aria-invalid')).toBe('spelling');
    });
  });

  describe('destroy', () => {
    it('should clean up live regions', () => {
      ariaManager.destroy();

      const politeRegion = document.querySelector('[role="status"][aria-live="polite"]');
      const assertiveRegion = document.querySelector('[role="alert"][aria-live="assertive"]');

      expect(politeRegion).toBeFalsy();
      expect(assertiveRegion).toBeFalsy();
    });
  });
});
