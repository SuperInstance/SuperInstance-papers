# SuperInstance Ecosystem

> Intelligent modular, self-improving, self-deconstructing spreadsheet agent toolkits

## Overview

The SuperInstance Ecosystem is a revolutionary approach to building AI agents that work within a spreadsheet paradigm with origin-centric thinking. Agents start minimal and self-equip what they need, maturing into streamlined cells that operate efficiently with structural memory and spread-out context.

## Core Philosophy

### Origin-Centric Thinking

Every computation tracks its provenance chain, transformation history, and local reference frame. This enables:

- **Asynchronous agent networks** with agents having asymmetrical knowledge
- **Structural memory** - context spread out into cells for later use
- **Serverless-like local operation** - agents act independently with distributed context
- **Automatic hardware scaling** - adapt to any hardware automatically

### Tile-Based Logic

Logic is decomposed into typed computational units (tiles) with confidence tracking:

```
┌─────────────────────────────────────────────────────────────────┐
│                         AGENT CELL                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ DATA ORIGIN  │  │   DECISION   │  │TRANSFORMATION│          │
│  │     TILE     │  │   LOGIC TILE │  │     TILE     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐│
│  │ CONFIDENCE   │  │      NAMED INTERFACE TILE                ││
│  │    TILE      │  │  Why I exist / What I provide            ││
│  └──────────────┘  └──────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Modular Equipment System

The Starter Agent starts minimal and equips what it needs:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORIGIN CORE (Minimal)                         │
│  • Identity (id, reference frame, state)                        │
│  • Provenance Chain (immutable, append-only)                    │
│  • Rate-Based State (dD/dt, dT/dt, dΦ/dt)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EQUIPMENT SLOTS                               │
│                                                                  │
│  [MEMORY] [REASONING] [CONSENSUS] [SPREADSHEET]                 │
│  [DISTILLATION] [PERCEPTION] [COORDINATION] ...                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TRIGGER SYSTEM                                │
│  • Threshold Monitors  • Deadband Controllers                   │
│  • Equipment Recommendations                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Repository Structure

### Core Repository

| Repository | Description |
|------------|-------------|
| [SuperInstance-Starter-Agent](https://github.com/SuperInstance/SuperInstance-Starter-Agent) | Minimal agent framework with origin-centric computation |

### Equipment Packages

| Equipment | Slot | Purpose |
|-----------|------|---------|
| [Equipment-CellLogic-Distiller](https://github.com/SuperInstance/Equipment-CellLogic-Distiller) | SPREADSHEET | Break down LLM logic into spreadsheet cells |
| [Equipment-Hardware-Scaler](https://github.com/SuperInstance/Equipment-Hardware-Scaler) | MEMORY | Auto-scale across hardware with cloud overflow |
| [Equipment-Teacher-Student](https://github.com/SuperInstance/Equipment-Teacher-Student) | DISTILLATION | Distillation triggers with deadband thresholds |
| [Equipment-Monitoring-Dashboard](https://github.com/SuperInstance/Equipment-Monitoring-Dashboard) | MONITORING | Real-time cell visualization |
| [Equipment-NLP-Explainer](https://github.com/SuperInstance/Equipment-NLP-Explainer) | SPREADSHEET | NLP descriptions for cell logic |
| [Equipment-Consensus-Engine](https://github.com/SuperInstance/Equipment-Consensus-Engine) | CONSENSUS | Multi-agent deliberation (Pathos/Logos/Ethos) |
| [Equipment-Memory-Hierarchy](https://github.com/SuperInstance/Equipment-Memory-Hierarchy) | MEMORY | 4-tier cognitive memory |
| [Equipment-Escalation-Router](https://github.com/SuperInstance/Equipment-Escalation-Router) | REASONING | Bot→Brain→Human routing (40x cost reduction) |
| [Equipment-Swarm-Coordinator](https://github.com/SuperInstance/Equipment-Swarm-Coordinator) | COORDINATION | Multi-agent orchestration |
| [Equipment-Self-Improvement](https://github.com/SuperInstance/Equipment-Self-Improvement) | SELF_IMPROVEMENT | Self-modifying capabilities |
| [Equipment-Context-Handoff](https://github.com/SuperInstance/Equipment-Context-Handoff) | COMMUNICATION | Generational context transfer |

## Quick Start

```bash
# Install the core agent
npm install @superinstance/starter-agent

