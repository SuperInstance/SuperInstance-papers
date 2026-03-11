/**
 * SMPbot Integration Specifications for Universal Integration Protocol
 *
 * Defines how SMPbots integrate with the Universal Integration Protocol (UIP)
 * for cross-platform communication and state synchronization.
 *
 * Coordination with Bot Framework Architect's SMPbot architecture.
 */

import {
  UIPMessage,
  PlatformType,
  MessageType,
  SMPbotMessageHandler,
  SMPbotCapabilities,
  SMPbotStateRequirements,
  MessageMetadata,
  CURRENT_PROTOCOL_VERSION
} from '../protocol/types.js';
import { SMPbot } from '../../spreadsheet/tiles/smpbot/SMPbot.js';
import { Stable } from '../../spreadsheet/tiles/smpbot/SMPbot.js';

// ============================================================================
// SMPbot Message Handler Implementation
// ============================================================================

/**
 * Base SMPbot message handler for UIP integration
 *
 * Adapts SMPbot interface to UIP message handling requirements.
 */
export class SMPbotMessageHandlerImpl<I, O> implements SMPbotMessageHandler {
  private bot: SMPbot<I, O>;
  private capabilities: SMPbotCapabilities;
  private stateRequirements: SMPbotStateRequirements;

  /**
   * Constructor
   */
  constructor(
    bot: SMPbot<I, O>,
    capabilities: Partial<SMPbotCapabilities> = {},
    stateRequirements: Partial<SMPbotStateRequirements> = {}
  ) {
    this.bot = bot;

    // Initialize capabilities with defaults
    this.capabilities = {
      botId: `smpbot-${bot.seed.id}-${bot.model.id}`,
      supportedInputTypes: [MessageType.TEXT, MessageType.COMMAND, MessageType.QUERY],
      supportedOutputTypes: [MessageType.TEXT, MessageType.RESPONSE],
      maxProcessingTime: 30000, // 30 seconds
      requiresStateSync: false,
      features: ['stability', 'confidence', 'peeking'],
      ...capabilities
    };

    // Initialize state requirements
    this.stateRequirements = {
      sessionState: [],
      userState: [],
      platformState: [],
      ...stateRequirements
    };
  }

  /**
   * Handle incoming UIP message
   */
  async handleMessage(message: UIPMessage): Promise<UIPMessage | null> {
    try {
      // Validate message can be handled
      if (!this.canHandle(message)) {
        return this.createErrorResponse(
          message,
          'Unsupported message type or format',
          'UNSUPPORTED_MESSAGE'
        );
      }

      // Extract input from message
      const input = this.extractInputFromMessage(message);
      if (!input) {
        return this.createErrorResponse(
          message,
          'Could not extract valid input from message',
          'INVALID_INPUT'
        );
      }

      // Execute SMPbot
      const startTime = Date.now();
      const output = await this.bot.execute(input);
      const confidence = await this.bot.confidence(input);
      const processingTime = Date.now() - startTime;

      // Get stability information if available
      let stability = 0;
      let variance = 0;
      if ('stabilityScore' in this.bot) {
        stability = (this.bot as any).stabilityScore;
      }

      // Create response message
      return this.createResponseMessage(message, output, {
        confidence,
        stability,
        variance,
        processingTime
      });

    } catch (error) {
      console.error(`SMPbot ${this.getBotId()} failed to handle message:`, error);
      return this.createErrorResponse(
        message,
        error instanceof Error ? error.message : String(error),
        'BOT_EXECUTION_ERROR'
      );
    }
  }

  /**
   * Check if this handler can handle the message
   */
  canHandle(message: UIPMessage): boolean {
    // Check message type
    if (!this.capabilities.supportedInputTypes.includes(message.type)) {
      return false;
    }

    // Check if we can extract valid input
    const input = this.extractInputFromMessage(message);
    return input !== null;
  }

  /**
   * Get bot ID
   */
  getBotId(): string {
    return this.capabilities.botId;
  }

