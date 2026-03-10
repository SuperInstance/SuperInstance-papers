/**
 * POLLN Spreadsheet CLI - Main Entry Point
 *
 * Comprehensive CLI tool for POLLN spreadsheet operations and management.
 * Provides commands for sheet management, cell operations, colony management,
 * and server control.
 *
 * @module POLLNCLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from './utils/ConfigManager.js';
import { OutputFormatter } from './utils/OutputFormatter.js';

// Import command modules
import { SheetCommands } from './commands/SheetCommands.js';
import { CellCommands } from './commands/CellCommands.js';
import { ColonyCommands } from './commands/ColonyCommands.js';
import { ServerCommands } from './commands/ServerCommands.js';

/**
 * POLLNCLI - Main CLI class
 *
 * Handles command parsing, routing, and configuration management.
 */
export class POLLNCLI {
  private program: Command;
  private config: ConfigManager;
  private sheetCommands: SheetCommands;
  private cellCommands: CellCommands;
  private colonyCommands: ColonyCommands;
  private serverCommands: ServerCommands;

  constructor() {
    this.program = new Command();
    this.config = new ConfigManager();
    this.sheetCommands = new SheetCommands(this.config);
    this.cellCommands = new CellCommands(this.config);
    this.colonyCommands = new ColonyCommands(this.config);
    this.serverCommands = new ServerCommands(this.config);

    this.setupProgram();
  }

  /**
   * Setup the main program structure
   */
  private setupProgram(): void {
    // Program metadata
    this.program
      .name('polln-sheet')
      .description('POLLN Spreadsheet CLI - Manage living spreadsheets with intelligent cells')
      .version('0.1.0')
      .addHelpText('beforeAll', this.getWelcomeText());

    // Global options
    this.program
      .option('-c, --config <path>', 'Path to configuration file')
      .option('-v, --verbose', 'Enable verbose output')
      .option('-q, --quiet', 'Quiet mode (minimal output)')
      .option('--json', 'Output in JSON format')
      .option('--no-color', 'Disable colored output')
      .hook('preAction', (thisCommand) => this.handlePreAction(thisCommand));

    // Add command groups
    this.setupSheetCommands();
    this.setupCellCommands();
    this.setupColonyCommands();
    this.setupServerCommands();
    this.setupUtilityCommands();
  }

  /**
   * Handle pre-action hooks for global options
   */
  private handlePreAction(thisCommand: Command): void {
    const options = thisCommand.opts();

    // Handle custom config path
    if (options.config) {
      this.config = new ConfigManager(options.config);
    }

    // Handle verbose/quiet modes
    if (options.verbose) {
      process.env.POLLN_LOG_LEVEL = 'debug';
    } else if (options.quiet) {
      process.env.POLLN_LOG_LEVEL = 'error';
    }

    // Handle JSON output mode
    if (options.json) {
      process.env.POLLN_JSON_OUTPUT = 'true';
    }
  }

