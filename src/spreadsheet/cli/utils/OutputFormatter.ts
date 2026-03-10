/**
 * Output Formatter - Terminal Display Utilities
 *
 * Provides colorful, formatted terminal output with tables,
 * progress bars, and various display styles.
 *
 * @module OutputFormatter
 */

import chalk from 'chalk';
import { table, TableUserOptions } from 'table';

/**
 * Spinner animation frames
 */
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Progress bar configuration
 */
interface ProgressBarOptions {
  width?: number;
  label?: string;
  completeChar?: string;
  incompleteChar?: string;
}

/**
 * Spinner state
 */
interface SpinnerState {
  frame: number;
  interval: NodeJS.Timeout | null;
  text: string;
}

/**
 * OutputFormatter class
 *
 * Static utility class for terminal formatting.
 */
export class OutputFormatter {
  private static spinnerState: SpinnerState = {
    frame: 0,
    interval: null,
    text: ''
  };

  /**
   * Print a success message
   *
   * @param message - Success message to display
   */
  static success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  /**
   * Print an error message
   *
   * @param message - Error message to display
   */
  static error(message: string): void {
    console.error(chalk.red('✗'), message);
  }

  /**
   * Print a warning message
   *
   * @param message - Warning message to display
   */
  static warning(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }

  /**
   * Print an info message
   *
   * @param message - Info message to display
   */
  static info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Print a header/title
   *
   * @param title - Header title
   */
  static header(title: string): void {
    console.log();
    console.log(chalk.bold.cyan('═══'), chalk.bold.cyan(title), chalk.bold.cyan('═══'));
    console.log();
  }

  /**
   * Print a subheader
   *
   * @param title - Subheader title
   */
  static subheader(title: string): void {
    console.log();
    console.log(chalk.bold.yellow(title));
    console.log(chalk.yellow('─'.repeat(title.length)));
  }

  /**
   * Print a key-value pair
   *
   * @param key - Key label
   * @param value - Value to display
   */
  static kv(key: string, value: string | number | boolean | undefined): void {
    const formattedKey = chalk.gray(`${key}:`);
    const formattedValue = chalk.white(value?.toString() || 'N/A');
    console.log(`  ${formattedKey} ${formattedValue}`);
  }

  /**
   * Print a list item
   *
   * @param item - List item text
   * @param indent - Indentation level (default: 0)
   */
  static list(item: string, indent: number = 0): void {
    const prefix = '  '.repeat(indent);
    console.log(`${prefix}${chalk.cyan('•')} ${item}`);
  }

  /**
   * Print a status indicator
   *
   * @param label - Status label
   * @param status - Status type
   */
  static status(label: string, status: 'active' | 'inactive' | 'pending' | 'error'): void {
    const colors = {
      active: chalk.green,
      inactive: chalk.gray,
      pending: chalk.yellow,
      error: chalk.red,
    };

    const icons = {
      active: '●',
      inactive: '○',
      pending: '◐',
      error: '●',
    };

    const coloredStatus = colors[status](status.toUpperCase());
    const coloredIcon = colors[status](icons[status]);
    console.log(`  ${coloredIcon} ${label}: ${coloredStatus}`);
  }

  /**
   * Print a formatted table
   *
   * @param headers - Table headers
   * @param rows - Table rows
   */
  static table(headers: string[], rows: string[][]): void {
    const tableData: (string | number)[][] = [headers, ...rows];

    const config: TableUserOptions = {
      border: {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',

        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',

        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│',

        joinBody: '─',
        joinJoin: '┼',
        joinLeft: '├',
        joinRight: '┤',

        headerJoin: '┼',
      }
    };

    try {
      const output = table(tableData, config);
      console.log(output);
    } catch (error) {
      // Fallback to simple table if table module fails
      this.simpleTable(headers, rows);
    }
  }

