# POLLN Spreadsheet MVP - Developer Quick Start

**"First Open-Source Spreadsheet AI You Can INSPECT"**

---

## 🚀 Quick Start (5 Minutes)

```bash
# Clone the repository
git clone https://github.com/SuperInstance/polln.git
cd polln

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

---

## 📁 Project Structure

```
polln/
├── docs/
│   └── research/
│       └── spreadsheet/          # Spreadsheet research & planning
│           ├── MVP_PLAN.md       # Comprehensive 50-page plan
│           ├── MVP_PLAN_SUMMARY.md       # Executive summary
│           ├── MVP_ROADMAP_VISUAL.md     # Visual roadmap
│           └── MVP_DEV_QUICKSTART.md     # This file
│
├── src/
│   ├── core/                    # POLLN core library
│   │   ├── agent.ts            # BaseAgent class
│   │   ├── colony.ts           # Colony management
│   │   ├── decision.ts         # Plinko decision engine
│   │   ├── learning.ts         # Hebbian learning
│   │   ├── communication.ts    # A2A packages
│   │   └── ...
│   │
│   ├── spreadsheet/            # 🆕 Spreadsheet integration (NEW)
│   │   ├── excel/             # Excel add-in
│   │   │   ├── add-in.ts      # Office.js integration
│   │   │   ├── functions.ts   # Custom functions (=AGENT)
│   │   │   ├── ui/            # Ribbon, task pane, inspector
│   │   │   └── manifest.xml   # Add-in manifest
│   │   │
│   │   ├── runtime/           # Browser runtime
│   │   │   ├── agent-manager.ts   # Agent lifecycle
│   │   │   ├── storage.ts         # IndexedDB persistence
│   │   │   ├── learning.ts        # Learning pipeline
│   │   │   └── decision-engine.ts # Plinko in browser
│   │   │
│   │   └── shared/            # Shared utilities
│   │       ├── types.ts       # Spreadsheet-specific types
│   │       ├── constants.ts   # Configuration
│   │       └── utils.ts       # Helper functions
│   │
│   └── api/                    # POLLN API server (future)
│       └── ...
│
├── examples/                   # Example spreadsheets
│   └── spreadsheet/
│       ├── basic-agent.xlsx
│       ├── sales-analysis.xlsx
│       └── ...
│
└── tests/                      # Test suites
    ├── spreadsheet/
    │   ├── unit/              # Unit tests
    │   ├── integration/       # Integration tests
    │   └── e2e/               # End-to-end tests
    │
    └── ...
```

---

## 🎯 MVP Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     EXCEL INTERFACE                         │
│  =AGENT("analyze", A1:A100)  →  Agent Cell                 │
│  Double-click               →  Inspector Panel             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              SPREADSHEET RUNTIME (Browser)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Agent Runtime (src/spreadsheet/runtime/)            │   │
│  │  • Agent Manager (lifecycle, state)                 │   │
│  │  • Decision Engine (Plinko)                         │   │
│  │  • Learning Pipeline (observation → training)       │   │
│  │  • Safety Layer (constraints, emergency stops)      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Storage Layer (IndexedDB)                           │   │
│  │  • Agents (state, config)                           │   │
│  │  • A2A Packages (communication history)             │   │
│  │  • Templates (user-created)                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Excel Integration (src/spreadsheet/excel/)          │   │
│  │  • Office.js API bindings                           │   │
│  │  • Custom functions (=AGENT, =INSPECT)             │   │
│  │  • Ribbon UI, Task Pane, Inspector                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   POLLN CORE (src/core/)                    │
│  • BaseAgent, Colony, PlinkoLayer                           │
│  • A2A Package System, BES Embeddings                       │
│  • Hebbian Learning, Graph Evolution                        │
│  • META Tiles, Value Network, Dreaming                     │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Agent Runtime (`src/spreadsheet/runtime/`)

**Agent Manager** (`agent-manager.ts`)
```typescript
class SpreadsheetAgentManager {
  // Create new agent
  createAgent(config: AgentConfig): Promise<Agent>

  // Execute agent task
  executeAgent(agentId: string, input: any): Promise<AgentResult>

  // Get agent state
  getAgent(agentId: string): Agent

  // Update agent (learning)
  updateAgent(agentId: string, updates: AgentUpdate): Promise<void>

  // Delete agent
  deleteAgent(agentId: string): Promise<void>
}
```

**Decision Engine** (`decision-engine.ts`)
```typescript
class SpreadsheetDecisionEngine {
  // Select action using Plinko
  decide(agent: Agent, context: Context): Decision

