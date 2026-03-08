/**
 * POLLN Hydraulic Framework Types
 *
 * Based on EMERGENT_GRANULAR_INTELLIGENCE research
 * Hydraulic system metaphor for emergent AI systems
 *
 * Core Concepts:
 * - Pressure: Task demand / signal strength
 * - Flow: Information/capability transfer
 * - Valves: Agent hand-off decisions
 * - Pumps: Capability amplification
 * - Reservoirs: Cached knowledge / LoRAs
 * - Pipes: Communication pathways
 * - Resistance: Processing bottlenecks
 * - Turbulence: Stochastic exploration
 */

// ============================================================================
// CORE HYDRAULIC TYPES
// ============================================================================

/**
 * Represents pressure at a point in the system
 * Pressure = Σ (incoming signals) + λ·(external signals) + (internal state)
 */
export interface Pressure {
  id: string;
  agentId: string;
  value: number;           // 0-1 normalized pressure
  components: {
    incoming: number;      // From connected agents
    external: number;      // From environment/tasks
    internal: number;      // From agent's own state
  };
  timestamp: number;
  metadata?: Map<string, unknown>;
}

/**
 * Represents information flow between agents
 * Flow = σ(P_target - P_source) · weight · (1 - resistance)
 */
export interface Flow {
  id: string;
  sourceId: string;
  targetId: string;
  rate: number;            // Information transfer rate
  pressure: {
    source: number;
    target: number;
    gradient: number;      // P_target - P_source
  };
  resistance: number;      // 0-1, where 1 = blocked
  timestamp: number;
  metadata?: Map<string, unknown>;
}

/**
 * Valve controls flow through the system
 * Implements Plinko stochastic selection
 */
export interface Valve {
  id: string;
  agentId: string;
  state: 'open' | 'closed' | 'throttled';
  aperture: number;        // 0-1, how open the valve is
  temperature: number;     // Controls stochasticity
  throughput: number;      // Current flow rate
  lastDecision: number;
}

/**
 * Pump amplifies flow when needed
 * Implemented via value network reinforcement
 */
export interface Pump {
  id: string;
  agentId: string;
  capacity: number;        // Max amplification factor
  currentOutput: number;   // Current amplification
  energy: number;          // Available "energy" for pumping
  efficiency: number;      // Energy to amplification ratio
  state: 'idle' | 'pumping' | 'overheated';
  lastActivation: number;
}

/**
 * Reservoir stores patterns for later use
 * Implemented via KV-anchor cache pools
 */
export interface Reservoir {
  id: string;
  capacity: number;
  currentLevel: number;
  patterns: StoredPattern[];
  quality: number;         // Average quality of stored patterns
  lastAccess: number;
}

/**
 * Pattern stored in reservoir
 */
export interface StoredPattern {
  id: string;
  embedding: number[];     // BES embedding
  anchor: string;          // KV-anchor reference
  quality: number;         // 0-1 quality score
  accessCount: number;
  lastAccess: number;
  createdAt: number;
  metadata: Map<string, unknown>;
}

/**
 * Pipe represents communication pathway
 * Weight determined by Hebbian learning
 */
export interface Pipe {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;          // Synaptic weight
  capacity: number;        // Max flow rate
  resistance: number;      // Current resistance
  latency: number;         // Transmission latency
  state: 'active' | 'degraded' | 'blocked';
}

// ============================================================================
// HYDRAULIC SYSTEM STATE
// ============================================================================

/**
 * Complete hydraulic system state
 */
export interface HydraulicSystemState {
  pressures: Map<string, Pressure>;
  flows: Map<string, Flow>;
  valves: Map<string, Valve>;
  pumps: Map<string, Pump>;
  reservoirs: Map<string, Reservoir>;
  pipes: Map<string, Pipe>;
  timestamp: number;
}

/**
 * System-wide metrics
 */
export interface HydraulicMetrics {
  // Pressure metrics
  avgPressure: number;
  maxPressure: number;
  pressureVariance: number;

  // Flow metrics
  totalFlow: number;
  avgFlowRate: number;
  flowEfficiency: number;

  // System health
  systemLoad: number;      // 0-1, overall system utilization
  bottleneckCount: number; // Number of constrained paths
  turbulence: number;      // Amount of stochastic exploration

  // Component status
  activePumps: number;
  activeValves: number;
  reservoirUtilization: number;
}

// ============================================================================
// HYDRAULIC CONFIGURATION
// ============================================================================

export interface HydraulicConfig {
  // Pressure settings
  pressureUpdateInterval: number;
  pressureDecayRate: number;
  maxPressure: number;

  // Flow settings
  flowUpdateInterval: number;
  minFlowThreshold: number;
  maxFlowRate: number;

  // Valve settings
  valveUpdateInterval: number;
  defaultTemperature: number;
  minTemperature: number;
  temperatureDecayRate: number;

  // Pump settings
  pumpCapacity: number;
  pumpEfficiency: number;
  pumpCooldown: number;
  pumpOverheatThreshold: number;

  // Reservoir settings
  reservoirCapacity: number;
  reservoirEvictionPolicy: 'lru' | 'lfu' | 'quality';
  reservoirQualityThreshold: number;

  // Monitoring
  metricsInterval: number;
  alertThresholds: {
    highPressure: number;
    lowFlow: number;
    highResistance: number;
    lowReservoir: number;
  };
}

// ============================================================================
// HYDRAULIC EVENTS
// ============================================================================

export enum HydraulicEventType {
  PRESSURE_SPIKE = 'PRESSURE_SPIKE',
  PRESSURE_DROP = 'PRESSURE_DROP',
  FLOW_SURGE = 'FLOW_SURGE',
  FLOW_BLOCKAGE = 'FLOW_BLOCKAGE',
  VALVE_OPEN = 'VALVE_OPEN',
  VALVE_CLOSE = 'VALVE_CLOSE',
  PUMP_ACTIVATE = 'PUMP_ACTIVATE',
  PUMP_OVERHEAT = 'PUMP_OVERHEAT',
  RESERVOIR_LOW = 'RESERVOIR_LOW',
  RESERVOIR_FULL = 'RESERVOIR_FULL',
  BOTTLENECK_DETECTED = 'BOTTLENECK_DETECTED',
  SYSTEM_IMBALANCE = 'SYSTEM_IMBALANCE',
}

export interface HydraulicEvent {
  type: HydraulicEventType;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
  componentId: string;
  description: string;
  data: Record<string, unknown>;
}

// ============================================================================
// HYDRAULIC ANALYSIS RESULTS
// ============================================================================

export interface PressureAnalysis {
  agentId: string;
  currentPressure: number;
  trend: 'rising' | 'falling' | 'stable';
  forecast: number[];      // Future pressure predictions
  recommendations: string[];
}

export interface FlowAnalysis {
  sourceId: string;
  targetId: string;
  currentFlow: number;
  efficiency: number;      // Actual vs theoretical max
  bottlenecks: string[];
  optimizations: string[];
}

export interface SystemBalance {
  isBalanced: boolean;
  imbalanceScore: number;  // 0-1, higher = more imbalanced
  highPressureZones: string[];
  lowPressureZones: string[];
  recommendations: string[];
}
