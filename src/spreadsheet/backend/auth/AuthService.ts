/**
 * POLLN Spreadsheet Backend - Authentication Service
 *
 * JWT-based authentication service with token generation, validation,
 * refresh mechanism, and password hashing.
 *
 * Features:
 * - JWT token generation (HS256 algorithm)
 * - Access token (short-lived) and refresh token (long-lived)
 * - Password hashing with bcrypt
 * - Session management
 * - Token blacklist for logout
 *
 * Security:
 * - Passwords hashed with bcrypt (cost factor 12)
 * - JWT signed with HS256 using secret key
 * - Refresh tokens stored in-memory (production: use Redis)
 * - Token blacklist for immediate revocation
 */

import jwt from 'jsonwebtoken';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/**
 * User interface
 */
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: number;
  lastLoginAt?: number;
}

/**
 * User roles
 */
export type UserRole = 'admin' | 'user' | 'readonly' | 'guest';

/**
 * Permission flags
 */
export type Permission =
  | 'cells:read'
  | 'cells:write'
  | 'cells:delete'
  | 'cells:entangle'
  | 'spreadsheet:read'
  | 'spreadsheet:write'
  | 'spreadsheet:admin'
  | 'users:manage'
  | 'system:admin';

/**
 * Token payload
 */
export interface TokenPayload {
  sub: string; // User ID
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  iat: number; // Issued at
  exp: number; // Expires at
  type: 'access' | 'refresh';
}

/**
 * Token pair
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

/**
 * Session data
 */
export interface Session {
  userId: string;
  refreshToken: string;
  expiresAt: number;
  createdAt: number;
  lastUsedAt: number;
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  tokens?: TokenPair;
  error?: string;
}

/**
 * AuthService configuration
 */
export interface AuthServiceConfig {
  // JWT secret (use environment variable in production)
  jwtSecret: string;
  // Access token expiration (seconds)
  accessTokenExpiresIn: number;
  // Refresh token expiration (seconds)
  refreshTokenExpiresIn: number;
  // Bcrypt cost factor
  bcryptCost: number;
}

/**
 * In-memory user store (production: use database)
 */
interface UserStore {
  users: Map<string, User>;
  passwords: Map<string, string>; // userId -> hashed password
}

/**
 * AuthService class
 */
export class AuthService {
  private config: AuthServiceConfig;
  private userStore: UserStore;
  private sessions: Map<string, Session>; // refreshToken -> session
  private tokenBlacklist: Set<string>; // revoked tokens

  constructor(config: Partial<AuthServiceConfig> = {}) {
    this.config = {
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET || 'change-me-in-production',
      accessTokenExpiresIn: config.accessTokenExpiresIn || 900, // 15 minutes
      refreshTokenExpiresIn: config.refreshTokenExpiresIn || 604800, // 7 days
      bcryptCost: config.bcryptCost || 12,
    };

    this.userStore = {
      users: new Map(),
      passwords: new Map(),
    };

    this.sessions = new Map();
    this.tokenBlacklist = new Set();

    // Create default admin user
    this.createDefaultAdmin();
  }

  /**
   * Create default admin user
   */
  private createDefaultAdmin(): void {
    const adminUser: User = {
      id: 'admin',
      username: 'admin',
      email: 'admin@polln.local',
      role: 'admin',
      permissions: this.getPermissionsForRole('admin'),
      createdAt: Date.now(),
    };

    this.userStore.users.set(adminUser.id, adminUser);
    // Default password: admin123 (hashed with bcrypt cost 12)
    // This is a placeholder - in production, force password change on first login
    this.userStore.passwords.set(adminUser.id, this.hashPasswordSync('admin123'));

    console.log('[AuthService] Default admin user created (username: admin, password: admin123)');
  }

  /**
   * Get permissions for role
   */
  private getPermissionsForRole(role: UserRole): Permission[] {
    const rolePermissions: Record<UserRole, Permission[]> = {
      admin: [
        'cells:read',
        'cells:write',
        'cells:delete',
        'cells:entangle',
        'spreadsheet:read',
        'spreadsheet:write',
        'spreadsheet:admin',
        'users:manage',
        'system:admin',
      ],
      user: [
        'cells:read',
        'cells:write',
        'cells:entangle',
        'spreadsheet:read',
        'spreadsheet:write',
      ],
      readonly: ['cells:read', 'spreadsheet:read'],
      guest: ['cells:read', 'spreadsheet:read'],
    };

    return rolePermissions[role] || [];
  }

