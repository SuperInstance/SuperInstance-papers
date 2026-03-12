# SuperInstance Security Architecture

## Overview

This document outlines production-ready security patterns for SuperInstance deployment on Cloudflare, including authentication (OAuth, JWT, API keys), authorization (RBAC, ABAC), data encryption (at rest, in transit), and audit logging.

---

## 1. Authentication Architecture

### 1.1 Multi-Method Authentication

```
┌──────────────────────────────────────────────────────────────┐
│                    Authentication Layer                       │
├─────────────────┬────────────────┬───────────────────────────┤
│    OAuth 2.0    │     JWT        │      API Keys             │
│   (Web Users)   │  (Internal)    │   (Third-party)          │
├─────────────────┼────────────────┼───────────────────────────┤
│ Authorization   │    State       │     HMAC SHA-256         │
│    Code Flow    │    Validation  │   + Rate Limiting        │
├─────────────────┼────────────────┼───────────────────────────┤
│      OIDC       │    JWT Verify  │   Rotating Keys          │
│  + PKCE         │    + Refresh   │   + Audit Trail          │
└─────────────────┴────────────────┴───────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐    ┌──────────────┐
                    │   Session    │────│  Federation  │
                    │  Management  │    │   Token      │
                    └──────────────┘    │   Exchange   │
                                        └──────────────┘
```

### 1.2 OAuth 2.0 with PKCE Implementation

```typescript
// OAuth 2.0 Authorization with PKCE
export class OAuthProvider {
  private codeVerifiers: Map<string, string>;
  private providers: Map<string, ProviderConfig>;

  constructor(private env: Env) {
    this.codeVerifiers = new Map();
    this.providers = new Map([
      ['google', GOOGLE_CONFIG],
      ['github', GITHUB_CONFIG],
      ['microsoft', AZURE_CONFIG]
    ]);
  }

  async initiateAuth(
    provider: string,
    redirectUri: string,
    state: string
  ): Promise<AuthSession> {
    // Generate PKCE verifier and challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const codeChallengeMethod = 'S256';

    // Store verifier for later validation
    const sessionId = crypto.randomUUID();
    this.codeVerifiers.set(sessionId, codeVerifier);

    // Build authorization URL
    const providerConfig = this.providers.get(provider);
    const authUrl = new URL(providerConfig.authorizationEndpoint);

    authUrl.searchParams.set('client_id', providerConfig.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
    authUrl.searchParams.set('nonce', crypto.randomUUID());

    return {
      authUrl: authUrl.toString(),
      sessionId,
      expiresAt: Date.now() + 600000 // 10 minutes
    };
  }

  async completeAuth(
    code: string,
    sessionId: string,
    redirectUri: string
  ): Promise<UserSession> {
    // Validate PKCE verifier
    const codeVerifier = this.codeVerifiers.get(sessionId);
    if (!codeVerifier) {
      throw new Error('Invalid or expired session');
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCode(code, codeVerifier, redirectUri);

    // Validate ID token
    const userInfo = await this.validateIdToken(tokens.idToken);

    // Create session
    const sessionToken = crypto.randomUUID();
    await this.storeSession(sessionToken, {
      userId: userInfo.sub,
      email: userInfo.email,
      provider: userInfo.provider,
      accessToken: this.encrypt(tokens.accessToken),
      refreshToken: this.encrypt(tokens.refreshToken),
      expiresAt: Date.now() + (tokens.expiresIn * 1000)
    });

    // Clean up
    this.codeVerifiers.delete(sessionId);

    return {
      token: sessionToken,
      user: userInfo,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);

    return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private async exchangeCode(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<TokenResponse> {
    const response = await fetch(providerConfig.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${providerConfig.clientId}:${providerConfig.clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// Provider configurations with minimal privileges
const GOOGLE_CONFIG: ProviderConfig = {
  name: 'google',
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  scopes: ['openid', 'email', 'profile'],
  responseType: 'code'
};
```

### 1.3 JWT Token Management

