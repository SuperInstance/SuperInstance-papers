/**
 * POLLN Spreadsheet - VirtualGrid
 *
 * Virtual scrolling implementation for large grids.
 * Only renders visible cells to maintain 60fps even with 100K+ cells.
 */

export interface GridViewport {
  scrollTop: number;
  scrollLeft: number;
  width: number;
  height: number;
}

export interface CellRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

export interface VirtualCell {
  row: number;
  col: number;
  element?: HTMLElement;
  data?: any;
  visible: boolean;
}

export interface VirtualGridConfig {
  rowCount: number;
  colCount: number;
  rowHeight: number;
  colWidth: number;
  bufferRowCount?: number;
  bufferColCount?: number;
  container: HTMLElement;
}

/**
 * VirtualGrid - Efficient rendering of large grids
 *
 * Key optimizations:
 * - Only renders visible cells + buffer
 * - Recycles cell elements
 * - Tracks viewport efficiently
 * - Debounces scroll events
 */
export class VirtualGrid {
  private config: VirtualGridConfig;
  private viewport: GridViewport;
  private visibleRange: CellRange;
  private cellCache: Map<string, VirtualCell>;
  private recycledElements: HTMLElement[];
  private scrollRAF: number | null = null;
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private onVisibleCellsChange?: (range: CellRange) => void;

  // Performance metrics
  private renderCount = 0;
  private recycleCount = 0;
  private lastRenderTime = 0;
  private avgRenderTime = 0;

  constructor(config: VirtualGridConfig) {
    this.config = {
      bufferRowCount: 3,
      bufferColCount: 3,
      ...config,
    };

    this.viewport = {
      scrollTop: 0,
      scrollLeft: 0,
      width: config.container.clientWidth,
      height: config.container.clientHeight,
    };

    this.visibleRange = this.calculateVisibleRange();
    this.cellCache = new Map();
    this.recycledElements = [];

    this.setupResizeObserver();
    this.setupIntersectionObserver();
    this.setupScrollListener();
  }

  /**
   * Calculate which cells are visible in viewport
   */
  private calculateVisibleRange(): CellRange {
    const startRow = Math.max(
      0,
      Math.floor(this.viewport.scrollTop / this.config.rowHeight) -
        (this.config.bufferRowCount ?? 0)
    );
    const endRow = Math.min(
      this.config.rowCount - 1,
      Math.ceil((this.viewport.scrollTop + this.viewport.height) / this.config.rowHeight) +
        (this.config.bufferRowCount ?? 0)
    );

    const startCol = Math.max(
      0,
      Math.floor(this.viewport.scrollLeft / this.config.colWidth) -
        (this.config.bufferColCount ?? 0)
    );
    const endCol = Math.min(
      this.config.colCount - 1,
      Math.ceil((this.viewport.scrollLeft + this.viewport.width) / this.config.colWidth) +
        (this.config.bufferColCount ?? 0)
    );

    return { startRow, endRow, startCol, endCol };
  }

  /**
   * Get cells that should be visible
   */
  getVisibleCells(): VirtualCell[] {
    const cells: VirtualCell[] = [];
    const range = this.visibleRange;

    for (let row = range.startRow; row <= range.endRow; row++) {
      for (let col = range.startCol; col <= range.endCol; col++) {
        const key = `${row},${col}`;
        let cell = this.cellCache.get(key);

        if (!cell) {
          cell = {
            row,
            col,
            visible: true,
          };
          this.cellCache.set(key, cell);
        }

        cell.visible = true;
        cells.push(cell);
      }
    }

    return cells;
  }

  /**
   * Render visible cells
   */
  render(renderCell: (cell: VirtualCell) => HTMLElement): void {
    const startTime = performance.now();

    // Mark all cells as invisible initially
    this.cellCache.forEach((cell) => {
      cell.visible = false;
    });

    // Get new visible range
    const newRange = this.calculateVisibleRange();
    const rangeChanged =
      newRange.startRow !== this.visibleRange.startRow ||
      newRange.endRow !== this.visibleRange.endRow ||
      newRange.startCol !== this.visibleRange.startCol ||
      newRange.endCol !== this.visibleRange.endCol;

    this.visibleRange = newRange;

    // Render visible cells
    const visibleCells = this.getVisibleCells();
    const fragment = document.createDocumentFragment();

    visibleCells.forEach((cell) => {
      let element = cell.element;

      if (!element) {
        // Try to recycle an element
        element = this.recycledElements.pop();
      }

      if (!element) {
        // Create new element
        element = renderCell(cell);
        this.renderCount++;
      } else {
        // Update existing element
        this.updateCellElement(element, cell);
      }

      cell.element = element;
      fragment.appendChild(element);
    });

    // Recycle invisible cells
    this.cellCache.forEach((cell) => {
      if (!cell.visible && cell.element) {
        this.recycleElement(cell.element);
        cell.element = undefined;
        this.recycleCount++;
      }
    });

    // Update container
    this.config.container.innerHTML = '';
    this.config.container.appendChild(fragment);

    // Track performance
    const renderTime = performance.now() - startTime;
    this.lastRenderTime = renderTime;
    this.avgRenderTime = this.avgRenderTime * 0.9 + renderTime * 0.1;

    // Notify of range change
    if (rangeChanged && this.onVisibleCellsChange) {
      this.onVisibleCellsChange(this.visibleRange);
    }
  }

