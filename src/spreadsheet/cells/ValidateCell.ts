/**
 * POLLN Spreadsheet Integration - ValidateCell
 *
 * ValidateCell validates data against rules.
 * Supports rules-based validation with L0-L1 logic.
 */

import { LogCell, LogCellConfig } from '../core/LogCell.js';
import { CellType, CellState, LogicLevel, CellOutput } from '../core/types.js';

/**
 * Validation rule types
 */
export enum RuleType {
  REQUIRED = 'required',
  TYPE = 'type',
  RANGE = 'range',
  LENGTH = 'length',
  PATTERN = 'pattern',
  CUSTOM = 'custom',
  ENUM = 'enum',
  MIN = 'min',
  MAX = 'max',
  EMAIL = 'email',
  URL = 'url',
  DATE = 'date',
  NUMBER = 'number',
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  type: RuleType;
  field?: string;
  value?: unknown;
  message?: string;
  customValidator?: (value: unknown) => boolean | string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field?: string; message: string; rule: RuleType }>;
  warnings?: Array<{ field?: string; message: string }>;
}

 /**
 * Configuration for ValidateCell
 */
export interface ValidateCellConfig extends LogCellConfig {
  rules: ValidationRule[];
  stopOnFirstError?: boolean;
}

/**
 * ValidateCell - Validates data against rules
 *
 * Responsibilities:
 * - Validate data against defined rules
 * - Support multiple validation rule types
 * - Provide detailed error messages
 * - Track validation history
 *
 * Logic Level: L0-L1 (computation + simple patterns)
 */
export class ValidateCell extends LogCell {
  private rules: ValidationRule[];
  private stopOnFirstError: boolean;
  private validationHistory: Array<{ input: unknown; result: ValidationResult; timestamp: number }> = [];

  constructor(config: ValidateCellConfig) {
    super({
      type: CellType.VALIDATE,
      position: config.position,
      logicLevel: LogicLevel.L1_PATTERN,
      memoryLimit: config.memoryLimit,
    });

    this.rules = config.rules;
    this.stopOnFirstError = config.stopOnFirstError ?? false;
  }

