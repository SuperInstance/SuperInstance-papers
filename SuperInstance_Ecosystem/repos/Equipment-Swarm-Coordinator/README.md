# @superinstance/equipment-swarm-coordinator

> Equipment for orchestrating multiple agents in origin-centric networks with asymmetrical knowledge distribution.

## Overview

The `@superinstance/equipment-swarm-coordinator` is a comprehensive solution for coordinating multiple AI agents in complex distributed workflows. It implements origin-centric coordination where each agent maintains provenance tracking, asymmetrical knowledge distribution where agents only know what they need, and parallel task execution with dependency management.

## Features

- **Multi-Agent Orchestration**: Coordinate multiple agents with specialized roles
- **Asymmetric Knowledge Distribution**: Agents only receive knowledge necessary for their tasks
- **Parallel Task Execution**: Execute tasks in parallel with dependency tracking
- **Origin-Centric Coordination**: Each agent maintains provenance information
- **Conflict Resolution**: Multiple strategies for resolving conflicts between agent outputs
- **Adaptive Task Allocation**: Dynamic task assignment based on agent performance
- **Hierarchical Agent Structures**: Support for parent-child agent relationships

## Installation

```bash
npm install @superinstance/equipment-swarm-coordinator
```

## Quick Start

```typescript
import { 
  SwarmCoordinator, 
  AgentOrchestrator,
  AsymmetricKnowledge,
  TaskDecomposer,
  ResultAggregator 
} from '@superinstance/equipment-swarm-coordinator';

// Create a swarm coordinator
const coordinator = new SwarmCoordinator({
  maxAgents: 10,
  enableHierarchy: true,
  knowledgeIsolation: 'moderate',
  adaptiveAllocation: true,
});

// Register agents
coordinator.registerAgent({
  id: 'agent-1',
  name: 'DataProcessor',
  role: 'executor',
  capabilities: ['data-processing', 'computation'],
  status: 'idle',
  hierarchyLevel: 0,
  metadata: {},
});

// Execute a task
const result = await coordinator.executeTask('Process the data and generate report');
console.log(result.value);
```

## Core Components

### SwarmCoordinator

The main equipment class that orchestrates the entire swarm:

```typescript
import { SwarmCoordinator } from '@superinstance/equipment-swarm-coordinator';

const coordinator = new SwarmCoordinator({
  maxAgents: 10,                // Maximum number of agents
  enableHierarchy: true,        // Enable hierarchical structures
  maxHierarchyDepth: 3,         // Maximum hierarchy depth
  knowledgeIsolation: 'moderate', // Knowledge isolation level
  taskTimeout: 30000,           // Task timeout in ms
  adaptiveAllocation: true,     // Enable adaptive allocation
  conflictResolution: 'weighted', // Conflict resolution strategy
  performanceWindowSize: 100,   // Performance tracking window
});

// Register agents
coordinator.registerAgent({
  id: 'coordinator-agent',
  name: 'MainCoordinator',
  role: 'coordinator',
  capabilities: ['coordination', 'planning'],
  status: 'idle',
  hierarchyLevel: 0,
  metadata: {},
});

// Execute tasks
const result = await coordinator.executeTask('Complex task description');

// Get swarm state
const state = coordinator.getState();
console.log(state.metrics);
```

### AgentOrchestrator

Manages agent registration, hierarchy, and task distribution:

```typescript
import { AgentOrchestrator } from '@superinstance/equipment-swarm-coordinator';

const orchestrator = new AgentOrchestrator({
  maxAgents: 100,
  enableHierarchy: true,
  maxHierarchyDepth: 5,
  defaultTimeout: 30000,
  loadBalancing: true,
});

// Register agents
orchestrator.registerAgent({
  id: 'executor-1',
  name: 'TaskExecutor',
  role: 'executor',
  capabilities: ['computation', 'data-processing'],
  status: 'idle',
  hierarchyLevel: 1,
  metadata: {},
});

// Select best agent for a task
const agent = orchestrator.selectBestAgent(
  ['computation'],
  'executor'
);

// Get orchestrator statistics
const stats = orchestrator.getStatistics();
```

### AsymmetricKnowledge

Manages asymmetrical knowledge distribution:

