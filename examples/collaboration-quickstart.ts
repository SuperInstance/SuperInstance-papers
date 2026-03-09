/**
 * Real-Time Collaboration Quick Start Example
 *
 * This example demonstrates how to set up and use the collaboration system
 * for real-time spreadsheet editing with multiple users.
 */

import {
  CollaborationManager,
  VersionControl,
  ConflictResolver,
  PresenceManager,
  YjsDocument
} from '../src/spreadsheet/collaboration';

// ============================================================================
// SERVER SETUP
// ============================================================================

async function startServer() {
  const { startYjsServer } = await import('../server/yjs-server');

  const server = await startYjsServer({
    port: 1234,
    persistenceDir: './db',
    authEnabled: false, // Disable for development
  });

  console.log('Yjs server started on ws://localhost:1234');
  return server;
}

// ============================================================================
// CLIENT SETUP
// ============================================================================

async function setupClient(userId: string, userName: string) {
  // Initialize collaboration manager
  const collab = new CollaborationManager({
    websocketUrl: 'ws://localhost:1234',
    documentId: 'example-spreadsheet',
    userId,
    userName,
    userColor: getRandomColor(),
  });

  // Wait for connection
  await new Promise<void>((resolve) => {
    const unsubscribe = collab.on('connected', () => {
      unsubscribe();
      resolve();
    });
  });

  console.log(`${userName} connected`);

  return collab;
}

function getRandomColor(): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ============================================================================
// EXAMPLE 1: BASIC COLLABORATION
// ============================================================================

async function example1_BasicCollaboration() {
  console.log('\n=== Example 1: Basic Collaboration ===\n');

  // Start server
  const server = await startServer();

  // Create two users
  const alice = await setupClient('user-1', 'Alice');
  const bob = await setupClient('user-2', 'Bob');

  // Alice updates cell A1
  alice.getDocument().updateCell('A1', { value: 42 }, 'user-1');
  console.log('Alice set A1 = 42');

  // Wait for sync
  await delay(100);

  // Bob reads cell A1 (should see Alice's update)
  const bobCellA1 = bob.getDocument().getCell('A1');
  console.log(`Bob reads A1 = ${bobCellA1.get('value')}`);

  // Bob updates cell B1
  bob.getDocument().updateCell('B1', { value: 43 }, 'user-2');
  console.log('Bob set B1 = 43');

  // Wait for sync
  await delay(100);

  // Alice reads cell B1 (should see Bob's update)
  const aliceCellB1 = alice.getDocument().getCell('B1');
  console.log(`Alice reads B1 = ${aliceCellB1.get('value')}`);

  // Cleanup
  alice.destroy();
  bob.destroy();
  await server.stop();
}

// ============================================================================
// EXAMPLE 2: CURSOR TRACKING
// ============================================================================

async function example2_CursorTracking() {
  console.log('\n=== Example 2: Cursor Tracking ===\n');

  const server = await startServer();
  const alice = await setupClient('user-1', 'Alice');
  const bob = await setupClient('user-2', 'Bob');

  // Set up presence tracking for Alice
  const alicePresence = alice.getPresenceManager();

  // Subscribe to see when Bob's cursor changes
  alicePresence.onCursorChange((users) => {
    users.forEach(user => {
      if (user.cursor) {
        console.log(`${user.name} is at cell ${user.cursor.col},${user.cursor.row}`);
      }
    });
  });

  // Bob moves his cursor
  bob.updateCursor({ row: 0, col: 0 });
  console.log('Bob moved cursor to A1');

  await delay(100);

  bob.updateCursor({ row: 1, col: 1 });
  console.log('Bob moved cursor to B2');

  await delay(100);

  // Alice sees all users
  const allUsers = alicePresence.getAllUsers();
  console.log(`\nActive users: ${allUsers.map(u => u.name).join(', ')}`);

  // Cleanup
  alice.destroy();
  bob.destroy();
  await server.stop();
}

// ============================================================================
// EXAMPLE 3: CONFLICT RESOLUTION
// ============================================================================

