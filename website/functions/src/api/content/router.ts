import { Hono } from 'hono'
import { type Env } from '../../env.d.ts'
import { requireAuth } from '../../shared/auth'
import { contentAccessSchema, validateRequest } from '../../shared/validation'
import { parseJSON, serializeJSON } from '../../shared/db'

const router = new Hono<{ Bindings: Env }>()

// List white papers
router.get('/whitepapers', async (c) => {
  // This endpoint is public, no authentication required

  try {
    // In a real implementation, this would query a content database
    // For now, return static list of white papers
    const whitePapers = [
      {
        id: 'superinstance-universal-cell',
        title: 'SuperInstance Universal Cell Architecture',
        description: 'Mathematical foundation for universal cell architecture where every cell can be any instance type.',
        author: 'SuperInstance Research Team',
        publishedDate: '2026-03-10',
        category: 'architecture',
        difficulty: 'advanced',
        estimatedReadTime: 45,
        tags: ['architecture', 'mathematics', 'type-system'],
      },
      {
        id: 'confidence-cascade',
        title: 'Confidence Cascade Architecture',
        description: 'Deadband triggers and intelligent activation for stable AI systems.',
        author: 'SuperInstance Research Team',
        publishedDate: '2026-03-09',
        category: 'ai',
        difficulty: 'intermediate',
        estimatedReadTime: 30,
        tags: ['ai', 'stability', 'confidence'],
      },
      {
        id: 'rate-based-change',
        title: 'Rate-Based Change Mechanics',
        description: 'Dynamic systems with mathematical precision: x(t) = x₀ + ∫r(τ)dτ',
        author: 'SuperInstance Research Team',
        publishedDate: '2026-03-08',
        category: 'mathematics',
        difficulty: 'advanced',
        estimatedReadTime: 60,
        tags: ['mathematics', 'dynamics', 'calculus'],
      },
      {
        id: 'pythagorean-geometric-tensors',
        title: 'Pythagorean Geometric Tensors',
        description: 'Compass and straightedge construction mathematics for higher abstraction.',
        author: 'SuperInstance Research Team',
        publishedDate: '2026-03-07',
        category: 'mathematics',
        difficulty: 'expert',
        estimatedReadTime: 90,
        tags: ['mathematics', 'geometry', 'tensors'],
      },
      {
        id: 'tile-algebra-formalization',
        title: 'Tile Algebra Formalization',
        description: 'Composition, zones, and confidence in tile-based systems.',
        author: 'SuperInstance Research Team',
        publishedDate: '2026-03-06',
        category: 'mathematics',
        difficulty: 'advanced',
        estimatedReadTime: 50,
        tags: ['mathematics', 'algebra', 'composition'],
      },
    ]

    return c.json({
      success: true,
      data: {
        whitePapers,
        total: whitePapers.length,
      },
    })
  } catch (error) {
    console.error('Failed to list white papers:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to retrieve white papers',
    }, 500)
  }
})

