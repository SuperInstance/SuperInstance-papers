# POLLN Security Checklist

**Sprint 8: Security Hardening**
**Generated:** 2026-03-07
**Version:** 0.1.0

---

## Overview

This checklist provides actionable security tasks for implementing Sprint 8 requirements. Use this to track progress and ensure all security measures are properly implemented.

---

## Quick Start

- [ ] **Read** SECURITY_AUDIT.md for threat model and vulnerability analysis
- [ ] **Read** SECURITY_IMPLEMENTATION.md for detailed implementation guides
- [ ] **Review** this checklist and assign tasks to team members
- [ ] **Set up** security configuration file (`.polln-security.json`)
- [ ] **Generate** required encryption keys and JWT secrets

---

## Task 4.8.1: WebSocket API Security Audit

### JWT Authentication

- [ ] Install JWT dependencies
  ```bash
  npm install jsonwebtoken @types/jsonwebtoken
  ```

- [ ] Generate JWT secret
  ```bash
  # Generate 32-byte secret
  openssl rand -base64 32
  ```

- [ ] Set environment variables
  ```bash
  export JWT_SECRET=<generated-secret>
  export JWT_ALGORITHM=HS256
  export JWT_ACCESS_EXPIRY=3600
  export JWT_REFRESH_EXPIRY=604800
  export JWT_ISSUER=polln-api
  export JWT_AUDIENCE=polln-clients
  ```

- [ ] Update `src/api/middleware.ts`
  - [ ] Replace `AuthenticationMiddleware` with JWT-based implementation
  - [ ] Add `generateTokenPair()` method
  - [ ] Add `validateAccessToken()` method
  - [ ] Add `refreshAccessToken()` method
  - [ ] Add `revokeRefreshToken()` method
  - [ ] Add token cleanup interval

- [ ] Update `src/api/types.ts`
  - [ ] Add `JWTConfig` interface
  - [ ] Add `TokenPair` interface
  - [ ] Add `SignedA2APackage` interface (for later task)

- [ ] Update `src/api/server.ts`
  - [ ] Add `verifyClient()` to WebSocketServer config
  - [ ] Implement origin validation
  - [ ] Implement TLS enforcement for production
  - [ ] Add connection limit checking
  - [ ] Add per-IP connection tracking

- [ ] Write tests (`src/api/__tests__/jwt-auth.test.ts`)
  - [ ] Test token generation
  - [ ] Test token validation
  - [ ] Test token refresh
  - [ ] Test token revocation
  - [ ] Test expired token rejection
  - [ ] Test invalid token rejection

### WebSocket Security

- [ ] Add TLS/SSL configuration
  ```bash
  export NODE_ENV=production
  export WSS_ENABLE_TLS=true
  ```

- [ ] Configure allowed origins
  ```bash
  export ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
  ```

- [ ] Set connection limits
  ```bash
  export MAX_WS_CONNECTIONS=1000
  export MAX_WS_CONNECTIONS_PER_IP=10
  ```

- [ ] Implement client verification in `src/api/server.ts`
  - [ ] Origin header validation
  - [ ] TLS requirement check
  - [ ] Connection count validation
  - [ ] Per-IP connection limit validation

- [ ] Add connection cleanup
  - [ ] Track IP connection counts
  - [ ] Decrement on disconnect
  - [ ] Handle cleanup on server shutdown

### Testing Checklist

- [ ] Unit tests pass for JWT authentication
  ```bash
  npm test -- src/api/__tests__/jwt-auth.test.ts
  ```

- [ ] Integration tests pass for WebSocket security
  ```bash
  npm test -- src/api/__tests__/websocket-security.test.ts
  ```

- [ ] Manual testing
  - [ ] Test with valid JWT token
  - [ ] Test with invalid JWT token
  - [ ] Test with expired token
  - [ ] Test token refresh flow
  - [ ] Test origin validation (try from unauthorized origin)
  - [ ] Test connection limits (open multiple connections)
  - [ ] Test per-IP limits (use different IPs if possible)

---

## Task 4.8.2: Per-Colony Rate Limiting

### Implementation

- [ ] Update `src/api/middleware.ts`
  - [ ] Add `ColonyRateLimitConfig` interface
  - [ ] Add `ColonyRateLimitTracker` interface
  - [ ] Implement `ColonyAwareRateLimitMiddleware` class
  - [ ] Add `checkLimit()` method with colony/user/resource parameters
  - [ ] Add `getRemainingRequests()` method
  - [ ] Add `resetColonyLimits()` method
  - [ ] Add `resetUserLimits()` method
  - [ ] Add `cleanup()` method for old trackers

