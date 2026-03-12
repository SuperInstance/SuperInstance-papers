# Integration Tester Agent

## Mission
Design and implement comprehensive integration tests for the POLLN core runtime.

## Test Categories

### 1. Component Integration Tests

**Agent + Colony Integration**
- Test: Register agent, verify colony state
- Test: Activate agent, verify active count
- Test: Record execution result, verify value function update
- Test: Deactivate agent, verify status change

**A2APackage + Causal Chain Integration**
- Test: Create package, verify storage
- Test: Create child package, verify causal chain
- Test: Retrieve full causal chain
- Test: Replay chain from root

**BES + Privacy Integration**
- Test: Create pollen grain at each tier
- Test: Verify DP noise applied correctly
- Test: Exhaust privacy budget
- Test: Cross-tier similarity search

**Safety + Plinko Integration**
- Test: Safety check passes, Plinko selects
- Test: Safety check fails, Plinko overrides
- Test: Kill switch triggers on critical violation
- Test: Rollback restores state

### 2. End-to-End Flow Tests

**Complete Agent Execution Flow**
```
1. Keeper sends intent
2. Colony activates relevant agents
3. Agents process via SPORE protocol
4. A2A packages created and traced
5. Plinko selects best response
6. Safety layer validates
7. Result returned to keeper
8. Artifacts stored for overnight evolution
```

**Evolution Flow**
```
1. Day: Collect artifacts (A2A packages, pollen grains)
2. Night: World model simulates alternatives
3. Night: Hebbian learning updates weights
4. Night: Plinko selects best mutations
5. Morning: Deploy improved variants
```

### 3. Performance Tests

**Latency Benchmarks**
- A2A package creation: < 1ms
- Causal chain retrieval: < 10ms for 100 hops
- Plinko decision: < 5ms for 100 proposals
- Safety check: < 1ms per constraint

**Throughput Tests**
- 1000 agents per colony
- 10000 A2A packages per second
- 100 concurrent safety checks

**Memory Tests**
- Colony with 1000 agents: < 100MB
- BES with 10000 grains: < 500MB
- Full system: < 2GB

### 4. Stress Tests

**Cascading Failure Test**
- Kill 50% of agents mid-execution
- Verify remaining agents handle load
- Verify no A2A package loss
- Verify safety constraints still enforced

**Privacy Budget Exhaustion**
- Create grains until budget exhausted
- Verify graceful degradation
- Verify no data leakage

**Safety Constraint Violation Storm**
- Trigger 100 violations simultaneously
- Verify kill switch activates
- Verify rollback capability

## Test Implementation

### Test Utilities

```typescript
// Test fixture helpers
function createTestColony(): Colony
function createTestAgent(): AgentConfig
function createTestA2APackage(): A2APackage
function createTestPollenGrain(): PollenGrain

// Assertion helpers
function assertCausalChainValid(chain: string[]): void
function assertPrivacyPreserved(grain: PollenGrain, tier: PrivacyTier): void
function assertSafetyConstraintsEnforced(result: SafetyCheckResult): void
```

### Mock Components

```typescript
// Mock LLM for agent testing
class MockLLM implements LLMInterface

// Mock vector DB for BES testing
class MockVectorDB implements VectorDBInterface

// Mock time for overnight evolution testing
class MockTimeController
```

## Deliverables

1. **Test Suite**: Complete integration test coverage
2. **Test Utilities**: Reusable fixtures and assertions
3. **Performance Report**: Benchmarks and bottlenecks
4. **Stress Test Results**: System limits documented

## Success Criteria

- 90%+ code coverage on core runtime
- All integration tests pass
- Performance meets targets
- Stress tests reveal no critical failures
