/**
 * E2E Test Helper Functions
 *
 * Reusable helper functions for E2E tests:
 * - Agent creation helpers
 * - Assertion helpers
 * - Wait helpers
 * - Data generators
 *
 * @packageDocumentation
 */

import { Page, Locator } from '@playwright/test';

/**
 * Generate a unique test ID
 */
export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate a unique claw ID
 */
export function generateClawId(): string {
  return `claw_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Wait for an agent to reach a specific state
 */
export async function waitForAgentState(
  page: Page,
  agentId: string,
  targetState: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    ({ id, state }) => {
      const element = document.querySelector(`[data-agent-id="${id}"]`);
      if (!element) return false;
      return element.getAttribute('data-agent-state') === state;
    },
    { id: agentId, state: targetState },
    { timeout }
  );
}

/**
 * Wait for WebSocket connection to be established
 */
export async function waitForWebSocketConnection(page: Page, timeout: number = 5000): Promise<void> {
  await page.waitForFunction(
    () => {
      return (window as any).__websocketConnected === true;
    },
    { timeout }
  );
}

/**
 * Get agent cell value
 */
export async function getAgentCellValue(page: Page, cellId: string): Promise<string> {
  const cell = page.locator(`[data-cell-id="${cellId}"]`);
  return await cell.textContent() || '';
}

/**
 * Set agent cell value
 */
export async function setAgentCellValue(
  page: Page,
  cellId: string,
  value: string
): Promise<void> {
  const cell = page.locator(`[data-cell-id="${cellId}"]`);
  await cell.click();
  await cell.fill(value);
  await page.keyboard.press('Enter');
}

/**
 * Create a claw agent in a cell
 */
export async function createClawAgent(
  page: Page,
  cellId: string,
  config: {
    type: string;
    model?: string;
    equipment?: string[];
    seed?: string;
  }
): Promise<void> {
  // Navigate to cell
  const cell = page.locator(`[data-cell-id="${cellId}"]`);
  await cell.click();

  // Open claw creation dialog
  await page.click('[data-testid="create-claw-button"]');

  // Fill in claw configuration
  await page.selectOption('[data-testid="claw-type-select"]', config.type);

  if (config.model) {
    await page.fill('[data-testid="claw-model-input"]', config.model);
  }

  if (config.seed) {
    await page.fill('[data-testid="claw-seed-input"]', config.seed);
  }

  if (config.equipment && config.equipment.length > 0) {
    for (const equipment of config.equipment) {
      await page.check(`[data-testid="equipment-${equipment}"]`);
    }
  }

  // Submit form
  await page.click('[data-testid="create-claw-submit"]');

  // Wait for creation to complete
  await page.waitForSelector(`[data-agent-id="${cellId}"]`, { timeout: 5000 });
}

/**
 * Trigger an agent execution
 */
export async function triggerAgent(page: Page, agentId: string): Promise<void> {
  const agent = page.locator(`[data-agent-id="${agentId}"]`);
  await agent.click();
  await page.click('[data-testid="trigger-agent-button"]');
}

/**
 * Cancel an agent execution
 */
export async function cancelAgent(page: Page, agentId: string): Promise<void> {
  const agent = page.locator(`[data-agent-id="${agentId}"]`);
  await agent.click();
  await page.click('[data-testid="cancel-agent-button"]');
}

/**
 * Get agent reasoning steps
 */
export async function getAgentReasoningSteps(page: Page, agentId: string): Promise<string[]> {
  const steps: string[] = [];
  const stepElements = await page.locator(`[data-agent-id="${agentId}"] [data-reasoning-step]`).all();

  for (const step of stepElements) {
    const text = await step.textContent();
    if (text) {
      steps.push(text);
    }
  }

  return steps;
}

/**
 * Assert agent state
 */
export async function assertAgentState(
  page: Page,
  agentId: string,
  expectedState: string
): Promise<void> {
  const agent = page.locator(`[data-agent-id="${agentId}"]`);
  await expect(agent).toHaveAttribute('data-agent-state', expectedState);
}

/**
 * Assert cell value
 */
export async function assertCellValue(
  page: Page,
  cellId: string,
  expectedValue: string
): Promise<void> {
  const cell = page.locator(`[data-cell-id="${cellId}"]`);
  await expect(cell).toHaveText(expectedValue);
}

/**
 * Measure performance metric
 */
export async function measurePerformance(
  page: Page,
  operation: () => Promise<void>
): Promise<{ duration: number; memoryBefore: number; memoryAfter: number }> {
  const metrics = await page.evaluate(() => {
    return {
      memory: (performance as any).memory?.usedJSHeapSize || 0
    };
  });

  const startTime = Date.now();
  await operation();
  const duration = Date.now() - startTime;

  const metricsAfter = await page.evaluate(() => {
    return {
      memory: (performance as any).memory?.usedJSHeapSize || 0
    };
  });

  return {
    duration,
    memoryBefore: metrics.memory,
    memoryAfter: metricsAfter.memory
  };
}

/**
 * Create test spreadsheet with data
 */
export async function createTestSpreadsheet(
  page: Page,
  data: Record<string, string>
): Promise<void> {
  for (const [cellId, value] of Object.entries(data)) {
    await setAgentCellValue(page, cellId, value);
  }
}

/**
 * Take screenshot on failure
 */
export async function captureScreenshot(page: Page, testName: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${testName}-${timestamp}.png`,
    fullPage: true
  });
}

/**
 * Get network request timings
 */
export async function getNetworkTimings(page: Page): Promise<any[]> {
  return await page.evaluate(() => {
    return (window as any).__networkTimings || [];
  });
}

/**
 * Clear browser data
 */
export async function clearBrowserData(page: Page): Promise<void> {
  // Clear all cookies
  await page.context().clearCookies();

  // Clear all localStorage
  await page.evaluate(() => {
    localStorage.clear();
  });

  // Clear all sessionStorage
  await page.evaluate(() => {
    sessionStorage.clear();
  });
}

/**
 * Reload page and wait for hydration
 */
export async function reloadAndWait(page: Page): Promise<void> {
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}
