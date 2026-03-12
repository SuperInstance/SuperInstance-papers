# Platonic Randomness

A TypeScript library for generating and manipulating randomness using Platonic solid geometries. Produces high-quality, visually pleasing random patterns with mathematical foundations.

## Overview

Traditional random number generators produce uniformly distributed values. Platonic Randomness uses the symmetries and properties of Platonic solids to generate more interesting, structured randomness.

Think of it like dice with personality - each Platonic solid (tetrahedron, cube, octahedron, dodecahedron, icosahedron) has different mathematical properties that affect the randomness it produces.

## Installation

```bash
npm install platonic-randomness
```

## Quick Start

```typescript
import { PlatonicRNG, SolidType, PatternGenerator } from 'platonic-randomness';

// Create a RNG based on a dodecahedron (12 faces)
const rng = new PlatonicRNG(SolidType.DODECAHEDRON);

// Generate structured random numbers
const value = rng.nextFloat(); // 0.0 to 1.0
const int = rng.nextInt(1, 100);
const bool = rng.nextBoolean(0.7); // 70% true probability

// Generate patterns with visual appeal
const pattern = PatternGenerator.symmetricPattern(
  size: 64,
  symmetry: 'icosahedral'
);
```

## Platonic Solids

### The Five Solids

| Solid | Faces | Edges | Vertices | Dual Solid | Randomness Quality |
|-------|--------|--------|----------|------------|-------------------|
| Tetrahedron | 4 | 6 | 4 | Self | Chaotic, fast-changing |
| Cube | 6 | 12 | 8 | Octahedron | Balanced, predictable |
| Octahedron | 8 | 12 | 6 | Cube | Smooth transitions |
| Dodecahedron | 12 | 30 | 20 | Icosahedron | Complex, beautiful |
| Icosahedron | 20 | 30 | 12 | Dodecahedron | Most uniform |

### Mathematical Properties

Each solid has unique symmetries:

- **Rotational symmetry groups**: A4, S4, A5
- **Golden ratio**: Hidden in dodecahedron and icosahedron
- **Euler characteristic**: V - E + F = 2
- **Dual relationships**: Cube↔Octahedron, Dodecahedron↔Icosahedron

## Core Features

### 1. Platonic RNG

```typescript
const rng = new PlatonicRNG(SolidType.ICOSAHEDRON, seed);

// Standard PRNG interface
const float = rng.nextFloat();      // 0.0 to 1.0
const range = rng.nextRange(10, 50); // Integer range
const gaussian = rng.nextGaussian(); // Normal distribution

// Platonic-specific
const faceIndex = rng.nextFace();    // Which face "lands up"
const vertex = rng.nextVertex();     // Random vertex coordinates
```

### 2. Symmetric Pattern Generation

```typescript
// Create visually pleasing symmetric patterns
const pattern = new SymmetricPattern({
  baseSeed: 42,
  symmetryGroup: 'icosahedral',
  resolution: 256
});

// Generate 2D pattern with Platonic symmetry
const canvas = pattern.generate2D({
  colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
  iterations: 1000
});

// 3D point distributions
const spherePoints = pattern.distributeOnSphere(1000);
```

### 3. Geometric Randomness

```typescript
// Generate random orientations
const rotation = PlatonicRandom.rotation(SolidType.CUBE);
const quaternion = rotation.toQuaternion();

// Random Platonic coordinates
const coords = PlatonicRandom.coordinates(type, count);

// Golden ratio applications
const phiRandom = PlatonicRandom.golden(seed);
```

## Advanced Usage

### Custom Symmetry Groups

```typescript
// Define custom symmetry operation
const customGroup = new SymmetryGroup({
  generators: [rotation1, rotation2, rotation3],
  order: 60
});

const customRNG = new PlatonicRNG(customGroup);
```

### Quantum-Inspired Randomness

```typescript
// Simulate quantum superposition with Platonic geometry
const quantum = new QuantumPlatonic({
  basis: SolidType.DODECAHEDRON,
  entanglement: true,
  measurement: 'face-projection'
});

const superposed = quantum.generateSuperposed(10);
const measured = quantum.measure(superposed);
```

### Artistic Applications

```typescript
// Generate generative art
const art = new PlatonicArtGenerator({
  palette: 'sunset',
  complexity: 0.8,
  symmetry: 'golden-ratio'
});

const image = await art.generate({
  width: 1920,
  height: 1080,
  style: 'abstract-geometric'
});
```

## Mathematical Background

### Golden Ratio Appearances

Hidden throughout the dodecahedron and icosahedron:

```typescript
const phi = (1 + Math.sqrt(5)) / 2; // ≈ 1.618

// Icosahedron vertex coordinates use phi
const vertices = [
  [0, ±1, ±φ],
  [±1, ±φ, 0],
  [±φ, 0, ±1]
];
```

### Symmetry Group Theory

- **A4**: Tetrahedron (12 rotations)
- **S4**: Cube/Octahedron (24 rotations)
- **A5**: Dodecahedron/Icosahedron (60 rotations)

These finite groups ensure non-repeating patterns.

### Quasicrystals

Emulate quasicrystal properties:
- Non-periodic but ordered
- Long-range order without translational symmetry
- Self-similar at different scales

## Examples

### Generating Terrain

```typescript
// Natural-looking terrain using icosahedral symmetry
const terrain = new TerrainGenerator({
  baseRNG: new PlatonicRNG(SolidType.ICOSAHEDRON),
  octaves: 6,
  persistence: 0.5
});

const heightmap = terrain.generate(512, 512);
```

### Artistic Textures

```typescript
// Create unique procedural textures
const texture = new PlatonicTexture({
  baseShape: SolidType.OCTAHEDRON,
  perturbation: 0.3,
  colorScheme: 'harmonic'
});

const marblePattern = texture.generate('marble', 1024, 1024);
```

### Cryptographic Applications

```typescript
// Secure randomness from geometric properties
const secureRNG = new SecurePlatonic({
  solids: [SolidType.DODECAHEDRON, SolidType.ICOSAHEDRON],
  reseeding: 'continuous',
  entropySource: 'quantum'
});
```

## Performance

Optimized implementations:
- LUT-based face selection (O(1))
- Cached geometric properties
- SIMD-optimized rotations
- Lazy evaluation for patterns

## API Reference

See [API Documentation](./docs/api.md) for complete reference.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Academic References

- Plato's "Timaeus" (c. 360 BCE)
- Euler, L. "Elementa doctrinae solidorum" (1758)
- Coxeter, H.S.M. "Regular Polytopes" (1948)
- Conway, J.H. et al. "The Symmetries of Things" (2008)

## Related

- [confidence-cascade](https://github.com/SuperInstance/confidence-cascade) - Decision confidence system
- [voxel-logic](https://github.com/SuperInstance/voxel-logic) - 3D spatial reasoning
- [POLLN](https://github.com/SuperInstance/Polln-whitepapers) - Research and theory papers

---

*"Geometry is knowledge of the eternally existent" - Pythagoras*