/**
 * Agent Execution E2E Tests
 *
 * Comprehensive tests for agent execution workflow:
 * - Triggering agent execution
 * - Real-time status updates
 * - Reasoning streaming display
 * - Error handling during execution
 *
 * @packageDocumentation
 */

import { test, expect } from '@playwright/test';
import {
  createClawAgent,
  triggerAgent,
  cancelAgent,
  assertAgentState,
  waitForAgentState,
  getAgentReasoningSteps,
  captureScreenshot
} from '../../helpers/test-helpers';

test.describe('Agent Execution Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a test agent
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      model: 'deepseek-chat',
      equipment: ['MEMORY', 'REASONING'],
      seed: 'Monitor cell value changes'
    });
  });

  test('should trigger agent and transition to THINKING state', async ({ page }) => {
    // Trigger agent
    await triggerAgent(page, 'A1');

    // Should transition to THINKING state
    await assertAgentState(page, 'A1', 'THINKING');
  });

  test('should display real-time status updates', async ({ page }) => {
    // Set up WebSocket message listener
    const statusUpdates: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('Agent status:')) {
        statusUpdates.push(msg.text());
      }
    });

    // Trigger agent
    await triggerAgent(page, 'A1');

    // Wait for status updates
    await page.waitForTimeout(1000);

    // Should have received status updates
    expect(statusUpdates.length).toBeGreaterThan(0);
  });

  test('should display reasoning steps as they stream in', async ({ page }) => {
    // Mock WebSocket messages with reasoning steps
    await page.evaluate(() => {
      const ws = new WebSocket('ws://localhost:3000/ws');

      ws.onopen = () => {
        // Simulate server sending reasoning steps
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'reasoning_step',
            payload: {
              clawId: 'A1',
              step: {
                stepNumber: 1,
                content: 'Analyzing cell value...',
                timestamp: Date.now(),
                confidence: 0.8
              }
            }
          }));
        }, 100);

        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'reasoning_step',
            payload: {
              clawId: 'A1',
              step: {
                stepNumber: 2,
                content: 'Checking constraints...',
                timestamp: Date.now(),
                confidence: 0.9
              }
            }
          }));
        }, 200);
      };
    });

    // Trigger agent
    await triggerAgent(page, 'A1');

    // Wait for reasoning steps
    await page.waitForSelector(`[data-agent-id="A1"] [data-reasoning-step]`, { timeout: 3000 });

    // Verify reasoning steps are displayed
    const steps = await getAgentReasoningSteps(page, 'A1');
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0]).toContain('Analyzing cell value');
  });

  test('should show confidence score for reasoning steps', async ({ page }) => {
    await triggerAgent(page, 'A1');

    // Wait for reasoning display
    await page.waitForSelector(`[data-agent-id="A1"] [data-reasoning-step]`, { timeout: 5000 });

    // Check for confidence indicator
    const confidenceIndicator = page.locator(`[data-agent-id="A1"] [data-confidence]`);
    await expect(confidenceIndicator).toBeVisible();
  });

  test('should allow cancelling agent execution', async ({ page }) => {
    // Trigger agent
    await triggerAgent(page, 'A1');

    // Wait for thinking state
    await assertAgentState(page, 'A1', 'THINKING');

    // Cancel execution
    await cancelAgent(page, 'A1');

    // Should transition to DORMANT state
    await assertAgentState(page, 'A1', 'DORMANT');
  });

  test('should handle execution errors gracefully', async ({ page }) => {
    // Mock execution error
    await page.route('**/api/claws/trigger', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Execution failed' })
      });
    });

    // Trigger agent
    await triggerAgent(page, 'A1');

    // Should show error state
    await assertAgentState(page, 'A1', 'ERROR');

    // Should display error message
    await expect(page.locator(`[data-agent-id="A1"] [data-error-message]`)).toBeVisible();
  });

  test('should transition to NEEDS_REVIEW for actions requiring approval', async ({ page }) => {
    // Mock agent response that requires approval
    await page.evaluate(() => {
      const ws = new WebSocket('ws://localhost:3000/ws');

      ws.onopen = () => {
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'requires_approval',
            payload: {
              clawId: 'A1',
              action: 'update_cell',
              value: 'new value',
              reason: 'Cell value change requires approval'
            }
          }));
        }, 500);
      };
    });

    await triggerAgent(page, 'A1');

    // Should transition to NEEDS_REVIEW state
    await waitForAgentState(page, 'A1', 'NEEDS_REVIEW');

    // Should show approval UI
    await expect(page.locator('[data-testid="approval-prompt"]')).toBeVisible();
  });

  test('should allow approving agent actions', async ({ page }) => {
    // Setup scenario requiring approval
    await page.evaluate(() => {
      const ws = new WebSocket('ws://localhost:3000/ws');

      ws.onopen = () => {
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'requires_approval',
            payload: {
              clawId: 'A1',
              action: 'update_cell',
              value: 'approved value'
            }
          }));
        }, 500);
      };
    });

    await triggerAgent(page, 'A1');
    await waitForAgentState(page, 'A1', 'NEEDS_REVIEW');

    // Approve action
    await page.click('[data-testid="approve-action-button"]');

    // Should transition to POSTED state
    await waitForAgentState(page, 'A1', 'POSTED');
  });

  test('should allow rejecting agent actions', async ({ page }) => {
    // Setup scenario requiring approval
    await page.evaluate(() => {
      const ws = new WebSocket('ws://localhost:3000/ws');

      ws.onopen = () => {
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'requires_approval',
            payload: {
              clawId: 'A1',
              action: 'update_cell',
              value: 'questionable value'
            }
          }));
        }, 500);
      };
    });

    await triggerAgent(page, 'A1');
    await waitForAgentState(page, 'A1', 'NEEDS_REVIEW');

    // Reject action
    await page.click('[data-testid="reject-action-button"]');
    await page.fill('[data-testid="rejection-reason"]', 'Value does not meet criteria');
    await page.click('[data-testid="confirm-rejection-button"]');

    // Should transition back to THINKING state
    await waitForAgentState(page, 'A1', 'THINKING');
  });

  test('should display execution metrics', async ({ page }) => {
    await triggerAgent(page, 'A1');

    // Wait for execution to complete
    await waitForAgentState(page, 'A1', 'POSTED');

    // Open agent details
    await page.click(`[data-agent-id="A1"]`);

    // Verify metrics are displayed
    await expect(page.locator('[data-testid="execution-duration"]')).toBeVisible();
    await expect(page.locator('[data-testid="reasoning-steps-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="final-confidence"]')).toBeVisible();
  });

  test('should handle concurrent agent executions', async ({ page }) => {
    // Create multiple agents
    await createClawAgent(page, 'A2', { type: 'SENSOR', seed: 'Sensor 2' });
    await createClawAgent(page, 'A3', { type: 'SENSOR', seed: 'Sensor 3' });

    // Trigger all agents
    await triggerAgent(page, 'A1');
    await triggerAgent(page, 'A2');
    await triggerAgent(page, 'A3');

    // All should be in THINKING state
    await assertAgentState(page, 'A1', 'THINKING');
    await assertAgentState(page, 'A2', 'THINKING');
    await assertAgentState(page, 'A3', 'THINKING');

    // Wait for all to complete
    await waitForAgentState(page, 'A1', 'POSTED');
    await waitForAgentState(page, 'A2', 'POSTED');
    await waitForAgentState(page, 'A3', 'POSTED');
  });

  test('should persist execution history', async ({ page }) => {
    await triggerAgent(page, 'A1');
    await waitForAgentState(page, 'A1', 'POSTED');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open agent history
    await page.click(`[data-agent-id="A1"]`);
    await page.click('[data-testid="execution-history-tab"]');

    // Should show previous execution
    await expect(page.locator('[data-execution-history-item]')).toBeVisible();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await captureScreenshot(page, testInfo.title);
    }
  });
});
