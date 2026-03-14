/**
 * SpreadsheetVisualizer - Converts logic tiles to spreadsheet format
 * 
 * This module transforms decomposed logic tiles into spreadsheet-compatible
 * cell structures with formatting, formulas, and visualization metadata.
 */

import type {
  LogicTile,
  SpreadsheetCell,
  SpreadsheetCellType,
  LogicSpreadsheet,
  CellFormatting,
  SpreadsheetMetadata,
  ReverseEngineerResult,
} from './types';

/**
 * Column definition for spreadsheet
 */
interface ColumnDefinition {
  id: string;
  header: string;
  type: SpreadsheetCellType;
  width: number;
  formatting: CellFormatting;
}

/**
 * Row definition for spreadsheet
 */
interface RowDefinition {
  id: string;
  header: string;
  tileId: string;
  height: number;
}

/**
 * SpreadsheetVisualizer class
 * Converts logic tiles into spreadsheet-compatible formats
 */
export class SpreadsheetVisualizer {
  /** Default column definitions */
  private readonly defaultColumns: ColumnDefinition[] = [
    { id: 'name', header: 'Name', type: 'metadata', width: 150, formatting: { fontWeight: 'bold' } },
    { id: 'type', header: 'Type', type: 'metadata', width: 100, formatting: {} },
    { id: 'rule', header: 'Rule', type: 'logic', width: 300, formatting: { textAlign: 'left' } },
    { id: 'conditions', header: 'Conditions', type: 'decision', width: 200, formatting: {} },
    { id: 'confidence', header: 'Confidence', type: 'transformation', width: 80, formatting: { numberFormat: '0.0%' } },
    { id: 'dependencies', header: 'Dependencies', type: 'reference', width: 150, formatting: {} },
    { id: 'origin', header: 'Data Origin', type: 'input', width: 120, formatting: {} },
    { id: 'transform', header: 'Transformation', type: 'transformation', width: 150, formatting: {} },
    { id: 'interface', header: 'Interface', type: 'output', width: 200, formatting: {} },
    { id: 'source', header: 'Source Segment', type: 'metadata', width: 250, formatting: { textAlign: 'left' } },
  ];

  /** Color palette for cell types */
  private readonly colorPalette = {
    input: { bg: '#E3F2FD', text: '#1565C0' },
    output: { bg: '#E8F5E9', text: '#2E7D32' },
    logic: { bg: '#FFF3E0', text: '#EF6C00' },
    transformation: { bg: '#F3E5F5', text: '#7B1FA2' },
    decision: { bg: '#FFEBEE', text: '#C62828' },
    reference: { bg: '#ECEFF1', text: '#455A64' },
    constant: { bg: '#FAFAFA', text: '#212121' },
    formula: { bg: '#E0F7FA', text: '#00838F' },
    metadata: { bg: '#F5F5F5', text: '#616161' },
  };

