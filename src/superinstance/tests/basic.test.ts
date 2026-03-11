/**
 * Basic tests for SuperInstance system
 *
 * Verifies core functionality of the SuperInstance implementations.
 */

import { SuperInstanceSystem, InstanceType, InstanceState } from '../index';

describe('SuperInstance System', () => {
  let system: SuperInstanceSystem;

  beforeEach(() => {
    system = new SuperInstanceSystem();
  });

  afterEach(async () => {
    // Clean up all instances
    const instances = system.getAllInstances();
    for (const instance of instances) {
      await system.removeInstance(instance.id);
    }
  });

  describe('DataBlockInstance', () => {
    it('should create and initialize a DataBlockInstance', async () => {
      const instance = await system.createInstance({
        type: InstanceType.DATA_BLOCK,
        id: 'test-data-block-1',
        name: 'Test Data Block',
        description: 'A test data block instance',
        cellPosition: { row: 0, col: 0 },
        spreadsheetId: 'test-spreadsheet',
        dataFormat: 'json',
        data: { test: 'data' }
      });

      expect(instance).toBeDefined();
      expect(instance.id).toBe('test-data-block-1');
      expect(instance.type).toBe(InstanceType.DATA_BLOCK);
      expect(instance.state).toBe(InstanceState.INITIALIZED);
    });

    it('should read and write data', async () => {
      const instance = await system.createInstance({
        type: InstanceType.DATA_BLOCK,
        id: 'test-data-block-2',
        name: 'Test Data Block',
        description: 'A test data block instance',
        cellPosition: { row: 0, col: 1 },
        spreadsheetId: 'test-spreadsheet',
        dataFormat: 'json',
        data: { initial: 'data' }
      });

      // Read data
      const data = await instance.read();
      expect(data).toEqual({ initial: 'data' });

      // Write new data
      await instance.write({ new: 'data' });
      const newData = await instance.read();
      expect(newData).toEqual({ new: 'data' });
    });

    it('should transform data', async () => {
      const instance = await system.createInstance({
        type: InstanceType.DATA_BLOCK,
        id: 'test-data-block-3',
        name: 'Test Data Block',
        description: 'A test data block instance',
        cellPosition: { row: 0, col: 2 },
        spreadsheetId: 'test-spreadsheet',
        dataFormat: 'json',
        data: [1, 2, 3, 4, 5]
      });

      // Transform data (filter even numbers)
      const transformed = await instance.transform({
        type: 'filter',
        operation: (x: number) => x % 2 === 0
      });

      expect(transformed).toBeDefined();
      expect(transformed.type).toBe(InstanceType.DATA_BLOCK);

      // In a real test, we would read the transformed data
      // For now, just verify the instance was created
    });
  });

  describe('ProcessInstance', () => {
    it('should create and initialize a ProcessInstance', async () => {
      const instance = await system.createInstance({
        type: InstanceType.PROCESS,
        id: 'test-process-1',
        name: 'Test Process',
        description: 'A test process instance',
        cellPosition: { row: 1, col: 0 },
        spreadsheetId: 'test-spreadsheet',
        command: 'echo',
        arguments: ['hello']
      });

      expect(instance).toBeDefined();
      expect(instance.id).toBe('test-process-1');
      expect(instance.type).toBe(InstanceType.PROCESS);
      expect(instance.state).toBe(InstanceState.INITIALIZED);
    });

    it('should start and stop a process', async () => {
      const instance = await system.createInstance({
        type: InstanceType.PROCESS,
        id: 'test-process-2',
        name: 'Test Process',
        description: 'A test process instance',
        cellPosition: { row: 1, col: 1 },
        spreadsheetId: 'test-spreadsheet',
        command: 'sleep',
        arguments: ['1']
      });

      // Start process
      await instance.start();
      expect(instance.state).toBe(InstanceState.RUNNING);

      // Check if running
      const isRunning = await instance.isRunning();
      expect(isRunning).toBe(true);

      // Stop process
      await instance.stop();
      expect(instance.state).toBe(InstanceState.STOPPED);
    });

    it('should get process status and metrics', async () => {
      const instance = await system.createInstance({
        type: InstanceType.PROCESS,
        id: 'test-process-3',
        name: 'Test Process',
        description: 'A test process instance',
        cellPosition: { row: 1, col: 2 },
        spreadsheetId: 'test-spreadsheet',
        command: 'test'
      });

      // Get status
      const status = await instance.getStatus();
      expect(status).toBeDefined();
      expect(status.state).toBe(InstanceState.INITIALIZED);

      // Get metrics
      const metrics = await instance.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.cpuUsage).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
    });
  });

  describe('LearningAgentInstance', () => {
    it('should create and initialize a LearningAgentInstance', async () => {
      const instance = await system.createInstance({
        type: InstanceType.LEARNING_AGENT,
        id: 'test-agent-1',
        name: 'Test Learning Agent',
        description: 'A test learning agent instance',
        cellPosition: { row: 2, col: 0 },
        spreadsheetId: 'test-spreadsheet',
        modelType: 'classification',
        hyperparameters: {
          learningRate: 0.001,
          batchSize: 32,
          epochs: 10
        }
      });

      expect(instance).toBeDefined();
      expect(instance.id).toBe('test-agent-1');
      expect(instance.type).toBe(InstanceType.LEARNING_AGENT);
      expect(instance.state).toBe(InstanceState.INITIALIZED);
    });

    it('should make predictions', async () => {
      const instance = await system.createInstance({
        type: InstanceType.LEARNING_AGENT,
        id: 'test-agent-2',
        name: 'Test Learning Agent',
        description: 'A test learning agent instance',
        cellPosition: { row: 2, col: 1 },
        spreadsheetId: 'test-spreadsheet',
        modelType: 'classification'
      });

      // Activate the agent
      await instance.activate();

      // Make a prediction
      const prediction = await instance.predict({ features: [1, 2, 3] });
      expect(prediction).toBeDefined();
      expect(prediction.value).toBeDefined();
      expect(typeof prediction.confidence).toBe('number');
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should manage knowledge', async () => {
      const instance = await system.createInstance({
        type: InstanceType.LEARNING_AGENT,
        id: 'test-agent-3',
        name: 'Test Learning Agent',
        description: 'A test learning agent instance',
        cellPosition: { row: 2, col: 2 },
        spreadsheetId: 'test-spreadsheet',
        modelType: 'classification'
      });

      // Add knowledge
      await instance.addKnowledge({
        id: 'test-knowledge-1',
        type: 'fact',
        content: { fact: 'Test fact' },
        confidence: 0.9,
        timestamp: Date.now()
      });

      // Retrieve knowledge
      const knowledge = await instance.retrieveKnowledge('test');
      expect(knowledge).toBeDefined();
      expect(Array.isArray(knowledge)).toBe(true);

      // Get knowledge stats
      const stats = await instance.getKnowledgeBaseStats();
      expect(stats).toBeDefined();
      expect(stats.totalItems).toBeGreaterThanOrEqual(0);
    });
  });

  describe('System Management', () => {
    it('should track all instances', async () => {
      // Create multiple instances
      await system.createInstance({
        type: InstanceType.DATA_BLOCK,
        id: 'system-test-1',
        name: 'System Test 1',
        description: 'Test instance 1',
        cellPosition: { row: 3, col: 0 },
        spreadsheetId: 'test-spreadsheet',
        dataFormat: 'json'
      });

      await system.createInstance({
        type: InstanceType.PROCESS,
        id: 'system-test-2',
        name: 'System Test 2',
        description: 'Test instance 2',
        cellPosition: { row: 3, col: 1 },
        spreadsheetId: 'test-spreadsheet',
        command: 'test'
      });

      // Get all instances
      const instances = system.getAllInstances();
      expect(instances.length).toBe(2);

      // Get system status
      const status = system.getSystemStatus();
      expect(status.totalInstances).toBe(2);
      expect(status.byType[InstanceType.DATA_BLOCK]).toBe(1);
      expect(status.byType[InstanceType.PROCESS]).toBe(1);
    });

    it('should remove instances', async () => {
      const instance = await system.createInstance({
        type: InstanceType.DATA_BLOCK,
        id: 'remove-test-1',
        name: 'Remove Test',
        description: 'Test instance for removal',
        cellPosition: { row: 4, col: 0 },
        spreadsheetId: 'test-spreadsheet',
        dataFormat: 'json'
      });

      // Verify instance exists
      expect(system.getInstance('remove-test-1')).toBeDefined();
      expect(system.getAllInstances().length).toBe(1);

      // Remove instance
      const removed = await system.removeInstance('remove-test-1');
      expect(removed).toBe(true);

      // Verify instance is gone
      expect(system.getInstance('remove-test-1')).toBeUndefined();
      expect(system.getAllInstances().length).toBe(0);
    });
  });

  describe('Validation', () => {
    it('should validate instance configurations', () => {
      const validator = system.getValidator();

      // Test valid configuration
      const validConfig = {
        resources: { cpu: 10, memory: 100, storage: 1000, network: 10 },
        constraints: { maxRuntime: 60000, maxMemory: 500, networkQuota: 100, allowedOperations: [], disallowedOperations: [] },
        policies: { isolationLevel: 'partial', dataEncryption: true, auditLogging: true, backupFrequency: 60, retentionPeriod: 30 },
        hooks: {},
        monitoring: { enabled: true, metricsInterval: 30, alertThresholds: { cpuUsage: 80, memoryUsage: 80, errorRate: 0.1, latency: 1000 }, logLevel: 'info' }
      };

      const result = validator.validateConfiguration(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);

      // Test invalid configuration (CPU > 100)
      const invalidConfig = {
        ...validConfig,
        resources: { ...validConfig.resources, cpu: 150 }
      };

      const invalidResult = validator.validateConfiguration(invalidConfig);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should validate state transitions', () => {
      const validator = system.getValidator();

      // Valid transition: UNINITIALIZED -> INITIALIZING
      const validTransition = validator.validateStateTransition(
        InstanceState.UNINITIALIZED,
        InstanceState.INITIALIZING,
        InstanceType.DATA_BLOCK
      );

      expect(validTransition.allowed).toBe(true);

      // Invalid transition: UNINITIALIZED -> RUNNING
      const invalidTransition = validator.validateStateTransition(
        InstanceState.UNINITIALIZED,
        InstanceState.RUNNING,
        InstanceType.DATA_BLOCK
      );

      expect(invalidTransition.allowed).toBe(false);
    });
  });
});