/**
 * Geometric Encoding Integration Tests
 *
 * Tests for spatial queries and dodecet positioning
 */

import request from 'supertest';
import app, { agents, cellToAgentMap, spatialIndex } from '../src/app.js';

describe('Geometric Encoding Integration', () => {
  let testAgents = [];

  beforeEach(() => {
    // Clear agents before each test
    agents.clear();
    cellToAgentMap.clear();
    spatialIndex.clear();
    testAgents = [];
  });

  afterEach(() => {
    // Clean up after each test
    agents.clear();
    cellToAgentMap.clear();
    spatialIndex.clear();
  });

  describe('Agent Creation with Position', () => {
    test('should create agent with explicit position', async () => {
      const response = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'test_agent',
          equipment: ['MEMORY'],
          position: { x: 1000, y: 1500, z: 2000 }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.position).toEqual({ x: 1000, y: 1500, z: 2000 });
      expect(response.body.data.config.position).toEqual({ x: 1000, y: 1500, z: 2000 });
    });

    test('should create agent with random position if not provided', async () => {
      const response = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'test_agent',
          equipment: ['MEMORY']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.position).toBeDefined();
      expect(response.body.data.position.x).toBeGreaterThanOrEqual(0);
      expect(response.body.data.position.x).toBeLessThanOrEqual(4095);
    });

    test('should validate position bounds', async () => {
      const response = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'test_agent',
          equipment: ['MEMORY'],
          position: { x: 5000, y: 1500, z: 2000 } // x > 4095
        });

      expect(response.status).toBe(201);
      expect(response.body.data.position.x).toBe(4095); // Clamped to max
    });

    test('should add agent to spatial index', async () => {
      const response = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'test_agent',
          equipment: ['MEMORY'],
          position: { x: 1000, y: 1500, z: 2000 }
        });

      const agentId = response.body.data.id;
      const stats = spatialIndex.getStats();

      expect(stats.totalAgents).toBe(1);
    });
  });

  describe('Position Update', () => {
    test('should update agent position', async () => {
      // Create agent
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'test_agent',
          equipment: ['MEMORY'],
          position: { x: 1000, y: 1500, z: 2000 }
        });

      const agentId = createResponse.body.data.id;

      // Update position
      const updateResponse = await request(app)
        .put(`/api/v1/agents/${agentId}/position`)
        .send({ x: 2000, y: 2500, z: 3000 });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.position).toEqual({ x: 2000, y: 2500, z: 3000 });
    });

    test('should update spatial index when position changes', async () => {
      // Create agent
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'test_agent',
          equipment: ['MEMORY'],
          position: { x: 1000, y: 1500, z: 2000 }
        });

      const agentId = createResponse.body.data.id;

      // Update position
      await request(app)
        .put(`/api/v1/agents/${agentId}/position`)
        .send({ x: 3000, y: 3500, z: 4000 });

      // Query near old position (should not find agent)
      const oldPositionResponse = await request(app)
        .get('/api/v1/agents/spatial/near')
        .query({ x: 1000, y: 1500, z: 2000, radius: 100 });

      expect(oldPositionResponse.body.data.length).toBe(0);

      // Query near new position (should find agent)
      const newPositionResponse = await request(app)
        .get('/api/v1/agents/spatial/near')
        .query({ x: 3000, y: 3500, z: 4000, radius: 100 });

      expect(newPositionResponse.body.data.length).toBe(1);
      expect(newPositionResponse.body.data[0].id).toBe(agentId);
    });
  });

  describe('Spatial Queries', () => {
    beforeEach(async () => {
      // Create test agents in a grid pattern
      const positions = [
        { x: 1000, y: 1000, z: 1000 },
        { x: 1100, y: 1000, z: 1000 },
        { x: 1000, y: 1100, z: 1000 },
        { x: 1000, y: 1000, z: 1100 },
        { x: 3000, y: 3000, z: 3000 }, // Far away
      ];

      for (let i = 0; i < positions.length; i++) {
        const response = await request(app)
          .post('/api/v1/agents')
          .send({
            model: 'deepseek-chat',
            seed: `agent_${i}`,
            equipment: ['MEMORY'],
            position: positions[i]
          });

        testAgents.push(response.body.data);
      }
    });

    test('should find agents near a position', async () => {
      const response = await request(app)
        .get('/api/v1/agents/spatial/near')
        .query({ x: 1000, y: 1000, z: 1000, radius: 200 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(4); // Should find 4 nearby agents
      expect(response.body.meta.query).toEqual({
        x: 1000, y: 1000, z: 1000, radius: 200
      });
    });

    test('should return empty array when no agents nearby', async () => {
      const response = await request(app)
        .get('/api/v1/agents/spatial/near')
        .query({ x: 500, y: 500, z: 500, radius: 100 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(0);
    });

    test('should find agents in a region', async () => {
      const response = await request(app)
        .get('/api/v1/agents/spatial/region')
        .query({
          minX: 900, minY: 900, minZ: 900,
          maxX: 1200, maxY: 1200, maxZ: 1200
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(4); // Should find 4 agents in region
    });

    test('should find nearest neighbors', async () => {
      const agentId = testAgents[0].id;

      const response = await request(app)
        .get(`/api/v1/agents/${agentId}/neighbors`)
        .query({ count: 3 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(3); // Should find up to 3 nearest neighbors
      expect(response.body.data[0].agentId).not.toBe(agentId); // Should not include self
      expect(response.body.data[0].distance).toBeDefined();
      expect(response.body.data[0].distance).toBeGreaterThan(0);
    });

    test('should sort nearest neighbors by distance', async () => {
      const agentId = testAgents[0].id;

      const response = await request(app)
        .get(`/api/v1/agents/${agentId}/neighbors`)
        .query({ count: 5 });

      const distances = response.body.data.map(n => n.distance);
      const sortedDistances = [...distances].sort((a, b) => a - b);

      expect(distances).toEqual(sortedDistances);
    });
  });

  describe('Spatial Index Statistics', () => {
    test('should return spatial statistics', async () => {
      // Create some agents
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/v1/agents')
          .send({
            model: 'deepseek-chat',
            seed: `agent_${i}`,
            equipment: ['MEMORY'],
            position: {
              x: Math.floor(Math.random() * 4000),
              y: Math.floor(Math.random() * 4000),
              z: Math.floor(Math.random() * 4000)
            }
          });
      }

      const response = await request(app)
        .get('/api/v1/spatial/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAgents).toBe(10);
      expect(response.body.data.indexedAgents).toBe(10);
      expect(response.body.data.totalCells).toBeGreaterThan(0);
      expect(response.body.data.cellSize).toBeDefined();
      expect(response.body.data.avgAgentsPerCell).toBeGreaterThan(0);
    });
  });

  describe('Agent Deletion', () => {
    test('should remove agent from spatial index when deleted', async () => {
      // Create agent
      const createResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          model: 'deepseek-chat',
          seed: 'test_agent',
          equipment: ['MEMORY'],
          position: { x: 1000, y: 1500, z: 2000 }
        });

      const agentId = createResponse.body.data.id;

      // Verify agent is in spatial index
      let stats = spatialIndex.getStats();
      expect(stats.totalAgents).toBe(1);

      // Delete agent
      await request(app)
        .delete(`/api/v1/agents/${agentId}`);

      // Verify agent is removed from spatial index
      stats = spatialIndex.getStats();
      expect(stats.totalAgents).toBe(0);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large number of agents efficiently', async () => {
      const startTime = Date.now();

      // Create 100 agents
      const createPromises = [];
      for (let i = 0; i < 100; i++) {
        createPromises.push(
          request(app)
            .post('/api/v1/agents')
            .send({
              model: 'deepseek-chat',
              seed: `agent_${i}`,
              equipment: ['MEMORY'],
              position: {
                x: Math.floor(Math.random() * 4000),
                y: Math.floor(Math.random() * 4000),
                z: Math.floor(Math.random() * 4000)
              }
            })
        );
      }

      await Promise.all(createPromises);
      const createTime = Date.now() - startTime;

      // Spatial query should be fast
      const queryStart = Date.now();
      const response = await request(app)
        .get('/api/v1/agents/spatial/near')
        .query({ x: 2000, y: 2000, z: 2000, radius: 500 });
      const queryTime = Date.now() - queryStart;

      expect(response.body.success).toBe(true);
      expect(createTime).toBeLessThan(5000); // Should create 100 agents in < 5s
      expect(queryTime).toBeLessThan(100); // Query should be < 100ms
    });

    test('should maintain O(1) average query performance', async () => {
      // Create agents at different scales
      const scales = [10, 50, 100];
      const queryTimes = [];

      for (const scale of scales) {
        // Clear previous agents
        agents.clear();
        spatialIndex.clear();

        // Create agents
        for (let i = 0; i < scale; i++) {
          await request(app)
            .post('/api/v1/agents')
            .send({
              model: 'deepseek-chat',
              seed: `agent_${i}`,
              equipment: ['MEMORY'],
              position: {
                x: Math.floor(Math.random() * 4000),
                y: Math.floor(Math.random() * 4000),
                z: Math.floor(Math.random() * 4000)
              }
            });
        }

        // Measure query time
        const start = Date.now();
        await request(app)
          .get('/api/v1/agents/spatial/near')
          .query({ x: 2000, y: 2000, z: 2000, radius: 500 });
        const queryTime = Date.now() - start;

        queryTimes.push(queryTime);
      }

      // Query time should not grow linearly with agent count
      // (demonstrating O(1) average case)
      expect(queryTimes[2]).toBeLessThan(queryTimes[0] * 3);
    });
  });
});
