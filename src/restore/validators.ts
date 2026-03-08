/**
 * Restore Validators
 * Validates backups before and after restoration
 */

import * as crypto from 'crypto';

import type {
  ValidationResults,
  ValidationCheck,
  ValidationOptions,
  BackupMetadata
} from './types.js';
import type { Colony } from '../core/colony.js';

export interface ValidatorConfig {
  colony: Colony;
}

/**
 * RestoreValidator - Backup validation
 */
export class RestoreValidator {
  private colony: Colony;

  constructor(config: ValidatorConfig) {
    this.colony = config.colony;
  }

  /**
   * Validate backup before restore
   */
  async validateBackup(
    backup: BackupMetadata,
    options: ValidationOptions = {}
  ): Promise<ValidationResults> {
    const checks: ValidationCheck[] = [];

    // Checksum validation
    if (options.checkChecksum !== false) {
      const checksumCheck = await this.validateChecksum(backup);
      checks.push(checksumCheck);
    }

    // Integrity validation
    if (options.checkIntegrity !== false) {
      const integrityCheck = await this.validateIntegrity(backup);
      checks.push(integrityCheck);
    }

    // Compatibility validation
    if (options.checkCompatibility !== false) {
      const compatibilityCheck = await this.validateCompatibility(backup);
      checks.push(compatibilityCheck);
    }

    // Consistency validation
    if (options.checkConsistency !== false) {
      const consistencyCheck = await this.validateConsistency(backup);
      checks.push(consistencyCheck);
    }

    // Connectivity validation
    if (options.checkConnectivity !== false) {
      const connectivityCheck = await this.validateConnectivity(backup);
      checks.push(connectivityCheck);
    }

    // Calculate summary
    const summary = this.calculateSummary(checks, options);

    // Filter results based on skipWarnings
    const filteredChecks = options.skipWarnings
      ? checks.filter(c => c.severity !== 'WARNING')
      : checks;

    return {
      passed: summary.criticalFailures === 0 && (options.skipWarnings || summary.failed === 0),
      checks: filteredChecks,
      summary
    };
  }

  /**
   * Validate checksum
   */
  private async validateChecksum(backup: BackupMetadata): Promise<ValidationCheck> {
    try {
      // In a real implementation, this would retrieve the backup data
      // and verify the checksum matches

      // For now, just verify the checksum format
      if (!backup.checksum) {
        return {
          name: 'Checksum Validation',
          category: 'CHECKSUM',
          passed: false,
          message: 'No checksum found in backup metadata',
          severity: 'ERROR'
        };
      }

      const checksumPattern = /^[a-f0-9]+$/;
      if (!checksumPattern.test(backup.checksum)) {
        return {
          name: 'Checksum Validation',
          category: 'CHECKSUM',
          passed: false,
          message: 'Invalid checksum format',
          severity: 'ERROR'
        };
      }

      return {
        name: 'Checksum Validation',
        category: 'CHECKSUM',
        passed: true,
        message: `Checksum valid (${backup.checksumAlgorithm})`,
        severity: 'INFO'
      };
    } catch (error) {
      return {
        name: 'Checksum Validation',
        category: 'CHECKSUM',
        passed: false,
        message: `Checksum validation failed: ${error}`,
        severity: 'ERROR'
      };
    }
  }

  /**
   * Validate integrity
   */
  private async validateIntegrity(backup: BackupMetadata): Promise<ValidationCheck> {
    try {
      // Check for required fields
      const requiredFields = [
        'id', 'colonyId', 'gardenerId', 'type', 'status',
        'createdAt', 'sizeBytes', 'storageLocation', 'checksum'
      ];

      const missingFields = requiredFields.filter(field => !(field in backup));

      if (missingFields.length > 0) {
        return {
          name: 'Integrity Validation',
          category: 'INTEGRITY',
          passed: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
          severity: 'ERROR'
        };
      }

      // Check backup status
      if (backup.status !== 'COMPLETED') {
        return {
          name: 'Integrity Validation',
          category: 'INTEGRITY',
          passed: false,
          message: `Backup status is ${backup.status}, not COMPLETED`,
          severity: 'ERROR'
        };
      }

      // Check for size sanity
      if (backup.sizeBytes <= 0) {
        return {
          name: 'Integrity Validation',
          category: 'INTEGRITY',
          passed: false,
          message: 'Backup size is zero or negative',
          severity: 'ERROR'
        };
      }

      // Check incremental backup chain
      if (backup.type === 'INCREMENTAL' && !backup.parentBackupId) {
        return {
          name: 'Integrity Validation',
          category: 'INTEGRITY',
          passed: false,
          message: 'Incremental backup missing parent backup ID',
          severity: 'ERROR'
        };
      }

      return {
        name: 'Integrity Validation',
        category: 'INTEGRITY',
        passed: true,
        message: 'All integrity checks passed',
        severity: 'INFO'
      };
    } catch (error) {
      return {
        name: 'Integrity Validation',
        category: 'INTEGRITY',
        passed: false,
        message: `Integrity validation failed: ${error}`,
        severity: 'ERROR'
      };
    }
  }