  /**
   * Convert logic tiles to a full spreadsheet
   */
  visualize(tiles: LogicTile[], sourcePrompt?: string, sourceResponse?: string): LogicSpreadsheet {
    const cells = new Map<string, SpreadsheetCell>();
    const columnHeaders = this.defaultColumns.map(c => c.header);
    const rowHeaders: string[] = [];
    const namedRanges = new Map<string, string[]>();
    
    // Create header row
    for (let col = 0; col < this.defaultColumns.length; col++) {
      const column = this.defaultColumns[col];
      const cellId = this.cellId(0, col);
      
      cells.set(cellId, {
        id: cellId,
        row: 0,
        column: col,
        value: column.header,
        tileId: '',
        displayName: column.header,
        type: 'metadata',
        formatting: { fontWeight: 'bold', backgroundColor: '#E8EAF6', textAlign: 'center' },
        comments: [],
        dependsOn: [],
        visible: true,
        confidence: 1,
        provenance: {
          entries: [],
          immutable: true,
        },
      });
    }
    
    // Create data rows
    for (let row = 0; row < tiles.length; row++) {
      const tile = tiles[row];
      const rowHeader = tile.name;
      rowHeaders.push(rowHeader);
      
      // Create named range for this tile
      const tileCells: string[] = [];
      
      for (let col = 0; col < this.defaultColumns.length; col++) {
        const column = this.defaultColumns[col];
        const cellId = this.cellId(row + 1, col);
        tileCells.push(cellId);
        
        const value = this.extractCellValue(tile, column.id);
        const formatting = this.getCellFormatting(column.type, tile.confidence);
        
        cells.set(cellId, {
          id: cellId,
          row: row + 1,
          column: col,
          value,
          formula: this.generateFormula(tile, column.id),
          tileId: tile.id,
          displayName: `${column.header}: ${tile.name}`,
          type: column.type,
          formatting,
          comments: this.generateComments(tile, column.id),
          dependsOn: this.getDependencies(tile, column.id),
          visible: true,
          confidence: tile.confidence,
          provenance: {
            entries: [{
              originId: tile.dataOrigin.sourceId,
              transformation: {
                id: `transform_${tile.id}`,
                type: tile.transformation.type,
                input: tile.sourceSegment,
                output: value,
                timestamp: Date.now(),
              },
              timestamp: Date.now(),
            }],
            immutable: true,
          },
        });
      }
      
      namedRanges.set(tile.id, tileCells);
    }
    
    const metadata: SpreadsheetMetadata = {
      sourcePrompt,
      sourceResponse,
      tileCount: tiles.length,
      averageConfidence: tiles.reduce((sum, t) => sum + t.confidence, 0) / Math.max(tiles.length, 1),
      processingTimeMs: 0,
      distillerVersion: '1.0.0',
    };
    
    return {
      id: `spreadsheet_${Date.now()}`,
      name: 'Logic Distillation Spreadsheet',
      cells,
      dimensions: [tiles.length + 1, this.defaultColumns.length],
      originTileId: tiles[0]?.id ?? '',
      columnHeaders,
      rowHeaders,
      namedRanges,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      metadata,
    };
  }

  /**
   * Extract cell value for a given column
   */
  private extractCellValue(tile: LogicTile, columnId: string): unknown {
    switch (columnId) {
      case 'name':
        return tile.name;
      case 'type':
        return tile.decisionLogic.type;
      case 'rule':
        return tile.decisionLogic.rule;
      case 'conditions':
        return tile.decisionLogic.conditions.map(c => c.description).join('; ');
      case 'confidence':
        return tile.confidence;
      case 'dependencies':
        return tile.dependencies.join(', ');
      case 'origin':
        return tile.dataOrigin.type;
      case 'transform':
        return tile.transformation.type;
      case 'interface':
        return tile.namedInterface.name;
      case 'source':
        return tile.sourceSegment.length > 100 
          ? tile.sourceSegment.substring(0, 100) + '...'
          : tile.sourceSegment;
      default:
        return '';
    }
  }

  /**
   * Generate formula for a cell
   */
  private generateFormula(tile: LogicTile, columnId: string): string | undefined {
    if (columnId === 'confidence') {
      return `=CONFIDENCE("${tile.id}")`;
    }
    
    if (columnId === 'dependencies' && tile.dependencies.length > 0) {
      return `=DEPENDS_ON(${tile.dependencies.map(d => `"${d}"`).join(', ')})`;
    }
    
    if (columnId === 'conditions' && tile.decisionLogic.conditions.length > 0) {
      const conditions = tile.decisionLogic.conditions.map(c => 
        `${c.left} ${c.operator} ${c.right}`
      );
      return `=AND(${conditions.join(', ')})`;
    }
    
    return undefined;
  }

