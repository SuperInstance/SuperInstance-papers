/**
 * Failover CLI Handler
 * Handles CLI failover operations
 */

import type { FailoverOrchestrator } from '../../failover/orchestrator.js';

// Mock handler - in production this would use actual orchestrator
let failoverOrchestrator: FailoverOrchestrator | null = null;

export async function failoverTrigger(region: string, options: {
  reason: string;
  createBackup: boolean;
  force: boolean;
}) {
  if (!failoverOrchestrator) {
    throw new Error('Failover orchestrator not initialized');
  }

  return await failoverOrchestrator.manualFailover(region, options.reason);
}

export async function failoverStatus(options: {
  includeHistory: boolean;
  historyLimit: number;
}) {
  if (!failoverOrchestrator) {
    throw new Error('Failover orchestrator not initialized');
  }

  const status = failoverOrchestrator.getStatus();

  return {
    ...status,
    history: options.includeHistory
      ? failoverOrchestrator.getHistory(options.historyLimit)
      : []
  };
}

export function setFailoverOrchestrator(orchestrator: FailoverOrchestrator) {
  failoverOrchestrator = orchestrator;
}
