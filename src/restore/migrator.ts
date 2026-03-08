/**
 * Restore Migrator
 * Handles version migrations for backup data
 */

import type {
  MigrationRule,
  MigrationResult,
  ColonyBackupData,
  IncrementalBackupData
} from './types.js';

/**
 * RestoreMigrator - Backup version migration
 */
export class RestoreMigrator {
  private migrations: Map<string, MigrationRule>;

  constructor() {
    this.migrations = new Map();
    this.registerMigrations();
  }

  /**
   * Migrate backup data if needed
   */
  async migrateIfNeeded(
    data: ColonyBackupData | IncrementalBackupData
  ): Promise<MigrationResult> {
    const currentVersion = '1.0.0';
    const backupVersion = data.version || '1.0.0';

    if (backupVersion === currentVersion) {
      return {
        success: true,
        fromVersion: backupVersion,
        toVersion: currentVersion,
        transformations: [],
        warnings: [],
        data
      };
    }

    // Find migration path
    const migrationPath = this.findMigrationPath(backupVersion, currentVersion);

    if (!migrationPath) {
      return {
        success: false,
        fromVersion: backupVersion,
        toVersion: currentVersion,
        transformations: [],
        warnings: [`No migration path from ${backupVersion} to ${currentVersion}`],
        data
      };
    }

    // Apply migrations
    let migratedData = data;
    const transformations: string[] = [];
    const warnings: string[] = [];

    for (const migration of migrationPath) {
      try {
        migratedData = await this.applyMigration(migratedData, migration);
        transformations.push(
          `${migration.fromVersion} -> ${migration.toVersion}: ${migration.description}`
        );

        if (migration.manualSteps) {
          warnings.push(
            `Manual steps required for ${migration.fromVersion} -> ${migration.toVersion}: ` +
            migration.manualSteps.join(', ')
          );
        }
      } catch (error) {
        return {
          success: false,
          fromVersion: backupVersion,
          toVersion: currentVersion,
          transformations,
          warnings: [`Migration failed: ${error}`],
          data: migratedData
        };
      }
    }

    return {
      success: true,
      fromVersion: backupVersion,
      toVersion: currentVersion,
      transformations,
      warnings,
      data: migratedData
    };
  }

  /**
   * Find migration path between versions
   */
  private findMigrationPath(fromVersion: string, toVersion: string): MigrationRule[] {
    const path: MigrationRule[] = [];
    let currentVersion = fromVersion;

    while (currentVersion !== toVersion) {
      const migration = this.migrations.get(`${currentVersion}->${toVersion}`);

      if (!migration) {
        // Try intermediate versions
        const intermediate = this.findIntermediateMigration(currentVersion, toVersion);
        if (!intermediate) {
          return [];
        }
        path.push(intermediate);
        currentVersion = intermediate.toVersion;
      } else {
        path.push(migration);
        currentVersion = toVersion;
      }
    }

    return path;
  }

  /**
   * Find intermediate migration step
   */
  private findIntermediateMigration(fromVersion: string, toVersion: string): MigrationRule | null {
    for (const [key, migration] of this.migrations) {
      if (migration.fromVersion === fromVersion && migration.toVersion !== toVersion) {
        return migration;
      }
    }
    return null;
  }

  /**
   * Apply migration to data
   */
  private async applyMigration(
    data: ColonyBackupData | IncrementalBackupData,
    migration: MigrationRule
  ): Promise<ColonyBackupData | IncrementalBackupData> {
    let migratedData = { ...data };

    for (const transformation of migration.transformations) {
      migratedData = this.applyTransformation(migratedData, transformation);
    }

    // Update version
    migratedData.version = migration.toVersion;

    return migratedData;
  }

  /**
   * Apply single transformation
   */
  private applyTransformation(
    data: any,
    transformation: any
  ): any {
    const { path, type } = transformation;

    switch (type) {
      case 'RENAME':
        return this.renameField(data, path, transformation.from, transformation.to);

      case 'DELETE':
        return this.deleteField(data, path);

      case 'TRANSFORM':
        return this.transformField(data, path, transformation.transform);

      case 'MOVE':
        return this.moveField(data, path, transformation.to);

      case 'DEFAULT':
        return this.setDefaultValue(data, path, transformation.defaultValue);

      default:
        return data;
    }
  }

  private renameField(data: any, path: string, from: string, to: string): any {
    // Simplified implementation
    if (path === 'colony.config.gardenerId' && data.colony?.config?.[from]) {
      data.colony.config[to] = data.colony.config[from];
      delete data.colony.config[from];
    }
    return data;
  }

  private deleteField(data: any, path: string): any {
    // Simplified implementation
    const parts = path.split('.');
    let current = data;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]]) {
        current = current[parts[i]];
      }
    }
    if (current[parts[parts.length - 1]]) {
      delete current[parts[parts.length - 1]];
    }
    return data;
  }

  private transformField(data: any, path: string, transform: (value: unknown) => unknown): any {
    // Simplified implementation
    return data;
  }

  private moveField(data: any, fromPath: string, toPath: string): any {
    // Simplified implementation
    return data;
  }

  private setDefaultValue(data: any, path: string, defaultValue: unknown): any {
    // Simplified implementation
    return data;
  }

  /**
   * Register available migrations
   */
  private registerMigrations(): void {
    // Example migration: 0.9.0 -> 1.0.0
    this.migrations.set('0.9.0->1.0.0', {
      fromVersion: '0.9.0',
      toVersion: '1.0.0',
      description: 'Upgrade from version 0.9.0 to 1.0.0',
      transformations: [
        {
          path: 'colony.config',
          type: 'RENAME',
          from: 'gardenerId',
          to: 'gardenerId'
        },
        {
          path: 'agents',
          type: 'DEFAULT',
          defaultValue: []
        }
      ],
      manualSteps: [
        'Review agent configurations after migration',
        'Verify value network parameters'
      ]
    });

    // Add more migrations as needed
  }

  /**
   * Get available migrations
   */
  getAvailableMigrations(): MigrationRule[] {
    return Array.from(this.migrations.values());
  }

  /**
   * Add custom migration
   */
  addMigration(migration: MigrationRule): void {
    const key = `${migration.fromVersion}->${migration.toVersion}`;
    this.migrations.set(key, migration);
  }
}
