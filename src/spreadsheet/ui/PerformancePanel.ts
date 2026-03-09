/**
 * POLLN Spreadsheet - PerformancePanel
 *
 * Real-time performance monitoring panel.
 * Displays FPS, memory, latency, and custom metrics.
 */

import { MetricsCollector, PerformanceScorecard } from '../performance/MetricsCollector.js';
import { VirtualGrid } from '../performance/VirtualGrid.js';
import { CellPool } from '../performance/CellPool.js';
import { BatchScheduler } from '../performance/BatchScheduler.js';

export interface PerformancePanelConfig {
  container: HTMLElement;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  updateInterval?: number;
  showFPS?: boolean;
  showMemory?: boolean;
  showLatency?: boolean;
  showCustom?: boolean;
}

/**
 * PerformancePanel - Visual performance monitoring
 *
 * Features:
 * - Real-time FPS counter
 * - Memory usage gauge
 * - Latency percentile display
 * - Custom metric charts
 * - Performance scorecard
 */
export class PerformancePanel {
  private config: PerformancePanelConfig;
  private container: HTMLElement;
  private panel: HTMLElement;
  private metricsCollector: MetricsCollector;

  // Components to monitor
  private virtualGrid?: VirtualGrid;
  private cellPool?: CellPool;
  private batchScheduler?: BatchScheduler;

  // UI elements
  private fpsElement?: HTMLElement;
  private memoryElement?: HTMLElement;
  private latencyElement?: HTMLElement;
  private scorecardElement?: HTMLElement;
  private customMetricsElement?: HTMLElement;

  // Update interval
  private intervalId: NodeJS.Timeout | null = null;

  // FPS history for sparkline
  private fpsHistory: number[] = [];
  private maxFpsHistory = 60;

  constructor(
    config: PerformancePanelConfig,
    metricsCollector: MetricsCollector
  ) {
    this.config = {
      position: 'top-right',
      updateInterval: 1000,
      showFPS: true,
      showMemory: true,
      showLatency: true,
      showCustom: true,
      ...config,
    };

    this.container = config.container;
    this.metricsCollector = metricsCollector;

    this.panel = this.createPanel();
    this.initializeUI();
    this.startUpdates();
  }

  /**
   * Set components to monitor
   */
  setComponents(components: {
    virtualGrid?: VirtualGrid;
    cellPool?: CellPool;
    batchScheduler?: BatchScheduler;
  }): void {
    this.virtualGrid = components.virtualGrid;
    this.cellPool = components.cellPool;
    this.batchScheduler = components.batchScheduler;
  }

  /**
   * Create panel element
   */
  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'polln-performance-panel';
    panel.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 11px;
      padding: 12px;
      border-radius: 8px;
      z-index: 10000;
      min-width: 200px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
    `;

    this.setPosition(panel);
    return panel;
  }

  /**
   * Set panel position
   */
  private setPosition(panel: HTMLElement): void {
    const positions = {
      'top-left': { top: '10px', left: '10px' },
      'top-right': { top: '10px', right: '10px' },
      'bottom-left': { bottom: '10px', left: '10px' },
      'bottom-right': { bottom: '10px', right: '10px' },
    };

    const pos = positions[this.config.position!];
    Object.assign(panel.style, pos);
  }

  /**
   * Initialize UI elements
   */
  private initializeUI(): void {
    // Header
    const header = document.createElement('div');
    header.textContent = '⚡ Performance';
    header.style.cssText = `
      font-weight: bold;
      margin-bottom: 10px;
      font-size: 12px;
      color: #4CAF50;
    `;
    this.panel.appendChild(header);

    // FPS section
    if (this.config.showFPS) {
      this.fpsElement = this.createMetricSection('FPS', '60', 'fps');
      this.panel.appendChild(this.fpsElement);
    }

    // Memory section
    if (this.config.showMemory) {
      this.memoryElement = this.createMetricSection('Memory', '0', 'MB');
      this.panel.appendChild(this.memoryElement);
    }

    // Latency section
    if (this.config.showLatency) {
      this.latencyElement = this.createMetricSection('Latency', '0', 'ms');
      this.panel.appendChild(this.latencyElement);
    }

    // Scorecard section
    if (this.config.showFPS || this.config.showMemory || this.config.showLatency) {
      this.scorecardElement = this.createScorecardSection();
      this.panel.appendChild(this.scorecardElement);
    }

    // Custom metrics section
    if (this.config.showCustom) {
      this.customMetricsElement = this.createCustomMetricsSection();
      this.panel.appendChild(this.customMetricsElement);
    }

    // Add panel to container
    this.container.appendChild(this.panel);
  }

  /**
   * Create metric section
   */
  private createMetricSection(
    label: string,
    value: string,
    unit: string
  ): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const labelElement = document.createElement('span');
    labelElement.textContent = label;
    labelElement.style.color = '#aaa';

    const valueElement = document.createElement('span');
    valueElement.textContent = value;
    valueElement.style.cssText = `
      font-weight: bold;
      color: #4CAF50;
    `;

    const unitElement = document.createElement('span');
    unitElement.textContent = unit;
    unitElement.style.cssText = `
      color: #888;
      font-size: 10px;
      margin-left: 4px;
    `;

    const valueContainer = document.createElement('div');
    valueContainer.style.display = 'flex';
    valueContainer.appendChild(valueElement);
    valueContainer.appendChild(unitElement);

    section.appendChild(labelElement);
    section.appendChild(valueContainer);

    return section;
  }

  /**
   * Create scorecard section
   */
  private createScorecardSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #444;
    `;

