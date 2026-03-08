# Multi-Agent Workflow Orchestration

A comprehensive demonstration of POLLN's workflow orchestration capabilities for complex multi-step task processing.

## What It Does

This example demonstrates a document processing pipeline with multiple specialized agents working in coordination:

1. **IngestionAgent** - Receives and validates incoming documents
2. **ClassificationAgent** - Categorizes documents by type and priority
3. **ExtractionAgent** - Extracts structured data from documents
4. **ValidationAgent** - Validates extracted data against business rules
5. **EnrichmentAgent** - Enriches data with external information
6. **QualityAgent** - Performs final quality checks
7. **RoutingAgent** - Routes processed documents to appropriate destinations

## Key Features Demonstrated

### 1. Complex Multi-Step Task Decomposition
- Documents flow through multiple processing stages
- Each stage has specialized agents with domain expertise
- A2A packages carry context through the pipeline

### 2. Agent Hand-offs with Traceability
- Complete causal chain tracking through parentIds
- State preservation across agent boundaries
- Error propagation with context

### 3. Error Recovery and Retry Logic
- Automatic retry on transient failures
- Circuit breaker pattern for failing agents
- Dead letter queue for unrecoverable errors

### 4. Progress Tracking and Visualization
- Real-time pipeline metrics
- Per-stage completion tracking
- Bottleneck identification

## How to Run

```bash
# From the examples directory
cd workflow-orchestration
npm install
npm start
```

## Example Output

```
Multi-Agent Workflow Orchestration
===================================

Initializing workflow colony with 7 agents...
  IngestionAgent - Document intake and validation
  ClassificationAgent - Document categorization
  ExtractionAgent - Data extraction
  ValidationAgent - Business rule validation
  EnrichmentAgent - Data enrichment
  QualityAgent - Quality assurance
  RoutingAgent - Document routing

Processing 5 documents through workflow pipeline...

Document 1: invoice_001.pdf
  Stage 1/7: INGESTION
    Agent: IngestionAgent
    Result: Accepted (PDF, 2.3MB, valid checksum)
    Time: 45ms

  Stage 2/7: CLASSIFICATION
    Agent: ClassificationAgent
    Result: FINANCIAL | HIGH_PRIORITY
    Confidence: 0.92
    Time: 120ms

  Stage 3/7: EXTRACTION
    Agent: ExtractionAgent
    Result: Extracted 12 fields (vendor, amount, date, line_items...)
    Time: 850ms

  Stage 4/7: VALIDATION
    Agent: ValidationAgent
    Result: 2 warnings (tax_rate unusually high, duplicate_line_item)
    Passed: true
    Time: 65ms

  Stage 5/7: ENRICHMENT
    Agent: EnrichmentAgent
    Result: Added vendor_profile, tax_jurisdiction info
    Time: 230ms

  Stage 6/7: QUALITY
    Agent: QualityAgent
    Result: Quality score: 0.87 (ACCEPTABLE)
    Time: 45ms

  Stage 7/7: ROUTING
    Agent: RoutingAgent
    Result: Routed to FINANCE_QUEUE for payment processing
    Time: 30ms

  Total: 1385ms | A2A packages: 7 | Retries: 0

Document 2: contract_draft.docx
  Stage 1/7: INGESTION
    Agent: IngestionAgent
    Result: Accepted (DOCX, 1.1MB, valid checksum)
    Time: 38ms

  Stage 2/7: CLASSIFICATION
    Agent: ClassificationAgent
    Result: LEGAL | MEDIUM_PRIORITY
    Confidence: 0.88
    Time: 95ms

  Stage 3/7: EXTRACTION
    Agent: ExtractionAgent
    Result: Extracted 8 fields (parties, dates, terms...)
    ERROR: OCR timeout - text extraction incomplete
    Retry 1/3...

  Stage 3/7: EXTRACTION (Retry 1)
    Agent: ExtractionAgent
    Result: Extracted 6 fields (partial extraction)
    WARNING: Missing key terms and conditions
    Time: 1200ms

  Stage 4/7: VALIDATION
    Agent: ValidationAgent
    Result: BLOCKED - Missing required fields: effective_date, termination_clause
    Passed: false
    Time: 55ms

  Workflow halted: validation failed
  Document routed to: MANUAL_REVIEW_QUEUE

  Total: 1438ms | A2A packages: 4 | Retries: 1

[... 3 more documents processed ...]

Pipeline Statistics:
  Documents processed: 5
  Successful: 3 (60%)
  Failed: 1 (20%)
  Manual review: 1 (20%)
  Average time: 1256ms
  A2A packages created: 29
  Retries attempted: 2

Stage Performance:
  INGESTION: 45ms avg, 100% success
  CLASSIFICATION: 108ms avg, 100% success
  EXTRACTION: 890ms avg, 80% success (bottleneck)
  VALIDATION: 62ms avg, 80% success
  ENRICHMENT: 210ms avg, 100% success
  QUALITY: 48ms avg, 100% success
  ROUTING: 32ms avg, 100% success

Agent Performance:
  IngestionAgent: 5/5 processed, 100% success, 0 retries
  ClassificationAgent: 5/5 processed, 100% success, 0 retries
  ExtractionAgent: 4/5 processed, 80% success, 2 retries
  ValidationAgent: 4/4 processed, 75% success, 0 retries
  EnrichmentAgent: 3/3 processed, 100% success, 0 retries
  QualityAgent: 3/3 processed, 100% success, 0 retries
  RoutingAgent: 3/3 processed, 100% success, 0 retries

Demo complete!
```

## Architecture

### Workflow Stages

```
┌─────────────────────────────────────────────────────────────┐
│                    DOCUMENT INGESTION                         │
│  IngestionAgent validates format, size, checksum            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     CLASSIFICATION                            │
│  ClassificationAgent categorizes by type and priority       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA EXTRACTION                          │
│  ExtractionAgent pulls structured data (OCR, parsing)       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     VALIDATION                                │
│  ValidationAgent checks against business rules              │
└──────────────────────┬──────────────────────────────────────┘
                       │ (if valid)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     ENRICHMENT                                │
│  EnrichmentAgent adds external data (vendor info, etc)      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    QUALITY CHECK                              │
│  QualityAgent scores completeness and accuracy              │
└──────────────────────┬──────────────────────────────────────┘
                       │ (if quality threshold met)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      ROUTING                                  │
│  RoutingAgent sends to appropriate destination              │
└─────────────────────────────────────────────────────────────┘
```

### Error Handling

- **Transient Errors**: Automatic retry with exponential backoff
- **Validation Failures**: Route to manual review queue
- **Agent Failures**: Circuit breaker opens after N failures
- **Timeouts**: Move to next stage with partial data

## Configuration

Edit `config.ts` to customize:

- **workflowStages**: Add/remove stages or change order
- **retryPolicy**: Configure retry attempts and backoff
- **timeoutSettings**: Adjust per-stage timeouts
- **qualityThresholds**: Set minimum quality scores

## Extension Ideas

- Add parallel processing for independent stages
- Implement priority queues for urgent documents
- Add human-in-the-loop approval gates
- Integrate with real document storage systems
- Add machine learning for automatic classification
- Implement version control for document processing history
