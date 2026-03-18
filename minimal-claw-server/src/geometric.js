/**
 * Geometric Positioning Module
 *
 * Provides dodecet-based geometric encoding for spatial agent positioning.
 * This enables FPS-style perspective filtering where agents only "see"
 * neighbors within their geometric vicinity.
 */

// Since we're using the WASM package, we'll create a lightweight wrapper
// that provides the geometric encoding functionality.

/**
 * Dodecet constants
 */
export const DODECET_BITS = 12;
export const MAX_DODECET = 4095; // 2^12 - 1
export const DODECET_CAPACITY = 4096; // 2^12

/**
 * Represents a 3D position using dodecet encoding (12-bit per coordinate)
 * Each coordinate is in the range [0, 4095]
 */
export class DodecetPosition {
  constructor(x = 0, y = 0, z = 0) {
    this.x = Math.max(0, Math.min(MAX_DODECET, Math.floor(x)));
    this.y = Math.max(0, Math.min(MAX_DODECET, Math.floor(y)));
    this.z = Math.max(0, Math.min(MAX_DODECET, Math.floor(z)));
  }

  /**
   * Create position from normalized coordinates [0.0, 1.0]
   */
  static fromNormalized(nx, ny, nz) {
    return new DodecetPosition(
      nx * MAX_DODECET,
      ny * MAX_DODECET,
      nz * MAX_DODECET
    );
  }

  /**
   * Create position from hex string (e.g., "ABC,DEF,123")
   */
  static fromHex(hexString) {
    const parts = hexString.split(',').map(s => parseInt(s, 16));
    return new DodecetPosition(parts[0] || 0, parts[1] || 0, parts[2] || 0);
  }

  /**
   * Convert to hex string
   */
  toHex() {
    const toHex = (n) => n.toString(16).toUpperCase().padStart(3, '0');
    return `${toHex(this.x)},${toHex(this.y)},${toHex(this.z)}`;
  }

  /**
   * Convert to normalized coordinates [0.0, 1.0]
   */
  normalized() {
    return {
      x: this.x / MAX_DODECET,
      y: this.y / MAX_DODECET,
      z: this.z / MAX_DODECET,
    };
  }

  /**
   * Convert to signed coordinates [-2048, 2047]
   */
  signed() {
    return {
      x: this.x >= 2048 ? this.x - 4096 : this.x,
      y: this.y >= 2048 ? this.y - 4096 : this.y,
      z: this.z >= 2048 ? this.z - 4096 : this.z,
    };
  }

  /**
   * Calculate Euclidean distance to another position
   */
  distanceTo(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dz = this.z - other.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculate Manhattan distance to another position
   */
  manhattanDistanceTo(other) {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y) + Math.abs(this.z - other.z);
  }

  /**
   * Check if within radius of another position
   */
  withinRadius(other, radius) {
    return this.distanceTo(other) <= radius;
  }

  /**
   * Clone the position
   */
  clone() {
    return new DodecetPosition(this.x, this.y, this.z);
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return { x: this.x, y: this.y, z: this.z };
  }

  /**
   * Create from plain object
   */
  static fromJSON(obj) {
    return new DodecetPosition(obj.x, obj.y, obj.z);
  }

  /**
   * String representation
   */
  toString() {
    return `DodecetPosition(${this.x}, ${this.y}, ${this.z})`;
  }
}

/**
 * Spatial index for efficient neighbor queries
 * Uses a simple grid-based approach for O(1) average case queries
 */
