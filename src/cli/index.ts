#!/usr/bin/env node
/**
 * POLLN CLI - Colony Management Interface
 */

import { Command } from 'commander';
import { ConfigManager } from './utils/config.js';
import { OutputFormatter } from './utils/output.js';

// Import commands
import { initCommand } from './commands/init.js';
import { statusCommand } from './commands/status.js';
import { agentsCommand } from './commands/agents.js';
import { dreamCommand } from './commands/dream.js';
import { syncCommand } from './commands/sync.js';
import { cacheCommand } from './commands/cache.js';
import { loraCommand } from './commands/lora.js';
import { coloniesCommand } from './commands/colonies.js';
import { scaleCommand } from './commands/scale.js';

// Create main program
const program = new Command();

// Program configuration
program
  .name('polln')
  .description('POLLN - Pattern-Organized Large Language Network CLI')
  .version('0.1.0');

// Global options
program
  .option('-c, --config <path>', 'Path to config file')
  .option('-v, --verbose', 'Verbose output')
  .option('-q, --quiet', 'Quiet mode (minimal output)')
  .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();

    // Set custom config path if provided
    if (options.config) {
      process.env.POLLN_CONFIG = options.config;
    }

    // Handle verbose/quiet modes
    if (options.quiet) {
      process.env.POLLN_LOG_LEVEL = 'error';
    } else if (options.verbose) {
      process.env.POLLN_LOG_LEVEL = 'debug';
    }
  });

// Add commands
program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(agentsCommand);
program.addCommand(dreamCommand);
program.addCommand(syncCommand);
program.addCommand(cacheCommand);
program.addCommand(loraCommand);
program.addCommand(coloniesCommand);
program.addCommand(scaleCommand);

// Configuration command
program
  .command('config')
  .description('Manage POLLN configuration')
  .option('-s, --set <key=value>', 'Set configuration value')
  .option('-g, --get <key>', 'Get configuration value')
  .option('-l, --list', 'List all configuration')
  .option('--edit', 'Open config in editor')
  .action((options) => {
    const config = new ConfigManager(process.env.POLLN_CONFIG);

    if (!config.exists()) {
      OutputFormatter.error('No configuration found');
      OutputFormatter.info('Run "polln init" to initialize a colony');
      process.exit(1);
    }

    if (options.list) {
      OutputFormatter.header('Configuration');
      const allConfig = config.getAll();
      OutputFormatter.json(allConfig);
      return;
    }

    if (options.get) {
      const value = config.get(options.get);
      if (value !== undefined) {
        OutputFormatter.json(value);
      } else {
        OutputFormatter.error(`Configuration key not found: ${options.get}`);
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
        // Parse value as JSON if it looks like JSON
        let parsedValue: unknown = value;
        if (value.startsWith('{') || value.startsWith('[') || value === 'true' || value === 'false') {
          parsedValue = JSON.parse(value);
        }

        config.set(key as keyof import('./utils/config.js').PollnConfig, parsedValue as any);
        config.saveConfig();
        OutputFormatter.success(`Configuration updated: ${key}`);
      } catch (error) {
        OutputFormatter.error(`Failed to parse value: ${error}`);
        process.exit(1);
      }
      return;
    }

    if (options.edit) {
      const editor = process.env.EDITOR || 'code';
      const { spawn } = require('child_process');
      spawn(editor, [config.getPath()], { stdio: 'inherit' });
      return;
    }

    // Default: show config location
    OutputFormatter.info(`Config file: ${config.getPath()}`);
    OutputFormatter.info('Use --list to show all configuration');
    OutputFormatter.info('Use --edit to open in editor');
  });

// Version command (extended)
program
  .command('version')
  .description('Show detailed version information')
  .action(() => {
    OutputFormatter.header('POLLN CLI');
    OutputFormatter.kv('Version', '0.1.0');
    OutputFormatter.kv('Node.js', process.version);
    OutputFormatter.kv('Platform', `${process.platform} ${process.arch}`);
    OutputFormatter.kv('Config', ConfigManager.getGlobalConfigPath());

    const globalConfig = ConfigManager.loadGlobalConfig();
    if (globalConfig.colonyId) {
      OutputFormatter.kv('Default Colony', globalConfig.colonyId);
    }
  });

