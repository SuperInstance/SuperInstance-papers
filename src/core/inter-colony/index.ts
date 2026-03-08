/**
 * Inter-Colony Communication Module
 * Communication infrastructure between colonies
 */

// ============================================================================
// PROTOCOL EXPORTS
// ============================================================================

export {
  MessageType,
  MessageFactory,
  MessageValidator,
  type MessageHeaders,
  type MessagePayload,
  type InterColonyMessage as ProtocolMessage,
  type MessageResponse,
} from './protocol.js';

// ============================================================================
// BRIDGE EXPORTS
// ============================================================================

export {
  ColonyBridge,
  type BridgeStats,
} from './bridge.js';

// ============================================================================
// MESSAGE QUEUE EXPORTS
// ============================================================================

export {
  MessageQueue,
  type QueuedMessage,
  type MessageQueueConfig,
} from './message-queue.js';

// ============================================================================
// BROADCAST EXPORTS
// ============================================================================

export {
  ColonyBroadcast,
  type BroadcastResult,
  type BroadcastConfig,
} from './broadcast.js';

// ============================================================================
// GATEWAY EXPORTS
// ============================================================================

export {
  ColonyGateway,
  type GatewayRequest,
  type GatewayResponse,
  type GatewayStats,
} from './gateway.js';

// ============================================================================
// RE-EXPORT TYPES FROM COLONY-MANAGER
// ============================================================================

export type {
  InterColonyMessage,
  ColonyBridgeConfig,
  RetryPolicy,
  BroadcastConfig as ColonyBroadcastConfig,
  ColonyFilter,
  GatewayConfig,
  AuthConfig,
  RateLimitConfig,
  RoutingConfig,
  RoutingRule,
} from '../colony-manager/types.js';
