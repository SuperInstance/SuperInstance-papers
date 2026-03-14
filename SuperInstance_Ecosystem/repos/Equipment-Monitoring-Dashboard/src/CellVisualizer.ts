/**
 * CellVisualizer - Cell state visualization for the monitoring dashboard
 * 
 * Provides real-time visualization of cell states, confidence zones,
 * and agent assignments within the tile grid
 */

import type {
  CellVisualization,
  ConfidenceZone,
  VisualizationTheme,
  ProvenanceVisualization,
  ProvenanceNode,
  ProvenanceEdge,
} from './types';
import { DEFAULT_THEME, getConfidenceZone } from './types';
import type { Cell, ProvenanceChain, Tile, TileGrid } from '@superinstance/starter-agent';

export interface CellVisualizerConfig {
  theme: VisualizationTheme;
  showConfidenceOverlay: boolean;
  showAgentLabels: boolean;
  animateTransitions: boolean;
}

const DEFAULT_CELL_CONFIG: CellVisualizerConfig = {
  theme: DEFAULT_THEME,
  showConfidenceOverlay: true,
  showAgentLabels: true,
  animateTransitions: true,
};

export class CellVisualizer {
  private cells: Map<string, CellVisualization> = new Map();
  private grid: TileGrid | null = null;
  private config: CellVisualizerConfig;
  private subscribers: Set<(cells: Map<string, CellVisualization>) => void> = new Set();
  private provenanceCache: Map<string, ProvenanceVisualization> = new Map();

  constructor(config: Partial<CellVisualizerConfig> = {}) {
    this.config = { ...DEFAULT_CELL_CONFIG, ...config };
  }

  /**
   * Initialize visualizer with a tile grid
   */
  initialize(grid: TileGrid): void {
    this.grid = grid;
    this.cells.clear();
    
    // Initialize all cells
    grid.tiles.forEach((tile, key) => {
      this.cells.set(key, this.createCellVisualization(key, tile));
    });
    
    this.notifySubscribers();
  }

  /**
   * Update a single cell
   */
  updateCell(cellId: string, cell: Cell): void {
    const visualization = this.cellToVisualization(cell);
    this.cells.set(cellId, visualization);
    this.notifySubscribers();
  }

  /**
   * Update multiple cells
   */
  updateCells(cells: Map<string, Cell>): void {
    cells.forEach((cell, id) => {
      this.cells.set(id, this.cellToVisualization(cell));
    });
    this.notifySubscribers();
  }

  /**
   * Get cell visualization
   */
  getCell(cellId: string): CellVisualization | undefined {
    return this.cells.get(cellId);
  }

  /**
   * Get all cell visualizations
   */
  getAllCells(): Map<string, CellVisualization> {
    return new Map(this.cells);
  }

  /**
   * Get cells by confidence zone
   */
  getCellsByZone(zone: ConfidenceZone): CellVisualization[] {
    return Array.from(this.cells.values()).filter(cell => cell.zone === zone);
  }

  /**
   * Get cells by agent
   */
  getCellsByAgent(agentId: string): CellVisualization[] {
    return Array.from(this.cells.values()).filter(cell => cell.agentId === agentId);
  }

  /**
   * Get confidence zone statistics
   */
  getZoneStatistics(): Map<ConfidenceZone, { count: number; percentage: number }> {
    const stats = new Map<ConfidenceZone, { count: number; percentage: number }>();
    const total = this.cells.size;
    
    const zones: ConfidenceZone[] = ['GREEN', 'YELLOW', 'RED'];
    zones.forEach(zone => {
      const count = this.getCellsByZone(zone).length;
      stats.set(zone, {
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      });
    });
    
    return stats;
  }

  /**
   * Visualize provenance chain for a cell
   */
  visualizeProvenance(cellId: string, provenance: ProvenanceChain): ProvenanceVisualization {
    const nodes: ProvenanceNode[] = [];
    const edges: ProvenanceEdge[] = [];
    
    // Create origin node
    const originEntry = provenance.entries[0];
    if (originEntry) {
      nodes.push({
        id: `origin-${originEntry.originId}`,
        type: 'origin',
        label: `Origin: ${originEntry.originId.substring(0, 8)}`,
        timestamp: originEntry.timestamp,
      });
    }
    
    // Create transformation nodes
    let previousId = originEntry ? `origin-${originEntry.originId}` : null;
    
    provenance.entries.forEach((entry, index) => {
      const nodeId = `transform-${index}`;
      
      nodes.push({
        id: nodeId,
        type: 'transformation',
        label: entry.transformation.type,
        timestamp: entry.timestamp,
        data: entry.transformation,
      });
      
      if (previousId) {
        edges.push({
          from: previousId,
          to: nodeId,
          label: entry.transformation.type,
        });
      }
      
      previousId = nodeId;
    });
    
    // Create output node
    if (previousId) {
      const outputId = `output-${cellId}`;
      nodes.push({
        id: outputId,
        type: 'output',
        label: `Cell: ${cellId}`,
        timestamp: Date.now(),
      });
      
      edges.push({
        from: previousId,
        to: outputId,
      });
    }
    
    const visualization: ProvenanceVisualization = {
      originId: originEntry?.originId || '',
      chain: provenance,
      nodes,
      edges,
    };
    
    this.provenanceCache.set(cellId, visualization);
    return visualization;
  }

