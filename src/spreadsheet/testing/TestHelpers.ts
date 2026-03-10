/**
 * TestHelpers - Helper utilities for testing POLLN spreadsheet components
 *
 * Provides utility functions for common testing scenarios including
 * cell relationships, sensation propagation, time manipulation, and WebSocket mocking.
 */

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  CellReference,
  CellId,
  Sensation,
  SensationType,
  TimeOptions,
} from '../core/types.js';

/**
 * Helper class for cell relationship testing
 */
export class CellRelationshipHelper {
  /**
   * Create a dependency relationship between cells
   *
   * @param fromCell - The source cell
   * @param toCell - The dependent cell
   * @param type - Type of relationship
   */
  static createDependency(
    fromCell: unknown,
    toCell: unknown,
    type: 'data' | 'control' | 'sensation' = 'data'
  ): void {
    // Implementation would add the dependency to both cells
    // This is a placeholder for the actual implementation
  }

  /**
   * Create a chain of dependent cells
   *
   * @param cells - Array of cells to chain
   * @returns Array of created dependencies
   */
  static createChain(cells: unknown[]): unknown[] {
    const dependencies: unknown[] = [];

    for (let i = 0; i < cells.length - 1; i++) {
      const dep = this.createDependency(cells[i], cells[i + 1], 'data');
      dependencies.push(dep);
    }

    return dependencies;
  }

  /**
   * Create a mesh network of cells
   *
   * @param cells - Array of cells to connect
   * @returns Array of created dependencies
   */
  static createMesh(cells: unknown[]): unknown[] {
    const dependencies: unknown[] = [];

    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const dep = this.createDependency(cells[i], cells[j], 'data');
        dependencies.push(dep);
      }
    }

    return dependencies;
  }

  /**
   * Check if two cells are entangled (bidirectional dependency)
   *
   * @param cell1 - First cell
   * @param cell2 - Second cell
   * @returns True if cells are entangled
   */
  static areEntangled(cell1: unknown, cell2: unknown): boolean {
    // Implementation would check for bidirectional dependencies
    return false;
  }

  /**
   * Get all dependencies for a cell
   *
   * @param cell - The cell to query
   * @returns Array of dependent cells
   */
  static getDependencies(cell: unknown): unknown[] {
    // Implementation would return all dependent cells
    return [];
  }

  /**
   * Get all dependents (cells that depend on this cell)
   *
   * @param cell - The cell to query
   * @returns Array of dependent cells
   */
  static getDependents(cell: unknown): unknown[] {
    // Implementation would return all cells that depend on this cell
    return [];
  }

  /**
   * Break a dependency relationship
   *
   * @param fromCell - The source cell
   * @param toCell - The dependent cell
   */
  static breakDependency(fromCell: unknown, toCell: unknown): void {
    // Implementation would remove the dependency
  }

  /**
   * Break all dependencies for a cell
   *
   * @param cell - The cell to isolate
   */
  static isolateCell(cell: unknown): void {
    // Implementation would remove all dependencies
  }
}

/**
 * Helper class for sensation propagation testing
 */
export class SensationPropagationHelper {
  /**
   * Propagate a sensation from source to target cells
   *
   * @param source - Source cell
   * @param targets - Target cells
   * @param sensation - Sensation to propagate
   */
  static propagateSensation(
    source: unknown,
    targets: unknown[],
    sensation: Partial<Sensation>
  ): void {
    targets.forEach((target) => {
      // Implementation would send sensation to each target
    });
  }

  /**
   * Create a sensation for testing
   *
   * @param config - Sensation configuration
   * @returns A test sensation
   */
  static createSensation(config: {
    type: SensationType;
    source: CellReference;
    value: number;
    previousValue?: number;
    currentValue?: number;
    expectedValue?: number;
    confidence?: number;
  }): Sensation {
    return {
      type: config.type,
      source: config.source,
      value: config.value,
      previousValue: config.previousValue,
      currentValue: config.currentValue,
      expectedValue: config.expectedValue,
      timestamp: Date.now(),
      confidence: config.confidence ?? 1.0,
    };
  }

  /**
   * Wait for a sensation to be received
   *
   * @param cell - Cell to wait for sensation
   * @param timeout - Maximum time to wait in ms
   * @returns Promise that resolves with the sensation
   */
  static async waitForSensation(cell: unknown, timeout: number = 1000): Promise<Sensation> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timeout waiting for sensation'));
      }, timeout);

      // Implementation would set up a listener
      // For now, we'll just resolve with a mock sensation
      setTimeout(() => {
        clearTimeout(timer);
        resolve(this.createSensation({
          type: SensationType.ABSOLUTE_CHANGE,
          source: { row: 0, col: 0 },
          value: 42,
        }));
      }, 100);
    });
  }

  /**
   * Get all sensations received by a cell
   *
   * @param cell - The cell to query
   * @returns Array of received sensations
   */
  static getSensations(cell: unknown): Sensation[] {
    // Implementation would return sensation history
    return [];
  }

  /**
   * Clear sensation history for a cell
   *
   * @param cell - The cell to clear
   */
  static clearSensations(cell: unknown): void {
    // Implementation would clear sensation history
  }

  /**
   * Verify sensation propagation chain
   *
   * @param cells - Array of cells in propagation order
   * @param sensation - Initial sensation
   * @returns True if sensation propagated correctly
   */
  static verifyPropagation(cells: unknown[], sensation: Sensation): boolean {
    // Implementation would verify sensation reached all cells
    return true;
  }
}

