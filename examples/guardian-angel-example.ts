/**
 * Guardian Angel Safety System - Usage Example
 *
 * This example demonstrates how to use the Guardian Angel system
 * to monitor and control agent executions in real-time.
 */

import {
  GuardianAngelAgent,
  GuardianLearningSystem,
  createGuardianAgent,
  createGuardianContext,
  createGuardianSafety,
  isAllowed,
  isModified,
  isVetoed,
  applyModifications,
  SafetyLayer,
  type A2APackage,
} from '../src/core/index.js';

// ============================================================================
// Example 1: Basic Guardian Usage
// ============================================================================

async function basicGuardianExample() {
  console.log('\n=== Example 1: Basic Guardian Usage ===\n');

  // Create a guardian agent
  const guardian = createGuardianAgent({
    enabled: true,
    strictMode: false,
    learningEnabled: true,
  });

  // Create a proposal context
  const context = createGuardianContext({
    agentId: 'agent-analyst-1',
    action: 'analyze',
    payload: {
      data: 'Sample data to analyze',
      options: { deep: true },
    },
    metadata: {
      priority: 'normal',
      domain: 'data-analysis',
    },
  });

  // Review the proposal
  const review = await guardian.reviewProposal(context);

  console.log('Proposal Review:');
  console.log(`  Agent: ${review.agentId}`);
  console.log(`  Decision: ${review.decision}`);
  console.log(`  Reason: ${review.reason}`);
  console.log(`  Confidence: ${review.confidence.toFixed(2)}`);
  console.log(`  Review Time: ${review.reviewTimeMs}ms`);

  // Check if execution is allowed
  if (isAllowed(review)) {
    console.log('  Result: Execution ALLOWED');
  } else if (isModified(review)) {
    console.log('  Result: Execution MODIFIED');
    const modifiedContext = applyModifications(context, review);
    console.log(`  Modified: ${JSON.stringify(review.modifications)}`);
  } else if (isVetoed(review)) {
    console.log('  Result: Execution VETOED');
  }

  // Get statistics
  const stats = guardian.getStats();
  console.log('\nGuardian Statistics:');
  console.log(`  Total Reviews: ${stats.totalReviews}`);
  console.log(`  Allows: ${stats.allows}`);
  console.log(`  Modifications: ${stats.modifications}`);
  console.log(`  Vetoes: ${stats.vetoes}`);
  console.log(`  Avg Review Time: ${stats.avgReviewTimeMs.toFixed(2)}ms`);
}

// ============================================================================
// Example 2: Dangerous Action Detection
// ============================================================================

async function dangerousActionExample() {
  console.log('\n=== Example 2: Dangerous Action Detection ===\n');

  const guardian = createGuardianAgent();

  // Try to execute a dangerous action
  const dangerousContext = createGuardianContext({
    agentId: 'agent-malicious-1',
    action: 'delete_system_files',
    payload: {
      path: '/etc/passwd',
      recursive: true,
    },
  });

  const review = await guardian.reviewProposal(dangerousContext);

  console.log('Dangerous Action Review:');
  console.log(`  Action: ${dangerousContext.action}`);
  console.log(`  Decision: ${review.decision}`);
  console.log(`  Reason: ${review.reason}`);

  if (isVetoed(review)) {
    console.log('  Result: BLOCKED - Guardian prevented dangerous action');
  }

  // Try another dangerous action
  const injectionContext = createGuardianContext({
    agentId: 'agent-attacker-1',
    action: 'query_database',
    payload: {
      sql: "SELECT * FROM users WHERE '1'='1' OR '1'='1'; DROP TABLE users;--",
    },
  });

  const injectionReview = await guardian.reviewProposal(injectionContext);

  console.log('\nSQL Injection Attempt:');
  console.log(`  Decision: ${injectionReview.decision}`);
  console.log(`  Reason: ${injectionReview.reason}`);

  if (isVetoed(injectionReview)) {
    console.log('  Result: BLOCKED - SQL injection prevented');
  }
}

// ============================================================================
// Example 3: Privacy Protection
// ============================================================================

