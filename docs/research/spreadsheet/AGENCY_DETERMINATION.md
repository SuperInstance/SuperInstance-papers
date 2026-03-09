# Agency Determination - Cost-Optimized AI Decision Making

**"Not Every Problem Needs a Brain"**

---

## Executive Summary

Agency Determination is the systematic process of identifying where true AI decision-making is required versus where deterministic automation suffices. This research establishes a framework for cost optimization by using the minimum required agency level for each task.

**Key Insight**: Most spreadsheet tasks (60-80%) don't need LLMs. Functions, scripts, and rule-based bots can handle them cheaper and faster.

**Business Impact**:
- **Cost Reduction**: 10-100x savings by avoiding unnecessary LLM calls
- **Performance**: Sub-millisecond latency vs 500ms+ for LLMs
- **Reliability**: Deterministic outputs, no hallucinations
- **Transparency**: Clear logic paths, easier debugging

---

## Table of Contents

1. [Automation Spectrum](#automation-spectrum)
2. [Agency Assessment Framework](#agency-assessment-framework)
3. [Decision Point Analysis](#decision-point-analysis)
4. [Cost-Benefit Analysis](#cost-benefit-analysis)
5. [Migration Patterns](#migration-patterns)
6. [TypeScript Interfaces](#typescript-interfaces)
7. [Practical Heuristics](#practical-heuristics)
8. [Implementation Examples](#implementation-examples)

---

## Automation Spectrum

### Level 0: Function (Pure Computation)

**Characteristics**:
- Deterministic input → output
- No decision-making required
- Mathematical/logical operations
- Zero latency (nanoseconds)
- Zero API cost

**Examples**:
- `SUM(A1:A10)` - Add numbers
- `VLOOKUP` - Lookup values
- `DATE(2024, 3, 8)` - Create date
- `UPPER("text")` - String manipulation

**When to Use**:
- Problem is purely computational
- Rules are unambiguous
- No "understanding" required

**Implementation**:
```typescript
const computeSum = (values: number[]): number =>
  values.reduce((a, b) => a + b, 0);
```

---

### Level 1: Script (Automated Flow)

**Characteristics**:
- Fixed sequence of operations
- Conditional branching (if/else)
- Loop constructs
- No adaptive behavior
- Millisecond latency
- Zero API cost

**Examples**:
- "If budget > 10000, flag for review"
- "Format phone numbers as (XXX) XXX-XXXX"
- "Calculate compound interest over N periods"
- "Sort data by column A, then column B"

**When to Use**:
- Multi-step process with clear rules
- Conditions are well-defined
- No ambiguity in execution

**Implementation**:
```typescript
const processBudget = (budget: number): string => {
  if (budget > 10000) return 'FLAG_REVIEW';
  if (budget > 5000) return 'NOTICE';
  return 'OK';
};
```

---

### Level 2: Bot (Rule-Based Decision)

**Characteristics**:
- Decision tree or expert system
- Multiple decision points
- Rule prioritization
- Fallback logic
- No reasoning required
- Millisecond latency
- Zero API cost

**Examples**:
- Email spam classifier (100+ rules)
- Credit approval decision tree
- Inventory reorder logic
- Customer support routing

**When to Use**:
- Clear decision rules exist
- Rules are too complex for simple script
- No need for "understanding" context

**Implementation**:
```typescript
const classifyEmail = (email: Email): 'spam' | 'promotional' | 'primary' => {
  if (email.from.includes('@suspicious.domain')) return 'spam';
  if (email.subject.match(/unsubscribe/i)) return 'promotional';
  if (email.senderScore > 0.8) return 'primary';
  return 'primary'; // default
};
```

---

### Level 3: Simple Agent (Single LLM Decision)

**Characteristics**:
- Natural language understanding
- Context-aware decisions
- Single-shot reasoning
- Requires LLM API call
- 500ms-2s latency
- $0.0001-$0.01 per call

**Examples**:
- "Summarize this email thread"
- "Extract key dates from contract"
- "Classify customer feedback sentiment"
- "Suggest meeting times based on calendar"

**When to Use**:
- Requires understanding unstructured text
- Rules are fuzzy or context-dependent
- Single decision needed
- Cost is acceptable

**Implementation**:
```typescript
const summarizeThread = async (emails: Email[]): Promise<string> => {
  const response = await llm.complete({
    prompt: `Summarize this email thread:\n${JSON.stringify(emails)}`,
    model: 'gpt-3.5-turbo'
  });
  return response.text;
};
```

---

### Level 4: Complex Agent (Multi-Step Reasoning)

**Characteristics**:
- Multi-step reasoning chains
- Tool use (API calls, calculations)
- Self-correction/refinement
- Memory/context tracking
- 2-10s latency
- $0.01-$0.10 per task

**Examples**:
- "Research competitor pricing and recommend strategy"
- "Analyze financial data and write report"
- "Debug failing code and suggest fixes"
- "Plan project timeline with dependencies"

**When to Use**:
- Requires deep reasoning
- Multiple sub-tasks needed
- Tool use required
- High value justifies cost

**Implementation**:
```typescript
const analyzeStrategy = async (company: string): Promise<Report> => {
  const research = await researchAgent({ company });
  const pricing = await pricingAgent({ company });
  const analysis = await reasoningAgent({ research, pricing });
  return writeReport(analysis);
};
```

---

## Agency Assessment Framework

### Assessment Questions

For each task, answer these questions:

#### 1. Is the Problem Deterministic?

**Yes** → Use Function or Script
```typescript
// Deterministic: Clear formula
const tax = (income: number): number => income * 0.25;
```

**No** → Continue to question 2

---

#### 2. Are Clear Rules Available?

**Yes** → Use Bot (Rule-Based)
```typescript
// Clear rules: Decision tree
const approveLoan = (app: Application): boolean => {
  if (app.creditScore < 650) return false;
  if (app.debtToIncome > 0.4) return false;
  if (app.income < 30000) return false;
  return true;
};
```

**No** → Continue to question 3

---

#### 3. Does It Require Understanding?

**No** → Use Script with fuzzy matching
```typescript
// Fuzzy but not requiring understanding
const normalizeCategory = (text: string): string => {
  const patterns = [
    [/software/i, 'Software'],
    [/hardware/i, 'Hardware'],
    [/service/i, 'Service']
  ];
  for (const [pattern, category] of patterns) {
    if (pattern.test(text)) return category;
  }
  return 'Other';
};
```

**Yes** → Continue to question 4

---

#### 4. Is It a Single Decision?

**Yes** → Use Simple Agent
```typescript
// Single LLM call
const classifySentiment = async (text: string): Promise<'positive' | 'negative' | 'neutral'> => {
  const response = await llm.classify(text, ['positive', 'negative', 'neutral']);
  return response.label;
};
```

**No** → Use Complex Agent

---

### Decision Tree

```
START
  │
  ├─ Deterministic problem?
  │   ├─ YES → Function (Level 0)
  │   └─ NO → Clear rules exist?
  │       ├─ YES → Bot (Level 2)
  │       └─ NO → Requires understanding?
  │           ├─ NO → Script (Level 1)
  │           └─ YES → Single decision?
  │               ├─ YES → Simple Agent (Level 3)
  │               └─ NO → Complex Agent (Level 4)
```

---

## Decision Point Analysis

### Identifying Decision Points

A decision point is any location in a workflow where a choice must be made. Not all decision points require AI.

#### Types of Decision Points

| Type | Example | Agency Required |
|------|---------|-----------------|
| **Calculation** | `A + B * C` | Function (0) |
| **Lookup** | Find price in table | Function (0) |
| **Validation** | Is email format valid? | Script (1) |
| **Routing** | Send to department X | Bot (2) |
| **Classification** | Spam vs not spam | Bot (2) or Agent (3) |
| **Extraction** | Extract dates from text | Simple Agent (3) |
| **Generation** | Write email draft | Simple Agent (3) |
| **Analysis** | Analyze trends in data | Complex Agent (4) |
| **Planning** | Create project timeline | Complex Agent (4) |

#### Decision Point Complexity

**Low Complexity** (Script or Bot):
- Clear if/else logic
- Boolean decisions
- Enumerated outcomes
- Single input variable

**Medium Complexity** (Simple Agent):
- Fuzzy classification
- Context-dependent
- Text understanding
- Single decision

**High Complexity** (Complex Agent):
- Multi-step reasoning
- Tool orchestration
- Planning/optimization
- Iterative refinement

---

## Cost-Benefit Analysis

### Cost Comparison (Per 1000 Operations)

| Level | Latency | API Cost | Compute Cost | Total Cost |
|-------|---------|----------|--------------|------------|
| **Function** | <1ms | $0 | $0.000001 | **$0.001** |
| **Script** | 1-10ms | $0 | $0.00001 | **$0.01** |
| **Bot** | 10-100ms | $0 | $0.0001 | **$0.10** |
| **Simple Agent** | 500ms-2s | $1.00 | $0.001 | **$1.00** |
| **Complex Agent** | 2-10s | $10.00 | $0.01 | **$10.00** |

**Cost Multiplier**: Simple Agent is **1000x** more expensive than a Bot.

### Benefit Analysis

| Factor | Function | Script | Bot | Agent |
|--------|----------|--------|-----|-------|
| **Reliability** | 100% | 100% | 95% | 80-95% |
| **Transparency** | Perfect | Perfect | Good | Medium |
| **Maintainability** | High | High | Medium | Low |
| **Flexibility** | None | Low | Medium | High |
| **Capability** | Narrow | Medium | Broad | Very Broad |

### ROI Calculation

```
ROI = (Benefit - Cost) / Cost

Where:
- Benefit = Value of correct decision
- Cost = API + compute + latency cost

Example:
- Task: Classify 10,000 emails
- Value per correct classification: $0.01
- Bot accuracy: 95% ($95 value)
- Agent accuracy: 98% ($98 value)

Bot ROI: ($95 - $0.10) / $0.10 = 94,900%
Agent ROI: ($98 - $1.00) / $1.00 = 9,700%

Winner: Bot (higher ROI despite lower accuracy)
```

---

## Migration Patterns

### Upgrade Path

#### Function → Script

**Trigger**: Multi-step process needed

```typescript
// BEFORE: Function
const formatDate = (date: Date): string =>
  date.toISOString().split('T')[0];

// AFTER: Script with validation
const formatDate = (date: Date): string => {
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  const iso = date.toISOString().split('T')[0];
  if (iso < '2000-01-01') {
    throw new Error('Date too far in past');
  }
  return iso;
};
```

---

#### Script → Bot

**Trigger**: Rules become too complex for if/else

```typescript
// BEFORE: Script (nested if/else)
const classifyCustomer = (customer: Customer): string => {
  if (customer.purchases > 100) {
    if (customer.returnRate < 0.1) {
      if (customer.avgOrderValue > 500) {
        return 'VIP';
      }
    }
  }
  // ... 100 more lines
  return 'Regular';
};

// AFTER: Bot (rule engine)
const rules: Rule[] = [
  {
    condition: (c) => c.purchases > 100 && c.returnRate < 0.1 && c.avgOrderValue > 500,
    action: () => 'VIP'
  },
  {
    condition: (c) => c.purchases > 50,
    action: () => 'Loyal'
  },
  // ... clear, maintainable rules
];

const classifyCustomer = (customer: Customer): string =>
  rules.find(r => r.condition(customer))?.action() || 'Regular';
```

---

#### Bot → Simple Agent

**Trigger**: Rules become fuzzy or context-dependent

```typescript
// BEFORE: Bot (rigid rules)
const categorizeTicket = (ticket: Ticket): string => {
  if (ticket.subject.includes('login')) return 'Authentication';
  if (ticket.subject.includes('slow')) return 'Performance';
  if (ticket.subject.includes('error')) return 'Bug';
  return 'Other';
};

// AFTER: Simple Agent (understanding)
const categorizeTicket = async (ticket: Ticket): Promise<string> => {
  const response = await llm.classify(ticket.description, [
    'Authentication',
    'Performance',
    'Bug',
    'Feature Request',
    'Other'
  ]);
  return response.label;
};
```

---

#### Simple Agent → Complex Agent

**Trigger**: Multi-step reasoning needed

```typescript
// BEFORE: Simple Agent (one-shot)
const analyzeTicket = async (ticket: Ticket): Promise<string> => {
  const response = await llm.complete({
    prompt: `Analyze this support ticket and suggest a fix:\n${ticket.description}`,
    model: 'gpt-3.5-turbo'
  });
  return response.text;
};

// AFTER: Complex Agent (multi-step)
const analyzeTicket = async (ticket: Ticket): Promise<Solution> => {
  // Step 1: Categorize
  const category = await categorizeAgent(ticket);

  // Step 2: Research similar issues
  const similar = await searchAgent({ category, keywords: ticket.keywords });

  // Step 3: Generate solution
  const solution = await generateAgent({ ticket, similar });

  // Step 4: Validate
  const validation = await validateAgent({ solution, ticket });

  return validation.approved ? solution : await refine(solution, validation);
};
```

---

### Downgrade Path (Cost Optimization)

**When to Downgrade**:
- Analysis shows over-engineering
- Cost exceeds value
- Rules become clear over time
- Performance requirements tighten

#### Agent → Bot

**Pattern**: Extract rules from agent behavior

```typescript
// STEP 1: Log agent decisions
const agentDecisions: Decision[] = [];

const classifyWithAgent = async (input: string): Promise<string> => {
  const result = await agent.classify(input);
  agentDecisions.push({ input, result, timestamp: Date.now() });
  return result;
};

// STEP 2: Analyze patterns after 1000+ decisions
const extractRules = (decisions: Decision[]): Rule[] => {
  // Use decision tree induction or manual analysis
  return [
    { condition: /password/i, action: 'Authentication' },
    { condition: /crash/i, action: 'Bug' },
    // ... discovered patterns
  ];
};

// STEP 3: Replace with bot
const classifyWithBot = (input: string): string => {
  const rules = extractRules(agentDecisions);
  for (const rule of rules) {
    if (rule.condition.test(input)) return rule.action;
  }
  return 'Other'; // fallback to agent for unknown
};
```

---

## TypeScript Interfaces

### Core Interfaces

```typescript
/**
 * Automation levels from function to complex agent
 */
enum AutomationLevel {
  FUNCTION = 0,      // Pure computation
  SCRIPT = 1,        // Automated flow
  BOT = 2,           // Rule-based
  SIMPLE_AGENT = 3,  // Single LLM call
  COMPLEX_AGENT = 4  // Multi-step reasoning
}

/**
 * Task assessment result
 */
interface TaskAssessment {
  taskId: string;
  description: string;
  recommendedLevel: AutomationLevel;
  confidence: number;
  reasoning: string;
  estimatedCost: number;
  estimatedLatency: number;
  alternativeLevels: AutomationLevel[];
}

/**
 * Decision point analysis
 */
interface DecisionPoint {
  id: string;
  location: string; // e.g., "cell B5"
  decisionType: 'calculation' | 'lookup' | 'validation' | 'routing' |
                'classification' | 'extraction' | 'generation' | 'analysis' | 'planning';
  complexity: 'low' | 'medium' | 'high';
  currentLevel: AutomationLevel;
  recommendedLevel: AutomationLevel;
  roi: number;
}

/**
 * Cost-benefit analysis
 */
interface CostBenefitAnalysis {
  taskDescription: string;
  levels: {
    level: AutomationLevel;
    implementationCost: number;
    perOperationCost: number;
    expectedAccuracy: number;
    developmentTime: number;
    maintenanceBurden: 'low' | 'medium' | 'high';
  }[];
  recommended: {
    level: AutomationLevel;
    roi: number;
    paybackPeriod: number; // in operations
  };
}
```

---

### Agency Analyzer

```typescript
/**
 * AgencyAnalyzer - Assess where agency is needed
 *
 * Analyzes tasks and recommends minimum automation level
 */
class AgencyAnalyzer {
  private assessments: Map<string, TaskAssessment> = new Map();

  /**
   * Assess a task and recommend automation level
   */
  async assess(task: {
    description: string;
    examples: Array<{ input: unknown; output: unknown }>;
    constraints: {
      maxLatency?: number;
      maxCost?: number;
      minAccuracy?: number;
    };
  }): Promise<TaskAssessment> {
    const taskId = this.generateId(task.description);

    // Step 1: Check if deterministic
    const deterministic = this.checkDeterministic(task.examples);
    if (deterministic.isDeterministic) {
      return {
        taskId,
        description: task.description,
        recommendedLevel: AutomationLevel.FUNCTION,
        confidence: 0.95,
        reasoning: deterministic.reasoning,
        estimatedCost: 0.000001,
        estimatedLatency: 0.001,
        alternativeLevels: [AutomationLevel.SCRIPT]
      };
    }

    // Step 2: Check for clear rules
    const rules = this.extractRules(task.examples);
    if (rules.confidence > 0.8) {
      return {
        taskId,
        description: task.description,
        recommendedLevel: AutomationLevel.BOT,
        confidence: rules.confidence,
        reasoning: `Clear rules identified: ${rules.rules.join(', ')}`,
        estimatedCost: 0.0001,
        estimatedLatency: 0.05,
        alternativeLevels: [AutomationLevel.SCRIPT, AutomationLevel.SIMPLE_AGENT]
      };
    }

    // Step 3: Check if understanding required
    const understanding = this.requiresUnderstanding(task.description, task.examples);
    if (!understanding.required) {
      return {
        taskId,
        description: task.description,
        recommendedLevel: AutomationLevel.SCRIPT,
        confidence: 0.8,
        reasoning: 'No deep understanding required, fuzzy matching sufficient',
        estimatedCost: 0.00001,
        estimatedLatency: 0.01,
        alternativeLevels: [AutomationLevel.BOT]
      };
    }

    // Step 4: Determine agent complexity
    const complexity = this.assessComplexity(task.description, task.examples);
    if (complexity.singleDecision) {
      return {
        taskId,
        description: task.description,
        recommendedLevel: AutomationLevel.SIMPLE_AGENT,
        confidence: 0.85,
        reasoning: 'Requires understanding but single decision point',
        estimatedCost: 0.001,
        estimatedLatency: 1.0,
        alternativeLevels: [AutomationLevel.BOT, AutomationLevel.COMPLEX_AGENT]
      };
    }

    return {
      taskId,
      description: task.description,
      recommendedLevel: AutomationLevel.COMPLEX_AGENT,
      confidence: 0.9,
      reasoning: 'Multi-step reasoning with tool use required',
      estimatedCost: 0.01,
      estimatedLatency: 5.0,
      alternativeLevels: [AutomationLevel.SIMPLE_AGENT]
    };
  }

  /**
   * Check if task is deterministic (same input always gives same output)
   */
  private checkDeterministic(
    examples: Array<{ input: unknown; output: unknown }>
  ): { isDeterministic: boolean; reasoning: string } {
    // Group by input and check if outputs are consistent
    const inputGroups = new Map<string, unknown[]>();

    for (const example of examples) {
      const key = JSON.stringify(example.input);
      if (!inputGroups.has(key)) {
        inputGroups.set(key, []);
      }
      inputGroups.get(key)!.push(example.output);
    }

    // If all inputs map to consistent outputs, it's deterministic
    for (const [input, outputs] of inputGroups) {
      const firstOutput = JSON.stringify(outputs[0]);
      const allSame = outputs.every(o => JSON.stringify(o) === firstOutput);
      if (!allSame) {
        return {
          isDeterministic: false,
          reasoning: 'Input-output mapping is not consistent'
        };
      }
    }

    return {
      isDeterministic: true,
      reasoning: 'Consistent input-output mapping detected'
    };
  }

  /**
   * Extract clear rules from examples
   */
  private extractRules(
    examples: Array<{ input: unknown; output: unknown }>
  ): { rules: string[]; confidence: number } {
    // Use decision tree induction or pattern matching
    // Simplified implementation
    const rules: string[] = [];

    // Look for keyword patterns
    for (const example of examples) {
      if (typeof example.input === 'string' && typeof example.output === 'string') {
        if (example.input.toLowerCase().includes(example.output.toLowerCase())) {
          rules.push(`Input contains "${example.output}"`);
        }
      }
    }

    return {
      rules,
      confidence: rules.length > 0 ? 0.9 : 0
    };
  }

  /**
   * Check if task requires semantic understanding
   */
  private requiresUnderstanding(
    description: string,
    examples: Array<{ input: unknown; output: unknown }>
  ): { required: boolean; reasoning: string } {
    const understandingIndicators = [
      'summarize', 'analyze', 'interpret', 'understand',
      'extract meaning', 'sentiment', 'intent', 'nuance'
    ];

    const hasUnderstandingKeywords = understandingIndicators.some(keyword =>
      description.toLowerCase().includes(keyword)
    );

    if (hasUnderstandingKeywords) {
      return {
        required: true,
        reasoning: 'Description indicates semantic understanding needed'
      };
    }

    // Check if examples show complex patterns
    const hasComplexPatterns = examples.some(ex =>
      typeof ex.input === 'string' && ex.input.length > 100
    );

    return {
      required: hasComplexPatterns,
      reasoning: hasComplexPatterns ?
        'Complex text patterns detected' :
        'No clear understanding requirement'
    };
  }

  /**
   * Assess if task requires multi-step reasoning
   */
  private assessComplexity(
    description: string,
    examples: Array<{ input: unknown; output: unknown }>
  ): { singleDecision: boolean; reasoning: string } {
    const multiStepIndicators = [
      'then', 'after that', 'finally', 'multi-step',
      'sequence', 'workflow', 'pipeline', 'orchestrate'
    ];

    const hasMultiStepKeywords = multiStepIndicators.some(keyword =>
      description.toLowerCase().includes(keyword)
    );

    return {
      singleDecision: !hasMultiStepKeywords,
      reasoning: hasMultiStepKeywords ?
        'Multi-step process indicated' :
        'Appears to be single decision'
    };
  }

  private generateId(description: string): string {
    return `task-${description.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
  }
}
```

---

### Decision Point Analyzer

```typescript
/**
 * DecisionPointAnalyzer - Find AI-requiring decisions
 *
 * Identifies all decision points in a workflow and analyzes their requirements
 */
class DecisionPointAnalyzer {
  /**
   * Analyze a workflow and identify decision points
   */
  async analyzeWorkflow(workflow: {
    name: string;
    steps: Array<{
      id: string;
      description: string;
      input: unknown;
      output: unknown;
    }>;
  }): Promise<DecisionPoint[]> {
    const decisionPoints: DecisionPoint[] = [];

    for (const step of workflow.steps) {
      const analysis = await this.analyzeStep(step);
      decisionPoints.push(analysis);
    }

    return decisionPoints;
  }

  /**
   * Analyze a single workflow step
   */
  private async analyzeStep(step: {
    id: string;
    description: string;
    input: unknown;
    output: unknown;
  }): Promise<DecisionPoint> {
    // Determine decision type
    const decisionType = this.classifyDecisionType(step);

    // Assess complexity
    const complexity = this.assessComplexity(step);

    // Recommend automation level
    const currentLevel = this.guessCurrentLevel(step);
    const recommendedLevel = this.recommendLevel(decisionType, complexity);

    // Calculate ROI
    const roi = this.calculateROI(decisionType, complexity, currentLevel, recommendedLevel);

    return {
      id: step.id,
      location: step.id,
      decisionType,
      complexity,
      currentLevel,
      recommendedLevel,
      roi
    };
  }

  /**
   * Classify the type of decision
   */
  private classifyDecisionType(step: {
    description: string;
    input: unknown;
    output: unknown;
  }): DecisionPoint['decisionType'] {
    const desc = step.description.toLowerCase();

    if (desc.includes('calculate') || desc.includes('compute') || desc.includes('sum')) {
      return 'calculation';
    }
    if (desc.includes('find') || desc.includes('lookup') || desc.includes('search')) {
      return 'lookup';
    }
    if (desc.includes('validate') || desc.includes('check') || desc.includes('verify')) {
      return 'validation';
    }
    if (desc.includes('route') || desc.includes('assign') || desc.includes('distribute')) {
      return 'routing';
    }
    if (desc.includes('classify') || desc.includes('categorize') || desc.includes('group')) {
      return 'classification';
    }
    if (desc.includes('extract') || desc.includes('parse') || desc.includes('identify')) {
      return 'extraction';
    }
    if (desc.includes('generate') || desc.includes('create') || desc.includes('write')) {
      return 'generation';
    }
    if (desc.includes('analyze') || desc.includes('investigate') || desc.includes('evaluate')) {
      return 'analysis';
    }
    if (desc.includes('plan') || desc.includes('schedule') || desc.includes('optimize')) {
      return 'planning';
    }

    // Default based on input/output types
    if (typeof step.input === 'string' && typeof step.output === 'string') {
      return 'generation';
    }

    return 'calculation';
  }

  /**
   * Assess complexity of decision
   */
  private assessComplexity(step: {
    description: string;
    input: unknown;
    output: unknown;
  }): 'low' | 'medium' | 'high' {
    const desc = step.description;

    // High complexity indicators
    if (desc.includes('complex') || desc.includes('multi-step') || desc.includes('reasoning')) {
      return 'high';
    }

    // Medium complexity indicators
    if (desc.includes('analyze') || desc.includes('evaluate') || desc.includes('understand')) {
      return 'medium';
    }

    // Low complexity (default)
    return 'low';
  }

  /**
   * Guess current automation level from implementation
   */
  private guessCurrentLevel(step: { description: string }): AutomationLevel {
    // This would analyze actual code in production
    // Simplified version based on description keywords
    const desc = step.description.toLowerCase();

    if (desc.includes('llm') || desc.includes('gpt') || desc.includes('ai')) {
      return desc.includes('multi') ? AutomationLevel.COMPLEX_AGENT : AutomationLevel.SIMPLE_AGENT;
    }
    if (desc.includes('rule') || desc.includes('decision tree')) {
      return AutomationLevel.BOT;
    }
    if (desc.includes('script') || desc.includes('automate')) {
      return AutomationLevel.SCRIPT;
    }

    return AutomationLevel.FUNCTION;
  }

  /**
   * Recommend automation level based on decision type and complexity
   */
  private recommendLevel(
    decisionType: DecisionPoint['decisionType'],
    complexity: 'low' | 'medium' | 'high'
  ): AutomationLevel {
    const levelMap: Record<DecisionPoint['decisionType'], Record<'low' | 'medium' | 'high', AutomationLevel>> = {
      calculation: { low: 0, medium: 0, high: 1 },  // FUNCTION or SCRIPT
      lookup: { low: 0, medium: 0, high: 0 },       // FUNCTION
      validation: { low: 1, medium: 1, high: 2 },   // SCRIPT or BOT
      routing: { low: 1, medium: 2, high: 2 },      // SCRIPT or BOT
      classification: { low: 2, medium: 2, high: 3 }, // BOT or SIMPLE_AGENT
      extraction: { low: 1, medium: 3, high: 3 },   // SCRIPT or SIMPLE_AGENT
      generation: { low: 3, medium: 3, high: 4 },   // SIMPLE_AGENT or COMPLEX_AGENT
      analysis: { low: 3, medium: 3, high: 4 },     // SIMPLE_AGENT or COMPLEX_AGENT
      planning: { low: 3, medium: 4, high: 4 }      // SIMPLE_AGENT or COMPLEX_AGENT
    };

    return levelMap[decisionType][complexity];
  }

  /**
   * Calculate ROI of upgrading to recommended level
   */
  private calculateROI(
    decisionType: DecisionPoint['decisionType'],
    complexity: 'low' | 'medium' | 'high',
    currentLevel: AutomationLevel,
    recommendedLevel: AutomationLevel
  ): number {
    // Simplified ROI calculation
    if (currentLevel === recommendedLevel) {
      return 1.0; // No change needed
    }

    // Cost difference (negative means cheaper)
    const costPerOp: Record<AutomationLevel, number> = {
      [AutomationLevel.FUNCTION]: 0.000001,
      [AutomationLevel.SCRIPT]: 0.00001,
      [AutomationLevel.BOT]: 0.0001,
      [AutomationLevel.SIMPLE_AGENT]: 0.001,
      [AutomationLevel.COMPLEX_AGENT]: 0.01
    };

    const currentCost = costPerOp[currentLevel];
    const recommendedCost = costPerOp[recommendedLevel];

    // Value improvement from upgrade
    const accuracyImprovement = this.estimateAccuracyGain(currentLevel, recommendedLevel);
    const valuePerAccuracyPoint = 0.01; // $0.01 per % accuracy
    const valueGain = accuracyImprovement * valuePerAccuracyPoint;

    return (valueGain - (recommendedCost - currentCost)) / recommendedCost;
  }

  /**
   * Estimate accuracy improvement from upgrading
   */
  private estimateAccuracyGain(current: AutomationLevel, recommended: AutomationLevel): number {
    // Accuracy estimates per level
    const accuracy: Record<AutomationLevel, number> = {
      [AutomationLevel.FUNCTION]: 100,
      [AutomationLevel.SCRIPT]: 100,
      [AutomationLevel.BOT]: 95,
      [AutomationLevel.SIMPLE_AGENT]: 90,
      [AutomationLevel.COMPLEX_AGENT]: 95
    };

    return accuracy[recommended] - accuracy[current];
  }
}
```

---

### Cost-Benefit Analyzer

```typescript
/**
 * CostBenefitAnalyzer - AI vs automation comparison
 *
 * Compares different automation approaches for cost-effectiveness
 */
class CostBenefitAnalyzer {
  /**
   * Perform comprehensive cost-benefit analysis
   */
  async analyze(task: {
    description: string;
    examples: Array<{ input: unknown; output: unknown }>;
    expectedVolume: number; // operations per month
    valuePerCorrectResult: number;
  }): Promise<CostBenefitAnalysis> {
    const levels: CostBenefitAnalysis['levels'] = [
      await this.analyzeLevel(AutomationLevel.FUNCTION, task),
      await this.analyzeLevel(AutomationLevel.SCRIPT, task),
      await this.analyzeLevel(AutomationLevel.BOT, task),
      await this.analyzeLevel(AutomationLevel.SIMPLE_AGENT, task),
      await this.analyzeLevel(AutomationLevel.COMPLEX_AGENT, task)
    ];

    // Find best ROI
    const recommended = this.findBestRecommendation(levels, task);

    return {
      taskDescription: task.description,
      levels,
      recommended
    };
  }

  /**
   * Analyze specific automation level
   */
  private async analyzeLevel(
    level: AutomationLevel,
    task: { description: string; examples: Array<{ input: unknown; output: unknown }> }
  ): Promise<CostBenefitAnalysis['levels'][0]> {
    const characteristics = this.getLevelCharacteristics(level);

    // Estimate development time based on complexity
    const developmentTime = this.estimateDevelopmentTime(level, task);

    // Estimate accuracy based on examples
    const expectedAccuracy = this.estimateAccuracy(level, task.examples);

    return {
      level,
      implementationCost: developmentTime * characteristics.hourlyRate,
      perOperationCost: characteristics.perOpCost,
      expectedAccuracy,
      developmentTime,
      maintenanceBurden: characteristics.maintenance
    };
  }

  /**
   * Get cost/complexity characteristics for each level
   */
  private getLevelCharacteristics(level: AutomationLevel): {
    perOpCost: number;
    hourlyRate: number;
    maintenance: 'low' | 'medium' | 'high';
  } {
    const characteristics: Record<AutomationLevel, {
      perOpCost: number;
      hourlyRate: number;
      maintenance: 'low' | 'medium' | 'high';
    }> = {
      [AutomationLevel.FUNCTION]: {
        perOpCost: 0.000001,
        hourlyRate: 50,
        maintenance: 'low'
      },
      [AutomationLevel.SCRIPT]: {
        perOpCost: 0.00001,
        hourlyRate: 75,
        maintenance: 'low'
      },
      [AutomationLevel.BOT]: {
        perOpCost: 0.0001,
        hourlyRate: 100,
        maintenance: 'medium'
      },
      [AutomationLevel.SIMPLE_AGENT]: {
        perOpCost: 0.001,
        hourlyRate: 50,
        maintenance: 'low'
      },
      [AutomationLevel.COMPLEX_AGENT]: {
        perOpCost: 0.01,
        hourlyRate: 150,
        maintenance: 'high'
      }
    };

    return characteristics[level];
  }

  /**
   * Estimate development time in hours
   */
  private estimateDevelopmentTime(
    level: AutomationLevel,
    task: { description: string; examples: Array<{ input: unknown; output: unknown }> }
  ): number {
    const baseTimes: Record<AutomationLevel, number> = {
      [AutomationLevel.FUNCTION]: 0.5,
      [AutomationLevel.SCRIPT]: 2,
      [AutomationLevel.BOT]: 8,
      [AutomationLevel.SIMPLE_AGENT]: 1,
      [AutomationLevel.COMPLEX_AGENT]: 16
    };

    const complexityMultiplier = this.assessTaskComplexity(task.description);
    return baseTimes[level] * complexityMultiplier;
  }

  /**
   * Estimate accuracy for a given level
   */
  private estimateAccuracy(
    level: AutomationLevel,
    examples: Array<{ input: unknown; output: unknown }>
  ): number {
    // Base accuracy by level
    const baseAccuracy: Record<AutomationLevel, number> = {
      [AutomationLevel.FUNCTION]: 100,
      [AutomationLevel.SCRIPT]: 100,
      [AutomationLevel.BOT]: 95,
      [AutomationLevel.SIMPLE_AGENT]: 90,
      [AutomationLevel.COMPLEX_AGENT]: 95
    };

    return baseAccuracy[level];
  }

  /**
   * Assess task complexity for time estimation
   */
  private assessTaskComplexity(description: string): number {
    const complexityKeywords = {
      low: ['simple', 'basic', 'straightforward'],
      medium: ['moderate', 'intermediate'],
      high: ['complex', 'intricate', 'sophisticated']
    };

    const desc = description.toLowerCase();

    if (complexityKeywords.low.some(k => desc.includes(k))) return 0.5;
    if (complexityKeywords.medium.some(k => desc.includes(k))) return 1.0;
    if (complexityKeywords.high.some(k => desc.includes(k))) return 2.0;

    return 1.0; // default
  }

  /**
   * Find best recommendation based on ROI
   */
  private findBestRecommendation(
    levels: CostBenefitAnalysis['levels'],
    task: { expectedVolume: number; valuePerCorrectResult: number }
  ): CostBenefitAnalysis['recommended'] {
    let bestROI = -Infinity;
    let bestLevel = levels[0];
    let bestPayback = Infinity;

    for (const level of levels) {
      // Calculate total monthly value
      const monthlyValue = task.expectedVolume * (level.expectedAccuracy / 100) * task.valuePerCorrectResult;

      // Calculate total monthly cost
      const monthlyOpCost = task.expectedVolume * level.perOperationCost;
      const monthlyTotalCost = monthlyOpCost + (level.implementationCost / 12); // amortize implementation

      // Calculate ROI
      const roi = (monthlyValue - monthlyTotalCost) / monthlyTotalCost;

      // Calculate payback period (in operations)
      const payback = level.implementationCost / (monthlyOpCost > 0 ? monthlyOpCost : 0.000001);

      if (roi > bestROI || (roi === bestROI && payback < bestPayback)) {
        bestROI = roi;
        bestLevel = level;
        bestPayback = payback;
      }
    }

    return {
      level: bestLevel.level,
      roi: bestROI,
      paybackPeriod: bestPayback
    };
  }
}
```

---

### Migration Planner

```typescript
/**
 * MigrationPlanner - Conversion strategies
 *
 * Plans migrations between automation levels
 */
class MigrationPlanner {
  /**
   * Plan upgrade or downgrade path
   */
  planMigration(from: AutomationLevel, to: AutomationLevel): {
    steps: Array<{
      description: string;
      estimatedTime: number;
      risks: string[];
      validation: string;
    }>;
    totalEstimatedTime: number;
    rollbackPlan: string;
  } {
    if (from === to) {
      return {
        steps: [{ description: 'No change needed', estimatedTime: 0, risks: [], validation: 'N/A' }],
        totalEstimatedTime: 0,
        rollbackPlan: 'N/A'
      };
    }

    const isUpgrade = to > from;

    if (isUpgrade) {
      return this.planUpgrade(from, to);
    } else {
      return this.planDowngrade(from, to);
    }
  }

  /**
   * Plan upgrade path (increasing agency)
   */
  private planUpgrade(from: AutomationLevel, to: AutomationLevel) {
    const upgradePaths: Record<number, {
      steps: Array<{ description: string; estimatedTime: number; risks: string[]; validation: string }>;
      totalEstimatedTime: number;
      rollbackPlan: string;
    }> = {
      // Function → Script
      [0 * 10 + 1]: {
        steps: [
          {
            description: 'Add input validation to function',
            estimatedTime: 1,
            risks: ['Breaking existing callers'],
            validation: 'Unit tests for validation logic'
          },
          {
            description: 'Add conditional branching',
            estimatedTime: 2,
            risks: ['Logic errors in branches'],
            validation: 'Test all code paths'
          },
          {
            description: 'Add error handling',
            estimatedTime: 1,
            risks: ['Incomplete error coverage'],
            validation: 'Error scenario tests'
          }
        ],
        totalEstimatedTime: 4,
        rollbackPlan: 'Revert to simple function, remove validation/branching'
      },

      // Script → Bot
      [1 * 10 + 2]: {
        steps: [
          {
            description: 'Extract decision rules from script',
            estimatedTime: 4,
            risks: ['Missing edge cases'],
            validation: 'Compare outputs on historical data'
          },
          {
            description: 'Implement rule engine',
            estimatedTime: 8,
            risks: ['Rule conflicts', 'Priority ordering'],
            validation: 'Rule consistency tests'
          },
          {
            description: 'Add rule management interface',
            estimatedTime: 4,
            risks: ['UI usability'],
            validation: 'User acceptance testing'
          }
        ],
        totalEstimatedTime: 16,
        rollbackPlan: 'Keep script as fallback, disable rule engine'
      },

      // Bot → Simple Agent
      [2 * 10 + 3]: {
        steps: [
          {
            description: 'Set up LLM API integration',
            estimatedTime: 2,
            risks: ['API rate limits', 'Authentication'],
            validation: 'API connectivity tests'
          },
          {
            description: 'Design prompt template',
            estimatedTime: 4,
            risks: ['Prompt injection', 'Ambiguous outputs'],
            validation: 'Test on diverse inputs'
          },
          {
            description: 'Implement fallback to bot for low confidence',
            estimatedTime: 3,
            risks: ['Confidence threshold calibration'],
            validation: 'A/B test vs bot-only'
          },
          {
            description: 'Monitor costs and accuracy',
            estimatedTime: 2,
            risks: ['Cost overruns'],
            validation: 'Set up cost alerts'
          }
        ],
        totalEstimatedTime: 11,
        rollbackPlan: 'Feature flag to revert to bot-only'
      },

      // Simple Agent → Complex Agent
      [3 * 10 + 4]: {
        steps: [
          {
            description: 'Decompose task into sub-tasks',
            estimatedTime: 8,
            risks: ['Incorrect decomposition'],
            validation: 'Review decomposition with domain expert'
          },
          {
            description: 'Implement sub-task orchestration',
            estimatedTime: 16,
            risks: ['Error propagation', 'Timeout handling'],
            validation: 'Integration tests'
          },
          {
            description: 'Add tool integrations (search, calc, etc.)',
            estimatedTime: 8,
            risks: ['Tool failures', 'Invalid outputs'],
            validation: 'Tool output validation'
          },
          {
            description: 'Implement memory/context tracking',
            estimatedTime: 8,
            risks: ['Context overflow', 'Memory leaks'],
            validation: 'Stress tests with long conversations'
          },
          {
            description: 'Add self-correction loop',
            estimatedTime: 8,
            risks: ['Infinite loops', 'Over-correction'],
            validation: 'Test with known incorrect outputs'
          }
        ],
        totalEstimatedTime: 48,
        rollbackPlan: 'Simplify to single-shot agent, remove orchestration'
      }
    };

    return upgradePaths[from * 10 + to] || {
      steps: [{ description: 'Custom migration required', estimatedTime: 0, risks: ['Unknown'], validation: 'N/A' }],
      totalEstimatedTime: 0,
      rollbackPlan: 'Manual review required'
    };
  }

  /**
   * Plan downgrade path (decreasing agency for cost optimization)
   */
  private planDowngrade(from: AutomationLevel, to: AutomationLevel) {
    const downgradePaths: Record<number, {
      steps: Array<{ description: string; estimatedTime: number; risks: string[]; validation: string }>;
      totalEstimatedTime: number;
      rollbackPlan: string;
    }> = {
      // Simple Agent → Bot
      [3 * 10 + 2]: {
        steps: [
          {
            description: 'Log agent decisions for 1-2 weeks',
            estimatedTime: 168, // 1 week of data collection
            risks: ['Insufficient data volume'],
            validation: 'Collect at least 1000 samples'
          },
          {
            description: 'Analyze decision patterns',
            estimatedTime: 8,
            risks: ['Missing edge cases'],
            validation: 'Pattern validation with domain expert'
          },
          {
            description: 'Extract decision rules',
            estimatedTime: 8,
            risks: ['Overfitting to training data'],
            validation: 'Test on held-out data'
          },
          {
            description: 'Implement bot with extracted rules',
            estimatedTime: 8,
            risks: ['Logic bugs'],
            validation: 'Parity tests with agent'
          },
          {
            description: 'A/B test bot vs agent',
            estimatedTime: 40, // 1 week of testing
            risks: ['Accuracy degradation'],
            validation: 'Statistical significance test'
          }
        ],
        totalEstimatedTime: 232,
        rollbackPlan: 'Keep agent as fallback, enable if accuracy drops'
      },

      // Bot → Script
      [2 * 10 + 1]: {
        steps: [
          {
            description: 'Simplify rule engine to conditional logic',
            estimatedTime: 4,
            risks: ['Losing rule flexibility'],
            validation: 'Test all rule paths'
          },
          {
            description: 'Remove rule management interface',
            estimatedTime: 2,
            risks: ['Breaking dependencies'],
            validation: 'Integration tests'
          },
          {
            description: 'Hard-code common decision paths',
            estimatedTime: 4,
            risks: ['Hard-coded bugs'],
            validation: 'Code review + tests'
          }
        ],
        totalEstimatedTime: 10,
        rollbackPlan: 'Keep rule engine in config, can re-enable'
      }
    };

    return downgradePaths[from * 10 + to] || {
      steps: [{ description: 'Custom migration required', estimatedTime: 0, risks: ['Unknown'], validation: 'N/A' }],
      totalEstimatedTime: 0,
      rollbackPlan: 'Manual review required'
    };
  }

  /**
   * Generate migration checklist
   */
  generateChecklist(from: AutomationLevel, to: AutomationLevel): string[] {
    const plan = this.planMigration(from, to);
    const checklist: string[] = [];

    for (const step of plan.steps) {
      checklist.push(`[ ] ${step.description}`);
      checklist.push(`    - Validation: ${step.validation}`);
      for (const risk of step.risks) {
        checklist.push(`    - Risk: ${risk}`);
      }
    }

    checklist.push(`[ ] Rollback plan prepared: ${plan.rollbackPlan}`);
    checklist.push(`[ ] Total estimated time: ${plan.totalEstimatedTime} hours`);

    return checklist;
  }
}
```

---

## Practical Heuristics

### Quick Decision Flowchart

```
┌─────────────────────────────────────────┐
│         START: Is this task...          │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
    [YES]              [NO]
       │                │
       ▼                ▼
┌─────────────┐   ┌──────────────┐
│ Pure math?  │   │ Has clear    │
│ Formula?    │   │ if/then      │
│             │   │ rules?       │
└──────┬──────┘   └──────┬───────┘
       │                 │
     [YES]             [YES]
       │                 │
       ▼                 ▼
  ┌─────────┐      ┌─────────┐
  │FUNCTION │      │   BOT   │
  │Level 0  │      │ Level 2 │
  └─────────┘      └─────────┘


    [NO]              [NO]
       │                 │
       └────┬────────────┘
            │
            ▼
     ┌──────────────┐
     │ Requires     │
     │ understanding│
     │ context?     │
     └──────┬───────┘
            │
       ┌────┴────┐
       │         │
     [NO]      [YES]
       │         │
       ▼         ▼
  ┌────────┐  ┌───────────┐
  │SCRIPT  │  │One-shot   │
  │Level 1 │  │decision?  │
  └────────┘  └─────┬─────┘
                   ┌───┴───┐
                 [YES]   [NO]
                   │       │
                   ▼       ▼
              ┌────────┐ ┌──────────┐
              │SIMPLE  │ │ COMPLEX  │
              │AGENT   │ │  AGENT   │
              │Level 3 │ │  Level 4 │
              └────────┘ └──────────┘
```

---

### Keyword Triggers

| Keyword | Likely Level | Examples |
|---------|--------------|----------|
| **sum, add, multiply, calculate** | Function | `SUM`, `A*B`, `COUNT` |
| **format, validate, check** | Script | Format phone, validate email |
| **if, then, else, rules** | Bot | Decision tree, routing |
| **understand, interpret, meaning** | Simple Agent | Sentiment, intent |
| **analyze, then, after that** | Complex Agent | Multi-step reasoning |

---

### Cost Thresholds

**Use Function/Script if**:
- Volume > 1000 operations/day
- Latency requirement < 100ms
- Cost budget < $0.001/operation

**Use Bot if**:
- Volume > 100 operations/day
- Rules are clear but complex
- Need explainability

**Use Agent if**:
- Volume < 100 operations/day
- Requires understanding
- High value per correct result

---

### Accuracy Requirements

| Accuracy Needed | Recommended Approach |
|-----------------|---------------------|
| 100% | Function or Script |
| 95-99% | Bot (with well-tuned rules) |
| 85-95% | Simple Agent |
| 80-90% | Complex Agent (multi-step reduces errors) |

---

## Implementation Examples

### Example 1: Email Classification

**Task**: Classify incoming emails as spam, promotional, or primary.

#### Initial Approach: Simple Agent (Overkill)

```typescript
const classifyEmail = async (email: Email): Promise<'spam' | 'promotional' | 'primary'> => {
  const response = await llm.classify(email.body, ['spam', 'promotional', 'primary']);
  return response.label;
};
```

**Cost**: $0.001 per email
**Latency**: 1 second
**Monthly cost** (10,000 emails): $10

#### Optimized Approach: Bot (Appropriate)

```typescript
const classifyEmail = (email: Email): 'spam' | 'promotional' | 'primary' => {
  // Rule 1: Known spammers
  if (SPAM_DOMAINS.has(domain(email.from))) return 'spam';

  // Rule 2: Promotional keywords
  if (PROMO_KEYWORDS.some(kw => email.subject.includes(kw))) {
    if (email.senderScore > 0.7) return 'promotional';
  }

  // Rule 3: Low sender score
  if (email.senderScore < 0.3) return 'spam';

  // Default: primary
  return 'primary';
};
```

**Cost**: $0.0001 per email
**Latency**: 5ms
**Monthly cost** (10,000 emails): $0.10
**Savings**: 99% cost reduction, 200x faster

---

### Example 2: Data Extraction

**Task**: Extract dates from invoice descriptions.

#### Initial Approach: Simple Agent

```typescript
const extractDates = async (text: string): Promise<Date[]> => {
  const response = await llm.extract(text, 'dates');
  return response.dates;
};
```

**Cost**: $0.001 per extraction

#### Optimized Approach: Script with Regex

```typescript
const extractDates = (text: string): Date[] => {
  const patterns = [
    /(\d{4})-(\d{2})-(\d{2})/,           // ISO: 2024-03-08
    /(\d{2})\/(\d{2})\/(\d{4})/,        // US: 03/08/2024
    /(\d{1,2})\s+(Jan|Feb|Mar)\s+(\d{4})/i // UK: 8 March 2024
  ];

  const dates: Date[] = [];
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      dates.push(new Date(match[0]));
    }
  }

  return dates;
};
```

**Cost**: $0.00001 per extraction
**Savings**: 99% cost reduction

---

### Example 3: Report Generation

**Task**: Generate weekly sales report.

**Analysis**: This IS a good use case for Complex Agent.

```typescript
const generateSalesReport = async (week: number): Promise<Report> => {
  // Step 1: Query sales data (function)
  const data = await querySalesData(week);

  // Step 2: Calculate metrics (function)
  const metrics = calculateMetrics(data);

  // Step 3: Identify trends (simple agent)
  const trends = await analyzeTrends(metrics);

  // Step 4: Generate narrative (simple agent)
  const narrative = await writeNarrative(metrics, trends);

  // Step 5: Assemble report (function)
  return {
    week,
    metrics,
    trends,
    narrative,
    generatedAt: new Date()
  };
};
```

**Justification**:
- Requires understanding context (trends, narrative)
- High value per report (executive time)
- Low volume (1 per week)
- Multi-step process with different tools

**Cost**: $0.01 per report = $0.52/year
**Value**: Saves 2 hours of analyst time per week = $10,000/year
**ROI**: 19,000%

---

### Example 4: Budget Approval

**Task**: Approve or flag budget requests.

#### Initial Approach: Agent (Overkill)

```typescript
const approveBudget = async (request: BudgetRequest): Promise<boolean> => {
  const response = await llm.decide(`Should this budget be approved? ${JSON.stringify(request)}`);
  return response.approved;
};
```

#### Optimized Approach: Bot (Appropriate)

```typescript
const approveBudget = (request: BudgetRequest): 'approve' | 'flag' | 'reject' => {
  // Clear business rules
  if (request.amount > request.department.monthlyBudget * 0.5) return 'flag';
  if (request.amount > 10000) return 'flag';
  if (!request.justification) return 'reject';
  if (request.justification.length < 50) return 'flag';

  // Check category limits
  const categoryLimit = CATEGORY_LIMITS.get(request.category);
  if (categoryLimit && request.amount > categoryLimit) return 'flag';

  return 'approve';
};
```

**Cost**: $0.0001 per request
**Latency**: 1ms
**Savings**: 99.9% cost reduction

---

## Conclusion

Agency Determination is about using the **right tool for the job**. Not every problem needs AI, and using AI unnecessarily is expensive and slow.

### Key Takeaways

1. **60-80% of spreadsheet tasks don't need LLMs**
2. **Start with the lowest level that works**
3. **Upgrade when value justifies cost**
4. **Monitor and downgrade if possible**
5. **Always calculate ROI**

### Implementation Priority

1. **Phase 1**: Build AgencyAnalyzer for automatic assessment
2. **Phase 2**: Implement CostBenefitAnalyzer for ROI calculations
3. **Phase 3**: Add MigrationPlanner for optimization paths
4. **Phase 4**: Create dashboard showing cost savings

### Success Metrics

- **Cost Reduction**: 50% reduction in AI API costs
- **Performance**: 90% of operations under 100ms
- **Accuracy**: Maintain or improve accuracy
- **User Satisfaction**: Faster, cheaper, more transparent

---

**Document Version**: 1.0
**Last Updated**: 2026-03-08
**Status**: ✅ Research Complete
**Next Phase**: Implementation

---

*"The art of programming is knowing when to use a hammer and when to use a scalpel. Agency determination is knowing when to use a formula and when to use an AI."*
