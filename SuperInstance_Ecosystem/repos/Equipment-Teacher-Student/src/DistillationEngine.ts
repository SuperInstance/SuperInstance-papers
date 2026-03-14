/**
 * Distillation Engine
 * 
 * Implements knowledge distillation from teacher to student.
 * Learns from teacher responses to reduce future teacher calls.
 */

import type { Task, TaskResult, ConfidenceZone } from '@superinstance/starter-agent';

export interface DistillationConfig {
  /** Maximum number of examples to store per pattern type */
  maxExamplesPerPattern: number;
  /** Minimum confidence to consider distillation successful */
  successThreshold: number;
  /** Learning rate for updating internal models */
  learningRate: number;
  /** Whether to use adaptive learning rates */
  adaptiveLearning: boolean;
  /** Time window for considering recent examples (ms) */
  recentWindowMs: number;
}

export interface TeacherResponse {
  taskId: string;
  query: string;
  context: Record<string, unknown>;
  teacherOutput: unknown;
  teacherConfidence: number;
  teacherReasoning?: string;
  timestamp: number;
}

export interface StudentAttempt {
  taskId: string;
  query: string;
  context: Record<string, unknown>;
  studentOutput: unknown;
  studentConfidence: number;
  matchedTeacher: boolean;
  learningGain: number;
  timestamp: number;
}

export interface DistilledKnowledge {
  /** Pattern ID for this knowledge */
  patternId: string;
  /** Type of task this applies to */
  taskType: string;
  /** Input pattern that triggers this knowledge */
  inputPattern: KnowledgePattern;
  /** Learned behavior or response pattern */
  outputPattern: KnowledgePattern;
  /** Confidence in this distilled knowledge */
  confidence: number;
  /** Number of teacher examples it was distilled from */
  sourceExamples: number;
  /** When this knowledge was created/updated */
  lastUpdated: number;
  /** How often this knowledge has been successfully applied */
  successfulApplications: number;
}

export interface KnowledgePattern {
  /** Feature keys used in pattern matching */
  features: string[];
  /** Pattern values (can be ranges, exact values, or fuzzy matches) */
  values: PatternValue[];
  /** Weight of each feature in matching */
  weights: number[];
}

export type PatternValue = 
  | { type: 'exact'; value: unknown }
  | { type: 'range'; min: number; max: number }
  | { type: 'fuzzy'; value: string; threshold: number }
  | { type: 'set'; values: unknown[] };

export interface DistillationMetrics {
  /** Total teacher responses processed */
  totalProcessed: number;
  /** Successfully distilled patterns */
  distilledPatterns: number;
  /** Average learning gain per distillation */
  averageLearningGain: number;
  /** Reduction in teacher calls over time */
  callReduction: number;
  /** Knowledge application success rate */
  applicationSuccessRate: number;
  /** Time-based learning progress */
  learningProgress: number[];
}

export interface DistillationResult {
  /** Whether distillation produced new/updated knowledge */
  learned: boolean;
  /** New or updated knowledge patterns */
  knowledge: DistilledKnowledge[];
  /** Learning gain from this distillation */
  gain: number;
  /** Whether this knowledge can replace teacher calls */
  canReplaceTeacher: boolean;
}

/**
 * DistillationEngine processes teacher responses and extracts learnable patterns.
 * Over time, it builds a knowledge base that reduces the need for teacher calls.
 */
export class DistillationEngine {
  private config: DistillationConfig;
  private teacherResponses: Map<string, TeacherResponse[]> = new Map();
  private studentAttempts: StudentAttempt[] = [];
  private knowledgeBase: Map<string, DistilledKnowledge> = new Map();
  private metrics: DistillationMetrics;

  constructor(config: Partial<DistillationConfig> = {}) {
    this.config = {
      maxExamplesPerPattern: config.maxExamplesPerPattern ?? 100,
      successThreshold: config.successThreshold ?? 0.85,
      learningRate: config.learningRate ?? 0.1,
      adaptiveLearning: config.adaptiveLearning ?? true,
      recentWindowMs: config.recentWindowMs ?? 86400000, // 24 hours
    };

    this.metrics = {
      totalProcessed: 0,
      distilledPatterns: 0,
      averageLearningGain: 0,
      callReduction: 0,
      applicationSuccessRate: 0,
      learningProgress: [],
    };
  }

  /**
   * Process a teacher response for distillation
   */
  async distill(response: TeacherResponse): Promise<DistillationResult> {
    // Store the teacher response
    this.storeTeacherResponse(response);
    this.metrics.totalProcessed++;

    // Extract patterns from the response
    const patterns = this.extractPatterns(response);

    // Update knowledge base
    const knowledge = this.updateKnowledge(patterns, response);

    // Calculate learning gain
    const gain = this.calculateLearningGain(knowledge);

    // Update metrics
    this.updateMetrics(gain);

    return {
      learned: knowledge.length > 0,
      knowledge,
      gain,
      canReplaceTeacher: this.canReplaceTeacher(knowledge),
    };
  }

