/**
 * POLLN Spreadsheet Database Layer
 *
 * Comprehensive database layer for spreadsheet operations with:
 * - PostgreSQL connection pooling
 * - Redis caching
 * - Transaction support
 * - Migration system
 * - Audit logging
 * - Full TypeScript types
 *
 * @module spreadsheet/database
 */

// ========================================================================
// Types
// ========================================================================

export * from './types.js';

// ========================================================================
// Errors
// ========================================================================

export * from './errors.js';

// ========================================================================
// Database Manager
// ========================================================================

export { DatabaseManager } from './DatabaseManager.js';
export type { DatabaseConfig, CacheConfig, DatabaseManagerConfig } from './DatabaseManager.js';

// ========================================================================
// Repositories
// ========================================================================

export { CellRepository } from './CellRepository.js';
export { SpreadsheetRepository } from './SpreadsheetRepository.js';
export { UserRepository } from './UserRepository.js';
export { AuditRepository } from './AuditRepository.js';

// ========================================================================
// Migrations
// ========================================================================

export { MigrationRunner, registerMigration } from './Migrations.js';
export type { MigrationFunction } from './types.js';
