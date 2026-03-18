/**
 * Claw Cell Types
 *
 * Type definitions for Claw cell components
 */

import {
  ClawState,
  ModelProvider,
  EquipmentSlot,
  TriggerType,
  LearningStrategy
} from '@spreadsheet-moment/agent-core';

// Re-export for convenience
export { ClawState, ModelProvider, EquipmentSlot, TriggerType, LearningStrategy };

/**
 * Claw cell configuration
 */
export interface ClawCellConfiguration {
  /** Unique identifier for this Claw instance */
  id: string;

  /** Display name for the Claw agent */
  name: string;

  /** AI model to use */
  model: string;

  /** Model provider */
  provider: ModelProvider;

  /** Purpose/description of what this Claw does */
  purpose: string;

  /** Trigger configuration */
  trigger: {
    /** Trigger type */
    type: 'data' | 'periodic' | 'manual' | 'event';

    /** For periodic triggers: interval in milliseconds */
    interval?: number;

    /** For data triggers: data source to monitor */
    dataSource?: string;

    /** For event triggers: event type to listen for */
    eventType?: string;
  };

  /** Equipment to equip (slots) */
  equipment: EquipmentSlot[];

  /** Learning strategy for seed training */
  learningStrategy?: {
    /** Strategy type */
    type: 'reinforcement' | 'supervised' | 'unsupervised';

    /** Training iterations */
    iterations?: number;

    /** Learning rate */
    learningRate?: number;
  };

  /** Memory configuration */
  memory?: {
    /** Enable hierarchical memory */
    hierarchical?: boolean;

    /** Maximum memory size */
    maxSize?: number;

    /** Memory retention policy */
    retentionPolicy?: 'lru' | 'lfu' | 'fifo';
  };

  /** Social configuration */
  social?: {
    /** Enable slave spawning */
    enableSlaves?: boolean;

    /** Max concurrent slaves */
    maxSlaves?: number;

    /** Enable co-worker collaboration */
    enableCoWorkers?: boolean;
  };
}

/**
 * Claw cell state
 */
export interface ClawCellState {
  /** Claw state */
  clawState: ClawState;

  /** Current reasoning steps */
  reasoningSteps: string[];

  /** Last action taken */
  lastAction?: {
    type: string;
    description: string;
    timestamp: number;
  };

  /** Statistics */
  stats: {
    /** Total executions */
    executions: number;

    /** Successful executions */
    successes: number;

    /** Failed executions */
    failures: number;

    /** Average execution time (ms) */
    avgExecutionTime: number;
  };

  /** Error message if in error state */
  error?: string;
}

/**
 * Claw cell editor props
 */
export interface ClawCellEditorProps {
  /** Current configuration */
  config?: ClawCellConfiguration;

  /** On configuration change */
  onConfigChange: (config: ClawCellConfiguration) => void;

  /** On save */
  onSave: () => void;

  /** On cancel */
  onCancel: () => void;

  /** Read-only mode */
  readOnly?: boolean;

  /** Show advanced options */
  showAdvanced?: boolean;

  /** Custom class name */
  className?: string;
}

/**
 * Claw cell renderer props
 */
export interface ClawCellRendererProps {
  /** Claw cell configuration */
  config: ClawCellConfiguration;

  /** Claw cell state */
  state?: ClawCellState;

  /** Cell location */
  location: string;

  /** Show state indicator */
  showStateIndicator?: boolean;

  /** Show stats */
  showStats?: boolean;

  /** Compact mode */
  compact?: boolean;

  /** On click handler */
  onClick?: () => void;

  /** Custom class name */
  className?: string;
}

/**
 * Claw cell status bar props
 */
export interface ClawCellStatusBarProps {
  /** Claw cells being monitored */
  cells: Array<{
    location: string;
    config: ClawCellConfiguration;
    state?: ClawCellState;
  }>;

  /** On cell click */
  onCellClick?: (location: string) => void;

  /** Show aggregate stats */
  showAggregateStats?: boolean;

  /** Custom class name */
  className?: string;
}

/**
 * Equipment slot info
 */
export interface EquipmentSlotInfo {
  slot: EquipmentSlot;
  name: string;
  description: string;
  icon: string;
  category: 'memory' | 'reasoning' | 'coordination' | 'integration';
  required: boolean;
}

/**
 * Model provider info
 */
export interface ModelProviderInfo {
  provider: ModelProvider;
  name: string;
  description: string;
  models: string[];
  icon: string;
}

/**
 * Claw cell config component props
 */
export interface ClawCellConfigProps {
  /** Current configuration */
  config?: ClawCellConfiguration;

  /** On configuration change */
  onConfigChange: (config: ClawCellConfiguration) => void;

  /** On save */
  onSave: () => void;

  /** On cancel */
  onCancel: () => void;

  /** Read-only mode */
  readOnly?: boolean;

  /** Show advanced options */
  showAdvanced?: boolean;

  /** Custom class name */
  className?: string;
}

/**
 * Claw agent status for management UI
 */
export interface ClawAgentStatus {
  /** Claw ID */
  id: string;

  /** Cell location */
  cellLocation: string;

  /** Agent name */
  name: string;

  /** Current state */
  state: ClawState;

  /** Current configuration */
  config: ClawCellConfiguration;

  /** Runtime state */
  runtimeState?: ClawCellState;

  /** Last activity timestamp */
  lastActivity: number;

  /** Whether agent is connected */
  isConnected: boolean;
}

/**
 * Claw management panel props
 */
export interface ClawManagementPanelProps {
  /** All claw agents */
  agents: ClawAgentStatus[];

  /** Selected agent ID */
  selectedId?: string;

  /** On agent select */
  onSelect?: (agentId: string) => void;

  /** On agent create */
  onCreate?: () => void;

  /** On agent edit */
  onEdit?: (agentId: string) => void;

  /** On agent delete */
  onDelete?: (agentId: string) => void;

  /** On agent trigger */
  onTrigger?: (agentId: string) => void;

  /** Show filters */
  showFilters?: boolean;

  /** Custom class name */
  className?: string;
}

/**
 * Real-time claw update event
 */
export interface ClawUpdateEvent {
  /** Claw ID */
  clawId: string;

  /** Cell location */
  cellLocation: string;

  /** Update type */
  type: 'state_change' | 'reasoning' | 'action' | 'error';

  /** New state (if state change) */
  newState?: ClawState;

  /** Reasoning step (if reasoning) */
  reasoning?: string;

  /** Action taken (if action) */
  action?: string;

  /** Error message (if error) */
  error?: string;

  /** Timestamp */
  timestamp: number;
}
