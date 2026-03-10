/**
 * STIGMERGIC COORDINATION
 * ======================
 *
 * Ants don't have meetings. They don't send emails. They don't have Slack.
 * They leave pheromones. Others follow. Simple as that.
 *
 * This module brings that same coordination to spreadsheet tiles.
 * No centralized orchestration. No complex messaging. Just trails.
 *
 * HOW IT WORKS:
 * 1. Tile executes
 * 2. Leaves digital pheromone in cells
 * 3. Other tiles sense pheromones
 * 4. Make decisions based on what they smell
 * 5. Collective behavior emerges
 *
 * Use cases:
 * - Foraging: Find best data sources
 * - Flocking: Coordinate tile execution
 * - Synchronization: Self-organizing pipelines
 * - Load balancing: Distribute work naturally
 * - Danger avoidance: Skip problematic cells
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Pheromone types for different coordination patterns
 */
export enum PheromoneType {
  /** Trail marking - "I was here, follow me" */
  TRAIL = 'TRAIL',

  /** Task signaling - "This needs work" */
  TASK = 'TASK',

  /** Danger warning - "Stay away" */
  DANGER = 'DANGER',

  /** Resource marking - "Good stuff here" */
  RESOURCE = 'RESOURCE'
}

/**
 * Single pheromone deposit at a cell
 */
export interface Pheromone {
  /** Type of pheromone */
  type: PheromoneType;

  /** Current strength (0.0 to 1.0) */
  strength: number;

  /** Decay rate per tick (0.0 to 1.0) */
  decay_rate: number;

  /** Which tile deposited this */
  source_tile: string;

  /** When deposited (Unix timestamp) */
  timestamp: number;

  /** Optional payload data */
  metadata?: Record<string, any>;
}

/**
 * Cell coordinate in spreadsheet
 */
export interface CellCoordinate {
  row: number;
  column: number;
  sheet?: string;
}

/**
 * Pheromone field - mapping of cells to pheromones
 */
export interface PheromoneField {
  /** Sparse map of cell coordinates to pheromones */
  cells: Map<string, Pheromone[]>;

  /** Global configuration */
  config: StigmergyConfig;

  /** Statistics */
  stats: FieldStats;
}

/**
 * Configuration for stigmergic coordination
 */
export interface StigmergyConfig {
  /** How often to decay pheromones (milliseconds) */
  decay_interval: number;

  /** Maximum pheromone strength cap */
  max_strength: number;

  /** Minimum strength before pheromone is removed */
  min_strength: number;

  /** How many pheromones per cell max */
  max_pheromones_per_cell: number;

  /** Whether to aggregate same-type pheromones */
  aggregate_same_type: boolean;
}

/**
 * Statistics about the pheromone field
 */
export interface FieldStats {
  /** Total pheromone deposits */
  total_deposits: number;

  /** Total pheromones currently active */
  total_active: number;

  /** Deposits by type */
  by_type: Record<PheromoneType, number>;

  /** Oldest pheromone timestamp */
  oldest_timestamp: number;

