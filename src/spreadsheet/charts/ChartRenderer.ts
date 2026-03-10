/**
 * POLLN Spreadsheet - ChartRenderer
 *
 * Core chart rendering engine with canvas-based rendering.
 * Supports reactive updates, animations, and export functionality.
 */

import {
  Chart,
  ChartConfig,
  ChartData,
  ChartOptions,
  ChartType,
  ChartArea,
  AxisArea,
  RenderContext,
  ExportFormat,
  ExportOptions,
  ChartPlugin,
  ChartElement,
  InteractionMode,
  InteractionConfig,
  AnimationConfig,
  AnimationEvent,
} from './types.js';
import {
  LineChart,
  AreaChart,
  BarChart,
  PieChart,
  ScatterChart,
  BubbleChart,
  HeatmapChart,
  CandlestickChart,
  RadarChart,
  HistogramChart,
  BoxPlotChart,
  FunnelChart,
  GaugeChart,
  TreemapChart,
  WaterfallChart,
  ChartTypeRenderer,
} from './ChartTypes.js';
import { AxisManager } from './AxisManager.js';
import { LegendManager } from './LegendManager.js';
import { TooltipManager } from './TooltipManager.js';
import { InteractionManager } from './InteractionManager.js';
import { ExportManager } from './ExportManager.js';

/**
 * ChartRenderer - Main chart rendering engine
 *
 * Features:
 * - Canvas-based rendering for performance
 * - Reactive to cell changes
 * - Animated transitions
 * - Export to PNG/SVG/PDF
 * - Interactive tooltips and hover
 * - Responsive sizing
 * - Plugin system for extensibility
 */
