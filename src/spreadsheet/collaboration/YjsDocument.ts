/**
 * YjsDocument - Yjs CRDT setup for spreadsheet collaboration
 *
 * Provides:
 * - Y.Doc initialization for spreadsheet
 * - Y.Array for grid structure
 * - Y.Map for cell values
 * - Custom CRDT types for cell state
 * - Snapshot and version control support
 */

import * as Y from 'yjs';
import { LogCell } from '../cells/LogCell';
import { CellType } from '../types/CellType';

/**
 * Custom Yjs type for cell state
 * Extends Y.Map with cell-specific functionality
 */
export class YCell extends Y.Map<any> {
  constructor() {
    super();

    // Initialize cell structure
    this.set('value', '');
    this.set('formula', '');
    this.set('type', CellType.INPUT);
    this.set('metadata', new Y.Map());
    this.set('dependencies', new Y.Array());
    this.set('dependents', new Y.Array());
    this.set('lastModified', Date.now());
    this.set('modifiedBy', '');
    this.set('version', 0);
  }

  /**
   * Update cell value with conflict tracking
   */
  updateValue(
    value: any,
    userId: string,
    timestamp?: number
  ): void {
    const currentVersion = this.get('version') as number;
    this.set('value', value);
    this.set('lastModified', timestamp || Date.now());
    this.set('modifiedBy', userId);
    this.set('version', currentVersion + 1);
  }

  /**
   * Update cell formula
   */
  updateFormula(
    formula: string,
    userId: string,
    timestamp?: number
  ): void {
    const currentVersion = this.get('version') as number;
    this.set('formula', formula);
    this.set('lastModified', timestamp || Date.now());
    this.set('modifiedBy', userId);
    this.set('version', currentVersion + 1);
  }

  /**
   * Add dependency
   */
  addDependency(cellId: string): void {
    const dependencies = this.get('dependencies') as Y.Array<string>;
    if (!dependencies.toArray().includes(cellId)) {
      dependencies.push([cellId]);
    }
  }

  /**
   * Remove dependency
   */
  removeDependency(cellId: string): void {
    const dependencies = this.get('dependencies') as Y.Array<string>;
    const index = dependencies.toArray().indexOf(cellId);
    if (index !== -1) {
      dependencies.delete(index, 1);
    }
  }

  /**
   * Add dependent
   */
  addDependent(cellId: string): void {
    const dependents = this.get('dependents') as Y.Array<string>;
    if (!dependents.toArray().includes(cellId)) {
      dependents.push([cellId]);
    }
  }

  /**
   * Remove dependent
   */
  removeDependent(cellId: string): void {
    const dependents = this.get('dependents') as Y.Array<string>;
    const index = dependents.toArray().indexOf(cellId);
    if (index !== -1) {
      dependents.delete(index, 1);
    }
  }

  /**
   * Get cell snapshot
   */
  getSnapshot(): any {
    return {
      value: this.get('value'),
      formula: this.get('formula'),
      type: this.get('type'),
      metadata: this.get('metadata')?.toJSON(),
      dependencies: this.get('dependencies')?.toArray(),
      dependents: this.get('dependents')?.toArray(),
      lastModified: this.get('lastModified'),
      modifiedBy: this.get('modifiedBy'),
      version: this.get('version'),
    };
  }
}

/**
 * Yjs Document wrapper for spreadsheet
 */
export class YjsDocument {
  private doc: Y.Doc;
  private grid: Y.Array<Y.Array<YCell>>;
  private cells: Y.Map<string, YCell>;
  private metadata: Y.Map<any>;
  private version: Y.Number;

  constructor(docId?: string) {
    this.doc = new Y.Doc({
      guid: docId,
    });

    // Initialize document structure
    this.grid = this.doc.getArray('grid');
    this.cells = this.doc.getMap('cells');
    this.metadata = this.doc.getMap('metadata');
    this.version = this.doc.getMap('version') as any;

    // Set initial metadata
    this.metadata.set('created', Date.now());
    this.metadata.set('modified', Date.now());
    this.version = this.doc.getMap('version') as any;
  }

  /**
   * Get the underlying Y.Doc
   */
  getDocument(): Y.Doc {
    return this.doc;
  }

  /**
   * Get or create a cell
   */
  getCell(cellId: string): YCell {
    let cell = this.cells.get(cellId);
    if (!cell) {
      cell = new YCell();
      this.cells.set(cellId, cell);
    }
    return cell;
  }

  /**
   * Get cell by coordinates
   */
  getCellAt(row: number, col: number): YCell {
    const cellId = `${row}-${col}`;
    return this.getCell(cellId);
  }