  /**
   * Simple table fallback
   *
   * @param headers - Table headers
   * @param rows - Table rows
   */
  private static simpleTable(headers: string[], rows: string[][]): void {
    // Calculate column widths
    const colWidths = headers.map((h, i) => {
      const maxRowWidth = Math.max(...rows.map(r => r[i]?.length || 0));
      return Math.max(h.length, maxRowWidth);
    });

    // Print header
    const headerRow = headers.map((h, i) =>
      chalk.bold(h.padEnd(colWidths[i]))
    ).join('  ');
    console.log(headerRow);

    // Print separator
    const separator = colWidths.map(w => '─'.repeat(w)).join('  ');
    console.log(chalk.gray(separator));

    // Print rows
    rows.forEach(row => {
      const rowStr = row.map((cell, i) =>
        cell.padEnd(colWidths[i])
      ).join('  ');
      console.log(rowStr);
    });
  }

  /**
   * Print a progress bar
   *
   * @param current - Current progress value
   * @param total - Total value
   * @param options - Progress bar options
   */
  static progressBar(
    current: number,
    total: number,
    options: ProgressBarOptions = {}
  ): void {
    const {
      width = 40,
      label = '',
      completeChar = '█',
      incompleteChar = '░'
    } = options;

    const percentage = Math.min(100, Math.max(0, (current / total) * 100));
    const filled = Math.round((width * percentage) / 100);
    const empty = width - filled;

    const bar = chalk.green(completeChar.repeat(filled)) +
                chalk.gray(incompleteChar.repeat(empty));

    if (label) {
      console.log(`  ${label}: ${bar} ${percentage.toFixed(1)}%`);
    } else {
      console.log(`  ${bar} ${percentage.toFixed(1)}%`);
    }
  }

  /**
   * Print a JSON object nicely formatted
   *
   * @param data - Data to stringify
   * @param indent - Indentation spaces (default: 2)
   */
  static json(data: unknown, indent: number = 2): void {
    const json = JSON.stringify(data, null, indent);
    const highlighted = this.syntaxHighlight(json);
    console.log(highlighted);
  }

