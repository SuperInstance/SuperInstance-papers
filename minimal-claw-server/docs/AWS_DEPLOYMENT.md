# AWS Deployment Guide for Minimal CLAW Server

This guide covers deploying the Minimal CLAW Server to AWS using various AWS services.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Options](#deployment-options)
3. [Option 1: AWS ECS (Elastic Container Service)](#option-1-aws-ecs)
4. [Option 2: AWS EC2 with Docker](#option-2-aws-ec2-with-docker)
5. [Option 3: AWS Elastic Beanstalk](#option-3-aws-elastic-beanstalk)
6. [Database Setup (Amazon RDS)](#database-setup-amazon-rds)
7. [Cache Setup (Amazon ElastiCache)](#cache-setup-amazon-elasticache)
8. [Load Balancing (ALB)](#load-balancing-alb)
9. [Monitoring & Logging](#monitoring--logging)
10. [Security Best Practices](#security-best-practices)

---

## Prerequisites

Before deploying to AWS, ensure you have:

- AWS account with appropriate permissions
- AWS CLI installed and configured
- Docker installed locally
- Basic knowledge of AWS services
- Domain name (optional, for production)

```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure
```

---

## Deployment Options

### Overview

| Option | Complexity | Scalability | Cost | Best For |
|--------|-----------|-------------|------|----------|
| **ECS** | Medium | High | Low-Medium | Production, scalable deployments |
| **EC2** | Low | Medium | Medium | Simple deployments, full control |
| **Elastic Beanstalk** | Low | High | Medium | Quick deployments, managed service |

---

## Option 1: AWS ECS

### Architecture

```
Internet → ALB → ECS Cluster → Fargate Tasks
                    ↓
                RDS PostgreSQL
                    ↓
                ElastiCache Redis
```

### Step 1: Create ECR Repository

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Create repository
aws ecr create-repository --repository-name minimal-claw-server --region us-east-1

# Build and push Docker image
docker build -t minimal-claw-server .
docker tag minimal-claw-server:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/minimal-claw-server:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/minimal-claw-server:latest
```

### Step 2: Create ECS Task Definition

Save as `ecs-task-definition.json`:

```json
{
  "family": "minimal-claw-server",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "claw-server",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/minimal-claw-server:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "8080"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:claw-db-password"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:claw-jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/minimal-claw-server",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:8080/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

Register the task definition:

```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

### Step 3: Create ECS Cluster

```bash
# Create cluster
aws ecs create-cluster --cluster-name claw-cluster

# Create security group
aws ec2 create-security-group --group-name claw-sg --description "Security group for CLAW server"

# Allow inbound traffic on port 8080
aws ec2 authorize-security-group-ingress --group-name claw-sg --protocol tcp --port 8080 --source-group YOUR_ALB_SECURITY_GROUP
```

### Step 4: Create ECS Service

```bash
# Create service
aws ecs create-service \
  --cluster claw-cluster \
  --service-name claw-service \
  --task-definition minimal-claw-server \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[SUBNET_ID1,SUBNET_ID2],securityGroups=[SECURITY_GROUP],assignPublicIp=ENABLED}" \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=50"
```

### Step 5: Set up Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/claw-cluster/claw-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy (CPU-based)
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/claw-cluster/claw-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name claw-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

---

## Option 2: AWS EC2 with Docker

### Step 1: Launch EC2 Instance

```bash
# Create security group
aws ec2 create-security-group --group-name claw-ec2-sg --description "Security group for CLAW server"

# Allow HTTP, HTTPS, and application port
aws ec2 authorize-security-group-ingress --group-name claw-ec2-sg --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name claw-ec2-sg --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name claw-ec2-sg --protocol tcp --port 8080 --cidr 0.0.0.0/0

# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --count 1 \
  --instance-type t3.medium \
  --key-name YOUR_KEY_PAIR \
  --security-group-ids claw-ec2-sg \
  --user-data file://user-data.sh
```

### Step 2: User Data Script

Save as `user-data.sh`:

```bash
#!/bin/bash
# Install Docker
yum update -y
yum install -y docker
service docker start
usermod -aG docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create application directory
mkdir -p /home/ec2-user/claw-server
cd /home/ec2-user/claw-server

# Download docker-compose.yml from S3
aws s3 cp s3://your-bucket/docker-compose.yml .

# Start services
docker-compose up -d
```

### Step 3: Deploy Application

```bash
# SSH into instance
ssh -i YOUR_KEY_PAIR.pem ec2-user@YOUR_INSTANCE_IP

# Clone repository
git clone https://github.com/SuperInstance/minimal-claw-server.git
cd minimal-claw-server

# Copy environment file
cp .env.production.example .env
# Edit .env with your values

# Start services
docker-compose up -d
```

---

## Option 3: AWS Elastic Beanstalk

### Step 1: Create Application

```bash
# Initialize EB CLI
eb init -p docker minimal-claw-server

# Create environment
eb create production-env \
  --single \
  --instance-type t3.medium \
  --service-role aws-elasticbeanstalk-service-role
```

### Step 2: Configure Environment

Create `Dockerrun.aws.json`:

```json
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/minimal-claw-server:latest",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": "8080"
    }
  ],
  "Logging": "/var/log/nginx"
}
```

### Step 3: Deploy

```bash
# Deploy to Elastic Beanstalk
eb deploy

# Open application in browser
eb open
```

---

## Database Setup (Amazon RDS)

### Create PostgreSQL Database

```bash
# Create subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name claw-subnet-group \
  --db-subnet-group-description "Subnet group for CLAW database" \
  --subnet-ids SUBNET_ID1 SUBNET_ID2

# Create database
aws rds create-db-instance \
  --db-instance-identifier claw-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.1 \
  --master-username clawuser \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20 \
  --db-subnet-group-name claw-subnet-group \
  --vpc-security-group-ids YOUR_SECURITY_GROUP \
  --backup-retention-period 7 \
  --multi-az false

# Wait for database to be ready
aws rds wait db-instance-available --db-instance-identifier claw-db

# Get database endpoint
aws rds describe-db-instances --db-instance-identifier claw-db --query "DBInstances[0].Endpoint.Address"
```

---

## Cache Setup (Amazon ElastiCache)

### Create Redis Cluster

```bash
# Create subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name claw-cache-subnet-group \
  --cache-subnet-group-description "Subnet group for CLAW cache" \
  --subnet-ids SUBNET_ID1 SUBNET_ID2

# Create replication group
aws elasticache create-replication-group \
  --replication-group-id claw-cache \
  --replication-group-description "Redis cluster for CLAW server" \
  --node-type cache.t3.micro \
  --num-node-groups 1 \
  --replicas-per-node-group 1 \
  --cache-subnet-group-name claw-cache-subnet-group \
  --security-group-ids YOUR_SECURITY_GROUP \
  --engine redis \
  --engine-version 7.0

# Get cache endpoint
aws elasticache describe-replication-groups --replication-group-id claw-cache
```

---

## Load Balancing (ALB)

### Create Application Load Balancer

```bash
# Create load balancer
aws elbv2 create-load-balancer \
  --name claw-alb \
  --subnets SUBNET_ID1 SUBNET_ID2 \
  --security-groups YOUR_SECURITY_GROUP

# Create target group
aws elbv2 create-target-group \
  --name claw-targets \
  --protocol HTTP \
  --port 8080 \
  --vpc-id YOUR_VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn YOUR_ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=YOUR_TARGET_GROUP_ARN

# Register targets (ECS tasks)
aws elbv2 register-targets \
  --target-group-arn YOUR_TARGET_GROUP_ARN \
  --targets Id=TARGET_ID_1,Port=8080 Id=TARGET_ID_2,Port=8080
```

---

## Monitoring & Logging

### CloudWatch Logs

```bash
# Create log group
aws logs create-log-group --log-group-name /aws/ecs/minimal-claw-server

# Create retention policy
aws logs put-retention-policy --log-group-name /aws/ecs/minimal-claw-server --retention-in-days 7
```

### CloudWatch Alarms

```bash
# Create CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name claw-cpu-alarm \
  --alarm-description "Alert on CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=claw-service

# Create memory utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name claw-memory-alarm \
  --alarm-description "Alert on Memory > 80%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=claw-service
```

---

## Security Best Practices

### 1. Use AWS Secrets Manager

```bash
# Store database password
aws secretsmanager create-secret \
  --name claw-db-password \
  --secret-string "YOUR_SECURE_PASSWORD"

# Store JWT secret
aws secretsmanager create-secret \
  --name claw-jwt-secret \
  --secret-string "YOUR_SECURE_JWT_SECRET"
```

### 2. Enable Encryption

```bash
# Enable encryption for EBS volumes
aws ec2 modify-volume --volume-id VOLUME_ID --encryption-type aes256

# Enable encryption for RDS
aws rds modify-db-instance \
  --db-instance-identifier claw-db \
  --storage-encrypted \
  --apply-immediately
```

### 3. Use IAM Roles

Create IAM role for ECS tasks:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### 4. Configure Security Groups

```bash
# Restrict inbound traffic to specific IPs
aws ec2 revoke-security-group-ingress \
  --group-name claw-sg \
  --protocol tcp \
  --port 8080 \
  --source-group 0.0.0.0/0

# Allow only from ALB
aws ec2 authorize-security-group-ingress \
  --group-name claw-sg \
  --protocol tcp \
  --port 8080 \
  --source-group YOUR_ALB_SECURITY_GROUP
```

---

## Cost Optimization Tips

1. **Use Reserved Instances** for long-running workloads
2. **Enable Auto Scaling** to scale down during low traffic
3. **Use Spot Instances** for non-critical workloads
4. **Monitor CloudWatch metrics** to identify over-provisioned resources
5. **Clean up unused resources** regularly

---

## Troubleshooting

### Common Issues

**Issue**: Container cannot connect to database
- Check security group rules
- Verify database is in same VPC
- Check subnet group configuration

**Issue**: High memory usage
- Monitor CloudWatch metrics
- Adjust container memory limits
- Consider scaling horizontally

**Issue**: Slow response times
- Enable CloudWatch Insights
- Check database query performance
- Consider using ElastiCache

---

## Next Steps

1. Set up CI/CD pipeline (AWS CodePipeline)
2. Configure SSL/TLS certificates (AWS Certificate Manager)
3. Set up disaster recovery (multi-AZ deployment)
4. Implement automated backups
5. Configure monitoring and alerting

---

## Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [AWS ElastiCache Documentation](https://docs.aws.amazon.com/elasticache/)
- [AWS CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
