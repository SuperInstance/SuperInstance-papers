/**
 * Claw Management Panel
 *
 * Comprehensive UI for managing Claw agents in the spreadsheet.
 * Provides real-time status, configuration, and control capabilities.
 *
 * @packageDocumentation
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Local type definitions (standalone, no dependency on agent-core)
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

interface StatsInfo {
  executions: number;
  successes: number;
  failures: number;
  avgExecutionTime: number;
}

interface ClawCellState {
  clawState: ClawState;
  reasoningSteps: string[];
  lastAction?: {
    type: string;
    description: string;
    timestamp: number;
  };
  stats?: StatsInfo;
  error?: string;
}

interface ClawCellConfiguration {
  id: string;
  name: string;
  model: string;
  provider: string;
  purpose: string;
  trigger: {
    type: string;
    dataSource?: string;
    interval?: number;
  };
  equipment: string[];
  learningStrategy?: {
    type: string;
  };
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Claw instance with UI state
 */
interface ClawInstance {
  id: string;
  config: ClawCellConfiguration;
  state?: ClawCellState;
  lastUpdated: number;
  isLoading: boolean;
}

/**
 * Management panel props
 */
export interface ClawManagementPanelProps {
  /** Claw API base URL */
  apiUrl?: string;

  /** WebSocket URL for real-time updates */
  wsUrl?: string;

  /** API key for authentication */
  apiKey?: string;

  /** Current sheet ID */
  sheetId?: string;

  /** On claw created callback */
  onClawCreated?: (clawId: string) => void;

  /** On claw triggered callback */
  onClawTriggered?: (clawId: string, traceId: string) => void;

  /** On claw error callback */
  onClawError?: (clawId: string, error: Error) => void;

  /** Custom class name */
  className?: string;
}

/**
 * View mode for the panel
 */
type ViewMode = 'list' | 'grid' | 'detail';

/**
 * Filter criteria
 */
