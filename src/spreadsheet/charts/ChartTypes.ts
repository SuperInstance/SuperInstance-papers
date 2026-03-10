/**
 * POLLN Spreadsheet - Chart Type Implementations
 *
 * Concrete implementations of various chart types.
 * Each chart type implements the rendering logic specific to its visualization.
 */

import {
  RenderContext,
  ChartData,
  ChartOptions,
  ChartType,
  ChartElement,
  DataPoint,
  ChartDataset,
  AxisConfig,
  InteractionMode,
} from './types.js';

/**
 * Base chart type interface
 */
export interface ChartTypeRenderer {
  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void;
  update(ctx: RenderContext, data: ChartData, options: ChartOptions): void;
  destroy(): void;
  getElementsAtEvent(
    ctx: RenderContext,
    event: MouseEvent,
    mode: InteractionMode
  ): ChartElement[];
}

/**
 * Line Chart Renderer
 * Displays data as a series of connected points
 */
export class LineChart implements ChartTypeRenderer {
  private elements: ChartElement[] = [];
  private animationProgress = 0;

  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    const { ctx: context, width, height, chartArea } = ctx;
    const { datasets } = data;

    datasets.forEach((dataset, datasetIndex) => {
      if (dataset.hidden) return;

      const points = this.calculatePoints(dataset, ctx, options);
      this.drawPath(context, points, dataset, chartArea, options);
      this.drawPoints(context, points, dataset, datasetIndex, options);
    });

    this.animationProgress = 1;
  }

  update(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    this.elements = [];
    this.render(ctx, data, options);
  }

  destroy(): void {
    this.elements = [];
  }

  getElementsAtEvent(
    ctx: RenderContext,
    event: MouseEvent,
    mode: InteractionMode
  ): ChartElement[] {
    const rect = ctx.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return this.elements.filter(el => el.inRange(x, y));
  }

  private calculatePoints(dataset: ChartDataset, ctx: RenderContext, options: ChartOptions): Array<{ x: number; y: number }> {
    const { chartArea } = ctx;
    const { xAxis, yAxis } = options;
    const points: Array<{ x: number; y: number }> = [];

    const xMin = xAxis?.min ?? 0;
    const xMax = xAxis?.max ?? dataset.data.length - 1;
    const yMin = yAxis?.min ?? 0;
    const yMax = yAxis?.max ?? Math.max(...dataset.data.map(d => d.y));

    dataset.data.forEach((point, index) => {
      const x = chartArea.left + ((Number(point.x) - xMin) / (xMax - xMin)) * chartArea.width;
      const y = chartArea.bottom - ((point.y - yMin) / (yMax - yMin)) * chartArea.height;
      points.push({ x, y });
    });

    return points;
  }

  private drawPath(
    ctx: CanvasRenderingContext2D,
    points: Array<{ x: number; y: number }>,
    dataset: ChartDataset,
    chartArea: any,
    options: ChartOptions
  ): void {
    if (points.length === 0) return;

    const tension = dataset.tension ?? options.elements?.line?.tension ?? 0.4;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    if (tension > 0 && points.length > 2) {
      // Smooth curve using spline interpolation
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    } else {
      // Straight lines
      points.forEach(point => ctx.lineTo(point.x, point.y));
    }

    ctx.strokeStyle = dataset.borderColor ?? '#2196F3';
    ctx.lineWidth = dataset.borderWidth ?? 2;
    ctx.setLineDash(dataset.borderDash ?? []);
    ctx.stroke();

    if (dataset.fill) {
      ctx.lineTo(points[points.length - 1].x, chartArea.bottom);
      ctx.lineTo(points[0].x, chartArea.bottom);
      ctx.closePath();
      ctx.fillStyle = dataset.backgroundColor ?? 'rgba(33, 150, 243, 0.1)';
      ctx.fill();
    }

    ctx.restore();
  }

  private drawPoints(
    ctx: CanvasRenderingContext2D,
    points: Array<{ x: number; y: number }>,
    dataset: ChartDataset,
    datasetIndex: number,
    options: ChartOptions
  ): void {
    const radius = dataset.pointRadius ?? options.elements?.point?.radius ?? 4;

    points.forEach((point, index) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = dataset.pointBackgroundColor ?? dataset.borderColor ?? '#2196F3';
      ctx.strokeStyle = dataset.pointBorderColor ?? '#fff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      this.elements.push({
        datasetIndex,
        index,
        x: point.x,
        y: point.y,
        radius: radius + 2,
        inRange: (mouseX: number, mouseY: number) => {
          const dx = mouseX - point.x;
          const dy = mouseY - point.y;
          return Math.sqrt(dx * dx + dy * dy) <= radius + 2;
        },
        inXRange: (mouseX: number) => Math.abs(mouseX - point.x) <= radius + 2,
        inYRange: (mouseY: number) => Math.abs(mouseY - point.y) <= radius + 2,
        getCenterPoint: () => ({ x: point.x, y: point.y }),
        tooltipPosition: () => ({ x: point.x, y: point.y }),
      });

      ctx.restore();
    });
  }
}

/**
 * Bar Chart Renderer
 * Displays data as vertical or horizontal bars
 */
export class BarChart implements ChartTypeRenderer {
  private elements: ChartElement[] = [];
  private barWidth: number = 0;

  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    const { ctx: context, width, height, chartArea } = ctx;
    const { datasets, labels } = data;

