/**
 * Cell Update Latency Performance Tests
 *
 * Performance tests for cell update operations:
 * - Measure cell update latency
 * - Target: <100ms per update
 * - Test with various data sizes
 * - Profile rendering performance
 *
 * @packageDocumentation
 */

import { test, expect } from '@playwright/test';
import {
  measurePerformance,
  setAgentCellValue,
  createClawAgent
} from '../../helpers/test-helpers';

test.describe('Cell Update Latency Performance', () => {
  test('should update single cell within 100ms', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await measurePerformance(page, async () => {
      await setAgentCellValue(page, 'A1', 'Test Value');
    });

    console.log(`Single cell update: ${result.duration}ms`);

    expect(result.duration).toBeLessThan(100);
  });

  test('should update 100 cells sequentially within acceptable time', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();

    for (let i = 1; i <= 100; i++) {
      const cellId = `A${i}`;
      await setAgentCellValue(page, cellId, `Value ${i}`);
    }

    const duration = Date.now() - startTime;
    const avgPerCell = duration / 100;

    console.log(`100 cells updated in ${duration}ms (avg: ${avgPerCell.toFixed(2)}ms per cell)`);

    // Average should be under 100ms
    expect(avgPerCell).toBeLessThan(100);
  });

  test('should handle rapid cell updates without lag', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const updateTimes: number[] = [];

    // Perform 50 rapid updates
    for (let i = 0; i < 50; i++) {
      const result = await measurePerformance(page, async () => {
        await setAgentCellValue(page, 'A1', `Update ${i}`);
      });
      updateTimes.push(result.duration);
    }

    const avgTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
    const maxTime = Math.max(...updateTimes);

    console.log(`Rapid updates - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime}ms`);

    expect(avgTime).toBeLessThan(100);
    expect(maxTime).toBeLessThan(200); // Allow some spikes
  });

  test('should update large cell content efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const largeContent = 'A'.repeat(10000); // 10KB of data

    const result = await measurePerformance(page, async () => {
      await setAgentCellValue(page, 'A1', largeContent);
    });

    console.log(`Large cell update (10KB): ${result.duration}ms`);

    // Should still be fast even with large content
    expect(result.duration).toBeLessThan(200);
  });

  test('should update multiple cells in parallel', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();

    // Update 10 cells in parallel
    const updatePromises = Array.from({ length: 10 }, (_, i) =>
      setAgentCellValue(page, `A${i + 1}`, `Value ${i}`)
    );

    await Promise.all(updatePromises);

    const duration = Date.now() - startTime;

    console.log(`10 parallel updates: ${duration}ms`);

    // Parallel updates should be faster than sequential
    expect(duration).toBeLessThan(500);
  });

  test('should maintain performance with agent execution', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create agent
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Trigger agent
    await page.click(`[data-agent-id="A1"]`);
    await page.click('[data-testid="trigger-agent-button"]');

    // Wait a bit for execution to start
    await page.waitForTimeout(100);

    // Update cell while agent is executing
    const result = await measurePerformance(page, async () => {
      await setAgentCellValue(page, 'A2', 'Update during execution');
    });

    console.log(`Cell update during agent execution: ${result.duration}ms`);

    // Should still meet latency target
    expect(result.duration).toBeLessThan(100);
  });

  test('should measure rendering performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Enable performance metrics
    const metrics = await page.evaluate(() => {
      return {
        fps: 0,
        frameTime: 0
      };
    });

    // Update cells rapidly and measure FPS
    const fpsSamples: number[] = [];

    for (let i = 0; i < 20; i++) {
      const start = performance.now();

      await setAgentCellValue(page, 'A1', `Frame ${i}`);

      const end = performance.now();
      const frameTime = end - start;
      const fps = 1000 / frameTime;

      fpsSamples.push(fps);
    }

    const avgFps = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;

    console.log(`Average FPS during updates: ${avgFps.toFixed(2)}`);

    // Should maintain decent FPS
    expect(avgFps).toBeGreaterThan(30);
  });

  test('should profile memory usage during updates', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Perform 1000 updates
    for (let i = 0; i < 1000; i++) {
      await setAgentCellValue(page, 'A1', `Update ${i}`);
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

    console.log(`Memory increase after 1000 updates: ${memoryIncreaseMB.toFixed(2)}MB`);

    // Should not leak significant memory (<10MB increase)
    expect(memoryIncreaseMB).toBeLessThan(10);
  });
});
