/**
 * WebSocketMetrics.ts
 *
 * WebSocket-specific metrics for monitoring real-time connections.
 * Tracks active connections, message throughput, broadcast latency, and connection duration.
 */

import { getMetricsCollector, MetricLabels } from './MetricsCollector';
import { EventEmitter } from 'events';

/**
 * WebSocket message direction
 */
export enum MessageDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
  BROADCAST = 'broadcast',
}

/**
 * WebSocket message types
 */
export enum MessageType {
  CELL_UPDATE = 'cell_update',
  CELL_BATCH_UPDATE = 'cell_batch_update',
  SPREADSHEET_UPDATE = 'spreadsheet_update',
  SUBSCRIPTION = 'subscription',
  UNSUBSCRIPTION = 'unsubscription',
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong',
  AUTH = 'auth',
}

/**
 * Connection state
 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
}

/**
 * WebSocket connection metrics
 */
interface ConnectionMetrics {
  connectionId: string;
  connectedAt: number;
  messagesReceived: number;
  messagesSent: number;
  lastMessageAt?: number;
  ipAddress?: string;
  userId?: string;
}

/**
 * WebSocket-specific metrics manager
 */
export class WebSocketMetrics extends EventEmitter {
  private readonly metrics = getMetricsCollector();
  private readonly connections = new Map<string, ConnectionMetrics>();
  private connectionCount = 0;

  /**
   * Track a new WebSocket connection
   */
  trackConnection(connectionId: string, metadata?: {
    ipAddress?: string;
    userId?: string;
  }): void {
    const connectionMetrics: ConnectionMetrics = {
      connectionId,
      connectedAt: Date.now(),
      messagesReceived: 0,
      messagesSent: 0,
      ipAddress: metadata?.ipAddress,
      userId: metadata?.userId,
    };

    this.connections.set(connectionId, connectionMetrics);
    this.connectionCount++;
    this.metrics.setActiveConnections(this.connectionCount, 'websocket');

    this.emit('connection', connectionMetrics);
  }

  /**
   * Track a WebSocket disconnection
   */
  trackDisconnection(connectionId: string, reason?: string): void {
    const connectionMetrics = this.connections.get(connectionId);
    if (!connectionMetrics) return;

    const connectionDuration = (Date.now() - connectionMetrics.connectedAt) / 1000; // Convert to seconds

    // Track connection duration
    this.metrics.observeHttpRequestDuration(connectionDuration, {
      method: 'WEBSOCKET',
      path: 'connection_duration',
      status_code: reason || 'normal',
    });

    this.connections.delete(connectionId);
    this.connectionCount--;
    this.metrics.setActiveConnections(this.connectionCount, 'websocket');

    this.emit('disconnection', { connectionId, connectionDuration, reason });
  }

  /**
   * Track an incoming WebSocket message
   */
  trackIncomingMessage(
    connectionId: string,
    messageType: MessageType,
    messageSize?: number
  ): void {
    const connectionMetrics = this.connections.get(connectionId);
    if (connectionMetrics) {
      connectionMetrics.messagesReceived++;
      connectionMetrics.lastMessageAt = Date.now();
    }

    // Track message count
    this.metrics.incrementWebsocketMessages({
      operation: MessageDirection.INCOMING,
      cell_type: messageType,
    });

    // Track message size if provided
    if (messageSize !== undefined) {
      this.metrics.observeResponseSize(messageSize, `websocket_${messageType}_in`);
    }

    this.emit('message', { connectionId, direction: 'incoming', messageType });
  }

  /**
   * Track an outgoing WebSocket message
   */
  trackOutgoingMessage(
    connectionId: string,
    messageType: MessageType,
    messageSize?: number
  ): void {
    const connectionMetrics = this.connections.get(connectionId);
    if (connectionMetrics) {
      connectionMetrics.messagesSent++;
      connectionMetrics.lastMessageAt = Date.now();
    }

    // Track message count
    this.metrics.incrementWebsocketMessages({
      operation: MessageDirection.OUTGOING,
      cell_type: messageType,
    });

    // Track message size if provided
    if (messageSize !== undefined) {
      this.metrics.observeResponseSize(messageSize, `websocket_${messageType}_out`);
    }

    this.emit('message', { connectionId, direction: 'outgoing', messageType });
  }

  /**
   * Track a WebSocket broadcast operation
   */
  trackBroadcast(
    messageType: MessageType,
    recipientCount: number,
    duration: number,
    messageSize?: number
  ): void {
    // Track broadcast duration
    this.metrics.observeWebsocketBroadcastDuration(duration, {
      cell_type: messageType,
    });

    // Track individual messages sent
    for (let i = 0; i < recipientCount; i++) {
      this.metrics.incrementWebsocketMessages({
        operation: MessageDirection.BROADCAST,
        cell_type: messageType,
      });
    }

    // Track message size if provided
    if (messageSize !== undefined) {
      this.metrics.observeResponseSize(messageSize, `websocket_${messageType}_broadcast`);
    }

    this.emit('broadcast', { messageType, recipientCount, duration });
  }

  /**
   * Track a WebSocket error
   */
  trackError(connectionId: string, error: Error, errorType: string): void {
    this.metrics.incrementErrors({
      error_type: errorType || 'websocket_error',
      cell_type: 'websocket',
    });

    this.emit('error', { connectionId, error, errorType });
  }

