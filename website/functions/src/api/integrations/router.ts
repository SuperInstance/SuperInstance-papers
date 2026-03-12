import { Hono } from 'hono'
import { type Env } from '../../env.d.ts'
import { requireAuth } from '../../shared/auth'
import { validateRequest, userPreferenceSchema, newsletterSignupSchema, eventSchema } from '../../shared/validation'
import { createCheckoutSessionSchema, setupIntentSchema, customerPortalSchema } from './stripe'
import { oauthCallbackSchema, oauthConnectSchema } from './oauth'
import { sendEmailSchema, subscribeToListSchema } from './email'
import { captureErrorSchema, addContextSchema, setUserSchema } from './sentry'
import { createScheduledEventSchema, listEventsSchema, rescheduleEventSchema, cancelEventSchema } from './calendly'

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

// Stripe payment integrations
router.post('/stripe/checkout', requireAuth, async (c) => {
  const validation = await validateRequest(createCheckoutSessionSchema, c)
  if (!validation.success) return validation.response

  const { priceId, successUrl, cancelUrl, metadata } = validation.data

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      maxNetworkRetries: 2,
    })

    const user = c.get('user')

    // Create or retrieve customer
    let customerId = metadata?.customerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.userId,
          ...metadata
        }
      })
      customerId = customer.id
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.userId,
        ...metadata
      },
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto'
      }
    })

    return c.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to create checkout session'
    }, 500)
  }
})

// Stripe webhook handler
router.post('/stripe/webhook', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('stripe-signature')

  if (!signature) {
    return c.json({ error: 'Missing signature' }, 400)
  }

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      maxNetworkRetries: 2,
    })

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET
    )

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object
        await handleSubscriptionCreated(session)
        break

      case 'customer.subscription.deleted':
        const subscription = event.data.object
        await handleSubscriptionCancelled(subscription)
        break

      case 'invoice.payment_succeeded':
        const invoice = event.data.object
        await handlePaymentSucceeded(invoice)
        break

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object
        await handlePaymentFailed(failedInvoice)
        break
    }

    return c.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return c.json({ error: 'Webhook error' }, 400)
  }
})

// Get customer portal session
router.post('/stripe/portal', requireAuth, async (c) => {
  const validation = await validateRequest(customerPortalSchema, c)
  if (!validation.success) return validation.response

  const { returnUrl, customerId } = validation.data

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      maxNetworkRetries: 2,
    })

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return c.json({
      success: true,
      data: {
        url: session.url
      }
    })
  } catch (error) {
    console.error('Stripe portal error:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to create customer portal session'
    }, 500)
  }
)

