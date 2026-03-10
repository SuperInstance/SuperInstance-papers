/**
 * STIGMERGY EXAMPLES
 * ==================
 *
 * Real-world examples of stigmergic coordination in spreadsheets.
 * Run these to see how digital pheromones enable collective behavior.
 */

import {
  createPheromoneField,
  depositPheromone,
  sensePheromones,
  getPheromoneStrength,
  evaporatePheromones,
  PheromoneType,
  foragingDecideNext,
  foragingDeposit,
  swarmSearchStep,
  dataQualityCheckStep,
  getFieldStats,
  visualizeField,
  markDanger,
  isCellSafe,
  findSafeCell,
  type PheromoneField,
  type CellCoordinate,
  type ForagingTile,
  type SearchTile,
  type DataQualityTile
} from './stigmergy';

// ============================================================================
// EXAMPLE 1: SIMPLE FORAGING
// ============================================================================

/**
 * SIMPLE FORAGING EXAMPLE
 * =======================
 *
 * Three tiles explore a 5x5 grid looking for resources.
 * They leave trails, follow each other's discoveries.
 * Watch how they self-organize without central coordination.
 */
export function runForagingExample(): void {
  console.log('=== STIGMERGIC FORAGING EXAMPLE ===\n');

  // Create pheromone field
  const field = createPheromoneField({
    decay_interval: 1000,
    max_strength: 1.0,
    min_strength: 0.01,
    aggregate_same_type: true
  });

  // Create 5x5 grid of cells
  const cells: CellCoordinate[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      cells.push({ row, column: col, sheet: 'main' });
    }
  }

  // Create three foraging tiles
  const tiles: ForagingTile[] = [
    {
      tile_id: 'forager_1',
      current_cell: { row: 0, column: 0, sheet: 'main' },
      found_resource: false,
      strategy: 'explore'
    },
    {
      tile_id: 'forager_2',
      current_cell: { row: 2, column: 2, sheet: 'main' },
      found_resource: false,
      strategy: 'explore'
    },
    {
      tile_id: 'forager_3',
      current_cell: { row: 4, column: 4, sheet: 'main' },
      found_resource: false,
      strategy: 'explore'
    }
  ];

  // Place some resources (hidden from tiles initially)
  const resource_locations = [
    { row: 1, column: 3, sheet: 'main' },
    { row: 3, column: 1, sheet: 'main' }
  ];

  console.log('Resources hidden at:');
  resource_locations.forEach(loc => {
    console.log(`  Cell (${loc.row}, ${loc.column})`);
  });
  console.log('');

  // Run for 20 steps
  for (let step = 0; step < 20; step++) {
    console.log(`--- Step ${step + 1} ---`);

    for (const tile of tiles) {
      // Get neighbors
      const neighbors = cells.filter(cell => {
        const row_dist = Math.abs(cell.row - tile.current_cell.row);
        const col_dist = Math.abs(cell.column - tile.current_cell.column);
        return row_dist <= 1 && col_dist <= 1 && cell.sheet === tile.current_cell.sheet;
      });

      // Check if found resource
      const at_resource = resource_locations.some(
        loc => loc.row === tile.current_cell.row && loc.column === tile.current_cell.column
      );

      if (at_resource) {
        tile.found_resource = true;
        console.log(`  ${tile.tile_id} found resource at (${tile.current_cell.row}, ${tile.current_cell.column})!`);
      }

      // Deposit pheromone
      foragingDeposit(field, tile, tile.found_resource ? 0.8 : 0.3);

      // Decide next move
      const next_cell = foragingDecideNext(field, tile, neighbors);
      tile.previous_cell = tile.current_cell;
      tile.current_cell = next_cell;

      console.log(`  ${tile.tile_id} moves to (${next_cell.row}, ${next_cell.column})`);
    }

    // Evaporate pheromones every 5 steps
    if (step % 5 === 4) {
      const removed = evaporatePheromones(field);
      console.log(`  Evaporated ${removed} weak pheromones`);
    }

    console.log('');
  }

  // Show final state
  console.log('=== FINAL STATE ===');
  const stats = getFieldStats(field);
  console.log(`Cells with pheromones: ${stats.total_cells}`);
  console.log(`Total pheromones: ${stats.total_pheromones}`);
  console.log(`By type:`);
  console.log(`  TRAIL: ${stats.by_type[PheromoneType.TRAIL]}`);
  console.log(`  RESOURCE: ${stats.by_type[PheromoneType.RESOURCE]}`);
  console.log(`  DANGER: ${stats.by_type[PheromoneType.DANGER]}`);
  console.log(`  TASK: ${stats.by_type[PheromoneType.TASK]}`);

  console.log('\n--- PHEROMONE FIELD ---');
  console.log(visualizeField(field));
}

