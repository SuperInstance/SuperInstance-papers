/**
 * POLLN Spreadsheet - GridDisplay
 *
 * High-performance grid display with virtual scrolling.
 * Optimized for 100K+ cells with <16ms frame time.
 */

import { VirtualGrid, VirtualGridConfig, VirtualCell } from '../performance/VirtualGrid.js';
import { CellPool } from '../performance/CellPool.js';
import { BatchScheduler } from '../performance/BatchScheduler.js';
import { MetricsCollector, OperationTimer } from '../performance/MetricsCollector.js';
import { LogCell } from '../core/LogCell.js';
import { CellState } from '../core/types.js';

export interface GridDisplayConfig {
  container: HTMLElement;
  rowCount: number;
  colCount: number;
  rowHeight: number;
  colWidth: number;
  enableVirtualScrolling: boolean;
  enableObjectPooling: boolean;
  enableBatchUpdates: boolean;
  enableMetrics: boolean;
}

export interface CellData {
  row: number;
  col: number;
  value: any;
  state: CellState;
  type: string;
}

/**
 * GridDisplay - Optimized grid rendering
 *
 * Key features:
 * - Virtual scrolling for large grids
 * - Object pooling to reduce GC
 * - Batched updates for smooth rendering
 * - Comprehensive performance metrics
 */
export class GridDisplay {
  private config: GridDisplayConfig;
  private container: HTMLElement;
  private viewport: HTMLElement;
  private headerContainer: HTMLElement;
  private rowHeaderContainer: HTMLElement;

  // Performance components
  private virtualGrid: VirtualGrid | null = null;
  private cellPool: CellPool | null = null;
  private batchScheduler: BatchScheduler | null = null;
  private metricsCollector: MetricsCollector | null = null;

  // Cell data
  private cells: Map<string, LogCell> = new Map();
  private cellData: Map<string, CellData> = new Map();

  // UI state
  private selectedCell: { row: number; col: number } | null = null;
  private hoveredCell: { row: number; col: number } | null = null;
  private editingCell: { row: number; col: number } | null = null;

  // Styling
  private styles = {
    container: 'polln-grid-container',
    viewport: 'polln-grid-viewport',
    cell: 'polln-grid-cell',
    cellSelected: 'polln-grid-cell-selected',
    cellHovered: 'polln-grid-cell-hovered',
    cellEditing: 'polln-grid-cell-editing',
    header: 'polln-grid-header',
    rowHeader: 'polln-grid-row-header',
  };

  constructor(config: GridDisplayConfig) {
    this.config = config;
    this.container = config.container;

    this.initializeUI();
    this.initializePerformanceComponents();
    this.setupEventListeners();
  }

  /**
   * Initialize UI structure
   */
  private initializeUI(): void {
    // Main container
    this.container.className = this.styles.container;
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';

    // Viewport for scrolling
    this.viewport = document.createElement('div');
    this.viewport.className = this.styles.viewport;
    this.viewport.style.position = 'absolute';
    this.viewport.style.top = '0';
    this.viewport.style.left = '0';
    this.viewport.style.right = '0';
    this.viewport.style.bottom = '0';
    this.viewport.style.overflow = 'auto';
    this.container.appendChild(this.viewport);

    // Column headers
    this.headerContainer = document.createElement('div');
    this.headerContainer.className = this.styles.header;
    this.headerContainer.style.position = 'sticky';
    this.headerContainer.style.top = '0';
    this.headerContainer.style.left = '0';
    this.headerContainer.style.right = '0';
    this.headerContainer.style.height = `${this.config.rowHeight}px`;
    this.headerContainer.style.backgroundColor = '#f0f0f0';
    this.headerContainer.style.borderBottom = '1px solid #ccc';
    this.headerContainer.style.zIndex = '10';
    this.viewport.appendChild(this.headerContainer);

    // Row headers
    this.rowHeaderContainer = document.createElement('div');
    this.rowHeaderContainer.className = this.styles.rowHeader;
    this.rowHeaderContainer.style.position = 'sticky';
    this.rowHeaderContainer.style.top = `${this.config.rowHeight}px`;
    this.rowHeaderContainer.style.left = '0';
    this.rowHeaderContainer.style.width = `${this.config.colWidth}px`;
    this.rowHeaderContainer.style.backgroundColor = '#f0f0f0';
    this.rowHeaderContainer.style.borderRight = '1px solid #ccc';
    this.rowHeaderContainer.style.zIndex = '9';
    this.viewport.appendChild(this.rowHeaderContainer);
  }

