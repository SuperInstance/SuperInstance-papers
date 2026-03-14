/**
 * Type definitions for Equipment-Context-Handoff
 */

/**
 * Priority levels for context content
 */
export type ContextPriority = 'critical' | 'essential' | 'important' | 'optional' | 'disposable';

/**
 * Types of handoff triggers
 */
export type HandoffTriggerType = 'time' | 'complexity' | 'cost' | 'token_limit' | 'error' | 'manual';

/**
 * Configuration for context handoff
 */
export interface HandoffConfig {
  /** Maximum context size in tokens */
  maxContextSize?: number;
  /** Compression level (0-9) */
  compressionLevel?: number;
  /** Enable automatic handoff triggers */
  enableAutoTriggers?: boolean;
  /** Time threshold in milliseconds for auto-handoff */
  timeThreshold?: number;
  /** Complexity threshold for auto-handoff */
  complexityThreshold?: number;
  /** Cost threshold for auto-handoff */
  costThreshold?: number;
  /** Token usage threshold (percentage) for auto-handoff */
  tokenThreshold?: number;
  /** Maximum number of generations before forced compression */
  maxGenerations?: number;
  /** Preserve strategy for critical content */
  preserveCritical?: boolean;
  /** Enable resume point tracking */
  enableResumePoints?: boolean;
  /** Custom handoff event handler */
  onHandoff?: HandoffEventHandler;
}

/**
 * Metadata about context content
 */
export interface ContextMetadata {
  /** Unique identifier */
  id: string;
  /** Content type */
  type: string;
  /** Priority level */
  priority: ContextPriority;
  /** Creation timestamp */
  createdAt: number;
  /** Last access timestamp */
  lastAccessedAt: number;
  /** Access count */
  accessCount: number;
  /** Estimated token count */
  tokenCount: number;
  /** Source agent ID */
  sourceAgentId?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Dependencies on other content */
  dependencies?: string[];
}

/**
 * Prioritized content item
 */
export interface PrioritizedContent {
  /** Content identifier */
  id: string;
  /** The actual content */
  content: unknown;
  /** Metadata about the content */
  metadata: ContextMetadata;
  /** Calculated priority score */
  priorityScore: number;
  /** Whether content can be compressed */
  compressible: boolean;
  /** Whether content can be dropped */
  droppable: boolean;
}

/**
 * Packaged context ready for transfer
 */
export interface ContextPackage {
  /** Package version */
  version: string;
  /** Unique package ID */
  packageId: string;
  /** Generation information */
  generation: GenerationInfo;
  /** All packaged content */
  content: Map<string, PrioritizedContent>;
  /** Compressed content blob */
  compressedBlob?: Buffer;
  /** Compression ratio achieved */
  compressionRatio?: number;
  /** Resume points included */
  resumePoints: ResumePoint[];
  /** Transfer checksum for integrity */
  checksum: string;
  /** Package creation timestamp */
  createdAt: number;
  /** Total token count */
  totalTokens: number;
}

/**
 * Information about agent generation
 */
export interface GenerationInfo {
  /** Generation number (0 = original) */
  generationNumber: number;
  /** Parent generation package ID */
  parentPackageId?: string;
  /** Ancestry chain */
  ancestry: string[];
  /** Total accumulated time across generations */
  accumulatedTime: number;
  /** Total accumulated cost across generations */
  accumulatedCost: number;
  /** Agent instance ID */
  agentInstanceId: string;
}

/**
 * Resume point for picking up where previous agent left off
 */
export interface ResumePoint {
  /** Resume point ID */
  id: string;
  /** Type of resume point */
  type: 'task' | 'conversation' | 'process' | 'checkpoint';
  /** Resume point name/label */
  name: string;
  /** Description of the resume point */
  description: string;
  /** State to restore */
  state: Record<string, unknown>;
  /** Position indicator */
  position: number | string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Timestamp when created */
  createdAt: number;
  /** Estimated remaining work */
  estimatedRemaining?: number;
  /** Dependencies for this resume point */
  dependencies?: string[];
  /** Context needed to resume */
  requiredContext?: string[];
}

/**
 * Result of a context transfer
 */
export interface TransferResult {
  /** Whether transfer was successful */
  success: boolean;
  /** The transferred context package */
  package?: ContextPackage;
  /** Error message if failed */
  error?: string;
  /** Warnings during transfer */
  warnings?: string[];
  /** Statistics about the transfer */
  stats: {
    /** Original size in tokens */
    originalTokens: number;
    /** Final size in tokens */
    finalTokens: number;
    /** Compression ratio */
    compressionRatio: number;
    /** Items transferred */
    itemsTransferred: number;
    /** Items dropped */
    itemsDropped: number;
    /** Time taken in ms */
    transferTime: number;
  };
}

/**
 * Compression options
 */
export interface CompressionOptions {
  /** Compression level (0-9) */
  level?: number;
  /** Strategy for compression */
  strategy?: 'size' | 'speed' | 'balanced';
  /** Whether to use lossy compression */
  allowLossy?: boolean;
  /** Maximum compression ratio target */
  targetRatio?: number;
  /** Preserve these content IDs */
  preserveIds?: string[];
  /** Custom compression function */
  customCompressor?: (content: unknown) => unknown;
}

/**
 * Handoff trigger configuration
 */
export interface HandoffTrigger {
  /** Trigger type */
  type: HandoffTriggerType;
  /** Threshold value */
  threshold: number;
  /** Whether trigger is enabled */
  enabled: boolean;
  /** Custom condition function */
  condition?: (context: HandoffContext) => boolean;
  /** Action to take when triggered */
  action?: 'handoff' | 'compress' | 'warn' | 'custom';
  /** Custom action handler */
  customAction?: (context: HandoffContext) => void;
}

/**
 * Runtime context for handoff decisions
 */
export interface HandoffContext {
  /** Current token count */
  tokenCount: number;
  /** Maximum allowed tokens */
  maxTokens: number;
  /** Elapsed time in ms */
  elapsedTime: number;
  /** Accumulated cost */
  accumulatedCost: number;
  /** Task complexity score */
  complexityScore: number;
  /** Current generation number */
  generationNumber: number;
  /** Number of active items */
  itemCount: number;
  /** Resume points count */
  resumePointCount: number;
  /** Error count */
  errorCount: number;
  /** Last activity timestamp */
  lastActivity: number;
  /** Custom metrics */
  customMetrics?: Record<string, number>;
}

/**
 * Event types for handoff
 */
export type HandoffEventType = 
  | 'handoff:initiated'
  | 'handoff:completed'
  | 'handoff:failed'
  | 'compression:started'
  | 'compression:completed'
  | 'resume:created'
  | 'resume:activated'
  | 'trigger:fired'
  | 'context:overflow';

/**
 * Handoff event
 */
export interface HandoffEvent {
  /** Event type */
  type: HandoffEventType;
  /** Event timestamp */
  timestamp: number;
  /** Event data */
  data: Record<string, unknown>;
  /** Source generation */
  generation: number;
  /** Event severity */
  severity: 'info' | 'warning' | 'error';
}

/**
 * Event handler function type
 */
export type HandoffEventHandler = (event: HandoffEvent) => void | Promise<void>;
