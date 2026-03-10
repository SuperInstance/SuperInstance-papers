/**
 * RBACManager - Role-Based Access Control Management
 * Defense in depth: Hierarchical permissions, role inheritance, scoped access
 */

import {
  Permission,
  PermissionScope,
  Role,
  RoleAssignment,
  SystemRole,
  ScopeType
} from './types';

/**
 * Manages roles, permissions, and assignments
 */
export class RBACManager {
  private roles: Map<string, Role> = new Map();
  private assignments: Map<string, RoleAssignment[]> = new Map();
  private userPermissions: Map<string, Permission[]> = new Map();

  constructor() {
    this.initializeSystemRoles();
  }

  /**
   * Create a new role
   */
  async createRole(role: Role): Promise<void> {
    if (this.roles.has(role.id)) {
      throw new Error(`Role ${role.id} already exists`);
    }

    // Validate permissions
    for (const perm of role.permissions) {
      this.validatePermission(perm);
    }

    this.roles.set(role.id, role);
  }

  /**
   * Update an existing role
   */
  async updateRole(roleId: string, updates: Partial<Role>): Promise<void> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    if (role.isSystemRole) {
      throw new Error('Cannot modify system roles');
    }

    const updated = { ...role, ...updates, updatedAt: new Date() };
    this.roles.set(roleId, updated);

