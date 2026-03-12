import { Hono } from 'hono'
import { type Env } from '../../env.d.ts'
import { requireAuth } from '../../shared/auth'
import { validateRequest } from '../../shared/validation'
import { z } from 'zod'
import type {
  FederationPeer,
  CrossOriginReference,
  FederationEvent,
  FederationHandshakeRequest,
  FederationHandshakeResponse,
  SyncState,
  ConflictResolutionState
} from './types'

// Validation schemas
const federationPeerSchema = z.object({
  endpoint: z.string().url(),
  publicKey: z.string().optional(),
  metadata: z.object({
    name: z.string().min(1),
    version: z.string(),
    supportedApis: z.array(z.string())
  })
})

const crossOriginReferenceSchema = z.object({
  localCellId: z.string(),
  remoteOriginId: z.string(),
  remoteCellId: z.string(),
  remoteEndpoint: z.string().url(),
  referenceType: z.enum(['dependency', 'replication', 'aggregation']),
  transformationMatrix: z.array(z.array(z.number())).optional(),
  confidenceWeight: z.number().min(0).max(1).default(1),
  propagationDelay: z.number().nonnegative().default(0),
  syncInterval: z.number().positive().default(60000) // 1 minute default
})

const syncRequestSchema = z.object({
  targetOriginIds: z.array(z.string()).optional(),
  fullSync: z.boolean().default(false),
  conflictResolution: z.enum(['auto', 'manual', 'defer']).default('auto')
})

// Federation service class
class FederationService {
  private env: Env
  private peerConnections: Map<string, WebSocket> = new Map()
  private vectorClock: Record<string, number> = {}

  constructor(env: Env) {
    this.env = env
  }

  // Vector clock management
  incrementClock(originId: string): void {
    this.vectorClock[originId] = (this.vectorClock[originId] || 0) + 1
  }

  mergeVectorClock(remoteClock: Record<string, number>): void {
    for (const [originId, clock] of Object.entries(remoteClock)) {
      this.vectorClock[originId] = Math.max(
        this.vectorClock[originId] || 0,
        clock
      )
    }
  }

  // Conflict resolution
  resolveConflict(
    localState: any,
    remoteState: any,
    strategy: string = 'vector_clock'
  ): { resolvedState: any; confidence: number } {
    switch (strategy) {
      case 'last_write_wins':
        return localState.timestamp >= remoteState.timestamp
          ? { resolvedState: localState, confidence: localState.confidence }
          : { resolvedState: remoteState, confidence: remoteState.confidence }

      case 'vector_clock':
        // Compare vector clocks for happens-before relationship
        const localDominates = this.dominates(localState.vectorClock, remoteState.vectorClock)
        const remoteDominates = this.dominates(remoteState.vectorClock, localState.vectorClock)

        if (localDominates && !remoteDominates) {
          return { resolvedState: localState, confidence: localState.confidence }
        } else if (remoteDominates && !localDominates) {
          return { resolvedState: remoteState, confidence: remoteState.confidence }
        } else {
          // Concurrent updates - merge states
          return this.mergeConcurrentStates(localState, remoteState)
        }

      case 'weighted_merge':
        // Weighted average based on confidence and recency
        const localWeight = localState.confidence * this.timeDecay(localState.timestamp)
        const remoteWeight = remoteState.confidence * this.timeDecay(remoteState.timestamp)
        const totalWeight = localWeight + remoteWeight

        return {
          resolvedState: {
            ...localState,
            value: (localState.value * localWeight + remoteState.value * remoteWeight) / totalWeight,
            confidence: Math.max(localState.confidence, remoteState.confidence)
          },
          confidence: Math.max(localState.confidence, remoteState.confidence)
        }

      default:
        throw new Error(`Unknown conflict resolution strategy: ${strategy}`)
    }
  }

  private dominates(clock1: Record<string, number>, clock2: Record<string, number>): boolean {
    let hasGreater = false
    const allKeys = new Set([...Object.keys(clock1), ...Object.keys(clock2)])

    for (const key of allKeys) {
      const c1 = clock1[key] || 0
      const c2 = clock2[key] || 0

      if (c1 < c2) return false
      if (c1 > c2) hasGreater = true
    }

    return hasGreater
  }