  /**
   * Compare student attempt with teacher response and learn
   */
  async learnFromComparison(
    studentOutput: unknown,
    studentConfidence: number,
    teacherResponse: TeacherResponse
  ): Promise<DistillationResult> {
    const matched = this.compareOutputs(studentOutput, teacherResponse.teacherOutput);
    
    const attempt: StudentAttempt = {
      taskId: teacherResponse.taskId,
      query: teacherResponse.query,
      context: teacherResponse.context,
      studentOutput,
      studentConfidence,
      matchedTeacher: matched,
      learningGain: matched ? 0.1 : 0.2, // More learning from mistakes
      timestamp: Date.now(),
    };

    this.studentAttempts.push(attempt);

    // If student didn't match, this is a high-value learning opportunity
    if (!matched) {
      return this.distill(teacherResponse);
    }

    return {
      learned: false,
      knowledge: [],
      gain: 0.1,
      canReplaceTeacher: studentConfidence >= this.config.successThreshold,
    };
  }

  /**
   * Query the distilled knowledge base
   */
  queryKnowledge(task: Task): {
    found: boolean;
    knowledge: DistilledKnowledge | null;
    confidence: number;
  } {
    const pattern = this.extractInputPattern(task);
    
    for (const [, knowledge] of this.knowledgeBase) {
      if (this.matchesPattern(pattern, knowledge.inputPattern)) {
        // Update success count
        knowledge.successfulApplications++;
        
        return {
          found: true,
          knowledge,
          confidence: knowledge.confidence,
        };
      }
    }

    return {
      found: false,
      knowledge: null,
      confidence: 0,
    };
  }

  /**
   * Apply distilled knowledge to generate a response
   */
  applyKnowledge(task: Task): {
    applicable: boolean;
    output: unknown;
    confidence: number;
    knowledge: DistilledKnowledge | null;
  } {
    const query = this.queryKnowledge(task);
    
    if (!query.found || !query.knowledge) {
      return {
        applicable: false,
        output: null,
        confidence: 0,
        knowledge: null,
      };
    }

    // Generate output based on the pattern
    const output = this.generateFromPattern(task, query.knowledge);

    return {
      applicable: true,
      output,
      confidence: query.confidence,
      knowledge: query.knowledge,
    };
  }

  /**
   * Get distillation metrics
   */
  getMetrics(): DistillationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get all distilled knowledge
   */
  getKnowledgeBase(): DistilledKnowledge[] {
    return Array.from(this.knowledgeBase.values());
  }

  /**
   * Calculate overall learning progress (0.0 - 1.0)
   */
  getLearningProgress(): number {
    if (this.knowledgeBase.size === 0) return 0;

    let totalConfidence = 0;
    let totalApplications = 0;

    for (const knowledge of this.knowledgeBase.values()) {
      totalConfidence += knowledge.confidence;
      totalApplications += knowledge.successfulApplications;
    }

    // Combine confidence and usage metrics
    const avgConfidence = totalConfidence / this.knowledgeBase.size;
    const usageFactor = Math.min(1, totalApplications / 100);

    return avgConfidence * 0.7 + usageFactor * 0.3;
  }

  /**
   * Prune old knowledge and examples
   */
  prune(): void {
    const cutoff = Date.now() - this.config.recentWindowMs;

    // Prune teacher responses
    for (const [key, responses] of this.teacherResponses) {
      const recent = responses.filter(r => r.timestamp > cutoff);
      if (recent.length === 0) {
        this.teacherResponses.delete(key);
      } else {
        this.teacherResponses.set(key, recent);
      }
    }

    // Prune student attempts
    this.studentAttempts = this.studentAttempts.filter(a => a.timestamp > cutoff);

    // Prune low-confidence knowledge
    for (const [key, knowledge] of this.knowledgeBase) {
      if (knowledge.confidence < 0.3 && knowledge.successfulApplications < 5) {
        this.knowledgeBase.delete(key);
      }
    }
  }

  /**
   * Reset the distillation engine
   */
  reset(): void {
    this.teacherResponses.clear();
    this.studentAttempts = [];
    this.knowledgeBase.clear();
    this.metrics = {
      totalProcessed: 0,
      distilledPatterns: 0,
      averageLearningGain: 0,
      callReduction: 0,
      applicationSuccessRate: 0,
      learningProgress: [],
    };
  }

  // Private methods

