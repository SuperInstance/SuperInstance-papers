# @superinstance/equipment-consensus-engine

Multi-agent deliberation equipment with Pathos/Logos/Ethos weighting for consensus building in the SuperInstance ecosystem.

## Overview

The Consensus Engine implements a sophisticated multi-agent deliberation framework based on the classical rhetorical tripartite of **Pathos**, **Logos**, and **Ethos**. This equipment enables AI systems to make well-rounded decisions by considering multiple perspectives before reaching consensus.

### The Tripartite Framework

- **Pathos** (πάθος) - Appeals to emotion, intent, and human experience
- **Logos** (λόγος) - Appeals to logic, reason, and rational argument  
- **Ethos** (ἦθος) - Appeals to ethics, credibility, and moral character

## Installation

```bash
npm install @superinstance/equipment-consensus-engine
```

## Quick Start

```typescript
import { ConsensusEngine } from '@superinstance/equipment-consensus-engine';

// Create a consensus engine
const engine = new ConsensusEngine({
  maxRounds: 5,
  confidenceThreshold: 0.7,
  domain: 'balanced',
  enableAudit: true,
});

// Deliberate on a proposition
const result = await engine.deliberate({
  proposition: 'Should we implement a 4-day work week?',
  context: 'Our company has 100 employees and is in the technology sector.',
});

console.log(result.consensus);    // true/false
console.log(result.verdict);      // The consensus verdict
console.log(result.confidence);   // Overall confidence (0-1)
```

## Features

### Tripartite Deliberation

The engine deliberates through three distinct perspectives:

```typescript
import { TripartiteDeliberation } from '@superinstance/equipment-consensus-engine';

const deliberation = new TripartiteDeliberation();

// Analyze from each perspective
const pathosAnalysis = await deliberation.analyze(
  'pathos',
  'Should we reduce prices?',
  'Market competition is increasing'
);

console.log(pathosAnalysis.verdict);     // Pathos perspective verdict
console.log(pathosAnalysis.confidence);  // Confidence level
console.log(pathosAnalysis.arguments);   // Supporting arguments
console.log(pathosAnalysis.concerns);    // Potential concerns
```

### Domain-Adaptive Weighting

The engine automatically adjusts perspective weights based on the decision domain:

```typescript
import { WeightCalculator } from '@superinstance/equipment-consensus-engine';

const calculator = new WeightCalculator();

// Get weights for different domains
const factualWeights = calculator.getProfile('factual');
// { pathosWeight: 0.15, logosWeight: 0.60, ethosWeight: 0.25 }

const emotionalWeights = calculator.getProfile('emotional');
// { pathosWeight: 0.50, logosWeight: 0.20, ethosWeight: 0.30 }

const sensitiveWeights = calculator.getProfile('sensitive');
// { pathosWeight: 0.30, logosWeight: 0.25, ethosWeight: 0.45 }

// Auto-detect domain from content
const detectedDomain = calculator.detectDomain(
  'This research study shows statistical evidence...'
);
// Returns: 'factual'
```

#### Supported Domains

| Domain | Pathos | Logos | Ethos | Description |
|--------|--------|-------|-------|-------------|
| `factual` | 0.15 | 0.60 | 0.25 | Scientific, data-driven decisions |
| `emotional` | 0.50 | 0.20 | 0.30 | Human-centered, relationship decisions |
| `sensitive` | 0.30 | 0.25 | 0.45 | Ethically complex decisions |
| `creative` | 0.40 | 0.30 | 0.30 | Artistic, innovative decisions |
| `balanced` | 0.333 | 0.334 | 0.333 | Default equal weighting |
| `technical` | 0.10 | 0.70 | 0.20 | Engineering, implementation decisions |
| `social` | 0.40 | 0.25 | 0.35 | Community impact decisions |
| `business` | 0.25 | 0.45 | 0.30 | Commercial, strategic decisions |
| `personal` | 0.45 | 0.30 | 0.25 | Individual-focused decisions |

### Conflict Resolution

When perspectives disagree, the engine uses multiple resolution strategies:

```typescript
import { ConflictResolution } from '@superinstance/equipment-consensus-engine';

const resolver = new ConflictResolution({
  maxAttempts: 3,
  minConfidence: 0.6,
});

const conflict = {
  type: 'fundamental_disagreement',
  perspectives: ['pathos', 'logos'],
  severity: 'high',
  description: 'Emotional appeal conflicts with logical analysis',
  context: {},
};

const result = await resolver.resolve(conflict, opinions);
console.log(result.resolved);   // Whether conflict was resolved
console.log(result.strategy);   // Strategy used
console.log(result.verdict);    // Resolved verdict
```

