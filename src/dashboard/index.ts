/**
 * Multi-Colony Dashboard
 * Visualization and monitoring for multi-colony orchestration
 */

import { EventEmitter } from 'events';
import type { ColonyOrchestrator } from '../core/colony-manager/index.js';
import { DashboardDataProvider } from './dashboard-data.js';

export interface DashboardConfig {
  updateInterval: number;
  historyLength: number;
  enableWebSocket: boolean;
  enableMetrics: boolean;
}

export class MultiColonyDashboard extends EventEmitter {
  public readonly id: string;
  private orchestrator: ColonyOrchestrator;
  private dataProvider: DashboardDataProvider;
  private config: DashboardConfig;
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(
    orchestrator: ColonyOrchestrator,
    config: Partial<DashboardConfig> = {}
  ) {
    super();

    this.id = `dashboard-${Date.now()}`;
    this.orchestrator = orchestrator;
    this.config = {
      updateInterval: 5000, // 5 seconds
      historyLength: 100,
      enableWebSocket: false,
      enableMetrics: true,
      ...config,
    };

    this.dataProvider = new DashboardDataProvider(orchestrator);
  }

  /**
   * Start the dashboard
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.updateInterval = setInterval(async () => {
      try {
        const data = await this.dataProvider.getDashboardData();
        this.emit('update', data);
      } catch (error) {
        this.emit('error', error);
      }
    }, this.config.updateInterval);

    this.emit('started');
  }

  /**
   * Stop the dashboard
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.isRunning = false;
    this.emit('stopped');
  }

  /**
   * Get current dashboard data
   */
  async getData() {
    return this.dataProvider.getDashboardData();
  }

  /**
   * Get dashboard summary
   */
  async getSummary() {
    return this.dataProvider.getSummary();
  }

  /**
   * Get colony data
   */
  async getColonies() {
    return this.dataProvider.getColonies();
  }

  /**
   * Get topology data
   */
  async getTopology() {
    return this.dataProvider.getTopology();
  }

  /**
   * Get alerts
   */
  async getAlerts() {
    return this.dataProvider.getAlerts();
  }

  /**
   * Get trends
   */
  async getTrends() {
    return this.dataProvider.getTrends();
  }

  /**
   * Clear trend history
   */
  clearHistory(): void {
    this.dataProvider.clearTrendHistory();
  }

  /**
   * Check if dashboard is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get dashboard configuration
   */
  getConfig(): DashboardConfig {
    return { ...this.config };
  }

  /**
   * Update dashboard configuration
   */
  updateConfig(updates: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...updates };

    // Restart if interval changed
    if (updates.updateInterval && this.isRunning) {
      this.stop();
      this.start();
    }

    this.emit('config_updated', this.config);
  }
}

/**
 * Create a dashboard instance
 */
export function createDashboard(
  orchestrator: ColonyOrchestrator,
  config?: Partial<DashboardConfig>
): MultiColonyDashboard {
  return new MultiColonyDashboard(orchestrator, config);
}

export { DashboardDataProvider };
