/**
 * POLLN Spreadsheet Schema Validator
 *
 * Validates imported cell network data against schema definitions,
 * checks for circular dependencies, version compatibility, and data integrity.
 */

import type {
  CellId,
  CellPosition,
  CellReference,
} from '../core/types.js';
import { CellType } from '../core/types.js';
import type {
  NetworkExport,
  SerializableCell,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './types.js';

/**
 * Current supported format version
 */
const CURRENT_FORMAT_VERSION = '1.0.0';
const SUPPORTED_VERSIONS = ['1.0.0', '0.9.0', '0.8.0'];

/**
 * Schema validator for network imports
 */
export class SchemaValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];
  private cellMap = new Map<CellId, SerializableCell>();
  private positionMap = new Map<string, CellId>();

  /**
   * Validate a complete network export
   */
  public validateNetwork(network: any): ValidationResult {
    this.reset();

    // Validate structure
    this.validateStructure(network);

    if (!this.isValidStructure(network)) {
      return this.buildResult(false);
    }

    // Build maps
    this.buildMaps(network.cells);

    // Validate version
    this.validateVersion(network.version);

    // Validate metadata
    this.validateMetadata(network.metadata);

    // Validate cells
    this.validateCells(network.cells);

    // Validate connections
    this.validateConnections(network.connections || []);

    // Check for circular dependencies
    this.checkCircularDependencies(network.cells, network.connections || []);

    // Check for duplicates
    this.checkDuplicates();

    return this.buildResult(this.errors.length === 0);
  }

  /**
   * Validate a single cell
   */
  public validateCell(cell: any, position?: CellPosition): ValidationResult {
    this.reset();

    if (!cell) {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: 'Cell data is null or undefined',
      });
      return this.buildResult(false);
    }

    this.validateCellStructure(cell, position);

    return this.buildResult(this.errors.length === 0);
  }

  /**
   * Validate version compatibility
   */
  public validateVersion(version: string): boolean {
    if (!version) {
      this.addError({
        type: 'version',
        severity: 'error',
        message: 'Version is missing',
      });
      return false;
    }

    if (!SUPPORTED_VERSIONS.includes(version)) {
      this.addWarning({
        type: 'compatibility',
        message: `Version ${version} is not officially supported. Current version is ${CURRENT_FORMAT_VERSION}`,
        suggestion: 'Consider migrating to the latest version',
      });
    }

    if (version !== CURRENT_FORMAT_VERSION) {
      this.addWarning({
        type: 'compatibility',
        message: `Version ${version} may require migration`,
        suggestion: `Run migration to version ${CURRENT_FORMAT_VERSION}`,
      });
    }

    return SUPPORTED_VERSIONS.includes(version);
  }

  /**
   * Validate cell references
   */
  public validateReferences(
    cells: SerializableCell[],
    connections: Array<{ from: CellReference; to: CellReference }>
  ): ValidationResult {
    this.reset();
    this.buildMaps(cells);

    for (const conn of connections) {
      this.validateReference(conn.from, 'connection.from');
      this.validateReference(conn.to, 'connection.to');
    }

    return this.buildResult(this.errors.length === 0);
  }

  /**
   * Reset validator state
   */
  private reset(): void {
    this.errors = [];
    this.warnings = [];
    this.cellMap.clear();
    this.positionMap.clear();
  }

  /**
   * Validate basic structure
   */
  private isValidStructure(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      data.format === 'POLLN_NETWORK' &&
      typeof data.version === 'string' &&
      Array.isArray(data.cells)
    );
  }

  /**
   * Validate network structure
   */
  private validateStructure(data: any): void {
    if (!data) {
      this.addError({
        type: 'schema',
        severity: 'critical',
        message: 'Network data is null or undefined',
      });
      return;
    }

    if (data.format !== 'POLLN_NETWORK') {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: `Invalid format: expected 'POLLN_NETWORK', got '${data.format}'`,
      });
    }

    if (!data.version || typeof data.version !== 'string') {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: 'Missing or invalid version',
      });
    }

    if (!Array.isArray(data.cells)) {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: 'Cells must be an array',
      });
    }
  }

  /**
   * Validate metadata
   */
  private validateMetadata(metadata: any): void {
    if (!metadata) {
      this.addWarning({
        type: 'best_practice',
        message: 'Missing network metadata',
        suggestion: 'Add metadata for better documentation',
      });
      return;
    }

    if (!metadata.name || typeof metadata.name !== 'string') {
      this.addWarning({
        type: 'best_practice',
        message: 'Missing or invalid network name',
      });
    }

    if (!metadata.createdAt || typeof metadata.createdAt !== 'number') {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: 'Missing or invalid createdAt timestamp',
      });
    }
  }

  /**
   * Validate all cells
   */
  private validateCells(cells: SerializableCell[]): void {
    for (const cell of cells) {
      this.validateCellStructure(cell);
    }
  }

  /**
   * Validate cell structure
   */
  private validateCellStructure(cell: any, position?: CellPosition): void {
    // Required fields
    if (!cell.id) {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: 'Cell missing required field: id',
        location: { position },
      });
    }

    if (!cell.type || !Object.values(CellType).includes(cell.type)) {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: `Invalid cell type: ${cell.type}`,
        location: { cellId: cell.id, position },
      });
    }

    if (!cell.position || typeof cell.position.row !== 'number' || typeof cell.position.col !== 'number') {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: 'Invalid cell position',
        location: { cellId: cell.id },
      });
    }

    if (!cell.state || !['dormant', 'sensing', 'processing', 'emitting', 'learning', 'error'].includes(cell.state)) {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: `Invalid cell state: ${cell.state}`,
        location: { cellId: cell.id },
      });
    }

    // Validate anatomy
    if (!cell.head) {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: 'Cell missing head structure',
        location: { cellId: cell.id },
      });
    }

    if (!cell.body) {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: 'Cell missing body structure',
        location: { cellId: cell.id },
      });
    }

    if (!cell.tail) {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: 'Cell missing tail structure',
        location: { cellId: cell.id },
      });
    }

    if (!cell.origin) {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: 'Cell missing origin structure',
        location: { cellId: cell.id },
      });
    }

    // Validate arrays
    if (cell.head && !Array.isArray(cell.head.inputs)) {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: 'head.inputs must be an array',
        location: { cellId: cell.id },
      });
    }

    if (cell.head && !Array.isArray(cell.head.sensations)) {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: 'head.sensations must be an array',
        location: { cellId: cell.id },
      });
    }

    if (cell.tail && !Array.isArray(cell.tail.outputs)) {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: 'tail.outputs must be an array',
        location: { cellId: cell.id },
      });
    }

    // Validate timestamps
    if (cell.createdAt && typeof cell.createdAt !== 'number') {
      this.addError({
        type: 'schema',
        severity: 'error',
        message: 'createdAt must be a number timestamp',
        location: { cellId: cell.id },
      });
    }
  }

  /**
   * Validate connections
   */
  private validateConnections(connections: Array<{ from: CellReference; to: CellReference }>): void {
    for (let i = 0; i < connections.length; i++) {
      const conn = connections[i];

      if (!conn.from || !conn.to) {
        this.addError({
          type: 'schema',
          severity: 'error',
          message: `Connection ${i} missing from or to reference`,
        });
        continue;
      }

      this.validateReference(conn.from, `connection[${i}].from`);
      this.validateReference(conn.to, `connection[${i}].to`);
    }
  }

  /**
   * Validate a cell reference
   */
  private validateReference(ref: CellReference, context: string): void {
    if (!ref) {
      this.addError({
        type: 'reference',
        severity: 'error',
        message: `Null reference in ${context}`,
      });
      return;
    }

    if (typeof ref.row !== 'number' || typeof ref.col !== 'number') {
      this.addError({
        type: 'reference',
        severity: 'error',
        message: `Invalid reference in ${context}: row and col must be numbers`,
      });
      return;
    }

    if (ref.id) {
      const cell = this.cellMap.get(ref.id);
      if (!cell) {
        this.addError({
          type: 'reference',
          severity: 'error',
          message: `Reference to non-existent cell: ${ref.id}`,
          details: { reference: ref, context },
        });
      }
    }
  }

  /**
   * Check for circular dependencies
   */
  private checkCircularDependencies(
    cells: SerializableCell[],
    connections: Array<{ from: CellReference; to: CellReference }>
  ): void {
    const graph = new Map<CellId, Set<CellId>>();

    // Build adjacency list
    for (const conn of connections) {
      if (conn.from.id && conn.to.id) {
        if (!graph.has(conn.from.id)) {
          graph.set(conn.from.id, new Set());
        }
        graph.get(conn.from.id)!.add(conn.to.id);
      }
    }

    // Check each cell for cycles
    const visited = new Set<CellId>();
    const recursionStack = new Set<CellId>();

    const hasCycle = (cellId: CellId): boolean => {
      if (recursionStack.has(cellId)) {
        return true;
      }
      if (visited.has(cellId)) {
        return false;
      }

      visited.add(cellId);
      recursionStack.add(cellId);

      const neighbors = graph.get(cellId) || new Set();
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(cellId);
      return false;
    };

    for (const cell of cells) {
      if (hasCycle(cell.id)) {
        this.addError({
          type: 'circular',
          severity: 'error',
          message: `Circular dependency detected involving cell ${cell.id}`,
          location: { cellId: cell.id },
        });
        break;
      }
    }
  }

  /**
   * Check for duplicate cells
   */
  private checkDuplicates(): void {
    const idSet = new Set<CellId>();
    const posSet = new Set<string>();

    for (const [id, cell] of this.cellMap) {
      // Check duplicate IDs
      if (idSet.has(id)) {
        this.addError({
          type: 'data',
          severity: 'error',
          message: `Duplicate cell ID: ${id}`,
          location: { cellId: id },
        });
      }
      idSet.add(id);

      // Check duplicate positions
      const posKey = `${cell.position.row},${cell.position.col}`;
      if (posSet.has(posKey)) {
        this.addError({
          type: 'data',
          severity: 'error',
          message: `Duplicate position: (${cell.position.row}, ${cell.position.col})`,
          location: { position: cell.position },
        });
      }
      posSet.add(posKey);
    }
  }

  /**
   * Build internal maps
   */
  private buildMaps(cells: SerializableCell[]): void {
    for (const cell of cells) {
      this.cellMap.set(cell.id, cell);
      const posKey = `${cell.position.row},${cell.position.col}`;
      this.positionMap.set(posKey, cell.id);
    }
  }

  /**
   * Add an error
   */
  private addError(error: Omit<ValidationError, 'details'> & { details?: any }): void {
    this.errors.push(error as ValidationError);
  }

  /**
   * Add a warning
   */
  private addWarning(warning: Omit<ValidationWarning, 'suggestion'> & { suggestion?: string }): void {
    this.warnings.push(warning as ValidationWarning);
  }

  /**
   * Build validation result
   */
  private buildResult(valid: boolean): ValidationResult {
    return {
      valid,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalCells: this.cellMap.size,
        validCells: valid ? this.cellMap.size : this.cellMap.size - this.errors.length,
        invalidCells: this.errors.filter(e => e.location?.cellId).length,
        totalConnections: 0, // Would need to track this
        validConnections: 0,
        invalidConnections: this.errors.filter(e => e.type === 'reference').length,
      },
    };
  }

  /**
   * Get supported versions
   */
  public static getSupportedVersions(): string[] {
    return [...SUPPORTED_VERSIONS];
  }

  /**
   * Get current format version
   */
  public static getCurrentVersion(): string {
    return CURRENT_FORMAT_VERSION;
  }
}
