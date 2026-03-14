# @superinstance/equipment-context-handoff

> Generational context transfer for long-running agent tasks

## Overview

Equipment-Context-Handoff provides intelligent context transfer capabilities for agent instances that need to hand off work to subsequent "generations" of agents. This is essential for:

- **Long-running tasks** that exceed time or token limits
- **Cost optimization** by transferring to fresh context windows
- **Fault tolerance** by creating recovery points
- **Complex multi-phase workflows** with clear handoff boundaries

## Features

- 📦 **Context Packaging** - Serialize and package context for transfer
- 🗜️ **Intelligent Compression** - Reduce context size while preserving critical information
- 🔄 **Generational Transfer** - Pass context to next-generation agent instances
- 📍 **Resume Points** - Create checkpoints to resume from specific states
- ⚡ **Priority-based Preservation** - Automatically determine what to keep vs. compress
- 🎯 **Handoff Triggers** - Automatic handoff based on time, cost, complexity, or tokens

## Installation

```bash
npm install @superinstance/equipment-context-handoff
```

## Quick Start

```typescript
import { ContextHandoff } from '@superinstance/equipment-context-handoff';

// Initialize (optionally with parent package from previous generation)
const handoff = new ContextHandoff(parentPackage);

// Add content to context
handoff.addContent('task-definition', taskData, 'task_definition', 'critical');
handoff.addContent('intermediate-result', results, 'intermediate_step', 'important');

// Create resume points
handoff.checkpoint('phase-1-complete', { phase: 1, data: phase1Data }, 50);

// Check if handoff is needed
if (handoff.needsHandoff()) {
  const result = await handoff.transfer();
  
  // Pass result.package to the next agent instance
  return result.package;
}
```

## Core Concepts

### Context Priority

Content is assigned one of five priority levels:

| Priority | Description | Preservation |
|----------|-------------|--------------|
| `critical` | Essential for task completion | Always preserved |
| `essential` | Important for context | Preserved when possible |
| `important` | Valuable but replaceable | Compressed if needed |
| `optional` | Nice to have | May be dropped |
| `disposable` | Temporary data | Dropped first |

### Resume Points

Resume points allow agents to pick up where previous instances left off:

```typescript
// Create different types of resume points
handoff.checkpoint('milestone', state, 75); // General checkpoint
handoff.taskPoint('task-step', state, 'step-3', 60); // Task-specific
handoff.conversationPoint('dialog-turn', state, 'turn-5'); // Conversation-specific

// Activate a resume point to restore state
const result = handoff.activateResumePoint(pointId);
if (result.success) {
  const restoredState = result.state;
}
```

### Handoff Triggers

Automatic handoff can be triggered by various conditions:

```typescript
const handoff = new ContextHandoff(undefined, {
  enableAutoTriggers: true,
  timeThreshold: 30 * 60 * 1000, // 30 minutes
  costThreshold: 10.0, // $10
  tokenThreshold: 0.85, // 85% of max tokens
  complexityThreshold: 100,
});
```

## API Reference

### ContextHandoff

Main class for managing context handoff.

#### Constructor

```typescript
constructor(parentPackage?: ContextPackage, config?: HandoffConfig)
```

#### Content Management

```typescript
// Add content
addContent(id: string, content: unknown, type: string, priority?: ContextPriority): string

// Update content
updateContent(id: string, content: unknown, priority?: ContextPriority): boolean

// Remove content
removeContent(id: string): boolean

// Get content
getContent(id: string): PrioritizedContent | undefined

// Get all content
getAllContent(): Map<string, PrioritizedContent>

// Get token count
getTokenCount(): number
```

#### Resume Points

```typescript
// Create checkpoints
checkpoint(name: string, state: Record<string, unknown>, progress?: number): string
taskPoint(name: string, state: Record<string, unknown>, position: number | string, progress?: number): string
conversationPoint(name: string, state: Record<string, unknown>, position: number | string): string

// Activate resume point
activateResumePoint(id: string): ActivationResult

// Get resume points
getBestResumePoint(): ResumePoint | undefined
getResumePoints(): ResumePoint[]
```

#### Handoff Operations

```typescript
// Check if handoff needed
needsHandoff(): boolean

// Perform transfer
transfer(options?: TransferOptions): Promise<TransferResult>

// Force handoff
forceTransfer(reason: string): Promise<TransferResult>

// Receive from previous generation (static)
ContextHandoff.receive(pkg: ContextPackage, config?: HandoffConfig): ContextHandoff
```

#### Monitoring

```typescript
// Get context statistics
getContextStats(): HandoffContext

// Get generation info
getGeneration(): { number: number; ancestry: string[]; accumulatedTime: number }

// Get transfer statistics
getTransferStats(): TransferStats

// Record errors/costs
recordError(error?: Error): void
recordCost(cost: number): void

// Get elapsed time
getElapsedTime(): number

// Check if transferred
isComplete(): boolean
```

### ContextPackager

Handles packaging and serialization of context.