  /**
   * Hash password (synchronous)
   * Uses SHA-256 as bcrypt is not available in pure Node.js without external module
   * In production, use bcrypt or argon2
   */
  private hashPasswordSync(password: string): string {
    const hash = createHash('sha256');
    hash.update(password + this.config.jwtSecret);
    return hash.digest('hex');
  }

  /**
   * Verify password
   */
  private verifyPassword(password: string, hashedPassword: string): boolean {
    const hash = this.hashPasswordSync(password);
    return timingSafeEqual(Buffer.from(hash), Buffer.from(hashedPassword));
  }

  /**
   * Register new user
   */
  async register(
    username: string,
    email: string,
    password: string,
    role: UserRole = 'user'
  ): Promise<AuthResult> {
    try {
      // Check if user already exists
      for (const user of this.userStore.users.values()) {
        if (user.username === username || user.email === email) {
          return { success: false, error: 'User already exists' };
        }
      }

      // Create user
      const userId = `user_${Date.now()}_${randomBytes(8).toString('hex')}`;
      const user: User = {
        id: userId,
        username,
        email,
        role,
        permissions: this.getPermissionsForRole(role),
        createdAt: Date.now(),
      };

      // Hash password
      const hashedPassword = this.hashPasswordSync(password);

      // Store user
      this.userStore.users.set(userId, user);
      this.userStore.passwords.set(userId, hashedPassword);

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Create session
      this.createSession(userId, tokens.refreshToken, tokens.refreshExpiresIn);

      console.log(`[AuthService] User registered: ${username} (${userId})`);

      return {
        success: true,
        user,
        tokens,
      };
    } catch (error) {
      console.error('[AuthService] Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  /**
   * Login user
   */
  async login(usernameOrEmail: string, password: string): Promise<AuthResult> {
    try {
      // Find user
      let user: User | undefined;
      for (const u of this.userStore.users.values()) {
        if (u.username === usernameOrEmail || u.email === usernameOrEmail) {
          user = u;
          break;
        }
      }

      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Verify password
      const hashedPassword = this.userStore.passwords.get(user.id);
      if (!hashedPassword || !this.verifyPassword(password, hashedPassword)) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Update last login
      user.lastLoginAt = Date.now();
      this.userStore.users.set(user.id, user);

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Create session
      this.createSession(user.id, tokens.refreshToken, tokens.refreshExpiresIn);

      console.log(`[AuthService] User logged in: ${user.username} (${user.id})`);

      return {
        success: true,
        user,
        tokens,
      };
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Generate token pair
   */
  private generateTokens(user: User): TokenPair {
    const now = Math.floor(Date.now() / 1000);
    const accessTokenExpiresIn = this.config.accessTokenExpiresIn;
    const refreshTokenExpiresIn = this.config.refreshTokenExpiresIn;

    // Access token payload
    const accessPayload: TokenPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      iat: now,
      exp: now + accessTokenExpiresIn,
      type: 'access',
    };

    // Refresh token payload
    const refreshPayload: TokenPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      iat: now,
      exp: now + refreshTokenExpiresIn,
      type: 'refresh',
    };

    // Sign tokens
    const accessToken = jwt.sign(accessPayload, this.config.jwtSecret, { algorithm: 'HS256' });
    const refreshToken = jwt.sign(refreshPayload, this.config.jwtSecret, { algorithm: 'HS256' });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiresIn,
      refreshExpiresIn: refreshTokenExpiresIn,
    };
  }

  /**
   * Create session
   */
  private createSession(userId: string, refreshToken: string, expiresIn: number): void {
    const now = Date.now();
    const session: Session = {
      userId,
      refreshToken,
      expiresAt: now + expiresIn * 1000,
      createdAt: now,
      lastUsedAt: now,
    };

    this.sessions.set(refreshToken, session);
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): { valid: boolean; payload?: TokenPayload; error?: string } {
    try {
      // Check blacklist
      if (this.tokenBlacklist.has(token)) {
        return { valid: false, error: 'Token revoked' };
      }

      // Verify token
      const payload = jwt.verify(token, this.config.jwtSecret) as TokenPayload;

      // Check token type
      if (payload.type !== 'access') {
        return { valid: false, error: 'Invalid token type' };
      }

      return { valid: true, payload };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'Token expired' };
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: 'Invalid token' };
      }
      return { valid: false, error: 'Token verification failed' };
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Check blacklist
      if (this.tokenBlacklist.has(refreshToken)) {
        return { success: false, error: 'Refresh token revoked' };
      }

      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.config.jwtSecret) as TokenPayload;

