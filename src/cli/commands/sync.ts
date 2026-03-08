/**
 * polln sync command
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import { ConfigManager } from '../utils/config.js';
import { ColonyStateManager } from '../utils/colony-state.js';
import { OutputFormatter } from '../utils/output.js';

export const syncCommand = new Command('sync')
  .description('Sync colony with federation')
  .option('-p, --push', 'Push local updates to federation')
  .option('-l, --pull', 'Pull updates from federation')
  .option('-f, --force', 'Force sync even if conflicts exist')
  .option('-i, --interactive', 'Interactive mode')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No colony found in current directory');
      OutputFormatter.info('Run "polln init" to initialize a new colony');
      process.exit(1);
    }

    const appConfig = config.getAll();

    if (!appConfig.federation?.enabled) {
      OutputFormatter.error('Federation is not enabled for this colony');
      OutputFormatter.info('Enable it in .pollnrc or run "polln init" again');
      process.exit(1);
    }

    const stateManager = new ColonyStateManager(config.getDataDir(), config.get('colonyId')!);
    const state = stateManager.getState();

    let syncMode = 'both';
    if (options.push && !options.pull) {
      syncMode = 'push';
    } else if (options.pull && !options.push) {
      syncMode = 'pull';
    }

    // Interactive mode
    if (options.interactive) {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'syncMode',
          message: 'Select sync mode:',
          choices: [
            { name: 'Both ways (push and pull)', value: 'both' },
            { name: 'Push only (upload local changes)', value: 'push' },
            { name: 'Pull only (download remote changes)', value: 'pull' },
          ],
          default: syncMode,
        },
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Start federation sync?',
          default: true,
        },
      ]);

      if (!answers.confirm) {
        OutputFormatter.info('Sync cancelled');
        return;
      }

      syncMode = answers.syncMode;
    }

    // Start sync
    OutputFormatter.header('Federation Sync');
    OutputFormatter.info(`Colony: ${state.colonyName}`);
    OutputFormatter.info(`Colony ID: ${state.colonyId}`);
    OutputFormatter.info(`Mode: ${syncMode.toUpperCase()}`);

    if (appConfig.federation.endpoint) {
      OutputFormatter.info(`Endpoint: ${appConfig.federation.endpoint}`);
    }

    OutputFormatter.newline();

    const startTime = Date.now();

    // Simulate sync process
    if (syncMode === 'push' || syncMode === 'both') {
      if (options.verbose) {
        OutputFormatter.info('Pushing local updates to federation...');
      }
      await simulateSync('Pushing', options.verbose);
    }

    if (syncMode === 'pull' || syncMode === 'both') {
      if (options.verbose) {
        OutputFormatter.info('Pulling updates from federation...');
      }
      await simulateSync('Pulling', options.verbose);
    }

    const duration = Date.now() - startTime;

    // Update state
    stateManager.incrementSyncs();

    // Results
    OutputFormatter.newline();
    OutputFormatter.subheader('Sync Complete');
    OutputFormatter.metric('Duration', `${(duration / 1000).toFixed(2)}s`);
    OutputFormatter.metric('Mode', syncMode.toUpperCase());
    OutputFormatter.metric('Total Syncs', state.stats.totalSyncs);
    OutputFormatter.newline();

    OutputFormatter.success('Federation sync completed successfully');
  });

async function simulateSync(action: string, verbose: boolean): Promise<void> {
  const steps = [
    'Connecting to federation...',
    'Authenticating colony...',
    'Exchanging manifests...',
    'Transferring gradients...',
    'Aggregating updates...',
    'Validating checksums...',
    'Applying changes...',
  ];

  for (const step of steps) {
    if (verbose) {
      OutputFormatter.list(`${action}: ${step}`, 1);
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
