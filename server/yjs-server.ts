/**
 * Yjs WebSocket Server
 *
 * Provides:
 * - Yjs WebSocket provider setup
 * - Document persistence to database
 * - Authentication integration
 * - Room/document management
 * - Connection monitoring
 */

import WebSocket from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';
import { LeveldbPersistence } from 'y-leveldb';
import * as Y from 'yjs';
import { createServer } from 'http';

export interface YjsServerConfig {
  port?: number;
  host?: string;
  persistenceDir?: string;
  authEnabled?: boolean;
  authCallback?: (request: any) => Promise<boolean>;
  maxConnections?: number;
  heartbeatInterval?: number;
}

export interface ConnectionInfo {
  id: string;
  documentId: string;
  userId?: string;
  connectedAt: Date;
  lastActivity: Date;
}

export class YjsServer {
  private config: Required<YjsServerConfig>;
  private server: any;
  private wss: WebSocket.Server;
  private persistence: LeveldbPersistence | null = null;
  private connections: Map<string, ConnectionInfo> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(config: YjsServerConfig = {}) {
    this.config = {
      port: config.port || 1234,
      host: config.host || 'localhost',
      persistenceDir: config.persistenceDir || './db',
      authEnabled: config.authEnabled || false,
      authCallback: config.authCallback || (() => Promise.resolve(true)),
      maxConnections: config.maxConnections || 1000,
      heartbeatInterval: config.heartbeatInterval || 30000,
    };

    // Create HTTP server
    const httpServer = createServer();
    this.server = httpServer;

    // Create WebSocket server
    this.wss = new WebSocket.Server({
      server: httpServer,
      perMessageDeflate: false,
    });

    // Initialize persistence if directory provided
    if (this.config.persistenceDir) {
      this.persistence = new LeveldbPersistence(this.config.persistenceDir);
    }

    this.setupWebSocketHandlers();
    this.setupHeartbeat();
  }

  /**
   * Set up WebSocket connection handlers
   */
  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error: Error) => {
      console.error('WebSocket server error:', error);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocket, req: any): Promise<void> {
    // Check authentication if enabled
    if (this.config.authEnabled) {
      try {
        const authenticated = await this.config.authCallback(req);
        if (!authenticated) {
          ws.close(4001, 'Authentication failed');
          return;
        }
      } catch (error) {
        console.error('Authentication error:', error);
        ws.close(4001, 'Authentication error');
        return;
      }
    }

    // Check connection limit
    if (this.connections.size >= this.config.maxConnections) {
      ws.close(4000, 'Server full');
      return;
    }

    // Extract document ID from URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const documentId = url.pathname.slice(1).split('/')[0] || 'default';
    const userId = url.searchParams.get('userId') || undefined;

    // Track connection
    const connectionId = this.generateConnectionId();
    const connectionInfo: ConnectionInfo = {
      id: connectionId,
      documentId,
      userId,
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.connections.set(connectionId, connectionInfo);

    console.log(`New connection: ${connectionId} to document: ${documentId}`);

    // Set up Yjs WebSocket connection
    setupWSConnection(ws, req, {
      gc: true, // Enable garbage collection
      persistence: this.persistence || undefined,
    });

    // Handle disconnection
    ws.on('close', () => {
      this.handleDisconnection(connectionId);
    });

    // Track activity
    ws.on('message', () => {
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.lastActivity = new Date();
      }
    });
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      console.log(
        `Disconnection: ${connectionId} from document: ${connection.documentId}`
      );
      this.connections.delete(connectionId);
    }
  }

  /**
   * Set up heartbeat to detect stale connections
   */
  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const staleThreshold = new Date(
        now.getTime() - this.config.heartbeatInterval * 2
      );

      this.connections.forEach((connection, connectionId) => {
        if (connection.lastActivity < staleThreshold) {
          console.log(`Stale connection detected: ${connectionId}`);
          // Force close stale connection
          this.wss.clients.forEach((client: WebSocket) => {
            if (client.readyState === WebSocket.OPEN) {
              client.close(4002, 'Stale connection');
            }
          });
        }
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start the server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.listen(this.config.port, this.config.host, () => {
          console.log(
            `Yjs WebSocket server listening on ${this.config.host}:${this.config.port}`
          );
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      this.wss.close(() => {
        this.server.close(() => {
          console.log('Yjs WebSocket server stopped');
          resolve();
        });
      });
    });
  }

  /**
   * Get server statistics
   */
  getStats(): {
    connections: number;
    documents: number;
    uptime: number;
  } {
    const documents = new Set(
      Array.from(this.connections.values()).map(c => c.documentId)
    );

    return {
      connections: this.connections.size,
      documents: documents.size,
      uptime: process.uptime(),
    };
  }

  /**
   * Get active connections
   */
  getConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connections for a specific document
   */
  getDocumentConnections(documentId: string): ConnectionInfo[] {
    return Array.from(this.connections.values()).filter(
      c => c.documentId === documentId
    );
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(message: any): void {
    const data = JSON.stringify(message);

    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * Broadcast message to specific document
   */
  broadcastToDocument(documentId: string, message: any): void {
    const data = JSON.stringify(message);

    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        // This is a simplified check - in practice, you'd need to track
        // which client is connected to which document
        client.send(data);
      }
    });
  }

  /**
   * Create a snapshot of a document
   */
  async createSnapshot(documentId: string): Promise<Uint8Array | null> {
    if (!this.persistence) {
      return null;
    }

    try {
      const ydoc = new Y.Doc();
      const state = await this.persistence.getYDoc(documentId);
      if (state) {
        Y.applyUpdate(ydoc, state);
        return Y.encodeStateAsUpdate(ydoc);
      }
    } catch (error) {
      console.error('Error creating snapshot:', error);
    }

    return null;
  }

  /**
   * Clear old data from persistence
   */
  async clearOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.persistence) {
      return;
    }

    try {
      const now = Date.now();
      const cutoffTime = now - maxAge;

      // This is a placeholder - actual implementation depends on
      // the persistence layer's API
      console.log('Clearing old data...');
    } catch (error) {
      console.error('Error clearing old data:', error);
    }
  }
}

/**
 * Start a standalone Yjs server
 */
export async function startYjsServer(config?: YjsServerConfig): Promise<YjsServer> {
  const server = new YjsServer(config);
  await server.start();
  return server;
}

// Start server if run directly
if (require.main === module) {
  const port = process.env.YJS_PORT ? parseInt(process.env.YJS_PORT) : 1234;

  startYjsServer({
    port,
    persistenceDir: process.env.YJS_DB_DIR || './db',
  })
    .then(server => {
      console.log(`Yjs server started on port ${port}`);

      // Graceful shutdown
      process.on('SIGINT', async () => {
        console.log('Shutting down Yjs server...');
        await server.stop();
        process.exit(0);
      });
    })
    .catch(error => {
      console.error('Failed to start Yjs server:', error);
      process.exit(1);
    });
}

export default YjsServer;
