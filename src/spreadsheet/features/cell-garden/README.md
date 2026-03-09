# Cell Garden - Ecosystem Visualization

Beautiful, performant visualization of cell networks with interactive layouts and real-time rendering.

## Overview

Cell Garden provides an interactive visualization of LOG cell networks, showing how cells connect, interact, and evolve over time. It features multiple layout algorithms, smooth animations, and comprehensive controls for exploring cell ecosystems.

## Features

### Layout Algorithms

- **Force-Directed**: Physics-based simulation for natural-looking networks
- **Circular**: Arranges nodes in a circle for small networks
- **Hierarchical**: Layers nodes based on dependency relationships
- **Grid**: Regular grid layout for organized viewing
- **Spatial**: Positions nodes based on spreadsheet coordinates

### Visualization Features

- Color coding by cell type and state
- Size based on activity/confidence levels
- Animated connections for entanglements
- Hover tooltips with detailed cell information
- Click to inspect cells
- Real-time WebSocket updates
- Export to PNG/JPEG

### Interactive Controls

- Layout selector
- Cell type/state filtering
- Search functionality
- Zoom controls
- Export options
- Reset functionality

## Usage

### Basic Setup

```typescript
import { createCellGarden, LayoutType } from './features/cell-garden/index.js';

// Create container
const container = document.getElementById('garden-container')!;
const controlsContainer = document.getElementById('garden-controls')!;

// Create garden
const garden = createCellGarden({
  width: 800,
  height: 600,
  container,
  controlsContainer,
  initialLayout: LayoutType.FORCE_DIRECTED,
  useWebGL: false,
  enableAnimation: true,
  enableControls: true,
  enableTooltip: true,
  onNodeClick: (cell) => {
    console.log('Clicked cell:', cell);
  },
  onNodeHover: (cell) => {
    console.log('Hovered cell:', cell);
  },
});
```

### Setting Data

```typescript
// Define cells
const cells = [
  {
    id: 'A1',
    type: CellType.INPUT,
    state: CellState.DORMANT,
    position: { row: 1, col: 1 },
    activity: 0.8,
    confidence: 0.9,
    lastExecution: Date.now(),
    description: 'Sales data input',
  },
  // ... more cells
];

// Define connections
const connections = [
  {
    source: 'A1',
    target: 'A2',
    type: 'data',
    strength: 0.8,
  },
  // ... more connections
];

// Update garden
garden.setCells(cells);
garden.setConnections(connections);
```

### Real-time Updates

```typescript
// Connect to WebSocket
garden.connectWebSocket('ws://localhost:3000/garden');

// Or update manually
garden.updateCell({
  id: 'A1',
  type: CellType.INPUT,
  state: CellState.PROCESSING,
  position: { row: 1, col: 1 },
  activity: 0.9,
  confidence: 0.95,
});

garden.addCell(newCell);
garden.removeCell('A2');
```

### Changing Layouts

```typescript
// Switch to different layout
garden.setLayout(LayoutType.CIRCULAR);

// Or via controls
garden.getLayout(); // Get current layout
```

### Filtering

```typescript
// Filter by cell type
garden.setFilters({
  types: [CellType.INPUT, CellType.OUTPUT],
});

// Filter by state
garden.setFilters({
  states: [CellState.PROCESSING, CellState.EMITTING],
});

// Search
garden.setFilters({
  searchQuery: 'sales',
});

// Get current filters
const filters = garden.getFilters();
```

### Export

```typescript
// Export as image
garden.exportVisualization('png');
garden.exportVisualization('jpeg');
```

## Architecture

### Components

1. **CellGarden** (`CellGarden.tsx`)
   - Main orchestrator component
   - Manages layout, rendering, and user interaction
   - Handles WebSocket connections
   - Coordinates updates between components

2. **NetworkLayout** (`NetworkLayout.ts`)
   - Layout algorithm implementations
   - Force-directed, circular, hierarchical, grid, and spatial layouts
   - Physics-based simulation engine
   - Factory pattern for layout creation

3. **GardenRenderer** (`GardenRenderer.tsx`)
   - Canvas-based 2D rendering
   - Optional WebGL acceleration for large networks
   - Handles animations and visual effects
   - Manages hover and click detection

4. **GardenControls** (`GardenControls.tsx`)
   - Interactive UI controls
   - Layout selector, filters, zoom, export
   - Tooltip component for cell information
   - Event handling and callbacks

### Data Flow

```
Cell Data → Layout Algorithm → Positioned Nodes
                                      ↓
                              Renderer → Canvas
                                      ↑
                            User Controls
                                      ↓
                              Interaction Events
```

## Performance

- **Small networks** (< 50 nodes): Canvas rendering with animations
- **Medium networks** (50-500 nodes): Canvas with selective animations
- **Large networks** (> 500 nodes): WebGL rendering with simplified visuals

### Optimization Tips

1. **Use appropriate layout**: Choose layout based on network structure
   - Force-directed: General networks
   - Hierarchical: Dependency chains
   - Circular: Small, tightly-connected networks

2. **Filter for focus**: Use filters to show only relevant cells

3. **Disable animations**: For very large networks, disable animations

4. **WebGL for large networks**: Enable WebGL for networks with 500+ nodes

## Testing

```bash
# Run tests
npm test garden.test.ts

# Run with coverage
npm run test:coverage
```

## Examples

See the `examples/` directory for complete examples:
- Basic garden setup
- Real-time updates
- Custom layouts
- Filtering and search
- Export functionality

## API Reference

### CellGarden

Main class for creating and managing cell garden visualizations.

#### Constructor

```typescript
constructor(config: CellGardenConfig)
```

#### Methods

- `setCells(cells: CellData[]): void`
- `setConnections(connections: CellConnection[]): void`
- `updateCell(cell: CellData): void`
- `addCell(cell: CellData): void`
- `removeCell(cellId: string): void`
- `setLayout(layout: LayoutType): void`
- `setFilters(filters: Partial<CellFilters>): void`
- `exportVisualization(format: 'png' | 'jpeg'): void`
- `connectWebSocket(url: string): void`
- `disconnectWebSocket(): void`
- `startAnimation(): void`
- `stopAnimation(): void`
- `destroy(): void`

#### Properties

- `getCells(): CellData[]`
- `getConnections(): CellConnection[]`
- `getLayout(): LayoutType`
- `getFilters(): CellFilters`

### LayoutType

```typescript
enum LayoutType {
  FORCE_DIRECTED = 'force-directed',
  CIRCULAR = 'circular',
  HIERARCHICAL = 'hierarchical',
  GRID = 'grid',
  SPATIAL = 'spatial',
}
```

### CellData

```typescript
interface CellData {
  id: string;
  type: CellType;
  state: CellState;
  position: CellPosition;
  activity: number;
  confidence: number;
  lastExecution?: number;
  description?: string;
}
```

### CellConnection

```typescript
interface CellConnection {
  source: string;
  target: string;
  type: 'data' | 'control' | 'sensation' | 'entanglement';
  strength?: number;
}
```

## License

MIT

## Contributing

Contributions welcome! Please see the main project README for guidelines.
