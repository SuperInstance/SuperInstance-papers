/**
 * Teacher-Student Equipment
 * 
 * Main equipment class implementing distillation triggers with deadband
 * range thresholds for calling teachers.
 * 
 * Key behaviors:
 * - Operates autonomously within deadband range
 * - Calls teacher when outside deadband
 * - Learns from teacher responses via distillation
 * - Extracts muscle memory triggers when unequipping
 */

import type {
  Equipment,
  EquipmentSlot,
  OriginCore,
  Tile,
  CostMetrics,
  BenefitMetrics,
  TriggerThresholds,
  Task,
  TaskResult,
  ConfidenceZone,
  ProvenanceChain,
} from '@superinstance/starter-agent';

import { BaseEquipment } from '@superinstance/starter-agent';
import { DeadbandController, type TeacherCallReason } from './DeadbandController';
import { DistillationEngine, type TeacherResponse, type DistilledKnowledge } from './DistillationEngine';
import { MuscleMemory, type TriggerPattern } from './MuscleMemory';

export interface TeacherStudentConfig {
  /** Deadband controller configuration */
  deadband: {
    low: number;
    high: number;
    hysteresis?: number;
    adaptivityRate?: number;
  };
  /** Distillation engine configuration */
  distillation: {
    maxExamplesPerPattern?: number;
    successThreshold?: number;
    learningRate?: number;
  };
  /** Muscle memory configuration */
  muscleMemory: {
    extractionThreshold?: number;
    minApplications?: number;
    consolidationEnabled?: boolean;
  };
  /** Teacher call settings */
  teacher: {
    /** Endpoint for teacher calls */
    endpoint?: string;
    /** Maximum retries for teacher calls */
    maxRetries?: number;
    /** Timeout for teacher calls in ms */
    timeoutMs?: number;
    /** Whether to cache teacher responses */
    cacheResponses?: boolean;
  };
  /** Self-improvement settings */
  selfImprovement: {
    /** Whether to adapt deadband based on learning */
    adaptiveDeadband: boolean;
    /** Learning progress threshold for adaptation */
    adaptationThreshold: number;
    /** Minimum examples before adaptation */
    minExamplesForAdaptation: number;
  };
}

export interface TeacherStudentState {
  /** Whether the equipment is currently active */
  isActive: boolean;
  /** Number of tasks processed */
  tasksProcessed: number;
  /** Number of teacher calls made */
  teacherCalls: number;
  /** Number of times operated autonomously */
  autonomousOperations: number;
  /** Current learning progress (0.0 - 1.0) */
  learningProgress: number;
  /** Distilled knowledge patterns */
  knowledgePatterns: number;
  /** Muscle memory triggers */
  muscleMemoryTriggers: number;
  /** Average confidence when calling teacher */
  avgTeacherCallConfidence: number;
  /** Average confidence when autonomous */
  avgAutonomousConfidence: number;
}

export interface TeacherCallRecord {
  taskId: string;
  reason: TeacherCallReason;
  studentConfidence: number;
  teacherResponse: unknown;
  timestamp: number;
  learningGain: number;
}

/**
 * TeacherStudent Equipment
 * 
 * Implements a teacher-student learning paradigm where the agent operates
 * autonomously within a confidence deadband and calls a teacher for guidance
 * outside that range. Learning from teacher responses reduces future calls.
 */
export class TeacherStudent extends BaseEquipment implements Equipment {
  readonly name = '@superinstance/equipment-teacher-student';
  readonly slot: EquipmentSlot = 'DISTILLATION';
  readonly version = '1.0.0';
  readonly description = 
    'Distillation equipment with deadband thresholds for teacher calls. ' +
    'Operates autonomously within confidence range, learns from teacher guidance.';

  readonly cost: CostMetrics = {
    memoryBytes: 50 * 1024 * 1024, // 50MB for knowledge base
    cpuPercent: 5,
    latencyMs: 50, // Overhead for deadband checks
    costPerUse: 0.001, // Small cost for each evaluation
  };

  readonly benefit: BenefitMetrics = {
    accuracyBoost: 0.15, // Up to 15% accuracy improvement
    speedMultiplier: 1.2, // 20% faster after learning
    confidenceBoost: 0.1,
    capabilityGain: ['learning', 'distillation', 'self_improvement'],
  };

  readonly triggerThresholds: TriggerThresholds = {
    equipWhen: [
      { metric: 'confidence', operator: '<', value: 0.7 },
      { metric: 'task_complexity', operator: '>', value: 0.5 },
    ],
    unequipWhen: [
      { metric: 'learning_progress', operator: '>', value: 0.9 },
    ],
    callTeacher: { low: 0.6, high: 0.9 },
  };

