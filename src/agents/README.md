# Specialized Agents

**Status**: Domain-Specific Implementations | **Maturity**: Production-Ready

## What Is This Directory?

This directory contains **domain-specific agent implementations** that extend the core agent types defined in `src/core/`. These are specialized workers for specific tasks.

## For Future Agents: Read This First

```
┌────────────────────────────────────────────────────────────────────┐
│                    AGENT ARCHITECTURE OVERVIEW                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   src/core/agent.ts          ◀── BaseAgent (abstract)              │
│        │                                                            │
│        ├── src/core/agents.ts  ◀── TaskAgent, RoleAgent, CoreAgent │
│        │                                                            │
│        └── src/agents/         ◀── YOU ARE HERE                    │
│             ├── research.ts    ◀── ResearchAgent extends RoleAgent │
│             ├── code.ts        ◀── CodeAgent extends RoleAgent     │
│             ├── analysis.ts    ◀── AnalysisAgent extends RoleAgent │
│             └── coordination.ts◀── CoordinatorAgent extends CoreAgent│
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

## Files In This Directory

| File | What It Does | Extends | Use When |
|------|--------------|---------|----------|
| `research.ts` | Search, summarize, investigate | RoleAgent | Need to gather information |
| `code.ts` | Generate, refactor, debug | RoleAgent | Working with code |
| `analysis.ts` | Process and analyze data | RoleAgent | Data processing tasks |
| `coordination.ts` | Orchestrate multi-agent | CoreAgent | Multiple agents needed |

## How Agents Are Structured

Every agent follows the **SPORE Protocol**:

```
S - Subsumption  : Layer-based priority (SAFETY > REFLEX > HABITUAL > DELIBERATE)
P - Prediction   : World model predicts outcomes
O - Optimization : Value function guides choices
R - Response     : Execute the chosen action
E - Execution    : Track results, update value
```

## Agent Types Hierarchy

```
BaseAgent (abstract) - src/core/agent.ts
    │
    ├── TaskAgent (EPHEMERAL) - Lives briefly, executes once, dies
    │   └── Use for: One-shot tasks, no state persistence needed
    │
    ├── RoleAgent (ROLE) - Long-running, maintains state
    │   └── Use for: Ongoing responsibilities, accumulates knowledge
    │   └── THIS DIRECTORY's agents extend this!
    │
    └── CoreAgent (CORE) - Always-on, system-critical
        └── Use for: Essential functions, rarely dies
        └── CoordinatorAgent extends this
```

## Quick Start: Using An Agent

```typescript
// Step 1: Import the agent you need
import { ResearchAgent } from './agents/research';
import { CodeAgent } from './agents/code';
import { AnalysisAgent } from './agents/analysis';
import { CoordinatorAgent } from './agents/coordination';

// Step 2: Create configuration
const config = {
  id: 'research-001',
  typeId: 'research',
  categoryId: 'role',
  modelFamily: 'smallml',
  inputTopics: ['query'],
  outputTopic: 'results'
};

// Step 3: Instantiate and initialize
const researcher = new ResearchAgent(config);
await researcher.initialize();

// Step 4: Process input
const result = await researcher.process({
  query: 'What is the architecture of POLLN?'
});

// Step 5: Use result
console.log(result.summary);

// Step 6: Shutdown when done (for RoleAgents, this is rare)
// await researcher.shutdown();
```

## Agent Lifecycle

```
┌──────────────┐
│   CREATED    │  Agent is instantiated with config
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ INITIALIZE   │  Resources loaded, state restored
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    ACTIVE    │  Ready to process inputs
│              │  ◀── Most time spent here
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   DORMANT    │  Paused, state preserved
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   SHUTDOWN   │  Resources released, final state saved
└──────────────┘
```

## How To Create A New Agent

```typescript
// 1. Import the base
import { RoleAgent } from '../core/agents';
import type { AgentConfig, A2APackage } from '../core/types';

// 2. Define your config interface
interface MyAgentConfig extends AgentConfig {
  customSetting: string;
}

// 3. Create the class
export class MyAgent extends RoleAgent {
  private customSetting: string;

  constructor(config: MyAgentConfig) {
    super(config);
    this.customSetting = config.customSetting;
  }

  // 4. Implement required methods
  async initialize(): Promise<void> {
    await super.initialize();
    // Your setup code here
  }

  async process<T>(input: A2APackage<T>): Promise<A2APackage> {
    // Your processing logic here
    const result = this.doWork(input.payload);

    return {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: input.senderId,
      type: 'response',
      payload: result,
      parentIds: [input.id],
      causalChainId: input.causalChainId,
      privacyLevel: input.privacyLevel,
      layer: input.layer
    };
  }

  async shutdown(): Promise<void> {
    // Your cleanup code here
    await super.shutdown();
  }

  // 5. Add helper methods
  private doWork(input: any): any {
    // Implementation
    return { processed: true };
  }
}
```

## Specialization Pattern

Choose parent class based on lifespan:

| Need | Parent Class | Tile Category |
|------|--------------|---------------|
| Execute once, forget | TaskAgent | EPHEMERAL |
| Ongoing role, stateful | RoleAgent | ROLE |
| System-critical, always-on | CoreAgent | CORE |

## Communication Between Agents

Agents talk via **A2A Packages**:

```typescript
// Create a message
const message: A2APackage = {
  id: 'msg-001',
  timestamp: Date.now(),
  senderId: 'agent-001',
  receiverId: 'agent-002',
  type: 'request',
  payload: { query: 'Analyze this data' },
  parentIds: [],
  causalChainId: 'chain-001',
  privacyLevel: PrivacyLevel.COLONY,
  layer: SubsumptionLayer.DELIBERATE
};

// Send to another agent
const response = await receiver.process(message);
```

## Value Function (Learning)

Agents track their success:

```typescript
// After successful execution
agent.updateValueFunction(0.9);  // 90% success

// After failure
agent.updateValueFunction(0.1);  // 10% success

// Check current value
const success = agent.valueFunction;  // 0-1 score
```

## Testing

```bash
# Run agent tests
npm test -- --testPathPattern=agents

# Run specific test
npx vitest run src/agents/__tests__/research.test.ts
```

## Common Gotchas

1. **Always call super.initialize()** - Base class setup is required
2. **Always call super.shutdown()** - Base class cleanup is required
3. **Don't forget to emit events** - Use EventEmitter for notifications
4. **Track causal chains** - Include parentIds in responses
5. **Respect privacy levels** - Don't leak PRIVATE data

## Dependencies

```
src/agents/
    │
    ├── depends on ──▶ src/core/agent.ts (BaseAgent)
    ├── depends on ──▶ src/core/types.ts (A2APackage, etc.)
    ├── depends on ──▶ src/core/agents.ts (TaskAgent, RoleAgent, CoreAgent)
    │
    └── used by ────▶ src/core/colony.ts (Colony manages agents)
```

## See Also

- `src/core/README.md` - Core system documentation
- `src/core/agent.ts` - BaseAgent implementation
- `src/core/types.ts` - All type definitions
- `docs/research/smp-paper/` - SMP paradigm documentation

---

*Part of POLLN - Pattern-Organized Large Language Network*
*SuperInstance.AI | MIT License*
