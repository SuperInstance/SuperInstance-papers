/**
 * SelfModifier - Self-modification capabilities
 * 
 * Enables equipment to modify its own behavior, parameters, and structure
 * based on performance feedback and optimization goals.
 */

import { PerformanceMonitor, MetricType, PerformanceAnomaly } from './PerformanceMonitor';
import { KnowledgeDistiller, KnowledgePattern } from './KnowledgeDistiller';
import { TileOptimizer, Tile } from './TileOptimizer';

export interface Modification {
  id: string;
  timestamp: Date;
  type: ModificationType;
  target: string; // Component/parameter being modified
  before: unknown;
  after: unknown;
  reason: string;
  trigger: ModificationTrigger;
  status: ModificationStatus;
  impact?: ModificationImpact;
  rollbackData?: unknown;
}

export type ModificationType = 
  | 'parameter_adjustment'
  | 'threshold_change'
  | 'rule_modification'
  | 'pattern_update'
  | 'tile_restructure'
  | 'dependency_change'
  | 'algorithm_swap'
  | 'weight_adjustment'
  | 'strategy_change'
  | 'constraint_modification';

export type ModificationTrigger = 
  | 'performance_degradation'
  | 'anomaly_detected'
  | 'optimization_cycle'
  | 'threshold_violation'
  | 'knowledge_update'
  | 'user_request'
  | 'scheduled_maintenance'
  | 'error_recovery';

export type ModificationStatus = 
  | 'proposed'
  | 'approved'
  | 'applied'
  | 'validated'
  | 'rolled_back'
  | 'failed';

export interface ModificationImpact {
  metricChanges: Array<{
    metricType: MetricType;
    beforeValue: number;
    afterValue: number;
    improvement: boolean;
  }>;
  stabilityChange: number;
  efficiencyChange: number;
  sideEffects: string[];
}

export interface ModificationPolicy {
  allowedTypes: ModificationType[];
  requireApproval: boolean;
  autoRollbackThreshold: number; // Performance threshold to trigger rollback
  maxModificationsPerCycle: number;
  cooldownPeriodMs: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
}

export interface ModificationProposal {
  id: string;
  modification: Omit<Modification, 'id' | 'timestamp' | 'status' | 'impact'>;
  estimatedImpact: ModificationImpact;
  risk: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  alternatives: ModificationProposal[];
}

export interface ModificationResult {
  success: boolean;
  modification?: Modification;
  error?: string;
  validationResults?: ValidationResult[];
}

export interface ValidationResult {
  check: string;
  passed: boolean;
  message: string;
}

export interface SelfModificationConfig {
  performanceMonitor?: PerformanceMonitor;
  knowledgeDistiller?: KnowledgeDistiller;
  tileOptimizer?: TileOptimizer;
  policy?: Partial<ModificationPolicy>;
}

export class SelfModifier {
  private performanceMonitor?: PerformanceMonitor;
  private knowledgeDistiller?: KnowledgeDistiller;
  private tileOptimizer?: TileOptimizer;
  
  private modifications: Modification[] = [];
  private policy: ModificationPolicy;
  private pendingModifications: Map<string, ModificationProposal> = new Map();
  private lastModificationTime: number = 0;
  
  // Adjustable parameters
  private parameters: Map<string, { value: unknown; min?: number; max?: number; type: string }> = new Map();
  
  // Thresholds that can be modified
  private thresholds: Map<string, { value: number; min: number; max: number }> = new Map();

  constructor(config?: SelfModificationConfig) {
    this.performanceMonitor = config?.performanceMonitor;
    this.knowledgeDistiller = config?.knowledgeDistiller;
    this.tileOptimizer = config?.tileOptimizer;

    this.policy = {
      allowedTypes: [
        'parameter_adjustment',
        'threshold_change',
        'rule_modification',
        'pattern_update',
        'weight_adjustment'
      ],
      requireApproval: true,
      autoRollbackThreshold: 0.2, // 20% performance degradation triggers rollback
      maxModificationsPerCycle: 5,
      cooldownPeriodMs: 60000, // 1 minute cooldown
      riskTolerance: 'moderate',
      ...config?.policy
    };

    this.initializeParameters();
  }

