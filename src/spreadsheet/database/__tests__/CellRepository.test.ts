/**
 * Tests for CellRepository
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CellRepository } from '../CellRepository.js';
import { DatabaseManager } from '../DatabaseManager.js';
import type { CreateCellDTO, UpdateCellDTO } from '../types.js';
import { CellType } from '../../core/types.js';

// Mock DatabaseManager
jest.mock('../DatabaseManager.js');

describe('CellRepository', () => {
  let repository: CellRepository;
  let mockDb: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
      cacheGet: jest.fn(),
      cacheSet: jest.fn(),
      cacheDelete: jest.fn(),
      cacheDeletePattern: jest.fn(),
      initialize: jest.fn(),
      close: jest.fn(),
      healthCheck: jest.fn(),
      getClient: jest.fn(),
      getRedisClient: jest.fn(),
      getPostgreSQLPool: jest.fn(),
      isReady: jest.fn(),
      getPoolStats: jest.fn(),
    } as any;

    repository = new CellRepository(mockDb);
  });

  describe('findById', () => {
    it('should return null when cell not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['non-existent-id']
      );
    });

    it('should return cell when found', async () => {
      const mockCell = {
        id: 'cell-1',
        spreadsheetId: 'sheet-1',
        row: 1,
        col: 1,
        type: CellType.INPUT,
        state: 'dormant',
        value: 42,
        formula: null,
        logicLevel: 0,
        metadata: {},
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastExecutedAt: null,
      };

      mockDb.query.mockResolvedValue({ rows: [mockCell] });

      const result = await repository.findById('cell-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('cell-1');
    });
  });

  describe('create', () => {
    it('should create a new cell', async () => {
      const dto: CreateCellDTO = {
        spreadsheetId: 'sheet-1',
        row: 1,
        col: 1,
        type: CellType.INPUT,
        value: 42,
      };

      const mockCell = {
        id: 'cell-1',
        ...dto,
        state: 'dormant',
        formula: null,
        logicLevel: 0,
        metadata: {},
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastExecutedAt: null,
      };

      mockDb.query.mockResolvedValue({ rows: [mockCell] });

      const result = await repository.create(dto);

      expect(result.id).toBe('cell-1');
      expect(result.spreadsheetId).toBe(dto.spreadsheetId);
      expect(mockDb.cacheDeletePattern).toHaveBeenCalledWith(
        expect.stringContaining('sheet-1')
      );
    });

    it('should use provided ID if given', async () => {
      const dto: CreateCellDTO = {
        id: 'custom-id',
        spreadsheetId: 'sheet-1',
        row: 1,
        col: 1,
        type: CellType.INPUT,
      };

      const mockCell = {
        ...dto,
        state: 'dormant',
        value: null,
        formula: null,
        logicLevel: 0,
        metadata: {},
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastExecutedAt: null,
      };

      mockDb.query.mockResolvedValue({ rows: [mockCell] });

      const result = await repository.create(dto);

      expect(result.id).toBe('custom-id');
    });
  });

  describe('update', () => {
    it('should update an existing cell', async () => {
      const existingCell = {
        id: 'cell-1',
        spreadsheetId: 'sheet-1',
        row: 1,
        col: 1,
        type: CellType.INPUT,
        state: 'dormant',
        value: 42,
        formula: null,
        logicLevel: 0,
        metadata: {},
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastExecutedAt: null,
      };

      const updates: UpdateCellDTO = {
        value: 100,
      };

      const updatedCell = {
        ...existingCell,
        value: 100,
        version: 2,
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [existingCell] })
        .mockResolvedValueOnce({ rows: [updatedCell] });

      const result = await repository.update('cell-1', updates);

      expect(result.value).toBe(100);
      expect(result.version).toBe(2);
    });

    it('should throw NotFoundError when cell does not exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await expect(
        repository.update('non-existent', { value: 100 })
      ).rejects.toThrow('Cell non-existent not found');
    });

    it('should check version for optimistic locking', async () => {
      const existingCell = {
        id: 'cell-1',
        spreadsheetId: 'sheet-1',
        row: 1,
        col: 1,
        type: CellType.INPUT,
        state: 'dormant',
        value: 42,
        formula: null,
        logicLevel: 0,
        metadata: {},
        version: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastExecutedAt: null,
      };

      mockDb.query.mockResolvedValue({ rows: [existingCell] });

      await expect(
        repository.update('cell-1', { value: 100 }, 1)
      ).rejects.toThrow('version mismatch');
    });
  });

  describe('delete', () => {
    it('should delete an existing cell', async () => {
      const existingCell = {
        id: 'cell-1',
        spreadsheetId: 'sheet-1',
        row: 1,
        col: 1,
        type: CellType.INPUT,
        state: 'dormant',
        value: 42,
        formula: null,
        logicLevel: 0,
        metadata: {},
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastExecutedAt: null,
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [existingCell] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await repository.delete('cell-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM cells'),
        ['cell-1']
      );
    });

    it('should throw NotFoundError when cell does not exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await expect(repository.delete('non-existent')).rejects.toThrow(
        'Cell non-existent not found'
      );
    });
  });

  describe('findByRange', () => {
    it('should return cells in specified range', async () => {
      const mockCells = [
        {
          id: 'cell-1',
          spreadsheetId: 'sheet-1',
          row: 1,
          col: 1,
          type: CellType.INPUT,
          state: 'dormant',
          value: 42,
          formula: null,
          logicLevel: 0,
          metadata: {},
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastExecutedAt: null,
        },
        {
          id: 'cell-2',
          spreadsheetId: 'sheet-1',
          row: 2,
          col: 2,
          type: CellType.INPUT,
          state: 'dormant',
          value: 43,
          formula: null,
          logicLevel: 0,
          metadata: {},
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastExecutedAt: null,
        },
      ];

      mockDb.query.mockResolvedValue({ rows: mockCells });

      const result = await repository.findByRange('sheet-1', {
        startRow: 1,
        endRow: 5,
        startCol: 1,
        endCol: 5,
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('cell-1');
      expect(result[1].id).toBe('cell-2');
    });
  });

  describe('batch operations', () => {
    it('should create multiple cells in a transaction', async () => {
      const dtos: CreateCellDTO[] = [
        {
          spreadsheetId: 'sheet-1',
          row: 1,
          col: 1,
          type: CellType.INPUT,
          value: 42,
        },
        {
          spreadsheetId: 'sheet-1',
          row: 1,
          col: 2,
          type: CellType.INPUT,
          value: 43,
        },
      ];

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockTx = {
          query: jest.fn().mockResolvedValue({
            rows: [
              {
                id: 'cell-1',
                ...dtos[0],
                state: 'dormant',
                formula: null,
                logicLevel: 0,
                metadata: {},
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastExecutedAt: null,
              },
              {
                id: 'cell-2',
                ...dtos[1],
                state: 'dormant',
                formula: null,
                logicLevel: 0,
                metadata: {},
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastExecutedAt: null,
              },
            ],
          }),
        };

        return await callback(mockTx as any);
      });

      const result = await repository.batchCreate(dtos);

      expect(result).toHaveLength(2);
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should handle empty batch', async () => {
      const result = await repository.batchCreate([]);

      expect(result).toHaveLength(0);
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });
  });

  describe('findByPosition', () => {
    it('should return cell at specific position', async () => {
      const mockCell = {
        id: 'cell-1',
        spreadsheetId: 'sheet-1',
        row: 1,
        col: 1,
        type: CellType.INPUT,
        state: 'dormant',
        value: 42,
        formula: null,
        logicLevel: 0,
        metadata: {},
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastExecutedAt: null,
      };

      mockDb.query.mockResolvedValue({ rows: [mockCell] });

      const result = await repository.findByPosition('sheet-1', 1, 1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('cell-1');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('row = $2 AND col = $3'),
        ['sheet-1', 1, 1]
      );
    });

    it('should return null when no cell at position', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await repository.findByPosition('sheet-1', 999, 999);

      expect(result).toBeNull();
    });
  });
});
