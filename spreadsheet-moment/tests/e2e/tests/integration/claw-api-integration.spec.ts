/**
 * Claw API Integration E2E Tests
 *
 * Integration tests with real Claw API:
 * - Complete API endpoint coverage
 * - WebSocket communication stability
 * - Error handling and recovery
 * - Retry logic verification
 * - Authentication flow
 *
 * @packageDocumentation
 */

import { test, expect } from '@playwright/test';
import {
  createClawAgent,
  triggerAgent,
  waitForWebSocketConnection,
  captureScreenshot
} from '../../helpers/test-helpers';

const CLAW_API_BASE_URL = process.env.CLAW_API_BASE_URL || 'http://localhost:8080';
const CLAW_API_KEY = process.env.CLAW_API_KEY || 'test-api-key-min-length-20';

test.describe('Claw API Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Configure API endpoint
    await page.goto(`/?apiUrl=${CLAW_API_BASE_URL}&apiKey=${CLAW_API_KEY}`);
    await page.waitForLoadState('networkidle');

    // Wait for WebSocket connection
    await waitForWebSocketConnection(page);
  });

  test('should authenticate with Claw API successfully', async ({ page }) => {
    // Check authentication status
    const authStatus = await page.evaluate(() => {
      return (window as any).__clawApiAuthenticated;
    });

    expect(authStatus).toBe(true);
  });

  test('should create claw via API', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      model: 'deepseek-chat',
      seed: 'Test agent'
    });

    // Verify agent was created via API
    const response = await page.evaluate(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/claws/A1`);
      return res.json();
    }, CLAW_API_BASE_URL);

    expect(response.clawId).toBe('A1');
    expect(response.state).toBeDefined();
  });

  test('should establish WebSocket connection', async ({ page }) => {
    // Check WebSocket connection status
    const wsStatus = await page.evaluate(() => {
      return (window as any).__websocketConnected;
    });

    expect(wsStatus).toBe(true);

    // Verify WebSocket is receiving messages
    const messageReceived = await page.evaluate(() => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 1000);

        (window as any).__testWebSocketMessage = () => {
          clearTimeout(timeout);
          resolve(true);
        };
      });
    });

    expect(messageReceived).toBe(true);
  });

  test('should receive real-time status updates via WebSocket', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Listen for status updates
    const statusUpdates: any[] = [];
    await page.evaluate(() => {
      (window as any).__statusUpdates = [];

      const originalHandler = (window as any).__handleWebSocketMessage;
      (window as any).__handleWebSocketMessage = (message: any) => {
        if (message.type === 'status_update') {
          (window as any).__statusUpdates.push(message);
        }
        if (originalHandler) {
          originalHandler(message);
        }
      };
    });

    // Trigger agent
    await triggerAgent(page, 'A1');

    // Wait for status updates
    await page.waitForTimeout(2000);

    const updates = await page.evaluate(() => {
      return (window as any).__statusUpdates || [];
    });

    expect(updates.length).toBeGreaterThan(0);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock 500 error
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
    await page.selectOption('[data-testid="claw-type-select"]', 'SENSOR');
    await page.fill('[data-testid="claw-seed-input"]', 'Test agent');
    await page.click('[data-testid="create-claw-submit"]');

    // Should show error message
    await expect(page.locator('[data-testid="api-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="api-error"]')).toContainText('Internal server error');
  });

  test('should retry failed requests', async ({ page }) => {
    let attemptCount = 0;

    // Mock failure then success
    await page.route('**/api/claws', route => {
      attemptCount++;

      if (attemptCount < 3) {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Service unavailable' })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ clawId: 'A1', status: 'created' })
        });
      }
    });

    // Create agent
    await page.click('[data-cell-id="A1"]');
    await page.click('[data-testid="create-claw-button"]');
    await page.selectOption('[data-testid="claw-type-select"]', 'SENSOR');
    await page.fill('[data-testid="claw-seed-input"]', 'Test agent');
    await page.click('[data-testid="create-claw-submit"]');

    // Wait for retry logic
    await page.waitForTimeout(3000);

    // Should eventually succeed
    await expect(page.locator(`[data-agent-id="A1"]`)).toBeVisible();

    expect(attemptCount).toBeGreaterThanOrEqual(3);
  });

  test('should handle rate limiting', async ({ page }) => {
    // Mock rate limit response
    await page.route('**/api/claws', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Rate limit exceeded' }),
        headers: {
          'Retry-After': '1'
        }
      });
    });

    // Try to create agent
    await page.click('[data-cell-id="A1"]');
    await page.click('[data-testid="create-claw-button"]');
    await page.selectOption('[data-testid="claw-type-select"]', 'SENSOR');
    await page.fill('[data-testid="claw-seed-input"]', 'Test agent');
    await page.click('[data-testid="create-claw-submit"]');

    // Should show rate limit message
    await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();

    // Should retry after delay
    await page.waitForTimeout(2000);

    // Check if retry was attempted (would show in UI logs)
    const retryAttempted = await page.evaluate(() => {
      return (window as any).__retryAfterRateLimit || false;
    });

    expect(retryAttempted).toBe(true);
  });

  test('should validate API responses', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Trigger agent
    await triggerAgent(page, 'A1');

    // Wait for response
    await page.waitForTimeout(2000);

    // Validate response structure
    const agentData = await page.evaluate(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/claws/A1`);
      return res.json();
    }, CLAW_API_BASE_URL);

    // Should have required fields
    expect(agentData).toHaveProperty('clawId');
    expect(agentData).toHaveProperty('state');
    expect(agentData).toHaveProperty('config');
  });

  test('should handle WebSocket disconnection', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Simulate WebSocket disconnection
    await page.evaluate(() => {
      const ws = (window as any).__websocket;
      if (ws) {
        ws.close();
      }
    });

    // Should show disconnection indicator
    await expect(page.locator('[data-testid="websocket-disconnected"]')).toBeVisible();

    // Should attempt reconnection
    await page.waitForTimeout(2000);

    const reconnected = await page.evaluate(() => {
      return (window as any).__websocketConnected || false;
    });

    expect(reconnected).toBe(true);
  });

  test('should authenticate with Bearer token', async ({ page }) => {
    // Intercept API requests
    const requests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          headers: request.headers()
        });
      }
    });

    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      seed: 'Test agent'
    });

    // Check if request included Bearer token
    const apiRequest = requests.find(r => r.url.includes('/api/claws'));

    expect(apiRequest).toBeDefined();
    expect(apiRequest.headers['authorization']).toBeDefined();
    expect(apiRequest.headers['authorization']).toContain('Bearer');
  });

  test('should handle concurrent API requests', async ({ page }) => {
    // Create multiple agents concurrently
    const promises = [];

    for (let i = 1; i <= 10; i++) {
      promises.push(
        createClawAgent(page, `A${i}`, {
          type: 'SENSOR',
          seed: `Agent ${i}`
        })
      );
    }

    await Promise.all(promises);

    // Verify all agents were created
    for (let i = 1; i <= 10; i++) {
      await expect(page.locator(`[data-agent-id="A${i}"]`)).toBeVisible();
    }
  });

  test('should validate API schema compliance', async ({ page }) => {
    await createClawAgent(page, 'A1', {
      type: 'SENSOR',
      model: 'deepseek-chat',
      equipment: ['MEMORY', 'REASONING'],
      seed: 'Test agent'
    });

    // Fetch agent data from API
    const agentData = await page.evaluate(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/claws/A1`);
      return res.json();
    }, CLAW_API_BASE_URL);

    // Validate schema
    expect(agentData.clawId).toMatch(/^[A-Z]\d+$/);
    expect(agentData.state).toMatch(/^(DORMANT|THINKING|NEEDS_REVIEW|POSTED|ERROR|ARCHIVED)$/);

    expect(agentData.config).toHaveProperty('type');
    expect(agentData.config).toHaveProperty('model');
    expect(agentData.config).toHaveProperty('equipment');
    expect(Array.isArray(agentData.config.equipment)).toBe(true);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await captureScreenshot(page, testInfo.title);
    }
  });
});
