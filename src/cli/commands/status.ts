/**
 * polln status command
 */

import { Command } from 'commander';
import { ConfigManager } from '../utils/config.js';
import { ColonyStateManager } from '../utils/colony-state.js';
import { OutputFormatter } from '../utils/output.js';

export const statusCommand = new Command('status')
  .description('Show colony health and statistics')
  .option('-j, --json', 'Output as JSON')
  .action((options) => {
    const config = new ConfigManager();

    // Check if initialized
    if (!config.exists()) {
      OutputFormatter.error('No colony found in current directory');
      OutputFormatter.info('Run "polln init" to initialize a new colony');
      process.exit(1);
    }

    const stateManager = new ColonyStateManager(config.getDataDir(), config.get('colonyId')!);
    const state = stateManager.getState();
    const health = stateManager.getHealth();
    const appConfig = config.getAll();

    if (options.json) {
      OutputFormatter.json({
        colony: {
          id: state.colonyId,
          name: state.colonyName,
          createdAt: state.createdAt,
          uptime: health.uptime,
        },
        health: health.status,
        stats: state.stats,
        cache: state.cache,
        config: appConfig,
      });
      return;
    }

    // Pretty output
    OutputFormatter.header(`Colony Status: ${state.colonyName}`);

    // Colony Info
    OutputFormatter.subheader('Colony Information');
    OutputFormatter.kv('ID', state.colonyId);
    OutputFormatter.kv('Status', health.status.toUpperCase());
    OutputFormatter.kv('Uptime', formatUptime(health.uptime));
    OutputFormatter.kv('Created', new Date(state.createdAt).toLocaleString());
    OutputFormatter.kv('Last Update', new Date(state.lastUpdate).toLocaleString());

    // Statistics
    OutputFormatter.subheader('Statistics');
    OutputFormatter.metric('Total Agents', state.stats.totalAgents);
    OutputFormatter.metric('Active Agents', state.stats.activeAgents);
    OutputFormatter.metric('Total Dreams', state.stats.totalDreams);
    OutputFormatter.metric('Total Syncs', state.stats.totalSyncs);
    OutputFormatter.metric('Activity Ratio', `${(health.agentRatio * 100).toFixed(1)}%`);

    // Cache Statistics
    OutputFormatter.subheader('Cache');
    OutputFormatter.metric('Size', state.cache.size, 'entries');
    OutputFormatter.metric('Hits', state.cache.hits);
    OutputFormatter.metric('Misses', state.cache.misses);
    const hitRate = state.cache.hits + state.cache.misses > 0
      ? (state.cache.hits / (state.cache.hits + state.cache.misses) * 100).toFixed(1)
      : '0.0';
    OutputFormatter.metric('Hit Rate', `${hitRate}%`);
    if (state.cache.lastClear) {
      OutputFormatter.kv('Last Cleared', new Date(state.cache.lastClear).toLocaleString());
    }

    // Configuration
    OutputFormatter.subheader('Configuration');
    OutputFormatter.status('Federated Learning', appConfig.federation?.enabled ? 'active' : 'inactive');
    OutputFormatter.status('Dream Optimization', appConfig.dreaming?.enabled ? 'active' : 'inactive');
    OutputFormatter.kv('Max Agents', appConfig.agents?.maxCount || 100);
    OutputFormatter.kv('Default Agent Type', (appConfig.agents?.defaultType || 'task').toUpperCase());
    OutputFormatter.kv('Log Level', (appConfig.logging?.level || 'info').toUpperCase());

    // Health indicator
    OutputFormatter.newline();
    if (health.status === 'healthy') {
      OutputFormatter.success('Colony is healthy');
    } else if (health.status === 'warning') {
      OutputFormatter.warning('Colony needs attention');
    } else {
      OutputFormatter.error('Colony is in critical state');
    }
  });

function formatUptime(ms: number): string {
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