// ============================================================================
// EXAMPLE 2: SWARM DATA QUALITY CHECK
// ============================================================================

/**
 * SWARM DATA QUALITY CHECK
 * ========================
 *
 * Five tiles check a 10x10 spreadsheet for data quality issues.
 * They coordinate via pheromones to avoid redundant checks.
 * Result: Efficient parallel coverage without overlap.
 */
export function runDataQualityExample(): void {
  console.log('=== SWARM DATA QUALITY CHECK EXAMPLE ===\n');

  // Create pheromone field
  const field = createPheromoneField({
    decay_interval: 1000,
    max_strength: 1.0,
    min_strength: 0.01,
    aggregate_same_type: true
  });

  // Create 10x10 grid
  const cells: CellCoordinate[] = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      cells.push({ row, column: col, sheet: 'data' });
    }
  }

  // Create five quality check tiles
  const tiles: DataQualityTile[] = [
    { tile_id: 'checker_1', current_cell: { row: 0, column: 0, sheet: 'data' }, checks_performed: 0, issues_found: 0 },
    { tile_id: 'checker_2', current_cell: { row: 0, column: 9, sheet: 'data' }, checks_performed: 0, issues_found: 0 },
    { tile_id: 'checker_3', current_cell: { row: 9, column: 0, sheet: 'data' }, checks_performed: 0, issues_found: 0 },
    { tile_id: 'checker_4', current_cell: { row: 9, column: 9, sheet: 'data' }, checks_performed: 0, issues_found: 0 },
    { tile_id: 'checker_5', current_cell: { row: 4, column: 4, sheet: 'data' }, checks_performed: 0, issues_found: 0 }
  ];

  console.log('5 tiles checking 100 cells for quality issues...\n');

  // Run until all cells checked or max steps
  let steps = 0;
  const max_steps = 100;

  while (steps < max_steps) {
    steps++;
    let all_stopped = true;

    for (const tile of tiles) {
      const result = dataQualityCheckStep(field, tile, cells);

      if (result.issue_found) {
        console.log(`  ${tile.tile_id} found ${result.issue_type} at (${result.next_cell.row}, ${result.next_cell.column})`);
      }

      if (!result.should_stop) {
        all_stopped = false;
      }

      tile.current_cell = result.next_cell;
    }

    if (all_stopped) {
      console.log(`\nAll tiles finished after ${steps} steps`);
      break;
    }

    // Evaporate every 10 steps
    if (steps % 10 === 0) {
      evaporatePheromones(field);
    }
  }

  // Show report
  console.log('\n=== DATA QUALITY REPORT ===');
  const report = (() => {
    let total_issues = 0;
    const issues_by_type: Record<string, number> = {};

    for (const [, pheromones] of field.cells.entries()) {
      for (const p of pheromones) {
        if (p.type === PheromoneType.DANGER && p.metadata?.issue_type) {
          total_issues++;
          const issue_type = p.metadata.issue_type as string;
          issues_by_type[issue_type] = (issues_by_type[issue_type] || 0) + 1;
        }
      }
    }

    return {
      total_cells_checked: field.cells.size,
      total_issues,
      issues_by_type,
      issue_density: field.cells.size > 0 ? total_issues / field.cells.size : 0
    };
  })();

  console.log(`Cells checked: ${report.total_cells_checked} / 100`);
  console.log(`Issues found: ${report.total_issues}`);
  console.log(`Issue density: ${(report.issue_density * 100).toFixed(1)}%`);
  console.log('Issues by type:');
  Object.entries(report.issues_by_type).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log('\nTile performance:');
  tiles.forEach(tile => {
    console.log(`  ${tile.tile_id}: ${tile.checks_performed} checks, ${tile.issues_found} issues`);
  });
}

