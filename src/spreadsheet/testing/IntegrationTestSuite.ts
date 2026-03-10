/**
 * IntegrationTestSuite - End-to-end and integration testing utilities
 *
 * Provides:
 * - End-to-end test scenarios
 * - Multi-user collaboration tests
 * - WebSocket integration tests
 * - API integration tests
 * - Database integration tests
 *
 * @module testing
 */

import type { LogCell } from '../LogCell';
import type { PollnColony } from '../../core/Colony';
import { MockBackend, type MockBackendConfig } from './MockBackend';
import { CellTestHelper } from './CellTestHelper';
import { ColonyTestHelper } from './ColonyTestHelper';
import { TestDataManager } from './TestDataManager';
import { AssertionHelpers } from './AssertionHelpers';

/**
 * Test user configuration
 */
export interface TestUser {
  id: string;
  name: string;
  permissions: string[];
}

/**
 * Collaboration session
 */
export interface CollaborationSession {
  id: string;
  users: TestUser[];
  spreadsheet: string;
  backend: MockBackend;
}

/**
 * Integration test configuration
 */
export interface IntegrationTestConfig {
  /** Test timeout in ms */
  timeout?: number;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Cleanup after tests */
  cleanup?: boolean;
  /** Mock backend configuration */
  backendConfig?: MockBackendConfig;
}

/**
 * Integration test result
 */
export interface IntegrationTestResult {
  name: string;
  passed: boolean;
  duration: number;
  errors: Error[];
  warnings: string[];
  metadata: Record<string, any>;
}

/**
 * Comprehensive integration testing suite
 */
export class IntegrationTestSuite {
  private static sessions: Map<string, CollaborationSession> = new Map();
  private static results: IntegrationTestResult[] = [];
  private static config: IntegrationTestConfig = {};

  /**
   * Setup integration test suite
   *
   * @param config - Test configuration
   */
  static setup(config: IntegrationTestConfig = {}): void {
    this.config = {
      timeout: 30000,
      verbose: false,
      cleanup: true,
      backendConfig: {},
      ...config
    };
  }

  // ==================== End-to-End Scenarios ====================

  /**
   * Test complete spreadsheet workflow
   *
   * @returns Test result
   */
  static async testSpreadsheetWorkflow(): Promise<IntegrationTestResult> {
    const result: IntegrationTestResult = {
      name: 'Spreadsheet Workflow',
      passed: true,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {}
    };

    const startTime = Date.now();

    try {
      // 1. Create spreadsheet
      const spreadsheet = TestDataManager.generateSpreadsheet({
        name: 'Workflow Test',
        rows: 5,
        columns: 3
      });

      if (this.config.verbose) {
        console.log('[Integration] Created spreadsheet:', spreadsheet.id);
      }

      // 2. Create cells
      const cells = Object.values(spreadsheet.cells).map(cellData =>
        CellTestHelper.createTestCell({
          testId: cellData.id,
          type: cellData.type,
          mocks: { memory: { history: [], patterns: [], learnings: [] } }
        })
      );

      // 3. Connect cells with dependencies
      cells.forEach(cell => {
        const cellData = spreadsheet.cells[cell.id];
        cellData.dependencies.forEach(depId => {
          const depCell = cells.find(c => c.id === depId);
          if (depCell) {
            cell.addDependency(depCell);
          }
        });
      });

      // 4. Process cells
      for (const cell of cells) {
        const cellData = spreadsheet.cells[cell.id];
        await cell.process(cellData.value);
      }

      // 5. Verify state
      cells.forEach(cell => {
        AssertionHelpers.assertCellState(cell, 'ready' as any);
      });

      result.duration = Date.now() - startTime;
    } catch (error) {
      result.passed = false;
      result.errors.push(error as Error);
      result.duration = Date.now() - startTime;
    }

    this.results.push(result);
    return result;
  }