  // Update weights based on feedback
  learn(decision: Decision, reward: number): void
}
```

**Learning Pipeline** (`learning.ts`)
```typescript
class SpreadsheetLearningPipeline {
  // Observe user actions
  observe(action: UserAction): void

  // Detect patterns
  detectPatterns(): Pattern[]

  // Train agent from observations
  trainAgent(pattern: Pattern): Promise<Agent>

  // Validate trained agent
  validate(agent: Agent, testData: TestData): ValidationResult
}
```

#### 2. Excel Integration (`src/spreadsheet/excel/`)

**Custom Functions** (`functions.ts`)
```typescript
// Register custom function
Excel.ScriptCustomFunctions.register("AGENT", agentFunction);

async function agentFunction(task: string, range: Excel.Range) {
  // 1. Get or create agent for task
  const agent = await agentManager.getOrCreateAgent(task);

  // 2. Execute agent on range data
  const result = await agentManager.executeAgent(agent.id, range.values);

  // 3. Return result to Excel
  return result.output;
}
```

**Inspector Panel** (`ui/inspector.ts`)
```typescript
class AgentInspectorPanel {
  // Show agent details
  inspect(agentId: string): void

  // Display reasoning trace
  showTrace(trace: ReasoningTrace): void

  // Show confidence score
  showConfidence(score: number): void

  // Display cost savings
  showSavings(savings: CostSavings): void

  // Enable simulation mode
  enableSimulation(agentId: string): void
}
```

#### 3. Storage Layer (`src/spreadsheet/runtime/storage.ts`)

```typescript
class IndexedDBStorage {
  // Save agent state
  saveAgent(agent: Agent): Promise<void>

  // Load agent state
  loadAgent(agentId: string): Promise<Agent>

  // Save A2A package
  savePackage(pkg: A2APackage): Promise<void>

  // Load A2A packages
  loadPackages(agentId: string): Promise<A2APackage[]>

  // Save template
  saveTemplate(template: Template): Promise<void>

  // Load templates
  loadTemplates(): Promise<Template[]>
}
```

---

## 🔧 Development Workflow

### 1. Set Up Development Environment

```bash
# Install Node.js dependencies
npm install

# Install Excel add-in development tools
npm install -g office-addin-manifest
npm install -g office-addin-debugging

# Install testing dependencies
npm install -g jest
npm install -g @playwright/test
```

### 2. Run Development Server

```bash
# Start development server (hot reload)
npm run dev

# Start Excel with debugging
npm run excel:debug
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run spreadsheet tests only
npm test -- spreadsheet

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### 4. Build for Production

```bash
# Build TypeScript
npm run build

# Build Excel add-in package
npm run build:addin

# Package for distribution
npm run package
```

### 5. Debug in Excel

```bash
# Sideloading (Windows)
npm run sideload:win

# Sideloading (Mac)
npm run sideload:mac

# Sideloading (Web)
npm run sideload:web
```

---

## 📝 Coding Standards

### TypeScript Guidelines

```typescript
// Use strict type checking
"use strict";

// Use ES modules
import { BaseAgent } from '@polln/core';

// Use async/await for promises
async function executeAgent(agentId: string): Promise<AgentResult> {
  const agent = await agentManager.getAgent(agentId);
  return await agent.execute();
}

// Use JSDoc for documentation
/**
 * Creates a new agent with the specified configuration
 * @param config - Agent configuration
 * @returns Promise<Agent> - The created agent
 */
async function createAgent(config: AgentConfig): Promise<Agent> {
  // ...
}

// Use enums for constants
enum AgentState {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

### Testing Guidelines

```typescript
// Unit test example
describe('SpreadsheetAgentManager', () => {
  let manager: SpreadsheetAgentManager;

  beforeEach(() => {
    manager = new SpreadsheetAgentManager();
  });

  it('should create agent with valid config', async () => {
    const config: AgentConfig = {
      name: 'TestAgent',
      task: 'analyze',
      type: AgentType.TASK
    };

    const agent = await manager.createAgent(config);

    expect(agent).toBeDefined();
    expect(agent.name).toBe('TestAgent');
  });

  it('should execute agent and return result', async () => {
    const agent = await manager.createAgent(testConfig);
    const result = await manager.executeAgent(agent.id, testData);

    expect(result).toBeDefined();
    expect(result.output).toBeDefined();
  });
});

// Integration test example
describe('Excel Integration', () => {
  it('should register custom function', async () => {
    await Excel.run(async (context) => {
      const functions = context.workbook.functions;
      await context.sync();

      expect(functions.items).toContain('AGENT');
    });
  });
});
```

---

## 🎨 UI Development

### Inspector Panel Structure

```typescript
// Inspector panel state
interface InspectorState {
  agentId: string;
  agentName: string;
  confidence: number;
  reasoningTrace: ReasoningStep[];
  costSavings: CostSavings;
  simulationEnabled: boolean;
}

