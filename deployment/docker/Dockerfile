# POLLN Production Dockerfile
# Multi-stage build for optimized production image
# Build time: ~3 minutes
# Image size: ~180MB (compressed)

# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS dependencies
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    ca-certificates

# Copy package files
COPY package*.json ./

# Install production dependencies with precise versioning
RUN npm ci --only=production && \
    npm cache clean --force

# =============================================================================
# Stage 2: Build
# =============================================================================
FROM node:20-alpine AS build
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files and TypeScript config
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript with optimization
RUN npm run build && \
    # Remove declaration files to reduce size (optional)
    find ./dist -name "*.d.ts" -delete

# =============================================================================
# Stage 3: Security Scanning
# =============================================================================
FROM dependencies AS security
WORKDIR /app

# Copy built artifacts from build stage
COPY --from=build /app/dist ./dist

# Run security audit
RUN npm audit --audit-level=high || true

# =============================================================================
# Stage 4: Production
# =============================================================================
FROM node:20-alpine AS production
WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache \
    tini \
    git \
    curl \
    ca-certificates \
    # Add useful utilities for debugging
    busybox-extras

# Create non-root user with specific UID/GID for consistency
RUN addgroup -g 1001 -S polln && \
    adduser -S -u 1001 -G polln polln && \
    mkdir -p /app/.polln /app/.agents /app/logs && \
    chown -R polln:polln /app

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=polln:polln /app/node_modules ./node_modules

# Copy built artifacts from build stage
COPY --from=build --chown=polln:polln /app/dist ./dist

# Copy package files
COPY --chown=polln:polln package*.json ./

# Set environment variables
ENV NODE_ENV=production \
    POLLN_HOME=/app \
    POLLN_LOG_LEVEL=info \
    POLLN_API_PORT=3000 \
    POLLN_API_HOST=0.0.0.0

# Switch to non-root user
USER polln

# Expose ports
# 3000: WebSocket API
# 9464: Prometheus metrics
EXPOSE 3000 9464

# Configure health check
HEALTHCHECK --interval=30s \
            --timeout=10s \
            --start-period=40s \
            --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use tini for proper signal handling and zombie process reaping
ENTRYPOINT ["/sbin/tini", "--"]

# Default command: start API server
CMD ["node", "dist/api/server.js"]

# =============================================================================
# Stage 5: Development (optional)
# =============================================================================
FROM production AS development
USER root

# Install development dependencies
RUN apk add --no-cache \
    openssh \
    vim

# Install all dependencies
COPY --chown=polln:polln package*.json ./
RUN npm ci && \
    npm cache clean --force

# Copy source code for hot-reload
COPY --chown=polln:polln src ./src

USER polln

# Override environment for development
ENV NODE_ENV=development \
    POLLN_LOG_LEVEL=debug

CMD ["node", "--watch", "dist/api/server.js"]