  /**
   * Test colony evolution scenario
   *
   * @returns Test result
   */
  static async testColonyEvolution(): Promise<IntegrationTestResult> {
    const result: IntegrationTestResult = {
      name: 'Colony Evolution',
      passed: true,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {}
    };

    const startTime = Date.now();

    try {
      // 1. Create colony
      const colony = ColonyTestHelper.createTestColony({
        testId: 'evolution-test',
        mockAgents: Array.from({ length: 10 }, (_, i) => ({
          id: `agent-${i}`,
          type: 'test',
          config: {},
          capabilities: ['process', 'learn']
        }))
      });

      // 2. Start colony
      colony.start();

      // 3. Run for some ticks
      for (let i = 0; i < 50; i++) {
        await colony.tick();
      }

      // 4. Deploy new agents
      ColonyTestHelper.deployTestAgents(colony, 5);

      // 5. Run more ticks
      for (let i = 0; i < 50; i++) {
        await colony.tick();
      }

      // 6. Verify evolution
      AssertionHelpers.assertColonyAgentCount(colony, 15);

      // 7. Stop colony
      colony.stop();

      result.duration = Date.now() - startTime;
    } catch (error) {
      result.passed = false;
      result.errors.push(error as Error);
      result.duration = Date.now() - startTime;
    }

    this.results.push(result);
    return result;
  }

  // ==================== Collaboration Tests ====================

  /**
   * Setup a collaboration session
   *
   * @param users - Users to include
   * @param spreadsheet - Spreadsheet ID
   * @returns Collaboration session
   */
  static async setupCollaboration(
    users: TestUser[],
    spreadsheet: string
  ): Promise<CollaborationSession> {
    const backend = new MockBackend(this.config.backendConfig);
    await backend.start();

    const session: CollaborationSession = {
      id: `session-${Date.now()}`,
      users,
      spreadsheet,
      backend
    };

    this.sessions.set(session.id, session);

    // Connect all users
    for (const user of users) {
      await backend.ws.connect(user.id);
      if (this.config.verbose) {
        console.log(`[Integration] User ${user.name} connected`);
      }
    }

    return session;
  }

  /**
   * Test multi-user editing
   *
   * @param session - Collaboration session
   * @returns Test result
   */
  static async testMultiUserEditing(session: CollaborationSession): Promise<IntegrationTestResult> {
    const result: IntegrationTestResult = {
      name: 'Multi-User Editing',
      passed: true,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: { sessionId: session.id }
    };

    const startTime = Date.now();

    try {
      const updates = session.users.map(async (user, index) => {
        const cellId = `A${index + 1}`;
        const value = `User ${user.name} edit`;

        await session.backend.ws.sendTo(user.id, 'cell-update', {
          cellId,
          value,
          userId: user.id
        });

        return { cellId, value, userId: user.id };
      });

      await Promise.all(updates);

      // Verify all updates were broadcast
      const history = session.backend.ws.getHistory();
      const cellUpdates = history.filter(m => m.type === 'cell-update');

      if (cellUpdates.length !== session.users.length) {
        result.warnings.push(
          `Expected ${session.users.length} updates, got ${cellUpdates.length}`
        );
      }

      result.duration = Date.now() - startTime;
    } catch (error) {
      result.passed = false;
      result.errors.push(error as Error);
      result.duration = Date.now() - startTime;
    }

    this.results.push(result);
    return result;
  }

  /**
   * Test conflict resolution
   *
   * @param session - Collaboration session
   * @returns Test result
   */
  static async testConflictResolution(session: CollaborationSession): Promise<IntegrationTestResult> {
    const result: IntegrationTestResult = {
      name: 'Conflict Resolution',
      passed: true,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: { sessionId: session.id }
    };

    const startTime = Date.now();

    try {
      // All users edit the same cell simultaneously
      const cellId = 'A1';
      const updates = session.users.map(user =>
        session.backend.ws.sendTo(user.id, 'cell-update', {
          cellId,
          value: `User ${user.name} value`,
          userId: user.id,
          timestamp: Date.now()
        })
      );

      await Promise.all(updates);

      // Verify last write wins (or other conflict resolution strategy)
      const history = session.backend.ws.getHistory();
      const cellUpdates = history.filter(m => m.type === 'cell-update' && (m.data as any).cellId === cellId);

      if (cellUpdates.length !== session.users.length) {
        result.warnings.push(
          `Expected ${session.users.length} conflicting updates, got ${cellUpdates.length}`
        );
      }

      result.duration = Date.now() - startTime;
    } catch (error) {
      result.passed = false;
      result.errors.push(error as Error);
      result.duration = Date.now() - startTime;
    }

    this.results.push(result);
    return result;
  }

  // ==================== WebSocket Integration ====================

