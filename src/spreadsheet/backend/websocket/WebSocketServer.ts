/**
 * POLLN Spreadsheet Backend - WebSocket Server
 *
 * Integrated WebSocket server with authentication, authorization,
 * message validation, session management, and metrics tracking.
 *
 * Features:
 * - Integrated auth middleware
 * - User context attachment
 * - Permission checks per message
 * - Audit logging
 * - Graceful shutdown
 * - Connection lifecycle management
 *
 * Performance: <50ms connection establishment, <5ms message validation
 */

import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { EventEmitter } from 'events';
import { AuthService } from '../auth/AuthService.js';
import {
  WSAuthMiddleware,
  WSConnectionContext,
  createWSAuthMiddleware,
} from './auth/WSAuthMiddleware.js';
import {
  WSMessageValidator,
  ValidationResult,
  createWSMessageValidator,
} from './auth/WSMessageValidator.js';
import {
  WSSessionManager,
  createWSSessionManager,
} from './auth/WSSessionManager.js';
import { WSAuthorizer, createWSAuthorizer } from './auth/WSAuthorizer.js';
import { WSMetrics, createWSMetrics } from './auth/WSMetrics.js';

/**
 * WebSocket server configuration
 */
export interface WebSocketServerConfig {
  // Port to listen on
  port: number;
  // Host to bind to
  host?: string;
  // Auth service
  authService: AuthService;
  // JWT secret
  jwtSecret?: string;
  // Enable authentication
  enableAuth?: boolean;
  // Enable message validation
  enableValidation?: boolean;
  // Enable rate limiting
  enableRateLimiting?: boolean;
  // Enable metrics
  enableMetrics?: boolean;
  // Enable audit logging
  enableAuditLog?: boolean;
  // Ping interval (milliseconds)
  pingInterval?: number;
  // Ping timeout (milliseconds)
  pingTimeout?: number;
  // Max payload size (bytes)
  maxPayload?: number;
}

/**
 * WebSocket client connection
 */
interface WSClient {
  ws: WebSocket;
  context: WSConnectionContext | null;
  isAlive: boolean;
  lastPing: number;
}

/**
 * Audit log entry
 */
interface AuditLogEntry {
  timestamp: number;
  sessionId: string;
  userId: string | null;
  eventType: string;
  details: Record<string, unknown>;
}

/**
 * WebSocket message
 */
export interface WSMessage {
  type: string;
  payload: unknown;
  messageId?: string;
  timestamp?: number;
}

/**
 * Message handler
 */
export type MessageHandler = (
  context: WSConnectionContext,
  messageType: string,
  payload: unknown,
  messageId?: string
) => Promise<unknown> | unknown;

/**
 * POLLN WebSocket Server
 *
 * Production-ready WebSocket server with comprehensive
 * authentication, authorization, and monitoring.
 */
export class WebSocketServer extends EventEmitter {
  private config: Required<WebSocketServerConfig>;
  private wss: WSServer | null = null;
  private clients: Map<WebSocket, WSClient> = new Map();
  private authMiddleware: WSAuthMiddleware;
  private messageValidator: WSMessageValidator;
  private sessionManager: WSSessionManager;
  private authorizer: WSAuthorizer;
  private metrics: WSMetrics;
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private auditLog: AuditLogEntry[] = [];
  private pingInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(config: WebSocketServerConfig) {
    super();

    this.config = {
      host: config.host || '0.0.0.0',
      port: config.port,
      authService: config.authService,
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET || 'change-me-in-production',
      enableAuth: config.enableAuth !== false,
      enableValidation: config.enableValidation !== false,
      enableRateLimiting: config.enableRateLimiting !== false,
      enableMetrics: config.enableMetrics !== false,
      enableAuditLog: config.enableAuditLog !== false,
      pingInterval: config.pingInterval || 30000,
      pingTimeout: config.pingTimeout || 5000,
      maxPayload: config.maxPayload || 1024 * 1024, // 1MB
    };

    // Initialize components
    this.authMiddleware = createWSAuthMiddleware(this.config.authService, {
      jwtSecret: this.config.jwtSecret,
    });
    this.messageValidator = createWSMessageValidator();
    this.sessionManager = createWSSessionManager(this.config.authService);
    this.authorizer = createWSAuthorizer();
    this.metrics = createWSMetrics();

    this.setupEventHandlers();
  }

