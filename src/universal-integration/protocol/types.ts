/**
 * Universal Integration Protocol (UIP) - Core Type Definitions
 *
 * Agnostic protocol for SMPbot communication across platforms.
 * Based on Round 1 research and existing integration patterns.
 */

// ============================================================================
// Core Protocol Types
// ============================================================================

/**
 * Universal Integration Protocol Message
 *
 * Standardized message format for cross-platform SMPbot communication.
 */
export interface UIPMessage {
  // Core identification
  id: string;
  timestamp: number;
  protocolVersion: string;

  // Message routing
  source: MessageSource;
  target: MessageTarget;

  // Message content
  type: MessageType;
  payload: unknown;

  // Metadata
  metadata: MessageMetadata;

  // State synchronization (optional)
  state?: StateSyncData;
}

/**
 * Message source information
 */
export interface MessageSource {
  platform: PlatformType;
  channel: string;
  userId?: string;
  sessionId?: string;
  adapterId?: string;
}

/**
 * Message target information
 */
export interface MessageTarget {
  platform: PlatformType;
  channel: string;
  userId?: string;
  sessionId?: string;
  adapterId?: string;
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  confidence?: number;  // SMP confidence score (0-1)
  priority?: MessagePriority;
  ttl?: number;  // Time-to-live in milliseconds
  tags?: string[];
  traceId?: string;  // For distributed tracing
  correlationId?: string;  // For request-response correlation
  replyTo?: string;  // Message ID to reply to
}

/**
 * State synchronization data
 */
export interface StateSyncData {
  sessionState?: Record<string, unknown>;
  userState?: Record<string, unknown>;
  platformState?: Record<string, unknown>;
  operations?: StateSyncOperation[];
}

// ============================================================================
// Platform Types
// ============================================================================

/**
 * Platform types supported by UIP
 */
export enum PlatformType {
  // Messaging platforms
  DISCORD = 'discord',
  SLACK = 'slack',
  TEAMS = 'teams',

  // Web platforms
  WEB = 'web',
  API = 'api',

  // CLI and terminals
  CLI = 'cli',
  TERMINAL = 'terminal',

  // Protocol-specific
  MCP = 'mcp',
  REST = 'rest',
  WEBSOCKET = 'websocket',
  GRPC = 'grpc',

  // Custom/unknown
  CUSTOM = 'custom',
  UNKNOWN = 'unknown'
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Message types supported by UIP
 */
export enum MessageType {
  // Core message types
  TEXT = 'text',
  COMMAND = 'command',
  QUERY = 'query',
  RESPONSE = 'response',
  ERROR = 'error',
  ACKNOWLEDGMENT = 'acknowledgment',

  // Rich content types
  FILE = 'file',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',

  // Interactive types
  BUTTON = 'button',
  SELECT = 'select',
  FORM = 'form',
  CARD = 'card',
  MODAL = 'modal',

  // System types
  HEARTBEAT = 'heartbeat',
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  STATE_SYNC = 'state_sync',
  CAPABILITY_DISCOVERY = 'capability_discovery'
}

/**
 * Message priority levels
 */
export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// ============================================================================
// State Synchronization
// ============================================================================

/**
 * State synchronization operation
 */
export interface StateSyncOperation {
  operation: 'SET' | 'UPDATE' | 'DELETE' | 'MERGE' | 'CLEAR';
  key: string;
  value?: unknown;
  timestamp: number;
  platform: PlatformType;
  scope: StateScope;
  version?: number;  // For optimistic concurrency control
}

/**
 * State scope for synchronization
 */
export enum StateScope {
  SESSION = 'session',
  USER = 'user',
  PLATFORM = 'platform',
  GLOBAL = 'global'
}

// ============================================================================
// Platform Capabilities
// ============================================================================

/**
 * Platform capabilities for discovery and negotiation
 */
export interface PlatformCapabilities {
  platform: PlatformType;
  adapterId: string;

  // Message support
  supportedMessageTypes: MessageType[];
  maxMessageSize: number;  // In bytes
  supportsFiles: boolean;
  supportsRealtime: boolean;
  supportsStateSync: boolean;

  // Rate limiting
  rateLimits: RateLimitConfig;

  // Authentication methods
  authenticationMethods: AuthMethod[];

  // Platform-specific features
  features: PlatformFeature[];
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  burstSize?: number;
}

/**
 * Authentication method
 */
export interface AuthMethod {
  type: 'oauth' | 'api_key' | 'basic' | 'jwt' | 'custom';
  name: string;
  required: boolean;
}

/**
 * Platform-specific feature
 */
export interface PlatformFeature {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

// ============================================================================
// Protocol Operations
// ============================================================================

/**
 * Send result from adapter
 */
export interface SendResult {
  success: boolean;
  messageId?: string;  // Platform-specific message ID
  error?: SendError;
  metadata: SendMetadata;
}

/**
 * Send error information
 */
export interface SendError {
  code: SendErrorCode;
  message: string;
  details?: unknown;
  retryable: boolean;
  retryDelay?: number;
}

/**
 * Send error codes
 */
export enum SendErrorCode {
  RATE_LIMITED = 'rate_limited',
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  PLATFORM_ERROR = 'platform_error',
  MESSAGE_TOO_LARGE = 'message_too_large',
  UNSUPPORTED_MESSAGE_TYPE = 'unsupported_message_type',
  INVALID_MESSAGE = 'invalid_message'
}

/**
 * Send metadata
 */
export interface SendMetadata {
  timestamp: number;
  duration: number;
  platformMessageId?: string;
  rateLimitInfo?: RateLimitInfo;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
}

// ============================================================================
// SMPbot Integration Types
// ============================================================================

/**
 * SMPbot message handler interface
 */
export interface SMPbotMessageHandler {
  handleMessage(message: UIPMessage): Promise<UIPMessage | null>;
  canHandle(message: UIPMessage): boolean;
  getBotId(): string;
  getCapabilities(): SMPbotCapabilities;
}

/**
 * SMPbot capabilities
 */
export interface SMPbotCapabilities {
  botId: string;
  supportedInputTypes: MessageType[];
  supportedOutputTypes: MessageType[];
  maxProcessingTime: number;  // ms
  requiresStateSync: boolean;
  features: string[];
}

/**
 * SMPbot state requirements
 */
export interface SMPbotStateRequirements {
  sessionState: string[];
  userState: string[];
  platformState: string[];
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Message validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Message transformation function
 */
export type MessageTransformer = (message: UIPMessage) => Promise<UIPMessage>;

/**
 * Message filter function
 */
export type MessageFilter = (message: UIPMessage) => boolean;

/**
 * Message routing rule
 */
export interface RoutingRule {
  match: MessageFilter;
  targets: RoutingTarget[];
  priority: number;
  description?: string;
}

/**
 * Routing target
 */
export interface RoutingTarget {
  platform: PlatformType;
  channel?: string;
  adapterId?: string;
  transform?: MessageTransformer;
}

// ============================================================================
// Protocol Constants
// ============================================================================

/**
 * Current protocol version
 */
export const CURRENT_PROTOCOL_VERSION = '1.0.0';

/**
 * Default message TTL (5 minutes)
 */
export const DEFAULT_MESSAGE_TTL = 5 * 60 * 1000;

/**
 * Default message priority
 */
export const DEFAULT_MESSAGE_PRIORITY = MessagePriority.NORMAL;

/**
 * Maximum message size (10MB)
 */
export const MAX_MESSAGE_SIZE = 10 * 1024 * 1024;