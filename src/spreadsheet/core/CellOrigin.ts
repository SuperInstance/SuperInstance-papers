/**
 * CellOrigin - Self-Reference Point for LOG Cells
 *
 * The origin represents a cell's identity and self-reference point.
 * Each cell sees itself as the origin (0, 0) of its own coordinate system.
 * This enables origin-centered design where cells can reason about
 * their position relative to other cells.
 *
 * @module spreadsheet/core
 */

import { OriginCenteredCoordinates } from './Coordinates';

/**
 * Unique cell identifier
 * Format: "{sheetName}_{row}_{col}" or UUID for distributed systems
 */
export type CellId = string;

/**
 * Cell position in spreadsheet (absolute coordinates)
 */
export interface CellPosition {
  row: number;
  col: number;
  sheet?: string;
}

/**
 * Cell reference (can be absolute or relative)
 */
export interface CellReference {
  row: number;
  col: number;
  sheet?: string;
}

/**
 * Self-awareness levels for cells
 * Determines how much a cell knows about itself and its environment
 */
export enum SelfAwarenessLevel {
  /**
   * Basic: Knows own position and ID
   * Can perform basic coordinate transformations
   */
  BASIC = 'basic',

  /**
   * INTERMEDIATE: Knows watched cells and their states
   * Can sense changes in watched cells
   */
  INTERMEDIATE = 'intermediate',

  /**
   * ADVANCED: Knows execution history and patterns
   * Can reason about past behavior and predict future
   */
  ADVANCED = 'advanced',

  /**
   * FULL: Complete self-model with introspection
   * Can explain own decisions and learn from feedback
   */
  FULL = 'full',
}

/**
 * Sensation types that a cell can detect in watched cells
 */
export enum SensationType {
  /**
   * State difference: new_value - old_value
   */
  ABSOLUTE_CHANGE = 'absolute',

  /**
   * First derivative: rate of change
   */
  RATE_OF_CHANGE = 'velocity',

  /**
   * Second derivative: acceleration/trend
   */
  ACCELERATION = 'trend',

  /**
   * Cell exists and is active
   */
  PRESENCE = 'presence',

  /**
   * Pattern recognized in cell's output
   */
  PATTERN = 'pattern',

  /**
   * Deviation from expected behavior
   */
  ANOMALY = 'anomaly',
}

/**
 * A sensation represents a change detected in a watched cell
 */
export interface Sensation {
  source: CellReference;
  type: SensationType;
  value: number;
  previousValue?: number;
  currentValue?: number;
  expectedValue?: number;
  timestamp: number;
  confidence: number;
}

/**
 * A watched cell that this origin is monitoring
 */
export interface WatchedCell {
  reference: CellReference;
  sensationTypes: SensationType[];
  threshold: number;
  lastSensation?: Sensation;
}

/**
 * CellOrigin - The self-reference point of a LOG cell
 *
 * The origin maintains:
 * - Cell identity (ID and position)
 * - Self-awareness level
 * - Watched cells for sensation
 * - Coordinate transformation system
 *
 * The origin enables cells to:
 * 1. Reference themselves in reasoning
 * 2. Track other cells for sensation
 * 3. Transform between absolute and relative coordinates
 * 4. Maintain self-awareness
 */
export class CellOrigin {
  /**
   * Unique cell identifier
   */
  public readonly id: CellId;

  /**
   * Absolute position in spreadsheet
   */
  public readonly position: CellPosition;

  /**
   * Self-awareness level
   */
  public selfAwareness: SelfAwarenessLevel;

  /**
   * Cells being watched for sensation
   */
  protected watchedCells: Map<string, WatchedCell>;

  /**
   * Coordinate transformation system
   */
  public readonly coordinates: OriginCenteredCoordinates;

  /**
   * Creation timestamp
   */
  public createdAt: number;

  /**
   * Last update timestamp
   */
  public updatedAt: number;

  /**
   * Create a new CellOrigin
   *
   * @param id - Unique cell identifier
   * @param position - Absolute position in spreadsheet
   * @param selfAwareness - Initial self-awareness level
   */
  constructor(
    id: CellId,
    position: CellPosition,
    selfAwareness: SelfAwarenessLevel = SelfAwarenessLevel.BASIC
  ) {
    this.id = id;
    this.position = { ...position };
    this.selfAwareness = selfAwareness;
    this.watchedCells = new Map();
    this.coordinates = new OriginCenteredCoordinates(position);
    this.createdAt = Date.now();
    this.updatedAt = this.createdAt;
  }

  /**
   * Watch a cell for sensations
   *
   * @param reference - Cell to watch
   * @param sensationTypes - Types of changes to detect
   * @param threshold - Sensitivity threshold
   * @returns WatchedCell record
   */
  public watch(
    reference: CellReference,
    sensationTypes: SensationType[],
    threshold: number = 0.1
  ): WatchedCell {
    const key = this.getWatchedCellKey(reference);

    const watchedCell: WatchedCell = {
      reference: { ...reference },
      sensationTypes: [...sensationTypes],
      threshold,
    };

    this.watchedCells.set(key, watchedCell);
    this.updatedAt = Date.now();

    return watchedCell;
  }

  /**
   * Stop watching a cell
   *
   * @param reference - Cell to stop watching
   * @returns true if cell was being watched, false otherwise
   */
  public unwatch(reference: CellReference): boolean {
    const key = this.getWatchedCellKey(reference);
    const result = this.watchedCells.delete(key);
    if (result) {
      this.updatedAt = Date.now();
    }
    return result;
  }