    const categoryCount = labels?.length ?? datasets[0]?.data.length ?? 1;
    const datasetCount = datasets.filter(d => !d.hidden).length;
    this.barWidth = (chartArea.width / categoryCount) * 0.8 / datasetCount;

    datasets.forEach((dataset, datasetIndex) => {
      if (dataset.hidden) return;

      dataset.data.forEach((point, index) => {
        const bar = this.calculateBarPosition(point, index, datasetIndex, ctx, options);
        this.drawBar(context, bar, dataset, datasetIndex, index);
      });
    });
  }

  update(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    this.elements = [];
    this.render(ctx, data, options);
  }

  destroy(): void {
    this.elements = [];
  }

  getElementsAtEvent(
    ctx: RenderContext,
    event: MouseEvent,
    mode: InteractionMode
  ): ChartElement[] {
    const rect = ctx.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return this.elements.filter(el => el.inRange(x, y));
  }

  private calculateBarPosition(
    point: DataPoint,
    index: number,
    datasetIndex: number,
    ctx: RenderContext,
    options: ChartOptions
  ): { x: number; y: number; width: number; height: number } {
    const { chartArea } = ctx;
    const { yAxis } = options;
    const categoryWidth = chartArea.width / (ctx.data.labels?.length ?? 1);

    const yMax = yAxis?.max ?? 100;
    const yMin = yAxis?.min ?? 0;
    const barHeight = ((point.y - yMin) / (yMax - yMin)) * chartArea.height;

    const x = chartArea.left + (index * categoryWidth) + (categoryWidth * 0.1) + (datasetIndex * this.barWidth);
    const y = chartArea.bottom - barHeight;

    return { x, y, width: this.barWidth, height: barHeight };
  }

  private drawBar(
    ctx: CanvasRenderingContext2D,
    bar: { x: number; y: number; width: number; height: number },
    dataset: ChartDataset,
    datasetIndex: number,
    index: number
  ): void {
    ctx.save();
    ctx.fillStyle = dataset.backgroundColor as string ?? '#2196F3';
    ctx.strokeStyle = dataset.borderColor ?? 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = dataset.borderWidth ?? 1;

    // Draw rounded top corners
    const radius = Math.min(bar.width / 2, 4);
    ctx.beginPath();
    ctx.moveTo(bar.x, bar.y + bar.height);
    ctx.lineTo(bar.x, bar.y + radius);
    ctx.quadraticCurveTo(bar.x, bar.y, bar.x + radius, bar.y);
    ctx.lineTo(bar.x + bar.width - radius, bar.y);
    ctx.quadraticCurveTo(bar.x + bar.width, bar.y, bar.x + bar.width, bar.y + radius);
    ctx.lineTo(bar.x + bar.width, bar.y + bar.height);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    this.elements.push({
      datasetIndex,
      index,
      x: bar.x,
      y: bar.y,
      width: bar.width,
      height: bar.height,
      inRange: (mouseX: number, mouseY: number) =>
        mouseX >= bar.x && mouseX <= bar.x + bar.width &&
        mouseY >= bar.y && mouseY <= bar.y + bar.height,
      inXRange: (mouseX: number) => mouseX >= bar.x && mouseX <= bar.x + bar.width,
      inYRange: (mouseY: number) => mouseY >= bar.y && mouseY <= bar.y + bar.height,
      getCenterPoint: () => ({ x: bar.x + bar.width / 2, y: bar.y + bar.height / 2 }),
      tooltipPosition: () => ({ x: bar.x + bar.width / 2, y: bar.y }),
    });

    ctx.restore();
  }
}

/**
 * Pie Chart Renderer
 * Displays data as circular slices
 */
export class PieChart implements ChartTypeRenderer {
  private elements: ChartElement[] = [];
  private totalValue = 0;

  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    const { ctx: context, width, height, chartArea } = ctx;
    const { datasets } = data;

    this.totalValue = datasets[0].data.reduce((sum, point) => sum + point.y, 0);

    const centerX = chartArea.left + chartArea.width / 2;
    const centerY = chartArea.top + chartArea.height / 2;
    const radius = Math.min(chartArea.width, chartArea.height) / 2 * 0.9;

    let startAngle = -Math.PI / 2;

