import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createStripeCheckout,
  connectOAuth,
  sendEmail,
  captureError,
  scheduleDemo,
  searchContent
} from '../src/lib/api/integrations'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Frontend Client Integrations', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('Stripe Integration', () => {
    it('should create checkout session', async () => {
      const mockResponse = {
        success: true,
        data: {
          sessionId: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123'
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await createStripeCheckout(
        'price_123',
        'https://superinstance.ai/success',
        'https://superinstance.ai/cancel'
      )

      expect(mockFetch).toHaveBeenCalledWith('/api/integrations/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          priceId: 'price_123',
          successUrl: 'https://superinstance.ai/success',
          cancelUrl: 'https://superinstance.ai/cancel',
          metadata: undefined
        })
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle checkout creation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid price ID' })
      })

      await expect(createStripeCheckout('invalid', '/success', '/cancel')).rejects.toThrow('Invalid price ID')
    })
  })

  describe('OAuth Integration', () => {
    it('should initiate OAuth connection', async () => {
      const mockResponse = {
        success: true,
        data: {
          authUrl: 'https://github.com/login/oauth/authorize?client_id=123',
          state: 'random-state-123'
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await connectOAuth('github', ['user:email'], 'https://superinstance.ai/oauth/callback')

      expect(mockFetch).toHaveBeenCalledWith('/api/integrations/oauth/connect/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scopes: ['user:email'], returnUrl: 'https://superinstance.ai/oauth/callback' })
      })
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('Email Integration', () => {
    it('should send email', async () => {
      const mockResponse = {
        success: true,
        message: 'Email sent successfully'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await sendEmail({
        to: ['user@example.com'],
        from: 'noreply@superinstance.ai',
        subject: 'Test Email',
        text: 'Test message',
        category: 'onboarding'
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/integrations/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          to: ['user@example.com'],
          from: 'noreply@superinstance.ai',
          subject: 'Test Email',
          text: 'Test message',
          category: 'onboarding'
        })
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Error Tracking', () => {
    it('should capture error without crashing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { eventId: 'event-123', captured: true }
        })
      })

      const result = await captureError('Something went wrong', {
        level: 'error',
        tags: { component: 'Button' }
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/integrations/errors/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Something went wrong',
          level: 'error',
          tags: { component: 'Button' }
        })
      })
      expect(result).toEqual({ eventId: 'event-123', captured: true })
    })

    it('should handle error capture failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await captureError('Error message')

      expect(result).toEqual({ eventId: '', captured: false })
    })

    it('should not capture when fetch returns not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      })

      const result = await captureError('Error message')

      expect(result).toEqual({ eventId: '', captured: false })
    })
  })

  describe('Calendly Integration', () => {
    it('should schedule demo', async () => {
      const mockResponse = {
        success: true,
        data: {
          eventId: 'event-123',
          scheduled: true,
          inviteUrl: 'https://calendly.com/superinstance/demo?event_id=123'
        }
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            collection: [{
              name: 'Demo Call',
              slug: 'demo-call',
              scheduling_url: 'https://calendly.com/superinstance/demo-call'
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            resource: { current_organization: 'https://api.calendly.com/organizations/superinstance' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            resource: { uri: 'https://api.calendly.com/scheduled_events/123', rescheduled_url: 'https://calendly.com' }
          })
        })

      const result = await scheduleDemo({
        eventType: 'demo',
        email: 'user@example.com',
        name: 'Test User',
        startTime: '2024-01-01T10:00:00Z'
      })

      expect(mockFetch).toHaveBeenCalled()
      expect(result).toEqual(mockResponse.data)
    })

    it('should get event types', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: '123',
            name: 'Demo Call',
            slug: 'demo-call',
            duration: 30
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          collection: [{
            uri: '/event_types/123',
            name: 'Demo Call',
            slug: 'demo-call',
            duration: 30,
            active: true,
            scheduling_url: 'https://calendly.com/superinstance/demo-call',
            custom_questions: []
          }]
        })
      })

      const eventTypes = await getEventTypes()

      expect(mockFetch).toHaveBeenCalledWith('/api/integrations/calendly/event-types', {
        credentials: 'include'
      })
      expect(eventTypes).toEqual(mockResponse.data)
    })
  })

  describe('Search Integration', () => {
    it('should search content', async () => {
      const mockResults = [
        { title: 'Article 1', content: 'Lorem ipsum', url: '/article-1' },
        { title: 'Article 2', content: 'Dolor sit amet', url: '/article-2' }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockResults,
          query: 'spreadsheet ai',
          resultCount: 2
        })
      })

      const results = await searchContent('spreadsheet ai', 10)

      expect(mockFetch).toHaveBeenCalledWith('/api/integrations/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'spreadsheet ai', limit: 10 })
      })
      expect(results).toEqual(mockResults)
    })
  })
})