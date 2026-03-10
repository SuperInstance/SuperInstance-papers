/**
 * KeyboardNavManager - Comprehensive keyboard navigation for spreadsheets
 * WCAG 2.1 Level AA Compliant (2.1.1 Keyboard, 2.1.4 Character Key Shortcuts)
 */

import { KeyboardNavConfig, NavigationDirection } from './types';

/**
 * Default keyboard navigation configuration
 */
const DEFAULT_CONFIG: KeyboardNavConfig = {
  arrowKeys: true,
  homeEnd: true,
  pageUpDown: true,
  tabNavigation: true,
  escape: true,
  customBindings: {},
};

/**
 * Keyboard navigation event
 */
export interface KeyboardNavEvent {
  direction: NavigationDirection;
  currentCell: string;
  nextCell: string;
  modifierKey: boolean;
  timestamp: number;
}

/**
 * Keyboard navigation callback
 */
export type KeyboardNavCallback = (event: KeyboardNavEvent) => void;

/**
 * KeyboardNavManager class
 * Manages all keyboard navigation within the spreadsheet
 */
export class KeyboardNavManager {
  private config: KeyboardNavConfig;
  private callbacks: Map<string, KeyboardNavCallback[]> = new Map();
  private currentCell: string = 'A1';
  private gridSize = { rows: 100, columns: 26 }; // Default: A1 to Z100
  private isEnabled = true;

  constructor(config: Partial<KeyboardNavConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeEventListeners();
  }

  /**
   * Initialize global keyboard event listeners
   */
  private initializeEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    const target = event.target as HTMLElement;
    if (this.shouldIgnoreKeyEvent(target)) {
      return;
    }

    // Check for custom bindings first
    const customBinding = this.getCustomBinding(event);
    if (customBinding) {
      event.preventDefault();
      customBinding();
      return;
    }

    // Handle standard navigation
    const direction = this.getDirectionFromEvent(event);
    if (direction) {
      event.preventDefault();
      this.navigateInDirection(direction, event.ctrlKey || event.metaKey);
    }

