/**
 * TriggerInstance - Implementation for event-driven trigger instances
 */

import {
  BaseSuperInstance, InstanceType, InstanceState, InstanceCapability,
  CellPosition, InstanceConfiguration, InstancePermissions,
  InstanceMessage, InstanceMessageResponse, InstanceStatus, InstanceMetrics,
  Connection, ConnectionType, InstanceSnapshot, RateBasedState
} from '../types/base';

/**
 * TriggerType - Types of triggers
 */
export enum TriggerType {
  SCHEDULE = 'schedule',
  EVENT = 'event',
  CONDITION = 'condition',
  WEBHOOK = 'webhook',
  MESSAGE = 'message',
  STATE_CHANGE = 'state_change',
  THRESHOLD = 'threshold',
  DATA_CHANGE = 'data_change'
}

/**
 * TriggerCondition - Conditions for trigger activation
 */
export interface TriggerCondition {
  type: 'data_value' | 'rate_change' | 'confidence' | 'time_window' | 'composite' | 'custom';
  field?: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'regex' | 'exists' | 'not_exists';
  value?: any;
  threshold?: number;
  window?: number; // milliseconds
  customCode?: string;
}

/**
 * TriggerAction - Action to perform when triggered
 */
export interface TriggerAction {
  type: 'javascript' | 'webhook' | 'message' | 'state_change' | 'callback' | 'composite';
  targetId?: string;
  endpoint?: string;
  payload?: any;
  script?: string;
  timeout?: number;
  retries?: number;
  fallbackAction?: TriggerAction;
}

/**
 * TriggerSchedule - Scheduling configuration
 */
export interface TriggerSchedule {
  type: 'cron' | 'interval' | 'onel';
  expression?: string;
  interval?: number; // milliseconds
  startTime?: number;
  endTime?: number;
  timezone?: string;
  jitter?: number; // milliseconds
}

/**
 * TriggerConfiguration - Configuration for trigger instances
 */
export interface TriggerConfiguration {
  triggerType: TriggerType;
  enabled: boolean;
  autoDisable?: boolean;
  maxExecutions?: number;
  cooldownPeriod?: number; // milliseconds
  debounceDelay?: number; // milliseconds
  conditions: TriggerCondition[];
  actions: TriggerAction[];
  schedule?: TriggerSchedule;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * TriggerExecution - Execution record
 */
export interface TriggerExecution {
  id: string;
  triggerId: string;
  timestamp: number;
  triggeredBy: any;
  success: boolean;
  error?: string;
  executionTime: number;
  result?: any;
  retryCount: number;
}

/**
 * TriggerStateChange - State change record
 */
export interface TriggerStateChange {
  oldState: InstanceState;
  newState: InstanceState;
  reason?: string;
  timestamp: number;
}

/**
 * TriggerInstance - Interface for trigger instances
 */
export interface TriggerInstance {
  type: InstanceType.TRIGGER;
  configuration: TriggerConfiguration;

  // Lifecycle
  arm(): Promise<void>;
  disarm(): Promise<void>;
  reset(): Promise<void>;

  // Trigger management
  addCondition(condition: TriggerCondition): void;
  removeCondition(index: number): void;
  updateCondition(index: number, condition: TriggerCondition): void;
  addAction(action: TriggerAction): void;
  removeAction(index: number): void;

  // Execution
  trigger(triggerData?: any): Promise<void>;
  forceTrigger(triggerData?: any): Promise<void>;

  // Monitoring
  getExecutions(limit?: number): TriggerExecution[];
  getExecutionHistory(timeWindow?: number): TriggerExecution[];
  getLastExecution(): TriggerExecution | undefined;
  getStatistics(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    recentConsecutiveErrors: number;
    reliability: number;
  };

  // Configuration
  updateConfiguration(config: Partial<TriggerConfiguration>): Promise<void>;
  testConditions(data: any): boolean;
}

/**
 * ConcreteTriggerInstance - Implementation of TriggerInstance
 */
export class ConcreteTriggerInstance extends BaseSuperInstance implements TriggerInstance {
  type = InstanceType.TRIGGER;
  configuration: TriggerConfiguration;

