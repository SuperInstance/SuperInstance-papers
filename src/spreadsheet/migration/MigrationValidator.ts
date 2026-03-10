/**
 * MigrationValidator - Validate migrations before and after import
 *
 * Handles pre-migration validation, compatibility checks, feature mapping,
 * limitations reporting, and rollback planning.
 */

import { LogCell } from '../cells/LogCell';

export interface ValidationResult {
  valid: boolean;
  fatal: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: string[];
}

export interface ValidationError {
  type: 'structure' | 'data' | 'feature' | 'size';
  category: string;
  message: string;
  fatal: boolean;
  location?: string;
}

export interface ValidationWarning {
  type: 'formula' | 'format' | 'feature' | 'compatibility';
  category: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  location?: string;
}

export interface CompatibilityReport {
  platform: string;
  version?: string;
  compatibility: 'full' | 'partial' | 'limited';
  supportedFeatures: string[];
  unsupportedFeatures: string[];
  partialSupport: PartialSupportEntry[];
}

export interface PartialSupportEntry {
  feature: string;
  limitations: string[];
  workarounds: string[];
}

export interface RollbackPlan {
  canRollback: boolean;
  rollbackMethod: 'snapshot' | 'transaction' | 'manual';
  steps: RollbackStep[];
  estimatedTime?: number;
}

export interface RollbackStep {
  order: number;
  action: string;
  description: string;
  automated: boolean;
}

export interface FeatureMapping {
  sourceFeature: string;
  pollnEquivalent?: string;
  conversionComplexity: 'simple' | 'moderate' | 'complex' | 'unsupported';
  notes?: string;
}

/**
 * MigrationValidator - Validate migration operations
 */
export class MigrationValidator {
  private excelCompatibility: CompatibilityReport;
  private googleSheetsCompatibility: CompatibilityReport;
  private airtableCompatibility: CompatibilityReport;
  private notionCompatibility: CompatibilityReport;

  constructor() {
    this.excelCompatibility = this.initializeExcelCompatibility();
    this.googleSheetsCompatibility = this.initializeGoogleSheetsCompatibility();
    this.airtableCompatibility = this.initializeAirtableCompatibility();
    this.notionCompatibility = this.initializeNotionCompatibility();
  }

