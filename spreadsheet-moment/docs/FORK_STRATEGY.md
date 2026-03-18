# SpreadsheetMoment - Univer Fork & Integration Strategy

**Document Version:** 1.0
**Last Updated:** 2026-03-15
**Status:** Phase 0 - Planning

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Fork Approach](#fork-approach)
3. [Upstream Sync Strategy](#upstream-sync-strategy)
4. [Integration Architecture](#integration-architecture)
5. [Package Structure](#package-structure)
6. [Development Workflow](#development-workflow)
7. [Migration Path](#migration-path)
8. [Risk Mitigation](#risk-mitigation)

---

## Executive Summary

### Decision: Fork Univer

After careful analysis, we've decided to **fork Univer** rather than build from scratch or create a thin wrapper.

**Rationale:**
- Univer provides a production-tested foundation
- Plugin architecture allows clean extensions
- Active community and regular updates
- 100K+ cells supported out of the box
- Years of development already done

**Our Value Add:**
- Agentic intelligence layer (Origin-Centric Design, Visual Thinking)
- Intelligent API routing (Cloudflare → DeepSeek → OpenAI → Anthropic)
- Human-in-the-loop workflow
- Agent Handshake Protocol
- One-click deployment for users

### Fork Strategy Summary

```
Univer (Upstream)
         │
         │ fork
         ▼
SpreadsheetMoment (Our Fork)
  ├── Core packages (sync with upstream)
  └── Agent packages (our additions)
```

**Key Principle:** Isolate our changes in separate packages to minimize merge conflicts with upstream.

---

## Fork Approach

### Step 1: Initial Fork

```bash
# 1. Create fork organization
# (Done manually on GitHub)

# 2. Clone Univer repository
git clone --recursive https://github.com/dream-num/univer.git spreadsheet-moment
cd spreadsheet-moment

# 3. Add upstream remote
git remote add upstream https://github.com/dream-num/univer.git

# 4. Create feature branch for agentic layer
git checkout -b feature/agent-layer

# 5. Update package.json and README
# (See details below)
```

### Step 2: Repository Identity

**Update `package.json`:**
```json
{
  "name": "@spreadsheet-moment/root",
  "version": "0.1.0-univer.0.1.0",
  "description": "Agentic spreadsheet built on Univer",
  "repository": {
    "type": "git",
    "url": "https://github.com/SuperInstance/spreadsheet-moment.git"
  },
  "author": "SuperInstance",
  "license": "MIT"
}
```

**Update `README.md`:**
```markdown
# SpreadsheetMoment

**Agentic spreadsheet built on Univer foundation**

SpreadsheetMoment transforms spreadsheet cells into intelligent agents with Visual Thinking, Human-in-the-Loop approval, and Intelligent API routing.

## Forked from [Univer](https://github.com/dream-num/univer)

We've extended Univer with an agentic intelligence layer that adds:
- Origin-Centric Design (recursive loop prevention)
- Visual Thinking (step-by-step AI reasoning)
- Human-in-the-Loop workflow (approve/reject actions)
- Agent Handshake Protocol (bot detection)
- Intelligent API Routing (cost optimization)

## Quick Start

\`\`\`bash
git clone https://github.com/SuperInstance/spreadsheet-moment.git
cd spreadsheet-moment
pnpm install
pnpm dev
\`\`\`

## Documentation

- [Onboarding Guide](docs/ONBOARDING.md) - Get started as a contributor
- [Architecture](docs/ARCHITECTURE.md) - System architecture
- [API Reference](docs/API_REFERENCE.md) - Complete API docs

## License

MIT (same as Univer)

## Acknowledgments

This project is built on [Univer](https://github.com/dream-num/univer), an excellent spreadsheet engine.
```

### Step 3: Initial Commit

```bash
git add .
git commit -m "chore: initial fork from Univer with project identity"
git push origin feature/agent-layer
```

---

## Upstream Sync Strategy

### Sync Schedule

**Regular Syncs:**
- **Weekly**: Check upstream for updates
- **Bi-weekly**: Merge upstream changes if significant
- **Before major releases**: Always sync with upstream first

### Sync Process

```bash
# 1. Fetch upstream changes
git fetch upstream

# 2. Review upstream changes
git log upstream/main --oneline --graph --decorate

# 3. Create sync branch
git checkout -b sync/upstream-$(date +%Y%m%d)

# 4. Merge upstream changes
git merge upstream/main

# 5. Resolve conflicts
# (See conflict resolution below)

# 6. Test thoroughly
pnpm install
pnpm build
pnpm test

# 7. Merge to main
git checkout main
git merge sync/upstream-$(date +%Y%m%d)

# 8. Push to origin
git push origin main
```

### Conflict Resolution Strategy

**Principle:** Univer changes take priority in core packages. Our changes are isolated in agent-* packages.

**Conflicts by Package Type:**

**1. Core Univer Packages (engine, docs, graphql, cli)**
```bash
# Accept upstream changes
git checkout --theirs packages/engine/src/affected-file.ts

# Re-apply our patches if needed
# (Document these in PATCHES.md)
```

**2. Agent Packages (agent-core, agent-ui, agent-ai, agent-formulas)**
```bash
# Accept our changes
git checkout --ours packages/agent-core/src/affected-file.ts
```

**3. Shared Configuration (package.json, tsconfig.json)**
```bash
# Merge carefully
# Keep both Univer and our dependencies
# Update versions as needed
```

### Conflict Prevention

**Minimize Conflicts by:**
1. **Isolating changes** - All our code in agent-* packages
2. **Not modifying core** - Avoid changes to Univer core packages
3. **Using plugins** - Extend through plugin system, not patches
4. **Separate configs** - Use separate config files when possible

---

## Integration Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  SpreadsheetMoment                           │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Layer 3: Application                         │  │
│  │  • User-facing features                                │  │
│  │  • Example projects                                    │  │
│  │  • Documentation                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ▲                                  │
│                          │                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Layer 2: Agentic Intelligence (Our Add)      │  │
│  │  • agent-core: Origin-Centric Design, Trace Protocol   │  │
│  │  • agent-ui: Visual Thinking, HITL workflow            │  │
│  │  • agent-ai: Intelligent API routing                   │  │
│  │  • agent-formulas: Custom formula functions            │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ▲                                  │
│                          │                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Layer 1: Univer Core (Upstream)          │  │
│  │  • engine: Core spreadsheet engine                     │  │
│  │  • docs: Documentation                                 │  │
│  │  • graphql: GraphQL API                                │  │
│  │  • cli: CLI tools                                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

**1. Plugin Registration**
```typescript
// In agent-ui/src/plugins/AgentCellPlugin.ts
import { Plugin, Inject } from '@univerjs/core';

export class AgentCellPlugin extends Plugin {
  override onMounted() {
    // Register our custom cell type
    this._injector.get(CellModelExtension).registerCellType({
      type: 'agent',
      renderer: AgentCellRenderer,
      validator: AgentCellValidator
    });

    // Register custom commands
    this._commandService.registerCommand({
      id: 'agent.approve',
      handler: this.handleApprove.bind(this)
    });

    // Register custom formula functions
    this._formulaService.registerFunction({
      id: 'AGENT.THINK',
      handler: this.handleAgentThink.bind(this)
    });
  }
}
```

**2. Cell Data Extension**
```typescript
// In agent-core/src/models/AgentCellModel.ts
import { ICellData } from '@univerjs/core';

export interface IAgentCellData extends ICellCellData {
  // Base properties from Univer
  v: string | number;  // value

  // Our agentic extensions
  origin_id?: string;
  trace_id?: string;
  cell_type?: AgentCellType;
  state?: CellState;
  reasoning?: string[];
  memory?: string[];
  procedures?: string[];
  requires_approval?: boolean;
}
```

**3. UI Component Integration**
```typescript
// In agent-ui/src/components/ReasoningPanel.tsx
import { useDependency } from '@univerjs/core';
import { observer } from 'mobx-react';

export const ReasoningPanel = observer(() => {
  const univerAPI = useDependency(UniverInstance);
  const workbook = univerAPI.getActiveWorkbook();
  const worksheet = workbookgetActiveSheet();
  const selection = worksheet.getSelection();

  const cell = selection.getActiveCell();
  const agentData = cell.getAgentData();

  if (!agentData) return null;

  return (
    <Panel>
      <ReasoningSteps steps={agentData.reasoning} />
      {agentData.state === 'NEEDS_REVIEW' && (
        <HITLButtons
          onApprove={() => approveAgent(cell)}
          onReject={() => rejectAgent(cell)}
        />
      )}
    </Panel>
  );
});
```

---

## Package Structure

### Monorepo Organization

```
spreadsheet-moment/
├── packages/
│   │
│   # === Univer Core Packages (sync with upstream) ===
│   ├── engine/                      # Core engine
│   │   ├── src/
│   │   ├── package.json             # @univerjs/engine
│   │   └── README.md
│   │
│   ├── docs/                        # Documentation
│   │   ├── src/
│   │   ├── package.json             # @univerjs/docs
│   │   └── README.md
│   │
│   ├── graphql/                     # GraphQL API
│   │   ├── src/
│   │   ├── package.json             # @univerjs/graphql
│   │   └── README.md
│   │
│   ├── cli/                         # CLI tools
│   │   ├── src/
│   │   ├── package.json             # @univerjs/cli
│   │   └── README.md
│   │
│   # === Agentic Layer Packages (our additions) ===
│   ├── agent-core/                  # Agent cell system
│   │   ├── src/
│   │   │   ├── models/
│   │   │   │   ├── AgentCellModel.ts        # Cell data model
│   │   │   │   └── AgentCellState.ts        # State machine
│   │   │   ├── protocols/
│   │   │   │   ├── OriginCentric.ts         # Origin-Centric Design
│   │   │   │   └── TraceProtocol.ts         # Trace collision detection
│   │   │   ├── services/
│   │   │   │   ├── CellManager.ts           # Cell CRUD operations
│   │   │   │   └── StateManager.ts          # State transitions
│   │   │   └── index.ts
│   │   ├── package.json             # @spreadsheet-moment/agent-core
│   │   └── README.md
│   │
│   ├── agent-ui/                    # Visual Thinking UI
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ReasoningPanel.tsx       # Thinking display
│   │   │   │   ├── HITLButtons.tsx          # Approve/reject buttons
│   │   │   │   ├── CellRenderer.tsx         # Custom cell renderer
│   │   │   │   ├── AgentConfigPanel.tsx     # Configuration UI
│   │   │   │   └── StateIndicator.tsx       # State badge
│   │   │   ├── plugins/
│   │   │   │   ├── AgentCellPlugin.ts       # Main plugin
│   │   │   │   └── ReasoningPlugin.ts       # UI plugin
│   │   │   ├── hooks/
│   │   │   │   ├── useAgentCell.ts          # Cell data hook
│   │   │   │   └── useReasoning.ts          # Reasoning stream hook
│   │   │   └── index.ts
│   │   ├── package.json             # @spreadsheet-moment/agent-ui
│   │   └── README.md
│   │
│   ├── agent-ai/                    # AI integration
│   │   ├── src/
│   │   │   ├── providers/
│   │   │   │   ├── interfaces/
│   │   │   │   │   └── IAIProvider.ts       # Provider interface
│   │   │   │   ├── CloudflareProvider.ts    # Workers AI (free)
│   │   │   │   ├── DeepSeekProvider.ts      # DeepSeek API
│   │   │   │   ├── OpenAIProvider.ts        # OpenAI API
│   │   │   │   └── AnthropicProvider.ts     # Anthropic API
│   │   │   ├── routing/
│   │   │   │   ├── IntelligentRouter.ts     # Provider selection
│   │   │   │   └── CostOptimizer.ts         # Cost tracking
│   │   │   ├── protocols/
│   │   │   │   └── AgentHandshake.ts        # Bot detection
│   │   │   ├── types/
│   │   │   │   └── index.ts                 # Type definitions
│   │   │   └── index.ts
│   │   ├── package.json             # @spreadsheet-moment/agent-ai
│   │   └── README.md
│   │
│   ├── agent-formulas/               # Custom formula functions
│   │   ├── src/
│   │   │   ├── functions/
│   │   │   │   ├── AgentThink.ts          # =AGENT.THINK(prompt)
│   │   │   │   ├── AgentLearn.ts          # =AGENT.LEARN(data)
│   │   │   │   ├── AgentCoordinate.ts     # =AGENT.COORDINATE(cells)
│   │   │   │   ├── AgentPredict.ts        # =AGENT.PREDICT(range)
│   │   │   │   └── AgentAnalyze.ts        # =AGENT.ANALYZE(range)
│   │   │   ├── registry.ts
│   │   │   └── index.ts
│   │   ├── package.json             # @spreadsheet-moment/agent-formulas
│   │   └── README.md
│   │
│   # === Examples and Documentation ===
│   ├── examples/                    # Example projects
│   │   ├── weather-station/          # Sensor network example
│   │   ├── ml-pipeline/              # ML workflow example
│   │   └── consensus-demo/           # Coordination demo
│   │
│   └── docs-site/                   # Documentation site
│       ├── src/
│       │   ├── guide/
│       │   │   ├── getting-started.md
│       │   │   ├── architecture.md
│       │   │   └── api-reference.md
│       │   └── config.ts
│       ├── package.json
│       └── README.md
│
├── cloudflare/                       # Cloudflare Workers deployment
│   ├── worker.js                     # Intelligent API routing
│   ├── wrangler.toml                 # Workers configuration
│   ├── package.json
│   └── DEPLOY.md
│
├── docs/                             # Documentation
│   ├── ONBOARDING.md                 # Team onboarding
│   ├── ARCHITECTURE.md               # System architecture
│   ├── API_REFERENCE.md              # API documentation
│   ├── FORK_STRATEGY.md              # This document
│   └── PATCHES.md                    # Upstream patches we maintain
│
├── .github/
│   ├── workflows/
│   │   ├── sync-upstream.yml         # Auto-sync workflow
│   │   ├── test.yml                  # Test workflow
│   │   └── deploy.yml                # Deployment workflow
│   └── PULL_REQUEST_TEMPLATE.md
│
├── pnpm-workspace.yaml               # Workspace configuration
├── package.json                      # Root package.json
├── tsconfig.json                     # Root TypeScript config
├── .gitignore
├── README.md
└── LICENSE
```

### Package Dependencies

```
@spreadsheet-moment/agent-formulas
  └── @spreadsheet-moment/agent-core
  └── @univerjs/engine

@spreadsheet-moment/agent-ui
  └── @spreadsheet-moment/agent-core
  └── @spreadsheet-moment/agent-ai
  └── @univerjs/engine
  └── @univerjs/ui

@spreadsheet-moment/agent-ai
  └── @spreadsheet-moment/agent-core
  (no Univer dependencies - standalone)

@spreadsheet-moment/agent-core
  └── @univerjs/engine
```

---

## Development Workflow

### Branch Strategy

```
main (protected, synced with upstream)
  ├── feature/agent-layer          # Current work
  ├── feature/visual-thinking      # Future feature
  ├── feature/hitl-workflow        # Future feature
  ├── sync/upstream-20260315       # Sync branches
  └── sync/upstream-20260322       # Sync branches
```

**Rules:**
- All work done in feature branches
- PR required to merge to main
- Sync branches created for upstream merges
- Delete branches after merge

### Development Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm --filter @univerjs-examples/base run dev

# Build all packages
pnpm build

# Test all packages
pnpm test

# Lint all packages
pnpm lint

# Work on specific package
pnpm --filter @spreadsheet-moment/agent-core dev

# Build specific package
pnpm --filter @spreadsheet-moment/agent-ui build

# Test specific package
pnpm --filter @spreadsheet-moment/agent-ai test
```

### Commit Convention

Follow conventional commits:

```bash
# Format
<type>(<scope>): <description>

# Types
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Code style
refactor: Refactoring
perf:     Performance
test:     Tests
chore:    Build/tooling

# Examples
feat(agent-core): implement trace protocol
fix(agent-ui): resolve reasoning panel bug
docs(onboarding): add workflow diagrams
perf(agent-ai): cache provider selections
chore: sync with upstream Univer
```

### Pull Request Template

```markdown
## Summary
Brief description of changes

## Type
- [ ] Feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactoring
- [ ] Performance
- [ ] Tests

## Changes
- List main changes

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing

## Breaking Changes
- [ ] None
- [ ] Yes (describe)

## Related Issues
Closes #issue_number

## Notes
Any additional notes for reviewers
```

---

## Migration Path

### Phase 1: Fork & Setup (Week 1)

**Deliverables:**
- [ ] Fork Univer repository
- [ ] Set up development environment
- [ ] Create agent package structure
- [ ] Set up CI/CD pipelines
- [ ] Update documentation

**Tasks:**
```bash
# Day 1-2: Fork and setup
git clone https://github.com/dream-num/univer.git spreadsheet-moment
cd spreadsheet-moment
git remote add upstream https://github.com/dream-num/univer.git
pnpm install

# Day 3-4: Create agent packages
mkdir -p packages/agent-{core,ui,ai,formulas}
# Add package.json, tsconfig.json, src/ for each

# Day 5: CI/CD and documentation
# Set up GitHub Actions workflows
# Update README.md
# Create initial documentation
```

### Phase 2: Core Features (Weeks 2-4)

**Deliverables:**
- [ ] Implement Origin-Centric Design
- [ ] Implement Trace Protocol
- [ ] Create Visual Thinking UI
- [ ] Implement HITL workflow
- [ ] Integrate AI providers

**Tasks:**
```typescript
// Week 2: agent-core
// Implement core data structures and protocols

// Week 3: agent-ui
// Build UI components and plugins

// Week 4: agent-ai
// Integrate AI providers and routing
```

### Phase 3: Advanced Features (Weeks 5-8)

**Deliverables:**
- [ ] Agent Handshake Protocol
- [ ] Learning and memory systems
- [ ] Multi-sheet coordination
- [ ] Example projects
- [ ] Comprehensive testing

**Tasks:**
```typescript
// Week 5-6: Advanced features
// Agent handshake, learning, memory

// Week 7: Multi-sheet coordination
// Consensus protocols

// Week 8: Examples and testing
// Build example projects, comprehensive testing
```

### Phase 4: Launch (Weeks 9-10)

**Deliverables:**
- [ ] Production deployment
- [ ] Documentation complete
- [ ] Marketing materials
- [ ] Community setup

**Tasks:**
```bash
# Week 9: Final testing and deployment
pnpm test
pnpm build
pnpm deploy

# Week 10: Launch
# Release announcement
# Community engagement
```

---

## Risk Mitigation

### Risks and Mitigations

**1. Upstream Compatibility Breaks**
- **Risk:** Univer makes breaking changes
- **Mitigation:**
  - Weekly upstream monitoring
  - Participate in Univer community
  - Contribute patches upstream
  - Maintain compatibility layer

**2. Merge Conflicts**
- **Risk:** Frequent conflicts with upstream
- **Mitigation:**
  - Isolate our changes in agent-* packages
  - Avoid modifying Univer core
  - Regular upstream syncs
  - Automated conflict detection

**3. Plugin API Changes**
- **Risk:** Univer changes plugin API
- **Mitigation:**
  - Watch Univer RFCs and proposals
  - Participate in plugin API discussions
  - Version-specific plugin implementations
  - Migration guides for API changes

**4. Performance Degradation**
- **Risk:** Agentic layer slows down spreadsheet
- **Mitigation:**
  - Performance benchmarks
  - Lazy loading of agent features
  - Web Workers for heavy computation
  - Caching strategies

**5. Community Fragmentation**
- **Risk:** Confusion between Univer and SpreadsheetMoment
- **Mitigation:**
  - Clear attribution to Univer
  - Different positioning (agentic vs. traditional)
  - Contribute back to Univer
  - Cross-promotion

### Contingency Plans

**If upstream becomes incompatible:**
1. Fork last compatible version
2. Maintain our own updates
3. Work with Univer to resolve issues
4. Consider alternative spreadsheet engines

**If plugin architecture proves insufficient:**
1. Deeper integration with Univer core
2. Contribute agentic features upstream
3. Hybrid approach (plugin + patches)

**If performance is unacceptable:**
1. Optimize critical paths
2. Add caching and memoization
3. Web Workers for parallel processing
4. Consider Rust/WASM for hot paths

---

## Success Metrics

### Technical Metrics

- [ ] All Univer tests passing
- [ ] 80%+ test coverage for agent packages
- [ ] <100ms cell creation time
- [ ] <2s reasoning generation time
- [ ] <50ms cell update time
- [ ] Support for 100K+ cells

### Integration Metrics

- [ ] Zero merge conflicts in agent packages
- [ ] <1 hour to sync with upstream
- [ ] All upstream features working

### Community Metrics

- [ ] Positive reception from Univer community
- [ ] Contributions back to Univer
- [ ] 100+ GitHub stars in first month
- [ ] Active Discord community

---

## Next Steps

### Immediate Actions (This Week)

1. **Fork Repository**
   ```bash
   # Execute fork commands
   # Update package.json and README.md
   ```

2. **Create Agent Packages**
   ```bash
   mkdir -p packages/agent-{core,ui,ai,formulas}
   # Add package.json files
   # Set up TypeScript configs
   ```

3. **Set Up CI/CD**
   ```bash
   # Create GitHub Actions workflows
   # Set up automated testing
   # Configure deployment
   ```

4. **Initial Documentation**
   ```bash
   # Complete ARCHITECTURE.md
   # Update API_REFERENCE.md
   # Create migration guides
   ```

### Phase 1 Goals (Week 1)

- [ ] Fork complete and pushed to GitHub
- [ ] Development environment working
- [ ] CI/CD pipelines running
- [ ] Initial documentation complete
- [ ] Team onboarding completed

---

**Document Maintainer:** SpreadsheetMoment Team
**Last Updated:** 2026-03-15
**Status:** Active - Phase 0: Planning Fork Strategy