  private mergeConcurrentStates(localState: any, remoteState: any): { resolvedState: any; confidence: number } {
    // Simple merge strategy - prefer local with reduced confidence
    return {
      resolvedState: {
        ...localState,
        value: localState.value,
        confidence: Math.min(localState.confidence, remoteState.confidence) * 0.9
      },
      confidence: Math.min(localState.confidence, remoteState.confidence) * 0.9
    }
  }

  private timeDecay(timestamp: number): number {
    const age = Date.now() - timestamp
    const halfLife = 24 * 60 * 60 * 1000 // 24 hours
    return Math.exp(-age * Math.LN2 / halfLife)
  }

  // Peer management
  async addPeer(peer: Omit<FederationPeer, 'id' | 'status' | 'trustLevel' | 'createdAt' | 'updatedAt'>): Promise<FederationPeer> {
    const id = crypto.randomUUID()
    const now = Date.now()

    const newPeer: FederationPeer = {
      id,
      ...peer,
      status: 'pending',
      trustLevel: 0.1, // Start with low trust
      createdAt: now,
      updatedAt: now
    }

    // Store peer in D1
    await this.env.DB.prepare(`
      INSERT INTO federation_peers (
        id, origin_id, endpoint, public_key, metadata, status, trust_level, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      newPeer.originId,
      newPeer.endpoint,
      newPeer.publicKey || null,
      JSON.stringify(newPeer.metadata),
      newPeer.status,
      newPeer.trustLevel,
      newPeer.createdAt,
      newPeer.updatedAt
    ).run()

    return newPeer
  }

  // Cross-origin reference management
  async createCrossOriginReference(
    reference: Omit<CrossOriginReference, 'id' | 'status' | 'lastSyncAt' | 'createdAt'>
  ): Promise<CrossOriginReference> {
    const id = crypto.randomUUID()
    const now = Date.now()

    const newReference: CrossOriginReference = {
      id,
      ...reference,
      status: 'pending',
      createdAt: now
    }

    await this.env.DB.prepare(`
      INSERT INTO cross_origin_references (
        id, local_cell_id, remote_origin_id, remote_cell_id, remote_endpoint,
        reference_type, transformation_matrix, confidence_weight, propagation_delay,
        sync_interval, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      newReference.localCellId,
      newReference.remoteOriginId,
      newReference.remoteCellId,
      newReference.remoteEndpoint,
      newReference.referenceType,
      JSON.stringify(newReference.transformationMatrix || null),
      newReference.confidenceWeight,
      newReference.propagationDelay,
      newReference.syncInterval,
      newReference.status,
      newReference.createdAt
    ).run()

    return newReference
  }

  // Sync orchestration
  async syncWithOrigin(originId: string, fullSync: boolean = false): Promise<SyncState> {
    const peer = await this.env.DB.prepare(`
      SELECT * FROM federation_peers WHERE origin_id = ? AND status = 'connected'
    `).bind(originId).first()

    if (!peer) {
      throw new Error(`Peer with origin ${originId} not found or not connected`)
    }

    // Fetch remote state
    const response = await fetch(`${peer.endpoint}/api/federation/state`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.createFederationToken()}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch state from ${originId}: ${response.statusText}`)
    }

    const remoteState = await response.json()

    // Update sync state
    const syncState: SyncState = {
      originId,
      lastKnownVectorClock: remoteState.vectorClock,
      pendingUpdates: [],
      conflictingCells: [],
      syncStatus: 'in_sync'
    }

    // Process conflicts if any
    if (remoteState.conflicts) {
      syncState.conflictingCells = remoteState.conflicts.map((c: any) => c.cellId)
      syncState.syncStatus = 'conflict'

      // Auto-resolve conflicts
      for (const conflict of remoteState.conflicts) {
        const resolved = await this.resolveCellConflict(conflict)
        if (resolved.requiresManualReview) {
          syncState.syncStatus = 'error'
        }
      }
    }

    return syncState
  }

  private async resolveCellConflict(conflict: any): Promise<{resolved: boolean; requiresManualReview: boolean}> {
    // Implement conflict resolution logic
    // This is a simplified version - in production, this would be more sophisticated

    return {
      resolved: true,
      requiresManualReview: conflict.critical
    }
  }

  private async createFederationToken(): Promise<string> {
    // Create a JWT token for federation authentication
    // This should be implemented with proper signing
    return 'federation-token-placeholder'
  }
}

// Create Hono router
const router = new Hono<{ Bindings: Env }>()

// Register a new federation peer
router.post('/peers', requireAuth(), validateRequest(federationPeerSchema), async (c) => {
  const user = c.get('user')
  const peerData = c.req.valid('json')

  try {
    const service = new FederationService(c.env)
    const peer = await service.addPeer({
      ...peerData,
      originId: user.originId || c.env.DEFAULT_ORIGIN_ID
    })

    // Initiate handshake
    const handshakeRequest: FederationHandshakeRequest = {
      originId: peer.originId,
      publicKey: peer.publicKey,
      supportedApis: ['federation', 'cells', 'sync'],
      initialVectorClock: service.vectorClock,
      metadata: {
        name: peer.metadata.name,
        version: peer.metadata.version,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }

    const handshakeResponse = await fetch(`${peer.endpoint}/api/federation/handshake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(handshakeRequest)
    })