async function privacyProtectionExample() {
  console.log('\n=== Example 3: Privacy Protection ===\n');

  const guardian = createGuardianAgent();

  // Try to process PII
  const piiContext = createGuardianContext({
    agentId: 'agent-data-processor',
    action: 'process_user_data',
    payload: {
      users: [
        {
          name: 'John Doe',
          ssn: '123-45-6789',
          email: 'john.doe@example.com',
          creditCard: '1234567890123456',
        },
      ],
    },
  });

  const review = await guardian.reviewProposal(piiContext);

  console.log('PII Detection:');
  console.log(`  Decision: ${review.decision}`);
  console.log(`  Reason: ${review.reason}`);

  if (isVetoed(review)) {
    console.log('  Result: BLOCKED - PII detected in payload');
  }

  // Proper data handling
  const safeContext = createGuardianContext({
    agentId: 'agent-data-processor',
    action: 'analyze_anonymous_metrics',
    payload: {
      metrics: {
        averageAge: 35,
        totalUsers: 1000,
        regions: ['us-east', 'eu-west'],
      },
    },
    metadata: {
      anonymized: true,
      privacyLevel: 'PUBLIC',
    },
  });

  const safeReview = await guardian.reviewProposal(safeContext);

  console.log('\nSafe Data Processing:');
  console.log(`  Decision: ${safeReview.decision}`);
  console.log(`  Reason: ${safeReview.reason}`);

  if (isAllowed(safeReview)) {
    console.log('  Result: ALLOWED - Data is properly anonymized');
  }
}

// ============================================================================
// Example 4: Resource Limits
// ============================================================================

async function resourceLimitsExample() {
  console.log('\n=== Example 4: Resource Limits ===\n');

  const guardian = createGuardianAgent();

  // Try to allocate excessive memory
  const excessiveMemoryContext = createGuardianContext({
    agentId: 'agent-heavy-1',
    action: 'train_model',
    payload: {
      dataset: 'huge_dataset',
      modelSize: '10B',
    },
    metadata: {
      estimatedMemoryMB: 8192, // 8GB
      estimatedCpuMs: 30000, // 30 seconds
    },
  });

  const review = await guardian.reviewProposal(excessiveMemoryContext);

  console.log('Resource Limit Check:');
  console.log(`  Requested Memory: ${excessiveMemoryContext.metadata.estimatedMemoryMB}MB`);
  console.log(`  Decision: ${review.decision}`);
  console.log(`  Reason: ${review.reason}`);

  if (isVetoed(review) || isModified(review)) {
    console.log('  Result: Resource limits enforced');
  }

  // Reasonable request
  const reasonableContext = createGuardianContext({
    agentId: 'agent-light-1',
    action: 'analyze',
    payload: {
      data: 'sample',
    },
    metadata: {
      estimatedMemoryMB: 512,
      estimatedCpuMs: 1000,
    },
  });

  const reasonableReview = await guardian.reviewProposal(reasonableContext);

  console.log('\nReasonable Request:');
  console.log(`  Decision: ${reasonableReview.decision}`);
  console.log(`  Result: ALLOWED - Within resource limits`);
}

// ============================================================================
// Example 5: Feedback and Learning
// ============================================================================

async function feedbackAndLearningExample() {
  console.log('\n=== Example 5: Feedback and Learning ===\n');

  const guardian = createGuardianAgent({
    learningEnabled: true,
    learningRate: 0.1,
  });

  // Get a review
  const context = createGuardianContext({
    agentId: 'agent-test-1',
    action: 'analyze',
    payload: { data: 'test' },
  });

  const review = await guardian.reviewProposal(context);
  console.log(`Initial Review: ${review.decision} (${review.confidence.toFixed(2)})`);

  // Submit positive feedback
  const positiveFeedback = {
    id: `feedback-${Date.now()}-1`,
    reviewId: review.id,
    proposalId: review.proposalId,
    timestamp: Date.now(),
    decision: review.decision,
    wasCorrect: true,
    humanOverride: false,
    shouldAdjustWeights: true,
  };

  await guardian.submitFeedback(positiveFeedback);
  console.log('Positive feedback submitted');

  // Get another review
  const context2 = createGuardianContext({
    agentId: 'agent-test-2',
    action: 'analyze',
    payload: { data: 'test2' },
  });

  const review2 = await guardian.reviewProposal(context2);

  // Submit negative feedback (false positive)
  const negativeFeedback = {
    id: `feedback-${Date.now()}-2`,
    reviewId: review2.id,
    proposalId: review2.proposalId,
    timestamp: Date.now(),
    decision: review2.decision,
    wasCorrect: false,
    humanOverride: true,
    notes: 'This was actually safe - adjust constraints',
    shouldAdjustWeights: true,
  };

  await guardian.submitFeedback(negativeFeedback);
  console.log('Negative feedback submitted (will adjust weights)');

  const stats = guardian.getStats();
  console.log('\nLearning Statistics:');
  console.log(`  True Positives: ${stats.truePositives}`);
  console.log(`  True Negatives: ${stats.trueNegatives}`);
  console.log(`  False Positives: ${stats.falsePositives}`);
  console.log(`  False Negatives: ${stats.falseNegatives}`);
}

// ============================================================================
// Example 6: Integration with SafetyLayer
// ============================================================================

