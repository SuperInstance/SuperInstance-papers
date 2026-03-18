# Multi-stage build for Minimal CLAW Server
# Stage 1: Base image with dependencies
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Development image
FROM base AS development
WORKDIR /app

# Install all dependencies (including dev)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Start development server with hot reload
CMD ["npm", "run", "dev"]

# Stage 3: Production image
FROM base AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies from base stage
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./

# Copy source code
COPY src ./src
COPY tests ./tests

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start production server
CMD ["node", "src/index.js"]

# Stage 4: Test image
FROM development AS test
WORKDIR /app

# Run tests
CMD ["npm", "test"]
