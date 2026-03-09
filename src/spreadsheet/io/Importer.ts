/**
 * POLLN Network Importer
 *
 * Imports cell networks from various sources including files, clipboard,
 * URLs, and drag-drop operations with validation and conflict resolution.
 */

import type { LogCell } from '../core/LogCell.js';
import type {
  CellId,
  CellReference,
} from '../core/types.js';
import {
  ImportSource,
  MergeStrategy,
  ConflictResolution,
} from './types.js';
import type {
  ImportConfig,
  ImportResult,
  ImportConflict,
  NetworkExport,
  ClipboardData,
  ProgressCallback,
  ValidationResult,
} from './types.js';
import { SchemaValidator } from './SchemaValidator.js';
import { MigrationEngine, getMigrationEngine } from './MigrationEngine.js';

/**
 * Importer for cell networks
 */
export class Importer {
  private validator: SchemaValidator;
  private migrationEngine: MigrationEngine;

  constructor() {
    this.validator = new SchemaValidator();
    this.migrationEngine = getMigrationEngine();
  }

  /**
   * Import a network from various sources
   */
  public async import(
    source: ImportSource,
    data: any,
    config: ImportConfig,
    existingCells?: Map<CellId, LogCell>,
    progressCallback?: ProgressCallback
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const result: ImportResult = {
      success: false,
      imported: { cells: 0, connections: 0 },
      skipped: { cells: 0, connections: 0 },
      errors: [],
      warnings: [],
      duration: 0,
    };

    try {
      progressCallback?.(1, 5, 'Parsing import data');

      // Parse data based on source
      let network: NetworkExport;

      switch (source) {
        case ImportSource.FILE:
          network = await this.parseFile(data);
          break;

        case ImportSource.CLIPBOARD:
          network = await this.parseClipboard(data);
          break;

        case ImportSource.URL:
          network = await this.parseURL(data);
          break;

        case ImportSource.DRAG_DROP:
          network = await this.parseDragDrop(data);
          break;

        default:
          throw new Error(`Unsupported import source: ${source}`);
      }

      progressCallback?.(2, 5, 'Validating data structure');

      // Validate structure
      const validationResult = this.validator.validateNetwork(network);

      if (!validationResult.valid) {
        result.errors.push(...validationResult.errors.map(e => ({
          message: e.message,
          location: e.location,
        })));
        result.duration = Date.now() - startTime;
        return result;
      }

      result.warnings.push(...validationResult.warnings.map(w => w.message));

      progressCallback?.(3, 5, 'Checking version compatibility');

      // Migrate if necessary
      if (config.migrateVersions !== false) {
        const targetVersion = config.targetVersion || SchemaValidator.getCurrentVersion();

        if (this.migrationEngine.needsMigration(network.version, targetVersion)) {
          const migrationResult = await this.migrationEngine.migrate(
            network,
            targetVersion,
            (current, total, message) => {
              progressCallback?.(current + 2, total + 2, message);
            }
          );

          if (!migrationResult.success) {
            result.errors.push({
              message: 'Migration failed',
            });
            result.warnings.push(...migrationResult.warnings);
            result.duration = Date.now() - startTime;
            return result;
          }

          result.warnings.push(...migrationResult.warnings);
          network = migrationResult as any;
        }
      }

      progressCallback?.(4, 5, 'Processing cells');

      // Process cells based on merge strategy
      const processResult = await this.processCells(
        network,
        config.mergeStrategy || MergeStrategy.REPLACE,
        existingCells,
        config.conflictResolution
      );

      result.imported = processResult.imported;
      result.skipped = processResult.skipped;
      result.errors.push(...processResult.errors);
      result.warnings.push(...processResult.warnings);

      progressCallback?.(5, 5, 'Import complete');

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      return result;
    } catch (error) {
      result.errors.push({
        message: `Import failed: ${error}`,
      });
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Parse data from file
   */
  private async parseFile(data: string | Buffer): Promise<NetworkExport> {
    // Detect format
    if (Buffer.isBuffer(data)) {
      // Check if it's POLLN binary format
      if (data.length >= 4 && data.readUInt32LE(0) === 0x504F4C4E) {
        return this.parsePOLLNBinary(data);
      }

      // Try JSON
      try {
        const text = data.toString('utf-8');
        return JSON.parse(text);
      } catch {
        throw new Error('Failed to parse file data');
      }
    }

    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        throw new Error('Failed to parse file data');
      }
    }

    throw new Error('Invalid file data format');
  }

