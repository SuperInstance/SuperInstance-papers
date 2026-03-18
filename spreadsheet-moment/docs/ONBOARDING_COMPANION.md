# SpreadsheetMoment Team Onboarding Guide - Expanded Edition

**Welcome to the SpreadsheetMoment team!** This comprehensive guide will help you (whether you're human or AI agent) understand and contribute to our project effectively.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Deep Dive: Univer Architecture](#deep-dive-univer-architecture)
3. [Agentic Layer Reference](#agentic-layer-reference)
4. [Code Patterns & Examples](#code-patterns--examples)
5. [Common Workflows](#common-workflows)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Quick Reference Cards](#quick-reference-cards)
8. [Agent-Specific Guidance](#agent-specific-guidance)
9. [Best Practices](#best-practices)
10. [Performance Optimization](#performance-optimization)
11. [Security Considerations](#security-considerations)
12. [Debugging Techniques](#debugging-techniques)
13. [Getting Help](#getting-help)

---

## Quick Start

### For New Team Members (Human)

**Day 1: Setup (2 hours)**
```bash
# 1. Clone repository
git clone https://github.com/SuperInstance/spreadsheet-moment.git
cd spreadsheet-moment

# 2. Install dependencies (requires pnpm)
npm install -g pnpm
pnpm install

# 3. Start development server
pnpm --filter @univerjs-examples/base run dev

# 4. Open browser to http://localhost:3000
```

**Day 1: Learning (4 hours)**
- Read `docs/ONBOARDING.md` (this file)
- Read `docs/FORK_STRATEGY.md`
- Read `docs/AGENTIC_DESIGN.md`
- Read `docs/IMPLEMENTATION_ROADMAP.md`
- Explore `packages/agent-core/` directory

**Day 1: First Contribution (2 hours)**
- Find a "good first issue" on GitHub
- Make your changes
- Run tests: `pnpm test`
- Submit PR

### For AI Agents

**Immediate Context:**
```
Project: SpreadsheetMoment - Agentic spreadsheet on Univer foundation
Location: C:\Users\casey\polln\spreadsheet-moment
Current Phase: Phase 0 - Planning complete, ready for Phase 1
Status: Fork not yet executed, documentation complete

Key Directories:
- docs/                    # All planning and reference documentation
- packages/                 # Will contain agent-* packages (after fork)
- cloudflare/              # Cloudflare Workers deployment (existing)

Critical Files:
- CLAUDE.md                # Project overview and current status
- docs/ONBOARDING.md        # This file - comprehensive onboarding
- docs/FORK_STRATEGY.md     # Fork and integration strategy
- docs/AGENTIC_DESIGN.md    # Agentic integration design
- docs/IMPLEMENTATION_ROADMAP.md  # 10-week implementation plan
```

**Reading Priority:**
1. `CLAUDE.md` - Current project status and direction
2. `docs/FORK_STRATEGY.md` - Understanding the fork approach
3. `docs/AGENTIC_DESIGN.md` - Technical architecture details
4. `docs/IMPLEMENTATION_ROADMAP.md` - Timeline and deliverables

---

## Deep Dive: Univer Architecture

### Understanding Univer's Core

**Univer** is a powerful spreadsheet engine with these key characteristics:

```
Univer = {
  core: {
    language: "TypeScript",
    architecture: "Plugin-based",
    rendering: "Canvas-based (not DOM)",
    scalability: "100K+ cells",
    state: "Immutable patterns"
  },

  packages: {
    engine: "Core spreadsheet logic",
    docs: "Documentation engine",
    graphql: "GraphQL API layer",
    cli: "Command-line tools",
    ui: "UI components"
  },

  patterns: {
    dependencyInjection: "DI container for services",
    commandPattern: "Undo/redo support",
    observable: "Reactive state management",
    plugin: "Extensibility through plugins"
  }
}
```

### Key Univer Concepts

**1. Workbook/Worksheet/Range Hierarchy**
```typescript
// Univer's data model hierarchy
Workbook
  └── Worksheet[]
      └── Range
          └── Cell
              ├── value: string | number
              ├── formula: string
              └── style: object
```

**2. Plugin System**
```typescript
// Univer plugins extend functionality
import { Plugin } from '@univerjs/core';

class MyPlugin extends Plugin {
  static override PLUGIN_NAME = 'MY_PLUGIN';

  onMounted(): void {
    // Plugin initialization
    this._registerCommands();
    this._registerUI();
  }
}
```

**3. Command Pattern**
```typescript
// Commands provide undo/redo support
this._commandService.registerCommand({
  id: 'my.command',
  handler: (accessor, params) => {
    // Command logic
    return true; // Return true for success
  }
});
```

**4. Dependency Injection**
```typescript
// Access Univer services
const univerAPI = useDependency(UniverInstance);
const workbook = univerAPI.getActiveWorkbook();
const worksheet = workbook.getActiveWorksheet();
```

### Univer Data Structures

**Cell Data Model**
```typescript
interface ICellData {
  v?: string | number;      // Value
  f?: string;               // Formula
  s?: ISheetStyle;          // Style
  t?: CellValueType;        // Type
  p?: IParagraph[];         // Rich text paragraphs
  custom?: Record<string, any>;  // Custom data
}
```

**Range Operations**
```typescript
// Working with ranges
const range = worksheet.getRange('A1:C10');
range.setValue(42);
range.setStyle({ bold: true });
const value = range.getValue();
```

**Formula Engine**
```typescript
// Formula calculation
const formula = '=SUM(A1:A10)';
const result = worksheet.executeFormula(formula);
```

---

## Agentic Layer Reference

### Agent Cell Data Model

**Complete Interface Definition:**
```typescript
interface IAgentCellData extends ICellData {
  // Base properties from Univer
  v?: string | number;
  f?: string;
  s?: ISheetStyle;

  // Agentic extensions
  origin_id?: string;              // Unique origin identifier
  trace_id?: string;               // Operation tracking
  cell_type?: AgentCellType;       // Sensor, Analyzer, Controller, Orchestrator
  state?: AgentCellState;          // DORMANT, THINKING, NEEDS_REVIEW, POSTED, ARCHIVED, ERROR

  // Visual Thinking
  reasoning?: string[];            // Step-by-step reasoning
  memory?: string[];               // Persistent memory
  procedures?: IProcedure[];       // Learned procedures

  // HITL Workflow
  requires_approval?: boolean;     // Needs human approval
  approved_actions?: IAction[];    // Approved actions queue

  // Configuration
  config?: IAgentConfig;           // Agent configuration
  last_update?: string;            // Timestamp
}
```

**Cell Type Definitions:**
```typescript
enum AgentCellType {
  SENSOR = 'sensor',              // Reads from external sources
  ANALYZER = 'analyzer',          // Processes data
  CONTROLLER = 'controller',      // Sends commands
  ORCHESTRATOR = 'orchestrator'   // Coordinates cells
}

enum AgentCellState {
  DORMANT = 'dormant',            // Inactive
  THINKING = 'thinking',          // Generating reasoning
  NEEDS_REVIEW = 'needs_review',  // Awaiting approval
  POSTED = 'posted',              // Action executed
  ARCHIVED = 'archived',          // Rejected/completed
  ERROR = 'error'                 // Error occurred
}
```

### Trace Protocol Reference

**Purpose:** Prevent recursive loops in cell dependencies

**Key Methods:**
```typescript
class TraceProtocol {
  // Generate new trace ID for operation
  generate(originId: string): string;

  // Check if current cell creates recursive loop
  checkCollision(traceId: string, currentCell: string): boolean;

  // Mark trace as completed successfully
  complete(traceId: string): void;

  // Remove old traces from memory
  cleanup(maxAge?: number): void;

  // Get trace information
  getTrace(traceId: string): ITrace | undefined;
}
```

**Usage Example:**
```typescript
const protocol = new TraceProtocol();

// Start operation
const traceId = protocol.generate('A1');

// Check each dependency
for (const dep of dependencies) {
  if (protocol.checkCollision(traceId, dep)) {
    // Recursive loop detected!
    throw new Error('Recursive dependency detected');
  }
  // Process dependency
}

// Operation complete
protocol.complete(traceId);
```

### Agent Handshake Protocol Reference

**Purpose:** Detect and filter bot-to-bot interactions

**Key Method:**
```typescript
class AgentHandshakeProtocol {
  // Detect if message is from automated agent
  detect(message: string): IHandshakeResult;

  // Add custom agent signature
  addSignature(signature: string): void;

  // Remove agent signature
  removeSignature(signature: string): void;
}
```

**Default Signatures:**
```typescript
const DEFAULT_SIGNATURES = [
  'agent', 'bot', 'automated', 'auto-reply',
  'claude', 'gpt', 'chatgpt', 'ai-assistant',
  'github-actions', 'dependabot', 'renovate'
];
```

**Usage Example:**
```typescript
const handshake = new AgentHandshakeProtocol();

// Check incoming message
const result = handshake.detect(message);

if (result.is_agent) {
  // Handle agent message
  console.log(`Agent detected: ${result.signature}`);
  console.log(`Action: ${result.action}`);

  if (result.action === HandshakeAction.ARCHIVE) {
    // Auto-archive the message
    archiveMessage(message);
  }
}
```

### Intelligent AI Router Reference

**Purpose:** Select best AI provider based on cost and capability

**Key Method:**
```typescript
class IntelligentAIRouter {
  // Register AI provider
  registerProvider(provider: IAIProvider): void;

  // Select best provider for requirements
  selectProvider(requirements: IProviderRequirements): IAIProvider | null;

  // Call AI with automatic provider selection
  call(prompt: string, requirements: IProviderRequirements): Promise<IAIResponse>;

  // Get cost statistics
  getCostStats(): ICostStats;
}
```

**Provider Selection Logic:**
```typescript
// Priority order (cheapest first):
1. Cloudflare Workers AI (FREE - 10K requests/day)
2. DeepSeek ($0.014/1K tokens - best for reasoning)
3. OpenAI GPT-4 ($0.01/1K tokens - quality)
4. Anthropic Claude ($0.00025/1K tokens - fast)
```

**Usage Example:**
```typescript
const router = new IntelligentAIRouter();

// Register providers
router.registerProvider(cloudflareProvider);
router.registerProvider(deepseekProvider);

// Call AI with automatic selection
const response = await router.call(
  "What's the weather in Tokyo?",
  { needs_reasoning: true }
);

console.log(response.content);  // AI response
console.log(response.cost);      // Actual cost
console.log(response.provider);  // Which provider was used
```

---

## Code Patterns & Examples

### Pattern 1: Creating an Agent Cell

```typescript
import { AgentCellManager } from '@spreadsheet-moment/agent-core';

async function createAgentCell(
  worksheet: Worksheet,
  cellId: string,
  type: AgentCellType,
  config: IAgentConfig
): Promise<IAgentCellData> {
  const manager = new AgentCellManager(worksheet);

  const cell = await manager.createCell(cellId, {
    cell_type: type,
    state: AgentCellState.DORMANT,
    config: config,
    reasoning: [],
    memory: [],
    requires_approval: true
  });

  return cell;
}

// Usage
const cell = await createAgentCell(
  worksheet,
  'A1',
  AgentCellType.SENSOR,
  {
    type: 'sensor',
    connection: {
      type: 'api',
      endpoint: 'https://api.weather.com'
    },
    require_approval: true
  }
);
```

### Pattern 2: Implementing Visual Thinking

```typescript
import { ReasoningService } from '@spreadsheet-moment/agent-ui';

async function generateVisualThinking(
  cellId: string,
  prompt: string
): Promise<string[]> {
  const service = new ReasoningService();

  // Generate reasoning with streaming
  const reasoningSteps: string[] = [];

  const stream = service.generateReasoning(prompt, {
    stream: true,
    onStep: (step) => {
      reasoningSteps.push(step);
      // Update UI in real-time
      updateReasoningPanel(cellId, reasoningSteps);
    }
  });

  await stream.complete();
  return reasoningSteps;
}

// Usage
const reasoning = await generateVisualThinking(
  'A1',
  'What is the current temperature in Tokyo?'
);
// Returns: [
//   "Step 1: Identify need for weather data",
//   "Step 2: Call Weather API for Tokyo",
//   "Step 3: Parse response (22°C, sunny)",
//   "Step 4: Format as '22°C, Sunny in Tokyo'"
// ]
```

### Pattern 3: HITL Workflow

```typescript
import { HITLManager } from '@spreadsheet-moment/agent-ui';

class HITLWorkflow {
  private _manager: HITLManager;

  async executeAgentAction(cellId: string): Promise<void> {
    // 1. Generate reasoning
    const reasoning = await this.generateReasoning(cellId);

    // 2. Update cell state to NEEDS_REVIEW
    await this.updateCellState(cellId, AgentCellState.NEEDS_REVIEW);

    // 3. Wait for human decision
    const decision = await this._manager.waitForDecision(cellId);

    if (decision.approved) {
      // 4a. Execute approved action
      await this.executeAction(cellId, decision.action);
      await this.updateCellState(cellId, AgentCellState.POSTED);
    } else {
      // 4b. Archive rejected reasoning
      await this.archiveReasoning(cellId, reasoning, decision.reason);
      await this.updateCellState(cellId, AgentCellState.ARCHIVED);
    }
  }

  private async generateReasoning(cellId: string): Promise<string[]> {
    // Implementation
    return [];
  }

  private async updateCellState(
    cellId: string,
    state: AgentCellState
  ): Promise<void> {
    // Implementation
  }

  private async executeAction(cellId: string, action: IAction): Promise<void> {
    // Implementation
  }

  private async archiveReasoning(
    cellId: string,
    reasoning: string[],
    reason: string
  ): Promise<void> {
    // Implementation
  }
}
```

### Pattern 4: Multi-Sheet Coordination

```typescript
import { CoordinationService } from '@spreadsheet-moment/agent-core';

async function coordinateCells(
  workbook: Workbook,
  cellIds: string[]
): Promise<CoordinationResult[]> {
  const service = new CoordinationService(workbook);

  // Create coordination protocol
  const protocol = await service.createProtocol({
    cells: cellIds,
    consensus: 'majority',
    timeout: 30000
  });

  // Execute coordination
  const results = await protocol.coordinate();

  return results;
}

// Usage
const results = await coordinateCells(
  workbook,
  ['Sheet1!A1', 'Sheet2!A1', 'Sheet3!A1']
);

results.forEach(result => {
  console.log(`${result.cellId}: ${result.status}`);
  console.log(`  Value: ${result.value}`);
  console.log(`  Consensus: ${result.consensus}%`);
});
```

### Pattern 5: Custom Formula Function

```typescript
import { registerFunction } from '@spreadsheet-moment/agent-formulas';

// Register custom formula
registerFunction({
  id: 'AGENT.ANALYZE',
  handler: async (range: string[]) => {
    // Get cell values from range
    const values = getRangeValues(range);

    // Call AI for analysis
    const router = getAIRouter();
    const response = await router.call(
      `Analyze this data: ${JSON.stringify(values)}`,
      { needs_reasoning: true }
    );

    return response.content;
  }
});

// Usage in spreadsheet:
// =AGENT.ANALYZE(A1:A100)
```

---

## Common Workflows

### Workflow 1: Implementing a New Agent Type

**Scenario:** Add a new "PREDICTOR" agent type that uses ML models.

**Steps:**

1. **Define the type:**
```typescript
// packages/agent-core/src/models/AgentCellModel.ts
export enum AgentCellType {
  SENSOR = 'sensor',
  ANALYZER = 'analyzer',
  CONTROLLER = 'controller',
  ORCHESTRATOR = 'orchestrator',
  PREDICTOR = 'predictor'  // NEW
}
```

2. **Implement type-specific logic:**
```typescript
// packages/agent-core/src/services/PredictorService.ts
export class PredictorService {
  async predict(cell: IAgentCellData): Promise<PredictionResult> {
    const model = await this.loadModel(cell.config.model);
    const data = await this.gatherData(cell.config.data_source);
    const prediction = await model.predict(data);
    return prediction;
  }

  private async loadModel(modelId: string): Promise<MLModel> {
    // Load model from cache or API
  }

  private async gatherData(source: string): Promise<Data[]> {
    // Gather training/prediction data
  }
}
```

3. **Register the type:**
```typescript
// packages/agent-ui/src/plugins/AgentCellPlugin.ts
this._cellModel.registerCellType('predictor', {
  defaultValue: { /* ... */ },
  validator: validatePredictorCell,
  renderer: PredictorCellRenderer
});
```

4. **Add UI components:**
```typescript
// packages/agent-ui/src/components/PredictorConfigPanel.tsx
export const PredictorConfigPanel: FC = () => {
  return (
    <Panel>
      <ModelSelector />
      <DataSourceConfig />
      <PredictionInterval />
    </Panel>
  );
};
```

5. **Write tests:**
```typescript
// packages/agent-core/src/__tests__/PredictorService.test.ts
describe('PredictorService', () => {
  it('should load model from cache', async () => {
    const service = new PredictorService();
    const model = await service.loadModel('test-model');
    expect(model).toBeDefined();
  });
});
```

### Workflow 2: Debugging a Cell

**Scenario:** Cell A1 shows unexpected behavior.

**Steps:**

1. **Check cell state:**
```typescript
const cell = worksheet.getRange('A1').getCell();
console.log('Cell state:', cell.state);
console.log('Cell type:', cell.cell_type);
console.log('Trace ID:', cell.trace_id);
```

2. **Inspect trace:**
```typescript
const protocol = getTraceProtocol();
const trace = protocol.getTrace(cell.trace_id);
console.log('Trace path:', trace.path);
console.log('Trace state:', trace.state);
```

3. **Check reasoning:**
```typescript
console.log('Reasoning steps:', cell.reasoning);
// Look for errors or unexpected steps
```

4. **View logs:**
```bash
# View real-time logs
pnpm --filter @spreadsheet-moment/agent-core dev --verbose

# Or check log files
tail -f logs/agent-core.log
```

5. **Test in isolation:**
```typescript
// Create minimal reproduction
const testCell = createTestCell('A1', config);
const result = await testCell.execute();
console.log('Test result:', result);
```

### Workflow 3: Adding a New AI Provider

**Scenario:** Add support for a new AI provider.

**Steps:**

1. **Implement provider interface:**
```typescript
// packages/agent-ai/src/providers/NewProvider.ts
import { IAIProvider } from '../types';

export class NewProvider implements IAIProvider {
  id = 'new-provider';
  name = 'New Provider';
  cost_per_1k = 0.05;
  capabilities = ['reasoning', 'general'];
  is_available = true;

  async call(
    prompt: string,
    options?: IAIOptions
  ): Promise<IAIResponse> {
    const response = await fetch('https://api.new-provider.com/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options?.model || 'default-model',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.max_tokens || 4096
      })
    });

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      model: data.model,
      tokens: data.usage.total_tokens,
      cost: (data.usage.total_tokens / 1000) * this.cost_per_1k,
      provider: this.id
    };
  }

  private apiKey: string;

  constructor(config: { apiKey: string }) {
    this.apiKey = config.apiKey;
  }
}
```

2. **Register provider:**
```typescript
// packages/agent-ai/src/index.ts
import { NewProvider } from './providers/NewProvider';

export function createAIRouter(): IntelligentAIRouter {
  const router = new IntelligentAIRouter();

  // Register new provider
  router.registerProvider(new NewProvider({
    apiKey: process.env.NEW_PROVIDER_API_KEY
  }));

  return router;
}
```

3. **Add tests:**
```typescript
// packages/agent-ai/src/__tests__/NewProvider.test.ts
describe('NewProvider', () => {
  it('should call API successfully', async () => {
    const provider = new NewProvider({ apiKey: 'test-key' });
    const response = await provider.call('Hello', {});
    expect(response.content).toBeDefined();
  });

  it('should calculate cost correctly', async () => {
    const provider = new NewProvider({ apiKey: 'test-key' });
    const response = await provider.call('Hello', { max_tokens: 1000 });
    expect(response.cost).toBe(0.05);
  });
});
```

4. **Update documentation:**
```markdown
# New Provider Integration

## Setup

1. Get API key from https://new-provider.com
2. Add to environment: `NEW_PROVIDER_API_KEY=your_key`
3. Restart development server

## Usage

The new provider is automatically selected based on:
- Cost: $0.05/1K tokens
- Capabilities: reasoning, general
```

---

## Troubleshooting Guide

### Common Issues and Solutions

**Issue 1: "Module not found" errors**

```bash
# Symptom
Error: Cannot find module '@spreadsheet-moment/agent-core'

# Solution
pnpm install
# If still failing:
pnpm install --force
# Or:
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Issue 2: TypeScript compilation errors**

```bash
# Symptom
Type error: Property 'origin_id' does not exist on type 'ICellData'

# Solution
# Ensure you're using IAgentCellData, not ICellData
import { IAgentCellData } from '@spreadsheet-moment/agent-core';

const cell: IAgentCellData = {
  v: 'value',
  origin_id: 'abc',  // Now this works
  trace_id: 'xyz'
};
```

**Issue 3: Tests failing**

```bash
# Symptom
Tests failing with "Cannot read property of undefined"

# Solution
# Check test setup
// Ensure you're mocking dependencies correctly
jest.mock('@univerjs/core', () => ({
  // Mock implementation
}));

# Or run tests in debug mode
pnpm test --debug
```

**Issue 4: WebSocket connection failures**

```bash
# Symptom
WebSocket connection to ws://localhost:3000/ws failed

# Solution
# Check if dev server is running
pnpm --filter @univerjs-examples/base dev

# Check firewall settings
# Ensure port 3000 is not blocked

# Try different port
PORT=3001 pnpm dev
```

**Issue 5: AI provider rate limits**

```bash
# Symptom
429 Too Many Requests from AI provider

# Solution
# Implement exponential backoff
async function callWithBackoff(provider, prompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await provider.call(prompt);
    } catch (error) {
      if (error.status === 429 && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}

# Or use free tier provider (Cloudflare)
router.selectProvider({ use_free_tier: true });
```

### Debugging Checklist

When something isn't working:

- [ ] Check console for errors
- [ ] Verify all dependencies installed
- [ ] Restart development server
- [ ] Clear browser cache
- [ ] Check environment variables
- [ ] Review recent code changes
- [ ] Run tests to identify issues
- [ ] Check documentation for examples
- [ ] Ask for help in Discord

---

## Quick Reference Cards

### Trace Protocol Quick Reference

```typescript
// Generate trace
const traceId = protocol.generate('A1');

// Check collision
if (protocol.checkCollision(traceId, 'B1')) {
  // Handle collision
}

// Complete trace
protocol.complete(traceId);

// Cleanup old traces
protocol.cleanup(10 * 60 * 1000);  // 10 minutes
```

### Agent Cell States Quick Reference

```
DORMANT → THINKING → NEEDS_REVIEW → POSTED
                             ↓
                          ARCHIVED

DORMANT → THINKING → ERROR
```

### AI Provider Selection Quick Reference

```
Priority  Provider        Cost          Best For
--------  --------        -----         ---------
1         Cloudflare      FREE          Everything
2         DeepSeek        $0.014/1K     Reasoning
3         OpenAI          $0.01/1K      Quality
4         Anthropic       $0.00025/1K   Speed
```

### Common Commands Quick Reference

```bash
# Development
pnpm install              # Install dependencies
pnpm dev                  # Start dev server
pnpm build                # Build for production
pnpm test                 # Run tests
pnpm lint                 # Lint code

# Package-specific
pnpm --filter @spreadsheet-moment/agent-core dev
pnpm --filter @spreadsheet-moment/agent-ui test

# Git
git checkout -b feature/my-feature
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature
```

---

## Agent-Specific Guidance

### For AI Agents (Like Claude)

**Context Understanding:**
```
You are working on SpreadsheetMoment, an agentic spreadsheet system built on Univer.

Key Context:
- Project Location: C:\Users\casey\polln\spreadsheet-moment
- Current Phase: Planning complete, ready for implementation
- Fork Target: https://github.com/dream-num/univer
- Your Role: Architect, Developer, or Helper based on task

Important Files:
- CLAUDE.md: Project overview and status
- docs/FORK_STRATEGY.md: How to fork and integrate
- docs/AGENTIC_DESIGN.md: Technical architecture
- docs/IMPLEMENTATION_ROADMAP.md: 10-week plan
```

**Working Patterns:**

1. **Before Writing Code:**
   - Read relevant documentation
   - Check existing code patterns
   - Understand Univer's architecture
   - Review agent-* package structure

2. **When Writing Code:**
   - Follow TypeScript best practices
   - Use existing patterns from codebase
   - Add JSDoc comments for functions
   - Write tests alongside code

3. **Before Committing:**
   - Run tests: `pnpm test`
   - Run linter: `pnpm lint`
   - Build successfully: `pnpm build`
   - Review your changes

**Key Constraints:**
- Never modify Univer core packages unless absolutely necessary
- Isolate changes in agent-* packages
- Maintain compatibility with upstream Univer
- Follow conventional commit format

**Decision Authority:**
- Technical decisions: Refer to AGENTIC_DESIGN.md
- Architecture decisions: Refer to FORK_STRATEGY.md
- Timeline decisions: Refer to IMPLEMENTATION_ROADMAP.md
- When uncertain: Ask in Discord or create discussion

### For Human Agents

**First Week Goals:**
- [ ] Set up development environment
- [ ] Read all documentation
- [ ] Make first contribution
- [ ] Join team Discord
- [ ] Attend first standup

**Learning Path:**
1. Start with `packages/agent-core/` (foundation)
2. Move to `packages/agent-ui/` (visual layer)
3. Explore `packages/agent-ai/` (AI integration)
4. Review `packages/agent-formulas/` (custom functions)

**Getting Help:**
- Quick questions: Discord #general
- Technical help: Discord #development
- Bugs: GitHub Issues
- Feature requests: GitHub Discussions

---

## Best Practices

### Code Organization

**DO:**
```typescript
// ✅ Good: Clear separation of concerns
// packages/agent-core/src/services/CellManager.ts
export class CellManager {
  createCell() { /* ... */ }
  updateCell() { /* ... */ }
  deleteCell() { /* ... */ }
}

// ✅ Good: Single responsibility
// packages/agent-core/src/protocols/TraceProtocol.ts
export class TraceProtocol {
  generate() { /* ... */ }
  checkCollision() { /* ... */ }
  complete() { /* ... */ }
}
```

**DON'T:**
```typescript
// ❌ Bad: God object
export class AgentSystem {
  createCell() { /* ... */ }
  updateCell() { /* ... */ }
  deleteCell() { /* ... */ }
  generateTrace() { /* ... */ }
  checkCollision() { /* ... */ }
  routeAI() { /* ... */ }
  detectBot() { /* ... */ }
  // ... 50 more methods
}
```

### Error Handling

**DO:**
```typescript
// ✅ Good: Specific error handling
try {
  const cell = await createAgentCell(config);
} catch (error) {
  if (error instanceof ValidationError) {
    logger.warn('Validation failed', { details: error.details });
    return fallbackCell(config);
  }
  if (error instanceof APIError) {
    logger.error('API error', { endpoint: error.endpoint });
    throw new RetryableError(error);
  }
  throw error;
}
```

**DON'T:**
```typescript
// ❌ Bad: Generic error handling
try {
  const cell = await createAgentCell(config);
} catch (error) {
  console.log('Something went wrong');
  return null;
}
```

### Performance

**DO:**
```typescript
// ✅ Good: Lazy loading
export class AgentRegistry {
  private _providers?: Map<string, IAIProvider>;

  get providers(): Map<string, IAIProvider> {
    if (!this._providers) {
      this._providers = this.loadProviders();
    }
    return this._providers;
  }
}

// ✅ Good: Memoization
export function calculateHash(data: string): string {
  if (cache.has(data)) {
    return cache.get(data);
  }
  const hash = computeHash(data);
  cache.set(data, hash);
  return hash;
}
```

### Testing

**DO:**
```typescript
// ✅ Good: Arrange-Act-Assert pattern
describe('CellManager', () => {
  it('should create cell with correct defaults', () => {
    // Arrange
    const manager = new CellManager(worksheet);
    const config = { type: AgentCellType.SENSOR };

    // Act
    const cell = await manager.createCell('A1', config);

    // Assert
    expect(cell.cell_type).toBe(AgentCellType.SENSOR);
    expect(cell.state).toBe(AgentCellState.DORMANT);
  });
});
```

---

## Performance Optimization

### Profiling Checklist

- [ ] Use Chrome DevTools Performance tab
- [ ] Check for unnecessary re-renders
- [ ] Monitor memory usage
- [ ] Profile expensive functions
- [ ] Check network requests

### Optimization Strategies

**1. Virtual Scrolling (for large grids)**
```typescript
import { VirtualGrid } from '@univerjs/ui';

// Only render visible cells
<VirtualGrid
  rowCount={100000}
  columnCount={26}
  rowHeight={30}
  columnWidth={100}
  renderCell={renderCell}
/>
```

**2. Memoization (for expensive calculations)**
```typescript
import { useMemo } from 'react';

const ExpensiveComponent: FC<Props> = ({ data }) => {
  const result = useMemo(() => {
    return expensiveCalculation(data);
  }, [data]);

  return <div>{result}</div>;
};
```

**3. Lazy Loading (for heavy modules)**
```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

**4. Debouncing (for frequent updates)**
```typescript
import { debounce } from 'lodash-es';

const debouncedUpdate = debounce((value) => {
  updateCell(value);
}, 300);  // Wait 300ms after last update
```

---

## Security Considerations

### API Key Management

**DO:**
```typescript
// ✅ Good: Use environment variables
const apiKey = process.env.DEEPSEEK_API_KEY;

// ✅ Good: Validate before use
if (!apiKey) {
  throw new Error('DEEPSEEK_API_KEY not set');
}
```

**DON'T:**
```typescript
// ❌ Bad: Hardcode API keys
const apiKey = 'sk-1234567890abcdef';

// ❌ Bad: Log sensitive data
console.log('API Key:', apiKey);
```

### Input Validation

**DO:**
```typescript
// ✅ Good: Validate user input
function sanitizeCellId(cellId: string): string {
  // Remove any characters that aren't A-Z, 0-9, or :
  return cellId.replace(/[^A-Z0-9:]/gi, '');
}

// ✅ Good: Validate config
function validateConfig(config: IAgentConfig): void {
  if (!config.type) {
    throw new Error('Config must specify type');
  }
  if (!config.connection?.endpoint) {
    throw new Error('Sensor cells must have connection endpoint');
  }
}
```

### Rate Limiting

**DO:**
```typescript
// ✅ Good: Implement rate limiting
import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 'second'
});

async function callAI(prompt: string): Promise<string> {
  await limiter.removeTokens(1);
  return aiProvider.call(prompt);
}
```

---

## Debugging Techniques

### Chrome DevTools

**1. Performance Profiling**
```typescript
// Add performance marks
performance.mark('agent-start');

// Do work
await generateReasoning(cellId);

performance.mark('agent-end');
performance.measure('agent', 'agent-start', 'agent-end');

// View in DevTools > Performance
```

**2. Memory Profiling**
```typescript
// Take heap snapshot
console.log('Memory before:', performance.memory);
await processLargeDataset(cellId);
console.log('Memory after:', performance.memory);

// View in DevTools > Memory
```

**3. Network Debugging**
```typescript
// Log network requests
fetch(url, options)
  .then(response => {
    console.log('Response:', response.status);
    console.log('Headers:', response.headers);
    return response.json();
  })
  .then(data => {
    console.log('Data:', data);
  });

// View in DevTools > Network
```

### VS Code Debugging

**Launch Configuration:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Agent Core",
      "program": "${workspaceFolder}/packages/agent-core/src/index.ts",
      "runtimeArgs": ["--inspect-brk"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug in Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

### Logging Best Practices

**DO:**
```typescript
// ✅ Good: Structured logging
import logger from '@spreadsheet-moment/logger';

logger.info('Agent cell created', {
  cellId: 'A1',
  type: 'sensor',
  config: { /* ... */ }
});

logger.error('Failed to generate reasoning', {
  cellId: 'A1',
  error: error.message,
  stack: error.stack
});
```

---

## Getting Help

### Discord Channels

- **#general**: Quick questions, chat
- **#development**: Technical help, code review
- **#documentation**: Documentation improvements
- **#announcements**: Important updates

### GitHub

- **Issues**: Bug reports, feature requests
- **Discussions**: Questions, ideas, proposals
- **Pull Requests**: Code contributions

### Office Hours

- **Weekly Standup**: Tuesdays 10:00 AM PT
- **Code Review**: Thursdays 2:00 PM PT
- **Open Q&A**: Fridays 3:00 PM PT

### Emergency Contacts

- **Architecture Lead**: [Contact info]
- **Product Manager**: [Contact info]
- **DevOps Engineer**: [Contact info]

---

## Quick Reference: All Commands

### Development Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Start specific package
pnpm --filter @spreadsheet-moment/agent-core dev

# Build all packages
pnpm build

# Build specific package
pnpm --filter @spreadsheet-moment/agent-ui build

# Run all tests
pnpm test

# Run specific test file
pnpm test AgentCell.test.ts

# Watch mode
pnpm test --watch

# Coverage report
pnpm test --coverage

# Lint code
pnpm lint

# Auto-fix lint issues
pnpm lint --fix

# Type check
pnpm tsc --noEmit
```

### Git Commands

```bash
# Create feature branch
git checkout -b feature/my-feature

# Add changes
git add .
git add specific-file.ts

# Commit changes
git commit -m "feat: add my feature"

# Push to remote
git push origin feature/my-feature

# Sync with upstream Univer
git fetch upstream
git rebase upstream/main

# Resolve merge conflicts
git mergetool
git add .
git commit -m "merge: resolve conflicts"

# View git log
git log --oneline --graph --decorate

# View changes
git diff
git diff main
git diff HEAD~1
```

### Docker Commands (if applicable)

```bash
# Build container
docker build -t spreadsheet-moment .

# Run container
docker run -p 3000:3000 spreadsheet-moment

# View logs
docker logs -f container-id

# Execute command in container
docker exec -it container-id bash
```

---

## Appendix: Quick Reference Cards (Printable)

### Card 1: Agent Cell Types

```
┌─────────────────────────────────────┐
│     AGENT CELL TYPES               │
├─────────────────────────────────────┤
│ SENSOR      → Read external data    │
│ ANALYZER    → Process with ML        │
│ CONTROLLER  → Send commands         │
│ ORCHESTRATOR → Coordinate cells      │
└─────────────────────────────────────┘
```

### Card 2: Cell States

```
┌─────────────────────────────────────┐
│       CELL STATE MACHINE           │
├─────────────────────────────────────┤
│ DORMANT → THINKING → NEEDS_REVIEW  │
│                          ↓         │
│                        POSTED      │
│                          ↑         │
│                        ARCHIVED     │
│                                     │
│ DORMANT → THINKING → ERROR         │
└─────────────────────────────────────┘
```

### Card 3: AI Provider Priority

```
┌─────────────────────────────────────┐
│      AI PROVIDER SELECTION         │
├─────────────────────────────────────┤
│ 1. Cloudflare   FREE   (always)     │
│ 2. DeepSeek     $0.014 (reasoning) │
│ 3. OpenAI       $0.01  (quality)    │
│ 4. Anthropic    $0.00025 (speed)    │
└─────────────────────────────────────┘
```

### Card 4: Common Commands

```
┌─────────────────────────────────────┐
│      DEVELOPMENT COMMANDS          │
├─────────────────────────────────────┤
│ pnpm install    Install deps        │
│ pnpm dev        Start server        │
│ pnpm build      Build for prod      │
│ pnpm test       Run tests           │
│ pnpm lint       Lint code           │
└─────────────────────────────────────┘
```

---

**Last Updated:** 2026-03-15
**Version:** 2.0 (Expanded Edition)
**Maintained By:** SpreadsheetMoment Team

---

## Document Index

- **ONBOARDING.md**: This file - Comprehensive onboarding guide
- **ONBOARDING_COMPANION.md**: Quick reference and cheat sheets
- **ARCHITECTURE.md**: Detailed system architecture
- **API_REFERENCE.md**: Complete API documentation
- **TROUBLESHOOTING.md**: Common issues and solutions

**Need Help?** Start here, then check Discord or GitHub Discussions!
