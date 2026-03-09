/**
 * VersionTimeline - Browse version history
 *
 * Provides:
 * - Timeline visualization of snapshots
 * - Branch display and switching
 * - Diff viewing
 * - Rollback capability
 */

import React, { useState, useEffect } from 'react';
import { VersionControl, Snapshot, Branch } from '../../collaboration/VersionControl';
import './VersionTimeline.css';

interface VersionTimelineProps {
  versionControl: VersionControl;
  onRestoreSnapshot?: (snapshotId: string) => void;
  onSwitchBranch?: (branchId: string) => void;
  className?: string;
}

type TimelineTab = 'snapshots' | 'branches' | 'changes';

export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versionControl,
  onRestoreSnapshot,
  onSwitchBranch,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<TimelineTab>('snapshots');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [timeline, setTimeline] = useState<ReturnType<typeof versionControl.getVersionTimeline>>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [compareSnapshot, setCompareSnapshot] = useState<Snapshot | null>(null);
  const [diff, setDiff] = useState<ReturnType<typeof versionControl.compareSnapshots>>([]);

  useEffect(() => {
    loadData();
  }, [versionControl]);

  const loadData = () => {
    setSnapshots(versionControl.getAllSnapshots());
    setBranches(versionControl.getAllBranches());
    setTimeline(versionControl.getVersionTimeline());
  };

  const handleSnapshotClick = (snapshot: Snapshot) => {
    if (selectedSnapshot?.id === snapshot.id) {
      setSelectedSnapshot(null);
    } else {
      setSelectedSnapshot(snapshot);

      // Auto-select previous snapshot for comparison
      const snapshotIndex = snapshots.findIndex(s => s.id === snapshot.id);
      if (snapshotIndex > 0) {
        setCompareSnapshot(snapshots[snapshotIndex - 1]);
      }
    }
  };

  const handleRestore = () => {
    if (selectedSnapshot && onRestoreSnapshot) {
      onRestoreSnapshot(selectedSnapshot.id);
      setSelectedSnapshot(null);
      setCompareSnapshot(null);
    }
  };

  const handleCompare = () => {
    if (selectedSnapshot && compareSnapshot) {
      const diffResult = versionControl.compareSnapshots(
        selectedSnapshot.id,
        compareSnapshot.id
      );
      setDiff(diffResult);
    }
  };

  const handleBranchSwitch = (branch: Branch) => {
    if (onSwitchBranch) {
      onSwitchBranch(branch.id);
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const formatRelativeTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className={`version-timeline ${className}`}>
      {/* Tabs */}
      <div className="timeline-tabs">
        <button
          className={activeTab === 'snapshots' ? 'active' : ''}
          onClick={() => setActiveTab('snapshots')}
        >
          Snapshots ({snapshots.length})
        </button>
        <button
          className={activeTab === 'branches' ? 'active' : ''}
          onClick={() => setActiveTab('branches')}
        >
          Branches ({branches.length})
        </button>
        <button
          className={activeTab === 'changes' ? 'active' : ''}
          onClick={() => setActiveTab('changes')}
        >
          Changes
        </button>
      </div>

      {/* Content */}
      <div className="timeline-content">
        {activeTab === 'snapshots' && (
          <div className="snapshots-list">
            {snapshots.map(snapshot => (
              <div
                key={snapshot.id}
                className={`snapshot-item ${
                  selectedSnapshot?.id === snapshot.id ? 'selected' : ''
                }`}
                onClick={() => handleSnapshotClick(snapshot)}
              >
                <div className="snapshot-header">
                  <span className="snapshot-description">
                    {snapshot.description}
                  </span>
                  <span className="snapshot-time">
                    {formatRelativeTime(snapshot.timestamp)}
                  </span>
                </div>

                <div className="snapshot-meta">
                  <span className="snapshot-user">
                    {snapshot.createdByName}
                  </span>
                  <span className="snapshot-date">
                    {formatDate(snapshot.timestamp)}
                  </span>
                </div>

                {snapshot.tags.length > 0 && (
                  <div className="snapshot-tags">
                    {snapshot.tags.map(tag => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {snapshots.length === 0 && (
              <div className="empty-state">No snapshots yet</div>
            )}
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="branches-list">
            {branches.map(branch => (
              <div
                key={branch.id}
                className="branch-item"
                onClick={() => handleBranchSwitch(branch)}
              >
                <div className="branch-header">
                  <span className="branch-name">{branch.name}</span>
                  <span className="branch-time">
                    {formatRelativeTime(branch.createdAt)}
                  </span>
                </div>

                <div className="branch-meta">
                  <span className="branch-user">
                    {branch.createdByName}
                  </span>
                  <span className="branch-date">
                    {formatDate(branch.createdAt)}
                  </span>
                </div>

                {branch.description && (
                  <div className="branch-description">
                    {branch.description}
                  </div>
                )}
              </div>
            ))}

            {branches.length === 0 && (
              <div className="empty-state">No branches yet</div>
            )}
          </div>
        )}

        {activeTab === 'changes' && (
          <div className="changes-timeline">
            {timeline.map((item, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content-item">
                  <div className="timeline-type">{item.type}</div>
                  <div className="timeline-description">
                    {item.description}
                  </div>
                  <div className="timeline-meta">
                    <span className="timeline-user">{item.userName}</span>
                    <span className="timeline-time">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {timeline.length === 0 && (
              <div className="empty-state">No changes yet</div>
            )}
          </div>
        )}
      </div>

      {/* Selected snapshot actions */}
      {selectedSnapshot && (
        <div className="snapshot-actions">
          <div className="selected-info">
            <strong>Selected:</strong> {selectedSnapshot.description}
          </div>

          <div className="compare-section">
            {compareSnapshot && (
              <div className="compare-info">
                <strong>Compare to:</strong> {compareSnapshot.description}
              </div>
            )}

            <button
              className="compare-button"
              onClick={handleCompare}
              disabled={!compareSnapshot}
            >
              Compare
            </button>
          </div>

          {diff.length > 0 && (
            <div className="diff-results">
              <h4>Differences:</h4>
              {diff.map((d, i) => (
                <div key={i} className={`diff-item diff-${d.type}`}>
                  <span className="diff-cell">{d.cellId}</span>
                  <span className="diff-type">{d.type}</span>
                  {d.oldValue !== undefined && (
                    <span className="diff-old">{String(d.oldValue)}</span>
                  )}
                  {d.newValue !== undefined && (
                    <span className="diff-new">{String(d.newValue)}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <button className="restore-button" onClick={handleRestore}>
            Restore This Snapshot
          </button>
        </div>
      )}
    </div>
  );
};

export default VersionTimeline;
