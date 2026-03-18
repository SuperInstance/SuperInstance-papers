# Spreadsheet Moment - Agentic Spreadsheet Platform

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Website](https://img.shields.io/badge/Website-LIVE-green.svg)](https://spreadsheet-moment.pages.dev)
[![Tests](https://img.shields.io/badge/Tests-90%25_passing-brightgreen.svg)](https://github.com/SuperInstance/spreadsheet-moment)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

**Status:** MVP Development | Testing: 90%+ Pass Rate | Ready for Claw Integration

---

## What is Spreadsheet Moment?

Spreadsheet Moment transforms spreadsheet cells into **autonomous agents** that can think, reason, and coordinate. Built on the [Univer](https://github.com/dream-num/univer) spreadsheet foundation with TypeScript/JavaScript frontend and Rust backend integration.

### The Core Idea

**Traditional spreadsheets:** Cells calculate, they don't think.

**Spreadsheet Moment:** Each cell is an intelligent agent that monitors data, reasons about patterns, and takes autonomous action.

```excel
# Traditional: Static formula
A1: =B1 * 1.1

# Spreadsheet Moment: Autonomous agent
A1: =CLAW_NEW("price_monitor", "deepseek-chat", "Monitor price changes and alert on anomalies")
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- TypeScript 5+

### Installation

```bash
# Clone and install
git clone https://github.com/SuperInstance/spreadsheet-moment.git
cd spreadsheet-moment
pnpm install

# Build packages
pnpm build

# Start development server
pnpm dev
```

### Your First Agent

1. Open the spreadsheet at http://localhost:3000

2. Create an agent in cell A1:
   ```excel
   =CLAW_NEW("hello_world", "deepseek-chat", "Say hello to the world")
   ```

3. Watch the cell update as the agent processes

4. Query the agent state in cell A2:
   ```excel
   =CLAW_QUERY(A1)
   ```

5. Cancel if needed:
   ```excel
   =CLAW_CANCEL(A1)
   ```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPREADSHEET MOMENT                           │
│                      (Frontend)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Univer     │      │ Agent Core   │      │  Agent UI    │  │
│  │  (Spreadsheet│─────►│  (State Mgr) │─────►│ (Components) │  │
│  │   Engine)    │      │              │      │              │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│                                 │                             │
│                                 ▼                             │
│                          ┌──────────────┐                      │
│                          │ ClawClient   │                      │
│                          │  (HTTP/WS)   │                      │
│                          └──────────────┘                      │
│                                 │                             │
└─────────────────────────────────┼─────────────────────────────┘
                                  │
                                  │ HTTP/WebSocket
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CLAW API SERVER                            │
│                      (Agent Execution)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  • REST API for agent management                                 │
│  • WebSocket for real-time updates                               │
│  • Authentication & authorization                                │
│  • Agent lifecycle management                                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        CLAW-CORE ENGINE                           │
│                      (Cellular Agents)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  • Agent execution engine                                         │
│  • State management                                               │
│  • Equipment system                                               │
│  • Social coordination                                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Package Structure

```
spreadsheet-moment/
├── packages/
│   ├── agent-core/      # Core engine (StateManager, ClawClient, TraceProtocol)
│   ├── agent-ai/        # AI integration (ModelRouter, Providers)
│   ├── agent-ui/        # React components (AgentVisualizer, StatusIndicator)
│   └── agent-formulas/  # Spreadsheet functions (CLAW_NEW, CLAW_QUERY, CLAW_CANCEL)
├── docs/                # Documentation
├── tests/               # Tests
└── website/             # Web UI
```

---

## Agent Lifecycle

### Agent States

| State | Description | Visual |
|-------|-------------|--------|
| IDLE | Created but not started | Gray |
| INITIALIZING | Starting up | Blue |
| THINKING | Processing/reasoning | Purple |
| ACTING | Executing actions | Orange |
| COMPLETE | Finished successfully | Green |
| ERROR | Encountered failure | Red |

### State Transitions

```
IDLE → INITIALIZING → THINKING → ACTING → COMPLETE
                            ↓
                         ERROR
```

---

## Use Cases

### When to Use Spreadsheet Moment

| Use Case | Why It Works |
|----------|--------------|
| **Data Monitoring** | Agents watch for patterns 24/7 |
| **Automated Workflows** | Chain agents for multi-step processes |
| **Real-time Dashboards** | Agents update cells based on events |
| **Coordinated Analysis** | Multiple agents collaborate |

### When NOT to Use

| Anti-Use Case | Better Alternative |
|---------------|-------------------|
| Simple calculations | Standard Excel formulas |
| Static reports | Google Sheets, Excel |
| High-frequency trading | Specialized trading systems |

---

## Packages

### @spreadsheet-moment/agent-core

Core agent system with state management and API client.

```typescript
import { StateManager, ClawClient, TraceProtocol } from '@spreadsheet-moment/agent-core';

const stateManager = new StateManager();
const client = new ClawClient({
  baseUrl: 'http://localhost:8080',
  apiKey: process.env.CLAW_API_KEY
});
```

### @spreadsheet-moment/agent-ai

AI integration with model routing.

```typescript
import { ModelRouter, DeepSeekProvider } from '@spreadsheet-moment/agent-ai';

const router = new ModelRouter({
  defaultProvider: 'deepseek',
  providers: [new DeepSeekProvider({ apiKey: process.env.DEEPSEEK_KEY })]
});
```

### @spreadsheet-moment/agent-ui

React components for agent visualization.

```tsx
import { AgentVisualizer, StatusIndicator } from '@spreadsheet-moment/agent-ui';

<AgentVisualizer agentId="claw_123" />
<StatusIndicator state="thinking" />
```

### @spreadsheet-moment/agent-formulas

Spreadsheet formula functions.

```excel
=CLAW_NEW(name, model, purpose)
=CLAW_QUERY(cell_reference)
=CLAW_CANCEL(cell_reference)
```

---

## Development

### Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm lint             # Lint code

# Testing
pnpm test:coverage    # Test with coverage
pnpm test:e2e         # End-to-end tests
```

### Test Results

| Suite | Pass Rate | Status |
|-------|-----------|--------|
| StateManager | 100% (25/25) | Stable |
| TraceProtocol | 100% (20/20) | Stable |
| ClawClient | 100% (18/18) | Stable |
| Integration | 90%+ | Improving |
| **Overall** | **90%+** | **Good** |

---

## Integration

### Claw API Integration

Spreadsheet Moment connects to [Claw](https://github.com/SuperInstance/claw) for agent execution.

**Integration Status:** API contracts defined, mock testing available, live integration in progress.

See [CLAW_INTEGRATION_PLAN.md](CLAW_INTEGRATION_PLAN.md) for complete integration details.

### Univer Foundation

Built on [Univer](https://github.com/dream-num/univer):
- Open-source spreadsheet engine
- React-based UI components
- Formula calculation engine

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design
- [API Reference](docs/API_DOCUMENTATION.md) - Complete API docs
- [Getting Started](docs/GETTING_STARTED.md) - Tutorial
- [Deployment](docs/DEPLOYMENT_GUIDE.md) - Production setup
- [Claw Integration](docs/CLAW_INTEGRATION.md) - Claw API guide
- [Analysis](SPREADSHEET_ANALYSIS.md) - Streamlining analysis

---

## Roadmap

| Phase | Status | Focus |
|-------|--------|-------|
| Phase 1: Foundation | Complete | Monorepo, package structure |
| Phase 2: Architecture | Complete | Core systems implemented |
| Phase 3: Integration | Complete | API integration |
| Phase 4: Streamlining | **Current** | Remove non-essential features |
| Phase 5: Claw Integration | Next | Live claw-core connection |
| Phase 6: Production | Planned | Deployment, monitoring |

---

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Requirements:**
- All PRs must pass tests
- Code must be TypeScript strict mode compatible
- New features require tests

---

## License

Apache-2.0 - See [LICENSE](LICENSE)

---

## Links

- **Website:** https://spreadsheet-moment.pages.dev
- **GitHub:** https://github.com/SuperInstance/spreadsheet-moment
- **Claw Engine:** https://github.com/SuperInstance/claw
- **Research:** https://github.com/SuperInstance/SuperInstance-papers

---

**Current Branch:** `main`
**Last Updated:** 2026-03-18
**Status:** MVP Development | Ready for Claw Integration
