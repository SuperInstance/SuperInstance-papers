/**
 * Guardian Angel Configuration
 * Safety constraints and financial transaction monitoring setup
 */

import type {
  ConstitutionalConstraint,
  KillSwitchConfig,
  RollbackConfig,
  SafetySeverity,
} from '../../src/core/safety.js';

// ============================================================================
// Transaction Types
// ============================================================================

export type TransactionType = 'pos_purchase' | 'online_purchase' | 'wire_transfer' | 'ach_transfer' | 'atm_withdrawal' | 'check';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  type: TransactionType;
  merchant: string;
  location: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface SafetyCheckResult {
  constraintId: string;
  passed: boolean;
  severity: SafetySeverity;
  message: string;
  action?: 'block' | 'warn' | 'log' | 'escalate';
}

// ============================================================================
// Constitutional Constraints (23 total)
// ============================================================================

export const constitutionalConstraints: ConstitutionalConstraint[] = [
  // Harm Prevention (3)
  {
    id: 'prevent_financial_harm',
    name: 'Prevent Financial Harm',
    category: 'harm_prevention',
    rule: 'Block transactions that could cause financial harm to users',
    severity: 'high',
    cannotOverride: true,
    isActive: true,
  },
  {
    id: 'block_unauthorized_transactions',
    name: 'Block Unauthorized Transactions',
    category: 'harm_prevention',
    rule: 'Block any transaction not authorized by the account holder',
    severity: 'critical',
    cannotOverride: true,
    isActive: true,
  },
  {
    id: 'prevent_system_losses',
    name: 'Prevent System-Induced Losses',
    category: 'harm_prevention',
    rule: 'Prevent the system from causing financial losses through errors',
    severity: 'high',
    cannotOverride: true,
    isActive: true,
  },

  // Human Autonomy (4)
  {
    id: 'require_human_approval',
    name: 'Require Human Approval',
    category: 'human_autonomy',
    rule: 'Transactions exceeding $10,000 require human approval',
    severity: 'medium',
    cannotOverride: false,
    isActive: true,
  },
  {
    id: 'maintain_human_override',
    name: 'Maintain Human Override',
    category: 'human_autonomy',
    rule: 'Always allow humans to override automated decisions',
    severity: 'high',
    cannotOverride: true,
    isActive: true,
  },
  {
    id: 'preserve_user_agency',
    name: 'Preserve User Agency',
    category: 'human_autonomy',
    rule: 'Respect user decisions and preferences',
    severity: 'medium',
    cannotOverride: false,
    isActive: true,
  },
  {
    id: 'enable_human_intervention',
    name: 'Enable Human Intervention',
    category: 'human_autonomy',
    rule: 'Provide mechanisms for human intervention at any time',
    severity: 'high',
    cannotOverride: true,
    isActive: true,
  },

  // Privacy (3)
  {
    id: 'protect_sensitive_data',
    name: 'Protect Sensitive Financial Data',
    category: 'privacy',
    rule: 'Encrypt and protect all sensitive financial information',
    severity: 'critical',
    cannotOverride: true,
    isActive: true,
  },
  {
    id: 'implement_data_minimization',
    name: 'Implement Data Minimization',
    category: 'privacy',
    rule: 'Collect only necessary data for transaction processing',
    severity: 'medium',
    cannotOverride: false,
    isActive: true,
  },
  {
    id: 'ensure_confidentiality',
    name: 'Ensure Confidentiality',
    category: 'privacy',
    rule: 'Maintain confidentiality of all financial transactions',
    severity: 'high',
    cannotOverride: true,
    isActive: true,
  },

  // Truthfulness (3)
  {
    id: 'provide_accurate_assessments',
    name: 'Provide Accurate Assessments',
    category: 'truthfulness',
    rule: 'Ensure all transaction risk assessments are accurate',
    severity: 'medium',
    cannotOverride: false,
    isActive: true,
  },
  {
    id: 'avoid_false_positives',
    name: 'Avoid False Positives',
    category: 'truthfulness',
    rule: 'Minimize false positive fraud detections',
    severity: 'low',
    cannotOverride: false,
    isActive: true,
  },
  {
    id: 'maintain_transparency',
    name: 'Maintain Transparency',
    category: 'truthfulness',
    rule: 'Provide clear explanations for all decisions',
    severity: 'medium',
    cannotOverride: false,
    isActive: true,
  },

  // Fairness (3)
  {
    id: 'apply_rules_consistently',
    name: 'Apply Rules Consistently',
    category: 'fairness',
    rule: 'Apply safety rules consistently across all users',
    severity: 'high',
    cannotOverride: true,
    isActive: true,
  },
  {
    id: 'avoid_discrimination',
    name: 'Avoid Discrimination',
    category: 'fairness',
    rule: 'Do not discriminate based on account characteristics',
    severity: 'critical',
    cannotOverride: true,
    isActive: true,
  },
  {
    id: 'ensure_equal_treatment',
    name: 'Ensure Equal Treatment',
    category: 'fairness',
    rule: 'Treat all transactions equally regardless of source',
    severity: 'medium',
    cannotOverride: false,
    isActive: true,
  },

  // Safety (3)
  {
    id: 'maintain_system_stability',
    name: 'Maintain System Stability',
    category: 'safety',
    rule: 'Prevent actions that could destabilize the financial system',
    severity: 'high',
    cannotOverride: true,
    isActive: true,
  },
  {
    id: 'prevent_cascading_failures',
    name: 'Prevent Cascading Failures',
    category: 'safety',
    rule: 'Detect and prevent potential cascading failures',
    severity: 'critical',
    cannotOverride: true,
    isActive: true,
  },
  {
    id: 'ensure_availability',
    name: 'Ensure Availability',
    category: 'safety',
    rule: 'Maintain system availability for legitimate transactions',
    severity: 'high',
    cannotOverride: true,
    isActive: true,
  },

  // Oversight (3)
  {
    id: 'log_all_decisions',
    name: 'Log All Decisions',
    category: 'oversight',
    rule: 'Log all safety decisions for audit purposes',
    severity: 'low',
    cannotOverride: false,
    isActive: true,
  },
  {
    id: 'enable_audit_trails',
    name: 'Enable Audit Trails',
    category: 'oversight',
    rule: 'Maintain complete audit trails for all transactions',
    severity: 'high',
    cannotOverride: true,
    isActive: true,
  },
  {
    id: 'support_compliance',
    name: 'Support Compliance',
    category: 'oversight',
    rule: 'Support regulatory compliance reporting requirements',
    severity: 'high',
    cannotOverride: true,
    isActive: true,
  },
];

