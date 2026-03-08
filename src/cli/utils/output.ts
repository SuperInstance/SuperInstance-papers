/**
 * Output utilities for colorful terminal display
 */

import chalk from 'chalk';

export class OutputFormatter {
  /**
   * Print a success message
   */
  static success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  /**
   * Print an error message
   */
  static error(message: string): void {
    console.error(chalk.red('✗'), message);
  }

  /**
   * Print a warning message
   */
  static warning(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }

  /**
   * Print an info message
   */
  static info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Print a header/title
   */
  static header(title: string): void {
    console.log();
    console.log(chalk.bold.cyan('═══'), chalk.bold.cyan(title), chalk.bold.cyan('═══'));
    console.log();
  }

  /**
   * Print a subheader
   */
  static subheader(title: string): void {
    console.log();
    console.log(chalk.bold.yellow(title));
    console.log(chalk.yellow('─'.repeat(title.length)));
  }

  /**
   * Print a key-value pair
   */
  static kv(key: string, value: string | number | boolean): void {
    const formattedKey = chalk.gray(`${key}:`);
    const formattedValue = chalk.white(value.toString());
    console.log(`  ${formattedKey} ${formattedValue}`);
  }

  /**
   * Print a list item
   */
  static list(item: string, indent: number = 0): void {
    const prefix = '  '.repeat(indent);
    console.log(`${prefix}${chalk.cyan('•')} ${item}`);
  }

  /**
   * Print a status indicator
   */
  static status(label: string, status: 'active' | 'inactive' | 'pending' | 'error'): void {
    const colors = {
      active: chalk.green,
      inactive: chalk.gray,
      pending: chalk.yellow,
      error: chalk.red,
    };

    const icon = {
      active: '●',
      inactive: '○',
      pending: '◐',
      error: '●',
    };

    const coloredStatus = colors[status](status.toUpperCase());
    const coloredIcon = colors[status](icon[status]);
    console.log(`  ${coloredIcon} ${label}: ${coloredStatus}`);
  }

  /**
   * Print a table
   */
  static table(headers: string[], rows: string[][]): void {
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
   */
  static progressBar(current: number, total: number, width: number = 40): void {
    const percentage = Math.min(100, Math.max(0, (current / total) * 100));
    const filled = Math.round((width * percentage) / 100);
    const empty = width - filled;

    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('█'.repeat(empty));
    console.log(`  ${bar} ${percentage.toFixed(1)}%`);
  }

  /**
   * Print a JSON object nicely formatted
   */
  static json(data: unknown): void {
    console.log(JSON.stringify(data, null, 2));
  }

  /**
   * Print a blank line
   */
  static newline(): void {
    console.log();
  }

  /**
   * Print a divider line
   */
  static divider(): void {
    console.log(chalk.gray('─'.repeat(50)));
  }

  /**
   * Print a metric with label
   */
  static metric(label: string, value: string | number, unit?: string): void {
    const formattedLabel = chalk.gray(`${label}:`);
    const formattedValue = chalk.cyan(value.toString());
    const formattedUnit = unit ? chalk.gray(unit) : '';
    console.log(`  ${formattedLabel} ${formattedValue}${formattedUnit}`);
  }

  /**
   * Print agent type with color
   */
  static agentType(type: string): string {
    const colors = {
      task: chalk.blue,
      role: chalk.green,
      core: chalk.red,
      meta: chalk.magenta,
    };
    return (colors[type as keyof typeof colors] || chalk.white)(type.toUpperCase());
  }

  /**
   * Print timestamp
   */
  static timestamp(): string {
    return chalk.gray(new Date().toISOString());
  }
}
