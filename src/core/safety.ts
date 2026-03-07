/**
 * POLLN Safety Layer
 * Constitutional AI + Kill Switch + Rollbacks
 */

import { v4 as uuidv4 } from 'uuid';
import type { SafetySeverity } from './types';

export type ConstraintCategory =
  | 'harm_prevention'
  | 'human_autonomy'
  | 'privacy'
  | 'truthfulness'
  | 'fairness'
  | 'safety'
  | 'oversight'
  | 'monitoring';

export type SafetyAction = 'block' | 'warn' | 'log' | 'escalate' | 'emergency_stop';

export type SafeMode = 'minimal' | 'restricted' | 'sandbox';

export type CheckpointType = 'full' | 'incremental' | 'state_only';

export interface ConstitutionalConstraint {
  id: string;
  name: string;
  category: ConstraintCategory;
  rule: string;
  ruleCode?: string;
  severity: SafetySeverity;
  cannotOverride: boolean;
  isActive: boolean;
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
  lastCheckpointTime: number;
}

export interface Checkpoint {
  id: string;
  type: CheckpointType;
  timestamp: number;
  stateSnapshot: Record<string, unknown>;
}

export interface AuditEntry {
  id: string;
  timestamp: number;
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
 * SafetyLayer Implementation
 *
 * Based on Round 2 research: Layered safety architecture
 */
export class SafetyLayer {
  private constraints: Map<string, ConstitutionalConstraint> = new Map();
  private killSwitchConfig: KillSwitchConfig;
  private rollbackConfig: RollbackConfig;
  private emergencyState: EmergencyState;
  private checkpoints: Checkpoint[] = [];
  private auditLog: AuditEntry[] = [];

  constructor(
    constraints: ConstitutionalConstraint[] = [],
    killSwitchConfig?: Partial<KillSwitchConfig>,
    rollbackConfig?: Partial<RollbackConfig>
  ) {
    // Initialize constraints
    for (const constraint of constraints) {
      if (constraint.isActive !== false) {
        this.constraints.set(constraint.id, constraint);
      }
    }

    // Initialize kill switch
    this.killSwitchConfig = {
      enabled: true,
      timeoutMs: 5000,
      autoRecover: false,
      emergencyContacts: [],
      ...killSwitchConfig
    };

    // Initialize rollback
    this.rollbackConfig = {
      enabled: true,
      maxCheckpoints: 10,
      checkpointIntervalMs: 60000,
      ...rollbackConfig
    };

    // Initialize emergency state
    this.emergencyState = {
      killSwitchActive: false,
      safeModeActive: false,
      rollbackActive: false,
      lastCheckpointTime: Date.now(),
    };
  }

  /**
   * Add a constitutional constraint
   */
  addConstraint(constraint: ConstitutionalConstraint): void {
    this.constraints.set(constraint.id, { ...constraint, isActive: true });
    this.logAudit({
      category: constraint.category,
      severity: 'INFO',
      action: 'log',
      description: `Constraint added: ${constraint.name}`,
      constraintId: constraint.id,
    });
  }

  /**
   * Remove a constitutional constraint
   */
  removeConstraint(id: string): boolean {
    const constraint = this.constraints.get(id);
    if (!constraint) return false;

    const deleted = this.constraints.delete(id);
    if (deleted) {
      this.logAudit({
        category: constraint.category,
        severity: 'WARNING',
        action: 'log',
        description: `Constraint removed: ${constraint.name}`,
        constraintId: id,
      });
    }
    return deleted;
  }

