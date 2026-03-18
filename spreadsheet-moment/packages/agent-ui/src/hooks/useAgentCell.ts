/**
 * Custom Hooks for Agent Cell Management
 *
 * React hooks for managing agent cells:
 * - useAgentCell: Manage single agent cell state
 * - useAgentCells: Manage multiple agent cells
 * - useAgentWebSocket: WebSocket connection for real-time updates
 * - useAgentApproval: Approval workflow management
 *
 * @packageDocumentation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  IAgentCellData,
  AgentCellState,
  AgentCellType
} from '@spreadsheet-moment/agent-core';

interface UseAgentCellOptions {
  /** Initial agent cell data */
  initialData?: IAgentCellData;

  /** Auto-activate on mount */
  autoActivate?: boolean;

  /** WebSocket URL for real-time updates */
  wsUrl?: string;
}

interface WebSocketMessage {
  type: 'reasoning_step' | 'reasoning_complete' | 'state_change' | 'error';
  data: any;
}

/**
 * Hook for managing a single agent cell
 */
export function useAgentCell(options: UseAgentCellOptions = {}) {
  const {
    initialData,
    autoActivate = false,
    wsUrl
  } = options;

  const [agentCell, setAgentCell] = useState<IAgentCellData>(() => ({
    cell_type: AgentCellType.SENSOR,
    state: AgentCellState.DORMANT,
    reasoning: [],
    memory: [],
    requires_approval: true,
    ...initialData
  }));

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  /**
   * Activate the agent cell
   */
  const activate = useCallback(() => {
    setAgentCell(prev => ({
      ...prev,
      state: AgentCellState.THINKING,
      trace_id: `trace_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      updated_at: Date.now()
    }));
    setIsLoading(true);
    setError(null);
  }, []);

  /**
   * Add reasoning step
   */
  const addReasoningStep = useCallback((step: string) => {
    setAgentCell(prev => ({
      ...prev,
      reasoning: [...(prev.reasoning || []), step],
      updated_at: Date.now()
    }));
  }, []);

  /**
   * Request approval for agent action
   */
  const requestApproval = useCallback(() => {
    setAgentCell(prev => ({
      ...prev,
      state: AgentCellState.NEEDS_REVIEW,
      requires_approval: true,
      updated_at: Date.now()
    }));
    setIsLoading(false);
  }, []);

  /**
   * Approve agent action
   */
  const approve = useCallback(() => {
    setAgentCell(prev => ({
      ...prev,
      state: AgentCellState.POSTED,
      requires_approval: false,
      trace_id: undefined,
      updated_at: Date.now()
    }));
  }, []);

  /**
   * Reject agent action
   */
  const reject = useCallback((reason?: string) => {
    setAgentCell(prev => ({
      ...prev,
      state: AgentCellState.THINKING,
      requires_approval: false,
      error: reason,
      updated_at: Date.now()
    }));
  }, []);

  /**
   * Reset agent cell
   */
  const reset = useCallback(() => {
    setAgentCell(prev => ({
      ...prev,
      state: AgentCellState.DORMANT,
      reasoning: [],
      error: undefined,
      updated_at: Date.now()
    }));
    setIsLoading(false);
    setError(null);
  }, []);

  /**
   * Add to memory
   */
  const addToMemory = useCallback((memory: string) => {
    setAgentCell(prev => {
      const mem = [...(prev.memory || []), memory];
      // Keep only last 100 entries
      if (mem.length > 100) {
        mem.splice(0, mem.length - 100);
      }
      return {
        ...prev,
        memory: mem,
        updated_at: Date.now()
      };
    });
  }, []);

  // Auto-activate on mount if enabled
  useEffect(() => {
    if (autoActivate && agentCell.state === AgentCellState.DORMANT) {
      activate();
    }
  }, [autoActivate, agentCell.state, activate]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!wsUrl || agentCell.state !== AgentCellState.THINKING) {
      return;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'reasoning_step':
            addReasoningStep(message.data.content);
            break;

          case 'reasoning_complete':
            requestApproval();
            break;

          case 'state_change':
            setAgentCell(prev => ({
              ...prev,
              state: message.data.state,
              updated_at: Date.now()
            }));
            break;

          case 'error':
            setError(message.data.error);
            setAgentCell(prev => ({
              ...prev,
              state: AgentCellState.ERROR,
              error: message.data.error
            }));
            setIsLoading(false);
            break;
        }
      } catch (error) {
        console.error('[useAgentCell] Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[useAgentCell] WebSocket error:', error);
      setError('WebSocket connection failed');
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [wsUrl, agentCell.state, addReasoningStep, requestApproval]);

  return {
    agentCell,
    isLoading,
    error,
    activate,
    addReasoningStep,
    requestApproval,
    approve,
    reject,
    reset,
    addToMemory,
    isThinking: agentCell.state === AgentCellState.THINKING,
    needsReview: agentCell.state === AgentCellState.NEEDS_REVIEW,
    isApproved: agentCell.state === AgentCellState.POSTED,
    isDormant: !agentCell.state || agentCell.state === AgentCellState.DORMANT,
    hasError: agentCell.state === AgentCellState.ERROR
  };
}

/**
 * Hook for managing multiple agent cells
 */
export function useAgentCells(initialCells: IAgentCellData[] = []) {
  const [cells, setCells] = useState<IAgentCellData[]>(initialCells);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);

  /**
   * Add a new agent cell
   */
  const addCell = useCallback((cell: IAgentCellData) => {
    setCells(prev => [...prev, cell]);
  }, []);

  /**
   * Update an agent cell
   */
  const updateCell = useCallback((cellId: string, updates: Partial<IAgentCellData>) => {
    setCells(prev =>
      prev.map(cell =>
        cell.origin_id === cellId
          ? { ...cell, ...updates, updated_at: Date.now() }
          : cell
      )
    );
  }, []);

  /**
   * Remove an agent cell
   */
  const removeCell = useCallback((cellId: string) => {
    setCells(prev => prev.filter(cell => cell.origin_id !== cellId));
  }, []);

  /**
   * Get cell by ID
   */
  const getCell = useCallback((cellId: string) => {
    return cells.find(cell => cell.origin_id === cellId);
  }, [cells]);

  /**
   * Get cells by type
   */
  const getCellsByType = useCallback((type: AgentCellType) => {
    return cells.filter(cell => cell.cell_type === type);
  }, [cells]);

  /**
   * Get cells by state
   */
  const getCellsByState = useCallback((state: AgentCellState) => {
    return cells.filter(cell => cell.state === state);
  }, [cells]);

  /**
   * Get active cells (thinking or needs review)
   */
  const getActiveCells = useCallback(() => {
    return cells.filter(cell =>
      cell.state === AgentCellState.THINKING ||
      cell.state === AgentCellState.NEEDS_REVIEW
    );
  }, [cells]);

  return {
    cells,
    selectedCellId,
    setSelectedCellId,
    addCell,
    updateCell,
    removeCell,
    getCell,
    getCellsByType,
    getCellsByState,
    getActiveCells,
    selectedCell: selectedCellId ? getCell(selectedCellId) : null
  };
}

/**
 * Hook for approval workflow
 */
export function useAgentApproval(agentCell: IAgentCellData) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /**
   * Handle approve action
   */
  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setShowConfirm(false);
      return true;
    } catch (error) {
      console.error('[useAgentApproval] Approve failed:', error);
      return false;
    } finally {
      setIsApproving(false);
    }
  }, []);

  /**
   * Handle reject action
   */
  const handleReject = useCallback(async (reason?: string) => {
    setIsRejecting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return true;
    } catch (error) {
      console.error('[useAgentApproval] Reject failed:', error);
      return false;
    } finally {
      setIsRejecting(false);
    }
  }, []);

  /**
   * Show confirmation dialog
   */
  const requestConfirmation = useCallback(() => {
    setShowConfirm(true);
  }, []);

  /**
   * Cancel approval
   */
  const cancelApproval = useCallback(() => {
    setShowConfirm(false);
  }, []);

  return {
    isApproving,
    isRejecting,
    showConfirm,
    handleApprove,
    handleReject,
    requestConfirmation,
    cancelApproval,
    canApprove: agentCell.state === AgentCellState.NEEDS_REVIEW,
    canReject: agentCell.state === AgentCellState.NEEDS_REVIEW,
    isPending: agentCell.state === AgentCellState.THINKING
  };
}
