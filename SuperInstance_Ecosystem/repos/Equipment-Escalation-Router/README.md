# Equipment-Escalation-Router

> Intelligent LLM routing equipment: **Bot→Brain→Human** with **40x cost reduction**

Part of the [SuperInstance Ecosystem](https://github.com/superinstance), this equipment implements intelligent routing decisions to optimize costs while maintaining quality.

## 🎯 Overview

The Escalation Router automatically routes requests to the most appropriate tier based on complexity, stakes, urgency, and novelty. This results in dramatic cost savings while ensuring high-quality responses for critical decisions.

### Three-Tier Routing

| Tier | Cost | Use Case | Example |
|------|------|----------|---------|
| **Bot** | $0.002/request | Simple queries, lookups, formatting | "What is the capital of France?" |
| **Brain** | $0.03/request | Complex reasoning, coding, analysis | "Design a REST API for user management" |
| **Human** | $30+/request | High-stakes, judgment, approvals | "Should we approve this $1M contract?" |

### Cost Reduction

By intelligently routing requests:

- **Simple queries** → Bot tier (15x cheaper than Brain)
- **Complex tasks** → Brain tier (1000x cheaper than Human)
- **Critical decisions** → Human tier (only when necessary)

**Result: Up to 40x overall cost reduction** compared to always using Brain tier.

## 📦 Installation

```bash
npm install @superinstance/equipment-escalation-router
```

## 🚀 Quick Start

```typescript
import { EscalationRouter } from '@superinstance/equipment-escalation-router';

// Initialize router
const router = new EscalationRouter({
  enableCaching: true,
  budget: {
    dailyLimit: 100, // $100/day budget
    alertThreshold: 0.8 // Alert at 80% usage
  },
  humanEscalation: {
    enabled: true,
    approvalTimeoutMs: 30 * 60 * 1000 // 30 minutes
  }
});

// Route a request
const result = await router.route({
  query: 'What is the capital of France?',
  context: { userId: 'user-123' }
});

console.log(result);
// {
//   tier: 'bot',
//   cost: 0.002,
//   cached: false,
//   decision: { ... },
//   fallbackChain: ['bot', 'brain', 'human']
// }
```

## 📚 API Reference

### EscalationRouter

Main class for intelligent routing.

#### Constructor

```typescript
new EscalationRouter(config?: Partial<EscalationRouterConfig>)
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableCaching` | `boolean` | `true` | Enable pattern caching |
| `maxCacheSize` | `number` | `100MB` | Maximum cache size in bytes |
| `enablePatternLearning` | `boolean` | `true` | Learn from routing patterns |
| `budget.dailyLimit` | `number` | `100` | Daily budget limit in dollars |
| `budget.alertThreshold` | `number` | `0.8` | Alert at this percentage |
| `budget.hardStop` | `boolean` | `false` | Stop when budget exceeded |
| `enableFallback` | `boolean` | `true` | Enable fallback chain |
| `maxRetries` | `number` | `2` | Maximum fallback retries |
| `humanEscalation.enabled` | `boolean` | `false` | Enable human escalation |

#### Methods

##### `route(request)`

Route a request to the appropriate tier.

```typescript
const result = await router.route({
  query: string;
  context?: Record<string, unknown>;
  decisionFactors?: Partial<DecisionFactors>;
  preferredTier?: RoutingTier;
  budgetOverride?: number;
});
```

##### `routeWithEscalation(request)`

Route with automatic escalation on failure.

```typescript
const result = await router.routeWithEscalation({
  query: string;
  context?: Record<string, unknown>;
  onTierResult?: (tier, result) => Promise<boolean>;
});
```

##### `escalateToHuman(request)`

Explicitly escalate to human operator.

```typescript
const response = await router.escalateToHuman({
  query: string;
  context?: Record<string, unknown>;
  reason: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
});
```

##### `getCostMetrics()`

Get current cost metrics.

```typescript
const metrics = router.getCostMetrics();
// {
//   totalCost: number;
//   costsByTier: { bot, brain, human };
//   cacheHitRate: number;
//   budgetRemaining: number;
//   costReduction: number;
// }
```

### DecisionRouter

Handles routing decisions based on query analysis.

#### Decision Factors

| Factor | Values | Description |
|--------|--------|-------------|
| `complexity` | `trivial` → `extreme` | Query complexity level |
| `urgency` | `low` → `critical` | Time sensitivity |
| `stakes` | `minimal` → `critical` | Impact of the decision |
| `novelty` | `0-1` | How unique/unusual the request is |
| `hasCode` | `boolean` | Contains code-related content |
| `requiresJudgment` | `boolean` | Needs subjective judgment |
| `requiresApproval` | `boolean` | Needs authorization |
| `legalCompliance` | `boolean` | Legal/regulatory implications |
| `safetySensitive` | `boolean` | Safety-critical operation |

### CostOptimizer

Manages caching, budget tracking, and cost optimization.

```typescript
import { CostOptimizer } from '@superinstance/equipment-escalation-router';

const optimizer = new CostOptimizer({
  enableCaching: true,
  maxCacheSize: 100 * 1024 * 1024,
  budget: {
    dailyLimit: 100,
    alertThreshold: 0.8
  }
});

// Check cache
const cached = optimizer.checkCache('What is the capital of France?');

// Track costs
optimizer.trackCost({
  tier: 'bot',
  amount: 0.002,
  tokens: 100,
  cached: false
});

// Get metrics
const metrics = optimizer.getMetrics();
```

### HumanEscalation

Manages human-in-the-loop escalation for high-stakes decisions.

```typescript
import { HumanEscalation } from '@superinstance/equipment-escalation-router';

const escalation = new HumanEscalation({
  approvalTimeoutMs: 30 * 60 * 1000,
  maxPendingRequests: 100,
  onEscalation: (request) => {
    // Send notification to operators
    notifyOperators(request);
  }
});

// Register operators
escalation.registerOperator({
  id: 'op-1',
  name: 'John Doe',
  roles: ['approver', 'reviewer'],
  available: true,
  currentLoad: 0,
  maxLoad: 5,
  specializations: ['legal', 'finance']
});

// Request escalation
const response = await escalation.request({
  id: 'req-123',
  query: 'Should we approve this contract?',
  reason: 'Requires legal approval for $500K contract',
  priority: 'high'
});

// Resolve escalation
await escalation.resolve('req-123', {
  status: 'approved',
  resolution: 'Contract approved with standard terms',
  respondedBy: 'op-1'
});
```

## 🧠 How It Works

### Decision Flow

```
Query Input
    │
    ▼
┌─────────────────┐
│  Cache Check    │ ──Hit──► Return Cached Result
└────────┬────────┘
         │ Miss
         ▼
┌─────────────────┐
│ Analyze Query   │
│ • Complexity    │
│ • Stakes        │
│ • Urgency       │
│ • Novelty       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Determine Tier  │
│ Bot → Brain →   │
│ Human           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check Budget    │ ──Exceeded──► Downgrade Tier
└────────┬────────┘
         │ OK
         ▼
┌─────────────────┐
│ Route to Tier   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cache Pattern   │
│ for Future      │
└─────────────────┘
```

### Routing Rules

| Condition | Route To |
|-----------|----------|
| Trivial complexity + Low stakes | Bot |
| Code present + Not trivial | Brain |
| High novelty (>0.7) | Brain |
| Critical stakes + Approval needed | Human |
| Legal compliance + Critical stakes | Human |
| Safety sensitive + Critical stakes | Human |
| High stakes + Emotional content | Human |

### Fallback Chain

When a tier fails to provide a satisfactory response:

1. **Bot tier** → Falls back to Brain, then Human
2. **Brain tier** → Falls back to Human, then Bot (for simple responses)
3. **Human tier** → No fallback (final authority)

## 📊 Cost Optimization Strategies

### Caching

- Automatic caching of routing decisions
- LRU eviction when cache is full
- Configurable TTL for cache entries

```typescript
// Cache hit = $0 cost
const cached = await router.route({ query: 'Same query as before' });
// cached.cached === true
```

### Pattern Learning

- Learns from successful routing patterns
- Improves routing accuracy over time
- Reduces unnecessary tier escalation

### Budget Management

- Daily budget limits with alerts
- Automatic tier downgrade when budget is tight
- Hard stop option for strict budgets

```typescript
router.updateBudget({
  dailyLimit: 50,
  hardStop: true
});
```

## 📈 Monitoring

### Cost Metrics

```typescript
const metrics = router.getCostMetrics();

console.log(`Total Cost: $${metrics.totalCost.toFixed(4)}`);
console.log(`Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
console.log(`Cost Reduction: $${metrics.costReduction.toFixed(2)} saved`);
console.log(`Budget Remaining: $${metrics.budgetRemaining.toFixed(2)}`);
```

### Routing Metrics

```typescript
const routingMetrics = router.getRoutingMetrics();

console.log(`Total Requests: ${routingMetrics.totalRequests}`);
console.log(`Cost Reduction Ratio: ${routingMetrics.costReductionRatio}x`);
console.log(`Bot Tier Usage: ${routingMetrics.tierUsage.bot}`);
console.log(`Brain Tier Usage: ${routingMetrics.tierUsage.brain}`);
console.log(`Human Tier Usage: ${routingMetrics.tierUsage.human}`);
```

### Human Escalation Metrics

```typescript
const escalationMetrics = escalation.getMetrics();

console.log(`Total Escalations: ${escalationMetrics.totalEscalations}`);
console.log(`Approval Rate: ${escalationMetrics.approved / escalationMetrics.totalEscalations}`);
console.log(`Avg Response Time: ${escalationMetrics.averageResponseTimeMs / 60000} min`);
```

## 🔧 Integration with SuperInstance

This equipment integrates with the SuperInstance ecosystem:

```typescript
import { BaseEquipment } from '@superinstance/starter-agent';
import { EscalationRouter } from '@superinstance/equipment-escalation-router';

class MyAgent extends BaseEquipment {
  private router: EscalationRouter;

  constructor() {
    super();
    this.router = new EscalationRouter();
  }

  async processQuery(query: string) {
    const result = await this.router.route({ query });
    
    // Process based on tier
    switch (result.tier) {
      case 'bot':
        return this.handleSimple(query);
      case 'brain':
        return this.handleComplex(query);
      case 'human':
        return this.handleEscalation(query);
    }
  }
}
```

## 🧪 Examples

### Basic Routing

```typescript
const router = new EscalationRouter();

// Simple query → Bot tier
const simple = await router.route({
  query: 'Convert 100 USD to EUR'
});
// simple.tier === 'bot'

// Complex query → Brain tier
const complex = await router.route({
  query: 'Design a microservices architecture for an e-commerce platform'
});
// complex.tier === 'brain'

// Critical decision → Human tier
const critical = await router.route({
  query: 'Should we proceed with the acquisition of Company X for $50M?',
  decisionFactors: {
    stakes: 'critical',
    requiresApproval: true
  }
});
// critical.tier === 'human'
```

### With Fallback Handling

```typescript
const result = await router.routeWithEscalation({
  query: 'Analyze this legal contract',
  onTierResult: async (tier, result) => {
    // Return false to trigger fallback
    const confidence = (result as any).confidence || 0;
    return confidence > 0.7;
  }
});

if (result.escalated) {
  console.log('Had to escalate through fallback chain');
}
```

### Budget-Conscious Routing

```typescript
const router = new EscalationRouter({
  budget: {
    dailyLimit: 10,
    alertThreshold: 0.5,
    hardStop: false,
    notificationCallback: (usage, limit) => {
      console.log(`Budget alert: $${usage} of $${limit} used`);
    }
  }
});

// Will auto-downgrade if budget is tight
const result = await router.route({
  query: 'Complex analysis task'
});
```

## 📝 License

MIT © SuperInstance Ecosystem