  private executions: TriggerExecution[] = [];
  private armed: boolean = false;
  private executionCount: number = 0;
  private lastExecutionTime: number = 0;
  private lastTriggerData: any = null;
  private consecutiveErrors: number = 0;
  private isExecuting = false;
  private scheduleTimer?: NodeJS.Timeout;
  private debounceTimer?: NodeJS.Timeout;
  private conditionsBuffer: any[] = [];
  private conditionCheckInterval?: NodeJS.Timeout;
  private stateChanges: TriggerStateChange[] = [];

  constructor(config: {
    id: string;
    name: string;
    description: string;
    cellPosition: CellPosition;
    spreadsheetId: string;
    triggerConfig: TriggerConfiguration;
    configuration?: Partial<InstanceConfiguration>;
  }) {
    super({
      id: config.id,
      type: InstanceType.TRIGGER,
      name: config.name,
      description: config.description,
      cellPosition: config.cellPosition,
      spreadsheetId: config.spreadsheetId,
      configuration: config.configuration,
      capabilities: ['monitoring', 'composition']
    });

    this.configuration = {
      ...config.triggerConfig,
      cooldownPeriod: config.triggerConfig.cooldownPeriod || 1000,
      debounceDelay: config.triggerConfig.debounceDelay || 500
    };
  }

  async initialize(config?: Partial<InstanceConfiguration>): Promise<void> {
    if (config) {
      this.configuration = { ...this.configuration, ...config };
    }

    // Initialize rate-based state for trigger metrics
    this.rateState = {
      currentValue: {
        triggerRate: 0,
        successRate: 1.0,
        avgExecutionTime: 0,
        armed: false
      },
      rateOfChange: {
        value: 0,
        acceleration: 0,
        timestamp: Date.now(),
        confidence: 1.0
      },
      lastUpdate: Date.now(),
      predictState: (atTime: number) => {
        if (!this.rateState) return { armed: this.armed };

        const dt = (atTime - this.rateState.lastUpdate) / 1000;
        if (dt <= 0) return this.rateState.currentValue;

        const predictedTriggerRate = this.rateState.currentValue.triggerRate;
        return {
          triggerRate: predictedTriggerRate,
          successRate: this.rateState.currentValue.successRate,
          avgExecutionTime: this.rateState.currentValue.avgExecutionTime,
          armed: this.armed
        };
      }
    };
  }

  async activate(): Promise<void> {
    if (this.state !== InstanceState.INITIALIZED && this.state !== InstanceState.IDLE) {
      throw new Error(`Cannot activate from state: ${this.state}`);
    }

    // Arm the trigger if enabled
    if (this.configuration.enabled) {
      await this.arm();
    }

    this.updateState(InstanceState.RUNNING);
  }

  async deactivate(): Promise<void> {
    // Disarm the trigger
    await this.disarm();
    this.updateState(InstanceState.IDLE);
  }

  async terminate(): Promise<void> {
    await this.deactivate();

    // Clear all execution records
    this.executions = [];
    this.conditionsBuffer = [];

    // Stop any timers
    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.conditionCheckInterval) {
      clearInterval(this.conditionCheckInterval);
    }

    this.updateState(InstanceState.TERMINATED);
  }

  async serialize(): Promise<InstanceSnapshot> {
    return {
      id: this.id,
      type: this.type,
      state: this.state,
      data: {
        configuration: this.configuration,
        armed: this.armed,
        executionCount: this.executionCount,
        lastExecutionTime: this.lastExecutionTime,
        lastTriggerData: this.lastTriggerData,
        consecutiveErrors: this.consecutiveErrors,
        executions: this.executions.slice(-100), // Last 100 executions
        stateChanges: this.stateChanges.slice(-10) // Last 10 state changes
      },
      configuration: this.configuration,
      timestamp: Date.now(),
      version: '1.0.0',
      rateState: this.rateState,
      originReference: this.originReference
    };
  }

