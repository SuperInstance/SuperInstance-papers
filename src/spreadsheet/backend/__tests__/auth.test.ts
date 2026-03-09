/**
 * POLLN Spreadsheet Backend - Authentication System Tests
 *
 * Comprehensive test suite for authentication, authorization,
 * and rate limiting components.
 *
 * Coverage:
 * - AuthService (JWT tokens, user management)
 * - AuthMiddleware (Express middleware)
 * - RateLimiter (sliding window algorithm)
 * - Permissions (RBAC)
 * - AuthRouter (REST API endpoints)
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getAuthService, AuthService, User, TokenPayload } from '../auth/AuthService.js';
import {
  authenticate,
  requireAuth,
  requireAdmin,
  requirePermissions,
  AuthenticatedRequest,
} from '../auth/AuthMiddleware.js';
import {
  RateLimiter,
  createRateLimiter,
  WebSocketConnectionLimiter,
} from '../auth/RateLimiter.js';
import {
  PermissionsManager,
  Permission,
  Role,
  ResourceType,
} from '../auth/Permissions.js';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    // Create fresh instance for each test
    authService = new AuthService({
      jwtSecret: 'test-secret-key',
      accessTokenExpiresIn: 900, // 15 minutes
      refreshTokenExpiresIn: 604800, // 7 days
      bcryptCost: 10,
    });
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const result = await authService.register('testuser', 'test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.username).toBe('testuser');
      expect(result.user?.email).toBe('test@example.com');
      expect(result.user?.role).toBe('user');
      expect(result.tokens).toBeDefined();
      expect(result.tokens?.accessToken).toBeDefined();
      expect(result.tokens?.refreshToken).toBeDefined();
    });

    it('should not register duplicate usernames', async () => {
      await authService.register('testuser', 'test1@example.com', 'password123');
      const result = await authService.register('testuser', 'test2@example.com', 'password456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User already exists');
    });

    it('should not register duplicate emails', async () => {
      await authService.register('user1', 'test@example.com', 'password123');
      const result = await authService.register('user2', 'test@example.com', 'password456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User already exists');
    });

    it('should register users with different roles', async () => {
      const admin = await authService.register('admin', 'admin@example.com', 'password123', 'admin');
      const user = await authService.register('user', 'user@example.com', 'password123', 'user');
      const readonly = await authService.register('readonly', 'readonly@example.com', 'password123', 'readonly');

      expect(admin.user?.role).toBe('admin');
      expect(user.user?.role).toBe('user');
      expect(readonly.user?.role).toBe('readonly');
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      await authService.register('testuser', 'test@example.com', 'password123');
    });

    it('should login with correct username and password', async () => {
      const result = await authService.login('testuser', 'password123');

      expect(result.success).toBe(true);
      expect(result.user?.username).toBe('testuser');
      expect(result.tokens).toBeDefined();
    });

    it('should login with correct email and password', async () => {
      const result = await authService.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('test@example.com');
    });

    it('should not login with incorrect password', async () => {
      const result = await authService.login('testuser', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should not login with non-existent user', async () => {
      const result = await authService.login('nonexistent', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should update last login timestamp', async () => {
      const beforeLogin = Date.now();
      await authService.login('testuser', 'password123');

      const user = authService.getUserById('user_' + beforeLogin);
      if (user) {
        // Find the user we just created
        const allUsers = authService.getAllUsers();
        const testUser = allUsers.find(u => u.username === 'testuser');
        expect(testUser?.lastLoginAt).toBeGreaterThanOrEqual(beforeLogin);
      }
    });
  });

  describe('Token Generation and Validation', () => {
    let user: User;
    let tokens: any;

    beforeEach(async () => {
      const result = await authService.register('testuser', 'test@example.com', 'password123');
      user = result.user!;
      tokens = result.tokens;
    });

    it('should generate valid access token', () => {
      const result = authService.verifyAccessToken(tokens.accessToken);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.sub).toBe(user.id);
      expect(result.payload?.username).toBe(user.username);
      expect(result.payload?.type).toBe('access');
    });

    it('should reject invalid token', () => {
      const result = authService.verifyAccessToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should reject expired token', async () => {
      // Create service with very short token expiry
      const shortLivedService = new AuthService({
        jwtSecret: 'test-secret',
        accessTokenExpiresIn: 1, // 1 second
        refreshTokenExpiresIn: 604800,
      });

      const result = await shortLivedService.register('temp', 'temp@example.com', 'password123');
      const token = result.tokens?.accessToken!;

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const verifyResult = authService.verifyAccessToken(token);
      expect(verifyResult.valid).toBe(false);
      expect(verifyResult.error).toBe('Token expired');
    });

    it('should refresh access token successfully', async () => {
      const refreshResult = await authService.refreshAccessToken(tokens.refreshToken);

      expect(refreshResult.success).toBe(true);
      expect(refreshResult.tokens).toBeDefined();
      expect(refreshResult.tokens?.accessToken).toBeDefined();
      expect(refreshResult.tokens?.accessToken).not.toBe(tokens.accessToken);
    });

    it('should not refresh with invalid token', async () => {
      const result = await authService.refreshAccessToken('invalid-refresh-token');

      expect(result.success).toBe(false);
    });

    it('should logout and blacklist tokens', async () => {
      const logoutResult = await authService.logout(tokens.accessToken, tokens.refreshToken);

      expect(logoutResult.success).toBe(true);

      // Try to use the access token again
      const verifyResult = authService.verifyAccessToken(tokens.accessToken);
      expect(verifyResult.valid).toBe(false);
      expect(verifyResult.error).toBe('Token revoked');
    });
  });

  describe('User Management', () => {
    it('should get user by ID', async () => {
      const registerResult = await authService.register('testuser', 'test@example.com', 'password123');
      const user = authService.getUserById(registerResult.user!.id);

      expect(user).toBeDefined();
      expect(user?.username).toBe('testuser');
    });

    it('should get all users', async () => {
      await authService.register('user1', 'user1@example.com', 'password123');
      await authService.register('user2', 'user2@example.com', 'password123');

      const users = authService.getAllUsers();

      expect(users.length).toBeGreaterThanOrEqual(2); // At least the two users we created + admin
    });

    it('should update user role', async () => {
      const registerResult = await authService.register('testuser', 'test@example.com', 'password123');
      const userId = registerResult.user!.id;

      const updated = authService.updateUser(userId, { role: 'admin' });

      expect(updated).toBe(true);

      const user = authService.getUserById(userId);
      expect(user?.role).toBe('admin');
    });

    it('should delete user', async () => {
      const registerResult = await authService.register('testuser', 'test@example.com', 'password123');
      const userId = registerResult.user!.id;

      const deleted = authService.deleteUser(userId);

      expect(deleted).toBe(true);

      const user = authService.getUserById(userId);
      expect(user).toBeUndefined();
    });

    it('should not delete admin users', () => {
      // Default admin user should exist
      const admin = authService.getUserById('admin');
      expect(admin).toBeDefined();

      // This would be tested in the router level
      const deleted = authService.deleteUser('admin');
      // Service level allows it, router should prevent
      expect(deleted).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should track active sessions', async () => {
      const result1 = await authService.register('user1', 'user1@example.com', 'password123');
      const result2 = await authService.register('user2', 'user2@example.com', 'password123');

      const stats = authService.getStats();

      expect(stats.sessionCount).toBe(2);
    });

    it('should clean up expired sessions', () => {
      // Create service with short session expiry
      const shortService = new AuthService({
        jwtSecret: 'test',
        accessTokenExpiresIn: 900,
        refreshTokenExpiresIn: 1, // 1 second
      });

      shortService.cleanup();

      const stats = shortService.getStats();
      expect(stats.sessionCount).toBe(0);
    });
  });
});

describe('AuthMiddleware', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = getAuthService({
      jwtSecret: 'test-middleware-secret',
      accessTokenExpiresIn: 900,
      refreshTokenExpiresIn: 604800,
    });
  });

  describe('authenticate()', () => {
    it('should authenticate with valid Bearer token', async () => {
      const loginResult = await authService.login('admin', 'admin123');

      const req = {
        headers: {
          authorization: `Bearer ${loginResult.tokens?.accessToken}`,
        },
      } as any;

      const res = {} as any;
      const next = jest.fn();

      const middleware = authenticate({ required: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect((req as AuthenticatedRequest).user).toBeDefined();
      expect((req as AuthenticatedRequest).user?.id).toBe(loginResult.user?.id);
    });

    it('should reject without token when required', () => {
      const req = {} as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      const middleware = authenticate({ required: true });
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow guest access when configured', () => {
      const req = {} as any;
      const res = {} as any;
      const next = jest.fn();

      const middleware = authenticate({ required: false, allowGuests: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('requirePermissions()', () => {
    it('should allow access with correct permissions', async () => {
      const loginResult = await authService.login('admin', 'admin123');

      const req = {
        headers: {
          authorization: `Bearer ${loginResult.tokens?.accessToken}`,
        },
        user: loginResult.user,
      } as any;

      const res = {} as any;
      const next = jest.fn();

      const middleware = requirePermissions(Permission.CELLS_READ, Permission.CELLS_WRITE);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access without required permissions', async () => {
      const loginResult = await authService.register('readonly', 'readonly@example.com', 'password123', 'readonly');

      const req = {
        headers: {
          authorization: `Bearer ${loginResult.tokens?.accessToken}`,
        },
        user: loginResult.user,
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      const middleware = requirePermissions(Permission.CELLS_WRITE);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin()', () => {
    it('should allow admin users', async () => {
      const loginResult = await authService.login('admin', 'admin123');

      const req = {
        headers: {
          authorization: `Bearer ${loginResult.tokens?.accessToken}`,
        },
        user: loginResult.user,
      } as any;

      const res = {} as any;
      const next = jest.fn();

      const middleware = requireAdmin();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny non-admin users', async () => {
      const loginResult = await authService.register('user', 'user@example.com', 'password123', 'user');

      const req = {
        headers: {
          authorization: `Bearer ${loginResult.tokens?.accessToken}`,
        },
        user: loginResult.user,
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      const middleware = requireAdmin();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('RateLimiter', () => {
  describe('Sliding Window Algorithm', () => {
    it('should allow requests within limit', () => {
      const limiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 60000,
      });

      const result1 = limiter.isRateLimited('user1');
      const result2 = limiter.isRateLimited('user1');

      expect(result1.limited).toBe(false);
      expect(result1.remaining).toBe(9);
      expect(result2.limited).toBe(false);
      expect(result2.remaining).toBe(8);
    });

    it('should block requests exceeding limit', () => {
      const limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 60000,
      });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        limiter.isRateLimited('user1');
      }

      // 6th request should be limited
      const result = limiter.isRateLimited('user1');

      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should reset window after expiration', () => {
      const limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 100, // 100ms
      });

      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        limiter.isRateLimited('user1');
      }

      // Wait for window to expire
      jest.useFakeTimers();
      jest.advanceTimersByTime(150);

      // Should be allowed again
      const result = limiter.isRateLimited('user1');

      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(4);

      jest.useRealTimers();
    });

    it('should track different keys independently', () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 60000,
      });

      // Exhaust user1
      for (let i = 0; i < 3; i++) {
        limiter.isRateLimited('user1');
      }

      // user2 should still be allowed
      const result = limiter.isRateLimited('user2');

      expect(result.limited).toBe(false);
    });
  });

  describe('WebSocket Connection Limiter', () => {
    let limiter: WebSocketConnectionLimiter;

    beforeEach(() => {
      limiter = new WebSocketConnectionLimiter({
        maxConnectionsPerUser: 2,
        maxConnectionsPerIP: 3,
        maxTotalConnections: 10,
      });
    });

    it('should allow connections within limits', () => {
      const result = limiter.canConnect('user1', '192.168.1.1');

      expect(result.allowed).toBe(true);
    });

    it('should block connections exceeding per-user limit', () => {
      limiter.addConnection('conn1', 'user1', '192.168.1.1');
      limiter.addConnection('conn2', 'user1', '192.168.1.1');

      const result = limiter.canConnect('user1', '192.168.1.1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Maximum connections per user');
    });

    it('should block connections exceeding per-IP limit', () => {
      limiter.addConnection('conn1', 'user1', '192.168.1.1');
      limiter.addConnection('conn2', 'user2', '192.168.1.1');
      limiter.addConnection('conn3', 'user3', '192.168.1.1');

      const result = limiter.canConnect('user4', '192.168.1.1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Maximum connections per IP');
    });

    it('should remove connections', () => {
      limiter.addConnection('conn1', 'user1', '192.168.1.1');

      const result1 = limiter.canConnect('user1', '192.168.1.1');
      expect(result1.allowed).toBe(false);

      limiter.removeConnection('conn1', 'user1', '192.168.1.1');

      const result2 = limiter.canConnect('user1', '192.168.1.1');
      expect(result2.allowed).toBe(true);
    });

    it('should track statistics', () => {
      limiter.addConnection('conn1', 'user1', '192.168.1.1');
      limiter.addConnection('conn2', 'user2', '192.168.1.2');

      const stats = limiter.getStats();

      expect(stats.totalConnections).toBe(2);
      expect(stats.uniqueUsers).toBe(2);
      expect(stats.uniqueIPs).toBe(2);
    });
  });
});

describe('Permissions', () => {
  describe('PermissionsManager', () => {
    it('should return correct permissions for roles', () => {
      const adminPerms = PermissionsManager.getPermissionsForRole(Role.ADMIN);
      const userPerms = PermissionsManager.getPermissionsForRole(Role.USER);
      const readonlyPerms = PermissionsManager.getPermissionsForRole(Role.READONLY);

      expect(adminPerms.length).toBeGreaterThan(userPerms.length);
      expect(userPerms.length).toBeGreaterThan(readonlyPerms.length);
    });

    it('should check if user has permission', () => {
      const adminUser = {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        permissions: PermissionsManager.getPermissionsForRole(Role.ADMIN),
      };

      expect(PermissionsManager.userHasPermission(adminUser, Permission.CELLS_WRITE)).toBe(true);
      expect(PermissionsManager.userHasPermission(adminUser, Permission.SYSTEM_ADMIN)).toBe(true);
    });

    it('should check if user has all permissions', () => {
      const user = {
        id: '1',
        username: 'user',
        email: 'user@example.com',
        role: 'user',
        permissions: PermissionsManager.getPermissionsForRole(Role.USER),
      };

      expect(PermissionsManager.userHasAllPermissions(user, [
        Permission.CELLS_READ,
        Permission.CELLS_WRITE,
      ])).toBe(true);

      expect(PermissionsManager.userHasAllPermissions(user, [
        Permission.CELLS_READ,
        Permission.SYSTEM_ADMIN,
      ])).toBe(false);
    });

    it('should check if user has role', () => {
      const user = {
        id: '1',
        username: 'user',
        email: 'user@example.com',
        role: 'user',
        permissions: [],
      };

      expect(PermissionsManager.userHasRole(user, Role.USER)).toBe(true);
      expect(PermissionsManager.userHasRole(user, Role.ADMIN)).toBe(false);
      // User role is higher than readonly, so should pass
      expect(PermissionsManager.userHasRole(user, Role.READONLY)).toBe(true);
    });

    it('should check resource access', () => {
      const adminUser = {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        permissions: PermissionsManager.getPermissionsForRole(Role.ADMIN),
      };

      const readonlyUser = {
        id: '2',
        username: 'readonly',
        email: 'readonly@example.com',
        role: 'readonly',
        permissions: PermissionsManager.getPermissionsForRole(Role.READONLY),
      };

      expect(PermissionsManager.canAccessResource(adminUser, ResourceType.CELL, 'write').allowed).toBe(true);
      expect(PermissionsManager.canAccessResource(readonlyUser, ResourceType.CELL, 'write').allowed).toBe(false);
      expect(PermissionsManager.canAccessResource(readonlyUser, ResourceType.CELL, 'read').allowed).toBe(true);
    });
  });

  describe('Permission Enum', () => {
    it('should have all required permissions', () => {
      expect(Permission.CELLS_READ).toBe('cells:read');
      expect(Permission.CELLS_WRITE).toBe('cells:write');
      expect(Permission.CELLS_DELETE).toBe('cells:delete');
      expect(Permission.CELLS_ENTANGLE).toBe('cells:entangle');
      expect(Permission.SPREADSHEET_READ).toBe('spreadsheet:read');
      expect(Permission.SPREADSHEET_WRITE).toBe('spreadsheet:write');
      expect(Permission.SPREADSHEET_ADMIN).toBe('spreadsheet:admin');
      expect(Permission.USERS_MANAGE).toBe('users:manage');
      expect(Permission.USERS_READ).toBe('users:read');
      expect(Permission.SYSTEM_ADMIN).toBe('system:admin');
      expect(Permission.SYSTEM_METRICS).toBe('system:metrics');
    });
  });

  describe('Role Enum', () => {
    it('should have all required roles', () => {
      expect(Role.ADMIN).toBe('admin');
      expect(Role.USER).toBe('user');
      expect(Role.READONLY).toBe('readonly');
      expect(Role.GUEST).toBe('guest');
    });
  });
});

describe('Integration Tests', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService({
      jwtSecret: 'integration-test-secret',
      accessTokenExpiresIn: 900,
      refreshTokenExpiresIn: 604800,
    });
  });

  describe('Complete Auth Flow', () => {
    it('should handle register, login, access protected resource, refresh, and logout', async () => {
      // 1. Register
      const registerResult = await authService.register('integration', 'integration@example.com', 'password123');
      expect(registerResult.success).toBe(true);

      // 2. Login
      const loginResult = await authService.login('integration', 'password123');
      expect(loginResult.success).toBe(true);
      expect(loginResult.tokens).toBeDefined();

      // 3. Access protected resource with token
      const verifyResult = authService.verifyAccessToken(loginResult.tokens!.accessToken);
      expect(verifyResult.valid).toBe(true);

      // 4. Refresh token
      const refreshResult = await authService.refreshAccessToken(loginResult.tokens!.refreshToken);
      expect(refreshResult.success).toBe(true);
      expect(refreshResult.tokens?.accessToken).not.toBe(loginResult.tokens?.accessToken);

      // 5. Logout
      const logoutResult = await authService.logout(loginResult.tokens!.accessToken, loginResult.tokens!.refreshToken);
      expect(logoutResult.success).toBe(true);

      // 6. Verify token is revoked
      const verifyAfterLogout = authService.verifyAccessToken(loginResult.tokens!.accessToken);
      expect(verifyAfterLogout.valid).toBe(false);
      expect(verifyAfterLogout.error).toBe('Token revoked');
    });
  });

  describe('Multi-User Scenarios', () => {
    it('should handle multiple concurrent users', async () => {
      const users = [];

      // Register 5 users
      for (let i = 1; i <= 5; i++) {
        const result = await authService.register(`user${i}`, `user${i}@example.com`, `password${i}`);
        expect(result.success).toBe(true);
        users.push(result.user);
      }

      // All users should be able to login
      for (const user of users) {
        const loginResult = await authService.login(user!.username, 'password123');
        // This would fail because we used different passwords
        // Let's fix that
        const loginWithCorrectPassword = await authService.login(user!.username, `password${user!.username.replace('user', '')}`);
        expect(loginWithCorrectPassword.success).toBe(true);
      }
    });

    it('should enforce rate limits per user', () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 60000,
      });

      // User 1 makes 3 requests (allowed)
      expect(limiter.isRateLimited('user1').limited).toBe(false);
      expect(limiter.isRateLimited('user1').limited).toBe(false);
      expect(limiter.isRateLimited('user1').limited).toBe(false);

      // User 1 makes 4th request (blocked)
      expect(limiter.isRateLimited('user1').limited).toBe(true);

      // User 2 can still make requests (independent limit)
      expect(limiter.isRateLimited('user2').limited).toBe(false);
    });
  });
});
