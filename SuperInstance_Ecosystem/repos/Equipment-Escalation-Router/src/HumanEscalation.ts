/**
 * HumanEscalation - Handle human-in-loop escalation
 * 
 * Manages escalation to human operators for high-stakes decisions
 */

import { RoutingTier } from './EscalationRouter';

/**
 * Escalation priority levels
 */
export type EscalationPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Escalation request
 */
export interface EscalationRequest {
  id: string;
  query: string;
  context?: Record<string, unknown>;
  reason: string;
  priority: EscalationPriority;
  createdAt: Date;
  metadata?: Record<string, unknown>;
  estimatedCost: number;
}

/**
 * Escalation response
 */
export interface EscalationResponse {
  id: string;
  requestId: string;
  status: 'pending' | 'approved' | 'rejected' | 'timeout' | 'escalated-further';
  resolution?: string;
  respondedBy?: string;
  respondedAt?: Date;
  notes?: string;
  alternatives?: Array<{
    action: string;
    description: string;
  }>;
}

/**
 * Human operator
 */
export interface HumanOperator {
  id: string;
  name: string;
  roles: string[];
  available: boolean;
  currentLoad: number;
  maxLoad: number;
  specializations: string[];
}

/**
 * HumanEscalation configuration
 */
export interface HumanEscalationConfig {
  approvalTimeoutMs: number;
  maxPendingRequests: number;
  enableAutoEscalation: boolean;
  notificationChannels?: string[];
  onEscalation?: (request: EscalationRequest) => void;
  onResponse?: (response: EscalationResponse) => void;
}

/**
 * Escalation queue item
 */
interface QueueItem {
  request: EscalationRequest;
  status: 'pending' | 'assigned' | 'resolved';
  assignedTo?: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * HumanEscalation class
 * Manages escalation to human operators
 */
export class HumanEscalation {
  private config: HumanEscalationConfig;
  private pendingQueue: Map<string, QueueItem>;
  private resolvedRequests: Map<string, EscalationResponse>;
  private operators: Map<string, HumanOperator>;
  private metrics: {
    totalEscalations: number;
    approved: number;
    rejected: number;
    timeouts: number;
    averageResponseTimeMs: number;
  };

  constructor(config: Partial<HumanEscalationConfig> = {}) {
    this.config = {
      approvalTimeoutMs: 30 * 60 * 1000, // 30 minutes default
      maxPendingRequests: 100,
      enableAutoEscalation: true,
      ...config
    };
    this.pendingQueue = new Map();
    this.resolvedRequests = new Map();
    this.operators = new Map();
    this.metrics = {
      totalEscalations: 0,
      approved: 0,
      rejected: 0,
      timeouts: 0,
      averageResponseTimeMs: 0
    };
  }

  /**
   * Request human escalation
   */
  async request(escalationRequest: EscalationRequest): Promise<EscalationResponse> {
    // Check queue capacity
    if (this.pendingQueue.size >= this.config.maxPendingRequests) {
      throw new Error('Escalation queue is full. Please try again later.');
    }

    // Create queue item
    const queueItem: QueueItem = {
      request: escalationRequest,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.approvalTimeoutMs)
    };

    this.pendingQueue.set(escalationRequest.id, queueItem);
    this.metrics.totalEscalations++;

    // Find available operator
    const operator = this.findAvailableOperator(escalationRequest);
    if (operator) {
      queueItem.status = 'assigned';
      queueItem.assignedTo = operator.id;
      operator.currentLoad++;
    }

    // Trigger notification callback
    if (this.config.onEscalation) {
      this.config.onEscalation(escalationRequest);
    }

    // Start timeout monitoring
    this.monitorTimeout(escalationRequest.id);

    // Return pending response
    return {
      id: this.generateResponseId(),
      requestId: escalationRequest.id,
      status: 'pending',
      alternatives: this.generateAlternatives(escalationRequest)
    };
  }