  /**
   * Get bot capabilities
   */
  getCapabilities(): SMPbotCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Get state requirements
   */
  getStateRequirements(): SMPbotStateRequirements {
    return { ...this.stateRequirements };
  }

  /**
   * Get the underlying SMPbot
   */
  getBot(): SMPbot<I, O> {
    return this.bot;
  }

  // ============================================================================
  // Protected Methods
  // ============================================================================

  /**
   * Extract input from UIP message
   */
  protected extractInputFromMessage(message: UIPMessage): I | null {
    try {
      // Handle different message types
      switch (message.type) {
        case MessageType.TEXT:
          // For text messages, payload is the text
          return message.payload as I;

        case MessageType.COMMAND:
          // For commands, payload should have command and args
          if (typeof message.payload === 'object' && message.payload !== null) {
            const cmd = message.payload as { command: string; args?: unknown[] };
            return { command: cmd.command, args: cmd.args || [] } as I;
          }
          break;

        case MessageType.QUERY:
          // For queries, payload is the query
          return message.payload as I;

        default:
          // Try to use payload directly for other types
          return message.payload as I;
      }
    } catch (error) {
      console.error('Failed to extract input from message:', error);
      return null;
    }

    return null;
  }

  /**
   * Create response message from SMPbot output
   */
  protected createResponseMessage(
    originalMessage: UIPMessage,
    output: O,
    metrics: {
      confidence: number;
      stability: number;
      variance: number;
      processingTime: number;
    }
  ): UIPMessage {
    // Determine response type based on original message
    let responseType: MessageType;
    switch (originalMessage.type) {
      case MessageType.QUERY:
        responseType = MessageType.RESPONSE;
        break;
      case MessageType.COMMAND:
        responseType = MessageType.RESPONSE;
        break;
      default:
        responseType = MessageType.TEXT;
    }

    // Create response payload
    const responsePayload = this.createResponsePayload(output, metrics);

    // Create response message
    return {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      source: {
        platform: PlatformType.API,
        channel: 'smpbot',
        adapterId: this.getBotId()
      },
      target: originalMessage.source,
      type: responseType,
      payload: responsePayload,
      metadata: {
        confidence: metrics.confidence,
        correlationId: originalMessage.id,
        tags: ['smpbot', this.bot.model.id]
      }
    };
  }

  /**
   * Create response payload structure
   */
  protected createResponsePayload(
    output: O,
    metrics: {
      confidence: number;
      stability: number;
      variance: number;
      processingTime: number;
    }
  ): unknown {
    // Basic response structure
    const response: any = {
      output,
      metrics: {
        confidence: metrics.confidence,
        stability: metrics.stability,
        variance: metrics.variance,
        processingTime: metrics.processingTime,
        botId: this.getBotId(),
        modelId: this.bot.model.id,
        seedId: this.bot.seed.id
      },
      timestamp: new Date().toISOString()
    };

    // Add stability information if it's a Stable output
    if (this.isStableOutput(output)) {
      response.stability = {
        isStable: output.isStable(0.95),
        stabilityScore: output.stability,
        variance: output.variance
      };
    }

    return response;
  }

  /**
   * Create error response
   */
  protected createErrorResponse(
    originalMessage: UIPMessage,
    errorMessage: string,
    errorCode: string
  ): UIPMessage {
    return {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      source: {
        platform: PlatformType.API,
        channel: 'smpbot',
        adapterId: this.getBotId()
      },
      target: originalMessage.source,
      type: MessageType.ERROR,
      payload: {
        error: errorMessage,
        code: errorCode,
        originalMessageId: originalMessage.id,
        botId: this.getBotId(),
        timestamp: new Date().toISOString()
      },
      metadata: {
        correlationId: originalMessage.id,
        tags: ['smpbot', 'error']
      }
    };
  }

  /**
   * Check if output is a Stable type
   */
  protected isStableOutput(output: O): output is Stable<O> {
    return (
      output !== null &&
      typeof output === 'object' &&
      'isStable' in output &&
      typeof (output as any).isStable === 'function' &&
      'stability' in output &&
      typeof (output as any).stability === 'number'
    );
  }

