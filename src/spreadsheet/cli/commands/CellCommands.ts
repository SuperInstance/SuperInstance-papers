/**
 * Cell Commands - Cell Operations
 *
 * Commands for reading, writing, and querying cells.
 *
 * @module CellCommands
 */

import fs from 'fs/promises';
import path from 'path';
import { OutputFormatter } from '../utils/OutputFormatter.js';
import { ConfigManager } from '../utils/ConfigManager.js';

/**
 * Cell data structure
 */
interface Cell {
  value: any;
  type: 'string' | 'number' | 'boolean' | 'formula' | 'error';
  formula?: string;
  dependencies?: string[];
  computed?: boolean;
  lastModified: string;
  history?: CellHistory[];
}

/**
 * Cell history entry
 */
interface CellHistory {
  value: any;
  timestamp: string;
  changedBy?: string;
}

/**
 * Cell batch operation
 */
interface BatchOperation {
  action: 'set' | 'delete' | 'copy';
  cellRef: string;
  value?: any;
  formula?: string;
  sourceRef?: string;
}

/**
 * Spreadsheet data structure
 */
interface SpreadsheetData {
  id: string;
  name: string;
  cells: Record<string, Cell>;
  dimensions: {
    rows: number;
    cols: number;
  };
}

/**
 * CellCommands class
 *
 * Handles all cell-related CLI operations.
 */
export class CellCommands {
  private config: ConfigManager;
  private sheetsDir: string;

  constructor(config: ConfigManager) {
    this.config = config;
    this.sheetsDir = path.join(this.config.getDataDir(), 'sheets');
  }

  /**
   * Get sheet file path
   */
  private getSheetPath(id: string): string {
    return path.join(this.sheetsDir, `${id}.json`);
  }

