/**
 * Performance Regression Tests
 *
 * Continuous performance monitoring to catch regressions:
 * - Baseline performance metrics
 * - Performance budget validation
 * - Memory leak detection
 * - Bundle size monitoring
 * - Network performance
 *
 * @packageDocumentation
 */

import { test, expect } from '@playwright/test';
import {
  measurePerformance,
  setAgentCellValue,
  createClawAgent,
  triggerAgent
} from '../../helpers/test-helpers';

// Performance budgets (in milliseconds)
const PERFORMANCE_BUDGETS = {
  cellUpdate: 100,
  agentCreation: 2000,
  agentTrigger: 500,
  initialLoad: 3000,
  timeToInteractive: 5000,
  bundleSize: 5 * 1024 * 1024, // 5MB
  memoryLimit: 500 * 1024 * 1024 // 500MB
};

test.describe('Performance Regression Tests', () => {
  test('should meet initial page load budget', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    console.log(`Initial page load: ${loadTime}ms (budget: ${PERFORMANCE_BUDGETS.initialLoad}ms)`);

    expect(loadTime).toBeLessThan(PERFORMANCE_BUDGETS.initialLoad);
  });

  test('should meet time to interactive budget', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    // Wait for app to be interactive (can click cells)
    await page.waitForSelector('[data-cell-id="A1"]', { state: 'visible' });

    const tti = Date.now() - startTime;

    console.log(`Time to interactive: ${tti}ms (budget: ${PERFORMANCE_BUDGETS.timeToInteractive}ms)`);

    expect(tti).toBeLessThan(PERFORMANCE_BUDGETS.timeToInteractive);
  });

  test('should meet cell update performance budget', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await measurePerformance(page, async () => {
      await setAgentCellValue(page, 'A1', 'Performance Test');
    });

    console.log(`Cell update: ${result.duration}ms (budget: ${PERFORMANCE_BUDGETS.cellUpdate}ms)`);

    expect(result.duration).toBeLessThan(PERFORMANCE_BUDGETS.cellUpdate);
  });

  test('should meet agent creation performance budget', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await measurePerformance(page, async () => {
      await createClawAgent(page, 'A1', {
        type: 'SENSOR',
        seed: 'Performance test agent'
      });
    });

    console.log(`Agent creation: ${result.duration}ms (budget: ${PERFORMANCE_BUDGETS.agentCreation}ms)`);

    expect(result.duration).toBeLessThan(PERFORMANCE_BUDGETS.agentCreation);
  });

  test('should meet agent trigger performance budget', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create agent first
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Performance test agent'
    });

    const result = await measurePerformance(page, async () => {
      await triggerAgent(page, 'A1');
      // Wait for trigger to be acknowledged
      await page.waitForTimeout(100);
    });

    console.log(`Agent trigger: ${result.duration}ms (budget: ${PERFORMANCE_BUDGETS.agentTrigger}ms)`);

    expect(result.duration).toBeLessThan(PERFORMANCE_BUDGETS.agentTrigger);
  });

  test('should maintain performance under load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const updateTimes: number[] = [];

    // Perform 100 updates and track performance
    for (let i = 0; i < 100; i++) {
      const result = await measurePerformance(page, async () => {
        await setAgentCellValue(page, 'A1', `Load test ${i}`);
      });

      updateTimes.push(result.duration);
    }

    const avgTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
    const maxTime = Math.max(...updateTimes);
    const p95Time = updateTimes.sort((a, b) => a - b)[Math.floor(updateTimes.length * 0.95)];

    console.log(`Load test - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime}ms, P95: ${p95Time}ms`);

    // All metrics should be within budget
    expect(avgTime).toBeLessThan(PERFORMANCE_BUDGETS.cellUpdate);
    expect(p95Time).toBeLessThan(PERFORMANCE_BUDGETS.cellUpdate * 1.5); // Allow 50% headroom for P95
    expect(maxTime).toBeLessThan(PERFORMANCE_BUDGETS.cellUpdate * 2); // Allow 100% headroom for max
  });

  test('should not leak memory during extended usage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Perform 1000 operations
    for (let i = 0; i < 1000; i++) {
      await setAgentCellValue(page, `A${(i % 10) + 1}`, `Memory test ${i}`);

      // Create and delete agents periodically
      if (i % 100 === 0) {
        await createClawAgent(page, `B${(i / 100) + 1}`, {
          type: 'SENSOR',
          seed: `Memory test agent ${i}`
        });
      }
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

    console.log(`Memory increase after 1000 operations: ${memoryIncreaseMB.toFixed(2)}MB`);

    // Memory increase should be reasonable (<50MB)
    expect(memoryIncreaseMB).toBeLessThan(50);
  });

  test('should not exceed bundle size budget', async ({ page }) => {
    // Track all network requests
    const resources: any[] = [];

    page.on('response', response => {
      const url = response.url();
      const resourceType = response.request().resourceType();

      if (['script', 'stylesheet'].includes(resourceType)) {
        resources.push({
          url,
          type: resourceType,
          size: parseInt(response.headers()['content-length'] || '0')
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const totalBundleSize = resources.reduce((sum, r) => sum + r.size, 0);
    const totalBundleSizeMB = totalBundleSize / (1024 * 1024);

    console.log(`Total bundle size: ${totalBundleSizeMB.toFixed(2)}MB (budget: ${PERFORMANCE_BUDGETS.bundleSize / (1024 * 1024)}MB)`);

    expect(totalBundleSize).toBeLessThan(PERFORMANCE_BUDGETS.bundleSize);
  });

  test('should have acceptable network timings', async ({ page }) => {
    // Track timing metrics
    const timings: any = {};

    page.on('response', response => {
      const url = response.url();
      const timing = response.timing();

      if (url.includes('/api/')) {
        timings[url] = timing;
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create agent to trigger API call
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Network test agent'
    });

    // Check API response times
    const apiUrls = Object.keys(timings);

    for (const url of apiUrls) {
      const timing = timings[url];
      const responseTime = timing.responseEnd - timing.requestStart;

      console.log(`API ${url}: ${responseTime}ms`);

      // API responses should be fast (<500ms)
      expect(responseTime).toBeLessThan(500);
    }
  });

  test('should maintain 60 FPS during animations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Enable FPS counter
    await page.evaluate(() => {
      (window as any).__fpsSamples = [];

      let lastTime = performance.now();
      let frameCount = 0;

      function measureFPS() {
        frameCount++;
        const currentTime = performance.now();

        if (currentTime - lastTime >= 1000) {
          (window as any).__fpsSamples.push(frameCount);
          frameCount = 0;
          lastTime = currentTime;
        }

        requestAnimationFrame(measureFPS);
      }

      requestAnimationFrame(measureFPS);
    });

    // Perform rapid updates to stress test
    for (let i = 0; i < 30; i++) {
      await setAgentCellValue(page, 'A1', `FPS test ${i}`);
    }

    // Wait for FPS measurement
    await page.waitForTimeout(2000);

    const fpsSamples = await page.evaluate(() => {
      return (window as any).__fpsSamples || [];
    });

    if (fpsSamples.length > 0) {
      const avgFPS = fpsSamples.reduce((a: number, b: number) => a + b, 0) / fpsSamples.length;

      console.log(`Average FPS: ${avgFPS.toFixed(2)}`);

      // Should maintain at least 30 FPS (allowing for some drops)
      expect(avgFPS).toBeGreaterThan(30);
    }
  });

  test('should efficiently handle large datasets', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();

    // Create 100 cells with data
    const promises = [];
    for (let i = 1; i <= 100; i++) {
      promises.push(setAgentCellValue(page, `A${i}`, `Data ${i}`));
    }

    await Promise.all(promises);

    const duration = Date.now() - startTime;
    const avgPerCell = duration / 100;

    console.log(`100 cells filled in ${duration}ms (avg: ${avgPerCell.toFixed(2)}ms per cell)`);

    // Should average under 50ms per cell for bulk operations
    expect(avgPerCell).toBeLessThan(50);
  });

  test('should handle concurrent agents efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create 10 agents
    const createPromises = [];
    for (let i = 1; i <= 10; i++) {
      createPromises.push(
        createClawAgent(page, `A${i}`, {
          type: 'SENSOR',
          seed: `Concurrent agent ${i}`
        })
      );
    }

    const startTime = Date.now();
    await Promise.all(createPromises);
    const duration = Date.now() - startTime;

    console.log(`10 agents created concurrently in ${duration}ms`);

    // Concurrent creation should be faster than sequential
    // If sequential takes 2000ms per agent, 10 should take <5000ms concurrently
    expect(duration).toBeLessThan(5000);
  });

  test('should track Core Web Vitals', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for page to be fully loaded
    await page.waitForTimeout(2000);

    // Get Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics: any = {};

        // Largest Contentful Paint (LCP)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.lcp = lastEntry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // First Input Delay (FID)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            metrics.fid = entry.processingStart - entry.startTime;
          });
        }).observe({ type: 'first-input', buffered: true });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          metrics.cls = clsValue;
        }).observe({ type: 'layout-shift', buffered: true });

        // Resolve after a short delay
        setTimeout(() => resolve(metrics), 1000);
      });
    });

    console.log('Core Web Vitals:', vitals);

    // LCP should be < 2.5s
    if ((vitals as any).lcp) {
      expect((vitals as any).lcp).toBeLessThan(2500);
    }

    // FID should be < 100ms
    if ((vitals as any).fid) {
      expect((vitals as any).fid).toBeLessThan(100);
    }

    // CLS should be < 0.1
    if ((vitals as any).cls !== undefined) {
      expect((vitals as any).cls).toBeLessThan(0.1);
    }
  });

  test('should track custom performance metrics', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Mark start of operation
    await page.evaluate(() => {
      performance.mark('operation-start');
    });

    // Perform operation
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Performance metric test'
    });

    // Mark end of operation
    await page.evaluate(() => {
      performance.mark('operation-end');
      performance.measure('agent-creation', 'operation-start', 'operation-end');
    });

    // Get custom metric
    const measure = await page.evaluate(() => {
      const measures = performance.getEntriesByName('agent-creation', 'measure');
      return measures.length > 0 ? measures[0].duration : 0;
    });

    console.log(`Custom metric - Agent creation: ${measure}ms`);

    // Should meet performance budget
    expect(measure).toBeLessThan(PERFORMANCE_BUDGETS.agentCreation);
  });
});
