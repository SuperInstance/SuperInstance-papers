/**
 * TENSOR PLANE SIMULATION FRAMEWORK
 * Iteration 3: Tensor Plane Simulations
 * 
 * A comprehensive framework for simulating LOG tensor plane systems,
 * cross-section extraction, rotation operators, and pattern discovery.
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomGaussian(mean, stdDev) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

// ============================================================================
// VECTOR OPERATIONS
// ============================================================================

class VectorOps {
  static create(components) {
    return [...components];
  }

  static zero(dimensions) {
    return new Array(dimensions).fill(0);
  }

  static add(a, b) {
    return a.map((c, i) => c + b[i]);
  }

  static subtract(a, b) {
    return a.map((c, i) => c - b[i]);
  }

  static scale(v, s) {
    return v.map(c => c * s);
  }

  static dot(a, b) {
    return a.reduce((sum, c, i) => sum + c * b[i], 0);
  }

  static norm(v) {
    return Math.sqrt(v.reduce((sum, c) => sum + c * c, 0));
  }

  static normalize(v) {
    const n = VectorOps.norm(v);
    if (n < 1e-10) return [...v];
    return VectorOps.scale(v, 1 / n);
  }

  static angle(a, b) {
    const cosAngle = VectorOps.dot(a, b) / (VectorOps.norm(a) * VectorOps.norm(b));
    return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  }

  static randomUnit(dimensions) {
    const components = [];
    for (let i = 0; i < dimensions; i++) {
      components.push(Math.random() * 2 - 1);
    }
    return VectorOps.normalize(components);
  }
}

// ============================================================================
// LOG TENSOR CLASS
// ============================================================================

class LOGTensor {
  constructor(config) {
    this.config = config;
    this.origin = VectorOps.zero(config.dimensions);
    this.cells = [];
    this.cellIdCounter = 0;
  }

  setOrigin(origin) {
    this.origin = origin;
  }

  getOrigin() {
    return this.origin;
  }

  getConfig() {
    return this.config;
  }

  addCell(position, value, features) {
    const relPos = VectorOps.subtract(position, this.origin);
    const radius = VectorOps.norm(relPos);
    const sector = this.computeSector(relPos);

    const cell = {
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

  computeSector(position) {
    const angle = Math.atan2(position[1], position[0]);
    const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
    return Math.floor(normalizedAngle * this.config.base) % this.config.base;
  }

  getCells() {
    return [...this.cells];
  }

  getCellsBySector(sector) {
    return this.cells.filter(c => c.sector === sector);
  }

  static generateRandom(config, numCells, distribution = 'gaussian') {
    const tensor = new LOGTensor(config);
    const dim = config.dimensions;

    for (let i = 0; i < numCells; i++) {
      let position;

      switch (distribution) {
        case 'gaussian':
          position = Array.from({ length: dim }, () => randomGaussian(0, 1));
          break;
        case 'uniform':
          position = Array.from({ length: dim }, () => Math.random() * 4 - 2);
          break;
        case 'concentric':
          const angle = Math.random() * 2 * Math.PI;
          const radius = Math.random() * 2;
          position = [
            radius * Math.cos(angle),
            radius * Math.sin(angle),
            ...Array.from({ length: dim - 2 }, () => Math.random() * 0.5 - 0.25)
          ];
          break;
        case 'directional':
          const dirAngle = Math.PI / 4;
          position = [
            randomGaussian(2 * Math.cos(dirAngle), 0.5),
            randomGaussian(2 * Math.sin(dirAngle), 0.5),
            ...Array.from({ length: dim - 2 }, () => Math.random() * 0.3 - 0.15)
          ];
          break;
        case 'clustered':
          const clusterCenter = VectorOps.randomUnit(dim);
          const clusterRadius = 0.5 + Math.random() * 0.5;
          position = VectorOps.add(
            VectorOps.scale(clusterCenter, clusterRadius),
            Array.from({ length: dim }, () => randomGaussian(0, 0.3))
          );
          break;
        default:
          position = VectorOps.randomUnit(dim);
      }

      const value = randomGaussian(0.5, 0.2);
      const features = Array.from({ length: dim }, () => Math.random());

      tensor.addCell(position, value, features);
    }

    return tensor;
  }
}

// ============================================================================
// PLANE EXTRACTION
// ============================================================================

class PlaneExtractor {
  constructor(tolerance = 0.1) {
    this.tolerance = tolerance;
  }

  extractCrossSection(tensor, plane) {
    const cells = tensor.getCells();
    const extractedCells = [];

    for (const cell of cells) {
      const distance = Math.abs(
        VectorOps.dot(cell.position, plane.normal) - plane.distance
      );

      if (distance < this.tolerance) {
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

    const densityMap = this.computeDensityMap(extractedCells);
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

  computeDensityMap(cells, resolution = 20) {
    const densityMap = [];
    for (let i = 0; i < resolution; i++) {
      densityMap.push(new Array(resolution).fill(0));
    }

    if (cells.length === 0) return densityMap;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const cell of cells) {
      minX = Math.min(minX, cell.position[0]);
      maxX = Math.max(maxX, cell.position[0]);
      minY = Math.min(minY, cell.position[1]);
      maxY = Math.max(maxY, cell.position[1]);
    }

    const rangeX = maxX - minX + 0.1;
    const rangeY = maxY - minY + 0.1;

    for (const cell of cells) {
      const gridX = Math.floor(((cell.position[0] - minX) / rangeX) * (resolution - 1));
      const gridY = Math.floor(((cell.position[1] - minY) / rangeY) * (resolution - 1));

      if (gridX >= 0 && gridX < resolution && gridY >= 0 && gridY < resolution) {
        densityMap[gridY][gridX] += cell.value;
      }
    }

    return densityMap;
  }

  computeBoundary(cells) {
    if (cells.length < 3) return cells.map(c => c.position);

    const points = cells.map(c => ({
      x: c.position[0],
      y: c.position[1]
    }));

    const centroid = {
      x: points.reduce((s, p) => s + p.x, 0) / points.length,
      y: points.reduce((s, p) => s + p.y, 0) / points.length
    };

    points.sort((a, b) => {
      const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
      const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
      return angleA - angleB;
    });

    const numBoundary = Math.min(12, points.length);
    const step = Math.floor(points.length / numBoundary);

    return points
      .filter((_, i) => i % step === 0)
      .map(p => [p.x, p.y]);
  }

  generateSectorPlanes(base, dimensions) {
    const planes = [];
    const angleStep = (2 * Math.PI) / base;

    for (let sector = 0; sector < base; sector++) {
      const angle = angleStep * sector;
      const normal = [
        Math.cos(angle + Math.PI / 2),
        Math.sin(angle + Math.PI / 2),
        ...new Array(dimensions - 2).fill(0)
      ];

      planes.push({
        normal,
        distance: 0,
        origin: VectorOps.zero(dimensions)
      });
    }

    return planes;
  }
}

// ============================================================================
// ROTATION OPERATORS
// ============================================================================

class RotationOperators {
  static createRotationMatrix(dim, angle) {
    const result = [];
    for (let i = 0; i < dim; i++) {
      result.push(new Array(dim).fill(0));
      result[i][i] = 1;
    }

    result[0][0] = Math.cos(angle);
    result[0][1] = -Math.sin(angle);
    result[1][0] = Math.sin(angle);
    result[1][1] = Math.cos(angle);

    return result;
  }

  static applyRotation(vector, matrix) {
    const dim = vector.length;
    const result = new Array(dim).fill(0);

    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        result[i] += matrix[i][j] * vector[j];
      }
    }

    return result;
  }

  static sectorRotation(base, sectors, dim) {
    const angle = (2 * Math.PI * sectors) / base;
    return this.createRotationMatrix(dim, angle);
  }

  static slerp(n1, n2, t) {
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
  detectPatterns(crossSection, base) {
    const patterns = [];

    const concentricPattern = this.detectConcentricPattern(crossSection);
    if (concentricPattern) patterns.push(concentricPattern);

    const sectorPattern = this.detectSectorPattern(crossSection, base);
    if (sectorPattern) patterns.push(sectorPattern);

    const gradientPattern = this.detectGradientPattern(crossSection);
    if (gradientPattern) patterns.push(gradientPattern);

    const clusterPattern = this.detectClusterPattern(crossSection);
    if (clusterPattern) patterns.push(clusterPattern);

    const voidPattern = this.detectVoidPattern(crossSection, base);
    if (voidPattern) patterns.push(voidPattern);

    const hotspotPattern = this.detectHotspotPattern(crossSection);
    if (hotspotPattern) patterns.push(hotspotPattern);

    return patterns;
  }

  detectConcentricPattern(crossSection) {
    const cells = crossSection.cells;
    if (cells.length < 10) return null;

    const radii = cells.map(c => c.radius);
    const meanRadius = radii.reduce((s, r) => s + r, 0) / radii.length;
    const stdRadius = Math.sqrt(
      radii.reduce((s, r) => s + (r - meanRadius) ** 2, 0) / radii.length
    );

    const angles = cells.map(c => Math.atan2(c.position[1], c.position[0]));
    const meanAngle = angles.reduce((s, a) => s + a, 0) / angles.length;
    const angleVariance = angles.reduce((s, a) => s + (a - meanAngle) ** 2, 0) / angles.length;

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

  detectSectorPattern(crossSection, base) {
    const cells = crossSection.cells;
    if (cells.length < 10) return null;

    const sectorCounts = new Array(base).fill(0);
    const sectorValues = new Array(base).fill(0);

    for (const cell of cells) {
      sectorCounts[cell.sector] += 1;
      sectorValues[cell.sector] += cell.value;
    }

    const maxCount = Math.max(...sectorCounts);
    const minCount = Math.min(...sectorCounts.filter(c => c > 0));
    const imbalanceRatio = maxCount / (minCount || 1);

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

  detectGradientPattern(crossSection) {
    const cells = crossSection.cells;
    if (cells.length < 10) return null;

    let gradX = 0, gradY = 0;
    for (const cell of cells) {
      gradX += cell.value * cell.position[0];
      gradY += cell.value * cell.position[1];
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

  detectClusterPattern(crossSection) {
    const cells = crossSection.cells;
    if (cells.length < 20) return null;

    const clusterThreshold = 0.5;
    const visited = new Set();
    const clusters = [];

    for (const cell of cells) {
      if (visited.has(cell.id)) continue;

      const cluster = [cell];
      visited.add(cell.id);

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

  detectVoidPattern(crossSection, base) {
    const cells = crossSection.cells;
    if (cells.length < 20) return null;

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

  detectHotspotPattern(crossSection) {
    const cells = crossSection.cells;
    if (cells.length < 10) return null;

    const mean = cells.reduce((s, c) => s + c.value, 0) / cells.length;
    const std = Math.sqrt(
      cells.reduce((s, c) => s + (c.value - mean) ** 2, 0) / cells.length
    );

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

  angleToDirection(angle) {
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
  detectStatisticalAnomalies(crossSection) {
    const anomalies = [];
    const cells = crossSection.cells;

    if (cells.length < 10) return anomalies;

    const values = cells.map(c => c.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
    );

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

  detectStructuralAnomalies(crossSection, base) {
    const anomalies = [];
    const cells = crossSection.cells;

    const sectorCounts = new Array(base).fill(0);
    for (const cell of cells) {
      sectorCounts[cell.sector] += 1;
    }

    const expectedPerSector = cells.length / base;
    for (let sector = 0; sector < base; sector++) {
      if (sectorCounts[sector] < expectedPerSector * 0.1) {
        anomalies.push({
          type: 'DEAD_ZONE',
          location: [
            Math.cos((sector * 2 * Math.PI) / base),
            Math.sin((sector * 2 * Math.PI) / base)
          ],
          severity: 1 - sectorCounts[sector] / expectedPerSector,
          description: `Sector ${sector} is under-attended (expected ${expectedPerSector.toFixed(0)}, got ${sectorCounts[sector]})`
        });
      }
    }

    const saturatedCells = cells.filter(c => c.value > 0.95);
    if (saturatedCells.length > cells.length * 0.2) {
      anomalies.push({
        type: 'SATURATION',
        location: VectorOps.zero(2),
        severity: saturatedCells.length / cells.length,
        description: `${saturatedCells.length} cells (${(saturatedCells.length / cells.length * 100).toFixed(1)}%) have saturated values > 0.95`
      });
    }

    return anomalies;
  }

  detectTrainingFailureIndicators(crossSection) {
    const anomalies = [];
    const cells = crossSection.cells;

    if (cells.length < 20) return anomalies;

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

    const invalidCells = cells.filter(c => !isFinite(c.value));
    if (invalidCells.length > 0) {
      anomalies.push({
        type: 'NUMERICAL_INSTABILITY',
        location: VectorOps.zero(2),
        severity: 1,
        description: `${invalidCells.length} cells have non-finite values`
      });
    }

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
  compute(crossSection, base) {
    return {
      concentric: this.computeConcentricScore(crossSection),
      sector: this.computeSectorScore(crossSection, base),
      density: this.computeDensityScore(crossSection),
      anomaly: this.computeAnomalyScore(crossSection, base),
      overall: 0
    };
  }

  computeConcentricScore(crossSection) {
    const cells = crossSection.cells;
    if (cells.length < 3) return 0.5;

    let sumX = 0, sumY = 0;
    for (const cell of cells) {
      sumX += cell.position[0] * cell.value;
      sumY += cell.position[1] * cell.value;
    }

    const centroid = { x: sumX / cells.length, y: sumY / cells.length };
    const centroidDist = Math.sqrt(centroid.x ** 2 + centroid.y ** 2);

    return Math.max(0, 1 - centroidDist / 2);
  }

  computeSectorScore(crossSection, base) {
    const cells = crossSection.cells;
    if (cells.length < base) return 0.5;

    const sectorCounts = new Array(base).fill(0);
    for (const cell of cells) {
      sectorCounts[cell.sector] += 1;
    }

    const expected = cells.length / base;
    const chiSquare = sectorCounts.reduce((sum, count) => sum + (count - expected) ** 2 / expected, 0);

    return Math.exp(-chiSquare / base);
  }

  computeDensityScore(crossSection) {
    const densityMap = crossSection.densityMap;
    const resolution = densityMap.length;

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
    return Math.exp(-avgGradient);
  }

  computeAnomalyScore(crossSection, base) {
    const detector = new AnomalyDetector();
    const anomalies = [
      ...detector.detectStatisticalAnomalies(crossSection),
      ...detector.detectStructuralAnomalies(crossSection, base)
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
  constructor(config) {
    this.config = config;
    this.planeExtractor = new PlaneExtractor();
    this.patternDetector = new PatternDetector();
    this.anomalyDetector = new AnomalyDetector();
    this.healthComputer = new HealthScoreComputer();
  }

  runSingleSimulation(tensor) {
    const crossSections = [];
    const patterns = [];
    const anomalies = [];
    const rotationHistory = [];

    const sectorPlanes = this.planeExtractor.generateSectorPlanes(this.config.base, this.config.dimensions);

    for (let sector = 0; sector < this.config.base; sector++) {
      const cs = this.planeExtractor.extractCrossSection(tensor, sectorPlanes[sector]);
      crossSections.push(cs);

      const sectorPatterns = this.patternDetector.detectPatterns(cs, this.config.base);
      patterns.push(...sectorPatterns);

      const sectorAnomalies = [
        ...this.anomalyDetector.detectStatisticalAnomalies(cs),
        ...this.anomalyDetector.detectStructuralAnomalies(cs, this.config.base),
        ...this.anomalyDetector.detectTrainingFailureIndicators(cs)
      ];
      anomalies.push(...sectorAnomalies);
    }

    let previousPatternCount = patterns.length;
    for (let sector = 0; sector < this.config.base; sector++) {
      const cs = crossSections[sector];

      const currentPatterns = this.patternDetector.detectPatterns(cs, this.config.base);
      const patternChange = Math.abs(currentPatterns.length - previousPatternCount);

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

    const healthScores = crossSections.map(cs => this.healthComputer.compute(cs, this.config.base));
    const avgHealth = {
      overall: healthScores.reduce((s, h) => s + (h.concentric + h.sector + h.density + h.anomaly) / 4, 0) / healthScores.length,
      concentric: healthScores.reduce((s, h) => s + h.concentric, 0) / healthScores.length,
      sector: healthScores.reduce((s, h) => s + h.sector, 0) / healthScores.length,
      density: healthScores.reduce((s, h) => s + h.density, 0) / healthScores.length,
      anomaly: healthScores.reduce((s, h) => s + h.anomaly, 0) / healthScores.length
    };

    return {
      tensorId: `tensor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      config: this.config,
      crossSectionCount: crossSections.length,
      cellsPerCrossSection: crossSections.map(cs => cs.cells.length),
      patterns: this.deduplicatePatterns(patterns),
      healthScore: avgHealth,
      rotationHistory,
      anomalies: this.deduplicateAnomalies(anomalies)
    };
  }

  computeDensityShift(cs1, cs2) {
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

  deduplicatePatterns(patterns) {
    const seen = new Set();
    return patterns.filter(p => {
      const key = `${p.type}_${p.location}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  deduplicateAnomalies(anomalies) {
    const seen = new Set();
    return anomalies.filter(a => {
      const key = `${a.type}_${a.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  runBatchSimulation(numTensors, distributions) {
    const results = [];

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
  static generateDeadTensor(config) {
    const tensor = new LOGTensor(config);

    for (let i = 0; i < 100; i++) {
      const position = VectorOps.randomUnit(config.dimensions);
      const value = randomGaussian(0.01, 0.001);
      const features = Array.from({ length: config.dimensions }, () => Math.random() * 0.01);
      tensor.addCell(position, value, features);
    }

    return tensor;
  }

  static generateOverfitTensor(config) {
    const tensor = new LOGTensor(config);

    const focusSector = Math.floor(Math.random() * config.base);
    const focusAngle = (focusSector * 2 * Math.PI) / config.base;

    for (let i = 0; i < 100; i++) {
      const position = [
        2 * Math.cos(focusAngle) + randomGaussian(0, 0.1),
        2 * Math.sin(focusAngle) + randomGaussian(0, 0.1),
        ...Array.from({ length: config.dimensions - 2 }, () => randomGaussian(0, 0.05))
      ];

      const value = 0.95 + Math.random() * 0.05;
      const features = Array.from({ length: config.dimensions }, () => 0.9 + Math.random() * 0.1);

      tensor.addCell(position, value, features);
    }

    return tensor;
  }

  static generateFailedTrainingTensor(config, failureType) {
    const tensor = new LOGTensor(config);

    switch (failureType) {
      case 'mode_collapse':
        for (let i = 0; i < 100; i++) {
          const position = VectorOps.randomUnit(config.dimensions);
          const value = 0.5;
          const features = new Array(config.dimensions).fill(0.5);
          tensor.addCell(position, value, features);
        }
        break;

      case 'gradient_explosion':
        for (let i = 0; i < 100; i++) {
          const position = VectorOps.scale(
            VectorOps.randomUnit(config.dimensions),
            Math.pow(10, Math.random() * 4)
          );
          const value = Math.pow(10, Math.random() * 6 - 3);
          const features = Array.from({ length: config.dimensions }, () => Math.random());
          tensor.addCell(position, value, features);
        }
        break;

      case 'dead_neurons':
        const activeSectors = [0, 3, 6, 9];
        for (let i = 0; i < 100; i++) {
          const sector = activeSectors[Math.floor(Math.random() * activeSectors.length)];
          const angle = (sector * 2 * Math.PI) / config.base + randomGaussian(0, 0.2);

          const position = [
            Math.cos(angle) * (1 + Math.random()),
            Math.sin(angle) * (1 + Math.random()),
            ...Array.from({ length: config.dimensions - 2 }, () => randomGaussian(0, 0.3))
          ];

          const value = randomGaussian(0.5, 0.2);
          const features = Array.from({ length: config.dimensions }, () => Math.random());

          tensor.addCell(position, value, features);
        }
        break;

      case 'attention_sink':
        for (let i = 0; i < 100; i++) {
          const isSink = i === 0;
          const position = isSink
            ? VectorOps.zero(config.dimensions)
            : VectorOps.randomUnit(config.dimensions);
          const value = isSink ? 100 : 0.001;
          const features = Array.from({ length: config.dimensions }, () => Math.random());

          tensor.addCell(position, value, features);
        }
        break;
    }

    return tensor;
  }
}

// ============================================================================
// PATTERN FREQUENCY ANALYSIS
// ============================================================================

function computePatternFrequency(results) {
  const freq = {};

  for (const result of results) {
    for (const pattern of result.patterns) {
      freq[pattern.type] = (freq[pattern.type] || 0) + 1;
    }
  }

  return freq;
}

function computeAnomalyFrequency(results) {
  const freq = {};

  for (const result of results) {
    for (const anomaly of result.anomalies) {
      freq[anomaly.type] = (freq[anomaly.type] || 0) + 1;
    }
  }

  return freq;
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

  const config = {
    dimensions: 10,
    base: 12
  };

  const simulation = new TensorPlaneSimulation(config);

  // Run main batch simulation
  console.log('Running batch simulation with 120 random tensors...');
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
  const failureResults = [];

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
    metadata: {
      timestamp: new Date().toISOString(),
      totalSimulations: batchResults.length,
      config: config
    },
    summary: {
      totalSimulations: batchResults.length,
      distributions: distributions.reduce((acc, d) => {
        acc[d] = batchResults.filter((_, i) => i % distributions.length === distributions.indexOf(d)).length;
        return acc;
      }, {}),
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
        patterns: deadResult.patterns.length,
        anomalyTypes: deadResult.anomalies.map(a => a.type)
      },
      overfitTensor: {
        healthScore: overfitResult.healthScore,
        anomalies: overfitResult.anomalies.length,
        patterns: overfitResult.patterns.length,
        anomalyTypes: overfitResult.anomalies.map(a => a.type)
      },
      trainingFailures: failureResults.map(fr => ({
        type: fr.type,
        healthScore: fr.result.healthScore,
        anomalies: fr.result.anomalies.length,
        patterns: fr.result.patterns.length,
        anomalyTypes: fr.result.anomalies.map(a => a.type)
      }))
    },
    patternFrequency: computePatternFrequency(batchResults),
    anomalyFrequency: computeAnomalyFrequency(batchResults),
    healthDistribution: {
      byDistribution: distributions.map(d => ({
        distribution: d,
        avgHealth: batchResults
          .filter((_, i) => i % distributions.length === distributions.indexOf(d))
          .reduce((s, r) => s + r.healthScore.overall, 0) / (batchResults.length / distributions.length)
      }))
    },
    sampleResults: batchResults.slice(0, 5)
  };

  // Write results to file
  const fs = require('fs');
  const outputPath = '/home/z/my-project/download/polln_research/round5/simulations/simulation_results.json';
  fs.writeFileSync(outputPath, JSON.stringify(outputResults, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);

  return outputResults;
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  LOGTensor,
  VectorOps,
  PlaneExtractor,
  RotationOperators,
  PatternDetector,
  AnomalyDetector,
  HealthScoreComputer,
  TensorPlaneSimulation,
  ThoughtExperiments
};