  /**
   * Initialize performance components
   */
  private initializePerformanceComponents(): void {
    // Virtual grid
    if (this.config.enableVirtualScrolling) {
      this.virtualGrid = new VirtualGrid({
        rowCount: this.config.rowCount,
        colCount: this.config.colCount,
        rowHeight: this.config.rowHeight,
        colWidth: this.config.colWidth,
        container: this.viewport,
      });

      this.virtualGrid.onVisibleChange((range) => {
        this.onVisibleCellsChange(range);
      });
    }

    // Cell pool
    if (this.config.enableObjectPooling) {
      this.cellPool = new CellPool({
        initialSize: 100,
        maxSize: 10000,
      });
    }

    // Batch scheduler
    if (this.config.enableBatchUpdates) {
      this.batchScheduler = new BatchScheduler({
        maxTasksPerFrame: 100,
        maxFrameTime: 14,
      });
    }

    // Metrics collector
    if (this.config.enableMetrics) {
      this.metricsCollector = new MetricsCollector({
        sampleInterval: 1000,
        historySize: 60,
      });
      this.metricsCollector.start();
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.viewport.addEventListener('scroll', () => {
      this.scheduleUpdate('scroll');
    });

    this.viewport.addEventListener('click', (e) => {
      this.handleCellClick(e);
    });

    this.viewport.addEventListener('mouseover', (e) => {
      this.handleCellHover(e);
    });

    this.viewport.addEventListener('dblclick', (e) => {
      this.handleCellDoubleClick(e);
    });

    document.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });
  }

  /**
   * Handle visible cells change
   */
  private onVisibleCellsChange(range: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  }): void {
    if (!this.virtualGrid) return;

    const timer = this.metricsCollector
      ? new OperationTimer(this.metricsCollector, 'render_visible_cells')
      : null;

    try {
      this.virtualGrid.render((cell) => this.renderCell(cell));
    } finally {
      timer?.end();
    }
  }

  /**
   * Render a single cell
   */
  private renderCell(virtualCell: VirtualCell): HTMLElement {
    const key = `${virtualCell.row},${virtualCell.col}`;
    const data = this.cellData.get(key);

    const element = document.createElement('div');
    element.className = this.styles.cell;
    element.dataset.row = String(virtualCell.row);
    element.dataset.col = String(virtualCell.col);
    element.style.position = 'absolute';
    element.style.top = `${virtualCell.row * this.config.rowHeight}px`;
    element.style.left = `${virtualCell.col * this.config.colWidth}px`;
    element.style.width = `${this.config.colWidth}px`;
    element.style.height = `${this.config.rowHeight}px`;
    element.style.border = '1px solid #e0e0e0';
    element.style.boxSizing = 'border-box';
    element.style.overflow = 'hidden';
    element.style.padding = '4px';
    element.style.cursor = 'cell';
    element.style.userSelect = 'none';

    // Set cell content
    if (data) {
      element.textContent = this.formatCellValue(data);
      element.dataset.state = data.state;
      element.dataset.type = data.type;

      // Apply state-specific styling
      this.applyCellStyle(element, data);
    }

    // Apply selection/hover states
    this.applyCellStates(element, virtualCell.row, virtualCell.col);

    return element;
  }

  /**
   * Format cell value for display
   */
  private formatCellValue(data: CellData): string {
    if (data.value === null || data.value === undefined) {
      return '';
    }

    if (typeof data.value === 'object') {
      return JSON.stringify(data.value);
    }

    return String(data.value);
  }

  /**
   * Apply cell styling based on state
   */
  private applyCellStyle(element: HTMLElement, data: CellData): void {
    switch (data.state) {
      case CellState.ERROR:
        element.style.backgroundColor = '#fee';
        element.style.color = '#c00';
        break;
      case CellState.PROCESSING:
        element.style.backgroundColor = '#ffc';
        break;
      case CellState.EMITTING:
        element.style.backgroundColor = '#efe';
        break;
      case CellState.DORMANT:
        element.style.backgroundColor = '#f9f9f9';
        break;
      default:
        element.style.backgroundColor = '#fff';
    }
  }

  /**
   * Apply selection/hover states
   */
  private applyCellStates(
    element: HTMLElement,
    row: number,
    col: number
  ): void {
    if (this.selectedCell?.row === row && this.selectedCell?.col === col) {
      element.classList.add(this.styles.cellSelected);
      element.style.outline = '2px solid #2196F3';
      element.style.outlineOffset = '-2px';
    }

    if (this.hoveredCell?.row === row && this.hoveredCell?.col === col) {
      element.classList.add(this.styles.cellHovered);
      element.style.backgroundColor = '#e3f2fd';
    }

    if (this.editingCell?.row === row && this.editingCell?.col === col) {
      element.classList.add(this.styles.cellEditing);
      element.style.outline = '2px solid #4CAF50';
      element.style.outlineOffset = '-2px';
    }
  }

  /**
   * Handle cell click
   */
  private handleCellClick(e: Event): void {
    const target = e.target as HTMLElement;
    const row = parseInt(target.dataset.row || '-1');
    const col = parseInt(target.dataset.col || '-1');

    if (row >= 0 && col >= 0) {
      this.selectedCell = { row, col };
      this.scheduleUpdate('selection');
      this.onCellSelected?.(row, col);
    }
  }

  /**
   * Handle cell hover
   */
  private handleCellHover(e: Event): void {
    const target = e.target as HTMLElement;
    const row = parseInt(target.dataset.row || '-1');
    const col = parseInt(target.dataset.col || '-1');

    if (row >= 0 && col >= 0) {
      this.hoveredCell = { row, col };
      this.scheduleUpdate('hover');
      this.onCellHovered?.(row, col);
    }
  }

  /**
   * Handle cell double-click
   */
  private handleCellDoubleClick(e: Event): void {
    const target = e.target as HTMLElement;
    const row = parseInt(target.dataset.row || '-1');
    const col = parseInt(target.dataset.col || '-1');

    if (row >= 0 && col >= 0) {
      this.editingCell = { row, col };
      this.scheduleUpdate('edit');
      this.onCellEditing?.(row, col);
    }
  }

  /**
   * Handle keyboard input
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.selectedCell) return;

    const { row, col } = this.selectedCell;

    switch (e.key) {
      case 'ArrowUp':
        if (row > 0) {
          this.selectedCell = { row: row - 1, col };
          this.scheduleUpdate('navigation');
        }
        break;
      case 'ArrowDown':
        if (row < this.config.rowCount - 1) {
          this.selectedCell = { row: row + 1, col };
          this.scheduleUpdate('navigation');
        }
        break;
      case 'ArrowLeft':
        if (col > 0) {
          this.selectedCell = { row, col: col - 1 };
          this.scheduleUpdate('navigation');
        }
        break;
      case 'ArrowRight':
        if (col < this.config.colCount - 1) {
          this.selectedCell = { row, col: col + 1 };
          this.scheduleUpdate('navigation');
        }
        break;
      case 'Enter':
        this.editingCell = this.selectedCell;
        this.scheduleUpdate('edit');
        this.onCellEditing?.(row, col);
        break;
      case 'Escape':
        this.editingCell = null;
        this.scheduleUpdate('edit');
        break;
    }
  }

  /**
   * Schedule UI update
   */
  private scheduleUpdate(reason: string): void {
    if (this.batchScheduler) {
      this.batchScheduler.schedule(
        `update_${reason}`,
        () => this.performUpdate(),
        0,
        'write'
      );
    } else {
      requestAnimationFrame(() => this.performUpdate());
    }
  }

  /**
   * Perform UI update
   */
  private performUpdate(): void {
    if (this.virtualGrid) {
      this.virtualGrid.forceRender();
      this.onVisibleCellsChange(this.virtualGrid.getVisibleRange());
    }
  }

  /**
   * Set cell data
   */
  setCellData(row: number, col: number, data: Partial<CellData>): void {
    const key = `${row},${col}`;
    const existing = this.cellData.get(key) || {
      row,
      col,
      value: null,
      state: CellState.DORMANT,
      type: 'unknown',
    };

    this.cellData.set(key, { ...existing, ...data });
    this.scheduleUpdate('data_change');
  }

  /**
   * Get cell data
   */
  getCellData(row: number, col: number): CellData | undefined {
    const key = `${row},${col}`;
    return this.cellData.get(key);
  }

  /**
   * Scroll to cell
   */
  scrollToCell(row: number, col: number, smooth = true): void {
    if (this.virtualGrid) {
      this.virtualGrid.scrollToCell(row, col, smooth);
    }
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      virtualGrid: this.virtualGrid?.getMetrics(),
      cellPool: this.cellPool?.getStats(),
      batchScheduler: this.batchScheduler?.getMetrics(),
      metricsCollector: this.metricsCollector?.getMetrics(),
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): string {
    if (!this.metricsCollector) return 'Metrics not enabled';

    return this.metricsCollector.getSummary();
  }

  /**
   * Update grid dimensions
   */
  updateDimensions(rowCount: number, colCount: number): void {
    this.config.rowCount = rowCount;
    this.config.colCount = colCount;

    if (this.virtualGrid) {
      this.virtualGrid.updateDimensions(rowCount, colCount);
    }
  }

  /**
   * Callbacks
   */
  onCellSelected?: (row: number, col: number) => void;
  onCellHovered?: (row: number, col: number) => void;
  onCellEditing?: (row: number, col: number) => void;

  /**
   * Cleanup
   */
  destroy(): void {
    this.virtualGrid?.destroy();
    this.cellPool?.clear();
    this.batchScheduler?.destroy();
    this.metricsCollector?.stop();

    this.cells.clear();
    this.cellData.clear();

    this.container.innerHTML = '';
  }
}
