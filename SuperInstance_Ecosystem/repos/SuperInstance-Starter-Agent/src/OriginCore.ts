/**
 * Origin Core - The minimal SuperInstance agent
 * 
 * Based on Origin-Centric Data Systems theorem:
 * "An origin-centric system converges to consistency in O(log n) time 
 * without requiring global state coordination."
 */

import type {
  OriginCore as IOriginCore,
  OriginState,
  ProvenanceEntry,
  RateBasedUpdate,
  ReferenceFrame,
  InformationHistory,
  HistoryEntry,
  Equipment,
  EquipmentSlot,
  Tile,
  Task,
  TaskResult,
  ConfidenceZone,
  TriggerRegistry,
  ThresholdConfig,
  EquipmentRecommendation,
  AgentConfig,
  AgentState,
} from './types';

import { getConfidenceZone } from './types';

const DEFAULT_THRESHOLDS: ThresholdConfig = {
  confidence: { low: 0.6, high: 0.9 },
  load: { low: 0.3, high: 0.8 },
  complexity: { low: 0.2, high: 0.7 },
  memory: { low: 0.5, high: 0.9 },
};

export class OriginCore implements IOriginCore {
  // Identity
  readonly id: string;
  
  // Origin Node properties
  referenceFrame: ReferenceFrame;
  state: OriginState;
  history: InformationHistory;
  
  // Rate-based updates
  rates: RateBasedUpdate;
  
  // Equipment system
  equipment: Map<EquipmentSlot, Equipment>;
  availableEquipment: Map<string, Equipment>;
  triggers: TriggerRegistry;
  
  // Tiles
  tiles: Map<string, Tile>;
  
  // Configuration
  private config: AgentConfig;
  private debug: boolean;
  
