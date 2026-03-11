# Multi-stage Dockerfile for SuperInstance website
# Stage 1: Build
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies in CI mode
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production image
FROM nginx:alpine AS production

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy security headers configuration
COPY docker/security-headers.conf /etc/nginx/conf.d/security-headers.conf

# Create non-root user
RUN addgroup -g 1001 -S superinstance && \
    adduser -S -D -H -u 1001 -s /sbin/nologin -g superinstance superinstance

# Set ownership and permissions
RUN chown -R superinstance:superinstance /usr/share/nginx/html && \
    chown -R superinstance:superinstance /var/cache/nginx && \
    chown -R superinstance:superinstance /var/log/nginx && \
    chown -R superinstance:superinstance /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R superinstance:superinstance /var/run/nginx.pid

# Remove unnecessary default content
RUN rm -rf /usr/share/nginx/html/* && \
    rm -f /etc/nginx/conf.d/default.conf

# Switch to non-root user
USER superinstance

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]