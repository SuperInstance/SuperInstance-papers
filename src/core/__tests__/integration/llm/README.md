# POLLN Integration Tests with Mock LLM Backends

This directory contains comprehensive integration tests for POLLN using mock LLM backends. The tests verify agent-to-LLM communication, KV-cache behavior, dream cycles, federated learning, and complex workflows.

## Overview

The integration tests use a sophisticated mock LLM backend that simulates:
- **Token generation** with streaming support and temperature control
- **Embedding creation** with normalization and dimensionality options
- **KV-cache behavior** including hits, misses, and eviction
- **Latency simulation** with configurable base latency and variance
- **Error injection** with configurable error rates
- **Resource limiting** with max concurrent requests and cache size

## Test Structure

```
integration/llm/
├── MockLLMBackend.ts                    # Mock LLM implementation
├── agentLLM.integration.test.ts         # Agent-to-LLM communication tests (45 tests)
├── kvCache.integration.test.ts          # KV-cache behavior tests (35 tests)
├── dreamCycle.integration.test.ts       # Dream cycle with world model tests (40 tests)
├── federatedLearning.integration.test.ts # Federated learning tests (50 tests)
└── workflows.integration.test.ts        # Workflow tests (60 tests)
```

## Test Categories

### 1. Agent-to-LLM Communication (45 tests)

**File:** `agentLLM.integration.test.ts`

Tests basic communication between agents and LLM backends:

- **Basic Communication**
  - Send prompts and receive responses
  - Handle multiple sequential requests
  - Maintain causal chains in packages
  - Set correct privacy levels and subsumption layers

- **Token Generation**
  - Generate tokens with max tokens limit
  - Respect temperature parameter
  - Handle stop sequences
  - Track token usage correctly
  - Set appropriate finish reasons

- **Embedding Generation**
  - Generate embeddings for single/multiple inputs
  - Maintain consistent dimensionality
  - Normalize embeddings
  - Produce different embeddings for different inputs

- **Performance & Latency**
  - Report realistic latency
  - Scale latency with token count
  - Handle concurrent requests
  - Track statistics correctly

- **Error Handling**
  - Handle LLM errors gracefully
  - Handle timeout errors
  - Continue after errors
  - Update error statistics

- **Resource Limits**
  - Respect max concurrent requests
  - Queue requests when at capacity

### 2. KV-Cache Tests (35 tests)

**File:** `kvCache.integration.test.ts`

Tests KV-cache storage, retrieval, and eviction:

- **Basic Cache Operations**
  - Cache initial requests
  - Hit cache for identical prompts
  - Miss cache for different prompts
  - Compute cache keys correctly

- **Cache Size & Eviction**
  - Respect max cache size
  - Evict oldest entries when full
  - Track total tokens in cache

- **Cache Performance**
  - Be faster on cache hits
  - Improve average latency with caching
  - Maintain high hit rate with repeated prompts

- **Cache Clearing**
  - Clear all cache entries
  - Reset cache stats on clear

- **World Model Integration**
  - Use cache for world model prompts
  - Cache embeddings for world model states
  - Improve dream cycle performance with cache

- **Concurrent Access**
  - Handle concurrent cache reads
  - Handle concurrent cache writes
  - Maintain cache consistency under load

- **Cache Statistics**
  - Track cache size accurately
  - Track hit rate accurately
  - Reset stats correctly

- **Cache Key Collision**
  - Handle similar prompts correctly
  - Handle whitespace differences
  - Be case-sensitive

### 3. Dream Cycle Tests (40 tests)

**File:** `dreamCycle.integration.test.ts`

Tests dream-based policy optimization with mock world models:

- **Dream Episode Generation**
  - Generate episodes from replay buffer
  - Generate episodes with correct length
  - Not generate episodes without experiences
  - Generate diverse episodes

- **Policy Optimization**
  - Update policy after dream cycle
  - Track improvement metrics
  - Compute policy and value losses

- **World Model Integration**
  - Use world model for encoding states
  - Predict transitions
  - Decode states
  - Train world model with experiences

- **Value Network Integration**
  - Predict values for states
  - Train value network with targets
  - Integrate with dream episodes

- **Replay Buffer**
  - Store experiences correctly
  - Respect max buffer size
  - Prioritize high-reward experiences

- **LLM Integration**
  - Generate context using LLM
  - Use LLM embeddings for state representation
  - Cache LLM responses for efficiency