    datasets[0].data.forEach((point, index) => {
      const sliceAngle = (point.y / this.totalValue) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      this.drawSlice(
        context,
        centerX,
        centerY,
        radius,
        startAngle,
        endAngle,
        datasets[0],
        index,
        point
      );

      startAngle = endAngle;
    });
  }

  update(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    this.elements = [];
    this.render(ctx, data, options);
  }

  destroy(): void {
    this.elements = [];
  }

  getElementsAtEvent(
    ctx: RenderContext,
    event: MouseEvent,
    mode: InteractionMode
  ): ChartElement[] {
    const rect = ctx.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return this.elements.filter(el => el.inRange(x, y));
  }

  private drawSlice(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    dataset: ChartDataset,
    index: number,
    point: DataPoint
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();

    const colors = Array.isArray(dataset.backgroundColor)
      ? dataset.backgroundColor
      : ['#2196F3', '#4CAF50', '#FFC107', '#FF5722', '#9C27B0', '#00BCD4'];

    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    const midAngle = startAngle + (endAngle - startAngle) / 2;
    const labelRadius = radius * 0.7;
    const labelX = centerX + Math.cos(midAngle) * labelRadius;
    const labelY = centerY + Math.sin(midAngle) * labelRadius;

    this.elements.push({
      datasetIndex: 0,
      index,
      x: centerX,
      y: centerY,
      radius,
      inRange: (mouseX: number, mouseY: number) => {
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > radius) return false;

        let angle = Math.atan2(dy, dx);
        if (angle < -Math.PI / 2) angle += Math.PI * 2;
        if (angle < startAngle || angle > endAngle) return false;

        return true;
      },
      inXRange: (mouseX: number) => {
        const dx = mouseX - centerX;
        return Math.abs(dx) <= radius;
      },
      inYRange: (mouseY: number) => {
        const dy = mouseY - centerY;
        return Math.abs(dy) <= radius;
      },
      getCenterPoint: () => ({ x: labelX, y: labelY }),
      tooltipPosition: () => ({
        x: centerX + Math.cos(midAngle) * radius * 1.1,
        y: centerY + Math.sin(midAngle) * radius * 1.1,
      }),
    });

    ctx.restore();
  }
}

/**
 * Scatter Chart Renderer
 * Displays data as individual points
 */
export class ScatterChart implements ChartTypeRenderer {
  private elements: ChartElement[] = [];

  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    const { ctx: context, chartArea } = ctx;
    const { datasets } = data;

    datasets.forEach((dataset, datasetIndex) => {
      if (dataset.hidden) return;

      dataset.data.forEach((point, index) => {
        const pos = this.calculatePosition(point, ctx, options);
        this.drawPoint(context, pos, dataset, datasetIndex, index);
      });
    });
  }

  update(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    this.elements = [];
    this.render(ctx, data, options);
  }

  destroy(): void {
    this.elements = [];
  }

  getElementsAtEvent(
    ctx: RenderContext,
    event: MouseEvent,
    mode: InteractionMode
  ): ChartElement[] {
    const rect = ctx.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return this.elements.filter(el => el.inRange(x, y));
  }

  private calculatePosition(point: DataPoint, ctx: RenderContext, options: ChartOptions): { x: number; y: number } {
    const { chartArea } = ctx;
    const { xAxis, yAxis } = options;

    const xMin = xAxis?.min ?? 0;
    const xMax = xAxis?.max ?? 100;
    const yMin = yAxis?.min ?? 0;
    const yMax = yAxis?.max ?? 100;

    const x = chartArea.left + ((Number(point.x) - xMin) / (xMax - xMin)) * chartArea.width;
    const y = chartArea.bottom - ((point.y - yMin) / (yMax - yMin)) * chartArea.height;

    return { x, y };
  }

  private drawPoint(
    ctx: CanvasRenderingContext2D,
    pos: { x: number; y: number },
    dataset: ChartDataset,
    datasetIndex: number,
    index: number
  ): void {
    const radius = dataset.pointRadius ?? options.elements?.point?.radius ?? 6;

    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = dataset.pointBackgroundColor ?? dataset.backgroundColor as string ?? '#2196F3';
    ctx.strokeStyle = dataset.pointBorderColor ?? dataset.borderColor ?? '#fff';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    this.elements.push({
      datasetIndex,
      index,
      x: pos.x,
      y: pos.y,
      radius: radius + 2,
      inRange: (mouseX: number, mouseY: number) => {
        const dx = mouseX - pos.x;
        const dy = mouseY - pos.y;
        return Math.sqrt(dx * dx + dy * dy) <= radius + 2;
      },
      inXRange: (mouseX: number) => Math.abs(mouseX - pos.x) <= radius + 2,
      inYRange: (mouseY: number) => Math.abs(mouseY - pos.y) <= radius + 2,
      getCenterPoint: () => ({ x: pos.x, y: pos.y }),
      tooltipPosition: () => ({ x: pos.x, y: pos.y }),
    });
  }
}

/**
 * Heatmap Chart Renderer
 * Displays data as a color-coded grid
 */
export class HeatmapChart implements ChartTypeRenderer {
  private elements: ChartElement[] = [];
  private cellWidth = 0;
  private cellHeight = 0;

  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    const { ctx: context, chartArea } = ctx;
    const { datasets } = data;

    const dataset = datasets[0];
    const gridWidth = dataset.data[0]?.x as number ?? 10;
    const gridHeight = dataset.data.length / gridWidth;

    this.cellWidth = chartArea.width / gridWidth;
    this.cellHeight = chartArea.height / gridHeight;

