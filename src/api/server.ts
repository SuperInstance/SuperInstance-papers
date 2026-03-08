/**
 * POLLN WebSocket API Server
 * Real-time monitoring and control for POLLN colonies
 */

import { EventEmitter } from 'events';
import { createServer as createHttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HTTPServer } from 'http';
import type { Colony } from '../core/colony.js';
import type { DreamBasedPolicyOptimizer } from '../core/dreaming.js';

// Import types from this module
import type {
  ServerMessage,
  ClientMessage,
  ConnectionInfo,
  AuthenticatedClient,
  Subscription,
  APIServerStats,
  ColonyEventPayload,
  AgentEventPayload,
  DreamEventPayload,
  StatsEventPayload,
} from './types.js';
import {
  AuthenticationMiddleware,
  RateLimitMiddleware,
  ValidationMiddleware,
  APIErrorFactory,
} from './middleware.js';
import { MessageHandler, HandlerContext } from './handlers.js';

// ============================================================================
// Server Configuration
// ============================================================================

export interface POLLNServerConfig {
  port: number;
  host?: string;
  auth?: {
    enableAuth: boolean;
    defaultToken?: string;
    tokenExpiresIn?: number;
  };
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  cors?: {
    origin: string | string[];
    credentials: boolean;
  };
  heartbeat?: {
    interval: number;
    timeout: number;
  };
}

// ============================================================================
// WebSocket Server
// ============================================================================

export class POLLNServer extends EventEmitter {
  private config: POLLNServerConfig;
  private httpServer: HTTPServer | null = null;
  private wsServer: WebSocketServer | null = null;

  // Middleware
  private auth: AuthenticationMiddleware;
  private rateLimit: RateLimitMiddleware;
  private validation: ValidationMiddleware;

  // Message handler
  private handler: MessageHandler;

  // State
  private colonies: Map<string, Colony> = new Map();
  private dreamOptimizer?: DreamBasedPolicyOptimizer;
  private connections: Map<string, ConnectionInfo> = new Map();
  private subscriptions: Map<string, Subscription[]> = new Map();
  private startedAt: number = 0;

  // Statistics
  private stats: APIServerStats = {
    uptime: 0,
    connections: {
      total: 0,
      active: 0,
      authenticated: 0,
    },
    messages: {
      received: 0,
      sent: 0,
      errors: 0,
    },
    rateLimits: {
      rejected: 0,
    },
  };