  /** Newest pheromone timestamp */
  newest_timestamp: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: StigmergyConfig = {
  decay_interval: 1000, // 1 second
  max_strength: 1.0,
  min_strength: 0.01,
  max_pheromones_per_cell: 10,
  aggregate_same_type: true
};

// ============================================================================
// PHEROMONE FIELD OPERATIONS
// ============================================================================

/**
 * Create a new pheromone field
 */
export function createPheromoneField(
  config: Partial<StigmergyConfig> = {}
): PheromoneField {
  return {
    cells: new Map(),
    config: { ...DEFAULT_CONFIG, ...config },
    stats: {
      total_deposits: 0,
      total_active: 0,
      by_type: {
        [PheromoneType.TRAIL]: 0,
        [PheromoneType.TASK]: 0,
        [PheromoneType.DANGER]: 0,
        [PheromoneType.RESOURCE]: 0
      },
      oldest_timestamp: Date.now(),
      newest_timestamp: Date.now()
    }
  };
}

/**
 * Get cell key for map storage
 */
function cellKey(coord: CellCoordinate): string {
  const sheet = coord.sheet || 'default';
  return `${sheet}:${coord.row}:${coord.column}`;
}

/**
 * Deposit a pheromone at a cell
 */
export function depositPheromone(
  field: PheromoneField,
  coord: CellCoordinate,
  type: PheromoneType,
  strength: number,
  source_tile: string,
  decay_rate: number = 0.1,
  metadata?: Record<string, any>
): void {
  const key = cellKey(coord);
  const now = Date.now();

  // Cap strength at max
  const capped_strength = Math.min(strength, field.config.max_strength);

  const pheromone: Pheromone = {
    type,
    strength: capped_strength,
    decay_rate,
    source_tile,
    timestamp: now,
    metadata
  };

  // Get or create cell pheromone array
  let pheromones = field.cells.get(key);
  if (!pheromones) {
    pheromones = [];
    field.cells.set(key, pheromones);
  }

  // Aggregation: strengthen existing pheromone of same type
  if (field.config.aggregate_same_type) {
    const existing = pheromones.find(p => p.type === type && p.source_tile === source_tile);
    if (existing) {
      // Aggregate: take max strength, update timestamp
      existing.strength = Math.max(existing.strength, capped_strength);
      existing.timestamp = now;
      if (metadata) {
        existing.metadata = { ...existing.metadata, ...metadata };
      }
      return;
    }
  }

  // Add new pheromone
  pheromones.push(pheromone);

  // Enforce per-cell limit
  if (pheromones.length > field.config.max_pheromones_per_cell) {
    // Remove weakest pheromones
    pheromones.sort((a, b) => b.strength - a.strength);
    pheromones.splice(field.config.max_pheromones_per_cell);
  }

  // Update stats
  field.stats.total_deposits++;
  field.stats.by_type[type]++;
  field.stats.newest_timestamp = now;
}

/**
 * Sense pheromones at a cell
 */
export function sensePheromones(
  field: PheromoneField,
  coord: CellCoordinate,
  type?: PheromoneType
): Pheromone[] {
  const key = cellKey(coord);
  const pheromones = field.cells.get(key);

  if (!pheromones) {
    return [];
  }

  if (type) {
    return pheromones.filter(p => p.type === type);
  }

  return [...pheromones];
}

/**
 * Get total pheromone strength at a cell
 */
export function getPheromoneStrength(
  field: PheromoneField,
  coord: CellCoordinate,
  type?: PheromoneType
): number {
  const pheromones = sensePheromones(field, coord, type);

  if (pheromones.length === 0) {
    return 0;
  }

  // Sum strengths (could also use max, average, etc.)
  return pheromones.reduce((sum, p) => sum + p.strength, 0);
}

/**
 * Evaporate pheromones across the entire field
 */
export function evaporatePheromones(field: PheromoneField): void {
  const now = Date.now();
  let total_removed = 0;

  for (const [key, pheromones] of field.cells.entries()) {
    // Decay each pheromone
    for (let i = pheromones.length - 1; i >= 0; i--) {
      const pheromone = pheromones[i];

      // Apply decay
      pheromone.strength *= (1 - pheromone.decay_rate);

      // Remove if below threshold
      if (pheromone.strength < field.config.min_strength) {
        pheromones.splice(i, 1);
        total_removed++;
      }
    }

    // Remove empty cells
    if (pheromones.length === 0) {
      field.cells.delete(key);
    }
  }

  // Update stats
  field.stats.total_active = field.cells.size;
  field.stats.oldest_timestamp = now;

  return total_removed;
}

/**
 * Clear all pheromones at a cell
 */
export function clearPheromones(
  field: PheromoneField,
  coord: CellCoordinate
): void {
  const key = cellKey(coord);
  field.cells.delete(key);
}

/**
 * Clear all pheromones in the field
 */
export function clearAllPheromones(field: PheromoneField): void {
  field.cells.clear();
  field.stats.total_active = 0;
}

// ============================================================================
// COORDINATION PATTERNS
// ============================================================================

/**
 * FORAGING PATTERN
 * ================
 *
 * Tiles explore the spreadsheet, leaving trails.
 * Other tiles follow strong trails to find good data sources.
 *
 * Like ants finding food. First ant wanders randomly.
 * Finds food, leaves strong trail back to nest.
 * Other ants follow trail. Reinforce it if successful.
 *
 * Result: Efficient exploration without central coordination.
 */

/**
 * Foraging tile behavior
 */
export interface ForagingTile {
  /** Tile identifier */
  tile_id: string;

