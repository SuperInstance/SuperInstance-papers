/**
 * TENSOR PLANE SIMULATION FRAMEWORK
 * Iteration 3: Tensor Plane Simulations
 * 
 * A comprehensive framework for simulating LOG tensor plane systems,
 * cross-section extraction, rotation operators, and pattern discovery.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Vector {
  components: number[];
}

interface TensorCell {
  id: string;
  position: Vector;
  value: number;
  features: number[];
  sector: number;
  radius: number;
}

interface OriginConfig {
  dimensions: number;
  base: number; // 12, 60, or 360
}

interface PlaneDefinition {
  normal: Vector;
  distance: number;
  origin: Vector;
}

interface CrossSection {
  id: string;
  plane: PlaneDefinition;
  cells: TensorCell[];
  densityMap: number[][];
  boundary: Vector[];
  timestamp: number;
}

interface RotationOperator {
  matrix: number[][];
  axis: Vector;
  angle: number;
}

interface PatternResult {
  type: string;
  confidence: number;
  location: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface HealthScore {
  overall: number;
  concentric: number;
  sector: number;
  density: number;
  anomaly: number;
}

interface SimulationResult {
  tensorId: string;
  config: OriginConfig;
  crossSections: CrossSection[];
  patterns: PatternResult[];
  healthScore: HealthScore;
  rotationHistory: RotationRecord[];
  anomalies: AnomalyRecord[];
}

interface RotationRecord {
  angle: number;
  sector: number;
  patternChange: number;
  densityShift: number;
}

interface AnomalyRecord {
  type: string;
  location: Vector;
  severity: number;
  description: string;
}

// ============================================================================
// VECTOR OPERATIONS
// ============================================================================

class VectorOps {
  static create(components: number[]): Vector {
    return { components: [...components] };
  }

  static zero(dimensions: number): Vector {
    return { components: new Array(dimensions).fill(0) };
  }

  static add(a: Vector, b: Vector): Vector {
    return {
      components: a.components.map((c, i) => c + b.components[i])
    };
  }

  static subtract(a: Vector, b: Vector): Vector {
    return {
      components: a.components.map((c, i) => c - b.components[i])
    };
  }

  static scale(v: Vector, s: number): Vector {
    return {
      components: v.components.map(c => c * s)
    };
  }

  static dot(a: Vector, b: Vector): number {
    return a.components.reduce((sum, c, i) => sum + c * b.components[i], 0);
  }

  static norm(v: Vector): number {
    return Math.sqrt(v.components.reduce((sum, c) => sum + c * c, 0));
  }

  static normalize(v: Vector): Vector {
    const n = VectorOps.norm(v);
    if (n < 1e-10) return v;
    return VectorOps.scale(v, 1 / n);
  }

  static cross3D(a: Vector, b: Vector): Vector {
    // Cross product for 3D vectors
    return {
      components: [
        a.components[1] * b.components[2] - a.components[2] * b.components[1],
        a.components[2] * b.components[0] - a.components[0] * b.components[2],
        a.components[0] * b.components[1] - a.components[1] * b.components[0]
      ]
    };
  }

  static angle(a: Vector, b: Vector): number {
    const cosAngle = VectorOps.dot(a, b) / (VectorOps.norm(a) * VectorOps.norm(b));
    return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  }

  static randomUnit(dimensions: number): Vector {
    const components: number[] = [];
    for (let i = 0; i < dimensions; i++) {
      components.push(Math.random() * 2 - 1);
    }
    return VectorOps.normalize({ components });
  }
}

// ============================================================================
// LOG TENSOR CLASS
// ============================================================================

class LOGTensor {
  private config: OriginConfig;
  private origin: Vector;
  private cells: TensorCell[] = [];
  private cellIdCounter: number = 0;

  constructor(config: OriginConfig) {
    this.config = config;
    this.origin = VectorOps.zero(config.dimensions);
  }

  setOrigin(origin: Vector): void {
    this.origin = origin;
  }

  getOrigin(): Vector {
    return this.origin;
  }

  getConfig(): OriginConfig {
    return this.config;
  }

  addCell(position: Vector, value: number, features: number[]): TensorCell {
    const relPos = VectorOps.subtract(position, this.origin);
    const radius = VectorOps.norm(relPos);
    const sector = this.computeSector(relPos);

    const cell: TensorCell = {
      id: `cell_${this.cellIdCounter++}`,
      position: relPos,
      value,
      features,
      sector,
      radius
    };

    this.cells.push(cell);
    return cell;
  }

  private computeSector(position: Vector): number {
    // Compute sector based on angle in first two dimensions
    const angle = Math.atan2(position.components[1], position.components[0]);
    const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
    return Math.floor(normalizedAngle * this.config.base) % this.config.base;
  }

  getCells(): TensorCell[] {
    return [...this.cells];
  }

  getCellsBySector(sector: number): TensorCell[] {
    return this.cells.filter(c => c.sector === sector);
  }

  // Generate random tensor with specified properties
  static generateRandom(config: OriginConfig, numCells: number, distribution: string = 'gaussian'): LOGTensor {
    const tensor = new LOGTensor(config);

    for (let i = 0; i < numCells; i++) {
      let position: Vector;

      switch (distribution) {
        case 'gaussian':
          position = VectorOps.create(
            config.dimensions.map(() => randomGaussian(0, 1))
          );
          break;
        case 'uniform':
          position = VectorOps.create(
            config.dimensions.map(() => Math.random() * 4 - 2)
          );
          break;
        case 'concentric':
          const angle = Math.random() * 2 * Math.PI;
          const radius = Math.random() * 2;
          position = VectorOps.create([
            radius * Math.cos(angle),
            radius * Math.sin(angle),
            ...new Array(config.dimensions - 2).fill(0).map(() => Math.random() * 0.5 - 0.25)
          ]);
          break;
        case 'directional':
          const dirAngle = Math.PI / 4; // Bias toward specific direction
          position = VectorOps.create([
            randomGaussian(2 * Math.cos(dirAngle), 0.5),
            randomGaussian(2 * Math.sin(dirAngle), 0.5),
            ...new Array(config.dimensions - 2).fill(0).map(() => Math.random() * 0.3 - 0.15)
          ]);
          break;
        case 'clustered':
          // Create clustered distribution
          const clusterCenter = VectorOps.randomUnit(config.dimensions);
          const clusterRadius = 0.5 + Math.random() * 0.5;
          position = VectorOps.add(
            VectorOps.scale(clusterCenter, clusterRadius),
            VectorOps.create(config.dimensions.map(() => randomGaussian(0, 0.3)))
          );
          break;
        default:
          position = VectorOps.randomUnit(config.dimensions);
      }

      const value = randomGaussian(0.5, 0.2);
      const features = new Array(config.dimensions).fill(0).map(() => Math.random());

      tensor.addCell(position, value, features);
    }

    return tensor;
  }
}

// Helper function for Gaussian random
function randomGaussian(mean: number, stdDev: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

// ============================================================================
// PLANE EXTRACTION
// ============================================================================

class PlaneExtractor {
  private tolerance: number;

  constructor(tolerance: number = 0.1) {
    this.tolerance = tolerance;
  }

  extractCrossSection(tensor: LOGTensor, plane: PlaneDefinition): CrossSection {
    const cells = tensor.getCells();
    const extractedCells: TensorCell[] = [];

    for (const cell of cells) {
      const distance = Math.abs(
        VectorOps.dot(cell.position, plane.normal) - plane.distance
      );

      if (distance < this.tolerance) {
        // Project cell onto plane
        const projectedPos = VectorOps.subtract(
          cell.position,
          VectorOps.scale(plane.normal, VectorOps.dot(cell.position, plane.normal) - plane.distance)
        );

        extractedCells.push({
          ...cell,
          position: projectedPos
        });
      }
    }

    // Compute density map
    const densityMap = this.computeDensityMap(extractedCells);

    // Compute boundary (convex hull approximation)
    const boundary = this.computeBoundary(extractedCells);

    return {
      id: `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      plane,
      cells: extractedCells,
      densityMap,
      boundary,
      timestamp: Date.now()
    };
  }

  private computeDensityMap(cells: TensorCell[], resolution: number = 20): number[][] {
    const densityMap: number[][] = [];
    for (let i = 0; i < resolution; i++) {
      densityMap.push(new Array(resolution).fill(0));
    }

    if (cells.length === 0) return densityMap;

    // Find bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const cell of cells) {
      minX = Math.min(minX, cell.position.components[0]);
      maxX = Math.max(maxX, cell.position.components[0]);
      minY = Math.min(minY, cell.position.components[1]);
      maxY = Math.max(maxY, cell.position.components[1]);
    }

    const rangeX = maxX - minX + 0.1;
    const rangeY = maxY - minY + 0.1;

    // Compute density
    for (const cell of cells) {
      const gridX = Math.floor(((cell.position.components[0] - minX) / rangeX) * (resolution - 1));
      const gridY = Math.floor(((cell.position.components[1] - minY) / rangeY) * (resolution - 1));

      if (gridX >= 0 && gridX < resolution && gridY >= 0 && gridY < resolution) {
        densityMap[gridY][gridX] += cell.value;
      }
    }

    return densityMap;
  }

  private computeBoundary(cells: TensorCell[]): Vector[] {
    if (cells.length < 3) return cells.map(c => c.position);

    // Simple convex hull approximation using Graham scan
    const points = cells.map(c => ({
      x: c.position.components[0],
      y: c.position.components[1]
    }));

    // Sort by angle from centroid
    const centroid = {
      x: points.reduce((s, p) => s + p.x, 0) / points.length,
      y: points.reduce((s, p) => s + p.y, 0) / points.length
    };

    points.sort((a, b) => {
      const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
      const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
      return angleA - angleB;
    });

    // Return outermost points
    const numBoundary = Math.min(12, points.length);
    const step = Math.floor(points.length / numBoundary);

    return points
      .filter((_, i) => i % step === 0)
      .map(p => VectorOps.create([p.x, p.y]));
  }

  // Generate sector-aligned planes
  generateSectorPlanes(base: number): PlaneDefinition[] {
    const planes: PlaneDefinition[] = [];
    const angleStep = (2 * Math.PI) / base;

    for (let sector = 0; sector < base; sector++) {
      const angle = angleStep * sector;
      const normal = VectorOps.create([
        Math.cos(angle + Math.PI / 2),
        Math.sin(angle + Math.PI / 2),
        ...new Array(8).fill(0) // Pad to 10D
      ]);

      planes.push({
        normal,
        distance: 0,
        origin: VectorOps.zero(10)
      });
    }

    return planes;
  }

  // Generate radial shell planes
  generateRadialPlanes(maxRadius: number, numShells: number): PlaneDefinition[] {
    const shells: PlaneDefinition[] = [];
    const radiusStep = maxRadius / numShells;

    for (let i = 0; i < numShells; i++) {
      const radius = radiusStep * (i + 0.5);
      // Radial shells aren't planes in the traditional sense
      // We approximate by using planes tangent to the sphere
      for (let angle = 0; angle < 12; angle++) {
        const normal = VectorOps.create([
          Math.cos((angle * Math.PI) / 6),
          Math.sin((angle * Math.PI) / 6),
          ...new Array(8).fill(0)
        ]);

        shells.push({
          normal,
          distance: radius,
          origin: VectorOps.zero(10)
        });
      }
    }

    return shells;
  }
}

// ============================================================================
// ROTATION OPERATORS
// ============================================================================

class RotationOperators {
  // Create rotation matrix around axis by angle
  static createRotationMatrix(axis: Vector, angle: number): number[][] {
    const dim = axis.components.length;

    if (dim === 3) {
      // Rodrigues' rotation formula for 3D
      const K = [
        [0, -axis.components[2], axis.components[1]],
        [axis.components[2], 0, -axis.components[0]],
        [-axis.components[1], axis.components[0], 0]
      ];

      // R = I + sin(θ)K + (1-cos(θ))K²
      const sinTheta = Math.sin(angle);
      const cosTheta = Math.cos(angle);

      const result: number[][] = [];
      for (let i = 0; i < 3; i++) {
        result.push([]);
        for (let j = 0; j < 3; j++) {
          // Identity term
          let val = i === j ? 1 : 0;
          // sin(θ)K term
          val += sinTheta * K[i][j];
          // (1-cos(θ))K² term
          for (let k = 0; k < 3; k++) {
            val += (1 - cosTheta) * K[i][k] * K[k][j];
          }
          result[i].push(val);
        }
      }
      return result;
    }

    // For higher dimensions, create block rotation
    const result: number[][] = [];
    for (let i = 0; i < dim; i++) {
      result.push(new Array(dim).fill(0));
      result[i][i] = 1;
    }

    // Apply rotation in first two dimensions (xy-plane)
    result[0][0] = Math.cos(angle);
    result[0][1] = -Math.sin(angle);
    result[1][0] = Math.sin(angle);
    result[1][1] = Math.cos(angle);

    return result;
  }

  // Apply rotation to vector
  static applyRotation(vector: Vector, matrix: number[][]): Vector {
    const dim = vector.components.length;
    const result: number[] = new Array(dim).fill(0);

    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        result[i] += matrix[i][j] * vector.components[j];
      }
    }

    return { components: result };
  }

  // Sector rotation operator
  static sectorRotation(base: number, sectors: number): number[][] {
    const angle = (2 * Math.PI * sectors) / base;
    const axis = VectorOps.create([0, 0, 1]); // Z-axis for 2D sector rotation
    return this.createRotationMatrix(axis, angle);
  }

  // Tilt rotation operator
  static tiltRotation(tiltAngle: number): number[][] {
    const axis = VectorOps.create([1, 0, 0]); // X-axis for tilt
    return this.createRotationMatrix(axis, tiltAngle);
  }

  // Multi-axis rotation
  static multiAxisRotation(angles: { x: number; y: number; z: number }, dim: number): number[][] {
    const Rx = this.createRotationMatrix(VectorOps.create([1, 0, 0, ...new Array(dim - 3).fill(0)]), angles.x);
    const Ry = this.createRotationMatrix(VectorOps.create([0, 1, 0, ...new Array(dim - 3).fill(0)]), angles.y);
    const Rz = this.createRotationMatrix(VectorOps.create([0, 0, 1, ...new Array(dim - 3).fill(0)]), angles.z);

    // Compose: Rz * Ry * Rx
    return this.multiplyMatrices(Rz, this.multiplyMatrices(Ry, Rx));
  }

  static multiplyMatrices(A: number[][], B: number[][]): number[][] {
    const n = A.length;
    const result: number[][] = [];
    for (let i = 0; i < n; i++) {
      result.push([]);
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += A[i][k] * B[k][j];
        }
        result[i].push(sum);
      }
    }
    return result;
  }

  // SLERP interpolation for smooth rotation between views
  static slerp(n1: Vector, n2: Vector, t: number): Vector {
    const omega = VectorOps.angle(n1, n2);
    if (omega < 1e-10) return n1;

    const sinOmega = Math.sin(omega);
    const coeff1 = Math.sin((1 - t) * omega) / sinOmega;
    const coeff2 = Math.sin(t * omega) / sinOmega;

    return VectorOps.add(
      VectorOps.scale(n1, coeff1),
      VectorOps.scale(n2, coeff2)
    );
  }
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

class PatternDetector {
  // Detect all patterns in cross-section
  detectPatterns(crossSection: CrossSection, base: number): PatternResult[] {
    const patterns: PatternResult[] = [];

    // Check for concentric pattern
    const concentricPattern = this.detectConcentricPattern(crossSection);
    if (concentricPattern) patterns.push(concentricPattern);

    // Check for sector imbalance
    const sectorPattern = this.detectSectorPattern(crossSection, base);
    if (sectorPattern) patterns.push(sectorPattern);

    // Check for gradient pattern
    const gradientPattern = this.detectGradientPattern(crossSection);
    if (gradientPattern) patterns.push(gradientPattern);

    // Check for clusters
    const clusterPattern = this.detectClusterPattern(crossSection);
    if (clusterPattern) patterns.push(clusterPattern);

    // Check for voids/dead zones
    const voidPattern = this.detectVoidPattern(crossSection, base);
    if (voidPattern) patterns.push(voidPattern);

    // Check for hotspots
    const hotspotPattern = this.detectHotspotPattern(crossSection);
    if (hotspotPattern) patterns.push(hotspotPattern);

    return patterns;
  }

  private detectConcentricPattern(crossSection: CrossSection): PatternResult | null {
    const cells = crossSection.cells;
    if (cells.length < 10) return null;

    // Compute radial moments
    const radii = cells.map(c => c.radius);
    const meanRadius = radii.reduce((s, r) => s + r, 0) / radii.length;
    const stdRadius = Math.sqrt(
      radii.reduce((s, r) => s + (r - meanRadius) ** 2, 0) / radii.length
    );

    // Compute angular distribution
    const angles = cells.map(c => Math.atan2(c.position.components[1], c.position.components[0]));
    const meanAngle = angles.reduce((s, a) => s + a, 0) / angles.length;
    const angleVariance = angles.reduce((s, a) => s + (a - meanAngle) ** 2, 0) / angles.length;

    // Concentric pattern has low angular variance relative to radial
    const concentricity = 1 / (1 + angleVariance / (Math.PI * Math.PI));

    if (concentricity > 0.7) {
      return {
        type: 'CONCENTRIC',
        confidence: concentricity,
        location: 'center',
        description: `Balanced concentric distribution with mean radius ${meanRadius.toFixed(2)} and std ${stdRadius.toFixed(2)}`,
        severity: 'low'
      };
    }

    return null;
  }

  private detectSectorPattern(crossSection: CrossSection, base: number): PatternResult | null {
    const cells = crossSection.cells;
    if (cells.length < 10) return null;

    // Count cells per sector
    const sectorCounts = new Array(base).fill(0);
    const sectorValues = new Array(base).fill(0);

    for (const cell of cells) {
      sectorCounts[cell.sector] += 1;
      sectorValues[cell.sector] += cell.value;
    }

    // Find max/min imbalance
    const maxCount = Math.max(...sectorCounts);
    const minCount = Math.min(...sectorCounts.filter(c => c > 0));
    const imbalanceRatio = maxCount / (minCount || 1);

    // Find dominant sector
    const dominantSector = sectorCounts.indexOf(maxCount);

    if (imbalanceRatio > 3) {
      return {
        type: 'SECTOR_IMBALANCE',
        confidence: Math.min(1, imbalanceRatio / 10),
        location: `sector_${dominantSector}`,
        description: `Sector ${dominantSector} has ${imbalanceRatio.toFixed(1)}x more activity than least active sector`,
        severity: imbalanceRatio > 10 ? 'high' : 'medium'
      };
    }

    return null;
  }

  private detectGradientPattern(crossSection: CrossSection): PatternResult | null {
    const cells = crossSection.cells;
    if (cells.length < 10) return null;

    // Compute value gradient
    let gradX = 0, gradY = 0;
    for (const cell of cells) {
      gradX += cell.value * cell.position.components[0];
      gradY += cell.value * cell.position.components[1];
    }

    const gradMagnitude = Math.sqrt(gradX * gradX + gradY * gradY);
    const gradAngle = Math.atan2(gradY, gradX);

    if (gradMagnitude > 0.5) {
      const direction = this.angleToDirection(gradAngle);
      return {
        type: 'GRADIENT',
        confidence: Math.min(1, gradMagnitude),
        location: direction,
        description: `Strong value gradient toward ${direction} (magnitude: ${gradMagnitude.toFixed(2)})`,
        severity: gradMagnitude > 1 ? 'medium' : 'low'
      };
    }

    return null;
  }

  private detectClusterPattern(crossSection: CrossSection): PatternResult | null {
    const cells = crossSection.cells;
    if (cells.length < 20) return null;

    // Simple clustering based on distance
    const clusterThreshold = 0.5;
    const visited = new Set<string>();
    const clusters: TensorCell[][] = [];

    for (const cell of cells) {
      if (visited.has(cell.id)) continue;

      const cluster: TensorCell[] = [cell];
      visited.add(cell.id);

      // Find neighbors
      for (const other of cells) {
        if (visited.has(other.id)) continue;

        const dist = VectorOps.norm(VectorOps.subtract(cell.position, other.position));
        if (dist < clusterThreshold) {
          cluster.push(other);
          visited.add(other.id);
        }
      }

      if (cluster.length >= 5) {
        clusters.push(cluster);
      }
    }

    if (clusters.length >= 2) {
      return {
        type: 'CLUSTER',
        confidence: 0.7 + 0.1 * clusters.length,
        location: `${clusters.length} clusters`,
        description: `Found ${clusters.length} distinct semantic clusters with ${clusters.reduce((s, c) => s + c.length, 0)} total cells`,
        severity: 'low'
      };
    }

    return null;
  }

  private detectVoidPattern(crossSection: CrossSection, base: number): PatternResult | null {
    const cells = crossSection.cells;
    if (cells.length < 20) return null;

    // Check for empty sectors
    const sectorCounts = new Array(base).fill(0);
    for (const cell of cells) {
      sectorCounts[cell.sector] += 1;
    }

    const emptySectors = sectorCounts.map((count, sector) => ({ count, sector }))
      .filter(s => s.count === 0);

    if (emptySectors.length > 0) {
      return {
        type: 'VOID',
        confidence: emptySectors.length / base,
        location: `sectors ${emptySectors.map(s => s.sector).join(', ')}`,
        description: `Found ${emptySectors.length} empty sectors representing potential dead zones`,
        severity: emptySectors.length > base / 4 ? 'high' : 'medium'
      };
    }

    return null;
  }

  private detectHotspotPattern(crossSection: CrossSection): PatternResult | null {
    const cells = crossSection.cells;
    if (cells.length < 10) return null;

    // Compute mean and std of values
    const mean = cells.reduce((s, c) => s + c.value, 0) / cells.length;
    const std = Math.sqrt(
      cells.reduce((s, c) => s + (c.value - mean) ** 2, 0) / cells.length
    );

    // Find outliers (values > 3 std from mean)
    const threshold = mean + 3 * std;
    const hotspots = cells.filter(c => c.value > threshold);

    if (hotspots.length > 0 && hotspots.length < cells.length * 0.1) {
      return {
        type: 'HOTSPOT',
        confidence: 0.8,
        location: `${hotspots.length} cells`,
        description: `Detected ${hotspots.length} hotspot cells with values > ${threshold.toFixed(2)} (mean + 3σ)`,
        severity: 'high'
      };
    }

    return null;
  }

  private angleToDirection(angle: number): string {
    const degrees = ((angle * 180 / Math.PI) + 360) % 360;
    const directions = ['east', 'northeast', 'north', 'northwest', 'west', 'southwest', 'south', 'southeast'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

class AnomalyDetector {
  // Statistical anomaly detection
  detectStatisticalAnomalies(crossSection: CrossSection): AnomalyRecord[] {
    const anomalies: AnomalyRecord[] = [];
    const cells = crossSection.cells;

    if (cells.length < 10) return anomalies;

    // Compute statistics
    const values = cells.map(c => c.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
    );

    // Z-score based anomaly detection
    for (const cell of cells) {
      const zScore = Math.abs((cell.value - mean) / (std || 1));

      if (zScore > 3) {
        anomalies.push({
          type: 'VALUE_ANOMALY',
          location: cell.position,
          severity: zScore / 5,
          description: `Cell has z-score ${zScore.toFixed(2)} (value: ${cell.value.toFixed(3)})`
        });
      }
    }

    // Spatial anomaly detection (isolated points)
    for (const cell of cells) {
      const neighbors = cells.filter(c => {
        if (c.id === cell.id) return false;
        const dist = VectorOps.norm(VectorOps.subtract(c.position, cell.position));
        return dist < 1.0;
      });

      if (neighbors.length === 0) {
        anomalies.push({
          type: 'SPATIAL_ANOMALY',
          location: cell.position,
          severity: 0.6,
          description: 'Isolated cell with no nearby neighbors within radius 1.0'
        });
      }
    }

    return anomalies;
  }

  // Structural anomaly detection
  detectStructuralAnomalies(crossSection: CrossSection, base: number): AnomalyRecord[] {
    const anomalies: AnomalyRecord[] = [];
    const cells = crossSection.cells;

    // Check for dead zones (expected but missing)
    const sectorCounts = new Array(base).fill(0);
    for (const cell of cells) {
      sectorCounts[cell.sector] += 1;
    }

    const expectedPerSector = cells.length / base;
    for (let sector = 0; sector < base; sector++) {
      if (sectorCounts[sector] < expectedPerSector * 0.1) {
        anomalies.push({
          type: 'DEAD_ZONE',
          location: VectorOps.create([
            Math.cos((sector * 2 * Math.PI) / base),
            Math.sin((sector * 2 * Math.PI) / base)
          ]),
          severity: 1 - sectorCounts[sector] / expectedPerSector,
          description: `Sector ${sector} is under-attended (expected ${expectedPerSector.toFixed(0)}, got ${sectorCounts[sector]})`
        });
      }
    }

    // Check for runaway activations (value saturation)
    const saturatedCells = cells.filter(c => c.value > 0.95);
    if (saturatedCells.length > cells.length * 0.2) {
      anomalies.push({
        type: 'SATURATION',
        location: VectorOps.zero(crossSection.cells[0]?.position.components.length || 2),
        severity: saturatedCells.length / cells.length,
        description: `${saturatedCells.length} cells (${(saturatedCells.length / cells.length * 100).toFixed(1)}%) have saturated values > 0.95`
      });
    }

    return anomalies;
  }

  // Training failure indicators
  detectTrainingFailureIndicators(crossSection: CrossSection): AnomalyRecord[] {
    const anomalies: AnomalyRecord[] = [];
    const cells = crossSection.cells;

    if (cells.length < 20) return anomalies;

    // Check for uniform distribution (potential mode collapse)
    const values = cells.map(c => c.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;

    if (variance < 0.001) {
      anomalies.push({
        type: 'MODE_COLLAPSE',
        location: VectorOps.zero(2),
        severity: 1 - variance * 1000,
        description: `Near-zero variance (${variance.toFixed(6)}) suggests possible mode collapse`
      });
    }

    // Check for NaN-like patterns
    const invalidCells = cells.filter(c => !isFinite(c.value));
    if (invalidCells.length > 0) {
      anomalies.push({
        type: 'NUMERICAL_INSTABILITY',
        location: VectorOps.zero(2),
        severity: 1,
        description: `${invalidCells.length} cells have non-finite values`
      });
    }

    // Check for gradient explosion/vanishing signatures
    const radii = cells.map(c => c.radius);
    const maxRadius = Math.max(...radii);
    const minRadius = Math.min(...radii);

    if (maxRadius > 100 && minRadius < 0.01) {
      anomalies.push({
        type: 'SCALE_INSTABILITY',
        location: VectorOps.zero(2),
        severity: 0.8,
        description: `Extreme scale variation (max: ${maxRadius.toFixed(2)}, min: ${minRadius.toFixed(4)}) suggests gradient issues`
      });
    }

    return anomalies;
  }
}

// ============================================================================
// HEALTH SCORE COMPUTATION
// ============================================================================

class HealthScoreComputer {
  compute(crossSection: CrossSection, base: number): HealthScore {
    return {
      concentric: this.computeConcentricScore(crossSection),
      sector: this.computeSectorScore(crossSection, base),
      density: this.computeDensityScore(crossSection),
      anomaly: this.computeAnomalyScore(crossSection),
      overall: 0
    };
  }

  private computeConcentricScore(crossSection: CrossSection): number {
    const cells = crossSection.cells;
    if (cells.length < 3) return 0.5;

    // Check balance around origin
    let sumX = 0, sumY = 0;
    for (const cell of cells) {
      sumX += cell.position.components[0] * cell.value;
      sumY += cell.position.components[1] * cell.value;
    }

    const centroid = { x: sumX / cells.length, y: sumY / cells.length };
    const centroidDist = Math.sqrt(centroid.x ** 2 + centroid.y ** 2);

    // Score is higher when centroid is close to origin
    return Math.max(0, 1 - centroidDist / 2);
  }

  private computeSectorScore(crossSection: CrossSection, base: number): number {
    const cells = crossSection.cells;
    if (cells.length < base) return 0.5;

    const sectorCounts = new Array(base).fill(0);
    for (const cell of cells) {
      sectorCounts[cell.sector] += 1;
    }

    const expected = cells.length / base;
    const chiSquare = sectorCounts.reduce((sum, count) => sum + (count - expected) ** 2 / expected, 0);

    // Convert chi-square to score (lower is better)
    return Math.exp(-chiSquare / base);
  }

  private computeDensityScore(crossSection: CrossSection): number {
    const densityMap = crossSection.densityMap;
    const resolution = densityMap.length;

    // Compute gradient of density
    let gradientSum = 0;
    let count = 0;

    for (let i = 1; i < resolution - 1; i++) {
      for (let j = 1; j < resolution - 1; j++) {
        const gradX = densityMap[i][j + 1] - densityMap[i][j - 1];
        const gradY = densityMap[i + 1][j] - densityMap[i - 1][j];
        gradientSum += Math.sqrt(gradX ** 2 + gradY ** 2);
        count++;
      }
    }

    const avgGradient = gradientSum / (count || 1);
    // Smooth density has lower gradients
    return Math.exp(-avgGradient);
  }

  private computeAnomalyScore(crossSection: CrossSection): number {
    const detector = new AnomalyDetector();
    const anomalies = [
      ...detector.detectStatisticalAnomalies(crossSection),
      ...detector.detectStructuralAnomalies(crossSection, 12)
    ];

    if (anomalies.length === 0) return 1;

    const totalSeverity = anomalies.reduce((sum, a) => sum + a.severity, 0);
    return Math.exp(-totalSeverity);
  }
}

// ============================================================================
// SIMULATION RUNNER
// ============================================================================

class TensorPlaneSimulation {
  private config: OriginConfig;
  private planeExtractor: PlaneExtractor;
  private patternDetector: PatternDetector;
  private anomalyDetector: AnomalyDetector;
  private healthComputer: HealthScoreComputer;

  constructor(config: OriginConfig) {
    this.config = config;
    this.planeExtractor = new PlaneExtractor();
    this.patternDetector = new PatternDetector();
    this.anomalyDetector = new AnomalyDetector();
    this.healthComputer = new HealthScoreComputer();
  }

  // Run single tensor simulation
  runSingleSimulation(tensor: LOGTensor): SimulationResult {
    const crossSections: CrossSection[] = [];
    const patterns: PatternResult[] = [];
    const anomalies: AnomalyRecord[] = [];
    const rotationHistory: RotationRecord[] = [];

    // Extract cross-sections from all 12 sectors
    const sectorPlanes = this.planeExtractor.generateSectorPlanes(this.config.base);

    for (let sector = 0; sector < this.config.base; sector++) {
      const cs = this.planeExtractor.extractCrossSection(tensor, sectorPlanes[sector]);
      crossSections.push(cs);

      // Detect patterns
      const sectorPatterns = this.patternDetector.detectPatterns(cs, this.config.base);
      patterns.push(...sectorPatterns);

      // Detect anomalies
      const sectorAnomalies = [
        ...this.anomalyDetector.detectStatisticalAnomalies(cs),
        ...this.anomalyDetector.detectStructuralAnomalies(cs, this.config.base),
        ...this.anomalyDetector.detectTrainingFailureIndicators(cs)
      ];
      anomalies.push(...sectorAnomalies);
    }

    // Compute rotation history (simulating rotation through all sectors)
    let previousPatternCount = patterns.length;
    for (let sector = 0; sector < this.config.base; sector++) {
      const cs = crossSections[sector];
      const rotationMatrix = RotationOperators.sectorRotation(this.config.base, 1);

      // Measure pattern change
      const currentPatterns = this.patternDetector.detectPatterns(cs, this.config.base);
      const patternChange = Math.abs(currentPatterns.length - previousPatternCount);

      // Compute density shift
      const densityShift = this.computeDensityShift(
        crossSections[(sector - 1 + this.config.base) % this.config.base],
        cs
      );

      rotationHistory.push({
        angle: (sector * 2 * Math.PI) / this.config.base,
        sector,
        patternChange,
        densityShift
      });

      previousPatternCount = currentPatterns.length;
    }

    // Compute overall health score
    const healthScores = crossSections.map(cs => this.healthComputer.compute(cs, this.config.base));
    const avgHealth: HealthScore = {
      overall: healthScores.reduce((s, h) => s + (h.concentric + h.sector + h.density + h.anomaly) / 4, 0) / healthScores.length,
      concentric: healthScores.reduce((s, h) => s + h.concentric, 0) / healthScores.length,
      sector: healthScores.reduce((s, h) => s + h.sector, 0) / healthScores.length,
      density: healthScores.reduce((s, h) => s + h.density, 0) / healthScores.length,
      anomaly: healthScores.reduce((s, h) => s + h.anomaly, 0) / healthScores.length
    };

    return {
      tensorId: `tensor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      config: this.config,
      crossSections,
      patterns: this.deduplicatePatterns(patterns),
      healthScore: avgHealth,
      rotationHistory,
      anomalies: this.deduplicateAnomalies(anomalies)
    };
  }

  private computeDensityShift(cs1: CrossSection, cs2: CrossSection): number {
    const map1 = cs1.densityMap;
    const map2 = cs2.densityMap;

    let diff = 0;
    const resolution = map1.length;

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        diff += Math.abs(map1[i][j] - map2[i][j]);
      }
    }

    return diff / (resolution * resolution);
  }

  private deduplicatePatterns(patterns: PatternResult[]): PatternResult[] {
    const seen = new Set<string>();
    return patterns.filter(p => {
      const key = `${p.type}_${p.location}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private deduplicateAnomalies(anomalies: AnomalyRecord[]): AnomalyRecord[] {
    const seen = new Set<string>();
    return anomalies.filter(a => {
      const key = `${a.type}_${a.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Run batch simulations
  runBatchSimulation(numTensors: number, distributions: string[]): SimulationResult[] {
    const results: SimulationResult[] = [];

    for (let i = 0; i < numTensors; i++) {
      const distribution = distributions[i % distributions.length];
      const tensor = LOGTensor.generateRandom(this.config, 100 + Math.floor(Math.random() * 50), distribution);
      const result = this.runSingleSimulation(tensor);
      results.push(result);

      if ((i + 1) % 10 === 0) {
        console.log(`Completed ${i + 1}/${numTensors} simulations...`);
      }
    }

    return results;
  }
}

// ============================================================================
// THOUGHT EXPERIMENTS
// ============================================================================

class ThoughtExperiments {
  // What would a "dead" tensor look like?
  static generateDeadTensor(config: OriginConfig): LOGTensor {
    const tensor = new LOGTensor(config);

    // Dead tensor characteristics:
    // - All values near zero
    // - No structure/pattern
    // - Random distribution without clustering

    for (let i = 0; i < 100; i++) {
      const position = VectorOps.randomUnit(config.dimensions);
      const value = randomGaussian(0.01, 0.001); // Near-zero values
      const features = new Array(config.dimensions).fill(0).map(() => Math.random() * 0.01);
      tensor.addCell(position, value, features);
    }

    return tensor;
  }

  // How would overfitting manifest?
  static generateOverfitTensor(config: OriginConfig): LOGTensor {
    const tensor = new LOGTensor(config);

    // Overfitting characteristics:
    // - Extremely concentrated in one small region
    // - All values saturated (near 1)
    // - Empty sectors elsewhere

    const focusSector = Math.floor(Math.random() * config.base);
    const focusAngle = (focusSector * 2 * Math.PI) / config.base;

    for (let i = 0; i < 100; i++) {
      const position = VectorOps.create([
        2 * Math.cos(focusAngle) + randomGaussian(0, 0.1),
        2 * Math.sin(focusAngle) + randomGaussian(0, 0.1),
        ...new Array(config.dimensions - 2).fill(0).map(() => randomGaussian(0, 0.05))
      ]);

      const value = 0.95 + Math.random() * 0.05; // Saturated values
      const features = new Array(config.dimensions).fill(0).map(() => 0.9 + Math.random() * 0.1);

      tensor.addCell(position, value, features);
    }

    return tensor;
  }

  // Training failure patterns
  static generateFailedTrainingTensor(config: OriginConfig, failureType: string): LOGTensor {
    const tensor = new LOGTensor(config);

    switch (failureType) {
      case 'mode_collapse':
        // All cells have identical values
        for (let i = 0; i < 100; i++) {
          const position = VectorOps.randomUnit(config.dimensions);
          const value = 0.5; // Identical values
          const features = new Array(config.dimensions).fill(0.5);
          tensor.addCell(position, value, features);
        }
        break;

      case 'gradient_explosion':
        // Values span extreme ranges
        for (let i = 0; i < 100; i++) {
          const position = VectorOps.scale(
            VectorOps.randomUnit(config.dimensions),
            Math.pow(10, Math.random() * 4) // Extreme scale variation
          );
          const value = Math.pow(10, Math.random() * 6 - 3);
          const features = new Array(config.dimensions).fill(0).map(() => Math.random());
          tensor.addCell(position, value, features);
        }
        break;

      case 'dead_neurons':
        // Many sectors completely empty
        const activeSectors = [0, 3, 6, 9]; // Only 4 sectors active
        for (let i = 0; i < 100; i++) {
          const sector = activeSectors[Math.floor(Math.random() * activeSectors.length)];
          const angle = (sector * 2 * Math.PI) / config.base + randomGaussian(0, 0.2);

          const position = VectorOps.create([
            Math.cos(angle) * (1 + Math.random()),
            Math.sin(angle) * (1 + Math.random()),
            ...new Array(config.dimensions - 2).fill(0).map(() => randomGaussian(0, 0.3))
          ]);

          const value = randomGaussian(0.5, 0.2);
          const features = new Array(config.dimensions).fill(0).map(() => Math.random());

          tensor.addCell(position, value, features);
        }
        break;

      case 'attention_sink':
        // One massive hotspot absorbing all attention
        for (let i = 0; i < 100; i++) {
          const isSink = i === 0;
          const position = isSink
            ? VectorOps.zero(config.dimensions)
            : VectorOps.randomUnit(config.dimensions);
          const value = isSink ? 100 : 0.001; // One dominant cell
          const features = new Array(config.dimensions).fill(0).map(() => Math.random());

          tensor.addCell(position, value, features);
        }
        break;
    }

    return tensor;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('='.repeat(80));
  console.log('TENSOR PLANE SIMULATION FRAMEWORK');
  console.log('Iteration 3: Tensor Plane Simulations');
  console.log('='.repeat(80));
  console.log();

  const config: OriginConfig = {
    dimensions: 10,
    base: 12
  };

  const simulation = new TensorPlaneSimulation(config);

  // Run main batch simulation
  console.log('Running batch simulation with 100+ random tensors...');
  const distributions = ['gaussian', 'uniform', 'concentric', 'directional', 'clustered'];
  const batchResults = simulation.runBatchSimulation(120, distributions);

  console.log(`\nCompleted ${batchResults.length} simulations.`);

  // Run thought experiments
  console.log('\n' + '='.repeat(80));
  console.log('THOUGHT EXPERIMENTS');
  console.log('='.repeat(80));

  // Dead tensor experiment
  console.log('\n1. Dead Tensor Analysis...');
  const deadTensor = ThoughtExperiments.generateDeadTensor(config);
  const deadResult = simulation.runSingleSimulation(deadTensor);
  console.log(`   Health Score: ${deadResult.healthScore.overall.toFixed(3)}`);
  console.log(`   Anomalies Detected: ${deadResult.anomalies.length}`);
  console.log(`   Patterns Found: ${deadResult.patterns.length}`);

  // Overfit tensor experiment
  console.log('\n2. Overfit Tensor Analysis...');
  const overfitTensor = ThoughtExperiments.generateOverfitTensor(config);
  const overfitResult = simulation.runSingleSimulation(overfitTensor);
  console.log(`   Health Score: ${overfitResult.healthScore.overall.toFixed(3)}`);
  console.log(`   Sector Balance: ${overfitResult.healthScore.sector.toFixed(3)}`);
  console.log(`   Anomalies Detected: ${overfitResult.anomalies.length}`);

  // Training failure experiments
  console.log('\n3. Training Failure Pattern Analysis...');
  const failureTypes = ['mode_collapse', 'gradient_explosion', 'dead_neurons', 'attention_sink'];
  const failureResults: { type: string; result: SimulationResult }[] = [];

  for (const failureType of failureTypes) {
    const failedTensor = ThoughtExperiments.generateFailedTrainingTensor(config, failureType);
    const result = simulation.runSingleSimulation(failedTensor);
    failureResults.push({ type: failureType, result });

    console.log(`   ${failureType}:`);
    console.log(`     Health: ${result.healthScore.overall.toFixed(3)}`);
    console.log(`     Anomalies: ${result.anomalies.length}`);
    console.log(`     Patterns: ${result.patterns.length}`);
  }

  // Compile results
  const outputResults = {
    summary: {
      totalSimulations: batchResults.length,
      distributions: distributions.reduce((acc, d) => {
        acc[d] = batchResults.filter((_, i) => i % distributions.length === distributions.indexOf(d)).length;
        return acc;
      }, {} as Record<string, number>),
      averageHealth: {
        overall: batchResults.reduce((s, r) => s + r.healthScore.overall, 0) / batchResults.length,
        concentric: batchResults.reduce((s, r) => s + r.healthScore.concentric, 0) / batchResults.length,
        sector: batchResults.reduce((s, r) => s + r.healthScore.sector, 0) / batchResults.length,
        density: batchResults.reduce((s, r) => s + r.healthScore.density, 0) / batchResults.length,
        anomaly: batchResults.reduce((s, r) => s + r.healthScore.anomaly, 0) / batchResults.length
      },
      totalPatterns: batchResults.reduce((s, r) => s + r.patterns.length, 0),
      totalAnomalies: batchResults.reduce((s, r) => s + r.anomalies.length, 0)
    },
    thoughtExperiments: {
      deadTensor: {
        healthScore: deadResult.healthScore,
        anomalies: deadResult.anomalies.length,
        patterns: deadResult.patterns.length
      },
      overfitTensor: {
        healthScore: overfitResult.healthScore,
        anomalies: overfitResult.anomalies.length,
        patterns: overfitResult.patterns.length
      },
      trainingFailures: failureResults.map(fr => ({
        type: fr.type,
        healthScore: fr.result.healthScore,
        anomalies: fr.result.anomalies.length,
        patterns: fr.result.patterns.length
      }))
    },
    patternFrequency: computePatternFrequency(batchResults),
    anomalyFrequency: computeAnomalyFrequency(batchResults),
    detailedResults: batchResults.slice(0, 10) // First 10 detailed
  };

  // Write results to file
  const fs = require('fs');
  const outputPath = '/home/z/my-project/download/polln_research/round5/simulations/simulation_results.json';
  fs.writeFileSync(outputPath, JSON.stringify(outputResults, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);

  return outputResults;
}

function computePatternFrequency(results: SimulationResult[]): Record<string, number> {
  const freq: Record<string, number> = {};

  for (const result of results) {
    for (const pattern of result.patterns) {
      freq[pattern.type] = (freq[pattern.type] || 0) + 1;
    }
  }

  return freq;
}

function computeAnomalyFrequency(results: SimulationResult[]): Record<string, number> {
  const freq: Record<string, number> = {};

  for (const result of results) {
    for (const anomaly of result.anomalies) {
      freq[anomaly.type] = (freq[anomaly.type] || 0) + 1;
    }
  }

  return freq;
}

// Export for module usage
export {
  LOGTensor,
  VectorOps,
  PlaneExtractor,
  RotationOperators,
  PatternDetector,
  AnomalyDetector,
  HealthScoreComputer,
  TensorPlaneSimulation,
  ThoughtExperiments,
  OriginConfig,
  SimulationResult,
  CrossSection,
  PatternResult,
  AnomalyRecord,
  HealthScore
};

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