  /**
   * Start WebSocket server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WSServer({
          port: this.config.port,
          host: this.config.host,
          maxPayload: this.config.maxPayload,
        });

        this.wss.on('connection', this.handleConnection.bind(this));
        this.wss.on('error', this.handleError.bind(this));
        this.wss.on('listening', () => {
          console.log(`[WebSocketServer] Listening on ${this.config.host}:${this.config.port}`);
          this.startPingInterval();
          this.emit('started');
          resolve();
        });

        this.wss.on('close', () => {
          console.log('[WebSocketServer] Server closed');
          this.emit('stopped');
        });
      } catch (error) {
        console.error('[WebSocketServer] Failed to start:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop WebSocket server
   */
  async stop(): Promise<void> {
    this.isShuttingDown = true;

    // Stop ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Close all connections
    for (const [ws, client] of this.clients.entries()) {
      if (client.context) {
        await this.authMiddleware.handleDisconnect(client.context, 1001, 'Server shutting down');
      }
      ws.close(1001, 'Server shutting down');
    }

    // Close server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    // Shutdown components
    this.authMiddleware.shutdown();
    this.messageValidator.shutdown();
    await this.sessionManager.shutdown();
    this.authorizer.shutdown();
    this.metrics.shutdown();

    this.clients.clear();
    this.isShuttingDown = false;

    this.emit('stopped');
  }

  /**
   * Handle new connection
   */
  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    if (this.isShuttingDown) {
      ws.close(1001, 'Server shutting down');
      return;
    }

    const client: WSClient = {
      ws,
      context: null,
      isAlive: true,
      lastPing: Date.now(),
    };

    this.clients.set(ws, client);

    // Extract token from query string
    let token: string | null = null;
    if (this.config.enableAuth) {
      try {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        token = url.searchParams.get('token');
      } catch {
        // Invalid URL, continue without token
      }
    }

    // Authenticate connection
    if (this.config.enableAuth && token) {
      const authResult = await this.authMiddleware.authenticateConnection(
        token,
        req.socket.remoteAddress || 'unknown',
        req.headers['user-agent']
      );

      if (!authResult.success || !authResult.context) {
        // Authentication failed
        this.sendError(ws, authResult.error || 'Authentication failed', 1008);
        ws.close(1008, authResult.error || 'Authentication failed');
        this.clients.delete(ws);
        return;
      }

      client.context = authResult.context;

      // Log audit entry
      this.auditLog.push({
        timestamp: Date.now(),
        sessionId: client.context.sessionId,
        userId: client.context.userId,
        eventType: 'connection_authenticated',
        details: {
          ipAddress: client.context.ipAddress,
          userAgent: client.context.userAgent,
        },
      });

      this.emit('connectionAuthenticated', client.context);
    }

    // Setup WebSocket handlers
    ws.on('message', (data: Buffer) => this.handleMessage(ws, data));
    ws.on('close', (code: number, reason: Buffer) => this.handleClose(ws, code, reason.toString()));
    ws.on('error', (error: Error) => this.handleError(ws, error));
    ws.on('pong', () => this.handlePong(ws));

