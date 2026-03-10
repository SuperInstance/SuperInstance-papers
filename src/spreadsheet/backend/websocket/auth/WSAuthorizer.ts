/**
 * POLLN Spreadsheet Backend - WebSocket Authorizer
 *
 * Resource-based permissions, cell-level access control,
 * operation permissions, and admin override capability.
 *
 * Features:
 * - Resource-based permission checking
 * - Cell-level access control
 * - Operation permissions (read/write/delete)
 * - Admin override capability
 * - Dynamic permission resolution
 * - Permission caching
 *
 * Performance: <2ms authorization check
 */

import { Permission, ResourceType, PermissionsManager } from '../../auth/Permissions.js';
import { WSConnectionContext } from './WSAuthMiddleware.js';

/**
 * Authorization result
 */
export interface AuthorizationResult {
  allowed: boolean;
  error?: string;
  reason?: string;
  requiredPermission?: Permission;
}

/**
 * Resource access policy
 */
export interface ResourceAccessPolicy {
  resourceType: ResourceType;
  resourceId?: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  requireOwnership?: boolean;
  allowedRoles?: string[];
  allowedPermissions?: Permission[];
}

/**
 * Cell access control
 */
export interface CellAccessControl {
  cellId: string;
  ownerId: string;
  readUsers: string[];
  writeUsers: string[];
  publicRead: boolean;
  publicWrite: boolean;
}

/**
 * Authorizer configuration
 */
export interface WSAuthorizerConfig {
  // Enable admin override
  enableAdminOverride: boolean;
  // Enable permission caching
  enableCache: boolean;
  // Cache TTL (milliseconds)
  cacheTTL: number;
  // Maximum cache size
  maxCacheSize: number;
}

/**
 * Cache entry
 */
interface CacheEntry {
  result: AuthorizationResult;
  timestamp: number;
}

/**
 * WebSocket authorizer
 *
 * Checks permissions for WebSocket messages based on resource type,
 * action, and user context. Supports cell-level access control.
 */
export class WSAuthorizer {
  private config: Required<WSAuthorizerConfig>;
  private cellAccessControls: Map<string, CellAccessControl> = new Map();
  private permissionCache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Message type to resource mapping
  private static readonly MESSAGE_RESOURCE_MAP: Record<
    string,
    { resourceType: ResourceType; action: 'read' | 'write' | 'delete' | 'admin' }
  > = {
    'cell.read': { resourceType: ResourceType.CELL, action: 'read' },
    'cell.update': { resourceType: ResourceType.CELL, action: 'write' },
    'cell.delete': { resourceType: ResourceType.CELL, action: 'delete' },
    'cell.entangle': { resourceType: ResourceType.CELL, action: 'write' },
    'spreadsheet.read': { resourceType: ResourceType.SPREADSHEET, action: 'read' },
    'spreadsheet.write': { resourceType: ResourceType.SPREADSHEET, action: 'write' },
    'spreadsheet.admin': { resourceType: ResourceType.SPREADSHEET, action: 'admin' },
    'user.read': { resourceType: ResourceType.USER, action: 'read' },
    'user.manage': { resourceType: ResourceType.USER, action: 'write' },
    'system.metrics': { resourceType: ResourceType.SYSTEM, action: 'read' },
    'system.admin': { resourceType: ResourceType.SYSTEM, action: 'admin' },
  };

  constructor(config: Partial<WSAuthorizerConfig> = {}) {
    this.config = {
      enableAdminOverride: config.enableAdminOverride !== false,
      enableCache: config.enableCache !== false,
      cacheTTL: config.cacheTTL || 60000, // 1 minute
      maxCacheSize: config.maxCacheSize || 1000,
    };

    this.startCleanup();
  }

