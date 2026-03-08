/**
 * Scaling CLI Commands
 */

import { Command } from 'commander';
import { Table } from 'console-table-printer';
import { ConfigManager } from '../utils/config.js';
import { OutputFormatter } from '../utils/output.js';
import { ScalingManager } from '../../scaling/manager.js';
import { createScalingSystem } from '../../scaling/index.js';
import type { ResourceMetrics } from '../../scaling/types.js';

/**
 * Scale Status Command
 */
export function scaleStatusCommand(): Command {
  const cmd = new Command('status');

  cmd.description('Show scaling status and metrics');
  cmd.option('-w, --watch', 'Watch mode - update continuously');
  cmd.option('-j, --json', 'Output as JSON');

  cmd.action(async (options) => {
    const config = ConfigManager.load();
    const output = new OutputFormatter(options);

    try {
      // Create scaling system
      const { manager } = createScalingSystem({
        dryRun: true,
      });

      // Get current metrics
      const metrics = manager.getCurrentMetrics();

      if (!metrics) {
        output.error('No metrics available');
        process.exit(1);
      }

      if (options.json) {
        output.json({
          metrics,
          stats: manager.getStats(),
          policies: manager.getPolicies(),
        });
      } else {
        // Display metrics table
        const metricsTable = new Table({
          title: 'Current Metrics',
          columns: [
            { name: 'metric', alignment: 'left' },
            { name: 'value', alignment: 'right' },
            { name: 'status', alignment: 'center' },
          ],
        });

        metricsTable.addRow({
          metric: 'CPU Usage',
          value: `${metrics.cpu.usage.toFixed(1)}%`,
          status: getStatus(metrics.cpu.usage),
        });

        metricsTable.addRow({
          metric: 'Memory Usage',
          value: `${metrics.memory.usage.toFixed(1)}%`,
          status: getStatus(metrics.memory.usage),
        });

        metricsTable.addRow({
          metric: 'Total Agents',
          value: metrics.agents.total.toString(),
          status: 'OK',
        });

        metricsTable.addRow({
          metric: 'Active Agents',
          value: metrics.agents.active.toString(),
          status: 'OK',
        });

        metricsTable.addRow({
          metric: 'Queue Depth',
          value: metrics.tasks.queueDepth.toString(),
          status: metrics.tasks.queueDepth > 100 ? 'WARNING' : 'OK',
        });

        metricsTable.addRow({
          metric: 'Avg Latency',
          value: `${metrics.tasks.averageLatency.toFixed(0)}ms`,
          status: metrics.tasks.averageLatency > 5000 ? 'WARNING' : 'OK',
        });

        metricsTable.renderTable();

        // Display policies table
        const policies = manager.getPolicies();
        const policyTable = new Table({
          title: 'Scaling Policies',
          columns: [
            { name: 'name', alignment: 'left' },
            { name: 'strategy', alignment: 'left' },
            { name: 'enabled', alignment: 'center' },
            { name: 'triggers', alignment: 'right' },
          ],
        });

        for (const policy of policies) {
          policyTable.addRow({
            name: policy.name,
            strategy: policy.strategy,
            enabled: policy.enabled ? '✓' : '✗',
            triggers: policy.triggers.length.toString(),
          });
        }

        policyTable.renderTable();

        // Display stats
        const stats = manager.getStats();
        const statsTable = new Table({
          title: 'Scaling Statistics',
          columns: [
            { name: 'metric', alignment: 'left' },
            { name: 'value', alignment: 'right' },
          ],
        });

        statsTable.addRow({
          metric: 'Total Events',
          value: stats.totalScalingEvents.toString(),
        });

        statsTable.addRow({
          metric: 'Scale Up Events',
          value: stats.scaleUpEvents.toString(),
        });

        statsTable.addRow({
          metric: 'Scale Down Events',
          value: stats.scaleDownEvents.toString(),
        });

        statsTable.addRow({
          metric: 'Failed Events',
          value: stats.failedEvents.toString(),
        });

        statsTable.addRow({
          metric: 'Avg Response Time',
          value: `${stats.averageResponseTime.toFixed(0)}ms`,
        });

        statsTable.renderTable();
      }

      manager.stop();
    } catch (error) {
      output.error(`Failed to get scaling status: ${error}`);
      process.exit(1);
    }
  });

  return cmd;
}

