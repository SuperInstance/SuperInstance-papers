# Minimal CLAW Server - MVP Demonstration

**A minimal working CLAW server demonstrating cellular agents in spreadsheet cells.**

## Overview

This is a **minimal working MVP** that demonstrates the core concept of cellular agents (claws) living in spreadsheet cells. It provides:

- ✅ REST API for agent management
- ✅ WebSocket support for real-time updates
- ✅ Basic agent state management (IDLE, THINKING, ACTING)
- ✅ Cell-to-agent mapping
- ✅ Equipment system
- ✅ Trigger system

## Quick Start

### 1. Install Dependencies

```bash
cd minimal-claw-server
npm install
```

### 2. Start Server

```bash
npm start
```

Server will start on `http://localhost:8080`

### 3. Run Tests

In a separate terminal:

```bash
npm test
```

## API Endpoints

### Agent Management

- `GET /health` - Health check
- `GET /api/v1/agents` - List all agents
- `POST /api/v1/agents` - Create new agent
- `GET /api/v1/agents/:id` - Get agent by ID
- `PATCH /api/v1/agents/:id` - Update agent
- `DELETE /api/v1/agents/:id` - Delete agent

### Agent Actions

- `POST /api/v1/agents/:id/trigger` - Trigger agent action
- `GET /api/v1/agents/:id/state` - Get agent state
- `POST /api/v1/agents/:id/equip` - Equip agent
- `POST /api/v1/agents/:id/unequip` - Unequip agent

### Cell Integration

- `GET /api/v1/cells/:sheetId/:row/:col/agent` - Get agent by cell

### WebSocket

- `WS /ws` - WebSocket connection for real-time updates

## Example Usage

### Create an Agent for Cell A1

```bash
curl -X POST http://localhost:8080/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "seed": "Monitor cell A1 for temperature changes",
    "equipment": ["MEMORY", "REASONING"],
    "trigger": { "type": "data", "source": "spreadsheet" },
    "cellId": { "sheetId": "sheet1", "row": 0, "col": 0 }
  }'
```

### Trigger Agent

```bash
curl -X POST http://localhost:8080/api/v1/agents/{agentId}/trigger
```

### Get Agent by Cell

```bash
curl http://localhost:8080/api/v1/cells/sheet1/0/0/agent
```

## Agent States

- `IDLE` - Agent is waiting for trigger
- `THINKING` - Agent is processing
- `ACTING` - Agent is taking action
- `EQUIPPING` - Agent is equipping modules
- `UNEQUIPPING` - Agent is unequipping modules
- `ERROR` - Agent encountered an error

## Equipment Slots

- `MEMORY` - State persistence
- `REASONING` - Decision making
- `CONSENSUS` - Multi-agent agreement
- `SPREADSHEET` - Cell integration
- `DISTILLATION` - Model compression
- `COORDINATION` - Multi-agent orchestration

## WebSocket Example

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => {
  // Subscribe to agent updates
  ws.send(JSON.stringify({
    type: 'SUBSCRIBE',
    agentId: 'your-agent-id'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Agent update:', message);
};
```

## Integration with Spreadsheet-Moment

The `@superinstance/spreadsheet-claw-integration` package connects this server to the spreadsheet-moment platform:

```typescript
import { SpreadsheetClawIntegration } from '@superinstance/spreadsheet-claw-integration';

const integration = new SpreadsheetClawIntegration({
  integrationConfig: {
    clawServerUrl: 'http://localhost:8080',
  },
});

// Create agent for cell
const agent = await integration.createAgentForCell(
  { sheetId: 'sheet1', row: 0, col: 0 },
  {
    model: 'deepseek-chat',
    seed: 'Monitor cell value changes',
    equipment: ['MEMORY', 'REASONING'],
    trigger: { type: 'data', source: 'spreadsheet' },
  }
);
```

## Limitations (Honest Assessment)

### What Works ✅

- Create/delete/update agents via REST API
- Map agents to spreadsheet cells
- Trigger agents and track state changes
- WebSocket real-time updates
- Basic equipment system
- Cell-based agent lookup

### What Doesn't Work Yet ❌

- No actual ML model integration (just state simulation)
- No real reasoning engine
- No persistence (in-memory only)
- No authentication/authorization
- No rate limiting
- No actual spreadsheet integration (just API endpoints)
- No multi-agent coordination
- No seed learning system

### Next Steps for Full Implementation

1. Add ML model integration (DeepSeek, etc.)
2. Implement actual reasoning logic
3. Add persistence layer (database)
4. Implement authentication
5. Build real spreadsheet-moment integration
6. Add seed learning system
7. Implement multi-agent coordination

## License

MIT

## Repository

https://github.com/SuperInstance/minimal-claw-server
