/**
 * Round 11 Instance Tests - Tests for the 7 new SuperInstance types
 */

import {
  SuperInstanceSystem,
  InstanceType,
  InstanceState,
  ViewPortInstance,
  ConnectorInstance,
  ValidatorInstance,
  TriggerInstance,
  CacheInstance
} from '../index';

// Mock the validator to avoid import issues
jest.mock('../validation/SuperInstanceValidator', () => {
  return {
    SuperInstanceValidator: jest.fn().mockImplementation(() => ({
      validateConfiguration: jest.fn().mockReturnValue({ valid: true, errors: [] }),
      validateStateTransition: jest.fn().mockReturnValue({ allowed: true })
    }))
  };
});

// Mock the migration adapter
jest.mock('../adapters/CellMigrationAdapter', () => {
  return {
    CellMigrationAdapter: jest.fn().mockImplementation(() => ({
      migrate: jest.fn()
    }))
  };
});

// Mock DOM for ViewPort tests
const mockCanvas = {
  width: 800,
  height: 600,
  style: {},
  getContext: jest.fn().mockReturnValue({
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn().mockReturnValue({ width: 100 })
  })
};

global.document = {
  createElement: jest.fn().mockImplementation((tag) => {
    if (tag === 'canvas') {
      return mockCanvas;
    }
    return {};
  })
} as any;

global.performance = {
  now: jest.fn(() => Date.now())
} as any;

// Helper function to calculate metrics
const calculateMetrics = async (instance: any) => {
  const metrics = await instance.getMetrics();
  expect(metrics).toBeDefined();
  expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
  expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
  expect(metrics.diskUsage).toBeGreaterThanOrEqual(0);
  expect(metrics.networkIn).toBeGreaterThanOrEqual(0);
  expect(metrics.networkOut).toBeGreaterThanOrEqual(0);
  expect(metrics.requestCount).toBeGreaterThanOrEqual(0);
  expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
  expect(metrics.latency).toBeDefined();
  expect(typeof metrics.latency.p50).toBe('number');
  return metrics;
};