interface FilterCriteria {
  state?: ClawState;
  provider?: string;
  searchTerm: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get state color
 */
function getStateColor(state?: ClawState): string {
  if (!state) return '#718096';

  switch (state) {
    case ClawState.DORMANT: return '#718096';
    case ClawState.THINKING: return '#9f7aea';
    case ClawState.NEEDS_REVIEW: return '#ecc94b';
    case ClawState.POSTED: return '#48bb78';
    case ClawState.ARCHIVED: return '#a0aec0';
    case ClawState.ERROR: return '#e53e3e';
    default: return '#718096';
  }
}

/**
 * Get state label
 */
function getStateLabel(state?: ClawState): string {
  if (!state) return 'Unknown';

  switch (state) {
    case ClawState.DORMANT: return 'Idle';
    case ClawState.THINKING: return 'Thinking';
    case ClawState.NEEDS_REVIEW: return 'Needs Review';
    case ClawState.POSTED: return 'Complete';
    case ClawState.ARCHIVED: return 'Archived';
    case ClawState.ERROR: return 'Error';
    default: return 'Unknown';
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 1000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ============================================================================
// CLAW MANAGEMENT PANEL COMPONENT
// ============================================================================

/**
 * ClawManagementPanel Component
 *
 * Provides comprehensive management of Claw agents with:
 * - Real-time status updates via WebSocket
 * - Create, configure, trigger, and delete agents
 * - Filter and search capabilities
 * - Detailed view with reasoning steps
 * - Approval workflow for actions requiring review
 */
export const ClawManagementPanel: React.FC<ClawManagementPanelProps> = ({
  apiUrl = '/api',
  wsUrl,
  apiKey,
  sheetId,
  onClawCreated,
  onClawTriggered,
  onClawError,
  className = ''
}) => {
  // State
  const [claws, setClaws] = useState<Map<string, ClawInstance>>(new Map());
  const [selectedClawId, setSelectedClawId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filter, setFilter] = useState<FilterCriteria>({ searchTerm: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  // Initialize connection and load data
  useEffect(() => {
    setConnectionStatus('connected');

    // Load sample claws for demo
    const sampleClaws: ClawInstance[] = [
      {
        id: 'claw-1',
        config: {
          id: 'claw-1',
          name: 'Data Analyzer',
          model: 'deepseek-chat',
          provider: 'deepseek',
          purpose: 'Analyzes data patterns and generates insights',
          trigger: { type: 'data', dataSource: 'A1:B10' },
          equipment: ['MEMORY', 'REASONING', 'SPREADSHEET']
        },
        state: {
          clawState: ClawState.DORMANT,
          reasoningSteps: [],
          stats: { executions: 15, successes: 14, failures: 1, avgExecutionTime: 2500 }
        },
        lastUpdated: Date.now() - 300000,
        isLoading: false
      },
      {
        id: 'claw-2',
        config: {
          id: 'claw-2',
          name: 'Anomaly Detector',
          model: 'deepseek-chat',
          provider: 'deepseek',
          purpose: 'Monitors cells for anomalies and alerts users',
          trigger: { type: 'periodic', interval: 60000 },
          equipment: ['MEMORY', 'REASONING', 'CONSENSUS']
        },
        state: {
          clawState: ClawState.THINKING,
          reasoningSteps: ['Checking cell ranges...', 'Analyzing patterns...'],
          stats: { executions: 42, successes: 42, failures: 0, avgExecutionTime: 1800 }
        },
        lastUpdated: Date.now() - 60000,
        isLoading: false
      }
    ];

    setClaws(new Map(sampleClaws.map(c => [c.id, c])));
    setIsLoading(false);
  }, [apiUrl, wsUrl, apiKey]);

  // Filtered claws
  const filteredClaws = useMemo(() => {
    const allClaws = Array.from(claws.values());

    return allClaws.filter(claw => {
      // State filter
      if (filter.state && claw.state?.clawState !== filter.state) {
        return false;
      }

      // Provider filter
      if (filter.provider && claw.config.provider !== filter.provider) {
        return false;
      }

      // Search filter
      if (filter.searchTerm) {
        const term = filter.searchTerm.toLowerCase();
        return (
          claw.config.name.toLowerCase().includes(term) ||
          claw.config.purpose.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [claws, filter]);

  // Aggregate stats
  const aggregateStats = useMemo(() => {
    const allClaws = Array.from(claws.values());
    return {
      total: allClaws.length,
      active: allClaws.filter(c => c.state?.clawState === ClawState.THINKING).length,
      idle: allClaws.filter(c => c.state?.clawState === ClawState.DORMANT).length,
      error: allClaws.filter(c => c.state?.clawState === ClawState.ERROR).length,
      needsReview: allClaws.filter(c => c.state?.clawState === ClawState.NEEDS_REVIEW).length
    };
  }, [claws]);

  // Handlers
  const handleTriggerClaw = useCallback(async (clawId: string) => {
    setClaws(prev => {
      const updated = new Map(prev);
      const existing = updated.get(clawId);
      if (existing) {
        updated.set(clawId, { ...existing, isLoading: true });
      }
      return updated;
    });

    try {
      onClawTriggered?.(clawId, `trace-${Date.now()}`);
    } catch (error) {
      onClawError?.(clawId, error as Error);
    } finally {
      setClaws(prev => {
        const updated = new Map(prev);
        const existing = updated.get(clawId);
        if (existing) {
          updated.set(clawId, { ...existing, isLoading: false });
        }
        return updated;
      });
    }
  }, [onClawTriggered, onClawError]);

  const handleCancelClaw = useCallback(async (clawId: string) => {
    setClaws(prev => {
      const updated = new Map(prev);
      const existing = updated.get(clawId);
      if (existing && existing.state) {
        updated.set(clawId, {
          ...existing,
          state: { ...existing.state, clawState: ClawState.DORMANT },
          lastUpdated: Date.now()
        });
      }
      return updated;
    });
  }, []);

  const handleDeleteClaw = useCallback(async (clawId: string) => {
    setClaws(prev => {
      const updated = new Map(prev);
      updated.delete(clawId);
      return updated;
    });
    setSelectedClawId(null);
  }, []);

  const handleApproveClaw = useCallback(async (clawId: string, traceId: string, approved: boolean) => {
    setClaws(prev => {
      const updated = new Map(prev);
      const existing = updated.get(clawId);
      if (existing && existing.state) {
        updated.set(clawId, {
          ...existing,
          state: {
            ...existing.state,
            clawState: approved ? ClawState.POSTED : ClawState.THINKING
          },
          lastUpdated: Date.now()
        });
      }
      return updated;
    });
  }, []);

  // Selected claw
  const selectedClaw = selectedClawId ? claws.get(selectedClawId) : null;

  return (
    <div className={`claw-management-panel ${className}`}>
      {/* Header */}
      <div className="claw-panel-header">
        <div className="header-title">
          <h2>Claw Agents</h2>
          <span className="connection-status" data-status={connectionStatus}>
            {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Aggregate Stats */}
        <div className="aggregate-stats">
          <span className="stat-badge total" title="Total agents">
            <span className="stat-icon">Agents</span>
            <span className="stat-value">{aggregateStats.total}</span>
          </span>
          {aggregateStats.active > 0 && (
            <span className="stat-badge active" title="Currently active">
              <span className="stat-icon">Active</span>
              <span className="stat-value">{aggregateStats.active}</span>
            </span>
          )}
          {aggregateStats.needsReview > 0 && (
            <span className="stat-badge review" title="Needs review">
              <span className="stat-icon">Review</span>
              <span className="stat-value">{aggregateStats.needsReview}</span>
            </span>
          )}
          {aggregateStats.error > 0 && (
            <span className="stat-badge error" title="Errors">
              <span className="stat-icon">Errors</span>
              <span className="stat-value">{aggregateStats.error}</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="header-actions">
          <button
            className="button primary"
            onClick={() => setShowCreateModal(true)}
            aria-label="Create new Claw agent"
          >
            + New Agent
          </button>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="claw-panel-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search agents..."
            value={filter.searchTerm}
            onChange={e => setFilter(prev => ({ ...prev, searchTerm: e.target.value }))}
            className="search-input"
            aria-label="Search agents"
          />
        </div>

        <div className="filter-buttons">
          <select
            value={filter.state || ''}
            onChange={e => setFilter(prev => ({
              ...prev,
              state: e.target.value ? (e.target.value as ClawState) : undefined
            }))}
            className="filter-select"
            aria-label="Filter by state"
          >
            <option value="">All States</option>
            <option value={ClawState.DORMANT}>Idle</option>
            <option value={ClawState.THINKING}>Thinking</option>
            <option value={ClawState.NEEDS_REVIEW}>Needs Review</option>
            <option value={ClawState.POSTED}>Complete</option>
            <option value={ClawState.ERROR}>Error</option>
          </select>
        </div>

        <div className="view-toggle">
          <button
            className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            List
          </button>
          <button
            className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            Grid
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="claw-panel-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading agents...</p>
          </div>
        ) : filteredClaws.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">No agents found</div>
            <p>No Claw agents match your criteria.</p>
            <button
              className="button secondary"
              onClick={() => setShowCreateModal(true)}
            >
              Create Your First Agent
            </button>
          </div>
        ) : (
          <div className={`claw-list ${viewMode}`}>
            {filteredClaws.map(claw => (
              <ClawListItem
                key={claw.id}
                claw={claw}
                isSelected={selectedClawId === claw.id}
                onSelect={() => setSelectedClawId(claw.id)}
                onTrigger={() => handleTriggerClaw(claw.id)}
                onCancel={() => handleCancelClaw(claw.id)}
                onDelete={() => handleDeleteClaw(claw.id)}
                onApprove={(traceId, approved) => handleApproveClaw(claw.id, traceId, approved)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedClaw && (
        <div className="claw-detail-panel" role="complementary" aria-label="Agent details">
          <div className="detail-header">
            <h3>{selectedClaw.config.name}</h3>
            <button
              className="close-button"
              onClick={() => setSelectedClawId(null)}
              aria-label="Close details"
            >
              Close
            </button>
          </div>

          <div className="detail-content">
            {/* Status */}
            <div className="detail-section">
              <h4>Status</h4>
              <div className="status-indicator">
                <span
                  className="status-dot"
                  style={{ backgroundColor: getStateColor(selectedClaw.state?.clawState) }}
                />
                <span className="status-label">
                  {getStateLabel(selectedClaw.state?.clawState)}
                </span>
              </div>
            </div>

            {/* Purpose */}
            <div className="detail-section">
              <h4>Purpose</h4>
              <p>{selectedClaw.config.purpose}</p>
            </div>

            {/* Configuration */}
            <div className="detail-section">
              <h4>Configuration</h4>
              <dl className="config-list">
                <dt>Model</dt>
                <dd>{selectedClaw.config.model}</dd>
                <dt>Provider</dt>
                <dd>{selectedClaw.config.provider}</dd>
                <dt>Trigger</dt>
                <dd>{selectedClaw.config.trigger.type}</dd>
                <dt>Equipment</dt>
                <dd>{selectedClaw.config.equipment.join(', ')}</dd>
              </dl>
            </div>

            {/* Stats */}
            {selectedClaw.state?.stats && (
              <div className="detail-section">
                <h4>Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Executions</span>
                    <span className="stat-value">{selectedClaw.state.stats.executions}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Success Rate</span>
                    <span className="stat-value">
                      {selectedClaw.state.stats.executions > 0
                        ? `${Math.round((selectedClaw.state.stats.successes / selectedClaw.state.stats.executions) * 100)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Avg Time</span>
                    <span className="stat-value">
                      {selectedClaw.state.stats.avgExecutionTime > 0
                        ? `${selectedClaw.state.stats.avgExecutionTime}ms`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Reasoning Steps */}
            {selectedClaw.state?.reasoningSteps && selectedClaw.state.reasoningSteps.length > 0 && (
              <div className="detail-section">
                <h4>Reasoning</h4>
                <ul className="reasoning-list">
                  {selectedClaw.state.reasoningSteps.map((step, index) => (
                    <li key={index} className="reasoning-step">
                      <span className="step-number">{index + 1}</span>
                      <span className="step-content">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Error */}
            {selectedClaw.state?.error && (
              <div className="detail-section error-section">
                <h4>Error</h4>
                <p className="error-message">{selectedClaw.state.error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="detail-actions">
              {selectedClaw.state?.clawState === ClawState.DORMANT && (
                <button
                  className="button primary"
                  onClick={() => handleTriggerClaw(selectedClaw.id)}
                  disabled={selectedClaw.isLoading}
                >
                  {selectedClaw.isLoading ? 'Starting...' : 'Trigger'}
                </button>
              )}
              {selectedClaw.state?.clawState === ClawState.THINKING && (
                <button
                  className="button secondary"
                  onClick={() => handleCancelClaw(selectedClaw.id)}
                >
                  Cancel
                </button>
              )}
              {selectedClaw.state?.clawState === ClawState.NEEDS_REVIEW && (
                <>
                  <button
                    className="button primary"
                    onClick={() => handleApproveClaw(selectedClaw.id, 'trace-id', true)}
                  >
                    Approve
                  </button>
                  <button
                    className="button danger"
                    onClick={() => handleApproveClaw(selectedClaw.id, 'trace-id', false)}
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                className="button danger"
                onClick={() => handleDeleteClaw(selectedClaw.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-modal-title">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="create-modal-title">Create New Claw Agent</h3>
              <button
                className="close-button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close modal"
              >
                Close
              </button>
            </div>
            <div className="modal-body">
              <p>Agent creation form would go here.</p>
              <button
                className="button primary"
                onClick={() => {
                  onClawCreated?.(`claw-${Date.now()}`);
                  setShowCreateModal(false);
                }}
              >
                Create Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CLAW LIST ITEM COMPONENT
// ============================================================================

interface ClawListItemProps {
  claw: ClawInstance;
  isSelected: boolean;
  onSelect: () => void;
  onTrigger: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onApprove: (traceId: string, approved: boolean) => void;
}

const ClawListItem: React.FC<ClawListItemProps> = ({
  claw,
  isSelected,
  onSelect,
  onTrigger,
  onCancel,
  onDelete,
  onApprove
}) => {
  const stateColor = getStateColor(claw.state?.clawState);
  const stateLabel = getStateLabel(claw.state?.clawState);

  return (
    <div
      className={`claw-list-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* State Indicator */}
      <div
        className="item-state-indicator"
        style={{ backgroundColor: stateColor }}
        title={stateLabel}
      />

      {/* Content */}
      <div className="item-content">
        <div className="item-header">
          <h4 className="item-name">{claw.config.name}</h4>
          <span className="item-model">{claw.config.model}</span>
        </div>

        <p className="item-purpose">{claw.config.purpose}</p>

        {/* Meta */}
        <div className="item-meta">
          <span className="meta-item trigger-type">
            {claw.config.trigger.type}
          </span>
          <span className="meta-item equipment-count">
            {claw.config.equipment.length} slots
          </span>
          <span className="meta-item last-updated">
            {formatRelativeTime(claw.lastUpdated)}
          </span>
        </div>

        {/* Stats */}
        {claw.state?.stats && (
          <div className="item-stats">
            <span className="stat" title="Executions">
              Executions: {claw.state.stats.executions}
            </span>
            <span className="stat" title="Success Rate">
              Success: {claw.state.stats.executions > 0
                ? `${Math.round((claw.state.stats.successes / claw.state.stats.executions) * 100)}%`
                : 'N/A'}
            </span>
          </div>
        )}

        {/* Error */}
        {claw.state?.error && (
          <div className="item-error" title={claw.state.error}>
            Error: {claw.state.error.substring(0, 50)}...
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="item-actions">
        {claw.state?.clawState === ClawState.DORMANT && (
          <button
            className="action-button trigger"
            onClick={e => { e.stopPropagation(); onTrigger(); }}
            disabled={claw.isLoading}
            title="Trigger agent"
          >
            {claw.isLoading ? 'Starting...' : 'Trigger'}
          </button>
        )}
        {claw.state?.clawState === ClawState.THINKING && (
          <button
            className="action-button cancel"
            onClick={e => { e.stopPropagation(); onCancel(); }}
            title="Cancel execution"
          >
            Cancel
          </button>
        )}
        {claw.state?.clawState === ClawState.NEEDS_REVIEW && (
          <>
            <button
              className="action-button approve"
              onClick={e => { e.stopPropagation(); onApprove('trace-id', true); }}
              title="Approve action"
            >
              Approve
            </button>
            <button
              className="action-button reject"
              onClick={e => { e.stopPropagation(); onApprove('trace-id', false); }}
              title="Reject action"
            >
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ClawManagementPanel;
