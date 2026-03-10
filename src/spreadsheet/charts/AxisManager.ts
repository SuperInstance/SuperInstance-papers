/**
 * POLLN Spreadsheet - AxisManager
 *
 * Manages chart axes including linear, logarithmic, time, and category scales.
 * Supports multiple axes (primary and secondary Y-axis).
 */

import {
  RenderContext,
  ChartOptions,
  ChartData,
  AxisConfig,
  AxisType,
  ChartPosition,
} from './types.js';

/**
 * Axis scale interface
 */
interface AxisScale {
  min: number;
  max: number;
  range: number;
  scale(value: number): number;
  invert(value: number): number;
  ticks(): number[];
  format(value: number): string;
}

/**
 * Linear axis scale
 */
class LinearScale implements AxisScale {
  constructor(
    private dataMin: number,
    private dataMax: number,
    private nice: boolean = true
  ) {
    if (this.nice) {
      const niceRange = this.niceScale(dataMin, dataMax);
      this.min = niceRange.min;
      this.max = niceRange.max;
    } else {
      this.min = dataMin;
      this.max = dataMax;
    }
  }

  min: number;
  max: number;
  get range(): number {
    return this.max - this.min;
  }

  scale(value: number): number {
    return (value - this.min) / this.range;
  }

  invert(value: number): number {
    return this.min + value * this.range;
  }

  ticks(): number[] {
    const step = this.calculateStepSize();
    const ticks: number[] = [];

    for (let tick = Math.ceil(this.min / step) * step; tick <= this.max; tick += step) {
      ticks.push(tick);
    }

    return ticks;
  }

  format(value: number): string {
    return value.toLocaleString();
  }

  private calculateStepSize(): number {
    const roughStep = this.range / 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalizedStep = roughStep / magnitude;

    let step: number;
    if (normalizedStep < 1.5) {
      step = 1 * magnitude;
    } else if (normalizedStep < 3.5) {
      step = 2 * magnitude;
    } else if (normalizedStep < 7.5) {
      step = 5 * magnitude;
    } else {
      step = 10 * magnitude;
    }

    return step;
  }

  private niceScale(min: number, max: number): { min: number; max: number } {
    const range = max - min;
    const roughStep = range / 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalizedStep = roughStep / magnitude;

    let step: number;
    if (normalizedStep < 1.5) {
      step = 1 * magnitude;
    } else if (normalizedStep < 3.5) {
      step = 2 * magnitude;
    } else if (normalizedStep < 7.5) {
      step = 5 * magnitude;
    } else {
      step = 10 * magnitude;
    }

    const niceMin = Math.floor(min / step) * step;
    const niceMax = Math.ceil(max / step) * step;

    return { min: niceMin, max: niceMax };
  }
}

/**
 * Logarithmic axis scale
 */
class LogarithmicScale implements AxisScale {
  constructor(private dataMin: number, private dataMax: number) {
    this.min = dataMin > 0 ? dataMin : 0.1;
    this.max = dataMax;
  }

  min: number;
  max: number;
  get range(): number {
    return Math.log10(this.max) - Math.log10(this.min);
  }

  scale(value: number): number {
    if (value <= 0) return 0;
    return (Math.log10(value) - Math.log10(this.min)) / this.range;
  }

  invert(value: number): number {
    return this.min * Math.pow(10, value * this.range);
  }

  ticks(): number[] {
    const ticks: number[] = [];
    const minExp = Math.floor(Math.log10(this.min));
    const maxExp = Math.ceil(Math.log10(this.max));

    for (let exp = minExp; exp <= maxExp; exp++) {
      for (let i = 1; i <= 9; i++) {
        const tick = i * Math.pow(10, exp);
        if (tick >= this.min && tick <= this.max) {
          ticks.push(tick);
        }
      }
    }

    return ticks;
  }

  format(value: number): string {
    return value.toExponential(1);
  }
}

/**
 * Time axis scale
 */
class TimeScale implements AxisScale {
  constructor(private dataMin: Date, private dataMax: Date) {
    this.min = dataMin.getTime();
    this.max = dataMax.getTime();
  }

