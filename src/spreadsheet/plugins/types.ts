/**
 * Plugin System Type Definitions
 *
 * Comprehensive type system for the POLLN plugin architecture including
 * manifest types, API interfaces, event types, and extension points.
 */

// ============================================================================
// Plugin Manifest Types
// ============================================================================

/**
 * Plugin manifest - metadata and configuration for a plugin
 */
export interface PluginManifest {
  // Identity
  id: string;
  name: string;
  version: string;
  description: string;

  // Author information
  author: {
    name: string;
    email?: string;
    url?: string;
  };

  // License
  license: string;

  // Polln compatibility
  pollnVersion: string;
  minPollnVersion?: string;
  maxPollnVersion?: string;

  // Entry point
  main: string;

  // Extension points
  extensions: PluginExtension[];

  // Permissions requested
  permissions: PluginPermission[];

  // Dependencies
  dependencies?: PluginDependency[];

  // Optional: API version required
  apiVersion?: string;

  // Optional: Code signing verification
  signature?: PluginSignature;

  // Optional: Icon (base64 or URL)
  icon?: string;

  // Optional: Homepage
  homepage?: string;

  // Optional: Repository
  repository?: {
    type: string;
    url: string;
  };

  // Optional: Keywords for discoverability
  keywords?: string[];

  // Optional: Categories
  category?: PluginCategory;
}

/**
 * Plugin categories for organization
 */
export enum PluginCategory {
  DATA_SOURCE = 'data_source',
  CELL_TYPE = 'cell_type',
  ANALYSIS = 'analysis',
  VISUALIZATION = 'visualization',
  INTEGRATION = 'integration',
  AUTOMATION = 'automation',
  THEME = 'theme',
  UTILITY = 'utility',
}

/**
 * Plugin extension point definition
 */
export interface PluginExtension {
  // Extension point type
  type: ExtensionPointType;

  // Extension identifier (unique within plugin)
  id: string;

  // Display name
  name: string;

  // Description
  description?: string;

  // Configuration schema (JSON Schema)
  configSchema?: Record<string, unknown>;

  // Optional: Priority (higher = loaded first)
  priority?: number;

  // Optional: Conditions for activation
  activationConditions?: ActivationCondition[];
}

/**
 * Available extension point types
 */
export enum ExtensionPointType {
  // Cell types
  CELL_TYPE = 'cell_type',

  // Data sources
  DATA_SOURCE = 'data_source',

  // UI components
  TOOLBAR_BUTTON = 'toolbar_button',
  MENU_ITEM = 'menu_item',
  SIDEBAR_PANEL = 'sidebar_panel',
  CELL_RENDERER = 'cell_renderer',

  // Analysis functions
  ANALYSIS_FUNCTION = 'analysis_function',

  // Event handlers
  EVENT_HANDLER = 'event_handler',

  // Middleware
  CELL_MIDDLEWARE = 'cell_middleware',
  DATA_MIDDLEWARE = 'data_middleware',

  // Themes
  THEME = 'theme',

  // Custom commands
  COMMAND = 'command',
}

/**
 * Activation condition for extensions
 */
export interface ActivationCondition {
  type: 'cell_type' | 'data_type' | 'user_role' | 'custom';
  operator: 'equals' | 'contains' | 'matches' | 'custom';
  value: unknown;
  customCheck?: string; // JavaScript expression for custom checks
}

/**
 * Plugin permissions requested
 */
export interface PluginPermission {
  // Permission type
  type: PermissionType;

  // Scope (e.g., specific cells, data sources)
  scope?: string[];

  // Reason for permission (user-facing)
  reason?: string;

  // Optional: Constraints
  constraints?: PermissionConstraint;
}

/**
 * Available permission types
 */
export enum PermissionType {
  // Cell operations
  READ_CELLS = 'read_cells',
  WRITE_CELLS = 'write_cells',
  DELETE_CELLS = 'delete_cells',

  // Data access
  READ_DATA = 'read_data',
  WRITE_DATA = 'write_data',

