/**
 * Types for Equipment-Monitoring-Dashboard
 * 
 * Real-time visualization types for agent monitoring
 */

// ============================================
// Re-export core types from starter-agent
// ============================================

export type {
  OriginCore,
  Equipment,
  EquipmentSlot,
  Tile,
  Task,
  TaskResult,
  ConfidenceZone,
  Cell,
  ProvenanceChain,
  Transformation,
  HistoryEntry,
  AgentState,
  Message,
} from '@superinstance/starter-agent';

export { getConfidenceZone } from '@superinstance/starter-agent';

// ============================================
// Dashboard-Specific Types
// ============================================

export interface AgentActivity {
  agentId: string;
  timestamp: number;
  type: ActivityType;
  description: string;
  details: Record<string, unknown>;
  confidence?: number;
  zone?: ConfidenceZone;
}

export type ActivityType = 
  | 'thinking'
  | 'processing'
  | 'waiting'
  | 'communicating'
  | 'equipping'
  | 'unequipping'
  | 'error'
  | 'idle'
  | 'learning'
  | 'optimizing';

export interface CellVisualization {
  cellId: string;
  position: [number, number];
  value: unknown;
  confidence: number;
  zone: ConfidenceZone;
  agentId?: string;
  lastUpdated: number;
  formula?: string;
  provenanceDepth: number;
}

export interface AgentSnapshot {
  id: string;
  state: AgentState;
  currentActivity: AgentActivity;
  thinking: ThinkingState;
  equippedSlots: EquipmentSlot[];
  cellAssignments: string[];
  confidence: number;
  zone: ConfidenceZone;
  lastUpdate: number;
}

export interface ThinkingState {
  isThinking: boolean;
  currentThought?: string;
  thoughtProcess: ThoughtStep[];
  startedAt?: number;
  estimatedCompletion?: number;
}

export interface ThoughtStep {
  step: number;
  description: string;
  timestamp: number;
  confidence?: number;
}

export interface ProvenanceVisualization {
  originId: string;
  chain: ProvenanceChain;
  nodes: ProvenanceNode[];
  edges: ProvenanceEdge[];
}

export interface ProvenanceNode {
  id: string;
  type: 'origin' | 'transformation' | 'output';
  label: string;
  timestamp: number;
  data?: unknown;
}

export interface ProvenanceEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DashboardState {
  agents: Map<string, AgentSnapshot>;
  cells: Map<string, CellVisualization>;
  activities: AgentActivity[];
  provenance: Map<string, ProvenanceVisualization>;
  timestamp: number;
}

export interface DashboardConfig {
  port: number;
  host: string;
  updateIntervalMs: number;
  maxActivitiesStored: number;
  enablePlayback: boolean;
  playbackMaxEntries: number;
}

export interface HistoricalEntry {
  timestamp: number;
  state: DashboardState;
  activities: AgentActivity[];
}

export interface PlaybackState {
  isPlaying: boolean;
  currentIndex: number;
  speed: number;
  startTime: number;
  endTime: number;
}

export interface WebSocketMessage {
  type: MessageType;
  payload: unknown;
  timestamp: number;
}

export type MessageType =
  | 'agent_update'
  | 'cell_update'
  | 'activity_update'
  | 'provenance_update'
  | 'state_sync'
  | 'playback_control'
  | 'subscription'
  | 'unsubscription';

export interface Subscription {
  id: string;
  clientId: string;
  filters: SubscriptionFilter;
}

export interface SubscriptionFilter {
  agentIds?: string[];
  cellIds?: string[];
  activityTypes?: ActivityType[];
  zones?: ConfidenceZone[];
}

export interface ConfidenceZoneIndicator {
  zone: ConfidenceZone;
  count: number;
  percentage: number;
  agents: string[];
}

export interface EquipmentStatus {
  name: string;
  slot: EquipmentSlot;
  isActive: boolean;
  equippedBy: string[];
  lastUsed?: number;
  usageCount: number;
  averageConfidence: number;
}

export interface DashboardMetrics {
  totalAgents: number;
  activeAgents: number;
  totalCells: number;
  confidenceDistribution: ConfidenceZoneIndicator[];
  equipmentUsage: Map<string, EquipmentStatus>;
  averageProcessingTime: number;
  throughputPerMinute: number;
}

export interface VisualizationTheme {
  colors: {
    green: string;
    yellow: string;
    red: string;
    background: string;
    text: string;
    accent: string;
  };
  cellSize: number;
  animationDuration: number;
  showGridLines: boolean;
}

export const DEFAULT_THEME: VisualizationTheme = {
  colors: {
    green: '#22c55e',
    yellow: '#eab308',
    red: '#ef4444',
    background: '#0f172a',
    text: '#f8fafc',
    accent: '#3b82f6',
  },
  cellSize: 40,
  animationDuration: 300,
  showGridLines: true,
};

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  port: 3001,
  host: 'localhost',
  updateIntervalMs: 100,
  maxActivitiesStored: 1000,
  enablePlayback: true,
  playbackMaxEntries: 10000,
};
