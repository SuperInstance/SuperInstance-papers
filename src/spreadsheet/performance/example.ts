/**
 * POLLN Spreadsheet - Performance Example
 *
 * Demonstrates the complete performance optimization system
 * handling 100K cells with <16ms frame time.
 */

import { GridDisplay } from '../ui/GridDisplay.js';
import { PerformancePanel } from '../ui/PerformancePanel.js';
import { MetricsCollector } from './MetricsCollector.js';
import { InputCell } from '../cells/InputCell.js';
import { TransformCell } from '../cells/TransformCell.js';
import { CellType, CellState } from '../core/types.js';

/**
 * PerformanceExample - Demonstrates optimized grid
 */
export class PerformanceExample {
  private grid: GridDisplay;
  private panel: PerformancePanel;
  private collector: MetricsCollector;
  private container: HTMLElement;

  constructor() {
    // Create main container
    this.container = document.createElement('div');
    this.container.style.width = '100vw';
    this.container.style.height = '100vh';
    this.container.style.position = 'relative';
    document.body.appendChild(this.container);

    // Initialize metrics
    this.collector = new MetricsCollector({
      sampleInterval: 1000,
      historySize: 60,
    });
    this.collector.start();

    // Initialize grid
    this.grid = new GridDisplay({
      container: this.container,
      rowCount: 100000,
      colCount: 1000,
      rowHeight: 25,
      colWidth: 100,
      enableVirtualScrolling: true,
      enableObjectPooling: true,
      enableBatchUpdates: true,
      enableMetrics: true,
    });

    // Initialize performance panel
    this.panel = new PerformancePanel(
      {
        container: this.container,
        position: 'top-right',
        updateInterval: 1000,
        showFPS: true,
        showMemory: true,
        showLatency: true,
        showCustom: true,
      },
      this.collector
    );

    // Setup callbacks
    this.setupCallbacks();

    // Populate with sample data
    this.populateGrid();
  }

  /**
   * Setup grid callbacks
   */
  private setupCallbacks(): void {
    this.grid.onCellSelected = (row, col) => {
      console.log(`Selected: ${row}, ${col}`);
    };

    this.grid.onCellHovered = (row, col) => {
      // Could show tooltip
    };

    this.grid.onCellEditing = (row, col) => {
      console.log(`Editing: ${row}, ${col}`);
    };
  }

  /**
   * Populate grid with sample data
   */
  private populateGrid(): void {
    const timer = new OperationTimer(this.collector, 'populate_grid');

    try {
      // Create input cells in first column
      for (let row = 0; row < 1000; row++) {
        const value = Math.random() * 100;

        this.grid.setCellData(row, 0, {
          row,
          col: 0,
          value: value.toFixed(2),
          state: CellState.DORMANT,
          type: 'input',
        });
      }

      // Create formula cells in other columns
      for (let col = 1; col < 100; col++) {
        for (let row = 0; row < 1000; row++) {
          const value = `=A${row + 1} * ${col + 1}`;

          this.grid.setCellData(row, col, {
            row,
            col,
            value,
            state: CellState.PROCESSING,
            type: 'formula',
          });
        }
      }

      // Create summary cells
      for (let col = 0; col < 100; col++) {
        this.grid.setCellData(1000, col, {
          row: 1000,
          col,
          value: `=SUM(A1:A1000)`,
          state: CellState.DORMANT,
          type: 'aggregate',
        });
      }
    } finally {
      timer.end();
    }
  }

  /**
   * Simulate real-time updates
   */
  startRealtimeUpdates(): void {
    setInterval(() => {
      const timer = new OperationTimer(this.collector, 'realtime_update');

      try {
        // Update random cells
        for (let i = 0; i < 10; i++) {
          const row = Math.floor(Math.random() * 1000);
          const col = 0;
          const value = Math.random() * 100;

          this.grid.setCellData(row, col, {
            row,
            col,
            value: value.toFixed(2),
            state: CellState.EMITTING,
            type: 'input',
          });
        }
      } finally {
        timer.end();
      }
    }, 100);
  }

