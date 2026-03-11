// Health check API endpoint
// Used for monitoring and uptime checks

import type { APIRoute } from 'astro';
import { getEnvironmentConfig } from '../../config/environments';

export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  const env = getEnvironmentConfig();

  // Collect health metrics
  const healthMetrics = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.name,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    responseTime: 0,
    checks: {
      website: true,
      api: true,
      database: false, // Not implemented yet
      cache: false, // Not implemented yet
    },
    version: process.env.npm_package_version || '0.1.0',
    commit: process.env.GITHUB_SHA || 'unknown',
    build: process.env.CF_PAGES_COMMIT_SHA || 'unknown',
  };

  // Calculate response time
  healthMetrics.responseTime = Date.now() - startTime;

  // Check for specific health issues
  const issues: string[] = [];

  // Memory check
  const memoryUsage = process.memoryUsage();
  const memoryPercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
  if (memoryPercent > 0.9) {
    issues.push('High memory usage');
    healthMetrics.status = 'degraded';
  }

  // Response time check
  if (healthMetrics.responseTime > 1000) {
    issues.push('Slow response time');
    healthMetrics.status = 'degraded';
  }

  // If any critical checks fail, mark as unhealthy
  if (!healthMetrics.checks.website || !healthMetrics.checks.api) {
    healthMetrics.status = 'unhealthy';
  }

  // Prepare response
  const statusCode = healthMetrics.status === 'healthy' ? 200 :
                     healthMetrics.status === 'degraded' ? 200 : // Still 200 but with degraded status
                     503;

  const response = {
    ...healthMetrics,
    issues: issues.length > 0 ? issues : undefined,
    message: healthMetrics.status === 'healthy'
      ? 'All systems operational'
      : `System status: ${healthMetrics.status}`,
  };

  return new Response(
    JSON.stringify(response, null, 2),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': 'true',
        'X-Environment': env.name,
        'X-Response-Time': healthMetrics.responseTime.toString(),
      },
    }
  );
};

// Detailed health check with more information
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const detailed = body.detailed === true;

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      system: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
      },
      memory: detailed ? process.memoryUsage() : undefined,
      environment: process.env.NODE_ENV || 'development',
      dependencies: detailed ? {
        astro: process.env.npm_package_dependencies_astro,
        react: process.env.npm_package_dependencies_react,
      } : undefined,
      deployment: {
        commit: process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA,
        branch: process.env.CF_PAGES_BRANCH,
        url: process.env.CF_PAGES_URL,
      },
    };

    return new Response(
      JSON.stringify(healthData, null, 2),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

// Head request for lightweight health checks
export const HEAD: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Health-Status': 'healthy',
      'X-Timestamp': new Date().toISOString(),
    },
  });
};