// Inspector panel component
class InspectorPanel {
  private state: InspectorState;

  render() {
    return `
      <div class="inspector-panel">
        <div class="agent-header">
          <h2>${this.state.agentName}</h2>
          <div class="confidence">
            ${this.renderConfidence(this.state.confidence)}
          </div>
        </div>

        <div class="reasoning-trace">
          ${this.renderReasoningTrace(this.state.reasoningTrace)}
        </div>

        <div class="cost-savings">
          ${this.renderCostSavings(this.state.costSavings)}
        </div>

        ${this.state.simulationEnabled ?
          this.renderSimulationControls() : ''}
      </div>
    `;
  }

  private renderConfidence(score: number): string {
    const percentage = Math.round(score * 100);
    const color = score > 0.9 ? 'green' : score > 0.7 ? 'yellow' : 'red';
    return `<div class="confidence-badge" style="background: ${color}">
              ${percentage}% confident
            </div>`;
  }
}
```

---

## 🔄 Debugging

### Common Issues

**Issue**: Agent not appearing in Excel
```bash
# Solution: Check custom function registration
npm run debug:functions

# Verify function is registered
# In Excel: Formulas > Insert Function > POLLN > AGENT
```

**Issue**: IndexedDB storage failing
```bash
# Solution: Clear browser data
npm run debug:clear-storage

# Check IndexedDB usage
npm run debug:storage-stats
```

**Issue**: Performance problems
```bash
# Solution: Profile agent execution
npm run debug:profile

# Check memory usage
npm run debug:memory
```

### Debug Tools

```bash
# Chrome DevTools (Windows)
# 1. Open Excel
# 2. Navigate to task pane
# 3. Press F12 (DevTools)
# 4. Check Console, Network, Performance tabs

# Safari DevTools (Mac)
# 1. Open Safari
# 2. Develop > Show JavaScript Console
# 3. Select Excel process

# Visual Studio Code Debugger
# 1. Set breakpoints in TypeScript
# 2. Press F5 to start debugging
# 3. Attach to Excel process
```

---

## 📚 Resources

### Documentation
- [POLLN Architecture](../../ARCHITECTURE.md)
- [POLLN Core README](../../README.md)
- [Excel JavaScript API](https://learn.microsoft.com/en-us/javascript/api/excel)
- [Office Add-ins Documentation](https://learn.microsoft.com/en-us/office/dev/add-ins/)

### Community
- [Discord Server](https://discord.gg/polln)
- [GitHub Discussions](https://github.com/SuperInstance/polln/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/polln)

### Development Tools
- [TypeScript](https://www.typescriptlang.org/)
- [Office Add-in CLI](https://learn.microsoft.com/en-us/office/dev/add-ins/overview/office-add-in-cli)
- [Jest](https://jestjs.io/)
- [Playwright](https://playwright.dev/)

---

## 🚦 Next Steps

### Week 1 Tasks
- [ ] Set up development environment
- [ ] Create `src/spreadsheet/` directory structure
- [ ] Implement basic `AgentManager` class
- [ ] Set up IndexedDB storage layer
- [ ] Write first unit tests

### Week 2 Tasks
- [ ] Integrate Office.js API
- [ ] Register custom `=AGENT()` function
- [ ] Build basic ribbon UI
- [ ] Create task pane component
- [ ] Test in Excel (sideloading)

### Week 3 Tasks
- [ ] Implement decision engine (Plinko)
- [ ] Build learning pipeline
- [ ] Create inspector panel
- [ ] Add confidence scoring
- [ ] Integration tests

### Week 4 Tasks
- [ ] Create 5 starter templates
- [ ] Build tutorial walkthrough
- [ ] Write documentation
- [ ] Performance optimization
- [ ] Security review

---

## 🤝 Contributing

### How to Contribute

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/polln.git
   cd polln
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow coding standards
   - Add tests for new features
   - Update documentation

4. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a pull request**
   - Describe your changes
   - Reference related issues
   - Request review from maintainers

### Contribution Guidelines

- **Be respectful**: Treat all contributors with kindness
- **Be constructive**: Provide helpful feedback on PRs
- **Be thorough**: Test your changes before submitting
- **Be patient**: Maintainers will review when available

---

**Document Version**: 1.0
**Last Updated**: 2026-03-08
**Status**: ✅ Ready for development

---

*Let's build understandable AI together. One spreadsheet at a time.* 🐝
