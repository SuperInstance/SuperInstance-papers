/**
 * POLLN Safety Layer
 * Constitutional AI + Kill Switch + Rollbacks
 */

import { v4 } from 'uuid';
import type { SafetySeverity } from './types';

export interface ConstitutionalConstraint {
  id: string;
  name: string;
  category: string;
  rule: string;
  ruleCode?: string;
  severity: SafetySeverity;
  cannotOverride: boolean;
}

 export interface SafetyCheckResult {
  passed: boolean;
  constraintId?: string;
  severity: SafetySeverity;
  message: string;
  blockedBy?: string;
}

 export interface KillSwitchConfig {
  enabled: boolean;
  timeoutMs: number;
  autoRecover: boolean;
  emergencyContacts: string[];
}

 export interface RollbackConfig {
  enabled: boolean;
  maxCheckpoints: number;
  checkpointIntervalMs: number;
}

 export interface EmergencyState {
  killSwitchActive: boolean;
  safeModeActive: boolean;
  rollbackActive: boolean;
  currentCheckpoint?: string;
  lastCheckpointTime: Date;
}

 export type ConstraintCategory =
  | 'harm_prevention'
  | 'human_autonomy'
  | 'privacy'
  | 'truthfulness'
  | 'fairness';

  | 'safety';

  | 'oversight'
  | 'monitoring';

 export type SafetyAction = 'block' | 'warn' | 'log' | 'escalate' | 'emergency_stop');

 export type SafeMode = 'minimal' | 'restricted' | 'sandbox';

 export type CheckpointType = 'full' | 'incremental' | 'state_only'
 export interface Checkpoint {
  id: string;
  type: CheckpointType;
  timestamp: Date;
  stateSnapshot: Record<string, unknown>;
}

 export interface AuditEntry {
  id: string;
  timestamp: Date;
  category: ConstraintCategory;
  severity: SafetySeverity;
  action: SafetyAction;
  description: string;
  agentId?: string;
  loomId?: string;
  constraintId?: string;
  resolved: boolean;
}
/**
 * Safety Layer Implementation
 *
 * Based on Round 2 research: Layered safety architecture
 */
export class SafetyLayer {
  private constraints: Map<string, ConstitutionalConstraint> = new Map();
  private killSwitch: KillSwitch;
  private rollback: Rollback;
  private emergencyState: EmergencyState;
  private checkpoints: Checkpoint[] = [];
  private auditLog: AuditEntry[] = [];

  constructor(
    constraints: ConstitutionalConstraint[],
    killSwitchConfig?: Partial<KillSwitchConfig>,
    rollbackConfig?: Partial<RollbackConfig>
  ) {
    // Initialize constraints
    for (const constraint of constraints) {
      this.constraints.set(constraint.id, constraint);
    }

    // Initialize kill switch
    this.killSwitch = {
      enabled: true,
      timeoutMs: killSwitchConfig?.timeoutMs || 5000,
      autoRecover: killSwitchConfig?.autoRecover ?? true,
      emergencyContacts: killSwitchConfig?.emergencyContacts || [],
    };

    // Initialize rollback
    this.rollback = {
      enabled: rollbackConfig?.enabled ?? true,
      maxCheckpoints: rollbackConfig?.maxCheckpoints || 10,
      checkpointIntervalMs: rollbackConfig?.checkpointIntervalMs || 60000,
    };
  }

  /**
   * Add a constitutional constraint
   */
  addConstraint(constraint: ConstitutionalConstraint): void {
    this.constraints.set(constraint.id, constraint);
  }

  /**
   * Remove a constitutional constraint
   */
  removeConstraint(id: string): void {
    this.constraints.delete(id);
  }

  /**
   * Check an action against all constraints
   */
  checkAction(
    agentId: string,
    action: unknown,
    context?: Record<string, unknown>
  ): SafetyCheckResult {
    const results: SafetyCheckResult = {
      passed: true,
      severity: SafetySeverity.info,
    };

    // Check all constraints
    for (const constraint of this.constraints.values()) {
      if (this.matchesConstraint(constraint, action, context)) {
        const result = this.enforceConstraint(constraint, action, context);
        results.push(result);

        // If critical constraint fails, block immediately
        if (!result.passed && constraint.severity === SafetySeverity.critical) {
          this.logAudit({
            category: constraint.category,
            severity: SafetySeverity.critical,
            action: 'block',
            description: `Critical constraint violated: ${constraint.name}`,
            agentId,
            constraintId: constraint.id,
          });
          this.triggerKillSwitch(`Critical constraint violated: ${constraint.name}`);
          return {
            ...results[results.length - 1],
            passed: false,
            blockedBy: constraint.id,
          };
        }
      }
    }

    return {
      passed: results.every((r) => r.passed),
      severity: this.getHighestSeverity(results),
      constraintId: results.find((r) => !r.passed)?.constraintId,
    };
  }

  /**
   * Check if action matches constraint
   */
  private matchesConstraint(
    constraint: ConstitutionalConstraint,
    action: unknown,
    context?: Record<string, unknown>
  ): boolean {
    if (constraint.ruleCode) {
      // Evaluate machine-checkable rule
      try {
        return this.evaluateRuleCode(constraint.ruleCode!, action, context);
      } catch {
        return false;
      }
    }
    // Fallback to natural language matching
    return this.naturalLanguageMatch(constraint.rule, action);
  }

