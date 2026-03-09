/**
 * POLLN Spreadsheet Integration - LogCell Unit Tests
 * Comprehensive test suite for the LogCell base class
 */

import { LogCell } from '../LogCell.js';
import type {
  CellType,
  CellPosition,
  CellState,
  CellOutput,
  Feedback,
  ProcessingContext,
  ProcessingResult,
  ReasoningTrace,
} from '../types.js';

/**
 * Concrete implementation of LogCell for testing
 */
class TestLogCell extends LogCell {
  constructor(config: any) {
    super(config);
  }

  protected createProcessingLogic(): any {
    return {
      level: 0,
      process: async (input: any, context: ProcessingContext): Promise<ProcessingResult> => {
        return {
          value: input,
          confidence: 1.0,
          trace: this.createTrace(),
          explanation: 'Test processing',
        };
      },
      estimateCost: (input: any) => 1,
    };
  }

  protected async executeProcessing(
    input: any,
    context: ProcessingContext
  ): Promise<ProcessingResult> {
    return {
      value: `processed: ${input}`,
      confidence: 0.95,
      trace: {
        steps: [],
        dependencies: [],
        confidence: 0.95,
        totalTime: 10,
        startTime: Date.now() - 10,
        endTime: Date.now(),
      },
      explanation: 'Test processing complete',
    };
  }

  async activate(): Promise<void> {
    this.transitionTo('sensing' as CellState);
  }

  async process(input: any): Promise<CellOutput> {
    return this.executeProcessingPipeline(input);
  }

  async learn(feedback: Feedback): Promise<void> {
    this.transitionTo('learning' as CellState);
    // Simulate learning
    await new Promise(resolve => setTimeout(resolve, 10));
    this.transitionTo('dormant' as CellState);
  }

  async deactivate(): Promise<void> {
    this.transitionTo('dormant' as CellState);
  }
}

