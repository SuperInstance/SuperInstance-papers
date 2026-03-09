/**
 * POLLN Network Exporter
 *
 * Exports cell networks to various formats including JSON, CSV, Excel, PDF,
 * and custom POLLN binary format.
 */

import type { LogCell } from '../core/LogCell.js';
import type {
  CellId,
  CellReference,
} from '../core/types.js';
import {
  ExportFormat,
} from './types.js';
import type {
  ExportConfig,
  NetworkExport,
  SerializableCell,
  CSVExportData,
  ExcelExportData,
  PDFExportConfig,
  ExportStatistics,
  ProgressCallback,
  POLLNBinaryHeader,
  NetworkMetadata,
} from './types.js';

/**
 * Exporter for cell networks
 */
export class Exporter {
  /**
   * Export a network of cells to the specified format
   */
  public async export(
    cells: LogCell[],
    config: ExportConfig,
    progressCallback?: ProgressCallback
  ): Promise<{ data: any; statistics: ExportStatistics }> {
    const startTime = Date.now();

    // Validate inputs
    if (!cells || cells.length === 0) {
      throw new Error('No cells to export');
    }

    // Convert cells to serializable format
    const serializableCells = await this.convertCells(cells);

    // Create network export structure
    const network = this.createNetworkExport(serializableCells, config);

    progressCallback?.(1, 4, 'Converted cells to serializable format');

    // Export based on format
    let data: any;
    let totalSize = 0;

    switch (config.format) {
      case ExportFormat.JSON:
        data = await this.exportJSON(network, config);
        totalSize = JSON.stringify(data).length;
        break;

      case ExportFormat.CSV:
        data = await this.exportCSV(network, config);
        totalSize = JSON.stringify(data).length;
        break;

      case ExportFormat.EXCEL:
        data = await this.exportExcel(network, config);
        totalSize = JSON.stringify(data).length;
        break;

      case ExportFormat.PDF:
        data = await this.exportPDF(network, config as PDFExportConfig);
        totalSize = data.length || 0;
        break;

      case ExportFormat.POLLN:
        data = await this.exportPOLLN(network, config);
        totalSize = data.length;
        break;

      default:
        throw new Error(`Unsupported export format: ${config.format}`);
    }

    progressCallback?.(4, 4, 'Export complete');

    const duration = Date.now() - startTime;
    const statistics = this.calculateStatistics(network, totalSize, duration, config.format);

    return { data, statistics };
  }

  /**
   * Export to JSON format
   */
  private async exportJSON(network: NetworkExport, config: ExportConfig): Promise<string> {
    if (config.pretty) {
      return JSON.stringify(network, null, 2);
    }
    return JSON.stringify(network);
  }

  /**
   * Export to CSV format
   */
  private async exportCSV(network: NetworkExport, config: ExportConfig): Promise<CSVExportData> {
    const headers = ['Position', 'ID', 'Type', 'State', 'Value', 'Formula', 'Inputs', 'Outputs'];

    const rows = network.cells.map(cell => ({
      position: `R${cell.position.row}C${cell.position.col}`,
      id: cell.id,
      type: cell.type,
      state: cell.state,
      value: this.extractCellValue(cell),
      formula: this.extractFormula(cell),
      inputs: cell.head.inputs.map(i => `${i.source}`).join('; '),
      outputs: cell.tail.outputs.map(o => `${o.target}`).join('; '),
    }));

    return { headers, rows };
  }

  /**
   * Export to Excel format
   */
  private async exportExcel(network: NetworkExport, config: ExportConfig): Promise<ExcelExportData> {
    const sheets = [];

    // Main sheet with cell data
    const mainSheetData = [
      ['Position', 'ID', 'Type', 'State', 'Created', 'Updated', 'Logic Level'],
      ...network.cells.map(cell => [
        `R${cell.position.row}C${cell.position.col}`,
        cell.id,
        cell.type,
        cell.state,
        new Date(cell.createdAt).toISOString(),
        new Date(cell.updatedAt).toISOString(),
        cell.logicLevel,
      ]),
    ];
    sheets.push({ name: 'Cells', data: mainSheetData });

    // Connections sheet
    if (network.connections && network.connections.length > 0) {
      const connectionsData = [
        ['From', 'To', 'Type'],
        ...network.connections.map(conn => [
          `R${conn.from.row}C${conn.from.col}`,
          `R${conn.to.row}C${conn.to.col}`,
          conn.type,
        ]),
      ];
      sheets.push({ name: 'Connections', data: connectionsData });
    }

    // Statistics sheet
    if (network.metadata.statistics) {
      const statsData = [
        ['Metric', 'Value'],
        ['Total Cells', network.metadata.statistics.totalCells],
        ['Total Connections', network.metadata.statistics.totalConnections || 0],
        ['Format Version', network.formatVersion],
        ['Export Date', new Date().toISOString()],
      ];
      sheets.push({ name: 'Statistics', data: statsData });
    }

    return { sheets };
  }

