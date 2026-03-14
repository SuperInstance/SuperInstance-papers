# @superinstance/equipment-teacher-student

> Equipment implementing distillation triggers with deadband range thresholds for calling teachers

## Overview

The Teacher-Student equipment implements a learning paradigm where an agent operates autonomously within a confidence deadband and calls a teacher for guidance outside that range. Through knowledge distillation, the agent learns from teacher responses, progressively reducing the need for future teacher calls.

## Key Features

### 🎯 Deadband Controller
- **Autonomous Operation**: Operates independently within the confidence deadband (default: 0.6 - 0.9)
- **Teacher Calls**: Automatically requests teacher guidance when outside the deadband
- **Hysteresis**: Prevents oscillation at boundary thresholds
- **Adaptive Deadband**: Adjusts boundaries based on learning progress

### 🧠 Distillation Engine
- **Knowledge Extraction**: Extracts learnable patterns from teacher responses
- **Pattern Matching**: Matches new tasks against distilled knowledge
- **Learning Progress**: Tracks improvement over time
- **Call Reduction**: Measures reduction in teacher calls as learning progresses

### 💪 Muscle Memory
- **Trigger Extraction**: Converts learned knowledge into automatic triggers when unequipping
- **Pattern Consolidation**: Merges similar triggers for efficiency
- **Performance Tracking**: Monitors trigger success rates
- **Persistence**: Export/import triggers for reuse

### 📈 Self-Improvement
- **Progressive Learning**: Gets better at staying in deadband over time
- **Confidence Calibration**: Learns to better estimate own confidence
- **Autonomous Growth**: Reduces dependency on teacher over time

## Installation

```bash
npm install @superinstance/equipment-teacher-student
```

## Quick Start

```typescript
import { TeacherStudent } from '@superinstance/equipment-teacher-student';
import type { OriginCore, Task } from '@superinstance/starter-agent';

// Create the equipment with custom config
const teacherStudent = new TeacherStudent({
  deadband: {
    low: 0.6,
    high: 0.9,
    hysteresis: 0.05,
    adaptivityRate: 0.01,
  },
  distillation: {
    maxExamplesPerPattern: 100,
    successThreshold: 0.85,
    learningRate: 0.1,
  },
  selfImprovement: {
    adaptiveDeadband: true,
    adaptationThreshold: 0.7,
  },
});

// Equip to an agent
await teacherStudent.equip(agent);

// Process tasks with learning
const result = await teacherStudent.processTask(task, async () => {
  // Student's attempt at the task
  const output = await studentModel.process(task.query);
  const confidence = await studentModel.estimateConfidence(output);
  return { output, confidence };
});

console.log('Output:', result.output);
console.log('Called teacher:', result.calledTeacher);
console.log('Learning gain:', result.learningGain);

// Unequip (extracts muscle memory)
await teacherStudent.unequip(agent);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TeacherStudent Equipment                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐    ┌──────────────────────────┐   │
│  │  DeadbandController │    │   DistillationEngine     │   │
│  │  ──────────────────│    │   ────────────────────   │   │
│  │  • Evaluate conf.  │───▶│   • Extract patterns     │   │
│  │  • Teacher trigger │    │   • Store knowledge      │   │
│  │  • Adapt ranges    │    │   • Query knowledge      │   │
│  └─────────────────────┘    └──────────────────────────┘   │
│                                       │                      │
│                                       ▼                      │
│                           ┌──────────────────────────┐      │
│                           │     MuscleMemory         │      │
│                           │   ────────────────────   │      │
│                           │   • Extract triggers     │      │
│                           │   • Consolidate patterns │      │
│                           │   • Track performance    │      │
│                           └──────────────────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Deadband Logic

The deadband controller uses three zones:

```
Confidence
1.0 ─────────────────────────────────────────
    │               DEADBAND                │
    │                                       │
0.9 ─┬─────────────────────────────────────┬─ ▲
    │ │                                     │ │ Above: Call teacher
    │ │         WITHIN RANGE               │ │   for validation
    │ │      (Autonomous Operation)        │ │
    │ │                                     │ │
0.6 ─┼─┴───────────────────────────────────┴─┼─ ▼
    │ │                                     │ │ Below: Call teacher
    │ │                                     │ │   for guidance
    │ │                                     │ │
0.0 ─┴─────────────────────────────────────────┴─
    └─┬─────────────────────────────────────┬─┘
      │                                     │
   Hysteresis                            Hysteresis
   (prevents oscillation)
```

## API Reference

### TeacherStudent

Main equipment class implementing the teacher-student learning paradigm.

#### Constructor

```typescript
new TeacherStudent(config?: Partial<TeacherStudentConfig>)
```

#### Methods

| Method | Description |
|--------|-------------|
| `equip(agent)` | Equip to an OriginCore agent |
| `unequip(agent)` | Unequip, extracting muscle memory |
| `processTask(task, process)` | Process task with learning |
| `evaluateSimulation(expected, actual)` | Check simulation vs actual |
| `getState()` | Get current state |
| `getDeadbandBoundaries()` | Get current deadband range |
| `getKnowledge()` | Get distilled knowledge |
| `getMuscleMemory()` | Get muscle memory triggers |
| `getCallStatistics()` | Get teacher call stats |
| `getPerformanceMetrics()` | Get performance data |
| `reset()` | Reset learning state |
| `exportLearning()` | Export for persistence |
| `importLearning(data)` | Import learned data |
| `asTile()` | Get Tile representation |

### DeadbandController

Manages confidence thresholds for autonomous vs teacher-guided operation.

```typescript
const controller = new DeadbandController({
  low: 0.6,
  high: 0.9,
  hysteresis: 0.05,
  adaptivityRate: 0.01,
});