- **Dream Statistics**
  - Track dream history
  - Track improvement history
  - Compute improvement statistics

- **Error Handling**
  - Handle insufficient experiences gracefully
  - Continue after failed dream cycle

- **Graph Evolution Integration**
  - Emit policy improvement events
  - Emit dream completion events

- **Policy Export/Import**
  - Export policy parameters
  - Import policy parameters
  - Get action from policy

- **End-to-End Dream Cycle**
  - Complete full dream cycle
  - Improve over multiple dream cycles

### 4. Federated Learning Tests (50 tests)

**File:** `federatedLearning.integration.test.ts`

Tests federated learning coordination with mock gradients:

- **Colony Registration**
  - Register colonies successfully
  - Handle duplicate registration
  - Reject colonies over capacity
  - Unregister colonies

- **Federated Learning Rounds**
  - Start federated learning rounds
  - Require minimum colonies for round
  - Accept gradient updates from colonies
  - Complete rounds when all gradients submitted
  - Aggregate gradients using FedAvg

- **Privacy Mechanisms**
  - Apply gradient clipping
  - Add noise for differential privacy
  - Track privacy budget per colony
  - Respect LOCAL privacy tier

- **Model Distribution**
  - Distribute model to colonies
  - Track model versions
  - Maintain model history

- **Aggregation Methods**
  - Use FedAvg aggregation
  - Use FedAvgM aggregation with momentum

- **Statistics & Monitoring**
  - Track coordinator statistics
  - Maintain round history

- **Error Handling**
  - Handle missing colonies gracefully
  - Handle round timeout
  - Continue after failed round

- **LLM Integration**
  - Use LLM for gradient generation
  - Cache LLM embeddings across colonies

- **Concurrent Operations**
  - Handle concurrent gradient submissions
  - Handle concurrent model distribution

- **End-to-End Federation**
  - Complete full federated learning cycle

### 5. Workflow Tests (60 tests)

**File:** `workflows.integration.test.ts`

Comprehensive workflow tests including single agent, multi-agent, cache scenarios, error recovery, and timeout handling:

- **Single Agent Workflow**
  - Process single input successfully
  - Maintain state across multiple processes
  - Track processed packages
  - Generate embeddings for input
  - Emit events on processing
  - Handle rapid successive requests
  - Respect subsumption layers

- **Multi-Agent Coordination**
  - Execute sequential workflow across agents
  - Execute parallel workflow across agents
  - Execute hierarchical workflow
  - Coordinate agent communication
  - Handle agent failures gracefully
  - Maintain agent independence

- **Cache Scenarios**
  - Hit cache for repeated prompts
  - Miss cache for different prompts
  - Improve performance with cache hits
  - Handle cache eviction gracefully
  - Maintain cache across multiple agents
  - Handle cache warming

- **Error Recovery**
  - Retry failed requests
  - Fallback to alternative agents
  - Recover from timeout errors
  - Maintain system state during errors
  - Handle partial failures in multi-agent workflows

- **Timeout Handling**
  - Timeout slow requests
  - Handle concurrent timeouts
  - Retry after timeout with backoff
  - Not block other agents during timeout

- **Performance & Load**
  - Handle high request volume
  - Maintain performance under load
  - Handle concurrent multi-agent workflows

- **World Model Integration**
  - Encode states using world model
  - Use world model for predictions
  - Integrate embeddings with world model
  - Train world model with agent experiences

## Running the Tests

### Run all integration tests:
```bash
npm test src/core/__tests__/integration/llm/
```

### Run specific test file:
```bash
npm test src/core/__tests__/integration/llm/agentLLM.integration.test.ts
```

### Run with coverage:
```bash
npm run test:coverage -- src/core/__tests__/integration/llm/
```

### Run in watch mode:
```bash
npm run test:watch -- src/core/__tests__/integration/llm/
```

## Test Configuration

The mock LLM backend is configured with these defaults:

```typescript
{
  modelId: 'mock-llm-7b',
  contextWindowSize: 4096,
  maxTokens: 2048,
  embeddingDimension: 4096,
  baseLatencyMs: 100,
  latencyVarianceMs: 50,
  tokensPerSecond: 50,
  errorRate: 0.01,
  timeoutRate: 0.005,
  maxConcurrentRequests: 10,
  maxCacheSize: 1000,
}
```

