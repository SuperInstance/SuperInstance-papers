/**
 * Agent Cell Renderer Component
 *
 * Visual indicators for agent cell states:
 * - State badges
 * - Thinking animations
 * - Approval indicators
 * - Error states
 *
 * @packageDocumentation
 */

import React, { useEffect, useState } from 'react';
import { IAgentCellData, AgentCellState, AgentCellType, getAgentCellStateColor } from '@spreadsheet-moment/agent-core';

interface AgentCellRendererProps {
  /** Agent cell data to render */
  agentCell: IAgentCellData;

  /** Cell value display */
  value?: string | number;

  /** Show state indicator */
  showStateIndicator?: boolean;

  /** Show thinking animation */
  showThinkingAnimation?: boolean;

  /** Compact mode for small cells */
  compact?: boolean;

  /** Click handler */
  onClick?: () => void;

  /** Custom class name */
  className?: string;
}

/**
 * AgentCellRenderer Component
 *
 * Renders agent cell with state indicators and animations
 */
export const AgentCellRenderer: React.FC<AgentCellRendererProps> = ({
  agentCell,
  value,
  showStateIndicator = true,
  showThinkingAnimation = true,
  compact = false,
  onClick,
  className = ''
}) => {
  const [animationFrame, setAnimationFrame] = useState(0);

  // Animate thinking indicator
  useEffect(() => {
    if (agentCell.state === AgentCellState.THINKING && showThinkingAnimation) {
      const interval = setInterval(() => {
        setAnimationFrame(prev => (prev + 1) % 3);
      }, 500);

      return () => clearInterval(interval);
    }
  }, [agentCell.state, showThinkingAnimation]);

  /**
   * Get state indicator
   */
  const getStateIndicator = () => {
    if (!showStateIndicator || !agentCell.state) {
      return null;
    }

    const color = getAgentCellStateColor(agentCell.state);
    const size = compact ? 8 : 12;

    return (
      <div
        className="agent-state-indicator"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
          animation: agentCell.state === AgentCellState.THINKING ? 'pulse 1.5s infinite' : 'none',
          boxShadow: `0 0 8px ${color}80`
        }}
        title={agentCell.state}
      />
    );
  };

  /**
   * Get thinking animation
   */
  const getThinkingAnimation = () => {
    if (agentCell.state !== AgentCellState.THINKING || !showThinkingAnimation) {
      return null;
    }

    const dots = [0, 1, 2].map(i => (
      <span
        key={i}
        style={{
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          backgroundColor: animationFrame === i ? '#3b82f6' : '#dbeafe',
          margin: '0 2px',
          transition: 'background-color 0.3s ease'
        }}
      />
    ));

    return (
      <div
        className="thinking-animation"
        style={{
          display: 'flex',
          alignItems: 'center',
          marginLeft: compact ? '4px' : '8px'
        }}
      >
        {dots}
      </div>
    );
  };

  /**
   * Get approval badge
   */
  const getApprovalBadge = () => {
    if (agentCell.state !== AgentCellState.NEEDS_REVIEW) {
      return null;
    }

    return (
      <div
        className="approval-badge"
        style={{
          padding: compact ? '2px 6px' : '4px 8px',
          fontSize: compact ? '10px' : '11px',
          fontWeight: 600,
          backgroundColor: '#fef3c7',
          color: '#92400e',
          borderRadius: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          marginLeft: compact ? '4px' : '8px'
        }}
      >
        <svg
          width={compact ? 10 : 12}
          height={compact ? 10 : 12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        {compact ? '' : 'Review'}
      </div>
    );
  };

  /**
   * Get error indicator
   */
  const getErrorIndicator = () => {
    if (agentCell.state !== AgentCellState.ERROR || !agentCell.error) {
      return null;
    }

    return (
      <div
        className="error-indicator"
        style={{
          padding: compact ? '2px 6px' : '4px 8px',
          fontSize: compact ? '10px' : '11px',
          fontWeight: 600,
          backgroundColor: '#fecaca',
          color: '#991b1b',
          borderRadius: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          marginLeft: compact ? '4px' : '8px',
          maxWidth: compact ? '100px' : '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
        title={agentCell.error}
      >
        <svg
          width={compact ? 10 : 12}
          height={compact ? 10 : 12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {compact ? 'Error' : agentCell.error}
      </div>
    );
  };

  /**
   * Get agent type badge
   */
  const getTypeBadge = () => {
    if (!agentCell.cell_type || compact) {
      return null;
    }

    const typeColors: Record<AgentCellType, string> = {
      [AgentCellType.SENSOR]: '#dbeafe',
      [AgentCellType.ANALYZER]: '#f3e8ff',
      [AgentCellType.CONTROLLER]: '#fce7f3',
      [AgentCellType.ORCHESTRATOR]: '#ffedd5'
    };

    const typeTextColors: Record<AgentCellType, string> = {
      [AgentCellType.SENSOR]: '#1d4ed8',
      [AgentCellType.ANALYZER]: '#7e22ce',
      [AgentCellType.CONTROLLER]: '#be185d',
      [AgentCellType.ORCHESTRATOR]: '#c2410c'
    };

    return (
      <div
        className="agent-type-badge"
        style={{
          padding: '2px 6px',
          fontSize: '10px',
          fontWeight: 600,
          backgroundColor: typeColors[agentCell.cell_type],
          color: typeTextColors[agentCell.cell_type],
          borderRadius: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginLeft: '8px'
        }}
      >
        {agentCell.cell_type}
      </div>
    );
  };

  /**
   * Render cell content
   */
  const renderContent = () => {
    const displayValue = value !== undefined ? value : agentCell.v;

    return (
      <div
        className="agent-cell-content"
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
          padding: compact ? '4px 8px' : '8px 12px',
          fontSize: compact ? '13px' : '14px',
          color: '#1e293b',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {displayValue !== undefined && (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {String(displayValue)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className={`agent-cell-renderer ${className}`}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: agentCell.state === AgentCellState.THINKING ? '#eff6ff' : 'transparent',
        border: agentCell.state === AgentCellState.NEEDS_REVIEW ? '2px solid #f59e0b' : 'none',
        borderRadius: '6px',
        transition: 'all 0.2s ease',
        minHeight: compact ? '28px' : '36px'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.backgroundColor = '#f8fafc';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = agentCell.state === AgentCellState.THINKING ? '#eff6ff' : 'transparent';
      }}
    >
      {/* State indicator */}
      {getStateIndicator()}

      {/* Cell content */}
      {renderContent()}

      {/* Thinking animation */}
      {getThinkingAnimation()}

      {/* Approval badge */}
      {getApprovalBadge()}

      {/* Error indicator */}
      {getErrorIndicator()}

      {/* Type badge */}
      {getTypeBadge()}

      {/* Global styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }

        .agent-cell-renderer:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

/**
 * Default export
 */
export default AgentCellRenderer;
