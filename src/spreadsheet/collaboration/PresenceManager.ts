/**
 * PresenceManager - User presence and cursor tracking
 *
 * Provides:
 * - Track active users
 * - Cursor position with color and name
 * - Idle/away/online status
 * - User info display
 * - Activity monitoring
 */

import { Awareness } from 'y-protocols/awareness';
import { UserState, UserCursor } from './CollaborationManager';

export interface UserInfo {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  status: 'online' | 'idle' | 'away' | 'editing';
  cursor?: UserCursor;
  lastActivity: number;
}

export interface PresenceConfig {
  idleTimeout?: number; // milliseconds before idle
  awayTimeout?: number; // milliseconds before away
  updateInterval?: number; // activity check interval
}

export class PresenceManager {
  private awareness: Awareness;
  private config: Required<PresenceConfig>;
  private activityTimer?: NodeJS.Timeout;
  private lastActivity: number = Date.now();
  private statusChangeListeners: Set<(status: UserInfo['status']) => void> = new Set();

  constructor(
    awareness: Awareness,
    config: PresenceConfig = {}
  ) {
    this.awareness = awareness;
    this.config = {
      idleTimeout: config.idleTimeout || 60000, // 1 minute
      awayTimeout: config.awayTimeout || 300000, // 5 minutes
      updateInterval: config.updateInterval || 10000, // 10 seconds
    };

    this.startActivityMonitoring();
    this.setupAwarenessListener();
  }

  /**
   * Set up awareness change listener
   */
  private setupAwarenessListener(): void {
    this.awareness.on('change', () => {
      // Notify listeners of presence changes
      const users = this.getAllUsers();
      this.notifyStatusChange(users);
    });
  }

  /**
   * Start activity monitoring
   */
  private startActivityMonitoring(): void {
    this.activityTimer = setInterval(() => {
      this.checkActivity();
    }, this.config.updateInterval);
  }

  /**
   * Check user activity and update status
   */
  private checkActivity(): void {
    const now = Date.now();
    const timeSinceActivity = now - this.lastActivity;
    const currentState = this.awareness.getLocalState() as UserState;
    const currentStatus = currentState?.status || 'online';

    let newStatus: UserInfo['status'] = currentStatus;

    if (timeSinceActivity > this.config.awayTimeout) {
      newStatus = 'away';
    } else if (timeSinceActivity > this.config.idleTimeout) {
      newStatus = 'idle';
    } else if (currentStatus !== 'editing') {
      newStatus = 'online';
    }

    if (newStatus !== currentStatus) {
      this.updateStatus(newStatus);
    }
  }

  /**
   * Notify status change listeners
   */
  private notifyStatusChange(users: UserInfo[]): void {
    this.statusChangeListeners.forEach(listener => {
      users.forEach(user => {
        if (user.id === this.getLocalUserId()) {
          listener(user.status);
        }
      });
    });
  }

  /**
   * Get local user ID
   */
  private getLocalUserId(): string {
    const state = this.awareness.getLocalState() as UserState;
    return state?.user?.id || '';
  }

  /**
   * Update cursor position
   */
  updateCursor(cursor: UserCursor): void {
    this.recordActivity();
    this.awareness.setLocalStateField('cursor', cursor);
    this.awareness.setLocalStateField('status', 'editing');
  }

  /**
   * Clear cursor position
   */
  clearCursor(): void {
    this.recordActivity();
    this.awareness.setLocalStateField('cursor', null);
    this.awareness.setLocalStateField('status', 'online');
  }

  /**
   * Update user status
   */
  updateStatus(status: UserInfo['status']): void {
    this.awareness.setLocalStateField('status', status);
    this.awareness.setLocalStateField('lastActivity', Date.now());
  }

  /**
   * Record user activity
   */
  recordActivity(): void {
    this.lastActivity = Date.now();
    this.awareness.setLocalStateField('lastActivity', this.lastActivity);

    // If user was idle or away, bring them back online
    const currentState = this.awareness.getLocalState() as UserState;
    if (currentState?.status === 'idle' || currentState?.status === 'away') {
      this.updateStatus('online');
    }
  }

  /**
   * Get all users
   */
  getAllUsers(): UserInfo[] {
    const states = this.awareness.getStates();
    const users: UserInfo[] = [];

    states.forEach((state, clientId) => {
      const userState = state as UserState;
      if (userState?.user) {
        users.push({
          id: userState.user.id,
          name: userState.user.name,
          color: userState.user.color,
          avatar: userState.user.avatar,
          status: userState.status,
          cursor: userState.cursor,
          lastActivity: userState.lastActivity,
        });
      }
    });

    return users;
  }

