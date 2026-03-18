# @spreadsheet-moment/agent-formulas

**Spreadsheet formula functions** for agent operations.

[![Tests](https://img.shields.io/badge/Tests-100%25-brightgreen.svg)](https://github.com/SuperInstance/spreadsheet-moment)
[![Coverage](https://img.shields.io/badge/Coverage-80%25-brightgreen.svg)](https://github.com/SuperInstance/spreadsheet-moment)

## Overview

The `@spreadsheet-moment/agent-formulas` package provides spreadsheet formula functions for creating, querying, and managing agents directly from spreadsheet cells.

## Features

### CLAW_NEW
Create new agent in cell:

```
=CLAW_NEW("agent_name", "model", "purpose")
```

```typescript
=CLAW_NEW(
  "temperature_monitor",
  "deepseek-chat",
  "Monitor temperature sensors and detect anomalies"
)
```

### CLAW_QUERY
Query agent state and results:

```
=CLAW_QUERY(cell_reference)
```

```typescript
=CLAW_QUERY(A1)
// Returns: { state: "thinking", confidence: 0.8, ... }
```

### CLAW_CANCEL
Cancel running agent:

```
=CLAW_CANCEL(cell_reference)
```

```typescript
=CLAW_CANCEL(A1)
// Cancels the agent in cell A1
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   FORMULA LAYER                              │
├─────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────┐       │
│  │           Formula Engine Integration              │       │
│  │  • Univer formula registration                    │       │
│  │  • Parameter parsing                              │       │
│  │  • Result formatting                              │       │
│  └────────────┬─────────────────────────────────────┘       │
│               │                                               │
│      ┌────────┴────────┐                                    │
│      │                 │                                     │
│  ┌───▼────────┐  ┌────▼──────────┐  ┌─────────────┐      │
│  │  CLAW_NEW  │  │  CLAW_QUERY   │  │ CLAW_CANCEL  │      │
│  │            │  │              │  │             │      │
│  │ • Create   │  │ • Query      │  │ • Cancel    │      │
│  │ • Config   │  │ • State      │  │ • Cleanup   │      │
│  │ • Validate │  │ • Results    │  │ • Status    │      │
│  └────────────┘  └───────────────┘  └─────────────┘      │
│                                                                   │
└─────────────────────────────────────────────────────────────┘
```

## Installation

```bash
pnpm add @spreadsheet-moment/agent-formulas
```

## Usage

### Basic Formulas

```excel
A1: =CLAW_NEW("monitor", "deepseek-chat", "Monitor data")
A2: =CLAW_QUERY(A1)
A3: =CLAW_CANCEL(A1)
```

### Advanced Configuration

```excel
=CLAW_NEW(
  "anomaly_detector",
  "deepseek-chat",
  "Detect anomalies in sensor data",
  {
    "trigger": {"type": "cell_change", "cellId": "B1"},
    "equipment": ["MEMORY", "REASONING"],
    "maxReasoningSteps": 10
  }
)
```

### Query Options

```excel
=CLAW_QUERY(A1, {"includeReasoning": true, "includeMemory": true})
```

## Formula Reference

### CLAW_NEW

**Syntax:**
```
=CLAW_NEW(name, model, purpose, [options])
```

**Parameters:**
- `name` (string): Agent name
- `model` (string): Model identifier
- `purpose` (string): Agent purpose
- `options` (object, optional): Configuration options

**Returns:** Agent ID

**Example:**
```excel
=CLAW_NEW(
  "data_analyzer",
  "deepseek-chat",
  "Analyze sales data",
  {
    "trigger": {"type": "periodic", "interval": 60000},
    "equipment": ["MEMORY", "REASONING"]
  }
)
```

### CLAW_QUERY

**Syntax:**
```
=CLAW_QUERY(cell_reference, [options])
```

**Parameters:**
- `cell_reference` (reference): Cell containing agent
- `options` (object, optional): Query options

**Returns:** Agent state object

**Example:**
```excel
=CLAW_QUERY(A1, {"includeReasoning": true})
```

**Response Format:**
```json
{
  "clawId": "claw_123",
  "state": "thinking",
  "confidence": 0.8,
  "reasoning": [
    {"step": 1, "content": "Analyzing data..."}
  ],
  "memory": [],
  "lastUpdated": 1648000000000
}
```

### CLAW_CANCEL

**Syntax:**
```
=CLAW_CANCEL(cell_reference, [reason])
```

**Parameters:**
- `cell_reference` (reference): Cell containing agent
- `reason` (string, optional): Cancellation reason

**Returns:** Cancellation status

**Example:**
```excel
=CLAW_CANCEL(A1, "No longer needed")
```

## Options

### CLAW_NEW Options

```typescript
interface ClawNewOptions {
  trigger?: {
    type: 'cell_change' | 'periodic' | 'manual';
    cellId?: string;
    interval?: number;
  };
  equipment?: Array<'MEMORY' | 'REASONING' | 'CONSENSUS'>;
  maxReasoningSteps?: number;
  timeout?: number;
  confidence?: number;
}
```

### CLAW_QUERY Options

```typescript
interface ClawQueryOptions {
  includeReasoning?: boolean;
  includeMemory?: boolean;
  includeRelationships?: boolean;
  format?: 'json' | 'summary' | 'detailed';
}
```

## Integration

### Univer Integration

```typescript
import { registerAgentFunctions } from '@spreadsheet-moment/agent-formulas';
import { Workbook } from '@univerjs/core';

const workbook = new Workbook();
registerAgentFunctions(workbook);
```

### Custom Functions

```typescript
import { ClawFunctionRegistry } from '@spreadsheet-moment/agent-formulas';

ClawFunctionRegistry.register('CLAW_CUSTOM', (params) => {
  // Custom function logic
  return result;
});
```

## Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run integration tests
pnpm test:integration
```

## Performance

- **Formula execution**: <10ms
- **Agent creation**: <100ms
- **State query**: <50ms
- **Memory overhead**: ~1MB per formula

## License

Apache-2.0

## Links

- [GitHub](https://github.com/SuperInstance/spreadsheet-moment)
- [Documentation](https://docs.spreadsheet-moment.dev)
- [Univer](https://univer.work)
