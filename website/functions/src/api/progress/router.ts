import { Hono } from 'hono'
import { type Env } from '../../env.d.ts'
import { requireAuth } from '../../shared/auth'
import { tutorialProgressSchema, pathwayProgressSchema, validateRequest } from '../../shared/validation'
import { getProgress, updateProgress, parseJSON, serializeJSON } from '../../shared/db'

const router = new Hono<{ Bindings: Env }>()

// Get learning overview
router.get('/overview', requireAuth(), async (c) => {
  const user = c.get('user')

  try {
    // Get tutorial progress
    const tutorialProgress = await c.env.DB.prepare(`
      SELECT tutorial_id, completed, completion_date, score, attempts, last_attempt
      FROM progress
      WHERE user_id = ?
      ORDER BY last_attempt DESC
    `).bind(user.id).all()

    // Get pathway progress
    const pathwayProgress = await c.env.DB.prepare(`
      SELECT pathway_id, current_step, completed_steps, started_at, completed_at
      FROM pathways
      WHERE user_id = ?
      ORDER BY started_at DESC
    `).bind(user.id).all()

    // Calculate statistics
    const totalTutorials = tutorialProgress.results?.length || 0
    const completedTutorials = tutorialProgress.results?.filter((t: any) => t.completed).length || 0
    const totalPathways = pathwayProgress.results?.length || 0
    const completedPathways = pathwayProgress.results?.filter((p: any) => p.completed_at).length || 0

    // Calculate average score
    const scores = tutorialProgress.results
      ?.filter((t: any) => t.score !== null)
      .map((t: any) => t.score) || []
    const averageScore = scores.length > 0
      ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
      : null

    return c.json({
      success: true,
      data: {
        overview: {
          totalTutorials,
          completedTutorials,
          completionRate: totalTutorials > 0 ? (completedTutorials / totalTutorials) * 100 : 0,
          totalPathways,
          completedPathways,
          averageScore,
          lastActive: Math.max(
            ...tutorialProgress.results?.map((t: any) => t.last_attempt || 0) || [0],
            ...pathwayProgress.results?.map((p: any) => p.started_at || 0) || [0]
          ),
        },
        tutorials: tutorialProgress.results?.map((t: any) => ({
          tutorialId: t.tutorial_id,
          completed: t.completed,
          completionDate: t.completion_date,
          score: t.score,
          attempts: t.attempts,
          lastAttempt: t.last_attempt,
        })) || [],
        pathways: pathwayProgress.results?.map((p: any) => ({
          pathwayId: p.pathway_id,
          currentStep: p.current_step,
          completedSteps: p.completed_steps ? parseJSON(p.completed_steps) : [],
          startedAt: p.started_at,
          completedAt: p.completed_at,
        })) || [],
      },
    })
  } catch (error) {
    console.error('Failed to get learning overview:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to retrieve learning overview',
    }, 500)
  }
})

// Get tutorial progress
router.get('/tutorials', requireAuth(), async (c) => {
  const user = c.get('user')
  const tutorialId = c.req.query('tutorialId')

  try {
    let query: string
    let params: any[]

    if (tutorialId) {
      // Get specific tutorial progress
      query = `
        SELECT * FROM progress
        WHERE user_id = ? AND tutorial_id = ?
      `
      params = [user.id, tutorialId]
    } else {
      // Get all tutorial progress
      query = `
        SELECT * FROM progress
        WHERE user_id = ?
        ORDER BY last_attempt DESC
      `
      params = [user.id]
    }

    const result = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      data: result.results?.map((row: any) => ({
        tutorialId: row.tutorial_id,
        completed: row.completed,
        completionDate: row.completion_date,
        score: row.score,
        attempts: row.attempts,
        lastAttempt: row.last_attempt,
        stateData: row.state_data ? parseJSON(row.state_data) : null,
      })) || [],
    })
  } catch (error) {
    console.error('Failed to get tutorial progress:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to retrieve tutorial progress',
    }, 500)
  }
})