  /**
   * Authorize WebSocket message
   * Performance target: <2ms
   */
  async authorizeMessage(
    context: WSConnectionContext,
    messageType: string,
    payload: unknown
  ): Promise<AuthorizationResult> {
    try {
      // Check cache
      if (this.config.enableCache) {
        const cacheResult = this.checkCache(context.userId, messageType, payload);
        if (cacheResult) {
          return cacheResult;
        }
      }

      // Admin override - allow all operations
      if (this.config.enableAdminOverride && context.role === 'admin') {
        const result: AuthorizationResult = { allowed: true };
        this.cacheResult(context.userId, messageType, payload, result);
        return result;
      }

      // Get resource mapping for message type
      const resourceMapping = WSAuthorizer.MESSAGE_RESOURCE_MAP[messageType];
      if (!resourceMapping) {
        // Message type not mapped - allow by default (could be restricted in future)
        const result: AuthorizationResult = { allowed: true };
        this.cacheResult(context.userId, messageType, payload, result);
        return result;
      }

      // Check basic permission
      const permissionResult = PermissionsManager.canAccessResource(
        context as any, // AuthenticatedRequest compatible
        resourceMapping.resourceType,
        resourceMapping.action
      );

      if (!permissionResult.allowed) {
        const result: AuthorizationResult = {
          allowed: false,
          error: 'Insufficient permissions',
          reason: permissionResult.reason,
          requiredPermission: permissionResult.requiredPermission,
        };
        this.cacheResult(context.userId, messageType, payload, result);
        return result;
      }

      // Check cell-level access control if applicable
      if (resourceMapping.resourceType === ResourceType.CELL) {
        const cellResult = await this.authorizeCellAccess(context, payload);
        if (!cellResult.allowed) {
          this.cacheResult(context.userId, messageType, payload, cellResult);
          return cellResult;
        }
      }

      const result: AuthorizationResult = { allowed: true };
      this.cacheResult(context.userId, messageType, payload, result);
      return result;
    } catch (error) {
      console.error('[WSAuthorizer] Authorization error:', error);
      return {
        allowed: false,
        error: 'Authorization check failed',
        reason: 'Internal error during authorization',
      };
    }
  }

  /**
   * Authorize cell-level access
   */
  private async authorizeCellAccess(
    context: WSConnectionContext,
    payload: unknown
  ): Promise<AuthorizationResult> {
    const payloadObj = payload as Record<string, unknown>;
    const cellId = payloadObj.cellId as string | undefined;

    if (!cellId) {
      // No cell ID specified, allow at permission level
      return { allowed: true };
    }

    const accessControl = this.cellAccessControls.get(cellId);

    // No access control defined - allow based on permissions
    if (!accessControl) {
      return { allowed: true };
    }

    // Check public access
    if (accessControl.publicRead) {
      return { allowed: true };
    }

    // Check ownership
    if (accessControl.ownerId === context.userId) {
      return { allowed: true };
    }

    // Check read access
    if (accessControl.readUsers.includes(context.userId)) {
      return { allowed: true };
    }

    // Check write access
    if (accessControl.writeUsers.includes(context.userId)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      error: 'Access denied',
      reason: 'You do not have permission to access this cell',
    };
  }

  /**
   * Set cell access control
   */
  setCellAccessControl(cellId: string, accessControl: CellAccessControl): void {
    this.cellAccessControls.set(cellId, accessControl);
  }

  /**
   * Remove cell access control
   */
  removeCellAccessControl(cellId: string): void {
    this.cellAccessControls.delete(cellId);
  }

  /**
   * Get cell access control
   */
  getCellAccessControl(cellId: string): CellAccessControl | undefined {
    return this.cellAccessControls.get(cellId);
  }

