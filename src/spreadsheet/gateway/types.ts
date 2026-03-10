/**
 * POLLN API Gateway Types
 * Core type definitions for API gateway functionality
 */

// HTTP methods
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

// Gateway configuration
export interface GatewayConfig {
  port: number;
  host: string;
  trustProxy: boolean;
  routes: GatewayRoute[];
  rateLimit: RateLimitConfig;
  auth: AuthConfig;
  cache: CacheConfig;
  cors: CorsConfig;
  circuitBreaker: CircuitBreakerConfig;
  timeout: number;
  maxBodySize: number;
}

// Route definition
export interface GatewayRoute {
  path: string;
  methods: HTTPMethod[];
  upstream: UpstreamConfig;
  middleware: RouteMiddleware[];
  auth?: AuthRequirement;
  cache?: CachePolicy;
  rateLimit?: RateLimitOverride;
  circuitBreaker?: CircuitBreakerOverride;
  metadata?: Record<string, unknown>;
}

// Upstream service configuration
export interface UpstreamConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  path?: string;
  timeout?: number;
  retries?: number;
  healthCheck?: HealthCheckConfig;
}

// Health check configuration
export interface HealthCheckConfig {
  path: string;
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
}

// Rate limit configuration
export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Rate limit override for specific routes
export interface RateLimitOverride extends RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Authentication configuration
export interface AuthConfig {
  jwt: JWTConfig;
  apiKey: APIKeyConfig;
  oauth: OAuthConfig;
  session: SessionConfig;
}

// JWT configuration
export interface JWTConfig {
  enabled: boolean;
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
  algorithm: string;
  issuer: string;
  audience: string;
}

// API key configuration
export interface APIKeyConfig {
  enabled: boolean;
  headerName: string;
  prefix: string;
  validator: (key: string) => Promise<boolean>;
}

// OAuth configuration
export interface OAuthConfig {
  enabled: boolean;
  providers: OAuthProviderConfig[];
  callbackURL: string;
  scopes: string[];
}

// OAuth provider configuration
export interface OAuthProviderConfig {
  name: string;
  clientId: string;
  clientSecret: string;
  authURL: string;
  tokenURL: string;
  userInfoURL: string;
}

// Session configuration
export interface SessionConfig {
  enabled: boolean;
  store: 'memory' | 'redis';
  ttl: number;
  secret: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

// Auth requirement for routes
export interface AuthRequirement {
  required: boolean;
  methods?: ('jwt' | 'apiKey' | 'oauth' | 'session')[];
  permissions?: string[];
  roles?: string[];
}

// Cache configuration
export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  keyGenerator?: (req: Request) => string;
  store: 'memory' | 'redis';
  maxSize: number;
  maxSizeMB?: number;
}

// Cache policy for routes
export interface CachePolicy {
  enabled: boolean;
  ttl: number;
  methods?: HTTPMethod[];
  varyBy?: string[];
}

// CORS configuration
export interface CorsConfig {
  enabled: boolean;
  origin: string | string[];
  methods: HTTPMethod[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

// Circuit breaker configuration
export interface CircuitBreakerConfig {
  enabled: boolean;
  threshold: number;
  timeout: number;
  halfOpenTimeout: number;
  recoveryThreshold: number;
}

// Circuit breaker override for routes
export interface CircuitBreakerOverride extends CircuitBreakerConfig {
  threshold: number;
  timeout: number;
}

// Route middleware
export interface RouteMiddleware {
  name: string;
  beforeRequest?: boolean;
  afterResponse?: boolean;
  handler: (req: Request, res?: Response) => Promise<Request | Response>;
}

// Gateway context
export interface GatewayContext {
  requestId: string;
  startTime: number;
  route?: GatewayRoute;
  user?: GatewayUser;
  session?: GatewaySession;
  cacheKey?: string;
  rateLimitKey?: string;
  metadata: Record<string, unknown>;
}

// Gateway user
export interface GatewayUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  metadata: Record<string, unknown>;
}

// Gateway session
export interface GatewaySession {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  data: Record<string, unknown>;
}

// Request metrics
export interface RequestMetrics {
  requestId: string;
  method: HTTPMethod;
  path: string;
  statusCode: number;
  duration: number;
  userAgent: string;
  ip: string;
  userId?: string;
  cacheStatus?: 'hit' | 'miss' | 'bypass';
  circuitBreakerStatus?: 'closed' | 'open' | 'half-open';
  timestamp: Date;
}

// Gateway metrics
export interface GatewayMetrics {
  requests: RequestMetrics[];
  rateLimitExceeded: number;
  authenticationFailed: number;
  cacheHits: number;
  cacheMisses: number;
  circuitBreakerTripped: number;
  upstreamErrors: number;
  totalRequests: number;
  successfulRequests: number;
}

// Circuit breaker state
export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  successes: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

// Cache entry
export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  expiresAt: number;
  hitCount: number;
  lastHit: number;
  metadata: Record<string, unknown>;
}

// Auth token
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string[];
}

// Auth result
export interface AuthResult {
  success: boolean;
  user?: GatewayUser;
  token?: AuthToken;
  error?: string;
}

// Health status
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  timestamp: Date;
  checks: Record<string, HealthCheckResult>;
}

// Health check result
export interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn';
  description?: string;
  duration?: number;
}

// Load balancer strategy
export type LoadBalancerStrategy = 'round-robin' | 'least-connections' | 'ip-hash' | 'random';

// Upstream pool
export interface UpstreamPool {
  name: string;
  servers: UpstreamConfig[];
  strategy: LoadBalancerStrategy;
  currentIndex: number;
  connections: Map<string, number>;
}

// Request options
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  body?: BodyInit | null;
}

// Response options
export interface ResponseOptions {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: BodyInit | null;
}

// Gateway error
export class GatewayError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GatewayError';
  }
}

// Default configuration
export const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  port: 3000,
  host: '0.0.0.0',
  trustProxy: true,
  routes: [],
  rateLimit: {
    enabled: true,
    windowMs: 60000,
    maxRequests: 100
  },
  auth: {
    jwt: {
      enabled: true,
      secret: process.env.JWT_SECRET || 'change-me',
      expiresIn: '1h',
      refreshExpiresIn: '7d',
      algorithm: 'HS256',
      issuer: 'polln-gateway',
      audience: 'polln-api'
    },
    apiKey: {
      enabled: true,
      headerName: 'x-api-key',
      prefix: '',
      validator: async () => true
    },
    oauth: {
      enabled: false,
      providers: [],
      callbackURL: '/auth/callback',
      scopes: ['openid', 'profile', 'email']
    },
    session: {
      enabled: true,
      store: 'memory',
      ttl: 86400000, // 24 hours
      secret: process.env.SESSION_SECRET || 'change-me',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax'
    }
  },
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    store: 'memory',
    maxSize: 1000,
    maxSizeMB: 100
  },
  cors: {
    enabled: true,
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposedHeaders: [],
    credentials: false,
    maxAge: 86400
  },
  circuitBreaker: {
    enabled: true,
    threshold: 0.5,
    timeout: 60000,
    halfOpenTimeout: 30000,
    recoveryThreshold: 3
  },
  timeout: 30000,
  maxBodySize: 10485760 // 10MB
};
