/**
 * POLLN Spreadsheet - TooltipManager
 *
 * Manages chart tooltips with hover detection, positioning, and custom formatting.
 * Supports multi-value tooltips and custom formatters.
 */

import {
  ChartData,
  ChartOptions,
  TooltipConfig,
  TooltipItem,
  TooltipContext,
  ChartElement,
  InteractionMode,
} from './types.js';

/**
 * Tooltip position options
 */
interface TooltipPosition {
  x: number;
  y: number;
  arrowX?: number;
  arrowY?: number;
}

/**
 * TooltipManager - Manages chart tooltips
 */
export class TooltipManager {
  private canvas: HTMLCanvasElement;
  private tooltipElement: HTMLDivElement | null = null;
  private isVisible = false;
  private currentElements: ChartElement[] = [];
  private currentPosition: TooltipPosition | null = null;
  private hideTimeout: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.createTooltipElement();
    this.setupEventListeners();
  }

  /**
   * Create tooltip DOM element
   */
  private createTooltipElement(): void {
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'polln-chart-tooltip';
    this.tooltipElement.style.position = 'absolute';
    this.tooltipElement.style.pointerEvents = 'none';
    this.tooltipElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.tooltipElement.style.color = '#fff';
    this.tooltipElement.style.padding = '8px 12px';
    this.tooltipElement.style.borderRadius = '4px';
    this.tooltipElement.style.fontSize = '12px';
    this.tooltipElement.style.fontFamily = 'Arial, sans-serif';
    this.tooltipElement.style.whiteSpace = 'nowrap';
    this.tooltipElement.style.zIndex = '1000';
    this.tooltipElement.style.opacity = '0';
    this.tooltipElement.style.transition = 'opacity 0.2s';
    this.tooltipElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';

    document.body.appendChild(this.tooltipElement);
  }

  /**
   * Setup event listeners for tooltip
   */
  private setupEventListeners(): void {
    // Tooltip will be shown/hide based on chart events
  }

  /**
   * Show tooltip for elements
   */
  public showTooltip(
    event: MouseEvent,
    elements: ChartElement[],
    data: ChartData,
    options: ChartOptions
  ): void {
    if (!elements || elements.length === 0) {
      this.hideTooltip();
      return;
    }

    const tooltipConfig = options.tooltip;
    if (tooltipConfig?.enabled === false) return;

    // Clear hide timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    this.currentElements = elements;
    this.currentPosition = this.calculatePosition(event, elements, tooltipConfig);

    // Build tooltip content
    const tooltipItems = this.buildTooltipItems(elements, data, options);
    const tooltipContent = this.formatTooltipContent(tooltipItems, tooltipConfig);

    // Update tooltip element
    if (this.tooltipElement) {
      this.tooltipElement.innerHTML = tooltipContent;
      this.positionTooltip(this.currentPosition);
      this.tooltipElement.style.opacity = '1';
      this.isVisible = true;
    }

    // Call external callback if provided
    if (tooltipConfig?.external) {
      const context = this.buildTooltipContext(tooltipItems, tooltipConfig);
      tooltipConfig.external(context);
    }
  }

  /**
   * Hide tooltip
   */
  public hideTooltip(): void {
    if (!this.isVisible) return;

    // Delay hiding for smooth UX
    this.hideTimeout = window.setTimeout(() => {
      if (this.tooltipElement) {
        this.tooltipElement.style.opacity = '0';
      }
      this.isVisible = false;
      this.currentElements = [];
      this.currentPosition = null;
    }, 100);
  }

  /**
   * Calculate tooltip position
   */
  private calculatePosition(
    event: MouseEvent,
    elements: ChartElement[],
    config?: TooltipConfig
  ): TooltipPosition {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    let x: number;
    let y: number;

    // Use element position if available
    if (elements.length === 1 && elements[0]) {
      const element = elements[0];
      const centerPoint = element.getCenterPoint();
      x = centerPoint.x;
      y = centerPoint.y;
    } else {
      // Average position for multiple elements
      const positions = elements.map(el => el.getCenterPoint());
      x = positions.reduce((sum, pos) => sum + pos.x, 0) / positions.length;
      y = positions.reduce((sum, pos) => sum + pos.y, 0) / positions.length;
    }

    // Adjust position based on config
    if (config?.position === 'nearest') {
      // Keep at mouse position
      x = mouseX;
      y = mouseY;
    }

    return { x, y };
  }

  /**
   * Position tooltip element
   */
  private positionTooltip(position: TooltipPosition): void {
    if (!this.tooltipElement) return;

    const rect = this.canvas.getBoundingClientRect();
    const tooltipRect = this.tooltipElement.getBoundingClientRect();

    let x = rect.left + position.x + 15;
    let y = rect.top + position.y - 10;

    // Prevent overflow on right edge
    if (x + tooltipRect.width > window.innerWidth) {
      x = rect.left + position.x - tooltipRect.width - 15;
    }

    // Prevent overflow on bottom edge
    if (y + tooltipRect.height > window.innerHeight) {
      y = window.innerHeight - tooltipRect.height - 10;
    }

    // Prevent overflow on top edge
    if (y < 10) {
      y = 10;
    }

    this.tooltipElement.style.left = `${x}px`;
    this.tooltipElement.style.top = `${y}px`;
  }

  /**
   * Build tooltip items from elements
   */
  private buildTooltipItems(
    elements: ChartElement[],
    data: ChartData,
    options: ChartOptions
  ): TooltipItem[] {
    const items: TooltipItem[] = [];

    elements.forEach(element => {
      const dataset = data.datasets[element.datasetIndex];
      const point = dataset.data[element.index];

      const tooltipItem: TooltipItem = {
        label: dataset.label,
        value: point.y,
        datasetIndex: element.datasetIndex,
        index: element.index,
        dataPoint: point,
        formattedValue: this.formatValue(point.y, options),
      };

      items.push(tooltipItem);
    });

    return items;
  }

  /**
   * Format tooltip content
   */
  private formatTooltipContent(items: TooltipItem[], config?: TooltipConfig): string {
    const callbacks = config?.callbacks;

    // Title
    let title = '';
    if (callbacks?.title) {
      title = callbacks.title(items);
      if (Array.isArray(title)) {
        title = title.join('<br>');
      }
    } else if (items.length > 0) {
      title = items[0].dataPoint.label ?? items[0].label;
    }

    // Body
    let body = '';
    if (callbacks?.beforeBody) {
      body += callbacks.beforeBody(items) + '<br>';
    }

    items.forEach((item, index) => {
      if (callbacks?.beforeLabel) {
        body += callbacks.beforeLabel(item) + '<br>';
      }

      if (callbacks?.label) {
        body += callbacks.label(item) + '<br>';
      } else {
        body += `<strong>${item.label}:</strong> ${item.formattedValue}<br>`;
      }

      if (callbacks?.afterLabel) {
        body += callbacks.afterLabel(item) + '<br>';
      }
    });

    if (callbacks?.afterBody) {
      body += callbacks.afterBody(items);
    }

    // Footer
    let footer = '';
    if (callbacks?.footer) {
      footer = callbacks.footer(items);
      if (Array.isArray(footer)) {
        footer = footer.join('<br>');
      }
    }

    // Combine all parts
    let html = '';
    if (title) {
      html += `<div style="margin-bottom: 6px; font-weight: bold;">${title}</div>`;
    }
    if (body) {
      html += `<div>${body}</div>`;
    }
    if (footer) {
      html += `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2);">${footer}</div>`;
    }

    return html;
  }

  /**
   * Format value for display
   */
  private formatValue(value: number, options: ChartOptions): string {
    if (options.tooltip?.callbacks?.label) {
      return options.tooltip.callbacks.label({
        label: '',
        value,
        datasetIndex: 0,
        index: 0,
        dataPoint: { x: 0, y: value },
      });
    }

    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Build tooltip context for external callback
   */
  private buildTooltipContext(items: TooltipItem[], config?: TooltipConfig): TooltipContext {
    const position = this.currentPosition ?? { x: 0, y: 0, width: 0, height: 0, caretX: 0, caretY: 0 };

    return {
      tooltip: position,
      dataPoints: items,
      title: items.map(item => item.dataPoint.label ?? item.label),
      body: items.map(item => item.formattedValue),
    };
  }

  /**
   * Check if tooltip is visible
   */
  public getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Get current tooltip elements
   */
  public getCurrentElements(): ChartElement[] {
    return this.currentElements;
  }

  /**
   * Set tooltip options
   */
  public setOptions(config: TooltipConfig): void {
    if (!this.tooltipElement) return;

    // Apply styles from config
    if (config.backgroundColor) {
      this.tooltipElement.style.backgroundColor = config.backgroundColor;
    }

    if (config.titleColor) {
      this.tooltipElement.style.color = config.titleColor;
    }

    if (config.titleFont) {
      this.tooltipElement.style.fontFamily = config.titleFont.family ?? 'Arial';
      this.tooltipElement.style.fontSize = `${config.titleFont.size ?? 12}px`;
      this.tooltipElement.style.fontWeight = config.titleFont.weight ?? 'normal';
    }

    if (config.padding) {
      this.tooltipElement.style.padding = `${config.padding}px`;
    }

    if (config.cornerRadius) {
      this.tooltipElement.style.borderRadius = `${config.cornerRadius}px`;
    }

    if (config.borderColor) {
      this.tooltipElement.style.border = `1px solid ${config.borderColor}`;
    }

    if (config.borderWidth) {
      this.tooltipElement.style.borderWidth = `${config.borderWidth}px`;
    }
  }

  /**
   * Destroy tooltip and cleanup
   */
  public destroy(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    if (this.tooltipElement && this.tooltipElement.parentNode) {
      this.tooltipElement.parentNode.removeChild(this.tooltipElement);
    }

    this.tooltipElement = null;
    this.currentElements = [];
    this.currentPosition = null;
    this.isVisible = false;
  }
}

/**
 * Default tooltip formatters
 */
export class TooltipFormatters {
  /**
   * Format number with commas
   */
  static number(value: number): string {
    return value.toLocaleString();
  }

  /**
   * Format currency
   */
  static currency(value: number, symbol: string = '$'): string {
    return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }

  /**
   * Format percentage
   */
  static percentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Format date
   */
  static date(date: Date | string, format: 'short' | 'medium' | 'long' = 'short'): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    switch (format) {
      case 'short':
        return d.toLocaleDateString();
      case 'medium':
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      case 'long':
        return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
  }

  /**
   * Format duration (seconds to HH:MM:SS)
   */
  static duration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format file size
   */
  static fileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Format with custom function
   */
  static custom(value: number, formatter: (value: number) => string): string {
    return formatter(value);
  }
}
