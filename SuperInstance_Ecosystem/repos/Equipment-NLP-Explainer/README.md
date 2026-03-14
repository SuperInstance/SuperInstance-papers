# @superinstance/equipment-nlp-explainer

> Equipment that generates human-readable descriptions of cell logic and operations.

## Overview

The NLP Explainer is a SuperInstance equipment that transforms complex decision logic into natural language explanations. Unlike simple result reporting, this equipment explains **WHY** a decision was made, not just **WHAT** was decided.

## Key Features

- **Natural Language Explanations**: Transforms formal logic patterns into readable prose
- **WHY Analysis**: Explains the reasoning behind decisions, not just the outcomes
- **Confidence Translation**: Maps numeric confidence scores to human-understandable terms
- **Audit Trail Generation**: Creates prose-form audit trails for compliance and debugging
- **Multi-Language Support**: English, Spanish, and Chinese translations built-in
- **Reasoning Chain Explanation**: Can explain complex multi-step reasoning processes

## Installation

```bash
npm install @superinstance/equipment-nlp-explainer
```

## Quick Start

```typescript
import { createExplainer, createPattern } from '@superinstance/equipment-nlp-explainer';

// Create an explainer instance
const explainer = createExplainer({ language: 'en' });

// Create a logic pattern
const pattern = {
  id: 'loan-approval-1',
  name: 'Loan Approval Decision',
  type: 'decision',
  structure: { complexity: 3, stepCount: 4, isNested: false, branchingFactor: 2 },
  inputs: [
    { id: 'i1', name: 'creditScore', value: 750, type: 'number', source: 'credit_bureau', wasUsed: true },
    { id: 'i2', name: 'income', value: 85000, type: 'number', source: 'application', wasUsed: true },
  ],
  outputs: [
    { id: 'o1', name: 'approved', value: true, type: 'boolean', isFinal: true },
  ],
  conditions: [
    {
      id: 'c1',
      expression: 'creditScore >= 700',
      left: 'creditScore',
      operator: '>=',
      right: '700',
      result: true,
      reasoning: 'Credit score of 750 exceeds minimum requirement of 700',
      confidence: 0.95,
    },
    {
      id: 'c2',
      expression: 'income >= 50000',
      left: 'income',
      operator: '>=',
      right: '50000',
      result: true,
      reasoning: 'Annual income of $85,000 meets the $50,000 threshold',
      confidence: 0.98,
    },
  ],
  transformations: [],
  confidence: 0.92,
};

// Get a full explanation
const explanation = explainer.explain(pattern);

console.log(explanation.summary);
// "This is a decision-making process involving 2 steps..."

console.log(explanation.details.why);
// "The reason is input data needed to be processed and a decision made."

// Get confidence explanation
const confidenceExpl = explainer.explainConfidence(0.92);
console.log(confidenceExpl.level);
// "high confidence"
console.log(confidenceExpl.interpretation);
// "A 92% confidence indicates the decision is highly reliable..."
```

## API Reference

### NLPExplainer

The main equipment class that generates natural language explanations.

#### Constructor

