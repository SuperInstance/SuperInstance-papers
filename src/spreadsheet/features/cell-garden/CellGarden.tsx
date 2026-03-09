/**
 * Cell Garden - Main Visualization Component
 *
 * Orchestrates the cell ecosystem visualization with layout,
 * rendering, and user interaction.
 */

import { LayoutType, LayoutFactory, type LayoutNode, type LayoutLink } from './NetworkLayout.js';
import { GardenRenderer, WebGLGardenRenderer, type RenderOptions } from './GardenRenderer.tsx';
import { GardenControls, GardenTooltip, type GardenControlsConfig, type CellFilters, type TooltipContent } from './GardenControls.tsx';
import type { CellType, CellState, CellPosition } from '../../core/types.js';

/**
 * Cell data interface
 */
export interface CellData {
  id: string;
  type: CellType;
  state: CellState;
  position: CellPosition;
  activity: number;
  confidence: number;
  lastExecution?: number;
  description?: string;
}

/**
 * Cell connection data
 */
export interface CellConnection {
  source: string;
  target: string;
  type: 'data' | 'control' | 'sensation' | 'entanglement';
  strength?: number;
}

/**
 * Garden configuration
 */
export interface CellGardenConfig {
  width: number;
  height: number;
  container: HTMLElement;
  controlsContainer?: HTMLElement;
  initialLayout?: LayoutType;
  useWebGL?: boolean;
  enableAnimation?: boolean;
  enableControls?: boolean;
  enableTooltip?: boolean;
  onNodeClick?: (cell: CellData) => void;
  onNodeHover?: (cell: CellData | null) => void;
  onLayoutChange?: (layout: LayoutType) => void;
}

/**
 * Cell Garden Main Class
 */
export class CellGarden {
  private container: HTMLElement;
  private controlsContainer: HTMLElement | null;
  private canvas: HTMLCanvasElement;
  private renderer: GardenRenderer | WebGLGardenRenderer;
  private controls: GardenControls | null = null;
  private tooltip: GardenTooltip | null = null;
  private config: Required<CellGardenConfig>;

  private cells: Map<string, CellData> = new Map();
  private connections: CellConnection[] = [];
  private currentLayout: LayoutType;
  private filteredCells: Set<string> = new Set();
  private currentFilters: CellFilters = {
    types: [],
    states: [],
    searchQuery: '',
    minActivity: 0,
    maxActivity: 1,
  };
  private currentZoom: number = 1;
  private animationFrame: number | null = null;
  private wsConnection: WebSocket | null = null;

  constructor(config: CellGardenConfig) {
    this.container = config.container;
    this.controlsContainer = config.controlsContainer ?? null;
    this.currentLayout = config.initialLayout ?? LayoutType.FORCE_DIRECTED;

    this.config = {
      width: config.width,
      height: config.height,
      container: config.container,
      controlsContainer: config.controlsContainer ?? null,
      initialLayout: config.initialLayout ?? LayoutType.FORCE_DIRECTED,
      useWebGL: config.useWebGL ?? false,
      enableAnimation: config.enableAnimation ?? true,
      enableControls: config.enableControls ?? true,
      enableTooltip: config.enableTooltip ?? true,
      onNodeClick: config.onNodeClick ?? (() => {}),
      onNodeHover: config.onNodeHover ?? (() => {}),
      onLayoutChange: config.onLayoutChange ?? (() => {}),
    };

    // Create canvas
    this.canvas = this.createCanvas();
    this.container.appendChild(this.canvas);

    // Create renderer
    if (this.config.useWebGL) {
      this.renderer = new WebGLGardenRenderer(this.canvas, {
        width: this.config.width,
        height: this.config.height,
      });
    } else {
      this.renderer = new GardenRenderer(this.canvas, {
        width: this.config.width,
        height: this.config.height,
        showLabels: true,
        showLinks: true,
        animateLinks: true,
        enableGlow: true,
        enableShadows: true,
      });
    }

    // Create controls
    if (this.config.enableControls && this.controlsContainer) {
      this.createControls();
    }

    // Create tooltip
    if (this.config.enableTooltip) {
      this.tooltip = new GardenTooltip();
    }

    // Setup event listeners
    this.setupEventListeners();

    // Initial render
    this.updateLayout();
  }