/**
 * Scale Policy Command
 */
export function scalePolicyCommand(): Command {
  const cmd = new Command('policy');

  cmd.description('Manage scaling policies');
  cmd.argument('[action]', 'Action to perform', 'list');
  cmd.option('-i, --id <id>', 'Policy ID');
  cmd.option('-e, --enable', 'Enable policy');
  cmd.option('-d, --disable', 'Disable policy');
  cmd.option('-j, --json', 'Output as JSON');

  cmd.action(async (action, options) => {
    const output = new OutputFormatter(options);

    try {
      const { manager } = createScalingSystem({
        dryRun: true,
      });

      const policies = manager.getPolicies();

      if (action === 'list') {
        if (options.json) {
          output.json(policies);
        } else {
          const table = new Table({
            title: 'Scaling Policies',
            columns: [
              { name: 'name', alignment: 'left' },
              { name: 'strategy', alignment: 'left' },
              { name: 'enabled', alignment: 'center' },
              { name: 'maxUp', alignment: 'right' },
              { name: 'maxDown', alignment: 'right' },
              { name: 'cooldown', alignment: 'right' },
            ],
          });

          for (const policy of policies) {
            table.addRow({
              name: policy.name,
              strategy: policy.strategy,
              enabled: policy.enabled ? '✓' : '✗',
              maxUp: policy.maxScaleUp.toString(),
              maxDown: policy.maxScaleDown.toString(),
              cooldown: `${policy.cooldown / 1000}s`,
            });
          }

          table.renderTable();
        }
      } else if (action === 'enable' || action === 'disable') {
        if (!options.id) {
          output.error('Policy ID required');
          process.exit(1);
        }

        manager.setPolicyEnabled(options.id, action === 'enable');
        output.success(`Policy ${options.id} ${action}d`);
      } else {
        output.error(`Unknown action: ${action}`);
        process.exit(1);
      }

      manager.stop();
    } catch (error) {
      output.error(`Failed to manage policies: ${error}`);
      process.exit(1);
    }
  });

  return cmd;
}

/**
 * Scale Manual Command
 */
export function scaleManualCommand(): Command {
  const cmd = new Command('manual');

  cmd.description('Manual scaling intervention');
  cmd.requiredOption('-t, --type <type>', 'Action type (spawn_agents, despawn_agents, etc.)');
  cmd.requiredOption('-m, --magnitude <number>', 'Magnitude (number of agents, etc.)', parseInt);
  cmd.option('--dry-run', 'Dry run (no actual scaling)');
  cmd.option('-j, --json', 'Output as JSON');

  cmd.action(async (options) => {
    const output = new OutputFormatter(options);

    try {
      const { manager } = createScalingSystem({
        dryRun: options.dryRun || false,
      });

      // Create mock metrics for manual scaling
      const mockMetrics: ResourceMetrics = {
        cpu: { usage: 50, available: 50, total: 100 },
        memory: { usage: 50, used: 8 * 1024 * 1024 * 1024, total: 16 * 1024 * 1024 * 1024, heapUsed: 0, heapTotal: 0 },
        network: { requestRate: 500, bandwidth: 1000000, connections: 50 },
        agents: { total: 10, active: 8, dormant: 2, spawning: 0, terminating: 0 },
        tasks: { queueDepth: 20, pending: 15, running: 8, completed: 100, failed: 5, averageLatency: 100 },
      };

      manager.updateMetrics(mockMetrics);

      // Execute manual scaling
      const decision = await manager.manualScale(
        options.type,
        options.magnitude,
        {}
      );

      if (options.json) {
        output.json(decision);
      } else {
        output.success(`Manual scaling initiated:`);
        output.info(`  Type: ${options.type}`);
        output.info(`  Magnitude: ${options.magnitude}`);
        output.info(`  Decision ID: ${decision.id}`);
        output.info(`  Status: ${decision.status}`);
      }

      manager.stop();
    } catch (error) {
      output.error(`Failed to execute manual scaling: ${error}`);
      process.exit(1);
    }
  });

  return cmd;
}

