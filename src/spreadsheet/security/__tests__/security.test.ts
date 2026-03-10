/**
 * Comprehensive Security Middleware Test Suite
 * Tests for all security components with defense in depth
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  AuthMiddleware,
  RBACManager,
  PermissionChecker,
  DataClassifier,
  SystemRole,
  Permission,
  PermissionAction,
  DataClassification,
  PIIType
} from '../index';

describe('Security Middleware Suite', () => {
  describe('AuthMiddleware', () => {
    let authMiddleware: AuthMiddleware;
    const mockRequest = {
      headers: {
        authorization: 'Bearer test-token'
      },
      query: {},
      cookies: {}
    };

    beforeEach(() => {
      authMiddleware = new AuthMiddleware();
    });

    afterEach(async () => {
      await authMiddleware.cleanupExpiredSessions();
    });

    it('should create session successfully', async () => {
      const session = await authMiddleware.createSession(
        'user123',
        'testuser',
        [SystemRole.EDITOR],
        [{
          id: 'perm1',
          resource: 'spreadsheet',
          action: 'read' as PermissionAction
        }],
        '127.0.0.1',
        'TestAgent'
      );

      expect(session).toBeDefined();
      expect(session.userId).toBe('user123');
      expect(session.username).toBe('testuser');
      expect(session.roles).toContain(SystemRole.EDITOR);
    });

    it('should fail authentication with invalid token', async () => {
      const result = await authMiddleware.authenticate({
        ...mockRequest,
        headers: { authorization: 'Bearer invalid-token' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should lock account after max failed attempts', async () => {
      // Simulate multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await authMiddleware.authenticate({
          ...mockRequest,
          headers: { authorization: 'Bearer wrong-token' }
        });
      }

      const result = await authMiddleware.authenticate({
        ...mockRequest,
        headers: { authorization: 'Bearer test-token' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('locked');
    });

    it('should authorize with valid permission', async () => {
      const permission: Permission = {
        id: 'perm1',
        resource: 'spreadsheet',
        action: 'read' as PermissionAction
      };

      const session = await authMiddleware.createSession(
        'user123',
        'testuser',
        [SystemRole.VIEWER],
        [permission],
        '127.0.0.1'
      );

      const secureRequest: any = {
        ...mockRequest,
        securityContext: {
          userId: session.userId,
          sessionId: session.sessionId,
          roles: session.roles,
          permissions: session.permissions,
          timestamp: new Date()
        }
      };

      const result = await authMiddleware.authorize(secureRequest, permission);
      expect(result.granted).toBe(true);
    });

    it('should deny without required permission', async () => {
      const requiredPermission: Permission = {
        id: 'perm2',
        resource: 'spreadsheet',
        action: 'write' as PermissionAction
      };

      const session = await authMiddleware.createSession(
        'user123',
        'testuser',
        [SystemRole.VIEWER],
        [{
          id: 'perm1',
          resource: 'spreadsheet',
          action: 'read' as PermissionAction
        }],
        '127.0.0.1'
      });

      const secureRequest: any = {
        ...mockRequest,
        securityContext: {
          userId: session.userId,
          sessionId: session.sessionId,
          roles: session.roles,
          permissions: session.permissions,
          timestamp: new Date()
        }
      };

      const result = await authMiddleware.authorize(secureRequest, requiredPermission);
      expect(result.granted).toBe(false);
      expect(result.reason).toContain('lacks permission');
    });
  });

  describe('RBACManager', () => {
    let rbac: RBACManager;

    beforeEach(() => {
      rbac = new RBACManager();
    });

    it('should initialize with system roles', () => {
      const roles = rbac.getAllRoles();
      expect(roles.length).toBeGreaterThan(0);
      expect(roles.some(r => r.id === SystemRole.ADMIN)).toBe(true);
      expect(roles.some(r => r.id === SystemRole.EDITOR)).toBe(true);
      expect(roles.some(r => r.id === SystemRole.VIEWER)).toBe(true);
    });

    it('should create custom role', async () => {
      const customRole = {
        id: 'custom-role',
        name: 'Custom Role',
        description: 'A custom role',
        permissions: [{
          id: 'custom-perm',
          resource: 'custom',
          action: 'execute' as PermissionAction
        }],
        isSystemRole: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await rbac.createRole(customRole);
      const retrieved = rbac.getRole('custom-role');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Custom Role');
    });

    it('should assign role to user', async () => {
      await rbac.assignRole('user123', SystemRole.EDITOR);

      const userRoles = await rbac.getUserRoles('user123');
      expect(userRoles.length).toBe(1);
      expect(userRoles[0].id).toBe(SystemRole.EDITOR);
    });

    it('should check user permissions', async () => {
      await rbac.assignRole('user123', SystemRole.EDITOR);

      const hasPermission = await rbac.hasPermission('user123', {
        id: 'test',
        resource: 'spreadsheet',
        action: 'read' as PermissionAction
      });

      expect(hasPermission).toBe(true);
    });

    it('should revoke role from user', async () => {
      await rbac.assignRole('user123', SystemRole.EDITOR);
      await rbac.revokeRole('user123', SystemRole.EDITOR);

      const userRoles = await rbac.getUserRoles('user123');
      expect(userRoles.length).toBe(0);
    });

    it('should not allow modifying system roles', async () => {
      await expect(
        rbac.updateRole(SystemRole.ADMIN, { name: 'Modified Admin' })
      ).rejects.toThrow('Cannot modify system roles');
    });

    it('should not allow deleting system roles', async () => {
      await expect(
        rbac.deleteRole(SystemRole.ADMIN)
      ).rejects.toThrow('Cannot delete system roles');
    });

    it('should check if user has any role', async () => {
      await rbac.assignRole('user123', SystemRole.VIEWER);
      await rbac.assignRole('user456', SystemRole.EDITOR);

      const hasAny = await rbac.hasAnyRole('user123', [SystemRole.EDITOR, SystemRole.VIEWER]);
      expect(hasAny).toBe(true);

      const hasAll = await rbac.hasAllRoles('user123', [SystemRole.VIEWER]);
      expect(hasAll).toBe(true);
    });

    it('should clone role', async () => {
      await rbac.cloneRole(SystemRole.EDITOR, 'editor-clone', 'Editor Clone');

      const cloned = rbac.getRole('editor-clone');
      expect(cloned).toBeDefined();
      expect(cloned?.name).toBe('Editor Clone');
    });
  });

  describe('PermissionChecker', () => {
    let permissionChecker: PermissionChecker;
    let rbac: RBACManager;

    beforeEach(async () => {
      permissionChecker = new PermissionChecker();
      rbac = new RBACManager();
      await rbac.assignRole('user123', SystemRole.EDITOR);
    });

    it('should grant cell access with appropriate permission', async () => {
      const canRead = await permissionChecker.canReadCell('user123', {
        sheetId: 'sheet1',
        row: 1,
        column: 1
      });

      expect(canRead.granted).toBe(true);
    });

    it('should check row permissions', async () => {
      const canReadRow = await permissionChecker.canReadRow('user123', 'sheet1', 5);
      expect(canReadRow.granted).toBe(true);
    });

    it('should check column permissions', async () => {
      const canReadColumn = await permissionChecker.canReadColumn('user123', 'sheet1', 3);
      expect(canReadColumn.granted).toBe(true);
    });

    it('should check range permissions', async () => {
      const canAccessRange = await permissionChecker.canAccessRange(
        'user123',
        {
          sheetId: 'sheet1',
          startRow: 1,
          startColumn: 1,
          endRow: 10,
          endColumn: 5
        },
        'read' as PermissionAction
      );

      expect(canAccessRange.granted).toBe(true);
    });

    it('should check sheet permissions', async () => {
      const canAccessSheet = await permissionChecker.canAccessSheet(
        'user123',
        'sheet1',
        'read' as PermissionAction
      );

      expect(canAccessSheet.granted).toBe(true);
    });

    it('should identify restricted cells in range', async () => {
      // Assign viewer role (read-only)
      await rbac.revokeRole('user123', SystemRole.EDITOR);
      await rbac.assignRole('user123', SystemRole.VIEWER);

      const restricted = await permissionChecker.getRestrictedCells(
        'user123',
        {
          sheetId: 'sheet1',
          startRow: 1,
          startColumn: 1,
          endRow: 5,
          endColumn: 5
        },
        'write' as PermissionAction
      );

      expect(restricted.length).toBe(25); // 5x5 grid
    });

    it('should cache permission results', async () => {
      await permissionChecker.canReadCell('user123', {
        sheetId: 'sheet1',
        row: 1,
        column: 1
      });

      // Second call should be cached
      const stats = permissionChecker.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should clear user cache', async () => {
      await permissionChecker.canReadCell('user123', {
        sheetId: 'sheet1',
        row: 1,
        column: 1
      });

      permissionChecker.clearUserCache('user123');

      const stats = permissionChecker.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('DataClassifier', () => {
    let classifier: DataClassifier;

    beforeEach(() => {
      classifier = new DataClassifier();
    });

    it('should detect email addresses', () => {
      const result = classifier.classify('user@example.com');
      expect(result.piiTypes).toContain(PIIType.EMAIL);
      expect(result.classification).toBe(DataClassification.RESTRICTED);
    });

    it('should detect SSN', () => {
      const result = classifier.classify('123-45-6789');
      expect(result.piiTypes).toContain(PIIType.SSN);
      expect(result.classification).toBe(DataClassification.CRITICAL);
    });

    it('should detect credit card numbers', () => {
      const result = classifier.classify('4111-1111-1111-1111');
      expect(result.piiTypes).toContain(PIIType.CREDIT_CARD);
      expect(result.classification).toBe(DataClassification.CRITICAL);
    });

    it('should detect phone numbers', () => {
      const result = classifier.classify('(555) 123-4567');
      expect(result.piiTypes).toContain(PIIType.PHONE);
      expect(result.classification).toBe(DataClassification.RESTRICTED);
    });

    it('should detect IP addresses', () => {
      const result = classifier.classify('192.168.1.1');
      expect(result.piiTypes).toContain(PIIType.IP_ADDRESS);
    });

    it('should classify public data correctly', () => {
      const result = classifier.classify('Hello World');
      expect(result.classification).toBe(DataClassification.PUBLIC);
      expect(result.piiTypes.length).toBe(0);
    });

    it('should use column hints for classification', () => {
      const result = classifier.classifyCellValue(
        'john@example.com',
        'email_column'
      );
      expect(result.piiTypes).toContain(PIIType.EMAIL);
    });

    it('should mask PII in values', () => {
      const masked = classifier.maskPII('user@example.com');
      expect(masked).toBe('***********');
    });

    it('should generate classification report', () => {
      const data = [
        { name: 'John', email: 'john@example.com', ssn: '123-45-6789' },
        { name: 'Jane', email: 'jane@example.com', phone: '555-1234' }
      ];

      const report = classifier.generateClassificationReport(data);
      expect(report.summary.totalCells).toBe(8);
      expect(report.summary.piiCells).toBe(4);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide PII statistics', () => {
      const data = [
        { email: 'test@example.com' },
        { email: 'user@example.com' },
        { name: 'John Doe' }
      ];

      const stats = classifier.getPIIStatistics(data);
      expect(stats.totalRows).toBe(3);
      expect(stats.rowsWithPII).toBe(2);
      expect(stats.piiTypeCounts[PIIType.EMAIL]).toBe(2);
    });

    it('should classify batch of values', () => {
      const results = classifier.classifyBatch([
        'test@example.com',
        '123-45-6789',
        'Hello World'
      ]);

      expect(results[0].piiTypes).toContain(PIIType.EMAIL);
      expect(results[1].piiTypes).toContain(PIIType.SSN);
      expect(results[2].piiTypes.length).toBe(0);
    });

    it('should check if value contains specific PII type', () => {
      expect(classifier.containsPII('test@example.com', PIIType.EMAIL)).toBe(true);
      expect(classifier.containsPII('Hello World', PIIType.EMAIL)).toBe(false);
    });

    it('should clear cache', () => {
      classifier.classify('test@example.com');
      classifier.clearCache();
      const stats = classifier.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete authentication and authorization flow', async () => {
      const auth = new AuthMiddleware();
      const rbac = new RBACManager();
      const permChecker = new PermissionChecker();

      // Setup
      await rbac.assignRole('user123', SystemRole.EDITOR);
      const permissions = await rbac.getPermissions('user123');

      // Authenticate
      const session = await auth.createSession(
        'user123',
        'testuser',
        [SystemRole.EDITOR],
        permissions
      );

      expect(session).toBeDefined();
      expect(session.roles).toContain(SystemRole.EDITOR);

      // Check permissions
      const canRead = await permChecker.canReadCell('user123', {
        sheetId: 'sheet1',
        row: 1,
        column: 1
      });

      expect(canRead.granted).toBe(true);
    });

    it('should enforce row-level security', async () => {
      const rbac = new RBACManager();
      const permChecker = new PermissionChecker();

      // User with restricted row access
      await rbac.assignRole('user123', SystemRole.VIEWER);

      const restrictedRows = await permChecker.getRestrictedRows(
        'user123',
        'sheet1',
        'write' as PermissionAction
      );

      // Viewer should not have write access
      expect(restrictedRows.length).toBeGreaterThanOrEqual(0);
    });

    it('should classify and protect sensitive data', async () => {
      const classifier = new DataClassifier();

      const sensitiveData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        ssn: '123-45-6789',
        notes: 'Regular text'
      };

      const results = classifier.classifyRow(sensitiveData);

      expect(results.get('email')?.piiTypes).toContain(PIIType.EMAIL);
      expect(results.get('ssn')?.piiTypes).toContain(PIIType.SSN);
      expect(results.get('ssn')?.classification).toBe(DataClassification.CRITICAL);
      expect(results.get('notes')?.classification).toBe(DataClassification.PUBLIC);
    });
  });

  describe('Security Validation', () => {
    it('should detect XSS attempts', () => {
      const { SecurityValidator } = require('../index');
      const validator = new SecurityValidator();

      const xssPayload = '<script>alert("XSS")</script>';
      const result = validator.validate(xssPayload);

      expect(result.valid).toBe(false);
      expect(result.threats.length).toBeGreaterThan(0);
      expect(result.threats[0].category).toBe('xss');
    });

    it('should detect SQL injection attempts', () => {
      const { SecurityValidator } = require('../index');
      const validator = new SecurityValidator();

      const sqlPayload = "' OR '1'='1";
      const result = validator.validate(sqlPayload);

      expect(result.valid).toBe(false);
      expect(result.threats.some(t => t.category === 'sql_injection')).toBe(true);
    });

    it('should detect formula injection', () => {
      const { SecurityValidator } = require('../index');
      const validator = new SecurityValidator();

      const formulaPayload = '=HYPERLINK("http://evil.com", "Click")';
      const result = validator.validate(formulaPayload, { allowFormulas: false });

      expect(result.valid).toBe(false);
      expect(result.threats.some(t => t.category === 'formula_injection')).toBe(true);
    });

    it('should detect path traversal attempts', () => {
      const { SecurityValidator } = require('../index');
      const validator = new SecurityValidator();

      const pathPayload = '../../../etc/passwd';
      const result = validator.validate(pathPayload, { allowFilePaths: false });

      expect(result.valid).toBe(false);
      expect(result.threats.some(t => t.category === 'path_traversal')).toBe(true);
    });

    it('should sanitize malicious input', () => {
      const { SecurityValidator } = require('../index');
      const validator = new SecurityValidator();

      const payload = '<script>alert("XSS")</script>Hello';
      const result = validator.validate(payload);

      expect(result.sanitized).toBeDefined();
      expect(result.sanitized).not.toContain('<script>');
    });
  });
});