  /**
   * Setup sheet management commands
   */
  private setupSheetCommands(): void {
    const sheetCmd = this.program
      .command('sheet')
      .description('Spreadsheet management commands');

    // Create new spreadsheet
    sheetCmd
      .command('create <name>')
      .description('Create a new spreadsheet')
      .option('-d, --description <text>', 'Spreadsheet description')
      .option('-r, --rows <number>', 'Number of rows', '1000')
      .option('-c, --cols <number>', 'Number of columns', '26')
      .option('--template <type>', 'Use template (basic, financial, analytics)', 'basic')
      .action((name, options) => this.sheetCommands.create(name, options));

    // List spreadsheets
    sheetCmd
      .command('list')
      .description('List all spreadsheets')
      .option('-a, --all', 'Include archived spreadsheets')
      .option('--sort <field>', 'Sort by field (name, created, modified)', 'modified')
      .action((options) => this.sheetCommands.list(options));

    // Show spreadsheet info
    sheetCmd
      .command('info <id>')
      .description('Show detailed spreadsheet information')
      .option('--stats', 'Include statistics')
      .action((id, options) => this.sheetCommands.info(id, options));

    // Delete spreadsheet
    sheetCmd
      .command('delete <id>')
      .description('Delete a spreadsheet')
      .option('-f, --force', 'Force deletion without confirmation')
      .option('--archive', 'Archive instead of deleting')
      .action((id, options) => this.sheetCommands.delete(id, options));

    // Duplicate spreadsheet
    sheetCmd
      .command('duplicate <id> <newName>')
      .description('Duplicate a spreadsheet')
      .option('--include-data', 'Include cell data')
      .option('--include-formulas', 'Include formulas')
      .action((id, newName, options) => this.sheetCommands.duplicate(id, newName, options));

    // Export spreadsheet
    sheetCmd
      .command('export <id>')
      .description('Export spreadsheet')
      .option('-f, --format <type>', 'Export format (json, csv, xlsx, pdf)', 'json')
      .option('-o, --output <path>', 'Output file path')
      .action((id, options) => this.sheetCommands.export(id, options));

    // Import spreadsheet
    sheetCmd
      .command('import <file>')
      .description('Import spreadsheet from file')
      .option('-n, --name <name>', 'Spreadsheet name')
      .option('--format <type>', 'File format (auto, json, csv, xlsx)', 'auto')
      .action((file, options) => this.sheetCommands.import(file, options));
  }

  /**
   * Setup cell operation commands
   */
  private setupCellCommands(): void {
    const cellCmd = this.program
      .command('cell')
      .description('Cell operations and queries');

    // Read cell value
    cellCmd
      .command('get <sheetId> <cellRef>')
      .description('Get cell value and metadata')
      .option('--history', 'Include value history')
      .option('--dependencies', 'Show cell dependencies')
      .action((sheetId, cellRef, options) => this.cellCommands.get(sheetId, cellRef, options));

    // Set cell value
    cellCmd
      .command('set <sheetId> <cellRef> <value>')
      .description('Set cell value')
      .option('-t, --type <type>', 'Value type (auto, string, number, boolean, formula)', 'auto')
      .option('--formula', 'Treat value as formula')
      .option('--no-calculate', 'Don\'t recalculate dependencies')
      .action((sheetId, cellRef, value, options) => this.cellCommands.set(sheetId, cellRef, value, options));

    // Batch operations
    cellCmd
      .command('batch <sheetId>')
      .description('Perform batch cell operations')
      .option('-f, --file <path>', 'Batch operations file (JSON)')
      .option('--json <json>', 'Batch operations as JSON string')
      .action((sheetId, options) => this.cellCommands.batch(sheetId, options));

    // Query cells
    cellCmd
      .command('query <sheetId>')
      .description('Query cells by criteria')
      .option('--type <type>', 'Filter by cell type')
      .option('--value <pattern>', 'Filter by value pattern')
      .option('--formula <pattern>', 'Filter by formula pattern')
      .option('--modified <date>', 'Modified since date')
      .option('--limit <number>', 'Limit results', '100')
      .action((sheetId, options) => this.cellCommands.query(sheetId, options));

    // Show cell dependencies
    cellCmd
      .command('deps <sheetId> <cellRef>')
      .description('Show cell dependencies (dependents and precedents)')
      .option('--tree', 'Show dependency tree')
      .option('--circular', 'Check for circular references')
      .action((sheetId, cellRef, options) => this.cellCommands.dependencies(sheetId, cellRef, options));

    // Evaluate formula
    cellCmd
      .command('eval <sheetId> <cellRef>')
      .description('Evaluate cell formula')
      .option('--debug', 'Show evaluation steps')
      .option('--trace', 'Trace evaluation path')
      .action((sheetId, cellRef, options) => this.cellCommands.evaluate(sheetId, cellRef, options));

    // Watch cell changes
    cellCmd
      .command('watch <sheetId> <cellRef>')
      .description('Watch cell for changes')
      .option('-t, --timeout <ms>', 'Watch timeout (ms)', '30000')
      .option('--once', 'Wait for single change then exit')
      .action((sheetId, cellRef, options) => this.cellCommands.watch(sheetId, cellRef, options));
  }

