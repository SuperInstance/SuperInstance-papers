// Monitoring configuration for SuperInstance website
// This configures analytics, error tracking, and performance monitoring

export const monitoringConfig = {
  // Analytics Providers
  analytics: {
    // Cloudflare Web Analytics (built-in with Pages)
    cloudflare: {
      enabled: true,
      beacon: true, // Use beacon API for better accuracy
    },

    // Optional: Google Analytics (if needed)
    google: {
      enabled: false,
      trackingId: process.env.GOOGLE_ANALYTICS_ID || '',
      anonymizeIp: true,
      respectDnt: true,
    },

    // Optional: Plausible Analytics (privacy-focused)
    plausible: {
      enabled: false,
      domain: process.env.PLAUSIBLE_DOMAIN || 'superinstance.ai',
      apiHost: 'https://plausible.io',
    },
  },

  // Error Tracking
  errorTracking: {
    // Cloudflare Error Pages
    cloudflare: {
      enabled: true,
      // Errors are automatically tracked by Cloudflare Pages
    },

    // Optional: Sentry for detailed error tracking
    sentry: {
      enabled: false,
      dsn: process.env.SENTRY_DSN || '',
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
    },
  },

  // Performance Monitoring
  performance: {
    // Core Web Vitals tracking
    webVitals: {
      enabled: true,
      metrics: ['CLS', 'FID', 'LCP', 'FCP', 'TTFB'],
      reportAllChanges: false, // Only report when metric changes
    },

    // Resource timing
    resourceTiming: {
      enabled: true,
      maxResourceTimingEntries: 150,
    },

    // User timing (custom metrics)
    userTiming: {
      enabled: true,
    },
  },

  // Real User Monitoring (RUM)
  rum: {
    enabled: true,
    sampleRate: 0.1, // Sample 10% of users
    sessionReplay: false, // Enable for debugging issues
  },

  // Synthetic Monitoring (uptime checks)
  synthetic: {
    // Cloudflare Uptime Monitoring
    cloudflare: {
      enabled: true,
      checkInterval: 60, // Check every 60 seconds
      regions: ['NAM', 'EU', 'APAC'], // North America, Europe, Asia-Pacific
    },

    // Optional: Custom health checks
    healthChecks: [
      {
        name: 'website-health',
        url: '/health',
        expectedStatus: 200,
        timeout: 5000,
      },
      {
        name: 'api-health',
        url: '/api/health',
        expectedStatus: 200,
        timeout: 10000,
      },
    ],
  },

  // Alerting Configuration
  alerts: {
    // Performance alerts
    performance: {
      lcp: 4000, // Alert if LCP > 4s
      fid: 300,  // Alert if FID > 300ms
      cls: 0.25, // Alert if CLS > 0.25
    },

    // Error rate alerts
    errors: {
      errorRate: 0.01, // Alert if error rate > 1%
      spikeThreshold: 5, // Alert if error spike > 5x normal
    },

    // Uptime alerts
    uptime: {
      availability: 0.99, // Alert if availability < 99%
      consecutiveFailures: 3, // Alert after 3 consecutive failures
    },
  },

  // Dashboard Configuration
  dashboard: {
    // Cloudflare Analytics Dashboard
    cloudflare: {
      enabled: true,
      metrics: ['requests', 'bandwidth', 'visitors', 'pageViews'],
      timeRange: '24h', // 24 hours by default
    },

    // Custom metrics to track
    customMetrics: [
      'demo_usage',
      'documentation_views',
      'api_calls',
      'user_signups',
    ],
  },

  // Privacy Configuration
  privacy: {
    anonymizeIp: true,
    respectDnt: true, // Respect Do Not Track headers
    cookieConsent: true, // Require cookie consent for tracking
    dataRetention: {
      analytics: 26, // Keep analytics data for 26 months
      logs: 30, // Keep logs for 30 days
      errors: 90, // Keep error data for 90 days
    },
  },
};

// Helper function to initialize monitoring based on environment
export function initializeMonitoring(env = process.env.NODE_ENV) {
  const config = { ...monitoringConfig };

  // Adjust configuration based on environment
  switch (env) {
    case 'production':
      // Full monitoring in production
      config.analytics.cloudflare.enabled = true;
      config.errorTracking.cloudflare.enabled = true;
      config.performance.webVitals.enabled = true;
      config.rum.enabled = true;
      config.synthetic.cloudflare.enabled = true;
      break;

    case 'staging':
      // Reduced monitoring in staging
      config.analytics.cloudflare.enabled = true;
      config.errorTracking.cloudflare.enabled = true;
      config.performance.webVitals.enabled = true;
      config.rum.enabled = false; // Disable RUM in staging
      config.synthetic.cloudflare.enabled = true;
      break;

    case 'preview':
      // Minimal monitoring in preview
      config.analytics.cloudflare.enabled = false;
      config.errorTracking.cloudflare.enabled = true;
      config.performance.webVitals.enabled = true;
      config.rum.enabled = false;
      config.synthetic.cloudflare.enabled = false;
      break;

    default: // development
      // Development monitoring
      config.analytics.cloudflare.enabled = false;
      config.errorTracking.cloudflare.enabled = true;
      config.performance.webVitals.enabled = true;
      config.rum.enabled = false;
      config.synthetic.cloudflare.enabled = false;
  }

  return config;
}

// Export default configuration
export default monitoringConfig;