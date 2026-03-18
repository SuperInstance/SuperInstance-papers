/**
 * Agent WebSocket Provider
 *
 * WebSocket provider for real-time agent updates:
 * - Connection management
 * - Automatic reconnection
 * - Message handling
 * - Subscription management
 *
 * @packageDocumentation
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

interface WebSocketContextValue {
  /** Connection status */
  isConnected: boolean;

  /** Connection error */
  error: string | null;

  /** Connect to WebSocket */
  connect: (url: string) => void;

  /** Disconnect from WebSocket */
  disconnect: () => void;

  /** Send message to WebSocket */
  send: (message: any) => void;

  /** Subscribe to message type */
  subscribe: (type: string, callback: (data: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  /** WebSocket server URL */
  url: string;

  /** Auto-connect on mount */
  autoConnect?: boolean;

  /** Reconnection interval in milliseconds */
  reconnectInterval?: number;

  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;

  /** Children components */
  children: React.ReactNode;
}

interface Subscription {
  type: string;
  callback: (data: any) => void;
}

/**
 * Agent WebSocket Provider
 *
 * Provides WebSocket connection and real-time messaging for agent updates
 */
export const AgentWebSocketProvider: React.FC<WebSocketProviderProps> = ({
  url,
  autoConnect = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
  children
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback((wsUrl: string) => {
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[AgentWebSocketProvider] Connected to', wsUrl);
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { type, data } = message;

          // Notify all subscribers for this message type
          const subscribers = subscriptionsRef.current.get(type);
          if (subscribers) {
            subscribers.forEach(callback => callback(data));
          }
        } catch (error) {
          console.error('[AgentWebSocketProvider] Failed to parse message:', error);
        }
      };

      ws.onerror = (event) => {
        console.error('[AgentWebSocketProvider] WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('[AgentWebSocketProvider] Disconnected:', event.code, event.reason);
        setIsConnected(false);

        // Attempt reconnection if not explicitly closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`[AgentWebSocketProvider] Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect(wsUrl);
          }, reconnectInterval);
        }
      };
    } catch (error) {
      console.error('[AgentWebSocketProvider] Failed to connect:', error);
      setError('Failed to establish WebSocket connection');
    }
  }, [reconnectInterval, maxReconnectAttempts]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  /**
   * Send message to WebSocket server
   */
  const send = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[AgentWebSocketProvider] Cannot send message: WebSocket not connected');
    }
  }, []);

  /**
   * Subscribe to a specific message type
   */
  const subscribe = useCallback((type: string, callback: (data: any) => void) => {
    if (!subscriptionsRef.current.has(type)) {
      subscriptionsRef.current.set(type, new Set());
    }

    subscriptionsRef.current.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = subscriptionsRef.current.get(type);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          subscriptionsRef.current.delete(type);
        }
      }
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && url) {
      connect(url);
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, url, connect, disconnect]);

  const contextValue: WebSocketContextValue = {
    isConnected,
    error,
    connect,
    disconnect,
    send,
    subscribe
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * Hook to use WebSocket context
 */
export function useAgentWebSocket() {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error('useAgentWebSocket must be used within AgentWebSocketProvider');
  }

  return context;
}

/**
 * Hook to subscribe to specific message types
 */
export function useWebSocketSubscription(type: string, callback: (data: any) => void) {
  const { subscribe, isConnected } = useAgentWebSocket();

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const unsubscribe = subscribe(type, callback);

    return unsubscribe;
  }, [type, callback, subscribe, isConnected]);

  return { isConnected };
}

export default AgentWebSocketProvider;
