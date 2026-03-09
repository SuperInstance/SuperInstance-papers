/**
 * ConflictModal - Resolve merge conflicts
 *
 * Provides:
 * - Display conflict information
 * - Choose resolution strategy
 * - Manual merge interface
 * - Preview changes before applying
 */

import React, { useState } from 'react';
import { ConflictInfo, ResolutionStrategy } from '../../collaboration/ConflictResolver';
import './ConflictModal.css';

interface ConflictModalProps {
  conflict: ConflictInfo;
  onResolve: (result: any) => void;
  onDismiss: () => void;
  className?: string;
}

type ResolutionOption = 'local' | 'remote' | 'merge' | 'custom';

export const ConflictModal: React.FC<ConflictModalProps> = ({
  conflict,
  onResolve,
  onDismiss,
  className = '',
}) => {
  const [selectedOption, setSelectedOption] = useState<ResolutionOption>('local');
  const [customValue, setCustomValue] = useState<any>(conflict.localValue);
  const [showPreview, setShowPreview] = useState(false);

  const handleResolve = () => {
    let result: any;

    switch (selectedOption) {
      case 'local':
        result = conflict.localValue;
        break;
      case 'remote':
        result = conflict.remoteValue;
        break;
      case 'merge':
        // Simple merge strategy - in practice, you'd have more sophisticated merging
        result = mergeValues(conflict.localValue, conflict.remoteValue);
        break;
      case 'custom':
        result = customValue;
        break;
    }

    onResolve(result);
  };

  const mergeValues = (local: any, remote: any): any => {
    // Simple merge for objects
    if (typeof local === 'object' && typeof remote === 'object') {
      return { ...local, ...remote };
    }

    // For arrays, concatenate unique values
    if (Array.isArray(local) && Array.isArray(remote)) {
      return [...new Set([...local, ...remote])];
    }

    // For primitives, prefer remote (more recent)
    return remote;
  };

  const getPreviewValue = (): any => {
    switch (selectedOption) {
      case 'local':
        return conflict.localValue;
      case 'remote':
        return conflict.remoteValue;
      case 'merge':
        return mergeValues(conflict.localValue, conflict.remoteValue);
      case 'custom':
        return customValue;
    }
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className={`conflict-modal-overlay ${className}`} onClick={onDismiss}>
      <div
        className="conflict-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="conflict-modal-header">
          <h2>Resolve Conflict</h2>
          <button className="close-button" onClick={onDismiss}>
            ×
          </button>
        </div>

        <div className="conflict-modal-body">
          {/* Conflict info */}
          <div className="conflict-info">
            <div className="conflict-cell">
              <strong>Cell:</strong> {conflict.cellId}
            </div>
            <div className="conflict-type">
              <strong>Type:</strong> {conflict.type}
            </div>
          </div>

          {/* Side-by-side comparison */}
          <div className="conflict-comparison">
            <div className="conflict-side local">
              <h3>Your Changes</h3>
              <div className="conflict-meta">
                <span className="conflict-user">You</span>
                <span className="conflict-time">
                  {formatDate(conflict.localTimestamp)}
                </span>
              </div>
              <pre className="conflict-value">
                {formatValue(conflict.localValue)}
              </pre>
            </div>

            <div className="conflict-divider">vs</div>

            <div className="conflict-side remote">
              <h3>Their Changes</h3>
              <div className="conflict-meta">
                <span
                  className="conflict-user"
                  style={{ color: '#2196F3' }}
                >
                  {conflict.remoteUserId}
                </span>
                <span className="conflict-time">
                  {formatDate(conflict.remoteTimestamp)}
                </span>
              </div>
              <pre className="conflict-value">
                {formatValue(conflict.remoteValue)}
              </pre>
            </div>
          </div>

          {/* Resolution options */}
          <div className="conflict-resolution">
            <h3>Resolution Strategy</h3>

            <div className="resolution-options">
              <label className="resolution-option">
                <input
                  type="radio"
                  name="resolution"
                  value="local"
                  checked={selectedOption === 'local'}
                  onChange={() => setSelectedOption('local')}
                />
                <div className="option-content">
                  <strong>Keep Your Changes</strong>
                  <span>Use your local value</span>
                </div>
              </label>

              <label className="resolution-option">
                <input
                  type="radio"
                  name="resolution"
                  value="remote"
                  checked={selectedOption === 'remote'}
                  onChange={() => setSelectedOption('remote')}
                />
                <div className="option-content">
                  <strong>Keep Their Changes</strong>
                  <span>Use the remote value</span>
                </div>
              </label>

              <label className="resolution-option">
                <input
                  type="radio"
                  name="resolution"
                  value="merge"
                  checked={selectedOption === 'merge'}
                  onChange={() => setSelectedOption('merge')}
                />
                <div className="option-content">
                  <strong>Merge Changes</strong>
                  <span>Combine both values</span>
                </div>
              </label>

              <label className="resolution-option">
                <input
                  type="radio"
                  name="resolution"
                  value="custom"
                  checked={selectedOption === 'custom'}
                  onChange={() => setSelectedOption('custom')}
                />
                <div className="option-content">
                  <strong>Custom Value</strong>
                  <span>Enter your own value</span>
                </div>
              </label>
            </div>

            {/* Custom value input */}
            {selectedOption === 'custom' && (
              <div className="custom-value-input">
                <label>Custom Value:</label>
                <textarea
                  value={formatValue(customValue)}
                  onChange={e => {
                    try {
                      setCustomValue(JSON.parse(e.target.value));
                    } catch {
                      setCustomValue(e.target.value);
                    }
                  }}
                  rows={5}
                />
              </div>
            )}
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="conflict-preview">
              <h3>Preview Result</h3>
              <pre className="preview-value">
                {formatValue(getPreviewValue())}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="conflict-modal-footer">
          <button
            className="preview-button"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>

          <div className="action-buttons">
            <button className="cancel-button" onClick={onDismiss}>
              Cancel
            </button>
            <button className="resolve-button" onClick={handleResolve}>
              Resolve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictModal;
