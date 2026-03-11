/**
 * Message Router for Universal Integration Protocol
 *
 * Routes UIP messages between adapters and SMPbots, applying transformations
 * and routing rules as needed.
 */

import {
  UIPMessage,
  PlatformType,
  MessageType,
  RoutingRule,
  RoutingTarget,
  MessageTransformer,
  MessageFilter,
  SMPbotMessageHandler,
  PlatformCapabilities,
  SendResult,
  CURRENT_PROTOCOL_VERSION
} from '../protocol/types.js';
import { UniversalPlatformAdapter, AdapterEvent } from '../adapters/UniversalPlatformAdapter.js';

/**
 * Router configuration
 */
export interface RouterConfig {
  defaultRouteAll?: boolean;  // Route to all adapters by default
  enableMessageLogging?: boolean;
  maxRoutingTime?: number;  // ms
  retryFailedRoutes?: boolean;
  maxRetries?: number;
}

/**
 * Route statistics
 */
export interface RouteStatistics {
  totalMessages: number;
  successfulRoutes: number;
  failedRoutes: number;
  averageRouteTime: number;
  adapterStats: Map<string, AdapterStatistics>;
  botStats: Map<string, BotStatistics>;
}

/**
 * Adapter statistics
 */
export interface AdapterStatistics {
  adapterId: string;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  averageSendTime: number;
  lastActivity: number;
}

/**
 * Bot statistics
 */
export interface BotStatistics {
  botId: string;
  messagesProcessed: number;
  averageProcessingTime: number;
  errors: number;
  lastActivity: number;
}

/**
 * Route result
 */
export interface RouteResult {
  success: boolean;
  messageId: string;
  targets: RoutingTarget[];
  results: Map<string, SendResult>;
  errors: string[];
  duration: number;
}

/**
 * Message Router class
 */
export class MessageRouter {
  // Configuration
  private config: RouterConfig;

  // Registries
  private adapters: Map<string, UniversalPlatformAdapter> = new Map();
  private bots: Map<string, SMPbotMessageHandler> = new Map();
  private routingRules: RoutingRule[] = [];
  private transformers: Map<PlatformType, MessageTransformer[]> = new Map();

  // Statistics
  private statistics: RouteStatistics = {
    totalMessages: 0,
    successfulRoutes: 0,
    failedRoutes: 0,
    averageRouteTime: 0,
    adapterStats: new Map(),
    botStats: new Map()
  };

  // Message queue for async processing
  private messageQueue: Array<{ message: UIPMessage; resolve: (result: RouteResult) => void; reject: (error: Error) => void }> = [];
  private isProcessingQueue = false;

  /**
   * Constructor
   */
  constructor(config: RouterConfig = {}) {
    this.config = {
      defaultRouteAll: false,
      enableMessageLogging: false,
      maxRoutingTime: 5000, // 5 seconds
      retryFailedRoutes: true,
      maxRetries: 3,
      ...config
    };
  }

  // ============================================================================
  // Public Interface
  // ============================================================================

  /**
   * Register an adapter with the router
   */
  registerAdapter(adapter: UniversalPlatformAdapter): void {
    const adapterId = adapter.adapterId;

    if (this.adapters.has(adapterId)) {
      throw new Error(`Adapter with ID ${adapterId} already registered`);
    }

    this.adapters.set(adapterId, adapter);

    // Initialize statistics for this adapter
    this.statistics.adapterStats.set(adapterId, {
      adapterId,
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      averageSendTime: 0,
      lastActivity: Date.now()
    });

    // Set up message receiver
    adapter.receive(async (message: UIPMessage) => {
      await this.handleIncomingMessage(message, adapterId);
    });

    // Listen for adapter events
    adapter.addEventListener(AdapterEvent.CONNECTED, () => {
      this.log(`Adapter ${adapterId} connected`);
    });

    adapter.addEventListener(AdapterEvent.DISCONNECTED, () => {
      this.log(`Adapter ${adapterId} disconnected`);
    });

    adapter.addEventListener(AdapterEvent.ERROR, (error) => {
      this.log(`Adapter ${adapterId} error:`, error);
      const stats = this.statistics.adapterStats.get(adapterId);
      if (stats) {
        stats.errors++;
        stats.lastActivity = Date.now();
      }
    });

    this.log(`Registered adapter: ${adapterId} (${adapter.platform})`);
  }