  /**
   * Get cell formatting based on type and confidence
   */
  private getCellFormatting(type: SpreadsheetCellType, confidence: number): CellFormatting {
    const colors = this.colorPalette[type];
    const formatting: CellFormatting = {
      backgroundColor: colors.bg,
      textColor: colors.text,
    };
    
    // Add visual indicator for low confidence
    if (confidence < 0.6) {
      formatting.border = {
        top: true,
        right: true,
        bottom: true,
        left: true,
        color: '#FF5722',
      };
    } else if (confidence < 0.8) {
      formatting.border = {
        top: true,
        right: true,
        bottom: true,
        left: true,
        color: '#FFC107',
      };
    }
    
    return formatting;
  }

  /**
   * Generate comments for a cell
   */
  private generateComments(tile: LogicTile, columnId: string): string[] {
    const comments: string[] = [];
    
    if (columnId === 'rule') {
      comments.push(`NLP Description: ${tile.nlpDescription}`);
    }
    
    if (columnId === 'confidence') {
      if (tile.confidence < 0.6) {
        comments.push('⚠️ Low confidence - manual review recommended');
      } else if (tile.confidence < 0.8) {
        comments.push('⚡ Moderate confidence - verify extraction');
      } else {
        comments.push('✓ High confidence extraction');
      }
    }
    
    if (columnId === 'interface') {
      comments.push(`Usage: ${tile.namedInterface.example}`);
      comments.push(`Returns: ${tile.namedInterface.returnType}`);
      if (tile.namedInterface.documentation) {
        comments.push(`Docs: ${tile.namedInterface.documentation}`);
      }
    }
    
    if (columnId === 'origin') {
      comments.push(`Source: ${tile.dataOrigin.description}`);
      comments.push(`Timestamp: ${new Date(tile.dataOrigin.timestamp).toISOString()}`);
    }
    
    return comments;
  }

  /**
   * Get cell dependencies
   */
  private getDependencies(tile: LogicTile, columnId: string): string[] {
    if (columnId === 'dependencies') {
      return tile.dependencies;
    }
    
    // All cells in a row depend on the name cell
    if (columnId !== 'name') {
      const rowStart = 1; // Assuming row 0 is header
      return [this.cellId(rowStart, 0)]; // First column of data rows
    }
    
    return [];
  }

  /**
   * Generate cell ID from row and column
   */
  private cellId(row: number, column: number): string {
    const columnName = this.columnIndexToName(column);
    return `${columnName}${row + 1}`;
  }

  /**
   * Convert column index to Excel-style name
   */
  private columnIndexToName(index: number): string {
    let name = '';
    let i = index;
    
    while (i >= 0) {
      name = String.fromCharCode(65 + (i % 26)) + name;
      i = Math.floor(i / 26) - 1;
    }
    
    return name;
  }

  /**
   * Export spreadsheet to CSV format
   */
  toCSV(spreadsheet: LogicSpreadsheet): string {
    const rows: string[][] = [];
    
    // Header row
    const header = spreadsheet.columnHeaders;
    rows.push(header);
    
    // Data rows
    for (let row = 1; row < spreadsheet.dimensions[0]; row++) {
      const rowData: string[] = [];
      
      for (let col = 0; col < spreadsheet.dimensions[1]; col++) {
        const cellId = this.cellId(row, col);
        const cell = spreadsheet.cells.get(cellId);
        
        if (cell) {
          let value = String(cell.value ?? '');
          // Escape quotes and wrap in quotes if contains comma or quote
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          rowData.push(value);
        } else {
          rowData.push('');
        }
      }
      
      rows.push(rowData);
    }
    
    return rows.map(row => row.join(',')).join('\n');
  }

