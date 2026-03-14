/**
 * Equipment-Monitoring-Dashboard
 * 
 * Real-time visualization equipment for monitoring agent activity,
 * thinking processes, and cell states in the SuperInstance ecosystem
 * 
 * @packageDocumentation
 */

// Main equipment class
export { MonitoringDashboard } from './MonitoringDashboard';
export type { MonitoringDashboardConfig } from './MonitoringDashboard';

// Core components
export { ActivityTracker } from './ActivityTracker';
export type { ActivityTrackerConfig } from './ActivityTracker';

export { CellVisualizer } from './CellVisualizer';
export type { CellVisualizerConfig } from './CellVisualizer';

export { RealTimeMonitor } from './RealTimeMonitor';
export type { RealTimeMonitorConfig } from './RealTimeMonitor';

export { DashboardServer } from './DashboardServer';
export type { DashboardServerOptions } from './DashboardServer';

// Types
export type {
  AgentActivity,
  ActivityType,
  AgentSnapshot,
  ThinkingState,
  ThoughtStep,
  CellVisualization,
  ProvenanceVisualization,
  ProvenanceNode,
  ProvenanceEdge,
  DashboardState,
  DashboardConfig,
  DashboardMetrics,
  HistoricalEntry,
  PlaybackState,
  WebSocketMessage,
  MessageType,
  Subscription,
  SubscriptionFilter,
  ConfidenceZoneIndicator,
  EquipmentStatus,
  VisualizationTheme,
} from './types';

export {
  DEFAULT_THEME,
  DEFAULT_DASHBOARD_CONFIG,
  getConfidenceZone,
} from './types';

// Re-export types from starter-agent for convenience
export type {
  OriginCore,
  Equipment,
  EquipmentSlot,
  Tile,
  Task,
  TaskResult,
  ConfidenceZone,
  Cell,
  ProvenanceChain,
  Transformation,
  HistoryEntry,
  AgentState,
  Message,
} from './types';

/**
 * Quick setup function to create and start a monitoring dashboard
 */
export async function createMonitoringDashboard(
  config?: Partial<import('./MonitoringDashboard').MonitoringDashboardConfig>
): Promise<MonitoringDashboard> {
  const dashboard = new MonitoringDashboard(config);
  await dashboard.start();
  return dashboard;
}

/**
 * Default export
 */
export default MonitoringDashboard;
