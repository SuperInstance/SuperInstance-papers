/**
 * CellLogicDistiller - Main Equipment Class
 * 
 * Equipment that breaks down LLM logic into spreadsheet-visualized cells
 * with tile decomposition. Implements the Equipment interface for integration
 * with the SuperInstance ecosystem.
 */

import type {
  Equipment,
  EquipmentSlot,
  OriginCore,
  Tile,
  CostMetrics,
  BenefitMetrics,
  TriggerThresholds,
  EquipmentDescription,
} from '@superinstance/starter-agent';

import { TileDecomposer } from './TileDecomposer.js';
import { SpreadsheetVisualizer } from './SpreadsheetVisualizer.js';
import type {
  LogicTile,
  DecompositionResult,
  DistillationInput,
  DistillationOptions,
  ReverseEngineerResult,
  LogicSpreadsheet,
} from './types';

/**
 * CellLogicDistiller Equipment
 * 
 * This equipment takes LLM prompts/responses and breaks them into named tiles,
 * outputs spreadsheet-compatible cell structures, generates NLP descriptions,
 * and can reverse-engineer cells to explain logic.
 */
export class CellLogicDistiller implements Equipment {
  readonly name = 'CellLogicDistiller';
  readonly slot: EquipmentSlot = 'DISTILLATION';
  readonly version = '1.0.0';
  readonly description = 'Breaks down LLM logic into spreadsheet-visualized cells with tile decomposition';
  
  readonly cost: CostMetrics = {
    memoryBytes: 50 * 1024 * 1024, // 50MB
    cpuPercent: 15,
    latencyMs: 500,
    costPerUse: 0.001,
  };
  
  readonly benefit: BenefitMetrics = {
    accuracyBoost: 0.1,
    speedMultiplier: 1.2,
    confidenceBoost: 0.15,
    capabilityGain: [
      'logic_distillation',
      'spreadsheet_generation',
      'tile_decomposition',
      'reverse_engineering',
      'nlp_documentation',
    ],
  };
  
  readonly triggerThresholds: TriggerThresholds = {
    equipWhen: [
      { metric: 'confidence', operator: '<', value: 0.7 },
      { metric: 'complexity', operator: '>', value: 0.5 },
    ],
    unequipWhen: [
      { metric: 'memory', operator: '>', value: 0.9 },
    ],
    callTeacher: { low: 0.3, high: 0.8 },
  };
  
  private decomposer: TileDecomposer;
  private visualizer: SpreadsheetVisualizer;
  private lastResult: DecompositionResult | null = null;
  private tileCache: Map<string, LogicTile> = new Map();
  
  constructor(options: DistillationOptions = {}) {
    this.decomposer = new TileDecomposer(options);
    this.visualizer = new SpreadsheetVisualizer();
  }
  
  /**
   * Equip the agent with this equipment
   */
  async equip(_agent: OriginCore): Promise<void> {
    // Initialize caches and resources
    this.tileCache.clear();
    this.lastResult = null;
  }
  
  /**
   * Unequip the agent from this equipment
   */
  async unequip(_agent: OriginCore): Promise<void> {
    // Clean up resources
    this.tileCache.clear();
    this.lastResult = null;
  }
  
  /**
   * Get equipment description
   */
  describe(): EquipmentDescription {
    return {
      name: this.name,
      slot: this.slot,
      purpose: this.description,
      whenToUse: [
        'When you need to understand LLM logic structure',
        'When generating spreadsheet visualizations of logic',
        'When reverse-engineering cell logic',
        'When documenting LLM decision processes',
      ],
      whenToRemove: [
        'When memory is critically low',
        'When logic analysis is no longer needed',
      ],
      dependencies: [],
      conflicts: [],
    };
  }
  
  /**
   * Convert this equipment to a Tile
   */
  asTile(): Tile {
    return {
      inputType: {
        type: 'composite',
        properties: {
          prompt: { type: 'string' },
          response: { type: 'string' },
          context: { type: 'object' },
        },
      },
      outputType: {
        type: 'composite',
        properties: {
          tiles: { type: 'array' },
          spreadsheet: { type: 'object' },
          statistics: { type: 'object' },
        },
      },
      compute: (input: unknown) => {
        const typedInput = input as DistillationInput;
        return this.distill(typedInput);
      },
      confidence: (_input: unknown) => 0.95,
      trace: (_input: unknown) => `CellLogicDistiller.distill()`,
    };
  }
  
  // ============================================
  // Main API Methods
  // ============================================
  
  /**
   * Distill LLM logic into tiles and spreadsheet
   */
  distill(input: DistillationInput): DecompositionResult {
    const result = this.decomposer.decompose(input);
    
    // Cache tiles for reverse engineering
    for (const tile of result.tiles) {
      this.tileCache.set(tile.id, tile);
    }
    
    this.lastResult = result;
    return result;
  }
  
  /**
   * Create a full spreadsheet visualization
   */
  visualize(
    tiles: LogicTile[],
    sourcePrompt?: string,
    sourceResponse?: string
  ): LogicSpreadsheet {
    return this.visualizer.visualize(tiles, sourcePrompt, sourceResponse);
  }
  