  /**
   * Export spreadsheet to JSON format
   */
  toJSON(spreadsheet: LogicSpreadsheet): object {
    const cellsArray: object[] = [];
    
    spreadsheet.cells.forEach((cell, id) => {
      cellsArray.push({
        id,
        row: cell.row,
        column: cell.column,
        value: cell.value,
        formula: cell.formula,
        tileId: cell.tileId,
        displayName: cell.displayName,
        type: cell.type,
        formatting: cell.formatting,
        comments: cell.comments,
        dependsOn: cell.dependsOn,
        visible: cell.visible,
        confidence: cell.confidence,
      });
    });
    
    return {
      id: spreadsheet.id,
      name: spreadsheet.name,
      dimensions: spreadsheet.dimensions,
      originTileId: spreadsheet.originTileId,
      columnHeaders: spreadsheet.columnHeaders,
      rowHeaders: spreadsheet.rowHeaders,
      namedRanges: Object.fromEntries(spreadsheet.namedRanges),
      metadata: spreadsheet.metadata,
      cells: cellsArray,
    };
  }

  /**
   * Export spreadsheet to HTML table
   */
  toHTML(spreadsheet: LogicSpreadsheet): string {
    const lines: string[] = [];
    
    lines.push('<!DOCTYPE html>');
    lines.push('<html lang="en">');
    lines.push('<head>');
    lines.push('<meta charset="UTF-8">');
    lines.push('<title>' + spreadsheet.name + '</title>');
    lines.push('<style>');
    lines.push('body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; }');
    lines.push('table { border-collapse: collapse; width: 100%; }');
    lines.push('th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }');
    lines.push('th { background-color: #E8EAF6; font-weight: bold; }');
    lines.push('tr:nth-child(even) { background-color: #f9f9f9; }');
    lines.push('tr:hover { background-color: #f5f5f5; }');
    lines.push('.comment { font-size: 0.8em; color: #666; font-style: italic; }');
    lines.push('</style>');
    lines.push('</head>');
    lines.push('<body>');
    lines.push(`<h1>${spreadsheet.name}</h1>`);
    lines.push('<table>');
    
    // Header row
    lines.push('<thead><tr>');
    for (const header of spreadsheet.columnHeaders) {
      lines.push(`<th>${this.escapeHtml(header)}</th>`);
    }
    lines.push('</tr></thead>');
    
    // Data rows
    lines.push('<tbody>');
    for (let row = 1; row < spreadsheet.dimensions[0]; row++) {
      lines.push('<tr>');
      
      for (let col = 0; col < spreadsheet.dimensions[1]; col++) {
        const cellId = this.cellId(row, col);
        const cell = spreadsheet.cells.get(cellId);
        
        if (cell) {
          const style = this.formattingToStyle(cell.formatting);
          const value = this.escapeHtml(String(cell.value ?? ''));
          
          let cellContent = value;
          
          // Add comments as tooltip
          if (cell.comments.length > 0) {
            const tooltip = cell.comments.map(c => this.escapeHtml(c)).join('&#10;');
            lines.push(`<td style="${style}" title="${tooltip}">${cellContent}</td>`);
          } else {
            lines.push(`<td style="${style}">${cellContent}</td>`);
          }
        } else {
          lines.push('<td></td>');
        }
      }
      
      lines.push('</tr>');
    }
    lines.push('</tbody>');
    lines.push('</table>');
    
    // Add metadata section
    lines.push('<div style="margin-top: 20px; color: #666; font-size: 0.9em;">');
    lines.push(`<p>Tiles: ${spreadsheet.metadata.tileCount} | Average Confidence: ${(spreadsheet.metadata.averageConfidence * 100).toFixed(1)}%</p>`);
    lines.push('</div>');
    
    lines.push('</body>');
    lines.push('</html>');
    
    return lines.join('\n');
  }

