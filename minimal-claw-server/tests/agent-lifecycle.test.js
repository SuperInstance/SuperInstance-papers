/**
 * Agent Lifecycle Tests
 *
 * Critical path tests for agent creation, retrieval, update, and deletion.
 */

import request from 'supertest';
import { agents, cellToAgentMap, AgentState } from '../src/app.js';
import app from '../src/app.js';

describe('Agent Lifecycle - Critical Path Tests', () => {
  beforeEach(() => {
    // Clear all agents before each test
    agents.clear();
    cellToAgentMap.clear();
  });

  describe('POST /api/v1/agents - Create Agent', () => {
    it('should create a new agent with valid data', async () => {
      const agentData = {
        model: 'deepseek-chat',
        seed: 'Test agent for monitoring',
        equipment: ['MEMORY', 'REASONING'],
        trigger: { type: 'data', source: 'sensor_1' },
      };

      const response = await request(app)
        .post('/api/v1/agents')
        .send(agentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.config.model).toBe(agentData.model);
      expect(response.body.data.config.seed).toBe(agentData.seed);
      expect(response.body.data.state).toBe(AgentState.IDLE);
      expect(response.body.data.equipped).toEqual(expect.arrayContaining(agentData.equipment));
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
    });

    it('should create agent with default equipment if none provided', async () => {
      const agentData = {
        model: 'deepseek-chat',
        seed: 'Test agent',
      };

      const response = await request(app)
        .post('/api/v1/agents')
        .send(agentData)
        .expect(201);

      expect(response.body.data.equipped).toEqual(['MEMORY']);
    });

    it('should reject agent creation without model', async () => {
      const agentData = {
        seed: 'Test agent',
      };

      const response = await request(app)
        .post('/api/v1/agents')
        .send(agentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should reject agent creation without seed', async () => {
      const agentData = {
        model: 'deepseek-chat',
      };

      const response = await request(app)
        .post('/api/v1/agents')
        .send(agentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should create agent with cell mapping', async () => {
      const agentData = {
        model: 'deepseek-chat',
        seed: 'Cell-based agent',
        cellId: {
          sheetId: 'sheet1',
          row: 5,
          col: 10,
        },
      };

      const response = await request(app)
        .post('/api/v1/agents')
        .send(agentData)
        .expect(201);

      expect(response.body.data.cellId).toEqual(agentData.cellId);
      expect(cellToAgentMap.has('sheet1:5:10')).toBe(true);
    });
  });

  describe('GET /api/v1/agents/:id - Get Agent', () => {
    it('should retrieve an existing agent', async () => {
      // Create an agent first
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Test agent',
        });

      const agentId = createResponse.body.data.id;

      // Get the agent
      const response = await request(app)
        .get(`/api/v1/agents/${agentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(agentId);
      expect(response.body.data).toHaveProperty('state');
      expect(response.body.data).toHaveProperty('config');
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .get('/api/v1/agents/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Agent not found');
    });
  });

  describe('GET /api/v1/agents - List Agents', () => {
    it('should return empty array when no agents exist', async () => {
      const response = await request(app)
        .get('/api/v1/agents')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return all agents', async () => {
      // Create multiple agents
      await request(app)
        .post('/api/v1/agents')
        .send({ model: 'deepseek-chat', seed: 'Agent 1' });

      await request(app)
        .post('/api/v1/agents')
        .send({ model: 'deepseek-chat', seed: 'Agent 2' });

      const response = await request(app)
        .get('/api/v1/agents')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('PATCH /api/v1/agents/:id - Update Agent', () => {
    it('should update agent fields', async () => {
      // Create an agent
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Original seed',
        });

      const agentId = createResponse.body.data.id;

      // Update the agent
      const response = await request(app)
        .patch(`/api/v1/agents/${agentId}`)
        .send({ state: AgentState.THINKING })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.state).toBe(AgentState.THINKING);
      expect(response.body.data.config.seed).toBe('Original seed');
    });

    it('should return 404 when updating non-existent agent', async () => {
      const response = await request(app)
        .patch('/api/v1/agents/non-existent-id')
        .send({ state: AgentState.THINKING })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Agent not found');
    });
  });

  describe('DELETE /api/v1/agents/:id - Delete Agent', () => {
    it('should delete an existing agent', async () => {
      // Create an agent
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Agent to delete',
        });

      const agentId = createResponse.body.data.id;

      // Delete the agent
      const response = await request(app)
        .delete(`/api/v1/agents/${agentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify agent is deleted
      await request(app)
        .get(`/api/v1/agents/${agentId}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent agent', async () => {
      const response = await request(app)
        .delete('/api/v1/agents/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Agent not found');
    });

    it('should remove cell mapping when deleting agent', async () => {
      // Create agent with cell mapping
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Cell agent',
          cellId: { sheetId: 'sheet1', row: 5, col: 10 },
        });

      const agentId = createResponse.body.data.id;
      expect(cellToAgentMap.has('sheet1:5:10')).toBe(true);

      // Delete the agent
      await request(app)
        .delete(`/api/v1/agents/${agentId}`)
        .expect(200);

      // Verify cell mapping is removed
      expect(cellToAgentMap.has('sheet1:5:10')).toBe(false);
    });
  });

  describe('POST /api/v1/agents/:id/trigger - Trigger Agent', () => {
    it('should trigger agent and update state', async () => {
      // Create an agent
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Triggerable agent',
        });

      const agentId = createResponse.body.data.id;
      expect(createResponse.body.data.state).toBe(AgentState.IDLE);

      // Trigger the agent
      const response = await request(app)
        .post(`/api/v1/agents/${agentId}/trigger`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.state).toBe(AgentState.THINKING);
      expect(response.body.data.lastTrigger).not.toBeNull();
    });

    it('should return 404 when triggering non-existent agent', async () => {
      const response = await request(app)
        .post('/api/v1/agents/non-existent-id/trigger')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Agent not found');
    });
  });

  describe('GET /api/v1/agents/:id/state - Get Agent State', () => {
    it('should return agent state', async () => {
      // Create an agent
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'State test agent',
        });

      const agentId = createResponse.body.data.id;

      // Get agent state
      const response = await request(app)
        .get(`/api/v1/agents/${agentId}/state`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', agentId);
      expect(response.body.data).toHaveProperty('state');
      expect(response.body.data).toHaveProperty('lastTrigger');
      expect(response.body.data).toHaveProperty('equipped');
    });

    it('should return 404 for non-existent agent state', async () => {
      const response = await request(app)
        .get('/api/v1/agents/non-existent-id/state')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Agent not found');
    });
  });
});
