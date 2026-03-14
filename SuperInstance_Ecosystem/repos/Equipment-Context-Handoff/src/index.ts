/**
 * @superinstance/equipment-context-handoff
 * 
 * Generational context transfer for long-running agent tasks.
 * Enables seamless handoff between agent instances while preserving
 * critical context and resume points.
 */

// Main equipment class
export { ContextHandoff } from './ContextHandoff';

// Supporting classes
export { ContextPackager } from './ContextPackager';
export { GenerationalTransfer } from './GenerationalTransfer';
export { ContextCompressor } from './ContextCompressor';
export { ResumePointManager } from './ResumePointManager';

// Types and interfaces
export type {
  HandoffContext,
  HandoffConfig,
  ContextPackage,
  ContextPriority,
  ResumePoint,
  TransferResult,
  CompressionOptions,
  HandoffTrigger,
  GenerationInfo,
  ContextMetadata,
  PrioritizedContent,
  HandoffEvent,
  HandoffEventHandler,
} from './types';

// Constants
export {
  DEFAULT_HANDOFF_CONFIG,
  PRIORITY_LEVELS,
  HANDOFF_TRIGGERS,
  MAX_CONTEXT_SIZE,
} from './constants';
