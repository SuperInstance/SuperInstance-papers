/**
 * POLLN Spreadsheet SDK
 *
 * A comprehensive TypeScript SDK for extending POLLN programmatically.
 * Provides APIs for cells, sheets, colonies, and real-time WebSocket updates.
 *
 * @module spreadsheet/sdk
 *
 * @example
 * ```typescript
 * import { POLLNSDK, createClient } from '@polln/spreadsheet/sdk';
 *
 * // Using factory function
 * const client = await createClient({
 *   endpoint: 'http://localhost:3000',
 *   apiKey: 'your-api-key'
 * });
 *
 * // Or using class directly
 * const sdk = new POLLNSDK({ endpoint: 'http://localhost:3000' });
 * await sdk.initialize();
 *
 * // Access APIs
 * const cells = await sdk.cells();
 * const sheets = await sdk.sheets();
 * const colonies = await sdk.colonies();
 * ```
 */

// ============================================================================
// Main Export
// ============================================================================

export { POLLNClient, createClient } from './POLLNClient.js';

/**
 * POLLN Spreadsheet SDK - Main class alias for convenience
 *
 * This is the primary entry point for the SDK.
 *
 * @example
 * ```typescript
 * import { POLLNSDK } from '@polln/spreadsheet/sdk';
 *
 * const sdk = new POLLNSDK({
 *   endpoint: 'http://localhost:3000',
 *   apiKey: 'your-api-key'
 * });
 *
 * await sdk.initialize();
 * const cells = await sdk.cells();
 * ```
 */
export class POLLNSDK {
  private client: import('./POLLNClient.js').POLLNClient;

  /**
   * Create a new POLLN SDK instance
   *
   * @param config - SDK configuration
   */
  constructor(config: import('./Types.js').POLLNSDKConfig = {}) {
    const { POLLNClient } = require('./POLLNClient.js');
    this.client = new POLLNClient(config);
  }

  /**
   * Initialize the SDK
   */
  async initialize(): Promise<void> {
    return this.client.initialize();
  }

  /**
   * Disconnect the SDK
   */
  async disconnect(): Promise<void> {
    return this.client.disconnect();
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.client.isInitialized();
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.client.isAuthenticated();
  }

  /**
   * Get the Cell API
   */
  async cells() {
    const { CellAPI } = await import('./CellAPI.js');
    return new CellAPI(this.client);
  }

  /**
   * Get the Sheet API
   */
  async sheets() {
    const { SheetAPI } = await import('./SheetAPI.js');
    return new SheetAPI(this.client);
  }

  /**
   * Get the Colony API
   */
  async colonies() {
    const { ColonyAPI } = await import('./ColonyAPI.js');
    return new ColonyAPI(this.client);
  }

  /**
   * Get the WebSocket client
   */
  async websocket() {
    const { WebSocketClient } = await import('./WebSocketClient.js');
    const credentials = {
      token: (this.client as any).credentials?.token,
      apiKey: (this.client as any).credentials?.apiKey,
    };
    return new WebSocketClient((this.client as any).config.wsEndpoint, credentials);
  }
}

// ============================================================================
// API Classes
// ============================================================================

export { POLLNClient } from './POLLNClient.js';
export { CellAPI } from './CellAPI.js';
export { SheetAPI } from './SheetAPI.js';
export { ColonyAPI } from './ColonyAPI.js';
export { WebSocketClient } from './WebSocketClient.js';

// ============================================================================
// Types
// ============================================================================

export * from './Types.js';