```typescript
const packager = new ContextPackager(generationInfo);

// Add content
packager.addContent({ id, content, type, priority, tags });

// Create package
const pkg = await packager.package({ maxTokens: 100000 });

// Load from package
packager.loadFromPackage(existingPackage);
```

### ContextCompressor

Intelligent context compression.

```typescript
const compressor = new ContextCompressor({
  level: 6,
  strategy: 'balanced',
  allowLossy: true,
});

// Compress content
const result = await compressor.compress(content, targetTokens);

// Estimate ratio
const ratio = compressor.estimateCompressionRatio(content);
```

### ResumePointManager

Manages checkpoint creation and restoration.

```typescript
const rpm = new ResumePointManager();

// Create resume points
rpm.create({ type: 'checkpoint', name: 'milestone', state, position, progress });

// Activate
const result = rpm.activate(pointId);

// Auto-checkpointing
rpm.enableAutoCheckpoint(() => currentState, 60000);
```

### GenerationalTransfer

Handles context transfer between generations.

```typescript
const transfer = new GenerationalTransfer(parentPackage);

// Add content
transfer.addContent(id, content, type, priority);

// Check triggers
const { triggered, trigger } = transfer.shouldTriggerHandoff(context);

// Prepare transfer
const result = await transfer.prepareTransfer({ reason: 'time-limit' });
```

## Configuration Options

```typescript
interface HandoffConfig {
  // Maximum context size in tokens
  maxContextSize?: number; // Default: 100000
  
  // Compression level (0-9)
  compressionLevel?: number; // Default: 6
  
  // Enable automatic handoff triggers
  enableAutoTriggers?: boolean; // Default: true
  
  // Time threshold in milliseconds
  timeThreshold?: number; // Default: 1800000 (30 min)
  
  // Complexity threshold for auto-handoff
  complexityThreshold?: number; // Default: 100
  
  // Cost threshold for auto-handoff
  costThreshold?: number; // Default: 10.0
  
  // Token usage threshold (percentage)
  tokenThreshold?: number; // Default: 0.85
  
  // Maximum generations before forced compression
  maxGenerations?: number; // Default: 10
  
  // Preserve critical content
  preserveCritical?: boolean; // Default: true
  
  // Enable resume point tracking
  enableResumePoints?: boolean; // Default: true
  
  // Custom handoff event handler
  onHandoff?: HandoffEventHandler;
}
```

## Events

```typescript
handoff.on((event) => {
  console.log(`Event: ${event.type}`, event.data);
});

// Event types:
// - 'handoff:initiated' - Handoff started
// - 'handoff:completed' - Handoff finished
// - 'handoff:failed' - Handoff failed
// - 'compression:started' - Compression started
// - 'compression:completed' - Compression finished
// - 'resume:created' - Resume point created
// - 'resume:activated' - Resume point activated
// - 'trigger:fired' - Handoff trigger fired
// - 'context:overflow' - Context exceeded limits
```

## Usage Patterns

### Long-Running Task with Checkpoints

```typescript
async function longRunningTask(handoff: ContextHandoff) {
  const phases = ['setup', 'process', 'validate', 'complete'];
  
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const progress = ((i + 1) / phases.length) * 100;
    
    // Do work...
    const result = await processPhase(phase);
    
    // Checkpoint after each phase
    handoff.checkpoint(`${phase}-complete`, { phase, result }, progress);
    
    // Check if handoff needed
    if (handoff.needsHandoff()) {
      const transferResult = await handoff.transfer();
      return { needsContinue: true, package: transferResult.package };
    }
  }
  
  return { needsContinue: false, result: finalResult };
}
```

### Resuming from Previous Generation

```typescript
async function resumeTask(receivedPackage: ContextPackage) {
  // Receive context from previous generation
  const handoff = ContextHandoff.receive(receivedPackage);
  
  // Find best resume point
  const resumePoint = handoff.getBestResumePoint();
  
  if (resumePoint) {
    // Activate resume point
    const result = handoff.activateResumePoint(resumePoint.id);
    
    if (result.success) {
      // Continue from resumed state
      return continueFromState(result.state);
    }
  }
  
  // No valid resume point, start fresh
  return startFresh();
}
```

### Cost-Optimized Handoff

```typescript
const handoff = new ContextHandoff(undefined, {
  costThreshold: 5.0, // Handoff at $5
  enableAutoTriggers: true,
  onHandoff: (event) => {
    if (event.type === 'trigger:fired') {
      console.log(`Handoff triggered: ${event.data.triggerType}`);
    }
  },
});

// Track costs
handoff.recordCost(1.50); // After LLM call
```

## Best Practices

1. **Set Appropriate Priorities**: Mark critical task definitions and goals as `critical` priority
2. **Create Regular Checkpoints**: Add checkpoints at meaningful milestones
3. **Monitor Context Stats**: Regularly check `getContextStats()` for health monitoring
4. **Handle Events**: Use event handlers for logging and monitoring
5. **Validate Before Transfer**: Call `validate()` to ensure context integrity
6. **Use Compression Wisely**: Balance between size reduction and information preservation

## License

MIT © Superinstance Team
