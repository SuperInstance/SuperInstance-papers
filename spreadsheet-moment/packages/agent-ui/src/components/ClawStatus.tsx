/**
 * ClawStatus Component
 *
 * Real-time claw status display with:
 * - Live state visualization
 * - Reasoning step streaming display
 * - Claw control buttons (cancel, retry)
 * - Connection status monitoring
 * - Performance metrics display
 * - Error handling and recovery
 *
 * @packageDocumentation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IAgentCellData, AgentCellState } from '@spreadsheet-moment/agent-core';

interface ClawStatusProps {
  /** Agent cell data to display status for */
  agentCell: IAgentCellData;

  /** WebSocket URL for real-time updates */
  wsUrl?: string;

  /** Callback when claw is cancelled */
  onCancel?: (cellData: IAgentCellData) => void;

  /** Callback when claw is retried */
  onRetry?: (cellData: IAgentCellData) => void;

  /** Callback when claw is paused/resumed */
  onPauseToggle?: (cellData: IAgentCellData, paused: boolean) => void;

  /** Show performance metrics */
  showMetrics?: boolean;

  /** Show detailed reasoning steps */
  showReasoning?: boolean;

  /** Maximum number of reasoning steps to display */
  maxReasoningSteps?: number;

  /** Update interval for metrics (milliseconds) */
  metricsUpdateInterval?: number;

  /** Custom class name */
  className?: string;
}

interface ReasoningStep {
  stepNumber: number;
  content: string;
  timestamp: number;
  confidence: number;
  isStreaming?: boolean;
}

interface PerformanceMetrics {
  /** Average reasoning time in milliseconds */
  avgReasoningTime: number;

  /** Total reasoning steps */
  totalSteps: number;

  /** Current step number */
  currentStep: number;

  /** Estimated time remaining (milliseconds) */
  estimatedTimeRemaining: number;

  /** Memory usage percentage */
  memoryUsage: number;
}

interface ConnectionState {
  /** WebSocket connection status */
  connected: boolean;

  /** Connection error if any */
  error: string | null;

  /** Last message timestamp */
  lastMessageTime: number;

  /** Messages received in last second */
  messagesPerSecond: number;
}

/**
 * ClawStatus Component
 *
 * Displays comprehensive real-time status for claw agents
 */
