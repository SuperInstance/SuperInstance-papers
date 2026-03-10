/**
 * STIGMERGY QUICKSTART
 * ===================
 *
 * Run this file to see stigmergic coordination in action.
 *
 * Usage:
 *   npm run build
 *   node dist/spreadsheet/tiles/stigmergy-quickstart.js
 *
 * Or import and run specific examples:
 *   import { runForagingExample } from './stigmergy.example';
 *   runForagingExample();
 */

import { runExample } from './stigmergy.example';

// Run all examples
console.log('\n🐜 Starting Stigmergic Coordination Examples...\n');

// Run specific examples
runExample('foraging');      // Ant-like foraging behavior
runExample('data-quality');  // Swarm data quality checking
runExample('danger');        // Danger avoidance navigation
runExample('resources');     // Resource competition

// Or run everything at once
// runExample('all');

console.log('\n✅ Examples complete!\n');
