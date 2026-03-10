/**
 * Server Commands - Server Management
 *
 * Commands for starting and managing POLLN spreadsheet servers.
 *
 * @module ServerCommands
 */

import { spawn } from 'child_process';
import http from 'http';
import { OutputFormatter } from '../utils/OutputFormatter.js';
import { ConfigManager } from '../utils/ConfigManager.js';

/**
 * Server health status
 */
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  connections: number;
  responseTime: number;
}

/**
 * Server statistics
 */
interface ServerStats {
  requests: {
    total: number;
    perSecond: number;
  };
  responses: {
    success: number;
    error: number;
    averageTime: number;
  };
  connections: {
    active: number;
    total: number;
  };
  sheets: {
    total: number;
    active: number;
  };
}

/**
 * ServerCommands class
 *
 * Handles all server-related CLI operations.
 */
export class ServerCommands {
  private config: ConfigManager;
  private serverProcess: any = null;

  constructor(config: ConfigManager) {
    this.config = config;
  }

  /**
   * Start development server
   *
   * @param options - Server options
   */
  async dev(options: {
    port?: string;
    host?: string;
    hotReload?: boolean;
    inspect?: boolean;
  }): Promise<void> {
    try {
      const port = options.port || '3000';
      const host = options.host || 'localhost';

      OutputFormatter.header('Development Server');
      OutputFormatter.info(`Starting on ${host}:${port}`);

      // Check if port is in use
      const inUse = await this.isPortInUse(parseInt(port));
      if (inUse) {
        OutputFormatter.error(`Port ${port} is already in use`);
        OutputFormatter.info('Use --port to specify a different port');
        process.exit(1);
      }

      // Build TypeScript first
      OutputFormatter.info('Building TypeScript...');
      const buildProcess = spawn('npm', ['run', 'build'], {
        stdio: 'inherit',
        shell: true
      });

      await new Promise((resolve, reject) => {
        buildProcess.on('close', (code: number) => {
          if (code === 0) resolve(null);
          else reject(new Error(`Build failed with code ${code}`));
        });
      });

      OutputFormatter.success('Build complete');

      // Start the dev server
      const args = ['dist/spreadsheet/server/index.js'];

      if (options.hotReload) {
        args.push('--hot-reload');
      }

      if (options.inspect) {
        args.push('--inspect');
      }

      this.serverProcess = spawn('node', args, {
        stdio: 'inherit',
        env: {
          ...process.env,
          PORT: port,
          HOST: host,
          NODE_ENV: 'development'
        },
        shell: true
      });

      this.serverProcess.on('error', (error: Error) => {
        OutputFormatter.error(`Server error: ${error.message}`);
        process.exit(1);
      });

      this.serverProcess.on('exit', (code: number) => {
        if (code !== 0) {
          OutputFormatter.error(`Server exited with code ${code}`);
        }
        process.exit(code);
      });

      OutputFormatter.newline();
      OutputFormatter.success('Server started');
      OutputFormatter.info(`URL: http://${host}:${port}`);
      OutputFormatter.info('Press Ctrl+C to stop');

      // Handle graceful shutdown
      process.on('SIGINT', () => this.shutdown('Development server'));
      process.on('SIGTERM', () => this.shutdown('Development server'));

    } catch (error) {
      throw new Error(`Failed to start dev server: ${error}`);
    }
  }

  /**
   * Start production server
   *
   * @param options - Server options
   */
  async start(options: {
    port?: string;
    workers?: string;
    cluster?: boolean;
  }): Promise<void> {
    try {
      const port = options.port || '8080';
      const workers = parseInt(options.workers || '4');

      OutputFormatter.header('Production Server');
      OutputFormatter.info(`Starting on port ${port}`);

      if (options.cluster) {
        OutputFormatter.info(`Cluster mode: ${workers} workers`);
      }

      // Check if port is in use
      const inUse = await this.isPortInUse(parseInt(port));
      if (inUse) {
        OutputFormatter.error(`Port ${port} is already in use`);
        process.exit(1);
      }

      // Start production server
      const args = ['dist/spreadsheet/server/index.js'];

      if (options.cluster) {
        args.push('--cluster');
        args.push('--workers', String(workers));
      }

      this.serverProcess = spawn('node', args, {
        stdio: 'inherit',
        env: {
          ...process.env,
          PORT: port,
          NODE_ENV: 'production'
        },
        shell: true
      });

      this.serverProcess.on('error', (error: Error) => {
        OutputFormatter.error(`Server error: ${error.message}`);
        process.exit(1);
      });

      this.serverProcess.on('exit', (code: number) => {
        if (code !== 0) {
          OutputFormatter.error(`Server exited with code ${code}`);
        }
        process.exit(code);
      });

      OutputFormatter.success('Server started');
      OutputFormatter.info(`Port: ${port}`);
      OutputFormatter.info('Press Ctrl+C to stop');

      // Handle graceful shutdown
      process.on('SIGINT', () => this.shutdown('Production server'));
      process.on('SIGTERM', () => this.shutdown('Production server'));

    } catch (error) {
      throw new Error(`Failed to start production server: ${error}`);
    }
  }

  /**
   * Check if port is in use
   */
  private async isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = http.createServer();

      server.once('error', () => {
        resolve(true);
      });

      server.once('listening', () => {
        server.close();
        resolve(false);
      });

