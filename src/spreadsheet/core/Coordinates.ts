/**
 * Coordinates - Origin-Centered Coordinate System for LOG Cells
 *
 * Implements the geocentered principle where each cell sees itself
 * as the origin (0, 0) of its own coordinate system. This enables:
 *
 * 1. Self-referential reasoning: "I am at origin"
 * 2. Relative positioning: "Cell B is at (+1, 0)"
 * 3. Resilience: Works with copy/paste, insertions, deletions
 * 4. Distributed scaling: No global coordinate system needed
 *
 * @module spreadsheet/core
 */

/**
 * Absolute position in spreadsheet (row, col, sheet)
 */
export interface CellPosition {
  row: number;
  col: number;
  sheet?: string;
}

/**
 * Relative position from origin (delta row, delta col)
 */
export interface RelativePosition {
  dRow: number;
  dCol: number;
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
 * Bounding box for a range of cells
 */
export interface CellRange {
  start: CellPosition;
  end: CellPosition;
}

/**
 * Origin-Centered Coordinates
 *
 * Each cell maintains its own coordinate system where it is at (0, 0).
 * This enables self-referential reasoning and resilient references.
 *
 * Example:
 * - Cell A at absolute position (5, 3)
 * - Cell B at absolute position (6, 3)
 * - From A's perspective: B is at relative position (+1, 0)
 * - From B's perspective: A is at relative position (-1, 0)
 */
export class OriginCenteredCoordinates {
  /**
   * Absolute position of the origin cell in spreadsheet
   */
  private readonly absolutePosition: CellPosition;

  /**
   * Create a new origin-centered coordinate system
   *
   * @param absolutePosition - The origin's absolute position
   */
  constructor(absolutePosition: CellPosition) {
    this.absolutePosition = { ...absolutePosition };
  }

  /**
   * Transform an absolute position to relative coordinates
   *
   * From the origin's perspective, where is another cell?
   *
   * @param other - Another cell's absolute position
   * @returns Relative position from origin
   *
   * @example
   * ```typescript
   * const origin = new OriginCenteredCoordinates({ row: 5, col: 3 });
   * const relative = origin.toRelative({ row: 6, col: 3 });
   * // returns { dRow: 1, dCol: 0 }
   * ```
   */
  public toRelative(other: CellPosition): RelativePosition {
    return {
      dRow: other.row - this.absolutePosition.row,
      dCol: other.col - this.absolutePosition.col,
    };
  }

  /**
   * Transform relative coordinates to absolute position
   *
   * Given a relative position, what is the absolute position?
   *
   * @param relative - Relative position from origin
   * @returns Absolute position in spreadsheet
   *
   * @example
   * ```typescript
   * const origin = new OriginCenteredCoordinates({ row: 5, col: 3 });
   * const absolute = origin.toAbsolute({ dRow: 1, dCol: 0 });
   * // returns { row: 6, col: 3 }
   * ```
   */
  public toAbsolute(relative: RelativePosition): CellPosition {
    return {
      row: this.absolutePosition.row + relative.dRow,
      col: this.absolutePosition.col + relative.dCol,
      sheet: this.absolutePosition.sheet,
    };
  }

  /**
   * Get the origin's absolute position
   *
   * @returns Absolute position
   */
  public getAbsolutePosition(): CellPosition {
    return { ...this.absolutePosition };
  }

  /**
   * Check if a position is at the origin
   *
   * @param position - Position to check (absolute or relative)
   * @returns true if position is origin
   */
  public isOrigin(position: CellPosition | RelativePosition): boolean {
    if ('dRow' in position) {
      // Relative position
      return position.dRow === 0 && position.dCol === 0;
    } else {
      // Absolute position
      return (
        position.row === this.absolutePosition.row &&
        position.col === this.absolutePosition.col
      );
    }
  }

  /**
   * Calculate Manhattan distance between two absolute positions
   *
   * Manhattan distance = |row1 - row2| + |col1 - col2|
   *
   * @param pos1 - First position
   * @param pos2 - Second position
   * @returns Manhattan distance
   */
  public manhattanDistance(pos1: CellPosition, pos2: CellPosition): number {
    return Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
  }

  /**
   * Calculate Euclidean distance between two absolute positions
   *
   * Euclidean distance = sqrt((row1 - row2)^2 + (col1 - col2)^2)
   *
   * @param pos1 - First position
   * @param pos2 - Second position
   * @returns Euclidean distance
   */
  public euclideanDistance(pos1: CellPosition, pos2: CellPosition): number {
    const dRow = pos1.row - pos2.row;
    const dCol = pos1.col - pos2.col;
    return Math.sqrt(dRow * dRow + dCol * dCol);
  }