  /**
   * Track message processing latency
   */
  trackMessageProcessing(messageType: MessageType, processingTime: number): void {
    this.metrics.observeHttpRequestDuration(processingTime / 1000, {
      method: 'WEBSOCKET',
      path: `message_processing_${messageType}`,
      status_code: 'success',
    });
  }

  /**
   * Get connection metrics for a specific connection
   */
  getConnectionMetrics(connectionId: string): ConnectionMetrics | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all active connections
   */
  getAllConnections(): ConnectionMetrics[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connections by user ID
   */
  getConnectionsByUser(userId: string): ConnectionMetrics[] {
    return this.getAllConnections().filter(
      connection => connection.userId === userId
    );
  }

  /**
   * Get connections by IP address
   */
  getConnectionsByIP(ipAddress: string): ConnectionMetrics[] {
    return this.getAllConnections().filter(
      connection => connection.ipAddress === ipAddress
    );
  }

  /**
   * Calculate messages per second (averaged over the last minute)
   */
  getMessagesPerSecond(connectionId?: string): {
    incoming: number;
    outgoing: number;
  } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    let incoming = 0;
    let outgoing = 0;

    const connectionsToCheck = connectionId
      ? [this.connections.get(connectionId)].filter(Boolean) as ConnectionMetrics[]
      : this.getAllConnections();

    for (const connection of connectionsToCheck) {
      if (connection.lastMessageAt && connection.lastMessageAt > oneMinuteAgo) {
        incoming += connection.messagesReceived;
        outgoing += connection.messagesSent;
      }
    }

    // Average over the minute (60 seconds)
    return {
      incoming: incoming / 60,
      outgoing: outgoing / 60,
    };
  }

  /**
   * Get average connection duration
   */
  getAverageConnectionDuration(): number {
    const connections = this.getAllConnections();
    if (connections.length === 0) return 0;

    const now = Date.now();
    let totalDuration = 0;

    for (const connection of connections) {
      totalDuration += now - connection.connectedAt;
    }

    return totalDuration / connections.length;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    averageMessagesPerConnection: number;
    totalMessagesReceived: number;
    totalMessagesSent: number;
  } {
    const connections = this.getAllConnections();
    let totalMessagesReceived = 0;
    let totalMessagesSent = 0;

    for (const connection of connections) {
      totalMessagesReceived += connection.messagesReceived;
      totalMessagesSent += connection.messagesSent;
    }

    return {
      totalConnections: connections.length,
      activeConnections: this.connectionCount,
      averageMessagesPerConnection: connections.length > 0
        ? (totalMessagesReceived + totalMessagesSent) / connections.length
        : 0,
      totalMessagesReceived,
      totalMessagesSent,
    };
  }

  /**
   * Get message type distribution
   */
  getMessageTypeDistribution(): Map<MessageType, {
    incoming: number;
    outgoing: number;
  }> {
    const distribution = new Map<MessageType, { incoming: number; outgoing: number }>();

    // Initialize with all message types
    for (const type of Object.values(MessageType)) {
      distribution.set(type, { incoming: 0, outgoing: 0 });
    }

    // This would require tracking individual message types
    // For now, return the initialized map

    return distribution;
  }

  /**
   * Clean up stale connections (connections that haven't sent messages in a while)
   */
  cleanupStaleConnections(maxIdleTime: number = 300000): string[] {
    const now = Date.now();
    const staleConnections: string[] = [];

    for (const [connectionId, connection] of this.connections.entries()) {
      const lastActivity = connection.lastMessageAt || connection.connectedAt;
      if (now - lastActivity > maxIdleTime) {
        staleConnections.push(connectionId);
      }
    }

    // Remove stale connections
    for (const connectionId of staleConnections) {
      this.trackDisconnection(connectionId, 'stale');
    }

    return staleConnections;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.connections.clear();
    this.connectionCount = 0;
    this.metrics.setActiveConnections(0, 'websocket');
  }

  /**
   * Get real-time statistics
   */
  getRealtimeStats(): {
    connectionCount: number;
    messagesPerSecond: ReturnType<WebSocketMetrics['getMessagesPerSecond']>;
    averageConnectionDuration: number;
    connectionStats: ReturnType<WebSocketMetrics['getConnectionStats']>;
  } {
    return {
      connectionCount: this.connectionCount,
      messagesPerSecond: this.getMessagesPerSecond(),
      averageConnectionDuration: this.getAverageConnectionDuration(),
      connectionStats: this.getConnectionStats(),
    };
  }
}

/**
 * Singleton instance of WebSocketMetrics
 */
let webSocketMetricsInstance: WebSocketMetrics | null = null;

/**
 * Get or create the WebSocketMetrics singleton
 */
export function getWebSocketMetrics(): WebSocketMetrics {
  if (!webSocketMetricsInstance) {
    webSocketMetricsInstance = new WebSocketMetrics();
  }
  return webSocketMetricsInstance;
}

/**
 * Reset the WebSocketMetrics singleton (useful for testing)
 */
export function resetWebSocketMetrics(): void {
  if (webSocketMetricsInstance) {
    webSocketMetricsInstance.reset();
  }
  webSocketMetricsInstance = null;
}