- [ ] Update `src/api/handlers.ts`
  - [ ] Add `extractRequestInfo()` helper method
  - [ ] Integrate `ColonyAwareRateLimitMiddleware` in `handleMessage()`
  - [ ] Return rate limit error when limit exceeded
  - [ ] Include retry-after time in error response

- [ ] Update `src/api/types.ts`
  - [ ] Add `ColonyRateLimitConfig` interface
  - [ ] Add `ColonyRateLimitTracker` interface
  - [ ] Add resource limit types

- [ ] Configure rate limits (`.polln-security.json`)
  ```json
  {
    "rateLimit": {
      "enablePerColony": true,
      "colonyRequestsPerMinute": 1000,
      "userRequestsPerMinute": 100,
      "burstLimit": 10,
      "windowMs": 60000
    }
  }
  ```

- [ ] Set environment variables
  ```bash
  export RATE_LIMIT_COLONY_RPM=1000
  export RATE_LIMIT_USER_RPM=100
  export RATE_LIMIT_BURST=10
  ```

### Testing Checklist

- [ ] Unit tests pass
  ```bash
  npm test -- src/api/__tests__/colony-rate-limit.test.ts
  ```

- [ ] Integration tests pass
  ```bash
  npm test -- src/api/__tests__/rate-limit-integration.test.ts
  ```

- [ ] Manual testing
  - [ ] Test colony-level limit enforcement
  - [ ] Test user-level limit enforcement
  - [ ] Test resource-specific limits
  - [ ] Test burst capacity
  - [ ] Test limit reset after window expires
  - [ ] Test per-colony isolation

---

## Task 4.8.3: Input Validation Enhancement

### Implementation

- [ ] Update `src/api/middleware.ts`
  - [ ] Add `ValidationConfig` interface
  - [ ] Enhance `validateMessage()` method
  - [ ] Add `sanitizePayload()` method
  - [ ] Add `sanitizeString()` method
  - [ ] Add `isValidKey()` method
  - [ ] Enhance `validateSubscription()` method
  - [ ] Enhance `validateCommand()` method
  - [ ] Enhance `validateQuery()` method

- [ ] Implement sanitization
  - [ ] Remove null bytes
  - [ ] Remove control characters
  - [ ] Check for dangerous patterns (script tags, SQL patterns, etc.)
  - [ ] Validate string lengths
  - [ ] Validate object keys (prevent proto pollution)

- [ ] Configure validation limits
  ```bash
  export VALIDATION_MAX_MESSAGE_AGE=300000
  export VALIDATION_MAX_PAYLOAD_SIZE=10485760
  export VALIDATION_MAX_STRING_LENGTH=10000
  ```

- [ ] Update message handling
  - [ ] Call `sanitizePayload()` in `validateMessage()`
  - [ ] Validate message timestamps
  - [ ] Validate message IDs format
  - [ ] Validate message types against whitelist

### Testing Checklist

- [ ] Unit tests for validation
  ```bash
  npm test -- src/api/__tests__/input-validation.test.ts
  ```

- [ ] Test injection attempts
  - [ ] SQL injection patterns
  - [ ] Command injection patterns
  - [ ] Script tag injection
  - [ ] Prototype pollution attempts
  - [ ] Oversized payloads
  - [ ] Malformed timestamps
  - [ ] Invalid message types

---

## Task 4.8.4: A2A Package Signing

### Implementation

- [ ] Generate signing keys for testing
  ```bash
  # Generate test key pair
  openssl genrsa -out test_private.pem 2048
  openssl rsa -in test_private.pem -pubout -out test_public.pem
  ```

- [ ] Update `src/core/communication.ts`
  - [ ] Add `KeyPair` interface
  - [ ] Add `SignedA2APackage` interface
  - [ ] Add `agentKeys: Map<string, KeyPair>` to class
  - [ ] Add `trustedPublicKeys: Map<string, string>` to class
  - [ ] Add `seenPackageSignatures: Set<string>` for replay protection
  - [ ] Add `generateAgentKeyPair()` method
  - [ ] Add `registerTrustedKey()` method
  - [ ] Add `revokeAgentKeys()` method
  - [ ] Add `createSignedPackage()` method
  - [ ] Add `signPackage()` private method
  - [ ] Add `createSigningPayload()` private method
  - [ ] Add `verifyPackage()` method
  - [ ] Add `receiveSignedPackage()` method
  - [ ] Add `cleanupOldSignatures()` method
  - [ ] Add `getPackageHash()` method

- [ ] Update agent initialization
  - [ ] Generate key pair on agent creation
  - [ ] Register public key with colony
  - [ ] Store private key securely

