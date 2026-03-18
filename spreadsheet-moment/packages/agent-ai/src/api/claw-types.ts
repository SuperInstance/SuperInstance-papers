/**
 * Claw API Type Definitions
 *
 * @module agent-ai/api/claw-types
 */

/**
 * Claw agent state
 */
export enum ClawState {
  IDLE = 'idle',
  THINKING = 'thinking',
  REASONING = 'reasoning',
  LEARNING = 'learning',
  EQUIPPING = 'equipping',
  EXECUTING = 'executing',
  ERROR = 'error',
  TERMINATED = 'terminated'
}

/**
 * Equipment slot types
 */
export enum EquipmentSlot {
  MEMORY = 'memory',
  REASONING = 'reasoning',
  CONSENSUS = 'consensus',
  SPREADSHEET = 'spreadsheet',
  DISTILLATION = 'distillation',
  COORDINATION = 'coordination'
}

/**
 * Seed learning strategy
 */
export enum LearningStrategy {
  REINFORCEMENT = 'reinforcement',
  SUPERVISED = 'supervised',
  UNSUPERVISED = 'unsupervised',
  FEDERATED = 'federated'
}

/**
 * Trigger type
 */
export enum TriggerType {
  PERIODIC = 'periodic',
  DATA = 'data',
  EVENT = 'event',
  MANUAL = 'manual'
}

/**
 * Claw agent configuration
 */
export interface ClawConfig {
  id: string;
  model: string;
  seed: ClawSeed;
  equipment: EquipmentSlot[];
  maxRetries?: number;
  timeout?: number;
}

/**
 * Seed definition
 */
export interface ClawSeed {
  id?: string;
  purpose: string;
  trigger: TriggerConfig;
  learningStrategy: LearningStrategy;
  defaultEquipment: EquipmentSlot[];
  parameters?: Record<string, unknown>;
}

/**
 * Trigger configuration
 */
export interface TriggerConfig {
  type: TriggerType;
  interval?: number;
  source?: string;
  event?: string;
  condition?: string;
}

/**
 * Agent creation request
 */
export interface CreateAgentRequest {
  config: ClawConfig;
  cellId: string;
  sheetId: string;
}

/**
 * Agent creation response
 */
export interface CreateAgentResponse {
  agentId: string;
  status: ClawState;
  createdAt: string;
  message: string;
}

/**
 * Query request
 */
export interface QueryRequest {
  agentId: string;
  query: string;
  context?: Record<string, unknown>;
}

/**
 * Query response
 */
export interface QueryResponse {
  agentId: string;
  response: string;
  reasoning?: string[];
  state: ClawState;
  timestamp: string;
}

/**
 * Agent status
 */
export interface AgentStatus {
  agentId: string;
  state: ClawState;
  equipment: EquipmentSlot[];
  uptime: number;
  lastActivity: string;
  memoryUsage?: number;
  cpuUsage?: number;
}

/**
 * Cancel agent request
 */
export interface CancelAgentRequest {
  agentId: string;
  reason?: string;
  saveState?: boolean;
}

/**
 * Cancel agent response
 */
export interface CancelAgentResponse {
  agentId: string;
  success: boolean;
  message: string;
  terminatedAt: string;
}

/**
 * WebSocket message types
 */
export enum WSMessageType {
  STATUS_UPDATE = 'status_update',
  REASONING_STREAM = 'reasoning_stream',
  ERROR = 'error',
  AGENT_CREATED = 'agent_created',
  AGENT_TERMINATED = 'agent_terminated',
  EQUIPMENT_CHANGED = 'equipment_changed',
  HEARTBEAT = 'heartbeat',
  ACK = 'ack'
}

/**
 * WebSocket message base
 */
export interface WSMessage {
  type: WSMessageType;
  agentId: string;
  timestamp: string;
}

/**
 * Status update message
 */
export interface StatusUpdateMessage extends WSMessage {
  type: WSMessageType.STATUS_UPDATE;
  state: ClawState;
  progress?: number;
}

/**
 * Reasoning stream message
 */
export interface ReasoningStreamMessage extends WSMessage {
  type: WSMessageType.REASONING_STREAM;
  reasoning: string;
  step: number;
  totalSteps?: number;
}

/**
 * Error message
 */
export interface ErrorMessage extends WSMessage {
  type: WSMessageType.ERROR;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Agent created message
 */
export interface AgentCreatedMessage extends WSMessage {
  type: WSMessageType.AGENT_CREATED;
  config: ClawConfig;
}

/**
 * Agent terminated message
 */
export interface AgentTerminatedMessage extends WSMessage {
  type: WSMessageType.AGENT_TERMINATED;
  reason?: string;
}

/**
 * Equipment changed message
 */
export interface EquipmentChangedMessage extends WSMessage {
  type: WSMessageType.EQUIPMENT_CHANGED;
  equipment: EquipmentSlot[];
  action: 'equipped' | 'unequipped';
}

/**
 * Heartbeat message
 */
export interface HeartbeatMessage extends WSMessage {
  type: WSMessageType.HEARTBEAT;
}

/**
 * API error response
 */
export interface APIError {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeout: number;
  idleTimeout: number;
  maxLifetime: number;
}
