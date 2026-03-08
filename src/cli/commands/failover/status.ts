/**
 * CLI Command: failover status
 * Show failover status and history
 */

import { Command } from 'commander';
import { Table } from 'console-table-printer';

export const failoverStatusCommand = new Command('failover:status');

failoverStatusCommand.description('Show failover system status');

failoverStatusCommand.option('--json', 'Output as JSON');
failoverStatusCommand.option('--history', 'Show failover history');
failoverStatusCommand.option('--limit <number>', 'Number of history entries to show', '10');

failoverStatusCommand.action(async (options) => {
  const { failoverStatus } = await import('../../utils/failover-handler.js');

  try {
    const status = await failoverStatus({
      includeHistory: options.history,
      historyLimit: parseInt(options.limit, 10)
    });

    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log('\n=== Failover Status ===\n');

      console.log(`Running: ${status.running ? 'Yes' : 'No'}`);
      console.log(`Mode: ${status.mode}`);
      console.log(`Auto-failover: ${status.autoFailover ? 'Enabled' : 'Disabled'}`);
      console.log(`Primary Region: ${status.primaryRegion}`);
      console.log(`Secondary Regions: ${status.secondaryRegions.join(', ') || 'None'}`);

      if (status.currentEvent) {
        console.log('\n=== Current Event ===\n');
        console.log(`ID: ${status.currentEvent.id}`);
        console.log(`Status: ${status.currentEvent.status}`);
        console.log(`Type: ${status.currentEvent.failureType}`);
        console.log(`Severity: ${status.currentEvent.severity}`);
        console.log(`Initiated: ${new Date(status.currentEvent.timestamp).toLocaleString()}`);
        console.log(`Reason: ${status.currentEvent.reason}`);
      } else {
        console.log('\nNo active failover event');
      }

      if (options.history && status.history.length > 0) {
        console.log('\n=== Failover History ===\n');

        const table = new Table({
          columns: [
            { name: 'Time', alignment: 'left' },
            { name: 'Type', alignment: 'left' },
            { name: 'Severity', alignment: 'left' },
            { name: 'Status', alignment: 'left' },
            { name: 'Reason', alignment: 'left' }
          ]
        });

        for (const event of status.history) {
          table.addRow({
            Time: new Date(event.timestamp).toLocaleString(),
            Type: event.failureType,
            Severity: event.severity,
            Status: event.status,
            Reason: event.reason.substring(0, 50) + (event.reason.length > 50 ? '...' : '')
          });
        }

        table.printTable();
      }
    }
  } catch (error) {
    console.error('✗ Failover status command failed');
    console.error(`  Error: ${error}`);
    process.exit(1);
  }
});

export { failoverStatusCommand as default };