// Update tutorial progress
router.post('/tutorials/:tutorialId', requireAuth(), async (c) => {
  const user = c.get('user')
  const tutorialId = c.req.param('tutorialId')

  const validation = await validateRequest(tutorialProgressSchema, c)
  if (!validation.success) return validation.response

  const { completed, score, stateData } = validation.data

  try {
    // Get existing progress
    const existing = await getProgress(user.id, tutorialId, c.env)

    // Prepare progress data
    const now = Date.now()
    const progressData = {
      user_id: user.id,
      tutorial_id: tutorialId,
      completed,
      completion_date: completed ? now : (existing?.completion_date || null),
      score: score !== undefined ? score : (existing?.score || null),
      attempts: (existing?.attempts || 0) + 1,
      last_attempt: now,
      state_data: stateData ? serializeJSON(stateData) : (existing?.state_data || null),
    }

    // Update progress
    const progressId = await updateProgress(progressData, c.env)

    // If this is a completion, check for achievements
    if (completed && !existing?.completed) {
      await checkAchievements(user.id, tutorialId, c.env)
    }

    return c.json({
      success: true,
      message: 'Progress updated successfully',
      data: {
        progressId,
        tutorialId,
        completed,
        score: progressData.score,
        attempts: progressData.attempts,
        lastAttempt: progressData.last_attempt,
      },
    })
  } catch (error) {
    console.error('Failed to update tutorial progress:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to update tutorial progress',
    }, 500)
  }
})

// Get pathway progress
router.get('/pathways', requireAuth(), async (c) => {
  const user = c.get('user')
  const pathwayId = c.req.query('pathwayId')

  try {
    let query: string
    let params: any[]

    if (pathwayId) {
      // Get specific pathway progress
      query = `
        SELECT * FROM pathways
        WHERE user_id = ? AND pathway_id = ?
      `
      params = [user.id, pathwayId]
    } else {
      // Get all pathway progress
      query = `
        SELECT * FROM pathways
        WHERE user_id = ?
        ORDER BY started_at DESC
      `
      params = [user.id]
    }

    const result = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      data: result.results?.map((row: any) => ({
        pathwayId: row.pathway_id,
        currentStep: row.current_step,
        completedSteps: row.completed_steps ? parseJSON(row.completed_steps) : [],
        startedAt: row.started_at,
        completedAt: row.completed_at,
      })) || [],
    })
  } catch (error) {
    console.error('Failed to get pathway progress:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to retrieve pathway progress',
    }, 500)
  }
})