    const values = dataset.data.map(d => d.y);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    dataset.data.forEach((point, index) => {
      const row = Math.floor(index / gridWidth);
      const col = index % gridWidth;
      const cell = {
        x: chartArea.left + col * this.cellWidth,
        y: chartArea.top + row * this.cellHeight,
        width: this.cellWidth,
        height: this.cellHeight,
      };

      this.drawCell(context, cell, point.y, minVal, maxVal, index);
    });
  }

  update(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    this.elements = [];
    this.render(ctx, data, options);
  }

  destroy(): void {
    this.elements = [];
  }

  getElementsAtEvent(
    ctx: RenderContext,
    event: MouseEvent,
    mode: InteractionMode
  ): ChartElement[] {
    const rect = ctx.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return this.elements.filter(el => el.inRange(x, y));
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    cell: { x: number; y: number; width: number; height: number },
    value: number,
    minVal: number,
    maxVal: number,
    index: number
  ): void {
    const normalizedValue = (value - minVal) / (maxVal - minVal);
    const color = this.getHeatmapColor(normalizedValue);

    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(cell.x, cell.y, cell.width - 1, cell.height - 1);
    ctx.restore();

    this.elements.push({
      datasetIndex: 0,
      index,
      x: cell.x,
      y: cell.y,
      width: cell.width,
      height: cell.height,
      inRange: (mouseX: number, mouseY: number) =>
        mouseX >= cell.x && mouseX <= cell.x + cell.width &&
        mouseY >= cell.y && mouseY <= cell.y + cell.height,
      inXRange: (mouseX: number) => mouseX >= cell.x && mouseX <= cell.x + cell.width,
      inYRange: (mouseY: number) => mouseY >= cell.y && mouseY <= cell.y + cell.height,
      getCenterPoint: () => ({ x: cell.x + cell.width / 2, y: cell.y + cell.height / 2 }),
      tooltipPosition: () => ({ x: cell.x + cell.width / 2, y: cell.y }),
    });
  }

  private getHeatmapColor(value: number): string {
    // Blue to red gradient
    const r = Math.round(value * 255);
    const b = Math.round((1 - value) * 255);
    return `rgb(${r}, 0, ${b})`;
  }
}

/**
 * Candlestick Chart Renderer
 * Displays financial OHLC data
 */
export class CandlestickChart implements ChartTypeRenderer {
  private elements: ChartElement[] = [];

  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    const { ctx: context, chartArea } = ctx;
    const { datasets } = data;

    const candleWidth = chartArea.width / datasets[0].data.length * 0.7;

    datasets.forEach((dataset, datasetIndex) => {
      if (dataset.hidden) return;

      dataset.data.forEach((point, index) => {
        const candle = this.calculateCandlePosition(point, index, ctx, options, candleWidth);
        this.drawCandle(context, candle, dataset, datasetIndex, index);
      });
    });
  }

  update(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    this.elements = [];
    this.render(ctx, data, options);
  }

  destroy(): void {
    this.elements = [];
  }

  getElementsAtEvent(
    ctx: RenderContext,
    event: MouseEvent,
    mode: InteractionMode
  ): ChartElement[] {
    const rect = ctx.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return this.elements.filter(el => el.inRange(x, y));
  }

  private calculateCandlePosition(
    point: DataPoint,
    index: number,
    ctx: RenderContext,
    options: ChartOptions,
    candleWidth: number
  ): any {
    const { chartArea } = ctx;
    const { yAxis } = options;

    const metadata = point.metadata as { open?: number; high?: number; low?: number; close?: number };
    const open = metadata?.open ?? point.y;
    const close = metadata?.close ?? point.y;
    const high = metadata?.high ?? Math.max(open, close);
    const low = metadata?.low ?? Math.min(open, close);

    const yMax = yAxis?.max ?? 100;
    const yMin = yAxis?.min ?? 0;

    const x = chartArea.left + index * (chartArea.width / ctx.data.labels?.length!) + candleWidth / 2;
    const openY = chartArea.bottom - ((open - yMin) / (yMax - yMin)) * chartArea.height;
    const closeY = chartArea.bottom - ((close - yMin) / (yMax - yMin)) * chartArea.height;
    const highY = chartArea.bottom - ((high - yMin) / (yMax - yMin)) * chartArea.height;
    const lowY = chartArea.bottom - ((low - yMin) / (yMax - yMin)) * chartArea.height;

    const isGreen = close >= open;

    return { x, openY, closeY, highY, lowY, candleWidth, isGreen };
  }

  private drawCandle(
    ctx: CanvasRenderingContext2D,
    candle: any,
    dataset: ChartDataset,
    datasetIndex: number,
    index: number
  ): void {
    ctx.save();
    ctx.strokeStyle = candle.isGreen ? '#4CAF50' : '#F44336';
    ctx.fillStyle = candle.isGreen ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)';
    ctx.lineWidth = 2;

    // Draw wick
    ctx.beginPath();
    ctx.moveTo(candle.x, candle.highY);
    ctx.lineTo(candle.x, candle.lowY);
    ctx.stroke();

    // Draw body
    const bodyTop = Math.min(candle.openY, candle.closeY);
    const bodyHeight = Math.abs(candle.closeY - candle.openY) || 1;
    ctx.fillRect(
      candle.x - candle.candleWidth / 2,
      bodyTop,
      candle.candleWidth,
      bodyHeight
    );
    ctx.strokeRect(
      candle.x - candle.candleWidth / 2,
      bodyTop,
      candle.candleWidth,
      bodyHeight
    );

    this.elements.push({
      datasetIndex,
      index,
      x: candle.x - candle.candleWidth / 2,
      y: candle.highY,
      width: candle.candleWidth,
      height: candle.lowY - candle.highY,
      inRange: (mouseX: number, mouseY: number) =>
        mouseX >= candle.x - candle.candleWidth &&
        mouseX <= candle.x + candle.candleWidth &&
        mouseY >= candle.highY &&
        mouseY <= candle.lowY,
      inXRange: (mouseX: number) =>
        mouseX >= candle.x - candle.candleWidth &&
        mouseX <= candle.x + candle.candleWidth,
      inYRange: (mouseY: number) =>
        mouseY >= candle.highY && mouseY <= candle.lowY,
      getCenterPoint: () => ({ x: candle.x, y: (candle.highY + candle.lowY) / 2 }),
      tooltipPosition: () => ({ x: candle.x, y: candle.highY }),
    });

    ctx.restore();
  }
}

