/**
 * CLI Command: failover trigger
 * Trigger manual failover
 */

import { Command } from 'commander';

export const failoverTriggerCommand = new Command('failover:trigger');

failoverTriggerCommand.description('Trigger manual failover to another region');

failoverTriggerCommand.argument('<region>', 'Target region for failover');
failoverTriggerCommand.option('-r, --reason <reason>', 'Reason for failover', 'Manual failover');
failoverTriggerCommand.option('--no-backup', 'Skip creating pre-failover backup');
failoverTriggerCommand.option('--force', 'Force failover even if validation fails');

failoverTriggerCommand.action(async (region, options) => {
  const { failoverTrigger } = await import('../../utils/failover-handler.js');

  try {
    console.log(`Initiating failover to region: ${region}`);
    console.log(`Reason: ${options.reason}`);

    if (!options.backup) {
      console.log('WARNING: Pre-failover backup will NOT be created');
    }

    const result = await failoverTrigger(region, {
      reason: options.reason,
      createBackup: options.backup,
      force: options.force
    });

    if (result.success) {
      console.log('\n✓ Failover completed successfully');
      console.log(`  Event ID: ${result.event.id}`);
      console.log(`  Duration: ${formatDuration(result.downtime)}`);
      console.log(`  Downtime: ${formatDuration(result.downtime)}`);
      console.log(`  RTO Achieved: ${result.rtoAchieved ? 'Yes' : 'No'}`);
      console.log(`  Backup Created: ${result.backupCreated ? 'Yes (' + result.backupId + ')' : 'No'}`);

      if (result.warnings.length > 0) {
        console.log('\nWarnings:');
        for (const warning of result.warnings) {
          console.log(`  - ${warning}`);
        }
      }
    } else {
      console.error('\n✗ Failover failed');
      console.error(`  Event ID: ${result.event.id}`);
      console.error(`  Status: ${result.event.status}`);

      if (result.errors.length > 0) {
        console.error('\nErrors:');
        for (const error of result.errors) {
          console.error(`  - ${error}`);
        }
      }

      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Failover trigger failed');
    console.error(`  Error: ${error}`);
    process.exit(1);
  }
});

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export { failoverTriggerCommand as default };
