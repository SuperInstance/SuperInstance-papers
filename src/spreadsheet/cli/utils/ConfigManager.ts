/**
 * Configuration Manager - POLLN Spreadsheet CLI Configuration
 *
 * Handles loading, saving, and validating CLI configuration.
 *
 * @module ConfigManager
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * POLLN Spreadsheet CLI Configuration
 */
export interface PollnSheetConfig {
  // Data directory
  dataDir?: string;

  // Server configuration
  server?: {
    host?: string;
    port?: number;
    workers?: number;
    cluster?: boolean;
  };

  // Spreadsheet defaults
  spreadsheets?: {
    defaultRows?: number;
    defaultCols?: number;
    defaultTemplate?: string;
    autoSave?: boolean;
    autoSaveInterval?: number;
  };

  // Cell configuration
  cells?: {
    maxHistory?: number;
    enableDependencies?: boolean;
    enableFormulas?: boolean;
  };

  // Colony configuration
  colonies?: {
    maxAgents?: number;
    defaultType?: 'analysis' | 'prediction' | 'optimization';
    spawnRate?: number;
    learningRate?: number;
  };

  // CLI preferences
  cli?: {
    defaultOutput?: 'table' | 'json' | 'csv';
    color?: boolean;
    verbose?: boolean;
    confirmDestructive?: boolean;
  };

  // Feature flags
  features?: {
    enableML?: boolean;
    enableCollaboration?: boolean;
    enableGPU?: boolean;
  };
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: PollnSheetConfig = {
  dataDir: path.join(os.homedir(), '.polln', 'sheets'),

  server: {
    host: 'localhost',
    port: 8080,
    workers: 4,
    cluster: false
  },

  spreadsheets: {
    defaultRows: 1000,
    defaultCols: 26,
    defaultTemplate: 'basic',
    autoSave: true,
    autoSaveInterval: 60000
  },

  cells: {
    maxHistory: 10,
    enableDependencies: true,
    enableFormulas: true
  },

  colonies: {
    maxAgents: 100,
    defaultType: 'analysis',
    spawnRate: 1.0,
    learningRate: 0.1
  },

  cli: {
    defaultOutput: 'table',
    color: true,
    verbose: false,
    confirmDestructive: true
  },

  features: {
    enableML: true,
    enableCollaboration: false,
    enableGPU: false
  }
};

/**
 * ConfigManager class
 *
 * Manages POLLN Spreadsheet CLI configuration.
 */
export class ConfigManager {
  private configPath: string;
  private config: PollnSheetConfig;

  constructor(customPath?: string) {
    if (customPath) {
      this.configPath = path.resolve(customPath);
    } else {
      // Check for project-specific config first
      const projectConfig = path.join(process.cwd(), '.polln-sheet.json');
      const globalConfig = path.join(os.homedir(), '.polln', 'config.json');

      this.configPath = projectConfig; // Will try project first, then global
    }

    this.config = this.loadConfig();
  }