  min: number;
  max: number;
  get range(): number {
    return this.max - this.min;
  }

  scale(value: number): number {
    return (value - this.min) / this.range;
  }

  invert(value: number): number {
    return this.min + value * this.range;
  }

  ticks(): number[] {
    const ticks: number[] = [];
    const duration = this.range;
    const millisecondsPerDay = 24 * 60 * 60 * 1000;

    let stepSize: number;
    if (duration > millisecondsPerDay * 365) {
      stepSize = millisecondsPerDay * 30; // Monthly
    } else if (duration > millisecondsPerDay * 30) {
      stepSize = millisecondsPerDay * 7; // Weekly
    } else if (duration > millisecondsPerDay) {
      stepSize = millisecondsPerDay; // Daily
    } else if (duration > 60 * 60 * 1000) {
      stepSize = 60 * 60 * 1000; // Hourly
    } else {
      stepSize = 60 * 1000; // Minutely
    }

    for (let tick = Math.ceil(this.min / stepSize) * stepSize; tick <= this.max; tick += stepSize) {
      ticks.push(tick);
    }

    return ticks;
  }

  format(value: number): string {
    const date = new Date(value);
    const duration = this.range;
    const millisecondsPerDay = 24 * 60 * 60 * 1000;

    if (duration > millisecondsPerDay * 365) {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } else if (duration > millisecondsPerDay) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  }
}

/**
 * Category axis scale
 */
class CategoryScale implements AxisScale {
  private categories: string[];

  constructor(categories: string[]) {
    this.categories = categories;
    this.min = 0;
    this.max = categories.length - 1;
  }

  min: number;
  max: number;
  get range(): number {
    return this.max - this.min;
  }

  scale(value: number): number {
    const index = this.categories.indexOf(String(value));
    return index >= 0 ? index / this.categories.length : 0;
  }

  invert(value: number): number {
    return Math.round(value * this.categories.length);
  }

  ticks(): number[] {
    return this.categories.map((_, index) => index);
  }

  format(value: number): string {
    const index = Math.round(value);
    return this.categories[index] ?? '';
  }
}

/**
 * AxisManager - Manages chart axes
 */
export class AxisManager {
  private ctx: CanvasRenderingContext2D;
  private scales: Map<string, AxisScale> = new Map();

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Draw all axes
   */
  public drawAxes(renderContext: RenderContext, options: ChartOptions): void {
    const { xAxis, yAxis, secondaryYAxis, xAxes, yAxes, scales } = options;

    // Draw primary X axis
    if (xAxis) {
      this.drawAxis(renderContext, xAxis, 'x');
    }

    // Draw primary Y axis
    if (yAxis) {
      this.drawAxis(renderContext, yAxis, 'y');
    }

    // Draw secondary Y axis
    if (secondaryYAxis) {
      this.drawAxis(renderContext, secondaryYAxis, 'y-secondary');
    }

    // Draw multiple X axes
    if (xAxes) {
      xAxes.forEach((axis, index) => {
        this.drawAxis(renderContext, axis, `x-${index}`);
      });
    }

    // Draw multiple Y axes
    if (yAxes) {
      yAxes.forEach((axis, index) => {
        this.drawAxis(renderContext, axis, `y-${index}`);
      });
    }

    // Draw custom scales
    if (scales) {
      Object.entries(scales).forEach(([key, axis]) => {
        this.drawAxis(renderContext, axis, key);
      });
    }
  }

  /**
   * Draw a single axis
   */
  private drawAxis(renderContext: RenderContext, axisConfig: AxisConfig, axisId: string): void {
    if (axisConfig.display === false) return;

    const { chartArea, xAxisArea, yAxisArea, secondaryYAxisArea } = renderContext;
    const isXAxis = axisConfig.position === ChartPosition.TOP || axisConfig.position === ChartPosition.BOTTOM;
    const isSecondaryY = axisId === 'y-secondary';

    let axisArea: typeof xAxisArea;
    if (isXAxis) {
      axisArea = xAxisArea;
    } else if (isSecondaryY && secondaryYAxisArea) {
      axisArea = secondaryYAxisArea;
    } else {
      axisArea = yAxisArea;
    }

    // Create scale
    const scale = this.createScale(axisConfig, renderContext);
    this.scales.set(axisId, scale);

    // Draw axis line
    this.drawAxisLine(axisArea, axisConfig, isXAxis);

    // Draw ticks
    this.drawTicks(axisArea, axisConfig, scale, isXAxis);

    // Draw title
    this.drawAxisTitle(axisArea, axisConfig, isXAxis);
  }

