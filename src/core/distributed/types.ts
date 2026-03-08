/**
 * POLLN Distributed Coordination Types
 * Distributed system types for multi-node coordination
 */

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface DistributedConfig {
  backend: 'redis' | 'nats' | 'memory';
  connectionString?: string;
  cluster?: boolean;
  nodeId: string;
  heartbeatIntervalMs: number;
  discoveryIntervalMs: number;
}

export interface NodeInfo {
  id: string;
  address: string;
  port: number;
  status: 'active' | 'inactive' | 'draining';
  load: number;
  agentCount: number;
  lastHeartbeat: number;
  capabilities: string[];
}

export interface PheromoneField {
  id: string;
  coordinates: number[];
  intensity: number;
  type: string;
  nodeId: string;
  createdAt: number;
  expiresAt: number;
}

export interface DistributedMessage {
  id: string;
  sourceNodeId: string;
  targetNodeId?: string;
  channel: string;
  payload: unknown;
  timestamp: number;
  requiresAck: boolean;
}

// ============================================================================
// CLUSTER TYPES
// ============================================================================

export interface ClusterState {
  nodes: Map<string, NodeInfo>;
  leader: string | null;
  epoch: number;
}

export interface ClusterMetrics {
  totalNodes: number;
  activeNodes: number;
  totalLoad: number;
  averageLoad: number;
  totalAgents: number;
}

// ============================================================================
// FEDERATION TYPES
// ============================================================================

export interface ColonyInfo {
  id: string;
  name: string;
  gardenerId: string;
  nodeId: string;
  agentCount: number;
  capabilities: string[];
  lastSync: number;
}

export interface FederationState {
  colonies: Map<string, ColonyInfo>;
  syncEpoch: number;
  pendingSync: Set<string>;
}

export interface FederationMessage {
  id: string;
  sourceColonyId: string;
  targetColonyId?: string;
  type: FederationMessageType;
  payload: unknown;
  timestamp: number;
}

export enum FederationMessageType {
  STATE_SYNC = 'STATE_SYNC',
  PATTERN_SHARE = 'PATTERN_SHARE',
  AGENT_MIGRATE = 'AGENT_MIGRATE',
  HEARTBEAT = 'HEARTBEAT',
  DISCOVERY = 'DISCOVERY',
  PHEROMONE_SYNC = 'PHEROMONE_SYNC',
}

// ============================================================================
// PHEROMONE FIELD TYPES
// ============================================================================

export interface PheromoneGradient {
  fieldId: string;
  direction: number[];
  magnitude: number;
  type: string;
}

export interface PheromoneQuery {
  coordinates: number[];
  radius?: number;
  types?: string[];
  minIntensity?: number;
}

export interface PheromoneUpdate {
  fieldId: string;
  deltaIntensity: number;
  nodeId: string;
  timestamp: number;
}

// ============================================================================
// DISCOVERY TYPES
// ============================================================================

export interface DiscoveryConfig {
  discoveryIntervalMs: number;
  heartbeatTimeoutMs: number;
}

export interface DiscoveryEvent {
  type: 'node_joined' | 'node_left' | 'node_updated' | 'leader_changed';
  nodeId: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

// ============================================================================
// LOAD BALANCING TYPES
// ============================================================================

export interface LoadBalancerConfig {
  strategy: 'round_robin' | 'least_loaded' | 'consistent_hash' | 'adaptive';
  maxLoadPerNode: number;
}

export interface LoadReport {
  nodeId: string;
  load: number;
  agentCount: number;
  cpuUsage: number;
  memoryUsage: number;
  timestamp: number;
}

// ============================================================================
// MESSAGE QUEUE TYPES
// ============================================================================

export interface MessageQueueConfig {
  maxSize: number;
  persistent: boolean;
  retryAttempts: number;
  retryDelayMs: number;
}

export interface QueuedMessage extends DistributedMessage {
  attempts: number;
  nextRetry: number;
  priority: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class DistributedError extends Error {
  constructor(
    message: string,
    public code: string,
    public nodeId?: string
  ) {
    super(message);
    this.name = 'DistributedError';
  }
}

export class NodeUnavailableError extends DistributedError {
  constructor(nodeId: string) {
    super(`Node ${nodeId} is unavailable`, 'NODE_UNAVAILABLE', nodeId);
    this.name = 'NodeUnavailableError';
  }
}

export class LeaderNotFoundError extends DistributedError {
  constructor() {
    super('No cluster leader found', 'LEADER_NOT_FOUND');
    this.name = 'LeaderNotFoundError';
  }
}

export class ConnectionError extends DistributedError {
  constructor(message: string, nodeId?: string) {
    super(message, 'CONNECTION_ERROR', nodeId);
    this.name = 'ConnectionError';
  }
}
