/**
 * Plugin API
 *
 * Complete API surface exposed to plugins including cell operations,
 * UI extensions, data sources, events, and storage.
 */

import {
  PluginContext,
  CellAPI,
  UIAPI,
  DataSourceAPI,
  EventAPI,
  StorageAPI,
  PluginLogger,
  PluginConfig,
  SecurityContext,
  CellData,
  CellRange,
  CellPosition,
  CellQuery,
  ToolbarButton,
  MenuItem,
  SidebarPanel,
  CellRenderer,
  Notification,
  Dialog,
  DialogResult,
  UITheme,
  DataSource,
  EventHandler,
  PermissionType,
  PluginState,
} from './types';

// ============================================================================
// Cell Operations API Implementation
// ============================================================================

/**
 * Cell API implementation
 */
class CellAPIImpl implements CellAPI {
  constructor(
    private readonly bridge: PluginBridge,
    private readonly securityContext: SecurityContext
  ) {}

  async getCell(cellId: string): Promise<CellData> {
    this.checkPermission(PermissionType.READ_CELLS);
    return await this.bridge.invoke('cells.get', { cellId });
  }

  async getCellsInRange(range: CellRange): Promise<CellData[]> {
    this.checkPermission(PermissionType.READ_CELLS);
    return await this.bridge.invoke('cells.getRange', { range });
  }

  async setCellValue(cellId: string, value: unknown): Promise<void> {
    this.checkPermission(PermissionType.WRITE_CELLS);
    await this.bridge.invoke('cells.setValue', { cellId, value });
  }

  async setCellFormula(cellId: string, formula: string): Promise<void> {
    this.checkPermission(PermissionType.WRITE_CELLS);
    await this.bridge.invoke('cells.setFormula', { cellId, formula });
  }

  async createCell(position: CellPosition, type: string): Promise<string> {
    this.checkPermission(PermissionType.WRITE_CELLS);
    return await this.bridge.invoke('cells.create', { position, type });
  }

  async deleteCell(cellId: string): Promise<void> {
    this.checkPermission(PermissionType.DELETE_CELLS);
    await this.bridge.invoke('cells.delete', { cellId });
  }

  watchCell(cellId: string, callback: (cell: CellData) => void): () => void {
    this.checkPermission(PermissionType.READ_CELLS);
    return this.bridge.subscribe(`cells.${cellId}`, callback);
  }

  async queryCells(query: CellQuery): Promise<CellData[]> {
    this.checkPermission(PermissionType.READ_CELLS);
    return await this.bridge.invoke('cells.query', { query });
  }