// Re-export commonly used types for convenience
export type {
  POLLNSDKConfig,
  AuthCredentials,
  BaseCell,
  CellReference,
  CellType,
  CellValue,
  CellMetadata,
  CellStyle,
  ValidationRule,
  CellStatus,
  Sheet,
  SheetMetadata,
  SheetPermissions,
  ColonyConfig,
  ResourceBudget,
  ColonyMetadata,
  ColonyState,
  AgentConfig,
  APIRequest,
  APIResponse,
  PaginatedResponse,
  ErrorCode,
  POLLNSDKError,
  EventType,
  Event,
  EventHandler,
  EventSubscription,
  EventFilter,
  ConnectionState,
  WSMessage,
  WSConfig,
  BatchOperation,
  BatchOperationResult,
  BatchResponse,
  CellQuery,
  SheetQuery,
} from './Types.js';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a POLLN SDK client with automatic initialization
 *
 * @param config - SDK configuration
 * @returns Initialized SDK instance
 *
 * @example
 * ```typescript
 * const sdk = await createSDK({
 *   endpoint: 'http://localhost:3000',
 *   apiKey: 'your-api-key'
 * });
 *
 * const cells = await sdk.cells();
 * ```
 */
export async function createSDK(config: import('./Types.js').POLLNSDKConfig = {}): Promise<POLLNSDK> {
  const sdk = new POLLNSDK(config);
  await sdk.initialize();
  return sdk;
}

/**
 * Create a POLLN API client (alias for createClient)
 *
 * @param config - Client configuration
 * @returns Initialized client instance
 *
 * @example
 * ```typescript
 * const client = await createAPIClient({
 *   endpoint: 'http://localhost:3000',
 *   apiKey: 'your-api-key'
 * });
 * ```
 */
export async function createAPIClient(config: import('./Types.js').POLLNSDKConfig = {}) {
  return createClient(config);
}

/**
 * Create a WebSocket client for real-time updates
 *
 * @param url - WebSocket server URL
 * @param credentials - Authentication credentials
 * @param config - WebSocket configuration
 * @returns WebSocket client instance
 *
 * @example
 * ```typescript
 * const wsClient = await createWebSocketClient(
 *   'ws://localhost:3000',
 *   { token: 'your-token' },
 *   { reconnectAttempts: 5 }
 * );
 *
 * await wsClient.connect();
 * ```
 */
export async function createWebSocketClient(
  url: string,
  credentials?: import('./Types.js').AuthCredentials,
  config?: Partial<import('./Types.js').WSConfig>
) {
  const { WebSocketClient } = await import('./WebSocketClient.js');
  const client = new WebSocketClient(url, credentials, config);
  await client.connect();
  return client;
}

/**
 * Create a cell reference from row and column
 *
 * @param row - Row index (0-based)
 * @param column - Column index (0-based)
 * @returns Cell reference in A1 notation
 *
 * @example
 * ```typescript
 * const ref = cellRef(0, 0); // "A1"
 * const ref2 = cellRef(2, 3); // "D3"
 * ```
 */
export function cellRef(row: number, column: number): string {
  let columnRef = '';
  let col = column;
  while (col >= 0) {
    columnRef = String.fromCharCode((col % 26) + 65) + columnRef;
    col = Math.floor(col / 26) - 1;
  }
  return `${columnRef}${row + 1}`;
}

/**
 * Parse a cell reference to row and column
 *
 * @param reference - Cell reference in A1 notation
 * @returns Row and column indices (0-based)
 *
 * @example
 * ```typescript
 * const { row, column } = parseCellRef('A1'); // { row: 0, column: 0 }
 * const { row: r2, column: c2 } = parseCellRef('D3'); // { row: 2, column: 3 }
 * ```
 */
