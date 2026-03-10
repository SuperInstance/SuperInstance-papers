/**
 * NotionImporter - Import Notion databases into POLLN format
 *
 * Handles Notion API integration, database conversion, property mapping,
 * page structure parsing, and relation conversion.
 */

import { LogCell } from '../cells/LogCell';
import { CellOrigin } from '../cells/CellOrigin';
import { FormulaConverter } from './FormulaConverter';
import { MigrationValidator } from './MigrationValidator';

export interface NotionConfig {
  apiKey: string;
  databaseId?: string;
}

export interface NotionImportOptions {
  databaseId?: string;
  includePages?: boolean;
  convertFormulas?: boolean;
  followRelations?: boolean;
  maxRecords?: number;
  onProgress?: (progress: ImportProgress) => void;
}

export interface ImportProgress {
  stage: 'authenticating' | 'fetching' | 'parsing' | 'converting' | 'complete';
  current: number;
  total: number;
  database?: string;
  message: string;
}

export interface NotionImportResult {
  cells: LogCell[];
  databases: DatabaseInfo[];
  metadata: WorkspaceMetadata;
  warnings: ImportWarning[];
  errors: ImportError[];
}

export interface DatabaseInfo {
  name: string;
  id: string;
  recordCount: number;
  propertyCount: number;
  titleProperty: string;
  hasRelations: boolean;
  hasFormulaProperties: boolean;
  isNested?: boolean;
}

export interface WorkspaceMetadata {
  name?: string;
  workspaceId?: string;
  databaseCount: number;
  totalRecords: number;
}

export interface ImportWarning {
  type: 'property' | 'formula' | 'relation' | 'page';
  database: string;
  property?: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ImportError {
  type: 'auth' | 'fetch' | 'parse' | 'convert';
  database?: string;
  property?: string;
  message: string;
  fatal: boolean;
}

/**
 * NotionImporter - Import from Notion API
 */
export class NotionImporter {
  private formulaConverter: FormulaConverter;
  private validator: MigrationValidator;
  private apiKey: string | null = null;

  constructor() {
    this.formulaConverter = new FormulaConverter();
    this.validator = new MigrationValidator();
  }

  /**
   * Set API credentials
   */
  setCredentials(config: NotionConfig): void {
    this.apiKey = config.apiKey;
  }

  /**
   * Import a Notion database
   */
  async import(options: NotionImportOptions): Promise<NotionImportResult> {
    if (!this.apiKey) {
      throw new Error('API key not set. Call setCredentials() first.');
    }

    if (!options.databaseId) {
      throw new Error('Database ID is required for import.');
    }

    const result: NotionImportResult = {
      cells: [],
      databases: [],
      metadata: {
        databaseCount: 0,
        totalRecords: 0,
      },
      warnings: [],
      errors: [],
    };

    try {
      // Stage 1: Fetch database metadata
      this.reportProgress(options, {
        stage: 'fetching',
        current: 0,
        total: 100,
        message: 'Fetching database metadata...',
      });

      const metadata = await this.fetchDatabaseMetadata(options.databaseId);
      result.metadata = metadata;

      // Stage 2: Process database
      this.reportProgress(options, {
        stage: 'parsing',
        current: 20,
        total: 100,
        database: metadata.name || options.databaseId,
        message: 'Processing database...',
      });

      const databaseResult = await this.processDatabase(
        options.databaseId,
        options
      );

      result.databases.push(databaseResult.info);
      result.cells.push(...databaseResult.cells);
      result.warnings.push(...databaseResult.warnings);

      // Update metadata
      result.metadata.totalRecords = databaseResult.info.recordCount;
      result.metadata.databaseCount = 1;

      // Stage 3: Final validation
      this.reportProgress(options, {
        stage: 'converting',
        current: 90,
        total: 100,
        message: 'Validating imported data...',
      });

      const finalValidation = await this.validator.validateImportedCells(result.cells);
      result.warnings.push(...finalValidation.warnings);
      result.errors.push(...finalValidation.errors);

      // Complete
      this.reportProgress(options, {
        stage: 'complete',
        current: 100,
        total: 100,
        message: 'Import complete',
      });

      return result;
    } catch (error) {
      result.errors.push({
        type: 'fetch',
        message: `Failed to import database: ${error instanceof Error ? error.message : String(error)}`,
        fatal: true,
      });
      return result;
    }
  }