  // Network access
  NETWORK_ACCESS = 'network_access',

  // File system access
  FILE_READ = 'file_read',
  FILE_WRITE = 'file_write',

  // System access
  SYSTEM_INFO = 'system_info',

  // UI access
  UI_CUSTOMIZATION = 'ui_customization',

  // Storage access
  STORAGE_ACCESS = 'storage_access',

  // Clipboard access
  CLIPBOARD_READ = 'clipboard_read',
  CLIPBOARD_WRITE = 'clipboard_write',

  // Notification access
  NOTIFICATIONS = 'notifications',
}

/**
 * Permission constraints
 */
export interface PermissionConstraint {
  // Rate limiting (requests per second)
  rateLimit?: number;

  // Data size limits (in bytes)
  maxDataSize?: number;

  // Time limits (in milliseconds)
  maxExecutionTime?: number;

  // Memory limits (in bytes)
  maxMemoryUsage?: number;

  // Allowed domains (for network access)
  allowedDomains?: string[];

  // Allowed file paths (for file access)
  allowedPaths?: string[];
}

/**
 * Plugin dependency
 */
export interface PluginDependency {
  // Plugin ID
  pluginId: string;

  // Version range (semver)
  version: string;

  // Optional: Whether this is required (true) or optional (false)
  required?: boolean;
}

/**
 * Plugin signature for code signing verification
 */
export interface PluginSignature {
  // Signature algorithm
  algorithm: 'RS256' | 'ES256' | 'HS256';

  // Signature value
  value: string;

  // Certificate URL
  certificateUrl?: string;

  // Signer information
  signer: {
    name: string;
    email?: string;
    organization?: string;
  };

  // Timestamp
  timestamp: number;
}

// ============================================================================
// Plugin State Types
// ============================================================================

/**
 * Plugin lifecycle state
 */
export enum PluginState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  ACTIVATING = 'activating',
  ACTIVE = 'active',
  DEACTIVATING = 'deactivating',
  INACTIVE = 'inactive',
  UNLOADING = 'unloading',
  ERROR = 'error',
}

/**
 * Plugin load status
 */
export interface PluginLoadStatus {
  // Plugin ID
  pluginId: string;

  // Current state
  state: PluginState;

  // Version
  version: string;

  // Load timestamp
  loadedAt?: number;

  // Error message (if in error state)
  error?: string;

  // Active extensions
  activeExtensions: string[];

  // Resource usage
  resourceUsage?: {
    memoryBytes: number;
    cpuTimeMs: number;
    networkRequests: number;
  };
}

// ============================================================================
// API Interface Types
// ============================================================================

/**
 * Plugin context provided to plugins
 */
export interface PluginContext {
  // Plugin information
  plugin: {
    id: string;
    version: string;
    manifest: PluginManifest;
  };

  // API references
  api: {
    cells: CellAPI;
    ui: UIAPI;
    data: DataSourceAPI;
    events: EventAPI;
    storage: StorageAPI;
  };

  // Logger
  logger: PluginLogger;

  // Configuration
  config: PluginConfig;

  // Security context
  security: SecurityContext;
}

/**
 * Cell operations API
 */
export interface CellAPI {
  // Read operations
  getCell(cellId: string): Promise<CellData>;
  getCellsInRange(range: CellRange): Promise<CellData[]>;

  // Write operations
  setCellValue(cellId: string, value: unknown): Promise<void>;
  setCellFormula(cellId: string, formula: string): Promise<void>;

  // Cell creation
  createCell(position: CellPosition, type: string): Promise<string>;

  // Cell deletion
  deleteCell(cellId: string): Promise<void>;

  // Cell monitoring
  watchCell(cellId: string, callback: (cell: CellData) => void): () => void;

  // Cell queries
  queryCells(query: CellQuery): Promise<CellData[]>;
}

/**
 * UI extension API
 */
export interface UIAPI {
  // Register toolbar button
  registerToolbar(button: ToolbarButton): void;

