# Spreadsheet Moment - Multi-Stage Dockerfile for Staging
# Optimized for production deployment with minimal image size
#
# Build: docker build -f deployment/staging/Dockerfile -t spreadsheet-moment:staging .
# Run: docker run -p 3000:3000 spreadsheet-moment:staging

# ============================================================================
# Stage 1: Base Image
# ============================================================================
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# ============================================================================
# Stage 2: Dependencies
# ============================================================================
FROM base AS dependencies
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================================================
# Stage 3: Build
# ============================================================================
FROM dependencies AS build
WORKDIR /app

# Copy source code
COPY . .

# Build all packages
RUN pnpm build

# ============================================================================
# Stage 4: Production
# ============================================================================
FROM node:20-alpine AS production
WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache \
    ca-certificates \
    curl \
    dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package.json ./
COPY packages/*/package.json ./packages/*/

# Install production dependencies only
RUN npm install -g pnpm@8 && \
    pnpm install --prod --frozen-lockfile

# Copy built artifacts from build stage
COPY --from=build --chown=nodejs:nodejs /app/packages/*/dist ./packages/*/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/*/public ./packages/*/public

# Copy configuration files
COPY --chown=nodejs:nodejs deployment/staging/entrypoint.sh /entrypoint.sh
COPY --chown=nodejs:nodejs deployment/staging/health-check.js /health-check.js

# Create necessary directories
RUN mkdir -p /var/log/spreadsheet-moment /uploads && \
    chown -R nodejs:nodejs /var/log/spreadsheet-moment /uploads

# Set permissions
RUN chmod +x /entrypoint.sh

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node /health-check.js || exit 1

# Switch to non-root user
USER nodejs

# Set environment variables
ENV NODE_ENV=staging \
    ENVIRONMENT=staging \
    PORT=3000 \
    HEALTH_CHECK_PORT=3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/entrypoint.sh"]

# Start application
CMD ["node", "packages/agent-core/dist/index.js"]