```typescript
// JWT Token Service with Rotation
export class JWTService {
  private secretKey: CryptoKey;
  private refreshKey: CryptoKey;

  constructor(private env: Env) {
    this.initializeKeys();
  }

  public async generateTokens(payload: TokenPayload): Promise<TokenSet> {
    const now = Math.floor(Date.now() / 1000);
    const sessionId = crypto.randomUUID();

    // Access token
    const accessToken = await this.createJWT({
      ...payload,
      type: 'access',
      sessionId,
      iat: now,
      exp: now + (15 * 60), // 15 minutes
      jti: crypto.randomUUID()
    });

    // Refresh token
    const refreshToken = await this.createJWT({
      sub: payload.sub,
      type: 'refresh',
      sessionId,
      iat: now,
      exp: now + (7 * 24 * 60 * 60), // 7 days
      jti: crypto.randomUUID()
    });

    // Store session info
    await this.storeSession(sessionId, {
      userId: payload.sub,
      accessTokenId: this.getTokenId(accessToken),
      refreshTokenId: this.getTokenId(refreshToken),
      created: now,
      lastAccessed: now
    });

    return { accessToken, refreshToken, sessionId };
  }

  private async createJWT(payload: any): Promise<string> {
    const header = {
      alg: 'ES256',
      kid: await this.getKeyId(),
      typ: 'JWT'
    };

    const headerBase64 = btoa(JSON.stringify(header));
    const payloadBase64 = btoa(JSON.stringify(payload));

    const signingInput = `${headerBase64}.${payloadBase64}`;

    // Sign with ES256
    const signature = await this.sign(signingInput);
    const signatureBase64 = btoa(signature);

    return `${headerBase64}.${payloadBase64}.${signatureBase64}`;
  }

  public async validateToken(token: string): Promise<TokenValidation> {
    try {
      const [headerB64, payloadB64, signatureB64] = token.split('.');

      // Decode and validate structure
      const header = JSON.parse(atob(headerB64));
      const payload = JSON.parse(atob(payloadB64));

      // Check algorithm
      if (header.alg !== 'ES256') {
        throw new Error('Invalid algorithm');
      }

      // Verify signature
      const isValid = await this.verifySignature(token);
      if (!isValid) {
        throw new Error('Invalid signature');
      }

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }

      // Check revocation
      const isRevoked = await this.isTokenRevoked(payload.jti);
      if (isRevoked) {
        throw new Error('Token revoked');
      }

      // Update last accessed
      if (payload.sessionId) {
        await this.updateSessionAccess(payload.sessionId);
      }

      return {
        valid: true,
        payload
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  public async revokeToken(tokenId: string): Promise<void> {
    // Add to revocation list
    await this.env.REVOCATED_TOKENS.put(tokenId, String(Date.now()), {
      expirationTtl: 60 * 60 * 24 * 7 // 7 days TTL
    });

    // Revoke entire session if refresh token
    const token = await this.env.REVOCATED_TOKENS.get(tokenId);
    if (token) {
      const sessionInfo = await this.getSessionInfo(token.sessionId);
      if (sessionInfo) {
        // Revoke all tokens for the session
        await this.revokeSession(sessionInfo.sessionId);
      }
    }
  }

  private async isTokenRevoked(tokenId: string): Promise<boolean> {
    const revoked = await this.env.REVOCATED_TOKENS.get(tokenId);
    return revoked !== null;
  }
}

// Token metadata for enhanced security
type TokenMetadata = {
  created: number;
  ip: string;
  userAgent: string;
  lastAccessed: number;
  accessCount: number;
};
```

---

## 2. Authorization Architecture

### 2.1 Role-Based Access Control (RBAC)

```typescript
// Hierarchical RBAC System
export class RBACManager {
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission> = new Map();

  constructor(private env: Env) {
    this.initializeDefaultRoles();
  }

  private initializeDefaultRoles(): void {
    // System roles with inheritance
    this.roles.set('system:admin', {
      id: 'system:admin',
      name: 'System Administrator',
      permissions: ['*'],
      inherits: ['system:moderator', 'system:developer']
    });

    this.roles.set('system:moderator', {
      id: 'system:moderator',
      name: 'System Moderator',
      permissions: [
        'colony.manage',
        'user.manage',
        'audit.view',
        'system.monitor'
      ],
      inherits: ['system:user']
    });

    this.roles.set('system:developer', {
      id: 'system:developer',
      name: 'System Developer',
      permissions: [
        'colony.create',
        'colony.config',
        'api.access',
        'plugin.install'
      ]
    });

    // Colony-specific roles
    this.roles.set('colony:owner', {
      id: 'colony:owner',
      name: 'Colony Owner',
      permissions: [
        'colony.admin',
        'colony.delete'
      ],
      scope: 'colony'
    });

    this.roles.set('colony:operator', {
      id: 'colony:operator',
      name: 'Colony Operator',
      permissions: [
        'colony.agent.create',
        'colony.agent.delete',
        'colony.agent.configure',
        'colony.tile.execute'
      ],
      scope: 'colony'
    });

    this.roles.set('colony:readonly', {
      id: 'colony:readonly',
      name: 'Colony Viewer',
      permissions: [
        'colony.view',
        'colony.logs.read',
        'colony.metrics.read'
      ],
      scope: 'colony'
    });
  }

  async assignRole(
    userId: string,
    roleId: string,
    scope?: AuthScope
  ): Promise<void> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role not found: ${roleId}`);
    }

    // Validate role scope
    if (role.scope && scope?.type !== role.scope) {
      throw new Error('Role scope mismatch');
    }

    // Check authorization
    const assignerRole = await this.getUserRole(scope.assignerId);
    if (assignerRole.priority < role.priority) {
      throw new Error('Insufficient privileges to assign role');
    }

    // Perform assignment
    const assignment: RoleAssignment = {
      userId,
      roleId,
      scope,
      assignedBy: scope.assignerId,
      assignedAt: Date.now(),
      expiresAt: scope.expiresAt
    };

    await this.storeAssignment(assignment);

    // Audit log
    await this.auditLog({
      action: 'role.assigned',
      userId,
      targetId: roleId,
      scope,
      timestamp: Date.now()
    });
  }

  async checkPermission(
    userId: string,
    permission: string,
    resource: Resource
  ): Promise<AuthorizationResult> {
    try {
      // Get user's effective permissions
      const permissions = await this.getEffectivePermissions(userId, resource);

      // Check explicit permission
      if (permissions.includes('*')) {
        return { allowed: true, reason: 'Wildcard permission' };
      }

      if (permissions.includes(permission)) {
        return { allowed: true, reason: 'Direct permission' };
      }

      // Check pattern-based permissions
      const generalizedPermission = this.generalizePermission(permission);
      if (permissions.includes(generalizedPermission)) {
        return { allowed: true, reason: 'Pattern permission' };
      }

      return {
        allowed: false,
        reason: 'Permission not granted',
        missingPermission: permission
      };
    } catch (error) {
      return {
        allowed: false,
        reason: error.message
      };
    }
  }

  private async getEffectivePermissions(
    userId: string,
    resource: Resource
  ): Promise<string[]> {
    const permissions: Set<string> = new Set();

    // Get all role assignments for user
    const assignments = await this.getUserAssignments(userId);

    for (const assignment of assignments) {
      // Check scope validity
      if (!this.isScopeValid(assignment.scope, resource)) {
        continue;
      }

      // Get role permissions
      const role = this.roles.get(assignment.roleId);
      if (!role) continue;

      // Process role permissions
      for (const permission of role.permissions) {
        permissions.add(this.resolveScopedPermission(permission, assignment.scope));
      }

      // Process inherited roles
      if (role.inherits) {
        const inheritedPermissions = await this.getInheritedPermissions(role.inherits, assignment.scope);
        inheritedPermissions.forEach(p => permissions.add(p));
      }
    }

    return Array.from(permissions);
  }

  private isScopeValid(scope: AuthScope, resource: Resource): boolean {
    // Validate time-based scope
    if (scope.expiresAt && Date.now() > scope.expiresAt) {
      return false;
    }

    // Validate resource-based scope
    if (scope.colonyId && scope.colonyId !== resource.colonyId) {
      return false;
    }

    // Validate federation scope
    if (scope.federationId && scope.federationId !== resource.federationId) {
      return false;
    }

    return true;
  }
}
```

### 2.2 Attribute-Based Access Control (ABAC)

```typescript
// Dynamic ABAC Engine
export class ABACManager {
  private policies: Policy[] = [];
  private attributeProviders: Map<string, AttributeProvider> = new Map();

