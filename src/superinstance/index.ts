/**
 * SuperInstance System - Main Entry Point
 *
 * Exports all components of the SuperInstance system:
 * - Type definitions and interfaces
 * - Concrete instance implementations
 * - Validation engine
 * - Migration adapters
 * - Integration utilities
 */

// Export type definitions
export * from './types/base';

// Export concrete instance implementations
export { ConcreteDataBlockInstance as DataBlockInstance } from './instances/DataBlockInstance';
export { ConcreteProcessInstance as ProcessInstance } from './instances/ProcessInstance';
export { ConcreteLearningAgentInstance as LearningAgentInstance } from './instances/LearningAgentInstance';
export { ConcreteViewPortInstance as ViewPortInstance } from './instances/ViewPortInstance';
export { ConcreteConnectorInstance as ConnectorInstance } from './instances/ConnectorInstance';
export { ConcreteValidatorInstance as ValidatorInstance } from './instances/ValidatorInstance';
export { ConcreteTriggerInstance as TriggerInstance } from './instances/TriggerInstance';
export { ConcreteCacheInstance as CacheInstance } from './instances/CacheInstance';

// Export validation engine
export { SuperInstanceValidator } from './validation/SuperInstanceValidator';
export type {
  CompatibilityResult,
  ConfigurationValidationResult,
  TransitionValidationResult,
  MessageValidationResult,
  ConnectionValidationResult,
  CompositionValidationResult,
  OrchestrationValidationResult,
  DependencyValidationResult,
  PermissionValidationResult,
  IsolationValidationResult,
  DataFlowValidationResult
} from './validation/SuperInstanceValidator';

// Export migration adapters
export { CellMigrationAdapter } from './adapters/CellMigrationAdapter';
export type {
  MigrationStrategy,
  MigrationPhase,
  MigrationPlan,
  MigrationResult
} from './adapters/CellMigrationAdapter';

// Export specialized types from instances
export {
  DataFormat,
  DataSchema,
  DataRange,
  DataPosition,
  DataTransformation,
  DataQuery,
  QueryResult,
  DataPredicate,
  AggregationSpec,
  AggregatedData,
  DataValidationResult
} from './instances/DataBlockInstance';

export {
  ProcessSignal,
  StdioConfiguration,
  ResourceUsage,
  StackFrame,
  ProfileData,
  ProfileSample,
  DebuggerSession,
  Breakpoint,
  SignalHandler
} from './instances/ProcessInstance';

export {
  ModelType,
  DatasetReference,
  Hyperparameters,
  AgentCapability,
  TrainingOptions,
  TrainingResult,
  FineTuningOptions,
  FineTuningResult,
  EvaluationMetrics,
  ModelFormat,
  ExportedModel,
  InferenceOptions,
  Prediction,
  GenerationOptions,
  GenerationResult,
  ClassificationResult,
  EmbeddingVector,
  KnowledgeItem,
  RetrievalOptions,
  KnowledgePattern,
  KnowledgeBaseStats,
  AgentFeedback,
  AgentContext,
  MetaLearningTask,
  MetaLearningResult
} from './instances/LearningAgentInstance';

/**
 * SuperInstance Factory - Creates instances based on type
 */
