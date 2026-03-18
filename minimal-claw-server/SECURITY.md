# Security Guide for Minimal CLAW Server

Comprehensive security guidelines for deploying the Minimal CLAW Server in production.

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Network Security](#network-security)
4. [Data Security](#data-security)
5. [API Security](#api-security)
6. [Container Security](#container-security)
7. [Secrets Management](#secrets-management)
8. [Compliance](#compliance)
9. [Security Auditing](#security-auditing)

---

## Security Overview

### Security Principles

1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimal access required
3. **Zero Trust**: Verify everything, trust nothing
4. **Encryption Everywhere**: Encrypt data at rest and in transit
5. **Regular Updates**: Keep dependencies up to date
6. **Monitoring**: Log and audit all activities

### Security Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS/TLS
- [ ] Implement rate limiting
- [ ] Set up authentication
- [ ] Configure CORS properly
- [ ] Enable security headers
- [ ] Implement input validation
- [ ] Set up monitoring and alerting
- [ ] Regular security audits
- [ ] Incident response plan

---

## Authentication & Authorization

### JWT Configuration

**Secure JWT Setup**:

```javascript
// Use strong, random secret (minimum 32 characters)
const JWT_SECRET = process.env.JWT_SECRET; // Use environment variable
const JWT_EXPIRES_IN = '1h'; // Short expiration for access tokens
const JWT_REFRESH_EXPIRES_IN = '7d'; // Longer expiration for refresh tokens

// Implement token rotation
function refreshAccessToken(refreshToken) {
  // Verify refresh token
  // Generate new access token
  // Return new tokens
}

// Implement token blacklisting for logout
const tokenBlacklist = new Set();

function logout(token) {
  tokenBlacklist.add(token);
}

function isTokenBlacklisted(token) {
  return tokenBlacklist.has(token);
}
```

### API Key Authentication

**Generate Secure API Keys**:

```bash
# Generate secure API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Implementation**:

```javascript
// Validate API key
function validateApiKey(apiKey) {
  // Check if key exists in database
  // Check if key is active
  // Check if key has required scopes
  // Check rate limits
}

// Scope-based access control
const scopes = {
  AGENT_READ: 'agent:read',
  AGENT_WRITE: 'agent:write',
  AGENT_DELETE: 'agent:delete',
  EQUIPMENT_MANAGE: 'equipment:manage',
  WEBSOCKET_CONNECT: 'websocket:connect',
  ADMIN: 'admin',
};

function hasScope(userScope, requiredScope) {
  return userScope === scopes.ADMIN || userScope === requiredScope;
}
```

---

## Network Security

### Firewall Configuration

**UFW (Uncomplicated Firewall)**:

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application port (if not behind proxy)
sudo ufw allow 8080/tcp

# Deny all other incoming traffic
sudo ufw default deny incoming

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

**AWS Security Groups**:

```bash
# Create security group
aws ec2 create-security-group --group-name claw-server-sg --description "Security group for CLAW server"

# Allow HTTP
aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 80 --cidr 0.0.0.0/0

# Allow HTTPS
aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 443 --cidr 0.0.0.0/0

# Allow SSH from specific IP
aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 22 --cidr YOUR_IP/32
```

### TLS/SSL Configuration

**Nginx Configuration**:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # SSL session cache
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    location / {
        proxy_pass http://claw_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Data Security

### Database Security

**PostgreSQL Security**:

```sql
-- Create dedicated user with limited privileges
CREATE USER clawuser WITH PASSWORD 'strong_password';

-- Grant necessary privileges only
GRANT CONNECT ON DATABASE clawdb TO clawuser;
GRANT USAGE ON SCHEMA public TO clawuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clawuser;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clawuser;

-- Enable encryption
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/var/lib/postgresql/server.crt';
ALTER SYSTEM SET ssl_key_file = '/var/lib/postgresql/server.key';

-- Reload configuration
SELECT pg_reload_conf();
```

**Connection String**:

```
postgresql://clawuser:password@host:5432/clawdb?sslmode=require
```

### Data Encryption

**Encrypting Sensitive Data**:

```javascript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

---

## API Security

### Rate Limiting

**Implementation**:

```javascript
import rateLimit from 'express-rate-limit';

// General rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
});

// Stricter rate limiting for write operations
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many write operations, please try again later',
});

// Apply to routes
app.use('/api/', limiter);
app.use('/api/v1/agents', writeLimiter); // For POST/PUT/DELETE
```

### Input Validation

**Schema Validation**:

```javascript
import { z } from 'zod';

// Define schema
const createAgentSchema = z.object({
  model: z.string().min(1).max(100),
  seed: z.string().min(1).max(1000),
  equipment: z.array(z.enum(['MEMORY', 'REASONING', 'CONSENSUS', 'SPREADSHEET', 'DISTILLATION', 'COORDINATION'])),
  trigger: z.object({
    type: z.enum(['manual', 'data', 'periodic']),
    source: z.string().optional(),
  }),
});

// Validate input
app.post('/api/v1/agents', (req, res) => {
  try {
    const validated = createAgentSchema.parse(req.body);
    // Process validated data
  } catch (error) {
    res.status(400).json({ error: error.errors });
  }
});
```

### CORS Configuration

**Secure CORS Setup**:

```javascript
import cors from 'cors';

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGINS.split(',');
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
```

---

## Container Security

### Docker Security

**Dockerfile Best Practices**:

```dockerfile
# Use minimal base image
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY src ./src

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/index.js"]
```

### Docker Compose Security

```yaml
version: '3.8'

services:
  claw-server:
    build:
      context: .
      target: production
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    networks:
      - claw-network
    environment:
      - NODE_ENV=production

networks:
  claw-network:
    driver: bridge
    internal: false # Set to true to isolate from internet
```

---

## Secrets Management

### Environment Variables

**Never Commit Secrets**:

```bash
# Add .env to .gitignore
echo ".env" >> .gitignore

# Use .env.example as template
cp .env.example .env

# Set strong secrets
export JWT_SECRET=$(openssl rand -base64 32)
export DB_PASSWORD=$(openssl rand -base64 16)
export ENCRYPTION_KEY=$(openssl rand -base64 32)
```

### AWS Secrets Manager

```bash
# Store secret
aws secretsmanager create-secret \
  --name claw-db-password \
  --secret-string "$(openssl rand -base64 16)"

# Retrieve secret in application
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  if ('SecretString' in data) {
    return data.SecretString;
  }
  return Buffer.from(data.SecretBinary, 'base64').toString();
}
```

### HashiCorp Vault

```bash
# Enable secrets engine
vault secrets enable -path=claw kv-v2

# Store secret
vault kv put claw/database password="$(openssl rand -base64 16)"

# Retrieve secret
vault kv get -field=password claw/database
```

---

## Compliance

### GDPR Compliance

**Data Protection**:

```javascript
// Implement right to be forgotten
async function deleteUserData(userId) {
  // Delete all user data
  await db.query('DELETE FROM agents WHERE user_id = $1', [userId]);
  await db.query('DELETE FROM users WHERE id = $1', [userId]);
  await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

  // Log deletion
  logger.info('User data deleted', { userId });
}

// Data export functionality
async function exportUserData(userId) {
  const agents = await db.query('SELECT * FROM agents WHERE user_id = $1', [userId]);
  const sessions = await db.query('SELECT * FROM sessions WHERE user_id = $1', [userId]);

  return {
    agents: agents.rows,
    sessions: sessions.rows,
  };
}
```

### Audit Logging

```javascript
// Audit log sensitive operations
function auditLog(action, userId, details) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    details,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };

  // Store in audit log
  db.query('INSERT INTO audit_logs ($1) VALUES ($1)', [logEntry]);

  // Send to SIEM (Security Information and Event Management)
  siem.send(logEntry);
}

// Use for sensitive operations
auditLog('AGENT_DELETED', userId, { agentId: 'xxx' });
```

---

## Security Auditing

### Dependency Scanning

```bash
# Run npm audit
npm audit

# Fix vulnerabilities
npm audit fix

# Run Snyk security scan
npx snyk test

# Run OWASP dependency check
dependency-check --scan . --out JSON
```

### Container Scanning

```bash
# Scan Docker image for vulnerabilities
docker scan minimal-claw-server:latest

# Use Trivy for more comprehensive scanning
trivy image minimal-claw-server:latest

# Use Clair for container analysis
clair-client analyze minimal-claw-server:latest
```

### Security Headers

**Helmet.js**:

```javascript
import helmet from 'helmet';

app.use(helmet());

// Custom security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
  next();
});
```

---

## Incident Response

### Security Incident Checklist

1. **Identify** the breach
2. **Contain** the damage
3. **Eradicate** the threat
4. **Recover** systems
5. **Lessons learned**

### Incident Response Plan

```markdown
# Security Incident Response Plan

## Phase 1: Identification
- Monitor alerts from security tools
- Review logs for suspicious activity
- Confirm if incident is real

## Phase 2: Containment
- Isolate affected systems
- Block malicious IPs
- Revoke compromised credentials
- Preserve evidence

## Phase 3: Eradication
- Remove malware
- Patch vulnerabilities
- Close security holes
- Update security rules

## Phase 4: Recovery
- Restore from clean backups
- Verify systems are clean
- Monitor for recurrence
- Document lessons learned

## Phase 5: Post-Incident
- Conduct post-mortem
- Update security policies
- Improve monitoring
- Train staff
```

---

## Best Practices

### Development

1. **Never hardcode secrets**
2. **Use environment variables**
3. **Implement input validation**
4. **Use parameterized queries**
5. **Sanitize user input**
6. **Implement rate limiting**
7. **Use HTTPS everywhere**
8. **Keep dependencies updated**

### Production

1. **Enable security headers**
2. **Configure CORS properly**
3. **Implement authentication**
4. **Use strong encryption**
5. **Regular security audits**
6. **Monitor and log everything**
7. **Have incident response plan**
8. **Regular backups**

### Operations

1. **Regular updates and patches**
2. **Monitor security advisories**
3. **Conduct penetration testing**
4. **Review access logs**
5. **Test backups regularly**
6. **Document security policies**
7. **Train staff on security**
8. **Stay informed on threats**

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Security Headers](https://securityheaders.com/)
- [Docker Security](https://docs.docker.com/engine/security/)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

---

## Reporting Vulnerabilities

If you discover a security vulnerability, please:

1. **Do not** create a public issue
2. **Email** security@superinstance.ai
3. **Include** details about the vulnerability
4. **Allow** us time to fix before disclosing

We will respond within 48 hours and provide regular updates on our progress.

---

## License

MIT License - see LICENSE file for details
