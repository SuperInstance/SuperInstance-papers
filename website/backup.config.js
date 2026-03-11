// Backup configuration for SuperInstance website
// Defines what to backup, retention policies, and recovery procedures

export const backupConfig = {
  // Backup schedule
  schedule: {
    daily: true,
    time: '03:00', // UTC
    dayOfWeek: 'daily',
  },

  // What to backup
  content: {
    // Source code
    sourceCode: {
      enabled: true,
      include: [
        'src/**/*',
        'public/**/*',
        '*.json',
        '*.js',
        '*.ts',
        '*.astro',
        '*.md',
        '.env*',
        '.github/**/*',
      ],
      exclude: [
        'node_modules',
        'dist',
        '.git',
        '*.log',
        '*.tmp',
        '*.cache',
      ],
    },

    // Configuration files
    configuration: {
      enabled: true,
      files: [
        'package.json',
        'package-lock.json',
        'tsconfig.json',
        'tailwind.config.js',
        'astro.config.mjs',
        'wrangler.toml',
        '.env.example',
        '.github/workflows/*.yml',
        'monitoring.config.js',
        'backup.config.js',
      ],
    },

    // Build output
    buildOutput: {
      enabled: true,
      directory: 'dist',
      includeSubdirectories: true,
    },

    // Database (if applicable)
    database: {
      enabled: false,
      type: 'none', // 'supabase', 'postgresql', 'mongodb', etc.
      connectionString: process.env.DATABASE_URL,
      backupCommand: '', // Command to run database backup
    },
  },

  // Retention policy
  retention: {
    daily: 7,     // Keep daily backups for 7 days
    weekly: 4,    // Keep weekly backups for 4 weeks
    monthly: 12,  // Keep monthly backups for 12 months
    yearly: 3,    // Keep yearly backups for 3 years
  },

  // Storage locations
  storage: {
    primary: {
      type: 'github-actions',
      retentionDays: 90,
      description: 'GitHub Actions artifacts',
    },
    secondary: {
      type: 'cloudflare-r2',
      enabled: false,
      bucket: process.env.CLOUDFLARE_R2_BACKUP_BUCKET,
      region: 'auto',
      description: 'Cloudflare R2 storage (requires paid plan)',
    },
    tertiary: {
      type: 'local',
      enabled: false,
      path: '/backups/superinstance',
      description: 'Local backup (for manual recovery)',
    },
  },

  // Encryption
  encryption: {
    enabled: true,
    algorithm: 'aes-256-gcm',
    key: process.env.BACKUP_ENCRYPTION_KEY, // Must be set in environment
    ivLength: 16,
  },

  // Compression
  compression: {
    enabled: true,
    algorithm: 'gzip',
    level: 6, // 1-9, where 9 is maximum compression
  },

  // Verification
  verification: {
    enabled: true,
    checksum: 'sha256',
    verifyAfterBackup: true,
    testRestore: {
      enabled: false, // Set to true for periodic restore testing
      frequency: 'quarterly',
    },
  },

  // Notification
  notification: {
    enabled: true,
    channels: {
      github: true, // GitHub Actions workflow summary
      email: false,
      slack: false,
      webhook: false,
    },
    conditions: {
      onSuccess: true,
      onFailure: true,
      onWarning: true,
    },
  },

  // Recovery procedures
  recovery: {
    steps: [
      {
        id: 'download',
        description: 'Download backup from GitHub Actions artifacts',
        command: 'gh run download -n website-backup-YYYY-MM-DD',
      },
      {
        id: 'extract',
        description: 'Extract backup archives',
        command: 'tar -xzf website-source-*.tar.gz && tar -xzf website-config-*.tar.gz',
      },
      {
        id: 'restore',
        description: 'Restore configuration and dependencies',
        command: 'npm ci && cp -r config-backup/* .',
      },
      {
        id: 'build',
        description: 'Build website',
        command: 'npm run build',
      },
      {
        id: 'deploy',
        description: 'Deploy to Cloudflare Pages',
        command: 'npm run deploy:production',
      },
    ],
    estimatedTime: '30 minutes',
    prerequisites: [
      'GitHub CLI installed',
      'Node.js 18+ installed',
      'Cloudflare Wrangler CLI installed',
      'Cloudflare API token with Pages write access',
    ],
  },

  // Disaster scenarios
  disasterScenarios: {
    dataLoss: {
      description: 'Complete data loss (repository deleted)',
      recoverySteps: [
        'Download latest backup from GitHub Actions',
        'Create new repository',
        'Restore from backup',
        'Reconfigure deployment',
      ],
    },
    deploymentFailure: {
      description: 'Failed deployment breaking production',
      recoverySteps: [
        'Rollback to previous deployment in Cloudflare Pages',
        'Investigate deployment logs',
        'Fix issues in code',
        'Redeploy',
      ],
    },
    securityBreach: {
      description: 'Security breach requiring restoration',
      recoverySteps: [
        'Take site offline',
        'Restore from clean backup',
        'Rotate all credentials',
        'Security audit',
        'Gradual restoration',
      ],
    },
  },

  // Testing
  testing: {
    automated: {
      enabled: true,
      frequency: 'monthly',
      steps: [
        'Download latest backup',
        'Verify archive integrity',
        'Extract sample files',
        'Verify file structure',
      ],
    },
    manual: {
      enabled: true,
      frequency: 'quarterly',
      steps: [
        'Full restore test',
        'Build verification',
        'Deployment test to staging',
        'Documentation update',
      ],
    },
  },
};

// Helper functions
export function getBackupFileName(prefix = 'website', timestamp = null) {
  const ts = timestamp || new Date();
  const dateStr = ts.toISOString().replace(/[:.]/g, '-').split('T')[0];
  const timeStr = ts.toISOString().replace(/[:.]/g, '-').split('T')[1].slice(0, 8);
  return `${prefix}-${dateStr}_${timeStr}`;
}

export function getRetentionPolicy(backupDate) {
  const now = new Date();
  const backupTime = new Date(backupDate);
  const daysOld = Math.floor((now - backupTime) / (1000 * 60 * 60 * 24));

  if (daysOld <= backupConfig.retention.daily) {
    return 'daily';
  } else if (daysOld <= backupConfig.retention.daily * 7) {
    return 'weekly';
  } else if (daysOld <= backupConfig.retention.daily * 30) {
    return 'monthly';
  } else {
    return 'yearly';
  }
}

export function shouldKeepBackup(backupDate) {
  const policy = getRetentionPolicy(backupDate);
  const now = new Date();
  const backupTime = new Date(backupDate);
  const daysOld = Math.floor((now - backupTime) / (1000 * 60 * 60 * 24));

  switch (policy) {
    case 'daily':
      return daysOld <= backupConfig.retention.daily;
    case 'weekly':
      return daysOld <= backupConfig.retention.weekly * 7;
    case 'monthly':
      return daysOld <= backupConfig.retention.monthly * 30;
    case 'yearly':
      return daysOld <= backupConfig.retention.yearly * 365;
    default:
      return false;
  }
}

// Export default configuration
export default backupConfig;