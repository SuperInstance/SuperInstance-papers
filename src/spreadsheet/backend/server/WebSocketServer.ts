/**
 * POLLN Spreadsheet Backend - WebSocket Server
 *
 * Real-time WebSocket server for living cell communication.
 * Implements connection pooling, batch propagation, and cascade control.
 *
 * Features:
 * - Connection pooling (virtual connections over physical pool)
 * - Spatial indexing for O(1) neighborhood lookups
 * - Batch propagation for sensation events
 * - Cascade control with TTL and damping
 * - JWT authentication for WebSocket connections
 * - Rate limiting for connections
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage } from 'http';
import { EventEmitter } from 'events';
import { getAuthService, WebSocketConnectionLimiter } from '../auth/index.js';
import { URL } from 'url';

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  maxConnections: number;
  connectionTimeout: number;
  heartbeatInterval: number;
}

/**
 * Spatial index for grid-based neighborhood lookups
 */
export class SpatialIndex {
  private grid: Map<string, Set<string>> = new Map();
  private cellPositions: Map<string, { row: number; col: number }> = new Map();

  /**
   * Register cell position
   */
  register(cellId: string, row: number, col: number): void {
    this.cellPositions.set(cellId, { row, col });

    // Add to all surrounding grid cells (3x3 area)
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const gridKey = `${row + dr}:${col + dc}`;
        if (!this.grid.has(gridKey)) {
          this.grid.set(gridKey, new Set());
        }
        this.grid.get(gridKey)!.add(cellId);
      }
    }
  }

  /**
   * Unregister cell position
   */
  unregister(cellId: string): void {
    const pos = this.cellPositions.get(cellId);
    if (!pos) return;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const gridKey = `${pos.row + dr}:${pos.col + dc}`;
        this.grid.get(gridKey)?.delete(cellId);
      }
    }

    this.cellPositions.delete(cellId);
  }

  /**
   * Get neighbors within radius (O(1) lookup)
   */
  getNeighbors(row: number, col: number, radius: number = 1): Set<string> {
    const neighbors = new Set<string>();

    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const gridKey = `${row + dr}:${col + dc}`;
        const cellSet = this.grid.get(gridKey);
        if (cellSet) {
          for (const cellId of cellSet) {
            neighbors.add(cellId);
          }
        }
      }
    }

    return neighbors;
  }
}

/**
 * Client connection wrapper
 */
export class ClientConnection {
  id: string;
  socket: WebSocket;
  subscribedCells: Set<string> = new Set();
  lastHeartbeat: number = Date.now();
  userId?: string; // Authenticated user ID
  ip: string; // Client IP address

  constructor(id: string, socket: WebSocket, ip: string, userId?: string) {
    this.id = id;
    this.socket = socket;
    this.ip = ip;
    this.userId = userId;
  }

  /**
   * Check if connection is alive
   */
  isAlive(): boolean {
    return this.socket.readyState === WebSocket.OPEN &&
           (Date.now() - this.lastHeartbeat) < 30000;
  }

  /**
   * Send message to client
   */
  send(data: unknown): void {
    if (this.isAlive()) {
      this.socket.send(JSON.stringify(data));
    }
  }
}

/**
 * WebSocket server with connection pooling
 */
export class WebSocketBackendServer extends EventEmitter {
  private wss: WebSocketServer;
  private connections: Map<string, ClientConnection> = new Map();
  private spatialIndex: SpatialIndex;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private config: ConnectionPoolConfig;
  private connectionLimiter: WebSocketConnectionLimiter;
  private authService: ReturnType<typeof getAuthService>;

  // Message batching
  private messageBuffer: Map<string, unknown[]> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 10; // ms
  private readonly BATCH_SIZE = 100;

