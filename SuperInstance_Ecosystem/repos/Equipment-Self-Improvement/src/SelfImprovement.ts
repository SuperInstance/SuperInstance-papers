/**
 * SelfImprovement - Main equipment class
 * 
 * Self-modifying equipment that distills what agents need to know for stable tiling.
 * Enables continuous improvement through performance monitoring, knowledge distillation,
 * tile optimization, and self-modification capabilities.
 */

import { 
  PerformanceMonitor, 
  PerformanceMetric, 
  MetricType,
  PerformanceSnapshot,
  PerformanceAnomaly,
  ImprovementOpportunity
} from './PerformanceMonitor';

import { 
  KnowledgeDistiller, 
  KnowledgePattern, 
  PatternCategory,
  AgentObservation,
  DistillationResult,
  DistillationConfig
} from './KnowledgeDistiller';

import { 
  TileOptimizer, 
  Tile, 
  TileType,
  TileOptimizationResult,
  TileStabilityAnalysis,
  DeconstructionResult
} from './TileOptimizer';

import { 
  SelfModifier, 
  Modification, 
  ModificationType,
  ModificationTrigger,
  ModificationPolicy,
  ModificationProposal,
  ModificationResult
} from './SelfModifier';

/**
 * Configuration for SelfImprovement equipment
 */
export interface SelfImprovementConfig {
  /** Maximum number of performance metrics to retain */
  maxMetricHistory?: number;
  
  /** Configuration for knowledge distillation */
  distillationConfig?: Partial<DistillationConfig>;
  
  /** Policy for self-modification */
  modificationPolicy?: Partial<ModificationPolicy>;
  
  /** Enable automatic improvement cycles */
  autoImprove?: boolean;
  
  /** Interval between automatic improvement cycles (ms) */
  improvementIntervalMs?: number;
  
  /** Minimum observations before distillation */
  minObservationsForDistillation?: number;
  
  /** Enable automatic tile optimization */
  autoTileOptimization?: boolean;
  
  /** Threshold for triggering automatic modifications */
  autoModificationThreshold?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Status of the self-improvement equipment
 */
export interface SelfImprovementStatus {
  isRunning: boolean;
  lastImprovementCycle?: Date;
  totalImprovementCycles: number;
  metricsCollected: number;
  patternsDistilled: number;
  tilesManaged: number;
  modificationsApplied: number;
  averageStability: number;
  averageEfficiency: number;
  health: 'healthy' | 'degraded' | 'critical';
}

/**
 * Result of an improvement cycle
 */
export interface ImprovementCycleResult {
  id: string;
  timestamp: Date;
  duration: number;
  
  // Performance phase
  metricsAnalyzed: number;
  anomaliesDetected: number;
  opportunitiesIdentified: number;
  
  // Distillation phase
  patternsExtracted: number;
  patternsRefined: number;
  knowledgeGain: number;
  
  // Optimization phase
  tilesOptimized: number;
  tilesSplit: number;
  tilesMerged: number;
  stabilityImprovement: number;
  efficiencyImprovement: number;
  
  // Modification phase
  modificationsProposed: number;
  modificationsApplied: number;
  
  // Overall
  overallImprovement: number;
  recommendations: string[];
}

/**
 * Metrics tracked over time for maturity tracking
 */
export interface MaturityMetrics {
  timestamp: Date;
  patternCount: number;
  avgPatternConfidence: number;
  avgPatternStability: number;
  tileCount: number;
  avgTileStability: number;
  avgTileMaturity: number;
  modificationSuccessRate: number;
  overallMaturity: number;
}

/**
 * Options for the "mature into cells" process
 */
export interface MaturationOptions {
  /** Target complexity reduction percentage */
  targetComplexityReduction?: number;
  
  /** Minimum stability threshold for mature cells */
  minStabilityThreshold?: number;
  
  /** Maximum cell size after maturation */
  maxCellSize?: 'nano' | 'micro' | 'meso' | 'macro';
  
  /** Preserve patterns during maturation */
  preservePatterns?: boolean;
  
  /** Verbose logging */
  verbose?: boolean;
}

/**
 * Result of the maturation process
 */
export interface MaturationResult {
  id: string;
  timestamp: Date;
  
