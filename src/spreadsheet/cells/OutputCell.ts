/**
 * POLLN Spreadsheet Integration - OutputCell
 *
 * OutputCell produces final results for display/export.
 * Uses L0 logic (pure computation).
 */

import { LogCell, LogCellConfig } from '../core/LogCell.js';
import { CellType, CellState, LogicLevel, CellOutput } from '../core/types.js';

/**
 * Output format options
 */
export enum OutputFormat {
  RAW = 'raw',         // Raw value
  JSON = 'json',       // JSON string
  CSV = 'csv',         // CSV format
  TABLE = 'table',     // Table structure
  CHART = 'chart',     // Chart data
  REPORT = 'report',   // Formatted report
}

/**
 * Configuration for OutputCell
 */
export interface OutputCellConfig extends LogCellConfig {
  outputFormat?: OutputFormat;
  label?: string;
  description?: string;
}

/**
 * OutputCell - Produces final results
 *
 * Responsibilities:
 * - Format output for display
 * - Support multiple output formats
 * - Track output history
 * - Provide value to end users
 *
 * Logic Level: L0 (pure computation, no reasoning)
 */
export class OutputCell extends LogCell {
  private outputFormat: OutputFormat;
  private label?: string;
  private description?: string;
  private currentValue: unknown;
  private outputHistory: Array<{ value: unknown; formatted: unknown; timestamp: number }> = [];

  constructor(config: OutputCellConfig) {
    super({
      type: CellType.OUTPUT,
      position: config.position,
      logicLevel: LogicLevel.L0_LOGIC,
      memoryLimit: config.memoryLimit,
    });

    this.outputFormat = config.outputFormat || OutputFormat.RAW;
    this.label = config.label;
    this.description = config.description;
  }

  /**
   * Set the output value
   */
  async setValue(value: unknown): Promise<CellOutput> {
    const startTime = Date.now();
    this.state = CellState.PROCESSING;

    try {
      this.currentValue = value;
      const formatted = this.formatOutput(value);

      // Add to history
      this.outputHistory.push({
        value,
        formatted,
        timestamp: startTime,
      });

      // Trim history if needed
      if (this.outputHistory.length > this.memoryLimit) {
        this.outputHistory = this.outputHistory.slice(-this.memoryLimit);
      }

      this.state = CellState.EMITTING;
      this.performanceMetrics.totalExecutions++;

      return {
        success: true,
        value: formatted,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.state = CellState.ERROR;
      this.lastError = error instanceof Error ? error : new Error(String(error));

      return {
        success: false,
        value: null,
        error: this.lastError.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get current value
   */
  getValue(): unknown {
    return this.currentValue;
  }

  /**
   * Get formatted value
   */
  getFormattedValue(): unknown {
    return this.formatOutput(this.currentValue);
  }

  /**
   * Set output format
   */
  setOutputFormat(format: OutputFormat): void {
    this.outputFormat = format;
  }

  /**
   * Format output based on current format setting
   */
  private formatOutput(value: unknown): unknown {
    switch (this.outputFormat) {
      case OutputFormat.JSON:
        return JSON.stringify(value, null, 2);
      case OutputFormat.CSV:
        return this.toCSV(value);
      case OutputFormat.TABLE:
        return this.toTable(value);
      case OutputFormat.CHART:
        return this.toChartData(value);
      case OutputFormat.REPORT:
        return this.toReport(value);
      case OutputFormat.RAW:
      default:
        return value;
    }
  }

  /**
   * Convert to CSV format
   */
  private toCSV(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return '';
      if (typeof value[0] === 'object' && value[0] !== null) {
        const headers = Object.keys(value[0]);
        const rows = value.map((item) =>
          headers.map((h) => {
            const cellValue = (item as Record<string, unknown>)[h];
            const cellString = String(cellValue ?? '');
            // Escape quotes and wrap in quotes if contains comma
            if (cellString.includes(',') || cellString.includes('"')) {
              return `"${cellString.replace(/"/g, '""')}"`;
            }
            return cellString;
          }).join(',')
        );
        return [headers.join(','), ...rows].join('\n');
      }
      return value.map((v) => String(v)).join('\n');
    }
    return String(value);
  }

  /**
   * Convert to table format
   */
  private toTable(value: unknown): unknown {
    if (Array.isArray(value)) {
      return {
        type: 'table',
        headers: value.length > 0 && typeof value[0] === 'object'
          ? Object.keys(value[0])
          : ['value'],
        rows: value,
        rowCount: value.length,
      };
    }
    return {
      type: 'scalar',
      value,
    };
  }

  /**
   * Convert to chart data format
   */
  private toChartData(value: unknown): unknown {
    if (Array.isArray(value)) {
      // Assume array of {x, y} or [x, y] pairs
      const data = value.map((item, index) => {
        if (typeof item === 'object' && item !== null && 'x' in item && 'y' in item) {
          return { x: (item as { x: unknown }).x, y: (item as { y: unknown }).y };
        }
        if (Array.isArray(item) && item.length >= 2) {
          return { x: item[0], y: item[1] };
        }
        return { x: index, y: item };
      });

      return {
        type: 'chart',
        data,
        pointCount: data.length,
      };
    }
    return {
      type: 'chart',
      data: [{ x: 0, y: value }],
      pointCount: 1,
    };
  }

  /**
   * Convert to report format
   */
  private toReport(value: unknown): unknown {
    const timestamp = new Date().toISOString();
    const label = this.label || 'Output';

    return {
      type: 'report',
      title: label,
      description: this.description,
      generatedAt: timestamp,
      data: value,
      format: this.outputFormat,
    };
  }

  /**
   * Get output history
   */
  getOutputHistory(): Array<{ value: unknown; formatted: unknown; timestamp: number }> {
    return [...this.outputHistory];
  }

  /**
   * Get label
   */
  getLabel(): string | undefined {
    return this.label;
  }

  /**
   * Get description
   */
  getDescription(): string | undefined {
    return this.description;
  }

  /**
   * Clear output
   */
  clear(): void {
    this.currentValue = undefined;
    this.outputHistory = [];
    this.state = CellState.DORMANT;
  }
}
