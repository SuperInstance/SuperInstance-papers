/**
 * Plugin Host
 *
 * Sandbox environment for plugins with API exposure, resource limits,
 * security context, and communication bridge.
 */

import {
  PluginManifest,
  PluginContext,
  PluginLoadOptions,
  ResourceLimits,
  PluginPermission,
  PermissionType,
  PluginState,
  PluginLoadStatus,
  PluginAPI,
  EventHandler,
} from './types';
import { createPluginContext, ExtensionPointRegistry, type PluginBridge } from './PluginAPI';
import { EventEmitter } from 'events';

// ============================================================================
// WebAssembly Sandbox
// ============================================================================

/**
 * WebAssembly sandbox for plugin isolation
 */
class WASMSandbox {
  private memory?: WebAssembly.Memory;
  private instance?: WebAssembly.Instance;
  private readonly maxMemoryBytes: number;

  constructor(maxMemoryBytes: number = 16 * 1024 * 1024) { // 16MB default
    this.maxMemoryBytes = maxMemoryBytes;
  }

  async initialize(wasmModule: ArrayBuffer): Promise<void> {
    // Create memory with limits
    this.memory = new WebAssembly.Memory({
      initial: 256, // 256 pages = 16MB
      maximum: Math.floor(this.maxMemoryBytes / (64 * 1024)), // 64KB per page
    });

    // Instantiate WebAssembly module
    const module = await WebAssembly.compile(wasmModule);
    this.instance = await WebAssembly.instantiate(module, {
      env: {
        memory: this.memory,
        // Host functions exposed to plugin
        log: (messagePtr: number, length: number) => {
          // Implementation for logging
        },
        // Add more host functions as needed
      },
    });
  }

  getExports(): Record<string, unknown> | undefined {
    return this.instance?.exports;
  }

  getMemoryUsage(): number {
    return this.memory?.buffer.byteLength || 0;
  }

  terminate(): void {
    this.instance = undefined;
    this.memory = undefined;
  }
}

// ============================================================================
// Resource Limiter
// ============================================================================

/**
 * Resource limiter for plugin execution
 */
class ResourceLimiter {
  private startTime: number = 0;
  private cpuTimeMs: number = 0;
  private networkRequests: number = 0;
  private lastRequestTime: number = 0;

  constructor(private readonly limits: ResourceLimits) {}

  startExecution(): void {
    this.startTime = Date.now();
  }

  checkExecutionLimits(): void {
    if (this.limits.maxExecutionTime) {
      const elapsed = Date.now() - this.startTime;
      if (elapsed > this.limits.maxExecutionTime) {
        throw new Error('Plugin execution time limit exceeded');
      }
    }

    if (this.limits.maxCpuPercent) {
      // CPU percentage tracking would require more sophisticated monitoring
      // This is a simplified version
    }
  }

  recordNetworkRequest(): void {
    if (this.limits.maxNetworkRequestsPerSecond) {
      const now = Date.now();
      if (now - this.lastRequestTime < 1000) {
        this.networkRequests++;
        if (this.networkRequests > this.limits.maxNetworkRequestsPerSecond) {
          throw new Error('Plugin network request rate limit exceeded');
        }
      } else {
        this.networkRequests = 1;
        this.lastRequestTime = now;
      }
    }
  }

  getResourceUsage(): { memoryBytes: number; cpuTimeMs: number; networkRequests: number } {
    return {
      memoryBytes: 0, // Would be tracked by WASM sandbox
      cpuTimeMs: this.cpuTimeMs,
      networkRequests: this.networkRequests,
    };
  }
}

// ============================================================================
// Plugin Bridge Implementation
// ============================================================================

/**
 * Plugin bridge implementation for host-plugin communication
 */
class HostPluginBridge implements PluginBridge {
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private messageId: number = 0;
  private pendingMessages: Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }> = new Map();

  constructor(
    private readonly pluginHost: PluginHost,
    private readonly pluginId: string
  ) {}

  async invoke(method: string, params: Record<string, unknown>): Promise<unknown> {
    // Check resource limits before invoking
    this.pluginHost.checkResourceLimits();

    // Generate message ID
    const messageId = this.messageId++;

    // Create promise for response
    const promise = new Promise((resolve, reject) => {
      this.pendingMessages.set(messageId, { resolve, reject });
    });

    // Send message to plugin
    this.pluginHost.sendMessageToPlugin(this.pluginId, {
      type: 'invoke',
      messageId,
      method,
      params,
    });

    // Wait for response
    return promise;
  }

  invokeSync(method: string, params: Record<string, unknown>): unknown {
    // Check resource limits
    this.pluginHost.checkResourceLimits();

    // Synchronous invocation (only for safe operations)
    return this.pluginHost.handleSyncMessage(this.pluginId, method, params);
  }

  subscribe(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  unsubscribe(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  handlePluginMessage(message: { type: string; [key: string]: unknown }): void {
    if (message.type === 'response') {
      const { messageId, result, error } = message as { messageId: number; result?: unknown; error?: string };
      const pending = this.pendingMessages.get(messageId);
      if (pending) {
        this.pendingMessages.delete(messageId);
        if (error) {
          pending.reject(new Error(error));
        } else {
          pending.resolve(result);
        }
      }
    } else if (message.type === 'event') {
      const { event, data } = message as { event: string; data: unknown };
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error('Error in event handler:', error);
          }
        });
      }
    }
  }
}