  /**
   * Check an action against all constraints
   */
  checkAction(
    agentId: string,
    action: unknown,
    context?: Record<string, unknown>
  ): SafetyCheckResult {
    const results: SafetyCheckResult[] = [];

    // Check all constraints
    for (const constraint of this.constraints.values()) {
      if (this.matchesConstraint(constraint, action, context)) {
        const result = this.enforceConstraint(constraint, action, context);
        results.push(result);

        // If critical constraint fails, block immediately
        if (!result.passed && constraint.severity === 'CRITICAL') {
          this.logAudit({
            category: constraint.category,
            severity: 'CRITICAL',
            action: 'block',
            description: `Critical constraint violated: ${constraint.name}`,
            agentId,
            constraintId: constraint.id,
          });
          this.triggerKillSwitch(`Critical constraint violated: ${constraint.name}`);
          return {
            ...result,
            blockedBy: constraint.id,
          };
        }
      }
    }

    const allPassed = results.every(r => r.passed);
    const highestSeverity = this.getHighestSeverity(results);

    return {
      passed: allPassed,
      severity: highestSeverity,
      constraintId: results.find(r => !r.passed)?.constraintId,
      message: allPassed ? 'All checks passed' : 'Some constraints violated',
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
      try {
        return this.evaluateRuleCode(constraint.ruleCode, action, context);
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
    const passed = !this.matchesConstraint(constraint, action, context);
    return {
      passed,
      constraintId: constraint.id,
      severity: constraint.severity,
      message: passed
        ? `Constraint satisfied: ${constraint.name}`
        : `Action violates constraint: ${constraint.name}`,
    };
  }

  /**
   * Get highest severity from results
   */
  private getHighestSeverity(results: SafetyCheckResult[]): SafetySeverity {
    const severities = results.map(r => r.severity);
    if (severities.includes('CRITICAL')) return 'CRITICAL';
    if (severities.includes('ERROR')) return 'ERROR';
    if (severities.includes('WARNING')) return 'WARNING';
    return 'INFO';
  }

  /**
   * Trigger kill switch
   */
  triggerKillSwitch(reason: string): void {
    this.emergencyState.killSwitchActive = true;
    this.emergencyState.lastCheckpointTime = Date.now();

    this.logAudit({
      category: 'safety',
      severity: 'CRITICAL',
      action: 'emergency_stop',
      description: `Kill switch triggered: ${reason}`,
    });

    // Notify emergency contacts
    for (const contact of this.killSwitchConfig.emergencyContacts) {
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
      timestamp: Date.now(),
      stateSnapshot,
    };

    this.checkpoints.push(checkpoint);

    // Maintain max checkpoints
    while (this.checkpoints.length > this.rollbackConfig.maxCheckpoints) {
      this.checkpoints.shift();
    }

    this.emergencyState.currentCheckpoint = checkpoint.id;
    this.emergencyState.lastCheckpointTime = checkpoint.timestamp;

    this.logAudit({
      category: 'safety',
      severity: 'INFO',
      action: 'log',
      description: `Checkpoint created: ${checkpoint.id}`,
    });

    return checkpoint;
  }

  /**
   * Rollback to a checkpoint
   */
  async rollbackToCheckpoint(checkpointId?: string): Promise<boolean> {
    const checkpoint = checkpointId
      ? this.checkpoints.find(cp => cp.id === checkpointId)
      : this.checkpoints[this.checkpoints.length - 1];

    if (!checkpoint) {
      return false;
    }

    this.emergencyState.rollbackActive = true;
    this.emergencyState.currentCheckpoint = checkpoint.id;

    this.logAudit({
      category: 'safety',
      severity: 'WARNING',
      action: 'log',
      description: `Rollback to checkpoint ${checkpoint.id}`,
    });

    return true;
  }

  /**
   * Log audit entry
   */
  private logAudit(entry: Partial<AuditEntry>): void {
    const auditEntry: AuditEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      resolved: false,
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
      severity: 'WARNING',
      action: 'block',
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
      severity: 'INFO',
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

  /**
   * Get statistics
   */
  getStats(): {
    totalConstraints: number;
    activeConstraints: number;
    checkpointsCount: number;
    auditLogSize: number;
    killSwitchActive: boolean;
    safeModeActive: boolean;
  } {
    return {
      totalConstraints: this.constraints.size,
      activeConstraints: Array.from(this.constraints.values()).filter(c => c.isActive).length,
      checkpointsCount: this.checkpoints.length,
      auditLogSize: this.auditLog.length,
      killSwitchActive: this.emergencyState.killSwitchActive,
      safeModeActive: this.emergencyState.safeModeActive,
    };
  }
}
