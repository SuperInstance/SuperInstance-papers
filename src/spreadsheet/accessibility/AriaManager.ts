/**
 * AriaManager - Manages ARIA attributes and live region announcements
 * WCAG 2.1 Level AA Compliant (4.1.2 Name, Role, Value)
 */

import { AriaAttributes, CellState, AnnouncementPriority } from './types';

/**
 * ARIA role mappings for cell types
 */
const CELL_TYPE_ROLES: Record<string, string> = {
  input: 'textbox',
  output: 'status',
  transform: 'region',
  filter: 'region',
  aggregate: 'region',
  validate: 'alert',
  analysis: 'region',
  prediction: 'status',
  decision: 'region',
  explain: 'region',
};

/**
 * AriaManager class
 * Manages all ARIA attributes and announcements
 */
export class AriaManager {
  private liveRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;
  private messageQueue: Map<string, HTMLElement> = new Map();
  private messageId = 0;

  constructor() {
    this.initializeLiveRegions();
  }

  /**
   * Initialize live regions for announcements
   */
  private initializeLiveRegions(): void {
    // Create polite live region
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only';
    this.liveRegion.setAttribute('aria-hidden', 'false');
    document.body.appendChild(this.liveRegion);

    // Create assertive live region
    this.assertiveRegion = document.createElement('div');
    this.assertiveRegion.setAttribute('role', 'alert');
    this.assertiveRegion.setAttribute('aria-live', 'assertive');
    this.assertiveRegion.setAttribute('aria-atomic', 'true');
    this.assertiveRegion.className = 'sr-only';
    this.assertiveRegion.setAttribute('aria-hidden', 'false');
    document.body.appendChild(this.assertiveRegion);
  }

  /**
   * Set ARIA label on element
   */
  setLabel(element: HTMLElement, label: string): void {
    element.setAttribute('aria-label', label);
  }

  /**
   * Set ARIA labelledby on element
   */
  setLabelledBy(element: HTMLElement, labelledBy: string): void {
    element.setAttribute('aria-labelledby', labelledBy);
  }

  /**
   * Set ARIA description on element
   */
  setDescription(element: HTMLElement, description: string): void {
    const descId = `desc-${this.messageId++}`;
    const descElement = document.createElement('div');
    descElement.id = descId;
    descElement.className = 'sr-only';
    descElement.textContent = description;
    document.body.appendChild(descElement);

    element.setAttribute('aria-describedby', descId);
  }

  /**
   * Set ARIA describedby on element
   */
  setDescribedBy(element: HTMLElement, describedBy: string): void {
    element.setAttribute('aria-describedby', describedBy);
  }

  /**
   * Set ARIA role on element
   */
  setRole(element: HTMLElement, role: string): void {
    element.setAttribute('role', role);
  }

