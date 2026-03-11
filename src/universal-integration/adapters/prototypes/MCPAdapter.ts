/**
 * MCP (Model Context Protocol) Platform Adapter Prototype
 *
 * Adapter for MCP protocol communication.
 * Enables SMPbot integration with LLM tools and context management systems.
 */

import {
  UniversalPlatformAdapter,
  AdapterConfig,
  AdapterState,
  AdapterEvent
} from '../UniversalPlatformAdapter.js';
import {
  UIPMessage,
  PlatformType,
  MessageType,
  SendResult,
  SendErrorCode,
  PlatformCapabilities,
  RateLimitConfig,
  AuthMethod,
  CURRENT_PROTOCOL_VERSION
} from '../../protocol/types.js';

/**
 * MCP adapter configuration
 */
export interface MCPAdapterConfig extends AdapterConfig {
  options: {
    serverUrl?: string;
    clientId?: string;
    tools?: MCPTool[];
    contextSize?: number;
    autoRegisterTools?: boolean;
    debug?: boolean;
  };
}

/**
 * MCP tool definition
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: unknown) => Promise<unknown>;
}

/**
 * MCP message types
 */
enum MCPMessageType {
  TOOLS_LIST = 'tools/list',
  TOOLS_CALL = 'tools/call',
  CONTEXT_GET = 'context/get',
  CONTEXT_UPDATE = 'context/update',
  NOTIFICATION = 'notification'
}

/**
 * MCP message format
 */
interface MCPMessage {
  type: MCPMessageType;
  data?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * MCP adapter implementation
 */
export class MCPAdapter extends UniversalPlatformAdapter {
  private serverUrl: string;
  private clientId: string;
  private tools: Map<string, MCPTool>;
  private contextSize: number;
  private autoRegisterTools: boolean;

  private messageReceiver?: (message: UIPMessage) => Promise<void>;
  private mcpSocket: WebSocket | null = null;
  private context: Map<string, unknown> = new Map();
  private pendingRequests: Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }> = new Map();

  /**
   * Constructor
   */
  constructor(config: MCPAdapterConfig) {
    super(config);

    this.serverUrl = config.options?.serverUrl || 'ws://localhost:3000/mcp';
    this.clientId = config.options?.clientId || `mcp-client-${Date.now()}`;
    this.tools = new Map();
    this.contextSize = config.options?.contextSize || 1000;
    this.autoRegisterTools = config.options?.autoRegisterTools !== false;

    // Initialize MCP-specific capabilities
    this.initializeMCPCapabilities();

    // Register tools if provided
    if (config.options?.tools) {
      config.options.tools.forEach(tool => this.registerTool(tool));
    }
  }

  // ============================================================================
  // UniversalPlatformAdapter Implementation
  // ============================================================================

  /**
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    this.log('Initializing MCP adapter...');

    try {
      // Validate configuration
      this.validateConfig();

      // Connect to MCP server
      await this.connectToMCPServer();

      // Register tools if auto-registration is enabled
      if (this.autoRegisterTools && this.tools.size > 0) {
        await this.registerToolsWithServer();
      }

      this.setAdapterState(AdapterState.CONNECTED);
      this.emitEvent(AdapterEvent.CONNECTED);

      this.log('MCP adapter initialized successfully');

    } catch (error) {
      this.handlePlatformError(error, 'initialize');
      throw error;
    }
  }

  /**
   * Connect to the MCP platform
   */
  async connect(): Promise<void> {
    if (this.isConnected()) {
      this.log('Already connected');
      return;
    }

    this.setAdapterState(AdapterState.CONNECTING);
    this.log('Connecting to MCP platform...');

    try {
      await this.connectToMCPServer();
      this.setAdapterState(AdapterState.CONNECTED);
      this.emitEvent(AdapterEvent.CONNECTED);
      this.log('Connected to MCP platform');

    } catch (error) {
      this.handlePlatformError(error, 'connect');
      this.setAdapterState(AdapterState.ERROR);
      throw error;
    }
  }