  /**
   * Run performance benchmark
   */
  async runBenchmark(): Promise<BenchmarkResults> {
    console.log('Running performance benchmark...');

    const results: BenchmarkResults = {
      gridSize: this.grid['config'].rowCount * this.grid['config'].colCount,
      renderTime: 0,
      fps: 0,
      memoryUsage: 0,
      scorecard: 'good',
    };

    // Warmup
    for (let i = 0; i < 10; i++) {
      this.grid.scrollToCell(i * 100, 0, false);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Measure render performance
    const startTime = performance.now();
    for (let i = 0; i < 100; i++) {
      this.grid.scrollToCell(i * 100, 0, false);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const endTime = performance.now();

    results.renderTime = (endTime - startTime) / 100;

    // Get current metrics
    const metrics = this.collector.getMetrics();
    results.fps = metrics.fps;
    results.memoryUsage = metrics.memoryUsage.usagePercentage;

    const scorecard = this.collector.getScorecard();
    results.scorecard = scorecard.overall;

    console.log('Benchmark Results:', results);
    return results;
  }

  /**
   * Print performance summary
   */
  printSummary(): void {
    console.log(this.grid.getPerformanceSummary());

    const metrics = this.collector.getMetrics();
    console.log('\nDetailed Metrics:');
    console.log(`FPS: ${metrics.fps.toFixed(1)}`);
    console.log(`Frame Time: ${metrics.frameTime.toFixed(2)}ms`);
    console.log(`Memory: ${metrics.memoryUsage.usagePercentage.toFixed(1)}%`);
    console.log(`Latency (p95): ${metrics.latency.p95.toFixed(2)}ms`);
  }

  /**
   * Export performance data
   */
  exportData(): string {
    return JSON.stringify({
      metrics: this.collector.getMetrics(),
      scorecard: this.collector.getScorecard(),
      history: this.collector.getHistory(),
      gridMetrics: this.grid.getMetrics(),
    }, null, 2);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.panel.destroy();
    this.grid.destroy();
    this.collector.stop();
    this.container.remove();
  }
}

interface BenchmarkResults {
  gridSize: number;
  renderTime: number;
  fps: number;
  memoryUsage: number;
  scorecard: 'good' | 'ok' | 'poor';
}

/**
 * Run example
 */
export async function runPerformanceExample(): Promise<void> {
  console.log('=== POLLN Spreadsheet Performance Example ===\n');

  const example = new PerformanceExample();

  console.log('Grid initialized with 100K cells');
  console.log('Virtual scrolling: ENABLED');
  console.log('Object pooling: ENABLED');
  console.log('Batch updates: ENABLED');
  console.log('Metrics: ENABLED\n');

  // Wait for initialization
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Start realtime updates
  console.log('Starting realtime updates...');
  example.startRealtimeUpdates();

  // Wait for stable metrics
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Run benchmark
  const results = await example.runBenchmark();

  console.log('\n=== Benchmark Complete ===');
  console.log(`Grid Size: ${(results.gridSize / 1000000).toFixed(0)}M cells`);
  console.log(`Avg Render Time: ${results.renderTime.toFixed(2)}ms`);
  console.log(`FPS: ${results.fps.toFixed(1)}`);
  console.log(`Memory: ${results.memoryUsage.toFixed(1)}%`);
  console.log(`Status: ${results.scorecard.toUpperCase()}`);

  // Print summary
  console.log('\n=== Performance Summary ===');
  example.printSummary();

  // Export data
  const data = example.exportData();
  console.log('\nExported performance data:', data.substring(0, 200) + '...');

  // Keep running
  console.log('\nExample continues running. Press Ctrl+C to exit.');
}

/**
 * Quick start - minimal example
 */
export function quickStart(): void {
  console.log('=== Quick Start ===\n');

  // Create container
  const container = document.createElement('div');
  container.style.width = '100vw';
  container.style.height = '100vh';
  document.body.appendChild(container);

  // Create metrics collector
  const collector = new MetricsCollector();
  collector.start();

  // Create grid
  const grid = new GridDisplay({
    container,
    rowCount: 100000,
    colCount: 1000,
    rowHeight: 25,
    colWidth: 100,
    enableVirtualScrolling: true,
    enableObjectPooling: true,
    enableBatchUpdates: true,
    enableMetrics: true,
  });

  // Add some data
  grid.setCellData(0, 0, {
    row: 0,
    col: 0,
    value: 'Hello, World!',
    state: CellState.DORMANT,
    type: 'input',
  });

  // Create performance panel
  const panel = new PerformancePanel(
    {
      container,
      position: 'top-right',
    },
    collector
  );

  console.log('Grid created!');
  console.log('Performance panel visible in top-right corner');
  console.log('\nTry:');
  console.log('- Scroll around the grid');
  console.log('- Click on cells to select');
  console.log('- Double-click to edit');
  console.log('- Watch performance metrics update');
}

// Export for browser
if (typeof window !== 'undefined') {
  (window as any).POLLNPerformanceExample = {
    PerformanceExample,
    runPerformanceExample,
    quickStart,
  };
}