  /**
   * Create scale based on axis type
   */
  private createScale(axisConfig: AxisConfig, renderContext: RenderContext): AxisScale {
    const { type } = axisConfig;
    const { data } = renderContext;

    let dataMin: number | Date = axisConfig.min ?? 0;
    let dataMax: number | Date = axisConfig.max ?? 100;

    // Extract data range
    if (type === AxisType.CATEGORY) {
      const categories = data.labels ?? [];
      return new CategoryScale(categories);
    }

    if (type === AxisType.TIME) {
      // Find min/max dates from data
      data.datasets.forEach(dataset => {
        dataset.data.forEach(point => {
          const value = point.x instanceof Date ? point.x : new Date(point.x);
          if (!dataMin || value < dataMin) dataMin = value;
          if (!dataMax || value > dataMax) dataMax = value;
        });
      });

      return new TimeScale(dataMin as Date, dataMax as Date);
    }

    // Find min/max values from data
    data.datasets.forEach(dataset => {
      dataset.data.forEach(point => {
        const value = typeof point.x === 'number' ? point.x : point.y;
        if (value < (dataMin as number)) dataMin = value;
        if (value > (dataMax as number)) dataMax = value;
      });
    });

    switch (type) {
      case AxisType.LOGARITHMIC:
        return new LogarithmicScale(dataMin as number, dataMax as number);
      case AxisType.LINEAR:
      default:
        return new LinearScale(dataMin as number, dataMax as number);
    }
  }

  /**
   * Draw axis line
   */
  private drawAxisLine(
    axisArea: any,
    axisConfig: AxisConfig,
    isXAxis: boolean
  ): void {
    this.ctx.save();
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    if (isXAxis) {
      this.ctx.moveTo(axisArea.left, axisArea.top);
      this.ctx.lineTo(axisArea.right, axisArea.top);
    } else {
      this.ctx.moveTo(axisArea.right, axisArea.top);
      this.ctx.lineTo(axisArea.right, axisArea.bottom);
    }
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Draw ticks
   */
  private drawTicks(
    axisArea: any,
    axisConfig: AxisConfig,
    scale: AxisScale,
    isXAxis: boolean
  ): void {
    const ticks = scale.ticks();
    const { chartArea } = axisArea;

    this.ctx.save();
    this.ctx.fillStyle = axisConfig.ticks?.color ?? '#666';
    this.ctx.font = `${axisConfig.ticks?.font?.weight ?? 'normal'} ${axisConfig.ticks?.font?.size ?? 12}px ${axisConfig.ticks?.font?.family ?? 'Arial'}`;
    this.ctx.textAlign = isXAxis ? 'center' : 'right';
    this.ctx.textBaseline = isXAxis ? 'top' : 'middle';

    const tickLength = 5;
    const padding = axisConfig.ticks?.padding ?? 5;

    ticks.forEach((tick, index) => {
      const normalizedValue = scale.scale(tick);

      if (isXAxis) {
        const x = chartArea.left + normalizedValue * chartArea.width;
        const y = axisArea.top;

        // Draw tick mark
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, y + tickLength);
        this.ctx.stroke();

        // Draw tick label
        const label = axisConfig.ticks?.callback
          ? axisConfig.ticks.callback(tick, index, ticks)
          : scale.format(tick);

        this.ctx.fillText(label, x, y + tickLength + padding);
      } else {
        const x = axisArea.right;
        const y = chartArea.bottom - normalizedValue * chartArea.height;

        // Draw tick mark
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x - tickLength, y);
        this.ctx.stroke();

        // Draw tick label
        const label = axisConfig.ticks?.callback
          ? axisConfig.ticks.callback(tick, index, ticks)
          : scale.format(tick);

        this.ctx.fillText(label, x - tickLength - padding, y);
      }
    });