export class ChartRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: ChartConfig;
  private chartType: ChartTypeRenderer;

  // Managers
  private axisManager: AxisManager;
  private legendManager: LegendManager;
  private tooltipManager: TooltipManager;
  private interactionManager: InteractionManager;
  private exportManager: ExportManager;

  // Rendering state
  private isAnimating = false;
  private animationFrame: number | null = null;
  private animationProgress = 0;
  private renderContext: RenderContext | null = null;

  // Event handlers
  private eventListeners: Map<string, Array<(event: Event) => void>> = new Map();

  // Resize observer for responsive charts
  private resizeObserver: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement, config: ChartConfig) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = context;
    this.config = config;

    // Initialize managers
    this.axisManager = new AxisManager(this.ctx);
    this.legendManager = new LegendManager(this.ctx);
    this.tooltipManager = new TooltipManager(this.canvas);
    this.interactionManager = new InteractionManager(this.canvas);
    this.exportManager = new ExportManager(this.canvas);

    // Initialize chart type
    this.initializeChartType();

    // Setup canvas
    this.setupCanvas();

    // Setup event listeners
    this.setupEventListeners();

    // Setup resize observer
    this.setupResizeObserver();

    // Initial render
    this.render();
  }

  /**
   * Initialize the chart type renderer
   */
  private initializeChartType(): void {
    switch (this.config.type) {
      case ChartType.LINE:
        this.chartType = new LineChart();
        break;
      case ChartType.BAR:
        this.chartType = new BarChart();
        break;
      case ChartType.PIE:
        this.chartType = new PieChart();
        break;
      case ChartType.SCATTER:
        this.chartType = new ScatterChart();
        break;
      case ChartType.HEATMAP:
        this.chartType = new HeatmapChart();
        break;
      case ChartType.CANDLESTICK:
        this.chartType = new CandlestickChart();
        break;
      case ChartType.AREA:
        this.chartType = new AreaChart();
        break;
      case ChartType.RADAR:
        this.chartType = new RadarChart();
        break;
      case ChartType.HISTOGRAM:
        this.chartType = new HistogramChart();
        break;
      case ChartType.BOX_PLOT:
        this.chartType = new BoxPlotChart();
        break;
      case ChartType.BUBBLE:
        this.chartType = new BubbleChart();
        break;
      case ChartType.FUNNEL:
        this.chartType = new FunnelChart();
        break;
      case ChartType.GAUGE:
        this.chartType = new GaugeChart();
        break;
      case ChartType.TREEMAP:
        this.chartType = new TreemapChart();
        break;
      case ChartType.WATERFALL:
        this.chartType = new WaterfallChart();
        break;
      default:
        throw new Error(`Unsupported chart type: ${this.config.type}`);
    }
  }

  /**
   * Setup canvas with proper scaling
   */
  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    // Set canvas size
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // Scale context for retina displays
    this.ctx.scale(dpr, dpr);

    // Set CSS size
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
  }

  /**
   * Setup event listeners for interactions
   */
  private setupEventListeners(): void {
    // Mouse events
    this.interactionManager.on('click', this.handleClick.bind(this));
    this.interactionManager.on('hover', this.handleHover.bind(this));
    this.interactionManager.on('mouseleave', this.handleMouseLeave.bind(this));

    // Touch events
    this.interactionManager.on('touchstart', this.handleTouchStart.bind(this));
    this.interactionManager.on('touchmove', this.handleTouchMove.bind(this));
    this.interactionManager.on('touchend', this.handleTouchEnd.bind(this));
  }

  /**
   * Setup resize observer for responsive charts
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          this.resize(width, height);
        }
      });

      this.resizeObserver.observe(this.canvas.parentElement!);
    }
  }

  /**
   * Main render method
   */
  public render(): void {
    if (!this.renderContext) {
      this.renderContext = this.buildRenderContext();
    }

    const { options } = this.config;
    const animation = options.animation;

    if (animation && animation.duration > 0) {
      this.animate();
    } else {
      this.draw();
    }
  }

  /**
   * Build render context
   */
  private buildRenderContext(): RenderContext {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Calculate chart area
    const padding = this.calculatePadding();
    const chartArea: ChartArea = {
      top: padding.top,
      left: padding.left,
      right: rect.width - padding.right,
      bottom: rect.height - padding.bottom,
      width: rect.width - padding.left - padding.right,
      height: rect.height - padding.top - padding.bottom,
    };

    // Calculate axis areas
    const xAxisArea: AxisArea = {
      top: chartArea.bottom,
      left: chartArea.left,
      right: chartArea.right,
      bottom: rect.height - padding.bottom,
      width: chartArea.width,
      height: padding.bottom,
    };

    const yAxisArea: AxisArea = {
      top: chartArea.top,
      left: padding.left,
      right: chartArea.left,
      bottom: chartArea.bottom,
      width: padding.left,
      height: chartArea.height,
    };

    return {
      canvas: this.canvas,
      ctx: this.ctx,
      width: rect.width,
      height: rect.height,
      pixelRatio: dpr,
      chartArea,
      xAxisArea,
      yAxisArea,
      data: this.config.data,
    };
  }

  /**
   * Calculate padding based on legend and axes
   */
  private calculatePadding(): { top: number; right: number; bottom: number; left: number } {
    const { options } = this.config;
    const defaultPadding = { top: 20, right: 20, bottom: 40, left: 60 };

    if (typeof options.padding === 'number') {
      return {
        top: options.padding,
        right: options.padding,
        bottom: options.padding,
        left: options.padding,
      };
    }

    if (typeof options.padding === 'object') {
      return {
        top: options.padding.top ?? defaultPadding.top,
        right: options.padding.right ?? defaultPadding.right,
        bottom: options.padding.bottom ?? defaultPadding.bottom,
        left: options.padding.left ?? defaultPadding.left,
      };
    }

    return defaultPadding;
  }

  /**
   * Draw the chart
   */
  private draw(): void {
    if (!this.renderContext) return;

    const { ctx } = this.renderContext;

    // Clear canvas
    ctx.clearRect(0, 0, this.renderContext.width, this.renderContext.height);

    // Draw background
    this.drawBackground();

    // Draw axes
    this.axisManager.drawAxes(this.renderContext, this.config.options);

    // Draw grid
    this.axisManager.drawGrid(this.renderContext, this.config.options);

    // Draw chart type
    this.chartType.render(this.renderContext, this.config.data, this.config.options);

    // Draw legend
    this.legendManager.drawLegend(
      this.renderContext,
      this.config.data,
      this.config.options
    );

    // Draw title
    this.drawTitle();
  }

  /**
   * Draw background
   */
  private drawBackground(): void {
    if (!this.renderContext) return;

    const { ctx, width, height } = this.renderContext;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /**
   * Draw title
   */
  private drawTitle(): void {
    if (!this.renderContext) return;

    const { options } = this.config;
    const { title } = options;

    if (!title || !title.display || !title.text) return;

    const { ctx, width, chartArea } = this.renderContext;

    ctx.save();
    ctx.fillStyle = title.color ?? '#333';
    ctx.font = `${title.font?.weight ?? 'bold'} ${title.font?.size ?? 16}px ${title.font?.family ?? 'Arial'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const titleText = Array.isArray(title.text) ? title.text.join('\n') : title.text;
    const y = title.padding ?? 10;

    ctx.fillText(titleText, width / 2, y);
    ctx.restore();
  }

  /**
   * Animate the chart
   */
  private animate(): void {
    if (this.isAnimating) return;

    this.isAnimating = true;
    this.animationProgress = 0;

    const { options } = this.config;
    const animation = options.animation!;
    const duration = animation.duration ?? 1000;
    const startTime = performance.now();

    const animateFrame = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      this.animationProgress = Math.min(elapsed / duration, 1);

      // Apply easing
      const easedProgress = this.applyEasing(this.animationProgress, animation.easing ?? 'easeInOutQuad');

      // Update animation
      if (animation.onProgress) {
        animation.onProgress({
          chart: this as any,
          currentStep: Math.floor(easedProgress * 100),
          numSteps: 100,
          initial: this.animationProgress === 0,
          duration,
        } as AnimationEvent);
      }

      // Draw with animation progress
      this.draw();

      if (this.animationProgress < 1) {
        this.animationFrame = requestAnimationFrame(animateFrame);
      } else {
        this.isAnimating = false;

        if (animation.onComplete) {
          animation.onComplete({
            chart: this as any,
            currentStep: 100,
            numSteps: 100,
            initial: false,
            duration,
          } as AnimationEvent);
        }
      }
    };

    this.animationFrame = requestAnimationFrame(animateFrame);
  }

  /**
   * Apply easing function
   */
  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'linear':
        return t;
      case 'easeInQuad':
        return t * t;
      case 'easeOutQuad':
        return t * (2 - t);
      case 'easeInOutQuad':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'easeInCubic':
        return t * t * t;
      case 'easeOutCubic':
        return --t * t * t + 1;
      case 'easeInOutCubic':
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      default:
        return t;
    }
  }

  /**
   * Update chart with new data
   */
  public update(newData?: ChartData): void {
    if (newData) {
      this.config.data = newData;
    }

    // Rebuild render context
    this.renderContext = this.buildRenderContext();

    // Re-render
    this.render();
  }

  /**
   * Update chart options
   */
  public updateOptions(newOptions: Partial<ChartOptions>): void {
    this.config.options = { ...this.config.options, ...newOptions };

    // Rebuild render context
    this.renderContext = this.buildRenderContext();

    // Re-render
    this.render();
  }

  /**
   * Resize chart
   */
  public resize(width?: number, height?: number): void {
    if (width !== undefined && height !== undefined) {
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;

      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;

      this.ctx.scale(dpr, dpr);
    }

    // Rebuild render context
    this.renderContext = this.buildRenderContext();

    // Re-render
    this.render();
  }

  /**
   * Export chart
   */
  public async exportChart(options: ExportOptions): Promise<Blob> {
    return this.exportManager.export(options);
  }

  /**
   * Destroy chart and cleanup
   */
  public destroy(): void {
    // Cancel animation
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }

    // Remove event listeners
    this.interactionManager.destroy();

    // Remove resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Destroy chart type
    this.chartType.destroy();

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Get chart instance
   */
  public getChart(): Chart {
    return {
      id: this.config.id ?? 'chart',
      config: this.config,
      canvas: this.canvas,
      ctx: this.ctx,
      data: this.config.data,
      options: this.config.options,
      render: this.render.bind(this),
      update: this.update.bind(this),
      resize: this.resize.bind(this),
      destroy: this.destroy.bind(this),
      getDatasetMeta: (index: number) => ({
        type: this.config.type,
        index,
        order: index,
        label: this.config.data.datasets[index]?.label ?? '',
        visible: !this.config.data.datasets[index]?.hidden,
        data: this.config.data.datasets[index]?.data ?? [],
        x: this.config.data.datasets[index]?.data.map(d => Number(d.x)) ?? [],
        y: this.config.data.datasets[index]?.data.map(d => d.y) ?? [],
        _dataset: this.config.data.datasets[index]!,
      }),
      getElementsAtEventForMode: (e: Event, mode: InteractionMode, options: InteractionConfig) => {
        return this.chartType.getElementsAtEvent(this.renderContext!, e as MouseEvent, mode);
      },
      setDatasetVisibility: (datasetIndex: number, visible: boolean) => {
        this.config.data.datasets[datasetIndex].hidden = !visible;
        this.update();
      },
      toggleDataVisibility: (index: number) => {
        // Implementation for toggling specific data points
        this.update();
      },
      getDataVisibility: (index: number) => {
        return !this.config.data.datasets[0]?.hidden;
      },
    };
  }

  /**
   * Handle click events
   */
  private handleClick(event: MouseEvent): void {
    const elements = this.chartType.getElementsAtEvent(
      this.renderContext!,
      event,
      InteractionMode.CLICK
    );

    if (elements.length > 0) {
      this.tooltipManager.showTooltip(event, elements, this.config.data, this.config.options);
    }
  }

  /**
   * Handle hover events
   */
  private handleHover(event: MouseEvent): void {
    const elements = this.chartType.getElementsAtEvent(
      this.renderContext!,
      event,
      InteractionMode.HOVER
    );

    if (elements.length > 0) {
      this.tooltipManager.showTooltip(event, elements, this.config.data, this.config.options);
      this.canvas.style.cursor = 'pointer';
    } else {
      this.tooltipManager.hideTooltip();
      this.canvas.style.cursor = 'default';
    }
  }

  /**
   * Handle mouse leave events
   */
  private handleMouseLeave(event: MouseEvent): void {
    this.tooltipManager.hideTooltip();
  }

  /**
   * Handle touch start events
   */
  private handleTouchStart(event: TouchEvent): void {
    // Handle touch interactions
  }

  /**
   * Handle touch move events
   */
  private handleTouchMove(event: TouchEvent): void {
    // Handle touch interactions
  }

  /**
   * Handle touch end events
   */
  private handleTouchEnd(event: TouchEvent): void {
    // Handle touch interactions
  }

  /**
   * Register event listener
   */
  public on(event: string, handler: (event: Event) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  /**
   * Unregister event listener
   */
  public off(event: string, handler: (event: Event) => void): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}

/**
 * Render a chart with the given configuration
 */
export function renderChart(container: HTMLElement, config: ChartConfig): ChartRenderer {
  const canvas = document.createElement('canvas');
  canvas.className = config.className ?? 'polln-chart';
  container.appendChild(canvas);

  return new ChartRenderer(canvas, config);
}

/**
 * Update an existing chart with new data
 */
export function updateChart(renderer: ChartRenderer, newData: ChartData): void {
  renderer.update(newData);
}

/**
 * Export a chart to the specified format
 */
export async function exportChart(
  renderer: ChartRenderer,
  format: ExportFormat,
  options?: Partial<ExportOptions>
): Promise<Blob> {
  return renderer.exportChart({
    format,
    ...options,
  });
}

/**
 * Destroy a chart and cleanup resources
 */
export function destroyChart(renderer: ChartRenderer): void {
  renderer.destroy();
}
