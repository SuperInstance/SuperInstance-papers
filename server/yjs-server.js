"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YjsServer = void 0;
exports.startYjsServer = startYjsServer;
const ws_1 = __importDefault(require("ws"));
const utils_1 = require("y-websocket/bin/utils");
const y_leveldb_1 = require("y-leveldb");
const Y = __importStar(require("yjs"));
const http_1 = require("http");
class YjsServer {
    constructor(config = {}) {
        this.persistence = null;
        this.connections = new Map();
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
        const httpServer = (0, http_1.createServer)();
        this.server = httpServer;
        // Create WebSocket server
        this.wss = new ws_1.default.Server({
            server: httpServer,
            perMessageDeflate: false,
        });
        // Initialize persistence if directory provided
        if (this.config.persistenceDir) {
            this.persistence = new y_leveldb_1.LeveldbPersistence(this.config.persistenceDir);
        }
        this.setupWebSocketHandlers();
        this.setupHeartbeat();
    }
    /**
     * Set up WebSocket connection handlers
     */
    setupWebSocketHandlers() {
        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });
        this.wss.on('error', (error) => {
            console.error('WebSocket server error:', error);
        });
    }
    /**
     * Handle new WebSocket connection
     */
    async handleConnection(ws, req) {
        // Check authentication if enabled
        if (this.config.authEnabled) {
            try {
                const authenticated = await this.config.authCallback(req);
                if (!authenticated) {
                    ws.close(4001, 'Authentication failed');
                    return;
                }
            }
            catch (error) {
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
        const connectionInfo = {
            id: connectionId,
            documentId,
            userId,
            connectedAt: new Date(),
            lastActivity: new Date(),
        };
        this.connections.set(connectionId, connectionInfo);
        console.log(`New connection: ${connectionId} to document: ${documentId}`);
        // Set up Yjs WebSocket connection
        (0, utils_1.setupWSConnection)(ws, req, {
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
    handleDisconnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            console.log(`Disconnection: ${connectionId} from document: ${connection.documentId}`);
            this.connections.delete(connectionId);
        }
    }
    /**
     * Set up heartbeat to detect stale connections
     */
    setupHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            const now = new Date();
            const staleThreshold = new Date(now.getTime() - this.config.heartbeatInterval * 2);
            this.connections.forEach((connection, connectionId) => {
                if (connection.lastActivity < staleThreshold) {
                    console.log(`Stale connection detected: ${connectionId}`);
                    // Force close stale connection
                    this.wss.clients.forEach((client) => {
                        if (client.readyState === ws_1.default.OPEN) {
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
    generateConnectionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Start the server
     */
    start() {
        return new Promise((resolve, reject) => {
            try {
                this.server.listen(this.config.port, this.config.host, () => {
                    console.log(`Yjs WebSocket server listening on ${this.config.host}:${this.config.port}`);
                    resolve();
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Stop the server
     */
    stop() {
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
    getStats() {
        const documents = new Set(Array.from(this.connections.values()).map(c => c.documentId));
        return {
            connections: this.connections.size,
            documents: documents.size,
            uptime: process.uptime(),
        };
    }
    /**
     * Get active connections
     */
    getConnections() {
        return Array.from(this.connections.values());
    }
    /**
     * Get connections for a specific document
     */
    getDocumentConnections(documentId) {
        return Array.from(this.connections.values()).filter(c => c.documentId === documentId);
    }
    /**
     * Broadcast message to all clients
     */
    broadcast(message) {
        const data = JSON.stringify(message);
        this.wss.clients.forEach((client) => {
            if (client.readyState === ws_1.default.OPEN) {
                client.send(data);
            }
        });
    }
    /**
     * Broadcast message to specific document
     */
    broadcastToDocument(documentId, message) {
        const data = JSON.stringify(message);
        this.wss.clients.forEach((client) => {
            if (client.readyState === ws_1.default.OPEN) {
                // This is a simplified check - in practice, you'd need to track
                // which client is connected to which document
                client.send(data);
            }
        });
    }
    /**
     * Create a snapshot of a document
     */
    async createSnapshot(documentId) {
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
        }
        catch (error) {
            console.error('Error creating snapshot:', error);
        }
        return null;
    }
    /**
     * Clear old data from persistence
     */
    async clearOldData(maxAge = 7 * 24 * 60 * 60 * 1000) {
        if (!this.persistence) {
            return;
        }
        try {
            const now = Date.now();
            const cutoffTime = now - maxAge;
            // This is a placeholder - actual implementation depends on
            // the persistence layer's API
            console.log('Clearing old data...');
        }
        catch (error) {
            console.error('Error clearing old data:', error);
        }
    }
}
exports.YjsServer = YjsServer;
/**
 * Start a standalone Yjs server
 */
async function startYjsServer(config) {
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
exports.default = YjsServer;
//# sourceMappingURL=yjs-server.js.map