  /**
   * Load configuration from file
   *
   * @returns Configuration object
   */
  private loadConfig(): PollnSheetConfig {
    const pathsToTry = [
      this.configPath,
      path.join(os.homedir(), '.polln', 'config.json')
    ];

    for (const configPath of pathsToTry) {
      try {
        if (require('fs').existsSync(configPath)) {
          const content = require('fs').readFileSync(configPath, 'utf-8');
          const loaded = JSON.parse(content) as PollnSheetConfig;
          this.configPath = configPath;
          return this.mergeWithDefaults(loaded);
        }
      } catch (error) {
        // Try next path
        continue;
      }
    }

    // No config found, use defaults
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Merge loaded config with defaults
   *
   * @param loaded - Loaded configuration
   * @returns Merged configuration
   */
  private mergeWithDefaults(loaded: PollnSheetConfig): PollnSheetConfig {
    return {
      dataDir: loaded.dataDir || DEFAULT_CONFIG.dataDir,
      server: { ...DEFAULT_CONFIG.server, ...loaded.server },
      spreadsheets: { ...DEFAULT_CONFIG.spreadsheets, ...loaded.spreadsheets },
      cells: { ...DEFAULT_CONFIG.cells, ...loaded.cells },
      colonies: { ...DEFAULT_CONFIG.colonies, ...loaded.colonies },
      cli: { ...DEFAULT_CONFIG.cli, ...loaded.cli },
      features: { ...DEFAULT_CONFIG.features, ...loaded.features }
    };
  }

  /**
   * Save configuration to file
   *
   * @throws Error if save fails
   */
  async save(): Promise<void> {
    try {
      const dir = path.dirname(this.configPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config to ${this.configPath}: ${error}`);
    }
  }

  /**
   * Get all configuration
   *
   * @returns Complete configuration object
   */
  getAll(): PollnSheetConfig {
    return { ...this.config };
  }

  /**
   * Get a specific configuration value by key path
   *
   * @param key - Key path (e.g., 'server.port')
   * @returns Configuration value or undefined
   */
  get<K extends keyof PollnSheetConfig>(key: K): PollnSheetConfig[K] {
    return this.config[key];
  }

  /**
   * Get nested configuration value
   *
   * @param path - Dot-notation path (e.g., 'server.port')
   * @returns Configuration value or undefined
   */
  getByPath(path: string): any {
    return path.split('.').reduce((current: any, key: string) => {
      return current?.[key];
    }, this.config);
  }

  /**
   * Set a specific configuration value
   *
   * @param key - Configuration key
   * @param value - New value
   */
  set<K extends keyof PollnSheetConfig>(key: K, value: PollnSheetConfig[K]): void {
    this.config[key] = value;
  }

  /**
   * Set nested configuration value
   *
   * @param path - Dot-notation path
   * @param value - New value
   */
  setByPath(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current: any, key: string) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, this.config as any);

    target[lastKey] = value;
  }

  /**
   * Validate configuration
   *
   * @returns True if valid, false otherwise
   */
  validate(): boolean {
    try {
      // Validate server config
      if (this.config.server) {
        if (this.config.server.port !== undefined) {
          const port = this.config.server.port;
          if (typeof port !== 'number' || port < 1 || port > 65535) {
            return false;
          }
        }
        if (this.config.server.workers !== undefined) {
          const workers = this.config.server.workers;
          if (typeof workers !== 'number' || workers < 1) {
            return false;
          }
        }
      }

      // Validate spreadsheet defaults
      if (this.config.spreadsheets) {
        if (this.config.spreadsheets.defaultRows !== undefined) {
          const rows = this.config.spreadsheets.defaultRows;
          if (typeof rows !== 'number' || rows < 1) {
            return false;
          }
        }
        if (this.config.spreadsheets.defaultCols !== undefined) {
          const cols = this.config.spreadsheets.defaultCols;
          if (typeof cols !== 'number' || cols < 1 || cols > 16384) {
            return false;
          }
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get validation errors
   *
   * @returns Array of error messages
   */
  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (this.config.server?.port !== undefined) {
      const port = this.config.server.port;
      if (typeof port !== 'number' || port < 1 || port > 65535) {
        errors.push(`Invalid server port: ${port}`);
      }
    }

    if (this.config.spreadsheets?.defaultRows !== undefined) {
      const rows = this.config.spreadsheets.defaultRows;
      if (typeof rows !== 'number' || rows < 1) {
        errors.push(`Invalid default rows: ${rows}`);
      }
    }

    if (this.config.spreadsheets?.defaultCols !== undefined) {
      const cols = this.config.spreadsheets.defaultCols;
      if (typeof cols !== 'number' || cols < 1 || cols > 16384) {
        errors.push(`Invalid default columns: ${cols}`);
      }
    }

    return errors;
  }

  /**
   * Check if configuration exists
   *
   * @returns True if config file exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the configuration file path
   *
   * @returns Absolute path to config file
   */
  getPath(): string {
    return this.configPath;
  }

  /**
   * Get data directory path
   *
   * @returns Absolute path to data directory
   */
  getDataDir(): string {
    return this.config.dataDir || DEFAULT_CONFIG.dataDir!;
  }

  /**
   * Ensure data directory exists
   *
   * @throws Error if directory creation fails
   */
  async ensureDataDir(): Promise<void> {
    const dataDir = this.getDataDir();
    await fs.mkdir(dataDir, { recursive: true });
  }

  /**
   * Initialize default configuration
   *
   * @param options - Optional configuration overrides
   */
  async initialize(options?: Partial<PollnSheetConfig>): Promise<void> {
    this.config = {
      ...DEFAULT_CONFIG,
      ...options
    };

    await this.save();
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<void> {
    this.config = { ...DEFAULT_CONFIG };
    await this.save();
  }

  /**
   * Export configuration as JSON string
   *
   * @returns JSON string representation
   */
  export(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON string
   *
   * @param json - JSON string to import
   * @throws Error if JSON is invalid
   */
  async import(json: string): Promise<void> {
    try {
      const imported = JSON.parse(json) as PollnSheetConfig;
      this.config = this.mergeWithDefaults(imported);
      await this.save();
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }

  /**
   * Get environment-specific overrides
   *
   * @returns Environment-based configuration overrides
   */
  getEnvOverrides(): Partial<PollnSheetConfig> {
    const overrides: Partial<PollnSheetConfig> = {};

    // Server overrides
    if (process.env.POLLN_SERVER_HOST) {
      overrides.server = { ...overrides.server, host: process.env.POLLN_SERVER_HOST };
    }
    if (process.env.POLLN_SERVER_PORT) {
      const port = parseInt(process.env.POLLN_SERVER_PORT);
      if (!isNaN(port)) {
        overrides.server = { ...overrides.server, port };
      }
    }

    // Data directory override
    if (process.env.POLLN_DATA_DIR) {
      overrides.dataDir = process.env.POLLN_DATA_DIR;
    }

    return overrides;
  }

  /**
   * Get effective configuration (with environment overrides)
   *
   * @returns Configuration with environment overrides applied
   */
  getEffectiveConfig(): PollnSheetConfig {
    const envOverrides = this.getEnvOverrides();
    return {
      ...this.config,
      ...envOverrides,
      server: {
        ...this.config.server,
        ...envOverrides.server
      }
    };
  }

  /**
   * Get global config directory
   *
   * @returns Path to global config directory
   */
  static getGlobalConfigDir(): string {
    return path.join(os.homedir(), '.polln');
  }

  /**
   * Get global config file path
   *
   * @returns Path to global config file
   */
  static getGlobalConfigPath(): string {
    return path.join(ConfigManager.getGlobalConfigDir(), 'config.json');
  }

  /**
   * Load global configuration
   *
   * @returns Global configuration or defaults
   */
  static async loadGlobalConfig(): Promise<PollnSheetConfig> {
    const globalPath = ConfigManager.getGlobalConfigPath();

    try {
      const content = await fs.readFile(globalPath, 'utf-8');
      const loaded = JSON.parse(content) as PollnSheetConfig;
      return {
        ...DEFAULT_CONFIG,
        ...loaded
      };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Save global configuration
   *
   * @param config - Configuration to save
   */
  static async saveGlobalConfig(config: Partial<PollnSheetConfig>): Promise<void> {
    const globalPath = ConfigManager.getGlobalConfigPath();
    const globalDir = path.dirname(globalPath);

    await fs.mkdir(globalDir, { recursive: true });

    const mergedConfig = {
      ...DEFAULT_CONFIG,
      ...config
    };

    await fs.writeFile(globalPath, JSON.stringify(mergedConfig, null, 2));
  }
}
