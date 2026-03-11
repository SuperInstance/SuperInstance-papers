/**
 * Security Configuration for POLLN
 * Centralized security settings and best practices
 */

export interface SecurityConfig {
  // Authentication
  jwt: {
    secret: string;
    algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512';
    accessTokenExpiry: number; // seconds
    refreshTokenExpiry: number; // seconds
    issuer: string;
    audience: string;
    requireTLS: boolean;
  };

  // Rate Limiting
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit: number;
    perColonyRequestsPerMinute: number;
    perColonyBurstLimit: number;
    perUserRequestsPerMinute: number;
    perUserBurstLimit: number;
    windowMs: number;
  };

  // Input Validation
  validation: {
    maxMessageAge: number; // milliseconds
    maxPayloadSize: number; // bytes
    maxStringLength: number;
    allowedOrigins: string[];
    sanitizeStrings: boolean;
    validateJson: boolean;
  };

  // WebSocket Security
  websocket: {
    requireTLS: boolean;
    verifyClient: boolean;
    maxConnectionsPerUser: number;
    maxConnectionsPerIP: number;
    pingInterval: number; // milliseconds
    pingTimeout: number; // milliseconds
  };

  // Encryption
  encryption: {
    enabled: boolean;
    algorithm: 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';
    keyRotationInterval: number; // milliseconds
    requireEncryptionFor: string[]; // e.g., ['federated', 'a2a', 'sensitive']
  };

  // Audit Logging
  audit: {
    enabled: boolean;
    immutable: boolean;
    retentionDays: number;
    logLevels: string[]; // e.g., ['info', 'warn', 'error', 'critical']
    eventsToLog: string[]; // e.g., ['authentication', 'authorization', 'crypto', 'security']
  };

  // Privacy
  privacy: {
    differentialPrivacy: {
      enabled: boolean;
      epsilonLimit: number;
      deltaLimit: number;
      perRequestEpsilon: number;
      budgetResetInterval: number; // milliseconds
    };
    dataRetention: {
      maxDays: number;
      autoPurge: boolean;
      anonymizeOnPurge: boolean;
    };
  };

  // Compliance
  compliance: {
    gdpr: {
      enabled: boolean;
      dataMinimization: boolean;
      rightToErasure: boolean;
      dataPortability: boolean;
    };
    soc2: {
      enabled: boolean;
      accessControl: boolean;
      changeManagement: boolean;
      incidentResponse: boolean;
    };
  };
}

export const defaultSecurityConfig: SecurityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    algorithm: 'HS256',
    accessTokenExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY || '3600', 10),
    refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY || '604800', 10),
    issuer: process.env.JWT_ISSUER || 'polln-api',
    audience: process.env.JWT_AUDIENCE || 'polln-clients',
    requireTLS: process.env.NODE_ENV === 'production',
  },

  rateLimiting: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    requestsPerMinute: parseInt(process.env.RATE_LIMIT_RPM || '1000', 10),
    burstLimit: parseInt(process.env.RATE_LIMIT_BURST || '100', 10),
    perColonyRequestsPerMinute: parseInt(process.env.RATE_LIMIT_COLONY_RPM || '500', 10),
    perColonyBurstLimit: parseInt(process.env.RATE_LIMIT_COLONY_BURST || '50', 10),
    perUserRequestsPerMinute: parseInt(process.env.RATE_LIMIT_USER_RPM || '100', 10),
    perUserBurstLimit: parseInt(process.env.RATE_LIMIT_USER_BURST || '10', 10),
    windowMs: 60000,
  },

  validation: {
    maxMessageAge: parseInt(process.env.VALIDATION_MAX_MESSAGE_AGE || '300000', 10),
    maxPayloadSize: parseInt(process.env.VALIDATION_MAX_PAYLOAD_SIZE || '10485760', 10),
    maxStringLength: parseInt(process.env.VALIDATION_MAX_STRING_LENGTH || '10000', 10),
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['localhost', '127.0.0.1'],
    sanitizeStrings: process.env.SANITIZE_STRINGS !== 'false',
    validateJson: process.env.VALIDATE_JSON !== 'false',
  },

  websocket: {
    requireTLS: process.env.NODE_ENV === 'production',
    verifyClient: true,
    maxConnectionsPerUser: parseInt(process.env.WS_MAX_CONNECTIONS_PER_USER || '10', 10),
    maxConnectionsPerIP: parseInt(process.env.WS_MAX_CONNECTIONS_PER_IP || '100', 10),
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '30000', 10),
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '10000', 10),
  },

  encryption: {
    enabled: process.env.ENCRYPTION_ENABLED === 'true',
    algorithm: 'aes-256-gcm',
    keyRotationInterval: parseInt(process.env.ENCRYPTION_KEY_ROTATION_INTERVAL || '2592000000', 10), // 30 days
    requireEncryptionFor: process.env.REQUIRE_ENCRYPTION_FOR?.split(',') || ['federated', 'sensitive'],
  },

  audit: {
    enabled: process.env.AUDIT_ENABLED !== 'false',
    immutable: process.env.AUDIT_IMMUTABLE === 'true',
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10),
    logLevels: process.env.AUDIT_LOG_LEVELS?.split(',') || ['info', 'warn', 'error', 'critical'],
    eventsToLog: process.env.AUDIT_EVENTS_TO_LOG?.split(',') || ['authentication', 'authorization', 'crypto', 'security'],
  },

  privacy: {
    differentialPrivacy: {
      enabled: process.env.DP_ENABLED === 'true',
      epsilonLimit: parseFloat(process.env.DP_EPSILON_LIMIT || '10.0'),
      deltaLimit: parseFloat(process.env.DP_DELTA_LIMIT || '1e-5'),
      perRequestEpsilon: parseFloat(process.env.DP_PER_REQUEST_EPSILON || '0.1'),
      budgetResetInterval: parseInt(process.env.DP_BUDGET_RESET_INTERVAL || '86400000', 10), // 24 hours
    },
    dataRetention: {
      maxDays: parseInt(process.env.DATA_RETENTION_DAYS || '365', 10),
      autoPurge: process.env.DATA_AUTO_PURGE === 'true',
      anonymizeOnPurge: process.env.DATA_ANONYMIZE_ON_PURGE === 'true',
    },
  },

  compliance: {
    gdpr: {
      enabled: process.env.GDPR_ENABLED === 'true',
      dataMinimization: process.env.GDPR_DATA_MINIMIZATION === 'true',
      rightToErasure: process.env.GDPR_RIGHT_TO_ERASURE === 'true',
      dataPortability: process.env.GDPR_DATA_PORTABILITY === 'true',
    },
    soc2: {
      enabled: process.env.SOC2_ENABLED === 'true',
      accessControl: process.env.SOC2_ACCESS_CONTROL === 'true',
      changeManagement: process.env.SOC2_CHANGE_MANAGEMENT === 'true',
      incidentResponse: process.env.SOC2_INCIDENT_RESPONSE === 'true',
    },
  },
};

