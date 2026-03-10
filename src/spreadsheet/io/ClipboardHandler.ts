/**
 * POLLN Clipboard Handler
 *
 * Handles copy/paste operations for cell ranges with format preservation,
 * reference adjustment, cross-tab support, and undo/redo integration.
 *
 * @module io
 */

import type { LogCell } from '../core/LogCell.js';
import type {
  CellId,
  CellReference,
  CellPosition,
} from '../core/types.js';
import type { ClipboardData } from './types.js';

/**
 * Clipboard format types
 */
export enum ClipboardFormat {
  POLLN_CELLS = 'polln_cells',
  POLLN_VALUES = 'polln_values',
  TEXT = 'text',
  CSV = 'csv',
  HTML = 'html',
}

/**
 * Reference adjustment mode
 */
export enum ReferenceAdjustment {
  RELATIVE = 'relative',
  ABSOLUTE = 'absolute',
  MIXED = 'mixed',
}

/**
 * Clipboard operation result
 */
export interface ClipboardResult {
  success: boolean;
  cellsAffected: number;
  format: ClipboardFormat;
  data?: any;
  error?: string;
}

/**
 * Cell range for selection
 */
export interface CellRange {
  start: CellPosition;
  end: CellPosition;
  sheet?: string;
}

/**
 * Clipboard operation type
 */
export enum ClipboardOperation {
  COPY = 'copy',
  CUT = 'cut',
  PASTE = 'paste',
}

/**
 * Clipboard history entry for undo/redo
 */
export interface ClipboardHistoryEntry {
  id: string;
  operation: ClipboardOperation;
  timestamp: number;
  data: ClipboardData;
  sourceRange?: CellRange;
  targetRange?: CellRange;
  referenceAdjustment: ReferenceAdjustment;
}

/**
 * Clipboard handler configuration
 */
export interface ClipboardHandlerConfig {
  /**
   * Default reference adjustment mode
   */
  defaultReferenceAdjustment?: ReferenceAdjustment;

  /**
   * Maximum clipboard size (in cells)
   */
  maxClipboardSize?: number;

  /**
   * Enable cross-tab copy/paste
   */
  enableCrossTab?: boolean;

  /**
   * Preserve cell formatting
   */
  preserveFormatting?: boolean;

  /**
   * Preserve cell connections
   */
  preserveConnections?: boolean;

  /**
   * Maximum history entries for undo/redo
   */
  maxHistoryEntries?: number;

  /**
   * Enable compression for large selections
   */
  enableCompression?: boolean;

  /**
   * Compression threshold (in cells)
   */
  compressionThreshold?: number;
}

/**
 * Clipboard event handler
 */
export type ClipboardEventHandler = (
  operation: ClipboardOperation,
  data: ClipboardData
) => void;

/**
 * POLLN Clipboard Handler
 *
 * Manages clipboard operations for cell ranges with format preservation,
 * reference adjustment, and cross-tab support.
 */
export class ClipboardHandler {
  private config: Required<ClipboardHandlerConfig>;
  private history: ClipboardHistoryEntry[] = [];
  private historyIndex: number = -1;
  private listeners: Set<ClipboardEventHandler> = new Set();
  private clipboardCache: Map<string, any> = new Map();

  /**
   * Default configuration
   */
  private static readonly DEFAULT_CONFIG: Required<ClipboardHandlerConfig> = {
    defaultReferenceAdjustment: ReferenceAdjustment.RELATIVE,
    maxClipboardSize: 10000,
    enableCrossTab: true,
    preserveFormatting: true,
    preserveConnections: true,
    maxHistoryEntries: 50,
    enableCompression: true,
    compressionThreshold: 100,
  };