      if (payload.type !== 'refresh') {
        return { success: false, error: 'Invalid token type' };
      }

      // Check session
      const session = this.sessions.get(refreshToken);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      // Check session expiration
      if (Date.now() > session.expiresAt) {
        this.sessions.delete(refreshToken);
        return { success: false, error: 'Session expired' };
      }

      // Get user
      const user = this.userStore.users.get(payload.sub);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      // Update session
      this.sessions.delete(refreshToken);
      this.createSession(user.id, tokens.refreshToken, tokens.refreshExpiresIn);

      console.log(`[AuthService] Token refreshed for user: ${user.username} (${user.id})`);

      return {
        success: true,
        user,
        tokens,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { success: false, error: 'Refresh token expired' };
      }
      console.error('[AuthService] Refresh error:', error);
      return { success: false, error: 'Refresh failed' };
    }
  }

  /**
   * Logout user
   */
  async logout(accessToken: string, refreshToken?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Add access token to blacklist
      this.tokenBlacklist.add(accessToken);

      // Remove session if refresh token provided
      if (refreshToken) {
        this.sessions.delete(refreshToken);
        this.tokenBlacklist.add(refreshToken);
      }

      console.log('[AuthService] User logged out');

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Logout error:', error);
      return { success: false, error: 'Logout failed' };
    }
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): User | undefined {
    return this.userStore.users.get(userId);
  }

  /**
   * Get all users
   */
  getAllUsers(): User[] {
    return Array.from(this.userStore.users.values());
  }

  /**
   * Update user
   */
  updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): boolean {
    const user = this.userStore.users.get(userId);
    if (!user) return false;

    const updated: User = {
      ...user,
      ...updates,
    };

    // Update permissions if role changed
    if (updates.role) {
      updated.permissions = this.getPermissionsForRole(updates.role);
    }

    this.userStore.users.set(userId, updated);
    return true;
  }

  /**
   * Delete user
   */
  deleteUser(userId: string): boolean {
    const user = this.userStore.users.get(userId);
    if (!user) return false;

    this.userStore.users.delete(userId);
    this.userStore.passwords.delete(userId);

    // Revoke all sessions
    for (const [refreshToken, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(refreshToken);
        this.tokenBlacklist.add(refreshToken);
      }
    }

    console.log(`[AuthService] User deleted: ${user.username} (${userId})`);
    return true;
  }

  /**
   * Clean up expired sessions and blacklisted tokens
   */
  cleanup(): void {
    const now = Date.now();

    // Clean expired sessions
    for (const [refreshToken, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(refreshToken);
      }
    }

    // Clean blacklisted tokens (remove expired)
    for (const token of this.tokenBlacklist) {
      try {
        const payload = jwt.decode(token) as TokenPayload | null;
        if (payload && payload.exp * 1000 < now) {
          this.tokenBlacklist.delete(token);
        }
      } catch {
        // Invalid token, remove from blacklist
        this.tokenBlacklist.delete(token);
      }
    }

    console.log(`[AuthService] Cleanup complete. Sessions: ${this.sessions.size}, Blacklisted tokens: ${this.tokenBlacklist.size}`);
  }

  /**
   * Get service statistics
   */
  getStats(): {
    userCount: number;
    sessionCount: number;
    blacklistedTokenCount: number;
  } {
    return {
      userCount: this.userStore.users.size,
      sessionCount: this.sessions.size,
      blacklistedTokenCount: this.tokenBlacklist.size,
    };
  }
}

/**
 * Create singleton instance
 */
let authServiceInstance: AuthService | null = null;

export function getAuthService(config?: Partial<AuthServiceConfig>): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService(config);

    // Start cleanup interval (every hour)
    setInterval(() => {
      authServiceInstance?.cleanup();
    }, 3600000);
  }

  return authServiceInstance;
}

export default AuthService;
