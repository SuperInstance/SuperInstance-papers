/**
 * POLLN Aggregate Root
 * Base class for all aggregates in event sourcing
 */

import { randomUUID } from 'crypto';
import type { Event, IAggregateRoot, Command } from './types.js';

/**
 * Aggregate Root Base Class
 */
export abstract class AggregateRoot implements IAggregateRoot {
  public readonly id: string;
  public version: number = 0;
  public readonly type: string;

  protected uncommittedEvents: Event[] = [];

  constructor(id: string, type: string) {
    this.id = id;
    this.type = type;
  }

  /**
   * Apply event to aggregate state
   */
  abstract apply(event: Event): void;

  /**
   * Get uncommitted events
   */
  getUncommittedEvents(): Event[] {
    return [...this.uncommittedEvents];
  }

  /**
   * Mark events as committed
   */
  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  /**
   * Load aggregate from event history
   */
  loadFromHistory(events: Event[]): void {
    for (const event of events) {
      this.apply(event);
      this.version = event.version;
    }
  }

  /**
   * Raise new event
   */
  protected raise(
    type: string,
    data: Record<string, unknown>,
    metadata?: Partial<Event['metadata']>
  ): void {
    const event: Event = {
      id: randomUUID(),
      type,
      aggregateId: this.id,
      aggregateType: this.type,
      version: this.version + 1,
      data,
      metadata: {
        correlationId: metadata?.correlationId || randomUUID(),
        causationId: metadata?.causationId,
        userId: metadata?.userId,
        timestamp: metadata?.timestamp || new Date()
      },
      timestamp: new Date()
    };

    this.uncommittedEvents.push(event);
    this.apply(event);
    this.version = event.version;
  }
}

/**
 * Cell Aggregate
 * Represents a spreadsheet cell
 */
export class CellAggregate extends AggregateRoot {
  public readonly type = 'Cell';

  private value: unknown = null;
  private formula?: string;
  private formatting: Record<string, unknown> = {};
  private dependencies: string[] = [];
  private lastModified: Date = new Date();
  private lastModifiedBy: string = '';

  constructor(id: string) {
    super(id, 'Cell');
  }

  /**
   * Create cell
   */
  static create(row: number, column: number, value: unknown, userId: string): CellAggregate {
    const cell = new CellAggregate(`cell-${row}-${column}`);
    cell.raise('CellCreated', { row, column, value }, { userId });
    return cell;
  }

  /**
   * Update value
   */
  updateValue(value: unknown, formula?: string, userId: string): void {
    this.raise('CellUpdated', { value, formula }, { userId });
  }

  /**
   * Add dependency
   */
  addDependency(cellId: string, userId: string): void {
    if (!this.dependencies.includes(cellId)) {
      this.raise('DependencyAdded', { cellId }, { userId });
    }
  }

  /**
   * Remove dependency
   */
  removeDependency(cellId: string, userId: string): void {
    if (this.dependencies.includes(cellId)) {
      this.raise('DependencyRemoved', { cellId }, { userId });
    }
  }

  /**
   * Apply event to state
   */
  apply(event: Event): void {
    switch (event.type) {
      case 'CellCreated':
        this.value = event.data.value as unknown;
        this.lastModified = event.timestamp;
        this.lastModifiedBy = event.metadata.userId || '';
        break;

      case 'CellUpdated':
        this.value = event.data.value as unknown;
        this.formula = event.data.formula as string;
        this.lastModified = event.timestamp;
        this.lastModifiedBy = event.metadata.userId || '';
        break;

      case 'DependencyAdded':
        this.dependencies.push(event.data.cellId as string);
        break;

      case 'DependencyRemoved':
        this.dependencies = this.dependencies.filter(
          id => id !== event.data.cellId
        );
        break;
    }
  }

  /**
   * Get cell state
   */
  getState() {
    return {
      id: this.id,
      value: this.value,
      formula: this.formula,
      formatting: this.formatting,
      dependencies: this.dependencies,
      lastModified: this.lastModified,
      lastModifiedBy: this.lastModifiedBy
    };
  }
}

/**
 * Spreadsheet Aggregate
 * Represents a spreadsheet
 */
export class SpreadsheetAggregate extends AggregateRoot {
  public readonly type = 'Spreadsheet';

  private name: string = '';
  private owner: string = '';
  private collaborators: string[] = [];
  private cells: Map<string, CellState> = new Map();
  private createdAt: Date = new Date();
  private updatedAt: Date = new Date();

  constructor(id: string) {
    super(id, 'Spreadsheet');
  }

  /**
   * Create spreadsheet
   */
  static create(name: string, owner: string): SpreadsheetAggregate {
    const spreadsheet = new SpreadsheetAggregate(`spreadsheet-${randomUUID()}`);
    spreadsheet.raise('SpreadsheetCreated', { name, owner }, { userId: owner });
    return spreadsheet;
  }

  /**
   * Update metadata
   */
  updateMetadata(name: string, userId: string): void {
    this.raise('SpreadsheetUpdated', { name }, { userId });
  }

  /**
   * Add collaborator
   */
  addCollaborator(userId: string, addedBy: string): void {
    if (!this.collaborators.includes(userId)) {
      this.raise('CollaboratorAdded', { userId }, { userId: addedBy });
    }
  }

  /**
   * Remove collaborator
   */
  removeCollaborator(userId: string, removedBy: string): void {
    if (this.collaborators.includes(userId)) {
      this.raise('CollaboratorRemoved', { userId }, { userId: removedBy });
    }
  }

  /**
   * Apply event to state
   */
  apply(event: Event): void {
    switch (event.type) {
      case 'SpreadsheetCreated':
        this.name = event.data.name as string;
        this.owner = event.data.owner as string;
        this.createdAt = event.timestamp;
        this.updatedAt = event.timestamp;
        break;

      case 'SpreadsheetUpdated':
        this.name = event.data.name as string;
        this.updatedAt = event.timestamp;
        break;

      case 'CollaboratorAdded':
        this.collaborators.push(event.data.userId as string);
        break;

      case 'CollaboratorRemoved':
        this.collaborators = this.collaborators.filter(
          id => id !== event.data.userId
        );
        break;
    }
  }

  /**
   * Get spreadsheet state
   */
  getState() {
    return {
      id: this.id,
      name: this.name,
      owner: this.owner,
      collaborators: this.collaborators,
      cells: Array.from(this.cells.values()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

/**
 * Cell state interface
 */
interface CellState {
  id: string;
  row: number;
  column: number;
  value: unknown;
  formula?: string;
}
