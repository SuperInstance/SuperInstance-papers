/**
 * useClawClient Hook
 *
 * React hook for ClawClient management with automatic lifecycle handling
 *
 * @packageDocumentation
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// Type definitions since agent-core may not build
interface ClawClientConfigType {
  baseUrl: string;
  wsUrl?: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  retryBackoffMultiplier?: number;
  enableValidation?: boolean;
  enableWebSocket?: boolean;
  wsReconnectInterval?: number;
  maxWsReconnectDelay?: number;
  maxWsReconnectAttempts?: number;
  healthCheckInterval?: number;
  debug?: boolean;
}

interface ClawStateInfoType {
  clawId: string;
  state: string;
  reasoning: Array<{ stepNumber: number; content: string; timestamp: number; confidence: number }>;
  memory: string[];
  confidence: number;
  error?: string;
  lastUpdated: number;
}

interface CreateClawRequestType {
  config: any;
  context?: { sheetId: string; userId?: string; sessionId?: string };
}

interface CreateClawResponseType {
  clawId: string;
  status: 'created' | 'pending' | 'error';
  message?: string;
  config: any;
}

interface QueryClawResponseType {
  clawId: string;
  state: ClawStateInfoType;
  reasoning?: any[];
  memory?: string[];
  relationships?: any[];
  exists: boolean;
}

interface TriggerClawResponseType {
  clawId: string;
  traceId: string;
  status: 'triggered' | 'already_running' | 'error';
  message?: string;
}

interface CancelClawResponseType {
  clawId: string;
  status: 'cancelled' | 'not_running' | 'error';
  message?: string;
}

interface ApproveClawResponseType {
  clawId: string;
  traceId: string;
  status: 'approved' | 'rejected' | 'not_found' | 'error';
  message?: string;
}

/**
 * Hook configuration
 */
export interface UseClawClientConfig extends Partial<ClawClientConfigType> {
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
}

/**
 * Hook return type
 */
export interface UseClawClientReturn {
  /** ClawClient instance */
  client: any | null;

  /** Connection status */
  isConnected: boolean;

  /** Loading state */
  isLoading: boolean;

  /** Last error */
  error: Error | null;

  /** Create a new claw */
  createClaw: (request: CreateClawRequestType) => Promise<CreateClawResponseType>;

  /** Query claw state */
  queryClaw: (clawId: string, includeReasoning?: boolean) => Promise<QueryClawResponseType>;

  /** Trigger a claw */
  triggerClaw: (clawId: string, data?: any) => Promise<TriggerClawResponseType>;

  /** Cancel a claw */
  cancelClaw: (clawId: string, reason?: string) => Promise<CancelClawResponseType>;

  /** Approve/reject a claw action */
  approveClaw: (clawId: string, traceId: string, approved: boolean, reason?: string) => Promise<ApproveClawResponseType>;

  /** Delete a claw */
  deleteClaw: (clawId: string) => Promise<void>;

  /** Get claw history */
  getHistory: (clawId: string, limit?: number) => Promise<ClawStateInfoType[]>;

  /** Connect to WebSocket */
  connect: () => void;

  /** Disconnect from WebSocket */
  disconnect: () => void;

  /** Subscribe to claw events */
  subscribe: (event: string, callback: (data: any) => void) => () => void;

  /** Clear error */
  clearError: () => void;
}

/**
 * useClawClient Hook
 *
 * Manages ClawClient lifecycle and provides convenient methods for Claw API operations
 *
 * @example
 * ```tsx
 * const { client, createClaw, triggerClaw, isConnected } = useClawClient({
 *   baseUrl: '/api',
 *   apiKey: 'your-api-key'
 * });
 *
 * // Create a new claw
 * const response = await createClaw({
 *   config: { ... }
 * });
 *
 * // Trigger a claw
 * await triggerClaw(response.clawId);
 * ```
 */
