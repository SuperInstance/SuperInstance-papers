import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { type Env } from './env.d.ts'

// Import routers
import authRouter from './api/auth/router'
import progressRouter from './api/progress/router'
import contentRouter from './api/content/router'
import analyticsRouter from './api/analytics/router'
app.route("/api/integrations", integrationsRouter)
import integrationsRouter from './api/integrations/router'

// Create main app
const app = new Hono<{ Bindings: Env }>()

// Global middleware
app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', cors({
  origin: ['https://superinstance.ai', 'http://localhost:4321'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  })
})

// API routes
app.route('/api/auth', authRouter)
app.route('/api/progress', progressRouter)
app.route('/api/content', contentRouter)
app.route('/api/analytics', analyticsRouter)
app.route("/api/integrations", integrationsRouter)
import integrationsRouter from './api/integrations/router'

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: c.req.path,
  }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err)

  const status = err.status || 500
  const message = err.message || 'Internal Server Error'

  return c.json({
    error: 'Internal Server Error',
    message: c.env.ENVIRONMENT === 'production' ? 'Something went wrong' : message,
    requestId: c.req.headers.get('cf-ray') || 'unknown',
  }, status)
})

export default app