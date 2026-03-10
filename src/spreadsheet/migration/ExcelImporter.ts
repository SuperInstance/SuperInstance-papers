/**
 * ExcelImporter - Import Excel spreadsheets into POLLN format
 *
 * Handles .xlsx file parsing, formula conversion, and formatting preservation
 * with support for large files (100K+ cells) and multiple sheets.
 */

import * as XLSX from 'xlsx';
import { LogCell, CellType } from '../cells/LogCell';
import { CellOrigin } from '../cells/CellOrigin';
import { FormulaConverter } from './FormulaConverter';
import { StyleConverter } from './StyleConverter';
import { MigrationValidator } from './MigrationValidator';

export interface ExcelImportOptions {
  preserveFormatting?: boolean;
  includeCharts?: boolean;
  convertFormulas?: boolean;
  maxCellCount?: number;
  sheetFilter?: string[];
  onProgress?: (progress: ImportProgress) => void;
}

export interface ImportProgress {
  stage: 'reading' | 'parsing' | 'converting' | 'validating' | 'complete';
  current: number;
  total: number;
  sheet?: string;
  message: string;
}

export interface ExcelImportResult {
  cells: LogCell[];
  sheets: SheetInfo[];
  metadata: SpreadsheetMetadata;
  warnings: ImportWarning[];
  errors: ImportError[];
}

export interface SheetInfo {
  name: string;
  cellCount: number;
  dimensions: { rows: number; cols: number };
  hasFormulas: boolean;
  hasCharts: boolean;
}

export interface SpreadsheetMetadata {
  title: string;
  author?: string;
  created?: Date;
  modified?: Date;
  application?: string;
  sheetCount: number;
  totalCells: number;
}

export interface ImportWarning {
  type: 'formula' | 'format' | 'chart' | 'feature';
  sheet: string;
  cell?: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ImportError {
  type: 'read' | 'parse' | 'convert' | 'memory';
  sheet?: string;
  cell?: string;
  message: string;
  fatal: boolean;
}

/**
 * ExcelImporter - Main class for importing Excel files
 */
export class ExcelImporter {
  private formulaConverter: FormulaConverter;
  private styleConverter: StyleConverter;
  private validator: MigrationValidator;

  constructor() {
    this.formulaConverter = new FormulaConverter();
    this.styleConverter = new StyleConverter();
    this.validator = new MigrationValidator();
  }

  /**
   * Import an Excel file and convert to POLLN cells
   */
  async import(filePath: string, options: ExcelImportOptions = {}): Promise<ExcelImportResult> {
    const defaultOptions: ExcelImportOptions = {
      preserveFormatting: true,
      includeCharts: false,
      convertFormulas: true,
      maxCellCount: 100000,
      onProgress: undefined,
    };

    const opts = { ...defaultOptions, ...options };
    const result: ExcelImportResult = {
      cells: [],
      sheets: [],
      metadata: {
        title: '',
        sheetCount: 0,
        totalCells: 0,
      },
      warnings: [],
      errors: [],
    };

    try {
      // Stage 1: Read file
      this.reportProgress(opts, { stage: 'reading', current: 0, total: 100, message: 'Reading Excel file...' });

      const workbook = XLSX.readFile(filePath, {
        cellStyles: opts.preserveFormatting,
        cellDates: true,
        cellNF: true,
      });

      // Extract metadata
      result.metadata = this.extractMetadata(workbook);

      // Validate workbook
      const validation = await this.validator.validateExcel(workbook, opts);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        if (validation.fatal) {
          return result;
        }
      }
      result.warnings.push(...validation.warnings);

      // Stage 2: Process sheets
      const sheetNames = opts.sheetFilter || workbook.SheetNames;
      let totalProcessed = 0;
      const totalSheets = sheetNames.length;

      for (let i = 0; i < sheetNames.length; i++) {
        const sheetName = sheetNames[i];
        this.reportProgress(opts, {
          stage: 'parsing',
          current: i,
          total: totalSheets,
          sheet: sheetName,
          message: `Processing sheet ${i + 1}/${totalSheets}`,
        });

        try {
          const sheetResult = await this.processSheet(
            workbook.Sheets[sheetName],
            sheetName,
            opts,
            totalProcessed
          );

          result.sheets.push(sheetResult.info);
          result.cells.push(...sheetResult.cells);
          result.warnings.push(...sheetResult.warnings);

          totalProcessed += sheetResult.info.cellCount;

          // Check max cell limit
          if (totalProcessed > opts.maxCellCount!) {
            result.warnings.push({
              type: 'feature',
              sheet: sheetName,
              message: `Reached maximum cell count (${opts.maxCellCount}). Stopping import.`,
              severity: 'high',
            });
            break;
          }
        } catch (error) {
          result.errors.push({
            type: 'parse',
            sheet: sheetName,
            message: `Failed to process sheet: ${error instanceof Error ? error.message : String(error)}`,
            fatal: false,
          });
        }
      }

      // Update metadata
      result.metadata.totalCells = totalProcessed;
      result.metadata.sheetCount = result.sheets.length;

      // Stage 3: Final validation
      this.reportProgress(opts, {
        stage: 'validating',
        current: totalSheets,
        total: totalSheets,
        message: 'Validating imported data...',
      });

      const finalValidation = await this.validator.validateImportedCells(result.cells);
      result.warnings.push(...finalValidation.warnings);
      result.errors.push(...finalValidation.errors);

      // Complete
      this.reportProgress(opts, {
        stage: 'complete',
        current: 100,
        total: 100,
        message: 'Import complete',
      });

      return result;
    } catch (error) {
      result.errors.push({
        type: 'read',
        message: `Failed to read Excel file: ${error instanceof Error ? error.message : String(error)}`,
        fatal: true,
      });
      return result;
    }
  }

