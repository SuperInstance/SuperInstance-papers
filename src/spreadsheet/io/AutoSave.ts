/**
 * POLLN AutoSave System
 *
 * Provides automatic saving functionality with localStorage compression,
 * debounced saves, dirty tracking, conflict resolution, and crash recovery.
 *
 * @module io
 */

import type { LogCell } from '../core/LogCell.js';
import type { CellId } from '../core/types.js';

/**
 * Save status
 */
export enum SaveStatus {
  IDLE = 'idle',
  DIRTY = 'dirty',
  SAVING = 'saving',
  SAVED = 'saved',
  ERROR = 'error',
}

/**
 * Storage location
 */
export enum StorageLocation {
  LOCAL_STORAGE = 'localStorage',
  SESSION_STORAGE = 'sessionStorage',
  INDEXED_DB = 'indexedDB',
  REMOTE = 'remote',
}

/**
 * Network status
 */
export enum NetworkStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

/**
 * Save snapshot
 */
export interface SaveSnapshot {
  id: string;
  timestamp: number;
  cellCount: number;
  compressedSize: number;
  uncompressedSize: number;
  hash: string;
  metadata: {
    version: string;
    userAgent: string;
    url: string;
  };
}

/**
 * Save result
 */
export interface SaveResult {
  success: boolean;
  status: SaveStatus;
  timestamp: number;
  duration: number;
  size: number;
  compressedSize?: number;
  compressionRatio?: number;
  error?: string;
}

/**
 * Conflict resolution
 */
export enum ConflictResolution {
  KEEP_LOCAL = 'keep_local',
  KEEP_REMOTE = 'keep_remote',
  MERGE = 'merge',
  MANUAL = 'manual',
}

/**
 * Save conflict
 */
export interface SaveConflict {
  localSnapshot: SaveSnapshot;
  remoteSnapshot: SaveSnapshot;
  conflicts: Array<{
    cellId: CellId;
    localValue: any;
    remoteValue: any;
    timestamp: number;
  }>;
}

/**
 * AutoSave configuration
 */
export interface AutoSaveConfig {
  /**
   * Enable/disable auto-save
   */
  enabled?: boolean;

  /**
   * Debounce delay in milliseconds
   */
  debounceDelay?: number;

  /**
   * Storage location
   */
  storageLocation?: StorageLocation;

  /**
   * Enable compression
   */
  compressionEnabled?: boolean;

  /**
   * Compression level (0-9)
   */
  compressionLevel?: number;

  /**
   * Maximum storage size in bytes
   */
  maxStorageSize?: number;

  /**
   * Maximum snapshots to keep
   */
  maxSnapshots?: number;

  /**
   * Snapshot interval in milliseconds
   */
  snapshotInterval?: number;

  /**
   * Conflict resolution strategy
   */
  conflictResolution?: ConflictResolution;

  /**
   * Save key prefix
   */
  saveKeyPrefix?: string;

  /**
   * Enable remote sync
   */
  enableRemoteSync?: boolean;

  /**
   * Remote sync endpoint
   */
  remoteSyncEndpoint?: string;

  /**
   * Enable crash recovery
   */
  enableCrashRecovery?: boolean;

  /**
   * Cleanup old snapshots on save
   */
  cleanupOldSnapshots?: boolean;

  /**
   * Validate data before save
   */
  validateBeforeSave?: boolean;
}

/**
 * Save event handler
 */
export type SaveEventHandler = (result: SaveResult) => void;

/**
 * Conflict handler
 */
export type ConflictHandler = (
  conflict: SaveConflict
) => Promise<ConflictResolution>;

/**
 * AutoSave statistics
 */
export interface AutoSaveStatistics {
  totalSaves: number;
  successfulSaves: number;
  failedSaves: number;
  totalDataSaved: number;
  totalDataCompressed: number;
  averageSaveDuration: number;
  lastSaveTime: number;
  lastSaveSize: number;
  dirtyCellCount: number;
  status: SaveStatus;
}

/**
 * POLLN AutoSave System
 *
 * Manages automatic saving of cell state with compression,
 * dirty tracking, conflict resolution, and crash recovery.
 */
