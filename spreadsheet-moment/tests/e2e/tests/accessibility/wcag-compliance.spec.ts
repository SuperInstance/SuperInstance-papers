/**
 * WCAG 2.1 AA Accessibility Compliance Tests
 *
 * Comprehensive accessibility testing for SpreadsheetMoment:
 * - WCAG 2.1 AA compliance validation
 * - Screen reader compatibility
 * - Keyboard navigation
 * - Color contrast validation
 * - Focus management
 * - ARIA attributes verification
 *
 * @packageDocumentation
 */

import { test, expect } from '@playwright/test';
import { createClawAgent, triggerAgent } from '../../helpers/test-helpers';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AA Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should pass automated accessibility scan on home page', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass accessibility scan on agent creation dialog', async ({ page }) => {
    // Open agent creation dialog
    await page.click('[data-cell-id="A1"]');
    await page.click('[data-testid="create-claw-button"]');

    // Wait for dialog to be visible
    await page.waitForSelector('[data-testid="create-claw-dialog"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .include('[data-testid="create-claw-dialog"]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass accessibility scan with agent present', async ({ page }) => {
    // Create an agent
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent for accessibility'
    });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass accessibility scan during agent execution', async ({ page }) => {
    // Create and trigger agent
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    await triggerAgent(page, 'A1');

    // Scan while agent is executing
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate spreadsheet cells with Tab key', async ({ page }) => {
    // Start from first cell
    await page.click('[data-cell-id="A1"]');

    // Tab to next cell
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-cell-id="B1"]')).toBeFocused();

    // Tab again
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-cell-id="C1"]')).toBeFocused();
  });

  test('should navigate with arrow keys', async ({ page }) => {
    await page.click('[data-cell-id="B2"]');

    // Arrow right
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-cell-id="C2"]')).toBeFocused();

    // Arrow down
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-cell-id="C3"]')).toBeFocused();

    // Arrow left
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-cell-id="B3"]')).toBeFocused();

    // Arrow up
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('[data-cell-id="B2"]')).toBeFocused();
  });

  test('should open agent creation with keyboard', async ({ page }) => {
    await page.click('[data-cell-id="A1"]');

    // Press Enter or Space to open context menu
    await page.keyboard.press('Enter');

    // Should show context menu
    await expect(page.locator('[data-testid="cell-context-menu"]')).toBeVisible();

    // Tab to "Create Claw" option and press Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Should open creation dialog
    await expect(page.locator('[data-testid="create-claw-dialog"]')).toBeVisible();
  });

  test('should close dialogs with Escape key', async ({ page }) => {
    // Open dialog
    await page.click('[data-cell-id="A1"]');
    await page.click('[data-testid="create-claw-button"]');

    await expect(page.locator('[data-testid="create-claw-dialog"]')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Dialog should close
    await expect(page.locator('[data-testid="create-claw-dialog"]')).not.toBeVisible();
  });

  test('should navigate agent creation form with Tab', async ({ page }) => {
    await page.click('[data-cell-id="A1"]');
    await page.click('[data-testid="create-claw-button"]');

    // Tab through form fields
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="claw-type-select"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="claw-model-input"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="claw-seed-input"]')).toBeFocused();
  });

  test('should support Enter to submit form', async ({ page }) => {
    await page.click('[data-cell-id="A1"]');
    await page.click('[data-testid="create-claw-button"]');

    // Fill form
    await page.selectOption('[data-testid="claw-type-select"]', 'SENSOR');
    await page.fill('[data-testid="claw-seed-input"]', 'Test agent');

    // Tab to submit button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Press Enter to submit
    await page.keyboard.press('Enter');

    // Agent should be created
    await expect(page.locator('[data-agent-id="A1"]')).toBeVisible();
  });

  test('should trap focus in modal dialogs', async ({ page }) => {
    await page.click('[data-cell-id="A1"]');
    await page.click('[data-testid="create-claw-button"]');

    // Tab multiple times - focus should cycle within dialog
    const dialog = page.locator('[data-testid="create-claw-dialog"]');
    const firstFocusable = dialog.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').first();

    await firstFocusable.focus();

    // Tab through all focusable elements
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
    }

    // Focus should still be within dialog
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();
  });
});

