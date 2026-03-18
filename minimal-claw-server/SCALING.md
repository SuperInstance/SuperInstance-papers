# Scaling Guide for Minimal CLAW Server

Comprehensive guide for scaling the Minimal CLAW Server deployment.

---

## Table of Contents

1. [Scaling Overview](#scaling-overview)
2. [Vertical Scaling](#vertical-scaling)
3. [Horizontal Scaling](#horizontal-scaling)
4. [Database Scaling](#database-scaling)
5. [Cache Scaling](#cache-scaling)
6. [Load Balancing](#load-balancing)
7. [Auto-Scaling](#auto-scaling)
8. [Cost Optimization](#cost-optimization)

---

## Scaling Overview

### Scaling Metrics

Monitor these metrics to determine when to scale:

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| **CPU Usage** | > 70% | > 90% | Scale up/out |
| **Memory Usage** | > 75% | > 90% | Scale up/out |
| **Response Time** | > 1s | > 5s | Scale out/optimize |
| **Error Rate** | > 1% | > 5% | Scale out/fix bugs |
| **Queue Depth** | > 100 | > 500 | Scale out |

### Scaling Strategy

```
Small Load (< 100 users):
  Single instance, 1 CPU, 1GB RAM

Medium Load (100-1000 users):
  2-3 instances, 2 CPUs, 2GB RAM each

Large Load (1000-10000 users):
  5-10 instances, 4 CPUs, 4GB RAM each

Enterprise Load (> 10000 users):
  10+ instances, 8+ CPUs, 8GB+ RAM each
```

---

## Vertical Scaling

### Increase Container Resources

**Docker Compose**:

```yaml
services:
  claw-server:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

**Docker Run**:

```bash
docker run -d \
  --name claw-server \
  --cpus=2 \
  --memory=2g \
  --memory-swap=2g \
  -p 8080:8080 \
  minimal-claw-server:latest
```

**Kubernetes**:

```yaml
resources:
  requests:
    cpu: "1"
    memory: "1Gi"
  limits:
    cpu: "2"
    memory: "2Gi"
```

### Database Scaling

**PostgreSQL**:

```bash
# Upgrade instance size (AWS RDS)
aws rds modify-db-instance \
  --db-instance-identifier claw-db \
  --db-instance-class db.t3.medium \
  --apply-immediately

# Increase storage
aws rds modify-db-instance \
  --db-instance-identifier claw-db \
  --allocated-storage 100 \
  --apply-immediately
```

**Configuration Tuning**:

```sql
-- PostgreSQL configuration
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '2621kB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

-- Reload configuration
SELECT pg_reload_conf();
```

---

## Horizontal Scaling

### Docker Compose Scaling

```bash
# Scale to 3 instances
docker-compose up -d --scale claw-server=3

# Scale with load balancer
docker-compose -f docker-compose.scale.yml up -d
```

**docker-compose.scale.yml**:

```yaml
version: '3.8'

services:
  claw-server:
    image: minimal-claw-server:latest
    deploy:
      mode: replicated
      replicas: 3
    environment:
      - NODE_ENV=production
    networks:
      - claw-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - claw-server
    networks:
      - claw-network

networks:
  claw-network:
    driver: bridge
```

### Kubernetes Scaling

```bash
# Scale deployment
kubectl scale deployment claw-server --replicas=3

# Enable horizontal pod autoscaler
kubectl autoscale deployment claw-server \
  --cpu-percent=70 \
  --min=2 \
  --max=10
```

**deployment.yaml**:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: claw-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: claw-server
  template:
    metadata:
      labels:
        app: claw-server
    spec:
      containers:
      - name: claw-server
        image: minimal-claw-server:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "1"
            memory: "1Gi"
          limits:
            cpu: "2"
            memory: "2Gi"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: claw-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: claw-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### AWS ECS Scaling

```bash
# Update service to use multiple tasks
aws ecs update-service \
  --cluster claw-cluster \
  --service claw-service \
  --desired-count 3

# Enable auto-scaling
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/claw-cluster/claw-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/claw-cluster/claw-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name claw-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

**scaling-policy.json**:

```json
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleOutCooldown": 300,
  "ScaleInCooldown": 300
}
```

---

## Database Scaling

### Read Replicas

**AWS RDS**:

```bash
# Create read replica
aws rds create-db-instance \
  --db-instance-identifier claw-db-replica \
  --source-db-instance-identifier claw-db \
  --db-instance-class db.t3.micro

# Promote replica to standalone
aws rds promote-read-replica \
  --db-instance-identifier claw-db-replica
```

**Application Configuration**:

```javascript
// Use read replicas for read operations
const readPool = new Pool({
  host: process.env.DB_READ_REPLICA_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const writePool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Use appropriate pool based on operation
function getPool(operation) {
  return operation === 'read' ? readPool : writePool;
}
```

### Connection Pooling

**PgBouncer**:

```yaml
# docker-compose.yml
services:
  pgbouncer:
    image: edoburu/pgbouncer:latest
    environment:
      - DB_HOST=postgres
      - DB_USER=clawuser
      - DB_PASSWORD=clawpass
      - DB_NAME=clawdb
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=1000
      - DEFAULT_POOL_SIZE=25
    ports:
      - "6432:6432"
    depends_on:
      - postgres
```

### Database Sharding

For very large deployments (> 100k agents):

```javascript
// Shard agents by ID
function getShard(agentId) {
  const shardCount = 4;
  const hash = crypto.createHash('md5').update(agentId).digest('hex');
  const shardIndex = parseInt(hash.substring(0, 8), 16) % shardCount;
  return `claw-db-shard-${shardIndex}`;
}

// Query appropriate shard
async function getAgent(agentId) {
  const shard = getShard(agentId);
  const pool = pools[shard];
  return pool.query('SELECT * FROM agents WHERE id = $1', [agentId]);
}
```

---

## Cache Scaling

### Redis Cluster

```yaml
# docker-compose.yml
services:
  redis-node-1:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf
    ports:
      - "7001:6379"

  redis-node-2:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf
    ports:
      - "7002:6379"

  redis-node-3:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf
    ports:
      - "7003:6379"
```

### Redis Sentinel (High Availability)

```yaml
services:
  redis-master:
    image: redis:7-alpine
    command: redis-server --appendonly yes

  redis-slave-1:
    image: redis:7-alpine
    command: redis-server --slaveof redis-master 6379

  redis-slave-2:
    image: redis:7-alpine
    command: redis-server --slaveof redis-master 6379

  redis-sentinel-1:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf

  redis-sentinel-2:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf

  redis-sentinel-3:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
```

---

## Load Balancing

### Nginx Configuration

```nginx
upstream claw_servers {
    least_conn;
    server claw-server-1:8080 weight=1;
    server claw-server-2:8080 weight=1;
    server claw-server-3:8080 weight=1;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://claw_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://claw_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### HAProxy Configuration

```
defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

backend claw_servers
    balance leastconn
    option httpchk GET /health
    server claw-server-1 claw-server-1:8080 check
    server claw-server-2 claw-server-2:8080 check
    server claw-server-3 claw-server-3:8080 check

frontend http-in
    bind *:80
    default_backend claw_servers
```

---

## Auto-Scaling

### AWS Auto Scaling

```bash
# Create scaling target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/claw-cluster/claw-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create CPU-based scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/claw-cluster/claw-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name claw-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    }
  }'

# Create memory-based scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/claw-cluster/claw-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name claw-memory-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 80.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageMemoryUtilization"
    }
  }'
```

### Kubernetes HPA

```bash
# Create HPA
kubectl autoscale deployment claw-server \
  --cpu-percent=70 \
  --min=2 \
  --max=10

# Create custom metric autoscaling
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: claw-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: claw-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Pods
    pods:
      metric:
        name: active_agents
      target:
        type: AverageValue
        averageValue: "100"
EOF
```

---

## Cost Optimization

### Rightsizing

```bash
# Monitor actual usage
docker stats --no-stream

# AWS CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=claw-service \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average

# Adjust resources based on actual usage
# If average CPU is 30%, reduce to smaller instance
# If average CPU is 80%, increase to larger instance
```

### Reserved Instances

**AWS**:

```bash
# Purchase reserved instances for 1-3 years
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id xxx \
  --instance-count 2 \
  --instance-type t3.medium
```

### Spot Instances

**AWS ECS Spot**:

```json
{
  "capacityProviderStrategy": [
    {
      "base": 1,
      "weight": 1,
      "capacityProvider": "FARGATE_SPOT"
    },
    {
      "base": 0,
      "weight": 1,
      "capacityProvider": "FARGATE"
    }
  ]
}
```

---

## Scaling Checklist

### Pre-Scaling

- [ ] Monitor current metrics
- [ ] Identify bottlenecks
- [ ] Estimate required capacity
- [ ] Plan scaling strategy
- [ ] Test in staging environment

### During Scaling

- [ ] Monitor health checks
- [ ] Check error rates
- [ ] Verify performance
- [ ] Test failover
- [ ] Monitor costs

### Post-Scaling

- [ ] Review metrics
- [ ] Optimize configuration
- [ ] Update documentation
- [ ] Set up auto-scaling
- [ ] Schedule regular reviews

---

## Monitoring Scaling

### Key Metrics

```bash
# CPU usage
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}"

# Memory usage
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}"

# Response time
curl -w "@curl-format.txt" http://localhost:8080/api/v1/agents

# Request rate
docker-compose exec claw-server curl http://localhost:8080/metrics | grep rate
```

**curl-format.txt**:

```
time_namelookup:  %{time_namelookup}\n
time_connect:     %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer: %{time_pretransfer}\n
time_starttransfer: %{time_starttransfer}\n
----------\n
time_total:       %{time_total}\n
```

---

## Best Practices

1. **Start Small**: Scale up as needed
2. **Monitor Everything**: Set up comprehensive monitoring
3. **Test Thoroughly**: Test scaling in staging first
4. **Automate**: Use auto-scaling when possible
5. **Optimize First**: Optimize code before scaling
6. **Plan Capacity**: Forecast growth and plan accordingly
7. **Review Regularly**: Review scaling strategy quarterly
8. **Document**: Document scaling decisions and configurations

---

## Next Steps

1. Set up monitoring and alerting
2. Implement auto-scaling policies
3. Test scaling procedures
4. Optimize database queries
5. Implement caching strategies
6. Plan for growth

---

## Additional Resources

- [AWS Scaling Guide](https://docs.aws.amazon.com/autoscaling/)
- [Kubernetes HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Docker Scaling](https://docs.docker.com/engine/swarm/swarm-tutorial/scale-service/)
- [PostgreSQL Scaling](https://www.postgresql.org/docs/current/scalability.html)
- [Redis Scaling](https://redis.io/topics/admin)
