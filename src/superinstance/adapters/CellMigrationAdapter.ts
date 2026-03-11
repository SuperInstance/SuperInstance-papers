/**
 * CellMigrationAdapter - Migration path from existing cell system to SuperInstance
 *
 * Provides adapters, migration strategies, and backward compatibility
 * for transitioning from the existing cell system to SuperInstances.
 */

import {
  SuperInstance, InstanceType, InstanceState, InstanceConfiguration,
  CellPosition, ValidationResult
} from '../types/base';
import { ConcreteDataBlockInstance } from '../instances/DataBlockInstance';
import { ConcreteProcessInstance } from '../instances/ProcessInstance';
import { ConcreteLearningAgentInstance } from '../instances/LearningAgentInstance';

// Import existing cell types (these would come from the actual codebase)
enum CellType {
  INPUT = 'input',
  OUTPUT = 'output',
  STORAGE = 'storage',
  TRANSFORM = 'transform',
  FILTER = 'filter',
  AGGREGATE = 'aggregate',
  VALIDATE = 'validate',
  ANALYSIS = 'analysis',
  PREDICTION = 'prediction',
  DECISION = 'decision',
  EXPLAIN = 'explain',
  NOTIFY = 'notify',
  TRIGGER = 'trigger',
  SCHEDULE = 'schedule',
  COORDINATE = 'coordinate',
  WHAT_IF = 'what_if',
  OPTIMIZATION = 'optimization',
  REGRESSION = 'regression',
  TIME_SERIES = 'time_series',
  MONTE_CARLO = 'monte_carlo',
}

enum CellState {
  DORMANT = 'dormant',
  SENSING = 'sensing',
  PROCESSING = 'processing',
  EMITTING = 'emitting',
  LEARNING = 'learning',
  ERROR = 'error',
}

/**
 * ExistingCell - Interface representing existing cell structure
 */
interface ExistingCell {
  id: string;
  type: CellType;
  state: CellState;
  position: CellPosition;
  name?: string;
  description?: string;
  data?: any;
  configuration?: any;
}

/**
 * MigrationStrategy - Strategy for migrating cells to SuperInstances
 */
export enum MigrationStrategy {
  IN_PLACE = 'in_place',      // Convert cell in place
  SIDEBYSIDE = 'side_by_side', // Create SuperInstance alongside cell
  GRADUAL = 'gradual',         // Gradually migrate functionality
  HYBRID = 'hybrid',           // Hybrid approach
}

/**
 * MigrationPhase - Phases of migration
 */
export enum MigrationPhase {
  ANALYSIS = 'analysis',       // Analyze existing cells
  PLANNING = 'planning',       // Plan migration strategy
  IMPLEMENTATION = 'implementation', // Implement migration
  VALIDATION = 'validation',   // Validate migration
  OPTIMIZATION = 'optimization', // Optimize after migration
}

/**
 * MigrationPlan - Complete migration plan
 */
export interface MigrationPlan {
  strategy: MigrationStrategy;
  phases: MigrationPhase[];
  timeline: {
    start: number;
    end: number;
    milestones: { phase: MigrationPhase; date: number; description: string }[];
  };
  riskAssessment: {
    technicalRisks: string[];
    businessRisks: string[];
    mitigationStrategies: string[];
  };
  rollbackPlan: {
    triggers: string[];
    procedures: string[];
    estimatedTime: number;
  };
}

/**
 * MigrationResult - Result of migration operation
 */
export interface MigrationResult {
  success: boolean;
  migratedCells: number;
  failedCells: number;
  warnings: string[];
  errors: string[];
  performanceImpact: {
    before: any;
    after: any;
    improvement: number;
  };
  compatibilityReport: {
    full: number;
    partial: number;
    none: number;
  };
}

/**
 * CellMigrationAdapter - Main adapter for migrating cells to SuperInstances
 */
export class CellMigrationAdapter {
  private migrationStrategy: MigrationStrategy = MigrationStrategy.GRADUAL;
  private currentPhase: MigrationPhase = MigrationPhase.ANALYSIS;
  private migrationPlan?: MigrationPlan;

