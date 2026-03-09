/**
 * Collaboration System Tests
 *
 * Tests:
 * - CRDT convergence
 * - Conflict resolution
 * - Multi-user scenarios
 * - Performance under load
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as Y from 'yjs';
import { YjsDocument, YCell } from './YjsDocument';
import { CollaborationManager, UserState } from './CollaborationManager';
import { PresenceManager } from './PresenceManager';
import { ConflictResolver } from './ConflictResolver';
import { VersionControl } from './VersionControl';

describe('YjsDocument', () => {
  let doc: YjsDocument;

  beforeEach(() => {
    doc = new YjsDocument('test-doc');
  });

  afterEach(() => {
    doc.destroy();
  });

  describe('Cell Operations', () => {
    it('should create and retrieve cells', () => {
      const cell = doc.getCell('A1');
      expect(cell).toBeDefined();
      expect(cell.get('value')).toBe('');
    });

    it('should update cell values', () => {
      const cell = doc.getCell('A1');
      cell.updateValue(42, 'user1');
      expect(cell.get('value')).toBe(42);
      expect(cell.get('modifiedBy')).toBe('user1');
    });

    it('should increment version on update', () => {
      const cell = doc.getCell('A1');
      const initialVersion = cell.get('version') as number;

      cell.updateValue(42, 'user1');
      expect(cell.get('version')).toBe(initialVersion + 1);

      cell.updateValue(43, 'user1');
      expect(cell.get('version')).toBe(initialVersion + 2);
    });

    it('should manage dependencies', () => {
      const cellA = doc.getCell('A1');
      const cellB = doc.getCell('B1');

      doc.setDependency('A1', 'B1');

      expect(doc.getDependencies('A1')).toContain('B1');
      expect(doc.getDependents('B1')).toContain('A1');
    });

    it('should remove dependencies', () => {
      doc.setDependency('A1', 'B1');
      doc.removeDependency('A1', 'B1');

      expect(doc.getDependencies('A1')).not.toContain('B1');
      expect(doc.getDependents('B1')).not.toContain('A1');
    });
  });

  describe('Snapshot System', () => {
    it('should create and apply snapshots', () => {
      const cell = doc.getCell('A1');
      cell.updateValue(42, 'user1');

      const snapshot = doc.createSnapshot();

      // Update cell
      cell.updateValue(43, 'user1');
      expect(cell.get('value')).toBe(43);

      // Restore snapshot
      doc.applySnapshot(snapshot);
      const restoredCell = doc.getCell('A1');
      expect(restoredCell.get('value')).toBe(42);
    });

    it('should track document state', () => {
      const state1 = doc.getState();

      doc.getCell('A1').updateValue(42, 'user1');

      const state2 = doc.getState();
      const diff = doc.getDiff(state1);

      expect(diff.byteLength).toBeGreaterThan(0);
    });
  });

  describe('Observation', () => {
    it('should notify on cell changes', (done) => {
      const cell = doc.getCell('A1');

      cell.observe((event, transaction) => {
        expect(event.keysChanged)..hasOwnProperty('value');
        done();
      });

      cell.updateValue(42, 'user1');
    });

    it('should notify on document changes', (done) => {
      doc.subscribeToDocument((events, transaction) => {
        expect(events.length).toBeGreaterThan(0);
        done();
      });

      doc.getCell('A1').updateValue(42, 'user1');
    });
  });

  describe('Statistics', () => {
    it('should track document statistics', () => {
      doc.getCell('A1').updateValue(42, 'user1');
      doc.getCell('B1').updateValue(43, 'user1');
      doc.setDependency('A1', 'B1');

      const stats = doc.getStats();

      expect(stats.cellCount).toBe(2);
      expect(stats.dependencyCount).toBe(1);
    });
  });
});

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  afterEach(() => {
    resolver.destroy();
  });

  describe('Last-Writer-Wins', () => {
    it('should resolve conflicts using LWW', async () => {
      const result = await resolver.detectAndResolve(
        'A1',
        'value',
        42,
        43,
        1000,
        2000, // Remote is newer
        'user1',
        'user2'
      );

      expect(result).toBe(43);
    });

    it('should prefer local when timestamp is newer', async () => {
      const result = await resolver.detectAndResolve(
        'A1',
        'value',
        42,
        43,
        2000,
        1000, // Local is newer
        'user1',
        'user2'
      );

      expect(result).toBe(42);
    });
  });

  describe('Merge Strategy', () => {
    it('should merge objects', async () => {
      resolver.setResolutionStrategy('metadata', {
        type: 'merge',
        mergeFunction: (local, remote) => ({ ...local, ...remote }),
      });

      const result = await resolver.detectAndResolve(
        'A1',
        'metadata',
        { a: 1 },
        { b: 2 },
        1000,
        2000,
        'user1',
        'user2'
      );

      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('Conflict Tracking', () => {
    it('should track conflicts', async () => {
      await resolver.detectAndResolve(
        'A1',
        'value',
        42,
        43,
        1000,
        2000,
        'user1',
        'user2'
      );

      const conflicts = resolver.getAllConflicts();
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].cellId).toBe('A1');
    });

    it('should track resolutions', async () => {
      await resolver.detectAndResolve(
        'A1',
        'value',
        42,
        43,
        1000,
        2000,
        'user1',
        'user2'
      );

      const resolutions = resolver.getResolutions('A1');
      expect(resolutions.length).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should provide conflict statistics', async () => {
      await resolver.detectAndResolve('A1', 'value', 42, 43, 1000, 2000, 'user1', 'user2');
      await resolver.detectAndResolve('B1', 'value', 44, 45, 1000, 2000, 'user1', 'user2');

      const stats = resolver.getConflictStats();

      expect(stats.total).toBe(2);
      expect(stats.resolved).toBe(2);
      expect(stats.unresolved).toBe(0);
    });
  });
});

describe('VersionControl', () => {
  let doc: YjsDocument;
  let vc: VersionControl;

  beforeEach(() => {
    doc = new YjsDocument('test-doc');
    vc = new VersionControl(doc);
  });

  afterEach(() => {
    vc.destroy();
    doc.destroy();
  });

  describe('Snapshots', () => {
    it('should create snapshots', () => {
      doc.getCell('A1').updateValue(42, 'user1');

      const snapshot = vc.createSnapshot('user1', 'User 1', 'Test snapshot');

      expect(snapshot).toBeDefined();
      expect(snapshot.description).toBe('Test snapshot');
      expect(snapshot.createdById).toBe('user1');
    });

    it('should restore snapshots', async () => {
      doc.getCell('A1').updateValue(42, 'user1');

      const snapshot = vc.createSnapshot('user1', 'User 1', 'Test snapshot');

      // Modify document
      doc.getCell('A1').updateValue(43, 'user1');
      expect(doc.getCell('A1').get('value')).toBe(43);

      // Restore snapshot
      await vc.restoreSnapshot(snapshot.id);
      expect(doc.getCell('A1').get('value')).toBe(42);
    });

    it('should retrieve snapshots by tag', () => {
      vc.createSnapshot('user1', 'User 1', 'Snapshot 1', ['tag1']);
      vc.createSnapshot('user2', 'User 2', 'Snapshot 2', ['tag1', 'tag2']);

      const tag1Snapshots = vc.getSnapshotsByTag('tag1');
      const tag2Snapshots = vc.getSnapshotsByTag('tag2');

      expect(tag1Snapshots.length).toBe(2);
      expect(tag2Snapshots.length).toBe(1);
    });
  });

  describe('Branches', () => {
    it('should create branches', () => {
      const branch = vc.createBranch(
        'feature-branch',
        'user1',
        'User 1',
        'Test branch'
      );

      expect(branch).toBeDefined();
      expect(branch.name).toBe('feature-branch');
      expect(branch.createdById).toBe('user1');
    });

    it('should retrieve all branches', () => {
      vc.createBranch('branch1', 'user1', 'User 1', 'Branch 1');
      vc.createBranch('branch2', 'user2', 'User 2', 'Branch 2');

      const branches = vc.getAllBranches();

      expect(branches.length).toBe(2);
    });
  });

  describe('Diff', () => {
    it('should compare snapshots', () => {
      doc.getCell('A1').updateValue(42, 'user1');
      const snapshot1 = vc.createSnapshot('user1', 'User 1', 'Snapshot 1');

      doc.getCell('A1').updateValue(43, 'user1');
      doc.getCell('B1').updateValue(44, 'user1');
      const snapshot2 = vc.createSnapshot('user1', 'User 1', 'Snapshot 2');

      const diffs = vc.compareSnapshots(snapshot1.id, snapshot2.id);

      expect(diffs.length).toBeGreaterThan(0);

      const a1Diff = diffs.find(d => d.cellId === 'A1');
      expect(a1Diff).toBeDefined();
      expect(a1Diff?.type).toBe('modified');
      expect(a1Diff?.oldValue).toBe(42);
      expect(a1Diff?.newValue).toBe(43);

      const b1Diff = diffs.find(d => d.cellId === 'B1');
      expect(b1Diff).toBeDefined();
      expect(b1Diff?.type).toBe('added');
    });
  });

  describe('Change Log', () => {
    it('should log changes', () => {
      doc.getCell('A1').updateValue(42, 'user1');

      const log = vc.getChangeLog();

      expect(log.length).toBeGreaterThan(0);
    });

    it('should filter changes by user', () => {
      const snapshot = vc.createSnapshot('user1', 'User 1', 'Test');

      const user1Log = vc.getChangeLog({ userId: 'user1' });

      expect(user1Log.length).toBeGreaterThan(0);
      expect(user1Log[0].userId).toBe('user1');
    });
  });

  describe('Auto-Snapshot', () => {
    it('should create auto-snapshots', (done) => {
      vc.enableAutoSnapshot(100);

      setTimeout(() => {
        const snapshots = vc.getSnapshotsByTag('auto');
        expect(snapshots.length).toBeGreaterThan(0);
        vc.disableAutoSnapshot();
        done();
      }, 150);
    });
  });
});

describe('PresenceManager', () => {
  let awareness: Y.Map<any>;

  beforeEach(() => {
    const doc = new Y.Doc();
    awareness = doc.getMap('awareness');
  });

  afterEach(() => {
    awareness.doc?.destroy();
  });

  describe('User Tracking', () => {
    it('should track users', () => {
      const pm = new PresenceManager(awareness);

      awareness.set('user', {
        name: 'Test User',
        id: 'user1',
        color: '#FF0000',
      });

      const users = pm.getAllUsers();

      expect(users.length).toBe(1);
      expect(users[0].name).toBe('Test User');
    });

    it('should distinguish local and remote users', () => {
      const pm = new PresenceManager(awareness);

      awareness.set('user', {
        name: 'Local User',
        id: 'local',
        color: '#FF0000',
      });

      const remoteUsers = pm.getRemoteUsers();

      expect(remoteUsers.length).toBe(0);
    });
  });

  describe('Cursor Tracking', () => {
    it('should track cursor position', () => {
      const pm = new PresenceManager(awareness);

      pm.updateCursor({ row: 1, col: 2 });

      const localUser = pm.getLocalUser();

      expect(localUser?.cursor).toEqual({ row: 1, col: 2 });
    });

    it('should clear cursor', () => {
      const pm = new PresenceManager(awareness);

      pm.updateCursor({ row: 1, col: 2 });
      pm.clearCursor();

      const localUser = pm.getLocalUser();

      expect(localUser?.cursor).toBeNull();
    });
  });

  describe('Status Management', () => {
    it('should update user status', () => {
      const pm = new PresenceManager(awareness);

      pm.updateStatus('away');

      const localUser = pm.getLocalUser();

      expect(localUser?.status).toBe('away');
    });

    it('should track activity', () => {
      const pm = new PresenceManager(awareness);

      pm.recordActivity();

      const localUser = pm.getLocalUser();

      expect(localUser?.lastActivity).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe('Presence Summary', () => {
    it('should provide presence summary', () => {
      const pm = new PresenceManager(awareness);

      awareness.set('user', {
        name: 'User 1',
        id: 'user1',
        color: '#FF0000',
      });
      awareness.set('status', 'online');

      const summary = pm.getPresenceSummary();

      expect(summary.total).toBe(1);
      expect(summary.online).toBe(1);
    });
  });
});

describe('Multi-User Scenarios', () => {
  it('should converge document state across multiple users', () => {
    // Create two documents
    const doc1 = new YjsDocument('test-doc-1');
    const doc2 = new YjsDocument('test-doc-2');

    // Update doc1
    doc1.getCell('A1').updateValue(42, 'user1');
    const snapshot1 = doc1.createSnapshot();

    // Apply snapshot to doc2
    doc2.applySnapshot(snapshot1);

    expect(doc2.getCell('A1').get('value')).toBe(42);

    // Update doc2
    doc2.getCell('B1').updateValue(43, 'user2');
    const snapshot2 = doc2.createSnapshot();

    // Apply back to doc1
    doc1.applySnapshot(snapshot2);

    expect(doc1.getCell('B1').get('value')).toBe(43);

    doc1.destroy();
    doc2.destroy();
  });

  it('should handle concurrent edits', () => {
    const resolver = new ConflictResolver();

    // Simulate concurrent edits
    const result1 = resolver.detectAndResolve(
      'A1',
      'value',
      42,
      43,
      1000,
      2000,
      'user1',
      'user2'
    );

    const result2 = resolver.detectAndResolve(
      'A1',
      'value',
      43,
      44,
      2000,
      3000,
      'user2',
      'user1'
    );

    Promise.all([result1, result2]).then(([r1, r2]) => {
      expect(r1).toBe(43);
      expect(r2).toBe(44);
    });

    resolver.destroy();
  });
});

describe('Performance Tests', () => {
  it('should handle large documents efficiently', () => {
    const doc = new YjsDocument('test-doc');
    const startTime = Date.now();

    // Create 1000 cells
    for (let i = 0; i < 1000; i++) {
      const row = Math.floor(i / 26);
      const col = i % 26;
      const cellId = `${String.fromCharCode(65 + col)}${row + 1}`;

      doc.getCell(cellId).updateValue(i, 'user1');
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(1000); // Should complete in less than 1 second

    doc.destroy();
  });

  it('should handle rapid updates efficiently', () => {
    const doc = new YjsDocument('test-doc');
    const cell = doc.getCell('A1');
    const startTime = Date.now();

    // Perform 1000 updates
    for (let i = 0; i < 1000; i++) {
      cell.updateValue(i, 'user1');
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(500); // Should complete in less than 500ms

    doc.destroy();
  });

  it('should create snapshots efficiently', () => {
    const doc = new YjsDocument('test-doc');
    const vc = new VersionControl(doc);

    // Create 100 cells
    for (let i = 0; i < 100; i++) {
      const cellId = `A${i + 1}`;
      doc.getCell(cellId).updateValue(i, 'user1');
    }

    const startTime = Date.now();

    // Create snapshot
    vc.createSnapshot('user1', 'User 1', 'Performance test');

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100); // Should complete in less than 100ms

    vc.destroy();
    doc.destroy();
  });
});
