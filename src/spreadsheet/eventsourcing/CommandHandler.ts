/**
 * POLLN Command Handler
 * Process commands and generate events
 */

import { randomUUID } from 'crypto';
import type { Command, Event, ICommandHandler, CommandMetadata, EventMetadata } from './types.js';

/**
 * Command result
 */
export interface CommandResult {
  events: Event[];
  errors: string[];
  version: number;
}

/**
 * Command Handler Class
 * Processes commands and produces events
 */
export class CommandHandler implements ICommandHandler {
  private handlers: Map<string, (command: Command) => Promise<Event[]>> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Register command handler
   */
  register(commandType: string, handler: (command: Command) => Promise<Event[]>): void {
    this.handlers.set(commandType, handler);
  }

  /**
   * Handle command
   */
  async handle(command: Command): Promise<Event[]> {
    const handler = this.handlers.get(command.type);

    if (!handler) {
      throw new Error(`No handler registered for command type: ${command.type}`);
    }

    return await handler(command);
  }

  /**
   * Check if handler can handle command
   */
  canHandle(command: Command): boolean {
    return this.handlers.has(command.type);
  }

  /**
   * Register default handlers
   */
  private registerDefaultHandlers(): void {
    // Cell commands
    this.register('CreateCell', async (cmd) => {
      const data = cmd.data as { row: number; column: number; value: unknown };
      return [{
        id: randomUUID(),
        type: 'CellCreated',
        aggregateId: cmd.aggregateId,
        aggregateType: 'Cell',
        version: 1,
        data: { row: data.row, column: data.column, value: data.value },
        metadata: this.createMetadata(cmd.metadata),
        timestamp: new Date()
      }];
    });

    this.register('UpdateCell', async (cmd) => {
      const data = cmd.data as { value: unknown; formula?: string };
      return [{
        id: randomUUID(),
        type: 'CellUpdated',
        aggregateId: cmd.aggregateId,
        aggregateType: 'Cell',
        version: 1,
        data: { value: data.value, formula: data.formula },
        metadata: this.createMetadata(cmd.metadata),
        timestamp: new Date()
      }];
    });

    // Spreadsheet commands
    this.register('CreateSpreadsheet', async (cmd) => {
      const data = cmd.data as { name: string; owner: string };
      return [{
        id: randomUUID(),
        type: 'SpreadsheetCreated',
        aggregateId: cmd.aggregateId,
        aggregateType: 'Spreadsheet',
        version: 1,
        data: { name: data.name, owner: data.owner },
        metadata: this.createMetadata(cmd.metadata),
        timestamp: new Date()
      }];
    });

    // Collaboration commands
    this.register('JoinSession', async (cmd) => {
      const data = cmd.data as { userId: string; username: string };
      return [{
        id: randomUUID(),
        type: 'UserJoined',
        aggregateId: cmd.aggregateId,
        aggregateType: 'Collaboration',
        version: 1,
        data: { userId: data.userId, username: data.username },
        metadata: this.createMetadata(cmd.metadata),
        timestamp: new Date()
      }];
    });
  }

  /**
   * Create event metadata from command metadata
   */
  private createMetadata(cmdMeta: CommandMetadata): EventMetadata {
    return {
      causationId: cmdMeta.causationId,
      correlationId: cmdMeta.correlationId,
      userId: cmdMeta.userId,
      timestamp: new Date()
    };
  }
}

/**
 * Command Builder
 * Helper for creating commands
 */
export class CommandBuilder {
  static create(
    type: string,
    aggregateId: string,
    data: Record<string, unknown>,
    userId: string,
    metadata?: Partial<CommandMetadata>
  ): Command {
    return {
      id: randomUUID(),
      type,
      aggregateId,
      data,
      metadata: {
        causationId: metadata?.causationId,
        correlationId: metadata?.correlationId || randomUUID(),
        userId,
        timestamp: metadata?.timestamp || new Date()
      },
      timestamp: new Date()
    };
  }
}

/**
 * Command Bus
 * Distributes commands to appropriate handlers
 */
export class CommandBus {
  private handlers: ICommandHandler[] = [];

  register(handler: ICommandHandler): void {
    this.handlers.push(handler);
  }

  async dispatch(command: Command): Promise<Event[]> {
    for (const handler of this.handlers) {
      if (handler.canHandle(command)) {
        return await handler.handle(command);
      }
    }

    throw new Error(`No handler found for command: ${command.type}`);
  }
}
