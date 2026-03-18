// Spreadsheet Moment - Health Check Server
// Lightweight HTTP server for health check and readiness probes

const http = require('http');
const os = require('os');

const PORT = process.env.HEALTH_CHECK_PORT || 3001;
const APP_PORT = process.env.PORT || 3000;

// Health check endpoints
const server = http.createServer((req, res) => {
  const url = req.url;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (url === '/health' || url === '/') {
    // Basic health check
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.ENVIRONMENT || 'unknown',
      version: process.env.APP_VERSION || '0.1.0'
    }));
  } else if (url === '/ready') {
    // Readiness probe - check if app is ready to serve traffic
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        app: true,
        database: checkDatabase(),
        redis: checkRedis(),
        claw_api: checkClawAPI()
      }
    }));
  } else if (url === '/metrics') {
    // Prometheus metrics endpoint
    const metrics = generateMetrics();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(metrics);
  } else if (url === '/info') {
    // Application information
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'Spreadsheet Moment',
      version: process.env.APP_VERSION || '0.1.0',
      environment: process.env.ENVIRONMENT || 'unknown',
      node_version: process.version,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu_usage: process.cpuUsage()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Helper functions
function checkDatabase() {
  // Simple check - in production, actually ping the database
  return !!process.env.DATABASE_URL;
}

function checkRedis() {
  // Simple check - in production, actually ping Redis
  return !!process.env.REDIS_URL;
}

function checkClawAPI() {
  // Simple check - in production, actually ping Claw API
  return !!process.env.CLAW_API_URL;
}

function generateMetrics() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return `
# HELP spreadsheet_moment_uptime_seconds Application uptime in seconds
# TYPE spreadsheet_moment_uptime_seconds gauge
spreadsheet_moment_uptime_seconds ${process.uptime()}

# HELP spreadsheet_moment_memory_bytes Memory usage in bytes
# TYPE spreadsheet_moment_memory_bytes gauge
spreadsheet_moment_memory_bytes{type="rss"} ${memUsage.rss}
spreadsheet_moment_memory_bytes{type="heap_total"} ${memUsage.heapTotal}
spreadsheet_moment_memory_bytes{type="heap_used"} ${memUsage.heapUsed}
spreadsheet_moment_memory_bytes{type="external"} ${memUsage.external}

# HELP spreadsheet_moment_cpu_usage_total CPU usage in microseconds
# TYPE spreadsheet_moment_cpu_usage_total counter
spreadsheet_moment_cpu_usage_total{type="user"} ${cpuUsage.user}
spreadsheet_moment_cpu_usage_total{type="system"} ${cpuUsage.system}

# HELP spreadsheet_moment_event_loop_lag_seconds Event loop lag in seconds
# TYPE spreadsheet_moment_event_loop_lag_seconds gauge
spreadsheet_moment_event_loop_lag_seconds 0

# HELP spreadsheet_moment_active_connections Active connections count
# TYPE spreadsheet_moment_active_connections gauge
spreadsheet_moment_active_connections 0
  `.trim();
}

// Start server
server.listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  - http://localhost:${PORT}/health`);
  console.log(`  - http://localhost:${PORT}/ready`);
  console.log(`  - http://localhost:${PORT}/metrics`);
  console.log(`  - http://localhost:${PORT}/info`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
