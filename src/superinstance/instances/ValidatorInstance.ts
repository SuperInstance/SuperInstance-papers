/**
 * ValidatorInstance - Implementation for data validation instances
 */

import {
  BaseSuperInstance, InstanceType, InstanceState, InstanceCapability,
  CellPosition, InstanceConfiguration, InstancePermissions,
  InstanceMessage, InstanceMessageResponse, InstanceStatus, InstanceMetrics,
  Connection, ConnectionType, InstanceSnapshot, ValidationResult
} from '../types/base';

/**
 * ValidationType - Types of validation
 */
export enum ValidationType {
  FORMAT = 'format',
  SCHEMA = 'schema',
  CONSTRAINT = 'constraint',
  BUSINESS_RULE = 'business_rule',
  REFERENCE = 'reference',
  CUSTOM = 'custom'
}

/**
 * ValidationRule - Individual validation rule
 */
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  type: ValidationType;
  priority: number; // 1-10, higher is more important
  enabled: boolean;
  condition?: string | ((data: any) => boolean);
  validation: (data: any) => ValidationResult;
  tags: string[];
  metadata?: Record<string, any>;
}

/**
 * ValidationRuleSet - Group of validation rules
 */
export interface ValidationRuleSet {
  id: string;
  name: string;
  description: string;
  rules: string[]; // Rule IDs
  logic: 'AND' | 'OR' | 'SEQUENTIAL';
  stopOnFirstFailure: boolean;
  applyTo: string[]; // Data source patterns
}

/**
 * ValidationContext - Context for validation
 */
export interface ValidationContext {
  sourceId: string;
  timestamp: number;
  user?: string;
  previousValue?: any;
  relatedData?: Record<string, any>;
  executionContext: 'realtime' | 'batch' | 'background';
}

/**
 * ValidationReport - Detailed validation report
 */
export interface ValidationReport {
  dataId: string;
  timestamp: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    errors: number;
  };
  results: Array<{
    rule: ValidationRule;
    passed: boolean;
    message: string;
    severity: 'error' | 'warning' | 'info';
    metadata?: any;
  }>;
  validationTime: number;
  confidence: number;
}

/**
 * ValidationRuleTemplate - Template for creating validation rules
 */
export interface ValidationRuleTemplate {
  templateId: string;
  name: string;
  description: string;
  type: ValidationType;
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    default?: any;
    validation?: (value: any) => boolean;
  }>;
  createRule: (params: Record<string, any>) => ValidationRule;
}

/**
 * ValidationRulebook - Collection of validation rules and sets
 */
export interface ValidationRulebook {
  rules: Map<string, ValidationRule>;
  ruleSets: Map<string, ValidationRuleSet>;
  templates: Map<string, ValidationRuleTemplate>;
  metadata: {
    createdBy: string;
    createdAt: number;
    lastModified: number;
    version: string;
    description?: string;
  };
  settings?: {
    autoCorrect: boolean;
    strictMode: boolean;
    performanceThreshold: number; // ms
    maxValidationTime: number; // ms
  };
}

/**
 * ValidatorState - State of the validator instance
 */
export interface ValidatorState {
  totalValidations: number;
  failedValidations: number;
  passedValidations: number;
  averageValidationTime: number;
  rulesExecuted: number;
  cacheHitRate: number;
}

/**
 * ValidatorInstance - Interface for validation instances
 */
export interface ValidatorInstance {
  type: InstanceType.VALIDATOR;
  rulebook: ValidationRulebook;

  // Validation operations
  validate(data: any, context?: ValidationContext): Promise<ValidationReport>;
  validateRule(ruleId: string, data: any, context?: ValidationContext): Promise<ValidationResult>;
  validateRuleSet(ruleSetId: string, data: any, context?: ValidationContext): Promise<ValidationReport>;
  validateAll(data: any, context?: ValidationContext): Promise<ValidationReport>;

  // Rule management
  addRule(rule: ValidationRule): void;
  removeRule(ruleId: string): boolean;
  updateRule(ruleId: string, updates: Partial<ValidationRule>): void;
  getRule(ruleId: string): ValidationRule | undefined;
  getRules(filter?: (rule: ValidationRule) => boolean): ValidationRule[];

  // Rule set management
  createRuleSet(config: ValidationRuleSet): void;
  updateRuleSet(ruleSetId: string, updates: Partial<ValidationRuleSet>): void;
  deleteRuleSet(ruleSetId: string): boolean;
  getRuleSet(ruleSetId: string): ValidationRuleSet | undefined;

  // Template management
  addTemplate(template: ValidationRuleTemplate): void;
  createRuleFromTemplate(templateId: string, id: string, params: Record<string, any>): ValidationRule;

