import type { UserPreferences, NewsletterSignup, GitHubRepo } from './types.js'

interface StripeSession {
  sessionId: string
  url?: string
}

interface StripePortal {
  url: string
}

interface ScheduleEvent {
  eventId?: string
  scheduled?: boolean
  inviteUrl?: string
  error?: string
}

const API_BASE = '/api/integrations'

export async function getUserPreferences(userId: string): Promise <UserPreferences > {
  const response = await fetch(`${API_BASE}/preferences/${userId}`, {
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error('Failed to fetch preferences')
  }

  const { data } = await response.json()
  return data || {
    theme: 'light',
    language: 'en',
    notifications: true,
    analytics: true,
    marketing: false
  }
}

export async function updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
  const response = await fetch(`${API_BASE}/preferences/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(preferences),
  })

  if (!response.ok) {
    throw new Error('Failed to update preferences')
  }

  const { data } = await response.json()
  return data
}

export async function signUpForNewsletter(data: NewsletterSignup): Promise<any> {
  const response = await fetch(`${API_BASE}/newsletter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to sign up for newsletter')
  }

  return response.json()
}

export async function getGitHubRepos(): Promise<GitHubRepo[]> {
  const response = await fetch(`${API_BASE}/github/repos`)

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub repositories')
  }

  const { data } = await response.json()
  return data
}

export async function trackEvent(eventName: string, eventData: any = {}, category?: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventName,
        eventData,
        category,
      }),
    })

    if (!response.ok) {
      console.error('Failed to track event')
    }
  } catch (error) {
    console.error('Analytics tracking error:', error)
  }
}

export async function createStripeCheckout(priceId: string, successUrl: string, cancelUrl: string, metadata?: Record<string, string>): Promise<StripeSession> {
  const response = await fetch(`${API_BASE}/stripe/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      priceId,
      successUrl,
      cancelUrl,
      metadata,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create checkout session')
  }

  const data = await response.json()
  return data.data
}

export async function createStripePortal(returnUrl: string, customerId: string): Promise<StripePortal> {
  const response = await fetch(`${API_BASE}/stripe/portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      returnUrl,
      customerId,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create portal session')
  }

  const data = await response.json()
  return data.data
}

// OAuth connectivity
export async function connectOAuth(provider: 'google' | 'github' | 'microsoft', scopes?: string[], returnUrl?: string): Promise<{ authUrl: string; state: string }> {
  const response = await fetch(`${API_BASE}/oauth/connect/${provider}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      scopes,
      returnUrl,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to initiate OAuth')
  }

  const data = await response.json()
  return data.data
}

// Email service integration
export async function sendEmail(options: {
  to: string[]
  from: string
  subject: string
  html?: string
  text: string
  category?: string
  sendAt?: number
}): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/email/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(options),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to send email')
  }

  return response.json()
}

export async function getEmailTemplates(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/email/templates`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch email templates')
  }

  const data = await response.json()
  return data.data || []
}

// Error tracking with Sentry
export async function captureError(message: string, options?: {
  level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal'
  tags?: Record<string, string>
  extra?: Record<string, any>
  environment?: string
  release?: string
  userId?: string
}): Promise<{ eventId: string, captured: boolean }> {
  const response = await fetch(`${API_BASE}/errors/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      ...options,
    }),
  })

  if (!response.ok) {
    console.error('Failed to capture error')
    return { eventId: '', captured: false }
  }

  const data = await response.json()
  return data.data
}

// Calendly scheduling integration
export async function getEventTypes(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/calendly/event-types`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch event types')
  }

  const data = await response.json()
  return data.data || []
}

export async function scheduleDemo(data: {
  eventType: string
  email: string
  name: string
  startTime: string
  timezone?: string
  duration?: number
  questions?: Array<{ label: string, answer: string }>
  note?: string
}): Promise<ScheduleEvent> {
  const response = await fetch(`${API_BASE}/calendly/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to schedule demo')
  }

  const result = await response.json()
  return result.data
}

export async function getScheduledDemos(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/calendly/events`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch scheduled demos')
  }

  const data = await response.json()
  return data.data || []
}