  constructor(private env: Env) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // User attributes
    this.attributeProviders.set('user', new UserAttributeProvider());

    // Resource attributes
    this.attributeProviders.set('resource', new ResourceAttributeProvider());

    // Time-based attributes
    this.attributeProviders.set('time', new TimeAttributeProvider());

    // Sensitivity attributes
    this.attributeProviders.set('data', new DataAttributeProvider());
  }

  async evaluateRequest(request: AccessRequest): Promise<AuthorizationResult> {
    try {
      // Collect all relevant attributes
      const attributes = await this.collectAttributes(request);

      // Load applicable policies
      const policies = await this.getApplicablePolicies(attributes);

      // Evaluate policies
      let decision = 'deny';
      let policyResults: PolicyResult[] = [];

      for (const policy of policies) {
        const result = await this.evaluatePolicy(policy, attributes);
        policyResults.push(result);

        // Handle permit-unless-deny
        if (policy.effect === 'permit' && result.match) {
          decision = 'permit';
        }

        // Handle deny overrides
        if (policy.effect === 'deny' && result.match) {
          decision = 'deny';
          break; // Deny overrides
        }
      }

      return {
        allowed: decision === 'permit',
        reason: `ABAC decision: ${decision}`,
        attributes,
        policyResults
      };

    } catch (error) {
      return {
        allowed: false,
        reason: 'ABAC evaluation failed',
        error: error.message
      };
    }
  }

  private async collectAttributes(request: AccessRequest): Promise<Attributes> {
    const attributes: Attributes = {
      subject: {},
      resource: {},
      action: {},
      environment: {}
    };

    // Dynamically collect attributes from providers
    for (const [providerType, provider] of this.attributeProviders) {
      const providerAttrs = await provider.getAttributes(request);

      switch (providerType) {
        case 'user':
          attributes.subject = { ...attributes.subject, ...providerAttrs };
          break;
        case 'resource':
          attributes.resource = { ...attributes.resource, ...providerAttrs };
          break;
        case 'time':
        case 'data':
          attributes.environment = {
            ...attributes.environment,
            ...providerAttrs
          };
          break;
      }
    }

    return attributes;
  }

  private async evaluatePolicy(
    policy: Policy,
    attributes: Attributes
  ): Promise<PolicyResult> {
    const ruleGroups = policy.target?.concat(policy.condition ? [policy.condition] : []) || [];

    // Evaluate each rule group
    const results = await Promise.all(
      ruleGroups.map(group => this.evaluateRuleGroup(group, attributes))
    );

    // Combine results based on policy combining algorithm
    const match = this.combineRuleResults(results, policy.ruleCombiningAlgorithm);

    return {
      policyId: policy.id,
      match,
      decision: match ? policy.effect : 'not-applicable',
      reason: match ? 'Policy rules matched' : 'Policy rules did not match'
    };
  }

  private async evaluateRuleGroup(
    ruleGroup: RuleGroup,
    attributes: Attributes
  ): Promise<boolean> {
    // Evaluate rules
    const ruleResults = await Promise.all(
      ruleGroup.rules.map(rule => this.evaluateRule(rule, attributes))
    );

    // Combine based on group combining algorithm
    if (ruleGroup.combiningAlgorithm === 'all-of') {
      return ruleResults.every(result => result);
    } else if (ruleGroup.combiningAlgorithm === 'any-of') {
      return ruleResults.some(result => result);
    } else if (ruleGroup.combiningAlgorithm === 'one-of') {
      return ruleResults.filter(Boolean).length === 1;
    }

    return false;
  }

  private async evaluateRule(
    rule: Rule,
    attributes: Attributes
  ): Promise<boolean> {
    // Evaluate condition
    const result = await this.evaluateCondition(rule.condition, attributes);

    // Apply rule effect
    return rule.effect === 'permit' ? result : !result;
  }

  private async evaluateCondition(
    condition: Condition,
    attributes: Attributes
  ): Promise<boolean> {
    // Support complex condition types
    switch (condition.type) {
      case 'comparison':
        return this.evaluateComparison(condition, attributes);

      case 'regex':
        return this.evaluateRegex(condition, attributes);

      case 'range':
        return this.evaluateRange(condition, attributes);

      case 'geoip':
        return await this.evaluateGeoIP(condition, attributes);

      case 'risk_score':
        return await this.evaluateRiskScore(condition, attributes);

      case 'compound':
        return await this.evaluateCompound(condition, attributes);

      default:
        console.warn(`Unknown condition type: ${condition.type}`);
        return false;
    }
  }
}

