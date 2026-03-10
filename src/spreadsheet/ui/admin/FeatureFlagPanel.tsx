/**
 * FeatureFlagPanel - Admin dashboard for managing feature flags
 *
 * Provides:
 * - Flag listing and filtering
 * - Flag creation and editing
 * - Rollout management
 * - Kill switch controls
 * - Real-time flag evaluation stats
 */

import React, { useState, useEffect } from 'react';
import {
  FlagDefinition,
  FlagState,
  FlagType
} from '../../backend/features/FeatureFlagManager.js';

/**
 * Flag display data
 */
interface FlagDisplayData extends FlagDefinition {
  evaluationRate?: number;
  trueRate?: number;
  avgEvalTime?: number;
}

/**
 * Panel props
 */
interface FeatureFlagPanelProps {
  flags: FlagDisplayData[];
  onCreateFlag: (flag: Omit<FlagDefinition, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateFlag: (flagId: string, updates: Partial<FlagDefinition>) => void;
  onDeleteFlag: (flagId: string) => void;
  onEnableFlag: (flagId: string) => void;
  onDisableFlag: (flagId: string) => void;
  onEnableKillSwitch: (flagId: string, reason?: string) => void;
  onDisableKillSwitch: (flagId: string) => void;
  filters?: {
    environment?: string;
    state?: FlagState;
    type?: FlagType;
    search?: string;
  };
  onFilterChange?: (filters: FeatureFlagPanelProps['filters']) => void;
}

/**
 * Flag state badge color
 */
const getStateColor = (state: FlagState): string => {
  switch (state) {
    case FlagState.ENABLED:
      return 'bg-green-100 text-green-800';
    case FlagState.DISABLED:
      return 'bg-gray-100 text-gray-800';
    case FlagState.ROLLOUT:
      return 'bg-blue-100 text-blue-800';
    case FlagState.EXPERIMENT:
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Flag type badge color
 */
const getTypeColor = (type: FlagType): string => {
  switch (type) {
    case FlagType.BOOLEAN:
      return 'bg-gray-100 text-gray-800';
    case FlagType.PERCENTAGE:
      return 'bg-blue-100 text-blue-800';
    case FlagType.EXPERIMENT:
      return 'bg-purple-100 text-purple-800';
    case FlagType.MULTIVARIATE:
      return 'bg-indigo-100 text-indigo-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Main FeatureFlagPanel component
 */
export const FeatureFlagPanel: React.FC<FeatureFlagPanelProps> = ({
  flags,
  onCreateFlag,
  onUpdateFlag,
  onDeleteFlag,
  onEnableFlag,
  onDisableFlag,
  onEnableKillSwitch,
  onDisableKillSwitch,
  filters,
  onFilterChange
}) => {
  const [selectedFlag, setSelectedFlag] = useState<FlagDisplayData | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [flagToDelete, setFlagToDelete] = useState<string | null>(null);

  // Filter flags
  const filteredFlags = flags.filter(flag => {
    if (filters?.environment && flag.environment !== filters.environment) {
      return false;
    }
    if (filters?.state && flag.state !== filters.state) {
      return false;
    }
    if (filters?.type && flag.type !== filters.type) {
      return false;
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      return (
        flag.name.toLowerCase().includes(search) ||
        flag.description.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Flag list item
  const FlagListItem: React.FC<{ flag: FlagDisplayData }> = ({ flag }) => (
    <div
      className={`p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer ${
        flag.killSwitchEnabled ? 'border-red-300 bg-red-50' : 'border-gray-200'
      }`}
      onClick={() => setSelectedFlag(flag)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{flag.name}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${getStateColor(flag.state)}`}>
              {flag.state}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(flag.type)}`}>
              {flag.type}
            </span>
            {flag.killSwitchEnabled && (
              <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                KILLED
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{flag.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{flag.environment}</span>
            <span>{flag.evaluationCount?.toLocaleString()} evals</span>
            {flag.rolloutPercentage !== undefined && (
              <span>{flag.rolloutPercentage}% rollout</span>
            )}
            {flag.avgEvalTime && (
              <span>{flag.avgEvalTime.toFixed(2)}ms avg</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {flag.state === FlagState.DISABLED ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEnableFlag(flag.id);
              }}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Enable
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDisableFlag(flag.id);
              }}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Disable
            </button>
          )}
          {!flag.killSwitchEnabled ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const reason = prompt('Enter reason for kill switch:');
                if (reason) {
                  onEnableKillSwitch(flag.id, reason);
                }
              }}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Kill
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDisableKillSwitch(flag.id);
              }}
              className="px-3 py-1 text-sm bg-red-800 text-white rounded hover:bg-red-900"
            >
              Restore
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Flag List */}
      <div className="w-1/2 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Flag
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 p-4 bg-white rounded-lg border">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Environment
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={filters?.environment || 'all'}
                onChange={(e) =>
                  onFilterChange?.({
                    ...filters,
                    environment: e.target.value === 'all' ? undefined : e.target.value
                  })
                }
              >
                <option value="all">All</option>
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={filters?.state || 'all'}
                onChange={(e) =>
                  onFilterChange?.({
                    ...filters,
                    state: e.target.value === 'all' ? undefined : (e.target.value as FlagState)
                  })
                }
              >
                <option value="all">All</option>
                <option value={FlagState.ENABLED}>Enabled</option>
                <option value={FlagState.DISABLED}>Disabled</option>
                <option value={FlagState.ROLLOUT}>Rollout</option>
                <option value={FlagState.EXPERIMENT}>Experiment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={filters?.type || 'all'}
                onChange={(e) =>
                  onFilterChange?.({
                    ...filters,
                    type: e.target.value === 'all' ? undefined : (e.target.value as FlagType)
                  })
                }
              >
                <option value="all">All</option>
                <option value={FlagType.BOOLEAN}>Boolean</option>
                <option value={FlagType.PERCENTAGE}>Percentage</option>
                <option value={FlagType.EXPERIMENT}>Experiment</option>
                <option value={FlagType.MULTIVARIATE}>Multivariate</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="Search flags..."
                value={filters?.search || ''}
                onChange={(e) =>
                  onFilterChange?.({ ...filters, search: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* Flag List */}
        <div className="space-y-4">
          {filteredFlags.map((flag) => (
            <FlagListItem key={flag.id} flag={flag} />
          ))}
          {filteredFlags.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No flags found. Create your first flag to get started.
            </div>
          )}
        </div>
      </div>

      {/* Flag Details */}
      <div className="w-1/2 p-6 border-l overflow-y-auto bg-white">
        {selectedFlag ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{selectedFlag.name}</h2>
              <button
                onClick={() => {
                  setFlagToDelete(selectedFlag.id);
                  setShowDeleteConfirm(true);
                }}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <p className="text-gray-900">{selectedFlag.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Environment
                </label>
                <p className="text-gray-900">{selectedFlag.environment}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <span className={`px-2 py-1 text-sm rounded-full ${getTypeColor(selectedFlag.type)}`}>
                  {selectedFlag.type}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <span className={`px-2 py-1 text-sm rounded-full ${getStateColor(selectedFlag.state)}`}>
                  {selectedFlag.state}
                </span>
              </div>

              {selectedFlag.rolloutPercentage !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rollout Percentage
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-blue-600 h-4 rounded-full"
                        style={{ width: `${selectedFlag.rolloutPercentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {selectedFlag.rolloutPercentage}%
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statistics
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-2xl font-bold">
                      {selectedFlag.evaluationCount?.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Evaluations</div>
                  </div>
                  {selectedFlag.avgEvalTime && (
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-2xl font-bold">
                        {selectedFlag.avgEvalTime.toFixed(2)}ms
                      </div>
                      <div className="text-sm text-gray-600">Avg Time</div>
                    </div>
                  )}
                </div>
              </div>

              {selectedFlag.killSwitchReason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kill Switch Reason
                  </label>
                  <p className="text-red-600">{selectedFlag.killSwitchReason}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedFlag.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-sm bg-gray-100 text-gray-800 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Select a flag to view details
          </div>
        )}
      </div>

      {/* Create Flag Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Create Feature Flag</h2>
            <FlagEditor
              onSave={(flag) => {
                onCreateFlag(flag);
                setShowCreateModal(false);
              }}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Delete Flag</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this flag? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (flagToDelete) {
                    onDeleteFlag(flagToDelete);
                    setShowDeleteConfirm(false);
                    setSelectedFlag(null);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * FlagEditor component for creating/editing flags
 */
interface FlagEditorProps {
  flag?: FlagDefinition;
  onSave: (flag: Omit<FlagDefinition, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const FlagEditor: React.FC<FlagEditorProps> = ({ flag, onSave, onCancel }) => {
  const [name, setName] = useState(flag?.name || '');
  const [description, setDescription] = useState(flag?.description || '');
  const [type, setType] = useState<FlagType>(flag?.type || FlagType.BOOLEAN);
  const [environment, setEnvironment] = useState(flag?.environment || 'development');
  const [defaultValue, setDefaultValue] = useState(flag?.defaultValue || false);
  const [rolloutPercentage, setRolloutPercentage] = useState(flag?.rolloutPercentage || 0);
  const [tags, setTags] = useState(flag?.tags?.join(', ') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      name,
      description,
      type,
      state: FlagState.DISABLED,
      createdBy: 'admin',
      environment,
      defaultValue,
      rolloutPercentage: type === FlagType.PERCENTAGE ? rolloutPercentage : undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      rules: [],
      killSwitchEnabled: false
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name *
        </label>
        <input
          type="text"
          required
          className="w-full border rounded px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., new_dashboard_ui"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <textarea
          required
          className="w-full border rounded px-3 py-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this flag controls..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <select
            className="w-full border rounded px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as FlagType)}
          >
            <option value={FlagType.BOOLEAN}>Boolean</option>
            <option value={FlagType.PERCENTAGE}>Percentage</option>
            <option value={FlagType.EXPERIMENT}>Experiment</option>
            <option value={FlagType.MULTIVARIATE}>Multivariate</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Environment *
          </label>
          <select
            className="w-full border rounded px-3 py-2"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
          >
            <option value="development">Development</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
          </select>
        </div>
      </div>

      {type === FlagType.PERCENTAGE && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rollout Percentage: {rolloutPercentage}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            className="w-full"
            value={rolloutPercentage}
            onChange={(e) => setRolloutPercentage(parseInt(e.target.value))}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g., ui, beta, experiment-123"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Flag
        </button>
      </div>
    </form>
  );
};