  /**
   * Process a single sheet
   */
  private async processSheet(
    sheet: XLSX.WorkSheet,
    sheetName: string,
    options: ExcelImportOptions,
    startIndex: number
  ): Promise<{ cells: LogCell[]; info: SheetInfo; warnings: ImportWarning[] }> {
    const cells: LogCell[] = [];
    const warnings: ImportWarning[] = [];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    const info: SheetInfo = {
      name: sheetName,
      cellCount: 0,
      dimensions: { rows: range.e.r + 1, cols: range.e.c + 1 },
      hasFormulas: false,
      hasCharts: false,
    };

    let cellIndex = 0;

    // Process each cell
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const excelCell = sheet[cellAddress];

        if (!excelCell) continue;

        try {
          const pollnCell = await this.convertCell(
            excelCell,
            cellAddress,
            sheetName,
            startIndex + cellIndex,
            options
          );

          if (pollnCell) {
            cells.push(pollnCell);
            cellIndex++;
            info.cellCount++;

            if (excelCell.f && !info.hasFormulas) {
              info.hasFormulas = true;
            }
          }
        } catch (error) {
          warnings.push({
            type: 'parse',
            sheet: sheetName,
            cell: cellAddress,
            message: `Failed to convert cell: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'medium',
          });
        }
      }
    }

    // Check for charts
    if (sheet['!charts'] && options.includeCharts) {
      info.hasCharts = true;
      warnings.push({
        type: 'chart',
        sheet: sheetName,
        message: 'Charts detected - visual representation not supported',
        severity: 'low',
      });
    }

    return { cells, info, warnings };
  }

  /**
   * Convert an Excel cell to a POLLN LogCell
   */
  private async convertCell(
    excelCell: XLSX.CellObject,
    address: string,
    sheetName: string,
    index: number,
    options: ExcelImportOptions
  ): Promise<LogCell | null> {
    // Determine cell type
    let cellType: CellType = 'data';

    if (excelCell.f && options.convertFormulas) {
      cellType = 'transform';
    }

    // Create origin
    const origin = new CellOrigin({
      id: `excel_${sheetName}_${address}`,
      type: cellType,
      position: { sheet: sheetName, address },
    });

    // Create cell
    const cell = new LogCell(origin);

    // Set value
    if (excelCell.v !== undefined) {
      cell.head.setValue(excelCell.v);
    }

    // Convert formula
    if (excelCell.f && options.convertFormulas) {
      try {
        const convertedFormula = this.formulaConverter.convertExcelFormula(
          excelCell.f,
          sheetName
        );
        cell.body.setReasoning(convertedFormula);
      } catch (error) {
        cell.head.setValue(excelCell.f); // Store as text if conversion fails
        cell.body.setReasoning(`// Formula conversion failed: ${excelCell.f}`);
      }
    }

    // Apply formatting
    if (options.preserveFormatting && excelCell.s) {
      const style = this.styleConverter.convertExcelStyle(excelCell.s);
      cell.tail.setStyle(style);
    }

    // Set metadata
    if (excelCell.c) {
      // Cell comment
      cell.tail.setMetadata({ comment: excelCell.c.map((c: any) => c.t).join('\n') });
    }

    return cell;
  }

  /**
   * Extract metadata from workbook
   */
  private extractMetadata(workbook: XLSX.WorkBook): SpreadsheetMetadata {
    const props = workbook.Props || {};

    return {
      title: props.Title || workbook.SheetNames[0] || 'Imported Spreadsheet',
      author: props.Author,
      created: props.CreatedDate ? new Date(props.CreatedDate) : undefined,
      modified: props.ModifiedDate ? new Date(props.ModifiedDate) : undefined,
      application: props.Application,
      sheetCount: workbook.SheetNames.length,
      totalCells: 0,
    };
  }

  /**
   * Report progress if callback provided
   */
  private reportProgress(options: ExcelImportOptions, progress: ImportProgress): void {
    if (options.onProgress) {
      options.onProgress(progress);
    }
  }

  /**
   * Get supported Excel version
   */
  static getSupportedVersion(): string {
    return 'Excel 2007+ (.xlsx)';
  }

  /**
   * Check if file is supported
   */
  static isSupported(filePath: string): boolean {
    const ext = filePath.toLowerCase();
    return ext.endsWith('.xlsx') || ext.endsWith('.xlsm');
  }
}
