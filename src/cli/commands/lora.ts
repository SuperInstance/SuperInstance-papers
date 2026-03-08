/**
 * polln lora command group
 *
 * Commands for managing LoRA adapters and tool belts
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ConfigManager } from '../utils/config.js';
import { OutputFormatter } from '../utils/output.js';
import { LoRALibrary, LoRAToolBelt } from '../../core/lora/tool-belt.js';
import { ExpertRegistry, createDefaultRegistry } from '../../core/lora/expert-registry.js';
import { LoRAPipeline } from '../../core/lora/pipeline.js';
import { getAllExpertLoRAs } from '../../core/lora/experts/index.js';
import type { LoRALibraryConfig, LoRAAdapter } from '../../core/lora/types.js';

export const loraCommand = new Command('lora')
  .description('Manage LoRA adapters and tool belts');

// List available LoRAs
loraCommand
  .command('list')
  .description('List all available LoRA adapters')
  .option('-j, --json', 'Output as JSON')
  .option('--category <category>', 'Filter by category')
  .action(async (options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No colony found in current directory');
      process.exit(1);
    }

    // Get all expert LoRAs
    let loras = getAllExpertLoRAs();

    // Filter by category if specified
    if (options.category) {
      loras = loras.filter(l => l.trainingDomain.toLowerCase().includes(options.category.toLowerCase()));
    }

    if (options.json) {
      OutputFormatter.json(loras);
      return;
    }

    if (loras.length === 0) {
      OutputFormatter.info('No LoRA adapters found');
      return;
    }

    OutputFormatter.header(`LoRA Adapters (${loras.length})`);
    OutputFormatter.table(
      ['Name', 'Domain', 'Rank', 'Performance', 'Expertise'],
      loras.map((l) => [
        l.name,
        l.trainingDomain,
        l.rank.toString(),
        `${(l.avgPerformance * 100).toFixed(1)}%`,
        l.expertise.slice(0, 3).join(', ') + (l.expertise.length > 3 ? '...' : ''),
      ])
    );
  });

// Train new LoRA
loraCommand
  .command('train')
  .description('Train a new LoRA adapter')
  .requiredOption('-n, --name <name>', 'LoRA name')
  .requiredOption('-e, --expertise <expertise>', 'Comma-separated expertise tags')
  .option('-r, --rank <rank>', 'LoRA rank (default: 16)', '16')
  .option('-d, --data <path>', 'Training data file')
  .option('--examples <count>', 'Number of examples to generate from teacher', '1000')
  .option('--teacher <model>', 'Teacher model for distillation', 'gpt-4')
  .option('-o, --output <path>', 'Output directory', './loras')
  .action(async (options) => {
    OutputFormatter.header('Training LoRA Adapter');

    const pipeline = new LoRAPipeline(options.output);

    OutputFormatter.info(`Name: ${options.name}`);
    OutputFormatter.info(`Expertise: ${options.expertise}`);
    OutputFormatter.info(`Rank: ${options.rank}`);
    OutputFormatter.info(`Examples: ${options.examples}`);
    OutputFormatter.info(`Teacher: ${options.teacher}`);

    OutputFormatter.info('\nStarting training...');

    try {
      const result = await pipeline.runPipeline({
        teacherModel: options.teacher,
        expertise: options.expertise.split(',')[0].trim(),
        exampleCount: parseInt(options.examples),
        targetRank: parseInt(options.rank),
      });

      OutputFormatter.success(`\nTraining complete!`);
      OutputFormatter.info(`LoRA ID: ${result.lora.id}`);
      OutputFormatter.info(`Final loss: ${result.finalLoss.toFixed(4)}`);
      OutputFormatter.info(`Training time: ${(result.trainingTimeMs / 1000).toFixed(1)}s`);
    } catch (error) {
      OutputFormatter.error(`Training failed: ${error}`);
      process.exit(1);
    }
  });

// Benchmark LoRAs
loraCommand
  .command('benchmark')
  .description('Benchmark LoRA adapter performance')
  .option('-l, --lora <loraId>', 'Specific LoRA to benchmark')
  .option('-c, --category <category>', 'Benchmark all LoRAs in category')
  .option('-t, --tests <count>', 'Number of test iterations', '10')
  .action(async (options) => {
    OutputFormatter.header('LoRA Benchmark');

    const config = new ConfigManager();
    if (!config.exists()) {
      OutputFormatter.error('No colony found in current directory');
      process.exit(1);
    }

    let loras = getAllExpertLoRAs();

    // Filter if specified
    if (options.lora) {
      loras = loras.filter(l => l.id === options.lora || l.name.toLowerCase().includes(options.lora.toLowerCase()));
    }
    if (options.category) {
      loras = loras.filter(l => l.trainingDomain.toLowerCase().includes(options.category.toLowerCase()));
    }

    if (loras.length === 0) {
      OutputFormatter.info('No LoRAs to benchmark');
      return;
    }

    const tests = parseInt(options.tests);
    OutputFormatter.info(`Running ${tests} test iterations for ${loras.length} LoRA(s)...\n`);

    const results: Array<{ name: string; avgTime: number; throughput: number }> = [];

    for (const lora of loras) {
      const times: number[] = [];

      for (let i = 0; i < tests; i++) {
        const start = Date.now();

        // Simulated LoRA application (would be actual forward pass in production)
        const delta = lora instanceof Object && 'getDeltaWeights' in lora
          ? (lora as any).getDeltaWeights()
          : new Float32Array(1024 * 1024);

        const duration = Date.now() - start;
        times.push(duration);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const throughput = 1000 / avgTime; // Operations per second

      results.push({
        name: lora.name,
        avgTime,
        throughput,
      });
    }

    OutputFormatter.table(
      ['LoRA', 'Avg Time (ms)', 'Throughput (ops/s)'],
      results.map((r) => [
        r.name,
        r.avgTime.toFixed(2),
        r.throughput.toFixed(1),
      ])
    );
  });

// Distill from teacher model
loraCommand
  .command('distill')
  .description('Distill knowledge from a large teacher model into a LoRA')
  .requiredOption('-e, --expertise <expertise>', 'Expertise to distill')
  .option('-r, --rank <rank>', 'Target LoRA rank', '16')
  .option('-n, --examples <count>', 'Number of examples to generate', '5000')
  .option('-t, --teacher <model>', 'Teacher model', 'gpt-4')
  .option('-o, --output <path>', 'Output directory', './loras')
  .option('--temperature <temp>', 'Distillation temperature', '1.0')
  .action(async (options) => {
    OutputFormatter.header('Knowledge Distillation');

    const pipeline = new LoRAPipeline(options.output);

    OutputFormatter.info(`Expertise: ${options.expertise}`);
    OutputFormatter.info(`Teacher: ${options.teacher}`);
    OutputFormatter.info(`Target rank: ${options.rank}`);
    OutputFormatter.info(`Examples: ${options.examples}`);
    OutputFormatter.info(`Temperature: ${options.temperature}`);

    OutputFormatter.info('\nPhase 1: Generating training data from teacher...');
    OutputFormatter.info('Phase 2: Training LoRA adapter...');
    OutputFormatter.info('Phase 3: Validating adapter...');

    try {
      const result = await pipeline.runPipeline({
        teacherModel: options.teacher,
        expertise: options.expertise,
        exampleCount: parseInt(options.examples),
        targetRank: parseInt(options.rank),
        temperature: parseFloat(options.temperature),
      });

      OutputFormatter.success('\nDistillation complete!');
      OutputFormatter.info(`LoRA ID: ${result.lora.id}`);
      OutputFormatter.info(`Final validation loss: ${result.finalValLoss.toFixed(4)}`);

      // Output validation metrics
      for (const [metric, value] of result.validationMetrics.entries()) {
        OutputFormatter.info(`${metric}: ${(value * 100).toFixed(1)}%`);
      }
    } catch (error) {
      OutputFormatter.error(`Distillation failed: ${error}`);
      process.exit(1);
    }
  });

// Show LoRA library statistics
loraCommand
  .command('stats')
  .description('Show LoRA library statistics')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No colony found in current directory');
      process.exit(1);
    }

    const loraConfig: LoRALibraryConfig = {
      baseModelPath: 'base-1b',
      loraDirectory: join(config.getDataDir(), 'loras'),
      cacheSize: 5,
      defaultStrategy: 'linear',
      defaultNormalization: 'sum_to_1',
      maxLoRAsPerAgent: 3,
    };

    const library = new LoRALibrary(loraConfig);
    const registry = createDefaultRegistry();

    // Register expert LoRAs
    for (const lora of getAllExpertLoRAs()) {
      registry.registerExpert(lora, lora.trainingDomain);
    }

    const loraStats = {
      totalLoRAs: getAllExpertLoRAs().length,
      categories: registry.listCategories(),
      avgPerformance: registry.getStatistics().avgExpertPerformance,
      mostUsed: registry.getStatistics().mostUsedExperts,
    };

    if (options.json) {
      OutputFormatter.json(loraStats);
      return;
    }

    OutputFormatter.header('LoRA Library Statistics');

    OutputFormatter.info(`Total LoRAs: ${loraStats.totalLoRAs}`);
    OutputFormatter.info(`Categories: ${loraStats.categories.join(', ')}`);
    OutputFormatter.info(`Avg Performance: ${(loraStats.avgPerformance * 100).toFixed(1)}%`);

    OutputFormatter.subheader('\nMost Used LoRAs');
    if (loraStats.mostUsed.length > 0) {
      for (const expert of loraStats.mostUsed) {
        OutputFormatter.info(`  ${expert.name}: ${expert.useCount} uses`);
      }
    } else {
      OutputFormatter.info('  No usage data yet');
    }
  });

// Test LoRA composition
loraCommand
  .command('test-composition')
  .description('Test combining multiple LoRAs')
  .requiredOption('-l, --loras <loras>', 'Comma-separated LoRA names to combine')
  .option('-w, --weights <weights>', 'Comma-separated weights for each LoRA')
  .action(async (options) => {
    OutputFormatter.header('Testing LoRA Composition');

    const loraNames = options.loras.split(',').map((s: string) => s.trim());
    const weights = options.weights
      ? options.weights.split(',').map((s: string) => parseFloat(s.trim()))
      : loraNames.map(() => 1 / loraNames.length);

    if (weights.length !== loraNames.length) {
      OutputFormatter.error('Number of weights must match number of LoRAs');
      process.exit(1);
    }

    // Normalize weights
    const weightSum = weights.reduce((a: number, b: number) => a + b, 0);
    const normalizedWeights = weights.map((w: number) => w / weightSum);

    OutputFormatter.info('Composition:');
    for (let i = 0; i < loraNames.length; i++) {
      OutputFormatter.info(`  ${loraNames[i]}: ${(normalizedWeights[i] * 100).toFixed(1)}%`);
    }

    // Get LoRAs
    const allLoRAs = getAllExpertLoRAs();
    const selectedLoRAs = loraNames
      .map((name: string) => allLoRAs.find((l: LoRAAdapter) => l.name.toLowerCase().includes(name.toLowerCase())))
      .filter((l: LoRAAdapter | undefined): l is LoRAAdapter => l !== undefined);

    if (selectedLoRAs.length !== loraNames.length) {
      OutputFormatter.error('Some LoRAs not found');
      process.exit(1);
    }

    // Check for conflicts
    const conflicts: string[] = [];
    for (const lora of selectedLoRAs) {
      for (const conflictId of lora.conflictsWith) {
        const conflictExists = selectedLoRAs.some((l: LoRAAdapter) => l.id === conflictId);
        if (conflictExists) {
          conflicts.push(`${lora.name} conflicts with another selected LoRA`);
        }
      }
    }

    if (conflicts.length > 0) {
      OutputFormatter.error('Conflicts detected:');
      for (const conflict of conflicts) {
        OutputFormatter.error(`  ${conflict}`);
      }
      return;
    }

    OutputFormatter.success('\nNo conflicts detected. Composition is valid.');

    // Predict performance
    const predictedPerf = selectedLoRAs.reduce((sum: number, lora: LoRAAdapter, i: number) => {
      return sum + normalizedWeights[i] * lora.avgPerformance;
    }, 0);

    // Apply interference penalty
    const penalty = 1 - (0.05 * (selectedLoRAs.length - 1));
    const adjustedPerf = predictedPerf * penalty;

    OutputFormatter.info(`Predicted performance: ${(adjustedPerf * 100).toFixed(1)}%`);
    OutputFormatter.info(`Interference penalty: ${((1 - penalty) * 100).toFixed(1)}%`);
  });
