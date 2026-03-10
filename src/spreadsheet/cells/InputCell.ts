/**
 * POLLN Spreadsheet Integration - InputCell
 *
 * InputCell receives user data, external data, and formulas.
 * Uses L0 logic (pure computation) for input processing.
 */

import { LogCell, LogCellConfig } from '../core/LogCell.js';
import { CellType, CellState, LogicLevel, CellOutput } from '../core/types.js';

/**
 * Input types that InputCell can receive
 */
export enum InputType {
  USER_DATA = 'user_data',       // Direct user input
  EXTERNAL_DATA = 'external',    // Data from external sources (APIs, files)
  FORMULA = 'formula',           // Formula reference
  REFERENCE = 'reference',       // Reference to another cell
  CONSTANT = 'constant',         // Static constant value
}

/**
 * Configuration for InputCell
 */
export interface InputCellConfig extends LogCellConfig {
  inputType: InputType;
  defaultValue?: unknown;
  validation?: (value: unknown) => boolean;
  format?: string;
}

/**
 * InputCell - Receives and validates input data
 *
 * Responsibilities:
 * - Accept user data, external data, and formulas
 * - Validate input against rules
 * - Transform input to standardized format
 * - Notify dependent cells of changes
 *
 * Logic Level: L0 (pure computation, no reasoning)
 */
export class InputCell extends LogCell {
  private inputType: InputType;
  private currentValue: unknown;
  private defaultValue: unknown;
  private validation?: (value: unknown) => boolean;
  private format?: string;
  private inputHistory: Array<{ value: unknown; timestamp: number }> = [];

  constructor(config: InputCellConfig) {
    super({
      ...config,
      type: CellType.INPUT,
      logicLevel: config.logicLevel ?? LogicLevel.L0_LOGIC,
    });

    this.inputType = config.inputType;
    this.defaultValue = config.defaultValue;
    this.validation = config.validation;
    this.format = config.format;
    this.currentValue = config.defaultValue;
  }

  /**
   * Receive input value
   * L0 logic: Pure validation and storage
   */
  async receiveInput(value: unknown): Promise<CellOutput> {
    const startTime = Date.now();

    try {
      this.state = CellState.SENSING;

      // L0 Validation: Pure computation, no reasoning
      if (this.validation && !this.validation(value)) {
        this.state = CellState.ERROR;
        return {
          success: false,
          value: null,
          error: 'Input validation failed',
          timestamp: Date.now(),
        };
      }

      // Store previous value for change detection
      const previousValue = this.currentValue;

      // Update current value
      this.currentValue = this.transformInput(value);

      // Record in history
      this.inputHistory.push({
        value: this.currentValue,
        timestamp: Date.now(),
      });

      // Limit history size
      if (this.inputHistory.length > 100) {
        this.inputHistory.shift();
      }

      this.state = CellState.EMITTING;

      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(true, duration);

      return {
        success: true,
        value: this.currentValue,
        previousValue,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Transform input to standardized format
   * L0 logic: Pure transformation
   */
  private transformInput(value: unknown): unknown {
    // Only transform undefined to defaultValue, keep null as null
    if (value === undefined) {
      return this.defaultValue;
    }

    // Apply format-specific transformations
    switch (this.format) {
      case 'number':
        return value === null ? null : Number(value);
      case 'string':
        return value === null ? null : String(value);
      case 'boolean':
        return value === null ? null : Boolean(value);
      case 'json':
        try {
          return value === null ? null : (typeof value === 'string' ? JSON.parse(value) : value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * Get current value
   */
  getValue(): unknown {
    return this.currentValue;
  }

  /**
   * Get current value (alias for compatibility)
   */
  getCurrentValue(): unknown {
    return this.currentValue;
  }

  /**
   * Get input type
   */
  getInputType(): InputType {
    return this.inputType;
  }

  /**
   * Get input history
   */
  getInputHistory(): Array<{ value: unknown; timestamp: number }> {
    return [...this.inputHistory];
  }

  /**
   * Clear value (reset to default)
   */
  clear(): void {
    this.currentValue = this.defaultValue;
    this.state = CellState.DORMANT;
  }

  /**
   * Override process method for L0 logic
   */
  protected async processInput(input: unknown): Promise<CellOutput> {
    return this.receiveInput(input);
  }

  /**
   * Create the processing logic for InputCell
   */
  protected createProcessingLogic(): any {
    return {
      type: 'input',
      validate: (value: unknown) => {
        if (this.validation) {
          return this.validation(value);
        }
        return true;
      },
      transform: (value: unknown) => value,
    };
  }
}

/**
 * OutputCell - Produces final results
 *
 * Responsibilities:
 * - Aggregate results from upstream cells
 * - Format output for display/export
 * - Apply output transformations
 *
 * Logic Level: L0 (pure computation)
 */
export class OutputCell extends LogCell {
  private outputFormat: string;
  private aggregatedValue: unknown;
  private outputHistory: Array<{ value: unknown; timestamp: number }> = [];

  constructor(config: LogCellConfig & { outputFormat?: string }) {
    super({
      ...config,
      type: CellType.OUTPUT,
      logicLevel: config.logicLevel ?? LogicLevel.L0_LOGIC,
    });

    this.outputFormat = config.outputFormat ?? 'raw';
  }

  /**
   * Produce output from aggregated inputs
   * L0 logic: Pure formatting and output
   */
  async produceOutput(inputs: Map<string, unknown>): Promise<CellOutput> {
    const startTime = Date.now();

    try {
      this.state = CellState.PROCESSING;

      // Aggregate inputs
      this.aggregatedValue = this.aggregateInputs(inputs);

      // Format output
      const formattedOutput = this.formatOutput(this.aggregatedValue);

      // Record history
      this.outputHistory.push({
        value: formattedOutput,
        timestamp: Date.now(),
      });

      if (this.outputHistory.length > 100) {
        this.outputHistory.shift();
      }

      this.state = CellState.EMITTING;

      const duration = Date.now() - startTime;
      this.recordExecution(inputs, formattedOutput, [], 1.0, duration);

      return {
        success: true,
        value: formattedOutput,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Aggregate inputs based on format
   */
  private aggregateInputs(inputs: Map<string, unknown>): unknown {
    if (inputs.size === 0) {
      return null;
    }

    if (inputs.size === 1) {
      return inputs.values().next().value;
    }

    // For multiple inputs, return as object
    const result: Record<string, unknown> = {};
    inputs.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Format output for display/export
   */
  private formatOutput(value: unknown): unknown {
    switch (this.outputFormat) {
      case 'json':
        return JSON.stringify(value, null, 2);
      case 'csv':
        return this.toCSV(value);
      case 'table':
        return this.toTable(value);
      case 'raw':
      default:
        return value;
    }
  }

  /**
   * Convert to CSV format
   */
  private toCSV(value: unknown): string {
    if (Array.isArray(value)) {
      if (value.length === 0) return '';
      const headers = Object.keys(value[0] as Record<string, unknown>);
      const rows = value.map((item) =>
        headers.map((h) => String((item as Record<string, unknown>)[h])).join(',')
      );
      return [headers.join(','), ...rows].join('\n');
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
        data: value,
        rowCount: value.length,
      };
    }
    return { type: 'scalar', data: value };
  }

  /**
   * Get output history
   */
  getOutputHistory(): Array<{ value: unknown; timestamp: number }> {
    return [...this.outputHistory];
  }

  /**
   * Get current aggregated value
   */
  getAggregatedValue(): unknown {
    return this.aggregatedValue;
  }
}
