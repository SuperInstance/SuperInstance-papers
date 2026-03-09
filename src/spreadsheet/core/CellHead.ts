/**
 * CellHead - Input Reception and Sensing System
 *
 * The head is the cell's sensory organ. It:
 * - Receives data from spreadsheet or other cells
 * - Senses changes in watched cells
 * - Recognizes patterns in inputs
 * - Validates incoming data
 *
 * This is part of the cell anatomy: HEAD -> BODY -> TAIL
 */

import {
  CellReference,
  Sensation,
  SensationConfig,
  SensationDetector,
  SensationType,
  createSensation,
} from './Sensation';

/**
 * Input channel types
 */
export enum InputChannelType {
  /** Direct user input */
  USER = 'user',

  /** External API/data source */
  EXTERNAL = 'external',

  /** Formula calculation */
  FORMULA = 'formula',

  /** From another cell's output */
  CELL = 'cell',

  /** From sensation watching */
  SENSATION = 'sensation',
}

/**
 * Input channel definition
 */
export interface InputChannel {
  /** Unique channel identifier */
  id: string;

  /** Channel type */
  type: InputChannelType;

  /** Channel source (optional) */
  source?: CellReference;

  /** Whether channel is active */
  active: boolean;

  /** Last received value */
  lastValue?: any;

  /** Last received timestamp */
  lastTimestamp?: number;
}

/**
 * Pattern recognizer type
 */
export enum RecognizerType {
  /** Regular expression match */
  REGEX = 'regex',

  /** Numeric range check */
  NUMERIC_RANGE = 'numeric_range',

  /** Type check */
  TYPE_CHECK = 'type_check',

  /** Custom function */
  CUSTOM = 'custom',
}

/**
 * Pattern recognizer definition
 */
export interface PatternRecognizer {
  /** Unique recognizer identifier */
  id: string;

  /** Recognizer type */
  type: RecognizerType;

  /** Recognizer configuration */
  config: {
    /** For REGEX: pattern to match */
    pattern?: RegExp;

    /** For NUMERIC_RANGE: min and max values */
    min?: number;
    max?: number;

    /** For TYPE_CHECK: expected type */
    expectedType?: string;

    /** For CUSTOM: validation function */
    validator?: (value: any) => boolean;
  };

  /** Recognition confidence (0-1) */
  confidence: number;

  /** Whether recognizer is enabled */
  enabled: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation message */
  message?: string;

  /** Confidence in validation (0-1) */
  confidence: number;

  /** Validator that produced this result */
  validatorId: string;
}

/**
 * Validator definition
 */
export interface Validator {
  /** Unique validator identifier */
  id: string;

  /** Validator name/description */
  name: string;

  /** Validation function */
  validate: (value: any) => ValidationResult;

  /** Whether validator is enabled */
  enabled: boolean;

  /** Priority (higher validators run first) */
  priority: number;
}

/**
 * Watched cell configuration
 */
export interface WatchedCell {
  /** Cell reference to watch */
  reference: CellReference;

  /** Types of sensations to detect */
  sensationTypes: SensationType[];

  /** Detection threshold */
  threshold: number;

  /** Sample rate (milliseconds) */
  sampleRate: number;

  /** Last detected sensation */
  lastSensation?: Sensation;

  /** Last sample timestamp */
  lastSampleTime?: number;

  /** Whether watching is active */
  active: boolean;
}

/**
 * Input received event data
 */
export interface InputReceivedEvent {
  /** Channel that received input */
  channel: InputChannel;

  /** Received value */
  value: any;

  /** Timestamp of receipt */
  timestamp: number;

  /** Validation results */
  validations: ValidationResult[];

  /** Recognized patterns */
  patterns: string[];
}

/**
 * CellHead state
 */
export interface CellHeadState {
  /** All input channels */
  inputs: InputChannel[];

  /** All pattern recognizers */
  recognizers: PatternRecognizer[];

  /** All validators */
  validators: Validator[];

  /** All watched cells */
  watchedCells: WatchedCell[];

  /** Current sensations from watched cells */
  sensations: Sensation[];
}

/**
 * CellHead - The sensory organ of a LOG cell
 */
export class CellHead {
  private state: CellHeadState;
  private sensationDetector: SensationDetector;
  private inputCallbacks: Set<(event: InputReceivedEvent) => void>;
  private sensationCallbacks: Set<(sensation: Sensation) => void>;

