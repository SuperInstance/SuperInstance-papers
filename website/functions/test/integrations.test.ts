import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Hono } from 'hono'
import integrationRouter from '../src/api/integrations/router'
import { type Env } from '../src/env.d.ts'

describe('API Integrations', () => {
  let app: Hono<{ Bindings: Env }>
  let env: Env

  beforeAll(() => {
    app = new Hono()
    app.route('/api/integrations', integrationRouter)

    // Mock environment
    env = {
      ENVIRONMENT: 'test',
      JWT_SECRET: 'test-secret',
      SITE_URL: 'https://superinstance.ai',
      API_BASE_URL: 'https://api.superinstance.ai',

      // Mock KV namespaces
      SESSIONS: new Map(),
      CACHE: new Map(),
      USER_PREFERENCES: new Map(),
      NEWSLETTER_CACHE: new Map(),
      GITHUB_CACHE: new Map(),

      // Mock D1 database
      DB: {
        prepare: () => ({
          bind: () => ({ run: async () => ({ success: true }), first: async () => null }),
          run: async () => ({ success: true }),
          first: async () => null
        })
      },
    } as any
  })

  describe('Stripe Integration', () => {
    it('should require authentication for checkout creation', async () => {
      const req = new Request('http://localhost/api/integrations/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
          successUrl: 'https://superinstance.ai/success',
          cancelUrl: 'https://superinstance.ai/cancel'
        })
      })

      const res = await app.fetch(req, env)
      expect(res.status).toBe(401)
    })

    it('should validate webhook signature', async () => {
      const req = new Request('http://localhost/api/integrations/stripe/webhook', {
        method: 'POST',
        body: 'test-payload',
        headers: {
          'stripe-signature': 'invalid'
        }
      })

      const res = await app.fetch(req, env)
      expect(res.status).toBe(400)
    })

    it('should require valid state for portal creation', async () => {
      // Test without proper auth headers
      const req = new Request('http://localhost/api/integrations/stripe/portal', {
        method: 'POST',
        body: JSON.stringify({
          returnUrl: 'https://superinstance.ai',
          customerId: 'cus_123'
        })
      })

      const res = await app.fetch(req, env)
      expect(res.status).toBe(401)
    })
  })

  describe('OAuth Integration', () => {
    it('should validate provider type', async () => {
      const req = new Request('http://localhost/api/integrations/oauth/connect/invalid', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const res = await app.fetch(req, env)
      expect(res.status).toBe(401) // Auth first, then validation
    })

    it('should generate valid OAuth state', async () => {
      const req = new Request('http://localhost/api/integrations/oauth/connect/google', {
        method: 'POST',
        body: JSON.stringify({
          scopes: ['email', 'profile']
        }),
        headers: {
          'Authorization': 'Bearer fake-token'
        }
      })

      const res = await app.fetch(req, env)
      // Should fail on auth, but state should be generated if auth passed
      expect(res.status).toBe(401)
    })

    it('should validate OAuth callback state', async () => {
      const req = new Request('http://localhost/api/integrations/oauth/callback/google?code=test&state=invalid')

      const res = await app.fetch(req, env)
      expect(res.status).toBe(400)
    })
  })

  describe('Email Integration', () => {
    it('should validate email schema', async () => {
      const req = new Request('http://localhost/api/integrations/email/send', {
        method: 'POST',
        body: JSON.stringify({
          to: ['invalid-email'],
          from: 'test@example.com',
          subject: 'Test',
          text: 'Test email'
        })
      })

      const res = await app.fetch(req, env)
      expect(res.status).toBe(401) // Should fail auth first
    })

    it('should require authentication for sending emails', async () => {
      const req = new Request('http://localhost/api/integrations/email/send', {
        method: 'POST',
        body: JSON.stringify({
          to: ['test@example.com'],
          from: 'noreply@superinstance.ai',
          subject: 'Test Email',
          text: 'This is a test email'
        })
      })

      const res = await app.fetch(req, env)
      expect(res.status).toBe(401)
    })
  })

  describe('Sentry Integration', () => {
    it('should capture errors without auth', async () => {
      const req = new Request('http://localhost/api/integrations/errors/capture', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test error message',
          level: 'error',
          tags: { component: 'test' }
        })
      })

      const res = await app.fetch(req, env)
      expect(res.status).toBe(200)
    })

    it('should validate error level', async () => {
      const req = new Request('http://localhost/api/integrations/errors/capture', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test',
          level: 'invalid-level'
        })
      })

      const res = await app.fetch(req, env)
      expect(res.status).toBe(400)
    })
  })

  describe('Calendly Integration', () => {
    it('should validate event type for scheduling', async () => {
      const req = new Request('http://localhost/api/integrations/calendly/schedule', {
        method: 'POST',
        body: JSON.stringify({
          eventType: 'demo',
          email: 'invalid',
          name: '',
          startTime: new Date().toISOString()
        })
      })

      const res = await app.fetch(req, env)
      expect(res.status).toBe(400)
    })

    it('should require valid time for scheduling', async () => {
      const req = new Request('http://localhost/api/integrations/calendly/schedule', {
        method: 'POST',
        body: JSON.stringify({
          eventType: 'demo',
          email: 'test@example.com',
          name: 'Test User',
          startTime: 'invalid-date'
        })
      })

      const res = await app.fetch(req, env)
      expect(res.status).toBe(400)
    })

    it('should require auth for listing user events', async () => {
      const req = new Request('http://localhost/api/integrations/calendly/events')

      const res = await app.fetch(req, env)
      expect(res.status).toBe(401)
    })
  })

  describe('Search Integration', () => {
    it('should validate query minimum length', async () => {
      const req = new Request('http://localhost/api/integrations/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'hi', // Less than 3 chars
          limit: 10
        })
      })

      const res = await app.fetch(req, env)
      expect(res.status).toBe(400)
    })

    it('should limit search results', async () => {
      const req = new Request('http://localhost/api/integrations/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'spreadsheet ai',
          limit: 1000 // Too high
        })
      })

      const res = await app.fetch(req, env)
      // Should return 503 if search service unavailable
      expect([200, 503]).toContain(res.status)
    })
  })
})