export function parseCellRef(reference: string): { row: number; column: number } {
  const match = reference.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid cell reference: ${reference}`);
  }

  const colRef = match[1];
  const rowRef = parseInt(match[2], 10) - 1;

  let column = 0;
  for (let i = 0; i < colRef.length; i++) {
    column = column * 26 + (colRef.charCodeAt(i) - 64);
  }

  return { row: rowRef, column };
}

/**
 * Convert cell reference to object format
 *
 * @param reference - Cell reference (string or object)
 * @returns Cell reference object
 *
 * @example
 * ```typescript
 * const obj = toCellRefObject('A1'); // { row: 0, column: 0 }
 * const obj2 = toCellRefObject({ row: 1, column: 2 }); // { row: 1, column: 2 }
 * ```
 */
export function toCellRefObject(reference: import('./Types.js').CellReference): { row: number; column: number } {
  if (typeof reference === 'string') {
    return parseCellRef(reference);
  }
  return reference;
}

/**
 * Convert cell reference to A1 notation
 *
 * @param reference - Cell reference (string or object)
 * @returns Cell reference in A1 notation
 *
 * @example
 * ```typescript
 * const str = toCellRefString({ row: 0, column: 0 }); // "A1"
 * const str2 = toCellRefString('B2'); // "B2"
 * ```
 */
export function toCellRefString(reference: import('./Types.js').CellReference): string {
  if (typeof reference === 'string') {
    return reference.toUpperCase();
  }
  return cellRef(reference.row, reference.column);
}

/**
 * Create a cell query builder
 *
 * @returns Query builder object
 *
 * @example
 * ```typescript
 * const query = createCellQuery()
 *   .withType('input')
 *   .withStatus('success')
 *   .inRowRange(0, 10)
 *   .build();
 * ```
 */
export function createCellQuery() {
  const query: import('./Types.js').CellQuery = {};

  return {
    withType(type: import('./Types.js').CellType) {
      query.type = type;
      return this;
    },
    withStatus(status: import('./Types.js').CellStatus) {
      query.status = status;
      return this;
    },
    inRowRange(min: number, max: number) {
      query.rowRange = { min, max };
      return this;
    },
    inColumnRange(min: number, max: number) {
      query.columnRange = { min, max };
      return this;
    },
    withValueRange(min?: number, max?: number) {
      query.valueRange = { min, max };
      return this;
    },
    withPagination(page: number, pageSize: number = 50, sortBy?: string, sortOrder?: 'asc' | 'desc') {
      query.pagination = { page, pageSize, sortBy, sortOrder };
      return this;
    },
    build(): import('./Types.js').CellQuery {
      return { ...query };
    },
  };
}

/**
 * Create a sheet query builder
 *
 * @returns Query builder object
 *
 * @example
 * ```typescript
 * const query = createSheetQuery()
 *   .withName('My Sheet')
 *   .withTags(['sales', '2024'])
 *   .withPagination(1, 20)
 *   .build();
 * ```
 */
export function createSheetQuery() {
  const query: import('./Types.js').SheetQuery = {};

  return {
    withName(name: string) {
      query.name = name;
      return this;
    },
    withTags(tags: string[]) {
      query.tags = tags;
      return this;
    },
    withAuthor(author: string) {
      query.author = author;
      return this;
    },
    withPagination(page: number, pageSize: number = 20, sortBy?: string, sortOrder?: 'asc' | 'desc') {
      query.pagination = { page, pageSize, sortBy, sortOrder };
      return this;
    },
    build(): import('./Types.js').SheetQuery {
      return { ...query };
    },
  };
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default SDK configuration values
 */
export const DEFAULTS = {
  ENDPOINT: 'http://localhost:3000',
  WS_ENDPOINT: 'ws://localhost:3000',
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  REQUESTS_PER_MINUTE: 60,
  BURST_LIMIT: 10,
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  PING_INTERVAL: 30000,
  PING_TIMEOUT: 5000,
} as const;

/**
 * Supported cell types
 */
export const CELL_TYPES = [
  'input',
  'output',
  'transform',
  'filter',
  'aggregate',
  'validate',
  'analysis',
  'prediction',
  'decision',
  'explain',
  'custom',
] as const;

/**
 * Supported cell statuses
 */
export const CELL_STATUSES = [
  'idle',
  'processing',
  'error',
  'success',
  'warning',
] as const;

/**
 * Supported event types
 */
export const EVENT_TYPES = [
  'cell:created',
  'cell:updated',
  'cell:deleted',
  'cell:valueChanged',
  'cell:statusChanged',
  'sheet:created',
  'sheet:updated',
  'sheet:deleted',
  'colony:created',
  'colony:updated',
  'colony:deleted',
  'agent:spawned',
  'agent:despawned',
  'agent:activated',
  'agent:deactivated',
  'connection:opened',
  'connection:closed',
  'connection:error',
] as const;

// ============================================================================
// Default Export
// ============================================================================

export default POLLNSDK;