# Install equipment you need
npm install @superinstance/equipment-memory-hierarchy
npm install @superinstance/equipment-escalation-router
npm install @superinstance/equipment-consensus-engine
```

```typescript
import { OriginCore } from '@superinstance/starter-agent';
import { HierarchicalMemoryEquipment } from '@superinstance/equipment-memory-hierarchy';
import { EscalationRouterEquipment } from '@superinstance/equipment-escalation-router';

// Create minimal agent
const agent = new OriginCore({
  id: 'my-agent',
  debug: true,
});

// Register available equipment
agent.registerEquipment(new HierarchicalMemoryEquipment());
agent.registerEquipment(new EscalationRouterEquipment());

// Process a task - agent self-equips what it needs
const result = await agent.processTask({
  id: 'task-1',
  type: 'decision',
  query: 'Should I approve this high-stakes request?',
  stakes: 0.9,
  urgencyMs: 5000,
});

console.log(result.confidence); // 0.85
console.log(result.zone);       // 'GREEN'
console.log(result.equipmentUsed); // ['REASONING', 'CONSENSUS']
```

## Equipment Details

### CellLogic-Distiller

Breaks down LLM prompts/responses into named tiles for spreadsheet visualization:

```typescript
import { CellLogicDistiller } from '@superinstance/equipment-cell-logic-distiller';

const distiller = new CellLogicDistiller();
const { tiles, spreadsheet } = distiller.distill({
  prompt: 'Analyze customer data',
  response: 'Based on the analysis...',
});

// Each tile has: data_origin, decision_logic, transformation, confidence
console.log(tiles);
```

### Hardware-Scaler

Auto-scales across hardware with cloud overflow:

```typescript
import { HardwareScalerEquipment } from '@superinstance/equipment-hardware-scaler';

const scaler = new HardwareScalerEquipment({
  cloudEndpoint: 'https://api.openai.com/v1',
  maxLocalMemory: 1024 * 1024 * 1024,
  costCeiling: 10.00,
});

// Automatically routes to local or cloud based on resources
```

### Teacher-Student

Distillation with deadband thresholds:

```typescript
import { TeacherStudentEquipment } from '@superinstance/equipment-teacher-student';

const ts = new TeacherStudentEquipment({
  deadbandLow: 0.6,
  deadbandHigh: 0.9,
  teacherEndpoint: 'https://api.openai.com/v1/chat/completions',
});

// Operates autonomously in deadband, calls teacher outside
const decision = ts.process({ input: '...', confidence: 0.4 });
// → calls teacher because below deadband
```

### Monitoring-Dashboard

Real-time visualization of agent activity:

```typescript
import { MonitoringDashboardEquipment } from '@superinstance/equipment-monitoring-dashboard';

const dashboard = new MonitoringDashboardEquipment({
  port: 3001,
  websocketEnabled: true,
});

// Open http://localhost:3001 to see live agent activity
dashboard.start();
```

### Consensus-Engine

Tripartite deliberation for reliable decisions:

```typescript
import { ConsensusEngineEquipment } from '@superinstance/equipment-consensus-engine';

const consensus = new ConsensusEngineEquipment({
  domain: 'sensitive', // Adjusts Pathos/Logos/Ethos weights
});

const result = await consensus.deliberate({
  query: 'Should we proceed with this action?',
  context: { ... },
});

// result.decision, result.confidence, result.auditTrail
```

### Memory-Hierarchy

4-tier cognitive memory:

```typescript
import { HierarchicalMemoryEquipment } from '@superinstance/equipment-memory-hierarchy';

