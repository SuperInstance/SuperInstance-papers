/**
 * RemoteCursors - Render other users' cursors
 *
 * Shows:
 * - Cursor position for each remote user
 * - User name and color
 * - Selection highlighting
 * - Smooth transitions
 */

import React, { useState, useEffect } from 'react';
import { PresenceManager, UserInfo, UserCursor } from '../../collaboration/PresenceManager';
import './RemoteCursors.css';

interface RemoteCursorsProps {
  presenceManager: PresenceManager;
  cellWidth: number;
  cellHeight: number;
  scrollLeft: number;
  scrollTop: number;
  className?: string;
}

interface CursorPosition {
  userId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
  cellRow: number;
  cellCol: number;
  selection?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export const RemoteCursors: React.FC<RemoteCursorsProps> = ({
  presenceManager,
  cellWidth,
  cellHeight,
  scrollLeft,
  scrollTop,
  className = '',
}) => {
  const [cursors, setCursors] = useState<CursorPosition[]>([]);

  useEffect(() => {
    // Initial load
    updateCursors();

    // Subscribe to cursor changes
    const unsubscribe = presenceManager.onCursorChange(() => {
      updateCursors();
    });

    return () => {
      unsubscribe();
    };
  }, [presenceManager, cellWidth, cellHeight]);

  const updateCursors = () => {
    const users = presenceManager.getRemoteUsers();
    const positions: CursorPosition[] = [];

    users.forEach(user => {
      if (user.cursor) {
        const cursor = user.cursor;
        const x = cursor.col * cellWidth;
        const y = cursor.row * cellHeight;

        const position: CursorPosition = {
          userId: user.id,
          userName: user.name,
          color: user.color,
          x,
          y,
          cellRow: cursor.row,
          cellCol: cursor.col,
        };

        // Calculate selection if present
        if (cursor.selection) {
          const sel = cursor.selection;
          const startCol = Math.min(sel.startCol, sel.endCol);
          const endCol = Math.max(sel.startCol, sel.endCol);
          const startRow = Math.min(sel.startRow, sel.endRow);
          const endRow = Math.max(sel.startRow, sel.endRow);

          position.selection = {
            left: startCol * cellWidth,
            top: startRow * cellHeight,
            width: (endCol - startCol + 1) * cellWidth,
            height: (endRow - startRow + 1) * cellHeight,
          };
        }

        positions.push(position);
      }
    });

    setCursors(positions);
  };

  const isVisible = (cursor: CursorPosition): boolean => {
    // Check if cursor is visible in viewport
    return (
      cursor.x >= scrollLeft &&
      cursor.x <= scrollLeft + window.innerWidth &&
      cursor.y >= scrollTop &&
      cursor.y <= scrollTop + window.innerHeight
    );
  };

  return (
    <div className={`remote-cursors ${className}`}>
      {cursors.map(cursor => (
        isVisible(cursor) && (
          <React.Fragment key={cursor.userId}>
            {/* Selection highlight */}
            {cursor.selection && (
              <div
                className="cursor-selection"
                style={{
                  left: cursor.selection.left - scrollLeft,
                  top: cursor.selection.top - scrollTop,
                  width: cursor.selection.width,
                  height: cursor.selection.height,
                  backgroundColor: cursor.color + '20', // 20 hex = low opacity
                  border: `2px solid ${cursor.color}`,
                }}
              />
            )}

            {/* Cursor */}
            <div
              className="remote-cursor"
              style={{
                left: cursor.x - scrollLeft,
                top: cursor.y - scrollTop,
                borderColor: cursor.color,
              }}
            >
              {/* Cursor pointer */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))',
                }}
              >
                <path
                  d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L5.85 2.85a.5.5 0 0 0-.35.36z"
                  fill={cursor.color}
                  stroke="white"
                  strokeWidth="1"
                />
              </svg>

              {/* User name tag */}
              <div
                className="cursor-name-tag"
                style={{
                  backgroundColor: cursor.color,
                  color: 'white',
                  left: 20,
                  top: 20,
                }}
              >
                {cursor.userName}
              </div>
            </div>
          </React.Fragment>
        )
      ))}
    </div>
  );
};

export default RemoteCursors;