  /**
   * Check status of an escalation request
   */
  async checkStatus(requestId: string): Promise<EscalationResponse> {
    const pending = this.pendingQueue.get(requestId);
    if (pending) {
      return {
        id: this.generateResponseId(),
        requestId,
        status: pending.status === 'assigned' ? 'pending' : 'pending',
        notes: pending.assignedTo 
          ? `Assigned to operator ${pending.assignedTo}` 
          : 'Waiting for operator assignment'
      };
    }

    const resolved = this.resolvedRequests.get(requestId);
    if (resolved) {
      return resolved;
    }

    throw new Error(`Escalation request ${requestId} not found`);
  }

  /**
   * Resolve an escalation request
   */
  async resolve(requestId: string, resolution: {
    status: 'approved' | 'rejected';
    resolution: string;
    respondedBy: string;
    notes?: string;
  }): Promise<EscalationResponse> {
    const pending = this.pendingQueue.get(requestId);
    if (!pending) {
      throw new Error(`Escalation request ${requestId} not found or already resolved`);
    }

    // Update operator load
    if (pending.assignedTo) {
      const operator = this.operators.get(pending.assignedTo);
      if (operator) {
        operator.currentLoad = Math.max(0, operator.currentLoad - 1);
      }
    }

    // Create response
    const response: EscalationResponse = {
      id: this.generateResponseId(),
      requestId,
      status: resolution.status,
      resolution: resolution.resolution,
      respondedBy: resolution.respondedBy,
      respondedAt: new Date(),
      notes: resolution.notes
    };

    // Update metrics
    const responseTime = response.respondedAt!.getTime() - pending.createdAt.getTime();
    this.metrics.averageResponseTimeMs = 
      (this.metrics.averageResponseTimeMs * (this.metrics.approved + this.metrics.rejected) + responseTime) /
      (this.metrics.approved + this.metrics.rejected + 1);

    if (resolution.status === 'approved') {
      this.metrics.approved++;
    } else {
      this.metrics.rejected++;
    }

    // Move to resolved
    this.pendingQueue.delete(requestId);
    this.resolvedRequests.set(requestId, response);

    // Trigger callback
    if (this.config.onResponse) {
      this.config.onResponse(response);
    }

    return response;
  }

  /**
   * Cancel a pending escalation
   */
  async cancel(requestId: string, reason: string): Promise<void> {
    const pending = this.pendingQueue.get(requestId);
    if (!pending) {
      throw new Error(`Escalation request ${requestId} not found`);
    }

    // Update operator load
    if (pending.assignedTo) {
      const operator = this.operators.get(pending.assignedTo);
      if (operator) {
        operator.currentLoad = Math.max(0, operator.currentLoad - 1);
      }
    }

    this.pendingQueue.delete(requestId);
  }

  /**
   * Register a human operator
   */
  registerOperator(operator: HumanOperator): void {
    this.operators.set(operator.id, operator);
  }

  /**
   * Unregister a human operator
   */
  unregisterOperator(operatorId: string): void {
    const operator = this.operators.get(operatorId);
    if (operator) {
      // Reassign their pending requests
      for (const [_, item] of this.pendingQueue.entries()) {
        if (item.assignedTo === operatorId) {
          item.assignedTo = undefined;
          item.status = 'pending';
          
          // Try to reassign
          const newOperator = this.findAvailableOperator(item.request);
          if (newOperator) {
            item.assignedTo = newOperator.id;
            item.status = 'assigned';
            newOperator.currentLoad++;
          }
        }
      }
      
      this.operators.delete(operatorId);
    }
  }

  /**
   * Update operator availability
   */
  updateOperatorAvailability(operatorId: string, available: boolean): void {
    const operator = this.operators.get(operatorId);
    if (operator) {
      operator.available = available;
    }
  }

  /**
   * Get escalation metrics
   */
  getMetrics(): typeof this.metrics & {
    pendingCount: number;
    resolvedCount: number;
    operatorCount: number;
    availableOperators: number;
  } {
    return {
      ...this.metrics,
      pendingCount: this.pendingQueue.size,
      resolvedCount: this.resolvedRequests.size,
      operatorCount: this.operators.size,
      availableOperators: Array.from(this.operators.values()).filter(o => o.available).length
    };
  }