// OAuth provider integrations
router.post('/oauth/connect/:provider', requireAuth, async (c) => {
  const provider = c.req.param('provider')
  const validation = await validateRequest(oauthConnectSchema, c)
  if (!validation.success) return validation.response

  const { returnUrl = `${c.env.SITE_URL}/oauth/callback`, scopes = [] } = validation.data

  try {
    const providers = {
      google: {
        clientId: c.env.GOOGLE_CLIENT_ID,
        authUrl: 'https://accounts.google.com/oauth2/v2/auth',
        scope: scopes.length ? scopes.join(' ') : 'openid email profile'
      },
      github: {
        clientId: c.env.GITHUB_OAUTH_CLIENT_ID,
        authUrl: 'https://github.com/login/oauth/authorize',
        scope: scopes.length ? scopes.join(' ') : 'user:email'
      },
      microsoft: {
        clientId: c.env.MICROSOFT_CLIENT_ID,
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        scope: scopes.length ? scopes.join(' ') : 'openid email profile'
      }
    }

    const config = providers[provider as keyof typeof providers]
    if (!config) {
      return c.json({ error: 'Unsupported provider' }, 400)
    }

    if (!config.clientId) {
      return c.json({ error: 'Provider not configured' }, 500)
    }

    const state = crypto.randomUUID()
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${c.env.API_BASE_URL}/integrations/oauth/callback/${provider}`,
      response_type: 'code',
      scope: config.scope,
      state: state,
      access_type: 'offline',
      prompt: 'consent'
    })

    // Store state with user info for validation
    await c.env.CACHE.put(`oauth:state:${state}`, JSON.stringify({
      userId: c.get('user').userId,
      provider,
      returnUrl
    }), {
      expirationTtl: 10 * 60 // 10 minutes
    })

    return c.json({
      success: true,
      data: {
        authUrl: `${config.authUrl}?${params.toString()}`,
        state
      }
    })
  } catch (error) {
    console.error('OAuth connect error:', error)
    return c.json({ error: 'Internal error' }, 500)
  }
})

// OAuth callback handler
router.get('/oauth/callback/:provider', async (c) => {
  const provider = c.req.param('provider')
  const code = c.req.query('code')
  const state = c.req.query('state')

  if (!code || !state) {
    return c.text('Missing code or state', 400)
  }

  // Validate state
  const stateData = await c.env.CACHE.get(`oauth:state:${state}`)
  if (!stateData) {
    return c.text('Invalid or expired state', 400)
  }

  const { userId, returnUrl, provider: storedProvider } = JSON.parse(stateData)
  if (storedProvider !== provider) {
    return c.text('Provider mismatch', 400)
  }

  try {
    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(provider, code, c.env)

    // Get user info from provider
    const userInfo = await getUserInfo(provider, tokenResponse.access_token)

    // Store OAuth connection
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO oauth_connections (provider, provider_user_id, user_id, access_token, refresh_token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      provider,
      userInfo.id,
      userId,
      tokenResponse.access_token,
      tokenResponse.refresh_token,
      tokenResponse.expires_at || null,
      Date.now()
    ).run()

    // Delete state
    await c.env.CACHE.delete(`oauth:state:${state}`)

    return c.redirect(`${returnUrl}?success=true&provider=${provider}`)
  } catch (error) {
    console.error('OAuth callback error:', error)
    return c.redirect(`${returnUrl}?error=oauth_failed`)
  }
})

// Helper function to exchange code for token
async function exchangeCodeForToken(provider: string, code: string, env: Env) {
  const configs = {
    google: {
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    },
    github: {
      tokenUrl: 'https://github.com/login/oauth/access_token',
      clientId: env.GITHUB_OAUTH_CLIENT_ID,
      clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET
    },
    microsoft: {
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientId: env.MICROSOFT_CLIENT_ID,
      clientSecret: env.MICROSOFT_CLIENT_SECRET
    }
  }

  const config = configs[provider as keyof typeof configs]
  if (!config) throw new Error('Invalid provider')

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: `${env.API_BASE_URL}/integrations/oauth/callback/${provider}`
  })

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: params
  })

  if (!response.ok) {
    throw new Error('Token exchange failed')
  }

  return response.json()
}

// Email service integrations
router.post('/email/send', requireAuth, async (c) => {
  const validation = await validateRequest(sendEmailSchema, c)
  if (!validation.success) return validation.response

  const { to, from, subject, html, text, category, sendAt } = validation.data

  try {
    // Use SendGrid Email API
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: to.map(email => ({ email })),
          ...(category && { custom_args: { category } }),
          ...(sendAt && { send_at: sendAt })
        }],
        from: { email: from },
        subject,
        content: []
          .concat(html ? [{ type: 'text/html', value: html }] : [])
          .concat(text ? [{ type: 'text/plain', value: text }] : [])
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.errors?.[0]?.message || 'Failed to send email')
    }

    // Log email send
    await trackEvent('email_sent', {
      to: to.length,
      subject,
      category: category || 'general',
      sender: from
    }, c.env)

    return c.json({
      success: true,
      message: 'Email sent successfully'
    })
  } catch (error) {
    console.error('Email send error:', error)
    return c.json({
      error: 'Internal Error',
      message: error.message || 'Failed to send email'
    }, 500)
  }
})

// Get email templates
router.get('/email/templates', requireAuth, async (c) => {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/templates?generations=dynamic', {
      headers: {
        'Authorization': `Bearer ${c.env.SENDGRID_API_KEY}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch templates')
    }

    const data = await response.json()

    // Filter only our templates
    const templates = data.templates?.filter((t: any) =>
      t.name?.startsWith('superinstance-')
    ) || []

    return c.json({
      success: true,
      data: templates
    })
  } catch (error) {
    console.error('Failed to fetch email templates:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to fetch email templates'
    }, 500)
  }
})