  /**
   * Update cell element with new data
   */
  private updateCellElement(element: HTMLElement, cell: VirtualCell): void {
    element.dataset.row = String(cell.row);
    element.dataset.col = String(cell.col);

    // Position element
    element.style.position = 'absolute';
    element.style.top = `${cell.row * this.config.rowHeight}px`;
    element.style.left = `${cell.col * this.config.colWidth}px`;
    element.style.width = `${this.config.colWidth}px`;
    element.style.height = `${this.config.rowHeight}px`;
  }

  /**
   * Recycle element for reuse
   */
  private recycleElement(element: HTMLElement): void {
    element.remove();
    this.recycledElements.push(element);

    // Limit recycled elements cache
    if (this.recycledElements.length > 1000) {
      this.recycledElements.shift();
    }
  }

  /**
   * Setup resize observer
   */
  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.viewport.width = width;
        this.viewport.height = height;
        this.scheduleRender();
      }
    });

    this.resizeObserver.observe(this.config.container);
  }

  /**
   * Setup intersection observer for lazy loading
   */
  private setupIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const row = parseInt(entry.target.dataset.row || '0');
          const col = parseInt(entry.target.dataset.col || '0');
          const key = `${row},${col}`;
          const cell = this.cellCache.get(key);

          if (cell) {
            cell.visible = entry.isIntersecting;
          }
        });
      },
      {
        root: this.config.container,
        threshold: 0.1,
      }
    );
  }

  /**
   * Setup scroll listener with RAF
   */
  private setupScrollListener(): void {
    let lastScrollTime = 0;
    const scrollThreshold = 16; // ~60fps

    this.config.container.addEventListener('scroll', () => {
      const now = performance.now();

      if (now - lastScrollTime < scrollThreshold) {
        return;
      }

      lastScrollTime = now;

      this.viewport.scrollTop = this.config.container.scrollTop;
      this.viewport.scrollLeft = this.config.container.scrollLeft;

      this.scheduleRender();
    });
  }

  /**
   * Schedule render on next RAF
   */
  private scheduleRender(): void {
    if (this.scrollRAF !== null) {
      return;
    }

    this.scrollRAF = requestAnimationFrame(() => {
      this.scrollRAF = null;
      // Trigger re-render through callback
      if (this.onVisibleCellsChange) {
        this.onVisibleCellsChange(this.visibleRange);
      }
    });
  }

  /**
   * Register callback for visible cells change
   */
  onVisibleChange(callback: (range: CellRange) => void): void {
    this.onVisibleCellsChange = callback;
  }

  /**
   * Scroll to specific cell
   */
  scrollToCell(row: number, col: number, smooth = true): void {
    const scrollTop = row * this.config.rowHeight;
    const scrollLeft = col * this.config.colWidth;

    this.config.container.scrollTo({
      top: scrollTop,
      left: scrollLeft,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }

  /**
   * Get viewport info
   */
  getViewport(): GridViewport {
    return { ...this.viewport };
  }

  /**
   * Get visible range
   */
  getVisibleRange(): CellRange {
    return { ...this.visibleRange };
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      renderCount: this.renderCount,
      recycleCount: this.recycleCount,
      lastRenderTime: this.lastRenderTime,
      avgRenderTime: this.avgRenderTime,
      visibleCellCount:
        (this.visibleRange.endRow - this.visibleRange.startRow + 1) *
        (this.visibleRange.endCol - this.visibleRange.startCol + 1),
      totalCellCount: this.config.rowCount * this.config.colCount,
      cachedCellCount: this.cellCache.size,
      recycledElementCount: this.recycledElements.length,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.renderCount = 0;
    this.recycleCount = 0;
    this.lastRenderTime = 0;
    this.avgRenderTime = 0;
  }

  /**
   * Update grid dimensions
   */
  updateDimensions(rowCount: number, colCount: number): void {
    this.config.rowCount = rowCount;
    this.config.colCount = colCount;
    this.visibleRange = this.calculateVisibleRange();
  }

  /**
   * Update cell dimensions
   */
  updateCellSize(rowHeight: number, colWidth: number): void {
    this.config.rowHeight = rowHeight;
    this.config.colWidth = colWidth;
    this.visibleRange = this.calculateVisibleRange();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.scrollRAF !== null) {
      cancelAnimationFrame(this.scrollRAF);
    }

    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();

    this.cellCache.clear();
    this.recycledElements = [];
    this.config.container.innerHTML = '';
  }

  /**
   * Force re-render
   */
  forceRender(): void {
    this.visibleRange = this.calculateVisibleRange();
  }
}
