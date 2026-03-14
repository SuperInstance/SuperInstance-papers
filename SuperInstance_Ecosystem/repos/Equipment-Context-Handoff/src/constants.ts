/**
 * Constants for Equipment-Context-Handoff
 */

import type { HandoffConfig, HandoffTrigger, ContextPriority } from './types';

/**
 * Default handoff configuration
 */
export const DEFAULT_HANDOFF_CONFIG: Required<Omit<HandoffConfig, 'onHandoff'>> & { onHandoff?: HandoffConfig['onHandoff'] } = {
  maxContextSize: 100000, // 100k tokens
  compressionLevel: 6,
  enableAutoTriggers: true,
  timeThreshold: 30 * 60 * 1000, // 30 minutes
  complexityThreshold: 100,
  costThreshold: 10.0, // $10
  tokenThreshold: 0.85, // 85% of max
  maxGenerations: 10,
  preserveCritical: true,
  enableResumePoints: true,
  onHandoff: undefined,
};

/**
 * Priority levels with their numeric weights
 */
export const PRIORITY_LEVELS: Record<ContextPriority, number> = {
  critical: 100,
  essential: 75,
  important: 50,
  optional: 25,
  disposable: 0,
};

/**
 * Default handoff triggers
 */
export const HANDOFF_TRIGGERS: HandoffTrigger[] = [
  {
    type: 'time',
    threshold: 30 * 60 * 1000, // 30 minutes
    enabled: true,
    action: 'handoff',
  },
  {
    type: 'token_limit',
    threshold: 0.85, // 85% of max
    enabled: true,
    action: 'compress',
  },
  {
    type: 'cost',
    threshold: 10.0, // $10
    enabled: true,
    action: 'warn',
  },
  {
    type: 'complexity',
    threshold: 100,
    enabled: true,
    action: 'handoff',
  },
  {
    type: 'error',
    threshold: 5, // 5 errors
    enabled: true,
    action: 'handoff',
  },
];

/**
 * Maximum context size in tokens
 */
export const MAX_CONTEXT_SIZE = 200000;

/**
 * Minimum context to preserve during compression
 */
export const MIN_PRESERVED_CONTEXT = 10000; // 10k tokens

/**
 * Compression strategies
 */
export const COMPRESSION_STRATEGIES = {
  size: {
    level: 9,
    aggressive: true,
    preserveRatio: 0.1,
  },
  speed: {
    level: 1,
    aggressive: false,
    preserveRatio: 0.3,
  },
  balanced: {
    level: 6,
    aggressive: false,
    preserveRatio: 0.2,
  },
} as const;

/**
 * Content type weights for prioritization
 */
export const CONTENT_TYPE_WEIGHTS: Record<string, number> = {
  'task_definition': 100,
  'user_goal': 95,
  'critical_result': 90,
  'conversation_key': 80,
  'tool_result': 70,
  'intermediate_step': 50,
  'debug_info': 30,
  'temporal_cache': 10,
};

/**
 * Decay factors for content aging
 */
export const DECAY_FACTORS = {
  // Decay per hour of inactivity
  hourlyDecay: 0.95,
  // Multiplier for content accessed recently
  recentAccessBonus: 1.2,
  // Time window for "recent" in ms
  recentWindow: 5 * 60 * 1000, // 5 minutes
};

/**
 * Resume point types and their priority
 */
export const RESUME_POINT_PRIORITIES = {
  task: 100,
  checkpoint: 80,
  process: 60,
  conversation: 40,
} as const;

/**
 * Package version for compatibility checking
 */
export const PACKAGE_VERSION = '1.0.0';

/**
 * Checksum algorithm
 */
export const CHECKSUM_ALGORITHM = 'sha256';
