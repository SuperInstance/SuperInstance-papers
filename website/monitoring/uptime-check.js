/**
 * Uptime monitoring check for SuperInstance website
 * This runs as a Cloudflare Worker
 */

// Configuration
const CONFIG = {
  // URLs to monitor
  urls: [
    'https://superinstance.ai',
    'https://staging.superinstance.ai',
    'https://superinstance.ai/api/health',
  ],

  // Health check endpoints
  healthEndpoints: [
    {
      url: 'https://superinstance.ai/api/health',
      expectedStatus: 200,
      timeout: 5000,
      expectedResponse: { status: 'ok' },
    },
  ],

  // Notification settings
  notifications: {
    email: 'alerts@superinstance.ai',
    slack: process.env.SLACK_WEBHOOK_URL,
    webhook: process.env.WEBHOOK_URL,
  },

  // Alert thresholds
  thresholds: {
    responseTimeMs: 3000,
    uptimePercentage: 99.0,
    consecutiveFailures: 3,
  },

  // Check frequency (cron expression)
  checkFrequency: '*/5 * * * *', // Every 5 minutes
};

/**
 * Check website availability and response time
 */
async function checkWebsite(url) {
  const startTime = Date.now();
  const startTimeISO = new Date().toISOString();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'SuperInstance-Monitor/1.0',
        'Cache-Control': 'no-cache',
      },
      cf: {
        cacheTtl: 0,
      },
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const isUp = response.status >= 200 && response.status < 300;

    const checkResult = {
      url,
      timestamp: startTimeISO,
      status: response.status,
      statusText: response.statusText,
      responseTime,
      up: isUp,
      headers: Object.fromEntries(response.headers),
    };

    if (isUp && response.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await response.json();
        checkResult.body = body;
      } catch (e) {
        // Not JSON, ignore
      }
    }

    return checkResult;
  } catch (error) {
    const endTime = Date.now();
    return {
      url,
      timestamp: startTimeISO,
      status: 0,
      statusText: error.message || 'Network Error',
      responseTime: endTime - startTime,
      up: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Check health endpoints with expected responses
 */
async function checkHealthEndpoint(endpoint) {
  const checkResult = await checkWebsite(endpoint.url);

  // Validate expected response
  if (checkResult.up && endpoint.expectedResponse) {
    const actualResponse = checkResult.body;
    const expectedKeys = Object.keys(endpoint.expectedResponse);

    for (const key of expectedKeys) {
      if (actualResponse?.[key] !== endpoint.expectedResponse[key]) {
        checkResult.up = false;
        checkResult.healthCheckFailed = true;
        checkResult.healthCheckError = `Expected ${key}=${endpoint.expectedResponse[key]}, got ${actualResponse?.[key]}`;
        break;
      }
    }
  }

  // Check response time
  if (checkResult.responseTime > CONFIG.thresholds.responseTimeMs) {
    checkResult.slowResponse = true;
    checkResult.slowResponseBy = checkResult.responseTime - CONFIG.thresholds.responseTimeMs;
  }

  return checkResult;
}

/**
 * Send notification via email
 */
async function sendEmailNotification(subject, message) {
  // This would integrate with an email service
  // For example: SendGrid, AWS SES, or other email provider
  console.log(`[EMAIL] ${subject}: ${message}`);
}

/**
 * Send notification via Slack
 */
async function sendSlackNotification(message) {
  if (!CONFIG.notifications.slack) return;

  try {
    await fetch(CONFIG.notifications.slack, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message,
        username: 'SuperInstance Monitor',
        icon_emoji: ':warning:',
      }),
    });
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

/**
 * Send notification via webhook
 */
async function sendWebhookNotification(data) {
  if (!CONFIG.notifications.webhook) return;

  try {
    await fetch(CONFIG.notifications.webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error('Failed to send webhook notification:', error);
  }
}

/**
 * Analyze check results and determine if alerts should be sent
 */
function analyzeResults(results) {
  const analysis = {
    allUp: true,
    failedChecks: [],
    slowChecks: [],
    averageResponseTime: 0,
    uptimePercentage: 0,
    alerts: [],
  };

  let totalResponseTime = 0;
  let upCount = 0;

  for (const result of results) {
    totalResponseTime += result.responseTime;

    if (result.up) {
      if (result.slowResponse) {
        analysis.slowChecks.push(result);
        analysis.alerts.push({
          type: 'SLOW_RESPONSE',
          severity: 'warning',
          message: `Slow response from ${result.url}: ${result.responseTime}ms`,
          result,
        });
      }
    } else {
      analysis.allUp = false;
      analysis.failedChecks.push(result);
      analysis.alerts.push({
        type: 'WEBSITE_DOWN',
        severity: 'critical',
        message: `${result.url} is down (${result.status} ${result.statusText})`,
        result,
      });
    }
  }

  analysis.averageResponseTime = Math.round(totalResponseTime / results.length);
  analysis.uptimePercentage = (upCount / results.length) * 100;

  // Check if uptime percentage is below threshold
  if (analysis.uptimePercentage < CONFIG.thresholds.uptimePercentage) {
    analysis.alerts.push({
      type: 'LOW_UPTIME',
      severity: 'warning',
      message: `Uptime is below threshold: ${analysis.uptimePercentage.toFixed(2)}%`,
    });
  }

  return analysis;
}

/**
 * Send notifications based on analysis results
 */
async function sendNotifications(analysis) {
  if (analysis.alerts.length === 0) return;

  // Group alerts by severity
  const criticalAlerts = analysis.alerts.filter(a => a.severity === 'critical');
  const warningAlerts = analysis.alerts.filter(a => a.severity === 'warning');

  // Critical alerts get immediate notification
  if (criticalAlerts.length > 0) {
    const message = `🚨 CRITICAL: ${criticalAlerts[0].message}\n${criticalAlerts.length - 1} more critical alerts`;
    await sendSlackNotification(message);
    await sendEmailNotification('Critical Website Alert', message);
  }

  // Warning alerts get daily summary
  if (warningAlerts.length > 0) {
    const message = `⚠️ WARNING: ${warningAlerts[0].message}\n${warningAlerts.length - 1} more warnings`;
    // Don't spam for warnings - could implement a daily digest
  }

  // Send to webhook for external integrations
  await sendWebhookNotification({
    timestamp: new Date().toISOString(),
    analysis,
  });
}

/**
 * Store check results in KV (if available)
 */
async function storeResults(env, results, analysis) {
  if (!env.MONITORING_KV) {
    console.log('No KV namespace configured for monitoring');
    return;
  }

  const timestamp = new Date().toISOString();
  const key = `uptime-${timestamp}`;
  const data = {
    timestamp,
    results,
    analysis,
  };

  try {
    await env.MONITORING_KV.put(key, JSON.stringify(data), {
      expirationTtl: 60 * 60 * 24 * 7, // 7 days
    });
  } catch (error) {
    console.error('Failed to store monitoring data:', error);
  }
}

/**
 * Main handler for scheduled task
 */
export async function scheduled(event, env, ctx) {
  console.log('Starting uptime monitoring check...');

  const allResults = [];

  // Check all URLs
  for (const url of CONFIG.urls) {
    const result = await checkWebsite(url);
    allResults.push(result);
  }

  // Check health endpoints
  for (const endpoint of CONFIG.healthEndpoints) {
    const result = await checkHealthEndpoint(endpoint);
    allResults.push(result);
  }

  // Analyze results
  const analysis = analyzeResults(allResults);

  // Log results
  console.log(`Monitoring check completed:`);
  console.log(`- All up: ${analysis.allUp}`);
  console.log(`- Average response time: ${analysis.averageResponseTime}ms`);
  console.log(`- Uptime percentage: ${analysis.uptimePercentage.toFixed(2)}%`);

  if (!analysis.allUp) {
    console.log(`- Failed checks: ${analysis.failedChecks.length}`);
  }

  if (analysis.slowChecks.length > 0) {
    console.log(`- Slow checks: ${analysis.slowChecks.length}`);
  }

  // Store results
  await storeResults(env, allResults, analysis);

  // Send notifications
  await sendNotifications(analysis);

  console.log('Uptime monitoring check completed');
}

/**
 * Optional: HTTP endpoint for manual triggers or status page
 */
export async function fetch(request, env, ctx) {
  const url = new URL(request.url);

  if (url.pathname === '/status') {
    // Return current status
    const status = {
      service: 'SuperInstance Uptime Monitor',
      status: 'running',
      timestamp: new Date().toISOString(),
      lastCheck: 'Scheduled task',
      nextCheck: 'Next cron interval',
    };

    return new Response(JSON.stringify(status, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  }

  if (url.pathname === '/trigger') {
    // Manually trigger a check
    await scheduled({ scheduledTime: new Date() }, env, ctx);
    return new Response('Check triggered', { status: 200 });
  }

  return new Response('Not found', { status: 404 });
}

export default {
  fetch,
  scheduled,
};