  /**
   * Validate input data
   */
  async validate(input: unknown): Promise<CellOutput> {
    this.state = CellState.PROCESSING;
    const startTime = Date.now();

    try {
      const result = this.runValidation(input);

      this.state = CellState.EMITTING;

      this.validationHistory.push({
        input,
        result,
        timestamp: Date.now(),
      });

      return {
        success: result.valid,
        value: result,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        error: error instanceof Error ? error.message : 'Validation failed',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Run all validation rules
   */
  private runValidation(input: unknown): ValidationResult {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    for (const rule of this.rules) {
    const value = this.getFieldValue(input, rule.field);
    const error = this.validateRule(value, rule);

    if (error) {
      errors.push({
        field: rule.field,
        message: error,
        rule: rule.type,
      });

      if (this.stopOnFirstError) {
        break;
      }
    }
  }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a single rule
   */
  private validateRule(value: unknown, rule: ValidationRule): string | null {
    switch (rule.type) {
    case RuleType.REQUIRED:
      return this.validateRequired(value, rule);

    case RuleType.TYPE:
      return this.validateType(value, rule);

    case RuleType.RANGE:
      return this.validateRange(value, rule);

    case RuleType.LENGTH:
      return this.validateLength(value, rule);

    case RuleType.PATTERN:
      return this.validatePattern(value, rule);

    case RuleType.CUSTOM:
      return this.validateCustom(value, rule);

    case RuleType.ENUM:
      return this.validateEnum(value, rule);

    case RuleType.MIN:
      return this.validateMin(value, rule);

    case RuleType.MAX:
      return this.validateMax(value, rule);

    case RuleType.EMAIL:
      return this.validateEmail(value, rule);

    case RuleType.URL:
      return this.validateUrl(value, rule);

    case RuleType.DATE:
      return this.validateDate(value, rule);

    case RuleType.NUMBER:
      return this.validateNumber(value, rule);

    default:
      return null;
    }
  }

  /**
   * Get field value from input
   */
  private getFieldValue(input: unknown, field?: string): unknown {
    if (!field) {
      return input;
    }

    if (typeof input === 'object' && input !== null) {
      return (input as Record<string, unknown>)[field];
    }

    return input;
  }

  /**
   * Validate required field
   */
  private validateRequired(value: unknown, rule: ValidationRule): string | null {
    if (value === null || value === undefined || value === '') {
      return rule.message || 'Field is required';
    }
    return null;
  }

  /**
   * Validate type
   */
  private validateType(value: unknown, rule: ValidationRule): string | null {
    const expectedType = rule.value as string;
    const actualType = typeof value;

    if (expectedType === 'array' && !Array.isArray(value)) {
      return rule.message || `Expected array, got ${actualType}`;
    }

    if (expectedType === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
      return rule.message || `Expected object, got ${actualType}`;
    }

    if (expectedType !== 'array' && expectedType !== 'object' && actualType !== expectedType) {
      return rule.message || `Expected ${expectedType}, got ${actualType}`;
    }

    return null;
  }

  /**
   * Validate range
   */
  private validateRange(value: unknown, rule: ValidationRule): string | null {
    if (typeof value !== 'number') {
      return rule.message || 'Range validation requires number';
    }

    const range = rule.value as [number, number];
    if (!Array.isArray(range) || range.length !== 2) {
      return 'Invalid range configuration';
    }

    const [min, max] = range;
    if (value < min || value > max) {
      return rule.message || `Value must be between ${min} and ${max}`;
    }

    return null;
  }

  /**
   * Validate length
   */
  private validateLength(value: unknown, rule: ValidationRule): string | null {
    const str = String(value);
    const expectedLength = rule.value as number;

    if (str.length !== expectedLength) {
      return rule.message || `Length must be ${expectedLength}`;
    }

    return null;
  }

  /**
   * Validate pattern (regex)
   */
  private validatePattern(value: unknown, rule: ValidationRule): string | null {
    const pattern = rule.value as string | RegExp;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    if (!regex.test(String(value))) {
      return rule.message || 'Value does not match required pattern';
    }

    return null;
  }

  /**
   * Validate with custom function
   */
  private validateCustom(value: unknown, rule: ValidationRule): string | null {
    if (!rule.customValidator) {
      return 'Custom validator not provided';
    }

    const result = rule.customValidator(value);
    if (result === true) {
      return null;
    }

    return typeof result === 'string' ? result : rule.message || 'Custom validation failed';
  }

  /**
   * Validate enum
   */
  private validateEnum(value: unknown, rule: ValidationRule): string | null {
    const allowedValues = rule.value as unknown[];

    if (!Array.isArray(allowedValues)) {
      return 'Invalid enum configuration';
    }

    if (!allowedValues.includes(value)) {
      return rule.message || `Value must be one of: ${allowedValues.join(', ')}`;
    }

    return null;
  }

  /**
   * Validate minimum value
   */
  private validateMin(value: unknown, rule: ValidationRule): string | null {
    if (typeof value !== 'number') {
      return rule.message || 'Min validation requires number';
    }

    const min = rule.value as number;
    if (value < min) {
      return rule.message || `Value must be at least ${min}`;
    }

    return null;
  }

  /**
   * Validate maximum value
   */
  private validateMax(value: unknown, rule: ValidationRule): string | null {
    if (typeof value !== 'number') {
      return rule.message || 'Max validation requires number';
    }

    const max = rule.value as number;
    if (value > max) {
      return rule.message || `Value must be at most ${max}`;
    }

    return null;
  }

  /**
   * Validate email format
   */
  private validateEmail(value: unknown, rule: ValidationRule): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(String(value))) {
      return rule.message || 'Invalid email format';
    }

    return null;
  }

  /**
   * Validate URL format
   */
  private validateUrl(value: unknown, rule: ValidationRule): string | null {
    try {
      new URL(String(value));
      return null;
    } catch {
      return rule.message || 'Invalid URL format';
    }
  }

  /**
   * Validate date format
   */
  private validateDate(value: unknown, rule: ValidationRule): string | null {
    const date = new Date(String(value));

    if (isNaN(date.getTime())) {
      return rule.message || 'Invalid date format';
    }

    return null;
  }

  /**
   * Validate number
   */
  private validateNumber(value: unknown, rule: ValidationRule): string | null {
    if (typeof value !== 'number' && isNaN(Number(value))) {
      return rule.message || 'Value must be a number';
    }

    return null;
  }

  /**
   * Add a validation rule
   */
  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove a validation rule
   */
  removeRule(index: number): void {
    this.rules.splice(index, 1);
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules = [];
  }

  /**
   * Get current rules
   */
  getRules(): ValidationRule[] {
    return [...this.rules];
  }

  /**
   * Get validation history
   */
  getValidationHistory(): Array<{ input: unknown; result: ValidationResult; timestamp: number }> {
    return [...this.validationHistory];
  }
}