  /**
   * Get pending escalations
   */
  getPendingEscalations(): Array<{
    id: string;
    query: string;
    priority: EscalationPriority;
    createdAt: Date;
    assignedTo?: string;
    timeRemainingMs: number;
  }> {
    const now = Date.now();
    return Array.from(this.pendingQueue.entries()).map(([id, item]) => ({
      id,
      query: item.request.query,
      priority: item.request.priority,
      createdAt: item.createdAt,
      assignedTo: item.assignedTo,
      timeRemainingMs: Math.max(0, item.expiresAt.getTime() - now)
    }));
  }

  /**
   * Generate escalation report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const lines: string[] = [
      '=== Human Escalation Report ===',
      '',
      'Summary:',
      `  Total Escalations: ${metrics.totalEscalations}`,
      `  Approved: ${metrics.approved}`,
      `  Rejected: ${metrics.rejected}`,
      `  Timeouts: ${metrics.timeouts}`,
      `  Pending: ${metrics.pendingCount}`,
      '',
      'Performance:',
      `  Average Response Time: ${(metrics.averageResponseTimeMs / 60000).toFixed(1)} minutes`,
      `  Approval Rate: ${metrics.totalEscalations > 0 ? ((metrics.approved / metrics.totalEscalations) * 100).toFixed(1) : 0}%`,
      '',
      'Operators:',
      `  Total: ${metrics.operatorCount}`,
      `  Available: ${metrics.availableOperators}`,
      ''
    ];

    return lines.join('\n');
  }

  /**
   * Find available operator for a request
   */
  private findAvailableOperator(request: EscalationRequest): HumanOperator | null {
    const availableOperators = Array.from(this.operators.values())
      .filter(op => op.available && op.currentLoad < op.maxLoad);

    if (availableOperators.length === 0) {
      return null;
    }

    // Prioritize by specialization match and current load
    const scored = availableOperators.map(op => {
      let score = 100 - (op.currentLoad / op.maxLoad) * 50;
      
      // Check specialization match
      if (request.metadata?.category) {
        const hasSpecialization = op.specializations.some(s => 
          s.toLowerCase() === (request.metadata?.category as string).toLowerCase()
        );
        if (hasSpecialization) {
          score += 30;
        }
      }

      // Priority bonus
      if (request.priority === 'critical') {
        // Prefer operators with more capacity for critical issues
        score += (op.maxLoad - op.currentLoad) * 5;
      }

      return { operator: op, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].operator;
  }

  /**
   * Generate alternative actions
   */
  private generateAlternatives(request: EscalationRequest): Array<{ action: string; description: string }> {
    const alternatives: Array<{ action: string; description: string }> = [];

    // Suggest deferring to brain tier with caveats
    alternatives.push({
      action: 'defer-to-brain',
      description: 'Use brain tier with lower confidence and human review later'
    });

    // Suggest requesting more information
    alternatives.push({
      action: 'request-info',
      description: 'Request additional information before proceeding'
    });

    // Context-specific alternatives
    if (request.metadata?.hasBudget) {
      alternatives.push({
        action: 'budget-conscious',
        description: 'Proceed with lower-cost option and monitor results'
      });
    }

    return alternatives;
  }

  /**
   * Monitor timeout for an escalation
   */
  private monitorTimeout(requestId: string): void {
    const timeoutMs = this.config.approvalTimeoutMs;
    
    setTimeout(async () => {
      const pending = this.pendingQueue.get(requestId);
      if (pending && pending.status !== 'resolved') {
        // Handle timeout
        this.metrics.timeouts++;

        const response: EscalationResponse = {
          id: this.generateResponseId(),
          requestId,
          status: 'timeout',
          notes: 'Escalation timed out without response'
        };

        this.pendingQueue.delete(requestId);
        this.resolvedRequests.set(requestId, response);

        // Auto-escalate if enabled
        if (this.config.enableAutoEscalation) {
          // Could implement escalation to higher authority here
          response.status = 'escalated-further';
          response.notes = 'Auto-escalated due to timeout';
        }

        if (this.config.onResponse) {
          this.config.onResponse(response);
        }
      }
    }, timeoutMs);
  }

  /**
   * Generate unique request ID
   */
  private generateResponseId(): string {
    return `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default HumanEscalation;