  /**
   * Map CellType to InstanceType
   */
  static mapCellTypeToInstanceType(cellType: CellType): InstanceType {
    const mapping: Record<CellType, InstanceType> = {
      // Data processing cells
      [CellType.INPUT]: InstanceType.DATA_BLOCK,
      [CellType.OUTPUT]: InstanceType.DATA_BLOCK,
      [CellType.STORAGE]: InstanceType.DATA_BLOCK,
      [CellType.TRANSFORM]: InstanceType.TRANSFORMATION,
      [CellType.FILTER]: InstanceType.FUNCTION,
      [CellType.AGGREGATE]: InstanceType.FUNCTION,
      [CellType.VALIDATE]: InstanceType.FUNCTION,

      // Analysis cells
      [CellType.ANALYSIS]: InstanceType.ALGORITHM,
      [CellType.PREDICTION]: InstanceType.MODEL,
      [CellType.DECISION]: InstanceType.DECISION_AGENT,
      [CellType.EXPLAIN]: InstanceType.REASONING_AGENT,

      // Notification cells
      [CellType.NOTIFY]: InstanceType.MESSAGE,
      [CellType.TRIGGER]: InstanceType.EVENT_BUS,
      [CellType.SCHEDULE]: InstanceType.PROCESS,
      [CellType.COORDINATE]: InstanceType.SUPERVISOR,

      // Analytics cells
      [CellType.WHAT_IF]: InstanceType.SIMULATION,
      [CellType.OPTIMIZATION]: InstanceType.OPTIMIZATION_AGENT,
      [CellType.REGRESSION]: InstanceType.MODEL,
      [CellType.TIME_SERIES]: InstanceType.MODEL,
      [CellType.MONTE_CARLO]: InstanceType.SIMULATION,
    };

    return mapping[cellType] || InstanceType.FUNCTION;
  }

  /**
   * Map CellState to InstanceState
   */
  static mapCellStateToInstanceState(cellState: CellState): InstanceState {
    const mapping: Record<CellState, InstanceState> = {
      [CellState.DORMANT]: InstanceState.IDLE,
      [CellState.SENSING]: InstanceState.LISTENING,
      [CellState.PROCESSING]: InstanceState.PROCESSING,
      [CellState.EMITTING]: InstanceState.SENDING,
      [CellState.LEARNING]: InstanceState.PROCESSING,
      [CellState.ERROR]: InstanceState.ERROR,
    };

    return mapping[cellState] || InstanceState.INITIALIZED;
  }

  /**
   * Create SuperInstance from existing cell
   */
  static createSuperInstanceFromCell(cell: ExistingCell, spreadsheetId: string): SuperInstance {
    const instanceType = this.mapCellTypeToInstanceType(cell.type);
    const instanceState = this.mapCellStateToInstanceState(cell.state);

    // Create configuration from cell configuration
    const configuration: Partial<InstanceConfiguration> = {
      resources: {
        cpu: 10,
        memory: 100,
        storage: 1000,
        network: 10
      },
      constraints: {
        maxRuntime: 60000,
        maxMemory: 500,
        networkQuota: 100,
        allowedOperations: [],
        disallowedOperations: []
      },
      policies: {
        isolationLevel: 'partial',
        dataEncryption: true,
        auditLogging: true,
        backupFrequency: 60,
        retentionPeriod: 30
      }
    };

    // Create appropriate instance based on type
    switch (instanceType) {
      case InstanceType.DATA_BLOCK:
        return new ConcreteDataBlockInstance({
          id: cell.id,
          name: cell.name || `Data Block ${cell.id}`,
          description: cell.description || `Migrated from cell ${cell.id}`,
          cellPosition: cell.position,
          spreadsheetId,
          dataFormat: 'json',
          data: cell.data,
          configuration
        });

      case InstanceType.PROCESS:
        return new ConcreteProcessInstance({
          id: cell.id,
          name: cell.name || `Process ${cell.id}`,
          description: cell.description || `Migrated from cell ${cell.id}`,
          cellPosition: cell.position,
          spreadsheetId,
          command: 'process',
          arguments: [],
          workingDirectory: '/',
          configuration
        });

      case InstanceType.LEARNING_AGENT:
        return new ConcreteLearningAgentInstance({
          id: cell.id,
          name: cell.name || `Learning Agent ${cell.id}`,
          description: cell.description || `Migrated from cell ${cell.id}`,
          cellPosition: cell.position,
          spreadsheetId,
          modelType: 'classification',
          modelVersion: '1.0.0',
          configuration
        });

      default:
        // Create generic SuperInstance
        return this.createGenericSuperInstance(cell, spreadsheetId, instanceType, configuration);
    }
  }

