/**
 * Configuration utilities for import/export operations
 */

import type {
  ExportConfig,
  ImportConfig,
  PDFExportConfig,
  MergeStrategy,
  ConflictResolution,
  ExportFormat,
  ImportSource,
} from '../types.js';

/**
 * Create export configuration with defaults
 */
export function createExportConfig(
  overrides?: Partial<ExportConfig>
): ExportConfig {
  return {
    format: ExportFormat.JSON,
    includeMetadata: true,
    includeHistory: true,
    includeTrace: true,
    compress: false,
    pretty: true,
    version: '1.0.0',
    ...overrides,
  };
}

/**
 * Create import configuration with defaults
 */
export function createImportConfig(
  source: ImportSource,
  overrides?: Partial<ImportConfig>
): ImportConfig {
  return {
    source,
    validateSchema: true,
    mergeStrategy: MergeStrategy.MERGE,
    conflictResolution: ConflictResolution.KEEP_NEWER,
    migrateVersions: true,
    targetVersion: '1.0.0',
    ...overrides,
  };
}

/**
 * Create PDF export configuration
 */
export function createPDFExportConfig(
  overrides?: Partial<PDFExportConfig>
): PDFExportConfig {
  return {
    format: ExportFormat.PDF,
    includeMetadata: true,
    includeHistory: false,
    includeTrace: false,
    pageSize: 'A4',
    orientation: 'portrait',
    includeVisualization: false,
    includeSummary: true,
    includeDetails: true,
    fontSize: 10,
    margins: {
      top: 20,
      bottom: 20,
      left: 15,
      right: 15,
    },
    ...overrides,
  };
}

/**
 * Validate export configuration
 */
export function validateExportConfig(config: ExportConfig): string[] {
  const errors: string[] = [];

  if (!Object.values(ExportFormat).includes(config.format)) {
    errors.push(`Invalid export format: ${config.format}`);
  }

  if (config.compress && config.format === ExportFormat.JSON) {
    errors.push('Compression is not supported for JSON format');
  }

  if (config.password && config.format !== ExportFormat.POLLN) {
    errors.push('Password protection is only supported for POLLN format');
  }

  return errors;
}

/**
 * Validate import configuration
 */
export function validateImportConfig(config: ImportConfig): string[] {
  const errors: string[] = [];

  if (!Object.values(ImportSource).includes(config.source)) {
    errors.push(`Invalid import source: ${config.source}`);
  }

  if (!Object.values(MergeStrategy).includes(config.mergeStrategy!)) {
    errors.push(`Invalid merge strategy: ${config.mergeStrategy}`);
  }

  if (!Object.values(ConflictResolution).includes(config.conflictResolution!)) {
    errors.push(`Invalid conflict resolution: ${config.conflictResolution}`);
  }

  return errors;
}

/**
 * Get recommended configuration for specific use cases
 */
export function getRecommendedConfig(useCase: 'backup' | 'sharing' | 'archiving' | 'migration'): {
  export: Partial<ExportConfig>;
  import?: Partial<ImportConfig>;
} {
  switch (useCase) {
    case 'backup':
      return {
        export: {
          format: ExportFormat.POLLN,
          includeMetadata: true,
          includeHistory: true,
          includeTrace: true,
          compress: true,
          password: undefined,
        },
      };

    case 'sharing':
      return {
        export: {
          format: ExportFormat.JSON,
          includeMetadata: true,
          includeHistory: false,
          includeTrace: false,
          compress: false,
          pretty: true,
        },
      };

    case 'archiving':
      return {
        export: {
          format: ExportFormat.PDF,
          includeMetadata: true,
          includeHistory: true,
          includeTrace: false,
        },
      };

    case 'migration':
      return {
        export: {
          format: ExportFormat.JSON,
          includeMetadata: true,
          includeHistory: true,
          includeTrace: true,
          pretty: true,
        },
        import: {
          validateSchema: true,
          mergeStrategy: MergeStrategy.MERGE,
          conflictResolution: ConflictResolution.KEEP_HIGHER_VERSION,
          migrateVersions: true,
        },
      };

    default:
      return {
        export: {},
      };
  }
}
