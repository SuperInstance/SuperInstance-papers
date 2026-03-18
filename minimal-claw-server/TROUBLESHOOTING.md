# Troubleshooting Guide for Minimal CLAW Server

Common issues and solutions for deploying and running the Minimal CLAW Server.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Docker Issues](#docker-issues)
3. [Database Issues](#database-issues)
4. [Redis Issues](#redis-issues)
5. [Networking Issues](#networking-issues)
6. [Performance Issues](#performance-issues)
7. [Deployment Issues](#deployment-issues)

---

## Installation Issues

### Issue: Port 8080 Already in Use

**Symptoms**:
- Error: "Port 8080 is already in use"
- Server fails to start

**Solutions**:

```bash
# Find process using port 8080
lsof -i :8080
# or
netstat -tulpn | grep 8080

# Kill the process
kill -9 <PID>

# Or change the port
export PORT=8081
docker-compose up -d
```

**Prevention**:
- Use `.env` file to set custom port
- Stop other services using the port
- Use docker-compose port mapping

---

### Issue: Docker Daemon Not Running

**Symptoms**:
- Error: "Cannot connect to the Docker daemon"
- Docker commands fail

**Solutions**:

```bash
# Start Docker daemon
sudo systemctl start docker
# or
sudo service docker start

# Enable Docker on boot
sudo systemctl enable docker

# Check Docker status
sudo systemctl status docker
```

**For macOS/Windows**:
- Start Docker Desktop application
- Check Docker Desktop is running in menu bar/system tray

---

### Issue: Permission Denied

**Symptoms**:
- Error: "Permission denied" when running scripts
- Cannot write to directories

**Solutions**:

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run with sudo (not recommended for Docker)
sudo docker-compose up -d

# Add user to docker group (recommended)
sudo usermod -aG docker $USER
newgrp docker
```

---

## Docker Issues

### Issue: Container Exits Immediately

**Symptoms**:
- Container starts and immediately exits
- `docker ps` shows no running containers

**Solutions**:

```bash
# Check container logs
docker logs minimal-claw-server

# Check exit code
docker ps -a | grep minimal-claw-server

# Run in foreground to see errors
docker run --rm -it minimal-claw-server:latest

# Common fixes:
# 1. Check environment variables are set
# 2. Check database is accessible
# 3. Check port mappings
# 4. Verify file permissions
```

---

### Issue: Out of Memory

**Symptoms**:
- Container killed with OOM error
- Services become unresponsive

**Solutions**:

```bash
# Check container resource usage
docker stats

# Increase memory limit
docker-compose up -d --scale claw-server=1
# Update docker-compose.yml:
# services:
#   claw-server:
#     mem_limit: 2g
#     memswap_limit: 2g

# Free up memory
docker system prune -a
docker volume prune
```

---

### Issue: Image Build Fails

**Symptoms**:
- Docker build fails with errors
- Dependencies cannot be installed

**Solutions**:

```bash
# Clean build
docker build --no-cache -t minimal-claw-server .

# Check Dockerfile syntax
docker build --check -t minimal-claw-server .

# Use specific build arguments
docker build --build-arg NODE_ENV=production -t minimal-claw-server .

# Clear build cache
docker builder prune
```

---

## Database Issues

### Issue: Cannot Connect to Database

**Symptoms**:
- Error: "ECONNREFUSED" or "Connection refused"
- Application cannot connect to PostgreSQL

**Solutions**:

```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs claw-postgres

# Test connection
docker exec claw-postgres pg_isready -U clawuser

# Verify environment variables
docker-compose exec claw-server env | grep DB_

# Common fixes:
# 1. Ensure database container is running
# 2. Check DB_HOST is correct (use 'postgres' for Docker)
# 3. Verify DB_PASSWORD is correct
# 4. Check network connectivity
```

---

### Issue: Database Migration Fails

**Symptoms**:
- Migration scripts fail to run
- Database schema is incorrect

**Solutions**:

```bash
# Check current schema
docker exec claw-postgres psql -U clawuser -d clawdb -c "\dt"

# Run migrations manually
docker exec claw-postgres psql -U clawuser -d clawdb -f /docker-entrypoint-initdb.d/init-db.sql

# Rollback migrations
docker exec claw-postgres psql -U clawuser -d clawdb -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-run migrations
docker-compose down -v
docker-compose up -d
```

---

### Issue: Slow Database Queries

**Symptoms**:
- API responses are slow
- Database queries take long time

**Solutions**:

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM agents;

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'agents';

-- Create indexes
CREATE INDEX idx_agents_state ON agents(state);
CREATE INDEX idx_agents_created_at ON agents(created_at);

-- Update table statistics
ANALYZE agents;

-- Vacuum and reclaim space
VACUUM ANALYZE;
```

---

## Redis Issues

### Issue: Cannot Connect to Redis

**Symptoms**:
- Error: "Redis connection lost"
- Caching not working

**Solutions**:

```bash
# Check if Redis container is running
docker ps | grep redis

# Check Redis logs
docker logs claw-redis

# Test connection
docker exec claw-redis redis-cli ping

# Verify environment variables
docker-compose exec claw-server env | grep REDIS_

# Common fixes:
# 1. Ensure Redis container is running
# 2. Check REDIS_HOST is correct (use 'redis' for Docker)
# 3. Verify REDIS_PASSWORD is correct
# 4. Check network connectivity
```

---

### Issue: Redis Out of Memory

**Symptoms**:
- Redis saves fail with "OOM"
- Keys are being evicted

**Solutions**:

```bash
# Check Redis memory usage
docker exec claw-redis redis-cli INFO memory

# Check maxmemory setting
docker exec claw-redis redis-cli CONFIG GET maxmemory

# Set maxmemory policy
docker exec claw-redis redis-cli CONFIG SET maxmemory allkeys-lru

# Clear all keys (use with caution)
docker exec claw-redis redis-cli FLUSHALL

# Restart Redis
docker-compose restart redis
```

---

## Networking Issues

### Issue: Cannot Access Server from Host

**Symptoms**:
- Cannot connect to http://localhost:8080
- Connection refused errors

**Solutions**:

```bash
# Check port mapping
docker ps | grep 8080

# Verify server is running
docker-compose ps

# Check firewall rules
sudo ufw status
sudo firewall-cmd --list-all

# Test from inside container
docker-compose exec claw-server curl http://localhost:8080/health

# Common fixes:
# 1. Ensure port is mapped correctly (-p 8080:8080)
# 2. Check firewall isn't blocking port
# 3. Verify server is listening on 0.0.0.0, not 127.0.0.1
```

---

### Issue: WebSocket Connection Fails

**Symptoms**:
- WebSocket connections fail
- Real-time updates not working

**Solutions**:

```bash
# Check WebSocket endpoint
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
  http://localhost:8080/ws

# Verify Nginx configuration (if using)
# Add WebSocket upgrade headers:
# location /ws {
#   proxy_pass http://claw-server;
#   proxy_http_version 1.1;
#   proxy_set_header Upgrade $http_upgrade;
#   proxy_set_header Connection "upgrade";
# }

# Common fixes:
# 1. Check reverse proxy supports WebSocket
# 2. Verify WebSocket path is correct
# 3. Check CORS settings
```

---

## Performance Issues

### Issue: High CPU Usage

**Symptoms**:
- Server uses 100% CPU
- Slow response times

**Solutions**:

```bash
# Check CPU usage
docker stats

# Profile CPU usage
docker run --rm --cpus=1 --name=profiler minimal-claw-server:latest npm run profile

# Common fixes:
# 1. Implement caching (Redis)
# 2. Optimize database queries
# 3. Add rate limiting
# 4. Scale horizontally
# 5. Use load balancer
```

---

### Issue: Memory Leak

**Symptoms**:
- Memory usage increases over time
- Container eventually killed

**Solutions**:

```bash
# Monitor memory usage
docker stats --no-stream

# Check for memory leaks
docker run --rm --name=memcheck minimal-claw-server:latest npm run memcheck

# Common fixes:
# 1. Fix event listener leaks
# 2. Clear unused objects
# 3. Implement connection pooling
# 4. Add memory limits
# 5. Restart containers periodically
```

---

### Issue: Slow Response Times

**Symptoms**:
- API requests take long time
- Timeouts on client side

**Solutions**:

```bash
# Check response times
curl -w "@curl-format.txt" http://localhost:8080/api/v1/agents

# Profile application
docker-compose exec claw-server npm run profile

# Common fixes:
# 1. Add database indexes
# 2. Implement caching
# 3. Optimize queries
# 4. Use CDN for static assets
# 5. Enable compression
# 6. Scale horizontally
```

---

## Deployment Issues

### Issue: Deployment Fails

**Symptoms**:
- Deployment script fails
- Services not starting

**Solutions**:

```bash
# Check deployment logs
./scripts/deploy.sh production 2>&1 | tee deploy.log

# Verify environment variables
cat .env

# Check disk space
df -h

# Common fixes:
# 1. Ensure all environment variables are set
# 2. Check sufficient disk space
# 3. Verify network connectivity
# 4. Check resource availability
```

---

### Issue: Rollback Fails

**Symptoms**:
- Rollback script fails
- Cannot restore from backup

**Solutions**:

```bash
# Check backup files exist
ls -lh backups/

# Verify backup integrity
gunzip -t backups/db_backup_*.sql.gz

# Test database connection
docker exec claw-postgres pg_isready -U clawuser

# Manual restore
docker exec -i claw-postgres psql -U clawuser clawdb < backups/db_backup_*.sql

# Common fixes:
# 1. Ensure backup files are valid
# 2. Check database is accessible
# 3. Verify sufficient disk space
# 4. Check correct permissions
```

---

## Getting Help

If you're still experiencing issues:

1. **Check logs**:
   ```bash
   docker-compose logs -f claw-server
   docker-compose logs -f postgres
   docker-compose logs -f redis
   ```

2. **Run health check**:
   ```bash
   ./scripts/health-check.sh --verbose
   ```

3. **Check documentation**:
   - [Deployment Guide](DEPLOYMENT.md)
   - [Scaling Guide](SCALING.md)
   - [Security Guide](SECURITY.md)

4. **Get support**:
   - GitHub Issues: https://github.com/SuperInstance/minimal-claw-server/issues
   - Email: support@superinstance.ai
   - Discord: https://discord.gg/superinstance

---

## Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `ECONNREFUSED` | Connection refused | Check service is running and accessible |
| `ECONNRESET` | Connection reset | Check network stability |
| `ETIMEDOUT` | Connection timeout | Check firewall and network settings |
| `EADDRINUSE` | Address already in use | Change port or stop conflicting service |
| `ENOMEM` | Out of memory | Increase memory limit or reduce usage |
| `EACCES` | Permission denied | Check file permissions or run with appropriate user |

---

## Prevention Tips

1. **Regular Backups**: Schedule automatic backups
2. **Monitoring**: Set up alerts for common issues
3. **Testing**: Test deployments in staging first
4. **Documentation**: Document custom configurations
5. **Updates**: Keep dependencies up to date
6. **Resources**: Monitor resource usage regularly
