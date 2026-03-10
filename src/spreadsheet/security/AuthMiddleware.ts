/**
 * AuthMiddleware - Authentication and Authorization Middleware
 * Defense in depth: Session management, JWT validation, permission checks
 */

import {
  AuthenticationResult,
  AuthorizationResult,
  Permission,
  RequestHandler,
  SecureRequest,
  SecurityContext,
  UserSession,
  SystemRole
} from './types';

/**
 * Authentication middleware for POLLN spreadsheet system
 */
export class AuthMiddleware {
  private sessions: Map<string, UserSession> = new Map();
  private failedAttempts: Map<string, number> = new Map();
  private lockedAccounts: Map<string, Date> = new Map();
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Authenticate a user request
   */
  async authenticate(req: SecureRequest): Promise<AuthenticationResult> {
    const token = this.extractToken(req);

    if (!token) {
      return {
        success: false,
        error: 'No authentication token provided'
      };
    }

    // Check if account is locked
    const userId = this.extractUserIdFromToken(token);
    if (this.isAccountLocked(userId)) {
      return {
        success: false,
        error: 'Account is temporarily locked due to failed attempts'
      };
    }

    try {
      const session = await this.validateSession(token);
      if (!session) {
        await this.recordFailedAttempt(userId);
        return {
          success: false,
          error: 'Invalid or expired token'
        };
      }

      // Update session activity
      session.lastActivity = new Date();
      this.sessions.set(session.sessionId, session);

      // Attach security context to request
      req.securityContext = this.buildSecurityContext(session);
      req.session = session;

      // Clear failed attempts on successful auth
      this.failedAttempts.delete(userId);

      return {
        success: true,
        userId: session.userId,
        token: session.sessionId,
        expiresIn: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
      };
    } catch (error) {
      await this.recordFailedAttempt(userId);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Authorize a request with required permission
   */
  async authorize(
    req: SecureRequest,
    requiredPermission: Permission
  ): Promise<AuthorizationResult> {
    if (!req.securityContext) {
      return {
        granted: false,
        reason: 'No security context found - authenticate first'
      };
    }

    const { userId, permissions } = req.securityContext;

    // Check if user has the required permission
    const hasPermission = this.checkPermission(permissions, requiredPermission);

    if (!hasPermission) {
      return {
        granted: false,
        reason: `User ${userId} lacks permission: ${requiredPermission.action} on ${requiredPermission.resource}`
      };
    }

    // Check permission scope if specified
    if (requiredPermission.scope) {
      const scopeMatch = this.checkScope(permissions, requiredPermission.scope);
      if (!scopeMatch) {
        return {
          granted: false,
          reason: 'Permission scope does not match required scope'
        };
      }
    }

    // Check permission expiration
    const permission = permissions.find(p =>
      p.resource === requiredPermission.resource &&
      p.action === requiredPermission.action
    );

    if (permission?.expiresAt && permission.expiresAt < new Date()) {
      return {
        granted: false,
        reason: 'Permission has expired'
      };
    }

    return {
      granted: true,
      permissions: [permission!]
    };
  }

  /**
   * Middleware to require authentication
   */
  requireAuth(): RequestHandler {
    return async (req: any, res: any, next: any) => {
      const result = await this.authenticate(req);

      if (!result.success) {
        return res.status(401).json({
          error: 'Authentication required',
          message: result.error
        });
      }

      next();
    };
  }

  /**
   * Middleware to require specific permission
   */
  requirePermission(permission: Permission): RequestHandler {
    return async (req: any, res: any, next: any) => {
      // First authenticate
      const authResult = await this.authenticate(req);
      if (!authResult.success) {
        return res.status(401).json({
          error: 'Authentication required',
          message: authResult.error
        });
      }

      // Then authorize
      const authzResult = await this.authorize(req, permission);
      if (!authzResult.granted) {
        return res.status(403).json({
          error: 'Permission denied',
          message: authzResult.reason
        });
      }

      next();
    };
  }

  /**
   * Middleware to require specific role
   */
  requireRole(role: SystemRole | SystemRole[]): RequestHandler {
    const roles = Array.isArray(role) ? role : [role];

    return async (req: any, res: any, next: any) => {
      const authResult = await this.authenticate(req);
      if (!authResult.success) {
        return res.status(401).json({
          error: 'Authentication required',
          message: authResult.error
        });
      }

      const userRoles = req.securityContext?.roles || [];
      const hasRole = roles.some(r => userRoles.includes(r));

      if (!hasRole) {
        return res.status(403).json({
          error: 'Role required',
          message: `Requires one of roles: ${roles.join(', ')}`
        });
      }

      next();
    };
  }

  /**
   * Middleware to require ownership or admin
   */
  requireOwnershipOrAdmin(resourceOwnerId: string): RequestHandler {
    return async (req: any, res: any, next: any) => {
      const authResult = await this.authenticate(req);
      if (!authResult.success) {
        return res.status(401).json({
          error: 'Authentication required',
          message: authResult.error
        });
      }

      const userId = req.securityContext?.userId;
      const roles = req.securityContext?.roles || [];

      // Allow if user is owner or admin
      if (userId === resourceOwnerId || roles.includes(SystemRole.ADMIN)) {
        return next();
      }

      return res.status(403).json({
        error: 'Permission denied',
        message: 'You must be the owner or an admin'
      });
    };
  }

  /**
   * Create a new session for authenticated user
   */
  async createSession(
    userId: string,
    username: string,
    roles: string[],
    permissions: Permission[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserSession> {
    const sessionId = this.generateSessionId();
    const now = new Date();

    const session: UserSession = {
      sessionId,
      userId,
      username,
      roles,
      permissions,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.SESSION_DURATION),
      lastActivity: now,
      ipAddress,
      userAgent
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Invalidate a session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Extract token from request
   */
  private extractToken(req: SecureRequest): string | undefined {
    // Try Authorization header first
    const authHeader = (req as any).headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try query parameter
    if (req.query?.token) {
      return req.query.token;
    }

    // Try session cookie
    if ((req as any).cookies?.session) {
      return (req as any).cookies.session;
    }

    return undefined;
  }

  /**
   * Extract user ID from token
   */
  private extractUserIdFromToken(token: string): string {
    // Simple implementation - in production use JWT
    try {
      const parts = token.split(':');
      return parts[0] || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Validate session token
   */
  private async validateSession(token: string): Promise<UserSession | null> {
    const session = this.sessions.get(token);
    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  /**
   * Check if user has permission
   */
  private checkPermission(
    userPermissions: Permission[],
    required: Permission
  ): boolean {
    // Admin permission grants everything
    const hasAdmin = userPermissions.some(p =>
      p.action === 'admin' || p.resource === '*'
    );
    if (hasAdmin) return true;

    // Check exact permission match
    const exactMatch = userPermissions.some(p =>
      p.resource === required.resource &&
      p.action === required.action
    );
    if (exactMatch) return true;

    // Check wildcard resource
    const wildcardMatch = userPermissions.some(p =>
      p.resource === '*' &&
      p.action === required.action
    );
    return wildcardMatch;
  }

  /**
   * Check if permission scope matches
   */
  private checkScope(
    userPermissions: Permission[],
    requiredScope: any
  ): boolean {
    // If no scope required, grant access
    if (!requiredScope) return true;

    // Check if any permission has matching scope
    return userPermissions.some(p => {
      if (!p.scope) return false;

      if (p.scope.type !== requiredScope.type) return false;

      // Check range/row/column match
      if (requiredScope.range && p.scope.range) {
        return this.rangeMatches(p.scope.range, requiredScope.range);
      }

      return p.scope.id === requiredScope.id;
    });
  }

  /**
   * Check if ranges match or overlap
   */
  private rangeMatches(range1: any, range2: any): boolean {
    return (
      range1.sheetId === range2.sheetId &&
      range1.startRow <= range2.endRow &&
      range1.endRow >= range2.startRow &&
      range1.startColumn <= range2.endColumn &&
      range1.endColumn >= range2.startColumn
    );
  }

  /**
   * Build security context from session
   */
  private buildSecurityContext(session: UserSession): SecurityContext {
    return {
      userId: session.userId,
      sessionId: session.sessionId,
      roles: session.roles,
      permissions: session.permissions,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      timestamp: new Date()
    };
  }

  /**
   * Record failed login attempt
   */
  private async recordFailedAttempt(userId: string): Promise<void> {
    const current = this.failedAttempts.get(userId) || 0;
    this.failedAttempts.set(userId, current + 1);

    // Lock account if max attempts reached
    if (current + 1 >= this.MAX_FAILED_ATTEMPTS) {
      this.lockedAccounts.set(userId, new Date());
    }
  }

  /**
   * Check if account is locked
   */
  private isAccountLocked(userId: string): boolean {
    const lockedAt = this.lockedAccounts.get(userId);
    if (!lockedAt) return false;

    // Check if lockout has expired
    if (Date.now() - lockedAt.getTime() > this.LOCKOUT_DURATION) {
      this.lockedAccounts.delete(userId);
      this.failedAttempts.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get active sessions count
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): UserSession | undefined {
    return this.sessions.get(sessionId);
  }
}

/**
 * Singleton instance
 */
export const authMiddleware = new AuthMiddleware();
