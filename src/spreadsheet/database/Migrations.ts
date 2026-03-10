/**
 * Migration System for POLLN Spreadsheet Database
 *
 * Handles database schema migrations with version tracking and rollback support.
 */

import type {
  Migration,
  MigrationFunction,
} from './types.js';
import type { DatabaseManager } from './DatabaseManager.js';
import {
  MigrationError,
  MigrationAlreadyAppliedError,
  MigrationNotAppliedError,
  QueryError,
} from './errors.js';
import { createHash } from 'crypto';

// ============================================================================
// Migration Definition
// ============================================================================

/**
 * Migration registry
 */
const migrations: Record<number, MigrationFunction> = {};

/**
 * Register a migration
 *
 * @param version - Migration version
 * @param migration - Migration function
 */
export function registerMigration(version: number, migration: MigrationFunction): void {
  if (migrations[version]) {
    throw new MigrationError(`Migration version ${version} already registered`, `${version}`, {
      version,
    });
  }

  migrations[version] = migration;
}

// ============================================================================
// Migration Runner
// ============================================================================

/**
 * Migration runner class
 */
export class MigrationRunner {
  constructor(private readonly db: DatabaseManager) {}

  // ========================================================================
  // Migration Table Management
  // ========================================================================

  /**
   * Initialize migrations table
   */
  async initialize(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        version INTEGER NOT NULL UNIQUE,
        executed_at TIMESTAMP,
        checksum VARCHAR(64) NOT NULL
      )
    `;

    try {
      await this.db.query(query);
    } catch (error) {
      throw new QueryError('Failed to initialize migrations table', query, [], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get all applied migrations
   */
  async getAppliedMigrations(): Promise<Migration[]> {
    const query = `
      SELECT
        id,
        name,
        version,
        executed_at as "executedAt",
        checksum
      FROM migrations
      ORDER BY version ASC
    `;

    try {
      const result = await this.db.query<Migration>(query);
      return result.rows;
    } catch (error) {
      throw new QueryError('Failed to get applied migrations', query, [], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get latest migration version
   */
  async getLatestVersion(): Promise<number> {
    const query = `
      SELECT MAX(version) as version
      FROM migrations
    `;

    try {
      const result = await this.db.query<{ version: number | null }>(query);
      return result.rows[0].version ?? 0;
    } catch (error) {
      throw new QueryError('Failed to get latest migration version', query, [], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if a migration is applied
   */
  async isApplied(version: number): Promise<boolean> {
    const query = 'SELECT 1 FROM migrations WHERE version = $1';

    try {
      const result = await this.db.query(query, [version]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new QueryError('Failed to check migration status', query, [version], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Record a migration as applied
   */
  async recordMigration(name: string, version: number, checksum: string): Promise<void> {
    const id = `migration_${version}`;

    const query = `
      INSERT INTO migrations (id, name, version, executed_at, checksum)
      VALUES ($1, $2, $3, NOW(), $4)
    `;

    try {
      await this.db.query(query, [id, name, version, checksum]);
    } catch (error) {
      throw new QueryError('Failed to record migration', query, [name, version], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Remove a migration record
   */
  async removeMigration(version: number): Promise<void> {
    const query = 'DELETE FROM migrations WHERE version = $1';

    try {
      await this.db.query(query, [version]);
    } catch (error) {
      throw new QueryError('Failed to remove migration record', query, [version], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ========================================================================
  // Migration Execution
  // ========================================================================

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    await this.initialize();

    const latestVersion = await this.getLatestVersion();
    const pendingVersions = Object.keys(migrations)
      .map(Number)
      .filter((v) => v > latestVersion)
      .sort((a, b) => a - b);

    for (const version of pendingVersions) {
      await this.runMigration(version);
    }
  }

  /**
   * Run a specific migration
   */
  async runMigration(version: number): Promise<void> {
    const migration = migrations[version];

    if (!migration) {
      throw new MigrationError(`Migration version ${version} not found`, `${version}`, {
        version,
      });
    }

    const isApplied = await this.isApplied(version);

    if (isApplied) {
      throw new MigrationAlreadyAppliedError(`${version}`, version);
    }

    const name = `migration_${version}`;
    const checksum = this.calculateChecksum(migration);

    try {
      await this.db.transaction(async (tx) => {
        // Run migration
        await migration.up(tx);

        // Record migration
        const id = `migration_${version}`;
        const query = `
          INSERT INTO migrations (id, name, version, executed_at, checksum)
          VALUES ($1, $2, $3, NOW(), $4)
        `;

        await tx.query(query, [id, name, version, checksum]);
      });
    } catch (error) {
      throw new MigrationError(
        `Failed to run migration ${version}`,
        name,
        {
          originalError: error instanceof Error ? error.message : String(error),
          version,
        }
      );
    }
  }

  /**
   * Rollback a specific migration
   */
  async rollback(version: number): Promise<void> {
    const migration = migrations[version];

    if (!migration) {
      throw new MigrationError(`Migration version ${version} not found`, `${version}`, {
        version,
      });
    }

    const isApplied = await this.isApplied(version);

    if (!isApplied) {
      throw new MigrationNotAppliedError(`${version}`, version);
    }

    try {
      await this.db.transaction(async (tx) => {
        // Run rollback
        await migration.down(tx);

        // Remove migration record
        const query = 'DELETE FROM migrations WHERE version = $1';
        await tx.query(query, [version]);
      });
    } catch (error) {
      throw new MigrationError(
        `Failed to rollback migration ${version}`,
        `migration_${version}`,
        {
          originalError: error instanceof Error ? error.message : String(error),
          version,
        }
      );
    }
  }

  /**
   * Rollback all migrations
   */
  async rollbackAll(): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();

    // Rollback in reverse order
    for (const migration of [...appliedMigrations].reverse()) {
      await this.rollback(migration.version);
    }
  }

  /**
   * Rollback to a specific version
   */
  async rollbackTo(version: number): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();
    const toRollback = appliedMigrations.filter((m) => m.version > version);

    // Rollback in reverse order
    for (const migration of toRollback.reverse()) {
      await this.rollback(migration.version);
    }
  }

  // ========================================================================
  // Migration Status
  // ========================================================================

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    current: number;
    latest: number;
    pending: number[];
    applied: Migration[];
  }> {
    const applied = await this.getAppliedMigrations();
    const current = await this.getLatestVersion();
    const allVersions = Object.keys(migrations).map(Number);
    const latest = Math.max(...allVersions, 0);
    const pending = allVersions.filter((v) => v > current);

    return {
      current,
      latest,
      pending,
      applied,
    };
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Calculate migration checksum
   */
  private calculateChecksum(migration: MigrationFunction): string {
    const upString = migration.up.toString();
    const downString = migration.down.toString();
    const combined = `${upString}${downString}`;

    return createHash('sha256').update(combined).digest('hex');
  }
}

// ============================================================================
// Migrations Registry
// ============================================================================

// Initial schema
registerMigration(1, {
  async up(client) {
    // Users table
    await client.query(`
      CREATE TABLE users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(255) UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        provider VARCHAR(50) NOT NULL DEFAULT 'local',
        provider_id VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMP
      )
    `);

    // Sessions table
    await client.query(`
      CREATE TABLE sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        refresh_token VARCHAR(255) UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_accessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      )
    `);

    // Spreadsheets table
    await client.query(`
      CREATE TABLE spreadsheets (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        row_count INTEGER NOT NULL DEFAULT 1000,
        col_count INTEGER NOT NULL DEFAULT 26,
        metadata JSONB DEFAULT '{}',
        settings JSONB DEFAULT '{}',
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_accessed_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Cells table
    await client.query(`
      CREATE TABLE cells (
        id VARCHAR(255) PRIMARY KEY,
        spreadsheet_id VARCHAR(255) NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
        row INTEGER NOT NULL,
        col INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        state VARCHAR(50) NOT NULL DEFAULT 'dormant',
        value JSONB,
        formula TEXT,
        logic_level INTEGER NOT NULL DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_executed_at TIMESTAMP,
        UNIQUE(spreadsheet_id, row, col)
      )
    `);

    // Cell history table
    await client.query(`
      CREATE TABLE cell_history (
        id VARCHAR(255) PRIMARY KEY,
        cell_id VARCHAR(255) NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        value JSONB,
        formula TEXT,
        changed_by VARCHAR(255) REFERENCES users(id),
        changed_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Spreadsheet permissions table
    await client.query(`
      CREATE TABLE spreadsheet_permissions (
        id VARCHAR(255) PRIMARY KEY,
        spreadsheet_id VARCHAR(255) NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission_level VARCHAR(20) NOT NULL,
        granted_by VARCHAR(255) NOT NULL REFERENCES users(id),
        granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP,
        UNIQUE(spreadsheet_id, user_id)
      )
    `);

    // Share links table
    await client.query(`
      CREATE TABLE share_links (
        id VARCHAR(255) PRIMARY KEY,
        spreadsheet_id VARCHAR(255) NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        permission_level VARCHAR(20) NOT NULL,
        created_by VARCHAR(255) NOT NULL REFERENCES users(id),
        expires_at TIMESTAMP,
        max_uses INTEGER,
        use_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Audit logs table
    await client.query(`
      CREATE TABLE audit_logs (
        id VARCHAR(255) PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        spreadsheet_id VARCHAR(255) REFERENCES spreadsheets(id) ON DELETE SET NULL,
        cell_id VARCHAR(255) REFERENCES cells(id) ON DELETE SET NULL,
        resource_id VARCHAR(255),
        action VARCHAR(255) NOT NULL,
        details JSONB DEFAULT '{}',
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Exports table
    await client.query(`
      CREATE TABLE exports (
        id VARCHAR(255) PRIMARY KEY,
        spreadsheet_id VARCHAR(255) NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id),
        format VARCHAR(10) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        file_url TEXT,
        file_size BIGINT,
        error TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `);

    // Imports table
    await client.query(`
      CREATE TABLE imports (
        id VARCHAR(255) PRIMARY KEY,
        spreadsheet_id VARCHAR(255) REFERENCES spreadsheets(id) ON DELETE SET NULL,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id),
        format VARCHAR(10) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        file_size BIGINT NOT NULL,
        rows_imported INTEGER,
        error TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `);

    // Create indexes
    await client.query('CREATE INDEX idx_cells_spreadsheet ON cells(spreadsheet_id)');
    await client.query('CREATE INDEX idx_cells_position ON cells(spreadsheet_id, row, col)');
    await client.query('CREATE INDEX idx_cell_history_cell ON cell_history(cell_id)');
    await client.query('CREATE INDEX idx_permissions_spreadsheet ON spreadsheet_permissions(spreadsheet_id)');
    await client.query('CREATE INDEX idx_permissions_user ON spreadsheet_permissions(user_id)');
    await client.query('CREATE INDEX idx_share_links_spreadsheet ON share_links(spreadsheet_id)');
    await client.query('CREATE INDEX idx_share_links_token ON share_links(token)');
    await client.query('CREATE INDEX idx_audit_logs_user ON audit_logs(user_id)');
    await client.query('CREATE INDEX idx_audit_logs_spreadsheet ON audit_logs(spreadsheet_id)');
    await client.query('CREATE INDEX idx_audit_logs_cell ON audit_logs(cell_id)');
    await client.query('CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp)');
    await client.query('CREATE INDEX idx_sessions_user ON sessions(user_id)');
    await client.query('CREATE INDEX idx_sessions_token ON sessions(token)');
    await client.query('CREATE INDEX idx_exports_user ON exports(user_id)');
    await client.query('CREATE INDEX idx_imports_user ON imports(user_id)');
  },

  async down(client) {
    // Drop tables in reverse order
    await client.query('DROP TABLE IF EXISTS imports CASCADE');
    await client.query('DROP TABLE IF EXISTS exports CASCADE');
    await client.query('DROP TABLE IF EXISTS audit_logs CASCADE');
    await client.query('DROP TABLE IF EXISTS share_links CASCADE');
    await client.query('DROP TABLE IF EXISTS spreadsheet_permissions CASCADE');
    await client.query('DROP TABLE IF EXISTS cell_history CASCADE');
    await client.query('DROP TABLE IF EXISTS cells CASCADE');
    await client.query('DROP TABLE IF EXISTS spreadsheets CASCADE');
    await client.query('DROP TABLE IF EXISTS sessions CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
  },
});

// Add full-text search
registerMigration(2, {
  async up(client) {
    // Create full-text search index for cells
    await client.query(`
      CREATE INDEX idx_cells_value_fts
      ON cells USING gin(to_tsvector('english', COALESCE(value::text, '')))
    `);

    // Create full-text search index for spreadsheets
    await client.query(`
      CREATE INDEX idx_spreadsheets_name_fts
      ON spreadsheets USING gin(to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')))
    `);
  },

  async down(client) {
    await client.query('DROP INDEX IF EXISTS idx_cells_value_fts');
    await client.query('DROP INDEX IF EXISTS idx_spreadsheets_name_fts');
  },
});
