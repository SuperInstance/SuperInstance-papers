import { Hono } from 'hono'
import { type Env } from '../../env.d.ts'
import { requireAuth } from '../../shared/auth'
import { validateRequest, userPreferenceSchema, newsletterSignupSchema } from '../../shared/validation'

const router = new Hono<{ Bindings: Env }>()

// User preferences management
router.get('/preferences/:userId', requireAuth, async (c) => {
  const userId = c.req.param('userId')

  try {
    // Check if user is requesting their own preferences
    const user = c.get('user')
    if (user.userId !== userId) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    // Get preferences from KV storage
    const preferences = await c.env.USER_PREFERENCES.get(`prefs:${userId}`)

    if (!preferences) {
      return c.json({
        success: true,
        data: {
          theme: 'light',
          language: 'en',
          notifications: true,
          analytics: true,
          marketing: false
        }
      })
    }

    return c.json({
      success: true,
      data: JSON.parse(preferences)
    })
  } catch (error) {
    console.error('Failed to get user preferences:', error)
    return c.json({ error: 'Internal Error', message: 'Failed to get preferences' }, 500)
  }
})

// Update user preferences
router.put('/preferences/:userId', requireAuth, async (c) => {
  const validation = await validateRequest(userPreferenceSchema, c)
  if (!validation.success) return validation.response

  const userId = c.req.param('userId')
  const { theme, language, notifications, analytics, marketing } = validation.data

  // Check authorization
  const user = c.get('user')
  if (user.userId !== userId) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  try {
    const preferences = {
      theme,
      language,
      notifications,
      analytics,
      marketing,
      updatedAt: Date.now()
    }

    // Store in KV with TTL of 30 days
    await c.env.USER_PREFERENCES.put(`prefs:${userId}`, JSON.stringify(preferences), {
      expirationTtl: 30 * 24 * 60 * 60 // 30 days
    })

    return c.json({
      success: true,
      message: 'Preferences updated successfully',
      data: preferences
    })
  } catch (error) {
    console.error('Failed to update user preferences:', error)
    return c.json({ error: 'Internal Error', message: 'Failed to update preferences' }, 500)
  }
})

// Newsletter signup endpoint
router.post('/newsletter', async (c) => {
  const validation = await validateRequest(newsletterSignupSchema, c)
  if (!validation.success) return validation.response

  const { email, name, source } = validation.data

  try {
    // Check if already subscribed (KV cache)
    const existing = await c.env.NEWSLETTER_CACHE.get(`subscribed:${email}`)
    if (existing) {
      return c.json({
        success: true,
        message: 'Already subscribed',
        data: { alreadySubscribed: true }
      })
    }

    // Create newsletter subscription using Buttondown API
    const response = await fetch('https://api.buttondown.email/v1/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${c.env.BUTTONDOWN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        metadata: {
          name: name || null,
          source: source || 'website',
          signup_date: new Date().toISOString()
        },
        tags: ['superinstance', 'spreadsheet-ai']
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to subscribe')
    }

    const subscriber = await response.json()

    // Cache subscription status
    await c.env.NEWSLETTER_CACHE.put(`subscribed:${email}`, 'true', {
      expirationTtl: 365 * 24 * 60 * 60 // 1 year
    })

    // Track newsletter signup event
    await trackEvent('newsletter_signup', {
      email: email,
      source: source || 'website',
      subscriberId: subscriber.id
    }, c.env)

    return c.json({
      success: true,
      message: 'Successfully subscribed to newsletter',
      data: { subscriberId: subscriber.id }
    })
  } catch (error) {
    console.error('Newsletter signup failed:', error)
    return c.json({
      error: 'Internal Error',
      message: error.message || 'Failed to subscribe to newsletter'
    }, 500)
  }
})