  private storeTeacherResponse(response: TeacherResponse): void {
    const patternKey = this.getPatternKey(response.query, response.context);
    const responses = this.teacherResponses.get(patternKey) ?? [];
    responses.push(response);

    // Limit stored responses
    if (responses.length > this.config.maxExamplesPerPattern) {
      responses.shift();
    }

    this.teacherResponses.set(patternKey, responses);
  }

  private extractPatterns(response: TeacherResponse): {
    inputPattern: KnowledgePattern;
    outputPattern: KnowledgePattern;
  } {
    const inputPattern = this.extractInputPattern({
      id: response.taskId,
      type: 'analysis',
      query: response.query,
      context: response.context,
    });

    const outputPattern = this.extractOutputPattern(response.teacherOutput);

    return { inputPattern, outputPattern };
  }

  private extractInputPattern(task: Task): KnowledgePattern {
    const features: string[] = ['query'];
    const values: PatternValue[] = [];
    const weights: number[] = [0.5];

    // Extract query pattern
    values.push({
      type: 'fuzzy',
      value: task.query.toLowerCase(),
      threshold: 0.7,
    });

    // Extract context features
    if (task.context) {
      for (const [key, value] of Object.entries(task.context)) {
        features.push(key);
        weights.push(0.1);

        if (typeof value === 'number') {
          values.push({
            type: 'range',
            min: value * 0.8,
            max: value * 1.2,
          });
        } else if (typeof value === 'string') {
          values.push({
            type: 'fuzzy',
            value: value.toLowerCase(),
            threshold: 0.7,
          });
        } else {
          values.push({
            type: 'exact',
            value,
          });
        }
      }
    }

    // Normalize weights
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => w / weightSum);