- [ ] Update package handling
  - [ ] Sign all outgoing packages
  - [ ] Verify all incoming packages
  - [ ] Reject packages with invalid signatures
  - [ ] Reject replayed packages

### Testing Checklist

- [ ] Unit tests for package signing
  ```bash
  npm test -- src/core/__tests__/a2a-signing.test.ts
  ```

- [ ] Integration tests
  ```bash
  npm test -- src/core/__tests__/communication-security.test.ts
  ```

- [ ] Manual testing
  - [ ] Create and verify signed package
  - [ ] Test with tampered package
  - [ ] Test with forged signature
  - [ ] Test replay attack prevention
  - [ ] Test key revocation
  - [ ] Test key rotation

---

## Task 4.8.5: Federated Sync Encryption

### Implementation

- [ ] Generate encryption key
  ```bash
  # Generate 32-byte encryption key (hex encoded)
  openssl rand -hex 32
  ```

- [ ] Set environment variables
  ```bash
  export FEDERATED_ENCRYPTION_KEY=<generated-key>
  export FEDERATED_ENCRYPTION_ENABLED=true
  export ENCRYPTION_ALGORITHM=aes-256-gcm
  export KEY_ROTATION_INTERVAL=2592000
  ```

- [ ] Update `src/core/kvfederated.ts`
  - [ ] Add `EncryptionConfig` interface
  - [ ] Add `EncryptedAnchorSyncPackage` interface
  - [ ] Add `colonyKeys: Map<string, Buffer>` to class
  - [ ] Add `masterKey: Buffer` to class
  - [ ] Add `deriveColonyKey()` method
  - [ ] Add `setColonyKey()` method
  - [ ] Add `encryptSyncPackage()` method
  - [ ] Add `decryptSyncPackage()` method
  - [ ] Add `signEncryptedPackage()` method
  - [ ] Add `verifyEncryptedPackage()` method
  - [ ] Add `prepareEncryptedAnchorsForSharing()` method
  - [ ] Add `receiveEncryptedAnchorsFromColony()` method
  - [ ] Add `rotateColonyKey()` method

- [ ] Implement key derivation
  - [ ] Use scrypt for key derivation
  - [ ] Derive colony-specific keys from master key
  - [ ] Cache derived keys

- [ ] Update sync protocol
  - [ ] Encrypt before sending
  - [ ] Decrypt after receiving
  - [ ] Verify signatures
  - [ ] Handle decryption failures gracefully

### Testing Checklist

- [ ] Unit tests for encryption
  ```bash
  npm test -- src/core/__tests__/federated-encryption.test.ts
  ```

- [ ] Integration tests
  ```bash
  npm test -- src/core/__tests__/federated-security.test.ts
  ```

- [ ] Manual testing
  - [ ] Test encryption/decryption cycle
  - [ ] Test with wrong key
  - [ ] Test signature verification
  - [ ] Test key rotation
  - [ ] Test colony key derivation
  - [ ] Performance test (encryption overhead)

---

## Task 4.8.6: Security Configuration

### Implementation

- [ ] Create `.polln-security.json` configuration file
  ```json
  {
    "auth": {
      "enableJWT": true,
      "jwtAlgorithm": "HS256",
      "accessTokenExpiry": 3600,
      "refreshTokenExpiry": 604800
    },
    "rateLimit": {
      "enablePerColony": true,
      "colonyRequestsPerMinute": 1000,
      "userRequestsPerMinute": 100,
      "burstLimit": 10,
      "windowMs": 60000
    },
    "encryption": {
      "enableFederatedEncryption": true,
      "algorithm": "aes-256-gcm",
      "keyRotationInterval": 2592000
    },
    "validation": {
      "maxMessageAge": 300000,
      "maxPayloadSize": 10485760,
      "maxStringLength": 10000,
      "sanitizeStrings": true
    },
    "websocket": {
      "enableTLS": true,
      "allowedOrigins": ["https://yourdomain.com"],
      "maxConnections": 1000,
      "maxConnectionsPerIP": 10
    },
    "audit": {
      "enableImmutableLogs": true,
      "logRetentionDays": 30,
      "sensitiveOperations": [
        "agent:spawn",
        "agent:despawn",
        "colony:create",
        "colony:delete",
        "auth:token:generate",
        "auth:token:revoke",
        "federation:sync"
      ]
    },
    "privacy": {
      "enforcePrivacyLevels": true,
      "defaultPrivacyTier": "COLONY",
      "enableDifferentialPrivacy": true
    },
    "federation": {
      "requireColonyAuth": true,
      "enableOutlierDetection": true,
      "maxAnchorsPerSync": 50
    }
  }
  ```