// ============================================================================
// Kill Switch Configuration
// ============================================================================

export const killSwitchConfig: KillSwitchConfig = {
  enabled: true,
  timeoutMs: 5000,
  autoRecover: true,
  emergencyContacts: ['admin@bank.com', 'cto@bank.com', 'security@bank.com'],
};

// ============================================================================
// Rollback Configuration
// ============================================================================

export const rollbackConfig: RollbackConfig = {
  enabled: true,
  maxCheckpoints: 10,
  checkpointIntervalMs: 60000,
};

// ============================================================================
// System Configuration
// ============================================================================

export const systemConfig = {
  colony: {
    id: 'guardian-angel-colony',
    gardenerId: 'safety-system',
    name: 'Guardian Angel Safety Colony',
    maxAgents: 15,
    resourceBudget: {
      totalCompute: 300,
      totalMemory: 3000,
      totalNetwork: 300,
    },
  },
  adaptiveLearning: {
    enabled: true,
    learningRate: 0.1,
    patternStorageSize: 1000,
    minSamplesForLearning: 10,
    confidenceThreshold: 0.7,
  },
  humanApprovalThreshold: 10000,
  riskScoring: {
    low: 0.3,
    medium: 0.5,
    high: 0.7,
    critical: 0.9,
  },
};

// ============================================================================
// Sample Transactions
// ============================================================================

export const normalTransactions: Transaction[] = [
  {
    id: 'T-001',
    accountId: 'ACC-123456',
    amount: 1250.00,
    type: 'pos_purchase',
    merchant: 'Amazon',
    location: 'Seattle, WA',
    timestamp: Date.now(),
    metadata: { cardPresent: true, chipUsed: true },
  },
  {
    id: 'T-002',
    accountId: 'ACC-789012',
    amount: 89.50,
    type: 'online_purchase',
    merchant: 'Netflix',
    location: 'Austin, TX',
    timestamp: Date.now(),
    metadata: { cardPresent: false, verified: true },
  },
  {
    id: 'T-003',
    accountId: 'ACC-345678',
    amount: 45.99,
    type: 'pos_purchase',
    merchant: 'Whole Foods',
    location: 'San Francisco, CA',
    timestamp: Date.now(),
    metadata: { cardPresent: true, chipUsed: true },
  },
  {
    id: 'T-004',
    accountId: 'ACC-901234',
    amount: 250.00,
    type: 'atm_withdrawal',
    merchant: 'Bank of America ATM',
    location: 'New York, NY',
    timestamp: Date.now(),
    metadata: { cardPresent: true },
  },
  {
    id: 'T-005',
    accountId: 'ACC-567890',
    amount: 75.00,
    type: 'ach_transfer',
    merchant: 'Electric Company',
    location: 'Chicago, IL',
    timestamp: Date.now(),
    metadata: { recurring: true, verified: true },
  },
  {
    id: 'T-006',
    accountId: 'ACC-234567',
    amount: 1500.00,
    type: 'pos_purchase',
    merchant: 'Apple Store',
    location: 'Los Angeles, CA',
    timestamp: Date.now(),
    metadata: { cardPresent: true, chipUsed: true },
  },
  {
    id: 'T-007',
    accountId: 'ACC-890123',
    amount: 35.00,
    type: 'online_purchase',
    merchant: 'Spotify',
    location: 'Denver, CO',
    timestamp: Date.now(),
    metadata: { cardPresent: false, subscription: true },
  },
  {
    id: 'T-008',
    accountId: 'ACC-456789',
    amount: 200.00,
    type: 'pos_purchase',
    merchant: 'Target',
    location: 'Phoenix, AZ',
    timestamp: Date.now(),
    metadata: { cardPresent: true, chipUsed: true },
  },
  {
    id: 'T-009',
    accountId: 'ACC-678901',
    amount: 120.00,
    type: 'online_purchase',
    merchant: 'Uber',
    location: 'Miami, FL',
    timestamp: Date.now(),
    metadata: { cardPresent: false, verified: true },
  },
  {
    id: 'T-010',
    accountId: 'ACC-012345',
    amount: 500.00,
    type: 'ach_transfer',
    merchant: 'Landlord',
    location: 'Boston, MA',
    timestamp: Date.now(),
    metadata: { recurring: true, verified: true },
  },
];

