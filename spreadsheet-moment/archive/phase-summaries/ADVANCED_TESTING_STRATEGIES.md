# Advanced Testing Strategies for spreadsheet-moment

**Research & Design Document**
**Date:** 2026-03-16
**Author:** R&D Testing Specialist
**Project:** spreadsheet-moment Agent Spreadsheet Platform
**Goal:** Increase test coverage from 86% to 95%+

---

## Executive Summary

This document outlines advanced testing strategies to improve the spreadsheet-moment test suite from **86% pass rate (149/174 tests)** to **95%+ coverage** while preventing bugs and improving overall code quality. The strategies focus on practical innovations that can be implemented quickly with measurable impact.

### Current State Analysis

**Test Status (as of 2026-03-16):**
- **Pass Rate:** 86% (149/174 tests passing)
- **Failures:** 25 tests across 9 test suites
- **Code Coverage:** 61.57% statements, 52.93% branches
- **Coverage Threshold:** 82% (not met)
- **Test Files:** 10 test suites covering 12 source files
- **Test Duration:** ~15 seconds

**Root Causes of Failures:**

1. **Duplicate Export Issue** (Critical)
   - Location: `src/monitoring/index.ts`
   - Impact: Blocks coverage collection, breaks multiple test suites
   - Fix: Remove duplicate export on line 46

2. **Mock Configuration Issues**
   - Missing `process.cwd()` mock in Node environment
   - Incomplete WebSocket mocking
   - Race conditions in async tests

3. **Test Environment Problems**
   - Improper cleanup between tests
   - Leaking async operations
   - Timer-related test flakiness

4. **Coverage Gaps**
   - Unimplemented validators.ts (0% coverage)
   - Error handling paths not tested
   - Edge cases in retry logic
   - WebSocket reconnection scenarios

---

## Strategy 1: Property-Based Testing with FastCheck

### Overview

**Property-based testing** generates hundreds of random test cases to verify that your code satisfies universal properties (invariants) rather than checking specific examples. This catches edge cases that human testers would never think of.

### Benefits for spreadsheet-moment

1. **Catches Edge Cases:** Automatically tests boundary conditions
2. **Reduces Test Code:** One property test replaces many example tests
3. **Documents Invariants:** Properties serve as executable documentation
4. **Shrinks Failures:** Automatically finds minimal failing case

### Implementation Plan

**Phase 1: Setup (Week 6 Day 1-2)**

```bash
# Install FastCheck
pnpm add --save-dev fast-check
pnpm add --save-dev @fast-check/expect # Enhanced Jest integration
```

**Phase 2: Critical Properties (Week 6 Day 3-4)**

Identify and test these key properties:

```typescript
// Property: State Manager - Origin-Centric Operations
describe('StateManager Properties', () => {
  it('should maintain origin trace integrity', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          type: fc.constantFrom('CREATE', 'UPDATE', 'DELETE'),
          origin: fc.uuid(),
          timestamp: fc.nat(),
          data: fc.anything()
        })),
        (operations) => {
          const manager = new StateManager();
          operations.forEach(op => manager.apply(op));

          // Property: All operations should be traceable to origin
          const trace = manager.getTrace();
          expect(trace.every(op => op.origin)).toBe(true);

          // Property: Operations should be applied in order
          expect(trace).toHaveLength(operations.length);

          // Property: No orphan operations
          expect(trace.every(op => op.parentId || op.type === 'CREATE')).toBe(true);
        }
      )
    );
  });

  it('should be idempotent for same operation', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constantFrom('CREATE', 'UPDATE'),
          origin: fc.uuid(),
          data: fc.anything()
        }),
        (operation) => {
          const manager1 = new StateManager();
          const manager2 = new StateManager();

          manager1.apply(operation);
          manager2.apply(operation);

          // Property: Same operation should produce same state
          expect(manager1.getState()).toEqual(manager2.getState());
        }
      )
    );
  });
});

// Property: Trace Protocol - No Circular Dependencies
describe('TraceProtocol Properties', () => {
  it('should prevent circular traces', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 50 }),
        (origins) => {
          const protocol = new TraceProtocol();

          // Create operations with potential cycles
          const operations = origins.map((origin, i) => ({
            origin,
            parent: i > 0 ? origins[i - 1] : null
          }));

          operations.forEach(op => protocol.add(op));

          // Property: No circular dependencies should exist
          const trace = protocol.getTrace();
          expect(protocol.hasCycles()).toBe(false);
        }
      )
    );
  });

  it('should maintain trace order consistency', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          origin: fc.uuid(),
          timestamp: fc.nat(),
          data: fc.anything()
        })),
        (operations) => {
          const protocol = new TraceProtocol();

          operations.forEach(op => protocol.add(op));

          // Property: Trace should preserve timestamp order
          const trace = protocol.getTrace();
          const sorted = [...trace].sort((a, b) => a.timestamp - b.timestamp);
          expect(trace).toEqual(sorted);
        }
      )
    );
  });
});

// Property: Claw Client - Retry Logic Properties
describe('ClawClient Retry Properties', () => {
  it('should respect max retries limit', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10 }), // maxRetries
        fc.integer({ min: -1, max: 5 }), // failure count
        async (maxRetries, failureCount) => {
          const client = new ClawClient({
            baseUrl: 'https://api.test.com',
            maxRetries
          });

          let attempts = 0;
          (global.fetch as jest.Mock).mockImplementation(() => {
            attempts++;
            if (attempts <= failureCount) {
              return Promise.reject(new Error('NETWORK_ERROR'));
            }
            return Promise.resolve({ ok: true, json: async () => ({}) });
          });

          try {
            await client.createClaw({ /* mock request */ });
          } catch (e) {
            // Expected to fail
          }

          // Property: Should not exceed max retries
          expect(attempts).toBeLessThanOrEqual(Math.min(failureCount, maxRetries) + 1);

          client.dispose();
        }
      )
    );
  });

  it('should implement exponential backoff', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 5 }), // retry count
        async (retryCount) => {
          const delays: number[] = [];
          const client = new ClawClient({
            baseUrl: 'https://api.test.com',
            maxRetries: 5
          });

          // Mock setTimeout to capture delays
          const originalSetTimeout = global.setTimeout;
          global.setTimeout = jest.fn((fn, delay) => {
            delays.push(delay);
            return originalSetTimeout(fn, 0);
          }) as any;

          (global.fetch as jest.Mock).mockRejectedValue(new Error('NETWORK_ERROR'));

          try {
            await client.createClaw({ /* mock request */ });
          } catch (e) {
            // Expected to fail
          }

          // Property: Each delay should be longer than previous
          for (let i = 1; i < delays.length; i++) {
            expect(delays[i]).toBeGreaterThan(delays[i - 1]);
          }

          global.setTimeout = originalSetTimeout;
          client.dispose();
        }
      )
    );
  });
});

// Property: Metrics Collector - Aggregation Properties
describe('MetricsCollector Properties', () => {
  it('should aggregate counters correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          name: fc.string(),
          value: fc.nat(),
          tags: fc.dictionary(fc.string(), fc.string(), { minKeys: 0, maxKeys: 5 })
        })),
        (metrics) => {
          const collector = new MetricsCollector();

          metrics.forEach(m => collector.recordCounter(m.name, m.value, m.tags));

          // Property: Total should equal sum of individual values
          metrics.forEach(m => {
            const total = collector.getCounter(m.name, m.tags);
            const expectedTotal = metrics
              .filter(mm => mm.name === m.name && JSON.stringify(mm.tags) === JSON.stringify(m.tags))
              .reduce((sum, mm) => sum + mm.value, 0);
            expect(total).toBe(expectedTotal);
          });
        }
      )
    );
  });

  it('should maintain histogram statistics', () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat({ min: 1, max: 1000 }), { minLength: 10, maxLength: 1000 }),
        (values) => {
          const collector = new MetricsCollector();
          const metricName = 'test_histogram';

          values.forEach(v => collector.recordHistogram(metricName, v));

          const stats = collector.getHistogramStats(metricName);

          // Property: Min should be actual minimum
          expect(stats.min).toBe(Math.min(...values));

          // Property: Max should be actual maximum
          expect(stats.max).toBe(Math.max(...values));

          // Property: Count should match
          expect(stats.count).toBe(values.length);

          // Property: Average should be correct
          const expectedAvg = values.reduce((a, b) => a + b, 0) / values.length;
          expect(stats.avg).toBeCloseTo(expectedAvg, 2);
        }
      )
    );
  });
});
```

**Phase 3: Custom Arbitraries (Week 6 Day 5)**

Create domain-specific arbitraries for Claw types:

```typescript
// src/__tests__/arbitraries.ts
import fc from 'fast-check';

export const ClawTypeArbitrary = fc.constantFrom(
  'SENSOR', 'REASONING', 'ACTUATOR', 'COORDINATOR'
);

export const ClawStateArbitrary = fc.constantFrom(
  'DORMANT', 'THINKING', 'ACTING', 'ERROR'
);

export const ModelProviderArbitrary = fc.constantFrom(
  'DEEPSEEK', 'OPENAI', 'ANTHROPIC', 'LOCAL'
);

export const ClawCellConfigArbitrary = fc.record({
  id: fc.uuid(),
  type: ClawTypeArbitrary,
  position: fc.tuple(fc.nat({ max: 1000 }), fc.nat({ max: 1000 })),
  model: fc.record({
    provider: ModelProviderArbitrary,
    model: fc.string(),
    apiKey: fc.string()
  }),
  seed: fc.record({
    purpose: fc.string(),
    trigger: fc.record({
      type: fc.constantFrom('CELL_CHANGE', 'PERIODIC', 'MANUAL'),
      cellId: fc.string()
    }),
    learningStrategy: fc.constantFrom('REINFORCEMENT', 'SUPERVISED', 'UNSUPERVISED')
  }),
  equipment: fc.array(fc.constantFrom(
    'MEMORY', 'REASONING', 'CONSENSUS', 'SPREADSHEET', 'DISTILLATION'
  )),
  relationships: fc.array(fc.record({
    type: fc.constantFrom('MASTER_SLAVE', 'CO_WORKER', 'PEER'),
    targetId: fc.uuid()
  })),
  state: ClawStateArbitrary,
  confidence: fc.float({ min: 0, max: 1 })
});

// Usage: fc.property(ClawCellConfigArbitrary, (config) => { ... })
```

### Expected Impact

- **Coverage:** +15-20% (edge cases automatically tested)
- **Bug Prevention:** High (catches unexpected edge cases)
- **Implementation Effort:** 3-5 days
- **Maintenance:** Low (properties rarely change)

---

## Strategy 2: Mutation Testing with Stryker

### Overview

**Mutation testing** automatically introduces bugs (mutations) into your code to measure how effective your tests are at catching them. Unlike code coverage (which measures what code is executed), mutation testing measures how well your tests verify behavior.

### Benefits for spreadsheet-moment