/**
 * Area Chart Renderer
 * Similar to line chart but with filled area below
 */
export class AreaChart extends LineChart {
  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    const modifiedData = {
      ...data,
      datasets: data.datasets.map(ds => ({
        ...ds,
        fill: true,
        backgroundColor: ds.backgroundColor ?? 'rgba(33, 150, 243, 0.2)',
      })),
    };

    super.render(ctx, modifiedData, options);
  }
}

/**
 * Radar Chart Renderer
 * Displays data in a circular spider web pattern
 */
export class RadarChart implements ChartTypeRenderer {
  private elements: ChartElement[] = [];

  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    const { ctx: context, chartArea } = ctx;
    const { datasets, labels } = data;

    const centerX = chartArea.left + chartArea.width / 2;
    const centerY = chartArea.top + chartArea.height / 2;
    const radius = Math.min(chartArea.width, chartArea.height) / 2 * 0.8;
    const angleStep = (Math.PI * 2) / (labels?.length ?? 1);

    // Draw grid
    this.drawRadarGrid(context, centerX, centerY, radius, labels?.length ?? 1, angleStep);

    // Draw datasets
    datasets.forEach((dataset, datasetIndex) => {
      if (dataset.hidden) return;

      this.drawRadarDataset(
        context,
        dataset,
        datasetIndex,
        centerX,
        centerY,
        radius,
        angleStep,
        options
      );
    });
  }

  update(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    this.elements = [];
    this.render(ctx, data, options);
  }

  destroy(): void {
    this.elements = [];
  }

  getElementsAtEvent(
    ctx: RenderContext,
    event: MouseEvent,
    mode: InteractionMode
  ): ChartElement[] {
    const rect = ctx.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return this.elements.filter(el => el.inRange(x, y));
  }

  private drawRadarGrid(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    axisCount: number,
    angleStep: number
  ): void {
    ctx.save();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // Draw concentric circles
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius / 5) * i, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw axis lines
    for (let i = 0; i < axisCount; i++) {
      const angle = i * angleStep - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawRadarDataset(
    ctx: CanvasRenderingContext2D,
    dataset: ChartDataset,
    datasetIndex: number,
    centerX: number,
    centerY: number,
    radius: number,
    angleStep: number,
    options: ChartOptions
  ): void {
    const maxValue = Math.max(...dataset.data.map(d => d.y));
    const minValue = Math.min(...dataset.data.map(d => d.y));
    const range = maxValue - minValue || 1;

    ctx.save();
    ctx.beginPath();

    const points: Array<{ x: number; y: number }> = [];

    dataset.data.forEach((point, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const normalizedValue = (point.y - minValue) / range;
      const pointRadius = normalizedValue * radius;

      const x = centerX + Math.cos(angle) * pointRadius;
      const y = centerY + Math.sin(angle) * pointRadius;
      points.push({ x, y });

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.closePath();
    ctx.fillStyle = dataset.backgroundColor as string ?? 'rgba(33, 150, 243, 0.2)';
    ctx.fill();
    ctx.strokeStyle = dataset.borderColor ?? '#2196F3';
    ctx.lineWidth = dataset.borderWidth ?? 2;
    ctx.stroke();

    // Draw points
    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = dataset.pointBackgroundColor ?? '#fff';
      ctx.fill();
      ctx.stroke();

      this.elements.push({
        datasetIndex,
        index,
        x: point.x,
        y: point.y,
        radius: 6,
        inRange: (mouseX: number, mouseY: number) => {
          const dx = mouseX - point.x;
          const dy = mouseY - point.y;
          return Math.sqrt(dx * dx + dy * dy) <= 6;
        },
        inXRange: (mouseX: number) => Math.abs(mouseX - point.x) <= 6,
        inYRange: (mouseY: number) => Math.abs(mouseY - point.y) <= 6,
        getCenterPoint: () => ({ x: point.x, y: point.y }),
        tooltipPosition: () => ({ x: point.x, y: point.y }),
      });
    });

    ctx.restore();
  }
}

/**
 * Histogram Chart Renderer
 * Displays distribution of data
 */
export class HistogramChart implements ChartTypeRenderer {
  private elements: ChartElement[] = [];

  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    const { ctx: context, chartArea } = ctx;
    const { datasets } = data;

    const dataset = datasets[0];
    const binCount = dataset.data.length;
    const barWidth = chartArea.width / binCount * 0.9;

    const maxValue = Math.max(...dataset.data.map(d => d.y));

