/**
 * Claw Cell Status Bar Component
 *
 * Status bar showing all Claw cells in the spreadsheet
 */

import React, { useMemo } from 'react';
import { ClawCellStatusBarProps, ClawCellConfiguration, ClawCellState } from './types';
import { ClawState } from '@spreadsheet-moment/agent-core';

/**
 * Get aggregate stats
 */
function getAggregateStats(
  cells: Array<{ config: ClawCellConfiguration; state?: ClawCellState }>
) {
  let total = cells.length;
  let idle = 0;
  let thinking = 0;
  let acting = 0;
  let complete = 0;
  let error = 0;
  let waiting = 0;

  cells.forEach(({ state }) => {
    if (!state) {
      idle++;
      return;
    }

    switch (state.clawState) {
      case ClawState.IDLE:
        idle++;
        break;
      case ClawState.THINKING:
        thinking++;
        break;
      case ClawState.ACTING:
        acting++;
        break;
      case ClawState.COMPLETE:
        complete++;
        break;
      case ClawState.ERROR:
        error++;
        break;
      case ClawState.WAITING_APPROVAL:
        waiting++;
        break;
    }
  });

  return {
    total,
    idle,
    thinking,
    acting,
    complete,
    error,
    waiting,
    active: thinking + acting + waiting
  };
}

/**
 * ClawCellStatusBar Component
 */
export const ClawCellStatusBar: React.FC<ClawCellStatusBarProps> = ({
  cells,
  onCellClick,
  showAggregateStats = true,
  className = ''
}) => {
  const stats = useMemo(() => getAggregateStats(cells), [cells]);

  /**
   * Get state color
   */
  const getStateColor = (state?: ClawState) => {
    if (!state) return '#718096';

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
  };

  /**
   * Handle cell click
   */
  const handleCellClick = (location: string) => {
    onCellClick?.(location);
  };

  return (
    <div className={`claw-cell-status-bar ${className}`}>
      {/* Aggregate Stats */}
      {showAggregateStats && (
        <div className="claw-aggregate-stats">
          <div className="stat-badge total" title="Total Claw cells">
            🤖 {stats.total}
          </div>
          {stats.active > 0 && (
            <div className="stat-badge active" title="Active Claw cells">
              ⚡ {stats.active}
            </div>
          )}
          {stats.thinking > 0 && (
            <div className="stat-badge thinking" title="Thinking">
              🤔 {stats.thinking}
            </div>
          )}
          {stats.acting > 0 && (
            <div className="stat-badge acting" title="Acting">
              ⚡ {stats.acting}
            </div>
          )}
          {stats.waiting > 0 && (
            <div className="stat-badge waiting" title="Waiting approval">
              🤝 {stats.waiting}
            </div>
          )}
          {stats.complete > 0 && (
            <div className="stat-badge complete" title="Complete">
              ✅ {stats.complete}
            </div>
          )}
          {stats.error > 0 && (
            <div className="stat-badge error" title="Errors">
              ❌ {stats.error}
            </div>
          )}
        </div>
      )}

      {/* Cell List */}
      <div className="claw-cell-list">
        {cells.map(({ location, config, state }) => (
          <div
            key={location}
            className="claw-cell-item"
            onClick={() => handleCellClick(location)}
            style={{
              '--state-color': getStateColor(state?.clawState)
            } as React.CSSProperties}
            title={config.name}
          >
            <div
              className="cell-state-dot"
              style={{ backgroundColor: getStateColor(state?.clawState) }}
            />
            <span className="cell-location">{location}</span>
            <span className="cell-name">{config.name}</span>
            {state?.clawState === ClawState.THINKING && (
              <span className="cell-animation">🤔</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClawCellStatusBar;