// Subscribe to email list
router.post('/email/subscribe', async (c) => {
  const validation = await validateRequest(subscribeToListSchema, c)
  if (!validation.success) return validation.response

  const { listId, email, name, customFields } = validation.data

  try {
    const response = await fetch('https://api.sendgrid.com/v3/contactdb/recipients', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        email,
        first_name: name?.split(' ')[0],
        last_name: name?.split(' ').slice(1).join(' '),
        ...customFields
      }])
    })

    if (!response.ok) {
      throw new Error('Failed to add recipient')
    }

    // Add to list
    const recipient = (await response.json())[0]
    await fetch(`https://api.sendgrid.com/v3/contactdb/lists/${listId}/recipients/${recipient.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.SENDGRID_API_KEY}`
      }
    })

    // Track list signup
    await trackEvent('email_list_signup', {
      listId,
      email,
      source: 'website'
    }, c.env)

    return c.json({
      success: true,
      message: 'Successfully subscribed to list'
    })
  } catch (error) {
    console.error('Email subscription error:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to subscribe to list'
    }, 500)
  }
})

// Helper function to get user info from provider
async function getUserInfo(provider: string, accessToken: string) {
  const endpoints = {
    google: 'https://www.googleapis.com/oauth2/v2/userinfo',
    github: 'https://api.github.com/user',
    microsoft: 'https://graph.microsoft.com/v1.0/me'
  }

  const endpoint = endpoints[provider as keyof typeof endpoints]
  if (!endpoint) throw new Error('Invalid provider')

  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to get user info')
  }

  return response.json()
}

// Sentry error tracking
router.post('/errors/capture', async (c) => {
  const validation = await validateRequest(captureErrorSchema, c)
  if (!validation.success) return validation.response

  const { message, level, tags, extra, environment, release, userId } = validation.data

  try {
    // Capture error on server side
    const eventId = crypto.randomUUID()
    const timestamp = Math.floor(Date.now() / 1000)

    const event = {
      event_id: eventId,
      timestamp,
      platform: 'javascript',
      environment: environment || c.env.ENVIRONMENT,
      level: level || 'error',
      message,
      sdk: {
        name: 'superinstance-web',
        version: '1.0.0'
      },
      contexts: {
        app: {
          name: 'SuperInstance',
          version: '1.0.0',
          env: c.env.ENVIRONMENT
        },
        browser: {
          user_agent: c.req.header('user-agent') || 'unknown'
        },
        ...(extra && { extra })
      },
      tags: {
        component: 'website',
        source: 'frontend',
        ...tags
      },
      user: userId ? {
        id: userId,
        username: userId
      } : undefined,
      release
    }

    // Send to Sentry
    const response = await fetch(`${c.env.SENTRY_INGEST_URL}/api/${c.env.SENTRY_PROJECT_ID}/store/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_timestamp=${timestamp}, sentry_key=${c.env.SENTRY_DSN_KEY}, sentry_client=superinstance/1.0.0`
      },
      body: JSON.stringify(event)
    })

    if (!response.ok) {
      // Log locally as fallback
      console.error(`Sentry error capture: ${message}`, event)
    }

    return c.json({
      success: true,
      data: {
        eventId,
        captured: response.ok
      }
    })
  } catch (error) {
    console.error('Error sending to Sentry:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to capture error'
    }, 500)
  }
})

// Set custom context for error tracking
router.post('/errors/context', requireAuth, async (c) => {
  const validation = await validateRequest(addContextSchema, c)
  if (!validation.success) return validation.response

  const { key, value } = validation.data

  try {
    // Store context in KV for session tracking
    const userId = c.get('user').userId
    const contextKey = `sentry:context:${userId}:${key}`

    await c.env.CACHE.put(contextKey, JSON.stringify({
      value,
      timestamp: Date.now()
    }), {
      expirationTtl: 24 * 60 * 60 // 24 hours
    })

    return c.json({
      success: true,
      message: 'Context set successfully'
    })
  } catch (error) {
    console.error('Error setting context:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to set context'
    }, 500)
  }
})