    dataset.data.forEach((point, index) => {
      const barHeight = (point.y / maxValue) * chartArea.height;
      const x = chartArea.left + index * (chartArea.width / binCount) + barWidth * 0.05;
      const y = chartArea.bottom - barHeight;

      ctx.save();
      ctx.fillStyle = dataset.backgroundColor as string ?? '#2196F3';
      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.restore();

      this.elements.push({
        datasetIndex: 0,
        index,
        x,
        y,
        width: barWidth,
        height: barHeight,
        inRange: (mouseX: number, mouseY: number) =>
          mouseX >= x && mouseX <= x + barWidth &&
          mouseY >= y && mouseY <= y + barHeight,
        inXRange: (mouseX: number) => mouseX >= x && mouseX <= x + barWidth,
        inYRange: (mouseY: number) => mouseY >= y && mouseY <= y + barHeight,
        getCenterPoint: () => ({ x: x + barWidth / 2, y: y + barHeight / 2 }),
        tooltipPosition: () => ({ x: x + barWidth / 2, y }),
      });
    });
  }

  update(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    this.elements = [];
    this.render(ctx, data, options);
  }

  destroy(): void {
    this.elements = [];
  }

  getElementsAtEvent(
    ctx: RenderContext,
    event: MouseEvent,
    mode: InteractionMode
  ): ChartElement[] {
    const rect = ctx.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return this.elements.filter(el => el.inRange(x, y));
  }
}

/**
 * Box Plot Chart Renderer
 * Displays statistical distributions
 */
export class BoxPlotChart implements ChartTypeRenderer {
  private elements: ChartElement[] = [];

  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    const { ctx: context, chartArea } = ctx;
    const { datasets } = data;

    const boxWidth = chartArea.width / datasets[0].data.length * 0.6;

    datasets.forEach((dataset, datasetIndex) => {
      if (dataset.hidden) return;

      dataset.data.forEach((point, index) => {
        const metadata = point.metadata as {
          min?: number;
          q1?: number;
          median?: number;
          q3?: number;
          max?: number;
        };

        const min = metadata?.min ?? point.y * 0.8;
        const q1 = metadata?.q1 ?? point.y * 0.9;
        const median = metadata?.median ?? point.y;
        const q3 = metadata?.q3 ?? point.y * 1.1;
        const max = metadata?.max ?? point.y * 1.2;

        const x = chartArea.left + index * (chartArea.width / dataset.data.length) + boxWidth / 2;
        const range = max - min;

        const minY = chartArea.bottom - ((min - min) / range) * chartArea.height;
        const q1Y = chartArea.bottom - ((q1 - min) / range) * chartArea.height;
        const medianY = chartArea.bottom - ((median - min) / range) * chartArea.height;
        const q3Y = chartArea.bottom - ((q3 - min) / range) * chartArea.height;
        const maxY = chartArea.bottom - ((max - min) / range) * chartArea.height;

        this.drawBoxPlot(context, x, minY, q1Y, medianY, q3Y, maxY, boxWidth, datasetIndex, index);
      });
    });
  }

  update(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    this.elements = [];
    this.render(ctx, data, options);
  }

  destroy(): void {
    this.elements = [];
  }

  getElementsAtEvent(
    ctx: RenderContext,
    event: MouseEvent,
    mode: InteractionMode
  ): ChartElement[] {
    const rect = ctx.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return this.elements.filter(el => el.inRange(x, y));
  }

  private drawBoxPlot(
    ctx: CanvasRenderingContext2D,
    x: number,
    minY: number,
    q1Y: number,
    medianY: number,
    q3Y: number,
    maxY: number,
    boxWidth: number,
    datasetIndex: number,
    index: number
  ): void {
    ctx.save();
    ctx.strokeStyle = '#2196F3';
    ctx.fillStyle = 'rgba(33, 150, 243, 0.3)';
    ctx.lineWidth = 2;

    // Draw whiskers
    ctx.beginPath();
    ctx.moveTo(x, minY);
    ctx.lineTo(x, q1Y);
    ctx.moveTo(x, q3Y);
    ctx.lineTo(x, maxY);
    ctx.stroke();

    // Draw whisker caps
    ctx.beginPath();
    ctx.moveTo(x - boxWidth / 4, minY);
    ctx.lineTo(x + boxWidth / 4, minY);
    ctx.moveTo(x - boxWidth / 4, maxY);
    ctx.lineTo(x + boxWidth / 4, maxY);
    ctx.stroke();

    // Draw box
    const boxTop = q3Y;
    const boxHeight = q1Y - q3Y;
    ctx.fillRect(x - boxWidth / 2, boxTop, boxWidth, boxHeight);
    ctx.strokeRect(x - boxWidth / 2, boxTop, boxWidth, boxHeight);

    // Draw median line
    ctx.beginPath();
    ctx.moveTo(x - boxWidth / 2, medianY);
    ctx.lineTo(x + boxWidth / 2, medianY);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    this.elements.push({
      datasetIndex,
      index,
      x: x - boxWidth / 2,
      y: maxY,
      width: boxWidth,
      height: minY - maxY,
      inRange: (mouseX: number, mouseY: number) =>
        mouseX >= x - boxWidth / 2 && mouseX <= x + boxWidth / 2 &&
        mouseY >= maxY && mouseY <= minY,
      inXRange: (mouseX: number) =>
        mouseX >= x - boxWidth / 2 && mouseX <= x + boxWidth / 2,
      inYRange: (mouseY: number) => mouseY >= maxY && mouseY <= minY,
      getCenterPoint: () => ({ x, y: (minY + maxY) / 2 }),
      tooltipPosition: () => ({ x: x + boxWidth / 2 + 10, y: medianY }),
    });

    ctx.restore();
  }
}

/**
 * Bubble Chart Renderer
 * Similar to scatter but with variable point sizes
 */