  private config: TeacherStudentConfig;
  private deadbandController: DeadbandController;
  private distillationEngine: DistillationEngine;
  private muscleMemory: MuscleMemory;
  private state: TeacherStudentState;
  private agent: OriginCore | null = null;
  private teacherCallHistory: TeacherCallRecord[] = [];

  constructor(config: Partial<TeacherStudentConfig> = {}) {
    super();
    
    this.config = {
      deadband: {
        low: config.deadband?.low ?? 0.6,
        high: config.deadband?.high ?? 0.9,
        hysteresis: config.deadband?.hysteresis ?? 0.05,
        adaptivityRate: config.deadband?.adaptivityRate ?? 0.01,
      },
      distillation: {
        maxExamplesPerPattern: config.distillation?.maxExamplesPerPattern ?? 100,
        successThreshold: config.distillation?.successThreshold ?? 0.85,
        learningRate: config.distillation?.learningRate ?? 0.1,
      },
      muscleMemory: {
        extractionThreshold: config.muscleMemory?.extractionThreshold ?? 0.7,
        minApplications: config.muscleMemory?.minApplications ?? 3,
        consolidationEnabled: config.muscleMemory?.consolidationEnabled ?? true,
      },
      teacher: {
        endpoint: config.teacher?.endpoint ?? 'teacher://default',
        maxRetries: config.teacher?.maxRetries ?? 3,
        timeoutMs: config.teacher?.timeoutMs ?? 30000,
        cacheResponses: config.teacher?.cacheResponses ?? true,
      },
      selfImprovement: {
        adaptiveDeadband: config.selfImprovement?.adaptiveDeadband ?? true,
        adaptationThreshold: config.selfImprovement?.adaptationThreshold ?? 0.7,
        minExamplesForAdaptation: config.selfImprovement?.minExamplesForAdaptation ?? 5,
      },
    };

    this.deadbandController = new DeadbandController({
      low: this.config.deadband.low,
      high: this.config.deadband.high,
      hysteresis: this.config.deadband.hysteresis,
      adaptivityRate: this.config.deadband.adaptivityRate,
    });

    this.distillationEngine = new DistillationEngine({
      maxExamplesPerPattern: this.config.distillation.maxExamplesPerPattern,
      successThreshold: this.config.distillation.successThreshold,
      learningRate: this.config.distillation.learningRate,
    });

    this.muscleMemory = new MuscleMemory({
      extractionThreshold: this.config.muscleMemory.extractionThreshold,
      minApplications: this.config.muscleMemory.minApplications,
      consolidationEnabled: this.config.muscleMemory.consolidationEnabled,
    });

    this.state = {
      isActive: false,
      tasksProcessed: 0,
      teacherCalls: 0,
      autonomousOperations: 0,
      learningProgress: 0,
      knowledgePatterns: 0,
      muscleMemoryTriggers: 0,
      avgTeacherCallConfidence: 0,
      avgAutonomousConfidence: 0,
    };
  }

  /**
   * Equip this equipment to an agent
   */
  async equip(agent: OriginCore): Promise<void> {
    this.agent = agent;
    this.state.isActive = true;

    // Load any existing muscle memory triggers
    const existingTriggers = this.muscleMemory.getTriggers();
    if (existingTriggers.length > 0) {
      this.state.muscleMemoryTriggers = existingTriggers.length;
    }
  }

  /**
   * Unequip this equipment, extracting muscle memory
   */
  async unequip(agent: OriginCore): Promise<void> {
    // Extract muscle memory from learned knowledge
    const knowledgeBase = this.distillationEngine.getKnowledgeBase();
    const extractionResult = this.muscleMemory.extractFromKnowledge(knowledgeBase);

    // Store extraction results
    this.state.muscleMemoryTriggers = extractionResult.triggers.length;

    // Log extraction for debugging
    if (agent && process.env.NODE_ENV === 'development') {
      console.log(`Extracted ${extractionResult.triggers.length} muscle memory triggers`);
      console.log(`Quality score: ${extractionResult.quality.toFixed(2)}`);
    }

    this.agent = null;
    this.state.isActive = false;
  }

