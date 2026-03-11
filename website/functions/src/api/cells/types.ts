export interface Origin {
  id: string
  name: string
  parentId?: string
  transformationMatrix: number[][]
  uncertainty: number
  cellCount?: number
  isPublic: boolean
  createdAt: number
  updatedAt: number
}

export interface Cell {
  id: string
  name: string
  originId: string
  originName?: string
  cellType: 'formula' | 'value' | 'rate' | 'confidence' | 'dependency'
  localState: {
    value: unknown
    confidence?: number
    [key: string]: unknown
  }
  rateOfChange?: {
    value: number
    acceleration?: number
    [key: string]: unknown
  } | null
  uncertainty: {
    variance: number
    [key: string]: unknown
  }
  dependencies: string[]
  influenceRadius: number
  deadband: number
  dependencyCount?: number
  outgoingDependencies?: number
  incomingDependencies?: number
  isPublic: boolean
  createdAt: number
  updatedAt: number
}

export interface CellDependency {
  id: string
  sourceCellId: string
  targetCellId: string
  relativeTransform?: number[][] | null
  couplingStrength: number
  propagationDelay: number
  confidenceWeight: number
  createdAt: number
}

export interface CellHistory {
  id: string
  cellId: string
  originTimestamp: number
  globalTimestamp: number
  stateHash: string
  rateHash?: string | null
  confidence?: number | null
  parentHash?: string | null
  eventType: 'create' | 'update' | 'delete' | 'cascade' | 'confidence_propagation'
  eventData?: Record<string, unknown> | null
  propagated: boolean
}

export interface ConfidenceCascade {
  id: string
  sourceCellId: string
  targetCellId: string
  cascadeLevel: 1 | 2 | 3 // Local, Neighborhood, Global
  confidenceTransferred: number
  distance: number
  propagatedAt: number
}

export interface Federation {
  id: string
  name: string
  description?: string
  ownerUserId?: string
  referenceOriginId: string
  participants: string[] // array of origin IDs
  consensusRules: {
    threshold?: number
    timeout?: number
    votingStrategy?: string
  }
  createdAt: number
  updatedAt: number
}

// WebSocket message types
export interface CellUpdateMessage {
  type: 'cell_update'
  cellId: string
  cellState: {
    localState: Cell['localState']
    rateOfChange: Cell['rateOfChange']
    uncertainty: Cell['uncertainty']
  }
  uncertainty: number
  timestamp: number
}

export interface ConfidencePropagationMessage {
  type: 'confidence_propagation'
  sourceCellId: string
  targetCellId: string
  cascadeLevel: number
  confidenceTransferred: number
  timestamp: number
}

export interface CascadeUpdateMessage {
  type: 'cascade_update'
  sourceCellId: string
  affectedCells: string[]
  couplingStrength: number
  propagationDelay: number
  timestamp: number
}

export type WebSocketMessage =
  | CellUpdateMessage
  | ConfidencePropagationMessage
  | CascadeUpdateMessage