/**
 * MonitoringDashboard - Main equipment class for agent monitoring
 * 
 * Provides real-time visualization of agent activity, thinking processes,
 * cell states, and provenance chains in the SuperInstance ecosystem
 */

import type {
  Equipment,
  EquipmentSlot,
  OriginCore,
  Tile,
  CostMetrics,
  BenefitMetrics,
  TriggerThresholds,
  EquipmentDescription,
  Task,
  TaskResult,
} from '@superinstance/starter-agent';
import { ActivityTracker } from './ActivityTracker';
import { CellVisualizer } from './CellVisualizer';
import { RealTimeMonitor } from './RealTimeMonitor';
import { DashboardServer, DashboardServerOptions } from './DashboardServer';
import type { DashboardState, DashboardMetrics, HistoricalEntry, DashboardConfig } from './types';
import { DEFAULT_DASHBOARD_CONFIG } from './types';

export interface MonitoringDashboardConfig extends Partial<DashboardConfig> {
  enablePlayback: boolean;
  enableWebSocket: boolean;
  enableHttpServer: boolean;
  autoStart: boolean;
}

const DEFAULT_MONITORING_CONFIG: MonitoringDashboardConfig = {
  ...DEFAULT_DASHBOARD_CONFIG,
  enablePlayback: true,
  enableWebSocket: true,
  enableHttpServer: true,
  autoStart: true,
};

/**
 * MonitoringDashboard Equipment
 * 
 * Equips agents with real-time monitoring capabilities, providing:
 * - Live visualization of agent thinking and activity
 * - Cell-by-cell state display with confidence zones
 * - Provenance chain visualization
 * - Historical playback of agent decisions
 * - Equipment status monitoring
 */
export class MonitoringDashboard implements Equipment {
  readonly name = 'MonitoringDashboard';
  readonly slot: EquipmentSlot = 'MONITORING';
  readonly version = '1.0.0';
  readonly description = 'Real-time visualization equipment for monitoring agent activity, thinking, and cell states';

  readonly cost: CostMetrics = {
    memoryBytes: 50 * 1024 * 1024, // 50MB
    cpuPercent: 2,
    latencyMs: 5,
    costPerUse: 0.0001,
  };

  readonly benefit: BenefitMetrics = {
    accuracyBoost: 0,
    speedMultiplier: 1.0,
    confidenceBoost: 0.05,
    capabilityGain: ['visualization', 'debugging', 'auditing', 'observability'],
  };

  readonly triggerThresholds: TriggerThresholds = {
    equipWhen: [
      { metric: 'debug', operator: '==', value: 1 },
    ],
    unequipWhen: [
      { metric: 'memory', operator: '>', value: 80 },
    ],
    callTeacher: { low: 0.3, high: 0.95 },
  };

  private config: MonitoringDashboardConfig;
  private activityTracker: ActivityTracker;
  private cellVisualizer: CellVisualizer;
  private realTimeMonitor: RealTimeMonitor;
  private dashboardServer: DashboardServer | null = null;
  private agents: Map<string, OriginCore> = new Map();
  private isRunning: boolean = false;
  private originalProcessTask: ((task: Task) => Promise<TaskResult>) | null = null;

