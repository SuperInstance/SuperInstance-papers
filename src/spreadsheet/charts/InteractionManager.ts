/**
 * POLLN Spreadsheet - InteractionManager
 *
 * Manages user interactions with charts including click, hover, zoom, pan, and selection.
 * Supports touch events and cross-filtering between charts.
 */

import {
  ChartElement,
  InteractionMode,
  InteractionConfig,
  ChartEvent,
  ChartEventHandler,
  ChartEventMap,
} from './types.js';

/**
 * Interaction state
 */
interface InteractionState {
  isDragging: boolean;
  isZooming: boolean;
  isPanning: boolean;
  isSelecting: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  selectionStart: { x: number; y: number } | null;
  selectionEnd: { x: number; y: number } | null;
}

/**
 * Selection area
 */
interface SelectionArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * InteractionManager - Manages chart interactions
 */
export class InteractionManager {
  private canvas: HTMLCanvasElement;
  private eventHandlers: ChartEventMap = new Map();
  private currentState: InteractionState = {
    isDragging: false,
    isZooming: false,
    isPanning: false,
    isSelecting: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    selectionStart: null,
    selectionEnd: null,
  };
  private currentMode: InteractionMode = InteractionMode.HOVER;
  private hoverElement: ChartElement | null = null;
  private selectedElements: ChartElement[] = [];
  private selectionArea: SelectionArea | null = null;