  /**
   * Check if user has specific permission
   */
  userHasPermission(context: WSConnectionContext, permission: Permission): boolean {
    return context.permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  userHasAnyPermission(context: WSConnectionContext, permissions: Permission[]): boolean {
    return permissions.some(p => context.permissions.includes(p));
  }

  /**
   * Check if user has all specified permissions
   */
  userHasAllPermissions(context: WSConnectionContext, permissions: Permission[]): boolean {
    return permissions.every(p => context.permissions.includes(p));
  }

  /**
   * Check if user has required role level
   */
  userHasRoleLevel(context: WSConnectionContext, requiredRole: string): boolean {
    const roleHierarchy: Record<string, number> = {
      admin: 4,
      user: 3,
      readonly: 2,
      guest: 1,
    };

    const userLevel = roleHierarchy[context.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Authorize custom resource policy
   */
  async authorizePolicy(
    context: WSConnectionContext,
    policy: ResourceAccessPolicy
  ): Promise<AuthorizationResult> {
    // Admin override
    if (this.config.enableAdminOverride && context.role === 'admin') {
      return { allowed: true };
    }

    // Check role restrictions
    if (policy.allowedRoles && !policy.allowedRoles.includes(context.role)) {
      return {
        allowed: false,
        error: 'Role not allowed',
        reason: `Your role '${context.role}' is not allowed to perform this action`,
      };
    }

    // Check permission restrictions
    if (policy.allowedPermissions) {
      const hasPermission = policy.allowedPermissions.some(p =>
        context.permissions.includes(p)
      );
      if (!hasPermission) {
        return {
          allowed: false,
          error: 'Insufficient permissions',
          reason: 'You do not have the required permissions',
        };
      }
    }

    // Check ownership requirement
    if (policy.requireOwnership && policy.resourceId) {
      const accessControl = this.cellAccessControls.get(policy.resourceId);
      if (accessControl && accessControl.ownerId !== context.userId) {
        return {
          allowed: false,
          error: 'Ownership required',
          reason: 'You must be the owner of this resource',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check authorization cache
   */
  private checkCache(
    userId: string,
    messageType: string,
    payload: unknown
  ): AuthorizationResult | null {
    const cacheKey = this.getCacheKey(userId, messageType, payload);
    const entry = this.permissionCache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if cache entry is still valid
    const now = Date.now();
    if (now - entry.timestamp > this.config.cacheTTL) {
      this.permissionCache.delete(cacheKey);
      return null;
    }

    return entry.result;
  }

  /**
   * Cache authorization result
   */
  private cacheResult(
    userId: string,
    messageType: string,
    payload: unknown,
    result: AuthorizationResult
  ): void {
    // Evict oldest entries if cache is too large
    if (this.permissionCache.size >= this.config.maxCacheSize) {
      const oldestKey = this.permissionCache.keys().next().value;
      if (oldestKey) {
        this.permissionCache.delete(oldestKey);
      }
    }

    const cacheKey = this.getCacheKey(userId, messageType, payload);
    this.permissionCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Generate cache key
   */
  private getCacheKey(userId: string, messageType: string, payload: unknown): string {
    const payloadStr = JSON.stringify(payload);
    return `${userId}:${messageType}:${payloadStr}`;
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
   * Cleanup expired cache entries
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.permissionCache.entries()) {
      if (now - entry.timestamp > this.config.cacheTTL) {
        this.permissionCache.delete(key);
      }
    }
  }

  /**
   * Clear authorization cache
   */
  clearCache(): void {
    this.permissionCache.clear();
  }

  /**
   * Get authorizer statistics
   */
  getStats(): {
    cellAccessControls: number;
    cacheSize: number;
    config: Required<WSAuthorizerConfig>;
  } {
    return {
      cellAccessControls: this.cellAccessControls.size,
      cacheSize: this.permissionCache.size,
      config: this.config,
    };
  }

  /**
   * Shutdown authorizer
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cellAccessControls.clear();
    this.permissionCache.clear();
  }
}

/**
 * Create authorizer instance
 */
export function createWSAuthorizer(
  config?: Partial<WSAuthorizerConfig>
): WSAuthorizer {
  return new WSAuthorizer(config);
}

export default WSAuthorizer;
