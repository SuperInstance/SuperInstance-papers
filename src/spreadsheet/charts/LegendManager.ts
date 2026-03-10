/**
 * POLLN Spreadsheet - LegendManager
 *
 * Manages chart legends with positioning, styling, and interactivity.
 * Supports click-to-toggle functionality for dataset visibility.
 */

import {
  RenderContext,
  ChartData,
  ChartOptions,
  LegendConfig,
  LegendItem,
  ChartPosition,
  Chart,
  Legend,
} from './types.js';

/**
 * Default legend colors
 */
const DEFAULT_COLORS = [
  '#2196F3', '#4CAF50', '#FFC107', '#FF5722', '#9C27B0',
  '#00BCD4', '#8BC34A', '#FF9800', '#E91E63', '#3F51B5',
  '#009688', '#CDDC39', '#FFC107', '#FF5722', '#795548',
];

/**
 * LegendManager - Manages chart legends
 */
export class LegendManager {
  private ctx: CanvasRenderingContext2D;
  private legendItems: LegendItem[] = [];
  private legendAreas: Map<number, { x: number; y: number; width: number; height: number }> = new Map();
  private hoverIndex: number = -1;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Draw legend on the chart
   */
  public drawLegend(renderContext: RenderContext, data: ChartData, options: ChartOptions): void {
    const legendConfig = options.legend;

    if (!legendConfig || legendConfig.display === false) return;

    // Generate legend items
    this.legendItems = this.generateLegendItems(data, options);

    // Calculate legend position and dimensions
    const legendArea = this.calculateLegendArea(renderContext, legendConfig);

    // Draw legend background
    this.drawLegendBackground(legendArea, legendConfig);

    // Draw legend items
    this.drawLegendItems(legendArea, legendConfig);
  }

  /**
   * Generate legend items from chart data
   */
  private generateLegendItems(data: ChartData, options: ChartOptions): LegendItem[] {
    const items: LegendItem[] = [];

    data.datasets.forEach((dataset, index) => {
      // Apply filter if provided
      if (options.legend?.labels?.filter) {
        const item: LegendItem = {
          text: dataset.label,
          fillStyle: Array.isArray(dataset.backgroundColor)
            ? dataset.backgroundColor[0]
            : dataset.backgroundColor ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          strokeStyle: dataset.borderColor ?? '#fff',
          lineWidth: dataset.borderWidth ?? 2,
          hidden: dataset.hidden ?? false,
          index,
          datasetIndex: index,
        };

        if (options.legend.labels.filter(item, data)) {
          items.push(item);
        }
      } else {
        items.push({
          text: dataset.label,
          fillStyle: Array.isArray(dataset.backgroundColor)
            ? dataset.backgroundColor[0]
            : dataset.backgroundColor ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          strokeStyle: dataset.borderColor ?? '#fff',
          lineWidth: dataset.borderWidth ?? 2,
          hidden: dataset.hidden ?? false,
          index,
          datasetIndex: index,
        });
      }
    });

    return items;
  }

  /**
   * Calculate legend area based on position
   */
  private calculateLegendArea(
    renderContext: RenderContext,
    legendConfig: LegendConfig
  ): { x: number; y: number; width: number; height: number } {
    const { width, height, chartArea } = renderContext;
    const position = legendConfig.position ?? ChartPosition.TOP;
    const align = legendConfig.align ?? 'center';

    // Estimate legend dimensions
    const itemWidth = this.estimateItemWidth(legendConfig);
    const itemHeight = this.estimateItemHeight(legendConfig);
    const itemsPerRow = this.calculateItemsPerRow(width, itemWidth, legendConfig);
    const rowCount = Math.ceil(this.legendItems.length / itemsPerRow);

    const legendWidth = Math.min(itemWidth * itemsPerRow, width - 40);
    const legendHeight = itemHeight * rowCount;

    // Calculate position
    let x: number;
    let y: number;

    switch (position) {
      case ChartPosition.TOP:
        y = 10;
        x = this.calculateHorizontalPosition(width, legendWidth, align);
        break;
      case ChartPosition.BOTTOM:
        y = height - legendHeight - 10;
        x = this.calculateHorizontalPosition(width, legendWidth, align);
        break;
      case ChartPosition.LEFT:
        x = 10;
        y = this.calculateVerticalPosition(height, legendHeight, align);
        break;
      case ChartPosition.RIGHT:
        x = width - legendWidth - 10;
        y = this.calculateVerticalPosition(height, legendHeight, align);
        break;
      default:
        x = (width - legendWidth) / 2;
        y = 10;
    }

    return { x, y, width: legendWidth, height: legendHeight };
  }