  /**
   * Create generic SuperInstance for unmapped types
   */
  private static createGenericSuperInstance(
    cell: ExistingCell,
    spreadsheetId: string,
    instanceType: InstanceType,
    configuration: Partial<InstanceConfiguration>
  ): SuperInstance {
    // This would be a more complete implementation in production
    // For now, return a minimal implementation
    const genericInstance: SuperInstance = {
      id: cell.id,
      type: instanceType,
      name: cell.name || `Instance ${cell.id}`,
      description: cell.description || `Migrated from cell ${cell.id}`,
      state: this.mapCellStateToInstanceState(cell.state),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastActive: Date.now(),
      cellPosition: cell.position,
      spreadsheetId,
      capabilities: ['read', 'write'],
      configuration: configuration as InstanceConfiguration,
      permissions: {
        canRead: true,
        canWrite: true,
        canExecute: true,
        canNetwork: true,
        canCompose: true,
        canModify: true,
        canDelete: false,
        allowedResources: [],
        disallowedResources: []
      },

      // Stub implementations
      initialize: async () => {},
      activate: async () => {},
      deactivate: async () => {},
      terminate: async () => {},
      serialize: async () => ({ id: cell.id, type: instanceType, state: InstanceState.INITIALIZED, data: {}, configuration: configuration as InstanceConfiguration, timestamp: Date.now(), version: '1.0.0' }),
      deserialize: async () => {},
      sendMessage: async () => ({ messageId: '', status: 'success' }),
      receiveMessage: async () => {},
      getStatus: async () => ({ state: InstanceState.INITIALIZED, health: 'healthy', uptime: 0, warnings: [] }),
      getMetrics: async () => ({ cpuUsage: 0, memoryUsage: 0, diskUsage: 0, networkIn: 0, networkOut: 0, requestCount: 0, errorRate: 0, latency: { p50: 0, p90: 0, p95: 0, p99: 0, max: 0 } }),
      getChildren: async () => [],
      getParents: async () => [],
      getNeighbors: async () => [],
      connectTo: async () => ({ id: '', source: '', target: '', type: 'data_flow', bandwidth: 0, latency: 0, reliability: 0, establishedAt: 0 }),
      disconnectFrom: async () => {}
    };

    return genericInstance;
  }

  /**
   * Analyze existing cells for migration
   */
  analyzeCells(cells: ExistingCell[]): {
    analysis: {
      totalCells: number;
      byType: Record<CellType, number>;
      migrationComplexity: 'low' | 'medium' | 'high';
      estimatedTime: number; // in hours
      compatibilityScore: number; // 0-100
    };
    recommendations: string[];
    risks: string[];
  } {
    const byType: Record<CellType, number> = {};
    let compatibilityScore = 0;
    const recommendations: string[] = [];
    const risks: string[] = [];

    for (const cell of cells) {
      byType[cell.type] = (byType[cell.type] || 0) + 1;

      // Calculate compatibility
      const instanceType = CellMigrationAdapter.mapCellTypeToInstanceType(cell.type);
      if (instanceType !== InstanceType.FUNCTION) {
        compatibilityScore += 1;
      }
    }

    const totalCells = cells.length;
    compatibilityScore = totalCells > 0 ? (compatibilityScore / totalCells) * 100 : 0;

    // Determine migration complexity
    let migrationComplexity: 'low' | 'medium' | 'high' = 'low';
    if (totalCells > 100) migrationComplexity = 'high';
    else if (totalCells > 50) migrationComplexity = 'medium';

    // Estimate time (simplified)
    const estimatedTime = totalCells * 0.1; // 0.1 hours per cell

    // Generate recommendations
    if (compatibilityScore < 70) {
      recommendations.push('Consider gradual migration for low-compatibility cells');
      recommendations.push('Develop custom adapters for unsupported cell types');
    }

    if (Object.keys(byType).length > 10) {
      recommendations.push('Group similar cell types for batch migration');
    }

    // Identify risks
    if (byType[CellType.PROCESSING] > 0) {
      risks.push('Processing cells may have complex state that is hard to migrate');
    }

    if (compatibilityScore < 50) {
      risks.push('Low compatibility may require significant rework');
    }

    return {
      analysis: {
        totalCells,
        byType,
        migrationComplexity,
        estimatedTime,
        compatibilityScore
      },
      recommendations,
      risks
    };
  }

