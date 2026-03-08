/**
 * Consistency Checker
 * Validates backup data integrity and consistency
 */

import type {
  ConsistencyCheckResult,
  ConsistencyCheckOptions,
  ConsistencyIssue,
  ConsistencyRepair,
  ColonyBackupData
} from './types.js';
import type { Colony } from '../core/colony.js';

export interface ConsistencyCheckerConfig {
  colony: Colony;
}

/**
 * ConsistencyChecker - Backup data consistency validation
 */
export class ConsistencyChecker {
  private colony: Colony;

  constructor(config: ConsistencyCheckerConfig) {
    this.colony = config.colony;
  }

  /**
   * Check consistency of backup data
   */
  async checkConsistency(
    data: ColonyBackupData,
    options: ConsistencyCheckOptions = {}
  ): Promise<ConsistencyCheckResult> {
    const issues: ConsistencyIssue[] = [];
    const repairs: ConsistencyRepair[] = [];

    // Check agent references
    if (options.checkAgentReferences !== false) {
      const agentIssues = await this.checkAgentReferences(data);
      issues.push(...agentIssues.issues);
      if (options.repairIssues) {
        repairs.push(...agentIssues.repairs);
      }
    }

    // Check synapse integrity
    if (options.checkSynapseIntegrity !== false) {
      const synapseIssues = await this.checkSynapseIntegrity(data);
      issues.push(...synapseIssues.issues);
      if (options.repairIssues) {
        repairs.push(...synapseIssues.repairs);
      }
    }

    // Check value network
    if (options.checkValueNetwork !== false) {
      const valueNetworkIssues = await this.checkValueNetwork(data);
      issues.push(...valueNetworkIssues.issues);
      if (options.repairIssues) {
        repairs.push(...valueNetworkIssues.repairs);
      }
    }

    // Check KV cache integrity
    if (options.checkKVCacheIntegrity !== false) {
      const kvCacheIssues = await this.checkKVCacheIntegrity(data);
      issues.push(...kvCacheIssues.issues);
      if (options.repairIssues) {
        repairs.push(...kvCacheIssues.repairs);
      }
    }

    // Check meadow consistency
    if (options.checkMeadowConsistency !== false) {
      const meadowIssues = await this.checkMeadowConsistency(data);
      issues.push(...meadowIssues.issues);
      if (options.repairIssues) {
        repairs.push(...meadowIssues.repairs);
      }
    }

    // Check federated state
    if (options.checkFederatedState !== false) {
      const federatedIssues = await this.checkFederatedState(data);
      issues.push(...federatedIssues.issues);
      if (options.repairIssues) {
        repairs.push(...federatedIssues.repairs);
      }
    }

    // Check tile dependencies
    if (options.checkTileDependencies !== false) {
      const tileIssues = await this.checkTileDependencies(data);
      issues.push(...tileIssues.issues);
      if (options.repairIssues) {
        repairs.push(...tileIssues.repairs);
      }
    }

    // Calculate summary
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length;
    const repaired = repairs.filter(r => r.result === 'SUCCESS').length;
    const unrepairable = issues.filter(i => !i.repairable).length;

    return {
      passed: criticalIssues === 0,
      issues,
      repairs,
      summary: {
        totalIssues: issues.length,
        criticalIssues,
        repaired,
        unrepairable
      }
    };
  }

  /**
   * Check agent references
   */
  private async checkAgentReferences(data: ColonyBackupData): Promise<{
    issues: ConsistencyIssue[];
    repairs: ConsistencyRepair[];
  }> {
    const issues: ConsistencyIssue[] = [];
    const repairs: ConsistencyRepair[] = [];

    const agentIds = new Set(data.agents.map(a => a.id));

    // Check for duplicate agent IDs
    const seenIds = new Set<string>();
    for (const agent of data.agents) {
      if (seenIds.has(agent.id)) {
        issues.push({
          type: 'INCONSISTENT_STATE',
          severity: 'ERROR',
          component: 'agents',
          entityId: agent.id,
          message: 'Duplicate agent ID found',
          repairable: true
        });
      }
      seenIds.add(agent.id);
    }

    // Check synapse references
    for (const synapse of data.synapses) {
      if (!agentIds.has(synapse.sourceAgentId)) {
        issues.push({
          type: 'BROKEN_REFERENCE',
          severity: 'ERROR',
          component: 'synapses',
          entityId: synapse.id,
          message: `Synapse references non-existent source agent: ${synapse.sourceAgentId}`,
          repairable: false
        });
      }

      if (!agentIds.has(synapse.targetAgentId)) {
        issues.push({
          type: 'BROKEN_REFERENCE',
          severity: 'ERROR',
          component: 'synapses',
          entityId: synapse.id,
          message: `Synapse references non-existent target agent: ${synapse.targetAgentId}`,
          repairable: false
        });
      }
    }

    return { issues, repairs };
  }

