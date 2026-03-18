/**
 * Health Check and Error Handling Tests
 *
 * Tests for health endpoints, error handling, and edge cases.
 */

import request from 'supertest';
import { agents } from '../src/app.js';
import app from '../src/app.js';

describe('Health Check and Error Handling Tests', () => {
  beforeEach(() => {
    agents.clear();
  });

  describe('GET /health - Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('agents', 0);
    });

    it('should report correct agent count', async () => {
      // Create some agents
      await request(app)
        .post('/api/v1/agents')
        .send({ model: 'deepseek-chat', seed: 'Agent 1' });

      await request(app)
        .post('/api/v1/agents')
        .send({ model: 'deepseek-chat', seed: 'Agent 2' });

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.agents).toBe(2);
    });
  });

  describe('Error Handling - Invalid JSON', () => {
    it('should handle invalid JSON in POST body', async () => {
      const response = await request(app)
        .post('/api/v1/agents')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      // Should return an error (Express handles this)
      expect(response.body).toBeDefined();
    });
  });

  describe('Error Handling - Missing Fields', () => {
    it('should handle empty POST body', async () => {
      const response = await request(app)
        .post('/api/v1/agents')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should handle partial agent data', async () => {
      const response = await request(app)
        .post('/api/v1/agents')
        .send({ model: 'deepseek-chat' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling - Invalid IDs', () => {
    it('should handle non-existent agent IDs', async () => {
      const nonExistentIds = [
        'not-a-uuid',
        '12345',
        'abc-123-def',
        '00000000-0000-0000-0000-000000000000',
      ];

      for (const id of nonExistentIds) {
        const response = await request(app)
          .get(`/api/v1/agents/${id}`);

        // Should return 404 for non-existent agents
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Agent not found');
      }
    });
  });

  describe('Edge Cases - Large Data', () => {
    it('should handle very long seed text', async () => {
      const longSeed = 'A'.repeat(10000);

      const response = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: longSeed,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.config.seed).toBe(longSeed);
    });

    it('should handle many equipment slots', async () => {
      const allEquipment = [
        'MEMORY',
        'REASONING',
        'CONSENSUS',
        'SPREADSHEET',
        'DISTILLATION',
        'COORDINATION',
      ];

      const response = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Fully equipped agent',
          equipment: allEquipment,
        })
        .expect(201);

      expect(response.body.data.equipped).toEqual(expect.arrayContaining(allEquipment));
    });
  });

  describe('Edge Cases - Special Characters', () => {
    it('should handle special characters in seed', async () => {
      const specialSeed = 'Test seed with émojis 🎉 and spëcial çhars';

      const response = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: specialSeed,
        })
        .expect(201);

      expect(response.body.data.config.seed).toBe(specialSeed);
    });

    it('should handle special characters in model name', async () => {
      const response = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'model-with_special.chars@v1',
          seed: 'Test agent',
        })
        .expect(201);

      expect(response.body.data.config.model).toBe('model-with_special.chars@v1');
    });
  });

  describe('Edge Cases - Cell Mapping', () => {
    it('should handle zero-based row/col', async () => {
      const response = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Zero-based agent',
          cellId: { sheetId: 'sheet1', row: 0, col: 0 },
        })
        .expect(201);

      expect(response.body.data.cellId).toEqual({ sheetId: 'sheet1', row: 0, col: 0 });
    });

    it('should handle large row/col numbers', async () => {
      const response = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'Large coordinates agent',
          cellId: { sheetId: 'sheet1', row: 99999, col: 99999 },
        })
        .expect(201);

      expect(response.body.data.cellId).toEqual({
        sheetId: 'sheet1',
        row: 99999,
        col: 99999,
      });
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous agent creations', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/v1/agents')
            .send({
              model: 'deepseek-chat',
              seed: `Concurrent agent ${i}`,
            })
        );
      }

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Should have 10 unique agents
      const ids = responses.map(r => r.body.data.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('Update Edge Cases', () => {
    it('should handle empty update', async () => {
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({ model: 'deepseek-chat', seed: 'Test agent' });

      const agentId = createResponse.body.data.id;
      const originalUpdatedAt = createResponse.body.data.updatedAt;

      const response = await request(app)
        .patch(`/api/v1/agents/${agentId}`)
        .send({})
        .expect(200);

      // updatedAt should still change
      expect(response.body.data.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should handle updating ID field (current behavior allows it)', async () => {
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({ model: 'deepseek-chat', seed: 'Test agent' });

      const agentId = createResponse.body.data.id;

      // Try to update the ID (currently allowed by API)
      const response = await request(app)
        .patch(`/api/v1/agents/${agentId}`)
        .send({ id: 'new-id' })
        .expect(200);

      // Current behavior: ID gets updated
      expect(response.body.data.id).toBe('new-id');
      // Note: This is a known issue - ID should be immutable in production
    });
  });

  describe('Trigger Edge Cases', () => {
    it('should handle rapid triggers', async () => {
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({ model: 'deepseek-chat', seed: 'Rapid trigger agent' });

      const agentId = createResponse.body.data.id;

      // Trigger multiple times rapidly
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app).post(`/api/v1/agents/${agentId}/trigger`)
        );
      }

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
