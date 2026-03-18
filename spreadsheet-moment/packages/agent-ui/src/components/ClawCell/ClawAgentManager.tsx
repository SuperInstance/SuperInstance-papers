/**
 * Claw Agent Manager Component
 *
 * Full management UI for Claw agents with creation, editing,
 * monitoring, and control capabilities.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  ClawAgentStatus,
  ClawManagementPanelProps,
  ClawCellConfiguration,
  ClawState
} from './types';
import { ClawCellConfig } from './ClawCellConfig';

/**
 * Get state color
 */
function getStateColor(state: ClawState): string {
  switch (state) {
    case ClawState.DORMANT:
      return '#718096';
    case ClawState.THINKING:
      return '#9f7aea';
    case ClawState.NEEDS_REVIEW:
      return '#ecc94b';
    case ClawState.POSTED:
      return '#48bb78';
    case ClawState.ARCHIVED:
      return '#a0aec0';
    case ClawState.ERROR:
      return '#e53e3e';
    default:
      return '#718096';
  }
}

/**
 * Get state label
 */
function getStateLabel(state: ClawState): string {
  switch (state) {
    case ClawState.DORMANT:
      return 'Idle';
    case ClawState.THINKING:
      return 'Thinking';
    case ClawState.NEEDS_REVIEW:
      return 'Needs Review';
    case ClawState.POSTED:
      return 'Complete';
    case ClawState.ARCHIVED:
      return 'Archived';
    case ClawState.ERROR:
      return 'Error';
    default:
      return 'Unknown';
  }
}

/**
 * Format time ago
 */
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * ClawManagementPanel Component
 */
