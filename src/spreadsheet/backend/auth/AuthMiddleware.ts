/**
 * POLLN Spreadsheet Backend - Authentication Middleware
 *
 * Express middleware for JWT authentication and authorization.
 * Integrates with AuthService for token validation and user lookup.
 *
 * Features:
 * - JWT authentication middleware
 * - Role-based access control
 * - Permission-based access control
 * - Optional authentication (guest access)
 * - Token extraction from headers/query/cookies
 */

import { Request, Response, NextFunction } from 'express';
import { getAuthService, TokenPayload, Permission } from './AuthService.js';

/**
 * Extended Request interface with user data
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    permissions: Permission[];
  };
}

/**
 * Authentication options
 */
export interface AuthOptions {
  // Whether authentication is required
  required: boolean;
  // Required role (if any)
  role?: string;
  // Required permissions (if any)
  permissions?: Permission[];
  // Allow guests (unauthenticated users)
  allowGuests?: boolean;
}

/**
 * Extract token from request
 */
function extractToken(req: Request): string | null {
  // Try Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try query parameter
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  // Try cookie
  if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }

  return null;
}

/**
 * Create authentication middleware
 */
export function authenticate(options: Partial<AuthOptions> = {}): (req: Request, res: Response, next: NextFunction) => {
  const opts: AuthOptions = {
    required: true,
    allowGuests: false,
    ...options,
  };

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const token = extractToken(req);

      // No token provided
      if (!token) {
        if (opts.required && !opts.allowGuests) {
          res.status(401).json({
            error: 'Authentication required',
            message: 'No authentication token provided',
          });
          return;
        }

        // Allow guest access
        next();
        return;
      }

      // Verify token
      const authService = getAuthService();
      const result = authService.verifyAccessToken(token);

      if (!result.valid) {
        if (opts.required) {
          res.status(401).json({
            error: 'Authentication failed',
            message: result.error,
          });
          return;
        }

        // Allow guest access if invalid token
        next();
        return;
      }

      // Attach user to request
      req.user = {
        id: result.payload!.sub,
        username: result.payload!.username,
        email: result.payload!.email,
        role: result.payload!.role,
        permissions: result.payload!.permissions,
      };

      // Check role requirements
      if (opts.role && req.user.role !== opts.role) {
        res.status(403).json({
          error: 'Forbidden',
          message: `Role '${opts.role}' required`,
        });
        return;
      }

      // Check permission requirements
      if (opts.permissions && opts.permissions.length > 0) {
        const hasPermission = opts.permissions.every(perm =>
          req.user!.permissions.includes(perm)
        );

        if (!hasPermission) {
          res.status(403).json({
            error: 'Forbidden',
            message: 'Insufficient permissions',
            required: opts.permissions,
            granted: req.user.permissions,
          });
          return;
        }
      }

      next();
    } catch (error) {
      console.error('[AuthMiddleware] Authentication error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Authentication failed',
      });
    }
  };
}
/**
 * Require authentication (no guest access)
 */
export function requireAuth(): (req: Request, res: Response, next: NextFunction) {
  return authenticate({ required: true, allowGuests: false });
}

/**
 * Optional authentication (guest access allowed)
 */
export function optionalAuth(): (req: Request, res: Response, next: NextFunction) {
  return authenticate({ required: false, allowGuests: true });
}

/**
 * Require specific role
 */
export function requireRole(role: string): (req: Request, res: Response, next: NextFunction) {
  return authenticate({ required: true, role });
}

/**
 * Require specific permissions
 */
export function requirePermissions(...permissions: Permission[]): (req: Request, res: Response, next: NextFunction) {
  return authenticate({ required: true, permissions });
}

/**
 * Require admin role
 */
export function requireAdmin(): (req: Request, res: Response, next: NextFunction) {
  return requireRole('admin');
}

/**
 * Check if user has permission
 */
export function hasPermission(req: AuthenticatedRequest, permission: Permission): boolean {
  return req.user?.permissions.includes(permission) ?? false;
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(req: AuthenticatedRequest, permissions: Permission[]): boolean {
  if (!req.user) return false;
  return permissions.some(perm => req.user!.permissions.includes(perm));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(req: AuthenticatedRequest, permissions: Permission[]): boolean {
  if (!req.user) return false;
  return permissions.every(perm => req.user!.permissions.includes(perm));
}

/**
 * Get current user from request
 */
export function getCurrentUser(req: AuthenticatedRequest): AuthenticatedRequest['user'] | undefined {
  return req.user;
}

/**
 * Error handler for authentication errors
 */
export function authErrorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      error: 'Authentication failed',
      message: err.message,
    });
    return;
  }

  next(err);
}

export default authenticate;