export class AutoSave {
  private config: Required<AutoSaveConfig>;
  private cells: Map<CellId, LogCell> = new Map();
  private dirtyCells: Set<CellId> = new Set();
  private status: SaveStatus = SaveStatus.IDLE;
  private debounceTimer: NodeJS.Timeout | null = null;
  private snapshotTimer: NodeJS.Timeout | null = null;
  private networkStatus: NetworkStatus = NetworkStatus.ONLINE;
  private saveHistory: SaveSnapshot[] = [];
  private listeners: Set<SaveEventHandler> = new Set();
  private conflictHandler?: ConflictHandler;
  private indexedDB?: IDBDatabase;
  private lastSaveTime: number = 0;
  private totalSaves: number = 0;
  private successfulSaves: number = 0;
  private failedSaves: number = 0;
  private totalDataSaved: number = 0;
  private totalDataCompressed: number = 0;
  private saveDurations: number[] = [];

  /**
   * Default configuration
   */
  private static readonly DEFAULT_CONFIG: Required<AutoSaveConfig> = {
    enabled: true,
    debounceDelay: 1000,
    storageLocation: StorageLocation.LOCAL_STORAGE,
    compressionEnabled: true,
    compressionLevel: 6,
    maxStorageSize: 50 * 1024 * 1024, // 50MB
    maxSnapshots: 10,
    snapshotInterval: 60000, // 1 minute
    conflictResolution: ConflictResolution.KEEP_LOCAL,
    saveKeyPrefix: 'polln_autosave',
    enableRemoteSync: false,
    remoteSyncEndpoint: '',
    enableCrashRecovery: true,
    cleanupOldSnapshots: true,
    validateBeforeSave: true,
  };

  constructor(cells: LogCell[], config?: AutoSaveConfig) {
    this.config = {
      ...AutoSave.DEFAULT_CONFIG,
      ...config,
    };

    // Initialize cells
    for (const cell of cells) {
      this.cells.set(cell.id, cell);
    }

    // Initialize storage
    this.initializeStorage();

    // Setup network monitoring
    this.setupNetworkMonitoring();

    // Setup crash recovery
    if (this.config.enableCrashRecovery) {
      this.setupCrashRecovery();
    }

    // Start snapshot timer
    if (this.config.snapshotInterval > 0) {
      this.startSnapshotTimer();
    }
  }

  /**
   * Register a cell with auto-save
   *
   * @param cell - Cell to register
   */
  public registerCell(cell: LogCell): void {
    this.cells.set(cell.id, cell);

    // Watch for changes (if cell supports event registration)
    const cellWithEvents = cell as any;
    if (typeof cellWithEvents.on === 'function') {
      try {
        cellWithEvents.on('change', () => this.markDirty(cell.id));
      } catch (error) {
        // Cell doesn't support event registration, that's okay
      }
    }
  }

  /**
   * Unregister a cell from auto-save
   *
   * @param cellId - ID of cell to unregister
   */
  public unregisterCell(cellId: CellId): void {
    this.cells.delete(cellId);
    this.dirtyCells.delete(cellId);
  }

  /**
   * Mark a cell as dirty (changed)
   *
   * @param cellId - ID of cell to mark as dirty
   */
  public markDirty(cellId: CellId): void {
    if (!this.config.enabled) {
      return;
    }

    this.dirtyCells.add(cellId);
    this.status = SaveStatus.DIRTY;

    // Debounce save
    this.scheduleSave();
  }

  /**
   * Mark multiple cells as dirty
   *
   * @param cellIds - Array of cell IDs to mark as dirty
   */
  public markDirtyBatch(cellIds: CellId[]): void {
    for (const cellId of cellIds) {
      this.dirtyCells.add(cellId);
    }
    this.status = SaveStatus.DIRTY;
    this.scheduleSave();
  }

  /**
   * Force an immediate save
   *
   * @returns Save result
   */
  public async forceSave(): Promise<SaveResult> {
    // Cancel any pending debounced save
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    return this.performSave();
  }

  /**
   * Get current save status
   *
   * @returns Current save status
   */
  public getStatus(): SaveStatus {
    return this.status;
  }

  /**
   * Get save statistics
   *
   * @returns Auto-save statistics
   */
  public getStatistics(): AutoSaveStatistics {
    return {
      totalSaves: this.totalSaves,
      successfulSaves: this.successfulSaves,
      failedSaves: this.failedSaves,
      totalDataSaved: this.totalDataSaved,
      totalDataCompressed: this.totalDataCompressed,
      averageSaveDuration:
        this.saveDurations.length > 0
          ? this.saveDurations.reduce((a, b) => a + b, 0) / this.saveDurations.length
          : 0,
      lastSaveTime: this.lastSaveTime,
      lastSaveSize: this.saveHistory.length > 0 ? this.saveHistory[this.saveHistory.length - 1].uncompressedSize : 0,
      dirtyCellCount: this.dirtyCells.size,
      status: this.status,
    };
  }

