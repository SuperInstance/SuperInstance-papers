/**
 * POLLN Spreadsheet Backend - WebSocket Session Manager
 *
 * Manages active WebSocket connections, user presence tracking,
 * connection metadata, session timeout handling, and graceful disconnects.
 *
 * Features:
 * - Track active connections
 * - User presence tracking
 * - Connection metadata management
 * - Session timeout handling
 * - Graceful disconnect notifications
 * - Multi-connection support per user
 *
 * Performance: O(1) lookup, O(log n) iteration
 */

import { EventEmitter } from 'events';
import { AuthService } from '../../auth/AuthService.js';
import { WSConnectionContext } from './WSAuthMiddleware.js';

/**
 * Session information
 */
export interface WSSession {
  sessionId: string;
  userId: string;
  username: string;
  role: string;
  ipAddress: string;
  userAgent?: string;
  connectedAt: number;
  lastActivity: number;
  metadata: Record<string, unknown>;
}

/**
 * User presence information
 */
export interface UserPresence {
  userId: string;
  username: string;
  role: string;
  connections: string[]; // Session IDs
  firstConnectedAt: number;
  lastActivity: number;
  status: 'online' | 'away' | 'offline';
}

/**
 * Session manager configuration
 */
export interface WSSessionManagerConfig {
  // Session timeout (milliseconds of inactivity)
  sessionTimeout: number;
  // Away timeout (milliseconds before marking as away)
  awayTimeout: number;
  // Enable presence tracking
  enablePresence: boolean;
  // Maximum connections per user
  maxConnectionsPerUser: number;
  // Grace period for disconnect (milliseconds)
  disconnectGracePeriod: number;
}

/**
 * WebSocket session manager
 *
 * Tracks all active WebSocket connections, manages user presence,
 * handles session timeouts, and coordinates graceful disconnects.
 */
export class WSSessionManager extends EventEmitter {
  private config: Required<WSSessionManagerConfig>;
  private authService: AuthService;
  private sessions: Map<string, WSSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map(); // userId -> sessionIds
  private userPresence: Map<string, UserPresence> = new Map();
  private disconnectingSessions: Map<string, NodeJS.Timeout> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(authService: AuthService, config: Partial<WSSessionManagerConfig> = {}) {
    super();

    this.authService = authService;
    this.config = {
      sessionTimeout: config.sessionTimeout || 3600000, // 1 hour
      awayTimeout: config.awayTimeout || 300000, // 5 minutes
      enablePresence: config.enablePresence !== false,
      maxConnectionsPerUser: config.maxConnectionsPerUser || 10,
      disconnectGracePeriod: config.disconnectGracePeriod || 5000, // 5 seconds
    };

    this.startCleanup();
  }

  /**
   * Register new connection
   */
  async registerConnection(context: WSConnectionContext): Promise<void> {
    const session: WSSession = {
      sessionId: context.sessionId,
      userId: context.userId,
      username: context.username,
      role: context.role,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      connectedAt: context.connectedAt,
      lastActivity: context.lastActivity,
      metadata: {},
    };

    // Check connection limit
    const userSessionCount = this.userSessions.get(context.userId)?.size || 0;
    if (userSessionCount >= this.config.maxConnectionsPerUser) {
      throw new Error(
        `Maximum connections per user exceeded (${this.config.maxConnectionsPerUser})`
      );
    }

    // Store session
    this.sessions.set(session.sessionId, session);

    // Update user sessions mapping
    if (!this.userSessions.has(context.userId)) {
      this.userSessions.set(context.userId, new Set());
    }
    this.userSessions.get(context.userId)!.add(session.sessionId);

    // Update presence
    if (this.config.enablePresence) {
      this.updatePresence(session);
    }

    this.emit('connectionRegistered', session);
  }