describe('LogCell - Base Class', () => {
  describe('Construction and Initialization', () => {
    it('should create a cell with unique ID if not provided', () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'input' as CellType,
        position,
      });

      expect(cell.id).toBeDefined();
      expect(typeof cell.id).toBe('string');
      expect(cell.id.length).toBeGreaterThan(0);
    });

    it('should create a cell with provided ID', () => {
      const position: CellPosition = { row: 0, col: 0 };
      const customId = 'test-cell-123';
      const cell = new TestLogCell({
        id: customId,
        type: 'input' as CellType,
        position,
      });

      expect(cell.id).toBe(customId);
    });

    it('should initialize with correct type and position', () => {
      const position: CellPosition = { row: 5, col: 3 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      expect(cell.type).toBe('transform');
      expect(cell.position).toEqual(position);
      expect(cell.position.row).toBe(5);
      expect(cell.position.col).toBe(3);
    });

    it('should initialize in DORMANT state', () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'input' as CellType,
        position,
      });

      expect(cell.getState()).toBe('dormant');
      expect(cell.isState('dormant' as CellState)).toBe(true);
    });

    it('should set createdAt timestamp', () => {
      const beforeCreate = Date.now();
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'input' as CellType,
        position,
      });
      const afterCreate = Date.now();

      expect(cell.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(cell.createdAt).toBeLessThanOrEqual(afterCreate);
    });

    it('should initialize with default logic level L0', () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'input' as CellType,
        position,
      });

      expect(cell['logicLevel']).toBe(0);
    });

    it('should initialize with custom logic level', () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'analysis' as CellType,
        position,
        logicLevel: 2,
      });

      expect(cell['logicLevel']).toBe(2);
    });

    it('should initialize head with empty arrays', () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'input' as CellType,
        position,
      });

      expect(cell['head'].inputs).toEqual([]);
      expect(cell['head'].sensations).toEqual([]);
      expect(cell['head'].recognizers).toEqual([]);
      expect(cell['head'].validators).toEqual([]);
    });

    it('should initialize body with required components', () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'input' as CellType,
        position,
      });

      expect(cell['body'].logic).toBeDefined();
      expect(cell['body'].memory).toBeDefined();
      expect(cell['body'].trace).toBeDefined();
      expect(cell['body'].selfModel).toBeDefined();
    });

    it('should initialize tail with empty arrays', () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'input' as CellType,
        position,
      });

      expect(cell['tail'].outputs).toEqual([]);
      expect(cell['tail'].effects).toEqual([]);
      expect(cell['tail'].actions).toEqual([]);
      expect(cell['tail'].subscribers).toEqual([]);
    });

    it('should initialize origin with cell identity', () => {
      const position: CellPosition = { row: 2, col: 5 };
      const cell = new TestLogCell({
        type: 'input' as CellType,
        position,
      });

      expect(cell['origin'].id).toBe(cell.id);
      expect(cell['origin'].position).toEqual(position);
      expect(cell['origin'].selfAwareness).toBe(0);
      expect(cell['origin'].watchedCells).toEqual([]);
    });
  });

  describe('State Management', () => {
    it('should return current state', () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'input' as CellType,
        position,
      });

      expect(cell.getState()).toBe('dormant');
    });

    it('should check if cell is in specific state', () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'input' as CellType,
        position,
      });

      expect(cell.isState('dormant' as CellState)).toBe(true);
      expect(cell.isState('processing' as CellState)).toBe(false);
    });

    it('should track state history', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'input' as CellType,
        position,
      });

      const initialHistoryLength = cell.getStateHistory().length;
      await cell.activate();

      const history = cell.getStateHistory();
      expect(history.length).toBeGreaterThan(initialHistoryLength);
      expect(history[history.length - 1].state).toBe('sensing');
    });

    it('should record timestamp in state history', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'input' as CellType,
        position,
      });

      await cell.activate();
      const history = cell.getStateHistory();
      const lastTransition = history[history.length - 1];

      expect(lastTransition.timestamp).toBeDefined();
      expect(typeof lastTransition.timestamp).toBe('number');
      expect(lastTransition.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Lifecycle Methods', () => {
    it('should activate cell and transition to SENSING', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'input' as CellType,
        position,
      });

      await cell.activate();
      expect(cell.getState()).toBe('sensing');
    });

    it('should process input and return output', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();
      const output = await cell.process('test input');

      expect(output).toBeDefined();
      expect(output.value).toBeDefined();
      expect(output.confidence).toBeDefined();
      expect(output.explanation).toBeDefined();
      expect(output.trace).toBeDefined();
      expect(output.effects).toBeDefined();
    });

    it('should transition through states during processing', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();
      expect(cell.getState()).toBe('sensing');

      await cell.process('test');
      expect(cell.getState()).toBe('emitting');
    });

    it('should learn from feedback', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'analysis' as CellType,
        position,
      });

      const feedback: Feedback = {
        type: 'positive',
        value: 1,
        explanation: 'Good result',
        timestamp: Date.now(),
      };

      await cell.learn(feedback);
      // Learning should complete without errors
      expect(cell.getState()).toBe('dormant');
    });

    it('should deactivate and return to DORMANT', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'input' as CellType,
        position,
      });

      await cell.activate();
      expect(cell.getState()).toBe('sensing');

      await cell.deactivate();
      expect(cell.getState()).toBe('dormant');
    });
  });

  describe('Processing Pipeline', () => {
    it('should create processing context with correct data', async () => {
      const position: CellPosition = { row: 3, col: 7 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      const context = cell['createProcessingContext']('test input');

      expect(context.cellId).toBe(cell.id);
      expect(context.position).toEqual(position);
      expect(context.input).toBeDefined();
      expect(context.sensations).toEqual([]);
      expect(context.memory).toEqual([]);
      expect(context.timestamp).toBeDefined();
    });

    it('should update performance metrics on successful processing', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();
      // Add a small delay to ensure measurable duration
      await new Promise(resolve => setTimeout(resolve, 1));
      await cell.process('test');

      const metrics = cell.getPerformanceMetrics();
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.successfulExecutions).toBe(1);
      expect(metrics.failedExecutions).toBe(0);
      expect(metrics.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it('should store execution in memory', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();
      const testInput = 'test input';
      await cell.process(testInput);

      const recent = cell['body'].memory.getRecent(10);
      expect(recent.length).toBe(1);
      expect(recent[0].input).toBe(testInput);
    });
  });

  describe('Inspection Methods', () => {
    it('should return comprehensive cell inspection', async () => {
      const position: CellPosition = { row: 2, col: 4 };
      const cell = new TestLogCell({
        type: 'analysis' as CellType,
        position,
      });

      await cell.activate();
      const inspection = cell.inspect();

      expect(inspection.cellId).toBe(cell.id);
      expect(inspection.type).toBe('analysis');
      expect(inspection.state).toBe('sensing');
      expect(inspection.position).toEqual(position);
      expect(inspection.inputs).toEqual([]);
      expect(inspection.sensations).toEqual([]);
      expect(inspection.reasoning).toEqual([]);
      expect(inspection.memory).toEqual([]);
      expect(inspection.outputs).toEqual([]);
      expect(inspection.effects).toEqual([]);
      expect(inspection.selfModel).toBeDefined();
    });

    it('should return reasoning trace', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();
      await cell.process('test');

      const trace = cell.getTrace();
      expect(trace).toBeDefined();
      expect(trace.steps).toBeDefined();
      expect(trace.dependencies).toBeDefined();
      expect(trace.confidence).toBeDefined();
      expect(trace.totalTime).toBeDefined();
    });

    it('should return execution history', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();
      await cell.process('test1');
      await cell.process('test2');

      const history = cell.getHistory();
      expect(history.totalExecutions).toBe(2);
      expect(history.recentExecutions.length).toBe(2);
      expect(history.successRate).toBeGreaterThanOrEqual(0);
      expect(history.successRate).toBeLessThanOrEqual(1);
      expect(history.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(history.averageDuration).toBeGreaterThanOrEqual(0);
    });

    it('should calculate success rate correctly', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();
      await cell.process('test1');
      await cell.process('test2');

      const history = cell.getHistory();
      expect(history.successRate).toBe(1.0); // Both executions should succeed
    });
  });

  describe('Error Handling', () => {
    it('should handle and store errors', async () => {
      const position: CellPosition = { row: 0, col: 0 };

      class ErrorCell extends TestLogCell {
        protected async executeProcessing(
          input: any,
          context: ProcessingContext
        ): Promise<ProcessingResult> {
          throw new Error('Test error');
        }
      }

      const cell = new ErrorCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();

      try {
        await cell.process('test');
      } catch (error) {
        // Error expected
      }

      expect(cell.getState()).toBe('error');
      expect(cell.getLastError()).toBeDefined();
      expect(cell.getLastError()?.message).toBe('Test error');
    });

    it('should increment failed executions on error', async () => {
      const position: CellPosition = { row: 0, col: 0 };

      class ErrorCell extends TestLogCell {
        protected async executeProcessing(
          input: any,
          context: ProcessingContext
        ): Promise<ProcessingResult> {
          throw new Error('Test error');
        }
      }

      const cell = new ErrorCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();

      try {
        await cell.process('test');
      } catch (error) {
        // Error expected
      }

      const metrics = cell.getPerformanceMetrics();
      expect(metrics.failedExecutions).toBe(1);
    });

    it('should clear error and reset state', async () => {
      const position: CellPosition = { row: 0, col: 0 };

      class ErrorCell extends TestLogCell {
        protected async executeProcessing(
          input: any,
          context: ProcessingContext
        ): Promise<ProcessingResult> {
          throw new Error('Test error');
        }
      }

      const cell = new ErrorCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();

      try {
        await cell.process('test');
      } catch (error) {
        // Error expected
      }

      expect(cell.getState()).toBe('error');

      cell.clearError();
      expect(cell.getLastError()).toBeUndefined();
      expect(cell.getState()).toBe('dormant');
    });
  });

  describe('Performance Metrics', () => {
    it('should track total executions', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();
      await cell.process('test1');
      await cell.process('test2');
      await cell.process('test3');

      const metrics = cell.getPerformanceMetrics();
      expect(metrics.totalExecutions).toBe(3);
    });

    it('should track successful executions', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();
      await cell.process('test1');
      await cell.process('test2');

      const metrics = cell.getPerformanceMetrics();
      expect(metrics.successfulExecutions).toBe(2);
    });

    it('should track last execution time', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      const beforeProcess = Date.now();
      await cell.activate();
      await cell.process('test');
      const afterProcess = Date.now();

      const metrics = cell.getPerformanceMetrics();
      expect(metrics.lastExecution).toBeGreaterThanOrEqual(beforeProcess);
      expect(metrics.lastExecution).toBeLessThanOrEqual(afterProcess);
    });

    it('should calculate total duration', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();
      // Add small delays to ensure measurable duration
      await new Promise(resolve => setTimeout(resolve, 1));
      await cell.process('test1');
      await new Promise(resolve => setTimeout(resolve, 1));
      await cell.process('test2');

      const metrics = cell.getPerformanceMetrics();
      expect(metrics.totalDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Memory Management', () => {
    it('should respect memory limit', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
        memoryLimit: 3,
      });

      await cell.activate();
      await cell.process('test1');
      await cell.process('test2');
      await cell.process('test3');
      await cell.process('test4');

      const allRecords = cell['body'].memory.records;
      expect(allRecords.length).toBeLessThanOrEqual(3);
    });

    it('should return recent records', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();
      await cell.process('test1');
      await cell.process('test2');
      await cell.process('test3');

      const recent = cell['body'].memory.getRecent(2);
      expect(recent.length).toBe(2);
    });

    it('should clear memory', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();
      await cell.process('test1');
      await cell.process('test2');

      cell['body'].memory.clear();
      expect(cell['body'].memory.records.length).toBe(0);
    });
  });

  describe('Utility Methods', () => {
    it('should return string representation', () => {
      const position: CellPosition = { row: 3, col: 5 };
      const customId = 'test-cell-123';
      const cell = new TestLogCell({
        id: customId,
        type: 'analysis' as CellType,
        position,
      });

      const str = cell.toString();
      expect(str).toContain(customId);
      expect(str).toContain('analysis');
      expect(str).toContain('dormant');
      expect(str).toContain('3');
      expect(str).toContain('5');
    });

    it('should return JSON representation', () => {
      const position: CellPosition = { row: 2, col: 4 };
      const customId = 'test-cell-456';
      const cell = new TestLogCell({
        id: customId,
        type: 'transform' as CellType,
        position,
        logicLevel: 1,
      });

      const json = cell.toJSON();
      expect(json.id).toBe(customId);
      expect(json.type).toBe('transform');
      expect(json.state).toBe('dormant');
      expect(json.position).toEqual(position);
      expect(json.logicLevel).toBe(1);
      expect(json.createdAt).toBeDefined();
      expect(json.performance).toBeDefined();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty input', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();
      const output = await cell.process('');

      expect(output).toBeDefined();
      expect(output.value).toBeDefined();
    });

    it('should handle null input', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();
      const output = await cell.process(null);

      expect(output).toBeDefined();
    });

    it('should handle undefined input', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      await cell.activate();
      const output = await cell.process(undefined);

      expect(output).toBeDefined();
    });

    it('should handle very large input', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'transform' as CellType,
        position,
      });

      const largeInput = 'x'.repeat(10000);

      await cell.activate();
      const output = await cell.process(largeInput);

      expect(output).toBeDefined();
    });

    it('should handle rapid state transitions', async () => {
      const position: CellPosition = { row: 0, col: 0 };
      const cell = new TestLogCell({
        type: 'input' as CellType,
        position,
      });

      await cell.activate();
      await cell.deactivate();
      await cell.activate();
      await cell.deactivate();

      expect(cell.getState()).toBe('dormant');
      const history = cell.getStateHistory();
      // Should have: initial dormant + activate(sensing) + deactivate(dormant) +
      // activate(sensing) + deactivate(dormant) = 5 entries
      expect(history.length).toBeGreaterThanOrEqual(4);
    });
  });
});
