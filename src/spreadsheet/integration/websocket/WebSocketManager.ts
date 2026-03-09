/**
 * POLLN Spreadsheet Integration - WebSocket Manager
 *
 * Real-time communication layer for living LOG cells.
 * Implements cell whisper protocol and consciousness streaming.
 *
 * Features:
 * - Neighborhood-based message propagation (Cell Whisper)
 * - Consciousness stream generation
 * - Quantum entanglement synchronization
 * - Efficient state synchronization
 */

import { EventEmitter } from 'events';

/**
 * WebSocket message types for cell communication
 */
export enum MessageType {
  // Cell lifecycle
  CELL_BORN = 'cell_born',
  CELL_DIED = 'cell_died',
  CELL_AWAKENED = 'cell_awakened',

  // State changes
  STATE_CHANGED = 'state_changed',
  VALUE_CHANGED = 'value_changed',
  CONFIDENCE_CHANGED = 'confidence_changed',

  // Sensation
  SENSATION_TRIGGERED = 'sensation_triggered',
  SENSATION_BATCH = 'sensation_batch',

  // Communication
  WHISPER = 'whisper',
  ENTANGLE = 'entangle',
  DISENTANGLE = 'disentangle',

  // Consciousness
  CONSCIOUSNESS_STREAM = 'consciousness_stream',
  MEMORY_RECALL = 'memory_recall',

  // System
  PING = 'ping',
  PONG = 'pong',
  ERROR = 'error',
}

/**
 * Cell whisper message - neighborhood propagation
 */
export interface WhisperMessage {
  type: MessageType.WHISPER;
  from: string;
  to: string[];
  payload: {
    sensation: string;
    value: number;
    confidence: number;
    timestamp: number;
  };
  strength: number; // Decays with distance
}

/**
 * Quantum entanglement message
 */
export interface EntangleMessage {
  type: MessageType.ENTANGLE | MessageType.DISENTANGLE;
  cell1: string;
  cell2: string;
  mode: 'sync' | 'mirror' | 'complement';
}

/**
 * Consciousness stream entry
 */
export interface ConsciousnessEntry {
  cellId: string;
  timestamp: number;
  state: string;
  thought: string;
  confidence: number;
  inputs: Array<{ source: string; value: unknown }>;
  outputs: Array<{ target: string; value: unknown }>;
}

/**
 * WebSocket manager configuration
 */
export interface WebSocketManagerConfig {
  url: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  batchSize?: number;
  compressionEnabled?: boolean;
}

/**
 * WebSocket Manager - Real-time cell communication
 */