  /**
   * Setup colony management commands
   */
  private setupColonyCommands(): void {
    const colonyCmd = this.program
      .command('colony')
      .description('Colony management commands');

    // Create colony
    colonyCmd
      .command('create <name>')
      .description('Create a new agent colony')
      .option('-s, --sheet <id>', 'Associate with spreadsheet')
      .option('-t, --type <type>', 'Colony type (analysis, prediction, optimization)', 'analysis')
      .option('--agents <number>', 'Initial agent count', '5')
      .action((name, options) => this.colonyCommands.create(name, options));

    // Deploy agents
    colonyCmd
      .command('deploy <colonyId>')
      .description('Deploy agents to colony')
      .option('-t, --type <type>', 'Agent type to deploy')
      .option('-c, --count <number>', 'Number of agents to deploy', '1')
      .option('--config <path>', 'Agent configuration file')
      .action((colonyId, options) => this.colonyCommands.deploy(colonyId, options));

    // Monitor colony
    colonyCmd
      .command('monitor <colonyId>')
      .description('Monitor colony activity')
      .option('-r, --refresh <ms>', 'Refresh interval (ms)', '1000')
      .option('--metrics', 'Show detailed metrics')
      .option('--stream', 'Stream updates continuously')
      .action((colonyId, options) => this.colonyCommands.monitor(colonyId, options));

    // Show colony metrics
    colonyCmd
      .command('metrics <colonyId>')
      .description('Get colony metrics')
      .option('-p, --period <duration>', 'Time period (1h, 24h, 7d)', '1h')
      .option('--format <type>', 'Output format (table, json, csv)', 'table')
      .action((colonyId, options) => this.colonyCommands.metrics(colonyId, options));

    // Stop colony
    colonyCmd
      .command('stop <colonyId>')
      .description('Stop a colony')
      .option('-f, --force', 'Force stop without waiting')
      .option('--save', 'Save state before stopping')
      .action((colonyId, options) => this.colonyCommands.stop(colonyId, options));

    // Colony configuration
    colonyCmd
      .command('config <colonyId>')
      .description('Manage colony configuration')
      .option('--get <key>', 'Get configuration value')
      .option('--set <key=value>', 'Set configuration value')
      .option('--list', 'List all configuration')
      .action((colonyId, options) => this.colonyCommands.config(colonyId, options));

    // List colonies
    colonyCmd
      .command('list')
      .description('List all colonies')
      .option('-a, --all', 'Include stopped colonies')
      .option('--sheet <id>', 'Filter by spreadsheet')
      .action((options) => this.colonyCommands.list(options));
  }

  /**
   * Setup server management commands
   */
  private setupServerCommands(): void {
    const serverCmd = this.program
      .command('server')
      .description('Server management commands');

    // Start development server
    serverCmd
      .command('dev')
      .description('Start development server')
      .option('-p, --port <number>', 'Port number', '3000')
      .option('-h, --host <address>', 'Host address', 'localhost')
      .option('--hot-reload', 'Enable hot reload')
      .option('--inspect', 'Enable inspector')
      .action((options) => this.serverCommands.dev(options));

    // Start production server
    serverCmd
      .command('start')
      .description('Start production server')
      .option('-p, --port <number>', 'Port number', '8080')
      .option('-w, --workers <number>', 'Number of workers', '4')
      .option('--cluster', 'Enable cluster mode')
      .action((options) => this.serverCommands.start(options));

    // Server health check
    serverCmd
      .command('health')
      .description('Check server health')
      .option('-u, --url <url>', 'Server URL', 'http://localhost:8080')
      .option('--verbose', 'Detailed health information')
      .action((options) => this.serverCommands.health(options));

    // Server statistics
    serverCmd
      .command('stats')
      .description('Get server statistics')
      .option('-u, --url <url>', 'Server URL', 'http://localhost:8080')
      .option('--live', 'Live statistics update')
      .action((options) => this.serverCommands.stats(options));

    // Log management
    serverCmd
      .command('logs')
      .description('View server logs')
      .option('-f, --follow', 'Follow log output')
      .option('-n, --lines <number>', 'Number of lines', '100')
      .option('--level <level>', 'Log level filter')
      .action((options) => this.serverCommands.logs(options));
  }

