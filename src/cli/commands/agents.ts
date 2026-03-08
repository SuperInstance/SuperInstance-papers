/**
 * polln agents command group
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import { ConfigManager } from '../utils/config.js';
import { ColonyStateManager, type TileCategory } from '../utils/colony-state.js';
import { OutputFormatter } from '../utils/output.js';

export const agentsCommand = new Command('agents')
  .description('Manage colony agents');

// List agents
agentsCommand
  .command('list')
  .description('List all agents')
  .option('-t, --type <type>', 'Filter by agent type')
  .option('-s, --status <status>', 'Filter by status')
  .option('-j, --json', 'Output as JSON')
  .action((options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No colony found in current directory');
      process.exit(1);
    }

    const stateManager = new ColonyStateManager(config.getDataDir(), config.get('colonyId')!);
    let agents = stateManager.getAllAgents();

    // Apply filters
    if (options.type) {
      agents = agents.filter(a => a.type === options.type);
    }
    if (options.status) {
      agents = agents.filter(a => a.status === options.status);
    }

    if (options.json) {
      OutputFormatter.json(agents);
      return;
    }

    if (agents.length === 0) {
      OutputFormatter.info('No agents found');
      return;
    }

    OutputFormatter.header(`Agents (${agents.length})`);

    const tableData = agents.map(agent => [
      agent.id.substring(0, 8),
      OutputFormatter.agentType(agent.type),
      agent.category,
      agent.status.toUpperCase(),
      formatTimestamp(agent.createdAt),
      formatTimestamp(agent.lastActivity),
    ]);

    OutputFormatter.table(
      ['ID', 'Type', 'Category', 'Status', 'Created', 'Last Activity'],
      tableData
    );

    // Summary
    OutputFormatter.newline();
    OutputFormatter.info(`Total: ${agents.length} agents`);
    const activeCount = agents.filter(a => a.status === 'active').length;
    OutputFormatter.info(`Active: ${activeCount} agents`);
  });

// Spawn agent
agentsCommand
  .command('spawn')
  .description('Create a new agent')
  .argument('<type>', 'Agent type (task, role, core, meta)')
  .option('-c, --category <category>', 'Agent category', 'default')
  .option('-m, --metadata <json>', 'Metadata as JSON string')
  .option('--interactive', 'Interactive mode')
  .action(async (type, options) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No colony found in current directory');
      process.exit(1);
    }

    // Validate agent type
    const validTypes = ['task', 'role', 'core', 'meta'];
    if (!validTypes.includes(type)) {
      OutputFormatter.error(`Invalid agent type: ${type}`);
      OutputFormatter.info(`Valid types: ${validTypes.join(', ')}`);
      process.exit(1);
    }

    let category = options.category as TileCategory;
    let metadata: Record<string, unknown> = {};

    // Interactive mode
    if (options.interactive) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'category',
          message: 'Enter agent category:',
          default: category,
        },
        {
          type: 'confirm',
          name: 'addMetadata',
          message: 'Add metadata?',
          default: false,
        },
      ]);

      category = answers.category;

      if (answers.addMetadata) {
        const metadataAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'key',
            message: 'Enter metadata key (or press Enter to skip):',
          },
          {
            type: 'input',
            name: 'value',
            message: 'Enter metadata value:',
            when: (answers: any) => answers.key.trim().length > 0,
          },
        ]);

        if (metadataAnswers.key && metadataAnswers.value) {
          metadata[metadataAnswers.key] = metadataAnswers.value;
        }
      }
    } else if (options.metadata) {
      try {
        metadata = JSON.parse(options.metadata);
      } catch (error) {
        OutputFormatter.error('Invalid JSON metadata');
        process.exit(1);
      }
    }

    // Create agent
    const stateManager = new ColonyStateManager(config.getDataDir(), config.get('colonyId')!);
    const agent = stateManager.addAgent(type as any, category, metadata);

    OutputFormatter.success(`Agent spawned successfully`);
    OutputFormatter.newline();
    OutputFormatter.kv('ID', agent.id);
    OutputFormatter.kv('Type', agent.type.toUpperCase());
    OutputFormatter.kv('Category', agent.category);
    OutputFormatter.kv('Status', agent.status.toUpperCase());
    OutputFormatter.kv('Created', new Date(agent.createdAt).toLocaleString());
  });

// Kill agent
agentsCommand
  .command('kill')
  .description('Terminate an agent')
  .argument('<id>', 'Agent ID (or first 8+ characters)')
  .action((id) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No colony found in current directory');
      process.exit(1);
    }

    const stateManager = new ColonyStateManager(config.getDataDir(), config.get('colonyId')!);

    // Find agent by ID (supports partial match)
    const agent = stateManager.getAllAgents().find(a => a.id.startsWith(id));

    if (!agent) {
      OutputFormatter.error(`Agent not found: ${id}`);
      OutputFormatter.info('Use "polln agents list" to see all agents');
      process.exit(1);
    }

    if (agent.status !== 'active') {
      OutputFormatter.warning(`Agent is already ${agent.status}`);
      return;
    }

    const success = stateManager.terminateAgent(agent.id);

    if (success) {
      OutputFormatter.success(`Agent terminated: ${agent.id}`);
      OutputFormatter.info(`Type: ${agent.type.toUpperCase()}`);
      OutputFormatter.info(`Category: ${agent.category}`);
    } else {
      OutputFormatter.error(`Failed to terminate agent: ${agent.id}`);
    }
  });

// Show agent details
agentsCommand
  .command('inspect')
  .description('Show detailed information about an agent')
  .argument('<id>', 'Agent ID (or first 8+ characters)')
  .action((id) => {
    const config = new ConfigManager();

    if (!config.exists()) {
      OutputFormatter.error('No colony found in current directory');
      process.exit(1);
    }

    const stateManager = new ColonyStateManager(config.getDataDir(), config.get('colonyId')!);
    const agent = stateManager.getAllAgents().find(a => a.id.startsWith(id));

    if (!agent) {
      OutputFormatter.error(`Agent not found: ${id}`);
      process.exit(1);
    }

    OutputFormatter.header(`Agent Details: ${agent.id.substring(0, 8)}`);

    OutputFormatter.subheader('Basic Information');
    OutputFormatter.kv('ID', agent.id);
    OutputFormatter.kv('Type', agent.type.toUpperCase());
    OutputFormatter.kv('Category', agent.category);
    OutputFormatter.kv('Status', agent.status.toUpperCase());

    OutputFormatter.subheader('Timing');
    OutputFormatter.kv('Created', new Date(agent.createdAt).toLocaleString());
    OutputFormatter.kv('Last Activity', new Date(agent.lastActivity).toLocaleString());
    OutputFormatter.kv('Age', formatUptime(Date.now() - agent.createdAt));

    if (agent.metadata && Object.keys(agent.metadata).length > 0) {
      OutputFormatter.subheader('Metadata');
      Object.entries(agent.metadata).forEach(([key, value]) => {
        OutputFormatter.kv(key, String(value));
      });
    }
  });

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    return 'Just now';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}m ago`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}