  /**
   * Check synapse integrity
   */
  private async checkSynapseIntegrity(data: ColonyBackupData): Promise<{
    issues: ConsistencyIssue[];
    repairs: ConsistencyRepair[];
  }> {
    const issues: ConsistencyIssue[] = [];
    const repairs: ConsistencyRepair[] = [];

    for (const synapse of data.synapses) {
      // Check weight range
      if (synapse.weight < 0 || synapse.weight > 1) {
        issues.push({
          type: 'INTEGRITY_ERROR',
          severity: 'WARNING',
          component: 'synapses',
          entityId: synapse.id,
          message: `Synapse weight out of range [0,1]: ${synapse.weight}`,
          repairable: true
        });

        // Add repair
        repairs.push({
          issueId: synapse.id,
          action: 'REPAIR',
          description: `Clamp weight to [0,1]`,
          result: 'PENDING'
        });
      }

      // Check coactivation count consistency
      if (synapse.coactivationCount < 0) {
        issues.push({
          type: 'INCONSISTENT_STATE',
          severity: 'ERROR',
          component: 'synapses',
          entityId: synapse.id,
          message: 'Negative coactivation count',
          repairable: true
        });
      }
    }

    return { issues, repairs };
  }

  /**
   * Check value network
   */
  private async checkValueNetwork(data: ColonyBackupData): Promise<{
    issues: ConsistencyIssue[];
    repairs: ConsistencyRepair[];
  }> {
    const issues: ConsistencyIssue[] = [];
    const repairs: ConsistencyRepair[] = [];

    // Check if value network has required fields
    if (!data.valueNetwork.parameters) {
      issues.push({
        type: 'MISSING_DEPENDENCY',
        severity: 'ERROR',
        component: 'valueNetwork',
        message: 'Value network parameters missing',
        repairable: false
      });
    }

    // Check update count
    if (data.valueNetwork.updateCount < 0) {
      issues.push({
        type: 'INCONSISTENT_STATE',
        severity: 'WARNING',
        component: 'valueNetwork',
        message: 'Negative update count',
        repairable: true
      });
    }

    return { issues, repairs };
  }

  /**
   * Check KV cache integrity
   */
  private async checkKVCacheIntegrity(data: ColonyBackupData): Promise<{
    issues: ConsistencyIssue[];
    repairs: ConsistencyRepair[];
  }> {
    const issues: ConsistencyIssue[] = [];
    const repairs: ConsistencyRepair[] = [];

    // Check for duplicate anchor IDs
    const anchorIds = new Set<string>();
    for (const anchor of data.kvCache.anchors) {
      if (anchorIds.has(anchor.id)) {
        issues.push({
          type: 'INCONSISTENT_STATE',
          severity: 'ERROR',
          component: 'kvCache',
          entityId: anchor.id,
          message: 'Duplicate KV anchor ID',
          repairable: true
        });
      }
      anchorIds.add(anchor.id);
    }

    // Check anchor embeddings
    for (const anchor of data.kvCache.anchors) {
      if (!anchor.embedding || anchor.embedding.length === 0) {
        issues.push({
          type: 'MISSING_DEPENDENCY',
          severity: 'WARNING',
          component: 'kvCache',
          entityId: anchor.id,
          message: 'KV anchor missing embedding',
          repairable: false
        });
      }

      // Check token array
      if (!anchor.tokens || anchor.tokens.length === 0) {
        issues.push({
          type: 'MISSING_DEPENDENCY',
          severity: 'WARNING',
          component: 'kvCache',
          entityId: anchor.id,
          message: 'KV anchor missing tokens',
          repairable: false
        });
      }
    }

    return { issues, repairs };
  }