  constructor() {
    this.state = {
      inputs: [],
      recognizers: [],
      validators: [],
      watchedCells: [],
      sensations: [],
    };

    this.sensationDetector = new SensationDetector();
    this.inputCallbacks = new Set();
    this.sensationCallbacks = new Set();
  }

  /**
   * Get current head state
   */
  getState(): CellHeadState {
    return { ...this.state };
  }

  /**
   * Add an input channel
   */
  addInputChannel(channel: InputChannel): void {
    // Check for duplicate IDs
    if (this.state.inputs.some(c => c.id === channel.id)) {
      throw new Error(`Input channel with id '${channel.id}' already exists`);
    }

    this.state.inputs.push({ ...channel });
  }

  /**
   * Remove an input channel
   */
  removeInputChannel(channelId: string): void {
    this.state.inputs = this.state.inputs.filter(c => c.id !== channelId);
  }

  /**
   * Get an input channel by ID
   */
  getInputChannel(channelId: string): InputChannel | undefined {
    return this.state.inputs.find(c => c.id === channelId);
  }

  /**
   * Get all input channels
   */
  getInputChannels(): InputChannel[] {
    return [...this.state.inputs];
  }

  /**
   * Activate an input channel
   */
  activateInputChannel(channelId: string): void {
    const channel = this.getInputChannel(channelId);
    if (channel) {
      channel.active = true;
    }
  }

  /**
   * Deactivate an input channel
   */
  deactivateInputChannel(channelId: string): void {
    const channel = this.getInputChannel(channelId);
    if (channel) {
      channel.active = false;
    }
  }

  /**
   * Add a pattern recognizer
   */
  addRecognizer(recognizer: PatternRecognizer): void {
    if (this.state.recognizers.some(r => r.id === recognizer.id)) {
      throw new Error(`Recognizer with id '${recognizer.id}' already exists`);
    }

    this.state.recognizers.push({ ...recognizer });
  }

  /**
   * Remove a pattern recognizer
   */
  removeRecognizer(recognizerId: string): void {
    this.state.recognizers = this.state.recognizers.filter(r => r.id !== recognizerId);
  }

  /**
   * Get all pattern recognizers
   */
  getRecognizers(): PatternRecognizer[] {
    return [...this.state.recognizers];
  }

  /**
   * Add a validator
   */
  addValidator(validator: Validator): void {
    if (this.state.validators.some(v => v.id === validator.id)) {
      throw new Error(`Validator with id '${validator.id}' already exists`);
    }

    // Insert in priority order (highest first)
    const validators = [...this.state.validators, validator];
    validators.sort((a, b) => b.priority - a.priority);
    this.state.validators = validators;
  }

  /**
   * Remove a validator
   */
  removeValidator(validatorId: string): void {
    this.state.validators = this.state.validators.filter(v => v.id !== validatorId);
  }

  /**
   * Get all validators
   */
  getValidators(): Validator[] {
    return [...this.state.validators];
  }

  /**
   * Watch a cell for sensations
   */
  watchCell(watchedCell: WatchedCell): void {
    // Check if already watching this cell
    const existing = this.state.watchedCells.findIndex(
      w => w.reference.row === watchedCell.reference.row &&
           w.reference.col === watchedCell.reference.col &&
           w.reference.sheet === watchedCell.reference.sheet
    );

    if (existing >= 0) {
      // Update existing watched cell
      this.state.watchedCells[existing] = { ...watchedCell };
    } else {
      // Add new watched cell
      this.state.watchedCells.push({ ...watchedCell });
    }
  }

  /**
   * Stop watching a cell
   */
  unwatchCell(ref: CellReference): void {
    this.state.watchedCells = this.state.watchedCells.filter(
      w => !(w.reference.row === ref.row &&
            w.reference.col === ref.col &&
            w.reference.sheet === ref.sheet)
    );

    // Clear history for this cell
    this.sensationDetector.clearHistory(ref);
  }

  /**
   * Get all watched cells
   */
  getWatchedCells(): WatchedCell[] {
    return [...this.state.watchedCells];
  }

  /**
   * Get current sensations
   */
  getSensations(): Sensation[] {
    return [...this.state.sensations];
  }

  /**
   * Register callback for input received events
   */
  onInputReceived(callback: (event: InputReceivedEvent) => void): void {
    this.inputCallbacks.add(callback);
  }

  /**
   * Unregister input received callback
   */
  offInputReceived(callback: (event: InputReceivedEvent) => void): void {
    this.inputCallbacks.delete(callback);
  }

  /**
   * Register callback for sensation events
   */
  onSensation(callback: (sensation: Sensation) => void): void {
    this.sensationCallbacks.add(callback);
  }

