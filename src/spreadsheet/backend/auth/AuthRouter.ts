/**
 * POLLN Spreadsheet Backend - Authentication Router
 *
 * REST API endpoints for authentication operations.
 *
 * Endpoints:
 * - POST   /auth/register           - Register new user
 * - POST   /auth/login              - Login user
 * - POST   /auth/refresh            - Refresh access token
 * - POST   /auth/logout             - Logout user
 * - GET    /auth/me                 - Get current user
 * - GET    /auth/users              - List all users (admin only)
 * - PATCH  /auth/users/:id          - Update user (admin only)
 * - DELETE /auth/users/:id          - Delete user (admin only)
 * - GET    /auth/stats              - Get auth statistics (admin only)
 */

import { Router, Request, Response } from 'express';
import { getAuthService } from './AuthService.js';
import { authRateLimiter } from './RateLimiter.js';
import { requireAdmin, requirePermission } from './Permissions.js';
import { AuthenticatedRequest } from './AuthMiddleware.js';
import { Permission } from './Permissions.js';

/**
 * Login request body
 */
interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

/**
 * Register request body
 */
interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: string;
}

/**
 * Refresh token request body
 */
interface RefreshRequest {
  refreshToken: string;
}

/**
 * Logout request body
 */
interface LogoutRequest {
  refreshToken?: string;
}

/**
 * Create auth router
 */
