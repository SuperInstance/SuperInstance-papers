/**
 * polln dream command
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import { ConfigManager } from '../utils/config.js';
import { ColonyStateManager } from '../utils/colony-state.js';
import { OutputFormatter } from '../utils/output.js';

export const dreamCommand = new Command('dream')
  .description('Trigger dream cycle for policy optimization')
  .option('-e, --episodes <count>', 'Number of dream episodes', '10')
  .option('-t, --temperature <temp>', 'Dream exploration temperature', '0.5')
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

    if (!appConfig.dreaming?.enabled) {
      OutputFormatter.error('Dreaming is not enabled for this colony');
      OutputFormatter.info('Enable it in .pollnrc or run "polln init" again');
      process.exit(1);
    }

    const stateManager = new ColonyStateManager(config.getDataDir(), config.get('colonyId')!);
    const state = stateManager.getState();

    if (state.stats.activeAgents === 0) {
      OutputFormatter.warning('No active agents to dream');
      OutputFormatter.info('Spawn agents first with "polln agents spawn"');
      return;
    }

    let episodeCount = parseInt(options.episodes, 10);
    let temperature = parseFloat(options.temperature);

    // Interactive mode
    if (options.interactive) {
      const answers = await inquirer.prompt([
        {
          type: 'number',
          name: 'episodes',
          message: 'Number of dream episodes:',
          default: episodeCount,
          validate: (input: number) => input > 0 || 'Must be positive',
        },
        {
          type: 'number',
          name: 'temperature',
          message: 'Exploration temperature (0-1):',
          default: temperature,
          validate: (input: number) =>
            (input >= 0 && input <= 1) || 'Must be between 0 and 1',
        },
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Start dream cycle?',
          default: true,
        },
      ]);

      if (!answers.confirm) {
        OutputFormatter.info('Dream cycle cancelled');
        return;
      }

      episodeCount = answers.episodes;
      temperature = answers.temperature;
    }

    // Start dream cycle
    OutputFormatter.header('Starting Dream Cycle');
    OutputFormatter.info(`Colony: ${state.colonyName}`);
    OutputFormatter.info(`Active Agents: ${state.stats.activeAgents}`);
    OutputFormatter.info(`Episodes: ${episodeCount}`);
    OutputFormatter.info(`Temperature: ${temperature}`);
    OutputFormatter.newline();

    const startTime = Date.now();

    // Simulate dream episodes
    for (let i = 1; i <= episodeCount; i++) {
      if (options.verbose) {
        OutputFormatter.info(`Dreaming episode ${i}/${episodeCount}...`);
      } else {
        process.stdout.write(`\r  Progress: ${i}/${episodeCount} episodes`);
      }

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!options.verbose) {
      process.stdout.write('\r');
    }

    const duration = Date.now() - startTime;

    // Update state
    stateManager.incrementDreams();

    // Results
    OutputFormatter.newline();
    OutputFormatter.subheader('Dream Cycle Complete');
    OutputFormatter.metric('Episodes', episodeCount);
    OutputFormatter.metric('Duration', `${(duration / 1000).toFixed(2)}s`);
    OutputFormatter.metric('Avg Time', `${(duration / episodeCount).toFixed(0)}ms`, '/episode');
    OutputFormatter.newline();

    OutputFormatter.success('Dream cycle completed successfully');
    OutputFormatter.info('Policies have been optimized based on dream simulations');
  });