export class BubbleChart extends ScatterChart {
  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    const { ctx: context, chartArea } = ctx;
    const { datasets } = data;

    datasets.forEach((dataset, datasetIndex) => {
      if (dataset.hidden) return;

      dataset.data.forEach((point, index) => {
        const pos = this.calculatePosition(point, ctx, options);
        const z = point.z ?? 10;
        const radius = Math.sqrt(z) * 3;

        context.save();
        context.beginPath();
        context.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        context.fillStyle = dataset.backgroundColor as string ?? 'rgba(33, 150, 243, 0.6)';
        context.fill();
        context.strokeStyle = dataset.borderColor ?? '#2196F3';
        context.lineWidth = 1;
        context.stroke();
        context.restore();
      });
    });
  }
}

/**
 * Funnel Chart Renderer
 * Displays stages in a process
 */
export class FunnelChart implements ChartTypeRenderer {
  private elements: ChartElement[] = [];

  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    const { ctx: context, chartArea } = ctx;
    const { datasets } = data;

    const dataset = datasets[0];
    const stages = dataset.data.length;
    const stageHeight = chartArea.height / stages;

    const maxValue = Math.max(...dataset.data.map(d => d.y));

    dataset.data.forEach((point, index) => {
      const topY = chartArea.top + index * stageHeight;
      const bottomY = topY + stageHeight;

      const topWidth = (point.y / maxValue) * chartArea.width * 0.8;
      const bottomWidth = (dataset.data[index + 1]?.y ?? point.y * 0.8) / maxValue * chartArea.width * 0.8;

      const centerX = chartArea.left + chartArea.width / 2;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX - topWidth / 2, topY);
      ctx.lineTo(centerX + topWidth / 2, topY);
      ctx.lineTo(centerX + bottomWidth / 2, bottomY);
      ctx.lineTo(centerX - bottomWidth / 2, bottomY);
      ctx.closePath();

      const colors = Array.isArray(dataset.backgroundColor)
        ? dataset.backgroundColor
        : ['#2196F3', '#4CAF50', '#FFC107', '#FF5722', '#9C27B0'];

      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      this.elements.push({
        datasetIndex: 0,
        index,
        x: centerX - topWidth / 2,
        y: topY,
        width: topWidth,
        height: stageHeight,
        inRange: (mouseX: number, mouseY: number) =>
          mouseY >= topY && mouseY <= bottomY,
        inXRange: (mouseX: number) =>
          mouseX >= centerX - topWidth / 2 && mouseX <= centerX + topWidth / 2,
        inYRange: (mouseY: number) => mouseY >= topY && mouseY <= bottomY,
        getCenterPoint: () => ({ x: centerX, y: (topY + bottomY) / 2 }),
        tooltipPosition: () => ({ x: centerX + topWidth / 2 + 10, y: (topY + bottomY) / 2 }),
      });
    });
  }

  update(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    this.elements = [];
    this.render(ctx, data, options);
  }

  destroy(): void {
    this.elements = [];
  }

  getElementsAtEvent(
    ctx: RenderContext,
    event: MouseEvent,
    mode: InteractionMode
  ): ChartElement[] {
    const rect = ctx.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return this.elements.filter(el => el.inRange(x, y));
  }
}

/**
 * Gauge Chart Renderer
 * Displays a single value on a gauge
 */
export class GaugeChart implements ChartTypeRenderer {
  private elements: ChartElement[] = [];

  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    const { ctx: context, chartArea } = ctx;
    const { datasets } = data;

    const value = datasets[0].data[0]?.y ?? 0;
    const maxValue = options.yAxis?.max ?? 100;

    const centerX = chartArea.left + chartArea.width / 2;
    const centerY = chartArea.top + chartArea.height * 0.8;
    const radius = Math.min(chartArea.width, chartArea.height) * 0.6;

    const startAngle = Math.PI * 0.8;
    const endAngle = Math.PI * 2.2;
    const valueAngle = startAngle + ((value / maxValue) * (endAngle - startAngle));

    // Draw background arc
    context.save();
    context.beginPath();
    context.arc(centerX, centerY, radius, startAngle, endAngle);
    context.strokeStyle = '#e0e0e0';
    context.lineWidth = 20;
    context.stroke();

    // Draw value arc
    context.beginPath();
    context.arc(centerX, centerY, radius, startAngle, valueAngle);
    const gradient = context.createLinearGradient(
      centerX - radius, centerY,
      centerX + radius, centerY
    );
    gradient.addColorStop(0, '#4CAF50');
    gradient.addColorStop(0.5, '#FFC107');
    gradient.addColorStop(1, '#F44336');
    context.strokeStyle = gradient;
    context.lineWidth = 20;
    context.stroke();

    // Draw value text
    context.fillStyle = '#333';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.fillText(value.toString(), centerX, centerY);

    context.restore();
  }

  update(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    this.elements = [];
    this.render(ctx, data, options);
  }

  destroy(): void {
    this.elements = [];
  }

  getElementsAtEvent(
    ctx: RenderContext,
    event: MouseEvent,
    mode: InteractionMode
  ): ChartElement[] {
    return [];
  }
}

/**
 * Treemap Chart Renderer
 * Displays hierarchical data as nested rectangles
 */
