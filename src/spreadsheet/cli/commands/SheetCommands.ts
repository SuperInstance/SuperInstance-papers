/**
 * Sheet Commands - Spreadsheet Management
 *
 * Commands for creating, listing, and managing spreadsheets.
 *
 * @module SheetCommands
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { OutputFormatter } from '../utils/OutputFormatter.js';
import { ConfigManager } from '../utils/ConfigManager.js';

/**
 * Spreadsheet metadata
 */
interface Spreadsheet {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  modifiedAt: Date;
  rows: number;
  cols: number;
  template?: string;
  archived: boolean;
  path: string;
}

/**
 * Sheet template definitions
 */
interface SheetTemplate {
  name: string;
  description: string;
  rows: number;
  cols: number;
  setup?: (sheetPath: string) => Promise<void>;
}

/**
 * SheetCommands class
 *
 * Handles all spreadsheet-related CLI operations.
 */
export class SheetCommands {
  private config: ConfigManager;
  private sheetsDir: string;

  constructor(config: ConfigManager) {
    this.config = config;
    this.sheetsDir = path.join(this.config.getDataDir(), 'sheets');
  }

  /**
   * Ensure sheets directory exists
   */
  private async ensureSheetsDir(): Promise<void> {
    try {
      await fs.mkdir(this.sheetsDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create sheets directory: ${error}`);
    }
  }

  /**
   * Get sheet file path
   */
  private getSheetPath(id: string): string {
    return path.join(this.sheetsDir, `${id}.json`);
  }

  /**
   * Get metadata file path
   */
  private getMetaPath(id: string): string {
    return path.join(this.sheetsDir, `${id}.meta.json`);
  }

  /**
   * Read spreadsheet metadata
   */
  private async readMeta(id: string): Promise<Spreadsheet | null> {
    try {
      const metaPath = this.getMetaPath(id);
      const content = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(content);

      // Convert date strings back to Date objects
      meta.createdAt = new Date(meta.createdAt);
      meta.modifiedAt = new Date(meta.modifiedAt);

      return meta;
    } catch {
      return null;
    }
  }

  /**
   * Write spreadsheet metadata
   */
  private async writeMeta(meta: Spreadsheet): Promise<void> {
    const metaPath = this.getMetaPath(meta.id);
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
  }

  /**
   * Get all spreadsheet metadata
   */
  private async getAllSheets(includeArchived: boolean = false): Promise<Spreadsheet[]> {
    await this.ensureSheetsDir();

    try {
      const files = await fs.readdir(this.sheetsDir);
      const metaFiles = files.filter(f => f.endsWith('.meta.json'));

      const sheets: Spreadsheet[] = [];
      for (const file of metaFiles) {
        const id = file.replace('.meta.json', '');
        const meta = await this.readMeta(id);
        if (meta && (includeArchived || !meta.archived)) {
          sheets.push(meta);
        }
      }

      return sheets;
    } catch (error) {
      throw new Error(`Failed to read sheets directory: ${error}`);
    }
  }

  /**
   * Sheet templates
   */
  private templates: Record<string, SheetTemplate> = {
    basic: {
      name: 'Basic',
      description: 'Empty spreadsheet with basic setup',
      rows: 1000,
      cols: 26,
    },
    financial: {
      name: 'Financial',
      description: 'Financial tracking with common formulas',
      rows: 500,
      cols: 20,
      setup: async (sheetPath: string) => {
        const data = {
          cells: {
            A1: { value: 'Date', type: 'string' },
            B1: { value: 'Description', type: 'string' },
            C1: { value: 'Amount', type: 'string' },
            D1: { value: 'Category', type: 'string' },
          }
        };
        // Could write initial data to sheet
      }
    },
    analytics: {
      name: 'Analytics',
      description: 'Data analysis template with charts setup',
      rows: 1000,
      cols: 15,
    }
  };

  /**
   * Create a new spreadsheet
   *
   * @param name - Spreadsheet name
   * @param options - Creation options
   */
  async create(name: string, options: {
    description?: string;
    rows?: string;
    cols?: string;
    template?: string;
  }): Promise<void> {
    try {
      OutputFormatter.header('Creating Spreadsheet');
      OutputFormatter.info(`Name: ${name}`);

      const id = uuidv4();
      const template = this.templates[options.template || 'basic'];

      const rows = parseInt(options.rows || String(template.rows));
      const cols = parseInt(options.cols || String(template.cols));

      OutputFormatter.info(`Dimensions: ${rows} rows × ${cols} cols`);
      OutputFormatter.info(`Template: ${template.name}`);

      // Create metadata
      const sheet: Spreadsheet = {
        id,
        name,
        description: options.description,
        createdAt: new Date(),
        modifiedAt: new Date(),
        rows,
        cols,
        template: options.template,
        archived: false,
        path: this.getSheetPath(id)
      };

      await this.ensureSheetsDir();

      // Write metadata
      await this.writeMeta(sheet);

      // Create empty sheet data
      const sheetData = {
        id,
        name,
        created: sheet.createdAt.toISOString(),
        modified: sheet.modifiedAt.toISOString(),
        dimensions: { rows, cols },
        cells: {},
        settings: {
          gridlines: true,
          headers: true
        }
      };

      await fs.writeFile(sheet.path, JSON.stringify(sheetData, null, 2));

      // Run template setup if available
      if (template.setup) {
        await template.setup(sheet.path);
      }

      OutputFormatter.success(`Spreadsheet created: ${id}`);
      OutputFormatter.newline();
      OutputFormatter.info(`Use 'polln-sheet cell set ${id} A1 "value"' to add data`);

    } catch (error) {
      throw new Error(`Failed to create spreadsheet: ${error}`);
    }
  }

  /**
   * List all spreadsheets
   *
   * @param options - List options
   */
  async list(options: {
    all?: boolean;
    sort?: string;
  }): Promise<void> {
    try {
      const sheets = await this.getAllSheets(options.all);

      if (sheets.length === 0) {
        OutputFormatter.info('No spreadsheets found');
        OutputFormatter.info('Use "polln-sheet sheet create" to create one');
        return;
      }

      // Sort sheets
      const sortField = options.sort || 'modified';
      sheets.sort((a, b) => {
        if (sortField === 'name') {
          return a.name.localeCompare(b.name);
        } else if (sortField === 'created') {
          return b.createdAt.getTime() - a.createdAt.getTime();
        } else {
          return b.modifiedAt.getTime() - a.modifiedAt.getTime();
        }
      });

      OutputFormatter.header('Spreadsheets');
      OutputFormatter.info(`Total: ${sheets.length}`);
      OutputFormatter.newline();

      // Display as table
      const headers = ['ID', 'Name', 'Rows × Cols', 'Modified', 'Status'];
      const rows = sheets.map(sheet => [
        sheet.id.slice(0, 8),
        sheet.name,
        `${sheet.rows}×${sheet.cols}`,
        sheet.modifiedAt.toLocaleDateString(),
        sheet.archived ? 'Archived' : 'Active'
      ]);

      OutputFormatter.table(headers, rows);

    } catch (error) {
      throw new Error(`Failed to list spreadsheets: ${error}`);
    }
  }

  /**
   * Show detailed spreadsheet information
   *
   * @param id - Spreadsheet ID
   * @param options - Info options
   */
  async info(id: string, options: {
    stats?: boolean;
  }): Promise<void> {
    try {
      const sheet = await this.readMeta(id);

      if (!sheet) {
        OutputFormatter.error(`Spreadsheet not found: ${id}`);
        process.exit(1);
      }

      OutputFormatter.header(`Spreadsheet: ${sheet.name}`);

      OutputFormatter.subheader('Basic Information');
      OutputFormatter.kv('ID', sheet.id);
      OutputFormatter.kv('Description', sheet.description || 'None');
      OutputFormatter.kv('Created', sheet.createdAt.toLocaleString());
      OutputFormatter.kv('Modified', sheet.modifiedAt.toLocaleString());
      OutputFormatter.kv('Dimensions', `${sheet.rows} rows × ${sheet.cols} cols`);
      OutputFormatter.kv('Template', sheet.template || 'custom');
      OutputFormatter.kv('Status', sheet.archived ? 'Archived' : 'Active');

      if (options.stats) {
        await this.showStatistics(sheet);
      }

    } catch (error) {
      throw new Error(`Failed to get sheet info: ${error}`);
    }
  }

  /**
   * Show spreadsheet statistics
   */
  private async showStatistics(sheet: Spreadsheet): Promise<void> {
    try {
      const content = await fs.readFile(sheet.path, 'utf-8');
      const data = JSON.parse(content);
      const cells = Object.keys(data.cells || {}).length;

      OutputFormatter.newline();
      OutputFormatter.subheader('Statistics');
      OutputFormatter.metric('Populated Cells', cells);

      // Count cell types
      const typeCounts: Record<string, number> = {};
      Object.values(data.cells || {}).forEach((cell: any) => {
        const type = cell.type || 'string';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      if (Object.keys(typeCounts).length > 0) {
        OutputFormatter.newline();
        OutputFormatter.info('Cell Types:');
        Object.entries(typeCounts).forEach(([type, count]) => {
          OutputFormatter.list(`${type}: ${count}`);
        });
      }

    } catch (error) {
      OutputFormatter.warning('Could not load statistics');
    }
  }

  /**
   * Delete a spreadsheet
   *
   * @param id - Spreadsheet ID
   * @param options - Delete options
   */
  async delete(id: string, options: {
    force?: boolean;
    archive?: boolean;
  }): Promise<void> {
    try {
      const sheet = await this.readMeta(id);

      if (!sheet) {
        OutputFormatter.error(`Spreadsheet not found: ${id}`);
        process.exit(1);
      }

      if (options.archive) {
        sheet.archived = true;
        await this.writeMeta(sheet);
        OutputFormatter.success(`Spreadsheet archived: ${sheet.name}`);
        return;
      }

      if (!options.force) {
        OutputFormatter.warning(`This will permanently delete: ${sheet.name}`);
        OutputFormatter.info('Use --force to skip this confirmation');

        // In interactive mode, would prompt for confirmation
        // For now, require explicit --force flag
        OutputFormatter.error('Confirmation required. Use --force to delete.');
        process.exit(1);
      }

      // Delete files
      await fs.unlink(sheet.path);
      await fs.unlink(this.getMetaPath(id));

      OutputFormatter.success(`Spreadsheet deleted: ${sheet.name}`);

    } catch (error) {
      throw new Error(`Failed to delete spreadsheet: ${error}`);
    }
  }

  /**
   * Duplicate a spreadsheet
   *
   * @param id - Source spreadsheet ID
   * @param newName - Name for duplicate
   * @param options - Duplicate options
   */
  async duplicate(id: string, newName: string, options: {
    includeData?: boolean;
    includeFormulas?: boolean;
  }): Promise<void> {
    try {
      const source = await this.readMeta(id);

      if (!source) {
        OutputFormatter.error(`Spreadsheet not found: ${id}`);
        process.exit(1);
      }

      OutputFormatter.header('Duplicating Spreadsheet');
      OutputFormatter.info(`Source: ${source.name}`);
      OutputFormatter.info(`New name: ${newName}`);

      const newId = uuidv4();
      const duplicate: Spreadsheet = {
        ...source,
        id: newId,
        name: newName,
        createdAt: new Date(),
        modifiedAt: new Date(),
        path: this.getSheetPath(newId)
      };

      // Copy sheet data
      const sourceData = JSON.parse(await fs.readFile(source.path, 'utf-8'));

      if (!options.includeData) {
        sourceData.cells = {};
      }

      if (!options.includeFormulas) {
        // Convert formulas to values
        Object.values(sourceData.cells || {}).forEach((cell: any) => {
          if (cell.type === 'formula') {
            cell.type = 'number';
            delete cell.formula;
          }
        });
      }

      sourceData.id = newId;
      sourceData.name = newName;
      sourceData.created = duplicate.createdAt.toISOString();
      sourceData.modified = duplicate.modifiedAt.toISOString();

      await this.writeMeta(duplicate);
      await fs.writeFile(duplicate.path, JSON.stringify(sourceData, null, 2));

      OutputFormatter.success(`Spreadsheet duplicated: ${newId}`);

    } catch (error) {
      throw new Error(`Failed to duplicate spreadsheet: ${error}`);
    }
  }

  /**
   * Export spreadsheet
   *
   * @param id - Spreadsheet ID
   * @param options - Export options
   */
  async export(id: string, options: {
    format?: string;
    output?: string;
  }): Promise<void> {
    try {
      const sheet = await this.readMeta(id);

      if (!sheet) {
        OutputFormatter.error(`Spreadsheet not found: ${id}`);
        process.exit(1);
      }

      const format = options.format || 'json';
      const outputPath = options.output || `${sheet.name}.${format}`;

      OutputFormatter.info(`Exporting to ${format.toUpperCase()}...`);

      const data = JSON.parse(await fs.readFile(sheet.path, 'utf-8'));

      if (format === 'json') {
        await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
      } else if (format === 'csv') {
        // Basic CSV export
        const lines: string[] = [];
        const cells = data.cells || {};

        // Convert cells to grid
        const maxRow = sheet.rows;
        const maxCol = sheet.cols;

        for (let row = 1; row <= maxRow; row++) {
          const rowValues: string[] = [];
          for (let col = 0; col < maxCol; col++) {
            const colLetter = String.fromCharCode(65 + col);
            const ref = `${colLetter}${row}`;
            const cell = cells[ref];
            rowValues.push(cell ? `"${cell.value}"` : '');
          }
          lines.push(rowValues.join(','));
        }

        await fs.writeFile(outputPath, lines.join('\n'));
      } else {
        OutputFormatter.error(`Format not supported: ${format}`);
        OutputFormatter.info('Supported formats: json, csv');
        process.exit(1);
      }

      OutputFormatter.success(`Exported to: ${outputPath}`);

    } catch (error) {
      throw new Error(`Failed to export spreadsheet: ${error}`);
    }
  }

  /**
   * Import spreadsheet
   *
   * @param file - File path to import
   * @param options - Import options
   */
  async import(file: string, options: {
    name?: string;
    format?: string;
  }): Promise<void> {
    try {
      OutputFormatter.info(`Importing from: ${file}`);

      const ext = path.extname(file).toLowerCase();
      let format = options.format;

      if (format === 'auto') {
        format = ext.slice(1);
      }

      const content = await fs.readFile(file, 'utf-8');
      const name = options.name || path.basename(file, ext);

      const id = uuidv4();
      const sheet: Spreadsheet = {
        id,
        name,
        createdAt: new Date(),
        modifiedAt: new Date(),
        rows: 1000,
        cols: 26,
        archived: false,
        path: this.getSheetPath(id)
      };

      let cells: Record<string, any> = {};

      if (format === 'json') {
        const data = JSON.parse(content);
        cells = data.cells || {};
        sheet.rows = data.dimensions?.rows || 1000;
        sheet.cols = data.dimensions?.cols || 26;
      } else if (format === 'csv') {
        // Parse CSV
        const lines = content.split('\n').filter(l => l.trim());
        lines.forEach((line, rowIdx) => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          values.forEach((val, colIdx) => {
            const colLetter = String.fromCharCode(65 + colIdx);
            const ref = `${colLetter}${rowIdx + 1}`;
            cells[ref] = { value: val, type: 'string' };
          });
        });
        sheet.rows = lines.length;
        sheet.cols = Math.max(...lines.map(l => l.split(',').length));
      } else {
        OutputFormatter.error(`Format not supported: ${format}`);
        process.exit(1);
      }

      const sheetData = {
        id,
        name,
        created: sheet.createdAt.toISOString(),
        modified: sheet.modifiedAt.toISOString(),
        dimensions: { rows: sheet.rows, cols: sheet.cols },
        cells,
      };

      await this.ensureSheetsDir();
      await this.writeMeta(sheet);
      await fs.writeFile(sheet.path, JSON.stringify(sheetData, null, 2));

      OutputFormatter.success(`Imported: ${name} (${id})`);

    } catch (error) {
      throw new Error(`Failed to import spreadsheet: ${error}`);
    }
  }
}
