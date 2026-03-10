/**
 * AirtableImporter - Import Airtable bases into POLLN format
 *
 * Handles Airtable API integration, base/table structure parsing,
 * field type mapping, and linked record handling.
 */

import { LogCell } from '../cells/LogCell';
import { CellOrigin } from '../cells/CellOrigin';
import { FormulaConverter } from './FormulaConverter';
import { MigrationValidator } from './MigrationValidator';

export interface AirtableConfig {
  apiKey: string;
  baseId: string;
}

export interface AirtableImportOptions {
  tables?: string[];
  includeViews?: boolean;
  convertFormulas?: boolean;
  followLinkedRecords?: boolean;
  maxRecords?: number;
  onProgress?: (progress: ImportProgress) => void;
}

export interface ImportProgress {
  stage: 'authenticating' | 'fetching' | 'parsing' | 'converting' | 'complete';
  current: number;
  total: number;
  table?: string;
  message: string;
}

export interface AirtableImportResult {
  cells: LogCell[];
  tables: TableInfo[];
  metadata: BaseMetadata;
  warnings: ImportWarning[];
  errors: ImportError[];
}

export interface TableInfo {
  name: string;
  id: string;
  recordCount: number;
  fieldCount: number;
  primaryField: string;
  hasLinkedFields: boolean;
  hasFormulaFields: boolean;
  views?: ViewInfo[];
}

export interface ViewInfo {
  name: string;
  id: string;
  type: string;
  filters?: FilterInfo[];
  sorts?: SortInfo[];
}

export interface FilterInfo {
  field: string;
  operator: string;
  value: any;
}

export interface SortInfo {
  field: string;
  direction: 'asc' | 'desc';
}

export interface BaseMetadata {
  name: string;
  baseId: string;
  created?: Date;
  modified?: Date;
  tableCount: number;
  totalRecords: number;
}

export interface ImportWarning {
  type: 'field' | 'formula' | 'link' | 'view';
  table: string;
  field?: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ImportError {
  type: 'auth' | 'fetch' | 'parse' | 'convert';
  table?: string;
  field?: string;
  message: string;
  fatal: boolean;
}

/**
 * AirtableImporter - Import from Airtable API
 */
export class AirtableImporter {
  private formulaConverter: FormulaConverter;
  private validator: MigrationValidator;
  private apiKey: string | null = null;
  private baseId: string | null = null;

  constructor() {
    this.formulaConverter = new FormulaConverter();
    this.validator = new MigrationValidator();
  }

  /**
   * Set API credentials
   */
  setCredentials(config: AirtableConfig): void {
    this.apiKey = config.apiKey;
    this.baseId = config.baseId;
  }

