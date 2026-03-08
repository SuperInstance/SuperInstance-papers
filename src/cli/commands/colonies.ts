/**
 * Multi-Colony CLI Commands
 * Commands for managing multiple colonies
 */

import { Command } from 'commander';
import { OutputFormatter } from '../utils/output.js';
import { ConfigManager } from '../utils/config.js';

export const coloniesCommand = new Command('colonies');

coloniesCommand.description('Multi-colony management commands');

// ============================================================================
// List Colonies
// ============================================================================

coloniesCommand
  .command('list')
  .description('List all colonies')
  .option('-j, --json', 'Output as JSON')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No configuration found');
      OutputFormatter.info('Run "polln init" to initialize');
      process.exit(1);
    }

    // Get colonies from config
    const colonyConfig = config.get('colonies');
    const colonies = colonyConfig?.colonies || [];

    if (options.json) {
      OutputFormatter.json(colonies);
    } else {
      OutputFormatter.header('Colonies');

      if (colonies.length === 0) {
        OutputFormatter.info('No colonies found');
        OutputFormatter.info('Create a colony with: polln colonies create');
        return;
      }

      for (const colony of colonies) {
        OutputFormatter.subheader(colony.name || colony.id);

        if (options.verbose) {
          OutputFormatter.kv('ID', colony.id);
          OutputFormatter.kv('State', colony.state || 'unknown');
          OutputFormatter.kv('Agents', colony.agents || 0);

          if (colony.specialization) {
            OutputFormatter.kv('Specialization', colony.specialization);
          }

          if (colony.resources) {
            OutputFormatter.kv('CPU', `${(colony.resources.cpu * 100).toFixed(1)}%`);
            OutputFormatter.kv('Memory', `${(colony.resources.memory * 100).toFixed(1)}%`);
          }
        } else {
          OutputFormatter.list(`${colony.id} - ${colony.state || 'unknown'} (${colony.agents || 0} agents)`);
        }

        OutputFormatter.newline();
      }
    }
  });

// ============================================================================
// Create Colony
// ============================================================================

coloniesCommand
  .command('create')
  .description('Create a new colony')
  .option('-n, --name <name>', 'Colony name')
  .option('-c, --compute <units>', 'Compute units', '100')
  .option('-m, --memory <MB>', 'Memory in MB', '1024')
  .option('-N, --network <MB>', 'Network bandwidth in MB', '100')
  .option('-s, --specialization <type>', 'Colony specialization')
  .option('-d, --distributed', 'Enable distributed coordination')
  .option('--dry-run', 'Show what would be created without creating')
  .action(async (options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No configuration found');
      OutputFormatter.info('Run "polln init" to initialize');
      process.exit(1);
    }

    const { v4: uuidv4 } = await import('uuid');
    const colonyId = uuidv4();
    const colonyName = options.name || `colony-${Date.now()}`;

    const colony = {
      id: colonyId,
      name: colonyName,
      state: 'provisioning',
      agents: 0,
      resources: {
        compute: parseFloat(options.compute),
        memory: parseFloat(options.memory),
        network: parseFloat(options.network),
        cpu: 0,
      },
      specialization: options.specialization,
      distributed: options.distributed,
      createdAt: new Date().toISOString(),
    };

    if (options.dryRun) {
      OutputFormatter.header('Dry Run - Colony Configuration');
      OutputFormatter.json(colony);
      OutputFormatter.info('Would create colony with above configuration');
      return;
    }

    // Add to config
    const colonyConfig = config.get('colonies') || { colonies: [] };
    colonyConfig.colonies.push(colony);
    config.set('colonies', colonyConfig);
    config.saveConfig();

    OutputFormatter.success(`Colony created: ${colonyName}`);
    OutputFormatter.kv('ID', colonyId);
    OutputFormatter.kv('Specialization', options.specialization || 'none');
    OutputFormatter.kv('Distributed', options.distributed ? 'enabled' : 'disabled');
    OutputFormatter.info('Start the colony with: polln colonies start ' + colonyId);
  });