export class TreemapChart implements ChartTypeRenderer {
  private elements: ChartElement[] = [];

  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    const { ctx: context, chartArea } = ctx;
    const { datasets } = data;

    const dataset = datasets[0];
    const totalValue = dataset.data.reduce((sum, point) => sum + point.y, 0);

    this.drawTreemapRecursive(
      context,
      dataset.data,
      chartArea.left,
      chartArea.top,
      chartArea.width,
      chartArea.height,
      totalValue,
      0
    );
  }

  update(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    this.elements = [];
    this.render(ctx, data, options);
  }

  destroy(): void {
    this.elements = [];
  }

  getElementsAtEvent(
    ctx: RenderContext,
    event: MouseEvent,
    mode: InteractionMode
  ): ChartElement[] {
    const rect = ctx.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return this.elements.filter(el => el.inRange(x, y));
  }

  private drawTreemapRecursive(
    ctx: CanvasRenderingContext2D,
    data: DataPoint[],
    x: number,
    y: number,
    width: number,
    height: number,
    totalValue: number,
    startIndex: number
  ): void {
    if (data.length === 0 || width <= 0 || height <= 0) return;

    const point = data[0];
    const value = point.y;
    const ratio = value / totalValue;

    const isHorizontal = width > height;
    const size = isHorizontal ? width * ratio : height * ratio;

    const rectWidth = isHorizontal ? size : width;
    const rectHeight = isHorizontal ? height : size;

    ctx.save();
    ctx.fillStyle = point.color ?? this.getColor(startIndex);
    ctx.fillRect(x, y, rectWidth, rectHeight);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, rectWidth, rectHeight);
    ctx.restore();

    this.elements.push({
      datasetIndex: 0,
      index: startIndex,
      x,
      y,
      width: rectWidth,
      height: rectHeight,
      inRange: (mouseX: number, mouseY: number) =>
        mouseX >= x && mouseX <= x + rectWidth &&
        mouseY >= y && mouseY <= y + rectHeight,
      inXRange: (mouseX: number) => mouseX >= x && mouseX <= x + rectWidth,
      inYRange: (mouseY: number) => mouseY >= y && mouseY <= y + rectHeight,
      getCenterPoint: () => ({ x: x + rectWidth / 2, y: y + rectHeight / 2 }),
      tooltipPosition: () => ({ x: x + rectWidth / 2, y }),
    });

    const remainingData = data.slice(1);
    const remainingX = isHorizontal ? x + size : x;
    const remainingY = isHorizontal ? y : y + size;
    const remainingWidth = isHorizontal ? width - size : width;
    const remainingHeight = isHorizontal ? height : height - size;

    this.drawTreemapRecursive(
      ctx,
      remainingData,
      remainingX,
      remainingY,
      remainingWidth,
      remainingHeight,
      totalValue - value,
      startIndex + 1
    );
  }

  private getColor(index: number): string {
    const colors = ['#2196F3', '#4CAF50', '#FFC107', '#FF5722', '#9C27B0', '#00BCD4'];
    return colors[index % colors.length];
  }
}

/**
 * Waterfall Chart Renderer
 * Shows cumulative effect of sequential values
 */
export class WaterfallChart implements ChartTypeRenderer {
  private elements: ChartElement[] = [];

  render(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    const { ctx: context, chartArea } = ctx;
    const { datasets } = data;

    const dataset = datasets[0];
    const barWidth = chartArea.width / dataset.data.length * 0.7;

    let cumulative = 0;
    const allValues = dataset.data.map(d => d.y);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue || 1;

    dataset.data.forEach((point, index) => {
      const value = point.y;
      const isPositive = value >= 0;

      const x = chartArea.left + index * (chartArea.width / dataset.data.length) + barWidth * 0.15;
      const barHeight = (Math.abs(value) / range) * chartArea.height;

      const baseY = chartArea.bottom - ((cumulative - minValue) / range) * chartArea.height;
      const y = isPositive ? baseY - barHeight : baseY;

      context.save();
      context.fillStyle = isPositive ? '#4CAF50' : '#F44336';
      context.fillRect(x, y, barWidth, barHeight);
      context.strokeStyle = '#fff';
      context.lineWidth = 1;
      context.strokeRect(x, y, barWidth, barHeight);
      context.restore();

      cumulative += value;

      this.elements.push({
        datasetIndex: 0,
        index,
        x,
        y,
        width: barWidth,
        height: barHeight,
        inRange: (mouseX: number, mouseY: number) =>
          mouseX >= x && mouseX <= x + barWidth &&
          mouseY >= y && mouseY <= y + barHeight,
        inXRange: (mouseX: number) => mouseX >= x && mouseX <= x + barWidth,
        inYRange: (mouseY: number) => mouseY >= y && mouseY <= y + barHeight,
        getCenterPoint: () => ({ x: x + barWidth / 2, y: y + barHeight / 2 }),
        tooltipPosition: () => ({ x: x + barWidth / 2, y }),
      });
    });
  }

  update(ctx: RenderContext, data: ChartData, options: ChartOptions): void {
    this.elements = [];
    this.render(ctx, data, options);
  }

  destroy(): void {
    this.elements = [];
  }

  getElementsAtEvent(
    ctx: RenderContext,
    event: MouseEvent,
    mode: InteractionMode
  ): ChartElement[] {
    const rect = ctx.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return this.elements.filter(el => el.inRange(x, y));
  }
}