  async deserialize(snapshot: InstanceSnapshot): Promise<void> {
    if (snapshot.type !== InstanceType.TRIGGER) {
      throw new Error(`Cannot deserialize snapshot of type ${snapshot.type} into Trigger`);
    }

    const data = snapshot.data;
    this.configuration = data.configuration;
    this.armed = data.armed;
    this.executionCount = data.executionCount;
    this.lastExecutionTime = data.lastExecutionTime;
    this.lastTriggerData = data.lastTriggerData;
    this.consecutiveErrors = data.consecutiveErrors;
    this.executions = data.executions || [];
    this.stateChanges = data.stateChanges || [];

    this.rateState = data.rateState;
    this.originReference = data.originReference;

    this.updateState(snapshot.state);
  }

  // Lifecycle methods
  async arm(): Promise<void> {
    if (this.configuration.enabled) {
      this.armed = true;
      console.log(`Trigger ${this.id} armed (${this.configuration.triggerType})`);

      // Start scheduling if applicable
      if (this.configuration.triggerType === TriggerType.SCHEDULE && this.configuration.schedule) {
        this.startSchedule();
      }

      // Start condition monitoring if applicable
      if (this.configuration.conditions.length > 0) {
        this.startConditionMonitoring();
      }

      this.updateRateState({
        ...this.rateState!.currentValue,
        armed: true
      });
    }
  }

  async disarm(): Promise<void> {
    this.armed = false;
    console.log(`Trigger ${this.id} disarmed`);

    // Stop scheduling
    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = undefined;
    }

