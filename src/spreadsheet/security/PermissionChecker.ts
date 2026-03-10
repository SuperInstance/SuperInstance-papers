/**
 * PermissionChecker - Cell-level and Range-based Permission Checks
 * Defense in depth: Granular access control, caching, inheritance
 */

import {
  Permission,
  PermissionScope,
  PermissionCacheEntry,
  CellRange,
  PermissionAction
} from './types';
import { rbacManager } from './RBACManager';

/**
 * Cell reference in spreadsheet
 */
interface CellReference {
  sheetId: string;
  row: number;
  column: number;
}

/**
 * Permission check result with details
 */
interface PermissionCheckResult {
  granted: boolean;
  permission?: Permission;
  reason?: string;
  inherited?: boolean;
}

/**
 * Checks permissions at various granularities
 */
export class PermissionChecker {
  private cache: Map<string, PermissionCacheEntry> = new Map();
  private readonly DEFAULT_CACHE_TTL = 60000; // 1 minute
  private readonly MAX_CACHE_SIZE = 10000;

  /**
   * Check if user can read a specific cell
   */
  async canReadCell(
    userId: string,
    cell: CellReference
  ): Promise<PermissionCheckResult> {
    return this.checkCellPermission(userId, cell, 'read');
  }

  /**
   * Check if user can write to a specific cell
   */
  async canWriteCell(
    userId: string,
    cell: CellReference
  ): Promise<PermissionCheckResult> {
    return this.checkCellPermission(userId, cell, 'write');
  }

  /**
   * Check if user can delete a specific cell
   */
  async canDeleteCell(
    userId: string,
    cell: CellReference
  ): Promise<PermissionCheckResult> {
    return this.checkCellPermission(userId, cell, 'delete');
  }

  /**
   * Check if user can read a row
   */
  async canReadRow(
    userId: string,
    sheetId: string,
    row: number
  ): Promise<PermissionCheckResult> {
    return this.checkRowPermission(userId, sheetId, row, 'read');
  }

  /**
   * Check if user can write to a row
   */
  async canWriteRow(
    userId: string,
    sheetId: string,
    row: number
  ): Promise<PermissionCheckResult> {
    return this.checkRowPermission(userId, sheetId, row, 'write');
  }

  /**
   * Check if user can read a column
   */
  async canReadColumn(
    userId: string,
    sheetId: string,
    column: number
  ): Promise<PermissionCheckResult> {
    return this.checkColumnPermission(userId, sheetId, column, 'read');
  }

  /**
   * Check if user can write to a column
   */
  async canWriteColumn(
    userId: string,
    sheetId: string,
    column: number
  ): Promise<PermissionCheckResult> {
    return this.checkColumnPermission(userId, sheetId, column, 'write');
  }

