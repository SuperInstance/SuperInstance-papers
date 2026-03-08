/**
 * polln init command
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import path from 'path';
import { ConfigManager } from '../utils/config.js';
import { ColonyStateManager } from '../utils/colony-state.js';
import { OutputFormatter } from '../utils/output.js';

export const initCommand = new Command('init')
  .description('Initialize a new POLLN colony')
  .option('-n, --name <name>', 'Colony name')
  .option('-d, --data-dir <path>', 'Data directory path')
  .option('-f, --force', 'Overwrite existing configuration')
  .option('--no-federation', 'Disable federated learning')
  .option('--no-dreaming', 'Disable dream-based optimization')
  .option('--interactive', 'Interactive mode')
  .action(async (options) => {
    const config = new ConfigManager();

    // Check if already initialized
    if (config.exists() && !options.force) {
      OutputFormatter.warning('Colony already initialized');
      OutputFormatter.info(`Use --force to reinitialize`);
      return;
    }

    let colonyName = options.name;
    let enableFederation = options.federation !== false;
    let enableDreaming = options.dreaming !== false;
    let defaultAgentType = 'task';

    // Interactive mode or missing name
    if (options.interactive || !colonyName) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'colonyName',
          message: 'Enter colony name:',
          default: colonyName || path.basename(process.cwd()),
          validate: (input: string) => input.trim().length > 0 || 'Colony name is required',
        },
        {
          type: 'confirm',
          name: 'enableFederation',
          message: 'Enable federated learning?',
          default: enableFederation,
        },
        {
          type: 'confirm',
          name: 'enableDreaming',
          message: 'Enable dream-based optimization?',
          default: enableDreaming,
        },
        {
          type: 'list',
          name: 'defaultAgentType',
          message: 'Default agent type:',
          choices: ['task', 'role', 'core'],
          default: defaultAgentType,
        },
      ]);

      colonyName = answers.colonyName;
      enableFederation = answers.enableFederation;
      enableDreaming = answers.enableDreaming;
      defaultAgentType = answers.defaultAgentType;
    }

    // Initialize configuration
    OutputFormatter.header('Initializing Colony');

    const initOptions: Partial<import('../utils/config.js').PollnConfig> = {
      federation: {
        enabled: enableFederation,
      },
      dreaming: {
        enabled: enableDreaming,
      },
      agents: {
        maxCount: 100,
        defaultType: defaultAgentType as 'task' | 'role' | 'core',
      },
    };

    if (options.dataDir) {
      initOptions.dataDir = path.resolve(options.dataDir);
    }

    config.initializeColony(colonyName, initOptions);

    // Create data directory
    config.ensureDataDir();

    // Initialize colony state
    const stateManager = new ColonyStateManager(config.getDataDir(), config.get('colonyId')!);
    stateManager.setName(colonyName);
    stateManager.saveState();

    // Success output
    OutputFormatter.success(`Colony "${colonyName}" initialized successfully`);
    OutputFormatter.newline();
    OutputFormatter.info(`Colony ID: ${config.get('colonyId')}`);
    OutputFormatter.info(`Config file: ${config.getPath()}`);
    OutputFormatter.info(`Data directory: ${config.getDataDir()}`);
    OutputFormatter.newline();

    OutputFormatter.subheader('Next Steps');
    OutputFormatter.list('Run "polln status" to check colony health');
    OutputFormatter.list('Run "polln agents spawn task" to create your first agent');
    OutputFormatter.list('Run "polln dream" to start dream cycle');
    OutputFormatter.list('Run "polln sync" to join federation (if enabled)');
  });