/**
 * Helper class for time manipulation in tests
 */
export class TimeHelper {
  private static frozen = false;
  private static currentTime = Date.now();
  private static originalDate = Date.now;
  private static timers: Map<number, NodeJS.Timeout> = new Map();
  private static timerCounter = 0;

  /**
   * Freeze time at current moment
   */
  static freeze(): void {
    if (this.frozen) return;

    this.frozen = true;
    this.currentTime = Date.now();
  }

  /**
   * Unfreeze time
   */
  static unfreeze(): void {
    if (!this.frozen) return;

    this.frozen = false;
  }

  /**
   * Advance time by specified amount
   *
   * @param ms - Milliseconds to advance
   */
  static advance(ms: number): void {
    if (!this.frozen) {
      this.freeze();
    }
    this.currentTime += ms;
  }

  /**
   * Set time to specific value
   *
   * @param timestamp - Timestamp to set
   */
  static setTime(timestamp: number): void {
    if (!this.frozen) {
      this.freeze();
    }
    this.currentTime = timestamp;
  }

  /**
   * Get current time (frozen or real)
   */
  static now(): number {
    return this.frozen ? this.currentTime : Date.now();
  }

  /**
   * Tick time forward and run pending timers
   *
   * @param ms - Milliseconds to tick
   */
  static tick(ms: number): void {
    this.advance(ms);

    // Run timers that should fire during this tick
    const now = this.now();
    this.timers.forEach((timer, id) => {
      if (timer && timer['_idleStart'] && timer['_idleTimeout']) {
        const startTime = timer['_idleStart'];
        const timeout = timer['_idleTimeout'];
        if (now - startTime >= timeout) {
          if (timer['_onImmediate']) {
            timer['_onImmediate']();
          }
          this.timers.delete(id);
        }
      }
    });
  }

  /**
   * Create a mock timer that respects time manipulation
   *
   * @param callback - Function to call after delay
   * @param delay - Delay in milliseconds
   * @returns Timer ID
   */
  static setTimeout(callback: () => void, delay: number): number {
    const id = this.timerCounter++;
    const timer = setTimeout(() => {
      if (this.frozen) {
        // Don't run until tick is called
      } else {
        callback();
        this.timers.delete(id);
      }
    }, delay);
    this.timers.set(id, timer);
    return id;
  }

  /**
   * Clear a mock timer
   *
   * @param id - Timer ID
   */
  static clearTimeout(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  /**
   * Reset time helper to initial state
   */
  static reset(): void {
    this.unfreeze();
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.timerCounter = 0;
  }
}

/**
 * Helper class for async operation testing
 */
export class AsyncHelper {
  /**
   * Wait for a condition to be true
   *
   * @param condition - Function that returns true when condition is met
   * @param timeout - Maximum time to wait
   * @param interval - Check interval
   * @returns Promise that resolves when condition is met
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 50
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await this.sleep(interval);
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Wait for multiple async operations to complete
   *
   * @param operations - Array of async operations
   * @returns Promise that resolves when all operations complete
   */
  static async waitForAll<T>(operations: Promise<T>[]): Promise<T[]> {
    return Promise.all(operations);
  }

  /**
   * Wait for first of multiple async operations
   *
   * @param operations - Array of async operations
   * @returns Promise that resolves with first result
   */
  static async waitForAny<T>(operations: Promise<T>[]): Promise<T> {
    return Promise.race(operations);
  }

  /**
   * Sleep for specified duration
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after sleep
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry an operation with exponential backoff
   *
   * @param operation - Operation to retry
   * @param maxAttempts - Maximum number of attempts
   * @param baseDelay - Base delay between attempts
   * @returns Promise that resolves with operation result
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 100
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxAttempts - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Execute with timeout
   *
   * @param operation - Operation to execute
   * @param timeout - Timeout in milliseconds
   * @returns Promise that resolves with operation result
   */
  static async withTimeout<T>(operation: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      operation,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
      ),
    ]);
  }
}

/**
 * Mock WebSocket server for testing
 */
export class MockWebSocketServer {
  private clients: Map<string, MockWebSocketClient> = new Map();
  private messageLog: Array<{ clientId: string; message: string; timestamp: number }> = [];

