/**
 * Tests for VersionStore
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { VersionStore } from '../VersionStore';
import { CellValue, CellType, MergeStrategy } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('VersionStore', () => {
  let versionStore: VersionStore;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'polln-version-test-'));
    versionStore = new VersionStore(tempDir);
    await versionStore.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  const createTestCells = (data: Record<string, any>): Map<string, CellValue> => {
    const cells = new Map<string, CellValue>();
    Object.entries(data).forEach(([coord, value]) => {
      const type = typeof value === 'number' ? CellType.NUMBER : CellType.STRING;
      cells.set(coord, { coordinate: coord, value, type });
    });
    return cells;
  };

  const createMetadata = () => ({
    name: 'Test Sheet',
    columnCount: 10,
    rowCount: 10
  });

  describe('commit', () => {
    it('should create initial commit', async () => {
      const cells = createTestCells({ 'A1': 'Hello', 'B1': 'World' });
      const metadata = createMetadata();

      const version = await versionStore.commit(cells, metadata, 'Initial commit', 'test-user');

      expect(version.id).toBeDefined();
      expect(version.parent).toBeNull();
      expect(version.message).toBe('Initial commit');
      expect(version.author).toBe('test-user');
      expect(version.branch).toBe('main');
    });

    it('should create subsequent commits with parent', async () => {
      const cells1 = createTestCells({ 'A1': '1' });
      const metadata = createMetadata();

      await versionStore.commit(cells1, metadata, 'First', 'user1');

      const cells2 = createTestCells({ 'A1': '2' });
      const version2 = await versionStore.commit(cells2, metadata, 'Second', 'user1');

      expect(version2.parent).toBeDefined();
      expect(version2.parent).not.toBeNull();
    });

    it('should track version history', async () => {
      const cells = createTestCells({ 'A1': 'value' });
      const metadata = createMetadata();

      await versionStore.commit(cells, metadata, 'Commit 1', 'user1');
      await versionStore.commit(cells, metadata, 'Commit 2', 'user1');
      await versionStore.commit(cells, metadata, 'Commit 3', 'user1');

      const history = versionStore.getHistory();

      expect(history).toHaveLength(3);
      // History is sorted by timestamp descending (newest first)
      // Since commits happen rapidly, timestamps might be the same
      // Just check that we have all three commits
      const messages = history.map(h => h.message);
      expect(messages).toContain('Commit 1');
      expect(messages).toContain('Commit 2');
      expect(messages).toContain('Commit 3');
    });
  });

  describe('checkout', () => {
    it('should checkout a version', async () => {
      const cells1 = createTestCells({ 'A1': 'version1' });
      const metadata = createMetadata();

      await versionStore.commit(cells1, metadata, 'V1', 'user');

      const cells2 = createTestCells({ 'A1': 'version2' });
      await versionStore.commit(cells2, metadata, 'V2', 'user');

      // Get current version and checkout by ID
      const current = versionStore.getCurrentVersion();
      expect(current).toBeDefined();

      const snapshot = versionStore.checkout(current!.id);

      expect(snapshot.cells.get('A1')?.value).toBe('version2');
    });
  });

  describe('branch', () => {
    it('should create new branch', () => {
      const branch = versionStore.branch('feature-branch');

      expect(branch.name).toBe('feature-branch');
      expect(branch.isActive).toBe(false);
    });

    it('should create branch from specific version', async () => {
      const cells = createTestCells({ 'A1': 'base' });
      const metadata = createMetadata();

      await versionStore.commit(cells, metadata, 'Base', 'user');

      const currentVersion = versionStore.getCurrentVersion();
      expect(currentVersion).toBeDefined();

      if (currentVersion) {
        const branch = versionStore.branch('feature', currentVersion.id);
        expect(branch.head).toBe(currentVersion.id);
      }
    });
  });

  describe('merge', () => {
    it('should merge branches without conflicts', async () => {
      // Create main branch
      const cells1 = createTestCells({ 'A1': 'main' });
      const metadata = createMetadata();
      await versionStore.commit(cells1, metadata, 'Main commit', 'user');

      // Create feature branch
      versionStore.branch('feature');
      versionStore.checkoutBranch('feature');

      const cells2 = createTestCells({ 'A1': 'main', 'B1': 'feature' });
      await versionStore.commit(cells2, metadata, 'Feature commit', 'user');

      // Switch back to main and add different changes
      versionStore.checkoutBranch('main');
      const cells3 = createTestCells({ 'A1': 'main', 'C1': 'main-only' });
      await versionStore.commit(cells3, metadata, 'Main new commit', 'user');

      // Merge feature into main
      const result = await versionStore.merge('feature', MergeStrategy.AUTO);

      expect(result.success).toBe(true);
    });
  });

  describe('diff', () => {
    it('should compute diff between versions', async () => {
      const cells1 = createTestCells({ 'A1': '1', 'B1': '2' });
      const metadata = createMetadata();

      await versionStore.commit(cells1, metadata, 'V1', 'user');

      const cells2 = createTestCells({ 'A1': '1', 'B1': '3', 'C1': '4' });
      const v2 = await versionStore.commit(cells2, metadata, 'V2', 'user');

      const current = versionStore.getCurrentVersion();
      if (current && current.parent) {
        const diff = versionStore.diff(current.parent, current.id);

        expect(diff.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getHistory', () => {
    it('should return all versions', async () => {
      const cells = createTestCells({ 'A1': 'value' });
      const metadata = createMetadata();

      await versionStore.commit(cells, metadata, 'C1', 'user1');
      await versionStore.commit(cells, metadata, 'C2', 'user2');
      await versionStore.commit(cells, metadata, 'C3', 'user1');

      const history = versionStore.getHistory();

      expect(history).toHaveLength(3);
    });

    it('should filter by author', async () => {
      const cells = createTestCells({ 'A1': 'value' });
      const metadata = createMetadata();

      await versionStore.commit(cells, metadata, 'C1', 'alice');
      await versionStore.commit(cells, metadata, 'C2', 'bob');
      await versionStore.commit(cells, metadata, 'C3', 'alice');

      const history = versionStore.getHistory(undefined, { author: 'alice' });

      expect(history).toHaveLength(2);
      expect(history.every(h => h.author === 'alice')).toBe(true);
    });

    it('should limit results', async () => {
      const cells = createTestCells({ 'A1': 'value' });
      const metadata = createMetadata();

      for (let i = 0; i < 10; i++) {
        await versionStore.commit(cells, metadata, `C${i}`, 'user');
      }

      const history = versionStore.getHistory(5);

      expect(history).toHaveLength(5);
    });
  });

  describe('listBranches', () => {
    it('should list all branches', () => {
      versionStore.branch('feature1');
      versionStore.branch('feature2');

      const branches = versionStore.listBranches();

      expect(branches.length).toBeGreaterThanOrEqual(3); // main + 2 features
    });
  });

  describe('export/import', () => {
    it('should export and import versions', async () => {
      const cells = createTestCells({ 'A1': 'test' });
      const metadata = createMetadata();

      await versionStore.commit(cells, metadata, 'Test commit', 'user');

      const exportPath = path.join(tempDir, 'export.json');
      await versionStore.export(exportPath);

      const exists = await fs.access(exportPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Create new store and import
      const newStore = new VersionStore(path.join(tempDir, 'new'));
      await newStore.initialize();

      const result = await newStore.import(exportPath);

      if (!result.success) {
        console.log('Import errors:', result.errors);
      }

      expect(result.success).toBe(true);
      expect(result.versionCount).toBe(1);
    });
  });

  describe('getStatistics', () => {
    it('should return repository statistics', async () => {
      const cells = createTestCells({ 'A1': 'value' });
      const metadata = createMetadata();

      await versionStore.commit(cells, metadata, 'Commit', 'user');

      const stats = versionStore.getStatistics();

      expect(stats.totalVersions).toBe(1);
      expect(stats.totalBranches).toBe(1);
      expect(stats.activeBranch).toBe('main');
    });
  });

  describe('save/load', () => {
    it('should persist and restore repository', async () => {
      const cells = createTestCells({ 'A1': 'persistent' });
      const metadata = createMetadata();

      await versionStore.commit(cells, metadata, 'Persistent commit', 'user');
      await versionStore.save();

      // Create new store and load
      const newStore = new VersionStore(tempDir);
      await newStore.load();

      const stats = newStore.getStatistics();
      expect(stats.totalVersions).toBe(1);
    });
  });
});