  /**
   * Initialize default parameters that can be modified
   */
  private initializeParameters(): void {
    // Performance thresholds
    this.parameters.set('confidence_threshold', { value: 0.7, min: 0.5, max: 0.95, type: 'number' });
    this.parameters.set('stability_threshold', { value: 0.8, min: 0.5, max: 0.95, type: 'number' });
    this.parameters.set('learning_rate', { value: 0.1, min: 0.01, max: 0.5, type: 'number' });
    this.parameters.set('exploration_rate', { value: 0.2, min: 0.05, max: 0.5, type: 'number' });
    
    // Operational parameters
    this.parameters.set('batch_size', { value: 10, min: 1, max: 100, type: 'number' });
    this.parameters.set('timeout_ms', { value: 30000, min: 5000, max: 120000, type: 'number' });
    this.parameters.set('retry_count', { value: 3, min: 0, max: 10, type: 'number' });
    this.parameters.set('cache_ttl_ms', { value: 3600000, min: 60000, max: 86400000, type: 'number' });

    // Thresholds
    this.thresholds.set('accuracy_min', { value: 0.85, min: 0.7, max: 0.99 });
    this.thresholds.set('latency_max', { value: 500, min: 100, max: 5000 });
    this.thresholds.set('error_rate_max', { value: 0.05, min: 0.01, max: 0.2 });
    this.thresholds.set('cost_max', { value: 0.1, min: 0.01, max: 1.0 });
  }

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
    const currentValue = this.getParameterValue(target);
    
    const modification: Omit<Modification, 'id' | 'timestamp' | 'status' | 'impact'> = {
      type,
      target,
      before: currentValue,
      after: newValue,
      reason,
      trigger
    };

    // Estimate impact
    const estimatedImpact = this.estimateImpact(modification);
    
    // Assess risk
    const risk = this.assessRisk(modification, estimatedImpact);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(modification, estimatedImpact);

    // Generate alternatives
    const alternatives = this.generateAlternatives(modification);

    const proposal: ModificationProposal = {
      id: this.generateId(),
      modification,
      estimatedImpact,
      risk,
      confidence,
      alternatives
    };