#### Resolution Strategies

1. **Weighted Voting** - Use perspective weights to decide
2. **Deliberation Extension** - Add more deliberation rounds
3. **Reframing** - Reframe the proposition
4. **Compromise** - Find middle ground between perspectives
5. **Conditional Approval** - Approve with conditions
6. **Perspective Dominance** - Let dominant perspective decide
7. **Suspension** - Suspend pending more information
8. **Escalation** - Escalate to higher authority

### Audit Trail

Track the complete deliberation process:

```typescript
const result = await engine.deliberate({ ... });

for (const entry of result.auditTrail) {
  console.log(`${entry.timestamp}: ${entry.action}`);
  console.log(`  ${entry.description}`);
}
```

### Confidence Aggregation

The engine aggregates confidence across perspectives using weighted averaging:

```typescript
// Overall confidence considers:
// 1. Individual perspective confidences
// 2. Perspective weights (domain-dependent)
// 3. Consensus achievement (boost if unanimous)

console.log(result.confidence);  // Aggregated confidence
console.log(result.metadata.weightProfile);  // Applied weights
```

## API Reference

### ConsensusEngine

Main equipment class for multi-agent deliberation.

```typescript
class ConsensusEngine {
  constructor(config?: Partial<ConsensusEngineConfig>);
  
  // Main deliberation method
  async deliberate(input: DeliberationInput): Promise<ConsensusResult>;
  
  // Utility methods
  clearAuditTrail(): void;
  getAuditTrail(): AuditEntry[];
  updateDomainWeights(domain: DomainType, weights: Partial<WeightProfile>): void;
  getConfig(): Readonly<ConsensusEngineConfig>;
}
```

### TripartiteDeliberation

Manages deliberation across three rhetorical perspectives.

```typescript
class TripartiteDeliberation {
  // Analyze from a specific perspective
  async analyze(
    perspective: TripartitePerspective,
    proposition: string,
    context: string,
    previousOpinions?: PerspectiveOpinion[]
  ): Promise<PerspectiveAnalysis>;
  
  // Configure perspective behavior
  setPerspectiveConfig(
    perspective: TripartitePerspective,
    config: { threshold?: number; style?: DeliberationMode }
  ): void;
}
```

### WeightCalculator

Calculates domain-specific weights for perspectives.

```typescript
class WeightCalculator {
  constructor(customWeights?: Partial<WeightProfile>);
  
  // Get and set profiles
  getProfile(domain: DomainType): WeightProfile;
  setProfile(domain: DomainType, weights: Partial<WeightProfile>): void;
  
  // Dynamic weight calculation
  calculateAdjustedWeights(
    domain: DomainType,
    content: string,
    baseWeights?: WeightProfile
  ): WeightProfile;
  
  // Domain detection
  detectDomain(content: string): DomainType;
  
  // Utilities
  getDomainCharacteristics(domain: DomainType): DomainCharacteristics;
  listDomains(): DomainType[];
  blendDomains(domains: Array<{ domain: DomainType; weight: number }>): WeightProfile;
  validateProfile(profile: Partial<WeightProfile>): { valid: boolean; errors: string[] };
}
```

### ConflictResolution

Handles disagreements between perspectives.

```typescript
class ConflictResolution {
  constructor(config?: Partial<ResolutionConfig>);
  
  // Resolve a conflict
  async resolve(
    conflict: ConflictRecord,
    opinions: PerspectiveOpinion[]
  ): Promise<ResolutionResult>;
  
  // History and stats
  getHistory(): Array<{ conflict: ConflictRecord; result: ResolutionResult; timestamp: Date }>;
  clearHistory(): void;
  getStats(): ResolutionStats;
}
```

## Types