  /**
   * Import an Airtable base
   */
  async import(options: AirtableImportOptions): Promise<AirtableImportResult> {
    if (!this.apiKey || !this.baseId) {
      throw new Error('Credentials not set. Call setCredentials() first.');
    }

    const result: AirtableImportResult = {
      cells: [],
      tables: [],
      metadata: {
        name: '',
        baseId: this.baseId,
        tableCount: 0,
        totalRecords: 0,
      },
      warnings: [],
      errors: [],
    };

    try {
      // Stage 1: Fetch base metadata
      this.reportProgress(options, {
        stage: 'fetching',
        current: 0,
        total: 100,
        message: 'Fetching base metadata...',
      });

      const metadata = await this.fetchBaseMetadata();
      result.metadata = metadata;

      // Stage 2: Fetch tables
      const tableNames = options.tables || metadata.tableNames || [];
      let totalProcessed = 0;
      const totalTables = tableNames.length;

      for (let i = 0; i < tableNames.length; i++) {
        const tableName = tableNames[i];
        this.reportProgress(options, {
          stage: 'parsing',
          current: 20 + (i / totalTables) * 60,
          total: 100,
          table: tableName,
          message: `Processing table ${i + 1}/${totalTables}`,
        });

        try {
          const tableResult = await this.processTable(
            tableName,
            options,
            totalProcessed
          );

          result.tables.push(tableResult.info);
          result.cells.push(...tableResult.cells);
          result.warnings.push(...tableResult.warnings);

          totalProcessed += tableResult.info.recordCount;

          // Check max record limit
          if (totalProcessed > options.maxRecords!) {
            result.warnings.push({
              type: 'field',
              table: tableName,
              message: `Reached maximum record count (${options.maxRecords}). Stopping import.`,
              severity: 'high',
            });
            break;
          }
        } catch (error) {
          result.errors.push({
            type: 'fetch',
            table: tableName,
            message: `Failed to process table: ${error instanceof Error ? error.message : String(error)}`,
            fatal: false,
          });
        }
      }

      // Update metadata
      result.metadata.totalRecords = totalProcessed;
      result.metadata.tableCount = result.tables.length;

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
        message: `Failed to import base: ${error instanceof Error ? error.message : String(error)}`,
        fatal: true,
      });
      return result;
    }
  }

  /**
   * Fetch base metadata
   */
  private async fetchBaseMetadata(): Promise<BaseMetadata & { tableNames?: string[] }> {
    // In a real implementation, this would call the Airtable API
    // For demo purposes, we'll return mock data

    return {
      name: 'Imported Airtable Base',
      baseId: this.baseId!,
      tableCount: 1,
      totalRecords: 0,
      tableNames: ['Table 1'],
    };
  }

  /**
   * Process a single table
   */
  private async processTable(
    tableName: string,
    options: AirtableImportOptions,
    startIndex: number
  ): Promise<{ cells: LogCell[]; info: TableInfo; warnings: ImportWarning[] }> {
    const cells: LogCell[] = [];
    const warnings: ImportWarning[] = [];

    // In a real implementation, this would fetch the table data from the API
    // For demo purposes, we'll return empty results

    const info: TableInfo = {
      name: tableName,
      id: `tbl_${tableName}`,
      recordCount: 0,
      fieldCount: 0,
      primaryField: 'Name',
      hasLinkedFields: false,
      hasFormulaFields: false,
    };

    return { cells, info, warnings };
  }

  /**
   * Convert an Airtable record to POLLN cells
   */
  private async convertRecord(
    record: any,
    fields: any[],
    tableName: string,
    recordId: string,
    options: AirtableImportOptions
  ): Promise<LogCell[]> {
    const cells: LogCell[] = [];

    for (const field of fields) {
      const cellType = this.determineCellType(field, options);
      const cellAddress = `${recordId}_${field.id}`;

      const origin = new CellOrigin({
        id: `airtable_${tableName}_${cellAddress}`,
        type: cellType,
        position: { table: tableName, record: recordId, field: field.id },
      });

      const cell = new LogCell(origin);

      // Set value
      const value = record.fields[field.name];
      if (value !== undefined) {
        cell.head.setValue(this.convertFieldValue(value, field.type));
      }

      // Convert formula
      if (field.type === 'formula' && options.convertFormulas && field.expression) {
        try {
          const convertedFormula = this.formulaConverter.convertAirtableFormula(
            field.expression,
            tableName
          );
          cell.body.setReasoning(convertedFormula);
        } catch (error) {
          cell.body.setReasoning(`// Formula conversion failed: ${field.expression}`);
        }
      }

      // Handle linked records
      if (field.type === 'foreignKey' && options.followLinkedRecords) {
        warnings.push({
          type: 'link',
          table: tableName,
          field: field.name,
          message: 'Linked records require additional API calls',
          severity: 'medium',
        });
      }

      cells.push(cell);
    }

    return cells;
  }

  /**
   * Determine cell type based on field configuration
   */
  private determineCellType(field: any, options: AirtableImportOptions): 'data' | 'transform' {
    if (field.type === 'formula' && options.convertFormulas) {
      return 'transform';
    }
    return 'data';
  }

  /**
   * Convert field value based on Airtable type
   */
  private convertFieldValue(value: any, fieldType: string): any {
    switch (fieldType) {
      case 'dateTime':
        return new Date(value);
      case 'number':
      case 'percent':
      case 'currency':
        return Number(value);
      case 'checkbox':
        return Boolean(value);
      case 'multipleRecordLinks':
      case 'multipleCollaborators':
      case 'multipleAttachments':
        return JSON.stringify(value);
      default:
        return value;
    }
  }

  /**
   * Fetch views for a table
   */
  private async fetchViews(tableName: string): Promise<ViewInfo[]> {
    // In a real implementation, this would fetch views from the API
    return [];
  }

  /**
   * Report progress
   */
  private reportProgress(options: AirtableImportOptions, progress: ImportProgress): void {
    if (options.onProgress) {
      options.onProgress(progress);
    }
  }

  /**
   * Get supported Airtable field types
   */
  static getSupportedFieldTypes(): string[] {
    return [
      'singleLineText',
      'email',
      'url',
      'phoneNumber',
      'number',
      'currency',
      'percent',
      'duration',
      'rating',
      'checkbox',
      'singleSelect',
      'multipleSelect',
      'multipleRecordLinks',
      'date',
      'dateTime',
      'formula',
      'createdTime',
      'createdBy',
      'lastModifiedTime',
      'lastModifiedBy',
      'attachment',
      'multipleAttachments',
      'count',
      'rollup',
      'lookup',
      'multipleCollaborators',
      'barcode',
      'richText',
    ];
  }
}
