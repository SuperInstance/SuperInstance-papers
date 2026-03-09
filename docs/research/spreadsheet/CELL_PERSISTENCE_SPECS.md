# Cell Persistence Specifications

**"Self-Deconstructing Spreadsheet Agents" - Cell Storage, Sync, Versioning & Sharing**

---

## Executive Summary

This specification defines how POLLN cells are persisted, synchronized, versioned, and shared across spreadsheet platforms (Excel, Google Sheets, Airtable). The design ensures:

- **Offline-first** - Work continues without internet
- **Seamless sync** - Automatic conflict resolution
- **Version control** - Full history with rollback
- **Template sharing** - Community marketplace
- **Data portability** - Export to any format
- **Security** - Encryption at rest and in transit

**Status**: ✅ Specification Complete
**Version**: 1.0
**Last Updated**: 2026-03-08

---

## Table of Contents

1. [Storage Format Specification](#storage-format-specification)
2. [Local Storage Strategy](#local-storage-strategy)
3. [Cloud Sync Protocol](#cloud-sync-protocol)
4. [Version Control System](#version-control-system)
5. [Template Export/Import](#template-exportimport)
6. [Migration Guide](#migration-guide)
7. [Performance Optimization](#performance-optimization)
8. [Security Model](#security-model)
9. [API Reference](#api-reference)

---

## Storage Format Specification

### Core Data Model

```typescript
/**
 * Complete cell state for persistence
 */
interface CellPersistedState {
  // Identity
  cellId: string;              // UUID v4
  spreadsheetId: string;       // Spreadsheet unique identifier
  location: {
    sheet: string;
    row: number;
    col: number;
  };

  // Agent Configuration
  agentDefinition: {
    typeId: string;            // TaskAgent | RoleAgent | CoreAgent
    config: AgentConfig;
    state: AgentState;
  };

  // Learning State
  learningState: {
    patterns: Pattern[];
    weights: Map<string, number>;
    valueFunction: number;
    successCount: number;
    failureCount: number;
    lastTrained: number;
  };

  // Metadata
  metadata: {
    createdAt: number;
    updatedAt: number;
    version: number;
    author: string;
    tags: string[];
    description?: string;
  };

  // Dependencies
  dependencies: {
    inputCells: string[];      // Cell IDs this cell depends on
    outputCells: string[];     // Cell IDs depending on this cell
  };

  // Security
  security: {
    encrypted: boolean;
    hasApiKeys: boolean;       // Never sync API keys!
    sensitivity: 'public' | 'private' | 'sensitive';
  };

  // Performance
  performance: {
    avgExecutionTime: number;
    cacheHitRate: number;
    lastExecuted: number;
  };
}

/**
 * Pattern learned by agent
 */
interface Pattern {
  id: string;
  inputHash: string;           // Hash of input signature
  outputHash: string;          // Hash of output
  confidence: number;          // 0-1
  frequency: number;           // How often this pattern occurs
  lastSeen: number;
  distilled: boolean;          // Has this been distilled to a bot?
}

/**
 * Complete cell with version history
 */
interface CellWithHistory {
  current: CellPersistedState;
  versions: CellVersion[];
  checksum: string;            // SHA-256 of entire state
}
```

### Serialization Format

#### Primary Format: JSON (Compressed)

```json
{
  "format": "polln-cell-v1",
  "compression": "gzip",
  "encoding": "utf-8",
  "cell": { /* CellPersistedState */ }
}
```

**Rationale**:
- JSON: Universal, debuggable, human-readable (when uncompressed)
- Gzip: Reduces size by 70-90%
- UTF-8: Universal character encoding

#### Binary Format: MessagePack (Optional)

For high-performance scenarios where parse time matters:

```typescript
import { encode, decode } from 'msgpack-lite';

// Serialize
const binary = encode(cellState);

// Deserialize
const cellState = decode(binary);
```

**Benefits**:
- Smaller than JSON (20-30%)
- Faster to parse (2-3x)
- Still schemaless

### Storage Location Strategy

#### Excel: Custom XML Parts

```typescript
/**
 * Excel stores data in Custom XML Parts
 * Location: Package root/xml/customXml/item*.xml
 */
interface ExcelStorageStrategy {
  // Primary storage
  customXmlPart: {
    namespace: 'http://polln.ai/schemas/cell/v1';
    id: string;                // UUID
    content: string;           // Base64-encoded, compressed JSON
  };

  // Backup (for recovery)
  hiddenSheet: {
    name: '_POLLN_BACKUP_';
    range: 'A1:Z1000';
    format: 'base64-per-cell';
  };
}
```

**Implementation**:

```typescript
// Excel Office.js API
async function saveCellToExcel(cell: CellPersistedState): Promise<void> {
  await Excel.run(async (context) => {
    // Get or create custom XML part
    const customXmlParts = context.workbook.customXmlParts;
    const xmlPart = customXmlParts.getItemOrNullObject(cell.cellId);

    // Serialize and compress
    const json = JSON.stringify(cell);
    const compressed = gzip(json);
    const base64 = btoa(compressed);

    if (xmlPart.isNull) {
      // Create new
      customXmlParts.add(cell.cellId, base64);
    } else {
      // Update existing
      xmlPart.setXml(base64);
    }

    await context.sync();
  });
}
```

#### Google Sheets: PropertiesService + Drive App Data

```typescript
/**
 * Google Sheets uses a hybrid approach
 */
interface GoogleSheetsStorageStrategy {
  // Document properties (fast, small cells)
  documentProperties: {
    scriptProperties: PropertiesService.Properties;
    key: `polln_cell_${cellId}`;
    maxSize: '9KB per property, 500KB total';
  };

  // Drive app data (large cells, version history)
  driveAppData: {
    folder: 'applicationData';
    file: `polln_cells_${spreadsheetId}.json`;
    maxSize: 'unlimited';
    versioning: 'automatic';
  };

  // Backup (hidden sheet)
  hiddenSheet: {
    name: '_POLLN_STATE_';
    range: 'A1:Z1000';
  };
}
```

**Implementation**:

```typescript
// Google Apps Script
async function saveCellToGoogleSheets(cell: CellPersistedState): Promise<void> {
  const scriptProperties = PropertiesService.getDocumentProperties();

  // Serialize and compress
  const json = JSON.stringify(cell);
  const compressed = Utilities.gzip(Utilities.newBlob(json));
  const base64 = Utilities.base64Encode(compressed.getBytes());

  // Try document properties first (fast)
  try {
    scriptProperties.setProperty(`polln_cell_${cell.cellId}`, base64);
  } catch (e) {
    // Too large, use Drive app data
    saveToDriveAppData(cell);
  }
}
```

### File Structure

#### Excel File Structure

```
MyWorkbook.xlsx
├── [Content_Types].xml
├── _rels/
├── xl/
│   ├── workbook.xml
│   ├── worksheets/
│   │   ├── sheet1.xml
│   │   └── sheet2.xml
│   └── customXml/
│       ├── item1.xml          # POLLN cell manifest
│       ├── item2.xml          # Cell 1 state
│       └── item3.xml          # Cell 2 state
└── _POLLN_BACKUP_/            # Hidden sheet (emergency)
    └── Cell States...
```

#### Google Sheets File Structure

```
MySpreadsheet (Google Sheet)
├── Sheet1
├── Sheet2
├── Script Properties          # Fast access (DocumentProperties)
│   ├── polln_cell_abc123
│   └── polln_cell_def456
├── _POLLN_STATE_              # Hidden sheet (backup)
└── Drive App Data             # Large cells, history
    └── polln_cells_{id}.json
```

---

## Local Storage Strategy

### Storage Hierarchy

```
Priority 1: Spreadsheet Native Storage
  └─ Custom XML Parts (Excel) or Properties (Google Sheets)
      └─ Fast, portable, versioned with spreadsheet

Priority 2: Browser/Platform Local Storage
  └─ IndexedDB (Excel) or localStorage (Google Sheets)
      └─ Cache for quick access
      └─ Offline work queue

Priority 3: File System (Excel Desktop only)
  └─ %APPDATA%\POLLN\cells\
      └─ Persistent cache
      └─ Offline backup
```

### IndexedDB Schema (Excel)

```typescript
/**
 * IndexedDB schema for Excel add-in
 */
const DB_NAME = 'POLLNCellCache';
const DB_VERSION = 1;

const schema = {
  stores: {
    // Cell states (fast lookup)
    cells: {
      keyPath: 'cellId',
      indexes: {
        spreadsheetId: 'spreadsheetId',
        lastAccessed: 'lastAccessed',
        version: 'version'
      }
    },

    // Version history
    versions: {
      keyPath: ['cellId', 'version'],
      indexes: {
        timestamp: 'timestamp'
      }
    },

    // Sync queue (offline work)
    syncQueue: {
      keyPath: 'id',
      autoIncrement: true,
      indexes: {
        cellId: 'cellId',
        timestamp: 'timestamp',
        status: 'status'  // pending | syncing | failed
      }
    },

    // Template cache
    templates: {
      keyPath: 'templateId',
      indexes: {
        category: 'category',
        popularity: 'downloads'
      }
    }
  }
};
```

### Cache Invalidation Strategy

```typescript
/**
 * Cache invalidation with smart TTL
 */
interface CachePolicy {
  // Active cells (recently used)
  active: {
    ttl: '1 hour';
    maxEntries: 100;
    eviction: 'LRU';
  };

  // Inactive cells (not used recently)
  inactive: {
    ttl: '24 hours';
    maxEntries: 500;
    eviction: 'LRU';
  };

  // Template cells (rarely change)
  templates: {
    ttl: '7 days';
    maxEntries: 1000;
    eviction: 'none';
  };
}

/**
 * Smart cache warming
 */
async function warmCache(spreadsheetId: string): Promise<void> {
  // Load all cells for this spreadsheet
  const cells = await loadCellsFromSpreadsheet(spreadsheetId);

  // Sort by last accessed
  const sorted = cells.sort((a, b) =>
    b.metadata.lastAccessed - a.metadata.lastAccessed
  );

  // Cache top 100
  for (const cell of sorted.slice(0, 100)) {
    await indexedDB.put('cells', cell);
  }
}
```

### Offline Work Queue

```typescript
/**
 * Offline work queue for sync when back online
 */
interface SyncQueueItem {
  id: number;
  cellId: string;
  action: 'create' | 'update' | 'delete';
  data: CellPersistedState;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  retryCount: number;
  error?: string;
}

/**
 * Process sync queue when online
 */
async function processSyncQueue(): Promise<void> {
  const pending = await indexedDB.getAll('syncQueue', {
    index: 'status',
    value: 'pending'
  });

  for (const item of pending) {
    try {
      item.status = 'syncing';
      await indexedDB.put('syncQueue', item);

      // Sync to spreadsheet
      await syncCellToSpreadsheet(item);

      // Sync to cloud (if configured)
      await syncCellToCloud(item);

      item.status = 'completed';
      await indexedDB.put('syncQueue', item);
    } catch (e) {
      item.status = 'failed';
      item.error = e.message;
      item.retryCount++;
      await indexedDB.put('syncQueue', item);

      // Retry later if not too many failures
      if (item.retryCount < 3) {
        setTimeout(() => processSyncQueue(), 60000);
      }
    }
  }
}
```

---

## Cloud Sync Protocol

### Sync Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Sync Orchestrator                    │
│  - Detects changes                                      │
│  - Resolves conflicts                                  │
│  - Manages sync queue                                  │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼──────┐  ┌──────▼──────────┐
│   Spreadsheet│  │   Cloud Storage │
│   (Local)    │  │   (Remote)      │
│              │  │                  │
│ - Excel      │  │ - Firebase      │
│ - GSheets    │  │ - Supabase      │
│ - Airtable   │  │ - Custom        │
└──────────────┘  └──────────────────┘
```

### Sync Triggers

```typescript
/**
 * When to sync
 */
interface SyncTrigger {
  // Auto-sync triggers
  autoSync: {
    onCellChange: true;           // Immediate
    onSpreadsheetSave: true;      // On save
    onOnline: true;               // When back online
    interval: '5 minutes';        // Periodic
  };

  // Manual sync triggers
  manualSync: {
    userRequest: true;            // User clicks "Sync"
    beforeClose: true;            // Before closing
  };
}
```

### Conflict Resolution Strategy

```typescript
/**
 * Conflict resolution with multiple strategies
 */
enum ConflictStrategy {
  LAST_WRITE_WINS = 'last_write_wins',
  MANUAL_MERGE = 'manual_merge',
  VERSION_PRUNE = 'version_prune',
  SEMANTIC_MERGE = 'semantic_merge'
}

/**
 * Conflict detection
 */
interface Conflict {
  conflictId: string;
  cellId: string;
  localVersion: CellVersion;
  remoteVersion: CellVersion;
  conflictType: 'content' | 'metadata' | 'dependency';
  detectedAt: number;
}

/**
 * Conflict resolution engine
 */
class ConflictResolver {
  async resolveConflict(
    conflict: Conflict,
    strategy: ConflictStrategy
  ): Promise<CellPersistedState> {
    switch (strategy) {
      case ConflictStrategy.LAST_WRITE_WINS:
        return this.lastWriteWins(conflict);

      case ConflictStrategy.VERSION_PRUNE:
        return this.versionPrune(conflict);

      case ConflictStrategy.SEMANTIC_MERGE:
        return await this.semanticMerge(conflict);

      case ConflictStrategy.MANUAL_MERGE:
        return await this.promptUser(conflict);

      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }

  private lastWriteWins(conflict: Conflict): CellPersistedState {
    // Most recent timestamp wins
    return conflict.remoteVersion.timestamp > conflict.localVersion.timestamp
      ? conflict.remoteVersion.changes
      : conflict.localVersion.changes;
  }

  private versionPrune(conflict: Conflict): CellPersistedState {
    // Keep the version with higher version number
    return conflict.remoteVersion.version > conflict.localVersion.version
      ? conflict.remoteVersion.changes
      : conflict.localVersion.changes;
  }

  private async semanticMerge(conflict: Conflict): Promise<CellPersistedState> {
    const local = conflict.localVersion.changes;
    const remote = conflict.remoteVersion.changes;

    // Merge non-conflicting fields
    const merged: CellPersistedState = {
      ...local,
      ...remote,

      // Smart merge for specific fields
      learningState: {
        ...local.learningState,
        ...remote.learningState,
        // Merge weights (average)
        weights: this.mergeWeights(
          local.learningState.weights,
          remote.learningState.weights
        )
      },

      // Keep union of dependencies
      dependencies: {
        inputCells: [
          ...new Set([
            ...local.dependencies.inputCells,
            ...remote.dependencies.inputCells
          ])
        ],
        outputCells: [
          ...new Set([
            ...local.dependencies.outputCells,
            ...remote.dependencies.outputCells
          ])
        ]
      }
    };

    return merged;
  }

  private async promptUser(conflict: Conflict): Promise<CellPersistedState> {
    // Show UI for manual merge
    return new Promise((resolve) => {
      // UI would show:
      // - Local version
      // - Remote version
      // - Diff
      // - Merge controls
      //
      // User selects or manually merges
    });
  }

  private mergeWeights(
    local: Map<string, number>,
    remote: Map<string, number>
  ): Map<string, number> {
    const merged = new Map<string, number>();

    // Add all weights from both
    for (const [key, value] of local.entries()) {
      merged.set(key, value);
    }
    for (const [key, value] of remote.entries()) {
      const existing = merged.get(key) || 0;
      // Average the weights
      merged.set(key, (existing + value) / 2);
    }

    return merged;
  }
}
```

### Incremental Sync Protocol

```typescript
/**
 * Incremental sync - only sync changes
 */
interface SyncDelta {
  spreadsheetId: string;
  sinceVersion: number;
  changes: {
    created: CellPersistedState[];
    updated: Array<{
      cellId: string;
      version: number;
      changes: Partial<CellPersistedState>;
    }>;
    deleted: string[];  // Cell IDs
  };
  checksum: string;     // For verification
}

/**
 * Server-side change detection
 */
async function getChangesSince(
  spreadsheetId: string,
  sinceVersion: number
): Promise<SyncDelta> {
  const changes: SyncDelta = {
    spreadsheetId,
    sinceVersion,
    changes: {
      created: [],
      updated: [],
      deleted: []
    },
    checksum: ''
  };

  // Query database for changes
  const cells = await db.cells.find({
    spreadsheetId,
    version: { $gt: sinceVersion }
  });

  for (const cell of cells) {
    if (cell.deleted) {
      changes.changes.deleted.push(cell.cellId);
    } else if (cell.version === sinceVersion + 1) {
      changes.changes.created.push(cell);
    } else {
      changes.changes.updated.push({
        cellId: cell.cellId,
        version: cell.version,
        changes: cell.changes
      });
    }
  }

  // Calculate checksum
  changes.checksum = calculateChecksum(changes);

  return changes;
}

/**
 * Client-side sync
 */
async function syncChanges(delta: SyncDelta): Promise<void> {
  // Apply changes
  for (const cell of delta.changes.created) {
    await saveCellLocally(cell);
  }

  for (const update of delta.changes.updated) {
    await updateCellLocally(update.cellId, update.changes);
  }

  for (const cellId of delta.changes.deleted) {
    await deleteCellLocally(cellId);
  }

  // Verify checksum
  const localChecksum = await calculateLocalChecksum(delta.spreadsheetId);
  if (localChecksum !== delta.checksum) {
    throw new Error('Checksum mismatch - sync failed');
  }
}
```

### Offline Support

```typescript
/**
 * Offline detection and handling
 */
class OfflineManager {
  private isOnline: boolean = navigator.onLine;
  private offlineQueue: SyncQueueItem[] = [];

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private handleOnline(): void {
    this.isOnline = true;

    // Show notification
    showNotification('Back online - syncing...');

    // Process queued changes
    this.processQueue();
  }

  private handleOffline(): void {
    this.isOnline = false;

    // Show notification
    showNotification('Working offline - changes will sync later');
  }

  async saveCellOffline(cell: CellPersistedState): Promise<void> {
    // Save locally
    await saveCellLocally(cell);

    // Add to sync queue
    this.offlineQueue.push({
      id: Date.now(),
      cellId: cell.cellId,
      action: 'update',
      data: cell,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    });
  }

  private async processQueue(): Promise<void> {
    for (const item of this.offlineQueue) {
      try {
        await syncCellToCloud(item);
        item.status = 'completed';
      } catch (e) {
        item.status = 'failed';
        item.error = e.message;
        item.retryCount++;
      }
    }

    // Remove completed items
    this.offlineQueue = this.offlineQueue.filter(
      item => item.status !== 'completed'
    );
  }
}
```

---

## Version Control System

### Version History Model

```typescript
/**
 * Version history entry
 */
interface CellVersion {
  cellId: string;
  version: number;              // Monotonically increasing
  timestamp: number;
  author: string;               // User ID or "system"

  changes: {
    // What changed
    function?: string;
    patterns?: Pattern[];
    weights?: Map<string, number>;
    dependencies?: {
      inputCells: string[];
      outputCells: string[];
    };
  };

  // Why it changed
  reason: VersionChangeReason;
  explanation?: string;

  // Metadata
  size: number;                 // Bytes
  checksum: string;             // SHA-256
}

/**
 * Reasons for version changes
 */
enum VersionChangeReason {
  USER_EDIT = 'user_edit',                    // User manually edited
  LEARNING_UPDATE = 'learning_update',        // Training updated weights
  PATTERN_DISCOVERED = 'pattern_discovered',  // New pattern found
  AGENT_DISTILLED = 'agent_distilled',        // Agent distilled to bot
  DEPENDENCY_CHANGED = 'dependency_changed',  // Dependencies changed
  SYSTEM_AUTO = 'system_auto',                // Automatic system change
  MERGE = 'merge',                            // Merge conflict resolved
  RESTORE = 'restore'                         // Restored from backup
}
```

### Version Storage Strategy

```typescript
/**
 * Version storage with compression
 */
class VersionStore {
  /**
   * Store a new version
   */
  async storeVersion(version: CellVersion): Promise<void> {
    // Compress
    const json = JSON.stringify(version);
    const compressed = gzip(json);
    const checksum = sha256(compressed);

    // Store in spreadsheet (recent versions)
    if (version.version < 10) {
      await this.storeInSpreadsheet(version);
    }

    // Store in cloud (all versions)
    await this.storeInCloud(version, checksum);

    // Clean up old local versions
    await this.cleanupOldVersions(version.cellId);
  }

  /**
   * Get version history
   */
  async getHistory(cellId: string): Promise<CellVersion[]> {
    // Load from cloud
    const versions = await this.loadFromCloud(cellId);

    // Sort by version number
    return versions.sort((a, b) => b.version - a.version);
  }

  /**
   * Restore a specific version
   */
  async restoreVersion(
    cellId: string,
    version: number
  ): Promise<CellPersistedState> {
    const versionData = await this.loadVersion(cellId, version);

    // Create new version for the restore
    const newVersion: CellVersion = {
      cellId,
      version: versionData.version + 1,
      timestamp: Date.now(),
      author: 'user',
      changes: versionData.changes,
      reason: VersionChangeReason.RESTORE,
      explanation: `Restored from version ${version}`,
      size: versionData.size,
      checksum: versionData.checksum
    };

    // Save as current state
    await this.storeVersion(newVersion);

    return versionData.changes as CellPersistedState;
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    cellId: string,
    versionA: number,
    versionB: number
  ): Promise<VersionDiff> {
    const [a, b] = await Promise.all([
      this.loadVersion(cellId, versionA),
      this.loadVersion(cellId, versionB)
    ]);

    return {
      cellId,
      versionA,
      versionB,
      timestampDiff: b.timestamp - a.timestamp,
      changes: this.computeDiff(a.changes, b.changes)
    };
  }

  private computeDiff(
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ): VersionDiffChange[] {
    const changes: VersionDiffChange[] = [];

    // Find changed fields
    for (const key of Object.keys(after)) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changes.push({
          field: key,
          before: before[key],
          after: after[key]
        });
      }
    }

    return changes;
  }

  private async cleanupOldVersions(cellId: string): Promise<void> {
    // Keep only last 10 versions locally
    const versions = await this.loadLocalVersions(cellId);
    const sorted = versions.sort((a, b) => b.version - a.version);

    for (const oldVersion of sorted.slice(10)) {
      await this.deleteFromSpreadsheet(oldVersion);
    }
  }
}

/**
 * Version diff result
 */
interface VersionDiff {
  cellId: string;
  versionA: number;
  versionB: number;
  timestampDiff: number;
  changes: VersionDiffChange[];
}

interface VersionDiffChange {
  field: string;
  before: unknown;
  after: unknown;
}
```

### Branching and Merging

```typescript
/**
 * Experimental branching for advanced users
 */
interface CellBranch {
  branchId: string;
  cellId: string;
  parentBranch: string | null;
  name: string;
  createdAt: number;
  version: number;
}

/**
 * Create a branch (experimental)
 */
async function createBranch(
  cellId: string,
  branchName: string
): Promise<CellBranch> {
  const current = await loadCell(cellId);

  const branch: CellBranch = {
    branchId: generateUUID(),
    cellId,
    parentBranch: null,
    name: branchName,
    createdAt: Date.now(),
    version: current.metadata.version
  };

  // Store branch metadata
  await storeBranch(branch);

  return branch;
}

/**
 * Merge branches
 */
async function mergeBranches(
  sourceBranch: string,
  targetBranch: string
): Promise<CellPersistedState> {
  const source = await loadBranch(sourceBranch);
  const target = await loadBranch(targetBranch);

  // Use semantic merge
  const resolver = new ConflictResolver();
  const merged = await resolver.semanticMerge({
    conflictId: generateUUID(),
    cellId: source.cellId,
    localVersion: target,
    remoteVersion: source,
    conflictType: 'content',
    detectedAt: Date.now()
  });

  return merged;
}
```

---

## Template Export/Import

### Template Format

```typescript
/**
 * Exportable cell template
 */
interface CellTemplate {
  // Template metadata
  template: {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    version: string;
    author: string;
    createdAt: number;
  };

  // Cell definition (without user data)
  cell: {
    agentDefinition: CellPersistedState['agentDefinition'];
    defaultConfig: AgentConfig;
    requiredInputs: string[];
    outputFormat: string;
  };

  // Usage instructions
  instructions: {
    setup: string[];
    usage: string[];
    examples: Array<{
      input: unknown;
      output: unknown;
      explanation: string;
    }>;
  };

  // Attribution
  attribution: {
    originalAuthor: string;
    license: TemplateLicense;
    derivedFrom?: string;
    modifiedBy?: string[];
  };

  // Performance stats (from template author)
  performance?: {
    avgExecutionTime: number;
    accuracy: number;
    sampleSize: number;
  };
}

/**
 * Template licenses
 */
enum TemplateLicense {
  MIT = 'MIT',
  APACHE_2_0 = 'Apache-2.0',
  GPL_3_0 = 'GPL-3.0',
  CC_BY = 'CC-BY',
  CC_BY_SA = 'CC-BY-SA',
  PROPRIETARY = 'PROPRIETARY'
}
```

### Export Process

```typescript
/**
 * Export a cell as a template
 */
async function exportCellAsTemplate(
  cellId: string,
  metadata: Partial<CellTemplate['template']>
): Promise<CellTemplate> {
  // Load cell
  const cell = await loadCell(cellId);

  // Strip sensitive data
  const sanitized = sanitizeForTemplate(cell);

  // Create template
  const template: CellTemplate = {
    template: {
      id: generateUUID(),
      name: metadata.name || 'Untitled Template',
      description: metadata.description || '',
      category: metadata.category || 'general',
      tags: metadata.tags || [],
      version: '1.0.0',
      author: cell.metadata.author,
      createdAt: Date.now()
    },
    cell: {
      agentDefinition: sanitized.agentDefinition,
      defaultConfig: sanitized.agentDefinition.config,
      requiredInputs: extractRequiredInputs(sanitized),
      outputFormat: extractOutputFormat(sanitized)
    },
    instructions: {
      setup: generateSetupInstructions(sanitized),
      usage: generateUsageInstructions(sanitized),
      examples: extractExamples(sanitized)
    },
    attribution: {
      originalAuthor: cell.metadata.author,
      license: TemplateLicense.MIT,
      modifiedBy: []
    },
    performance: extractPerformanceStats(cell)
  };

  return template;
}

/**
 * Sanitize cell for template export
 */
function sanitizeForTemplate(cell: CellPersistedState): CellPersistedState {
  // Deep clone
  const sanitized = JSON.parse(JSON.stringify(cell));

  // Remove user-specific data
  delete sanitized.security.apiKeys;
  delete sanitized.dependencies.inputCells;
  delete sanitized.dependencies.outputCells;

  // Reset learning state (start fresh)
  sanitized.learningState = {
    patterns: [],
    weights: new Map(),
    valueFunction: 0,
    successCount: 0,
    failureCount: 0,
    lastTrained: 0
  };

  return sanitized;
}
```

### Import Process

```typescript
/**
 * Import a template into a spreadsheet
 */
async function importTemplate(
  template: CellTemplate,
  location: { sheet: string; row: number; col: number }
): Promise<string> {
  // Validate template
  validateTemplate(template);

  // Create new cell from template
  const cellId = generateUUID();
  const cell: CellPersistedState = {
    cellId,
    spreadsheetId: getCurrentSpreadsheetId(),
    location,
    agentDefinition: template.cell.agentDefinition,
    learningState: {
      patterns: [],
      weights: new Map(),
      valueFunction: 0,
      successCount: 0,
      failureCount: 0,
      lastTrained: 0
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      author: getCurrentUser(),
      tags: template.template.tags,
      description: `Imported from template: ${template.template.name}`
    },
    dependencies: {
      inputCells: [],
      outputCells: []
    },
    security: {
      encrypted: false,
      hasApiKeys: false,
      sensitivity: 'public'
    },
    performance: {
      avgExecutionTime: 0,
      cacheHitRate: 0,
      lastExecuted: 0
    }
  };

  // Save cell
  await saveCell(cell);

  // Record template usage
  await recordTemplateUsage(template.template.id, cellId);

  return cellId;
}

/**
 * Validate template before import
 */
function validateTemplate(template: CellTemplate): void {
  // Check required fields
  if (!template.template?.name) {
    throw new Error('Template must have a name');
  }

  if (!template.cell?.agentDefinition) {
    throw new Error('Template must have agent definition');
  }

  // Check license compatibility
  if (template.attribution.license === TemplateLicense.PROPRIETARY) {
    // Warn user
    showWarning('This template is proprietary. Check licensing terms.');
  }

  // Validate agent definition
  try {
    validateAgentConfig(template.cell.agentDefinition.config);
  } catch (e) {
    throw new Error(`Invalid agent definition: ${e.message}`);
  }
}
```

### Template Marketplace (Future)

```typescript
/**
 * Template marketplace structure
 */
interface TemplateMarketplace {
  templates: TemplateListing[];
  categories: string[];
  search(query: string): TemplateListing[];
  download(templateId: string): Promise<CellTemplate>;
  upload(template: CellTemplate): Promise<void>;
  rate(templateId: string, rating: number): Promise<void>;
}

interface TemplateListing {
  templateId: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  version: string;
  license: TemplateLicense;

  // Metrics
  downloads: number;
  rating: number;
  ratingCount: number;

  // Preview
  preview?: {
    screenshot: string;
    exampleUsage: string;
  };

  // Compatibility
  compatibility: {
    excel: boolean;
    googleSheets: boolean;
    airtable: boolean;
  };
}

/**
 * Search templates
 */
async function searchTemplates(
  query: string,
  category?: string
): Promise<TemplateListing[]> {
  const results = await fetch(`/api/templates/search?q=${query}`)
    .then(r => r.json());

  // Filter by category if specified
  if (category) {
    return results.filter(t => t.category === category);
  }

  return results;
}

/**
 * Download template
 */
async function downloadTemplate(templateId: string): Promise<CellTemplate> {
  const response = await fetch(`/api/templates/${templateId}`);

  if (!response.ok) {
    throw new Error('Template not found');
  }

  const template: CellTemplate = await response.json();

  // Verify checksum
  const checksum = sha256(JSON.stringify(template));
  if (checksum !== response.headers.get('X-Template-Checksum')) {
    throw new Error('Template checksum mismatch');
  }

  return template;
}

/**
 * Upload template to marketplace
 */
async function uploadTemplate(
  template: CellTemplate
): Promise<void> {
  // Validate template
  validateTemplate(template);

  // Check for duplicates
  const existing = await searchTemplates(template.template.name);
  if (existing.length > 0) {
    if (!confirm('A template with this name already exists. Continue?')) {
      return;
    }
  }

  // Upload
  const response = await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template)
  });

  if (!response.ok) {
    throw new Error('Failed to upload template');
  }

  showNotification('Template uploaded successfully!');
}
```

---

## Migration Guide

### Excel to Google Sheets Migration

```typescript
/**
 * Migrate cells from Excel to Google Sheets
 */
async function migrateExcelToGoogleSheets(
  excelFile: File
): Promise<void> {
  // Load Excel file
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(excelFile);

  // Extract POLLN cells
  const cells = await extractCellsFromExcel(workbook);

  // Create Google Sheets
  const googleSheet = await createGoogleSheetsFromExcel(workbook);

  // Migrate cells
  for (const cell of cells) {
    try {
      // Convert cell state format
      const converted = convertExcelToGoogleSheets(cell);

      // Save to Google Sheets
      await saveCellToGoogleSheets(converted);

      // Update location
      cell.location = await findMatchingLocation(cell, googleSheet);
    } catch (e) {
      console.error(`Failed to migrate cell ${cell.cellId}:`, e);
      // Continue with next cell
    }
  }

  // Show summary
  showNotification(`Migrated ${cells.length} cells to Google Sheets`);
}

/**
 * Extract cells from Excel file
 */
async function extractCellsFromExcel(
  workbook: ExcelJS.Workbook
): Promise<CellPersistedState[]> {
  const cells: CellPersistedState[] = [];

  // Load custom XML parts
  for (const sheet of workbook.worksheets) {
    const customXml = sheet.customXml;

    if (!customXml) continue;

    // Parse POLLN cells
    const parser = new DOMParser();
    const xml = parser.parseFromString(customXml, 'text/xml');

    const cellNodes = xml.querySelectorAll('polln-cell');

    for (const node of cellNodes) {
      const base64 = node.textContent;
      const compressed = atob(base64);
      const json = ungzip(compressed);
      const cell = JSON.parse(json);

      cells.push(cell);
    }
  }

  return cells;
}

/**
 * Convert Excel cell to Google Sheets format
 */
function convertExcelToGoogleSheets(
  excelCell: CellPersistedState
): CellPersistedState {
  // Most fields are compatible
  const googleCell: CellPersistedState = {
    ...excelCell,

    // Update platform-specific fields
    spreadsheetId: null,  // Will be set during migration

    // Convert Office.js specific APIs
    agentDefinition: {
      ...excelCell.agentDefinition,
      config: {
        ...excelCell.agentDefinition.config,
        // Remove Excel-specific APIs
        apiBindings: convertApiBindings(
          excelCell.agentDefinition.config.apiBindings,
          'excel',
          'googleSheets'
        )
      }
    }
  };

  return googleCell;
}
```

### Version Upgrades

```typescript
/**
 * Version upgrade migration
 */
interface Migration {
  fromVersion: string;
  toVersion: string;
  migrate: (cell: CellPersistedState) => Promise<CellPersistedState>;
  rollback?: (cell: CellPersistedState) => Promise<CellPersistedState>;
}

/**
 * Migration registry
 */
const MIGRATIONS: Migration[] = [
  {
    fromVersion: '0.9.0',
    toVersion: '1.0.0',
    migrate: async (cell) => {
      // Add new fields
      return {
        ...cell,
        security: {
          encrypted: false,
          hasApiKeys: false,
          sensitivity: 'public'
        },
        performance: {
          avgExecutionTime: 0,
          cacheHitRate: 0,
          lastExecuted: 0
        }
      };
    }
  },
  {
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    migrate: async (cell) => {
      // Convert weights from array to Map
      return {
        ...cell,
        learningState: {
          ...cell.learningState,
          weights: new Map(
            Object.entries(cell.learningState.weights as any)
          )
        }
      };
    }
  }
];

/**
 * Run migrations
 */
async function runMigrations(
  cell: CellPersistedState,
  targetVersion: string
): Promise<CellPersistedState> {
  let current = cell;
  const currentVersion = cell.metadata.version || '0.9.0';

  // Find migration path
  const path = findMigrationPath(currentVersion, targetVersion);

  // Run migrations in order
  for (const migration of path) {
    try {
      current = await migration.migrate(current);
    } catch (e) {
      console.error(`Migration failed: ${migration.fromVersion} -> ${migration.toVersion}`, e);

      // Rollback if possible
      if (migration.rollback) {
        current = await migration.rollback(current);
      }

      throw e;
    }
  }

  return current;
}

/**
 * Find migration path
 */
function findMigrationPath(
  from: string,
  to: string
): Migration[] {
  const path: Migration[] = [];
  let current = from;

  while (current !== to) {
    const migration = MIGRATIONS.find(m => m.fromVersion === current);

    if (!migration) {
      throw new Error(`No migration found from ${current}`);
    }

    path.push(migration);
    current = migration.toVersion;
  }

  return path;
}
```

### Backup and Restore

```typescript
/**
 * Backup all cells in a spreadsheet
 */
async function backupSpreadsheet(spreadsheetId: string): Promise<Blob> {
  // Load all cells
  const cells = await loadAllCells(spreadsheetId);

  // Create backup
  const backup: SpreadsheetBackup = {
    spreadsheetId,
    backupDate: Date.now(),
    version: '1.0.0',
    cellCount: cells.length,
    cells,
    checksum: ''
  };

  // Calculate checksum
  backup.checksum = sha256(JSON.stringify(backup.cells));

  // Create file
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  return blob;
}

/**
 * Restore spreadsheet from backup
 */
async function restoreFromBackup(backup: Blob): Promise<void> {
  // Load backup
  const json = await backup.text();
  const data: SpreadsheetBackup = JSON.parse(json);

  // Verify checksum
  const checksum = sha256(JSON.stringify(data.cells));
  if (checksum !== data.checksum) {
    throw new Error('Backup checksum mismatch - file may be corrupted');
  }

  // Confirm restore
  if (!confirm(`Restore ${data.cellCount} cells from ${new Date(data.backupDate).toLocaleString()}?`)) {
    return;
  }

  // Clear existing cells
  await clearAllCells(data.spreadsheetId);

  // Restore cells
  for (const cell of data.cells) {
    await saveCell(cell);
  }

  showNotification('Backup restored successfully!');
}

/**
 * Spreadsheet backup structure
 */
interface SpreadsheetBackup {
  spreadsheetId: string;
  backupDate: number;
  version: string;
  cellCount: number;
  cells: CellPersistedState[];
  checksum: string;
}
```

### Data Portability

```typescript
/**
 * Export cells to various formats
 */
async function exportCells(
  cells: CellPersistedState[],
  format: ExportFormat
): Promise<Blob> {
  switch (format) {
    case ExportFormat.JSON:
      return exportAsJSON(cells);

    case ExportFormat.CSV:
      return exportAsCSV(cells);

    case ExportFormat.EXCEL:
      return exportAsExcel(cells);

    case ExportFormat.PACKAGE:
      return exportAsPackage(cells);

    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

/**
 * Export as JSON (human-readable)
 */
async function exportAsJSON(cells: CellPersistedState[]): Promise<Blob> {
  const json = JSON.stringify(cells, null, 2);
  return new Blob([json], { type: 'application/json' });
}

/**
 * Export as CSV (for analysis)
 */
async function exportAsCSV(cells: CellPersistedState[]): Promise<Blob> {
  // Flatten cell data
  const rows = cells.map(cell => ({
    cellId: cell.cellId,
    sheet: cell.location.sheet,
    row: cell.location.row,
    col: cell.location.col,
    agentType: cell.agentDefinition.typeId,
    createdAt: new Date(cell.metadata.createdAt).toISOString(),
    updatedAt: new Date(cell.metadata.updatedAt).toISOString(),
    version: cell.metadata.version,
    successCount: cell.learningState.successCount,
    failureCount: cell.learningState.failureCount,
    avgExecutionTime: cell.performance.avgExecutionTime
  }));

  // Convert to CSV
  const csv = convertToCSV(rows);
  return new Blob([csv], { type: 'text/csv' });
}

/**
 * Export as Excel workbook
 */
async function exportAsExcel(cells: CellPersistedState[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow(['Cell ID', 'Location', 'Agent Type', 'Version', 'Status']);

  for (const cell of cells) {
    summarySheet.addRow([
      cell.cellId,
      `${cell.location.sheet}!${cell.location.row}:${cell.location.col}`,
      cell.agentDefinition.typeId,
      cell.metadata.version,
      cell.agentDefinition.state.status
    ]);
  }

  // Details sheet
  const detailsSheet = workbook.addWorksheet('Details');
  // ... add detailed rows

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Export as shareable package
 */
async function exportAsPackage(cells: CellPersistedState[]): Promise<Blob> {
  const pkg: ShareablePackage = {
    version: '1.0.0',
    exportDate: Date.now(),
    cellCount: cells.length,
    cells,

    // Include metadata
    manifest: {
      spreadsheetId: cells[0]?.spreadsheetId,
      author: cells[0]?.metadata.author,
      description: 'Exported from POLLN',
      tags: []
    },

    // Checksums for verification
    checksums: cells.map(cell => ({
      cellId: cell.cellId,
      checksum: sha256(JSON.stringify(cell))
    }))
  };

  const json = JSON.stringify(pkg, null, 2);
  const compressed = gzip(json);
  const base64 = btoa(compressed);

  return new Blob([base64], { type: 'application/vnd.polln.package' });
}

/**
 * Export formats
 */
enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel',
  PACKAGE = 'package'
}

/**
 * Shareable package structure
 */
interface ShareablePackage {
  version: string;
  exportDate: number;
  cellCount: number;
  cells: CellPersistedState[];

  manifest: {
    spreadsheetId: string;
    author: string;
    description: string;
    tags: string[];
  };

  checksums: Array<{
    cellId: string;
    checksum: string;
  }>;
}
```

---

## Performance Optimization

### Lazy Loading Strategy

```typescript
/**
 * Lazy load cells based on visibility
 */
class CellLoader {
  private loadedCells: Set<string> = new Set();
  private loadingCells: Set<string> = new Set();

  /**
   * Load cells on demand
   */
  async loadCellIfNeeded(cellId: string): Promise<CellPersistedState | null> {
    // Check if already loaded
    if (this.loadedCells.has(cellId)) {
      return await this.loadFromCache(cellId);
    }

    // Check if currently loading
    if (this.loadingCells.has(cellId)) {
      // Wait for existing load
      return await this.waitForLoad(cellId);
    }

    // Mark as loading
    this.loadingCells.add(cellId);

    try {
      // Load from storage
      const cell = await this.loadFromStorage(cellId);

      // Cache it
      await this.cacheCell(cell);

      // Mark as loaded
      this.loadedCells.add(cellId);

      return cell;
    } finally {
      this.loadingCells.delete(cellId);
    }
  }

  /**
   * Preload visible cells
   */
  async preloadVisibleCells(): Promise<void> {
    // Get visible range
    const visible = await getVisibleRange();

    // Find cells in range
    const cellsInRange = await findCellsInRange(visible);

    // Preload in parallel
    await Promise.all(
      cellsInRange.map(cell => this.loadCellIfNeeded(cell.cellId))
    );
  }

  /**
   * Unload invisible cells
   */
  async unloadInvisibleCells(): Promise<void> {
    const visible = await getVisibleRange();
    const cellsInRange = await findCellsInRange(visible);
    const visibleIds = new Set(cellsInRange.map(c => c.cellId));

    // Unload cells not in range
    for (const cellId of this.loadedCells) {
      if (!visibleIds.has(cellId)) {
        await this.unloadCell(cellId);
      }
    }
  }

  private async loadFromCache(cellId: string): Promise<CellPersistedState> {
    return await indexedDB.get('cells', cellId);
  }

  private async cacheCell(cell: CellPersistedState): Promise<void> {
    await indexedDB.put('cells', cell);
  }

  private async unloadCell(cellId: string): Promise<void> {
    this.loadedCells.delete(cellId);
    // Keep in IndexedDB for faster reload
  }
}
```

### Incremental Sync

```typescript
/**
 * Incremental sync - only sync what changed
 */
class IncrementalSync {
  private lastSyncTimestamp: number = 0;
  private pendingChanges: Map<string, CellPersistedState> = new Map();

  /**
   * Track local changes
   */
  async trackChange(cell: CellPersistedState): Promise<void> {
    this.pendingChanges.set(cell.cellId, cell);
  }

  /**
   * Sync only changed cells
   */
  async syncChanges(): Promise<SyncResult> {
    const changes = Array.from(this.pendingChanges.values());

    if (changes.length === 0) {
      return { synced: 0, errors: [] };
    }

    // Batch sync
    const result = await this.batchSync(changes);

    // Update timestamp
    this.lastSyncTimestamp = Date.now();

    // Clear pending changes
    this.pendingChanges.clear();

    return result;
  }

  /**
   * Batch sync for efficiency
   */
  private async batchSync(
    changes: CellPersistedState[]
  ): Promise<SyncResult> {
    const synced: string[] = [];
    const errors: Array<{ cellId: string; error: string }> = [];

    // Sync in batches
    const batchSize = 50;
    for (let i = 0; i < changes.length; i += batchSize) {
      const batch = changes.slice(i, i + batchSize);

      try {
        // Sync batch to cloud
        await this.syncBatchToCloud(batch);
        synced.push(...batch.map(c => c.cellId));
      } catch (e) {
        // Sync individually on failure
        for (const cell of batch) {
          try {
            await this.syncSingle(cell);
            synced.push(cell.cellId);
          } catch (e2) {
            errors.push({ cellId: cell.cellId, error: e2.message });
          }
        }
      }
    }

    return { synced: synced.length, errors };
  }

  private async syncBatchToCloud(cells: CellPersistedState[]): Promise<void> {
    await fetch('/api/cells/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cells })
    });
  }

  private async syncSingle(cell: CellPersistedState): Promise<void> {
    await fetch(`/api/cells/${cell.cellId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cell)
    });
  }
}

interface SyncResult {
  synced: number;
  errors: Array<{ cellId: string; error: string }>;
}
```

### Compression Strategy

```typescript
/**
 * Compression for large cells
 */
class CellCompressor {
  /**
   * Compress cell state
   */
  async compress(cell: CellPersistedState): Promise<CompressedCell> {
    const json = JSON.stringify(cell);

    // Only compress if large enough
    if (json.length < 1024) {
      return {
        compressed: false,
        data: json,
        originalSize: json.length,
        compressedSize: json.length
      };
    }

    // Compress
    const compressed = gzip(json);

    return {
      compressed: true,
      data: btoa(compressed),
      originalSize: json.length,
      compressedSize: compressed.length,
      algorithm: 'gzip'
    };
  }

  /**
   * Decompress cell state
   */
  async decompress(compressed: CompressedCell): Promise<CellPersistedState> {
    if (!compressed.compressed) {
      return JSON.parse(compressed.data);
    }

    const base64 = atob(compressed.data);
    const decompressed = ungzip(base64);
    return JSON.parse(decompressed);
  }

  /**
   * Estimate compression ratio
   */
  estimateCompressionRatio(cell: CellPersistedState): number {
    const json = JSON.stringify(cell);

    // Patterns typically compress 70-90%
    const patternCount = cell.learningState.patterns.length;
    const weightCount = cell.learningState.weights.size;

    const estimate = json.length * (1 - (patternCount * 0.01 + weightCount * 0.005));

    return Math.max(estimate, json.length * 0.1); // At least 10% of original
  }
}

interface CompressedCell {
  compressed: boolean;
  data: string;
  originalSize: number;
  compressedSize: number;
  algorithm?: 'gzip' | 'brotli' | 'lzma';
}
```

### Caching Strategy

```typescript
/**
 * Multi-level caching
 */
class CellCache {
  private l1Cache: Map<string, CellPersistedState> = new Map();  // Memory
  private l2Cache: typeof indexedDB;                              // IndexedDB
  private l3Cache: typeof fetch;                                  // Cloud

  /**
   * Get cell with cache hierarchy
   */
  async get(cellId: string): Promise<CellPersistedState> {
    // L1: Memory cache (fastest)
    if (this.l1Cache.has(cellId)) {
      return this.l1Cache.get(cellId)!;
    }

    // L2: IndexedDB (fast)
    const l2Cell = await this.l2Cache.get('cells', cellId);
    if (l2Cell) {
      this.l1Cache.set(cellId, l2Cell);
      return l2Cell;
    }

    // L3: Cloud (slow)
    const l3Cell = await this.loadFromCloud(cellId);
    if (l3Cell) {
      // Promote through cache layers
      await this.l2Cache.put('cells', l3Cell);
      this.l1Cache.set(cellId, l3Cell);
      return l3Cell;
    }

    throw new Error(`Cell not found: ${cellId}`);
  }

  /**
   * Set cell in all cache layers
   */
  async set(cell: CellPersistedState): Promise<void> {
    // L1: Memory
    this.l1Cache.set(cell.cellId, cell);

    // L2: IndexedDB
    await this.l2Cache.put('cells', cell);

    // L3: Cloud (async, don't wait)
    this.saveToCloud(cell).catch(console.error);
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(cellId: string): Promise<void> {
    this.l1Cache.delete(cellId);
    await this.l2Cache.delete('cells', cellId);
    // Cloud cache invalidated via timestamp
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();
    await this.l2Cache.clear('cells');
  }

  /**
   * Evict least recently used from L1
   */
  private evictLRU(): void {
    const maxL1Size = 100;

    if (this.l1Cache.size > maxL1Size) {
      // Simple FIFO eviction (could be improved with true LRU)
      const firstKey = this.l1Cache.keys().next().value;
      this.l1Cache.delete(firstKey);
    }
  }
}
```

---

## Security Model

### Encryption at Rest

```typescript
/**
 * Encrypt cell data for storage
 */
class CellEncryption {
  private key: CryptoKey;

  constructor() {
    // Initialize encryption key from user credentials
    this.initializeKey();
  }

  /**
   * Encrypt sensitive cell data
   */
  async encrypt(cell: CellPersistedState): Promise<EncryptedCell> {
    // Determine what to encrypt
    const sensitive = this.extractSensitiveData(cell);

    if (Object.keys(sensitive).length === 0) {
      // Nothing to encrypt
      return {
        encrypted: false,
        data: cell
      };
    }

    // Encrypt sensitive data
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      this.key,
      new TextEncoder().encode(JSON.stringify(sensitive))
    );

    return {
      encrypted: true,
      data: this.removeSensitiveData(cell),
      encryptedData: {
        iv: btoa(String.fromCharCode(...iv)),
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
      }
    };
  }

  /**
   * Decrypt sensitive cell data
   */
  async decrypt(encrypted: EncryptedCell): Promise<CellPersistedState> {
    if (!encrypted.encrypted) {
      return encrypted.data as CellPersistedState;
    }

    // Decrypt sensitive data
    const iv = new Uint8Array(
      atob(encrypted.encryptedData!.iv)
        .split('')
        .map(c => c.charCodeAt(0))
    );

    const ciphertext = new Uint8Array(
      atob(encrypted.encryptedData!.ciphertext)
        .split('')
        .map(c => c.charCodeAt(0))
    );

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      this.key,
      ciphertext
    );

    const sensitive = JSON.parse(
      new TextDecoder().decode(decrypted)
    );

    // Merge back into cell
    return {
      ...encrypted.data,
      ...sensitive
    };
  }

  private extractSensitiveData(cell: CellPersistedState): Record<string, unknown> {
    const sensitive: Record<string, unknown> = {};

    // API keys (never sync!)
    if (cell.security.hasApiKeys) {
      sensitive.apiKeys = true;  // Just mark as present, don't store actual keys
    }

    // Sensitive learning data
    if (cell.security.sensitivity === 'sensitive') {
      sensitive.learningState = cell.learningState;
    }

    return sensitive;
  }

  private removeSensitiveData(cell: CellPersistedState): CellPersistedState {
    const sanitized = { ...cell };

    if (sanitized.security.hasApiKeys) {
      // Remove API keys
      // (They're stored separately in secure storage)
    }

    if (sanitized.security.sensitivity === 'sensitive') {
      // Clear learning state
      sanitized.learningState = {
        patterns: [],
        weights: new Map(),
        valueFunction: 0,
        successCount: 0,
        failureCount: 0,
        lastTrained: 0
      };
    }

    return sanitized;
  }

  private async initializeKey(): Promise<void> {
    // Derive key from user credentials
    const credentials = await getUserCredentials();

    this.key = await crypto.subtle.importKey(
      'raw',
      credentials,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}

interface EncryptedCell {
  encrypted: boolean;
  data: CellPersistedState | Partial<CellPersistedState>;
  encryptedData?: {
    iv: string;
    ciphertext: string;
  };
}
```

### Encryption in Transit

```typescript
/**
 * Secure communication with cloud
 */
class SecureCloudSync {
  private async encryptRequest(data: unknown): Promise<string> {
    // Use TLS 1.3
    const json = JSON.stringify(data);
    const compressed = gzip(json);

    // Additional encryption layer on top of TLS
    const encrypted = await this.encryptWithPublicKey(compressed);

    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }

  private async decryptResponse(response: string): Promise<unknown> {
    const encrypted = atob(response);
    const decrypted = await this.decryptWithPrivateKey(encrypted);
    const decompressed = ungzip(decrypted);

    return JSON.parse(decompressed);
  }

  async syncToCloud(cell: CellPersistedState): Promise<void> {
    const encrypted = await this.encryptRequest(cell);

    await fetch('/api/cells', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'aes-gcm'
      },
      body: encrypted
    });
  }
}
```

### API Key Handling

```typescript
/**
 * Secure API key storage
 */
class ApiKeyManager {
  private static readonly STORAGE_PREFIX = 'polln_apikey_';

  /**
   * Store API key securely
   */
  async storeApiKey(service: string, key: string): Promise<void> {
    // Use platform secure storage
    if (isExcel()) {
      // Use Windows Credential Manager or macOS Keychain
      await storeInCredentialManager(
        ApiKeyManager.STORAGE_PREFIX + service,
        key
      );
    } else if (isGoogleSheets()) {
      // Use Google Secret Manager (via Apps Script)
      await storeInGoogleSecretManager(service, key);
    } else {
      // Fallback to encrypted localStorage
      const encrypted = await this.encryptForStorage(key);
      localStorage.setItem(ApiKeyManager.STORAGE_PREFIX + service, encrypted);
    }

    // Mark cell as having API keys (but don't store them)
    await this.markCellHasApiKeys(service);
  }

  /**
   * Retrieve API key
   */
  async getApiKey(service: string): Promise<string | null> {
    if (isExcel()) {
      return await getFromCredentialManager(
        ApiKeyManager.STORAGE_PREFIX + service
      );
    } else if (isGoogleSheets()) {
      return await getFromGoogleSecretManager(service);
    } else {
      const encrypted = localStorage.getItem(
        ApiKeyManager.STORAGE_PREFIX + service
      );

      if (!encrypted) return null;

      return await this.decryptFromStorage(encrypted);
    }
  }

  /**
   * Delete API key
   */
  async deleteApiKey(service: string): Promise<void> {
    if (isExcel()) {
      await deleteFromCredentialManager(
        ApiKeyManager.STORAGE_PREFIX + service
      );
    } else if (isGoogleSheets()) {
      await deleteFromGoogleSecretManager(service);
    } else {
      localStorage.removeItem(ApiKeyManager.STORAGE_PREFIX + service);
    }
  }

  /**
   * Check if cell uses API keys
   */
  async cellHasApiKeys(cellId: string): Promise<boolean> {
    const cell = await loadCell(cellId);
    return cell.security.hasApiKeys;
  }

  private async markCellHasApiKeys(service: string): Promise<void> {
    // Store reference in cell metadata
    // (Actual key stored separately)
  }

  private async encryptForStorage(data: string): Promise<string> {
    // Use Web Crypto API
    const key = await this.getStorageKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(data)
    );

    return JSON.stringify({
      iv: btoa(String.fromCharCode(...iv)),
      data: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
    });
  }

  private async decryptFromStorage(encrypted: string): Promise<string> {
    const { iv, data } = JSON.parse(encrypted);
    const key = await this.getStorageKey();

    const ivBytes = new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0)));
    const dataBytes = new Uint8Array(atob(data).split('').map(c => c.charCodeAt(0)));

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      dataBytes
    );

    return new TextDecoder().decode(decrypted);
  }

  private async getStorageKey(): Promise<CryptoKey> {
    // Derive key from user session
    const sessionKey = await getSessionKey();

    return await crypto.subtle.importKey(
      'raw',
      sessionKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}
```

### Sensitive Data Handling

```typescript
/**
 * Sensitive data detection and handling
 */
class SensitiveDataHandler {
  /**
   * Detect sensitive data in cell
   */
  async detectSensitiveData(cell: CellPersistedState): Promise<SensitiveDataReport> {
    const report: SensitiveDataReport = {
      cellId: cell.cellId,
      hasSensitiveData: false,
      categories: [],
      recommendations: []
    };

    // Check for API keys
    if (cell.security.hasApiKeys) {
      report.hasSensitiveData = true;
      report.categories.push('api_keys');
      report.recommendations.push('Store API keys in secure storage, not in cell');
    }

    // Check learning state for sensitive patterns
    const sensitivePatterns = this.detectSensitivePatterns(cell);
    if (sensitivePatterns.length > 0) {
      report.hasSensitiveData = true;
      report.categories.push('sensitive_patterns');
      report.recommendations.push('Review learning patterns for sensitive data');
    }

    // Check dependencies for sensitive inputs
    const sensitiveInputs = await this.checkDependencies(cell);
    if (sensitiveInputs.length > 0) {
      report.hasSensitiveData = true;
      report.categories.push('sensitive_inputs');
      report.recommendations.push('Review input cells for sensitive data');
    }

    // Update cell security level
    if (report.hasSensitiveData) {
      cell.security.sensitivity = 'sensitive';
    }

    return report;
  }

  /**
   * Sanitize cell for export/sharing
   */
  async sanitizeForExport(cell: CellPersistedState): Promise<CellPersistedState> {
    const sanitized = JSON.parse(JSON.stringify(cell));

    // Remove API keys
    delete (sanitized as any).apiKeys;

    // Clear sensitive learning data
    if (sanitized.security.sensitivity === 'sensitive') {
      sanitized.learningState = {
        patterns: [],
        weights: new Map(),
        valueFunction: 0,
        successCount: 0,
        failureCount: 0,
        lastTrained: 0
      };
    }

    // Mark as sanitized
    sanitized.security.sensitivity = 'public';

    return sanitized;
  }

  private detectSensitivePatterns(cell: CellPersistedState): string[] {
    const sensitive: string[] = [];

    for (const pattern of cell.learningState.patterns) {
      // Check for PII patterns
      if (this.looksLikePII(pattern.inputHash)) {
        sensitive.push(pattern.id);
      }

      // Check for credential patterns
      if (this.looksLikeCredential(pattern.inputHash)) {
        sensitive.push(pattern.id);
      }
    }

    return sensitive;
  }

  private async checkDependencies(cell: CellPersistedState): Promise<string[]> {
    const sensitive: string[] = [];

    for (const inputCellId of cell.dependencies.inputCells) {
      const inputCell = await loadCell(inputCellId);

      if (inputCell.security.sensitivity !== 'public') {
        sensitive.push(inputCellId);
      }
    }

    return sensitive;
  }

  private looksLikePII(hash: string): boolean {
    // Heuristic check for PII
    const piiPatterns = [
      /\d{3}-\d{2}-\d{4}/,  // SSN
      /\d{16}/,              // Credit card
      /@.*\./                // Email
    ];

    return piiPatterns.some(pattern => pattern.test(hash));
  }

  private looksLikeCredential(hash: string): boolean {
    // Heuristic check for credentials
    const credentialPatterns = [
      /Bearer .+/,
      /sk-.+/,
      /api[_-]?key/i
    ];

    return credentialPatterns.some(pattern => pattern.test(hash));
  }
}

interface SensitiveDataReport {
  cellId: string;
  hasSensitiveData: boolean;
  categories: string[];
  recommendations: string[];
}
```

---

## API Reference

### Core Persistence API

```typescript
/**
 * Load cell from storage
 */
async function loadCell(cellId: string): Promise<CellPersistedState> {
  // Try cache first
  const cached = await cache.get(cellId);
  if (cached) return cached;

  // Load from spreadsheet
  const cell = await loadCellFromSpreadsheet(cellId);

  // Cache it
  await cache.set(cell);

  return cell;
}

/**
 * Save cell to storage
 */
async function saveCell(cell: CellPersistedState): Promise<void> {
  // Update version
  cell.metadata.version++;
  cell.metadata.updatedAt = Date.now();

  // Save to spreadsheet
  await saveCellToSpreadsheet(cell);

  // Cache it
  await cache.set(cell);

  // Track for sync
  await sync.trackChange(cell);

  // Create version snapshot
  await versionStore.storeVersion({
    cellId: cell.cellId,
    version: cell.metadata.version,
    timestamp: Date.now(),
    author: cell.metadata.author,
    changes: cell,
    reason: VersionChangeReason.USER_EDIT,
    size: JSON.stringify(cell).length,
    checksum: sha256(JSON.stringify(cell))
  });
}

/**
 * Delete cell
 */
async function deleteCell(cellId: string): Promise<void> {
  // Load current state for version history
  const cell = await loadCell(cellId);

  // Mark as deleted
  cell.metadata.deleted = true;
  cell.metadata.deletedAt = Date.now();

  // Save deletion version
  await versionStore.storeVersion({
    cellId,
    version: cell.metadata.version + 1,
    timestamp: Date.now(),
    author: getCurrentUser(),
    changes: cell,
    reason: VersionChangeReason.USER_EDIT,
    explanation: 'Cell deleted',
    size: 0,
    checksum: ''
  });

  // Remove from spreadsheet
  await deleteCellFromSpreadsheet(cellId);

  // Clear cache
  await cache.invalidate(cellId);
}

/**
 * Find cells by location
 */
async function findCellsInRange(
  range: Range
): Promise<CellPersistedState[]> {
  const allCells = await loadAllCells(getCurrentSpreadsheetId());

  return allCells.filter(cell => {
    const cellRef = `${cell.location.sheet}!${cell.location.row}:${cell.location.col}`;
    return isInRange(cellRef, range);
  });
}
```

### Sync API

```typescript
/**
 * Sync to cloud
 */
async function syncToCloud(cellId?: string): Promise<SyncResult> {
  if (cellId) {
    // Sync single cell
    const cell = await loadCell(cellId);
    await cloudSync.syncCell(cell);
    return { synced: 1, errors: [] };
  } else {
    // Sync all changes
    return await sync.syncChanges();
  }
}

/**
 * Sync from cloud
 */
async function syncFromCloud(since?: number): Promise<SyncDelta> {
  const sinceVersion = since || await getLastSyncVersion();

  const delta = await cloudSync.getChangesSince(
    getCurrentSpreadsheetId(),
    sinceVersion
  );

  await sync.applyDelta(delta);

  return delta;
}

/**
 * Enable/disable auto-sync
 */
async function setAutoSync(enabled: boolean): Promise<void> {
  if (enabled) {
    // Start auto-sync interval
    setInterval(async () => {
      await syncToCloud();
    }, 5 * 60 * 1000);  // 5 minutes
  } else {
    // Stop auto-sync
    // (Implementation depends on sync framework)
  }
}
```

### Version API

```typescript
/**
 * Get version history
 */
async function getVersionHistory(cellId: string): Promise<CellVersion[]> {
  return await versionStore.getHistory(cellId);
}

/**
 * Restore version
 */
async function restoreVersion(cellId: string, version: number): Promise<void> {
  const cell = await versionStore.restoreVersion(cellId, version);
  await saveCell(cell);
}

/**
 * Compare versions
 */
async function compareVersions(
  cellId: string,
  versionA: number,
  versionB: number
): Promise<VersionDiff> {
  return await versionStore.compareVersions(cellId, versionA, versionB);
}
```

### Template API

```typescript
/**
 * Export cell as template
 */
async function exportAsTemplate(
  cellId: string,
  metadata: Partial<CellTemplate['template']>
): Promise<CellTemplate> {
  const cell = await loadCell(cellId);
  return await exportCellAsTemplate(cell, metadata);
}

/**
 * Import template
 */
async function importTemplate(
  template: CellTemplate,
  location: { sheet: string; row: number; col: number }
): Promise<string> {
  return await importTemplate(template, location);
}

/**
 * Search marketplace
 */
async function searchMarketplace(
  query: string,
  category?: string
): Promise<TemplateListing[]> {
  return await searchTemplates(query, category);
}

/**
 * Download from marketplace
 */
async function downloadTemplate(templateId: string): Promise<CellTemplate> {
  return await downloadTemplate(templateId);
}

/**
 * Upload to marketplace
 */
async function uploadToMarketplace(template: CellTemplate): Promise<void> {
  await uploadTemplate(template);
}
```

---

## Appendix: Usage Scenarios

### Scenario 1: Offline Work Flow

```
Monday (Online):
- User opens spreadsheet
- Creates new agent cell
- Works on it all day
- Changes auto-sync to cloud

Tuesday (Offline):
- User opens spreadsheet (no internet)
- Continues working on agent cell
- System saves locally (IndexedDB)
- Queues changes for sync

Wednesday (Online):
- User opens spreadsheet
- System detects online status
- Auto-syncs queued changes
- No data lost!
```

### Scenario 2: Multi-Device Conflict

```
Device A (Desktop):
- User edits cell formula
- Syncs to cloud
- Version 5 created

Device B (Laptop - offline):
- User had edited same cell earlier
- Created version 6 offline
- Now comes online

Conflict Resolution:
- System detects conflict (both have version 6)
- Shows diff to user
- User selects semantic merge
- System creates version 7 (merged)
- Both devices sync version 7
```

### Scenario 3: Template Sharing

```
User A (Expert):
- Creates powerful analysis agent
- Tests it thoroughly
- Exports as template
- Uploads to marketplace
- License: MIT

User B (Beginner):
- Browses marketplace
- Finds analysis template
- Imports to spreadsheet
- Template works!
- Rates template 5 stars
- User A gets credit
```

---

## Conclusion

This specification provides a comprehensive framework for cell persistence, synchronization, versioning, and sharing in spreadsheet-based POLLN systems. The design ensures:

- **Reliability**: Data is never lost, even offline
- **Performance**: Fast loading with smart caching
- **Security**: Encryption at rest and in transit
- **Flexibility**: Multiple export formats and platforms
- **Collaboration**: Conflict resolution and sharing
- **Transparency**: Full version history with rollback

**Implementation Priority**:
1. Core storage (Excel Custom XML Parts)
2. Local caching (IndexedDB)
3. Version history
4. Cloud sync (Firebase)
5. Template system
6. Google Sheets support

**Next Steps**: Begin implementation of MVP features.

---

**Document Version**: 1.0
**Last Updated**: 2026-03-08
**Author**: Cell Persistence Engineer
**Status**: ✅ Complete - Ready for Implementation