  /**
   * Set multiple ARIA attributes on element
   */
  setAriaAttributes(element: HTMLElement, attributes: Partial<AriaAttributes>): void {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        element.setAttribute(key, String(value));
      }
    });
  }

  /**
   * Announce message to screen readers
   */
  announceLiveRegion(message: string, priority: AnnouncementPriority = 'polite'): void {
    const region = priority === 'assertive' ? this.assertiveRegion : this.liveRegion;
    if (!region) {
      console.error('Live region not initialized');
      return;
    }

    // Clear previous message with same content to prevent duplication
    if (region.textContent === message) {
      return;
    }

    // Clear message queue for this region
    this.clearMessageQueue(priority);

    // Update message
    region.textContent = '';

    // Use setTimeout to ensure screen readers register the change
    setTimeout(() => {
      if (region) {
        region.textContent = message;
      }
    }, 100);
  }

  /**
   * Announce polite message
   */
  announcePolite(message: string): void {
    this.announceLiveRegion(message, 'polite');
  }

  /**
   * Announce assertive message
   */
  announceAssertive(message: string): void {
    this.announceLiveRegion(message, 'assertive');
  }

  /**
   * Update cell state with ARIA attributes
   */
  updateCellState(cellId: string, state: CellState): void {
    const cell = document.getElementById(cellId);
    if (!cell) {
      console.warn(`Cell ${cellId} not found`);
      return;
    }

    // Set role based on cell type
    const role = CELL_TYPE_ROLES[state.type] || 'gridcell';
    cell.setAttribute('role', role);

    // Set label with cell position and type
    const label = this.formatCellLabel(state);
    cell.setAttribute('aria-label', label);

    // Set editable state
    if (role === 'textbox') {
      cell.setAttribute('aria-readonly', state.editable ? 'false' : 'true');
    }

    // Set selected state
    cell.setAttribute('aria-selected', state.selected.toString());

    // Set invalid state if error
    if (state.error) {
      cell.setAttribute('aria-invalid', 'true');
      this.announceAssertive(`Error in cell ${state.position.columnLabel}${state.position.row}: ${state.error}`);
    } else {
      cell.setAttribute('aria-invalid', 'false');
    }

    // Set expanded state for collapsible cells
    if (state.type === 'analysis' || state.type === 'explain') {
      cell.setAttribute('aria-expanded', 'false');
    }

    // Announce value change if changed
    if (state.changed) {
      this.announceCellValueChange(state);
    }
  }

  /**
   * Format cell label for screen readers
   */
  private formatCellLabel(state: CellState): string {
    const { position, type, value } = state;
    const positionLabel = `${position.columnLabel}${position.row}`;
    const typeLabel = type.replace(/([A-Z])/g, ' $1').trim();

    let label = `Cell ${positionLabel}, ${typeLabel}`;

    if (value !== undefined && value !== null && value !== '') {
      const valueLabel = this.formatValueLabel(value);
      label += `, ${valueLabel}`;
    }

    if (state.error) {
      label += `, has error: ${state.error}`;
    }

    return label;
  }

  /**
   * Format value for screen reader announcement
   */
  private formatValueLabel(value: any): string {
    if (typeof value === 'number') {
      return `value is ${value}`;
    }
    if (typeof value === 'boolean') {
      return value ? 'checked' : 'unchecked';
    }
    if (Array.isArray(value)) {
      return `${value.length} items`;
    }
    if (typeof value === 'object') {
      return 'complex value';
    }
    return String(value);
  }

  /**
   * Announce cell value change
   */
  private announceCellValueChange(state: CellState): void {
    const { position, value } = state;
    const positionLabel = `${position.columnLabel}${position.row}`;
    const valueLabel = this.formatValueLabel(value);

    this.announcePolite(`Cell ${positionLabel} changed to ${valueLabel}`);
  }

  /**
   * Set grid ARIA attributes
   */
  setGridAttributes(gridElement: HTMLElement, rowCount: number, columnCount: number): void {
    gridElement.setAttribute('role', 'grid');
    gridElement.setAttribute('aria-rowcount', rowCount.toString());
    gridElement.setAttribute('aria-colcount', columnCount.toString());
  }

  /**
   * Set row ARIA attributes
   */
  setRowAttributes(rowElement: HTMLElement, rowIndex: number): void {
    rowElement.setAttribute('role', 'row');
    rowElement.setAttribute('aria-rowindex', rowIndex.toString());
  }

  /**
   * Set column header ARIA attributes
   */
  setColumnHeaderAttributes(
    headerElement: HTMLElement,
    columnIndex: number,
    label: string
  ): void {
    headerElement.setAttribute('role', 'columnheader');
    headerElement.setAttribute('aria-colindex', columnIndex.toString());
    headerElement.setAttribute('aria-label', label);
    headerElement.setAttribute('aria-sort', 'none');
  }

  /**
   * Set row header ARIA attributes
   */
  setRowHeaderAttributes(
    headerElement: HTMLElement,
    rowIndex: number,
    label: string
  ): void {
    headerElement.setAttribute('role', 'rowheader');
    headerElement.setAttribute('aria-rowindex', rowIndex.toString());
    headerElement.setAttribute('aria-label', label);
  }

  /**
   * Set cell ARIA attributes
   */
  setCellAttributes(
    cellElement: HTMLElement,
    rowIndex: number,
    columnIndex: number,
    selected: boolean = false
  ): void {
    cellElement.setAttribute('role', 'gridcell');
    cellElement.setAttribute('aria-rowindex', rowIndex.toString());
    cellElement.setAttribute('aria-colindex', columnIndex.toString());
    cellElement.setAttribute('aria-selected', selected.toString());
  }

  /**
   * Set expanded state
   */
  setExpanded(element: HTMLElement, expanded: boolean): void {
    element.setAttribute('aria-expanded', expanded.toString());
  }

  /**
   * Set busy state
   */
  setBusy(element: HTMLElement, busy: boolean): void {
    element.setAttribute('aria-busy', busy.toString());
  }

  /**
   * Set disabled state
   */
  setDisabled(element: HTMLElement, disabled: boolean): void {
    element.setAttribute('aria-disabled', disabled.toString());
  }

  /**
   * Set required state
   */
  setRequired(element: HTMLElement, required: boolean): void {
    element.setAttribute('aria-required', required.toString());
  }

  /**
   * Set invalid state
   */
  setInvalid(element: HTMLElement, invalid: boolean | 'grammar' | 'spelling' = true): void {
    element.setAttribute('aria-invalid', String(invalid));
  }

  /**
   * Clear message queue for priority level
   */
  private clearMessageQueue(priority: AnnouncementPriority): void {
    const region = priority === 'assertive' ? this.assertiveRegion : this.liveRegion;
    if (region) {
      region.textContent = '';
    }
  }

  /**
   * Clean up live regions
   */
  destroy(): void {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
    }
    if (this.assertiveRegion && this.assertiveRegion.parentNode) {
      this.assertiveRegion.parentNode.removeChild(this.assertiveRegion);
    }
    this.messageQueue.clear();
  }
}

/**
 * Singleton instance
 */
export const ariaManager = new AriaManager();
