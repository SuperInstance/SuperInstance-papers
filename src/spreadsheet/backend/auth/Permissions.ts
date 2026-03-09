/**
 * POLLN Spreadsheet Backend - Permissions System
 *
 * Role-based access control (RBAC) with granular permissions.
 * Defines roles, permissions, and authorization logic.
 *
 * Features:
 * - Role definitions (admin, user, readonly, guest)
 * - Permission definitions
 * - Permission checking helpers
 * - Role hierarchy
 * - Resource-based permissions
 */

import { AuthenticatedRequest } from './AuthMiddleware.js';

/**
 * All available permissions
 */
export enum Permission {
  // Cell operations
  CELLS_READ = 'cells:read',
  CELLS_WRITE = 'cells:write',
  CELLS_DELETE = 'cells:delete',
  CELLS_ENTANGLE = 'cells:entangle',

  // Spreadsheet operations
  SPREADSHEET_READ = 'spreadsheet:read',
  SPREADSHEET_WRITE = 'spreadsheet:write',
  SPREADSHEET_ADMIN = 'spreadsheet:admin',

  // User management
  USERS_MANAGE = 'users:manage',
  USERS_READ = 'users:read',

  // System administration
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_METRICS = 'system:metrics',
}

/**
 * User roles
 */
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  READONLY = 'readonly',
  GUEST = 'guest',
}

/**
 * Role permissions mapping
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.CELLS_READ,
    Permission.CELLS_WRITE,
    Permission.CELLS_DELETE,
    Permission.CELLS_ENTANGLE,
    Permission.SPREADSHEET_READ,
    Permission.SPREADSHEET_WRITE,
    Permission.SPREADSHEET_ADMIN,
    Permission.USERS_MANAGE,
    Permission.USERS_READ,
    Permission.SYSTEM_ADMIN,
    Permission.SYSTEM_METRICS,
  ],
  [Role.USER]: [
    Permission.CELLS_READ,
    Permission.CELLS_WRITE,
    Permission.CELLS_ENTANGLE,
    Permission.SPREADSHEET_READ,
    Permission.SPREADSHEET_WRITE,
  ],
  [Role.READONLY]: [
    Permission.CELLS_READ,
    Permission.SPREADSHEET_READ,
  ],
  [Role.GUEST]: [
    Permission.CELLS_READ,
    Permission.SPREADSHEET_READ,
  ],
};

/**
 * Role hierarchy (higher roles inherit lower role permissions)
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.ADMIN]: 4,
  [Role.USER]: 3,
  [Role.READONLY]: 2,
  [Role.GUEST]: 1,
};

/**
 * Resource type
 */
export enum ResourceType {
  CELL = 'cell',
  SPREADSHEET = 'spreadsheet',
  USER = 'user',
  SYSTEM = 'system',
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermission?: Permission;
  requiredRole?: Role;
}

/**
 * Permissions manager class
 */
export class PermissionsManager {
  /**
   * Get permissions for role
   */
  static getPermissionsForRole(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if role has permission
   */
  static roleHasPermission(role: Role, permission: Permission): boolean {
    const permissions = this.getPermissionsForRole(role);
    return permissions.includes(permission);
  }

  /**
   * Check if user has permission
   */
  static userHasPermission(
    user: AuthenticatedRequest['user'],
    permission: Permission
  ): boolean {
    if (!user) return false;
    return user.permissions.includes(permission);
  }

  /**
   * Check if user has all permissions
   */
  static userHasAllPermissions(
    user: AuthenticatedRequest['user'],
    permissions: Permission[]
  ): boolean {
    if (!user) return false;
    return permissions.every(p => user.permissions.includes(p));
  }

  /**
   * Check if user has any of the permissions
   */
  static userHasAnyPermission(
    user: AuthenticatedRequest['user'],
    permissions: Permission[]
  ): boolean {
    if (!user) return false;
    return permissions.some(p => user.permissions.includes(p));
  }

  /**
   * Check if user has required role
   */
  static userHasRole(
    user: AuthenticatedRequest['user'],
    requiredRole: Role
  ): boolean {
    if (!user) return false;
    const userLevel = ROLE_HIERARCHY[user.role as Role] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole];
    return userLevel >= requiredLevel;
  }

