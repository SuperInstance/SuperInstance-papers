/**
 * Agent Creation E2E Tests
 *
 * Comprehensive tests for agent creation workflow:
 * - Creating agents from spreadsheet cells
 * - Validating agent configuration
 * - Error handling during creation
 * - UI feedback and validation
 *
 * @packageDocumentation
 */

import { test, expect } from '@playwright/test';
import {
  generateClawId,
  createClawAgent,
  assertAgentState,
  setAgentCellValue,
  captureScreenshot
} from '../../helpers/test-helpers';

test.describe('Agent Creation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should create a basic SENSOR claw agent', async ({ page }) => {
    const cellId = 'A1';
    const clawId = generateClawId();

    // Create a claw agent in cell A1
    await createClawAgent(page, cellId, {
      type: 'SENSOR',
      model: 'deepseek-chat',
      equipment: ['MEMORY', 'REASONING'],
      seed: 'Monitor cell value changes'
    });

    // Verify agent was created successfully
    await assertAgentState(page, cellId, 'DORMANT');

    // Verify agent metadata is displayed
    await expect(page.locator(`[data-agent-id="${cellId}"]`)).toBeVisible();
    await expect(page.locator(`[data-agent-id="${cellId}"]`)).toHaveAttribute('data-agent-type', 'SENSOR');
  });

  test('should create a SMP claw with complex configuration', async ({ page }) => {
    const cellId = 'B2';

    await createClawAgent(page, cellId, {
      type: 'SMP',
      model: 'deepseek-chat',
      equipment: ['MEMORY', 'REASONING', 'CONSENSUS', 'COORDINATION'],
      seed: 'Process moment data with consensus validation'
    });

    // Verify all equipment is equipped
    const agent = page.locator(`[data-agent-id="${cellId}"]`);
    await expect(agent).toBeVisible();

    // Verify equipment badges
    await expect(agent.locator('[data-equipment="MEMORY"]')).toBeVisible();
    await expect(agent.locator('[data-equipment="REASONING"]')).toBeVisible();
    await expect(agent.locator('[data-equipment="CONSENSUS"]')).toBeVisible();
    await expect(agent.locator('[data-equipment="COORDINATION"]')).toBeVisible();
  });

  test('should validate required fields during creation', async ({ page }) => {
    // Click on cell
    await page.click('[data-cell-id="A1"]');

    // Open claw creation dialog
    await page.click('[data-testid="create-claw-button"]');

    // Try to submit without required fields
    await page.click('[data-testid="create-claw-submit"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="type-required-error"]')).toBeVisible();
  });

  test('should handle API errors during creation gracefully', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/claws', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' })
      });
    });

    // Try to create agent
    await page.click('[data-cell-id="A1"]');
    await page.click('[data-testid="create-claw-button"]');

    // Fill form
    await page.selectOption('[data-testid="claw-type-select"]', 'SENSOR');
    await page.fill('[data-testid="claw-seed-input"]', 'Test agent');

    // Submit
    await page.click('[data-testid="create-claw-submit"]');

    // Should show error message
    await expect(page.locator('[data-testid="api-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="api-error"]')).toContainText('Internal server error');
  });

  test('should create multiple agents in different cells', async ({ page }) => {
    const agents = [
      { cellId: 'A1', type: 'SENSOR' },
      { cellId: 'B1', type: 'SMP' },
      { cellId: 'C1', type: 'BOT' }
    ];

    for (const agent of agents) {
      await createClawAgent(page, agent.cellId, {
        type: agent.type,
        seed: `Test ${agent.type} agent`
      });
    }

    // Verify all agents were created
    for (const agent of agents) {
      await assertAgentState(page, agent.cellId, 'DORMANT');
    }
  });

  test('should show loading state during agent creation', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/claws', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ clawId: 'claw_123', status: 'created' })
        });
      }, 2000);
    });

    await page.click('[data-cell-id="A1"]');
    await page.click('[data-testid="create-claw-button"]');

    // Fill and submit form
    await page.selectOption('[data-testid="claw-type-select"]', 'SENSOR');
    await page.fill('[data-testid="claw-seed-input"]', 'Test agent');
    await page.click('[data-testid="create-claw-submit"]');

    // Should show loading indicator
    await expect(page.locator('[data-testid="creating-agent-loader"]')).toBeVisible();

    // Wait for creation to complete
    await page.waitForSelector(`[data-agent-id="A1"]`, { timeout: 5000 });

    // Loader should be hidden
    await expect(page.locator('[data-testid="creating-agent-loader"]')).not.toBeVisible();
  });

  test('should allow cancelling agent creation', async ({ page }) => {
    await page.click('[data-cell-id="A1"]');
    await page.click('[data-testid="create-claw-button"]');

    // Fill form partially
    await page.selectOption('[data-testid="claw-type-select"]', 'SENSOR');

    // Cancel creation
    await page.click('[data-testid="cancel-creation-button"]');

    // Dialog should close
    await expect(page.locator('[data-testid="create-claw-dialog"]')).not.toBeVisible();

    // No agent should be created
    await expect(page.locator(`[data-agent-id="A1"]`)).not.toBeVisible();
  });

  test('should provide helpful error messages for invalid configurations', async ({ page }) => {
    await page.click('[data-cell-id="A1"]');
    await page.click('[data-testid="create-claw-button"]');

    // Try to create agent with invalid model name
    await page.selectOption('[data-testid="claw-type-select"]', 'SMP');
    await page.fill('[data-testid="claw-model-input"]', 'invalid-model-name-!!!');
    await page.fill('[data-testid="claw-seed-input"]', 'Test agent');

    await page.click('[data-testid="create-claw-submit"]');

    // Should show validation error
    await expect(page.locator('[data-testid="model-validation-error"]')).toBeVisible();
  });

  test('should save agent configuration as template', async ({ page }) => {
    const cellId = 'A1';

    await createClawAgent(page, cellId, {
      type: 'SENSOR',
      model: 'deepseek-chat',
      equipment: ['MEMORY', 'REASONING'],
      seed: 'Monitor cell value changes'
    });

    // Click on agent to open details
    await page.click(`[data-agent-id="${cellId}"]`);

    // Save as template
    await page.click('[data-testid="save-as-template-button"]');
    await page.fill('[data-testid="template-name-input"]', 'Sensor Template');
    await page.click('[data-testid="save-template-button"]');

    // Verify template was saved
    await expect(page.locator('[data-testid="template-saved-toast"]')).toBeVisible();

    // Verify template appears in template list
    await page.click('[data-testid="templates-button"]');
    await expect(page.locator('[data-template-name="Sensor Template"]')).toBeVisible();
  });

  test('should display agent creation history', async ({ page }) => {
    // Create multiple agents
    await createClawAgent(page, 'A1', { type: 'SENSOR', seed: 'Sensor 1' });
    await createClawAgent(page, 'A2', { type: 'SENSOR', seed: 'Sensor 2' });
    await createClawAgent(page, 'A3', { type: 'SMP', seed: 'SMP 1' });

    // Open history panel
    await page.click('[data-testid="agent-history-button"]');

    // Verify history shows all created agents
    await expect(page.locator('[data-agent-history-item]')).toHaveCount(3);

    // Verify chronological order
    const historyItems = page.locator('[data-agent-history-item]');
    const firstItem = historyItems.nth(0);
    await expect(firstItem).toContainText('A1');
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await captureScreenshot(page, testInfo.title);
    }
  });
});
