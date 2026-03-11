/**
 * CLI Command: backup restore
 * Restore colony from backup
 */

import { Command } from 'commander';

export const backupRestoreCommand = new Command('backup:restore');

backupRestoreCommand.description('Restore colony from backup');

backupRestoreCommand.argument('<backup-id>', 'Backup ID to restore from');
backupRestoreCommand.option('-m, --mode <mode>', 'Restore mode (full, rollback, selective)', 'full');
backupRestoreCommand.option('--no-validate', 'Skip validation before restore');
backupRestoreCommand.option('--force', 'Force restore even if validation fails');
backupRestoreCommand.option('--dry-run', 'Validate without restoring');
backupRestoreCommand.option('--components <components>', 'Comma-separated components to restore (for selective mode)');
backupRestoreCommand.option('--target <colony-id>', 'Target colony ID (defaults to current)');

backupRestoreCommand.action(async (backupId, options) => {
  const { backupRestore } = await import('../../utils/backup-handler.js');

  try {
    console.log(`Restoring from backup: ${backupId}`);
    console.log(`Mode: ${options.mode}`);

    if (options.dryRun) {
      console.log('DRY RUN - No changes will be made');
    }

    const result = await backupRestore(backupId, {
      mode: options.mode.toUpperCase(),
      validate: options.validate,
      force: options.force,
      dryRun: options.dryRun,
      components: options.components
        ? options.components.split(',').map((c: string) => c.trim().toUpperCase())
        : undefined,
      targetColonyId: options.target
    });

    if (options.dryRun) {
      console.log('\n✓ Dry run completed');
      console.log(`  Validation: ${result.validationResults?.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`  Checks: ${result.validationResults?.summary.totalChecks}`);
      console.log(`  Passed: ${result.validationResults?.summary.passed}`);
      console.log(`  Failed: ${result.validationResults?.summary.failed}`);
      console.log(`  Warnings: ${result.validationResults?.summary.warnings}`);
      return;
    }

    if (result.status === 'COMPLETED') {
      console.log('\n✓ Restore completed successfully');
      console.log(`  Duration: ${formatDuration(result.duration!)}`);
      console.log(`  Components restored: ${result.componentsRestored.length}`);

      for (const component of result.componentsRestored) {
        console.log(`    - ${component.component}: ${component.itemsRestored} items`);
      }

      if (result.warnings.length > 0) {
        console.log('\nWarnings:');
        for (const warning of result.warnings) {
          console.log(`  - ${warning}`);
        }
      }
    } else {
      console.error('\n✗ Restore failed');
      console.error(`  Status: ${result.status}`);

      if (result.validationResults && !result.validationResults.passed) {
        console.error('\nValidation failed:');
        for (const check of result.validationResults.checks.filter(c => !c.passed)) {
          console.error(`  - ${check.name}: ${check.message}`);
        }
      }

      if (result.errors.length > 0) {
        console.error('\nErrors:');
        for (const error of result.errors) {
          console.error(`  - ${error.message}`);
        }
      }

      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Restore command failed');
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

export { backupRestoreCommand as default };
