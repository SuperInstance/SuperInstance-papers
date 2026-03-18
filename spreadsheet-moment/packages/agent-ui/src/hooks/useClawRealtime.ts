/**
 * useClawRealtime Hook
 *
 * Real-time Claw status updates via WebSocket
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClawState,
  ClawStateInfo,
  WebSocketMessageType
} from '@spreadsheet-moment/agent-core';
import type { ClawUpdateEvent } from '../components/ClawCell/types';

/**
 * WebSocket message types
 */
interface WSMessage {
  type: WebSocketMessageType | string;
  traceId: string;
  timestamp: number;
  payload: any;
}

/**
 * Hook configuration
 */
export interface UseClawRealtimeConfig {
  /** WebSocket URL */
  url: string;

  /** API key for authentication */
  apiKey?: string;

  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;

  /** Reconnect interval in ms */
  reconnectInterval?: number;

  /** Max reconnect attempts */
  maxReconnectAttempts?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Connection status
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Hook return type
 */
export interface UseClawRealtimeReturn {
  /** Connection status */
  connectionStatus: ConnectionStatus;

  /** Current claw states by ID */
  clawStates: Map<string, ClawStateInfo>;

  /** Recent update events */
  recentEvents: ClawUpdateEvent[];

  /** Subscribe to a specific claw */
  subscribe: (clawId: string, cellId: string, sheetId: string) => void;

  /** Unsubscribe from a claw */
  unsubscribe: (clawId: string, cellId: string, sheetId: string) => void;

  /** Trigger a claw */
  trigger: (clawId: string, data?: any) => void;

  /** Approve a claw action */
  approve: (clawId: string, traceId: string, approved: boolean) => void;

  /** Cancel a claw */
  cancel: (clawId: string) => void;

  /** Reconnect manually */
  reconnect: () => void;

  /** Disconnect manually */
  disconnect: () => void;

  /** Clear recent events */
  clearEvents: () => void;

