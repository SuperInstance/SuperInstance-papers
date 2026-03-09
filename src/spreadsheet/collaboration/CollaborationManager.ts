/**
 * CollaborationManager - WebSocket-based Yjs synchronization
 *
 * Provides:
 * - WebSocket connection to Yjs server
 * - Document synchronization
 * - Awareness for user presence
 * - Cursor position sharing
 * - Selection broadcasting
 * - Reconnection handling
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';
import { YjsDocument } from './YjsDocument';
import { PresenceManager } from './PresenceManager';

export interface UserCursor {
  row: number;
  col: number;
  selection?: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  };
}

export interface UserState {
  user: {
    name: string;
    id: string;
    color: string;
    avatar?: string;
  };
  cursor?: UserCursor;
  status: 'online' | 'idle' | 'away' | 'editing';
  lastActivity: number;
}

export interface CollaborationConfig {
  websocketUrl: string;
  documentId: string;
  userId: string;
  userName: string;
  userColor?: string;
  reconnect?: boolean;
  connect?: boolean;
}

export class CollaborationManager {
  private ydoc: YjsDocument;
  private provider: WebsocketProvider;
  private awareness: Awareness;
  private presenceManager: PresenceManager;
  private config: CollaborationConfig;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor(config: CollaborationConfig) {
    this.config = config;
    this.ydoc = new YjsDocument(config.documentId);

    // Initialize WebSocket provider
    this.provider = new WebsocketProvider(
      config.websocketUrl,
      config.documentId,
      this.ydoc.getDocument(),
      {
        connect: config.connect !== false,
        disableSync: false,
      }
    );

    this.awareness = this.provider.awareness;

    // Initialize presence manager
    this.presenceManager = new PresenceManager(this.awareness);

    // Set up event handlers
    this.setupEventHandlers();

    // Set local user state
    this.setLocalUserState();
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    // Connection status
    this.provider.on('status', (event: { status: string }) => {
      this.connected = event.status === 'connected';
      this.emit('connection-status', event.status);

      if (this.connected) {
        this.reconnectAttempts = 0;
        this.emit('connected');
      } else {
        this.emit('disconnected');
        this.handleReconnect();
      }
    });

    // Connection error
    this.provider.on('connection-error', (error: Error) => {
      this.emit('connection-error', error);
    });

    // Sync status
    this.provider.on('sync', (event: { sync: boolean }) => {
      this.emit('sync-status', event.sync);
      if (event.sync) {
        this.emit('synced');
      }
    });

    // Awareness changes (user presence, cursors)
    this.awareness.on('change', () => {
      this.emit('awareness-change', this.presenceManager.getAllUsers());
    });

    // Document changes
    this.ydoc.subscribeToDocument((events, transaction) => {
      this.emit('document-change', { events, transaction });
    });
  }

  /**
   * Set local user state
   */
  private setLocalUserState(): void {
    const state: UserState = {
      user: {
        name: this.config.userName,
        id: this.config.userId,
        color: this.config.userColor || this.generateColor(),
      },
      status: 'online',
      lastActivity: Date.now(),
    };

    this.awareness.setLocalStateField('user', state.user);
    this.awareness.setLocalStateField('status', state.status);
    this.awareness.setLocalStateField('lastActivity', state.lastActivity);
  }

  /**
   * Generate random color for user
   */
  private generateColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B739', '#52B788', '#FF6F91', '#6C5B7B'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Handle reconnection
   */
  private handleReconnect(): void {
    if (this.config.reconnect === false) {
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      setTimeout(() => {
        this.emit('reconnecting', {
          attempt: this.reconnectAttempts,
          maxAttempts: this.maxReconnectAttempts,
        });

        this.provider.connect();
      }, delay);
    } else {
      this.emit('reconnect-failed');
    }
  }

  /**
   * Update cursor position
   */
  updateCursor(cursor: UserCursor): void {
    this.awareness.setLocalStateField('cursor', cursor);
    this.awareness.setLocalStateField('status', 'editing');
    this.awareness.setLocalStateField('lastActivity', Date.now());
  }

  /**
   * Clear cursor position
   */
  clearCursor(): void {
    this.awareness.setLocalStateField('cursor', null);
    this.awareness.setLocalStateField('status', 'online');
  }

  /**
   * Update user status
   */
  updateStatus(status: UserState['status']): void {
    this.awareness.setLocalStateField('status', status);
    this.awareness.setLocalStateField('lastActivity', Date.now());
  }

  /**
   * Get presence manager
   */
  getPresenceManager(): PresenceManager {
    return this.presenceManager;
  }

  /**
   * Get Yjs document
   */
  getDocument(): YjsDocument {
    return this.ydoc;
  }

  /**
   * Get awareness instance
   */
  getAwareness(): Awareness {
    return this.awareness;
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Manually connect
   */
  connect(): void {
    this.provider.connect();
  }

  /**
   * Manually disconnect
   */
  disconnect(): void {
    this.provider.disconnect();
  }

  /**
   * Get WebSocket provider
   */
  getProvider(): WebsocketProvider {
    return this.provider;
  }

  /**
   * Subscribe to events
   */
  on(event: string, callback: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Unsubscribe from event
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Broadcast message to other clients
   */
  broadcast(message: any): void {
    this.provider.ws.send(JSON.stringify({
      type: 'broadcast',
      data: message,
    }));
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId: string, message: any): void {
    this.provider.ws.send(JSON.stringify({
      type: 'direct',
      to: userId,
      data: message,
    }));
  }

  /**
   * Get current user state
   */
  getLocalUserState(): UserState {
    return this.awareness.getLocalState() as UserState;
  }

  /**
   * Get all remote users
   */
  getRemoteUsers(): Map<number, UserState> {
    const states = this.awareness.getStates();
    const remoteUsers = new Map();

    states.forEach((state, clientId) => {
      if (clientId !== this.awareness.clientID) {
        remoteUsers.set(clientId, state as UserState);
      }
    });

    return remoteUsers;
  }

  /**
   * Destroy collaboration manager
   */
  destroy(): void {
    // Remove local state from awareness
    this.awareness.setLocalState(null);

    // Disconnect provider
    this.provider.disconnect();

    // Destroy document
    this.ydoc.destroy();

    // Clear event listeners
    this.eventListeners.clear();

    // Destroy presence manager
    this.presenceManager.destroy();
  }

  /**
   * Get sync progress
   */
  getSyncProgress(): number {
    return this.provider.synced ? 1 : 0;
  }

  /**
   * Force sync
   */
  async sync(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.provider.synced) {
        resolve();
        return;
      }

      const onSync = (event: { sync: boolean }) => {
        if (event.sync) {
          this.provider.off('sync', onSync);
          resolve();
        }
      };

      this.provider.on('sync', onSync);

      // Timeout after 30 seconds
      setTimeout(() => {
        this.provider.off('sync', onSync);
        reject(new Error('Sync timeout'));
      }, 30000);
    });
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): {
    connected: boolean;
    synced: boolean;
    clientId: number;
    userCount: number;
  } {
    return {
      connected: this.connected,
      synced: this.provider.synced,
      clientId: this.awareness.clientID,
      userCount: this.awareness.getStates().size,
    };
  }
}
