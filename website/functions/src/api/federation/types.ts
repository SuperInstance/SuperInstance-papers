import type { Origin, Cell } from '../cells/types'

export interface FederationPeer {
  id: string
  originId: string
  endpoint: string // Origin's federation endpoint
  publicKey?: string // For signature verification
  metadata: {
    name: string
    version: string
    supportedApis: string[]
  }
  status: 'pending' | 'connected' | 'disconnected' | 'error'
  lastSyncAt?: number
  lastError?: string
  trustLevel: number // 0-1 scale
  createdAt: number
  updatedAt: number
}

export interface CrossOriginReference {
  id: string
  localCellId: string // Cell in this origin
  remoteOriginId: string // Target origin ID
  remoteCellId: string // Cell in remote origin
  remoteEndpoint: string // Where to fetch remote state
  referenceType: 'dependency' | 'replication' | 'aggregation'
  transformationMatrix?: number[][] // Transform between origins
  confidenceWeight: number // Weight of remote cell confidence
  propagationDelay: number // Expected network delay
  syncInterval: number // How often to sync
  lastSyncAt?: number
  status: 'active' | 'pending' | 'error' | 'stale'
  createdAt: number
}

export interface FederationEvent {
  id: string
  type: 'cell_update' | 'dependency_change' | 'sync_request' | 'conflict_detected' | 'peer_status'
  originId: string
  sourceCellId?: string
  targetCellId?: string
  eventData: Record<string, unknown>
  timestamp: number
  vectorClock: VectorClock
}

export interface VectorClock {
  [originId: string]: number // Logical clock for each origin
}

export interface ConflictResolutionState {
  id: string
  localCellId: string
  conflictType: 'simultaneous_update' | 'divergent_state' | 'dependency_cycle'
  localState?: {
    stateHash: string
    timestamp: number
    vectorClock: VectorClock
  }
  remoteState?: {
    originId: string
    stateHash: string
    timestamp: number
    vectorClock: VectorClock
  }
  resolutionStrategy: 'last_write_wins' | 'origin_precedence' | 'vector_clock' | 'weighted_merge'
  resolvedState?: {
    mergedState: Record<string, unknown>
    confidence: number
    timestamp: number
  }
  status: 'detected' | 'resolving' | 'resolved' | 'manual_required'
  createdAt: number
  resolvedAt?: number
}

export interface SyncState {
  originId: string
  lastKnownVectorClock: VectorClock
  pendingUpdates: FederationEvent[]
  conflictingCells: string[]
  syncStatus: 'in_sync' | 'syncing' | 'conflict' | 'error'
  estimatedCatchUpTime?: number // milliseconds
}

export interface FederationHandshakeRequest {
  originId: string
  publicKey?: string
  supportedApis: string[]
  initialVectorClock: VectorClock
  metadata: {
    name: string
    version: string
    timezone: string
  }
}

export interface FederationHandshakeResponse {
  success: boolean
  peerId?: string
  federationId?: string
  publicKey?: string
  accepted: boolean
  reason?: string
  initialSync?: {
    origins: Partial<Origin>[]
    cells: Array<{
      id: string
      originId: string
      publicState: Record<string, unknown>
    }>
  }
}

export interface RemoteCellState {
  cellId: string
  originId: string
  stateHash: string
  localState: {
    value: unknown
    confidence?: number
    timestamp: number
  }
  rateOfChange?: {
    value: number
    acceleration?: number
  }
  uncertainty?: {
    variance: number
  }
  vectorClock: VectorClock
}

export type FederationMessage =
  | FederationEvent
  | RemoteCellState
  | SyncState
  | ConflictResolutionState