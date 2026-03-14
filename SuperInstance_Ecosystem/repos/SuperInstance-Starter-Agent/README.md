# SuperInstance Starter Agent

> A minimal agent framework with origin-centric computation and modular equipment system

## Overview

The SuperInstance Starter Agent is designed around a revolutionary paradigm: **agents start minimal and self-equip what they need**. Built on the mathematical foundations of Origin-Centric Data Systems and Tile Algebra, this framework enables:

- **Origin-Centric Computation**: Every operation tracks its provenance chain
- **Modular Equipment**: Dynamically equip/unequip capabilities as needed
- **Self-Optimization**: Agents streamline themselves by extracting "muscle memory" triggers
- **Spreadsheet Integration**: Logic decomposes into tile-based cells for visualization

## Installation

```bash
npm install @superinstance/starter-agent
```

## Quick Start

```typescript
import { OriginCore } from '@superinstance/starter-agent';

// Create a minimal agent
const agent = new OriginCore({
  id: 'my-agent',
  debug: true,
});

// Register available equipment
import { HierarchicalMemoryEquipment } from '@superinstance/equipment-memory-hierarchy';
import { EscalationEngineEquipment } from '@superinstance/equipment-escalation-router';

agent.registerEquipment(new HierarchicalMemoryEquipment());
agent.registerEquipment(new EscalationEngineEquipment());

// Process a task - agent self-equips what it needs
const result = await agent.processTask({
  id: 'task-1',
  type: 'decision',
  query: 'Should I approve this high-stakes request?',
  stakes: 0.9,
  urgencyMs: 5000,
});

console.log(result);
// {
//   taskId: 'task-1',
//   output: { decision: '...', confidence: 0.85 },
//   confidence: 0.85,
//   zone: 'GREEN',
//   equipmentUsed: ['REASONING', 'CONSENSUS'],
//   ...
// }
```

## Core Concepts

### Origin-Centric Computation

Every agent maintains an **Origin State** that tracks:

```typescript
interface OriginState {
  origin: ProvenanceChain;    // Immutable history
  data: DataType;             // Current data state
  transformations: Transformation[];  // Applied operations
  function: () => unknown;    // Current capability
}
```

### Equipment System

The agent has 10 equipment slots:

| Slot | Purpose | Example Equipment |
|------|---------|-------------------|
| MEMORY | State persistence | HierarchicalMemory |
| REASONING | Decision routing | EscalationEngine |
| CONSENSUS | Multi-agent agreement | TripartiteConsensus |
| SPREADSHEET | Logic visualization | POLLNInterface |
| DISTILLATION | Model compression | CellLogicDistiller |
| PERCEPTION | Input processing | VisionProcessor |
| COORDINATION | Multi-agent orchestration | SwarmCoordinator |
| COMMUNICATION | Message passing | MessageRouter |
| SELF_IMPROVEMENT | Self-modification | SelfImprovement |
| MONITORING | Real-time visibility | MonitoringDashboard |

### Confidence Zones

```
GREEN (0.9 - 1.0): High confidence, auto-process
YELLOW (0.6 - 0.9): Medium confidence, flag for review  
RED (0.0 - 0.6): Low confidence, call teacher
```

### Self-Optimization

Agents can unequip unused equipment while extracting "muscle memory":

```typescript
// Optimize by unequipping low-usage equipment
await agent.optimize();

// Triggers are extracted for when to re-equip or call teacher
console.log(agent.triggers.monitors);
```

## Equipment Packages

Install equipment modules individually:

```bash
# Memory
npm install @superinstance/equipment-memory-hierarchy

# Reasoning
npm install @superinstance/equipment-escalation-router

# Consensus
npm install @superinstance/equipment-consensus-engine

# Distillation
npm install @superinstance/equipment-cell-logic-distiller

# Monitoring
npm install @superinstance/equipment-monitoring-dashboard

# And more...
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPERINSTANCE STARTER AGENT                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    ORIGIN CORE (Minimal)                   │ │
│  │  • Identity (id, reference frame, state)                  │ │
│  │  • Provenance Chain (immutable, append-only)              │ │
│  │  • Rate-Based State (dD/dt, dT/dt, dΦ/dt)                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    EQUIPMENT SLOTS                         │ │
│  │                                                            │ │
│  │  [MEMORY] [REASONING] [CONSENSUS] [SPREADSHEET]           │ │
│  │  [DISTILLATION] [PERCEPTION] [COORDINATION] ...           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    TRIGGER SYSTEM                          │ │
│  │  • Threshold Monitors  • Deadband Controllers              │ │
│  │  • Equipment Recommendations                               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## API Reference

### OriginCore

```typescript
class OriginCore {
  constructor(config?: AgentConfig);
  
