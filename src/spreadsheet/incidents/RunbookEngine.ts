/**
 * POLLN Incident Runbook Engine
 * Automated incident response execution
 */

import { randomUUID } from 'crypto';
import type {
  Incident,
  Runbook,
  RunbookStep,
  RunbookExecution,
  RunbookStepResult,
  IncidentStatus
} from './types.js';

/**
 * Runbook execution context
 */
export interface RunbookContext {
  incident: Incident;
  variables: Record<string, unknown>;
  previousSteps: RunbookStepResult[];
  startTime: Date;
}

/**
 * Step execution result
 */
interface StepExecutionResult {
  stepId: string;
  success: boolean;
  output: unknown;
  error?: string;
  duration: number;
  executedAt: Date;
}

/**
 * Runbook Engine Configuration
 */
export interface RunbookEngineConfig {
  timeout: number; // milliseconds
  maxRetries: number;
  allowManualApproval: boolean;
  requireApprovalFor: string[]; // step types requiring approval
}

/**
 * Runbook Engine Class
 */
export class RunbookEngine {
  private runbooks: Map<string, Runbook> = new Map();
  private executions: Map<string, RunbookExecution> = new Map();
  private config: RunbookEngineConfig;

  constructor(config?: Partial<RunbookEngineConfig>) {
    this.config = {
      timeout: 300000, // 5 minutes
      maxRetries: 3,
      allowManualApproval: true,
      requireApprovalFor: ['destructive', 'production-change', 'restart-service'],
      ...config
    };
  }

  /**
   * Register runbook
   */
  registerRunbook(runbook: Runbook): void {
    this.runbooks.set(runbook.id, runbook);
  }

  /**
   * Get runbook by ID
   */
  getRunbook(runbookId: string): Runbook | undefined {
    return this.runbooks.get(runbookId);
  }

  /**
   * Get runbook by incident type
   */
  getRunbookForIncident(incident: Incident): Runbook | undefined {
    // Find runbook matching incident type and severity
    return Array.from(this.runbooks.values()).find(
      rb =>
        rb.incidentTypes.includes(incident.type) &&
        rb.severities.includes(incident.severity)
    );
  }

  /**
   * Execute runbook for incident
   */
  async executeRunbook(
    incident: Incident,
    runbookId?: string,
    variables: Record<string, unknown> = {}
  ): Promise<RunbookExecution> {
    // Find runbook
    const runbook = runbookId
      ? this.runbooks.get(runbookId)
      : this.getRunbookForIncident(incident);

    if (!runbook) {
      throw new Error(`No runbook found for incident ${incident.id}`);
    }

    // Create execution
    const execution: RunbookExecution = {
      id: randomUUID(),
      runbookId: runbook.id,
      incidentId: incident.id,
      status: 'running',
      startedAt: new Date(),
      steps: [],
      variables: { ...variables },
      executedBy: 'system'
    };

    this.executions.set(execution.id, execution);

    try {
      // Execute runbook steps
      const context: RunbookContext = {
        incident,
        variables: { ...variables },
        previousSteps: [],
        startTime: new Date()
      };

      for (const step of runbook.steps) {
        const result = await this.executeStep(step, context);

        execution.steps.push({
          stepId: step.id,
          name: step.name,
          status: result.success ? 'completed' : 'failed',
          startedAt: result.executedAt,
          completedAt: new Date(result.executedAt.getTime() + result.duration),
          output: result.output,
          error: result.error
        });

        context.previousSteps.push({
          stepId: step.id,
          success: result.success,
          output: result.output
        });

        // Stop if step failed
        if (!result.success && !step.continueOnFailure) {
          execution.status = 'failed';
          execution.completedAt = new Date();
          execution.error = `Step ${step.name} failed: ${result.error}`;
          break;
        }

        // Stop if manual approval needed
        if (step.requiresApproval && !this.config.allowManualApproval) {
          execution.status = 'awaiting-approval';
          break;
        }
      }

      // Mark as completed if all steps succeeded
      if (execution.status === 'running') {
        execution.status = 'completed';
        execution.completedAt = new Date();
      }
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.error = error instanceof Error ? error.message : String(error);
    }

    return execution;
  }

  /**
   * Execute single runbook step
   */
  private async executeStep(
    step: RunbookStep,
    context: RunbookContext
  ): Promise<StepExecutionResult> {
    const startTime = Date.now();

    try {
      // Check timeout
      const result = await Promise.race([
        this.performStep(step, context),
        this.createTimeoutPromise(this.config.timeout)
      ]);

      return {
        stepId: step.id,
        success: true,
        output: result,
        duration: Date.now() - startTime,
        executedAt: new Date(startTime)
      };
    } catch (error) {
      // Check if we should retry
      if (step.retryOnFailure && step.retries && step.retries > 0) {
        for (let i = 0; i < step.retries; i++) {
          try {
            const result = await Promise.race([
              this.performStep(step, context),
              this.createTimeoutPromise(this.config.timeout)
            ]);

            return {
              stepId: step.id,
              success: true,
              output: result,
              duration: Date.now() - startTime,
              executedAt: new Date(startTime)
            };
          } catch {
            // Continue to next retry
          }
        }
      }

      return {
        stepId: step.id,
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        executedAt: new Date(startTime)
      };
    }
  }

  /**
   * Perform step action
   */
  private async performStep(
    step: RunbookStep,
    context: RunbookContext
  ): Promise<unknown> {
    switch (step.type) {
      case 'script':
        return this.executeScript(step, context);

      case 'http-request':
        return this.executeHttpRequest(step, context);

      case 'command':
        return this.executeCommand(step, context);

      case 'notification':
        return this.sendNotification(step, context);

      case 'manual':
        return this.waitForManualApproval(step, context);

      case 'delay':
        return this.executeDelay(step);

      default:
        throw new Error(`Unknown step type: ${(step as any).type}`);
    }
  }

