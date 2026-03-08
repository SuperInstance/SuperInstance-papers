/**
 * Inter-Colony Protocol
 * Standardized protocol for communication between colonies
 */

import { v4 as uuidv4 } from 'uuid';

export enum MessageType {
  // Agent management
  AGENT_SPAWN_REQUEST = 'AGENT_SPAWN_REQUEST',
  AGENT_SPAWN_RESPONSE = 'AGENT_SPAWN_RESPONSE',
  AGENT_MIGRATE_REQUEST = 'AGENT_MIGRATE_REQUEST',
  AGENT_MIGRATE_RESPONSE = 'AGENT_MIGRATE_RESPONSE',
  AGENT_TERMINATE_REQUEST = 'AGENT_TERMINATE_REQUEST',
  AGENT_TERMINATE_RESPONSE = 'AGENT_TERMINATE_RESPONSE',

  // Pattern sharing
  PATTERN_SHARE = 'PATTERN_SHARE',
  PATTERN_REQUEST = 'PATTERN_REQUEST',
  PATTERN_RESPONSE = 'PATTERN_RESPONSE',

  // Federation
  FEDERATION_SYNC = 'FEDERATION_SYNC',
  FEDERATION_PATTERN_BROADCAST = 'FEDERATION_PATTERN_BROADCAST',

  // Health & status
  HEALTH_CHECK = 'HEALTH_CHECK',
  HEALTH_CHECK_RESPONSE = 'HEALTH_CHECK_RESPONSE',
  STATUS_UPDATE = 'STATUS_UPDATE',

  // Load balancing
  LOAD_BALANCE_REQUEST = 'LOAD_BALANCE_REQUEST',
  LOAD_BALANCE_RESPONSE = 'LOAD_BALANCE_RESPONSE',
  WORKLOAD_REDIRECT = 'WORKLOAD_REDIRECT',

  // Resource management
  RESOURCE_QUERY = 'RESOURCE_QUERY',
  RESOURCE_QUERY_RESPONSE = 'RESOURCE_QUERY_RESPONSE',
  RESOURCE_ALLOCATION_REQUEST = 'RESOURCE_ALLOCATION_REQUEST',
  RESOURCE_ALLOCATION_RESPONSE = 'RESOURCE_ALLOCATION_RESPONSE',

  // Discovery
  COLONY_DISCOVER = 'COLONY_DISCOVER',
  COLONY_DISCOVER_RESPONSE = 'COLONY_DISCOVER_RESPONSE',
  COLONY_ANNOUNCE = 'COLONY_ANNOUNCE',

  // Synchronization
  SYNC_REQUEST = 'SYNC_REQUEST',
  SYNC_RESPONSE = 'SYNC_RESPONSE',
  SYNC_COMPLETE = 'SYNC_COMPLETE',

  // Error handling
  ERROR = 'ERROR',
  ACK = 'ACK',
}

export interface MessageHeaders {
  id: string;
  timestamp: number;
  sourceColonyId: string;
  targetColonyId: string;
  messageType: MessageType;
  correlationId?: string;
  replyTo?: string;
  priority: number; // 0-1
  timeout?: number;
  requiresAck: boolean;
  version: string;
}

export interface MessagePayload {
  [key: string]: unknown;
}

export interface InterColonyMessage {
  headers: MessageHeaders;
  payload: MessagePayload;
  signature?: string; // For message authentication
}

export interface MessageResponse {
  success: boolean;
  payload?: MessagePayload;
  error?: string;
  timestamp: number;
}

// ============================================================================
// Message Factory
// ============================================================================

export class MessageFactory {
  private static readonly PROTOCOL_VERSION = '1.0.0';

  /**
   * Create a new message
   */
  static create(
    sourceColonyId: string,
    targetColonyId: string,
    messageType: MessageType,
    payload: MessagePayload,
    options: {
      priority?: number;
      timeout?: number;
      requiresAck?: boolean;
      correlationId?: string;
      replyTo?: string;
    } = {}
  ): InterColonyMessage {
    const headers: MessageHeaders = {
      id: uuidv4(),
      timestamp: Date.now(),
      sourceColonyId,
      targetColonyId,
      messageType,
      correlationId: options.correlationId,
      replyTo: options.replyTo,
      priority: options.priority ?? 0.5,
      timeout: options.timeout,
      requiresAck: options.requiresAck ?? true,
      version: this.PROTOCOL_VERSION,
    };

    return { headers, payload };
  }

