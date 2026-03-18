/**
 * Express app export for testing
 *
 * This module exports the Express app without starting the server,
 * allowing tests to create their own server instances.
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { DodecetPosition, SpatialIndex, GeometricUtils } from './geometric.js';

// ============================================================================
// Agent State Management
// ============================================================================

export const AgentState = {
  IDLE: 'IDLE',
  THINKING: 'THINKING',
  ACTING: 'ACTING',
  EQUIPPING: 'EQUIPPING',
  UNEQUIPPING: 'UNEQUIPPING',
  ERROR: 'ERROR',
};

export const EquipmentSlot = {
  MEMORY: 'MEMORY',
  REASONING: 'REASONING',
  CONSENSUS: 'CONSENSUS',
  SPREADSHEET: 'SPREADSHEET',
  DISTILLATION: 'DISTILLATION',
  COORDINATION: 'COORDINATION',
};

// In-memory agent storage (export for testing)
export const agents = new Map();
export const cellToAgentMap = new Map();

// Spatial index for geometric queries
export const spatialIndex = new SpatialIndex(cellSize = 100);

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();

app.use(cors());
app.use(express.json());

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
    const { model, seed, equipment = ['MEMORY'], trigger, cellId, position } = req.body;

    // Validate required fields
    if (!model || !seed) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: model, seed',
      });
    }

    const agentId = uuidv4();
    const now = new Date().toISOString();

    // Parse or generate position
    let agentPosition;
    if (position) {
      // Accept any numeric position - DodecetPosition will clamp to valid range
      if (typeof position === 'object' &&
          typeof position.x === 'number' &&
          typeof position.y === 'number' &&
          typeof position.z === 'number') {
        agentPosition = position instanceof DodecetPosition
          ? position
          : new DodecetPosition(position.x, position.y, position.z);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid position format. Position must be an object with numeric x, y, z properties.',
        });
      }
    } else {
      // Generate random position if not provided
      agentPosition = GeometricUtils.randomPosition();
    }

    const agent = {
      id: agentId,
      state: AgentState.IDLE,
      config: {
        id: agentId,
        model,
        seed,
        equipment,
        trigger: trigger || { type: 'manual' },
        position: agentPosition.toJSON(),
      },
      equipped: equipment,
      lastTrigger: null,
      cellId,
      position: agentPosition.toJSON(),
      createdAt: now,
      updatedAt: now,
    };

    agents.set(agentId, agent);

    // Add to spatial index
    spatialIndex.add(agentId, agentPosition);

    // Map cell to agent if provided
    if (cellId) {
      const cellKey = `${cellId.sheetId}:${cellId.row}:${cellId.col}`;
      cellToAgentMap.set(cellKey, agentId);
    }

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

  // Remove from spatial index
  spatialIndex.remove(req.params.id);

  // Remove from cell mapping
  if (agent.cellId) {
    const cellKey = `${agent.cellId.sheetId}:${agent.cellId.row}:${agent.cellId.col}`;
    cellToAgentMap.delete(cellKey);
  }

  agents.delete(req.params.id);

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

  // Simulate agent processing (don't use setTimeout in tests)
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
// Spatial Query Endpoints
// ============================================================================

// Get agents near a position
app.get('/api/v1/agents/spatial/near', (req, res) => {
  try {
    const { x, y, z, radius = 100 } = req.query;

    if (x === undefined || y === undefined || z === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: x, y, z',
      });
    }

    const position = new DodecetPosition(
      parseFloat(x),
      parseFloat(y),
      parseFloat(z)
    );

    const nearbyAgentIds = spatialIndex.findNearby(position, parseFloat(radius));
    const nearbyAgents = nearbyAgentIds.map(id => agents.get(id)).filter(Boolean);

    res.json({
      success: true,
      data: nearbyAgents,
      meta: {
        query: { x: position.x, y: position.y, z: position.z, radius: parseFloat(radius) },
        count: nearbyAgents.length,
      },
    });
  } catch (error) {
    console.error('Error finding nearby agents:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get nearest neighbors to an agent
app.get('/api/v1/agents/:id/neighbors', (req, res) => {
  try {
    const agent = agents.get(req.params.id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    const count = parseInt(req.query.count) || 5;
    const position = DodecetPosition.fromJSON(agent.position);

    const nearest = spatialIndex.findNearest(position, count);
    const neighbors = nearest
      .filter(n => n.agentId !== req.params.id)
      .map(n => ({
        ...agents.get(n.agentId),
        distance: n.distance,
      }))
      .filter(Boolean);

    res.json({
      success: true,
      data: neighbors,
      meta: {
        agentId: req.params.id,
        position: agent.position,
        count: neighbors.length,
      },
    });
  } catch (error) {
    console.error('Error finding neighbors:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get agents in a region (bounding box)
app.get('/api/v1/agents/spatial/region', (req, res) => {
  try {
    const {
      minX, minY, minZ,
      maxX, maxY, maxZ,
    } = req.query;

    if (
      minX === undefined || minY === undefined || minZ === undefined ||
      maxX === undefined || maxY === undefined || maxZ === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: minX, minY, minZ, maxX, maxY, maxZ',
      });
    }

    const minPosition = new DodecetPosition(
      parseFloat(minX),
      parseFloat(minY),
      parseFloat(minZ)
    );
    const maxPosition = new DodecetPosition(
      parseFloat(maxX),
      parseFloat(maxY),
      parseFloat(maxZ)
    );

    const agentIds = spatialIndex.findInRegion(minPosition, maxPosition);
    const agentsInRegion = agentIds.map(id => agents.get(id)).filter(Boolean);

    res.json({
      success: true,
      data: agentsInRegion,
      meta: {
        region: { min: minPosition.toJSON(), max: maxPosition.toJSON() },
        count: agentsInRegion.length,
      },
    });
  } catch (error) {
    console.error('Error finding agents in region:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Update agent position
app.put('/api/v1/agents/:id/position', (req, res) => {
  try {
    const agent = agents.get(req.params.id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    const { x, y, z } = req.body;

    if (x === undefined || y === undefined || z === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: x, y, z',
      });
    }

    const newPosition = new DodecetPosition(
      parseFloat(x),
      parseFloat(y),
      parseFloat(z)
    );

    // Update agent
    agent.position = newPosition.toJSON();
    agent.config.position = newPosition.toJSON();
    agent.updatedAt = new Date().toISOString();

    // Update spatial index
    spatialIndex.update(req.params.id, newPosition);

    agents.set(req.params.id, agent);

    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get spatial index statistics
app.get('/api/v1/spatial/stats', (req, res) => {
  const stats = spatialIndex.getStats();

  res.json({
    success: true,
    data: {
      ...stats,
      totalAgents: agents.size,
      indexedAgents: stats.totalAgents,
    },
  });
});

export default app;