```typescript
import { AsymmetricKnowledge } from '@superinstance/equipment-swarm-coordinator';

const knowledgeManager = new AsymmetricKnowledge({
  isolationLevel: 'moderate',
  enableCaching: true,
  maxPartitionSize: 10000,
  retentionPeriod: 86400000, // 24 hours
  enableProvenance: true,
});

// Create knowledge partition for agent
knowledgeManager.createPartition('agent-1', 'executor');

// Distribute knowledge
knowledgeManager.distributeKnowledge(
  'agent-1',
  'database-connection-string',
  'postgresql://localhost:5432/db',
  'system'
);

// Set access policies
knowledgeManager.setAccessPolicy({
  sourceAgentId: 'agent-1',
  targetAgentId: 'agent-2',
  allowedKeys: ['public-*'],
  deniedKeys: ['private-*'],
  grantedLevel: 'partial',
  conditions: [],
});

// Get knowledge summary
const summary = knowledgeManager.getKnowledgeSummary('agent-1');
```

### TaskDecomposer

Breaks down complex tasks into parallel subtasks:

```typescript
import { TaskDecomposer } from '@superinstance/equipment-swarm-coordinator';

const decomposer = new TaskDecomposer({
  maxParallelism: 10,
  minTaskSize: 0.1,
  maxDepth: 5,
  autoDependencyDetection: true,
  defaultTimeout: 60000,
});

// Decompose a task
const graph = await decomposer.decompose('Process large dataset and generate analytics');

// Get ready tasks
const readyTasks = decomposer.getReadyTasks(graph, new Set());

// Get statistics
const stats = decomposer.getStatistics(graph);
console.log(`Total tasks: ${stats.totalTasks}`);
console.log(`Critical path: ${stats.criticalPath.length}`);
```

### ResultAggregator

Aggregates results from multiple agents with conflict resolution:

```typescript
import { ResultAggregator, type AgentResult } from '@superinstance/equipment-swarm-coordinator';

const aggregator = new ResultAggregator({
  conflictResolution: 'weighted',
  enableValidation: true,
  minConfidence: 0.5,
  enableCaching: true,
  maxCacheSize: 1000,
  timeout: 30000,
});

// Aggregate results
const results: AgentResult[] = [
  {
    agentId: 'agent-1',
    value: { score: 0.95 },
    confidence: 0.9,
    executionTime: 150,
    timestamp: new Date(),
    metadata: {},
  },
  {
    agentId: 'agent-2',
    value: { score: 0.88 },
    confidence: 0.85,
    executionTime: 120,
    timestamp: new Date(),
    metadata: {},
  },
];

const aggregated = await aggregator.aggregateTaskResults('task-1', results);
console.log(`Final value: ${aggregated.value}`);
console.log(`Confidence: ${aggregated.confidence}`);
console.log(`Conflicts: ${aggregated.conflicts.length}`);
```

## Agent Roles

The coordinator supports several agent roles:

| Role | Description | Knowledge Level |
|------|-------------|-----------------|
| `coordinator` | Coordinates other agents | Full |
| `executor` | Executes tasks | Partial |
| `validator` | Validates results | Partial |
| `specialist` | Specialized for specific tasks | Limited |
| `observer` | Observes and reports | Minimal |

## Conflict Resolution Strategies

| Strategy | Description |
|----------|-------------|
| `voting` | Democratic voting among agents |
| `weighted` | Weighted by confidence and performance |
| `hierarchical` | Based on agent hierarchy level |
| `consensus` | Seek consensus between agents |

## Knowledge Isolation Levels

| Level | Description |
|-------|-------------|
| `strict` | Agents can only access explicitly granted knowledge |
| `moderate` | Agents can access knowledge at or below their level |
| `relaxed` | Agents can access all knowledge |

## Task Decomposition Strategies

| Strategy | Description |
|----------|-------------|
| `parallel` | Split into independent parallel tasks |
| `sequential` | Split into sequential stages |
| `pipeline` | Split into pipeline stages |
| `map-reduce` | Map-reduce pattern |
| `divide-conquer` | Divide and conquer approach |

## API Reference

### SwarmCoordinator

#### Constructor

```typescript
constructor(config?: Partial<SwarmConfig>)
```

#### Methods

| Method | Description |
|--------|-------------|
| `registerAgent(agent: AgentProfile)` | Register an agent with the swarm |
| `unregisterAgent(agentId: string)` | Unregister an agent |
| `executeTask<T>(task: string, context?: object)` | Execute a task using the swarm |
| `getState()` | Get current swarm state |
| `getPerformanceMetrics(agentId?: string)` | Get performance metrics |
| `assignTask(task: TaskNode)` | Assign a task to an agent |
| `updateAgentPerformance(agentId: string, performance: AgentPerformance)` | Update agent performance |

