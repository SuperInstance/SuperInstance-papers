/**
 * Configuration management for POLLN CLI
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

export type TileCategory = string;

export interface PollnConfig {
  colonyId?: string;
  colonyName?: string;
  dataDir?: string;
  federation?: {
    enabled: boolean;
    endpoint?: string;
    colonyId?: string;
  };
  dreaming?: {
    enabled: boolean;
    schedule?: string;
  };
  cache?: {
    maxSize: number;
    ttl: number;
  };
  agents?: {
    maxCount: number;
    defaultType: 'task' | 'role' | 'core';
  };
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
  };
}

const DEFAULT_CONFIG: PollnConfig = {
  federation: {
    enabled: false,
  },
  dreaming: {
    enabled: true,
  },
  cache: {
    maxSize: 1000,
    ttl: 3600,
  },
  agents: {
    maxCount: 100,
    defaultType: 'task',
  },
  logging: {
    level: 'info',
  },
};

export class ConfigManager {
  private configPath: string;
  private config: PollnConfig;

  constructor(customPath?: string) {
    if (customPath) {
      this.configPath = path.resolve(customPath);
    } else {
      this.configPath = path.join(process.cwd(), '.pollnrc');
    }
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from file
   */
  private loadConfig(): PollnConfig {
    if (fs.existsSync(this.configPath)) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        const loaded = JSON.parse(content) as PollnConfig;
        return { ...DEFAULT_CONFIG, ...loaded };
      } catch (error) {
        console.warn(`Failed to load config from ${this.configPath}:`, error);
        return { ...DEFAULT_CONFIG };
      }
    }
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Save configuration to file
   */
  saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config to ${this.configPath}: ${error}`);
    }
  }

  /**
   * Get all configuration
   */
  getAll(): PollnConfig {
    return { ...this.config };
  }

  /**
   * Get a specific configuration value
   */
  get<K extends keyof PollnConfig>(key: K): PollnConfig[K] {
    return this.config[key];
  }

  /**
   * Set a specific configuration value
   */
  set<K extends keyof PollnConfig>(key: K, value: PollnConfig[K]): void {
    this.config[key] = value;
  }

  /**
   * Initialize a new colony configuration
   */
  initializeColony(name: string, options?: Partial<PollnConfig>): void {
    this.config = {
      ...DEFAULT_CONFIG,
      colonyName: name,
      colonyId: this.generateColonyId(),
      dataDir: path.join(process.cwd(), '.polln'),
      ...options,
    };
    this.saveConfig();
  }

  /**
   * Generate a unique colony ID
   */
  private generateColonyId(): string {
    return `colony-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if configuration exists
   */
  exists(): boolean {
    return fs.existsSync(this.configPath);
  }

  /**
   * Get the configuration file path
   */
  getPath(): string {
    return this.configPath;
  }

  /**
   * Get data directory path
   */
  getDataDir(): string {
    return this.config.dataDir || path.join(process.cwd(), '.polln');
  }

  /**
   * Ensure data directory exists
   */
  ensureDataDir(): void {
    const dataDir = this.getDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Get global config directory (user home)
   */
  static getGlobalConfigDir(): string {
    return path.join(os.homedir(), '.polln');
  }

  /**
   * Get global config file path
   */
  static getGlobalConfigPath(): string {
    return path.join(ConfigManager.getGlobalConfigDir(), 'config.json');
  }

  /**
   * Load global configuration
   */
  static loadGlobalConfig(): PollnConfig {
    const globalPath = ConfigManager.getGlobalConfigPath();
    if (fs.existsSync(globalPath)) {
      try {
        const content = fs.readFileSync(globalPath, 'utf-8');
        return JSON.parse(content) as PollnConfig;
      } catch (error) {
        console.warn(`Failed to load global config:`, error);
      }
    }
    return { ...DEFAULT_CONFIG };
  }
}
