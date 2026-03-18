/**
 * useClawRealtime Hook
 *
 * React hook for real-time Claw status updates via WebSocket
 *
 * @packageDocumentation
 */

import { useEffect, useState, useCallback, useRef } from 'react';

// Local type definitions
enum ClawState {
  DORMANT = 'DORMANT',
  THINKING = 'THINKING',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  POSTED = 'POSTED',
  ARCHIVED = 'ARCHIVED',
  ERROR = 'ERROR'
}

interface ReasoningStep {
  stepNumber: number;
  content: string;
  timestamp: number;
  confidence: number;
  metadata?: Record<string, any>;
}

interface ClawAction {
  type: 'update_cell' | 'send_message' | 'trigger_claw' | 'custom';
  target?: string;
  data: any;
  confidence: number;
}

enum WebSocketMessageType {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  TRIGGER = 'trigger',
  APPROVE = 'approve',
  REJECT = 'reject',
  CANCEL = 'cancel',
  QUERY = 'query',
  CELL_UPDATE = 'cell_update',
  REASONING_STEP = 'reasoning_step',
  STATE_CHANGE = 'state_change',
  APPROVAL_REQUIRED = 'approval_required',
  ACTION_COMPLETED = 'action_completed',
  ERROR = 'error',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected'
}

/**
 * Real-time claw state
 */
export interface RealtimeClawState {
  /** Claw ID */
  clawId: string;

  /** Current state */
  state: ClawState;

  /** Confidence level */
  confidence: number;

  /** Current reasoning steps */
  reasoning: ReasoningStep[];

  /** Last action */
  lastAction?: ClawAction;

  /** Error message */
  error?: string;

  /** Last update timestamp */
  lastUpdated: number;
}

/**
 * State change payload
 */
interface StateChangePayload {
  clawId: string;
  state: ClawState;
  confidence: number;
  timestamp: number;
}

/**
 * Reasoning step payload
 */
interface ReasoningStepPayload {
  clawId: string;
  cellId: string;
  step: ReasoningStep;
  isFinal: boolean;
}

/**
 * Action completed payload
 */
interface ActionCompletedPayload {
  clawId: string;
  action: ClawAction;
  timestamp: number;
}

/**
 * Error payload
 */
interface ErrorPayload {
  clawId: string;
  error: string;
  timestamp: number;
}

/**
 * Hook configuration
 */
export interface UseClawRealtimeConfig {
  /** WebSocket URL */
  wsUrl?: string;

  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;

  /** Reconnection interval in ms (default: 5000) */
  reconnectInterval?: number;

  /** Max reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;

  /** On state change callback */
  onStateChange?: (clawId: string, state: ClawState) => void;

  /** On reasoning step callback */
  onReasoningStep?: (clawId: string, step: ReasoningStep) => void;

  /** On action completed callback */
  onActionCompleted?: (clawId: string, action: ClawAction) => void;

  /** On error callback */
  onError?: (clawId: string, error: string) => void;
}

/**
 * Hook return type
 */
export interface UseClawRealtimeReturn {
  /** Connection status */
  isConnected: boolean;

  /** Connection error */
  connectionError: string | null;

  /** All tracked claw states */
  clawStates: Map<string, RealtimeClawState>;

  /** Get state for a specific claw */
  getClawState: (clawId: string) => RealtimeClawState | undefined;

  /** Subscribe to a specific claw */
  subscribeToClaw: (clawId: string, cellId: string, sheetId: string) => void;

  /** Unsubscribe from a claw */
  unsubscribeFromClaw: (clawId: string, cellId: string, sheetId: string) => void;

  /** Connect to WebSocket */
  connect: () => void;

  /** Disconnect from WebSocket */
  disconnect: () => void;

  /** Clear all states */
  clearStates: () => void;
}

/**
 * useClawRealtime Hook
 *
 * Provides real-time status updates for Claw agents via WebSocket
 *
 * @example
 * ```tsx
 * const { clawStates, getClawState, isConnected } = useClawRealtime({
 *   wsUrl: 'wss://api.example.com/ws',
 *   onStateChange: (clawId, state) => {
 *     console.log(`Claw ${clawId} changed to ${state}`);
 *   }
 * });
 *
 * // Get state for a specific claw
 * const state = getClawState('claw-123');
 * ```
 */