  /**
   * Get provenance visualization
   */
  getProvenance(cellId: string): ProvenanceVisualization | undefined {
    return this.provenanceCache.get(cellId);
  }

  /**
   * Generate ASCII representation of the grid
   */
  toASCII(): string {
    if (!this.grid) return 'No grid initialized';
    
    const [width, height] = this.grid.dimensions;
    const lines: string[] = [];
    
    // Header
    lines.push(`Grid: ${width}x${height} | Origin: ${this.grid.origin}`);
    lines.push('─'.repeat(width * 4 + 1));
    
    for (let y = 0; y < height; y++) {
      let row = '│';
      for (let x = 0; x < width; x++) {
        const cellId = `${x}-${y}`;
        const cell = this.cells.get(cellId);
        
        if (cell) {
          const zoneChar = this.getZoneChar(cell.zone);
          const confStr = cell.confidence.toFixed(1);
          row += ` ${zoneChar}${confStr} │`;
        } else {
          row += '  ?  │';
        }
      }
      lines.push(row);
      lines.push('─'.repeat(width * 4 + 1));
    }
    
    // Legend
    lines.push('');
    lines.push('Legend: ● GREEN (≥0.9) ◐ YELLOW (0.6-0.9) ○ RED (<0.6)');
    
    return lines.join('\n');
  }

  /**
   * Generate HTML representation
   */
  toHTML(): string {
    if (!this.grid) return '<div>No grid initialized</div>';
    
    const [width, height] = this.grid.dimensions;
    const { theme } = this.config;
    
    let html = `<div class="cell-grid" style="display: grid; grid-template-columns: repeat(${width}, ${theme.cellSize}px); gap: 2px; background: ${theme.colors.background}; padding: 10px;">`;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cellId = `${x}-${y}`;
        const cell = this.cells.get(cellId);
        
        if (cell) {
          const bgColor = this.getZoneColor(cell.zone);
          html += `<div class="cell" data-cell-id="${cellId}" style="width: ${theme.cellSize}px; height: ${theme.cellSize}px; background: ${bgColor}; display: flex; align-items: center; justify-content: center; border-radius: 4px; position: relative;">
            <span style="color: ${theme.colors.text}; font-size: 12px;">${cell.confidence.toFixed(2)}</span>
            ${cell.agentId ? `<span style="position: absolute; bottom: 2px; right: 2px; font-size: 8px; color: ${theme.colors.text};">${cell.agentId.substring(0, 4)}</span>` : ''}
          </div>`;
        } else {
          html += `<div class="cell empty" style="width: ${theme.cellSize}px; height: ${theme.cellSize}px; background: #333; border-radius: 4px;"></div>`;
        }
      }
    }
    
    html += '</div>';
    return html;
  }

  /**
   * Generate JSON representation for API
   */
  toJSON(): {
    dimensions: [number, number];
    cells: Record<string, CellVisualization>;
    statistics: Record<ConfidenceZone, { count: number; percentage: number }>;
  } {
    const statistics = Object.fromEntries(this.getZoneStatistics()) as Record<ConfidenceZone, { count: number; percentage: number }>;
    
    return {
      dimensions: this.grid?.dimensions || [0, 0],
      cells: Object.fromEntries(this.cells),
      statistics,
    };
  }

  /**
   * Subscribe to cell updates
   */
  subscribe(callback: (cells: Map<string, CellVisualization>) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Clear all cells
   */
  clear(): void {
    this.cells.clear();
    this.provenanceCache.clear();
    this.grid = null;
    this.notifySubscribers();
  }

  /**
   * Update theme
   */
  setTheme(theme: Partial<VisualizationTheme>): void {
    this.config.theme = { ...this.config.theme, ...theme };
    this.notifySubscribers();
  }

  // Private methods

  private createCellVisualization(key: string, tile: Tile): CellVisualization {
    const [x, y] = key.split('-').map(Number);
    
    return {
      cellId: key,
      position: [x, y],
      value: null, // Will be updated when cell has value
      confidence: tile.confidence(null),
      zone: getConfidenceZone(tile.confidence(null)),
      lastUpdated: Date.now(),
      provenanceDepth: 0,
    };
  }

  private cellToVisualization(cell: Cell): CellVisualization {
    return {
      cellId: cell.id,
      position: cell.position,
      value: cell.value,
      confidence: cell.confidence,
      zone: getConfidenceZone(cell.confidence),
      agentId: cell.agent,
      lastUpdated: Date.now(),
      formula: cell.formula,
      provenanceDepth: cell.provenance.entries.length,
    };
  }

  private getZoneChar(zone: ConfidenceZone): string {
    switch (zone) {
      case 'GREEN': return '●';
      case 'YELLOW': return '◐';
      case 'RED': return '○';
    }
  }

  private getZoneColor(zone: ConfidenceZone): string {
    switch (zone) {
      case 'GREEN': return this.config.theme.colors.green;
      case 'YELLOW': return this.config.theme.colors.yellow;
      case 'RED': return this.config.theme.colors.red;
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback(new Map(this.cells));
      } catch (e) {
        console.error('Cell visualizer subscriber error:', e);
      }
    });
  }
}

export default CellVisualizer;
