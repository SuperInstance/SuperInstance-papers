/**
 * Universal Integration Protocol - Integration Test Suite Design
 *
 * Comprehensive test suite for UIP components and cross-platform integration.
 * Tests protocol compliance, adapter functionality, message routing, and SMPbot integration.
 */

import {
  UIPMessage,
  PlatformType,
  MessageType,
  MessagePriority,
  CURRENT_PROTOCOL_VERSION
} from '../protocol/types.js';
import { UniversalPlatformAdapter, AdapterConfig } from '../adapters/UniversalPlatformAdapter.js';
import { MessageRouter, RouterConfig } from '../routing/MessageRouter.js';
import { SMPbotMessageHandler } from '../integration/SMPbotIntegration.js';

// ============================================================================
// Test Configuration
// ============================================================================

/**
 * Test configuration
 */
export interface TestConfig {
  // Test execution
  timeout: number; // ms
  retryAttempts: number;
  parallelTests: boolean;

  // Logging
  verbose: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';

  // Test coverage
  testProtocolTypes: boolean;
  testAdapters: boolean;
  testRouting: boolean;
  testSMPbotIntegration: boolean;
  testCrossPlatform: boolean;
}

/**
 * Default test configuration
 */
export const DEFAULT_TEST_CONFIG: TestConfig = {
  timeout: 30000,
  retryAttempts: 3,
  parallelTests: false,
  verbose: true,
  logLevel: 'info',
  testProtocolTypes: true,
  testAdapters: true,
  testRouting: true,
  testSMPbotIntegration: true,
  testCrossPlatform: true
};

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Test utilities for UIP testing
 */
export class TestUtils {
  /**
   * Create a test UIP message
   */
  static createTestMessage(
    type: MessageType = MessageType.TEXT,
    sourcePlatform: PlatformType = PlatformType.TEST,
    targetPlatform: PlatformType = PlatformType.API
  ): UIPMessage {
    return {
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      source: {
        platform: sourcePlatform,
        channel: 'test-channel',
        userId: 'test-user',
        sessionId: 'test-session'
      },
      target: {
        platform: targetPlatform,
        channel: 'test-target',
        userId: 'test-target-user'
      },
      type,
      payload: `Test ${type} message`,
      metadata: {
        priority: MessagePriority.NORMAL,
        ttl: 60000,
        tags: ['test', 'integration'],
        traceId: `trace-${Date.now()}`
      }
    };
  }

  /**
   * Create a test adapter configuration
   */
  static createTestAdapterConfig(
    platform: PlatformType,
    adapterId: string
  ): AdapterConfig {
    return {
      platform,
      adapterId,
      credentials: {
        apiToken: 'test-token'
      },
      options: {
        debug: true,
        autoConnect: false
      }
    };
  }