  /**
   * Create canvas element
   */
  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      width: ${this.config.width}px;
      height: ${this.config.height}px;
      border-radius: 8px;
      cursor: grab;
    `;
    return canvas;
  }

  /**
   * Create controls
   */
  private createControls(): void {
    if (!this.controlsContainer) return;

    const controlsConfig: GardenControlsConfig = {
      onLayoutChange: (layout) => {
        this.currentLayout = layout;
        this.config.onLayoutChange(layout);
        this.updateLayout();
      },
      onFilterChange: (filters) => {
        this.currentFilters = filters;
        this.applyFilters();
      },
      onZoomChange: (zoom) => {
        this.currentZoom = zoom;
        this.applyZoom();
      },
      onExport: (format) => {
        this.exportVisualization(format);
      },
      onReset: () => {
        this.reset();
      },
      availableLayouts: [
        LayoutType.FORCE_DIRECTED,
        LayoutType.CIRCULAR,
        LayoutType.HIERARCHICAL,
        LayoutType.GRID,
        LayoutType.SPATIAL,
      ],
      showExport: true,
      showFilter: true,
      showZoom: true,
    };

    this.controls = new GardenControls(this.controlsContainer, controlsConfig);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Mouse move for hover
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.renderer instanceof GardenRenderer) {
        this.renderer.handleMouseMove(x, y);
        const node = this.renderer.getNodeAt(x, y);

        if (node) {
          const cell = this.cells.get(node.id);
          if (cell && this.tooltip) {
            this.tooltip.show(e.clientX, e.clientY, this.createTooltipContent(cell));
          }
          this.config.onNodeHover(cell ?? null);
        } else {
          if (this.tooltip) {
            this.tooltip.hide();
          }
          this.config.onNodeHover(null);
        }
      }
    });

    // Mouse click for selection
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.renderer instanceof GardenRenderer) {
        const node = this.renderer.handleMouseClick(x, y);
        if (node) {
          const cell = this.cells.get(node.id);
          if (cell) {
            this.config.onNodeClick(cell);
          }
        }
      }
    });

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.resize(width, height);
      }
    });
    resizeObserver.observe(this.container);
  }

  /**
   * Create tooltip content from cell data
   */
  private createTooltipContent(cell: CellData): TooltipContent {
    return {
      id: cell.id,
      type: cell.type,
      state: cell.state,
      position: cell.position,
      activity: cell.activity,
      confidence: cell.confidence,
      lastExecution: cell.lastExecution,
      description: cell.description,
    };
  }

  /**
   * Update cell data
   */
  setCells(cells: CellData[]): void {
    this.cells.clear();
    cells.forEach(cell => {
      this.cells.set(cell.id, cell);
    });
    this.filteredCells = new Set(cells.map(c => c.id));
    this.updateLayout();
  }

  /**
   * Update connections
   */
  setConnections(connections: CellConnection[]): void {
    this.connections = connections;
    this.updateLayout();
  }

  /**
   * Update a single cell
   */
  updateCell(cell: CellData): void {
    this.cells.set(cell.id, cell);
    this.updateLayout();
  }

  /**
   * Add a new cell
   */
  addCell(cell: CellData): void {
    this.cells.set(cell.id, cell);
    this.filteredCells.add(cell.id);
    this.updateLayout();
  }

  /**
   * Remove a cell
   */
  removeCell(cellId: string): void {
    this.cells.delete(cellId);
    this.filteredCells.delete(cellId);
    this.connections = this.connections.filter(
      c => c.source !== cellId && c.target !== cellId
    );
    this.updateLayout();
  }

  /**
   * Update layout algorithm
   */
  private updateLayout(): void {
    const cells = Array.from(this.cells.values()).filter(c =>
      this.filteredCells.has(c.id)
    );

    const nodes: LayoutNode[] = cells.map(cell => ({
      id: cell.id,
      type: cell.type,
      state: cell.state,
      x: 0,
      y: 0,
      radius: this.calculateNodeRadius(cell),
    }));

    const links: LayoutLink[] = this.connections
      .filter(c => this.filteredCells.has(c.source) && this.filteredCells.has(c.target))
      .map(conn => ({
        source: conn.source,
        target: conn.target,
        type: conn.type,
        strength: conn.strength,
      }));

    // Apply layout
    const layout = LayoutFactory.create(this.currentLayout, {
      width: this.config.width,
      height: this.config.height,
      nodeRadius: (n) => n.radius,
    });

    layout.initialize(nodes, links);
    layout.simulate();

    // Update renderer
    if (this.renderer instanceof GardenRenderer) {
      this.renderer.setData(layout.getNodes(), layout.getLinks());
      this.renderer.render();
    } else {
      this.renderer.render(layout.getNodes(), layout.getLinks());
    }
  }

  /**
   * Calculate node radius based on cell properties
   */
  private calculateNodeRadius(cell: CellData): number {
    const baseRadius = 20;
    const activityMultiplier = 1 + cell.activity * 0.5;
    const confidenceMultiplier = 1 + cell.confidence * 0.3;
    return baseRadius * activityMultiplier * confidenceMultiplier;
  }

  /**
   * Apply filters to cells
   */
  private applyFilters(): void {
    this.filteredCells.clear();

    this.cells.forEach((cell, id) => {
      // Type filter
      if (this.currentFilters.types.length > 0 &&
          !this.currentFilters.types.includes(cell.type)) {
        return;
      }

      // State filter
      if (this.currentFilters.states.length > 0 &&
          !this.currentFilters.states.includes(cell.state)) {
        return;
      }

      // Search query filter
      if (this.currentFilters.searchQuery &&
          !id.toLowerCase().includes(this.currentFilters.searchQuery.toLowerCase())) {
        return;
      }

      // Activity filter
      if (cell.activity < this.currentFilters.minActivity ||
          cell.activity > this.currentFilters.maxActivity) {
        return;
      }

      this.filteredCells.add(id);
    });

    this.updateLayout();
  }

  /**
   * Apply zoom to visualization
   */
  private applyZoom(): void {
    this.canvas.style.transform = `scale(${this.currentZoom})`;
    this.canvas.style.transformOrigin = 'center center';
  }

  /**
   * Resize the garden
   */
  resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;

    if (this.renderer instanceof GardenRenderer) {
      this.renderer.updateOptions({ width, height });
    }

    this.updateLayout();
  }

  /**
   * Export visualization as image
   */
  exportVisualization(format: 'png' | 'jpeg'): void {
    if (this.renderer instanceof GardenRenderer) {
      const dataUrl = this.renderer.exportAsImage(format);
      this.downloadImage(dataUrl, `cell-garden.${format}`);
    }
  }

  /**
   * Download image
   */
  private downloadImage(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket(url: string): void {
    this.wsConnection = new WebSocket(url);

    this.wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'cell_update':
            this.updateCell(data.cell);
            break;
          case 'cell_add':
            this.addCell(data.cell);
            break;
          case 'cell_remove':
            this.removeCell(data.cellId);
            break;
          case 'connection_update':
            this.setConnections(data.connections);
            break;
          case 'batch_update':
            this.setCells(data.cells);
            this.setConnections(data.connections);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.wsConnection.onopen = () => {
      console.log('Cell Garden WebSocket connected');
    };

    this.wsConnection.onerror = (error) => {
      console.error('Cell Garden WebSocket error:', error);
    };

    this.wsConnection.onclose = () => {
      console.log('Cell Garden WebSocket disconnected');
    };
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  /**
   * Start animation loop
   */
  startAnimation(): void {
    if (this.config.enableAnimation && this.renderer instanceof GardenRenderer) {
      this.renderer.startAnimation();
    }
  }

  /**
   * Stop animation loop
   */
  stopAnimation(): void {
    if (this.renderer instanceof GardenRenderer) {
      this.renderer.stopAnimation();
    }
  }

  /**
   * Reset visualization
   */
  reset(): void {
    this.currentLayout = LayoutType.FORCE_DIRECTED;
    this.currentFilters = {
      types: [],
      states: [],
      searchQuery: '',
      minActivity: 0,
      maxActivity: 1,
    };
    this.currentZoom = 1;
    this.filteredCells = new Set(this.cells.keys());
    this.updateLayout();
    this.applyZoom();
  }

  /**
   * Get current cells
   */
  getCells(): CellData[] {
    return Array.from(this.cells.values());
  }

  /**
   * Get current connections
   */
  getConnections(): CellConnection[] {
    return [...this.connections];
  }

  /**
   * Get current layout type
   */
  getLayout(): LayoutType {
    return this.currentLayout;
  }

  /**
   * Set layout type
   */
  setLayout(layout: LayoutType): void {
    this.currentLayout = layout;
    this.updateLayout();
    if (this.controls) {
      this.controls.setLayout(layout);
    }
  }

  /**
   * Get current filters
   */
  getFilters(): CellFilters {
    return { ...this.currentFilters };
  }

  /**
   * Set filters
   */
  setFilters(filters: Partial<CellFilters>): void {
    this.currentFilters = { ...this.currentFilters, ...filters };
    this.applyFilters();
    if (this.controls) {
      this.controls.setFilters(this.currentFilters);
    }
  }

  /**
   * Destroy the garden
   */
  destroy(): void {
    this.stopAnimation();
    this.disconnectWebSocket();

    if (this.controls) {
      this.controls.destroy();
    }

    if (this.tooltip) {
      this.tooltip.destroy();
    }

    if (this.renderer instanceof GardenRenderer) {
      this.renderer.destroy();
    } else {
      this.renderer.destroy();
    }

    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

/**
 * Factory function to create a Cell Garden
 */
export function createCellGarden(config: CellGardenConfig): CellGarden {
  return new CellGarden(config);
}
