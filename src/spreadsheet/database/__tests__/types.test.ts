/**
 * Tests for database types and interfaces
 */

import { describe, it, expect } from '@jest/globals';
import {
  PermissionLevel,
  AuditEventType,
  ExportFormat,
  AuthProvider,
  type Cell,
  type Spreadsheet,
  type User,
  type Session,
  type AuditLog,
} from '../types.js';
import { CellType, CellState } from '../../core/types.js';

describe('Database Types', () => {
  describe('Cell type', () => {
    it('should have correct structure', () => {
      const cell: Cell = {
        id: 'cell-1',
        spreadsheetId: 'sheet-1',
        row: 1,
        col: 1,
        type: CellType.INPUT,
        state: CellState.DORMANT,
        value: 42,
        formula: null,
        logicLevel: 0,
        metadata: {},
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastExecutedAt: null,
      };

      expect(cell.id).toBeDefined();
      expect(cell.spreadsheetId).toBeDefined();
      expect(cell.row).toBe(1);
      expect(cell.col).toBe(1);
    });

    it('should support complex value types', () => {
      const cell: Cell = {
        id: 'cell-2',
        spreadsheetId: 'sheet-1',
        row: 2,
        col: 1,
        type: CellType.TRANSFORM,
        state: CellState.PROCESSING,
        value: { nested: { data: [1, 2, 3] } },
        formula: '=ARRAY(1,2,3)',
        logicLevel: 1,
        metadata: {},
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastExecutedAt: new Date(),
      };

      expect(typeof cell.value).toBe('object');
      expect(Array.isArray((cell.value as any).nested.data)).toBe(true);
    });
  });

  describe('Spreadsheet type', () => {
    it('should have correct structure', () => {
      const spreadsheet: Spreadsheet = {
        id: 'sheet-1',
        name: 'Test Spreadsheet',
        description: 'A test spreadsheet',
        ownerId: 'user-1',
        rowCount: 1000,
        colCount: 26,
        metadata: {},
        settings: {
          autoSave: true,
          autoSaveInterval: 30000,
          iterationEnabled: false,
          iterationMaxIterations: 100,
          calculationMode: 'automatic',
          protectedRanges: [],
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
      };

      expect(spreadsheet.id).toBeDefined();
      expect(spreadsheet.settings.autoSave).toBe(true);
      expect(spreadsheet.settings.calculationMode).toBe('automatic');
    });
  });

  describe('User type', () => {
    it('should have correct structure', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
        provider: AuthProvider.LOCAL,
        providerId: 'local-123',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.provider).toBe(AuthProvider.LOCAL);
    });
  });

  describe('Session type', () => {
    it('should have correct structure', () => {
      const session: Session = {
        id: 'session-1',
        userId: 'user-1',
        token: 'secret-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        metadata: {},
      };

      expect(session.id).toBeDefined();
      expect(session.token).toBeDefined();
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('AuditLog type', () => {
    it('should have correct structure', () => {
      const auditLog: AuditLog = {
        id: 'audit-1',
        eventType: AuditEventType.CELL_CREATED,
        userId: 'user-1',
        spreadsheetId: 'sheet-1',
        cellId: 'cell-1',
        resourceId: null,
        action: 'create_cell',
        details: { value: 42 },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
      };

      expect(auditLog.id).toBeDefined();
      expect(auditLog.eventType).toBe(AuditEventType.CELL_CREATED);
      expect(auditLog.details.value).toBe(42);
    });
  });

  describe('Enums', () => {
    it('PermissionLevel should have correct values', () => {
      expect(PermissionLevel.OWNER).toBe('owner');
      expect(PermissionLevel.EDIT).toBe('edit');
      expect(PermissionLevel.COMMENT).toBe('comment');
      expect(PermissionLevel.VIEW).toBe('view');
    });

    it('AuditEventType should have various event types', () => {
      expect(AuditEventType.CELL_CREATED).toBe('cell.created');
      expect(AuditEventType.USER_LOGIN).toBe('user.login');
      expect(AuditEventType.PERMISSION_GRANTED).toBe('permission.granted');
    });

    it('ExportFormat should have correct values', () => {
      expect(ExportFormat.JSON).toBe('json');
      expect(ExportFormat.CSV).toBe('csv');
      expect(ExportFormat.XLSX).toBe('xlsx');
      expect(ExportFormat.PDF).toBe('pdf');
    });

    it('AuthProvider should have correct values', () => {
      expect(AuthProvider.LOCAL).toBe('local');
      expect(AuthProvider.GOOGLE).toBe('google');
      expect(AuthProvider.GITHUB).toBe('github');
      expect(AuthProvider.MICROSOFT).toBe('microsoft');
    });
  });
});

describe('Type Compatibility', () => {
  it('should be compatible with core cell types', () => {
    // This test ensures database types are compatible with core cell types
    const dbCell: Cell = {
      id: 'cell-1',
      spreadsheetId: 'sheet-1',
      row: 1,
      col: 1,
      type: CellType.ANALYSIS, // From core types
      state: CellState.PROCESSING, // From core types
      value: null,
      formula: '=ANALYZE(A1:A10)',
      logicLevel: 2, // L2_AGENT
      metadata: {},
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastExecutedAt: null,
    };

    expect(dbCell.type).toBe(CellType.ANALYSIS);
    expect(dbCell.state).toBe(CellState.PROCESSING);
    expect(dbCell.logicLevel).toBe(2);
  });
});