```typescript
new NLPExplainer(options?: NLPExplainerOptions)
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `language` | `'en'` \| `'es'` \| `'zh'` | `'en'` | Language for explanations |
| `detailLevel` | `'brief'` \| `'normal'` \| `'detailed'` \| `'comprehensive'` | `'normal'` | Level of detail |
| `includeReasoningChain` | `boolean` | `true` | Include reasoning steps |
| `includeAuditTrail` | `boolean` | `true` | Include audit trail |
| `includeConfidenceExplanation` | `boolean` | `true` | Include confidence breakdown |
| `maxLength` | `number` | `5000` | Maximum explanation length |
| `customTerminology` | `Record<string, string>` | `{}` | Custom term translations |
| `targetAudience` | `'technical'` \| `'business'` \| `'general'` \| `'expert'` | `'general'` | Target audience |

#### Methods

##### `explain(pattern: LogicPattern, options?: NLPExplainerOptions): NLPExplanation`

Generate a complete natural language explanation for a logic pattern.

```typescript
const explanation = explainer.explain(pattern);
```

##### `explainWhy(pattern: LogicPattern): string`

Explain WHY a decision was made.

```typescript
const whyText = explainer.explainWhy(pattern);
```

##### `explainWhat(pattern: LogicPattern): string`

Explain WHAT was decided.

```typescript
const whatText = explainer.explainWhat(pattern);
```

##### `explainHow(pattern: LogicPattern): string`

Explain HOW the decision was made.

```typescript
const howText = explainer.explainHow(pattern);
```

##### `explainConfidence(score: number, factors?: ConfidenceFactor[]): ConfidenceExplanation`

Translate a confidence score to human-readable terms.

```typescript
const confidenceExpl = explainer.explainConfidence(0.85);
// { level: "high confidence", interpretation: "...", factors: [...] }
```

##### `explainDecision(decisionId, decision, reasoning, confidence, alternatives): DecisionExplanation`

Explain a specific decision with alternatives.

```typescript
const decisionExpl = explainer.explainDecision(
  'dec-1',
  'Loan Approved',
  'Credit score and income meet requirements',
  0.92,
  [
    { description: 'Manual Review', whyRejected: 'Automatic approval criteria met' }
  ]
);
```

##### `explainReasoningChain(chainId, steps): ChainExplanation`

Explain a multi-step reasoning chain.

```typescript
const chainExpl = explainer.explainReasoningChain('chain-1', [
  { premise: 'User has high credit score', conclusion: 'Low risk borrower', confidence: 0.9 },
  { premise: 'Low risk borrower', conclusion: 'Eligible for premium rates', confidence: 0.85 },
]);
```

### LogicTranslator

Translates formal logic patterns to natural language.

```typescript
import { LogicTranslator } from '@superinstance/equipment-nlp-explainer';

const translator = new LogicTranslator('en');
const description = translator.translatePattern(pattern);
```

### ConfidenceExplainer

Explains confidence scores in human terms.

```typescript
import { ConfidenceExplainer } from '@superinstance/equipment-nlp-explainer';

const explainer = new ConfidenceExplainer('en');
const explanation = explainer.explainConfidence(0.75);
// { level: "high confidence", interpretation: "...", recommendation: "..." }
```

## Confidence Level Mapping

The explainer maps numeric confidence scores to human-readable levels:

| Score Range | Level | Description |
|-------------|-------|-------------|
| 0.90 - 1.00 | Very High | Extremely certain, near-absolute certainty |
| 0.75 - 0.89 | High | Very confident, small margin of uncertainty |
| 0.60 - 0.74 | Moderate | Reasonable confidence, meaningful uncertainty |
| 0.40 - 0.59 | Low | Limited confidence, treat as suggestion |
| 0.00 - 0.39 | Very Low | Very little confidence, manual review required |

## Multi-Language Support

The equipment supports three languages out of the box:

```typescript
// English
const explainerEN = createExplainer({ language: 'en' });
const explanationEN = explainerEN.explainConfidence(0.85);
// "high confidence"

// Spanish
const explainerES = createExplainer({ language: 'es' });
const explanationES = explainerES.explainConfidence(0.85);
// "alta confianza"

// Chinese
const explainerZH = createExplainer({ language: 'zh' });
const explanationZH = explainerZH.explainConfidence(0.85);
// "高置信度"
```

### Changing Language

```typescript
explainer.setLanguage('es'); // Switch to Spanish
```

## Audit Trail Generation

Generate compliance-ready audit trails in prose form:

```typescript
const auditTrail = explainer.generateAuditTrail(pattern);

// Each entry contains:
// - id: Unique identifier
// - timestamp: When the action occurred
// - action: Type of action performed
// - actor: Who/what performed it
// - description: Human-readable description
// - result: Outcome of the action
// - confidence: Confidence at this point
```

## Integration with SuperInstance

This equipment implements the SuperInstance `Equipment` interface:

```typescript
import { NLPExplainer } from '@superinstance/equipment-nlp-explainer';
import type { Equipment } from '@superinstance/starter-agent';