  /**
   * Check if user can access a range
   */
  async canAccessRange(
    userId: string,
    range: CellRange,
    action: PermissionAction
  ): Promise<PermissionCheckResult> {
    const cacheKey = this.buildCacheKey(userId, 'range', action, range);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        granted: cached.result,
        permission: cached.permissions[0],
        inherited: false
      };
    }

    const permissions = await rbacManager.getPermissions(userId);
    let result: PermissionCheckResult = { granted: false };

    // Check for admin permission first
    if (this.hasAdminPermission(permissions)) {
      result = {
        granted: true,
        permission: permissions.find(p => p.action === 'admin'),
        inherited: false
      };
    } else {
      // Check for matching range permission
      for (const perm of permissions) {
        if (perm.action !== action) continue;

        if (this.rangeMatches(perm.scope, range)) {
          result = {
            granted: true,
            permission: perm,
            inherited: false
          };
          break;
        }
      }

      // Check for sheet-level permission if no range match
      if (!result.granted) {
        for (const perm of permissions) {
          if (perm.action !== action) continue;

          if (perm.scope?.type === 'sheet' && perm.scope.id === range.sheetId) {
            result = {
              granted: true,
              permission: perm,
              inherited: true
            };
            break;
          }
        }
      }
    }

    this.addToCache(cacheKey, result.granted, result.permission ? [result.permission] : []);
    return result;
  }

  /**
   * Check if user can perform action on entire sheet
   */
  async canAccessSheet(
    userId: string,
    sheetId: string,
    action: PermissionAction
  ): Promise<PermissionCheckResult> {
    const cacheKey = this.buildCacheKey(userId, 'sheet', action, { sheetId });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        granted: cached.result,
        permission: cached.permissions[0],
        inherited: false
      };
    }

    const permissions = await rbacManager.getPermissions(userId);

    // Check for admin permission
    if (this.hasAdminPermission(permissions)) {
      return {
        granted: true,
        permission: permissions.find(p => p.action === 'admin'),
        inherited: false
      };
    }

    // Check for sheet-level permission
    for (const perm of permissions) {
      if (perm.action !== action) continue;

      if (perm.scope?.type === 'sheet' && perm.scope.id === sheetId) {
        this.addToCache(cacheKey, true, [perm]);
        return {
          granted: true,
          permission: perm,
          inherited: false
        };
      }

      // Check for wildcard
      if (perm.resource === '*') {
        this.addToCache(cacheKey, true, [perm]);
        return {
          granted: true,
          permission: perm,
          inherited: false
        };
      }
    }

    this.addToCache(cacheKey, false, []);
    return { granted: false };
  }

  /**
   * Get all cells user cannot access in a range
   */
  async getRestrictedCells(
    userId: string,
    range: CellRange,
    action: PermissionAction
  ): Promise<CellReference[]> {
    const restricted: CellReference[] = [];

    for (let row = range.startRow; row <= range.endRow; row++) {
      for (let col = range.startColumn; col <= range.endColumn; col++) {
        const cell = { sheetId: range.sheetId, row, column: col };
        const result = await this.checkCellPermission(userId, cell, action);
        if (!result.granted) {
          restricted.push(cell);
        }
      }
    }

    return restricted;
  }

  /**
   * Get all rows user cannot access
   */
  async getRestrictedRows(
    userId: string,
    sheetId: string,
    action: PermissionAction
  ): Promise<number[]> {
    const permissions = await rbacManager.getPermissions(userId);

    // If has admin, no restrictions
    if (this.hasAdminPermission(permissions)) {
      return [];
    }

    // Check for sheet-level access
    const hasSheetAccess = permissions.some(p =>
      p.action === action &&
      p.scope?.type === 'sheet' &&
      p.scope.id === sheetId
    );

    if (hasSheetAccess) {
      return [];
    }

    // Collect restricted rows from explicit permissions
    const restrictedRows = new Set<number>();
    for (const perm of permissions) {
      if (perm.action !== action) continue;

      if (perm.scope?.type === 'row' && perm.scope.id === sheetId) {
        // This permission grants access to a specific row
        // We need to find rows NOT covered by any permission
      }
    }

    return Array.from(restrictedRows);
  }

  /**
   * Check permission inheritance
   */
  async checkInheritance(
    userId: string,
    cell: CellReference,
    action: PermissionAction
  ): Promise<{
    direct: PermissionCheckResult;
    sheet: PermissionCheckResult;
    global: PermissionCheckResult;
  }> {
    return {
      direct: await this.checkCellPermission(userId, cell, action),
      sheet: await this.canAccessSheet(cell.sheetId, action),
      global: await this.checkGlobalPermission(userId, action)
    };
  }

  /**
   * Clear permission cache for user
   */
  clearUserCache(userId: string): void {
    const prefix = `${userId}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all permission cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    keys: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      keys: this.cache.size,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }

  /**
   * Check cell permission
   */
  private async checkCellPermission(
    userId: string,
    cell: CellReference,
    action: PermissionAction
  ): Promise<PermissionCheckResult> {
    const cacheKey = this.buildCacheKey(userId, 'cell', action, cell);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        granted: cached.result,
        permission: cached.permissions[0],
        inherited: false
      };
    }

    const permissions = await rbacManager.getPermissions(userId);

    // Check for admin permission
    if (this.hasAdminPermission(permissions)) {
      const result = {
        granted: true,
        permission: permissions.find(p => p.action === 'admin'),
        inherited: false
      };
      this.addToCache(cacheKey, true, [result.permission!]);
      return result;
    }

    // Check for direct cell permission
    for (const perm of permissions) {
      if (perm.action !== action) continue;

      if (perm.scope?.type === 'cell' &&
          perm.scope.id === cell.sheetId &&
          perm.scope.range?.startRow === cell.row &&
          perm.scope.range?.startColumn === cell.column) {
        const result = {
          granted: true,
          permission: perm,
          inherited: false
        };
        this.addToCache(cacheKey, true, [perm]);
        return result;
      }
    }

    // Check for row permission
    for (const perm of permissions) {
      if (perm.action !== action) continue;

      if (perm.scope?.type === 'row' &&
          perm.scope.id === cell.sheetId &&
          perm.scope.row === cell.row) {
        const result = {
          granted: true,
          permission: perm,
          inherited: true
        };
        this.addToCache(cacheKey, true, [perm]);
        return result;
      }
    }

    // Check for column permission
    for (const perm of permissions) {
      if (perm.action !== action) continue;

      if (perm.scope?.type === 'column' &&
          perm.scope.id === cell.sheetId &&
          perm.scope.column === cell.column) {
        const result = {
          granted: true,
          permission: perm,
          inherited: true
        };
        this.addToCache(cacheKey, true, [perm]);
        return result;
      }
    }

    // Check for range permission
    for (const perm of permissions) {
      if (perm.action !== action) continue;

      if (perm.scope?.type === 'range' &&
          perm.scope.range &&
          this.cellInRange(cell, perm.scope.range)) {
        const result = {
          granted: true,
          permission: perm,
          inherited: true
        };
        this.addToCache(cacheKey, true, [perm]);
        return result;
      }
    }

    // Check for sheet-level permission
    for (const perm of permissions) {
      if (perm.action !== action) continue;

      if (perm.scope?.type === 'sheet' && perm.scope.id === cell.sheetId) {
        const result = {
          granted: true,
          permission: perm,
          inherited: true
        };
        this.addToCache(cacheKey, true, [perm]);
        return result;
      }
    }

    // No permission found
    this.addToCache(cacheKey, false, []);
    return { granted: false };
  }

  /**
   * Check row permission
   */
  private async checkRowPermission(
    userId: string,
    sheetId: string,
    row: number,
    action: PermissionAction
  ): Promise<PermissionCheckResult> {
    const cacheKey = this.buildCacheKey(userId, 'row', action, { sheetId, row });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        granted: cached.result,
        permission: cached.permissions[0],
        inherited: false
      };
    }

    const permissions = await rbacManager.getPermissions(userId);

    if (this.hasAdminPermission(permissions)) {
      return {
        granted: true,
        permission: permissions.find(p => p.action === 'admin'),
        inherited: false
      };
    }

    // Check for row-specific permission
    for (const perm of permissions) {
      if (perm.action !== action) continue;

      if (perm.scope?.type === 'row' &&
          perm.scope.id === sheetId &&
          perm.scope.row === row) {
        this.addToCache(cacheKey, true, [perm]);
        return {
          granted: true,
          permission: perm,
          inherited: false
        };
      }
    }

    // Check for sheet-level permission
    for (const perm of permissions) {
      if (perm.action !== action) continue;

      if (perm.scope?.type === 'sheet' && perm.scope.id === sheetId) {
        this.addToCache(cacheKey, true, [perm]);
        return {
          granted: true,
          permission: perm,
          inherited: true
        };
      }
    }

    this.addToCache(cacheKey, false, []);
    return { granted: false };
  }

  /**
   * Check column permission
   */
  private async checkColumnPermission(
    userId: string,
    sheetId: string,
    column: number,
    action: PermissionAction
  ): Promise<PermissionCheckResult> {
    const cacheKey = this.buildCacheKey(userId, 'column', action, { sheetId, column });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        granted: cached.result,
        permission: cached.permissions[0],
        inherited: false
      };
    }

    const permissions = await rbacManager.getPermissions(userId);

    if (this.hasAdminPermission(permissions)) {
      return {
        granted: true,
        permission: permissions.find(p => p.action === 'admin'),
        inherited: false
      };
    }

    // Check for column-specific permission
    for (const perm of permissions) {
      if (perm.action !== action) continue;

      if (perm.scope?.type === 'column' &&
          perm.scope.id === sheetId &&
          perm.scope.column === column) {
        this.addToCache(cacheKey, true, [perm]);
        return {
          granted: true,
          permission: perm,
          inherited: false
        };
      }
    }

    // Check for sheet-level permission
    for (const perm of permissions) {
      if (perm.action !== action) continue;

      if (perm.scope?.type === 'sheet' && perm.scope.id === sheetId) {
        this.addToCache(cacheKey, true, [perm]);
        return {
          granted: true,
          permission: perm,
          inherited: true
        };
      }
    }

    this.addToCache(cacheKey, false, []);
    return { granted: false };
  }

  /**
   * Check global permission
   */
  private async checkGlobalPermission(
    userId: string,
    action: PermissionAction
  ): Promise<PermissionCheckResult> {
    const permissions = await rbacManager.getPermissions(userId);

    for (const perm of permissions) {
      if (perm.action === action && perm.resource === '*') {
        return {
          granted: true,
          permission: perm,
          inherited: false
        };
      }
    }

    return { granted: false };
  }

  /**
   * Check if user has admin permission
   */
  private hasAdminPermission(permissions: Permission[]): boolean {
    return permissions.some(p =>
      p.action === 'admin' || p.resource === '*'
    );
  }

  /**
   * Check if cell is within range
   */
  private cellInRange(cell: CellReference, range: CellRange): boolean {
    return (
      cell.sheetId === range.sheetId &&
      cell.row >= range.startRow &&
      cell.row <= range.endRow &&
      cell.column >= range.startColumn &&
      cell.column <= range.endColumn
    );
  }

  /**
   * Check if ranges match or overlap
   */
  private rangeMatches(scope: PermissionScope | undefined, range: CellRange): boolean {
    if (!scope || !scope.range) return false;
    if (scope.range.sheetId !== range.sheetId) return false;

    return (
      scope.range.startRow <= range.endRow &&
      scope.range.endRow >= range.startRow &&
      scope.range.startColumn <= range.endColumn &&
      scope.range.endColumn >= range.startColumn
    );
  }

  /**
   * Build cache key
   */
  private buildCacheKey(
    userId: string,
    type: string,
    action: PermissionAction,
    context: any
  ): string {
    const contextStr = JSON.stringify(context);
    return `${userId}:${type}:${action}:${contextStr}`;
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): PermissionCacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Add to cache
   */
  private addToCache(
    key: string,
    result: boolean,
    permissions: Permission[]
  ): void {
    // Evict oldest if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      key,
      result,
      permissions,
      timestamp: new Date(),
      ttl: this.DEFAULT_CACHE_TTL
    });
  }
}

/**
 * Singleton instance
 */
export const permissionChecker = new PermissionChecker();