    this.ctx.restore();
  }

  /**
   * Draw axis title
   */
  private drawAxisTitle(
    axisArea: any,
    axisConfig: AxisConfig,
    isXAxis: boolean
  ): void {
    if (!axisConfig.title || !axisConfig.scaleLabel?.display) return;

    const title = axisConfig.title ?? axisConfig.scaleLabel.labelString;

    this.ctx.save();
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 14px Arial';

    if (isXAxis) {
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'bottom';
      this.ctx.fillText(title, (axisArea.left + axisArea.right) / 2, axisArea.bottom - 5);
    } else {
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.translate(axisArea.left + 15, (axisArea.top + axisArea.bottom) / 2);
      this.ctx.rotate(-Math.PI / 2);
      this.ctx.fillText(title, 0, 0);
    }

    this.ctx.restore();
  }

  /**
   * Draw grid lines
   */
  public drawGrid(renderContext: RenderContext, options: ChartOptions): void {
    const { chartArea } = renderContext;
    const { xAxis, yAxis, secondaryYAxis } = options;

    this.ctx.save();

    // Draw X grid
    if (xAxis?.grid?.display !== false) {
      this.drawGridLines(renderContext, xAxis, 'x');
    }

    // Draw Y grid
    if (yAxis?.grid?.display !== false) {
      this.drawGridLines(renderContext, yAxis, 'y');
    }

    // Draw secondary Y grid
    if (secondaryYAxis?.grid?.display !== false) {
      this.drawGridLines(renderContext, secondaryYAxis, 'y-secondary');
    }

    this.ctx.restore();
  }

  /**
   * Draw grid lines for an axis
   */
  private drawGridLines(renderContext: RenderContext, axisConfig: AxisConfig | undefined, axisId: string): void {
    if (!axisConfig) return;

    const scale = this.scales.get(axisId);
    if (!scale) return;

    const { chartArea } = renderContext;
    const ticks = scale.ticks();
    const isXAxis = axisId.startsWith('x');

    this.ctx.strokeStyle = axisConfig.grid?.color ?? '#e0e0e0';
    this.ctx.lineWidth = axisConfig.grid?.borderWidth ?? 1;
    this.ctx.setLineDash(axisConfig.grid?.borderDash ?? []);

    ticks.forEach(tick => {
      const normalizedValue = scale.scale(tick);

      this.ctx.beginPath();
      if (isXAxis) {
        const x = chartArea.left + normalizedValue * chartArea.width;
        this.ctx.moveTo(x, chartArea.top);
        this.ctx.lineTo(x, chartArea.bottom);
      } else {
        const y = chartArea.bottom - normalizedValue * chartArea.height;
        this.ctx.moveTo(chartArea.left, y);
        this.ctx.lineTo(chartArea.right, y);
      }
      this.ctx.stroke();
    });

    this.ctx.setLineDash([]);
  }

  /**
   * Get scale for an axis
   */
  public getScale(axisId: string): AxisScale | undefined {
    return this.scales.get(axisId);
  }

  /**
   * Convert value to pixel position
   */
  public valueToPixel(value: number, axisId: string, renderContext: RenderContext): number {
    const scale = this.scales.get(axisId);
    if (!scale) return 0;

    const normalizedValue = scale.scale(value);
    const isXAxis = axisId.startsWith('x');
    const { chartArea } = renderContext;

    if (isXAxis) {
      return chartArea.left + normalizedValue * chartArea.width;
    } else {
      return chartArea.bottom - normalizedValue * chartArea.height;
    }
  }

  /**
   * Convert pixel position to value
   */
  public pixelToValue(pixel: number, axisId: string, renderContext: RenderContext): number {
    const scale = this.scales.get(axisId);
    if (!scale) return 0;

    const isXAxis = axisId.startsWith('x');
    const { chartArea } = renderContext;

    let normalizedValue: number;
    if (isXAxis) {
      normalizedValue = (pixel - chartArea.left) / chartArea.width;
    } else {
      normalizedValue = (chartArea.bottom - pixel) / chartArea.height;
    }

    return scale.invert(normalizedValue);
  }
}