const explainer: Equipment = new NLPExplainer();

// Equipment properties
console.log(explainer.name);        // 'NLPExplainer'
console.log(explainer.slot);        // 'EXPLANATION'
console.log(explainer.version);     // '1.0.0'

// Get capabilities
const description = explainer.describe();
console.log(description.whenToUse);
console.log(description.whenToRemove);

// Convert to Tile for processing
const tile = explainer.asTile();
```

## Types

### LogicPattern

```typescript
interface LogicPattern {
  id: string;
  name: string;
  type: 'decision' | 'transformation' | 'validation' | 'aggregation' | 
        'branching' | 'iteration' | 'composition' | 'fallback';
  structure: LogicStructure;
  inputs: PatternInput[];
  outputs: PatternOutput[];
  conditions: EvaluatedCondition[];
  transformations: AppliedTransformation[];
  confidence: number;
  source?: string;
}
```

### NLPExplanation

```typescript
interface NLPExplanation {
  id: string;
  language: SupportedLanguage;
  summary: string;
  details: ExplanationDetails;
  steps: ExplanationStep[];
  reasoningChain: ReasoningStep[];
  confidenceExplanation: ConfidenceExplanation;
  auditTrail: AuditTrailEntry[];
  insights: string[];
  relatedExplanations: string[];
  timestamp: number;
}
```

## Examples

### Explaining a Loan Decision

```typescript
import { createExplainer } from '@superinstance/equipment-nlp-explainer';

const explainer = createExplainer({ language: 'en' });

const pattern = {
  id: 'loan-decision',
  name: 'Loan Approval',
  type: 'decision',
  structure: { complexity: 3, stepCount: 3, isNested: false, branchingFactor: 2 },
  inputs: [
    { id: 'i1', name: 'creditScore', value: 680, type: 'number', source: 'bureau', wasUsed: true },
    { id: 'i2', name: 'income', value: 45000, type: 'number', source: 'application', wasUsed: true },
  ],
  outputs: [
    { id: 'o1', name: 'approved', value: false, type: 'boolean', isFinal: true },
    { id: 'o2', name: 'reason', value: 'Credit score below threshold', type: 'string', isFinal: true },
  ],
  conditions: [
    {
      id: 'c1',
      expression: 'creditScore >= 700',
      left: 'creditScore',
      operator: '>=',
      right: '700',
      result: false,
      reasoning: 'Credit score of 680 is below the 700 minimum requirement',
      confidence: 0.95,
    },
  ],
  transformations: [],
  confidence: 0.95,
};

const explanation = explainer.explain(pattern);

console.log(explainer.explainWhy(pattern));
// "The final decision was: false, "Credit score below threshold"
//  
//  The reason is that:
//    ✗ Credit score of 680 is below the 700 minimum requirement
//  
//  The confidence in this judgment is 95%, which is considered very high confidence."

const auditTrail = explainer.generateAuditTrail(pattern);
console.log(auditTrail);
// [
//   { action: 'input_received', description: '2 inputs were used...', ... },
//   { action: 'condition_evaluated', description: 'Credit score...', ... },
//   { action: 'output_generated', description: 'The final output...', ... }
// ]
```

### Explaining a Reasoning Chain

```typescript
const chainExplanation = explainer.explainReasoningChain('risk-analysis', [
  {
    premise: 'Customer has 5+ years of history',
    conclusion: 'Customer is established',
    evidence: ['Account created 2019', 'Consistent activity'],
    confidence: 0.92,
  },
  {
    premise: 'Customer is established',
    conclusion: 'Lower churn risk',
    evidence: ['Established customers have 15% churn vs 45% for new'],
    confidence: 0.88,
  },
  {
    premise: 'Lower churn risk',
    conclusion: 'Eligible for loyalty discount',
    evidence: ['Policy: loyalty discount for low-risk customers'],
    confidence: 0.95,
  },
]);

console.log(chainExplanation.summary);
// "Starting from 'Customer has 5+ years of history', after 3 reasoning steps, 
//  we conclude: Eligible for loyalty discount"
```

## License

MIT © SuperInstance Team