  /**
   * Load spreadsheet data
   */
  private async loadSheet(id: string): Promise<SpreadsheetData> {
    try {
      const sheetPath = this.getSheetPath(id);
      const content = await fs.readFile(sheetPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load spreadsheet: ${error}`);
    }
  }

  /**
   * Save spreadsheet data
   */
  private async saveSheet(data: SpreadsheetData): Promise<void> {
    try {
      const sheetPath = this.getSheetPath(data.id);
      data.name = data.name || 'Untitled';
      await fs.writeFile(sheetPath, JSON.stringify(data, null, 2));

      // Update metadata modified time
      const metaPath = path.join(this.sheetsDir, `${data.id}.meta.json`);
      try {
        const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
        meta.modifiedAt = new Date().toISOString();
        await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      } catch {
        // Metadata file might not exist, ignore
      }
    } catch (error) {
      throw new Error(`Failed to save spreadsheet: ${error}`);
    }
  }

  /**
   * Parse cell reference
   */
  private parseCellRef(ref: string): { col: number; row: number } | null {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;

    const colStr = match[1];
    const row = parseInt(match[2]);

    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }

    return { col, row };
  }

  /**
   * Validate cell reference
   */
  private validateCellRef(ref: string): boolean {
    return this.parseCellRef(ref) !== null;
  }

  /**
   * Infer value type
   */
  private inferType(value: string): Cell['type'] {
    if (value.startsWith('=')) {
      return 'formula';
    }
    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
      return 'boolean';
    }
    if (!isNaN(Number(value))) {
      return 'number';
    }
    return 'string';
  }

  /**
   * Parse value with type
   */
  private parseValue(value: string, type: Cell['type']): any {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'formula':
        return value.substring(1); // Remove '=' prefix
      default:
        return value;
    }
  }

  /**
   * Get cell value and metadata
   *
   * @param sheetId - Spreadsheet ID
   * @param cellRef - Cell reference (e.g., A1)
   * @param options - Get options
   */
  async get(sheetId: string, cellRef: string, options: {
    history?: boolean;
    dependencies?: boolean;
  }): Promise<void> {
    try {
      if (!this.validateCellRef(cellRef)) {
        OutputFormatter.error(`Invalid cell reference: ${cellRef}`);
        process.exit(1);
      }

      const data = await this.loadSheet(sheetId);
      const cell = data.cells[cellRef];

      OutputFormatter.header(`Cell ${cellRef}`);

      if (!cell) {
        OutputFormatter.info('Cell is empty');
        return;
      }

      OutputFormatter.subheader('Value');
      OutputFormatter.kv('Type', cell.type);
      OutputFormatter.kv('Value', cell.value);

      if (cell.formula) {
        OutputFormatter.kv('Formula', cell.formula);
      }

      OutputFormatter.kv('Last Modified', new Date(cell.lastModified).toLocaleString());

      if (options.dependencies && cell.dependencies) {
        OutputFormatter.newline();
        OutputFormatter.subheader('Dependencies');
        cell.dependencies.forEach(dep => {
          OutputFormatter.list(dep);
        });
      }

      if (options.history && cell.history) {
        OutputFormatter.newline();
        OutputFormatter.subheader('History');
        cell.history.forEach((entry, idx) => {
          OutputFormatter.list(`${idx + 1}. ${entry.value} (${new Date(entry.timestamp).toLocaleString()})`);
        });
      }

    } catch (error) {
      throw new Error(`Failed to get cell: ${error}`);
    }
  }

  /**
   * Set cell value
   *
   * @param sheetId - Spreadsheet ID
   * @param cellRef - Cell reference
   * @param value - New value
   * @param options - Set options
   */
  async set(
    sheetId: string,
    cellRef: string,
    value: string,
    options: {
      type?: string;
      formula?: boolean;
      noCalculate?: boolean;
    }
  ): Promise<void> {
    try {
      if (!this.validateCellRef(cellRef)) {
        OutputFormatter.error(`Invalid cell reference: ${cellRef}`);
        process.exit(1);
      }

      const data = await this.loadSheet(sheetId);

      // Determine type
      let cellType: Cell['type'] = 'string';
      if (options.formula) {
        cellType = 'formula';
      } else if (options.type && options.type !== 'auto') {
        cellType = options.type as Cell['type'];
      } else {
        cellType = this.inferType(value);
      }

      // Parse value
      let parsedValue: any;
      let formula: string | undefined;

      if (cellType === 'formula') {
        formula = options.formula ? value : value.substring(1);
        parsedValue = value; // Store original formula
      } else {
        parsedValue = this.parseValue(value, cellType);
      }

      // Get existing cell
      const existing = data.cells[cellRef];

      // Create history entry
      const historyEntry: CellHistory = {
        value: existing?.value,
        timestamp: new Date().toISOString()
      };

      // Create/update cell
      const cell: Cell = {
        value: parsedValue,
        type: cellType,
        formula,
        computed: cellType === 'formula',
        lastModified: new Date().toISOString(),
        history: [...(existing?.history || []), historyEntry].slice(-10) // Keep last 10
      };

      // Extract dependencies from formula
      if (formula) {
        cell.dependencies = this.extractDependencies(formula);
      }

      data.cells[cellRef] = cell;

      await this.saveSheet(data);

      OutputFormatter.success(`Cell ${cellRef} updated`);
      OutputFormatter.kv('Type', cellType);
      OutputFormatter.kv('Value', parsedValue);

      if (cell.dependencies && cell.dependencies.length > 0) {
        OutputFormatter.info(`Dependencies: ${cell.dependencies.join(', ')}`);

        if (!options.noCalculate) {
          OutputFormatter.info('Recalculating dependencies...');
          await this.recalculateDependents(sheetId, cellRef);
        }
      }

    } catch (error) {
      throw new Error(`Failed to set cell: ${error}`);
    }
  }

  /**
   * Extract cell dependencies from formula
   */
  private extractDependencies(formula: string): string[] {
    const refs = formula.match(/[A-Z]+\d+/g) || [];
    return [...new Set(refs)]; // Unique refs
  }

  /**
   * Recalculate cells that depend on a changed cell
   */
  private async recalculateDependents(sheetId: string, changedRef: string): Promise<void> {
    // This would trigger recalculation of dependent cells
    // For now, just indicate it would happen
    OutputFormatter.info(`Note: Cells depending on ${changedRef} would be recalculated`);
  }

  /**
   * Perform batch cell operations
   *
   * @param sheetId - Spreadsheet ID
   * @param options - Batch options
   */
  async batch(sheetId: string, options: {
    file?: string;
    json?: string;
  }): Promise<void> {
    try {
      let operations: BatchOperation[];

      if (options.file) {
        const content = await fs.readFile(options.file, 'utf-8');
        operations = JSON.parse(content);
      } else if (options.json) {
        operations = JSON.parse(options.json);
      } else {
        OutputFormatter.error('Either --file or --json must be provided');
        process.exit(1);
      }

      OutputFormatter.header('Batch Operations');
      OutputFormatter.info(`Processing ${operations.length} operations...`);

      const data = await this.loadSheet(sheetId);

      let successCount = 0;
      let errorCount = 0;

      for (const op of operations) {
        try {
          if (op.action === 'set') {
            const cell: Cell = {
              value: op.value,
              type: this.inferType(String(op.value)),
              lastModified: new Date().toISOString()
            };

            if (op.formula) {
              cell.type = 'formula';
              cell.formula = op.formula;
              cell.dependencies = this.extractDependencies(op.formula);
            }

            data.cells[op.cellRef] = cell;
            successCount++;
          } else if (op.action === 'delete') {
            delete data.cells[op.cellRef];
            successCount++;
          } else if (op.action === 'copy' && op.sourceRef) {
            const sourceCell = data.cells[op.sourceRef];
            if (sourceCell) {
              data.cells[op.cellRef] = { ...sourceCell };
              successCount++;
            }
          }
        } catch (error) {
          errorCount++;
          OutputFormatter.error(`Failed operation on ${op.cellRef}: ${error}`);
        }
      }

      await this.saveSheet(data);

      OutputFormatter.newline();
      OutputFormatter.success('Batch operations completed');
      OutputFormatter.kv('Successful', successCount);
      OutputFormatter.kv('Failed', errorCount);

    } catch (error) {
      throw new Error(`Failed to perform batch operations: ${error}`);
    }
  }

  /**
   * Query cells by criteria
   *
   * @param sheetId - Spreadsheet ID
   * @param options - Query options
   */
  async query(sheetId: string, options: {
    type?: string;
    value?: string;
    formula?: string;
    modified?: string;
    limit?: string;
  }): Promise<void> {
    try {
      const data = await this.loadSheet(sheetId);
      const limit = parseInt(options.limit || '100');

      const results = Object.entries(data.cells)
        .filter(([ref, cell]) => {
          if (options.type && cell.type !== options.type) return false;
          if (options.value && !String(cell.value).includes(options.value)) return false;
          if (options.formula && !cell.formula?.includes(options.formula)) return false;
          if (options.modified) {
            const modifiedDate = new Date(cell.lastModified);
            const sinceDate = new Date(options.modified);
            if (modifiedDate < sinceDate) return false;
          }
          return true;
        })
        .slice(0, limit);

      OutputFormatter.header('Query Results');
      OutputFormatter.info(`Found ${results.length} cells`);
      OutputFormatter.newline();

      if (results.length === 0) {
        OutputFormatter.info('No cells matched the criteria');
        return;
      }

      const headers = ['Cell', 'Type', 'Value', 'Formula', 'Modified'];
      const rows = results.map(([ref, cell]) => [
        ref,
        cell.type,
        String(cell.value).slice(0, 30),
        cell.formula?.slice(0, 30) || '',
        new Date(cell.lastModified).toLocaleDateString()
      ]);

      OutputFormatter.table(headers, rows);

      if (results.length >= limit) {
        OutputFormatter.newline();
        OutputFormatter.info(`Results limited to ${limit}. Use --limit to show more.`);
      }

    } catch (error) {
      throw new Error(`Failed to query cells: ${error}`);
    }
  }

  /**
   * Show cell dependencies
   *
   * @param sheetId - Spreadsheet ID
   * @param cellRef - Cell reference
   * @param options - Dependencies options
   */
  async dependencies(sheetId: string, cellRef: string, options: {
    tree?: boolean;
    circular?: boolean;
  }): Promise<void> {
    try {
      const data = await this.loadSheet(sheetId);
      const cell = data.cells[cellRef];

      OutputFormatter.header(`Dependencies: ${cellRef}`);

      if (!cell) {
        OutputFormatter.info('Cell is empty');
        return;
      }

      if (cell.dependencies && cell.dependencies.length > 0) {
        OutputFormatter.subheader('Precedents (cells this cell depends on)');
        cell.dependencies.forEach(dep => {
          const depCell = data.cells[dep];
          const value = depCell ? depCell.value : '(empty)';
          OutputFormatter.list(`${dep}: ${value}`);
        });
      } else {
        OutputFormatter.info('No precedents found');
      }

      // Find dependents
      const dependents: string[] = [];
      Object.entries(data.cells).forEach(([ref, c]) => {
        if (c.dependencies?.includes(cellRef)) {
          dependents.push(ref);
        }
      });

      OutputFormatter.newline();
      if (dependents.length > 0) {
        OutputFormatter.subheader('Dependents (cells that depend on this cell)');
        dependents.forEach(dep => {
          OutputFormatter.list(dep);
        });
      } else {
        OutputFormatter.info('No dependents found');
      }

      if (options.circular) {
        OutputFormatter.newline();
        const circular = this.checkCircular(cellRef, data.cells);
        if (circular) {
          OutputFormatter.error('Circular reference detected!');
          OutputFormatter.list(circular.join(' → '));
        } else {
          OutputFormatter.success('No circular references found');
        }
      }

    } catch (error) {
      throw new Error(`Failed to get dependencies: ${error}`);
    }
  }

  /**
   * Check for circular references
   */
  private checkCircular(ref: string, cells: Record<string, Cell>, visited: Set<string> = new Set()): string[] | null {
    if (visited.has(ref)) {
      return Array.from(visited).concat(ref);
    }

    const cell = cells[ref];
    if (!cell || !cell.dependencies) return null;

    visited.add(ref);

    for (const dep of cell.dependencies) {
      const circular = this.checkCircular(dep, cells, new Set(visited));
      if (circular) return circular;
    }

    return null;
  }

  /**
   * Evaluate cell formula
   *
   * @param sheetId - Spreadsheet ID
   * @param cellRef - Cell reference
   * @param options - Evaluation options
   */
  async evaluate(sheetId: string, cellRef: string, options: {
    debug?: boolean;
    trace?: boolean;
  }): Promise<void> {
    try {
      const data = await this.loadSheet(sheetId);
      const cell = data.cells[cellRef];

      OutputFormatter.header(`Evaluating: ${cellRef}`);

      if (!cell) {
        OutputFormatter.info('Cell is empty');
        return;
      }

      if (!cell.formula) {
        OutputFormatter.info('Cell does not contain a formula');
        OutputFormatter.kv('Value', cell.value);
        return;
      }

      OutputFormatter.subheader('Formula');
      OutputFormatter.info(cell.formula);

      OutputFormatter.subheader('Dependencies');
      if (cell.dependencies && cell.dependencies.length > 0) {
        cell.dependencies.forEach(dep => {
          const depCell = data.cells[dep];
          const value = depCell ? depCell.value : '(empty)';
          OutputFormatter.list(`${dep} = ${value}`);
        });
      }

      OutputFormatter.subheader('Result');
      OutputFormatter.kv('Computed Value', cell.value);

      if (options.debug) {
        OutputFormatter.newline();
        OutputFormatter.subheader('Debug Info');
        OutputFormatter.kv('Type', cell.type);
        OutputFormatter.kv('Computed', cell.computed ? 'Yes' : 'No');
      }

    } catch (error) {
      throw new Error(`Failed to evaluate cell: ${error}`);
    }
  }

  /**
   * Watch cell for changes
   *
   * @param sheetId - Spreadsheet ID
   * @param cellRef - Cell reference
   * @param options - Watch options
   */
  async watch(sheetId: string, cellRef: string, options: {
    timeout?: string;
    once?: boolean;
  }): Promise<void> {
    try {
      const timeout = parseInt(options.timeout || '30000');
      OutputFormatter.header(`Watching ${cellRef}`);
      OutputFormatter.info(`Press Ctrl+C to stop`);

      let lastValue: any = null;
      let iteration = 0;

      const interval = setInterval(async () => {
        try {
          const data = await this.loadSheet(sheetId);
          const cell = data.cells[cellRef];

          const currentValue = cell?.value;

          if (iteration === 0) {
            lastValue = currentValue;
            OutputFormatter.kv('Initial value', currentValue || '(empty)');
          } else if (currentValue !== lastValue) {
            OutputFormatter.newline();
            OutputFormatter.success(`Value changed!`);
            OutputFormatter.kv('Previous', lastValue);
            OutputFormatter.kv('New', currentValue || '(empty)');
            lastValue = currentValue;

            if (options.once) {
              clearInterval(interval);
              return;
            }
          }

          iteration++;

          if (iteration * 1000 >= timeout) {
            OutputFormatter.newline();
            OutputFormatter.info('Watch timeout reached');
            clearInterval(interval);
          }
        } catch (error) {
          OutputFormatter.error(`Watch error: ${error}`);
          clearInterval(interval);
        }
      }, 1000);

      // Handle Ctrl+C
      process.on('SIGINT', () => {
        clearInterval(interval);
        OutputFormatter.newline();
        OutputFormatter.info('Watch stopped');
        process.exit(0);
      });

    } catch (error) {
      throw new Error(`Failed to watch cell: ${error}`);
    }
  }
}