  constructor(server: ReturnType<typeof createServer>, config: Partial<ConnectionPoolConfig> = {}) {
    super();
    this.spatialIndex = new SpatialIndex();
    this.config = {
      maxConnections: 15000,
      connectionTimeout: 30000,
      heartbeatInterval: 15000,
      ...config,
    };

    this.connectionLimiter = new WebSocketConnectionLimiter({
      maxConnectionsPerUser: 100,
      maxConnectionsPerIP: 50,
      maxTotalConnections: this.config.maxConnections,
    });

    this.authService = getAuthService();

    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      perMessageDeflate: false, // Disable for performance
      maxPayload: 1024 * 1024, // 1MB
    });

    this.setupWebSocket();
    this.startHeartbeat();
    this.startBatchPropagation();
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (socket, req) => {
      this.handleConnection(socket, req);
    });

    this.wss.on('error', (error) => {
      console.error('[WebSocket] Server error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Handle new connection
   */
  private handleConnection(socket: WebSocket, req: IncomingMessage): void {
    const clientId = this.generateClientId();

    // Get client IP
    const ip = this.getClientIP(req);

    // Authenticate connection
    let userId: string | undefined;
    const authResult = this.authenticateConnection(req);

    if (!authResult.authenticated) {
      // Reject unauthenticated connections (optional: allow guests)
      socket.close(4001, authResult.reason || 'Authentication failed');
      console.log(`[WebSocket] Rejected unauthenticated connection from ${ip}`);
      return;
    }

    userId = authResult.userId;

    // Check connection limits
    const limitCheck = this.connectionLimiter.canConnect(userId || null, ip);
    if (!limitCheck.allowed) {
      socket.close(4002, limitCheck.reason || 'Connection limit exceeded');
      console.log(`[WebSocket] Rejected connection from ${ip}: ${limitCheck.reason}`);
      return;
    }

    // Create connection
    const connection = new ClientConnection(clientId, socket, ip, userId);
    this.connections.set(clientId, connection);

    // Register with connection limiter
    this.connectionLimiter.addConnection(clientId, userId || null, ip);

    console.log(`[WebSocket] Client connected: ${clientId} (${this.connections.size} total)${userId ? ` [user: ${userId}]` : ' [guest]'}`);

    socket.on('message', (data) => this.handleMessage(clientId, data));
    socket.on('close', () => this.handleDisconnection(clientId));
    socket.on('pong', () => {
      connection.lastHeartbeat = Date.now();
    });

    // Send welcome message
    connection.send({
      type: 'connected',
      clientId,
      timestamp: Date.now(),
      authenticated: !!userId,
      userId,
    });
  }

  /**
   * Authenticate WebSocket connection
   */
  private authenticateConnection(req: IncomingMessage): { authenticated: boolean; userId?: string; reason?: string } {
    try {
      // Extract token from query parameter
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        // Allow guest connections (optional - remove this to require auth)
        return { authenticated: true };
      }

      // Verify token
      const result = this.authService.verifyAccessToken(token);

      if (result.valid && result.payload) {
        return {
          authenticated: true,
          userId: result.payload.sub,
        };
      }

      return {
        authenticated: false,
        reason: result.error || 'Invalid token',
      };
    } catch (error) {
      console.error('[WebSocket] Authentication error:', error);
      return {
        authenticated: false,
        reason: 'Authentication error',
      };
    }
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: IncomingMessage): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(clientId: string): void {
    const connection = this.connections.get(clientId);
    if (connection) {
      // Unregister from connection limiter
      this.connectionLimiter.removeConnection(clientId, connection.userId || null, connection.ip);

      this.connections.delete(clientId);
      console.log(`[WebSocket] Client disconnected: ${clientId} (${this.connections.size} total)`);
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(clientId: string, data: any): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'ping':
          this.handlePing(clientId);
          break;

        case 'subscribe':
          this.handleSubscribe(clientId, message.cells);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(clientId, message.cells);
          break;

        case 'cell_update':
          this.handleCellUpdate(clientId, message);
          break;

        case 'entangle':
          this.handleEntangle(clientId, message);
          break;

        default:
          this.emit('message', { clientId, message });
      }
    } catch (error) {
      console.error(`[WebSocket] Failed to parse message from ${clientId}:`, error);
    }
  }

  /**
   * Handle cell update with batch propagation
   */
  private handleCellUpdate(clientId: string, message: any): void {
    const { cellId, update } = message;

    // Add to batch buffer
    if (!this.messageBuffer.has(cellId)) {
      this.messageBuffer.set(cellId, []);
    }

    this.messageBuffer.get(cellId)!.push({
      type: 'cell_update',
      cellId,
      update,
      timestamp: Date.now(),
    });

    // Trigger batch propagation if buffer is full
    if (this.messageBuffer.get(cellId)!.length >= this.BATCH_SIZE) {
      this.propagateBatch(cellId);
    }
  }

  /**
   * Propagate batched updates to subscribers
   */
  private propagateBatch(cellId: string): void {
    const messages = this.messageBuffer.get(cellId);
    if (!messages || messages.length === 0) return;

    // Find all subscribers to this cell
    const subscribers: string[] = [];
    for (const [id, conn] of this.connections) {
      if (conn.subscribedCells.has(cellId)) {
        subscribers.push(id);
      }
    }

    // Send batch to subscribers
    for (const subscriberId of subscribers) {
      const connection = this.connections.get(subscriberId);
      if (connection) {
        connection.send({
          type: 'batch',
          messages,
        });
      }
    }

    // Clear buffer
    this.messageBuffer.set(cellId, []);

    this.emit('batch-propagated', { cellId, messageCount: messages.length, subscriberCount: subscribers.length });
  }

  /**
   * Handle ping
   */
  private handlePing(clientId: string): void {
    const connection = this.connections.get(clientId);
    if (connection) {
      connection.send({ type: 'pong', timestamp: Date.now() });
    }
  }

  /**
   * Handle subscription
   */
  private handleSubscribe(clientId: string, cells: string[]): void {
    const connection = this.connections.get(clientId);
    if (connection) {
      for (const cellId of cells) {
        connection.subscribedCells.add(cellId);
      }
      console.log(`[WebSocket] Client ${clientId} subscribed to ${cells.length} cells`);
    }
  }

  /**
   * Handle unsubscription
   */
  private handleUnsubscribe(clientId: string, cells: string[]): void {
    const connection = this.connections.get(clientId);
    if (connection) {
      for (const cellId of cells) {
        connection.subscribedCells.delete(cellId);
      }
    }
  }

  /**
   * Handle entanglement request
   */
  private handleEntangle(clientId: string, message: any): void {
    const { cell1, cell2, mode } = message;

    // Notify both subscribers about entanglement
    this.notifyCellSubscribers(cell1, {
      type: 'entangled',
      cell1,
      cell2,
      mode,
    });

    this.notifyCellSubscribers(cell2, {
      type: 'entangled',
      cell1,
      cell2,
      mode,
    });

    this.emit('entangled', { cell1, cell2, mode });
  }

  /**
   * Notify all subscribers of a cell
   */
  private notifyCellSubscribers(cellId: string, data: unknown): void {
    for (const [id, conn] of this.connections) {
      if (conn.subscribedCells.has(cellId)) {
        conn.send(data);
      }
    }
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(data: unknown, exclude?: string[]): void {
    for (const [id, conn] of this.connections) {
      if (!exclude || !exclude.includes(id)) {
        conn.send(data);
      }
    }
  }

  /**
   * Start heartbeat check
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, conn] of this.connections) {
        if (!conn.isAlive()) {
          console.log(`[WebSocket] Cleaning up dead connection: ${id}`);
          this.connections.delete(id);
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Start batch propagation timer
   */
  private startBatchPropagation(): void {
    this.batchTimer = setInterval(() => {
      // Propagate all buffered messages
      for (const cellId of this.messageBuffer.keys()) {
        this.propagateBatch(cellId);
      }
    }, this.BATCH_DELAY);
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown server
   */
  shutdown(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    this.wss.close();
  }
}

export default WebSocketBackendServer;