  /**
   * Create migration plan
   */
  createMigrationPlan(
    cells: ExistingCell[],
    strategy: MigrationStrategy = MigrationStrategy.GRADUAL
  ): MigrationPlan {
    const analysis = this.analyzeCells(cells);
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    const milestones = [
      {
        phase: MigrationPhase.ANALYSIS,
        date: now,
        description: 'Complete cell analysis and planning'
      },
      {
        phase: MigrationPhase.PLANNING,
        date: now + oneWeek / 4,
        description: 'Finalize migration strategy and test plan'
      },
      {
        phase: MigrationPhase.IMPLEMENTATION,
        date: now + oneWeek / 2,
        description: 'Migrate 50% of cells'
      },
      {
        phase: MigrationPhase.VALIDATION,
        date: now + oneWeek * 3 / 4,
        description: 'Validate migrated instances and fix issues'
      },
      {
        phase: MigrationPhase.OPTIMIZATION,
        date: now + oneWeek,
        description: 'Optimize performance and finalize migration'
      }
    ];

    const plan: MigrationPlan = {
      strategy,
      phases: Object.values(MigrationPhase),
      timeline: {
        start: now,
        end: now + oneWeek,
        milestones
      },
      riskAssessment: {
        technicalRisks: [
          'Data loss during migration',
          'Performance degradation',
          'Compatibility issues with existing integrations',
          'State synchronization problems'
        ],
        businessRisks: [
          'Downtime during migration',
          'User retraining required',
          'Temporary productivity loss'
        ],
        mitigationStrategies: [
          'Implement incremental migration with rollback capability',
          'Maintain parallel operation during transition',
          'Provide comprehensive documentation and training',
          'Establish monitoring and alerting'
        ]
      },
      rollbackPlan: {
        triggers: [
          'Critical data loss detected',
          'Performance degradation > 50%',
          'User complaints > 10%',
          'Migration failure rate > 5%'
        ],
        procedures: [
          'Stop migration process',
          'Restore from backup',
          'Revert to original cell system',
          'Notify stakeholders',
          'Conduct post-mortem analysis'
        ],
        estimatedTime: 2 * 60 * 60 * 1000 // 2 hours
      }
    };

    this.migrationPlan = plan;
    this.migrationStrategy = strategy;
    return plan;
  }

