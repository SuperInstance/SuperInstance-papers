/**
 * Tests for DatabaseManager
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DatabaseManager } from '../DatabaseManager.js';
import type { DatabaseManagerConfig } from '../DatabaseManager.js';

// Mock pg
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockConnect = jest.fn();
  const mockEnd = jest.fn();

  const mockPool = {
    connect: mockConnect,
    query: mockQuery,
    end: mockEnd,
    totalCount: 5,
    idleCount: 2,
    waitCount: 0,
  };

  return {
    Pool: jest.fn().mockImplementation(() => mockPool),
  };
});

// Mock ioredis
jest.mock('ioredis', () => {
  const mockGet = jest.fn();
  const mockSet = jest.fn();
  const mockSetex = jest.fn();
  const mockDel = jest.fn();
  const mockKeys = jest.fn();
  const mockPing = jest.fn();
  const mockQuit = jest.fn();
  const mockInfo = jest.fn();

  return {
    default: jest.fn().mockImplementation(() => ({
      get: mockGet,
      set: mockSet,
      setex: mockSetex,
      del: mockDel,
      keys: mockKeys,
      ping: mockPing,
      quit: mockQuit,
      info: mockInfo,
    })),
  };
});

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;
  let config: DatabaseManagerConfig;

  beforeEach(() => {
    config = {
      database: {
        host: 'localhost',
        port: 5432,
        database: 'polln_test',
        user: 'test_user',
        password: 'test_password',
        pool: {
          min: 2,
          max: 10,
        },
      },
      cache: {
        host: 'localhost',
        port: 6379,
        keyPrefix: 'polln_test',
      },
    };

    dbManager = new DatabaseManager(config);
  });

  afterEach(async () => {
    if (dbManager.isReady()) {
      await dbManager.close();
    }
  });

  describe('initialization', () => {
    it('should initialize PostgreSQL and Redis connections', async () => {
      await dbManager.initialize();

      expect(dbManager.isReady()).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      const badConfig = {
        ...config,
        database: {
          ...config.database,
          host: 'invalid-host',
        },
      };

      const badManager = new DatabaseManager(badConfig);

      await expect(badManager.initialize()).rejects.toThrow();
    });
  });

  describe('health checks', () => {
    it('should return healthy status when all connections are good', async () => {
      await dbManager.initialize();

      const health = await dbManager.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.database.connected).toBe(true);
      expect(health.cache.connected).toBe(true);
    });

    it('should include latency metrics', async () => {
      await dbManager.initialize();

      const health = await dbManager.healthCheck();

      expect(health.database.latency).toBeGreaterThanOrEqual(0);
      expect(health.cache.latency).toBeGreaterThanOrEqual(0);
    });

    it('should include pool statistics', async () => {
      await dbManager.initialize();

      const health = await dbManager.healthCheck();

      expect(health.database.poolSize).toBeGreaterThan(0);
      expect(health.database.availableConnections).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cache operations', () => {
    beforeEach(async () => {
      await dbManager.initialize();
    });

    it('should set and get cache values', async () => {
      const key = 'test-key';
      const value = { foo: 'bar' };

      await dbManager.cacheSet(key, value);
      const retrieved = await dbManager.cacheGet(key);

      expect(retrieved).toEqual(value);
    });

    it('should set cache with TTL', async () => {
      const key = 'test-key-ttl';
      const value = { foo: 'bar' };

      await dbManager.cacheSet(key, value, 60);
      const retrieved = await dbManager.cacheGet(key);

      expect(retrieved).toEqual(value);
    });

    it('should delete cache values', async () => {
      const key = 'test-key-delete';

      await dbManager.cacheSet(key, { foo: 'bar' });
      await dbManager.cacheDelete(key);

      const retrieved = await dbManager.cacheGet(key);
      expect(retrieved).toBeNull();
    });

    it('should handle cache errors gracefully', async () => {
      const retrieved = await dbManager.cacheGet('non-existent-key');
      expect(retrieved).toBeNull();
    });
  });

  describe('transactions', () => {
    beforeEach(async () => {
      await dbManager.initialize();
    });

    it('should execute operations within a transaction', async () => {
      let transactionExecuted = false;

      await dbManager.transaction(async (tx) => {
        transactionExecuted = true;
        await tx.query('SELECT 1');
      });

      expect(transactionExecuted).toBe(true);
    });

    it('should rollback on error', async () => {
      let rollbackOccurred = false;

      try {
        await dbManager.transaction(async (tx) => {
          await tx.query('SELECT 1');
          throw new Error('Test error');
        });
      } catch (error) {
        rollbackOccurred = true;
      }

      expect(rollbackOccurred).toBe(true);
    });

    it('should prevent nested transactions', async () => {
      await expect(
        dbManager.transaction(async (tx) => {
          await dbManager.transaction(async () => {
            // This should fail
          });
        })
      ).rejects.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should close all connections', async () => {
      await dbManager.initialize();
      await dbManager.close();

      expect(dbManager.isReady()).toBe(false);
    });

    it('should handle close when not initialized', async () => {
      await expect(dbManager.close()).resolves.not.toThrow();
    });
  });

  describe('pool statistics', () => {
    beforeEach(async () => {
      await dbManager.initialize();
    });

    it('should return pool statistics', () => {
      const stats = dbManager.getPoolStats();

      expect(stats).not.toBeNull();
      expect(stats?.totalCount).toBeGreaterThanOrEqual(0);
      expect(stats?.idleCount).toBeGreaterThanOrEqual(0);
    });

    it('should return null when pool is not initialized', () => {
      const newManager = new DatabaseManager(config);
      const stats = newManager.getPoolStats();

      expect(stats).toBeNull();
    });
  });
});