export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketManagerConfig>;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: Array<{ type: MessageType; payload: unknown }> = [];
  private isConnected: boolean = false;
  private entangledPairs: Map<string, Set<string>> = new Map();
  private consciousnessBuffer: Map<string, ConsciousnessEntry[]> = new Map();

  constructor(config: WebSocketManagerConfig) {
    super();
    this.config = {
      autoReconnect: true,
      reconnectInterval: 3000,
      heartbeatInterval: 30000,
      batchSize: 10,
      compressionEnabled: true,
      ...config,
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.isConnected = true;
          this.flushMessageQueue();
          this.startHeartbeat();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Disconnected');
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('disconnected');

          if (this.config.autoReconnect) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.emit('error', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Send whisper to neighborhood cells
   */
  whisper(message: Omit<WhisperMessage, 'type'>): void {
    if (!this.isConnected) {
      this.messageQueue.push({
        type: MessageType.WHISPER,
        payload: message,
      });
      return;
    }

    this.send({
      type: MessageType.WHISPER,
      ...message,
    });
  }

  /**
   * Entangle two cells for instant synchronization
   */
  entangle(cell1: string, cell2: string, mode: 'sync' | 'mirror' | 'complement'): void {
    // Track entanglement
    if (!this.entangledPairs.has(cell1)) {
      this.entangledPairs.set(cell1, new Set());
    }
    if (!this.entangledPairs.has(cell2)) {
      this.entangledPairs.set(cell2, new Set());
    }

    this.entangledPairs.get(cell1)!.add(cell2);
    this.entangledPairs.get(cell2)!.add(cell1);

    this.send({
      type: MessageType.ENTANGLE,
      cell1,
      cell2,
      mode,
    });

    this.emit('entangled', { cell1, cell2, mode });
  }

  /**
   * Disentangle cells
   */
  disentangle(cell1: string, cell2: string): void {
    this.entangledPairs.get(cell1)?.delete(cell2);
    this.entangledPairs.get(cell2)?.delete(cell1);

    this.send({
      type: MessageType.DISENTANGLE,
      cell1,
      cell2,
    });

    this.emit('disentangled', { cell1, cell2 });
  }

  /**
   * Check if two cells are entangled
   */
  areEntangled(cell1: string, cell2: string): boolean {
    return this.entangledPairs.get(cell1)?.has(cell2) ?? false;
  }

  /**
   * Get all entangled partners for a cell
   */
  getEntangledPartners(cellId: string): Set<string> {
    return this.entangledPairs.get(cellId) ?? new Set();
  }

  /**
   * Add consciousness entry for a cell
   */
  addConsciousness(entry: ConsciousnessEntry): void {
    if (!this.consciousnessBuffer.has(entry.cellId)) {
      this.consciousnessBuffer.set(entry.cellId, []);
    }

    const buffer = this.consciousnessBuffer.get(entry.cellId)!;
    buffer.push(entry);

    // Keep only last 100 entries per cell
    if (buffer.length > 100) {
      buffer.shift();
    }

    // Broadcast to subscribers
    this.send({
      type: MessageType.CONSCIOUSNESS_STREAM,
      payload: entry,
    });
  }

  /**
   * Get consciousness stream for a cell
   */
  getConsciousness(cellId: string, limit: number = 50): ConsciousnessEntry[] {
    const buffer = this.consciousnessBuffer.get(cellId) ?? [];
    return buffer.slice(-limit);
  }

  /**
   * Send message to server
   */
  private send(message: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message as { type: MessageType; payload: unknown });
      return;
    }

    const data = JSON.stringify(message);
    this.ws.send(data);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case MessageType.WHISPER:
          this.emit('whisper', message.payload);
          break;

        case MessageType.ENTANGLE:
          if (!this.entangledPairs.has(message.cell1)) {
            this.entangledPairs.set(message.cell1, new Set());
          }
          if (!this.entangledPairs.has(message.cell2)) {
            this.entangledPairs.set(message.cell2, new Set());
          }
          this.entangledPairs.get(message.cell1)!.add(message.cell2);
          this.entangledPairs.get(message.cell2)!.add(message.cell1);
          this.emit('entangled', { cell1: message.cell1, cell2: message.cell2 });
          break;

        case MessageType.DISENTANGLE:
          this.entangledPairs.get(message.cell1)?.delete(message.cell2);
          this.entangledPairs.get(message.cell2)?.delete(message.cell1);
          this.emit('disentangled', { cell1: message.cell1, cell2: message.cell2 });
          break;

        case MessageType.CONSCIOUSNESS_STREAM:
          if (!this.consciousnessBuffer.has(message.payload.cellId)) {
            this.consciousnessBuffer.set(message.payload.cellId, []);
          }
          this.consciousnessBuffer.get(message.payload.cellId)!.push(message.payload);
          this.emit('consciousness', message.payload);
          break;

        case MessageType.PING:
          this.send({ type: MessageType.PONG });
          break;

        case MessageType.PONG:
          // Heartbeat acknowledged
          break;

        case MessageType.ERROR:
          console.error('[WebSocket] Server error:', message.payload);
          this.emit('error', message.payload);
          break;

        default:
          this.emit(message.type, message.payload);
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message!);
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      console.log('[WebSocket] Attempting reconnect...');
      this.connect().catch(() => {
        this.scheduleReconnect();
      });
      this.reconnectTimer = null;
    }, this.config.reconnectInterval);
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: MessageType.PING });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

/**
 * Create a singleton WebSocket manager instance
 */
let wsManagerInstance: WebSocketManager | null = null;

export function getWebSocketManager(config?: WebSocketManagerConfig): WebSocketManager {
  if (!wsManagerInstance && config) {
    wsManagerInstance = new WebSocketManager(config);
  }
  return wsManagerInstance!;
}

export default WebSocketManager;