  /**
   * Get all watched cells
   *
   * @returns Array of watched cells
   */
  public getWatchedCells(): WatchedCell[] {
    return Array.from(this.watchedCells.values());
  }

  /**
   * Get a specific watched cell
   *
   * @param reference - Cell reference
   * @returns WatchedCell if found, undefined otherwise
   */
  public getWatchedCell(reference: CellReference): WatchedCell | undefined {
    const key = this.getWatchedCellKey(reference);
    return this.watchedCells.get(key);
  }

  /**
   * Update the last sensation for a watched cell
   *
   * @param reference - Cell reference
   * @param sensation - New sensation
   */
  public updateSensation(reference: CellReference, sensation: Sensation): void {
    const watchedCell = this.getWatchedCell(reference);
    if (watchedCell) {
      watchedCell.lastSensation = sensation;
      this.updatedAt = Date.now();
    }
  }

  /**
   * Check if a cell is being watched
   *
   * @param reference - Cell reference
   * @returns true if cell is being watched
   */
  public isWatching(reference: CellReference): boolean {
    const key = this.getWatchedCellKey(reference);
    return this.watchedCells.has(key);
  }

  /**
   * Clear all watched cells
   */
  public clearWatchedCells(): void {
    this.watchedCells.clear();
    this.updatedAt = Date.now();
  }

  /**
   * Get the count of watched cells
   *
   * @returns Number of watched cells
   */
  public getWatchedCellCount(): number {
    return this.watchedCells.size;
  }

  /**
   * Upgrade self-awareness level
   *
   * @param newLevel - New self-awareness level
   * @returns true if upgraded, false if already at or above level
   */
  public upgradeAwareness(newLevel: SelfAwarenessLevel): boolean {
    const levels = [
      SelfAwarenessLevel.BASIC,
      SelfAwarenessLevel.INTERMEDIATE,
      SelfAwarenessLevel.ADVANCED,
      SelfAwarenessLevel.FULL,
    ];

    const currentIndex = levels.indexOf(this.selfAwareness);
    const newIndex = levels.indexOf(newLevel);

    if (newIndex > currentIndex) {
      this.selfAwareness = newLevel;
      this.updatedAt = Date.now();
      return true;
    }

    return false;
  }

  /**
   * Get a string key for a watched cell
   *
   * @param reference - Cell reference
   * @returns String key
   */
  protected getWatchedCellKey(reference: CellReference): string {
    const sheet = reference.sheet || 'default';
    return `${sheet}_${reference.row}_${reference.col}`;
  }

  /**
   * Get relative position of another cell from this origin
   *
   * @param other - Other cell's position
   * @returns Relative position
   */
  public getRelativePosition(other: CellPosition): { dRow: number; dCol: number } {
    return this.coordinates.toRelative(other);
  }

  /**
   * Get absolute position from relative coordinates
   *
   * @param relative - Relative position
   * @returns Absolute position
   */
  public getAbsolutePosition(relative: { dRow: number; dCol: number }): CellPosition {
    return this.coordinates.toAbsolute(relative);
  }

  /**
   * Calculate distance to another cell (Manhattan distance)
   *
   * @param other - Other cell's position
   * @returns Manhattan distance
   */
  public distanceTo(other: CellPosition): number {
    const rel = this.getRelativePosition(other);
    return Math.abs(rel.dRow) + Math.abs(rel.dCol);
  }

  /**
   * Check if another cell is adjacent (neighbors)
   *
   * @param other - Other cell's position
   * @returns true if adjacent (including diagonal)
   */
  public isAdjacentTo(other: CellPosition): boolean {
    const rel = this.getRelativePosition(other);
    return Math.abs(rel.dRow) <= 1 && Math.abs(rel.dCol) <= 1;
  }

  /**
   * Serialize origin to JSON
   *
   * @returns JSON representation
   */
  public toJSON(): object {
    return {
      id: this.id,
      position: this.position,
      selfAwareness: this.selfAwareness,
      watchedCells: Array.from(this.watchedCells.values()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create CellOrigin from JSON
   *
   * @param json - JSON representation
   * @returns CellOrigin instance
   */
  public static fromJSON(json: any): CellOrigin {
    const origin = new CellOrigin(
      json.id,
      json.position,
      json.selfAwareness || SelfAwarenessLevel.BASIC
    );

    // Restore watched cells
    if (json.watchedCells && Array.isArray(json.watchedCells)) {
      json.watchedCells.forEach((watched: WatchedCell) => {
        origin.watch(watched.reference, watched.sensationTypes, watched.threshold);
        if (watched.lastSensation) {
          origin.updateSensation(watched.reference, watched.lastSensation);
        }
      });
    }

    // Restore timestamps
    origin.createdAt = json.createdAt || Date.now();
    origin.updatedAt = json.updatedAt || Date.now();

    return origin;
  }

  /**
   * Create a clone of this origin
   *
   * @returns Cloned CellOrigin
   */
  public clone(): CellOrigin {
    const cloned = new CellOrigin(this.id, this.position, this.selfAwareness);

    // Clone watched cells
    this.getWatchedCells().forEach((watched) => {
      cloned.watch(watched.reference, watched.sensationTypes, watched.threshold);
      if (watched.lastSensation) {
        cloned.updateSensation(watched.reference, { ...watched.lastSensation });
      }
    });

    // Copy timestamps
    cloned.createdAt = this.createdAt;
    cloned.updatedAt = this.updatedAt;

    return cloned;
  }

  /**
   * String representation
   *
   * @returns String representation
   */
  public toString(): string {
    return `CellOrigin(${this.id} at ${this.position.sheet || 'Sheet'}!${this.position.row},${this.position.col})`;
  }
}