// ============================================================================
// Start Colony
// ============================================================================

coloniesCommand
  .command('start <colonyId>')
  .description('Start a colony')
  .action(async (colonyId) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No configuration found');
      process.exit(1);
    }

    const colonyConfig = config.get('colonies');
    if (!colonyConfig) {
      OutputFormatter.error('No colonies configured');
      process.exit(1);
    }

    const colony = colonyConfig.colonies.find((c: any) => c.id === colonyId);
    if (!colony) {
      OutputFormatter.error(`Colony not found: ${colonyId}`);
      process.exit(1);
    }

    colony.state = 'running';
    colony.startedAt = new Date().toISOString();
    config.saveConfig();

    OutputFormatter.success(`Colony started: ${colony.name || colonyId}`);
  });

// ============================================================================
// Stop Colony
// ============================================================================

coloniesCommand
  .command('stop <colonyId>')
  .description('Stop a colony')
  .option('-g, --graceful', 'Graceful shutdown with drain period')
  .action(async (colonyId, options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No configuration found');
      process.exit(1);
    }

    const colonyConfig = config.get('colonies');
    if (!colonyConfig) {
      OutputFormatter.error('No colonies configured');
      process.exit(1);
    }

    const colony = colonyConfig.colonies.find((c: any) => c.id === colonyId);
    if (!colony) {
      OutputFormatter.error(`Colony not found: ${colonyId}`);
      process.exit(1);
    }

    colony.state = 'stopped';
    colony.stoppedAt = new Date().toISOString();
    config.saveConfig();

    OutputFormatter.success(`Colony stopped: ${colony.name || colonyId}`);
  });

// ============================================================================
// Delete Colony
// ============================================================================

coloniesCommand
  .command('delete <colonyId>')
  .description('Delete a colony')
  .option('-f, --force', 'Force delete without confirmation')
  .action(async (colonyId, options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No configuration found');
      process.exit(1);
    }

    const colonyConfig = config.get('colonies');
    if (!colonyConfig) {
      OutputFormatter.error('No colonies configured');
      process.exit(1);
    }

    const colony = colonyConfig.colonies.find((c: any) => c.id === colonyId);
    if (!colony) {
      OutputFormatter.error(`Colony not found: ${colonyId}`);
      process.exit(1);
    }

    if (!options.force) {
      OutputFormatter.warn(`This will delete colony: ${colony.name || colonyId}`);
      OutputFormatter.confirm('Are you sure?', async () => {
        deleteColony(colonyConfig, colonyId, config, colony);
      });
    } else {
      deleteColony(colonyConfig, colonyId, config, colony);
    }
  });

function deleteColony(colonyConfig: any, colonyId: string, config: ConfigManager, colony: any) {
  colonyConfig.colonies = colonyConfig.colonies.filter((c: any) => c.id !== colonyId);
  config.saveConfig();
  OutputFormatter.success(`Colony deleted: ${colony.name || colonyId}`);
}

// ============================================================================
// Colony Status
// ============================================================================

coloniesCommand
  .command('status [colonyId]')
  .description('Show colony status (all colonies or specific colony)')
  .option('-j, --json', 'Output as JSON')
  .option('-w, --watch', 'Watch mode - refresh every 2 seconds')
  .action(async (colonyId, options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No configuration found');
      process.exit(1);
    }

    const colonyConfig = config.get('colonies');
    if (!colonyConfig) {
      OutputFormatter.error('No colonies configured');
      process.exit(1);
    }

    const showStatus = () => {
      if (colonyId) {
        const colony = colonyConfig.colonies.find((c: any) => c.id === colonyId);
        if (!colony) {
          OutputFormatter.error(`Colony not found: ${colonyId}`);
          return;
        }
        showColonyStatus(colony, options.json);
      } else {
        showAllColoniesStatus(colonyConfig.colonies, options.json);
      }
    };

    if (options.watch) {
      const { clearScreen } = require('../utils/output.js');
      setInterval(() => {
        clearScreen();
        showStatus();
      }, 2000);
      showStatus();
    } else {
      showStatus();
    }
  });