  /**
   * Fetch database metadata
   */
  private async fetchDatabaseMetadata(databaseId: string): Promise<WorkspaceMetadata & { name?: string }> {
    // In a real implementation, this would call the Notion API
    // For demo purposes, we'll return mock data

    return {
      name: 'Imported Notion Database',
      databaseId,
      databaseCount: 1,
      totalRecords: 0,
    };
  }

  /**
   * Process a single database
   */
  private async processDatabase(
    databaseId: string,
    options: NotionImportOptions
  ): Promise<{ cells: LogCell[]; info: DatabaseInfo; warnings: ImportWarning[] }> {
    const cells: LogCell[] = [];
    const warnings: ImportWarning[] = [];

    // In a real implementation, this would fetch the database data from the API
    // For demo purposes, we'll return empty results

    const info: DatabaseInfo = {
      name: 'Database',
      id: databaseId,
      recordCount: 0,
      propertyCount: 0,
      titleProperty: 'Name',
      hasRelations: false,
      hasFormulaProperties: false,
    };

    return { cells, info, warnings };
  }

  /**
   * Convert a Notion page/record to POLLN cells
   */
  private async convertPage(
    page: any,
    properties: any[],
    databaseId: string,
    pageId: string,
    options: NotionImportOptions
  ): Promise<LogCell[]> {
    const cells: LogCell[] = [];

    for (const property of properties) {
      const cellType = this.determineCellType(property, options);
      const cellAddress = `${pageId}_${property.id}`;

      const origin = new CellOrigin({
        id: `notion_${databaseId}_${cellAddress}`,
        type: cellType,
        position: { database: databaseId, page: pageId, property: property.id },
      });

      const cell = new LogCell(origin);

      // Set value
      const value = page.properties[property.name];
      if (value !== undefined) {
        cell.head.setValue(this.convertPropertyValue(value, property.type));
      }

      // Convert formula
      if (property.type === 'formula' && options.convertFormulas && property.formula) {
        try {
          const convertedFormula = this.formulaConverter.convertNotionFormula(
            property.formula,
            databaseId
          );
          cell.body.setReasoning(convertedFormula);
        } catch (error) {
          cell.body.setReasoning(`// Formula conversion failed: ${property.formula}`);
        }
      }

      // Handle relations
      if (property.type === 'relation' && options.followRelations) {
        warnings.push({
          type: 'relation',
          database: databaseId,
          property: property.name,
          message: 'Relations require additional API calls',
          severity: 'medium',
        });
      }

      cells.push(cell);
    }

    return cells;
  }

  /**
   * Determine cell type based on property configuration
   */
  private determineCellType(property: any, options: NotionImportOptions): 'data' | 'transform' {
    if (property.type === 'formula' && options.convertFormulas) {
      return 'transform';
    }
    return 'data';
  }

  /**
   * Convert property value based on Notion type
   */
  private convertPropertyValue(value: any, propertyType: string): any {
    switch (propertyType) {
      case 'number':
        return Number(value);
      case 'checkbox':
        return Boolean(value);
      case 'date':
        return value?.start ? new Date(value.start) : null;
      case 'multi_select':
      case 'relation':
      case 'rollup':
        return JSON.stringify(value);
      case 'rich_text':
      case 'title':
      case 'email':
      case 'phone_number':
      case 'url':
        return this.extractText(value);
      default:
        return value;
    }
  }

  /**
   * Extract text from rich text or title properties
   */
  private extractText(value: any): string {
    if (Array.isArray(value)) {
      return value.map((v: any) => v.plain_text || '').join('');
    }
    if (typeof value === 'string') {
      return value;
    }
    return '';
  }

  /**
   * Report progress
   */
  private reportProgress(options: NotionImportOptions, progress: ImportProgress): void {
    if (options.onProgress) {
      options.onProgress(progress);
    }
  }

  /**
   * Get supported Notion property types
   */
  static getSupportedPropertyTypes(): string[] {
    return [
      'title',
      'rich_text',
      'number',
      'select',
      'multi_select',
      'date',
      'people',
      'files',
      'checkbox',
      'url',
      'email',
      'phone_number',
      'formula',
      'relation',
      'rollup',
      'created_time',
      'created_by',
      'last_edited_time',
      'last_edited_by',
    ];
  }
}