// Update pathway progress
router.post('/pathways/:pathwayId', requireAuth(), async (c) => {
  const user = c.get('user')
  const pathwayId = c.req.param('pathwayId')

  const validation = await validateRequest(pathwayProgressSchema, c)
  if (!validation.success) return validation.response

  const { currentStep, completedSteps } = validation.data

  try {
    // Check if pathway progress exists
    const existing = await c.env.DB.prepare(`
      SELECT * FROM pathways
      WHERE user_id = ? AND pathway_id = ?
    `).bind(user.id, pathwayId).first()

    const now = Date.now()

    if (existing) {
      // Update existing pathway progress
      const completedAt = currentStep >= 10 ? now : null // Assuming 10 steps per pathway

      await c.env.DB.prepare(`
        UPDATE pathways
        SET current_step = ?, completed_steps = ?, completed_at = ?, updated_at = ?
        WHERE user_id = ? AND pathway_id = ?
      `).bind(
        currentStep,
        completedSteps ? serializeJSON(completedSteps) : existing.completed_steps,
        completedAt,
        now,
        user.id,
        pathwayId
      ).run()

      // Check for pathway completion achievement
      if (completedAt && !existing.completed_at) {
        await checkPathwayAchievement(user.id, pathwayId, c.env)
      }
    } else {
      // Create new pathway progress
      const id = crypto.randomUUID()
      await c.env.DB.prepare(`
        INSERT INTO pathways (id, user_id, pathway_id, current_step, completed_steps, started_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        user.id,
        pathwayId,
        currentStep,
        completedSteps ? serializeJSON(completedSteps) : null,
        now
      ).run()
    }

    return c.json({
      success: true,
      message: 'Pathway progress updated successfully',
      data: {
        pathwayId,
        currentStep,
        completedSteps,
      },
    })
  } catch (error) {
    console.error('Failed to update pathway progress:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to update pathway progress',
    }, 500)
  }
})

// Get user achievements
router.get('/achievements', requireAuth(), async (c) => {
  const user = c.get('user')

  try {
    // In a real implementation, this would query an achievements table
    // For now, we'll calculate achievements based on progress

    // Get user progress for achievement calculation
    const tutorialProgress = await c.env.DB.prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
      FROM progress
      WHERE user_id = ?
    `).bind(user.id).first()

    const pathwayProgress = await c.env.DB.prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) as completed
      FROM pathways
      WHERE user_id = ?
    `).bind(user.id).first()

    // Calculate achievements
    const achievements = []

    // Tutorial achievements
    if (tutorialProgress && tutorialProgress.completed >= 1) {
      achievements.push({
        id: 'first-tutorial',
        name: 'First Steps',
        description: 'Complete your first tutorial',
        unlockedAt: Date.now(),
        category: 'tutorials',
      })
    }

    if (tutorialProgress && tutorialProgress.completed >= 5) {
      achievements.push({
        id: 'tutorial-master',
        name: 'Tutorial Master',
        description: 'Complete 5 tutorials',
        unlockedAt: Date.now(),
        category: 'tutorials',
      })
    }

    // Pathway achievements
    if (pathwayProgress && pathwayProgress.completed >= 1) {
      achievements.push({
        id: 'pathway-explorer',
        name: 'Pathway Explorer',
        description: 'Complete your first learning pathway',
        unlockedAt: Date.now(),
        category: 'pathways',
      })
    }

    // Consistency achievement (based on last activity)
    const lastActivity = await c.env.DB.prepare(`
      SELECT MAX(last_attempt) as last_tutorial,
             MAX(started_at) as last_pathway
      FROM (
        SELECT last_attempt FROM progress WHERE user_id = ?
        UNION ALL
        SELECT started_at FROM pathways WHERE user_id = ?
      )
    `).bind(user.id, user.id).first()

    const daysSinceLastActivity = lastActivity
      ? Math.floor((Date.now() - Math.max(lastActivity.last_tutorial || 0, lastActivity.last_pathway || 0)) / (1000 * 60 * 60 * 24))
      : 999

    if (daysSinceLastActivity <= 7) {
      achievements.push({
        id: 'weekly-learner',
        name: 'Weekly Learner',
        description: 'Active for 7 consecutive days',
        unlockedAt: Date.now(),
        category: 'consistency',
      })
    }

    return c.json({
      success: true,
      data: {
        achievements,
        stats: {
          tutorialsCompleted: tutorialProgress?.completed || 0,
          totalTutorials: tutorialProgress?.total || 0,
          pathwaysCompleted: pathwayProgress?.completed || 0,
          totalPathways: pathwayProgress?.total || 0,
        },
      },
    })
  } catch (error) {
    console.error('Failed to get achievements:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to retrieve achievements',
    }, 500)
  }
})

// Helper functions for achievement checking
async function checkAchievements(userId: string, tutorialId: string, env: Env): Promise<void> {
  // Check for specific tutorial achievements
  const tutorialCount = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM progress
    WHERE user_id = ? AND completed = 1
  `).bind(userId).first()

  if (tutorialCount && tutorialCount.count === 1) {
    // First tutorial completed
    await recordAchievement(userId, 'first-tutorial', env)
  }

  if (tutorialCount && tutorialCount.count === 5) {
    // Five tutorials completed
    await recordAchievement(userId, 'tutorial-master', env)
  }

  // Check for specific tutorial type achievements
  if (tutorialId.includes('superinstance')) {
    await recordAchievement(userId, 'superinstance-learner', env)
  }
}

async function checkPathwayAchievement(userId: string, pathwayId: string, env: Env): Promise<void> {
  const pathwayCount = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM pathways
    WHERE user_id = ? AND completed_at IS NOT NULL
  `).bind(userId).first()

  if (pathwayCount && pathwayCount.count === 1) {
    // First pathway completed
    await recordAchievement(userId, 'pathway-explorer', env)
  }
}

async function recordAchievement(userId: string, achievementId: string, env: Env): Promise<void> {
  // In a real implementation, this would insert into an achievements table
  // For now, we'll just log it
  console.log(`Achievement unlocked: ${achievementId} for user ${userId}`)

  // Store in KV for quick access
  const key = `achievement:${userId}:${achievementId}`
  await env.CACHE.put(key, Date.now().toString(), {
    expirationTtl: 60 * 60 * 24 * 30, // 30 days
  })
}

export default router