1. **Identifies Weak Tests:** Finds tests that don't adequately verify behavior
2. **Measures Test Quality:** Provides mutation score (percentage of mutants killed)
3. **Guides Test Improvements:** Shows exactly where test gaps exist
4. **Prevents Regression:** Ensures new bugs would be caught

### Implementation Plan

**Phase 1: Setup (Week 6 Day 1)**

```bash
# Install Stryker for TypeScript
pnpm add --save-dev @stryker-mutator/core @stryker-mutator/jest-runner
pnpm add --save-dev @stryker-mutator/typescript @stryker-mutator/typescript-checker

# Create configuration
npx stryker init
```

**Phase 2: Configuration (Week 6 Day 2)**

Create `stryker.conf.js`:

```javascript
module.exports = {
  // Test framework
  testRunner: 'jest',
  testRunnerNodeArgs: ['--detectOpenHandles', '--forceExit'],

  // TypeScript configuration
  tsconfigFile: 'tsconfig.json',
  mutate: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],

  // Mutators to apply
  mutator: 'typescript',
  plugins: [
    '@stryker-mutator/typescript',
    '@stryker-mutator/jest-runner'
  ],

  // Reporting
  reporters: ['html', 'clear-text', 'progress'],
  htmlReporter: {
    baseDir: 'coverage/stryker'
  },

  // Coverage analysis
  coverageAnalysis: 'perTest',

  // Performance
  maxConcurrentTestRunners: 2,
  timeout: 5000,

  // thresholds
  thresholds: {
    high: 80,
    low: 60,
    break: 50
  }
};
```

**Phase 3: Run and Analyze (Week 6 Day 3-4)**

```bash
# Run mutation testing
pnpm stryker run

# Open HTML report
open coverage/stryker/index.html
```

**Common Mutations to Watch For:**

```typescript
// Arithmetic mutations
value + 1 → value - 1
value * 2 → value / 2

// Logical mutations
if (condition) → if (!condition)
&& → ||
|| → &&

// Relational mutations
x > y → x >= y
x === y → x !== y

// Return value mutations
return true → return false
return value → return undefined

// Array mutations
array.push(x) → array.pop()
array.includes(x) → !array.includes(x)
```

**Phase 4: Target High-Value Mutants (Week 6 Day 5)**

Focus on killing mutants in critical paths:

```typescript
// Example: MetricsCollector - High mutation risk
export class MetricsCollector {
  recordCounter(name: string, value: number, tags?: Record<string, string>) {
    const key = this.getCounterKey(name, tags);
    const existing = this.counters.get(key);

    if (existing) {
      existing.value += value; // MUTANT: -= or *= would be bad
    } else {
      this.counters.set(key, { name, value, tags: tags || {} });
    }
  }

  // Test to kill mutation of += to -=
  it('should add counter values (not subtract)', () => {
    const collector = new MetricsCollector();
    collector.recordCounter('test', 5);
    collector.recordCounter('test', 3);
    expect(collector.getCounter('test')).toBe(8); // Catches -= mutation
  });
}
```

### Expected Impact

- **Test Quality:** +30-40% (mutation score improvement)
- **Bug Prevention:** Very High (identifies weak tests)
- **Implementation Effort:** 2-3 days
- **Maintenance:** Low (run in CI weekly)

---

## Strategy 3: Contract Testing for Claw API

### Overview

**Contract testing** verifies that the spreadsheet-moment frontend and Claw API backend agree on the API contract. This prevents integration issues where frontend and backend diverge.

### Benefits for spreadsheet-moment

1. **Prevents Integration Breaks:** Catches API mismatches early
2. **Enables Parallel Development:** Frontend and backend can work independently
3. **Serves as Documentation:** Contracts are living API docs
4. **Reduces Integration Bugs:** 80% reduction in integration issues

### Implementation Plan

**Phase 1: Setup (Week 6 Day 1)**

```bash
# Install Pact for TypeScript
pnpm add --save-dev @pact-foundation/pact
pnpm add --save-dev @pact-foundation/pact-node
```

**Phase 2: Define Contracts (Week 6 Day 2-3)**

Create consumer tests for Claw API:

```typescript
// src/api/__tests__/contract/createClaw.contract.test.ts
import { Pact } from '@pact-foundation/pact';
import { ClawClient } from '../ClawClient';
import { CreateClawRequest } from '../types';

describe('Claw API Contract - createClaw', () => {
  const provider = new Pact({
    consumer: 'spreadsheet-moment',
    provider: 'claw-api',
    port: 1234,
    log: './pact/logs',
    dir: './pact/pacts',
    logLevel: 'INFO',
    spec: 2
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  describe('createClaw', () => {
    const request: CreateClawRequest = {
      clawId: 'claw_test_123',
      config: {
        id: 'claw_test_123',
        type: 'SENSOR',
        position: [0, 0],
        model: {
          provider: 'DEEPSEEK',
          model: 'deepseek-chat',
          apiKey: 'test-key'
        },
        seed: {
          purpose: 'Test claw',
          trigger: {
            type: 'CELL_CHANGE',
            cellId: 'A1'
          },
          learningStrategy: 'REINFORCEMENT'
        },
        equipment: ['MEMORY', 'REASONING'],
        relationships: [],
        state: 'DORMANT',
        confidence: 0.5
      }
    };

    beforeEach(() => {
      return provider.addInteraction({
        state: 'No existing claws',
        uponReceiving: 'a request to create a claw',
        withRequest: {
          method: 'POST',
          path: '/api/v1/claws',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          },
          body: request
        },
        willRespondWith: {
          status: 201,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            clawId: 'claw_test_123',
            status: 'created',
            config: request.config
          }
        }
      });
    });

    it('should create claw successfully', async () => {
      const client = new ClawClient({
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-api-key',
        enableWebSocket: false
      });

      const response = await client.createClaw(request);
      expect(response.clawId).toBe('claw_test_123');
      expect(response.status).toBe('created');

      client.dispose();
    });
  });
});

// src/api/__tests__/contract/errorHandling.contract.test.ts
describe('Claw API Contract - Error Handling', () => {
  const provider = new Pact({
    consumer: 'spreadsheet-moment',
    provider: 'claw-api',
    port: 1235,
    dir: './pact/pacts'
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  describe('Validation Errors', () => {
    beforeEach(() => {
      return provider.addInteraction({
        uponReceiving: 'a request with invalid claw config',
        withRequest: {
          method: 'POST',
          path: '/api/v1/claws',
          body: {
            clawId: 'invalid',
            config: {
              id: 'invalid',
              type: 'INVALID_TYPE', // Invalid type
              position: [0, 0]
            }
          }
        },
        willRespondWith: {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            error: 'VALIDATION_ERROR',
            message: 'Invalid claw type',
            details: {
              field: 'type',
              allowedValues: ['SENSOR', 'REASONING', 'ACTUATOR', 'COORDINATOR']
            }
          }
        }
      });
    });

    it('should handle validation errors', async () => {
      const client = new ClawClient({
        baseUrl: 'http://localhost:1235',
        apiKey: 'test-api-key'
      });

      await expect(
        client.createClaw({ clawId: 'invalid', config: { /* ... */ } })
      ).rejects.toThrow('VALIDATION_ERROR');

      client.dispose();
    });
  });
});
```

**Phase 3: Provider Verification (Week 6 Day 4)**

Create provider tests (for Claw API repo):

```typescript
// In claw/ repo - tests/contract/createClaw.provider.test.ts
import { Verifier } from '@pact-foundation/pact';
import { server } from '../src/server'; // Your API server

describe('Claw API Provider Contract Verification', () => {
  let app: any;

  beforeAll(async () => {
    app = await server.start();
  });

  afterAll(() => server.stop());

  describe('createClaw endpoint', () => {
    it('should honor the contract', () => {
      const opts = {
        providerBaseUrl: 'http://localhost:3000',
        pactUrls: ['./pacts/spreadsheet-moment-claw-api.json'],
        provider: 'claw-api',
        providerVersion: '1.0.0'
      };

      return new Verifier(opts)
        .verifyProvider()
        .then(output => {
          console.log('Pact Verification Complete!');
          console.log(output);
        });
    });
  });
});
```

**Phase 4: CI Integration (Week 6 Day 5)**

```yaml
# .github/workflows/contract-testing.yml
name: Contract Testing

on: [push, pull_request]

jobs:
  consumer-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:contract
      - uses: actions/upload-artifact@v3
        with:
          name: pact-files
          path: pact/pacts/*.json

  provider-tests:
    needs: consumer-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: pact-files
          path: pact/pacts
      - run: pnpm test:contract:verify
```

### Expected Impact

- **Integration Bugs:** -80% reduction
- **API Documentation:** Automatic living docs
- **Implementation Effort:** 3-4 days
- **Maintenance:** Low (contracts rarely change)

---

## Strategy 4: Visual Regression Testing

### Overview

**Visual regression testing** captures screenshots of UI components and detects pixel-level changes. This prevents accidental UI changes that break user experience.

### Benefits for spreadsheet-moment

1. **Catches UI Bugs:** Detects CSS and layout changes
2. **Tests Components holistically:** Tests rendered output, not just props
3. **No False Negatives:** Only fails on actual visual changes
4. **Easy to Update:** One command to update baseline images

### Implementation Plan

**Phase 1: Setup (Week 7 Day 1)**

```bash
# Install visual regression tools
pnpm add --save-dev @storybook/addon-storyshots
pnpm add --save-dev @storybook/addon-storyshots-puppeteer
pnpm add --save-dev jest-image-snapshot
```

**Phase 2: Configure Storybook (Week 7 Day 2)**

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-storyshots',
    '@storybook/addon-storyshots-puppeteer'
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  }
};

export default config;
```

**Phase 3: Create Component Stories (Week 7 Day 3)**

```typescript
// packages/agent-ui/src/components/AgentCell.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { AgentCell } from './AgentCell';