  // Register menu item
  registerMenuItem(item: MenuItem): void;

  // Register sidebar panel
  registerSidebarPanel(panel: SidebarPanel): void;

  // Register cell renderer
  registerCellRenderer(renderer: CellRenderer): void;

  // Show notification
  showNotification(notification: Notification): void;

  // Show dialog
  showDialog(dialog: Dialog): Promise<DialogResult>;

  // Get UI theme
  getTheme(): UITheme;
}

/**
 * Data source API
 */
export interface DataSourceAPI {
  // Register data source
  registerDataSource(source: DataSource): void;

  // Query data source
  queryDataSource(sourceId: string, query: unknown): Promise<unknown>;

  // List data sources
  listDataSources(): DataSource[];

  // Unregister data source
  unregisterDataSource(sourceId: string): void;
}

/**
 * Event system API
 */
export interface EventAPI {
  // Subscribe to event
  on(event: string, handler: EventHandler): void;

  // Subscribe to event once
  once(event: string, handler: EventHandler): void;

  // Unsubscribe from event
  off(event: string, handler: EventHandler): void;

  // Emit event
  emit(event: string, data?: unknown): void;

  // List available events
  listEvents(): string[];
}

/**
 * Storage API
 */
export interface StorageAPI {
  // Get item
  get(key: string): Promise<unknown>;

  // Set item
  set(key: string, value: unknown): Promise<void>;

  // Delete item
  delete(key: string): Promise<void>;

  // List keys
  list(): Promise<string[]>;

  // Clear all
  clear(): Promise<void>;
}

/**
 * Plugin logger
 */
export interface PluginLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  // Get configuration value
  get<T>(key: string, defaultValue?: T): T;

  // Set configuration value
  set(key: string, value: unknown): void;

  // Watch for configuration changes
  watch(key: string, callback: (value: unknown) => void): () => void;

  // Get all configuration
  getAll(): Record<string, unknown>;
}

/**
 * Security context
 */
export interface SecurityContext {
  // Check permission
  hasPermission(permission: PermissionType): boolean;

  // Request permission
  requestPermission(permission: PermissionType): Promise<boolean>;

  // Get granted permissions
  getPermissions(): PermissionType[];

  // Execute with elevated privileges
  executeWithPrivileges<T>(callback: () => T): Promise<T>;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Plugin system events
 */
export enum PluginEventType {
  // Lifecycle events
  PLUGIN_LOADING = 'plugin:loading',
  PLUGIN_LOADED = 'plugin:loaded',
  PLUGIN_ACTIVATING = 'plugin:activating',
  PLUGIN_ACTIVE = 'plugin:active',
  PLUGIN_DEACTIVATING = 'plugin:deactivating',
  PLUGIN_INACTIVE = 'plugin:inactive',
  PLUGIN_UNLOADING = 'plugin:unloading',
  PLUGIN_ERROR = 'plugin:error',

  // Extension events
  EXTENSION_REGISTERED = 'extension:registered',
  EXTENSION_UNREGISTERED = 'extension:unregistered',

  // Permission events
  PERMISSION_REQUESTED = 'permission:requested',
  PERMISSION_GRANTED = 'permission:granted',
  PERMISSION_DENIED = 'permission:denied',
}

/**
 * Plugin event
 */
export interface PluginEvent {
  // Event type
  type: PluginEventType;

  // Plugin ID
  pluginId: string;

  // Event timestamp
  timestamp: number;

