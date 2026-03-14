/**
 * Core Types for SuperInstance Starter Agent
 * 
 * Based on Origin-Centric Data Systems and Tile Algebra formalization
 */

// ============================================
// Origin-Centric Types
// ============================================

export interface ReferenceFrame {
  type: 'local' | 'global' | 'relative';
  parentId?: string;
  transform?: CoordinateTransform;
}

export interface CoordinateTransform {
  rotation?: number;
  scale?: number;
  translation?: [number, number];
}

export interface ProvenanceEntry {
  originId: string;
  transformation: Transformation;
  timestamp: number;
}

export interface ProvenanceChain {
  entries: ProvenanceEntry[];
  immutable: true;
}

export interface OriginState {
  origin: ProvenanceChain;
  data: DataType;
  transformations: Transformation[];
  function: () => unknown;
}

export interface Transformation {
  id: string;
  type: string;
  input: unknown;
  output: unknown;
  timestamp: number;
}

export interface DataType {
  type: 'empty' | 'primitive' | 'composite' | 'reference';
  value: unknown;
  schema?: Schema;
}

export interface Schema {
  type: string;
  properties?: Record<string, Schema>;
  items?: Schema;
}

export interface RateBasedUpdate {
  dataRate: number;      // dD/dt
  transformRate: number; // dT/dt
  functionRate: number;  // dΦ/dt
  lastUpdate: number;
}

// ============================================
// History Types
// ============================================

export interface HistoryEntry {
  timestamp: number;
  type: 'input' | 'output' | 'equipment_change' | 'optimization' | 'error';
  data: Record<string, unknown>;
  confidence: number;
  source: string;
}

export interface InformationHistory {
  entries: HistoryEntry[];
  maxSize: number;
}

// ============================================
// Equipment Types
// ============================================

export type EquipmentSlot = 
  | 'MEMORY' 
  | 'REASONING' 
  | 'CONSENSUS' 
  | 'SPREADSHEET' 
  | 'DISTILLATION' 
  | 'PERCEPTION'
  | 'COORDINATION'
  | 'COMMUNICATION'
  | 'SELF_IMPROVEMENT'
  | 'MONITORING';

export interface CostMetrics {
  memoryBytes: number;
  cpuPercent: number;
  latencyMs: number;
  costPerUse: number;
}

export interface BenefitMetrics {
  accuracyBoost: number;
  speedMultiplier: number;
  confidenceBoost: number;
  capabilityGain: string[];
}

export interface TriggerCondition {
  metric: string;
  operator: '<' | '>' | '<=' | '>=' | '==' | '!=';
  value: number;
}

export interface TriggerThresholds {
  equipWhen: TriggerCondition[];
  unequipWhen: TriggerCondition[];
  callTeacher: { low: number; high: number };
}

export interface Equipment {
  readonly name: string;
  readonly slot: EquipmentSlot;
  readonly version: string;
  readonly description: string;
  readonly cost: CostMetrics;
  readonly benefit: BenefitMetrics;
  readonly triggerThresholds: TriggerThresholds;
  
  equip(agent: OriginCore): Promise<void>;
  unequip(agent: OriginCore): Promise<void>;
  asTile(): Tile;
  describe(): EquipmentDescription;
}

export interface EquipmentDescription {
  name: string;
  slot: EquipmentSlot;
  purpose: string;
  whenToUse: string[];
  whenToRemove: string[];
  dependencies: EquipmentSlot[];
  conflicts: EquipmentSlot[];
}

// ============================================
// Tile Types
// ============================================

export interface TileType {
  type: 'primitive' | 'composite' | 'union' | 'array';
  name?: string;
  properties?: Record<string, TileType>;
  members?: TileType[];
  element?: TileType;
}

export interface Tile {
  inputType: TileType;
  outputType: TileType;
  compute: (input: unknown) => unknown;
  confidence: (input: unknown) => number;
  trace: (input: unknown) => string;
}

export interface TileGrid {
  tiles: Map<string, Tile>;
  dimensions: [number, number];
  origin: string;
}