    if (handshakeResponse.ok) {
      // Update peer status to connected
      await c.env.DB.prepare(`
        UPDATE federation_peers SET status = 'connected', updated_at = ?
        WHERE id = ?
      `).bind(Date.now(), peer.id).run()
      peer.status = 'connected'
    }

    return c.json({
      success: true,
      data: peer
    })
  } catch (error) {
    console.error('Failed to register peer:', error)
    return c.json({
      success: false,
      error: 'Failed to register federation peer'
    }, 500)
  }
})

// List federation peers
router.get('/peers', requireAuth(), async (c) => {
  const user = c.get('user')
  const { limit = '50', offset = '0', status } = c.req.query()

  try {
    let query = `
      SELECT fp.*, o.name as origin_name
      FROM federation_peers fp
      JOIN origins o ON fp.origin_id = o.id
      WHERE fp.origin_id = ? OR o.owner_user_id = ?
    `
    const params: any[] = [
      user.originId || c.env.DEFAULT_ORIGIN_ID,
      user.id
    ]

    if (status) {
      query += ' AND fp.status = ?'
      params.push(status)
    }

    query += ' ORDER BY fp.updated_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), parseInt(offset))

    const result = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      data: result.results?.map((row: any) => ({
        id: row.id,
        originId: row.origin_id,
        endpoint: row.endpoint,
        metadata: JSON.parse(row.metadata),
        status: row.status,
        trustLevel: row.trust_level,
        lastSyncAt: row.last_sync_at,
        lastError: row.last_error,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })) || []
    })
  } catch (error) {
    console.error('Failed to get peers:', error)
    return c.json({
      success: false,
      error: 'Failed to retrieve federation peers'
    }, 500)
  }
})

// Create cross-origin reference
router.post('/references', requireAuth(), validateRequest(crossOriginReferenceSchema), async (c) => {
  const user = c.get('user')
  const referenceData = c.req.valid('json')

  try {
    // Verify local cell ownership
    const localCell = await c.env.DB.prepare(`
      SELECT * FROM cells WHERE id = ? AND (owner_user_id = ? OR is_public = 1)
    `).bind(referenceData.localCellId, user.id).first()

    if (!localCell) {
      return c.json({
        success: false,
        error: 'Local cell not found or access denied'
      }, 404)
    }

    const service = new FederationService(c.env)
    const reference = await service.createCrossOriginReference({
      ...referenceData,
      localCellId: referenceData.localCellId
    })

    // Trigger initial sync
    c.executionCtx.waitUntil(
      this.syncRemoteCell(c.env, reference)
    )

    return c.json({
      success: true,
      data: reference
    })
  } catch (error) {
    console.error('Failed to create reference:', error)
    return c.json({
      success: false,
      error: 'Failed to create cross-origin reference'
    }, 500)
  }
})

// Get sync status for an origin
router.get('/sync/:originId', requireAuth(), async (c) => {
  const { originId } = c.req.param()

  try {
    const service = new FederationService(c.env)
    const syncState = await service.syncWithOrigin(originId)

    return c.json({
      success: true,
      data: syncState
    })
  } catch (error) {
    console.error('Failed to sync origin:', error)
    return c.json({
      success: false,
      error: 'Failed to sync with origin'
    }, 500)
  }
})

