/**
 * POLLN Spreadsheet SDK Types
 *
 * Complete TypeScript definitions for the POLLN Spreadsheet SDK.
 * Provides type safety and comprehensive documentation for all SDK operations.
 *
 * @module spreadsheet/sdk/Types
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for the POLLN Spreadsheet SDK client
 */
export interface POLLNSDKConfig {
  /**
   * API endpoint URL
   * @default 'http://localhost:3000'
   */
  endpoint?: string;

  /**
   * WebSocket endpoint URL
   * @default 'ws://localhost:3000'
   */
  wsEndpoint?: string;

  /**
   * API key for authentication
   */
  apiKey?: string;

  /**
   * Authentication token (if using token-based auth)
   */
  authToken?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries?: number;

  /**
   * Initial retry delay in milliseconds
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * WebSocket configuration
   */
  websocket?: {
    /**
     * Reconnection attempts
     * @default 5
     */
    reconnectAttempts?: number;

    /**
     * Reconnection delay in milliseconds
     * @default 1000
     */
    reconnectDelay?: number;

    /**
     * Ping interval in milliseconds
     * @default 30000
     */
    pingInterval?: number;

    /**
     * Ping timeout in milliseconds
     * @default 5000
     */
    pingTimeout?: number;
  };

  /**
   * Rate limiting configuration
   */
  rateLimit?: {
    /**
     * Maximum requests per minute
     * @default 60
     */
    requestsPerMinute?: number;

    /**
     * Burst limit (max concurrent requests)
     * @default 10
     */
    burstLimit?: number;
  };
}

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  /**
   * API key
   */
  apiKey?: string;

  /**
   * Bearer token
   */
  token?: string;

  /**
   * Username (for basic auth)
   */
  username?: string;

  /**
   * Password (for basic auth)
   */
  password?: string;

  /**
   * Custom auth headers
   */
    customHeaders?: Record<string, string>;
}

// ============================================================================
// Cell Types
// ============================================================================

/**
 * Cell reference in A1 notation or object format
 */
export type CellReference = string | { row: number; column: number };

/**
 * Base cell interface
 */
export interface BaseCell {
  /**
   * Unique cell identifier
   */
  id: string;

  /**
   * Cell reference (e.g., "A1")
   */
  reference: string;

  /**
   * Row index (0-based)
   */
  row: number;

  /**
   * Column index (0-based)
   */
  column: number;

  /**
   * Cell type
   */
  type: CellType;

  /**
   * Current value
   */
  value: CellValue;

  /**
   * Cell formula (if applicable)
   */
  formula?: string;

  /**
   * Cell metadata
   */
  metadata?: CellMetadata;

  /**
   * Creation timestamp
   */
  createdAt: number;

  /**
   * Last update timestamp
   */
  updatedAt: number;

  /**
   * Cell status
   */
  status: CellStatus;
}

/**
 * Cell types supported by POLLN
 */
export type CellType =
  | 'input'
  | 'output'
  | 'transform'
  | 'filter'
  | 'aggregate'
  | 'validate'
  | 'analysis'
  | 'prediction'
  | 'decision'
  | 'explain'
  | 'custom';

/**
 * Cell value types
 */
export type CellValue = string | number | boolean | Date | null | undefined | CellValue[];

/**
 * Cell metadata
 */
export interface CellMetadata {
  /**
   * Cell name (optional)
   */
  name?: string;

  /**
   * Cell description
   */
  description?: string;

  /**
   * Cell format (e.g., "currency", "percentage", "date")
   */
  format?: string;

  /**
   * Cell style
   */
  style?: CellStyle;

  /**
   * Data validation rules
   */
  validation?: ValidationRule;

  /**
   * Dependencies (other cells this cell depends on)
   */
  dependencies?: CellReference[];

  /**
   * Dependents (other cells that depend on this cell)
   */
  dependents?: CellReference[];

  /**
   * Custom properties
   */
    customProperties?: Record<string, unknown>;
}

/**
 * Cell style properties
 */
export interface CellStyle {
  /**
   * Background color
   */
  backgroundColor?: string;

  /**
   * Text color
   */
  color?: string;

  /**
   * Font family
   */
  fontFamily?: string;

  /**
   * Font size
   */
  fontSize?: number;

  /**
   * Font weight
   */
  fontWeight?: 'normal' | 'bold' | number;

  /**
   * Text alignment
   */
  alignment?: 'left' | 'center' | 'right';

  /**
   * Vertical alignment
   */
  verticalAlignment?: 'top' | 'middle' | 'bottom';

  /**
   * Border style
   */
  border?: BorderStyle;
}

/**
 * Border style
 */
export interface BorderStyle {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

/**
 * Validation rule for cell values
 */
export interface ValidationRule {
  /**
   * Validation type
   */
  type: 'number' | 'text' | 'date' | 'list' | 'custom' | 'formula';

  /**
   * Minimum value (for number validation)
   */
  min?: number;

  /**
   * Maximum value (for number validation)
   */
  max?: number;

