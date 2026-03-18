# SpreadsheetMoment Team Onboarding Guide

**Welcome to the SpreadsheetMoment team!** We're rebuilding the project on the Univer foundation to create the most advanced agentic spreadsheet system in existence.

---

## Table of Contents

1. [Welcome](#welcome)
2. [What We're Building](#what-were-building)
3. [Why Univer](#why-univer)
4. [Architecture Overview](#architecture-overview)
5. [Development Setup](#development-setup)
6. [Understanding the Agentic Layer](#understanding-the-agentic-layer)
7. [Contribution Guidelines](#contribution-guidelines)
8. [Development Workflow](#development-workflow)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Resources](#resources)

---

## Welcome

### Your Role

You're joining a team that's building something revolutionary: **spreadsheet cells that think**. Every cell in our system can be an intelligent agent with:

- **Visual Thinking**: See AI reasoning step-by-step before actions
- **Human-in-the-Loop**: Approve or reject agent actions
- **Origin-Centric Design**: Prevents recursive loops in cell dependencies
- **Agent Handshake**: Auto-filters bot-to-bot interactions
- **Intelligent API Routing**: Always uses the cheapest AI provider first

### Our Mission

Transform the familiar spreadsheet interface into a powerful distributed system builder where:
- Every cell can connect to hardware, APIs, and databases
- Cells coordinate using distributed consensus protocols
- Machine learning models run directly in cells
- Applications deploy autonomously

**Built on Univer** - a production-tested spreadsheet engine used by thousands of developers.

---

## What We're Building

### The Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│                  SpreadsheetMoment                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Univer Foundation                        │   │
│  │  • Canvas-based rendering (100K+ cells)              │   │
│  │  • Formula engine with dependency graphs             │   │
│  │  • Plugin architecture for extensibility            │   │
│  │  • TypeScript with excellent type safety             │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ▲                                    │
│                         │                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Agentic Intelligence Layer                  │   │
│  │  • Origin-Centric Design (recursive loop prevention) │   │
│  │  • Visual Thinking (step-by-step reasoning)          │   │
│  │  • Human-in-the-Loop (approve/reject actions)        │   │
│  │  • Agent Handshake (bot detection & filtering)       │   │
│  │  • Intelligent API Routing (cost optimization)       │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           AI Provider Layer                           │   │
│  │  • Cloudflare Workers AI (FREE - 10K requests/day)   │   │
│  │  • DeepSeek ($0.014/1K tokens - reasoning)           │   │
│  │  • OpenAI GPT-4 ($0.01/1K tokens - quality)          │   │
│  │  • Anthropic Claude ($0.00025/1K tokens - fast)      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

**1. Agent Cell Types**
- **Sensor Cells**: Connect to hardware, APIs, databases
- **Analyzer Cells**: Process data with ML models
- **Controller Cells**: Send commands to external systems
- **Orchestrator Cells**: Coordinate multiple cells

**2. Visual Thinking**
```
Cell A1: "What's the weather in Tokyo?"

🤔 Thinking...
  → Step 1: Identify need for weather data
  → Step 2: Call Weather API for Tokyo
  → Step 3: Parse response (22°C, sunny)
  → Step 4: Format as "22°C, Sunny in Tokyo"

✅ Ready to post value
[Approve] [Reject]
```

**3. Human-in-the-Loop (HITL)**
- Cells generate reasoning before acting
- Users approve or reject actions
- Approved actions execute automatically
- Rejected actions archive reasoning for review

**4. Origin-Centric Design**
- Each cell has unique `origin_id`
- Trace Protocol tracks operation paths
- Detects and blocks recursive loops
- Coordinate Keys for spatial references

---

## Why Univer

### The Problem We Solved

**Previous Approach:**
- Building custom spreadsheet engine from scratch
- Reinventing basic features (sorting, filtering, formulas)
- Unstable foundation for advanced features
- Years of development needed

**New Approach (Univer):**
- Fork production-tested spreadsheet engine
- 100K+ cells supported out of the box
- Robust formula engine with dependency graphs
- Plugin architecture for clean extensions
- Active community and regular updates

### Univer's Strengths

**1. Architecture**
```typescript
// Plugin-based with dependency injection
Univer {
  Plugin: Dependency injection container
  Command: Undo/redo command pattern
  Hook: Lifecycle hooks for extensions
}
```

**2. Performance**
- Canvas rendering (not DOM-based)
- Virtual scrolling for large grids
- Lazy evaluation of formulas
- Worker threads for heavy computation

**3. Extensibility**
```typescript
// Register custom formula functions
registerFunction({
  id: 'AGENT.THINK',
  handler: async (params) => {
    return await callAIWithThinking(params);
  }
});

// Register custom commands
registerCommand({
  id: 'agent.approve',
  handler: async (accessor, params) => {
    // HITL approval workflow
  }
});
```

**4. Type Safety**
- Full TypeScript implementation
- Excellent IDE autocomplete
- Compile-time error detection
- Easy refactoring

---

## Architecture Overview

### Project Structure

```
spreadsheet-moment/              # Forked from Univer
├── packages/
│   ├── engine/                  # Core engine (Univer)
│   ├── docs/                    # Documentation (Univer)
│   ├── graphql/                 # GraphQL API (Univer)
│   ├── cli/                     # CLI tools (Univer)
│   │
│   # NEW: Our Agentic Layer
│   ├── agent-core/              # Agent cell system
│   │   ├── src/
│   │   │   ├── origin-centric.ts      # Origin-Centric Design
│   │   │   ├── trace-protocol.ts      # Trace collision detection
│   │   │   ├── agent-cell-model.ts    # Cell data model
│   │   │   └── agent-states.ts        # State machine
│   │   └── README.md
│   │
│   ├── agent-ui/                 # Visual Thinking UI
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ReasoningPanel.tsx      # Thinking display
│   │   │   │   ├── HITLButtons.tsx         # Approve/reject
│   │   │   │   ├── CellRenderer.tsx        # Agent cell renderer
│   │   │   │   └── AgentConfigPanel.tsx    # Configuration
│   │   │   └── plugins/
│   │   │       ├── AgentCellPlugin.ts      # Univer plugin
│   │   │       └── ReasoningPlugin.ts      # UI plugin
│   │   └── README.md
│   │
│   ├── agent-ai/                # AI integration
│   │   ├── src/
│   │   │   ├── providers/
│   │   │   │   ├── cloudflare.ts           # Workers AI (free)
│   │   │   │   ├── deepseek.ts             # DeepSeek API
│   │   │   │   ├── openai.ts               # OpenAI API
│   │   │   │   └── anthropic.ts            # Anthropic API
│   │   │   ├── routing.ts                  # Intelligent routing
│   │   │   ├── cost-tracker.ts             # Usage tracking
│   │   │   └── agent-handshake.ts          # Bot detection
│   │   └── README.md
│   │
│   └── agent-formulas/           # Custom formula functions
│       ├── src/
│       │   ├── agent-think.ts            # =AGENT.THINK()
│       │   ├── agent-learn.ts            # =AGENT.LEARN()
│       │   ├── agent-coordinate.ts       # =AGENT.COORDINATE()
│       │   └── agent-predict.ts          # =AGENT.PREDICT()
│       └── README.md
│
├── cloudflare/                   # Cloudflare Workers deployment
│   ├── worker.js                 # Intelligent API routing
│   ├── wrangler.toml             # Workers configuration
│   └── DEPLOY.md                 # One-click deploy guide
│
└── docs/                         # Documentation
    ├── ONBOARDING.md             # This file
    ├── ARCHITECTURE.md           # System architecture
    └── API_REFERENCE.md          # Agent API docs
```

### Key Concepts

**Origin-Centric Design (OCD)**
- Traditional spreadsheets use reference-based logic (A1 references B1)
- OCD uses source-based logic (A1 originates from source X)
- Prevents recursive loops in complex dependency graphs
- Trace Protocol tracks operation paths and detects collisions

**Trace Protocol**
```typescript
// Every operation gets a trace ID
const traceId = `trace_${timestamp}_${random}_${originId}`;

// Track the path of operations
trace.path = [originId, dependent1, dependent2, ...];

// Check for recursive loops
if (trace.path.includes(currentCell)) {
  // Block recursive update
  return false;
}
```

**Agent Handshake Protocol**
- Detects bot-to-bot interactions (wastes resources)
- Signature recognition: "agent", "bot", "claude", "gpt"
- JSON protocol detection
- Auto-archives detected interactions

---

## Development Setup

### Prerequisites

**Required:**
- Node.js 18+ (LTS recommended)
- pnpm 8+ (Univer uses pnpm workspaces)
- Git
- Code editor (VS Code recommended)

**Optional:**
- Cloudflare account (for deployment)
- DeepSeek API key (for reasoning tasks)
- OpenAI/Anthropic API keys (for fallback)

### Clone and Setup

```bash
# 1. Clone the repository
git clone https://github.com/SuperInstance/spreadsheet-moment.git
cd spreadsheet-moment

# 2. Install pnpm (if not installed)
npm install -g pnpm

# 3. Install dependencies
pnpm install

# 4. Start development server
pnpm --filter @univerjs-examples/base run dev

# 5. Open browser
# Navigate to http://localhost:3000
```

### VS Code Setup

**Recommended Extensions:**
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "usernamehw.errorlens",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

**Settings (.vscode/settings.json):**
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### Environment Variables

Create `.env.local` in root:
```bash
# Cloudflare (FREE tier - no cost)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# DeepSeek (Optional - for reasoning tasks)
DEEPSEEK_API_KEY=your_deepseek_key

# OpenAI (Optional - fallback)
OPENAI_API_KEY=your_openai_key

# Anthropic (Optional - fallback)
ANTHROPIC_API_KEY=your_anthropic_key
```

---

## Understanding the Agentic Layer

### Cell State Model

Every agent cell has:

```typescript
interface AgentCell {
  // Univer base properties
  row: number;
  col: number;
  value: string | number;

  // Agentic extensions
  origin_id: string;           // Unique identifier
  trace_id: string;            // Operation tracking
  cell_type: AgentCellType;    // 'sensor' | 'analyzer' | 'controller' | 'orchestrator'
  state: CellState;            // 'DORMANT' | 'THINKING' | 'NEEDS_REVIEW' | 'POSTED' | 'ARCHIVED' | 'ERROR'

  // Visual Thinking
  reasoning: string[];         // Step-by-step reasoning
  memory: string[];            // Persistent memory
  procedures: string[];        // Learned procedures

  // HITL workflow
  requires_approval: boolean;  // Needs human approval
  approved_actions: Action[];  // Approved actions queue
}
```

### State Machine

```
DORMANT ←───────┐
   │            │
   │ (trigger)  │ (archive)
   ▼            │
THINKING ────→ NEEDS_REVIEW
   │            │
   │            │ (approve)  (reject)
   │            ▼            ▼
   │         POSTED ←─── ARCHIVED
   │            │
   │            │ (complete)
   └────────────┘
```

### Visual Thinking Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ Cell A1: "Analyze sales data and predict next month"      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 🤔 THINKING                                                 │
│                                                              │
│ Step 1: Identify data sources                               │
│   → Found sales data in range B2:B100                       │
│                                                              │
│ Step 2: Load and preprocess data                            │
│   → Read 99 rows, cleaned null values                       │
│   → Extracted month-over-month trends                       │
│                                                              │
│ Step 3: Apply prediction model                              │
│   → Using linear regression on past 6 months                │
│   → Confidence: 87%                                         │
│                                                              │
│ Step 4: Generate prediction                                 │
│   → Predicted: $45,230 (95% CI: $42K-$48K)                  │
│                                                              │
│ Step 5: Format output                                       │
│   → "$45,230 predicted for next month"                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ ✅ NEEDS_REVIEW                                             │
│                                                              │
│ Predicted value: $45,230                                    │
│ Confidence: 87%                                             │
│                                                              │
│ [Approve] [Reject] [View Details]                           │
└─────────────────────────────────────────────────────────────┘
                            │
                   ┌────────┴────────┐
                   │                 │
                   ▼                 ▼
              [Approve]         [Reject]
                   │                 │
                   ▼                 ▼
              POSTED           ARCHIVED
                   │                 │
                   ▼                 ▼
          Value written     Reasoning saved
          to cell A1        for review
```

---

## Contribution Guidelines

### Code Style

**TypeScript:**
- Use strict type checking
- Prefer interfaces over types for public APIs
- Use `readonly` for immutable properties
- Document complex functions with JSDoc

**React Components:**
- Functional components with hooks
- TypeScript props interfaces
- Memoization for expensive computations
- Error boundaries for resilience

**File Naming:**
- Components: PascalCase (`ReasoningPanel.tsx`)
- Utilities: camelCase (`traceProtocol.ts`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- Tests: `.test.ts` or `.spec.ts` suffix

### Commit Messages

Follow conventional commits:

```bash
# Format
<type>(<scope>): <description>

[optional body]

[optional footer]

# Types
feat:     New feature
fix:      Bug fix
docs:     Documentation changes
style:    Code style changes (formatting)
refactor: Code refactoring
perf:     Performance improvements
test:     Adding or updating tests
chore:    Build process or tooling changes

# Examples
feat(agent-core): implement trace protocol collision detection
fix(agent-ui): resolve reasoning panel rendering bug
docs(onboarding): add architecture diagrams
perf(agent-ai): cache AI provider selections
```

### Pull Request Process

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test**
   ```bash
   pnpm test
   pnpm lint
   pnpm build
   ```

3. **Commit with conventional messages**
   ```bash
   git commit -m "feat(agent-core): add origin-centric design"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create PR on GitHub
   ```

5. **PR Description Template**
   ```markdown
   ## Summary
   Brief description of changes

   ## Type
   - [ ] Feature
   - [ ] Bug fix
   - [ ] Documentation
   - [ ] Refactoring
   - [ ] Performance

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests added/updated
   - [ ] Manual testing completed

   ## Breaking Changes
   - [ ] None
   - [ ] Yes (describe)

   ## Related Issues
   Closes #issue_number
   ```

### Code Review Guidelines

**For Reviewers:**
- Be constructive and specific
- Explain reasoning for suggestions
- Approve if minor issues can be fixed in follow-up
- Request changes for significant issues

**For Authors:**
- Address all review comments
- Mark comments as resolved when addressed
- Push follow-up commits to same branch

---

## Development Workflow

### Branch Strategy

```
main (protected)
  ├── feature/agent-layer (current work)
  ├── feature/visual-thinking
  ├── feature/hitl-workflow
  └── feature/api-routing
```

**Rules:**
- `main` is protected (requires PR approval)
- Feature branches from `main`
- Delete feature branches after merge
- Keep PRs focused and small

### Syncing with Univer Upstream

We need to stay in sync with Univer:

```bash
# 1. Add upstream (one time)
git remote add upstream https://github.com/dream-num/univer.git

# 2. Fetch upstream changes
git fetch upstream

# 3. Merge upstream main into our main
git checkout main
git merge upstream/main

# 4. Resolve conflicts
# Univer changes take priority in core packages
# Our changes are isolated in agent-* packages

# 5. Push updated main
git push origin main

# 6. Rebase your feature branch
git checkout feature/your-feature
git rebase main
```

### Testing Strategy

**Unit Tests:**
```bash
# Run all unit tests
pnpm test

# Run specific package tests
pnpm --filter @spreadsheet-moment/agent-core test

# Watch mode
pnpm test --watch

# Coverage
pnpm test --coverage
```

**Integration Tests:**
```bash
# Run integration tests
pnpm test:integration

# Run specific test file
pnpm test trace-protocol.test.ts
```

**E2E Tests:**
```bash
# Run E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e --ui
```

### Debugging

**VS Code Debugger:**
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
      "console": "integratedTerminal"
    }
  ]
}
```

**Chrome DevTools:**
- Open browser DevTools (F12)
- Go to Sources tab
- Set breakpoints in TypeScript files
- Reload to hit breakpoints

---

## Testing

### Test Categories

**1. Unit Tests**
- Test individual functions and classes
- Mock external dependencies
- Fast execution (<1ms per test)

**Example:**
```typescript
describe('TraceProtocol', () => {
  it('should detect recursive loops', () => {
    const protocol = new TraceProtocol();
    const traceId = protocol.generate('A1');

    // Simulate A1 → B1 → C1 → A1 (loop)
    protocol.addToPath(traceId, 'B1');
    protocol.addToPath(traceId, 'C1');

    const hasCollision = protocol.checkCollision(traceId, 'A1');
    expect(hasCollision).toBe(true);
  });
});
```

**2. Integration Tests**
- Test multiple components together
- Use real dependencies where possible
- Test full workflows

**Example:**
```typescript
describe('Agent Cell Workflow', () => {
  it('should complete thinking to posted flow', async () => {
    const cell = await createAgentCell('A1', 'sensor', mockConfig);

    // Cell should start in THINKING state
    expect(cell.state).toBe('THINKING');

    // Wait for reasoning to complete
    await waitForState(cell, 'NEEDS_REVIEW');

    // Approve action
    await approveAction(cell);

    // Cell should be POSTED
    expect(cell.state).toBe('POSTED');
  });
});
```

**3. E2E Tests**
- Test full user workflows
- Use Playwright or Cypress
- Test real browser interactions

**Example:**
```typescript
test('user creates and approves agent cell', async ({ page }) => {
  await page.goto('/spreadsheet');

  // Create agent cell
  await page.click('[data-cell="A1"]');
  await page.click('[data-action="create-agent"]');

  // Configure cell
  await page.fill('[data-field="type"]', 'sensor');
  await page.click('[data-action="save"]');

  // Wait for thinking
  await page.waitForSelector('[data-state="THINKING"]');

  // Approve action
  await page.click('[data-action="approve"]');

  // Verify posted
  await page.waitForSelector('[data-state="POSTED"]');
});
```

### Test Coverage Goals

- **Unit tests**: 80%+ coverage
- **Integration tests**: Key workflows covered
- **E2E tests**: Critical user paths covered

---

## Deployment

### Local Deployment

```bash
# Build for production
pnpm build

# Run production server locally
pnpm start
```

### Cloudflare Workers Deployment

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy worker
cd cloudflare
wrangler publish

# View logs
wrangler tail
```

### Environment-Specific Deployments

**Development:**
- Deployed to `dev.spreadsheet-moment.pages.dev`
- Auto-deploy on push to `develop` branch

**Staging:**
- Deployed to `staging.spreadsheet-moment.pages.dev`
- Auto-deploy on push to `staging` branch

**Production:**
- Deployed to `spreadsheet-moment.pages.dev`
- Manual deployment after approval

---

## Resources

### Internal Documentation

- [CLAUDE.md](../CLAUDE.md) - Project overview and status
- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed system architecture
- [API_REFERENCE.md](API_REFERENCE.md) - Complete API documentation

### Univer Resources

- [Univer GitHub](https://github.com/dream-num/univer) - Upstream repository
- [Univer Docs](https://univerjs.com) - Official documentation
- [Univer Examples](https://github.com/dream-num/univer/tree/main/packages/examples) - Example implementations

### SuperInstance Research

- [SuperInstance Papers](https://github.com/SuperInstance/SuperInstance-papers) - Research papers (P01-P65)
- [Origin-Centric Design](../papers/phase4/) - P41-P47 papers
- [SE(3)-Equivariant Consensus](../papers/phase2/) - P11-P20 papers

### External Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [pnpm Documentation](https://pnpm.io/)

### Community

- [GitHub Issues](https://github.com/SuperInstance/spreadsheet-moment/issues) - Bug reports and feature requests
- [GitHub Discussions](https://github.com/SuperInstance/spreadsheet-moment/discussions) - Q&A and discussions
- [Discord Server](https://discord.gg/superinstance) - Real-time chat

---

## Getting Help

### First Steps

1. **Read this guide** (you're here!)
2. **Explore the codebase** - Start with `packages/agent-core/`
3. **Set up your environment** - Follow Development Setup above
4. **Make your first change** - Fix a small issue or add a test
5. **Submit a PR** - Get familiar with the process

### Ask Questions

- **GitHub Discussions** - For questions and ideas
- **Discord** - For real-time help
- **GitHub Issues** - For bugs and feature requests

### Office Hours

- **Weekly standup** - Tuesdays at 10:00 AM PT
- **Code review** - Thursdays at 2:00 PM PT
- **Open Q&A** - Fridays at 3:00 PM PT

---

## Welcome Aboard!

We're excited to have you on the team. You're joining at a pivotal moment as we rebuild SpreadsheetMoment on the Univer foundation. This is a unique opportunity to:

- Work on cutting-edge agentic AI
- Build production software used by thousands
- Contribute to open source
- Learn from experienced engineers

**Your first week checklist:**
- [ ] Read this onboarding guide
- [ ] Set up development environment
- [ ] Explore the codebase
- [ ] Make your first commit
- [ ] Join our Discord server
- [ ] Attend your first standup

**Questions?** Don't hesitate to reach out. We're here to help you succeed!

---

**Last Updated:** 2026-03-15
**Version:** 1.0
**Maintained By:** SpreadsheetMoment Team