  /** Current position */
  current_cell: CellCoordinate;

  /** Last position (for backtracking) */
  previous_cell?: CellCoordinate;

  /** Whether tile found something valuable */
  found_resource: boolean;

  /** Exploration strategy */
  strategy: 'explore' | 'exploit';
}

/**
 * Decide next cell to visit based on pheromones
 */
export function foragingDecideNext(
  field: PheromoneField,
  tile: ForagingTile,
  neighbors: CellCoordinate[]
): CellCoordinate {
  if (tile.strategy === 'explore') {
    // Exploration: prefer cells with RESOURCE pheromones
    let best_cell: CellCoordinate | null = null;
    let best_strength = 0;

    for (const neighbor of neighbors) {
      const resource_strength = getPheromoneStrength(field, neighbor, PheromoneType.RESOURCE);
      const danger_strength = getPheromoneStrength(field, neighbor, PheromoneType.DANGER);

      // Avoid danger, seek resources
      const score = resource_strength - (danger_strength * 2);

      if (score > best_strength) {
        best_strength = score;
        best_cell = neighbor;
      }
    }

    // If no good trails found, pick random
    if (!best_cell || best_strength === 0) {
      return neighbors[Math.floor(Math.random() * neighbors.length)];
    }

    return best_cell;
  } else {
    // Exploitation: follow existing TRAIL pheromones
    let best_cell: CellCoordinate | null = null;
    let best_strength = 0;

    for (const neighbor of neighbors) {
      const trail_strength = getPheromoneStrength(field, neighbor, PheromoneType.TRAIL);
      const danger_strength = getPheromoneStrength(field, neighbor, PheromoneType.DANGER);

      // Follow trails, avoid danger
      const score = trail_strength - (danger_strength * 3);

      if (score > best_strength) {
        best_strength = score;
        best_cell = neighbor;
      }
    }

    return best_cell || neighbors[0];
  }
}

/**
 * Leave foraging trail
 */
export function foragingDeposit(
  field: PheromoneField,
  tile: ForagingTile,
  strength: number = 0.5
): void {
  if (tile.found_resource) {
    // Found something good - leave strong RESOURCE trail
    depositPheromone(
      field,
      tile.current_cell,
      PheromoneType.RESOURCE,
      strength,
      tile.tile_id,
      0.05, // Slow decay for good finds
      { found_at: Date.now() }
    );
  }

  // Always leave TRAIL pheromone
  depositPheromone(
    field,
    tile.current_cell,
    PheromoneType.TRAIL,
    strength * 0.3, // Weaker trail
    tile.tile_id,
    0.2, // Faster decay for trails
    { from: tile.previous_cell }
  );
}

/**
 * FLOCKING PATTERN
 * ================
 *
 * Tiles coordinate movement like a flock of birds or school of fish.
 * No leader. No central control. Just local rules.
 *
 * Rules:
 * 1. Separation: Don't crowd other tiles
 * 2. Alignment: Move in same direction as nearby tiles
 * 3. Cohesion: Stay close to group center
 *
 * Result: Elegant, coordinated movement patterns.
 */

/**
 * Flocking tile state
 */
export interface FlockingTile {
  /** Tile identifier */
  tile_id: string;