```typescript
// Core types
type PerspectiveType = 'pathos' | 'logos' | 'ethos';
type TripartitePerspective = 'pathos' | 'logos' | 'ethos';
type DomainType = 'factual' | 'emotional' | 'sensitive' | 'creative' | 'balanced' | 
                  'technical' | 'social' | 'business' | 'personal';

// Configuration
interface ConsensusEngineConfig {
  maxRounds: number;
  confidenceThreshold: number;
  includeDissent: boolean;
  domain: DomainType;
  customWeights?: Partial<WeightProfile>;
  enableAudit: boolean;
  timeout: number;
}

// Results
interface ConsensusResult {
  consensus: boolean;
  verdict: string;
  confidence: number;
  perspectives: PerspectiveOpinion[];
  rounds: DeliberationRound[];
  resolvedConflicts: ResolutionResult[];
  dissentingOpinions?: PerspectiveOpinion[];
  auditTrail: AuditEntry[];
  metadata: ConsensusMetadata;
}

interface PerspectiveOpinion {
  perspective: PerspectiveType;
  verdict: string;
  confidence: number;
  arguments: string[];
  concerns: string[];
  weight: number;
  timestamp: Date;
}
```

## Usage Examples

### Basic Deliberation

```typescript
const engine = new ConsensusEngine();

const result = await engine.deliberate({
  proposition: 'Should we launch this product feature?',
  context: 'The feature is 80% complete but has known bugs.',
});

if (result.consensus) {
  console.log('Consensus reached:', result.verdict);
} else {
  console.log('No consensus. Perspectives disagree.');
}
```

### Domain-Specific Deliberation

```typescript
const technicalEngine = new ConsensusEngine({
  domain: 'technical',
  maxRounds: 3,
});

const result = await technicalEngine.deliberate({
  proposition: 'Should we refactor the authentication module?',
  context: 'The current implementation has security vulnerabilities.',
  domainOverride: 'sensitive',  // Override for this deliberation
});
```

### Extended Deliberation with Audit

```typescript
const engine = new ConsensusEngine({
  maxRounds: 10,
  enableAudit: true,
});

const result = await engine.deliberate({
  proposition: 'Should we acquire Company X?',
  context: 'Company X has $10M revenue but declining market share.',
});

// Review the deliberation process
console.log(`Completed in ${result.metadata.durationMs}ms`);
console.log(`Rounds: ${result.metadata.roundsCompleted}`);
console.log(`Conflicts resolved: ${result.metadata.conflictsResolved}`);

// Check audit trail for detailed analysis
for (const entry of result.auditTrail) {
  console.log(`[${entry.action}] ${entry.description}`);
}
```

### Custom Weight Profiles

```typescript
const engine = new ConsensusEngine({
  domain: 'balanced',
  customWeights: {
    pathosWeight: 0.4,
    logosWeight: 0.4,
    ethosWeight: 0.2,
  },
});

// Or update weights dynamically
engine.updateDomainWeights('business', {
  ethosWeight: 0.4,  // Increase ethical consideration
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   ConsensusEngine                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Deliberation Loop                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │   │
│  │  │   Pathos    │  │    Logos    │  │  Ethos  │ │   │
│  │  │  (Emotion)  │  │   (Logic)   │  │(Ethics) │ │   │
│  │  └──────┬──────┘  └──────┬──────┘  └────┬────┘ │   │
│  │         │                │              │       │   │
│  │         └────────────────┼──────────────┘       │   │
│  │                          │                      │   │
│  │  ┌───────────────────────┴────────────────┐     │   │
│  │  │           Cross-Examination             │     │   │
│  │  └───────────────────────┬────────────────┘     │   │
│  └──────────────────────────┼──────────────────────┘   │
│                             │                          │
│  ┌──────────────────────────┴──────────────────────┐   │
│  │            WeightCalculator                      │   │
│  │    Domain-specific perspective weighting         │   │
│  └──────────────────────────┬──────────────────────┘   │
│                             │                          │
│  ┌──────────────────────────┴──────────────────────┐   │
│  │           ConflictResolution                     │   │
│  │    Multi-strategy conflict handling              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │               Audit Trail                        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Integration with SuperInstance

This equipment is designed to work within the SuperInstance ecosystem:

```typescript
import { ConsensusEngine } from '@superinstance/equipment-consensus-engine';
import type { BaseEquipment } from '@superinstance/starter-agent';

// Register as equipment
const consensusEquipment = new ConsensusEngine({
  domain: 'balanced',
  enableAudit: true,
});

// Use in deliberation workflows
async function makeDecision(proposition: string, context: string) {
  const result = await consensusEquipment.deliberate({
    proposition,
    context,
  });
  
  return {
    decision: result.verdict,
    confidence: result.confidence,
    consensus: result.consensus,
  };
}
```

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Version History

- **1.0.0** - Initial release with tripartite deliberation, domain-adaptive weighting, and conflict resolution
