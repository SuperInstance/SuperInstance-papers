/**
 * Claw API Module
 *
 * Exports all Claw API types, schemas, and client functionality.
 *
 * @packageDocumentation
 */

// Types and enums
export {
  ClawState,
  ClawType,
  ModelProvider,
  EquipmentSlot,
  RelationshipType,
  TriggerType,
  LearningStrategy,
  WebSocketMessageType
} from './types';

export type {
  ClawCellConfig,
  TriggerCondition,
  Relationship,
  ReasoningStep,
  ClawAction,
  ClawStateInfo,
  WebSocketMessage,
  SubscribePayload,
  ReasoningStepPayload,
  ApprovalRequiredPayload,
  CreateClawRequest,
  CreateClawResponse,
  QueryClawRequest,
  QueryClawResponse,
  TriggerClawRequest,
  TriggerClawResponse,
  CancelClawRequest,
  CancelClawResponse,
  ApproveClawRequest,
  ApproveClawResponse
} from './types';

// Zod schemas
export {
  ClawCellConfigSchema,
  WebSocketMessageSchema,
  CreateClawRequestSchema,
  TriggerClawRequestSchema,
  ApproveClawRequestSchema,
  QueryClawRequestSchema,
  CancelClawRequestSchema
} from './types';

// Error classes
export {
  ClawAPIError,
  ClawErrorCode
} from './types';

// Type guards
export {
  isClawCellConfig,
  isWebSocketMessage,
  isClawAPIError
} from './types';

// ClawClient
export {
  ClawClient,
  createClawClient
} from './ClawClient';

export type {
  ClawClientConfig
} from './ClawClient';