  /**
   * Allowed values (for list validation)
   */
  allowedValues?: CellValue[];

  /**
   * Custom validation formula
   */
  formula?: string;

  /**
   * Error message
   */
  errorMessage?: string;

  /**
   * Show error message
   */
  showError?: boolean;
}

/**
 * Cell status
 */
export type CellStatus = 'idle' | 'processing' | 'error' | 'success' | 'warning';

// ============================================================================
// Sheet Types
// ============================================================================

/**
 * Sheet interface
 */
export interface Sheet {
  /**
   * Unique sheet identifier
   */
  id: string;

  /**
   * Sheet name
   */
  name: string;

  /**
   * Number of rows
   */
  rowCount: number;

  /**
   * Number of columns
   */
  columnCount: number;

  /**
   * Sheet metadata
   */
  metadata: SheetMetadata;

  /**
   * Creation timestamp
   */
  createdAt: number;

  /**
   * Last update timestamp
   */
  updatedAt: number;

  /**
   * Sheet permissions
   */
  permissions: SheetPermissions;

  /**
   * Version number
   */
  version: number;
}

/**
 * Sheet metadata
 */
export interface SheetMetadata {
  /**
   * Sheet description
   */
  description?: string;

  /**
   * Sheet author
   */
  author?: string;

  /**
   * Tags for categorization
   */
  tags?: string[];

  /**
   * Custom properties
   */
    customProperties?: Record<string, unknown>;
}

/**
 * Sheet permissions
 */
export interface SheetPermissions {
  /**
   * Owner user ID
   */
  owner: string;

  /**
   * Read permissions
   */
  read: string[];

  /**
   * Write permissions
   */
  write: string[];

  /**
   * Admin permissions
   */
  admin: string[];

  /**
   * Is public
   */
  public: boolean;
}

// ============================================================================
// Colony Types
// ============================================================================

/**
 * Colony configuration
 */
export interface ColonyConfig {
  /**
   * Colony name
   */
  name: string;

  /**
   * Maximum number of agents
   */
  maxAgents?: number;

  /**
   * Resource budget
   */
  resourceBudget?: ResourceBudget;

  /**
   * Enable distributed mode
   */
  distributed?: boolean;

  /**
   * Colony metadata
   */
  metadata?: ColonyMetadata;
}

/**
 * Resource budget for colony
 */
export interface ResourceBudget {
  /**
   * Total compute units
   */
  totalCompute?: number;

  /**
   * Total memory in MB
   */
  totalMemory?: number;

  /**
   * Total network bandwidth
   */
  totalNetwork?: number;
}

/**
 * Colony metadata
 */
export interface ColonyMetadata {
  /**
   * Colony description
   */
  description?: string;

  /**
   * Colony tags
   */
  tags?: string[];

  /**
   * Custom properties
   */
    customProperties?: Record<string, unknown>;
}

/**
 * Colony state
 */
export interface ColonyState {
  /**
   * Colony ID
   */
  id: string;

  /**
   * Colony name
   */
  name: string;

  /**
   * Gardener ID
   */
  gardenerId: string;

  /**
   * Total agents
   */
  totalAgents: number;

  /**
   * Active agents
   */
  activeAgents: number;

  /**
   * Shannon diversity index
   */
  shannonDiversity: number;

  /**
   * Creation timestamp
   */
  createdAt: number;

  /**
   * Last activity timestamp
   */
  lastActive: number;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /**
   * Agent category
   */
  category: 'ephemeral' | 'role' | 'core';

  /**
   * Agent type ID
   */
  typeId?: string;

  /**
   * Agent name
   */
  name?: string;

  /**
   * Agent goal
   */
  goal?: string;

  /**
   * Model family
   */
  modelFamily?: string;

  /**
   * Default parameters
   */
    defaultParams?: Record<string, unknown>;
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * API request interface
 */
export interface APIRequest {
  /**
   * Request ID (optional, auto-generated if not provided)
   */
  id?: string;

  /**
   * Request method
   */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  /**
   * Request path
   */
  path: string;

  /**
   * Request headers
   */
  headers?: Record<string, string>;

  /**
   * Request body
   */
  body?: unknown;

  /**
   * Query parameters
   */
  params?: Record<string, string>;

  /**
   * Request timeout
   */
  timeout?: number;
}

/**
 * API response interface
 */
export interface APIResponse<T = unknown> {
  /**
   * Response data
   */
  data: T;

  /**
   * Response status code
   */
  status: number;

  /**
   * Response status message
   */
  statusText: string;

  /**
   * Response headers
   */
  headers: Record<string, string>;

  /**
   * Request ID
   */
  requestId: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  /**
   * Data items
   */
  data: T[];

  /**
   * Current page
   */
  page: number;

  /**
   * Page size
   */
  pageSize: number;

  /**
   * Total items
   */
  total: number;

  /**
   * Total pages
   */
  totalPages: number;

  /**
   * Has next page
   */
  hasNext: boolean;