// Get white paper metadata
router.get('/whitepapers/:id', async (c) => {
  const whitePaperId = c.req.param('id')

  try {
    // In a real implementation, this would query a content database
    // For now, return static data based on ID
    const whitePapers: Record<string, any> = {
      'superinstance-universal-cell': {
        id: 'superinstance-universal-cell',
        title: 'SuperInstance Universal Cell Architecture',
        description: 'Mathematical foundation for universal cell architecture where every cell can be any instance type.',
        content: 'Full white paper content would go here...',
        author: 'SuperInstance Research Team',
        publishedDate: '2026-03-10',
        category: 'architecture',
        difficulty: 'advanced',
        estimatedReadTime: 45,
        tags: ['architecture', 'mathematics', 'type-system'],
        sections: [
          { id: 'introduction', title: 'Introduction', page: 1 },
          { id: 'background', title: 'Background', page: 5 },
          { id: 'methodology', title: 'Methodology', page: 12 },
          { id: 'results', title: 'Results', page: 25 },
          { id: 'conclusion', title: 'Conclusion', page: 40 },
        ],
        downloads: {
          pdf: '/whitepapers/superinstance-universal-cell.pdf',
          epub: '/whitepapers/superinstance-universal-cell.epub',
        },
      },
      'confidence-cascade': {
        id: 'confidence-cascade',
        title: 'Confidence Cascade Architecture',
        description: 'Deadband triggers and intelligent activation for stable AI systems.',
        content: 'Full white paper content would go here...',
        author: 'SuperInstance Research Team',
        publishedDate: '2026-03-09',
        category: 'ai',
        difficulty: 'intermediate',
        estimatedReadTime: 30,
        tags: ['ai', 'stability', 'confidence'],
        sections: [
          { id: 'introduction', title: 'Introduction', page: 1 },
          { id: 'confidence-models', title: 'Confidence Models', page: 8 },
          { id: 'cascade-design', title: 'Cascade Design', page: 15 },
          { id: 'implementation', title: 'Implementation', page: 22 },
        ],
        downloads: {
          pdf: '/whitepapers/confidence-cascade.pdf',
        },
      },
    }

    const whitePaper = whitePapers[whitePaperId]

    if (!whitePaper) {
      return c.json({
        error: 'Not Found',
        message: 'White paper not found',
      }, 404)
    }

    return c.json({
      success: true,
      data: whitePaper,
    })
  } catch (error) {
    console.error('Failed to get white paper:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to retrieve white paper',
    }, 500)
  }
})