  /**
   * Update cell value
   */
  updateCell(
    cellId: string,
    updates: Partial<{
      value: any;
      formula: string;
      type: CellType;
    }>,
    userId: string
  ): void {
    const cell = this.getCell(cellId);
    const timestamp = Date.now();

    if (updates.value !== undefined) {
      cell.updateValue(updates.value, userId, timestamp);
    }

    if (updates.formula !== undefined) {
      cell.updateFormula(updates.formula, userId, timestamp);
    }

    if (updates.type !== undefined) {
      cell.set('type', updates.type);
    }

    // Update document metadata
    this.metadata.set('modified', timestamp);
    this.metadata.set('modifiedBy', userId);
  }

  /**
   * Set cell dependency
   */
  setDependency(
    fromCellId: string,
    toCellId: string
  ): void {
    const fromCell = this.getCell(fromCellId);
    const toCell = this.getCell(toCellId);

    fromCell.addDependency(toCellId);
    toCell.addDependent(fromCellId);
  }

  /**
   * Remove cell dependency
   */
  removeDependency(
    fromCellId: string,
    toCellId: string
  ): void {
    const fromCell = this.getCell(fromCellId);
    const toCell = this.getCell(toCellId);

    fromCell.removeDependency(toCellId);
    toCell.removeDependent(fromCellId);
  }

  /**
   * Get all cells
   */
  getAllCells(): Map<string, YCell> {
    return this.cells as any;
  }

  /**
   * Get cell dependencies
   */
  getDependencies(cellId: string): string[] {
    const cell = this.getCell(cellId);
    const dependencies = cell.get('dependencies') as Y.Array<string>;
    return dependencies.toArray();
  }

  /**
   * Get cell dependents
   */
  getDependents(cellId: string): string[] {
    const cell = this.getCell(cellId);
    const dependents = cell.get('dependents') as Y.Array<string>;
    return dependents.toArray();
  }

  /**
   * Create a snapshot
   */
  createSnapshot(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  /**
   * Apply a snapshot
   */
  applySnapshot(snapshot: Uint8Array): void {
    Y.applyUpdate(this.doc, snapshot);
  }

  /**
   * Get document state
   */
  getState(): Uint8Array {
    return Y.encodeStateVector(this.doc);
  }

  /**
   * Get diff since state
   */
  getDiff(state: Uint8Array): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc, state);
  }

  /**
   * Subscribe to cell changes
   */
  subscribeToCell(
    cellId: string,
    callback: (cell: YCell, transaction: Y.Transaction) => void
  ): () => void {
    const cell = this.getCell(cellId);
    return cell.observe(callback);
  }

  /**
   * Subscribe to document changes
   */
  subscribeToDocument(
    callback: (events: Y.YEvent<any>[], transaction: Y.Transaction) => void
  ): () => void {
    return this.doc.on('update', callback);
  }

  /**
   * Subscribe to metadata changes
   */
  subscribeToMetadata(
    callback: (metadata: Y.Map<any>, transaction: Y.Transaction) => void
  ): () => void {
    return this.metadata.observe(callback);
  }

  /**
   * Transact multiple updates atomically
   */
  transact(callback: () => void, origin?: any): void {
    this.doc.transact(callback, origin);
  }

  /**
   * Get document metadata
   */
  getMetadata(): any {
    return this.metadata.toJSON();
  }

  /**
   * Update metadata
   */
  updateMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
  }

  /**
   * Get all cell IDs
   */
  getCellIds(): string[] {
    return Array.from(this.cells.keys());
  }

  /**
   * Delete cell
   */
  deleteCell(cellId: string): void {
    const cell = this.getCell(cellId);

    // Remove from dependencies
    const dependencies = this.getDependencies(cellId);
    dependencies.forEach(depId => {
      this.removeDependency(cellId, depId);
    });

    // Remove from dependents
    const dependents = this.getDependents(cellId);
    dependents.forEach(depId => {
      this.removeDependency(depId, cellId);
    });

    // Delete cell
    this.cells.delete(cellId);
  }

  /**
   * Clear all cells
   */
  clear(): void {
    this.cells.clear();
    this.metadata.set('modified', Date.now());
  }

  /**
   * Destroy document
   */
  destroy(): void {
    this.doc.destroy();
  }

  /**
   * Get document statistics
   */
  getStats(): {
    cellCount: number;
    dependencyCount: number;
    created: number;
    modified: number;
  } {
    const cells = this.getAllCells();
    let dependencyCount = 0;

    cells.forEach((cell) => {
      const dependencies = cell.get('dependencies') as Y.Array<string>;
      dependencyCount += dependencies.length;
    });

    return {
      cellCount: cells.size,
      dependencyCount,
      created: this.metadata.get('created'),
      modified: this.metadata.get('modified'),
    };
  }
}
