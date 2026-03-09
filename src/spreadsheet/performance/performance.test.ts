/**
 * POLLN Spreadsheet - Performance Tests
 *
 * Comprehensive benchmarks and regression tests.
 * Target: 100K cells with <16ms frame time.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { VirtualGrid } from './VirtualGrid.js';
import { CellPool, HeavyCellPool } from './CellPool.js';
import { BatchScheduler, DebouncedScheduler, ThrottledScheduler } from './BatchScheduler.js';
import { MetricsCollector, OperationTimer } from './MetricsCollector.js';
import { LogCell } from '../core/LogCell.js';
import { CellType } from '../core/types.js';

describe('Performance: VirtualGrid', () => {
  let container: HTMLElement;
  let virtualGrid: VirtualGrid;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (virtualGrid) {
      virtualGrid.destroy();
    }
    container.remove();
  });

  it('should initialize with large grid', () => {
    virtualGrid = new VirtualGrid({
      rowCount: 100000,
      colCount: 1000,
      rowHeight: 25,
      colWidth: 100,
      container,
    });

    const range = virtualGrid.getVisibleRange();
    expect(range.startRow).toBe(0);
    expect(range.endRow).toBeGreaterThanOrEqual(0);
  });

  it('should render only visible cells', () => {
    virtualGrid = new VirtualGrid({
      rowCount: 100000,
      colCount: 1000,
      rowHeight: 25,
      colWidth: 100,
      container,
      bufferRowCount: 2,
      bufferColCount: 2,
    });

    const metrics = virtualGrid.getMetrics();
    // Should render much fewer than total cells
    expect(metrics.visibleCellCount).toBeLessThan(1000);
    expect(metrics.totalCellCount).toBe(100000000); // 100K * 1K
  });

  it('should render in less than 16ms', () => {
    virtualGrid = new VirtualGrid({
      rowCount: 100000,
      colCount: 1000,
      rowHeight: 25,
      colWidth: 100,
      container,
    });

    const startTime = performance.now();
    virtualGrid.render(() => {
      const element = document.createElement('div');
      return element;
    });
    const endTime = performance.now();

    const renderTime = endTime - startTime;
    expect(renderTime).toBeLessThan(16);
  });

  it('should recycle elements efficiently', () => {
    virtualGrid = new VirtualGrid({
      rowCount: 100000,
      colCount: 1000,
      rowHeight: 25,
      colWidth: 100,
      container,
    });

    // Initial render
    virtualGrid.render(() => document.createElement('div'));

    const metrics1 = virtualGrid.getMetrics();
    const initialRecycled = metrics1.recycledElementCount;

    // Scroll and render again
    container.scrollTop = 1000;
    virtualGrid.render(() => document.createElement('div'));

    const metrics2 = virtualGrid.getMetrics();
    expect(metrics2.recycledElementCount).toBeGreaterThan(initialRecycled);
  });

  it('should track performance metrics', () => {
    virtualGrid = new VirtualGrid({
      rowCount: 1000,
      colCount: 100,
      rowHeight: 25,
      colWidth: 100,
      container,
    });

    const metrics = virtualGrid.getMetrics();

    expect(metrics).toHaveProperty('renderCount');
    expect(metrics).toHaveProperty('recycleCount');
    expect(metrics).toHaveProperty('lastRenderTime');
    expect(metrics).toHaveProperty('avgRenderTime');
  });
});

describe('Performance: CellPool', () => {
  let pool: CellPool;

  beforeEach(() => {
    pool = new CellPool({
      initialSize: 10,
      maxSize: 100,
    });

    // Register factory for testing
    pool.registerFactory(CellType.INPUT, () => {
      return new LogCell({
        id: 'test',
        type: CellType.INPUT,
        logicLevel: 0,
      });
    });
  });

  afterEach(() => {
    pool.clear();
  });

  it('should acquire cells from pool', () => {
    const cell = pool.acquire(CellType.INPUT);
    expect(cell).toBeDefined();
  });

  it('should reuse cells', () => {
    const cell1 = pool.acquire(CellType.INPUT);
    pool.release(cell1!);
    const cell2 = pool.acquire(CellType.INPUT);

    // Should return same cell
    expect(cell1).toBe(cell2);
  });

  it('should track pool statistics', () => {
    pool.acquire(CellType.INPUT);
    pool.acquire(CellType.INPUT);
    pool.acquire(CellType.INPUT);

    const stats = pool.getStats(CellType.INPUT);
    expect(stats).toBeDefined();
    expect(stats?.inUse).toBe(3);
  });

  it('should grow pool when needed', () => {
    // Acquire more than initial size
    const cells: LogCell[] = [];
    for (let i = 0; i < 20; i++) {
      const cell = pool.acquire(CellType.INPUT);
      if (cell) cells.push(cell);
    }

    const stats = pool.getStats(CellType.INPUT);
    expect(stats?.total).toBeGreaterThan(10);
  });

  it('should calculate reuse rate', () => {
    const cell1 = pool.acquire(CellType.INPUT);
    pool.release(cell1!);
    pool.acquire(CellType.INPUT);

    const allStats = pool.getStats();
    expect(allStats?.reuseRate).toBeGreaterThan(0);
  });
});

describe('Performance: HeavyCellPool', () => {
  let pool: HeavyCellPool;

  beforeEach(() => {
    pool = new HeavyCellPool({
      initialSize: 5,
      maxSize: 50,
    });

    pool.registerFactory(CellType.INPUT, () => {
      return new LogCell({
        id: 'test',
        type: CellType.INPUT,
        logicLevel: 0,
      });
    });
  });

  afterEach(() => {
    pool.clear();
  });

  it('should warm up pool', async () => {
    await pool.warmup(CellType.INPUT, 10);

    const stats = pool.getStats(CellType.INPUT);
    expect(stats?.total).toBeGreaterThanOrEqual(10);
  });

  it('should warm up all pools', async () => {
    // Register multiple types
    pool.registerFactory(CellType.OUTPUT, () => {
      return new LogCell({
        id: 'test',
        type: CellType.OUTPUT,
        logicLevel: 0,
      });
    });

    await pool.warmupAll(5);

    const inputStats = pool.getStats(CellType.INPUT);
    const outputStats = pool.getStats(CellType.OUTPUT);

    expect(inputStats?.total).toBeGreaterThanOrEqual(5);
    expect(outputStats?.total).toBeGreaterThanOrEqual(5);
  });
});

describe('Performance: BatchScheduler', () => {
  let scheduler: BatchScheduler;

  beforeEach(() => {
    scheduler = new BatchScheduler({
      maxTasksPerFrame: 10,
      maxFrameTime: 14,
    });
  });

  afterEach(() => {
    scheduler.destroy();
  });

  it('should schedule tasks', async () => {
    let executed = false;

    scheduler.schedule('test1', () => {
      executed = true;
    });

    await scheduler.flush();
    expect(executed).toBe(true);
  });

  it('should process tasks in batches', async () => {
    let count = 0;

    for (let i = 0; i < 20; i++) {
      scheduler.schedule(`task${i}`, () => {
        count++;
      });
    }

    await scheduler.flush();
    expect(count).toBe(20);
  });

  it('should prioritize tasks', async () => {
    const order: string[] = [];

    scheduler.schedule('low', () => order.push('low'), 1);
    scheduler.schedule('high', () => order.push('high'), 10);
    scheduler.schedule('medium', () => order.push('medium'), 5);

    await scheduler.flush();
    expect(order[0]).toBe('high');
  });

  it('should track metrics', () => {
    scheduler.schedule('test', () => {});

    const metrics = scheduler.getMetrics();
    expect(metrics).toHaveProperty('totalTasksProcessed');
    expect(metrics).toHaveProperty('totalBatchesProcessed');
  });

  it('should cancel scheduled tasks', () => {
    scheduler.schedule('test', () => {
      throw new Error('Should not execute');
    });

    scheduler.unschedule('test');
    scheduler.clear();

    expect(scheduler.getPendingCount()).toBe(0);
  });
});

describe('Performance: DebouncedScheduler', () => {
  let scheduler: DebouncedScheduler;

  beforeEach(() => {
    scheduler = new DebouncedScheduler();
    scheduler.setDefaultDelay(100);
  });

  afterEach(() => {
    scheduler.clear();
  });

  it('should debounce execution', (done) => {
    let count = 0;

    scheduler.schedule('test', () => {
      count++;
    });

    scheduler.schedule('test', () => {
      count++;
    });

    setTimeout(() => {
      expect(count).toBe(1);
      done();
    }, 150);
  });

  it('should cancel pending tasks', () => {
    scheduler.schedule('test', () => {
      throw new Error('Should not execute');
    });

    scheduler.cancel('test');

    expect(scheduler.isPending('test')).toBe(false);
  });
});

describe('Performance: ThrottledScheduler', () => {
  let scheduler: ThrottledScheduler;

  beforeEach(() => {
    scheduler = new ThrottledScheduler();
    scheduler.setDefaultThrottle(100);
  });

  afterEach(() => {
    scheduler.clear();
  });

  it('should throttle execution', () => {
    let count = 0;

    // Execute multiple times quickly
    for (let i = 0; i < 10; i++) {
      scheduler.schedule('test', () => {
        count++;
      });
    }

    // Should only execute once due to throttling
    expect(count).toBe(1);
  });

  it('should allow execution after throttle period', (done) => {
    let count = 0;

    scheduler.schedule('test', () => {
      count++;
    });

    setTimeout(() => {
      scheduler.schedule('test', () => {
        count++;
      });
      expect(count).toBe(2);
      done();
    }, 150);
  });
});

describe('Performance: MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector({
      sampleInterval: 100,
      historySize: 10,
    });
  });

  afterEach(() => {
    collector.stop();
  });

  it('should collect FPS metrics', (done) => {
    collector.start();

    setTimeout(() => {
      const fps = collector.getCurrentFPS();
      expect(fps).toBeGreaterThanOrEqual(0);
      done();
    }, 200);
  });

  it('should collect memory metrics', () => {
    const memory = collector.getMemoryUsage();
    expect(memory).toHaveProperty('usedJSHeapSize');
    expect(memory).toHaveProperty('totalJSHeapSize');
  });

  it('should record latency', () => {
    collector.recordLatency(10);
    collector.recordLatency(20);
    collector.recordLatency(30);

    const latency = collector.getLatencyMetrics();
    expect(latency.avg).toBe(20);
    expect(latency.min).toBe(10);
    expect(latency.max).toBe(30);
  });

  it('should calculate percentiles', () => {
    for (let i = 1; i <= 100; i++) {
      collector.recordLatency(i);
    }

    const latency = collector.getLatencyMetrics();
    expect(latency.p50).toBe(50);
    expect(latency.p95).toBe(95);
    expect(latency.p99).toBe(99);
  });

  it('should track custom metrics', () => {
    collector.recordMetric('custom', 10);
    collector.recordMetric('custom', 20);
    collector.recordMetric('custom', 30);

    const value = collector.getMetric('custom');
    expect(value).toBe(20);
  });

  it('should generate scorecard', () => {
    const scorecard = collector.getScorecard();
    expect(scorecard).toHaveProperty('fps');
    expect(scorecard).toHaveProperty('memory');
    expect(scorecard).toHaveProperty('latency');
    expect(scorecard).toHaveProperty('overall');
  });

  it('should export metrics', () => {
    collector.recordLatency(10);
    collector.recordMetric('test', 5);

    const exported = collector.export();
    const data = JSON.parse(exported);

    expect(data).toHaveProperty('history');
    expect(data).toHaveProperty('latencySamples');
    expect(data).toHaveProperty('customMetrics');
  });
});

describe('Performance: Integration', () => {
  it('should handle 100K cells with acceptable performance', async () => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    try {
      const virtualGrid = new VirtualGrid({
        rowCount: 100000,
        colCount: 1000,
        rowHeight: 25,
        colWidth: 100,
        container,
      });

      const collector = new MetricsCollector();
      collector.start();

      // Simulate multiple renders
      const renderTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        virtualGrid.render(() => document.createElement('div'));
        const end = performance.now();
        renderTimes.push(end - start);

        // Simulate scroll
        container.scrollTop = i * 100;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const avgRenderTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length;

      // Target: <16ms per frame
      expect(avgRenderTime).toBeLessThan(16);

      collector.stop();
      virtualGrid.destroy();
    } finally {
      container.remove();
    }
  });

  it('should maintain FPS with rapid updates', async () => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    try {
      const virtualGrid = new VirtualGrid({
        rowCount: 10000,
        colCount: 100,
        rowHeight: 25,
        colWidth: 100,
        container,
      });

      const collector = new MetricsCollector();
      collector.start();

      // Rapid updates
      for (let i = 0; i < 100; i++) {
        virtualGrid.render(() => document.createElement('div'));
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const fps = collector.getCurrentFPS();
      const metrics = collector.getMetrics();

      // Should maintain reasonable FPS
      expect(fps).toBeGreaterThan(30);

      collector.stop();
      virtualGrid.destroy();
    } finally {
      container.remove();
    }
  });
});

describe('Performance: Regression Tests', () => {
  it('should not regress virtual grid performance', () => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    try {
      const virtualGrid = new VirtualGrid({
        rowCount: 100000,
        colCount: 1000,
        rowHeight: 25,
        colWidth: 100,
        container,
      });

      const startTime = performance.now();
      virtualGrid.render(() => document.createElement('div'));
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      // Regression check: should not exceed 20ms
      expect(renderTime).toBeLessThan(20);

      virtualGrid.destroy();
    } finally {
      container.remove();
    }
  });

  it('should not regress cell pool efficiency', () => {
    const pool = new CellPool({
      initialSize: 100,
      maxSize: 1000,
    });

    pool.registerFactory(CellType.INPUT, () => {
      return new LogCell({
        id: 'test',
        type: CellType.INPUT,
        logicLevel: 0,
      });
    });

    // Acquire and release many times
    const cells: LogCell[] = [];
    for (let i = 0; i < 50; i++) {
      const cell = pool.acquire(CellType.INPUT);
      if (cell) cells.push(cell);
    }

    cells.forEach((cell) => pool.release(cell));

    // Acquire again - should reuse
    const cell1 = pool.acquire(CellType.INPUT);
    pool.release(cell1!);
    const cell2 = pool.acquire(CellType.INPUT);

    expect(cell1).toBe(cell2);

    pool.clear();
  });
});
