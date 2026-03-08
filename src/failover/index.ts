/**
 * Failover System
 * Automatic failover and disaster recovery
 */

export { FailoverOrchestrator } from './orchestrator.js';
export { FailureDetector } from './detector.js';
export { HealthChecker } from './health-check.js';
export { HotStandbyStrategy } from './strategies/hot-standby.js';
export { ColdStandbyStrategy } from './strategies/cold-standby.js';
export { MultiActiveStrategy } from './strategies/multi-active.js';

export type {
  FailoverConfig,
  FailoverEvent,
  FailoverResult,
  FailoverStatus,
  FailoverMode,
  FailureType,
  HealthCheckConfig,
  HealthCheckResult,
  HealthCheckDefinition,
  ColonyHealthStatus,
  FailureDetectionConfig,
  FailureDetectionResult,
  FailoverStrategyConfig,
  HotStandbyConfig,
  ColdStandbyConfig,
  MultiActiveConfig,
  RecoveryPlan,
  RecoveryResult
} from './types.js';