/**
 * Scale Predict Command
 */
export function scalePredictCommand(): Command {
  const cmd = new Command('predict');

  cmd.description('Predict future scaling needs');
  cmd.option('-h, --horizon <minutes>', 'Prediction horizon in minutes', '15');
  cmd.option('-j, --json', 'Output as JSON');

  cmd.action(async (options) => {
    const output = new OutputFormatter(options);

    try {
      const { manager } = createScalingSystem({
        dryRun: true,
        enablePredictive: true,
      });

      const horizon = parseInt(options.horizon) * 60 * 1000;

      // Get predictions
      const predictions = manager.getPredictions();

      if (options.json) {
        output.json(predictions);
      } else {
        if (predictions.length === 0) {
          output.info('No predictions available yet');
        } else {
          const table = new Table({
            title: 'Scaling Predictions',
            columns: [
              { name: 'time', alignment: 'left' },
              { name: 'horizon', alignment: 'right' },
              { name: 'confidence', alignment: 'right' },
              { name: 'action', alignment: 'left' },
            ],
          });

          for (const pred of predictions) {
            table.addRow({
              time: new Date(pred.timestamp).toLocaleTimeString(),
              horizon: `${pred.predictionHorizon / 60000}min`,
              confidence: `${(pred.confidence * 100).toFixed(0)}%`,
              action: pred.recommendedAction ? pred.recommendedAction.type : 'None',
            });
          }

          table.renderTable();
        }
      }

      manager.stop();
    } catch (error) {
      output.error(`Failed to get predictions: ${error}`);
      process.exit(1);
    }
  });

  return cmd;
}

/**
 * Scale History Command
 */
export function scaleHistoryCommand(): Command {
  const cmd = new Command('history');

  cmd.description('Show scaling event history');
  cmd.option('-n, --limit <number>', 'Number of events to show', '20');
  cmd.option('-j, --json', 'Output as JSON');

  cmd.action(async (options) => {
    const output = new OutputFormatter(options);

    try {
      const { manager } = createScalingSystem({
        dryRun: true,
      });

      const limit = parseInt(options.limit);
      const history = manager.getHistory(limit);

      if (options.json) {
        output.json(history);
      } else {
        if (history.length === 0) {
          output.info('No scaling events recorded yet');
        } else {
          const table = new Table({
            title: 'Scaling Event History',
            columns: [
              { name: 'time', alignment: 'left' },
              { name: 'type', alignment: 'left' },
              { name: 'policy', alignment: 'left' },
              { name: 'actions', alignment: 'right' },
              { name: 'confidence', alignment: 'right' },
            ],
          });

          for (const event of history) {
            table.addRow({
              time: new Date(event.timestamp).toLocaleString(),
              type: event.type,
              policy: event.policyId,
              actions: event.decision.actions.length.toString(),
              confidence: `${(event.decision.confidence * 100).toFixed(0)}%`,
            });
          }

          table.renderTable();
        }
      }

      manager.stop();
    } catch (error) {
      output.error(`Failed to get history: ${error}`);
      process.exit(1);
    }
  });

  return cmd;
}

/**
 * Scale command group
 */
export function scaleCommand(): Command {
  const cmd = new Command('scale');

  cmd.description('Scaling management commands');
  cmd.addCommand(scaleStatusCommand());
  cmd.addCommand(scalePolicyCommand());
  cmd.addCommand(scaleManualCommand());
  cmd.addCommand(scalePredictCommand());
  cmd.addCommand(scaleHistoryCommand());

  return cmd;
}

/**
 * Get status indicator
 */
function getStatus(value: number): string {
  if (value >= 90) return 'CRITICAL';
  if (value >= 70) return 'WARNING';
  return 'OK';
}
