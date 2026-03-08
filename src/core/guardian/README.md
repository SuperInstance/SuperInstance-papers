# Guardian Angel Safety System

A shadow agent with veto power for real-time execution monitoring in POLLN (Pattern-Organized Large Language Network).

## Overview

The Guardian Angel is a sophisticated safety system that acts as a real-time monitoring layer for all agent executions in POLLN. Unlike traditional safety layers that only block dangerous actions, the Guardian Angel provides three decision modes:

- **ALLOW**: Action is safe to execute
- **MODIFY**: Action should be adjusted before execution
- **VETO**: Action must be blocked

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Guardian Angel System                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Guardian   │───▶│   Learning   │───▶│   Feedback   │  │
│  │    Agent     │    │   System     │    │    Loop      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                                       │            │
│         ▼                                       ▼            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Constraint Engine (20+ constraints)        │ │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐          │ │
│  │  │  Resource  │ │   Action   │ │   Privacy  │          │ │
│  │  │   Limits   │ │  Control   │ │ Protection │          │ │
│  │  └────────────┘ └────────────┘ └────────────┘          │ │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐          │ │
│  │  │    Rate    │ │   Ethical  │ │  Security  │          │ │
│  │  │  Limiting  │ │ Guidelines │ │            │          │ │
│  │  └────────────┘ └────────────┘ └────────────┘          │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│                              ▼                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            Integration with SafetyLayer                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Features

### Real-Time Execution Monitoring

- Monitors all agent executions before they run
- Evaluates against 20+ built-in safety constraints
- Returns ALLOW/MODIFY/VETO decisions with confidence scores
- Tracks execution metrics (memory, CPU, duration)

### Adaptive Learning

- Learns from false positives and false negatives
- Adjusts constraint weights based on feedback
- Improves accuracy over time through reinforcement
- Supports human override with feedback collection

### Built-in Safety Constraints

#### Resource Limits
- **Memory Limit**: Prevents excessive memory usage (default: 4GB)
- **CPU Time Limit**: Prevents CPU monopolization (default: 10s)
- **Execution Duration**: Limits how long agents can run (default: 30s)

#### Action Control
- **Action Whitelist**: Only allows whitelisted actions
- **Action Blacklist**: Blocks dangerous/prohibited actions
- **File Operation Safety**: Validates file operations for safety

#### Rate Limiting
- **Agent Rate Limit**: Prevents individual agent spam (default: 60/min)
- **Global Rate Limit**: Prevents system overload (default: 100/s)

#### Privacy Protection
- **PII Detection**: Detects and blocks PII in payloads
- **Sensitive Data Protection**: Protects sensitive data from unauthorized access
- **Privacy Level Enforcement**: Enforces appropriate privacy levels

#### Ethical Guidelines
- **Harm Prevention**: Prevents actions that could cause harm
- **Bias Detection**: Detects potential bias in decisions
- **Transparency Requirement**: Ensures actions are traceable

#### Output Validation
- **Output Size Limit**: Prevents excessive outputs (default: 10MB)
- **Output Format Validation**: Ensures valid JSON outputs
- **Malicious Content Detection**: Detects malicious content patterns

#### Security
- **Injection Attack Prevention**: Prevents SQL, command, and code injection
- **Network Access Control**: Controls external network calls

#### Compliance
- **Audit Trail Requirement**: Ensures proper logging for audit
- **Data Retention Policy**: Enforces data retention policies

### Human-in-the-Loop

- Human override capability with reason tracking
- Feedback collection for continuous improvement
- Alert system for critical events
- Audit trail of all decisions and overrides

## Installation

The Guardian Angel system is included in the core POLLN package:

```typescript
import {
  GuardianAngelAgent,
  createGuardianAgent,
  createGuardianSafety,
  createGuardianContext,
} from '@polln/core';
```

## Quick Start

### Basic Usage

```typescript
import { createGuardianAgent, createGuardianContext } from '@polln/core';

// Create a guardian agent
const guardian = createGuardianAgent({
  enabled: true,
  strictMode: false,
  learningEnabled: true,
});

// Create a proposal context
const context = createGuardianContext({
  agentId: 'agent-analyst-1',
  action: 'analyze',
  payload: { data: 'Sample data to analyze' },
  metadata: { priority: 'normal' },
});

// Review the proposal
const review = await guardian.reviewProposal(context);

console.log(`Decision: ${review.decision}`);
console.log(`Reason: ${review.reason}`);
console.log(`Confidence: ${review.confidence}`);

// Check if execution is allowed
if (review.decision === 'ALLOW') {
  // Execute the action
} else if (review.decision === 'MODIFY') {
  // Apply modifications
  const modifiedContext = applyModifications(context, review);
  // Execute with modifications
} else {
  // Vetoed - do not execute
}
```

