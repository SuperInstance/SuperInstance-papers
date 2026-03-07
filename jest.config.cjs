/**
 * Jest Configuration for POLLN
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  rootDir: 'src',
  roots: ['<rootDir>'],
  modulePathIgnorePatterns: [
    '<rootDir>/../reseachlocal/',
    '<rootDir>/../project_docs/',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.spec.json',
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/reseachlocal/',
    '/project_docs/',
  ],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000,
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
};
