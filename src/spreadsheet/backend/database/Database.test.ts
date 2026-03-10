/**
 * Database Tests
 *
 * Comprehensive test suite for database layer:
 * - Repository tests
 * - Migration tests
 * - Performance benchmarks
 * - Connection pool tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool, PoolConfig } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import {
  UserRepository,
  SpreadsheetRepository,
  CellRepository,
  ConsciousnessRepository,
  CollaborationRepository,
} from './repositories';
import { ConnectionManager, getConnectionManager } from './ConnectionManager';
import { QueryOptimizer } from './QueryOptimizer';

// Test configuration
const TEST_CONFIG: PoolConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'polln_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
  max: 20,
};

describe('Database Tests', () => {
  let pool: Pool;
  let connectionManager: ConnectionManager;
  let queryOptimizer: QueryOptimizer;

  beforeAll(async () => {
    // Create test database connection
    pool = new Pool(TEST_CONFIG);

    // Initialize connection manager
    connectionManager = new ConnectionManager({
      host: TEST_CONFIG.host!,
      port: TEST_CONFIG.port!,
      database: TEST_CONFIG.database!,
      user: TEST_CONFIG.user!,
      password: TEST_CONFIG.password!,
    });

    await connectionManager.connect();

    // Initialize query optimizer
    queryOptimizer = new QueryOptimizer(pool, {
      cacheEnabled: true,
      cacheTtl: 60000,
      maxCacheSize: 1000,
    });

    // Setup test schema
    await setupTestSchema();
  });

  afterAll(async () => {
    // Cleanup test schema
    await teardownTestSchema();

    // Close connections
    await connectionManager.disconnect();
    await pool.end();
  });

  beforeEach(async () => {
    // Clear test data before each test
    await clearTestData();
  });

  describe('ConnectionManager', () => {
    it('should connect to database', async () => {
      const stats = connectionManager.getStats();
      expect(stats.isConnected).toBe(true);
    });

    it('should execute simple query', async () => {
      const result = await connectionManager.query('SELECT 1 as value');
      expect(result.rows[0].value).toBe(1);
    });

    it('should handle transactions', async () => {
      const result = await connectionManager.transaction(async (client) => {
        const res = await client.query('SELECT 1 as value');
        return res.rows[0].value;
      });

      expect(result).toBe(1);
    });

    it('should rollback on error', async () => {
      try {
        await connectionManager.transaction(async (client) => {
          await client.query('INSERT INTO users (id, email, username) VALUES ($1, $2, $3)', [
            uuidv4(),
            'test@test.com',
            'testuser',
          ]);
          throw new Error('Rollback test');
        });
        fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).toBe('Rollback test');
      }

      // Verify rollback
      const result = await pool.query('SELECT COUNT(*) FROM users WHERE email = $1', ['test@test.com']);
      expect(parseInt(result.rows[0].count)).toBe(0);
    });

    it('should track query statistics', async () => {
      const statsBefore = connectionManager.getStats();

      await connectionManager.query('SELECT 1');
      await connectionManager.query('SELECT 2');

      const statsAfter = connectionManager.getStats();
      expect(statsAfter.queryCount).toBe(statsBefore.queryCount + 2);
    });
  });

  describe('QueryOptimizer', () => {
    it('should prepare and execute statements', async () => {
      await queryOptimizer.prepareStatement('test_select', 'SELECT 1 as value');

      const result = await queryOptimizer.executePrepared('test_select');
      expect(result.rows[0].value).toBe(1);
    });

    it('should cache query results', async () => {
      const cacheKey = 'test_cache_key';

      let callCount = 0;
      const queryFn = async () => {
        callCount++;
        return { rows: [{ value: 1 }], rowCount: 1 };
      };

      // First call - should execute query
      await queryOptimizer.cachedQuery(cacheKey, queryFn);
      expect(callCount).toBe(1);

      // Second call - should use cache
      await queryOptimizer.cachedQuery(cacheKey, queryFn);
      expect(callCount).toBe(1); // No increment, used cache
    });

    it('should execute batch operations', async () => {
      const items = Array.from({ length: 250 }, (_, i) => ({ id: i, value: `test${i}` }));

      const results = await queryOptimizer.batch(items, async (batch) => {
        return batch.length;
      });

      expect(results).toHaveLength(3); // 3 batches of 100, 100, 50
      expect(results[0]).toBe(100);
      expect(results[1]).toBe(100);
      expect(results[2]).toBe(50);
    });

    it('should preload relations efficiently', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ id: `id-${i}` }));

      const loaderMock = jest.fn().mockResolvedValue(
        new Map(items.map((item) => [item.id, { loaded: true }]))
      );

      await queryOptimizer.preloadRelations(items, loaderMock, { batchSize: 3 });

      // Should have been called 4 times (3, 3, 3, 1)
      expect(loaderMock).toHaveBeenCalledTimes(4);
    });
  });

  describe('UserRepository', () => {
    let userRepo: UserRepository;

    beforeEach(() => {
      userRepo = new UserRepository(pool);
    });

    it('should create user', async () => {
      const user = await userRepo.create({
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.username).toBe('testuser');
    });

    it('should find user by email', async () => {
      await userRepo.create({
        email: 'find@example.com',
        username: 'finduser',
      });

      const user = await userRepo.findByEmail('find@example.com');
      expect(user).toBeDefined();
      expect(user?.email).toBe('find@example.com');
    });

    it('should update user', async () => {
      const user = await userRepo.create({
        email: 'update@example.com',
        username: 'updateuser',
      });

      const updated = await userRepo.update(user.id, {
        displayName: 'Updated Display Name',
      });

      expect(updated.displayName).toBe('Updated Display Name');
    });

    it('should handle OAuth flow', async () => {
      const result = await userRepo.findOrCreateByOAuth(
        'google',
        'google-user-id',
        'google@example.com',
        { sub: 'google-user-id' },
        {
          email: 'oauth@example.com',
          username: 'oauthuser',
        }
      );

      expect(result.created).toBe(true);
      expect(result.user.email).toBe('oauth@example.com');

      // Second call should find existing
      const result2 = await userRepo.findOrCreateByOAuth(
        'google',
        'google-user-id',
        'google@example.com',
        { sub: 'google-user-id' },
        {}
      );

      expect(result2.created).toBe(false);
      expect(result2.user.id).toBe(result.user.id);
    });
  });

  describe('SpreadsheetRepository', () => {
    let userRepo: UserRepository;
    let spreadsheetRepo: SpreadsheetRepository;
    let testUserId: string;

    beforeEach(async () => {
      userRepo = new UserRepository(pool);
      spreadsheetRepo = new SpreadsheetRepository(pool);

      const user = await userRepo.create({
        email: 'spreadsheet@example.com',
        username: 'sheetuser',
      });
      testUserId = user.id;
    });

    it('should create spreadsheet', async () => {
      const spreadsheet = await spreadsheetRepo.create({
        ownerId: testUserId,
        name: 'Test Spreadsheet',
        description: 'Test Description',
      });

      expect(spreadsheet.id).toBeDefined();
      expect(spreadsheet.name).toBe('Test Spreadsheet');
    });

    it('should create and manage sheets', async () => {
      const spreadsheet = await spreadsheetRepo.create({
        ownerId: testUserId,
        name: 'Sheet Test',
      });

      const sheet = await spreadsheetRepo.createSheet(spreadsheet.id, 'Sheet1', 0);
      expect(sheet.name).toBe('Sheet1');

      const sheets = await spreadsheetRepo.getSheets(spreadsheet.id);
      expect(sheets).toHaveLength(1);
      expect(sheets[0].name).toBe('Sheet1');
    });

    it('should grant and revoke permissions', async () => {
      const user2 = await userRepo.create({
        email: 'user2@example.com',
        username: 'user2',
      });

      const spreadsheet = await spreadsheetRepo.create({
        ownerId: testUserId,
        name: 'Perm Test',
      });

      await spreadsheetRepo.grantPermission(spreadsheet.id, user2.id, 'editor', testUserId);

      const permissions = await spreadsheetRepo.getPermissions(spreadsheet.id);
      expect(permissions).toHaveLength(1);
      expect(permissions[0].userId).toBe(user2.id);
      expect(permissions[0].permissionLevel).toBe('editor');

      await spreadsheetRepo.revokePermission(spreadsheet.id, user2.id);

      const permissionsAfter = await spreadsheetRepo.getPermissions(spreadsheet.id);
      expect(permissionsAfter).toHaveLength(0);
    });

    it('should create snapshots', async () => {
      const spreadsheet = await spreadsheetRepo.create({
        ownerId: testUserId,
        name: 'Snapshot Test',
      });

      const snapshot = await spreadsheetRepo.createSnapshot(
        spreadsheet.id,
        1,
        testUserId,
        {
          name: 'Initial',
          description: 'First snapshot',
        }
      );

      expect(snapshot.version).toBe(1);
      expect(snapshot.name).toBe('Initial');
    });
  });

  describe('CellRepository', () => {
    let userRepo: UserRepository;
    let spreadsheetRepo: SpreadsheetRepository;
    let cellRepo: CellRepository;
    let testSheetId: string;

    beforeEach(async () => {
      userRepo = new UserRepository(pool);
      spreadsheetRepo = new SpreadsheetRepository(pool);
      cellRepo = new CellRepository(pool);

      const user = await userRepo.create({
        email: 'cell@example.com',
        username: 'celluser',
      });

      const spreadsheet = await spreadsheetRepo.create({
        ownerId: user.id,
        name: 'Cell Test',
      });

      const sheet = await spreadsheetRepo.createSheet(spreadsheet.id, 'Sheet1', 0);
      testSheetId = sheet.id;
    });

    it('should create cell', async () => {
      const cell = await cellRepo.create({
        sheetId: testSheetId,
        columnRef: 'A',
        rowRef: 1,
        value: 'Test Value',
      });

      expect(cell.id).toBeDefined();
      expect(cell.value).toBe('Test Value');
    });

    it('should find cell by position', async () => {
      await cellRepo.create({
        sheetId: testSheetId,
        columnRef: 'B',
        rowRef: 2,
        value: 'Found',
      });

      const cell = await cellRepo.findByPosition(testSheetId, 'B', 2);
      expect(cell?.value).toBe('Found');
    });

    it('should update cell', async () => {
      const cell = await cellRepo.create({
        sheetId: testSheetId,
        columnRef: 'C',
        rowRef: 3,
        value: 'Original',
      });

      const updated = await cellRepo.update(cell.id, {
        value: 'Updated',
        formula: '=UPPER("updated")',
      });

      expect(updated.value).toBe('Updated');
      expect(updated.formula).toBe('=UPPER("updated")');
    });

    it('should batch create cells', async () => {
      const cells = await cellRepo.batchCreate(
        Array.from({ length: 10 }, (_, i) => ({
          sheetId: testSheetId,
          columnRef: 'A',
          rowRef: i + 1,
          value: `Batch ${i}`,
        }))
      );

      expect(cells).toHaveLength(10);
    });

    it('should track dependencies', async () => {
      const cell1 = await cellRepo.create({
        sheetId: testSheetId,
        columnRef: 'A',
        rowRef: 1,
        value: '10',
      });

      const cell2 = await cellRepo.create({
        sheetId: testSheetId,
        columnRef: 'B',
        rowRef: 1,
        formula: '=A1*2',
      });

      const dependencies = await cellRepo.getDependencies(cell2.id);
      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].dependencyCellId).toBe(cell1.id);
    });
  });

  describe('ConsciousnessRepository', () => {
    let consciousnessRepo: ConsciousnessRepository;
    let testCellId: string;

    beforeEach(async () => {
      const userRepo = new UserRepository(pool);
      const spreadsheetRepo = new SpreadsheetRepository(pool);
      const cellRepo = new CellRepository(pool);
      consciousnessRepo = new ConsciousnessRepository(pool);

      const user = await userRepo.create({ email: 'consciousness@example.com', username: 'conuser' });
      const spreadsheet = await spreadsheetRepo.create({ ownerId: user.id, name: 'Consciousness Test' });
      const sheet = await spreadsheetRepo.createSheet(spreadsheet.id, 'Sheet1', 0);
      const cell = await cellRepo.create({ sheetId: sheet.id, columnRef: 'A', rowRef: 1, value: '100' });
      testCellId = cell.id;
    });

    it('should record consciousness event', async () => {
      const event = await consciousnessRepo.record({
        cellId: testCellId,
        sensationType: 'absolute_change',
        sensationData: { value: 100, previous: 90, delta: 10 },
        calculationDurationMs: 50,
      });

      expect(event.id).toBeDefined();
      expect(event.sensationType).toBe('absolute_change');
    });

    it('should retrieve recent consciousness data', async () => {
      await consciousnessRepo.record({
        cellId: testCellId,
        sensationType: 'rate_of_change',
        sensationData: { value: 5 },
      });

      const recent = await consciousnessRepo.getRecent(testCellId, { hours: 1 });
      expect(recent.length).toBeGreaterThan(0);
    });

    it('should batch record events', async () => {
      const events = await consciousnessRepo.batchRecord(
        Array.from({ length: 100 }, (_, i) => ({
          cellId: testCellId,
          sensationType: 'pattern' as const,
          sensationData: { value: i },
        }))
      );

      expect(events).toHaveLength(100);
    });
  });

  describe('CollaborationRepository', () => {
    let collaborationRepo: CollaborationRepository;
    let testUserId: string;
    let testSpreadsheetId: string;

    beforeEach(async () => {
      const userRepo = new UserRepository(pool);
      const spreadsheetRepo = new SpreadsheetRepository(pool);
      collaborationRepo = new CollaborationRepository(pool);

      const user = await userRepo.create({
        email: 'collab@example.com',
        username: 'collabuser',
      });
      testUserId = user.id;

      const spreadsheet = await spreadsheetRepo.create({
        ownerId: user.id,
        name: 'Collaboration Test',
      });
      testSpreadsheetId = spreadsheet.id;
    });

    it('should create and manage sessions', async () => {
      const session = await collaborationRepo.createSession({
        spreadsheetId: testSpreadsheetId,
        startedBy: testUserId,
      });

      expect(session.id).toBeDefined();
      expect(session.isActive).toBe(true);

      await collaborationRepo.endSession(session.id);

      const ended = await collaborationRepo.getSession(session.id);
      expect(ended?.isActive).toBe(false);
    });

    it('should add and manage participants', async () => {
      const session = await collaborationRepo.createSession({
        spreadsheetId: testSpreadsheetId,
        startedBy: testUserId,
      });

      const participant = await collaborationRepo.addParticipant({
        sessionId: session.id,
        userId: testUserId,
        role: 'editor',
      });

      expect(participant.role).toBe('editor');

      const participants = await collaborationRepo.getParticipants(session.id);
      expect(participants).toHaveLength(1);
    });

    it('should record and retrieve events', async () => {
      const session = await collaborationRepo.createSession({
        spreadsheetId: testSpreadsheetId,
        startedBy: testUserId,
      });

      const event = await collaborationRepo.recordEvent(
        session.id,
        testUserId,
        'cell_updated',
        { columnRef: 'A', rowRef: 1, value: 'New Value' }
      );

      expect(event.id).toBeDefined();
      expect(event.eventType).toBe('cell_updated');

      const events = await collaborationRepo.getUnprocessedEvents(session.id);
      expect(events).toHaveLength(1);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should handle 1000 concurrent reads', async () => {
      const start = Date.now();

      await Promise.all(
        Array.from({ length: 1000 }, () => pool.query('SELECT 1 as value'))
      );

      const duration = Date.now() - start;
      console.log(`1000 concurrent reads: ${duration}ms`);

      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000);
    });

    it('should handle batch insert efficiently', async () => {
      const userRepo = new UserRepository(pool);
      const spreadsheetRepo = new SpreadsheetRepository(pool);
      const cellRepo = new CellRepository(pool);

      const user = await userRepo.create({
        email: 'perf@example.com',
        username: 'perfuser',
      });

      const spreadsheet = await spreadsheetRepo.create({
        ownerId: user.id,
        name: 'Perf Test',
      });

      const sheet = await spreadsheetRepo.createSheet(spreadsheet.id, 'Sheet1', 0);

      const start = Date.now();

      await cellRepo.batchCreate(
        Array.from({ length: 1000 }, (_, i) => ({
          sheetId: sheet.id,
          columnRef: 'A',
          rowRef: i + 1,
          value: `Cell ${i}`,
        }))
      );

      const duration = Date.now() - start;
      console.log(`Batch insert 1000 cells: ${duration}ms`);

      expect(duration).toBeLessThan(10000);
    });
  });
});

// Helper functions
async function setupTestSchema(): Promise<void> {
  // This would load and run the migration files
  // For now, we'll assume schema is already set up
}

async function teardownTestSchema(): Promise<void> {
  // Clean up test schema
}

async function clearTestData(): Promise<void> {
  const pool = new Pool(TEST_CONFIG);

  const tables = [
    'cell_consciousness',
    'cell_dependencies',
    'cell_versions',
    'cells',
    'session_participants',
    'collaboration_events',
    'collaboration_sessions',
    'spreadsheet_permissions',
    'spreadsheet_snapshots',
    'sheets',
    'spreadsheets',
    'oauth_identities',
    'users',
  ];

  for (const table of tables) {
    try {
      await pool.query(`DELETE FROM ${table}`);
    } catch (error) {
      // Table might not exist, ignore
    }
  }

  await pool.end();
}