export function useClawClient(config: UseClawClientConfig = {}): UseClawClientReturn {
  const {
    autoConnect = true,
    baseUrl,
    wsUrl,
    apiKey,
    timeout = 30000,
    maxRetries = 3,
    enableWebSocket = true,
    debug = false
  } = config;

  const clientRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize client
  useEffect(() => {
    if (!autoConnect || !baseUrl) {
      return;
    }

    // Mock client for now - in real implementation this would use ClawClient
    const mockClient = {
      on: (event: string, callback: any) => {},
      off: (event: string, callback: any) => {},
      dispose: () => {},
      disconnectWebSocket: () => {},
      createClaw: async (request: any) => ({ clawId: 'mock-id', status: 'created', config: request.config }),
      queryClaw: async (request: any) => ({ clawId: request.clawId, exists: true, state: {} }),
      triggerClaw: async (request: any) => ({ clawId: request.clawId, traceId: 'trace-1', status: 'triggered' }),
      cancelClaw: async (request: any) => ({ clawId: request.clawId, status: 'cancelled' }),
      approveClaw: async (request: any) => ({ clawId: request.clawId, traceId: request.traceId, status: 'approved' }),
      deleteClaw: async (clawId: string) => {},
      getClawHistory: async (clawId: string, limit: number) => []
    };

    clientRef.current = mockClient;

    // Simulate connection
    setIsConnected(true);

    return () => {
      clientRef.current?.dispose();
      clientRef.current = null;
      setIsConnected(false);
    };
  }, [autoConnect, baseUrl, wsUrl, apiKey, timeout, maxRetries, enableWebSocket, debug]);

  // Create claw
  const createClaw = useCallback(async (request: CreateClawRequestType): Promise<CreateClawResponseType> => {
    if (!clientRef.current) {
      throw new Error('Client not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await clientRef.current.createClaw(request);
      return response;
    } catch (err) {
      const apiError = err instanceof Error ? err : new Error(String(err));
      setError(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Query claw
  const queryClaw = useCallback(async (
    clawId: string,
    includeReasoning: boolean = true
  ): Promise<QueryClawResponseType> => {
    if (!clientRef.current) {
      throw new Error('Client not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await clientRef.current.queryClaw({
        clawId,
        includeReasoning,
        includeMemory: true,
        includeRelationships: true
      });
      return response;
    } catch (err) {
      const apiError = err instanceof Error ? err : new Error(String(err));
      setError(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger claw
  const triggerClaw = useCallback(async (
    clawId: string,
    data?: any
  ): Promise<TriggerClawResponseType> => {
    if (!clientRef.current) {
      throw new Error('Client not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await clientRef.current.triggerClaw({
        clawId,
        data
      });
      return response;
    } catch (err) {
      const apiError = err instanceof Error ? err : new Error(String(err));
      setError(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cancel claw
  const cancelClaw = useCallback(async (
    clawId: string,
    reason?: string
  ): Promise<CancelClawResponseType> => {
    if (!clientRef.current) {
      throw new Error('Client not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await clientRef.current.cancelClaw({
        clawId,
        reason
      });
      return response;
    } catch (err) {
      const apiError = err instanceof Error ? err : new Error(String(err));
      setError(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Approve claw
  const approveClaw = useCallback(async (
    clawId: string,
    traceId: string,
    approved: boolean,
    reason?: string
  ): Promise<ApproveClawResponseType> => {
    if (!clientRef.current) {
      throw new Error('Client not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await clientRef.current.approveClaw({
        clawId,
        traceId,
        approved,
        reason
      });
      return response;
    } catch (err) {
      const apiError = err instanceof Error ? err : new Error(String(err));
      setError(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete claw
  const deleteClaw = useCallback(async (clawId: string): Promise<void> => {
    if (!clientRef.current) {
      throw new Error('Client not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      await clientRef.current.deleteClaw(clawId);
    } catch (err) {
      const apiError = err instanceof Error ? err : new Error(String(err));
      setError(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get history
  const getHistory = useCallback(async (
    clawId: string,
    limit: number = 100
  ): Promise<ClawStateInfoType[]> => {
    if (!clientRef.current) {
      throw new Error('Client not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const history = await clientRef.current.getClawHistory(clawId, limit);
      return history;
    } catch (err) {
      const apiError = err instanceof Error ? err : new Error(String(err));
      setError(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connect
  const connect = useCallback(() => {
    if (clientRef.current && wsUrl) {
      clientRef.current.disconnectWebSocket();
    }
  }, [wsUrl]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnectWebSocket();
    }
  }, []);

  // Subscribe
  const subscribe = useCallback((event: string, callback: (data: any) => void): (() => void) => {
    if (!clientRef.current) {
      return () => {};
    }

    clientRef.current.on(event, callback);

    return () => {
      clientRef.current?.off(event, callback);
    };
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    client: clientRef.current,
    isConnected,
    isLoading,
    error,
    createClaw,
    queryClaw,
    triggerClaw,
    cancelClaw,
    approveClaw,
    deleteClaw,
    getHistory,
    connect,
    disconnect,
    subscribe,
    clearError
  };
}

export default useClawClient;
