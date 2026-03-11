// Bug tracking and regression testing configuration

export const bugTrackingConfig = {
  // Bug severity levels
  severityLevels: {
    critical: {
      description: 'System crash, data loss, security vulnerability',
      sla: '24 hours',
      priority: 'P0',
      color: '#dc2626',
    },
    high: {
      description: 'Major functionality broken, workaround not available',
      sla: '3 days',
      priority: 'P1',
      color: '#ea580c',
    },
    medium: {
      description: 'Minor functionality broken, workaround available',
      sla: '1 week',
      priority: 'P2',
      color: '#ca8a04',
    },
    low: {
      description: 'Cosmetic issue, minor UI problem',
      sla: '2 weeks',
      priority: 'P3',
      color: '#16a34a',
    },
    trivial: {
      description: 'Typos, minor suggestions',
      sla: '1 month',
      priority: 'P4',
      color: '#2563eb',
    },
  },

  // Bug categories
  categories: {
    functionality: 'Feature not working as expected',
    usability: 'Poor user experience or confusing interface',
    performance: 'Slow loading, lag, or high resource usage',
    security: 'Security vulnerability or data exposure',
    accessibility: 'WCAG compliance issue',
    compatibility: 'Browser or device compatibility issue',
    visual: 'UI/visual design issue',
    content: 'Incorrect or missing content',
    seo: 'Search engine optimization issue',
    deployment: 'Build or deployment issue',
  },

  // Bug states
  states: {
    new: 'Newly reported bug',
    triaged: 'Bug has been reviewed and categorized',
    assigned: 'Bug assigned to developer',
    inProgress: 'Developer working on fix',
    codeReview: 'Fix ready for code review',
    qaReview: 'Fix ready for QA verification',
    verified: 'Fix verified by QA',
    closed: 'Bug resolved and closed',
    wontFix: 'Bug will not be fixed',
    duplicate: 'Duplicate of existing bug',
    invalid: 'Not a bug or cannot reproduce',
  },

  // Regression test suites
  regressionSuites: {
    smoke: {
      description: 'Basic functionality tests',
      duration: '5 minutes',
      frequency: 'on every commit',
      tests: [
        'homepage-loads',
        'navigation-works',
        'search-works',
        'basic-forms-work',
      ],
    },
    sanity: {
      description: 'Key feature tests',
      duration: '15 minutes',
      frequency: 'on every PR',
      tests: [
        'user-registration',
        'demo-interaction',
        'documentation-access',
        'feature-pages',
      ],
    },
    comprehensive: {
      description: 'Full regression suite',
      duration: '1 hour',
      frequency: 'nightly',
      tests: [
        'all-e2e-tests',
        'performance-benchmarks',
        'security-scans',
        'accessibility-checks',
      ],
    },
    release: {
      description: 'Pre-release validation',
      duration: '2 hours',
      frequency: 'before each release',
      tests: [
        'full-regression-suite',
        'load-testing',
        'security-audit',
        'compatibility-matrix',
      ],
    },
  },

  // Bug reporting template
  bugReportTemplate: {
    requiredFields: [
      'title',
      'description',
      'stepsToReproduce',
      'expectedBehavior',
      'actualBehavior',
      'severity',
      'category',
    ],
    optionalFields: [
      'environment',
      'browser',
      'device',
      'screenshots',
      'consoleLogs',
      'networkLogs',
    ],
  },

  // Automated bug detection
  automatedDetection: {
    errorTracking: {
      tool: 'Sentry',
      alerts: ['js-errors', 'network-errors', 'performance-issues'],
    },
    monitoring: {
      tool: 'Cloudflare Analytics',
      alerts: ['uptime-drops', 'traffic-spikes', 'error-rate-increase'],
    },
    performance: {
      tool: 'Lighthouse CI',
      alerts: ['core-web-vitals-regression', 'bundle-size-increase'],
    },
    security: {
      tool: 'Snyk',
      alerts: ['new-vulnerabilities', 'dependency-updates'],
    },
  },

  // Bug triage workflow
  triageWorkflow: {
    steps: [
      {
        step: 'Initial Review',
        actor: 'QA Engineer',
        actions: ['verify reproducibility', 'assign severity', 'categorize'],
        timeLimit: '1 business day',
      },
      {
        step: 'Technical Assessment',
        actor: 'Tech Lead',
        actions: ['estimate effort', 'assign to developer', 'set priority'],
        timeLimit: '1 business day',
      },
      {
        step: 'Development',
        actor: 'Developer',
        actions: ['implement fix', 'write tests', 'submit PR'],
        timeLimit: 'based on severity',
      },
      {
        step: 'QA Verification',
        actor: 'QA Engineer',
        actions: ['test fix', 'verify regression', 'update status'],
        timeLimit: '1 business day',
      },
      {
        step: 'Deployment',
        actor: 'DevOps Engineer',
        actions: ['deploy to staging', 'monitor', 'deploy to production'],
        timeLimit: 'based on release schedule',
      },
    ],
  },

  // Metrics and reporting
  metrics: {
    mttr: 'Mean Time To Resolution',
    mttd: 'Mean Time To Detection',
    bugCount: 'Total bugs by severity',
    reopenRate: 'Percentage of bugs reopened',
    aging: 'Bugs older than SLA',
    trend: 'Bug trend over time',
  },

  // Integration with issue trackers
  integrations: {
    github: {
      enabled: true,
      labels: {
        bug: 'type: bug',
        severity: ['severity: critical', 'severity: high', 'severity: medium', 'severity: low'],
        category: ['category: functionality', 'category: security', 'category: performance'],
        status: ['status: new', 'status: in progress', 'status: qa review'],
      },
      templates: {
        bugReport: '.github/ISSUE_TEMPLATE/bug-report.md',
        featureRequest: '.github/ISSUE_TEMPLATE/feature-request.md',
      },
    },
    slack: {
      enabled: true,
      channels: {
        bugs: '#website-bugs',
        alerts: '#website-alerts',
        releases: '#website-releases',
      },
    },
  },
};

