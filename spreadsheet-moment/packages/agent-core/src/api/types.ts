/**
 * Claw API Type Definitions
 *
 * Production-ready type definitions for Claw API integration with
 * comprehensive validation using Zod schemas.
 *
 * @packageDocumentation
 */

import { z } from 'zod';

// ============================================================================
// CLAW API TYPES
// ============================================================================

/**
 * Claw agent states matching the Claw engine specification
 */
export enum ClawState {
  IDLE = 'IDLE',
  DORMANT = 'DORMANT',
  THINKING = 'THINKING',
  ACTING = 'ACTING',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  COMPLETE = 'COMPLETE',
  POSTED = 'POSTED',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  ARCHIVED = 'ARCHIVED',
  ERROR = 'ERROR'
}

/**
 * Claw agent types matching the Claw engine specification
 */
export enum ClawType {
  SENSOR = 'SENSOR',
  ANALYZER = 'ANALYZER',
  CONTROLLER = 'CONTROLLER',
  ORCHESTRATOR = 'ORCHESTRATOR'
}

/**
 * Model providers supported by Claw
 */
export enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  DEEPSEEK = 'deepseek',
  CLOUDFLARE = 'cloudflare'
}

/**
 * Equipment slots available for Claw agents
 */
export enum EquipmentSlot {
  MEMORY = 'MEMORY',
  REASONING = 'REASONING',
  LEARNING = 'LEARNING',
  PERCEPTION = 'PERCEPTION',
  ACTION = 'ACTION',
  COMMUNICATION = 'COMMUNICATION'
}

/**
 * Relationship types between Claw agents
 */
export enum RelationshipType {
  SLAVE = 'slave',
  COWORKER = 'coworker',
  PEER = 'peer',
  DELEGATE = 'delegate',
  OBSERVER = 'observer'
}

/**
 * Trigger condition types
 */
export enum TriggerType {
  CELL_CHANGE = 'cell_change',
  FORMULA = 'formula',
  TIME = 'time',
  EXTERNAL = 'external',
  MANUAL = 'manual'
}

/**
 * Learning strategies for Claw agents
 */
export enum LearningStrategy {
  REINFORCEMENT = 'reinforcement',
  SUPERVISED = 'supervised',
  UNSUPERVISED = 'unsupervised'
}

/**
 * WebSocket message types for Claw communication
 */
export enum WebSocketMessageType {
  // Client -> Server
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  TRIGGER = 'trigger',
  APPROVE = 'approve',
  REJECT = 'reject',
  CANCEL = 'cancel',
  QUERY = 'query',

  // Server -> Client
  CELL_UPDATE = 'cell_update',
  REASONING_STEP = 'reasoning_step',
  STATE_CHANGE = 'state_change',
  APPROVAL_REQUIRED = 'approval_required',
  ACTION_COMPLETED = 'action_completed',
  ERROR = 'error',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected'
}

// ============================================================================
// INTERFACE DEFINITIONS
// ============================================================================

/**
 * Claw cell configuration
 */
export interface ClawCellConfig {
  /** Unique identifier for the claw */
  id: string;

  /** Type of claw agent */
  type: ClawType;

  /** Position in spreadsheet [row, col] */
  position: [number, number];

  /** Model configuration */
  model: {
    provider: ModelProvider;
    model: string;
    apiKey?: string;
    baseUrl?: string;
  };

  /** Seed configuration for learning */
  seed: {
    purpose: string;
    trigger: TriggerCondition;
    learningStrategy: LearningStrategy;
  };

  /** Equipment slots */
  equipment: EquipmentSlot[];

  /** Relationships to other claws */
  relationships: Relationship[];

  /** Current state */
  state: ClawState;

  /** Confidence level (0-1) */
  confidence: number;

  /** Maximum reasoning steps */
  maxReasoningSteps?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Whether to enable agent handshake */
  enableHandshake?: boolean;
}

/**
 * Trigger condition for claw activation
 */
export interface TriggerCondition {
  type: TriggerType;
  cellId?: string;
  threshold?: number;
  interval?: number;
  expression?: string;
  cronExpression?: string;
}

/**
 * Relationship between claws
 */
export interface Relationship {
  type: RelationshipType;
  targetCell: string;
  strategy?: 'PARALLEL' | 'SEQUENTIAL' | 'CONSENSUS';
  bidirectional?: boolean;
}

/**
 * Reasoning step from claw processing
 */
export interface ReasoningStep {
  stepNumber: number;
  content: string;
  timestamp: number;
  confidence: number;
  metadata?: Record<string, any>;
}

/**
 * Claw action result
 */
export interface ClawAction {
  type: 'update_cell' | 'send_message' | 'trigger_claw' | 'custom';
  target?: string;
  data: any;
  confidence: number;
}

/**
 * Claw state information
 */
export interface ClawStateInfo {
  clawId: string;
  state: ClawState;
  reasoning: ReasoningStep[];
  memory: string[];
  confidence: number;
  error?: string;
  lastUpdated: number;
}

/**
 * WebSocket message base interface
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  traceId: string;
  timestamp: number;
  payload?: any;
}

/**
 * Subscribe message payload
 */
export interface SubscribePayload {
  cellId: string;
  sheetId: string;
  clawId?: string;
}

/**
 * Reasoning step message payload
 */
export interface ReasoningStepPayload {
  clawId: string;
  cellId: string;
  step: ReasoningStep;
  isFinal: boolean;
}

/**
 * Approval required payload
 */
export interface ApprovalRequiredPayload {
  clawId: string;
  cellId: string;
  traceId: string;
  action: ClawAction;
  reasoning: string;
  confidence: number;
  timeout: number;
}

/**
 * Claw creation request
 */