- [ ] Update `src/core/safety.ts`
  - [ ] Add `SecurityConfig` interface
  - [ ] Implement `SecurityConfigManager` class
  - [ ] Add `loadConfig()` method
  - [ ] Add `validateConfig()` method
  - [ ] Add `getConfig()` method
  - [ ] Add `getSection()` method
  - [ ] Add `updateSection()` method
  - [ ] Add `saveConfig()` method
  - [ ] Add `deepMerge()` helper method

- [ ] Create environment variable template
  - [ ] Create `.env.example` file
  - [ ] Document all security-related environment variables
  - [ ] Include generation commands for secrets

- [ ] Add configuration validation
  - [ ] Validate JWT secret when JWT enabled
  - [ ] Validate encryption key when encryption enabled
  - [ ] Validate rate limit relationships
  - [ ] Validate origin URLs
  - [ ] Validate log paths

### Testing Checklist

- [ ] Unit tests for configuration
  ```bash
  npm test -- src/core/__tests__/security-config.test.ts
  ```

- [ ] Test configuration loading
  - [ ] Load from file
  - [ ] Override with environment variables
  - [ ] Validate configuration
  - [ ] Test invalid configuration rejection
  - [ ] Test default values

---

## Task 4.8.7: Audit Logging Enhancement

### Implementation

- [ ] Update `src/core/safety.ts`
  - [ ] Add `AuditLogConfig` interface
  - [ ] Add `EnhancedAuditLogger` class
  - [ ] Add immutable audit log support
  - [ ] Add `createImmutableEntry()` method
  - [ ] Add `verifyLogIntegrity()` method
  - [ ] Add `query()` method for filtering
  - [ ] Add `getStatistics()` method
  - [ ] Add `export()` method
  - [ ] Add `loadLogs()` method
  - [ ] Add `appendToFile()` method
  - [ ] Add `cleanupOldLogs()` method

- [ ] Set up audit logging
  ```bash
  export AUDIT_LOG_PATH=/var/log/polln/audit.log
  export AUDIT_LOG_RETENTION_DAYS=30
  export AUDIT_LOG_LEVEL=info
  ```

- [ ] Implement log signing
  - [ ] Generate signing key pair
  - [ ] Sign each log entry
  - [ ] Maintain hash chain
  - [ ] Verify log integrity

- [ ] Add audit logging to critical operations
  - [ ] Agent spawn/despawn
  - [ ] Colony create/delete
  - [ ] Token generation/revocation
  - [ ] Federation sync
  - [ ] Security violations

### Testing Checklist

- [ ] Unit tests for audit logging
  ```bash
  npm test -- src/core/__tests__/audit-logging.test.ts
  ```

- [ ] Test log integrity
  - [ ] Verify hash chain
  - [ ] Verify signatures
  - [ ] Detect tampering
  - [ ] Test log query
  - [ ] Test log export
  - [ ] Test log cleanup

---

## Task 4.8.8: Security Best Practices

### Documentation

- [ ] Create `docs/SECURITY_BEST_PRACTICES.md`
  - [ ] Developer security guidelines
  - [ ] Operator security guidelines
  - [ ] Code review checklist
  - [ ] Common pitfalls
  - [ ] Testing security
  - [ ] Resources and references

- [ ] Add security section to main README
  - [ ] Link to security documentation
  - [ ] Security feature overview
  - [ ] Quick setup guide
  - [ ] Reporting security issues

- [ ] Create security runbook
  - [ ] Incident response procedures
  - [ ] Key rotation procedures
  - [ ] Monitoring and alerting
  - [ ] Escalation matrix

- [ ] Document threat model
  - [ ] External threats
  - [ ] Internal threats
  - [ ] Attack scenarios
  - [ ] Mitigation strategies

### Training

- [ ] Security training for developers
  - [ ] OWASP Top 10 awareness
  - [ ] Secure coding practices
  - [ ] Common vulnerabilities
  - [ ] Tooling and resources

- [ ] Security training for operators
  - [ ] Environment configuration
  - [ ] Key management
  - [ ] Monitoring and alerting
  - [ ] Incident response

---

## Post-Implementation

### Security Testing

- [ ] Run vulnerability scanner
  ```bash
  npm audit
  ```

- [ ] Run static analysis
  ```bash
  npm run lint:security
  ```

- [ ] Perform penetration testing
  - [ ] WebSocket API
  - [ ] A2A communication
  - [ ] Federated sync
  - [ ] Authentication/authorization