  /**
   * Calculate relative distance from origin to another cell
   *
   * @param other - Another cell's absolute position
   * @returns Manhattan distance from origin
   */
  public distanceTo(other: CellPosition): number {
    const relative = this.toRelative(other);
    return Math.abs(relative.dRow) + Math.abs(relative.dCol);
  }

  /**
   * Check if another cell is adjacent to origin
   *
   * Adjacent = within 1 row and 1 column (including diagonal)
   *
   * @param other - Another cell's absolute position
   * @returns true if adjacent
   */
  public isAdjacent(other: CellPosition): boolean {
    const relative = this.toRelative(other);
    return Math.abs(relative.dRow) <= 1 && Math.abs(relative.dCol) <= 1;
  }

  /**
   * Check if another cell is directly connected (no diagonal)
   *
   * Direct = share a row or column and distance = 1
   *
   * @param other - Another cell's absolute position
   * @returns true if directly connected
   */
  public isDirectlyConnected(other: CellPosition): boolean {
    const relative = this.toRelative(other);
    const dist = Math.abs(relative.dRow) + Math.abs(relative.dCol);
    return dist === 1;
  }

  /**
   * Get direction from origin to another cell
   *
   * @param other - Another cell's absolute position
   * @returns Direction string (e.g., "N", "NE", "E", etc.)
   */
  public getDirection(other: CellPosition): string {
    const relative = this.toRelative(other);

    if (relative.dRow === 0 && relative.dCol === 0) return 'HERE';

    const vertical = relative.dRow > 0 ? 'S' : relative.dRow < 0 ? 'N' : '';
    const horizontal = relative.dCol > 0 ? 'E' : relative.dCol < 0 ? 'W' : '';

    return vertical + horizontal;
  }

  /**
   * Get all adjacent cells (8 neighbors)
   *
   * @returns Array of absolute positions for adjacent cells
   */
  public getAdjacentCells(): CellPosition[] {
    const adjacent: CellPosition[] = [];

    for (let dRow = -1; dRow <= 1; dRow++) {
      for (let dCol = -1; dCol <= 1; dCol++) {
        if (dRow === 0 && dCol === 0) continue; // Skip origin

        adjacent.push(this.toAbsolute({ dRow, dCol }));
      }
    }

    return adjacent;
  }

  /**
   * Get directly connected cells (4 neighbors, no diagonals)
   *
   * @returns Array of absolute positions for directly connected cells
   */
  public getDirectlyConnectedCells(): CellPosition[] {
    return [
      this.toAbsolute({ dRow: -1, dCol: 0 }), // North
      this.toAbsolute({ dRow: 1, dCol: 0 }),  // South
      this.toAbsolute({ dRow: 0, dCol: -1 }), // West
      this.toAbsolute({ dRow: 0, dCol: 1 }),  // East
    ];
  }

  /**
   * Get cells in a range around the origin
   *
   * @param radius - Radius in cells
   * @returns Array of absolute positions in range
   */
  public getCellsInRange(radius: number): CellPosition[] {
    const cells: CellPosition[] = [];

    for (let dRow = -radius; dRow <= radius; dRow++) {
      for (let dCol = -radius; dCol <= radius; dCol++) {
        if (dRow === 0 && dCol === 0) continue; // Skip origin

        cells.push(this.toAbsolute({ dRow, dCol }));
      }
    }

    return cells;
  }

  /**
   * Get cells in a specific direction
   *
   * @param direction - Direction (N, NE, E, SE, S, SW, W, NW)
   * @param distance - Distance in cells
   * @returns Absolute position in that direction
   */
  public getCellInDirection(direction: string, distance: number = 1): CellPosition | null {
    const directionMap: Record<string, RelativePosition> = {
      'N': { dRow: -distance, dCol: 0 },
      'NE': { dRow: -distance, dCol: distance },
      'E': { dRow: 0, dCol: distance },
      'SE': { dRow: distance, dCol: distance },
      'S': { dRow: distance, dCol: 0 },
      'SW': { dRow: distance, dCol: -distance },
      'W': { dRow: 0, dCol: -distance },
      'NW': { dRow: -distance, dCol: -distance },
    };

    const relative = directionMap[direction.toUpperCase()];
    if (!relative) return null;

    return this.toAbsolute(relative);
  }

  /**
   * Create a range from origin to another cell
   *
   * @param other - Another cell's absolute position
   * @returns Cell range from origin to other
   */
  public createRangeTo(other: CellPosition): CellRange {
    return {
      start: this.getAbsolutePosition(),
      end: other,
    };
  }

