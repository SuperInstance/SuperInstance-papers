/**
 * Jest Configuration for agent-core package
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directory for tests
  roots: ['<rootDir>/src'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/*.(spec|test).[jt]s?(x)'
  ],

  // TypeScript configuration with Babel
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
    '^.+\\.jsx?$': 'babel-jest'
  },

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@monitoring/(.*)$': '<rootDir>/src/monitoring/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',

    // CSS and asset imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg|ico)$': '<rootDir>/../../tests/__mocks__/fileMock.js',
    '\\.(woff|woff2|ttf|eot)$': '<rootDir>/../../tests/__mocks__/fileMock.js'
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/../../tests/setup.js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/main.jsx',
    '!src/vite-env.d.ts'
  ],

  coverageThreshold: {
    global: {
      statements: 82,
      branches: 80,
      functions: 82,
      lines: 82
    }
  },

  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  coverageDirectory: '<rootDir>/coverage',

  // Module paths
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ],

  // Transform ignore
  transformIgnorePatterns: [
    '/node_modules/(?!(axios|react-router-dom|@axe-core/react)/)'
  ],

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Parallel execution
  maxWorkers: '50%'
};