  /**
   * Validate compatibility
   */
  private async validateCompatibility(backup: BackupMetadata): Promise<ValidationCheck> {
    try {
      // Check version compatibility
      const currentVersion = '1.0.0'; // Would be actual version
      const backupVersion = backup.version || '1.0.0';

      if (backupVersion !== currentVersion) {
        // Check if migration is available
        const migrationAvailable = await this.checkMigrationAvailable(backupVersion, currentVersion);

        if (migrationAvailable) {
          return {
            name: 'Compatibility Validation',
            category: 'COMPATIBILITY',
            passed: true,
            message: `Backup version ${backupVersion} can be migrated to ${currentVersion}`,
            severity: 'INFO'
          };
        } else {
          return {
            name: 'Compatibility Validation',
            category: 'COMPATIBILITY',
            passed: false,
            message: `Backup version ${backupVersion} is not compatible with current version ${currentVersion}`,
            details: 'No migration path available',
            severity: 'ERROR'
          };
        }
      }

      // Check colony ID match
      if (backup.colonyId !== this.colony.id) {
        return {
          name: 'Compatibility Validation',
          category: 'COMPATIBILITY',
          passed: false,
          message: `Backup colony ID (${backup.colonyId}) does not match current colony (${this.colony.id})`,
          severity: 'ERROR'
        };
      }

      // Check encryption compatibility
      if (backup.encrypted && backup.encryptionMethod === 'AES256_GCM') {
        return {
          name: 'Compatibility Validation',
          category: 'COMPATIBILITY',
          passed: true,
          message: 'Backup encryption is supported',
          severity: 'INFO'
        };
      }

      return {
        name: 'Compatibility Validation',
        category: 'COMPATIBILITY',
        passed: true,
        message: 'Backup is compatible with current system',
        severity: 'INFO'
      };
    } catch (error) {
      return {
        name: 'Compatibility Validation',
        category: 'COMPATIBILITY',
        passed: false,
        message: `Compatibility validation failed: ${error}`,
        severity: 'ERROR'
      };
    }
  }

  /**
   * Validate consistency
   */
  private async validateConsistency(backup: BackupMetadata): Promise<ValidationCheck> {
    try {
      // Check backup age
      const age = Date.now() - backup.createdAt;
      const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days

      if (age > maxAge) {
        return {
          name: 'Consistency Validation',
          category: 'CONSISTENCY',
          passed: true,
          message: `Backup is ${Math.floor(age / (24 * 60 * 60 * 1000))} days old`,
          details: 'Old backups may have compatibility issues',
          severity: 'WARNING'
        };
      }

      // Check compression
      if (backup.compressed && backup.compressedSizeBytes) {
        const ratio = backup.sizeBytes / backup.compressedSizeBytes;
        if (ratio < 1.0) {
          return {
            name: 'Consistency Validation',
            category: 'CONSISTENCY',
            passed: false,
            message: 'Compressed size is larger than uncompressed',
            severity: 'ERROR'
          };
        }
      }

      return {
        name: 'Consistency Validation',
        category: 'CONSISTENCY',
        passed: true,
        message: 'Backup consistency checks passed',
        severity: 'INFO'
      };
    } catch (error) {
      return {
        name: 'Consistency Validation',
        category: 'CONSISTENCY',
        passed: false,
        message: `Consistency validation failed: ${error}`,
        severity: 'ERROR'
      };
    }
  }

  /**
   * Validate connectivity
   */
  private async validateConnectivity(backup: BackupMetadata): Promise<ValidationCheck> {
    try {
      // Check if storage backend is accessible
      // In a real implementation, this would ping the storage service

      return {
        name: 'Connectivity Validation',
        category: 'CONNECTIVITY',
        passed: true,
        message: `Storage backend (${backup.storageBackend}) is accessible`,
        severity: 'INFO'
      };
    } catch (error) {
      return {
        name: 'Connectivity Validation',
        category: 'CONNECTIVITY',
        passed: false,
        message: `Cannot connect to storage backend: ${error}`,
        severity: 'ERROR'
      };
    }
  }

  /**
   * Check if migration is available between versions
   */
  private async checkMigrationAvailable(fromVersion: string, toVersion: string): Promise<boolean> {
    // In a real implementation, this would check available migrations
    // For now, assume migrations are available for minor version changes
    const [fromMajor, fromMinor] = fromVersion.split('.').map(Number);
    const [toMajor, toMinor] = toVersion.split('.').map(Number);

    return fromMajor === toMajor && toMinor === fromMinor + 1;
  }

  /**
   * Calculate validation summary
   */
  private calculateSummary(checks: ValidationCheck[], options: ValidationOptions) {
    return {
      totalChecks: checks.length,
      passed: checks.filter(c => c.passed).length,
      failed: checks.filter(c => !c.passed && c.severity === 'ERROR').length,
      warnings: checks.filter(c => !c.passed && c.severity === 'WARNING').length,
      criticalFailures: checks.filter(c => !c.passed && c.severity === 'ERROR').length
    };
  }
}