  /**
   * Unregister connection (graceful disconnect)
   */
  async unregisterConnection(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Remove from sessions map
    this.sessions.delete(sessionId);

    // Update user sessions mapping
    const userSessionIds = this.userSessions.get(session.userId);
    if (userSessionIds) {
      userSessionIds.delete(sessionId);
      if (userSessionIds.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    // Update presence
    if (this.config.enablePresence) {
      this.updatePresenceAfterDisconnect(session);
    }

    this.emit('connectionUnregistered', session);
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const now = Date.now();
    session.lastActivity = now;

    // Update presence status
    if (this.config.enablePresence) {
      const presence = this.userPresence.get(session.userId);
      if (presence) {
        presence.lastActivity = now;
        presence.status = 'online';
      }
    }

    this.emit('activityUpdated', session);
  }

  /**
   * Update session metadata
   */
  async updateMetadata(sessionId: string, metadata: Record<string, unknown>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.metadata = { ...session.metadata, ...metadata };
    this.emit('metadataUpdated', session);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): WSSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for user
   */
  getUserSessions(userId: string): WSSession[] {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) {
      return [];
    }

    const sessions: WSSession[] = [];
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Get active session count for user
   */
  getUserSessionCount(userId: string): number {
    return this.userSessions.get(userId)?.size || 0;
  }

  /**
   * Validate session (check if user has active sessions)
   */
  async validateSession(userId: string): Promise<boolean> {
    const sessionCount = this.getUserSessionCount(userId);
    return sessionCount > 0;
  }

  /**
   * Update user presence
   */
  private updatePresence(session: WSSession): void {
    const presence = this.userPresence.get(session.userId);

    if (presence) {
      // Update existing presence
      presence.connections.push(session.sessionId);
      presence.lastActivity = session.lastActivity;
      presence.status = 'online';
    } else {
      // Create new presence
      this.userPresence.set(session.userId, {
        userId: session.userId,
        username: session.username,
        role: session.role,
        connections: [session.sessionId],
        firstConnectedAt: session.connectedAt,
        lastActivity: session.lastActivity,
        status: 'online',
      });
    }

    this.emit('presenceUpdated', this.userPresence.get(session.userId));
  }

  /**
   * Update presence after disconnect
   */
  private updatePresenceAfterDisconnect(session: WSSession): void {
    const presence = this.userPresence.get(session.userId);
    if (!presence) {
      return;
    }

    // Remove session from connections
    const connectionIndex = presence.connections.indexOf(session.sessionId);
    if (connectionIndex !== -1) {
      presence.connections.splice(connectionIndex, 1);
    }

    // Update or remove presence based on remaining connections
    if (presence.connections.length === 0) {
      this.userPresence.delete(session.userId);
      this.emit('presenceOffline', presence);
    } else {
      presence.lastActivity = session.lastActivity;
      this.emit('presenceUpdated', presence);
    }
  }

  /**
   * Get user presence
   */
  getUserPresence(userId: string): UserPresence | undefined {
    return this.userPresence.get(userId);
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): UserPresence[] {
    return Array.from(this.userPresence.values());
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    uniqueUsers: number;
    totalConnections: number;
    averageConnectionsPerUser: number;
    presenceCount: number;
  } {
    const uniqueUsers = this.userSessions.size;
    const totalConnections = this.sessions.size;
    const averageConnectionsPerUser =
      uniqueUsers > 0 ? totalConnections / uniqueUsers : 0;

    return {
      totalSessions: this.sessions.size,
      uniqueUsers,
      totalConnections,
      averageConnectionsPerUser,
      presenceCount: this.userPresence.size,
    };
  }

  /**
   * Disconnect all sessions for user
   */
  async disconnectUser(userId: string, reason?: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) {
      return;
    }

    const disconnectPromises: Promise<void>[] = [];

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session) {
        disconnectPromises.push(
          new Promise<void>(resolve => {
            this.emit('disconnectSession', session, reason);
            resolve();
          })
        );
      }
    }

    await Promise.all(disconnectPromises);
  }

  /**
   * Disconnect specific session
   */
  async disconnectSession(sessionId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    this.emit('disconnectSession', session, reason);
  }

  /**
   * Broadcast message to all user's sessions
   */
  broadcastToUser(userId: string, message: unknown): void {
    const sessions = this.getUserSessions(userId);

    for (const session of sessions) {
      this.emit('broadcastToSession', session.sessionId, message);
    }
  }

  /**
   * Broadcast message to all sessions
   */
  broadcastToAll(message: unknown): void {
    for (const session of this.sessions.values()) {
      this.emit('broadcastToSession', session.sessionId, message);
    }
  }

  /**
   * Broadcast to users by role
   */
  broadcastToRole(role: string, message: unknown): void {
    for (const session of this.sessions.values()) {
      if (session.role === role) {
        this.emit('broadcastToSession', session.sessionId, message);
      }
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Cleanup inactive sessions
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      // Check for session timeout
      if (now - session.lastActivity > this.config.sessionTimeout) {
        console.log(`[WSSessionManager] Session timeout: ${sessionId}`);
        this.emit('sessionTimeout', session);
        this.unregisterConnection(sessionId);
        continue;
      }

      // Check for away status
      if (this.config.enablePresence && now - session.lastActivity > this.config.awayTimeout) {
        const presence = this.userPresence.get(session.userId);
        if (presence && presence.status === 'online') {
          presence.status = 'away';
          this.emit('presenceUpdated', presence);
        }
      }
    }
  }

  /**
   * Shutdown session manager
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Clear disconnect timers
    for (const timer of this.disconnectingSessions.values()) {
      clearTimeout(timer);
    }
    this.disconnectingSessions.clear();

    // Emit shutdown event
    this.emit('shutdown');

    this.removeAllListeners();
  }

  /**
   * Get session manager configuration
   */
  getConfig(): Required<WSSessionManagerConfig> {
    return { ...this.config };
  }
}

/**
 * Create session manager instance
 */
export function createWSSessionManager(
  authService: AuthService,
  config?: Partial<WSSessionManagerConfig>
): WSSessionManager {
  return new WSSessionManager(authService, config);
}

export default WSSessionManager;
