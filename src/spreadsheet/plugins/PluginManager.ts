/**
 * Plugin Manager
 *
 * Central management system for plugins including registry, lifecycle,
 * validation, dependency resolution, version management, and events.
 */

import {
  PluginManifest,
  PluginLoadOptions,
  PluginLoadStatus,
  PluginState,
  PluginValidationResult,
  PluginDependency,
  PluginEventType,
  PluginEvent,
  PermissionType,
} from './types';
import { PluginHost } from './PluginHost';
import { PluginValidator } from './PluginValidator';
import { PluginLoader } from './PluginLoader';
import { EventEmitter } from 'events';

// ============================================================================
// Plugin Registry
// ============================================================================

/**
 * Plugin registry entry
 */
interface PluginRegistryEntry {
  manifest: PluginManifest;
  location: string;
  installedAt: number;
  enabled: boolean;
  validation?: PluginValidationResult;
}

/**
 * Plugin registry
 */
class PluginRegistry extends EventEmitter {
  private plugins: Map<string, PluginRegistryEntry> = new Map();

  register(manifest: PluginManifest, location: string): void {
    const entry: PluginRegistryEntry = {
      manifest,
      location,
      installedAt: Date.now(),
      enabled: false,
    };

    this.plugins.set(manifest.id, entry);
    this.emit('plugin:registered', { pluginId: manifest.id, manifest });
  }

  unregister(pluginId: string): void {
    const entry = this.plugins.get(pluginId);
    if (entry) {
      this.plugins.delete(pluginId);
      this.emit('plugin:unregistered', { pluginId });
    }
  }

  get(pluginId: string): PluginRegistryEntry | undefined {
    return this.plugins.get(pluginId);
  }

  getAll(): PluginRegistryEntry[] {
    return Array.from(this.plugins.values());
  }

  getEnabled(): PluginRegistryEntry[] {
    return this.getAll().filter(entry => entry.enabled);
  }

  setEnabled(pluginId: string, enabled: boolean): void {
    const entry = this.plugins.get(pluginId);
    if (entry) {
      entry.enabled = enabled;
      this.emit('plugin:enabled_changed', { pluginId, enabled });
    }
  }

  setValidation(pluginId: string, validation: PluginValidationResult): void {
    const entry = this.plugins.get(pluginId);
    if (entry) {
      entry.validation = validation;
    }
  }

  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  clear(): void {
    this.plugins.clear();
  }
}

// ============================================================================
// Dependency Resolver
// ============================================================================

/**
 * Dependency resolution result
 */
interface DependencyResolution {
  loadOrder: string[];
  missing: PluginDependency[];
  conflicts: Array<{ pluginId: string; conflict: string }>;
  cycles: string[][];
}

/**
 * Dependency resolver
 */
