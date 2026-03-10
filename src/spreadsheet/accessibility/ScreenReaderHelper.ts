/**
 * ScreenReaderHelper - Utilities for screen reader compatibility
 * WCAG 2.1 Level AA Compliant (Info and Relationships)
 */

import { CellState, CellPosition } from './types';

/**
 * Formula parser for readable formulas
 */
class FormulaParser {
  /**
   * Convert formula to readable text
   */
  static parseFormula(formula: string): string {
    // Remove leading equals sign
    let readable = formula.replace(/^=/, '');

    // Replace cell references with readable format
    readable = readable.replace(/([A-Z]+)(\d+)/g, '$1 $2');

    // Replace function names with readable format
    const functionMap: Record<string, string> = {
      'SUM': 'sum of',
      'AVERAGE': 'average of',
      'COUNT': 'count of',
      'MAX': 'maximum of',
      'MIN': 'minimum of',
      'IF': 'if',
      'AND': 'and',
      'OR': 'or',
      'NOT': 'not',
      'CONCATENATE': 'concatenate',
      'VLOOKUP': 'vertical lookup',
      'HLOOKUP': 'horizontal lookup',
      'INDEX': 'index',
      'MATCH': 'match',
    };

    Object.entries(functionMap).forEach(([func, readableFunc]) => {
      const regex = new RegExp(`\\b${func}\\b`, 'gi');
      readable = readable.replace(regex, readableFunc);
    });

    // Replace operators with readable format
    const operatorMap: Record<string, string> = {
      '\\+': 'plus',
      '-': 'minus',
      '\\*': 'times',
      '/': 'divided by',
      '\\^': 'to the power of',
      '=': 'equals',
      '<>': 'not equal to',
      '<': 'less than',
      '>': 'greater than',
      '<=': 'less than or equal to',
      '>=': 'greater than or equal to',
    };

    Object.entries(operatorMap).forEach(([op, readableOp]) => {
      const regex = new RegExp(`\\s*${op}\\s*`, 'g');
      readable = readable.replace(regex, ` ${readableOp} `);
    });

    return readable;
  }

  /**
   * Extract cell references from formula
   */
  static extractCellReferences(formula: string): string[] {
    const matches = formula.match(/[A-Z]+\d+/g) || [];
    return [...new Set(matches)]; // Remove duplicates
  }
}

/**
 * ScreenReaderHelper class
 * Provides utilities for screen reader announcements
 */
export class ScreenReaderHelper {
  private announcementHistory: Array<{ message: string; timestamp: number }> = [];
  private maxHistorySize = 50;

  /**
   * Announce cell position
   */
  announceCellPosition(position: CellPosition, additionalInfo?: string): string {
    const { row, columnLabel } = position;
    const announcement = `Cell ${columnLabel}${row}`;

    if (additionalInfo) {
      return `${announcement}, ${additionalInfo}`;
    }

    return announcement;
  }

  /**
   * Announce cell value
   */
  announceCellValue(state: CellState): string {
    const positionAnnouncement = this.announceCellPosition(state.position);
    const valueAnnouncement = this.formatValueForReading(state.value);

    let announcement = `${positionAnnouncement}, ${valueAnnouncement}`;

    if (state.formula) {
      const formulaReadable = FormulaParser.parseFormula(state.formula);
      announcement += `, containing formula: ${formulaReadable}`;
    }

    if (state.type) {
      announcement += `, type: ${state.type.replace(/([A-Z])/g, ' $1').trim()}`;
    }

    if (state.selected) {
      announcement += ', selected';
    }

    if (state.editable) {
      announcement += ', editable';
    }

    return announcement;
  }

  /**
   * Format value for screen reader
   */
  private formatValueForReading(value: any): string {
    if (value === null || value === undefined) {
      return 'empty';
    }

    if (typeof value === 'number') {
      return this.formatNumber(value);
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'string') {
      if (value === '') {
        return 'empty';
      }
      return value;
    }

    if (Array.isArray(value)) {
      return `list of ${value.length} items`;
    }

    if (typeof value === 'object') {
      return 'complex data';
    }

    return String(value);
  }

  /**
   * Format number for screen reader
   */
  private formatNumber(num: number): string {
    if (Number.isNaN(num)) {
      return 'not a number';
    }

    if (!Number.isFinite(num)) {
      return num > 0 ? 'positive infinity' : 'negative infinity';
    }

    // Handle percentages
    if (num >= 0 && num <= 1 && Math.abs(num) < 1) {
      const percentage = Math.round(num * 100);
      return `${percentage} percent`;
    }

    // Handle very large numbers
    if (Math.abs(num) >= 1000000) {
      const millions = (num / 1000000).toFixed(1);
      return `${millions} million`;
    }

    // Handle very small numbers
    if (Math.abs(num) < 0.001 && num !== 0) {
      return `very small number, ${num.toExponential(2)}`;
    }

    // Regular number
    return num.toLocaleString('en-US', {
      maximumFractionDigits: 2,
    });
  }

  /**
   * Announce formula
   */
  announceFormula(formula: string): string {
    const readable = FormulaParser.parseFormula(formula);
    const references = FormulaParser.extractCellReferences(formula);

    let announcement = `Formula: ${readable}`;

    if (references.length > 0) {
      announcement += `, referencing ${references.length} cell${references.length > 1 ? 's' : ''}`;
    }

    return announcement;
  }

