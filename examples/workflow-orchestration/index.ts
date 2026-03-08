/**
 * Multi-Agent Workflow Orchestration Demo
 *
 * Demonstrates:
 * - Complex multi-step task decomposition
 * - Agent hand-offs with A2A packages
 * - Error recovery and retry logic
 * - Progress tracking and visualization
 */

import { Colony, PlinkoLayer } from '../../src/core/index.js';
import {
  IngestionAgent,
  ClassificationAgent,
  ExtractionAgent,
  ValidationAgent,
  EnrichmentAgent,
  QualityAgent,
  RoutingAgent,
  calculateAgentProposal,
} from './agents.js';
import {
  agentConfigs,
  sampleDocuments,
  workflowConfig,
  type Document,
  type ProcessingResult,
  type WorkflowMetrics,
  type WorkflowStage,
} from './config.js';
import type { AgentProposal } from '../../src/core/index.js';

// ============================================================================
// Workflow Orchestrator
// ============================================================================

class WorkflowOrchestrator {
  private colony: Colony;
  private plinko: PlinkoLayer;
  private agents: Map<string, any> = new Map();
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; state: 'closed' | 'open' | 'half-open' }> = new Map();

  // Statistics
  private stageMetrics: Map<WorkflowStage, { totalTime: number; count: number; failures: number }> = new Map();
  private agentMetrics: Map<string, { processed: number; successes: number; retries: number }> = new Map();
  private overallMetrics: WorkflowMetrics = {
    totalDocuments: 0,
    successful: 0,
    failed: 0,
    manualReview: 0,
    averageTime: 0,
    a2aPackages: 0,
    retries: 0,
  };

  constructor() {
    this.colony = new Colony(workflowConfig.colony);
    this.plinko = new PlinkoLayer(workflowConfig.plinko);

    // Initialize stage metrics
    workflowConfig.stages.forEach(stage => {
      this.stageMetrics.set(stage, { totalTime: 0, count: 0, failures: 0 });
    });
  }

  /**
   * Initialize the workflow system
   */
  async initialize(): Promise<void> {
    console.log('Multi-Agent Workflow Orchestration');
    console.log('====================================\n');
    console.log(`Initializing workflow colony with ${agentConfigs.length} agents...`);

    // Create agents
    const agentClasses = [
      { config: agentConfigs[0], class: IngestionAgent },
      { config: agentConfigs[1], class: ClassificationAgent },
      { config: agentConfigs[2], class: ExtractionAgent },
      { config: agentConfigs[3], class: ValidationAgent },
      { config: agentConfigs[4], class: EnrichmentAgent },
      { config: agentConfigs[5], class: QualityAgent },
      { config: agentConfigs[6], class: RoutingAgent },
    ];

    for (const { config, class: AgentClass } of agentClasses) {
      const agent = new AgentClass(config);
      await agent.initialize();
      this.colony.registerAgent(config);
      this.agents.set(config.id, agent);
      this.circuitBreakers.set(config.id, { failures: 0, lastFailure: 0, state: 'closed' });
      this.agentMetrics.set(config.id, { processed: 0, successes: 0, retries: 0 });

      const agentName = config.typeId.replace('Agent', '');
      console.log(`  ${config.typeId} - ${this.getStageDescription(agentName)}`);
    }

    console.log();
  }

  /**
   * Get stage description
   */
  private getStageDescription(agentName: string): string {
    const descriptions: Record<string, string> = {
      Ingestion: 'Document intake and validation',
      Classification: 'Document categorization',
      Extraction: 'Data extraction',
      Validation: 'Business rule validation',
      Enrichment: 'Data enrichment',
      Quality: 'Quality assurance',
      Routing: 'Document routing',
    };
    return descriptions[agentName] || 'Processing';
  }

  /**
   * Check circuit breaker state
   */
  private checkCircuitBreaker(agentId: string): boolean {
    const breaker = this.circuitBreakers.get(agentId);
    if (!breaker) return true;

    if (breaker.state === 'open') {
      // Check if we should try half-open
      const timeSinceFailure = Date.now() - breaker.lastFailure;
      if (timeSinceFailure > workflowConfig.circuitBreaker.resetTimeout) {
        breaker.state = 'half-open';
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Record circuit breaker failure
   */
  private recordCircuitBreakerFailure(agentId: string): void {
    const breaker = this.circuitBreakers.get(agentId);
    if (!breaker) return;

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= workflowConfig.circuitBreaker.failureThreshold) {
      breaker.state = 'open';
      console.log(`      [CIRCUIT BREAKER OPEN] ${agentId} has failed ${breaker.failures} times`);
    }
  }

  /**
   * Record circuit breaker success
   */
  private recordCircuitBreakerSuccess(agentId: string): void {
    const breaker = this.circuitBreakers.get(agentId);
    if (!breaker) return;

    if (breaker.state === 'half-open') {
      breaker.state = 'closed';
      breaker.failures = 0;
    }
  }

  /**
   * Process a document through the workflow
   */
  async processDocument(document: Document): Promise<void> {
    const documentStartTime = Date.now();
    let a2aCount = 0;
    let documentFailed = false;
    let manualReview = false;
    let currentDocument = document;

    console.log(`\nDocument: ${document.filename}`);
    console.log(''.padEnd(60, '-'));

    // Process through each stage
    for (let i = 0; i < workflowConfig.stages.length; i++) {
      const stage = workflowConfig.stages[i];
      const stageNum = i + 1;

      // Map stage to agent
      const agentId = this.getAgentForStage(stage);
      const agent = this.agents.get(agentId);

      if (!agent) {
        console.log(`  Stage ${stageNum}/${workflowConfig.stages.length}: ${stage}`);
        console.log(`    ERROR: No agent found for stage`);
        documentFailed = true;
        break;
      }

      // Check circuit breaker
      if (!this.checkCircuitBreaker(agentId)) {
        console.log(`  Stage ${stageNum}/${workflowConfig.stages.length}: ${stage}`);
        console.log(`    SKIPPED: Circuit breaker open for ${agentId}`);
        documentFailed = true;
        break;
      }

      console.log(`  Stage ${stageNum}/${workflowConfig.stages.length}: ${stage}`);
      console.log(`    Agent: ${agent.config.typeId}`);

      // Process with retry logic
      const result = await this.processWithRetry(agent, currentDocument, stage);

      a2aCount++;

      // Update metrics
      this.updateStageMetrics(stage, result);
      this.updateAgentMetrics(agentId, result);

      // Display result
      this.displayStageResult(result);

      // Check if processing should stop
      if (!result.success) {
        if (result.retryCount && result.retryCount < workflowConfig.retryPolicy.maxRetries) {
          // Retry
          console.log(`    Retry ${result.retryCount + 1}/${workflowConfig.retryPolicy.maxRetries}...`);
          console.log();
          i--; // Retry this stage
          continue;
        } else {
          // Failed or needs manual review
          if (result.errors && result.errors.some(e => e.includes('Missing required'))) {
            manualReview = true;
            console.log(`    Workflow halted: validation failed`);
            console.log(`    Document routed to: MANUAL_REVIEW_QUEUE`);
            break;
          } else {
            documentFailed = true;
            console.log(`    Workflow halted: processing failed`);
            break;
          }
        }
      }

      // Update document for next stage
      if (result.data) {
        currentDocument = {
          ...currentDocument,
          metadata: {
            ...currentDocument.metadata,
            ...result.data,
          },
        };
      }

      // Check if we should continue
      if (stage === 'ROUTING') {
        break; // End of workflow
      }

      console.log();
    }

    // Update overall metrics
    const totalTime = Date.now() - documentStartTime;
    this.overallMetrics.totalDocuments++;
    this.overallMetrics.a2aPackages += a2aCount;

    if (documentFailed) {
      this.overallMetrics.failed++;
    } else if (manualReview) {
      this.overallMetrics.manualReview++;
    } else {
      this.overallMetrics.successful++;
    }

    console.log(`  Total: ${totalTime}ms | A2A packages: ${a2aCount} | Retries: ${this.getDocumentRetries(a2aCount)}`);
  }

  /**
   * Get agent ID for a stage
   */
  private getAgentForStage(stage: WorkflowStage): string {
    const stageToAgent: Record<WorkflowStage, string> = {
      INGESTION: 'ingestion-agent',
      CLASSIFICATION: 'classification-agent',
      EXTRACTION: 'extraction-agent',
      VALIDATION: 'validation-agent',
      ENRICHMENT: 'enrichment-agent',
      QUALITY: 'quality-agent',
      ROUTING: 'routing-agent',
    };
    return stageToAgent[stage];
  }

  /**
   * Process with retry logic
   */
  private async processWithRetry(
    agent: any,
    document: Document,
    stage: WorkflowStage
  ): Promise<ProcessingResult> {
    const timeout = workflowConfig.timeoutSettings[stage];
    const maxRetries = workflowConfig.retryPolicy.maxRetries;
    const initialDelay = workflowConfig.retryPolicy.initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Process document
        const response = await agent.process(JSON.stringify(document));
        const result: ProcessingResult = JSON.parse(response.payload);

        // Add retry count if retried
        if (attempt > 0) {
          result.retryCount = attempt;
        }

        // Update circuit breaker
        if (result.success) {
          this.recordCircuitBreakerSuccess(agent.config.id);
        } else {
          this.recordCircuitBreakerFailure(agent.config.id);
        }

        return result;
      } catch (error) {
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(
            initialDelay * Math.pow(workflowConfig.retryPolicy.backoffMultiplier, attempt),
            workflowConfig.retryPolicy.maxDelay
          );
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Final attempt failed
        this.recordCircuitBreakerFailure(agent.config.id);

        return {
          stage,
          agentId: agent.config.id,
          success: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          processingTime: timeout,
          retryCount: attempt,
        };
      }
    }

    // Should not reach here
    return {
      stage,
      agentId: agent.config.id,
      success: false,
      errors: ['Max retries exceeded'],
      processingTime: 0,
    };
  }

  /**
   * Update stage metrics
   */
  private updateStageMetrics(stage: WorkflowStage, result: ProcessingResult): void {
    const metrics = this.stageMetrics.get(stage);
    if (!metrics) return;

    metrics.totalTime += result.processingTime;
    metrics.count++;
    if (!result.success) {
      metrics.failures++;
    }
  }

  /**
   * Update agent metrics
   */
  private updateAgentMetrics(agentId: string, result: ProcessingResult): void {
    const metrics = this.agentMetrics.get(agentId);
    if (!metrics) return;

    metrics.processed++;
    if (result.success) {
      metrics.successes++;
    }
    if (result.retryCount) {
      metrics.retries += result.retryCount;
    }
  }

  /**
   * Display stage result
   */
  private displayStageResult(result: ProcessingResult): void {
    if (result.success) {
      if (result.data) {
        if (result.data.classification) {
          console.log(`    Result: ${result.data.classification}`);
          if (result.data.confidence !== undefined) {
            console.log(`    Confidence: ${result.data.confidence.toFixed(2)}`);
          }
        } else if (result.data.qualityScore !== undefined) {
          const score = result.data.qualityScore as number;
          console.log(`    Result: Quality score: ${score.toFixed(2)} (${result.data.qualityRating})`);
        } else if (result.data.destination) {
          console.log(`    Result: Routed to ${result.data.destination}`);
          console.log(`    Reason: ${result.data.reason}`);
        } else if (result.data.fieldCount !== undefined) {
          console.log(`    Result: Extracted ${result.data.fieldCount} fields`);
        } else {
          console.log(`    Result: Accepted`);
        }
      }

      if (result.warnings && result.warnings.length > 0) {
        console.log(`    Warnings: ${result.warnings.join(', ')}`);
      }
    } else {
      console.log(`    ERROR: ${result.errors?.join(', ') || 'Processing failed'}`);
    }

    console.log(`    Time: ${result.processingTime}ms`);
  }

  /**
   * Get document retries from A2A count
   */
  private getDocumentRetries(a2aCount: number): number {
    let retries = 0;
    for (const metrics of this.agentMetrics.values()) {
      retries += metrics.retries;
    }
    return retries;
  }

  /**
   * Display final statistics
   */
  displayStatistics(): void {
    console.log('\nPipeline Statistics:');
    console.log('  Documents processed:', this.overallMetrics.totalDocuments);
    console.log(`  Successful: ${this.overallMetrics.successful} (${((this.overallMetrics.successful / this.overallMetrics.totalDocuments) * 100).toFixed(0)}%)`);
    console.log(`  Failed: ${this.overallMetrics.failed} (${((this.overallMetrics.failed / this.overallMetrics.totalDocuments) * 100).toFixed(0)}%)`);
    console.log(`  Manual review: ${this.overallMetrics.manualReview} (${((this.overallMetrics.manualReview / this.overallMetrics.totalDocuments) * 100).toFixed(0)}%)`);

    const avgTime = this.calculateAverageTime();
    console.log(`  Average time: ${avgTime}ms`);
    console.log(`  A2A packages created: ${this.overallMetrics.a2aPackages}`);

    let totalRetries = 0;
    for (const metrics of this.agentMetrics.values()) {
      totalRetries += metrics.retries;
    }
    console.log(`  Retries attempted: ${totalRetries}`);

    // Stage performance
    console.log('\nStage Performance:');
    const stagePerformance: Array<{ stage: string; avgTime: number; successRate: string }> = [];

    for (const [stage, metrics] of this.stageMetrics.entries()) {
      if (metrics.count > 0) {
        const avgTime = Math.round(metrics.totalTime / metrics.count);
        const successRate = (((metrics.count - metrics.failures) / metrics.count) * 100).toFixed(0);
        stagePerformance.push({ stage, avgTime, successRate: `${successRate}%` });
      }
    }

    stagePerformance.sort((a, b) => b.avgTime - a.avgTime);

    for (const perf of stagePerformance) {
      const bottleneck = perf.avgTime > 500 ? ' (bottleneck)' : '';
      console.log(`  ${perf.stage}: ${perf.avgTime}ms avg, ${perf.successRate} success${bottleneck}`);
    }

    // Agent performance
    console.log('\nAgent Performance:');
    const agentPerformance: Array<{ name: string; processed: number; successes: number; retries: number }> = [];

    for (const [agentId, metrics] of this.agentMetrics.entries()) {
      const agent = this.agents.get(agentId);
      if (agent && metrics.processed > 0) {
        agentPerformance.push({
          name: agent.config.typeId,
          processed: metrics.processed,
          successes: metrics.successes,
          retries: metrics.retries,
        });
      }
    }

    agentPerformance.sort((a, b) => b.processed - a.processed);

    for (const perf of agentPerformance) {
      const successRate = ((perf.successes / perf.processed) * 100).toFixed(0);
      console.log(`  ${perf.name}: ${perf.processed}/${perf.processed} processed, ${successRate}% success, ${perf.retries} retries`);
    }

    console.log();
  }

  /**
   * Calculate average processing time
   */
  private calculateAverageTime(): number {
    if (this.overallMetrics.totalDocuments === 0) return 0;

    let totalTime = 0;
    for (const metrics of this.stageMetrics.values()) {
      totalTime += metrics.totalTime;
    }

    return Math.round(totalTime / this.overallMetrics.totalDocuments);
  }

  /**
   * Shutdown the workflow system
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down...');

    for (const [_, agent] of this.agents) {
      await agent.shutdown();
    }

    console.log();
  }
}

// ============================================================================
// Demo Runner
// ============================================================================

async function runDemo(): Promise<void> {
  const orchestrator = new WorkflowOrchestrator();

  try {
    // Initialize
    await orchestrator.initialize();

    // Process documents
    console.log(`Processing ${sampleDocuments.length} documents through workflow pipeline...\n`);

    for (const document of sampleDocuments) {
      await orchestrator.processDocument(document);

      // Small delay between documents
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Display statistics
    orchestrator.displayStatistics();

    console.log('Demo complete!');

  } finally {
    await orchestrator.shutdown();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}

export { runDemo };
