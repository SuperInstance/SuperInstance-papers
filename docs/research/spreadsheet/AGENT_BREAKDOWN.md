# Agent Breakdown Strategy

**Research Program:** POLLN Breakdown Engine - Spreadsheet Integration
**Focus:** Agent Analysis, Decomposition, and Conversion Systems
**Status:** Design Complete
**Date:** 2026-03-08

---

## Executive Summary

This document specifies the **Agent Breakdown Strategy** - a systematic approach for converting large, complex agents into smaller, more efficient components, then further optimizing them into bots, scripts, and pure functions. The strategy enables cost optimization, performance improvement, and maintainability while preserving essential agency where needed.

### Key Innovation

> "Not every problem needs an LLM. Not every agent needs agency. Break down until you find the simplest form that works, then optimize from there."

### Core Principles

1. **Progressive Simplification** - Break down complex agents into smaller, focused components
2. **Agency Determination** - Identify where decision-making is truly required
3. **Cost Optimization** - Convert expensive operations to cheaper alternatives
4. **Pattern Extraction** - Identify reusable patterns and extract them
5. **Inspectability** - Maintain transparency throughout the breakdown process

---

## Table of Contents

1. [Breakdown Levels](#1-breakdown-levels)
2. [Agent Analyzer](#2-agent-analyzer)
3. [Decomposer](#3-decomposer)
4. [Complexity Profiler](#4-complexity-profiler)
5. [Target Converter](#5-target-converter)
6. [Agency Determinator](#6-agency-determinator)
7. [Decision Trees](#7-decision-trees)
8. [TypeScript Interfaces](#8-typescript-interfaces)
9. [Implementation Examples](#9-implementation-examples)
10. [Integration with Existing Systems](#10-integration-with-existing-systems)

---

## 1. Breakdown Levels

### 1.1 Hierarchy of Abstraction

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT BREAKDOWN HIERARCHY                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LEVEL 4: COMPLEX AGENT (Multi-step Reasoning)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Multiple reasoning steps chained together              │  │
│  │ • LLM-based (GPT-4, Claude Opus)                        │  │
│  │ • Cost: $0.01-0.03 per 1K tokens                        │  │
│  │ • Latency: 5-15 seconds                                 │  │
│  │ • Example: "Analyze data, generate insights, recommend"  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓ BREAK DOWN                           │
│  LEVEL 3: SIMPLE AGENT (Single Task)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Single focused task                                   │  │
│  │ • LLM-based (GPT-4, Claude 3.5)                         │  │
│  │ • Cost: $0.003-0.01 per 1K tokens                       │  │
│  │ • Latency: 2-5 seconds                                  │  │
│  │ • Example: "Extract sales figures from report"          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓ CONVERT                              │
│  LEVEL 2: BOT (Rule-Based)                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Deterministic rules and patterns                      │  │
│  │ • Small ML or distilled models                          │  │
│  │ • Cost: $0.0001-0.001 per operation                     │  │
│  │ • Latency: 50-500ms                                     │  │
│  │ • Example: "Parse CSV, extract column"                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓ COMPILE                              │
│  LEVEL 1: SCRIPT (Automated)                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Procedural code                                       │  │
│  │ • No ML inference                                       │  │
│  │ • Cost: $0                                              │  │
│  │ • Latency: 1-50ms                                       │  │
│  │ • Example: "Sum column, filter rows"                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓ EXTRACT                              │
│  LEVEL 0: FUNCTION (Pure Computation)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Pure function, deterministic                          │  │
│  │ • Compiled/optimized                                    │  │
│  │ • Cost: $0                                              │  │
│  │ • Latency: <1ms                                         │  │
│  │ • Example: "Add two numbers"                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Level Characteristics

| Level | Name | Agency | Cost | Latency | Decision Making | Use Case |
|-------|------|--------|------|---------|-----------------|----------|
| **4** | Complex Agent | Full | High | Slow | Multi-step reasoning | Complex analysis, synthesis |
| **3** | Simple Agent | Full | Medium | Medium | Single-step reasoning | Focused tasks, extraction |
| **2** | Bot | Limited | Low | Fast | Rule-based + patterns | Routine operations, parsing |
| **1** | Script | None | None | Very Fast | Procedural | Data transformations |
| **0** | Function | None | None | Instant | Deterministic | Pure computation |

### 1.3 Breakdown Triggers

```typescript
interface BreakdownTrigger {
  // Size-based triggers
  maxTokenCount: number;           // Default: 1000 tokens
  maxComplexityScore: number;      // Default: 0.7 (out of 1.0)

  // Cost-based triggers
  maxCostPerOperation: number;     // Default: $0.01
  monthlyCostThreshold: number;    // Default: $100

  // Performance-based triggers
  maxLatencyMs: number;            // Default: 5000ms
  minThroughputPerSecond: number;  // Default: 0.2 ops/sec

  // Frequency-based triggers
  minOperationsPerDay: number;     // Default: 100
  consistencyThreshold: number;    // Default: 0.85 (85% similar)
}
```

---

## 2. Agent Analyzer

### 2.1 Purpose

The **Agent Analyzer** examines an agent to understand what it does, how it works, and what it produces. This is the first step in any breakdown strategy.

### 2.2 Analysis Dimensions

```typescript
/**
 * Agent analysis result
 */
export interface AgentAnalysis {
  // Identity
  agentId: string;
  agentName: string;
  analysisDate: number;

  // Functional analysis
  functionality: {
    primaryTask: string;
    subTasks: string[];
    inputSchema: Schema;
    outputSchema: Schema;
    transformationType: TransformationType;
  };

  // Complexity analysis
  complexity: {
    score: number;              // 0-1, higher = more complex
    reasoningSteps: number;
    decisionPoints: number;
    branches: number;
    loops: number;
  };

  // Agency analysis
  agency: {
    required: boolean;
    decisionMaking: DecisionMakingType;
    adaptability: number;       // 0-1, how adaptive is it?
    creativity: number;         // 0-1, how creative is it?
  };

  // Cost analysis
  cost: {
    perOperation: number;
    monthlyAverage: number;
    annualProjected: number;
    optimizationPotential: number; // 0-1, savings potential
  };

  // Performance analysis
  performance: {
    avgLatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    throughputPerSecond: number;
    errorRate: number;
  };

  // Pattern analysis
  patterns: {
    deterministic: boolean;
    repeated: boolean;
    extractable: boolean;
    reusable: boolean;
  };

  // Breakdown recommendations
  recommendations: BreakdownRecommendation[];
}

/**
 * Transformation type enum
 */
export enum TransformationType {
  // Data transformations
  FILTER = 'filter',
  MAP = 'map',
  REDUCE = 'reduce',
  AGGREGATE = 'aggregate',
  SORT = 'sort',
  GROUP = 'group',

  // Text transformations
  EXTRACT = 'extract',
  SUMMARIZE = 'summarize',
  TRANSLATE = 'translate',
  FORMAT = 'format',

  // Analytical transformations
  ANALYZE = 'analyze',
  COMPARE = 'compare',
  CLASSIFY = 'classify',
  SCORE = 'score',

  // Creative transformations
  GENERATE = 'generate',
  SYNTHESIZE = 'synthesize',
  CREATE = 'create',

  // Complex transformations
  MULTI_STEP = 'multi_step',
  CONDITIONAL = 'conditional',
  ITERATIVE = 'iterative',
}

/**
 * Decision making type
 */
export enum DecisionMakingType {
  DETERMINISTIC = 'deterministic',      // Always same output for same input
  RULE_BASED = 'rule_based',            // Follows explicit rules
  PATTERN_BASED = 'pattern_based',      // Learned patterns
  CONTEXTUAL = 'contextual',            // Depends on context
  CREATIVE = 'creative',                // Generates novel outputs
  STRATEGIC = 'strategic',              // Long-term planning
}

/**
 * Schema definition
 */
export interface Schema {
  type: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  enum?: string[];
  format?: string;
  description?: string;
}
```

### 2.3 Analysis Process

```typescript
/**
 * Agent Analyzer - Understand agent capabilities
 */
export class AgentAnalyzer {

  /**
   * Analyze an agent comprehensively
   */
  async analyze(agent: Agent): Promise<AgentAnalysis> {
    const analysis: AgentAnalysis = {
      agentId: agent.id,
      agentName: agent.name,
      analysisDate: Date.now(),

      functionality: await this.analyzeFunctionality(agent),
      complexity: await this.analyzeComplexity(agent),
      agency: await this.analyzeAgency(agent),
      cost: await this.analyzeCost(agent),
      performance: await this.analyzePerformance(agent),
      patterns: await this.analyzePatterns(agent),
      recommendations: [],
    };

    // Generate recommendations
    analysis.recommendations = await this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Analyze agent functionality
   */
  private async analyzeFunctionality(agent: Agent): Promise<AgentAnalysis['functionality']> {
    // Execute agent with sample inputs
    const samples = await this.generateSampleInputs(agent);
    const executions = await Promise.all(
      samples.map(s => agent.execute(s))
    );

    // Analyze transformations
    const transformationType = this.identifyTransformation(executions);

    // Infer schemas from executions
    const inputSchema = this.inferInputSchema(executions);
    const outputSchema = this.inferOutputSchema(executions);

    // Extract sub-tasks
    const subTasks = await this.extractSubTasks(agent, executions);

    return {
      primaryTask: agent.description,
      subTasks,
      inputSchema,
      outputSchema,
      transformationType,
    };
  }

  /**
   * Analyze agent complexity
   */
  private async analyzeComplexity(agent: Agent): Promise<AgentAnalysis['complexity']> {
    // If agent has reasoning steps, analyze them
    if (agent.reasoningSteps) {
      return {
        score: this.calculateComplexityScore(agent.reasoningSteps),
        reasoningSteps: agent.reasoningSteps.length,
        decisionPoints: this.countDecisionPoints(agent.reasoningSteps),
        branches: this.countBranches(agent.reasoningSteps),
        loops: this.countLoops(agent.reasoningSteps),
      };
    }

    // Otherwise, estimate from execution patterns
    const executions = await this.getExecutionHistory(agent);
    return {
      score: this.estimateComplexityFromHistory(executions),
      reasoningSteps: this.estimateReasoningSteps(executions),
      decisionPoints: this.estimateDecisionPoints(executions),
      branches: this.estimateBranches(executions),
      loops: this.estimateLoops(executions),
    };
  }

  /**
   * Analyze agency requirements
   */
  private async analyzeAgency(agent: Agent): Promise<AgentAnalysis['agency']> {
    const executions = await this.getExecutionHistory(agent);

    // Check if outputs vary for same inputs
    const deterministic = this.checkDeterminism(executions);

    // Check if agent adapts to context
    const adaptability = this.measureAdaptability(executions);

    // Check if agent generates novel outputs
    const creativity = this.measureCreativity(executions);

    // Determine decision making type
    const decisionMaking = this.classifyDecisionMaking(executions);

    return {
      required: !deterministic || adaptability > 0.3 || creativity > 0.3,
      decisionMaking,
      adaptability,
      creativity,
    };
  }

  /**
   * Analyze cost
   */
  private async analyzeCost(agent: Agent): Promise<AgentAnalysis['cost']> {
    const executions = await this.getExecutionHistory(agent);

    // Calculate per-operation cost
    const perOperation = this.calculateAverageCost(executions);

    // Estimate monthly cost
    const monthlyAverage = perOperation * executions.length * 30;

    // Project annual cost
    const annualProjected = monthlyAverage * 12;

    // Calculate optimization potential
    const optimizationPotential = await this.calculateOptimizationPotential(agent);

    return {
      perOperation,
      monthlyAverage,
      annualProjected,
      optimizationPotential,
    };
  }

  /**
   * Analyze performance
   */
  private async analyzePerformance(agent: Agent): Promise<AgentAnalysis['performance']> {
    const executions = await this.getExecutionHistory(agent);

    const latencies = executions.map(e => e.latencyMs);
    latencies.sort((a, b) => a - b);

    return {
      avgLatencyMs: this.average(latencies),
      p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)],
      p99LatencyMs: latencies[Math.floor(latencies.length * 0.99)],
      throughputPerSecond: 1000 / this.average(latencies),
      errorRate: executions.filter(e => e.error).length / executions.length,
    };
  }

  /**
   * Analyze patterns
   */
  private async analyzePatterns(agent: Agent): Promise<AgentAnalysis['patterns']> {
    const executions = await this.getExecutionHistory(agent);

    // Check if outputs are deterministic
    const deterministic = this.checkDeterminism(executions);

    // Check if operations are repeated
    const repeated = executions.length >= 100;

    // Check if patterns are extractable
    const extractable = await this.checkExtractability(executions);

    // Check if reusable across contexts
    const reusable = await this.checkReusability(agent);

    return {
      deterministic,
      repeated,
      extractable,
      reusable,
    };
  }

  /**
   * Generate breakdown recommendations
   */
  private async generateRecommendations(
    analysis: AgentAnalysis
  ): Promise<BreakdownRecommendation[]> {
    const recommendations: BreakdownRecommendation[] = [];

    // Check if agent is too complex
    if (analysis.complexity.score > 0.7) {
      recommendations.push({
        type: 'decompose',
        reason: 'Complexity score too high',
        targetLevel: BreakdownLevel.SIMPLE_AGENT,
        expectedSavings: 0.5,
        confidence: 0.9,
      });
    }

    // Check if agent is too expensive
    if (analysis.cost.perOperation > 0.01) {
      recommendations.push({
        type: 'convert',
        reason: 'Operation cost too high',
        targetLevel: analysis.agency.required ?
          BreakdownLevel.SIMPLE_AGENT : BreakdownLevel.BOT,
        expectedSavings: 0.7,
        confidence: 0.8,
      });
    }

    // Check if agent is deterministic
    if (analysis.patterns.deterministic && !analysis.agency.required) {
      recommendations.push({
        type: 'convert',
        reason: 'Deterministic operation',
        targetLevel: BreakdownLevel.SCRIPT,
        expectedSavings: 0.95,
        confidence: 0.95,
      });
    }

    // Check if agent has repeated patterns
    if (analysis.patterns.repeated && analysis.patterns.extractable) {
      recommendations.push({
        type: 'extract',
        reason: 'Extractable pattern detected',
        targetLevel: BreakdownLevel.FUNCTION,
        expectedSavings: 0.9,
        confidence: 0.85,
      });
    }

    // Check if agent is slow
    if (analysis.performance.avgLatencyMs > 5000) {
      recommendations.push({
        type: 'optimize',
        reason: 'Latency too high',
        targetLevel: analysis.agency.required ?
          BreakdownLevel.SIMPLE_AGENT : BreakdownLevel.BOT,
        expectedSavings: 0.6,
        confidence: 0.7,
      });
    }

    return recommendations;
  }

  // Helper methods
  private average(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private calculateComplexityScore(steps: ReasoningStep[]): number {
    // Complex if many steps, branches, or loops
    const stepScore = Math.min(steps.length / 10, 0.4);
    const branchScore = this.countBranches(steps) / 10;
    const loopScore = this.countLoops(steps) / 5;
    return Math.min(stepScore + branchScore + loopScore, 1);
  }

  private countDecisionPoints(steps: ReasoningStep[]): number {
    return steps.filter(s =>
      s.type === StepType.DECISION_MAKING ||
      s.type === StepType.COMPARISON
    ).length;
  }

  private countBranches(steps: ReasoningStep[]): number {
    return steps.filter(s =>
      s.type === StepType.CONTINGENCY ||
      s.type === StepType.COMPARISON
    ).length;
  }

  private countLoops(steps: ReasoningStep[]): number {
    return steps.filter(s =>
      s.rawText.toLowerCase().includes('for each') ||
      s.rawText.toLowerCase().includes('iterate') ||
      s.rawText.toLowerCase().includes('repeat')
    ).length;
  }

  private checkDeterminism(executions: AgentExecution[]): boolean {
    // Group by input hash
    const groups = new Map<string, AgentExecution[]>();
    for (const exec of executions) {
      const hash = this.hashInput(exec.input);
      if (!groups.has(hash)) groups.set(hash, []);
      groups.get(hash)!.push(exec);
    }

    // Check if same inputs produce same outputs
    for (const [hash, group] of groups) {
      if (group.length < 2) continue;

      const firstOutput = JSON.stringify(group[0].output);
      for (let i = 1; i < group.length; i++) {
        if (JSON.stringify(group[i].output) !== firstOutput) {
          return false; // Not deterministic
        }
      }
    }

    return true; // Deterministic
  }

  private measureAdaptability(executions: AgentExecution[]): number {
    // Measure how much output varies based on context
    // Higher = more adaptive
    // Implementation: analyze output variance for similar inputs
    return 0.5; // Placeholder
  }

  private measureCreativity(executions: AgentExecution[]): number {
    // Measure novelty of outputs
    // Higher = more creative
    // Implementation: check for novel combinations, unique outputs
    return 0.3; // Placeholder
  }

  private classifyDecisionMaking(executions: AgentExecution[]): DecisionMakingType {
    if (this.checkDeterminism(executions)) {
      return DecisionMakingType.DETERMINISTIC;
    }

    const adaptability = this.measureAdaptability(executions);
    const creativity = this.measureCreativity(executions);

    if (creativity > 0.7) return DecisionMakingType.CREATIVE;
    if (adaptability > 0.7) return DecisionMakingType.CONTEXTUAL;
    if (adaptability > 0.3) return DecisionMakingType.PATTERN_BASED;

    return DecisionMakingType.RULE_BASED;
  }

  private calculateAverageCost(executions: AgentExecution[]): number {
    return this.average(executions.map(e => e.cost));
  }

  private async calculateOptimizationPotential(agent: Agent): Promise<number> {
    // Estimate potential savings from breakdown
    // Implementation: analyze complexity, patterns, agency
    return 0.6; // Placeholder: 60% potential savings
  }

  private async checkExtractability(executions: AgentExecution[]): Promise<boolean> {
    // Check if operation can be extracted as reusable pattern
    // Implementation: look for consistent input-output patterns
    return true; // Placeholder
  }

  private async checkReusability(agent: Agent): Promise<boolean> {
    // Check if agent logic can be reused in different contexts
    // Implementation: analyze task generality
    return true; // Placeholder
  }

  private hashInput(input: unknown): string {
    // Simple hash function for inputs
    return JSON.stringify(input);
  }

  private identifyTransformation(executions: AgentExecution[]): TransformationType {
    // Analyze input-output transformation pattern
    // Implementation: classify based on schema changes
    return TransformationType.MULTI_STEP; // Placeholder
  }

  private inferInputSchema(executions: AgentExecution[]): Schema {
    // Infer input schema from execution history
    // Implementation: analyze input types and structure
    return { type: 'object' }; // Placeholder
  }

  private inferOutputSchema(executions: AgentExecution[]): Schema {
    // Infer output schema from execution history
    // Implementation: analyze output types and structure
    return { type: 'object' }; // Placeholder
  }

  private async extractSubTasks(agent: Agent, executions: AgentExecution[]): Promise<string[]> {
    // Extract sub-tasks from agent reasoning steps
    if (agent.reasoningSteps) {
      return agent.reasoningSteps.map(s => s.summary);
    }
    return [];
  }

  private async generateSampleInputs(agent: Agent): Promise<unknown[]> {
    // Generate sample inputs for testing
    // Implementation: use agent input schema or examples
    return [{}]; // Placeholder
  }

  private async getExecutionHistory(agent: Agent): Promise<AgentExecution[]> {
    // Retrieve execution history from storage
    // Implementation: query database or cache
    return []; // Placeholder
  }

  private estimateComplexityFromHistory(executions: AgentExecution[]): number {
    // Estimate complexity from execution patterns
    // Implementation: analyze latency, cost, token usage
    return 0.5; // Placeholder
  }

  private estimateReasoningSteps(executions: AgentExecution[]): number {
    // Estimate number of reasoning steps
    // Implementation: analyze token count, duration
    return 5; // Placeholder
  }

  private estimateDecisionPoints(executions: AgentExecution[]): number {
    // Estimate decision points from execution patterns
    return 2; // Placeholder
  }

  private estimateBranches(executions: AgentExecution[]): number {
    // Estimate branches from execution patterns
    return 1; // Placeholder
  }

  private estimateLoops(executions: AgentExecution[]): number {
    // Estimate loops from execution patterns
    return 0; // Placeholder
  }
}

/**
 * Agent interface
 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  reasoningSteps?: ReasoningStep[];
  execute(input: unknown): Promise<AgentExecution>;
}

/**
 * Reasoning step interface
 */
export interface ReasoningStep {
  type: StepType;
  summary: string;
  rawText: string;
}

/**
 * Step type enum
 */
export enum StepType {
  OBSERVATION = 'observation',
  ANALYSIS = 'analysis',
  INFERENCE = 'inference',
  ACTION = 'action',
  VERIFICATION = 'verification',
  COMPARISON = 'comparison',
  CONTINGENCY = 'contingency',
  DECISION_MAKING = 'decision_making',
}

/**
 * Agent execution interface
 */
export interface AgentExecution {
  input: unknown;
  output: unknown;
  latencyMs: number;
  cost: number;
  error?: Error;
  timestamp: number;
}

/**
 * Breakdown recommendation
 */
export interface BreakdownRecommendation {
  type: 'decompose' | 'convert' | 'extract' | 'optimize';
  reason: string;
  targetLevel: BreakdownLevel;
  expectedSavings: number; // 0-1, proportion of cost savings
  confidence: number; // 0-1, how confident in this recommendation
}

/**
 * Breakdown level enum
 */
export enum BreakdownLevel {
  COMPLEX_AGENT = 'complex_agent',
  SIMPLE_AGENT = 'simple_agent',
  BOT = 'bot',
  SCRIPT = 'script',
  FUNCTION = 'function',
}
```

---

## 3. Decomposer

### 3.1 Purpose

The **Decomposer** splits large agents into smaller, focused components. It identifies natural boundaries in the agent's logic and creates separate agents for each sub-task.

### 3.2 Decomposition Strategies

```typescript
/**
 * Decomposition strategy
 */
export enum DecompositionStrategy {
  // Split by reasoning steps
  BY_REASONING_STEP = 'by_reasoning_step',

  // Split by sub-task
  BY_SUBTASK = 'by_subtask',

  // Split by data transformation
  BY_TRANSFORMATION = 'by_transformation',

  // Split by decision point
  BY_DECISION_POINT = 'by_decision_point',

  // Split by input/output boundary
  BY_IO_BOUNDARY = 'by_io_boundary',

  // Hybrid approach
  HYBRID = 'hybrid',
}

/**
 * Decomposition result
 */
export interface DecompositionResult {
  originalAgent: Agent;
  strategy: DecompositionStrategy;
  components: DecomposedComponent[];
  composition: CompositionPattern;
  estimatedSavings: number;
  confidence: number;
}

/**
 * Decomposed component
 */
export interface DecomposedComponent {
  id: string;
  name: string;
  description: string;
  inputs: Schema;
  outputs: Schema;
  logicLevel: BreakdownLevel;
  reasoningSteps: ReasoningStep[];
  dependencies: string[];
}

/**
 * Composition pattern
 */
export interface CompositionPattern {
  type: 'serial' | 'parallel' | 'conditional' | 'loop';
  dependencies: Array<{
    from: string;
    to: string;
    condition?: string;
  }>;
}
```

### 3.3 Decomposer Implementation

```typescript
/**
 * Decomposer - Split agents into smaller units
 */
export class Decomposer {

  /**
   * Decompose an agent using the best strategy
   */
  async decompose(
    agent: Agent,
    analysis?: AgentAnalysis
  ): Promise<DecompositionResult> {
    // Analyze if not provided
    const agentAnalysis = analysis || await new AgentAnalyzer().analyze(agent);

    // Select best strategy
    const strategy = this.selectStrategy(agentAnalysis);

    // Execute decomposition
    const result = await this.executeDecomposition(agent, strategy);

    return result;
  }

  /**
   * Select best decomposition strategy
   */
  private selectStrategy(analysis: AgentAnalysis): DecompositionStrategy {
    // If agent has clear reasoning steps, split by step
    if (analysis.complexity.reasoningSteps > 3) {
      return DecompositionStrategy.BY_REASONING_STEP;
    }

    // If agent has clear sub-tasks, split by sub-task
    if (analysis.functionality.subTasks.length > 1) {
      return DecompositionStrategy.BY_SUBTASK;
    }

    // If agent has multiple transformations, split by transformation
    if (this.hasMultipleTransformations(analysis)) {
      return DecompositionStrategy.BY_TRANSFORMATION;
    }

    // If agent has decision points, split by decision point
    if (analysis.complexity.decisionPoints > 0) {
      return DecompositionStrategy.BY_DECISION_POINT;
    }

    // Default: hybrid approach
    return DecompositionStrategy.HYBRID;
  }

  /**
   * Execute decomposition
   */
  private async executeDecomposition(
    agent: Agent,
    strategy: DecompositionStrategy
  ): Promise<DecompositionResult> {
    switch (strategy) {
      case DecompositionStrategy.BY_REASONING_STEP:
        return this.decomposeByReasoningStep(agent);

      case DecompositionStrategy.BY_SUBTASK:
        return this.decomposeBySubtask(agent);

      case DecompositionStrategy.BY_TRANSFORMATION:
        return this.decomposeByTransformation(agent);

      case DecompositionStrategy.BY_DECISION_POINT:
        return this.decomposeByDecisionPoint(agent);

      case DecompositionStrategy.BY_IO_BOUNDARY:
        return this.decomposeByIOBoundary(agent);

      case DecompositionStrategy.HYBRID:
        return this.decomposeHybrid(agent);

      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }

  /**
   * Decompose by reasoning step
   */
  private async decomposeByReasoningStep(agent: Agent): Promise<DecompositionResult> {
    if (!agent.reasoningSteps || agent.reasoningSteps.length <= 1) {
      throw new Error('Agent must have multiple reasoning steps');
    }

    const components: DecomposedComponent[] = [];

    // Group related reasoning steps
    const groups = this.groupReasoningSteps(agent.reasoningSteps);

    // Create component for each group
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];

      components.push({
        id: `${agent.id}_component_${i}`,
        name: this.generateComponentName(group),
        description: this.generateComponentDescription(group),
        inputs: this.inferComponentInputs(group),
        outputs: this.inferComponentOutputs(group),
        logicLevel: this.determineLogicLevel(group),
        reasoningSteps: group,
        dependencies: this.inferDependencies(group, groups, i),
      });
    }

    // Determine composition pattern
    const composition = this.determineCompositionPattern(groups);

    // Calculate savings
    const estimatedSavings = this.estimateSavings(components);

    return {
      originalAgent: agent,
      strategy: DecompositionStrategy.BY_REASONING_STEP,
      components,
      composition,
      estimatedSavings,
      confidence: 0.8,
    };
  }

  /**
   * Decompose by sub-task
   */
  private async decomposeBySubtask(agent: Agent): Promise<DecompositionResult> {
    const analysis = await new AgentAnalyzer().analyze(agent);
    const subTasks = analysis.functionality.subTasks;

    if (subTasks.length <= 1) {
      throw new Error('Agent must have multiple sub-tasks');
    }

    const components: DecomposedComponent[] = [];

    // Create component for each sub-task
    for (let i = 0; i < subTasks.length; i++) {
      const subTask = subTasks[i];

      components.push({
        id: `${agent.id}_subtask_${i}`,
        name: subTask,
        description: `Handles sub-task: ${subTask}`,
        inputs: analysis.functionality.inputSchema,
        outputs: analysis.functionality.outputSchema,
        logicLevel: BreakdownLevel.SIMPLE_AGENT,
        reasoningSteps: [],
        dependencies: [],
      });
    }

    return {
      originalAgent: agent,
      strategy: DecompositionStrategy.BY_SUBTASK,
      components,
      composition: {
        type: 'serial',
        dependencies: components.slice(0, -1).map((_, i) => ({
          from: components[i].id,
          to: components[i + 1].id,
        })),
      },
      estimatedSavings: 0.4,
      confidence: 0.7,
    };
  }

  /**
   * Decompose by transformation
   */
  private async decomposeByTransformation(agent: Agent): Promise<DecompositionResult> {
    const analysis = await new AgentAnalyzer().analyze(agent);

    // Identify transformation stages
    const stages = this.identifyTransformationStages(analysis);

    const components: DecomposedComponent[] = stages.map((stage, i) => ({
      id: `${agent.id}_transform_${i}`,
      name: `${stage.type} operation`,
      description: `Performs ${stage.type} transformation`,
      inputs: stage.inputSchema,
      outputs: stage.outputSchema,
      logicLevel: this.mapTransformationToLevel(stage.type),
      reasoningSteps: [],
      dependencies: [],
    }));

    return {
      originalAgent: agent,
      strategy: DecompositionStrategy.BY_TRANSFORMATION,
      components,
      composition: {
        type: 'serial',
        dependencies: components.slice(0, -1).map((_, i) => ({
          from: components[i].id,
          to: components[i + 1].id,
        })),
      },
      estimatedSavings: 0.5,
      confidence: 0.75,
    };
  }

  /**
   * Decompose by decision point
   */
  private async decomposeByDecisionPoint(agent: Agent): Promise<DecompositionResult> {
    const analysis = await new AgentAnalyzer().analyze(agent);

    if (analysis.complexity.decisionPoints === 0) {
      throw new Error('Agent has no decision points');
    }

    // Create components for each branch
    const components: DecomposedComponent[] = [
      {
        id: `${agent.id}_evaluator`,
        name: 'Condition Evaluator',
        description: 'Evaluates decision condition',
        inputs: analysis.functionality.inputSchema,
        outputs: { type: 'boolean' },
        logicLevel: BreakdownLevel.SCRIPT,
        reasoningSteps: [],
        dependencies: [],
      },
      {
        id: `${agent.id}_branch_true`,
        name: 'True Branch',
        description: 'Handles true condition path',
        inputs: analysis.functionality.inputSchema,
        outputs: analysis.functionality.outputSchema,
        logicLevel: BreakdownLevel.SIMPLE_AGENT,
        reasoningSteps: [],
        dependencies: [`${agent.id}_evaluator`],
      },
      {
        id: `${agent.id}_branch_false`,
        name: 'False Branch',
        description: 'Handles false condition path',
        inputs: analysis.functionality.inputSchema,
        outputs: analysis.functionality.outputSchema,
        logicLevel: BreakdownLevel.SIMPLE_AGENT,
        reasoningSteps: [],
        dependencies: [`${agent.id}_evaluator`],
      },
    ];

    return {
      originalAgent: agent,
      strategy: DecompositionStrategy.BY_DECISION_POINT,
      components,
      composition: {
        type: 'conditional',
        dependencies: [
          {
            from: `${agent.id}_evaluator`,
            to: `${agent.id}_branch_true`,
            condition: 'true',
          },
          {
            from: `${agent.id}_evaluator`,
            to: `${agent.id}_branch_false`,
            condition: 'false',
          },
        ],
      },
      estimatedSavings: 0.3,
      confidence: 0.6,
    };
  }

  /**
   * Decompose by I/O boundary
   */
  private async decomposeByIOBoundary(agent: Agent): Promise<DecompositionResult> {
    // Identify natural I/O boundaries in agent logic
    const boundaries = await this.identifyIOBoundaries(agent);

    const components: DecomposedComponent[] = boundaries.map((boundary, i) => ({
      id: `${agent.id}_io_${i}`,
      name: `I/O Stage ${i + 1}`,
      description: `Processes ${boundary.input} to ${boundary.output}`,
      inputs: boundary.inputSchema,
      outputs: boundary.outputSchema,
      logicLevel: BreakdownLevel.BOT,
      reasoningSteps: [],
      dependencies: i > 0 ? [`${agent.id}_io_${i - 1}`] : [],
    }));

    return {
      originalAgent: agent,
      strategy: DecompositionStrategy.BY_IO_BOUNDARY,
      components,
      composition: {
        type: 'serial',
        dependencies: components.slice(0, -1).map((_, i) => ({
          from: components[i].id,
          to: components[i + 1].id,
        })),
      },
      estimatedSavings: 0.4,
      confidence: 0.65,
    };
  }

  /**
   * Decompose using hybrid approach
   */
  private async decomposeHybrid(agent: Agent): Promise<DecompositionResult> {
    // Try multiple strategies and pick best result
    const strategies = [
      DecompositionStrategy.BY_REASONING_STEP,
      DecompositionStrategy.BY_SUBTASK,
      DecompositionStrategy.BY_TRANSFORMATION,
    ];

    let bestResult: DecompositionResult | null = null;
    let bestScore = 0;

    for (const strategy of strategies) {
      try {
        const result = await this.executeDecomposition(agent, strategy);
        const score = result.estimatedSavings * result.confidence;

        if (score > bestScore) {
          bestScore = score;
          bestResult = result;
        }
      } catch (error) {
        // Strategy failed, try next
        continue;
      }
    }

    if (!bestResult) {
      throw new Error('All decomposition strategies failed');
    }

    return bestResult;
  }

  // Helper methods
  private groupReasoningSteps(steps: ReasoningStep[]): ReasoningStep[][] {
    // Group related reasoning steps
    // Implementation: use clustering or manual grouping
    const groups: ReasoningStep[][] = [];
    let currentGroup: ReasoningStep[] = [];

    for (const step of steps) {
      currentGroup.push(step);

      // Start new group at decision points
      if (step.type === StepType.DECISION_MAKING ||
          step.type === StepType.COMPARISON) {
        groups.push(currentGroup);
        currentGroup = [];
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  private generateComponentName(steps: ReasoningStep[]): string {
    const types = steps.map(s => s.type).join('_');
    return `Component_${types}`;
  }

  private generateComponentDescription(steps: ReasoningStep[]): string {
    return steps.map(s => s.summary).join('; ');
  }

  private inferComponentInputs(steps: ReasoningStep[]): Schema {
    // Infer input schema from reasoning steps
    return { type: 'object' }; // Placeholder
  }

  private inferComponentOutputs(steps: ReasoningStep[]): Schema {
    // Infer output schema from reasoning steps
    return { type: 'object' }; // Placeholder
  }

  private determineLogicLevel(steps: ReasoningStep[]): BreakdownLevel {
    // Determine appropriate logic level for component
    if (steps.some(s => s.type === StepType.DECISION_MAKING)) {
      return BreakdownLevel.SIMPLE_AGENT;
    }
    return BreakdownLevel.BOT;
  }

  private inferDependencies(
    group: ReasoningStep[],
    allGroups: ReasoningStep[][],
    index: number
  ): string[] {
    // Infer dependencies from reasoning steps
    const deps: string[] = [];

    if (index > 0) {
      deps.push(`component_${index - 1}`);
    }

    return deps;
  }

  private determineCompositionPattern(groups: ReasoningStep[][]): CompositionPattern {
    // Determine if composition is serial, parallel, or conditional
    const hasConditional = groups.some(g =>
      g.some(s => s.type === StepType.DECISION_MAKING)
    );

    if (hasConditional) {
      return {
        type: 'conditional',
        dependencies: [],
      };
    }

    return {
      type: 'serial',
      dependencies: groups.map((_, i) => ({
        from: `component_${i}`,
        to: `component_${i + 1}`,
      })).filter(d => d.to !== `component_${groups.length}`),
    };
  }

  private estimateSavings(components: DecomposedComponent[]): number {
    // Estimate cost savings from decomposition
    // More components = more opportunities for optimization
    return Math.min(components.length * 0.1, 0.7);
  }

  private hasMultipleTransformations(analysis: AgentAnalysis): boolean {
    // Check if agent performs multiple transformations
    // Implementation: analyze transformation types
    return false; // Placeholder
  }

  private identifyTransformationStages(analysis: AgentAnalysis): Array<{
    type: TransformationType;
    inputSchema: Schema;
    outputSchema: Schema;
  }> {
    // Identify transformation stages
    return []; // Placeholder
  }

  private mapTransformationToLevel(type: TransformationType): BreakdownLevel {
    // Map transformation type to logic level
    switch (type) {
      case TransformationType.FILTER:
      case TransformationType.MAP:
      case TransformationType.SORT:
        return BreakdownLevel.SCRIPT;

      case TransformationType.EXTRACT:
      case TransformationType.FORMAT:
        return BreakdownLevel.BOT;

      case TransformationType.ANALYZE:
      case TransformationType.SYNTHESIZE:
        return BreakdownLevel.SIMPLE_AGENT;

      default:
        return BreakdownLevel.SIMPLE_AGENT;
    }
  }

  private async identifyIOBoundaries(agent: Agent): Promise<Array<{
    input: string;
    output: string;
    inputSchema: Schema;
    outputSchema: Schema;
  }>> {
    // Identify natural I/O boundaries
    return []; // Placeholder
  }
}
```

---

## 4. Complexity Profiler

### 4.1 Purpose

The **Complexity Profiler** measures the size and complexity of agents to determine when breakdown is needed.

### 4.2 Complexity Metrics

```typescript
/**
 * Complexity profile
 */
export interface ComplexityProfile {
  // Size metrics
  size: {
    tokenCount: number;
    reasoningSteps: number;
    linesOfCode: number;
    dependencies: number;
  };

  // Structural complexity
  structure: {
    cyclomaticComplexity: number;
    nestingDepth: number;
    branches: number;
    loops: number;
    conditionals: number;
  };

  // Cognitive complexity
  cognitive: {
    score: number;              // 0-1, higher = more complex
    reasoningChains: number;
    decisionPoints: number;
    ambiguity: number;          // 0-1, how ambiguous?
  };

  // Data complexity
  data: {
    inputComplexity: number;    // 0-1
    outputComplexity: number;   // 0-1
    transformationComplexity: number; // 0-1
    schemaSize: number;
  };

  // Overall complexity score
  overall: {
    score: number;              // 0-1
    level: 'simple' | 'moderate' | 'complex' | 'very_complex';
    breakdownRecommended: boolean;
    recommendedLevel: BreakdownLevel;
  };
}
```

### 4.3 Profiler Implementation

```typescript
/**
 * Complexity Profiler - Measure size/complexity
 */
export class ComplexityProfiler {

  /**
   * Profile agent complexity
   */
  async profile(agent: Agent): Promise<ComplexityProfile> {
    const profile: ComplexityProfile = {
      size: await this.measureSize(agent),
      structure: await this.measureStructure(agent),
      cognitive: await this.measureCognitiveComplexity(agent),
      data: await this.measureDataComplexity(agent),
      overall: {
        score: 0,
        level: 'simple',
        breakdownRecommended: false,
        recommendedLevel: BreakdownLevel.COMPLEX_AGENT,
      },
    };

    // Calculate overall score
    profile.overall = this.calculateOverall(profile);

    return profile;
  }

  /**
   * Measure agent size
   */
  private async measureSize(agent: Agent): Promise<ComplexityProfile['size']> {
    // Count tokens in agent definition
    const tokenCount = await this.countTokens(agent);

    // Count reasoning steps
    const reasoningSteps = agent.reasoningSteps?.length || 0;

    // Estimate lines of code
    const linesOfCode = this.estimateLinesOfCode(agent);

    // Count dependencies
    const dependencies = await this.countDependencies(agent);

    return {
      tokenCount,
      reasoningSteps,
      linesOfCode,
      dependencies,
    };
  }

  /**
   * Measure structural complexity
   */
  private async measureStructure(agent: Agent): Promise<ComplexityProfile['structure']> {
    // Calculate cyclomatic complexity
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(agent);

    // Measure nesting depth
    const nestingDepth = this.measureNestingDepth(agent);

    // Count branches
    const branches = this.countBranches(agent);

    // Count loops
    const loops = this.countLoops(agent);

    // Count conditionals
    const conditionals = this.countConditionals(agent);

    return {
      cyclomaticComplexity,
      nestingDepth,
      branches,
      loops,
      conditionals,
    };
  }

  /**
   * Measure cognitive complexity
   */
  private async measureCognitiveComplexity(agent: Agent): Promise<ComplexityProfile['cognitive']> {
    const executions = await this.getExecutionHistory(agent);

    // Count reasoning chains
    const reasoningChains = this.countReasoningChains(executions);

    // Count decision points
    const decisionPoints = this.countDecisionPoints(executions);

    // Measure ambiguity
    const ambiguity = this.measureAmbiguity(executions);

    // Calculate cognitive score
    const score = this.calculateCognitiveScore({
      reasoningChains,
      decisionPoints,
      ambiguity,
    });

    return {
      score,
      reasoningChains,
      decisionPoints,
      ambiguity,
    };
  }

  /**
   * Measure data complexity
   */
  private async measureDataComplexity(agent: Agent): Promise<ComplexityProfile['data']> {
    const analysis = await new AgentAnalyzer().analyze(agent);

    // Calculate input complexity
    const inputComplexity = this.calculateSchemaComplexity(
      analysis.functionality.inputSchema
    );

    // Calculate output complexity
    const outputComplexity = this.calculateSchemaComplexity(
      analysis.functionality.outputSchema
    );

    // Calculate transformation complexity
    const transformationComplexity = this.calculateTransformationComplexity(
      analysis.functionality.transformationType
    );

    // Calculate schema size
    const schemaSize = this.calculateSchemaSize(analysis.functionality);

    return {
      inputComplexity,
      outputComplexity,
      transformationComplexity,
      schemaSize,
    };
  }

  /**
   * Calculate overall complexity
   */
  private calculateOverall(profile: ComplexityProfile): ComplexityProfile['overall'] {
    // Weight different complexity dimensions
    const sizeScore = Math.min(profile.size.tokenCount / 1000, 1) * 0.2;
    const structureScore = Math.min(profile.structure.cyclomaticComplexity / 20, 1) * 0.3;
    const cognitiveScore = profile.cognitive.score * 0.3;
    const dataScore = (profile.data.inputComplexity +
                      profile.data.outputComplexity +
                      profile.data.transformationComplexity) / 3 * 0.2;

    const score = sizeScore + structureScore + cognitiveScore + dataScore;

    // Determine level
    let level: 'simple' | 'moderate' | 'complex' | 'very_complex';
    if (score < 0.25) level = 'simple';
    else if (score < 0.5) level = 'moderate';
    else if (score < 0.75) level = 'complex';
    else level = 'very_complex';

    // Determine if breakdown is recommended
    const breakdownRecommended = score > 0.5;

    // Determine recommended level
    let recommendedLevel: BreakdownLevel;
    if (score < 0.3) recommendedLevel = BreakdownLevel.SIMPLE_AGENT;
    else if (score < 0.5) recommendedLevel = BreakdownLevel.BOT;
    else if (score < 0.7) recommendedLevel = BreakdownLevel.SCRIPT;
    else recommendedLevel = BreakdownLevel.FUNCTION;

    return {
      score,
      level,
      breakdownRecommended,
      recommendedLevel,
    };
  }

  // Helper methods
  private async countTokens(agent: Agent): Promise<number> {
    // Count tokens in agent definition
    const text = JSON.stringify(agent);
    return text.length / 4; // Rough estimate: 4 chars per token
  }

  private estimateLinesOfCode(agent: Agent): number {
    // Estimate lines of code needed to implement agent
    if (agent.reasoningSteps) {
      return agent.reasoningSteps.length * 10;
    }
    return 50; // Default estimate
  }

  private async countDependencies(agent: Agent): Promise<number> {
    // Count external dependencies
    // Implementation: analyze agent imports/references
    return 0; // Placeholder
  }

  private calculateCyclomaticComplexity(agent: Agent): number {
    // Calculate cyclomatic complexity
    // CC = edges - nodes + 2
    if (agent.reasoningSteps) {
      const branches = this.countBranches(agent);
      const conditionals = this.countConditionals(agent);
      return branches + conditionals + 1;
    }
    return 1; // Minimum complexity
  }

  private measureNestingDepth(agent: Agent): number {
    // Measure maximum nesting depth
    if (!agent.reasoningSteps) return 0;

    let maxDepth = 0;
    let currentDepth = 0;

    for (const step of agent.reasoningSteps) {
      if (step.type === StepType.DECISION_MAKING ||
          step.type === StepType.COMPARISON) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (step.type === StepType.SYNTHESIS) {
        currentDepth--;
      }
    }

    return maxDepth;
  }

  private countBranches(agent: Agent): number {
    if (!agent.reasoningSteps) return 0;
    return agent.reasoningSteps.filter(s =>
      s.type === StepType.CONTINGENCY ||
      s.type === StepType.COMPARISON
    ).length;
  }

  private countLoops(agent: Agent): number {
    if (!agent.reasoningSteps) return 0;
    return agent.reasoningSteps.filter(s =>
      s.rawText.toLowerCase().includes('for each') ||
      s.rawText.toLowerCase().includes('iterate')
    ).length;
  }

  private countConditionals(agent: Agent): number {
    if (!agent.reasoningSteps) return 0;
    return agent.reasoningSteps.filter(s =>
      s.rawText.toLowerCase().includes('if') ||
      s.rawText.toLowerCase().includes('else')
    ).length;
  }

  private async getExecutionHistory(agent: Agent): Promise<AgentExecution[]> {
    // Retrieve execution history
    return []; // Placeholder
  }

  private countReasoningChains(executions: AgentExecution[]): number {
    // Count reasoning chains in execution history
    return executions.length; // Placeholder
  }

  private countDecisionPoints(executions: AgentExecution[]): number {
    // Count decision points
    return executions.filter(e =>
      JSON.stringify(e.output).includes('decision')
    ).length; // Placeholder
  }

  private measureAmbiguity(executions: AgentExecution[]): number {
    // Measure ambiguity in outputs
    // Higher = more ambiguous
    return 0.3; // Placeholder
  }

  private calculateCognitiveScore(metrics: {
    reasoningChains: number;
    decisionPoints: number;
    ambiguity: number;
  }): number {
    const chainScore = Math.min(metrics.reasoningChains / 10, 1) * 0.4;
    const decisionScore = Math.min(metrics.decisionPoints / 5, 1) * 0.3;
    const ambiguityScore = metrics.ambiguity * 0.3;
    return chainScore + decisionScore + ambiguityScore;
  }

  private calculateSchemaComplexity(schema: Schema): number {
    // Calculate schema complexity
    if (!schema.properties) return 0.1;

    const propertyCount = Object.keys(schema.properties).length;
    const nestingDepth = this.calculateSchemaNesting(schema);

    return Math.min((propertyCount + nestingDepth * 2) / 20, 1);
  }

  private calculateSchemaNesting(schema: Schema, depth = 0): number {
    if (!schema.properties) return depth;

    let maxDepth = depth;
    for (const prop of Object.values(schema.properties)) {
      const propDepth = this.calculateSchemaNesting(prop, depth + 1);
      maxDepth = Math.max(maxDepth, propDepth);
    }

    return maxDepth;
  }

  private calculateTransformationComplexity(type: TransformationType): number {
    // Assign complexity score to transformation types
    switch (type) {
      case TransformationType.FILTER:
      case TransformationType.MAP:
      case TransformationType.SORT:
        return 0.2;

      case TransformationType.AGGREGATE:
      case TransformationType.GROUP:
        return 0.4;

      case TransformationType.EXTRACT:
      case TransformationType.FORMAT:
        return 0.3;

      case TransformationType.ANALYZE:
      case TransformationType.COMPARE:
        return 0.6;

      case TransformationType.SYNTHESIZE:
      case TransformationType.GENERATE:
        return 0.8;

      default:
        return 0.5;
    }
  }

  private calculateSchemaSize(functionality: AgentAnalysis['functionality']): number {
    // Calculate schema size
    const inputSize = JSON.stringify(functionality.inputSchema).length;
    const outputSize = JSON.stringify(functionality.outputSchema).length;
    return inputSize + outputSize;
  }
}
```

---

## 5. Target Converter

### 5.1 Purpose

The **Target Converter** converts agents to appropriate target forms (agent → agent → bot → script → function) based on analysis and requirements.

### 5.2 Conversion Targets

```typescript
/**
 * Conversion target
 */
export enum ConversionTarget {
  // Agent targets
  COMPLEX_AGENT = 'complex_agent',
  SIMPLE_AGENT = 'simple_agent',

  // Bot target
  BOT = 'bot',

  // Script target
  SCRIPT = 'script',

  // Function target
  FUNCTION = 'function',
}

/**
 * Conversion result
 */
export interface ConversionResult {
  originalAgent: Agent;
  target: ConversionTarget;
  converted: ConvertedAgent;
  costSavings: number; // 0-1, proportion of cost savings
  performanceImprovement: number; // 0-1, proportion of improvement
  confidence: number; // 0-1, how confident in conversion
}

/**
 * Converted agent
 */
export interface ConvertedAgent {
  id: string;
  name: string;
  description: string;
  target: ConversionTarget;
  implementation: Implementation;
  inputs: Schema;
  outputs: Schema;
  metadata: {
    convertedAt: number;
    originalAgentId: string;
    conversionMethod: string;
  };
}

/**
 * Implementation types
 */
export type Implementation =
  | LLMImplementation
  | BotImplementation
  | ScriptImplementation
  | FunctionImplementation;

export interface LLMImplementation {
  type: 'llm';
  model: string;
  systemPrompt: string;
  temperature?: number;
}

export interface BotImplementation {
  type: 'bot';
  rules: Rule[];
  patterns: Pattern[];
  fallback?: LLMImplementation;
}

export interface ScriptImplementation {
  type: 'script';
  code: string;
  language: 'javascript' | 'typescript' | 'python';
}

export interface FunctionImplementation {
  type: 'function';
  code: string;
  language: 'javascript' | 'typescript';
  pure: boolean;
}

export interface Rule {
  condition: string;
  action: string;
  priority?: number;
}

export interface Pattern {
  match: string | RegExp;
  transform: string;
}
```

### 5.3 Converter Implementation

```typescript
/**
 * Target Converter - Convert to appropriate form
 */
export class TargetConverter {

  /**
   * Convert agent to recommended target
   */
  async convert(agent: Agent): Promise<ConversionResult> {
    // Analyze agent
    const analysis = await new AgentAnalyzer().analyze(agent);

    // Determine best target
    const target = this.determineTarget(analysis);

    // Execute conversion
    const converted = await this.executeConversion(agent, target, analysis);

    // Calculate improvements
    const costSavings = this.calculateCostSavings(agent, converted);
    const performanceImprovement = this.calculatePerformanceImprovement(agent, converted);
    const confidence = this.calculateConversionConfidence(analysis);

    return {
      originalAgent: agent,
      target,
      converted,
      costSavings,
      performanceImprovement,
      confidence,
    };
  }

  /**
   * Determine best conversion target
   */
  private determineTarget(analysis: AgentAnalysis): ConversionTarget {
    // If agency not required, convert to script or function
    if (!analysis.agency.required) {
      if (analysis.patterns.deterministic) {
        return ConversionTarget.FUNCTION;
      }
      return ConversionTarget.SCRIPT;
    }

    // If simple task, convert to simple agent
    if (analysis.complexity.score < 0.4) {
      return ConversionTarget.SIMPLE_AGENT;
    }

    // If rule-based, convert to bot
    if (analysis.agency.decisionMaking === DecisionMakingType.RULE_BASED) {
      return ConversionTarget.BOT;
    }

    // Default: keep as simple agent
    return ConversionTarget.SIMPLE_AGENT;
  }

  /**
   * Execute conversion
   */
  private async executeConversion(
    agent: Agent,
    target: ConversionTarget,
    analysis: AgentAnalysis
  ): Promise<ConvertedAgent> {
    switch (target) {
      case ConversionTarget.COMPLEX_AGENT:
        return this.convertToComplexAgent(agent);

      case ConversionTarget.SIMPLE_AGENT:
        return this.convertToSimpleAgent(agent, analysis);

      case ConversionTarget.BOT:
        return this.convertToBot(agent, analysis);

      case ConversionTarget.SCRIPT:
        return this.convertToScript(agent, analysis);

      case ConversionTarget.FUNCTION:
        return this.convertToFunction(agent, analysis);

      default:
        throw new Error(`Unknown target: ${target}`);
    }
  }

  /**
   * Convert to complex agent
   */
  private async convertToComplexAgent(agent: Agent): Promise<ConvertedAgent> {
    return {
      id: `${agent.id}_complex`,
      name: agent.name,
      description: agent.description,
      target: ConversionTarget.COMPLEX_AGENT,
      implementation: {
        type: 'llm',
        model: 'gpt-4-turbo',
        systemPrompt: this.generateSystemPrompt(agent),
        temperature: 0.7,
      },
      inputs: await this.inferInputs(agent),
      outputs: await this.inferOutputs(agent),
      metadata: {
        convertedAt: Date.now(),
        originalAgentId: agent.id,
        conversionMethod: 'complex_agent',
      },
    };
  }

  /**
   * Convert to simple agent
   */
  private async convertToSimpleAgent(
    agent: Agent,
    analysis: AgentAnalysis
  ): Promise<ConvertedAgent> {
    // Generate focused system prompt
    const systemPrompt = this.generateFocusedPrompt(agent, analysis);

    return {
      id: `${agent.id}_simple`,
      name: agent.name,
      description: agent.description,
      target: ConversionTarget.SIMPLE_AGENT,
      implementation: {
        type: 'llm',
        model: 'gpt-4',
        systemPrompt,
        temperature: 0.5,
      },
      inputs: analysis.functionality.inputSchema,
      outputs: analysis.functionality.outputSchema,
      metadata: {
        convertedAt: Date.now(),
        originalAgentId: agent.id,
        conversionMethod: 'simple_agent',
      },
    };
  }

  /**
   * Convert to bot
   */
  private async convertToBot(
    agent: Agent,
    analysis: AgentAnalysis
  ): Promise<ConvertedAgent> {
    // Extract rules from agent behavior
    const rules = await this.extractRules(agent, analysis);

    // Extract patterns
    const patterns = await this.extractPatterns(agent, analysis);

    return {
      id: `${agent.id}_bot`,
      name: agent.name,
      description: agent.description,
      target: ConversionTarget.BOT,
      implementation: {
        type: 'bot',
        rules,
        patterns,
        fallback: {
          type: 'llm',
          model: 'gpt-4',
          systemPrompt: this.generateFallbackPrompt(agent),
        },
      },
      inputs: analysis.functionality.inputSchema,
      outputs: analysis.functionality.outputSchema,
      metadata: {
        convertedAt: Date.now(),
        originalAgentId: agent.id,
        conversionMethod: 'bot',
      },
    };
  }

  /**
   * Convert to script
   */
  private async convertToScript(
    agent: Agent,
    analysis: AgentAnalysis
  ): Promise<ConvertedAgent> {
    // Generate procedural code
    const code = await this.generateScript(agent, analysis);

    return {
      id: `${agent.id}_script`,
      name: agent.name,
      description: agent.description,
      target: ConversionTarget.SCRIPT,
      implementation: {
        type: 'script',
        code,
        language: 'typescript',
      },
      inputs: analysis.functionality.inputSchema,
      outputs: analysis.functionality.outputSchema,
      metadata: {
        convertedAt: Date.now(),
        originalAgentId: agent.id,
        conversionMethod: 'script',
      },
    };
  }

  /**
   * Convert to function
   */
  private async convertToFunction(
    agent: Agent,
    analysis: AgentAnalysis
  ): Promise<ConvertedAgent> {
    // Generate pure function code
    const code = await this.generateFunction(agent, analysis);

    return {
      id: `${agent.id}_function`,
      name: agent.name,
      description: agent.description,
      target: ConversionTarget.FUNCTION,
      implementation: {
        type: 'function',
        code,
        language: 'typescript',
        pure: true,
      },
      inputs: analysis.functionality.inputSchema,
      outputs: analysis.functionality.outputSchema,
      metadata: {
        convertedAt: Date.now(),
        originalAgentId: agent.id,
        conversionMethod: 'function',
      },
    };
  }

  // Helper methods
  private generateSystemPrompt(agent: Agent): string {
    if (agent.reasoningSteps) {
      const steps = agent.reasoningSteps.map(s => s.summary).join('\n');
      return `You are an AI assistant with the following capabilities:\n${steps}\n\nTask: ${agent.description}`;
    }
    return `You are an AI assistant. Task: ${agent.description}`;
  }

  private generateFocusedPrompt(agent: Agent, analysis: AgentAnalysis): string {
    const primaryTask = analysis.functionality.primaryTask;
    return `You are a focused AI assistant with a single task: ${primaryTask}.\n\nBe direct and efficient.`;
  }

  private async extractRules(
    agent: Agent,
    analysis: AgentAnalysis
  ): Promise<Rule[]> {
    // Extract rules from agent behavior
    // Implementation: analyze execution patterns
    return [
      {
        condition: 'input.type === "csv"',
        action: 'parseCSV(input.data)',
        priority: 1,
      },
    ]; // Placeholder
  }

  private async extractPatterns(
    agent: Agent,
    analysis: AgentAnalysis
  ): Promise<Pattern[]> {
    // Extract patterns from agent behavior
    // Implementation: use pattern recognition
    return [
      {
        match: /^\d+$/,
        transform: 'parseInt(match)',
      },
    ]; // Placeholder
  }

  private generateFallbackPrompt(agent: Agent): string {
    return `If no rules match, use your best judgment to: ${agent.description}`;
  }

  private async generateScript(
    agent: Agent,
    analysis: AgentAnalysis
  ): Promise<string> {
    // Generate TypeScript script
    const transformation = analysis.functionality.transformationType;

    return `// Auto-generated script for: ${agent.name}
async function execute(input: any): Promise<any> {
  // TODO: Implement ${transformation} transformation
  return input;
}`;
  }

  private async generateFunction(
    agent: Agent,
    analysis: AgentAnalysis
  ): Promise<string> {
    // Generate pure function
    return `// Auto-generated function for: ${agent.name}
function execute(input: any): any {
  // Pure function implementation
  return input;
}`;
  }

  private async inferInputs(agent: Agent): Promise<Schema> {
    // Infer input schema from agent
    return { type: 'object' }; // Placeholder
  }

  private async inferOutputs(agent: Agent): Promise<Schema> {
    // Infer output schema from agent
    return { type: 'object' }; // Placeholder
  }

  private calculateCostSavings(original: Agent, converted: ConvertedAgent): number {
    // Calculate cost savings from conversion
    switch (converted.target) {
      case ConversionTarget.FUNCTION:
      case ConversionTarget.SCRIPT:
        return 1.0; // 100% savings

      case ConversionTarget.BOT:
        return 0.9; // 90% savings

      case ConversionTarget.SIMPLE_AGENT:
        return 0.5; // 50% savings

      case ConversionTarget.COMPLEX_AGENT:
        return 0.0; // No savings

      default:
        return 0.0;
    }
  }

  private calculatePerformanceImprovement(original: Agent, converted: ConvertedAgent): number {
    // Calculate performance improvement
    switch (converted.target) {
      case ConversionTarget.FUNCTION:
        return 0.99; // 100x faster

      case ConversionTarget.SCRIPT:
        return 0.95; // 20x faster

      case ConversionTarget.BOT:
        return 0.8; // 5x faster

      case ConversionTarget.SIMPLE_AGENT:
        return 0.3; // 1.5x faster

      case ConversionTarget.COMPLEX_AGENT:
        return 0.0; // No improvement

      default:
        return 0.0;
    }
  }

  private calculateConversionConfidence(analysis: AgentAnalysis): number {
    // Calculate confidence in conversion
    if (analysis.patterns.deterministic && !analysis.agency.required) {
      return 0.95; // High confidence for deterministic operations
    }

    if (analysis.agency.decisionMaking === DecisionMakingType.RULE_BASED) {
      return 0.85; // High confidence for rule-based
    }

    if (analysis.complexity.score < 0.5) {
      return 0.7; // Medium confidence for simple operations
    }

    return 0.5; // Low confidence for complex operations
  }
}
```

---

## 6. Agency Determinator

### 6.1 Purpose

The **Agency Determinator** identifies where agency (decision-making capability) is truly required and where it can be eliminated.

### 6.2 Agency Analysis

```typescript
/**
 * Agency requirements
 */
export interface AgencyRequirements {
  // Is agency required?
  required: boolean;

  // Agency level
  level: AgencyLevel;

  // Decision-making requirements
  decisionMaking: {
    required: boolean;
    type: DecisionMakingType;
    complexity: number; // 0-1
    frequency: number; // decisions per operation
  };

  // Adaptability requirements
  adaptability: {
    required: boolean;
    level: number; // 0-1
    contexts: string[];
  };

  // Creativity requirements
  creativity: {
    required: boolean;
    level: number; // 0-1
    novelty: number; // 0-1, how novel?
  };

  // Fallback requirements
  fallback: {
    required: boolean;
    conditions: string[];
  };
}

/**
 * Agency level
 */
export enum AgencyLevel {
  NONE = 'none',           // No agency needed (deterministic)
  LOW = 'low',             // Simple rule-based
  MEDIUM = 'medium',       // Pattern-based
  HIGH = 'high',           // Contextual decision-making
  FULL = 'full',           // Creative, strategic
}
```

### 6.3 Determinator Implementation

```typescript
/**
 * Agency Determinator - Where is agency needed?
 */
export class AgencyDeterminator {

  /**
   * Determine agency requirements
   */
  async determine(agent: Agent): Promise<AgencyRequirements> {
    // Analyze agent
    const analysis = await new AgentAnalyzer().analyze(agent);

    // Determine if agency is required
    const required = this.isAgencyRequired(analysis);

    // Determine agency level
    const level = this.determineAgencyLevel(analysis);

    // Analyze decision-making requirements
    const decisionMaking = this.analyzeDecisionMaking(analysis);

    // Analyze adaptability requirements
    const adaptability = this.analyzeAdaptability(analysis);

    // Analyze creativity requirements
    const creativity = this.analyzeCreativity(analysis);

    // Analyze fallback requirements
    const fallback = this.analyzeFallback(analysis);

    return {
      required,
      level,
      decisionMaking,
      adaptability,
      creativity,
      fallback,
    };
  }

  /**
   * Determine if agency is required
   */
  private isAgencyRequired(analysis: AgentAnalysis): boolean {
    // Agency is required if:
    // 1. Not deterministic
    if (!analysis.patterns.deterministic) return true;

    // 2. High adaptability
    if (analysis.agency.adaptability > 0.5) return true;

    // 3. High creativity
    if (analysis.agency.creativity > 0.5) return true;

    // 4. Complex decision-making
    if (analysis.agency.decisionMaking === DecisionMakingType.CREATIVE ||
        analysis.agency.decisionMaking === DecisionMakingType.STRATEGIC) {
      return true;
    }

    return false;
  }

  /**
   * Determine agency level
   */
  private determineAgencyLevel(analysis: AgentAnalysis): AgencyLevel {
    const { decisionMaking, adaptability, creativity } = analysis.agency;

    // Full agency: creative or strategic decision-making
    if (decisionMaking === DecisionMakingType.CREATIVE ||
        decisionMaking === DecisionMakingType.STRATEGIC ||
        creativity > 0.7) {
      return AgencyLevel.FULL;
    }

    // High agency: contextual decision-making
    if (decisionMaking === DecisionMakingType.CONTEXTUAL ||
        adaptability > 0.6) {
      return AgencyLevel.HIGH;
    }

    // Medium agency: pattern-based
    if (decisionMaking === DecisionMakingType.PATTERN_BASED ||
        adaptability > 0.3) {
      return AgencyLevel.MEDIUM;
    }

    // Low agency: rule-based
    if (decisionMaking === DecisionMakingType.RULE_BASED) {
      return AgencyLevel.LOW;
    }

    // No agency: deterministic
    if (decisionMaking === DecisionMakingType.DETERMINISTIC) {
      return AgencyLevel.NONE;
    }

    return AgencyLevel.NONE;
  }

  /**
   * Analyze decision-making requirements
   */
  private analyzeDecisionMaking(analysis: AgentAnalysis): AgencyRequirements['decisionMaking'] {
    const { decisionMaking } = analysis.agency;
    const { complexity } = analysis;

    // Determine if decision-making is required
    const required = decisionMaking !== DecisionMakingType.DETERMINISTIC;

    // Calculate complexity (0-1)
    let complexityScore = 0.3; // Base complexity
    if (decisionMaking === DecisionMakingType.CONTEXTUAL) complexityScore = 0.5;
    if (decisionMaking === DecisionMakingType.PATTERN_BASED) complexityScore = 0.4;
    if (decisionMaking === DecisionMakingType.CREATIVE) complexityScore = 0.8;
    if (decisionMaking === DecisionMakingType.STRATEGIC) complexityScore = 0.9;

    // Estimate decision frequency
    const frequency = Math.ceil(complexity.reasoningSteps / 3);

    return {
      required,
      type: decisionMaking,
      complexity: complexityScore,
      frequency,
    };
  }

  /**
   * Analyze adaptability requirements
   */
  private analyzeAdaptability(analysis: AgentAnalysis): AgencyRequirements['adaptability'] {
    const { adaptability } = analysis.agency;

    // Determine if adaptability is required
    const required = adaptability > 0.3;

    // Identify contexts where adaptability is needed
    const contexts = this.identifyContexts(analysis);

    return {
      required,
      level: adaptability,
      contexts,
    };
  }

  /**
   * Analyze creativity requirements
   */
  private analyzeCreativity(analysis: AgentAnalysis): AgencyRequirements['creativity'] {
    const { creativity } = analysis.agency;

    // Determine if creativity is required
    const required = creativity > 0.3;

    // Calculate novelty
    const novelty = this.calculateNovelty(analysis);

    return {
      required,
      level: creativity,
      novelty,
    };
  }

  /**
   * Analyze fallback requirements
   */
  private analyzeFallback(analysis: AgentAnalysis): AgencyRequirements['fallback'] {
    // Fallback is needed if:
    // 1. High error rate
    const highErrorRate = analysis.performance.errorRate > 0.1;

    // 2. Low confidence in outputs
    const lowConfidence = analysis.agency.decisionMaking === DecisionMakingType.CREATIVE;

    // 3. Complex operation
    const complex = analysis.complexity.score > 0.7;

    const required = highErrorRate || lowConfidence || complex;

    // Identify fallback conditions
    const conditions = [];
    if (highErrorRate) conditions.push('high_error_rate');
    if (lowConfidence) conditions.push('low_confidence');
    if (complex) conditions.push('complex_operation');
    if (analysis.agency.adaptability > 0.5) conditions.push('unexpected_context');

    return {
      required,
      conditions,
    };
  }

  // Helper methods
  private identifyContexts(analysis: AgentAnalysis): string[] {
    // Identify contexts where adaptability is needed
    const contexts: string[] = [];

    if (analysis.agency.decisionMaking === DecisionMakingType.CONTEXTUAL) {
      contexts.push('context_aware');
    }

    if (analysis.agency.adaptability > 0.5) {
      contexts.push('variable_input');
    }

    if (analysis.complexity.score > 0.5) {
      contexts.push('complex_scenarios');
    }

    return contexts;
  }

  private calculateNovelty(analysis: AgentAnalysis): number {
    // Calculate novelty of outputs
    // Higher = more novel/creative
    if (analysis.agency.decisionMaking === DecisionMakingType.CREATIVE) {
      return 0.8;
    }
    if (analysis.agency.decisionMaking === DecisionMakingType.STRATEGIC) {
      return 0.6;
    }
    return analysis.agency.creativity;
  }
}
```

---

## 7. Decision Trees

### 7.1 Breakdown Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT BREAKDOWN DECISION TREE                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  START: Agent to Analyze                                        │
│     │                                                           │
│     ▼                                                           │
│  ┌─────────────────────┐                                        │
│  │ Is agency required?  │                                        │
│  └─────┬───────────────┘                                        │
│        │                                                       │
│   NO   │   YES                                                │
│   ┌────┴────┐                                                  │
│   ▼         ▼                                                  │
│ ┌─────────┐ ┌─────────────────────┐                           │
│ │ Is it   │ │ How complex is it?  │                           │
│ │ deterministic?│ └─────┬───────────────┘                    │
│ └────┬────┘       │                                            │
│      │      ┌─────┴─────┐                                     │
│  NO  │      │           │                                     │
│  ┌───┴────┐ ▼           ▼                                     │
│  ▼        ▼ Simple     ▼                                     │
│ ┌──────┐ ┌─────────┐ Complex                               │
│ │ Can it│ │ Keep as │ (Score > 0.5)                         │
│ │ be    │ │ Simple  │     │                                 │
│ │ rule- │ │ Agent   │     │                                 │
│ │ based?│ └─────────┘     ▼                                 │
│ └──┬────┘             ┌─────────┐                           │
│    │             YES  │ Break   │                           │
│    │                  │ down    │                           │
│  YES│                  └────┬────┘                           │
│    │                       │                                 │
│    ▼                       │ NO                              │
│ ┌─────────┐                 │                                 │
│ │ Convert │                 │                                 │
│ │ to Bot  │                 │                                 │
│ └────┬────┘                 │                                 │
│      │                      │                                 │
│      └──────────┬───────────┘                                 │
│                 ▼                                             │
│          ┌─────────────┐                                      │
│          │   RESULT    │                                      │
│          └─────────────┘                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Conversion Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                   CONVERSION DECISION TREE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  START: Agent to Convert                                        │
│     │                                                           │
│     ▼                                                           │
│  ┌─────────────────────┐                                        │
│  │ Is agency required?  │                                        │
│  └─────┬───────────────┘                                        │
│        │                                                       │
│   YES  │   NO                                                 │
│   ┌────┴────┐                                                  │
│   ▼         ▼                                                  │
│ ┌─────────┐ ┌─────────────────────┐                           │
│ │ How     │ │ Is it deterministic? │                           │
│ │ complex?│ └─────┬───────────────┘                           │
│ └────┬────┘       │                                            │
│      │      ┌─────┴─────┐                                     │
│  Simple│      │           │                                     │
│  │     │    YES│         │NO                                  │
│  ▼     │      ▼           ▼                                     │
│ ┌────┐ ┌┐ ┌─────────┐ ┌─────────┐                            │
│ │Keep│ ││ │ Convert │ │ Can it  │                            │
│ │ as │ ││ │ to      │ │ be rule-│                            │
│ │Agent│ ││ │Function  │ │ based?  │                            │
│ └────┘ │┘ └─────────┘ └────┬────┘                            │
│        │                  │                                  │
│        │             YES  │    NO                             │
│        │             ┌────┴────┐                               │
│        │             ▼         ▼                               │
│        │        ┌─────────┐ ┌─────────┐                       │
│        │        │ Convert │ │ Convert │                       │
│        │        │ to Bot  │ │ to      │                       │
│        │        └─────────┘ │ Script  │                       │
│        │                     └─────────┘                       │
│        │                                                       │
│        └──────────────────┬────────────────────────────────────┘
│                           ▼
│                    ┌─────────────┐
│                    │   RESULT    │
│                    └─────────────┘
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Optimization Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                   OPTIMIZATION DECISION TREE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  START: Agent to Optimize                                       │
│     │                                                           │
│     ▼                                                           │
│  ┌─────────────────────┐                                        │
│  │ Is it too expensive? │ (>$0.01/op)                          │
│  └─────┬───────────────┘                                        │
│        │                                                       │
│   NO   │   YES                                                │
│   ┌────┴────┐                                                  │
│   ▼         ▼                                                  │
│ ┌─────────┐ ┌─────────────────────┐                           │
│ │ Is it   │ │ Is agency required?  │                           │
│ │ too     │ └─────┬───────────────┘                           │
│ │ slow?   │       │                                            │
│ └────┬────┘   YES │   NO                                      │
│      │      ┌─────┴─────┐                                     │
│  NO  │      │           │                                     │
│  ┌───┴────┐ ▼           ▼                                     │
│  ▼        ▼ Complex    ▼                                     │
│ ┌──────┐ ┌─────────┐ Simple                                │
│ │ Keep │ │ Convert │ (Score < 0.5)                          │
│ │ as is│ │ to Bot  │     │                                 │
│ └──────┘ └─────────┘     ▼                                 │
│                          │                                   │
│                    ┌─────┴─────┐                              │
│                    │           │                              │
│                YES │           │ NO                           │
│                    ▼           ▼                              │
│              ┌─────────┐ ┌─────────┐                         │
│              │ Break   │ │ Convert │                         │
│              │ down    │ │ to      │                         │
│              └─────────┘ │ Script  │                         │
│                          └─────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. TypeScript Interfaces

### 8.1 Core Interfaces

```typescript
/**
 * Complete breakdown system interfaces
 */

// Analysis interfaces
export interface AgentAnalysis {
  agentId: string;
  agentName: string;
  analysisDate: number;
  functionality: FunctionalityAnalysis;
  complexity: ComplexityAnalysis;
  agency: AgencyAnalysis;
  cost: CostAnalysis;
  performance: PerformanceAnalysis;
  patterns: PatternAnalysis;
  recommendations: BreakdownRecommendation[];
}

export interface FunctionalityAnalysis {
  primaryTask: string;
  subTasks: string[];
  inputSchema: Schema;
  outputSchema: Schema;
  transformationType: TransformationType;
}

export interface ComplexityAnalysis {
  score: number;
  reasoningSteps: number;
  decisionPoints: number;
  branches: number;
  loops: number;
}

export interface AgencyAnalysis {
  required: boolean;
  decisionMaking: DecisionMakingType;
  adaptability: number;
  creativity: number;
}

export interface CostAnalysis {
  perOperation: number;
  monthlyAverage: number;
  annualProjected: number;
  optimizationPotential: number;
}

export interface PerformanceAnalysis {
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughputPerSecond: number;
  errorRate: number;
}

export interface PatternAnalysis {
  deterministic: boolean;
  repeated: boolean;
  extractable: boolean;
  reusable: boolean;
}

// Breakdown interfaces
export interface BreakdownResult {
  originalAgent: Agent;
  strategy: BreakdownStrategy;
  components: AgentComponent[];
  composition: CompositionPattern;
  estimatedSavings: number;
  confidence: number;
}

export interface AgentComponent {
  id: string;
  name: string;
  description: string;
  inputs: Schema;
  outputs: Schema;
  logicLevel: BreakdownLevel;
  reasoningSteps: ReasoningStep[];
  dependencies: string[];
}

// Conversion interfaces
export interface ConversionResult {
  originalAgent: Agent;
  target: ConversionTarget;
  converted: ConvertedAgent;
  costSavings: number;
  performanceImprovement: number;
  confidence: number;
}

export interface ConvertedAgent {
  id: string;
  name: string;
  description: string;
  target: ConversionTarget;
  implementation: Implementation;
  inputs: Schema;
  outputs: Schema;
  metadata: ConversionMetadata;
}

export interface ConversionMetadata {
  convertedAt: number;
  originalAgentId: string;
  conversionMethod: string;
}

// Utility interfaces
export interface Schema {
  type: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  enum?: string[];
  format?: string;
  description?: string;
}

export interface BreakdownRecommendation {
  type: 'decompose' | 'convert' | 'extract' | 'optimize';
  reason: string;
  targetLevel: BreakdownLevel;
  expectedSavings: number;
  confidence: number;
}

export interface CompositionPattern {
  type: 'serial' | 'parallel' | 'conditional' | 'loop';
  dependencies: Array<{
    from: string;
    to: string;
    condition?: string;
  }>;
}

// Enums
export enum BreakdownLevel {
  COMPLEX_AGENT = 'complex_agent',
  SIMPLE_AGENT = 'simple_agent',
  BOT = 'bot',
  SCRIPT = 'script',
  FUNCTION = 'function',
}

export enum ConversionTarget {
  COMPLEX_AGENT = 'complex_agent',
  SIMPLE_AGENT = 'simple_agent',
  BOT = 'bot',
  SCRIPT = 'script',
  FUNCTION = 'function',
}

export enum DecompositionStrategy {
  BY_REASONING_STEP = 'by_reasoning_step',
  BY_SUBTASK = 'by_subtask',
  BY_TRANSFORMATION = 'by_transformation',
  BY_DECISION_POINT = 'by_decision_point',
  BY_IO_BOUNDARY = 'by_io_boundary',
  HYBRID = 'hybrid',
}

export enum TransformationType {
  FILTER = 'filter',
  MAP = 'map',
  REDUCE = 'reduce',
  AGGREGATE = 'aggregate',
  SORT = 'sort',
  GROUP = 'group',
  EXTRACT = 'extract',
  SUMMARIZE = 'summarize',
  TRANSLATE = 'translate',
  FORMAT = 'format',
  ANALYZE = 'analyze',
  COMPARE = 'compare',
  CLASSIFY = 'classify',
  SCORE = 'score',
  GENERATE = 'generate',
  SYNTHESIZE = 'synthesize',
  CREATE = 'create',
  MULTI_STEP = 'multi_step',
  CONDITIONAL = 'conditional',
  ITERATIVE = 'iterative',
}

export enum DecisionMakingType {
  DETERMINISTIC = 'deterministic',
  RULE_BASED = 'rule_based',
  PATTERN_BASED = 'pattern_based',
  CONTEXTUAL = 'contextual',
  CREATIVE = 'creative',
  STRATEGIC = 'strategic',
}

export enum AgencyLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  FULL = 'full',
}
```

---

## 9. Implementation Examples

### 9.1 Example 1: Complex Data Analysis Agent

**Original Agent:**
```typescript
const dataAnalysisAgent = {
  id: 'data_analysis_1',
  name: 'Data Analysis Agent',
  description: 'Analyzes sales data and generates insights',
  reasoningSteps: [
    { type: 'observation', summary: 'Load CSV data' },
    { type: 'analysis', summary: 'Filter valid records' },
    { type: 'analysis', summary: 'Aggregate by month' },
    { type: 'inference', summary: 'Calculate growth rate' },
    { type: 'synthesis', summary: 'Generate insights' },
  ],
};
```

**Breakdown Process:**

```typescript
// Step 1: Analyze
const analyzer = new AgentAnalyzer();
const analysis = await analyzer.analyze(dataAnalysisAgent);

// Result:
// - Complexity: 0.6 (moderate)
// - Agency required: NO (deterministic)
// - Cost: $0.02 per operation
// - Recommendation: Convert to script

// Step 2: Decompose
const decomposer = new Decomposer();
const decomposition = await decomposer.decompose(dataAnalysisAgent, analysis);

// Result:
// - Components: 5 components (one per reasoning step)
// - Composition: Serial
// - Estimated savings: 60%

// Step 3: Convert
const converter = new TargetConverter();
const conversion = await converter.convert(dataAnalysisAgent);

// Result:
// - Target: SCRIPT
// - Implementation: TypeScript procedural code
// - Cost savings: 95%
// - Performance improvement: 20x
```

**Final Result:**
```typescript
// Converted to script
async function analyzeSalesData(csvData: string): Promise<AnalysisResult> {
  // Step 1: Load CSV
  const data = parseCSV(csvData);

  // Step 2: Filter valid records
  const valid = data.filter(row => row.sales !== null);

  // Step 3: Aggregate by month
  const monthly = aggregateByMonth(valid);

  // Step 4: Calculate growth
  const growth = calculateGrowthRate(monthly);

  // Step 5: Generate insights
  return {
    monthly,
    growth,
    insights: generateInsights(monthly, growth),
  };
}
```

### 9.2 Example 2: Content Generation Agent

**Original Agent:**
```typescript
const contentAgent = {
  id: 'content_gen_1',
  name: 'Content Generation Agent',
  description: 'Generates marketing copy based on product features',
  reasoningSteps: [
    { type: 'analysis', summary: 'Analyze product features' },
    { type: 'inference', summary: 'Identify key benefits' },
    { type: 'synthesis', summary: 'Generate creative copy' },
  ],
};
```

**Breakdown Process:**

```typescript
// Step 1: Analyze
const analysis = await analyzer.analyze(contentAgent);

// Result:
// - Complexity: 0.7 (complex)
// - Agency required: YES (creative)
// - Cost: $0.015 per operation
// - Recommendation: Keep as simple agent

// Step 2: Check agency
const determinator = new AgencyDeterminator();
const agency = await determinator.determine(contentAgent);

// Result:
// - Agency required: YES
// - Level: HIGH (creative)
// - Creativity required: YES
// - Decision: Keep as agent

// Step 3: Optimize
const conversion = await converter.convert(contentAgent);

// Result:
// - Target: SIMPLE_AGENT
// - Model: GPT-4 (down from GPT-4 Turbo)
// - Cost savings: 50%
// - Performance improvement: 1.5x
```

**Final Result:**
```typescript
// Optimized simple agent
const optimizedContentAgent: ConvertedAgent = {
  id: 'content_gen_1_optimized',
  name: 'Content Generation Agent (Optimized)',
  target: ConversionTarget.SIMPLE_AGENT,
  implementation: {
    type: 'llm',
    model: 'gpt-4',
    systemPrompt: `You are a marketing copywriter. Given product features, generate compelling marketing copy that highlights key benefits and appeals to the target audience.`,
    temperature: 0.7,
  },
};
```

### 9.3 Example 3: Data Validation Agent

**Original Agent:**
```typescript
const validationAgent = {
  id: 'validation_1',
  name: 'Data Validation Agent',
  description: 'Validates user input data',
  reasoningSteps: [
    { type: 'observation', summary: 'Check required fields' },
    { type: 'verification', summary: 'Validate data types' },
    { type: 'verification', summary: 'Check value ranges' },
  ],
};
```

**Breakdown Process:**

```typescript
// Step 1: Analyze
const analysis = await analyzer.analyze(validationAgent);

// Result:
// - Complexity: 0.2 (simple)
// - Agency required: NO (deterministic, rule-based)
// - Cost: $0.005 per operation
// - Recommendation: Convert to bot

// Step 2: Determine agency
const agency = await determinator.determine(validationAgent);

// Result:
// - Agency required: NO
// - Level: LOW (rule-based)
// - Decision: Convert to bot

// Step 3: Convert
const conversion = await converter.convert(validationAgent);

// Result:
// - Target: BOT
// - Implementation: Rule-based with LLM fallback
// - Cost savings: 90%
// - Performance improvement: 5x
```

**Final Result:**
```typescript
// Converted to bot
const validationBot: ConvertedAgent = {
  id: 'validation_1_bot',
  name: 'Data Validation Bot',
  target: ConversionTarget.BOT,
  implementation: {
    type: 'bot',
    rules: [
      {
        condition: '!input.name',
        action: 'error: Name is required',
        priority: 1,
      },
      {
        condition: 'typeof input.email !== "string"',
        action: 'error: Email must be a string',
        priority: 1,
      },
      {
        condition: 'input.age < 0 || input.age > 120',
        action: 'error: Age must be between 0 and 120',
        priority: 1,
      },
    ],
    patterns: [
      {
        match: /^[^@]+@[^@]+\.[^@]+$/,
        transform: 'validEmail',
      },
    ],
    fallback: {
      type: 'llm',
      model: 'gpt-3.5-turbo',
      systemPrompt: 'Validate the following user input and return any errors found.',
    },
  },
};
```

---

## 10. Integration with Existing Systems

### 10.1 Integration with Fractured AI Boxes (R2)

```typescript
/**
 * Integration: Agent Breakdown → Fractured AI Boxes
 */
export class BreakdownBoxIntegration {

  /**
   * Convert breakdown result to box composition
   */
  static breakdownToBoxes(result: BreakdownResult): AIBox {
    const { components, composition } = result;

    // Convert each component to a box
    const boxes = components.map(comp => this.componentToBox(comp));

    // Create composition based on pattern
    switch (composition.type) {
      case 'serial':
        return new SerialBox(boxes);

      case 'parallel':
        return new ParallelBox(boxes);

      case 'conditional':
        return this.createConditionalComposition(boxes, composition);

      case 'loop':
        return this.createLoopComposition(boxes, composition);

      default:
        return new SerialBox(boxes);
    }
  }

  /**
   * Convert component to box
   */
  private static componentToBox(component: AgentComponent): AIBox {
    // Determine box type based on logic level
    const boxType = this.mapLogicLevelToBoxType(component.logicLevel);

    // Create box
    return {
      id: component.id,
      name: component.name,
      description: component.description,
      type: boxType,
      category: this.determineCategory(component),
      inputs: this.schemaToBoxInputs(component.inputs),
      outputs: this.schemaToBoxOutputs(component.outputs),
      parameters: [],
      // ... other box properties
    } as AIBox;
  }

  private static mapLogicLevelToBoxType(level: BreakdownLevel): BoxType {
    switch (level) {
      case BreakdownLevel.COMPLEX_AGENT:
        return BoxType.ANALYSIS;

      case BreakdownLevel.SIMPLE_AGENT:
        return BoxType.OBSERVATION;

      case BreakdownLevel.BOT:
        return BoxType.VALIDATE;

      case BreakdownLevel.SCRIPT:
        return BoxType.MAP;

      case BreakdownLevel.FUNCTION:
        return BoxType.FILTER;

      default:
        return BoxType.OBSERVATION;
    }
  }

  private static determineCategory(component: AgentComponent): BoxCategory {
    // Determine box category from component characteristics
    if (component.reasoningSteps.length === 0) {
      return BoxCategory.DATA;
    }
    return BoxCategory.REASONING;
  }

  private static schemaToBoxInputs(schema: Schema): BoxInput[] {
    // Convert schema to box inputs
    return Object.entries(schema.properties || {}).map(([name, prop]) => ({
      name,
      description: prop.description || '',
      type: prop.type,
      required: schema.required?.includes(name) || false,
      examples: [],
    }));
  }

  private static schemaToBoxOutputs(schema: Schema): BoxOutput[] {
    // Convert schema to box outputs
    return Object.entries(schema.properties || {}).map(([name, prop]) => ({
      name,
      description: prop.description || '',
      type: prop.type,
      guaranteed: schema.required?.includes(name) || false,
      examples: [],
    }));
  }

  private static createConditionalComposition(
    boxes: AIBox[],
    composition: CompositionPattern
  ): AIBox {
    // Create conditional composition
    const condition = composition.dependencies[0]?.condition || 'true';
    const trueBox = boxes[0];
    const falseBox = boxes[1];

    return new ConditionalBox(
      { field: 'condition', operator: 'eq', value: 'true' },
      trueBox,
      falseBox
    );
  }

  private static createLoopComposition(
    boxes: AIBox[],
    composition: CompositionPattern
  ): AIBox {
    // Create loop composition
    return new LoopBox(boxes[0], {
      maxIterations: 100,
      continueOnError: true,
      collectResults: true,
    });
  }
}
```

### 10.2 Integration with Model Cascade (R2)

```typescript
/**
 * Integration: Agent Breakdown → Model Cascade
 */
export class BreakdownCascadeIntegration {

  /**
   * Map breakdown level to cascade level
   */
  static mapLevelToCascade(breakdownLevel: BreakdownLevel): number {
    switch (breakdownLevel) {
      case BreakdownLevel.COMPLEX_AGENT:
        return 4; // Oracle level

      case BreakdownLevel.SIMPLE_AGENT:
        return 3; // Expert level

      case BreakdownLevel.BOT:
        return 2; // Specialist level

      case BreakdownLevel.SCRIPT:
        return 1; // Worker level

      case BreakdownLevel.FUNCTION:
        return 0; // Logic level

      default:
        return 3;
    }
  }

  /**
   * Convert agent to cascade level
   */
  static convertToCascadeLevel(
    agent: Agent,
    targetLevel: BreakdownLevel
  ): CascadeAgent {
    const cascadeLevel = this.mapLevelToCascade(targetLevel);

    return {
      originalAgent: agent,
      cascadeLevel,
      model: this.selectModelForLevel(cascadeLevel),
      costPerToken: this.getCostForLevel(cascadeLevel),
      latencyMs: this.getLatencyForLevel(cascadeLevel),
    };
  }

  private static selectModelForLevel(level: number): string {
    switch (level) {
      case 4:
        return 'gpt-4-turbo';

      case 3:
        return 'gpt-4';

      case 2:
        return 'distilled-agent';

      case 1:
        return 'tiny-model';

      case 0:
        return 'logic-only';

      default:
        return 'gpt-4';
    }
  }

  private static getCostForLevel(level: number): number {
    const costs = [0, 0.00001, 0.0001, 0.003, 0.01];
    return costs[level] || 0.003;
  }

  private static getLatencyForLevel(level: number): number {
    const latencies = [10, 100, 500, 2000, 5000];
    return latencies[level] || 2000;
  }
}

export interface CascadeAgent {
  originalAgent: Agent;
  cascadeLevel: number;
  model: string;
  costPerToken: number;
  latencyMs: number;
}
```

### 10.3 Integration with Runtime Engine (R3)

```typescript
/**
 * Integration: Agent Breakdown → Runtime Engine
 */
export class BreakdownRuntimeIntegration {

  /**
   * Convert breakdown result to executable workflow
   */
  static breakdownToWorkflow(result: BreakdownResult): ExecutableWorkflow {
    const { components, composition } = result;

    // Create executable nodes
    const nodes = components.map(comp => this.componentToNode(comp));

    // Create edges from composition
    const edges = composition.dependencies.map(dep => ({
      from: dep.from,
      to: dep.to,
      condition: dep.condition,
    }));

    return {
      id: `workflow_${result.originalAgent.id}`,
      nodes,
      edges,
      compositionType: composition.type,
    };
  }

  /**
   * Convert component to executable node
   */
  private static componentToNode(component: AgentComponent): ExecutableNode {
    return {
      id: component.id,
      name: component.name,
      type: this.mapLogicLevelToNodeType(component.logicLevel),
      implementation: this.getImplementation(component),
      inputs: component.inputs,
      outputs: component.outputs,
    };
  }

  private static mapLogicLevelToNodeType(level: BreakdownLevel): NodeType {
    switch (level) {
      case BreakdownLevel.COMPLEX_AGENT:
        return NodeType.LLM_AGENT;

      case BreakdownLevel.SIMPLE_AGENT:
        return NodeType.LLM_AGENT;

      case BreakdownLevel.BOT:
        return NodeType.RULE_BASED;

      case BreakdownLevel.SCRIPT:
        return NodeType.SCRIPT;

      case BreakdownLevel.FUNCTION:
        return NodeType.FUNCTION;

      default:
        return NodeType.LLM_AGENT;
    }
  }

  private static getImplementation(component: AgentComponent): NodeImplementation {
    // Return implementation based on component type
    // This would integrate with the actual runtime engine
    return {
      type: 'llm',
      model: 'gpt-4',
      config: {},
    };
  }
}

export interface ExecutableWorkflow {
  id: string;
  nodes: ExecutableNode[];
  edges: Array<{
    from: string;
    to: string;
    condition?: string;
  }>;
  compositionType: 'serial' | 'parallel' | 'conditional' | 'loop';
}

export interface ExecutableNode {
  id: string;
  name: string;
  type: NodeType;
  implementation: NodeImplementation;
  inputs: Schema;
  outputs: Schema;
}

export enum NodeType {
  LLM_AGENT = 'llm_agent',
  RULE_BASED = 'rule_based',
  SCRIPT = 'script',
  FUNCTION = 'function',
}

export type NodeImplementation =
  | { type: 'llm'; model: string; config: unknown }
  | { type: 'rules'; rules: unknown[] }
  | { type: 'script'; code: string; language: string }
  | { type: 'function'; code: string; language: string };
```

---

## Conclusion

The **Agent Breakdown Strategy** provides a systematic approach for optimizing agents through progressive simplification:

### Key Capabilities

1. **Agent Analyzer** - Understand what agents do
2. **Decomposer** - Split large agents into smaller components
3. **Complexity Profiler** - Measure size and complexity
4. **Target Converter** - Convert to appropriate form
5. **Agency Determinator** - Identify where agency is needed

### Breakdown Hierarchy

- **Level 4: Complex Agent** - Multi-step reasoning, LLM-based
- **Level 3: Simple Agent** - Single task, LLM-based
- **Level 2: Bot** - Rule-based, deterministic
- **Level 1: Script** - Fully automated, no agency
- **Level 0: Function** - Pure computation

### Cost Savings

- **Function conversion**: 95-100% cost savings
- **Script conversion**: 90-95% cost savings
- **Bot conversion**: 70-90% cost savings
- **Simple agent**: 40-60% cost savings
- **Decomposition**: 30-70% cost savings

### Integration

Seamlessly integrates with:
- **Fractured AI Boxes (R2)** - Box compositions
- **Model Cascade (R2)** - Level mapping
- **Runtime Engine (R3)** - Workflow execution

---

**Document Status**: ✅ Design Complete
**Last Updated**: 2026-03-08
**Version**: 1.0.0
**Author**: Orchestrator - Agent Breakdown Researcher
