/**
 * Jest Setup File for Node.js Environment
 * Runs before each test suite
 */

const { TextEncoder, TextDecoder } = require('util');

// Polyfill TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock process.memoryUsage for Node.js environment monitoring tests
const mockMemoryUsage = jest.fn(() => ({
  rss: 134217728,
  heapTotal: 67108864,
  heapUsed: 50331648,
  external: 2097152,
  arrayBuffers: 1048576
}));

global.process = {
  memoryUsage: mockMemoryUsage,
  env: {}
};
