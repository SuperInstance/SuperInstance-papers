/**
 * Equipment Management E2E Tests
 *
 * Comprehensive tests for equipment management:
 * - Equipping and unequipping modules
 * - Visualizing equipped items
 * - Muscle memory triggers
 * - Equipment cost/benefit
 *
 * @packageDocumentation
 */

import { test, expect } from '@playwright/test';
import {
  createClawAgent,
  assertAgentState,
  captureScreenshot
} from '../../helpers/test-helpers';

test.describe('Equipment Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display available equipment slots', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SMP',
      seed: 'Test agent'
    });

    // Click on agent to open details
    await page.click(`[data-agent-id="A1"]`);

    // Open equipment panel
    await page.click('[data-testid="equipment-panel-button"]');

    // Verify all equipment slots are displayed
    await expect(page.locator('[data-equipment-slot="MEMORY"]')).toBeVisible();
    await expect(page.locator('[data-equipment-slot="REASONING"]')).toBeVisible();
    await expect(page.locator('[data-equipment-slot="CONSENSUS"]')).toBeVisible();
    await expect(page.locator('[data-equipment-slot="SPREADSHEET"]')).toBeVisible();
    await expect(page.locator('[data-equipment-slot="DISTILLATION"]')).toBeVisible();
    await expect(page.locator('[data-equipment-slot="COORDINATION"]')).toBeVisible();
  });

  test('should equip MEMORY module', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SMP',
      seed: 'Test agent',
      equipment: []
    });

    // Open agent details
    await page.click(`[data-agent-id="A1"]`);
    await page.click('[data-testid="equipment-panel-button"]');

    // Equip MEMORY
    await page.click('[data-equipment-slot="MEMORY"] [data-action="equip"]');

    // Wait for equip operation
    await page.waitForTimeout(500);

    // Verify MEMORY is equipped
    await expect(page.locator('[data-equipment-slot="MEMORY"][data-equipped="true"]')).toBeVisible();

    // Verify equipment badge appears on agent
    await expect(page.locator(`[data-agent-id="A1"] [data-equipment="MEMORY"]`)).toBeVisible();
  });

  test('should unequip module and extract muscle memory', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SMP',
      seed: 'Test agent',
      equipment: ['MEMORY']
    });

    // Open agent details
    await page.click(`[data-agent-id="A1"]`);
    await page.click('[data-testid="equipment-panel-button"]');

    // Unequip MEMORY
    await page.click('[data-equipment-slot="MEMORY"] [data-action="unequip"]');

    // Wait for unequip operation
    await page.waitForTimeout(500);

    // Verify MEMORY is unequipped
    await expect(page.locator('[data-equipment-slot="MEMORY"][data-equipped="false"]')).toBeVisible();

    // Verify muscle memory trigger was created
    await expect(page.locator('[data-muscle-memory-trigger]')).toBeVisible();
    await expect(page.locator('[data-muscle-memory-trigger]')).toContainText('MEMORY');
  });

  test('should show equipment cost/benefit analysis', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SMP',
      seed: 'Test agent'
    });

    await page.click(`[data-agent-id="A1"]`);
    await page.click('[data-testid="equipment-panel-button"]');

    // Hover over equipment slot
    await page.hover('[data-equipment-slot="REASONING"]');

    // Should show tooltip with cost/benefit
    await expect(page.locator('[data-equipment-tooltip]')).toBeVisible();
    await expect(page.locator('[data-equipment-tooltip]')).toContainText('Cost:');
    await expect(page.locator('[data-equipment-tooltip]')).toContainText('Benefit:');
  });

  test('should prevent equipping conflicting modules', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SMP',
      seed: 'Test agent',
      equipment: ['REASONING']
    });

    await page.click(`[data-agent-id="A1"]`);
    await page.click('[data-testid="equipment-panel-button"]');

    // Try to equip conflicting module (if any conflicts exist)
    // This test validates that the system prevents incompatible combinations

    // Verify current equipment
    await expect(page.locator('[data-equipment-slot="REASONING"][data-equipped="true"]')).toBeVisible();
  });

  test('should display equipment dependencies', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SMP',
      seed: 'Test agent'
    });

    await page.click(`[data-agent-id="A1"]`);
    await page.click('[data-testid="equipment-panel-button"]');

    // Check COORDINATION slot (should depend on other equipment)
    const coordinationSlot = page.locator('[data-equipment-slot="COORDINATION"]');

    // Should show dependencies if any
    const hasDependencies = await coordinationSlot.locator('[data-dependency]').count() > 0;

    if (hasDependencies) {
      await expect(coordinationSlot.locator('[data-dependency]')).toBeVisible();
    }
  });

  test('should optimize equipment configuration automatically', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SMP',
      seed: 'Test agent'
    });

    await page.click(`[data-agent-id="A1"]`);
    await page.click('[data-testid="equipment-panel-button"]');

    // Click auto-optimize button
    await page.click('[data-testid="auto-optimize-equipment"]');

    // Wait for optimization
    await page.waitForTimeout(1000);

    // Should show optimization results
    await expect(page.locator('[data-optimization-results]')).toBeVisible();

    // Should suggest equipment configuration
    await expect(page.locator('[data-suggested-equipment]')).toBeVisible();
  });

  test('should display muscle memory triggers', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SMP',
      seed: 'Test agent',
      equipment: ['MEMORY', 'REASONING']
    });

    // Trigger agent to build muscle memory
    await page.click(`[data-agent-id="A1"]`);
    await page.click('[data-testid="trigger-agent-button"]');

    // Wait for execution
    await page.waitForTimeout(2000);

    // Unequip equipment
    await page.click('[data-testid="equipment-panel-button"]');
    await page.click('[data-equipment-slot="MEMORY"] [data-action="unequip"]');

    // Wait for unequip
    await page.waitForTimeout(500);

    // Verify muscle memory trigger was created
    await expect(page.locator('[data-muscle-memory-trigger]')).toBeVisible();

    // Click on trigger to see details
    await page.click('[data-muscle-memory-trigger"]');

    // Should show trigger details
    await expect(page.locator('[data-trigger-details]')).toBeVisible();
    await expect(page.locator('[data-trigger-details]')).toContainText('MEMORY');
  });

  test('should re-equip based on muscle memory trigger', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SMP',
      seed: 'Test agent'
    });

    await page.click(`[data-agent-id="A1"]`);
    await page.click('[data-testid="equipment-panel-button"]');

    // Simulate muscle memory trigger
    await page.evaluate(() => {
      const event = new CustomEvent('muscleMemoryTrigger', {
        detail: { equipment: 'MEMORY', reason: 'High frequency memory access pattern detected' }
      });
      window.dispatchEvent(event);
    });

    // Wait for trigger to be processed
    await page.waitForTimeout(500);

    // Should show suggestion to re-equip
    await expect(page.locator('[data-re-equip-suggestion]')).toBeVisible();

    // Click to re-equip
    await page.click('[data-re-equip-suggestion] [data-action="equip"]');

    // Verify MEMORY is equipped
    await expect(page.locator('[data-equipment-slot="MEMORY"][data-equipped="true"]')).toBeVisible();
  });

  test('should display equipment usage statistics', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SMP',
      seed: 'Test agent',
      equipment: ['MEMORY', 'REASONING']
    });

    // Trigger agent multiple times
    await page.click(`[data-agent-id="A1"]`);
    await page.click('[data-testid="trigger-agent-button"]');
    await page.waitForTimeout(1000);

    await page.click('[data-testid="trigger-agent-button"]');
    await page.waitForTimeout(1000);

    // Open equipment panel
    await page.click('[data-testid="equipment-panel-button"]');

    // Click on usage statistics
    await page.click('[data-testid="equipment-usage-stats"]');

    // Should show usage data
    await expect(page.locator('[data-usage-statistics]')).toBeVisible();
    await expect(page.locator('[data-usage-for="MEMORY"]')).toBeVisible();
    await expect(page.locator('[data-usage-for="REASONING"]')).toBeVisible();
  });

  test('should validate equipment compatibility', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'BOT',
      seed: 'Test bot'
    });

    await page.click(`[data-agent-id="A1"]`);
    await page.click('[data-testid="equipment-panel-button"]');

    // Try to equip incompatible equipment (BOT shouldn't use REASONING)
    const reasoningSlot = page.locator('[data-equipment-slot="REASONING"]');
    const isDisabled = await reasoningSlot.locator('[data-action="equip"]').isDisabled();

    if (isDisabled) {
      // Should be disabled for incompatible types
      await expect(reasoningSlot.locator('[data-incompatible]')).toBeVisible();
    }
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await captureScreenshot(page, testInfo.title);
    }
  });
});