  /**
   * Distill and visualize in one step
   */
  distillAndVisualize(input: DistillationInput): {
    result: DecompositionResult;
    spreadsheet: LogicSpreadsheet;
  } {
    const result = this.distill(input);
    const spreadsheet = this.visualizer.visualize(
      result.tiles,
      input.prompt,
      input.response
    );
    
    return { result, spreadsheet };
  }
  
  // ============================================
  // Reverse Engineering
  // ============================================
  
  /**
   * Reverse-engineer a tile by ID
   */
  reverseEngineerTile(tileId: string): string | null {
    const tile = this.tileCache.get(tileId);
    if (!tile) {
      return null;
    }
    return this.decomposer.reverseEngineer(tile);
  }
  
  /**
   * Reverse-engineer a cell by ID
   */
  reverseEngineerCell(cellId: string): ReverseEngineerResult | null {
    if (!this.lastResult) {
      return null;
    }
    
    // Find the cell in the spreadsheet
    const cell = this.lastResult.spreadsheet.cells.get(cellId);
    if (!cell) {
      return null;
    }
    
    return this.visualizer.reverseEngineerCell(cell, this.tileCache);
  }
  
  /**
   * Explain what a specific logic does
   */
  explainLogic(tileId: string): string {
    const tile = this.tileCache.get(tileId);
    if (!tile) {
      return `Tile "${tileId}" not found in cache.`;
    }
    
    const lines: string[] = [];
    lines.push(`# Logic Explanation: ${tile.name}`);
    lines.push('');
    lines.push('## Overview');
    lines.push(tile.nlpDescription);
    lines.push('');
    lines.push('## Decision Logic');
    lines.push(`- **Type:** ${tile.decisionLogic.type}`);
    lines.push(`- **Rule:** ${tile.decisionLogic.rule}`);
    
    if (tile.decisionLogic.conditions.length > 0) {
      lines.push('');
      lines.push('## Conditions');
      for (const cond of tile.decisionLogic.conditions) {
        lines.push(`- ${cond.left} ${cond.operator} ${cond.right}`);
      }
    }
    
    lines.push('');
    lines.push('## Transformation');
    lines.push(`- **Type:** ${tile.transformation.type}`);
    lines.push(`- **Description:** ${tile.transformation.description}`);
    
    lines.push('');
    lines.push('## Interface');
    lines.push(`\`\`\`typescript`);
    lines.push(`${tile.namedInterface.name}(${tile.namedInterface.parameters.map(p => p.name).join(', ')}): ${tile.namedInterface.returnType}`);
    lines.push(`\`\`\``);
    lines.push(tile.namedInterface.documentation);
    
    return lines.join('\n');
  }
  
  // ============================================
  // Export Methods
  // ============================================
  
  /**
   * Export spreadsheet to CSV
   */
  exportToCSV(spreadsheet: LogicSpreadsheet): string {
    return this.visualizer.toCSV(spreadsheet);
  }
  
  /**
   * Export spreadsheet to JSON
   */
  exportToJSON(spreadsheet: LogicSpreadsheet): string {
    return JSON.stringify(this.visualizer.toJSON(spreadsheet), null, 2);
  }
  
  /**
   * Export spreadsheet to HTML
   */
  exportToHTML(spreadsheet: LogicSpreadsheet): string {
    return this.visualizer.toHTML(spreadsheet);
  }
  
  /**
   * Generate a summary report
   */
  generateSummary(tiles: LogicTile[]): string {
    return this.visualizer.createSummaryVisualization(tiles);
  }
  
  // ============================================
  // Utility Methods
  // ============================================
  
  /**
   * Get cached tile by ID
   */
  getTile(tileId: string): LogicTile | undefined {
    return this.tileCache.get(tileId);
  }
  
  /**
   * Get all cached tiles
   */
  getAllTiles(): LogicTile[] {
    return Array.from(this.tileCache.values());
  }
  
  /**
   * Get the last distillation result
   */
  getLastResult(): DecompositionResult | null {
    return this.lastResult;
  }
  
  /**
   * Clear the tile cache
   */
  clearCache(): void {
    this.tileCache.clear();
    this.lastResult = null;
  }
  
  /**
   * Get statistics about cached tiles
   */
  getStatistics(): {
    tileCount: number;
    averageConfidence: number;
    typeDistribution: Record<string, number>;
  } {
    const tiles = Array.from(this.tileCache.values());
    const typeDistribution: Record<string, number> = {};
    
    let totalConfidence = 0;
    for (const tile of tiles) {
      totalConfidence += tile.confidence;
      const type = tile.decisionLogic.type;
      typeDistribution[type] = (typeDistribution[type] ?? 0) + 1;
    }
    
    return {
      tileCount: tiles.length,
      averageConfidence: tiles.length > 0 ? totalConfidence / tiles.length : 0,
      typeDistribution,
    };
  }
}

export default CellLogicDistiller;
