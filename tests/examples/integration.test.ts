/**
 * Integration Test Examples - Demonstrates IntegrationTestSuite usage
 *
 * Run with: npm test integration.test.ts
 *
 * Note: These tests may take longer to run and test complex scenarios
 */

import { describe, it, expect, afterEach } from '@jest/globals';
import {
  IntegrationTestSuite,
  CellTestHelper,
  ColonyTestHelper,
  TestDataManager,
  MockBackend
} from '../../src/spreadsheet/testing';

describe('Integration Test Examples', () => {
  afterEach(async () => {
    await IntegrationTestSuite.cleanup();
    IntegrationTestSuite.clear();
  });

  describe('End-to-End Workflows', () => {
    it('should test complete spreadsheet workflow', async () => {
      const result = await IntegrationTestSuite.testSpreadsheetWorkflow();

      expect(result.name).toBe('Spreadsheet Workflow');
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should test colony evolution scenario', async () => {
      const result = await IntegrationTestSuite.testColonyEvolution();

      expect(result.name).toBe('Colony Evolution');
      expect(result.passed).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('Collaboration Testing', () => {
    it('should setup collaboration session', async () => {
      const users = [
        { id: 'user-1', name: 'Alice', permissions: ['read', 'write'] },
        { id: 'user-2', name: 'Bob', permissions: ['read', 'write'] }
      ];

      const session = await IntegrationTestSuite.setupCollaboration(
        users,
        'test-spreadsheet'
      );

      expect(session).toBeDefined();
      expect(session.users).toHaveLength(2);
      expect(session.backend.ws.getClientCount()).toBe(2);
    });

    it('should test multi-user editing', async () => {
      const users = [
        { id: 'user-1', name: 'Alice', permissions: ['read', 'write'] },
        { id: 'user-2', name: 'Bob', permissions: ['read', 'write'] },
        { id: 'user-3', name: 'Charlie', permissions: ['read', 'write'] }
      ];

      const session = await IntegrationTestSuite.setupCollaboration(
        users,
        'test-spreadsheet'
      );

      const result = await IntegrationTestSuite.testMultiUserEditing(session);

      expect(result.name).toBe('Multi-User Editing');
      expect(result.passed).toBe(true);
    });

    it('should test conflict resolution', async () => {
      const users = [
        { id: 'user-1', name: 'Alice', permissions: ['read', 'write'] },
        { id: 'user-2', name: 'Bob', permissions: ['read', 'write'] }
      ];

      const session = await IntegrationTestSuite.setupCollaboration(
        users,
        'test-spreadsheet'
      );

      const result = await IntegrationTestSuite.testConflictResolution(session);

      expect(result.name).toBe('Conflict Resolution');
      expect(result.passed).toBe(true);
    });

    it('should test real-time synchronization', async () => {
      const users = [
        { id: 'user-1', name: 'Alice', permissions: ['read', 'write'] },
        { id: 'user-2', name: 'Bob', permissions: ['read', 'write'] }
      ];

      const session = await IntegrationTestSuite.setupCollaboration(
        users,
        'test-spreadsheet'
      );

      const result = await IntegrationTestSuite.testRealtimeSync(session);

      expect(result.name).toBe('Real-time Sync');
      expect(result.passed).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('WebSocket Integration', () => {
    it('should test WebSocket lifecycle', async () => {
      const backend = new MockBackend();
      await backend.start();

      const result = await IntegrationTestSuite.testWebSocketLifecycle(backend);

      expect(result.name).toBe('WebSocket Lifecycle');
      expect(result.passed).toBe(true);

      await backend.stop();
    });

    it('should handle connection and disconnection', async () => {
      const backend = new MockBackend();
      await backend.start();

      // Connect client
      const ws = await backend.ws.connect('test-client');
      expect(backend.ws.getClientCount()).toBe(1);

      // Disconnect client
      backend.ws.disconnect('test-client');
      expect(backend.ws.getClientCount()).toBe(0);

      await backend.stop();
    });

    it('should broadcast messages to all clients', async () => {
      const backend = new MockBackend();
      await backend.start();

      // Connect multiple clients
      await backend.ws.connect('client-1');
      await backend.ws.connect('client-2');
      await backend.ws.connect('client-3');

      // Broadcast message
      await backend.ws.broadcast('test-broadcast', { data: 'hello' });

      const history = backend.ws.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('test-broadcast');

      await backend.stop();
    });

    it('should send messages to specific clients', async () => {
      const backend = new MockBackend();
      await backend.start();

      await backend.ws.connect('client-1');
      await backend.ws.connect('client-2');

      // Send to specific client
      await backend.ws.sendTo('client-1', 'direct-message', { data: 'private' });

      const history = backend.ws.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('direct-message');

      await backend.stop();
    });
  });

  describe('API Integration', () => {
    it('should test API endpoints', async () => {
      const backend = new MockBackend();
      await backend.start();

      const result = await IntegrationTestSuite.testApiEndpoints(backend);

      expect(result.name).toBe('API Endpoints');
      expect(result.passed).toBe(true);

      await backend.stop();
    });

    it('should test GET requests', async () => {
      const backend = new MockBackend();
      await backend.start();

      const response = await backend.api.request('GET', '/api/spreadsheets/1');

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      await backend.stop();
    });

    it('should test PUT requests', async () => {
      const backend = new MockBackend();
      await backend.start();

      const response = await backend.api.request('PUT', '/api/cells/A1', {
        value: 'test-value'
      });

      expect(response.status).toBe(200);
      expect(response.data.value).toBe('test-value');

      await backend.stop();
    });

    it('should test POST requests', async () => {
      const backend = new MockBackend();
      await backend.start();

      const response = await backend.api.request('POST', '/api/cells/batch', {
        cells: [
          { id: 'A1', value: 1 },
          { id: 'A2', value: 2 }
        ]
      });

      expect(response.status).toBe(200);
      expect(response.data.updated).toBe(2);

      await backend.stop();
    });

    it('should handle 404 errors', async () => {
      const backend = new MockBackend();
      await backend.start();

      const response = await backend.api.request('GET', '/api/nonexistent');

      expect(response.status).toBe(404);
      expect(response.data.error).toContain('Not found');

      await backend.stop();
    });

    it('should test error handling', async () => {
      const backend = new MockBackend();
      await backend.start();

      const result = await IntegrationTestSuite.testApiErrorHandling(backend);

      expect(result.name).toBe('API Error Handling');
      expect(result.passed).toBe(true);

      await backend.stop();
    });
  });

  describe('Cache Integration', () => {
    it('should test cache layer', async () => {
      const backend = new MockBackend();
      await backend.start();

      const result = await IntegrationTestSuite.testCacheLayer(backend);

      expect(result.name).toBe('Cache Layer');
      expect(result.passed).toBe(true);

      await backend.stop();
    });

    it('should set and get cache entries', async () => {
      const backend = new MockBackend();
      await backend.start();

      backend.cache.set('test-key', { data: 'test-value' });
      const value = backend.cache.get('test-key');

      expect(value).toEqual({ data: 'test-value' });

      await backend.stop();
    });

    it('should track cache statistics', async () => {
      const backend = new MockBackend();
      await backend.start();

      backend.cache.set('key1', 'value1');
      backend.cache.get('key1'); // hit
      backend.cache.get('key2'); // miss

      const stats = backend.cache.getStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);

      await backend.stop();
    });

    it('should respect cache TTL', async () => {
      const backend = new MockBackend();
      await backend.start();

      // Set entry with short TTL
      backend.cache.set('temp-key', 'temp-value', 100);

      // Should be available immediately
      expect(backend.cache.get('temp-key')).toBe('temp-value');

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(backend.cache.get('temp-key')).toBeNull();

      await backend.stop();
    });
  });

  describe('Comprehensive Suite', () => {
    it('should run all integration tests', async () => {
      const results = await IntegrationTestSuite.runAll();

      expect(results.length).toBeGreaterThan(5);

      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed).length;

      expect(passed).toBeGreaterThan(0);
      expect(failed).toBe(0);
    }, 60000); // 60 second timeout

    it('should generate integration test report', async () => {
      await IntegrationTestSuite.runAll();
      const report = IntegrationTestSuite.generateReport();

      expect(report).toContain('INTEGRATION TEST REPORT');
      expect(report).toContain('Total Tests');
      expect(report).toContain('Passed');
      expect(report).toContain('Failed');
    });
  });

  describe('Data Management Integration', () => {
    it('should use test data in integration tests', async () => {
      const spreadsheet = TestDataManager.generateSpreadsheet({
        name: 'Integration Test',
        rows: 10,
        columns: 5
      });

      expect(spreadsheet.cells).toBeDefined();
      expect(Object.keys(spreadsheet.cells).length).toBe(50);
    });

    it('should use template data in integration tests', async () => {
      const template = TestDataManager.createFinancialSpreadsheet();

      expect(template.data.cells).toBeDefined();
      expect(template.metadata.category).toBe('financial');
    });

    it('should use edge case data in integration tests', async () => {
      const edgeCases = TestDataManager.generateEdgeCases();

      expect(edgeCases.emptyCells).toBeDefined();
      expect(edgeCases.circularReferences).toBeDefined();
      expect(edgeCases.longFormulas).toBeDefined();
      expect(edgeCases.deepDependencies).toBeDefined();
      expect(edgeCases.mixedTypes).toBeDefined();
    });
  });

  describe('Performance Integration', () => {
    it('should test performance under load', async () => {
      const backend = new MockBackend();
      await backend.start();

      // Generate load
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(backend.api.request('GET', '/api/spreadsheets/1'));
      }

      const results = await Promise.all(requests);

      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      await backend.stop();
    });

    it('should handle concurrent operations', async () => {
      const backend = new MockBackend();
      await backend.start();

      // Simulate concurrent users
      const users = Array.from({ length: 10 }, (_, i) => `user-${i}`);

      const operations = users.map(async userId => {
        await backend.ws.connect(userId);
        await backend.ws.sendTo(userId, 'update', { value: userId });
      });

      await Promise.all(operations);

      expect(backend.ws.getClientCount()).toBe(10);

      await backend.stop();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from errors', async () => {
      const backend = new MockBackend({
        errorRate: 0.1 // 10% error rate
      });
      await backend.start();

      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(backend.api.request('GET', '/api/spreadsheets/1'));
      }

      const results = await Promise.all(requests);

      const successful = results.filter(r => r.status === 200).length;
      const failed = results.filter(r => r.status === 500).length;

      expect(successful + failed).toBe(50);
      expect(successful).toBeGreaterThan(0);

      await backend.stop();
    });

    it('should handle backend restart', async () => {
      const backend = new MockBackend();
      await backend.start();

      // Perform operations
      await backend.api.request('GET', '/api/spreadsheets/1');

      // Stop and restart
      await backend.stop();
      await backend.start();

      // Should work after restart
      const response = await backend.api.request('GET', '/api/spreadsheets/1');
      expect(response.status).toBe(200);

      await backend.stop();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should simulate team collaboration', async () => {
      const users = [
        { id: 'alice', name: 'Alice', permissions: ['read', 'write'] },
        { id: 'bob', name: 'Bob', permissions: ['read', 'write'] },
        { id: 'charlie', name: 'Charlie', permissions: ['read'] },
        { id: 'diana', name: 'Diana', permissions: ['read', 'write', 'admin'] }
      ];

      const session = await IntegrationTestSuite.setupCollaboration(
        users,
        'team-spreadsheet'
      );

      // Simulate team editing
      const edits = users
        .filter(u => u.permissions.includes('write'))
        .map(user =>
          session.backend.ws.sendTo(user.id, 'cell-edit', {
            cellId: 'A1',
            value: `Edited by ${user.name}`
          })
        );

      await Promise.all(edits);

      const history = session.backend.ws.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    it('should simulate large dataset operations', async () => {
      const largeData = TestDataManager.generatePerformanceData({
        size: 'large',
        complexity: 'complex',
        includeDependencies: true,
        includeFormulas: true
      });

      expect(largeData.cellCount).toBe(100000);
      expect(largeData.dependencyCount).toBeGreaterThan(0);
      expect(largeData.formulaCount).toBeGreaterThan(0);
    });
  });
});