  /**
   * Generate unique message ID
   */
  protected generateMessageId(): string {
    return `smpbot-${this.getBotId()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// SMPbot Registry for UIP Integration
// ============================================================================

/**
 * SMPbot registry for managing multiple bots in UIP
 */
export class SMPbotRegistry {
  private handlers: Map<string, SMPbotMessageHandler> = new Map();
  private botToHandler: Map<string, SMPbotMessageHandler> = new Map(); // For quick lookup

  /**
   * Register an SMPbot with UIP
   */
  registerBot<I, O>(
    bot: SMPbot<I, O>,
    capabilities?: Partial<SMPbotCapabilities>,
    stateRequirements?: Partial<SMPbotStateRequirements>
  ): SMPbotMessageHandler {
    const handler = new SMPbotMessageHandlerImpl(bot, capabilities, stateRequirements);
    const botId = handler.getBotId();

    if (this.handlers.has(botId)) {
      throw new Error(`SMPbot with ID ${botId} already registered`);
    }

    this.handlers.set(botId, handler);
    this.botToHandler.set(this.getBotKey(bot), handler);

    console.log(`Registered SMPbot: ${botId} (${bot.model.id})`);
    return handler;
  }

  /**
   * Unregister an SMPbot
   */
  unregisterBot(botId: string): boolean {
    const handler = this.handlers.get(botId);
    if (handler) {
      this.handlers.delete(botId);

      // Remove from botToHandler map
      for (const [key, value] of this.botToHandler.entries()) {
        if (value === handler) {
          this.botToHandler.delete(key);
          break;
        }
      }

      console.log(`Unregistered SMPbot: ${botId}`);
      return true;
    }
    return false;
  }

  /**
   * Get handler by bot ID
   */
  getHandler(botId: string): SMPbotMessageHandler | undefined {
    return this.handlers.get(botId);
  }

  /**
   * Get handler by SMPbot instance
   */
  getHandlerForBot<I, O>(bot: SMPbot<I, O>): SMPbotMessageHandler | undefined {
    return this.botToHandler.get(this.getBotKey(bot));
  }

  /**
   * Get all registered handlers
   */
  getAllHandlers(): SMPbotMessageHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Find handler that can handle a message
   */
  findHandlerForMessage(message: UIPMessage): SMPbotMessageHandler | undefined {
    for (const handler of this.handlers.values()) {
      if (handler.canHandle(message)) {
        return handler;
      }
    }
    return undefined;
  }

  /**
   * Get unique key for SMPbot
   */
  private getBotKey<I, O>(bot: SMPbot<I, O>): string {
    return `${bot.seed.id}:${bot.model.id}:${bot.prompt.id}`;
  }
}

// ============================================================================
// SMPbot State Synchronization
// ============================================================================

/**
 * SMPbot state synchronizer for UIP
 *
 * Manages state synchronization between SMPbots and platform adapters.
 */
export class SMPbotStateSynchronizer {
  private registry: SMPbotRegistry;
  private stateStores: Map<string, Map<string, unknown>> = new Map();

  constructor(registry: SMPbotRegistry) {
    this.registry = registry;
  }

  /**
   * Initialize state for a bot
   */
  initializeBotState(botId: string, initialState: Record<string, unknown> = {}): void {
    const stateStore = new Map<string, unknown>();
    for (const [key, value] of Object.entries(initialState)) {
      stateStore.set(key, value);
    }
    this.stateStores.set(botId, stateStore);
  }

  /**
   * Get bot state
   */
  getBotState(botId: string, key?: string): unknown {
    const stateStore = this.stateStores.get(botId);
    if (!stateStore) {
      return undefined;
    }

    if (key) {
      return stateStore.get(key);
    }

    // Return all state
    return Object.fromEntries(stateStore.entries());
  }

  /**
   * Set bot state
   */
  setBotState(botId: string, key: string, value: unknown): void {
    let stateStore = this.stateStores.get(botId);
    if (!stateStore) {
      stateStore = new Map();
      this.stateStores.set(botId, stateStore);
    }
    stateStore.set(key, value);
  }

  /**
   * Clear bot state
   */
  clearBotState(botId: string, key?: string): void {
    const stateStore = this.stateStores.get(botId);
    if (stateStore) {
      if (key) {
        stateStore.delete(key);
      } else {
        stateStore.clear();
      }
    }
  }

  /**
   * Synchronize state from UIP message
   */
  syncFromMessage(message: UIPMessage): void {
    if (!message.state || !message.state.operations) {
      return;
    }

    // Find bot for this message
    const handler = this.registry.findHandlerForMessage(message);
    if (!handler) {
      return;
    }

    const botId = handler.getBotId();

    // Apply state operations
    for (const operation of message.state.operations) {
      switch (operation.operation) {
        case 'SET':
          this.setBotState(botId, operation.key, operation.value);
          break;
        case 'UPDATE':
          const current = this.getBotState(botId, operation.key);
          if (current && operation.value && typeof current === 'object' && typeof operation.value === 'object') {
            this.setBotState(botId, operation.key, { ...current, ...operation.value });
          } else {
            this.setBotState(botId, operation.key, operation.value);
          }
          break;
        case 'DELETE':
          this.clearBotState(botId, operation.key);
          break;
        case 'CLEAR':
          this.clearBotState(botId);
          break;
      }
    }
  }

  /**
   * Create state sync message for bot
   */
  createStateSyncMessage(botId: string, target: UIPMessage['target']): UIPMessage | null {
    const state = this.getBotState(botId);
    if (!state || typeof state !== 'object') {
      return null;
    }

    // Convert state to operations
    const operations = Object.entries(state).map(([key, value]) => ({
      operation: 'SET' as const,
      key,
      value,
      timestamp: Date.now(),
      platform: PlatformType.API,
      scope: 'session' as const
    }));

    return {
      id: `state-sync-${botId}-${Date.now()}`,
      timestamp: Date.now(),
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      source: {
        platform: PlatformType.API,
        channel: 'smpbot-state'
      },
      target,
      type: MessageType.STATE_SYNC,
      payload: {
        botId,
        stateType: 'full'
      },
      state: {
        operations
      },
      metadata: {
        tags: ['state-sync', botId]
      }
    };
  }
}

// ============================================================================
// SMPbot Message Routing Helpers
// ============================================================================

/**
 * Create routing rules for SMPbots
 */
export function createSMPbotRoutingRules(registry: SMPbotRegistry): any[] {
  return [
    {
      match: (message: UIPMessage) => {
        // Match messages that look like they're for SMPbots
        return (
          message.type === MessageType.QUERY ||
          message.type === MessageType.COMMAND ||
          (message.type === MessageType.TEXT && message.metadata?.tags?.includes('smpbot'))
        );
      },
      targets: [
        {
          platform: PlatformType.API,
          channel: 'smpbot-router',
          transform: async (message: UIPMessage) => {
            // Add SMPbot routing metadata
            return {
              ...message,
              metadata: {
                ...message.metadata,
                routedToSMPbot: true,
                routingTimestamp: Date.now()
              }
            };
          }
        }
      ],
      priority: 100,
      description: 'Route SMPbot queries and commands to bot router'
    }
  ];
}

/**
 * Create message transformer for SMPbot responses
 */
export function createSMPbotResponseTransformer(): (message: UIPMessage) => Promise<UIPMessage> {
  return async (message: UIPMessage) => {
    // Transform SMPbot responses for better platform compatibility
    if (message.source.platform === PlatformType.API && message.source.channel === 'smpbot') {
      // Ensure response has proper formatting
      if (message.type === MessageType.RESPONSE || message.type === MessageType.TEXT) {
        const payload = message.payload;
        if (payload && typeof payload === 'object' && 'output' in payload) {
          // Extract the actual output for cleaner presentation
          return {
            ...message,
            payload: (payload as any).output
          };
        }
      }
    }
    return message;
  };
}