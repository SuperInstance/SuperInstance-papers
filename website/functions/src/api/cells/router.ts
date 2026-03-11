import { Hono } from 'hono'
import { type Env } from '../../env.d.ts'
import { requireAuth } from '../../shared/auth'
import { validateRequest } from '../../shared/validation'
import { z } from 'zod'
import type { Cell, Origin, CellDependency  } from './types'

// Hash helper function
async function hashData(data: any): Promise<string> {
  const encoder = new TextEncoder()
  const hashed = await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(data)))
  return Array.from(new Uint8Array(hashed))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Validation schemas
const createCellSchema = z.object({
  name: z.string().min(1).max(255),
  originId: z.string(),
  cellType: z.enum(['formula', 'value', 'rate', 'confidence', 'dependency']),
  initialState: z.object({ value: z.any(), confidence: z.number().min(0).max(1).optional() }),
  rateOfChange: z.object({ value: z.number(), acceleration: z.number().optional() }).optional(),
  uncertainty: z.number().min(0).max(1).optional(),
  dependencies: z.array(z.string()).optional(),
  influenceRadius: z.number().positive().optional(),
  deadband: z.number().nonnegative().optional(),
  isPublic: z.boolean().optional(),
})

const updateCellSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  localState: z.object({}).passthrough().optional(),
  rateOfChange: z.object({}).passthrough().optional(),
  uncertainty: z.number().min(0).max(1).optional(),
  dependencies: z.array(z.string()).optional(),
  influenceRadius: z.number().positive().optional(),
  deadband: z.number().nonnegative().optional(),
  isPublic: z.boolean().optional(),
})

const createOriginSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().optional(),
  transformationMatrix: z.array(z.array(z.number())),
  uncertainty: z.number().min(0).max(1).optional(),
  isPublic: z.boolean().optional(),
})

const cellEventSchema = z.object({
  eventType: z.enum(['update', 'cascade', 'confidence_propagation']),
  eventData: z.object({}).passthrough().optional(),
})

const router = new Hono<{ Bindings: Env }>()

// Origins endpoints
router.get('/origins', requireAuth(), async (c) => {
  const user = c.get('user')
  const { limit = '50', offset = '0', parentId } = c.req.query()

  try {
    let query = `
      SELECT o.*, COUNT(c.id) as cell_count
      FROM origins o
      LEFT JOIN cells c ON o.id = c.origin_id
      WHERE o.owner_user_id = ? OR o.is_public = 1
    `
    const params: any[] = [user.id]

    if (parentId) {
      query += ' AND o.parent_id = ?'
      params.push(parentId)
    }

    query += `
      GROUP BY o.id
      ORDER BY o.name ASC
      LIMIT ? OFFSET ?
    `
    params.push(parseInt(limit), parseInt(offset))

    const result = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      data: result.results?.map((row: any) => ({
        id: row.id,
        name: row.name,
        parentId: row.parent_id,
        transformationMatrix: JSON.parse(row.transformation_matrix),
        uncertainty: row.uncertainty,
        cellCount: row.cell_count,
        isPublic: Boolean(row.is_public),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) || [],
    })
  } catch (error) {
    console.error('Failed to get origins:', error)
    return c.json({ error: 'Internal Error', message: 'Failed to retrieve origins' }, 500)
  }
})

