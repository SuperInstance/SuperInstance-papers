# Advanced Data Visualization Components for POLLN

This directory contains advanced data visualization components designed for the POLLN spreadsheet system. Each component is fully interactive, accessible, and optimized for performance.

## Components

### 1. VisualizationRegistry.ts (~924 lines)
Central registry for all visualization types with:
- **Registry Management**: Track all available visualization types and their metadata
- **Data Adapters**: Built-in adapters for various data formats
  - `NumericArrayAdapter`: Simple numeric arrays
  - `TimeSeriesAdapter`: Time-stamped data
  - `CategoricalAdapter`: Category-value pairs
  - `MatrixAdapter`: 2D matrices for heatmaps
  - `NetworkAdapter`: Graph/network structures
  - `HierarchicalAdapter`: Nested tree structures
- **Factory Pattern**: Create visualizations from cell data automatically
- **Rendering Pipeline**: Consistent rendering and export functionality
- **Smart Suggestions**: Recommend best visualizations based on data structure

### 2. NetworkGraph.tsx (~552 lines)
Force-directed graph visualization featuring:
- **Interactive Layout**: D3.js force simulation with customizable parameters
- **Drag & Drop**: Reposition nodes interactively
- **Zoom & Pan**: Full viewport navigation
- **Clustering**: Automatic node clustering algorithm
- **Styling**: Customizable node sizes, colors, and link widths
- **Tooltips**: Rich hover information display
- **Legend**: Dynamic group-based legend
- **Selection**: Click nodes to view detailed information

### 3. Heatmap.tsx (~490 lines)
2D heatmap visualization with:
- **Multiple Color Scales**: 
  - Sequential: Viridis, Plasma, Inferno, Magma, Cividis
  - Diverging: Warm, Cool
  - Perceptual: Blues, Reds, Greens
  - Custom: User-defined color gradients
- **Interpolation Methods**: Nearest, Linear, Bilinear, Cubic
- **Contour Lines**: Optional overlay with configurable levels
- **Interactive Tooltips**: Cell-level data inspection
- **Color Legend**: Positionable gradient scale
- **Axis Labels**: Support for categorical labels
- **Performance**: Optimized rendering for large matrices

### 4. SankeyDiagram.tsx (~489 lines)
Flow visualization for transformations featuring:
- **Automatic Layout**: D3-sankey algorithm for optimal positioning
- **Gradient Links**: Beautiful gradient coloring from source to target
- **Interactive Filtering**: Click to filter flows
- **Node Styling**: Customizable colors, sizes, and labels
- **Value Labels**: Show flow values on hover
- **Zoom & Pan**: Navigate large diagrams
- **Tooltips**: Rich information for nodes and links
- **Sorting**: Option to sort nodes by value

### 5. ParallelCoordinates.tsx (~563 lines)
Multi-dimensional data visualization with:
- **Brushing & Filtering**: Filter data along any dimension
- **Axis Reordering**: Drag to reorder axes
- **Highlighting**: Highlight filtered lines
- **Normalization**: MinMax, Z-score, and rank methods
- **Multi-Series**: Support for multiple data series
- **Interactive Tooltips**: Point-level data inspection
- **Selection**: Click lines to select data points
- **Performance**: Optimized for large datasets

### 6. Treemap.tsx (~530 lines)
Hierarchical data visualization featuring:
- **Squarified Algorithm**: Optimal space utilization
- **Drill-Down**: Click to navigate hierarchy
- **Breadcrumbs**: Easy navigation back up the tree
- **Color Coding**: By category, value, depth, or custom
- **Labels**: Smart label positioning and sizing
- **Statistics**: Node count, depth, and leaf count
- **Zoom**: Built-in zoom support
- **Hierarchy Lines**: Optional visual hierarchy indicators

### 7. RadarChart.tsx (~437 lines)
Multi-variable comparison visualization with:
- **Multiple Series**: Compare multiple data sets
- **Customizable Axes**: Define your own dimensions
- **Area Fills**: Configurable fill opacity
- **Grid Levels**: Adjustable number of grid levels
- **Points**: Show data points on axes
- **Animations**: Smooth entrance animations
- **Legend**: Series legend with hover effects
- **Tooltips**: Value display on hover

### 8. ScatterPlot3D.tsx (~700 lines)
Three-dimensional point cloud with:
- **True 3D Rendering**: Canvas-based 3D projection
- **Rotation**: Drag to rotate in 3D space
- **Zoom**: Scroll to zoom in/out
- **Color Mapping**: By X, Y, Z, or custom dimension
- **Regression Plane**: Optional regression plane overlay
- **Selection**: Click to select points
- **Multiple Series**: Support for multiple data series
- **Labels**: Optional point labels
- **Performance**: Optimized for large point clouds

### 9. index.ts (~248 lines)
Central export module with:
- **Component Exports**: All visualization components
- **Type Exports**: TypeScript type definitions
- **Factory Function**: Dynamic component creation
- **Metadata**: Visualization metadata and descriptions
- **Utilities**: Helper functions for visualization management

## Key Features

### Performance Optimization
- Virtual rendering for large datasets
- Efficient update algorithms
- Optimized D3.js usage
- Canvas-based rendering for 3D

### Accessibility
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatible
- High contrast mode support

### Responsive Design
- Flexible sizing options
- Touch-friendly interactions
- Mobile-optimized layouts
- Adaptive tooltips

### Integration
- Works with LogCell data system
- Type-safe TypeScript APIs
- Event callbacks for interactions
- Export functionality (PNG, SVG, JSON, CSV)

## Usage Example

```typescript
import { NetworkGraph, Heatmap, visualizationRegistry } from './visualizations';

// Use a component directly
<NetworkGraph 
  data={{ nodes: [...], links: [...] }}
  width={800}
  height={600}
  onNodeClick={(node) => console.log(node)}
/>

// Or use the registry to auto-detect visualization
const viz = visualizationRegistry.createVisualization(cell, {
  type: 'network',
  options: { responsive: true }
});
```

## Dependencies

- **d3**: Core visualization library
- **React**: UI framework
- **TypeScript**: Type safety

## File Structure

```
visualizations/
├── VisualizationRegistry.ts    # Registry and factory
├── NetworkGraph.tsx            # Force-directed graphs
├── Heatmap.tsx                 # 2D heatmaps
├── SankeyDiagram.tsx           # Flow diagrams
├── ParallelCoordinates.tsx     # Multi-dimensional plots
├── Treemap.tsx                 # Hierarchical trees
├── RadarChart.tsx              # Multi-variable comparison
├── ScatterPlot3D.tsx           # 3D point clouds
├── index.ts                    # Central exports
└── README.md                   # This file
```

## Development Status

✅ All components implemented and ready for integration
✅ TypeScript types fully defined
✅ Accessibility features included
✅ Performance optimizations applied
✅ Comprehensive event handling

## Next Steps

1. Integration with cell renderer system
2. Unit tests for each component
3. Storybook documentation
4. Performance benchmarking
5. Additional visualization types as needed