    // Invalidate permission cache for all users with this role
    this.invalidatePermissionCacheForRole(roleId);
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: string): Promise<void> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    if (role.isSystemRole) {
      throw new Error('Cannot delete system roles');
    }

    this.roles.delete(roleId);

    // Remove all assignments
    for (const [userId, assignments] of this.assignments.entries()) {
      const filtered = assignments.filter(a => a.roleId !== roleId);
      this.assignments.set(userId, filtered);
    }

    // Invalidate permission cache
    this.invalidatePermissionCacheForRole(roleId);
  }

  /**
   * Assign a role to a user
   */
  async assignRole(
    userId: string,
    roleId: string,
    scope?: PermissionScope,
    assignedBy?: string
  ): Promise<void> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    // Get existing assignments
    let assignments = this.assignments.get(userId) || [];

    // Check if assignment already exists
    const existing = assignments.find(a => a.roleId === roleId);
    if (existing) {
      throw new Error(`User already has role ${roleId}`);
    }

    // Create assignment
    const assignment: RoleAssignment = {
      userId,
      roleId,
      scope,
      assignedAt: new Date(),
      assignedBy: assignedBy || 'system'
    };

    assignments.push(assignment);
    this.assignments.set(userId, assignments);

    // Invalidate permission cache for user
    this.userPermissions.delete(userId);
  }

  /**
   * Revoke a role from a user
   */
  async revokeRole(userId: string, roleId: string): Promise<void> {
    const assignments = this.assignments.get(userId);
    if (!assignments) {
      throw new Error(`User ${userId} has no roles`);
    }

    const filtered = assignments.filter(a => a.roleId !== roleId);
    if (filtered.length === assignments.length) {
      throw new Error(`User does not have role ${roleId}`);
    }

    this.assignments.set(userId, filtered);
    this.userPermissions.delete(userId);
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(
    userId: string,
    permission: Permission,
    scope?: string
  ): Promise<boolean> {
    const permissions = await this.getPermissions(userId);
    return this.checkPermissionMatch(permissions, permission, scope);
  }

  /**
   * Get all permissions for a user (aggregated from all roles)
   */
  async getPermissions(userId: string): Promise<Permission[]> {
    // Check cache first
    const cached = this.userPermissions.get(userId);
    if (cached) {
      return cached;
    }

    // Get all role assignments for user
    const assignments = this.assignments.get(userId) || [];

    // Aggregate permissions from all roles
    const permissions: Permission[] = [];
    for (const assignment of assignments) {
      const role = this.roles.get(assignment.roleId);
      if (!role) continue;

      // If assignment has scope, apply it to permissions
      if (assignment.scope) {
        for (const perm of role.permissions) {
          permissions.push({
            ...perm,
            scope: assignment.scope
          });
        }
      } else {
        permissions.push(...role.permissions);
      }
    }

    // Cache the result
    this.userPermissions.set(userId, permissions);
    return permissions;
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const assignments = this.assignments.get(userId) || [];
    const roles: Role[] = [];

    for (const assignment of assignments) {
      const role = this.roles.get(assignment.roleId);
      if (role) {
        roles.push(role);
      }
    }

    return roles;
  }

  /**
   * Get all users with a specific role
   */
  async getUsersWithRole(roleId: string): Promise<string[]> {
    const users: string[] = [];

    for (const [userId, assignments] of this.assignments.entries()) {
      if (assignments.some(a => a.roleId === roleId)) {
        users.push(userId);
      }
    }

    return users;
  }

  /**
   * Get role by ID
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /**
   * Get all roles
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasAnyRole(userId: string, roleIds: string[]): Promise<boolean> {
    const assignments = this.assignments.get(userId) || [];
    return assignments.some(a => roleIds.includes(a.roleId));
  }

  /**
   * Check if user has all of the specified roles
   */
  async hasAllRoles(userId: string, roleIds: string[]): Promise<boolean> {
    const assignments = this.assignments.get(userId) || [];
    const userRoleIds = new Set(assignments.map(a => a.roleId));
    return roleIds.every(id => userRoleIds.has(id));
  }

  /**
   * Add permission to role
   */
  async addPermissionToRole(roleId: string, permission: Permission): Promise<void> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    this.validatePermission(permission);

    // Check if permission already exists
    const exists = role.permissions.some(
      p => p.resource === permission.resource && p.action === permission.action
    );

    if (exists) {
      throw new Error('Permission already exists in role');
    }

    role.permissions.push(permission);
    role.updatedAt = new Date();

    // Invalidate cache for all users with this role
    this.invalidatePermissionCacheForRole(roleId);
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(
    roleId: string,
    permissionId: string
  ): Promise<void> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    const index = role.permissions.findIndex(p => p.id === permissionId);
    if (index === -1) {
      throw new Error('Permission not found in role');
    }

    role.permissions.splice(index, 1);
    role.updatedAt = new Date();

    // Invalidate cache for all users with this role
    this.invalidatePermissionCacheForRole(roleId);
  }

  /**
   * Clone a role
   */
  async cloneRole(sourceRoleId: string, newRoleId: string, newName: string): Promise<void> {
    const source = this.roles.get(sourceRoleId);
    if (!source) {
      throw new Error(`Source role ${sourceRoleId} not found`);
    }

    if (this.roles.has(newRoleId)) {
      throw new Error(`Role ${newRoleId} already exists`);
    }

    const cloned: Role = {
      id: newRoleId,
      name: newName,
      description: `Cloned from ${source.name}`,
      permissions: [...source.permissions],
      isSystemRole: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.roles.set(newRoleId, cloned);
  }

  /**
   * Get role assignments for user
   */
  async getRoleAssignments(userId: string): Promise<RoleAssignment[]> {
    return this.assignments.get(userId) || [];
  }

  /**
   * Clean up expired role assignments
   */
  async cleanupExpiredAssignments(): Promise<number> {
    let cleaned = 0;
    const now = new Date();

    for (const [userId, assignments] of this.assignments.entries()) {
      const valid = assignments.filter(a => {
        if (!a.expiresAt) return true;
        if (a.expiresAt < now) {
          cleaned++;
          return false;
        }
        return true;
      });

      this.assignments.set(userId, valid);

      // Invalidate cache if any were removed
      if (valid.length !== assignments.length) {
        this.userPermissions.delete(userId);
      }
    }

    return cleaned;
  }

  /**
   * Initialize system roles with default permissions
   */
  private initializeSystemRoles(): void {
    // Owner role - full access
    const owner: Role = {
      id: SystemRole.OWNER,
      name: 'Owner',
      description: 'Full access to all resources',
      permissions: [
        {
          id: 'owner-all',
          resource: '*',
          action: 'admin'
        }
      ],
      isSystemRole: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Admin role - administrative access
    const admin: Role = {
      id: SystemRole.ADMIN,
      name: 'Administrator',
      description: 'Administrative access to manage resources',
      permissions: [
        {
          id: 'admin-read',
          resource: '*',
          action: 'read'
        },
        {
          id: 'admin-write',
          resource: '*',
          action: 'write'
        },
        {
          id: 'admin-delete',
          resource: '*',
          action: 'delete'
        },
        {
          id: 'admin-share',
          resource: '*',
          action: 'share'
        }
      ],
      isSystemRole: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Editor role - edit access
    const editor: Role = {
      id: SystemRole.EDITOR,
      name: 'Editor',
      description: 'Can edit spreadsheet content',
      permissions: [
        {
          id: 'editor-read',
          resource: 'spreadsheet',
          action: 'read'
        },
        {
          id: 'editor-write',
          resource: 'spreadsheet',
          action: 'write'
        }
      ],
      isSystemRole: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Viewer role - read-only access
    const viewer: Role = {
      id: SystemRole.VIEWER,
      name: 'Viewer',
      description: 'Read-only access to spreadsheets',
      permissions: [
        {
          id: 'viewer-read',
          resource: 'spreadsheet',
          action: 'read'
        }
      ],
      isSystemRole: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Commenter role - read and comment
    const commenter: Role = {
      id: SystemRole.COMMENTER,
      name: 'Commenter',
      description: 'Can view and add comments',
      permissions: [
        {
          id: 'commenter-read',
          resource: 'spreadsheet',
          action: 'read'
        },
        {
          id: 'commenter-comment',
          resource: 'comment',
          action: 'write'
        }
      ],
      isSystemRole: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Guest role - limited access
    const guest: Role = {
      id: SystemRole.GUEST,
      name: 'Guest',
      description: 'Limited temporary access',
      permissions: [
        {
          id: 'guest-read',
          resource: 'spreadsheet',
          action: 'read',
          scope: { type: 'sheet' }
        }
      ],
      isSystemRole: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.roles.set(owner.id, owner);
    this.roles.set(admin.id, admin);
    this.roles.set(editor.id, editor);
    this.roles.set(viewer.id, viewer);
    this.roles.set(commenter.id, commenter);
    this.roles.set(guest.id, guest);
  }

  /**
   * Validate permission structure
   */
  private validatePermission(permission: Permission): void {
    if (!permission.id) {
      throw new Error('Permission must have an ID');
    }

    if (!permission.resource) {
      throw new Error('Permission must have a resource');
    }

    if (!permission.action) {
      throw new Error('Permission must have an action');
    }

    const validActions = ['read', 'write', 'delete', 'share', 'admin', 'execute', 'approve'];
    if (!validActions.includes(permission.action)) {
      throw new Error(`Invalid action: ${permission.action}`);
    }

    if (permission.scope) {
      this.validateScope(permission.scope);
    }
  }

  /**
   * Validate permission scope
   */
  private validateScope(scope: PermissionScope): void {
    const validTypes: ScopeType[] = ['sheet', 'range', 'cell', 'row', 'column'];
    if (!validTypes.includes(scope.type as ScopeType)) {
      throw new Error(`Invalid scope type: ${scope.type}`);
    }

    if (scope.type === 'range' && !scope.range) {
      throw new Error('Range scope must have range defined');
    }

    if (scope.type === 'row' && scope.row === undefined) {
      throw new Error('Row scope must have row defined');
    }

    if (scope.type === 'column' && scope.column === undefined) {
      throw new Error('Column scope must have column defined');
    }
  }

  /**
   * Check if permissions match
   */
  private checkPermissionMatch(
    permissions: Permission[],
    required: Permission,
    scope?: string
  ): boolean {
    // Check for admin permission
    const hasAdmin = permissions.some(p => p.action === 'admin' || p.resource === '*');
    if (hasAdmin) return true;

    // Check for exact match
    const exactMatch = permissions.some(p =>
      p.resource === required.resource &&
      p.action === required.action &&
      (!scope || p.scope?.id === scope)
    );
    if (exactMatch) return true;

    // Check for wildcard resource
    const wildcardMatch = permissions.some(p =>
      p.resource === '*' &&
      p.action === required.action
    );
    return wildcardMatch;
  }

  /**
   * Invalidate permission cache for all users with a role
   */
  private invalidatePermissionCacheForRole(roleId: string): void {
    for (const [userId, assignments] of this.assignments.entries()) {
      if (assignments.some(a => a.roleId === roleId)) {
        this.userPermissions.delete(userId);
      }
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.userPermissions.clear();
  }

  /**
   * Export RBAC configuration
   */
  exportConfiguration(): string {
    const data = {
      roles: Array.from(this.roles.values()),
      assignments: Array.from(this.assignments.entries()).flatMap(([userId, assignments]) =>
        assignments.map(a => ({ userId, ...a }))
      )
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import RBAC configuration
   */
  importConfiguration(json: string): void {
    const data = JSON.parse(json);

    // Clear existing
    this.roles.clear();
    this.assignments.clear();
    this.userPermissions.clear();

    // Import roles
    for (const role of data.roles) {
      this.roles.set(role.id, role);
    }

    // Import assignments
    for (const assignment of data.assignments) {
      const { userId, ...rest } = assignment;
      let assignments = this.assignments.get(userId) || [];
      assignments.push(rest);
      this.assignments.set(userId, assignments);
    }
  }
}

/**
 * Singleton instance
 */
export const rbacManager = new RBACManager();