### Integration with SafetyLayer

```typescript
import { SafetyLayer, createGuardianSafety } from '@polln/core';

// Create existing safety layer
const safetyLayer = new SafetyLayer();

// Create integrated guardian safety
const guardianSafety = createGuardianSafety(safetyLayer, {
  enabled: true,
  learningEnabled: true,
});

// Review A2A packages
const review = await guardianSafety.reviewPackage(a2aPackage);

// Monitor execution
guardianSafety.startExecution(a2aPackage);
// ... execute ...
guardianSafety.completeExecution(a2aPackage, 'success');

// Submit feedback
await guardianSafety.submitFeedback({
  reviewId: review.id,
  proposalId: review.proposalId,
  wasCorrect: true,
  humanOverride: false,
  notes: 'Review was accurate',
});
```

### Human Override

```typescript
// Guardian makes a veto decision
const review = await guardian.reviewProposal(context);

if (review.decision === 'VETO') {
  // Human decides to override
  const overrideSuccess = guardian.overrideDecision(
    review.id,
    'Code has been manually reviewed and approved',
    'human-admin-john'
  );

  if (overrideSuccess) {
    // Submit feedback about the override
    await guardian.submitFeedback({
      id: `feedback-${Date.now()}`,
      reviewId: review.id,
      proposalId: review.proposalId,
      timestamp: Date.now(),
      decision: review.decision,
      wasCorrect: false, // The veto was incorrect
      humanOverride: true,
      shouldAdjustWeights: true,
    });
  }
}
```

## Configuration

### Guardian Configuration

```typescript
interface GuardianConfig {
  // Basic settings
  enabled: boolean;
  strictMode: boolean;        // If true, veto on any constraint failure
  learningEnabled: boolean;   // Enable adaptive learning

  // Decision thresholds
  allowThreshold: number;     // Confidence threshold for ALLOW (default: 0.8)
  modifyThreshold: number;    // Confidence threshold for MODIFY (default: 0.5)
  vetoThreshold: number;      // Confidence threshold for VETO (default: 0.3)

  // Resource limits
  maxReviewTimeMs: number;           // Maximum time for review (default: 5000ms)
  maxConcurrentReviews: number;      // Maximum concurrent reviews (default: 10)

  // Learning parameters
  learningRate: number;              // Weight adjustment rate (default: 0.1)
  adaptationInterval: number;        // Adaptation interval (default: 300000ms)
  minSamplesForAdaptation: number;   // Minimum samples for adaptation (default: 10)

  // Override settings
  allowHumanOverride: boolean;       // Allow human override (default: true)
  requireOverrideReason: boolean;    // Require reason for override (default: true)
  logAllOverrides: boolean;          // Log all overrides (default: true)
}
```

### Learning Configuration

```typescript
interface LearningConfig {
  enabled: boolean;
  learningRate: number;        // How fast to adjust weights (default: 0.1)
  decayRate: number;           // Weight decay rate (default: 0.01)
  momentum: number;            // Momentum for weight updates (default: 0.9)

  minSamplesForAdaptation: number;     // Minimum samples for adaptation
  adaptationInterval: number;          // How often to adapt (default: 5 minutes)
  accuracyThreshold: number;           // Target accuracy threshold

  minWeight: number;             // Minimum constraint weight (default: 0.1)
  maxWeight: number;             // Maximum constraint weight (default: 2.0)

  autoTuneThresholds: boolean;   // Automatically tune decision thresholds
  targetTruePositiveRate: number;  // Target TPR (default: 0.95)
  targetTrueNegativeRate: number;  // Target TNR (default: 0.90)
}
```

## API Reference

### GuardianAngelAgent

Main class for the Guardian Angel system.

#### Methods

- `reviewProposal(context: GuardianContext): Promise<GuardianReview>` - Review a proposal
- `overrideDecision(reviewId: string, reason: string, by: string): boolean` - Override a decision
- `submitFeedback(feedback: GuardianFeedback): Promise<void>` - Submit feedback
- `startExecution(proposalId: string, context: GuardianContext): ExecutionMonitor` - Start monitoring
- `completeExecution(proposalId: string, outcome: string, details?: string): void` - Complete monitoring
- `getStats(): GuardianStats` - Get statistics
- `getConstraints(): GuardianConstraint[]` - Get all constraints
- `addConstraint(constraint: GuardianConstraint): void` - Add custom constraint
- `removeConstraint(id: string): boolean` - Remove constraint
- `enable() / disable()` - Enable/disable guardian
- `enableStrictMode() / disableStrictMode()` - Toggle strict mode