  /** Current position */
  current_cell: CellCoordinate;

  /** Velocity (row_delta, column_delta) */
  velocity: { row: number; column: number };

  /** Perception radius (cells) */
  perception_radius: number;

  /** Maximum speed */
  max_speed: number;
}

/**
 * Calculate flocking behavior
 */
export function flockingUpdate(
  field: PheromoneField,
  tile: FlockingTile,
  all_tiles: FlockingTile[]
): { row: number; column: number } {
  // Find nearby tiles
  const nearby = all_tiles.filter(other => {
    if (other.tile_id === tile.tile_id) return false;

    const row_dist = Math.abs(other.current_cell.row - tile.current_cell.row);
    const col_dist = Math.abs(other.current_cell.column - tile.current_cell.column);

    return row_dist <= tile.perception_radius && col_dist <= tile.perception_radius;
  });

  if (nearby.length === 0) {
    // No neighbors - maintain current velocity
    return tile.velocity;
  }

  // Separation: steer away from nearby tiles
  let separation = { row: 0, column: 0 };
  for (const other of nearby) {
    const row_diff = tile.current_cell.row - other.current_cell.row;
    const col_diff = tile.current_cell.column - other.current_cell.column;

    separation.row += row_diff;
    separation.column += col_diff;
  }

  // Alignment: match average velocity of neighbors
  let alignment = { row: 0, column: 0 };
  for (const other of nearby) {
    alignment.row += other.velocity.row;
    alignment.column += other.velocity.column;
  }
  alignment.row /= nearby.length;
  alignment.column /= nearby.length;

  // Cohesion: steer toward group center
  let center = { row: 0, column: 0 };
  for (const other of nearby) {
    center.row += other.current_cell.row;
    center.column += other.current_cell.column;
  }
  center.row /= nearby.length;
  center.column /= nearby.length;

  const cohesion = {
    row: center.row - tile.current_cell.row,
    column: center.column - tile.current_cell.column
  };

  // Combine forces (adjust weights as needed)
  const new_velocity = {
    row: (separation.row * 1.5) + (alignment.row * 1.0) + (cohesion.row * 1.0),
    column: (separation.column * 1.5) + (alignment.column * 1.0) + (cohesion.column * 1.0)
  };

  // Limit speed
  const speed = Math.sqrt(new_velocity.row ** 2 + new_velocity.column ** 2);
  if (speed > tile.max_speed) {
    new_velocity.row = (new_velocity.row / speed) * tile.max_speed;
    new_velocity.column = (new_velocity.column / speed) * tile.max_speed;
  }

  return new_velocity;
}

/**
 * Leave flocking pheromone
 */
export function flockingDeposit(
  field: PheromoneField,
  tile: FlockingTile,
  strength: number = 0.3
): void {
  // Deposit TRAIL pheromone to show movement
  depositPheromone(
    field,
    tile.current_cell,
    PheromoneType.TRAIL,
    strength,
    tile.tile_id,
    0.3,
    { velocity: tile.velocity }
  );
}

/**
 * TASK ALLOCATION PATTERN
 * =======================
 *
 * Tiles self-organize to handle tasks.
 * High-priority tasks get more workers.
 * Low-priority tasks get ignored.
 *
 * Like ants dividing labor. Some forage, some build, some defend.
 * No foreman assigning tasks. Just response to local signals.
 *
 * Result: Efficient resource allocation without orchestration.
 */

/**
 * Task information
 */
export interface TaskInfo {
  /** Task identifier */
  task_id: string;

  /** Task priority (0.0 to 1.0) */
  priority: number;

  /** Estimated work required */
  work_required: number;

  /** Skills needed */
  skills_required: string[];
}

/**
 * Task allocation tile
 */
export interface TaskTile {
  /** Tile identifier */
  tile_id: string;