export class SuperInstanceFactory {
  /**
   * Create a SuperInstance based on type
   */
  static createInstance(config: {
    type: InstanceType;
    id: string;
    name: string;
    description: string;
    cellPosition: CellPosition;
    spreadsheetId: string;
    [key: string]: any;
  }): any {
    switch (config.type) {
      case InstanceType.DATA_BLOCK:
        return new ConcreteDataBlockInstance({
          id: config.id,
          name: config.name,
          description: config.description,
          cellPosition: config.cellPosition,
          spreadsheetId: config.spreadsheetId,
          dataFormat: config.dataFormat || 'json',
          data: config.data,
          schema: config.schema,
          encoding: config.encoding,
          configuration: config.configuration
        });

      case InstanceType.PROCESS:
        return new ConcreteProcessInstance({
          id: config.id,
          name: config.name,
          description: config.description,
          cellPosition: config.cellPosition,
          spreadsheetId: config.spreadsheetId,
          command: config.command || 'process',
          arguments: config.arguments || [],
          workingDirectory: config.workingDirectory || '/',
          environment: config.environment || {},
          stdio: config.stdio,
          configuration: config.configuration
        });

      case InstanceType.LEARNING_AGENT:
        return new ConcreteLearningAgentInstance({
          id: config.id,
          name: config.name,
          description: config.description,
          cellPosition: config.cellPosition,
          spreadsheetId: config.spreadsheetId,
          modelType: config.modelType || 'classification',
          modelVersion: config.modelVersion || '1.0.0',
          trainingData: config.trainingData,
          hyperparameters: config.hyperparameters,
          capabilities: config.capabilities,
          configuration: config.configuration
        });

      case InstanceType.VIEWPORT:
        return new ConcreteViewPortInstance({
          id: config.id,
          name: config.name,
          description: config.description,
          cellPosition: config.cellPosition,
          spreadsheetId: config.spreadsheetId,
          viewportConfig: config.viewportConfig,
          dataBindings: config.dataBindings,
          configuration: config.configuration
        });

      case InstanceType.CONNECTOR:
        return new ConcreteConnectorInstance({
          id: config.id,
          name: config.name,
          description: config.description,
          cellPosition: config.cellPosition,
          spreadsheetId: config.spreadsheetId,
          connectorConfig: config.connectorConfig,
          configuration: config.configuration
        });

      case InstanceType.VALIDATOR:
        return new ConcreteValidatorInstance({
          id: config.id,
          name: config.name,
          description: config.description,
          cellPosition: config.cellPosition,
          spreadsheetId: config.spreadsheetId,
          rulebook: config.rulebook,
          configuration: config.configuration
        });

      case InstanceType.TRIGGER:
        return new ConcreteTriggerInstance({
          id: config.id,
          name: config.name,
          description: config.description,
          cellPosition: config.cellPosition,
          spreadsheetId: config.spreadsheetId,
          triggerConfig: config.triggerConfig,
          configuration: config.configuration
        });

      case InstanceType.CACHE:
        return new ConcreteCacheInstance({
          id: config.id,
          name: config.name,
          description: config.description,
          cellPosition: config.cellPosition,
          spreadsheetId: config.spreadsheetId,
          policy: config.policy,
          configuration: config.configuration
        });

      default:
        throw new Error(`Instance type ${config.type} not yet implemented`);
    }
  }

  /**
   * Create instance from serialized snapshot
   */
  static createFromSnapshot(snapshot: any): Promise<any> {
    // This would deserialize and create the appropriate instance
    throw new Error('Not yet implemented');
  }

  /**
   * Get available instance types
   */
  static getAvailableTypes(): InstanceType[] {
    return [
      InstanceType.DATA_BLOCK,
      InstanceType.PROCESS,
      InstanceType.LEARNING_AGENT,
      InstanceType.VIEWPORT,
      InstanceType.CONNECTOR,
      InstanceType.VALIDATOR,
      InstanceType.TRIGGER,
      InstanceType.CACHE,
      InstanceType.FILE,
      InstanceType.DATABASE,
      InstanceType.TERMINAL,
      InstanceType.SMPBOT
    ];
  }