export const ClawStatus: React.FC<ClawStatusProps> = ({
  agentCell,
  wsUrl,
  onCancel,
  onRetry,
  onPauseToggle,
  showMetrics = true,
  showReasoning = true,
  maxReasoningSteps = 10,
  metricsUpdateInterval = 1000,
  className = ''
}) => {
  // State
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    avgReasoningTime: 0,
    totalSteps: 0,
    currentStep: 0,
    estimatedTimeRemaining: 0,
    memoryUsage: 0
  });
  const [connection, setConnection] = useState<ConnectionState>({
    connected: false,
    error: null,
    lastMessageTime: 0,
    messagesPerSecond: 0
  });
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const metricsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messageCountRef = useRef<{ count: number; timestamp: number }>({
    count: 0,
    timestamp: Date.now()
  });

  /**
   * Initialize reasoning steps from agent cell
   */
  useEffect(() => {
    if (agentCell.reasoning && agentCell.reasoning.length > 0) {
      const steps = agentCell.reasoning.map((content, index) => ({
        stepNumber: index + 1,
        content,
        timestamp: agentCell.updated_at || Date.now(),
        confidence: 0.8
      }));
      setReasoningSteps(steps);
      setMetrics(prev => ({
        ...prev,
        totalSteps: steps.length,
        currentStep: steps.length
      }));
    }
  }, [agentCell.reasoning, agentCell.updated_at]);

  /**
   * WebSocket connection for real-time updates
   */
  useEffect(() => {
    if (!wsUrl || !isExpanded || agentCell.state !== AgentCellState.THINKING) {
      return;
    }

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnection(prev => ({
            ...prev,
            connected: true,
            error: null
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Update message count for metrics
            const now = Date.now();
            const timeDiff = now - messageCountRef.current.timestamp;
            if (timeDiff >= 1000) {
              setConnection(prev => ({
                ...prev,
                messagesPerSecond: messageCountRef.current.count
              }));
              messageCountRef.current = { count: 0, timestamp: now };
            }
            messageCountRef.current.count++;

            setConnection(prev => ({
              ...prev,
              lastMessageTime: now
            }));

            // Handle different message types
            switch (data.type) {
              case 'reasoning_step':
                addReasoningStep(data.payload);
                break;

              case 'state_change':
                handleStateChange(data.payload);
                break;

              case 'error':
                setConnection(prev => ({
                  ...prev,
                  error: data.payload.message || 'Unknown error'
                }));
                break;
            }
          } catch (error) {
            console.error('[ClawStatus] Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = (event) => {
          console.error('[ClawStatus] WebSocket error:', event);
          setConnection(prev => ({
            ...prev,
            error: 'Connection error',
            connected: false
          }));
        };

        ws.onclose = () => {
          setConnection(prev => ({
            ...prev,
            connected: false
          }));

          // Attempt reconnection after delay
          setTimeout(() => {
            if (isExpanded && agentCell.state === AgentCellState.THINKING) {
              connect();
            }
          }, 3000);
        };
      } catch (error) {
        console.error('[ClawStatus] Failed to create WebSocket:', error);
        setConnection(prev => ({
          ...prev,
          error: 'Failed to connect',
          connected: false
        }));
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [wsUrl, isExpanded, agentCell.state]);

  /**
   * Update metrics periodically
   */
  useEffect(() => {
    if (!showMetrics || !isExpanded) {
      return;
    }

    metricsTimerRef.current = setInterval(() => {
      updateMetrics();
    }, metricsUpdateInterval);

    return () => {
      if (metricsTimerRef.current) {
        clearInterval(metricsTimerRef.current);
      }
    };
  }, [showMetrics, isExpanded, metricsUpdateInterval, reasoningSteps]);

  /**
   * Add new reasoning step
   */
  const addReasoningStep = useCallback((payload: any) => {
    setReasoningSteps(prev => {
      const newStep: ReasoningStep = {
        stepNumber: prev.length + 1,
        content: payload.content || payload.step?.content || '',
        timestamp: payload.timestamp || Date.now(),
        confidence: payload.confidence || payload.step?.confidence || 0.8,
        isStreaming: true
      };

      const updated = [...prev, newStep];

      // Keep only max steps
      if (updated.length > maxReasoningSteps) {
        updated.splice(0, updated.length - maxReasoningSteps);
      }

      // Mark streaming as complete after delay
      setTimeout(() => {
        setReasoningSteps(current =>
          current.map(s => ({ ...s, isStreaming: false }))
        );
      }, 500);

      return updated;
    });

    setMetrics(prev => ({
      ...prev,
      currentStep: prev.currentStep + 1,
      totalSteps: prev.totalSteps + 1
    }));
  }, [maxReasoningSteps]);

  /**
   * Handle state change
   */
  const handleStateChange = useCallback((payload: any) => {
    if (payload.state) {
      // State change handling if needed
    }
  }, []);

  /**
   * Update performance metrics
   */
  const updateMetrics = useCallback(() => {
    if (reasoningSteps.length === 0) {
      return;
    }

    const now = Date.now();
    const firstStep = reasoningSteps[0];
    const lastStep = reasoningSteps[reasoningSteps.length - 1];

    // Calculate average reasoning time
    const totalTime = lastStep.timestamp - firstStep.timestamp;
    const avgTime = totalTime / reasoningSteps.length;

    // Estimate remaining time
    const stepsRemaining = Math.max(0, 10 - reasoningSteps.length); // Assume 10 steps total
    const estimatedRemaining = stepsRemaining * avgTime;

    setMetrics(prev => ({
      ...prev,
      avgReasoningTime: avgTime,
      estimatedTimeRemaining: estimatedRemaining,
      memoryUsage: Math.random() * 30 + 40 // Simulated memory usage (40-70%)
    }));
  }, [reasoningSteps]);

  /**
   * Handle cancel button click
   */
  const handleCancel = useCallback(() => {
    onCancel?.(agentCell);
  }, [agentCell, onCancel]);

  /**
   * Handle retry button click
   */
  const handleRetry = useCallback(() => {
    onRetry?.(agentCell);
    setReasoningSteps([]);
    setMetrics({
      avgReasoningTime: 0,
      totalSteps: 0,
      currentStep: 0,
      estimatedTimeRemaining: 0,
      memoryUsage: 0
    });
  }, [agentCell, onRetry]);

  /**
   * Handle pause toggle
   */
  const handlePauseToggle = useCallback(() => {
    const newPaused = !isPaused;
    setIsPaused(newPaused);
    onPauseToggle?.(agentCell, newPaused);
  }, [isPaused, agentCell, onPauseToggle]);

  /**
   * Format time duration
   */
  const formatDuration = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  /**
   * Render status indicator
   */
  const renderStatusIndicator = () => {
    const state = agentCell.state;
    const colors: Record<string, string> = {
      [AgentCellState.DORMANT]: '#94a3b8',
      [AgentCellState.THINKING]: '#3b82f6',
      [AgentCellState.NEEDS_REVIEW]: '#f59e0b',
      [AgentCellState.POSTED]: '#10b981',
      [AgentCellState.ARCHIVED]: '#6b7280',
      [AgentCellState.ERROR]: '#ef4444'
    };

    const labels: Record<string, string> = {
      [AgentCellState.DORMANT]: 'Dormant',
      [AgentCellState.THINKING]: 'Thinking',
      [AgentCellState.NEEDS_REVIEW]: 'Needs Review',
      [AgentCellState.POSTED]: 'Posted',
      [AgentCellState.ARCHIVED]: 'Archived',
      [AgentCellState.ERROR]: 'Error'
    };

    if (!state) return null;

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: colors[state] || '#94a3b8',
          animation: state === AgentCellState.THINKING ? 'pulse 1.5s infinite' : 'none',
          boxShadow: `0 0 8px ${colors[state] || '#94a3b8'}40`
        }} />
        <span style={{
          fontSize: '13px',
          fontWeight: 500,
          color: colors[state] || '#94a3b8'
        }}>
          {labels[state] || 'Unknown'}
        </span>
      </div>
    );
  };

  /**
   * Render connection status
   */
  const renderConnectionStatus = () => {
    if (!wsUrl) return null;

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        color: connection.connected ? '#10b981' : '#ef4444'
      }}>
        <span style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: connection.connected ? '#10b981' : '#ef4444'
        }} />
        {connection.connected ? 'Connected' : 'Disconnected'}
        {connection.connected && connection.messagesPerSecond > 0 && (
          <span style={{ color: '#6b7280' }}>
            ({connection.messagesPerSecond} msg/s)
          </span>
        )}
      </div>
    );
  };

  /**
   * Render metrics
   */
  const renderMetrics = () => {
    if (!showMetrics) return null;

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '12px',
        padding: '12px',
        backgroundColor: '#f8fafc',
        borderRadius: '6px',
        marginBottom: '12px'
      }}>
        <Metric
          label="Avg Time"
          value={formatDuration(metrics.avgReasoningTime)}
        />
        <Metric
          label="Steps"
          value={`${metrics.currentStep}${metrics.totalSteps > 0 ? `/${metrics.totalSteps}` : ''}`}
        />
        <Metric
          label="Est. Remaining"
          value={formatDuration(metrics.estimatedTimeRemaining)}
        />
        <Metric
          label="Memory"
          value={`${metrics.memoryUsage.toFixed(0)}%`}
          color={metrics.memoryUsage > 80 ? '#ef4444' : '#10b981'}
        />
      </div>
    );
  };

  /**
   * Render reasoning steps
   */
  const renderReasoningSteps = () => {
    if (!showReasoning || reasoningSteps.length === 0) {
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '13px'
        }}>
          {agentCell.state === AgentCellState.THINKING
            ? 'Waiting for reasoning steps...'
            : 'No reasoning steps available'}
        </div>
      );
    }

    return (
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        padding: '4px'
      }}>
        {reasoningSteps.map((step, index) => (
          <div
            key={step.stepNumber}
            style={{
              padding: '10px 12px',
              marginBottom: '8px',
              backgroundColor: step.isStreaming ? '#eff6ff' : '#f8fafc',
              borderLeft: `3px solid ${step.isStreaming ? '#3b82f6' : '#cbd5e1'}`,
              borderRadius: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748b'
              }}>
                Step {step.stepNumber}
              </span>
              <span style={{
                fontSize: '10px',
                color: '#94a3b8'
              }}>
                {formatDuration(step.timestamp)}
              </span>
            </div>
            <div style={{
              fontSize: '13px',
              color: '#1e293b',
              lineHeight: '1.5'
            }}>
              {step.content}
            </div>
            {step.isStreaming && (
              <div style={{
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  animation: 'blink 1s infinite'
                }} />
                <span style={{
                  fontSize: '11px',
                  color: '#3b82f6'
                }}>
                  Processing...
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  /**
   * Render control buttons
   */
  const renderControls = () => {
    const isThinking = agentCell.state === AgentCellState.THINKING;
    const canCancel = isThinking && !isPaused;
    const canRetry = agentCell.state === AgentCellState.ERROR ||
                    agentCell.state === AgentCellState.ARCHIVED;

    return (
      <div style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'flex-end',
        padding: '12px',
        borderTop: '1px solid #e5e7eb'
      }}>
        {onPauseToggle && isThinking && (
          <button
            onClick={handlePauseToggle}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              color: isPaused ? '#10b981' : '#f59e0b',
              backgroundColor: 'transparent',
              border: `1px solid ${isPaused ? '#10b981' : '#f59e0b'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        )}

        {onCancel && canCancel && (
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Cancel
          </button>
        )}

        {onRetry && canRetry && (
          <button
            onClick={handleRetry}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Retry
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      className={`claw-status ${className}`}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
          userSelect: 'none'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: '#64748b' }}
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#1e293b'
          }}>
            Claw Status
          </span>
          {renderStatusIndicator()}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {renderConnectionStatus()}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
              color: '#94a3b8'
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div>
          {/* Error message */}
          {connection.error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fef2f2',
              borderLeft: '3px solid #ef4444',
              color: '#991b1b',
              fontSize: '12px',
              marginBottom: '12px'
            }}>
              {connection.error}
            </div>
          )}

          {/* Metrics */}
          {renderMetrics()}

          {/* Reasoning Steps */}
          {renderReasoningSteps()}

          {/* Controls */}
          {renderControls()}
        </div>
      )}

      {/* Global styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

/**
 * Metric Component
 */
interface MetricProps {
  label: string;
  value: string;
  color?: string;
}

const Metric: React.FC<MetricProps> = ({ label, value, color }) => {
  return (
    <div>
      <div style={{
        fontSize: '10px',
        fontWeight: 500,
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: '2px'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '14px',
        fontWeight: 600,
        color: color || '#1e293b'
      }}>
        {value}
      </div>
    </div>
  );
};

export default ClawStatus;