// ============================================================================
// EXAMPLE 3: DANGER AVOIDANCE
// ============================================================================

/**
 * DANGER AVOIDANCE EXAMPLE
 * ========================
 *
 * Tiles navigate around dangerous cells.
 * One tile finds danger, marks it.
 * Other tiles avoid it.
 */
export function runDangerAvoidanceExample(): void {
  console.log('=== DANGER AVOIDANCE EXAMPLE ===\n');

  const field = createPheromoneField();

  // Create 8x8 grid
  const cells: CellCoordinate[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      cells.push({ row, column: col });
    }
  }

  // Tile navigating from top-left to bottom-right
  const tile = {
    tile_id: 'navigator_1',
    current_cell: { row: 0, column: 0 }
  };

  // Place some danger cells
  const danger_cells = [
    { row: 2, column: 2 },
    { row: 2, column: 3 },
    { row: 3, column: 2 },
    { row: 4, column: 5 },
    { row: 5, column: 5 }
  ];

  // Mark danger cells (as if discovered by previous tile)
  danger_cells.forEach(cell => {
    markDanger(field, cell, 'previous_tile', 0.8, 'High error rate in this region');
  });

  console.log('Navigating from (0,0) to (7,7) avoiding danger cells...\n');
  console.log('Danger cells marked at:');
  danger_cells.forEach(cell => {
    console.log(`  (${cell.row}, ${cell.column})`);
  });
  console.log('');

  // Navigate
  let steps = 0;
  const max_steps = 50;

  while (steps < max_steps) {
    steps++;

    console.log(`Step ${steps}: At (${tile.current_cell.row}, ${tile.current_cell.column})`);

    // Check if reached goal
    if (tile.current_cell.row === 7 && tile.current_cell.column === 7) {
      console.log('\nGoal reached!');
      break;
    }

    // Get neighbors
    const neighbors = cells.filter(cell => {
      const row_dist = Math.abs(cell.row - tile.current_cell.row);
      const col_dist = Math.abs(cell.column - tile.current_cell.column);
      return row_dist <= 1 && col_dist <= 1;
    });

    // Find safe cell (prefer moving toward goal)
    const safe_cells = neighbors.filter(cell => isCellSafe(field, cell));

    if (safe_cells.length === 0) {
      console.log('  No safe cells found! Stuck.');
      break;
    }

    // Pick safe cell closest to goal
    const goal_cell = { row: 7, column: 7 };
    const best_cell = safe_cells.reduce((best, cell) => {
      const best_dist = Math.abs(best.row - goal_cell.row) + Math.abs(best.column - goal_cell.column);
      const cell_dist = Math.abs(cell.row - goal_cell.row) + Math.abs(cell.column - goal_cell.column);
      return cell_dist < best_dist ? cell : best;
    });

    console.log(`  Moving to (${best_cell.row}, ${best_cell.column})`);
    tile.current_cell = best_cell;
  }

  console.log(`\nTotal steps: ${steps}`);
  console.log(`Minimum possible: 14`);
  console.log(`Efficiency: ${(14 / steps * 100).toFixed(1)}%`);
}

// ============================================================================
// EXAMPLE 4: RESOURCE COMPETITION
// ============================================================================

/**
 * RESOURCE COMPETITION EXAMPLE
 * ============================
 *
 * Multiple tiles compete for limited resources.
 * They leave trails to attract others to good finds.
 * Shows how stigmergy enables efficient resource discovery.
 */