  /**
   * Check if a position is within a range
   *
   * @param position - Position to check
   * @param range - Range to check against
   * @returns true if position is in range
   */
  public isInRange(position: CellPosition, range: CellRange): boolean {
    const minRow = Math.min(range.start.row, range.end.row);
    const maxRow = Math.max(range.start.row, range.end.row);
    const minCol = Math.min(range.start.col, range.end.col);
    const maxCol = Math.max(range.start.col, range.end.col);

    return (
      position.row >= minRow &&
      position.row <= maxRow &&
      position.col >= minCol &&
      position.col <= maxCol
    );
  }

  /**
   * Normalize a relative position to ensure it's within bounds
   *
   * @param relative - Relative position
   * @param minRow - Minimum row (default 0)
   * @param minCol - Minimum column (default 0)
   * @returns Normalized absolute position
   */
  public normalize(relative: RelativePosition, minRow: number = 0, minCol: number = 0): CellPosition {
    const absolute = this.toAbsolute(relative);
    return {
      row: Math.max(absolute.row, minRow),
      col: Math.max(absolute.col, minCol),
      sheet: this.absolutePosition.sheet,
    };
  }

  /**
   * Serialize to JSON
   *
   * @returns JSON representation
   */
  public toJSON(): object {
    return {
      absolutePosition: this.absolutePosition,
    };
  }

  /**
   * Create from JSON
   *
   * @param json - JSON representation
   * @returns OriginCenteredCoordinates instance
   */
  public static fromJSON(json: any): OriginCenteredCoordinates {
    return new OriginCenteredCoordinates(json.absolutePosition);
  }

  /**
   * String representation
   *
   * @returns String representation
   */
  public toString(): string {
    return `OriginCenteredCoordinates(at ${this.absolutePosition.sheet || 'Sheet'}!${this.absolutePosition.row},${this.absolutePosition.col})`;
  }
}

/**
 * Coordinate utility functions
 */
export class CoordinateUtils {
  /**
   * Convert column number to letter (e.g., 0 -> A, 1 -> B, 26 -> AA)
   *
   * @param col - Column number (0-indexed)
   * @returns Column letter
   */
  public static columnToLetter(col: number): string {
    let letter = '';
    let temp = col;

    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }

    return letter;
  }

  /**
   * Convert column letter to number (e.g., A -> 0, B -> 1, AA -> 26)
   *
   * @param letter - Column letter (case-insensitive)
   * @returns Column number (0-indexed)
   */
  public static letterToColumn(letter: string): number {
    // Convert to uppercase for consistent handling
    const upperLetter = letter.toUpperCase();
    let col = 0;

    for (let i = 0; i < upperLetter.length; i++) {
      col = col * 26 + (upperLetter.charCodeAt(i) - 64);
    }

    return col - 1;
  }

  /**
   * Convert position to A1 notation (e.g., {row: 0, col: 0} -> "A1")
   *
   * @param position - Cell position (0-indexed)
   * @returns A1 notation string
   */
  public static toA1Notation(position: CellPosition): string {
    const colLetter = CoordinateUtils.columnToLetter(position.col);
    const rowNum = position.row + 1;
    return `${colLetter}${rowNum}`;
  }

  /**
   * Parse A1 notation to position (e.g., "A1" -> {row: 0, col: 0})
   *
   * @param a1 - A1 notation string
   * @returns Cell position (0-indexed)
   */
  public static fromA1Notation(a1: string): CellPosition {
    const match = a1.match(/^([A-Za-z]+)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid A1 notation: ${a1}`);
    }

    const colLetter = match[1].toUpperCase();
    const rowNum = parseInt(match[2], 10);

    return {
      col: CoordinateUtils.letterToColumn(colLetter),
      row: rowNum - 1,
    };
  }

  /**
   * Calculate the midpoint between two positions
   *
   * @param pos1 - First position
   * @param pos2 - Second position
   * @returns Midpoint position
   */
  public static midpoint(pos1: CellPosition, pos2: CellPosition): CellPosition {
    return {
      row: Math.round((pos1.row + pos2.row) / 2),
      col: Math.round((pos1.col + pos2.col) / 2),
      sheet: pos1.sheet,
    };
  }

  /**
   * Check if three positions are collinear
   *
   * @param pos1 - First position
   * @param pos2 - Second position
   * @param pos3 - Third position
   * @returns true if collinear
   */
  public static areCollinear(pos1: CellPosition, pos2: CellPosition, pos3: CellPosition): boolean {
    const area =
      pos1.row * (pos2.col - pos3.col) +
      pos2.row * (pos3.col - pos1.col) +
      pos3.row * (pos1.col - pos2.col);

    return area === 0;
  }
}