  // Before state
  beforeCellCount: number;
  beforeAvgComplexity: number;
  beforeAvgStability: number;
  
  // After state
  afterCellCount: number;
  afterAvgComplexity: number;
  afterAvgStability: number;
  
  // Changes
  cellsSplit: number;
  cellsMerged: number;
  cellsDiscarded: number;
  patternsPreserved: number;
  
  // Improvement
  complexityReduction: number;
  stabilityImprovement: number;
  maturityIncrease: number;
  
  // Details
  maturationSteps: string[];
  resultingCells: Tile[];
}

/**
 * Main SelfImprovement equipment class
 */
export class SelfImprovement {
  private performanceMonitor: PerformanceMonitor;
  private knowledgeDistiller: KnowledgeDistiller;
  private tileOptimizer: TileOptimizer;
  private selfModifier: SelfModifier;
  
  private config: Required<SelfImprovementConfig>;
  private status: SelfImprovementStatus;
  private improvementHistory: ImprovementCycleResult[] = [];
  private maturityHistory: MaturityMetrics[] = [];
  
  private improvementTimer?: ReturnType<typeof setInterval>;
  private isImproving: boolean = false;

  constructor(config?: SelfImprovementConfig) {
    this.config = {
      maxMetricHistory: 10000,
      distillationConfig: {},
      modificationPolicy: {},
      autoImprove: false,
      improvementIntervalMs: 300000, // 5 minutes
      minObservationsForDistillation: 10,
      autoTileOptimization: true,
      autoModificationThreshold: 'medium',
      ...config
    };

    // Initialize components
    this.performanceMonitor = new PerformanceMonitor(this.config.maxMetricHistory);
    
    this.knowledgeDistiller = new KnowledgeDistiller(this.config.distillationConfig);
    
    this.tileOptimizer = new TileOptimizer();
    
    this.selfModifier = new SelfModifier({
      performanceMonitor: this.performanceMonitor,
      knowledgeDistiller: this.knowledgeDistiller,
      tileOptimizer: this.tileOptimizer,
      policy: this.config.modificationPolicy
    });

    this.status = {
      isRunning: false,
      totalImprovementCycles: 0,
      metricsCollected: 0,
      patternsDistilled: 0,
      tilesManaged: 0,
      modificationsApplied: 0,
      averageStability: 0,
      averageEfficiency: 0,
      health: 'healthy'
    };
  }

  // ==================== Performance Monitoring ====================

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): PerformanceMetric {
    const result = this.performanceMonitor.recordMetric(metric);
    this.status.metricsCollected++;
    return result;
  }

  /**
   * Record multiple metrics at once
   */
  recordMetrics(metrics: Array<Omit<PerformanceMetric, 'id' | 'timestamp'>>): PerformanceMetric[] {
    const results = this.performanceMonitor.recordMetrics(metrics);
    this.status.metricsCollected += results.length;
    return results;
  }

  /**
   * Get performance snapshot
   */
  getPerformanceSnapshot(): PerformanceSnapshot {
    return this.performanceMonitor.createSnapshot();
  }

  /**
   * Detect performance anomalies
   */
  detectAnomalies(): PerformanceAnomaly[] {
    return this.performanceMonitor.detectAnomalies();
  }

  /**
   * Get improvement opportunities
   */
  getImprovementOpportunities(): ImprovementOpportunity[] {
    return this.performanceMonitor.identifyImprovementOpportunities();
  }

  // ==================== Knowledge Distillation ====================

  /**
   * Add an observation for knowledge distillation
   */
  addObservation(observation: Omit<AgentObservation, 'id' | 'timestamp'>): AgentObservation {
    return this.knowledgeDistiller.addObservation(observation);
  }

  /**
   * Add multiple observations
   */
  addObservations(observations: Array<Omit<AgentObservation, 'id' | 'timestamp'>>): AgentObservation[] {
    return this.knowledgeDistiller.addObservations(observations);
  }

  /**
   * Run knowledge distillation
   */
  distillKnowledge(): DistillationResult {
    const result = this.knowledgeDistiller.distill();
    this.status.patternsDistilled = this.knowledgeDistiller.getPatterns().length;
    return result;
  }