  constructor(config: Partial<MonitoringDashboardConfig> = {}) {
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config };
    this.activityTracker = new ActivityTracker({
      maxActivitiesStored: this.config.maxActivitiesStored,
    });
    this.cellVisualizer = new CellVisualizer();
    this.realTimeMonitor = new RealTimeMonitor(
      this.activityTracker,
      this.cellVisualizer,
      { port: this.config.port + 1 }
    );
  }

  /**
   * Equip the dashboard to an agent
   */
  async equip(agent: OriginCore): Promise<void> {
    // Register agent for monitoring
    this.agents.set(agent.id, agent);
    
    // Wrap processTask to track activities
    this.wrapAgentMethods(agent);
    
    // Start servers if not running and autoStart is enabled
    if (!this.isRunning && this.config.autoStart) {
      await this.start();
    }
    
    // Register with real-time monitor
    this.realTimeMonitor.registerAgent(agent);
    
    // Track equipment change
    this.activityTracker.trackEquipmentChange(
      agent.id,
      this.name,
      this.slot,
      'equip'
    );
  }

  /**
   * Unequip the dashboard from an agent
   */
  async unequip(agent: OriginCore): Promise<void> {
    // Unregister agent
    this.agents.delete(agent.id);
    
    // Restore original methods
    this.restoreAgentMethods(agent);
    
    // Unregister from real-time monitor
    this.realTimeMonitor.unregisterAgent(agent.id);
    
    // Track equipment change
    this.activityTracker.trackEquipmentChange(
      agent.id,
      this.name,
      this.slot,
      'unequip'
    );
    
    // Stop servers if no more agents
    if (this.agents.size === 0 && this.isRunning) {
      await this.stop();
    }
  }

  /**
   * Start the monitoring dashboard
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    // Start real-time monitor
    if (this.config.enableWebSocket) {
      await this.realTimeMonitor.start();
    }
    
    // Start HTTP server
    if (this.config.enableHttpServer) {
      const serverOptions: Partial<DashboardServerOptions> = {
        port: this.config.port,
        host: this.config.host,
        enablePlayback: this.config.enablePlayback,
      };
      
      this.dashboardServer = new DashboardServer(
        this.activityTracker,
        this.cellVisualizer,
        this.realTimeMonitor,
        serverOptions
      );
      
      await this.dashboardServer.start();
    }
    
    this.isRunning = true;
    console.log(`Monitoring Dashboard started on port ${this.config.port}`);
  }

  /**
   * Stop the monitoring dashboard
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    // Stop HTTP server
    if (this.dashboardServer) {
      await this.dashboardServer.stop();
      this.dashboardServer = null;
    }
    
    // Stop real-time monitor
    if (this.config.enableWebSocket) {
      await this.realTimeMonitor.stop();
    }
    
    this.isRunning = false;
    console.log('Monitoring Dashboard stopped');
  }

  /**
   * Get current dashboard state
   */
  getState(): DashboardState {
    return {
      agents: this.activityTracker.getAllAgentSnapshots(),
      cells: this.cellVisualizer.getAllCells(),
      activities: this.activityTracker.getActivities(),
      provenance: new Map(),
      timestamp: Date.now(),
    };
  }

  /**
   * Get dashboard metrics
   */
  getMetrics(): DashboardMetrics {
    if (this.dashboardServer) {
      return this.dashboardServer.getMetrics();
    }
    
    // Return basic metrics if server is not running
    const snapshots = this.activityTracker.getAllAgentSnapshots();
    return {
      totalAgents: snapshots.size,
      activeAgents: 0,
      totalCells: 0,
      confidenceDistribution: [],
      equipmentUsage: new Map(),
      averageProcessingTime: 0,
      throughputPerMinute: 0,
    };
  }

  /**
   * Get historical entries for playback
   */
  getHistory(from?: number, to?: number): HistoricalEntry[] {
    if (this.dashboardServer) {
      return this.dashboardServer.getHistory(from, to);
    }
    return [];
  }

  /**
   * Get activity tracker for direct access
   */
  getActivityTracker(): ActivityTracker {
    return this.activityTracker;
  }

  /**
   * Get cell visualizer for direct access
   */
  getCellVisualizer(): CellVisualizer {
    return this.cellVisualizer;
  }

  /**
   * Check if dashboard is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Describe the equipment
   */
  describe(): EquipmentDescription {
    return {
      name: this.name,
      slot: this.slot,
      purpose: 'Provides real-time visualization and monitoring of agent activity, thinking processes, and cell states',
      whenToUse: [
        'Debugging agent behavior',
        'Auditing decision-making processes',
        'Monitoring system health',
        'Analyzing provenance chains',
        'Real-time observability during development',
      ],
      whenToRemove: [
        'Production deployment without monitoring needs',
        'Memory-constrained environments',
        'High-throughput scenarios where overhead matters',
      ],
      dependencies: [],
      conflicts: [],
    };
  }

  /**
   * Convert to tile for composition
   */
  asTile(): Tile {
    return {
      inputType: { type: 'primitive', name: 'DashboardQuery' },
      outputType: { type: 'composite', name: 'DashboardResult' },
      compute: (input: unknown) => {
        const query = input as { type: string; params?: unknown };
        
        switch (query.type) {
          case 'state':
            return this.getState();
          case 'metrics':
            return this.getMetrics();
          case 'history':
            const params = query.params as { from?: number; to?: number } | undefined;
            return this.getHistory(params?.from, params?.to);
          default:
            return { error: 'Unknown query type' };
        }
      },
      confidence: () => 1.0,
      trace: (input: unknown) => {
        const query = input as { type: string };
        return `MonitoringDashboard.query(${query.type})`;
      },
    };
  }

  // Private methods

  private wrapAgentMethods(agent: OriginCore): void {
    // Store reference to original processTask if we can access it
    // Note: This is a simplified approach - in production, we'd use a more robust method
    
    // Track state changes periodically
    const updateInterval = setInterval(() => {
      if (this.agents.has(agent.id)) {
        this.activityTracker.updateAgentSnapshot(agent);
      } else {
        clearInterval(updateInterval);
      }
    }, this.config.updateIntervalMs);
  }

  private restoreAgentMethods(_agent: OriginCore): void {
    // Restore original methods if needed
    this.originalProcessTask = null;
  }
}

export default MonitoringDashboard;