router.post('/origins', requireAuth(), async (c) => {
  const user = c.get('user')
  const validation = await validateRequest(createOriginSchema, c)
  if (!validation.success) return validation.response

  const { name, parentId, transformationMatrix, uncertainty = 0, isPublic = false } = validation.data

  try {
    // Validate parent origin if provided
    if (parentId) {
      const parent = await c.env.DB.prepare(`
        SELECT id, owner_user_id, is_public FROM origins WHERE id = ?
      `).bind(parentId).first()

      if (!parent) {
        return c.json({ error: 'Not Found', message: 'Parent origin does not exist' }, 404)
      }

      if (parent.owner_user_id !== user.id && !parent.is_public) {
        return c.json({ error: 'Forbidden', message: 'Cannot create child of private origin' }, 403)
      }
    }

    const id = crypto.randomUUID()
    const now = Date.now()

    await c.env.DB.prepare(`
      INSERT INTO origins (id, name, parent_id, transformation_matrix, uncertainty, owner_user_id, is_public, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      name,
      parentId || null,
      JSON.stringify(transformationMatrix),
      uncertainty,
      user.id,
      isPublic,
      now,
      now
    ).run()

    // Cache origin for fast retrieval
    await c.env.ORIGIN_CACHE?.put(`origin:${id}`, JSON.stringify({
      id,
      name,
      parentId,
      transformationMatrix,
      uncertainty,
      ownerUserId: user.id,
      isPublic,
      createdAt: now,
      updatedAt: now,
    }), { expirationTtl: 3600 }) // 1 hour

    return c.json({
      success: true,
      data: { id, name, parentId, transformationMatrix, uncertainty, isPublic, createdAt: now },
    })
  } catch (error) {
    console.error('Failed to create origin:', error)
    return c.json({ error: 'Internal Error', message: 'Failed to create origin' }, 500)
  }
})

// Cells endpoints
router.get('/cells', requireAuth(), async (c) => {
  const user = c.get('user')
  const { originId, limit = '50', offset = '0', cellType } = c.req.query()

  try {
    let query = `
      SELECT c.*, o.name as origin_name, COUNT(cd.id) as dependency_count
      FROM cells c
      JOIN origins o ON c.origin_id = o.id
      LEFT JOIN cell_dependencies cd ON c.id = cd.source_cell_id
      WHERE (c.owner_user_id = ? OR c.is_public = 1)
    `
    const params: any[] = [user.id]

    if (originId) {
      query += ' AND c.origin_id = ?'
      params.push(originId)
    }

    if (cellType) {
      query += ' AND c.cell_type = ?'
      params.push(cellType)
    }

    query += `
      GROUP BY c.id
      ORDER BY c.name ASC
      LIMIT ? OFFSET ?
    `
    params.push(parseInt(limit), parseInt(offset))

    const result = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      data: result.results?.map((row: any) => ({
        id: row.id,
        name: row.name,
        originId: row.origin_id,
        originName: row.origin_name,
        cellType: row.cell_type,
        localState: JSON.parse(row.local_state),
        rateOfChange: row.rate_of_change ? JSON.parse(row.rate_of_change) : null,
        uncertainty: row.uncertainty,
        dependencyCount: row.dependency_count,
        influenceRadius: row.influence_radius,
        deadband: row.deadband_threshold,
        isPublic: Boolean(row.is_public),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) || [],
    })
  } catch (error) {
    console.error('Failed to get cells:', error)
    return c.json({ error: 'Internal Error', message: 'Failed to retrieve cells' }, 500)
  }
})

router.post('/cells', requireAuth(), async (c) => {
  const user = c.get('user')
  const validation = await validateRequest(createCellSchema, c)
  if (!validation.success) return validation.response

  const {
    name,
    originId,
    cellType,
    initialState,
    rateOfChange,
    uncertainty = 0,
    dependencies = [],
    influenceRadius = 10,
    deadband = 0.01,
    isPublic = false,
  } = validation.data

  try {
    // Verify origin ownership or public access
    const origin = await c.env.DB.prepare(`
      SELECT id, owner_user_id, is_public, uncertainty FROM origins WHERE id = ?
    `).bind(originId).first()

    if (!origin) {
      return c.json({ error: 'Not Found', message: 'Origin does not exist' }, 404)
    }

    if (origin.owner_user_id !== user.id && !origin.is_public) {
      return c.json({ error: 'Forbidden', message: 'Cannot create cells in private origin' }, 403)
    }

    const id = crypto.randomUUID()
    const now = Date.now()

    // Start transaction
    await c.env.DB.prepare('BEGIN TRANSACTION').run()

    try {
      // Create cell
      await c.env.DB.prepare(`
        INSERT INTO cells (id, origin_id, name, cell_type, local_state, rate_of_change, uncertainty_matrix,
                          dependencies, influence_radius, deadband_threshold, owner_user_id, is_public, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        originId,
        name,
        cellType,
        JSON.stringify(initialState),
        rateOfChange ? JSON.stringify(rateOfChange) : null,
        JSON.stringify({ variance: uncertainty * uncertainty }),
        JSON.stringify(dependencies),
        influenceRadius,
        deadband,
        user.id,
        isPublic,
        now,
        now
      ).run()

      // Create dependencies if provided
      if (dependencies.length > 0) {
        for (const targetCellId of dependencies) {
          const dependencyId = crypto.randomUUID()
          await c.env.DB.prepare(`
            INSERT INTO cell_dependencies (id, source_cell_id, target_cell_id, coupling_strength, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).bind(dependencyId, id, targetCellId, 1.0, now).run()
        }
      }

      await c.env.DB.prepare(`
        INSERT INTO cell_history (id, cell_id, origin_timestamp, global_timestamp, state_hash, event_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        historyId,
        id,
        now,
        now,
        stateHashHex,
        'create'
      ).run()

      // Update origin uncertainty
      await c.env.DB.prepare(`
        UPDATE origins SET uncertainty = ? WHERE id = ?
      `).bind(
        Math.sqrt(origin.uncertainty ** 2 + uncertainty ** 2),
        originId
      ).run()

      await c.env.DB.prepare('COMMIT').run()
    } catch (error) {
      await c.env.DB.prepare('ROLLBACK').run()
      throw error
    }

    // Cascade updates to dependent cells if this affects confidence
    if (cellType === 'confidence') {
      await propagateConfidenceUpdate(c.env, id, initialState, now)
    }

    return c.json({
      success: true,
      data: {
        id,
        name,
        originId,
        cellType,
        localState: initialState,
        rateOfChange,
        uncertainty,
        dependencies,
        influenceRadius,
        deadband,
        isPublic,
        createdAt: now,
        updatedAt: now,
      },
    })
  } catch (error) {
    console.error('Failed to create cell:', error)
    return c.json({ error: 'Internal Error', message: 'Failed to create cell' }, 500)
  }
})

router.get('/cells/:cellId', requireAuth(), async (c) => {
  const user = c.get('user')
  const cellId = c.req.param('cellId')

  try {
    const result = await c.env.DB.prepare(`
      SELECT c.*, o.name as origin_name,
             (SELECT COUNT(*) FROM cell_dependencies WHERE source_cell_id = c.id) as outgoing_deps,
             (SELECT COUNT(*) FROM cell_dependencies WHERE target_cell_id = c.id) as incoming_deps
      FROM cells c
      JOIN origins o ON c.origin_id = o.id
      WHERE c.id = ? AND (c.owner_user_id = ? OR c.is_public = 1)
    `).bind(cellId, user.id).first()

    if (!result) {
      return c.json({ error: 'Not Found', message: 'Cell not found' }, 404)
    }

    // Get recent history
    const history = await c.env.DB.prepare(`
      SELECT * FROM cell_history
      WHERE cell_id = ?
      ORDER BY global_timestamp DESC
      LIMIT 10
    `).bind(cellId).all()

    // Get confidence cascade data
    const cascade = await c.env.DB.prepare(`
      SELECT * FROM confidence_cascade
      WHERE source_cell_id = ? OR target_cell_id = ?
      ORDER BY propagated_at DESC
      LIMIT 5
    `).bind(cellId, cellId).all()

    return c.json({
      success: true,
      data: {
        id: result.id,
        name: result.name,
        originId: result.origin_id,
        originName: result.origin_name,
        cellType: result.cell_type,
        localState: JSON.parse(result.local_state),
        rateOfChange: result.rate_of_change ? JSON.parse(result.rate_of_change) : null,
        uncertainty: JSON.parse(result.uncertainty_matrix),
        dependencies: result.dependencies ? JSON.parse(result.dependencies) : [],
        influenceRadius: result.influence_radius,
        deadband: result.deadband_threshold,
        outgoingDependencies: result.outgoing_deps,
        incomingDependencies: result.incoming_deps,
        isPublic: Boolean(result.is_public),
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        recentHistory: history.results?.slice(0, 5) || [],
        recentCascade: cascade.results || [],
      },
    })
  } catch (error) {
    console.error('Failed to get cell:', error)
    return c.json({ error: 'Internal Error', message: 'Failed to retrieve cell' }, 500)
  }
})

router.patch('/cells/:cellId', requireAuth(), async (c) => {
  const user = c.get('user')
  const cellId = c.req.param('cellId')
  const validation = await validateRequest(updateCellSchema, c)
  if (!validation.success) return validation.response

  const updates = validation.data

  try {
    // Check ownership
    const cell = await c.env.DB.prepare(`
      SELECT * FROM cells WHERE id = ? AND owner_user_id = ?
    `).bind(cellId, user.id).first()

    if (!cell) {
      return c.json({ error: 'Not Found', message: 'Cell not found or not owned by user' }, 404)
    }

    // Build update query
    const fields = []
    const values = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }

    if (updates.localState !== undefined) {
      fields.push('local_state = ?')
      values.push(JSON.stringify(updates.localState))
    }

    if (updates.rateOfChange !== undefined) {
      fields.push('rate_of_change = ?')
      values.push(JSON.stringify(updates.rateOfChange))
    }

    if (updates.uncertainty !== undefined) {
      fields.push('uncertainty_matrix = ?')
      values.push(JSON.stringify({ variance: updates.uncertainty * updates.uncertainty }))
    }

    if (updates.influenceRadius !== undefined) {
      fields.push('influence_radius = ?')
      values.push(updates.influenceRadius)
    }

    if (updates.deadband !== undefined) {
      fields.push('deadband_threshold = ?')
      values.push(updates.deadband)
    }

    if (updates.isPublic !== undefined) {
      fields.push('is_public = ?')
      values.push(updates.isPublic ? 1 : 0)
    }

    fields.push('updated_at = ?')
    values.push(Date.now())
    values.push(cellId)

    const query = `UPDATE cells SET ${fields.join(', ')} WHERE id = ?`
    await c.env.DB.prepare(query).bind(...values).run()

    // Record update in history
    const historyId = crypto.randomUUID()
    const stateHash = await hashData(updates.localState || cell.local_state)
    await c.env.DB.prepare(`
      INSERT INTO cell_history (id, cell_id, origin_timestamp, global_timestamp, state_hash, event_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      historyId,
      cellId,
      Date.now(),
      Date.now(),
      stateHash,
      'update'
    ).run()

    // Trigger cascade if cell type requires it
    if (cell.cell_type === 'confidence' || cell.cell_type === 'formula') {
      await triggerCascadeUpdate(c.env, cellId, updates, Date.now())
    }

    return c.json({
      success: true,
      message: 'Cell updated successfully',
      data: { cellId, ...updates },
    })
  } catch (error) {
    console.error('Failed to update cell:', error)
    return c.json({ error: 'Internal Error', message: 'Failed to update cell' }, 500)
  }
})

router.delete('/cells/:cellId', requireAuth(), async (c) => {
  const user = c.get('user')
  const cellId = c.req.param('cellId')

  try {
    const cell = await c.env.DB.prepare(`
      SELECT * FROM cells WHERE id = ? AND owner_user_id = ?
    `).bind(cellId, user.id).first()

    if (!cell) {
      return c.json({ error: 'Not Found', message: 'Cell not found or not owned by user' }, 404)
    }

    // Record deletion in history
    const historyId = crypto.randomUUID()
    const deleteHash = await hashData('DELETED')
    await c.env.DB.prepare(`
      INSERT INTO cell_history (id, cell_id, origin_timestamp, global_timestamp, state_hash, event_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      historyId,
      cellId,
      Date.now(),
      Date.now(),
      deleteHash,
      'delete'
    ).run()

    // Delete cell (cascade will handle dependencies)
    await c.env.DB.prepare('DELETE FROM cells WHERE id = ?').bind(cellId).run()

    return c.json({ success: true, message: 'Cell deleted successfully' })
  } catch (error) {
    console.error('Failed to delete cell:', error)
    return c.json({ error: 'Internal Error', message: 'Failed to delete cell' }, 500)
  }
})

// Rate-based mechanics endpoints
router.get('/cells/:cellId/rates', requireAuth(), async (c) => {
  const user = c.get('user')
  const cellId = c.req.param('cellId')

  try {
    const cell = await c.env.DB.prepare(`
      SELECT c.rate_of_change, c.local_state, c.uncertainty_matrix, c.deadband_threshold,
             COUNT(ch.id) as history_count,
             MIN(ch.global_timestamp) as first_event,
             MAX(ch.global_timestamp) as last_event
      FROM cells c
      LEFT JOIN cell_history ch ON c.id = ch.cell_id
      WHERE c.id = ? AND (c.owner_user_id = ? OR c.is_public = 1)
      GROUP BY c.id
    `).bind(cellId, user.id).first()

    if (!cell) {
      return c.json({ error: 'Not Found', message: 'Cell not found' }, 404)
    }

    const rateOfChange = cell.rate_of_change ? JSON.parse(cell.rate_of_change) : null
    const localState = JSON.parse(cell.local_state)
    const uncertainty = JSON.parse(cell.uncertainty_matrix)

    // Calculate integration intervals based on history
    const timeSpan = cell.history_count > 1 ? cell.last_event - cell.first_event : 1000
    const stateEvolution = calculateStateEvolution(timeSpan, rateOfChange, uncertainty.variance)

    return c.json({
      success: true,
      data: {
        currentRates: {
          instantaneous: rateOfChange?.value || 0,
          acceleration: rateOfChange?.acceleration || 0,
          uncertainty: rateOfChange?.uncertainty || 0,
        },
        deadbandThreshold: cell.deadband_threshold,
        stateEvolution,
        integration: generateIntegrationPredictions(localState, rateOfChange, {
          short: 1000,
          medium: 5000,
          long: 10000,
        }),
        historyMetrics: {
          totalEvents: cell.history_count,
          timeSpan,
          averageRate: cell.history_count > 0 ? timeSpan / cell.history_count : 0,
        },
      },
    })
  } catch (error) {
    console.error('Failed to get cell rates:', error)
    return c.json({ error: 'Internal Error', message: 'Failed to retrieve cell rates' }, 500)
  }
})

router.post('/cells/:cellId/rates/calculate', requireAuth(), async (c) => {
  const user = c.get('user')
  const cellId = c.req.param('cellId')

  try {
    // Get cell and its recent history
    const cellQuery = c.env.DB.prepare(`
      SELECT c.* FROM cells c
      WHERE c.id = ? AND (c.owner_user_id = ? OR c.is_public = 1)
    `).bind(cellId, user.id)

    const historyQuery = c.env.DB.prepare(`
      SELECT local_state, global_timestamp
      FROM cell_history ch
      JOIN cells c ON ch.cell_id = c.id
      WHERE ch.cell_id = ?
      ORDER BY ch.global_timestamp DESC
      LIMIT 10
    `).bind(cellId)

    const [cellResult, historyResult] = await c.env.DB.batch([cellQuery, historyQuery])
    const cell = cellResult.results?.[0]
    const history = historyResult.results as any[]

    if (!cell) {
      return c.json({ error: 'Not Found', message: 'Cell not found' }, 404)
    }

    if (history.length < 2) {
      return c.json({
        error: 'Insufficient Data',
        message: 'Need at least 2 history events to calculate rates',
      }, 400)
    }

    // Calculate rates from history (linear regression)
    const { rates, uncertainty } = calculateRatesFromHistory(history)

    // Update cell with calculated rates
    const now = Date.now()
    await c.env.DB.prepare(`
      UPDATE cells
      SET rate_of_change = ?, uncertainty_matrix = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      JSON.stringify(rates),
      JSON.stringify({ variance: uncertainty * uncertainty }),
      now,
      cellId
    ).run()

    // Record calculation in history
    const historyId = crypto.randomUUID()
    const stateHash = await hashData(cell.local_state)
    await c.env.DB.prepare(`
      INSERT INTO cell_history (id, cell_id, origin_timestamp, global_timestamp, state_hash, event_type, event_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      historyId,
      cellId,
      now,
      now,
      stateHash,
      'update',
      JSON.stringify({ calculation: 'rate_derivation', rates, uncertainty })
    ).run()

    return c.json({
      success: true,
      message: 'Rates calculated and updated successfully',
      data: { rates, uncertainty },
    })
  } catch (error) {
    console.error('Failed to calculate cell rates:', error)
    return c.json({ error: 'Internal Error', message: 'Failed to calculate cell rates' }, 500)
  }
})

router.post('/cells/:cellId/predict', requireAuth(), async (c) => {
  const user = c.get('user')
  const cellId = c.req.param('cellId')
  const { timeHorizon = 1000, predictionModel = 'linear' } = await c.req.json()

  try {
    const result = await c.env.DB.prepare(`
      SELECT c.local_state, c.rate_of_change, c.uncertainty_matrix
      FROM cells c
      WHERE c.id = ? AND (c.owner_user_id = ? OR c.is_public = 1)
    `).bind(cellId, user.id).first()

    if (!result) {
      return c.json({ error: 'Not Found', message: 'Cell not found' }, 404)
    }

    const localState = JSON.parse(result.local_state)
    const rateOfChange = result.rate_of_change ? JSON.parse(result.rate_of_change) : null
    const uncertainty = JSON.parse(result.uncertainty_matrix)

    // Generate predictions based on model
    let predictions: Record<string, any> = {}

    switch (predictionModel) {
      case 'linear':
        predictions = predictLinear(localState, rateOfChange, timeHorizon)
        break

      case 'quadratic':
        predictions = predictQuadratic(localState, rateOfChange, timeHorizon)
        break

      case 'ensemble':
        predictions = predictEnsemble(localState, rateOfChange, timeHorizon)
        break

      default:
        return c.json({ error: 'Bad Request', message: 'Invalid prediction model' }, 400)
    }

    // Calculate uncertainty growth
    const uncertaintyGrowth = calculateUncertaintyGrowth(
      uncertainty.variance,
      timeHorizon,
      rateOfChange?.uncertainty || 0
    )

    return c.json({
      success: true,
      data: {
        predictions,
        uncertaintyGrowth,
        model: predictionModel,
        timeHorizon,
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    console.error('Failed to generate predictions:', error)
    return c.json({ error: 'Internal Error', message: 'Failed to generate predictions' }, 500)
  }
})

// Real-time cell state endpoint (WebSocket upgrade header check)
router.get('/cells/:cellId/state/stream', requireAuth(), async (c) => {
  const user = c.get('user')
  const cellId = c.req.param('cellId')

  // Check if WebSocket upgrade is requested
  const upgradeHeader = c.req.header('Upgrade')
  if (upgradeHeader?.toLowerCase() === 'websocket') {
    // Return WebSocket endpoint URL
    return c.json({
      success: true,
      data: {
        wsUrl: `/ws/cells/${cellId}`,
        authToken: c.req.header('Authorization')?.replace('Bearer ', ''),
      },
    })
  }

  // Otherwise return current state
  try {
    const result = await c.env.DB.prepare(`
      SELECT c.local_state, c.rate_of_change, c.uncertainty_matrix, c.updated_at
      FROM cells c
      WHERE c.id = ? AND (c.owner_user_id = ? OR c.is_public = 1)
    `).bind(cellId, user.id).first()

    if (!result) {
      return c.json({ error: 'Not Found', message: 'Cell not found' }, 404)
    }

    return c.json({
      success: true,
      data: {
        localState: JSON.parse(result.local_state),
        rateOfChange: result.rate_of_change ? JSON.parse(result.rate_of_change) : null,
        uncertainty: JSON.parse(result.uncertainty_matrix),
        timestamp: result.updated_at,
      },
    })
  } catch (error) {
    console.error('Failed to get cell state:', error)
    return c.json({ error: 'Internal Error', message: 'Failed to retrieve cell state' }, 500)
  }
})

// Helper functions
async function propagateConfidenceUpdate(
  env: Env,
  sourceCellId: string,
  confidenceState: any,
  timestamp: number
): Promise<void> {
  // Get all dependent cells
  const dependencies = await env.DB.prepare(`
    SELECT cd.*, c.origin_id, c.uncertainty_matrix
    FROM cell_dependencies cd
    JOIN cells c ON cd.target_cell_id = c.id
    WHERE cd.source_cell_id = ?
  `).bind(sourceCellId).all()

  for (const dep of dependencies.results || []) {
    const distance = dep.propagation_delay || 1
    const transferredConfidence = confidenceState.confidence * Math.exp(-0.1 * distance) * dep.confidence_weight

    // Record cascade event
    const cascadeId = crypto.randomUUID()
    await env.DB.prepare(`
      INSERT INTO confidence_cascade (id, source_cell_id, target_cell_id, cascade_level, confidence_transferred, distance, propagated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      cascadeId,
      sourceCellId,
      dep.target_cell_id,
      1, // Level 1: local cascade
      transferredConfidence,
      distance,
      timestamp
    ).run()

    // Update target cell with propagated confidence
    if (transferredConfidence > 0.01) { // Threshold to avoid noise
      await env.DB.prepare(`
        UPDATE cells
        SET local_state = json_patch(local_state, json('{"confidence": ' || ? || '}')), updated_at = ?
        WHERE id = ?
      `).bind(
        transferredConfidence,
        timestamp,
        dep.target_cell_id
      ).run()

      // Recursive propagation for high confidence cells
      if (transferredConfidence > 0.5) {
        await propagateConfidenceUpdate(env, dep.target_cell_id, { confidence: transferredConfidence }, timestamp)
      }
    }
  }
}

async function triggerCascadeUpdate(
  env: Env,
  sourceCellId: string,
  updates: any,
  timestamp: number
): Promise<void> {
  // Get all cells that depend on this one
  const dependents = await env.DB.prepare(`
    SELECT DISTINCT cd.*, c.local_state, c.rate_of_change
    FROM cell_dependencies cd
    JOIN cells c ON cd.target_cell_id = c.id
    WHERE cd.source_cell_id = ? AND cd.coupling_strength > 0
  `).bind(sourceCellId).all()

  for (const dep of dependents.results || []) {
    const coupledStrength = dep.coupling_strength

    if (updates.localState && coupledStrength > 0) {
      // Apply coupled update with propagation delay
      setTimeout(async () => {
        // Calculate new state based on coupling strength
        const targetState = JSON.parse(dep.local_state)
        const newTargetState = {
          ...targetState,
          value: targetState.value + (updates.localState.value - targetState.value) * coupledStrength,
        }

        await env.DB.prepare(`
          UPDATE cells
          SET local_state = ?, updated_at = ?
          WHERE id = ?
        `).bind(
          JSON.stringify(newTargetState),
          timestamp,
          dep.target_cell_id
        ).run()

        const stateHash = await hashData(newTargetState)
        await env.DB.prepare(`
          INSERT INTO cell_history (id, cell_id, origin_timestamp, global_timestamp, state_hash, event_type)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          dep.target_cell_id,
          timestamp,
          timestamp,
          stateHash,
          'cascade'
        ).run()
      }, dep.propagation_delay || 0)
    }
  }
}

export default router

// Helper functions for rate-based mechanics
function calculateStateEvolution(timeSpan: number, rateOfChange: any | null, uncertainty: number): any {
  if (!rateOfChange) {
    return {
      linear: 0,
      quadratic: 0,
      uncertaintyImpact: uncertainty * timeSpan,
    }
  }

  const baseline = rateOfChange.value * timeSpan
  const acceleration = rateOfChange.acceleration || 0

  return {
    linear: baseline,
    quadratic: baseline + (0.5 * acceleration * timeSpan * timeSpan),
    uncertaintyImpact: Math.sqrt(uncertainty * uncertainty * timeSpan),
  }
}

function generateIntegrationPredictions(
  localState: any,
  rateOfChange: any | null,
  intervals: Record<string, number>
): Record<string, any> {
  const predictions: Record<string, any> = {}
  const currentValue = localState.value || 0

  if (!rateOfChange) {
    for (const [name, time] of Object.entries(intervals)) {
      predictions[name] = {
        value: currentValue,
        uncertainty: 0,
      }
    }
    return predictions
  }

  for (const [name, time] of Object.entries(intervals)) {
    const linear = currentValue + rateOfChange.value * time
    const quadratic = linear + (0.5 * rateOfChange.acceleration * time * time)
    const uncertainty = rateOfChange.uncertainty || 0

    predictions[name] = {
      linear: { value: linear, uncertainty: uncertainty * Math.sqrt(time) },
      quadratic: { value: quadratic, uncertainty: uncertainty * Math.sqrt(time * 1.5) },
    }
  }

  return predictions
}

function calculateRatesFromHistory(history: any[]): { rates: any; uncertainty: number } {
  if (history.length < 2) {
    return { rates: null, uncertainty: 0 }
  }

  // Sort by timestamp (oldest first)
  const sorted = history.sort((a, b) => a.global_timestamp - b.global_timestamp)

  // Extract states as numbers
  const states = sorted.map(h => {
    const state = JSON.parse(h.local_state)
    return typeof state.value === 'number' ? state.value : 0
  })

  const times = sorted.map(h => h.global_timestamp)
  const totalTime = times[times.length - 1] - times[0]

  // Compute linear regression (rate = slope)
  let sumXY = 0
  let sumX = 0
  let sumY = 0
  let sumX2 = 0

  for (let i = 0; i < states.length; i++) {
    const x = times[i] - times[0]
    const y = states[i]
    sumXY += x * y
    sumX += x
    sumY += y
    sumX2 += x * x
  }

  const n = states.length
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const avgRate = slope * 1000 // Convert to per-second rate

  // Calculate uncertainty (R-squared)
  const yMean = sumY / n
  let ssTotal = 0
  let ssResidual = 0

  for (let i = 0; i < states.length; i++) {
    const x = times[i] - times[0]
    const y = states[i]
    const yPred = slope * x
    ssTotal += (y - yMean) ** 2
    ssResidual += (y - yPred) ** 2
  }

  const rSquared = 1 - (ssResidual / ssTotal)

  return {
    rates: {
      value: avgRate,
      acceleration: 0, // For now, we'll skip acceleration calculation
      uncertainty: Math.sqrt(1 - rSquared), // Convert R-squared to uncertainty
    },
    uncertainty: Math.sqrt(1 - rSquared),
  }
}

function predictLinear(
  localState: any,
  rateOfChange: any | null,
  timeHorizon: number
): Record<string, any> {
  const current = localState.value || 0
  const rate = rateOfChange?.value || 0

  return {
    t1: current + rate * timeHorizon * 0.25,
    t2: current + rate * timeHorizon * 0.5,
    t3: current + rate * timeHorizon * 0.75,
    t: current + rate * timeHorizon,
  }
}

function predictQuadratic(
  localState: any,
  rateOfChange: any | null,
  timeHorizon: number
): Record<string, any> {
  const current = localState.value || 0
  const rate = rateOfChange?.value || 0
  const acceleration = rateOfChange?.acceleration || 0

  return {
    t1: current + rate * timeHorizon * 0.25 + 0.5 * acceleration * (timeHorizon * 0.25) ** 2,
    t2: current + rate * timeHorizon * 0.5 + 0.5 * acceleration * (timeHorizon * 0.5) ** 2,
    t3: current + rate * timeHorizon * 0.75 + 0.5 * acceleration * (timeHorizon * 0.75) ** 2,
    t: current + rate * timeHorizon + 0.5 * acceleration * timeHorizon ** 2,
  }
}

function predictEnsemble(
  localState: any,
  rateOfChange: any | null,
  timeHorizon: number
): Record<string, any> {
  const linear = predictLinear(localState, rateOfChange, timeHorizon)
  const quadratic = predictQuadratic(localState, rateOfChange, timeHorizon)

  // Simple ensemble: average of linear and quadratic
  return {
    ensemble: Object.keys(linear).reduce((acc, key) => {
      acc[key] = (linear[key] + quadratic[key]) / 2
      return acc
    }, {} as Record<string, number>),
    components: { linear, quadratic },
  }
}

function calculateUncertaintyGrowth(
  initialVariance: number,
  timeHorizon: number,
  rateUncertainty: number
): {
  short: number
  medium: number
  long: number
  ensemble: number
} {
  const short = Math.sqrt(initialVariance + initialVariance * timeHorizon * 0.0001)
  const medium = Math.sqrt(initialVariance + initialVariance * timeHorizon * 0.001)
  const long = Math.sqrt(initialVariance + initialVariance * timeHorizon * 0.01)
  const ensemble = Math.sqrt(initialVariance + rateUncertainty * timeHorizon * 0.001)

  return { short, medium, long, ensemble }
}