  /** Current position */
  current_cell: CellCoordinate;

  /** Skills this tile has */
  skills: string[];

  /** Current task (if any) */
  current_task?: string;
}

/**
 * Decide which task to work on
 */
export function taskAllocationDecide(
  field: PheromoneField,
  tile: TaskTile,
  neighbors: CellCoordinate[]
): CellCoordinate | null {
  let best_cell: CellCoordinate | null = null;
  let best_score = 0;

  for (const neighbor of neighbors) {
    const task_pheromones = sensePheromones(field, neighbor, PheromoneType.TASK);

    for (const pheromone of task_pheromones) {
      const task = pheromone.metadata as TaskInfo;

      // Check if tile has required skills
      const has_skills = task.skills_required.some(skill =>
        tile.skills.includes(skill)
      );

      if (!has_skills) continue;

      // Score based on priority and work remaining
      const score = task.priority;

      if (score > best_score) {
        best_score = score;
        best_cell = neighbor;
      }
    }
  }

  return best_cell;
}

/**
 * Deposit task pheromone
 */
export function taskDeposit(
  field: PheromoneField,
  coord: CellCoordinate,
  task: TaskInfo,
  source_tile: string
): void {
  depositPheromone(
    field,
    coord,
    PheromoneType.TASK,
    task.priority,
    source_tile,
    0.05, // Slow decay for tasks
    task
  );
}

/**
 * DANGER AVOIDANCE PATTERN
 * ========================
 *
 * Tiles avoid cells marked as dangerous.
 * One tile finds a problem, marks it DANGER.
 * Other tiles avoid it.
 *
 * Simple risk communication without overhead.
 */

/**
 * Check if cell is safe
 */
export function isCellSafe(field: PheromoneField, coord: CellCoordinate): boolean {
  const danger_level = getPheromoneStrength(field, coord, PheromoneType.DANGER);
  return danger_level < 0.5; // Threshold for "dangerous"
}

/**
 * Mark cell as dangerous
 */
export function markDanger(
  field: PheromoneField,
  coord: CellCoordinate,
  source_tile: string,
  severity: number = 0.8,
  reason?: string
): void {
  depositPheromone(
    field,
    coord,
    PheromoneType.DANGER,
    severity,
    source_tile,
    0.1, // Slow decay - danger persists
    { reason, marked_at: Date.now() }
  );
}

/**
 * Find safe neighboring cell
 */
export function findSafeCell(
  field: PheromoneField,
  neighbors: CellCoordinate[]
): CellCoordinate | null {
  const safe_cells = neighbors.filter(coord => isCellSafe(field, coord));

  if (safe_cells.length === 0) {
    return null;
  }

  // Return random safe cell
  return safe_cells[Math.floor(Math.random() * safe_cells.length)];
}

// ============================================================================
// SWARM SEARCH PATTERN (COMPLETE EXAMPLE)
// ============================================================================

/**
 * SWARM SEARCH
 * ============
 *
 * Multiple tiles search a spreadsheet for patterns.
 * They coordinate via pheromones to avoid redundant searching.
 *
 * Real-world use: Finding data quality issues across large datasets.
 * Each tile checks a region, marks what it found.
 * Other tiles avoid checked regions.
 * Result: Efficient parallel search without coordination overhead.
 */

/**
 * Search tile state
 */
export interface SearchTile {
  tile_id: string;
  current_cell: CellCoordinate;
  search_radius: number;
  pattern: RegExp; // What we're searching for
  cells_checked: Set<string>;
}

/**
 * Execute swarm search step
 */
export function swarmSearchStep(
  field: PheromoneField,
  tile: SearchTile,
  all_cells: CellCoordinate[]
): {
  next_cell: CellCoordinate;
  found_match: boolean;
  should_stop: boolean;
} {
  // Get neighbors
  const neighbors = getNeighbors(tile.current_cell, all_cells);

  // Avoid already-checked cells (have TRAIL pheromones)
  const unchecked = neighbors.filter(coord => {
    const trails = sensePheromones(field, coord, PheromoneType.TRAIL);
    return trails.length === 0;
  });

  // Pick random unchecked cell
  const next_cell = unchecked.length > 0
    ? unchecked[Math.floor(Math.random() * unchecked.length)]
    : neighbors[Math.floor(Math.random() * neighbors.length)];

  // Check if this cell matches our pattern (simulated)
  const found_match = Math.random() < 0.1; // 10% chance of match

  // Mark this cell as checked
  depositPheromone(
    field,
    tile.current_cell,
    PheromoneType.TRAIL,
    0.3,
    tile.tile_id,
    0.2,
    { checked_at: Date.now() }
  );

  // If found match, leave RESOURCE pheromone
  if (found_match) {
    depositPheromone(
      field,
      next_cell,
      PheromoneType.RESOURCE,
      0.8,
      tile.tile_id,
      0.05,
      { pattern: tile.pattern.source, found_at: Date.now() }
    );
  }

  // Stop if no unchecked cells remain
  const should_stop = unchecked.length === 0;

  return { next_cell, found_match, should_stop };
}

/**
 * Get neighboring cells (helper)
 */
function getNeighbors(
  center: CellCoordinate,
  all_cells: CellCoordinate[],
  radius: number = 1
): CellCoordinate[] {
  return all_cells.filter(cell => {
    const row_dist = Math.abs(cell.row - center.row);
    const col_dist = Math.abs(cell.column - center.column);

    // Same sheet
    if (cell.sheet !== center.sheet) return false;

    // Within radius
    return row_dist <= radius && col_dist <= radius;
  });
}

// ============================================================================
// TILE EXECUTION INTEGRATION
// ============================================================================

/**
 * Stigmergic tile execution context
 */
export interface StigmergicTileContext {
  /** The pheromone field */
  field: PheromoneField;

