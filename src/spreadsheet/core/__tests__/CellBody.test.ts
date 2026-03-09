/**
 * Unit tests for CellBody
 *
 * Tests cover:
 * - Basic processing with default logic
 * - Memory storage and retrieval
 * - Reasoning trace generation
 * - Self-model updates
 * - Pattern extraction
 * - Error handling
 * - Custom logic implementations
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CellBody, ExecutionMemoryImpl } from '../CellBody.js';
import {
  CellId,
  ProcessingLogic,
  ProcessingContext,
  ProcessingResult,
  ReasoningStepType,
  LogicLevel,
  SensationType,
  ExecutionRecord,
} from '../types.js';

describe('CellBody', () => {
  let cellBody: CellBody;
  let cellId: CellId;

  beforeEach(() => {
    cellId = 'test-cell-1';
    cellBody = new CellBody(cellId);
  });

  describe('Construction', () => {
    it('should create a CellBody with default values', () => {
      expect(cellBody.id).toBe(cellId);
      expect(cellBody.logic).toBeDefined();
      expect(cellBody.memory).toBeDefined();
      expect(cellBody.trace).toBeDefined();
      expect(cellBody.selfModel).toBeDefined();
      expect(cellBody.selfModel.identity).toBe(`cell-${cellId}`);
      expect(cellBody.selfModel.capabilities).toContain('process');
      expect(cellBody.selfModel.capabilities).toContain('learn');
    });

    it('should create a CellBody with custom logic', async () => {
      const customLogic: ProcessingLogic = {
        level: LogicLevel.L1_PATTERN,
        async process(input: any, context: ProcessingContext): Promise<ProcessingResult> {
          return {
            value: input * 2,
            confidence: 0.9,
            trace: {
              steps: [],
              dependencies: [],
              confidence: 0.9,
              totalTime: 10,
              startTime: Date.now(),
              endTime: Date.now(),
            },
            explanation: 'Doubled the input',
          };
        },
        estimateCost(input: any): number {
          return 5;
        },
      };

      const customBody = new CellBody(cellId, customLogic);
      expect(customBody.logic).toBe(customLogic);
      expect(customBody.estimateCost(10)).toBe(5);
    });

    it('should create a CellBody with custom memory', () => {
      const customMemory = new ExecutionMemoryImpl(500, 3600000);
      const customBody = new CellBody(cellId, undefined, customMemory);
      expect(customBody.memory).toBe(customMemory);
    });

    it('should create a CellBody with custom self-model', () => {
      const customModel = {
        identity: 'custom-cell',
        capabilities: ['analyze', 'predict'],
      };

      const customBody = new CellBody(cellId, undefined, undefined, customModel);
      expect(customBody.selfModel.identity).toBe('custom-cell');
      expect(customBody.selfModel.capabilities).toContain('analyze');
      expect(customBody.selfModel.capabilities).toContain('predict');
    });
  });

  describe('Processing', () => {
    it('should process input with default logic', async () => {
      const input = { value: 42 };
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      const result = await cellBody.process(input, context);

      expect(result.value).toEqual(input);
      expect(result.confidence).toBe(1.0);
      expect(result.trace.steps.length).toBeGreaterThan(0);
      expect(result.explanation).toContain('unchanged');
    });

    it('should generate reasoning trace during processing', async () => {
      const input = { data: 'test' };
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      await cellBody.process(input, context);
      const trace = cellBody.getTrace();

      expect(trace.steps.length).toBeGreaterThan(0);
      expect(trace.totalTime).toBeGreaterThanOrEqual(0);
      expect(trace.confidence).toBeGreaterThan(0);
      expect(trace.startTime).toBeLessThanOrEqual(trace.endTime);
    });

    it('should have observation step as first step', async () => {
      const input = { value: 100 };
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      await cellBody.process(input, context);
      const trace = cellBody.getTrace();

      expect(trace.steps[0].type).toBe(ReasoningStepType.OBSERVATION);
      expect(trace.steps[0].description).toContain('Receive and observe');
    });

    it('should handle processing errors gracefully', async () => {
      const errorLogic: ProcessingLogic = {
        level: LogicLevel.L0_LOGIC,
        async process(): Promise<ProcessingResult> {
          throw new Error('Processing failed');
        },
        estimateCost(): number {
          return 1;
        },
      };

      const errorBody = new CellBody(cellId, errorLogic);
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      await expect(errorBody.process('input', context)).rejects.toThrow('Processing failed');
    });
  });

  describe('Memory', () => {
    it('should store execution records after processing', async () => {
      const input = { value: 42 };
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      await cellBody.process(input, context);
      const history = cellBody.getHistory();

      expect(history.length).toBe(1);
      expect(history[0].input).toEqual(input);
      expect(history[0].confidence).toBeGreaterThan(0);
      expect(history[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('should retrieve recent executions with limit', async () => {
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      // Process multiple inputs
      for (let i = 0; i < 5; i++) {
        await cellBody.process({ value: i }, context);
      }

      const recent3 = cellBody.getHistory(3);
      expect(recent3.length).toBe(3);

      const recent10 = cellBody.getHistory(10);
      expect(recent10.length).toBe(5);
    });

    it('should clear all records when reset', async () => {
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      await cellBody.process({ value: 1 }, context);
      await cellBody.process({ value: 2 }, context);

      expect(cellBody.getHistory().length).toBe(2);

      cellBody.resetMemory();
      expect(cellBody.getHistory().length).toBe(0);
    });
  });

  describe('Self-Model', () => {
    it('should update performance metrics after processing', async () => {
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      await cellBody.process({ value: 1 }, context);
      const model = cellBody.getSelfModel();

      expect(model.performance.totalExecutions).toBe(1);
      expect(model.performance.successfulExecutions).toBe(1);
      expect(model.performance.averageConfidence).toBeGreaterThan(0);
      expect(model.performance.averageDuration).toBeGreaterThanOrEqual(0);
    });

    it('should track multiple executions', async () => {
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      for (let i = 0; i < 5; i++) {
        await cellBody.process({ value: i }, context);
      }

      const model = cellBody.getSelfModel();
      expect(model.performance.totalExecutions).toBe(5);
    });

    it('should update lastUpdated timestamp', async () => {
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      const beforeTime = Date.now();
      await cellBody.process({ value: 1 }, context);
      const model = cellBody.getSelfModel();

      expect(model.lastUpdated).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should reset performance metrics when memory is reset', async () => {
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      await cellBody.process({ value: 1 }, context);
      expect(cellBody.getSelfModel().performance.totalExecutions).toBe(1);

      cellBody.resetMemory();
      expect(cellBody.getSelfModel().performance.totalExecutions).toBe(0);
    });
  });

  describe('Pattern Extraction', () => {
    it('should extract patterns from executions', async () => {
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      await cellBody.process({ value: 1 }, context);
      await cellBody.process({ value: 1 }, context);

      const model = cellBody.getSelfModel();
      expect(model.patterns.length).toBeGreaterThan(0);

      const objectPattern = model.patterns.find(p => p.pattern.input === 'object');
      expect(objectPattern).toBeDefined();
      expect(objectPattern!.frequency).toBe(2);
    });

    it('should increase pattern confidence with repetition', async () => {
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      // Process same type multiple times
      for (let i = 0; i < 5; i++) {
        await cellBody.process({ value: i }, context);
      }

      const model = cellBody.getSelfModel();
      const objectPattern = model.patterns.find(p => p.pattern.input === 'object');

      expect(objectPattern!.confidence).toBeGreaterThan(0.1);
    });

    it('should limit number of stored patterns', async () => {
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      // Process many different types
      await cellBody.process(1, context);
      await cellBody.process('string', context);
      await cellBody.process(true, context);
      await cellBody.process(null, context);
      await cellBody.process([1, 2], context);
      await cellBody.process({ key: 'value' }, context);

      const model = cellBody.getSelfModel();
      expect(model.patterns.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Reasoning Steps', () => {
    it('should allow adding custom reasoning steps', async () => {
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      await cellBody.process({ value: 1 }, context);

      const customStep = {
        id: 'custom-step-1',
        type: ReasoningStepType.ANALYSIS,
        description: 'Custom analysis step',
        input: { data: 'test' },
        output: { result: 'analyzed' },
        confidence: 0.85,
        duration: 50,
        timestamp: Date.now(),
        dependencies: [],
      };

      cellBody.addReasoningStep(customStep);

      const trace = cellBody.getTrace();
      expect(trace.steps.some(s => s.id === 'custom-step-1')).toBe(true);
    });

    it('should throw error when adding step outside processing', () => {
      const step = {
        id: 'step-1',
        type: ReasoningStepType.OBSERVATION,
        description: 'Test step',
        input: null,
        output: null,
        confidence: 1.0,
        duration: 0,
        timestamp: Date.now(),
        dependencies: [],
      };

      expect(() => cellBody.addReasoningStep(step)).toThrow('no active trace');
    });

    it('should track step dependencies', async () => {
      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      await cellBody.process({ value: 1 }, context);

      const step1Id = cellBody.getTrace().steps[0].id;
      const step2 = {
        id: 'step-2',
        type: ReasoningStepType.ANALYSIS,
        description: 'Dependent step',
        input: null,
        output: null,
        confidence: 0.9,
        duration: 10,
        timestamp: Date.now(),
        dependencies: [step1Id],
      };

      cellBody.addReasoningStep(step2);

      const trace = cellBody.getTrace();
      expect(trace.dependencies.some(d => d.from === step1Id && d.to === 'step-2')).toBe(true);
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate processing cost', () => {
      const cost = cellBody.estimateCost({ value: 42 });
      expect(cost).toBeGreaterThan(0);
    });

    it('should use custom logic cost estimation', () => {
      const customLogic: ProcessingLogic = {
        level: LogicLevel.L3_LLM,
        async process(): Promise<ProcessingResult> {
          return {
            value: 'result',
            confidence: 0.8,
            trace: {
              steps: [],
              dependencies: [],
              confidence: 0.8,
              totalTime: 100,
              startTime: Date.now(),
              endTime: Date.now(),
            },
            explanation: 'Test',
          };
        },
        estimateCost(input: any): number {
          return JSON.stringify(input).length * 0.1;
        },
      };

      const customBody = new CellBody(cellId, customLogic);
      const cost = customBody.estimateCost({ value: 'test data' });

      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('Logic Replacement', () => {
    it('should allow replacing processing logic', async () => {
      const newLogic: ProcessingLogic = {
        level: LogicLevel.L1_PATTERN,
        async process(input: any): Promise<ProcessingResult> {
          return {
            value: input + ' processed',
            confidence: 0.95,
            trace: {
              steps: [],
              dependencies: [],
              confidence: 0.95,
              totalTime: 5,
              startTime: Date.now(),
              endTime: Date.now(),
            },
            explanation: 'String processing',
          };
        },
        estimateCost(): number {
          return 2;
        },
      };

      cellBody.setLogic(newLogic);
      expect(cellBody.logic).toBe(newLogic);

      const context: ProcessingContext = {
        cellId,
        position: { row: 1, col: 1 },
        sensations: [],
        memory: [],
        timestamp: Date.now(),
      };

      const result = await cellBody.process('test', context);
      expect(result.value).toBe('test processed');
    });
  });
});

describe('ExecutionMemoryImpl', () => {
  let memory: ExecutionMemoryImpl;

  beforeEach(() => {
    memory = new ExecutionMemoryImpl(10, 1000);
  });

  describe('Storage and Retrieval', () => {
    it('should store and retrieve execution records', () => {
      const record: ExecutionRecord = {
        id: 'rec-1',
        input: { value: 42 },
        output: { result: 84 },
        trace: {
          steps: [],
          dependencies: [],
          confidence: 1.0,
          totalTime: 10,
          startTime: Date.now(),
          endTime: Date.now(),
        },
        confidence: 1.0,
        timestamp: Date.now(),
        duration: 10,
      };

      memory.store(record);
      const retrieved = memory.retrieve('rec-1');

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe('rec-1');
      expect(retrieved!.input).toEqual({ value: 42 });
    });

    it('should return undefined for non-existent record', () => {
      const retrieved = memory.retrieve('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should get recent records', () => {
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        memory.store({
          id: `rec-${i}`,
          input: i,
          output: i * 2,
          trace: {
            steps: [],
            dependencies: [],
            confidence: 1.0,
            totalTime: 10,
            startTime: now - i * 100,
            endTime: now - i * 100 + 10,
          },
          confidence: 1.0,
          timestamp: now - i * 100,
          duration: 10,
        });
      }

      const recent = memory.getRecent(3);
      expect(recent.length).toBe(3);
      expect(recent[0].timestamp).toBeGreaterThan(recent[1].timestamp);
    });

    it('should get all records', () => {
      for (let i = 0; i < 3; i++) {
        memory.store({
          id: `rec-${i}`,
          input: i,
          output: i * 2,
          trace: {
            steps: [],
            dependencies: [],
            confidence: 1.0,
            totalTime: 10,
            startTime: Date.now(),
            endTime: Date.now(),
          },
          confidence: 1.0,
          timestamp: Date.now(),
          duration: 10,
        });
      }

      const all = memory.getAll();
      expect(all.length).toBe(3);
    });
  });

  describe('Capacity Management', () => {
    it('should enforce max records limit', () => {
      const maxRecords = 5;
      const limitedMemory = new ExecutionMemoryImpl(maxRecords, 10000);

      // Store more than max
      for (let i = 0; i < 10; i++) {
        limitedMemory.store({
          id: `rec-${i}`,
          input: i,
          output: i * 2,
          trace: {
            steps: [],
            dependencies: [],
            confidence: 1.0,
            totalTime: 10,
            startTime: Date.now() + i,
            endTime: Date.now() + i + 10,
          },
          confidence: 1.0,
          timestamp: Date.now() + i,
          duration: 10,
        });
      }

      expect(limitedMemory.getAll().length).toBeLessThanOrEqual(maxRecords);
    });

    it('should remove old records', async () => {
      const shortLivedMemory = new ExecutionMemoryImpl(100, 100); // 100ms max age

      shortLivedMemory.store({
        id: 'old',
        input: 'old',
        output: 'old',
        trace: {
          steps: [],
          dependencies: [],
          confidence: 1.0,
          totalTime: 10,
          startTime: Date.now() - 200,
          endTime: Date.now() - 190,
        },
        confidence: 1.0,
        timestamp: Date.now() - 200,
        duration: 10,
      });

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 150));

      shortLivedMemory.store({
        id: 'new',
        input: 'new',
        output: 'new',
        trace: {
          steps: [],
          dependencies: [],
          confidence: 1.0,
          totalTime: 10,
          startTime: Date.now(),
          endTime: Date.now() + 10,
        },
        confidence: 1.0,
        timestamp: Date.now(),
        duration: 10,
      });

      const records = shortLivedMemory.getAll();
      expect(records.find(r => r.id === 'old')).toBeUndefined();
    });
  });

  describe('Statistics', () => {
    it('should calculate stats for empty memory', () => {
      const stats = memory.getStats();
      expect(stats.totalRecords).toBe(0);
      expect(stats.averageConfidence).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('should calculate stats correctly', () => {
      memory.store({
        id: 'rec-1',
        input: 1,
        output: 2,
        trace: {
          steps: [],
          dependencies: [],
          confidence: 0.8,
          totalTime: 10,
          startTime: Date.now(),
          endTime: Date.now(),
        },
        confidence: 0.8,
        timestamp: Date.now(),
        duration: 10,
      });

      memory.store({
        id: 'rec-2',
        input: 2,
        output: 4,
        trace: {
          steps: [],
          dependencies: [],
          confidence: 0.6,
          totalTime: 20,
          startTime: Date.now(),
          endTime: Date.now(),
        },
        confidence: 0.6,
        timestamp: Date.now(),
        duration: 20,
      });

      const stats = memory.getStats();
      expect(stats.totalRecords).toBe(2);
      expect(stats.averageConfidence).toBe(0.7);
      expect(stats.averageDuration).toBe(15);
      expect(stats.successRate).toBe(1.0); // Both > 0.5
    });
  });

  describe('Clear', () => {
    it('should clear all records', () => {
      memory.store({
        id: 'rec-1',
        input: 1,
        output: 2,
        trace: {
          steps: [],
          dependencies: [],
          confidence: 1.0,
          totalTime: 10,
          startTime: Date.now(),
          endTime: Date.now(),
        },
        confidence: 1.0,
        timestamp: Date.now(),
        duration: 10,
      });

      memory.clear();
      expect(memory.getAll().length).toBe(0);
    });
  });
});