// Set user context
router.post('/errors/user', async (c) => {
  const validation = await validateRequest(setUserSchema, c)
  if (!validation.success) return validation.response

  const userData = validation.data

  try {
    // Store user context in KV
    const sessionId = c.req.header('x-session-id') || crypto.randomUUID()
    const userKey = `sentry:user:${sessionId}`

    await c.env.CACHE.put(userKey, JSON.stringify(userData), {
      expirationTtl: 24 * 60 * 60 // 24 hours
    })

    return c.json({
      success: true,
      message: 'User context set successfully',
      data: { sessionId }
    })
  } catch (error) {
    console.error('Error setting user context:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to set user context'
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

// Calendly integration for demo scheduling
router.get('/calendly/event-types', requireAuth, async (c) => {
  try {
    const response = await fetch('https://api.calendly.com/event_types', {
      headers: {
        'Authorization': `Bearer ${c.env.CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch event types')
    }

    const data = await response.json()
    const eventTypes = data.collection?.map((et: any) => ({
      id: et.uri.split('/').pop(),
      name: et.name,
      slug: et.slug,
      duration: et.duration,
      description: et.description,
      scheduling_url: et.scheduling_url,
      active: et.active,
      custom_questions: et.custom_questions?.map((q: any) => ({
        position: q.position,
        type: q.type,
        name: q.name,
        required: q.required,
        answer_choices: q.answer_choices
      }))
    }))

    return c.json({
      success: true,
      data: eventTypes
    })
  } catch (error) {
    console.error('Failed to fetch Calendly event types:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to fetch event types'
    }, 500)
  }
})

// Schedule demo event
router.post('/calendly/schedule', async (c) => {
  const validation = await validateRequest(createScheduledEventSchema, c)
  if (!validation.success) return validation.response

  const { eventType, email, name, startTime, timezone = 'UTC', duration, questions, note } = validation.data

  try {
    // Create scheduling link if needed
    const eventTypeResponse = await fetch(`https://api.calendly.com/event_types`, {
      headers: {
        'Authorization': `Bearer ${c.env.CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const eventTypes = await eventTypeResponse.json()
    const matchingEventType = eventTypes.collection?.find(
      (et: any) => et.name.toLowerCase().includes('demo') || et.slug.includes('demo')
    )

    if (!matchingEventType) {
      return c.json({
        error: 'Bad Request',
        message: 'No suitable demo event type found'
      }, 400)
    }

    // Get organization URI from Calendly
    const meResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${c.env.CALENDLY_API_KEY}`
      }
    })

    const meData = await meResponse.json()
    const organizationUri = meData.resource.current_organization

    // Create one-off event
    const scheduleResponse = await fetch('https://api.calendly.com/scheduled_events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event_type: matchingEventType.uri,
        email,
        name,
        start_time: startTime,
        invitees: [{
          email,
          name,
          ...(questions && answers: questions.map(q => q.answer) })
        }]
      })
    })

    if (!scheduleResponse.ok) {
      throw new Error('Failed to schedule demo')
    }

    const eventData = await scheduleResponse.json()

    // Track demo scheduled
    await trackEvent('demo_scheduled', {
      eventId: eventData.resource.uri,
      name,
      email,
      eventType,
      startTime
    }, c.env)

    return c.json({
      success: true,
      data: {
        eventId: eventData.resource.uri,
        scheduled: true,
        inviteUrl: eventData.resource.rescheduled_url || matchingEventType.scheduling_url
      }
    })
  } catch (error) {
    console.error('Demo scheduling error:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to schedule demo'
    }, 500)
  }
})

// List user's scheduled demos
router.get('/calendly/events', requireAuth, async (c) => {
  const params = {
    count: parseInt(c.req.query('count') || '20'),
    status: c.req.query('status') || 'active',
    minStartTime: c.req.query('minStartTime') || new Date().toISOString()
  }

  try {
    // Get user's email from profile
    const userResult = await c.env.DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(c.get('user').userId).first()

    if (!userResult) {
      return c.json({
        error: 'Not Found',
        message: 'User not found'
      }, 404)
    }

    // Use webhook to get events for this user
    const events = await getScheduledDemosForUser(userResult.email)

    return c.json({
      success: true,
      data: events,
      count: events.length
    })
  } catch (error) {
    console.error('Failed to fetch user events:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to fetch scheduled demos'
    }, 500)
  }
})

// Get scheduled events for user
async function getScheduledDemosForUser(email: string) {
  // This would typically query your local database
  // For now, return mock data
  return []
}

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

// Stripe webhook handlers
async function handleSubscriptionCreated(session: any) {
  const userId = session.metadata?.userId
  if (userId) {
    // Update user subscription status in database
    console.log('Subscription created for user:', userId)
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  const customerId = subscription.customer
  console.log('Subscription cancelled for customer:', customerId)
}

async function handlePaymentSucceeded(invoice: any) {
  const customerId = invoice.customer
  console.log('Payment succeeded for customer:', customerId)
}

async function handlePaymentFailed(invoice: any) {
  const customerId = invoice.customer
  console.log('Payment failed for customer:', customerId)
}

export default router