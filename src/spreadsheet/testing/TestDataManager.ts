/**
 * TestDataManager - Generate and manage test data for spreadsheet testing
 *
 * Provides:
 * - Test data generators
 * - Sample spreadsheets
 * - Realistic datasets
 * - Edge case data
 * - Performance test data
 *
 * @module testing
 */

import type {
  CellData,
  SpreadsheetData,
  CellType
} from '../types';

/**
 * Generated test data configuration
 */
export interface TestDataConfig {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Data type to generate */
  dataType?: 'number' | 'string' | 'date' | 'boolean' | 'mixed';
  /** Value range for numbers */
  numberRange?: [number, number];
  /** Include null values */
  includeNulls?: boolean;
  /** Include errors */
  includeErrors?: boolean;
  /** Random seed for reproducibility */
  seed?: number;
}

/**
 * Sample spreadsheet template
 */
export interface SpreadsheetTemplate {
  name: string;
  description: string;
  data: SpreadsheetData;
  metadata: {
    category: string;
    difficulty: 'simple' | 'medium' | 'complex';
    useCases: string[];
  };
}

/**
 * Performance test data configuration
 */
export interface PerformanceTestConfig {
  /** Dataset size */
  size: 'small' | 'medium' | 'large' | 'xlarge';
  /** Data complexity */
  complexity: 'simple' | 'medium' | 'complex';
  /** Include dependencies */
  includeDependencies?: boolean;
  /** Include formulas */
  includeFormulas?: boolean;
}

/**
 * Seeded random number generator
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  nextBoolean(): boolean {
    return this.next() > 0.5;
  }

  nextItem<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

/**
 * Manager for test data generation and management
 */
export class TestDataManager {
  private static templates: Map<string, SpreadsheetTemplate> = new Map();
  private static datasets: Map<string, any[]> = new Map();

  /**
   * Generate random test data
   *
   * @param config - Data generation configuration
   * @returns Generated data array
   *
   * @example
   * ```typescript
   * const data = TestDataManager.generate({
   *   rows: 100,
   *   columns: 5,
   *   dataType: 'number',
   *   numberRange: [0, 100]
   * });
   * ```
   */
  static generate(config: TestDataConfig = {}): any[][] {
    const {
      rows = 10,
      columns = 5,
      dataType = 'mixed',
      numberRange = [0, 100],
      includeNulls = false,
      includeErrors = false,
      seed = Date.now()
    } = config;

    const random = new SeededRandom(seed);
    const data: any[][] = [];

    for (let row = 0; row < rows; row++) {
      const rowData: any[] = [];

      for (let col = 0; col < columns; col++) {
        // Include nulls randomly
        if (includeNulls && random.nextBoolean() && random.nextBoolean()) {
          rowData.push(null);
          continue;
        }

        // Include errors randomly
        if (includeErrors && random.nextBoolean() && random.nextBoolean()) {
          rowData.push(new Error(`Test error at [${row},${col}]`));
          continue;
        }

        // Generate value based on data type
        switch (dataType) {
          case 'number':
            rowData.push(random.nextFloat(numberRange[0], numberRange[1]));
            break;

          case 'string':
            rowData.push(this.generateRandomString(random, 5, 20));
            break;

          case 'date':
            rowData.push(this.generateRandomDate(random));
            break;

          case 'boolean':
            rowData.push(random.nextBoolean());
            break;

          case 'mixed':
            rowData.push(this.generateMixedValue(random, numberRange));
            break;
        }
      }

      data.push(rowData);
    }

    return data;
  }