  /**
   * Unregister sensation callback
   */
  offSensation(callback: (sensation: Sensation) => void): void {
    this.sensationCallbacks.delete(callback);
  }

  /**
   * Validate a value using all enabled validators
   */
  validate(value: any): ValidationResult[] {
    const enabledValidators = this.state.validators.filter(v => v.enabled);
    const results: ValidationResult[] = [];

    for (const validator of enabledValidators) {
      try {
        const result = validator.validate(value);
        results.push(result);
      } catch (error) {
        // If validator throws, mark as invalid
        results.push({
          valid: false,
          message: error instanceof Error ? error.message : 'Validation error',
          confidence: 0,
          validatorId: validator.id,
        });
      }
    }

    return results;
  }

  /**
   * Recognize patterns in a value
   */
  recognizePatterns(value: any): { patternId: string; confidence: number }[] {
    const enabledRecognizers = this.state.recognizers.filter(r => r.enabled);
    const matches: { patternId: string; confidence: number }[] = [];

    for (const recognizer of enabledRecognizers) {
      try {
        let matched = false;

        switch (recognizer.type) {
          case RecognizerType.REGEX:
            if (typeof value === 'string' && recognizer.config.pattern) {
              matched = recognizer.config.pattern.test(value);
            }
            break;

          case RecognizerType.NUMERIC_RANGE:
            if (typeof value === 'number') {
              const min = recognizer.config.min ?? -Infinity;
              const max = recognizer.config.max ?? Infinity;
              matched = value >= min && value <= max;
            }
            break;

          case RecognizerType.TYPE_CHECK:
            const expectedType = recognizer.config.expectedType;
            if (expectedType === 'string') {
              matched = typeof value === 'string';
            } else if (expectedType === 'number') {
              matched = typeof value === 'number';
            } else if (expectedType === 'boolean') {
              matched = typeof value === 'boolean';
            } else if (expectedType === 'array') {
              matched = Array.isArray(value);
            } else if (expectedType === 'object') {
              matched = typeof value === 'object' && value !== null && !Array.isArray(value);
            }
            break;

          case RecognizerType.CUSTOM:
            if (recognizer.config.validator) {
              matched = recognizer.config.validator(value);
            }
            break;
        }

        if (matched) {
          matches.push({
            patternId: recognizer.id,
            confidence: recognizer.confidence,
          });
        }
      } catch (error) {
        // Silently skip recognizers that throw
        continue;
      }
    }

    return matches;
  }

  /**
   * Receive input on a channel
   */
  receiveInput(channelId: string, value: any): void {
    const channel = this.getInputChannel(channelId);

    if (!channel) {
      throw new Error(`Input channel '${channelId}' not found`);
    }

    if (!channel.active) {
      return; // Silently ignore input on inactive channels
    }

    // Update channel state
    channel.lastValue = value;
    channel.lastTimestamp = Date.now();

    // Validate
    const validations = this.validate(value);

    // Recognize patterns
    const patterns = this.recognizePatterns(value);

    // Create event
    const event: InputReceivedEvent = {
      channel: { ...channel },
      value,
      timestamp: Date.now(),
      validations,
      patterns: patterns.map(p => p.patternId),
    };

    // Notify callbacks
    for (const callback of this.inputCallbacks) {
      try {
        callback(event);
      } catch (error) {
        // Don't let one bad callback break others
        console.error('Error in input callback:', error);
      }
    }
  }

  /**
   * Process cell value change for sensation detection
   */
  processCellChange(
    ref: CellReference,
    newValue: any,
    oldValue?: any
  ): Sensation[] {
    const newSensations: Sensation[] = [];

    // Find all watched cells matching this reference
    const watchedCells = this.state.watchedCells.filter(
      w => w.reference.row === ref.row &&
           w.reference.col === ref.col &&
           w.reference.sheet === ref.sheet &&
           w.active
    );

    for (const watched of watchedCells) {
      // Check sample rate
      const now = Date.now();
      if (watched.lastSampleTime &&
          (now - watched.lastSampleTime) < watched.sampleRate) {
        continue;
      }

      // Create sensation config
      const config: SensationConfig = {
        targetCell: ref,
        sensationTypes: watched.sensationTypes,
        threshold: watched.threshold,
        sampleRate: watched.sampleRate,
        onSensation: (s) => {
          // Will be handled below
        },
      };

      // Detect sensations
      const sensations = this.sensationDetector.detectSensations(
        ref,
        newValue,
        oldValue,
        config
      );

      // Update watched cell state
      watched.lastSampleTime = now;

      // Add to new sensations
      newSensations.push(...sensations);

      // Update last sensation
      if (sensations.length > 0) {
        watched.lastSensation = sensations[sensations.length - 1];
      }
    }

    // Add to current sensations
    this.state.sensations.push(...newSensations);

    // Notify sensation callbacks
    for (const sensation of newSensations) {
      for (const callback of this.sensationCallbacks) {
        try {
          callback(sensation);
        } catch (error) {
          console.error('Error in sensation callback:', error);
        }
      }
    }

    return newSensations;
  }