  /**
   * Setup utility commands
   */
  private setupUtilityCommands(): void {
    // Config command
    this.program
      .command('config')
      .description('Manage POLLN configuration')
      .option('-s, --set <key=value>', 'Set configuration value')
      .option('-g, --get <key>', 'Get configuration value')
      .option('-l, --list', 'List all configuration')
      .option('--edit', 'Open config in editor')
      .option('--validate', 'Validate configuration')
      .action((options) => this.handleConfig(options));

    // Interactive mode
    this.program
      .command('interactive')
      .alias('i')
      .description('Start interactive mode')
      .action(() => this.startInteractiveMode());

    // Version command
    this.program
      .command('version')
      .description('Show detailed version information')
      .action(() => this.showVersion());

    // Help enhancements
    this.program
      .command('help')
      .option('-d, --detailed', 'Show detailed help with examples')
      .action((options) => {
        if (options.detailed) {
          this.showDetailedHelp();
        } else {
          this.program.help();
        }
      });
  }

  /**
   * Handle configuration commands
   */
  private handleConfig(options: any): void {
    if (options.list) {
      OutputFormatter.header('POLLN Configuration');
      const config = this.config.getAll();
      OutputFormatter.json(config);
      return;
    }

    if (options.get) {
      const value = this.config.get(options.get);
      if (value !== undefined) {
        OutputFormatter.json(value);
      } else {
        OutputFormatter.error(`Configuration key not found: ${options.get}`);
        process.exit(1);
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
        let parsedValue: unknown = value;
        if (value.startsWith('{') || value.startsWith('[') || value === 'true' || value === 'false') {
          parsedValue = JSON.parse(value);
        }

        this.config.set(key as any, parsedValue as any);
        this.config.save();
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
      spawn(editor, [this.config.getPath()], { stdio: 'inherit' });
      return;
    }

    if (options.validate) {
      const valid = this.config.validate();
      if (valid) {
        OutputFormatter.success('Configuration is valid');
      } else {
        OutputFormatter.error('Configuration validation failed');
        process.exit(1);
      }
      return;
    }

    // Default: show config location
    OutputFormatter.info(`Config file: ${this.config.getPath()}`);
    OutputFormatter.info('Use --list to show all configuration');
  }

  /**
   * Start interactive mode
   */
  private startInteractiveMode(): void {
    OutputFormatter.header('POLLN Interactive Mode');
    OutputFormatter.info('Type "help" for available commands');
    OutputFormatter.info('Type "exit" to quit');
    OutputFormatter.divider();

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('polln> ')
    });

    rl.prompt();

    rl.on('line', (line: string) => {
      const input = line.trim();

      if (input === 'exit') {
        OutputFormatter.info('Goodbye!');
        rl.close();
        return;
      }

      if (input === 'help') {
        OutputFormatter.subheader('Interactive Commands');
        OutputFormatter.list('sheet list - List spreadsheets');
        OutputFormatter.list('cell get <id> <ref> - Get cell value');
        OutputFormatter.list('colony list - List colonies');
        OutputFormatter.list('server health - Check server health');
        OutputFormatter.list('exit - Exit interactive mode');
      } else if (input) {
        OutputFormatter.info(`Executing: ${input}`);
        // Parse and execute command
        this.program.parse(['node', 'polln-sheet', ...input.split(' ')]);
      }

      rl.prompt();
    });

