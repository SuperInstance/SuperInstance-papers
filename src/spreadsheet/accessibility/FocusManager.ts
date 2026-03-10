/**
 * FocusManager - Manages focus behavior for spreadsheet accessibility
 * WCAG 2.1 Level AA Compliant
 */

import {
  FocusTrap,
  FocusTrapConfig,
  NavigationDirection,
  CellPosition,
} from './types';

/**
 * Default focus trap configuration
 */
const DEFAULT_FOCUS_TRAP_CONFIG: FocusTrapConfig = {
  escapeDeactivates: true,
  clickOutsideDeactivates: false,
  returnFocusOnDeactivate: true,
};

/**
 * FocusManager class
 * Manages focus state, focus traps, and focus restoration
 */
export class FocusManager {
  private activeElement: HTMLElement | null = null;
  private focusHistory: HTMLElement[] = [];
  private focusTraps: Map<HTMLElement, FocusTrap> = new Map();
  private maxHistorySize = 10;

  /**
   * Set focus to an element
   */
  setFocus(element: HTMLElement): void {
    if (!this.isFocusable(element)) {
      console.warn('Element is not focusable:', element);
      return;
    }

    this.captureFocus();
    element.focus();

    // Announce focus change to screen readers
    this.announceFocus(element);
  }

  /**
   * Restore focus to previously focused element
   */
  restoreFocus(): void {
    if (this.focusHistory.length === 0) {
      console.warn('No focus history to restore');
      return;
    }

    const previousElement = this.focusHistory.pop();
    if (previousElement && document.body.contains(previousElement)) {
      previousElement.focus();
    }
  }

