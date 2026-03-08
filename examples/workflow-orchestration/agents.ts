/**
 * Workflow Agent Implementations
 * Specialized agents for document processing pipeline
 */

import {
  BaseAgent,
  type A2APackage,
  type AgentProposal,
  type ProcessingResult,
} from '../../src/core/index.js';
import type { Document, ProcessingResult as WorkflowResult } from './config.js';

// ============================================================================
// Base Workflow Agent
// ============================================================================

abstract class BaseWorkflowAgent extends BaseAgent {
  protected stageName: string;
  protected processingTimes: number[] = [];

  constructor(config: any, stageName: string) {
    super(config);
    this.stageName = stageName;
  }

  /**
   * Calculate bid based on document characteristics
   */
  calculateBid(document: Document): number {
    // Base bid on agent type and document characteristics
    let bid = 0.5;

    // Adjust based on document type match
    if (this.canHandleDocument(document)) {
      bid += 0.3;
    }

    // Adjust based on recent performance
    const avgTime = this.getAverageProcessingTime();
    if (avgTime > 0) {
      // Faster agents bid higher
      bid += Math.max(0, 0.2 - avgTime / 10000);
    }

    return Math.min(1.0, bid);
  }

  /**
   * Calculate confidence for this document
   */
  calculateConfidence(document: Document): number {
    let confidence = 0.6;

    // Increase confidence for familiar document types
    if (this.canHandleDocument(document)) {
      confidence = 0.85;
    }

    // Adjust for document size (smaller = more confident)
    if (document.size < 1024 * 1024) {
      confidence += 0.1;
    } else if (document.size > 5 * 1024 * 1024) {
      confidence -= 0.15;
    }

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  /**
   * Check if agent can handle this document type
   */
  protected abstract canHandleDocument(document: Document): boolean;

  /**
   * Process document at this stage
   */
  protected abstract processDocument(document: Document): WorkflowResult;

  /**
   * Record processing time
   */
  protected recordProcessingTime(time: number): void {
    this.processingTimes.push(time);
    if (this.processingTimes.length > 50) {
      this.processingTimes.shift();
    }
  }

  /**
   * Get average processing time
   */
  protected getAverageProcessingTime(): number {
    if (this.processingTimes.length === 0) return 0;
    const sum = this.processingTimes.reduce((a, b) => a + b, 0);
    return sum / this.processingTimes.length;
  }

  /**
   * Main process method
   */
  async process(input: string): Promise<A2APackage> {
    const document = JSON.parse(input) as Document;
    const startTime = Date.now();

    try {
      const result = this.processDocument(document);
      const processingTime = Date.now() - startTime;

      this.recordProcessingTime(processingTime);

      return {
        id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        senderId: this.config.id,
        receiverId: 'orchestrator',
        timestamp: Date.now(),
        payload: JSON.stringify(result),
        parentIds: [],
        causalChainId: `chain-${document.id}`,
        metadata: {
          stage: this.stageName,
          processingTime,
          documentId: document.id,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      return {
        id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        senderId: this.config.id,
        receiverId: 'orchestrator',
        timestamp: Date.now(),
        payload: JSON.stringify({
          stage: this.stageName,
          agentId: this.config.id,
          success: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          processingTime,
        }),
        parentIds: [],
        causalChainId: `chain-${document.id}`,
        metadata: {
          stage: this.stageName,
          processingTime,
          documentId: document.id,
          error: true,
        },
      };
    }
  }
}

// ============================================================================
// Ingestion Agent
// ============================================================================

export class IngestionAgent extends BaseWorkflowAgent {
  constructor(config: any) {
    super(config, 'INGESTION');
  }

  protected canHandleDocument(document: Document): boolean {
    // Can handle all document types
    return true;
  }

  protected processDocument(document: Document): WorkflowResult {
    const startTime = Date.now();

    // Validate document format and integrity
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    if (document.size > 10 * 1024 * 1024) {
      errors.push('Document too large (max 10MB)');
    }

    // Check checksum
    if (!document.checksum || document.checksum.length < 10) {
      errors.push('Invalid checksum');
    }

    // Check content
    if (!document.content || document.content.length === 0) {
      errors.push('Empty document content');
    }

    const success = errors.length === 0;

    // Add format info to warnings
    const format = document.metadata.format as string;
    if (format && ['PDF', 'DOCX', 'TXT'].includes(format.toUpperCase())) {
      warnings.push(`Format: ${format.toUpperCase()}`);
    }

    return {
      stage: this.stageName,
      agentId: this.config.id,
      success,
      data: success ? {
        filename: document.filename,
        size: document.size,
        format: document.metadata.format,
        validated: true,
      } : undefined,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      processingTime: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Classification Agent
// ============================================================================

export class ClassificationAgent extends BaseWorkflowAgent {
  constructor(config: any) {
    super(config, 'CLASSIFICATION');
  }

  protected canHandleDocument(document: Document): boolean {
    // Can classify all documents
    return true;
  }

  protected processDocument(document: Document): WorkflowResult {
    const startTime = Date.now();

    // Classify document based on content
    const content = document.content.toLowerCase();
    let detectedType: Document['type'] = 'general';
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    let confidence = 0.7;

    // Classification rules
    if (content.includes('invoice') || content.includes('payment') || content.includes('amount')) {
      detectedType = 'financial';
      priority = 'high';
      confidence = 0.92;
    } else if (content.includes('contract') || content.includes('agreement') || content.includes('legal')) {
      detectedType = 'legal';
      priority = 'medium';
      confidence = 0.88;
    } else if (content.includes('technical') || content.includes('specification') || content.includes('architecture')) {
      detectedType = 'technical';
      priority = 'medium';
      confidence = 0.85;
    } else if (content.includes('employee') || content.includes('onboarding') || content.includes('hr')) {
      detectedType = 'hr';
      priority = 'low';
      confidence = 0.90;
    }

    // Urgent keywords
    if (content.includes('urgent') || content.includes('asap') || content.includes('immediately')) {
      priority = 'urgent';
    }

    return {
      stage: this.stageName,
      agentId: this.config.id,
      success: true,
      data: {
        type: detectedType,
        priority,
        confidence,
        classification: `${detectedType.toUpperCase()} | ${priority.toUpperCase()}_PRIORITY`,
      },
      processingTime: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Extraction Agent
// ============================================================================

export class ExtractionAgent extends BaseWorkflowAgent {
  private extractionAttempts = new Map<string, number>();

  constructor(config: any) {
    super(config, 'EXTRACTION');
  }

  protected canHandleDocument(document: Document): boolean {
    // Prefers structured documents
    return ['financial', 'technical'].includes(document.type);
  }

  protected processDocument(document: Document): WorkflowResult {
    const startTime = Date.now();

    // Track extraction attempts
    const attempts = this.extractionAttempts.get(document.id) || 0;
    this.extractionAttempts.set(document.id, attempts + 1);

    const errors: string[] = [];
    const warnings: string[] = [];
    let extractedFields: Record<string, unknown> = {};

    // Simulate extraction with potential failures
    if (document.filename.includes('contract') && attempts === 0) {
      // First attempt on contracts fails
      errors.push('OCR timeout - text extraction incomplete');
      return {
        stage: this.stageName,
        agentId: this.config.id,
        success: false,
        errors,
        processingTime: 1200,
        retryCount: attempts,
      };
    }

    // Extract fields based on document type
    const content = document.content.toLowerCase();

    if (document.type === 'financial') {
      extractedFields = {
        vendor: this.extractVendor(content),
        amount: this.extractAmount(content),
        date: this.extractDate(content),
        invoiceNumber: this.extractInvoiceNumber(content),
        lineItems: this.extractLineItems(content),
      };
    } else if (document.type === 'legal') {
      if (attempts > 0) {
        warnings.push('Partial extraction - some fields missing');
        extractedFields = {
          parties: this.extractParties(content),
          term: this.extractTerm(content),
        };
        errors.push('Missing key terms and conditions');
      } else {
        extractedFields = {
          parties: this.extractParties(content),
          effectiveDate: this.extractEffectiveDate(content),
          terminationClause: this.extractTerminationClause(content),
          terms: this.extractTerms(content),
        };
      }
    } else {
      extractedFields = {
        title: this.extractTitle(content),
        keywords: this.extractKeywords(content),
        summary: this.extractSummary(content),
      };
    }

    const fieldCount = Object.keys(extractedFields).length;

    // Check for duplicates
    if (fieldCount > 10) {
      warnings.push('duplicate_line_item');
    }

    // Check for unusual values
    if (extractedFields.taxRate && typeof extractedFields.taxRate === 'number' && extractedFields.taxRate > 0.15) {
      warnings.push('tax_rate unusually high');
    }

    return {
      stage: this.stageName,
      agentId: this.config.id,
      success: errors.length === 0,
      data: {
        extractedFields,
        fieldCount,
        extractionComplete: errors.length === 0,
      },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      processingTime: Date.now() - startTime,
      retryCount: attempts,
    };
  }

  private extractVendor(content: string): string {
    const match = content.match(/vendor:\s*(\w+\s+\w+)/i);
    return match ? match[1] : 'Unknown';
  }

  private extractAmount(content: string): number {
    const match = content.match(/amount:\s*\$?([\d,]+\.?\d*)/i);
    return match ? parseFloat(match[1].replace(',', '')) : 0;
  }

  private extractDate(content: string): string {
    const match = content.match(/date:\s*(\d{4}-\d{2}-\d{2})/i);
    return match ? match[1] : '';
  }

  private extractInvoiceNumber(content: string): string {
    const match = content.match(/invoice\s*#?\s*([\w-]+)/i);
    return match ? match[1] : '';
  }

  private extractLineItems(content: string): string[] {
    const items = content.match(/item\s*\d+:\s*([^\n]+)/gi);
    return items ? items.map(i => i.replace(/item\s*\d+:\s*/i, '').trim()) : [];
  }

  private extractParties(content: string): string[] {
    const match = content.match(/between:\s*(.+)\s+and\s+(.+)/i);
    return match ? [match[1].trim(), match[2].trim()] : [];
  }

  private extractTerm(content: string): string {
    const match = content.match(/term:\s*(\d+\s+\w+)/i);
    return match ? match[1] : '';
  }

  private extractEffectiveDate(content: string): string {
    const match = content.match(/effective\s+date:\s*(.+)/i);
    return match ? match[1].trim() : '';
  }

  private extractTerminationClause(content: string): string {
    return content.includes('termination') ? 'Present' : 'Not found';
  }

  private extractTerms(content: string): string[] {
    return content.split('\n').filter(line => line.length > 10).slice(0, 5);
  }

  private extractTitle(content: string): string {
    const lines = content.split('\n');
    return lines[0] || '';
  }

  private extractKeywords(content: string): string[] {
    const keywords = ['project', 'system', 'platform', 'service', 'application'];
    return keywords.filter(k => content.includes(k));
  }

  private extractSummary(content: string): string {
    return content.substring(0, 100) + '...';
  }
}

// ============================================================================
// Validation Agent
// ============================================================================

export class ValidationAgent extends BaseWorkflowAgent {
  constructor(config: any) {
    super(config, 'VALIDATION');
  }

  protected canHandleDocument(document: Document): boolean {
    // Validates all extracted data
    return true;
  }

  protected processDocument(document: Document): WorkflowResult {
    const startTime = Date.now();

    const errors: string[] = [];
    const warnings: string[] = [];

    // Business rule validation
    if (document.filename.includes('contract')) {
      const content = document.content.toLowerCase();

      // Required fields for contracts
      if (!content.includes('effective date') || content.includes('[to be determined]')) {
        errors.push('Missing required field: effective_date');
      }

      if (!content.includes('termination')) {
        errors.push('Missing required field: termination_clause');
      }

      if (!content.includes('indemnification')) {
        warnings.push('Missing recommended field: indemnification_clause');
      }
    }

    // Check for duplicate invoice numbers
    if (document.filename.includes('invoice')) {
      const invoiceNum = this.extractInvoiceNumber(document.content);
      if (invoiceNum === 'INV-2024-001') {
        warnings.push('Potential duplicate invoice detected');
      }
    }

    return {
      stage: this.stageName,
      agentId: this.config.id,
      success: errors.length === 0,
      data: {
        validationRules: 'Business rules applied',
        rulesChecked: errors.length + warnings.length + 5,
      },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      processingTime: Date.now() - startTime,
    };
  }

  private extractInvoiceNumber(content: string): string {
    const match = content.match(/invoice\s*#?\s*([\w-]+)/i);
    return match ? match[1] : '';
  }
}

// ============================================================================
// Enrichment Agent
// ============================================================================

export class EnrichmentAgent extends BaseWorkflowAgent {
  constructor(config: any) {
    super(config, 'ENRICHMENT');
  }

  protected canHandleDocument(document: Document): boolean {
    // Enriches financial and legal documents
    return ['financial', 'legal'].includes(document.type);
  }

  protected processDocument(document: Document): WorkflowResult {
    const startTime = Date.now();

    const enrichedData: Record<string, unknown> = {};

    if (document.type === 'financial') {
      enrichedData.vendorProfile = {
        rating: 'A+',
        yearsActive: 15,
        totalInvoices: 342,
        avgPaymentDays: 28,
      };
      enrichedData.taxJurisdiction = this.detectTaxJurisdiction(document.content);
    } else if (document.type === 'legal') {
      enrichedData.jurisdiction = this.detectJurisdiction(document.content);
      enrichedData.riskAssessment = {
        level: 'Medium',
        factors: ['International party', 'Long term', 'No liability cap'],
      };
    }

    return {
      stage: this.stageName,
      agentId: this.config.id,
      success: true,
      data: {
        enrichedFields: Object.keys(enrichedData).length,
        enrichment: enrichedData,
      },
      processingTime: Date.now() - startTime,
    };
  }

  private detectTaxJurisdiction(content: string): string {
    if (content.includes('CA') || content.includes('California')) return 'California';
    if (content.includes('NY') || content.includes('New York')) return 'New York';
    return 'Federal';
  }

  private detectJurisdiction(content: string): string {
    if (content.includes('Delaware')) return 'Delaware';
    return 'California';
  }
}

// ============================================================================
// Quality Agent
// ============================================================================

export class QualityAgent extends BaseWorkflowAgent {
  constructor(config: any) {
    super(config, 'QUALITY');
  }

  protected canHandleDocument(document: Document): boolean {
    // Quality checks all documents
    return true;
  }

  protected processDocument(document: Document): WorkflowResult {
    const startTime = Date.now();

    // Calculate quality score
    let score = 0.5;
    const factors: string[] = [];

    // Base score from content length
    if (document.content.length > 100) {
      score += 0.15;
      factors.push('Content adequacy');
    }

    // Metadata completeness
    if (Object.keys(document.metadata).length >= 2) {
      score += 0.12;
      factors.push('Metadata complete');
    }

    // File size appropriate
    if (document.size > 100 * 1024 && document.size < 5 * 1024 * 1024) {
      score += 0.10;
      factors.push('File size appropriate');
    }

    // Checksum validation
    if (document.checksum && document.checksum.length >= 10) {
      score += 0.15;
      factors.push('Integrity verified');
    }

    // Type-specific factors
    if (document.type === 'financial' && document.content.includes('$')) {
      score += 0.10;
      factors.push('Monetary values present');
    }

    if (document.type === 'legal' && document.content.includes('agreement')) {
      score += 0.08;
      factors.push('Legal terminology present');
    }

    // Random variance for realism
    score += (Math.random() - 0.5) * 0.1;

    score = Math.max(0.3, Math.min(0.98, score));

    return {
      stage: this.stageName,
      agentId: this.config.id,
      success: true,
      data: {
        qualityScore: score,
        qualityRating: score >= 0.9 ? 'EXCELLENT' : score >= 0.7 ? 'ACCEPTABLE' : 'NEEDS_REVIEW',
        factors,
      },
      processingTime: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Routing Agent
// ============================================================================

export class RoutingAgent extends BaseWorkflowAgent {
  constructor(config: any) {
    super(config, 'ROUTING');
  }

  protected canHandleDocument(document: Document): boolean {
    // Routes all documents
    return true;
  }

  protected processDocument(document: Document): WorkflowResult {
    const startTime = Date.now();

    let destination = '';
    let reason = '';

    // Determine destination based on document type and quality
    if (document.type === 'financial') {
      destination = 'FINANCE_QUEUE';
      reason = 'Payment processing required';
    } else if (document.type === 'legal') {
      destination = 'LEGAL_REVIEW_QUEUE';
      reason = 'Legal department review required';
    } else if (document.type === 'technical') {
      destination = 'ENGINEERING_QUEUE';
      reason = 'Technical specification review';
    } else if (document.type === 'hr') {
      destination = 'HR_QUEUE';
      reason = 'Human resources processing';
    } else {
      destination = 'GENERAL_QUEUE';
      reason = 'General processing';
    }

    return {
      stage: this.stageName,
      agentId: this.config.id,
      success: true,
      data: {
        destination,
        reason,
        routingMethod: 'Type-based routing',
      },
      processingTime: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Proposal Calculator
// ============================================================================

export function calculateAgentProposal(
  agent: IngestionAgent | ClassificationAgent | ExtractionAgent | ValidationAgent | EnrichmentAgent | QualityAgent | RoutingAgent,
  document: Document
): AgentProposal {
  return {
    agentId: agent.config.id,
    confidence: agent.calculateConfidence(document),
    bid: agent.calculateBid(document),
  };
}