  /**
   * Create a response message
   */
  static createResponse(
    originalMessage: InterColonyMessage,
    payload: MessagePayload,
    success: boolean = true
  ): InterColonyMessage {
    return this.create(
      originalMessage.headers.targetColonyId,
      originalMessage.headers.sourceColonyId,
      success ? MessageType.ACK : MessageType.ERROR,
      payload,
      {
        correlationId: originalMessage.headers.id,
        replyTo: originalMessage.headers.id,
        priority: originalMessage.headers.priority,
      }
    );
  }

  /**
   * Create an error response
   */
  static createErrorResponse(
    originalMessage: InterColonyMessage,
    error: string
  ): InterColonyMessage {
    return this.createResponse(
      originalMessage,
      { error, originalMessageType: originalMessage.headers.messageType },
      false
    );
  }

  /**
   * Create agent spawn request
   */
  static createAgentSpawnRequest(
    sourceColonyId: string,
    targetColonyId: string,
    agentType: string,
    config: Record<string, unknown>
  ): InterColonyMessage {
    return this.create(
      sourceColonyId,
      targetColonyId,
      MessageType.AGENT_SPAWN_REQUEST,
      { agentType, config }
    );
  }

  /**
   * Create pattern share message
   */
  static createPatternShare(
    sourceColonyId: string,
    targetColonyId: string,
    patternId: string,
    patternData: unknown,
    successRate: number
  ): InterColonyMessage {
    return this.create(
      sourceColonyId,
      targetColonyId,
      MessageType.PATTERN_SHARE,
      {
        patternId,
        patternData,
        successRate,
        timestamp: Date.now(),
      }
    );
  }

  /**
   * Create health check message
   */
  static createHealthCheck(
    sourceColonyId: string,
    targetColonyId: string
  ): InterColonyMessage {
    return this.create(
      sourceColonyId,
      targetColonyId,
      MessageType.HEALTH_CHECK,
      {}
    );
  }

  /**
   * Create workload redirect message
   */
  static createWorkloadRedirect(
    sourceColonyId: string,
    targetColonyId: string,
    workloadId: string,
    workloadData: unknown
  ): InterColonyMessage {
    return this.create(
      sourceColonyId,
      targetColonyId,
      MessageType.WORKLOAD_REDIRECT,
      {
        workloadId,
        workloadData,
        timestamp: Date.now(),
      },
      { priority: 0.8 }
    );
  }

  /**
   * Create resource query message
   */
  static createResourceQuery(
    sourceColonyId: string,
    targetColonyId: string
  ): InterColonyMessage {
    return this.create(
      sourceColonyId,
      targetColonyId,
      MessageType.RESOURCE_QUERY,
      {}
    );
  }

  /**
   * Create colony announce message
   */
  static createColonyAnnounce(
    colonyId: string,
    capabilities: string[],
    resources: { compute: number; memory: number; network: number }
  ): InterColonyMessage {
    return this.create(
      colonyId,
      '*', // Broadcast
      MessageType.COLONY_ANNOUNCE,
      {
        colonyId,
        capabilities,
        resources,
        timestamp: Date.now(),
      }
    );
  }
}

// ============================================================================
// Message Validator
// ============================================================================

export class MessageValidator {
  /**
   * Validate a message
   */
  static validate(message: InterColonyMessage): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check headers
    if (!message.headers) {
      errors.push('Missing headers');
      return { valid: false, errors };
    }

    // Required header fields
    const requiredFields = [
      'id',
      'timestamp',
      'sourceColonyId',
      'targetColonyId',
      'messageType',
      'priority',
      'requiresAck',
      'version',
    ];

    for (const field of requiredFields) {
      if (!(field in message.headers)) {
        errors.push(`Missing required header field: ${field}`);
      }
    }

    // Validate timestamp
    if (message.headers.timestamp && isNaN(message.headers.timestamp)) {
      errors.push('Invalid timestamp');
    }

    // Validate priority
    if (message.headers.priority !== undefined) {
      if (typeof message.headers.priority !== 'number' ||
          message.headers.priority < 0 ||
          message.headers.priority > 1) {
        errors.push('Priority must be a number between 0 and 1');
      }
    }

    // Validate message type
    if (message.headers.messageType && !Object.values(MessageType).includes(message.headers.messageType)) {
      errors.push(`Invalid message type: ${message.headers.messageType}`);
    }

    // Check payload
    if (!message.payload || typeof message.payload !== 'object') {
      errors.push('Missing or invalid payload');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if message has expired
   */
  static isExpired(message: InterColonyMessage): boolean {
    if (!message.headers.timeout) {
      return false;
    }

    const age = Date.now() - message.headers.timestamp;
    return age > message.headers.timeout;
  }
}