// ============================================================================
// Security Context
// ============================================================================

/**
 * Plugin security context
 */
class PluginSecurityContext {
  private grantedPermissions: Set<PermissionType> = new Set();
  private permissionRequests: Map<PermissionType, Promise<boolean>> = new Map();

  constructor(
    private readonly pluginHost: PluginHost,
    private readonly pluginId: string
  ) {}

  setPermissions(permissions: PluginPermission[]): void {
    this.grantedPermissions = new Set(permissions.map(p => p.type));
  }

  hasPermission(permission: PermissionType): boolean {
    return this.grantedPermissions.has(permission);
  }

  async requestPermission(permission: PermissionType): Promise<boolean> {
    // Check if already requested
    if (this.permissionRequests.has(permission)) {
      return this.permissionRequests.get(permission)!;
    }

    // Create request promise
    const requestPromise = new Promise<boolean>((resolve) => {
      // Emit permission request event
      this.pluginHost.emit('permission:request', {
        pluginId: this.pluginId,
        permission,
        onGrant: () => resolve(true),
        onDeny: () => resolve(false),
      });
    });

    this.permissionRequests.set(permission, requestPromise);
    const result = await requestPromise;
    this.permissionRequests.delete(permission);

    if (result) {
      this.grantedPermissions.add(permission);
    }

    return result;
  }

  getPermissions(): PermissionType[] {
    return Array.from(this.grantedPermissions);
  }
}

// ============================================================================
// Plugin Host
// ============================================================================

/**
 * Plugin host - manages plugin lifecycle and sandbox
 */
export class PluginHost extends EventEmitter {
  private plugins: Map<string, PluginInstance> = new Map();
  private extensionRegistry: ExtensionPointRegistry = new ExtensionPointRegistry();
  private securityContexts: Map<string, PluginSecurityContext> = new Map();
  private bridges: Map<string, HostPluginBridge> = new Map();