- [ ] Security code review
  - [ ] Review all authentication code
  - [ ] Review all encryption code
  - [ ] Review all validation code
  - [ ] Review audit logging

### Documentation

- [ ] Update API documentation with security features
- [ ] Add security section to CONTRIBUTING.md
- [ ] Document security configuration options
- [ ] Create security FAQ
- [ ] Document incident response procedures

### Deployment

- [ ] Staging deployment
  - [ ] Deploy to staging environment
  - [ ] Run security tests
  - [ ] Monitor for issues
  - [ ] Get security team sign-off

- [ ] Production deployment
  - [ ] Schedule deployment window
  - [ ] Prepare rollback plan
  - [ ] Deploy with monitoring
  - [ ] Verify security measures
  - [ ] Document deployment

### Monitoring

- [ ] Set up security monitoring
  - [ ] Failed authentication alerts
  - [ ] Rate limit alerts
  - [ ] Encryption failure alerts
  - [ ] Anomaly detection

- [ ] Create security dashboards
  - [ ] Authentication success/failure rates
  - [ ] Rate limit violations
  - [ ] Encryption/decryption metrics
  - [ ] Audit log statistics

---

## Verification Checklist

### Before Sign-Off

- [ ] All code changes reviewed
- [ ] All tests passing
- [ ] Security tests passing
- [ ] Documentation updated
- [ ] Configuration files created
- [ ] Environment variables documented
- [ ] Keys generated securely
- [ ] Staging deployment successful
- [ ] Monitoring configured
- [ ] Incident response procedures documented

### Security Sign-Off

- [ ] Lead developer approval
- [ ] Security team review (if available)
- [ ] penetration testing completed
- [ ] Vulnerability scan clean
- [ ] Dependencies up-to-date
- [ ] Known risks documented and accepted

---

## Maintenance

### Regular Tasks

**Daily:**
- [ ] Review security alerts
- [ ] Check audit logs for anomalies

**Weekly:**
- [ ] Review failed authentication attempts
- [ ] Check rate limit violations
- [ ] Review security metrics

**Monthly:**
- [ ] Rotate encryption keys (if configured)
- [ ] Review and update security configs
- [ ] Update dependencies
- [ ] Review audit log retention

**Quarterly:**
- [ ] Security audit review
- [ ] Penetration testing
- [ ] Security training refresh
- [ ] Threat model update

---

## Troubleshooting

### Common Issues

**JWT Authentication Fails:**
```bash
# Check JWT_SECRET is set
echo $JWT_SECRET

# Verify token format
# Decode at: https://jwt.io/

# Check token expiration
# Make sure system time is correct
```

**Rate Limiting Too Aggressive:**
```bash
# Check current limits
npm run cli -- rate-limit:stats

# Adjust in .polln-security.json
# or set environment variables
export RATE_LIMIT_USER_RPM=200
```

**Encryption Failures:**
```bash
# Verify encryption key format
# Should be 64 hex characters (32 bytes)
echo $FEDERATED_ENCRYPTION_KEY | wc -c

# Regenerate if needed
openssl rand -hex 32
```

**Audit Log Issues:**
```bash
# Check log file permissions
ls -la /var/log/polln/audit.log

# Verify disk space
df -h /var/log/polln/

# Test log integrity
npm run cli -- audit:verify
```

---

## Resources

### Internal Documentation
- `docs/SECURITY_AUDIT.md` - Comprehensive security audit
- `docs/SECURITY_IMPLEMENTATION.md` - Implementation guide
- `docs/SECURITY_BEST_PRACTICES.md` - Best practices guide
- `src/api/README.md` - API documentation
- `CLAUDE.md` - Project overview

### External Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Node.js Security Guide](https://nodejs.org/en/docs/guides/security/)
- [WebSocket Security](https://tools.ietf.org/html/rfc6455#section-10)
- [TLS Configuration](https://wiki.mozilla.org/Security/Server_Side_TLS)

### Tools
- `npm audit` - Dependency vulnerability scanner
- `snyk` - Additional vulnerability scanning
- `eslint-plugin-security` - Code security linting
- `jest` - Security unit testing
- `supertest` - API security testing

---

## Support

### Reporting Security Issues

If you discover a security vulnerability, please:

1. **DO NOT** create a public issue
2. **DO** email: security@polln.ai (or configured security email)
3. **INCLUDE** details about the vulnerability
4. **ALLOW** time for the issue to be addressed

### Security Contact

- **Security Lead:** [Name/Email]
- **Engineering Lead:** [Name/Email]
- **Security Team:** [Email/Slack]

---

*Checklist Version: 1.0*
*Last Updated: 2026-03-07*
*Status: Active*