  /**
   * Get save history
   *
   * @returns Array of save snapshots
   */
  public getSaveHistory(): SaveSnapshot[] {
    return [...this.saveHistory];
  }

  /**
   * Restore from a specific snapshot
   *
   * @param snapshotId - ID of snapshot to restore
   * @returns True if restore was successful
   */
  public async restoreFromSnapshot(snapshotId: string): Promise<boolean> {
    const snapshot = this.saveHistory.find(s => s.id === snapshotId);
    if (!snapshot) {
      return false;
    }

    try {
      const data = await this.loadSnapshotData(snapshotId);
      if (data) {
        await this.applySnapshotData(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to restore snapshot:', error);
      return false;
    }
  }

  /**
   * Clear all saved data
   *
   * @returns True if clear was successful
   */
  public async clearSavedData(): Promise<boolean> {
    try {
      // Clear localStorage
      if (this.config.storageLocation === StorageLocation.LOCAL_STORAGE) {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith(this.config.saveKeyPrefix)) {
            localStorage.removeItem(key);
          }
        }
      }

      // Clear sessionStorage
      if (this.config.storageLocation === StorageLocation.SESSION_STORAGE) {
        const keys = Object.keys(sessionStorage);
        for (const key of keys) {
          if (key.startsWith(this.config.saveKeyPrefix)) {
            sessionStorage.removeItem(key);
          }
        }
      }

      // Clear IndexedDB
      if (this.config.storageLocation === StorageLocation.INDEXED_DB && this.indexedDB) {
        const transaction = this.indexedDB.transaction(['snapshots'], 'readwrite');
        const store = transaction.objectStore('snapshots');
        await store.clear();
      }

      // Clear history
      this.saveHistory = [];

      return true;
    } catch (error) {
      console.error('Failed to clear saved data:', error);
      return false;
    }
  }

  /**
   * Register event listener
   *
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  public onSaveEvent(handler: SaveEventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  /**
   * Set conflict handler
   *
   * @param handler - Conflict handler function
   */
  public setConflictHandler(handler: ConflictHandler): void {
    this.conflictHandler = handler;
  }

  /**
   * Update configuration
   *
   * @param updates - Partial configuration updates
   */
  public updateConfig(updates: Partial<AutoSaveConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };

    // Restart snapshot timer if interval changed
    if (updates.snapshotInterval !== undefined) {
      if (this.snapshotTimer) {
        clearInterval(this.snapshotTimer);
      }
      if (this.config.snapshotInterval > 0) {
        this.startSnapshotTimer();
      }
    }
  }

  /**
   * Enable auto-save
   */
  public enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable auto-save
   */
  public disable(): void {
    this.config.enabled = false;

    // Cancel any pending saves
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Destroy auto-save system
   */
  public async destroy(): Promise<void> {
    // Cancel timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
    }

    // Close IndexedDB
    if (this.indexedDB) {
      this.indexedDB.close();
    }

    // Clear listeners
    this.listeners.clear();

    // Final save
    if (this.dirtyCells.size > 0) {
      await this.forceSave();
    }
  }

  /**
   * Schedule a debounced save
   */
  private scheduleSave(): void {
    if (!this.config.enabled) {
      return;
    }

    // Cancel existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Schedule new save
    this.debounceTimer = setTimeout(() => {
      this.performSave();
    }, this.config.debounceDelay);
  }

  /**
   * Perform the actual save operation
   */
  private async performSave(): Promise<SaveResult> {
    if (!this.config.enabled || this.dirtyCells.size === 0) {
      return {
        success: true,
        status: SaveStatus.IDLE,
        timestamp: Date.now(),
        duration: 0,
        size: 0,
      };
    }

    this.status = SaveStatus.SAVING;
    const startTime = Date.now();

    try {
      // Validate if enabled
      if (this.config.validateBeforeSave) {
        await this.validateData();
      }

      // Serialize cells
      const data = await this.serializeCells();

      // Compress if enabled
      let compressedData = data;
      let compressionRatio = 0;

      if (this.config.compressionEnabled) {
        const compressed = await this.compressData(data);
        compressedData = compressed.data;
        compressionRatio = compressed.ratio;
      }

      // Check storage quota
      await this.checkStorageQuota(compressedData.length);

      // Save to storage
      await this.saveToStorage(compressedData);

      // Create snapshot
      const snapshot: SaveSnapshot = {
        id: this.generateSnapshotId(),
        timestamp: Date.now(),
        cellCount: this.cells.size,
        compressedSize: compressedData.length,
        uncompressedSize: data.length,
        hash: await this.calculateHash(data),
        metadata: {
          version: '1.0.0',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          url: typeof window !== 'undefined' ? window.location.href : '',
        },
      };

      // Add to history
      this.saveHistory.push(snapshot);

      // Cleanup old snapshots if enabled
      if (this.config.cleanupOldSnapshots) {
        await this.cleanupOldSnapshots();
      }

      // Sync to remote if enabled
      if (this.config.enableRemoteSync && this.networkStatus === NetworkStatus.ONLINE) {
        await this.syncToRemote(snapshot);
      }

      // Mark cells as clean
      this.dirtyCells.clear();
      this.status = SaveStatus.SAVED;
      this.lastSaveTime = Date.now();

      // Update statistics
      this.totalSaves++;
      this.successfulSaves++;
      this.totalDataSaved += data.length;
      this.totalDataCompressed += compressedData.length;
      const duration = Date.now() - startTime;
      this.saveDurations.push(duration);
      if (this.saveDurations.length > 100) {
        this.saveDurations.shift();
      }

      const result: SaveResult = {
        success: true,
        status: SaveStatus.SAVED,
        timestamp: this.lastSaveTime,
        duration,
        size: data.length,
        compressedSize: compressedData.length,
        compressionRatio,
      };

      // Notify listeners
      this.notifyListeners(result);

      return result;
    } catch (error) {
      this.status = SaveStatus.ERROR;
      this.totalSaves++;
      this.failedSaves++;

      const result: SaveResult = {
        success: false,
        status: SaveStatus.ERROR,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        size: 0,
        error: error instanceof Error ? error.message : String(error),
      };

      // Notify listeners
      this.notifyListeners(result);

      return result;
    }
  }

  /**
   * Serialize cells to JSON
   */
  private async serializeCells(): Promise<string> {
    const cellData: any[] = [];

    for (const cell of Array.from(this.cells.values())) {
      try {
        const json = cell.toJSON();
        cellData.push(json);
      } catch (error) {
        console.error(`Failed to serialize cell ${cell.id}:`, error);
      }
    }

    return JSON.stringify({
      version: '1.0.0',
      timestamp: Date.now(),
      cells: cellData,
    });
  }

  /**
   * Compress data using compression algorithm
   */
  private async compressData(
    data: string
  ): Promise<{ data: string; ratio: number }> {
    // Simple compression using JSON stringification optimization
    // In production, use a proper compression library like pako or lz-string

    const uncompressed = data.length;

    // Remove unnecessary whitespace
    let compressed = JSON.stringify(JSON.parse(data));

    // Simple character encoding for repeated patterns
    const patterns = [
      { pattern: /"id":/g, replacement: '"i":' },
      { pattern: /"type":/g, replacement: '"t":' },
      { pattern: /"state":/g, replacement: '"s":' },
      { pattern: /"position":/g, replacement: '"p":' },
      { pattern: /"row":/g, replacement: '"r":' },
      { pattern: /"col":/g, replacement: '"c":' },
    ];

    for (const { pattern, replacement } of patterns) {
      compressed = compressed.replace(pattern, replacement);
    }

    const ratio = uncompressed > 0 ? compressed.length / uncompressed : 1;

    return {
      data: compressed,
      ratio,
    };
  }

  /**
   * Check storage quota
   */
  private async checkStorageQuota(size: number): Promise<void> {
    if (this.config.storageLocation === StorageLocation.LOCAL_STORAGE) {
      const totalSize = this.calculateLocalStorageSize();
      if (totalSize + size > this.config.maxStorageSize) {
        throw new Error('Storage quota exceeded');
      }
    }
  }

  /**
   * Calculate current localStorage usage
   */
  private calculateLocalStorageSize(): number {
    let total = 0;

    if (typeof localStorage !== 'undefined') {
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
    }

    return total;
  }

  /**
   * Save data to storage
   */
  private async saveToStorage(data: string): Promise<void> {
    const key = `${this.config.saveKeyPrefix}_current`;

    switch (this.config.storageLocation) {
      case StorageLocation.LOCAL_STORAGE:
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, data);
        }
        break;

      case StorageLocation.SESSION_STORAGE:
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(key, data);
        }
        break;

      case StorageLocation.INDEXED_DB:
        await this.saveToIndexedDB(key, data);
        break;

      case StorageLocation.REMOTE:
        await this.saveToRemote(data);
        break;
    }
  }

  /**
   * Save to IndexedDB
   */
  private async saveToIndexedDB(key: string, data: string): Promise<void> {
    if (!this.indexedDB) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB!.transaction(['snapshots'], 'readwrite');
      const store = transaction.objectStore('snapshots');

      const request = store.put({
        key,
        data,
        timestamp: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save to remote endpoint
   */
  private async saveToRemote(data: string): Promise<void> {
    if (!this.config.remoteSyncEndpoint) {
      return;
    }

    try {
      const response = await fetch(this.config.remoteSyncEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data,
      });

      if (!response.ok) {
        throw new Error(`Remote sync failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Remote save error:', error);
      throw error;
    }
  }

  /**
   * Sync snapshot to remote
   */
  private async syncToRemote(snapshot: SaveSnapshot): Promise<void> {
    if (!this.config.remoteSyncEndpoint) {
      return;
    }

    // Implement remote sync logic
    // This would typically involve checking for conflicts and merging
  }

  /**
   * Load snapshot data
   */
  private async loadSnapshotData(snapshotId: string): Promise<any> {
    const key = `${this.config.saveKeyPrefix}_${snapshotId}`;

    switch (this.config.storageLocation) {
      case StorageLocation.LOCAL_STORAGE:
        if (typeof localStorage !== 'undefined') {
          const data = localStorage.getItem(key);
          return data ? JSON.parse(data) : null;
        }
        break;

      case StorageLocation.SESSION_STORAGE:
        if (typeof sessionStorage !== 'undefined') {
          const data = sessionStorage.getItem(key);
          return data ? JSON.parse(data) : null;
        }
        break;

      case StorageLocation.INDEXED_DB:
        return this.loadFromIndexedDB(key);
    }

    return null;
  }

  /**
   * Load from IndexedDB
   */
  private async loadFromIndexedDB(key: string): Promise<any> {
    if (!this.indexedDB) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB!.transaction(['snapshots'], 'readonly');
      const store = transaction.objectStore('snapshots');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? JSON.parse(result.data) : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Apply snapshot data to cells
   */
  private async applySnapshotData(data: any): Promise<void> {
    if (!data.cells) {
      return;
    }

    // Apply cell data
    for (const cellData of data.cells) {
      const cell = this.cells.get(cellData.id);
      if (cell) {
        const cellWithRestore = cell as any;
        if (typeof cellWithRestore.fromJSON === 'function') {
          try {
            cellWithRestore.fromJSON(cellData);
          } catch (error) {
            console.error(`Failed to restore cell ${cellData.id}:`, error);
          }
        }
      }
    }
  }

  /**
   * Cleanup old snapshots
   */
  private async cleanupOldSnapshots(): Promise<void> {
    while (this.saveHistory.length > this.config.maxSnapshots) {
      const oldSnapshot = this.saveHistory.shift();
      if (oldSnapshot) {
        await this.deleteSnapshot(oldSnapshot.id);
      }
    }
  }

  /**
   * Delete a specific snapshot
   */
  private async deleteSnapshot(snapshotId: string): Promise<void> {
    const key = `${this.config.saveKeyPrefix}_${snapshotId}`;

    switch (this.config.storageLocation) {
      case StorageLocation.LOCAL_STORAGE:
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
        break;

      case StorageLocation.SESSION_STORAGE:
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(key);
        }
        break;

      case StorageLocation.INDEXED_DB:
        if (this.indexedDB) {
          const transaction = this.indexedDB.transaction(['snapshots'], 'readwrite');
          const store = transaction.objectStore('snapshots');
          store.delete(key);
        }
        break;
    }
  }

  /**
   * Initialize storage system
   */
  private async initializeStorage(): Promise<void> {
    if (this.config.storageLocation === StorageLocation.INDEXED_DB) {
      await this.initializeIndexedDB();
    }

    // Check for crash recovery
    if (this.config.enableCrashRecovery) {
      await this.checkForCrashRecovery();
    }
  }

  /**
   * Initialize IndexedDB
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('polln_autosave', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.indexedDB = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.networkStatus = NetworkStatus.ONLINE;
        // Sync any pending data
        if (this.config.enableRemoteSync) {
          this.syncPendingData();
        }
      });

      window.addEventListener('offline', () => {
        this.networkStatus = NetworkStatus.OFFLINE;
      });
    }
  }

  /**
   * Setup crash recovery
   */
  private setupCrashRecovery(): void {
    if (typeof window !== 'undefined') {
      // Mark as healthy on page load
      sessionStorage.setItem(`${this.config.saveKeyPrefix}_healthy`, 'true');

      // Mark as healthy periodically
      setInterval(() => {
        sessionStorage.setItem(`${this.config.saveKeyPrefix}_healthy`, 'true');
      }, 5000);

      // Check for crash on page load
      window.addEventListener('load', () => {
        this.checkForCrashRecovery();
      });
    }
  }

  /**
   * Check for crash recovery
   */
  private async checkForCrashRecovery(): Promise<void> {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    const wasHealthy = sessionStorage.getItem(`${this.config.saveKeyPrefix}_healthy`);

    if (!wasHealthy) {
      // Potential crash detected
      console.log('Crash detected, attempting recovery...');

      try {
        const recovered = await this.recoverFromCrash();
        if (recovered) {
          console.log('Successfully recovered from crash');
        }
      } catch (error) {
        console.error('Failed to recover from crash:', error);
      }
    }
  }

  /**
   * Recover from crash
   */
  private async recoverFromCrash(): Promise<boolean> {
    const key = `${this.config.saveKeyPrefix}_current`;

    try {
      let data: any = null;

      switch (this.config.storageLocation) {
        case StorageLocation.LOCAL_STORAGE:
          if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem(key);
            data = saved ? JSON.parse(saved) : null;
          }
          break;

        case StorageLocation.SESSION_STORAGE:
          if (typeof sessionStorage !== 'undefined') {
            const saved = sessionStorage.getItem(key);
            data = saved ? JSON.parse(saved) : null;
          }
          break;

        case StorageLocation.INDEXED_DB:
          data = await this.loadFromIndexedDB(key);
          break;
      }

      if (data && data.cells) {
        await this.applySnapshotData(data);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Crash recovery failed:', error);
      return false;
    }
  }

  /**
   * Sync pending data to remote
   */
  private async syncPendingData(): Promise<void> {
    // Implement sync of pending data
    // This would typically involve checking for unsaved changes and sending them
  }

  /**
   * Start snapshot timer
   */
  private startSnapshotTimer(): void {
    this.snapshotTimer = setInterval(async () => {
      if (this.dirtyCells.size > 0) {
        await this.performSave();
      }
    }, this.config.snapshotInterval);
  }

  /**
   * Validate data before save
   */
  private async validateData(): Promise<void> {
    // Implement validation logic
    // Check for circular dependencies, invalid references, etc.
  }

  /**
   * Calculate hash of data
   */
  private async calculateHash(data: string): Promise<string> {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Generate snapshot ID
   */
  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(result: SaveResult): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(result);
      } catch (error) {
        console.error('Save event listener error:', error);
      }
    }
  }

  /**
   * Get configuration
   */
  public getConfig(): Readonly<Required<AutoSaveConfig>> {
    return this.config;
  }

  /**
   * Get dirty cell IDs
   */
  public getDirtyCells(): CellId[] {
    return Array.from(this.dirtyCells);
  }

  /**
   * Clear dirty state without saving
   */
  public clearDirtyState(): void {
    this.dirtyCells.clear();
    this.status = SaveStatus.IDLE;
  }

  /**
   * Check if there are unsaved changes
   */
  public hasUnsavedChanges(): boolean {
    return this.dirtyCells.size > 0;
  }

  /**
   * Get network status
   */
  public getNetworkStatus(): NetworkStatus {
    return this.networkStatus;
  }

  /**
   * Manually set network status (for testing)
   */
  public setNetworkStatus(status: NetworkStatus): void {
    this.networkStatus = status;
  }
}
