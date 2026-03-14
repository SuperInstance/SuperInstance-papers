/**
 * @superinstance/equipment-teacher-student
 * 
 * Equipment implementing distillation triggers with deadband range thresholds
 * for calling teachers. Enables autonomous operation within confidence ranges
 * while learning from teacher guidance.
 * 
 * @packageDocumentation
 */

// Main equipment class
export { TeacherStudent, type TeacherStudentConfig, type TeacherStudentState, type TeacherCallRecord } from './TeacherStudent';

// Deadband controller
export { 
  DeadbandController, 
  type DeadbandConfig,
  type DeadbandState,
  type DeadbandAdjustment,
  type TeacherCallReason,
  type TeacherCallDecision,
} from './DeadbandController';

// Distillation engine
export { 
  DistillationEngine, 
  type DistillationConfig,
  type TeacherResponse,
  type StudentAttempt,
  type DistilledKnowledge,
  type KnowledgePattern,
  type PatternValue,
  type DistillationMetrics,
  type DistillationResult,
} from './DistillationEngine';

// Muscle memory
export { 
  MuscleMemory, 
  type MuscleMemoryConfig,
  type TriggerPattern,
  type TriggerCondition,
  type TriggerAction,
  type ExtractionResult,
  type ConsolidationResult,
  type MuscleMemoryState,
  type MuscleMemoryMetrics,
} from './MuscleMemory';

// Re-export base types for convenience
export type { 
  Equipment, 
  EquipmentSlot, 
  OriginCore, 
  Task, 
  TaskResult,
  Tile,
  CostMetrics,
  BenefitMetrics,
  TriggerThresholds,
} from '@superinstance/starter-agent';
