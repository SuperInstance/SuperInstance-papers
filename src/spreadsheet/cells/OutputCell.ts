/**
 * POLLN Spreadsheet Integration - OutputCell
 *
 * OutputCell produces final results for display/export.
 * Uses L0 logic (pure computation).
 */

import { LogCell, LogCellConfig } from '../core/LogCell.js';
import {
  CellType,
  CellState,
  LogicLevel,
  CellOutput,
  Feedback,
  ProcessingContext,
  ProcessingResult,
  ReasoningStepType,
} from '../core/types.js';

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
  private memoryLimit: number;

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
    this.memoryLimit = config.memoryLimit || 100;
  }

  /**
   * Set the output value
   * Internal method that handles the actual formatting and storage
   */
  private async setValueInternal(value: unknown): Promise<{
    success: boolean;
    value: unknown;
    error?: string;
    timestamp: number;
    duration: number;
  }> {
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
        duration: Date.now() - startTime,
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
   * Output method for test compatibility
   * This is a simpler API that wraps the process method
   */
  async output(value: unknown): Promise<{
    success: boolean;
    value: unknown;
    error?: string;
    timestamp: number;
  }> {
    const result = await this.setValueInternal(value);

    return {
      success: result.success,
      value: result.value,
      error: result.error,
      timestamp: result.timestamp,
    };
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

  // ========================================================================
  // Abstract Method Implementations
  // ========================================================================

  /**
   * Activate the cell
   */
  async activate(): Promise<void> {
    this.transitionTo(CellState.SENSING);
  }

  /**
   * Process input and produce output
   */
  async process(input: unknown): Promise<CellOutput> {
    const result = await this.setValueInternal(input);

    return {
      value: result.value,
      confidence: result.success ? 1.0 : 0,
      explanation: result.success ? 'Output formatted successfully' : result.error || 'Unknown error',
      trace: {
        steps: [],
        dependencies: [],
        confidence: result.success ? 1.0 : 0,
        totalTime: result.duration,
        startTime: result.timestamp,
        endTime: result.timestamp + result.duration,
      },
      effects: [],
    };
  }

  /**
   * Learn from feedback
   * L0 logic: No learning capability for OutputCell
   */
  async learn(feedback: Feedback): Promise<void> {
    // OutputCell is L0 - no learning
    // Just acknowledge the feedback was received
    this.transitionTo(CellState.DORMANT);
  }

  /**
   * Deactivate the cell
   */
  async deactivate(): Promise<void> {
    this.transitionTo(CellState.DORMANT);
  }

  /**
   * Execute processing logic
   */
  protected async executeProcessing(
    input: unknown,
    context: ProcessingContext
  ): Promise<ProcessingResult> {
    const result = await this.setValueInternal(input);

    return {
      value: result.value,
      confidence: result.success ? 1.0 : 0,
      explanation: result.success ? 'Output formatted successfully' : result.error || 'Unknown error',
      trace: {
        steps: [
          {
            id: `step-${Date.now()}`,
            type: ReasoningStepType.VALIDATION,
            description: `Format output as ${this.outputFormat}`,
            input,
            output: result.value,
            confidence: result.success ? 1.0 : 0,
            duration: result.duration,
            timestamp: result.timestamp,
            dependencies: [],
          },
        ],
        dependencies: [],
        confidence: result.success ? 1.0 : 0,
        totalTime: result.duration,
        startTime: result.timestamp,
        endTime: result.timestamp + result.duration,
      },
    };
  }

  // ========================================================================
  // Factory Method Implementations
  // ========================================================================

  /**
   * Create the processing logic for OutputCell
   *
   * OutputCell handles output generation and formatting.
   * It supports multiple output formats (json, csv, table, raw).
   * It returns formatted output to downstream cells or display components,
   * or data export.
   */
  protected createProcessingLogic(): any {
    return {
      type: 'output',
      format: (value: unknown, format: string): unknown => {
        switch (format) {
          case 'json':
            return JSON.stringify(value, null, 2);
          case 'csv':
            return this.toCSV(value);
          case 'table':
            return this.toTable(value);
          case 'chart':
            return this.toChartData(value);
          case 'report':
            return this.toReport(value);
          case 'raw':
          default:
            return value;
        }
      },
      validate: (value: unknown): boolean => {
        // L0 logic: Basic validation for output
        return value !== null && value !== undefined;
      },
      transform: (value: unknown): unknown => {
        // L0 logic: No transformation needed for output
        return value;
      },
    };
  }
}
