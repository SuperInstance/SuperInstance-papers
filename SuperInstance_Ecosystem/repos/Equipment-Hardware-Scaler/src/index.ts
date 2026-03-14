/**
 * Equipment Hardware Scaler
 * Auto-scales across hardware resources with cloud API overflow support
 */

// Main exports
export { HardwareScaler, type HardwareScalerConfig, type ScalerStats } from './HardwareScaler';
export { ResourceMonitor, type ResourceMetrics, type ResourceType } from './ResourceMonitor';
export { CloudBridge, type CloudProvider, type CloudConfig, type CloudTask, type CloudResult } from './CloudBridge';
export { AdaptiveScheduler, type Task, type TaskPriority, type SchedulingDecision } from './AdaptiveScheduler';

// Types for convenience
export type {
  ResourceMetrics,
  ResourceType,
  CloudProvider,
  CloudConfig,
  CloudTask,
  CloudResult,
  Task,
  TaskPriority,
  SchedulingDecision,
  HardwareScalerConfig,
  ScalerStats
};

// Version
export const VERSION = '1.0.0';

// Default export
export { HardwareScaler as default } from './HardwareScaler';
