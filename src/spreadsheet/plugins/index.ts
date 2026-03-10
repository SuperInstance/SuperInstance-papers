/**
 * Plugin System Exports
 *
 * Main entry point for the POLLN plugin system.
 * Exports all plugin system components and factory functions.
 */

// ============================================================================
// Types
// ============================================================================

export * from './types';

// ============================================================================
// Plugin Validator
// ============================================================================

export { PluginValidator } from './PluginValidator';

// ============================================================================
// Plugin API
// ============================================================================

export {
  createPluginContext,
  ExtensionPointRegistry,
  PluginAPI,
  CellAPIImpl,
  UIAPIImpl,
  DataSourceAPIImpl,
  EventAPIImpl,
  StorageAPIImpl,
  PluginLoggerImpl,
  PluginConfigImpl,
  SecurityContextImpl,
} from './PluginAPI';

export type { PluginBridge } from './PluginAPI';

// ============================================================================
// Plugin Host
// ============================================================================

export { PluginHost } from './PluginHost';

export {
  WASMSandbox,
  ResourceLimiter,
  HostPluginBridge,
  PluginSecurityContext,
  PluginInstance,
} from './PluginHost';

// ============================================================================
// Plugin Manager
// ============================================================================

export { PluginManager } from './PluginManager';

export {
  PluginRegistry,
  DependencyResolver,
  VersionManager,
  PermissionManager,
} from './PluginManager';

// ============================================================================
// Plugin Loader
// ============================================================================

export {
  PluginLoader,
  FileWatcher,
  ErrorRecoveryHandler,
  PluginLoadError,
  PluginValidationError,
  PluginSourceType,
} from './PluginLoader';

export type { PluginSource } from './PluginLoader';

// ============================================================================
// Factory Functions
// ============================================================================

import { PluginManager } from './PluginManager';
import { PluginLoadOptions } from './types';

/**
 * Create a new plugin manager instance
 *
 * @param pollnVersion - Current Polln version
 * @returns PluginManager instance
 *
 * @example
 * ```typescript
 * const manager = createPluginManager('1.0.0');
 * await manager.installPlugin('./my-plugin');
 * await manager.loadPlugin('my-plugin');
 * ```
 */
export function createPluginManager(pollnVersion: string = '1.0.0'): PluginManager {
  return new PluginManager(pollnVersion);
}

/**
 * Create plugin manager with default options
 *
 * @param pollnVersion - Current Polln version
 * @returns PluginManager instance with default configuration
 */
export function createDefaultPluginManager(pollnVersion: string = '1.0.0'): PluginManager {
  const manager = new PluginManager(pollnVersion);

  // Setup default event handlers
  manager.on('plugin:loaded', (data) => {
    console.log(`[Plugin] Loaded: ${data.pluginId}`);
  });

  manager.on('plugin:activated', (data) => {
    console.log(`[Plugin] Activated: ${data.pluginId}`);
  });

  manager.on('plugin:error', (data) => {
    console.error(`[Plugin] Error in ${data.pluginId}:`, data.error);
  });

  return manager;
}

/**
 * Default plugin load options
 */
export const defaultLoadOptions: PluginLoadOptions = {
  autoActivate: true,
  loadDependencies: true,
  validationMode: 'lenient',
  sandboxMode: 'permissive',
  resourceLimits: {
    maxMemoryBytes: 64 * 1024 * 1024, // 64MB
    maxExecutionTime: 5000, // 5 seconds
    maxCpuPercent: 50,
    maxNetworkRequestsPerSecond: 10,
  },
};

/**
 * Create plugin load options with defaults
 *
 * @param overrides - Options to override defaults
 * @returns PluginLoadOptions with defaults applied
 */
