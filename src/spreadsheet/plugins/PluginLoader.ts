/**
 * Plugin Loader
 *
 * Load plugins from npm packages, local paths, with hot module reload,
 * validation, and error recovery.
 */

import {
  PluginManifest,
  PluginLoadOptions,
  PluginValidationResult,
  HotReloadEvent,
  HotReloadOptions,
} from './types';
import { PluginValidator } from './PluginValidator';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { EventEmitter } from 'events';

// ============================================================================
// Plugin Source Types
// ============================================================================

/**
 * Plugin source type
 */
export enum PluginSourceType {
  NPM = 'npm',
  LOCAL = 'local',
  DEVELOPMENT = 'development',
}

/**
 * Plugin source
 */
export interface PluginSource {
  type: PluginSourceType;
  location: string;
  manifest: PluginManifest;
}

// ============================================================================
// File Watcher for Hot Reload
// ============================================================================

/**
 * File watcher for hot reload
 */
class FileWatcher extends EventEmitter {
  private watchers: Map<string, Set<string>> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  watch(pluginId: string, files: string[], interval: number = 1000): void {
    const initialStates = new Map<string, { mtime: number; size: number }>();

    // Capture initial states
    for (const file of files) {
      try {
        const stats = statSync(file);
        initialStates.set(file, { mtime: stats.mtimeMs, size: stats.size });
      } catch (error) {
        // File doesn't exist, will be created
      }
    }

    this.watchers.set(pluginId, new Set(files));

    // Poll for changes
    const intervalId = setInterval(() => {
      for (const file of files) {
        try {
          const stats = statSync(file);
          const initialState = initialStates.get(file);

          if (!initialState) {
            // New file
            initialStates.set(file, { mtime: stats.mtimeMs, size: stats.size });
            this.emit('file:created', { pluginId, file });
          } else if (stats.mtimeMs !== initialState.mtime || stats.size !== initialState.size) {
            // File changed
            initialStates.set(file, { mtime: stats.mtimeMs, size: stats.size });
            this.emit('file:changed', { pluginId, file });
          }
        } catch (error) {
          // File deleted
          if (initialStates.has(file)) {
            initialStates.delete(file);
            this.emit('file:deleted', { pluginId, file });
          }
        }
      }
    }, interval);

    this.intervals.set(pluginId, intervalId);
  }

  unwatch(pluginId: string): void {
    const intervalId = this.intervals.get(pluginId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(pluginId);
    }
    this.watchers.delete(pluginId);
  }

  unwatchAll(): void {
    for (const pluginId of this.intervals.keys()) {
      this.unwatch(pluginId);
    }
  }
}

// ============================================================================
// Plugin Loader
// ============================================================================

/**
 * Plugin Loader class
 */
export class PluginLoader extends EventEmitter {
  private validator: PluginValidator;
  private fileWatcher: FileWatcher;
  private loadedSources: Map<string, PluginSource> = new Map();

  constructor() {
    super();
    this.validator = new PluginValidator();
    this.fileWatcher = new FileWatcher();

    // Forward file watcher events
    this.fileWatcher.on('file:changed', (data) => this.handleFileChanged(data));
  }