// Example ABAC Policy
const examplePolicy: Policy = {
  id: 'policy:colony:access',
  version: '1.0',
  effect: 'permit',
  description: 'Allow colony access based on attributes',
  target: [
    {
      type: 'resource',
      attribute: 'type',
      operator: 'equals',
      value: 'colony'
    },
    {
      type: 'action',
      attribute: 'type',
      operator: 'equals',
      value: 'read'
    }
  ],
  condition: {
    type: 'compound',
    operator: 'and',
    arguments: [
      {
        type: 'comparison',
        attribute: 'subject.department',
        operator: 'equals',
        value: 'data-science'
      },
      {
        type: 'range',
        attribute: 'environment.time',
        min: '09:00',
        max: '18:00'
      },
      {
        type: 'geoip',
        attribute: 'subject.ip',
        country: ['US', 'CA', 'GB']
      }
    ]
  },
  obligations: [
    {
      type: 'log',
      level: 'info',
      message: 'Colony access granted based on ABAC'
    },
    {
      type: 'audit',
      fields: ['subject.id', 'resource.id', 'environment.time']
    }
  ]
};
```

---

## 3. Encryption Architecture

### 3.1 Data Encryption at Rest

```typescript
// Application-Level Encryption
export class EncryptionManager {
  private masterKey: CryptoKey;
  private dataKeys: Map<string, DataKey> = new Map();

  constructor(private env: Env) {
    this.initializeKeyManagement();
  }

  private async initializeKeyManagement(): Promise<void> {
    // Initialize master key from HSM or KMS
    this.masterKey = await this.unwrapMasterKey(this.env.MASTER_KEY);

    // Set up key rotation schedule
    this.scheduleKeyRotation();
  }

  async encryptData(
    data: Uint8Array,
    context: EncryptionContext
  ): Promise<EncryptedData> {
    // Generate data encryption key (DEK)
    const dek = await this.generateDataKey();

    // Encrypt data with DEK
    const encryptedData = await this.symmetricEncrypt(data, dek);

    // Wrap DEK with master key (KEK)
    const wrappedDek = await this.wrapKey(dek, this.masterKey);

    // Store encryption metadata
    const metadata: EncryptionMetadata = {
      dekId: dek.id,
      wrappedDek,
      algorithm: 'AES256-GCM',
      iv: encryptedData.iv,
      keyEncryption: {
        algorithm: 'RSA-OAEP',
        keyId: await this.getMasterKeyId()
      }
    };

    // Audit encryption
    await this.auditEncryption(metadata, context);

    return {
      ciphertext: encryptedData.ciphertext,
      metadata
    };
  }

  async decryptData(
    encryptedData: EncryptedData,
    context: DecryptionContext
  ): Promise<Uint8Array> {
    // Unwrap DEK
    const dek = await this.unwrapKey(
      encryptedData.metadata.wrappedDek,
      this.masterKey
    );

    // Verify key version
    if (!await this.isKeyValid(dek.id)) {
      throw new Error('Invalid or revoked encryption key');
    }

    // Decrypt data
    const plaintext = await this.symmetricDecrypt({
      ciphertext: encryptedData.ciphertext,
      iv: encryptedData.metadata.iv
    }, dek);

    // Audit decryption
    await this.auditDecryption(encryptedData.metadata, context);

    return plaintext;
  }

