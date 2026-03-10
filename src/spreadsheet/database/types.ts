/**
 * Database Types for POLLN Spreadsheet System
 *
 * Complete type definitions for database entities, DTOs, and interfaces.
 */

import type { CellType, CellState, LogicLevel, SensationType } from '../core/types.js';

// ============================================================================
// Cell Entity Types
// ============================================================================

/**
 * Database cell entity
 */
export interface Cell {
  id: string;
  spreadsheetId: string;
  row: number;
  col: number;
  type: CellType;
  state: CellState;
  value: CellValue;
  formula: string | null;
  logicLevel: LogicLevel;
  metadata: Record<string, unknown>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt: Date | null;
}

/**
 * Cell value types
 */
export type CellValue =
  | string
  | number
  | boolean
  | null
  | CellValue[]
  | { [key: string]: CellValue };

/**
 * DTO for creating a cell
 */
export interface CreateCellDTO {
  id?: string;
  spreadsheetId: string;
  row: number;
  col: number;
  type: CellType;
  value?: CellValue;
  formula?: string | null;
  logicLevel?: LogicLevel;
  metadata?: Record<string, unknown>;
}

/**
 * DTO for updating a cell
 */
export interface UpdateCellDTO {
  value?: CellValue;
  formula?: string | null;
  state?: CellState;
  logicLevel?: LogicLevel;
  metadata?: Record<string, unknown>;
}

/**
 * DTO for batch updates
 */
export interface BatchUpdateDTO {
  id: string;
  updates: UpdateCellDTO;
  expectedVersion?: number;
}

/**
 * Cell range reference
 */
export interface CellRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

// ============================================================================
// Spreadsheet Entity Types
// ============================================================================

/**
 * Permission levels
 */
export enum PermissionLevel {
  OWNER = 'owner',
  EDIT = 'edit',
  COMMENT = 'comment',
  VIEW = 'view',
}

/**
 * Spreadsheet entity
 */
export interface Spreadsheet {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  rowCount: number;
  colCount: number;
  metadata: Record<string, unknown>;
  settings: SpreadsheetSettings;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
}

/**
 * Spreadsheet settings
 */
export interface SpreadsheetSettings {
  autoSave: boolean;
  autoSaveInterval: number;
  iterationEnabled: boolean;
  iterationMaxIterations: number;
  calculationMode: 'automatic' | 'manual' | 'semi-automatic';
  protectedRanges: ProtectedRange[];
}

/**
 * Protected range
 */
export interface ProtectedRange {
  id: string;
  name: string;
  range: CellRange;
  permission: PermissionLevel;
  userId?: string;
}

/**
 * DTO for creating a spreadsheet
 */
export interface CreateSpreadsheetDTO {
  name: string;
  description?: string | null;
  ownerId: string;
  rowCount?: number;
  colCount?: number;
  metadata?: Record<string, unknown>;
  settings?: Partial<SpreadsheetSettings>;
}

/**
 * DTO for updating a spreadsheet
 */
export interface UpdateSpreadsheetDTO {
  name?: string;
  description?: string | null;
  rowCount?: number;
  colCount?: number;
  metadata?: Record<string, unknown>;
  settings?: Partial<SpreadsheetSettings>;
}

// ============================================================================
// User Entity Types
// ============================================================================

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  provider: AuthProvider;
  providerId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

/**
 * Auth providers
 */
export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  GITHUB = 'github',
  MICROSOFT = 'microsoft',
}

/**
 * DTO for creating a user
 */
export interface CreateUserDTO {
  email: string;
  username?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  provider: AuthProvider;
  providerId: string;
  metadata?: Record<string, unknown>;
}

/**
 * DTO for updating a user
 */
export interface UpdateUserDTO {
  username?: string | null;
  displayName?: string;
  avatarUrl?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Session entity
 */
export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string | null;
  expiresAt: Date;
  createdAt: Date;
  lastAccessedAt: Date;
  metadata: Record<string, unknown>;
}

/**
 * DTO for creating a session
 */
