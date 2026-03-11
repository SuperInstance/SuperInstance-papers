import { Hono } from 'hono'
import { type Env } from '../../env.d.ts'
import { requireAuth } from '../../shared/auth'
import { pageViewSchema, eventSchema, validateRequest } from '../../shared/validation'
import { parseJSON, serializeJSON } from '../../shared/db'

const router = new Hono<{ Bindings: Env }>()

// Track page view
router.post('/pageview', async (c) => {
  // This endpoint doesn't require authentication for anonymous tracking
  // but will associate with user if authenticated

  const validation = await validateRequest(pageViewSchema, c)
  if (!validation.success) return validation.response

  const { path, title, referrer, duration } = validation.data

  try {
    // Get user ID if authenticated
    const authHeader = c.req.header('Authorization')
    let userId: string | null = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // In a real implementation, decode JWT to get user ID
      // For now, we'll extract from context if available
      const user = c.get('user')
      userId = user?.id || null
    }

    // Record page view
    const id = crypto.randomUUID()
    const now = Date.now()

    await c.env.DB.prepare(`
      INSERT INTO analytics_events (id, user_id, event_name, event_data, category, path, referrer, user_agent, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      userId,
      'page_view',
      serializeJSON({ title, duration }),
      'navigation',
      path,
      referrer || null,
      c.req.header('user-agent') || null,
      c.req.header('cf-connecting-ip') || null,
      now
    ).run()

    // Update real-time analytics in KV
    await updateRealtimeAnalytics(path, userId, c.env)

    return c.json({
      success: true,
      message: 'Page view recorded',
      data: {
        eventId: id,
        timestamp: now,
      },
    })
  } catch (error) {
    console.error('Failed to record page view:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to record page view',
    }, 500)
  }
})

// Track custom event
router.post('/event', async (c) => {
  const validation = await validateRequest(eventSchema, c)
  if (!validation.success) return validation.response

  const { eventName, eventData, category } = validation.data

  try {
    // Get user ID if authenticated
    const authHeader = c.req.header('Authorization')
    let userId: string | null = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const user = c.get('user')
      userId = user?.id || null
    }

    // Record event
    const id = crypto.randomUUID()
    const now = Date.now()

    await c.env.DB.prepare(`
      INSERT INTO analytics_events (id, user_id, event_name, event_data, category, path, referrer, user_agent, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      userId,
      eventName,
      eventData ? serializeJSON(eventData) : null,
      category || 'custom',
      c.req.url,
      c.req.header('referer') || null,
      c.req.header('user-agent') || null,
      c.req.header('cf-connecting-ip') || null,
      now
    ).run()

    // Update event counters in KV
    await updateEventCounters(eventName, category, userId, c.env)

    return c.json({
      success: true,
      message: 'Event recorded',
      data: {
        eventId: id,
        timestamp: now,
      },
    })
  } catch (error) {
    console.error('Failed to record event:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to record event',
    }, 500)
  }
})