export const ClawManagementPanel: React.FC<ClawManagementPanelProps> = ({
  agents,
  selectedId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onTrigger,
  showFilters = true,
  className = ''
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'idle' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Filter agents
   */
  const filteredAgents = useMemo(() => {
    let result = [...agents];

    // Apply state filter
    if (filter !== 'all') {
      switch (filter) {
        case 'active':
          result = result.filter(a =>
            a.state === ClawState.THINKING ||
            a.state === ClawState.NEEDS_REVIEW
          );
          break;
        case 'idle':
          result = result.filter(a => a.state === ClawState.DORMANT);
          break;
        case 'error':
          result = result.filter(a => a.state === ClawState.ERROR);
          break;
      }
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.cellLocation.toLowerCase().includes(query) ||
        a.config.purpose.toLowerCase().includes(query)
      );
    }

    return result;
  }, [agents, filter, searchQuery]);

  /**
   * Get aggregate stats
   */
  const stats = useMemo(() => {
    return {
      total: agents.length,
      active: agents.filter(a =>
        a.state === ClawState.THINKING || a.state === ClawState.NEEDS_REVIEW
      ).length,
      idle: agents.filter(a => a.state === ClawState.DORMANT).length,
      error: agents.filter(a => a.state === ClawState.ERROR).length,
      connected: agents.filter(a => a.isConnected).length
    };
  }, [agents]);

  return (
    <div className={`claw-management-panel ${className}`}>
      {/* Header */}
      <div className="claw-panel-header">
        <h2>Claw Agents</h2>
        <button
          className="button primary"
          onClick={onCreate}
          title="Create new Claw agent"
        >
          + New Agent
        </button>
      </div>

      {/* Stats Bar */}
      <div className="claw-stats-bar">
        <div className="stat-item">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-item active">
          <span className="stat-value">{stats.active}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-item idle">
          <span className="stat-value">{stats.idle}</span>
          <span className="stat-label">Idle</span>
        </div>
        {stats.error > 0 && (
          <div className="stat-item error">
            <span className="stat-value">{stats.error}</span>
            <span className="stat-label">Errors</span>
          </div>
        )}
        <div className="stat-item connected">
          <span className="stat-value">{stats.connected}</span>
          <span className="stat-label">Connected</span>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="claw-filters">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({agents.length})
            </button>
            <button
              className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
            >
              Active ({stats.active})
            </button>
            <button
              className={`filter-tab ${filter === 'idle' ? 'active' : ''}`}
              onClick={() => setFilter('idle')}
            >
              Idle ({stats.idle})
            </button>
            {stats.error > 0 && (
              <button
                className={`filter-tab ${filter === 'error' ? 'active' : ''}`}
                onClick={() => setFilter('error')}
              >
                Errors ({stats.error})
              </button>
            )}
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      )}

      {/* Agent List */}
      <div className="claw-agent-list">
        {filteredAgents.length === 0 ? (
          <div className="empty-state">
            <p>No agents found</p>
            {searchQuery && (
              <button
                className="button secondary"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredAgents.map(agent => (
            <div
              key={agent.id}
              className={`claw-agent-item ${selectedId === agent.id ? 'selected' : ''}`}
              onClick={() => onSelect?.(agent.id)}
            >
              {/* State Indicator */}
              <div
                className="agent-state-indicator"
                style={{ backgroundColor: getStateColor(agent.state) }}
                title={getStateLabel(agent.state)}
              />

              {/* Agent Info */}
              <div className="agent-info">
                <div className="agent-header">
                  <span className="agent-name">{agent.name}</span>
                  <span className="agent-location">{agent.cellLocation}</span>
                </div>

                <div className="agent-purpose">
                  {agent.config.purpose.substring(0, 100)}
                  {agent.config.purpose.length > 100 ? '...' : ''}
                </div>

                <div className="agent-meta">
                  <span className="agent-model">{agent.config.model}</span>
                  <span className="agent-equipment">
                    {agent.config.equipment.length} slots
                  </span>
                  <span className="agent-activity">
                    {formatTimeAgo(agent.lastActivity)}
                  </span>
                </div>
              </div>

              {/* Connection Status */}
              <div
                className={`connection-status ${agent.isConnected ? 'connected' : 'disconnected'}`}
                title={agent.isConnected ? 'Connected' : 'Disconnected'}
              >
                {agent.isConnected ? 'Online' : 'Offline'}
              </div>

              {/* Actions */}
              <div className="agent-actions">
                {onTrigger && agent.state === ClawState.DORMANT && (
                  <button
                    className="action-button trigger"
                    onClick={e => {
                      e.stopPropagation();
                      onTrigger(agent.id);
                    }}
                    title="Trigger agent"
                  >
                    Run
                  </button>
                )}
                {onEdit && (
                  <button
                    className="action-button edit"
                    onClick={e => {
                      e.stopPropagation();
                      onEdit(agent.id);
                    }}
                    title="Edit agent"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    className="action-button delete"
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm('Delete this agent?')) {
                        onDelete(agent.id);
                      }
                    }}
                    title="Delete agent"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Props for ClawAgentManager
 */
export interface ClawAgentManagerProps {
  /** Initial agents */
  initialAgents?: ClawAgentStatus[];

  /** Claw client base URL */
  baseUrl?: string;

  /** Claw client WebSocket URL */
  wsUrl?: string;

  /** API key */
  apiKey?: string;

  /** On agent created */
  onAgentCreated?: (agent: ClawAgentStatus) => void;

  /** On agent updated */
  onAgentUpdated?: (agent: ClawAgentStatus) => void;

  /** On agent deleted */
  onAgentDeleted?: (agentId: string) => void;

  /** Custom class name */
  className?: string;
}

/**
 * ClawAgentManager Component
 *
 * Full-featured manager for Claw agents with real-time updates
 */
export const ClawAgentManager: React.FC<ClawAgentManagerProps> = ({
  initialAgents = [],
  baseUrl = '/api',
  wsUrl,
  apiKey,
  onAgentCreated,
  onAgentUpdated,
  onAgentDeleted,
  className = ''
}) => {
  const [agents, setAgents] = useState<ClawAgentStatus[]>(initialAgents);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [showEditor, setShowEditor] = useState(false);
  const [editingAgent, setEditingAgent] = useState<ClawAgentStatus | undefined>();
  const [config, setConfig] = useState<ClawCellConfiguration | undefined>();

  /**
   * Handle create new agent
   */
  const handleCreate = useCallback(() => {
    setEditingAgent(undefined);
    setConfig(undefined);
    setShowEditor(true);
  }, []);

  /**
   * Handle edit agent
   */
  const handleEdit = useCallback((agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      setEditingAgent(agent);
      setConfig(agent.config);
      setShowEditor(true);
    }
  }, [agents]);

  /**
   * Handle delete agent
   */
  const handleDelete = useCallback(async (agentId: string) => {
    try {
      const response = await fetch(`${baseUrl}/claws/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
        }
      });

      if (response.ok) {
        setAgents(prev => prev.filter(a => a.id !== agentId));
        onAgentDeleted?.(agentId);

        if (selectedAgentId === agentId) {
          setSelectedAgentId(undefined);
        }
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  }, [baseUrl, apiKey, onAgentDeleted, selectedAgentId]);

  /**
   * Handle trigger agent
   */
  const handleTrigger = useCallback(async (agentId: string) => {
    try {
      const response = await fetch(`${baseUrl}/claws/${agentId}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
        }
      });

      if (response.ok) {
        // Update agent state to thinking
        setAgents(prev => prev.map(a =>
          a.id === agentId
            ? { ...a, state: ClawState.THINKING, lastActivity: Date.now() }
            : a
        ));
      }
    } catch (error) {
      console.error('Failed to trigger agent:', error);
    }
  }, [baseUrl, apiKey]);

  /**
   * Handle save config
   */
  const handleSaveConfig = useCallback(async () => {
    if (!config) return;

    try {
      const url = editingAgent
        ? `${baseUrl}/claws/${editingAgent.id}`
        : `${baseUrl}/claws`;

      const response = await fetch(url, {
        method: editingAgent ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({ config })
      });

      if (response.ok) {
        const data = await response.json();

        if (editingAgent) {
          // Update existing agent
          const updatedAgent: ClawAgentStatus = {
            ...editingAgent,
            config,
            lastActivity: Date.now()
          };
          setAgents(prev => prev.map(a =>
            a.id === editingAgent.id ? updatedAgent : a
          ));
          onAgentUpdated?.(updatedAgent);
        } else {
          // Create new agent
          const newAgent: ClawAgentStatus = {
            id: data.clawId || `claw-${Date.now()}`,
            cellLocation: 'A1', // Default, should be provided
            name: config.name,
            state: ClawState.DORMANT,
            config,
            lastActivity: Date.now(),
            isConnected: true
          };
          setAgents(prev => [...prev, newAgent]);
          onAgentCreated?.(newAgent);
        }

        setShowEditor(false);
        setEditingAgent(undefined);
        setConfig(undefined);
      }
    } catch (error) {
      console.error('Failed to save agent:', error);
    }
  }, [config, editingAgent, baseUrl, apiKey, onAgentCreated, onAgentUpdated]);

  /**
   * Handle cancel edit
   */
  const handleCancelEdit = useCallback(() => {
    setShowEditor(false);
    setEditingAgent(undefined);
    setConfig(undefined);
  }, []);

  return (
    <div className={`claw-agent-manager ${className}`}>
      {/* Management Panel */}
      <ClawManagementPanel
        agents={agents}
        selectedId={selectedAgentId}
        onSelect={setSelectedAgentId}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTrigger={handleTrigger}
        showFilters={true}
      />

      {/* Editor Modal */}
      {showEditor && (
        <div className="claw-editor-modal">
          <div className="modal-backdrop" onClick={handleCancelEdit} />
          <div className="modal-content">
            <ClawCellConfig
              config={config}
              onConfigChange={setConfig}
              onSave={handleSaveConfig}
              onCancel={handleCancelEdit}
              showAdvanced={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ClawAgentManager;
