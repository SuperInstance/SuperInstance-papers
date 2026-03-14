/**
 * Shared types for the Equipment-Swarm-Coordinator
 */

/**
 * Role of an agent in the swarm
 */
export type AgentRole = 
  | 'coordinator'  // Coordinates other agents
  | 'executor'     // Executes tasks
  | 'observer'     // Observes and reports
  | 'validator'    // Validates results
  | 'specialist';  // Specialized for specific tasks

/**
 * Priority level for tasks
 */
export type TaskPriority = 
  | 'critical'  // Highest priority
  | 'high'      // High priority
  | 'normal'    // Normal priority
  | 'low';      // Low priority

/**
 * Execution status
 */
export type ExecutionStatus = 
  | 'idle'      // Not doing anything
  | 'running'   // Currently executing
  | 'paused'    // Temporarily paused
  | 'completed' // Successfully completed
  | 'failed';   // Failed to complete

/**
 * Knowledge access level
 */
export type KnowledgeLevel = 
  | 'minimal'   // Minimum required knowledge
  | 'limited'   // Limited knowledge
  | 'partial'   // Partial access
  | 'full';     // Full access

/**
 * Strategy for conflict resolution
 */
export type ConflictResolutionStrategy = 
  | 'voting'      // Democratic voting
  | 'weighted'    // Weighted by confidence/performance
  | 'hierarchical'// Based on agent hierarchy
  | 'consensus';  // Seek consensus

/**
 * Performance metrics for an agent
 */
export interface AgentPerformance {
  /** Agent identifier */
  agentId: string;
  /** Task identifier */
  taskId: string;
  /** Whether task was successful */
  success: boolean;
  /** Response time in ms */
  responseTime: number;
  /** Performance score (0-1) */
  score: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Overall metrics for the swarm
 */
export interface SwarmMetrics {
  /** Total number of agents */
  totalAgents: number;
  /** Average response time */
  averageResponseTime: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Tasks completed */
  throughput: number;
  /** Resource utilization (0-1) */
  resourceUtilization: number;
  /** Knowledge distribution score (0-1) */
  knowledgeDistributionScore: number;
}

/**
 * Configuration for a task
 */
export interface TaskConfig {
  /** Task identifier */
  taskId: string;
  /** Task description */
  description: string;
  /** Priority */
  priority: TaskPriority;
  /** Required capabilities */
  requiredCapabilities: string[];
  /** Timeout in ms */
  timeout: number;
  /** Maximum retries */
  maxRetries: number;
  /** Input data */
  input: Record<string, unknown>;
}

/**
 * Result of task execution
 */
export interface TaskResult<T = unknown> {
  /** Task identifier */
  taskId: string;
  /** Agent that executed */
  agentId: string;
  /** Result value */
  value: T;
  /** Confidence score */
  confidence: number;
  /** Execution status */
  status: ExecutionStatus;
  /** Error message if failed */
  error?: string;
  /** Execution time in ms */
  executionTime: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Event types for swarm coordination
 */
export type SwarmEventType = 
  | 'agent_registered'
  | 'agent_unregistered'
  | 'task_assigned'
  | 'task_completed'
  | 'task_failed'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'knowledge_distributed'
  | 'knowledge_requested';

/**
 * Event emitted by the swarm coordinator
 */
export interface SwarmEvent {
  /** Event type */
  type: SwarmEventType;
  /** Event data */
  data: unknown;
  /** Source that emitted the event */
  source: string;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Options for swarm execution
 */
export interface SwarmExecutionOptions {
  /** Maximum parallelism */
  maxParallelism: number;
  /** Timeout for entire execution */
  globalTimeout: number;
  /** Fail fast on error */
  failFast: boolean;
  /** Enable progress callbacks */
  enableProgressCallbacks: boolean;
  /** Callback for progress updates */
  onProgress?: (progress: ExecutionProgress) => void;
}

/**
 * Progress of execution
 */
export interface ExecutionProgress {
  /** Total tasks */
  totalTasks: number;
  /** Completed tasks */
  completedTasks: number;
  /** Failed tasks */
  failedTasks: number;
  /** Current phase */
  phase: 'decomposition' | 'allocation' | 'execution' | 'aggregation' | 'completed';
  /** Percentage complete (0-100) */
  percentage: number;
  /** Estimated time remaining in ms */
  estimatedTimeRemaining: number;
}

/**
 * Configuration for an agent
 */
export interface AgentConfig {
  /** Agent identifier */
  id: string;
  /** Agent name */
  name: string;
  /** Agent role */
  role: AgentRole;
  /** Capabilities */
  capabilities: string[];
  /** Maximum concurrent tasks */
  maxConcurrentTasks: number;
  /** Timeout preference */
  preferredTimeout: number;
  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Relationship between agents
 */
export interface AgentRelationship {
  /** Source agent */
  sourceAgentId: string;
  /** Target agent */
  targetAgentId: string;
  /** Relationship type */
  type: 'parent' | 'child' | 'peer' | 'supervisor' | 'subordinate';
  /** Strength of relationship (0-1) */
  strength: number;
}

/**
 * Knowledge transfer request
 */
export interface KnowledgeTransferRequest {
  /** Requesting agent */
  requestingAgentId: string;
  /** Target agent */
  targetAgentId: string;
  /** Knowledge keys requested */
  keys: string[];
  /** Reason for request */
  reason: string;
  /** Priority of request */
  priority: TaskPriority;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Knowledge transfer response
 */
export interface KnowledgeTransferResponse {
  /** Original request */
  request: KnowledgeTransferRequest;
  /** Whether approved */
  approved: boolean;
  /** Transferred knowledge */
  knowledge: Map<string, unknown>;
  /** Rejection reason if not approved */
  rejectionReason?: string;
  /** Timestamp */
  timestamp: Date;
}
