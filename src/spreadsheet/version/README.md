# POLLN Spreadsheet Version Control System

A Git-like version control system optimized for spreadsheet data with efficient delta storage, branching, and merge capabilities.

## Features

- **Git-like Branching Model**: Create, switch, and merge branches
- **Efficient Delta Storage**: Compressed deltas for minimal storage overhead
- **Large Spreadsheet Support**: Optimized for 1M+ cells
- **Fast Checkout Operations**: Quick version switching
- **Conflict Detection**: Automatic conflict detection and resolution
- **Export/Import**: Backup and restore version history
- **Comprehensive Testing**: Full test coverage

## Architecture

```
VersionStore (Main Entry)
    ├── DeltaManager (Compute/Apply Deltas)
    ├── SnapshotManager (Storage & Compression)
    ├── BranchManager (Branch Operations)
    └── MergeResolver (Conflict Resolution)
```

## Quick Start

```typescript
import { VersionStore, CellType, MergeStrategy } from '@polln/spreadsheet/version';

// Initialize store
const store = new VersionStore('./.polln-version');
await store.initialize();

// Create commit
const cells = new Map([
  ['A1', { coordinate: 'A1', value: 'Hello', type: CellType.STRING }],
  ['B1', { coordinate: 'B1', value: 123, type: CellType.NUMBER }]
]);

const metadata = {
  name: 'My Sheet',
  columnCount: 26,
  rowCount: 1000
};

const version = await store.commit(cells, metadata, 'Initial commit', 'user');

// Create branch
store.branch('feature-branch');

// Make changes and commit
cells.set('A1', { coordinate: 'A1', value: 'Updated', type: CellType.STRING });
await store.commit(cells, metadata, 'Update A1', 'user');

// Switch back to main
store.checkoutBranch('main');

// Merge feature branch
const result = await store.merge('feature-branch', MergeStrategy.AUTO);

if (result.success) {
  console.log('Merge successful!');
} else {
  console.log('Merge conflicts:', result.conflicts);
}
```

## Core Concepts

### Versions

A version represents a commit in the version history:

```typescript
interface Version {
  id: string;
  parent: string | null;
  message: string;
  author: string;
  timestamp: number;
  tree: string;
  branch?: string;
}
```

### Snapshots

A snapshot captures the complete state of a spreadsheet:

```typescript
interface SheetSnapshot {
  id: string;
  versionId: string;
  cells: Map<string, CellValue>;
  metadata: SheetMetadata;
  timestamp: number;
}
```

### Deltas

Deltas represent changes between snapshots:

```typescript
interface CellDelta {
  cellId: string;
  operation: 'add' | 'modify' | 'delete';
  before?: CellValue;
  after?: CellValue;
  timestamp?: number;
  author?: string;
}
```

## API Reference

### VersionStore

Main entry point for version control operations.

#### Methods

- `commit(cells, metadata, message, author)` - Create a new version
- `checkout(versionId)` - Switch to a specific version
- `checkoutBranch(branchName)` - Switch to a branch
- `branch(name, fromVersion?)` - Create a new branch
- `merge(branchName, strategy)` - Merge a branch
- `getHistory(limit?, filter?)` - Get version history
- `diff(version1, version2)` - Compare two versions
- `export(filePath)` - Export to file
- `import(filePath)` - Import from file

### BranchManager

Manages Git-like branching.

#### Methods

- `createBranch(name, parent)` - Create new branch
- `switchBranch(name)` - Switch active branch
- `listBranches()` - List all branches
- `deleteBranch(name)` - Delete a branch
- `mergeBranch(source, target, strategy)` - Merge branches

### MergeResolver

Handles conflict detection and resolution.

#### Merge Strategies

- `OURS` - Keep current branch's version
- `THEIRS` - Accept incoming branch's version
- `AUTO` - Attempt automatic merge
- `MANUAL` - Manual conflict resolution
- `UNION` - Union of both branches

## Compression

The system supports multiple compression algorithms:

```typescript
enum CompressionAlgorithm {
  NONE = 'none',
  GZIP = 'gzip',
  BROTLI = 'brotli',
  LZMA = 'lzma'
}
```

Configuration:

```typescript
const store = new VersionStore('./.polln-version');
await store.initialize();

// Compression is enabled by default
// Snapshots and deltas are automatically compressed
```

