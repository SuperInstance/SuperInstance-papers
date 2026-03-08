/**
 * Workflow Orchestration Configuration
 */

import type { AgentConfig, SynapseConfig } from '../../src/core/index.js';

// ============================================================================
// Document Types
// ============================================================================

export type DocumentType = 'financial' | 'legal' | 'technical' | 'hr' | 'general';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'manual_review';

export interface Document {
  id: string;
  filename: string;
  type: DocumentType;
  size: number;
  checksum: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface ProcessingResult {
  stage: string;
  agentId: string;
  success: boolean;
  data?: Record<string, unknown>;
  errors?: string[];
  warnings?: string[];
  processingTime: number;
  retryCount?: number;
}

export interface WorkflowMetrics {
  totalDocuments: number;
  successful: number;
  failed: number;
  manualReview: number;
  averageTime: number;
  a2aPackages: number;
  retries: number;
}

// ============================================================================
// Agent Configurations
// ============================================================================

export const agentConfigs: AgentConfig[] = [
  {
    id: 'ingestion-agent',
    typeId: 'IngestionAgent',
    categoryId: 'role',
    modelFamily: 'workflow',
    defaultParams: {},
    inputTopics: ['document'],
    outputTopic: 'ingested',
    minExamples: 5,
    requiresWorldModel: false,
  },
  {
    id: 'classification-agent',
    typeId: 'ClassificationAgent',
    categoryId: 'role',
    modelFamily: 'workflow',
    defaultParams: {},
    inputTopics: ['ingested'],
    outputTopic: 'classified',
    minExamples: 10,
    requiresWorldModel: false,
  },
  {
    id: 'extraction-agent',
    typeId: 'ExtractionAgent',
    categoryId: 'role',
    modelFamily: 'workflow',
    defaultParams: {},
    inputTopics: ['classified'],
    outputTopic: 'extracted',
    minExamples: 15,
    requiresWorldModel: false,
  },
  {
    id: 'validation-agent',
    typeId: 'ValidationAgent',
    categoryId: 'role',
    modelFamily: 'workflow',
    defaultParams: {},
    inputTopics: ['extracted'],
    outputTopic: 'validated',
    minExamples: 10,
    requiresWorldModel: false,
  },
  {
    id: 'enrichment-agent',
    typeId: 'EnrichmentAgent',
    categoryId: 'role',
    modelFamily: 'workflow',
    defaultParams: {},
    inputTopics: ['validated'],
    outputTopic: 'enriched',
    minExamples: 8,
    requiresWorldModel: false,
  },
  {
    id: 'quality-agent',
    typeId: 'QualityAgent',
    categoryId: 'role',
    modelFamily: 'workflow',
    defaultParams: {},
    inputTopics: ['enriched'],
    outputTopic: 'quality_checked',
    minExamples: 8,
    requiresWorldModel: false,
  },
  {
    id: 'routing-agent',
    typeId: 'RoutingAgent',
    categoryId: 'role',
    modelFamily: 'workflow',
    defaultParams: {},
    inputTopics: ['quality_checked'],
    outputTopic: 'routed',
    minExamples: 5,
    requiresWorldModel: false,
  },
];

// ============================================================================
// Workflow Configuration
// ============================================================================

export const workflowConfig = {
  colony: {
    id: 'workflow-colony',
    gardenerId: 'workflow-orchestrator',
    name: 'Document Processing Workflow Colony',
    maxAgents: 10,
    resourceBudget: {
      totalCompute: 200,
      totalMemory: 2000,
      totalNetwork: 200,
    },
  },
  plinko: {
    temperature: 0.7,
    minTemperature: 0.3,
    maxTemperature: 1.5,
    decayRate: 0.98,
    enableDiscriminators: true,
  },
  stages: [
    'INGESTION',
    'CLASSIFICATION',
    'EXTRACTION',
    'VALIDATION',
    'ENRICHMENT',
    'QUALITY',
    'ROUTING',
  ] as const,
  timeoutSettings: {
    INGESTION: 5000,
    CLASSIFICATION: 10000,
    EXTRACTION: 30000,
    VALIDATION: 5000,
    ENRICHMENT: 10000,
    QUALITY: 5000,
    ROUTING: 3000,
  },
  retryPolicy: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
  qualityThresholds: {
    minimumScore: 0.7,
    excellentScore: 0.9,
    warningScore: 0.5,
  },
  circuitBreaker: {
    failureThreshold: 3,
    resetTimeout: 30000,
    halfOpenMaxCalls: 2,
  },
};

export type WorkflowStage = typeof workflowConfig.stages[number];

// ============================================================================
// Sample Documents
// ============================================================================

export const sampleDocuments: Document[] = [
  {
    id: 'doc-001',
    filename: 'invoice_001.pdf',
    type: 'financial',
    size: 2.3 * 1024 * 1024,
    checksum: 'abc123def456',
    content: 'INVOICE #INV-2024-001\nVendor: Acme Corp\nAmount: $15,750.00\nDate: 2024-01-15\nItems: Software licenses, consulting services',
    metadata: {
      format: 'PDF',
      pageCount: 3,
      receivedFrom: 'accounts@acmecorp.com',
    },
  },
  {
    id: 'doc-002',
    filename: 'contract_draft.docx',
    type: 'legal',
    size: 1.1 * 1024 * 1024,
    checksum: 'def456ghi789',
    content: 'SERVICE AGREEMENT\nBetween: TechCorp Inc and ServicePro LLC\nEffective Date: [TO BE DETERMINED]\nTerm: 12 months\nServices: Development and support',
    metadata: {
      format: 'DOCX',
      wordCount: 2500,
      receivedFrom: 'legal@servicepro.com',
    },
  },
  {
    id: 'doc-003',
    filename: 'technical_spec.pdf',
    type: 'technical',
    size: 3.5 * 1024 * 1024,
    checksum: 'ghi789jkl012',
    content: 'TECHNICAL SPECIFICATION\nProject: NextGen Platform\nVersion: 2.0\nArchitecture: Microservices\nTech Stack: Node.js, React, PostgreSQL',
    metadata: {
      format: 'PDF',
      pageCount: 15,
      receivedFrom: 'engineering@techcorp.com',
    },
  },
  {
    id: 'doc-004',
    filename: 'employee_onboarding.pdf',
    type: 'hr',
    size: 890 * 1024,
    checksum: 'jkl012mno345',
    content: 'EMPLOYEE ONBOARDING\nName: Jane Smith\nPosition: Senior Engineer\nStart Date: 2024-02-01\nDepartment: Engineering',
    metadata: {
      format: 'PDF',
      pageCount: 8,
      receivedFrom: 'hr@techcorp.com',
    },
  },
  {
    id: 'doc-005',
    filename: 'project_proposal.docx',
    type: 'general',
    size: 1.8 * 1024 * 1024,
    checksum: 'mno345pqr678',
    content: 'PROJECT PROPOSAL\nTitle: Customer Portal Redesign\nBudget: $500,000\nTimeline: 6 months\nTeam: 5 developers, 2 designers',
    metadata: {
      format: 'DOCX',
      wordCount: 3200,
      receivedFrom: 'pm@techcorp.com',
    },
  },
];

// ============================================================================
// Synapse Configuration
// ============================================================================

export const synapseConfig: SynapseConfig = {
  initialStrength: 0.5,
  learningRate: 0.1,
  decayRate: 0.01,
  plasticityWindow: 1000,
  hebbianIncrement: 0.05,
  antiHebbianDecrement: 0.02,
};