  /**
   * Process a task with teacher-student logic
   */
  async processTask(
    task: Task,
    studentProcess: () => Promise<{ output: unknown; confidence: number }>
  ): Promise<{
    output: unknown;
    confidence: number;
    calledTeacher: boolean;
    learningGain: number;
  }> {
    this.state.tasksProcessed++;

    // Check muscle memory for automatic triggers
    const memoryCheck = this.muscleMemory.checkTriggers({
      query: task.query,
      type: task.type,
      ...task.context,
    });

    // If muscle memory suggests skipping teacher
    if (memoryCheck.matched) {
      const skipAction = memoryCheck.actions.find(a => a.type === 'skip_teacher');
      if (skipAction) {
        // Use knowledge directly
        const knowledgeResult = this.distillationEngine.applyKnowledge(task);
        if (knowledgeResult.applicable) {
          this.state.autonomousOperations++;
          return {
            output: knowledgeResult.output,
            confidence: knowledgeResult.confidence,
            calledTeacher: false,
            learningGain: 0,
          };
        }
      }
    }

    // Get student's attempt
    const studentResult = await studentProcess();
    const { output: studentOutput, confidence: studentConfidence } = studentResult;

    // Evaluate against deadband
    const deadbandDecision = this.deadbandController.evaluate(studentConfidence);

    // Check if we should call teacher
    let shouldCallTeacher = deadbandDecision.shouldCall;
    let callReason: TeacherCallReason | null = deadbandDecision.reason;

    // Additional check: do we have distilled knowledge for this task?
    const knowledgeResult = this.distillationEngine.queryKnowledge(task);
    if (knowledgeResult.found && knowledgeResult.confidence >= this.config.distillation.successThreshold) {
      // Use distilled knowledge instead of calling teacher
      shouldCallTeacher = false;
      callReason = null;
    }

    if (shouldCallTeacher && callReason) {
      // Call teacher
      const teacherResult = await this.callTeacher(
        task,
        studentOutput,
        studentConfidence,
        callReason
      );

      // Learn from teacher response
      const distillResult = await this.distillationEngine.learnFromComparison(
        studentOutput,
        studentConfidence,
        {
          taskId: task.id,
          query: task.query,
          context: task.context ?? {},
          teacherOutput: teacherResult.output,
          teacherConfidence: teacherResult.confidence,
          teacherReasoning: teacherResult.reasoning,
          timestamp: Date.now(),
        }
      );

      // Update state
      this.state.teacherCalls++;
      this.state.avgTeacherCallConfidence = 
        (this.state.avgTeacherCallConfidence * (this.state.teacherCalls - 1) + studentConfidence) /
        this.state.teacherCalls;

      // Adapt deadband if learning is progressing
      if (this.config.selfImprovement.adaptiveDeadband) {
        const progress = this.distillationEngine.getLearningProgress();
        if (progress > this.config.selfImprovement.adaptationThreshold) {
          this.deadbandController.adapt(progress);
        }
      }

      return {
        output: teacherResult.output,
        confidence: teacherResult.confidence,
        calledTeacher: true,
        learningGain: distillResult.gain,
      };
    }

    // Operate autonomously
    this.state.autonomousOperations++;
    this.state.avgAutonomousConfidence = 
      (this.state.avgAutonomousConfidence * (this.state.autonomousOperations - 1) + studentConfidence) /
      this.state.autonomousOperations;

    // Update learning progress
    this.state.learningProgress = this.distillationEngine.getLearningProgress();
    this.state.knowledgePatterns = this.distillationEngine.getKnowledgeBase().length;

    return {
      output: studentOutput,
      confidence: studentConfidence,
      calledTeacher: false,
      learningGain: 0,
    };
  }

  /**
   * Evaluate simulation vs actual outcome
   */
  evaluateSimulation(
    expectedConfidence: number,
    actualConfidence: number,
    task: Task
  ): {
    shouldCallTeacher: boolean;
    mismatch: number;
  } {
    const decision = this.deadbandController.evaluateSimulation(
      expectedConfidence,
      actualConfidence
    );

    return {
      shouldCallTeacher: decision.shouldCall,
      mismatch: Math.abs(expectedConfidence - actualConfidence),
    };
  }

  /**
   * Get current state
   */
  getState(): TeacherStudentState {
    return { ...this.state };
  }

  /**
   * Get deadband boundaries
   */
  getDeadbandBoundaries(): { low: number; high: number } {
    return this.deadbandController.getBoundaries();
  }

  /**
   * Get distilled knowledge
   */
  getKnowledge(): DistilledKnowledge[] {
    return this.distillationEngine.getKnowledgeBase();
  }

  /**
   * Get muscle memory triggers
   */
  getMuscleMemory(): TriggerPattern[] {
    return this.muscleMemory.getTriggers();
  }