    const label = document.createElement('div');
    label.textContent = 'Overall Status';
    label.style.cssText = `
      font-size: 10px;
      color: #888;
      margin-bottom: 4px;
    `;

    const statusElement = document.createElement('div');
    statusElement.id = 'polln-performance-status';
    statusElement.textContent = 'GOOD';
    statusElement.style.cssText = `
      font-weight: bold;
      font-size: 14px;
      text-align: center;
      padding: 4px;
      border-radius: 4px;
      background: #4CAF50;
      color: #fff;
    `;

    section.appendChild(label);
    section.appendChild(statusElement);

    return section;
  }

  /**
   * Create custom metrics section
   */
  private createCustomMetricsSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #444;
      display: none;
    `;
    section.id = 'polln-custom-metrics';

    const label = document.createElement('div');
    label.textContent = 'Custom Metrics';
    label.style.cssText = `
      font-size: 10px;
      color: #888;
      margin-bottom: 6px;
    `;

    const metricsContainer = document.createElement('div');
    metricsContainer.id = 'polln-custom-metrics-container';

    section.appendChild(label);
    section.appendChild(metricsContainer);

    return section;
  }

  /**
   * Start updates
   */
  private startUpdates(): void {
    this.intervalId = setInterval(() => {
      this.update();
    }, this.config.updateInterval);
  }

  /**
   * Stop updates
   */
  stopUpdates(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Update panel
   */
  private update(): void {
    const metrics = this.metricsCollector.getMetrics();
    const scorecard = this.metricsCollector.getScorecard();

    // Update FPS
    if (this.fpsElement) {
      this.updateMetric(
        this.fpsElement,
        metrics.fps.toFixed(1),
        this.getFpsColor(metrics.fps)
      );

      // Update FPS history
      this.fpsHistory.push(metrics.fps);
      if (this.fpsHistory.length > this.maxFpsHistory) {
        this.fpsHistory.shift();
      }
    }

    // Update Memory
    if (this.memoryElement) {
      const usedMB = (metrics.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1);
      this.updateMetric(
        this.memoryElement,
        usedMB,
        this.getMemoryColor(metrics.memoryUsage.usagePercentage)
      );
    }

    // Update Latency
    if (this.latencyElement) {
      this.updateMetric(
        this.latencyElement,
        metrics.latency.p95.toFixed(1),
        this.getLatencyColor(metrics.latency.p95)
      );
    }

    // Update scorecard
    if (this.scorecardElement) {
      this.updateScorecard(scorecard);
    }

    // Update custom metrics
    if (this.customMetricsElement) {
      this.updateCustomMetrics(metrics);
    }
  }

  /**
   * Update metric element
   */
  private updateMetric(
    element: HTMLElement,
    value: string,
    color: string
  ): void {
    const valueElement = element.querySelector('span:nth-child(2) > span:first-child') as HTMLElement;
    if (valueElement) {
      valueElement.textContent = value;
      valueElement.style.color = color;
    }
  }

  /**
   * Update scorecard
   */
  private updateScorecard(scorecard: PerformanceScorecard): void {
    const statusElement = this.panel.querySelector(
      '#polln-performance-status'
    ) as HTMLElement;

    if (statusElement) {
      const status = scorecard.overall.toUpperCase();
      statusElement.textContent = status;

      const colors = {
        good: '#4CAF50',
        ok: '#FF9800',
        poor: '#f44336',
      };

      statusElement.style.background = colors[scorecard.overall];
    }
  }

  /**
   * Update custom metrics
   */
  private updateCustomMetrics(metrics: any): void {
    const container = this.panel.querySelector(
      '#polln-custom-metrics-container'
    ) as HTMLElement;

    if (!container) return;

    // Clear existing metrics
    container.innerHTML = '';

    // Add component metrics
    if (this.virtualGrid) {
      const vGridMetrics = this.virtualGrid.getMetrics();
      this.addCustomMetric(container, 'Visible Cells', vGridMetrics.visibleCellCount);
      this.addCustomMetric(container, 'Cached Cells', vGridMetrics.cachedCellCount);
    }

    if (this.cellPool) {
      const poolStats = this.cellPool.getStats();
      if (poolStats) {
        this.addCustomMetric(container, 'Pool Reuse Rate', `${(poolStats.reuseRate * 100).toFixed(1)}%`);
      }
    }

    if (this.batchScheduler) {
      const batchMetrics = this.batchScheduler.getMetrics();
      this.addCustomMetric(container, 'Pending Tasks', batchMetrics.pendingTasks);
    }

    // Show custom metrics section if there are metrics
    const section = this.panel.querySelector(
      '#polln-custom-metrics'
    ) as HTMLElement;
    if (section) {
      section.style.display = container.children.length > 0 ? 'block' : 'none';
    }
  }

  /**
   * Add custom metric
   */
  private addCustomMetric(
    container: HTMLElement,
    label: string,
    value: string | number
  ): void {
    const metric = document.createElement('div');
    metric.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    `;

    const labelElement = document.createElement('span');
    labelElement.textContent = label;
    labelElement.style.color = '#888';

    const valueElement = document.createElement('span');
    valueElement.textContent = String(value);
    valueElement.style.color = '#4CAF50';

    metric.appendChild(labelElement);
    metric.appendChild(valueElement);
    container.appendChild(metric);
  }

  /**
   * Get FPS color
   */
  private getFpsColor(fps: number): string {
    if (fps >= 55) return '#4CAF50'; // Green
    if (fps >= 30) return '#FF9800'; // Orange
    return '#f44336'; // Red
  }

  /**
   * Get memory color
   */
  private getMemoryColor(usage: number): string {
    if (usage < 70) return '#4CAF50';
    if (usage < 90) return '#FF9800';
    return '#f44336';
  }

  /**
   * Get latency color
   */
  private getLatencyColor(latency: number): string {
    if (latency < 16) return '#4CAF50';
    if (latency < 50) return '#FF9800';
    return '#f44336';
  }

  /**
   * Export FPS history
   */
  getFpsHistory(): number[] {
    return [...this.fpsHistory];
  }

  /**
   * Get current FPS
   */
  getCurrentFPS(): number {
    return this.fpsHistory[this.fpsHistory.length - 1] || 0;
  }

  /**
   * Toggle visibility
   */
  toggle(): void {
    this.panel.style.display =
      this.panel.style.display === 'none' ? 'block' : 'none';
  }

  /**
   * Show panel
   */
  show(): void {
    this.panel.style.display = 'block';
  }

  /**
   * Hide panel
   */
  hide(): void {
    this.panel.style.display = 'none';
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopUpdates();
    this.panel.remove();
  }
}
