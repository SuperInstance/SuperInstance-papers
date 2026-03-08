/**
 * POLLN CLI - Emergence Commands
 *
 * Commands for monitoring and managing emergent intelligence
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import chalk from 'chalk';
import {
  EmergenceDetector,
  EmergenceCatalog,
  EmergenceAnalyzer,
  EmergenceMetricsCalculator,
} from '../../core/emergence';
import {
  PressureSensor,
  FlowMonitor,
  ValveController,
  PumpManager,
  ReservoirManager,
} from '../../core/hydraulic';

// ========================================================================
// EMERGENCE METRICS COMMAND
// ========================================================================

export const emergenceMetricsCommand = new Command('emergence:metrics')
  .description('Show emergence metrics')
  .option('-w, --window <ms>', 'Time window to analyze', '3600000')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      // TODO: Connect to actual colony
      const detector = new EmergenceDetector();
      const metrics = detector.getCurrentMetrics();

      if (!metrics) {
        console.log(chalk.yellow('No emergence metrics available yet'));
        return;
      }

      if (options.json) {
        console.log(JSON.stringify(metrics, null, 2));
        return;
      }

      // Display metrics table
      console.log(chalk.bold('\n🌟 Emergence Metrics\n'));

      // Complexity metrics
      const complexityTable = new Table({
        head: [chalk.cyan('Metric'), chalk.cyan('Value')],
        colWidths: [30, 15],
      });

      complexityTable.push(
        ['Graph Entropy', metrics.complexity.graphEntropy.toFixed(3)],
        ['Pathway Diversity', metrics.complexity.pathwayDiversity.toFixed(3)],
        ['Functional Coupling', metrics.complexity.functionalCoupling.toFixed(3)],
        ['Structural Complexity', metrics.complexity.structuralComplexity.toFixed(3)],
      );

      console.log(chalk.bold('Complexity:'));
      console.log(complexityTable.toString());

      // Novelty metrics
      const noveltyTable = new Table({
        head: [chalk.cyan('Metric'), chalk.cyan('Value')],
        colWidths: [30, 15],
      });

      noveltyTable.push(
        ['Outcome Novelty', metrics.novelty.outcomeNovelty.toFixed(3)],
        ['Pathway Novelty', metrics.novelty.pathwayNovelty.toFixed(3)],
        ['Composition Novelty', metrics.novelty.compositionNovelty.toFixed(3)],
        ['Temporal Novelty', metrics.novelty.temporalNovelty.toFixed(3)],
      );

      console.log(chalk.bold('\nNovelty:'));
      console.log(noveltyTable.toString());

      // Synergy metrics
      const synergyTable = new Table({
        head: [chalk.cyan('Metric'), chalk.cyan('Value')],
        colWidths: [30, 15],
      });

      synergyTable.push(
        ['Redundancy', metrics.synergy.redundancy.toFixed(3)],
        ['Mutual Information', metrics.synergy.mutualInformation.toFixed(3)],
        ['Integration', metrics.synergy.integration.toFixed(3)],
        ['Emergence', metrics.synergy.emergence.toFixed(3)],
      );

      console.log(chalk.bold('\nSynergy:'));
      console.log(synergyTable.toString());

      // Overall score
      const scoreBar = createProgressBar(metrics.overallScore, 40);
      const scoreColor = metrics.overallScore > 0.7 ? chalk.green :
                        metrics.overallScore > 0.4 ? chalk.yellow :
                        chalk.red;

      console.log(chalk.bold('\nOverall Emergence Score:'));
      console.log(scoreColor(scoreBar + ` ${metrics.overallScore.toFixed(2)}`));

    } catch (error) {
      console.error(chalk.red('Error getting emergence metrics:'), error);
      process.exit(1);
    }
  });

// ========================================================================
// EMERGENCE CATALOG COMMAND
// ========================================================================

export const emergenceCatalogCommand = new Command('emergence:catalog')
  .description('List cataloged emergent abilities')
  .option('-c, --category <category>', 'Filter by category')
  .option('-t, --top <n>', 'Show top N abilities', '10')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      // TODO: Load from actual catalog
      const catalog = new EmergenceCatalog();
      const abilities = catalog.getAllAbilities();

      if (options.category) {
        const filtered = catalog.getAbilitiesByCategory(options.category.toUpperCase());
        displayAbilities(filtered, options);
      } else {
        const top = catalog.getTopAbilities(parseInt(options.top));
        displayAbilities(top, options);
      }

    } catch (error) {
      console.error(chalk.red('Error getting emergence catalog:'), error);
      process.exit(1);
    }
  });

function displayAbilities(abilities: any[], options: any): void {
  if (options.json) {
    console.log(JSON.stringify(abilities, null, 2));
    return;
  }

  if (abilities.length === 0) {
    console.log(chalk.yellow('No cataloged abilities found'));
    return;
  }

  console.log(chalk.bold(`\n📚 Emergent Abilities Catalog (${abilities.length} abilities)\n`));

  const table = new Table({
    head: [
      chalk.cyan('Name'),
      chalk.cyan('Category'),
      chalk.cyan('Score'),
      chalk.cyan('Usage'),
      chalk.cyan('Impact'),
    ],
    colWidths: [40, 15, 10, 10, 10],
  });

  for (const ability of abilities) {
    table.push([
      ability.name,
      ability.category,
      ability.validationScore.toFixed(2),
      ability.usageFrequency.toString(),
      ability.impactScore.toFixed(2),
    ]);
  }

  console.log(table.toString());
}

// ========================================================================
// HYDRAULIC STATUS COMMAND
// ========================================================================

export const hydraulicStatusCommand = new Command('hydraulic:status')
  .description('Show hydraulic system state')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      // TODO: Connect to actual colony
      const pressureSensor = new PressureSensor();
      const flowMonitor = new FlowMonitor();
      const valveController = new ValveController();
      const pumpManager = new PumpManager();

      const pressureStats = pressureSensor.getStats();
      const flowStats = flowMonitor.getStats();
      const valveStats = valveController.getStats();
      const pumpStats = pumpManager.getStats();

      if (options.json) {
        console.log(JSON.stringify({
          pressure: pressureStats,
          flow: flowStats,
          valves: valveStats,
          pumps: pumpStats,
        }, null, 2));
        return;
      }

      console.log(chalk.bold('\n💧 Hydraulic System Status\n'));

      // Pressure stats
      const pressureTable = new Table({
        head: [chalk.cyan('Metric'), chalk.cyan('Value')],
        colWidths: [30, 15],
      });

      pressureTable.push(
        ['Average Pressure', pressureStats.avgPressure.toFixed(3)],
        ['Max Pressure', pressureStats.maxPressure.toFixed(3)],
        ['Min Pressure', pressureStats.minPressure.toFixed(3)],
        ['Variance', pressureStats.variance.toFixed(3)],
      );

      console.log(chalk.bold('Pressure:'));
      console.log(pressureTable.toString());

      // Flow stats
      const flowTable = new Table({
        head: [chalk.cyan('Metric'), chalk.cyan('Value')],
        colWidths: [30, 15],
      });

      flowTable.push(
        ['Total Flow', flowStats.totalFlow.toFixed(3)],
        ['Average Flow Rate', flowStats.avgFlowRate.toFixed(3)],
        ['Max Flow Rate', flowStats.maxFlowRate.toFixed(3)],
        ['Active Pipes', flowStats.activePipes.toString()],
        ['Blocked Pipes', flowStats.blockedPipes.toString()],
      );

      console.log(chalk.bold('\nFlow:'));
      console.log(flowTable.toString());

      // Valve stats
      const valveTable = new Table({
        head: [chalk.cyan('Metric'), chalk.cyan('Value')],
        colWidths: [30, 15],
      });

      valveTable.push(
        ['Total Valves', valveStats.totalValves.toString()],
        ['Open Valves', valveStats.openValves.toString()],
        ['Closed Valves', valveStats.closedValves.toString()],
        ['Throttled Valves', valveStats.throttledValves.toString()],
        ['Avg Temperature', valveStats.avgTemperature.toFixed(3)],
        ['Avg Throughput', valveStats.avgThroughput.toFixed(1)],
      );

      console.log(chalk.bold('\nValves:'));
      console.log(valveTable.toString());

      // Pump stats
      const pumpTable = new Table({
        head: [chalk.cyan('Metric'), chalk.cyan('Value')],
        colWidths: [30, 15],
      });

      pumpTable.push(
        ['Total Pumps', pumpStats.totalPumps.toString()],
        ['Active Pumps', pumpStats.activePumps.toString()],
        ['Idle Pumps', pumpStats.idlePumps.toString()],
        ['Overheated Pumps', pumpStats.overheatedPumps.toString()],
        ['Avg Energy', pumpStats.avgEnergy.toFixed(1)],
        ['Avg Output', pumpStats.avgOutput.toFixed(3)],
        ['Total Activations', pumpStats.totalActivations.toString()],
      );

      console.log(chalk.bold('\nPumps:'));
      console.log(pumpTable.toString());

    } catch (error) {
      console.error(chalk.red('Error getting hydraulic status:'), error);
      process.exit(1);
    }
  });

// ========================================================================
// EMERGENCE WATCH COMMAND
// ========================================================================

export const emergenceWatchCommand = new Command('emergence:watch')
  .description('Monitor emergence in real-time')
  .option('-i, --interval <ms>', 'Update interval', '5000')
  .action(async (options) => {
    try {
      const interval = parseInt(options.interval);

      console.log(chalk.bold('\n🔍 Monitoring Emergence (Ctrl+C to stop)\n'));

      // TODO: Connect to actual colony and listen for events
      let tick = 0;

      const timer = setInterval(() => {
        tick++;

        // Simulate updates
        console.clear();
        console.log(chalk.bold(`\n🔍 Monitoring Emergence (Tick ${tick})\n`));

        const metricsTable = new Table({
          head: [chalk.cyan('Metric'), chalk.cyan('Value')],
          colWidths: [30, 15],
        });

        // Simulate metrics
        const complexity = 0.5 + Math.random() * 0.3;
        const novelty = 0.4 + Math.random() * 0.4;
        const synergy = 0.3 + Math.random() * 0.5;
        const overall = (complexity + novelty + synergy) / 3;

        metricsTable.push(
          ['Complexity', complexity.toFixed(3)],
          ['Novelty', novelty.toFixed(3)],
          ['Synergy', synergy.toFixed(3)],
          ['Overall', overall.toFixed(3)],
        );

        console.log(metricsTable.toString());

        const bar = createProgressBar(overall, 40);
        const color = overall > 0.7 ? chalk.green : overall > 0.4 ? chalk.yellow : chalk.red;
        console.log(color('\n' + bar));

        console.log(chalk.gray(`\nLast update: ${new Date().toISOString()}`));

      }, interval);

      // Handle cleanup
      process.on('SIGINT', () => {
        clearInterval(timer);
        console.log(chalk.yellow('\n\nMonitoring stopped'));
        process.exit(0);
      });

    } catch (error) {
      console.error(chalk.red('Error monitoring emergence:'), error);
      process.exit(1);
    }
  });

// ========================================================================
// UTILITY FUNCTIONS
// ========================================================================

function createProgressBar(value: number, width: number): string {
  const filled = Math.round(value * width);
  const empty = width - filled;
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

// ========================================================================
// EXPORT ALL COMMANDS
// ========================================================================

export const emergenceCommands = [
  emergenceMetricsCommand,
  emergenceCatalogCommand,
  hydraulicStatusCommand,
  emergenceWatchCommand,
];