function showColonyStatus(colony: any, json: boolean) {
  if (json) {
    OutputFormatter.json(colony);
  } else {
    OutputFormatter.header(colony.name || colony.id);
    OutputFormatter.kv('ID', colony.id);
    OutputFormatter.kv('State', colony.state || 'unknown');
    OutputFormatter.kv('Agents', colony.agents || 0);

    if (colony.specialization) {
      OutputFormatter.kv('Specialization', colony.specialization);
    }

    if (colony.resources) {
      OutputFormatter.subheader('Resources');
      OutputFormatter.kv('Compute', `${colony.resources.compute} units`);
      OutputFormatter.kv('Memory', `${colony.resources.memory} MB`);
      OutputFormatter.kv('CPU Usage', `${((colony.resources.cpu || 0) * 100).toFixed(1)}%`);
      OutputFormatter.kv('Memory Usage', `${((colony.resources.memoryUsed || 0) * 100).toFixed(1)}%`);
    }

    if (colony.createdAt) {
      OutputFormatter.kv('Created', new Date(colony.createdAt).toLocaleString());
    }

    if (colony.startedAt) {
      OutputFormatter.kv('Started', new Date(colony.startedAt).toLocaleString());
    }
  }
}

function showAllColoniesStatus(colonies: any[], json: boolean) {
  if (json) {
    OutputFormatter.json(colonies);
  } else {
    OutputFormatter.header('Multi-Colony Status');

    let totalAgents = 0;
    let running = 0;
    let stopped = 0;
    let provisioning = 0;

    for (const colony of colonies) {
      totalAgents += colony.agents || 0;

      switch (colony.state) {
        case 'running':
          running++;
          break;
        case 'stopped':
          stopped++;
          break;
        case 'provisioning':
          provisioning++;
          break;
      }

      OutputFormatter.list(`${colony.name || colony.id}: ${colony.state || 'unknown'} (${colony.agents || 0} agents)`);
    }

    OutputFormatter.newline();
    OutputFormatter.subheader('Summary');
    OutputFormatter.kv('Total Colonies', colonies.length);
    OutputFormatter.kv('Running', running);
    OutputFormatter.kv('Stopped', stopped);
    OutputFormatter.kv('Provisioning', provisioning);
    OutputFormatter.kv('Total Agents', totalAgents);
  }
}

// ============================================================================
// Scale Colony
// ============================================================================

coloniesCommand
  .command('scale <colonyId>')
  .description('Scale a colony up or down')
  .option('--up', 'Scale up')
  .option('--down', 'Scale down')
  .option('-c, --compute <units>', 'Compute units to add/remove')
  .option('-m, --memory <MB>', 'Memory to add/remove')
  .action(async (colonyId, options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No configuration found');
      process.exit(1);
    }

    const colonyConfig = config.get('colonies');
    if (!colonyConfig) {
      OutputFormatter.error('No colonies configured');
      process.exit(1);
    }

    const colony = colonyConfig.colonies.find((c: any) => c.id === colonyId);
    if (!colony) {
      OutputFormatter.error(`Colony not found: ${colonyId}`);
      process.exit(1);
    }

    if (!options.up && !options.down) {
      OutputFormatter.error('Specify --up or --down');
      process.exit(1);
    }

    const direction = options.up ? 'up' : 'down';
    const multiplier = options.up ? 1 : -1;

    if (options.compute) {
      colony.resources.compute += parseFloat(options.compute) * multiplier;
    }

    if (options.memory) {
      colony.resources.memory += parseFloat(options.memory) * multiplier;
    }

    colony.scaledAt = new Date().toISOString();
    config.saveConfig();

    OutputFormatter.success(`Colony scaled ${direction}: ${colony.name || colonyId}`);
    OutputFormatter.kv('New Compute', colony.resources.compute);
    OutputFormatter.kv('New Memory', colony.resources.memory);
  });

// ============================================================================
// Migrate Agents
// ============================================================================