export interface CreateSessionDTO {
  userId: string;
  token: string;
  refreshToken?: string | null;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Permission Entity Types
// ============================================================================

/**
 * Spreadsheet permission
 */
export interface SpreadsheetPermission {
  id: string;
  spreadsheetId: string;
  userId: string;
  permissionLevel: PermissionLevel;
  grantedBy: string;
  grantedAt: Date;
  expiresAt: Date | null;
}

/**
 * DTO for granting permission
 */
export interface GrantPermissionDTO {
  spreadsheetId: string;
  userId: string;
  permissionLevel: PermissionLevel;
  grantedBy: string;
  expiresAt?: Date | null;
}

// ============================================================================
// Share Link Types
// ============================================================================

/**
 * Share link entity
 */
export interface ShareLink {
  id: string;
  spreadsheetId: string;
  token: string;
  permissionLevel: PermissionLevel;
  createdBy: string;
  expiresAt: Date | null;
  maxUses: number | null;
  useCount: number;
  createdAt: Date;
}

/**
 * DTO for creating a share link
 */
export interface CreateShareLinkDTO {
  spreadsheetId: string;
  permissionLevel: PermissionLevel;
  createdBy: string;
  expiresAt?: Date | null;
  maxUses?: number | null;
}

// ============================================================================
// Audit Log Types
// ============================================================================

/**
 * Audit event types
 */
export enum AuditEventType {
  CELL_CREATED = 'cell.created',
  CELL_UPDATED = 'cell.updated',
  CELL_DELETED = 'cell.deleted',
  CELL_EXECUTED = 'cell.executed',
  SPREADSHEET_CREATED = 'spreadsheet.created',
  SPREADSHEET_UPDATED = 'spreadsheet.updated',
  SPREADSHEET_DELETED = 'spreadsheet.deleted',
  SPREADSHEET_ACCESSED = 'spreadsheet.accessed',
  PERMISSION_GRANTED = 'permission.granted',
  PERMISSION_REVOKED = 'permission.revoked',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_CREATED = 'user.created',
  SHARE_LINK_CREATED = 'share_link.created',
  SHARE_LINK_ACCESSED = 'share_link.accessed',
  EXPORT_CREATED = 'export.created',
  IMPORT_COMPLETED = 'import.completed',
}

/**
 * Audit log entity
 */
export interface AuditLog {
  id: string;
  eventType: AuditEventType;
  userId: string | null;
  spreadsheetId: string | null;
  cellId: string | null;
  resourceId: string | null;
  action: string;
  details: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}

/**
 * DTO for creating an audit log
 */
export interface CreateAuditLogDTO {
  eventType: AuditEventType;
  userId?: string | null;
  spreadsheetId?: string | null;
  cellId?: string | null;
  resourceId?: string | null;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Query filters for audit logs
 */
export interface AuditLogQuery {
  userId?: string;
  spreadsheetId?: string;
  cellId?: string;
  eventType?: AuditEventType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Migration Types
// ============================================================================

/**
 * Migration entity
 */
export interface Migration {
  id: string;
  name: string;
  version: number;
  executedAt: Date | null;
  checksum: string;
}

/**
 * Migration function interface
 */
export interface MigrationFunction {
  up: (client: any) => Promise<void>;
  down: (client: any) => Promise<void>;
}

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Transaction interface
 */
export interface Transaction {
  query: (text: string, params?: any[]) => Promise<any>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

// ============================================================================
// Health Check Types
// ============================================================================

/**
 * Health status
 */
export interface HealthStatus {
  healthy: boolean;
  database: {
    connected: boolean;
    latency: number;
    poolSize: number;
    availableConnections: number;
  };
  cache: {
    connected: boolean;
    latency: number;
    memoryUsage: string;
    hitRate: number;
  };
  timestamp: Date;
}

// ============================================================================
// Export/Import Types
// ============================================================================

/**
 * Export format
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  XLSX = 'xlsx',
  PDF = 'pdf',
}

/**
 * Export entity
 */
export interface Export {
  id: string;
  spreadsheetId: string;
  userId: string;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl: string | null;
  fileSize: number | null;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * DTO for creating an export
 */
export interface CreateExportDTO {
  spreadsheetId: string;
  userId: string;
  format: ExportFormat;
}

/**
 * Import entity
 */
export interface Import {
  id: string;
  spreadsheetId: string | null;
  userId: string;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileSize: number;
  rowsImported: number | null;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * DTO for creating an import
 */
export interface CreateImportDTO {
  spreadsheetId?: string | null;
  userId: string;
  format: ExportFormat;
  fileSize: number;
}

// ============================================================================
// Cell History Types
// ============================================================================

/**
 * Cell history entity
 */
export interface CellHistory {
  id: string;
  cellId: string;
  version: number;
  value: CellValue;
  formula: string | null;
  changedBy: string | null;
  changedAt: Date;
}

/**
 * DTO for creating cell history
 */
export interface CreateCellHistoryDTO {
  cellId: string;
  version: number;
  value: CellValue;
  formula?: string | null;
  changedBy?: string | null;
}

// ============================================================================
// Cache Types
// ============================================================================

/**
 * Cache entry
 */
export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
}

/**
 * Cache options
 */
export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

// ============================================================================
// Query Builder Types
// ============================================================================

/**
 * Sort order
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Sort options
 */
export interface SortOptions {
  field: string;
  order: SortOrder;
}