## Performance

### Large Spreadsheets

Optimized for 1M+ cells:

- **Delta Compression**: Only store changes
- **Incremental Snapshots**: Base + deltas
- **Garbage Collection**: Automatic cleanup
- **Lazy Loading**: Load snapshots on demand

### Benchmarks

| Operation | 1K Cells | 10K Cells | 100K Cells | 1M Cells |
|-----------|----------|-----------|------------|----------|
| Commit | ~10ms | ~50ms | ~300ms | ~2s |
| Checkout | ~5ms | ~20ms | ~150ms | ~1s |
| Diff | ~8ms | ~40ms | ~250ms | ~1.5s |
| Merge | ~15ms | ~80ms | ~500ms | ~3s |

## Testing

Comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test file
npm test DeltaManager.test.ts

# Run with coverage
npm test -- --coverage
```

## Storage

Repository structure:

```
.polln-version/
├── repository.json          # Main repository data
├── snapshots/               # Snapshot storage (compressed)
├── deltas/                  # Delta storage (compressed)
└── branches/                # Branch metadata
```

## Best Practices

### 1. Commit Often

```typescript
// Good: Small, focused commits
await store.commit(cells, metadata, 'Fix formula in A1', 'user');
await store.commit(cells, metadata, 'Add validation', 'user');

// Avoid: Large, monolithic commits
await store.commit(cells, metadata, 'Lots of changes', 'user');
```

### 2. Use Branches

```typescript
// Create feature branch
store.branch('feature/sales-calculator');

// Work on feature
// ... make changes ...

// Merge back to main
store.checkoutBranch('main');
await store.merge('feature/sales-calculator');
```

### 3. Handle Conflicts

```typescript
const result = await store.merge('feature', MergeStrategy.AUTO);

if (!result.success) {
  // Generate UI for conflict resolution
  const ui = mergeResolver.generateConflictUI(result.conflicts!);

  // Let user resolve conflicts
  const resolutions = ui.map(item => ({
    coordinate: item.coordinate,
    action: MergeStrategy.MANUAL,
    customValue: getUserResolution(item)
  }));

  // Apply resolutions
  await mergeResolver.resolveWithConflicts(source, target, resolutions);
}
```

### 4. Garbage Collection

```typescript
// Keep last 10 versions per branch
const collected = store.garbageCollect(10);

console.log(`Collected ${collected} old snapshots`);
```

## Examples

### Basic Workflow

```typescript
import { VersionStore, CellType } from '@polln/spreadsheet/version';

const store = new VersionStore('./.polln-version');
await store.initialize();

// Initial commit
const cells = new Map([
  ['A1', { coordinate: 'A1', value: 'Sales', type: CellType.STRING }],
  ['B1', { coordinate: 'B1', value: 1000, type: CellType.NUMBER }]
]);

await store.commit(cells, metadata, 'Add sales data', 'alice');

// View history
const history = store.getHistory();
console.log(history);
```

### Branching Workflow

```typescript
// Create feature branch
store.branch('feature/quarterly-report');

// Make changes
cells.set('C1', { coordinate: 'C1', value: 'Q1', type: CellType.STRING });
await store.commit(cells, metadata, 'Add quarterly data', 'bob');

// Switch back
store.checkoutBranch('main');

// Continue on main
cells.set('D1', { coordinate: 'D1', value: 'Annual', type: CellType.STRING });
await store.commit(cells, metadata, 'Add annual data', 'alice');

// Merge feature
const result = await store.merge('feature/quarterly-report', MergeStrategy.AUTO);
```

### Conflict Resolution

```typescript
const result = await store.merge('feature', MergeStrategy.AUTO);

if (!result.success && result.conflicts) {
  console.log('Conflicts detected:');

  for (const conflict of result.conflicts) {
    console.log(`Cell ${conflict.coordinate}:`);
    console.log(`  Current: ${conflict.current.value}`);
    console.log(`  Incoming: ${conflict.incoming.value}`);
    console.log(`  Base: ${conflict.base.value}`);
  }

  // Generate UI
  const ui = mergeResolver.generateConflictUI(result.conflicts);

  // Present to user and get resolutions
  const resolutions = resolveConflictsWithUser(ui);

  // Apply
  await mergeResolver.resolveWithConflicts(source, target, resolutions);
}
```

## License

MIT