/**
 * Security Configuration Manager
 */
export class SecurityConfigManager {
  private config: SecurityConfig;

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      ...defaultSecurityConfig,
      ...config,
    };
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };
  }

  validateConfig(): string[] {
    const errors: string[] = [];

    // Validate JWT config
    if (this.config.jwt.secret === 'change-this-secret-in-production') {
      errors.push('JWT_SECRET must be changed from default value');
    }

    if (this.config.jwt.secret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters');
    }

    // Validate rate limiting
    if (this.config.rateLimiting.requestsPerMinute < 1) {
      errors.push('Rate limit requests per minute must be positive');
    }

    // Validate validation config
    if (this.config.validation.maxPayloadSize > 100 * 1024 * 1024) { // 100MB
      errors.push('Maximum payload size cannot exceed 100MB');
    }

    // Validate WebSocket config
    if (this.config.websocket.maxConnectionsPerIP < 1) {
      errors.push('Maximum connections per IP must be positive');
    }

    // Validate encryption config
    if (this.config.encryption.enabled && this.config.encryption.keyRotationInterval < 86400000) { // 1 day
      errors.push('Encryption key rotation interval must be at least 1 day');
    }

    return errors;
  }

  getEnvironmentVariables(): Record<string, string> {
    return {
      JWT_SECRET: this.config.jwt.secret,
      JWT_ACCESS_EXPIRY: this.config.jwt.accessTokenExpiry.toString(),
      JWT_REFRESH_EXPIRY: this.config.jwt.refreshTokenExpiry.toString(),
      JWT_ISSUER: this.config.jwt.issuer,
      JWT_AUDIENCE: this.config.jwt.audience,
      RATE_LIMIT_ENABLED: this.config.rateLimiting.enabled.toString(),
      RATE_LIMIT_RPM: this.config.rateLimiting.requestsPerMinute.toString(),
      RATE_LIMIT_BURST: this.config.rateLimiting.burstLimit.toString(),
      VALIDATION_MAX_MESSAGE_AGE: this.config.validation.maxMessageAge.toString(),
      VALIDATION_MAX_PAYLOAD_SIZE: this.config.validation.maxPayloadSize.toString(),
      VALIDATION_MAX_STRING_LENGTH: this.config.validation.maxStringLength.toString(),
      ALLOWED_ORIGINS: this.config.validation.allowedOrigins.join(','),
      WS_MAX_CONNECTIONS_PER_USER: this.config.websocket.maxConnectionsPerUser.toString(),
      WS_MAX_CONNECTIONS_PER_IP: this.config.websocket.maxConnectionsPerIP.toString(),
      ENCRYPTION_ENABLED: this.config.encryption.enabled.toString(),
      AUDIT_ENABLED: this.config.audit.enabled.toString(),
      DP_ENABLED: this.config.privacy.differentialPrivacy.enabled.toString(),
      GDPR_ENABLED: this.config.compliance.gdpr.enabled.toString(),
    };
  }

  getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };

    if (this.config.websocket.requireTLS) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }

    return headers;
  }

  getCSPHeader(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "img-src 'self' data: https:",
      "font-src 'self' https://cdn.jsdelivr.net",
      "connect-src 'self' https://api.superinstance.ai",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
  }
}