  // Cross-filtering callbacks
  private onFilterCallback?: (filter: SelectionArea) => void;
  private onSelectionCallback?: (elements: ChartElement[]) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));

    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Wheel events for zoom
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * Handle click events
   */
  private handleClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.emit('click', event);

    if (this.currentMode === InteractionMode.SELECT) {
      // Handle selection click
    }
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Handle dragging/panning
    if (this.currentState.isPanning) {
      const deltaX = x - this.currentState.lastX;
      const deltaY = y - this.currentState.lastY;

      this.emit('pan', {
        ...event,
        deltaX,
        deltaY,
      } as any);

      this.currentState.lastX = x;
      this.currentState.lastY = y;
      return;
    }

    // Handle selection
    if (this.currentState.isSelecting) {
      this.currentState.selectionEnd = { x, y };
      this.updateSelectionArea();
      this.emit('brush', event);
      return;
    }

    // Handle hover
    if (this.currentMode === InteractionMode.HOVER || this.currentMode === InteractionMode.NONE) {
      this.emit('hover', event);
    }
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.currentState.startX = x;
    this.currentState.startY = y;
    this.currentState.lastX = x;
    this.currentState.lastY = y;

    // Check for middle mouse button (pan) or shift key (brush)
    if (event.button === 1 || event.shiftKey) {
      this.currentState.isPanning = true;
      this.canvas.style.cursor = 'grabbing';
    } else if (this.currentMode === InteractionMode.BRUSH) {
      this.currentState.isSelecting = true;
      this.currentState.selectionStart = { x, y };
      this.currentState.selectionEnd = { x, y };
    } else if (this.currentMode === InteractionMode.ZOOM && event.button === 0) {
      this.currentState.isZooming = true;
      this.currentState.selectionStart = { x, y };
      this.currentState.selectionEnd = { x, y };
    }
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(event: MouseEvent): void {
    if (this.currentState.isPanning) {
      this.currentState.isPanning = false;
      this.canvas.style.cursor = 'default';
    }

    if (this.currentState.isSelecting) {
      this.currentState.isSelecting = false;
      this.completeSelection();
    }

    if (this.currentState.isZooming) {
      this.currentState.isZooming = false;
      this.completeZoom();
    }
  }

  /**
   * Handle mouse leave events
   */
  private handleMouseLeave(event: MouseEvent): void {
    this.emit('mouseleave', event);
    this.hoverElement = null;
  }

  /**
   * Handle double click events
   */
  private handleDoubleClick(event: MouseEvent): void {
    this.emit('dblclick', event);

    // Reset zoom on double click
    this.emit('resetZoom', event);
  }

  /**
   * Handle touch start events
   */
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    this.emit('touchstart', event);

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      this.currentState.startX = x;
      this.currentState.startY = y;
      this.currentState.lastX = x;
      this.currentState.lastY = y;
      this.currentState.isDragging = true;
    }
  }

  /**
   * Handle touch move events
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    this.emit('touchmove', event);

    if (event.touches.length === 1 && this.currentState.isDragging) {
      const touch = event.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const deltaX = x - this.currentState.lastX;
      const deltaY = y - this.currentState.lastY;

      this.emit('pan', {
        ...event,
        deltaX,
        deltaY,
      } as any);

      this.currentState.lastX = x;
      this.currentState.lastY = y;
    }
  }

  /**
   * Handle touch end events
   */
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    this.emit('touchend', event);
    this.currentState.isDragging = false;
  }

  /**
   * Handle wheel events for zooming
   */
  private handleWheel(event: WheelEvent): void {
    event.preventDefault();

    if (this.currentMode === InteractionMode.ZOOM) {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;

      this.emit('zoom', {
        ...event,
        x,
        y,
        zoomFactor,
      } as any);
    }
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        this.clearSelection();
        break;
      case 'a':
      case 'A':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.selectAll();
        }
        break;
      case 'r':
      case 'R':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.emit('resetZoom', event as any);
        }
        break;
    }
  }

  /**
   * Update selection area
   */
  private updateSelectionArea(): void {
    if (!this.currentState.selectionStart || !this.currentState.selectionEnd) return;

    const start = this.currentState.selectionStart;
    const end = this.currentState.selectionEnd;

    this.selectionArea = {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  }

  /**
   * Complete selection
   */
  private completeSelection(): void {
    if (this.selectionArea && this.onSelectionCallback) {
      // Find elements within selection area
      const selectedElements = this.findElementsInArea(this.selectionArea);
      this.selectedElements = selectedElements;
      this.onSelectionCallback(selectedElements);
    }
  }

  /**
   * Complete zoom
   */
  private completeZoom(): void {
    if (!this.currentState.selectionStart || !this.currentState.selectionEnd) return;

    const start = this.currentState.selectionStart;
    const end = this.currentState.selectionEnd;

    const zoomArea = {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };

    this.emit('zoom', {
      type: 'zoom',
      target: this.canvas,
      ...zoomArea,
    } as any);
  }

  /**
   * Find elements within selection area
   */
  private findElementsInArea(area: SelectionArea): ChartElement[] {
    // This would be called by the chart renderer with actual elements
    return [];
  }

  /**
   * Select all elements
   */
  private selectAll(): void {
    this.emit('selectAll', new Event('selectAll'));
  }

  /**
   * Clear selection
   */
  public clearSelection(): void {
    this.selectedElements = [];
    this.selectionArea = null;
    this.currentState.selectionStart = null;
    this.currentState.selectionEnd = null;
    this.emit('clearSelection', new Event('clearSelection'));
  }

  /**
   * Set interaction mode
   */
  public setMode(mode: InteractionMode): void {
    this.currentMode = mode;

    // Update cursor
    switch (mode) {
      case InteractionMode.PAN:
        this.canvas.style.cursor = 'grab';
        break;
      case InteractionMode.ZOOM:
        this.canvas.style.cursor = 'zoom-in';
        break;
      case InteractionMode.BRUSH:
      case InteractionMode.SELECT:
        this.canvas.style.cursor = 'crosshair';
        break;
      default:
        this.canvas.style.cursor = 'default';
    }
  }

  /**
   * Get current mode
   */
  public getMode(): InteractionMode {
    return this.currentMode;
  }

  /**
   * Get selected elements
   */
  public getSelectedElements(): ChartElement[] {
    return this.selectedElements;
  }

  /**
   * Get selection area
   */
  public getSelectionArea(): SelectionArea | null {
    return this.selectionArea;
  }

  /**
   * Register event handler
   */
  public on(event: string, handler: ChartEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Unregister event handler
   */
  public off(event: string, handler: ChartEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all handlers
   */
  private emit(event: string, data: Event): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data, data as any);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Set filter callback for cross-filtering
   */
  public setFilterCallback(callback: (filter: SelectionArea) => void): void {
    this.onFilterCallback = callback;
  }

  /**
   * Set selection callback
   */
  public setSelectionCallback(callback: (elements: ChartElement[]) => void): void {
    this.onSelectionCallback = callback;
  }

  /**
   * Apply cross-filter to other charts
   */
  public applyFilter(filter: SelectionArea): void {
    if (this.onFilterCallback) {
      this.onFilterCallback(filter);
    }
  }

  /**
   * Draw selection area overlay
   */
  public drawSelection(ctx: CanvasRenderingContext2D): void {
    if (!this.selectionArea) return;

    const { x, y, width, height } = this.selectionArea;

    ctx.save();
    ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
    ctx.strokeStyle = 'rgba(33, 150, 243, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    ctx.restore();
  }

  /**
   * Destroy and cleanup
   */
  public destroy(): void {
    // Remove event listeners
    this.canvas.removeEventListener('click', this.handleClick.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.removeEventListener('dblclick', this.handleDoubleClick.bind(this));
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener('wheel', this.handleWheel.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));

    // Clear state
    this.eventHandlers.clear();
    this.selectedElements = [];
    this.selectionArea = null;
    this.hoverElement = null;
  }
}

/**
 * Interaction helper functions
 */
export class InteractionHelpers {
  /**
   * Calculate distance between two points
   */
  static distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  /**
   * Check if point is inside rectangle
   */
  static pointInRect(
    px: number,
    py: number,
    rx: number,
    ry: number,
    rw: number,
    rh: number
  ): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  /**
   * Check if point is inside circle
   */
  static pointInCircle(
    px: number,
    py: number,
    cx: number,
    cy: number,
    radius: number
  ): boolean {
    return InteractionHelpers.distance(px, py, cx, cy) <= radius;
  }

  /**
   * Find nearest element to point
   */
  static findNearestElement(
    x: number,
    y: number,
    elements: ChartElement[],
    maxDistance: number = 10
  ): ChartElement | null {
    let nearest: ChartElement | null = null;
    let minDistance = maxDistance;

    elements.forEach(element => {
      const center = element.getCenterPoint();
      const distance = InteractionHelpers.distance(x, y, center.x, center.y);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = element;
      }
    });

    return nearest;
  }

  /**
   * Find elements within radius
   */
  static findElementsWithinRadius(
    x: number,
    y: number,
    radius: number,
    elements: ChartElement[]
  ): ChartElement[] {
    return elements.filter(element => {
      const center = element.getCenterPoint();
      return InteractionHelpers.distance(x, y, center.x, center.y) <= radius;
    });
  }
}
