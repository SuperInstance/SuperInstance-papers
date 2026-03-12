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
export declare class YjsServer {
    private config;
    private server;
    private wss;
    private persistence;
    private connections;
    private heartbeatInterval?;
    constructor(config?: YjsServerConfig);
    /**
     * Set up WebSocket connection handlers
     */
    private setupWebSocketHandlers;
    /**
     * Handle new WebSocket connection
     */
    private handleConnection;
    /**
     * Handle disconnection
     */
    private handleDisconnection;
    /**
     * Set up heartbeat to detect stale connections
     */
    private setupHeartbeat;
    /**
     * Generate unique connection ID
     */
    private generateConnectionId;
    /**
     * Start the server
     */
    start(): Promise<void>;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
    /**
     * Get server statistics
     */
    getStats(): {
        connections: number;
        documents: number;
        uptime: number;
    };
    /**
     * Get active connections
     */
    getConnections(): ConnectionInfo[];
    /**
     * Get connections for a specific document
     */
    getDocumentConnections(documentId: string): ConnectionInfo[];
    /**
     * Broadcast message to all clients
     */
    broadcast(message: any): void;
    /**
     * Broadcast message to specific document
     */
    broadcastToDocument(documentId: string, message: any): void;
    /**
     * Create a snapshot of a document
     */
    createSnapshot(documentId: string): Promise<Uint8Array | null>;
    /**
     * Clear old data from persistence
     */
    clearOldData(maxAge?: number): Promise<void>;
}
/**
 * Start a standalone Yjs server
 */
export declare function startYjsServer(config?: YjsServerConfig): Promise<YjsServer>;
export default YjsServer;
//# sourceMappingURL=yjs-server.d.ts.map