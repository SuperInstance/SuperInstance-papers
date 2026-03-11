export interface Env {
  // Environment
  ENVIRONMENT: 'development' | 'staging' | 'production'

  // Secrets
  JWT_SECRET: string
  ADMIN_API_KEY?: string

  // Third-party API keys
  BUTTONDOWN_API_KEY?: string
  GITHUB_TOKEN?: string
  PLAUSIBLE_API_KEY?: string

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