  /**
   * Generate a sample spreadsheet
   *
   * @param config - Spreadsheet configuration
   * @returns Spreadsheet data
   */
  static generateSpreadsheet(config: {
    name?: string;
    rows?: number;
    columns?: number;
  } = {}): SpreadsheetData {
    const { name = 'Test Spreadsheet', rows = 10, columns = 5 } = config;

    const data = this.generate({ rows, columns });
    const cells: Record<string, CellData> = {};

    // Convert 2D array to cell map
    data.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        const cellId = `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`;
        cells[cellId] = {
          id: cellId,
          value,
          formula: undefined,
          type: this.inferCellType(value),
          dependencies: []
        };
      });
    });

    return {
      id: `spreadsheet-${Date.now()}`,
      name,
      cells,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Create a financial spreadsheet template
   */
  static createFinancialSpreadsheet(): SpreadsheetTemplate {
    const data: any[][] = [
      ['Item', 'Q1', 'Q2', 'Q3', 'Q4', 'Total'],
      ['Revenue', 100000, 120000, 110000, 140000, '=SUM(B2:E2)'],
      ['Expenses', 80000, 85000, 90000, 95000, '=SUM(B3:E3)'],
      ['Profit', '=B2-B3', '=C2-C3', '=D2-D3', '=E2-E3', '=SUM(B4:E4)'],
      ['Margin', '=B4/B2', '=C4/C2', '=D4/D2', '=E4/E2', '=AVERAGE(B5:E5)']
    ];

    const cells: Record<string, CellData> = {};

    data.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        const cellId = `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`;
        const isFormula = typeof value === 'string' && value.startsWith('=');

        cells[cellId] = {
          id: cellId,
          value: isFormula ? 0 : value,
          formula: isFormula ? value : undefined,
          type: isFormula ? 'formula' : this.inferCellType(value),
          dependencies: isFormula ? this.extractDependencies(value) : []
        };
      });
    });

    return {
      name: 'Financial Report',
      description: 'Quarterly financial report with calculations',
      data: {
        id: 'financial-1',
        name: 'Financial Report',
        cells,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      metadata: {
        category: 'financial',
        difficulty: 'medium',
        useCases: ['profit-analysis', 'trend-analysis', 'forecasting']
      }
    };
  }

  /**
   * Create an inventory tracking spreadsheet
   */
  static createInventorySpreadsheet(): SpreadsheetTemplate {
    const items = ['Widget A', 'Widget B', 'Gadget X', 'Gadget Y', 'Tool Z'];
    const data: any[][] = [
      ['Item', 'Stock', 'Price', 'Value', 'Reorder'],
      ...items.map(item => [
        item,
        Math.floor(Math.random() * 1000),
        (Math.random() * 100).toFixed(2),
        '=B{row}*C{row}',
        '=IF(B{row}<100,"Yes","No")'
      ])
    ];

    const cells: Record<string, CellData> = {};

    data.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        const cellId = `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`;
        let processedValue = value;

        // Replace row placeholders in formulas
        if (typeof value === 'string' && value.includes('{row}')) {
          processedValue = value.replace(/{row}/g, String(rowIndex + 1));
        }

        const isFormula = typeof processedValue === 'string' && processedValue.startsWith('=');

        cells[cellId] = {
          id: cellId,
          value: isFormula ? 0 : processedValue,
          formula: isFormula ? processedValue : undefined,
          type: isFormula ? 'formula' : this.inferCellType(processedValue),
          dependencies: isFormula ? this.extractDependencies(processedValue) : []
        };
      });
    });

    return {
      name: 'Inventory Tracker',
      description: 'Inventory management with automatic calculations',
      data: {
        id: 'inventory-1',
        name: 'Inventory Tracker',
        cells,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      metadata: {
        category: 'inventory',
        difficulty: 'simple',
        useCases: ['stock-management', 'value-tracking', 'reorder-alerts']
      }
    };
  }

  /**
   * Create a project tracking spreadsheet
   */
  static createProjectSpreadsheet(): SpreadsheetTemplate {
    const data: any[][] = [
      ['Task', 'Owner', 'Status', 'Priority', 'Due Date', 'Days Left'],
      ['Design', 'Alice', 'In Progress', 'High', '2025-12-31', '=DAYS(TODAY(),E2)'],
      ['Development', 'Bob', 'Not Started', 'High', '2026-01-15', '=DAYS(TODAY(),E3)'],
      ['Testing', 'Charlie', 'Not Started', 'Medium', '2026-01-30', '=DAYS(TODAY(),E4)'],
      ['Documentation', 'Diana', 'Complete', 'Low', '2026-01-10', '=DAYS(TODAY(),E5)']
    ];

    const cells: Record<string, CellData> = {};

    data.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        const cellId = `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`;
        const isFormula = typeof value === 'string' && value.startsWith('=');

        cells[cellId] = {
          id: cellId,
          value: isFormula ? 0 : value,
          formula: isFormula ? value : undefined,
          type: isFormula ? 'formula' : this.inferCellType(value),
          dependencies: isFormula ? this.extractDependencies(value) : []
        };
      });
    });

    return {
      name: 'Project Tracker',
      description: 'Project task management with status tracking',
      data: {
        id: 'project-1',
        name: 'Project Tracker',
        cells,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      metadata: {
        category: 'project',
        difficulty: 'simple',
        useCases: ['task-tracking', 'deadline-management', 'status-reporting']
      }
    };
  }

  /**
   * Generate edge case test data
   */
  static generateEdgeCases(): {
    emptyCells: SpreadsheetData;
    circularReferences: SpreadsheetData;
    longFormulas: SpreadsheetData;
    deepDependencies: SpreadsheetData;
    mixedTypes: SpreadsheetData;
  } {
    // Empty cells
    const emptyCells: SpreadsheetData = {
      id: 'edge-empty',
      name: 'Empty Cells',
      cells: {
        A1: { id: 'A1', value: '', type: 'string', dependencies: [] },
        A2: { id: 'A2', value: null, type: 'string', dependencies: [] },
        A3: { id: 'A3', value: undefined, type: 'string', dependencies: [] }
      },
      metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: '1.0.0' }
    };

    // Circular references
    const circularRefs: SpreadsheetData = {
      id: 'edge-circular',
      name: 'Circular References',
      cells: {
        A1: { id: 'A1', value: 0, formula: '=B1', type: 'formula', dependencies: ['B1'] },
        B1: { id: 'B1', value: 0, formula: '=C1', type: 'formula', dependencies: ['C1'] },
        C1: { id: 'C1', value: 0, formula: '=A1', type: 'formula', dependencies: ['A1'] }
      },
      metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: '1.0.0' }
    };

    // Long formulas
    const longFormula = Array.from({ length: 50 }, (_, i) => `A${i + 1}`).join('+');
    const longFormulas: SpreadsheetData = {
      id: 'edge-long',
      name: 'Long Formulas',
      cells: {
        Z1: {
          id: 'Z1',
          value: 0,
          formula: `=${longFormula}`,
          type: 'formula',
          dependencies: Array.from({ length: 50 }, (_, i) => `A${i + 1}`)
        }
      },
      metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: '1.0.0' }
    };

    // Deep dependencies
    const deepDeps: SpreadsheetData = {
      id: 'edge-deep',
      name: 'Deep Dependencies',
      cells: {}
    };
    deepDeps.cells.A100 = { id: 'A100', value: 1, type: 'number', dependencies: [] };
    for (let i = 99; i >= 1; i--) {
      deepDeps.cells[`A${i}`] = {
        id: `A${i}`,
        value: 0,
        formula: `=A${i + 1}+1`,
        type: 'formula',
        dependencies: [`A${i + 1}`]
      };
    }

    // Mixed types
    const mixedTypes: SpreadsheetData = {
      id: 'edge-mixed',
      name: 'Mixed Types',
      cells: {
        A1: { id: 'A1', value: 123, type: 'number', dependencies: [] },
        A2: { id: 'A2', value: 'hello', type: 'string', dependencies: [] },
        A3: { id: 'A3', value: true, type: 'boolean', dependencies: [] },
        A4: { id: 'A4', value: new Date('2025-01-01'), type: 'date', dependencies: [] },
        A5: { id: 'A5', value: null, type: 'string', dependencies: [] },
        A6: { id: 'A6', value: [1, 2, 3], type: 'array', dependencies: [] }
      },
      metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: '1.0.0' }
    };

    return {
      emptyCells,
      circularReferences: circularRefs,
      longFormulas,
      deepDependencies: deepDeps,
      mixedTypes
    };
  }

  /**
   * Generate performance test data
   *
   * @param config - Performance test configuration
   * @returns Performance test dataset
   */
  static generatePerformanceData(config: PerformanceTestConfig): {
    size: string;
    complexity: string;
    cellCount: number;
    dependencyCount: number;
    formulaCount: number;
    data: SpreadsheetData;
  } {
    const sizeMap = {
      small: { rows: 10, cols: 10 },
      medium: { rows: 100, cols: 50 },
      large: { rows: 1000, cols: 100 },
      xlarge: { rows: 10000, cols: 200 }
    };

    const { rows, cols } = sizeMap[config.size];
    const cells: Record<string, CellData> = {};
    let dependencyCount = 0;
    let formulaCount = 0;

    for (let row = 1; row <= rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellId = `${String.fromCharCode(65 + (col % 26))}${row}`;
        const isFormula = config.includeFormulas && Math.random() > 0.7;

        if (isFormula) {
          formulaCount++;
          const depCount = config.includeDependencies ? Math.floor(Math.random() * 5) : 0;
          const dependencies: string[] = [];

          for (let d = 0; d < depCount; d++) {
            const depRow = Math.max(1, row - Math.floor(Math.random() * 10));
            const depCol = Math.max(0, col - Math.floor(Math.random() * 5));
            dependencies.push(`${String.fromCharCode(65 + (depCol % 26))}${depRow}`);
          }

          dependencyCount += dependencies.length;

          cells[cellId] = {
            id: cellId,
            value: 0,
            formula: dependencies.length > 0 ? `=${dependencies[0]}` : undefined,
            type: 'formula',
            dependencies
          };
        } else {
          cells[cellId] = {
            id: cellId,
            value: Math.random() * 1000,
            type: 'number',
            dependencies: []
          };
        }
      }
    }

    return {
      size: config.size,
      complexity: config.complexity,
      cellCount: rows * cols,
      dependencyCount,
      formulaCount,
      data: {
        id: `perf-${config.size}-${config.complexity}`,
        name: `Performance Test ${config.size}`,
        cells,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      }
    };
  }

  /**
   * Register a custom spreadsheet template
   */
  static registerTemplate(template: SpreadsheetTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Get a registered template
   */
  static getTemplate(name: string): SpreadsheetTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Get all registered templates
   */
  static getAllTemplates(): SpreadsheetTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Save a dataset for later use
   */
  static saveDataset(name: string, data: any[]): void {
    this.datasets.set(name, data);
  }

  /**
   * Load a saved dataset
   */
  static loadDataset(name: string): any[] | undefined {
    return this.datasets.get(name);
  }

  /**
   * Generate a random string
   */
  private static generateRandomString(random: SeededRandom, minLength: number, maxLength: number): string {
    const length = random.nextInt(minLength, maxLength);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars[random.nextInt(0, chars.length - 1)];
    }

    return result;
  }

  /**
   * Generate a random date
   */
  private static generateRandomDate(random: SeededRandom): Date {
    const start = new Date(2020, 0, 1);
    const end = new Date(2026, 11, 31);
    const date = new Date(start.getTime() + random.nextFloat(0, 1) * (end.getTime() - start.getTime()));
    return date;
  }

  /**
   * Generate a mixed value
   */
  private static generateMixedValue(random: SeededRandom, numberRange: [number, number]): any {
    const types = ['number', 'string', 'boolean', 'date'];
    const type = random.nextItem(types);

    switch (type) {
      case 'number':
        return random.nextFloat(numberRange[0], numberRange[1]);
      case 'string':
        return this.generateRandomString(random, 5, 15);
      case 'boolean':
        return random.nextBoolean();
      case 'date':
        return this.generateRandomDate(random);
      default:
        return null;
    }
  }

  /**
   * Infer cell type from value
   */
  private static inferCellType(value: any): CellType {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    return 'string';
  }

  /**
   * Extract cell dependencies from formula
   */
  private static extractDependencies(formula: string): string[] {
    const matches = formula.match(/[A-Z]+\d+/g);
    return matches || [];
  }
}