// Evaluate confidence
const decision = controller.evaluate(0.5);
// { shouldCall: true, reason: 'below_deadband', urgency: 'high' }

// Adapt based on learning
controller.adapt(learningProgress);
```

### DistillationEngine

Extracts and applies learned knowledge from teacher responses.

```typescript
const engine = new DistillationEngine({
  maxExamplesPerPattern: 100,
  successThreshold: 0.85,
});

// Distill teacher response
const result = await engine.distill(teacherResponse);

// Query knowledge
const query = engine.queryKnowledge(task);
if (query.found) {
  // Use learned knowledge
}

// Apply knowledge
const applied = engine.applyKnowledge(task);
```

### MuscleMemory

Extracts triggers from learned behavior for automatic response patterns.

```typescript
const memory = new MuscleMemory({
  extractionThreshold: 0.7,
  minApplications: 3,
});

// Extract from knowledge base
const extraction = memory.extractFromKnowledge(knowledgeBase);

// Check triggers
const check = memory.checkTriggers(context);

// Get performance report
const report = memory.getPerformanceReport();
```

## Types

### TeacherStudentConfig

```typescript
interface TeacherStudentConfig {
  deadband: {
    low: number;           // Lower bound (0.0 - 1.0)
    high: number;          // Upper bound (0.0 - 1.0)
    hysteresis?: number;   // Prevents oscillation
    adaptivityRate?: number; // Learning rate for adaptation
  };
  distillation: {
    maxExamplesPerPattern?: number;
    successThreshold?: number;
    learningRate?: number;
  };
  muscleMemory: {
    extractionThreshold?: number;
    minApplications?: number;
    consolidationEnabled?: boolean;
  };
  teacher: {
    endpoint?: string;
    maxRetries?: number;
    timeoutMs?: number;
    cacheResponses?: boolean;
  };
  selfImprovement: {
    adaptiveDeadband: boolean;
    adaptationThreshold: number;
    minExamplesForAdaptation: number;
  };
}
```

### TeacherCallReason

Reasons for calling a teacher:

| Reason | Description |
|--------|-------------|
| `below_deadband` | Confidence below lower threshold |
| `above_deadband` | Confidence above upper threshold |
| `simulation_mismatch` | Simulation didn't match actual outcome |
| `learning_opportunity` | High-value learning opportunity detected |
| `high_stakes_task` | Task has high stakes requiring validation |

## Usage Examples

### Basic Learning Loop

```typescript
const equipment = new TeacherStudent();
await equipment.equip(agent);

for (const task of tasks) {
  const result = await equipment.processTask(task, async () => {
    const output = await model.generate(task.query);
    const confidence = await model.confidence(output);
    return { output, confidence };
  });
  
  if (result.calledTeacher) {
    console.log(`Learned from teacher for task: ${task.id}`);
  }
}

await equipment.unequip(agent);
```

### Simulation Comparison

```typescript
// Predict outcome
const prediction = await model.simulate(task);
const actual = await execute(task);

// Check if simulation matched
const eval = equipment.evaluateSimulation(
  prediction.confidence,
  actual.confidence,
  task
);

if (eval.shouldCallTeacher) {
  // Learn from mismatch
  await callTeacher(task, actual);
}
```

### Persisting Learning

```typescript
// Export learning state
const learning = equipment.exportLearning();
await saveToFile('learning.json', learning);

// Later, import learning
const saved = await loadFromFile('learning.json');
equipment.importLearning(saved);
```

## Performance Metrics

Track learning progress with these metrics:

```typescript
const metrics = equipment.getPerformanceMetrics();

// metrics.autonomousRatio - Ratio of autonomous vs teacher-guided operations
// metrics.learningEfficiency - Overall learning progress (0.0 - 1.0)
// metrics.knowledgeCoverage - Coverage of knowledge patterns
// metrics.triggerEffectiveness - Muscle memory trigger success rate
```

## Best Practices

1. **Start Conservative**: Begin with a narrower deadband (e.g., 0.7-0.85) for more teacher guidance
2. **Monitor Progress**: Track `learningProgress` and adjust thresholds accordingly
3. **Adapt Gradually**: Use small `adaptivityRate` values to avoid instability
4. **Export Regularly**: Save learning state periodically to avoid losing progress
5. **Prune Knowledge**: Periodically call `prune()` on the distillation engine to remove stale knowledge

## License

MIT

## Related Packages

- `@superinstance/starter-agent` - Base agent and equipment types
- `@superinstance/equipment-memory` - Memory equipment
- `@superinstance/equipment-reasoning` - Reasoning equipment