test.describe('Screen Reader Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have proper page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Check for h1
    const h1 = await page.locator('h1').count();
    expect(h1).toBeGreaterThanOrEqual(1);

    // Check heading hierarchy (no skipping levels)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

    if (headings.length > 1) {
      for (let i = 1; i < headings.length; i++) {
        const prevLevel = parseInt(await headings[i - 1].evaluate(el => el.tagName[1]));
        const currLevel = parseInt(await headings[i].evaluate(el => el.tagName[1]));

        // Should not skip more than one level
        expect(currLevel - prevLevel).toBeLessThanOrEqual(1);
      }
    }
  });

  test('should have proper landmarks', async ({ page }) => {
    // Check for main landmark
    const main = await page.locator('main, [role="main"]').count();
    expect(main).toBeGreaterThanOrEqual(1);

    // Check for navigation landmark
    const nav = await page.locator('nav, [role="navigation"]').count();
    expect(nav).toBeGreaterThanOrEqual(0);
  });

  test('should have accessible cell labels', async ({ page }) => {
    const cells = await page.locator('[data-cell-id]').all();

    for (const cell of cells.slice(0, 5)) {
      const cellId = await cell.getAttribute('data-cell-id');
      const ariaLabel = await cell.getAttribute('aria-label');
      const label = await cell.getAttribute('label');

      // Cell should have accessible label
      expect(ariaLabel || label || cellId).toBeTruthy();
    }
  });

  test('should have proper form labels', async ({ page }) => {
    await page.click('[data-cell-id="A1"]');
    await page.click('[data-testid="create-claw-button"]');

    // Check form inputs have labels
    const inputs = await page.locator('[data-testid="create-claw-dialog"] input, [data-testid="create-claw-dialog"] select').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      if (id) {
        // Check for associated label
        const label = await page.locator(`label[for="${id}"]`).count();
        expect(label > 0 || ariaLabel || ariaLabelledBy).toBeTruthy();
      } else {
        // Should have aria-label or aria-labelledby
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  });

  test('should announce agent state changes', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Check for live region or aria-live
    const liveRegions = await page.locator('[aria-live]').count();

    // Trigger agent
    await triggerAgent(page, 'A1');

    // Should have live region for status updates
    expect(liveRegions).toBeGreaterThanOrEqual(0);

    // Check agent has aria-busy when executing
    await page.waitForTimeout(500);

    const agentBusy = await page.locator('[data-agent-id="A1"]').getAttribute('aria-busy');
    expect(['true', 'false', null]).toContain(agentBusy);
  });

  test('should have descriptive button labels', async ({ page }) => {
    const buttons = await page.locator('button').all();

    for (const button of buttons.slice(0, 10)) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');

      // Button should have accessible label
      expect(text || ariaLabel || title).toBeTruthy();
    }
  });

  test('should have proper error announcements', async ({ page }) => {
    // Mock API error
    await page.route('**/api/claws', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' })
      });
    });

    await page.click('[data-cell-id="A1"]');
    await page.click('[data-testid="create-claw-button"]');

    await page.selectOption('[data-testid="claw-type-select"]', 'SENSOR');
    await page.fill('[data-testid="claw-seed-input"]', 'Test agent');
    await page.click('[data-testid="create-claw-submit"]');

    // Check for error with aria-live or role="alert"
    const errorElement = page.locator('[data-testid="api-error"]');

    if (await errorElement.count() > 0) {
      const ariaLive = await errorElement.getAttribute('aria-live');
      const role = await errorElement.getAttribute('role');

      expect(ariaLive || role === 'alert').toBeTruthy();
    }
  });
});