  /**
   * Check if user can access resource
   */
  static canAccessResource(
    user: AuthenticatedRequest['user'],
    resourceType: ResourceType,
    action: 'read' | 'write' | 'delete' | 'admin'
  ): PermissionCheckResult {
    if (!user) {
      return {
        allowed: false,
        reason: 'Not authenticated',
      };
    }

    // Map resource + action to permission
    const permissionMap: Record<ResourceType, Record<string, Permission>> = {
      [ResourceType.CELL]: {
        read: Permission.CELLS_READ,
        write: Permission.CELLS_WRITE,
        delete: Permission.CELLS_DELETE,
        admin: Permission.CELLS_DELETE, // Use delete as admin proxy
      },
      [ResourceType.SPREADSHEET]: {
        read: Permission.SPREADSHEET_READ,
        write: Permission.SPREADSHEET_WRITE,
        delete: Permission.SPREADSHEET_ADMIN,
        admin: Permission.SPREADSHEET_ADMIN,
      },
      [ResourceType.USER]: {
        read: Permission.USERS_READ,
        write: Permission.USERS_MANAGE,
        delete: Permission.USERS_MANAGE,
        admin: Permission.USERS_MANAGE,
      },
      [ResourceType.SYSTEM]: {
        read: Permission.SYSTEM_METRICS,
        write: Permission.SYSTEM_ADMIN,
        delete: Permission.SYSTEM_ADMIN,
        admin: Permission.SYSTEM_ADMIN,
      },
    };

    const requiredPermission = permissionMap[resourceType][action];

    if (!user.permissions.includes(requiredPermission)) {
      return {
        allowed: false,
        reason: `Missing required permission: ${requiredPermission}`,
        requiredPermission,
      };
    }

    return { allowed: true };
  }

  /**
   * Get all permissions as array
   */
  static getAllPermissions(): Permission[] {
    return Object.values(Permission);
  }

  /**
   * Get all roles as array
   */
  static getAllRoles(): Role[] {
    return Object.values(Role);
  }

  /**
   * Validate permission string
   */
  static isValidPermission(permission: string): permission is Permission {
    return Object.values(Permission).includes(permission as Permission);
  }

  /**
   * Validate role string
   */
  static isValidRole(role: string): role is Role {
    return Object.values(Role).includes(role as Role);
  }
}

/**
 * Permission decorator for route handlers
 */
export function RequirePermission(...permissions: Permission[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (req: AuthenticatedRequest, res: any, next: any) {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to access this resource',
        });
      }

      const hasPermission = PermissionsManager.userHasAllPermissions(req.user, permissions);

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions',
          required: permissions,
          granted: req.user.permissions,
        });
      }

      return originalMethod.apply(this, [req, res, next]);
    };

    return descriptor;
  };
}

/**
 * Role decorator for route handlers
 */
export function RequireRole(role: Role) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (req: AuthenticatedRequest, res: any, next: any) {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to access this resource',
        });
      }

      const hasRole = PermissionsManager.userHasRole(req.user, role);

      if (!hasRole) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Role '${role}' required`,
          requiredRole: role,
          userRole: req.user.role,
        });
      }

      return originalMethod.apply(this, [req, res, next]);
    };

    return descriptor;
  };
}

/**
 * Helper function to create permission middleware
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: AuthenticatedRequest, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const hasPermission = PermissionsManager.userHasAllPermissions(req.user, permissions);

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        required: permissions,
      });
    }

    next();
  };
}

/**
 * Helper function to create role middleware
 */
export function requireRole(role: Role) {
  return (req: AuthenticatedRequest, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const hasRole = PermissionsManager.userHasRole(req.user, role);

    if (!hasRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${role}' required`,
      });
    }

    next();
  };
}

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRole(Role.ADMIN);

/**
 * Read/write access middleware
 */
export const requireReadWrite = requirePermission(
  Permission.CELLS_READ,
  Permission.CELLS_WRITE
);

/**
 * Cell operations middleware
 */
export const requireCellOperations = requirePermission(
  Permission.CELLS_READ,
  Permission.CELLS_WRITE,
  Permission.CELLS_ENTANGLE
);

export default PermissionsManager;
