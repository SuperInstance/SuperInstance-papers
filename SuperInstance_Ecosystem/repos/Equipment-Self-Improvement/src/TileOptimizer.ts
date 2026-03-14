/**
 * TileOptimizer - Optimizes tile structures for stability
 * 
 * Analyzes and refines tile configurations to ensure stable tiling
 * and efficient knowledge encoding for agent operations.
 */

export interface Tile {
  id: string;
  name: string;
  type: TileType;
  size: 'nano' | 'micro' | 'meso' | 'macro';
  complexity: number; // 0-1
  stability: number; // 0-1
  efficiency: number; // 0-1
  dependencies: string[]; // IDs of dependent tiles
  knowledge: TileKnowledge;
  metadata: TileMetadata;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  lastUsed?: Date;
}

export type TileType = 
  | 'knowledge'
  | 'skill'
  | 'behavior'
  | 'decision'
  | 'coordination'
  | 'validation'
  | 'transformation'
  | 'recovery';

export interface TileKnowledge {
  patterns: string[]; // Pattern IDs from KnowledgeDistiller
  rules: TileRule[];
  examples: TileExample[];
  constraints: TileConstraint[];
}

export interface TileRule {
  id: string;
  condition: string;
  action: string;
  priority: number;
  confidence: number;
}

export interface TileExample {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  success: boolean;
  context?: Record<string, unknown>;
}

export interface TileConstraint {
  type: 'hard' | 'soft';
  field: string;
  operator: 'equals' | 'in_range' | 'matches' | 'custom';
  value: unknown;
  penalty: number; // For soft constraints
}

export interface TileMetadata {
  version: string;
  author: string;
  tags: string[];
  description: string;
  cellAffinity?: string; // Preferred cell type
  maturityLevel: number; // 0-1, tracks how refined the tile is
  deconstructionLevel: number; // 0-1, tracks decomposition progress
}

export interface TileOptimizationResult {
  id: string;
  timestamp: Date;
  tilesProcessed: number;
  tilesOptimized: number;
  tilesSplit: number;
  tilesMerged: number;
  tilesDiscarded: number;
  averageStabilityBefore: number;
  averageStabilityAfter: number;
  averageEfficiencyBefore: number;
  averageEfficiencyAfter: number;
  recommendations: string[];
}

export interface TileStabilityAnalysis {
  tileId: string;
  stabilityScore: number;
  factors: StabilityFactor[];
  issues: StabilityIssue[];
  recommendations: string[];
}

export interface StabilityFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

export interface StabilityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  suggestedFix: string;
}

export interface DeconstructionResult {
  id: string;
  sourceTileId: string;
  resultingTiles: Tile[];
  complexityReduction: number;
  stabilityImprovement: number;
  notes: string[];
}

export interface TileCluster {
  id: string;
  tileIds: string[];
  coherenceScore: number;
  suggestedMerge: boolean;
  mergeRationale?: string;
}

export class TileOptimizer {
  private tiles: Map<string, Tile> = new Map();
  private optimizationHistory: TileOptimizationResult[] = [];
  private deconstructionQueue: string[] = [];

  constructor() {
    this.initializeOptimizationRules();
  }

  /**
   * Initialize default optimization rules
   */
  private initializeOptimizationRules(): void {
    // Default rules loaded from configuration
  }

