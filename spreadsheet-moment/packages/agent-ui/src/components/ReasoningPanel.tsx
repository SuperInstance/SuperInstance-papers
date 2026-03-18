/**
 * Visual Thinking Panel Component
 *
 * Real-time display of agent reasoning steps:
 * - Streaming markdown rendering
 * - Animated typing effect
 * - Step-by-step reasoning visualization
 * - Collapsible sections
 *
 * @packageDocumentation
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { IAgentCellData, AgentCellState } from '@spreadsheet-moment/agent-core';

interface ReasoningPanelProps {
  /** Agent cell data to display reasoning for */
  agentCell: IAgentCellData;

  /** WebSocket URL for real-time updates */
  wsUrl?: string;

  /** Show full reasoning or just latest step */
  showFullReasoning?: boolean;

  /** Enable typing animation */
  enableAnimation?: boolean;

  /** Maximum number of steps to show */
  maxSteps?: number;

  /** Callback when reasoning is complete */
  onComplete?: () => void;

  /** Custom class name */
  className?: string;
}

interface ReasoningStep {
  step: number;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

/**
 * ReasoningPanel Component
 *
 * Displays agent reasoning with real-time updates and markdown rendering
 */
export const ReasoningPanel: React.FC<ReasoningPanelProps> = ({
  agentCell,
  wsUrl,
  showFullReasoning = true,
  enableAnimation = true,
  maxSteps = 50,
  onComplete,
  className = ''
}) => {
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize steps from agent cell reasoning
  useEffect(() => {
    if (agentCell.reasoning && agentCell.reasoning.length > 0) {
      const initialSteps = agentCell.reasoning.map((content, index) => ({
        step: index + 1,
        content,
        timestamp: agentCell.updated_at || Date.now()
      }));
      setSteps(initialSteps);
    }
  }, [agentCell.reasoning, agentCell.updated_at]);

  // Auto-scroll to bottom when new steps arrive
  useEffect(() => {
    if (panelRef.current && isExpanded) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [steps, isExpanded]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!wsUrl || agentCell.state !== AgentCellState.THINKING) {
      return;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('[ReasoningPanel] WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'reasoning_step') {
          addStep(data.content);
        } else if (data.type === 'reasoning_complete') {
          setIsConnected(false);
          onComplete?.();
        }
      } catch (error) {
        console.error('[ReasoningPanel] Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[ReasoningPanel] WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('[ReasoningPanel] WebSocket disconnected');
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [wsUrl, agentCell.state]);

  /**
   * Add a new reasoning step
   */
  const addStep = (content: string) => {
    setSteps(prev => {
      const newStep: ReasoningStep = {
        step: prev.length + 1,
        content,
        timestamp: Date.now(),
        isStreaming: true
      };

      const updated = [...prev, newStep];

      // Keep only maxSteps
      if (updated.length > maxSteps) {
        updated.splice(0, updated.length - maxSteps);
      }

      // Mark previous steps as not streaming after a delay
      setTimeout(() => {
        setSteps(current =>
          current.map(s => ({ ...s, isStreaming: false }))
        );
      }, 100);

      return updated;
    });
  };

  /**
   * Get display text for a step
   */
  const getStepText = (step: ReasoningStep): string => {
    return `${step.step}. ${step.content}`;
  };

  /**
   * Render a single reasoning step
   */
  const renderStep = (step: ReasoningStep) => {
    return (
      <div
        key={step.step}
        className={`reasoning-step ${step.isStreaming ? 'streaming' : ''}`}
        style={{
          padding: '12px',
          marginBottom: '8px',
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          borderLeft: '3px solid #3b82f6',
          borderRadius: '4px',
          animation: step.isStreaming ? 'fadeIn 0.3s ease-in' : 'none'
        }}
      >
        <ReactMarkdown
          className="reasoning-content"
          components={{
            p: ({ children }: { children?: React.ReactNode }) => (
              <p style={{ margin: '4px 0' }}>{children}</p>
            ),
            code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) => (
              inline ? (
                <code style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                  fontSize: '0.9em'
                }}>{children}</code>
              ) : (
                <code style={{
                  display: 'block',
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  padding: '12px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.9em',
                  overflowX: 'auto',
                  margin: '8px 0'
                }}>{children}</code>
              )
            )
          }}
        >
          {getStepText(step)}
        </ReactMarkdown>
        {step.isStreaming && (
          <span className="cursor" style={{
            display: 'inline-block',
            width: '2px',
            height: '1em',
            backgroundColor: '#3b82f6',
            marginLeft: '2px',
            animation: 'blink 1s infinite'
          }} />
        )}
      </div>
    );
  };

  /**
   * Render empty state
   */
  const renderEmpty = () => {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#94a3b8'
      }}>
        <p style={{ margin: 0 }}>Waiting for agent reasoning...</p>
      </div>
    );
  };

  /**
   * Render connection status
   */
  const renderStatus = () => {
    if (!wsUrl) return null;

    return (
      <div style={{
        padding: '8px 12px',
        fontSize: '12px',
        color: isConnected ? '#10b981' : '#94a3b8',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isConnected ? '#10b981' : '#94a3b8',
          animation: isConnected ? 'pulse 2s infinite' : 'none'
        }} />
        {isConnected ? 'Live reasoning stream' : 'Disconnected'}
      </div>
    );
  };

  return (
    <div
      ref={panelRef}
      className={`reasoning-panel ${className}`}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        maxHeight: showFullReasoning ? '600px' : '200px',
        overflowY: 'auto',
        transition: 'max-height 0.3s ease'
      }}
    >
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '12px 16px',
          borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: '#3b82f6' }}
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>
            Visual Thinking
          </span>
          {agentCell.state === AgentCellState.THINKING && (
            <span style={{
              padding: '2px 8px',
              fontSize: '11px',
              backgroundColor: '#dbeafe',
              color: '#1d4ed8',
              borderRadius: '12px',
              fontWeight: 500
            }}>
              Thinking
            </span>
          )}
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Connection status */}
      {isExpanded && renderStatus()}

      {/* Reasoning steps */}
      {isExpanded && (
        <div style={{ padding: '16px' }}>
          {steps.length > 0 ? (
            steps.map(renderStep)
          ) : (
            renderEmpty()
          )}
        </div>
      )}

      {/* Global styles for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .reasoning-content {
          color: #1e293b;
          fontSize: 14px;
          lineHeight: 1.6;
        }

        .reasoning-step {
          transition: all 0.2s ease;
        }

        .reasoning-step:hover {
          background-color: rgba(59, 130, 246, 0.08);
        }
      `}</style>
    </div>
  );
};

export default ReasoningPanel;
