/**
 * Minimal CLAW Server - MVP Demonstration
 *
 * This is a minimal working server that demonstrates the claw agent concept.
 * It provides:
 * - REST API for agent management
 * - WebSocket support for real-time updates
 * - Basic agent state management
 * - Cell integration hooks
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import http from 'http';

// ============================================================================
// Agent State Management
// ============================================================================

const AgentState = {
  IDLE: 'IDLE',
  THINKING: 'THINKING',
  ACTING: 'ACTING',
  EQUIPPING: 'EQUIPPING',
  UNEQUIPPING: 'UNEQUIPPING',
  ERROR: 'ERROR',
};

const EquipmentSlot = {
  MEMORY: 'MEMORY',
  REASONING: 'REASONING',
  CONSENSUS: 'CONSENSUS',
  SPREADSHEET: 'SPREADSHEET',
  DISTILLATION: 'DISTILLATION',
  COORDINATION: 'COORDINATION',
};

// In-memory agent storage
const agents = new Map();
const cellToAgentMap = new Map();

// ============================================================================
// Express Server Setup
// ============================================================================

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

// ============================================================================
// WebSocket Connection Handling
// ============================================================================

const wsClients = new Set();

wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');
  wsClients.add(ws);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('WebSocket message received:', message);

      // Handle subscription to agent updates
      if (message.type === 'SUBSCRIBE' && message.agentId) {
        ws.agentId = message.agentId;
        ws.send(JSON.stringify({
          type: 'SUBSCRIBED',
          agentId: message.agentId,
          timestamp: new Date().toISOString(),
        }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    wsClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast agent state changes
function broadcastAgentStateChange(agentId, oldState, newState) {
  const message = {
    type: 'AGENT_STATE_CHANGE',
    agentId,
    oldState,
    newState,
    timestamp: new Date().toISOString(),
  };

  wsClients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      // Send to all clients or specific subscribers
      if (!client.agentId || client.agentId === agentId) {
        client.send(JSON.stringify(message));
      }
    }
  });
}

// ============================================================================
// REST API Routes
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', agents: agents.size });
});

// List all agents
app.get('/api/v1/agents', (req, res) => {
  const agentList = Array.from(agents.values());
  res.json({
    success: true,
    data: agentList,
  });
});

// Get specific agent
app.get('/api/v1/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
  }
  res.json({ success: true, data: agent });
});

// Create new agent
app.post('/api/v1/agents', (req, res) => {
  try {
    const { model, seed, equipment = ['MEMORY'], trigger, cellId } = req.body;

    // Validate required fields
    if (!model || !seed) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: model, seed',
      });
    }

    const agentId = uuidv4();
    const now = new Date().toISOString();

    const agent = {
      id: agentId,
      state: AgentState.IDLE,
      config: {
        id: agentId,
        model,
        seed,
        equipment,
        trigger: trigger || { type: 'manual' },
      },
      equipped: equipment,
      lastTrigger: null,
      cellId,
      createdAt: now,
      updatedAt: now,
    };

    agents.set(agentId, agent);

    // Map cell to agent if provided
    if (cellId) {
      const cellKey = `${cellId.sheetId}:${cellId.row}:${cellId.col}`;
      cellToAgentMap.set(cellKey, agentId);
    }

    console.log(`Agent created: ${agentId} (${seed})`);

    res.status(201).json({
      success: true,
      data: agent,
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Update agent
app.patch('/api/v1/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
  }

  const updates = req.body;
  Object.assign(agent, updates);
  agent.updatedAt = new Date().toISOString();

  agents.set(req.params.id, agent);

  res.json({ success: true, data: agent });
});

// Delete agent
app.delete('/api/v1/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
  }

  // Remove from cell mapping
  if (agent.cellId) {
    const cellKey = `${agent.cellId.sheetId}:${agent.cellId.row}:${agent.cellId.col}`;
    cellToAgentMap.delete(cellKey);
  }

  agents.delete(req.params.id);

  console.log(`Agent deleted: ${req.params.id}`);

  res.json({ success: true });
});

// Trigger agent action
app.post('/api/v1/agents/:id/trigger', async (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
  }

  const oldState = agent.state;
  agent.state = AgentState.THINKING;
  agent.lastTrigger = new Date().toISOString();
  agent.updatedAt = new Date().toISOString();

  broadcastAgentStateChange(agent.id, oldState, AgentState.THINKING);

  // Simulate agent processing
  setTimeout(() => {
    agent.state = AgentState.ACTING;
    broadcastAgentStateChange(agent.id, AgentState.THINKING, AgentState.ACTING);

    setTimeout(() => {
      agent.state = AgentState.IDLE;
      broadcastAgentStateChange(agent.id, AgentState.ACTING, AgentState.IDLE);
    }, 1000);
  }, 1000);

  res.json({ success: true, data: agent });
});

// Get agent state
app.get('/api/v1/agents/:id/state', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
  }

  res.json({
    success: true,
    data: {
      id: agent.id,
      state: agent.state,
      lastTrigger: agent.lastTrigger,
      equipped: agent.equipped,
    },
  });
});

// Equip agent
app.post('/api/v1/agents/:id/equip', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
  }

  const { equipment } = req.body;
  if (!equipment || !Array.isArray(equipment)) {
    return res.status(400).json({
      success: false,
      error: 'equipment must be an array',
    });
  }

  // Validate equipment slots
  const validEquipment = equipment.filter(e => Object.values(EquipmentSlot).includes(e));
  agent.equipped = [...new Set([...agent.equipped, ...validEquipment])];
  agent.updatedAt = new Date().toISOString();

  res.json({ success: true, data: agent });
});

// Unequip agent
app.post('/api/v1/agents/:id/unequip', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
  }

  const { equipment } = req.body;
  if (!equipment || !Array.isArray(equipment)) {
    return res.status(400).json({
      success: false,
      error: 'equipment must be an array',
    });
  }

  agent.equipped = agent.equipped.filter(e => !equipment.includes(e));
  agent.updatedAt = new Date().toISOString();

  res.json({ success: true, data: agent });
});

// Get agent by cell
app.get('/api/v1/cells/:sheetId/:row/:col/agent', (req, res) => {
  const { sheetId, row, col } = req.params;
  const cellKey = `${sheetId}:${row}:${col}`;
  const agentId = cellToAgentMap.get(cellKey);

  if (!agentId) {
    return res.status(404).json({
      success: false,
      error: 'No agent found for this cell',
    });
  }

  const agent = agents.get(agentId);
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
  }

  res.json({ success: true, data: agent });
});

// ============================================================================
// Start Server
// ============================================================================

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           MINIMAL CLAW SERVER - MVP DEMONSTRATION          ║
╠════════════════════════════════════════════════════════════╣
║  Status: Running                                           ║
║  Port: ${PORT.toString().padEnd(50)}║
║  Health: http://localhost:${PORT}/health${' '.repeat(25)}║
║  Agents: ${agents.size.toString().padEnd(49)}║
╚════════════════════════════════════════════════════════════╝

Available Endpoints:
  GET    /health
  GET    /api/v1/agents
  POST   /api/v1/agents
  GET    /api/v1/agents/:id
  PATCH  /api/v1/agents/:id
  DELETE /api/v1/agents/:id
  POST   /api/v1/agents/:id/trigger
  GET    /api/v1/agents/:id/state
  POST   /api/v1/agents/:id/equip
  POST   /api/v1/agents/:id/unequip
  GET    /api/v1/cells/:sheetId/:row/:col/agent

WebSocket: ws://localhost:${PORT}/ws

Press Ctrl+C to stop
  `);
});