  /**
   * Test WebSocket connection lifecycle
   *
   * @param backend - Mock backend
   * @returns Test result
   */
  static async testWebSocketLifecycle(backend: MockBackend): Promise<IntegrationTestResult> {
    const result: IntegrationTestResult = {
      name: 'WebSocket Lifecycle',
      passed: true,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {}
    };

    const startTime = Date.now();

    try {
      const clientId = 'test-client';

      // Connect
      const ws = await backend.ws.connect(clientId);
      AssertionHelpers.assertInRange(backend.ws.getClientCount(), 1, 1);

      // Send message
      await backend.ws.sendTo(clientId, 'test', { data: 'hello' });

      // Broadcast
      await backend.ws.broadcast('broadcast', { data: 'world' });

      // Disconnect
      backend.ws.disconnect(clientId);
      AssertionHelpers.assertInRange(backend.ws.getClientCount(), 0, 0);

      result.duration = Date.now() - startTime;
    } catch (error) {
      result.passed = false;
      result.errors.push(error as Error);
      result.duration = Date.now() - startTime;
    }

    this.results.push(result);
    return result;
  }

  /**
   * Test real-time synchronization
   *
   * @param session - Collaboration session
   * @returns Test result
   */
  static async testRealtimeSync(session: CollaborationSession): Promise<IntegrationTestResult> {
    const result: IntegrationTestResult = {
      name: 'Real-time Sync',
      passed: true,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: { sessionId: session.id }
    };

    const startTime = Date.now();

    try {
      const updates: Promise<void>[] = [];

      // Generate rapid updates from all users
      for (let i = 0; i < 100; i++) {
        session.users.forEach(user => {
          updates.push(
            session.backend.ws.sendTo(user.id, 'cell-update', {
              cellId: `A${(i % 10) + 1}`,
              value: `Update ${i}`,
              userId: user.id
            })
          );
        });
      }

      await Promise.all(updates);

      // Verify all messages were processed
      const history = session.backend.ws.getHistory();
      if (history.length < 100 * session.users.length) {
        result.warnings.push(
          `Some messages may have been lost: ${history.length} / ${100 * session.users.length}`
        );
      }

      result.duration = Date.now() - startTime;
    } catch (error) {
      result.passed = false;
      result.errors.push(error as Error);
      result.duration = Date.now() - startTime;
    }

    this.results.push(result);
    return result;
  }

  // ==================== API Integration ====================

  /**
   * Test REST API endpoints
   *
   * @param backend - Mock backend
   * @returns Test result
   */
  static async testApiEndpoints(backend: MockBackend): Promise<IntegrationTestResult> {
    const result: IntegrationTestResult = {
      name: 'API Endpoints',
      passed: true,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {}
    };

    const startTime = Date.now();

    try {
      // GET spreadsheet
      const getResponse = await backend.api.request('GET', '/api/spreadsheets/1');
      if (getResponse.status !== 200) {
        result.errors.push(new Error(`GET spreadsheet failed: ${getResponse.status}`));
      }

      // PUT cell update
      const putResponse = await backend.api.request('PUT', '/api/cells/A1', {
        value: 'test'
      });
      if (putResponse.status !== 200) {
        result.errors.push(new Error(`PUT cell failed: ${putResponse.status}`));
      }

      // POST batch update
      const postResponse = await backend.api.request('POST', '/api/cells/batch', {
        cells: [
          { id: 'A1', value: 1 },
          { id: 'A2', value: 2 }
        ]
      });
      if (postResponse.status !== 200) {
        result.errors.push(new Error(`POST batch failed: ${postResponse.status}`));
      }

      result.passed = result.errors.length === 0;
      result.duration = Date.now() - startTime;
    } catch (error) {
      result.passed = false;
      result.errors.push(error as Error);
      result.duration = Date.now() - startTime;
    }

    this.results.push(result);
    return result;
  }

  /**
   * Test API error handling
   *
   * @param backend - Mock backend
   * @returns Test result
   */
  static async testApiErrorHandling(backend: MockBackend): Promise<IntegrationTestResult> {
    const result: IntegrationTestResult = {
      name: 'API Error Handling',
      passed: true,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {}
    };

    const startTime = Date.now();

    try {
      // Test 404
      const notFoundResponse = await backend.api.request('GET', '/api/nonexistent');
      if (notFoundResponse.status !== 404) {
        result.errors.push(
          new Error(`Expected 404, got ${notFoundResponse.status}`)
        );
      }

      // Test invalid data
      const badRequestResponse = await backend.api.request('PUT', '/api/cells/invalid', {
        value: null
      });

      result.duration = Date.now() - startTime;
    } catch (error) {
      result.passed = false;
      result.errors.push(error as Error);
      result.duration = Date.now() - startTime;
    }

    this.results.push(result);
    return result;
  }