  // Event data
  data?: unknown;
}

/**
 * Event handler function
 */
export type EventHandler = (data: unknown) => void | Promise<void>;

// ============================================================================
// Extension Implementation Types
// ============================================================================

/**
 * Cell data structure
 */
export interface CellData {
  id: string;
  position: CellPosition;
  type: string;
  value: unknown;
  formula?: string;
  dependencies: string[];
}

/**
 * Cell range
 */
export interface CellRange {
  from: CellPosition;
  to: CellPosition;
  sheet?: string;
}

/**
 * Cell position
 */
export interface CellPosition {
  row: number;
  col: number;
  sheet?: string;
}

/**
 * Cell query
 */
export interface CellQuery {
  type?: string;
  range?: CellRange;
  filter?: (cell: CellData) => boolean;
}

/**
 * Toolbar button
 */
export interface ToolbarButton {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void | Promise<void>;
  position?: 'left' | 'right';
  order?: number;
}

/**
 * Menu item
 */
export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void | Promise<void>;
  submenu?: MenuItem[];
  order?: number;
}

/**
 * Sidebar panel
 */
export interface SidebarPanel {
  id: string;
  title: string;
  component: unknown; // React component or similar
  position?: 'left' | 'right';
  order?: number;
}

/**
 * Cell renderer
 */
export interface CellRenderer {
  cellType: string;
  render: (cell: CellData) => unknown; // React element or similar
}

/**
 * Notification
 */
export interface Notification {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}

/**
 * Dialog
 */
export interface Dialog {
  title: string;
  content: unknown; // React component or HTML
  buttons: DialogButton[];
  size?: 'small' | 'medium' | 'large';
}

/**
 * Dialog button
 */
export interface DialogButton {
  id: string;
  label: string;
  type?: 'primary' | 'secondary' | 'danger';
  onClick: () => void | Promise<void>;
}

/**
 * Dialog result
 */
export interface DialogResult {
  buttonId: string;
  data?: unknown;
}

/**
 * UI theme
 */
export interface UITheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    border: string;
  };
  fonts: {
    primary: string;
    monospace: string;
  };
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
}

/**
 * Data source
 */
export interface DataSource {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  query: (query: unknown) => Promise<unknown>;
}

// ============================================================================
// Plugin Loading Types
// ============================================================================

/**
 * Plugin load options
 */
export interface PluginLoadOptions {
  // Auto-activate after loading
  autoActivate?: boolean;

  // Allow loading dependencies
  loadDependencies?: boolean;

  // Validation mode
  validationMode?: 'strict' | 'lenient' | 'none';

  // Sandbox mode
  sandboxMode?: 'strict' | 'permissive' | 'none';

  // Resource limits
  resourceLimits?: ResourceLimits;
}

/**
 * Resource limits for plugins
 */
export interface ResourceLimits {
  // Maximum memory usage (in bytes)
  maxMemoryBytes?: number;

  // Maximum execution time (in milliseconds)
  maxExecutionTime?: number;

  // Maximum CPU usage percentage (0-100)
  maxCpuPercent?: number;

  // Maximum network requests per second
  maxNetworkRequestsPerSecond?: number;
}

/**
 * Plugin validation result
 */
export interface PluginValidationResult {
  // Whether validation passed
  valid: boolean;

  // Validation errors
  errors: ValidationError[];

  // Validation warnings
  warnings: ValidationWarning[];

  // Security scan results
  securityResults?: SecurityScanResult;
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning';
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

/**
 * Security scan result
 */
export interface SecurityScanResult {
  // Whether security scan passed
  passed: boolean;

  // Security issues found
  issues: SecurityIssue[];

  // Permission score (0-100)
  permissionScore: number;

  // Risk level
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Security issue
 */
export interface SecurityIssue {
  type: 'vulnerability' | 'suspicious_code' | 'excessive_permissions';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location?: string;
}

// ============================================================================
// Hot Reload Types
// ============================================================================

/**
 * Hot reload event
 */
export interface HotReloadEvent {
  pluginId: string;
  type: 'full' | 'partial';
  timestamp: number;
  changedFiles: string[];
}

/**
 * Hot reload options
 */
export interface HotReloadOptions {
  // Preserve state during reload
  preserveState?: boolean;

  // Reload dependencies
  reloadDependencies?: boolean;

  // Validate after reload
  validateAfterReload?: boolean;

  // Hot reload callback
  onReload?: (event: HotReloadEvent) => void | Promise<void>;
}