  // Batch operations
  validateBatch(dataItems: any[], context?: ValidationContext): Promise<ValidationReport[]>;
  validateWithAutoCorrect(data: any, context?: ValidationContext): Promise<{
    valid: boolean;
    correctedData?: any;
    report: ValidationReport;
  }>;

  // Performance methods
  getPerformance(): {
    averageTime: number;
    p50Time: number;
    p95Time: number;
    p99Time: number;
  };
  clearCache(): void;

  // Export/Import
  exportRulebook(): string; // JSON
  importRulebook(json: string): void;
}

/**
 * ConcreteValidatorInstance - Implementation of ValidatorInstance
 */
export class ConcreteValidatorInstance extends BaseSuperInstance implements ValidatorInstance {
  type = InstanceType.VALIDATOR;
  rulebook: ValidationRulebook;
  private validationCache: Map<string, ValidationReport > = new Map();
  private performanceMetrics: {
    executionTimes: number[];
    totalValidations: number;
    cacheHits: number;
    cacheMisses: number;
  };
  private validatorState: ValidatorState;
  private customValidators: Map<string, (data: any) => ValidationResult> = new Map();

  constructor(config: {
    id: string;
    name: string;
    description: string;
    cellPosition: CellPosition;
    spreadsheetId: string;
    rulebook?: Partial<ValidationRulebook>;
    configuration?: Partial<InstanceConfiguration>;
  }) {
    super({
      id: config.id,
      type: InstanceType.VALIDATOR,
      name: config.name,
      description: config.description,
      cellPosition: config.cellPosition,
      spreadsheetId: config.spreadsheetId,
      configuration: config.configuration,
      capabilities: ['read', 'composition', 'computation']
    });

    this.rulebook = {
      rules: new Map(),
      ruleSets: new Map(),
      templates: new Map(),
      metadata: {
        createdBy: 'system',
        createdAt: Date.now(),
        lastModified: Date.now(),
        version: '1.0.0',
        description: 'Default validation rulebook'
      },
      settings: {
        autoCorrect: false,
        strictMode: false,
        performanceThreshold: 1000, // 1 second
        maxValidationTime: 5000 // 5 seconds
      },
      ...config.rulebook
    };

    this.performanceMetrics = {
      executionTimes: [],
      totalValidations: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    this.validatorState = {
      totalValidations: 0,
      failedValidations: 0,
      passedValidations: 0,
      averageValidationTime: 0,
      rulesExecuted: 0,
      cacheHitRate: 0
    };

    // Register built-in templates
    this.registerBuiltinTemplates();

    // Add default rules based on authorizing configuration
    this.addDefaultRules();
  }

  async initialize(config?: Partial<InstanceConfiguration>): Promise<void> {
    if (config) {
      this.configuration = { ...this.configuration, ...config };
    }

    // Initialize rate-based state for validation metrics
    this.rateState = {
      currentValue: {
        validationRate: 0,
        successRate: 1.0,
        avgValidationTime: 0,
        activeRuleCount: this.rulebook.rules.size
      },
      rateOfChange: {
        value: 0,
        acceleration: 0,
        timestamp: Date.now(),
        confidence: 1.0
      },
      lastUpdate: Date.now(),
      predictState: (atTime: number) => {
        if (!this.rateState) return { activeRuleCount: this.rulebook.rules.size };

        const dt = (atTime - this.rateState.lastUpdate) / 1000;
        if (dt <= 0) return this.rateState.currentValue;

        const predictedValidationRate = this.rateState.currentValue.validationRate;
        return {
          validationRate: predictedValidationRate,
          successRate: this.rateState.currentValue.successRate,
          avgValidationTime: this.rateState.currentValue.avgValidationTime,
          activeRuleCount: this.rulebook.rules.size
        };
      }
    };
  }

  async activate(): Promise<void> {
    if (this.state !== InstanceState.INITIALIZED && this.state !== InstanceState.IDLE) {
      throw new Error(`Cannot activate from state: ${this.state}`);
    }

    this.validateRulebook().catch(console.error);
    this.updateState(InstanceState.RUNNING);
  }

  async deactivate(): Promise<void> {
    // Clear cache before deactivation
    this.clearCache();
    this.updateState(InstanceState.IDLE);
  }

  async terminate(): Promise<void> {
    await this.deactivate();

    // Clear all data
    this.rulebook.rules.clear();
    this.rulebook.ruleSets.clear();
    this.rulebook.templates.clear();
    this.validationCache.clear();
    this.customValidators.clear();
    this.performanceMetrics = {
      executionTimes: [],
      totalValidations: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    this.updateState(InstanceState.TERMINATED);
  }

  // Core validation methods
  async validate(data: any, context?: ValidationContext): Promise<ValidationReport> {
    return this.validateAll(data, context);
  }

  async validateRule(ruleId: string, data: any, context?: ValidationContext): Promise<ValidationReport> {
    const rule = this.rulebook.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    const startTime = performance.now();
    const result = await this.executeRule(rule, data, context);
    const executionTime = performance.now() - startTime;

    const report: ValidationReport = {
      dataId: context?.sourceId || 'unknown',
      timestamp: Date.now(),
      summary: {
        total: 1,
        passed: result.valid ? 1 : 0,
        failed: result.valid ? 0 : 1,
        warnings: 0,
        errors: 0
      },
      results: [{
        rule,
        passed: result.valid,
        message: result.errors?.[0]?.message || 'Validation passed',
        severity: result.valid ? 'info' : (result.errors?.[0]?.severity || 'error'),
        metadata: result.errors?.[0]
      }],
      validationTime: executionTime,
      confidence: result.valid ? 1.0 : 0.0
    };

    const validationData = JSON.stringify({ data, ruleId, context });
    this.validationCache.set(this.hashData(validationData), report);

    return report;
  }

  async validateRuleSet(ruleSetId: string, data: any, context?: ValidationContext): Promise<ValidationReport> {
    const ruleSet = this.rulebook.ruleSets.get(ruleSetId);
    if (!ruleSet) {
      throw new Error(`Rule set ${ruleSetId} not found`);
    }

    const startTime = performance.now();
    const results: any[] = [];
    let passed = 0;
    let failed = 0;
    let warnings = 0;
    let errors = 0;

    // Apply rules according to logic
    if (ruleSet.logic === 'AND') {
      for (const ruleId of ruleSet.rules) {
        const rule = this.rulebook.rules.get(ruleId);
        if (!rule || !rule.enabled) continue;

        const result = await this.executeRule(rule, data, context);
        results.push({
          rule,
          passed: result.valid,
          message: result.errors?.[0]?.message || 'Validation passed',
          severity: result.valid ? 'info' : (result.errors?.[0]?.severity || 'error'),
          metadata: result.errors?.[0]
        });

        if (!result.valid) {
          failed++;
          errors++;
          if (ruleSet.stopOnFirstFailure) break;
        } else {
          passed++;
        }
      }
    } else if (ruleSet.logic === 'OR') {
      let anyPassed = false;
      for (const ruleId of ruleSet.rules) {
        const rule = this.rulebook.rules.get(ruleId);
        if (!rule || !rule.enabled) continue;

        const result = await this.executeRule(rule, data, context);
        results.push({
          rule,
          passed: result.valid,
          message: result.errors?.[0]?.message || 'Validation passed',
          severity: result.valid ? 'info' : (result.errors?.[0]?.severity || 'error'),
          metadata: result.errors?.[0]
        });

        if (result.valid) {
          anyPassed = true;
          passed++;
        } else {
          failed++;
          if (!result.valid) {
            this.calculateSeverity(result) === 'warning' ? warnings++ : errors++;
          }
        }

        if (anyPassed && ruleSet.stopOnFirstFailure) break;
      }

      // If using OR logic and at least one passed, overall is success
      if (anyPassed) {
        passed = ruleSet.rules.length;
        failed = 0;
      }
    }

    const executionTime = performance.now() - startTime;

    const report: ValidationReport = {
      dataId: context?.sourceId || 'unknown',
      timestamp: Date.now(),
      summary: {
        total: results.length,
        passed,
        failed,
        warnings,
        errors
      },
      results,
      validationTime: executionTime,
      confidence: failed === 0 ? 1.0 : (passed / results.length)
    };

    return report;
  }

  async validateAll(data: any, context?: ValidationContext): Promise<ValidationReport> {
    const applicableRules = this.getApplicableRules(context);
    const startTime = performance.now();

    // Check cache first
    const cacheKey = this.hashData(JSON.stringify({ data, applicableRules: applicableRules.map(r => r.id), context }));
    const cached = this.validationCache.get(cacheKey);
    if (cached) {
      this.performanceMetrics.cacheHits++;
      return cached;
    }

    this.performanceMetrics.cacheMisses++;

    // Execute all applicable rules
    const results: any[] = [];
    let passed = 0;
    let failed = 0;
    let warnings = 0;
    let errors = 0;
    let totalRulesExecuted = 0;

    for (const rule of applicableRules) {
      if (!rule.enabled) continue;

      const ruleStartTime = performance.now();
      const result = await this.executeRule(rule, data, context);
      const ruleExecutionTime = performance.now() - ruleStartTime;

      results.push({
        rule,
        passed: result.valid,
        message: this.formatValidationMessage(result),
        severity: this.calculateSeverity(result),
        metadata: {
          executionTime: ruleExecutionTime,
          errorCount: result.errors?.length || 0,
          warningCount: result.warnings?.length || 0
        }
      });

      totalRulesExecuted++;

      if (result.valid) {
        passed++;
      } else {
        failed++;
        results[i].errorCount++;
        if (this.calculateSeverity(result) === 'warning') {
          warnings++;
        } else {
          errors++;
        }
      }
    }

    const executionTime = performance.now() - startTime;

    // Update performance metrics
    this.updatePerformanceMetrics(executionTime);

    // Update validator state
    this.validatorState.totalValidations++;
    this.validatorState.passedValidations += passed;
    this.validatorState.failedValidations += failed;
    this.validatorState.rulesExecuted += totalRulesExecuted;
    this.validatorState.cacheHitRate = this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses);

    const report: ValidationReport = {
      dataId: context?.sourceId || 'unknown',
      timestamp: Date.now(),
      summary: {
        total: results.length,
        passed,
        failed,
        warnings,
        errors
      },
      results,
      validationTime: executionTime,
      confidence: totalRulesExecuted === 0 ? 0 : (passed / totalRulesExecuted)
    };

    // Cache the result
    if (!this.rulebook.settings?.strictMode) {
      this.validationCache.set(cacheKey, report);
    }

    // Update rate-based state
    this.updateRateState({
      validationRate: this.validatorState.totalValidations / (Date.now() - this.createdAt) * 1000, // per second
      successRate: this.validatorState.passedValidations / Math.max(this.validatorState.totalValidations, 1),
      avgValidationTime: executionTime,
      activeRuleCount: this.rulebook.rules.size
    });

    return report;
  }

  // Rule management
  addRule(rule: ValidationRule): void {
    // Validate rule
    if (!rule.id || !rule.name) {
      throw new Error('Rule must have id and name');
    }

    if (typeof rule.validation !== 'function' && !rule.condition) {
      throw new Error('Rule must have validation function or condition');
    }

    this.rulebook.rules.set(rule.id, rule);
    this.rulebook.metadata.lastModified = Date.now();

    // Clear cache as rules have changed
    this.clearCache();
  }

  removeRule(ruleId: string): boolean {
    const removed = this.rulebook.rules.delete(ruleId);
    if (removed) {
      this.rulebook.metadata.lastModified = Date.now();

      // Remove rule from any rule sets
      for (const ruleSet of this.rulebook.ruleSets.values()) {
        ruleSet.rules = ruleSet.rules.filter(id => id !== ruleId);
      }

      this.clearCache();
    }
    return removed;
  }

  updateRule(ruleId: string, updates: Partial<ValidationRule>): void {
    const rule = this.rulebook.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    this.rulebook.rules.set(ruleId, { ...rule, ...updates });
    this.rulebook.metadata.lastModified = Date.now();
    this.clearCache();
  }

  getRule(ruleId: string): ValidationRule | undefined {
    return this.rulebook.rules.get(ruleId);
  }

  getRules(filter?: (rule: ValidationRule) => boolean): ValidationRule[] {
    const rules = Array.from(this.rulebook.rules.values());
    return filter ? rules.filter(filter) : rules;
  }

  // Rule set management
  createRuleSet(config: ValidationRuleSet): void {
    // Validate rule set
    for (const ruleId of config.rules) {
      if (!this.rulebook.rules.has(ruleId)) {
        throw new Error(`Rule ${ruleId} not found in rule set`);
      }
    }

    this.rulebook.ruleSets.set(config.id, config);
    this.rulebook.metadata.lastModified = Date.now();
  }

  updateRuleSet(ruleSetId: string, updates: Partial<ValidationRuleSet>): void {
    const ruleSet = this.rulebook.ruleSets.get(ruleSetId);
    if (!ruleSet) {
      throw new Error(`Rule set ${ruleSetId} not found`);
    }

    this.rulebook.ruleSets.set(ruleSetId, { ...ruleSet, ...updates });
    this.rulebook.metadata.lastModified = Date.now();
  }

  deleteRuleSet(ruleSetId: string): boolean {
    const removed = this.rulebook.ruleSets.delete(ruleSetId);
    if (removed) {
      this.rulebook.metadata.lastModified = Date.now();
    }
    return removed;
  }

  getRuleSet(ruleSetId: string): ValidationRuleSet | undefined {
    return this.rulebook.ruleSets.get(ruleSetId);
  }

  // Template management
  addTemplate(template: ValidationRuleTemplate): void {
    this.rulebook.templates.set(template.templateId, template);
    this.rulebook.metadata.lastModified = Date.now();
  }

  createRuleFromTemplate(templateId: string, id: string, params: Record<string, any>): ValidationRule {
    const template = this.rulebook.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Validate parameters
    for (const param of template.parameters) {
      if (param.required && params[param.name] === undefined) {
        throw new Error(`Parameter ${param.name} is required`);
      }
      if (param.validation && params[param.name] !== undefined) {
        if (!param.validation(params[param.name])) {
          throw new Error(`Parameter ${param.name} failed validation`);
        }
      }
    }

    const rule = template.createRule(params);
    rule.id = id;
    this.addRule(rule);

    return rule;
  }

  // Batch operations
  async validateBatch(dataItems: any[], context?: ValidationContext): Promise<ValidationReport[]> {
    const promises = dataItems.map((data, index) => {
      const itemContext = {
        ...context,
        sourceId: context?.sourceId ? `${context.sourceId}[${index}]` : `batch[${index}]`
      };
      return this.validate(data, itemContext);
    });

    return Promise.all(promises);
  }

  async validateWithAutoCorrect(data: any, context?: ValidationContext): Promise<{
    valid: boolean;
    correctedData?: any;
    report: ValidationReport;
  }> {
    const report = await this.validate(data, context);

    if (report.summary.failed === 0) {
      return { valid: true, report };
    }

    // Find rules that support auto-correction
    const correctableRules = report.results
      .filter(r => !r.passed)
      .map(r => r.rule)
      .filter(rule => rule.metadata?.autoCorrectable);

    if (correctableRules.length === 0) {
      return { valid: false, report };
    }

    let correctedData = JSON.parse(JSON.stringify(data)); // Deep clone
    let corrected = 0;

    // Apply corrections
    for (const rule of correctableRules) {
      const correction = rule.metadata.correct(correctedData);
      if (correction.applied) {
        correctedData = correction.data;
        corrected++;
      }
    }

    // Re-validate corrected data
    if (corrected > 0) {
      const newReport = await this.validate(correctedData, context);
      return {
        valid: newReport.summary.failed === 0,
        correctedData,
        report: newReport
      };
    }

    return { valid: false, report };
  }

  // Performance methods
  getPerformance(): {
    averageTime: number;
    p50Time: number;
    p95Time: number;
    p99Time: number;
  } {
    const times = this.performanceMetrics.executionTimes;
    if (times.length === 0) {
      return {
        averageTime: 0,
        p50Time: 0,
        p95Time: 0,
        p99Time: 0
      };
    }

    const sortedTimes = [...times].sort((a, b) => a - b);
    const calculatePercentile = (p: number) => {
      const index = Math.ceil((p / 100) * sortedTimes.length) - 1;
      return sortedTimes[Math.max(0, index)];
    };

    return {
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      p50Time: calculatePercentile(50),
      p95Time: calculatePercentile(95),
      p99Time: calculatePercentile(99)
    };
  }

  clearCache(): void {
    this.validationCache.clear();
    this.performanceMetrics.cacheHitRate = 0;
    this.validatorState.cacheHitRate = 0;
  }

  // Export/Import
  exportRulebook(): string {
    const exportData = {
      rules: Array.from(this.rulebook.rules.values()),
      ruleSets: Array.from(this.rulebook.ruleSets.values()),
      templates: Array.from(this.rulebook.templates.values()),
      metadata: this.rulebook.metadata,
      settings: this.rulebook.settings,
      exportTimestamp: Date.now()
    };

    return JSON.stringify(exportData, null, 2);
  }

  importRulebook(json: string): void {
    const data = JSON.parse(json);

    // Clear existing rules
    this.rulebook.rules.clear();
    this.rulebook.ruleSets.clear();
    this.rulebook.templates.clear();

    // Import rules
    data.rules.forEach((ruleData: any) => {
      const rule: ValidationRule = {
        ...ruleData,
        validation: this.restoreValidatorFunction(ruleData.validation)
      };
      this.rulebook.rules.set(rule.id, rule);
    });

    // Import rule sets
    data.ruleSets.forEach((ruleSetData: any) => {
      const ruleSet: ValidationRuleSet = ruleSetData;
      this.rulebook.ruleSets.set(ruleSet.id, ruleSet);
    });

    // Import templates
    data.templates.forEach((templateData: any) => {
      const template: ValidationRuleTemplate = {
        ...templateData,
        createRule: this.restoreTemplateFunction(templateData.createRule)
      };
      this.rulebook.templates.set(template.templateId, template);
    });

    this.rulebook.metadata = data.metadata;
    if (data.settings) {
      this.rulebook.settings = { ...this.rulebook.settings, ...data.settings };
    }

    this.clearCache();
  }

  // Relationship methods
  async getStatus(): Promise<InstanceStatus> {
    return {
      state: this.state,
      health: this.calculateHealth(),
      uptime: Date.now() - this.createdAt,
      warnings: this.getWarnings(),
      lastError: undefined
    };
  }

  async getMetrics(): Promise<InstanceMetrics> {
    const performance = this.getPerformance();
    return {
      cpuUsage: this.validatorState.averageValidationTime / 1000 * 100, // Rough estimate
      memoryUsage: 0.1 * (this.rulebook.rules.size + this.rulebook.ruleSets.size + this.validationCache.size),
      diskUsage: 0,
      networkIn: 0,
      networkOut: 0,
      requestCount: this.validatorState.totalValidations,
      errorRate: this.validatorState.failedValidations / Math.max(this.validatorState.totalValidations, 1),
      latency: {
        p50: performance.p50Time,
        p90: performance.p95Time,
        p95: performance.p95Time,
        p99: performance.p99Time,
        max: performance.p95Time * 2 // Estimate
      }
    };
  }

  async getChildren(): Promise<SuperInstance[]> {
    return [];
  }

  async getParents(): Promise<SuperInstance[]> {
    return [];
  }

  async getNeighbors(): Promise<SuperInstance[]> {
    return [];
  }

  async connectTo(target: SuperInstance, connectionType: ConnectionType): Promise<Connection> {
    const connection: Connection = {
      id: `${this.id}-${target.id}-${Date.now()}`,
      source: this.id,
      target: target.id,
      type: connectionType,
      bandwidth: 10000,
      latency: Math.random() * 10 + 5,
      reliability: 0.99,
      establishedAt: Date.now()
    };

    return connection;
  }

  async disconnectFrom(target: SuperInstance): Promise<void> {
    // No special cleanup needed for validator
  }

  // Serialization methods
  async serialize(): Promise<InstanceSnapshot> {
    return {
      id: this.id,
      type: this.type,
      state: this.state,
      data: {
        rulebook: this.exportRulebook(),
        validatorState: this.validatorState,
        performanceMetrics: this.performanceMetrics,
        customValidators: Array.from(this.customValidators.keys())
      },
      configuration: this.configuration,
      timestamp: Date.now(),
      version: '1.0.0',
      rateState: this.rateState,
      originReference: this.originReference
    };
  }

  async deserialize(snapshot: InstanceSnapshot): Promise<void> {
    if (snapshot.type !== InstanceType.VALIDATOR) {
      throw new Error(`Cannot deserialize snapshot of type ${snapshot.type} into Validator`);
    }

    const data = snapshot.data;
    this.importRulebook(data.rulebook);
    this.validatorState = data.validatorState;
    this.performanceMetrics = data.performanceMetrics;

    // Restore custom validators if needed
    data.customValidators.forEach(validatorName => {
      // Custom validators would need to be re-registered
    });

    this.rateState = data.rateState;
    this.originReference = data.originReference;

    this.updateState(snapshot.state);
  }

  async sendMessage(message: InstanceMessage): Promise<InstanceMessageResponse> {
    try {
      await this.receiveMessage(message);
      return {
        messageId: message.id,
        status: 'success',
        payload: {
          ruleCount: this.rulebook.rules.size,
          activeRules: this.getRules(r => r.enabled).length,
          lastValidation: this.getLastValidationTime()
        }
      };
    } catch (error) {
      return {
        messageId: message.id,
        status: 'error',
        error: {
          code: 'VALIDATOR_MESSAGE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true,
          context: { ruleCount: this.rulebook.rules.size }
        }
      };
    }
  }

  async receiveMessage(message: InstanceMessage): Promise<void> {
    if (message.type === 'data' && message.payload) {
      // Attempt to validate incoming data
      try {
        const validation = await this.validate(message.payload.data, {
          sourceId: message.sender,
          timestamp: message.timestamp,
          executionContext: 'realtime'
        });

        // Publish validation result
        console.log(`Validation result for ${message.sender}: ${validation.summary.passed}/${validation.summary.total} passed`);
      } catch (error) {
        console.error('Validation failed:', error);
      }
    }
  }

  // Private helper methods
  private async executeRule(rule: ValidationRule, data: any, context?: ValidationContext): Promise<ValidationResult> {
    try {
      // Check timeout
      const startTime = performance.now();
      const timeout = this.rulebook.settings?.maxValidationTime || 5000;

      const result = await Promise.race([
        rule.validation(data),
        new Promise<ValidationResult>((_, reject) =>
          setTimeout(() => reject(new Error(`Validation timeout after ${timeout}ms`)), timeout)
        )
      ]);

      const executionTime = performance.now() - startTime;

      // Check performance threshold
      const threshold = this.rulebook.settings?.performanceThreshold || 1000;
      if (executionTime > threshold) {
        console.warn(`Rule ${rule.id} took ${executionTime}ms to execute (threshold: ${threshold}ms)`);
      }

      // Update confidence based on rule execution
      this.updateConfidence(1.0 - (executionTime / threshold) * 0.1);

      return result;
    } catch (error) {
      return {
        valid: false,
        errors: [{
          code: 'VALIDATION_EXECUTION_ERROR',
          message: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          path: [rule.id],
          severity: 'error',
          details: { executionError: true }
        }],
        warnings: [],
        suggestions: []
      };
    }
  }

  private getApplicableRules(context?: ValidationContext): ValidationRule[] {
    let applicable = Array.from(this.rulebook.rules.values()).filter(rule => rule.enabled);

    if (context?.sourceId) {
      // Filter by source application patterns
      applicable = applicable.filter(rule => {
        return !rule.tags || rule.tags.length === 0 || rule.tags.some(tag => matchWildcard(context.sourceId!, tag));
      });
    }

    // Sort by priority (higher first)
    applicable.sort((a, b) => (b.priority || 5) - (a.priority || 5));

    return applicable;
  }

  private formatValidationMessage(result: ValidationResult): string {
    if (result.valid) return 'Validation passed';
    if (result.errors?.[0]) return result.errors[0].message;
    if (result.warnings?.[0]) return result.warnings[0].message;
    return 'Unknown validation failure';
  }

  private calculateSeverity(result: ValidationResult): 'error' | 'warning' | 'info' {
    if (result.valid) return 'info';
    if (result.errors?.some(e => e.severity === 'error')) return 'error';
    if (result.warnings?.length > 0) return 'warning';
    return 'error'; // Default for invalid results
  }

  private hashData(data: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private updatePerformanceMetrics(executionTime: number): void {
    this.performanceMetrics.executionTimes.push(executionTime);
    this.performanceMetrics.totalValidations++;

    // Keep only last 1000 execution times
    if (this.performanceMetrics.executionTimes.length > 1000) {
      this.performanceMetrics.executionTimes = this.performanceMetrics.executionTimes.slice(-1000);
    }

    // Update validator state
    this.validatorState.averageValidationTime = this.performanceMetrics.executionTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.executionTimes.length;
  }

  private registerBuiltinTemplates(): void {
    // Email validation template
    this.addTemplate({
      templateId: 'email',
      name: 'Email Validation',
      description: 'Validates email addresses',
      type: ValidationType.FORMAT,
      parameters: [
        { name: 'id', type: 'string', required: true },
        { name: 'name', type: 'string', required: true },
        { name: 'required', type: 'boolean', required: false, default: false }
      ],
      createRule: (params) => ({
        id: params.id,
        name: params.name,
        description: 'Validates email format',
        type: ValidationType.FORMAT,
        priority: 5,
        enabled: true,
        tags: ['format', 'email'],
        validation: (data) => {
          if (!data && !params.required) {
            return { valid: true, errors: [], warnings: [], suggestions: [] };
          }

          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(data))) {
            return {
              valid: false,
              errors: [{
                code: 'INVALID_EMAIL',
                message: 'Invalid email format',
                path: [],
                severity: 'error',
                details: { format: 'email' }
              }],
              warnings: [],
              suggestions: []
            };
          }

          return { valid: true, errors: [], warnings: [], suggestions: [] };
        }
      })
    });

    // Number range template
    this.addTemplate({
      templateId: 'number_range',
      name: 'Number Range Validation',
      description: 'Validates numbers within a range',
      type: ValidationType.CONSTRAINT,
      parameters: [
        { name: 'id', type: 'string', required: true },
        { name: 'name', type: 'string', required: true },
        { name: 'min', type: 'number', required: false },
        { name: 'max', type: 'number', required: false },
        { name: 'inclusive', type: 'boolean', required: false, default: true }
      ],
      createRule: (params) => ({
        id: params.id,
        name: params.name,
        description: `Validates numbers ${params.inclusive ? 'between' : 'from'} ${params.min ?? '-∞'} and ${params.max ?? '∞'}`,
        type: ValidationType.CONSTRAINT,
        priority: 5,
        enabled: true,
        tags: ['constraint', 'number', 'range'],
        metadata: {
          min: params.min,
          max: params.max,
          inclusive: params.inclusive,
          autoCorrectable: true,
          correct: (data: any) => {
            if (typeof data !== 'number') return { applied: false, data };
            const min = params.min ?? data;
            const max = params.max ?? data;
            if (data < min) data = params.inclusive ? min : (params.max ?? max);
            if (data > max) data = params.inclusive ? max : (params.min ?? min);
            return { applied: true, data };
          }
        },
        validation: (data) => {
          if (typeof data !== 'number') {
            return {
              valid: false,
              errors: [{
                code: 'NOT_A_NUMBER',
                message: 'Value must be a number',
                path: [],
                severity: 'error',
                details: { expected: 'number', received: typeof data }
              }],
              warnings: [],
              suggestions: []
            };
          }

          const isMinValid = params.min === undefined || data >= (params.inclusive ? params.min : params.min + Number.EPSILON);
          const isMaxValid = params.max === undefined || data <= (params.inclusive ? params.max : params.max - Number.EPSILON);

          if (!isMinValid || !isMaxValid) {
            const messages = [];
            if (!isMinValid) messages.push(`Must be ${params.inclusive ? '>=' : '>'} ${params.min}`);
            if (!isMaxValid) messages.push(`Must be ${params.inclusive ? '<=' : '<'} ${params.max}`);

            return {
              valid: false,
              errors: [{
                code: 'OUT_OF_RANGE',
                message: messages.join(', '),
                path: [],
                severity: 'error',
                details: {
                  value: data,
                  min: params.min,
                  max: params.max,
                  inclusive: params.inclusive
                }
              }],
              warnings: [],
              suggestions: []
            };
          }

          return { valid: true, errors: [], warnings: [], suggestions: [] };
        }
      })
    });
  }

