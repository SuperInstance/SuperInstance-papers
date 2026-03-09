/**
 * POLLN Migration Engine
 *
 * Handles version migration for cell networks, transforming data between
 * different format versions while preserving data integrity.
 */

import type {
  CellId,
  CellType,
  CellState,
} from '../core/types.js';
import type {
  NetworkExport,
  SerializableCell,
  MigrationResult,
  ValidationResult,
} from './types.js';
import { SchemaValidator } from './SchemaValidator.js';

/**
 * Migration rule definition
 */
interface MigrationRule {
  fromVersion: string;
  toVersion: string;
  transform: (data: NetworkExport) => Promise<NetworkExport>;
  description: string;
}

/**
 * Migration engine for version compatibility
 */
export class MigrationEngine {
  private rules: Map<string, MigrationRule> = new Map();
  private migrationPath: string[][] = [];

  constructor() {
    this.registerDefaultRules();
    this.buildMigrationPaths();
  }

  /**
   * Migrate a network to a target version
   */
  public async migrate(
    data: NetworkExport,
    targetVersion: string,
    progressCallback?: (current: number, total: number, message: string) => void
  ): Promise<MigrationResult> {
    const fromVersion = data.version;

    // Validate input
    const validator = new SchemaValidator();
    const validationResult = validator.validateNetwork(data);

    if (!validationResult.valid && validationResult.errors.some(e => e.severity === 'critical')) {
      return {
        success: false,
        fromVersion,
        toVersion: targetVersion,
        migratedCells: 0,
        failedMigrations: 0,
        transformations: [],
        warnings: validationResult.errors.map(e => e.message),
      };
    }

    // Find migration path
    const path = this.findMigrationPath(fromVersion, targetVersion);

    if (!path) {
      return {
        success: false,
        fromVersion,
        toVersion: targetVersion,
        migratedCells: 0,
        failedMigrations: 0,
        transformations: [],
        warnings: [`No migration path from ${fromVersion} to ${targetVersion}`],
      };
    }

    // Execute migrations
    let currentData = data;
    const transformations: MigrationResult['transformations'] = [];
    const warnings: string[] = [];
    let failedMigrations = 0;

    for (let i = 0; i < path.length; i++) {
      const version = path[i];
      const rule = this.rules.get(version);

      if (!rule) {
        failedMigrations++;
        warnings.push(`Missing migration rule for version ${version}`);
        continue;
      }

      try {
        progressCallback?.(i + 1, path.length, `Migrating to ${rule.toVersion}`);
        currentData = await rule.transform(currentData);

        transformations.push({
          type: 'version_migration',
          description: rule.description,
          affectedCells: currentData.cells.map(c => c.id),
        });
      } catch (error) {
        failedMigrations++;
        warnings.push(`Migration to ${rule.toVersion} failed: ${error}`);
      }
    }

    const success = failedMigrations === 0;
    const migratedCells = success ? currentData.cells.length : 0;

    return {
      success,
      fromVersion,
      toVersion: targetVersion,
      migratedCells,
      failedMigrations,
      transformations,
      warnings,
    };
  }

  /**
   * Check if migration is needed
   */
  public needsMigration(version: string, targetVersion?: string): boolean {
    const target = targetVersion || SchemaValidator.getCurrentVersion();
    return version !== target;
  }

  /**
   * Get available migration paths
   */
  public getMigrationPaths(fromVersion: string, toVersion: string): string[][] {
    return this.migrationPath.filter(path =>
      path[0] === fromVersion && path[path.length - 1] === toVersion
    );
  }

  /**
   * Register a custom migration rule
   */
  public registerRule(rule: MigrationRule): void {
    const key = `${rule.fromVersion}->${rule.toVersion}`;
    this.rules.set(key, rule);
    this.buildMigrationPaths();
  }

  /**
   * Find shortest migration path
   */
  private findMigrationPath(fromVersion: string, toVersion: string): string[] | null {
    const validPaths = this.getMigrationPaths(fromVersion, toVersion);

    if (validPaths.length === 0) {
      return null;
    }

    // Return shortest path
    return validPaths.reduce((shortest, path) =>
      path.length < shortest.length ? path : shortest
    );
  }

  /**
   * Build migration path graph
   */
  private buildMigrationPaths(): void {
    // This is a simplified version - in production you'd use Dijkstra's algorithm
    // or similar to find optimal paths
    this.migrationPath = [];

    const versions = new Set<string>();
    for (const [key] of this.rules) {
      const [from] = key.split('->');
      versions.add(from);
    }

    // Build paths using BFS
    for (const start of versions) {
      const queue: Array<{ version: string; path: string[] }> = [
        { version: start, path: [start] },
      ];

      while (queue.length > 0) {
        const { version, path } = queue.shift()!;

        for (const [key, rule] of this.rules) {
          const [from, to] = key.split('->');
          if (from === version && !path.includes(to)) {
            const newPath = [...path, to];
            this.migrationPath.push(newPath);
            queue.push({ version: to, path: newPath });
          }
        }
      }
    }
  }