  /**
   * Capture current focus for later restoration
   */
  captureFocus(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      this.focusHistory.push(activeElement);

      // Limit history size
      if (this.focusHistory.length > this.maxHistorySize) {
        this.focusHistory.shift();
      }
    }
  }

  /**
   * Create a focus trap within a container
   */
  createFocusTrap(
    container: HTMLElement,
    config: Partial<FocusTrapConfig> = {}
  ): FocusTrap {
    const fullConfig = { ...DEFAULT_FOCUS_TRAP_CONFIG, ...config };
    let isActive = false;
    let previousActiveElement: HTMLElement | null = null;

    // Get all focusable elements within container
    const getFocusableElements = (): HTMLElement[] => {
      const focusableSelectors = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',
      ].join(', ');

      return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
    };

    // Get first and last focusable elements
    const getFocusBoundary = (): [HTMLElement | null, HTMLElement | null] => {
      const focusable = getFocusableElements();
      return [focusable[0] || null, focusable[focusable.length - 1] || null];
    };

    // Handle tab key to trap focus
    const handleTabKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;

      const [first, last] = getFocusBoundary();

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // Activate focus trap
    const activate = (): void => {
      if (isActive) return;

      isActive = true;
      previousActiveElement = document.activeElement as HTMLElement;

      // Set initial focus
      if (fullConfig.initialFocus) {
        const initialElement =
          typeof fullConfig.initialFocus === 'string'
            ? container.querySelector<HTMLElement>(fullConfig.initialFocus)
            : fullConfig.initialFocus;

        if (initialElement) {
          initialElement.focus();
        }
      } else {
        const [first] = getFocusBoundary();
        if (first) {
          first.focus();
        }
      }

      // Add event listener
      container.addEventListener('keydown', handleTabKey);

      // Mark container as focus trap
      container.setAttribute('data-focus-trap', 'active');

      if (fullConfig.onActivate) {
        fullConfig.onActivate();
      }
    };

    // Deactivate focus trap
    const deactivate = (): void => {
      if (!isActive) return;

      isActive = false;

      // Remove event listener
      container.removeEventListener('keydown', handleTabKey);

      // Remove focus trap marker
      container.removeAttribute('data-focus-trap');

      // Return focus to previous element
      if (fullConfig.returnFocusOnDeactivate && previousActiveElement) {
        previousActiveElement.focus();
      }

      if (fullConfig.onDeactivate) {
        fullConfig.onDeactivate();
      }
    };

    // Update focus trap (call after DOM changes)
    const update = (): void => {
      if (!isActive) return;
      // Re-calculate focusable elements
      getFocusableElements();
    };

    // Check if trap is active
    const checkIsActive = (): boolean => isActive;

    // Handle escape key
    if (fullConfig.escapeDeactivates) {
      const handleEscape = (event: KeyboardEvent): void => {
        if (event.key === 'Escape' && isActive) {
          deactivate();
        }
      };
      container.addEventListener('keydown', handleEscape);
    }

    // Handle click outside
    if (fullConfig.clickOutsideDeactivates) {
      const handleClickOutside = (event: MouseEvent): void => {
        if (isActive && !container.contains(event.target as Node)) {
          deactivate();
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
    }

    const trap: FocusTrap = {
      activate,
      deactivate,
      update,
      isActive: checkIsActive,
    };

    this.focusTraps.set(container, trap);
    return trap;
  }

  /**
   * Move focus to next cell in specified direction
   */
  moveToNextCell(
    current: string,
    direction: 'row' | 'column',
    gridSize: { rows: number; columns: number }
  ): string {
    const currentPos = this.parseCellId(current);
    let newPos: CellPosition;

    if (direction === 'row') {
      // Move horizontally
      newPos = {
        ...currentPos,
        column: currentPos.column + 1,
      };

      // Wrap to next row if at end
      if (newPos.column > gridSize.columns) {
        newPos.column = 1;
        newPos.row = currentPos.row + 1;
      }

      // Wrap to beginning if at end of grid
      if (newPos.row > gridSize.rows) {
        newPos.row = 1;
        newPos.column = 1;
      }
    } else {
      // Move vertically
      newPos = {
        ...currentPos,
        row: currentPos.row + 1,
      };

      // Wrap to beginning if at end of grid
      if (newPos.row > gridSize.rows) {
        newPos.row = 1;
      }
    }

    return this.formatCellId(newPos);
  }

  /**
   * Move focus in specified direction
   */
  moveInDirection(
    current: string,
    direction: NavigationDirection,
    gridSize: { rows: number; columns: number }
  ): string {
    const currentPos = this.parseCellId(current);
    let newPos: CellPosition = { ...currentPos };

    switch (direction) {
      case 'up':
        newPos.row = Math.max(1, currentPos.row - 1);
        break;
      case 'down':
        newPos.row = Math.min(gridSize.rows, currentPos.row + 1);
        break;
      case 'left':
        newPos.column = Math.max(1, currentPos.column - 1);
        break;
      case 'right':
        newPos.column = Math.min(gridSize.columns, currentPos.column + 1);
        break;
      case 'first':
        newPos.row = 1;
        newPos.column = 1;
        break;
      case 'last':
        newPos.row = gridSize.rows;
        newPos.column = gridSize.columns;
        break;
      case 'pageUp':
        newPos.row = Math.max(1, currentPos.row - 10);
        break;
      case 'pageDown':
        newPos.row = Math.min(gridSize.rows, currentPos.row + 10);
        break;
    }

    return this.formatCellId(newPos);
  }

  /**
   * Check if element is focusable
   */
  private isFocusable(element: HTMLElement): boolean {
    if (element.disabled || element.hidden) {
      return false;
    }

    const tabIndex = parseInt(element.getAttribute('tabindex') || '0', 10);
    const isNativelyFocusable = [
      'BUTTON',
      'INPUT',
      'SELECT',
      'TEXTAREA',
      'A',
    ].includes(element.tagName);

    return isNativelyFocusable || tabIndex >= 0;
  }

  /**
   * Parse cell ID (e.g., "A1") to position
   */
  private parseCellId(cellId: string): CellPosition {
    const match = cellId.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid cell ID: ${cellId}`);
    }

    const [, columnLabel, rowStr] = match;
    const row = parseInt(rowStr, 10);

    // Convert column label to number (A=1, B=2, ..., Z=26, AA=27, etc.)
    let column = 0;
    for (let i = 0; i < columnLabel.length; i++) {
      column = column * 26 + (columnLabel.charCodeAt(i) - 64);
    }

    return { row, column, columnLabel };
  }

  /**
   * Format cell position to cell ID
   */
  private formatCellId(position: CellPosition): string {
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
   * Announce focus change to screen readers
   */
  private announceFocus(element: HTMLElement): void {
    const label = element.getAttribute('aria-label') || element.textContent || '';
    if (label) {
      this.announceToScreenReader(`Focused on ${label}`);
    }
  }

  /**
   * Send announcement to screen readers
   */
  private announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Clean up all focus traps
   */
  cleanup(): void {
    this.focusTraps.forEach((trap) => trap.deactivate());
    this.focusTraps.clear();
    this.focusHistory = [];
    this.activeElement = null;
  }
}

/**
 * Singleton instance
 */
export const focusManager = new FocusManager();