  private addDefaultRules(): void {
    // Add some common validation rules
    this.createRuleFromTemplate('email', 'email-default', {
      id: 'email-default',
      name: 'Default Email Validation'
    });

    this.createRuleFromTemplate('number_range', 'number-0-100', {
      id: 'number-0-100',
      name: 'Number 0-100 Range',
      min: 0,
      max: 100
    });
  }

  private validateRulebook(): Promise<void> {
    // Validate all rules in the rulebook
    return new Promise((resolve) => {
      for (const [ruleId, rule] of this.rulebook.rules) {
        if (!rule.validation || typeof rule.validation !== 'function') {
          console.warn(`Rule ${ruleId} has invalid validation function`);
        }
      }
      resolve();
    });
  }

  private calculateHealth(): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
    const errorRate = this.validatorState.failedValidations / Math.max(this.validatorState.totalValidations, 1);
    const avgTime = this.getPerformance().averageTime;
    const threshold = this.rulebook.settings?.performanceThreshold || 1000;

    if (errorRate > 0.5) return 'unhealthy';
    if (this.state === InstanceState.ERROR) return 'unhealthy';
    if (avgTime > threshold) return 'degraded';
    if (this.rulebook.rules.size === 0) return 'degraded';

    return this.state === InstanceState.RUNNING ? 'healthy' : 'unknown';
  }

  private getWarnings(): string[] {
    const warnings: string[] = [];

    const avgTime = this.getPerformance().averageTime;
    const threshold = this.rulebook.settings?.performanceThreshold || 1000;
    if (avgTime > threshold) {
      warnings.push(`Average validation time (${avgTime}ms) exceeds threshold (${threshold}ms)`);
    }

    if (this.rulebook.rules.size === 0) {
      warnings.push('No validation rules defined');
    }

    const cacheHitRate = this.validatorState.cacheHitRate;
    if (cacheHitRate < 0.5) {
      warnings.push(`Low cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`);
    }

    return warnings;
  }

  private getLastValidationTime(): number {
    const recentValidations = this.performanceMetrics.executionTimes;
    if (recentValidations.length === 0) return 0;
    return recentValidations[recentValidations.length - 1];
  }

  private matchWildcard(text: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(text);
  }

  private restoreValidatorFunction(funcString: string) {
    // In a real implementation, this would need to safely restore functions
    // For now, we'll return a placeholder
    return () => ({
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    });
  }

  private restoreTemplateFunction(funcString: string) {
    // In a real implementation, this would need to safely restore template functions
    return (params: Record<string, any>) => ({
      id: 'restored',
      name: params.name || 'Restored Rule',
      description: 'Restored from template',
      type: ValidationType.CUSTOM,
      priority: 5,
      enabled: true,
      validation: () => ({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: []
      }),
      tags: ['restored']
    });
  }
}