  /**
   * Export to PDF format
   */
  private async exportPDF(network: NetworkExport, config: PDFExportConfig): Promise<Buffer> {
    // This is a placeholder - actual PDF generation would require a library like jsPDF or pdfkit
    // For now, we'll return a text representation that could be converted to PDF

    const lines: string[] = [];

    // Title
    lines.push('='.repeat(80));
    lines.push(`POLLN NETWORK: ${network.metadata.name}`);
    lines.push('='.repeat(80));
    lines.push('');

    // Metadata
    if (config.includeSummary) {
      lines.push('METADATA');
      lines.push('-'.repeat(80));
      lines.push(`Version: ${network.metadata.version}`);
      lines.push(`Created: ${new Date(network.metadata.createdAt).toISOString()}`);
      lines.push(`Total Cells: ${network.metadata.statistics?.totalCells || 0}`);
      lines.push('');
    }

    // Cell details
    if (config.includeDetails) {
      lines.push('CELLS');
      lines.push('-'.repeat(80));

      for (const cell of network.cells) {
        lines.push(`Cell: ${cell.id}`);
        lines.push(`  Position: R${cell.position.row}C${cell.position.col}`);
        lines.push(`  Type: ${cell.type}`);
        lines.push(`  State: ${cell.state}`);
        lines.push(`  Logic Level: ${cell.logicLevel}`);
        lines.push(`  Inputs: ${cell.head.inputs.length}`);
        lines.push(`  Outputs: ${cell.tail.outputs.length}`);
        lines.push(`  Sensations: ${cell.head.sensations.length}`);
        if (cell.performance) {
          lines.push(`  Executions: ${cell.performance.totalExecutions}`);
          lines.push(`  Success Rate: ${((cell.performance.successfulExecutions / Math.max(1, cell.performance.totalExecutions)) * 100).toFixed(1)}%`);
        }
        lines.push('');
      }
    }

    // Connections
    if (network.connections && network.connections.length > 0) {
      lines.push('CONNECTIONS');
      lines.push('-'.repeat(80));
      for (const conn of network.connections) {
        lines.push(`R${conn.from.row}C${conn.from.col} -> R${conn.to.row}C${conn.to.col} (${conn.type})`);
      }
      lines.push('');
    }

    const text = lines.join('\n');
    return Buffer.from(text);
  }

  /**
   * Export to custom POLLN binary format
   */
  private async exportPOLLN(network: NetworkExport, config: ExportConfig): Promise<Buffer> {
    // Create binary header
    const header: POLLNBinaryHeader = {
      magic: 0x504F4C4E, // "POLL"
      version: this.parseVersion(network.version),
      flags: 0,
      compression: config.compress || false,
      encryption: !!config.password,
      metadataSize: JSON.stringify(network.metadata).length,
      cellCount: network.cells.length,
      connectionCount: network.connections?.length || 0,
    };

    // Serialize to buffer
    const buffers: Buffer[] = [];

    // Header (32 bytes)
    const headerBuffer = Buffer.alloc(32);
    headerBuffer.writeUInt32LE(header.magic, 0);
    headerBuffer.writeUInt32LE(header.version, 4);
    headerBuffer.writeUInt32LE(header.flags, 8);
    headerBuffer.writeUInt8(header.compression ? 1 : 0, 12);
    headerBuffer.writeUInt8(header.encryption ? 1 : 0, 13);
    headerBuffer.writeUInt32LE(header.metadataSize, 16);
    headerBuffer.writeUInt32LE(header.cellCount, 20);
    headerBuffer.writeUInt32LE(header.connectionCount, 24);
    buffers.push(headerBuffer);

    // Metadata
    const metadataJson = JSON.stringify(network.metadata);
    buffers.push(Buffer.from(metadataJson));

    // Cells
    const cellsJson = JSON.stringify(network.cells);
    buffers.push(Buffer.from(cellsJson));

    // Connections
    if (network.connections) {
      const connectionsJson = JSON.stringify(network.connections);
      buffers.push(Buffer.from(connectionsJson));
    }

    // Combine all buffers
    return Buffer.concat(buffers);
  }

  /**
   * Convert LogCell instances to serializable format
   */
  private async convertCells(cells: LogCell[]): Promise<SerializableCell[]> {
    return cells.map(cell => {
      const json = cell.toJSON();
      const inspection = cell.inspect();

      return {
        id: cell.id,
        type: cell.type,
        state: cell.getState(),
        position: cell.position,
        logicLevel: cell['logicLevel'] || 0,
        createdAt: cell.createdAt,
        updatedAt: Date.now(),
        version: 1,

        head: {
          inputs: inspection.inputs.map((input: any, idx: number) => ({
            id: `input-${idx}`,
            source: input.source || 'unknown',
            type: input.type || 'data',
            active: true,
          })),
          sensations: inspection.sensations.map(sensation => ({
            source: sensation.source,
            type: sensation.type,
            threshold: 0.5,
          })),
        },

        body: {
          logic: cell['body']?.logic,
          memory: {
            limit: cell['body']?.memory?.limit || 100,
            records: inspection.memory || [],
          },
          selfModel: inspection.selfModel,
        },

        tail: {
          outputs: inspection.outputs.map((output: any, idx: number) => ({
            id: `output-${idx}`,
            target: output.target || 'unknown',
            type: output.type || 'value',
            active: true,
          })),
          effects: inspection.effects || [],
        },

        origin: {
          position: cell.position,
          selfAwareness: cell['origin']?.selfAwareness || 0,
          watchedCells: cell['origin']?.watchedCells || [],
        },

        metadata: json.metadata,
        history: cell.getStateHistory(),
        performance: cell.getPerformanceMetrics(),
      } as SerializableCell;
    });
  }

