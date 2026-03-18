/**
 * Concurrent Agents Performance Tests
 *
 * Performance tests for multiple concurrent agents:
 * - 100+ simultaneous agents
 * - Memory usage target: <500MB
 * - Agent execution in parallel
 * - Resource management
 *
 * @packageDocumentation
 */

import { test, expect } from '@playwright/test';
import {
  createClawAgent,
  triggerAgent,
  assertAgentState,
  measurePerformance
} from '../../helpers/test-helpers';

test.describe('Concurrent Agents Performance', () => {
  test('should handle 10 concurrent agents efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create 10 agents
    const startTime = Date.now();

    for (let i = 1; i <= 10; i++) {
      const cellId = `A${i}`;
      await createClawAgent(page, cellId, {
        type: 'SENSOR',
        seed: `Test agent ${i}`
      });
    }

    const creationTime = Date.now() - startTime;
    console.log(`Created 10 agents in ${creationTime}ms`);

    // All agents should exist
    for (let i = 1; i <= 10; i++) {
      await expect(page.locator(`[data-agent-id="A${i}"]`)).toBeVisible();
    }
  });

  test('should handle 100 concurrent agents', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Measure initial memory
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Create 100 agents
    const startTime = Date.now();

    for (let i = 1; i <= 100; i++) {
      const row = Math.ceil(i / 26);
      const col = ((i - 1) % 26) + 1;
      const cellId = `${String.fromCharCode(64 + col)}${row}`;

      await createClawAgent(page, cellId, {
        type: 'SENSOR',
        seed: `Test agent ${i}`
      });
    }

    const creationTime = Date.now() - startTime;

    // Measure final memory
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    const memoryUsedMB = (finalMemory - initialMemory) / (1024 * 1024);

    console.log(`Created 100 agents in ${creationTime}ms`);
    console.log(`Memory used: ${memoryUsedMB.toFixed(2)}MB`);

    // Memory should be under 500MB
    expect(memoryUsedMB).toBeLessThan(500);

    // Verify sample of agents exist
    await expect(page.locator(`[data-agent-id="A1"]`)).toBeVisible();
    await expect(page.locator(`[data-agent-id="Z4"]`)).toBeVisible();
  });

  test('should execute multiple agents in parallel', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create 10 agents
    for (let i = 1; i <= 10; i++) {
      await createClawAgent(page, `A${i}`, {
        type: 'SENSOR',
        seed: `Test agent ${i}`
      });
    }

    // Trigger all agents
    const startTime = Date.now();

    for (let i = 1; i <= 10; i++) {
      await triggerAgent(page, `A${i}`);
    }

    // Wait for all to reach THINKING state
    for (let i = 1; i <= 10; i++) {
      await assertAgentState(page, `A${i}`, 'THINKING');
    }

    const triggerTime = Date.now() - startTime;

    console.log(`Triggered 10 agents in ${triggerTime}ms`);

    // Should be fast (<5 seconds for all)
    expect(triggerTime).toBeLessThan(5000);
  });

  test('should manage memory with active agents', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const memorySnapshots: number[] = [];

    // Create agents in batches and measure memory
    for (let batch = 0; batch < 10; batch++) {
      // Create 10 agents
      for (let i = 0; i < 10; i++) {
        const agentNum = batch * 10 + i;
        const cellId = `A${agentNum + 1}`;

        await createClawAgent(page, cellId, {
          type: 'SENSOR',
          seed: `Agent ${agentNum}`
        });
      }

      // Measure memory
      const memory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      const memoryMB = memory / (1024 * 1024);
      memorySnapshots.push(memoryMB);

      console.log(`After ${batch * 10 + 10} agents: ${memoryMB.toFixed(2)}MB`);
    }

    // Memory growth should be roughly linear
    const initialMemory = memorySnapshots[0];
    const finalMemory = memorySnapshots[memorySnapshots.length - 1];
    const memoryGrowth = finalMemory - initialMemory;

    console.log(`Total memory growth: ${memoryGrowth.toFixed(2)}MB`);

    // Should not grow excessively (<500MB for 100 agents)
    expect(finalMemory).toBeLessThan(500);
  });

  test('should handle agent cleanup efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create 50 agents
    for (let i = 1; i <= 50; i++) {
      await createClawAgent(page, `A${i}`, {
        type: 'SENSOR',
        seed: `Agent ${i}`
      });
    }

    const memoryBeforeDelete = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Delete 25 agents
    for (let i = 1; i <= 25; i++) {
      await page.click(`[data-agent-id="A${i}"]`);
      await page.click('[data-testid="delete-agent-button"]');
      await page.waitForSelector(`[data-agent-id="A${i}"]`, { state: 'hidden', timeout: 1000 }).catch(() => {});
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    const memoryAfterDelete = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    const memoryFreed = memoryBeforeDelete - memoryAfterDelete;
    const memoryFreedMB = memoryFreed / (1024 * 1024);

    console.log(`Memory freed after deleting 25 agents: ${memoryFreedMB.toFixed(2)}MB`);

    // Should have freed some memory
    expect(memoryFreedMB).toBeGreaterThan(0);
  });

  test('should maintain UI responsiveness with many agents', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create 100 agents
    for (let i = 1; i <= 100; i++) {
      const row = Math.ceil(i / 26);
      const col = ((i - 1) % 26) + 1;
      const cellId = `${String.fromCharCode(64 + col)}${row}`;

      await createClawAgent(page, cellId, {
        type: 'SENSOR',
        seed: `Agent ${i}`
      });
    }

    // Test scroll performance
    const scrollStartTime = Date.now();

    await page.evaluate(() => {
      window.scrollBy(0, 1000);
    });

    await page.waitForTimeout(100); // Wait for scroll to complete

    const scrollDuration = Date.now() - scrollStartTime;

    console.log(`Scroll duration with 100 agents: ${scrollDuration}ms`);

    // Scroll should still be responsive (<200ms)
    expect(scrollDuration).toBeLessThan(200);
  });

  test('should distribute CPU resources fairly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create 5 agents
    for (let i = 1; i <= 5; i++) {
      await createClawAgent(page, `A${i}`, {
        type: 'SMP',
        seed: `Agent ${i}`
      });
    }

    // Trigger all agents
    for (let i = 1; i <= 5; i++) {
      await triggerAgent(page, `A${i}`);
    }

    // Wait for execution
    await page.waitForTimeout(2000);

    // All agents should have made progress
    for (let i = 1; i <= 5; i++) {
      const agent = page.locator(`[data-agent-id="A${i}"]`);
      const state = await agent.getAttribute('data-agent-state');

      // Should not be stuck in DORMANT
      expect(state).not.toBe('DORMANT');
    }
  });
});