  /**
   * Validate Excel workbook before import
   */
  async validateExcel(workbook: any, options: any): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      fatal: false,
      errors: [],
      warnings: [],
      recommendations: [],
    };

    // Check if workbook exists
    if (!workbook) {
      result.errors.push({
        type: 'structure',
        category: 'workbook',
        message: 'Invalid workbook: workbook is null or undefined',
        fatal: true,
      });
      result.valid = false;
      result.fatal = true;
      return result;
    }

    // Check if workbook has sheets
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      result.errors.push({
        type: 'structure',
        category: 'sheets',
        message: 'Workbook contains no sheets',
        fatal: true,
      });
      result.valid = false;
      result.fatal = true;
    }

    // Check sheet filter
    if (options.sheetFilter && options.sheetFilter.length > 0) {
      const invalidSheets = options.sheetFilter.filter(
        (sheet: string) => !workbook.SheetNames.includes(sheet)
      );

      if (invalidSheets.length > 0) {
        result.warnings.push({
          type: 'feature',
          category: 'sheets',
          message: `Sheet filter contains non-existent sheets: ${invalidSheets.join(', ')}`,
          severity: 'medium',
        });
      }
    }

    // Check for protected sheets
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet && sheet['!protect']) {
        result.warnings.push({
          type: 'feature',
          category: 'protection',
          message: `Sheet "${sheetName}" is password protected. Some features may not be accessible.`,
          severity: 'low',
          location: sheetName,
        });
      }
    }

    // Estimate cell count
    let estimatedCellCount = 0;
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet && sheet['!ref']) {
        const range = this.parseRange(sheet['!ref']);
        estimatedCellCount += (range.endRow - range.startRow + 1) * (range.endCol - range.startCol + 1);
      }
    }

    if (estimatedCellCount > options.maxCellCount!) {
      result.errors.push({
        type: 'size',
        category: 'cells',
        message: `Estimated cell count (${estimatedCellCount}) exceeds maximum (${options.maxCellCount})`,
        fatal: true,
      });
      result.valid = false;
      result.fatal = true;
    }

    // Add recommendations
    if (result.warnings.length > 0) {
      result.recommendations.push(
        'Review warnings before proceeding with import',
        'Consider testing import with a smaller subset of data first'
      );
    }

    return result;
  }

  /**
   * Validate imported cells
   */
  async validateImportedCells(cells: LogCell[]): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      fatal: false,
      errors: [],
      warnings: [],
      recommendations: [],
    };

    if (!cells || cells.length === 0) {
      result.warnings.push({
        type: 'data',
        category: 'cells',
        message: 'No cells were imported',
        severity: 'medium',
      });
      return result;
    }

    // Check for invalid cells
    let invalidCellCount = 0;
    for (const cell of cells) {
      if (!cell.head || !cell.body || !cell.tail) {
        invalidCellCount++;
      }
    }

    if (invalidCellCount > 0) {
      result.errors.push({
        type: 'structure',
        category: 'cells',
        message: `${invalidCellCount} cells have invalid structure`,
        fatal: false,
      });
      result.valid = false;
    }

    // Check for duplicate cell IDs
    const cellIds = new Set<string>();
    let duplicateCount = 0;

    for (const cell of cells) {
      const id = cell.origin?.getId();
      if (id) {
        if (cellIds.has(id)) {
          duplicateCount++;
        } else {
          cellIds.add(id);
        }
      }
    }

    if (duplicateCount > 0) {
      result.errors.push({
        type: 'structure',
        category: 'cells',
        message: `${duplicateCount} cells have duplicate IDs`,
        fatal: false,
      });
      result.valid = false;
    }

    return result;
  }

  /**
   * Get compatibility report for platform
   */
  getCompatibilityReport(platform: string): CompatibilityReport | null {
    switch (platform.toLowerCase()) {
      case 'excel':
      case 'xlsx':
        return this.excelCompatibility;
      case 'google':
      case 'googlesheets':
      case 'sheets':
        return this.googleSheetsCompatibility;
      case 'airtable':
        return this.airtableCompatibility;
      case 'notion':
        return this.notionCompatibility;
      default:
        return null;
    }
  }

  /**
   * Get feature mapping for platform
   */
  getFeatureMapping(platform: string, feature: string): FeatureMapping | null {
    const mappings = this.getFeatureMappings(platform);
    return mappings.find(m => m.sourceFeature.toLowerCase() === feature.toLowerCase()) || null;
  }

  /**
   * Get all feature mappings for platform
   */
  getFeatureMappings(platform: string): FeatureMapping[] {
    switch (platform.toLowerCase()) {
      case 'excel':
      case 'xlsx':
        return this.getExcelFeatureMappings();
      case 'google':
      case 'googlesheets':
      case 'sheets':
        return this.getGoogleSheetsFeatureMappings();
      case 'airtable':
        return this.getAirtableFeatureMappings();
      case 'notion':
        return this.getNotionFeatureMappings();
      default:
        return [];
    }
  }

  /**
   * Create rollback plan
   */
  createRollbackPlan(platform: string, dataSize: number): RollbackPlan {
    const steps: RollbackStep[] = [];

    if (dataSize < 1000) {
      // Small datasets - full snapshot
      steps.push({
        order: 1,
        action: 'create_snapshot',
        description: 'Create full snapshot of current state',
        automated: true,
      });
      steps.push({
        order: 2,
        action: 'perform_migration',
        description: 'Execute migration',
        automated: true,
      });
      steps.push({
        order: 3,
        action: 'validate_import',
        description: 'Validate imported data',
        automated: true,
      });

      return {
        canRollback: true,
        rollbackMethod: 'snapshot',
        steps,
        estimatedTime: 5, // minutes
      };
    } else {
      // Large datasets - manual steps
      steps.push({
        order: 1,
        action: 'backup_existing_data',
        description: 'Create backup of existing POLLN data',
        automated: false,
      });
      steps.push({
        order: 2,
        action: 'perform_migration',
        description: 'Execute migration',
        automated: true,
      });
      steps.push({
        order: 3,
        action: 'validate_import',
        description: 'Validate imported data',
        automated: true,
      });
      steps.push({
        order: 4,
        action: 'confirm_completion',
        description: 'Manual confirmation of successful migration',
        automated: false,
      });

      return {
        canRollback: true,
        rollbackMethod: 'manual',
        steps,
        estimatedTime: Math.max(15, Math.ceil(dataSize / 10000)), // minutes
      };
    }
  }

  /**
   * Parse Excel range string
   */
  private parseRange(rangeStr: string): { startRow: number; startCol: number; endRow: number; endCol: number } {
    // Parse range like "A1:Z100"
    const match = rangeStr.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!match) {
      return { startRow: 1, startCol: 1, endRow: 1, endCol: 1 };
    }

    const colToNum = (col: string): number => {
      let num = 0;
      for (let i = 0; i < col.length; i++) {
        num = num * 26 + (col.charCodeAt(i) - 64);
      }
      return num;
    };

    return {
      startCol: colToNum(match[1]),
      startRow: parseInt(match[2], 10),
      endCol: colToNum(match[3]),
      endRow: parseInt(match[4], 10),
    };
  }

  /**
   * Initialize Excel compatibility report
   */
  private initializeExcelCompatibility(): CompatibilityReport {
    return {
      platform: 'Excel',
      version: '2007+',
      compatibility: 'full',
      supportedFeatures: [
        'Basic cell values',
        'Formulas (300+ functions)',
        'Cell formatting',
        'Multiple sheets',
        'Cell references',
        'Named ranges',
        'Data validation',
        'Conditional formatting',
      ],
      unsupportedFeatures: [
        'VBA macros',
        'Pivot tables (limited)',
        'Charts (visual only)',
        'ActiveX controls',
      ],
      partialSupport: [
        {
          feature: 'Pivot tables',
          limitations: ['Only source data imported', 'Pivot structure not preserved'],
          workarounds: ['Recreate pivot tables in POLLN using analysis cells'],
        },
        {
          feature: 'Charts',
          limitations: ['Visual representation not preserved', 'Data series can be imported'],
          workarounds: ['Recreate charts in POLLN using visualization tools'],
        },
      ],
    };
  }

  /**
   * Initialize Google Sheets compatibility report
   */
  private initializeGoogleSheetsCompatibility(): CompatibilityReport {
    return {
      platform: 'Google Sheets',
      compatibility: 'full',
      supportedFeatures: [
        'Basic cell values',
        'Formulas (400+ functions)',
        'Cell formatting',
        'Multiple sheets',
        'Cell references',
        'Named ranges',
        'Data validation',
        'Conditional formatting',
        'Protected sheets/ranges',
      ],
      unsupportedFeatures: [
        'Google Apps Script',
        'Pivot tables (limited)',
        'Charts (visual only)',
        'Google-specific functions (limited)',
      ],
      partialSupport: [
        {
          feature: 'Google-specific functions',
          limitations: ['Functions like GOOGLETRANSLATE, GOOGLEFINANCE have limited support'],
          workarounds: ['Use POLLN equivalent functions or create custom cells'],
        },
      ],
    };
  }

  /**
   * Initialize Airtable compatibility report
   */
  private initializeAirtableCompatibility(): CompatibilityReport {
    return {
      platform: 'Airtable',
      compatibility: 'partial',
      supportedFeatures: [
        'Basic field values',
        'Formulas (limited)',
        'Multiple tables',
        'Linked records',
        'Attachments (metadata)',
        'Collaborator fields',
        'Created/modified time',
      ],
      unsupportedFeatures: [
        'Views (visual representation)',
        'Forms',
        'Interfaces',
        'Automations',
        'Sync integrations',
      ],
      partialSupport: [
        {
          feature: 'Linked records',
          limitations: ['Relationship structure not preserved', 'Requires additional API calls'],
          workarounds: ['Recreate relationships using POLLN cell references'],
        },
        {
          feature: 'Attachments',
          limitations: ['Only file metadata imported', 'Files not downloaded'],
          workarounds: ['Manually download attachments or implement file sync'],
        },
      ],
    };
  }

  /**
   * Initialize Notion compatibility report
   */
  private initializeNotionCompatibility(): CompatibilityReport {
    return {
      platform: 'Notion',
      compatibility: 'partial',
      supportedFeatures: [
        'Basic property values',
        'Formulas (limited)',
        'Databases',
        'Relations',
        'Rollups',
        'Created/modified time',
        'Created by/modified by',
      ],
      unsupportedFeatures: [
        'Page content (blocks)',
        'Comments',
        'Page layouts',
        'Templates',
        'Automation',
      ],
      partialSupport: [
        {
          feature: 'Relations',
          limitations: ['Relationship structure not preserved', 'Requires additional API calls'],
          workarounds: ['Recreate relationships using POLLN cell references'],
        },
        {
          feature: 'Rich text content',
          limitations: ['Formatting not preserved', 'Only plain text extracted'],
          workarounds: ['Manually reformat content in POLLN'],
        },
      ],
    };
  }

  /**
   * Get Excel feature mappings
   */
  private getExcelFeatureMappings(): FeatureMapping[] {
    return [
      {
        sourceFeature: 'Cell values',
        pollnEquivalent: 'LogCell with head value',
        conversionComplexity: 'simple',
      },
      {
        sourceFeature: 'Formulas',
        pollnEquivalent: 'TransformCell with reasoning',
        conversionComplexity: 'moderate',
        notes: 'Most functions supported, some may need manual adjustment',
      },
      {
        sourceFeature: 'Cell formatting',
        pollnEquivalent: 'Cell tail style',
        conversionComplexity: 'simple',
      },
      {
        sourceFeature: 'Conditional formatting',
        pollnEquivalent: 'ValidationCell',
        conversionComplexity: 'moderate',
      },
      {
        sourceFeature: 'Data validation',
        pollnEquivalent: 'ValidateCell',
        conversionComplexity: 'simple',
      },
      {
        sourceFeature: 'Pivot tables',
        pollnEquivalent: 'AnalysisCell + AggregateCell',
        conversionComplexity: 'complex',
        notes: 'Requires recreation in POLLN',
      },
      {
        sourceFeature: 'VBA macros',
        pollnEquivalent: 'Custom cells',
        conversionComplexity: 'unsupported',
        notes: 'Macros cannot be converted, must be reimplemented',
      },
    ];
  }

  /**
   * Get Google Sheets feature mappings
   */
  private getGoogleSheetsFeatureMappings(): FeatureMapping[] {
    return [
      {
        sourceFeature: 'Cell values',
        pollnEquivalent: 'LogCell with head value',
        conversionComplexity: 'simple',
      },
      {
        sourceFeature: 'Formulas',
        pollnEquivalent: 'TransformCell with reasoning',
        conversionComplexity: 'moderate',
      },
      {
        sourceFeature: 'ARRAYFORMULA',
        pollnEquivalent: 'Array processing cells',
        conversionComplexity: 'moderate',
      },
      {
        sourceFeature: 'QUERY function',
        pollnEquivalent: 'FilterCell + analysis cells',
        conversionComplexity: 'complex',
        notes: 'SQL-like syntax needs conversion',
      },
      {
        sourceFeature: 'Protected ranges',
        pollnEquivalent: 'Cell permissions',
        conversionComplexity: 'moderate',
      },
      {
        sourceFeature: 'Google Apps Script',
        pollnEquivalent: 'Custom cells',
        conversionComplexity: 'unsupported',
        notes: 'Scripts must be reimplemented',
      },
    ];
  }

  /**
   * Get Airtable feature mappings
   */
  private getAirtableFeatureMappings(): FeatureMapping[] {
    return [
      {
        sourceFeature: 'Records',
        pollnEquivalent: 'LogCells organized by table',
        conversionComplexity: 'simple',
      },
      {
        sourceFeature: 'Fields',
        pollnEquivalent: 'Cell properties',
        conversionComplexity: 'simple',
      },
      {
        sourceFeature: 'Formula fields',
        pollnEquivalent: 'TransformCell',
        conversionComplexity: 'moderate',
      },
      {
        sourceFeature: 'Lookup fields',
        pollnEquivalent: 'Cell with reference',
        conversionComplexity: 'moderate',
      },
      {
        sourceFeature: 'Rollup fields',
        pollnEquivalent: 'AggregateCell',
        conversionComplexity: 'moderate',
      },
      {
        sourceFeature: 'Linked records',
        pollnEquivalent: 'Cell references',
        conversionComplexity: 'complex',
        notes: 'Requires tracking relationships',
      },
      {
        sourceFeature: 'Views',
        pollnEquivalent: 'Custom cell filters',
        conversionComplexity: 'unsupported',
        notes: 'Views are UI-only, not data structures',
      },
    ];
  }

  /**
   * Get Notion feature mappings
   */
  private getNotionFeatureMappings(): FeatureMapping[] {
    return [
      {
        sourceFeature: 'Database pages',
        pollnEquivalent: 'LogCells organized by database',
        conversionComplexity: 'simple',
      },
      {
        sourceFeature: 'Properties',
        pollnEquivalent: 'Cell properties',
        conversionComplexity: 'simple',
      },
      {
        sourceFeature: 'Formula properties',
        pollnEquivalent: 'TransformCell',
        conversionComplexity: 'moderate',
      },
      {
        sourceFeature: 'Relation properties',
        pollnEquivalent: 'Cell references',
        conversionComplexity: 'complex',
      },
      {
        sourceFeature: 'Rollup properties',
        pollnEquivalent: 'AggregateCell',
        conversionComplexity: 'moderate',
      },
      {
        sourceFeature: 'Page content',
        pollnEquivalent: 'Text cells',
        conversionComplexity: 'unsupported',
        notes: 'Rich text content not in scope',
      },
    ];
  }
}
