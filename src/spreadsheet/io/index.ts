/**
 * POLLN Spreadsheet I/O Module
 *
 * Comprehensive import/export functionality for cell networks.
 * Supports multiple formats including JSON, CSV, Excel, PDF, and custom POLLN binary.
 *
 * @module io
 */

// Type definitions
export type {
  // Format enums
  ExportFormat,
  ImportSource,
  MergeStrategy,
  ConflictResolution,

  // Configuration interfaces
  ExportConfig,
  ImportConfig,
  PDFExportConfig,

  // Data structures
  SerializableCell,
  NetworkMetadata,
  NetworkExport,
  CSVExportData,
  ExcelExportData,
  ClipboardData,
  POLLNBinaryHeader,

  // Validation types
  ValidationResult,
  ValidationError,
  ValidationWarning,

  // Migration types
  MigrationResult,

  // Import/Export results
  ImportResult,
  ImportConflict,
  ExportStatistics,

  // Callbacks
  ProgressCallback,
} from './types.js';

// Core classes
export { Exporter } from './Exporter.js';
export { Importer } from './Importer.js';
export { SchemaValidator } from './SchemaValidator.js';
export { MigrationEngine, getMigrationEngine, resetMigrationEngine } from './MigrationEngine.js';

// Utility functions
export { createExportConfig, createImportConfig } from './utils/config.js';
export { detectFormat, isCompatibleFormat } from './utils/format-detection.js';

/**
 * I/O module version
 */
export const IO_VERSION = '1.0.0';

/**
 * Supported export formats
 */
export const SUPPORTED_EXPORT_FORMATS = [
  'json',
  'csv',
  'excel',
  'pdf',
  'polln',
] as const;

/**
 * Supported import sources
 */
export const SUPPORTED_IMPORT_SOURCES = [
  'file',
  'clipboard',
  'url',
  'drag_drop',
] as const;

/**
 * Default export configuration
 */
export const DEFAULT_EXPORT_CONFIG = {
  format: 'json' as const,
  includeMetadata: true,
  includeHistory: true,
  includeTrace: true,
  compress: false,
  pretty: true,
  version: '1.0.0',
};

/**
 * Default import configuration
 */
export const DEFAULT_IMPORT_CONFIG = {
  source: 'file' as const,
  validateSchema: true,
  mergeStrategy: 'merge' as const,
  conflictResolution: 'keep_newer' as const,
  migrateVersions: true,
};

/**
 * Quick export helper - exports to JSON with defaults
 */
export async function quickExport(cells: any[]): Promise<string> {
  const { Exporter } = await import('./Exporter.js');
  const exporter = new Exporter();
  const result = await exporter.export(cells, DEFAULT_EXPORT_CONFIG);
  return result.data;
}

/**
 * Quick import helper - imports from JSON with defaults
 */
export async function quickImport(data: string | Buffer): Promise<any> {
  const { Importer } = await import('./Importer.js');
  const importer = new Importer();
  const result = await importer.import(
    'file',
    data,
    DEFAULT_IMPORT_CONFIG
  );
  return result;
}

/**
 * Validate network data
 */
export async function validateNetwork(data: any) {
  const { SchemaValidator } = await import('./SchemaValidator.js');
  const validator = new SchemaValidator();
  return validator.validateNetwork(data);
}

/**
 * Migrate network to latest version
 */
export async function migrateToLatest(network: any) {
  const { getMigrationEngine } = await import('./MigrationEngine.js');
  const engine = getMigrationEngine();
  return engine.migrate(network, '1.0.0');
}

/**
 * Get current format version
 */
export function getCurrentVersion(): string {
  const { SchemaValidator } = require('./SchemaValidator.js');
  return SchemaValidator.getCurrentVersion();
}

/**
 * Get supported versions
 */
export function getSupportedVersions(): string[] {
  const { SchemaValidator } = require('./SchemaValidator.js');
  return SchemaValidator.getSupportedVersions();
}

/**
 * Check if migration is needed
 */
export function needsMigration(version: string): boolean {
  const { getMigrationEngine } = require('./MigrationEngine.js');
  const engine = getMigrationEngine();
  return engine.needsMigration(version);
}