// GitHub repository stats endpoint
router.get('/github/repos', async (c) => {
  try {
    // Get repos from cache first
    const cacheKey = 'github:repos'
    const cached = await c.env.GITHUB_CACHE.get(cacheKey)

    if (cached) {
      const data = JSON.parse(cached)
      // Check cache age (5 minutes)
      if (Date.now() - data.cachedAt < 5 * 60 * 1000) {
        return c.json({
          success: true,
          data: data.repos,
          cached: true
        })
      }
    }

    // Repositories to track
    const repos = [
      'casey/SuperInstance',
      'casey/LOG-Tensor',
      'casey/POLLN'
    ]

    const repoData = []

    for (const repo of repos) {
      const response = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'SuperInstance-Website/1.0',
          'Authorization': c.env.GITHUB_TOKEN ? `Bearer ${c.env.GITHUB_TOKEN}` : undefined
        }
      })

      if (response.ok) {
        const data = await response.json()
        repoData.push({
          name: data.name,
          fullName: data.full_name,
          description: data.description,
          stars: data.stargazers_count,
          forks: data.forks_count,
          issues: data.open_issues_count,
          language: data.language,
          license: data.license?.name,
          updatedAt: data.updated_at,
          url: data.html_url
        })
      }
    }

    // Cache results
    await c.env.GITHUB_CACHE.put(cacheKey, JSON.stringify({
      repos: repoData,
      cachedAt: Date.now()
    }), {
      expirationTtl: 5 * 60 // 5 minutes
    })

    return c.json({
      success: true,
      data: repoData,
      cached: false
    })
  } catch (error) {
    console.error('Failed to fetch GitHub repos:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to fetch repository data'
    }, 500)
  }
})

// Analytics integration endpoint
router.post('/analytics/track', async (c) => {
  const validation = await validateRequest(eventSchema, c)
  if (!validation.success) return validation.response

  const { eventName, eventData, category } = validation.data

  try {
    // Track in our own analytics
    await trackEvent(eventName, eventData, c.env, category)

    // If analytics are enabled and we have Plausible configured, send there too
    if (c.env.PLAUSIBLE_API_KEY && c.env.PLAUSIBLE_SITE_ID) {
      const plausibleData = {
        name: eventName,
        domain: c.env.PLAUSIBLE_SITE_ID,
        url: eventData?.url || `${c.env.SITE_URL}/track`,
        referrer: eventData?.referrer,
        props: eventData
      }

      // Fire and forget to Plausible
      c.executionCtx.waitUntil(
        fetch(`https://plausible.io/api/event`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${c.env.PLAUSIBLE_API_KEY}`,
            'Content-Type': 'application/json',
            'User-Agent': c.req.header('user-agent') || 'SuperInstance-Website/1.0'
          },
          body: JSON.stringify(plausibleData)
        }).catch(err => console.error('Plausible tracking failed:', err))
      )
    }

    return c.json({
      success: true,
      message: 'Event tracked successfully'
    })
  } catch (error) {
    console.error('Analytics tracking failed:', error)
    return c.json({ error: 'Internal Error', message: 'Failed to track event' }, 500)
  }
})

// Search functionality using Cloudflare AI
router.post('/search', async (c) => {
  const { query, limit = 10 } = await c.req.json()

  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    return c.json({ error: 'Bad Request', message: 'Query must be at least 3 characters' }, 400)
  }

  try {
    // Implement vector search using our MCP search
    const searchResults = await fetch(`${c.env.API_BASE_URL}/mcp/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.env.ADMIN_API_KEY}`
      },
      body: JSON.stringify({
        query: query,
        limit: Math.min(Number(limit), 50),
        format: 'json'
      })
    })

    if (!searchResults.ok) {
      throw new Error('Search service unavailable')
    }

    const results = await searchResults.json()

    return c.json({
      success: true,
      data: results,
      query,
      resultCount: results.length
    })
  } catch (error) {
    console.error('Search failed:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Search service temporarily unavailable'
    }, 503)
  }
})

// Helper function to track events
async function trackEvent(eventName: string, eventData: any, env: Env, category = 'custom') {
  const id = crypto.randomUUID()
  const now = Date.now()

  await env.DB.prepare(`
    INSERT INTO analytics_events (id, event_name, event_data, category, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    id,
    eventName,
    JSON.stringify(eventData),
    category,
    now
  ).run()
}

// Helper function to update real-time analytics in KV
async function updateRealtimeAnalytics(path: string, userId: string | null, env: Env) {
  const key = `analytics:realtime:${new Date().toISOString().slice(0, 10)}`

  // Increment page views
  await env.CACHE.increment(key + ':pageviews')

  // Track unique visitors
  if (userId) {
    await env.CACHE.put(key + ':visitor:' + userId, '1', {
      expirationTtl: 24 * 60 * 60 // 24 hours
    })
  }

  // Track popular pages
  const popularKey = key + `:page:${path}`
  await env.CACHE.increment(popularKey)
}

export default router