  /**
   * Execute script step
   */
  private async executeScript(step: RunbookStep, context: RunbookContext): Promise<unknown> {
    // In real implementation, this would execute the script in a sandboxed environment
    return { scriptExecuted: true, context: context.variables };
  }

  /**
   * Execute HTTP request step
   */
  private async executeHttpRequest(step: RunbookStep, context: RunbookContext): Promise<unknown> {
    const url = this.interpolateTemplate(step.config?.url as string, context);
    const method = step.config?.method || 'GET';

    const response = await fetch(url, {
      method,
      headers: step.config?.headers as Record<string, string>,
      body: step.config?.body ? JSON.stringify(step.config.body) : undefined
    });

    return {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    };
  }

  /**
   * Execute command step
   */
  private async executeCommand(step: RunbookStep, context: RunbookContext): Promise<unknown> {
    const { exec } = await import('child_process');
    const execAsync = (cmd: string) => new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve({ stdout, stderr });
      });
    });

    const command = this.interpolateTemplate(step.config?.command as string, context);
    return await execAsync(command);
  }

  /**
   * Send notification step
   */
  private async sendNotification(step: RunbookStep, context: RunbookContext): Promise<unknown> {
    const message = this.interpolateTemplate(step.config?.message as string, context);
    const channel = step.config?.channel || 'default';

    return {
      sent: true,
      channel,
      message
    };
  }

  /**
   * Wait for manual approval
   */
  private async waitForManualApproval(step: RunbookStep, context: RunbookContext): Promise<unknown> {
    if (!this.config.allowManualApproval) {
      throw new Error('Manual approval not allowed');
    }

    // In real implementation, this would wait for user input
    // For now, return a pending status
    return {
      status: 'pending-approval',
      message: step.config?.message || 'Awaiting manual approval'
    };
  }

  /**
   * Execute delay step
   */
  private async executeDelay(step: RunbookStep): Promise<unknown> {
    const delay = step.config?.duration || 5000;
    await new Promise(resolve => setTimeout(resolve, delay));
    return { delayed: delay };
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): RunbookExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get executions for incident
   */
  getExecutionsForIncident(incidentId: string): RunbookExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.incidentId === incidentId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Approve manual step
   */
  async approveStep(executionId: string, stepId: string, approvedBy: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'awaiting-approval') {
      return false;
    }

    // Continue execution after approval
    // In real implementation, this would resume the runbook
    return true;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const executions = Array.from(this.executions.values());

    return {
      totalRunbooks: this.runbooks.size,
      totalExecutions: executions.length,
      byStatus: {
        running: executions.filter(e => e.status === 'running').length,
        completed: executions.filter(e => e.status === 'completed').length,
        failed: executions.filter(e => e.status === 'failed').length,
        'awaiting-approval': executions.filter(e => e.status === 'awaiting-approval').length
      },
      averageStepsPerExecution: executions.length > 0
        ? executions.reduce((sum, e) => sum + e.steps.length, 0) / executions.length
        : 0,
      successRate: executions.length > 0
        ? executions.filter(e => e.status === 'completed').length / executions.length
        : 0
    };
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Step execution timeout')), timeout);
    });
  }

  /**
   * Interpolate template with context variables
   */
  private interpolateTemplate(template: string, context: RunbookContext): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return String(context.variables[key] ?? '');
    });
  }
}

/**
 * Predefined runbooks for common incident types
 */
export class DefaultRunbooks {
  static securityIncident(): Runbook {
    return {
      id: 'security-incident',
      name: 'Security Incident Response',
      description: 'Runbook for handling security-related incidents',
      incidentTypes: ['security'],
      severities: ['critical', 'high'],
      steps: [
        {
          id: 'notify-team',
          name: 'Notify Security Team',
          type: 'notification',
          config: {
            channel: 'security-team',
            message: 'Security incident detected: {{incidentId}}'
          },
          requiresApproval: false,
          continueOnFailure: false
        },
        {
          id: 'isolate-system',
          name: 'Isolate Affected System',
          type: 'command',
          config: {
            command: 'isolate-system --target {{affectedSystem}}'
          },
          requiresApproval: true,
          continueOnFailure: true,
          retries: 2,
          retryOnFailure: true
        },
        {
          id: 'gather-evidence',
          name: 'Gather Forensic Evidence',
          type: 'script',
          config: {
            script: 'collect-evidence.sh'
          },
          requiresApproval: false,
          continueOnFailure: false
        }
      ]
    };
  }

  static performanceDegradation(): Runbook {
    return {
      id: 'performance-incident',
      name: 'Performance Degradation Response',
      description: 'Runbook for handling performance incidents',
      incidentTypes: ['performance'],
      severities: ['high', 'medium'],
      steps: [
        {
          id: 'check-metrics',
          name: 'Check System Metrics',
          type: 'http-request',
          config: {
            url: 'http://monitoring/api/metrics',
            method: 'GET'
          },
          requiresApproval: false,
          continueOnFailure: true
        },
        {
          id: 'scale-up',
          name: 'Scale Up Resources',
          type: 'command',
          config: {
            command: 'kubectl scale deployment --replicas={{newReplicas}}'
          },
          requiresApproval: true,
          continueOnFailure: true
        },
        {
          id: 'verify-resolution',
          name: 'Verify Resolution',
          type: 'delay',
          config: {
            duration: 30000
          },
          requiresApproval: false,
          continueOnFailure: false
        }
      ]
    };
  }
}