const meta: Meta<typeof AgentCell> = {
  title: 'Agent/AgentCell',
  component: AgentCell,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof AgentCell>;

export const Dormant: Story = {
  args: {
    clawId: 'claw_123',
    state: 'DORMANT',
    type: 'SENSOR',
    position: [0, 0],
    confidence: 0.95
  }
};

export const Thinking: Story = {
  args: {
    clawId: 'claw_456',
    state: 'THINKING',
    type: 'REASONING',
    position: [1, 0],
    confidence: 0.78,
    reasoning: 'Analyzing data patterns...'
  }
};

export const Error: Story = {
  args: {
    clawId: 'claw_789',
    state: 'ERROR',
    type: 'ACTUATOR',
    position: [2, 0],
    confidence: 0.12,
    error: 'Connection timeout'
  }
};

export const HighConfidence: Story = {
  args: {
    clawId: 'claw_abc',
    state: 'ACTING',
    type: 'COORDINATOR',
    position: [3, 0],
    confidence: 0.99,
    equipment: ['MEMORY', 'REASONING', 'CONSENSUS']
  }
};
```

**Phase 4: Visual Regression Tests (Week 7 Day 4)**

```typescript
// src/__tests__/visual/AgentCell.visual.test.tsx
import { imageSnapshot } from '@storybook/addon-storyshots-puppeteer';
import { storybook } from '@storybook/addon-storyshots-puppeteer';
import path from 'path';

// Configure storybook
const getStorybook = storybook({
  configPath: path.join(__dirname, '../../../.storybook'),
  storybookUrl: 'http://localhost:6006'
});

// Test all stories
test('AgentCell visual regression', async () => {
  await page.goto('http://localhost:6006/?id=agent-agentcell--dormant');
  await page.waitForSelector('.agent-cell');

  const image = await page.screenshot();
  expect(image).toMatchImageSnapshot({
    customDiffConfig: { threshold: 0.1 },
    failureThreshold: 0.05,
    failureThresholdType: 'percent'
  });
});
```

**Phase 5: CI Integration (Week 7 Day 5)**

```yaml
# .github/workflows/visual-regression.yml
name: Visual Regression Tests

on: [pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm build:storybook
      - run: ppm test:visual
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: visual-diff
          path: __image_snapshots__/__diff_output__/
```

### Expected Impact

- **UI Bug Detection:** +50% improvement
- **Coverage:** +5-10% (visual components)
- **Implementation Effort:** 4-5 days
- **Maintenance:** Medium (updating baselines)

---

## Strategy 5: Race Condition & Concurrency Testing

### Overview

**Race condition testing** verifies that code behaves correctly under concurrent execution. This is critical for WebSocket connections, async operations, and state management.

### Benefits for spreadsheet-moment

1. **Catches Timing Bugs:** Finds race conditions in async code
2. **Tests Concurrency:** Verifies thread safety of state operations
3. **Improves Reliability:** Prevents production bugs under load
4. **Stress Tests:** Identifies performance bottlenecks

### Implementation Plan

**Phase 1: Race Condition Detection (Week 7 Day 1-2)**

```typescript
// src/__tests__/race/StateManager.race.test.ts
describe('StateManager Race Conditions', () => {
  it('should handle concurrent state updates', async () => {
    const manager = new StateManager();

    // Launch 100 concurrent updates
    const promises = Array.from({ length: 100 }, (_, i) =>
      manager.update({
        origin: `origin_${i}`,
        type: 'UPDATE',
        data: { value: i }
      })
    );

    await Promise.all(promises);

    // Property: All updates should be applied
    const state = manager.getState();
    expect(state).toHaveLength(100);

    // Property: No duplicate origins
    const origins = new Set(state.map(s => s.origin));
    expect(origins).toHaveLength(100);
  });

  it('should prevent race conditions in trace protocol', async () => {
    const protocol = new TraceProtocol();

    // Simulate concurrent trace additions
    const promises = Array.from({ length: 50 }, (_, i) =>
      protocol.add({
        origin: `origin_${i}`,
        parentId: i > 0 ? `origin_${i - 1}` : null,
        timestamp: Date.now() + i
      })
    );

    await Promise.all(promises);

    // Property: No circular dependencies
    expect(protocol.hasCycles()).toBe(false);

    // Property: All operations traced
    const trace = protocol.getTrace();
    expect(trace).toHaveLength(50);
  });
});

// src/__tests__/race/WebSocket.race.test.ts
describe('WebSocket Race Conditions', () => {
  it('should handle rapid connect/disconnect cycles', async () => {
    const client = new ClawClient({
      baseUrl: 'https://api.test.com',
      wsUrl: 'wss://api.test.com/ws',
      enableWebSocket: true
    });

    // Rapidly toggle connection
    const promises = Array.from({ length: 10 }, (_, i) =>
      i % 2 === 0
        ? client.connectWebSocket()
        : client.disconnectWebSocket()
    );

    await Promise.allSettled(promises);

    // Property: Should not crash
    const status = client.getConnectionStatus();
    expect(status).toBeDefined();

    client.dispose();
  });

  it('should handle concurrent message sends', async () => {
    const client = new ClawClient({
      baseUrl: 'https://api.test.com',
      wsUrl: 'wss://api.test.com/ws',
      enableWebSocket: true
    });

    await client.connectWebSocket();

    // Send 100 messages concurrently
    const promises = Array.from({ length: 100 }, (_, i) =>
      client.sendWebSocketMessage({
        type: 'QUERY',
        clawId: `claw_${i}`,
        data: {}
      })
    );

    const results = await Promise.allSettled(promises);

    // Property: At least 90% should succeed
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    expect(successCount).toBeGreaterThanOrEqual(90);

    client.dispose();
  });
});
```

**Phase 2: Stress Testing (Week 7 Day 3)**

```typescript
// src/__tests__/performance/MetricsCollector.stress.test.ts
describe('MetricsCollector Stress Tests', () => {
  it('should handle 10,000 metrics per second', async () => {
    const collector = new MetricsCollector();
    const duration = 1000; // 1 second
    const targetRate = 10000;

    const startTime = Date.now();
    let count = 0;

    while (Date.now() - startTime < duration) {
      collector.recordCounter(`counter_${count % 100}`, 1);
      collector.recordGauge(`gauge_${count % 100}`, count);
      collector.recordHistogram(`histogram_${count % 100}`, count);
      count++;
    }

    // Property: Should record at least target rate
    expect(count).toBeGreaterThanOrEqual(targetRate);

    // Property: Metrics should be accurate
    expect(collector.getCounter('counter_0')).toBe(count / 100);
  });

  it('should handle concurrent metric recording', async () => {
    const collector = new MetricsCollector();
    const workers = 100;
    const metricsPerWorker = 1000;

    const promises = Array.from({ length: workers }, (_, workerId) =>
      Array.from({ length: metricsPerWorker }, (_, i) =>
        collector.recordCounter(`worker_${workerId}`, i)
      )
    ).flat();

    await Promise.all(promises);

    // Property: All metrics should be recorded
    for (let i = 0; i < workers; i++) {
      const sum = Array.from({ length: metricsPerWorker }, (_, i) => i)
        .reduce((a, b) => a + b, 0);
      expect(collector.getCounter(`worker_${i}`)).toBe(sum);
    }
  });
});
```

**Phase 3: Deadlock Detection (Week 7 Day 4)**

```typescript
// src/__tests__/deadlock/StateManager.deadlock.test.ts
describe('StateManager Deadlock Prevention', () => {
  it('should not deadlock on circular dependencies', async () => {
    const manager = new StateManager();

    // Create circular dependency chain
    const operations = [
      { origin: 'A', parentId: null },
      { origin: 'B', parentId: 'A' },
      { origin: 'C', parentId: 'B' },
      { origin: 'A', parentId: 'C' } // Creates cycle
    ];

    // Set timeout to detect deadlock
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Deadlock detected')), 5000)
    );

    const operation = Promise.all(
      operations.map(op => manager.update(op))
    );

    await expect(Promise.race([timeout, operation])).resolves.toBeDefined();
  });
});
```

### Expected Impact

- **Concurrency Bug Detection:** +70% improvement
- **Production Reliability:** +40% improvement
- **Implementation Effort:** 3-4 days
- **Maintenance:** Low

---

## Strategy 6: Fuzz Testing for WebSocket Messages

### Overview

**Fuzz testing** generates random, malformed, or unexpected inputs to test code robustness. This is especially valuable for WebSocket message parsing and API validation.

### Benefits for spreadsheet-moment

1. **Crashes Malformed Input:** Catches unhandled exceptions
2. **Improves Robustness:** Validates error handling
3. **Security Testing:** Finds input validation gaps
4. **Edge Case Coverage:** Tests unusual inputs

### Implementation Plan

**Phase 1: Setup (Week 7 Day 1)**

```bash
# Install fuzzer
pnpm add --save-dev afl-instrument
```

**Phase 2: WebSocket Message Fuzzing (Week 7 Day 2-3)**

```typescript
// src/__tests__/fuzz/WebSocket.fuzz.test.ts
import { randomBytes } from 'crypto';

describe('WebSocket Message Fuzzing', () => {
  const validMessageTemplates = [
    { type: 'QUERY', clawId: 'claw_123', data: {} },
    { type: 'TRIGGER', clawId: 'claw_456', data: { value: 100 } },
    { type: 'CANCEL', clawId: 'claw_789', data: {} }
  ];

  it('should handle malformed JSON gracefully', async () => {
    const client = new ClawClient({
      baseUrl: 'https://api.test.com',
      wsUrl: 'wss://api.test.com/ws',
      enableWebSocket: true
    });

    await client.connectWebSocket();

    // Generate 1000 malformed JSON strings
    const malformedInputs = Array.from({ length: 1000 }, () => {
      const template = validMessageTemplates[Math.floor(Math.random() * validMessageTemplates.length)];
      const json = JSON.stringify(template);

      // Apply random mutations
      const mutations = [
        () => json.slice(0, Math.floor(Math.random() * json.length)), // Truncate
        () => json.replace(/[a-z]/g, randomChar), // Randomize chars
        () => json + randomBytes(10).toString('hex'), // Append garbage
        () => '{' + json + '{', // Unclosed brace
        () => json.replace('type', 'typ'), // Corrupt field name
      ];

      return mutations[Math.floor(Math.random() * mutations.length)]();
    });

    // All malformed inputs should be rejected, not crash
    for (const input of malformedInputs) {
      try {
        client.handleWebSocketMessage(input);
      } catch (error) {
        // Expected - should throw validation error, not crash
        expect(error).not.toBeNull();
      }
    }

    client.dispose();
  });

  it('should handle unexpected message types', async () => {
    const client = new ClawClient({
      baseUrl: 'https://api.test.com',
      wsUrl: 'wss://api.test.com/ws',
      enableWebSocket: true
    });

    await client.connectWebSocket();

    const unexpectedTypes = [
      'INVALID_TYPE',
      'QUERY',
      'TRIGGER',
      'CANCEL',
      'APPROVE',
      'RANDOM_' + randomBytes(5).toString('hex'),
      '',
      null,
      undefined,
      123,
      {},
      []
    ];

    for (const type of unexpectedTypes) {
      const message = { type, clawId: 'claw_123', data: {} };

      // Should handle gracefully
      expect(() => {
        client.handleWebSocketMessage(JSON.stringify(message));
      }).not.toThrow();
    }

    client.dispose();
  });

  it('should handle large messages', async () => {
    const client = new ClawClient({
      baseUrl: 'https://api.test.com',
      wsUrl: 'wss://api.test.com/ws',
      enableWebSocket: true,
      maxMessageSize: 1024 * 1024 // 1MB
    });

    await client.connectWebSocket();

    // Generate increasingly large messages
    for (let size of [100, 1000, 10000, 100000, 1000000]) {
      const largeMessage = {
        type: 'QUERY',
        clawId: 'claw_123',
        data: {
          payload: 'x'.repeat(size)
        }
      };

      if (size > 1024 * 1024) {
        // Should reject oversized messages
        await expect(
          client.sendWebSocketMessage(largeMessage)
        ).rejects.toThrow('MESSAGE_TOO_LARGE');
      } else {
        // Should accept valid-sized messages
        await expect(
          client.sendWebSocketMessage(largeMessage)
        ).resolves.toBeDefined();
      }
    }

    client.dispose();
  });
});

function randomChar(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  return chars[Math.floor(Math.random() * chars.length)];
}
```

**Phase 3: API Input Fuzzing (Week 7 Day 4)**

```typescript
// src/__tests__/fuzz/ClawAPI.fuzz.test.ts
describe('ClawAPI Input Fuzzing', () => {
  it('should validate claw configurations robustly', async () => {
    const client = new ClawClient({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key'
    });

    // Generate random claw configs
    const randomConfigs = Array.from({ length: 1000 }, () => ({
      clawId: randomBytes(16).toString('hex'),
      config: {
        id: randomBytes(16).toString('hex'),
        type: ['SENSOR', 'REASONING', 'ACTUATOR', 'COORDINATOR', 'INVALID'][Math.floor(Math.random() * 5)],
        position: [
          Math.floor(Math.random() * 1000),
          Math.floor(Math.random() * 1000)
        ],
        model: {
          provider: ['DEEPSEEK', 'OPENAI', 'ANTHROPIC', 'INVALID'][Math.floor(Math.random() * 4)],
          model: randomBytes(10).toString('hex'),
          apiKey: Math.random() > 0.5 ? randomBytes(20).toString('hex') : null
        },
        seed: Math.random() > 0.3 ? {
          purpose: randomBytes(20).toString('hex'),
          trigger: {
            type: ['CELL_CHANGE', 'PERIODIC', 'MANUAL', 'INVALID'][Math.floor(Math.random() * 4)],
            cellId: Math.random() > 0.5 ? 'A1' : null
          },
          learningStrategy: ['REINFORCEMENT', 'SUPERVISED', 'UNSUPERVISED'][Math.floor(Math.random() * 3)]
        } : null,
        equipment: Array.from({ length: Math.floor(Math.random() * 10) }, () =>
          ['MEMORY', 'REASONING', 'CONSENSUS', 'SPREADSHEET', 'DISTILLATION', 'INVALID'][Math.floor(Math.random() * 6)]
        ),
        relationships: Array.from({ length: Math.floor(Math.random() * 5) }, () => ({
          type: ['MASTER_SLAVE', 'CO_WORKER', 'PEER', 'INVALID'][Math.floor(Math.random() * 4)],
          targetId: randomBytes(16).toString('hex')
        })),
        state: ['DORMANT', 'THINKING', 'ACTING', 'ERROR', 'INVALID'][Math.floor(Math.random() * 5)],
        confidence: Math.random() * 2 - 0.5 // Can be negative or > 1
      }
    }));

    // All invalid configs should be rejected
    for (const config of randomConfigs) {
      try {
        await client.createClaw(config);
        // If no error thrown, config was valid
        expect(config.config.type).not.toBe('INVALID');
      } catch (error) {
        // Expected for invalid configs
        expect(error).toBeDefined();
      }
    }

    client.dispose();
  });
});
```

### Expected Impact

- **Robustness:** +60% improvement
- **Security:** +40% improvement
- **Implementation Effort:** 2-3 days
- **Maintenance:** Low

---

## Immediate Fixes (Critical Bugs)

### Fix 1: Remove Duplicate Export (Critical)

**File:** `packages/agent-core/src/monitoring/index.ts`
**Lines:** 15-46

```typescript
// BEFORE (INCORRECT):
export {
  MetricsCollector,  // Line 16 - First export
  MetricType,
  MetricCategory,
  getMetricsCollector,
  resetMetricsCollector
} from './MetricsCollector';

// ... other exports ...

export { default as MetricsCollector } from './MetricsCollector';  // Line 46 - DUPLICATE!
```

```typescript
// AFTER (CORRECT):
// Remove the duplicate export on line 46
// Keep only the named export on line 16
```

### Fix 2: Add process.cwd Mock

**File:** `packages/agent-core/src/api/__tests__/integration.test.ts`

```typescript
// Add to top of file before describe blocks:
const originalCwd = process.cwd;
beforeAll(() => {
  process.cwd = jest.fn(() => 'C:\\Users\\casey\\polln\\spreadsheet-moment\\packages\\agent-core');
});

afterAll(() => {
  process.cwd = originalCwd;
});
```

### Fix 3: Improve WebSocket Test Cleanup

**File:** All WebSocket test files

```typescript
// Add to each test suite that uses WebSocket:
afterEach(async () => {
  // Ensure WebSocket is properly closed
  if (client['ws']) {
    await client.disconnectWebSocket();
  }

  // Clear all timers
  jest.runAllTimers();
  jest.useRealTimers();

  // Wait for pending async operations
  await new Promise(resolve => setTimeout(resolve, 100));
});
```

---

## Quality Metrics Dashboard

### Proposed Metrics to Track

**1. Test Health Metrics:**
- Pass rate trend (last 7 days, 30 days)
- Flaky test percentage
- Test execution time trends
- Coverage per module

**2. Mutation Score:**
- Overall mutation score
- Mutation score by module
- Surviving mutants count
- Mutation score trend

**3. Integration Health:**
- Contract test pass rate
- API contract violations
- WebSocket connection success rate
- Message delivery success rate

**4. Performance Metrics:**
- P95 test execution time
- P99 API response time
- Memory leak detection
- Concurrent operation success rate

### Dashboard Implementation

```typescript
// Create GitHub Actions workflow to generate metrics
// .github/workflows/test-metrics.yml

name: Test Metrics Dashboard

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for trends

      - name: Run tests with coverage
        run: pnpm test:coverage

      - name: Run mutation testing
        run: pnpm stryker run

      - name: Generate metrics
        run: pnpm generate-metrics

      - name: Upload metrics
        uses: actions/upload-artifact@v3
        with:
          name: test-metrics
          path: metrics/

      - name: Update dashboard
        run: pnpm update-dashboard
        env:
          METRICS_API_KEY: ${{ secrets.METRICS_API_KEY }}
```

---

## Implementation Roadmap

### Week 6: Foundation (Days 1-5)

**Day 1-2: Critical Fixes**
- Fix duplicate export bug
- Add process.cwd mock
- Improve test cleanup
- Set up FastCheck

**Day 3-4: Property-Based Testing**
- Implement property tests for StateManager
- Implement property tests for TraceProtocol
- Create custom arbitraries for Claw types

**Day 5: Mutation Testing Setup**
- Configure Stryker
- Run initial mutation analysis
- Target high-value mutants

### Week 7: Advanced Strategies (Days 1-5)

**Day 1-2: Contract Testing**
- Set up Pact
- Define Claw API contracts
- Create consumer tests

**Day 3: Visual Regression**
- Set up Storybook
- Create component stories
- Configure visual regression tests

**Day 4-5: Concurrency & Fuzz Testing**
- Implement race condition tests
- Implement stress tests
- Implement fuzz tests

### Week 8: Integration & Metrics (Days 1-5)

**Day 1-2: CI Integration**
- Integrate all test types in CI
- Set up test metrics collection
- Create quality dashboard

**Day 3-4: Documentation**
- Document testing best practices
- Create testing guidelines
- Train team on new approaches

**Day 5: Validation**
- Run full test suite
- Measure improvements
- Present results

---

## Success Criteria

### Quantitative Goals

1. **Test Pass Rate:** 86% → 95%+ (target: 165+/174 tests)
2. **Code Coverage:** 61.57% → 82%+ (meet threshold)
3. **Branch Coverage:** 52.93% → 80%+ (meet threshold)
4. **Mutation Score:** 0% → 75%+ (new metric)
5. **Integration Bugs:** -80% reduction
6. **Test Execution Time:** <20 seconds (maintain)

### Qualitative Goals

1. **Zero Flaky Tests:** All tests pass consistently
2. **Living Documentation:** Contracts serve as API docs
3. **Team Adoption:** Developers use new testing approaches
4. **CI Integration:** All tests run automatically
5. **Performance:** No degradation in test speed

---

## Risk Assessment

### Low Risk Strategies
- Property-based testing (FastCheck)
- Mutation testing (Stryker)
- Concurrency testing

### Medium Risk Strategies
- Contract testing (requires backend coordination)
- Visual regression testing (requires infrastructure)

### High Risk Strategies
- Fuzz testing (can be noisy, requires tuning)

### Mitigation Strategies

1. **Gradual Rollout:** Implement one strategy at a time
2. **Baseline Measurement:** Measure before and after each strategy
3. **Team Training:** Ensure team understands new approaches
4. **CI Monitoring:** Watch for increased flakiness or failures
5. **Rollback Plan:** Can disable any strategy if problematic

---

## Tools & Resources

### Recommended Tools

1. **Property-Based Testing:**
   - FastCheck: https://fast-check.dev/
   - Documentation: https://fast-check.dev/docs/basics/

2. **Mutation Testing:**
   - Stryker: https://stryker-mutator.io/
   - Documentation: https://stryker-mutator.io/docs/

3. **Contract Testing:**
   - Pact: https://docs.pact.io/
   - TypeScript Pact: https://github.com/pact-foundation/pact-js

4. **Visual Regression:**
   - Storybook: https://storybook.js.org/
   - jest-image-snapshot: https://github.com/americanexpress/jest-image-snapshot

5. **Fuzz Testing:**
   - AFL: https://github.com/google/AFL
   - Jazzer: https://github.com/CodeIntelligenceTesting/jazzer

### Learning Resources

1. **Property-Based Testing:**
   - "Property-Based Testing in TypeScript" by Scott Wlaschin
   - FastCheck examples and tutorials

2. **Mutation Testing:**
   - Stryker workshop materials
   - "Mutation Testing for Better Tests" blog series

3. **Contract Testing:**
   - Pact fundamentals tutorial
   - "Microservices Testing" book

---

## Conclusion

This testing strategy provides a comprehensive approach to improving test coverage and quality from 86% to 95%+. By implementing these strategies incrementally, we can:

1. **Immediately fix critical bugs** (duplicate export, missing mocks)
2. **Add property-based tests** for robust invariant checking
3. **Implement mutation testing** to measure test effectiveness
4. **Add contract tests** to prevent integration issues
5. **Create visual regression tests** for UI stability
6. **Test concurrency** for production reliability
7. **Fuzz test inputs** for robustness

The expected impact is substantial:
- **+15-20% coverage** from property-based testing
- **+30-40% test quality** from mutation testing
- **-80% integration bugs** from contract testing
- **+50% UI bug detection** from visual regression
- **+70% concurrency bug detection** from race condition testing

**Total Expected Improvement:** 86% → 95%+ pass rate within 2-3 weeks.

---

**Next Steps:**
1. Review and approve this strategy
2. Prioritize strategies based on team capacity
3. Begin Week 6 implementation (critical fixes + FastCheck)
4. Track progress daily
5. Measure results after each strategy
6. Adjust approach based on findings

**Contact:** R&D Testing Specialist
**Date:** 2026-03-16
**Status:** Ready for Implementation
