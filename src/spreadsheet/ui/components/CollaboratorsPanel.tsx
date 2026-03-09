/**
 * CollaboratorsPanel - Display active collaborators
 *
 * Shows:
 * - List of active users
 * - User status (online, idle, away, editing)
 * - User avatars and colors
 * - Click to see user details
 */

import React, { useState, useEffect } from 'react';
import { PresenceManager, UserInfo } from '../../collaboration/PresenceManager';
import './CollaboratorsPanel.css';

interface CollaboratorsPanelProps {
  presenceManager: PresenceManager;
  onUserClick?: (user: UserInfo) => void;
  className?: string;
}

export const CollaboratorsPanel: React.FC<CollaboratorsPanelProps> = ({
  presenceManager,
  onUserClick,
  className = '',
}) => {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [summary, setSummary] = useState(presenceManager.getPresenceSummary());

  useEffect(() => {
    // Initial load
    setUsers(presenceManager.getAllUsers());

    // Subscribe to changes
    const unsubscribe = presenceManager.onUserChange(
      (currentUsers, joined, left) => {
        setUsers(currentUsers);
        setSummary(presenceManager.getPresenceSummary());
      }
    );

    return () => {
      unsubscribe();
    };
  }, [presenceManager]);

  const handleUserClick = (user: UserInfo) => {
    if (onUserClick) {
      onUserClick(user);
    }
  };

  const getStatusIcon = (status: UserInfo['status']): string => {
    switch (status) {
      case 'online':
        return '●';
      case 'idle':
        return '○';
      case 'away':
        return '◐';
      case 'editing':
        return '◍';
      default:
        return '●';
    }
  };

  const getStatusColor = (status: UserInfo['status']): string => {
    switch (status) {
      case 'online':
        return '#4CAF50';
      case 'idle':
        return '#FFC107';
      case 'away':
        return '#9E9E9E';
      case 'editing':
        return '#2196F3';
      default:
        return '#4CAF50';
    }
  };

  return (
    <div className={`collaborators-panel ${className}`}>
      <div className="collaborators-header">
        <h3>Collaborators</h3>
        <span className="collaborators-count">{summary.online}</span>
      </div>

      <div className="collaborators-list">
        {users.map(user => (
          <div
            key={user.id}
            className="collaborator-item"
            onClick={() => handleUserClick(user)}
            style={{ borderLeftColor: user.color }}
          >
            <div className="collaborator-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <div
                  className="collaborator-initials"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
              )}
              <span
                className="collaborator-status"
                style={{ color: getStatusColor(user.status) }}
              >
                {getStatusIcon(user.status)}
              </span>
            </div>

            <div className="collaborator-info">
              <div className="collaborator-name">{user.name}</div>
              <div className="collaborator-status-text">
                {user.status.toLowerCase()}
              </div>
            </div>

            {user.cursor && (
              <div className="collaborator-cursor">
                {String.fromCharCode(65 + (user.cursor.col || 0))}
                {user.cursor.row + 1}
              </div>
            )}
          </div>
        ))}
      </div>

      {summary.idle > 0 && (
        <div className="collaborators-summary">
          <span className="summary-idle">{summary.idle} idle</span>
          {summary.away > 0 && (
            <span className="summary-away">{summary.away} away</span>
          )}
        </div>
      )}
    </div>
  );
};

export default CollaboratorsPanel;
