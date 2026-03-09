/**
 * Comprehensive test suite for POLLN I/O module
 *
 * Tests export, import, validation, and migration functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Exporter } from '../Exporter.js';
import { Importer } from '../Importer.js';
import { SchemaValidator } from '../SchemaValidator.js';
import { MigrationEngine } from '../MigrationEngine.js';
import {
  ExportFormat,
  ImportSource,
  MergeStrategy,
  ConflictResolution,
} from '../types.js';
import type {
  NetworkExport,
  SerializableCell,
} from '../types.js';
import { CellType, CellState } from '../../core/types.js';

// Mock LogCell for testing
class MockLogCell {
  public id: string;
  public type: CellType;
  public position: { row: number; col: number };
  public createdAt: number;
  private state: CellState;

  constructor(config: any) {
    this.id = config.id || 'test-cell-1';
    this.type = config.type || CellType.INPUT;
    this.position = config.position || { row: 0, col: 0 };
    this.createdAt = Date.now();
    this.state = CellState.DORMANT;
  }

  public getState(): CellState {
    return this.state;
  }

  public toJSON(): any {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      createdAt: this.createdAt,
    };
  }

  public inspect(): any {
    return {
      cellId: this.id,
      type: this.type,
      state: this.state,
      position: this.position,
      inputs: [],
      sensations: [],
      reasoning: [],
      memory: [],
      outputs: [],
      effects: [],
      selfModel: {
        identity: this.type,
        capabilities: [],
        performance: {
          totalExecutions: 10,
          successfulExecutions: 9,
          averageConfidence: 0.85,
          averageDuration: 100,
        },
        patterns: [],
        lastUpdated: Date.now(),
      },
    };
  }

  public getPerformanceMetrics() {
    return {
      totalExecutions: 10,
      successfulExecutions: 9,
      failedExecutions: 1,
      totalDuration: 1000,
      lastExecution: Date.now(),
    };
  }

  public getStateHistory() {
    return [
      { state: CellState.DORMANT, timestamp: this.createdAt },
      { state: CellState.SENSING, timestamp: this.createdAt + 100 },
    ];
  }
}

describe('I/O Module Tests', () => {
  describe('Exporter', () => {
    let exporter: Exporter;
    let mockCells: MockLogCell[];

    beforeEach(() => {
      exporter = new Exporter();
      mockCells = [
        new MockLogCell({
          id: 'cell-1',
          type: CellType.INPUT,
          position: { row: 0, col: 0 },
        }),
        new MockLogCell({
          id: 'cell-2',
          type: CellType.OUTPUT,
          position: { row: 0, col: 1 },
        }),
      ];
    });

    it('should export cells to JSON format', async () => {
      const result = await exporter.export(
        mockCells as any,
        { format: ExportFormat.JSON, pretty: true }
      );

      expect(result.data).toBeDefined();
      expect(result.statistics.totalCells).toBe(2);
      expect(result.statistics.format).toBe(ExportFormat.JSON);

      const parsed = JSON.parse(result.data);
      expect(parsed.format).toBe('POLLN_NETWORK');
      expect(parsed.cells).toHaveLength(2);
    });

    it('should export cells to CSV format', async () => {
      const result = await exporter.export(
        mockCells as any,
        { format: ExportFormat.CSV }
      );

      expect(result.data).toBeDefined();
      expect(result.data.headers).toBeDefined();
      expect(result.data.rows).toHaveLength(2);
    });

    it('should export cells to Excel format', async () => {
      const result = await exporter.export(
        mockCells as any,
        { format: ExportFormat.EXCEL }
      );

      expect(result.data).toBeDefined();
      expect(result.data.sheets).toBeDefined();
      expect(result.data.sheets.length).toBeGreaterThan(0);
    });

    it('should export cells to PDF format', async () => {
      const result = await exporter.export(
        mockCells as any,
        {
          format: ExportFormat.PDF,
          includeSummary: true,
          includeDetails: true,
        } as any
      );

      expect(result.data).toBeDefined();
      expect(Buffer.isBuffer(result.data)).toBe(true);
    });

    it('should export cells to POLLN binary format', async () => {
      const result = await exporter.export(
        mockCells as any,
        { format: ExportFormat.POLLN }
      );

      expect(result.data).toBeDefined();
      expect(Buffer.isBuffer(result.data)).toBe(true);

      // Check magic number
      const magic = result.data.readUInt32LE(0);
      expect(magic).toBe(0x504F4C4E); // "POLL"
    });

    it('should calculate export statistics correctly', async () => {
      const result = await exporter.export(
        mockCells as any,
        { format: ExportFormat.JSON }
      );

      expect(result.statistics.totalCells).toBe(2);
      expect(result.statistics.totalConnections).toBeGreaterThanOrEqual(0);
      expect(result.statistics.duration).toBeGreaterThan(0);
    });

    it('should handle empty cell array', async () => {
      await expect(
        exporter.export([], { format: ExportFormat.JSON })
      ).rejects.toThrow('No cells to export');
    });

    it('should respect export configuration options', async () => {
      const result = await exporter.export(
        mockCells as any,
        {
          format: ExportFormat.JSON,
          includeMetadata: true,
          includeHistory: true,
          pretty: true,
        }
      );

      const parsed = JSON.parse(result.data);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.cells[0].history).toBeDefined();
    });
  });

  describe('Importer', () => {
    let importer: Importer;
    let validNetwork: NetworkExport;

    beforeEach(() => {
      importer = new Importer();
      validNetwork = {
        format: 'POLLN_NETWORK',
        version: '1.0.0',
        metadata: {
          name: 'Test Network',
          version: '1.0.0',
          formatVersion: '1.0.0',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        cells: [
          {
            id: 'imported-cell-1',
            type: CellType.INPUT,
            state: CellState.DORMANT,
            position: { row: 0, col: 0 },
            logicLevel: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1,
            head: { inputs: [], sensations: [] },
            body: {
              memory: { limit: 100, records: [] },
              selfModel: {
                identity: CellType.INPUT,
                capabilities: [],
                performance: {
                  totalExecutions: 0,
                  successfulExecutions: 0,
                  averageConfidence: 0,
                  averageDuration: 0,
                },
                patterns: [],
                lastUpdated: Date.now(),
              },
            },
            tail: { outputs: [], effects: [] },
            origin: {
              position: { row: 0, col: 0 },
              selfAwareness: 0,
              watchedCells: [],
            },
          },
        ],
        connections: [],
      };
    });

    it('should import from JSON file', async () => {
      const json = JSON.stringify(validNetwork);
      const buffer = Buffer.from(json);

      const result = await importer.import(
        ImportSource.FILE,
        buffer,
        { source: ImportSource.FILE, validateSchema: true }
      );

      expect(result.success).toBe(true);
      expect(result.imported.cells).toBe(1);
    });

    it('should import from CSV text', async () => {
      const csv = 'Position,ID,Type,State\nR1C1,cell-1,input,dormant\nR1C2,cell-2,output,dormant';

      const result = await importer.import(
        ImportSource.CLIPBOARD,
        { type: 'polln_values', data: csv },
        { source: ImportSource.CLIPBOARD, validateSchema: false }
      );

      expect(result.success).toBe(true);
      expect(result.imported.cells).toBeGreaterThan(0);
    });

    it('should import from POLLN binary format', async () => {
      // First export to get binary format
      const exporter = new Exporter();
      const mockCells = [new MockLogCell({
        id: 'cell-1',
        type: CellType.INPUT,
        position: { row: 0, col: 0 },
      })];

      const exportResult = await exporter.export(
        mockCells as any,
        { format: ExportFormat.POLLN }
      );

      const result = await importer.import(
        ImportSource.FILE,
        exportResult.data,
        { source: ImportSource.FILE, validateSchema: true }
      );

      expect(result.success).toBe(true);
    });

    it('should handle merge strategies correctly', async () => {
      const json = JSON.stringify(validNetwork);
      const buffer = Buffer.from(json);

      // Test replace strategy
      const result1 = await importer.import(
        ImportSource.FILE,
        buffer,
        {
          source: ImportSource.FILE,
          validateSchema: true,
          mergeStrategy: MergeStrategy.REPLACE,
        }
      );

      expect(result1.imported.cells).toBe(1);

      // Test skip strategy with existing cells
      const existingCells = new Map([['imported-cell-1', new MockLogCell({
        id: 'imported-cell-1',
        type: CellType.INPUT,
        position: { row: 0, col: 0 },
      }) as any]]);

      const result2 = await importer.import(
        ImportSource.FILE,
        buffer,
        {
          source: ImportSource.FILE,
          validateSchema: true,
          mergeStrategy: MergeStrategy.SKIP,
        },
        existingCells
      );

      expect(result2.skipped.cells).toBe(1);
    });

    it('should detect and resolve conflicts', async () => {
      const json = JSON.stringify(validNetwork);
      const buffer = Buffer.from(json);

      const existingCells = new Map([['imported-cell-1', new MockLogCell({
        id: 'imported-cell-1',
        type: CellType.OUTPUT, // Different type = conflict
        position: { row: 0, col: 0 },
      }) as any]]);

      const result = await importer.import(
        ImportSource.FILE,
        buffer,
        {
          source: ImportSource.FILE,
          validateSchema: true,
          mergeStrategy: MergeStrategy.MERGE,
          conflictResolution: ConflictResolution.KEEP_IMPORT,
        },
        existingCells
      );

      expect(result.success).toBe(true);
    });

    it('should validate before importing', async () => {
      const invalidNetwork = { ...validNetwork, cells: [{ id: 'invalid' }] };
      const json = JSON.stringify(invalidNetwork);
      const buffer = Buffer.from(json);

      const result = await importer.import(
        ImportSource.FILE,
        buffer,
        { source: ImportSource.FILE, validateSchema: true }
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('SchemaValidator', () => {
    let validator: SchemaValidator;
    let validNetwork: NetworkExport;

    beforeEach(() => {
      validator = new SchemaValidator();
      validNetwork = {
        format: 'POLLN_NETWORK',
        version: '1.0.0',
        metadata: {
          name: 'Test Network',
          version: '1.0.0',
          formatVersion: '1.0.0',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        cells: [],
        connections: [],
      };
    });

    it('should validate correct network structure', () => {
      const result = validator.validateNetwork(validNetwork);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalid = { ...validNetwork };
      delete (invalid as any).format;

      const result = validator.validateNetwork(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('format'))).toBe(true);
    });

    it('should validate cell structure', () => {
      const invalidCell: any = {
        id: 'test',
        type: 'invalid_type',
        state: 'invalid_state',
        position: { row: 0, col: 0 },
        logicLevel: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        head: { inputs: [], sensations: [] },
        body: { memory: { limit: 100, records: [] }, selfModel: {} },
        tail: { outputs: [], effects: [] },
        origin: { position: { row: 0, col: 0 }, selfAwareness: 0, watchedCells: [] },
      };

      const result = validator.validateCell(invalidCell);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should check for circular dependencies', () => {
      const networkWithCycles = {
        ...validNetwork,
        cells: [
          {
            id: 'cell-1',
            type: CellType.INPUT,
            state: CellState.DORMANT,
            position: { row: 0, col: 0 },
            logicLevel: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1,
            head: { inputs: [], sensations: [] },
            body: { memory: { limit: 100, records: [] }, selfModel: {} },
            tail: { outputs: [], effects: [] },
            origin: { position: { row: 0, col: 0 }, selfAwareness: 0, watchedCells: [] },
          },
          {
            id: 'cell-2',
            type: CellType.OUTPUT,
            state: CellState.DORMANT,
            position: { row: 0, col: 1 },
            logicLevel: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1,
            head: { inputs: [], sensations: [] },
            body: { memory: { limit: 100, records: [] }, selfModel: {} },
            tail: { outputs: [], effects: [] },
            origin: { position: { row: 0, col: 1 }, selfAwareness: 0, watchedCells: [] },
          },
        ],
        connections: [
          {
            from: { id: 'cell-1', row: 0, col: 0 },
            to: { id: 'cell-2', row: 0, col: 1 },
            type: 'data',
          },
          {
            from: { id: 'cell-2', row: 0, col: 1 },
            to: { id: 'cell-1', row: 0, col: 0 },
            type: 'data',
          },
        ],
      };

      const result = validator.validateNetwork(networkWithCycles);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'circular')).toBe(true);
    });

    it('should validate version compatibility', () => {
      expect(validator.validateVersion('1.0.0')).toBe(true);
      expect(validator.validateVersion('0.9.0')).toBe(true);
      expect(validator.validateVersion('99.0.0')).toBe(false);
    });
  });

  describe('MigrationEngine', () => {
    let engine: MigrationEngine;

    beforeEach(() => {
      engine = new MigrationEngine();
    });

    it('should detect when migration is needed', () => {
      expect(engine.needsMigration('0.9.0', '1.0.0')).toBe(true);
      expect(engine.needsMigration('1.0.0', '1.0.0')).toBe(false);
    });

    it('should migrate from 0.9.0 to 1.0.0', async () => {
      const oldNetwork = {
        format: 'POLLN_NETWORK',
        version: '0.9.0',
        metadata: {
          name: 'Old Network',
          version: '0.9.0',
          formatVersion: '0.9.0',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        cells: [
          {
            id: 'cell-1',
            type: CellType.INPUT,
            state: CellState.DORMANT,
            position: { row: 0, col: 0 },
            logicLevel: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1,
            head: { inputs: [], sensations: [] },
            body: {
              memory: { limit: 100, records: [] },
              selfModel: {
                identity: CellType.INPUT,
                capabilities: [],
                performance: {
                  totalExecutions: 0,
                  successfulExecutions: 0,
                  averageConfidence: 0,
                  averageDuration: 0,
                },
                patterns: [],
                lastUpdated: Date.now(),
              },
            },
            tail: { outputs: [], effects: [] },
            origin: {
              position: { row: 0, col: 0 },
              selfAwareness: 0, // Already has the field
              watchedCells: [],
            },
          },
        ],
        connections: [],
      };

      const result = await engine.migrate(oldNetwork, '1.0.0');

      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe('0.9.0');
      expect(result.toVersion).toBe('1.0.0');
      expect(result.migratedCells).toBeGreaterThan(0);
    });

    it('should handle migration failure gracefully', async () => {
      const invalidNetwork = { format: 'INVALID', version: '0.8.0' };

      const result = await engine.migrate(invalidNetwork as any, '1.0.0');

      expect(result.success).toBe(false);
      expect(result.failedMigrations).toBeGreaterThan(0);
    });

    it('should find migration paths', () => {
      const paths = engine.getMigrationPaths('0.9.0', '1.0.0');

      expect(paths.length).toBeGreaterThan(0);
      expect(paths[0][0]).toBe('0.9.0');
      expect(paths[0][paths[0].length - 1]).toBe('1.0.0');
    });

    it('should register custom migration rules', () => {
      const customRule = {
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        description: 'Custom migration',
        transform: async (data: any) => data,
      };

      engine.registerRule(customRule);

      const paths = engine.getMigrationPaths('1.0.0', '2.0.0');
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full export-import cycle', async () => {
      const exporter = new Exporter();
      const importer = new Importer();

      const mockCells = [
        new MockLogCell({
          id: 'cycle-cell-1',
          type: CellType.INPUT,
          position: { row: 0, col: 0 },
        }),
        new MockLogCell({
          id: 'cycle-cell-2',
          type: CellType.OUTPUT,
          position: { row: 0, col: 1 },
        }),
      ];

      // Export
      const exportResult = await exporter.export(
        mockCells as any,
        { format: ExportFormat.JSON, pretty: true }
      );

      // Import
      const importResult = await importer.import(
        ImportSource.FILE,
        Buffer.from(exportResult.data),
        { source: ImportSource.FILE, validateSchema: true }
      );

      expect(importResult.success).toBe(true);
      expect(importResult.imported.cells).toBe(2);
    });

    it('should handle format conversion', async () => {
      const exporter = new Exporter();

      const mockCells = [new MockLogCell({
        id: 'convert-cell',
        type: CellType.TRANSFORM,
        position: { row: 0, col: 0 },
      })];

      // Export to different formats
      const jsonResult = await exporter.export(
        mockCells as any,
        { format: ExportFormat.JSON }
      );

      const csvResult = await exporter.export(
        mockCells as any,
        { format: ExportFormat.CSV }
      );

      expect(jsonResult.statistics.totalCells).toBe(1);
      expect(csvResult.statistics.totalCells).toBe(1);
    });

    it('should handle errors gracefully throughout the pipeline', async () => {
      const exporter = new Exporter();
      const importer = new Importer();

      // Invalid data
      const invalidData = Buffer.from('{ invalid json }');

      const result = await importer.import(
        ImportSource.FILE,
        invalidData,
        { source: ImportSource.FILE, validateSchema: true }
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
