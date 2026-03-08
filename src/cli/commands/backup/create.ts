/**
 * CLI Command: backup create
 * Create a backup of the colony
 */

import { Command } from 'commander';

export const backupCreateCommand = new Command('backup:create');

backupCreateCommand.description('Create a backup of the colony');

backupCreateCommand.option('-t, --type <type>', 'Backup type (full, incremental, snapshot)', 'full');
backupCreateCommand.option('--tags <tags>', 'Comma-separated tags');
backupCreateCommand.option('--label <key=value>', 'Custom labels (can be used multiple times)', [], collectLabels);
backupCreateCommand.option('--reason <reason>', 'Reason for backup');
backupCreateCommand.option('--no-validate', 'Skip post-backup validation');

backupCreateCommand.action(async (options) => {
  const { backupCreate } = await import('../../utils/backup-handler.js');

  try {
    const result = await backupCreate({
      type: options.type.toUpperCase(),
      tags: options.tags ? options.tags.split(',').map(t => t.trim()) : [],
      labels: options.label,
      reason: options.reason,
      validate: options.validate
    });

    if (result.success) {
      console.log('✓ Backup created successfully');
      console.log(`  ID: ${result.metadata.id}`);
      console.log(`  Type: ${result.metadata.type}`);
      console.log(`  Size: ${formatBytes(result.metrics.sizeBytes)}`);
      console.log(`  Duration: ${formatDuration(result.metrics.duration)}`);
      console.log(`  Location: ${result.metadata.storageLocation}`);
    } else {
      console.error('✗ Backup failed');
      console.error(`  Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Backup command failed');
    console.error(`  Error: ${error}`);
    process.exit(1);
  }
});

function collectLabels(value: string, previous: string[]): string[] {
  const [key, val] = value.split('=');
  return [...previous, `${key}:${val}`];
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export { backupCreateCommand as default };