  /**
   * Evaluate machine-checkable rule code
   */
  private evaluateRuleCode(
    ruleCode: string,
    action: unknown,
    context?: Record<string, unknown>
  ): boolean {
    // Placeholder for rule evaluation
    // In production, this would use a proper rule engine
    return true;
  }

  /**
   * Natural language matching for constraint rules
   */
  private naturalLanguageMatch(rule: string, action: unknown): boolean {
    // Placeholder for NLP-based constraint matching
    // In production, this would use an LLM
    const actionStr = JSON.stringify(action).toLowerCase();
    const ruleStr = rule.toLowerCase();
    return !actionStr.includes(ruleStr);
  }

  /**
   * Enforce a constraint
   */
  private enforceConstraint(
    constraint: ConstitutionalConstraint,
    action: unknown,
    context?: Record<string, unknown>
  ): SafetyCheckResult {
    return {
      passed: false,
      constraintId: constraint.id,
      severity: constraint.severity,
      message: `Action violates constraint: ${constraint.name}`,
    };
  }

  /**
   * Get highest severity from results
   */
  private getHighestSeverity(results: SafetyCheckResult[]): SafetySeverity {
    const severities = results.map((r) => r.severity);
    if (severities.includes(SafetySeverity.critical)) {
      return SafetySeverity.critical;
    }
    if (severities.includes(SafetySeverity.error)) {
      return SafetySeverity.error;
    }
    if (severities.includes(SafetySeverity.warning)) {
      return SafetySeverity.warning;
    }
    return SafetySeverity.info;
  }

  /**
   * Trigger kill switch
   */
  private triggerKillSwitch(reason: string): void {
    this.killSwitch.enabled = false;
    this.emergencyState.killSwitchActive = true;
    this.emergencyState.lastCheckpointTime = new Date();

    this.logAudit({
      category: 'safety',
      severity: SafetySeverity.critical,
      action: 'emergency_stop',
      description: `Kill switch triggered: ${reason}`,
    });

    // Notify emergency contacts
    for (const contact of this.killSwitch.emergencyContacts) {
      this.notifyEmergencyContact(contact, reason);
    }
  }

  /**
   * Notify emergency contact
   */
  private notifyEmergencyContact(contact: string, reason: string): void {
    console.error(`EMERGENCY: ${contact} - ${reason}`);
  }

  /**
   * Create a checkpoint
   */
  async createCheckpoint(
    type: CheckpointType,
    stateSnapshot: Record<string, unknown>
  ): Promise<Checkpoint> {
    const checkpoint: Checkpoint = {
      id: uuidv4(),
      type,
      timestamp: new Date(),
      stateSnapshot,
    };

    this.checkpoints.push(checkpoint);

    // Maintain max checkpoints
    if (this.checkpoints.length > this.rollback.maxCheckpoints) {
      this.checkpoints.shift();
    }

    this.emergencyState.currentCheckpoint = checkpoint.id;
    this.emergencyState.lastCheckpointTime = checkpoint.timestamp;

    return checkpoint;
  }

  /**
   * Rollback to last checkpoint
   */
  async rollbackToCheckpoint(checkpointId?: string): Promise<boolean> {
    const checkpoint = checkpointId
      ? this.checkpoints.find((cp) => cp.id === checkpointId)
      : this.checkpoints[this.checkpoints.length - 1];

    if (!checkpoint) {
      return false;
    }

    // In production, this would restore the state from the checkpoint
    this.emergencyState.rollbackActive = true;

    this.logAudit({
      category: 'safety',
      severity: SafetySeverity.warning,
      action: 'rollback',
      description: `Rollback to checkpoint ${checkpoint.id}`,
    });

    return true;
  }

  /**
   * Log audit entry
   */
  private logAudit(entry: Partial<AEntry>): void {
    const auditEntry: AuditEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      ...entry,
    };

    this.auditLog.push(auditEntry);
  }

  /**
   * Enable safe mode
   */
  enableSafeMode(mode: SafeMode): void {
    this.emergencyState.safeModeActive = true;
    this.logAudit({
      category: 'safety',
      severity: SafetySeverity.warning,
      action: 'restrict',
      description: `Safe mode enabled: ${mode}`,
    });
  }

  /**
   * Disable safe mode
   */
  disableSafeMode(): void {
    this.emergencyState.safeModeActive = false;
    this.logAudit({
      category: 'safety',
      severity: SafetySeverity.info,
      action: 'log',
      description: 'Safe mode disabled',
    });
  }

  /**
   * Get audit log
   */
  getAuditLog(limit?: number): AuditEntry[] {
    return this.auditLog.slice(-(limit || 100));
  }

  /**
   * Get emergency state
   */
  getEmergencyState(): EmergencyState {
    return { ...this.emergencyState };
  }

  /**
   * Get checkpoints
   */
  getCheckpoints(): Checkpoint[] {
    return [...this.checkpoints];
  }

  /**
   * Get constraints
   */
  getConstraints(): ConstitutionalConstraint[] {
    return Array.from(this.constraints.values());
  }
}
