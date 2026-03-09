/**
 * Explanation Panel Component
 *
 * Displays plain language explanations for cell decisions and query results.
 * Provides human-readable insights into cell behavior.
 */

import React, { useState } from 'react';
import { Explanation, ExplanationDetail } from '../../nl/CellExplainer.js';
import { QueryResult } from '../../nl/NLQueryEngine.js';
import { CellType, CellState } from '../../core/types.js';

/**
 * Explanation panel props
 */
export interface ExplanationPanelProps {
  explanation?: Explanation;
  queryResult?: QueryResult;
  cellId?: string;
  cellType?: CellType;
  cellState?: CellState;
  className?: string;
  detail?: ExplanationDetail;
  showHeader?: boolean;
  showSuggestions?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
  onClose?: () => void;
}

/**
 * Explanation panel component
 */
export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({
  explanation,
  queryResult,
  cellId,
  cellType,
  cellState,
  className = '',
  detail = ExplanationDetail.STANDARD,
  showHeader = true,
  showSuggestions = true,
  onSuggestionClick,
  onClose,
}) => {
  const [expandedDetails, setExpandedDetails] = useState(true);

  // Get display data
  const displayExplanation = explanation || createDefaultExplanation(queryResult, cellId, cellType, cellState);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
  };

  // Toggle details expansion
  const toggleDetails = () => {
    setExpandedDetails(!expandedDetails);
  };

  return (
    <div className={`explanation-panel ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="explanation-header">
          <h3 className="explanation-title">Explanation</h3>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="explanation-close"
              aria-label="Close explanation"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="explanation-summary">
        <div className="explanation-summary-text">{displayExplanation.summary}</div>

        {/* Confidence indicator */}
        {displayExplanation.confidence !== undefined && (
          <div className="explanation-confidence">
            <span className="confidence-label">Confidence:</span>
            <div className="confidence-bar-container">
              <div
                className="confidence-bar"
                style={{ width: `${displayExplanation.confidence * 100}%` }}
                role="progressbar"
                aria-valuenow={displayExplanation.confidence * 100}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="confidence-value">
              {(displayExplanation.confidence * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      {displayExplanation.details && displayExplanation.details.length > 0 && (
        <div className="explanation-details">
          <button
            type="button"
            onClick={toggleDetails}
            className="explanation-details-toggle"
            aria-expanded={expandedDetails}
          >
            <span className="toggle-icon">{expandedDetails ? '▼' : '▶'}</span>
            <span className="toggle-label">Details</span>
            <span className="detail-count">({displayExplanation.details.length})</span>
          </button>

          {expandedDetails && (
            <ul className="explanation-details-list">
              {displayExplanation.details.map((detail, index) => (
                <li key={index} className="explanation-detail-item">
                  {detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && displayExplanation.suggestions && displayExplanation.suggestions.length > 0 && (
        <div className="explanation-suggestions">
          <h4 className="suggestions-title">Suggestions</h4>
          <ul className="suggestions-list">
            {displayExplanation.suggestions.map((suggestion, index) => (
              <li key={index} className="suggestion-item">
                <button
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="suggestion-button"
                  disabled={!onSuggestionClick}
                >
                  <span className="suggestion-icon">💡</span>
                  <span className="suggestion-text">{suggestion}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Query result info */}
      {queryResult && (
        <div className="explanation-query-result">
          <div className="query-result-count">
            Found {queryResult.count} cell{queryResult.count !== 1 ? 's' : ''}
          </div>
          {queryResult.explanation && (
            <div className="query-result-explanation">{queryResult.explanation}</div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Cell explanation card (compact version)
 */
export interface CellExplanationCardProps {
  cellId: string;
  cellType: CellType;
  cellState: CellState;
  value?: unknown;
  confidence?: number;
  error?: string;
  onClick?: () => void;
  className?: string;
}

export const CellExplanationCard: React.FC<CellExplanationCardProps> = ({
  cellId,
  cellType,
  cellState,
  value,
  confidence,
  error,
  onClick,
  className = '',
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`cell-explanation-card ${className} ${error ? 'has-error' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {/* Cell identifier */}
      <div className="cell-card-identifier">
        <span className="cell-card-id">{cellId}</span>
        <span className={`cell-card-state cell-state-${cellState}`}>
          {formatCellState(cellState)}
        </span>
      </div>

      {/* Cell type */}
      <div className="cell-card-type">{formatCellType(cellType)}</div>

      {/* Value */}
      {value !== undefined && value !== null && (
        <div className="cell-card-value">{formatValue(value)}</div>
      )}

      {/* Error */}
      {error && (
        <div className="cell-card-error" role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* Confidence */}
      {confidence !== undefined && (
        <div className="cell-card-confidence">
          <span className="confidence-label">Confidence:</span>
          <span className="confidence-value">{(confidence * 100).toFixed(0)}%</span>
        </div>
      )}

      {/* Click indicator */}
      {onClick && (
        <div className="cell-card-click-hint">Click for details</div>
      )}
    </div>
  );
};

/**
 * Create default explanation
 */
function createDefaultExplanation(
  queryResult?: QueryResult,
  cellId?: string,
  cellType?: CellType,
  cellState?: CellState
): Explanation {
  if (queryResult) {
    return {
      summary: queryResult.explanation || `Found ${queryResult.count} cells`,
      details: queryResult.results.map((ref) => ref.id || `${ref.row}:${ref.col}`),
      confidence: 1.0,
      suggestions: queryResult.error
        ? [`Try rephrasing your query`, 'Check for typos in cell references']
        : ['Try refining your query for more specific results'],
    };
  }

  if (cellId) {
    return {
      summary: `${cellId} (${cellType ? formatCellType(cellType) : 'Unknown cell'})`,
      details: cellState
        ? [`Current state: ${formatCellState(cellState)}`]
        : ['Select a cell to see details'],
      confidence: 0,
      suggestions: ['Click on a cell to see its explanation'],
    };
  }

  return {
    summary: 'No explanation available',
    details: [],
    confidence: 0,
  };
}

/**
 * Format cell type for display
 */
function formatCellType(type: CellType): string {
  return type.toLowerCase().replace('_', ' ');
}

/**
 * Format cell state for display
 */
function formatCellState(state: CellState): string {
  const stateLabels: Record<CellState, string> = {
    [CellState.DORMANT]: 'Idle',
    [CellState.SENSING]: 'Receiving',
    [CellState.PROCESSING]: 'Processing',
    [CellState.EMITTING]: 'Emitting',
    [CellState.LEARNING]: 'Learning',
    [CellState.ERROR]: 'Error',
  };

  return stateLabels[state] || state;
}

/**
 * Format value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'Empty';
  }

  if (typeof value === 'string') {
    return value.length > 50 ? `${value.substring(0, 50)}...` : value;
  }

  if (typeof value === 'number') {
    return value.toFixed(2);
  }

  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }

  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Explanation panel styles
 */
export const explanationPanelStyles = `
.explanation-panel {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.explanation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.explanation-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.explanation-close {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: #6b7280;
  padding: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.explanation-close:hover {
  background-color: #f3f4f6;
}

.explanation-summary {
  margin-bottom: 12px;
}

.explanation-summary-text {
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
}

.explanation-confidence {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.confidence-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.confidence-bar-container {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.confidence-bar {
  height: 100%;
  background: linear-gradient(to right, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
}

.confidence-value {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
  min-width: 45px;
  text-align: right;
}

.explanation-details {
  margin-bottom: 12px;
}

.explanation-details-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  padding: 4px 0;
  width: 100%;
  text-align: left;
}

.toggle-icon {
  font-size: 10px;
  transition: transform 0.2s;
}

.toggle-label {
  font-weight: 500;
}

.detail-count {
  color: #6b7280;
  font-size: 12px;
}

.explanation-details-list {
  margin: 8px 0 0 0;
  padding-left: 20px;
  list-style: disc;
}

.explanation-detail-item {
  font-size: 13px;
  color: #374151;
  line-height: 1.6;
  margin-bottom: 4px;
}

.explanation-suggestions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.suggestions-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.suggestions-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.suggestion-item {
  margin-bottom: 8px;
}

.suggestion-button {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  text-align: left;
  transition: background-color 0.2s, border-color 0.2s;
}

.suggestion-button:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.suggestion-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.suggestion-icon {
  flex-shrink: 0;
}

.suggestion-text {
  flex: 1;
  line-height: 1.4;
}

.explanation-query-result {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.query-result-count {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.query-result-explanation {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}

/* Cell explanation card */
.cell-explanation-card {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.cell-explanation-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: #9ca3af;
}

.cell-explanation-card.has-error {
  border-color: #fecaca;
  background: #fef2f2;
}

.cell-card-identifier {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.cell-card-id {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.cell-card-state {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.cell-state-dormant {
  background: #f3f4f6;
  color: #6b7280;
}

.cell-state-sensing {
  background: #dbeafe;
  color: #1e40af;
}

.cell-state-processing {
  background: #fef3c7;
  color: #92400e;
}

.cell-state-emitting {
  background: #d1fae5;
  color: #065f46;
}

.cell-state-learning {
  background: #ede9fe;
  color: #5b21b6;
}

.cell-state-error {
  background: #fef2f2;
  color: #dc2626;
}

.cell-card-type {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
  text-transform: capitalize;
}

.cell-card-value {
  font-size: 14px;
  color: #374151;
  margin-bottom: 8px;
  font-family: monospace;
}

.cell-card-error {
  font-size: 12px;
  color: #dc2626;
  margin-bottom: 8px;
  line-height: 1.4;
}

.cell-card-confidence {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.cell-card-confidence .confidence-label {
  color: #6b7280;
}

.cell-card-confidence .confidence-value {
  color: #111827;
  font-weight: 600;
}

.cell-card-click-hint {
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
  margin-top: 8px;
}
`;
