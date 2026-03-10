/**
 * Colony Commands - Colony Management
 *
 * Commands for creating, managing, and monitoring agent colonies.
 *
 * @module ColonyCommands
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { OutputFormatter } from '../utils/OutputFormatter.js';
import { ConfigManager } from '../utils/ConfigManager.js';

/**
 * Colony metadata
 */
interface Colony {
  id: string;
  name: string;
  sheetId?: string;
  type: 'analysis' | 'prediction' | 'optimization';
  createdAt: Date;
  status: 'running' | 'stopped' | 'paused' | 'error';
  agentCount: number;
  config: ColonyConfig;
  path: string;
}

/**
 * Colony configuration
 */
interface ColonyConfig {
  maxAgents: number;
  spawnRate: number;
  learningRate: number;
  communication: boolean;
  persistence: boolean;
  metrics: {
    enabled: boolean;
    interval: number;
  };
}

/**
 * Agent in colony
 */
interface Agent {
  id: string;
  type: string;
  status: 'active' | 'idle' | 'working' | 'error';
  created: Date;
  lastActivity: Date;
  tasksCompleted: number;
}

/**
 * Colony metrics
 */
interface ColonyMetrics {
  timestamp: Date;
  agentCount: number;
  activeAgents: number;
  tasksCompleted: number;
  averageTaskDuration: number;
  errorRate: number;
  memoryUsage: number;
}

/**
 * ColonyCommands class
 *
 * Handles all colony-related CLI operations.
 */
export class ColonyCommands {
  private config: ConfigManager;
  private coloniesDir: string;

  constructor(config: ConfigManager) {
    this.config = config;
    this.coloniesDir = path.join(this.config.getDataDir(), 'colonies');
  }

