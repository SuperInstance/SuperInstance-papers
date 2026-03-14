/**
 * @superinstance/equipment-swarm-coordinator
 * 
 * Equipment for orchestrating multiple agents in origin-centric networks
 * with asymmetrical knowledge distribution.
 */

// Main exports
export { SwarmCoordinator, type SwarmConfig, type SwarmState, type AgentAssignment } from './SwarmCoordinator';
export { AgentOrchestrator, type OrchestratorConfig, type AgentProfile, type OrchestrationResult } from './AgentOrchestrator';
export { AsymmetricKnowledge, type KnowledgeConfig, type KnowledgePartition, type AccessPolicy } from './AsymmetricKnowledge';
export { TaskDecomposer, type DecompositionConfig, type TaskNode, type DependencyGraph } from './TaskDecomposer';
export { ResultAggregator, type AggregationConfig, type AggregatedResult, type ConflictReport } from './ResultAggregator';

// Type exports
export type {
  AgentRole,
  TaskPriority,
  ExecutionStatus,
  KnowledgeLevel,
  ConflictResolutionStrategy,
  AgentPerformance,
  SwarmMetrics
} from './types';