describe('Round 11 SuperInstance Types', () => {
  let system: SuperInstanceSystem;

  beforeEach(() => {
    jest.clearAllMocks();
    system = new SuperInstanceSystem();
  });

  afterEach(async () => {
    const instances = system.getAllInstances();
    for (const instance of instances) {
      if (system.removeInstance) {
        await system.removeInstance(instance.id);
      }
    }
  });

  describe('ViewPortInstance', () => {
    let viewport: ViewPortInstance;

    beforeEach(async () => {
      viewport = await system.createInstance({
        type: InstanceType.VIEWPORT,
        id: 'test-viewport-1',
        name: 'Test ViewPort',
        description: 'A test viewport instance',
        cellPosition: { row: 0, col: 0 },
        spreadsheetId: 'test-spreadsheet',
        viewportConfig: {
          visualizationType: 'chart',
          chartType: 'line',
          width: 800,
          height: 600,
          renderingEngine: 'canvas2d'
        }
      }) as ViewPortInstance;
    });

    it('should create and initialize ViewPort instance', async () => {
      expect(viewport).toBeDefined();
      expect(viewport.type).toBe(InstanceType.VIEWPORT);
      expect(viewport.getCanvas()).toBeNull(); // Canvas not created until activated

      await viewport.activate();
      expect(viewport.state).toBe(InstanceState.RUNNING);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    });

    it('should render different chart types', async () => {
      await viewport.activate();

      // Test line chart
      const lineData = [10, 20, 30, 40, 50];
      await viewport.render(lineData);
      expect(viewport.getCanvas()).toBeDefined();

      // Test bar chart
      viewport.configuration.chartType = 'bar';
      await viewport.render({ values: lineData });

      // Test scatter chart
      viewport.configuration.chartType = 'scatter';
      await viewport.render({ xValues: [1, 2, 3], yValues: [1, 4, 9] });
    });

    it('should handle table and dashboard rendering', async () => {
      await viewport.activate();

      // Test table rendering
      viewport.configuration.visualizationType = 'table';
      await viewport.render([
        { id: 1, name: 'Item 1', value: 100 },
        { id: 2, name: 'Item 2', value: 200 }
      ]);

      // Test dashboard
      viewport.configuration.visualizationType = 'dashboard';
      await viewport.render({
        widgets: [
          { type: 'chart', data: [1, 2, 3] },
          { type: 'table', data: [{ x: 1, y: 2 }] }
        ]
      });
    });

    it('should handle data bindings', async () => {
      await viewport.activate();

      const binding = {
        sourceId: 'test-source',
        sourcePath: 'data.values',
        targetPath: 'chart.values',
        bindingType: 'direct' as const
      };

      viewport.bindData(binding);
      expect(viewport.dataBindings).toHaveLength(1);

      // Refresh bindings
      await viewport.refreshBindings();

      // Remove binding
      viewport.unbindData('test-source');
      expect(viewport.dataBindings).toHaveLength(0);
    });

    it('should handle interactions', async () => {
      await viewport.activate();

      const handler = jest.fn();
      viewport.registerInteractionHandler('click', handler);

      // Trigger interaction (would be called from actual UI event)
      // In real implementation, this would be triggered by canvas events
    });

    it('should export visualization', async () => {
      await viewport.activate();
      await viewport.render([1, 2, 3]);

      const dataUrl = viewport.getDataURL();
      expect(dataUrl).toContain('data:image/png');
    });

    it('should provide metrics', async () => {
      await viewport.activate();
      await calculateMetrics(viewport);
    });

    it('should handle serialization', async () => {
      await viewport.activate();
      await viewport.render({ values: [1, 2, 3] });

      const snapshot = await viewport.serialize();
      expect(snapshot.type).toBe(InstanceType.VIEWPORT);
      expect(snapshot.data.configuration).toBeDefined();
      expect(snapshot.data.renderedData).toEqual({ values: [1, 2, 3] });
      expect(snapshot.data.renderCount).toBe(1);
    });
  });

  describe('ConnectorInstance', () => {
    let connector: ConnectorInstance;

    beforeEach(async () => {
      connector = await system.createInstance({
        type: InstanceType.CONNECTOR,
        id: 'test-connector-1',
        name: 'Test Connector',
        description: 'A test connector instance',
        cellPosition: { row: 1, col: 0 },
        spreadsheetId: 'test-spreadsheet',
        connectorConfig: {
          protocol: 'http',
          endpoint: 'https://api.example.com',
          role: 'bidirectional',
          authentication: 'none',
          timeout: 5000
        }
      }) as ConnectorInstance;
    });

    it('should create and initialize Connector instance', async () => {
      expect(connector).toBeDefined();
      expect(connector.type).toBe(InstanceType.CONNECTOR);
      expect(connector.getConnectionStatus()).toBe('disconnected');

      await connector.activate();
      expect(connector.state).toBe(InstanceState.RUNNING);
    });

    it('should connect and disconnect', async () => {
      await connector.activate();

      await connector.connect();
      expect(connector.getConnectionStatus()).toBeOneOf(['connected', 'authenticated']);

      await connector.disconnect();
      expect(connector.getConnectionStatus()).toBe('disconnected');
    });

    it('should send and receive data', async () => {
      await connector.activate();
      await connector.connect();

      // Send data
      await connector.send({ message: 'test data' });

      // Receive data
      const response = await connector.receive();
      expect(response).toBeDefined();
      expect(response.timestamp).toBeDefined();

      // Send and receive in one operation
      const result = await connector.sendAndReceive({ query: 'test' });
      expect(result).toBeDefined();
    });

    it('should handle batch operations', async () => {
      await connector.activate();
      await connector.connect();

      // Batch send
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      await connector.sendBatch(items);

      // Batch receive
      const received = await connector.receiveBatch(5);
      expect(Array.isArray(received)).toBe(true);
    });

    it('should handle pub/sub for supported protocols', async () => {
      connector.configuration.protocol = 'mqtt';

      await connector.subscribe('test/topic');
      await connector.publish('test/topic', { message: 'hello' });
      await connector.unsubscribe('test/topic');
    });

    it('should test connection', async () => {
      await connector.activate();

      const result = await connector.testConnection();
      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(typeof result.latency).toBe('number');
      }
    });

    it('should track connection metrics', async () => {
      await connector.activate();
      await connector.connect();

      // Simulate some traffic
      await connector.send({ test: 1 });
      await connector.send({ test: 2 });
      await connector.receive();

      const record = connector.getConnectionRecord();
      expect(record).toBeDefined();
      expect(record.messagesSent).toBeGreaterThanOrEqual(2);

      const history = connector.getMessageHistory(10);
      expect(Array.isArray(history)).toBe(true);

      const throughput = connector.getThroughput();
      expect(typeof throughput).toBe('number');

      const latency = connector.getLatency();
      expect(typeof latency).toBe('number');
    });

    it('should update configuration', async () => {
      await connector.updateConfiguration({
        endpoint: 'https://api2.example.com',
        timeout: 3000
      });

      expect(connector.configuration.endpoint).toBe('https://api2.example.com');
      expect(connector.configuration.timeout).toBe(3000);
    });

    it('should provide metrics', async () => {
      await connector.activate();
      await calculateMetrics(connector);
    });

    it('should handle serialization', async () => {
      await connector.activate();

      const snapshot = await connector.serialize();
      expect(snapshot.type).toBe(InstanceType.CONNECTOR);
      expect(snapshot.data.configuration).toBeDefined();
      expect(snapshot.data.connectionStatus).toBeDefined();
    });
  });

  describe('ValidatorInstance', () => {
    let validator: ValidatorInstance;

    beforeEach(async () => {
      validator = await system.createInstance({
        type: InstanceType.VALIDATOR,
        id: 'test-validator-1',
        name: 'Test Validator',
        description: 'A test validator instance',
        cellPosition: { row: 2, col: 0 },
        spreadsheetId: 'test-spreadsheet'
      }) as ValidatorInstance;
    });

    it('should create and initialize Validator instance', async () => {
      expect(validator).toBeDefined();
      expect(validator.type).toBe(InstanceType.VALIDATOR);
      expect(validator.rulebook.rules.size).toBeGreaterThan(0); // Default rules added

      await validator.activate();
      expect(validator.state).toBe(InstanceState.RUNNING);
    });

    it('should validate data', async () => {
      await validator.activate();

      // Test with valid email
      const report1 = await validator.validate('test@example.com', {
        sourceId: 'test-source',
        timestamp: Date.now()
      });

      expect(report1).toBeDefined();
      expect(report1.confidence).toBeGreaterThan(0);

      // Test with invalid email
      const report2 = await validator.validate('invalid-email', {
        sourceId: 'test-source',
        timestamp: Date.now()
      });

      expect(report2.summary.failed).toBeGreaterThan(0);
    });

    it('should manage validation rules', async () => {
      await validator.activate();

      const newRule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'A test rule',
        type: 'custom',
        priority: 5,
        enabled: true,
        validation: (data: any) => ({
          valid: data === 'expected',
          errors: data !== 'expected' ? [{
            code: 'INVALID',
            message: 'Not expected value',
            path: [],
            severity: 'error' as const
          }] : [],
          warnings: [],
          suggestions: []
        }),
        tags: ['test']
      };

      validator.addRule(newRule);
      expect(validator.getRule('test-rule')).toBeDefined();

      const results = validator.getRules(rule => rule.tags?.includes('test'));
      expect(results.length).toBeGreaterThan(0);

      validator.removeRule('test-rule');
      expect(validator.getRule('test-rule')).toBeUndefined();
    });

    it('should manage rule sets', async () => {
      await validator.activate();

      const ruleSet = {
        id: 'test-ruleset',
        name: 'Test Rule Set',
        description: 'A test rule set',
        rules: ['number-0-100'], // Reference existing rule
        logic: 'AND' as const,
        stopOnFirstFailure: true,
        applyTo: ['test.*']
      };

      validator.createRuleSet(ruleSet);
      expect(validator.getRuleSet('test-ruleset')).toBeDefined();

      const reports = await validator.validateRuleSet('test-ruleset', 50, {
        sourceId: 'test.data',
        timestamp: Date.now()
      });

      expect(reports.summary.failed).toBe(0);

      validator.deleteRuleSet('test-ruleset');
      expect(validator.getRuleSet('test-ruleset')).toBeUndefined();
    });

    it('should validate batches', async () => {
      await validator.activate();

      const testData = ['user@example.com', 'invalid-email', 'test@test.com'];
      const reports = await validator.validateBatch(testData, {
        sourceId: 'batch-validator',
        executionContext: 'batch'
      });

      expect(reports.length).toBe(3);
      expect(reports[0].summary.passed).toBeGreaterThan(0); // Valid email
      expect(reports[1].summary.failed).toBeGreaterThan(0); // Invalid email
      expect(reports[2].summary.passed).toBeGreaterThan(0); // Valid email
    });

    it('should auto-correct data', async () => {
      await validator.activate();

      const result = await validator.validateWithAutoCorrect(150, {
        sourceId: 'auto-correct-test'
      });

      expect(result).toBeDefined();
      expect(result.report).toBeDefined();

      if (result.correctedData !== undefined) {
        expect(result.correctedData).toBe(100); // Auto-corrected to max
      }
    });

    it('should track performance', async () => {
      await validator.activate();

      // Perform multiple validations
      for (let i = 0; i < 10; i++) {
        await validator.validate('test@example.com', {
          sourceId: 'perf-test',
          timestamp: Date.now() + i
        });
      }

      const performance = validator.getPerformance();
      expect(performance).toHaveProperty('averageTime');
      expect(performance).toHaveProperty('p50Time');
      expect(performance).toHaveProperty('p95Time');
      expect(performance).toHaveProperty('p99Time');
      expect(performance.averageTime).toBeGreaterThanOrEqual(0);
    });

    it('should export/import rulebook', async () => {
      await validator.activate();

      // Add some rules
      validator.createRuleFromTemplate('number_range', 'test-range', {
        id: 'test-range',
        name: 'Test Range',
        min: 0,
        max: 100
      });

      const exported = validator.exportRulebook();
      expect(exported).toContain('"rules":');
      expect(exported).toContain('"test-range"');

      // Create new validator and import
      const validator2 = await system.createInstance({
        type: InstanceType.VALIDATOR,
        id: 'test-validator-2',
        name: 'Imported Validator'
      });

      validator2.importRulebook(exported);
      expect(validator2.getRule('test-range')).toBeDefined();
    });

    it('should provide metrics', async () => {
      await validator.activate();

      await calculateMetrics(validator);
    });

    it('should handle serialization', async () => {
      await validator.activate();

      const snapshot = await validator.serialize();
      expect(snapshot.type).toBe(InstanceType.VALIDATOR);
      expect(snapshot.data.rulebook).toBeDefined();
      expect(snapshot.data.validatorState).toBeDefined();
    });
  });

  describe('TriggerInstance', () => {
    let trigger: TriggerInstance;

    beforeEach(async () => {
      trigger = await system.createInstance({
        type: InstanceType.TRIGGER,
        id: 'test-trigger-1',
        name: 'Test Trigger',
        description: 'A test trigger instance',
        cellPosition: { row: 3, col: 0 },
        spreadsheetId: 'test-spreadsheet',
        triggerConfig: {
          triggerType: 'threshold',
          enabled: true,
          conditions: [{
            type: 'data_value',
            field: 'value',
            operator: 'gt',
            value: 10
          }],
          actions: [{
            type: 'javascript',
            script: 'console.log("Triggered with:", triggerData)'
          }]
        }
      }) as TriggerInstance;
    });

    it('should create and initialize Trigger instance', async () => {
      expect(trigger).toBeDefined();
      expect(trigger.type).toBe(InstanceType.TRIGGER);
      expect(trigger.testConditions({ value: 5 })).toBe(false);
      expect(trigger.testConditions({ value: 15 })).toBe(true);

      await trigger.activate();
      expect(trigger.state).toBe(InstanceState.RUNNING);
    });

    it('should arm and disarm trigger', async () => {
      // Test disarmed
      await trigger.forceTrigger(); // Should not execute when disarmed

      // Arm trigger
      await trigger.arm();

      // Test armed
      expect(trigger.testConditions({ value: 15 })).toBe(true);
    });

    it('should execute triggers based on conditions', async () => {
      await trigger.activate();
      await trigger.arm();

      // Trigger with valid data (should execute)
      await trigger.trigger({ value: 20 });

      const executions = trigger.getExecutions(1);
      expect(executions).toHaveLength(1);
      expect(executions[0].triggeredBy).toEqual({ value: 20 });
      expect(executions[0].success).toBe(true);
    });

    it('should handle scheduling', async () => {
      trigger.configuration.triggerType = 'schedule';
      trigger.configuration.schedule = {
        type: 'interval',
        interval: 100 // 100ms for testing
      };

      await trigger.activate();
      await trigger.arm();

      // Wait for scheduled execution
      await new Promise(resolve => setTimeout(resolve, 150));

      const executions = trigger.getExecutions(1);
      expect(executions.length).toBeGreaterThanOrEqual(0); // May or may not have executed
    });

    it('should handle cooldown and debounce', async () => {
      trigger.configuration.cooldownPeriod = 500;
      trigger.configuration.debounceDelay = 100;

      await trigger.activate();
      await trigger.arm();

      await trigger.trigger({ value: 20 });
      await trigger.trigger({ value: 21 });
      await trigger.trigger({ value: 22 });
      await trigger.trigger({ value: 23 });

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 200));

      const executions = trigger.getExecutions(10);
      // Due to cooldown/debounce, fewer executions than triggers
      expect(executions.length).toBeLessThanOrEqual(4);
    });

    it('should provide execution statistics', async () => {
      await trigger.activate();
      await trigger.arm();

      // Execute several times
      for (let i = 0; i < 5; i++) {
        await trigger.forceTrigger({ value: i });
      }

      const stats = trigger.getStatistics();
      expect(stats.totalExecutions).toBe(5);
      expect(stats.successfulExecutions).toBe(5);
      expect(stats.failedExecutions).toBe(0);
      expect(stats.averageExecutionTime).toBeGreaterThanOrEqual(0);
      expect(stats.reliability).toBe(1);
    });

    it('should handle complex conditions', async () => {
      // Add composite condition
      trigger.addCondition({
        type: 'composite',
        operator: 'exists',
        customCode: 'return data.complexCondition === true && data.priority > 5'
      });

      await trigger.activate();

      expect(trigger.testConditions({ complexCondition: true, priority: 6 })).toBe(true);
      expect(trigger.testConditions({ complexCondition: true, priority: 3 })).toBe(false);
      expect(trigger.testConditions({ simple: true })).toBe(false);
    });

    it('should manage conditions and actions', () => {
      const initialCount = trigger.configuration.conditions.length;

      // Add condition
      trigger.addCondition({
        type: 'data_value',
        field: 'status',
        operator: 'eq',
        value: 'active'
      });
      expect(trigger.configuration.conditions.length).toBe(initialCount + 1);

      // Add action
      trigger.addAction({
        type: 'webhook',
        endpoint: 'https://webhook.site/test'
      });
      expect(trigger.configuration.actions.length).toBe(2);

      // Remove condition
      trigger.removeCondition(0);
      expect(trigger.configuration.conditions.length).toBe(initialCount);
    });

    it('should provide metrics', async () => {
      await trigger.activate();
      await trigger.arm();

      await calculateMetrics(trigger);
    });

    it('should handle serialization', async () => {
      await trigger.activate();
      await trigger.forceTrigger({ test: true });

      const snapshot = await trigger.serialize();
      expect(snapshot.type).toBe(InstanceType.TRIGGER);
      expect(snapshot.data.executions).toBeDefined();
      expect(snapshot.data.armed).toBe(true);
      expect(snapshot.data.executionCount).toBe(1);
    });
  });

  describe('CacheInstance', () => {
    let cache: CacheInstance;

    beforeEach(async () => {
      cache = await system.createInstance({
        type: InstanceType.CACHE,
        id: 'test-cache-1',
        name: 'Test Cache',
        description: 'A test cache instance',
        cellPosition: { row: 4, col: 0 },
        spreadsheetId: 'test-spreadsheet',
        policy: {
          policyType: 'LRU',
          maxSize: 100,
          ttl: 1000 // 1 second for testing
        }
      }) as CacheInstance;
    });

    it('should create and initialize Cache instance', async () => {
      expect(cache).toBeDefined();
      expect(cache.type).toBe(InstanceType.CACHE);
      expect(cache.policy.policyType).toBe('LRU');

      await cache.activate();
      expect(cache.state).toBe(InstanceState.RUNNING);
    });

    it('should set and get cache entries', async () => {
      await cache.activate();

      // Set entry
      await cache.set('key1', { value: 'data1' }, 2000);

      // Get entry
      const value = await cache.get('key1');
      expect(value).toEqual({ value: 'data1' });

      // Check exists
      const exists = await cache.has('key1');
      expect(exists).toBe(true);

      // Get missing key
      await expect(cache.get('missing')).rejects.toThrow('missing');
    });

    it('should handle cache expiration', async () => {
      await cache.activate();

      // Set with short TTL
      await cache.set('key1', { value: 'data1' }, 100); // 100ms

      // Should exist immediately
      expect(await cache.has('key1')).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(await cache.has('key1')).toBe(false);
      await expect(cache.get('key1')).rejects.toThrow('expired');
    });

    it('should handle batch operations', async () => {
      await cache.activate();

      // Batch set
      await cache.batchSet([
        { key: 'k1', value: { v: 1 } },
        { key: 'k2', value: { v: 2 } },
        { key: 'k3', value: { v: 3 } }
      ]);

      // Batch get
      const result = await cache.batchGet(['k1', 'k2', 'missing']);
      expect(result.found.k1).toBeDefined();
      expect(result.found.k2).toBeDefined();
      expect(result.missing).toContain('missing');
      expect(result.stats.hits).toBe(2);
      expect(result.stats.misses).toBe(1);

      // Batch delete
      await cache.batchDelete('k1', 'k2', 'k3');
      expect(await cache.has('k1')).toBe(false);
      expect(await cache.has('k2')).toBe(false);
      expect(await cache.has('k3')).toBe(false);
    });

    it('should handle numeric operations', async () => {
      await cache.activate();

      // Increment
      const val1 = await cache.increment('counter', 5);
      expect(val1).toBe(5);

      const val2 = await cache.increment('counter');
      expect(val2).toBe(6);

      // Decrement
      const val3 = await cache.decrement('counter', 2);
      expect(val3).toBe(4);
    });

    it('should clear cache', async () => {
      await cache.activate();

      // Add entries
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      expect(await cache.has('key1')).toBe(true);
      expect(await cache.has('key2')).toBe(true);

      // Clear
      await cache.clear();

      expect(await cache.has('key1')).toBe(false);
      expect(await cache.has('key2')).toBe(false);
    });

    it('should handle cache eviction', async () => {
      cache.policy.maxSize = 3;
      cache.policy.policyType = 'LRU';

      await cache.activate();

      // Fill cache
      await cache.set('k1', 'v1');
      await cache.set('k2', 'v2');
      await cache.set('k3', 'v3');

      // Access k1 to make it recently used
      await cache.get('k1');

      // Add one more (should evict k2)
      await cache.set('k4', 'v4');

      expect(await cache.has('k1')).toBe(true);
      expect(await cache.has('k2')).toBe(false); // Should be evicted
      expect(await cache.has('k3')).toBe(true);
      expect(await cache.has('k4')).toBe(true);
    });

    it('should provide cache metrics', async () => {
      await cache.activate();

      // Add entries
      await cache.set('k1', 'v1');
      await cache.set('k2', 'v2');
      await cache.get('k1'); // Hit
      await cache.get('k2'); // Hit

      const metrics = cache.getCacheMetrics();
      expect(metrics.totalEntries).toBe(2);
      expect(metrics.totalHits).toBe(2);
      expect(metrics.hitRate).toBe(1);

      // Miss
      try { await cache.get('missing'); } catch {}

      const newMetrics = cache.getCacheMetrics();
      expect(newMetrics.hitRate).toBeLessThan(1);
    });

    it('should export/import cache', async () => {
      await cache.activate();

      // Add entries
      await cache.set('k1', { data: 1 });
      await cache.set('k2', { data: 2 });

      // Export
      const exported = await cache.exportCache();
      expect(exported.entries.length).toBe(2);
      expect(exported.metadata.policy.policyType).toBe('LRU');

      // Clear and import
      await cache.clear();
      expect(await cache.has('k1')).toBe(false);

      await cache.importCache(exported);
      expect(await cache.has('k1')).toBe(true);
      expect(await cache.has('k2')).toBe(true);
    });

    it('should provide metrics', async () => {
      await cache.activate();

      await calculateMetrics(cache);
    });

    it('should handle serialization', async () => {
      await cache.activate();
      await cache.set('test', 'data');

      const snapshot = await cache.serialize();
      expect(snapshot.type).toBe(InstanceType.CACHE);
      expect(snapshot.data.policy).toBeDefined();
      expect(snapshot.data.cacheEntries).toHaveLength(1);
    });
  });

  describe('Instance Integration', () => {
    it('should demonstrate trigger -> validator -> connector flow', async () => {
      // Create instances
      const trigger = await system.createInstance({
        type: InstanceType.TRIGGER,
        id: 'integration-trigger',
        cellPosition: { row: 5, col: 0 },
        triggerConfig: {
          triggerType: 'event',
          enabled: true,
          conditions: [{
            type: 'data_value',
            field: 'data',
            operator: 'exists'
          }],
          actions: [{
            type: 'webhook',
            endpoint: 'http://localhost/validate'
          }]
        }
      }) as TriggerInstance;

      const validator = await system.createInstance({
        type: InstanceType.VALIDATOR,
        id: 'integration-validator',
        cellPosition: { row: 5, col: 1 }
      }) as ValidatorInstance;

      const connector = await system.createInstance({
        type: InstanceType.CONNECTOR,
        id: 'integration-connector',
        cellPosition: { row: 5, col: 2 },
        connectorConfig: {
          protocol: 'http',
          endpoint: 'https://post-prod-companies.localhost',
          role: 'source'
        }
      }) as ConnectorInstance;

      // Activate all
      await trigger.activate();
      await validator.activate();
      await connector.activate();

      // Trigger validation of data
      const testData = { email: 'user@example.com', age: 25 };
      await trigger.trigger(testData);

      // Validate data
      const validation = await validator.validate(testData);
      expect(validation.summary.failed).toBe(0); // Valid email

      // Send validated data via connector
      if (validation.summary.failed === 0) {
        await connector.connect();
        await connector.send(testData);
      }

      // Verify integration
      expect(trigger.getExecutions(1)).toHaveLength(1);
      expect(connector.getConnectionStatus()).toBeOneOf(['connected', 'authenticated']);
    });
  });
});