  private async symmetricEncrypt(
    data: Uint8Array,
    key: CryptoKey
  ): Promise<SymmetricEncryptionResult> {
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // PKCS#7 padding
    const paddedData = this.addPKCS7Padding(data);

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      key,
      paddedData
    );

    return {
      ciphertext: new Uint8Array(ciphertext),
      iv: iv
    };
  }

  private async wrapKey(
    key: CryptoKey,
    wrappingKey: CryptoKey
  ): Promise<WrappedKey> {
    const exported = await crypto.subtle.exportKey('raw', key);

    const wrapped = await crypto.subtle.wrapKey(
      'raw',
      key,
      wrappingKey,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      }
    );

    return {
      data: new Uint8Array(wrapped),
      wrapped: true,
      algorithm: 'RSA-OAEP-Sha256'
    };
  }

  private async generateDataKey(): Promise<DataKey> {
    const keyData = crypto.getRandomValues(new Uint8Array(32));

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );

    return {
      id: crypto.randomUUID(),
      key,
      created: Date.now(),
      version: 1
    };
  }

  private scheduleKeyRotation(): void {
    // Rotate DEKs every 30 days
    const rotationInterval = 30 * 24 * 60 * 60 * 1000;

    setInterval(async () => {
      try {
        await this.rotateDataKeys();
        console.log('Data keys rotated successfully');
      } catch (error) {
        console.error('Key rotation failed:', error);
        await this.notifySecurityTeam('Key rotation failure', error);
      }
    }, rotationInterval);
  }

  private async rotateDataKeys(): Promise<void> {
    // Collect data encrypted with old keys
    const encryptedData = await this.findEncryptedDataWithOldKeys();

    for (const data of encryptedData) {
      try {
        // Decrypt with old key
        const plaintext = await this.decryptData(data.encrypted, data.context);

        // Re-encrypt with new key
        const reEncrypted = await this.encryptData(plaintext, data.context);

        // Update storage
        await this.updateEncryptedData(data.id, reEncrypted);

        // Audit re-encryption
        await this.auditReencryption({
          oldKeyId: data.metadata.dekId,
          newKeyId: reEncrypted.metadata.dekId
        });

      } catch (error) {
        console.error(`Failed to re-encrypt data ${data.id}:`, error);
        await this.notifySecurityTeam('Re-encryption failure', { dataId: data.id, error });
      }
    }
  }
}
```

### 3.2 Transport Security

```typescript
// TLS Configuration Service
export class TransportSecurityService {
  private certManager: CertificateManager;
  private mtlsConfig: MTLSConfig;

  async configureHTTPS(hostname: string): Promise<HTTPSConfig> {
    // Get or generate certificate
    const cert = await this.certManager.getCertificate(hostname);

    // Configure TLS 1.3 only (most secure)
    const config: HTTPSConfig = {
      certificate: cert.cert,
      privateKey: cert.key,
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3',
      cipherSuites: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256'
      ],
      curve: 'P-384', // secp384r1
      requireClientCert: false,
      sessionTickets: false,
      stapling: true,
      staplingCheck: true
    };

    // Enable OCSP stapling
    const ocspResponse = await this.generateOCSPResponse(cert);
    if (ocspResponse) {
      config.ocspResponse = ocspResponse;
    }

    // Configure HSTS
    config.hsts = {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    };

    return config;
  }

  async configureMTLS(): Promise<MTLSConfig> {
    const caCert = await this.getCACertificate();
    const serverCert = await this.getServerCertificate();
    const serverKey = await this.getServerPrivateKey();

    return {
      ca: [caCert],
      cert: serverCert,
      key: serverKey,
      requestCert: true,
      rejectUnauthorized: true,
      // Support SNI
      servername: async (servername, cert) => {
        return await this.selectCertificate(servername);
      }
    };
  }

  // Certificate pinning
  async createPinningConfiguration(hostname: string): Promise<PinConfig> {
    const cert = await this.certManager.getCertificate(hostname);
    const publicKey = await this.extractPublicKey(cert);

    const pin = crypto.createHash('sha256').update(publicKey).digest('base64');

    return {
      'max-age': 2592000, // 30 days
      pin: `pin-sha256="${pin}"`,
      includeSubDomains: true,
      reportUri: 'https://security.superinstance.ai/csp-violation',
      reportOnly: false
    };
  }
}
```

---

## 4. Audit and Compliance

### 4.1 Comprehensive Audit Logging

```typescript
// Audit Event Manager
export class AuditManager {
  private eventQueue: Queue;
  private retentionPolicy: RetentionPolicy;

  constructor(private env: Env) {
    this.eventQueue = new Queue('audit-events');
    this.retentionPolicy = {
      critical: Duration.days(2555), // 7 years
      security: Duration.days(2190), // 6 years
      operational: Duration.days(730), // 2 years
      informational: Duration.days(90) // 90 days
    };
  }

