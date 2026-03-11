/**
 * Lighthouse CI configuration for performance monitoring
 */
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Server running',
      startServerReadyTimeout: 10000,
      url: [
        'http://localhost:4321',
        'http://localhost:4321/about',
        'http://localhost:4321/docs',
        'http://localhost:4321/tutorials',
      ],
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': 'off', // Not a PWA
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-meaningful-paint': ['error', { maxNumericValue: 2500 }],
        'speed-index': ['error', { maxNumericValue: 4000 }],
        'interactive': ['error', { maxNumericValue: 5000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
      githubAppToken: process.env.GITHUB_TOKEN,
    },
  },
};