    this.pendingModifications.set(proposal.id, proposal);
    return proposal;
  }

  /**
   * Apply a proposed modification
   */
  applyModification(proposalId: string): ModificationResult {
    const proposal = this.pendingModifications.get(proposalId);
    if (!proposal) {
      return { success: false, error: 'Proposal not found' };
    }

    // Check if modification type is allowed
    if (!this.policy.allowedTypes.includes(proposal.modification.type)) {
      return { success: false, error: 'Modification type not allowed' };
    }

    // Check cooldown
    if (Date.now() - this.lastModificationTime < this.policy.cooldownPeriodMs) {
      return { success: false, error: 'Cooldown period not elapsed' };
    }

    // Validate modification
    const validationResults = this.validateModification(proposal.modification);
    if (!validationResults.every(v => v.passed)) {
      return { 
        success: false, 
        error: 'Validation failed',
        validationResults 
      };
    }

    // Apply the modification
    const modification = this.executeModification(proposal);
    
    if (modification.status === 'applied') {
      this.lastModificationTime = Date.now();
      this.pendingModifications.delete(proposalId);
      
      return { 
        success: true, 
        modification,
        validationResults 
      };
    }

    return { 
      success: false, 
      error: 'Failed to apply modification',
      modification 
    };
  }

  /**
   * Execute a modification
   */
  private executeModification(proposal: ModificationProposal): Modification {
    const modification: Modification = {
      id: this.generateId(),
      timestamp: new Date(),
      ...proposal.modification,
      status: 'applied',
      rollbackData: proposal.modification.before
    };

    try {
      switch (proposal.modification.type) {
        case 'parameter_adjustment':
          this.applyParameterChange(
            proposal.modification.target,
            proposal.modification.after as number
          );
          break;

        case 'threshold_change':
          this.applyThresholdChange(
            proposal.modification.target,
            proposal.modification.after as number
          );
          break;

        case 'weight_adjustment':
          this.applyWeightChange(
            proposal.modification.target,
            proposal.modification.after as Record<string, number>
          );
          break;

        case 'rule_modification':
          this.applyRuleModification(
            proposal.modification.target,
            proposal.modification.after
          );
          break;

        case 'pattern_update':
          this.applyPatternUpdate(
            proposal.modification.target,
            proposal.modification.after as KnowledgePattern
          );
          break;

        default:
          throw new Error(`Unknown modification type: ${proposal.modification.type}`);
      }

      // Validate after modification
      const postValidation = this.postModificationValidation(modification);
      if (!postValidation.every(v => v.passed)) {
        return this.rollbackModification(modification, 'Post-validation failed');
      }

      // Calculate actual impact
      modification.impact = this.calculateActualImpact(modification);
      modification.status = 'validated';

    } catch (error) {
      modification.status = 'failed';
      console.error('Modification failed:', error);
    }

    this.modifications.push(modification);
    return modification;
  }

  /**
   * Apply parameter change
   */
  private applyParameterChange(target: string, newValue: number): void {
    const param = this.parameters.get(target);
    if (!param) {
      throw new Error(`Unknown parameter: ${target}`);
    }

    // Validate bounds
    if (param.min !== undefined && newValue < param.min) {
      throw new Error(`Value ${newValue} below minimum ${param.min}`);
    }
    if (param.max !== undefined && newValue > param.max) {
      throw new Error(`Value ${newValue} above maximum ${param.max}`);
    }

    param.value = newValue;
  }

  /**
   * Apply threshold change
   */
  private applyThresholdChange(target: string, newValue: number): void {
    const threshold = this.thresholds.get(target);
    if (!threshold) {
      throw new Error(`Unknown threshold: ${target}`);
    }

    if (newValue < threshold.min || newValue > threshold.max) {
      throw new Error(`Threshold value ${newValue} out of bounds [${threshold.min}, ${threshold.max}]`);
    }

    threshold.value = newValue;

    // Update performance monitor if available
    if (this.performanceMonitor) {
      const metricType = this.thresholdToMetricType(target);
      if (metricType) {
        this.performanceMonitor.setThreshold({
          metricType,
          targetValue: newValue,
          warningThreshold: newValue * 1.2,
          criticalThreshold: newValue * 1.5
        });
      }
    }
  }

  /**
   * Apply weight change
   */
  private applyWeightChange(target: string, weights: Record<string, number>): void {
    // Store weights in parameters
    this.parameters.set(target, { 
      value: weights, 
      type: 'object' 
    });
  }

  /**
   * Apply rule modification
   */
  private applyRuleModification(target: string, _rule: unknown): void {
    // This would modify rules in the tile optimizer
    // Implementation depends on specific rule structure
  }

  /**
   * Apply pattern update
   */
  private applyPatternUpdate(target: string, pattern: KnowledgePattern): void {
    if (this.knowledgeDistiller) {
      // Update pattern in distiller
      // This is a simplified version - actual implementation would need more context
      console.log(`Updating pattern ${target} with:`, pattern);
    }
  }

  /**
   * Rollback a modification
   */
  private rollbackModification(modification: Modification, reason: string): Modification {
    if (modification.rollbackData !== undefined) {
      try {
        switch (modification.type) {
          case 'parameter_adjustment':
            this.applyParameterChange(
              modification.target,
              modification.rollbackData as number
            );
            break;

          case 'threshold_change':
            this.applyThresholdChange(
              modification.target,
              modification.rollbackData as number
            );
            break;

          default:
            // Other types may need specific rollback logic
            break;
        }
      } catch (error) {
        console.error('Rollback failed:', error);
      }
    }

    modification.status = 'rolled_back';
    modification.impact = {
      metricChanges: [],
      stabilityChange: 0,
      efficiencyChange: 0,
      sideEffects: [`Rolled back due to: ${reason}`]
    };

    return modification;
  }

  /**
   * Validate a modification before applying
   */
  private validateModification(modification: Omit<Modification, 'id' | 'timestamp' | 'status' | 'impact'>): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Check if target exists
    results.push({
      check: 'target_exists',
      passed: this.targetExists(modification.target, modification.type),
      message: `Target '${modification.target}' ${this.targetExists(modification.target, modification.type) ? 'exists' : 'not found'}`
    });

    // Check bounds for numeric values
    if (modification.type === 'parameter_adjustment' || modification.type === 'threshold_change') {
      const boundsValid = this.checkBounds(
        modification.target,
        modification.after as number,
        modification.type
      );
      results.push({
        check: 'bounds_check',
        passed: boundsValid,
        message: boundsValid ? 'Value within bounds' : 'Value out of bounds'
      });
    }

    // Check type compatibility
    results.push({
      check: 'type_compatibility',
      passed: this.checkTypeCompatibility(modification),
      message: 'Type compatibility check'
    });

    // Check risk level against policy
    const riskAcceptable = this.isRiskAcceptable(modification);
    results.push({
      check: 'risk_policy',
      passed: riskAcceptable,
      message: riskAcceptable ? 'Risk within policy' : 'Risk exceeds policy tolerance'
    });

    return results;
  }

  /**
   * Post-modification validation
   */
  private postModificationValidation(modification: Modification): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Check system stability
    const stabilityOk = this.checkSystemStability();
    results.push({
      check: 'system_stability',
      passed: stabilityOk,
      message: stabilityOk ? 'System stable after modification' : 'System instability detected'
    });

    // Check for immediate errors
    const errorsOk = this.checkForErrors();
    results.push({
      check: 'error_check',
      passed: errorsOk,
      message: errorsOk ? 'No errors detected' : 'Errors detected after modification'
    });

    return results;
  }

  /**
   * Estimate impact of a modification
   */
  private estimateImpact(
    modification: Omit<Modification, 'id' | 'timestamp' | 'status' | 'impact'>
  ): ModificationImpact {
    const impact: ModificationImpact = {
      metricChanges: [],
      stabilityChange: 0,
      efficiencyChange: 0,
      sideEffects: []
    };

    // Estimate based on modification type
    switch (modification.type) {
      case 'parameter_adjustment':
        const paramChange = (modification.after as number) - (modification.before as number);
        const relativeChange = paramChange / (modification.before as number);

        impact.stabilityChange = -Math.abs(relativeChange) * 0.1; // Slight stability decrease
        impact.efficiencyChange = this.estimateEfficiencyChange(modification.target, relativeChange);
        
        // Estimate metric impacts
        if (modification.target.includes('threshold')) {
          impact.metricChanges.push({
            metricType: 'accuracy',
            beforeValue: modification.before as number,
            afterValue: modification.after as number,
            improvement: relativeChange > 0
          });
        }
        break;

      case 'threshold_change':
        impact.stabilityChange = 0.05;
        impact.metricChanges.push({
          metricType: this.thresholdToMetricType(modification.target) || 'accuracy',
          beforeValue: modification.before as number,
          afterValue: modification.after as number,
          improvement: true // Assume improvement for now
        });
        break;

      case 'weight_adjustment':
        impact.stabilityChange = 0.02;
        impact.efficiencyChange = 0.05;
        impact.sideEffects.push('May affect other weighted calculations');
        break;

      default:
        impact.sideEffects.push('Impact estimation not available for this type');
    }

    return impact;
  }

  /**
   * Estimate efficiency change for a parameter modification
   */
  private estimateEfficiencyChange(target: string, relativeChange: number): number {
    const efficiencyImpactMap: Record<string, number> = {
      'batch_size': relativeChange > 0 ? 0.1 : -0.05,
      'timeout_ms': relativeChange > 0 ? -0.05 : 0.1,
      'cache_ttl_ms': relativeChange > 0 ? 0.15 : -0.1,
      'retry_count': relativeChange > 0 ? -0.05 : 0.05,
      'learning_rate': 0, // Neutral
      'exploration_rate': relativeChange > 0 ? -0.05 : 0.05
    };

    return efficiencyImpactMap[target] || 0;
  }

  /**
   * Assess risk level of a modification
   */
  private assessRisk(
    modification: Omit<Modification, 'id' | 'timestamp' | 'status' | 'impact'>,
    impact: ModificationImpact
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Check magnitude of change
    const magnitude = Math.abs(
      (modification.after as number) - (modification.before as number)
    ) / Math.max(modification.before as number, 0.001);

    if (magnitude > 0.5) return 'critical';
    if (magnitude > 0.3) return 'high';
    if (magnitude > 0.1) return 'medium';

    // Check side effects
    if (impact.sideEffects.length > 2) return 'high';
    if (impact.sideEffects.length > 0) return 'medium';

    // Check stability impact
    if (impact.stabilityChange < -0.1) return 'high';
    if (impact.stabilityChange < -0.05) return 'medium';

    return 'low';
  }

  /**
   * Calculate confidence in a modification
   */
  private calculateConfidence(
    modification: Omit<Modification, 'id' | 'timestamp' | 'status' | 'impact'>,
    impact: ModificationImpact
  ): number {
    let confidence = 0.5; // Base confidence

    // Historical success rate
    const similarMods = this.modifications.filter(
      m => m.type === modification.type && m.target === modification.target
    );
    if (similarMods.length > 0) {
      const successRate = similarMods.filter(m => m.status === 'validated').length / similarMods.length;
      confidence += successRate * 0.2;
    }

    // Impact estimation quality
    if (impact.metricChanges.length > 0) {
      confidence += 0.1;
    }

    // Trigger-based confidence
    if (modification.trigger === 'optimization_cycle') {
      confidence += 0.1;
    } else if (modification.trigger === 'anomaly_detected') {
      confidence -= 0.1;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Generate alternative modifications
   */
  private generateAlternatives(
    modification: Omit<Modification, 'id' | 'timestamp' | 'status' | 'impact'>
  ): ModificationProposal[] {
    const alternatives: ModificationProposal[] = [];

    if (typeof modification.before === 'number' && typeof modification.after === 'number') {
      // Generate conservative alternative (smaller change)
      const conservativeValue = modification.before + (modification.after - modification.before) * 0.5;
      alternatives.push(this.proposeModification(
        modification.type,
        modification.target,
        conservativeValue,
        `${modification.reason} (conservative)`,
        modification.trigger
      ));

      // Generate step-wise alternative
      const stepValue = modification.before + (modification.after - modification.before) * 0.25;
      alternatives.push(this.proposeModification(
        modification.type,
        modification.target,
        stepValue,
        `${modification.reason} (step-wise)`,
        modification.trigger
      ));
    }

    return alternatives.slice(0, 3); // Return up to 3 alternatives
  }

  /**
   * Calculate actual impact after modification
   */
  private calculateActualImpact(modification: Modification): ModificationImpact {
    const impact: ModificationImpact = {
      metricChanges: [],
      stabilityChange: 0,
      efficiencyChange: 0,
      sideEffects: []
    };

    // Get current performance metrics if available
    if (this.performanceMonitor) {
      const snapshot = this.performanceMonitor.createSnapshot();
      
      for (const [metricType, summary] of snapshot.metrics) {
        impact.metricChanges.push({
          metricType,
          beforeValue: modification.before as number,
          afterValue: summary.mean,
          improvement: true // Would need comparison logic
        });
      }
    }

    return impact;
  }

  /**
   * Auto-propose modifications based on performance
   */
  autoProposeModifications(): ModificationProposal[] {
    const proposals: ModificationProposal[] = [];

    // Check performance for degradation
    if (this.performanceMonitor) {
      const anomalies = this.performanceMonitor.detectAnomalies();
      
      for (const anomaly of anomalies) {
        if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
          const proposal = this.generateRecoveryModification(anomaly);
          if (proposal) {
            proposals.push(proposal);
          }
        }
      }

      // Check for improvement opportunities
      const opportunities = this.performanceMonitor.identifyImprovementOpportunities();
      
      for (const opportunity of opportunities.slice(0, 3)) { // Top 3 opportunities
        const proposal = this.generateOptimizationModification(opportunity);
        if (proposal) {
          proposals.push(proposal);
        }
      }
    }

    // Check for parameter optimization
    proposals.push(...this.suggestParameterOptimizations());

    return proposals.slice(0, this.policy.maxModificationsPerCycle);
  }

  /**
   * Generate recovery modification for anomaly
   */
  private generateRecoveryModification(anomaly: PerformanceAnomaly): ModificationProposal | null {
    const targetMetric = anomaly.metricType;
    const metricToThreshold = new Map<MetricType, string>([
      ['accuracy', 'accuracy_min'],
      ['latency', 'latency_max'],
      ['error_rate', 'error_rate_max'],
      ['cost', 'cost_max']
    ]);

    const threshold = metricToThreshold.get(targetMetric);
    if (!threshold) return null;

    // Adjust threshold temporarily
    const currentValue = this.thresholds.get(threshold)?.value;
    if (currentValue === undefined) return null;

    const adjustment = targetMetric === 'latency' || targetMetric === 'error_rate' || targetMetric === 'cost'
      ? currentValue * 1.2 // Increase for max thresholds
      : currentValue * 0.9; // Decrease for min thresholds

    return this.proposeModification(
      'threshold_change',
      threshold,
      adjustment,
      `Recovery for ${targetMetric} anomaly: ${anomaly.description}`,
      'anomaly_detected'
    );
  }

  /**
   * Generate optimization modification for opportunity
   */
  private generateOptimizationModification(opportunity: {
    metricType: MetricType;
    currentValue: number;
    targetValue: number;
    recommendations: string[];
  }): ModificationProposal | null {
    // Find relevant parameter to adjust
    const metricToParam = new Map<MetricType, string>([
      ['accuracy', 'confidence_threshold'],
      ['latency', 'timeout_ms'],
      ['error_rate', 'retry_count'],
      ['cost', 'batch_size']
    ]);

    const param = metricToParam.get(opportunity.metricType);
    if (!param) return null;

    const currentValue = this.getParameterValue(param) as number;
    if (currentValue === undefined) return null;

    // Calculate adjustment
    const direction = opportunity.currentValue > opportunity.targetValue ? -1 : 1;
    const adjustment = currentValue * 0.1 * direction;

    return this.proposeModification(
      'parameter_adjustment',
      param,
      currentValue + adjustment,
      `Optimize ${opportunity.metricType}: ${opportunity.recommendations[0]}`,
      'optimization_cycle'
    );
  }

  /**
   * Suggest parameter optimizations
   */
  private suggestParameterOptimizations(): ModificationProposal[] {
    const proposals: ModificationProposal[] = [];

    // Check learning rate optimization
    const learningRate = this.getParameterValue('learning_rate') as number;
    if (learningRate < 0.2) {
      proposals.push(this.proposeModification(
        'parameter_adjustment',
        'learning_rate',
        learningRate * 1.1,
        'Increase learning rate for faster adaptation',
        'optimization_cycle'
      ));
    }

    // Check exploration rate
    const explorationRate = this.getParameterValue('exploration_rate') as number;
    if (explorationRate > 0.3) {
      proposals.push(this.proposeModification(
        'parameter_adjustment',
        'exploration_rate',
        explorationRate * 0.9,
        'Reduce exploration to focus on exploitation',
        'optimization_cycle'
      ));
    }

    return proposals;
  }

  // Helper methods

  private getParameterValue(name: string): unknown {
    return this.parameters.get(name)?.value ?? this.thresholds.get(name)?.value;
  }

  private targetExists(target: string, type: ModificationType): boolean {
    switch (type) {
      case 'parameter_adjustment':
        return this.parameters.has(target);
      case 'threshold_change':
        return this.thresholds.has(target);
      default:
        return true;
    }
  }

  private checkBounds(target: string, value: number, type: ModificationType): boolean {
    if (type === 'parameter_adjustment') {
      const param = this.parameters.get(target);
      if (param?.min !== undefined && value < param.min) return false;
      if (param?.max !== undefined && value > param.max) return false;
    }
    
    if (type === 'threshold_change') {
      const threshold = this.thresholds.get(target);
      if (threshold && (value < threshold.min || value > threshold.max)) return false;
    }

    return true;
  }

  private checkTypeCompatibility(modification: Omit<Modification, 'id' | 'timestamp' | 'status' | 'impact'>): boolean {
    if (modification.type === 'parameter_adjustment' || modification.type === 'threshold_change') {
      return typeof modification.after === 'number';
    }
    return true;
  }

  private isRiskAcceptable(modification: Omit<Modification, 'id' | 'timestamp' | 'status' | 'impact'>): boolean {
    const impact = this.estimateImpact(modification);
    const risk = this.assessRisk(modification, impact);

    const riskLevels = ['low', 'medium', 'high', 'critical'];
    const toleranceIndex = riskLevels.indexOf(this.policy.riskTolerance);
    const riskIndex = riskLevels.indexOf(risk);

    return riskIndex <= toleranceIndex;
  }

  private checkSystemStability(): boolean {
    // Simplified stability check
    if (this.tileOptimizer) {
      const tiles = this.tileOptimizer.getTiles();
      const avgStability = tiles.reduce((s, t) => s + t.stability, 0) / tiles.length;
      return avgStability > 0.5;
    }
    return true;
  }

  private checkForErrors(): boolean {
    // Check for recent errors in modifications
    const recentMods = this.modifications.filter(
      m => Date.now() - m.timestamp.getTime() < 60000
    );
    return !recentMods.some(m => m.status === 'failed');
  }

  private thresholdToMetricType(threshold: string): MetricType | null {
    const mapping: Record<string, MetricType> = {
      'accuracy_min': 'accuracy',
      'latency_max': 'latency',
      'error_rate_max': 'error_rate',
      'cost_max': 'cost'
    };
    return mapping[threshold] || null;
  }

  private generateId(): string {
    return `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public getters

  getModifications(): Modification[] {
    return [...this.modifications];
  }

  getPendingModifications(): ModificationProposal[] {
    return Array.from(this.pendingModifications.values());
  }

  getParameters(): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    for (const [key, value] of this.parameters) {
      params[key] = value.value;
    }
    return params;
  }

  getThresholds(): Record<string, number> {
    const thresholds: Record<string, number> = {};
    for (const [key, value] of this.thresholds) {
      thresholds[key] = value.value;
    }
    return thresholds;
  }

  setPolicy(policy: Partial<ModificationPolicy>): void {
    this.policy = { ...this.policy, ...policy };
  }

  getPolicy(): ModificationPolicy {
    return { ...this.policy };
  }
}