  /**
   * Unregister an adapter
   */
  unregisterAdapter(adapterId: string): void {
    const adapter = this.adapters.get(adapterId);
    if (adapter) {
      // Clean up event listeners and disconnect
      adapter.disconnect().catch(error => {
        console.error(`Error disconnecting adapter ${adapterId}:`, error);
      });

      this.adapters.delete(adapterId);
      this.statistics.adapterStats.delete(adapterId);
      this.log(`Unregistered adapter: ${adapterId}`);
    }
  }

  /**
   * Register an SMPbot message handler
   */
  registerBot(bot: SMPbotMessageHandler): void {
    const botId = bot.getBotId();

    if (this.bots.has(botId)) {
      throw new Error(`Bot with ID ${botId} already registered`);
    }

    this.bots.set(botId, bot);

    // Initialize statistics for this bot
    this.statistics.botStats.set(botId, {
      botId,
      messagesProcessed: 0,
      averageProcessingTime: 0,
      errors: 0,
      lastActivity: Date.now()
    });

    this.log(`Registered bot: ${botId}`);
  }

  /**
   * Unregister a bot
   */
  unregisterBot(botId: string): void {
    if (this.bots.has(botId)) {
      this.bots.delete(botId);
      this.statistics.botStats.delete(botId);
      this.log(`Unregistered bot: ${botId}`);
    }
  }

