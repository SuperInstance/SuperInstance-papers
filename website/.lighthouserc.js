module.exports = {
  ci: {
    collect: {
      /* Add configuration here */
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'Local.*http://localhost:4321',
      url: [
        'http://localhost:4321',
        'http://localhost:4321/features',
        'http://localhost:4321/docs',
        'http://localhost:4321/demos',
        'http://localhost:4321/blog',
      ],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },
    assert: {
      assertions: {
        // Performance assertions
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-meaningful-paint': ['error', { maxNumericValue: 2500 }],
        'speed-index': ['error', { maxNumericValue: 4300 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'interactive': ['error', { maxNumericValue: 3500 }],

        // Accessibility assertions
        'categories:accessibility': ['error', { minScore: 0.9 }],

        // Best practices assertions
        'categories:best-practices': ['error', { minScore: 0.9 }],

        // SEO assertions
        'categories:seo': ['error', { minScore: 0.9 }],

        // Specific accessibility checks
        'aria-allowed-attr': 'off',
        'color-contrast': ['error', { minScore: 0.9 }],
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'meta-viewport': 'error',

        // Security checks
        'is-on-https': 'off', // Local development
        'external-anchors-use-rel-noopener': 'error',
        'no-document-write': 'error',
        'no-vulnerable-libraries': 'error',

        // SEO checks
        'meta-description': 'error',
        'canonical': 'error',
        'robots-txt': 'off', // Local development
        'structured-data': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
      outputDir: './lighthouse-reports',
      reportFilenamePattern: '%%DATETIME%%-%%HOSTNAME%%-report.%%EXTENSION%%',
    },
    server: {
      // Server configuration for CI
    },
    wizard: {
      // Wizard configuration
    },
  },
};