  /**
   * Get local user
   */
  getLocalUser(): UserInfo | null {
    const state = this.awareness.getLocalState() as UserState;
    if (!state?.user) {
      return null;
    }

    return {
      id: state.user.id,
      name: state.user.name,
      color: state.user.color,
      avatar: state.user.avatar,
      status: state.status,
      cursor: state.cursor,
      lastActivity: state.lastActivity,
    };
  }

  /**
   * Get remote users (excluding local)
   */
  getRemoteUsers(): UserInfo[] {
    const localId = this.getLocalUserId();
    return this.getAllUsers().filter(user => user.id !== localId);
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): UserInfo | null {
    const users = this.getAllUsers();
    return users.find(user => user.id === userId) || null;
  }

  /**
   * Get users in a specific cell
   */
  getUsersInCell(row: number, col: number): UserInfo[] {
    return this.getAllUsers().filter(user => {
      return user.cursor?.row === row && user.cursor?.col === col;
    });
  }

  /**
   * Get users with selections
   */
  getUsersWithSelections(): Array<UserInfo & { selection: UserCursor['selection'] }> {
    return this.getAllUsers()
      .filter(user => user.cursor?.selection)
      .map(user => ({
        ...user,
        selection: user.cursor!.selection!,
      }));
  }

  /**
   * Get online users
   */
  getOnlineUsers(): UserInfo[] {
    return this.getAllUsers().filter(user => user.status === 'online');
  }

  /**
   * Get idle users
   */
  getIdleUsers(): UserInfo[] {
    return this.getAllUsers().filter(user => user.status === 'idle');
  }

  /**
   * Get away users
   */
  getAwayUsers(): UserInfo[] {
    return this.getAllUsers().filter(user => user.status === 'away');
  }

  /**
   * Get editing users
   */
  getEditingUsers(): UserInfo[] {
    return this.getAllUsers().filter(user => user.status === 'editing');
  }

  /**
   * Get user count
   */
  getUserCount(): number {
    return this.getAllUsers().length;
  }

  /**
   * Get online user count
   */
  getOnlineCount(): number {
    return this.getOnlineUsers().length;
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: UserInfo['status']) => void): () => void {
    this.statusChangeListeners.add(callback);

    return () => {
      this.statusChangeListeners.delete(callback);
    };
  }

  /**
   * Subscribe to cursor changes
   */
  onCursorChange(callback: (users: UserInfo[]) => void): () => void {
    const listener = () => {
      callback(this.getRemoteUsers());
    };

    this.awareness.on('change', listener);

    return () => {
      this.awareness.off('change', listener);
    };
  }

  /**
   * Subscribe to user join/leave
   */
  onUserChange(
    callback: (users: UserInfo[], joined: UserInfo[], left: UserInfo[]) => void
  ): () => void {
    let previousUsers = new Set(this.getAllUsers().map(u => u.id));

    const listener = () => {
      const currentUsers = this.getAllUsers();
      const currentUserIds = new Set(currentUsers.map(u => u.id));

      const joined = currentUsers.filter(u => !previousUsers.has(u.id));
      const left = Array.from(previousUsers)
        .filter(id => !currentUserIds.has(id))
        .map(id => previousUsers.has(id) ? this.getUserById(id) : null)
        .filter(Boolean) as UserInfo[];

      previousUsers = currentUserIds;

      if (joined.length > 0 || left.length > 0) {
        callback(currentUsers, joined, left);
      }
    };

    this.awareness.on('change', listener);

    return () => {
      this.awareness.off('change', listener);
    };
  }

  /**
   * Set user avatar
   */
  setAvatar(avatar: string): void {
    const currentState = this.awareness.getLocalState() as UserState;
    const user = currentState?.user;

    if (user) {
      this.awareness.setLocalStateField('user', {
        ...user,
        avatar,
      });
    }
  }

  /**
   * Set user name
   */
  setUserName(name: string): void {
    const currentState = this.awareness.getLocalState() as UserState;
    const user = currentState?.user;

    if (user) {
      this.awareness.setLocalStateField('user', {
        ...user,
        name,
      });
    }
  }

  /**
   * Set user color
   */
  setUserColor(color: string): void {
    const currentState = this.awareness.getLocalState() as UserState;
    const user = currentState?.user;

    if (user) {
      this.awareness.setLocalStateField('user', {
        ...user,
        color,
      });
    }
  }

  /**
   * Get user presence summary
   */
  getPresenceSummary(): {
    total: number;
    online: number;
    idle: number;
    away: number;
    editing: number;
  } {
    const users = this.getAllUsers();

    return {
      total: users.length,
      online: users.filter(u => u.status === 'online').length,
      idle: users.filter(u => u.status === 'idle').length,
      away: users.filter(u => u.status === 'away').length,
      editing: users.filter(u => u.status === 'editing').length,
    };
  }

  /**
   * Destroy presence manager
   */
  destroy(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }

    this.statusChangeListeners.clear();
  }
}