  /**
   * Add a routing rule
   */
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push(rule);
    this.routingRules.sort((a, b) => b.priority - a.priority); // Higher priority first
    this.log(`Added routing rule with priority ${rule.priority}`);
  }

  /**
   * Remove routing rules that match a description
   */
  removeRoutingRule(description: string): void {
    const initialCount = this.routingRules.length;
    this.routingRules = this.routingRules.filter(rule => rule.description !== description);
    const removedCount = initialCount - this.routingRules.length;
    this.log(`Removed ${removedCount} routing rules with description: ${description}`);
  }

  /**
   * Register a message transformer for a platform
   */
  registerTransformer(platform: PlatformType, transformer: MessageTransformer): void {
    if (!this.transformers.has(platform)) {
      this.transformers.set(platform, []);
    }
    this.transformers.get(platform)!.push(transformer);
    this.log(`Registered transformer for platform: ${platform}`);
  }

  /**
   * Route a message through the system
   */
  async routeMessage(message: UIPMessage): Promise<RouteResult> {
    const startTime = Date.now();
    const messageId = message.id;

    this.log(`Routing message ${messageId} from ${message.source.platform} to ${message.target.platform}`);

    try {
      // Validate message
      const validation = this.validateMessage(message);
      if (!validation.valid) {
        throw new Error(`Invalid message: ${validation.errors.join(', ')}`);
      }

      // Apply routing rules to determine targets
      const targets = this.applyRoutingRules(message);
      if (targets.length === 0) {
        this.log(`No routing targets found for message ${messageId}`);
        return this.createRouteResult(messageId, [], new Map(), [], startTime);
      }

      // Route to each target
      const results = new Map<string, SendResult>();
      const errors: string[] = [];

      for (const target of targets) {
        try {
          const result = await this.routeToTarget(message, target);
          results.set(this.getTargetKey(target), result);
        } catch (error) {
          const errorMsg = `Failed to route to target ${this.getTargetKey(target)}: ${error}`;
          errors.push(errorMsg);
          this.log(errorMsg);
        }
      }

      // Update statistics
      this.updateStatistics(startTime, results, errors);

      return this.createRouteResult(messageId, targets, results, errors, startTime);

    } catch (error) {
      const errorMsg = `Routing failed for message ${messageId}: ${error}`;
      this.log(errorMsg);

      // Update statistics for failure
      this.statistics.totalMessages++;
      this.statistics.failedRoutes++;
      this.statistics.averageRouteTime = this.calculateMovingAverage(
        this.statistics.averageRouteTime,
        Date.now() - startTime,
        this.statistics.totalMessages
      );

      return {
        success: false,
        messageId,
        targets: [],
        results: new Map(),
        errors: [errorMsg],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Route message asynchronously (queued)
   */
  async routeMessageAsync(message: UIPMessage): Promise<RouteResult> {
    return new Promise((resolve, reject) => {
      this.messageQueue.push({ message, resolve, reject });
      this.processMessageQueue();
    });
  }

  /**
   * Get router statistics
   */
  getStatistics(): RouteStatistics {
    return { ...this.statistics };
  }

  /**
   * Reset router statistics
   */
  resetStatistics(): void {
    this.statistics = {
      totalMessages: 0,
      successfulRoutes: 0,
      failedRoutes: 0,
      averageRouteTime: 0,
      adapterStats: new Map(),
      botStats: new Map()
    };
  }

  /**
   * Get all registered adapters
   */
  getAdapters(): UniversalPlatformAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get all registered bots
   */
  getBots(): SMPbotMessageHandler[] {
    return Array.from(this.bots.values());
  }

  /**
   * Get adapter by ID
   */
  getAdapter(adapterId: string): UniversalPlatformAdapter | undefined {
    return this.adapters.get(adapterId);
  }

  /**
   * Get bot by ID
   */
  getBot(botId: string): SMPbotMessageHandler | undefined {
    return this.bots.get(botId);
  }

  // ============================================================================
  // Protected Methods
  // ============================================================================

  /**
   * Handle incoming message from adapter
   */
  protected async handleIncomingMessage(message: UIPMessage, sourceAdapterId: string): Promise<void> {
    this.log(`Received message ${message.id} from adapter ${sourceAdapterId}`);

    // Update adapter statistics
    const adapterStats = this.statistics.adapterStats.get(sourceAdapterId);
    if (adapterStats) {
      adapterStats.messagesReceived++;
      adapterStats.lastActivity = Date.now();
    }

    // Check if message is for a bot
    const botTarget = this.findBotForMessage(message);
    if (botTarget) {
      await this.routeToBot(message, botTarget);
    } else {
      // Route message through normal routing
      await this.routeMessage(message);
    }
  }

  /**
   * Apply routing rules to determine targets
   */
  protected applyRoutingRules(message: UIPMessage): RoutingTarget[] {
    const targets: RoutingTarget[] = [];

    // Apply rules in priority order
    for (const rule of this.routingRules) {
      if (rule.match(message)) {
        targets.push(...rule.targets);
        this.log(`Rule matched for message ${message.id}, added ${rule.targets.length} targets`);
      }
    }

    // If no rules matched and defaultRouteAll is enabled, route to all adapters
    if (targets.length === 0 && this.config.defaultRouteAll) {
      for (const adapter of this.adapters.values()) {
        targets.push({
          platform: adapter.platform,
          adapterId: adapter.adapterId
        });
      }
      this.log(`Default routing: sending to all ${targets.length} adapters`);
    }

    return targets;
  }

  /**
   * Route message to a specific target
   */
  protected async routeToTarget(message: UIPMessage, target: RoutingTarget): Promise<SendResult> {
    const startTime = Date.now();

    // Find adapter for this target
    const adapter = this.findAdapterForTarget(target);
    if (!adapter) {
      throw new Error(`No adapter found for target: ${this.getTargetKey(target)}`);
    }

    // Transform message if needed
    let transformedMessage = message;
    if (target.transform) {
      transformedMessage = await target.transform(message);
    }

    // Apply platform-specific transformers
    transformedMessage = await this.applyTransformers(transformedMessage, adapter.platform);

    // Send through adapter
    const result = await adapter.send(transformedMessage);

    // Update adapter statistics
    const adapterStats = this.statistics.adapterStats.get(adapter.adapterId);
    if (adapterStats) {
      adapterStats.messagesSent++;
      adapterStats.averageSendTime = this.calculateMovingAverage(
        adapterStats.averageSendTime,
        Date.now() - startTime,
        adapterStats.messagesSent
      );
      adapterStats.lastActivity = Date.now();
    }

    return result;
  }

  /**
   * Route message to a bot
   */
  protected async routeToBot(message: UIPMessage, bot: SMPbotMessageHandler): Promise<void> {
    const startTime = Date.now();
    const botId = bot.getBotId();

    try {
      // Let bot handle the message
      const response = await bot.handleMessage(message);

      // Update bot statistics
      const botStats = this.statistics.botStats.get(botId);
      if (botStats) {
        botStats.messagesProcessed++;
        botStats.averageProcessingTime = this.calculateMovingAverage(
          botStats.averageProcessingTime,
          Date.now() - startTime,
          botStats.messagesProcessed
        );
        botStats.lastActivity = Date.now();
      }

      // If bot returned a response, route it
      if (response) {
        await this.routeMessage(response);
      }

    } catch (error) {
      this.log(`Bot ${botId} failed to handle message ${message.id}:`, error);

      // Update bot statistics for error
      const botStats = this.statistics.botStats.get(botId);
      if (botStats) {
        botStats.errors++;
        botStats.lastActivity = Date.now();
      }

      // Create error response
      const errorResponse: UIPMessage = {
        id: this.generateMessageId(),
        timestamp: Date.now(),
        protocolVersion: CURRENT_PROTOCOL_VERSION,
        source: {
          platform: PlatformType.API,
          channel: 'router'
        },
        target: message.source,
        type: 'error',
        payload: {
          originalMessageId: message.id,
          error: error instanceof Error ? error.message : String(error)
        },
        metadata: {
          correlationId: message.id
        }
      };

      await this.routeMessage(errorResponse);
    }
  }

  /**
   * Find adapter for routing target
   */
  protected findAdapterForTarget(target: RoutingTarget): UniversalPlatformAdapter | undefined {
    // First try to find by adapterId
    if (target.adapterId) {
      return this.adapters.get(target.adapterId);
    }

    // Then try to find by platform
    for (const adapter of this.adapters.values()) {
      if (adapter.platform === target.platform) {
        // If channel is specified, check if adapter supports it
        if (!target.channel || this.adapterSupportsChannel(adapter, target.channel)) {
          return adapter;
        }
      }
    }

    return undefined;
  }

  /**
   * Find bot for message
   */
  protected findBotForMessage(message: UIPMessage): SMPbotMessageHandler | undefined {
    for (const bot of this.bots.values()) {
      if (bot.canHandle(message)) {
        return bot;
      }
    }
    return undefined;
  }

  /**
   * Apply platform-specific transformers to message
   */
  protected async applyTransformers(message: UIPMessage, platform: PlatformType): Promise<UIPMessage> {
    let transformedMessage = message;
    const transformers = this.transformers.get(platform) || [];

    for (const transformer of transformers) {
      transformedMessage = await transformer(transformedMessage);
    }

    return transformedMessage;
  }

  /**
   * Validate message before routing
   */
  protected validateMessage(message: UIPMessage): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!message.id) errors.push('Message ID is required');
    if (!message.timestamp) errors.push('Timestamp is required');
    if (!message.protocolVersion) errors.push('Protocol version is required');
    if (!message.source || !message.source.platform) errors.push('Source platform is required');
    if (!message.target || !message.target.platform) errors.push('Target platform is required');
    if (!message.type) errors.push('Message type is required');

    // Check timestamp is not in the future
    if (message.timestamp > Date.now() + 60000) { // 1 minute tolerance
      errors.push('Message timestamp is too far in the future');
    }

    // Check TTL if present
    if (message.metadata?.ttl && message.timestamp + message.metadata.ttl < Date.now()) {
      errors.push('Message has expired (TTL exceeded)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if adapter supports a channel
   */
  protected adapterSupportsChannel(adapter: UniversalPlatformAdapter, channel: string): boolean {
    // Default implementation - can be overridden by specific adapters
    // For now, assume all adapters support all channels
    return true;
  }

  /**
   * Generate unique message ID
   */
  protected generateMessageId(): string {
    return `router-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get string key for routing target
   */
  protected getTargetKey(target: RoutingTarget): string {
    return `${target.platform}:${target.adapterId || 'any'}:${target.channel || 'any'}`;
  }

  /**
   * Create route result
   */
  protected createRouteResult(
    messageId: string,
    targets: RoutingTarget[],
    results: Map<string, SendResult>,
    errors: string[],
    startTime: number
  ): RouteResult {
    const success = errors.length === 0 && results.size > 0;
    const duration = Date.now() - startTime;

    return {
      success,
      messageId,
      targets,
      results,
      errors,
      duration
    };
  }

  /**
   * Update statistics after routing
   */
  protected updateStatistics(startTime: number, results: Map<string, SendResult>, errors: string[]): void {
    this.statistics.totalMessages++;

    if (errors.length === 0 && results.size > 0) {
      this.statistics.successfulRoutes++;
    } else {
      this.statistics.failedRoutes++;
    }

    this.statistics.averageRouteTime = this.calculateMovingAverage(
      this.statistics.averageRouteTime,
      Date.now() - startTime,
      this.statistics.totalMessages
    );
  }

  /**
   * Calculate moving average
   */
  protected calculateMovingAverage(currentAverage: number, newValue: number, count: number): number {
    return (currentAverage * (count - 1) + newValue) / count;
  }

  /**
   * Process message queue asynchronously
   */
  protected async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.messageQueue.length > 0) {
        const item = this.messageQueue.shift();
        if (item) {
          try {
            const result = await this.routeMessage(item.message);
            item.resolve(result);
          } catch (error) {
            item.reject(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Log message if logging is enabled
   */
  protected log(...args: unknown[]): void {
    if (this.config.enableMessageLogging) {
      console.log('[MessageRouter]', ...args);
    }
  }
}