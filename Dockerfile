# POLLN Production Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Base image with dependencies
FROM node:20-alpine AS base
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Stage 3: Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    tini \
    git \
    curl

# Create non-root user
RUN addgroup -g 1001 -S polln && \
    adduser -S -u 1001 -G polln polln

# Copy production dependencies
COPY --from=builder --chown=polln:polln /app/node_modules ./node_modules

# Copy built artifacts
COPY --from=builder --chown=polln:polln /app/dist ./dist

# Copy package files
COPY --chown=polln:polln package*.json ./

# Set environment
ENV NODE_ENV=production
ENV POLLN_HOME=/app

# Switch to non-root user
USER polln

# Expose ports
# 3000: WebSocket API
# 9229: Node.js debugging
EXPOSE 3000 9229

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Default command: start API server
CMD ["node", "dist/api/server.js"]