export interface CreateClawRequest {
  config: ClawCellConfig;
  context?: {
    sheetId: string;
    userId?: string;
    sessionId?: string;
  };
}

/**
 * Claw creation response
 */
export interface CreateClawResponse {
  clawId: string;
  status: 'created' | 'pending' | 'error';
  message?: string;
  config: ClawCellConfig;
}

/**
 * Claw query request
 */
export interface QueryClawRequest {
  clawId: string;
  includeReasoning?: boolean;
  includeMemory?: boolean;
  includeRelationships?: boolean;
}

/**
 * Claw query response
 */
export interface QueryClawResponse {
  clawId: string;
  state: ClawStateInfo;
  reasoning?: ReasoningStep[];
  memory?: string[];
  relationships?: Relationship[];
  exists: boolean;
}

/**
 * Claw trigger request
 */
export interface TriggerClawRequest {
  clawId: string;
  data?: any;
  traceId?: string;
  force?: boolean;
}

/**
 * Claw trigger response
 */
export interface TriggerClawResponse {
  clawId: string;
  traceId: string;
  status: 'triggered' | 'already_running' | 'error';
  message?: string;
}

/**
 * Claw cancel request
 */
export interface CancelClawRequest {
  clawId: string;
  reason?: string;
}

/**
 * Claw cancel response
 */
export interface CancelClawResponse {
  clawId: string;
  status: 'cancelled' | 'not_running' | 'error';
  message?: string;
}

/**
 * Claw approval request
 */
export interface ApproveClawRequest {
  clawId: string;
  traceId: string;
  approved: boolean;
  reason?: string;
}

/**
 * Claw approval response
 */
export interface ApproveClawResponse {
  clawId: string;
  traceId: string;
  status: 'approved' | 'rejected' | 'not_found' | 'error';
  message?: string;
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/**
 * Zod schema for ClawCellConfig
 */
export const ClawCellConfigSchema = z.object({
  id: z.string().min(1),
  type: z.nativeEnum(ClawType),
  position: z.tuple([z.number(), z.number()]),
  model: z.object({
    provider: z.nativeEnum(ModelProvider),
    model: z.string().min(1),
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional()
  }),
  seed: z.object({
    purpose: z.string().min(1),
    trigger: z.object({
      type: z.nativeEnum(TriggerType),
      cellId: z.string().optional(),
      threshold: z.number().optional(),
      interval: z.number().optional(),
      expression: z.string().optional(),
      cronExpression: z.string().optional()
    }),
    learningStrategy: z.nativeEnum(LearningStrategy)
  }),
  equipment: z.array(z.nativeEnum(EquipmentSlot)).min(1),
  relationships: z.array(z.object({
    type: z.nativeEnum(RelationshipType),
    targetCell: z.string().min(1),
    strategy: z.enum(['PARALLEL', 'SEQUENTIAL', 'CONSENSUS']).optional(),
    bidirectional: z.boolean().optional()
  })),
  state: z.nativeEnum(ClawState),
  confidence: z.number().min(0).max(1),
  maxReasoningSteps: z.number().min(1).optional(),
  timeout: z.number().min(1000).optional(),
  enableHandshake: z.boolean().optional()
});

/**
 * Zod schema for WebSocket messages
 */
export const WebSocketMessageSchema = z.object({
  type: z.nativeEnum(WebSocketMessageType),
  traceId: z.string().min(1),
  timestamp: z.number(),
  payload: z.any()
});

/**
 * Zod schema for CreateClawRequest
 */
export const CreateClawRequestSchema = z.object({
  config: ClawCellConfigSchema,
  context: z.object({
    sheetId: z.string().min(1),
    userId: z.string().optional(),
    sessionId: z.string().optional()
  }).optional()
});

/**
 * Zod schema for TriggerClawRequest
 */
export const TriggerClawRequestSchema = z.object({
  clawId: z.string().min(1),
  data: z.any().optional(),
  traceId: z.string().optional(),
  force: z.boolean().optional()
});

/**
 * Zod schema for ApproveClawRequest
 */
export const ApproveClawRequestSchema = z.object({
  clawId: z.string().min(1),
  traceId: z.string().min(1),
  approved: z.boolean(),
  reason: z.string().optional()
});

/**
 * Zod schema for QueryClawRequest
 */
export const QueryClawRequestSchema = z.object({
  clawId: z.string().min(1),
  includeReasoning: z.boolean().optional(),
  includeMemory: z.boolean().optional(),
  includeRelationships: z.boolean().optional()
});

/**
 * Zod schema for CancelClawRequest
 */
export const CancelClawRequestSchema = z.object({
  clawId: z.string().min(1),
  reason: z.string().optional()
});

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Claw API error codes
 */
export enum ClawErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  TIMEOUT = 'TIMEOUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_STATE = 'INVALID_STATE',
  RECURSIVE_LOOP = 'RECURSIVE_LOOP'
}

/**
 * Claw API error
 */
export class ClawAPIError extends Error {
  constructor(
    public code: ClawErrorCode,
    message: string,
    public details?: any,
    public clawId?: string
  ) {
    super(message);
    this.name = 'ClawAPIError';
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      clawId: this.clawId
    };
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for ClawCellConfig
 */
export function isClawCellConfig(obj: any): obj is ClawCellConfig {
  return ClawCellConfigSchema.safeParse(obj).success;
}

/**
 * Type guard for WebSocket message
 */
export function isWebSocketMessage(obj: any): obj is WebSocketMessage {
  return WebSocketMessageSchema.safeParse(obj).success;
}

/**
 * Type guard for ClawAPIError
 */
export function isClawAPIError(obj: any): obj is ClawAPIError {
  return obj instanceof ClawAPIError;
}