  /**
   * Syntax highlight JSON
   *
   * @param json - JSON string
   */
  private static syntaxHighlight(json: string): string {
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'white';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'cyan'; // Key
        } else {
          cls = 'green'; // String
        }
      } else if (/true|false/.test(match)) {
        cls = 'yellow'; // Boolean
      } else if (/null/.test(match)) {
        cls = 'gray'; // Null
      } else if (!isNaN(Number(match))) {
        cls = 'magenta'; // Number
      }
      return (chalk as any)[cls](match);
    });
  }

  /**
   * Print a blank line
   */
  static newline(): void {
    console.log();
  }

  /**
   * Print a divider line
   *
   * @param character - Divider character (default: '─')
   * @param width - Divider width (default: 50)
   */
  static divider(character: string = '─', width: number = 50): void {
    console.log(chalk.gray(character.repeat(width)));
  }

  /**
   * Print a metric with label
   *
   * @param label - Metric label
   * @param value - Metric value
   * @param unit - Optional unit
   */
  static metric(label: string, value: string | number, unit?: string): void {
    const formattedLabel = chalk.gray(`${label}:`);
    const formattedValue = chalk.cyan(value.toString());
    const formattedUnit = unit ? chalk.gray(unit) : '';
    console.log(`  ${formattedLabel} ${formattedValue}${formattedUnit}`);
  }

  /**
   * Print agent type with color
   *
   * @param type - Agent type
   */
  static agentType(type: string): string {
    const colors: Record<string, any> = {
      task: chalk.blue,
      role: chalk.green,
      core: chalk.red,
      meta: chalk.magenta,
      analysis: chalk.cyan,
      prediction: chalk.yellow,
      optimization: chalk.green
    };
    return (colors[type] || chalk.white)(type.toUpperCase());
  }

  /**
   * Get formatted timestamp
   *
   * @returns Colored timestamp string
   */
  static timestamp(): string {
    return chalk.gray(new Date().toISOString());
  }

  /**
   * Start a spinner animation
   *
   * @param text - Spinner text
   */
  static spinnerStart(text: string): void {
    this.spinnerState.text = text;
    this.spinnerState.frame = 0;

    process.stdout.write(`\r${chalk.cyan(SPINNER_FRAMES[0])} ${text}`);

    this.spinnerState.interval = setInterval(() => {
      this.spinnerState.frame = (this.spinnerState.frame + 1) % SPINNER_FRAMES.length;
      process.stdout.write(
        `\r${chalk.cyan(SPINNER_FRAMES[this.spinnerState.frame])} ${this.spinnerState.text}`
      );
    }, 80);
  }

  /**
   * Stop the spinner animation
   *
   * @param success - Whether operation succeeded
   * @param text - Completion text
   */
  static spinnerStop(success: boolean, text?: string): void {
    if (this.spinnerState.interval) {
      clearInterval(this.spinnerState.interval);
      this.spinnerState.interval = null;
    }

    const icon = success ? chalk.green('✓') : chalk.red('✗');
    const message = text || this.spinnerState.text;

    process.stdout.write(`\r${icon} ${message}\n`);

    this.spinnerState.text = '';
    this.spinnerState.frame = 0;
  }

  /**
   * Update spinner text
   *
   * @param text - New spinner text
   */
  static spinnerText(text: string): void {
    this.spinnerState.text = text;
  }

  /**
   * Print command usage example
   *
   * @param command - Command syntax
   * @param description - Command description
   */
  static example(command: string, description: string): void {
    console.log();
    console.log(chalk.gray('  $'), chalk.cyan(command));
    console.log(chalk.gray(`    ${description}`));
  }

  /**
   * Print a box around text
   *
   * @param text - Text to box
   * @param title - Optional title
   */
  static box(text: string, title?: string): void {
    const lines = text.split('\n');
    const maxLength = Math.max(...lines.map(l => l.length));

    console.log();
    if (title) {
      const titlePadding = maxLength - title.length;
      console.log(chalk.gray('┌'), chalk.bold.cyan(title), ' '.repeat(titlePadding), chalk.gray('┐'));
    } else {
      console.log(chalk.gray('┌' + '─'.repeat(maxLength + 2) + '┐'));
    }

    lines.forEach(line => {
      const padding = maxLength - line.length;
      console.log(chalk.gray('│'), chalk.white(line), ' '.repeat(padding), chalk.gray('│'));
    });

    console.log(chalk.gray('└' + '─'.repeat(maxLength + 2) + '┘'));
    console.log();
  }

  /**
   * Print a warning box
   *
   * @param message - Warning message
   */
  static warningBox(message: string): void {
    console.log();
    console.log(chalk.yellow('┌', '─'.repeat(message.length + 2), '┐'));
    console.log(chalk.yellow('│'), chalk.bold.yellow(message), chalk.yellow('│'));
    console.log(chalk.yellow('└', '─'.repeat(message.length + 2), '┘'));
    console.log();
  }

  /**
   * Print an error box
   *
   * @param message - Error message
   */
  static errorBox(message: string): void {
    console.log();
    console.log(chalk.red('┌', '─'.repeat(message.length + 2), '┐'));
    console.log(chalk.red('│'), chalk.bold.red(message), chalk.red('│'));
    console.log(chalk.red('└', '─'.repeat(message.length + 2), '┘'));
    console.log();
  }

  /**
   * Clear the terminal
   */
  static clear(): void {
    console.clear();
  }

  /**
   * Print a checklist item
   *
   * @param text - Item text
   * @param checked - Whether checked
   */
  static checklist(text: string, checked: boolean): void {
    const icon = checked ? chalk.green('☑') : chalk.gray('☐');
    console.log(`  ${icon} ${text}`);
  }

  /**
   * Print a command palette hint
   *
   * @param key - Keyboard shortcut
   * @param action - Action description
   */
  static shortcut(key: string, action: string): void {
    console.log(`  ${chalk.gray('[')}${chalk.cyan(key)}${chalk.gray(']')} ${action}`);
  }

  /**
   * Print a diff-style comparison
   *
   * @param old - Old value
   * @param new - New value
   */
  static diff(oldStr: string, newStr: string): void {
    console.log();
    console.log(chalk.red('- ' + oldStr));
    console.log(chalk.green('+ ' + newStr));
    console.log();
  }
}
