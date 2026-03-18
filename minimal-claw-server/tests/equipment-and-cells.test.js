/**
 * Equipment and Cell Integration Tests
 *
 * Tests for equipment management and cell-based agent queries.
 */

import request from 'supertest';
import { agents, cellToAgentMap, EquipmentSlot } from '../src/app.js';
import app from '../src/app.js';

describe('Equipment and Cell Integration Tests', () => {
  beforeEach(() => {
    agents.clear();
    cellToAgentMap.clear();
  });

  describe('POST /api/v1/agents/:id/equip - Equip Agent', () => {
    it('should equip agent with valid equipment', async () => {
      // Create an agent
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Equipment test agent',
          equipment: ['MEMORY'],
        });

      const agentId = createResponse.body.data.id;

      // Equip with additional equipment
      const response = await request(app)
        .post(`/api/v1/agents/${agentId}/equip`)
        .send({ equipment: [EquipmentSlot.REASONING, EquipmentSlot.CONSENSUS] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.equipped).toContain(EquipmentSlot.MEMORY);
      expect(response.body.data.equipped).toContain(EquipmentSlot.REASONING);
      expect(response.body.data.equipped).toContain(EquipmentSlot.CONSENSUS);
    });

    it('should prevent duplicate equipment', async () => {
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Duplicate equipment test',
          equipment: ['MEMORY'],
        });

      const agentId = createResponse.body.data.id;

      // Try to equip with same equipment
      const response = await request(app)
        .post(`/api/v1/agents/${agentId}/equip`)
        .send({ equipment: [EquipmentSlot.MEMORY] })
        .expect(200);

      // Should only have one instance of MEMORY
      const memoryCount = response.body.data.equipped.filter(e => e === EquipmentSlot.MEMORY).length;
      expect(memoryCount).toBe(1);
    });

    it('should ignore invalid equipment slots', async () => {
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Invalid equipment test',
        });

      const agentId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/v1/agents/${agentId}/equip`)
        .send({
          equipment: ['INVALID_SLOT', EquipmentSlot.REASONING],
        })
        .expect(200);

      // Should only have valid equipment
      expect(response.body.data.equipped).not.toContain('INVALID_SLOT');
      expect(response.body.data.equipped).toContain(EquipmentSlot.REASONING);
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .post('/api/v1/agents/non-existent-id/equip')
        .send({ equipment: [EquipmentSlot.MEMORY] })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Agent not found');
    });

    it('should reject non-array equipment', async () => {
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({ model: 'deepseek-chat', seed: 'Test agent' });

      const agentId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/v1/agents/${agentId}/equip`)
        .send({ equipment: 'NOT_AN_ARRAY' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('equipment must be an array');
    });
  });

  describe('POST /api/v1/agents/:id/unequip - Unequip Agent', () => {
    it('should unequip agent equipment', async () => {
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Unequip test agent',
          equipment: [EquipmentSlot.MEMORY, EquipmentSlot.REASONING],
        });

      const agentId = createResponse.body.data.id;

      // Unequip MEMORY
      const response = await request(app)
        .post(`/api/v1/agents/${agentId}/unequip`)
        .send({ equipment: [EquipmentSlot.MEMORY] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.equipped).not.toContain(EquipmentSlot.MEMORY);
      expect(response.body.data.equipped).toContain(EquipmentSlot.REASONING);
    });

    it('should handle unequipping non-equipped equipment', async () => {
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Test agent',
          equipment: [EquipmentSlot.MEMORY],
        });

      const agentId = createResponse.body.data.id;

      // Try to unequip equipment that's not equipped
      const response = await request(app)
        .post(`/api/v1/agents/${agentId}/unequip`)
        .send({ equipment: [EquipmentSlot.REASONING] })
        .expect(200);

      // MEMORY should still be there
      expect(response.body.data.equipped).toContain(EquipmentSlot.MEMORY);
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .post('/api/v1/agents/non-existent-id/unequip')
        .send({ equipment: [EquipmentSlot.MEMORY] })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Agent not found');
    });

    it('should reject non-array equipment', async () => {
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({ model: 'deepseek-chat', seed: 'Test agent' });

      const agentId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/v1/agents/${agentId}/unequip`)
        .send({ equipment: 'NOT_AN_ARRAY' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('equipment must be an array');
    });
  });

  describe('GET /api/v1/cells/:sheetId/:row/:col/agent - Get Agent by Cell', () => {
    it('should retrieve agent by cell location', async () => {
      // Create agent with cell mapping
      await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Cell-based agent',
          cellId: {
            sheetId: 'sheet1',
            row: 5,
            col: 10,
          },
        });

      // Get agent by cell
      const response = await request(app)
        .get('/api/v1/cells/sheet1/5/10/agent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cellId).toEqual({
        sheetId: 'sheet1',
        row: 5,
        col: 10,
      });
    });

    it('should return 404 for cell without agent', async () => {
      const response = await request(app)
        .get('/api/v1/cells/sheet1/99/99/agent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No agent found for this cell');
    });

    it('should handle multiple agents in different cells', async () => {
      // Create multiple agents in different cells
      await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Agent 1',
          cellId: { sheetId: 'sheet1', row: 1, col: 1 },
        });

      await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Agent 2',
          cellId: { sheetId: 'sheet1', row: 2, col: 2 },
        });

      // Get first agent
      const response1 = await request(app)
        .get('/api/v1/cells/sheet1/1/1/agent')
        .expect(200);

      expect(response1.body.data.config.seed).toBe('Agent 1');

      // Get second agent
      const response2 = await request(app)
        .get('/api/v1/cells/sheet1/2/2/agent')
        .expect(200);

      expect(response2.body.data.config.seed).toBe('Agent 2');
    });

    it('should handle different sheets', async () => {
      // Create agents on different sheets
      await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Sheet 1 agent',
          cellId: { sheetId: 'sheet1', row: 1, col: 1 },
        });

      await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Sheet 2 agent',
          cellId: { sheetId: 'sheet2', row: 1, col: 1 },
        });

      // Verify both agents can be retrieved
      const response1 = await request(app)
        .get('/api/v1/cells/sheet1/1/1/agent')
        .expect(200);

      const response2 = await request(app)
        .get('/api/v1/cells/sheet2/1/1/agent')
        .expect(200);

      expect(response1.body.data.config.seed).toBe('Sheet 1 agent');
      expect(response2.body.data.config.seed).toBe('Sheet 2 agent');
    });
  });

  describe('Equipment Workflow Integration', () => {
    it('should support full equipment lifecycle', async () => {
      // Create agent with basic equipment
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Full lifecycle agent',
          equipment: [EquipmentSlot.MEMORY],
        });

      const agentId = createResponse.body.data.id;
      expect(createResponse.body.data.equipped).toEqual([EquipmentSlot.MEMORY]);

      // Equip additional equipment
      const equipResponse = await request(app)
        .post(`/api/v1/agents/${agentId}/equip`)
        .send({ equipment: [EquipmentSlot.REASONING, EquipmentSlot.CONSENSUS] });

      expect(equipResponse.body.data.equipped).toHaveLength(3);

      // Unequip one equipment
      const unequipResponse = await request(app)
        .post(`/api/v1/agents/${agentId}/unequip`)
        .send({ equipment: [EquipmentSlot.MEMORY] });

      expect(unequipResponse.body.data.equipped).not.toContain(EquipmentSlot.MEMORY);
      expect(unequipResponse.body.data.equipped).toContain(EquipmentSlot.REASONING);
      expect(unequipResponse.body.data.equipped).toContain(EquipmentSlot.CONSENSUS);
    });
  });
});