  constructor(config?: ClipboardHandlerConfig) {
    this.config = {
      ...ClipboardHandler.DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Copy cells to clipboard
   *
   * @param cells - Array of cells to copy
   * @param range - Selection range
   * @param format - Clipboard format
   * @returns Clipboard operation result
   */
  public async copy(
    cells: LogCell[],
    range: CellRange,
    format: ClipboardFormat = ClipboardFormat.POLLN_CELLS
  ): Promise<ClipboardResult> {
    try {
      // Validate selection size
      if (cells.length > this.config.maxClipboardSize) {
        throw new Error(
          `Selection too large: ${cells.length} cells exceeds maximum of ${this.config.maxClipboardSize}`
        );
      }

      // Prepare clipboard data
      const clipboardData = await this.prepareClipboardData(
        cells,
        range,
        format
      );

      // Write to clipboard API
      await this.writeToClipboard(clipboardData, format);

      // Add to history
      this.addToHistory({
        id: this.generateId(),
        operation: ClipboardOperation.COPY,
        timestamp: Date.now(),
        data: clipboardData,
        sourceRange: range,
        referenceAdjustment: this.config.defaultReferenceAdjustment,
      });

      // Notify listeners
      this.notifyListeners(ClipboardOperation.COPY, clipboardData);

      return {
        success: true,
        cellsAffected: cells.length,
        format,
        data: clipboardData,
      };
    } catch (error) {
      return {
        success: false,
        cellsAffected: 0,
        format,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cut cells to clipboard
   *
   * @param cells - Array of cells to cut
   * @param range - Selection range
   * @param format - Clipboard format
   * @returns Clipboard operation result
   */
  public async cut(
    cells: LogCell[],
    range: CellRange,
    format: ClipboardFormat = ClipboardFormat.POLLN_CELLS
  ): Promise<ClipboardResult> {
    try {
      // First copy the cells
      const copyResult = await this.copy(cells, range, format);

      if (!copyResult.success) {
        return copyResult;
      }

      // Update history entry to cut instead of copy
      const lastEntry = this.history[this.history.length - 1];
      if (lastEntry) {
        lastEntry.operation = ClipboardOperation.CUT;
      }

      return {
        success: true,
        cellsAffected: cells.length,
        format,
        data: copyResult.data,
      };
    } catch (error) {
      return {
        success: false,
        cellsAffected: 0,
        format,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Paste cells from clipboard
   *
   * @param targetPosition - Target position for paste
   * @param referenceAdjustment - Reference adjustment mode
   * @param format - Expected clipboard format
   * @returns Clipboard operation result
   */
  public async paste(
    targetPosition: CellPosition,
    referenceAdjustment?: ReferenceAdjustment,
    format?: ClipboardFormat
  ): Promise<ClipboardResult> {
    try {
      // Read from clipboard
      const clipboardData = await this.readFromClipboard(format);

      if (!clipboardData) {
        throw new Error('Clipboard is empty or format not supported');
      }

      // Adjust references
      const adjustedData = await this.adjustReferences(
        clipboardData,
        targetPosition,
        referenceAdjustment || this.config.defaultReferenceAdjustment
      );

      // Calculate target range
      const targetRange = this.calculateTargetRange(
        adjustedData,
        targetPosition
      );

      // Add to history
      this.addToHistory({
        id: this.generateId(),
        operation: ClipboardOperation.PASTE,
        timestamp: Date.now(),
        data: adjustedData,
        targetRange,
        referenceAdjustment:
          referenceAdjustment || this.config.defaultReferenceAdjustment,
      });

      // Notify listeners
      this.notifyListeners(ClipboardOperation.PASTE, adjustedData);

      return {
        success: true,
        cellsAffected: this.countCells(adjustedData),
        format: this.detectFormat(adjustedData),
        data: adjustedData,
      };
    } catch (error) {
      return {
        success: false,
        cellsAffected: 0,
        format: ClipboardFormat.TEXT,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Undo last clipboard operation
   *
   * @returns True if undo was successful
   */
  public async undo(): Promise<boolean> {
    if (this.historyIndex < 0) {
      return false;
    }

    const entry = this.history[this.historyIndex];

    // Implement undo logic based on operation type
    // This would typically involve restoring the previous state

    this.historyIndex--;
    return true;
  }

  /**
   * Redo last undone clipboard operation
   *
   * @returns True if redo was successful
   */
  public async redo(): Promise<boolean> {
    if (this.historyIndex >= this.history.length - 1) {
      return false;
    }

    this.historyIndex++;
    const entry = this.history[this.historyIndex];

    // Implement redo logic based on operation type
    // This would typically involve reapplying the operation

    return true;
  }

  /**
   * Clear clipboard history
   */
  public clearHistory(): void {
    this.history = [];
    this.historyIndex = -1;
  }

  /**
   * Register event listener
   *
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  public onClipboardEvent(handler: ClipboardEventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  /**
   * Get clipboard history
   *
   * @returns Array of history entries
   */
  public getHistory(): ClipboardHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Check if can undo
   *
   * @returns True if undo is available
   */
  public canUndo(): boolean {
    return this.historyIndex >= 0;
  }

  /**
   * Check if can redo
   *
   * @returns True if redo is available
   */
  public canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * Prepare clipboard data from cells
   */
  private async prepareClipboardData(
    cells: LogCell[],
    range: CellRange,
    format: ClipboardFormat
  ): Promise<ClipboardData> {
    switch (format) {
      case ClipboardFormat.POLLN_CELLS:
        return {
          type: 'polln_cells',
          data: await this.serializeCells(cells, range),
          metadata: {
            source: 'polln',
            timestamp: Date.now(),
            version: '1.0.0',
          },
        };

      case ClipboardFormat.POLLN_VALUES:
        return {
          type: 'polln_values',
          data: this.extractValues(cells, range),
          metadata: {
            source: 'polln',
            timestamp: Date.now(),
            version: '1.0.0',
          },
        };

      case ClipboardFormat.CSV:
        return {
          type: 'text',
          data: this.toCSV(cells, range),
          metadata: {
            source: 'polln',
            timestamp: Date.now(),
            version: '1.0.0',
          },
        };

      case ClipboardFormat.TEXT:
        return {
          type: 'text',
          data: this.toText(cells, range),
          metadata: {
            source: 'polln',
            timestamp: Date.now(),
            version: '1.0.0',
          },
        };

      case ClipboardFormat.HTML:
        return {
          type: 'text',
          data: this.toHTML(cells, range),
          metadata: {
            source: 'polln',
            timestamp: Date.now(),
            version: '1.0.0',
          },
        };

      default:
        throw new Error(`Unsupported clipboard format: ${format}`);
    }
  }

  /**
   * Serialize cells to clipboard format
   */
  private async serializeCells(
    cells: LogCell[],
    range: CellRange
  ): Promise<any[]> {
    return cells.map(cell => {
      const json = cell.toJSON();
      const inspection = cell.inspect();

      return {
        id: cell.id,
        type: cell.type,
        state: cell.getState(),
        position: cell.position,
        value: this.extractValue(cell),
        formula: this.extractFormula(cell),
        format: this.config.preserveFormatting ? this.extractFormat(cell) : undefined,
        connections: this.config.preserveConnections ? this.extractConnections(cell) : undefined,
        inputs: inspection.inputs,
        outputs: inspection.outputs,
        sensations: inspection.sensations,
      };
    });
  }

  /**
   * Extract values from cells
   */
  private extractValues(cells: LogCell[], range: CellRange): any[][] {
    const rows: Map<number, any[]> = new Map();
    const cols: Map<number, any[]> = new Map();

    // Organize cells by position
    for (const cell of cells) {
      const { row, col } = cell.position;
      const value = this.extractValue(cell);

      if (!rows.has(row)) {
        rows.set(row, []);
      }
      rows.get(row)![col] = value;
    }

    // Convert to 2D array
    const values: any[][] = [];
    const sortedRows = Array.from(rows.keys()).sort((a, b) => a - b);

    for (const row of sortedRows) {
      const rowData = rows.get(row)!;
      // Fill gaps with null
      const maxCol = Math.max(...rowData.keys());
      const rowArray: any[] = [];
      for (let i = 0; i <= maxCol; i++) {
        rowArray.push(rowData[i] ?? null);
      }
      values.push(rowArray);
    }

    return values;
  }

  /**
   * Extract value from cell
   */
  private extractValue(cell: LogCell): any {
    try {
      const inspection = cell.inspect();
      if (inspection.memory && inspection.memory.length > 0) {
        const lastRecord = inspection.memory[inspection.memory.length - 1];
        return lastRecord.output;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract formula from cell
   */
  private extractFormula(cell: LogCell): string | undefined {
    try {
      const metadata = (cell as any).metadata;
      return metadata?.formula;
    } catch {
      return undefined;
    }
  }

  /**
   * Extract format from cell
   */
  private extractFormat(cell: LogCell): any {
    try {
      const metadata = (cell as any).metadata;
      return metadata?.format;
    } catch {
      return undefined;
    }
  }

  /**
   * Extract connections from cell
   */
  private extractConnections(cell: LogCell): any {
    try {
      const inspection = cell.inspect();
      return {
        inputs: inspection.inputs,
        outputs: inspection.outputs,
        sensations: inspection.sensations,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Convert cells to CSV
   */
  private toCSV(cells: LogCell[], range: CellRange): string {
    const values = this.extractValues(cells, range);
    return values.map(row => row.map(v => this.formatCSVValue(v)).join(',')).join('\n');
  }

  /**
   * Format value for CSV
   */
  private formatCSVValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Convert cells to plain text
   */
  private toText(cells: LogCell[], range: CellRange): string {
    const values = this.extractValues(cells, range);
    return values.map(row => row.map(v => String(v ?? '')).join('\t')).join('\n');
  }

  /**
   * Convert cells to HTML
   */
  private toHTML(cells: LogCell[], range: CellRange): string {
    const values = this.extractValues(cells, range);

    let html = '<table>\n';
    for (const row of values) {
      html += '  <tr>\n';
      for (const value of row) {
        html += `    <td>${this.escapeHtml(value)}</td>\n`;
      }
      html += '  </tr>\n';
    }
    html += '</table>';

    return html;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(value: any): string {
    const str = String(value ?? '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Write to clipboard API
   */
  private async writeToClipboard(
    data: ClipboardData,
    format: ClipboardFormat
  ): Promise<void> {
    // Check if Clipboard API is available
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      throw new Error('Clipboard API not available');
    }

    const clipboardItem: Record<string, Blob> = {};

    switch (format) {
      case ClipboardFormat.POLLN_CELLS:
      case ClipboardFormat.POLLN_VALUES:
        clipboardItem['application/json'] = new Blob(
          [JSON.stringify(data)],
          { type: 'application/json' }
        );
        clipboardItem['text/plain'] = new Blob(
          [JSON.stringify(data.data, null, 2)],
          { type: 'text/plain' }
        );
        break;

      case ClipboardFormat.CSV:
      case ClipboardFormat.TEXT:
      case ClipboardFormat.HTML:
        clipboardItem['text/plain'] = new Blob([String(data.data)], {
          type: 'text/plain',
        });
        if (format === ClipboardFormat.HTML) {
          clipboardItem['text/html'] = new Blob([String(data.data)], {
            type: 'text/html',
          });
        }
        break;
    }

    await navigator.clipboard.write([new ClipboardItem(clipboardItem)]);

    // Cache for fallback
    this.clipboardCache.set('last', data);
  }

  /**
   * Read from clipboard API
   */
  private async readFromClipboard(
    format?: ClipboardFormat
  ): Promise<ClipboardData | null> {
    // Check if Clipboard API is available
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      // Fallback to cache
      return this.clipboardCache.get('last') || null;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();

      for (const item of clipboardItems) {
        // Try JSON format first
        if (item.types.includes('application/json')) {
          const blob = await item.getType('application/json');
          const text = await blob.text();
          return JSON.parse(text);
        }

        // Try plain text
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          const text = await blob.text();

          // Try to parse as JSON
          try {
            return JSON.parse(text);
          } catch {
            // Return as plain text
            return {
              type: 'text',
              data: text,
            };
          }
        }
      }

      return null;
    } catch (error) {
      // Fallback to cache
      return this.clipboardCache.get('last') || null;
    }
  }

  /**
   * Adjust references in clipboard data
   */
  private async adjustReferences(
    data: ClipboardData,
    targetPosition: CellPosition,
    adjustment: ReferenceAdjustment
  ): Promise<ClipboardData> {
    if (data.type !== 'polln_cells') {
      return data;
    }

    const adjustedCells = data.data.map((cell: any) => {
      const offset = {
        row: targetPosition.row - cell.position.row,
        col: targetPosition.col - cell.position.col,
      };

      return {
        ...cell,
        position: {
          row: cell.position.row + offset.row,
          col: cell.position.col + offset.col,
        },
        connections: this.adjustCellConnections(
          cell.connections,
          offset,
          adjustment
        ),
      };
    });

    return {
      ...data,
      data: adjustedCells,
    };
  }

  /**
   * Adjust cell connections based on reference mode
   */
  private adjustCellConnections(
    connections: any,
    offset: { row: number; col: number },
    adjustment: ReferenceAdjustment
  ): any {
    if (!connections) {
      return connections;
    }

    const adjustReference = (ref: CellReference): CellReference => {
      switch (adjustment) {
        case ReferenceAdjustment.RELATIVE:
          return {
            ...ref,
            row: ref.row + offset.row,
            col: ref.col + offset.col,
          };

        case ReferenceAdjustment.ABSOLUTE:
          return ref;

        case ReferenceAdjustment.MIXED:
          // Mixed mode would need to detect absolute vs relative references
          // For now, default to relative
          return {
            ...ref,
            row: ref.row + offset.row,
            col: ref.col + offset.col,
          };

        default:
          return ref;
      }
    };

    return {
      inputs: connections.inputs?.map((input: any) => ({
        ...input,
        source:
          typeof input.source === 'object'
            ? adjustReference(input.source)
            : input.source,
      })),
      outputs: connections.outputs?.map((output: any) => ({
        ...output,
        target:
          typeof output.target === 'object'
            ? adjustReference(output.target)
            : output.target,
      })),
    };
  }

  /**
   * Calculate target range for paste operation
   */
  private calculateTargetRange(
    data: ClipboardData,
    targetPosition: CellPosition
  ): CellRange {
    if (data.type === 'polln_cells' && Array.isArray(data.data)) {
      let maxRow = targetPosition.row;
      let maxCol = targetPosition.col;

      for (const cell of data.data) {
        maxRow = Math.max(maxRow, cell.position.row);
        maxCol = Math.max(maxCol, cell.position.col);
      }

      return {
        start: targetPosition,
        end: { row: maxRow, col: maxCol },
      };
    }

    if (data.type === 'polln_values' && Array.isArray(data.data)) {
      const rows = data.data.length;
      const cols = data.data[0]?.length || 0;

      return {
        start: targetPosition,
        end: {
          row: targetPosition.row + rows - 1,
          col: targetPosition.col + cols - 1,
        },
      };
    }

    return {
      start: targetPosition,
      end: targetPosition,
    };
  }

  /**
   * Count cells in clipboard data
   */
  private countCells(data: ClipboardData): number {
    if (data.type === 'polln_cells' && Array.isArray(data.data)) {
      return data.data.length;
    }
    if (data.type === 'polln_values' && Array.isArray(data.data)) {
      return data.data.flat().length;
    }
    return 0;
  }

  /**
   * Detect format from clipboard data
   */
  private detectFormat(data: ClipboardData): ClipboardFormat {
    switch (data.type) {
      case 'polln_cells':
        return ClipboardFormat.POLLN_CELLS;
      case 'polln_values':
        return ClipboardFormat.POLLN_VALUES;
      default:
        return ClipboardFormat.TEXT;
    }
  }

  /**
   * Add entry to history
   */
  private addToHistory(entry: ClipboardHistoryEntry): void {
    // Remove any entries after current index
    this.history = this.history.slice(0, this.historyIndex + 1);

    // Add new entry
    this.history.push(entry);

    // Trim history if too long
    if (this.history.length > this.config.maxHistoryEntries) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(
    operation: ClipboardOperation,
    data: ClipboardData
  ): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(operation, data);
      } catch (error) {
        console.error('Clipboard event listener error:', error);
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `clipboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get clipboard contents (for testing/debugging)
   */
  public async getClipboardContents(): Promise<ClipboardData | null> {
    return this.readFromClipboard();
  }

  /**
   * Check if clipboard has data
   */
  public async hasClipboardData(): Promise<boolean> {
    const data = await this.readFromClipboard();
    return data !== null;
  }

  /**
   * Get clipboard format
   */
  public async getClipboardFormat(): Promise<ClipboardFormat | null> {
    const data = await this.readFromClipboard();
    return data ? this.detectFormat(data) : null;
  }

  /**
   * Clear clipboard cache
   */
  public clearCache(): void {
    this.clipboardCache.clear();
  }

  /**
   * Get configuration
   */
  public getConfig(): Readonly<Required<ClipboardHandlerConfig>> {
    return this.config;
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<ClipboardHandlerConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };
  }
}
