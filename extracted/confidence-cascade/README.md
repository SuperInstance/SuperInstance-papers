# Confidence Cascade

A TypeScript library for implementing decision confidence cascades with a three-zone model (GREEN/YELLOW/RED). Think of it like a fishing net - if any mesh tears, the whole thing's compromised. But sometimes you need multiple nets (parallel), and you trust some more than others.

## Why Confidence Cascades?

In complex systems, decisions often involve multiple steps, validators, or signals. Confidence cascades provide a mathematical framework to:

- **Track confidence degradation** through sequential processes
- **Combine multiple signals** with weighted importance (parallel)
- **Route through different validation paths** based on conditions
- **Automatically escalate** when confidence drops below thresholds

## Installation

```bash
npm install confidence-cascade
```

## Quick Start

```typescript
import {
  createConfidence,
  sequentialCascade,
  parallelCascade
} from 'confidence-cascade';

// Create confidence values
const mlScore = createConfidence(0.95, 'ml_model');
const rulesScore = createConfidence(0.70, 'rules_engine');
const reputationScore = createConfidence(0.85, 'user_reputation');

// Combine in parallel with weights
const parallelResult = parallelCascade([
  { confidence: mlScore, weight: 0.5 },
  { confidence: rulesScore, weight: 0.3 },
  { confidence: reputationScore, weight: 0.2 }
]);

console.log(`Final confidence: ${parallelResult.confidence.value}`);
console.log(`Zone: ${parallelResult.confidence.zone}`);
```

## The Three-Zone Model

Confidence values are classified into three zones:

| Zone | Range | Action |
|------|-------|--------|
| GREEN | 0.85 - 1.0 | Auto-proceed |
| YELLOW | 0.60 - 0.85 | Proceed with caution |
| RED | 0.00 - 0.60 | Stop and investigate |

### Configuration

You can customize the thresholds:

```typescript
const config = {
  greenThreshold: 0.90,
  yellowThreshold: 0.70,
  escalateOnYellow: true,
  escalateOnRed: true
};

const confidence = createConfidence(0.75, 'validator', config);
```

## Cascade Types

### 1. Sequential Cascade

Confidence multiplies through a chain of steps. This models scenarios where all steps must succeed.

```typescript
import { sequentialCascade } from 'confidence-cascade';

// Step 1: Input validation (95% confidence)
// Step 2: Format check (90% confidence)
// Step 3: Business rules (85% confidence)
// Step 4: Risk assessment (80% confidence)

const result = sequentialCascade([
  createConfidence(0.95, 'validation'),
  createConfidence(0.90, 'format'),
  createConfidence(0.85, 'business_rules'),
  createConfidence(0.80, 'risk_scoring')
]);

// Result: 0.95 * 0.90 * 0.85 * 0.80 = 0.58 (RED zone!)
```

### 2. Parallel Cascade

Confidence averages with weights. This models scenarios where multiple validators provide independent assessments.

```typescript
const result = parallelCascade([
  { confidence: createConfidence(0.95, 'ml_model'), weight: 0.5 },
  { confidence: createConfidence(0.70, 'rules_engine'), weight: 0.3 },
  { confidence: createConfidence(0.85, 'heuristics'), weight: 0.2 }
]);

// Result: 0.5*0.95 + 0.3*0.70 + 0.2*0.85 = 0.87 (GREEN zone)
```

### 3. Conditional Cascade

Confidence depends on which path is taken. This models scenarios with different validation paths.

```typescript
const result = conditionalCascade([
  {
    confidence: createConfidence(0.90, 'basic_validation'),
    predicate: amount < 1000,
    description: 'low_amount'
  },
  {
    confidence: createConfidence(0.95, 'enhanced_validation'),
    predicate: amount >= 1000 && amount < 10000,
    description: 'medium_amount'
  },
  {
    confidence: createConfidence(0.99, 'manual_review'),
    predicate: amount >= 10000,
    description: 'high_amount'
  }
]);
```

## Real-World Example: Fraud Detection

```typescript
import { fraudDetectionCascade } from 'confidence-cascade';

// Signals from various fraud detection systems
const signals = {
  mlScore: 0.85,              // ML model confidence
  rulesScore: 0.92,           // Rules engine confidence
  userReputation: 0.78,       // User's historical reputation
  transactionAmount: 2500,    // Transaction amount
  userLocationMatch: true     // Does location match history?
};

const result = fraudDetectionCascade(signals);

if (result.escalationLevel === 'ALERT') {
  // Block transaction, require manual review
  blockTransaction();
  notifyFraudTeam(transaction);
} else if (result.confidence.zone === 'YELLOW') {
  // Additional verification required
  requestAdditionalVerification(user);
} else {
  // Process normally
  approveTransaction();
}
```

## Escalation Levels

The system provides five escalation levels based on confidence zones:

1. **NONE** - GREEN zone, auto-proceed
2. **NOTICE** - YELLOW zone, log and continue
3. **WARNING** - YELLOW deep, flag for review
4. **ALERT** - RED zone, stop and require human
5. **CRITICAL** - RED deep, immediate intervention

## API Reference

### Types

```typescript
interface Confidence {
  value: number;              // 0.0 to 1.0
  zone: ConfidenceZone;       // GREEN | YELLOW | RED
  source: string;             // What generated this
  timestamp: number;          // Milliseconds since epoch
}

interface CascadeConfig {
  greenThreshold: number;     // Default: 0.85
  yellowThreshold: number;    // Default: 0.60
  redThreshold: number;       // Default: 0.00
  escalateOnYellow: boolean;  // Default: false
  escalateOnRed: boolean;     // Default: true
}

interface CascadeResult {
  confidence: Confidence;
  steps: CascadeStep[];
  escalationTriggered: boolean;
  escalationLevel: EscalationLevel;
}
```

### Functions

- `createConfidence(value: number, source: string, config?: CascadeConfig): Confidence`
- `sequentialCascade(confidences: Confidence[], config?: CascadeConfig): CascadeResult`
- `parallelCascade(branches: ParallelBranch[], config?: CascadeConfig): CascadeResult`
- `conditionalCascade(paths: ConditionalPath[], config?: CascadeConfig): CascadeResult`
- `formatConfidence(confidence: Confidence): string`
- `meetsThreshold(confidence: Confidence, threshold: number): boolean`
- `degradationRate(steps: CascadeStep[]): number`

## Testing

```bash
npm test
```

The library includes comprehensive unit tests covering all cascade types and edge cases.

## Use Cases

Confidence cascades are particularly useful for:

- **Fraud detection** systems with multiple signals
- **Content moderation** pipelines with various checks
- **CI/CD** validation steps
- **Security scanning** with multiple tools
- **Quality assurance** workflows
- **Any system where decisions have confidence scores**

## Design Philosophy

The confidence cascade system is designed around these principles:

1. **Transparency** - Every decision's confidence is traceable
2. **Composability** - Confidence flows can be combined and nested
3. **Fail-safe** - Low confidence triggers appropriate escalation
4. **Intuitive** - The three-zone model maps to natural decision-making

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related

- [stigmergy](https://github.com/SuperInstance/stigmergy) - Bio-inspired coordination system
- [POLLN](https://github.com/SuperInstance/Polln-whitepapers) - Research and theory papers

---

*Part of the SuperInstance ecosystem*