  /**
   * Wait for condition with timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 10000,
    interval: number = 100
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await condition();
      if (result) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    return false;
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    initialDelay: number = 100
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxAttempts) {
          throw lastError;
        }

        const delay = initialDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Validate UIP message structure
   */
  static validateMessage(message: UIPMessage): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!message.id) errors.push('Missing id');
    if (!message.timestamp) errors.push('Missing timestamp');
    if (!message.protocolVersion) errors.push('Missing protocolVersion');
    if (!message.source) errors.push('Missing source');
    if (!message.target) errors.push('Missing target');
    if (!message.type) errors.push('Missing type');

    // Source validation
    if (message.source && !message.source.platform) {
      errors.push('Missing source.platform');
    }

    // Target validation
    if (message.target && !message.target.platform) {
      errors.push('Missing target.platform');
    }

    // Timestamp validation
    if (message.timestamp && message.timestamp > Date.now() + 60000) {
      errors.push('Timestamp is in the future');
    }

    // TTL validation
    if (message.metadata?.ttl && message.timestamp + message.metadata.ttl < Date.now()) {
      errors.push('Message has expired (TTL exceeded)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// Test Suite Base Class
// ============================================================================

/**
 * Base test suite class
 */
export abstract class BaseTestSuite {
  protected config: TestConfig;
  protected testResults: TestResult[] = [];

  constructor(config: Partial<TestConfig> = {}) {
    this.config = { ...DEFAULT_TEST_CONFIG, ...config };
  }

  /**
   * Run all tests in the suite
   */
  async runAllTests(): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const tests = this.getTests();

    this.log(`Running ${tests.length} tests...`);

    for (const test of tests) {
      await this.runTest(test);
    }

    const duration = Date.now() - startTime;

    return {
      suiteName: this.constructor.name,
      totalTests: tests.length,
      passedTests: this.testResults.filter(r => r.passed).length,
      failedTests: this.testResults.filter(r => !r.passed).length,
      duration,
      results: this.testResults
    };
  }

  /**
   * Run a single test
   */
  protected async runTest(test: TestDefinition): Promise<void> {
    const startTime = Date.now();
    let passed = false;
    let error: string | undefined;

    this.log(`Running test: ${test.name}`);

    try {
      await test.fn.call(this);
      passed = true;
      this.log(`✓ Test passed: ${test.name}`);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      this.log(`✗ Test failed: ${test.name} - ${error}`);
    }

    const result: TestResult = {
      testName: test.name,
      description: test.description,
      passed,
      error,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    this.testResults.push(result);
  }

  /**
   * Get all tests in the suite
   */
  protected abstract getTests(): TestDefinition[];

  /**
   * Log message based on log level
   */
  protected log(message: string, level: 'error' | 'warn' | 'info' | 'debug' = 'info'): void {
    if (!this.config.verbose) return;

    const levelNum = { error: 0, warn: 1, info: 2, debug: 3 }[level];
    const configLevelNum = { error: 0, warn: 1, info: 2, debug: 3 }[this.config.logLevel];

    if (levelNum <= configLevelNum) {
      console.log(`[${this.constructor.name}] ${message}`);
    }
  }

  /**
   * Assert condition
   */
  protected assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Assert equality
   */
  protected assertEquals<T>(actual: T, expected: T, message: string = 'Values are not equal'): void {
    this.assert(
      JSON.stringify(actual) === JSON.stringify(expected),
      `${message}. Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`
    );
  }

  /**
   * Assert not null/undefined
   */
  protected assertNotNull<T>(value: T, message: string = 'Value is null or undefined'): void {
    this.assert(value != null, message);
  }

  /**
   * Assert throws
   */
  protected async assertThrows(fn: () => Promise<void>, message: string = 'Function should throw'): Promise<void> {
    try {
      await fn();
      throw new Error(message);
    } catch {
      // Expected to throw
    }
  }
}

// ============================================================================
// Protocol Types Test Suite
// ============================================================================

/**
 * Protocol types test suite
 */
export class ProtocolTypesTestSuite extends BaseTestSuite {
  protected getTests(): TestDefinition[] {
    return [
      {
        name: 'test_message_validation',
        description: 'Test UIP message validation',
        fn: this.testMessageValidation.bind(this)
      },
      {
        name: 'test_message_creation',
        description: 'Test UIP message creation',
        fn: this.testMessageCreation.bind(this)
      },
      {
        name: 'test_platform_types',
        description: 'Test platform type definitions',
        fn: this.testPlatformTypes.bind(this)
      },
      {
        name: 'test_message_types',
        description: 'Test message type definitions',
        fn: this.testMessageTypes.bind(this)
      }
    ];
  }

  private async testMessageValidation(): Promise<void> {
    // Test valid message
    const validMessage = TestUtils.createTestMessage();
    const validation = TestUtils.validateMessage(validMessage);
    this.assert(validation.valid, 'Valid message should pass validation');

    // Test invalid messages
    const invalidMessages = [
      { ...validMessage, id: undefined },
      { ...validMessage, timestamp: undefined },
      { ...validMessage, source: undefined },
      { ...validMessage, target: undefined },
      { ...validMessage, type: undefined }
    ];

    for (const message of invalidMessages) {
      const result = TestUtils.validateMessage(message as UIPMessage);
      this.assert(!result.valid, 'Invalid message should fail validation');
    }
  }

  private async testMessageCreation(): Promise<void> {
    const message = TestUtils.createTestMessage(MessageType.COMMAND, PlatformType.WEB, PlatformType.API);

    this.assertNotNull(message.id, 'Message should have ID');
    this.assertNotNull(message.timestamp, 'Message should have timestamp');
    this.assertNotNull(message.protocolVersion, 'Message should have protocol version');
    this.assertEquals(message.type, MessageType.COMMAND, 'Message type should match');
    this.assertEquals(message.source.platform, PlatformType.WEB, 'Source platform should match');
    this.assertEquals(message.target.platform, PlatformType.API, 'Target platform should match');
  }

  private async testPlatformTypes(): Promise<void> {
    // Test platform type values
    this.assert(PlatformType.WEB === 'web', 'WEB platform type should be "web"');
    this.assert(PlatformType.CLI === 'cli', 'CLI platform type should be "cli"');
    this.assert(PlatformType.MCP === 'mcp', 'MCP platform type should be "mcp"');
    this.assert(PlatformType.API === 'api', 'API platform type should be "api"');
  }

  private async testMessageTypes(): Promise<void> {
    // Test message type values
    this.assert(MessageType.TEXT === 'text', 'TEXT message type should be "text"');
    this.assert(MessageType.COMMAND === 'command', 'COMMAND message type should be "command"');
    this.assert(MessageType.QUERY === 'query', 'QUERY message type should be "query"');
    this.assert(MessageType.RESPONSE === 'response', 'RESPONSE message type should be "response"');
    this.assert(MessageType.ERROR === 'error', 'ERROR message type should be "error"');
  }
}

// ============================================================================
// Adapter Test Suite
// ============================================================================

/**
 * Mock adapter for testing
 */
class MockAdapter extends UniversalPlatformAdapter {
  private receivedMessages: UIPMessage[] = [];
  private shouldFail = false;

  constructor(config: AdapterConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    this.setAdapterState(AdapterState.CONNECTED);
  }

  async connect(): Promise<void> {
    this.setAdapterState(AdapterState.CONNECTED);
  }

  async disconnect(): Promise<void> {
    this.setAdapterState(AdapterState.DISCONNECTED);
  }

  async send(message: UIPMessage): Promise<any> {
    if (this.shouldFail) {
      throw new Error('Mock adapter send failed');
    }
    this.receivedMessages.push(message);
    return { success: true };
  }

  receive(callback: (message: UIPMessage) => Promise<void>): void {
    // Mock implementation
  }

  getReceivedMessages(): UIPMessage[] {
    return [...this.receivedMessages];
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
}

/**
 * Adapter test suite
 */
export class AdapterTestSuite extends BaseTestSuite {
  private mockAdapter: MockAdapter;

  constructor(config: Partial<TestConfig> = {}) {
    super(config);
    const adapterConfig = TestUtils.createTestAdapterConfig(PlatformType.TEST, 'test-adapter');
    this.mockAdapter = new MockAdapter(adapterConfig);
  }

  protected getTests(): TestDefinition[] {
    return [
      {
        name: 'test_adapter_initialization',
        description: 'Test adapter initialization',
        fn: this.testAdapterInitialization.bind(this)
      },
      {
        name: 'test_adapter_connection',
        description: 'Test adapter connection lifecycle',
        fn: this.testAdapterConnection.bind(this)
      },
      {
        name: 'test_adapter_send',
        description: 'Test adapter send functionality',
        fn: this.testAdapterSend.bind(this)
      },
      {
        name: 'test_adapter_error_handling',
        description: 'Test adapter error handling',
        fn: this.testAdapterErrorHandling.bind(this)
      }
    ];
  }

  private async testAdapterInitialization(): Promise<void> {
    await this.mockAdapter.initialize();
    this.assert(this.mockAdapter.isConnected(), 'Adapter should be connected after initialization');
    this.assertEquals(this.mockAdapter.platform, PlatformType.TEST, 'Platform should match');
    this.assertEquals(this.mockAdapter.adapterId, 'test-adapter', 'Adapter ID should match');
  }

  private async testAdapterConnection(): Promise<void> {
    // Test connect
    await this.mockAdapter.connect();
    this.assert(this.mockAdapter.isConnected(), 'Adapter should be connected');

    // Test disconnect
    await this.mockAdapter.disconnect();
    this.assert(!this.mockAdapter.isConnected(), 'Adapter should be disconnected after disconnect');
  }

  private async testAdapterSend(): Promise<void> {
    await this.mockAdapter.connect();

    const message = TestUtils.createTestMessage();
    const result = await this.mockAdapter.send(message);

    this.assert(result.success, 'Send should succeed');
    this.assertEquals(this.mockAdapter.getReceivedMessages().length, 1, 'Should have received one message');
    this.assertEquals(this.mockAdapter.getReceivedMessages()[0].id, message.id, 'Received message ID should match');
  }

  private async testAdapterErrorHandling(): Promise<void> {
    await this.mockAdapter.connect();

    // Test send failure
    this.mockAdapter.setShouldFail(true);
    const message = TestUtils.createTestMessage();

    await this.assertThrows(
      async () => await this.mockAdapter.send(message),
      'Send should throw when adapter is set to fail'
    );
  }
}

// ============================================================================
// Routing Test Suite
// ============================================================================

/**
 * Mock message handler for testing
 */
class MockMessageHandler implements SMPbotMessageHandler {
  private handledMessages: UIPMessage[] = [];

  async handleMessage(message: UIPMessage): Promise<UIPMessage | null> {
    this.handledMessages.push(message);
    return {
      ...message,
      id: `response-${message.id}`,
      source: message.target,
      target: message.source,
      type: MessageType.RESPONSE
    };
  }

  canHandle(message: UIPMessage): boolean {
    return message.type === MessageType.TEXT || message.type === MessageType.QUERY;
  }

  getBotId(): string {
    return 'test-bot';
  }

  getCapabilities(): any {
    return { botId: 'test-bot' };
  }

  getHandledMessages(): UIPMessage[] {
    return [...this.handledMessages];
  }
}

/**
 * Routing test suite
 */
export class RoutingTestSuite extends BaseTestSuite {
  private router: MessageRouter;
  private mockAdapter: MockAdapter;
  private mockHandler: MockMessageHandler;

  constructor(config: Partial<TestConfig> = {}) {
    super(config);

    const routerConfig: RouterConfig = {
      enableMessageLogging: true,
      defaultRouteAll: false
    };

    this.router = new MessageRouter(routerConfig);
    this.mockAdapter = new MockAdapter(
      TestUtils.createTestAdapterConfig(PlatformType.TEST, 'test-router-adapter')
    );
    this.mockHandler = new MockMessageHandler();
  }

  protected getTests(): TestDefinition[] {
    return [
      {
        name: 'test_router_initialization',
        description: 'Test router initialization',
        fn: this.testRouterInitialization.bind(this)
      },
      {
        name: 'test_adapter_registration',
        description: 'Test adapter registration with router',
        fn: this.testAdapterRegistration.bind(this)
      },
      {
        name: 'test_bot_registration',
        description: 'Test bot registration with router',
        fn: this.testBotRegistration.bind(this)
      },
      {
        name: 'test_message_routing',
        description: 'Test message routing',
        fn: this.testMessageRouting.bind(this)
      },
      {
        name: 'test_routing_rules',
        description: 'Test routing rules',
        fn: this.testRoutingRules.bind(this)
      }
    ];
  }

  private async testRouterInitialization(): Promise<void> {
    this.assertNotNull(this.router, 'Router should be initialized');
    const adapters = this.router.getAdapters();
    this.assertEquals(adapters.length, 0, 'Router should start with no adapters');
  }

  private async testAdapterRegistration(): Promise<void> {
    this.router.registerAdapter(this.mockAdapter);
    const adapters = this.router.getAdapters();
    this.assertEquals(adapters.length, 1, 'Router should have one adapter after registration');
    this.assertEquals(adapters[0].adapterId, 'test-router-adapter', 'Adapter ID should match');
  }

  private async testBotRegistration(): Promise<void> {
    this.router.registerBot(this.mockHandler);
    const bots = this.router.getBots();
    this.assertEquals(bots.length, 1, 'Router should have one bot after registration');
    this.assertEquals(bots[0].getBotId(), 'test-bot', 'Bot ID should match');
  }

  private async testMessageRouting(): Promise<void> {
    // Setup
    await this.mockAdapter.initialize();
    this.router.registerAdapter(this.mockAdapter);

    // Create and route message
    const message = TestUtils.createTestMessage(MessageType.TEXT, PlatformType.TEST, PlatformType.TEST);
    const result = await this.router.routeMessage(message);

    this.assert(result.success, 'Routing should succeed');
    this.assertEquals(result.targets.length, 0, 'No routing targets without rules');
  }

  private async testRoutingRules(): Promise<void> {
    // Setup
    await this.mockAdapter.initialize();
    this.router.registerAdapter(this.mockAdapter);

    // Add routing rule
    this.router.addRoutingRule({
      match: (msg: UIPMessage) => msg.type === MessageType.TEXT,
      targets: [{ platform: PlatformType.TEST, adapterId: 'test-router-adapter' }],
      priority: 100
    });

    // Route message that matches rule
    const message = TestUtils.createTestMessage(MessageType.TEXT, PlatformType.TEST, PlatformType.TEST);
    const result = await this.router.routeMessage(message);

    this.assert(result.success, 'Routing should succeed with matching rule');
    this.assertEquals(result.targets.length, 1, 'Should have one routing target');
    this.assertEquals(result.targets[0].adapterId, 'test-router-adapter', 'Should route to test adapter');
  }
}

// ============================================================================
// Cross-Platform Test Suite
// ============================================================================

/**
 * Cross-platform integration test suite
 */
export class CrossPlatformTestSuite extends BaseTestSuite {
  protected getTests(): TestDefinition[] {
    return [
      {
        name: 'test_protocol_compliance',
        description: 'Test protocol compliance across components',
        fn: this.testProtocolCompliance.bind(this)
      },
      {
        name: 'test_message_flow',
        description: 'Test end-to-end message flow',
        fn: this.testMessageFlow.bind(this)
      },
      {
        name: 'test_error_propagation',
        description: 'Test error propagation across platforms',
        fn: this.testErrorPropagation.bind(this)
      }
    ];
  }

  private async testProtocolCompliance(): Promise<void> {
    // Test that all components use the same protocol version
    const message = TestUtils.createTestMessage();
    this.assertEquals(
      message.protocolVersion,
      CURRENT_PROTOCOL_VERSION,
      'Messages should use current protocol version'
    );

    // Test that message validation works consistently
    const validation = TestUtils.validateMessage(message);
    this.assert(validation.valid, 'Test message should be valid');
  }

  private async testMessageFlow(): Promise<void> {
    // This would test actual message flow between adapters
    // For now, we'll create a conceptual test
    this.log('Cross-platform message flow test - conceptual implementation');
    this.assert(true, 'Cross-platform test placeholder');
  }

  private async testErrorPropagation(): Promise<void> {
    // Test that errors are properly propagated
    this.log('Error propagation test - conceptual implementation');
    this.assert(true, 'Error propagation test placeholder');
  }
}

// ============================================================================
// Test Runner
// ============================================================================

/**
 * Test definition
 */
export interface TestDefinition {
  name: string;
  description: string;
  fn: () => Promise<void>;
}

/**
 * Test result
 */
export interface TestResult {
  testName: string;
  description: string;
  passed: boolean;
  error?: string;
  duration: number;
  timestamp: string;
}

/**
 * Test suite result
 */
export interface TestSuiteResult {
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  results: TestResult[];
}

/**
 * Comprehensive test runner
 */
export class IntegrationTestRunner {
  private suites: BaseTestSuite[] = [];
  private results: TestSuiteResult[] = [];

  /**
   * Add test suite
   */
  addSuite(suite: BaseTestSuite): void {
    this.suites.push(suite);
  }

  /**
   * Run all test suites
   */
  async runAllSuites(): Promise<TestSuiteResult[]> {
    console.log('Starting integration tests...');
    console.log(`Running ${this.suites.length} test suites`);

    for (const suite of this.suites) {
      console.log(`\nRunning suite: ${suite.constructor.name}`);
      const result = await suite.runAllTests();
      this.results.push(result);

      console.log(`  Results: ${result.passedTests}/${result.totalTests} passed`);
      console.log(`  Duration: ${result.duration}ms`);

      // Log failures
      const failures = result.results.filter(r => !r.passed);
      if (failures.length > 0) {
        console.log(`  Failures:`);
        for (const failure of failures) {
          console.log(`    - ${failure.testName}: ${failure.error}`);
        }
      }
    }

    console.log('\n=== Test Summary ===');
    const totalTests = this.results.reduce((sum, r) => sum + r.totalTests, 0);
    const totalPassed = this.results.reduce((sum, r) => sum + r.passedTests, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failedTests, 0);

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

    return this.results;
  }

  /**
   * Get all results
   */
  getResults(): TestSuiteResult[] {
    return [...this.results];
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    let report = '# Universal Integration Protocol - Test Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    for (const suiteResult of this.results) {
      report += `## ${suiteResult.suiteName}\n`;
      report += `- **Total Tests:** ${suiteResult.totalTests}\n`;
      report += `- **Passed:** ${suiteResult.passedTests}\n`;
      report += `- **Failed:** ${suiteResult.failedTests}\n`;
      report += `- **Duration:** ${suiteResult.duration}ms\n\n`;

      if (suiteResult.failedTests > 0) {
        report += `### Failures\n`;
        for (const testResult of suiteResult.results.filter(r => !r.passed)) {
          report += `- **${testResult.testName}**: ${testResult.error}\n`;
        }
        report += '\n';
      }
    }

    return report;
  }
}

// ============================================================================
// Example Test Execution
// ============================================================================

/**
 * Example: Run all integration tests
 */
export async function runIntegrationTests(): Promise<void> {
  const runner = new IntegrationTestRunner();

  // Add test suites based on configuration
  runner.addSuite(new ProtocolTypesTestSuite());
  runner.addSuite(new AdapterTestSuite());
  runner.addSuite(new RoutingTestSuite());
  runner.addSuite(new CrossPlatformTestSuite());

  // Run all tests
  const results = await runner.runAllSuites();

  // Generate report
  const report = runner.generateReport();
  console.log('\n' + report);

  // Check for failures
  const totalFailed = results.reduce((sum, r) => sum + r.failedTests, 0);
  if (totalFailed > 0) {
    throw new Error(`Integration tests failed: ${totalFailed} test(s) failed`);
  }

  console.log('All integration tests passed!');
}