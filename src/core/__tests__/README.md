# POLLN Integration Test Suite

Comprehensive integration tests for the POLLN core runtime system.

## Overview

This test suite validates the integration of all POLLN core components:
- **Agent + Colony**: Agent lifecycle management
- **A2APackage + Causal Chain**: Traceable communication
- **BES + Privacy**: Multi-tier privacy with differential privacy
- **Safety + Plinko**: Safety-constrained decision making

## Test Structure

### 1. Component Integration Tests

#### Agent + Colony Integration
Tests agent registration, activation, deactivation, and result tracking within colonies.

**Test Cases:**
- `should register agent with colony`
- `should activate and deactivate agents`
- `should record execution results correctly`

#### A2APackage + Causal Chain Integration
Tests creation of A2A packages with causal chain tracking and replay capabilities.

**Test Cases:**
- `should create package with causal chain`
- `should track full causal chain`
- `should replay causal chain correctly`

#### BES + Privacy Integration
Tests behavioral embedding space with privacy tiers and differential privacy.

**Test Cases:**
- `should create grain with dimensionality reduction`
- `should apply differential privacy correctly`
- `should track privacy budget correctly`
- `should find similar grains`

#### Safety + Plinko Integration
Tests safety layer integration with stochastic decision making.

**Test Cases:**
- `should override selection when safety fails`
- `should enforce critical constraints`
- `should create and rollback checkpoints`

### 2. End-to-End Flow Tests

#### Agent Execution Flow
Tests complete agent workflow from input to result.

**Components involved:**
- Colony (agent management)
- SafetyLayer (constraint checking)
- PlinkoLayer (decision making)
- A2APackageSystem (communication)
- HebbianLearning (synaptic updates)

**Test Cases:**
- `should execute complete agent workflow`

#### Evolution Flow
Tests day/night cycle simulation for learning and optimization.

**Day cycle:** Co-activation and learning
**Night cycle:** Decay and pruning

**Test Cases:**
- `should simulate day cycle (learning)`
- `should simulate night cycle (decay)`
- `should prune weak synapses`

#### World Model Dreaming Flow
Tests world model training and dream episode generation.

**Test Cases:**
- `should train world model and dream`

### 3. Performance Benchmarks

#### Latency Targets
Validates that component latency meets performance requirements.

**Targets:**
- Agent processing: < 50ms
- A2A package creation: < 5ms average
- Plinko decision: < 10ms

**Test Cases:**
- `agent processing should meet latency target`
- `A2A package creation should be fast`
- `Plinko decision should be fast`

#### Throughput Targets
Validates system throughput under load.

**Targets:**
- Message throughput: > 1000 packages/second
- Concurrent execution: 10 agents in < 50ms

**Test Cases:**
- `should handle high message throughput`
- `should handle concurrent agent execution`

#### Memory Targets
Validates memory management and resource limits.

**Test Cases:**
- `should respect memory limits`
- `should prune old history efficiently`

## Running Tests

### Install Dependencies
```bash
bun install
```

### Run All Tests
```bash
bun test
```

### Run Integration Tests Only
```bash
bun test:integration
```

### Run Tests in Watch Mode
```bash
bun test:watch
```

### Generate Coverage Report
```bash
bun test:coverage
```

## Test Architecture

### IntegrationTestRunner
Custom test runner that:
- Executes tests sequentially
- Tracks duration for each test
- Captures errors with context
- Generates summary statistics

### MockAgent
Mock agent implementation for testing:
- Simulates processing latency
- Returns configurable results
- Tracks agent state

## Expected Test Results

When all tests pass, you should see output similar to:

```
POLLN Integration Test Suite
============================

--- Agent + Colony Integration ---
✓ should register agent with colony (2.34ms)
✓ should activate and deactivate agents (1.89ms)
✓ should record execution results correctly (2.12ms)

--- A2APackage + Causal Chain Integration ---
✓ should create package with causal chain (1.45ms)
✓ should track full causal chain (2.78ms)
✓ should replay causal chain correctly (3.21ms)

--- BES + Privacy Integration ---
✓ should create grain with dimensionality reduction (4.56ms)
✓ should apply differential privacy correctly (5.12ms)
✓ should track privacy budget correctly (2.89ms)
✓ should find similar grains (3.45ms)

--- Safety + Plinko Integration ---
✓ should override selection when safety fails (2.67ms)
✓ should enforce critical constraints (1.98ms)
✓ should create and rollback checkpoints (3.34ms)

--- End-to-End: Agent Execution Flow ---
✓ should execute complete agent workflow (15.23ms)

--- End-to-End: Evolution Flow ---
✓ should simulate day cycle (learning) (12.45ms)
✓ should simulate night cycle (decay) (8.34ms)
✓ should prune weak synapses (6.78ms)

--- End-to-End: World Model Dreaming Flow ---
✓ should train world model and dream (45.67ms)

--- Performance: Latency Targets ---
✓ agent processing should meet latency target (25.34ms)
✓ A2A package creation should be fast (234.56ms for 100 packages)
✓ Plinko decision should be fast (4.23ms)

--- Performance: Throughput Targets ---
✓ should handle high message throughput (890.23ms for 1000 packages)
✓ should handle concurrent agent execution (42.34ms)

--- Performance: Memory Targets ---
✓ should respect memory limits (23.45ms)
✓ should prune old history efficiently (234.56ms for 200 packages)

=== Test Summary ===
Total: 28
Passed: 28
Failed: 0
Duration: 1645.23ms
====================
```

## Troubleshooting

### Tests Fail to Compile
- Ensure TypeScript is configured correctly
- Check that all dependencies are installed
- Verify import paths in test files

### Tests Timeout
- Increase `testTimeout` in jest.config.js
- Check for infinite loops in async operations
- Verify mock agent latency settings

### Memory Issues
- Reduce batch sizes in performance tests
- Check for memory leaks in implementations
- Run tests with increased Node.js heap: `node --max-old-space-size=4096`

## Adding New Tests

To add a new integration test:

1. Create a test function in the appropriate section
2. Use the `runner.test()` method
3. Follow the naming convention: `should [expected behavior]`
4. Include assertions with descriptive error messages

Example:
```typescript
await runner.test('should do something specific', async () => {
  // Arrange
  const component = new Component();

  // Act
  const result = await component.doSomething();

  // Assert
  if (result !== expected) {
    throw new Error(`Expected ${expected}, got ${result}`);
  }
});
```

## Coverage Goals

Target coverage metrics:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Continuous Integration

These tests should run on:
- Every pull request
- Every merge to main
- Nightly builds for performance regression detection

## Related Documentation

- [POLLN Core Types](../types.ts)
- [Agent Implementation](../agent.ts)
- [SPORE Protocol](../protocol.ts)
- [Plinko Decision Layer](../decision.ts)
- [Hebbian Learning](../learning.ts)
- [Colony Management](../colony.ts)
- [A2A Communication](../communication.ts)
- [BES Embeddings](../embedding.ts)
- [Safety Layer](../safety.ts)
- [World Model](../worldmodel.ts)
