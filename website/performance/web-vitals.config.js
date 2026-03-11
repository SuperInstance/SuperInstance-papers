// Web Vitals monitoring configuration
export const webVitalsConfig = {
  // Performance budgets
  budgets: {
    // Largest Contentful Paint (LCP)
    lcp: {
      warning: 2500, // 2.5 seconds
      error: 4000,   // 4 seconds
    },
    // First Input Delay (FID)
    fid: {
      warning: 100,  // 100ms
      error: 300,    // 300ms
    },
    // Cumulative Layout Shift (CLS)
    cls: {
      warning: 0.1,  // 0.1
      error: 0.25,   // 0.25
    },
    // First Contentful Paint (FCP)
    fcp: {
      warning: 1800, // 1.8 seconds
      error: 3000,   // 3 seconds
    },
    // Time to Interactive (TTI)
    tti: {
      warning: 3500, // 3.5 seconds
      error: 5000,   // 5 seconds
    },
    // Total Blocking Time (TBT)
    tbt: {
      warning: 200,  // 200ms
      error: 600,    // 600ms
    },
    // Speed Index
    speedIndex: {
      warning: 3400, // 3.4 seconds
      error: 5800,   // 5.8 seconds
    },
  },

  // Bundle size budgets
  bundleBudgets: {
    javascript: {
      initial: 170 * 1024, // 170KB
      total: 500 * 1024,   // 500KB
    },
    css: {
      initial: 50 * 1024,  // 50KB
      total: 100 * 1024,   // 100KB
    },
    images: {
      perImage: 100 * 1024, // 100KB per image
      total: 1000 * 1024,   // 1MB total
    },
    fonts: {
      perFont: 50 * 1024,   // 50KB per font
      total: 200 * 1024,    // 200KB total
    },
  },

  // Monitoring endpoints
  endpoints: [
    '/',
    '/features',
    '/docs',
    '/demos',
    '/blog',
    '/community',
  ],

  // User agents to test with
  userAgents: [
    'chrome-desktop',
    'chrome-mobile',
    'firefox-desktop',
    'safari-desktop',
  ],

  // Connection speeds to simulate
  connectionSpeeds: [
    '4g',      // Fast 4G
    '3g',      // Slow 3G
    '2g',      // Very slow 2G
  ],

  // Geographic regions to test from
  regions: [
    'us-east-1',    // North Virginia
    'eu-west-1',    // Ireland
    'ap-southeast-1', // Singapore
  ],

  // Alert configuration
  alerts: {
    slack: process.env.SLACK_WEBHOOK_URL,
    email: process.env.ALERT_EMAIL,
    webhook: process.env.ALERT_WEBHOOK_URL,
  },

  // Reporting configuration
  reporting: {
    format: ['json', 'html', 'csv'],
    outputDir: './performance-reports',
    retentionDays: 30,
  },
};

// Performance test scenarios
export const performanceScenarios = [
  {
    name: 'Homepage Load',
    url: '/',
    actions: [
      { type: 'navigate', waitUntil: 'networkidle' },
      { type: 'measure', metrics: ['LCP', 'FCP', 'CLS', 'TTI'] },
    ],
  },
  {
    name: 'Features Page Navigation',
    url: '/',
    actions: [
      { type: 'navigate', waitUntil: 'networkidle' },
      { type: 'click', selector: 'a[href*="features"]' },
      { type: 'wait', timeout: 2000 },
      { type: 'measure', metrics: ['LCP', 'FID', 'CLS'] },
    ],
  },
  {
    name: 'Documentation Search',
    url: '/docs',
    actions: [
      { type: 'navigate', waitUntil: 'networkidle' },
      { type: 'type', selector: 'input[type="search"]', text: 'SuperInstance' },
      { type: 'press', key: 'Enter' },
      { type: 'wait', timeout: 3000 },
      { type: 'measure', metrics: ['LCP', 'FID', 'TBT'] },
    ],
  },
  {
    name: 'Demo Interaction',
    url: '/demos',
    actions: [
      { type: 'navigate', waitUntil: 'networkidle' },
      { type: 'click', selector: '.demo-button:first-child' },
      { type: 'wait', timeout: 1000 },
      { type: 'measure', metrics: ['FID', 'TBT', 'CLS'] },
    ],
  },
];

// Performance thresholds for CI
export const performanceThresholds = {
  // Core Web Vitals thresholds
  coreWebVitals: {
    lcp: 2500,    // 2.5 seconds
    fid: 100,     // 100ms
    cls: 0.1,     // 0.1
  },

  // Additional performance metrics
  additionalMetrics: {
    fcp: 1800,    // 1.8 seconds
    tti: 3500,    // 3.5 seconds
    tbt: 200,     // 200ms
    speedIndex: 3400, // 3.4 seconds
  },

  // Bundle size thresholds
  bundleSize: {
    jsInitial: 170 * 1024,  // 170KB
    jsTotal: 500 * 1024,    // 500KB
    cssInitial: 50 * 1024,  // 50KB
    cssTotal: 100 * 1024,   // 100KB
  },

  // Asset count thresholds
  assetCounts: {
    requests: 30,
    domains: 10,
    redirects: 2,
  },
};