  /**
   * Disconnect from the MCP platform
   */
  async disconnect(): Promise<void> {
    this.log('Disconnecting from MCP platform...');

    try {
      // Close WebSocket connection
      if (this.mcpSocket) {
        this.mcpSocket.close();
        this.mcpSocket = null;
      }

      // Clear context
      this.context.clear();

      // Reject pending requests
      for (const [requestId, { reject }] of this.pendingRequests.entries()) {
        reject(new Error(`MCP disconnected: request ${requestId} cancelled`));
      }
      this.pendingRequests.clear();

      this.setAdapterState(AdapterState.DISCONNECTED);
      this.emitEvent(AdapterEvent.DISCONNECTED);
      this.log('Disconnected from MCP platform');

    } catch (error) {
      this.handlePlatformError(error, 'disconnect');
      throw error;
    }
  }

  /**
   * Send a message through the MCP adapter
   */
  async send(message: UIPMessage): Promise<SendResult> {
    const startTime = Date.now();

    try {
      // Validate message
      const validation = this.validateMessage(message);
      if (!validation.valid) {
        return this.createSendResult(false, {
          code: SendErrorCode.INVALID_MESSAGE,
          message: `Invalid message: ${validation.errors.join(', ')}`,
          retryable: false
        }, startTime);
      }

      // Transform message to MCP format
      const mcpMessage = await this.transformToPlatform(message);

      // Send via MCP
      const response = await this.sendMCPSafe(mcpMessage);

      // Update statistics
      this.emitEvent(AdapterEvent.MESSAGE_SENT, { message, response });

      return this.createSendResult(true, undefined, startTime, {
        platformMessageId: response?.requestId
      });

    } catch (error) {
      this.handlePlatformError(error, 'send');
      return this.createSendResult(false, {
        code: SendErrorCode.PLATFORM_ERROR,
        message: error instanceof Error ? error.message : String(error),
        retryable: this.isRetryableError(error),
        retryDelay: 1000
      }, startTime);
    }
  }

  /**
   * Register message receiver callback
   */
  receive(callback: (message: UIPMessage) => Promise<void>): void {
    this.messageReceiver = callback;
    this.log('Message receiver registered');
  }

  // ============================================================================
  // MCP-Specific Methods
  // ============================================================================

  /**
   * Register a tool with the MCP adapter
   */
  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    this.log(`Registered tool: ${tool.name}`);