// Track white paper access
router.post('/whitepapers/:id/access', requireAuth(), async (c) => {
  const user = c.get('user')
  const whitePaperId = c.req.param('id')

  const validation = await validateRequest(contentAccessSchema, c)
  if (!validation.success) return validation.response

  const { duration, completed } = validation.data

  try {
    // Record access in database
    const id = crypto.randomUUID()
    const now = Date.now()

    await c.env.DB.prepare(`
      INSERT INTO content_access (id, user_id, content_id, content_type, accessed_at, duration, completed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      user.id,
      whitePaperId,
      'whitepaper',
      now,
      duration || null,
      completed || false
    ).run()

    // Update user's reading statistics in KV cache
    const statsKey = `user:${user.id}:reading:stats`
    const currentStats = await c.env.CACHE.get(statsKey)
    const stats = currentStats ? parseJSON(currentStats) : {
      totalWhitePapers: 0,
      totalReadingTime: 0,
      lastAccessed: now,
    }

    stats.totalWhitePapers = (stats.totalWhitePapers || 0) + 1
    stats.totalReadingTime = (stats.totalReadingTime || 0) + (duration || 0)
    stats.lastAccessed = now

    await c.env.CACHE.put(statsKey, serializeJSON(stats), {
      expirationTtl: 60 * 60 * 24 * 30, // 30 days
    })

    return c.json({
      success: true,
      message: 'Access recorded successfully',
      data: {
        accessId: id,
        timestamp: now,
      },
    })
  } catch (error) {
    console.error('Failed to record white paper access:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to record access',
    }, 500)
  }
})

// List tutorials
router.get('/tutorials', async (c) => {
  // This endpoint is public, no authentication required

  try {
    // In a real implementation, this would query a content database
    const tutorials = [
      {
        id: 'getting-started',
        title: 'Getting Started with SuperInstance',
        description: 'Learn the basics of SuperInstance and how to create your first universal cell.',
        category: 'beginner',
        estimatedTime: 15,
        prerequisites: [],
        skills: ['basic-spreadsheet', 'cell-concepts'],
        difficulty: 'beginner',
        steps: 5,
      },
      {
        id: 'universal-cells',
        title: 'Working with Universal Cells',
        description: 'Deep dive into universal cell architecture and type transformations.',
        category: 'intermediate',
        estimatedTime: 30,
        prerequisites: ['getting-started'],
        skills: ['type-transformation', 'cell-architecture'],
        difficulty: 'intermediate',
        steps: 8,
      },
      {
        id: 'rate-based-change',
        title: 'Rate-Based Change Mechanics',
        description: 'Implement dynamic systems with rate-based change equations.',
        category: 'advanced',
        estimatedTime: 45,
        prerequisites: ['universal-cells'],
        skills: ['calculus', 'dynamic-systems'],
        difficulty: 'advanced',
        steps: 10,
      },
      {
        id: 'confidence-cascade',
        title: 'Building Confidence Cascades',
        description: 'Create stable AI systems with confidence cascade architecture.',
        category: 'ai',
        estimatedTime: 60,
        prerequisites: ['rate-based-change'],
        skills: ['ai-stability', 'confidence-models'],
        difficulty: 'expert',
        steps: 12,
      },
    ]

    return c.json({
      success: true,
      data: {
        tutorials,
        total: tutorials.length,
      },
    })
  } catch (error) {
    console.error('Failed to list tutorials:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to retrieve tutorials',
    }, 500)
  }
})

// Get tutorial state
router.get('/tutorials/:id', requireAuth(), async (c) => {
  const user = c.get('user')
  const tutorialId = c.req.param('id')

  try {
    // Get tutorial progress from database
    const progress = await c.env.DB.prepare(`
      SELECT state_data, completed, attempts, last_attempt
      FROM progress
      WHERE user_id = ? AND tutorial_id = ?
    `).bind(user.id, tutorialId).first()

    // Get tutorial metadata (in real implementation, from content DB)
    const tutorialMetadata = {
      id: tutorialId,
      title: `Tutorial: ${tutorialId.replace(/-/g, ' ').toUpperCase()}`,
      steps: [
        { id: 'step-1', title: 'Introduction', completed: false },
        { id: 'step-2', title: 'Basic Concepts', completed: false },
        { id: 'step-3', title: 'Hands-on Exercise', completed: false },
        { id: 'step-4', title: 'Advanced Topics', completed: false },
        { id: 'step-5', title: 'Review and Practice', completed: false },
      ],
    }

    // Parse state data
    const stateData = progress?.state_data ? parseJSON(progress.state_data) : {
      currentStep: 0,
      completedSteps: [],
      answers: {},
      notes: '',
    }

    return c.json({
      success: true,
      data: {
        tutorial: tutorialMetadata,
        progress: {
          completed: progress?.completed || false,
          attempts: progress?.attempts || 0,
          lastAttempt: progress?.last_attempt || null,
        },
        state: stateData,
      },
    })
  } catch (error) {
    console.error('Failed to get tutorial state:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to retrieve tutorial state',
    }, 500)
  }
})

// Save tutorial state
router.put('/tutorials/:id', requireAuth(), async (c) => {
  const user = c.get('user')
  const tutorialId = c.req.param('id')

  try {
    const body = await c.req.json()

    // Validate state data structure
    const stateData = {
      currentStep: body.currentStep || 0,
      completedSteps: Array.isArray(body.completedSteps) ? body.completedSteps : [],
      answers: body.answers || {},
      notes: body.notes || '',
      lastSaved: Date.now(),
    }

    // Get existing progress
    const existing = await c.env.DB.prepare(`
      SELECT id FROM progress
      WHERE user_id = ? AND tutorial_id = ?
    `).bind(user.id, tutorialId).first()

    if (existing) {
      // Update existing progress
      await c.env.DB.prepare(`
        UPDATE progress
        SET state_data = ?, last_attempt = ?
        WHERE user_id = ? AND tutorial_id = ?
      `).bind(
        serializeJSON(stateData),
        Date.now(),
        user.id,
        tutorialId
      ).run()
    } else {
      // Create new progress record
      const id = crypto.randomUUID()
      await c.env.DB.prepare(`
        INSERT INTO progress (id, user_id, tutorial_id, state_data, attempts, last_attempt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        user.id,
        tutorialId,
        serializeJSON(stateData),
        1,
        Date.now()
      ).run()
    }

    return c.json({
      success: true,
      message: 'Tutorial state saved successfully',
      data: {
        tutorialId,
        state: stateData,
        savedAt: Date.now(),
      },
    })
  } catch (error) {
    console.error('Failed to save tutorial state:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to save tutorial state',
    }, 500)
  }
})

