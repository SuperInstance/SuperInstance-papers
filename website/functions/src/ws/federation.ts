import type { WebSocket } from '@cloudflare/workers-types'
import type { Env } from '../env.d.ts'
import type { FederationEvent, VectorClock } from '../api/federation/types'

interface FederationConnection {
  ws: WebSocket
  originId: string
  lastHeartbeat: number
  vectorClock: VectorClock
  subscribedEvents: string[]
}

export class FederationWebSocketManager {
  private connections = new Map<string, FederationConnection>()
  private eventQueue = new Map<string, FederationEvent[]>()

  constructor(private env: Env) {}

  // Handle new WebSocket connection
  async handleConnection(ws: WebSocket, originId: string, token: string): Promise<void> {
    // Verify token (simplified)
    if (!await this.verifyFederationToken(token)) {
      ws.close(1008, 'Invalid federation token')
      return
    }

    const connection: FederationConnection = {
      ws,
      originId,
      lastHeartbeat: Date.now(),
      vectorClock: {},
      subscribedEvents: ['cell_update', 'dependency_change', 'conflict_detected']
    }

    // Store connection
    this.connections.set(originId, connection)

    // Send initial state
    const syncState = await this.getSyncState(originId)
    ws.send(JSON.stringify({
      type: 'sync_state',
      data: syncState
    }))

    // Handle incoming messages
    ws.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data as string)
        await this.handleMessage(connection, message)
      } catch (error) {
        console.error('Failed to handle federation message:', error)
        ws.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }))
      }
    })

    // Handle disconnection
    ws.addEventListener('close', () => {
      this.connections.delete(originId)
    })

    // Send heartbeat
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }))
      } else {
        clearInterval(heartbeatInterval)
        this.connections.delete(originId)
      }
    }, 30000) // 30 seconds
  }

  // Handle incoming federation messages
  private async handleMessage(connection: FederationConnection, message: any): Promise<void> {
    switch (message.type) {
      case 'event':
        await this.processFederationEvent(connection, message.event)
        break

      case 'sync_request':
        await this.handleSyncRequest(connection, message)
        break

      case 'conflict_resolution':
        await this.handleConflictResolution(connection, message)
        break

      case 'coefficient_update':
        await this.handleCoefficientUpdate(connection, message)
        break

      case 'heartbeat_response':
        connection.lastHeartbeat = Date.now()
        break

      default:
        console.warn('Unknown federation message type:', message.type)
    }
  }

  // Process incoming federation event
  private async processFederationEvent(fromConnection: FederationConnection, event: FederationEvent): Promise<void> {
    // Update vector clock
    this.updateVectorClock(fromConnection.vectorClock, event.vectorClock)

    // Store event for replay if needed
    const queue = this.eventQueue.get(event.originId) || []
    queue.push(event)
    this.eventQueue.set(event.originId, queue)

    // Apply event based on type
    switch (event.type) {
      case 'cell_update':
        await this.applyCellUpdate(fromConnection, event)
        break

      case 'dependency_change':
        await this.applyDependencyChange(fromConnection, event)
        break

      case 'conflict_detected':
        await this.handleConflictEvent(fromConnection, event)
        break

      case 'sync_request':
        await this.handleOriginSyncRequest(fromConnection, event)
        break
    }

    // Propagate to other connected origins
    await this.propagateEvent(event, fromConnection.originId)
  }

  // Apply cell update from federated origin
  private async applyCellUpdate(connection: FederationConnection, event: FederationEvent): Promise<void> {
    const { originId, sourceCellId, targetCellId, eventData } = event

    // Find cross-origin reference
    const reference = await this.env.DB.prepare(`
      SELECT * FROM cross_origin_references
      WHERE local_cell_id = ? AND remote_origin_id = ? AND remote_cell_id = ?
    `).bind(targetCellId, originId, sourceCellId).first()

    if (!reference) {
      console.warn(`No cross-origin reference found for ${targetCellId} -> ${originId}:${sourceCellId}`)
      return
    }

    // Get transformation matrix
    const transformMatrix = reference.transformation_matrix
      ? JSON.parse(reference.transformation_matrix)
      : null

    // Transform remote state to local frame
    const transformedState = transformMatrix && eventData?.localState
      ? this.transformState(eventData.localState, transformMatrix)
      : eventData.localState

    // Apply to local cell with confidence weighting
    const confidenceWeight = reference.confidence_weight || 1

    await this.env.DB.prepare(`
      UPDATE cells
      SET local_state =
        CASE
          WHEN ? > confidence THEN ?
          ELSE json_set(local_state, '$.value',
            (json_extract(local_state, '$.value') * confidence + ? * ?) / (confidence + ? * ?))
        END,
      confidence = GREATEST(confidence, ? * ?),
      updated_at = ?
      WHERE id = ?
    `).bind(
      transformedState.confidence * confidenceWeight,
      JSON.stringify(transformedState),
      transformedState.value,
      confidenceWeight,
      confidenceWeight,
      transformedState.confidence,
      transformedState.confidence,
      confidenceWeight,
      Date.now(),
      targetCellId
    ).run()

    // Update last sync time
    await this.env.DB.prepare(`
      UPDATE cross_origin_references
      SET last_sync_at = ?, status = 'active'
      WHERE id = ?
    `).bind(Date.now(), reference.id).run()

    // Send confirmation back
    connection.ws.send(JSON.stringify({
      type: 'cell_update_ack',
      eventId: event.id,
      timestamp: Date.now()
    }))
  }

  // Handle dependency changes
  private async applyDependencyChange(connection: FederationConnection, event: FederationEvent): Promise<void> {
    // Update dependency graph
    // This would update the distributed dependency tracking
    const { sourceCellId, targetCellId, eventData } = event

    await this.env.DB.prepare(`
      UPDATE cell_dependencies
      SET coupling_strength = ?, propagation_delay = ?, confidence_weight = ?
      WHERE source_cell_id = ? AND target_cell_id = ?
    `).bind(
      eventData.couplingStrength,
      eventData.propagationDelay,
      eventData.confidenceWeight,
      sourceCellId,
      targetCellId
    ).run()
  }

  // Handle conflict detection
  private async handleConflictEvent(connection: FederationConnection, event: FederationEvent): Promise<void> {
    const { sourceCellId, eventData } = event

    // Store conflict for manual resolution
    await this.env.DB.prepare(`
      INSERT INTO federation_conflicts (
        id, local_cell_id, conflict_type, local_state, remote_state,
        resolution_strategy, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      sourceCellId,
      eventData.conflictType,
      JSON.stringify(eventData.localState),
      JSON.stringify(eventData.remoteState),
      eventData.resolutionStrategy,
      'detected',
      Date.now()
    ).run()

    // Notify connected clients
    this.broadcast(
      'conflict_notification',
      {
        cellId: sourceCellId,
        conflictType: eventData.conflictType,
        timestamp: Date.now()
      },
      sourceCellId
    )
  }

  // Handle sync request
  private async handleSyncRequest(connection: FederationConnection, message: any): Promise<void> {
    const { vectorClock, fullSync } = message

    // Calculate missing events
    const missingEvents = await this.getMissingEvents(connection.originId, vectorClock)

    // Send missing events
    for (const event of missingEvents) {
      connection.ws.send(JSON.stringify({
        type: 'event',
        event: event
      }))
    }
  }

  // Handle coefficient updates (for distributed calculations)
  private async handleCoefficientUpdate(connection: FederationConnection, message: any): Promise<void> {
    const { cellId, coefficients, timestamp, source } = message

    this.broadcast(
      'coefficient_update',
      {
        cellId,
        coefficients,
        timestamp,
        source
      },
      cellId
    )
  }

  // Propagate event to other connected origins
  private async propagateEvent(event: FederationEvent, excludeOriginId?: string): Promise<void> {
    const message = JSON.stringify({
      type: 'event',
      event: event
    })

    for (const [originId, connection] of this.connections) {
      if (originId !== excludeOriginId &&
          connection.subscribedEvents.includes(event.type) &&
          connection.ws.readyState === connection.ws.OPEN) {
        connection.ws.send(message)
      }
    }
  }

  // Update vector clock
  private updateVectorClock(localClock: VectorClock, remoteClock: VectorClock): void {
    for (const [originId, clock] of Object.entries(remoteClock)) {
      localClock[originId] = Math.max(localClock[originId] || 0, clock)
    }
  }

  // Get sync state for an origin
  private async getSyncState(originId: string): Promise<any> {
    const vectorClock = this.connections.get(originId)?.vectorClock || {}

    // Get pending events
    const events = this.eventQueue.get(originId) || []

    // Get conflicts
    const conflicts = await this.env.DB.prepare(`
      SELECT * FROM federation_conflicts
      WHERE status = 'detected'
      ORDER BY created_at DESC
      LIMIT 50
    `).all()

    return {
      originId,
      vectorClock,
      pendingEvents: events.length,
      conflicts: conflicts.results || []
    }
  }

  // Get missing events based on vector clock
  private async getMissingEvents(originId: string, sinceClock: VectorClock): Promise<FederationEvent[]> {
    // Get events from queue that are newer than the given clock
    const allEvents = this.eventQueue.get(originId) || []
    return allEvents.filter(event => {
      return this.isEventNewer(event, sinceClock)
    })
  }

  // Check if event is newer than a vector clock
  private isEventNewer(event: FederationEvent, clock: VectorClock): boolean {
    for (const [originId, time] of Object.entries(event.vectorClock)) {
      if ((clock[originId] || 0) < time) {
        return true
      }
    }
    return false
  }

  // Transform state between origins
  private transformState(state: any, transformMatrix: number[][]): any {
    // Apply transformation matrix to state
    // This is a placeholder - actual implementation would depend on state structure
    return state
  }

  // Broadcast to all connections
  private broadcast(type: string, data: any, cellId?: string): void {
    const message = JSON.stringify({ type, data })

    for (const connection of this.connections.values()) {
      if (connection.ws.readyState === connection.ws.OPEN) {
        connection.ws.send(message)
      }
    }
  }

  // Verify federation token
  private async verifyFederationToken(token: string): Promise<boolean> {
    // Implement proper JWT verification
    // For now, just check it exists
    return token >= 'federation-'
  }

  // Handle origin sync request
  private async handleOriginSyncRequest(connection: FederationConnection, event: FederationEvent): Promise<void> {
    // Send all relevant state
    const state = await this.getSyncState(connection.originId)

    connection.ws.send(JSON.stringify({
      type: 'sync_response',
      originId: event.originId,
      data: state,
      timestamp: Date.now()
    }))
  }
}

// Export WebSocket handler
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url)
    const originId = url.pathname.split('/').pop()

    if (!originId) {
      return new Response('Invalid origin ID', { status: 400 })
    }

    // Check upgrade
    const upgradeHeader = request.headers.get('Upgrade')
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    // Get token from header or query param
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '') || url.searchParams.get('token')

    if (!token) {
      return new Response('Missing federation token', { status: 401 })
    }

    // Create WebSocket connection
    const webSocketPair = new WebSocketPair()
    const [client, server] = Object.values(webSocketPair)

    server.accept()

    // Initialize manager and handle connection
    const manager = new FederationWebSocketManager(env)
    await manager.handleConnection(server, originId, token)

    return new Response(null, {
      status: 101,
      webSocket: client
    })
  }
}