    rl.on('close', () => {
      process.exit(0);
    });
  }

  /**
   * Show detailed version information
   */
  private showVersion(): void {
    OutputFormatter.header('POLLN Spreadsheet CLI');
    OutputFormatter.kv('Version', '0.1.0');
    OutputFormatter.kv('Node.js', process.version);
    OutputFormatter.kv('Platform', `${process.platform} ${process.arch}`);
    OutputFormatter.kv('Config', this.config.getPath());
    OutputFormatter.newline();
    OutputFormatter.info('For more information, visit: https://github.com/SuperInstance/polln');
  }

  /**
   * Show detailed help with examples
   */
  private showDetailedHelp(): void {
    OutputFormatter.header('POLLN Spreadsheet CLI - Detailed Help');

    OutputFormatter.subheader('Getting Started');
    OutputFormatter.list('Create a spreadsheet: polln-sheet sheet create my-sheet');
    OutputFormatter.list('Set a cell value: polln-sheet cell set <id> A1 "Hello World"');
    OutputFormatter.list('Create a colony: polln-sheet colony create my-colony --sheet <id>');
    OutputFormatter.list('Start dev server: polln-sheet server dev');
    OutputFormatter.newline();

    OutputFormatter.subheader('Sheet Management');
    OutputFormatter.list('polln-sheet sheet create <name> - Create new spreadsheet');
    OutputFormatter.list('polln-sheet sheet list - List all spreadsheets');
    OutputFormatter.list('polln-sheet sheet info <id> - Show sheet details');
    OutputFormatter.list('polln-sheet sheet export <id> -f xlsx - Export to Excel');
    OutputFormatter.list('polln-sheet sheet import data.csv - Import from CSV');
    OutputFormatter.newline();

    OutputFormatter.subheader('Cell Operations');
    OutputFormatter.list('polln-sheet cell get <id> A1 - Get cell value');
    OutputFormatter.list('polln-sheet cell set <id> A1 42 - Set cell value');
    OutputFormatter.list('polln-sheet cell set <id> B1 "=A1*2" --formula - Set formula');
    OutputFormatter.list('polln-sheet cell query <id> --type formula - Query cells');
    OutputFormatter.list('polln-sheet cell deps <id> A1 --tree - Show dependencies');
    OutputFormatter.newline();

    OutputFormatter.subheader('Colony Management');
    OutputFormatter.list('polln-sheet colony create <name> --sheet <id> - Create colony');
    OutputFormatter.list('polln-sheet colony deploy <id> --type analysis - Deploy agents');
    OutputFormatter.list('polln-sheet colony monitor <id> --stream - Monitor colony');
    OutputFormatter.list('polln-sheet colony metrics <id> --period 24h - Get metrics');
    OutputFormatter.newline();

    OutputFormatter.subheader('Server Management');
    OutputFormatter.list('polln-sheet server dev - Start development server');
    OutputFormatter.list('polln-sheet server start -w 4 --cluster - Start production');
    OutputFormatter.list('polln-sheet server health - Check server health');
    OutputFormatter.list('polln-sheet server logs --follow - View logs');
    OutputFormatter.newline();

    OutputFormatter.subheader('Examples');
    OutputFormatter.list('Financial spreadsheet:', 1);
    OutputFormatter.list('polln-sheet sheet create finances --template financial', 2);
    OutputFormatter.newline();
    OutputFormatter.list('Batch cell update:', 1);
    OutputFormatter.list('polln-sheet cell batch sheet-id --file updates.json', 2);
    OutputFormatter.newline();
    OutputFormatter.list('Analysis colony:', 1);
    OutputFormatter.list('polln-sheet colony create analyzer --sheet sheet-id -t analysis --agents 10', 2);
    OutputFormatter.newline();
  }

  /**
   * Get welcome text
   */
  private getWelcomeText(): string {
    return `
${chalk.cyan('╔════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('POLLN Spreadsheet CLI')} ${chalk.gray('- Living Cells, Intelligent Sheets')}  ${chalk.cyan('║')}
${chalk.cyan('╚════════════════════════════════════════════════════════════╝')}
    `;
  }

  /**
   * Parse and execute CLI commands
   */
  public async run(argv?: string[]): Promise<void> {
    try {
      await this.program.parseAsync(argv || process.argv);
    } catch (error) {
      if (error instanceof Error) {
        OutputFormatter.error(error.message);
        if (process.env.POLLN_LOG_LEVEL === 'debug') {
          console.error(error.stack);
        }
      }
      process.exit(1);
    }
  }
}

// Export instance
export const cli = new POLLNCLI();

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cli.run();
}
