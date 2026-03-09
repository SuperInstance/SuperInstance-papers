/**
 * Unit tests for CellHead system
 */

import {
  CellHead,
  InputChannel,
  InputChannelType,
  PatternRecognizer,
  RecognizerType,
  Validator,
  WatchedCell,
  InputReceivedEvent,
  createCellHead,
  CommonValidators,
} from '../CellHead';
import {
  SensationType,
  CellReference,
  Sensation,
} from '../Sensation';

describe('CellHead', () => {
  describe('Initialization', () => {
    it('should create a new CellHead', () => {
      const head = new CellHead();

      const state = head.getState();
      expect(state.inputs).toEqual([]);
      expect(state.recognizers).toEqual([]);
      expect(state.validators).toEqual([]);
      expect(state.watchedCells).toEqual([]);
      expect(state.sensations).toEqual([]);
    });

    it('should create CellHead with factory function', () => {
      const input: InputChannel = {
        id: 'test-input',
        type: InputChannelType.USER,
        active: true,
      };

      const head = createCellHead({ inputs: [input] });

      const state = head.getState();
      expect(state.inputs.length).toBe(1);
      expect(state.inputs[0].id).toBe('test-input');
    });
  });

  describe('Input Channels', () => {
    let head: CellHead;

    beforeEach(() => {
      head = new CellHead();
    });

    it('should add an input channel', () => {
      const channel: InputChannel = {
        id: 'user-input',
        type: InputChannelType.USER,
        active: true,
      };

      head.addInputChannel(channel);

      const channels = head.getInputChannels();
      expect(channels.length).toBe(1);
      expect(channels[0]).toEqual(channel);
    });

    it('should throw when adding duplicate channel ID', () => {
      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: true,
      };

      head.addInputChannel(channel);

      expect(() => {
        head.addInputChannel(channel);
      }).toThrow("Input channel with id 'test' already exists");
    });

    it('should remove an input channel', () => {
      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: true,
      };

      head.addInputChannel(channel);
      head.removeInputChannel('test');

      const channels = head.getInputChannels();
      expect(channels.length).toBe(0);
    });

    it('should get input channel by ID', () => {
      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: true,
      };

      head.addInputChannel(channel);

      const retrieved = head.getInputChannel('test');
      expect(retrieved).toEqual(channel);
    });

    it('should return undefined for non-existent channel', () => {
      const retrieved = head.getInputChannel('nonexistent');
      expect(retrieved).toBeUndefined();
    });

    it('should activate an input channel', () => {
      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: false,
      };

      head.addInputChannel(channel);
      head.activateInputChannel('test');

      const retrieved = head.getInputChannel('test');
      expect(retrieved?.active).toBe(true);
    });

    it('should deactivate an input channel', () => {
      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: true,
      };

      head.addInputChannel(channel);
      head.deactivateInputChannel('test');

      const retrieved = head.getInputChannel('test');
      expect(retrieved?.active).toBe(false);
    });

    it('should receive input on active channel', () => {
      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: true,
      };

      head.addInputChannel(channel);

      let receivedEvent: InputReceivedEvent | undefined;
      head.onInputReceived((event) => {
        receivedEvent = event;
      });

      head.receiveInput('test', 'hello');

      expect(receivedEvent).toBeDefined();
      expect(receivedEvent?.value).toBe('hello');
      expect(receivedEvent?.channel.id).toBe('test');
    });

    it('should ignore input on inactive channel', () => {
      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: false,
      };

      head.addInputChannel(channel);

      let receivedEvent: InputReceivedEvent | undefined;
      head.onInputReceived((event) => {
        receivedEvent = event;
      });

      head.receiveInput('test', 'hello');

      expect(receivedEvent).toBeUndefined();
    });

    it('should update channel last value and timestamp on input', () => {
      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: true,
      };

      head.addInputChannel(channel);
      head.receiveInput('test', 'test value');

      const retrieved = head.getInputChannel('test');
      expect(retrieved?.lastValue).toBe('test value');
      expect(retrieved?.lastTimestamp).toBeDefined();
      expect(retrieved?.lastTimestamp).toBeGreaterThan(0);
    });

    it('should throw when receiving input on non-existent channel', () => {
      expect(() => {
        head.receiveInput('nonexistent', 'value');
      }).toThrow("Input channel 'nonexistent' not found");
    });

    it('should support all channel types', () => {
      const types: InputChannelType[] = [
        InputChannelType.USER,
        InputChannelType.EXTERNAL,
        InputChannelType.FORMULA,
        InputChannelType.CELL,
        InputChannelType.SENSATION,
      ];

      for (const type of types) {
        const channel: InputChannel = {
          id: `channel-${type}`,
          type,
          active: true,
        };

        head.addInputChannel(channel);
      }

      const channels = head.getInputChannels();
      expect(channels.length).toBe(5);
    });
  });

  describe('Pattern Recognizers', () => {
    let head: CellHead;

    beforeEach(() => {
      head = new CellHead();
    });

    it('should add a pattern recognizer', () => {
      const recognizer: PatternRecognizer = {
        id: 'email-recognizer',
        type: RecognizerType.REGEX,
        config: {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        confidence: 0.95,
        enabled: true,
      };

      head.addRecognizer(recognizer);

      const recognizers = head.getRecognizers();
      expect(recognizers.length).toBe(1);
      expect(recognizers[0]).toEqual(recognizer);
    });

    it('should throw when adding duplicate recognizer ID', () => {
      const recognizer: PatternRecognizer = {
        id: 'test',
        type: RecognizerType.REGEX,
        config: {},
        confidence: 0.9,
        enabled: true,
      };

      head.addRecognizer(recognizer);

      expect(() => {
        head.addRecognizer(recognizer);
      }).toThrow("Recognizer with id 'test' already exists");
    });

    it('should remove a recognizer', () => {
      const recognizer: PatternRecognizer = {
        id: 'test',
        type: RecognizerType.REGEX,
        config: {},
        confidence: 0.9,
        enabled: true,
      };

      head.addRecognizer(recognizer);
      head.removeRecognizer('test');

      const recognizers = head.getRecognizers();
      expect(recognizers.length).toBe(0);
    });

    it('should recognize regex patterns', () => {
      const recognizer: PatternRecognizer = {
        id: 'email',
        type: RecognizerType.REGEX,
        config: {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        confidence: 0.95,
        enabled: true,
      };

      head.addRecognizer(recognizer);

      const matches = head.recognizePatterns('test@example.com');
      expect(matches.length).toBe(1);
      expect(matches[0].patternId).toBe('email');
      expect(matches[0].confidence).toBe(0.95);
    });

    it('should recognize numeric range patterns', () => {
      const recognizer: PatternRecognizer = {
        id: 'range',
        type: RecognizerType.NUMERIC_RANGE,
        config: {
          min: 0,
          max: 100,
        },
        confidence: 1.0,
        enabled: true,
      };

      head.addRecognizer(recognizer);

      const matches = head.recognizePatterns(50);
      expect(matches.length).toBe(1);
      expect(matches[0].patternId).toBe('range');
    });

    it('should recognize type check patterns', () => {
      const recognizer: PatternRecognizer = {
        id: 'string-check',
        type: RecognizerType.TYPE_CHECK,
        config: {
          expectedType: 'string',
        },
        confidence: 0.9,
        enabled: true,
      };

      head.addRecognizer(recognizer);

      const matches = head.recognizePatterns('hello');
      expect(matches.length).toBe(1);
    });

    it('should recognize custom function patterns', () => {
      const recognizer: PatternRecognizer = {
        id: 'custom',
        type: RecognizerType.CUSTOM,
        config: {
          validator: (value: any) => typeof value === 'number' && value > 0,
        },
        confidence: 0.8,
        enabled: true,
      };

      head.addRecognizer(recognizer);

      const matches = head.recognizePatterns(42);
      expect(matches.length).toBe(1);
    });

    it('should skip disabled recognizers', () => {
      const recognizer: PatternRecognizer = {
        id: 'test',
        type: RecognizerType.REGEX,
        config: {
          pattern: /test/,
        },
        confidence: 0.9,
        enabled: false,
      };

      head.addRecognizer(recognizer);

      const matches = head.recognizePatterns('test');
      expect(matches.length).toBe(0);
    });

    it('should recognize multiple patterns', () => {
      const recognizer1: PatternRecognizer = {
        id: 'email',
        type: RecognizerType.REGEX,
        config: {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        confidence: 0.95,
        enabled: true,
      };

      const recognizer2: PatternRecognizer = {
        id: 'contains-at',
        type: RecognizerType.REGEX,
        config: {
          pattern: /@/,
        },
        confidence: 0.8,
        enabled: true,
      };

      head.addRecognizer(recognizer1);
      head.addRecognizer(recognizer2);

      const matches = head.recognizePatterns('test@example.com');
      expect(matches.length).toBe(2);
    });
  });

  describe('Validators', () => {
    let head: CellHead;

    beforeEach(() => {
      head = new CellHead();
    });

    it('should add a validator', () => {
      const validator: Validator = {
        id: 'required',
        name: 'Required validator',
        validate: (value: any) => ({
          valid: value !== null && value !== undefined,
          confidence: 1.0,
          validatorId: 'required',
        }),
        enabled: true,
        priority: 100,
      };

      head.addValidator(validator);

      const validators = head.getValidators();
      expect(validators.length).toBe(1);
    });

    it('should throw when adding duplicate validator ID', () => {
      const validator: Validator = {
        id: 'test',
        name: 'Test',
        validate: () => ({ valid: true, confidence: 1.0, validatorId: 'test' }),
        enabled: true,
        priority: 100,
      };

      head.addValidator(validator);

      expect(() => {
        head.addValidator(validator);
      }).toThrow("Validator with id 'test' already exists");
    });

    it('should remove a validator', () => {
      const validator: Validator = {
        id: 'test',
        name: 'Test',
        validate: () => ({ valid: true, confidence: 1.0, validatorId: 'test' }),
        enabled: true,
        priority: 100,
      };

      head.addValidator(validator);
      head.removeValidator('test');

      const validators = head.getValidators();
      expect(validators.length).toBe(0);
    });

    it('should validate with all enabled validators', () => {
      const validator1: Validator = {
        id: 'type',
        name: 'Type validator',
        validate: (value: any) => ({
          valid: typeof value === 'string',
          message: 'Must be a string',
          confidence: 1.0,
          validatorId: 'type',
        }),
        enabled: true,
        priority: 100,
      };

      const validator2: Validator = {
        id: 'length',
        name: 'Length validator',
        validate: (value: any) => ({
          valid: typeof value === 'string' && value.length > 0,
          message: 'Must not be empty',
          confidence: 1.0,
          validatorId: 'length',
        }),
        enabled: true,
        priority: 90,
      };

      head.addValidator(validator1);
      head.addValidator(validator2);

      const results = head.validate('hello');

      expect(results.length).toBe(2);
      expect(results.every(r => r.valid)).toBe(true);
    });

    it('should skip disabled validators', () => {
      const validator: Validator = {
        id: 'test',
        name: 'Test',
        validate: () => ({ valid: true, confidence: 1.0, validatorId: 'test' }),
        enabled: false,
        priority: 100,
      };

      head.addValidator(validator);

      const results = head.validate('test');
      expect(results.length).toBe(0);
    });

    it('should handle validator errors gracefully', () => {
      const validator: Validator = {
        id: 'throws',
        name: 'Throws error',
        validate: () => {
          throw new Error('Validation error');
        },
        enabled: true,
        priority: 100,
      };

      head.addValidator(validator);

      const results = head.validate('test');

      expect(results.length).toBe(1);
      expect(results[0].valid).toBe(false);
      expect(results[0].message).toBe('Validation error');
    });

    it('should sort validators by priority', () => {
      const validator1: Validator = {
        id: 'low',
        name: 'Low priority',
        validate: () => ({ valid: true, confidence: 1.0, validatorId: 'low' }),
        enabled: true,
        priority: 10,
      };

      const validator2: Validator = {
        id: 'high',
        name: 'High priority',
        validate: () => ({ valid: true, confidence: 1.0, validatorId: 'high' }),
        enabled: true,
        priority: 100,
      };

      head.addValidator(validator1);
      head.addValidator(validator2);

      const validators = head.getValidators();
      expect(validators[0].id).toBe('high');
      expect(validators[1].id).toBe('low');
    });

    it('should include validations in input received event', () => {
      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: true,
      };

      const validator: Validator = {
        id: 'test-validator',
        name: 'Test',
        validate: (value: any) => ({
          valid: typeof value === 'string',
          message: 'Must be string',
          confidence: 1.0,
          validatorId: 'test-validator',
        }),
        enabled: true,
        priority: 100,
      };

      head.addInputChannel(channel);
      head.addValidator(validator);

      let receivedEvent: InputReceivedEvent | undefined;
      head.onInputReceived((event) => {
        receivedEvent = event;
      });

      head.receiveInput('test', 'hello');

      expect(receivedEvent?.validations.length).toBe(1);
      expect(receivedEvent?.validations[0].valid).toBe(true);
    });

    it('should include recognized patterns in input received event', () => {
      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: true,
      };

      const recognizer: PatternRecognizer = {
        id: 'email',
        type: RecognizerType.REGEX,
        config: {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        confidence: 0.95,
        enabled: true,
      };

      head.addInputChannel(channel);
      head.addRecognizer(recognizer);

      let receivedEvent: InputReceivedEvent | undefined;
      head.onInputReceived((event) => {
        receivedEvent = event;
      });

      head.receiveInput('test', 'test@example.com');

      expect(receivedEvent?.patterns.length).toBe(1);
      expect(receivedEvent?.patterns[0]).toBe('email');
    });
  });

  describe('Common Validators', () => {
    let head: CellHead;

    beforeEach(() => {
      head = new CellHead();
    });

    it('should provide type validator', () => {
      const validator = CommonValidators.typeValidator('string');
      head.addValidator(validator);

      const results = head.validate('hello');
      expect(results[0].valid).toBe(true);
    });

    it('should provide range validator', () => {
      const validator = CommonValidators.rangeValidator(0, 100);
      head.addValidator(validator);

      const results = head.validate(50);
      expect(results[0].valid).toBe(true);

      const results2 = head.validate(150);
      expect(results2[0].valid).toBe(false);
    });

    it('should provide required validator', () => {
      const validator = CommonValidators.requiredValidator();
      head.addValidator(validator);

      const results1 = head.validate('value');
      expect(results1[0].valid).toBe(true);

      const results2 = head.validate('');
      expect(results2[0].valid).toBe(false);

      const results3 = head.validate(null);
      expect(results3[0].valid).toBe(false);
    });

    it('should provide regex validator', () => {
      const validator = CommonValidators.regexValidator(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'email'
      );
      head.addValidator(validator);

      const results = head.validate('test@example.com');
      expect(results[0].valid).toBe(true);
    });
  });

  describe('Watched Cells and Sensations', () => {
    let head: CellHead;
    let source: CellReference;

    beforeEach(() => {
      head = new CellHead();
      source = { row: 0, col: 0, sheet: 'Sheet1' };
    });

    it('should watch a cell', () => {
      const watched: WatchedCell = {
        reference: source,
        sensationTypes: [SensationType.ABSOLUTE_CHANGE],
        threshold: 10,
        sampleRate: 1000,
        active: true,
      };

      head.watchCell(watched);

      const watchedCells = head.getWatchedCells();
      expect(watchedCells.length).toBe(1);
      expect(watchedCells[0]).toEqual(watched);
    });

    it('should update existing watched cell', () => {
      const watched1: WatchedCell = {
        reference: source,
        sensationTypes: [SensationType.ABSOLUTE_CHANGE],
        threshold: 10,
        sampleRate: 1000,
        active: true,
      };

      head.watchCell(watched1);

      const watched2: WatchedCell = {
        reference: source,
        sensationTypes: [SensationType.PRESENCE],
        threshold: 5,
        sampleRate: 500,
        active: true,
      };

      head.watchCell(watched2);

      const watchedCells = head.getWatchedCells();
      expect(watchedCells.length).toBe(1);
      expect(watchedCells[0].threshold).toBe(5);
    });

    it('should unwatch a cell', () => {
      const watched: WatchedCell = {
        reference: source,
        sensationTypes: [SensationType.PRESENCE],
        threshold: 0,
        sampleRate: 1000,
        active: true,
      };

      head.watchCell(watched);
      head.unwatchCell(source);

      const watchedCells = head.getWatchedCells();
      expect(watchedCells.length).toBe(0);
    });

    it('should detect sensations when cell changes', () => {
      const watched: WatchedCell = {
        reference: source,
        sensationTypes: [SensationType.ABSOLUTE_CHANGE, SensationType.PRESENCE],
        threshold: 0,
        sampleRate: 0,
        active: true,
      };

      head.watchCell(watched);

      let receivedSensation: Sensation | undefined;
      head.onSensation((sensation) => {
        receivedSensation = sensation;
      });

      const sensations = head.processCellChange(source, 100, 90);

      expect(sensations.length).toBeGreaterThan(0);
      expect(receivedSensation).toBeDefined();
    });

    it('should respect sample rate', () => {
      const watched: WatchedCell = {
        reference: source,
        sensationTypes: [SensationType.PRESENCE],
        threshold: 0,
        sampleRate: 1000,
        active: true,
      };

      head.watchCell(watched);

      const sensations1 = head.processCellChange(source, 100);
      expect(sensations1.length).toBeGreaterThan(0);

      // Immediate second call should be ignored due to sample rate
      const sensations2 = head.processCellChange(source, 200);
      expect(sensations2.length).toBe(0);
    });

    it('should not detect sensations for inactive watched cells', () => {
      const watched: WatchedCell = {
        reference: source,
        sensationTypes: [SensationType.PRESENCE],
        threshold: 0,
        sampleRate: 0,
        active: false,
      };

      head.watchCell(watched);

      const sensations = head.processCellChange(source, 100);

      expect(sensations.length).toBe(0);
    });

    it('should track last sensation for watched cell', () => {
      const watched: WatchedCell = {
        reference: source,
        sensationTypes: [SensationType.PRESENCE],
        threshold: 0,
        sampleRate: 0,
        active: true,
      };

      head.watchCell(watched);
      head.processCellChange(source, 100);

      const watchedCells = head.getWatchedCells();
      expect(watchedCells[0].lastSensation).toBeDefined();
    });

    it('should clear old sensations', () => {
      const watched: WatchedCell = {
        reference: source,
        sensationTypes: [SensationType.PRESENCE],
        threshold: 0,
        sampleRate: 0,
        active: true,
      };

      head.watchCell(watched);
      head.processCellChange(source, 100);

      // Clear sensations older than 1ms
      head.clearOldSensations(1);

      // Wait a bit
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Small delay
      }

      head.clearOldSensations(1);

      const sensations = head.getSensations();
      expect(sensations.length).toBe(0);
    });

    it('should clear all sensations', () => {
      const watched: WatchedCell = {
        reference: source,
        sensationTypes: [SensationType.PRESENCE],
        threshold: 0,
        sampleRate: 0,
        active: true,
      };

      head.watchCell(watched);
      head.processCellChange(source, 100);

      head.clearAllSensations();

      const sensations = head.getSensations();
      expect(sensations.length).toBe(0);
    });

    it('should register and unregister sensation callbacks', () => {
      const callback = jest.fn();

      head.onSensation(callback);

      const watched: WatchedCell = {
        reference: source,
        sensationTypes: [SensationType.PRESENCE],
        threshold: 0,
        sampleRate: 0,
        active: true,
      };

      head.watchCell(watched);
      head.processCellChange(source, 100);

      expect(callback).toHaveBeenCalled();

      head.offSensation(callback);

      callback.mockClear();

      head.processCellChange(source, 200);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    let head: CellHead;

    beforeEach(() => {
      head = new CellHead();
    });

    it('should register and unregister input callbacks', () => {
      const callback = jest.fn();

      head.onInputReceived(callback);

      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: true,
      };

      head.addInputChannel(channel);
      head.receiveInput('test', 'value');

      expect(callback).toHaveBeenCalled();

      head.offInputReceived(callback);

      callback.mockClear();

      head.receiveInput('test', 'value2');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple input callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      head.onInputReceived(callback1);
      head.onInputReceived(callback2);

      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: true,
      };

      head.addInputChannel(channel);
      head.receiveInput('test', 'value');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      const normalCallback = jest.fn();

      head.onInputReceived(errorCallback);
      head.onInputReceived(normalCallback);

      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: true,
      };

      head.addInputChannel(channel);

      // Should not throw
      expect(() => {
        head.receiveInput('test', 'value');
      }).not.toThrow();

      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    let head: CellHead;

    beforeEach(() => {
      head = new CellHead();
    });

    it('should get state snapshot', () => {
      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: true,
      };

      head.addInputChannel(channel);

      const state = head.getState();

      expect(state.inputs.length).toBe(1);
      expect(state).not.toBe(head['state']); // Should be a copy
    });

    it('should get summary', () => {
      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: true,
      };

      const validator: Validator = {
        id: 'test-validator',
        name: 'Test',
        validate: () => ({ valid: true, confidence: 1.0, validatorId: 'test-validator' }),
        enabled: true,
        priority: 100,
      };

      const recognizer: PatternRecognizer = {
        id: 'test-recognizer',
        type: RecognizerType.REGEX,
        config: { pattern: /test/ },
        confidence: 0.9,
        enabled: true,
      };

      head.addInputChannel(channel);
      head.addValidator(validator);
      head.addRecognizer(recognizer);

      const summary = head.getSummary();

      expect(summary.inputCount).toBe(1);
      expect(summary.activeInputCount).toBe(1);
      expect(summary.validatorCount).toBe(1);
      expect(summary.recognizerCount).toBe(1);
      expect(summary.watchedCellCount).toBe(0);
      expect(summary.sensationCount).toBe(0);
    });

    it('should reset to initial state', () => {
      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: true,
      };

      head.addInputChannel(channel);

      head.reset();

      const state = head.getState();
      expect(state.inputs).toEqual([]);
      expect(state.recognizers).toEqual([]);
      expect(state.validators).toEqual([]);
      expect(state.watchedCells).toEqual([]);
      expect(state.sensations).toEqual([]);
    });

    it('should clear callbacks on reset', () => {
      const callback = jest.fn();

      head.onInputReceived(callback);
      head.onSensation(callback);

      head.reset();

      const channel: InputChannel = {
        id: 'test',
        type: InputChannelType.USER,
        active: true,
      };

      head.addInputChannel(channel);
      head.receiveInput('test', 'value');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow', () => {
      const head = new CellHead();

      // Set up input channel
      const channel: InputChannel = {
        id: 'user-input',
        type: InputChannelType.USER,
        active: true,
      };

      // Set up validator
      const validator: Validator = {
        id: 'email-validator',
        name: 'Email validator',
        validate: (value: any) => ({
          valid: typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
          message: 'Must be valid email',
          confidence: 1.0,
          validatorId: 'email-validator',
        }),
        enabled: true,
        priority: 100,
      };

      // Set up recognizer
      const recognizer: PatternRecognizer = {
        id: 'email-recognizer',
        type: RecognizerType.REGEX,
        config: {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        confidence: 0.95,
        enabled: true,
      };

      // Set up watched cell
      const watched: WatchedCell = {
        reference: { row: 1, col: 0 },
        sensationTypes: [SensationType.ABSOLUTE_CHANGE],
        threshold: 0,
        sampleRate: 0,
        active: true,
      };

      head.addInputChannel(channel);
      head.addValidator(validator);
      head.addRecognizer(recognizer);
      head.watchCell(watched);

      let inputEvent: InputReceivedEvent | undefined;
      head.onInputReceived((event) => {
        inputEvent = event;
      });

      // Receive valid input
      head.receiveInput('user-input', 'test@example.com');

      expect(inputEvent?.validations[0].valid).toBe(true);
      expect(inputEvent?.patterns[0]).toBe('email-recognizer');

      // Process cell change
      const sensations = head.processCellChange(
        { row: 1, col: 0 },
        100,
        90
      );

      expect(sensations.length).toBeGreaterThan(0);

      // Check summary
      const summary = head.getSummary();
      expect(summary.inputCount).toBe(1);
      expect(summary.validatorCount).toBe(1);
      expect(summary.recognizerCount).toBe(1);
      expect(summary.watchedCellCount).toBe(1);
    });
  });
});