async function integratedSafetyExample() {
  console.log('\n=== Example 6: Integration with SafetyLayer ===\n');

  // Create existing safety layer
  const safetyLayer = new SafetyLayer();

  // Create integrated guardian safety
  const guardianSafety = createGuardianSafety(safetyLayer, {
    enabled: true,
    strictMode: false,
    learningEnabled: true,
  });

  // Mock A2A package
  const mockPackage: A2APackage = {
    id: 'pkg-001',
    timestamp: Date.now(),
    senderId: 'agent-001',
    receiverId: 'agent-002',
    type: 'analyze',
    payload: { data: 'test' },
    parentIds: [],
    causalChainId: 'chain-001',
    privacyLevel: 'COLONY' as any,
    layer: 'HABITUAL' as any,
  };

  // Review the package
  const review = await guardianSafety.reviewPackage(mockPackage);

  console.log('Integrated Safety Review:');
  console.log(`  Package: ${mockPackage.id}`);
  console.log(`  Sender: ${mockPackage.senderId}`);
  console.log(`  Type: ${mockPackage.type}`);
  console.log(`  Decision: ${review.decision}`);
  console.log(`  Reason: ${review.reason}`);

  // Start execution monitoring
  guardianSafety.startExecution(mockPackage);
  console.log('  Execution monitoring started');

  // Complete execution
  guardianSafety.completeExecution(mockPackage, 'success');
  console.log('  Execution completed successfully');

  // Submit feedback
  await guardianSafety.submitFeedback({
    reviewId: review.id,
    proposalId: review.proposalId,
    wasCorrect: true,
    humanOverride: false,
    notes: 'Review was accurate',
  });

  console.log('  Feedback submitted');
}

// ============================================================================
// Example 7: Human Override
// ============================================================================

async function humanOverrideExample() {
  console.log('\n=== Example 7: Human Override ===\n');

  const guardian = createGuardianAgent({
    allowHumanOverride: true,
    requireOverrideReason: true,
  });

  const context = createGuardianContext({
    agentId: 'agent-risky-1',
    action: 'deploy_to_production',
    payload: {
      service: 'api-gateway',
      version: '2.0.0',
    },
  });

  const review = await guardian.reviewProposal(context);

  console.log('Initial Review:');
  console.log(`  Decision: ${review.decision}`);
  console.log(`  Reason: ${review.reason}`);

  if (isVetoed(review)) {
    console.log('\nHuman decides to override...');
    const overrideSuccess = guardian.overrideDecision(
      review.id,
      'Code has been manually reviewed and approved',
      'human-admin-john'
    );

    if (overrideSuccess) {
      console.log('  Override successful - execution allowed');

      // Submit feedback about the override
      await guardian.submitFeedback({
        id: `feedback-${Date.now()}`,
        reviewId: review.id,
        proposalId: review.proposalId,
        timestamp: Date.now(),
        decision: review.decision,
        wasCorrect: false, // The veto was incorrect
        humanOverride: true,
        notes: 'Human correctly identified this as safe',
        shouldAdjustWeights: true,
      });

      console.log('  Feedback recorded - weights will be adjusted');
    }
  }

  const stats = guardian.getStats();
  console.log(`\nTotal Overrides: ${stats.overrides}`);
}

// ============================================================================
// Example 8: Rate Limiting
// ============================================================================

async function rateLimitingExample() {
  console.log('\n=== Example 8: Rate Limiting ===\n');

  const guardian = createGuardianAgent();

  const agentId = 'agent-spam-1';

  console.log('Sending 70 rapid requests from same agent...');

  let vetoCount = 0;
  let allowCount = 0;

  for (let i = 0; i < 70; i++) {
    const context = createGuardianContext({
      agentId,
      action: 'query',
      payload: { query: `SELECT * FROM data LIMIT ${i}` },
    });

    const review = await guardian.reviewProposal(context);

    if (isVetoed(review)) {
      vetoCount++;
    } else {
      allowCount++;
    }
  }

  console.log('\nRate Limiting Results:');
  console.log(`  Allowed: ${allowCount}`);
  console.log(`  Vetoed: ${vetoCount}`);
  console.log(`  Rate Limit Active: ${vetoCount > 0}`);

  const stats = guardian.getStats();
  console.log('\nStatistics:');
  console.log(`  Total Reviews: ${stats.totalReviews}`);
  console.log(`  Vetoes: ${stats.vetoes}`);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   Guardian Angel Safety System - Usage Examples          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    await basicGuardianExample();
    await dangerousActionExample();
    await privacyProtectionExample();
    await resourceLimitsExample();
    await feedbackAndLearningExample();
    await integratedSafetyExample();
    await humanOverrideExample();
    await rateLimitingExample();

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   All Examples Completed Successfully                    ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  basicGuardianExample,
  dangerousActionExample,
  privacyProtectionExample,
  resourceLimitsExample,
  feedbackAndLearningExample,
  integratedSafetyExample,
  humanOverrideExample,
  rateLimitingExample,
};
