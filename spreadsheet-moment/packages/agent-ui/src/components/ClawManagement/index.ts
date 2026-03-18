/**
 * Claw Management Components
 *
 * Components for managing Claw agents in the spreadsheet
 *
 * @packageDocumentation
 */

export { ClawManagementPanel } from './ClawManagementPanel';

export type { ClawManagementPanelProps } from './ClawManagementPanel';

export { useClawClient } from './useClawClient';
export { useClawRealtime } from './useClawRealtime';
export { useClawStats } from './useClawStats';

// Re-export hooks types
export type { UseClawClientConfig, UseClawClientReturn } from './useClawClient';
export type { UseClawRealtimeConfig, UseClawRealtimeReturn, RealtimeClawState } from './useClawRealtime';
export type { UseClawStatsConfig, UseClawStatsReturn, ClawStatsData, AggregatedStats } from './useClawStats';