  /**
   * Clear old sensations (older than specified milliseconds)
   */
  clearOldSensations(maxAge: number = 60000): void {
    const now = Date.now();
    this.state.sensations = this.state.sensations.filter(
      s => (now - s.timestamp) < maxAge
    );
  }

  /**
   * Clear all sensations
   */
  clearAllSensations(): void {
    this.state.sensations = [];
  }

  /**
   * Reset head to initial state
   */
  reset(): void {
    this.state = {
      inputs: [],
      recognizers: [],
      validators: [],
      watchedCells: [],
      sensations: [],
    };

    this.sensationDetector.clearAll();
    this.inputCallbacks.clear();
    this.sensationCallbacks.clear();
  }

  /**
   * Get head summary for inspection
   */
  getSummary(): {
    inputCount: number;
    activeInputCount: number;
    recognizerCount: number;
    validatorCount: number;
    watchedCellCount: number;
    sensationCount: number;
  } {
    return {
      inputCount: this.state.inputs.length,
      activeInputCount: this.state.inputs.filter(i => i.active).length,
      recognizerCount: this.state.recognizers.length,
      validatorCount: this.state.validators.length,
      watchedCellCount: this.state.watchedCells.filter(w => w.active).length,
      sensationCount: this.state.sensations.length,
    };
  }
}

/**
 * Factory function to create a CellHead with common configuration
 */
export function createCellHead(config?: {
  inputs?: InputChannel[];
  recognizers?: PatternRecognizer[];
  validators?: Validator[];
}): CellHead {
  const head = new CellHead();

  if (config?.inputs) {
    for (const input of config.inputs) {
      head.addInputChannel(input);
    }
  }

  if (config?.recognizers) {
    for (const recognizer of config.recognizers) {
      head.addRecognizer(recognizer);
    }
  }

  if (config?.validators) {
    for (const validator of config.validators) {
      head.addValidator(validator);
    }
  }

  return head;
}

/**
 * Common validator factory functions
 */
export const CommonValidators = {
  /** Create a type validator */
  typeValidator: (expectedType: string): Validator => ({
    id: `type-${expectedType}`,
    name: `Type check: ${expectedType}`,
    validate: (value: any) => ({
      valid: typeof value === expectedType,
      message: typeof value === expectedType
        ? undefined
        : `Expected ${expectedType}, got ${typeof value}`,
      confidence: 1.0,
      validatorId: `type-${expectedType}`,
    }),
    enabled: true,
    priority: 100,
  }),

  /** Create a range validator for numbers */
  rangeValidator: (min: number, max: number): Validator => ({
    id: `range-${min}-${max}`,
    name: `Range check: [${min}, ${max}]`,
    validate: (value: any) => {
      const valid = typeof value === 'number' && value >= min && value <= max;
      return {
        valid,
        message: valid ? undefined : `Value ${value} not in range [${min}, ${max}]`,
        confidence: 1.0,
        validatorId: `range-${min}-${max}`,
      };
    },
    enabled: true,
    priority: 90,
  }),

  /** Create a required validator */
  requiredValidator: (): Validator => ({
    id: 'required',
    name: 'Required check',
    validate: (value: any) => ({
      valid: value !== null && value !== undefined && value !== '',
      message: value !== null && value !== undefined && value !== ''
        ? undefined
        : 'Value is required',
      confidence: 1.0,
      validatorId: 'required',
    }),
    enabled: true,
    priority: 1000,
  }),

  /** Create a regex validator for strings */
  regexValidator: (pattern: RegExp, description: string): Validator => ({
    id: `regex-${description}`,
    name: `Regex check: ${description}`,
    validate: (value: any) => {
      const valid = typeof value === 'string' && pattern.test(value);
      return {
        valid,
        message: valid ? undefined : `Value does not match pattern ${description}`,
        confidence: 1.0,
        validatorId: `regex-${description}`,
      };
    },
    enabled: true,
    priority: 80,
  }),
};