// Manual sync trigger
router.post('/sync', requireAuth(), validateRequest(syncRequestSchema), async (c) => {
  const syncRequest = c.req.valid('json')
  const service = new FederationService(c.env)

  if (syncRequest.targetOriginIds) {
    // Sync specific origins
    const results = await Promise.allSettled(
      syncRequest.targetOriginIds.map(originId =>
        service.syncWithOrigin(originId, syncRequest.fullSync)
      )
    )

    return c.json({
      success: true,
      data: {
        results: results.map((r, i) => ({
          originId: syncRequest.targetOriginIds[i],
          success: r.status === 'fulfilled',
          data: r.status === 'fulfilled' ? r.value : null,
          error: r.status === 'rejected' ? r.reason.message : null
        }))
      }
    })
  } else {
    // Sync all connected peers
    const peers = await c.env.DB.prepare(`
      SELECT * FROM federation_peers WHERE status = 'connected'
    `).all()

    const results = await Promise.allSettled(
      (peers.results || []).map((peer: any) =>
        service.syncWithOrigin(peer.origin_id, syncRequest.fullSync)
      )
    )

    return c.json({
      success: true,
      data: {
        syncedPeers: results.filter(r => r.status === 'fulfilled').length,
        errors: results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason)\n      }
    })
  }
})

// Handle federation handshake
router.post('/handshake', async (c) => {
  try {
    const request: FederationHandshakeRequest = await c.req.json()

    // Verify the request
    if (!request.originId || !request.supportedApis.includes('federation')) {
      return c.json<FederationHandshakeResponse>({
        success: false,
        accepted: false,
        reason: 'Invalid handshake request'
      }, 400)
    }

    // Check if we already have this peer
    const existingPeer = await c.env.DB.prepare(`
      SELECT * FROM federation_peers WHERE origin_id = ?
    `).bind(request.originId).first()

    if (existingPeer) {
      // Update existing peer
      await c.env.DB.prepare(`
        UPDATE federation_peers
        SET status = 'connected', metadata = ?, updated_at = ?
        WHERE origin_id = ?
      `).bind(
        JSON.stringify(request.metadata),
        Date.now(),
        request.originId
      ).run()
    }

    // Merge vector clocks
    const service = new FederationService(c.env)
    service.mergeVectorClock(request.initialVectorClock)

    // Send response with our state
    const origins = await c.env.DB.prepare(`
      SELECT id, name, transformation_matrix, uncertainty, parent_id, is_public
      FROM origins
      WHERE is_public = 1
    `).all()

    const cells = await c.env.DB.prepare(`
      SELECT c.id, c.origin_id, c.name, c.cell_type, c.local_state, c.confidence
      FROM cells c
      JOIN origins o ON c.origin_id = o.id
      WHERE c.is_public = 1 AND o.is_public = 1
      LIMIT 100
    `).all()

    return c.json<FederationHandshakeResponse>({
      success: true,
      accepted: true,
      initialSync: {
        origins: origins.results || [],
        cells: (cells.results || []).map((cell: any) => ({
          id: cell.id,
          originId: cell.origin_id,
          publicState: {
            name: cell.name,
            type: cell.cell_type,
            state: JSON.parse(cell.local_state),
            confidence: cell.confidence
          }
        }))
      }
    })
  } catch (error) {
    console.error('Handshake failed:', error)
    return c.json<FederationHandshakeResponse>({
      success: false,
      accepted: false,
      reason: 'Internal server error'
    }, 500)
  }
})

async function syncRemoteCell(env: Env, reference: CrossOriginReference): Promise<void> {
  try {
    // Fetch remote cell state
    const response = await fetch(`${reference.remoteEndpoint}/api/cells/${reference.remoteCellId}`)
    if (response.ok) {
      const remoteCell = await response.json()

      // Update local cell with remote state (with transformations)
      // This is a simplified implementation
      await env.DB.prepare(`
        UPDATE cross_origin_references
        SET status = 'active', last_sync_at = ?
        WHERE id = ?
      `).bind(Date.now(), reference.id).run()
    }
  } catch (error) {
    console.error('Failed to sync remote cell:', error)
    await env.DB.prepare(`
      UPDATE cross_origin_references
      SET status = 'error', last_sync_at = ?
      WHERE id = ?
    `).bind(Date.now(), reference.id).run()
  }
}

export default router