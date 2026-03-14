# @superinstance/equipment-cell-logic-distiller

> Equipment that breaks down LLM logic into spreadsheet-visualized cells with tile decomposition.

## Overview

`CellLogicDistiller` is an equipment module for the SuperInstance ecosystem that transforms LLM prompts and responses into structured, analyzable components. It extracts logical patterns, creates named tiles with full metadata, and generates spreadsheet-compatible visualizations.

## Features

- **Logic Decomposition**: Breaks down LLM logic into discrete, named tiles
- **Tile Metadata**: Each tile contains:
  - `data_origin` - Where the data came from
  - `decision_logic` - The decision rules extracted
  - `transformation` - How data is transformed
  - `confidence` - Confidence score (0-1)
  - `named_interface` - Interface for accessing the tile
- **Spreadsheet Visualization**: Converts tiles to Excel-compatible cell structures
- **Self-Documenting**: Generates NLP descriptions for each tile
- **Reverse Engineering**: Given a cell, explains what the logic does
- **Multiple Export Formats**: CSV, JSON, HTML

## Installation

```bash
npm install @superinstance/equipment-cell-logic-distiller
```

## Quick Start

```typescript
import { CellLogicDistiller, distill, visualize } from '@superinstance/equipment-cell-logic-distiller';

// Method 1: Using the quick function
const result = distill(
  'Analyze the customer data and identify high-value customers',
  'Based on the analysis, high-value customers are those with purchases > $1000...'
);

console.log(result.tiles); // Array of LogicTile
console.log(result.statistics); // Decomposition statistics

// Method 2: Using the class
const distiller = new CellLogicDistiller({
  minConfidence: 0.6,
  maxTiles: 50,
});

const { result, spreadsheet } = distiller.distillAndVisualize({
  prompt: 'Your prompt here',
  response: 'The LLM response here',
});

// Export to different formats
console.log(distiller.exportToCSV(spreadsheet));
console.log(distiller.exportToJSON(spreadsheet));
console.log(distiller.exportToHTML(spreadsheet));
```

## API Reference

### CellLogicDistiller

Main equipment class that implements the `Equipment` interface.

#### Constructor

```typescript
new CellLogicDistiller(options?: DistillationOptions)
```

#### Options

```typescript
interface DistillationOptions {
  /** Minimum confidence threshold for tiles (default: 0.5) */
  minConfidence?: number;
  
  /** Maximum number of tiles to extract (default: 100) */
  maxTiles?: number;
  
  /** Include NLP descriptions (default: true) */
  includeNlpDescriptions?: boolean;
  
  /** Include source positions (default: true) */
  includeSourcePositions?: boolean;
  
  /** Generate formal rules (default: true) */
  generateFormalRules?: boolean;
  
  /** Spreadsheet output format */
  spreadsheetFormat?: 'excel' | 'csv' | 'json' | 'html';
}
```

#### Methods

| Method | Description |
|--------|-------------|
| `distill(input)` | Distill LLM logic into tiles |
| `visualize(tiles, prompt?, response?)` | Create spreadsheet from tiles |
| `distillAndVisualize(input)` | One-step distillation and visualization |
| `reverseEngineerTile(tileId)` | Get explanation for a tile |
| `reverseEngineerCell(cellId)` | Get explanation for a cell |
| `explainLogic(tileId)` | Natural language explanation |
| `exportToCSV(spreadsheet)` | Export to CSV format |
| `exportToJSON(spreadsheet)` | Export to JSON format |
| `exportToHTML(spreadsheet)` | Export to HTML table |
| `generateSummary(tiles)` | Generate summary report |

### TileDecomposer

Core decomposition engine that extracts logic tiles from text.

```typescript
import { TileDecomposer } from '@superinstance/equipment-cell-logic-distiller';

const decomposer = new TileDecomposer({ minConfidence: 0.6 });
const result = decomposer.decompose({
  prompt: 'Your prompt',
  response: 'LLM response',
});
```

### SpreadsheetVisualizer

Converts logic tiles to spreadsheet formats.

```typescript
import { SpreadsheetVisualizer } from '@superinstance/equipment-cell-logic-distiller';

const visualizer = new SpreadsheetVisualizer();
const spreadsheet = visualizer.visualize(tiles);
const csv = visualizer.toCSV(spreadsheet);
const html = visualizer.toHTML(spreadsheet);
```

## Data Structures

### LogicTile

```typescript
interface LogicTile {
  id: string;
  name: string;
  dataOrigin: DataOrigin;
  decisionLogic: DecisionLogic;
  transformation: TransformationInfo;
  confidence: number;
  namedInterface: NamedInterface;
  nlpDescription: string;
  sourceSegment: string;
  sourcePosition: { start: number; end: number };
  dependencies: string[];
  outputType: TileType;
  inputType: TileType;
}
```

### DecisionLogic

```typescript
interface DecisionLogic {
  type: 'conditional' | 'selection' | 'ranking' | 'filtering' | 
        'aggregation' | 'generation' | 'verification';
  conditions: LogicCondition[];
  rule: string;
  formalRule?: string;
  extractionConfidence: number;
}
```

### SpreadsheetCell

```typescript
interface SpreadsheetCell {
  id: string;           // e.g., "A1", "B2"
  row: number;
  column: number;
  value: unknown;
  formula?: string;
  tileId: string;
  displayName: string;
  type: SpreadsheetCellType;
  formatting: CellFormatting;
  comments: string[];
  dependsOn: string[];
  visible: boolean;
  confidence: number;
}
```

## Logic Types Detected

The distiller can extract the following logic types:

| Type | Description | Example Pattern |
|------|-------------|-----------------|
| `conditional` | If-then logic | "If X, then Y" |
| `selection` | Selection from options | "Choose X from Y where Z" |
| `ranking` | Ordering/sorting | "Rank X by Y" |
| `filtering` | Filter operations | "Filter X by Y" |
| `aggregation` | Summarization | "Calculate the sum of X" |
| `generation` | Content generation | Numbered steps |
| `verification` | Validation checks | "Verify that X" |

## Reverse Engineering

You can reverse-engineer cells to understand their logic:

```typescript
const distiller = new CellLogicDistiller();
const result = distiller.distill({ prompt, response });

// Get explanation for a specific tile
const explanation = distiller.reverseEngineerTile('tile_0_condition_value');
console.log(explanation);

// Explain in natural language
const nlpExplanation = distiller.explainLogic('tile_0_condition_value');
console.log(nlpExplanation);
```

Example output:

```
# Logic Explanation: Condition_value

## Overview
This tile represents a conditional operation. The rule is: "IF value > 100 THEN high_priority". 
It evaluates 1 condition(s):
  - value > 100

## Decision Logic
- **Type:** conditional
- **Rule:** IF value > 100 THEN high_priority

## Transformation
- **Type:** transform
- **Description:** Applies conditional logic

## Interface
```typescript
condition_value(value: any): any
```
```

## Integration with SuperInstance

This equipment integrates with the SuperInstance ecosystem:

```typescript
import { OriginCore } from '@superinstance/starter-agent';
import { CellLogicDistiller } from '@superinstance/equipment-cell-logic-distiller';

const agent = new OriginCore();
const distiller = new CellLogicDistiller();

// Register and equip
agent.registerEquipment(distiller);
await agent.equip('CellLogicDistiller');

// Use via agent
const result = distiller.distill({ prompt, response });
```

## Equipment Metadata

| Property | Value |
|----------|-------|
| Slot | `DISTILLATION` |
| Memory Cost | ~50MB |
| CPU Impact | ~15% |
| Latency | ~500ms |

## License

MIT © SuperInstance Team

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a pull request.