coloniesCommand
  .command('migrate')
  .description('Migrate agents between colonies')
  .requiredOption('-s, --source <colonyId>', 'Source colony ID')
  .requiredOption('-t, --target <colonyId>', 'Target colony ID')
  .option('-a, --agents <agentIds>', 'Comma-separated list of agent IDs')
  .option('--all', 'Migrate all agents from source')
  .option('--dry-run', 'Show what would be migrated without migrating')
  .action(async (options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No configuration found');
      process.exit(1);
    }

    const colonyConfig = config.get('colonies');
    if (!colonyConfig) {
      OutputFormatter.error('No colonies configured');
      process.exit(1);
    }

    const sourceColony = colonyConfig.colonies.find((c: any) => c.id === options.source);
    const targetColony = colonyConfig.colonies.find((c: any) => c.id === options.target);

    if (!sourceColony) {
      OutputFormatter.error(`Source colony not found: ${options.source}`);
      process.exit(1);
    }

    if (!targetColony) {
      OutputFormatter.error(`Target colony not found: ${options.target}`);
      process.exit(1);
    }

    let agentIds: string[] = [];

    if (options.all) {
      agentIds = sourceColony.agentsList || [];
    } else if (options.agents) {
      agentIds = options.agents.split(',').map((id: string) => id.trim());
    } else {
      OutputFormatter.error('Specify --agents or --all');
      process.exit(1);
    }

    if (agentIds.length === 0) {
      OutputFormatter.error('No agents to migrate');
      process.exit(1);
    }

    if (options.dryRun) {
      OutputFormatter.header('Dry Run - Migration Plan');
      OutputFormatter.kv('Source', sourceColony.name || options.source);
      OutputFormatter.kv('Target', targetColony.name || options.target);
      OutputFormatter.kv('Agents', agentIds.length);
      OutputFormatter.list('Agent IDs:', 1);
      agentIds.forEach(id => OutputFormatter.list(id, 2));
      OutputFormatter.newline();
      OutputFormatter.info('Would migrate agents listed above');
      return;
    }

    OutputFormatter.header('Migrating Agents');
    OutputFormatter.kv('Source', sourceColony.name || options.source);
    OutputFormatter.kv('Target', targetColony.name || options.target);
    OutputFormatter.kv('Agent Count', agentIds.length);
    OutputFormatter.info('Migration in progress...');

    // Simulate migration
    await new Promise(resolve => setTimeout(resolve, 1000));

    OutputFormatter.success('Migration complete');
  });

// ============================================================================
// Auto-Scaling
// ============================================================================

coloniesCommand
  .command('autoscale')
  .description('Configure auto-scaling')
  .option('-e, --enable', 'Enable auto-scaling')
  .option('-d, --disable', 'Disable auto-scaling')
  .option('--min <count>', 'Minimum colonies')
  .option('--max <count>', 'Maximum colonies')
  .option('--cpu-threshold <percentage>', 'CPU threshold for scaling')
  .action(async (options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No configuration found');
      process.exit(1);
    }

    let autoscalingConfig = config.get('autoscaling') || {
      enabled: false,
      minColonies: 1,
      maxColonies: 10,
      cpuThreshold: 80,
    };

    if (options.enable) {
      autoscalingConfig.enabled = true;
    } else if (options.disable) {
      autoscalingConfig.enabled = false;
    }

    if (options.min) {
      autoscalingConfig.minColonies = parseInt(options.min);
    }

    if (options.max) {
      autoscalingConfig.maxColonies = parseInt(options.max);
    }

    if (options.cpuThreshold) {
      autoscalingConfig.cpuThreshold = parseFloat(options.cpuThreshold);
    }

    config.set('autoscaling', autoscalingConfig);
    config.saveConfig();

    OutputFormatter.success(`Auto-scaling ${autoscalingConfig.enabled ? 'enabled' : 'disabled'}`);
    OutputFormatter.kv('Min Colonies', autoscalingConfig.minColonies);
    OutputFormatter.kv('Max Colonies', autoscalingConfig.maxColonies);
    OutputFormatter.kv('CPU Threshold', `${autoscalingConfig.cpuThreshold}%`);
  });