  async logSecurityEvent(event: SecurityEvent): Promise<string> {
    const auditEvent: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      eventType: event.type,
      severity: event.severity,
      actor: event.actor,
      resource: event.resource,
      action: event.action,
      result: event.result,
      metadata: {
        ...event.metadata,
        correlationId: event.correlationId || crypto.randomUUID(),
        sessionId: event.sessionId,
        ipAddress: event.clientInfo?.ip,
        userAgent: event.clientInfo?.userAgent,
        location: event.clientInfo?.location
      },
      integrity: {
        hash: await this.calculateIntegrityHash(event),
        previousHash: await this.getPreviousHash(this.getPartitionKey(event.timestamp)),
        signature: await this.signEvent(event, this.env.AUDIT_KEY)
      }
    };

    // Verify compliance
    const complianceCheck = await this.verifyCompliance(event);
    if (!complianceCheck.passed) {
      await this.handleComplianceViolation(event, complianceCheck);
    }

    // Store event
    await this.storeEvent(auditEvent);

    // Process in real-time
    if (event.severity === 'critical' || event.type === 'security.breach') {
      await this.processImmediately(auditEvent);
    } else {
      await this.eventQueue.send(auditEvent);
    }

    return auditEvent.id;
  }

  private async storeEvent(event: AuditEvent): Promise<void> {
    const partitionKey = this.getPartitionKey(event.timestamp);
    const retention = this.retentionPolicy[event.severity];

    // Store in D1 with partitioning
    await this.env.AUDIT_DB.prepare(`
      INSERT INTO audit_logs (partition_id, event_id, timestamp, event_type, severity, actor_id, resource_id, action, result, metadata, integrity_hash, previous_hash, signature, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      partitionKey,
      event.id,
      event.timestamp,
      event.eventType,
      event.severity,
      event.actor?.id,
      event.resource?.id,
      event.action,
      event.result,
      JSON.stringify(event.metadata),
      event.integrity.hash,
      event.integrity.previousHash,
      event.integrity.signature,
      Date.now() + retention
    ).run();

    // Index for search
    await this.indexAuditEvent(event);

    // Archive to R2 for long-term storage
    if (event.severity === 'critical' || event.severity === 'security') {
      await this.archiveToR2(event);
    }
  }

  private async processImmediately(event: AuditEvent): Promise<void> {
    // Send alert for critical events
    if (event.severity === 'critical') {
      await this.sendSecurityAlert(event);
    }

    // Check for patterns
    const pattern = await this.detectPattern(event);
    if (pattern.suspicious) {
      await this.handleSuspiciousPattern(event, pattern);
    }

    // Take preventive actions
    const actions = await this.getPreventiveActions(event);
    await this.executeActions(actions);
  }

  // Tamper-proof audit chain
  async verifyAuditChain(partition: string): Promise<ChainVerification> {
    const events = await this.getChain(partition);

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const previous = events[i - 1];

      // Verify integrity hash
      const expectedHash = await this.calculateIntegrityHash(event);
      if (event.integrity.hash !== expectedHash) {
        return {
          valid: false,
          error: `Integrity hash mismatch at position ${i}`,
          position: i
        };
      }

      // Verify chain link
      if (previous && event.integrity.previousHash !== previous.integrity.hash) {
        return {
          valid: false,
          error: `Chain link broken at position ${i}`,
          position: i
        };
      }

      // Verify signature
      const valid = await this.verifySignature(event, this.env.AUDIT_KEY);
      if (!valid) {
        return {
          valid: false,
          error: `Invalid signature at position ${i}`,
          position: i
        };
      }
    }

    return { valid: true };
  }

  // Compliance reporting
  async generateComplianceReport(
    standard: ComplianceStandard,
    period: ReportPeriod
  ): Promise<ComplianceReport> {
    const requirements = this.getRequirements(standard);
    const findings = [];

    for (const requirement of requirements) {
      const events = await this.queryAuditEvents({
        filters: requirement.filters,
        period,
        fields: requirement.requiredFields
      });

      const validation = await requirement.validate(events);
      if (!validation.passed) {
        findings.push({
          requirementId: requirement.id,
          severity: validation.severity,
          description: validation.description,
          evidence: events
        });
      }
    }

    return {
      standard,
      period,
      findings,
      overallCompliance: findings.length === 0 ? 'compliant' : 'non-compliant',
      recommendations: this.generateRecommendations(findings)
    };
  }
}
```

### 4.2 Real-time Security Monitoring

```typescript
// Security Operations Center (SOC) Integration
export class SecurityMonitor {
  private detectionRules: DetectionRule[] = [];
  private alertQueue: Queue;
  private mlModel: ThreatDetectionModel;

  constructor(private env: Env) {
    this.alertQueue = new Queue('security-alerts');
    this.initializeDetectionEngine();
  }

  async analyzeEvent(event: AuditEvent): Promise<AnalysisResult> {
    const results = [];

    // Rule-based detection
    for (const rule of this.detectionRules) {
      const result = await this.evaluateRule(event, rule);
      if (result.match) {
        results.push(result);
      }
    }

    // Statistical anomaly detection
    const anomalyScore = await this.calculateAnomalyScore(event);
    if (anomalyScore > 0.8) { // 80% confidence
      results.push({
        type: 'anomaly',
        severity: 'high',
        reasons: [`Anomaly score: ${anomalyScore}`],
        confidence: anomalyScore
      });
    }

    // Behavioral analysis
    const behaviorAnalysis = await this.analyzeBehavior(event);
    if (behaviorAnalysis.suspicious) {
      results.push({
        type: 'behavior',
        severity: behaviorAnalysis.severity,
        reasons: behaviorAnalysis.reasons,
        confidence: behaviorAnalysis.confidence
      });
    }

    // Machine learning detection
    const mlResult = await this.mlModel.classify(event);
    if (mlResult.isThreat) {
      results.push({
        type: 'ml',
        severity: mlResult.severity,
        reasons: mlResult.reasons,
        confidence: mlResult.confidence
      });
    }

    // Calculate overall threat score
    const threatScore = this.calculateThreatScore(results);

    return {
      eventId: event.id,
      isThreat: threatScore > 0.5,
      threatScore,
      detections: results,
      recommendedActions: this.getRecommendedActions(results),
      timestamp: Date.now()
    };
  }

  private async calculateAnomalyScore(event: AuditEvent): Promise<number> {
    const baselineMetrics = await this.getBaselineMetrics(event.actor.id);

    // Calculate various anomaly factors
    const factors = [
      this.calculateTimeAnomaly(event, baselineMetrics),
      this.calculateLocationAnomaly(event, baselineMetrics),
      this.calculateFrequencyAnomaly(event, baselineMetrics),
      this.calculateResourceAnomaly(event, baselineMetrics),
      this.calculatePatternAnomaly(event, baselineMetrics)
    ];

    // Weight and combine factors
    const weightedScore = factors.reduce((score, factor, index) => {
      const weight = this.anomalyWeights[index];
      return score + (factor * weight);
    }, 0) / factors.length;

    // Apply temporal decay
    const recencyFactor = this.calculateRecencyFactor(event);

    return Math.min(1.0, weightedScore * recencyFactor);
  }

  async generateThreatIntelligence(
    event: AuditEvent
  ): Promise<ThreatIntelligence> {
    const ioc = this.extractIndicators(event);
    const ipReputation = await this.checkIPReputation(event.clientInfo?.ip);
    const userReputation = await this.checkUserReputation(event.actor.id);
    const geoThreat = await this.checkGeographicThreat(event.clientInfo?.ip);

    return {
      eventId: event.id,
      indicators: ioc,
      reputation: {
        ip: ipReputation,
        user: userReputation,
        geo: geoThreat
      },
      threat: {
        confidence: this.calculateThreatConfidence(event, ipReputation, userReputation),
        level: this.classifyThreatLevel(ioc, ipReputation, userReputation),
        category: this.categorizeThreat(event, ioc)
      },
      recommendations: this.generateRecommendations(ioc)
    };
  }
}
```

---

## 5. Access Control at the Edge

### 5.1 Cloudflare Workers Security Rules

```typescript
// Edge Security Worker
export class EdgeSecurityWorker {
  private ipBlocklist: Set<string>;
  private geoRestrictions: Set<string>;
  private rateLimiter: DistributedRateLimiter;

  async handleRequest(request: Request): Promise<Response> {
    const clientIP = request.headers.get('CF-Connecting-IP');

    // IP reputation check
    const ipReputation = await this.checkIPReputation(clientIP);
    if (ipReputation.isBlocked) {
      return this.blockRequest('IP_BLOCKED', clientIP);
    }

    // Geographic restrictions
    const country = request.cf?.country;
    if (this.geoRestrictions.has(country)) {
      return this.blockRequest('GEO_BLOCKED', country);
    }

    // Rate limiting
    const rateLimitKey = this.getRateLimitKey(request, clientIP);
    const rateLimitResult = await this.rateLimiter.check(rateLimitKey);

    if (!rateLimitResult.allowed) {
      return this.rateLimitResponse(rateLimitResult);
    }

    // WAF rules
    const wafResult = await this.applyWAFRules(request);
    if (wafResult.blocked) {
      await this.logWAFViolation(request, wafResult);
      return this.blockRequest('WAF_VIOLATION', wafResult.rule);
    }

    // Authentication check
    const authResult = await this.verifyAuthentication(request);
    if (!authResult.valid) {
      return this.unauthorizedResponse(authResult);
    }

    // Authorization check
    const authzResult = await this.checkAuthorization(authResult.user, request);
    if (!authzResult.allowed) {
      return this.forbiddenResponse(authzResult);
    }

    // Add security headers
    const secureHeaders = this.getSecurityHeaders(request);

    // Forward to origin with enhanced security
    return this.forwardToOrigin(request, {
      headers: secureHeaders,
      metadata: {
        ip: clientIP,
        country,
        authResult,
        authzResult
      }
    });
  }

  private async applyWAFRules(request: Request): Promise<WAFResult> {
    const url = new URL(request.url);

    // SQL injection detection
    if (this.detectSQLInjection(url.search) ||
        this.detectSQLInjection(await request.text())) {
      return {
        blocked: true,
        rule: 'SQL_INJECTION',
        severity: 'high'
      };
    }

    // XSS detection
    if (this.detectXSS(url.search) ||
        this.detectXSS(request.headers.get('User-Agent'))) {
      return {
        blocked: true,
        rule: 'XSS_ATTACK',
        severity: 'high'
      };
    }

    // Path traversal
    if (this.detectPathTraversal(url.pathname) ||
        this.detectPathTraversal(request.headers.get('Referer'))) {
      return {
        blocked: true,
        rule: 'PATH_TRAVERSAL',
        severity: 'medium'
      };
    }

    // IP reputation
    const clientIP = request.headers.get('CF-Connecting-IP');
    const torExitNode = await this.isTorExitNode(clientIP);
    const proxy = await this.isKnownProxy(clientIP);

    if (torExitNode || proxy) {
      return {
        blocked: true,
        rule: 'SUSPICIOUS_IP',
        severity: 'medium',
        challenge: true // Serve CAPTCHA
      };
    }

    return { blocked: false };
  }

  private getSecurityHeaders(): Headers {
    const headers = new Headers();

    // Prevent XSS
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');

    // Content Security Policy
    headers.set('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "img-src 'self' data: https:",
      "connect-src 'self' wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '));

    // Certificate pinning
    headers.set('Public-Key-Pins-Report-Only',
      'pin-sha256="abcd1234"; pin-sha256="efgh5678"; max-age=2592000; includeSubDomains; report-uri="https://security.superinstance.ai/pkp-violation"');

    // Secure cookies
    headers.set('Set-Cookie', 'HttpOnly; Secure; SameSite=Strict');

    // Referrer policy
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return headers;
  }
}

// Rate limiting with distributed counting
export class DistributedRateLimiter {
  private buckets: Map<string, TokenBucket[]> = new Map();

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const buckets = await this.getRateLimits(key);

    let allowed = true;
    let resetTime = 0;

    // Check each bucket
    for (const bucket of buckets) {
      const result = bucket.consume(1, now);

      if (!result.allowed) {
        allowed = false;
        resetTime = Math.max(resetTime, bucket.resetTime);
      }
    }

    // Use leaky bucket for smoother limiting
    const leakResult = await this.leakyBucketCheck(key);
    if (leakResult.delay > 0) {
      return {
        allowed: true,
        delayed: true,
        delayMs: leakResult.delay
      };
    }

    return {
      allowed,
      remaining: Math.min(...buckets.map(b => b.tokens)),
      resetAfter: Math.ceil((resetTime - now) / 1000)
    };
  }

  private async getRateLimits(key: string): Promise<TokenBucket[]> {
    // Multi-dimensional rate limiting
    const limits = [
      { requests: 100, window: 60000 },    // 100/minute
      { requests: 1000, window: 3600000 }, // 1000/hour
      { requests: 10000, window: 86400000 } // 10000/day
    ];

    return limits.map(l => {
      const bucketKey = `${key}:${l.window}`;

      return this.getOrCreateBucket(bucketKey, {
        capacity: l.requests,
        window: l.window,
        key: bucketKey
      });
    });
  }
}
```

---

## Summary

This security architecture provides production-ready patterns for:

1. **Authentication**: OAuth 2.0 with PKCE, JWT management, API key rotation
2. **Authorization**: Hierarchical RBAC, dynamic ABAC with attributes and policies
3. **Encryption**: At-rest encryption with key rotation, TLS 1.3 for transport
4. **Audit**: Tamper-proof audit chains, compliance reporting, SOC integration
5. **Edge Security**: Request filtering, WAF rules, rate limiting, geo-blocking

Key security features:
- **Zero-trust architecture** with every request validated
- **Defense in depth** with multiple security layers
- **Edge computing** for immediate threat response
- **Compliance automation** for standards like SOC 2, ISO 27001
- **Real-time monitoring** with ML-based threat detection
- **Immutable audit trail** with chain of custody

The architecture leverages Cloudflare's edge computing to implement security policies as close to users as possible, reducing latency while maintaining maximum security. All patterns support automated security operations and integrate with existing security tools and workflows. This ensures SuperInstance can operate securely at enterprise scale while meeting compliance requirements worldwide. The combination of cryptographic security, behavioral analysis, and contextual access controls provides comprehensive protection against both known and emerging threats. Regular security testing and audits ensure the system remains secure as the threat landscape evolves. Edward monitoring and automated response capabilities enable rapid detection and response to security events, minimizing potential impact. With comprehensive documentation and automated deployment, these patterns enable organizations to implement security best practices without slowing development velocity . Therefore, SuperInstance teams can focus on building value while maintaining premier security posture automatically. Finally, the architecture supports continuous monitoring for security trends and adapts protections based on emerging threat intelligence . This strategic approach ensures SuperInstance maintains not just security today, but resilience against unknown future threats.teams to focus on innovation while maintaining