  /**
   * Get teacher call statistics
   */
  getCallStatistics(): {
    total: number;
    byReason: Record<TeacherCallReason, number>;
    reductionRate: number;
  } {
    const stats = this.deadbandController.getCallStatistics();
    const metrics = this.distillationEngine.getMetrics();

    return {
      total: stats.totalCalls,
      byReason: stats.callsByReason,
      reductionRate: metrics.callReduction,
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    autonomousRatio: number;
    learningEfficiency: number;
    knowledgeCoverage: number;
    triggerEffectiveness: number;
  } {
    const totalOps = this.state.teacherCalls + this.state.autonomousOperations;
    const autonomousRatio = totalOps > 0 ? this.state.autonomousOperations / totalOps : 0;

    const distillMetrics = this.distillationEngine.getMetrics();
    const memoryReport = this.muscleMemory.getPerformanceReport();

    return {
      autonomousRatio,
      learningEfficiency: this.state.learningProgress,
      knowledgeCoverage: Math.min(1, this.state.knowledgePatterns / 50),
      triggerEffectiveness: memoryReport.recentPerformance,
    };
  }

  /**
   * Reset learning state (but keep configuration)
   */
  reset(): void {
    this.deadbandController.reset();
    this.distillationEngine.reset();
    this.muscleMemory.reset();
    
    this.state = {
      isActive: this.state.isActive,
      tasksProcessed: 0,
      teacherCalls: 0,
      autonomousOperations: 0,
      learningProgress: 0,
      knowledgePatterns: 0,
      muscleMemoryTriggers: 0,
      avgTeacherCallConfidence: 0,
      avgAutonomousConfidence: 0,
    };

    this.teacherCallHistory = [];
  }

  /**
   * Export all learned knowledge for persistence
   */
  exportLearning(): {
    knowledge: DistilledKnowledge[];
    triggers: TriggerPattern[];
    deadbandState: ReturnType<DeadbandController['getState']>;
  } {
    return {
      knowledge: this.distillationEngine.getKnowledgeBase(),
      triggers: this.muscleMemory.export(),
      deadbandState: this.deadbandController.getState(),
    };
  }

  /**
   * Import previously learned knowledge
   */
  importLearning(data: {
    knowledge?: DistilledKnowledge[];
    triggers?: TriggerPattern[];
  }): void {
    if (data.triggers) {
      this.muscleMemory.import(data.triggers);
      this.state.muscleMemoryTriggers = data.triggers.length;
    }
    // Note: Knowledge import would require additional implementation in DistillationEngine
  }

  /**
   * Generate a Tile representation
   */
  asTile(): Tile {
    return {
      inputType: {
        type: 'composite',
        properties: {
          task: { type: 'primitive', name: 'Task' },
          confidence: { type: 'primitive', name: 'number' },
        },
      },
      outputType: {
        type: 'composite',
        properties: {
          output: { type: 'primitive', name: 'unknown' },
          confidence: { type: 'primitive', name: 'number' },
          calledTeacher: { type: 'primitive', name: 'boolean' },
        },
      },
      compute: (input: unknown) => {
        const { task, process } = input as { task: Task; process: () => Promise<{ output: unknown; confidence: number }> };
        return this.processTask(task, process);
      },
      confidence: (input: unknown) => {
        const { confidence } = input as { confidence: number };
        const decision = this.deadbandController.evaluate(confidence);
        return decision.shouldCall ? 0.95 : Math.min(0.95, confidence + 0.1);
      },
      trace: (input: unknown) => {
        const { task, confidence } = input as { task: Task; confidence: number };
        const decision = this.deadbandController.evaluate(confidence);
        const knowledge = this.distillationEngine.queryKnowledge(task);
        
        return `TeacherStudent: confidence=${confidence.toFixed(2)}, ` +
               `deadband=${decision.shouldCall ? 'outside' : 'within'}, ` +
               `knowledge=${knowledge.found ? 'found' : 'none'}`;
      },
    };
  }

  // Private methods

  private async callTeacher(
    task: Task,
    studentOutput: unknown,
    studentConfidence: number,
    reason: TeacherCallReason
  ): Promise<{
    output: unknown;
    confidence: number;
    reasoning?: string;
  }> {
    // Record the call
    this.deadbandController.recordTeacherCall(reason);

    // In a real implementation, this would call an actual teacher API
    // For now, we simulate with enhanced confidence
    const enhancedConfidence = Math.min(1, studentConfidence + 0.2);
    
    const record: TeacherCallRecord = {
      taskId: task.id,
      reason,
      studentConfidence,
      teacherResponse: studentOutput,
      timestamp: Date.now(),
      learningGain: 0.1,
    };

    this.teacherCallHistory.push(record);

    // Keep history manageable
    if (this.teacherCallHistory.length > 100) {
      this.teacherCallHistory = this.teacherCallHistory.slice(-100);
    }

    return {
      output: studentOutput,
      confidence: enhancedConfidence,
      reasoning: `Teacher validated for reason: ${reason}`,
    };
  }
}

export default TeacherStudent;