  /**
   * Parse data from clipboard
   */
  private async parseClipboard(data: ClipboardData | string): Promise<NetworkExport> {
    let clipboardData: ClipboardData;

    if (typeof data === 'string') {
      try {
        clipboardData = JSON.parse(data);
      } catch {
        // Try as plain text/CSV
        return this.parseCSVText(data);
      }
    } else {
      clipboardData = data;
    }

    if (clipboardData.type === 'polln_cells') {
      return clipboardData.data;
    } else if (clipboardData.type === 'polln_values') {
      return this.valuesToNetwork(clipboardData.data);
    } else {
      throw new Error(`Unsupported clipboard format: ${clipboardData.type}`);
    }
  }

  /**
   * Parse data from URL
   */
  private async parseURL(url: string): Promise<NetworkExport> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        return await response.json();
      } else if (contentType?.includes('text/csv')) {
        const text = await response.text();
        return this.parseCSVText(text);
      } else {
        const text = await response.text();
        return JSON.parse(text);
      }
    } catch (error) {
      throw new Error(`Failed to fetch from URL: ${error}`);
    }
  }

  /**
   * Parse data from drag-drop
   */
  private async parseDragDrop(data: DataTransfer | File): Promise<NetworkExport> {
    let file: File;

    if (data instanceof DataTransfer) {
      const files = data.files;
      if (files.length === 0) {
        throw new Error('No files dropped');
      }
      file = files[0];
    } else {
      file = data;
    }

    const text = await file.text();

    // Detect format from extension
    const ext = file.name.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'json':
        return JSON.parse(text);

      case 'csv':
        return this.parseCSVText(text);

      case 'polln':
        // Binary format
        const buffer = Buffer.from(await file.arrayBuffer());
        return this.parsePOLLNBinary(buffer);

      default:
        // Try JSON first, then CSV
        try {
          return JSON.parse(text);
        } catch {
          return this.parseCSVText(text);
        }
    }
  }

  /**
   * Parse POLLN binary format
   */
  private parsePOLLNBinary(buffer: Buffer): NetworkExport {
    // Read header
    const magic = buffer.readUInt32LE(0);
    if (magic !== 0x504F4C4E) {
      throw new Error('Invalid POLLN binary file');
    }

    const version = buffer.readUInt32LE(4);
    const flags = buffer.readUInt32LE(8);
    const compression = buffer.readUInt8(12) === 1;
    const encryption = buffer.readUInt8(13) === 1;
    const metadataSize = buffer.readUInt32LE(16);
    const cellCount = buffer.readUInt32LE(20);
    const connectionCount = buffer.readUInt32LE(24);

    let offset = 32;

    // Read metadata
    const metadataBytes = buffer.slice(offset, offset + metadataSize);
    const metadata = JSON.parse(metadataBytes.toString('utf-8'));
    offset += metadataSize;

    // Read cells
    const cellsEnd = offset + buffer.length - offset - (connectionCount > 0 ? 1000 : 0);
    const cellsJson = buffer.slice(offset, cellsEnd).toString('utf-8');
    const cells = JSON.parse(cellsJson);
    offset = cellsEnd;

    // Read connections
    let connections: any[] = [];
    if (connectionCount > 0 && offset < buffer.length) {
      const connectionsJson = buffer.slice(offset).toString('utf-8');
      connections = JSON.parse(connectionsJson);
    }

    return {
      format: 'POLLN_NETWORK',
      version: this.versionToString(version),
      metadata,
      cells,
      connections,
    };
  }

  /**
   * Parse CSV text
   */
  private parseCSVText(text: string): NetworkExport {
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV data is too short');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const cells: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const cell: any = {
        id: `imported-${i}`,
        type: 'storage',
        state: 'dormant',
        position: { row: i - 1, col: 0 },
        logicLevel: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        head: { inputs: [], sensations: [] },
        body: { memory: { limit: 100, records: [] }, selfModel: {} },
        tail: { outputs: [], effects: [] },
        origin: { position: { row: i - 1, col: 0 }, selfAwareness: 0, watchedCells: [] },
      };

      // Map CSV values to cell properties
      headers.forEach((header, idx) => {
        if (idx < values.length) {
          cell[header] = values[idx];
        }
      });

      // Parse position if available
      const posMatch = lines[i].match(/^R?(\d+)C?(\d+)?/);
      if (posMatch) {
        cell.position.row = parseInt(posMatch[1]) - 1;
        cell.position.col = posMatch[2] ? parseInt(posMatch[2]) - 1 : 0;
      }

      cells.push(cell);
    }

    return {
      format: 'POLLN_NETWORK',
      version: '1.0.0',
      metadata: {
        name: 'Imported from CSV',
        version: '1.0.0',
        formatVersion: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      cells,
      connections: [],
    };
  }

  /**
   * Convert values array to network
   */
  private valuesToNetwork(values: any[][]): NetworkExport {
    const cells: any[] = [];

    values.forEach((row, rowIdx) => {
      row.forEach((value, colIdx) => {
        const cell: any = {
          id: `value-${rowIdx}-${colIdx}`,
          type: 'storage',
          state: 'dormant',
          position: { row: rowIdx, col: colIdx },
          logicLevel: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
          head: { inputs: [], sensations: [] },
          body: {
            memory: {
              limit: 100,
              records: [{
                id: 'initial',
                input: null,
                output: value,
                trace: { steps: [], dependencies: [], confidence: 1, totalTime: 0, startTime: 0, endTime: 0 },
                confidence: 1,
                timestamp: Date.now(),
                duration: 0,
              }],
            },
            selfModel: {},
          },
          tail: { outputs: [], effects: [] },
          origin: { position: { row: rowIdx, col: colIdx }, selfAwareness: 0, watchedCells: [] },
        };

        cells.push(cell);
      });
    });

    return {
      format: 'POLLN_NETWORK',
      version: '1.0.0',
      metadata: {
        name: 'Imported from values',
        version: '1.0.0',
        formatVersion: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      cells,
      connections: [],
    };
  }

  /**
   * Process cells according to merge strategy
   */
  private async processCells(
    network: NetworkExport,
    strategy: MergeStrategy,
    existingCells?: Map<CellId, LogCell>,
    conflictResolution?: ConflictResolution
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: { cells: 0, connections: 0 },
      skipped: { cells: 0, connections: 0 },
      errors: [],
      warnings: [],
      duration: 0,
    };

    switch (strategy) {
      case MergeStrategy.REPLACE:
        // Simply import all cells
        result.imported.cells = network.cells.length;
        result.imported.connections = network.connections?.length || 0;
        break;

      case MergeStrategy.APPEND:
        // Add new cells, skip conflicts
        for (const cell of network.cells) {
          if (existingCells?.has(cell.id)) {
            result.skipped.cells++;
          } else {
            result.imported.cells++;
          }
        }
        break;

      case MergeStrategy.MERGE:
        // Merge cells with conflict resolution
        for (const cell of network.cells) {
          if (existingCells?.has(cell.id)) {
            const conflict = this.detectConflict(existingCells.get(cell.id)!, cell);
            if (conflict) {
              const resolution = await this.resolveConflict(conflict, conflictResolution);
              if (resolution === 'keep_import') {
                result.imported.cells++;
              } else {
                result.skipped.cells++;
              }
            } else {
              result.imported.cells++;
            }
          } else {
            result.imported.cells++;
          }
        }
        break;

      case MergeStrategy.SKIP:
        // Skip all existing cells
        for (const cell of network.cells) {
          if (existingCells?.has(cell.id)) {
            result.skipped.cells++;
          } else {
            result.imported.cells++;
          }
        }
        break;
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Detect conflict between cells
   */
  private detectConflict(existing: LogCell, incoming: any): ImportConflict | null {
    const existingJson = existing.toJSON();

    if (existingJson.type !== incoming.type) {
      return {
        type: 'cell_exists',
        existing: existingJson,
        incoming,
        location: { cellId: existing.id },
      };
    }

    if (existingJson.position.row !== incoming.position.row ||
        existingJson.position.col !== incoming.position.col) {
      return {
        type: 'version_mismatch',
        existing: existingJson,
        incoming,
        location: { cellId: existing.id },
      };
    }

    return null;
  }

  /**
   * Resolve conflict
   */
  private async resolveConflict(
    conflict: ImportConflict,
    strategy?: ConflictResolution
  ): Promise<ConflictResolution> {
    if (!strategy) {
      // Default to keep newer
      strategy = ConflictResolution.KEEP_NEWER;
    }

    switch (strategy) {
      case ConflictResolution.KEEP_IMPORT:
        return ConflictResolution.KEEP_IMPORT;

      case ConflictResolution.KEEP_EXISTING:
        return ConflictResolution.KEEP_EXISTING;

      case ConflictResolution.KEEP_NEWER:
        const existingTime = conflict.existing.updatedAt || conflict.existing.createdAt;
        const incomingTime = conflict.incoming.updatedAt || conflict.incoming.createdAt;
        return incomingTime > existingTime ? ConflictResolution.KEEP_IMPORT : ConflictResolution.KEEP_EXISTING;

      case ConflictResolution.KEEP_HIGHER_VERSION:
        const existingVersion = conflict.existing.version || 1;
        const incomingVersion = conflict.incoming.version || 1;
        return incomingVersion > existingVersion ? ConflictResolution.KEEP_IMPORT : ConflictResolution.KEEP_EXISTING;

      case ConflictResolution.MANUAL:
        // Return manual - caller should handle
        return ConflictResolution.MANUAL;

      default:
        return ConflictResolution.KEEP_EXISTING;
    }
  }

  /**
   * Convert version number to string
   */
  private versionToString(version: number): string {
    const major = Math.floor(version / 10000);
    const minor = Math.floor((version % 10000) / 100);
    const patch = version % 100;
    return `${major}.${minor}.${patch}`;
  }

  /**
   * Get supported import sources
   */
  public static getSupportedSources(): ImportSource[] {
    return Object.values(ImportSource);
  }

  /**
   * Validate import data before processing
   */
  public async validate(data: any, source: ImportSource): Promise<ValidationResult> {
    try {
      let network: NetworkExport;

      switch (source) {
        case ImportSource.FILE:
        case ImportSource.DRAG_DROP:
          network = await this.parseFile(data);
          break;
        case ImportSource.CLIPBOARD:
          network = await this.parseClipboard(data);
          break;
        case ImportSource.URL:
          network = await this.parseURL(data);
          break;
        default:
          return {
            valid: false,
            errors: [{ type: 'schema', severity: 'error', message: 'Unknown source type' }],
            warnings: [],
            summary: { totalCells: 0, validCells: 0, invalidCells: 0, totalConnections: 0, validConnections: 0, invalidConnections: 0 },
          };
      }

      return this.validator.validateNetwork(network);
    } catch (error) {
      return {
        valid: false,
        errors: [{ type: 'schema', severity: 'error', message: `Validation error: ${error}` }],
        warnings: [],
        summary: { totalCells: 0, validCells: 0, invalidCells: 0, totalConnections: 0, validConnections: 0, invalidConnections: 0 },
      };
    }
  }
}