    // Auto-register with server if connected
    if (this.isConnected() && this.autoRegisterTools) {
      this.registerToolWithServer(tool).catch(error => {
        this.log(`Failed to auto-register tool ${tool.name}:`, error);
      });
    }
  }

  /**
   * Unregister a tool
   */
  unregisterTool(toolName: string): boolean {
    const removed = this.tools.delete(toolName);
    if (removed) {
      this.log(`Unregistered tool: ${toolName}`);
    }
    return removed;
  }

  /**
   * Get list of registered tools
   */
  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Update context
   */
  updateContext(key: string, value: unknown): void {
    this.context.set(key, value);

    // Trim context if it exceeds size limit
    if (this.context.size > this.contextSize) {
      const firstKey = this.context.keys().next().value;
      if (firstKey) {
        this.context.delete(firstKey);
      }
    }

    // Notify server of context update
    if (this.isConnected()) {
      this.sendContextUpdate(key, value).catch(error => {
        this.log(`Failed to send context update for ${key}:`, error);
      });
    }
  }

  /**
   * Get context value
   */
  getContext(key: string): unknown {
    return this.context.get(key);
  }

  /**
   * Clear context
   */
  clearContext(key?: string): void {
    if (key) {
      this.context.delete(key);
    } else {
      this.context.clear();
    }
  }

  // ============================================================================
  // MCP Server Communication
  // ============================================================================

  /**
   * Connect to MCP server
   */
  private async connectToMCPServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.mcpSocket = new WebSocket(this.serverUrl);

        this.mcpSocket.onopen = () => {
          this.log('MCP WebSocket connected');
          this.setupMCPHandlers();
          resolve();
        };

        this.mcpSocket.onmessage = (event) => {
          this.handleMCPMessage(event);
        };

        this.mcpSocket.onerror = (error) => {
          this.log('MCP WebSocket error:', error);
          reject(new Error('MCP connection error'));
        };

        this.mcpSocket.onclose = (event) => {
          this.log(`MCP WebSocket closed: ${event.code} ${event.reason}`);
          this.handleMCPDisconnect(event);
        };

        // Set timeout for connection
        setTimeout(() => {
          if (this.mcpSocket?.readyState !== WebSocket.OPEN) {
            reject(new Error('MCP connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Set up MCP message handlers
   */
  private setupMCPHandlers(): void {
    // Send client identification
    this.sendMCPMessage({
      type: MCPMessageType.NOTIFICATION,
      data: {
        clientId: this.clientId,
        capabilities: this.getCapabilities()
      }
    }).catch(error => {
      this.log('Failed to send client identification:', error);
    });
  }

  /**
   * Handle MCP message
   */
  private async handleMCPMessage(event: MessageEvent): Promise<void> {
    try {
      const mcpMessage: MCPMessage = JSON.parse(event.data);

      switch (mcpMessage.type) {
        case MCPMessageType.TOOLS_CALL:
          await this.handleToolCall(mcpMessage);
          break;

        case MCPMessageType.CONTEXT_GET:
          await this.handleContextGet(mcpMessage);
          break;

        case MCPMessageType.CONTEXT_UPDATE:
          await this.handleContextUpdate(mcpMessage);
          break;

        case MCPMessageType.NOTIFICATION:
          await this.handleNotification(mcpMessage);
          break;

        default:
          this.log(`Unknown MCP message type: ${mcpMessage.type}`);
      }

    } catch (error) {
      this.log('Error handling MCP message:', error);
    }
  }

  /**
   * Handle tool call request
   */
  private async handleToolCall(message: MCPMessage): Promise<void> {
    const requestId = (message.metadata?.requestId as string) || `req-${Date.now()}`;
    const toolCall = message.data as { tool: string; input: unknown };

    try {
      const tool = this.tools.get(toolCall.tool);
      if (!tool) {
        throw new Error(`Tool not found: ${toolCall.tool}`);
      }

      // Execute tool
      const result = await tool.handler(toolCall.input);

      // Send success response
      await this.sendMCPMessage({
        type: MCPMessageType.TOOLS_CALL,
        data: { result },
        metadata: { requestId, success: true }
      });

    } catch (error) {
      // Send error response
      await this.sendMCPMessage({
        type: MCPMessageType.TOOLS_CALL,
        data: { error: error instanceof Error ? error.message : String(error) },
        metadata: { requestId, success: false }
      });
    }
  }

  /**
   * Handle context get request
   */
  private async handleContextGet(message: MCPMessage): Promise<void> {
    const requestId = (message.metadata?.requestId as string) || `req-${Date.now()}`;
    const key = message.data as string;

    try {
      const value = this.context.get(key);

      await this.sendMCPMessage({
        type: MCPMessageType.CONTEXT_GET,
        data: { key, value },
        metadata: { requestId, success: true }
      });

    } catch (error) {
      await this.sendMCPMessage({
        type: MCPMessageType.CONTEXT_GET,
        data: { error: error instanceof Error ? error.message : String(error) },
        metadata: { requestId, success: false }
      });
    }
  }

  /**
   * Handle context update
   */
  private async handleContextUpdate(message: MCPMessage): Promise<void> {
    const update = message.data as { key: string; value: unknown };
    this.context.set(update.key, update.value);
    this.log(`Context updated: ${update.key}`);
  }

  /**
   * Handle notification
   */
  private async handleNotification(message: MCPMessage): Promise<void> {
    const notification = message.data as Record<string, unknown>;

    // Convert to UIP message if possible
    if (notification.type && notification.data) {
      const uipMessage = await this.transformFromPlatform(notification);

      if (this.messageReceiver) {
        await this.messageReceiver(uipMessage);
        this.emitEvent(AdapterEvent.MESSAGE_RECEIVED, { message: uipMessage });
      }
    }
  }

  /**
   * Handle MCP disconnect
   */
  private handleMCPDisconnect(event: CloseEvent): void {
    this.mcpSocket = null;

    if (event.code !== 1000 && this.isConnected()) {
      this.log('MCP disconnected unexpectedly');
      this.setAdapterState(AdapterState.RECONNECTING);
      this.attemptMCPReconnect();
    }
  }

  /**
   * Attempt to reconnect to MCP
   */
  private async attemptMCPReconnect(): Promise<void> {
    const maxAttempts = this.config.options?.reconnectAttempts || 5;
    let attempts = 0;

    while (attempts < maxAttempts && !this.isConnected()) {
      attempts++;
      const delay = Math.min(1000 * Math.pow(2, attempts), 30000);

      this.log(`MCP reconnect attempt ${attempts} in ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        await this.connectToMCPServer();
        this.setAdapterState(AdapterState.CONNECTED);
        this.log('MCP reconnected successfully');
        return;
      } catch (error) {
        this.log(`MCP reconnect attempt ${attempts} failed:`, error);
      }
    }

    this.log(`Max MCP reconnect attempts (${maxAttempts}) reached`);
    this.setAdapterState(AdapterState.ERROR);
  }

  /**
   * Send MCP message safely
   */
  private async sendMCPSafe(message: unknown): Promise<unknown> {
    if (!this.mcpSocket || this.mcpSocket.readyState !== WebSocket.OPEN) {
      throw new Error('MCP not connected');
    }

    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject });

      // Add request ID to message
      const messageWithId = {
        ...(typeof message === 'object' ? message : { data: message }),
        metadata: {
          ...(typeof message === 'object' && message !== null && 'metadata' in message
            ? (message as any).metadata
            : {}),
          requestId
        }
      };

      // Send message
      this.mcpSocket!.send(JSON.stringify(messageWithId));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('MCP response timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Send MCP message
   */
  private async sendMCPMessage(message: MCPMessage): Promise<void> {
    if (!this.mcpSocket || this.mcpSocket.readyState !== WebSocket.OPEN) {
      throw new Error('MCP not connected');
    }

    this.mcpSocket.send(JSON.stringify(message));
  }

  /**
   * Register tools with server
   */
  private async registerToolsWithServer(): Promise<void> {
    const tools = this.getTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));

    await this.sendMCPMessage({
      type: MCPMessageType.TOOLS_LIST,
      data: { tools }
    });

    this.log(`Registered ${tools.length} tools with MCP server`);
  }

  /**
   * Register single tool with server
   */
  private async registerToolWithServer(tool: MCPTool): Promise<void> {
    await this.sendMCPMessage({
      type: MCPMessageType.TOOLS_LIST,
      data: {
        tools: [{
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }]
      }
    });

    this.log(`Registered tool ${tool.name} with MCP server`);
  }

  /**
   * Send context update to server
   */
  private async sendContextUpdate(key: string, value: unknown): Promise<void> {
    await this.sendMCPMessage({
      type: MCPMessageType.CONTEXT_UPDATE,
      data: { key, value }
    });
  }

  // ============================================================================
  // Message Transformation
  // ============================================================================

  /**
   * Transform UIP message to MCP format
   */
  protected async transformToPlatform(message: UIPMessage): Promise<unknown> {
    // Convert UIP message to MCP tool call or notification
    if (message.type === MessageType.COMMAND || message.type === MessageType.QUERY) {
      // Treat as tool call
      const payload = message.payload as Record<string, unknown>;
      return {
        type: MCPMessageType.TOOLS_CALL,
        data: {
          tool: payload.command || 'query',
          input: payload.args || payload
        },
        metadata: {
          source: message.source,
          correlationId: message.id
        }
      };
    } else {
      // Treat as notification
      return {
        type: MCPMessageType.NOTIFICATION,
        data: {
          type: message.type,
          content: message.payload,
          metadata: message.metadata
        },
        metadata: {
          source: message.source,
          correlationId: message.id
        }
      };
    }
  }

  /**
   * Transform MCP message to UIP format
   */
  protected async transformFromPlatform(data: unknown): Promise<UIPMessage> {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid MCP message data');
    }

    const mcpMsg = data as Record<string, unknown>;
    const mcpData = mcpMsg.data as Record<string, unknown>;
    const mcpMetadata = mcpMsg.metadata as Record<string, unknown>;

    // Determine UIP message type from MCP type
    let type: MessageType = MessageType.TEXT;
    let payload: unknown = mcpData;

    if (mcpMsg.type === MCPMessageType.TOOLS_CALL) {
      type = MessageType.COMMAND;
      payload = {
        command: (mcpData as any).tool,
        args: [(mcpData as any).input]
      };
    } else if (mcpMsg.type === MCPMessageType.NOTIFICATION) {
      const notification = mcpData as Record<string, unknown>;
      type = (notification.type as MessageType) || MessageType.TEXT;
      payload = notification.content;
    }

    return {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      source: {
        platform: PlatformType.MCP,
        channel: 'mcp-server',
        adapterId: this.adapterId
      },
      target: {
        platform: PlatformType.API,
        channel: 'mcp-router'
      },
      type,
      payload,
      metadata: {
        ...(mcpMetadata as any),
        mcpType: mcpMsg.type
      }
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Initialize MCP-specific capabilities
   */
  private initializeMCPCapabilities(): void {
    const mcpCapabilities: Partial<PlatformCapabilities> = {
      platform: PlatformType.MCP,
      supportedMessageTypes: [
        MessageType.TEXT,
        MessageType.COMMAND,
        MessageType.QUERY,
        MessageType.RESPONSE,
        MessageType.ERROR,
        MessageType.STATE_SYNC
      ],
      maxMessageSize: 5 * 1024 * 1024, // 5MB for MCP
      supportsFiles: true,
      supportsRealtime: true,
      supportsStateSync: true,
      rateLimits: {
        maxRequests: 100,
        windowMs: 60000
      },
      authenticationMethods: [
        { type: 'api_key', name: 'MCP API Key', required: true }
      ],
      features: [
        'tool-calling',
        'context-management',
        'realtime-messaging',
        'state-sync'
      ]
    };

    this.capabilities = { ...this.capabilities, ...mcpCapabilities };
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.serverUrl) {
      throw new Error('Server URL is required');
    }

    if (!this.serverUrl.startsWith('ws://') && !this.serverUrl.startsWith('wss://')) {
      throw new Error('Server URL must start with ws:// or wss://');
    }

    if (typeof WebSocket === 'undefined') {
      throw new Error('WebSocket not supported in this environment');
    }
  }

  /**
   * Create send result
   */
  private createSendResult(
    success: boolean,
    error?: { code: SendErrorCode; message: string; retryable: boolean; retryDelay?: number },
    startTime?: number,
    metadata?: { platformMessageId?: string; rateLimitInfo?: any }
  ): SendResult {
    const duration = startTime ? Date.now() - startTime : 0;

    return {
      success,
      messageId: metadata?.platformMessageId,
      error,
      metadata: {
        timestamp: Date.now(),
        duration,
        platformMessageId: metadata?.platformMessageId,
        rateLimitInfo: metadata?.rateLimitInfo
      }
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('temporarily')
      );
    }
    return false;
  }

  /**
   * Log message if debug is enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.options?.debug) {
      console.log('[MCPAdapter]', ...args);
    }
  }
}