  // Equipment
  registerEquipment(equipment: Equipment): void;
  equip(equipmentName: string): Promise<boolean>;
  unequipSlot(slot: EquipmentSlot): Promise<boolean>;
  hasEquipment(slot: EquipmentSlot): boolean;
  getEquippedEquipment(): { slot: EquipmentSlot; name: string }[];
  
  // Tasks
  processTask(task: Task): Promise<TaskResult>;
  
  // Optimization
  optimize(): Promise<void>;
  
  // State
  getState(): AgentState;
  reset(): Promise<void>;
}
```

### Equipment Interface

```typescript
interface Equipment {
  readonly name: string;
  readonly slot: EquipmentSlot;
  readonly version: string;
  readonly description: string;
  readonly cost: CostMetrics;
  readonly benefit: BenefitMetrics;
  readonly triggerThresholds: TriggerThresholds;
  
  equip(agent: OriginCore): Promise<void>;
  unequip(agent: OriginCore): Promise<void>;
  asTile(): Tile;
  describe(): EquipmentDescription;
}
```

## Creating Custom Equipment

Extend `BaseEquipment` to create custom equipment:

```typescript
import { BaseEquipment, OriginCore, Tile } from '@superinstance/starter-agent';

export class MyCustomEquipment extends BaseEquipment {
  readonly name = 'MyCustomEquipment';
  readonly slot = 'REASONING';
  readonly version = '1.0.0';
  readonly description = 'Custom reasoning equipment';
  
  readonly cost = {
    memoryBytes: 1_000_000,
    cpuPercent: 5,
    latencyMs: 10,
    costPerUse: 0,
  };
  
  readonly benefit = {
    accuracyBoost: 0.1,
    speedMultiplier: 1.5,
    confidenceBoost: 0.2,
    capabilityGain: ['custom_reasoning'],
  };
  
  readonly triggerThresholds = {
    equipWhen: [{ metric: 'complexity', operator: '>', value: 0.5 }],
    unequipWhen: [],
    callTeacher: { low: 0.3, high: 0.7 },
  };
  
  asTile(): Tile {
    return {
      inputType: { type: 'primitive', name: 'string' },
      outputType: { type: 'primitive', name: 'string' },
      compute: (input) => this.process(input),
      confidence: () => 0.8,
      trace: () => 'MyCustomEquipment.process',
    };
  }
  
  private process(input: unknown): unknown {
    // Custom logic here
    return input;
  }
}
```

## Spreadsheet Integration

Agents integrate with the SuperInstance spreadsheet system:

```typescript
import { POLLNInterfaceEquipment } from '@superinstance/equipment-cell-logic-distiller';

agent.registerEquipment(new POLLNInterfaceEquipment());
await agent.equip('POLLNInterface');

// Decompose logic into tiles
const tiles = agent.tiles.get('POLLNInterface').compute({
  operation: 'decompose',
  data: { /* cell data */ }
});
```

## Hardware Scaling

Use the Hardware Scaler equipment for automatic resource adaptation:

```typescript
import { HardwareScalerEquipment } from '@superinstance/equipment-hardware-scaler';

agent.registerEquipment(new HardwareScalerEquipment({
  cloudEndpoint: 'https://api.superinstance.io/v1/llm',
  maxLocalMemory: 1024 * 1024 * 1024, // 1GB
}));
```

## License

MIT

## Links

- [Documentation](https://superinstance.io/docs/starter-agent)
- [Equipment Registry](https://github.com/SuperInstance?q=Equipment-)
- [Examples](https://github.com/SuperInstance/SuperInstance-Starter-Agent/tree/main/examples)
