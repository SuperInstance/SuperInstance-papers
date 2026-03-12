# Voxel Logic

A TypeScript library for 3D voxel-based logic operations and spatial reasoning. Building discrete mathematics in three-dimensional space using voxel primitives.

## Overview

Voxel Logic provides a framework for:
- **3D discrete mathematics** - Operations on voxel grids
- **Spatial logic gates** - Boolean operations in 3D space
- **Voxel algebra** - Mathematical operations on voxel structures
- **Computational geometry** - 3D shape analysis and manipulation
- **Discrete optimization** - Voxel-based problem solving

## Installation

```bash
npm install voxel-logic
```

## Quick Start

```typescript
import { VoxelGrid, LogicGate, VoxelMath } from 'voxel-logic';

// Create a 64x64x64 voxel grid
const grid = new VoxelGrid(64, 64, 64);

// Define logic operations in 3D space
const andGate = LogicGate.createAND({ x: 0, y: 0, z: 0 });
const orGate = LogicGate.createOR({ x: 10, y: 0, z: 0 });

// Apply operations to voxel regions
grid.applyGate(andGate, region);

// Perform voxel mathematics
const result = VoxelMath.subtract(shapeA, shapeB);
```

## Features

### 1. Voxel Grids

```typescript
// Initialize with custom dimensions
const grid = new VoxelGrid(128, 128, 128);

// Set voxel state
grid.setVoxel(x, y, z, true);

// Complex region operations
grid.fillRegion(region, pattern);
grid.clearRegion(region);
grid.invertRegion(region);
```

### 2. Spatial Logic Gates

Implement boolean logic in 3D space:

- **AND Gates** - Intersection of voxel regions
- **OR Gates** - Union of voxel regions
- **NOT Gates** - Inversion of voxel states
- **XOR Gates** - Exclusive disjunction
- **NAND/NOR** - Universal gates

### 3. Voxel Algebra

Mathematical operations on voxel structures:

- **Arithmetic**: Add, subtract, multiply voxel values
- **Set Operations**: Union, intersection, difference
- **Morphological**: Erosion, dilation, opening, closing
- **Distance Transforms**: Euclidean, Manhattan, Chebyshev

### 4. Advanced Operations

- **Convolution**: 3D kernel operations
- **Skeletonization**: Extract medial axes
- **Marching Cubes**: Surface extraction
- **Connectivity**: 6, 18, and 26-connected components

## Examples

### Boolean Operations

```typescript
// Create two shapes
const sphere = VoxelShapes.sphere(center, radius);
const cube = VoxelShapes.cube(corner, size);

// Spatial boolean math
const intersection = VoxelMath.intersect(sphere, cube);
const union = VoxelMath.union(sphere, cube);
const difference = VoxelMath.subtract(sphere, cube);
```

### Pathfinding in Voxel Space

```typescript
const pathfinder = new VoxelPathfinder(grid);
const path = pathfinder.findPath(start, goal, {
    allowDiagonal: true,
    weightFunction: (voxel) => voxel.density
});
```

### Generative Design

```typescript
// Generate complex structures
const tree = VoxelGenerators.generateTree({
    height: 20,
    branches: 8,
    leafDensity: 0.8
});

// Apply L-systems in 3D
const lsys = new VoxelLSystem(rules);
const structure = lsys.generate(iterations);
```

## Use Cases

Voxel Logic is ideal for:

- **Game Development** - 3D world generation and manipulation
- **Scientific Computing** - Discrete spatial modeling
- **Computer Graphics** - Volume rendering and processing
- **Robotics** - 3D path planning and spatial reasoning
- **Medical Imaging** - Volume analysis and visualization
- **Additive Manufacturing** - 3D printing path optimization

## Performance

Optimized for performance with:
- Sparse voxel storage
- Bit-packed voxel data
- SIMD operations where available
- Spatial indexing for fast queries
- Memory-efficient algorithms

## API Reference

See [API Documentation](./docs/api.md) for complete reference.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related

- [confidence-cascade](https://github.com/SuperInstance/confidence-cascade) - Decision confidence system
- [stigmergy](https://github.com/SuperInstance/stigmergy) - Bio-inspired coordination
- [POLLN](https://github.com/SuperInstance/Polln-whitepapers) - Research and theory papers

---

*Part of the SuperInstance ecosystem*