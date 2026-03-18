/**
 * Claw Cell Renderer Component
 *
 * Renders Claw cells with state indicators and stats
 */

import React, { useState, useEffect } from 'react';
import {
  ClawCellRendererProps,
  ClawCellConfiguration,
  ClawCellState
} from './types';
import { ClawState, getAgentCellStateColor } from '@spreadsheet-moment/agent-core';

/**
 * Get state color for Claw
 */
function getClawStateColor(state: ClawState): string {
  switch (state) {
    case ClawState.IDLE:
      return '#718096';
    case ClawState.THINKING:
      return '#9f7aea';
    case ClawState.ACTING:
      return '#ed8936';
    case ClawState.COMPLETE:
      return '#48bb78';
    case ClawState.ERROR:
      return '#e53e3e';
    case ClawState.WAITING_APPROVAL:
      return '#ecc94b';
    default:
      return '#718096';
  }
}

/**
 * Format execution time
 */
function formatExecutionTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * ClawCellRenderer Component
 */
export const ClawCellRenderer: React.FC<ClawCellRendererProps> = ({
  config,
  state,
  location,
  showStateIndicator = true,
  showStats = true,
  compact = false,
  onClick,
  className = ''
}) => {
  const [animationFrame, setAnimationFrame] = useState(0);

  // Animate when thinking
  useEffect(() => {
    if (state?.clawState === ClawState.THINKING) {
      const interval = setInterval(() => {
        setAnimationFrame(prev => (prev + 1) % 3);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [state?.clawState]);

  /**
   * Get state icon
   */
  const getStateIcon = () => {
    if (!state) return '💤';

    switch (state.clawState) {
      case ClawState.IDLE:
        return '💤';
      case ClawState.THINKING:
        return animationFrame === 0 ? '🤔' : animationFrame === 1 ? '💭' : '🧠';
      case ClawState.ACTING:
        return '⚡';
      case ClawState.COMPLETE:
        return '✅';
      case ClawState.ERROR:
        return '❌';
      case ClawState.WAITING_APPROVAL:
        return '🤝';
      default:
        return '❓';
    }
  };

  /**
   * Get equipment count badge
   */
  const getEquipmentBadge = () => {
    return (
      <span className="equipment-badge" title={`${config.equipment.length} equipment slots`}>
        🔌 {config.equipment.length}
      </span>
    );
  };

  /**
   * Render stats
   */
  const renderStats = () => {
    if (!showStats || !state) return null;

    return (
      <div className="claw-stats">
        <span className="stat-item" title="Executions">
          📊 {state.stats.executions}
        </span>
        <span className="stat-item" title="Success rate">
          ✅ {state.stats.executions > 0
            ? `${Math.round((state.stats.successes / state.stats.executions) * 100)}%`
            : 'N/A'}
        </span>
        <span className="stat-item" title="Average execution time">
          ⏱️ {state.stats.avgExecutionTime > 0
            ? formatExecutionTime(state.stats.avgExecutionTime)
            : 'N/A'}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`claw-cell-renderer ${compact ? 'compact' : ''} ${className}`}
      onClick={onClick}
      style={{
        '--claw-state-color': state ? getClawStateColor(state.clawState) : '#718096'
      } as React.CSSProperties}
    >
      {/* State Indicator */}
      {showStateIndicator && (
        <div
          className="claw-state-indicator"
          style={{
            backgroundColor: state ? getClawStateColor(state.clawState) : '#718096',
            animation: state?.clawState === ClawState.THINKING ? 'pulse 1.5s infinite' : 'none'
          }}
          title={state?.clawState || 'IDLE'}
        >
          {getStateIcon()}
        </div>
      )}

      {/* Content */}
      <div className="claw-cell-content">
        {/* Name */}
        <div className="claw-cell-name">{config.name}</div>

        {/* Purpose */}
        {!compact && (
          <div className="claw-cell-purpose">{config.purpose}</div>
        )}

        {/* Meta */}
        <div className="claw-cell-meta">
          <span className="location">{location}</span>
          <span className="model">{config.model}</span>
          {getEquipmentBadge()}
        </div>

        {/* Stats */}
        {renderStats()}

        {/* Last Action */}
        {!compact && state?.lastAction && (
          <div className="claw-last-action">
            <span className="action-icon">⚡</span>
            <span className="action-text">{state.lastAction.description}</span>
          </div>
        )}

        {/* Error */}
        {state?.error && (
          <div className="claw-error" title={state.error}>
            ⚠️ Error
          </div>
        )}
      </div>
    </div>
  );
};

export default ClawCellRenderer;