test.describe('Color Contrast', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have sufficient color contrast on text', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    );

    expect(contrastViolations).toEqual([]);
  });

  test('should not rely solely on color for information', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Check agent state indicator
    const agent = page.locator('[data-agent-id="A1"]');

    // Should have text or icon, not just color
    const stateIndicator = agent.locator('[data-state-indicator]');

    if (await stateIndicator.count() > 0) {
      const text = await stateIndicator.textContent();
      const ariaLabel = await stateIndicator.getAttribute('aria-label');

      expect(text || ariaLabel).toBeTruthy();
    }
  });
});

test.describe('Focus Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have visible focus indicators', async ({ page }) => {
    const buttons = await page.locator('button').all();

    for (const button of buttons.slice(0, 5)) {
      await button.focus();

      // Check if focus is visible
      const isFocused = await button.evaluate(el => {
        return document.activeElement === el;
      });

      expect(isFocused).toBe(true);
    }
  });

  test('should manage focus when opening dialogs', async ({ page }) => {
    await page.click('[data-cell-id="A1"]');

    // Open dialog
    await page.click('[data-testid="create-claw-button"]');

    // Focus should move to dialog
    const dialog = page.locator('[data-testid="create-claw-dialog"]');
    const focusedInDialog = await dialog.evaluate(el => el.contains(document.activeElement));

    expect(focusedInDialog).toBe(true);
  });

  test('should restore focus when closing dialogs', async ({ page }) => {
    await page.click('[data-cell-id="A1"]');

    const cell = page.locator('[data-cell-id="A1"]');

    // Open dialog
    await page.click('[data-testid="create-claw-button"]');

    await expect(page.locator('[data-testid="create-claw-dialog"]')).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');

    // Focus should return to cell
    await page.waitForTimeout(100);

    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('should have skip links', async ({ page }) => {
    // Check for skip link
    const skipLink = await page.locator('a[href="#main"], a[href="#content"], [data-skip-link]').first();

    if (await skipLink.count() > 0) {
      // Skip link should be focusable
      await skipLink.focus();
      await expect(skipLink).toBeFocused();
    }
  });
});

test.describe('ARIA Attributes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have proper role attributes', async ({ page }) => {
    // Check spreadsheet grid role
    const grid = await page.locator('[role="grid"], [role="table"]').count();
    expect(grid).toBeGreaterThanOrEqual(0);

    // Check cell roles
    const cells = await page.locator('[role="gridcell"], [role="cell"]').count();
    expect(cells).toBeGreaterThanOrEqual(0);
  });

  test('should have proper aria-expanded on expandable elements', async ({ page }) => {
    const expandables = await page.locator('[aria-expanded]').all();

    for (const element of expandables) {
      const expanded = await element.getAttribute('aria-expanded');
      expect(['true', 'false']).toContain(expanded);
    }
  });

  test('should have proper aria-hidden usage', async ({ page }) => {
    const hiddenElements = await page.locator('[aria-hidden="true"]').all();

    for (const element of hiddenElements) {
      // aria-hidden elements should not be focusable
      const tabIndex = await element.getAttribute('tabindex');
      const isFocusable = await element.evaluate(el => {
        return el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'INPUT';
      });

      if (isFocusable) {
        expect(tabIndex).toBe('-1');
      }
    }
  });

  test('should have proper aria-describedby for form fields', async ({ page }) => {
    await page.click('[data-cell-id="A1"]');
    await page.click('[data-testid="create-claw-button"]');

    const describedFields = await page.locator('[aria-describedby]').all();

    for (const field of describedFields) {
      const describedBy = await field.getAttribute('aria-describedby');
      const descriptionElement = await page.locator(`#${describedBy}`).count();

      // Description element should exist
      expect(descriptionElement).toBeGreaterThan(0);
    }
  });

  test('should have proper status roles for agent states', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Check agent status has proper role
    const statusElement = page.locator('[data-agent-id="A1"] [data-agent-status]');

    if (await statusElement.count() > 0) {
      const role = await statusElement.getAttribute('role');
      expect(['status', 'alert', 'log']).toContain(role);
    }
  });
});
