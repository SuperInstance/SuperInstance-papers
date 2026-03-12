// Performance optimization configuration for SuperInstance website
/**
 * Optimized webpack settings for better loading performance
 */

export const optimizationConfig = {
  // Code splitting strategy
  codeSplitting: {
    // Split vendor libraries
    vendors: {
      test: /[\\/]node_modules[\\/]/,
      name: 'vendors',
      chunks: 'all',
      priority: 10
    },
    // Split interactive components
    interactive: {
      test: /[\\/]interactive[\\/]/,
      name: 'interactive',
      chunks: 'all',
      priority: 20
    },
    // Common chunks
    common: {
      name: 'common',
      minChunks: 2,
      chunks: 'all',
      priority: 5
    }
  },

  // Bundle size limits (in KB)
  bundleLimits: {
    initial: 200, // Initial JS bundle
    async: 150,   // Async chunks
    vendor: 300,  // Vendor chunk
    interactive: 100 // Interactive components
  },

  // Image optimization settings
  images: {
    // Lazy loading threshold
    lazyOffset: '50px',

    // WebP conversion
    webp: true,

    // Compress thresholds
    jpeg: { quality: 85 },
    png: { quality: 90 },
    webp: { quality: 80 },

    // Responsive breakpoints
    breakpoints: {
      mobile: 480,
      tablet: 768,
      desktop: 1200,
      large: 1920
    }
  },

  // Font loading optimization
  fonts: {
    // Preload critical fonts
    preload: true,

    // Font display strategy
    display: 'swap',

    // Subset fonts
    subset: true
  },

  // Script loading optimization
  scripts: {
    // Defer non-critical scripts
    defer: true,

    // Async loading for analytics
    asyncAnalytics: true,

    // Third-party script optimization
    thirdParty: {
      'google-analytics': { async: true, defer: true },
      'gtm': { async: true, defer: false }, // GTM needs to load early
      'heatmap': { async: true, defer: true }
    }
  },

  // CSS optimization
  styles: {
    // Critical CSS inlining
    critical: true,

    // Remove unused CSS
    purge: true,

    // Minify CSS
    minify: true
  },

  // Cache settings
  caching: {
    // Cache static assets for 1 year
    assets: 'public, max-age=31536000, immutable',

    // Cache HTML for 1 hour
    html: 'public, max-age=3600',

    // API responses cache for 5 minutes
    api: 'private, max-age=300'
  },

  // Compression settings
  compression: {
    // Enable Brotli compression
    brotli: true,

    // Gzip fallback
    gzip: true,

    // Compression thresholds
    threshold: 1024 // bytes
  },

  // Core Web Vitals targets
  webVitals: {
    // Largest Contentful Paint
    lcp: { target: 2500, budget: 4000 }, // ms

    // First Input Delay
    fid: { target: 100, budget: 200 }, // ms

    // Cumulative Layout Shift
    cls: { target: 0.1, budget: 0.25 },

    // First Contentful Paint
    fcp: { target: 1800, budget: 3000 }, // ms

    // Time to Interactive
    tti: { target: 3800, budget: 5300 } // ms
  }
};

/**
 * Performance monitoring configuration
 */
export const performanceMonitor = {
  // Enable Real User Monitoring (RUM)
  rum: {
    enabled: true,
    sampleRate: 0.1, // 10% of users

    // Metrics to track
    metrics: [
      'navigationStart',
      'domContentLoaded',
      'loadEventEnd',
      'firstPaint',
      'firstContentfulPaint',
      'largestContentfulPaint',
      'firstInputDelay',
      'cumulativeLayoutShift'
    ],

    // Send metrics to analytics
    analytics: {
      provider: 'gtag',
      trackingId: 'GA_MEASUREMENT_ID'
    }
  },

  // Enable manual performance measurement
  manual: {
    // Component loading times
    components: true,

    // API response times
    api: true,

    // Resource loading
    resources: true
  },

  // Error tracking
  error: {
    // Enable performance-related error tracking
    enabled: true,

    // Track slow components
    slowComponentThreshold: 1000, // ms

    // Track resource failures
    resourceError: true
  }
};

/**
 * Lighthouse CI configuration
 */
export const lighthouseCI = {
  // Lighthouse assertions
  assertions: {
    'categories:performance': ['warn', { minScore: 0.9 }],
    'categories:accessibility': ['error', { minScore: 0.95 }],
    'categories:best-practices': ['warn', { minScore: 0.9 }],
    'categories:seo': ['warn', { minScore: 0.9 }],
    'categories:pwa': ['warn', { minScore: 0.8 }]
  },

  // Test URLs
  urls: [
    '/',
    '/demos',
    '/demos/interactive',
    '/tutorials'
  ],

  // Timing settings
  settings: {
    // Network throttling (simulated 3G)
    throttling: {
      cpuSlowdownMultiplier: 4,
      requestLatencyMs: 150,
      downloadThroughputKbps: 1600,
      uploadThroughputKbps: 750
    }
  }
};

/**
 * Build-time optimizations
 */
export const buildOptimization = {
  // Tree shaking
  treeShaking: true,

  // Dead code elimination
  deadCodeElimination: true,

  // Property mangling (safely)
  propertyMangling: {
    enabled: true,
    reserved: ['props', 'data', 'state', 'error'] // Don't mangle these properties
  },

  // Remove console.log in production
  removeConsole: true,

  // Terser options
  minification: {
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info']
    },
    mangle: {
      safari10: true,
      properties: {
        regex: /^_/
      }
    }
  }
};