  /**
   * Calculate horizontal position based on alignment
   */
  private calculateHorizontalPosition(
    containerWidth: number,
    legendWidth: number,
    align: 'start' | 'center' | 'end'
  ): number {
    switch (align) {
      case 'start':
        return 20;
      case 'end':
        return containerWidth - legendWidth - 20;
      case 'center':
      default:
        return (containerWidth - legendWidth) / 2;
    }
  }

  /**
   * Calculate vertical position based on alignment
   */
  private calculateVerticalPosition(
    containerHeight: number,
    legendHeight: number,
    align: 'start' | 'center' | 'end'
  ): number {
    switch (align) {
      case 'start':
        return 20;
      case 'end':
        return containerHeight - legendHeight - 20;
      case 'center':
      default:
        return (containerHeight - legendHeight) / 2;
    }
  }

  /**
   * Estimate item width
   */
  private estimateItemWidth(legendConfig: LegendConfig): number {
    const boxWidth = legendConfig.labels?.boxWidth ?? 12;
    const padding = legendConfig.labels?.padding ?? 10;
    const textWidth = 80; // Estimate

    return boxWidth + padding + textWidth + padding;
  }

  /**
   * Estimate item height
   */
  private estimateItemHeight(legendConfig: LegendConfig): number {
    const boxHeight = legendConfig.labels?.boxHeight ?? 12;
    const padding = legendConfig.labels?.padding ?? 10;

    return Math.max(boxHeight, 20) + padding * 2;
  }

  /**
   * Calculate items per row
   */
  private calculateItemsPerRow(containerWidth: number, itemWidth: number, legendConfig: LegendConfig): number {
    if (legendConfig.fullWidth === false) {
      return 1;
    }

    const maxWidth = containerWidth - 40;
    return Math.max(1, Math.floor(maxWidth / itemWidth));
  }

  /**
   * Draw legend background
   */
  private drawLegendBackground(
    legendArea: { x: number; y: number; width: number; height: number },
    legendConfig: LegendConfig
  ): void {
    this.ctx.save();

    // Draw background
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillRect(legendArea.x, legendArea.y, legendArea.width, legendArea.height);

    // Draw border
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(legendArea.x, legendArea.y, legendArea.width, legendArea.height);

    this.ctx.restore();
  }

  /**
   * Draw legend items
   */
  private drawLegendItems(
    legendArea: { x: number; y: number; width: number; height: number },
    legendConfig: LegendConfig
  ): void {
    const { labels } = legendConfig;
    const boxWidth = labels?.boxWidth ?? 12;
    const boxHeight = labels?.boxHeight ?? 12;
    const padding = labels?.padding ?? 10;
    const itemWidth = this.estimateItemWidth(legendConfig);
    const itemHeight = this.estimateItemHeight(legendConfig);
    const itemsPerRow = this.calculateItemsPerRow(legendArea.width, itemWidth, legendConfig);

    this.legendAreas.clear();

    this.legendItems.forEach((item, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;

      const x = legendArea.x + col * itemWidth + padding;
      const y = legendArea.y + row * itemHeight + padding;

      // Store item area for hit testing
      this.legendAreas.set(index, {
        x: legendArea.x + col * itemWidth,
        y: legendArea.y + row * itemHeight,
        width: itemWidth,
        height: itemHeight,
      });

      // Draw item
      this.drawLegendItem(x, y, boxWidth, boxHeight, item, legendConfig);
    });
  }

