/**
 * CLI Command: backup list
 * List available backups
 */

import { Command } from 'commander';
import { Table } from 'console-table-printer';

export const backupListCommand = new Command('backup:list');

backupListCommand.description('List available backups');

backupListCommand.option('-t, --type <type>', 'Filter by backup type');
backupListCommand.option('-s, --status <status>', 'Filter by status');
backupStoreCommand.option('--storage <backend>', 'Filter by storage backend');
backupListCommand.option('--limit <number>', 'Maximum number of backups to show', '50');
backupListCommand.option('--json', 'Output as JSON');

backupListCommand.action(async (options) => {
  const { backupList } = await import('../../utils/backup-handler.js');

  try {
    const backups = await backupList({
      type: options.type?.toUpperCase(),
      status: options.status?.toUpperCase(),
      storageBackend: options.storage?.toUpperCase(),
      limit: parseInt(options.limit, 10)
    });

    if (options.json) {
      console.log(JSON.stringify(backups, null, 2));
    } else {
      console.log(`\nFound ${backups.totalCount} backup(s)\n`);

      if (backups.backups.length === 0) {
        console.log('No backups found');
        return;
      }

      const table = new Table({
        columns: [
          { name: 'ID', alignment: 'left' },
          { name: 'Type', alignment: 'left' },
          { name: 'Status', alignment: 'left' },
          { name: 'Size', alignment: 'right' },
          { name: 'Created', alignment: 'left' },
          { name: 'Location', alignment: 'left' }
        ]
      });

      for (const backup of backups.backups) {
        table.addRow({
          ID: backup.id.substring(0, 8),
          Type: backup.type,
          Status: backup.status,
          Size: formatBytes(backup.sizeBytes),
          Created: new Date(backup.createdAt).toLocaleString(),
          Location: backup.storageBackend
        });
      }

      table.printTable();

      if (backups.hasMore) {
        console.log(`\nShowing ${backups.backups.length} of ${backups.totalCount} backups`);
      }
    }
  } catch (error) {
    console.error('✗ List backups failed');
    console.error(`  Error: ${error}`);
    process.exit(1);
  }
});

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)}${units[unitIndex]}`;
}

export { backupListCommand as default };
