export interface Env {
  // Environment
  ENVIRONMENT: 'development' | 'staging' | 'production'

  // Secrets
  JWT_SECRET: string
  ADMIN_API_KEY?: string
  API_BASE_URL?: string

  // Third-party API keys
  BUTTONDOWN_API_KEY?: string
  GITHUB_TOKEN?: string
  GITHUB_OAUTH_CLIENT_ID?: string
  GITHUB_OAUTH_CLIENT_SECRET?: string
  PLAUSIBLE_API_KEY?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_PUBLISHABLE_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  MICROSOFT_CLIENT_ID?: string
  MICROSOFT_CLIENT_SECRET?: string  // or MICROSOFT_TENANT_ID
  SENDGRID_API_KEY?: string
  SENTRY_DSN_KEY?: string
  SENTRY_PROJECT_ID?: string
  SENTRY_INGEST_URL?: string
  CALENDLY_API_KEY?: string

  // Site configuration
  SITE_URL: string
  PLAUSIBLE_SITE_ID?: string

  // KV Namespaces
  SESSIONS: KVNamespace
  CACHE: KVNamespace
  USER_PREFERENCES: KVNamespace
  NEWSLETTER_CACHE: KVNamespace
  GITHUB_CACHE: KVNamespace

  // D1 Database
  DB: D1Database

  // R2 Bucket (optional)
  FILES?: R2Bucket

  // SuperInstance-specific namespaces
  CELL_CACHE?: KVNamespace
  ORIGIN_CACHE?: KVNamespace
  PROPAGATION_CACHE?: KVNamespace
}

export type WorkerContext = {
  env: Env
  ctx: ExecutionContext
}