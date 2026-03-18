/**
 * Cross-Session Persistence E2E Tests
 *
 * Comprehensive tests for persistence and state management:
 * - Agent persistence across sessions
 * - State restoration after refresh
 * - Concurrent user scenarios
 * - Conflict resolution
 *
 * @packageDocumentation
 */

import { test, expect } from '@playwright/test';
import {
  createClawAgent,
  triggerAgent,
  assertAgentState,
  reloadAndWait,
  clearBrowserData
} from '../../helpers/test-helpers';

test.describe('Cross-Session Persistence', () => {
  test('should persist agent state across page refresh', async ({ page }) => {
    await page.goto('/');

    // Create agent
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Verify agent exists
    await assertAgentState(page, 'A1', 'DORMANT');

    // Refresh page
    await reloadAndWait(page);

    // Agent should still exist
    await assertAgentState(page, 'A1', 'DORMANT');
    await expect(page.locator(`[data-agent-id="A1"]`)).toBeVisible();
  });

  test('should persist agent execution state', async ({ page }) => {
    await page.goto('/');

    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Trigger agent
    await triggerAgent(page, 'A1');
    await assertAgentState(page, 'A1', 'THINKING');

    // Refresh page while executing
    await reloadAndWait(page);

    // Should restore to THINKING state or handle recovery
    const agent = page.locator(`[data-agent-id="A1"]`);
    await expect(agent).toBeVisible();

    // Should show execution was in progress
    const state = await agent.getAttribute('data-agent-state');
    expect(['THINKING', 'DORMANT', 'ERROR']).toContain(state);
  });

  test('should persist reasoning history', async ({ page }) => {
    await page.goto('/');

    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    await triggerAgent(page, 'A1');

    // Wait for reasoning to complete
    await page.waitForTimeout(3000);

    // Refresh page
    await reloadAndWait(page);

    // Open agent details
    await page.click(`[data-agent-id="A1"]`);

    // Should show reasoning history
    await expect(page.locator('[data-reasoning-history]')).toBeVisible();
  });

  test('should persist equipment configuration', async ({ page }) => {
    await page.goto('/');

    await createClawAgent(page, 'A1', {
      type: 'SMP',
      seed: 'Test agent',
      equipment: ['MEMORY', 'REASONING', 'CONSENSUS']
    });

    // Refresh page
    await reloadAndWait(page);

    // Open agent details
    await page.click(`[data-agent-id="A1"]`);
    await page.click('[data-testid="equipment-panel-button"]');

    // Equipment should still be equipped
    await expect(page.locator('[data-equipment-slot="MEMORY"][data-equipped="true"]')).toBeVisible();
    await expect(page.locator('[data-equipment-slot="REASONING"][data-equipped="true"]')).toBeVisible();
    await expect(page.locator('[data-equipment-slot="CONSENSUS"][data-equipped="true"]')).toBeVisible();
  });

  test('should persist user preferences', async ({ page }) => {
    await page.goto('/');

    // Set user preferences
    await page.click('[data-testid="settings-button"]');
    await page.check('[data-testid="auto-save-checkbox"]');
    await page.selectOption('[data-testid="theme-select"]', 'dark');
    await page.click('[data-testid="save-settings-button"]');

    // Refresh page
    await reloadAndWait(page);

    // Preferences should persist
    await page.click('[data-testid="settings-button"]');
    await expect(page.locator('[data-testid="auto-save-checkbox"]')).toBeChecked();
    await expect(page.locator('[data-testid="theme-select"]')).toHaveValue('dark');
  });

  test('should restore spreadsheet data', async ({ page }) => {
    await page.goto('/');

    // Enter data in cells
    await page.locator('[data-cell-id="A1"]').click();
    await page.keyboard.type('Test Data 1');
    await page.keyboard.press('Enter');

    await page.locator('[data-cell-id="B1"]').click();
    await page.keyboard.type('Test Data 2');
    await page.keyboard.press('Enter');

    // Refresh page
    await reloadAndWait(page);

    // Data should persist
    await expect(page.locator('[data-cell-id="A1"]')).toContainText('Test Data 1');
    await expect(page.locator('[data-cell-id="B1"]')).toContainText('Test Data 2');
  });

  test('should handle session expiration gracefully', async ({ page }) => {
    await page.goto('/');

    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Clear session storage to simulate expiration
    await page.evaluate(() => {
      sessionStorage.clear();
    });

    // Trigger action that requires session
    await page.click(`[data-agent-id="A1"]`);

    // Should show session expired message
    await expect(page.locator('[data-testid="session-expired-dialog"]')).toBeVisible();

    // Should offer to re-authenticate
    await expect(page.locator('[data-testid="re-authenticate-button"]')).toBeVisible();
  });

  test('should recover from corrupted state', async ({ page }) => {
    await page.goto('/');

    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Corrupt local storage
    await page.evaluate(() => {
      localStorage.setItem('agent_state', JSON.stringify({ invalid: 'data' }));
    });

    // Refresh page
    await reloadAndWait(page);

    // Should detect corruption and recover
    await expect(page.locator('[data-testid="state-recovery-dialog"]')).toBeVisible();

    // Should offer to reset or recover
    await expect(page.locator('[data-testid="reset-state-button"]')).toBeVisible();
  });

  test('should sync state across multiple tabs', async ({ browser }) => {
    // Open first tab
    const context = await browser.newContext();
    const page1 = await context.newPage();
    await page1.goto('/');

    // Create agent in first tab
    await createClawAgent(page1, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('/');

    // Agent should appear in second tab (synced via storage events)
    await expect(page2.locator(`[data-agent-id="A1"]`)).toBeVisible({ timeout: 5000 });

    await context.close();
  });

  test('should handle offline mode gracefully', async ({ page }) => {
    await page.goto('/');

    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Go offline
    await page.context().setOffline(true);

    // Trigger agent (should queue action)
    await triggerAgent(page, 'A1');

    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

    // Should queue action
    await expect(page.locator('[data-testid="pending-actions-count"]')).toContainText('1');

    // Go back online
    await page.context().setOffline(false);

    // Should process queued action
    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('should persist across browser restart', async ({ context, browser }) => {
    const page = await context.newPage();
    await page.goto('/');

    // Create agent
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Close browser
    await context.close();

    // Reopen browser (new context)
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    await newPage.goto('/');

    // Agent should persist
    await expect(newPage.locator(`[data-agent-id="A1"]`)).toBeVisible();

    await newContext.close();
  });

  test('should clear all data on logout', async ({ page }) => {
    await page.goto('/');

    // Create data
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Verify data is cleared
    await expect(page.locator(`[data-agent-id="A1"]`)).not.toBeVisible();
  });
});