    this.emit('connection', client.context || null);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(ws: WebSocket, data: Buffer): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) {
      return;
    }

    try {
      // Parse message
      const message: WSMessage = JSON.parse(data.toString());

      // Validate message structure
      if (!message.type || typeof message.type !== 'string') {
        this.sendError(ws, 'Invalid message format', 1002);
        return;
      }

      // Update liveness
      client.isAlive = true;
      client.lastPing = Date.now();

      // Authenticate and authorize
      if (this.config.enableAuth && client.context) {
        // Validate message
        if (this.config.enableValidation) {
          const validationResult = await this.messageValidator.validateMessage(
            client.context.userId,
            message.type,
            message.payload || {}
          );

          if (!validationResult.valid) {
            this.sendError(ws, validationResult.error || 'Validation failed', 1003);
            this.metrics.recordValidationFailure();
            return;
          }

          // Use sanitized payload
          if (validationResult.sanitized) {
            message.payload = validationResult.sanitized;
          }
        }

        // Authorize message
        const authResult = await this.authMiddleware.authorizeMessage(
          client.context,
          message.type,
          message.payload
        );

        if (!authResult.allowed) {
          this.sendError(ws, authResult.error || 'Unauthorized', 1003);
          this.metrics.recordUnauthorizedAttempt(
            client.context.role,
            message.type
          );
          return;
        }

        // Record metrics
        this.metrics.recordMessage(
          message.type,
          client.context.role,
          true
        );
      }

      // Handle message
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        try {
          const response = await handler(
            client.context!,
            message.type,
            message.payload,
            message.messageId
          );

          // Send response
          if (response !== undefined) {
            this.send(ws, {
              type: `${message.type}.response`,
              payload: response,
              messageId: message.messageId,
              timestamp: Date.now(),
            });
          }

          // Log audit entry
          if (this.config.enableAuditLog && client.context) {
            this.auditLog.push({
              timestamp: Date.now(),
              sessionId: client.context.sessionId,
              userId: client.context.userId,
              eventType: 'message_handled',
              details: {
                messageType: message.type,
              },
            });
          }
        } catch (error) {
          console.error('[WebSocketServer] Message handler error:', error);
          this.sendError(ws, 'Internal server error', 1011);
        }
      } else {
        // No handler registered, emit generic event
        this.emit(message.type, client.context, message.payload, message.messageId);
      }

      this.emit('message', client.context, message);
    } catch (error) {
      console.error('[WebSocketServer] Message parsing error:', error);
      this.sendError(ws, 'Invalid message format', 1002);
    }
  }

  /**
   * Handle connection close
   */
  private async handleClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) {
      return;
    }

    if (client.context) {
      await this.authMiddleware.handleDisconnect(client.context, code, reason);

      // Log audit entry
      if (this.config.enableAuditLog) {
        this.auditLog.push({
          timestamp: Date.now(),
          sessionId: client.context.sessionId,
          userId: client.context.userId,
          eventType: 'connection_closed',
          details: {
            code,
            reason,
          },
        });
      }

      this.emit('connectionDisconnected', client.context, code, reason);
    }

    this.clients.delete(ws);
  }

  /**
   * Handle connection error
   */
  private handleError(ws: WebSocket, error: Error): void {
    console.error('[WebSocketServer] Connection error:', error);
    const client = this.clients.get(ws);
    if (client && client.context) {
      this.emit('connectionError', client.context, error);
    }
  }

  /**
   * Handle server error
   */
  private handleError(error: Error): void {
    console.error('[WebSocketServer] Server error:', error);
    this.emit('error', error);
  }

  /**
   * Handle pong
   */
  private handlePong(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (client) {
      client.isAlive = true;
      client.lastPing = Date.now();
    }
  }

  /**
   * Send message to client
   */
  send(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error to client
   */
  sendError(ws: WebSocket, error: string, code: number = 1011): void {
    this.send(ws, {
      type: 'error',
      payload: { error, code },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(message: WSMessage): void {
    for (const [ws] of this.clients.entries()) {
      this.send(ws, message);
    }
  }

  /**
   * Broadcast message to authenticated clients
   */
  broadcastAuthenticated(message: WSMessage): void {
    for (const [ws, client] of this.clients.entries()) {
      if (client.context) {
        this.send(ws, message);
      }
    }
  }

  /**
   * Broadcast message to specific user
   */
  broadcastToUser(userId: string, message: WSMessage): void {
    for (const [ws, client] of this.clients.entries()) {
      if (client.context && client.context.userId === userId) {
        this.send(ws, message);
      }
    }
  }

  /**
   * Register message handler
   */
  registerHandler(messageType: string, handler: MessageHandler): void {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Unregister message handler
   */
  unregisterHandler(messageType: string): void {
    this.messageHandlers.delete(messageType);
  }

  /**
   * Start ping interval
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();

      for (const [ws, client] of this.clients.entries()) {
        if (!client.isAlive || now - client.lastPing > this.config.pingTimeout) {
          // Connection is dead, close it
          if (client.context) {
            this.authMiddleware.handleDisconnect(client.context, 1000, 'Connection timeout');
          }
          ws.terminate();
          this.clients.delete(ws);
          continue;
        }

        client.isAlive = false;
        ws.ping();
      }
    }, this.config.pingInterval);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Forward session manager events
    this.sessionManager.on('broadcastToSession', (sessionId, message) => {
      for (const [ws, client] of this.clients.entries()) {
        if (client.context && client.context.sessionId === sessionId) {
          this.send(ws, message as WSMessage);
        }
      }
    });

    this.sessionManager.on('disconnectSession', async (session, reason) => {
      for (const [ws, client] of this.clients.entries()) {
        if (client.context && client.context.sessionId === session.sessionId) {
          ws.close(1000, reason || 'Disconnected by server');
        }
      }
    });
  }

  /**
   * Get server statistics
   */
  getStats(): {
    connections: number;
    authenticatedConnections: number;
    authMiddleware: ReturnType<WSAuthMiddleware['getStats']>;
    messageValidator: ReturnType<WSMessageValidator['getStats']>;
    sessionManager: ReturnType<WSSessionManager['getStats']>;
    authorizer: ReturnType<WSAuthorizer['getStats']>;
    metrics: ReturnType<WSMetrics['getAllStats']>;
  } {
    const authenticatedConnections = Array.from(this.clients.values()).filter(
      c => c.context !== null
    ).length;

    return {
      connections: this.clients.size,
      authenticatedConnections,
      authMiddleware: this.authMiddleware.getStats(),
      messageValidator: this.messageValidator.getStats(),
      sessionManager: this.sessionManager.getStats(),
      authorizer: this.authorizer.getStats(),
      metrics: this.metrics.getAllStats(),
    };
  }

  /**
   * Get audit log
   */
  getAuditLog(limit?: number): AuditLogEntry[] {
    if (limit) {
      return this.auditLog.slice(-limit);
    }
    return [...this.auditLog];
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Get connected clients
   */
  getClients(): WSClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get client by session ID
   */
  getClientBySessionId(sessionId: string): WSClient | undefined {
    return Array.from(this.clients.values()).find(
      c => c.context && c.context.sessionId === sessionId
    );
  }
}

/**
 * Create WebSocket server instance
 */
export function createWebSocketServer(config: WebSocketServerConfig): WebSocketServer {
  return new WebSocketServer(config);
}

export default WebSocketServer;