// Regression test scenarios
export const regressionTestScenarios = [
  {
    id: 'regression-smoke-001',
    name: 'Homepage Load',
    description: 'Verify homepage loads without errors',
    category: 'smoke',
    steps: [
      'Navigate to homepage',
      'Wait for page to load completely',
      'Check for JavaScript errors in console',
      'Verify page title is correct',
      'Check that main navigation is visible',
    ],
    assertions: [
      'Page loads within 3 seconds',
      'No JavaScript errors in console',
      'Page title contains "SuperInstance"',
      'Main navigation has at least 5 links',
    ],
  },
  {
    id: 'regression-smoke-002',
    name: 'Navigation Between Pages',
    description: 'Verify navigation between main pages works',
    category: 'smoke',
    steps: [
      'Start on homepage',
      'Click Features link',
      'Wait for Features page to load',
      'Click Documentation link',
      'Wait for Documentation page to load',
      'Click Demos link',
      'Wait for Demos page to load',
      'Click Blog link',
      'Wait for Blog page to load',
      'Click Home link to return',
    ],
    assertions: [
      'Each page loads within 2 seconds',
      'URL changes correctly for each page',
      'Page content is different for each page',
      'No broken links or 404 errors',
    ],
  },
  {
    id: 'regression-sanity-001',
    name: 'Demo Interaction',
    description: 'Verify interactive demos work correctly',
    category: 'sanity',
    steps: [
      'Navigate to Demos page',
      'Click on first demo',
      'Interact with demo controls',
      'Verify demo responds to input',
      'Reset demo to initial state',
    ],
    assertions: [
      'Demo loads within 5 seconds',
      'Demo responds to user interaction',
      'No errors during demo interaction',
      'Reset functionality works',
    ],
  },
  {
    id: 'regression-sanity-002',
    name: 'Documentation Search',
    description: 'Verify documentation search functionality',
    category: 'sanity',
    steps: [
      'Navigate to Documentation page',
      'Enter search term in search box',
      'Press Enter or click search button',
      'Review search results',
      'Click on first search result',
    ],
    assertions: [
      'Search returns results within 2 seconds',
      'Search results are relevant to query',
      'Clicking result navigates to correct page',
      'Search results page displays correctly',
    ],
  },
  {
    id: 'regression-comprehensive-001',
    name: 'Performance Regression',
    description: 'Verify performance has not degraded',
    category: 'comprehensive',
    steps: [
      'Run Lighthouse audit on homepage',
      'Run Lighthouse audit on Features page',
      'Run Lighthouse audit on Documentation page',
      'Compare results with baseline',
    ],
    assertions: [
      'Performance score >= 90 (no regression)',
      'LCP < 2500ms (no regression)',
      'FID < 100ms (no regression)',
      'CLS < 0.1 (no regression)',
    ],
  },
  {
    id: 'regression-comprehensive-002',
    name: 'Security Regression',
    description: 'Verify security has not degraded',
    category: 'comprehensive',
    steps: [
      'Run dependency vulnerability scan',
      'Check security headers',
      'Run CSP validation',
      'Check for known vulnerabilities',
    ],
    assertions: [
      'No new critical or high vulnerabilities',
      'All security headers present',
      'CSP properly configured',
      'No security regressions detected',
    ],
  },
];

// Bug tracking metrics
export const bugTrackingMetrics = {
  // Service Level Agreements (SLAs)
  slas: {
    critical: {
      responseTime: '2 hours',
      resolutionTime: '24 hours',
      escalationPath: 'Tech Lead → Engineering Manager → CTO',
    },
    high: {
      responseTime: '4 hours',
      resolutionTime: '3 days',
      escalationPath: 'Tech Lead → Engineering Manager',
    },
    medium: {
      responseTime: '8 hours',
      resolutionTime: '1 week',
      escalationPath: 'Tech Lead',
    },
    low: {
      responseTime: '24 hours',
      resolutionTime: '2 weeks',
      escalationPath: 'None',
    },
    trivial: {
      responseTime: '48 hours',
      resolutionTime: '1 month',
      escalationPath: 'None',
    },
  },

  // Quality gates
  qualityGates: {
    releaseReadiness: {
      criticalBugs: 0,
      highBugs: 0,
      mediumBugs: '<= 5',
      bugReopenRate: '<= 5%',
      testCoverage: '>= 80%',
      performanceRegression: 'none',
      securityVulnerabilities: 'none critical/high',
    },
    sprintCompletion: {
      bugCarryOver: '<= 10%',
      newBugsIntroduced: '<= 3 per feature',
      regressionBugs: '<= 2 per release',
    },
  },

  // Reporting intervals
  reporting: {
    daily: ['newBugs', 'resolvedBugs', 'agingBugs'],
    weekly: ['bugTrend', 'mttr', 'reopenRate', 'severityDistribution'],
    monthly: ['qualityMetrics', 'slaCompliance', 'improvementAreas'],
  },
};