  /**
   * Execute migration
   */
  async executeMigration(
    cells: ExistingCell[],
    spreadsheetId: string,
    batchSize: number = 10
  ): Promise<MigrationResult> {
    if (!this.migrationPlan) {
      throw new Error('Migration plan not created. Call createMigrationPlan first.');
    }

    this.currentPhase = MigrationPhase.IMPLEMENTATION;

    const migratedInstances: SuperInstance[] = [];
    const failedCells: ExistingCell[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Performance metrics
    const startTime = Date.now();
    let totalMigrationTime = 0;

    // Process cells in batches
    for (let i = 0; i < cells.length; i += batchSize) {
      const batch = cells.slice(i, i + batchSize);
      const batchStartTime = Date.now();

      for (const cell of batch) {
        try {
          const instance = CellMigrationAdapter.createSuperInstanceFromCell(cell, spreadsheetId);

          // Initialize the instance
          await instance.initialize();

          // Activate if cell was active
          if (cell.state !== CellState.DORMANT && cell.state !== CellState.ERROR) {
            await instance.activate();
          }

          migratedInstances.push(instance);
        } catch (error) {
          failedCells.push(cell);
          errors.push(`Failed to migrate cell ${cell.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);

          // Log warning for recoverable errors
          if (error instanceof Error && error.message.includes('configuration')) {
            warnings.push(`Configuration issue with cell ${cell.id}, using defaults`);
          }
        }
      }

      const batchTime = Date.now() - batchStartTime;
      totalMigrationTime += batchTime;

      // Throttle to avoid overwhelming the system
      if (i + batchSize < cells.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Calculate performance impact (simplified)
    const performanceImpact = {
      before: {
        cellCount: cells.length,
        estimatedProcessingTime: cells.length * 100 // 100ms per cell
      },
      after: {
        instanceCount: migratedInstances.length,
        estimatedProcessingTime: migratedInstances.length * 50 // 50ms per instance (optimized)
      },
      improvement: ((cells.length * 100) - (migratedInstances.length * 50)) / (cells.length * 100) * 100
    };

    // Calculate compatibility
    const compatibilityReport = {
      full: migratedInstances.length,
      partial: 0, // Would need more detailed analysis
      none: failedCells.length
    };

    return {
      success: failedCells.length === 0,
      migratedCells: migratedInstances.length,
      failedCells: failedCells.length,
      warnings,
      errors,
      performanceImpact,
      compatibilityReport
    };
  }

  /**
   * Validate migration
   */
  async validateMigration(
    originalCells: ExistingCell[],
    migratedInstances: SuperInstance[]
  ): Promise<{
    validationResults: ValidationResult[];
    issues: string[];
    recommendations: string[];
    overallValid: boolean;
  }> {
    this.currentPhase = MigrationPhase.VALIDATION;

    const validationResults: ValidationResult[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Validate each migrated instance
    for (let i = 0; i < Math.min(originalCells.length, migratedInstances.length); i++) {
      const cell = originalCells[i];
      const instance = migratedInstances[i];

      const validation = await this.validateInstanceMigration(cell, instance);
      validationResults.push(validation);

      if (!validation.valid) {
        issues.push(`Migration validation failed for cell ${cell.id}`);

        for (const error of validation.errors) {
          issues.push(`  - ${error.message}`);
        }
      }

      // Check for warnings
      if (validation.warnings.length > 0) {
        for (const warning of validation.warnings) {
          recommendations.push(`Warning for ${cell.id}: ${warning.message}`);
        }
      }
    }

    // Check for data consistency
    const dataConsistency = await this.validateDataConsistency(originalCells, migratedInstances);
    if (!dataConsistency.consistent) {
      issues.push('Data consistency issues detected');
      issues.push(...dataConsistency.issues);
    }

    // Check performance
    const performanceCheck = await this.validatePerformance(migratedInstances);
    if (!performanceCheck.acceptable) {
      issues.push('Performance issues detected');
      recommendations.push(...performanceCheck.recommendations);
    }

    const overallValid = issues.length === 0 && validationResults.every(r => r.valid);

    return {
      validationResults,
      issues,
      recommendations,
      overallValid
    };
  }

  /**
   * Validate single instance migration
   */
  private async validateInstanceMigration(
    cell: ExistingCell,
    instance: SuperInstance
  ): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];
    const suggestions: any[] = [];

    // Check ID mapping
    if (instance.id !== cell.id) {
      errors.push({
        code: 'ID_MISMATCH',
        message: `Instance ID ${instance.id} does not match cell ID ${cell.id}`,
        path: ['id'],
        severity: 'error'
      });
    }

    // Check position mapping
    if (instance.cellPosition.row !== cell.position.row ||
        instance.cellPosition.col !== cell.position.col) {
      errors.push({
        code: 'POSITION_MISMATCH',
        message: `Instance position does not match cell position`,
        path: ['cellPosition'],
        severity: 'error'
      });
    }

    // Check state mapping
    const expectedState = CellMigrationAdapter.mapCellStateToInstanceState(cell.state);
    if (instance.state !== expectedState) {
      warnings.push({
        code: 'STATE_MISMATCH',
        message: `Instance state ${instance.state} does not match expected ${expectedState}`,
        path: ['state'],
        severity: 'warning'
      });
    }

    // Check type mapping
    const expectedType = CellMigrationAdapter.mapCellTypeToInstanceType(cell.type);
    if (instance.type !== expectedType) {
      warnings.push({
        code: 'TYPE_MAPPING',
        message: `Instance type ${instance.type} mapped from cell type ${cell.type}`,
        path: ['type'],
        severity: 'info'
      });
    }

    // Check capabilities
    if (instance.capabilities.length === 0) {
      suggestions.push({
        description: 'Add capabilities based on cell type',
        operation: 'add',
        value: ['read', 'write'],
        path: ['capabilities']
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate data consistency
   */
  private async validateDataConsistency(
    originalCells: ExistingCell[],
    migratedInstances: SuperInstance[]
  ): Promise<{
    consistent: boolean;
    issues: string[];
    dataLoss: boolean;
  }> {
    const issues: string[] = [];
    let dataLoss = false;

    // Check for data preservation in data blocks
    for (let i = 0; i < Math.min(originalCells.length, migratedInstances.length); i++) {
      const cell = originalCells[i];
      const instance = migratedInstances[i];

      if (instance.type === InstanceType.DATA_BLOCK && cell.data) {
        // In a real implementation, we would compare the actual data
        // For now, we just check if data exists
        const instanceData = (instance as any).data;
        if (!instanceData) {
          issues.push(`Data loss detected for cell ${cell.id}`);
          dataLoss = true;
        }
      }
    }

    return {
      consistent: issues.length === 0,
      issues,
      dataLoss
    };
  }

  /**
   * Validate performance
   */
  private async validatePerformance(
    instances: SuperInstance[]
  ): Promise<{
    acceptable: boolean;
    metrics: any;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    let totalMemory = 0;
    let totalCPU = 0;

    for (const instance of instances) {
      totalMemory += instance.configuration.resources.memory;
      totalCPU += instance.configuration.resources.cpu;

      // Check individual instance performance
      if (instance.configuration.resources.memory > 500) {
        recommendations.push(`Instance ${instance.id} has high memory allocation (${instance.configuration.resources.memory}MB)`);
      }

      if (instance.configuration.resources.cpu > 50) {
        recommendations.push(`Instance ${instance.id} has high CPU allocation (${instance.configuration.resources.cpu}%)`);
      }
    }

    // Check overall resource usage
    if (totalMemory > 8192) { // 8GB
      recommendations.push(`Total memory allocation (${totalMemory}MB) exceeds recommended limit`);
    }

    if (totalCPU > 200) { // 200% (2 cores at 100%)
      recommendations.push(`Total CPU allocation (${totalCPU}%) may cause performance issues`);
    }

    const acceptable = recommendations.length === 0;

    return {
      acceptable,
      metrics: {
        totalMemory,
        totalCPU,
        instanceCount: instances.length
      },
      recommendations
    };
  }

  /**
   * Optimize migrated instances
   */
  async optimizeMigration(
    instances: SuperInstance[]
  ): Promise<{
    optimized: boolean;
    changes: string[];
    performanceImprovement: number;
  }> {
    this.currentPhase = MigrationPhase.OPTIMIZATION;

    const changes: string[] = [];
    let performanceImprovement = 0;

    for (const instance of instances) {
      const originalConfig = { ...instance.configuration };

      // Optimize resource allocation
      if (instance.configuration.resources.memory > 500) {
        instance.configuration.resources.memory = Math.min(instance.configuration.resources.memory, 500);
        changes.push(`Reduced memory for ${instance.id} from ${originalConfig.resources.memory}MB to ${instance.configuration.resources.memory}MB`);
        performanceImprovement += 0.1;
      }

      if (instance.configuration.resources.cpu > 50) {
        instance.configuration.resources.cpu = Math.min(instance.configuration.resources.cpu, 50);
        changes.push(`Reduced CPU for ${instance.id} from ${originalConfig.resources.cpu}% to ${instance.configuration.resources.cpu}%`);
        performanceImprovement += 0.05;
      }

      // Optimize monitoring
      if (instance.configuration.monitoring.metricsInterval < 30) {
        instance.configuration.monitoring.metricsInterval = 30;
        changes.push(`Increased metrics interval for ${instance.id} to reduce overhead`);
        performanceImprovement += 0.02;
      }
    }

    return {
      optimized: changes.length > 0,
      changes,
      performanceImprovement
    };
  }

  /**
   * Get current migration status
   */
  getMigrationStatus(): {
    phase: MigrationPhase;
    strategy: MigrationStrategy;
    plan?: MigrationPlan;
    progress?: number;
  } {
    return {
      phase: this.currentPhase,
      strategy: this.migrationStrategy,
      plan: this.migrationPlan,
      progress: this.calculateProgress()
    };
  }

  /**
   * Calculate migration progress
   */
  private calculateProgress(): number {
    if (!this.migrationPlan) return 0;

    const phases = Object.values(MigrationPhase);
    const currentIndex = phases.indexOf(this.currentPhase);
    const totalPhases = phases.length;

    return (currentIndex / totalPhases) * 100;
  }
}