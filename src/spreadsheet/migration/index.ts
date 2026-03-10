/**
 * Migration Module - Export all migration components
 *
 * Provides unified access to all migration tools for converting
 * spreadsheets from various platforms to POLLN format.
 */

export { ExcelImporter } from './ExcelImporter';
export { GoogleSheetsImporter } from './GoogleSheetsImporter';
export { AirtableImporter } from './AirtableImporter';
export { NotionImporter } from './NotionImporter';
export { FormulaConverter } from './FormulaConverter';
export { StyleConverter } from './StyleConverter';
export { MigrationValidator } from './MigrationValidator';

// Re-export types for convenience
export type {
  ExcelImportOptions,
  ImportProgress,
  ExcelImportResult,
  SheetInfo,
  SpreadsheetMetadata,
  ImportWarning,
  ImportError,
} from './ExcelImporter';

export type {
  GoogleSheetsConfig,
  GoogleSheetsImportOptions,
  GoogleSheetsImportResult,
  PermissionInfo,
} from './GoogleSheetsImporter';

export type {
  AirtableConfig,
  AirtableImportOptions,
  AirtableImportResult,
  ViewInfo,
  FilterInfo,
  SortInfo,
} from './AirtableImporter';

export type {
  NotionConfig,
  NotionImportOptions,
  NotionImportResult,
} from './NotionImporter';

export type {
  FormulaConversionOptions,
  ConversionResult,
  ConversionWarning,
  ConversionError,
} from './FormulaConverter';

export type {
  CellStyle,
  FontStyle,
  FillStyle,
  BorderStyle,
  BorderEdge,
  AlignmentStyle,
  ProtectionStyle,
  Color,
  ConditionalFormat,
  ConditionalCondition,
  ThemeConversion,
} from './StyleConverter';

export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CompatibilityReport,
  PartialSupportEntry,
  RollbackPlan,
  RollbackStep,
  FeatureMapping,
} from './MigrationValidator';

import { ExcelImporter } from './ExcelImporter';
import { GoogleSheetsImporter } from './GoogleSheetsImporter';
import { AirtableImporter } from './AirtableImporter';
import { NotionImporter } from './NotionImporter';
import { MigrationValidator } from './MigrationValidator';

/**
 * MigrationOrchestrator - High-level migration orchestration
 *
 * Simplifies the migration process by providing a unified interface
 * for importing from various platforms.
 */
export class MigrationOrchestrator {
  private excelImporter: ExcelImporter;
  private googleSheetsImporter: GoogleSheetsImporter;
  private airtableImporter: AirtableImporter;
  private notionImporter: NotionImporter;
  private validator: MigrationValidator;

  constructor() {
    this.excelImporter = new ExcelImporter();
    this.googleSheetsImporter = new GoogleSheetsImporter();
    this.airtableImporter = new AirtableImporter();
    this.notionImporter = new NotionImporter();
    this.validator = new MigrationValidator();
  }

  /**
   * Detect platform from file path or URL
   */
  detectPlatform(source: string): string | null {
    const lowerSource = source.toLowerCase();

    // Excel files
    if (lowerSource.endsWith('.xlsx') || lowerSource.endsWith('.xlsm')) {
      return 'excel';
    }

    // Google Sheets URLs
    if (lowerSource.includes('docs.google.com/spreadsheets')) {
      return 'googlesheets';
    }

    // Airtable URLs
    if (lowerSource.includes('airtable.com')) {
      return 'airtable';
    }

    // Notion URLs
    if (lowerSource.includes('notion.so') || lowerSource.includes('notion.site')) {
      return 'notion';
    }

    return null;
  }

  /**
   * Get compatibility report for platform
   */
  getCompatibility(platform: string) {
    return this.validator.getCompatibilityReport(platform);
  }

  /**
   * Import from Excel file
   */
  async importFromExcel(filePath: string, options?: any) {
    return this.excelImporter.import(filePath, options);
  }

  /**
   * Import from Google Sheets
   */
  async importFromGoogleSheets(config: any, options: any) {
    await this.googleSheetsImporter.authenticate(config);
    return this.googleSheetsImporter.import(options);
  }

  /**
   * Import from Airtable
   */
  async importFromAirtable(config: any, options: any) {
    this.airtableImporter.setCredentials(config);
    return this.airtableImporter.import(options);
  }

  /**
   * Import from Notion
   */
  async importFromNotion(config: any, options: any) {
    this.notionImporter.setCredentials(config);
    return this.notionImporter.import(options);
  }

  /**
   * Smart import - auto-detect platform and import
   */
  async smartImport(source: string, options: any = {}) {
    const platform = this.detectPlatform(source);

    if (!platform) {
      throw new Error(`Could not detect platform from source: ${source}`);
    }

    // Get compatibility report
    const compatibility = this.getCompatibility(platform);

    if (options.checkCompatibility !== false && compatibility?.compatibility === 'limited') {
      console.warn(`Warning: Limited compatibility for ${platform}. Review compatibility report before proceeding.`);
    }

    // Route to appropriate importer
    switch (platform) {
      case 'excel':
        return this.importFromExcel(source, options);

      case 'googlesheets':
        if (!options.googleSheetsConfig) {
          throw new Error('Google Sheets config required');
        }
        return this.importFromGoogleSheets(options.googleSheetsConfig, {
          ...options,
          spreadsheetId: this.extractGoogleSheetsId(source),
        });

      case 'airtable':
        if (!options.airtableConfig) {
          throw new Error('Airtable config required');
        }
        return this.importFromAirtable(options.airtableConfig, {
          ...options,
          baseId: this.extractAirtableBaseId(source),
        });

      case 'notion':
        if (!options.notionConfig) {
          throw new Error('Notion config required');
        }
        return this.importFromNotion(options.notionConfig, {
          ...options,
          databaseId: this.extractNotionDatabaseId(source),
        });

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Create rollback plan for migration
   */
  createRollbackPlan(platform: string, dataSize: number) {
    return this.validator.createRollbackPlan(platform, dataSize);
  }

  /**
   * Extract Google Sheets ID from URL
   */
  private extractGoogleSheetsId(url: string): string {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : '';
  }

  /**
   * Extract Airtable base ID from URL
   */
  private extractAirtableBaseId(url: string): string {
    const match = url.match(/airtable\.com\/([a-zA-Z0-9]+)/);
    return match ? match[1] : '';
  }

  /**
   * Extract Notion database ID from URL
   */
  private extractNotionDatabaseId(url: string): string {
    // Notion URLs are complex, this is a simplified extraction
    const match = url.match(/([a-f0-9]{32})/);
    return match ? match[1] : '';
  }
}

/**
 * Factory function to create migration orchestrator
 */
export function createMigrationOrchestrator(): MigrationOrchestrator {
  return new MigrationOrchestrator();
}

/**
 * Quick import helper - auto-detect and import
 */
export async function quickImport(source: string, options: any = {}) {
  const orchestrator = createMigrationOrchestrator();
  return orchestrator.smartImport(source, options);
}

/**
 * Get platform compatibility
 */
export function getPlatformCompatibility(platform: string) {
  const orchestrator = createMigrationOrchestrator();
  return orchestrator.getCompatibility(platform);
}