export function useClawRealtime(config: UseClawRealtimeConfig = {}): UseClawRealtimeReturn {
  const {
    wsUrl,
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    onStateChange,
    onReasoningStep,
    onActionCompleted,
    onError
  } = config;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [clawStates, setClawStates] = useState<Map<string, RealtimeClawState>>(new Map());

  /**
   * Update claw state
   */
  const updateClawState = useCallback((clawId: string, update: Partial<RealtimeClawState>) => {
    setClawStates(prev => {
      const updated = new Map(prev);
      const existing = updated.get(clawId);

      if (existing) {
        updated.set(clawId, {
          ...existing,
          ...update,
          lastUpdated: Date.now()
        });
      } else {
        updated.set(clawId, {
          clawId,
          state: ClawState.DORMANT,
          confidence: 0,
          reasoning: [],
          ...update,
          lastUpdated: Date.now()
        });
      }

      return updated;
    });
  }, []);

  /**
   * Handle WebSocket message
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      const { type, payload } = message;

      switch (type) {
        case WebSocketMessageType.STATE_CHANGE: {
          const { clawId, state, confidence } = payload as StateChangePayload;
          updateClawState(clawId, { state, confidence });
          onStateChange?.(clawId, state);
          break;
        }

        case WebSocketMessageType.REASONING_STEP: {
          const { clawId, step, isFinal } = payload as ReasoningStepPayload;
          setClawStates(prev => {
            const updated = new Map(prev);
            const existing = updated.get(clawId);

            if (existing) {
              updated.set(clawId, {
                ...existing,
                reasoning: [...existing.reasoning, step],
                lastUpdated: Date.now()
              });
            }

            return updated;
          });
          onReasoningStep?.(clawId, step);
          break;
        }

        case WebSocketMessageType.ACTION_COMPLETED: {
          const { clawId, action } = payload as ActionCompletedPayload;
          updateClawState(clawId, {
            state: ClawState.POSTED,
            lastAction: action
          });
          onActionCompleted?.(clawId, action);
          break;
        }

        case WebSocketMessageType.ERROR: {
          const { clawId, error } = payload as ErrorPayload;
          updateClawState(clawId, {
            state: ClawState.ERROR,
            error
          });
          onError?.(clawId, error);
          break;
        }

        case WebSocketMessageType.APPROVAL_REQUIRED: {
          const { clawId, action, reasoning, confidence } = payload;
          updateClawState(clawId, {
            state: ClawState.NEEDS_REVIEW,
            confidence,
            lastAction: action
          });
          break;
        }

        case WebSocketMessageType.CELL_UPDATE: {
          // Handle cell updates if needed
          break;
        }
      }
    } catch (error) {
      console.error('[useClawRealtime] Failed to parse message:', error);
    }
  }, [updateClawState, onStateChange, onReasoningStep, onActionCompleted, onError]);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (!wsUrl || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[useClawRealtime] Connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;

        // Re-subscribe to all existing subscriptions
        subscriptionsRef.current.forEach(subKey => {
          const [clawId, cellId, sheetId] = subKey.split(':');
          ws.send(JSON.stringify({
            type: WebSocketMessageType.SUBSCRIBE,
            traceId: `resub_${Date.now()}`,
            timestamp: Date.now(),
            payload: { clawId, cellId, sheetId }
          }));
        });
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('[useClawRealtime] WebSocket error:', error);
        setConnectionError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('[useClawRealtime] Disconnected:', event.code, event.reason);
        setIsConnected(false);

        // Attempt reconnection
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`[useClawRealtime] Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionError('Max reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('[useClawRealtime] Failed to connect:', error);
      setConnectionError('Failed to establish WebSocket connection');
    }
  }, [wsUrl, handleMessage, reconnectInterval, maxReconnectAttempts]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  /**
   * Subscribe to a specific claw
   */
  const subscribeToClaw = useCallback((clawId: string, cellId: string, sheetId: string) => {
    const subKey = `${clawId}:${cellId}:${sheetId}`;
    subscriptionsRef.current.add(subKey);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: WebSocketMessageType.SUBSCRIBE,
        traceId: `sub_${Date.now()}`,
        timestamp: Date.now(),
        payload: { clawId, cellId, sheetId }
      }));
    }
  }, []);

  /**
   * Unsubscribe from a claw
   */
  const unsubscribeFromClaw = useCallback((clawId: string, cellId: string, sheetId: string) => {
    const subKey = `${clawId}:${cellId}:${sheetId}`;
    subscriptionsRef.current.delete(subKey);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: WebSocketMessageType.UNSUBSCRIBE,
        traceId: `unsub_${Date.now()}`,
        timestamp: Date.now(),
        payload: { clawId, cellId, sheetId }
      }));
    }
  }, []);

  /**
   * Get state for a specific claw
   */
  const getClawState = useCallback((clawId: string): RealtimeClawState | undefined => {
    return clawStates.get(clawId);
  }, [clawStates]);

  /**
   * Clear all states
   */
  const clearStates = useCallback(() => {
    setClawStates(new Map());
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && wsUrl) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, wsUrl, connect, disconnect]);

  return {
    isConnected,
    connectionError,
    clawStates,
    getClawState,
    subscribeToClaw,
    unsubscribeFromClaw,
    connect,
    disconnect,
    clearStates
  };
}

export default useClawRealtime;