export function runResourceCompetitionExample(): void {
  console.log('=== RESOURCE COMPETITION EXAMPLE ===\n');

  const field = createPheromoneField({
    max_strength: 1.0,
    aggregate_same_type: true
  });

  // Create 6x6 grid
  const cells: CellCoordinate[] = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      cells.push({ row, column: col });
    }
  }

  // Place resources with different values
  const resources = [
    { cell: { row: 1, column: 4 }, value: 1.0 },
    { cell: { row: 4, column: 1 }, value: 0.8 },
    { cell: { row: 3, column: 3 }, value: 0.5 },
    { cell: { row: 5, column: 5 }, value: 0.3 }
  ];

  // Deposit resource pheromones
  resources.forEach(res => {
    depositPheromone(
      field,
      res.cell,
      PheromoneType.RESOURCE,
      res.value,
      'environment',
      0.02, // Very slow decay
      { resource_value: res.value }
    );
  });

  console.log('Resources placed:');
  resources.forEach(res => {
    console.log(`  (${res.cell.row}, ${res.cell.column}): value ${res.value}`);
  });
  console.log('');

  // Create competing tiles
  const tiles = [
    { tile_id: 'competitor_1', current_cell: { row: 0, column: 0 }, resources_collected: 0 },
    { tile_id: 'competitor_2', current_cell: { row: 0, column: 5 }, resources_collected: 0 },
    { tile_id: 'competitor_3', current_cell: { row: 5, column: 0 }, resources_collected: 0 }
  ];

  console.log('3 competitors searching for resources...\n');

  // Run competition
  for (let step = 0; step < 30; step++) {
    for (const tile of tiles) {
      // Get neighbors
      const neighbors = cells.filter(cell => {
        const row_dist = Math.abs(cell.row - tile.current_cell.row);
        const col_dist = Math.abs(cell.column - tile.current_cell.column);
        return row_dist <= 1 && col_dist <= 1;
      });

      // Sense for resources
      let best_neighbor = tile.current_cell;
      let best_strength = 0;

      for (const neighbor of neighbors) {
        const strength = getPheromoneStrength(field, neighbor, PheromoneType.RESOURCE);
        if (strength > best_strength) {
          best_strength = strength;
          best_neighbor = neighbor;
        }
      }

      // Move toward best resource
      if (best_neighbor !== tile.current_cell) {
        tile.current_cell = best_neighbor;

        // Check if collected resource
        const resource_here = resources.find(r =>
          r.cell.row === tile.current_cell.row &&
          r.cell.column === tile.current_cell.column
        );

        if (resource_here && best_strength > 0.5) {
          tile.resources_collected++;
          console.log(`  ${tile.tile_id} collected resource at (${tile.current_cell.row}, ${tile.current_cell.column})`);

          // Resource depleted - reduce pheromone
          const pheromones = sensePheromones(field, tile.current_cell, PheromoneType.RESOURCE);
          pheromones.forEach(p => {
            p.strength *= 0.1; // Deplete resource
          });
        }
      }
    }
  }

  console.log('\n=== COMPETITION RESULTS ===');
  tiles.forEach(tile => {
    console.log(`${tile.tile_id}: ${tile.resources_collected} resources`);
  });
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

/**
 * Run all stigmergy examples
 */
export function runAllExamples(): void {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     STIGMERGIC COORDINATION - LIVE EXAMPLES              ║');
  console.log('║     Ants do it. Spreadsheets can too.                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  runForagingExample();
  console.log('\n' + '='.repeat(60) + '\n');

  runDataQualityExample();
  console.log('\n' + '='.repeat(60) + '\n');

  runDangerAvoidanceExample();
  console.log('\n' + '='.repeat(60) + '\n');

  runResourceCompetitionExample();
  console.log('\n' + '='.repeat(60) + '\n');

  console.log('=== ALL EXAMPLES COMPLETE ===\n');
  console.log('Key takeaways:');
  console.log('1. No central coordination needed');
  console.log('2. Emergent behavior from simple rules');
  console.log('3. Scalable to thousands of tiles');
  console.log('4. Fault tolerant - no single point of failure');
  console.log('5. Efficient resource utilization');
}

// ============================================================================
// SINGLE EXAMPLE RUNNER
// ============================================================================

/**
 * Run a specific example by name
 */
export function runExample(name: 'foraging' | 'data-quality' | 'danger' | 'resources' | 'all'): void {
  switch (name) {
    case 'foraging':
      runForagingExample();
      break;
    case 'data-quality':
      runDataQualityExample();
      break;
    case 'danger':
      runDangerAvoidanceExample();
      break;
    case 'resources':
      runResourceCompetitionExample();
      break;
    case 'all':
      runAllExamples();
      break;
  }
}

// Export for use in tests or other modules
export default {
  runForagingExample,
  runDataQualityExample,
  runDangerAvoidanceExample,
  runResourceCompetitionExample,
  runAllExamples,
  runExample
};
