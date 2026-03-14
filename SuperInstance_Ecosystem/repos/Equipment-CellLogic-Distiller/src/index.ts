/**
 * @superinstance/equipment-cell-logic-distiller
 * 
 * Equipment that breaks down LLM logic into spreadsheet-visualized cells
 * with tile decomposition.
 * 
 * @packageDocumentation
 */

// Main equipment class
export { CellLogicDistiller, default as default } from './CellLogicDistiller.js';

// Core modules
export { TileDecomposer } from './TileDecomposer.js';
export { SpreadsheetVisualizer } from './SpreadsheetVisualizer.js';

// Types
export type {
  LogicTile,
  DataOrigin,
  DecisionLogic,
  TransformationInfo,
  NamedInterface,
  LogicCondition,
  LogicOperator,
  SpreadsheetCell,
  SpreadsheetCellType,
  CellFormatting,
  LogicSpreadsheet,
  SpreadsheetMetadata,
  DecompositionResult,
  DecompositionStatistics,
  DistillationInput,
  DistillationOptions,
  ReverseEngineerResult,
  LogicTileAdapter,
  InterfaceParameter,
} from './types.js';

/**
 * Quick factory function to create a distiller instance
 */
export function createDistiller(options?: import('./types.js').DistillationOptions): CellLogicDistiller {
  return new CellLogicDistiller(options);
}

/**
 * Quick distillation function - distill and return result
 */
export function distill(
  prompt: string,
  response: string,
  options?: import('./types.js').DistillationOptions
): import('./types.js').DecompositionResult {
  const distiller = new CellLogicDistiller(options);
  return distiller.distill({ prompt, response });
}

/**
 * Quick visualization function - distill and return spreadsheet
 */
export function visualize(
  prompt: string,
  response: string,
  options?: import('./types.js').DistillationOptions
): import('./types.js').LogicSpreadsheet {
  const distiller = new CellLogicDistiller(options);
  const { spreadsheet } = distiller.distillAndVisualize({ prompt, response });
  return spreadsheet;
}
