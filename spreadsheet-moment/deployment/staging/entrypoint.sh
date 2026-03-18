#!/bin/sh
set -e

echo "🚀 Spreadsheet Moment - Staging Environment"
echo "==========================================="
echo "Environment: ${ENVIRONMENT}"
echo "Node Version: $(node --version)"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

# Wait for dependencies
echo "⏳ Waiting for dependencies..."
if [ -n "$DATABASE_URL" ]; then
    echo "  → PostgreSQL: ${DATABASE_URL}"
fi
if [ -n "$REDIS_URL" ]; then
    echo "  → Redis: ${REDIS_URL}"
fi
if [ -n "$CLAW_API_URL" ]; then
    echo "  → Claw API: ${CLAW_API_URL}"
fi
echo ""

# Run database migrations if available
if [ -f "./node_modules/.bin/prisma" ] && [ "$DATABASE_MIGRATE" = "true" ]; then
    echo "🔄 Running database migrations..."
    pnpm prisma migrate deploy || echo "⚠️  Migration failed or skipped"
fi

# Start health check server in background
echo "💚 Starting health check server on port ${HEALTH_CHECK_PORT:-3001}..."
node /health-check.js &

# Start application
echo "🎯 Starting application on port ${PORT:-3000}..."
echo ""

# Execute the main process
exec "$@"