    return { features, values, weights: normalizedWeights };
  }

  private extractOutputPattern(output: unknown): KnowledgePattern {
    const features: string[] = ['output'];
    const values: PatternValue[] = [];
    const weights: number[] = [1.0];

    if (typeof output === 'object' && output !== null) {
      const obj = output as Record<string, unknown>;
      for (const [key, value] of Object.entries(obj).slice(0, 10)) {
        features.push(key);
        weights.push(0.1);

        if (typeof value === 'number') {
          values.push({
            type: 'range',
            min: value * 0.9,
            max: value * 1.1,
          });
        } else {
          values.push({
            type: 'exact',
            value,
          });
        }
      }
    } else {
      values.push({
        type: 'exact',
        value: output,
      });
    }

    return { features, values, weights };
  }

  private updateKnowledge(
    patterns: { inputPattern: KnowledgePattern; outputPattern: KnowledgePattern },
    response: TeacherResponse
  ): DistilledKnowledge[] {
    const patternKey = this.getPatternKey(response.query, response.context);
    const responses = this.teacherResponses.get(patternKey) ?? [];
    
    // Check if we have enough examples to create/update knowledge
    if (responses.length < 2) {
      return [];
    }

    // Calculate consensus from responses
    const consensus = this.calculateConsensus(responses);

    // Update or create knowledge
    let knowledge = this.knowledgeBase.get(patternKey);
    
    if (knowledge) {
      // Update existing knowledge
      knowledge.confidence = this.updateConfidence(
        knowledge.confidence,
        response.teacherConfidence
      );
      knowledge.sourceExamples = responses.length;
      knowledge.lastUpdated = Date.now();
    } else {
      // Create new knowledge
      knowledge = {
        patternId: patternKey,
        taskType: this.inferTaskType(response.query),
        inputPattern: patterns.inputPattern,
        outputPattern: patterns.outputPattern,
        confidence: response.teacherConfidence,
        sourceExamples: responses.length,
        lastUpdated: Date.now(),
        successfulApplications: 0,
      };
      this.knowledgeBase.set(patternKey, knowledge);
      this.metrics.distilledPatterns++;
    }

    return [knowledge];
  }

  private calculateConsensus(responses: TeacherResponse[]): {
    confidence: number;
    outputPattern: KnowledgePattern;
  } {
    // Average confidence
    const avgConfidence = responses.reduce((sum, r) => sum + r.teacherConfidence, 0) / responses.length;
    
    // Extract output pattern from most recent high-confidence response
    const best = responses.reduce((a, b) => 
      a.teacherConfidence > b.teacherConfidence ? a : b
    );

    return {
      confidence: avgConfidence,
      outputPattern: this.extractOutputPattern(best.teacherOutput),
    };
  }

  private updateConfidence(current: number, newConfidence: number): number {
    const rate = this.config.adaptiveLearning
      ? this.config.learningRate * (1 + Math.abs(newConfidence - current))
      : this.config.learningRate;
    
    return current * (1 - rate) + newConfidence * rate;
  }

  private calculateLearningGain(knowledge: DistilledKnowledge[]): number {
    if (knowledge.length === 0) return 0;

    // Learning gain based on confidence and number of examples
    return knowledge.reduce((sum, k) => {
      const confidenceGain = k.confidence * 0.5;
      const exampleBonus = Math.min(0.3, k.sourceExamples * 0.03);
      return sum + confidenceGain + exampleBonus;
    }, 0) / knowledge.length;
  }

  private canReplaceTeacher(knowledge: DistilledKnowledge[]): boolean {
    if (knowledge.length === 0) return false;
    
    return knowledge.every(k => 
      k.confidence >= this.config.successThreshold &&
      k.sourceExamples >= 3 &&
      k.successfulApplications >= 2
    );
  }

  private updateMetrics(gain: number): void {
    // Update average learning gain
    const n = this.metrics.totalProcessed;
    this.metrics.averageLearningGain = 
      (this.metrics.averageLearningGain * (n - 1) + gain) / n;

    // Track learning progress over time
    this.metrics.learningProgress.push(this.getLearningProgress());
    if (this.metrics.learningProgress.length > 100) {
      this.metrics.learningProgress.shift();
    }

    // Calculate call reduction
    if (this.metrics.learningProgress.length >= 10) {
      const recent = this.metrics.learningProgress.slice(-10);
      const older = this.metrics.learningProgress.slice(-20, -10);
      if (older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        this.metrics.callReduction = Math.max(0, (recentAvg - olderAvg) / Math.max(0.01, olderAvg));
      }
    }
  }

  private matchesPattern(input: KnowledgePattern, pattern: KnowledgePattern): boolean {
    if (input.features.length !== pattern.features.length) return false;

    let totalMatch = 0;
    
    for (let i = 0; i < pattern.features.length; i++) {
      const featureMatch = this.matchFeature(input.values[i], pattern.values[i]);
      totalMatch += featureMatch * pattern.weights[i];
    }

    return totalMatch >= 0.7; // 70% match threshold
  }

  private matchFeature(input: PatternValue, pattern: PatternValue): number {
    if (input.type !== pattern.type) return 0;

    switch (pattern.type) {
      case 'exact':
        return input.value === pattern.value ? 1 : 0;
      case 'range':
        return (input as { min: number; max: number }).min >= pattern.min &&
               (input as { min: number; max: number }).max <= pattern.max ? 1 : 0.5;
      case 'fuzzy':
        // Simplified fuzzy match
        const inputStr = (input as { value: string }).value.toLowerCase();
        const patternStr = pattern.value.toLowerCase();
        return inputStr.includes(patternStr) || patternStr.includes(inputStr) ? 1 : 0.5;
      case 'set':
        return pattern.values.includes((input as { value: unknown }).value) ? 1 : 0;
      default:
        return 0;
    }
  }

  private generateFromPattern(task: Task, knowledge: DistilledKnowledge): unknown {
    // Simple generation based on the output pattern
    const output: Record<string, unknown> = {};
    
    for (let i = 0; i < knowledge.outputPattern.features.length; i++) {
      const feature = knowledge.outputPattern.features[i];
      const value = knowledge.outputPattern.values[i];
      
      if (feature === 'output') {
        return (value as { value: unknown }).value;
      }
      
      if (value.type === 'exact') {
        output[feature] = (value as { value: unknown }).value;
      } else if (value.type === 'range') {
        output[feature] = ((value as { min: number }).min + (value as { max: number }).max) / 2;
      }
    }

    return Object.keys(output).length > 0 ? output : null;
  }

  private getPatternKey(query: string, context: Record<string, unknown>): string {
    const contextKeys = Object.keys(context ?? {}).sort().join(',');
    return `${query.substring(0, 50)}:${contextKeys}`;
  }

  private inferTaskType(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('analyze') || lowerQuery.includes('examine')) {
      return 'analysis';
    }
    if (lowerQuery.includes('create') || lowerQuery.includes('generate')) {
      return 'generation';
    }
    if (lowerQuery.includes('decide') || lowerQuery.includes('choose')) {
      return 'decision';
    }
    if (lowerQuery.includes('learn') || lowerQuery.includes('improve')) {
      return 'learning';
    }
    
    return 'general';
  }

  private compareOutputs(student: unknown, teacher: unknown): boolean {
    if (student === teacher) return true;
    
    if (typeof student === 'object' && typeof teacher === 'object') {
      if (student === null || teacher === null) return student === teacher;
      
      const sKeys = Object.keys(student as object);
      const tKeys = Object.keys(teacher as object);
      
      if (sKeys.length !== tKeys.length) return false;
      
      for (const key of sKeys) {
        if (!this.compareOutputs(
          (student as Record<string, unknown>)[key],
          (teacher as Record<string, unknown>)[key]
        )) {
          return false;
        }
      }
      
      return true;
    }
    
    return false;
  }
}

export default DistillationEngine;