  constructor(config: AgentConfig = {}) {
    this.id = config.id ?? `origin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.config = config;
    this.debug = config.debug ?? false;
    
    // Initialize reference frame
    this.referenceFrame = { type: 'local' };
    
    // Initialize state
    this.state = {
      origin: { entries: [], immutable: true },
      data: { type: 'empty', value: null },
      transformations: [],
      function: () => null,
    };
    
    // Initialize history
    this.history = {
      entries: [],
      maxSize: config.historyMaxSize ?? 100,
    };
    
    // Initialize rates
    this.rates = {
      dataRate: 0,
      transformRate: 0,
      functionRate: 0,
      lastUpdate: Date.now(),
    };
    
    // Initialize equipment system
    this.equipment = new Map();
    this.availableEquipment = new Map();
    this.tiles = new Map();
    
    // Initialize triggers
    this.triggers = {
      thresholds: { ...DEFAULT_THRESHOLDS, ...config.thresholds },
      monitors: [],
      recommendations: [],
    };
    
    this.log('Origin Core initialized', { id: this.id });
  }
  
  // ============================================
  // Equipment Management
  // ============================================
  
  /**
   * Register equipment as available for equipping
   */
  registerEquipment(equipment: Equipment): void {
    this.availableEquipment.set(equipment.name, equipment);
    this.log('Equipment registered', { name: equipment.name, slot: equipment.slot });
  }
  
  /**
   * Equip a piece of equipment to a slot
   */
  async equip(equipmentName: string): Promise<boolean> {
    const equipment = this.availableEquipment.get(equipmentName);
    if (!equipment) {
      this.log('Equipment not found', { name: equipmentName });
      return false;
    }
    
    // Check if slot is occupied
    const currentEquipment = this.equipment.get(equipment.slot);
    if (currentEquipment) {
      await this.unequipSlot(equipment.slot);
    }
    
    // Equip new equipment
    await equipment.equip(this);
    this.equipment.set(equipment.slot, equipment);
    
    // Register tile
    this.tiles.set(equipment.name, equipment.asTile());
    
    // Add to history
    this.addHistoryEntry('equipment_change', {
      action: 'equip',
      equipment: equipment.name,
      slot: equipment.slot,
    });
    
    this.log('Equipment equipped', { name: equipment.name, slot: equipment.slot });
    return true;
  }
  
  /**
   * Unequip equipment from a slot
   */
  async unequipSlot(slot: EquipmentSlot): Promise<boolean> {
    const equipment = this.equipment.get(slot);
    if (!equipment) return false;
    
    await equipment.unequip(this);
    this.equipment.delete(slot);
    this.tiles.delete(equipment.name);
    
    this.addHistoryEntry('equipment_change', {
      action: 'unequip',
      equipment: equipment.name,
      slot: slot,
    });
    
    this.log('Equipment unequipped', { name: equipment.name, slot });
    return true;
  }
  
  /**
   * Check if equipment is equipped
   */
  hasEquipment(slot: EquipmentSlot): boolean {
    return this.equipment.has(slot);
  }
  
  /**
   * Get equipped equipment names
   */
  getEquippedEquipment(): { slot: EquipmentSlot; name: string }[] {
    return Array.from(this.equipment.entries()).map(([slot, equip]) => ({
      slot,
      name: equip.name,
    }));
  }
  
  // ============================================
  // Task Processing
  // ============================================
  
  /**
   * Process a task with automatic equipment selection
   */
  async processTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    
    this.log('Processing task', { id: task.id, type: task.type });
    
    // Analyze task requirements
    const analysis = this.analyzeTask(task);
    
    // Auto-equip needed equipment
    await this.autoEquip(analysis.requiredSlots);
    
    // Add input to history
    this.addHistoryEntry('input', {
      taskId: task.id,
      query: task.query,
      analysis,
    });
    
    // Process based on equipped capabilities
    let output: unknown;
    let confidence = 0.5;
    let calledTeacher = false;
    
    // Check confidence zone
    const zone = this.evaluateConfidence(analysis, task);
    
    if (zone === 'RED' && this.config.teacherEndpoint) {
      // Call teacher in RED zone
      output = await this.callTeacher(task);
      confidence = 0.95;
      calledTeacher = true;
    } else if (this.hasEquipment('REASONING')) {
      // Use reasoning equipment
      const reasoning = this.equipment.get('REASONING')!;
      const tile = reasoning.asTile();
      output = tile.compute({ task, analysis });
      confidence = tile.confidence({ task, analysis });
    } else {
      // Fallback processing
      output = this.fallbackProcess(task);
      confidence = 0.4;
    }
    
    // Apply consensus if needed
    if (task.stakes && task.stakes >= 0.7 && this.hasEquipment('CONSENSUS')) {
      const consensus = this.equipment.get('CONSENSUS')!;
      const result = await consensus.asTile().compute({ query: task.query, currentOutput: output });
      output = result.decision;
      confidence = result.confidence;
    }
    
    // Update provenance
    this.addToProvenance({
      originId: this.id,
      transformation: {
        id: `transform_${Date.now()}`,
        type: task.type,
        input: task.query,
        output: output,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
    
    // Add output to history
    this.addHistoryEntry('output', {
      taskId: task.id,
      output,
      confidence,
    });
    
    // Update rates
    this.updateRates();
    
    // Generate equipment recommendations
    this.generateRecommendations(task, confidence);
    
    return {
      taskId: task.id,
      output,
      confidence,
      zone: getConfidenceZone(confidence),
      equipmentUsed: Array.from(this.equipment.keys()),
      processingTimeMs: Date.now() - startTime,
      provenance: this.state.origin,
      calledTeacher,
    };
  }
  
  /**
   * Analyze task to determine requirements
   */
  private analyzeTask(task: Task): TaskAnalysis {
    const requiredSlots: EquipmentSlot[] = [];
    let complexity = 0.5;
    
    // Determine required capabilities based on task type
    switch (task.type) {
      case 'decision':
        requiredSlots.push('REASONING');
        if (task.stakes && task.stakes >= 0.7) {
          requiredSlots.push('CONSENSUS');
        }
        complexity = 0.6;
        break;
      case 'analysis':
        requiredSlots.push('MEMORY', 'REASONING');
        complexity = 0.7;
        break;
      case 'generation':
        requiredSlots.push('REASONING');
        complexity = 0.5;
        break;
      case 'distillation':
        requiredSlots.push('DISTILLATION', 'MEMORY');
        complexity = 0.8;
        break;
      case 'coordination':
        requiredSlots.push('COORDINATION', 'COMMUNICATION');
        complexity = 0.6;
        break;
      case 'learning':
        requiredSlots.push('MEMORY', 'DISTILLATION');
        complexity = 0.9;
        break;
      case 'visualization':
        requiredSlots.push('SPREADSHEET');
        complexity = 0.4;
        break;
      case 'monitoring':
        requiredSlots.push('MONITORING');
        complexity = 0.3;
        break;
      case 'improvement':
        requiredSlots.push('SELF_IMPROVEMENT', 'DISTILLATION');
        complexity = 0.85;
        break;
    }
    
    // Add any explicitly required capabilities
    if (task.requiredCapabilities) {
      for (const cap of task.requiredCapabilities) {
        if (!requiredSlots.includes(cap)) {
          requiredSlots.push(cap);
        }
      }
    }
    
    // Adjust complexity based on urgency and stakes
    if (task.urgencyMs && task.urgencyMs < 1000) {
      complexity += 0.1; // Urgent tasks are more complex
    }
    if (task.stakes && task.stakes > 0.8) {
      complexity += 0.15; // High-stakes are more complex
    }
    
    return {
      requiredSlots,
      complexity: Math.min(complexity, 1),
      stakes: task.stakes ?? 0.5,
      urgency: task.urgencyMs ?? 5000,
    };
  }
  
  /**
   * Auto-equip required slots
   */
  private async autoEquip(requiredSlots: EquipmentSlot[]): Promise<void> {
    for (const slot of requiredSlots) {
      if (!this.equipment.has(slot)) {
        // Find best available equipment for this slot
        const best = this.findBestEquipmentForSlot(slot);
        if (best) {
          await this.equip(best.name);
        }
      }
    }
  }
  
  /**
   * Find best equipment for a slot
   */
  private findBestEquipmentForSlot(slot: EquipmentSlot): Equipment | null {
    let best: Equipment | null = null;
    let bestScore = -1;
    
    for (const equipment of this.availableEquipment.values()) {
      if (equipment.slot === slot) {
        const score = this.scoreEquipment(equipment);
        if (score > bestScore) {
          bestScore = score;
          best = equipment;
        }
      }
    }
    
    return best;
  }
  
  /**
   * Score equipment based on cost/benefit
   */
  private scoreEquipment(equipment: Equipment): number {
    const benefit = 
      equipment.benefit.accuracyBoost * 0.3 +
      equipment.benefit.speedMultiplier * 0.2 +
      equipment.benefit.confidenceBoost * 0.5;
    
    const cost = 
      equipment.cost.memoryBytes / 1000000 * 0.1 +
      equipment.cost.latencyMs / 1000 * 0.3 +
      equipment.cost.costPerUse * 0.6;
    
    return benefit - cost;
  }
  
  /**
   * Evaluate confidence zone
   */
  private evaluateConfidence(analysis: TaskAnalysis, task: Task): ConfidenceZone {
    // Start with base confidence
    let confidence = 0.7;
    
    // Reduce for high complexity
    confidence -= (analysis.complexity - 0.5) * 0.3;
    
    // Reduce for missing equipment
    for (const slot of analysis.requiredSlots) {
      if (!this.equipment.has(slot)) {
        confidence -= 0.15;
      }
    }
    
    // Reduce for urgency
    if (analysis.urgency < 1000) {
      confidence -= 0.1;
    }
    
    return getConfidenceZone(confidence);
  }
  
  /**
   * Call teacher for help
   */
  private async callTeacher(task: Task): Promise<unknown> {
    this.log('Calling teacher', { taskId: task.id });
    // In a real implementation, this would call the teacher endpoint
    return { response: 'Teacher guidance requested', task: task.query };
  }
  
  /**
   * Fallback processing when no equipment
   */
  private fallbackProcess(task: Task): unknown {
    return {
      type: 'fallback',
      message: `Processed task '${task.type}' with minimal capabilities`,
      query: task.query,
    };
  }
  
  // ============================================
  // Self-Optimization
  // ============================================
  
  /**
   * Optimize by unequipping unused equipment
   */
  async optimize(): Promise<void> {
    this.log('Optimizing equipment');
    
    const toUnequip: EquipmentSlot[] = [];
    
    for (const [slot, equipment] of this.equipment) {
      const usage = this.getEquipmentUsage(equipment);
      if (usage < 0.3) {
        // Equipment used less than 30% of the time
        toUnequip.push(slot);
      }
    }
    
    for (const slot of toUnequip) {
      // Before unequipping, extract triggers (muscle memory)
      await this.extractTriggers(slot);
      await this.unequipSlot(slot);
      this.log('Unequipped for optimization', { slot });
    }
  }
  
  /**
   * Get recent usage of equipment
   */
  private getEquipmentUsage(equipment: Equipment): number {
    const recentHistory = this.history.entries.slice(-20);
    let usage = 0;
    
    for (const entry of recentHistory) {
      if (entry.type === 'output' && 
          Array.isArray(entry.data.equipmentUsed) && 
          entry.data.equipmentUsed.includes(equipment.slot)) {
        usage++;
      }
    }
    
    return recentHistory.length > 0 ? usage / recentHistory.length : 0;
  }
  
  /**
   * Extract triggers before unequipping (muscle memory)
   */
  private async extractTriggers(slot: EquipmentSlot): Promise<void> {
    const equipment = this.equipment.get(slot);
    if (!equipment) return;
    
    // Create trigger thresholds for when to call the teacher
    this.triggers.monitors.push({
      metric: `equipment_${slot}`,
      currentValue: 0,
      threshold: equipment.triggerThresholds.equipWhen[0]?.value ?? 0.5,
      action: 'call_teacher',
      equipment: equipment.name,
    });
    
    this.log('Extracted triggers', { slot, equipment: equipment.name });
  }
  
  /**
   * Generate equipment recommendations
   */
  private generateRecommendations(task: Task, confidence: number): void {
    this.triggers.recommendations = [];
    
    // Recommend equipment if confidence is low
    if (confidence < this.triggers.thresholds.confidence.low) {
      for (const [name, equipment] of this.availableEquipment) {
        if (!this.equipment.has(equipment.slot) && equipment.benefit.confidenceBoost > 0.1) {
          this.triggers.recommendations.push({
            equipment: name,
            slot: equipment.slot,
            reason: `Low confidence (${confidence.toFixed(2)}) - ${equipment.name} can boost by ${(equipment.benefit.confidenceBoost * 100).toFixed(0)}%`,
            confidence: equipment.benefit.confidenceBoost,
            autoEquip: false,
          });
        }
      }
    }
  }
  
  // ============================================
  // Provenance Management
  // ============================================
  
  /**
   * Add entry to provenance chain
   */
  private addToProvenance(entry: ProvenanceEntry): void {
    // Provenance is append-only
    this.state.origin = {
      entries: [...this.state.origin.entries, entry],
      immutable: true,
    };
  }
  
  /**
   * Add entry to history
   */
  private addHistoryEntry(type: HistoryEntry['type'], data: Record<string, unknown>): void {
    this.history.entries.push({
      timestamp: Date.now(),
      type,
      data,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.5,
      source: this.id,
    });
    
    // Trim if exceeds max size
    if (this.history.entries.length > this.history.maxSize) {
      this.history.entries = this.history.entries.slice(-this.history.maxSize);
    }
  }
  
  /**
   * Update rate-based metrics
   */
  private updateRates(): void {
    const now = Date.now();
    const dt = now - this.rates.lastUpdate;
    
    // Calculate rates (simple moving average)
    const historySize = this.history.entries.length;
    this.rates.dataRate = historySize / Math.max(dt / 1000, 1);
    this.rates.transformRate = this.state.transformations.length / Math.max(dt / 1000, 1);
    this.rates.functionRate = 1; // Simplified
    this.rates.lastUpdate = now;
  }
  
  // ============================================
  // Utilities
  // ============================================
  
  private log(message: string, data?: Record<string, unknown>): void {
    if (this.debug) {
      console.log(`[OriginCore:${this.id.slice(0, 8)}] ${message}`, data ?? '');
    }
  }
  
  /**
   * Get agent state summary
   */
  getState(): AgentState {
    const recentConfidence = this.history.entries.slice(-5);
    const avgConfidence = recentConfidence.length > 0
      ? recentConfidence.reduce((sum, e) => sum + e.confidence, 0) / recentConfidence.length
      : 0.5;
    
    return {
      id: this.id,
      equipment: Array.from(this.equipment.keys()),
      confidence: avgConfidence,
      rates: this.rates,
    };
  }
  
  /**
   * Reset agent to minimal state
   */
  async reset(): Promise<void> {
    // Unequip all equipment
    for (const slot of Array.from(this.equipment.keys())) {
      await this.unequipSlot(slot);
    }
    
    // Clear history
    this.history.entries = [];
    
    // Reset state
    this.state = {
      origin: { entries: [], immutable: true },
      data: { type: 'empty', value: null },
      transformations: [],
      function: () => null,
    };
    
    this.log('Agent reset');
  }
}

// ============================================
// Helper Types
// ============================================

interface TaskAnalysis {
  requiredSlots: EquipmentSlot[];
  complexity: number;
  stakes: number;
  urgency: number;
}

export default OriginCore;
