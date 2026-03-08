/**
 * POLLN WebSocket API Client
 *
 * Type-safe WebSocket client for POLLN API with automatic reconnection,
 * event handling, and request/response correlation.
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';

// ============================================================================
// Types
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

export interface ClientMessage {
  id: string;
  timestamp: number;
  type: ClientMessageType;
  payload: unknown;
}

export interface ServerMessage {
  id: string;
  timestamp: number;
  type: ServerMessageType;
  payload: unknown;
  success?: boolean;
  error?: APIError;
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
  hits: number;
  misses: number;
  hitRate: number;
  missRate: number;
  size: number;
  capacity: number;
  evictions: number;
}

// ============================================================================
// Client Class
// ============================================================================

export class POLLNClient extends EventEmitter {
  private config: Required<POLLNClientConfig>;
  private ws: WebSocket | null = null;
  private connected = false;
  private authenticated = false;
  private reconnectAttempts = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: ServerMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private messageIdCounter = 0;

  constructor(config: POLLNClientConfig) {
    super();
    this.config = {
      url: config.url,
      token: config.token || '',
      debug: config.debug || false,
      reconnect: config.reconnect !== undefined ? config.reconnect : true,
      reconnectInterval: config.reconnectInterval || 1000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      requestTimeout: config.requestTimeout || 30000,
    };
  }

  // ========================================================================
  // Connection
  // ========================================================================

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.debug('Connecting to', this.config.url);
        this.ws = new WebSocket(this.config.url);

        this.ws.on('open', () => {
          this.debug('Connected');
          this.connected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          this.debug('WebSocket error:', error.message);
          this.emit('error', error);
        });

        this.ws.on('close', () => {
          this.debug('Disconnected');
          this.connected = false;
          this.authenticated = false;
          this.emit('disconnected');

          // Reject all pending requests
          for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Connection closed'));
          }
          this.pendingRequests.clear();

          // Attempt reconnection
          if (this.config.reconnect) {
            this.attemptReconnect();
          }
        });

        this.ws.on('ping', (data: Buffer) => {
          this.debug('Received ping');
          if (this.ws) {
            this.ws.pong(data);
          }
        });

        this.ws.on('pong', (data: Buffer) => {
          this.debug('Received pong');
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    this.config.reconnect = false; // Disable reconnection on explicit disconnect

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
    this.authenticated = false;
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.debug('Max reconnection attempts reached');
      this.emit('reconnect:failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);

    this.debug(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    this.emit('reconnect:attempt', this.reconnectAttempts);

    setTimeout(async () => {
      try {
        await this.connect();
        this.debug('Reconnected');
        this.emit('reconnected');

        // Resubscribe to events
        this.emit('resubscribe');
      } catch (error) {
        this.debug('Reconnection failed:', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  // ========================================================================
  // Message Handling
  // ========================================================================

  private handleMessage(data: Buffer): void {
    try {
      const message: ServerMessage = JSON.parse(data.toString());
      this.debug('Received message:', message.type);

      // Handle pending requests
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);

        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message);
        }
        return;
      }

      // Emit events
      if (message.type === 'event:colony') {
        this.emit('colony:event', message.payload);
      } else if (message.type === 'event:agent') {
        this.emit('agent:event', message.payload);
      } else if (message.type === 'event:dream') {
        this.emit('dream:event', message.payload);
      } else if (message.type === 'event:stats') {
        this.emit('stats:event', message.payload);
      } else if (message.type === 'error') {
        this.emit('error', message.error);
      }

    } catch (error) {
      this.debug('Failed to parse message:', error);
    }
  }

  private send(message: ClientMessage): Promise<ServerMessage> {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.ws) {
        reject(new Error('Not connected'));
        return;
      }

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error('Request timeout'));
      }, this.config.requestTimeout);

      this.pendingRequests.set(message.id, { resolve, reject, timeout });

      try {
        this.ws.send(JSON.stringify(message));
        this.debug('Sent message:', message.type);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(message.id);
        reject(error);
      }
    });
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}`;
  }

  private createMessage(type: ClientMessageType, payload: unknown): ClientMessage {
    return {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      type,
      payload,
    };
  }

  private debug(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[POLLNClient]', ...args);
    }
  }

  // ========================================================================
  // Subscriptions
  // ========================================================================

  /**
   * Subscribe to colony events
   */
  async subscribeToColony(colonyId: string, events: string[]): Promise<void> {
    const message = this.createMessage('subscribe:colony', { colonyId, events });
    await this.send(message);
  }

  /**
   * Unsubscribe from colony events
   */
  async unsubscribeFromColony(colonyId: string): Promise<void> {
    const message = this.createMessage('unsubscribe:colony', { colonyId });
    await this.send(message);
  }

  /**
   * Subscribe to agent events
   */
  async subscribeToAgent(agentId: string, events: string[]): Promise<void> {
    const message = this.createMessage('subscribe:agent', { agentId, events });
    await this.send(message);
  }

  /**
   * Unsubscribe from agent events
   */
  async unsubscribeFromAgent(agentId: string): Promise<void> {
    const message = this.createMessage('unsubscribe:agent', { agentId });
    await this.send(message);
  }

  /**
   * Subscribe to dream events
   */
  async subscribeToDreams(colonyId: string): Promise<void> {
    const message = this.createMessage('subscribe:dreams', { colonyId });
    await this.send(message);
  }

  /**
   * Unsubscribe from dream events
   */
  async unsubscribeFromDreams(colonyId: string): Promise<void> {
    const message = this.createMessage('unsubscribe:dreams', { colonyId });
    await this.send(message);
  }

  /**
   * Subscribe to stats updates
   */
  async subscribeToStats(colonyId: string): Promise<void> {
    const message = this.createMessage('subscribe:stats', { colonyId });
    await this.send(message);
  }

  /**
   * Unsubscribe from stats updates
   */
  async unsubscribeFromStats(colonyId: string): Promise<void> {
    const message = this.createMessage('unsubscribe:stats', { colonyId });
    await this.send(message);
  }

  // ========================================================================
  // Commands
  // ========================================================================

  /**
   * Spawn a new agent
   */
  async spawnAgent(typeId: string, config?: Record<string, unknown>): Promise<{ success: boolean; message: string; data?: unknown }> {
    const message = this.createMessage('command:spawn', { typeId, config });
    const response = await this.send(message);
    return response.payload as any;
  }

  /**
   * Despawn an agent
   */
  async despawnAgent(agentId: string): Promise<{ success: boolean; message: string; data?: unknown }> {
    const message = this.createMessage('command:despawn', { agentId });
    const response = await this.send(message);
    return response.payload as any;
  }

  /**
   * Activate an agent
   */
  async activateAgent(agentId: string): Promise<{ success: boolean; message: string; data?: unknown }> {
    const message = this.createMessage('command:activate', { agentId });
    const response = await this.send(message);
    return response.payload as any;
  }

  /**
   * Deactivate an agent
   */
  async deactivateAgent(agentId: string): Promise<{ success: boolean; message: string; data?: unknown }> {
    const message = this.createMessage('command:deactivate', { agentId });
    const response = await this.send(message);
    return response.payload as any;
  }

  /**
   * Trigger dream cycle
   */
  async triggerDream(colonyId: string, options?: { agentId?: string; episodeCount?: number }): Promise<{ success: boolean; message: string; data?: unknown }> {
    const message = this.createMessage('command:dream', { colonyId, ...options });
    const response = await this.send(message);
    return response.payload as any;
  }

  // ========================================================================
  // Queries
  // ========================================================================

  /**
   * Query colony statistics
   */
  async queryStats(colonyId: string, options?: { includeKVCache?: boolean; includeAgents?: boolean }): Promise<{
    colonyId: string;
    stats: ColonyStats;
    kvCacheStats?: CacheStats;
    agents?: AgentState[];
  }> {
    const message = this.createMessage('query:stats', { colonyId, ...options });
    const response = await this.send(message);
    return response.payload as any;
  }

  /**
   * Query agents
   */
  async queryAgents(colonyId: string, filter?: {
    status?: string;
    typeId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    colonyId: string;
    agents: AgentState[];
    total: number;
    filtered: number;
  }> {
    const message = this.createMessage('query:agents', { colonyId, filter });
    const response = await this.send(message);
    return response.payload as any;
  }

  /**
   * Query a specific agent
   */
  async queryAgent(agentId: string, options?: { includeHistory?: boolean }): Promise<{
    agent: AgentState;
    config?: Record<string, unknown>;
    history?: Array<{ timestamp: number; event: string; data: unknown }>;
  }> {
    const message = this.createMessage('query:agent', { agentId, ...options });
    const response = await this.send(message);
    return response.payload as any;
  }

  /**
   * Query colony configuration
   */
  async queryConfig(colonyId?: string): Promise<{
    config?: Record<string, unknown>;
  }> {
    const message = this.createMessage('query:config', { colonyId });
    const response = await this.send(message);
    return response.payload as any;
  }

  // ========================================================================
  // Utility
  // ========================================================================

  /**
   * Send a ping
   */
  async ping(): Promise<number> {
    const start = Date.now();
    const message = this.createMessage('ping', null);
    await this.send(message);
    return Date.now() - start;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.authenticated;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function createPOLLNClient(config: POLLNClientConfig): POLLNClient {
  return new POLLNClient(config);
}

// ============================================================================
// Exports
// ============================================================================

export * from './types.js';