### AgentOrchestrator

#### Methods

| Method | Description |
|--------|-------------|
| `registerAgent(profile: AgentProfile)` | Register an agent |
| `unregisterAgent(agentId: string)` | Unregister an agent |
| `getAgent(agentId: string)` | Get agent profile |
| `getAllAgents()` | Get all agents |
| `getAgentsByRole(role: AgentRole)` | Get agents by role |
| `getAgentsByCapability(capability: string)` | Get agents by capability |
| `selectBestAgent(capabilities: string[], role?: AgentRole)` | Select best agent for task |
| `getHierarchy(agentId: string)` | Get agent hierarchy tree |
| `updateAgentStatus(agentId: string, status: ExecutionStatus)` | Update agent status |
| `adjustAgentWeight(agentId: string, score: number)` | Adjust agent weight |

### AsymmetricKnowledge

#### Methods

| Method | Description |
|--------|-------------|
| `createPartition(agentId: string, role: AgentRole)` | Create knowledge partition |
| `removePartition(agentId: string)` | Remove partition |
| `getPartition(agentId: string)` | Get partition |
| `addGlobalKnowledge(entry: KnowledgeEntry)` | Add global knowledge |
| `distributeKnowledge(agentId: string, key: string, value: unknown, source: string)` | Distribute knowledge |
| `requestKnowledge(requestingId: string, targetId: string, key: string)` | Request knowledge |
| `setAccessPolicy(policy: AccessPolicy)` | Set access policy |
| `revokeAccessPolicy(targetId: string, policyId: string)` | Revoke policy |
| `getDistributionScore()` | Get distribution score |
| `transferKnowledge(sourceId: string, targetId: string, keys?: string[])` | Transfer knowledge |

### TaskDecomposer

#### Methods

| Method | Description |
|--------|-------------|
| `decompose(task: string, context?: object)` | Decompose a task |
| `analyzeTask(task: string, context?: object)` | Analyze a task |
| `getTask(graph: DependencyGraph, taskId: string)` | Get task from graph |
| `getReadyTasks(graph: DependencyGraph, completed: Set<string>)` | Get ready tasks |
| `addDependency(graph: DependencyGraph, taskId: string, dependsOn: string)` | Add dependency |
| `removeDependency(graph: DependencyGraph, taskId: string, dependsOn: string)` | Remove dependency |
| `updateTaskStatus(graph: DependencyGraph, taskId: string, status: ExecutionStatus)` | Update status |
| `getStatistics(graph: DependencyGraph)` | Get graph statistics |
| `registerTemplate(name: string, template: TaskTemplate)` | Register template |
| `fromTemplate(templateName: string, params: object)` | Create from template |

### ResultAggregator

#### Methods

| Method | Description |
|--------|-------------|
| `aggregate<T>(results: Map<string, T>)` | Aggregate results |
| `aggregateTaskResults<T>(taskId: string, results: AgentResult<T>[])` | Aggregate task results |
| `getCachedResult(key: string)` | Get cached result |
| `clearCache()` | Clear result cache |
| `registerValidator(validator: ResultValidator)` | Register custom validator |
| `registerConflictResolver(type: ConflictType, resolver: ConflictResolver)` | Register custom resolver |
| `getStatistics()` | Get aggregator statistics |

## Types

The package exports comprehensive TypeScript types:

```typescript
import type {
  AgentRole,
  TaskPriority,
  ExecutionStatus,
  KnowledgeLevel,
  ConflictResolutionStrategy,
  AgentPerformance,
  SwarmMetrics,
  SwarmConfig,
  SwarmState,
  AgentAssignment,
  OrchestratorConfig,
  AgentProfile,
  OrchestrationResult,
  KnowledgeConfig,
  KnowledgePartition,
  KnowledgeEntry,
  AccessPolicy,
  DecompositionConfig,
  TaskNode,
  DependencyGraph,
  AggregationConfig,
  AggregatedResult,
  AgentResult,
  ConflictReport,
} from '@superinstance/equipment-swarm-coordinator';
```

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Related Packages

- `@superinstance/starter-agent` - Base agent framework
- `@superinstance/equipment-consensus-engine` - Consensus mechanisms
- `@superinstance/equipment-memory-hierarchy` - Memory management