export function createAuthRouter(): Router {
  const router = Router();
  const authService = getAuthService();

  /**
   * POST /auth/register
   * Register a new user
   */
  router.post('/register', authRateLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
      const body: RegisterRequest = req.body;

      // Validate required fields
      if (!body.username || !body.email || !body.password) {
        res.status(400).json({
          error: 'Missing required fields',
          required: ['username', 'email', 'password'],
        });
        return;
      }

      // Validate username
      if (body.username.length < 3 || body.username.length > 30) {
        res.status(400).json({
          error: 'Invalid username',
          message: 'Username must be between 3 and 30 characters',
        });
        return;
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        res.status(400).json({
          error: 'Invalid email',
          message: 'Email must be a valid email address',
        });
        return;
      }

      // Validate password
      if (body.password.length < 8) {
        res.status(400).json({
          error: 'Invalid password',
          message: 'Password must be at least 8 characters',
        });
        return;
      }

      // Validate role
      if (body.role && !['admin', 'user', 'readonly', 'guest'].includes(body.role)) {
        res.status(400).json({
          error: 'Invalid role',
          message: 'Role must be one of: admin, user, readonly, guest',
        });
        return;
      }

      // Register user
      const result = await authService.register(
        body.username,
        body.email,
        body.password,
        body.role as any
      );

      if (!result.success) {
        res.status(400).json({
          error: 'Registration failed',
          message: result.error,
        });
        return;
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: result.user!.id,
          username: result.user!.username,
          email: result.user!.email,
          role: result.user!.role,
          permissions: result.user!.permissions,
        },
        tokens: result.tokens,
      });
    } catch (error) {
      console.error('[AuthRouter] Registration error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Registration failed',
      });
    }
  });

  /**
   * POST /auth/login
   * Login with username/email and password
   */
  router.post('/login', authRateLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
      const body: LoginRequest = req.body;

      // Validate required fields
      if (!body.usernameOrEmail || !body.password) {
        res.status(400).json({
          error: 'Missing required fields',
          required: ['usernameOrEmail', 'password'],
        });
        return;
      }

      // Login user
      const result = await authService.login(body.usernameOrEmail, body.password);

      if (!result.success) {
        res.status(401).json({
          error: 'Authentication failed',
          message: result.error,
        });
        return;
      }

      res.json({
        message: 'Login successful',
        user: {
          id: result.user!.id,
          username: result.user!.username,
          email: result.user!.email,
          role: result.user!.role,
          permissions: result.user!.permissions,
        },
        tokens: result.tokens,
      });
    } catch (error) {
      console.error('[AuthRouter] Login error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Login failed',
      });
    }
  });

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
    try {
      const body: RefreshRequest = req.body;

      // Validate required fields
      if (!body.refreshToken) {
        res.status(400).json({
          error: 'Missing required field',
          required: ['refreshToken'],
        });
        return;
      }

      // Refresh token
      const result = await authService.refreshAccessToken(body.refreshToken);

      if (!result.success) {
        res.status(401).json({
          error: 'Refresh failed',
          message: result.error,
        });
        return;
      }

      res.json({
        message: 'Token refreshed successfully',
        tokens: result.tokens,
      });
    } catch (error) {
      console.error('[AuthRouter] Refresh error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Refresh failed',
      });
    }
  });

  /**
   * POST /auth/logout
   * Logout user (invalidate tokens)
   */
  router.post('/logout', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const body: LogoutRequest = req.body;

      // Extract access token
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null;

      if (!accessToken) {
        res.status(401).json({
          error: 'No access token provided',
        });
        return;
      }

      // Logout
      const result = await authService.logout(accessToken, body.refreshToken);

      if (!result.success) {
        res.status(400).json({
          error: 'Logout failed',
          message: result.error,
        });
        return;
      }

      res.json({
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('[AuthRouter] Logout error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Logout failed',
      });
    }
  });

  /**
   * GET /auth/me
   * Get current user info
   */
  router.get('/me', (req: AuthenticatedRequest, res: Response): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
      });
      return;
    }

    const authService = getAuthService();
    const user = authService.getUserById(req.user.id);

    if (!user) {
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    });
  });

  /**
   * GET /auth/users
   * List all users (admin only)
   */
  router.get('/users',
    requireAdmin,
    (_req: Request, res: Response): void => {
      const authService = getAuthService();
      const users = authService.getAllUsers();

      // Return users without sensitive data
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      }));

      res.json({
        users: sanitizedUsers,
        count: sanitizedUsers.length,
      });
    }
  );

  /**
   * PATCH /auth/users/:id
   * Update user (admin only)
   */
  router.patch('/users/:id',
    requireAdmin,
    (req: Request, res: Response): void => {
      try {
        const { id } = req.params;
        const updates = req.body;

        // Don't allow updating certain fields
        const forbiddenFields = ['id', 'createdAt'];
        for (const field of forbiddenFields) {
          if (field in updates) {
            res.status(400).json({
              error: 'Cannot update field',
              field,
            });
            return;
          }
        }

        const authService = getAuthService();
        const success = authService.updateUser(id, updates);

        if (!success) {
          res.status(404).json({
            error: 'User not found',
            id,
          });
          return;
        }

        const user = authService.getUserById(id);

        res.json({
          message: 'User updated successfully',
          user: {
            id: user!.id,
            username: user!.username,
            email: user!.email,
            role: user!.role,
            permissions: user!.permissions,
            createdAt: user!.createdAt,
            lastLoginAt: user!.lastLoginAt,
          },
        });
      } catch (error) {
        console.error('[AuthRouter] Update user error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: 'Update failed',
        });
      }
    }
  );

  /**
   * DELETE /auth/users/:id
   * Delete user (admin only)
   */
  router.delete('/users/:id',
    requireAdmin,
    (req: Request, res: Response): void => {
      try {
        const { id } = req.params;

        // Don't allow deleting admin users
        const authService = getAuthService();
        const user = authService.getUserById(id);

        if (!user) {
          res.status(404).json({
            error: 'User not found',
            id,
          });
          return;
        }

        if (user.role === 'admin') {
          res.status(400).json({
            error: 'Cannot delete admin user',
            message: 'Admin users cannot be deleted',
          });
          return;
        }

        const success = authService.deleteUser(id);

        if (!success) {
          res.status(404).json({
            error: 'User not found',
            id,
          });
          return;
        }

        res.json({
          message: 'User deleted successfully',
          id,
        });
      } catch (error) {
        console.error('[AuthRouter] Delete user error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: 'Delete failed',
        });
      }
    }
  );

  /**
   * GET /auth/stats
   * Get authentication statistics (admin only)
   */
  router.get('/stats',
    requireAdmin,
    (_req: Request, res: Response): void => {
      const authService = getAuthService();
      const stats = authService.getStats();

      res.json(stats);
    }
  );

  return router;
}

export default createAuthRouter;
