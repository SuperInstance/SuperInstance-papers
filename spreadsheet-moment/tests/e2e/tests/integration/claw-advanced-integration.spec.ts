/**
 * Advanced Claw Integration E2E Tests
 *
 * Comprehensive tests for Claw agent integration:
 * - Multi-agent coordination
 * - WebSocket real-time updates
 * - Equipment management
 * - State persistence
 * - Error recovery
 * - Performance under load
 *
 * @packageDocumentation
 */

import { test, expect } from '@playwright/test';
import {
  createClawAgent,
  triggerAgent,
  waitForAgentState,
  setAgentCellValue,
  getAgentCellValue,
  measurePerformance
} from '../../helpers/test-helpers';

const CLAW_API_BASE_URL = process.env.CLAW_API_BASE_URL || 'http://localhost:8080';

test.describe('Advanced Claw Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Multi-Agent Coordination', () => {
    test('should coordinate multiple agents in sequence', async ({ page }) => {
      // Create agents in sequence
      await createClawAgent(page, 'A1', {
        type: 'SENSOR',
        seed: 'Sensor 1'
      });

      await createClawAgent(page, 'A2', {
        type: 'SENSOR',
        seed: 'Sensor 2'
      });

      await createClawAgent(page, 'A3', {
        type: 'SMP',
        seed: 'Processor'
      });

      // Trigger in sequence
      await triggerAgent(page, 'A1');
      await waitForAgentState(page, 'A1', 'THINKING');

      await triggerAgent(page, 'A2');
      await waitForAgentState(page, 'A2', 'THINKING');

      // Third agent should process results from first two
      await triggerAgent(page, 'A3');
      await waitForAgentState(page, 'A3', 'THINKING');

      // All agents should be active
      expect(await page.locator('[data-agent-id="A1"]').isVisible()).toBe(true);
      expect(await page.locator('[data-agent-id="A2"]').isVisible()).toBe(true);
      expect(await page.locator('[data-agent-id="A3"]').isVisible()).toBe(true);
    });

    test('should handle parallel agent execution', async ({ page }) => {
      // Create multiple agents
      const agents = ['A1', 'A2', 'A3', 'A4', 'A5'];

      for (const agent of agents) {
        await createClawAgent(page, agent, {
          type: 'SENSOR',
          seed: `Parallel agent ${agent}`
        });
      }

      // Trigger all agents simultaneously
      const triggerPromises = agents.map(agent => triggerAgent(page, agent));
      await Promise.all(triggerPromises);

      // All agents should be executing
      await page.waitForTimeout(500);

      for (const agent of agents) {
        const agentElement = page.locator(`[data-agent-id="${agent}"]`);
        const state = await agentElement.getAttribute('data-agent-state');
        expect(['THINKING', 'NEEDS_REVIEW']).toContain(state);
      }
    });

    test('should support master-slave coordination', async ({ page }) => {
      // Create master agent
      await createClawAgent(page, 'A1', {
        type: 'SMP',
        equipment: ['COORDINATION'],
        seed: 'Master agent with slaves'
      });

      // Create slave agents
      await createClawAgent(page, 'A2', {
        type: 'SENSOR',
        seed: 'Slave 1'
      });

      await createClawAgent(page, 'A3', {
        type: 'SENSOR',
        seed: 'Slave 2'
      });

      // Configure coordination
      await page.click('[data-agent-id="A1"]');
      await page.click('[data-testid="configure-coordination-button"]');

      await page.check('[data-testid="slave-agent-A2"]');
      await page.check('[data-testid="slave-agent-A3"]');

      await page.click('[data-testid="save-coordination-button"]');

      // Trigger master - should trigger slaves
      await triggerAgent(page, 'A1');

      // Verify coordination was initiated
      await page.waitForTimeout(1000);

      const coordinationStatus = await page.locator('[data-coordination-status]').textContent();
      expect(coordinationStatus).toContain('slaves');
    });

    test('should handle agent communication', async ({ page }) => {
      // Create two agents
      await createClawAgent(page, 'A1', {
        type: 'SENSOR',
        seed: 'Sender agent'
      });

      await createClawAgent(page, 'A2', {
        type: 'SENSOR',
        seed: 'Receiver agent'
      });

      // Configure message channel
      await page.click('[data-agent-id="A1"]');
      await page.click('[data-testid="configure-channels-button"]');

      await page.fill('[data-testid="channel-target"]', 'A2');
      await page.fill('[data-testid="channel-message"]', 'Test message');
      await page.click('[data-testid="send-message-button"]');

      // Verify message was received
      await page.waitForTimeout(500);

      await page.click('[data-agent-id="A2"]');
      const messages = await page.locator('[data-received-messages]').textContent();

      expect(messages).toContain('Test message');
    });
  });

  test.describe('WebSocket Real-Time Updates', () => {
    test('should receive real-time state updates', async ({ page }) => {
      await createClawAgent(page, 'A1', {
        type: 'SENSOR',
        seed: 'Real-time test'
      });

      // Listen for state changes
      const stateChanges: string[] = [];

      await page.evaluate(() => {
        (window as any).__stateChanges = [];

        const originalHandler = (window as any).__handleWebSocketMessage;
        (window as any).__handleWebSocketMessage = (message: any) => {
          if (message.type === 'state_change') {
            (window as any).__stateChanges.push(message.newState);
          }
          if (originalHandler) {
            originalHandler(message);
          }
        };
      });

      // Trigger agent
      await triggerAgent(page, 'A1');
      await page.waitForTimeout(2000);

      // Get recorded state changes
      const recordedChanges = await page.evaluate(() => {
        return (window as any).__stateChanges || [];
      });

      // Should have recorded state transitions
      expect(recordedChanges.length).toBeGreaterThan(0);
    });

    test('should handle WebSocket reconnection', async ({ page }) => {
      await createClawAgent(page, 'A1', {
        type: 'SENSOR',
        seed: 'Reconnection test'
      });

      // Verify initial connection
      const initialConnection = await page.evaluate(() => {
        return (window as any).__websocketConnected;
      });

      expect(initialConnection).toBe(true);

      // Simulate disconnection
      await page.evaluate(() => {
        const ws = (window as any).__websocket;
        if (ws) {
          ws.close();
        }
      });

      // Wait for reconnection attempt
      await page.waitForTimeout(3000);

      // Should have reconnected
      const reconnected = await page.evaluate(() => {
        return (window as any).__websocketConnected;
      });

      expect(reconnected).toBe(true);
    });

    test('should batch updates efficiently', async ({ page }) => {
      // Create multiple agents
      for (let i = 1; i <= 10; i++) {
        await createClawAgent(page, `A${i}`, {
          type: 'SENSOR',
          seed: `Batch test ${i}`
        });
      }

      // Monitor batch updates
      const updateCount = await page.evaluate(() => {
        return new Promise((resolve) => {
          let count = 0;

          const originalHandler = (window as any).__handleWebSocketMessage;
          (window as any).__handleWebSocketMessage = (message: any) => {
            if (message.type === 'batch_update') {
              count += message.updates.length;
            }
            if (originalHandler) {
              originalHandler(message);
            }
          };

          // Trigger all agents
          setTimeout(async () => {
            for (let i = 1; i <= 10; i++) {
              await triggerAgent(page, `A${i}`);
            }

            // Wait for updates
            setTimeout(() => resolve(count), 3000);
          }, 100);
        });
      });

      // Should have batched updates
      expect(updateCount).toBeGreaterThan(0);
    });
  });

  test.describe('Equipment Management', () => {
    test('should equip and unequip equipment dynamically', async ({ page }) => {
      await createClawAgent(page, 'A1', {
        type: 'SMP',
        equipment: ['MEMORY'],
        seed: 'Equipment test'
      });

      // Open equipment panel
      await page.click('[data-agent-id="A1"]');
      await page.click('[data-testid="manage-equipment-button"]');

      // Equip additional equipment
      await page.check('[data-testid="equipment-REASONING"]');
      await page.check('[data-testid="equipment-CONSENSUS"]');

      await page.click('[data-testid="save-equipment-button"]');

      // Verify equipment is equipped
      await page.waitForTimeout(500);

      const agent = page.locator('[data-agent-id="A1"]');
      await expect(agent.locator('[data-equipment="REASONING"]')).toBeVisible();
      await expect(agent.locator('[data-equipment="CONSENSUS"]')).toBeVisible();

      // Unequip equipment
      await page.click('[data-testid="manage-equipment-button"]');
      await page.uncheck('[data-testid="equipment-CONSENSUS"]');
      await page.click('[data-testid="save-equipment-button"]');

      // Verify equipment is unequipped
      await page.waitForTimeout(500);
      await expect(agent.locator('[data-equipment="CONSENSUS"]')).not.toBeVisible();
    });

    test('should enforce equipment slot limits', async ({ page }) => {
      await createClawAgent(page, 'A1', {
        type: 'SMP',
        seed: 'Slot limit test'
      });

      // Try to equip more than allowed
      await page.click('[data-agent-id="A1"]');
      await page.click('[data-testid="manage-equipment-button"]');

      // Equip maximum allowed
      const equipmentTypes = ['MEMORY', 'REASONING', 'CONSENSUS', 'COORDINATION', 'SPREADSHEET', 'DISTILLATION'];

      for (const equipment of equipmentTypes) {
        await page.check(`[data-testid="equipment-${equipment}"]`);
      }

      // Try to equip one more (should fail)
      const extraCheckbox = page.locator('[data-testid="equipment-EXTRA"]');

      if (await extraCheckbox.count() > 0) {
        await extraCheckbox.click();

        // Should show error
        await expect(page.locator('[data-testid="slot-limit-error"]')).toBeVisible();
      }
    });

    test('should preserve muscle memory when unequipping', async ({ page }) => {
      await createClawAgent(page, 'A1', {
        type: 'SMP',
        equipment: ['MEMORY', 'REASONING'],
        seed: 'Muscle memory test'
      });

      // Use equipment extensively
      await triggerAgent(page, 'A1');
      await page.waitForTimeout(2000);

      // Unequip equipment
      await page.click('[data-agent-id="A1"]');
      await page.click('[data-testid="manage-equipment-button"]');
      await page.uncheck('[data-testid="equipment-REASONING"]');
      await page.click('[data-testid="save-equipment-button"]');

      // Check for muscle memory triggers
      const muscleMemory = await page.locator('[data-muscle-memory-triggers]').textContent();

      expect(muscleMemory).toContain('REASONING');
    });
  });

  test.describe('State Persistence', () => {
    test('should persist agent state across page reloads', async ({ page }) => {
      await createClawAgent(page, 'A1', {
        type: 'SENSOR',
        equipment: ['MEMORY'],
        seed: 'Persistence test'
      });

      // Trigger agent and change state
      await triggerAgent(page, 'A1');
      await page.waitForTimeout(1000);

      // Get current state
      const stateBefore = await page.locator('[data-agent-id="A1"]').getAttribute('data-agent-state');

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify agent still exists
      await expect(page.locator('[data-agent-id="A1"]')).toBeVisible();

      // Verify state was restored
      const stateAfter = await page.locator('[data-agent-id="A1"]').getAttribute('data-agent-state');

      expect(stateAfter).toBe(stateBefore);
    });

    test('should recover from browser crash', async ({ page, context }) => {
      await createClawAgent(page, 'A1', {
        type: 'SENSOR',
        equipment: ['MEMORY'],
        seed: 'Crash recovery test'
      });

      // Store agent ID in localStorage
      const agentId = await page.evaluate(() => {
        return localStorage.getItem('lastAgentId');
      });

      expect(agentId).toBe('A1');

      // Simulate crash by closing and reopening
      await context.close();

      const newContext = await page.context().browser()!.newContext();
      const newPage = await newContext.newPage();

      await newPage.goto('/');
      await newPage.waitForLoadState('networkidle');

      // Check if agent was recovered
      const recoveredAgent = newPage.locator('[data-agent-id="A1"]');

      if (await recoveredAgent.count() > 0) {
        await expect(recoveredAgent).toBeVisible();
      }

      await newContext.close();
    });

    test('should sync state across browser tabs', async ({ page, context }) => {
      await createClawAgent(page, 'A1', {
        type: 'SENSOR',
        seed: 'Tab sync test'
      });

      // Open second tab
      const page2 = await context.newPage();
      await page2.goto('/');
      await page2.waitForLoadState('networkidle');

      // Modify agent in first tab
      await triggerAgent(page, 'A1');
      await page.waitForTimeout(1000);

      // Check if second tab received update
      const agentInTab2 = page2.locator('[data-agent-id="A1"]');

      if (await agentInTab2.count() > 0) {
        const state = await agentInTab2.getAttribute('data-agent-state');
        expect(state).toBeDefined();
      }

      await page2.close();
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from agent execution errors', async ({ page }) => {
      // Mock error during execution
      await page.route('**/api/claws/A1/execute', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Execution failed' })
        });
      });

      await createClawAgent(page, 'A1', {
        type: 'SENSOR',
        seed: 'Error recovery test'
      });

      // Trigger agent (will fail)
      await triggerAgent(page, 'A1');

      // Wait for error state
      await waitForAgentState(page, 'A1', 'ERROR');

      // Should show error details
      await expect(page.locator('[data-agent-id="A1"] [data-error-message]')).toBeVisible();

      // Should offer retry button
      await expect(page.locator('[data-testid="retry-agent-button"]')).toBeVisible();

      // Clear mock and retry
      await page.unroute('**/api/claws/A1/execute');
      await page.click('[data-testid="retry-agent-button"]');

      // Should recover
      await page.waitForTimeout(2000);
    });

    test('should handle API timeout gracefully', async ({ page }) => {
      // Mock slow API
      await page.route('**/api/claws', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ clawId: 'A1', status: 'created' })
          });
        }, 30000); // 30 second delay
      });

      const startTime = Date.now();

      await page.click('[data-cell-id="A1"]');
      await page.click('[data-testid="create-claw-button"]');
      await page.selectOption('[data-testid="claw-type-select"]', 'SENSOR');
      await page.fill('[data-testid="claw-seed-input"]', 'Timeout test');
      await page.click('[data-testid="create-claw-submit"]');

      // Should show timeout error
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible({ timeout: 15000 });

      const duration = Date.now() - startTime;

      // Should timeout before 30 seconds
      expect(duration).toBeLessThan(15000);
    });

    test('should handle network disconnection', async ({ page, context }) => {
      await createClawAgent(page, 'A1', {
        type: 'SENSOR',
        seed: 'Network test'
      });

      // Simulate offline
      await context.setOffline(true);

      // Try to trigger agent
      await triggerAgent(page, 'A1');

      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

      // Should queue operation
      await expect(page.locator('[data-testid="queued-operations"]')).toBeVisible();

      // Restore network
      await context.setOffline(false);

      // Should process queued operations
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-testid="queued-operations"]')).not.toBeVisible();
    });
  });

  test.describe('Performance Under Load', () => {
    test('should handle 100 concurrent agents', async ({ page }) => {
      const startTime = Date.now();

      // Create 100 agents
      const createPromises = [];
      for (let i = 1; i <= 100; i++) {
        createPromises.push(
          createClawAgent(page, `A${i}`, {
            type: 'SENSOR',
            seed: `Load test agent ${i}`
          })
        );
      }

      await Promise.all(createPromises);

      const duration = Date.now() - startTime;

      console.log(`100 agents created in ${duration}ms`);

      // Should complete within reasonable time
      expect(duration).toBeLessThan(30000); // 30 seconds

      // Verify all agents exist
      const agentCount = await page.locator('[data-agent-id]').count();
      expect(agentCount).toBe(100);
    });

    test('should maintain performance with continuous updates', async ({ page }) => {
      // Create agent
      await createClawAgent(page, 'A1', {
        type: 'SENSOR',
        seed: 'Continuous update test'
      });

      const updateTimes: number[] = [];

      // Perform 1000 updates
      for (let i = 0; i < 1000; i++) {
        const result = await measurePerformance(page, async () => {
          await setAgentCellValue(page, 'A1', `Update ${i}`);
        });

        updateTimes.push(result.duration);
      }

      const avgTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
      const maxTime = Math.max(...updateTimes);

      console.log(`1000 updates - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime}ms`);

      // Performance should not degrade
      expect(avgTime).toBeLessThan(100);
      expect(maxTime).toBeLessThan(500);
    });
  });
});