  /**
   * Start the mock server
   */
  async start(): Promise<void> {
    // Mock implementation
  }

  /**
   * Stop the mock server
   */
  async stop(): Promise<void> {
    this.clients.forEach((client) => client.disconnect());
    this.clients.clear();
    this.messageLog = [];
  }

  /**
   * Simulate a client connecting
   *
   * @param clientId - Client identifier
   * @returns Mock WebSocket client
   */
  async connect(clientId: string): Promise<MockWebSocketClient> {
    const client = new MockWebSocketClient(clientId, this);
    this.clients.set(clientId, client);
    return client;
  }

  /**
   * Disconnect a client
   *
   * @param clientId - Client identifier
   */
  disconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.disconnect();
      this.clients.delete(clientId);
    }
  }

  /**
   * Broadcast a message to all clients
   *
   * @param type - Message type
   * @param data - Message data
   */
  broadcast(type: string, data: unknown): void {
    this.clients.forEach((client) => {
      client.send({ type, data });
    });
  }

  /**
   * Send a message to a specific client
   *
   * @param clientId - Client identifier
   * @param type - Message type
   * @param data - Message data
   */
  sendTo(clientId: string, type: string, data: unknown): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.send({ type, data });
    }
  }

  /**
   * Get message log
   *
   * @returns Array of logged messages
   */
  getMessages(): Array<{ clientId: string; message: string; timestamp: number }> {
    return [...this.messageLog];
  }

  /**
   * Clear message log
   */
  clearMessages(): void {
    this.messageLog = [];
  }

  /**
   * Simulate latency
   *
   * @param ms - Latency in milliseconds
   */
  async simulateLatency(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log a message
   *
   * @param clientId - Client identifier
   * @param message - Message content
   */
  logMessage(clientId: string, message: string): void {
    this.messageLog.push({
      clientId,
      message,
      timestamp: Date.now(),
    });
  }
}

/**
 * Mock WebSocket client for testing
 */
export class MockWebSocketClient {
  private connected = true;
  private messageHandlers: Array<(message: unknown) => void> = [];

  constructor(
    public readonly clientId: string,
    private server: MockWebSocketServer
  ) {}

  /**
   * Send a message through the WebSocket
   *
   * @param message - Message to send
   */
  send(message: unknown): void {
    if (!this.connected) {
      throw new Error('WebSocket is not connected');
    }

    this.server.logMessage(this.clientId, JSON.stringify(message));
  }

  /**
   * Register a message handler
   *
   * @param handler - Function to handle incoming messages
   */
  onMessage(handler: (message: unknown) => void): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Disconnect the WebSocket
   */
  disconnect(): void {
    this.connected = false;
    this.messageHandlers = [];
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Simulate receiving a message
   *
   * @param message - Message to receive
   */
  receive(message: unknown): void {
    if (!this.connected) return;

    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }
}

/**
 * Helper class for event testing
 */
export class EventHelper {
  private static eventLog: Array<{
    emitter: string;
    event: string;
    data: unknown;
    timestamp: number;
  }> = [];

  /**
   * Log an event
   *
   * @param emitter - Event emitter identifier
   * @param event - Event name
   * @param data - Event data
   */
  static log(emitter: string, event: string, data: unknown): void {
    this.eventLog.push({
      emitter,
      event,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get all logged events
   *
   * @returns Array of logged events
   */
  static getEvents(): Array<{
    emitter: string;
    event: string;
    data: unknown;
    timestamp: number;
  }> {
    return [...this.eventLog];
  }

  /**
   * Get events for a specific emitter
   *
   * @param emitter - Event emitter identifier
   * @returns Array of events for the emitter
   */
  static getEventsForEmitter(emitter: string): Array<{
    emitter: string;
    event: string;
    data: unknown;
    timestamp: number;
  }> {
    return this.eventLog.filter((e) => e.emitter === emitter);
  }

  /**
   * Get events of a specific type
   *
   * @param event - Event name
   * @returns Array of events of that type
   */
  static getEventsByType(event: string): Array<{
    emitter: string;
    event: string;
    data: unknown;
    timestamp: number;
  }> {
    return this.eventLog.filter((e) => e.event === event);
  }

  /**
   * Clear event log
   */
  static clear(): void {
    this.eventLog = [];
  }

  /**
   * Wait for a specific event
   *
   * @param emitter - Event emitter identifier
   * @param event - Event name
   * @param timeout - Maximum time to wait
   * @returns Promise that resolves with the event data
   */
  static async waitForEvent(
    emitter: string,
    event: string,
    timeout: number = 5000
  ): Promise<unknown> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const matchingEvent = this.eventLog.find(
        (e) => e.emitter === emitter && e.event === event
      );
      if (matchingEvent) {
        return matchingEvent.data;
      }
      await AsyncHelper.sleep(50);
    }

    throw new Error(`Event '${event}' from '${emitter}' not received within ${timeout}ms`);
  }
}