// ============================================
// Task Types
// ============================================

export type TaskType = 
  | 'decision' 
  | 'analysis' 
  | 'generation' 
  | 'distillation' 
  | 'coordination' 
  | 'learning'
  | 'visualization'
  | 'monitoring'
  | 'improvement';

export interface Task {
  id: string;
  type: TaskType;
  query: string;
  context?: Record<string, unknown>;
  stakes?: number;
  urgencyMs?: number;
  requiredCapabilities?: EquipmentSlot[];
  metadata?: Record<string, unknown>;
}

export interface TaskResult {
  taskId: string;
  output: unknown;
  confidence: number;
  zone: ConfidenceZone;
  equipmentUsed: EquipmentSlot[];
  processingTimeMs: number;
  provenance: ProvenanceChain;
  calledTeacher: boolean;
}

// ============================================
// Confidence Types
// ============================================

export type ConfidenceZone = 'GREEN' | 'YELLOW' | 'RED';

export function getConfidenceZone(confidence: number): ConfidenceZone {
  if (confidence >= 0.9) return 'GREEN';
  if (confidence >= 0.6) return 'YELLOW';
  return 'RED';
}

// ============================================
// Trigger System Types
// ============================================

export interface ThresholdMonitor {
  metric: string;
  currentValue: number;
  threshold: number;
  action: 'call_teacher' | 'equip' | 'unequip' | 'alert';
  equipment?: string;
}

export interface EquipmentRecommendation {
  equipment: string;
  slot: EquipmentSlot;
  reason: string;
  confidence: number;
  autoEquip: boolean;
}

export interface TriggerRegistry {
  thresholds: ThresholdConfig;
  monitors: ThresholdMonitor[];
  recommendations: EquipmentRecommendation[];
}

export interface ThresholdConfig {
  confidence: { low: number; high: number };
  load: { low: number; high: number };
  complexity: { low: number; high: number };
  memory: { low: number; high: number };
}

// ============================================
// Agent Types
// ============================================

export interface AgentConfig {
  id?: string;
  debug?: boolean;
  historyMaxSize?: number;
  thresholds?: Partial<ThresholdConfig>;
  teacherEndpoint?: string;
  llmConfig?: LLMConfig;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'local';
  model: string;
  apiKey?: string;
  endpoint?: string;
}

export interface OriginCore {
  readonly id: string;
  referenceFrame: ReferenceFrame;
  state: OriginState;
  history: InformationHistory;
  rates: RateBasedUpdate;
  equipment: Map<EquipmentSlot, Equipment>;
  availableEquipment: Map<string, Equipment>;
  triggers: TriggerRegistry;
  tiles: Map<string, Tile>;
  
  registerEquipment(equipment: Equipment): void;
  equip(equipmentName: string): Promise<boolean>;
  unequipSlot(slot: EquipmentSlot): Promise<boolean>;
  hasEquipment(slot: EquipmentSlot): boolean;
  getEquippedEquipment(): { slot: EquipmentSlot; name: string }[];
  processTask(task: Task): Promise<TaskResult>;
  optimize(): Promise<void>;
  getState(): AgentState;
  reset(): Promise<void>;
}

export interface AgentState {
  id: string;
  equipment: EquipmentSlot[];
  confidence: number;
  rates: RateBasedUpdate;
}

// ============================================
// Cell Types for Spreadsheet
// ============================================

export interface Cell {
  id: string;
  position: [number, number];
  value: unknown;
  formula?: string;
  tiles: Tile[];
  confidence: number;
  provenance: ProvenanceChain;
  agent?: string;
}

export interface Spreadsheet {
  cells: Map<string, Cell>;
  dimensions: [number, number];
  origin: string;
}

// ============================================
// Network Types
// ============================================

export interface AgentNetwork {
  agents: Map<string, OriginCore>;
  connections: Map<string, string[]>;
  sharedMemory: Map<string, unknown>;
}

export interface Message {
  from: string;
  to: string;
  type: 'request' | 'response' | 'broadcast' | 'update';
  payload: unknown;
  timestamp: number;
}