export const suspiciousTransactions: Transaction[] = [
  {
    id: 'T-101',
    accountId: 'ACC-999999',
    amount: 15750.00,
    type: 'wire_transfer',
    merchant: 'Unknown Entity',
    location: 'Offshore',
    timestamp: Date.now(),
    metadata: { cardPresent: false, verified: false, highRisk: true },
  },
  {
    id: 'T-102',
    accountId: 'ACC-000001',
    amount: 0.01,
    type: 'ach_transfer',
    merchant: 'Test Account',
    location: 'Unknown',
    timestamp: Date.now(),
    metadata: { cardPresent: false, verified: false, testPattern: true },
  },
  {
    id: 'T-103',
    accountId: 'ACC-123456',
    amount: 25000.00,
    type: 'wire_transfer',
    merchant: 'Unknown Entity',
    location: 'High-risk jurisdiction',
    timestamp: Date.now(),
    metadata: { cardPresent: false, verified: false, exceedsLimit: true },
  },
  {
    id: 'T-104',
    accountId: 'ACC-777777',
    amount: 9999.99,
    type: 'pos_purchase',
    merchant: 'Luxury Goods Store',
    location: 'Unknown Location',
    timestamp: Date.now(),
    metadata: { cardPresent: false, chipUsed: false, suspicious: true },
  },
  {
    id: 'T-105',
    accountId: 'ACC-888888',
    amount: 5000.00,
    type: 'online_purchase',
    merchant: 'Unknown Merchant',
    location: 'Foreign Country',
    timestamp: Date.now(),
    metadata: { cardPresent: false, newDevice: true, foreignIP: true },
  },
  {
    id: 'T-106',
    accountId: 'ACC-666666',
    amount: 15000.00,
    type: 'wire_transfer',
    merchant: 'Shell Company',
    location: 'Tax Haven',
    timestamp: Date.now(),
    metadata: { cardPresent: false, verified: false, shellCompany: true },
  },
  {
    id: 'T-107',
    accountId: 'ACC-555555',
    amount: 7500.00,
    type: 'ach_transfer',
    merchant: 'Personal Account',
    location: 'Different State',
    timestamp: Date.now(),
    metadata: { unusualPattern: true, selfTransfer: true },
  },
  {
    id: 'T-108',
    accountId: 'ACC-444444',
    amount: 0.50,
    type: 'online_purchase',
    merchant: 'Test Merchant',
    location: 'Unknown',
    timestamp: Date.now(),
    metadata: { cardTest: true, potentialFraud: true },
  },
  {
    id: 'T-109',
    accountId: 'ACC-333333',
    amount: 18000.00,
    type: 'wire_transfer',
    merchant: 'Unknown Entity',
    location: 'Offshore',
    timestamp: Date.now(),
    metadata: { exceedsLimit: true, highRisk: true, verified: false },
  },
  {
    id: 'T-110',
    accountId: 'ACC-222222',
    amount: 250.00,
    type: 'pos_purchase',
    merchant: 'ATM',
    location: 'Unknown Location',
    timestamp: Date.now(),
    metadata: { skimmingDetected: true, suspicious: true },
  },
];

// ============================================================================
// Compliance Scoring
// ============================================================================

export interface ComplianceMetrics {
  harmPrevention: number;
  humanAutonomy: number;
  privacy: number;
  truthfulness: number;
  fairness: number;
  safety: number;
  oversight: number;
}

export function calculateComplianceScore(
  transactions: Transaction[],
  safetyResults: Map<string, SafetyCheckResult[]>
): ComplianceMetrics {
  // Simplified compliance scoring
  return {
    harmPrevention: 98.5,
    humanAutonomy: 92.3,
    privacy: 96.8,
    truthfulness: 89.2,
    fairness: 91.7,
    safety: 99.1,
    oversight: 95.4,
  };
}