  /**
   * Has previous page
   */
  hasPrevious: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * SDK error codes
 */
export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'TIMEOUT_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * SDK error class
 */
export class POLLNSDKError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'POLLNSDKError';
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return this.code === 'NETWORK_ERROR' ||
           this.code === 'TIMEOUT_ERROR' ||
           this.code === 'SERVER_ERROR' ||
           this.statusCode === 503;
  }
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Event types for real-time updates
 */
export type EventType =
  | 'cell:created'
  | 'cell:updated'
  | 'cell:deleted'
  | 'cell:valueChanged'
  | 'cell:statusChanged'
  | 'sheet:created'
  | 'sheet:updated'
  | 'sheet:deleted'
  | 'colony:created'
  | 'colony:updated'
  | 'colony:deleted'
  | 'agent:spawned'
  | 'agent:despawned'
  | 'agent:activated'
  | 'agent:deactivated'
  | 'connection:opened'
  | 'connection:closed'
  | 'connection:error';

/**
 * Event payload
 */
export interface Event<T = unknown> {
  /**
   * Event type
   */
  type: EventType;

  /**
   * Event data
   */
  data: T;

  /**
   * Event timestamp
   */
  timestamp: number;

  /**
   * Event ID
   */
  id: string;

  /**
   * Source identifier
   */
  source?: string;
}

/**
 * Event handler type
 */
export type EventHandler<T = unknown> = (event: Event<T>) => void | Promise<void>;

/**
 * Event subscription
 */
export interface EventSubscription {
  /**
   * Event types to subscribe to
   */
  events: EventType[];

  /**
   * Filter criteria
   */
  filter?: EventFilter;

  /**
   * Handler function
   */
  handler: EventHandler;
}

/**
 * Event filter
 */
export interface EventFilter {
  /**
   * Filter by source
   */
  source?: string;

  /**
   * Filter by ID pattern
   */
  idPattern?: string;

  /**
   * Custom filter function
   */
    customFilter?: (event: Event) => boolean;
}

// ============================================================================
// WebSocket Types
// ============================================================================

/**
 * WebSocket connection state
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * WebSocket message
 */
export interface WSMessage {
  /**
   * Message type
   */
  type: string;

  /**
   * Message payload
   */
  payload: unknown;

  /**
   * Message ID
   */
  id: string;

  /**
   * Timestamp
   */
  timestamp: number;
}

/**
 * WebSocket configuration
 */
export interface WSConfig {
  /**
   * WebSocket endpoint URL
   */
  url: string;

  /**
   * Connection timeout
   */
  timeout?: number;

  /**
   * Reconnection attempts
   */
  reconnectAttempts?: number;

  /**
   * Reconnection delay
   */
  reconnectDelay?: number;

  /**
   * Ping interval
   */
  pingInterval?: number;

  /**
   * Ping timeout
   */
  pingTimeout?: number;

  /**
   * Authentication token
   */
  token?: string;
}

// ============================================================================
// Batch Operation Types
// ============================================================================

/**
 * Batch operation type
 */
export type BatchOperationType = 'create' | 'update' | 'delete';

/**
 * Batch operation
 */
export interface BatchOperation {
  /**
   * Operation type
   */
  type: BatchOperationType;

  /**
   * Cell reference
   */
  reference: CellReference;

  /**
   * Cell value (for create/update operations)
   */
  value?: CellValue;

  /**
   * Cell metadata
   */
  metadata?: CellMetadata;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  /**
   * Operation
   */
  operation: BatchOperation;

  /**
   * Success status
   */
  success: boolean;

  /**
   * Error (if failed)
   */
  error?: POLLNSDKError;

  /**
   * Result data
   */
  data?: BaseCell;
}

/**
 * Batch response
 */
export interface BatchResponse {
  /**
   * Operation results
   */
  results: BatchOperationResult[];

  /**
   * Total operations
   */
  total: number;

  /**
   * Successful operations
   */
  successful: number;

  /**
   * Failed operations
   */
  failed: number;

  /**
   * Execution time in milliseconds
   */
  executionTimeMs: number;
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * Cell query options
 */
export interface CellQuery {
  /**
   * Filter by cell type
   */
  type?: CellType;

  /**
   * Filter by status
   */
  status?: CellStatus;

  /**
   * Filter by value range
   */
  valueRange?: { min?: number; max?: number };

  /**
   * Filter by row range
   */
  rowRange?: { min: number; max: number };

  /**
   * Filter by column range
   */
  columnRange?: { min: number; max: number };

  /**
   * Search in formulas
   */
  searchFormula?: string;

  /**
   * Search in metadata
   */
  searchMetadata?: Record<string, unknown>;

  /**
   * Pagination options
   */
  pagination?: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

/**
 * Sheet query options
 */
export interface SheetQuery {
  /**
   * Search by name
   */
  name?: string;

  /**
   * Search by tags
   */
  tags?: string[];

  /**
   * Search by author
   */
  author?: string;

  /**
   * Pagination options
   */
  pagination?: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

// ============================================================================
// Export all types
// ============================================================================
export default {
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
};