// List interactive demos
router.get('/demos', async (c) => {
  // This endpoint is public, no authentication required

  try {
    const demos = [
      {
        id: 'universal-cell-demo',
        title: 'Universal Cell Demo',
        description: 'Interactive demonstration of universal cell architecture and type transformations.',
        category: 'architecture',
        estimatedTime: 10,
        technologies: ['javascript', 'react', 'canvas'],
        difficulty: 'beginner',
        features: ['type-transformation', 'real-time-updates', 'visual-feedback'],
      },
      {
        id: 'rate-change-demo',
        title: 'Rate-Based Change Demo',
        description: 'Visualize rate-based change mechanics with interactive controls.',
        category: 'mathematics',
        estimatedTime: 15,
        technologies: ['javascript', 'd3', 'svg'],
        difficulty: 'intermediate',
        features: ['graph-visualization', 'parameter-controls', 'animation'],
      },
      {
        id: 'confidence-cascade-demo',
        title: 'Confidence Cascade Demo',
        description: 'Simulate confidence cascade architecture with adjustable parameters.',
        category: 'ai',
        estimatedTime: 20,
        technologies: ['javascript', 'webgl', 'simulation'],
        difficulty: 'advanced',
        features: ['real-time-simulation', 'parameter-tuning', 'performance-metrics'],
      },
      {
        id: 'tile-algebra-demo',
        title: 'Tile Algebra Demo',
        description: 'Explore tile algebra composition and zone operations.',
        category: 'mathematics',
        estimatedTime: 25,
        technologies: ['javascript', 'canvas', 'interactive'],
        difficulty: 'intermediate',
        features: ['drag-drop', 'composition-visualization', 'zone-operations'],
      },
    ]

    return c.json({
      success: true,
      data: {
        demos,
        total: demos.length,
      },
    })
  } catch (error) {
    console.error('Failed to list demos:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to retrieve demos',
    }, 500)
  }
})

// Track demo usage
router.post('/demos/:id/usage', requireAuth(), async (c) => {
  const user = c.get('user')
  const demoId = c.req.param('id')

  try {
    const body = await c.req.json()
    const { duration, interactions, completed } = body

    // Record demo usage
    const id = crypto.randomUUID()
    const now = Date.now()

    await c.env.DB.prepare(`
      INSERT INTO content_access (id, user_id, content_id, content_type, accessed_at, duration, completed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      user.id,
      demoId,
      'demo',
      now,
      duration || null,
      completed || false
    ).run()

    // Store detailed interaction data in KV
    const interactionKey = `demo:${demoId}:user:${user.id}:interactions:${now}`
    await c.env.CACHE.put(interactionKey, serializeJSON({
      demoId,
      userId: user.id,
      duration,
      interactions,
      completed,
      timestamp: now,
    }), {
      expirationTtl: 60 * 60 * 24 * 7, // 7 days
    })

    // Update demo usage statistics
    const statsKey = `demo:${demoId}:stats`
    const currentStats = await c.env.CACHE.get(statsKey)
    const stats = currentStats ? parseJSON(currentStats) : {
      totalUses: 0,
      totalDuration: 0,
      averageDuration: 0,
      completionRate: 0,
    }

    stats.totalUses = (stats.totalUses || 0) + 1
    stats.totalDuration = (stats.totalDuration || 0) + (duration || 0)
    stats.averageDuration = stats.totalDuration / stats.totalUses
    if (completed) {
      const completedCount = (stats.completedCount || 0) + 1
      stats.completedCount = completedCount
      stats.completionRate = (completedCount / stats.totalUses) * 100
    }

    await c.env.CACHE.put(statsKey, serializeJSON(stats), {
      expirationTtl: 60 * 60 * 24 * 30, // 30 days
    })

    return c.json({
      success: true,
      message: 'Demo usage recorded successfully',
      data: {
        usageId: id,
        timestamp: now,
      },
    })
  } catch (error) {
    console.error('Failed to record demo usage:', error)
    return c.json({
      error: 'Internal Error',
      message: 'Failed to record demo usage',
    }, 500)
  }
})

export default router