  // Heartbeat
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: POLLNServerConfig) {
    super();
    this.config = config;

    // Initialize middleware
    this.auth = new AuthenticationMiddleware();
    this.rateLimit = new RateLimitMiddleware(config.rateLimit);
    this.validation = new ValidationMiddleware();
    this.handler = new MessageHandler();

    // Setup default token if auth is enabled
    if (config.auth?.enableAuth && config.auth.defaultToken) {
      this.auth.generateToken(
        'default',
        [
          { resource: 'colony', actions: ['read', 'write'] },
          { resource: 'agent', actions: ['read', 'write'] },
          { resource: 'dream', actions: ['read', 'write'] },
          { resource: 'stats', actions: ['read'] },
        ],
        config.auth.tokenExpiresIn
      );
    }
  }

  // ==========================================================================
  // Server Lifecycle
  // ==========================================================================

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    if (this.wsServer) {
      throw new Error('Server already started');
    }

    this.startedAt = Date.now();

    // Create HTTP server
    this.httpServer = createHttpServer();

    // Create WebSocket server
    this.wsServer = new WebSocketServer({
      server: this.httpServer,
      path: '/api/ws',
    });

    // Setup connection handling
    this.wsServer.on('connection', this.handleConnection.bind(this));

    // Start heartbeat
    this.startHeartbeat();

    // Start server
    return new Promise((resolve, reject) => {
      this.httpServer!.listen(this.config.port, this.config.host, () => {
        this.emit('started', {
          port: this.config.port,
          host: this.config.host || '0.0.0.0',
        });
        resolve();
      });

      this.httpServer!.on('error', reject);
    });
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.wsServer) {
      return;
    }

    // Stop heartbeat
    this.stopHeartbeat();

    // Close all connections
    this.wsServer.clients.forEach((ws) => {
      ws.close(1000, 'Server shutting down');
    });

    // Close server
    return new Promise((resolve) => {
      this.wsServer!.close(() => {
        this.httpServer!.close(() => {
          this.wsServer = null;
          this.httpServer = null;
          this.emit('stopped');
          resolve();
        });
      });
    });
  }

  // ==========================================================================
  // Connection Handling
  // ==========================================================================

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientId = this.generateClientId();
    const ip = req.socket.remoteAddress;

    // Track connection
    this.stats.connections.total++;
    this.stats.connections.active++;

    const connectionInfo: ConnectionInfo = {
      id: clientId,
      clientId,
      connectedAt: Date.now(),
      subscriptions: [],
      isAuthenticated: false,
      ip,
    };

    this.connections.set(clientId, connectionInfo);
    this.emit('connection:opened', { clientId, ip });

    // Setup WebSocket handlers
    ws.on('message', (data: Buffer) => this.handleMessage(clientId, ws, data));
    ws.on('close', () => this.handleDisconnection(clientId, ws));
    ws.on('error', (error) => this.handleError(clientId, error));
    ws.on('pong', () => this.handlePong(clientId, ws));

    // Send welcome message (optional, based on auth)
    if (!this.config.auth?.enableAuth) {
      this.sendMessage(ws, {
        id: this.generateMessageId(),
        timestamp: Date.now(),
        type: 'event:colony',
        payload: {
          message: 'Connected to POLLN WebSocket API',
          serverTime: Date.now(),
        },
      });
    }
  }

  private handleDisconnection(clientId: string, ws: WebSocket): void {
    const connection = this.connections.get(clientId);
    if (!connection) {
      return;
    }

    // Deauthenticate if needed
    if (connection.isAuthenticated) {
      this.auth.deauthenticate(clientId);
      this.stats.connections.authenticated--;
    }

    // Clean up
    this.connections.delete(clientId);
    this.subscriptions.delete(clientId);
    this.stats.connections.active--;

    this.emit('connection:closed', { clientId });
  }

  private handleError(clientId: string, error: Error): void {
    this.stats.messages.errors++;
    this.emit('connection:error', { clientId, error });
  }

  private handlePong(clientId: string, ws: WebSocket): void {
    const connection = this.connections.get(clientId);
    if (connection) {
      connection.isAlive = true;
    }
  }

  // ==========================================================================
  // Message Handling
  // ==========================================================================

  private async handleMessage(clientId: string, ws: WebSocket, data: Buffer): Promise<void> {
    this.stats.messages.received++;

    // Update rate limit tracking
    if (!this.rateLimit.checkLimit(clientId)) {
      this.stats.rateLimits.rejected++;
      this.sendError(ws, APIErrorFactory.rateLimited());
      return;
    }

    // Parse message
    let message: ClientMessage;
    try {
      message = JSON.parse(data.toString()) as ClientMessage;
    } catch (error) {
      this.stats.messages.errors++;
      this.sendError(ws, APIErrorFactory.invalidPayload());
      return;
    }

    // Validate message
    if (!this.validation.validateMessage(message)) {
      this.stats.messages.errors++;
      this.sendError(ws, APIErrorFactory.invalidPayload());
      return;
    }

    // Check authentication
    let client: AuthenticatedClient | null = null;
    const connection = this.connections.get(clientId);

    if (this.config.auth?.enableAuth) {
      if (!connection?.isAuthenticated) {
        // First message must be authentication
        // For simplicity, we'll use a token in the message payload
        // In production, use proper WebSocket authentication
        const token = (message.payload as any)?.token;
        if (!token) {
          this.sendError(ws, APIErrorFactory.unauthorized());
          return;
        }

        client = this.auth.authenticate(clientId, token);
        if (!client) {
          this.sendError(ws, APIErrorFactory.unauthorized());
          return;
        }

        connection!.isAuthenticated = true;
        this.stats.connections.authenticated++;
      } else {
        client = this.auth.getClient(clientId)!;
      }

      this.auth.updateActivity(clientId);
    }

    // Create handler context
    const context: HandlerContext = {
      client: client || {
        id: clientId,
        gardenerId: 'anonymous',
        permissions: [
          { resource: 'colony', actions: ['read', 'write'] },
          { resource: 'agent', actions: ['read', 'write'] },
          { resource: 'dream', actions: ['read', 'write'] },
          { resource: 'stats', actions: ['read'] },
        ],
        token: '',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
      },
      colonies: this.colonies,
      dreamOptimizer: this.dreamOptimizer,
      subscriptions: this.subscriptions,
      onSubscriptionChange: (id, subs) => {
        this.subscriptions.set(id, subs);
        const conn = this.connections.get(id);
        if (conn) {
          conn.subscriptions = subs;
        }
      },
    };

    // Handle message
    const response = await this.handler.handleMessage(message, context);

    if (response) {
      this.sendMessage(ws, response);
      this.stats.messages.sent++;
    }
  }

  // ==========================================================================
  // Broadcasting
  // ==========================================================================

  /**
   * Broadcast colony event to subscribed clients
   */
  broadcastColonyEvent(colonyId: string, eventType: string, data: unknown): void {
    const payload: ColonyEventPayload = {
      colonyId,
      eventType: eventType as any,
      data,
    };

    this.broadcastToSubscribers('colony', colonyId, {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      type: 'event:colony',
      payload,
    });
  }

  /**
   * Broadcast agent event to subscribed clients
   */
  broadcastAgentEvent(agentId: string, colonyId: string, eventType: string, data: unknown): void {
    const payload: AgentEventPayload = {
      agentId,
      colonyId,
      eventType: eventType as any,
      data,
    };

    this.broadcastToSubscribers('agent', agentId, {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      type: 'event:agent',
      payload,
    });
  }

  /**
   * Broadcast dream event to subscribed clients
   */
  broadcastDreamEvent(colonyId: string, dreamData: Partial<DreamEventPayload>): void {
    const payload: DreamEventPayload = {
      colonyId,
      dreamId: dreamData.dreamId || this.generateMessageId(),
      episode: dreamData.episode || {},
      metrics: dreamData.metrics || { loss: 0, reconstructionError: 0, klDivergence: 0 },
    };

    this.broadcastToSubscribers('dreams', colonyId, {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      type: 'event:dream',
      payload,
    });
  }

  /**
   * Broadcast stats update to subscribed clients
   */
  async broadcastStatsUpdate(colonyId: string): Promise<void> {
    const colony = this.colonies.get(colonyId);
    if (!colony) {
      return;
    }

    const payload: StatsEventPayload = {
      colonyId,
      stats: await colony.getStats(),
      timestamp: Date.now(),
    };

    this.broadcastToSubscribers('stats', colonyId, {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      type: 'event:stats',
      payload,
    });
  }

  /**
   * Broadcast message to subscribers of a specific resource
   */
  private broadcastToSubscribers(
    type: Subscription['type'],
    id: string,
    message: ServerMessage
  ): void {
    for (const [clientId, subscriptions] of this.subscriptions) {
      const isSubscribed = subscriptions.some(
        (s) => s.type === type && s.id === id
      );

      if (isSubscribed) {
        const connection = this.connections.get(clientId);
        if (connection) {
          const ws = this.findWebSocket(clientId);
          if (ws && ws.readyState === WebSocket.OPEN) {
            this.sendMessage(ws, message);
            this.stats.messages.sent++;
          }
        }
      }
    }
  }

  // ==========================================================================
  // Colony Management
  // ==========================================================================

  /**
   * Register a colony with the server
   */
  registerColony(colony: Colony): void {
    this.colonies.set(colony.id, colony);

    // Forward colony events to WebSocket clients
    colony.on('agent_registered', (data: unknown) => {
      this.broadcastColonyEvent(colony.id, 'agent_registered', data);
    });

    colony.on('agent_unregistered', (data: unknown) => {
      this.broadcastColonyEvent(colony.id, 'agent_unregistered', data);
    });

    colony.on('agent_updated', (data: unknown) => {
      this.broadcastColonyEvent(colony.id, 'agent_updated', data);
    });

    this.emit('colony:registered', { colonyId: colony.id });
  }

  /**
   * Unregister a colony from the server
   */
  unregisterColony(colonyId: string): void {
    const colony = this.colonies.get(colonyId);
    if (colony) {
      // Remove all event listeners
      colony.removeAllListeners();
      this.colonies.delete(colonyId);
      this.emit('colony:unregistered', { colonyId });
    }
  }

  /**
   * Set the dream optimizer
   */
  setDreamOptimizer(optimizer: DreamBasedPolicyOptimizer): void {
    this.dreamOptimizer = optimizer;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private sendMessage(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      this.stats.messages.errors++;
    }
  }

  private sendError(ws: WebSocket, error: ReturnType<typeof APIErrorFactory.create>): void {
    this.sendMessage(ws, {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      type: 'error',
      payload: null,
      success: false,
      error,
    });
  }

  private findWebSocket(clientId: string): WebSocket | null {
    if (!this.wsServer) {
      return null;
    }

    for (const ws of this.wsServer.clients) {
      // @ts-ignore - WebSocket has _socket property
      if (ws._pollnClientId === clientId) {
        return ws;
      }
    }

    return null;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==========================================================================
  // Heartbeat
  // ==========================================================================

  private startHeartbeat(): void {
    const interval = this.config.heartbeat?.interval || 30000;

    this.heartbeatInterval = setInterval(() => {
      if (!this.wsServer) {
        return;
      }

      this.wsServer.clients.forEach((ws) => {
        // @ts-ignore
        if (ws.isAlive === false) {
          return ws.terminate();
        }

        // @ts-ignore
        ws.isAlive = false;
        ws.ping();
      });
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get server statistics
   */
  getStats(): APIServerStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startedAt,
    };
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get active connections
   */
  getActiveConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }
}

// ============================================================================
// Express Integration Helper
// ============================================================================

export function createPOLLNServer(config: POLLNServerConfig): POLLNServer {
  return new POLLNServer(config);
}

export { AuthenticationMiddleware, RateLimitMiddleware, ValidationMiddleware } from './middleware.js';
export * from './types.js';
export * from './handlers.js';