  /**
   * Ensure colonies directory exists
   */
  private async ensureColoniesDir(): Promise<void> {
    try {
      await fs.mkdir(this.coloniesDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create colonies directory: ${error}`);
    }
  }

  /**
   * Get colony file path
   */
  private getColonyPath(id: string): string {
    return path.join(this.coloniesDir, `${id}.json`);
  }

  /**
   * Get colony metrics path
   */
  private getMetricsPath(id: string): string {
    return path.join(this.coloniesDir, `${id}.metrics.json`);
  }

  /**
   * Read colony metadata
   */
  private async readColony(id: string): Promise<Colony | null> {
    try {
      const colonyPath = this.getColonyPath(id);
      const content = await fs.readFile(colonyPath, 'utf-8');
      const colony = JSON.parse(content) as Colony;

      // Convert date strings
      colony.createdAt = new Date(colony.createdAt);

      return colony;
    } catch {
      return null;
    }
  }

  /**
   * Write colony metadata
   */
  private async writeColony(colony: Colony): Promise<void> {
    const colonyPath = this.getColonyPath(colony.id);
    await fs.writeFile(colonyPath, JSON.stringify(colony, null, 2));
  }

  /**
   * Get all colonies
   */
  private async getAllColonies(includeStopped: boolean = true): Promise<Colony[]> {
    await this.ensureColoniesDir();

    try {
      const files = await fs.readdir(this.coloniesDir);
      const colonyFiles = files.filter(f => f.endsWith('.json') && !f.includes('.metrics'));

      const colonies: Colony[] = [];
      for (const file of colonyFiles) {
        const id = file.replace('.json', '');
        const colony = await this.readColony(id);
        if (colony && (includeStopped || colony.status !== 'stopped')) {
          colonies.push(colony);
        }
      }

      return colonies;
    } catch (error) {
      return [];
    }
  }

  /**
   * Default colony configuration
   */
  private getDefaultConfig(): ColonyConfig {
    return {
      maxAgents: 100,
      spawnRate: 1.0,
      learningRate: 0.1,
      communication: true,
      persistence: true,
      metrics: {
        enabled: true,
        interval: 60000
      }
    };
  }

  /**
   * Create a new colony
   *
   * @param name - Colony name
   * @param options - Creation options
   */
  async create(name: string, options: {
    sheet?: string;
    type?: string;
    agents?: string;
  }): Promise<void> {
    try {
      OutputFormatter.header('Creating Colony');
      OutputFormatter.info(`Name: ${name}`);
      OutputFormatter.info(`Type: ${options.type || 'analysis'}`);

      const id = uuidv4();
      const agentCount = parseInt(options.agents || '5');

      const colony: Colony = {
        id,
        name,
        sheetId: options.sheet,
        type: (options.type || 'analysis') as Colony['type'],
        createdAt: new Date(),
        status: 'running',
        agentCount,
        config: this.getDefaultConfig(),
        path: this.getColonyPath(id)
      };

      await this.ensureColoniesDir();
      await this.writeColony(colony);

      // Create agents
      const agents: Agent[] = [];
      for (let i = 0; i < agentCount; i++) {
        agents.push({
          id: uuidv4(),
          type: colony.type,
          status: 'idle',
          created: new Date(),
          lastActivity: new Date(),
          tasksCompleted: 0
        });
      }

      // Save agents
      const agentsPath = path.join(this.coloniesDir, `${id}.agents.json`);
      await fs.writeFile(agentsPath, JSON.stringify(agents, null, 2));

      OutputFormatter.success(`Colony created: ${id}`);
      OutputFormatter.kv('Agents', agentCount);

      if (options.sheet) {
        OutputFormatter.kv('Linked Sheet', options.sheet);
      }

      OutputFormatter.newline();
      OutputFormatter.info(`Use 'polln-sheet colony monitor ${id}' to monitor activity`);

    } catch (error) {
      throw new Error(`Failed to create colony: ${error}`);
    }
  }

  /**
   * Deploy agents to colony
   *
   * @param colonyId - Colony ID
   * @param options - Deployment options
   */
  async deploy(colonyId: string, options: {
    type?: string;
    count?: string;
    config?: string;
  }): Promise<void> {
    try {
      const colony = await this.readColony(colonyId);

      if (!colony) {
        OutputFormatter.error(`Colony not found: ${colonyId}`);
        process.exit(1);
      }

      OutputFormatter.header('Deploying Agents');
      OutputFormatter.info(`Colony: ${colony.name}`);

      const count = parseInt(options.count || '1');
      OutputFormatter.info(`Deploying: ${count} agent(s)`);

      const agentsPath = path.join(this.coloniesDir, `${colonyId}.agents.json`);
      const agentsData = await fs.readFile(agentsPath, 'utf-8');
      const agents: Agent[] = JSON.parse(agentsData);

      for (let i = 0; i < count; i++) {
        agents.push({
          id: uuidv4(),
          type: options.type || colony.type,
          status: 'idle',
          created: new Date(),
          lastActivity: new Date(),
          tasksCompleted: 0
        });
      }

      await fs.writeFile(agentsPath, JSON.stringify(agents, null, 2));

      colony.agentCount = agents.length;
      await this.writeColony(colony);

      OutputFormatter.success(`Agents deployed: ${count}`);
      OutputFormatter.kv('Total Agents', colony.agentCount);

    } catch (error) {
      throw new Error(`Failed to deploy agents: ${error}`);
    }
  }

  /**
   * Monitor colony activity
   *
   * @param colonyId - Colony ID
   * @param options - Monitor options
   */
  async monitor(colonyId: string, options: {
    refresh?: string;
    metrics?: boolean;
    stream?: boolean;
  }): Promise<void> {
    try {
      const colony = await this.readColony(colonyId);

      if (!colony) {
        OutputFormatter.error(`Colony not found: ${colonyId}`);
        process.exit(1);
      }

      const refreshInterval = parseInt(options.refresh || '1000');

      OutputFormatter.header(`Colony Monitor: ${colony.name}`);
      OutputFormatter.info(`Press Ctrl+C to stop`);
      OutputFormatter.newline();

      const displayStatus = async () => {
        // Clear screen (in real terminal)
        // console.clear();

        OutputFormatter.subheader('Colony Status');
        OutputFormatter.kv('ID', colony.id);
        OutputFormatter.kv('Status', colony.status);
        OutputFormatter.kv('Type', colony.type);
        OutputFormatter.kv('Agents', colony.agentCount);

        if (colony.sheetId) {
          OutputFormatter.kv('Sheet', colony.sheetId);
        }

        // Load agents
        try {
          const agentsPath = path.join(this.coloniesDir, `${colonyId}.agents.json`);
          const agentsData = await fs.readFile(agentsPath, 'utf-8');
          const agents: Agent[] = JSON.parse(agentsData);

          const activeAgents = agents.filter(a => a.status === 'active').length;
          const workingAgents = agents.filter(a => a.status === 'working').length;
          const idleAgents = agents.filter(a => a.status === 'idle').length;
          const errorAgents = agents.filter(a => a.status === 'error').length;

          OutputFormatter.newline();
          OutputFormatter.subheader('Agent States');
          OutputFormatter.status('Active', 'active');
          OutputFormatter.info(`  ${activeAgents} agents`);
          OutputFormatter.status('Working', 'pending');
          OutputFormatter.info(`  ${workingAgents} agents`);
          OutputFormatter.status('Idle', 'inactive');
          OutputFormatter.info(`  ${idleAgents} agents`);
          if (errorAgents > 0) {
            OutputFormatter.status('Error', 'error');
            OutputFormatter.info(`  ${errorAgents} agents`);
          }

          if (options.metrics) {
            OutputFormatter.newline();
            OutputFormatter.subheader('Metrics');
            const totalTasks = agents.reduce((sum, a) => sum + a.tasksCompleted, 0);
            OutputFormatter.metric('Tasks Completed', totalTasks);
            OutputFormatter.metric('Avg Tasks/Agent', (totalTasks / agents.length).toFixed(2));
          }
        } catch (error) {
          OutputFormatter.warning('Could not load agent data');
        }

        OutputFormatter.newline();
        OutputFormatter.divider();
      };

      await displayStatus();

      if (options.stream) {
        const interval = setInterval(async () => {
          // Refresh colony data
          const updated = await this.readColony(colonyId);
          if (updated) {
            Object.assign(colony, updated);
          }

          await displayStatus();
        }, refreshInterval);

        process.on('SIGINT', () => {
          clearInterval(interval);
          OutputFormatter.newline();
          OutputFormatter.info('Monitor stopped');
          process.exit(0);
        });
      }

    } catch (error) {
      throw new Error(`Failed to monitor colony: ${error}`);
    }
  }

  /**
   * Get colony metrics
   *
   * @param colonyId - Colony ID
   * @param options - Metrics options
   */
  async metrics(colonyId: string, options: {
    period?: string;
    format?: string;
  }): Promise<void> {
    try {
      const colony = await this.readColony(colonyId);

      if (!colony) {
        OutputFormatter.error(`Colony not found: ${colonyId}`);
        process.exit(1);
      }

      OutputFormatter.header(`Colony Metrics: ${colony.name}`);

      // Parse period
      const period = options.period || '1h';
      const periodMs = this.parsePeriod(period);

      // Load metrics
      const metricsPath = this.getMetricsPath(colonyId);
      let metrics: ColonyMetrics[] = [];

      try {
        const metricsData = await fs.readFile(metricsPath, 'utf-8');
        const allMetrics = JSON.parse(metricsData) as ColonyMetrics[];

        // Filter by period
        const since = new Date(Date.now() - periodMs);
        metrics = allMetrics.filter(m => new Date(m.timestamp) >= since);
      } catch {
        OutputFormatter.warning('No metrics data available');
      }

      if (metrics.length === 0) {
        OutputFormatter.info('No metrics for the specified period');
        return;
      }

      const format = options.format || 'table';

      if (format === 'table') {
        const headers = ['Time', 'Agents', 'Active', 'Tasks', 'Avg Duration', 'Error Rate'];
        const rows = metrics.slice(-20).map(m => [
          new Date(m.timestamp).toLocaleTimeString(),
          String(m.agentCount),
          String(m.activeAgents),
          String(m.tasksCompleted),
          `${m.averageTaskDuration.toFixed(2)}ms`,
          `${(m.errorRate * 100).toFixed(2)}%`
        ]);

        OutputFormatter.table(headers, rows);
      } else if (format === 'json') {
        OutputFormatter.json(metrics);
      } else if (format === 'csv') {
        const headers = ['timestamp,agentCount,activeAgents,tasksCompleted,averageTaskDuration,errorRate'];
        const rows = metrics.map(m =>
          `${m.timestamp.toISOString()},${m.agentCount},${m.activeAgents},${m.tasksCompleted},${m.averageTaskDuration},${m.errorRate}`
        );

        console.log(headers.concat(rows).join('\n'));
      }

    } catch (error) {
      throw new Error(`Failed to get metrics: ${error}`);
    }
  }

  /**
   * Parse period string to milliseconds
   */
  private parsePeriod(period: string): number {
    const match = period.match(/^(\d+)([hdw])$/);
    if (!match) return 3600000; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      h: 3600000,  // hour
      d: 86400000, // day
      w: 604800000 // week
    };

    return value * (multipliers[unit] || 3600000);
  }

  /**
   * Stop a colony
   *
   * @param colonyId - Colony ID
   * @param options - Stop options
   */
  async stop(colonyId: string, options: {
    force?: boolean;
    save?: boolean;
  }): Promise<void> {
    try {
      const colony = await this.readColony(colonyId);

      if (!colony) {
        OutputFormatter.error(`Colony not found: ${colonyId}`);
        process.exit(1);
      }

      OutputFormatter.header('Stopping Colony');
      OutputFormatter.info(`Colony: ${colony.name}`);

      if (!options.force) {
        OutputFormatter.info('Stopping agents gracefully...');
        // In real implementation, would stop agents gracefully
      }

      if (options.save) {
        OutputFormatter.info('Saving colony state...');
        // Would save state here
      }

      colony.status = 'stopped';
      await this.writeColony(colony);

      OutputFormatter.success('Colony stopped');

    } catch (error) {
      throw new Error(`Failed to stop colony: ${error}`);
    }
  }

  /**
   * Manage colony configuration
   *
   * @param colonyId - Colony ID
   * @param options - Config options
   */
  async config(colonyId: string, options: {
    get?: string;
    set?: string;
    list?: boolean;
  }): Promise<void> {
    try {
      const colony = await this.readColony(colonyId);

      if (!colony) {
        OutputFormatter.error(`Colony not found: ${colonyId}`);
        process.exit(1);
      }

      if (options.list) {
        OutputFormatter.header(`Colony Config: ${colony.name}`);
        OutputFormatter.json(colony.config);
        return;
      }

      if (options.get) {
        const value = this.getNestedValue(colony.config, options.get);
        if (value !== undefined) {
          OutputFormatter.json(value);
        } else {
          OutputFormatter.error(`Config key not found: ${options.get}`);
        }
        return;
      }

      if (options.set) {
        const [key, ...valueParts] = options.set.split('=');
        const value = valueParts.join('=');

        if (!key || value === undefined) {
          OutputFormatter.error('Invalid format. Use: --set key=value');
          process.exit(1);
        }

        try {
          const parsedValue = JSON.parse(value);
          this.setNestedValue(colony.config, key, parsedValue);
          await this.writeColony(colony);
          OutputFormatter.success(`Configuration updated: ${key}`);
        } catch (error) {
          OutputFormatter.error(`Failed to parse value: ${error}`);
          process.exit(1);
        }
        return;
      }

      // Default: show config location
      OutputFormatter.info(`Colony ID: ${colonyId}`);
      OutputFormatter.info('Use --list to show all configuration');
      OutputFormatter.info('Use --get <key> to get a value');
      OutputFormatter.info('Use --set <key>=<value> to set a value');

    } catch (error) {
      throw new Error(`Failed to manage config: ${error}`);
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => current[key], obj);
    target[lastKey] = value;
  }

  /**
   * List all colonies
   *
   * @param options - List options
   */
  async list(options: {
    all?: boolean;
    sheet?: string;
  }): Promise<void> {
    try {
      let colonies = await this.getAllColonies(options.all);

      if (options.sheet) {
        colonies = colonies.filter(c => c.sheetId === options.sheet);
      }

      if (colonies.length === 0) {
        OutputFormatter.info('No colonies found');
        OutputFormatter.info('Use "polln-sheet colony create" to create one');
        return;
      }

      OutputFormatter.header('Colonies');
      OutputFormatter.info(`Total: ${colonies.length}`);
      OutputFormatter.newline();

      const headers = ['ID', 'Name', 'Type', 'Agents', 'Status', 'Created'];
      const rows = colonies.map(colony => [
        colony.id.slice(0, 8),
        colony.name,
        colony.type,
        String(colony.agentCount),
        colony.status,
        colony.createdAt.toLocaleDateString()
      ]);

      OutputFormatter.table(headers, rows);

    } catch (error) {
      throw new Error(`Failed to list colonies: ${error}`);
    }
  }
}
