# Fractured AI Boxes - Testing and Validation Framework

**Breakdown Engine Round 3 - Testing Research**

**Date**: 2026-03-08
**Status**: ✅ **RESEARCH COMPLETE**
**Decision**: **READY FOR IMPLEMENTATION**

---

## Executive Summary

This document specifies a comprehensive testing framework for Fractured AI Boxes that addresses the unique challenges of testing LLM-based, nondeterministic components. The framework provides:

1. **Multi-layered testing strategy** - Unit, integration, property, golden output, and regression tests
2. **Semantic error detection** - Catches meaning errors, not just syntax errors
3. **Nondeterminism handling** - Statistical testing for LLM variability
4. **Actionable diagnostics** - Clear failure explanations and fixes
5. **Scalable architecture** - Tests scale to large box libraries

**Core Philosophy**: Traditional testing (exact matches) fails for LLM-based boxes. We need semantic testing (meaning preservation), statistical testing (distribution validation), and invariant testing (property guarantees).

---

## Table of Contents

1. [Testing Challenges](#1-testing-challenges)
2. [Testing Architecture](#2-testing-architecture)
3. [Unit Testing Strategy](#3-unit-testing-strategy)
4. [Integration Testing](#4-integration-testing)
5. [Property-Based Testing](#5-property-based-testing)
6. [Golden Output Testing](#6-golden-output-testing)
7. [Regression Testing](#7-regression-testing)
8. [Performance Testing](#8-performance-testing)
9. [CI/CD Integration](#9-cicd-integration)
10. [TypeScript Interfaces](#10-typescript-interfaces)
11. [Testing Patterns](#11-testing-patterns)
12. [Best Practices](#12-best-practices)
13. [Anti-Patterns](#13-anti-patterns)
14. [Example Test Suite](#14-example-test-suite)

---

## 1. Testing Challenges

### 1.1 Unique Challenges of AI Box Testing

| Challenge | Traditional Testing | AI Box Testing |
|-----------|---------------------|----------------|
| **Determinism** | Same input = same output | LLM nondeterminism |
| **Correctness** | Exact match validation | Semantic similarity |
| **Failure Modes** | Clear pass/fail | Degraded quality |
| **Test Data** | Fixed fixtures | Requires diversity |
| **Cost** | Free to run | LLM API costs |
| **Speed** | Milliseconds | Seconds (LLM latency) |
| **Maintainability** | Stable baselines | Drifting LLM behavior |

### 1.2 Testing Goals

```
┌─────────────────────────────────────────────────────────────┐
│                    AI BOX TESTING GOALS                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. FUNCTIONAL CORRECTNESS                                 │
│     ├─ Output matches expected schema                      │
│     ├─ Output is semantically correct                      │
│     └─ Edge cases are handled properly                     │
│                                                              │
│  2. SEMANTIC PRESERVATION                                  │
│     ├─ Meaning is preserved across variations              │
│     ├─ Key information is not lost                         │
│     └─ Reasoning is sound                                  │
│                                                              │
│  3. ROBUSTNESS                                             │
│     ├─ Handles malformed inputs                            │
│     ├─ Graceful degradation on LLM failures                │
│     └─ Fallback mechanisms work                           │
│                                                              │
│  4. PERFORMANCE                                            │
│     ├─ Latency within acceptable bounds                    │
│     ├─ Cost is predictable                                 │
│     └─ Resource usage is efficient                         │
│                                                              │
│  5. RELIABILITY                                            │
│     ├─ Consistent behavior across runs                     │
│     ├─ Success rate meets threshold                        │
│     └─ Error rates are acceptable                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Testing Strategy Overview

```typescript
/**
 * Testing Strategy Matrix
 *
 * Rows: Test Levels (Unit, Integration, System)
 * Columns: Test Dimensions (Functional, Semantic, Robustness, Performance)
 */

interface TestingStrategy {
  unit: {
    functional: FunctionalUnitTests;
    semantic: SemanticUnitTests;
    robustness: RobustnessUnitTests;
    performance: PerformanceUnitTests;
  };

  integration: {
    functional: FunctionalIntegrationTests;
    semantic: SemanticIntegrationTests;
    robustness: RobustnessIntegrationTests;
    performance: PerformanceIntegrationTests;
  };

  system: {
    functional: FunctionalSystemTests;
    semantic: SemanticSystemTests;
    robustness: RobustnessSystemTests;
    performance: PerformanceSystemTests;
  };
}
```

---

## 2. Testing Architecture

### 2.1 Test Suite Structure

```
src/boxes/
├── __tests__/
│   ├── unit/                      # Unit tests for individual boxes
│   │   ├── reasoning/             # Tests for reasoning boxes
│   │   │   ├── observation.test.ts
│   │   │   ├── analysis.test.ts
│   │   │   ├── inference.test.ts
│   │   │   └── ...
│   │   ├── action/                # Tests for action boxes
│   │   ├── data/                  # Tests for data boxes
│   │   ├── control/               # Tests for control boxes
│   │   └── validate/              # Tests for validate boxes
│   ├── integration/               # Integration tests for compositions
│   │   ├── sequences.test.ts
│   │   ├── parallel.test.ts
│   │   ├── conditional.test.ts
│   │   └── loops.test.ts
│   ├── property/                  # Property-based tests
│   │   ├── invariants.test.ts
│   │   ├── properties.test.ts
│   │   └── generators.test.ts
│   ├── golden/                    # Golden output tests
│   │   ├── outputs/               # Expected outputs
│   │   │   ├── observation/
│   │   │   ├── analysis/
│   │   │   └── ...
│   │   ├── evaluators/            # LLM evaluators
│   │   │   ├── semantic-similarity.test.ts
│   │   │   ├── quality-scorer.test.ts
│   │   │   └── coherence-check.test.ts
│   │   └── golden.test.ts         # Golden test runner
│   ├── regression/                # Regression tests
│   │   ├── baselines/             # Baseline metrics
│   │   ├── detectors/             # Regression detectors
│   │   └── regression.test.ts
│   ├── performance/               # Performance tests
│   │   ├── latency.test.ts
│   │   ├── cost.test.ts
│   │   ├── throughput.test.ts
│   │   └── memory.test.ts
│   └── fixtures/                  # Test fixtures and data
│       ├── inputs/                # Sample inputs
│       ├── mocks/                 # Mock LLM responses
│       └── schemas/               # Test schemas
├── test-utils/                    # Testing utilities
│   ├── box-test-runner.ts         # Test runner for boxes
│   ├── llm-mock.ts                # LLM mocking
│   ├── assertions.ts              # Custom assertions
│   ├── generators.ts              # Test data generators
│   └── evaluators.ts              # LLM evaluators
└── test-setup.ts                  # Global test setup
```

### 2.2 Test Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TEST ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              TEST RUNNER (Jest/Vitest)               │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              BOX TEST SUITE                          │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │ Unit Tests │  │ Integration│  │ Property    │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │ Golden     │  │ Regression │  │ Performance │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              TEST UTILITIES                           │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │ Assertions │  │ Generators │  │ Evaluators  │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │ LLM Mocks  │  │ Fixtures   │  │ Spy/Stub    │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              BOX EXECUTION ENGINE                     │  │
│  │  (Real boxes, mocked boxes, or hybrids)              │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              MOCK LLM LAYER                           │  │
│  │  (Deterministic responses for testing)               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Unit Testing Strategy

### 3.1 Unit Test Principles

**Goal**: Test individual boxes in isolation with deterministic behavior.

**Principles**:
1. **Mock all external dependencies** - LLM calls, API calls, file I/O
2. **Test all code paths** - Success, failure, edge cases
3. **Validate inputs/outputs** - Schema validation
4. **Test invariants** - Properties that must always hold
5. **Fast execution** - Unit tests should run in milliseconds

### 3.2 Unit Test Template

```typescript
/**
 * Unit Test Template for AI Boxes
 *
 * Usage:
 * 1. Import the template
 * 2. Set up box-specific test cases
 * 3. Run tests with mocked LLM
 */

import { AIBox, BoxResult, BoxExecutionContext } from '../types';
import { MockLLMProvider } from '../test-utils/llm-mock';
import { BoxAssertions } from '../test-utils/assertions';

interface BoxTestCase {
  name: string;
  description: string;
  inputs: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  expected: {
    success: boolean;
    outputs?: Record<string, unknown>;
    error?: {
      code: string;
      message: string;
    };
    schema?: Record<string, unknown>;
  };
  mockLLMResponse?: unknown;
  setup?: () => void;
  teardown?: () => void;
}

export class BoxTestSuite {
  constructor(
    private box: AIBox,
    private mockLLM: MockLLMProvider
  ) {}

  /**
   * Run all unit tests for a box
   */
  async runTests(testCases: BoxTestCase[]): Promise<void> {
    for (const testCase of testCases) {
      await this.runTest(testCase);
    }
  }

  /**
   * Run a single test case
   */
  private async runTest(testCase: BoxTestCase): Promise<void> {
    // Setup
    if (testCase.setup) {
      testCase.setup();
    }

    // Configure mock LLM
    if (testCase.mockLLMResponse) {
      this.mockLLM.setResponse(testCase.mockLLMResponse);
    }

    // Execute box
    const context: BoxExecutionContext = {
      executionId: `test-${testCase.name}`,
      workflowId: 'test-workflow',
      causalChainId: 'test-chain',
      inputs: testCase.inputs,
      parameters: testCase.parameters || {},
      options: {
        timeout: 5000,
        dryRun: false,
        debug: true,
      },
      metadata: {
        triggeredBy: 'test',
        timestamp: Date.now(),
        environment: 'development',
      },
    };

    const result: BoxResult = await this.box.execute(context);

    // Assert results
    const assertions = new BoxAssertions();

    if (testCase.expected.success) {
      assertions.assertSuccess(result);

      if (testCase.expected.outputs) {
        assertions.assertOutputsMatch(result.outputs, testCase.expected.outputs);
      }

      if (testCase.expected.schema) {
        assertions.assertSchema(result.outputs, testCase.expected.schema);
      }
    } else {
      assertions.assertFailure(result);

      if (testCase.expected.error) {
        assertions.assertErrorMatch(result.error, testCase.expected.error);
      }
    }

    // Teardown
    if (testCase.teardown) {
      testCase.teardown();
    }
  }
}
```

### 3.3 Unit Test Example: ObservationBox

```typescript
/**
 * Unit Tests for ObservationBox
 */

import { ObservationBox } from '../boxes/observation';
import { BoxTestSuite } from '../test-utils/box-test-runner';
import { MockLLMProvider } from '../test-utils/llm-mock';

describe('ObservationBox', () => {
  let box: ObservationBox;
  let mockLLM: MockLLMProvider;
  let testSuite: BoxTestSuite;

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    box = new ObservationBox({ extractionMethod: 'pattern' });
    testSuite = new BoxTestSuite(box, mockLLM);
  });

  describe('extract observations from text', () => {
    const testCases: BoxTestCase[] = [
      {
        name: 'extracts simple observation',
        description: 'Should extract a single observation from simple text',
        inputs: {
          data: 'The revenue is $1.2M.',
        },
        expected: {
          success: true,
          outputs: {
            observations: expect.arrayContaining([
              expect.stringContaining('revenue'),
            ]),
          },
        },
      },
      {
        name: 'extracts multiple observations',
        description: 'Should extract multiple observations from complex text',
        inputs: {
          data: 'Revenue is $1.2M. Growth is 15%. Customer count is 5000.',
        },
        expected: {
          success: true,
          outputs: {
            observations: expect.arrayContaining([
              expect.stringContaining('revenue'),
              expect.stringContaining('growth'),
              expect.stringContaining('customer'),
            ]),
          },
        },
      },
      {
        name: 'handles empty input',
        description: 'Should handle empty or null input gracefully',
        inputs: {
          data: '',
        },
        expected: {
          success: true,
          outputs: {
            observations: expect.arrayContaining([]),
          },
        },
      },
      {
        name: 'validates required input',
        description: 'Should validate that data input is provided',
        inputs: {},
        expected: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('data'),
          },
        },
      },
    ];

    testCases.forEach(testCase => {
      it(testCase.name, async () => {
        await testSuite.runTest(testCase);
      });
    });
  });

  describe('respects maxObservations parameter', () => {
    it('limits observations to maxObservations', async () => {
      const box = new ObservationBox({
        extractionMethod: 'pattern',
        maxObservations: 2
      });

      const result = await box.execute({
        executionId: 'test-1',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: {
          data: 'Obs1. Obs2. Obs3. Obs4. Obs5.',
        },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(result.success).toBe(true);
      expect(result.outputs.observations).toHaveLength(2);
    });
  });

  describe('handles extraction methods', () => {
    it('uses pattern-based extraction', async () => {
      const box = new ObservationBox({ extractionMethod: 'pattern' });

      const result = await box.execute({
        executionId: 'test-2',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: {
          data: 'Revenue: $1.2M',
        },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(result.success).toBe(true);
      expect(result.outputs.observations.length).toBeGreaterThan(0);
    });

    it('uses LLM-based extraction with mocked response', async () => {
      mockLLM.setResponse({
        observations: [
          'Revenue is $1.2M',
          'Growth rate is 15%',
        ],
      });

      const box = new ObservationBox({ extractionMethod: 'llm' });

      const result = await box.execute({
        executionId: 'test-3',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: {
          data: 'Revenue is $1.2M with 15% growth',
        },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(result.success).toBe(true);
      expect(result.outputs.observations).toEqual([
        'Revenue is $1.2M',
        'Growth rate is 15%',
      ]);
    });
  });

  describe('validates inputs', () => {
    it('rejects missing data input', async () => {
      const result = await box.execute({
        executionId: 'test-4',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: {},
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(result.success).toBe(false);
      expect(result.validation.valid).toBe(false);
      expect(result.validation.errors).toHaveLength(1);
      expect(result.validation.errors[0].path).toBe('/data');
    });

    it('accepts valid input data', async () => {
      const validation = box.validate({
        data: 'Valid observation data',
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('estimates cost accurately', () => {
    it('returns zero cost for pattern extraction', () => {
      const box = new ObservationBox({ extractionMethod: 'pattern' });
      const estimate = box.estimateCost({ data: 'test' });

      expect(estimate.cost).toBeCloseTo(0.0001, 5);
      expect(estimate.duration).toBeCloseTo(10, 0);
    });

    it('returns LLM cost for LLM extraction', () => {
      const box = new ObservationBox({ extractionMethod: 'llm' });
      const estimate = box.estimateCost({ data: 'test' });

      expect(estimate.cost).toBeCloseTo(0.002, 3);
      expect(estimate.duration).toBeCloseTo(500, 0);
    });
  });
});
```

### 3.4 Custom Assertions

```typescript
/**
 * Custom assertions for AI Box testing
 */

export class BoxAssertions {
  /**
   * Assert box execution was successful
   */
  assertSuccess(result: BoxResult): void {
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  }

  /**
   * Assert box execution failed
   */
  assertFailure(result: BoxResult): void {
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  }

  /**
   * Assert outputs match expected values
   */
  assertOutputsMatch(
    actual: Record<string, unknown>,
    expected: Record<string, unknown>
  ): void {
    Object.keys(expected).forEach(key => {
      expect(actual).toHaveProperty(key);

      if (typeof expected[key] === 'object' && expected[key] !== null) {
        // Deep comparison for objects
        expect(actual[key]).toMatchObject(expected[key]);
      } else if (expected[key] instanceof RegExp) {
        // Regex matching
        expect(actual[key]).toMatch(expected[key]);
      } else {
        // Exact matching
        expect(actual[key]).toEqual(expected[key]);
      }
    });
  }

  /**
   * Assert output matches schema
   */
  assertSchema(
    actual: Record<string, unknown>,
    schema: Record<string, unknown>
  ): void {
    // Validate each property against schema
    Object.keys(schema).forEach(key => {
      expect(actual).toHaveProperty(key);

      const schemaDef = schema[key];
      const value = actual[key];

      if (schemaDef.type) {
        expect(typeof value).toBe(schemaDef.type);
      }

      if (schemaDef.required) {
        expect(value).not.toBeUndefined();
        expect(value).not.toBeNull();
      }

      if (schemaDef.array) {
        expect(Array.isArray(value)).toBe(true);
      }

      if (schemaDef.min !== undefined) {
        expect(value).toBeGreaterThanOrEqual(schemaDef.min);
      }

      if (schemaDef.max !== undefined) {
        expect(value).toBeLessThanOrEqual(schemaDef.max);
      }
    });
  }

  /**
   * Assert error matches expected error
   */
  assertErrorMatch(
    actual: BoxError | undefined,
    expected: {
      code: string;
      message: string | RegExp;
    }
  ): void {
    expect(actual).toBeDefined();
    expect(actual?.code).toBe(expected.code);

    if (expected.message instanceof RegExp) {
      expect(actual?.message).toMatch(expected.message);
    } else {
      expect(actual?.message).toContain(expected.message);
    }
  }

  /**
   * Assert semantic similarity (for LLM outputs)
   */
  assertSemanticSimilarity(
    actual: string | string[],
    expected: string | string[],
    threshold: number = 0.8
  ): void {
    const actualStr = Array.isArray(actual) ? actual.join(' ') : actual;
    const expectedStr = Array.isArray(expected) ? expected.join(' ') : expected;

    const similarity = this.calculateSimilarity(actualStr, expectedStr);
    expect(similarity).toBeGreaterThanOrEqual(threshold);
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Simple word overlap similarity
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Assert array length within bounds
   */
  assertArrayLength(
    actual: unknown[],
    min?: number,
    max?: number
  ): void {
    if (min !== undefined) {
      expect(actual.length).toBeGreaterThanOrEqual(min);
    }

    if (max !== undefined) {
      expect(actual.length).toBeLessThanOrEqual(max);
    }
  }

  /**
   * Assert execution time within bounds
   */
  assertExecutionTime(
    result: BoxResult,
    minMs?: number,
    maxMs?: number
  ): void {
    if (minMs !== undefined) {
      expect(result.metrics.duration).toBeGreaterThanOrEqual(minMs);
    }

    if (maxMs !== undefined) {
      expect(result.metrics.duration).toBeLessThanOrEqual(maxMs);
    }
  }

  /**
   * Assert cost within bounds
   */
  assertCost(
    result: BoxResult,
    maxCost: number
  ): void {
    expect(result.metrics.cost).toBeLessThanOrEqual(maxCost);
  }

  /**
   * Assert logs contain expected messages
   */
  assertLogsContain(
    result: BoxResult,
    messages: string[]
  ): void {
    const logMessages = result.logs.map(log => log.message);

    messages.forEach(message => {
      expect(logMessages).toContain(message);
    });
  }
}
```

### 3.5 Mock LLM Provider

```typescript
/**
 * Mock LLM Provider for Testing
 *
 * Provides deterministic, configurable responses for LLM calls
 */

export class MockLLMProvider {
  private responses: Map<string, unknown> = new Map();
  private callHistory: Array<{ prompt: string; response: unknown }> = [];
  private latency: number = 0;
  private failureRate: number = 0;

  /**
   * Set mock response for a prompt
   */
  setResponse(prompt: string, response: unknown): void;
  setResponse(response: unknown): void;
  setResponse(promptOrResponse: string | unknown, response?: unknown): void {
    if (typeof promptOrResponse === 'string') {
      this.responses.set(promptOrResponse, response!);
    } else {
      // Default response for all prompts
      this.responses.set('*', promptOrResponse);
    }
  }

  /**
   * Set latency for mock calls (ms)
   */
  setLatency(ms: number): void {
    this.latency = ms;
  }

  /**
   * Set failure rate (0-1)
   */
  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Get mock response for a prompt
   */
  async getResponse(prompt: string): Promise<unknown> {
    // Record call
    this.callHistory.push({ prompt, response: null });

    // Simulate latency
    if (this.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latency));
    }

    // Simulate failure
    if (Math.random() < this.failureRate) {
      throw new Error('Mock LLM failure');
    }

    // Return response
    if (this.responses.has(prompt)) {
      const response = this.responses.get(prompt)!;
      this.callHistory[this.callHistory.length - 1].response = response;
      return response;
    }

    if (this.responses.has('*')) {
      const response = this.responses.get('*')!;
      this.callHistory[this.callHistory.length - 1].response = response;
      return response;
    }

    // Default response
    const defaultResponse = { text: 'Mock response' };
    this.callHistory[this.callHistory.length - 1].response = defaultResponse;
    return defaultResponse;
  }

  /**
   * Get call history
   */
  getCallHistory(): Array<{ prompt: string; response: unknown }> {
    return [...this.callHistory];
  }

  /**
   * Clear call history
   */
  clearHistory(): void {
    this.callHistory = [];
  }

  /**
   * Clear all responses
   */
  clearResponses(): void {
    this.responses.clear();
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.responses.clear();
    this.callHistory = [];
    this.latency = 0;
    this.failureRate = 0;
  }

  /**
   * Verify prompt was called
   */
  verifyCalled(prompt: string, times?: number): boolean {
    const calls = this.callHistory.filter(call => call.prompt === prompt);

    if (times !== undefined) {
      return calls.length === times;
    }

    return calls.length > 0;
  }

  /**
   * Verify number of calls
   */
  verifyCallCount(count: number): boolean {
    return this.callHistory.length === count;
  }
}
```

---

## 4. Integration Testing

### 4.1 Integration Test Principles

**Goal**: Test box compositions and interactions between boxes.

**Principles**:
1. **Test real compositions** - Serial, parallel, conditional, loop
2. **Test data flow** - Outputs match inputs
3. **Test error propagation** - Errors handled correctly
4. **Test resource cleanup** - No memory leaks, connections closed
5. **Use selective mocking** - Mock only external dependencies

### 4.2 Integration Test Template

```typescript
/**
 * Integration Test Template for Box Compositions
 */

import { AIBox, SerialBox, ParallelBox, ConditionalBox, LoopBox } from '../boxes';
import { BoxExecutionContext } from '../types';

interface CompositionTestCase {
  name: string;
  description: string;
  composition: AIBox;
  inputs: Record<string, unknown>;
  expected: {
    success: boolean;
    outputs?: Record<string, unknown>;
    executionOrder?: string[];
  };
}

export class IntegrationTestSuite {
  /**
   * Run integration tests for compositions
   */
  async runTests(testCases: CompositionTestCase[]): Promise<void> {
    for (const testCase of testCases) {
      await this.runTest(testCase);
    }
  }

  /**
   * Run a single integration test
   */
  private async runTest(testCase: CompositionTestCase): Promise<void> {
    const context: BoxExecutionContext = {
      executionId: `integration-${testCase.name}`,
      workflowId: 'test-workflow',
      causalChainId: 'test-chain',
      inputs: testCase.inputs,
      parameters: {},
      options: {
        timeout: 10000,
        dryRun: false,
        debug: true,
      },
      metadata: {
        triggeredBy: 'test',
        timestamp: Date.now(),
        environment: 'development',
      },
    };

    const result = await testCase.composition.execute(context);

    // Assert results
    if (testCase.expected.success) {
      expect(result.success).toBe(true);

      if (testCase.expected.outputs) {
        expect(result.outputs).toMatchObject(testCase.expected.outputs);
      }
    } else {
      expect(result.success).toBe(false);
    }

    // Verify execution order if specified
    if (testCase.expected.executionOrder) {
      const executionOrder = this.extractExecutionOrder(result.logs);
      expect(executionOrder).toEqual(testCase.expected.executionOrder);
    }
  }

  /**
   * Extract execution order from logs
   */
  private extractExecutionOrder(logs: BoxLog[]): string[] {
    return logs
      .filter(log => log.message.includes('Executing box'))
      .map(log => {
        const match = log.message.match(/Executing box \d+\/\d+: (.+)/);
        return match ? match[1] : '';
      })
      .filter(name => name.length > 0);
  }
}
```

### 4.3 Integration Test Examples

```typescript
/**
 * Integration Tests for Box Compositions
 */

describe('Box Compositions', () => {
  describe('Serial Composition', () => {
    it('executes boxes in sequence', async () => {
      const box1 = createMockBox('Box1', { output: 1 });
      const box2 = createMockBox('Box2', { output: 2 });
      const box3 = createMockBox('Box3', { output: 3 });

      const sequence = new SerialBox([box1, box2, box3]);

      const result = await sequence.execute({
        executionId: 'test-serial',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: { input: 0 },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(result.success).toBe(true);
      expect(result.outputs.box_0).toEqual({ output: 1 });
      expect(result.outputs.box_1).toEqual({ output: 2 });
      expect(result.outputs.box_2).toEqual({ output: 3 });
    });

    it('stops on error when configured', async () => {
      const box1 = createMockBox('Box1', { output: 1 });
      const box2 = createMockBox('Box2', null, true); // Fails
      const box3 = createMockBox('Box3', { output: 3 });

      const sequence = new SerialBox([box1, box2, box3], {
        stopOnError: true,
      });

      const result = await sequence.execute({
        executionId: 'test-serial-error',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: { input: 0 },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(result.success).toBe(false);
      expect(result.outputs.box_0).toEqual({ output: 1 });
      expect(result.outputs.box_1).toBeUndefined(); // Box3 never executed
    });

    it('continues on error when configured', async () => {
      const box1 = createMockBox('Box1', { output: 1 });
      const box2 = createMockBox('Box2', null, true); // Fails
      const box3 = createMockBox('Box3', { output: 3 });

      const sequence = new SerialBox([box1, box2, box3], {
        stopOnError: false,
      });

      const result = await sequence.execute({
        executionId: 'test-serial-continue',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: { input: 0 },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(result.success).toBe(false); // Overall fails
      expect(result.outputs.box_0).toEqual({ output: 1 });
      expect(result.outputs.box_2).toEqual({ output: 3 }); // Box3 executed
    });
  });

  describe('Parallel Composition', () => {
    it('executes boxes in parallel', async () => {
      const box1 = createSlowMockBox('Box1', 100, { output: 1 });
      const box2 = createSlowMockBox('Box2', 100, { output: 2 });
      const box3 = createSlowMockBox('Box3', 100, { output: 3 });

      const parallel = new ParallelBox([box1, box2, box3], 'all');

      const startTime = Date.now();
      const result = await parallel.execute({
        executionId: 'test-parallel',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: { input: 0 },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.outputs['0_output']).toEqual(1);
      expect(result.outputs['1_output']).toEqual(2);
      expect(result.outputs['2_output']).toEqual(3);

      // Should complete in ~100ms, not 300ms (parallel execution)
      expect(duration).toBeLessThan(200);
    });

    it('merges results with different strategies', async () => {
      const box1 = createMockBox('Box1', { value: 'a' });
      const box2 = createMockBox('Box2', { value: 'b' });

      // Test 'merge' strategy
      const mergeParallel = new ParallelBox([box1, box2], 'merge');
      const mergeResult = await mergeParallel.execute({
        executionId: 'test-merge',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: {},
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(mergeResult.outputs.value).toBe('b'); // Last wins

      // Test 'array' strategy
      const arrayParallel = new ParallelBox([box1, box2], 'array');
      const arrayResult = await arrayParallel.execute({
        executionId: 'test-array',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: {},
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(arrayResult.outputs.results).toHaveLength(2);
    });
  });

  describe('Conditional Composition', () => {
    it('executes true branch when condition is met', async () => {
      const trueBox = createMockBox('TrueBox', { branch: 'true' });
      const falseBox = createMockBox('FalseBox', { branch: 'false' });

      const conditional = new ConditionalBox(
        (inputs) => inputs.condition === true,
        trueBox,
        falseBox
      );

      const result = await conditional.execute({
        executionId: 'test-conditional-true',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: { condition: true },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(result.success).toBe(true);
      expect(result.outputs).toEqual({ branch: 'true' });
    });

    it('executes false branch when condition is not met', async () => {
      const trueBox = createMockBox('TrueBox', { branch: 'true' });
      const falseBox = createMockBox('FalseBox', { branch: 'false' });

      const conditional = new ConditionalBox(
        (inputs) => inputs.condition === true,
        trueBox,
        falseBox
      );

      const result = await conditional.execute({
        executionId: 'test-conditional-false',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: { condition: false },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(result.success).toBe(true);
      expect(result.outputs).toEqual({ branch: 'false' });
    });
  });

  describe('Loop Composition', () => {
    it('executes box for each item', async () => {
      const itemBox = createMockBox('ItemBox', { processed: true });

      const loop = new LoopBox(itemBox, {
        maxIterations: 10,
        collectResults: true,
      });

      const result = await loop.execute({
        executionId: 'test-loop',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: {
          items: [1, 2, 3, 4, 5],
        },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(result.success).toBe(true);
      expect(result.outputs.results).toHaveLength(5);
    });

    it('respects maxIterations limit', async () => {
      const itemBox = createMockBox('ItemBox', { processed: true });

      const loop = new LoopBox(itemBox, {
        maxIterations: 3,
        collectResults: true,
      });

      const result = await loop.execute({
        executionId: 'test-loop-max',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: {
          items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(result.success).toBe(true);
      expect(result.outputs.results).toHaveLength(3);
    });

    it('continues on error when configured', async () => {
      let callCount = 0;
      const itemBox = {
        id: 'failing-box',
        name: 'FailingBox',
        type: 'test' as any,
        category: 'test' as any,
        summary: '',
        description: '',
        icon: '',
        color: 'blue' as any,
        inputs: [],
        outputs: [],
        parameters: [],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        author: 'test',
        tags: [],
        metadata: {},

        async execute(context: BoxExecutionContext) {
          callCount++;
          if (callCount === 2) {
            throw new Error('Intentional failure');
          }
          return {
            success: true,
            outputs: { processed: true },
            metrics: { duration: 0, memoryUsed: 0, cpuTime: 0, cost: 0 },
            logs: [],
            artifacts: [],
            validation: { valid: true, errors: [], warnings: [], score: 1 },
          };
        },
        validate: () => ({ valid: true, errors: [], warnings: [], score: 1 }),
        estimateCost: () => ({ cost: 0, duration: 0 }),
        getState: () => ({
          status: 'ready',
          lastExecution: null,
          executionCount: 0,
          successRate: 1
        }),
        getHistory: () => [],
        visualize: () => ({ type: 'node', nodes: [], edges: [] }),
      };

      const loop = new LoopBox(itemBox, {
        continueOnError: true,
        collectResults: true,
      });

      const result = await loop.execute({
        executionId: 'test-loop-error',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: {
          items: [1, 2, 3, 4, 5],
        },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(result.success).toBe(true);
      expect(result.outputs.results).toHaveLength(4); // 5 - 1 failure
    });
  });
});

/**
 * Helper function to create mock boxes
 */
function createMockBox(
  name: string,
  output: unknown,
  fail: boolean = false
): AIBox {
  return {
    id: `mock-${name}`,
    name,
    type: 'test' as any,
    category: 'test' as any,
    summary: `Mock box ${name}`,
    description: '',
    icon: '',
    color: 'blue' as any,
    inputs: [],
    outputs: [],
    parameters: [],
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    author: 'test',
    tags: ['test'],
    metadata: {},

    async execute(context: BoxExecutionContext) {
      if (fail) {
        throw new Error(`Mock box ${name} failed`);
      }
      return {
        success: true,
        outputs: output as Record<string, unknown>,
        metrics: { duration: 0, memoryUsed: 0, cpuTime: 0, cost: 0 },
        logs: [
          {
            level: 'info',
            message: `Executing box: ${name}`,
            timestamp: Date.now(),
          },
        ],
        artifacts: [],
        validation: { valid: true, errors: [], warnings: [], score: 1 },
      };
    },

    validate: () => ({ valid: true, errors: [], warnings: [], score: 1 }),
    estimateCost: () => ({ cost: 0.001, duration: 10 }),
    getState: () => ({
      status: 'ready',
      lastExecution: null,
      executionCount: 0,
      successRate: 1
    }),
    getHistory: () => [],
    visualize: () => ({ type: 'node', nodes: [], edges: [] }),
  };
}

/**
 * Helper function to create slow mock boxes
 */
function createSlowMockBox(
  name: string,
  delayMs: number,
  output: unknown
): AIBox {
  const baseBox = createMockBox(name, output);

  return {
    ...baseBox,
    async execute(context: BoxExecutionContext) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return baseBox.execute(context);
    },
  };
}
```

---

## 5. Property-Based Testing

### 5.1 Property-Based Testing Principles

**Goal**: Verify that boxes satisfy invariants across all possible inputs.

**Principles**:
1. **Identify invariants** - Properties that must always hold
2. **Generate random inputs** - Cover edge cases
3. **Shrink failures** - Find minimal counterexamples
4. **Run many iterations** - Statistical confidence
5. **Test deterministic boxes** - Avoid LLM nondeterminism

### 5.2 Property Test Template

```typescript
/**
 * Property-Based Testing for AI Boxes
 */

import { AIBox, BoxExecutionContext } from '../types';
import { fastCheck } from 'fast-check';

interface PropertyTest {
  name: string;
  description: string;
  property: (box: AIBox, inputs: Record<string, unknown>) => boolean;
  inputGenerator: fastCheck.Arbitrary<Record<string, unknown>>;
  iterations?: number;
}

export class PropertyTestSuite {
  /**
   * Run property-based tests for a box
   */
  async runTests(box: AIBox, tests: PropertyTest[]): Promise<void> {
    for (const test of tests) {
      await this.runTest(box, test);
    }
  }

  /**
   * Run a single property test
   */
  private async runTest(box: AIBox, test: PropertyTest): Promise<void> {
    const iterations = test.iterations || 100;

    await fastCheck.assert(
      fastCheck.asyncProperty(test.inputGenerator, async (inputs) => {
        const result = await this.executeBox(box, inputs);
        return test.property(box, inputs);
      }),
      { numRuns: iterations }
    );
  }

  /**
   * Execute box with inputs
   */
  private async executeBox(
    box: AIBox,
    inputs: Record<string, unknown>
  ): Promise<BoxResult> {
    const context: BoxExecutionContext = {
      executionId: 'property-test',
      workflowId: 'test-workflow',
      causalChainId: 'test-chain',
      inputs,
      parameters: {},
      options: {
        timeout: 5000,
        dryRun: false,
        debug: false,
      },
      metadata: {
        triggeredBy: 'test',
        timestamp: Date.now(),
        environment: 'development',
      },
    };

    return box.execute(context);
  }
}
```

### 5.3 Property Test Examples

```typescript
/**
 * Property-Based Tests for ObservationBox
 */

import { fc } from 'fast-check';
import { ObservationBox } from '../boxes/observation';

describe('ObservationBox - Property Tests', () => {
  let box: ObservationBox;

  beforeEach(() => {
    box = new ObservationBox({ extractionMethod: 'pattern' });
  });

  describe('output invariants', () => {
    it('always returns array of strings', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (input) => {
          const result = await box.execute({
            executionId: 'property-test-1',
            workflowId: 'test-workflow',
            causalChainId: 'test-chain',
            inputs: { data: input },
            parameters: {},
            options: { timeout: 5000 },
            metadata: {
              triggeredBy: 'test',
              timestamp: Date.now(),
              environment: 'development',
            },
          });

          if (!result.success) return true;

          const observations = result.outputs.observations;
          return Array.isArray(observations) &&
                 observations.every((obs: unknown) => typeof obs === 'string');
        }),
        { numRuns: 100 }
      );
    });

    it('never returns more than maxObservations', async () => {
      const maxObs = 10;
      const box = new ObservationBox({
        extractionMethod: 'pattern',
        maxObservations: maxObs
      });

      await fc.assert(
        fc.asyncProperty(fc.string(), async (input) => {
          const result = await box.execute({
            executionId: 'property-test-2',
            workflowId: 'test-workflow',
            causalChainId: 'test-chain',
            inputs: { data: input },
            parameters: {},
            options: { timeout: 5000 },
            metadata: {
              triggeredBy: 'test',
              timestamp: Date.now(),
              environment: 'development',
            },
          });

          if (!result.success) return true;

          const observations = result.outputs.observations;
          return observations.length <= maxObs;
        }),
        { numRuns: 100 }
      );
    });

    it('preserves non-empty input information', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(fc.string(), fc.string()),
          async ([word1, word2]) => {
            const input = `${word1} ${word2}`;
            const result = await box.execute({
              executionId: 'property-test-3',
              workflowId: 'test-workflow',
              causalChainId: 'test-chain',
              inputs: { data: input },
              parameters: {},
              options: { timeout: 5000 },
              metadata: {
                triggeredBy: 'test',
                timestamp: Date.now(),
                environment: 'development',
              },
            });

            if (!result.success) return true;
            if (result.outputs.observations.length === 0) return true;

            // At least some information should be preserved
            const outputText = result.outputs.observations.join(' ');
            return outputText.length > 0;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('idempotency', () => {
    it('produces consistent results for same input', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (input) => {
          const context = {
            executionId: 'property-test-4',
            workflowId: 'test-workflow',
            causalChainId: 'test-chain',
            inputs: { data: input },
            parameters: {},
            options: { timeout: 5000 },
            metadata: {
              triggeredBy: 'test',
              timestamp: Date.now(),
              environment: 'development',
            },
          };

          const result1 = await box.execute(context);
          const result2 = await box.execute(context);

          if (!result1.success || !result2.success) return true;

          // Same inputs should produce same observations (deterministic)
          return JSON.stringify(result1.outputs.observations) ===
                 JSON.stringify(result2.outputs.observations);
        }),
        { numRuns: 20 }
      );
    });
  });

  describe('monotonicity', () => {
    it('longer input produces more or equal observations', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), fc.string(), async (str1, str2) => {
          const input1 = str1;
          const input2 = str1 + ' ' + str2; // Always longer

          const result1 = await box.execute({
            executionId: 'property-test-5',
            workflowId: 'test-workflow',
            causalChainId: 'test-chain',
            inputs: { data: input1 },
            parameters: {},
            options: { timeout: 5000 },
            metadata: {
              triggeredBy: 'test',
              timestamp: Date.now(),
              environment: 'development',
            },
          });

          const result2 = await box.execute({
            executionId: 'property-test-6',
            workflowId: 'test-workflow',
            causalChainId: 'test-chain',
            inputs: { data: input2 },
            parameters: {},
            options: { timeout: 5000 },
            metadata: {
              triggeredBy: 'test',
              timestamp: Date.now(),
              environment: 'development',
            },
          });

          if (!result1.success || !result2.success) return true;

          // Longer text should produce more or equal observations
          return result2.outputs.observations.length >=
                 result1.outputs.observations.length;
        }),
        { numRuns: 50 }
      );
    });
  });
});

/**
 * Property-Based Tests for MapBox
 */

describe('MapBox - Property Tests', () => {
  it('preserves array length', async () => {
    const mapBox = new MapBox((item: number) => item * 2);

    await fc.assert(
      fc.asyncProperty(fc.array(fc.integer()), async (input) => {
        const result = await mapBox.execute({
          executionId: 'property-test-map-1',
          workflowId: 'test-workflow',
          causalChainId: 'test-chain',
          inputs: { items: input },
          parameters: {},
          options: { timeout: 5000 },
          metadata: {
            triggeredBy: 'test',
            timestamp: Date.now(),
            environment: 'development',
          },
        });

        if (!result.success) return true;

        return result.outputs.mapped.length === input.length;
      }),
      { numRuns: 100 }
    );
  });

  it('preserves order', async () => {
    const mapBox = new MapBox((item: number) => item * 2);

    await fc.assert(
      fc.asyncProperty(fc.array(fc.integer()), async (input) => {
        const result = await mapBox.execute({
          executionId: 'property-test-map-2',
          workflowId: 'test-workflow',
          causalChainId: 'test-chain',
          inputs: { items: input },
          parameters: {},
          options: { timeout: 5000 },
          metadata: {
            triggeredBy: 'test',
            timestamp: Date.now(),
            environment: 'development',
          },
        });

        if (!result.success) return true;

        // Check order is preserved
        for (let i = 0; i < input.length; i++) {
          if (result.outputs.mapped[i] !== input[i] * 2) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests for FilterBox
 */

describe('FilterBox - Property Tests', () => {
  it('output is subset of input', async () => {
    const filterBox = new FilterBox((item: number) => item > 0);

    await fc.assert(
      fc.asyncProperty(fc.array(fc.integer()), async (input) => {
        const result = await filterBox.execute({
          executionId: 'property-test-filter-1',
          workflowId: 'test-workflow',
          causalChainId: 'test-chain',
          inputs: { items: input },
          parameters: {},
          options: { timeout: 5000 },
          metadata: {
            triggeredBy: 'test',
            timestamp: Date.now(),
            environment: 'development',
          },
        });

        if (!result.success) return true;

        const filtered = result.outputs.filtered;

        // All filtered items must be in original input
        return filtered.every((item: number) => input.includes(item));
      }),
      { numRuns: 100 }
    );
  });

  it('output length is <= input length', async () => {
    const filterBox = new FilterBox((item: number) => item > 0);

    await fc.assert(
      fc.asyncProperty(fc.array(fc.integer()), async (input) => {
        const result = await filterBox.execute({
          executionId: 'property-test-filter-2',
          workflowId: 'test-workflow',
          causalChainId: 'test-chain',
          inputs: { items: input },
          parameters: {},
          options: { timeout: 5000 },
          metadata: {
            triggeredBy: 'test',
            timestamp: Date.now(),
            environment: 'development',
          },
        });

        if (!result.success) return true;

        return result.outputs.filtered.length <= input.length;
      }),
      { numRuns: 100 }
    );
  });

  it('preserves filter predicate', async () => {
    const filterBox = new FilterBox((item: number) => item > 0);

    await fc.assert(
      fc.asyncProperty(fc.array(fc.integer()), async (input) => {
        const result = await filterBox.execute({
          executionId: 'property-test-filter-3',
          workflowId: 'test-workflow',
          causalChainId: 'test-chain',
          inputs: { items: input },
          parameters: {},
          options: { timeout: 5000 },
          metadata: {
            triggeredBy: 'test',
            timestamp: Date.now(),
            environment: 'development',
          },
        });

        if (!result.success) return true;

        // All filtered items must satisfy predicate
        return result.outputs.filtered.every((item: number) => item > 0);
      }),
      { numRuns: 100 }
    );
  });
});
```

---

## 6. Golden Output Testing

### 6.1 Golden Output Testing Principles

**Goal**: Validate that box outputs match expected quality using LLM evaluation.

**Principles**:
1. **Use LLM as judge** - Evaluate semantic quality
2. **Similarity scoring** - Measure output similarity
3. **Quality dimensions** - Relevance, coherence, completeness
4. **Human-in-the-loop** - Curate golden outputs
5. **Version control** - Track golden output changes

### 6.2 Golden Output Test Template

```typescript
/**
 * Golden Output Testing for AI Boxes
 */

import { AIBox, BoxExecutionContext } from '../types';
import { LLMEvaluator } from './evaluators';
import * as fs from 'fs/promises';
import * as path from 'path';

interface GoldenOutput {
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  metadata: {
    description: string;
    created: string;
    version: string;
    tags: string[];
  };
}

interface GoldenOutputTest {
  name: string;
  description: string;
  goldenOutputs: GoldenOutput[];
  evaluators: LLMEvaluator[];
  similarityThreshold: number;
}

export class GoldenOutputTestSuite {
  private goldenOutputCache: Map<string, GoldenOutput[]> = new Map();

  constructor(
    private llmEvaluator: LLMEvaluator,
    private goldenOutputDir: string
  ) {}

  /**
   * Run golden output tests for a box
   */
  async runTests(box: AIBox, tests: GoldenOutputTest[]): Promise<void> {
    for (const test of tests) {
      await this.runTest(box, test);
    }
  }

  /**
   * Run a single golden output test
   */
  private async runTest(box: AIBox, test: GoldenOutputTest): Promise<void> {
    for (const goldenOutput of test.goldenOutputs) {
      await this.evaluateGoldenOutput(box, goldenOutput, test);
    }
  }

  /**
   * Evaluate box output against golden output
   */
  private async evaluateGoldenOutput(
    box: AIBox,
    goldenOutput: GoldenOutput,
    test: GoldenOutputTest
  ): Promise<void> {
    // Execute box with golden input
    const result = await box.execute({
      executionId: 'golden-test',
      workflowId: 'test-workflow',
      causalChainId: 'test-chain',
      inputs: goldenOutput.input,
      parameters: {},
      options: {
        timeout: 10000,
        dryRun: false,
        debug: false,
      },
      metadata: {
        triggeredBy: 'test',
        timestamp: Date.now(),
        environment: 'development',
      },
    });

    // Evaluate output
    const scores = await this.llmEvaluator.evaluate(
      result.outputs,
      goldenOutput.expectedOutput,
      test.evaluators
    );

    // Assert scores meet threshold
    for (const [evaluator, score] of Object.entries(scores)) {
      expect(score).toBeGreaterThanOrEqual(test.similarityThreshold);
    }
  }

  /**
   * Load golden outputs from disk
   */
  async loadGoldenOutputs(boxName: string): Promise<GoldenOutput[]> {
    if (this.goldenOutputCache.has(boxName)) {
      return this.goldenOutputCache.get(boxName)!;
    }

    const filePath = path.join(
      this.goldenOutputDir,
      boxName,
      'golden-outputs.json'
    );

    const content = await fs.readFile(filePath, 'utf-8');
    const goldenOutputs = JSON.parse(content) as GoldenOutput[];

    this.goldenOutputCache.set(boxName, goldenOutputs);
    return goldenOutputs;
  }

  /**
   * Save golden outputs to disk
   */
  async saveGoldenOutputs(
    boxName: string,
    goldenOutputs: GoldenOutput[]
  ): Promise<void> {
    const dirPath = path.join(this.goldenOutputDir, boxName);
    await fs.mkdir(dirPath, { recursive: true });

    const filePath = path.join(dirPath, 'golden-outputs.json');
    await fs.writeFile(filePath, JSON.stringify(goldenOutputs, null, 2));

    this.goldenOutputCache.set(boxName, goldenOutputs);
  }
}
```

### 6.3 LLM Evaluator

```typescript
/**
 * LLM-based Output Evaluator
 *
 * Uses LLMs to evaluate semantic quality of outputs
 */

export interface LLMEvaluator {
  name: string;
  description: string;
  evaluate: (
    actual: Record<string, unknown>,
    expected: Record<string, unknown>
  ) => Promise<number>;
}

export class SemanticSimilarityEvaluator implements LLMEvaluator {
  name = 'semantic-similarity';
  description = 'Evaluates semantic similarity between outputs';

  constructor(private llmClient: any) {}

  async evaluate(
    actual: Record<string, unknown>,
    expected: Record<string, unknown>
  ): Promise<number> {
    const prompt = `
You are evaluating the semantic similarity between two outputs.

Expected Output:
${JSON.stringify(expected, null, 2)}

Actual Output:
${JSON.stringify(actual, null, 2)}

Rate the semantic similarity on a scale of 0 to 1, where:
- 1.0: Identical meaning
- 0.8-0.9: Very similar, minor differences
- 0.6-0.7: Similar, some differences
- 0.4-0.5: Somewhat related, significant differences
- 0.2-0.3: Weakly related
- 0.0-0.1: Unrelated

Respond with only the score as a decimal number.
`;

    const response = await this.llmClient.complete(prompt);
    const score = parseFloat(response.text.trim());
    return Math.max(0, Math.min(1, score));
  }
}

export class CoherenceEvaluator implements LLMEvaluator {
  name = 'coherence';
  description = 'Evaluates logical coherence of output';

  constructor(private llmClient: any) {}

  async evaluate(
    actual: Record<string, unknown>,
    expected: Record<string, unknown>
  ): Promise<number> {
    const prompt = `
Evaluate the logical coherence of the following output.

Output:
${JSON.stringify(actual, null, 2)}

Check for:
1. Internal consistency (no contradictions)
2. Logical flow (ideas connect properly)
3. Completeness (no incomplete thoughts)

Rate the coherence on a scale of 0 to 1.

Respond with only the score as a decimal number.
`;

    const response = await this.llmClient.complete(prompt);
    const score = parseFloat(response.text.trim());
    return Math.max(0, Math.min(1, score));
  }
}

export class CompletenessEvaluator implements LLMEvaluator {
  name = 'completeness';
  description = 'Evaluates completeness of output';

  constructor(private llmClient: any) {}

  async evaluate(
    actual: Record<string, unknown>,
    expected: Record<string, unknown>
  ): Promise<number> {
    const actualKeys = new Set(Object.keys(actual));
    const expectedKeys = new Set(Object.keys(expected));

    // Check for missing keys
    const missingKeys = [...expectedKeys].filter(k => !actualKeys.has(k));

    // Calculate completeness score
    const completeness = 1 - (missingKeys.length / expectedKeys.size);

    // Use LLM to evaluate quality of present keys
    const prompt = `
Evaluate the completeness of this output compared to the expected output.

Expected:
${JSON.stringify(expected, null, 2)}

Actual:
${JSON.stringify(actual, null, 2)}

Focus on whether the actual output captures all the essential information
from the expected output.

Rate completeness on a scale of 0 to 1.

Respond with only the score as a decimal number.
`;

    const response = await this.llmClient.complete(prompt);
    const llmScore = parseFloat(response.text.trim());

    // Combine structural and semantic completeness
    return (completeness + llmScore) / 2;
  }
}

export class FactPreservationEvaluator implements LLMEvaluator {
  name = 'fact-preservation';
  description = 'Evaluates preservation of key facts';

  constructor(private llmClient: any) {}

  async evaluate(
    actual: Record<string, unknown>,
    expected: Record<string, unknown>
  ): Promise<number> {
    // Extract facts from expected output
    const expectedFacts = await this.extractFacts(expected);
    const actualFacts = await this.extractFacts(actual);

    // Calculate overlap
    const preservedFacts = expectedFacts.filter(f =>
      actualFacts.some(af => this.factsMatch(f, af))
    );

    return expectedFacts.length > 0
      ? preservedFacts.length / expectedFacts.length
      : 1;
  }

  private async extractFacts(output: Record<string, unknown>): Promise<string[]> {
    const prompt = `
Extract key facts from the following output.

Output:
${JSON.stringify(output, null, 2)}

List each fact on a separate line.
`;

    const response = await this.llmClient.complete(prompt);
    return response.text.split('\n').filter(f => f.trim().length > 0);
  }

  private factsMatch(fact1: string, fact2: string): boolean {
    // Simple matching - could be enhanced with LLM
    return fact1.toLowerCase().includes(fact2.toLowerCase()) ||
           fact2.toLowerCase().includes(fact1.toLowerCase());
  }
}
```

### 6.4 Golden Output Test Examples

```typescript
/**
 * Golden Output Tests for ObservationBox
 */

import { ObservationBox } from '../boxes/observation';
import { GoldenOutputTestSuite } from '../test-utils/golden-test';
import {
  SemanticSimilarityEvaluator,
  CoherenceEvaluator,
  CompletenessEvaluator
} from '../test-utils/evaluators';

describe('ObservationBox - Golden Output Tests', () => {
  let testSuite: GoldenOutputTestSuite;
  let box: ObservationBox;

  beforeEach(() => {
    const llmClient = createMockLLMClient();
    const evaluators = [
      new SemanticSimilarityEvaluator(llmClient),
      new CoherenceEvaluator(llmClient),
      new CompletenessEvaluator(llmClient),
    ];

    testSuite = new GoldenOutputTestSuite(evaluators, 'src/boxes/__tests__/golden/outputs');
    box = new ObservationBox({ extractionMethod: 'llm' });
  });

  describe('financial data extraction', () => {
    it('matches golden output for revenue data', async () => {
      const goldenOutput: GoldenOutput = {
        input: {
          data: 'Q3 revenue was $1.2M, representing a 15% increase from Q2.',
        },
        expectedOutput: {
          observations: [
            'Q3 revenue was $1.2M',
            'Revenue increased 15% from Q2',
          ],
        },
        metadata: {
          description: 'Extract revenue observations',
          created: '2026-03-08',
          version: '1.0.0',
          tags: ['financial', 'revenue'],
        },
      };

      await testSuite.evaluateGoldenOutput(box, goldenOutput, {
        evaluators: [
          new SemanticSimilarityEvaluator(testSuite['llmClient']),
          new CompletenessEvaluator(testSuite['llmClient']),
        ],
        similarityThreshold: 0.8,
      });
    });
  });

  describe('multi-fact extraction', () => {
    it('matches golden output for complex data', async () => {
      const goldenOutput: GoldenOutput = {
        input: {
          data: 'The product has 5000 users, 85% retention rate, and $50k MRR. User growth is 20% MoM.',
        },
        expectedOutput: {
          observations: expect.arrayContaining([
            expect.stringContaining('5000 users'),
            expect.stringContaining('85% retention'),
            expect.stringContaining('$50k MRR'),
            expect.stringContaining('20% growth'),
          ]),
        },
        metadata: {
          description: 'Extract multiple metrics',
          created: '2026-03-08',
          version: '1.0.0',
          tags: ['metrics', 'multi-fact'],
        },
      };

      await testSuite.evaluateGoldenOutput(box, goldenOutput, {
        evaluators: [
          new SemanticSimilarityEvaluator(testSuite['llmClient']),
          new CompletenessEvaluator(testSuite['llmClient']),
          new FactPreservationEvaluator(testSuite['llmClient']),
        ],
        similarityThreshold: 0.75,
      });
    });
  });
});
```

---

## 7. Regression Testing

### 7.1 Regression Testing Principles

**Goal**: Detect performance and quality degradation over time.

**Principles**:
1. **Track baselines** - Store historical performance metrics
2. **Detect drift** - Identify significant metric changes
3. **Alert on degradation** - Notify when regressions detected
4. **Version compare** - Compare across versions
5. **Trend analysis** - Track long-term trends

### 7.2 Regression Detection

```typescript
/**
 * Regression Detection for AI Boxes
 */

export interface RegressionBaseline {
  boxName: string;
  boxVersion: string;
  timestamp: number;
  metrics: {
    successRate: number;
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
    avgCost: number;
    throughput: number;
    errorRate: number;
  };
  qualityScores: {
    semanticSimilarity: number;
    coherence: number;
    completeness: number;
  };
}

export interface RegressionReport {
  boxName: string;
  currentVersion: string;
  baselineVersion: string;
  regressions: Regression[];
  timestamp: number;
}

export interface Regression {
  metric: string;
  currentValue: number;
  baselineValue: number;
  percentChange: number;
  severity: 'minor' | 'moderate' | 'severe';
}

export class RegressionDetector {
  private baselines: Map<string, RegressionBaseline[]> = new Map();

  /**
   * Record baseline metrics for a box
   */
  async recordBaseline(
    boxName: string,
    boxVersion: string,
    metrics: RegressionBaseline['metrics'],
    qualityScores: RegressionBaseline['qualityScores']
  ): Promise<void> {
    const baseline: RegressionBaseline = {
      boxName,
      boxVersion,
      timestamp: Date.now(),
      metrics,
      qualityScores,
    };

    if (!this.baselines.has(boxName)) {
      this.baselines.set(boxName, []);
    }

    this.baselines.get(boxName)!.push(baseline);
  }

  /**
   * Detect regressions compared to baseline
   */
  async detectRegressions(
    boxName: string,
    currentMetrics: RegressionBaseline['metrics'],
    currentQuality: RegressionBaseline['qualityScores'],
    baselineVersion?: string
  ): Promise<RegressionReport> {
    const boxBaselines = this.baselines.get(boxName) || [];

    if (boxBaselines.length === 0) {
      throw new Error(`No baselines found for box: ${boxName}`);
    }

    // Select baseline (use specified version or most recent)
    const baseline = baselineVersion
      ? boxBaselines.find(b => b.boxVersion === baselineVersion)
      : boxBaselines[boxBaselines.length - 1];

    if (!baseline) {
      throw new Error(`Baseline version not found: ${baselineVersion}`);
    }

    const regressions: Regression[] = [];

    // Check metric regressions
    regressions.push(...this.checkMetricRegressions(
      boxName,
      currentMetrics,
      baseline.metrics,
      {
        successRate: { threshold: -0.05, severity: 'severe' },
        avgLatency: { threshold: 0.2, severity: 'moderate' },
        p95Latency: { threshold: 0.2, severity: 'moderate' },
        p99Latency: { threshold: 0.2, severity: 'minor' },
        avgCost: { threshold: 0.15, severity: 'moderate' },
        throughput: { threshold: -0.1, severity: 'severe' },
        errorRate: { threshold: 0.1, severity: 'severe' },
      }
    ));

    // Check quality regressions
    regressions.push(...this.checkQualityRegressions(
      boxName,
      currentQuality,
      baseline.qualityScores,
      {
        semanticSimilarity: { threshold: -0.1, severity: 'severe' },
        coherence: { threshold: -0.1, severity: 'moderate' },
        completeness: { threshold: -0.1, severity: 'moderate' },
      }
    ));

    return {
      boxName,
      currentVersion: currentMetrics,
      baselineVersion: baseline.boxVersion,
      regressions,
      timestamp: Date.now(),
    };
  }

  /**
   * Check metric regressions
   */
  private checkMetricRegressions(
    boxName: string,
    current: RegressionBaseline['metrics'],
    baseline: RegressionBaseline['metrics'],
    thresholds: Record<string, { threshold: number; severity: Regression['severity'] }>
  ): Regression[] {
    const regressions: Regression[] = [];

    for (const [metric, threshold] of Object.entries(thresholds)) {
      const currentValue = (current as any)[metric];
      const baselineValue = (baseline as any)[metric];

      if (baselineValue === 0) continue; // Skip zero baselines

      const percentChange = (currentValue - baselineValue) / Math.abs(baselineValue);

      // Check if change exceeds threshold in wrong direction
      const isRegression = threshold.threshold > 0
        ? percentChange > threshold.threshold // Increase is bad
        : percentChange < threshold.threshold; // Decrease is bad

      if (isRegression) {
        regressions.push({
          metric,
          currentValue,
          baselineValue,
          percentChange: percentChange * 100,
          severity: threshold.severity,
        });
      }
    }

    return regressions;
  }

  /**
   * Check quality regressions
   */
  private checkQualityRegressions(
    boxName: string,
    current: RegressionBaseline['qualityScores'],
    baseline: RegressionBaseline['qualityScores'],
    thresholds: Record<string, { threshold: number; severity: Regression['severity'] }>
  ): Regression[] {
    const regressions: Regression[] = [];

    for (const [metric, threshold] of Object.entries(thresholds)) {
      const currentValue = (current as any)[metric];
      const baselineValue = (baseline as any)[metric];

      if (baselineValue === 0) continue;

      const percentChange = (currentValue - baselineValue) / baselineValue;

      // Quality decrease is regression
      if (percentChange < threshold.threshold) {
        regressions.push({
          metric,
          currentValue,
          baselineValue,
          percentChange: percentChange * 100,
          severity: threshold.severity,
        });
      }
    }

    return regressions;
  }

  /**
   * Get baseline history for a box
   */
  getBaselineHistory(boxName: string): RegressionBaseline[] {
    return this.baselines.get(boxName) || [];
  }

  /**
   * Load baselines from disk
   */
  async loadBaselines(filePath: string): Promise<void> {
    // Implementation would load from JSON file
  }

  /**
   * Save baselines to disk
   */
  async saveBaselines(filePath: string): Promise<void> {
    // Implementation would save to JSON file
  }
}
```

### 7.3 Regression Test Examples

```typescript
/**
 * Regression Tests for AI Boxes
 */

import { ObservationBox } from '../boxes/observation';
import { RegressionDetector } from '../test-utils/regression';

describe('ObservationBox - Regression Tests', () => {
  let detector: RegressionDetector;
  let box: ObservationBox;

  beforeEach(() => {
    detector = new RegressionDetector();
    box = new ObservationBox({ extractionMethod: 'llm' });
  });

  describe('performance regression', () => {
    it('detects latency regression', async () => {
      // Record baseline
      await detector.recordBaseline('ObservationBox', '1.0.0', {
        successRate: 0.95,
        avgLatency: 500,
        p95Latency: 800,
        p99Latency: 1200,
        avgCost: 0.002,
        throughput: 2,
        errorRate: 0.05,
      }, {
        semanticSimilarity: 0.85,
        coherence: 0.90,
        completeness: 0.88,
      });

      // Current metrics (regressed)
      const currentMetrics = {
        successRate: 0.93,
        avgLatency: 650, // 30% increase
        p95Latency: 1000,
        p99Latency: 1500,
        avgCost: 0.0025,
        throughput: 1.8,
        errorRate: 0.07,
      };

      const currentQuality = {
        semanticSimilarity: 0.82,
        coherence: 0.88,
        completeness: 0.85,
      };

      const report = await detector.detectRegressions(
        'ObservationBox',
        currentMetrics,
        currentQuality
      );

      // Should detect latency regression
      const latencyRegression = report.regressions.find(r => r.metric === 'avgLatency');
      expect(latencyRegression).toBeDefined();
      expect(latencyRegression!.severity).toBe('moderate');
    });

    it('detects quality regression', async () => {
      // Record baseline
      await detector.recordBaseline('ObservationBox', '1.0.0', {
        successRate: 0.95,
        avgLatency: 500,
        p95Latency: 800,
        p99Latency: 1200,
        avgCost: 0.002,
        throughput: 2,
        errorRate: 0.05,
      }, {
        semanticSimilarity: 0.85,
        coherence: 0.90,
        completeness: 0.88,
      });

      // Current quality (regressed)
      const currentQuality = {
        semanticSimilarity: 0.75, // Dropped below threshold
        coherence: 0.88,
        completeness: 0.82,
      };

      const report = await detector.detectRegressions(
        'ObservationBox',
        {} as any,
        currentQuality
      );

      // Should detect semantic similarity regression
      const similarityRegression = report.regressions.find(
        r => r.metric === 'semanticSimilarity'
      );
      expect(similarityRegression).toBeDefined();
      expect(similarityRegression!.severity).toBe('severe');
    });
  });

  describe('trend analysis', () => {
    it('tracks performance trends over time', async () => {
      // Record historical baselines
      for (let i = 0; i < 10; i++) {
        await detector.recordBaseline('ObservationBox', `1.0.${i}`, {
          successRate: 0.95 - (i * 0.005), // Gradual decline
          avgLatency: 500 + (i * 20), // Gradual increase
          p95Latency: 800 + (i * 30),
          p99Latency: 1200 + (i * 40),
          avgCost: 0.002,
          throughput: 2,
          errorRate: 0.05 + (i * 0.005),
        }, {
          semanticSimilarity: 0.85,
          coherence: 0.90,
          completeness: 0.88,
        });
      }

      const history = detector.getBaselineHistory('ObservationBox');

      // Analyze trends
      const successRateTrend = calculateTrend(
        history.map(h => h.metrics.successRate)
      );
      const latencyTrend = calculateTrend(
        history.map(h => h.metrics.avgLatency)
      );

      // Success rate should be declining
      expect(successRateTrend).toBeLessThan(0);

      // Latency should be increasing
      expect(latencyTrend).toBeGreaterThan(0);
    });
  });
});

/**
 * Calculate trend (positive = increasing, negative = decreasing)
 */
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, i) => sum + (i * y), 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}
```

---

## 8. Performance Testing

### 8.1 Performance Test Principles

**Goal**: Ensure boxes meet performance requirements for latency, cost, and resource usage.

**Principles**:
1. **Measure real performance** - Use actual LLM calls
2. **Statistical sampling** - Run multiple iterations
3. **Percentile reporting** - P50, P95, P99 metrics
4. **Resource monitoring** - Memory, CPU, network
5. **Cost tracking** - API call costs

### 8.2 Performance Test Template

```typescript
/**
 * Performance Testing for AI Boxes
 */

export interface PerformanceMetrics {
  latency: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p90: number;
    p95: number;
    p99: number;
    stdDev: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  cost: {
    totalCost: number;
    avgCostPerRequest: number;
  };
  resources: {
    memoryUsed: number;
    cpuTime: number;
    networkBytes: number;
  };
}

export interface PerformanceThresholds {
  maxLatencyMs: number;
  maxCostPerRequest: number;
  minThroughput: number;
  maxMemoryMB: number;
}

export class PerformanceTestSuite {
  /**
   * Measure performance of a box
   */
  async measurePerformance(
    box: AIBox,
    inputs: Record<string, unknown>,
    iterations: number = 100
  ): Promise<PerformanceMetrics> {
    const latencies: number[] = [];
    const costs: number[] = [];
    const memoryUsage: number[] = [];
    const startTime = Date.now();

    // Run iterations
    for (let i = 0; i < iterations; i++) {
      const iterationStart = Date.now();
      const memBefore = process.memoryUsage().heapUsed;

      const result = await box.execute({
        executionId: `perf-test-${i}`,
        workflowId: 'perf-test',
        causalChainId: 'perf-test',
        inputs,
        parameters: {},
        options: { timeout: 30000 },
        metadata: {
          triggeredBy: 'perf-test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      const memAfter = process.memoryUsage().heapUsed;
      const iterationEnd = Date.now();

      latencies.push(iterationEnd - iterationStart);
      costs.push(result.metrics.cost);
      memoryUsage.push(memAfter - memBefore);
    }

    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000; // seconds

    // Calculate metrics
    return {
      latency: this.calculateLatencyMetrics(latencies),
      throughput: {
        requestsPerSecond: iterations / totalDuration,
        requestsPerMinute: (iterations / totalDuration) * 60,
      },
      cost: {
        totalCost: costs.reduce((a, b) => a + b, 0),
        avgCostPerRequest: costs.reduce((a, b) => a + b, 0) / iterations,
      },
      resources: {
        memoryUsed: Math.max(...memoryUsage),
        cpuTime: 0, // Would need more sophisticated measurement
        networkBytes: 0, // Would need network monitoring
      },
    };
  }

  /**
   * Calculate latency metrics
   */
  private calculateLatencyMetrics(latencies: number[]): PerformanceMetrics['latency'] {
    const sorted = [...latencies].sort((a, b) => a - b);
    const sum = latencies.reduce((a, b) => a + b, 0);
    const mean = sum / latencies.length;
    const variance = latencies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / latencies.length;

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      stdDev: Math.sqrt(variance),
    };
  }

  /**
   * Assert performance meets thresholds
   */
  assertPerformance(
    metrics: PerformanceMetrics,
    thresholds: PerformanceThresholds
  ): void {
    expect(metrics.latency.p95).toBeLessThanOrEqual(thresholds.maxLatencyMs);
    expect(metrics.cost.avgCostPerRequest).toBeLessThanOrEqual(thresholds.maxCostPerRequest);
    expect(metrics.throughput.requestsPerSecond).toBeGreaterThanOrEqual(thresholds.minThroughput);
    expect(metrics.resources.memoryUsed).toBeLessThanOrEqual(thresholds.maxMemoryMB * 1024 * 1024);
  }
}
```

### 8.3 Performance Test Examples

```typescript
/**
 * Performance Tests for ObservationBox
 */

import { ObservationBox } from '../boxes/observation';
import { PerformanceTestSuite } from '../test-utils/performance';

describe('ObservationBox - Performance Tests', () => {
  let testSuite: PerformanceTestSuite;

  beforeEach(() => {
    testSuite = new PerformanceTestSuite();
  });

  describe('latency benchmarks', () => {
    it('meets latency targets for pattern extraction', async () => {
      const box = new ObservationBox({ extractionMethod: 'pattern' });
      const metrics = await testSuite.measurePerformance(
        box,
        { data: 'Revenue is $1.2M with 15% growth from last quarter.' },
        100
      );

      // Pattern extraction should be fast
      expect(metrics.latency.p95).toBeLessThan(50); // < 50ms
      expect(metrics.latency.mean).toBeLessThan(20); // < 20ms average
    });

    it('meets latency targets for LLM extraction', async () => {
      const box = new ObservationBox({ extractionMethod: 'llm' });
      const metrics = await testSuite.measurePerformance(
        box,
        { data: 'Revenue is $1.2M with 15% growth from last quarter.' },
        20 // Fewer iterations for LLM (cost)
      );

      // LLM extraction will be slower
      expect(metrics.latency.p95).toBeLessThan(2000); // < 2s
      expect(metrics.latency.mean).toBeLessThan(1500); // < 1.5s average
    });
  });

  describe('cost benchmarks', () => {
    it('meets cost targets for pattern extraction', async () => {
      const box = new ObservationBox({ extractionMethod: 'pattern' });
      const metrics = await testSuite.measurePerformance(
        box,
        { data: 'Revenue is $1.2M with 15% growth from last quarter.' },
        100
      );

      // Pattern extraction should be essentially free
      expect(metrics.cost.avgCostPerRequest).toBeLessThan(0.0001); // < $0.0001
    });

    it('meets cost targets for LLM extraction', async () => {
      const box = new ObservationBox({ extractionMethod: 'llm' });
      const metrics = await testSuite.measurePerformance(
        box,
        { data: 'Revenue is $1.2M with 15% growth from last quarter.' },
        20
      );

      // LLM extraction has cost
      expect(metrics.cost.avgCostPerRequest).toBeLessThan(0.01); // < $0.01
    });
  });

  describe('throughput benchmarks', () => {
    it('achieves target throughput for pattern extraction', async () => {
      const box = new ObservationBox({ extractionMethod: 'pattern' });
      const metrics = await testSuite.measurePerformance(
        box,
        { data: 'Revenue is $1.2M with 15% growth from last quarter.' },
        100
      );

      // Should handle at least 50 requests/second
      expect(metrics.throughput.requestsPerSecond).toBeGreaterThan(50);
    });
  });

  describe('resource usage', () => {
    it('stays within memory limits', async () => {
      const box = new ObservationBox({ extractionMethod: 'llm' });
      const metrics = await testSuite.measurePerformance(
        box,
        { data: 'Revenue is $1.2M with 15% growth from last quarter.' },
        20
      );

      // Should use less than 10MB per request
      expect(metrics.resources.memoryUsed).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('scalability', () => {
    it('scales with input size', async () => {
      const box = new ObservationBox({ extractionMethod: 'pattern' });

      const smallInput = 'Revenue is $1.2M.';
      const largeInput = 'Revenue is $1.2M. '.repeat(100); // 100x larger

      const smallMetrics = await testSuite.measurePerformance(box, { data: smallInput }, 50);
      const largeMetrics = await testSuite.measurePerformance(box, { data: largeInput }, 50);

      // Large input should take longer, but not 100x longer
      const latencyRatio = largeMetrics.latency.mean / smallMetrics.latency.mean;
      expect(latencyRatio).toBeLessThan(10); // Less than 10x slower
    });
  });
});
```

---

## 9. CI/CD Integration

### 9.1 CI/CD Pipeline Configuration

```yaml
# .github/workflows/box-tests.yml

name: Box Tests

on:
  pull_request:
    paths:
      - 'src/boxes/**'
      - 'src/boxes/__tests__/**'
  push:
    branches:
      - main
      - develop

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- src/boxes/__tests__/unit --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm test -- src/boxes/__tests__/integration

      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: integration-test-results
          path: test-results/

  property-tests:
    name: Property-Based Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run property tests
        run: npm test -- src/boxes/__tests__/property

  golden-tests:
    name: Golden Output Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run golden output tests
        run: npm test -- src/boxes/__tests__/golden
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

  regression-tests:
    name: Regression Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Download baselines
        uses: actions/download-artifact@v3
        with:
          name: performance-baselines
          path: baselines/

      - name: Run regression tests
        run: npm test -- src/boxes/__tests__/regression

      - name: Check for regressions
        run: |
          if [ -f regression-report.json ]; then
            echo "Regressions detected:"
            cat regression-report.json
            exit 1
          fi

  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run performance tests
        run: npm test -- src/boxes/__tests__/performance

      - name: Upload baselines
        uses: actions/upload-artifact@v3
        with:
          name: performance-baselines
          path: performance-baselines.json

      - name: Comment PR with results
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('performance-results.json', 'utf8'));

            const body = `## Performance Test Results\n\n` +
              `| Box | P50 Latency | P95 Latency | Avg Cost |\n` +
              `|-----|-------------|-------------|----------|\n` +
              results.map(r =>
                `| ${r.box} | ${r.p50}ms | ${r.p95}ms | $${r.cost} |`
              ).join('\n');

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

### 9.2 Pre-commit Hooks

```bash
#!/bin/bash
# .husky/pre-commit

# Run unit tests
echo "Running unit tests..."
npm test -- src/boxes/__tests__/unit --passWithNoTests

# Run linting
echo "Running linter..."
npm run lint -- --fix src/boxes

# Check for console.log statements
echo "Checking for console.log..."
if grep -r "console.log" src/boxes --exclude-dir=__tests__ --exclude-dir=dist; then
  echo "❌ Found console.log statements. Remove them before committing."
  exit 1
fi

echo "✅ Pre-commit checks passed!"
```

---

## 10. TypeScript Interfaces

### 10.1 Complete Test Suite Interfaces

```typescript
/**
 * Complete TypeScript Interfaces for Box Testing Framework
 */

// ==========================================================================
// Core Test Interfaces
// ==========================================================================

/**
 * Box test suite configuration
 */
export interface BoxTestSuite {
  name: string;
  description: string;
  version: string;

  // Test categories
  unitTests: BoxTestCase[];
  integrationTests: CompositionTestCase[];
  propertyTests: PropertyTest[];
  goldenTests: GoldenOutputTest[];
  regressionTests: RegressionTest[];
  performanceTests: PerformanceTest[];

  // Test configuration
  config: TestConfig;
}

/**
 * Test configuration
 */
export interface TestConfig {
  // Execution settings
  timeout: number;
  retries: number;
  parallel: boolean;
  maxParallel: number;

  // LLM settings
  llmProvider: 'mock' | 'real';
  llmModel: string;
  llmTemperature: number;

  // Performance settings
  performanceIterations: number;
  warmupIterations: number;

  // Thresholds
  similarityThreshold: number;
  performanceThresholds: PerformanceThresholds;

  // Reporting
  verbose: boolean;
  outputFormat: 'json' | 'junit' | 'html';
}

// ==========================================================================
// Test Case Interfaces
// ==========================================================================

/**
 * Box test case
 */
export interface BoxTestCase {
  name: string;
  description: string;
  box: AIBox;
  inputs: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  expected: {
    success: boolean;
    outputs?: Record<string, unknown>;
    error?: {
      code: string;
      message: string | RegExp;
    };
    schema?: Record<string, unknown>;
    executionTime?: {
      min?: number;
      max?: number;
    };
    cost?: {
      max: number;
    };
  };
  mockLLMResponse?: unknown;
  setup?: () => void | Promise<void>;
  teardown?: () => void | Promise<void>;
  skip?: boolean;
  only?: boolean;
}

/**
 * Composition test case
 */
export interface CompositionTestCase {
  name: string;
  description: string;
  composition: AIBox;
  inputs: Record<string, unknown>;
  expected: {
    success: boolean;
    outputs?: Record<string, unknown>;
    executionOrder?: string[];
    executionTime?: {
      min?: number;
      max?: number;
    };
  };
  setup?: () => void | Promise<void>;
  teardown?: () => void | Promise<void>;
  skip?: boolean;
  only?: boolean;
}

/**
 * Property test
 */
export interface PropertyTest {
  name: string;
  description: string;
  box: AIBox;
  property: (
    box: AIBox,
    inputs: Record<string, unknown>,
    result: BoxResult
  ) => boolean | Promise<boolean>;
  inputGenerator: any; // fast-check Arbitrary
  iterations?: number;
  seed?: number;
  skip?: boolean;
  only?: boolean;
}

/**
 * Golden output test
 */
export interface GoldenOutputTest {
  name: string;
  description: string;
  box: AIBox;
  goldenOutputs: GoldenOutput[];
  evaluators: LLMEvaluator[];
  similarityThreshold: number;
  updateGolden?: boolean; // Update golden outputs
  skip?: boolean;
  only?: boolean;
}

/**
 * Regression test
 */
export interface RegressionTest {
  name: string;
  description: string;
  box: AIBox;
  baselineVersion: string;
  inputSamples: Record<string, unknown>[];
  thresholds: RegressionThresholds;
  skip?: boolean;
  only?: boolean;
}

/**
 * Regression thresholds
 */
export interface RegressionThresholds {
  successRate: { min: number; severity: RegressionSeverity };
  avgLatency: { maxPercentChange: number; severity: RegressionSeverity };
  p95Latency: { maxPercentChange: number; severity: RegressionSeverity };
  avgCost: { maxPercentChange: number; severity: RegressionSeverity };
  qualityScores: {
    [key: string]: { maxPercentChange: number; severity: RegressionSeverity };
  };
}

/**
 * Regression severity
 */
export type RegressionSeverity = 'minor' | 'moderate' | 'severe';

/**
 * Performance test
 */
export interface PerformanceTest {
  name: string;
  description: string;
  box: AIBox;
  inputSamples: Record<string, unknown>[];
  iterations: number;
  thresholds: PerformanceThresholds;
  warmupIterations?: number;
  skip?: boolean;
  only?: boolean;
}

// ==========================================================================
// Result Interfaces
// ==========================================================================

/**
 * Test suite result
 */
export interface TestSuiteResult {
  suiteName: string;
  timestamp: number;
  duration: number;

  // Test results
  unitTests: TestResult[];
  integrationTests: TestResult[];
  propertyTests: PropertyTestResult[];
  goldenTests: GoldenTestResult[];
  regressionTests: RegressionTestResult[];
  performanceTests: PerformanceTestResult[];

  // Summary
  summary: TestSummary;

  // Artifacts
  artifacts: TestArtifact[];
}

/**
 * Test result
 */
export interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: TestError;
  metadata: Record<string, unknown>;
}

/**
 * Property test result
 */
export interface PropertyTestResult extends TestResult {
  iterations: number;
  discardCount: number;
  shrinks: number;
  counterexample?: Record<string, unknown>;
}

/**
 * Golden test result
 */
export interface GoldenTestResult extends TestResult {
  similarityScores: Record<string, number>;
  passedEvaluators: string[];
  failedEvaluators: string[];
  goldenOutput: GoldenOutput;
}

/**
 * Regression test result
 */
export interface RegressionTestResult extends TestResult {
  regressions: Regression[];
  improvements: Regression[];
  baseline: RegressionBaseline;
  current: RegressionBaseline;
}

/**
 * Performance test result
 */
export interface PerformanceTestResult extends TestResult {
  metrics: PerformanceMetrics;
  thresholds: PerformanceThresholds;
  passedThresholds: string[];
  failedThresholds: string[];
}

/**
 * Test summary
 */
export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  duration: number;
}

/**
 * Test error
 */
export interface TestError {
  message: string;
  stack?: string;
  actual?: unknown;
  expected?: unknown;
}

/**
 * Test artifact
 */
export interface TestArtifact {
  type: 'log' | 'screenshot' | 'coverage' | 'report';
  path: string;
  description: string;
}

// ==========================================================================
// Utility Interfaces
// ==========================================================================

/**
 * Golden output
 */
export interface GoldenOutput {
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  metadata: {
    description: string;
    created: string;
    version: string;
    tags: string[];
    author?: string;
  };
}

/**
 * LLM evaluator
 */
export interface LLMEvaluator {
  name: string;
  description: string;
  evaluate: (
    actual: Record<string, unknown>,
    expected: Record<string, unknown>
  ) => Promise<number>;
}

/**
 * Performance thresholds
 */
export interface PerformanceThresholds {
  maxLatencyMs: number;
  maxCostPerRequest: number;
  minThroughput: number;
  maxMemoryMB: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  latency: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p90: number;
    p95: number;
    p99: number;
    stdDev: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  cost: {
    totalCost: number;
    avgCostPerRequest: number;
  };
  resources: {
    memoryUsed: number;
    cpuTime: number;
    networkBytes: number;
  };
}

/**
 * Regression baseline
 */
export interface RegressionBaseline {
  boxName: string;
  boxVersion: string;
  timestamp: number;
  metrics: {
    successRate: number;
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
    avgCost: number;
    throughput: number;
    errorRate: number;
  };
  qualityScores: {
    semanticSimilarity: number;
    coherence: number;
    completeness: number;
  };
}

/**
 * Regression
 */
export interface Regression {
  metric: string;
  currentValue: number;
  baselineValue: number;
  percentChange: number;
  severity: 'minor' | 'moderate' | 'severe';
}
```

---

## 11. Testing Patterns

### 11.1 Test Data Generation

```typescript
/**
 * Test Data Generators
 */

import { fc } from 'fast-check';

export class TestDataGenerators {
  /**
   * Generate valid box inputs
   */
  static boxInput() {
    return fc.record({
      data: fc.string(),
      format: fc.constantFrom('json', 'csv', 'text'),
      options: fc.option(
        fc.record({
          strict: fc.boolean(),
          verbose: fc.boolean(),
        }),
        { nilValue: undefined }
      ),
    });
  }

  /**
   * Generate observation inputs
   */
  static observationInput() {
    return fc.record({
      data: fc.stringMatching(/^[A-Z][a-z]+ is \$?\d+(\.\d+)?[MKB]?( with \d+% growth)?\.$/),
      maxObservations: fc.integer({ min: 1, max: 100 }),
    });
  }

  /**
   * Generate financial data
   */
  static financialData() {
    return fc.record({
      revenue: fc.float({ min: 0, max: 1000000 }),
      growth: fc.float({ min: -100, max: 100 }),
      customers: fc.integer({ min: 0, max: 1000000 }),
      quarter: fc.constantFrom('Q1', 'Q2', 'Q3', 'Q4'),
      year: fc.integer({ min: 2020, max: 2030 }),
    });
  }

  /**
   * Generate box compositions
   */
  static boxComposition() {
    return fc.record({
      type: fc.constantFrom('sequence', 'parallel', 'conditional', 'loop'),
      boxes: fc.array(fc.anything(), { minLength: 1, maxLength: 10 }),
      config: fc.option(
        fc.record({
          stopOnError: fc.boolean(),
          mergeStrategy: fc.constantFrom('all', 'first', 'last', 'merge'),
          maxIterations: fc.integer({ min: 1, max: 100 }),
        }),
        { nilValue: undefined }
      ),
    });
  }

  /**
   * Generate test scenarios
   */
  static testScenario() {
    return fc.record({
      name: fc.string(),
      description: fc.string(),
      priority: fc.constantFrom('low', 'medium', 'high', 'critical'),
      tags: fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
      timeout: fc.integer({ min: 1000, max: 60000 }),
      retries: fc.integer({ min: 0, max: 5 }),
    });
  }
}
```

### 11.2 Test Organization Patterns

```typescript
/**
 * Test Organization Patterns
 */

// Pattern 1: Test Suite Per Box
export class ObservationBoxTestSuite {
  private tests: BoxTestSuite;

  constructor() {
    this.tests = {
      name: 'ObservationBox Tests',
      description: 'Complete test suite for ObservationBox',
      version: '1.0.0',

      unitTests: this.getUnitTests(),
      integrationTests: this.getIntegrationTests(),
      propertyTests: this.getPropertyTests(),
      goldenTests: this.getGoldenTests(),
      regressionTests: this.getRegressionTests(),
      performanceTests: this.getPerformanceTests(),

      config: this.getTestConfig(),
    };
  }

  private getUnitTests(): BoxTestCase[] {
    return [
      {
        name: 'extracts simple observation',
        description: 'Should extract a single observation',
        box: new ObservationBox({ extractionMethod: 'pattern' }),
        inputs: { data: 'Revenue is $1.2M.' },
        expected: {
          success: true,
          outputs: {
            observations: expect.arrayContaining([
              expect.stringContaining('revenue'),
            ]),
          },
        },
      },
      // ... more unit tests
    ];
  }

  private getIntegrationTests(): CompositionTestCase[] {
    return [
      // ... integration tests
    ];
  }

  private getPropertyTests(): PropertyTest[] {
    return [
      // ... property tests
    ];
  }

  private getGoldenTests(): GoldenOutputTest[] {
    return [
      // ... golden tests
    ];
  }

  private getRegressionTests(): RegressionTest[] {
    return [
      // ... regression tests
    ];
  }

  private getPerformanceTests(): PerformanceTest[] {
    return [
      // ... performance tests
    ];
  }

  private getTestConfig(): TestConfig {
    return {
      timeout: 5000,
      retries: 3,
      parallel: true,
      maxParallel: 10,
      llmProvider: 'mock',
      llmModel: 'gpt-4',
      llmTemperature: 0,
      performanceIterations: 100,
      warmupIterations: 10,
      similarityThreshold: 0.8,
      performanceThresholds: {
        maxLatencyMs: 2000,
        maxCostPerRequest: 0.01,
        minThroughput: 1,
        maxMemoryMB: 10,
      },
      verbose: false,
      outputFormat: 'json',
    };
  }

  async run(): Promise<TestSuiteResult> {
    // Implementation to run all tests
    throw new Error('Not implemented');
  }
}

// Pattern 2: Shared Test Utilities
export class BoxTestUtils {
  static async executeBox(
    box: AIBox,
    inputs: Record<string, unknown>,
    options: { timeout?: number; debug?: boolean } = {}
  ): Promise<BoxResult> {
    return box.execute({
      executionId: `test-${Date.now()}`,
      workflowId: 'test-workflow',
      causalChainId: 'test-chain',
      inputs,
      parameters: {},
      options: {
        timeout: options.timeout || 5000,
        dryRun: false,
        debug: options.debug || false,
      },
      metadata: {
        triggeredBy: 'test',
        timestamp: Date.now(),
        environment: 'development',
      },
    });
  }

  static createMockLLMProvider(responses: Record<string, unknown>): MockLLMProvider {
    const mock = new MockLLMProvider();
    Object.entries(responses).forEach(([prompt, response]) => {
      mock.setResponse(prompt, response);
    });
    return mock;
  }

  static loadGoldenOutputs(boxName: string): Promise<GoldenOutput[]> {
    const filePath = path.join(
      __dirname,
      'golden',
      'outputs',
      boxName,
      'golden-outputs.json'
    );
    return fs.readFile(filePath, 'utf-8').then(JSON.parse);
  }

  static async measureBoxPerformance(
    box: AIBox,
    inputs: Record<string, unknown>,
    iterations: number = 100
  ): Promise<PerformanceMetrics> {
    const suite = new PerformanceTestSuite();
    return suite.measurePerformance(box, inputs, iterations);
  }
}

// Pattern 3: Test Factories
export class BoxTestFactory {
  static createUnitTest(box: AIBox, testCase: Partial<BoxTestCase>): BoxTestCase {
    return {
      name: 'test',
      description: 'Test description',
      box,
      inputs: {},
      expected: { success: true },
      ...testCase,
    };
  }

  static createIntegrationTest(
    composition: AIBox,
    testCase: Partial<CompositionTestCase>
  ): CompositionTestCase {
    return {
      name: 'test',
      description: 'Test description',
      composition,
      inputs: {},
      expected: { success: true },
      ...testCase,
    };
  }

  static createPropertyTest(
    box: AIBox,
    property: (box: AIBox, inputs: any, result: BoxResult) => boolean,
    generator: any
  ): PropertyTest {
    return {
      name: 'property-test',
      description: 'Property test description',
      box,
      property,
      inputGenerator: generator,
      iterations: 100,
    };
  }
}
```

---

## 12. Best Practices

### 12.1 Testing Best Practices

1. **Test Isolation**
   - Each test should be independent
   - Use `beforeEach` and `afterEach` for setup/teardown
   - Avoid shared state between tests
   - Clean up resources (files, connections, etc.)

2. **Test Naming**
   - Use descriptive test names
   - Follow pattern: "should [expected behavior] when [condition]"
   - Example: "should extract observations when input is valid"

3. **Test Coverage**
   - Aim for >80% code coverage
   - Test all code paths (happy path, errors, edge cases)
   - Use coverage reports to identify gaps
   - Focus on critical paths first

4. **Test Speed**
   - Unit tests should run in milliseconds
   - Mock external dependencies (LLM calls, APIs)
   - Use parallel execution where safe
   - Separate fast tests from slow tests

5. **Test Maintenance**
   - Keep tests simple and readable
   - Avoid test logic duplication
   - Update tests when requirements change
   - Remove obsolete tests

6. **Semantic Testing**
   - Test meaning, not just syntax
   - Use similarity scoring for LLM outputs
   - Focus on key information preservation
   - Validate reasoning quality

7. **Nondeterminism Handling**
   - Use seeded random number generators
   - Run multiple iterations for statistical confidence
   - Document expected variance
   - Use appropriate statistical tests

8. **Cost Management**
   - Mock LLM calls when possible
   - Cache LLM responses in tests
   - Limit LLM test iterations
   - Use cheaper models for testing

9. **Actionable Failures**
   - Provide clear error messages
   - Include input/output in failure messages
   - Suggest fixes for common failures
   - Log detailed execution context

10. **Documentation**
    - Document complex test scenarios
    - Explain why certain tests exist
    - Document test data and fixtures
    - Keep test docs in sync with code

### 12.2 Test Data Management

1. **Fixture Organization**
   ```
   fixtures/
   ├── inputs/
   │   ├── valid/
   │   ├── invalid/
   │   └── edge-cases/
   ├── outputs/
   │   ├── golden/
   │   └── baselines/
   └── mocks/
       ├── llm-responses/
       └── api-responses/
   ```

2. **Test Data Versioning**
   - Version golden outputs
   - Track test data changes
   - Use git LFS for large files
   - Document data provenance

3. **Privacy & Security**
   - Never use real user data in tests
   - Sanitize PII from test data
   - Use synthetic data generators
   - Secure API keys in tests

---

## 13. Anti-Patterns

### 13.1 Testing Anti-Patterns to Avoid

1. **Testing Implementation Details**
   ```typescript
   // ❌ BAD: Tests internal implementation
   it('should set extracted flag to true', () => {
     expect(box.extracted).toBe(true);
   });

   // ✅ GOOD: Tests observable behavior
   it('should return extracted observations', () => {
     expect(result.outputs.observations.length).toBeGreaterThan(0);
   });
   ```

2. **Brittle Golden Outputs**
   ```typescript
   // ❌ BAD: Exact match fails on minor variations
   expect(result.outputs.observations).toEqual([
     'Revenue is $1.2M',
     'Growth is 15%',
   ]);

   // ✅ GOOD: Semantic similarity allows variations
   expect(result.outputs.observations).toEqual(
     expect.arrayContaining([
       expect.stringContaining('revenue'),
       expect.stringContaining('growth'),
     ])
   );
   ```

3. **Ignoring Nondeterminism**
   ```typescript
   // ❌ BAD: Single run doesn't catch variance issues
   it('should produce consistent output', async () => {
     const result = await box.execute(context);
     expect(result.success).toBe(true);
   });

   // ✅ GOOD: Multiple runs catch variance
   it('should produce consistent output across runs', async () => {
     const results = await Promise.all(
       Array(10).fill(null).map(() => box.execute(context))
     );
     const successRate = results.filter(r => r.success).length / results.length;
     expect(successRate).toBeGreaterThan(0.9);
   });
   ```

4. **Testing Mocked Behavior**
   ```typescript
   // ❌ BAD: Tests the mock, not the box
   it('should call LLM with correct prompt', async () => {
     mockLLM.setResponse({ observations: [] });
     await box.execute(context);
     expect(mockLLM.verifyCalled('expected prompt')).toBe(true);
   });

   // ✅ GOOD: Tests the box behavior
   it('should extract observations from data', async () => {
     mockLLM.setResponse({ observations: ['Revenue is $1.2M'] });
     const result = await box.execute(context);
     expect(result.outputs.observations).toContain('Revenue is $1.2M');
   });
   ```

5. **Over-Specified Tests**
   ```typescript
   // ❌ BAD: Tests too many things at once
   it('should work correctly', async () => {
     const result = await box.execute(context);
     expect(result.success).toBe(true);
     expect(result.outputs.observations).toHaveLength(2);
     expect(result.metrics.duration).toBeLessThan(100);
     expect(result.logs).toHaveLength(3);
     expect(result.validation.score).toBe(1);
   });

   // ✅ GOOD: Separate concerns
   it('should extract observations successfully', async () => {
     const result = await box.execute(context);
     expect(result.success).toBe(true);
     expect(result.outputs.observations).toHaveLength(2);
   });

   it('should execute quickly', async () => {
     const result = await box.execute(context);
     expect(result.metrics.duration).toBeLessThan(100);
   });
   ```

6. **Fragile Test Ordering**
   ```typescript
   // ❌ BAD: Tests depend on execution order
   describe('Test Suite', () => {
     let sharedState: any;

     it('test 1', () => {
       sharedState = { value: 1 };
     });

     it('test 2', () => {
       expect(sharedState.value).toBe(1); // Fails if run alone
     });
   });

   // ✅ GOOD: Each test is independent
   describe('Test Suite', () => {
     it('test 1', () => {
       const state = { value: 1 };
       expect(state.value).toBe(1);
     });

     it('test 2', () => {
       const state = { value: 1 };
       expect(state.value).toBe(1);
     });
   });
   ```

---

## 14. Example Test Suite

### 14.1 Complete Example: ObservationBox

```typescript
/**
 * Complete Test Suite for ObservationBox
 *
 * This file demonstrates all testing patterns for a single box type.
 */

import { ObservationBox } from '../boxes/observation';
import { BoxTestSuite, BoxTestCase } from '../test-utils/box-test-suite';
import { MockLLMProvider } from '../test-utils/llm-mock';
import { BoxAssertions } from '../test-utils/assertions';
import { TestDataGenerators } from '../test-utils/generators';
import { GoldenOutputTestSuite } from '../test-utils/golden-test';
import { RegressionDetector } from '../test-utils/regression';
import { PerformanceTestSuite } from '../test-utils/performance';

// ==========================================================================
// Unit Tests
// ==========================================================================

describe('ObservationBox - Unit Tests', () => {
  let box: ObservationBox;
  let mockLLM: MockLLMProvider;
  let assertions: BoxAssertions;

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    box = new ObservationBox({ extractionMethod: 'pattern' });
    assertions = new BoxAssertions();
  });

  describe('basic functionality', () => {
    it('should extract observations from simple text', async () => {
      const result = await box.execute({
        executionId: 'test-1',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: {
          data: 'Revenue is $1.2M.',
        },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      assertions.assertSuccess(result);
      expect(result.outputs.observations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('revenue'),
        ])
      );
    });

    it('should handle empty input gracefully', async () => {
      const result = await box.execute({
        executionId: 'test-2',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: {
          data: '',
        },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      assertions.assertSuccess(result);
      expect(result.outputs.observations).toEqual([]);
    });

    it('should validate required inputs', async () => {
      const result = await box.execute({
        executionId: 'test-3',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: {},
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      assertions.assertFailure(result);
      expect(result.validation.valid).toBe(false);
    });
  });

  describe('parameter handling', () => {
    it('should respect maxObservations limit', async () => {
      const box = new ObservationBox({
        extractionMethod: 'pattern',
        maxObservations: 2,
      });

      const result = await box.execute({
        executionId: 'test-4',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: {
          data: 'Obs1. Obs2. Obs3. Obs4. Obs5.',
        },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      assertions.assertArrayLength(result.outputs.observations, 0, 2);
    });

    it('should use different extraction methods', async () => {
      // Pattern method
      const patternBox = new ObservationBox({ extractionMethod: 'pattern' });
      const patternResult = await patternBox.execute({
        executionId: 'test-5',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: { data: 'Revenue is $1.2M' },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(patternResult.success).toBe(true);

      // LLM method (with mock)
      mockLLM.setResponse({ observations: ['Mocked observation'] });
      const llmBox = new ObservationBox({ extractionMethod: 'llm' });
      const llmResult = await llmBox.execute({
        executionId: 'test-6',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: { data: 'Revenue is $1.2M' },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      expect(llmResult.success).toBe(true);
      expect(llmResult.outputs.observations).toContain('Mocked observation');
    });
  });

  describe('error handling', () => {
    it('should handle malformed input gracefully', async () => {
      const result = await box.execute({
        executionId: 'test-7',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: {
          data: null as any,
        },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      // Should either fail or return empty observations
      if (result.success) {
        expect(result.outputs.observations).toEqual([]);
      } else {
        assertions.assertFailure(result);
      }
    });

    it('should handle LLM failures gracefully', async () => {
      mockLLM.setFailureRate(1.0); // Always fail

      const box = new ObservationBox({ extractionMethod: 'llm' });
      const result = await box.execute({
        executionId: 'test-8',
        workflowId: 'test-workflow',
        causalChainId: 'test-chain',
        inputs: { data: 'Revenue is $1.2M' },
        parameters: {},
        options: { timeout: 5000 },
        metadata: {
          triggeredBy: 'test',
          timestamp: Date.now(),
          environment: 'development',
        },
      });

      assertions.assertFailure(result);
      expect(result.error?.retryable).toBe(true);
    });
  });

  describe('cost estimation', () => {
    it('should estimate cost accurately', () => {
      const patternBox = new ObservationBox({ extractionMethod: 'pattern' });
      const llmBox = new ObservationBox({ extractionMethod: 'llm' });

      const patternEstimate = patternBox.estimateCost({ data: 'test' });
      const llmEstimate = llmBox.estimateCost({ data: 'test' });

      expect(patternEstimate.cost).toBeLessThan(llmEstimate.cost);
      expect(patternEstimate.duration).toBeLessThan(llmEstimate.duration);
    });
  });
});

// ==========================================================================
// Integration Tests
// ==========================================================================

describe('ObservationBox - Integration Tests', () => {
  it('works in serial composition', async () => {
    const box1 = new ObservationBox({ extractionMethod: 'pattern' });
    const box2 = new ObservationBox({ extractionMethod: 'pattern' });

    const sequence = new SerialBox([box1, box2]);

    const result = await sequence.execute({
      executionId: 'integration-1',
      workflowId: 'test-workflow',
      causalChainId: 'test-chain',
      inputs: {
        data: 'Revenue is $1.2M. Growth is 15%.',
      },
      parameters: {},
      options: { timeout: 10000 },
      metadata: {
        triggeredBy: 'test',
        timestamp: Date.now(),
        environment: 'development',
      },
    });

    expect(result.success).toBe(true);
    expect(result.outputs.box_0).toBeDefined();
    expect(result.outputs.box_1).toBeDefined();
  });

  it('works in parallel composition', async () => {
    const box1 = new ObservationBox({ extractionMethod: 'pattern' });
    const box2 = new ObservationBox({ extractionMethod: 'pattern' });

    const parallel = new ParallelBox([box1, box2], 'all');

    const result = await parallel.execute({
      executionId: 'integration-2',
      workflowId: 'test-workflow',
      causalChainId: 'test-chain',
      inputs: {
        data: 'Revenue is $1.2M.',
      },
      parameters: {},
      options: { timeout: 10000 },
      metadata: {
        triggeredBy: 'test',
        timestamp: Date.now(),
        environment: 'development',
      },
    });

    expect(result.success).toBe(true);
  });
});

// ==========================================================================
// Property-Based Tests
// ==========================================================================

describe('ObservationBox - Property Tests', () => {
  it('always returns array of strings', async () => {
    const box = new ObservationBox({ extractionMethod: 'pattern' });

    await fc.assert(
      fc.asyncProperty(fc.string(), async (input) => {
        const result = await box.execute({
          executionId: 'property-1',
          workflowId: 'test-workflow',
          causalChainId: 'test-chain',
          inputs: { data: input },
          parameters: {},
          options: { timeout: 5000 },
          metadata: {
            triggeredBy: 'test',
            timestamp: Date.now(),
            environment: 'development',
          },
        });

        if (!result.success) return true;

        return Array.isArray(result.outputs.observations) &&
               result.outputs.observations.every(obs => typeof obs === 'string');
      }),
      { numRuns: 100 }
    );
  });

  it('never exceeds maxObservations', async () => {
    const maxObs = 10;
    const box = new ObservationBox({
      extractionMethod: 'pattern',
      maxObservations: maxObs,
    });

    await fc.assert(
      fc.asyncProperty(fc.string(), async (input) => {
        const result = await box.execute({
          executionId: 'property-2',
          workflowId: 'test-workflow',
          causalChainId: 'test-chain',
          inputs: { data: input },
          parameters: {},
          options: { timeout: 5000 },
          metadata: {
            triggeredBy: 'test',
            timestamp: Date.now(),
            environment: 'development',
          },
        });

        if (!result.success) return true;

        return result.outputs.observations.length <= maxObs;
      }),
      { numRuns: 100 }
    );
  });
});

// ==========================================================================
// Performance Tests
// ==========================================================================

describe('ObservationBox - Performance Tests', () => {
  let testSuite: PerformanceTestSuite;

  beforeEach(() => {
    testSuite = new PerformanceTestSuite();
  });

  it('meets latency targets for pattern extraction', async () => {
    const box = new ObservationBox({ extractionMethod: 'pattern' });
    const metrics = await testSuite.measurePerformance(
      box,
      { data: 'Revenue is $1.2M with 15% growth.' },
      100
    );

    expect(metrics.latency.p95).toBeLessThan(50);
    expect(metrics.latency.mean).toBeLessThan(20);
  });

  it('meets cost targets', async () => {
    const box = new ObservationBox({ extractionMethod: 'pattern' });
    const metrics = await testSuite.measurePerformance(
      box,
      { data: 'Revenue is $1.2M with 15% growth.' },
      100
    );

    expect(metrics.cost.avgCostPerRequest).toBeLessThan(0.0001);
  });

  it('achieves target throughput', async () => {
    const box = new ObservationBox({ extractionMethod: 'pattern' });
    const metrics = await testSuite.measurePerformance(
      box,
      { data: 'Revenue is $1.2M with 15% growth.' },
      100
    );

    expect(metrics.throughput.requestsPerSecond).toBeGreaterThan(50);
  });
});
```

---

## Conclusion

This comprehensive testing framework for Fractured AI Boxes addresses the unique challenges of testing LLM-based, nondeterministic components. The framework provides:

1. **Multi-layered testing** - Unit, integration, property, golden output, regression, and performance tests
2. **Semantic validation** - LLM-based evaluation of output quality
3. **Nondeterminism handling** - Statistical testing and similarity scoring
4. **Actionable diagnostics** - Clear failure messages and debugging info
5. **Scalable architecture** - Tests scale to large box libraries

### Key Takeaways

- **Test meaning, not syntax** - Use semantic similarity for LLM outputs
- **Embrace nondeterminism** - Statistical testing, not exact matches
- **Mock external dependencies** - LLM calls, APIs, file I/O
- **Measure everything** - Latency, cost, quality, resources
- **Automate quality gates** - CI/CD integration with regression detection
- **Maintain golden outputs** - Version-controlled, curated test cases
- **Document everything** - Test intent, data provenance, known issues

### Implementation Roadmap

**Phase 1 (Weeks 1-2)**: Core Testing Infrastructure
- Implement BoxTestSuite, MockLLMProvider, BoxAssertions
- Set up test framework (Jest/Vitest)
- Create base test templates

**Phase 2 (Weeks 3-4)**: Unit & Integration Tests
- Write unit tests for all 18 reasoning box types
- Write integration tests for compositions
- Achieve >80% code coverage

**Phase 3 (Weeks 5-6)**: Advanced Testing
- Implement property-based tests
- Build golden output test suite
- Create LLM evaluators

**Phase 4 (Weeks 7-8)**: Performance & Regression
- Implement performance benchmarking
- Build regression detection system
- Set up CI/CD integration

### Next Steps

1. Implement the testing framework in `src/boxes/__tests__/`
2. Create test utilities in `src/boxes/test-utils/`
3. Write tests for each box type
4. Set up CI/CD pipeline
5. Monitor and maintain test suite

---

**Document Status**: ✅ **RESEARCH COMPLETE**
**Last Updated**: 2026-03-08
**Version**: 1.0.0
**Author**: POLLN Breakdown Engine - Round 3 Research Agent