  /**
   * Load plugin manifest from location
   */
  async loadManifest(location: string): Promise<PluginManifest> {
    const manifestPath = this.findManifestPath(location);
    if (!manifestPath) {
      throw new Error(`Plugin manifest not found at ${location}`);
    }

    const manifestContent = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // Validate manifest
    const validation = this.validator.validateManifest(manifest);
    if (!validation.valid) {
      throw new Error(`Invalid manifest: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    return manifest;
  }

  /**
   * Load plugin from location
   */
  async loadPlugin(location: string): Promise<string> {
    const source = await this.loadSource(location);
    this.loadedSources.set(source.manifest.id, source);

    // Start watching for changes if in development mode
    if (source.type === PluginSourceType.DEVELOPMENT) {
      const files = this.getPluginFiles(location);
      this.fileWatcher.watch(source.manifest.id, files);
    }

    return this.loadPluginCode(location);
  }

  /**
   * Load plugin source
   */
  async loadSource(location: string): Promise<PluginSource> {
    const manifest = await this.loadManifest(location);
    const type = this.determineSourceType(location);

    return {
      type,
      location,
      manifest,
    };
  }

  /**
   * Load plugin from npm package
   */
  async loadFromNpm(packageName: string): Promise<string> {
    // In production, this would use npm to install and load the package
    // For now, we'll just resolve from node_modules
    const location = this.resolveNpmPackage(packageName);
    return this.loadPlugin(location);
  }

  /**
   * Load plugin from local path
   */
  async loadFromLocal(path: string): Promise<string> {
    if (!existsSync(path)) {
      throw new Error(`Plugin path does not exist: ${path}`);
    }

    return this.loadPlugin(path);
  }

  /**
   * Enable hot reload for plugin
   */
  async enableHotReload(
    pluginId: string,
    options: HotReloadOptions = {}
  ): Promise<void> {
    const source = this.loadedSources.get(pluginId);
    if (!source) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    const files = this.getPluginFiles(source.location);
    this.fileWatcher.watch(pluginId, files, options);

    this.emit('hotreload:enabled', { pluginId, options });
  }

  /**
   * Disable hot reload for plugin
   */
  disableHotReload(pluginId: string): void {
    this.fileWatcher.unwatch(pluginId);
    this.emit('hotreload:disabled', { pluginId });
  }

  /**
   * Handle file changed event
   */
  private async handleFileChanged(data: { pluginId: string; file: string }): Promise<void> {
    const { pluginId, file } = data;

    this.emit('hotreload:triggered', { pluginId, file });

    const source = this.loadedSources.get(pluginId);
    if (!source) return;

    const changedFiles = this.getChangedFiles(source.location);

    const event: HotReloadEvent = {
      pluginId,
      type: 'partial',
      timestamp: Date.now(),
      changedFiles,
    };

    this.emit('hotreload:change', event);
  }

  /**
   * Get plugin files
   */
  private getPluginFiles(location: string): string[] {
    const files: string[] = [];

    // Recursively find all TypeScript and JavaScript files
    const scanDir = (dir: string): void => {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and .git
          if (entry.name !== 'node_modules' && entry.name !== '.git') {
            scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (ext === '.ts' || ext === '.js' || ext === '.json') {
            files.push(fullPath);
          }
        }
      }
    };

    scanDir(location);
    return files;
  }

  /**
   * Get changed files (using modification time)
   */
  private getChangedFiles(location: string, sinceMs: number = 5000): string[] {
    const files: string[] = [];
    const now = Date.now();

    const scanDir = (dir: string): void => {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git') {
            scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          const stats = statSync(fullPath);
          if (now - stats.mtimeMs < sinceMs) {
            files.push(fullPath);
          }
        }
      }
    };

    scanDir(location);
    return files;
  }

  /**
   * Find manifest path
   */
  private findManifestPath(location: string): string | null {
    const manifestNames = ['polln-plugin.json', 'package.json'];

    for (const name of manifestNames) {
      const path = join(location, name);
      if (existsSync(path)) {
        return path;
      }
    }

    // Check if location itself is a manifest file
    if (existsSync(location)) {
      const stats = statSync(location);
      if (stats.isFile()) {
        return location;
      }
    }

    return null;
  }

  /**
   * Determine source type
   */
  private determineSourceType(location: string): PluginSourceType {
    if (location.includes('node_modules')) {
      return PluginSourceType.NPM;
    }

    // Check if it's a development directory (has tsconfig, src, etc.)
    if (existsSync(join(location, 'tsconfig.json')) ||
        existsSync(join(location, 'src'))) {
      return PluginSourceType.DEVELOPMENT;
    }

    return PluginSourceType.LOCAL;
  }

  /**
   * Resolve npm package path
   */
  private resolveNpmPackage(packageName: string): string {
    // Try to resolve from node_modules
    const paths = [
      join(process.cwd(), 'node_modules', packageName),
      join(process.cwd(), '..', 'node_modules', packageName),
    ];

    for (const path of paths) {
      if (existsSync(path)) {
        return path;
      }
    }

    throw new Error(`NPM package not found: ${packageName}`);
  }

  /**
   * Load plugin code
   */
  private loadPluginCode(location: string): string {
    const manifestPath = this.findManifestPath(location);
    if (!manifestPath) {
      throw new Error(`Plugin manifest not found at ${location}`);
    }

    const manifestContent = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // Load main file
    const mainPath = join(dirname(manifestPath), manifest.main);
    if (!existsSync(mainPath)) {
      throw new Error(`Plugin main file not found: ${mainPath}`);
    }

    return readFileSync(mainPath, 'utf-8');
  }

  /**
   * Unload plugin
   */
  unloadPlugin(pluginId: string): void {
    this.fileWatcher.unwatch(pluginId);
    this.loadedSources.delete(pluginId);
  }

  /**
   * Get loaded sources
   */
  getLoadedSources(): Map<string, PluginSource> {
    return new Map(this.loadedSources);
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.fileWatcher.unwatchAll();
    this.loadedSources.clear();
  }
}

// ============================================================================
// Error Recovery
// ============================================================================

/**
 * Plugin load error
 */
export class PluginLoadError extends Error {
  constructor(
    message: string,
    public readonly pluginId: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PluginLoadError';
  }
}

/**
 * Plugin validation error
 */
export class PluginValidationError extends Error {
  constructor(
    message: string,
    public readonly validation: PluginValidationResult
  ) {
    super(message);
    this.name = 'PluginValidationError';
  }
}

/**
 * Error recovery handler
 */
export class ErrorRecoveryHandler {
  private recoveryAttempts: Map<string, number> = new Map();
  private readonly maxAttempts = 3;

  async handleError(
    pluginId: string,
    error: Error,
    recovery: () => Promise<void>
  ): Promise<boolean> {
    const attempts = this.recoveryAttempts.get(pluginId) || 0;

    if (attempts >= this.maxAttempts) {
      this.recoveryAttempts.delete(pluginId);
      return false;
    }

    this.recoveryAttempts.set(pluginId, attempts + 1);

    try {
      await recovery();
      this.recoveryAttempts.delete(pluginId);
      return true;
    } catch (recoveryError) {
      console.error(`Recovery attempt ${attempts + 1} failed for plugin ${pluginId}:`, recoveryError);
      return false;
    }
  }

  resetAttempts(pluginId: string): void {
    this.recoveryAttempts.delete(pluginId);
  }

  getAttempts(pluginId: string): number {
    return this.recoveryAttempts.get(pluginId) || 0;
  }
}

// ============================================================================
// Exports
// ============================================================================

export { FileWatcher, ErrorRecoveryHandler };
export type { PluginSource };