  /**
   * Draw a single legend item
   */
  private drawLegendItem(
    x: number,
    y: number,
    boxWidth: number,
    boxHeight: number,
    item: LegendItem,
    legendConfig: LegendConfig
  ): void {
    this.ctx.save();

    // Apply font settings
    const font = legendConfig.labels?.font;
    this.ctx.font = `${font?.weight ?? 'normal'} ${font?.size ?? 12}px ${font?.family ?? 'Arial'}`;
    this.ctx.fillStyle = legendConfig.labels?.color ?? '#666';
    this.ctx.textBaseline = 'middle';

    // Draw box/color swatch
    if (item.hidden) {
      this.ctx.strokeStyle = item.fillStyle as string;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y - boxHeight / 2, boxWidth, boxHeight);
    } else {
      this.ctx.fillStyle = item.fillStyle as string;
      this.ctx.fillRect(x, y - boxHeight / 2, boxWidth, boxHeight);

      if (item.strokeStyle) {
        this.ctx.strokeStyle = item.strokeStyle;
        this.ctx.lineWidth = item.lineWidth ?? 1;
        this.ctx.strokeRect(x, y - boxHeight / 2, boxWidth, boxHeight);
      }
    }

    // Draw text
    this.ctx.fillText(item.text, x + boxWidth + 10, y);

    this.ctx.restore();
  }

  /**
   * Handle click on legend item
   */
  public handleClick(x: number, y: number): number | null {
    for (const [index, area] of this.legendAreas) {
      if (
        x >= area.x &&
        x <= area.x + area.width &&
        y >= area.y &&
        y <= area.y + area.height
      ) {
        return index;
      }
    }
    return null;
  }

  /**
   * Handle hover on legend item
   */
  public handleHover(x: number, y: number): number | null {
    this.hoverIndex = -1;

    for (const [index, area] of this.legendAreas) {
      if (
        x >= area.x &&
        x <= area.x + area.width &&
        y >= area.y &&
        y <= area.y + area.height
      ) {
        this.hoverIndex = index;
        return index;
      }
    }

    return null;
  }

  /**
   * Get legend items
   */
  public getLegendItems(): LegendItem[] {
    return this.legendItems;
  }

  /**
   * Toggle dataset visibility
   */
  public toggleDataset(index: number, data: ChartData): void {
    if (index >= 0 && index < data.datasets.length) {
      data.datasets[index].hidden = !data.datasets[index].hidden;
    }
  }

  /**
   * Set dataset visibility
   */
  public setDatasetVisibility(index: number, visible: boolean, data: ChartData): void {
    if (index >= 0 && index < data.datasets.length) {
      data.datasets[index].hidden = !visible;
    }
  }

  /**
   * Get legend area for a specific item
   */
  public getLegendArea(index: number): { x: number; y: number; width: number; height: number } | undefined {
    return this.legendAreas.get(index);
  }

  /**
   * Clear legend areas
   */
  public clear(): void {
    this.legendItems = [];
    this.legendAreas.clear();
    this.hoverIndex = -1;
  }
}

/**
 * Generate colors for datasets
 */
export function generateDatasetColors(count: number): string[] {
  const colors: string[] = [];

  for (let i = 0; i < count; i++) {
    colors.push(DEFAULT_COLORS[i % DEFAULT_COLORS.length]);
  }

  return colors;
}

/**
 * Generate color scale for continuous data
 */
export function generateColorScale(value: number, min: number, max: number): string {
  const normalizedValue = (value - min) / (max - min);

  // Blue to red gradient
  const r = Math.round(normalizedValue * 255);
  const b = Math.round((1 - normalizedValue) * 255);

  return `rgb(${r}, 0, ${b})`;
}

/**
 * Generate diverging color scale
 */
export function generateDivergingColorScale(value: number, min: number, max: number): string {
  const mid = (min + max) / 2;
  const range = max - min;

  if (value < mid) {
    // Blue to white
    const normalizedValue = (value - min) / (mid - min);
    const intensity = Math.round(normalizedValue * 255);
    return `rgb(${intensity}, ${intensity}, 255)`;
  } else {
    // White to red
    const normalizedValue = (value - mid) / (max - mid);
    const intensity = Math.round(normalizedValue * 255);
    return `rgb(255, ${255 - intensity}, ${255 - intensity})`;
  }
}