### Utility Functions

- `createGuardianAgent(config?: Partial<GuardianConfig>): GuardianAngelAgent` - Create guardian agent
- `createGuardianContext(data: { agentId, action, payload, metadata? }): GuardianContext` - Create context
- `isAllowed(review: GuardianReview): boolean` - Check if allowed
- `isModified(review: GuardianReview): boolean` - Check if modified
- `isVetoed(review: GuardianReview): boolean` - Check if vetoed
- `applyModifications(context: GuardianContext, review: GuardianReview): GuardianContext` - Apply modifications

## Statistics

The Guardian tracks comprehensive statistics:

```typescript
interface GuardianStats {
  totalReviews: number;
  allows: number;
  modifications: number;
  vetoes: number;
  overrides: number;

  // Accuracy metrics
  truePositives: number;   // Correctly blocked
  trueNegatives: number;   // Correctly allowed
  falsePositives: number;  // Incorrectly blocked
  falseNegatives: number;  // Incorrectly allowed

  // Performance
  avgReviewTimeMs: number;
  maxReviewTimeMs: number;
  minReviewTimeMs: number;

  // Timeline
  reviewsLastHour: number;
  reviewsLastDay: number;
}
```

## Examples

See the `examples/guardian-angel-example.ts` file for comprehensive examples including:

1. Basic guardian usage
2. Dangerous action detection
3. Privacy protection
4. Resource limits
5. Feedback and learning
6. Integration with SafetyLayer
7. Human override
8. Rate limiting

## Testing

Run the Guardian tests:

```bash
npm test src/core/guardian/__tests__/guardian.test.ts
```

All 31 tests pass, covering:

- Agent creation and configuration
- Proposal review and decision making
- Dangerous action detection
- Privacy protection
- Resource limit enforcement
- Feedback and learning
- Integration with SafetyLayer
- Human override
- Rate limiting
- Performance tests
- Error handling

## Architecture Decisions

### Why Three Decisions (ALLOW/MODIFY/VETO)?

Unlike traditional binary safety systems (allow/block), the Guardian provides three decisions:

- **ALLOW**: Full confidence the action is safe
- **MODIFY**: Action could be safe with adjustments (e.g., reduce memory allocation)
- **VETO**: Action is definitely unsafe and must be blocked

This enables more nuanced control and reduces false positives.

### Why Adaptive Learning?

Static rules can't anticipate all edge cases. By learning from feedback, the Guardian:

- Reduces false positives over time
- Adapts to your specific use case
- Improves accuracy without manual tuning
- Provides visibility into learning progress

### Why Human-in-the-Loop?

AI systems make mistakes. Human oversight ensures:

- Critical decisions can be reviewed
- False positives don't block legitimate work
- Feedback improves the system
- Accountability is maintained

## Performance

The Guardian is designed for high throughput:

- **Average review time**: <10ms
- **Throughput**: 100+ reviews/second
- **Memory overhead**: Minimal (~50MB base)
- **Concurrent reviews**: Configurable (default: 10)

## Security Considerations

The Guardian itself is designed with security in mind:

1. **Cannot be disabled by agents**: Only trusted administrators
2. **Audit trail**: All decisions are logged
3. **Conservative defaults**: When in doubt, veto
4. **Critical constraints**: Cannot be overridden without reason
5. **Rate limiting**: Prevents abuse of the Guardian itself

## Future Enhancements

Planned improvements:

1. **Multi-agent coordination**: Share learning across guardians
2. **Explainable AI**: Better explanations for decisions
3. **Constraint templates**: Easy addition of custom constraints
4. **ML-based detection**: Use ML for pattern recognition
5. **Distributed deployment**: Run guardians across multiple nodes

## Contributing

To add custom constraints:

```typescript
import { createConstraint } from '@polln/core';

const myConstraint = createConstraint(
  'My Custom Constraint',
  'Description of what it checks',
  'security',  // category
  'high',      // severity
  async (context) => {
    // Your evaluation logic
    if (isUnsafe(context)) {
      return {
        passed: false,
        decision: 'VETO',
        reason: 'Custom safety check failed',
        severity: 'high',
        confidence: 0.9,
      };
    }
    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'Custom safety check passed',
      severity: 'low',
      confidence: 0.9,
    };
  },
  1.0  // weight
);

guardian.addConstraint(myConstraint);
```

## License

MIT License - see LICENSE file for details.