    // Stop condition monitoring
    if (this.conditionCheckInterval) {
      clearInterval(this.conditionCheckInterval);
      this.conditionCheckInterval = undefined;
    }

    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    this.updateRateState({
      ...this.rateState!.currentValue,
      armed: false
    });
  }

  async reset(): Promise<void> {
    this.executionCount = 0;
    this.lastExecutionTime = 0;
    this.lastTriggerData = null;
    this.consecutiveErrors = 0;
    this.executions = [];
    this.conditionsBuffer = [];

    // Stop all timers
    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = undefined;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
    if (this.conditionCheckInterval) {
      clearInterval(this.conditionCheckInterval);
      this.conditionCheckInterval = undefined;
    }

    this.clearCache();
    console.log(`Trigger ${this.id} reset`);
  }

  // Management methods
  addCondition(condition: TriggerCondition): void {
    this.configuration.conditions.push(condition);
    console.log(`Added condition to trigger ${this.id}`);
  }

  removeCondition(index: number): void {
    if (index >= 0 && index < this.configuration.conditions.length) {
      this.configuration.conditions.splice(index, 1);
      console.log(`Removed condition ${index} from trigger ${this.id}`);
    }
  }

  updateCondition(index: number, condition: TriggerCondition): void {
    if (index >= 0 && index < this.configuration.conditions.length) {
      this.configuration.conditions[index] = condition;
      console.log(`Updated condition ${index} in trigger ${this.id}`);
    }
  }

  addAction(action: TriggerAction): void {
    this.configuration.actions.push(action);
    console.log(`Added action to trigger ${this.id}`);
  }

  removeAction(index: number): void {
    if (index >= 0 && index < this.configuration.actions.length) {
      this.configuration.actions.splice(index, 1);
      console.log(`Removed action ${index} from trigger ${this.id}`);
    }
  }

  // Execution methods
  async trigger(triggerData?: any): Promise<void> {
    if (!this.armed) return;
    if (this.configuration.maxExecutions && this.executionCount >= this.configuration.maxExecutions) return;
    if (this.isExecuting) return;

    // Check cooldown
    const now = Date.now();
    if (this.configuration.cooldownPeriod && this.lastExecutionTime > 0) {
      const elapsed = now - this.lastExecutionTime;
      if (elapsed < this.configuration.cooldownPeriod) return;
    }

    // Check conditions
    if (!this.testConditions(triggerData)) return;

    // Debounce handling
    if (this.configuration.debounceDelay > 0) {
      this.lastTriggerData = triggerData;
      this.handleDebouncedTrigger();
    } else {
      await this.executeTrigger(triggerData);
    }
  }

  async forceTrigger(triggerData?: any): Promise<void> {
    // Force execution bypassing most checks
    await this.executeTrigger(triggerData);
  }

  private async executeTrigger(triggerData?: any): Promise<void> {
    const executionId = `exec-${this.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    let success = true;
    let error: string | undefined;
    let result: any;

    try {
      this.isExecuting = true;
      this.lastExecutionTime = startTime;
      this.executionCount++;

      console.log(`Trigger ${this.id} executing (execution ${this.executionCount})`);

      // Execute all actions
      const actionResults: any[] = [];
      for (const action of this.configuration.actions) {
        try {
          const actionResult = await this.executeAction(action, triggerData);
          actionResults.push(actionResult);
        } catch (actionError) {
          const actionErrorMsg = actionError instanceof Error ? actionError.message : String(actionError);
          console.error(`Action failed in trigger ${this.id}:`, actionErrorMsg);
          actionResults.push({ error: actionErrorMsg });
        }
      }

      result = {
        triggerData,
        actionResults,
        executionNumber: this.executionCount
      };

      // Reset error counter on success
      this.consecutiveErrors = 0;
      this.updateConfidence(1.0);

    } catch (execError) {
      success = false;
      error = `Trigger execution failed: ${execError instanceof Error ? execError.message : String(execError)}`;
      this.consecutiveErrors++;

      // Reduce confidence based on consecutive errors
      const confidencePenalty = Math.min(this.consecutiveErrors * 0.2, 0.6);
      this.updateConfidence(1.0 - confidencePenalty);

      console.error(`Trigger ${this.id} execution failed:`, error);
    } finally {
      this.isExecuting = false;
    }

    const executionTime = Date.now() - startTime;

    // Record execution
    const execution: TriggerExecution = {
      id: executionId,
      triggerId: this.id,
      timestamp: startTime,
      triggeredBy: triggerData || null,
      success,
      error,
      executionTime,
      result,
      retryCount: 0 // Would be tracked in retry logic
    };

    this.executions.push(execution);

    // Keep only recent executions
    if (this.executions.length > 1000) {
      this.executions = this.executions.slice(-1000);
    }

    console.log(`Trigger ${this.id} execution completed in ${executionTime}ms (success: ${success})`);

    // Check if we should auto-disable
    if (this.configuration.autoDisable && this.configuration.maxExecutions && this.executionCount >= this.configuration.maxExecutions) {
      this.disarm().catch(console.error);
    }

    // Update rate-based state
    this.updateRateState({
      triggerRate: this.executionCount / (Date.now() - this.createdAt) * 1000,
      successRate: this.getStatistics().reliability,
      avgExecutionTime: this.executions.length > 0
        ? this.executions.slice(-100).reduce((sum, exec) => sum + exec.executionTime, 0) / Math.min(this.executions.length, 100)
        : 0,
      armed: this.armed
    });

    // Update confidence based on execution success
    if (success) {
      this.consecutiveErrors = 0;
      this.updateConfidence(Math.min(1.0, this.confidenceScore + 0.05));
    } else {
      this.consecutiveErrors++;
      this.updateConfidence(Math.max(0.3, this.confidenceScore - (this.consecutiveErrors * 0.1)));
    }
  }

  private async executeAction(action: TriggerAction, triggerData?: any): Promise<any> {
    const startTime = Date.now();

    try {
      switch (action.type) {
        case 'javascript':
          return this.executeJavaScriptAction(action, triggerData);

        case 'webhook':
          return await this.executeWebhookAction(action, triggerData);

        case 'message':
          return this.executeMessageAction(action, triggerData);

        case 'state_change':
          return this.executeStateChangeAction(action, triggerData);

        case 'callback':
          return this.executeCallbackAction(action, triggerData);

        case 'composite':
          return this.executeCompositeAction(action, triggerData);

        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }
    } catch (error) {
      if (action.fallbackAction) {
        return this.executeAction(action.fallbackAction, triggerData);
      }
      throw error;
    } finally {
      const executionTime = Date.now() - startTime;
      if (executionTime > 1000) {
        console.warn(`Action ${action.type} took ${executionTime}ms to execute`);
      }
    }
  }

  private executeJavaScriptAction(action: TriggerAction, triggerData?: any): any {
    if (!action.script) {
      throw new Error('JavaScript action requires script');
    }

    // Create safe execution context
    const context = {
      triggerData,
      instance: this,
      configuration: this.configuration,
      console,
      Math,
      Date,
      JSON,
      parseInt,
      parseFloat,
      String,
      Number,
      Boolean,
      Array,
      Object
    };

    try {
      // Create function from script
      const func = new Function(...Object.keys(context), `return (async function() { ${action.script} })()`);
      return func(...Object.values(context));
    } catch (error) {
      throw new Error(`JavaScript execution error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async executeWebhookAction(action: TriggerAction, triggerData?: any): Promise<any> {
    if (!action.endpoint) {
      throw new Error('Webhook action requires endpoint');
    }

    // Simulate webhook call
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

    const payload = {
      triggerId: this.id,
      triggerData,
      timestamp: Date.now(),
      payload: action.payload || undefined
    };

    console.log(`Webhook call to ${action.endpoint}:`, JSON.stringify(payload, null, 2));

    return {
      success: true,
      endpoint: action.endpoint,
      payload: payload
    };
  }

  private executeMessageAction(action: TriggerAction, triggerData?: any): any {
    // Generate message
    const message = {
      type: 'trigger_event',
      triggerId: this.id,
      triggerData,
      payload: action.payload || undefined,
      timestamp: Date.now()
    };

    console.log(`Message action:`, message);

    return message;
  }

  private executeStateChangeAction(action: TriggerAction, triggerData?: any): any {
    if (!action.targetId) {
      throw new Error('State change action requires targetId');
    }

    // Simulate state change
    const stateChange = {
      triggerId: this.id,
      targetId: action.targetId,
      newState: action.payload?.state || 'unknown',
      reason: action.payload?.reason || `Triggered by ${this.id}`,
      data: triggerData
    };

    console.log(`State change action:`, stateChange);

    return stateChange;
  }

  private executeCallbackAction(action: TriggerAction, triggerData?: any): any {
    if (!action.payload || !action.payload.function) {
      throw new Error('Callback action requires function in payload');
    }

    // Execute callback function
    const callbackFunc = action.payload.function as Function;
    return callbackFunc(triggerData, this.configuration, action.payload);
  }

  private executeCompositeAction(action: TriggerAction, triggerData?: any): any {
    if (!action.payload?.actions || !Array.isArray(action.payload.actions)) {
      throw new Error('Composite action requires actions array in payload');
    }

    const results: any[] = [];
    for (const subAction of action.payload.actions) {
      try {
        const result = await this.executeAction(subAction, triggerData);
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return {
      composite: true,
      actionCount: results.length,
      results
    };
  }

  private handleDebouncedTrigger(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.executeTrigger(this.lastTriggerData);
    }, this.configuration.debounceDelay || 500);
  }

  private startConditionMonitoring(): void {
    if (this.conditionCheckInterval) {
      clearInterval(this.conditionCheckInterval);
    }

    // Check conditions periodically based on trigger type
    const checkInterval = this.getCheckInterval();

    this.conditionCheckInterval = setInterval(() => {
      if (this.armed && !this.isExecuting) {
        // Create mock data for condition checking
        const mockData = this.generateMockCheckData();
        if (this.testConditions(mockData)) {
          this.trigger(mockData).catch(console.error);
        }
      }
    }, checkInterval);
  }

  private getCheckInterval(): number {
    switch (this.configuration.triggerType) {
      case TriggerType.SCHEDULE:
        return 60000; // 1 minute
      case TriggerType.DATA_CHANGE:
        return 1000; // 1 second
      case TriggerType.STATE_CHANGE:
        return 500; // 500ms
      default:
        return 10000; // 10 seconds
    }
  }

  private generateMockCheckData(): any {
    // Generate appropriate mock data based on trigger type
    switch (this.configuration.triggerType) {
      case TriggerType.THRESHOLD:
        return { value: Math.random() * 100 };
      case TriggerType.DATA_CHANGE:
        return { oldValue: Math.random() * 50, newValue: Math.random() * 100 };
      case TriggerType.CONFIDENCE:
        return { confidence: Math.random() };
      default:
        return { timestamp: Date.now(), signal: Math.random() > 0.5 };
    }
  }

  private startSchedule(): void {
    if (!this.configuration.schedule) return;

    const schedule = this.configuration.schedule;

    switch (schedule.type) {
      case 'interval':
        if (schedule.interval) {
          this.startIntervalSchedule(schedule.interval);
        }
        break;

      case 'cron':
        // Simplified cron (would need full cron parser)
        if (schedule.expression) {
          this.startCronSchedule(schedule.expression);
        }
        break;

      case 'onel':
        // One-time execution
        if (schedule.startTime) {
          const delay = schedule.startTime - Date.now();
          if (delay > 0) {
            setTimeout(() => this.trigger({ type: 'schedule', reason: 'one-time' }), delay);
          }
        }
        break;
    }
  }

  private startIntervalSchedule(interval: number): void {
    // Add jitter to prevent thundering herd
    const jitter = this.configuration.schedule?.jitter || 0;
    const actualInterval = interval + (jitter * Math.random() * 2 - jitter);

    this.scheduleTimer = setTimeout(() => {
      if (this.armed) {
        this.trigger({ type: 'interval', reason: 'scheduled', interval }).catch(console.error);
      }
      this.startIntervalSchedule(interval); // Recursive for repeating
    }, actualInterval);
  }

  private startCronSchedule(expression: string): void {
    // Very simplified cron - would need full cron parser library
    const parts = expression.split(' ');
    if (parts.length >= 3) {
      const minute = parseInt(parts[0]) || 0;
      const hour = parseInt(parts[1]) || 0;

      // Execute at specified time (next occurrence)
      const now = new Date();
      const next = new Date();
      next.setHours(hour, minute, 0, 0);

      if (next < now) {
        next.setDate(next.getDate() + 1); // Tomorrow
      }

      const delay = next.getTime() - now.getTime();

      this.scheduleTimer = setTimeout(() => {
        if (this.armed) {
          this.trigger({ type: 'cron', reason: 'scheduled', cron: expression }).catch(console.error);
        }
        this.startCronSchedule(expression); // Recursive for repeating
      }, delay);
    }
  }

  // Public interface methods
  testConditions(data: any): boolean {
    if (!this.configuration.conditions || this.configuration.conditions.length === 0) {
      return true; // Always true if no conditions
    }

    // All conditions must be true (AND logic)
    return this.configuration.conditions.every((condition, index) => this.evaluateCondition(condition, data, index));
  }

  private evaluateCondition(condition: TriggerCondition, data: any, index: number): boolean {
    try {
      switch (condition.type) {
        case 'data_value':
          return this.evaluateDataValueCondition(condition, data);

        case 'rate_change':
          return this.evaluateRateChangeCondition(condition, data);

        case 'confidence':
          return this.evaluateConfidenceCondition(condition, data);

        case 'time_window':
          return this.evaluateTimeWindowCondition(condition, data);

        case 'composite':
          return this.evaluateCompositeCondition(condition, data);

        case 'custom':
          return this.evaluateCustomCondition(condition, data);

        default:
          console.warn(`Unknown condition type: ${condition.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Error evaluating condition ${index}:`, error);
      return false;
    }
  }

  private evaluateDataValueCondition(condition: TriggerCondition, data: any): boolean {
    const value = condition.field ? this.getNestedValue(data, condition.field) : data;

    switch (condition.operator) {
      case 'eq': return value === condition.value;
      case 'ne': return value !== condition.value;
      case 'gt': return value > condition.value;
      case 'gte': return value >= condition.value;
      case 'lt': return value < condition.value;
      case 'lte': return value <= condition.value;
      case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in': return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'regex': return new RegExp(condition.value).test(String(value));
      case 'exists': return value !== undefined && value !== null;
      case 'not_exists': return value === undefined || value === null;
      default:
        console.warn(`Unknown operator: ${condition.operator}`);
        return false;
    }
  }

  private evaluateRateChangeCondition(condition: TriggerCondition, data: any): boolean {
    // Check if rate has changed significantly
    if (this.rateState && condition.threshold) {
      const currentRate = this.rateState.rateOfChange.value;
      const lastRate = this.rateState.rateOfChange.acceleration;
      const change = Math.abs(currentRate - lastRate);
      return change >= condition.threshold;
    }
    return false;
  }

  private evaluateConfidenceCondition(condition: TriggerCondition, data: any): boolean {
    // Check confidence level
    if (condition.threshold) {
      return this.confidenceScore >= condition.threshold;
    }
    return true;
  }

  private evaluateTimeWindowCondition(condition: TriggerCondition, data: any): boolean {
    // Check if we're within a time window
    if (condition.window) {
      const windowStart = Time.now() - condition.window;
      return this.executions.some(exec => exec.timestamp > windowStart);
    }
    return true;
  }

  private evaluateCompositeCondition(condition: TriggerCondition, data: any): boolean {
    // Evaluate complex conditions based on data
    return Boolean(data.complexCondition); // Simplified
  }

  private evaluateCustomCondition(condition: TriggerCondition, data: any): boolean {
    if (!condition.customCode) return false;

    try {
      const func = new Function('data', 'condition', 'instance', condition.customCode);
      return func(data, condition, this);
    } catch (error) {
      console.error('Custom condition evaluation error:', error);
      return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  // Monitoring methods
  getExecutions(limit?: number): TriggerExecution[] {
    const safeLimit = Math.min(limit || 100, this.executions.length);
    return this.executions.slice(-safeLimit);
  }

  getExecutionHistory(timeWindow?: number): TriggerExecution[] {
    if (!timeWindow) return this.executions;

    const cutoff = Date.now() - timeWindow;
    return this.executions.filter(exec => exec.timestamp >= cutoff);
  }

  getLastExecution(): TriggerExecution | undefined {
    return this.executions[this.executions.length - 1];
  }

  getStatistics(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    recentConsecutiveErrors: number;
    reliability: number;
  } {
    if (this.executions.length === 0) {
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        recentConsecutiveErrors: 0,
        reliability: 1.0
      };
    }

    const recentMax = 100;
    const recentExecutions = this.executions.slice(-recentMax);
    const successful = recentExecutions.filter(exec => exec.success).length;
    const failed = recentExecutions.length - successful;
    const avgTime = recentExecutions.reduce((sum, exec) => sum + exec.executionTime, 0) / recentExecutions.length;

    return {
      totalExecutions: this.executionCount,
      successfulExecutions: successful,
      failedExecutions: failed,
      averageExecutionTime: avgTime,
      recentConsecutiveErrors: this.consecutiveErrors,
      reliability: successful / recentExecutions.length
    };
  }

  // Configuration methods
  async updateConfiguration(config: Partial<TriggerConfiguration>): Promise<void> {
    // Validate configuration
    if (config.maxExecutions !== undefined && config.maxExecutions <= 0) {
      throw new Error('maxExecutions must be positive');
    }

    if (config.cooldownPeriod !== undefined && config.cooldownPeriod < 0) {
      throw new Error('cooldownPeriod must be non-negative');
    }

    if (config.debounceDelay !== undefined && config.debounceDelay < 0) {
      throw new Error('debounceDelay must be non-negative');
    }

    this.configuration = { ...this.configuration, ...config };

    // If armed and schedule changed, restart scheduling
    if (this.armed && config.schedule) {
      if (this.scheduleTimer) {
        clearTimeout(this.scheduleTimer);
      }
      this.startSchedule();
    }

    console.log(`Trigger ${this.id} configuration updated`);
  }

  // Relationship methods
  async getStatus(): Promise<InstanceStatus> {
    const stats = this.getStatistics();
    return {
      state: this.state,
      health: this.calculateHealth(),
      uptime: Date.now() - this.createdAt,
      warnings: this.getWarnings(),
      lastError: this.executions.length > 0 && !this.executions[this.executions.length - 1].success
        ? {
            code: 'TRIGGER_EXECUTION_ERROR',
            message: this.executions[this.executions.length - 1].error || 'Unknown error'
          }
        : undefined
    };
  }

  async getMetrics(): Promise<InstanceMetrics> {
    const stats = this.getStatistics();
    return {
      cpuUsage: stats.averageExecutionTime / 1000 * 100, // Rough estimate
      memoryUsage: this.executions.length * 0.1, // Rough estimate
      diskUsage: 0,
      networkIn: 0,
      networkOut: 0,
      requestCount: this.executionCount,
      errorRate: stats.failedExecutions / Math.max(stats.totalExecutions, 1),
      latency: {
        p50: stats.averageExecutionTime,
        p90: stats.averageExecutionTime * 1.5,
        p95: stats.averageExecutionTime * 2,
        p99: stats.averageExecutionTime * 3,
        max: stats.averageExecutionTime * 5
      }
    };
  }

  // Override to track state changes
  protected updateState(newState: InstanceState): void {
    const oldState = this.state;
    super.updateState(newState);

    if (oldState !== newState) {
      this.stateChanges.push({
        oldState,
        newState,
        timestamp: Date.now()
      });

      // Keep only recent state changes
      if (this.stateChanges.length > 100) {
        this.stateChanges = this.stateChanges.slice(-100);
      }

      // Trigger on state changes if configured
      if (this.armed && this.configuration.triggerType === TriggerType.STATE_CHANGE) {
        this.trigger({
          type: 'state_change',
          oldState,
          newState,
          instanceId: this.id
        }).catch(console.error);
      }
    }
  }

  private calculateHealth(): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
    const stats = this.getStatistics();

    if (this.state === InstanceState.ERROR) {
      return 'unhealthy';
    }

    if (stats.recentConsecutiveErrors > 5 || stats.reliability < 0.5) {
      return 'unhealthy';
    }

    if (stats.reliability < 0.8 || stats.recentConsecutiveErrors > 0) {
      return 'degraded';
    }

    return this.armed ? 'healthy' : 'unknown';
  }

  private getWarnings(): string[] {
    const warnings: string[] = [];
    const stats = this.getStatistics();

    if (this.consecutiveErrors > 0) {
      warnings.push(`Consecutive errors: ${this.consecutiveErrors}`);
    }

    if (stats.reliability < 0.9) {
      warnings.push(`Low reliability: ${(stats.reliability * 100).toFixed(1)}%`);
    }

    if (this.configuration.maxExecutions && this.executionCount >= this.configuration.maxExecutions * 0.8) {
      warnings.push(`Approaching execution limit: ${this.executionCount}/${this.configuration.maxExecutions}`);
    }

    return warnings;
  }

  async sendMessage(message: InstanceMessage): Promise<InstanceMessageResponse> {
    try {
      await this.receiveMessage(message);
      return {
        messageId: message.id,
        status: 'success',
        payload: {
          armed: this.armed,
          executionCount: this.executionCount,
          lastExecution: this.lastExecutionTime,
          health: this.calculateHealth()
        }
      };
    } catch (error) {
      return {
        messageId: message.id,
        status: 'error',
        error: {
          code: 'TRIGGER_MESSAGE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true,
          context: { triggerType: this.configuration.triggerType }
        }
      };
    }
  }

  async receiveMessage(message: InstanceMessage): Promise<void> {
    if (message.type === 'data' && message.payload) {
      // Trigger based on incoming data
      if (this.armed) {
        await this.trigger({
          type: 'message',
          source: message.sender,
          data: message.payload,
          timestamp: message.timestamp
        });
      }
    } else if (message.type === 'command' && message.payload) {
      await this.handleCommandMessage(message.payload);
    }
  }

  private async handleCommandMessage(payload: any): Promise<void> {
    switch (payload.command) {
      case 'arm':
        await this.arm();
        break;
      case 'disarm':
        await this.disarm();
        break;
      case 'reset':
        await this.reset();
        break;
      case 'test':
        console.log(`Testing trigger ${this.id}: ${this.armed ? `armed` : 'disarmed'}, conditions met: ${this.testConditions(payload.testData || {})}`);
        break;
    }
  }
}