You can override these in individual tests:

```typescript
const customLLM = MockLLMBackendFactory.create('custom-model', {
  baseLatencyMs: 10,
  errorRate: 0.5,
  maxCacheSize: 50,
});
```

## Key Features

### Mock LLM Backend

The `MockLLMBackend` class provides:

1. **Realistic Tokenization**
   - Vocabulary-based tokenization
   - Subword tokenization for unknown words
   - Detokenization with subword reconstruction

2. **Token Generation**
   - Temperature-controlled sampling
   - Max tokens limit
   - Stop sequence handling
   - Usage tracking

3. **Embedding Generation**
   - Xavier-initialized embedding matrix
   - Normalized embeddings
   - Batch processing support

4. **KV-Cache Simulation**
   - Hash-based cache keys
   - LRU eviction policy
   - Cache statistics tracking

5. **Performance Simulation**
   - Configurable latency
   - Token processing time
   - Resource limits

6. **Error Injection**
   - Configurable error rate
   - Timeout simulation
   - Graceful degradation

### Test Utilities

**MockLLMBackendFactory**
```typescript
// Create a new backend
const llm = MockLLMBackendFactory.create('model-id', config);

// Get existing backend
const llm = MockLLMBackendFactory.get('model-id');

// Reset all backends
MockLLMBackendFactory.resetAll();
```

**WorkflowAgent**
```typescript
const agent = new WorkflowAgent({
  id: uuidv4(),
  name: 'TestAgent',
  role: 'deliberate',
  llm,
});

// Process input
const result = await agent.process('input');

// Generate embedding
const embedding = await agent.generateEmbedding('text');

// Access state
agent.setState('key', value);
const value = agent.getState().get('key');
```

**WorkflowOrchestrator**
```typescript
const orchestrator = new WorkflowOrchestrator(llm, worldModel);

// Add agents
orchestrator.addAgent(agent);

// Sequential workflow
const results = await orchestrator.runSequentialWorkflow(
  [agentId1, agentId2],
  input
);

// Parallel workflow
const results = await orchestrator.runParallelWorkflow(
  [agentId1, agentId2],
  input
);

// Hierarchical workflow (REFLEX -> HABITUAL -> DELIBERATE)
const result = await orchestrator.runHierarchicalWorkflow(input);
```

## Test Coverage

The integration tests provide comprehensive coverage of:

- **230+ integration tests** covering all major components
- **Agent-LLM communication** patterns
- **KV-cache behavior** under various scenarios
- **Dream cycle** with world model integration
- **Federated learning** coordination and privacy
- **Single agent workflows** with state management
- **Multi-agent coordination** patterns
- **Error recovery** mechanisms
- **Timeout handling** strategies
- **Performance** under load

## Best Practices

1. **Always clean up** in `afterEach` hooks:
   ```typescript
   afterEach(() => {
     MockLLMBackendFactory.resetAll();
     coordinator.reset();
     orchestrator.reset();
   });
   ```

2. **Use unique IDs** for test isolation:
   ```typescript
   const id = uuidv4();
   ```

3. **Configure timeouts** for slow tests:
   ```typescript
   it('slow test', async () => {
     // ...
   }, 30000);
   ```

4. **Test both success and failure** scenarios:
   ```typescript
   await expect(
     llm.generateTokens({ prompt: 'test' })
   ).resolves.toBeDefined();

   await expect(
     errorLLM.generateTokens({ prompt: 'test' })
   ).rejects.toThrow();
   ```

5. **Use Promise.allSettled** for concurrent operations:
   ```typescript
   const results = await Promise.allSettled(
     agents.map(agent => agent.process(input))
   );

   const successful = results.filter(r => r.status === 'fulfilled');
   const failed = results.filter(r => r.status === 'rejected');
   ```

## Troubleshooting

### Tests timing out
- Increase timeout in test config or individual test
- Check for infinite loops or unhandled promises
- Verify mock LLM configuration

### Cache not working as expected
- Ensure cache is cleared between tests
- Check cache key computation
- Verify cache size limits

### Concurrent tests failing
- Verify max concurrent requests setting
- Check for race conditions
- Use proper synchronization

## Contributing

When adding new integration tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Test both positive and negative cases
4. Include error handling tests
5. Add performance tests where applicable
6. Update this README with new test categories

## License

MIT License - See root LICENSE file for details.
