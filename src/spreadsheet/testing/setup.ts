/**
 * Testing Framework Setup
 *
 * Setup file for Jest/Vitest integration.
 * Import this in your test configuration to enable custom matchers.
 *
 * @example
 * // jest.config.js
 * module.exports = {
 *   setupFilesAfterEnv: ['<rootDir>/src/spreadsheet/testing/setup.ts']
 * };
 *
 * // vitest.config.ts
 * export default defineConfig({
 *   test: {
 *     setupFiles: ['src/spreadsheet/testing/setup.ts']
 *   }
 * });
 */

import { matchers } from './index.js';

// Extend Jest/Vitest with custom matchers
if (typeof expect !== 'undefined') {
  expect.extend(matchers);
}

// Global test cleanup
afterEach(() => {
  // Reset counters
  const { CellFactory } = require('./CellFactory.js');
  const { SpreadsheetFixture } = require('./SpreadsheetFixture.js');
  const { TimeHelper, EventHelper } = require('./TestHelpers.js');

  if (CellFactory?.resetCounter) CellFactory.resetCounter();
  if (SpreadsheetFixture?.resetCounter) SpreadsheetFixture.resetCounter();
  if (TimeHelper?.reset) TimeHelper.reset();
  if (EventHelper?.clear) EventHelper.clear();
});

// Export for manual setup
export { matchers };