// Help command
program
  .command('help')
  .description('Show help information')
  .option('-d, --detailed', 'Show detailed help with examples')
  .action((options) => {
    if (options.detailed) {
      showDetailedHelp();
    } else {
      program.help();
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

function showDetailedHelp(): void {
  OutputFormatter.header('POLLN CLI - Detailed Help');

  OutputFormatter.subheader('Getting Started');
  OutputFormatter.list('Initialize a new colony: polln init');
  OutputFormatter.list('Check colony status: polln status');
  OutputFormatter.list('View all commands: polln --help');
  OutputFormatter.newline();

  OutputFormatter.subheader('Common Commands');
  OutputFormatter.list('polln init - Initialize a new colony');
  OutputFormatter.list('polln status - Show colony health and stats');
  OutputFormatter.list('polln agents list - List all agents');
  OutputFormatter.list('polln agents spawn <type> - Create a new agent');
  OutputFormatter.list('polln agents kill <id> - Terminate an agent');
  OutputFormatter.list('polln dream - Trigger dream cycle');
  OutputFormatter.list('polln sync - Sync with federation');
  OutputFormatter.list('polln cache stats - Show cache statistics');
  OutputFormatter.list('polln cache clear - Clear cache');
  OutputFormatter.list('polln lora list - List available LoRA adapters');
  OutputFormatter.list('polln lora train - Train a new LoRA adapter');
  OutputFormatter.list('polln lora benchmark - Benchmark LoRA performance');
  OutputFormatter.list('polln lora distill - Distill from teacher model');
  OutputFormatter.newline();

  OutputFormatter.subheader('Scaling Commands');
  OutputFormatter.list('polln scale status - Show scaling status and metrics');
  OutputFormatter.list('polln scale policy list - List scaling policies');
  OutputFormatter.list('polln scale policy enable <id> - Enable a policy');
  OutputFormatter.list('polln scale policy disable <id> - Disable a policy');
  OutputFormatter.list('polln scale manual -t <type> -m <mag> - Manual scaling');
  OutputFormatter.list('polln scale predict -h <min> - Predict scaling needs');
  OutputFormatter.list('polln scale history - Show scaling history');
  OutputFormatter.newline();

  OutputFormatter.subheader('Multi-Colony Commands');
  OutputFormatter.list('polln colonies list - List all colonies');
  OutputFormatter.list('polln colonies create - Create a new colony');
  OutputFormatter.list('polln colonies status - Show colony status');
  OutputFormatter.list('polln colonies start <id> - Start a colony');
  OutputFormatter.list('polln colonies stop <id> - Stop a colony');
  OutputFormatter.list('polln colonies scale <id> - Scale a colony');
  OutputFormatter.list('polln colonies migrate - Migrate agents between colonies');
  OutputFormatter.list('polln colonies autoscale - Configure auto-scaling');
  OutputFormatter.newline();

  OutputFormatter.subheader('Examples');
  OutputFormatter.list('Initialize with custom name:', 1);
  OutputFormatter.list('polln init --name "My Colony"', 2);
  OutputFormatter.newline();
  OutputFormatter.list('Create a task agent:', 1);
  OutputFormatter.list('polln agents spawn task --category "analysis"', 2);
  OutputFormatter.newline();
  OutputFormatter.list('Run dream cycle with options:', 1);
  OutputFormatter.list('polln dream --episodes 20 --temperature 0.7', 2);
  OutputFormatter.newline();
  OutputFormatter.list('View status as JSON:', 1);
  OutputFormatter.list('polln status --json', 2);
  OutputFormatter.newline();

  OutputFormatter.subheader('Configuration');
  OutputFormatter.info('Configuration is stored in .pollnrc in your project directory');
  OutputFormatter.info('Global config is stored in ~/.polln/config.json');
  OutputFormatter.newline();
  OutputFormatter.list('View configuration: polln config --list');
  OutputFormatter.list('Set a value: polln config --set federation.enabled=true');
  OutputFormatter.list('Edit config: polln config --edit');
  OutputFormatter.newline();

  OutputFormatter.subheader('Agent Types');
  OutputFormatter.kv('TASK', 'Single-purpose, ephemeral agents');
  OutputFormatter.kv('ROLE', 'Ongoing responsibility agents');
  OutputFormatter.kv('CORE', 'Essential, always-active agents');
  OutputFormatter.kv('META', 'Pluripotent agents that differentiate');
  OutputFormatter.newline();

  OutputFormatter.subheader('More Information');
  OutputFormatter.info('Documentation: https://github.com/SuperInstance/polln');
  OutputFormatter.info('Report issues: https://github.com/SuperInstance/polln/issues');
}

export { program };