  /**
   * Get distilled patterns
   */
  getPatterns(): KnowledgePattern[] {
    return this.knowledgeDistiller.getPatterns();
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: PatternCategory): KnowledgePattern[] {
    return this.knowledgeDistiller.getPatternsByCategory(category);
  }

  /**
   * Get stable patterns suitable for tiling
   */
  getStablePatterns(): KnowledgePattern[] {
    return this.knowledgeDistiller.getStablePatterns();
  }

  // ==================== Tile Optimization ====================

  /**
   * Add a tile for optimization
   */
  addTile(tile: Omit<Tile, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Tile {
    const result = this.tileOptimizer.addTile(tile);
    this.status.tilesManaged = this.tileOptimizer.getTiles().length;
    return result;
  }

  /**
   * Add multiple tiles
   */
  addTiles(tiles: Array<Omit<Tile, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>>): Tile[] {
    const results = this.tileOptimizer.addTiles(tiles);
    this.status.tilesManaged = this.tileOptimizer.getTiles().length;
    return results;
  }

  /**
   * Get all tiles
   */
  getTiles(): Tile[] {
    return this.tileOptimizer.getTiles();
  }

  /**
   * Analyze tile stability
   */
  analyzeTileStability(tileId: string): TileStabilityAnalysis | null {
    return this.tileOptimizer.analyzeStability(tileId);
  }

  /**
   * Run tile optimization
   */
  optimizeTiles(): TileOptimizationResult {
    const result = this.tileOptimizer.optimize();
    
    // Update status
    const tiles = this.tileOptimizer.getTiles();
    this.status.tilesManaged = tiles.length;
    this.status.averageStability = tiles.length > 0
      ? tiles.reduce((s, t) => s + t.stability, 0) / tiles.length
      : 0;
    this.status.averageEfficiency = tiles.length > 0
      ? tiles.reduce((s, t) => s + t.efficiency, 0) / tiles.length
      : 0;
    
    return result;
  }

  /**
   * Deconstruct a tile into smaller cells
   */
  deconstructTile(tileId: string): DeconstructionResult | null {
    return this.tileOptimizer.deconstruct(tileId);
  }

  // ==================== Self Modification ====================

  /**
   * Propose a modification
   */
  proposeModification(
    type: ModificationType,
    target: string,
    newValue: unknown,
    reason: string,
    trigger: ModificationTrigger
  ): ModificationProposal {
    return this.selfModifier.proposeModification(type, target, newValue, reason, trigger);
  }

  /**
   * Apply a proposed modification
   */
  applyModification(proposalId: string): ModificationResult {
    const result = this.selfModifier.applyModification(proposalId);
    if (result.success && result.modification) {
      this.status.modificationsApplied++;
    }
    return result;
  }

  /**
   * Get pending modifications
   */
  getPendingModifications(): ModificationProposal[] {
    return this.selfModifier.getPendingModifications();
  }

  /**
   * Get modification history
   */
  getModificationHistory(): Modification[] {
    return this.selfModifier.getModifications();
  }

  /**
   * Auto-propose modifications based on current state
   */
  autoProposeModifications(): ModificationProposal[] {
    return this.selfModifier.autoProposeModifications();
  }

  // ==================== Improvement Cycles ====================

  /**
   * Start automatic improvement cycles
   */
  startAutoImprovement(): void {
    if (this.improvementTimer) {
      clearInterval(this.improvementTimer);
    }

    this.status.isRunning = true;
    
    this.improvementTimer = setInterval(() => {
      this.runImprovementCycle().catch(error => {
        console.error('Improvement cycle error:', error);
      });
    }, this.config.improvementIntervalMs);
  }

  /**
   * Stop automatic improvement cycles
   */
  stopAutoImprovement(): void {
    if (this.improvementTimer) {
      clearInterval(this.improvementTimer);
      this.improvementTimer = undefined;
    }
    this.status.isRunning = false;
  }

  /**
   * Run a complete improvement cycle
   */
  async runImprovementCycle(): Promise<ImprovementCycleResult> {
    if (this.isImproving) {
      throw new Error('Improvement cycle already in progress');
    }

    this.isImproving = true;
    const startTime = Date.now();
    const recommendations: string[] = [];

    try {
      // Phase 1: Performance Analysis
      const snapshot = this.performanceMonitor.createSnapshot();
      const metricsAnalyzed = Array.from(snapshot.metrics.values())
        .reduce((sum, m) => sum + m.count, 0);
      const anomaliesDetected = snapshot.anomalies.length;
      const opportunities = this.performanceMonitor.identifyImprovementOpportunities();
      const opportunitiesIdentified = opportunities.length;

      // Phase 2: Knowledge Distillation
      let patternsExtracted = 0;
      let patternsRefined = 0;
      let knowledgeGain = 0;

      if (this.knowledgeDistiller.getDistillationHistory().length === 0 || 
          this.status.metricsCollected >= this.config.minObservationsForDistillation) {
        const distillationResult = this.knowledgeDistiller.distill();
        patternsExtracted = distillationResult.patternsExtracted;
        patternsRefined = distillationResult.patternsRefined;
        knowledgeGain = distillationResult.knowledgeGain;
        recommendations.push(...distillationResult.recommendations);
      }

      // Phase 3: Tile Optimization
      let tilesOptimized = 0;
      let tilesSplit = 0;
      let tilesMerged = 0;
      let stabilityImprovement = 0;
      let efficiencyImprovement = 0;

      if (this.config.autoTileOptimization) {
        const tilesBefore = this.tileOptimizer.getTiles();
        const avgStabilityBefore = tilesBefore.length > 0
          ? tilesBefore.reduce((s, t) => s + t.stability, 0) / tilesBefore.length
          : 0;
        const avgEfficiencyBefore = tilesBefore.length > 0
          ? tilesBefore.reduce((s, t) => s + t.efficiency, 0) / tilesBefore.length
          : 0;

        const optimizationResult = this.tileOptimizer.optimize();
        tilesOptimized = optimizationResult.tilesOptimized;
        tilesSplit = optimizationResult.tilesSplit;
        tilesMerged = optimizationResult.tilesMerged;
        stabilityImprovement = optimizationResult.averageStabilityAfter - optimizationResult.averageStabilityBefore;
        efficiencyImprovement = optimizationResult.averageEfficiencyAfter - optimizationResult.averageEfficiencyBefore;
        recommendations.push(...optimizationResult.recommendations);
      }

      // Phase 4: Self Modification
      let modificationsProposed = 0;
      let modificationsApplied = 0;

      const autoProposals = this.selfModifier.autoProposeModifications();
      modificationsProposed = autoProposals.length;

      // Apply high-confidence, low-risk proposals automatically
      for (const proposal of autoProposals) {
        if (proposal.confidence > 0.8 && proposal.risk === 'low') {
          const result = this.selfModifier.applyModification(proposal.id);
          if (result.success) {
            modificationsApplied++;
          }
        }
      }

      // Calculate overall improvement
      const overallImprovement = this.calculateOverallImprovement(
        stabilityImprovement,
        efficiencyImprovement,
        knowledgeGain,
        modificationsApplied
      );

      // Update status
      this.status.totalImprovementCycles++;
      this.status.lastImprovementCycle = new Date();
      
      const tiles = this.tileOptimizer.getTiles();
      this.status.averageStability = tiles.length > 0
        ? tiles.reduce((s, t) => s + t.stability, 0) / tiles.length
        : 0;
      this.status.averageEfficiency = tiles.length > 0
        ? tiles.reduce((s, t) => s + t.efficiency, 0) / tiles.length
        : 0;
      
      // Determine health
      this.updateHealth();

      // Record maturity metrics
      this.recordMaturityMetrics();

      const result: ImprovementCycleResult = {
        id: `cycle_${Date.now()}`,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        metricsAnalyzed,
        anomaliesDetected,
        opportunitiesIdentified,
        patternsExtracted,
        patternsRefined,
        knowledgeGain,
        tilesOptimized,
        tilesSplit,
        tilesMerged,
        stabilityImprovement,
        efficiencyImprovement,
        modificationsProposed,
        modificationsApplied,
        overallImprovement,
        recommendations: [...new Set(recommendations)] // Deduplicate
      };

      this.improvementHistory.push(result);
      return result;

    } finally {
      this.isImproving = false;
    }
  }

  /**
   * Calculate overall improvement score
   */
  private calculateOverallImprovement(
    stabilityImprovement: number,
    efficiencyImprovement: number,
    knowledgeGain: number,
    modificationsApplied: number
  ): number {
    const weights = {
      stability: 0.35,
      efficiency: 0.25,
      knowledge: 0.25,
      modifications: 0.15
    };

    const normalizedStability = Math.min(Math.max(stabilityImprovement, 0), 1);
    const normalizedEfficiency = Math.min(Math.max(efficiencyImprovement, 0), 1);
    const normalizedKnowledge = Math.min(knowledgeGain, 1);
    const normalizedModifications = Math.min(modificationsApplied / 5, 1);

    return (
      normalizedStability * weights.stability +
      normalizedEfficiency * weights.efficiency +
      normalizedKnowledge * weights.knowledge +
      normalizedModifications * weights.modifications
    );
  }

  /**
   * Update health status
   */
  private updateHealth(): void {
    const anomalies = this.performanceMonitor.detectAnomalies();
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length;
    const highAnomalies = anomalies.filter(a => a.severity === 'high').length;

    if (criticalAnomalies > 0 || this.status.averageStability < 0.3) {
      this.status.health = 'critical';
    } else if (highAnomalies > 2 || this.status.averageStability < 0.5) {
      this.status.health = 'degraded';
    } else {
      this.status.health = 'healthy';
    }
  }

  // ==================== Maturation (Mature into Cells) ====================

  /**
   * Mature the system into streamlined cells
   * 
   * This process transforms complex tiles into smaller, more manageable cells
   * that are optimized for stable tiling.
   */
  async matureIntoCells(options?: MaturationOptions): Promise<MaturationResult> {
    const opts: Required<MaturationOptions> = {
      targetComplexityReduction: 0.3,
      minStabilityThreshold: 0.7,
      maxCellSize: 'micro',
      preservePatterns: true,
      verbose: false,
      ...options
    };

    const startTime = Date.now();
    const maturationSteps: string[] = [];
    const resultingCells: Tile[] = [];

    // Capture before state
    const tilesBefore = this.tileOptimizer.getTiles();
    const beforeCellCount = tilesBefore.length;
    const beforeAvgComplexity = tilesBefore.length > 0
      ? tilesBefore.reduce((s, t) => s + t.complexity, 0) / tilesBefore.length
      : 0;
    const beforeAvgStability = tilesBefore.length > 0
      ? tilesBefore.reduce((s, t) => s + t.stability, 0) / tilesBefore.length
      : 0;

    maturationSteps.push(`Starting maturation with ${beforeCellCount} cells`);
    maturationSteps.push(`Target complexity reduction: ${opts.targetComplexityReduction * 100}%`);

    // Step 1: Identify high-complexity tiles for deconstruction
    const sizeOrder: Tile['size'][] = ['nano', 'micro', 'meso', 'macro'];
    const maxSizeIndex = sizeOrder.indexOf(opts.maxCellSize);
    
    const tilesToDeconstruct = tilesBefore.filter(t => 
      t.complexity > (1 - opts.targetComplexityReduction) &&
      sizeOrder.indexOf(t.size) > maxSizeIndex
    );

    let cellsSplit = 0;
    for (const tile of tilesToDeconstruct) {
      const result = this.tileOptimizer.deconstruct(tile.id);
      if (result) {
        cellsSplit++;
        maturationSteps.push(`Deconstructed tile ${tile.name} into ${result.resultingTiles.length} cells`);
        resultingCells.push(...result.resultingTiles);
      }
    }

    // Step 2: Optimize remaining tiles
    const optimizationResult = this.tileOptimizer.optimize();
    maturationSteps.push(`Optimized ${optimizationResult.tilesOptimized} tiles`);

    // Step 3: Merge similar cells
    let cellsMerged = 0;
    if (opts.preservePatterns) {
      const patterns = this.knowledgeDistiller.getStablePatterns();
      
      // Group tiles by pattern overlap
      for (const pattern of patterns) {
        const relatedTiles = this.tileOptimizer.getTiles().filter(t =>
          t.knowledge.patterns.includes(pattern.id)
        );

        if (relatedTiles.length > 1) {
          // These tiles share a pattern, consider merging
          maturationSteps.push(`Found ${relatedTiles.length} tiles sharing pattern ${pattern.name}`);
        }
      }
    }
    cellsMerged = optimizationResult.tilesMerged;

    // Step 4: Remove unstable cells below threshold
    let cellsDiscarded = 0;
    const currentTiles = this.tileOptimizer.getTiles();
    const unstableTiles = currentTiles.filter(t => t.stability < opts.minStabilityThreshold);
    
    for (const tile of unstableTiles) {
      if (!opts.preservePatterns || tile.knowledge.patterns.length === 0) {
        // Safe to discard
        cellsDiscarded++;
        maturationSteps.push(`Discarded unstable cell ${tile.name}`);
      }
    }

    // Run final optimization
    this.tileOptimizer.optimize();

    // Capture after state
    const tilesAfter = this.tileOptimizer.getTiles();
    const afterCellCount = tilesAfter.length;
    const afterAvgComplexity = tilesAfter.length > 0
      ? tilesAfter.reduce((s, t) => s + t.complexity, 0) / tilesAfter.length
      : 0;
    const afterAvgStability = tilesAfter.length > 0
      ? tilesAfter.reduce((s, t) => s + t.stability, 0) / tilesAfter.length
      : 0;

    // Calculate improvements
    const complexityReduction = beforeAvgComplexity - afterAvgComplexity;
    const stabilityImprovement = afterAvgStability - beforeAvgStability;
    const maturityIncrease = tilesAfter.reduce((s, t) => s + t.metadata.maturityLevel, 0) / 
      Math.max(tilesAfter.length, 1) -
      tilesBefore.reduce((s, t) => s + t.metadata.maturityLevel, 0) / 
      Math.max(tilesBefore.length, 1);

    // Count preserved patterns
    const patternsPreserved = opts.preservePatterns
      ? this.knowledgeDistiller.getStablePatterns().length
      : 0;

    maturationSteps.push(`Maturation complete: ${beforeCellCount} -> ${afterCellCount} cells`);
    maturationSteps.push(`Complexity: ${(beforeAvgComplexity * 100).toFixed(1)}% -> ${(afterAvgComplexity * 100).toFixed(1)}%`);
    maturationSteps.push(`Stability: ${(beforeAvgStability * 100).toFixed(1)}% -> ${(afterAvgStability * 100).toFixed(1)}%`);

    return {
      id: `maturation_${Date.now()}`,
      timestamp: new Date(),
      beforeCellCount,
      beforeAvgComplexity,
      beforeAvgStability,
      afterCellCount,
      afterAvgComplexity,
      afterAvgStability,
      cellsSplit,
      cellsMerged,
      cellsDiscarded,
      patternsPreserved,
      complexityReduction,
      stabilityImprovement,
      maturityIncrease,
      maturationSteps,
      resultingCells: tilesAfter
    };
  }

  /**
   * Deconstruct complex logic into manageable cells
   */
  deconstructComplexLogic(complexityThreshold: number = 0.7): DeconstructionResult[] {
    const results: DeconstructionResult[] = [];
    const complexTiles = this.tileOptimizer.getTiles()
      .filter(t => t.complexity >= complexityThreshold);

    for (const tile of complexTiles) {
      const result = this.tileOptimizer.deconstruct(tile.id);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  // ==================== Tracking & Reporting ====================

  /**
   * Record maturity metrics
   */
  private recordMaturityMetrics(): void {
    const patterns = this.knowledgeDistiller.getPatterns();
    const tiles = this.tileOptimizer.getTiles();
    const modifications = this.selfModifier.getModifications();

    const successfulMods = modifications.filter(m => m.status === 'validated').length;
    const totalMods = modifications.length;

    const metrics: MaturityMetrics = {
      timestamp: new Date(),
      patternCount: patterns.length,
      avgPatternConfidence: patterns.length > 0
        ? patterns.reduce((s, p) => s + p.confidence, 0) / patterns.length
        : 0,
      avgPatternStability: patterns.length > 0
        ? patterns.reduce((s, p) => s + p.stability, 0) / patterns.length
        : 0,
      tileCount: tiles.length,
      avgTileStability: tiles.length > 0
        ? tiles.reduce((s, t) => s + t.stability, 0) / tiles.length
        : 0,
      avgTileMaturity: tiles.length > 0
        ? tiles.reduce((s, t) => s + t.metadata.maturityLevel, 0) / tiles.length
        : 0,
      modificationSuccessRate: totalMods > 0 ? successfulMods / totalMods : 0,
      overallMaturity: this.calculateOverallMaturity(patterns, tiles, modifications)
    };

    this.maturityHistory.push(metrics);
  }

  /**
   * Calculate overall maturity score
   */
  private calculateOverallMaturity(
    patterns: KnowledgePattern[],
    tiles: Tile[],
    modifications: Modification[]
  ): number {
    const weights = {
      patterns: 0.3,
      tiles: 0.4,
      modifications: 0.3
    };

    // Pattern maturity
    const patternMaturity = patterns.length > 0
      ? patterns.reduce((s, p) => s + (p.confidence * p.stability * p.maturity), 0) / patterns.length
      : 0;

    // Tile maturity
    const tileMaturity = tiles.length > 0
      ? tiles.reduce((s, t) => s + (t.stability * t.metadata.maturityLevel), 0) / tiles.length
      : 0;

    // Modification success rate
    const successfulMods = modifications.filter(m => m.status === 'validated').length;
    const modSuccessRate = modifications.length > 0
      ? successfulMods / modifications.length
      : 0.5; // Default to neutral

    return (
      patternMaturity * weights.patterns +
      tileMaturity * weights.tiles +
      modSuccessRate * weights.modifications
    );
  }

  /**
   * Get current status
   */
  getStatus(): SelfImprovementStatus {
    return { ...this.status };
  }

  /**
   * Get improvement history
   */
  getImprovementHistory(): ImprovementCycleResult[] {
    return [...this.improvementHistory];
  }

  /**
   * Get maturity history
   */
  getMaturityHistory(): MaturityMetrics[] {
    return [...this.maturityHistory];
  }

  /**
   * Get current maturity level
   */
  getCurrentMaturity(): number {
    const history = this.maturityHistory;
    return history.length > 0 ? history[history.length - 1].overallMaturity : 0;
  }

  /**
   * Export complete state for persistence
   */
  exportState(): {
    performanceMetrics: PerformanceMetric[];
    patterns: KnowledgePattern[];
    tiles: Tile[];
    modifications: Modification[];
    maturityHistory: MaturityMetrics[];
    improvementHistory: ImprovementCycleResult[];
    status: SelfImprovementStatus;
  } {
    return {
      performanceMetrics: this.performanceMonitor.exportMetrics(),
      patterns: this.knowledgeDistiller.getPatterns(),
      tiles: this.tileOptimizer.exportTiles(),
      modifications: this.selfModifier.getModifications(),
      maturityHistory: this.maturityHistory,
      improvementHistory: this.improvementHistory,
      status: this.status
    };
  }

  /**
   * Import state from persistence
   */
  importState(state: {
    tiles?: Tile[];
    maturityHistory?: MaturityMetrics[];
    improvementHistory?: ImprovementCycleResult[];
    status?: Partial<SelfImprovementStatus>;
  }): void {
    if (state.tiles) {
      this.tileOptimizer.importTiles(state.tiles);
    }
    
    if (state.maturityHistory) {
      this.maturityHistory = state.maturityHistory;
    }
    
    if (state.improvementHistory) {
      this.improvementHistory = state.improvementHistory;
    }
    
    if (state.status) {
      this.status = { ...this.status, ...state.status };
    }
  }

  // ==================== Component Access ====================

  /**
   * Get performance monitor instance
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor;
  }

  /**
   * Get knowledge distiller instance
   */
  getKnowledgeDistiller(): KnowledgeDistiller {
    return this.knowledgeDistiller;
  }

  /**
   * Get tile optimizer instance
   */
  getTileOptimizer(): TileOptimizer {
    return this.tileOptimizer;
  }

  /**
   * Get self modifier instance
   */
  getSelfModifier(): SelfModifier {
    return this.selfModifier;
  }
}