  /**
   * Convert formatting object to CSS style string
   */
  private formattingToStyle(formatting: CellFormatting): string {
    const styles: string[] = [];
    
    if (formatting.backgroundColor) {
      styles.push(`background-color: ${formatting.backgroundColor}`);
    }
    if (formatting.textColor) {
      styles.push(`color: ${formatting.textColor}`);
    }
    if (formatting.fontWeight) {
      styles.push(`font-weight: ${formatting.fontWeight}`);
    }
    if (formatting.textAlign) {
      styles.push(`text-align: ${formatting.textAlign}`);
    }
    
    return styles.join('; ');
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Reverse-engineer a cell to explain its logic
   */
  reverseEngineerCell(cell: SpreadsheetCell, tiles: Map<string, LogicTile>): ReverseEngineerResult {
    const tile = tiles.get(cell.tileId);
    
    if (!tile) {
      return {
        explanation: `Cell ${cell.id} does not reference a valid tile.`,
        breakdown: {
          input: 'Unknown',
          processing: 'Unknown',
          output: String(cell.value),
          sideEffects: [],
        },
        relatedTiles: [],
        confidence: 0,
        summary: 'Unable to determine logic for this cell.',
      };
    }
    
    const relatedTiles = tile.dependencies.filter(id => tiles.has(id));
    
    const breakdown = {
      input: tile.dataOrigin.description,
      processing: tile.decisionLogic.rule,
      output: String(cell.value),
      sideEffects: tile.dependencies.length > 0 
        ? [`Depends on ${tile.dependencies.length} other tile(s)`]
        : [],
    };
    
    const summary = `This cell (${cell.id}) contains ${cell.type} data from the "${tile.name}" tile. ` +
      `It applies ${tile.decisionLogic.type} logic with ${(tile.confidence * 100).toFixed(1)}% confidence. ` +
      `The rule is: "${tile.decisionLogic.rule}".`;
    
    const explanation = `## Cell ${cell.id} Analysis\n\n` +
      `**Type:** ${cell.type}\n` +
      `**Value:** ${cell.value}\n` +
      `**Tile:** ${tile.name} (${tile.id})\n\n` +
      `### Data Origin\n` +
      `- Type: ${tile.dataOrigin.type}\n` +
      `- Source: ${tile.dataOrigin.description}\n\n` +
      `### Decision Logic\n` +
      `- Rule: ${tile.decisionLogic.rule}\n` +
      `- Type: ${tile.decisionLogic.type}\n` +
      `- Confidence: ${(tile.confidence * 100).toFixed(1)}%\n\n` +
      `### Transformation\n` +
      `- Type: ${tile.transformation.type}\n` +
      `- Description: ${tile.transformation.description}\n`;
    
    return {
      explanation,
      breakdown,
      relatedTiles,
      confidence: tile.confidence,
      summary,
    };
  }

  /**
   * Create a summary visualization
   */
  createSummaryVisualization(tiles: LogicTile[]): string {
    const lines: string[] = [];
    
    lines.push('# Logic Distillation Summary\n');
    
    // Statistics
    const avgConfidence = tiles.reduce((sum, t) => sum + t.confidence, 0) / Math.max(tiles.length, 1);
    const typeCounts = new Map<string, number>();
    
    for (const tile of tiles) {
      const count = typeCounts.get(tile.decisionLogic.type) ?? 0;
      typeCounts.set(tile.decisionLogic.type, count + 1);
    }
    
    lines.push('## Statistics\n');
    lines.push(`- **Total Tiles:** ${tiles.length}`);
    lines.push(`- **Average Confidence:** ${(avgConfidence * 100).toFixed(1)}%\n`);
    
    lines.push('## Logic Types\n');
    lines.push('| Type | Count |');
    lines.push('|------|-------|');
    
    typeCounts.forEach((count, type) => {
      lines.push(`| ${type} | ${count} |`);
    });
    
    lines.push('\n## Tiles Overview\n');
    
    for (const tile of tiles) {
      lines.push(`### ${tile.name}`);
      lines.push(`- **Type:** ${tile.decisionLogic.type}`);
      lines.push(`- **Rule:** ${tile.decisionLogic.rule}`);
      lines.push(`- **Confidence:** ${(tile.confidence * 100).toFixed(1)}%`);
      if (tile.dependencies.length > 0) {
        lines.push(`- **Dependencies:** ${tile.dependencies.join(', ')}`);
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }
}

export default SpreadsheetVisualizer;