  /**
   * Add a tile to the optimizer
   */
  addTile(tile: Omit<Tile, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Tile {
    const fullTile: Tile = {
      ...tile,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    };

    this.tiles.set(fullTile.id, fullTile);
    return fullTile;
  }

  /**
   * Add multiple tiles
   */
  addTiles(tiles: Array<Omit<Tile, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>>): Tile[] {
    return tiles.map(t => this.addTile(t));
  }

  /**
   * Get tile by ID
   */
  getTile(id: string): Tile | undefined {
    return this.tiles.get(id);
  }

  /**
   * Get all tiles
   */
  getTiles(): Tile[] {
    return Array.from(this.tiles.values());
  }

  /**
   * Get tiles by type
   */
  getTilesByType(type: TileType): Tile[] {
    return Array.from(this.tiles.values()).filter(t => t.type === type);
  }

  /**
   * Get tiles by size
   */
  getTilesBySize(size: Tile['size']): Tile[] {
    return Array.from(this.tiles.values()).filter(t => t.size === size);
  }

  /**
   * Analyze stability of a specific tile
   */
  analyzeStability(tileId: string): TileStabilityAnalysis | null {
    const tile = this.tiles.get(tileId);
    if (!tile) return null;

    const factors = this.calculateStabilityFactors(tile);
    const issues = this.identifyStabilityIssues(tile, factors);
    const stabilityScore = this.calculateOverallStability(factors);
    const recommendations = this.generateStabilityRecommendations(tile, issues);

    return {
      tileId,
      stabilityScore,
      factors,
      issues,
      recommendations
    };
  }

  /**
   * Calculate stability factors for a tile
   */
  private calculateStabilityFactors(tile: Tile): StabilityFactor[] {
    const factors: StabilityFactor[] = [];

    // Knowledge stability factor
    const knowledgeScore = this.calculateKnowledgeStability(tile);
    factors.push({
      name: 'knowledge_stability',
      score: knowledgeScore,
      weight: 0.25,
      description: 'Consistency and reliability of encoded knowledge'
    });

    // Dependency stability factor
    const dependencyScore = this.calculateDependencyStability(tile);
    factors.push({
      name: 'dependency_stability',
      score: dependencyScore,
      weight: 0.2,
      description: 'Reliability of dependent tiles'
    });

    // Complexity factor
    const complexityScore = 1 - tile.complexity;
    factors.push({
      name: 'simplicity',
      score: complexityScore,
      weight: 0.15,
      description: 'Simplicity of tile structure (inverse of complexity)'
    });

    // Usage stability factor
    const usageScore = this.calculateUsageStability(tile);
    factors.push({
      name: 'usage_stability',
      score: usageScore,
      weight: 0.15,
      description: 'Consistency of tile usage patterns'
    });

    // Efficiency factor
    factors.push({
      name: 'efficiency',
      score: tile.efficiency,
      weight: 0.15,
      description: 'Resource efficiency of tile operations'
    });

    // Maturity factor
    factors.push({
      name: 'maturity',
      score: tile.metadata.maturityLevel,
      weight: 0.1,
      description: 'Level of refinement and testing'
    });

    return factors;
  }

  /**
   * Calculate knowledge stability
   */
  private calculateKnowledgeStability(tile: Tile): number {
    const knowledge = tile.knowledge;
    let score = 0;

    // Rule consistency
    if (knowledge.rules.length > 0) {
      const avgConfidence = knowledge.rules.reduce((s, r) => s + r.confidence, 0) / knowledge.rules.length;
      score += avgConfidence * 0.3;
    }

    // Example quality
    if (knowledge.examples.length > 0) {
      const successRate = knowledge.examples.filter(e => e.success).length / knowledge.examples.length;
      score += successRate * 0.3;
    }

    // Pattern reliability
    score += Math.min(knowledge.patterns.length / 10, 1) * 0.2;

    // Constraint coverage
    score += Math.min(knowledge.constraints.length / 5, 1) * 0.2;

    return Math.min(score, 1);
  }

  /**
   * Calculate dependency stability
   */
  private calculateDependencyStability(tile: Tile): number {
    if (tile.dependencies.length === 0) return 1;

    let totalStability = 0;
    let validDeps = 0;

    for (const depId of tile.dependencies) {
      const depTile = this.tiles.get(depId);
      if (depTile) {
        totalStability += depTile.stability;
        validDeps++;
      }
    }

    return validDeps > 0 ? totalStability / validDeps : 0.5;
  }

  /**
   * Calculate usage stability
   */
  private calculateUsageStability(tile: Tile): number {
    if (tile.usageCount < 5) return 0.5; // Not enough data

    // More usage = more stability (up to a point)
    const usageScore = Math.min(tile.usageCount / 100, 1);
    
    // Recent usage is good
    let recencyScore = 0.5;
    if (tile.lastUsed) {
      const hoursSinceUse = (Date.now() - tile.lastUsed.getTime()) / (1000 * 60 * 60);
      recencyScore = Math.max(0, 1 - hoursSinceUse / 168); // Decay over a week
    }

    return usageScore * 0.6 + recencyScore * 0.4;
  }

  /**
   * Identify stability issues
   */
  private identifyStabilityIssues(
    tile: Tile,
    factors: StabilityFactor[]
  ): StabilityIssue[] {
    const issues: StabilityIssue[] = [];

    // Check for low factor scores
    for (const factor of factors) {
      if (factor.score < 0.5) {
        issues.push({
          severity: factor.score < 0.3 ? 'critical' : factor.score < 0.4 ? 'high' : 'medium',
          description: `Low ${factor.name} score: ${factor.score.toFixed(2)}`,
          impact: `Reduces overall tile stability by ${(factor.weight * (1 - factor.score) * 100).toFixed(0)}%`,
          suggestedFix: this.getSuggestedFix(factor.name, factor.score)
        });
      }
    }

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(tile.id);
    if (circularDeps.length > 0) {
      issues.push({
        severity: 'critical',
        description: 'Circular dependency detected',
        impact: 'Can cause infinite loops or unstable behavior',
        suggestedFix: `Break cycle by removing dependency: ${circularDeps[0]}`
      });
    }

    // Check for missing dependencies
    for (const depId of tile.dependencies) {
      if (!this.tiles.has(depId)) {
        issues.push({
          severity: 'high',
          description: `Missing dependency: ${depId}`,
          impact: 'Tile may fail when dependency is required',
          suggestedFix: 'Add missing tile or remove dependency'
        });
      }
    }

    // Check for high complexity without deconstruction
    if (tile.complexity > 0.7 && tile.metadata.deconstructionLevel < 0.3) {
      issues.push({
        severity: 'medium',
        description: 'High complexity with low deconstruction',
        impact: 'Tile may be difficult to maintain and debug',
        suggestedFix: 'Consider deconstructing into smaller cells'
      });
    }

    return issues;
  }

  /**
   * Get suggested fix for a factor
   */
  private getSuggestedFix(factorName: string, _score: number): string {
    const fixes: Record<string, string> = {
      knowledge_stability: 'Add more training examples and validate rules',
      dependency_stability: 'Review and stabilize dependent tiles',
      simplicity: 'Deconstruct complex logic into simpler cells',
      usage_stability: 'Increase tile usage or remove if unused',
      efficiency: 'Optimize tile operations and reduce overhead',
      maturity: 'Continue refinement and testing cycles'
    };

    return fixes[factorName] || 'Review and improve factor';
  }

  /**
   * Calculate overall stability from factors
   */
  private calculateOverallStability(factors: StabilityFactor[]): number {
    const weightedSum = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    return weightedSum / totalWeight;
  }

  /**
   * Generate stability recommendations
   */
  private generateStabilityRecommendations(
    tile: Tile,
    issues: StabilityIssue[]
  ): string[] {
    const recommendations: string[] = [];

    // Prioritize critical issues
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');

    if (criticalIssues.length > 0) {
      recommendations.push(`CRITICAL: Address ${criticalIssues.length} critical issues immediately`);
    }

    for (const issue of [...criticalIssues, ...highIssues]) {
      recommendations.push(`- ${issue.suggestedFix}`);
    }

    // Size-based recommendations
    if (tile.size === 'macro' && tile.complexity > 0.6) {
      recommendations.push('Consider splitting macro tile into smaller meso tiles');
    }

    // Maturity recommendations
    if (tile.metadata.maturityLevel < 0.5) {
      recommendations.push('Tile needs more refinement cycles to mature');
    }

    return recommendations;
  }

  /**
   * Detect circular dependencies starting from a tile
   */
  private detectCircularDependencies(startId: string): string[] {
    const visited = new Set<string>();
    const path = new Set<string>();
    const cycles: string[] = [];

    const dfs = (currentId: string): void => {
      if (path.has(currentId)) {
        cycles.push(currentId);
        return;
      }

      if (visited.has(currentId)) return;

      visited.add(currentId);
      path.add(currentId);

      const tile = this.tiles.get(currentId);
      if (tile) {
        for (const depId of tile.dependencies) {
          dfs(depId);
        }
      }

      path.delete(currentId);
    };

    dfs(startId);
    return cycles;
  }

  /**
   * Run optimization on all tiles
   */
  optimize(): TileOptimizationResult {
    const startTime = Date.now();
    const tilesProcessed = this.tiles.size;
    let tilesOptimized = 0;
    let tilesSplit = 0;
    let tilesMerged = 0;
    let tilesDiscarded = 0;

    const stabilityBefore = this.calculateAverageStability();
    const efficiencyBefore = this.calculateAverageEfficiency();

    // Step 1: Analyze and fix critical issues
    for (const tile of this.tiles.values()) {
      const analysis = this.analyzeStability(tile.id);
      if (analysis && analysis.issues.some(i => i.severity === 'critical')) {
        if (this.fixCriticalIssues(tile)) {
          tilesOptimized++;
        }
      }
    }

    // Step 2: Deconstruct high-complexity tiles
    const highComplexityTiles = Array.from(this.tiles.values())
      .filter(t => t.complexity > 0.7);

    for (const tile of highComplexityTiles) {
      const result = this.deconstruct(tile.id);
      if (result && result.resultingTiles.length > 1) {
        tilesSplit++;
        tilesOptimized++;
      }
    }

    // Step 3: Merge similar tiles
    const clusters = this.identifyMergeClusters();
    for (const cluster of clusters.filter(c => c.suggestedMerge)) {
      if (this.mergeTiles(cluster.tileIds)) {
        tilesMerged++;
        tilesOptimized++;
      }
    }

    // Step 4: Discard unused/unstable tiles
    const toDiscard = this.identifyTilesToDiscard();
    for (const tileId of toDiscard) {
      this.tiles.delete(tileId);
      tilesDiscarded++;
    }

    // Step 5: Update stability scores
    for (const tile of this.tiles.values()) {
      const analysis = this.analyzeStability(tile.id);
      if (analysis) {
        tile.stability = analysis.stabilityScore;
        tile.updatedAt = new Date();
      }
    }

    const stabilityAfter = this.calculateAverageStability();
    const efficiencyAfter = this.calculateAverageEfficiency();

    const result: TileOptimizationResult = {
      id: this.generateId(),
      timestamp: new Date(),
      tilesProcessed,
      tilesOptimized,
      tilesSplit,
      tilesMerged,
      tilesDiscarded,
      averageStabilityBefore: stabilityBefore,
      averageStabilityAfter: stabilityAfter,
      averageEfficiencyBefore: efficiencyBefore,
      averageEfficiencyAfter: efficiencyAfter,
      recommendations: this.generateOptimizationRecommendations()
    };

    this.optimizationHistory.push(result);
    return result;
  }

  /**
   * Fix critical issues in a tile
   */
  private fixCriticalIssues(tile: Tile): boolean {
    let fixed = false;
    const analysis = this.analyzeStability(tile.id);
    if (!analysis) return false;

    for (const issue of analysis.issues.filter(i => i.severity === 'critical')) {
      // Handle circular dependencies
      if (issue.description.includes('Circular')) {
        const cycleStart = this.detectCircularDependencies(tile.id)[0];
        if (cycleStart) {
          tile.dependencies = tile.dependencies.filter(d => d !== cycleStart);
          fixed = true;
        }
      }

      // Handle missing dependencies
      if (issue.description.includes('Missing dependency')) {
        const match = issue.description.match(/Missing dependency: (\S+)/);
        if (match) {
          tile.dependencies = tile.dependencies.filter(d => d !== match[1]);
          fixed = true;
        }
      }
    }

    if (fixed) {
      tile.updatedAt = new Date();
    }

    return fixed;
  }

  /**
   * Deconstruct a tile into smaller cells
   */
  deconstruct(tileId: string): DeconstructionResult | null {
    const tile = this.tiles.get(tileId);
    if (!tile) return null;

    // Don't deconstruct already small tiles
    if (tile.size === 'nano') return null;

    const newSize = this.getSmallerSize(tile.size);
    const resultingTiles: Tile[] = [];
    const notes: string[] = [];

    // Deconstruct rules into separate tiles
    if (tile.knowledge.rules.length > 3) {
      const ruleGroups = this.groupRulesByAffinity(tile.knowledge.rules);
      
      for (const group of ruleGroups) {
        const newTile = this.createDeconstructedTile(
          tile,
          newSize,
          { rules: group, patterns: [], examples: [], constraints: [] },
          'rules'
        );
        resultingTiles.push(newTile);
      }
      notes.push(`Split ${tile.knowledge.rules.length} rules into ${ruleGroups.length} tiles`);
    }

    // Deconstruct examples into separate tiles
    if (tile.knowledge.examples.length > 10) {
      const exampleGroups = this.groupExamplesBySimilarity(tile.knowledge.examples);
      
      for (const group of exampleGroups) {
        const newTile = this.createDeconstructedTile(
          tile,
          newSize,
          { rules: [], patterns: [], examples: group, constraints: [] },
          'examples'
        );
        resultingTiles.push(newTile);
      }
      notes.push(`Split ${tile.knowledge.examples.length} examples into ${exampleGroups.length} tiles`);
    }

    // If no deconstruction happened, try general split
    if (resultingTiles.length === 0) {
      // Create two child tiles
      const half = Math.floor(tile.knowledge.rules.length / 2);
      
      resultingTiles.push(
        this.createDeconstructedTile(
          tile,
          newSize,
          {
            rules: tile.knowledge.rules.slice(0, half),
            patterns: tile.knowledge.patterns.slice(0, Math.floor(tile.knowledge.patterns.length / 2)),
            examples: tile.knowledge.examples.slice(0, Math.floor(tile.knowledge.examples.length / 2)),
            constraints: tile.knowledge.constraints.slice(0, Math.floor(tile.knowledge.constraints.length / 2))
          },
          'split_a'
        ),
        this.createDeconstructedTile(
          tile,
          newSize,
          {
            rules: tile.knowledge.rules.slice(half),
            patterns: tile.knowledge.patterns.slice(Math.floor(tile.knowledge.patterns.length / 2)),
            examples: tile.knowledge.examples.slice(Math.floor(tile.knowledge.examples.length / 2)),
            constraints: tile.knowledge.constraints.slice(Math.floor(tile.knowledge.constraints.length / 2))
          },
          'split_b'
        )
      );
      notes.push('Performed general split due to lack of natural boundaries');
    }

    // Add new tiles
    for (const newTile of resultingTiles) {
      this.tiles.set(newTile.id, newTile);
    }

    // Update original tile to reference children
    tile.dependencies = resultingTiles.map(t => t.id);
    tile.metadata.deconstructionLevel = Math.min(1, tile.metadata.deconstructionLevel + 0.3);
    tile.updatedAt = new Date();

    const complexityReduction = tile.complexity - this.calculateAverageComplexity(resultingTiles);
    const stabilityImprovement = this.calculateAverageStability() - tile.stability;

    return {
      id: this.generateId(),
      sourceTileId: tileId,
      resultingTiles,
      complexityReduction: Math.max(0, complexityReduction),
      stabilityImprovement: Math.max(0, stabilityImprovement),
      notes
    };
  }

  /**
   * Get smaller size than current
   */
  private getSmallerSize(size: Tile['size']): Tile['size'] {
    const sizes: Tile['size'][] = ['macro', 'meso', 'micro', 'nano'];
    const index = sizes.indexOf(size);
    return index < sizes.length - 1 ? sizes[index + 1] : 'nano';
  }

  /**
   * Group rules by affinity
   */
  private groupRulesByAffinity(rules: TileRule[]): TileRule[][] {
    // Simple grouping by priority
    const groups = new Map<number, TileRule[]>();
    
    for (const rule of rules) {
      const key = Math.floor(rule.priority / 10);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(rule);
    }

    return Array.from(groups.values());
  }

  /**
   * Group examples by similarity
   */
  private groupExamplesBySimilarity(examples: TileExample[]): TileExample[][] {
    const groups: TileExample[][] = [];
    const groupSize = 5;

    for (let i = 0; i < examples.length; i += groupSize) {
      groups.push(examples.slice(i, i + groupSize));
    }

    return groups;
  }

  /**
   * Create a deconstructed tile
   */
  private createDeconstructedTile(
    source: Tile,
    newSize: Tile['size'],
    knowledge: TileKnowledge,
    suffix: string
  ): Tile {
    return {
      id: this.generateId(),
      name: `${source.name}_${suffix}`,
      type: source.type,
      size: newSize,
      complexity: source.complexity * 0.6, // Reduce complexity
      stability: source.stability * 1.1, // Slightly higher stability
      efficiency: source.efficiency,
      dependencies: [],
      knowledge,
      metadata: {
        ...source.metadata,
        maturityLevel: source.metadata.maturityLevel * 0.8,
        deconstructionLevel: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    };
  }

  /**
   * Identify clusters of tiles that could be merged
   */
  private identifyMergeClusters(): TileCluster[] {
    const clusters: TileCluster[] = [];
    const processed = new Set<string>();

    for (const tile of this.tiles.values()) {
      if (processed.has(tile.id)) continue;

      const similar: string[] = [tile.id];

      for (const other of this.tiles.values()) {
        if (other.id === tile.id || processed.has(other.id)) continue;

        if (this.areTilesMergeable(tile, other)) {
          similar.push(other.id);
        }
      }

      if (similar.length > 1) {
        const coherenceScore = this.calculateCoherence(similar);
        clusters.push({
          id: this.generateId(),
          tileIds: similar,
          coherenceScore,
          suggestedMerge: coherenceScore > 0.7,
          mergeRationale: coherenceScore > 0.7 
            ? 'High coherence suggests beneficial merge'
            : 'Low coherence, consider keeping separate'
        });

        similar.forEach(id => processed.add(id));
      }
    }

    return clusters;
  }

  /**
   * Check if two tiles are mergeable
   */
  private areTilesMergeable(tile1: Tile, tile2: Tile): boolean {
    // Same type is required
    if (tile1.type !== tile2.type) return false;

    // Similar size is preferred
    const sizes: Tile['size'][] = ['nano', 'micro', 'meso', 'macro'];
    const sizeDiff = Math.abs(sizes.indexOf(tile1.size) - sizes.indexOf(tile2.size));
    if (sizeDiff > 1) return false;

    // Check for overlapping patterns
    const patterns1 = new Set(tile1.knowledge.patterns);
    const patterns2 = new Set(tile2.knowledge.patterns);
    const overlap = [...patterns1].filter(p => patterns2.has(p)).length;
    const total = patterns1.size + patterns2.size - overlap;
    const overlapRatio = total > 0 ? overlap / total : 0;

    if (overlapRatio > 0.3) return true;

    // Check for similar rules
    if (tile1.knowledge.rules.length > 0 && tile2.knowledge.rules.length > 0) {
      const ruleSimilarity = this.calculateRuleSimilarity(
        tile1.knowledge.rules,
        tile2.knowledge.rules
      );
      if (ruleSimilarity > 0.5) return true;
    }

    return false;
  }

  /**
   * Calculate similarity between rule sets
   */
  private calculateRuleSimilarity(rules1: TileRule[], rules2: TileRule[]): number {
    // Simple Jaccard similarity on conditions
    const conditions1 = new Set(rules1.map(r => r.condition));
    const conditions2 = new Set(rules2.map(r => r.condition));
    const intersection = [...conditions1].filter(c => conditions2.has(c)).length;
    const union = conditions1.size + conditions2.size - intersection;

    return union > 0 ? intersection / union : 0;
  }

  /**
   * Calculate coherence of a tile cluster
   */
  private calculateCoherence(tileIds: string[]): number {
    const tiles = tileIds.map(id => this.tiles.get(id)).filter((t): t is Tile => t !== undefined);
    if (tiles.length < 2) return 1;

    let coherence = 0;

    // Type coherence
    const sameType = tiles.filter(t => t.type === tiles[0].type).length;
    coherence += (sameType / tiles.length) * 0.3;

    // Stability coherence
    const stabilityVariance = this.calculateVariance(tiles.map(t => t.stability));
    coherence += (1 - Math.min(stabilityVariance, 1)) * 0.3;

    // Complexity coherence
    const complexityVariance = this.calculateVariance(tiles.map(t => t.complexity));
    coherence += (1 - Math.min(complexityVariance, 1)) * 0.2;

    // Dependency coherence (tiles referencing each other)
    let sharedDeps = 0;
    for (const tile of tiles) {
      for (const depId of tile.dependencies) {
        if (tileIds.includes(depId)) {
          sharedDeps++;
        }
      }
    }
    coherence += Math.min(sharedDeps / tiles.length, 1) * 0.2;

    return coherence;
  }

  /**
   * Merge multiple tiles into one
   */
  private mergeTiles(tileIds: string[]): boolean {
    if (tileIds.length < 2) return false;

    const tiles = tileIds.map(id => this.tiles.get(id)).filter((t): t is Tile => t !== undefined);
    if (tiles.length < 2) return false;

    // Create merged tile
    const mergedTile: Tile = {
      id: this.generateId(),
      name: `merged_${tiles[0].name}`,
      type: tiles[0].type,
      size: this.getMergedSize(tiles.map(t => t.size)),
      complexity: Math.max(...tiles.map(t => t.complexity)),
      stability: tiles.reduce((s, t) => s + t.stability, 0) / tiles.length,
      efficiency: tiles.reduce((s, t) => s + t.efficiency, 0) / tiles.length,
      dependencies: [...new Set(tiles.flatMap(t => t.dependencies).filter(d => !tileIds.includes(d)))],
      knowledge: {
        patterns: [...new Set(tiles.flatMap(t => t.knowledge.patterns))],
        rules: tiles.flatMap(t => t.knowledge.rules),
        examples: tiles.flatMap(t => t.knowledge.examples),
        constraints: tiles.flatMap(t => t.knowledge.constraints)
      },
      metadata: {
        version: '1.0',
        author: 'tile_optimizer',
        tags: [...new Set(tiles.flatMap(t => t.metadata.tags))],
        description: `Merged from ${tiles.length} tiles`,
        maturityLevel: tiles.reduce((s, t) => s + t.metadata.maturityLevel, 0) / tiles.length,
        deconstructionLevel: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: tiles.reduce((s, t) => s + t.usageCount, 0)
    };

    // Remove old tiles and add merged
    for (const id of tileIds) {
      this.tiles.delete(id);
    }
    this.tiles.set(mergedTile.id, mergedTile);

    return true;
  }

  /**
   * Get merged size from multiple sizes
   */
  private getMergedSize(sizes: Tile['size'][]): Tile['size'] {
    const sizeOrder: Tile['size'][] = ['nano', 'micro', 'meso', 'macro'];
    const avgIndex = sizes.reduce((sum, s) => sum + sizeOrder.indexOf(s), 0) / sizes.length;
    return sizeOrder[Math.min(Math.round(avgIndex), sizeOrder.length - 1)];
  }

  /**
   * Identify tiles to discard
   */
  private identifyTilesToDiscard(): string[] {
    const toDiscard: string[] = [];

    for (const tile of this.tiles.values()) {
      // Discard tiles with very low stability
      if (tile.stability < 0.1) {
        toDiscard.push(tile.id);
        continue;
      }

      // Discard unused tiles (no usage in 30 days and low confidence)
      if (tile.lastUsed) {
        const daysSinceUse = (Date.now() - tile.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUse > 30 && tile.stability < 0.5) {
          toDiscard.push(tile.id);
          continue;
        }
      }

      // Discard tiles with no knowledge
      if (tile.knowledge.patterns.length === 0 &&
          tile.knowledge.rules.length === 0 &&
          tile.knowledge.examples.length === 0) {
        toDiscard.push(tile.id);
      }
    }

    return toDiscard;
  }

  /**
   * Calculate average stability
   */
  private calculateAverageStability(): number {
    const tiles = Array.from(this.tiles.values());
    if (tiles.length === 0) return 0;
    return tiles.reduce((s, t) => s + t.stability, 0) / tiles.length;
  }

  /**
   * Calculate average efficiency
   */
  private calculateAverageEfficiency(): number {
    const tiles = Array.from(this.tiles.values());
    if (tiles.length === 0) return 0;
    return tiles.reduce((s, t) => s + t.efficiency, 0) / tiles.length;
  }

  /**
   * Calculate average complexity
   */
  private calculateAverageComplexity(tiles: Tile[]): number {
    if (tiles.length === 0) return 0;
    return tiles.reduce((s, t) => s + t.complexity, 0) / tiles.length;
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((s, v) => s + v, 0) / values.length;
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const tiles = Array.from(this.tiles.values());

    // Size distribution
    const sizeCount = new Map<Tile['size'], number>();
    for (const tile of tiles) {
      sizeCount.set(tile.size, (sizeCount.get(tile.size) || 0) + 1);
    }

    if ((sizeCount.get('macro') || 0) > tiles.length * 0.3) {
      recommendations.push('Consider deconstructing more macro tiles into smaller cells');
    }

    // Stability distribution
    const lowStability = tiles.filter(t => t.stability < 0.5).length;
    if (lowStability > tiles.length * 0.2) {
      recommendations.push(`${lowStability} tiles have low stability. Review and improve.`);
    }

    // Dependency depth
    const deepDeps = tiles.filter(t => this.getDependencyDepth(t.id) > 5).length;
    if (deepDeps > 0) {
      recommendations.push(`${deepDeps} tiles have deep dependency chains. Consider flattening.`);
    }

    // Maturity levels
    const immature = tiles.filter(t => t.metadata.maturityLevel < 0.3).length;
    if (immature > tiles.length * 0.5) {
      recommendations.push('Many tiles are immature. Increase refinement cycles.');
    }

    return recommendations;
  }

  /**
   * Get dependency depth for a tile
   */
  private getDependencyDepth(tileId: string, visited: Set<string> = new Set()): number {
    const tile = this.tiles.get(tileId);
    if (!tile || visited.has(tileId)) return 0;

    visited.add(tileId);
    let maxDepth = 0;

    for (const depId of tile.dependencies) {
      maxDepth = Math.max(maxDepth, this.getDependencyDepth(depId, visited));
    }

    return maxDepth + 1;
  }

  /**
   * Record tile usage
   */
  recordUsage(tileId: string): void {
    const tile = this.tiles.get(tileId);
    if (tile) {
      tile.usageCount++;
      tile.lastUsed = new Date();
    }
  }

  /**
   * Get optimization history
   */
  getOptimizationHistory(): TileOptimizationResult[] {
    return [...this.optimizationHistory];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `tile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export tiles for persistence
   */
  exportTiles(): Tile[] {
    return Array.from(this.tiles.values());
  }

  /**
   * Import tiles
   */
  importTiles(tiles: Tile[]): void {
    for (const tile of tiles) {
      this.tiles.set(tile.id, tile);
    }
  }

  /**
   * Clear all tiles
   */
  clearTiles(): void {
    this.tiles.clear();
  }
}