export class SpatialIndex {
  constructor(cellSize = 100) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.agentPositions = new Map(); // agentId -> position
  }

  /**
   * Get cell key for a position
   */
  getCellKey(position) {
    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);
    const cz = Math.floor(position.z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }

  /**
   * Add agent to spatial index
   */
  add(agentId, position) {
    // Remove from old position if exists
    this.remove(agentId);

    // Add to new position
    const cellKey = this.getCellKey(position);
    if (!this.grid.has(cellKey)) {
      this.grid.set(cellKey, new Set());
    }
    this.grid.get(cellKey).add(agentId);
    this.agentPositions.set(agentId, position.clone());
  }

  /**
   * Remove agent from spatial index
   */
  remove(agentId) {
    const oldPosition = this.agentPositions.get(agentId);
    if (oldPosition) {
      const cellKey = this.getCellKey(oldPosition);
      const cell = this.grid.get(cellKey);
      if (cell) {
        cell.delete(agentId);
        if (cell.size === 0) {
          this.grid.delete(cellKey);
        }
      }
      this.agentPositions.delete(agentId);
    }
  }

  /**
   * Update agent position
   */
  update(agentId, newPosition) {
    this.add(agentId, newPosition);
  }

  /**
   * Find agents within radius of a position
   */
  findNearby(position, radius) {
    const nearby = new Set();
    const radiusSquared = radius * radius;

    // Calculate cell range to search
    const minCX = Math.floor((position.x - radius) / this.cellSize);
    const maxCX = Math.floor((position.x + radius) / this.cellSize);
    const minCY = Math.floor((position.y - radius) / this.cellSize);
    const maxCY = Math.floor((position.y + radius) / this.cellSize);
    const minCZ = Math.floor((position.z - radius) / this.cellSize);
    const maxCZ = Math.floor((position.z + radius) / this.cellSize);

    // Search all cells in range
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        for (let cz = minCZ; cz <= maxCZ; cz++) {
          const cellKey = `${cx},${cy},${cz}`;
          const cell = this.grid.get(cellKey);
          if (cell) {
            for (const agentId of cell) {
              const agentPosition = this.agentPositions.get(agentId);
              if (agentPosition) {
                const distSquared =
                  Math.pow(position.x - agentPosition.x, 2) +
                  Math.pow(position.y - agentPosition.y, 2) +
                  Math.pow(position.z - agentPosition.z, 2);
                if (distSquared <= radiusSquared) {
                  nearby.add(agentId);
                }
              }
            }
          }
        }
      }
    }

    return Array.from(nearby);
  }

  /**
   * Find nearest neighbors
   */
  findNearest(position, count = 5) {
    const allAgents = Array.from(this.agentPositions.entries());
    const distances = allAgents.map(([agentId, pos]) => ({
      agentId,
      distance: position.distanceTo(pos),
    }));

    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, count);
  }

  /**
   * Find agents in a region (bounding box)
   */
  findInRegion(minPosition, maxPosition) {
    const inRegion = [];

    for (const [agentId, pos] of this.agentPositions) {
      if (
        pos.x >= minPosition.x && pos.x <= maxPosition.x &&
        pos.y >= minPosition.y && pos.y <= maxPosition.y &&
        pos.z >= minPosition.z && pos.z <= maxPosition.z
      ) {
        inRegion.push(agentId);
      }
    }

    return inRegion;
  }

  /**
   * Get all agent positions
   */
  getAllPositions() {
    return new Map(this.agentPositions);
  }

  /**
   * Clear the index
   */
  clear() {
    this.grid.clear();
    this.agentPositions.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalAgents: this.agentPositions.size,
      totalCells: this.grid.size,
      cellSize: this.cellSize,
      avgAgentsPerCell: this.agentPositions.size / (this.grid.size || 1),
    };
  }
}

/**
 * Geometric utility functions
 */
export const GeometricUtils = {
  /**
   * Generate a random position
   */
  randomPosition() {
    return new DodecetPosition(
      Math.floor(Math.random() * MAX_DODECET),
      Math.floor(Math.random() * MAX_DODECET),
      Math.floor(Math.random() * MAX_DODECET)
    );
  },

  /**
   * Generate random positions in a grid pattern
   */
  generateGridPositions(count, spacing = 200) {
    const positions = [];
    const gridSize = Math.ceil(Math.pow(count, 1/3));

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          if (positions.length >= count) break;
          positions.push(new DodecetPosition(
            x * spacing,
            y * spacing,
            z * spacing
          ));
        }
      }
    }

    return positions;
  },

  /**
   * Calculate centroid of positions
   */
  calculateCentroid(positions) {
    if (positions.length === 0) return new DodecetPosition();

    const sum = positions.reduce(
      (acc, pos) => ({ x: acc.x + pos.x, y: acc.y + pos.y, z: acc.z + pos.z }),
      { x: 0, y: 0, z: 0 }
    );

    return new DodecetPosition(
      sum.x / positions.length,
      sum.y / positions.length,
      sum.z / positions.length
    );
  },

  /**
   * Calculate bounding box of positions
   */
  calculateBoundingBox(positions) {
    if (positions.length === 0) {
      return {
        min: new DodecetPosition(),
        max: new DodecetPosition(),
      };
    }

    const min = new DodecetPosition(MAX_DODECET, MAX_DODECET, MAX_DODECET);
    const max = new DodecetPosition(0, 0, 0);

    for (const pos of positions) {
      min.x = Math.min(min.x, pos.x);
      min.y = Math.min(min.y, pos.y);
      min.z = Math.min(min.z, pos.z);
      max.x = Math.max(max.x, pos.x);
      max.y = Math.max(max.y, pos.y);
      max.z = Math.max(max.z, pos.z);
    }

    return { min, max };
  },

  /**
   * Validate position
   */
  isValidPosition(pos) {
    return (
      pos instanceof DodecetPosition ||
      (typeof pos === 'object' &&
       typeof pos.x === 'number' && pos.x >= 0 && pos.x <= MAX_DODECET &&
       typeof pos.y === 'number' && pos.y >= 0 && pos.y <= MAX_DODECET &&
       typeof pos.z === 'number' && pos.z >= 0 && pos.z <= MAX_DODECET)
    );
  },
};

export default {
  DodecetPosition,
  SpatialIndex,
  GeometricUtils,
  DODECET_BITS,
  MAX_DODECET,
  DODECET_CAPACITY,
};