  private checkPermission(permission: PermissionType): void {
    if (!this.securityContext.hasPermission(permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}

// ============================================================================
// UI Extension API Implementation
// ============================================================================

/**
 * UI API implementation
 */
class UIAPIImpl implements UIAPI {
  constructor(
    private readonly bridge: PluginBridge,
    private readonly securityContext: SecurityContext
  ) {}

  registerToolbar(button: ToolbarButton): void {
    this.checkPermission(PermissionType.UI_CUSTOMIZATION);
    this.bridge.invoke('ui.registerToolbar', { button });
  }

  registerMenuItem(item: MenuItem): void {
    this.checkPermission(PermissionType.UI_CUSTOMIZATION);
    this.bridge.invoke('ui.registerMenuItem', { item });
  }

  registerSidebarPanel(panel: SidebarPanel): void {
    this.checkPermission(PermissionType.UI_CUSTOMIZATION);
    this.bridge.invoke('ui.registerSidebarPanel', { panel });
  }

  registerCellRenderer(renderer: CellRenderer): void {
    this.checkPermission(PermissionType.UI_CUSTOMIZATION);
    this.bridge.invoke('ui.registerCellRenderer', { renderer });
  }

  showNotification(notification: Notification): void {
    this.bridge.invoke('ui.showNotification', { notification });
  }

  async showDialog(dialog: Dialog): Promise<DialogResult> {
    this.checkPermission(PermissionType.UI_CUSTOMIZATION);
    return await this.bridge.invoke('ui.showDialog', { dialog });
  }

  async getTheme(): Promise<UITheme> {
    return await this.bridge.invoke('ui.getTheme', {});
  }

  private checkPermission(permission: PermissionType): void {
    if (!this.securityContext.hasPermission(permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}

// ============================================================================
// Data Source API Implementation
// ============================================================================

/**
 * Data Source API implementation
 */
class DataSourceAPIImpl implements DataSourceAPI {
  constructor(
    private readonly bridge: PluginBridge,
    private readonly securityContext: SecurityContext
  ) {}

  registerDataSource(source: DataSource): void {
    this.checkPermission(PermissionType.WRITE_DATA);
    this.bridge.invoke('data.registerSource', { source });
  }

  async queryDataSource(sourceId: string, query: unknown): Promise<unknown> {
    this.checkPermission(PermissionType.READ_DATA);
    return await this.bridge.invoke('data.query', { sourceId, query });
  }

  async listDataSources(): Promise<DataSource[]> {
    this.checkPermission(PermissionType.READ_DATA);
    return await this.bridge.invoke('data.list', {});
  }

  unregisterDataSource(sourceId: string): void {
    this.checkPermission(PermissionType.WRITE_DATA);
    this.bridge.invoke('data.unregister', { sourceId });
  }

  private checkPermission(permission: PermissionType): void {
    if (!this.securityContext.hasPermission(permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}

// ============================================================================
// Event System API Implementation
// ============================================================================

/**
 * Event API implementation
 */
class EventAPIImpl implements EventAPI {
  constructor(private readonly bridge: PluginBridge) {}

  on(event: string, handler: EventHandler): void {
    this.bridge.subscribe(event, handler);
  }

  once(event: string, handler: EventHandler): void {
    const wrappedHandler: EventHandler = async (data: unknown) => {
      await handler(data);
      this.bridge.unsubscribe(event, wrappedHandler);
    };
    this.bridge.subscribe(event, wrappedHandler);
  }

  off(event: string, handler: EventHandler): void {
    this.bridge.unsubscribe(event, handler);
  }

  emit(event: string, data?: unknown): void {
    this.bridge.invoke('events.emit', { event, data });
  }

  async listEvents(): Promise<string[]> {
    return await this.bridge.invoke('events.list', {});
  }
}

// ============================================================================
// Storage API Implementation
// ============================================================================

/**
 * Storage API implementation
 */
class StorageAPIImpl implements StorageAPI {
  private readonly namespace: string;

  constructor(
    namespace: string,
    private readonly bridge: PluginBridge,
    private readonly securityContext: SecurityContext
  ) {
    this.namespace = `plugin:${namespace}`;
  }

  async get(key: string): Promise<unknown> {
    this.checkPermission(PermissionType.STORAGE_ACCESS);
    return await this.bridge.invoke('storage.get', {
      key: `${this.namespace}:${key}`,
    });
  }

  async set(key: string, value: unknown): Promise<void> {
    this.checkPermission(PermissionType.STORAGE_ACCESS);
    await this.bridge.invoke('storage.set', {
      key: `${this.namespace}:${key}`,
      value,
    });
  }

  async delete(key: string): Promise<void> {
    this.checkPermission(PermissionType.STORAGE_ACCESS);
    await this.bridge.invoke('storage.delete', {
      key: `${this.namespace}:${key}`,
    });
  }

  async list(): Promise<string[]> {
    this.checkPermission(PermissionType.STORAGE_ACCESS);
    const keys = await this.bridge.invoke('storage.list', {
      prefix: this.namespace,
    });
    return keys.map((k: string) => k.replace(`${this.namespace}:`, ''));
  }

  async clear(): Promise<void> {
    this.checkPermission(PermissionType.STORAGE_ACCESS);
    await this.bridge.invoke('storage.clear', {
      prefix: this.namespace,
    });
  }

  private checkPermission(permission: PermissionType): void {
    if (!this.securityContext.hasPermission(permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}

// ============================================================================
// Plugin Logger Implementation
// ============================================================================

/**
 * Plugin logger implementation
 */
class PluginLoggerImpl implements PluginLogger {
  constructor(
    private readonly pluginId: string,
    private readonly bridge: PluginBridge
  ) {}

  debug(message: string, ...args: unknown[]): void {
    this.bridge.invoke('log.debug', {
      pluginId: this.pluginId,
      message,
      args,
    });
  }

  info(message: string, ...args: unknown[]): void {
    this.bridge.invoke('log.info', {
      pluginId: this.pluginId,
      message,
      args,
    });
  }

  warn(message: string, ...args: unknown[]): void {
    this.bridge.invoke('log.warn', {
      pluginId: this.pluginId,
      message,
      args,
    });
  }

  error(message: string, ...args: unknown[]): void {
    this.bridge.invoke('log.error', {
      pluginId: this.pluginId,
      message,
      args,
    });
  }
}

// ============================================================================
// Plugin Configuration Implementation
// ============================================================================

/**
 * Plugin configuration implementation
 */
class PluginConfigImpl implements PluginConfig {
  private watchers: Map<string, Set<(value: unknown) => void>> = new Map();

  constructor(
    private readonly pluginId: string,
    private readonly bridge: PluginBridge
  ) {}

  get<T>(key: string, defaultValue?: T): T {
    return this.bridge.invokeSync('config.get', {
      pluginId: this.pluginId,
      key,
      defaultValue,
    }) as T;
  }

  set(key: string, value: unknown): void {
    this.bridge.invoke('config.set', {
      pluginId: this.pluginId,
      key,
      value,
    });

    // Notify watchers
    const watchers = this.watchers.get(key);
    if (watchers) {
      watchers.forEach(callback => callback(value));
    }
  }

  watch(key: string, callback: (value: unknown) => void): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }
    this.watchers.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      const watchers = this.watchers.get(key);
      if (watchers) {
        watchers.delete(callback);
      }
    };
  }

  getAll(): Record<string, unknown> {
    return this.bridge.invokeSync('config.getAll', {
      pluginId: this.pluginId,
    }) as Record<string, unknown>;
  }
}

// ============================================================================
// Security Context Implementation
// ============================================================================

/**
 * Security context implementation
 */
class SecurityContextImpl implements SecurityContext {
  constructor(
    private readonly pluginId: string,
    private readonly grantedPermissions: PermissionType[],
    private readonly bridge: PluginBridge
  ) {}

  hasPermission(permission: PermissionType): boolean {
    return this.grantedPermissions.includes(permission);
  }

  async requestPermission(permission: PermissionType): Promise<boolean> {
    const result = await this.bridge.invoke('security.requestPermission', {
      pluginId: this.pluginId,
      permission,
    });
    return result as boolean;
  }

  getPermissions(): PermissionType[] {
    return [...this.grantedPermissions];
  }

  async executeWithPrivileges<T>(callback: () => T): Promise<T> {
    // Request elevated privileges
    const granted = await this.bridge.invoke('security.elevate', {
      pluginId: this.pluginId,
    });

    if (!granted) {
      throw new Error('Elevated privileges not granted');
    }

    try {
      return await callback();
    } finally {
      // Release elevated privileges
      await this.bridge.invoke('security.revokeElevation', {
        pluginId: this.pluginId,
      });
    }
  }
}

// ============================================================================
// Plugin Bridge (Communication Channel)
// ============================================================================

/**
 * Plugin bridge for communication between plugin and host
 */
interface PluginBridge {
  invoke(method: string, params: Record<string, unknown>): Promise<unknown>;
  invokeSync(method: string, params: Record<string, unknown>): unknown;
  subscribe(event: string, handler: EventHandler): () => void;
  unsubscribe(event: string, handler: EventHandler): void;
}

// ============================================================================
// Plugin Context Factory
// ============================================================================

/**
 * Create plugin context
 */
export function createPluginContext(
  pluginId: string,
  manifest: unknown,
  grantedPermissions: PermissionType[],
  bridge: PluginBridge
): PluginContext {
  const securityContext = new SecurityContextImpl(
    pluginId,
    grantedPermissions,
    bridge
  );

  return {
    plugin: {
      id: pluginId,
      version: (manifest as any).version,
      manifest: manifest as any,
    },
    api: {
      cells: new CellAPIImpl(bridge, securityContext),
      ui: new UIAPIImpl(bridge, securityContext),
      data: new DataSourceAPIImpl(bridge, securityContext),
      events: new EventAPIImpl(bridge),
      storage: new StorageAPIImpl(pluginId, bridge, securityContext),
    },
    logger: new PluginLoggerImpl(pluginId, bridge),
    config: new PluginConfigImpl(pluginId, bridge),
    security: securityContext,
  };
}

// ============================================================================
// Extension Point Registry
// ============================================================================

/**
 * Extension point registry
 */
export class ExtensionPointRegistry {
  private extensions: Map<string, Map<string, unknown>> = new Map();

  register(extensionPoint: string, extensionId: string, implementation: unknown): void {
    if (!this.extensions.has(extensionPoint)) {
      this.extensions.set(extensionPoint, new Map());
    }
    this.extensions.get(extensionPoint)!.set(extensionId, implementation);
  }

  unregister(extensionPoint: string, extensionId: string): void {
    const point = this.extensions.get(extensionPoint);
    if (point) {
      point.delete(extensionId);
    }
  }

  get(extensionPoint: string, extensionId: string): unknown | undefined {
    const point = this.extensions.get(extensionPoint);
    return point?.get(extensionId);
  }

  list(extensionPoint: string): Map<string, unknown> {
    return this.extensions.get(extensionPoint) || new Map();
  }

  listAll(): Map<string, Map<string, unknown>> {
    return new Map(this.extensions);
  }
}

// ============================================================================
// Plugin API Surface
// ============================================================================

/**
 * Plugin API surface - what plugins actually receive
 */
export interface PluginAPI {
  // Lifecycle hooks
  activate?(context: PluginContext): Promise<void> | void;
  deactivate?(): Promise<void> | void;

  // Extension implementations
  extensions?: Record<string, unknown>;
}

// ============================================================================
// Export all API implementations
// ============================================================================

export {
  CellAPIImpl,
  UIAPIImpl,
  DataSourceAPIImpl,
  EventAPIImpl,
  StorageAPIImpl,
  PluginLoggerImpl,
  PluginConfigImpl,
  SecurityContextImpl,
};

export type { PluginBridge };