  /**
   * Register default migration rules
   */
  private registerDefaultRules(): void {
    // 0.8.0 -> 0.9.0
    this.registerRule({
      fromVersion: '0.8.0',
      toVersion: '0.9.0',
      description: 'Add self-awareness field to origin',
      transform: async (data) => {
        return {
          ...data,
          version: '0.9.0',
          cells: data.cells.map(cell => ({
            ...cell,
            origin: {
              ...cell.origin,
              selfAwareness: cell.origin.selfAwareness ?? 0,
            },
          })),
        };
      },
    });

    // 0.9.0 -> 1.0.0
    this.registerRule({
      fromVersion: '0.9.0',
      toVersion: '1.0.0',
      description: 'Add metadata and performance tracking',
      transform: async (data) => {
        return {
          ...data,
          version: '1.0.0',
          formatVersion: '1.0.0',
          metadata: {
            name: data.metadata?.name || 'Migrated Network',
            description: data.metadata?.description,
            version: '1.0.0',
            formatVersion: '1.0.0',
            createdAt: data.metadata?.createdAt || Date.now(),
            updatedAt: Date.now(),
            author: data.metadata?.author,
            tags: data.metadata?.tags || [],
            dimensions: this.calculateDimensions(data.cells),
            statistics: this.calculateStatistics(data.cells),
          },
          cells: data.cells.map(cell => ({
            ...cell,
            updatedAt: Date.now(),
            version: cell.version ?? 1,
            performance: cell.performance || {
              totalExecutions: 0,
              successfulExecutions: 0,
              failedExecutions: 0,
              averageDuration: 0,
            },
          })),
        };
      },
    });
  }

  /**
   * Calculate network dimensions
   */
  private calculateDimensions(cells: SerializableCell[]) {
    let maxRow = 0;
    let maxCol = 0;

    for (const cell of cells) {
      maxRow = Math.max(maxRow, cell.position.row);
      maxCol = Math.max(maxCol, cell.position.col);
    }

    return { rows: maxRow + 1, cols: maxCol + 1 };
  }

  /**
   * Calculate network statistics
   */
  private calculateStatistics(cells: SerializableCell[]) {
    const cellsByType: Record<string, number> = {};

    for (const cell of cells) {
      cellsByType[cell.type] = (cellsByType[cell.type] || 0) + 1;
    }

    return {
      totalCells: cells.length,
      cellsByType: cellsByType as any,
      totalConnections: 0, // Would need to analyze connections
    };
  }

  /**
   * Validate migrated data
   */
  public async validateMigration(data: NetworkExport): Promise<ValidationResult> {
    const validator = new SchemaValidator();
    return validator.validateNetwork(data);
  }

  /**
   * Rollback a migration
   */
  public async rollback(
    data: NetworkExport,
    targetVersion: string
  ): Promise<NetworkExport | null> {
    // Find reverse migration path
    const reverseRules = new Map<string, MigrationRule>();

    for (const [key, rule] of this.rules) {
      const reverseKey = `${rule.toVersion}->${rule.fromVersion}`;
      // Note: Reverse transformations would need to be implemented
      // This is a placeholder for the concept
    }

    // For now, return null as rollback is not fully implemented
    return null;
  }

  /**
   * Get migration history
   */
  public getMigrationHistory(): Array<{
    fromVersion: string;
    toVersion: string;
    description: string;
  }> {
    return Array.from(this.rules.values()).map(rule => ({
      fromVersion: rule.fromVersion,
      toVersion: rule.toVersion,
      description: rule.description,
    }));
  }

  /**
   * Export migration state for persistence
   */
  public exportState(): string {
    return JSON.stringify({
      rules: Array.from(this.rules.entries()),
      paths: this.migrationPath,
    });
  }

  /**
   * Import migration state
   */
  public importState(stateJson: string): void {
    try {
      const state = JSON.parse(stateJson);
      this.rules = new Map(state.rules);
      this.migrationPath = state.paths || [];
    } catch (error) {
      throw new Error(`Failed to import migration state: ${error}`);
    }
  }
}

/**
 * Singleton instance
 */
let migrationEngineInstance: MigrationEngine | null = null;

/**
 * Get the singleton migration engine instance
 */
export function getMigrationEngine(): MigrationEngine {
  if (!migrationEngineInstance) {
    migrationEngineInstance = new MigrationEngine();
  }
  return migrationEngineInstance;
}

/**
 * Reset the migration engine instance
 */
export function resetMigrationEngine(): void {
  migrationEngineInstance = null;
}