  /**
   * Get type information
   */
  static getTypeInfo(type: InstanceType): {
    name: string;
    description: string;
    capabilities: InstanceCapability[];
    defaultConfiguration: Partial<InstanceConfiguration>;
  } {
    const typeInfo: Record<InstanceType, any> = {
      [InstanceType.DATA_BLOCK]: {
        name: 'Data Block',
        description: 'Structured data storage and processing',
        capabilities: ['read', 'write', 'storage'],
        defaultConfiguration: {
          resources: { cpu: 5, memory: 100, storage: 1000, network: 1 }
        }
      },
      [InstanceType.PROCESS]: {
        name: 'Process',
        description: 'Computational process execution',
        capabilities: ['execute', 'computation', 'communication'],
        defaultConfiguration: {
          resources: { cpu: 20, memory: 500, storage: 100, network: 10 }
        }
      },
      [InstanceType.LEARNING_AGENT]: {
        name: 'Learning Agent',
        description: 'AI/ML model training and inference',
        capabilities: ['learning', 'reasoning', 'generation', 'computation'],
        defaultConfiguration: {
          resources: { cpu: 30, memory: 1000, storage: 5000, network: 100, gpu: 50 }
        }
      },
      [InstanceType.VIEWPORT]: {
        name: 'ViewPort',
        description: 'Data visualization and rendering',
        capabilities: ['read', 'write', 'composition', 'computation'],
        defaultConfiguration: {
          resources: { cpu: 15, memory: 300, storage: 500, network: 20 }
        }
      },
      [InstanceType.CONNECTOR]: {
        name: 'Connector',
        description: 'External system integration',
        capabilities: ['network', 'communication', 'composition'],
        defaultConfiguration: {
          resources: { cpu: 10, memory: 200, storage: 200, network: 100 }
        }
      },
      [InstanceType.VALIDATOR]: {
        name: 'Validator',
        description: 'Data validation and constraint checking',
        capabilities: ['read', 'composition', 'computation'],
        defaultConfiguration: {
          resources: { cpu: 5, memory: 150, storage: 100, network: 1 }
        }
      },
      [InstanceType.TRIGGER]: {
        name: 'Trigger',
        description: 'Event-driven action execution',
        capabilities: ['monitoring', 'composition'],
        defaultConfiguration: {
          resources: { cpu: 2, memory: 50, storage: 50, network: 5 }
        }
      },
      [InstanceType.CACHE]: {
        name: 'Cache',
        description: 'Performance optimization through data caching',
        capabilities: ['read', 'write', 'storage'],
        defaultConfiguration: {
          resources: { cpu: 5, memory: 200, storage: 1000, network: 10 }
        }
      },
      [InstanceType.FILE]: {
        name: 'File',
        description: 'File system operations',
        capabilities: ['read', 'write', 'storage'],
        defaultConfiguration: {
          resources: { cpu: 2, memory: 50, storage: 10000, network: 5 }
        }
      },
      [InstanceType.DATABASE]: {
        name: 'Database',
        description: 'Database operations and queries',
        capabilities: ['read', 'write', 'storage', 'computation'],
        defaultConfiguration: {
          resources: { cpu: 10, memory: 2000, storage: 10000, network: 100 }
        }
      },
      [InstanceType.TERMINAL]: {
        name: 'Terminal',
        description: 'Command line interface',
        capabilities: ['execute', 'communication'],
        defaultConfiguration: {
          resources: { cpu: 10, memory: 200, storage: 100, network: 10 }
        }
      },
      [InstanceType.SMPBOT]: {
        name: 'SMPbot',
        description: 'Seed + Model + Prompt = Stable Output',
        capabilities: ['learning', 'reasoning', 'generation', 'adaptation'],
        defaultConfiguration: {
          resources: { cpu: 40, memory: 2000, storage: 1000, network: 50, gpu: 70 }
        }
      }
    };

    return typeInfo[type] || {
      name: 'Unknown',
      description: 'Unknown instance type',
      capabilities: [],
      defaultConfiguration: {}
    };
  }
}

/**
 * SuperInstance System - Main system class
 */
export class SuperInstanceSystem {
  private instances: Map<string, any> = new Map();
  private validator: SuperInstanceValidator;
  private migrationAdapter: CellMigrationAdapter;

  constructor() {
    this.validator = new SuperInstanceValidator();
    this.migrationAdapter = new CellMigrationAdapter();
  }

  /**
   * Create a new instance
   */
  async createInstance(config: {
    type: InstanceType;
    id: string;
    name: string;
    description: string;
    cellPosition: CellPosition;
    spreadsheetId: string;
    [key: string]: any;
  }): Promise<any> {
    // Validate configuration
    const validation = this.validator.validateConfiguration(config.configuration || {});
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Create instance
    const instance = SuperInstanceFactory.createInstance(config);

    // Initialize instance
    await instance.initialize(config.configuration);

    // Store instance
    this.instances.set(instance.id, instance);

    return instance;
  }

  /**
   * Get instance by ID
   */
  getInstance(id: string): any | undefined {
    return this.instances.get(id);
  }

  /**
   * Get all instances
   */
  getAllInstances(): any[] {
    return Array.from(this.instances.values());
  }

  /**
   * Remove instance
   */
  async removeInstance(id: string): Promise<boolean> {
    const instance = this.instances.get(id);
    if (!instance) return false;

    // Terminate instance
    await instance.terminate();

    // Remove from map
    this.instances.delete(id);

    return true;
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    totalInstances: number;
    byType: Record<InstanceType, number>;
    totalMemory: number;
    totalCPU: number;
    health: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const byType: Record<InstanceType, number> = {};
    let totalMemory = 0;
    let totalCPU = 0;
    let errorCount = 0;

    for (const instance of this.instances.values()) {
      byType[instance.type] = (byType[instance.type] || 0) + 1;
      totalMemory += instance.configuration.resources.memory;
      totalCPU += instance.configuration.resources.cpu;

      if (instance.state === InstanceState.ERROR) {
        errorCount++;
      }
    }

    const health = errorCount > this.instances.size * 0.1 ? 'unhealthy' :
                   errorCount > 0 ? 'degraded' : 'healthy';

    return {
      totalInstances: this.instances.size,
      byType,
      totalMemory,
      totalCPU,
      health
    };
  }

  /**
   * Get validator
   */
  getValidator(): SuperInstanceValidator {
    return this.validator;
  }

  /**
   * Get migration adapter
   */
  getMigrationAdapter(): CellMigrationAdapter {
    return this.migrationAdapter;
  }
}

// Default export
export default SuperInstanceSystem;