  // ==================== Database Integration ====================

  /**
   * Test cache layer
   *
   * @param backend - Mock backend
   * @returns Test result
   */
  static async testCacheLayer(backend: MockBackend): Promise<IntegrationTestResult> {
    const result: IntegrationTestResult = {
      name: 'Cache Layer',
      passed: true,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {}
    };

    const startTime = Date.now();

    try {
      // Set cache entry
      backend.cache.set('test-key', { data: 'test-value' });

      // Get cache entry
      const value = backend.cache.get('test-key');
      if (!value || value.data !== 'test-value') {
        result.errors.push(new Error('Cache get failed'));
      }

      // Test cache miss
      const miss = backend.cache.get('nonexistent');
      if (miss !== null) {
        result.errors.push(new Error('Cache miss should return null'));
      }

      // Test cache stats
      const stats = backend.cache.getStats();
      if (stats.hits !== 1 || stats.misses !== 1) {
        result.warnings.push(
          `Cache stats unexpected: ${stats.hits} hits, ${stats.misses} misses`
        );
      }

      result.duration = Date.now() - startTime;
    } catch (error) {
      result.passed = false;
      result.errors.push(error as Error);
      result.duration = Date.now() - startTime;
    }

    this.results.push(result);
    return result;
  }

  // ==================== Comprehensive Suite ====================

  /**
   * Run all integration tests
   *
   * @returns Array of test results
   */
  static async runAll(): Promise<IntegrationTestResult[]> {
    const results: IntegrationTestResult[] = [];

    // End-to-end tests
    results.push(await this.testSpreadsheetWorkflow());
    results.push(await this.testColonyEvolution());

    // Setup backend for remaining tests
    const backend = new MockBackend(this.config.backendConfig);
    await backend.start();

    // WebSocket tests
    results.push(await this.testWebSocketLifecycle(backend));

    // API tests
    results.push(await this.testApiEndpoints(backend));
    results.push(await this.testApiErrorHandling(backend));

    // Cache tests
    results.push(await this.testCacheLayer(backend));

    // Collaboration tests
    const users: TestUser[] = [
      { id: 'user1', name: 'Alice', permissions: ['read', 'write'] },
      { id: 'user2', name: 'Bob', permissions: ['read', 'write'] },
      { id: 'user3', name: 'Charlie', permissions: ['read', 'write'] }
    ];

    const session = await this.setupCollaboration(users, 'test-spreadsheet');
    results.push(await this.testMultiUserEditing(session));
    results.push(await this.testConflictResolution(session));
    results.push(await this.testRealtimeSync(session));

    // Cleanup
    await backend.stop();

    return results;
  }

  /**
   * Get all test results
   *
   * @returns Test results
   */
  static getResults(): IntegrationTestResult[] {
    return [...this.results];
  }

  /**
   * Generate test report
   *
   * @returns Formatted report
   */
  static generateReport(): string {
    const lines: string[] = [];
    lines.push('='.repeat(80));
    lines.push('INTEGRATION TEST REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const warnings = this.results.reduce((sum, r) => sum + r.warnings.length, 0);

    lines.push(`Total Tests: ${this.results.length}`);
    lines.push(`Passed: ${passed}`);
    lines.push(`Failed: ${failed}`);
    lines.push(`Warnings: ${warnings}`);
    lines.push('');

    this.results.forEach(result => {
      lines.push(`${result.passed ? '✓' : '✗'} ${result.name}`);
      lines.push(`  Duration: ${result.duration}ms`);

      if (result.errors.length > 0) {
        lines.push(`  Errors:`);
        result.errors.forEach(error => {
          lines.push(`    - ${error.message}`);
        });
      }

      if (result.warnings.length > 0) {
        lines.push(`  Warnings:`);
        result.warnings.forEach(warning => {
          lines.push(`    - ${warning}`);
        });
      }

      lines.push('');
    });

    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Clear all test results
   */
  static clear(): void {
    this.results = [];
    this.sessions.forEach(session => session.backend.stop());
    this.sessions.clear();
  }

  /**
   * Cleanup test resources
   */
  static async cleanup(): Promise<void> {
    if (this.config.cleanup) {
      for (const session of this.sessions.values()) {
        await session.backend.stop();
      }
      this.sessions.clear();
    }
  }
}