  async loadPlugin(
    manifest: PluginManifest,
    pluginCode: string,
    options: PluginLoadOptions = {}
  ): Promise<string> {
    const pluginId = manifest.id;

    // Check if already loaded
    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is already loaded`);
    }

    // Create plugin instance
    const instance = new PluginInstance(
      manifest,
      pluginCode,
      options.resourceLimits || {}
    );

    try {
      // Initialize sandbox
      await instance.initialize();

      // Create security context
      const securityContext = new PluginSecurityContext(this, pluginId);
      securityContext.setPermissions(manifest.permissions);
      this.securityContexts.set(pluginId, securityContext);

      // Create bridge
      const bridge = new HostPluginBridge(this, pluginId);
      this.bridges.set(pluginId, bridge);

      // Create plugin context
      const context = createPluginContext(
        pluginId,
        manifest,
        securityContext.getPermissions(),
        bridge
      );

      // Load plugin
      await instance.load(context);

      // Store plugin
      this.plugins.set(pluginId, instance);

      // Emit loaded event
      this.emit('plugin:loaded', { pluginId, manifest });

      return pluginId;
    } catch (error) {
      // Cleanup on error
      instance.terminate();
      this.securityContexts.delete(pluginId);
      this.bridges.delete(pluginId);
      throw error;
    }
  }

  async activatePlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} is not loaded`);
    }

    const bridge = this.bridges.get(pluginId);
    if (!bridge) {
      throw new Error(`Bridge for plugin ${pluginId} not found`);
    }

    const securityContext = this.securityContexts.get(pluginId);
    if (!securityContext) {
      throw new Error(`Security context for plugin ${pluginId} not found`);
    }

    // Create context
    const context = createPluginContext(
      pluginId,
      instance.manifest,
      securityContext.getPermissions(),
      bridge
    );

    await instance.activate(context);
    this.emit('plugin:activated', { pluginId });
  }

  async deactivatePlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} is not loaded`);
    }

    await instance.deactivate();
    this.emit('plugin:deactivated', { pluginId });
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} is not loaded`);
    }

    await instance.deactivate();
    instance.terminate();

    this.plugins.delete(pluginId);
    this.securityContexts.delete(pluginId);
    this.bridges.delete(pluginId);

    this.emit('plugin:unloaded', { pluginId });
  }

  getPluginState(pluginId: string): PluginLoadStatus | undefined {
    const instance = this.plugins.get(pluginId);
    if (!instance) return undefined;

    return {
      pluginId,
      state: instance.state,
      version: instance.manifest.version,
      loadedAt: instance.loadedAt,
      error: instance.error,
      activeExtensions: instance.activeExtensions,
      resourceUsage: instance.getResourceUsage(),
    };
  }

  sendMessageToPlugin(pluginId: string, message: Record<string, unknown>): void {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} is not loaded`);
    }

    instance.handleHostMessage(message);
  }

  handleSyncMessage(pluginId: string, method: string, params: Record<string, unknown>): unknown {
    // Handle synchronous messages (config, etc.)
    if (method === 'config.get') {
      // Implementation for config get
      return undefined;
    } else if (method === 'config.getAll') {
      // Implementation for config get all
      return {};
    }
    throw new Error(`Unknown sync method: ${method}`);
  }

  checkResourceLimits(): void {
    // Check all plugins for resource limit violations
    for (const [pluginId, instance] of this.plugins) {
      const usage = instance.getResourceUsage();
      const limits = instance.resourceLimits;

      if (limits.maxMemoryBytes && usage.memoryBytes > limits.maxMemoryBytes) {
        throw new Error(`Plugin ${pluginId} memory limit exceeded`);
      }

      if (limits.maxExecutionTime && usage.cpuTimeMs > limits.maxExecutionTime) {
        throw new Error(`Plugin ${pluginId} execution time limit exceeded`);
      }
    }
  }

  getExtensionRegistry(): ExtensionPointRegistry {
    return this.extensionRegistry;
  }
}

// ============================================================================
// Plugin Instance
// ============================================================================

/**
 * Plugin instance - represents a loaded plugin
 */
class PluginInstance {
  state: PluginState = PluginState.UNLOADED;
  loadedAt?: number;
  error?: string;
  activeExtensions: string[] = [];

  private sandbox?: WASMSandbox;
  private pluginApi?: PluginAPI;
  private context?: PluginContext;

  constructor(
    public readonly manifest: PluginManifest,
    private readonly pluginCode: string,
    public readonly resourceLimits: ResourceLimits
  ) {}

  async initialize(): Promise<void> {
    this.state = PluginState.LOADING;

    // Initialize WASM sandbox
    this.sandbox = new WASMSandbox(this.resourceLimits.maxMemoryBytes);

    try {
      // For now, we'll use a simpler approach without actual WASM
      // In production, compile the plugin code to WASM
      // await this.sandbox.initialize(this.compileToWasm(this.pluginCode));

      this.state = PluginState.LOADED;
    } catch (error) {
      this.state = PluginState.ERROR;
      this.error = (error as Error).message;
      throw error;
    }
  }

  async load(context: PluginContext): Promise<void> {
    this.context = context;

    try {
      // Evaluate plugin code in sandbox
      // This is a simplified version - in production use proper sandboxing
      const pluginExports = this.evaluatePluginCode(this.pluginCode);

      // Create plugin API
      this.pluginApi = pluginExports as PluginAPI;

      this.state = PluginState.LOADED;
      this.loadedAt = Date.now();
    } catch (error) {
      this.state = PluginState.ERROR;
      this.error = (error as Error).message;
      throw error;
    }
  }

  async activate(context: PluginContext): Promise<void> {
    this.state = PluginState.ACTIVATING;

    try {
      // Call plugin activate hook
      if (this.pluginApi?.activate) {
        await this.pluginApi.activate(context);
      }

      // Register extensions
      if (this.pluginApi?.extensions) {
        for (const [extensionPoint, implementation] of Object.entries(this.pluginApi.extensions)) {
          const extensionId = `${this.manifest.id}.${extensionPoint}`;
          // Register with extension registry
          this.activeExtensions.push(extensionId);
        }
      }

      this.state = PluginState.ACTIVE;
    } catch (error) {
      this.state = PluginState.ERROR;
      this.error = (error as Error).message;
      throw error;
    }
  }

  async deactivate(): Promise<void> {
    this.state = PluginState.DEACTIVATING;

    try {
      // Call plugin deactivate hook
      if (this.pluginApi?.deactivate) {
        await this.pluginApi.deactivate();
      }

      this.state = PluginState.INACTIVE;
    } catch (error) {
      this.state = PluginState.ERROR;
      this.error = (error as Error).message;
      throw error;
    }
  }

  terminate(): void {
    this.sandbox?.terminate();
    this.state = PluginState.UNLOADED;
    this.activeExtensions = [];
  }

  handleHostMessage(message: Record<string, unknown>): void {
    // Handle messages from host
    // In production, this would communicate with the sandboxed plugin
  }

  getResourceUsage(): { memoryBytes: number; cpuTimeMs: number; networkRequests: number } {
    return {
      memoryBytes: this.sandbox?.getMemoryUsage() || 0,
      cpuTimeMs: 0,
      networkRequests: 0,
    };
  }

  private evaluatePluginCode(code: string): unknown {
    // This is a simplified version - in production use proper sandboxing
    // For now, just eval in a function (not secure!)
    try {
      // tslint:disable-next-line:no-eval
      return eval(`(${code})`);
    } catch (error) {
      throw new Error(`Failed to evaluate plugin code: ${(error as Error).message}`);
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export { WASMSandbox, ResourceLimiter, HostPluginBridge, PluginSecurityContext, PluginInstance };