  /**
   * Check meadow consistency
   */
  private async checkMeadowConsistency(data: ColonyBackupData): Promise<{
    issues: ConsistencyIssue[];
    repairs: ConsistencyRepair[];
  }> {
    const issues: ConsistencyIssue[] = [];
    const repairs: ConsistencyRepair[] = [];

    // Check pattern IDs
    const patternIds = new Set(data.meadow.patterns.map(p => p.id));
    const seenIds = new Set<string>();

    for (const pattern of data.meadow.patterns) {
      if (seenIds.has(pattern.id)) {
        issues.push({
          type: 'INCONSISTENT_STATE',
          severity: 'ERROR',
          component: 'meadow',
          entityId: pattern.id,
          message: 'Duplicate pattern ID',
          repairable: true
        });
      }
      seenIds.add(pattern.id);

      // Check pattern embedding
      if (!pattern.embedding || pattern.embedding.length === 0) {
        issues.push({
          type: 'MISSING_DEPENDENCY',
          severity: 'WARNING',
          component: 'meadow',
          entityId: pattern.id,
          message: 'Pattern missing embedding',
          repairable: false
        });
      }
    }

    // Check contribution references
    for (const contributorId of Object.keys(data.meadow.contributions)) {
      if (!patternIds.has(contributorId)) {
        issues.push({
          type: 'BROKEN_REFERENCE',
          severity: 'WARNING',
          component: 'meadow',
          message: `Contribution references non-existent pattern: ${contributorId}`,
          repairable: true
        });
      }
    }

    return { issues, repairs };
  }

  /**
   * Check federated state
   */
  private async checkFederatedState(data: ColonyBackupData): Promise<{
    issues: ConsistencyIssue[];
    repairs: ConsistencyRepair[];
  }> {
    const issues: ConsistencyIssue[] = [];
    const repairs: ConsistencyRepair[] = [];

    // Check round number
    if (data.federated.roundNumber < 0) {
      issues.push({
        type: 'INCONSISTENT_STATE',
        severity: 'WARNING',
        component: 'federated',
        message: 'Negative federated round number',
        repairable: true
      });
    }

    // Check participant IDs
    if (!data.federated.participantIds || data.federated.participantIds.length === 0) {
      // This might be valid if no federation has occurred
      issues.push({
        type: 'MISSING_DEPENDENCY',
        severity: 'INFO',
        component: 'federated',
        message: 'No federation participants',
        repairable: false
      });
    }

    return { issues, repairs };
  }

  /**
   * Check tile dependencies
   */
  private async checkTileDependencies(data: ColonyBackupData): Promise<{
    issues: ConsistencyIssue[];
    repairs: ConsistencyRepair[];
  }> {
    const issues: ConsistencyIssue[] = [];
    const repairs: ConsistencyRepair[] = [];

    const tileIds = new Set(data.tiles.map(t => t.id));
    const agentIds = new Set(data.agents.map(a => a.id));

    // Check tile dependencies on agents
    for (const tile of data.tiles) {
      if (tile.config.agentId && !agentIds.has(tile.config.agentId as string)) {
        issues.push({
          type: 'BROKEN_REFERENCE',
          severity: 'ERROR',
          component: 'tiles',
          entityId: tile.id,
          message: `Tile references non-existent agent: ${tile.config.agentId}`,
          repairable: false
        });
      }
    }

    // Check META tile dependencies
    for (const metaTile of data.metaTiles) {
      if (!tileIds.has(metaTile.id)) {
        issues.push({
          type: 'BROKEN_REFERENCE',
          severity: 'ERROR',
          component: 'metaTiles',
          entityId: metaTile.id,
          message: 'META tile ID not found in tiles',
          repairable: false
        });
      }
    }

    return { issues, repairs };
  }
}