// Get analytics summary (admin only)
router.get('/summary', requireAuth(), async (c) => {
  const user = c.get('user')

  // Check if user is admin (in real implementation, check user role)
  // For now, we'll allow any authenticated user

  try {
    // Get time range from query parameters
    const timeRange = c.req.query('range') || '7d' // 7d, 30d, 90d, all
    const now = Date.now()
    let startTime: number

    switch (timeRange) {
      case '24h':
        startTime = now - (24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = now - (7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = now - (30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startTime = now - (90 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = 0 // all time
    }

    // Get page view statistics
    const pageViews = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_views,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT path) as unique_pages,
        AVG(
          CASE
            WHEN json_extract(event_data, '$.duration') IS NOT NULL
            THEN json_extract(event_data, '$.duration')
            ELSE NULL
          END
        ) as avg_duration
      FROM analytics_events
      WHERE event_name = 'page_view' AND created_at >= ?
    `).bind(startTime).first()

    // Get event statistics
    const events = await c.env.DB.prepare(`
      SELECT
        category,
        event_name,
        COUNT(*) as count
      FROM analytics_events
      WHERE created_at >= ?
      GROUP BY category, event_name
      ORDER BY count DESC
      LIMIT 20
    `).bind(startTime).all()

    // Get user registration statistics
    const userStats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_users,
        AVG(? - created_at) / (1000 * 60 * 60 * 24) as avg_account_age_days
      FROM users
    `).bind(startTime, now).first()

    // Get learning progress statistics
    const learningStats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_progress_records,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_tutorials,
        AVG(score) as avg_score,
        AVG(attempts) as avg_attempts
      FROM progress
      WHERE last_attempt >= ?
    `).bind(startTime).first()

    // Get popular content
    const popularContent = await c.env.DB.prepare(`
      SELECT
        content_id,
        content_type,
        COUNT(*) as access_count,
        AVG(duration) as avg_duration,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_count
      FROM content_access
      WHERE accessed_at >= ?
      GROUP BY content_id, content_type
      ORDER BY access_count DESC
      LIMIT 10
    `).bind(startTime).all()

    // Get real-time data from KV
    const realtimeKey = `analytics:realtime:${Math.floor(now / (60 * 1000))}` // Minute precision
    const realtimeData = await c.env.CACHE.get(realtimeKey)
    const realtime = realtimeData ? parseJSON(realtimeData) : {
      activeUsers: 0,
      pageViews: 0,
      events: 0,
    }

    return c.json({
      success: true,
      data: {
        timeRange,
        period: {
          start: startTime,
          end: now,
        },
        pageViews: {
          total: pageViews?.total_views || 0,
          uniqueUsers: pageViews?.unique_users || 0,
          uniquePages: pageViews?.unique_pages || 0,
          avgDuration: pageViews?.avg_duration || 0,
        },
        events: events.results || [],
        users: {
          total: userStats?.total_users || 0,
          new: userStats?.new_users || 0,
          avgAccountAge: userStats?.avg_account_age_days || 0,
        },
        learning: {
          totalProgress: learningStats?.total_progress_records || 0,
          completedTutorials: learningStats?.completed_tutorials || 0,
          avgScore: learningStats?.avg_score || 0,
          avgAttempts: learningStats?.avg_attempts || 0,
        },
        popularContent: popularContent.results?.map((item: any) => ({
          contentId: item.content_id,
          contentType: item.content_type,
          accessCount: item.access_count,
          avgDuration: item.avg_duration,
          completionRate: item.access_count > 0 ? (item.completed_count / item.access_count) * 100 : 0,
        })) || [],
        realtime,
      },
    })
  } catch (error) {
    console.error('Failed to get analytics summary:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to retrieve analytics summary',
    }, 500)
  }
})

// Get learning analytics
router.get('/learning', requireAuth(), async (c) => {
  const user = c.get('user')

  try {
    // Get user's learning progress
    const progress = await c.env.DB.prepare(`
      SELECT
        tutorial_id,
        completed,
        completion_date,
        score,
        attempts,
        last_attempt
      FROM progress
      WHERE user_id = ?
      ORDER BY last_attempt DESC
    `).bind(user.id).all()

    // Get content access history
    const contentAccess = await c.env.DB.prepare(`
      SELECT
        content_id,
        content_type,
        accessed_at,
        duration,
        completed
      FROM content_access
      WHERE user_id = ?
      ORDER BY accessed_at DESC
      LIMIT 50
    `).bind(user.id).all()

    // Calculate learning statistics
    const totalTutorials = progress.results?.length || 0
    const completedTutorials = progress.results?.filter((p: any) => p.completed).length || 0
    const totalScore = progress.results
      ?.filter((p: any) => p.score !== null)
      .reduce((sum: number, p: any) => sum + p.score, 0) || 0
    const scoredTutorials = progress.results?.filter((p: any) => p.score !== null).length || 0
    const averageScore = scoredTutorials > 0 ? totalScore / scoredTutorials : null

    // Calculate time spent learning
    const totalLearningTime = contentAccess.results
      ?.filter((a: any) => a.duration !== null)
      .reduce((sum: number, a: any) => sum + a.duration, 0) || 0

    // Get recent activity
    const recentActivity = await c.env.DB.prepare(`
      SELECT
        event_name,
        path,
        created_at
      FROM analytics_events
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).bind(user.id).all()

    // Get learning streaks from KV
    const streakKey = `user:${user.id}:learning:streak`
    const streakData = await c.env.CACHE.get(streakKey)
    const streak = streakData ? parseJSON(streakData) : {
      currentStreak: 0,
      longestStreak: 0,
      lastActive: null,
    }

    return c.json({
      success: true,
      data: {
        overview: {
          totalTutorials,
          completedTutorials,
          completionRate: totalTutorials > 0 ? (completedTutorials / totalTutorials) * 100 : 0,
          averageScore,
          totalLearningTime: Math.floor(totalLearningTime / 60), // Convert to minutes
          activeDays: calculateActiveDays(progress.results || []),
        },
        progress: progress.results?.map((p: any) => ({
          tutorialId: p.tutorial_id,
          completed: p.completed,
          completionDate: p.completion_date,
          score: p.score,
          attempts: p.attempts,
          lastAttempt: p.last_attempt,
        })) || [],
        recentContent: contentAccess.results?.map((a: any) => ({
          contentId: a.content_id,
          contentType: a.content_type,
          accessedAt: a.accessed_at,
          duration: a.duration,
          completed: a.completed,
        })) || [],
        recentActivity: recentActivity.results?.map((a: any) => ({
          eventName: a.event_name,
          path: a.path,
          timestamp: a.created_at,
        })) || [],
        streaks: streak,
        recommendations: generateRecommendations(progress.results || [], contentAccess.results || []),
      },
    })
  } catch (error) {
    console.error('Failed to get learning analytics:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to retrieve learning analytics',
    }, 500)
  }
})