  /**
   * Create network export structure
   */
  private createNetworkExport(cells: SerializableCell[], config: ExportConfig): NetworkExport {
    const metadata: NetworkMetadata = {
      name: 'POLLN Network',
      description: 'Exported from POLLN Spreadsheet',
      version: config.version || '1.0.0',
      formatVersion: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dimensions: this.calculateDimensions(cells),
      statistics: this.calculateDetailedStatistics(cells),
    };

    const connections = this.extractConnections(cells);

    return {
      format: 'POLLN_NETWORK',
      version: metadata.version,
      metadata,
      cells,
      connections,
    };
  }

  /**
   * Extract connections between cells
   */
  private extractConnections(cells: SerializableCell[]): Array<{
    from: CellReference;
    to: CellReference;
    type: 'data' | 'control' | 'sensation';
  }> {
    const connections: Array<{
      from: CellReference;
      to: CellReference;
      type: 'data' | 'control' | 'sensation';
    }> = [];

    for (const cell of cells) {
      // Input connections
      for (const input of cell.head.inputs) {
        if (typeof input.source === 'object' && input.source.row !== undefined) {
          connections.push({
            from: input.source as CellReference,
            to: cell.position,
            type: 'data',
          });
        }
      }

      // Sensation connections
      for (const sensation of cell.head.sensations) {
        connections.push({
          from: sensation.source,
          to: cell.position,
          type: 'sensation',
        });
      }

      // Output connections
      for (const output of cell.tail.outputs) {
        if (typeof output.target === 'object' && output.target.row !== undefined) {
          connections.push({
            from: cell.position,
            to: output.target as CellReference,
            type: 'data',
          });
        }
      }
    }

    return connections;
  }

  /**
   * Calculate network dimensions
   */
  private calculateDimensions(cells: SerializableCell[]) {
    let maxRow = 0;
    let maxCol = 0;

    for (const cell of cells) {
      maxRow = Math.max(maxRow, cell.position.row);
      maxCol = Math.max(maxCol, cell.position.col);
    }

    return { rows: maxRow + 1, cols: maxCol + 1 };
  }

  /**
   * Calculate detailed network statistics for metadata
   */
  private calculateDetailedStatistics(cells: SerializableCell[]) {
    const cellsByType: Record<string, number> = {};

    for (const cell of cells) {
      cellsByType[cell.type] = (cellsByType[cell.type] || 0) + 1;
    }

    let totalExecutionTime = 0;
    let executionCount = 0;

    for (const cell of cells) {
      if (cell.performance) {
        totalExecutionTime += cell.performance.averageDuration * cell.performance.totalExecutions;
        executionCount += cell.performance.totalExecutions;
      }
    }

    return {
      totalCells: cells.length,
      cellsByType: cellsByType as any,
      totalConnections: 0, // Will be calculated after connections are extracted
      averageExecutionTime: executionCount > 0 ? totalExecutionTime / executionCount : 0,
    };
  }

  /**
   * Extract cell value for CSV export
   */
  private extractCellValue(cell: SerializableCell): string {
    // Try to get value from memory
    if (cell.body.memory.records.length > 0) {
      const lastRecord = cell.body.memory.records[cell.body.memory.records.length - 1];
      return JSON.stringify(lastRecord.output);
    }
    return '';
  }

  /**
   * Extract formula from cell
   */
  private extractFormula(cell: SerializableCell): string {
    return cell.metadata?.formula || '';
  }

  /**
   * Parse version string to number
   */
  private parseVersion(version: string): number {
    const parts = version.split('.').map(Number);
    return (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
  }

  /**
   * Calculate export statistics
   */
  private calculateStatistics(
    network: NetworkExport,
    totalSize: number,
    duration: number,
    format: ExportFormat
  ): ExportStatistics {
    return {
      totalCells: network.cells.length,
      totalConnections: network.connections?.length || 0,
      totalSize,
      duration,
      format,
    };
  }

  /**
   * Export a single cell
   */
  public async exportCell(cell: LogCell, format: ExportFormat): Promise<any> {
    const result = await this.export([cell], { format, pretty: true });
    return result.data;
  }

  /**
   * Get supported formats
   */
  public static getSupportedFormats(): ExportFormat[] {
    return Object.values(ExportFormat);
  }

  /**
   * Check if format is supported
   */
  public static isFormatSupported(format: ExportFormat): boolean {
    return Object.values(ExportFormat).includes(format);
  }
}