async function example3_ConflictResolution() {
  console.log('\n=== Example 3: Conflict Resolution ===\n');

  const server = await startServer();
  const alice = await setupClient('user-1', 'Alice');
  const bob = await setupClient('user-2', 'Bob');

  // Set up conflict resolver
  const resolver = new ConflictResolver();

  // Simulate concurrent edit to same cell
  console.log('Both users edit A1 simultaneously...');

  // Detect and resolve conflict
  const result = await resolver.detectAndResolve(
    'A1',
    'value',
    42,      // Alice's value
    43,      // Bob's value
    1000,    // Alice's timestamp
    2000,    // Bob's timestamp (newer)
    'user-1',
    'user-2'
  );

  console.log(`Conflict resolved. Winner: ${result} (Last-Writer-Wins)`);

  // Show conflict statistics
  const stats = resolver.getConflictStats();
  console.log(`Total conflicts: ${stats.total}`);
  console.log(`Resolved: ${stats.resolved}`);

  // Cleanup
  resolver.destroy();
  alice.destroy();
  bob.destroy();
  await server.stop();
}

// ============================================================================
// EXAMPLE 4: VERSION CONTROL
// ============================================================================

async function example4_VersionControl() {
  console.log('\n=== Example 4: Version Control ===\n');

  const server = await startServer();
  const alice = await setupClient('user-1', 'Alice');

  // Set up version control
  const vc = new VersionControl(alice.getDocument());

  // Create initial snapshot
  const snapshot1 = vc.createSnapshot('user-1', 'Alice', 'Initial state');
  console.log('Created snapshot 1: Initial state');

  // Make some changes
  alice.getDocument().updateCell('A1', { value: 42 }, 'user-1');
  alice.getDocument().updateCell('B1', { value: 43 }, 'user-1');
  console.log('Made changes to A1 and B1');

  // Create another snapshot
  const snapshot2 = vc.createSnapshot('user-1', 'Alice', 'After changes');
  console.log('Created snapshot 2: After changes');

  // Compare snapshots
  const diffs = vc.compareSnapshots(snapshot1.id, snapshot2.id);
  console.log(`\nDifferences found: ${diffs.length}`);
  diffs.forEach(diff => {
    console.log(`  ${diff.cellId}: ${diff.type}`);
  });

  // Rollback to first snapshot
  await vc.restoreSnapshot(snapshot1.id);
  console.log('\nRolled back to snapshot 1');

  const cellA1 = alice.getDocument().getCell('A1');
  console.log(`A1 after rollback: ${cellA1.get('value') || '(empty)'}`);

  // Cleanup
  vc.destroy();
  alice.destroy();
  await server.stop();
}

// ============================================================================
// EXAMPLE 5: BRANCHING
// ============================================================================

async function example5_Branching() {
  console.log('\n=== Example 5: Branching ===\n');

  const server = await startServer();
  const alice = await setupClient('user-1', 'Alice');

  const vc = new VersionControl(alice.getDocument());

  // Make initial changes
  alice.getDocument().updateCell('A1', { value: 42 }, 'user-1');

  // Create main branch snapshot
  const mainSnapshot = vc.createSnapshot('user-1', 'Alice', 'Main branch');
  console.log('Created main branch');

  // Create a feature branch
  const featureBranch = vc.createBranch(
    'feature-branch',
    'user-1',
    'Alice',
    'Experimental feature'
  );
  console.log(`Created branch: ${featureBranch.name}`);

  // Make changes on feature branch
  await vc.switchBranch(featureBranch.id);
  alice.getDocument().updateCell('A1', { value: 100 }, 'user-1');
  console.log('Modified A1 on feature branch');

  // Switch back to main
  await vc.switchBranch('main');
  const cellA1 = alice.getDocument().getCell('A1');
  console.log(`A1 on main: ${cellA1.get('value')}`);

  // Cleanup
  vc.destroy();
  alice.destroy();
  await server.stop();
}

// ============================================================================
// UTILITIES
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

async function main() {
  console.log('========================================');
  console.log('Real-Time Collaboration Quick Start');
  console.log('========================================');

  try {
    await example1_BasicCollaboration();
    await example2_CursorTracking();
    await example3_ConflictResolution();
    await example4_VersionControl();
    await example5_Branching();

    console.log('\n========================================');
    console.log('All examples completed successfully!');
    console.log('========================================\n');
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  example1_BasicCollaboration,
  example2_CursorTracking,
  example3_ConflictResolution,
  example4_VersionControl,
  example5_Branching,
};