// Helper functions
async function updateRealtimeAnalytics(path: string, userId: string | null, env: Env): Promise<void> {
  const now = Date.now()
  const minuteKey = Math.floor(now / (60 * 1000)) // Minute precision
  const realtimeKey = `analytics:realtime:${minuteKey}`

  // Get current realtime data
  const currentData = await env.CACHE.get(realtimeKey)
  const realtime = currentData ? parseJSON(currentData) : {
    activeUsers: new Set<string>(),
    pageViews: 0,
    events: 0,
    paths: {},
  }

  // Update counters
  realtime.pageViews = (realtime.pageViews || 0) + 1

  if (userId) {
    realtime.activeUsers = realtime.activeUsers || new Set()
    realtime.activeUsers.add(userId)
    // Convert Set to Array for JSON serialization
    realtime.activeUsersArray = Array.from(realtime.activeUsers)
  }

  // Track path popularity
  realtime.paths = realtime.paths || {}
  realtime.paths[path] = (realtime.paths[path] || 0) + 1

  // Store updated data
  await env.CACHE.put(realtimeKey, serializeJSON(realtime), {
    expirationTtl: 60 * 5, // 5 minutes
  })
}

async function updateEventCounters(eventName: string, category: string | undefined, userId: string | null, env: Env): Promise<void> {
  const now = Date.now()
  const hourKey = Math.floor(now / (60 * 60 * 1000)) // Hour precision

  // Update event counter
  const eventKey = `analytics:events:${hourKey}:${category || 'uncategorized'}:${eventName}`
  const currentCount = await env.CACHE.get(eventKey)
  const newCount = (parseInt(currentCount || '0', 10)) + 1

  await env.CACHE.put(eventKey, newCount.toString(), {
    expirationTtl: 60 * 60 * 24, // 24 hours
  })

  // Update user event counter if authenticated
  if (userId) {
    const userEventKey = `user:${userId}:events:${eventName}`
    const userCurrentCount = await env.CACHE.get(userEventKey)
    const userNewCount = (parseInt(userCurrentCount || '0', 10)) + 1

    await env.CACHE.put(userEventKey, userNewCount.toString(), {
      expirationTtl: 60 * 60 * 24 * 30, // 30 days
    })
  }
}

function calculateActiveDays(progress: any[]): number {
  const uniqueDays = new Set<string>()

  progress.forEach((p: any) => {
    if (p.last_attempt) {
      const date = new Date(p.last_attempt).toISOString().split('T')[0]
      uniqueDays.add(date)
    }
  })

  return uniqueDays.size
}

function generateRecommendations(progress: any[], contentAccess: any[]): any[] {
  const recommendations = []

  // Check for incomplete tutorials
  const incompleteTutorials = progress.filter((p: any) => !p.completed)
  if (incompleteTutorials.length > 0) {
    recommendations.push({
      type: 'continue',
      title: 'Continue Learning',
      description: `You have ${incompleteTutorials.length} incomplete tutorials. Pick up where you left off!`,
      priority: 'high',
      action: {
        type: 'navigate',
        path: '/tutorials',
      },
    })
  }

  // Check for recently accessed content
  const recentContent = contentAccess
    .sort((a: any, b: any) => b.accessed_at - a.accessed_at)
    .slice(0, 3)

  if (recentContent.length > 0) {
    recommendations.push({
      type: 'review',
      title: 'Review Recent Content',
      description: 'Revisit content you recently accessed to reinforce your learning.',
      priority: 'medium',
      items: recentContent.map((c: any) => ({
        contentId: c.content_id,
        contentType: c.content_type,
      })),
    })
  }

  // Check for learning streak
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const activeToday = progress.some((p: any) => {
    const date = new Date(p.last_attempt).toISOString().split('T')[0]
    return date === today
  })
  const activeYesterday = progress.some((p: any) => {
    const date = new Date(p.last_attempt).toISOString().split('T')[0]
    return date === yesterday
  })

  if (!activeToday && activeYesterday) {
    recommendations.push({
      type: 'streak',
      title: 'Maintain Your Streak!',
      description: 'Complete a tutorial today to keep your learning streak alive.',
      priority: 'high',
      action: {
        type: 'navigate',
        path: '/tutorials/getting-started',
      },
    })
  }

  // Suggest related content based on progress
  const completedTutorials = progress.filter((p: any) => p.completed)
  if (completedTutorials.length >= 3) {
    recommendations.push({
      type: 'advance',
      title: 'Ready for Advanced Topics',
      description: 'Based on your progress, you might enjoy these advanced tutorials.',
      priority: 'low',
      suggestions: ['rate-based-change', 'confidence-cascade', 'tile-algebra'],
    })
  }

  return recommendations
}

export default router