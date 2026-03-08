/**
 * Standard Labels for POLLN Metrics
 *
 * Provides consistent labeling across all metrics for proper aggregation and filtering
 */

/**
 * Standard label keys for all POLLN metrics
 */
export const LabelKeys = {
  // Core identity
  COLONY_ID: 'colony_id',
  AGENT_ID: 'agent_id',
  AGENT_TYPE: 'agent_type',
  KEEPER_ID: 'keeper_id',

  // Operation labels
  OPERATION: 'operation',
  OPERATION_TYPE: 'operation_type',
  STATUS: 'status',
  ERROR_TYPE: 'error_type',

  // Communication labels
  PACKAGE_TYPE: 'package_type',
  SOURCE_ID: 'source_id',
  TARGET_ID: 'target_id',
  COMMUNICATION_TYPE: 'communication_type',

  // KV-Cache labels
  CACHE_TYPE: 'cache_type',
  ANCHOR_ID: 'anchor_id',
  ANCHOR_TYPE: 'anchor_type',
  HIT_TYPE: 'hit_type', // 'exact', 'approximate', 'miss'

  // Federated learning labels
  FEDERATION_ID: 'federation_id',
  COLONY_COUNT: 'colony_count',
  ROUND_NUMBER: 'round_number',
  UPDATE_TYPE: 'update_type',

  // Dreaming labels
  DREAM_CYCLE: 'dream_cycle',
  DREAM_TYPE: 'dream_type',
  IMPROVEMENT_TYPE: 'improvement_type',

  // API labels
  ENDPOINT: 'endpoint',
  METHOD: 'method',
  CLIENT_ID: 'client_id',

  // System labels
  NODE_ID: 'node_id',
  CLUSTER_ID: 'cluster_id',
  REGION: 'region',
  ZONE: 'zone',

  // Resource labels
  RESOURCE_TYPE: 'resource_type',
  RESOURCE_ID: 'resource_id',

  // Tile labels
  TILE_TYPE: 'tile_type',
  TILE_CATEGORY: 'tile_category',

  // Guardian labels
  CONSTRAINT_ID: 'constraint_id',
  CONSTRAINT_CATEGORY: 'constraint_category',
  SEVERITY: 'severity',

  // LoRA labels
  LORA_ID: 'lora_id',
  EXPERT_TYPE: 'expert_type',
} as const;

/**
 * Standard status values
 */
export const StatusValues = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  ERROR: 'error',
  TIMEOUT: 'timeout',
  CANCELLED: 'cancelled',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
} as const;

/**
 * Agent type values
 */
export const AgentTypeValues = {
  TASK: 'task',
  ROLE: 'role',
  CORE: 'core',
  META: 'meta',
  LORA_ENHANCED: 'lora_enhanced',
} as const;

/**
 * Operation type values
 */
export const OperationTypeValues = {
  // Agent operations
  AGENT_SPAWN: 'agent_spawn',
  AGENT_EXECUTE: 'agent_execute',
  AGENT_TERMINATE: 'agent_terminate',

  // Communication operations
  A2A_SEND: 'a2a_send',
  A2A_RECEIVE: 'a2a_receive',
  A2A_PROCESS: 'a2a_process',

  // Learning operations
  HEBBIAN_UPDATE: 'hebbian_update',
  VALUE_UPDATE: 'value_update',
  DREAM_CYCLE: 'dream_cycle',

  // Cache operations
  CACHE_LOOKUP: 'cache_lookup',
  CACHE_STORE: 'cache_store',
  ANCHOR_MATCH: 'anchor_match',

  // Federation operations
  FEDERATION_SYNC: 'federation_sync',
  FEDERATION_AGGREGATE: 'federation_aggregate',

  // API operations
  API_REQUEST: 'api_request',
  WEBSOCKET_CONNECT: 'websocket_connect',
  WEBSOCKET_MESSAGE: 'websocket_message',

  // Safety operations
  SAFETY_CHECK: 'safety_check',
  GUARDIAN_EVALUATE: 'guardian_evaluate',

  // Dream operations
  DREAM_GENERATE: 'dream_generate',
  DREAM_OPTIMIZE: 'dream_optimize',
  TILE_DREAM: 'tile_dream',
} as const;

/**
 * Label builder utility
 */
export class LabelBuilder {
  private labels: Record<string, string> = {};

  /**
   * Add a label
   */
  with(key: string, value: string): LabelBuilder {
    this.labels[key] = value;
    return this;
  }

  /**
   * Add colony ID
   */
  withColony(colonyId: string): LabelBuilder {
    return this.with(LabelKeys.COLONY_ID, colonyId);
  }

  /**
   * Add agent info
   */
  withAgent(agentId: string, agentType: string): LabelBuilder {
    return this
      .with(LabelKeys.AGENT_ID, agentId)
      .with(LabelKeys.AGENT_TYPE, agentType);
  }

  /**
   * Add operation
   */
  withOperation(operation: string): LabelBuilder {
    return this.with(LabelKeys.OPERATION, operation);
  }

  /**
   * Add status
   */
  withStatus(status: string): LabelBuilder {
    return this.with(LabelKeys.STATUS, status);
  }

  /**
   * Add error info
   */
  withError(errorType: string): LabelBuilder {
    return this
      .with(LabelKeys.STATUS, StatusValues.ERROR)
      .with(LabelKeys.ERROR_TYPE, errorType);
  }

  /**
   * Add cache info
   */
  withCache(cacheType: string, hitType: string): LabelBuilder {
    return this
      .with(LabelKeys.CACHE_TYPE, cacheType)
      .with(LabelKeys.HIT_TYPE, hitType);
  }

  /**
   * Add API info
   */
  withApi(endpoint: string, method: string): LabelBuilder {
    return this
      .with(LabelKeys.ENDPOINT, endpoint)
      .with(LabelKeys.METHOD, method);
  }

  /**
   * Add federation info
   */
  withFederation(federationId: string, colonyCount: number): LabelBuilder {
    return this
      .with(LabelKeys.FEDERATION_ID, federationId)
      .with(LabelKeys.COLONY_COUNT, colonyCount.toString());
  }

  /**
   * Add dream info
   */
  withDream(cycle: number, dreamType: string): LabelBuilder {
    return this
      .with(LabelKeys.DREAM_CYCLE, cycle.toString())
      .with(LabelKeys.DREAM_TYPE, dreamType);
  }

  /**
   * Build labels object
   */
  build(): Record<string, string> {
    return { ...this.labels };
  }

  /**
   * Build labels array (for some exporters)
   */
  buildArray(): [string, string][] {
    return Object.entries(this.labels);
  }

  /**
   * Clear all labels
   */
  clear(): LabelBuilder {
    this.labels = {};
    return this;
  }
}

/**
 * Create a label builder with common labels pre-populated
 */
export function createLabelBuilder(baseLabels?: Record<string, string>): LabelBuilder {
  const builder = new LabelBuilder();
  if (baseLabels) {
    Object.entries(baseLabels).forEach(([key, value]) => {
      builder.with(key, value);
    });
  }
  return builder;
}