      server.listen(port);
    });
  }

  /**
   * Shutdown server gracefully
   */
  private shutdown(name: string): void {
    OutputFormatter.newline();
    OutputFormatter.info(`Stopping ${name}...`);

    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
    }

    OutputFormatter.success(`${name} stopped`);
    process.exit(0);
  }

  /**
   * Check server health
   *
   * @param options - Health check options
   */
  async health(options: {
    url?: string;
    verbose?: boolean;
  }): Promise<void> {
    try {
      const baseUrl = options.url || 'http://localhost:8080';
      const healthUrl = `${baseUrl}/health`;

      OutputFormatter.header('Server Health Check');
      OutputFormatter.info(`Checking: ${healthUrl}`);

      const startTime = Date.now();

      try {
        const response = await fetch(healthUrl);
        const responseTime = Date.now() - startTime;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const health = (await response.json()) as HealthStatus;

        OutputFormatter.newline();
        OutputFormatter.subheader('Status');

        const statusColors = {
          healthy: 'green',
          degraded: 'yellow',
          unhealthy: 'red'
        };

        const status = health.status.toUpperCase();
        OutputFormatter[statusColors[health.status] as keyof typeof OutputFormatter](
          status
        );

        OutputFormatter.kv('Response Time', `${responseTime}ms`);
        OutputFormatter.kv('Uptime', this.formatUptime(health.uptime));
        OutputFormatter.kv('Connections', String(health.connections));

        OutputFormatter.newline();
        OutputFormatter.subheader('Memory');
        OutputFormatter.kv('Used', `${this.formatBytes(health.memory.used)}`);
        OutputFormatter.kv('Total', `${this.formatBytes(health.memory.total)}`);
        OutputFormatter.kv('Percentage', `${health.memory.percentage.toFixed(1)}%`);

        if (options.verbose) {
          OutputFormatter.newline();
          OutputFormatter.subheader('Details');
          OutputFormatter.json(health);
        }

        // Exit with appropriate code
        process.exit(health.status === 'healthy' ? 0 : 1);

      } catch (error: any) {
        OutputFormatter.error(`Server is not responding`);
        OutputFormatter.info(`Make sure the server is running at ${baseUrl}`);
        OutputFormatter.info('Or use --url to specify a different URL');
        process.exit(1);
      }

    } catch (error) {
      throw new Error(`Health check failed: ${error}`);
    }
  }

  /**
   * Get server statistics
   *
   * @param options - Stats options
   */
  async stats(options: {
    url?: string;
    live?: boolean;
  }): Promise<void> {
    try {
      const baseUrl = options.url || 'http://localhost:8080';
      const statsUrl = `${baseUrl}/stats`;

      OutputFormatter.header('Server Statistics');
      OutputFormatter.info(`Fetching: ${statsUrl}`);

      try {
        const response = await fetch(statsUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const stats = (await response.json()) as ServerStats;

        OutputFormatter.newline();
        OutputFormatter.subheader('Requests');
        OutputFormatter.metric('Total', stats.requests.total);
        OutputFormatter.metric('Per Second', stats.requests.perSecond.toFixed(2));

        OutputFormatter.newline();
        OutputFormatter.subheader('Responses');
        OutputFormatter.metric('Success', stats.responses.success);
        OutputFormatter.metric('Errors', stats.responses.error);
        OutputFormatter.metric('Average Time', `${stats.responses.averageTime.toFixed(2)}ms`);

        OutputFormatter.newline();
        OutputFormatter.subheader('Connections');
        OutputFormatter.metric('Active', stats.connections.active);
        OutputFormatter.metric('Total', stats.connections.total);

        OutputFormatter.newline();
        OutputFormatter.subheader('Spreadsheets');
        OutputFormatter.metric('Total', stats.sheets.total);
        OutputFormatter.metric('Active', stats.sheets.active);

        if (options.live) {
          OutputFormatter.newline();
          OutputFormatter.info('Live updates enabled (Ctrl+C to stop)...');

          const interval = setInterval(async () => {
            try {
              const liveResponse = await fetch(statsUrl);
              const liveStats = await liveResponse.json() as ServerStats;

              // Clear line and update
              process.stdout.write('\r\x1b[K');
              process.stdout.write(
                `Req/s: ${liveStats.requests.perSecond.toFixed(2)} | ` +
                `Active: ${liveStats.connections.active} | ` +
                `Avg: ${liveStats.responses.averageTime.toFixed(2)}ms`
              );
            } catch (error) {
              clearInterval(interval);
            }
          }, 1000);

          process.on('SIGINT', () => {
            clearInterval(interval);
            console.log('\n');
            process.exit(0);
          });
        }

      } catch (error: any) {
        OutputFormatter.error(`Failed to fetch statistics`);
        OutputFormatter.info(`Make sure the server is running at ${baseUrl}`);
        process.exit(1);
      }

    } catch (error) {
      throw new Error(`Failed to get statistics: ${error}`);
    }
  }

  /**
   * View server logs
   *
   * @param options - Log options
   */
  async logs(options: {
    follow?: boolean;
    lines?: string;
    level?: string;
  }): Promise<void> {
    try {
      const logDir = path.join(this.config.getDataDir(), 'logs');
      const logFile = path.join(logDir, 'server.log');

      OutputFormatter.header('Server Logs');
      OutputFormatter.info(`Log file: ${logFile}`);

      const { spawn } = require('child_process');

      const args = ['-n', options.lines || '100'];

      if (options.follow) {
        args.push('-f');
      }

      if (options.level) {
        args.push('|', 'grep', `-i ${options.level}`);
      }

      const tail = spawn('tail', args, {
        stdio: 'inherit',
        shell: true
      });

      tail.on('error', (error: Error) => {
        OutputFormatter.error(`Failed to read logs: ${error.message}`);
        process.exit(1);
      });

      process.on('SIGINT', () => {
        tail.kill();
        process.exit(0);
      });

    } catch (error) {
      throw new Error(`Failed to view logs: ${error}`);
    }
  }

  /**
   * Format uptime
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(' ') || '0s';
  }

  /**
   * Format bytes
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

// Import path for logs function
import path from 'path';