  /** This tile's identifier */
  tile_id: string;

  /** Current cell being processed */
  current_cell: CellCoordinate;

  /** All cells in the spreadsheet */
  all_cells: CellCoordinate[];

  /** Tile execution phase */
  phase: 'pre_execute' | 'execute' | 'post_execute';
}

/**
 * Execute tile with stigmergic coordination
 */
export function executeStigmergicTile(
  context: StigmergicTileContext,
  behavior: 'forage' | 'flock' | 'task' | 'search'
): {
  next_action: 'deposit' | 'move' | 'wait';
  target_cell?: CellCoordinate;
  pheromone_type?: PheromoneType;
  reasoning?: string;
} {
  const { field, tile_id, current_cell, all_cells } = context;

  switch (behavior) {
    case 'forage': {
      // Foraging: look for resources, avoid danger
      const neighbors = getNeighbors(current_cell, all_cells);
      const resource_strength = getPheromoneStrength(field, current_cell, PheromoneType.RESOURCE);
      const danger_strength = getPheromoneStrength(field, current_cell, PheromoneType.DANGER);

      if (danger_strength > 0.5) {
        return {
          next_action: 'move',
          target_cell: findSafeCell(field, neighbors) || current_cell,
          reasoning: 'Danger detected, moving to safety'
        };
      }

      if (resource_strength > 0.5) {
        return {
          next_action: 'deposit',
          pheromone_type: PheromoneType.RESOURCE,
          reasoning: 'Found resource, reinforcing trail'
        };
      }

      return {
        next_action: 'move',
        target_cell: neighbors[Math.floor(Math.random() * neighbors.length)],
        reasoning: 'Exploring for resources'
      };
    }

    case 'flock': {
      // Flocking: coordinate with nearby tiles
      return {
        next_action: 'deposit',
        pheromone_type: PheromoneType.TRAIL,
        reasoning: 'Leaving trail for flock coordination'
      };
    }

    case 'task': {
      // Task allocation: look for work
      const neighbors = getNeighbors(current_cell, all_cells);
      const task_strength = getPheromoneStrength(field, current_cell, PheromoneType.TASK);

      if (task_strength > 0.3) {
        return {
          next_action: 'deposit',
          pheromone_type: PheromoneType.TASK,
          reasoning: 'Working on task'
        };
      }

      return {
        next_action: 'move',
        target_cell: neighbors[Math.floor(Math.random() * neighbors.length)],
        reasoning: 'Looking for tasks'
      };
    }

    case 'search': {
      // Swarm search: avoid checked areas
      const neighbors = getNeighbors(current_cell, all_cells);
      const trail_strength = getPheromoneStrength(field, current_cell, PheromoneType.TRAIL);

      if (trail_strength < 0.3) {
        return {
          next_action: 'deposit',
          pheromone_type: PheromoneType.TRAIL,
          reasoning: 'Checking new area'
        };
      }

      return {
        next_action: 'move',
        target_cell: neighbors[Math.floor(Math.random() * neighbors.length)],
        reasoning: 'Already checked, moving on'
      };
    }

    default:
      return {
        next_action: 'wait',
        reasoning: 'Unknown behavior'
      };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get field statistics
 */
export function getFieldStats(field: PheromoneField): {
  total_cells: number;
  total_pheromones: number;
  by_type: Record<PheromoneType, number>;
  average_strength: number;
  oldest_age_ms: number;
} {
  let total_pheromones = 0;
  let total_strength = 0;
  const by_type: Record<PheromoneType, number> = {
    [PheromoneType.TRAIL]: 0,
    [PheromoneType.TASK]: 0,
    [PheromoneType.DANGER]: 0,
    [PheromoneType.RESOURCE]: 0
  };

  const now = Date.now();
  let oldest_age = 0;

  for (const pheromones of field.cells.values()) {
    for (const p of pheromones) {
      total_pheromones++;
      total_strength += p.strength;
      by_type[p.type]++;

      const age = now - p.timestamp;
      if (age > oldest_age) {
        oldest_age = age;
      }
    }
  }

  return {
    total_cells: field.cells.size,
    total_pheromones,
    by_type,
    average_strength: total_pheromones > 0 ? total_strength / total_pheromones : 0,
    oldest_age_ms: oldest_age
  };
}

/**
 * Visualize pheromone field (for debugging)
 */
export function visualizeField(field: PheromoneField): string {
  const lines: string[] = [];

  lines.push('=== PHEROMONE FIELD ===');
  lines.push(`Total cells: ${field.cells.size}`);
  lines.push(`Total deposits: ${field.stats.total_deposits}`);
  lines.push('');

  for (const [key, pheromones] of field.cells.entries()) {
    lines.push(`Cell ${key}:`);

    for (const p of pheromones) {
      lines.push(`  [${p.type}] Strength: ${p.strength.toFixed(2)} | Source: ${p.source_tile}`);
      if (p.metadata) {
        lines.push(`    Metadata: ${JSON.stringify(p.metadata)}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Serialize field for storage
 */
export function serializeField(field: PheromoneField): string {
  const data = {
    cells: Array.from(field.cells.entries()),
    config: field.config,
    stats: field.stats
  };

  return JSON.stringify(data);
}

/**
 * Deserialize field from storage
 */
export function deserializeField(json: string): PheromoneField {
  const data = JSON.parse(json);

  return {
    cells: new Map(data.cells),
    config: data.config,
    stats: data.stats
  };
}

// ============================================================================
// EXAMPLE: SWARM DATA QUALITY CHECK
// ============================================================================

/**
 * SWARM DATA QUALITY CHECK
 * ========================
 *
 * Real-world example: Multiple tiles checking data quality across a spreadsheet.
 * They coordinate via pheromones to avoid redundant checks.
 *
 * Benefits:
 * - No central coordination needed
 * - Automatic load balancing
 * - Fault tolerance (if one tile fails, others continue)
 * - Scalable (add more tiles without changing logic)
 */

/**
 * Data quality check tile
 */
export interface DataQualityTile {
  tile_id: string;
  current_cell: CellCoordinate;
  checks_performed: number;
  issues_found: number;
}

/**
 * Run data quality check step
 */
export function dataQualityCheckStep(
  field: PheromoneField,
  tile: DataQualityTile,
  all_cells: CellCoordinate[]
): {
  next_cell: CellCoordinate;
  issue_found: boolean;
  issue_type?: string;
  should_stop: boolean;
} {
  // Get neighbors
  const neighbors = getNeighbors(tile.current_cell, all_cells);

  // Avoid cells that were recently checked (have TRAIL pheromones from other tiles)
  const unchecked = neighbors.filter(coord => {
    const trails = sensePheromones(field, coord, PheromoneType.TRAIL);
    // Filter out trails from OTHER tiles (not ours)
    const other_trails = trails.filter(t => t.source_tile !== tile.tile_id);
    return other_trails.length === 0;
  });

  // Pick random unchecked cell
  const next_cell = unchecked.length > 0
    ? unchecked[Math.floor(Math.random() * unchecked.length)]
    : neighbors[Math.floor(Math.random() * neighbors.length)];

  // Simulate data quality check (replace with actual logic)
  const issue_found = Math.random() < 0.05; // 5% chance of issue
  const issue_types = ['null_value', 'out_of_range', 'invalid_format', 'duplicate'];
  const issue_type = issue_found ? issue_types[Math.floor(Math.random() * issue_types.length)] : undefined;

  // Mark cell as checked
  depositPheromone(
    field,
    next_cell,
    PheromoneType.TRAIL,
    0.2,
    tile.tile_id,
    0.3, // Moderate decay - checks stay valid for a while
    { checked_at: Date.now(), check_type: 'data_quality' }
  );

  // If issue found, mark it
  if (issue_found) {
    depositPheromone(
      field,
      next_cell,
      PheromoneType.DANGER,
      0.7,
      tile.tile_id,
      0.1, // Slow decay - issues persist
      { issue_type, found_at: Date.now() }
    );

    tile.issues_found++;
  }

  tile.checks_performed++;

  // Stop if no unchecked cells remain
  const should_stop = unchecked.length === 0;

  return { next_cell, issue_found, issue_type, should_stop };
}

/**
 * Get data quality report
 */
export function getDataQualityReport(field: PheromoneField): {
  total_cells_checked: number;
  total_issues_found: number;
  issues_by_type: Record<string, number>;
  issue_density: number;
} {
  let total_issues = 0;
  const issues_by_type: Record<string, number> = {};

  for (const [key, pheromones] of field.cells.entries()) {
    for (const p of pheromones) {
      if (p.type === PheromoneType.DANGER && p.metadata?.issue_type) {
        total_issues++;
        const issue_type = p.metadata.issue_type as string;
        issues_by_type[issue_type] = (issues_by_type[issue_type] || 0) + 1;
      }
    }
  }

  const total_cells_checked = field.cells.size;

  return {
    total_cells_checked,
    total_issues_found: total_issues,
    issues_by_type,
    issue_density: total_cells_checked > 0 ? total_issues / total_cells_checked : 0
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  createPheromoneField,
  depositPheromone,
  sensePheromones,
  getPheromoneStrength,
  evaporatePheromones,
  clearPheromones,
  clearAllPheromones,
  executeStigmergicTile,
  getFieldStats,
  visualizeField,
  serializeField,
  deserializeField
};

export type {
  Pheromone,
  PheromoneField,
  StigmergyConfig,
  FieldStats,
  CellCoordinate,
  ForagingTile,
  FlockingTile,
  TaskTile,
  SearchTile,
  DataQualityTile,
  TaskInfo,
  StigmergicTileContext
};