  /** Last error */
  lastError: Error | null;
}

/**
 * useClawRealtime Hook
 *
 * Provides real-time updates for Claw agents via WebSocket
 */
export function useClawRealtime(config: UseClawRealtimeConfig): UseClawRealtimeReturn {
  const {
    url,
    apiKey,
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    debug = false
  } = config;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [clawStates, setClawStates] = useState<Map<string, ClawStateInfo>>(new Map());
  const [recentEvents, setRecentEvents] = useState<ClawUpdateEvent[]>([]);
  const [lastError, setLastError] = useState<Error | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Array<{ clawId: string; cellId: string; sheetId: string }>>([]);

  /**
   * Debug log
   */
  const debugLog = useCallback((message: string, ...args: any[]) => {
    if (debug) {
      console.log(`[useClawRealtime] ${message}`, ...args);
    }
  }, [debug]);

  /**
   * Add event to recent events
   */
  const addEvent = useCallback((event: ClawUpdateEvent) => {
    setRecentEvents(prev => {
      const updated = [event, ...prev].slice(0, 100); // Keep last 100 events
      return updated;
    });
  }, []);

  /**
   * Handle WebSocket message
   */
  const handleMessage = useCallback((data: string) => {
    try {
      const message: WSMessage = JSON.parse(data);
      debugLog('Received message:', message.type);

      switch (message.type) {
        case WebSocketMessageType.STATE_CHANGE:
        case 'state_change': {
          const { clawId, state, reasoning, confidence } = message.payload;
          const event: ClawUpdateEvent = {
            clawId,
            cellLocation: message.payload.cellId || '',
            type: 'state_change',
            newState: state,
            timestamp: message.timestamp
          };
          addEvent(event);

          setClawStates(prev => {
            const updated = new Map(prev);
            const existing = updated.get(clawId);
            updated.set(clawId, {
              clawId,
              state,
              reasoning: reasoning || existing?.reasoning || [],
              memory: existing?.memory || [],
              confidence: confidence || existing?.confidence || 0,
              lastUpdated: message.timestamp
            });
            return updated;
          });
          break;
        }

        case WebSocketMessageType.REASONING_STEP:
        case 'reasoning_step': {
          const { clawId, cellId, step } = message.payload;
          const event: ClawUpdateEvent = {
            clawId,
            cellLocation: cellId,
            type: 'reasoning',
            reasoning: step.content,
            timestamp: message.timestamp
          };
          addEvent(event);

          setClawStates(prev => {
            const updated = new Map(prev);
            const existing = updated.get(clawId);
            if (existing) {
              updated.set(clawId, {
                ...existing,
                reasoning: [...existing.reasoning, step],
                lastUpdated: message.timestamp
              });
            }
            return updated;
          });
          break;
        }

        case WebSocketMessageType.ACTION_COMPLETED:
        case 'action_completed': {
          const { clawId, cellId, action } = message.payload;
          const event: ClawUpdateEvent = {
            clawId,
            cellLocation: cellId,
            type: 'action',
            action: action?.type || 'unknown',
            timestamp: message.timestamp
          };
          addEvent(event);
          break;
        }

        case WebSocketMessageType.ERROR:
        case 'error': {
          const { clawId, cellId, error } = message.payload;
          const event: ClawUpdateEvent = {
            clawId,
            cellLocation: cellId,
            type: 'error',
            error: error || 'Unknown error',
            timestamp: message.timestamp
          };
          addEvent(event);

          setClawStates(prev => {
            const updated = new Map(prev);
            const existing = updated.get(clawId);
            if (existing) {
              updated.set(clawId, {
                ...existing,
                state: ClawState.ERROR,
                error,
                lastUpdated: message.timestamp
              });
            }
            return updated;
          });
          break;
        }

        case WebSocketMessageType.CELL_UPDATE:
        case 'cell_update': {
          // Handle cell updates
          debugLog('Cell update:', message.payload);
          break;
        }

        case 'connected':
          debugLog('Server confirmed connection');
          break;

        default:
          debugLog('Unhandled message type:', message.type);
      }
    } catch (error) {
      debugLog('Failed to parse message:', error);
    }
  }, [debugLog, addEvent]);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    debugLog('Connecting to:', url);

    try {
      const wsUrl = apiKey ? `${url}?token=${encodeURIComponent(apiKey)}` : url;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        debugLog('Connected');
        setConnectionStatus('connected');
        setLastError(null);
        reconnectAttemptsRef.current = 0;

        // Re-subscribe to previous subscriptions
        subscriptionsRef.current.forEach(sub => {
          ws.send(JSON.stringify({
            type: WebSocketMessageType.SUBSCRIBE,
            traceId: `resub_${Date.now()}`,
            timestamp: Date.now(),
            payload: sub
          }));
        });
      };

      ws.onmessage = (event) => {
        handleMessage(event.data);
      };

      ws.onerror = (error) => {
        debugLog('WebSocket error:', error);
        setLastError(new Error('WebSocket error'));
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        debugLog('Disconnected');
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Auto-reconnect
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          debugLog(`Reconnecting in ${reconnectInterval}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      debugLog('Failed to create WebSocket:', error);
      setConnectionStatus('error');
      setLastError(error instanceof Error ? error : new Error('Failed to connect'));
    }
  }, [url, apiKey, autoReconnect, reconnectInterval, maxReconnectAttempts, debugLog, handleMessage]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus('disconnected');
  }, []);

  /**
   * Reconnect
   */
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [disconnect, connect]);

  /**
   * Send message
   */
  const sendMessage = useCallback((type: string, payload: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      debugLog('Cannot send message: WebSocket not connected');
      return;
    }

    const message = {
      type,
      traceId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      payload
    };

    wsRef.current.send(JSON.stringify(message));
    debugLog('Sent message:', type);
  }, [debugLog]);

  /**
   * Subscribe to claw
   */
  const subscribe = useCallback((clawId: string, cellId: string, sheetId: string) => {
    // Add to subscriptions for reconnection
    const exists = subscriptionsRef.current.some(
      s => s.clawId === clawId && s.cellId === cellId
    );
    if (!exists) {
      subscriptionsRef.current.push({ clawId, cellId, sheetId });
    }

    sendMessage(WebSocketMessageType.SUBSCRIBE, { clawId, cellId, sheetId });
  }, [sendMessage]);

  /**
   * Unsubscribe from claw
   */
  const unsubscribe = useCallback((clawId: string, cellId: string, sheetId: string) => {
    // Remove from subscriptions
    subscriptionsRef.current = subscriptionsRef.current.filter(
      s => !(s.clawId === clawId && s.cellId === cellId)
    );

    sendMessage(WebSocketMessageType.UNSUBSCRIBE, { clawId, cellId, sheetId });
  }, [sendMessage]);

  /**
   * Trigger claw
   */
  const trigger = useCallback((clawId: string, data?: any) => {
    sendMessage(WebSocketMessageType.TRIGGER, { clawId, data });
  }, [sendMessage]);

  /**
   * Approve/reject claw action
   */
  const approve = useCallback((clawId: string, traceId: string, approved: boolean) => {
    sendMessage(approved ? WebSocketMessageType.APPROVE : WebSocketMessageType.REJECT, {
      clawId,
      traceId
    });
  }, [sendMessage]);

  /**
   * Cancel claw
   */
  const cancel = useCallback((clawId: string) => {
    sendMessage(WebSocketMessageType.CANCEL, { clawId });
  }, [sendMessage]);

  /**
   * Clear recent events
   */
  const clearEvents = useCallback(() => {
    setRecentEvents([]);
  }, []);

  /**
   * Connect on mount, disconnect on unmount
   */
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connectionStatus,
    clawStates,
    recentEvents,
    subscribe,
    unsubscribe,
    trigger,
    approve,
    cancel,
    reconnect,
    disconnect,
    clearEvents,
    lastError
  };
}

export default useClawRealtime;