  /**
   * Announce value change
   */
  announceValueChange(
    cellId: string,
    oldValue: any,
    newValue: any,
    timestamp?: number
  ): string {
    const oldFormatted = this.formatValueForReading(oldValue);
    const newFormatted = this.formatValueForReading(newValue);

    let announcement = `Cell ${cellId} changed from ${oldFormatted} to ${newFormatted}`;

    if (timestamp) {
      const timeDiff = Date.now() - timestamp;
      if (timeDiff < 1000) {
        announcement += ' just now';
      } else if (timeDiff < 60000) {
        const seconds = Math.floor(timeDiff / 1000);
        announcement += ` ${seconds} second${seconds > 1 ? 's' : ''} ago`;
      }
    }

    return announcement;
  }

  /**
   * Announce selection change
   */
  announceSelectionChange(selectedCells: string[], previousCount: number): string {
    const count = selectedCells.length;
    const cellList = selectedCells.slice(0, 5).join(', ');
    const more = count > 5 ? ` and ${count - 5} more` : '';

    let announcement = `Selected ${count} cell${count > 1 ? 's' : ''}`;

    if (count > 0) {
      announcement += `: ${cellList}${more}`;
    }

    return announcement;
  }

  /**
   * Announce error
   */
  announceError(cellId: string, error: string): string {
    return `Error in cell ${cellId}: ${error}`;
  }

  /**
   * Announce navigation
   */
  announceNavigation(from: string, to: string, direction: string): string {
    return `Moved ${direction} from ${from} to ${to}`;
  }

  /**
   * Announce grid context
   */
  announceGridContext(
    currentCell: string,
    totalRows: number,
    totalColumns: number
  ): string {
    return `At ${currentCell} in a grid of ${totalRows} rows by ${totalColumns} columns`;
  }

  /**
   * Create accessible table summary
   */
  createTableSummary(data: {
    rows: number;
    columns: number;
    hasHeaders: boolean;
    title?: string;
    description?: string;
  }): string {
    let summary = '';

    if (data.title) {
      summary += `${data.title}. `;
    }

    if (data.description) {
      summary += `${data.description}. `;
    }

    summary += `Table with ${data.rows} row${data.rows > 1 ? 's' : ''} and ${data.columns} column${data.columns > 1 ? 's' : ''}. `;

    if (data.hasHeaders) {
      summary += 'Contains headers. ';
    }

    return summary.trim();
  }

  /**
   * Get accessible description for cell type
   */
  getCellTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'input': 'Input cell for data entry',
      'output': 'Output cell displaying results',
      'transform': 'Transform cell that processes data',
      'filter': 'Filter cell that filters data',
      'aggregate': 'Aggregate cell that summarizes data',
      'validate': 'Validation cell that checks data',
      'analysis': 'Analysis cell for data insights',
      'prediction': 'Prediction cell with forecasts',
      'decision': 'Decision cell for logic processing',
      'explain': 'Explanation cell for details',
    };

    return descriptions[type] || 'Cell';
  }

  /**
   * Add to announcement history
   */
  addToHistory(message: string): void {
    this.announcementHistory.push({
      message,
      timestamp: Date.now(),
    });

    if (this.announcementHistory.length > this.maxHistorySize) {
      this.announcementHistory.shift();
    }
  }

  /**
   * Get announcement history
   */
  getHistory(count: number = 10): Array<{ message: string; timestamp: number }> {
    return this.announcementHistory.slice(-count);
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.announcementHistory = [];
  }

  /**
   * Generate accessible summary for spreadsheet state
   */
  generateSummary(state: {
    totalCells: number;
    populatedCells: number;
    errors: number;
    selectedCells: number;
    hasUnsavedChanges: boolean;
  }): string {
    const { totalCells, populatedCells, errors, selectedCells, hasUnsavedChanges } = state;

    let summary = `Spreadsheet with ${totalCells} cells, ${populatedCells} populated`;

    if (errors > 0) {
      summary += `, ${errors} error${errors > 1 ? 's' : ''}`;
    }

    if (selectedCells > 0) {
      summary += `, ${selectedCells} selected`;
    }

    if (hasUnsavedChanges) {
      summary += ', has unsaved changes';
    }

    return summary;
  }
}

/**
 * Screen reader helper hooks for React
 */
export const useScreenReaderAnnouncements = () => {
  const helper = new ScreenReaderHelper();

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
    helper.addToHistory(message);

    const announcement = document.createElement('div');
    announcement.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  const announceCell = (state: CellState): void => {
    const message = helper.announceCellValue(state);
    announce(message, 'polite');
  };

  const announceChange = (cellId: string, oldValue: any, newValue: any): void => {
    const message = helper.announceValueChange(cellId, oldValue, newValue);
    announce(message, 'polite');
  };

  const announceError = (cellId: string, error: string): void => {
    const message = helper.announceError(cellId, error);
    announce(message, 'assertive');
  };

  return {
    announce,
    announceCell,
    announceChange,
    announceError,
    getHistory: helper.getHistory.bind(helper),
    clearHistory: helper.clearHistory.bind(helper),
  };
};

/**
 * Singleton instance
 */
export const screenReaderHelper = new ScreenReaderHelper();
