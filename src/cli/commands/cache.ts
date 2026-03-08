/**
 * polln cache command group
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import { ConfigManager } from '../utils/config.js';
import { ColonyStateManager } from '../utils/colony-state.js';
import { OutputFormatter } from '../utils/output.js';

export const cacheCommand = new Command('cache')
  .description('Manage KV-cache');

// Cache statistics
cacheCommand
  .command('stats')
  .description('Show KV-cache statistics')
  .option('-j, --json', 'Output as JSON')
  .option('-w, --watch', 'Watch mode (update every second)')
  .action(async (options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No colony found in current directory');
      process.exit(1);
    }

    const displayStats = () => {
      const stateManager = new ColonyStateManager(config.getDataDir(), config.get('colonyId')!);
      const state = stateManager.getState();
      const cache = state.cache;

      if (options.json) {
        OutputFormatter.json(cache);
        return;
      }

      // Clear screen in watch mode
      if (options.watch) {
        console.clear();
      }

      OutputFormatter.header('KV-Cache Statistics');

      OutputFormatter.subheader('Cache Status');
      OutputFormatter.metric('Size', cache.size, 'entries');
      OutputFormatter.metric('Hits', cache.hits);
      OutputFormatter.metric('Misses', cache.misses);

      const totalRequests = cache.hits + cache.misses;
      const hitRate = totalRequests > 0
        ? (cache.hits / totalRequests * 100).toFixed(2)
        : '0.00';
      const missRate = totalRequests > 0
        ? (cache.misses / totalRequests * 100).toFixed(2)
        : '0.00';

      OutputFormatter.subheader('Performance');
      OutputFormatter.metric('Hit Rate', `${hitRate}%`);
      OutputFormatter.metric('Miss Rate', `${missRate}%`);

      if (totalRequests > 0) {
        const ratio = (cache.hits / cache.misses).toFixed(2);
        OutputFormatter.metric('Hit/Miss Ratio', ratio);
      }

      if (cache.lastClear) {
        const timeSinceClear = Date.now() - cache.lastClear;
        OutputFormatter.subheader('Maintenance');
        OutputFormatter.kv('Last Cleared', new Date(cache.lastClear).toLocaleString());
        OutputFormatter.kv('Time Since Clear', formatDuration(timeSinceClear));
      }

      if (options.watch) {
        OutputFormatter.newline();
        OutputFormatter.info('Press Ctrl+C to exit');
      }
    };

    displayStats();

    if (options.watch) {
      const interval = setInterval(displayStats, 1000);

      process.on('SIGINT', () => {
        clearInterval(interval);
        process.exit(0);
      });
    }
  });

// Clear cache
cacheCommand
  .command('clear')
  .description('Clear KV-cache')
  .option('-f, --force', 'Force clear without confirmation')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No colony found in current directory');
      process.exit(1);
    }

    const stateManager = new ColonyStateManager(config.getDataDir(), config.get('colonyId')!);
    const state = stateManager.getState();
    const cache = state.cache;

    if (options.verbose) {
      OutputFormatter.header('Cache Clear');
      OutputFormatter.info(`Current size: ${cache.size} entries`);
      OutputFormatter.info(`Current hits: ${cache.hits}`);
      OutputFormatter.info(`Current misses: ${cache.misses}`);
      OutputFormatter.newline();
    }

    // Confirm unless forced
    if (!options.force) {
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to clear the cache?',
          default: false,
        },
      ]);

      if (!answers.confirm) {
        OutputFormatter.info('Cache clear cancelled');
        return;
      }
    }

    // Clear the cache
    stateManager.clearCache();

    OutputFormatter.success('Cache cleared successfully');

    if (options.verbose) {
      OutputFormatter.newline();
      OutputFormatter.info('Cache statistics have been reset');
      OutputFormatter.info('The cache will rebuild as agents process new data');
    }
  });

// Simulate cache activity (for testing/demo)
cacheCommand
  .command('simulate')
  .description('Simulate cache activity (for testing)')
  .option('-n, --operations <count>', 'Number of operations', '100')
  .option('-h, --hit-rate <rate>', 'Target hit rate (0-1)', '0.7')
  .action(async (options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No colony found in current directory');
      process.exit(1);
    }

    const stateManager = new ColonyStateManager(config.getDataDir(), config.get('colonyId')!);
    const operations = parseInt(options.operations, 10);
    const hitRate = parseFloat(options.hitRate);

    OutputFormatter.header('Simulating Cache Activity');
    OutputFormatter.info(`Operations: ${operations}`);
    OutputFormatter.info(`Target hit rate: ${(hitRate * 100).toFixed(1)}%`);
    OutputFormatter.newline();

    let hits = 0;
    let misses = 0;
    const currentCache = stateManager.getState().cache;

    for (let i = 0; i < operations; i++) {
      if (Math.random() < hitRate) {
        hits++;
      } else {
        misses++;
      }

      if (i % 10 === 0) {
        process.stdout.write(`\r  Progress: ${i}/${operations} operations`);
      }
    }

    process.stdout.write('\r');

    // Update state with new stats
    stateManager.updateCacheStats(
      Math.floor(Math.random() * 1000),
      currentCache.hits + hits,
      currentCache.misses + misses
    );

    const actualHitRate = (hits / operations * 100).toFixed(1);

    OutputFormatter.newline();
    OutputFormatter.subheader('Simulation Complete');
    OutputFormatter.metric('Operations', operations);
    OutputFormatter.metric('Hits', hits);
    OutputFormatter.metric('Misses', misses);
    OutputFormatter.metric('Actual Hit Rate', `${actualHitRate}%`);
    OutputFormatter.newline();

    OutputFormatter.success('Cache statistics updated');
    OutputFormatter.info('Run "polln cache stats" to see updated statistics');
  });

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