// Analytics wrapper using Plausible compatibility
export function createAnalyticsTracker() {
  // Initialize analytics with consent
  let analyticsEnabled = false

  // Check if analytics is enabled
  try {
    const stored = localStorage.getItem('superinstance:analytics')
    if (stored === 'true') {
      analyticsEnabled = true
    }
  } catch {
    // Ignore localStorage errors
  }

  return {
    enable() {
      analyticsEnabled = true
      try {
        localStorage.setItem('superinstance:analytics', 'true')
      } catch {}
    },

    disable() {
      analyticsEnabled = false
      try {
        localStorage.setItem('superinstance:analytics', 'false')
      } catch {}
    },

    isEnabled() {
      return analyticsEnabled
    },

    pageView(path: string, referrer?: string) {
      if (!analyticsEnabled) return
      trackEvent('page_view', { path, referrer }, 'navigation')
    },

    outboundClick(url: string) {
      if (!analyticsEnabled) return
      trackEvent('outbound_click', { url }, 'navigation')
    },

    searchQuery(query: string, resultCount: number) {
      if (!analyticsEnabled) return
      trackEvent('search', { query, resultCount }, 'search')
    },

    newsletterSignup(source: string) {
      if (!analyticsEnabled) return
      trackEvent('newsletter_signup', { source }, 'conversion')
    },

    resourceDownload(resource: string) {
      if (!analyticsEnabled) return
      trackEvent('resource_download', { resource }, 'engagement')
    },
  }
}

// Client-side preference management
export function createPreferenceManager() {
  let preferences: UserPreferences = {
    theme: 'light',
    language: 'en',
    notifications: true,
    analytics: true,
    marketing: false
  }

  // Initialize from localStorage
  try {
    const stored = localStorage.getItem('superinstance:preferences')
    if (stored) {
      preferences = { ...preferences, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore localStorage errors
  }

  // Apply theme immediately
  if (preferences.theme && preferences.theme !== 'auto') {
    document.documentElement.setAttribute('data-theme', preferences.theme)
  }

  return {
    getPreferences() {
      return { ...preferences }
    },

    async updatePreferences(updates: Partial<UserPreferences>) {
      preferences = { ...preferences, ...updates }

      // Apply theme immediately
      if (updates.theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
      } else if (updates.theme) {
        document.documentElement.setAttribute('data-theme', updates.theme)
      }

      // Save to localStorage
      try {
        localStorage.setItem('superinstance:preferences', JSON.stringify(preferences))
      } catch {}

      // Update backend if user is authenticated
      try {
        const userId = localStorage.getItem('superinstance:userId')
        if (userId) {
          await updateUserPreferences(userId, updates)
        }
      } catch (error) {
        console.error('Failed to sync preferences with server:', error)
      }

      return preferences
    },

    clearPreferences() {
      preferences = {
        theme: 'light',
        language: 'en',
        notifications: true,
        analytics: true,
        marketing: false
      }
      try {
        localStorage.removeItem('superinstance:preferences')
      } catch {}
    }
  }
}

export function createPreferenceManager() {
  let preferences: UserPreferences = {
    theme: 'light',
    language: 'en',
    notifications: true,
    analytics: true,
    marketing: false
  }

  // Initialize from localStorage
  try {
    const stored = localStorage.getItem('superinstance:preferences')
    if (stored) {
      preferences = { ...preferences, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore localStorage errors
  }

  // Apply theme immediately
  if (preferences.theme && preferences.theme !== 'auto') {
    document.documentElement.setAttribute('data-theme', preferences.theme)
  }

  return {
    getPreferences() {
      return { ...preferences }
    },

    async updatePreferences(updates: Partial<UserPreferences>) {
      preferences = { ...preferences, ...updates }

      // Apply theme immediately
      if (updates.theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
      } else if (updates.theme) {
        document.documentElement.setAttribute('data-theme', updates.theme)
      }

      // Save to localStorage
      try {
        localStorage.setItem('superinstance:preferences', JSON.stringify(preferences))
      } catch {}

      // Update backend if user is authenticated
      try {
        const userId = localStorage.getItem('superinstance:userId')
        if (userId) {
          await updateUserPreferences(userId, updates)
        }
      } catch (error) {
        console.error('Failed to sync preferences with server:', error)
      }

      return preferences
    },

    clearPreferences() {
      preferences = {
        theme: 'light',
        language: 'en',
        notifications: true,
        analytics: true,
        marketing: false
      }
      try {
        localStorage.removeItem('superinstance:preferences')
      } catch {}
    }
  }
}

export async function searchContent(query: string, limit?: number): Promise<SearchResult[]> {
  const response = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      limit,
    }),
  })

  if (!response.ok) {
    throw new Error('Search failed')
  }

  const data = await response.json()
  return data.data || []
}