export function createLoadOptions(
  overrides: Partial<PluginLoadOptions> = {}
): PluginLoadOptions {
  return {
    ...defaultLoadOptions,
    ...overrides,
    resourceLimits: {
      ...defaultLoadOptions.resourceLimits,
      ...overrides.resourceLimits,
    },
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate plugin ID format
 *
 * Plugin IDs must be lowercase with hyphens only
 *
 * @param pluginId - Plugin ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidPluginId(pluginId: string): boolean {
  return /^[a-z0-9-]+$/.test(pluginId) &&
         !pluginId.startsWith('-') &&
         !pluginId.endsWith('-');
}

/**
 * Sanitize plugin ID
 *
 * Converts to lowercase and replaces invalid characters with hyphens
 *
 * @param pluginId - Plugin ID to sanitize
 * @returns Sanitized plugin ID
 */
export function sanitizePluginId(pluginId: string): string {
  return pluginId
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Parse plugin version
 *
 * @param version - Version string to parse
 * @returns Parsed version object
 */
export function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
} {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/);

  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
    build: match[5],
  };
}

/**
 * Compare two versions
 *
 * @param v1 - First version
 * @param v2 - Second version
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const p1 = parseVersion(v1);
  const p2 = parseVersion(v2);

  if (p1.major !== p2.major) {
    return p1.major < p2.major ? -1 : 1;
  }

  if (p1.minor !== p2.minor) {
    return p1.minor < p2.minor ? -1 : 1;
  }

  if (p1.patch !== p2.patch) {
    return p1.patch < p2.patch ? -1 : 1;
  }

  // Prerelease versions are less than release versions
  if (!p1.prerelease && p2.prerelease) return 1;
  if (p1.prerelease && !p2.prerelease) return -1;
  if (p1.prerelease && p2.prerelease) {
    return p1.prerelease < p2.prerelease ? -1 : p1.prerelease > p2.prerelease ? 1 : 0;
  }

  return 0;
}

/**
 * Check if version satisfies semantic version range
 *
 * @param version - Version to check
 * @param range - Semantic version range
 * @returns true if version satisfies range
 */
export function satisfiesVersion(version: string, range: string): boolean {
  if (range === '*') return true;
  if (range === version) return true;

  // Handle caret ranges (^1.2.3 => >=1.2.3 <2.0.0)
  if (range.startsWith('^')) {
    const minVersion = range.substring(1);
    const parsed = parseVersion(minVersion);
    const maxVersion = `${parsed.major + 1}.0.0`;

    return compareVersions(version, minVersion) >= 0 &&
           compareVersions(version, maxVersion) < 0;
  }

  // Handle tilde ranges (~1.2.3 => >=1.2.3 <1.3.0)
  if (range.startsWith('~')) {
    const minVersion = range.substring(1);
    const parsed = parseVersion(minVersion);
    const maxVersion = `${parsed.major}.${parsed.minor + 1}.0`;

    return compareVersions(version, minVersion) >= 0 &&
           compareVersions(version, maxVersion) < 0;
  }

  // Handle exact match
  return version === range;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Polln plugin manifest filename
 */
export const PLUGIN_MANIFEST_NAME = 'polln-plugin.json';

/**
 * Fallback manifest filename (package.json with polln field)
 */
export const PLUGIN_MANIFEST_FALLBACK = 'package.json';

/**
 * Plugin file extension
 */
export const PLUGIN_FILE_EXTENSION = '.js';

/**
 * Maximum plugin file size (100MB)
 */
export const MAX_PLUGIN_SIZE = 100 * 1024 * 1024;

/**
 * Default plugin directory
 */
export const DEFAULT_PLUGIN_DIR = './plugins';

/**
 * Node modules directory
 */
export const NODE_MODULES_DIR = './node_modules';

// ============================================================================
// Version
// ============================================================================

/**
 * Plugin system version
 */
export const PLUGIN_SYSTEM_VERSION = '1.0.0';

/**
 * API version
 */
export const API_VERSION = '1.0.0';

/**
 * Minimum Polln version
 */
export const MIN_POLLN_VERSION = '1.0.0';

/**
 * Maximum Polln version (for breaking changes)
 */
export const MAX_POLLN_VERSION = '2.0.0';
