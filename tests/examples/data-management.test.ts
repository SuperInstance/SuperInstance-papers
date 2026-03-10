/**
 * Test Data Management Examples - Demonstrates TestDataManager usage
 *
 * Run with: npm test data-management.test.ts
 */

import { describe, it, expect } from '@jest/globals';
import { TestDataManager } from '../../src/spreadsheet/testing';

describe('Test Data Management Examples', () => {
  describe('Data Generation', () => {
    it('should generate random test data', () => {
      const data = TestDataManager.generate({
        rows: 10,
        columns: 5,
        dataType: 'number',
        numberRange: [0, 100]
      });

      expect(data).toHaveLength(10);
      data.forEach(row => {
        expect(row).toHaveLength(5);
        row.forEach(value => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        });
      });
    });

    it('should generate different data types', () => {
      const numberData = TestDataManager.generate({
        rows: 5,
        columns: 3,
        dataType: 'number'
      });

      const stringData = TestDataManager.generate({
        rows: 5,
        columns: 3,
        dataType: 'string'
      });

      const booleanData = TestDataManager.generate({
        rows: 5,
        columns: 3,
        dataType: 'boolean'
      });

      expect(numberData[0][0]).toEqual(expect.any(Number));
      expect(stringData[0][0]).toEqual(expect.any(String));
      expect(booleanData[0][0]).toEqual(expect.any(Boolean));
    });

    it('should generate mixed data types', () => {
      const data = TestDataManager.generate({
        rows: 20,
        columns: 5,
        dataType: 'mixed'
      });

      expect(data.length).toBe(20);
      expect(data[0].length).toBe(5);

      // Should have various types
      const flatData = data.flat();
      const hasNumbers = flatData.some(v => typeof v === 'number');
      const hasStrings = flatData.some(v => typeof v === 'string');
      const hasBooleans = flatData.some(v => typeof v === 'boolean');

      expect(hasNumbers || hasStrings || hasBooleans).toBe(true);
    });

    it('should include null values', () => {
      const data = TestDataManager.generate({
        rows: 100,
        columns: 5,
        includeNulls: true
      });

      const flatData = data.flat();
      const hasNulls = flatData.some(v => v === null);

      expect(hasNulls).toBe(true);
    });

    it('should include errors', () => {
      const data = TestDataManager.generate({
        rows: 100,
        columns: 5,
        includeErrors: true
      });

      const flatData = data.flat();
      const hasErrors = flatData.some(v => v instanceof Error);

      expect(hasErrors).toBe(true);
    });

    it('should use seed for reproducibility', () => {
      const seed = 12345;

      const data1 = TestDataManager.generate({
        rows: 10,
        columns: 3,
        seed
      });

      const data2 = TestDataManager.generate({
        rows: 10,
        columns: 3,
        seed
      });

      expect(data1).toEqual(data2);
    });
  });

  describe('Spreadsheet Generation', () => {
    it('should generate a basic spreadsheet', () => {
      const spreadsheet = TestDataManager.generateSpreadsheet({
        name: 'Test Spreadsheet',
        rows: 5,
        columns: 3
      });

      expect(spreadsheet.id).toBeDefined();
      expect(spreadsheet.name).toBe('Test Spreadsheet');
      expect(Object.keys(spreadsheet.cells).length).toBe(15); // 5 * 3
    });

    it('should create cells with correct IDs', () => {
      const spreadsheet = TestDataManager.generateSpreadsheet({
        rows: 3,
        columns: 3
      });

      const cellIds = Object.keys(spreadsheet.cells);

      expect(cellIds).toContain('A1');
      expect(cellIds).toContain('B2');
      expect(cellIds).toContain('C3');
    });

    it('should infer cell types correctly', () => {
      const spreadsheet = TestDataManager.generateSpreadsheet({
        rows: 2,
        columns: 2
      });

      Object.values(spreadsheet.cells).forEach(cell => {
        expect(['number', 'string', 'boolean', 'date', 'array']).toContain(cell.type);
      });
    });
  });

  describe('Spreadsheet Templates', () => {
    it('should create financial spreadsheet', () => {
      const template = TestDataManager.createFinancialSpreadsheet();

      expect(template.name).toBe('Financial Report');
      expect(template.data.cells).toBeDefined();
      expect(template.metadata.category).toBe('financial');
      expect(template.metadata.difficulty).toBe('medium');
    });

    it('should have financial formulas', () => {
      const template = TestDataManager.createFinancialSpreadsheet();
      const cells = Object.values(template.data.cells);

      const formulaCells = cells.filter(c => c.formula);

      expect(formulaCells.length).toBeGreaterThan(0);
      formulaCells.forEach(cell => {
        expect(cell.formula).toMatch(/^=/);
      });
    });

    it('should create inventory spreadsheet', () => {
      const template = TestDataManager.createInventorySpreadsheet();

      expect(template.name).toBe('Inventory Tracker');
      expect(template.data.cells).toBeDefined();
      expect(template.metadata.category).toBe('inventory');
    });

    it('should have inventory items', () => {
      const template = TestDataManager.createInventorySpreadsheet();
      const cells = Object.values(template.data.cells);

      // Check for item names
      const itemCells = cells.filter(c => typeof c.value === 'string' && c.value.includes('Widget'));

      expect(itemCells.length).toBeGreaterThan(0);
    });

    it('should create project spreadsheet', () => {
      const template = TestDataManager.createProjectSpreadsheet();

      expect(template.name).toBe('Project Tracker');
      expect(template.data.cells).toBeDefined();
      expect(template.metadata.category).toBe('project');
    });

    it('should have project tasks', () => {
      const template = TestDataManager.createProjectSpreadsheet();
      const cells = Object.values(template.data.cells);

      // Check for task names
      const taskCells = cells.filter(c => typeof c.value === 'string' && c.value !== 'Task');

      expect(taskCells.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Case Data', () => {
    it('should generate empty cells edge case', () => {
      const edgeCases = TestDataManager.generateEdgeCases();

      expect(edgeCases.emptyCells).toBeDefined();
      expect(Object.keys(edgeCases.emptyCells.cells).length).toBeGreaterThan(0);

      const emptyValues = Object.values(edgeCases.emptyCells.cells)
        .map(c => c.value)
        .filter(v => v === '' || v === null || v === undefined);

      expect(emptyValues.length).toBeGreaterThan(0);
    });

    it('should generate circular references edge case', () => {
      const edgeCases = TestDataManager.generateEdgeCases();

      expect(edgeCases.circularReferences).toBeDefined();
      expect(edgeCases.circularReferences.cells.A1).toBeDefined();
      expect(edgeCases.circularReferences.cells.A1.dependencies).toContain('B1');
    });

    it('should generate long formulas edge case', () => {
      const edgeCases = TestDataManager.generateEdgeCases();

      expect(edgeCases.longFormulas).toBeDefined();
      expect(edgeCases.longFormulas.cells.Z1).toBeDefined();

      const formulaCell = edgeCases.longFormulas.cells.Z1;
      expect(formulaCell.formula).toBeDefined();
      expect(formulaCell.formula!.length).toBeGreaterThan(100);
    });

    it('should generate deep dependencies edge case', () => {
      const edgeCases = TestDataManager.generateEdgeCases();

      expect(edgeCases.deepDependencies).toBeDefined();
      expect(edgeCases.deepDependencies.cells.A1).toBeDefined();
      expect(edgeCases.deepDependencies.cells.A100).toBeDefined();
    });

    it('should generate mixed types edge case', () => {
      const edgeCases = TestDataManager.generateEdgeCases();

      expect(edgeCases.mixedTypes).toBeDefined();

      const types = Object.values(edgeCases.mixedTypes.cells).map(c => c.type);
      expect(types).toContain('number');
      expect(types).toContain('string');
      expect(types).toContain('boolean');
    });
  });

  describe('Performance Test Data', () => {
    it('should generate small performance dataset', () => {
      const data = TestDataManager.generatePerformanceData({
        size: 'small',
        complexity: 'simple'
      });

      expect(data.size).toBe('small');
      expect(data.complexity).toBe('simple');
      expect(data.cellCount).toBe(100); // 10 * 10
    });

    it('should generate medium performance dataset', () => {
      const data = TestDataManager.generatePerformanceData({
        size: 'medium',
        complexity: 'medium'
      });

      expect(data.size).toBe('medium');
      expect(data.cellCount).toBe(5000); // 100 * 50
    });

    it('should generate large performance dataset', () => {
      const data = TestDataManager.generatePerformanceData({
        size: 'large',
        complexity: 'complex'
      });

      expect(data.size).toBe('large');
      expect(data.cellCount).toBe(100000); // 1000 * 100
    });

    it('should include dependencies when requested', () => {
      const data = TestDataManager.generatePerformanceData({
        size: 'small',
        complexity: 'simple',
        includeDependencies: true
      });

      expect(data.dependencyCount).toBeGreaterThan(0);
    });

    it('should include formulas when requested', () => {
      const data = TestDataManager.generatePerformanceData({
        size: 'small',
        complexity: 'simple',
        includeFormulas: true
      });

      expect(data.formulaCount).toBeGreaterThan(0);
    });
  });

  describe('Template Management', () => {
    it('should register custom template', () => {
      const customTemplate = {
        name: 'Custom Template',
        description: 'A custom spreadsheet template',
        data: {
          id: 'custom-1',
          name: 'Custom Spreadsheet',
          cells: {
            A1: { id: 'A1', value: 'Custom', type: 'string', dependencies: [] }
          },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: '1.0.0'
          }
        },
        metadata: {
          category: 'custom',
          difficulty: 'simple' as const,
          useCases: ['testing']
        }
      };

      TestDataManager.registerTemplate(customTemplate);

      const retrieved = TestDataManager.getTemplate('Custom Template');
      expect(retrieved).toEqual(customTemplate);
    });

    it('should get all templates', () => {
      const templates = TestDataManager.getAllTemplates();

      expect(templates.length).toBeGreaterThanOrEqual(3);
      const names = templates.map(t => t.name);
      expect(names).toContain('Financial Report');
      expect(names).toContain('Inventory Tracker');
      expect(names).toContain('Project Tracker');
    });

    it('should get specific template', () => {
      const template = TestDataManager.getTemplate('Financial Report');

      expect(template).toBeDefined();
      expect(template?.name).toBe('Financial Report');
    });
  });

  describe('Dataset Management', () => {
    it('should save and load dataset', () => {
      const dataset = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ];

      TestDataManager.saveDataset('test-dataset', dataset);
      const loaded = TestDataManager.loadDataset('test-dataset');

      expect(loaded).toEqual(dataset);
    });

    it('should return undefined for non-existent dataset', () => {
      const loaded = TestDataManager.loadDataset('non-existent');
      expect(loaded).toBeUndefined();
    });
  });

  describe('Real-World Data Scenarios', () => {
    it('should simulate sales data', () => {
      const data = TestDataManager.generate({
        rows: 12, // 12 months
        columns: 4, // Region, Sales, Costs, Profit
        dataType: 'number',
        numberRange: [1000, 50000]
      });

      expect(data.length).toBe(12);
      data.forEach(month => {
        expect(month.length).toBe(4);
        expect(month[1]).toBeGreaterThan(1000); // Sales
      });
    });

    it('should simulate user activity', () => {
      const data = TestDataManager.generate({
        rows: 100, // 100 users
        columns: 5, // Various metrics
        dataType: 'mixed',
        includeNulls: true
      });

      expect(data.length).toBe(100);

      // Check for variety
      const userIds = data.map(row => row[0]);
      const uniqueIds = new Set(userIds);
      expect(uniqueIds.size).toBe(100);
    });

    it('should simulate time-series data', () => {
      const data = TestDataManager.generate({
        rows: 365, // Daily data for a year
        columns: 1, // Single value
        dataType: 'number',
        numberRange: [0, 100]
      });

      expect(data.length).toBe(365);

      // Check trend (values should vary)
      const values = data.map(row => row[0]);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBeGreaterThan(1);
    });
  });

  describe('Data Quality Features', () => {
    it('should generate consistent data with seed', () => {
      const config = {
        rows: 50,
        columns: 10,
        seed: 42,
        dataType: 'number' as const
      };

      const dataset1 = TestDataManager.generate(config);
      const dataset2 = TestDataManager.generate(config);

      expect(dataset1).toEqual(dataset2);
    });

    it('should handle large datasets efficiently', () => {
      const start = Date.now();

      const data = TestDataManager.generate({
        rows: 10000,
        columns: 20,
        dataType: 'number'
      });

      const duration = Date.now() - start;

      expect(data.length).toBe(10000);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should generate realistic value ranges', () => {
      const data = TestDataManager.generate({
        rows: 100,
        columns: 5,
        dataType: 'number',
        numberRange: [1000, 2000]
      });

      data.forEach(row => {
        row.forEach(value => {
          expect(value).toBeGreaterThanOrEqual(1000);
          expect(value).toBeLessThanOrEqual(2000);
        });
      });
    });
  });
});