const memory = new HierarchicalMemoryEquipment({
  workingCapacity: 7,  // Miller's Law
  consolidationInterval: 60000,
});

// Working → Episodic → Semantic → Procedural
await memory.remember('key', { data: '...' }, 'working');
await memory.consolidate(); // Move items between tiers
```

### Escalation-Router

40x cost reduction through intelligent routing:

```typescript
import { EscalationRouterEquipment } from '@superinstance/equipment-escalation-router';

const router = new EscalationRouterEquipment({
  botMinConfidence: 0.7,
  brainMinConfidence: 0.5,
  highStakesThreshold: 0.7,
});

const tier = router.route({
  stakes: 0.5,
  urgency: 1000,
  isNovel: false,
});
// tier: 'bot' | 'brain' | 'human'
```

## Self-Improvement Cycle

Agents can mature into streamlined cells:

```
┌──────────────────┐
│   Task Arrives   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│ Process with     │────▶│ Monitor          │
│ Equipment        │     │ Performance      │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         ▼                        ▼
┌──────────────────┐     ┌──────────────────┐
│ Extract Patterns │────▶│ Distill into     │
│ from Usage       │     │ Stable Tiles     │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         └────────────┬───────────┘
                      │
                      ▼
              ┌───────────────┐
              │ Unequip       │
              │ (streamline)  │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │ Muscle Memory │
              │ Triggers      │
              └───────────────┘
```

## Confidence Zones

```
           GREEN ZONE (0.9 - 1.0)
           │    High confidence
           │    Auto-process
           │    No escalation
           │
           ├───────────────────────
           │
           YELLOW ZONE (0.6 - 0.9)
           │    Medium confidence  
           │    Flag for review
           │    Consider equipping
           │
           ├───────────────────────
           │
           RED ZONE (0.0 - 0.6)
           │    Low confidence
           │    Request input
           │    Call teacher
           │    Equip new equipment
           │
           ▼
```

## Hardware Scaling

The ecosystem automatically adapts to hardware:

```typescript
// Local-first processing
┌─────────────────────────────────────────────────────────┐
│                    LOCAL HARDWARE                        │
│  ┌────────────────┐  ┌────────────────┐                │
│  │ CPU: 8 cores   │  │ RAM: 16GB      │                │
│  └────────────────┘  └────────────────┘                │
│  ┌────────────────┐  ┌────────────────┐                │
│  │ GPU: RTX 3080  │  │ Storage: 1TB   │                │
│  └────────────────┘  └────────────────┘                │
└─────────────────────────────────────────────────────────┘
                        │
                        │ Overflow when resources exhausted
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    CLOUD APIs                           │
│  ┌────────────────┐  ┌────────────────┐                │
│  │ OpenAI API     │  │ Anthropic API  │                │
│  └────────────────┘  └────────────────┘                │
│  ┌────────────────┐                                    │
│  │ Local LLM      │  (fallback)                        │
│  └────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
```

## SuperInstance-Aware Chatbot

The ecosystem includes a chatbot that understands SuperInstance:

```typescript
import { NLPExplainerEquipment } from '@superinstance/equipment-nlp-explainer';

const explainer = new NLPExplainerEquipment();

// Ask "What is this cell doing?"
const explanation = explainer.explain({
  cell: cellData,
  language: 'en',
});

// "This cell is processing customer data. It first validates
//  the input format, then applies a risk scoring algorithm,
//  and finally routes high-risk items for human review.
//  Confidence: 85% (GREEN zone)"
```

## Dashboard Monitoring

Real-time dashboard shows:

- Which agents are active
- What they're thinking about in their roles
- Cell-by-cell state display
- Provenance chain visualization
- Confidence zone indicators
- Equipment status
- Historical playback

## Contributing

Each equipment package is independently versioned and can be used standalone or with the Starter Agent ecosystem.

## License

MIT

---

**SuperInstance** - Building the future of spreadsheet-native AI agents
