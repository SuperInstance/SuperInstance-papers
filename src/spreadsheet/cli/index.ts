/**
 * POLLN Spreadsheet CLI - Entry Point
 *
 * Main entry point for the POLLN Spreadsheet CLI tool.
 * Exports the CLI class and provides a convenient run function.
 *
 * @module index
 */

import { POLLNCLI, cli } from './POLLNCLI.js';

/**
 * Run the CLI with provided arguments
 *
 * @param argv - Command line arguments (defaults to process.argv)
 * @returns Promise that resolves when CLI completes
 */
export async function run(argv?: string[]): Promise<void> {
  return cli.run(argv);
}

/**
 * Create a new CLI instance
 *
 * @returns New POLLNCLI instance
 */
export function createCLI(): POLLNCLI {
  return new POLLNCLI();
}

// Export main components
export { POLLNCLI } from './POLLNCLI.js';
export { SheetCommands } from './commands/SheetCommands.js';
export { CellCommands } from './commands/CellCommands.js';
export { ColonyCommands } from './commands/ColonyCommands.js';
export { ServerCommands } from './commands/ServerCommands.js';
export { OutputFormatter } from './utils/OutputFormatter.js';
export { ConfigManager } from './utils/ConfigManager.js';

// Export types
export type { PollnSheetConfig } from './utils/ConfigManager.js';

// Default export
export default cli;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cli.run().catch((error) => {
    console.error('CLI error:', error);
    process.exit(1);
  });
}
