import type { WebSocket } from '@cloudflare/workers-types'
import type { Env } from '../env.d.ts'
import type { CellUpdateMessage, ConfidencePropagationMessage, CascadeUpdateMessage } from '../api/cells/types'

interface WebSocketEnv {
  Bindings: Env
}

// Store WebSocket connections by cell ID
const connections = new Map<string, Set<WebSocket>>()

// Rate limiting for WebSocket messages
const messageRateLimit = new Map<string, { count: number; window: number }>()

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // Parse WebSocket URL
    const url = new URL(request.url)
    const cellId = url.pathname.split('/').pop()

    if (!cellId) {
      return new Response('Invalid cell ID', { status: 400 })
    }

    // Verify WebSocket upgrade
    const upgradeHeader = request.headers.get('Upgrade')
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return new Response('Missing authentication', { status: 401 })
    }

    // In production, verify JWT token here
    // For now, we'll proceed with the WebSocket connection

    const webSocketPair = new WebSocketPair()
    const [clientWebSocket, serverWebSocket] = Object.values(webSocketPair)

    serverWebSocket.accept()

    // Add connection to tracking
    if (!connections.has(cellId)) {
      connections.set(cellId, new Set())
    }
    connections.get(cellId)!.add(serverWebSocket)

    // Send initial connection acknowledgment
    serverWebSocket.send(JSON.stringify({
      type: 'connected',
      cellId,
      timestamp: Date.now(),
    }))

    // Handle incoming messages
    serverWebSocket.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string)
        await handleWebSocketMessage(serverWebSocket, cellId, data, env)
      } catch (error) {
        console.error('WebSocket message error:', error)
        serverWebSocket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }))
      }
    })

    // Handle connection close
    serverWebSocket.addEventListener('close', () => {
      connections.get(cellId)?.delete(serverWebSocket)
      if (connections.get(cellId)?.size === 0) {
        connections.delete(cellId)
      }
    })

    // Handle connection errors
    serverWebSocket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error)
      connections.get(cellId)?.delete(serverWebSocket)
      if (connections.get(cellId)?.size === 0) {
        connections.delete(cellId)
      }
    })

    return new Response(null, {
      status: 101,
      webSocket: clientWebSocket,
    })
  },
}

async function handleWebSocketMessage(
  ws: WebSocket,
  cellId: string,
  message: any,
  env: Env
): Promise<void> {
  // Check rate limiting
  const clientId = ws.toString() // Use WebSocket object as unique identifier
  const now = Date.now()
  const window = Math.floor(now / 1000) * 1000 // 1-second windows

  const rateLimit = messageRateLimit.get(clientId)
  if (rateLimit && rateLimit.window === window && rateLimit.count >= 10) {
    ws.send(JSON.stringify({
      type: 'rate_limit',
      message: 'Too many messages',
    }))
    return
  }

  // Update rate limit
  if (!rateLimit || rateLimit.window !== window) {
    messageRateLimit.set(clientId, { window, count: 1 })
  } else {
    rateLimit.count++
  }

  // Clean up old rate limit entries periodically
  if (Math.random() < 0.01) { // 1% chance
    const cutoff = now - 10000 // 10 seconds ago
    for (const [key, value] of messageRateLimit.entries()) {
      if (value.window < cutoff) {
        messageRateLimit.delete(key)
      }
    }
  }

  // Handle different message types
  switch (message.type) {
    case 'subscribe':
      handleSubscribe(ws, cellId, message)
      break

    case 'unsubscribe':
      handleUnsubscribe(ws, cellId, message)
      break

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: now }))
      break

    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${message.type}`,
      }))
  }
}

function handleSubscribe(ws: WebSocket, cellId: string, message: any): void {
  // For now, just acknowledge the subscription
  ws.send(JSON.stringify({
    type: 'subscribed',
    cellId,
    timestamp: Date.now(),
  }))
}

function handleUnsubscribe(ws: WebSocket, cellId: string, message: any): void {
  // For now, just acknowledge the unsubscription
  ws.send(JSON.stringify({
    type: 'unsubscribed',
    cellId,
    timestamp: Date.now(),
  }))
}

// Helper function to broadcast cell updates to all connected clients
export async function broadcastCellUpdate(
  cellId: string,
  message: CellUpdateMessage,
): Promise<void> {
  const messageStr = JSON.stringify(message)
  const cellConnections = connections.get(cellId)

  if (!cellConnections || cellConnections.size === 0) {
    return
  }

  const failedConnections: WebSocket[] = []

  for (const ws of cellConnections) {
    try {
      ws.send(messageStr)
    } catch (error) {
      console.error(`Failed to send message to WebSocket for cell ${cellId}:`, error)
      failedConnections.push(ws)
    }
  }

  // Clean up failed connections
  for (const ws of failedConnections) {
    cellConnections.delete(ws)
  }
}

// Helper function to broadcast confidence propagation
export async function broadcastConfidencePropagation(
  sourceCellId: string,
  message: ConfidencePropagationMessage,
  targetCellIds: string[],
): Promise<void> {
  const messageStr = JSON.stringify(message)

  for (const cellId of targetCellIds) {
    const cellConnections = connections.get(cellId)
    if (!cellConnections || cellConnections.size === 0) continue

    for (const ws of cellConnections) {
      try {
        ws.send(messageStr)
      } catch (error) {
        console.error(`Failed to send confidence propagation to cell ${cellId}:`, error)
        cellConnections.delete(ws)
      }
    }
  }
}

// Helper function to broadcast cascade updates
export async function broadcastCascadeUpdate(
  sourceCellId: string,
  message: CascadeUpdateMessage,
): Promise<void> {
  const messageStr = JSON.stringify(message)

  for (const cellId of message.affectedCells) {
    const cellConnections = connections.get(cellId)
    if (!cellConnections || cellConnections.size === 0) continue

    for (const ws of cellConnections) {
      try {
        ws.send(messageStr)
      } catch (error) {
        console.error(`Failed to send cascade update to cell ${cellId}:`, error)
        cellConnections.delete(ws)
      }
    }
  }
}

// Periodic health check to keep WebSocket connections alive
setInterval(() => {
  const now = Date.now()
  for (const [cellId, cellConnections] of connections.entries()) {
    const failedConnections: WebSocket[] = []

    for (const ws of cellConnections) {
      try {
        ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: now,
        }))
      } catch (error) {
        console.error(`Failed to send heartbeat to cell ${cellId}:`, error)
        failedConnections.push(ws)
      }
    }

    for (const ws of failedConnections) {
      cellConnections.delete(ws)
    }

    if (cellConnections.size === 0) {
      connections.delete(cellId)
    }
  }
}, 30000) // 30 seconds