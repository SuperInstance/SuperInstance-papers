/**
 * Test Setup File - Global test configuration
 *
 * Run this before all test suites to setup the testing framework
 */

import { IntegrationTestSuite } from '../../src/spreadsheet/testing';

// Setup integration test suite
beforeAll(() => {
  IntegrationTestSuite.setup({
    timeout: 30000,
    verbose: process.env.VERBOSE === 'true',
    cleanup: true,
    backendConfig: {
      latencyRange: [0, 10],
      errorRate: 0,
      logging: process.env.VERBOSE === 'true'
    }
  });
});

// Cleanup after all tests
afterAll(async () => {
  await IntegrationTestSuite.cleanup();
  IntegrationTestSuite.clear();
});

// Extend Jest/Vitest matchers
if (typeof expect !== 'undefined') {
  const { matchers } = require('../../src/spreadsheet/testing');
  expect.extend(matchers);
}

// Global test utilities
global.testUtils = {
  retry: async (fn: () => Promise<void>, times: number = 3) => {
    for (let i = 0; i < times; i++) {
      try {
        await fn();
        return;
      } catch (error) {
        if (i === times - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
      }
    }
  },

  waitForCondition: async (
    condition: () => boolean,
    timeout: number = 5000,
    interval: number = 50
  ) => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (condition()) return;
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }
};

declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        retry: (fn: () => Promise<void>, times?: number) => Promise<void>;
        waitForCondition: (
          condition: () => boolean,
          timeout?: number,
          interval?: number
        ) => Promise<void>;
      };
    }
  }
}

export {};