class DependencyResolver {
  resolve(
    pluginId: string,
    registry: PluginRegistry,
    loadedPlugins: Set<string>
  ): DependencyResolution {
    const loadOrder: string[] = [];
    const missing: PluginDependency[] = [];
    const conflicts: Array<{ pluginId: string; conflict: string }> = [];
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (id: string, path: string[]): void => {
      // Check for cycles
      if (visiting.has(id)) {
        const cycleStart = path.indexOf(id);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart).concat(id));
        }
        return;
      }

      if (visited.has(id)) {
        return;
      }

      visiting.add(id);

      const entry = registry.get(id);
      if (!entry) {
        // Plugin not found in registry
        visiting.delete(id);
        return;
      }

      // Check dependencies
      const dependencies = entry.manifest.dependencies || [];
      for (const dep of dependencies) {
        if (!registry.has(dep.pluginId)) {
          missing.push(dep);
        } else {
          visit(dep.pluginId, [...path, id]);
        }
      }

      visiting.delete(id);
      visited.add(id);

      if (!loadedPlugins.has(id)) {
        loadOrder.push(id);
      }
    };

    visit(pluginId, []);

    return { loadOrder, missing, conflicts, cycles };
  }

  validateVersions(
    manifest: PluginManifest,
    registry: PluginRegistry
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const dependencies = manifest.dependencies || [];

    for (const dep of dependencies) {
      const entry = registry.get(dep.pluginId);
      if (!entry) continue;

      const installedVersion = entry.manifest.version;
      if (!this.satisfiesVersion(installedVersion, dep.version)) {
        errors.push(
          `Plugin ${dep.pluginId} version ${installedVersion} does not satisfy requirement ${dep.version}`
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private satisfiesVersion(version: string, range: string): boolean {
    // Simplified semver matching
    // In production, use a proper semver library
    if (range === '*') return true;
    if (range === version) return true;

    // Handle ^ and ~ prefixes
    if (range.startsWith('^')) {
      const rangeMajor = parseInt(range.split('.')[0].replace('^', ''), 10);
      const versionMajor = parseInt(version.split('.')[0], 10);
      return versionMajor === rangeMajor;
    }

    if (range.startsWith('~')) {
      const rangeMinor = range.replace('~', '');
      const versionMinor = version.split('.').slice(0, 2).join('.');
      return versionMinor === rangeMinor;
    }

    return false;
  }
}

// ============================================================================
// Version Manager
// ============================================================================

/**
 * Version manager
 */
class VersionManager {
  compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (parts1[i] < parts2[i]) return -1;
      if (parts1[i] > parts2[i]) return 1;
    }
    return 0;
  }

  isCompatible(
    pluginVersion: string,
    pollnVersion: string,
    manifest: PluginManifest
  ): boolean {
    const minVersion = manifest.minPollnVersion;
    const maxVersion = manifest.maxPollnVersion;

    if (minVersion && this.compareVersions(pollnVersion, minVersion) < 0) {
      return false;
    }

    if (maxVersion && this.compareVersions(pollnVersion, maxVersion) > 0) {
      return false;
    }

    return true;
  }

  getLatestCompatible(
    versions: string[],
    pollnVersion: string,
    manifest: PluginManifest
  ): string | undefined {
    const compatible = versions.filter(v =>
      this.isCompatible(v, pollnVersion, manifest)
    );

    if (compatible.length === 0) return undefined;

    return compatible.sort((a, b) => this.compareVersions(b, a))[0];
  }
}

// ============================================================================
// Permission Manager
// ============================================================================

/**
 * Permission manager
 */
class PermissionManager extends EventEmitter {
  private grantedPermissions: Map<string, Set<PermissionType>> = new Map();
  private deniedPermissions: Map<string, Set<PermissionType>> = new Map();

  async requestPermission(
    pluginId: string,
    permission: PermissionType
  ): Promise<boolean> {
    // Check if already granted
    const granted = this.grantedPermissions.get(pluginId);
    if (granted?.has(permission)) {
      return true;
    }

    // Check if already denied
    const denied = this.deniedPermissions.get(pluginId);
    if (denied?.has(permission)) {
      return false;
    }

    // Emit permission request event
    this.emit('permission:request', { pluginId, permission });

    // In production, show dialog to user
    // For now, auto-grant for testing
    this.grantPermission(pluginId, permission);
    return true;
  }

  grantPermission(pluginId: string, permission: PermissionType): void {
    if (!this.grantedPermissions.has(pluginId)) {
      this.grantedPermissions.set(pluginId, new Set());
    }
    this.grantedPermissions.get(pluginId)!.add(permission);

    // Remove from denied if present
    const denied = this.deniedPermissions.get(pluginId);
    if (denied?.has(permission)) {
      denied.delete(permission);
    }

    this.emit('permission:granted', { pluginId, permission });
  }

  denyPermission(pluginId: string, permission: PermissionType): void {
    if (!this.deniedPermissions.has(pluginId)) {
      this.deniedPermissions.set(pluginId, new Set());
    }
    this.deniedPermissions.get(pluginId)!.add(permission);

    // Remove from granted if present
    const granted = this.grantedPermissions.get(pluginId);
    if (granted?.has(permission)) {
      granted.delete(permission);
    }

    this.emit('permission:denied', { pluginId, permission });
  }

  hasPermission(pluginId: string, permission: PermissionType): boolean {
    const granted = this.grantedPermissions.get(pluginId);
    return granted?.has(permission) || false;
  }

  getGrantedPermissions(pluginId: string): PermissionType[] {
    const granted = this.grantedPermissions.get(pluginId);
    return granted ? Array.from(granted) : [];
  }

  revokeAll(pluginId: string): void {
    this.grantedPermissions.delete(pluginId);
    this.deniedPermissions.delete(pluginId);
    this.emit('permission:revoked', { pluginId });
  }
}

// ============================================================================
// Plugin Manager
// ============================================================================

/**
 * Plugin Manager - central management system
 */
export class PluginManager extends EventEmitter {
  private registry: PluginRegistry;
  private host: PluginHost;
  private validator: PluginValidator;
  private loader: PluginLoader;
  private dependencyResolver: DependencyResolver;
  private versionManager: VersionManager;
  private permissionManager: PermissionManager;
  private loadedPlugins: Set<string> = new Set();
  private pollnVersion: string;

  constructor(pollnVersion: string = '1.0.0') {
    super();
    this.pollnVersion = pollnVersion;
    this.registry = new PluginRegistry();
    this.host = new PluginHost();
    this.validator = new PluginValidator();
    this.loader = new PluginLoader();
    this.dependencyResolver = new DependencyResolver();
    this.versionManager = new VersionManager();
    this.permissionManager = new PermissionManager();

    // Forward host events
    this.host.on('plugin:loaded', (data) => this.emit('plugin:loaded', data));
    this.host.on('plugin:activated', (data) => this.emit('plugin:activated', data));
    this.host.on('plugin:deactivated', (data) => this.emit('plugin:deactivated', data));
    this.host.on('plugin:unloaded', (data) => this.emit('plugin:unloaded', data));

    // Forward registry events
    this.registry.on('plugin:registered', (data) => this.emit('plugin:registered', data));
    this.registry.on('plugin:unregistered', (data) => this.emit('plugin:unregistered', data));

    // Forward permission events
    this.permissionManager.on('permission:granted', (data) => this.emit('permission:granted', data));
    this.permissionManager.on('permission:denied', (data) => this.emit('permission:denied', data));
  }

  /**
   * Install plugin from location
   */
  async installPlugin(location: string, options: PluginLoadOptions = {}): Promise<string> {
    // Load plugin manifest
    const manifest = await this.loader.loadManifest(location);

    // Validate manifest
    const validation = this.validator.validateManifest(manifest);
    if (!validation.valid) {
      throw new Error(`Plugin validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check compatibility
    const compatibility = this.validator.validateCompatibility(manifest, this.pollnVersion);
    if (!compatibility.compatible) {
      throw new Error(`Plugin incompatible: ${compatibility.reason}`);
    }

    // Check if already installed
    if (this.registry.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} is already installed`);
    }

    // Register plugin
    this.registry.register(manifest, location);
    this.registry.setValidation(manifest.id, validation);

    return manifest.id;
  }

  /**
   * Uninstall plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    // Unload if loaded
    if (this.loadedPlugins.has(pluginId)) {
      await this.unloadPlugin(pluginId);
    }

    // Unregister
    this.registry.unregister(pluginId);
    this.permissionManager.revokeAll(pluginId);
  }

  /**
   * Load plugin
   */
  async loadPlugin(pluginId: string, options: PluginLoadOptions = {}): Promise<void> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin ${pluginId} is not installed`);
    }

    // Resolve dependencies
    const resolution = this.dependencyResolver.resolve(pluginId, this.registry, this.loadedPlugins);

    if (resolution.missing.length > 0) {
      throw new Error(`Missing dependencies: ${resolution.missing.map(d => d.pluginId).join(', ')}`);
    }

    if (resolution.cycles.length > 0) {
      throw new Error(`Circular dependencies detected: ${resolution.cycles.map(c => c.join(' -> ')).join(', ')}`);
    }

    // Validate versions
    const versionValidation = this.dependencyResolver.validateVersions(entry.manifest, this.registry);
    if (!versionValidation.valid) {
      throw new Error(`Version conflicts: ${versionValidation.errors.join(', ')}`);
    }

    // Load dependencies first
    for (const depId of resolution.loadOrder) {
      if (depId === pluginId) continue;
      if (!this.loadedPlugins.has(depId)) {
        await this.loadPlugin(depId, options);
      }
    }

    // Load plugin code
    const pluginCode = await this.loader.loadPlugin(entry.location);

    // Validate plugin with security scan
    const validation = await this.validator.validatePlugin(entry.manifest, pluginCode);
    if (options.validationMode === 'strict' && !validation.valid) {
      throw new Error(`Plugin validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check security scan
    if (validation.securityResults?.riskLevel === 'critical') {
      throw new Error('Plugin has critical security issues');
    }

    // Load plugin in host
    await this.host.loadPlugin(entry.manifest, pluginCode, options);

    // Grant permissions
    for (const permission of entry.manifest.permissions) {
      const granted = await this.permissionManager.requestPermission(pluginId, permission.type);
      if (!granted && permission.type !== PermissionType.NOTIFICATIONS) {
        // Notifications are optional, others are required
        throw new Error(`Permission ${permission.type} was denied`);
      }
    }

    // Activate plugin
    await this.host.activatePlugin(pluginId);

    // Mark as loaded
    this.loadedPlugins.add(pluginId);
    this.registry.setEnabled(pluginId, true);

    this.emit(PluginEventType.PLUGIN_ACTIVE, { pluginId });
  }

  /**
   * Unload plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    // Deactivate plugin
    await this.host.deactivatePlugin(pluginId);

    // Unload plugin
    await this.host.unloadPlugin(pluginId);

    // Remove from loaded set
    this.loadedPlugins.delete(pluginId);
    this.registry.setEnabled(pluginId, false);

    this.emit(PluginEventType.PLUGIN_INACTIVE, { pluginId });
  }

  /**
   * Reload plugin
   */
  async reloadPlugin(pluginId: string): Promise<void> {
    const wasLoaded = this.loadedPlugins.has(pluginId);

    if (wasLoaded) {
      await this.unloadPlugin(pluginId);
    }

    await this.loadPlugin(pluginId);
  }

  /**
   * Get plugin status
   */
  getPluginStatus(pluginId: string): PluginLoadStatus | undefined {
    return this.host.getPluginState(pluginId);
  }

  /**
   * List all plugins
   */
  listPlugins(): PluginRegistryEntry[] {
    return this.registry.getAll();
  }

  /**
   * List loaded plugins
   */
  listLoadedPlugins(): PluginRegistryEntry[] {
    return this.registry.getEnabled();
  }

  /**
   * Get plugin manifest
   */
  getPluginManifest(pluginId: string): PluginManifest | undefined {
    return this.registry.get(pluginId)?.manifest;
  }

  /**
   * Get plugin validation result
   */
  getPluginValidation(pluginId: string): PluginValidationResult | undefined {
    return this.registry.get(pluginId)?.validation;
  }

  /**
   * Grant permission to plugin
   */
  grantPermission(pluginId: string, permission: PermissionType): void {
    this.permissionManager.grantPermission(pluginId, permission);
  }

  /**
   * Deny permission to plugin
   */
  denyPermission(pluginId: string, permission: PermissionType): void {
    this.permissionManager.denyPermission(pluginId, permission);
  }

  /**
   * Check if plugin has permission
   */
  hasPermission(pluginId: string, permission: PermissionType): boolean {
    return this.permissionManager.hasPermission(pluginId, permission);
  }

  /**
   * Get granted permissions for plugin
   */
  getGrantedPermissions(pluginId: string): PermissionType[] {
    return this.permissionManager.getGrantedPermissions(pluginId);
  }

  /**
   * Shutdown all plugins
   */
  async shutdown(): Promise<void> {
    const loaded = Array.from(this.loadedPlugins);
    for (const pluginId of loaded) {
      try {
        await this.unloadPlugin(pluginId);
      } catch (error) {
        console.error(`Error unloading plugin ${pluginId}:`, error);
      }
    }
  }

  /**
   * Get registry
   */
  getRegistry(): PluginRegistry {
    return this.registry;
  }

  /**
   * Get host
   */
  getHost(): PluginHost {
    return this.host;
  }

  /**
   * Get permission manager
   */
  getPermissionManager(): PermissionManager {
    return this.permissionManager;
  }
}

// ============================================================================
// Exports
// ============================================================================

export { PluginRegistry, DependencyResolver, VersionManager, PermissionManager };