    // Handle Escape key
    if (this.config.escape && event.key === 'Escape') {
      this.handleEscape();
    }
  }

  /**
   * Check if keyboard event should be ignored
   */
  private shouldIgnoreKeyEvent(target: HTMLElement): boolean {
    // Ignore if in input field (unless it's readonly)
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return target.getAttribute('readonly') === null;
    }

    // Ignore if content is editable
    if (target.isContentEditable) {
      return true;
    }

    return false;
  }

  /**
   * Get navigation direction from keyboard event
   */
  private getDirectionFromEvent(event: KeyboardEvent): NavigationDirection | null {
    if (!this.config.arrowKeys) {
      return null;
    }

    switch (event.key) {
      case 'ArrowUp':
        return 'up';
      case 'ArrowDown':
        return 'down';
      case 'ArrowLeft':
        return 'left';
      case 'ArrowRight':
        return 'right';
      default:
        if (this.config.homeEnd) {
          if (event.key === 'Home') {
            return event.ctrlKey ? 'first' : 'left';
          }
          if (event.key === 'End') {
            return event.ctrlKey ? 'last' : 'right';
          }
        }
        if (this.config.pageUpDown) {
          if (event.key === 'PageUp') {
            return 'pageUp';
          }
          if (event.key === 'PageDown') {
            return 'pageDown';
          }
        }
        return null;
    }
  }

  /**
   * Get custom key binding
   */
  private getCustomBinding(event: KeyboardEvent): (() => void) | undefined {
    if (!this.config.customBindings) {
      return undefined;
    }

    const key = this.getKeyString(event);
    return this.config.customBindings[key];
  }

  /**
   * Get standardized key string from event
   */
  private getKeyString(event: KeyboardEvent): string {
    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    if (event.metaKey) modifiers.push('meta');

    return [...modifiers, event.key.toLowerCase()].join('+');
  }

  /**
   * Navigate in specified direction
   */
  private navigateInDirection(direction: NavigationDirection, modifierKey: boolean): void {
    const nextCell = this.calculateNextCell(direction, modifierKey);
    const navEvent: KeyboardNavEvent = {
      direction,
      currentCell: this.currentCell,
      nextCell,
      modifierKey,
      timestamp: Date.now(),
    };

    this.currentCell = nextCell;
    this.emitCallbacks('navigate', navEvent);
  }

  /**
   * Calculate next cell based on direction
   */
  private calculateNextCell(direction: NavigationDirection, modifierKey: boolean): string {
    const currentPos = this.parseCellId(this.currentCell);
    let newPos = { ...currentPos };

    switch (direction) {
      case 'up':
        newPos.row = modifierKey ? 1 : Math.max(1, currentPos.row - 1);
        break;
      case 'down':
        newPos.row = modifierKey ? this.gridSize.rows : Math.min(this.gridSize.rows, currentPos.row + 1);
        break;
      case 'left':
        newPos.column = modifierKey ? 1 : Math.max(1, currentPos.column - 1);
        break;
      case 'right':
        newPos.column = modifierKey ? this.gridSize.columns : Math.min(this.gridSize.columns, currentPos.column + 1);
        break;
      case 'first':
        newPos.row = 1;
        newPos.column = 1;
        break;
      case 'last':
        newPos.row = this.gridSize.rows;
        newPos.column = this.gridSize.columns;
        break;
      case 'pageUp':
        newPos.row = Math.max(1, currentPos.row - 10);
        break;
      case 'pageDown':
        newPos.row = Math.min(this.gridSize.rows, currentPos.row + 10);
        break;
    }

    return this.formatCellId(newPos);
  }

  /**
   * Parse cell ID to position
   */
  private parseCellId(cellId: string): { row: number; column: number } {
    const match = cellId.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      return { row: 1, column: 1 };
    }

    const [, columnLabel, rowStr] = match;
    const row = parseInt(rowStr, 10);

    let column = 0;
    for (let i = 0; i < columnLabel.length; i++) {
      column = column * 26 + (columnLabel.charCodeAt(i) - 64);
    }

    return { row, column };
  }

  /**
   * Format cell position to cell ID
   */
  private formatCellId(position: { row: number; column: number }): string {
    let columnLabel = '';
    let column = position.column;

    while (column > 0) {
      column--;
      columnLabel = String.fromCharCode(65 + (column % 26)) + columnLabel;
      column = Math.floor(column / 26);
    }

    return `${columnLabel}${position.row}`;
  }

  /**
   * Handle Escape key
   */
  private handleEscape(): void {
    this.emitCallbacks('escape', {
      direction: 'up',
      currentCell: this.currentCell,
      nextCell: this.currentCell,
      modifierKey: false,
      timestamp: Date.now(),
    });
  }

  /**
   * Register callback for navigation events
   */
  on(event: string, callback: KeyboardNavCallback): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  /**
   * Unregister callback
   */
  off(event: string, callback: KeyboardNavCallback): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit callbacks for event
   */
  private emitCallbacks(event: string, data: KeyboardNavEvent): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * Set current cell
   */
  setCurrentCell(cellId: string): void {
    this.currentCell = cellId;
  }

  /**
   * Get current cell
   */
  getCurrentCell(): string {
    return this.currentCell;
  }

  /**
   * Set grid size
   */
  setGridSize(rows: number, columns: number): void {
    this.gridSize = { rows, columns };
  }

  /**
   * Enable keyboard navigation
   */
  enable(): void {
    this.isEnabled = true;
  }

  /**
   * Disable keyboard navigation
   */
  disable(): void {
    this.isEnabled = false;
  }

  /**
   * Add custom key binding
   */
  addKeyBinding(keyCombo: string, callback: () => void): void {
    if (!this.config.customBindings) {
      this.config.customBindings = {};
    }
    this.config.customBindings[keyCombo.toLowerCase()] = callback;
  }

  /**
   * Remove custom key binding
   */
  removeKeyBinding(keyCombo: string): void {
    if (this.config.customBindings) {
      delete this.config.customBindings[keyCombo.toLowerCase()];
    }
  }

  /**
   * Get list of all keyboard shortcuts
   */
  getShortcuts(): Record<string, string> {
    return {
      'Arrow Keys': 'Navigate between cells',
      'Ctrl/Cmd + Arrow': 'Navigate to edge',
      'Home': 'Move to first column',
      'End': 'Move to last column',
      'Ctrl/Cmd + Home': 'Move to first cell (A1)',
      'Ctrl/Cmd + End': 'Move to last cell',
      'Page Up': 'Move up 10 rows',
      'Page Down': 'Move down 10 rows',
      'Tab': 'Move to next cell',
      'Shift + Tab': 'Move to previous cell',
      'Escape': 'Cancel or exit',
      ...this.config.customBindings,
    };
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.callbacks.clear();
  }
}

/**
 * Singleton instance
 */
export const keyboardNavManager = new KeyboardNavManager();
