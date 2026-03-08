/**
 * POLLN API Client Types
 *
 * Re-exports of core types for client convenience
 */

// ============================================================================
// Core Types
// ============================================================================

export interface ColonyStats {
  totalAgents: number;
  activeAgents: number;
  dormantAgents: number;
  totalCompute: number;
  totalMemory: number;
  totalNetwork: number;
  shannonDiversity: number;
}

export interface AgentState {
  id: string;
  typeId: string;
  status: 'active' | 'dormant' | 'failed';
  valueFunction: number;
  successRate: number;
  lastActive?: number;
  avgLatencyMs?: number;
}

export interface CacheStats {
  totalSegments?: number;
  totalSize?: number;
  hitRate: number;
  missRate: number;
  avgAccessTime?: number;
  anchors?: {
    total: number;
    active: number;
    matched: number;
  };
  compression?: {
    originalSize: number;
    compressedSize: number;
    ratio: number;
  };
}

export interface KVCacheMonitorData {
  totalSegments: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  avgAccessTime: number;
  anchors: {
    total: number;
    active: number;
    matched: number;
  };
  compression: {
    originalSize: number;
    compressedSize: number;
    ratio: number;
  };
}

// ============================================================================
// Message Types
// ============================================================================

export interface ClientMessage {
  id: string;
  timestamp: number;
  type: ClientMessageType;
  payload: unknown;
}

export type ClientMessageType =
  | 'subscribe:colony'
  | 'unsubscribe:colony'
  | 'subscribe:agent'
  | 'unsubscribe:agent'
  | 'subscribe:dreams'
  | 'unsubscribe:dreams'
  | 'subscribe:stats'
  | 'unsubscribe:stats'
  | 'command:spawn'
  | 'command:despawn'
  | 'command:activate'
  | 'command:deactivate'
  | 'command:dream'
  | 'query:stats'
  | 'query:agents'
  | 'query:agent'
  | 'query:config'
  | 'ping';

export interface ServerMessage {
  id: string;
  timestamp: number;
  type: ServerMessageType;
  payload: unknown;
  success?: boolean;
  error?: APIError;
}

export type ServerMessageType =
  | 'event:colony'
  | 'event:agent'
  | 'event:dream'
  | 'event:stats'
  | 'response:stats'
  | 'response:agents'
  | 'response:agent'
  | 'response:config'
  | 'response:command'
  | 'pong'
  | 'error';

// ============================================================================
// Payload Types
// ============================================================================

export interface SubscribeColonyPayload {
  colonyId: string;
  events: ColonyEventType[];
}

export interface SubscribeAgentPayload {
  agentId: string;
  events: AgentEventType[];
}

export interface CommandSpawnPayload {
  typeId: string;
  config?: Record<string, unknown>;
}

export interface CommandDespawnPayload {
  agentId: string;
}

export interface CommandActivatePayload {
  agentId: string;
}

export interface CommandDeactivatePayload {
  agentId: string;
}

export interface CommandDreamPayload {
  colonyId?: string;
  agentId?: string;
  episodeCount?: number;
}

export interface QueryStatsPayload {
  colonyId?: string;
  includeKVCache?: boolean;
  includeAgents?: boolean;
}

export interface QueryAgentsPayload {
  colonyId: string;
  filter?: {
    status?: string;
    typeId?: string;
    limit?: number;
    offset?: number;
  };
}

export interface QueryAgentPayload {
  agentId: string;
  includeHistory?: boolean;
}

export interface QueryConfigPayload {
  colonyId?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export type ColonyEventType =
  | 'agent_registered'
  | 'agent_unregistered'
  | 'agent_activated'
  | 'agent_deactivated'
  | 'stats_updated'
  | 'dream_completed'
  | 'error';

export type AgentEventType =
  | 'state_updated'
  | 'executed'
  | 'succeeded'
  | 'failed'
  | 'value_changed'
  | 'error';

export interface ColonyEventPayload {
  colonyId: string;
  eventType: ColonyEventType;
  data: unknown;
}

export interface AgentEventPayload {
  agentId: string;
  colonyId: string;
  eventType: AgentEventType;
  data: unknown;
}

export interface DreamEventPayload {
  colonyId: string;
  dreamId: string;
  episode: Partial<DreamEpisode>;
  metrics: {
    loss: number;
    reconstructionError: number;
    klDivergence: number;
  };
}

export interface StatsEventPayload {
  colonyId: string;
  stats: ColonyStats;
  kvCacheStats?: CacheStats;
  timestamp: number;
}

// ============================================================================
// Response Types
// ============================================================================

export interface ResponseStatsPayload {
  colonyId: string;
  stats: ColonyStats;
  kvCacheStats?: CacheStats;
  agents?: AgentState[];
}

export interface ResponseAgentsPayload {
  colonyId: string;
  agents: AgentState[];
  total: number;
  filtered: number;
}

export interface ResponseAgentPayload {
  agent: AgentState;
  config?: Record<string, unknown>;
  history?: AgentHistoryEntry[];
}

export interface ResponseConfigPayload {
  config?: Record<string, unknown>;
}

export interface ResponseCommandPayload {
  command: string;
  result: CommandResult;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// ============================================================================
// Error Types
// ============================================================================

export interface APIError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_PAYLOAD'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'AGENT_NOT_FOUND'
  | 'COLONY_NOT_FOUND'
  | 'COMMAND_FAILED';

// ============================================================================
// Other Types
// ============================================================================

export interface DreamEpisode {
  id: string;
  colonyId: string;
  timestamp: number;
  states: Array<Record<string, unknown>>;
  actions: Array<{
    agentId: string;
    action: unknown;
  }>;
  rewards: number[];
  nextState: unknown;
}

export interface AgentHistoryEntry {
  timestamp: number;
  event: string;
  data: unknown;
}

export interface ConnectionInfo {
  id: string;
  clientId: string;
  connectedAt: number;
  subscriptions: Subscription[];
  isAuthenticated: boolean;
  ip?: string;
  isAlive?: boolean;
}

export interface Subscription {
  type: 'colony' | 'agent' | 'dreams' | 'stats';
  id: string;
  events: string[];
  subscribedAt: number;
}

// ============================================================================
// Client Configuration
// ============================================================================

export interface POLLNClientConfig {
  url: string;
  token?: string;
  debug?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  requestTimeout?: number;
}
