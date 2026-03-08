/**
 * Federated Colony Configuration
 */

import type { AgentConfig } from '../../src/core/index.js';
import type { PrivacyTier } from '../../src/core/embedding.js';

// ============================================================================
// Colony Types
// ============================================================================

export type ColonyType = 'finance' | 'healthcare' | 'retail';
export type ThreatType = 'financial' | 'data_breach' | 'fraud' | 'malware' | 'phishing';

export interface ThreatSample {
  id: string;
  type: ThreatType;
  features: number[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  isThreat: boolean;
  metadata: Record<string, unknown>;
}

export interface ColonyConfig {
  id: string;
  name: string;
  type: ColonyType;
  specialization: ThreatType[];
  agentCount: number;
  sampleCount: number;
  privacyPreference: PrivacyTier;
}

export interface FederatedConfig {
  coordinatorId: string;
  learningRate: number;
  clipThreshold: number;
  rounds: number;
  minParticipants: number;
  targetPrivacyTier: PrivacyTier;
  aggregationMethod: 'fedavg' | 'fedprox' | 'fedadam';
}

export interface MeadowConfig {
  id: string;
  name: string;
  description: string;
  sharingPolicy: 'open' | 'curated' | 'restricted';
  minReputation: number;
}

// ============================================================================
// Colony Configurations
// ============================================================================

export const colonyConfigs: ColonyConfig[] = [
  {
    id: 'finance-colony',
    name: 'Finance Colony',
    type: 'finance',
    specialization: ['financial', 'fraud'],
    agentCount: 5,
    sampleCount: 100,
    privacyPreference: 'STANDARD',
  },
  {
    id: 'healthcare-colony',
    name: 'Healthcare Colony',
    type: 'healthcare',
    specialization: ['data_breach', 'fraud'],
    agentCount: 5,
    sampleCount: 100,
    privacyPreference: 'HIGH',
  },
  {
    id: 'retail-colony',
    name: 'Retail Colony',
    type: 'retail',
    specialization: ['fraud', 'phishing'],
    agentCount: 5,
    sampleCount: 100,
    privacyPreference: 'STANDARD',
  },
];

// ============================================================================
// Federated Learning Configuration
// ============================================================================

export const federatedConfig: FederatedConfig = {
  coordinatorId: 'fed-coordinator-threat-detection',
  learningRate: 0.01,
  clipThreshold: 1.0,
  rounds: 5,
  minParticipants: 2,
  targetPrivacyTier: 'STANDARD',
  aggregationMethod: 'fedavg',
};

// ============================================================================
// Meadow Configuration
// ============================================================================

export const meadowConfig: MeadowConfig = {
  id: 'global-threat-intelligence',
  name: 'Global Threat Intelligence Community',
  description: 'Cross-industry threat detection pattern sharing',
  sharingPolicy: 'curated',
  minReputation: 0.7,
};

// ============================================================================
// Agent Configurations
// ============================================================================

export const baseAgentConfig: Partial<AgentConfig> = {
  categoryId: 'role',
  modelFamily: 'threat-detection',
  defaultParams: {},
  inputTopics: ['threat_sample'],
  outputTopic: 'threat_alert',
  minExamples: 20,
  requiresWorldModel: false,
};

// ============================================================================
// Threat Samples
// ============================================================================

export function generateThreatSamples(count: number, colonyType: ColonyType): ThreatSample[] {
  const samples: ThreatSample[] = [];
  const threatTypes: ThreatType[] = ['financial', 'data_breach', 'fraud', 'malware', 'phishing'];

  for (let i = 0; i < count; i++) {
    const isThreat = Math.random() > 0.3; // 70% threats for training
    const type = threatTypes[Math.floor(Math.random() * threatTypes.length)];

    // Generate features (20-dimensional feature vector)
    const features = Array.from({ length: 20 }, () => Math.random());

    // Adjust features based on colony type and threat status
    if (colonyType === 'finance' && type === 'financial') {
      features[0] = isThreat ? 0.8 + Math.random() * 0.2 : 0.1 + Math.random() * 0.3;
    } else if (colonyType === 'healthcare' && type === 'data_breach') {
      features[1] = isThreat ? 0.8 + Math.random() * 0.2 : 0.1 + Math.random() * 0.3;
    } else if (colonyType === 'retail' && type === 'fraud') {
      features[2] = isThreat ? 0.8 + Math.random() * 0.2 : 0.1 + Math.random() * 0.3;
    }

    const severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
    const severity = isThreat ?
      severities[Math.floor(Math.random() * 4)] :
      'low';

    samples.push({
      id: `sample-${colonyType}-${i}`,
      type,
      features,
      severity,
      isThreat,
      metadata: {
        source: `synthetic-${colonyType}`,
        timestamp: Date.now() - Math.random() * 86400000,
      },
    });
  }

  return samples;
}

export function generateTestSamples(count: number): ThreatSample[] {
  const samples: ThreatSample[] = [];
  const threatTypes: ThreatType[] = ['financial', 'data_breach', 'fraud', 'malware', 'phishing'];

  for (let i = 0; i < count; i++) {
    const isThreat = Math.random() > 0.5;
    const type = threatTypes[Math.floor(Math.random() * threatTypes.length)];

    const features = Array.from({ length: 20 }, () => Math.random());

    const severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
    const severity = severities[Math.floor(Math.random() * severities.length)];

    samples.push({
      id: `test-sample-${i}`,
      type,
      features,
      severity,
      isThreat,
      metadata: {
        source: 'test-set',
        timestamp: Date.now(),
      },
    });
  }

  return samples;
}

// ============================================================================
// Pollen Grain Patterns (for Meadow)
// ============================================================================

export interface PollenPattern {
  id: string;
  name: string;
  colonyType: ColonyType;
  threatType: ThreatType;
  weight: number;
  features: number[];
  description: string;
}

export function generatePollenPatterns(colonyType: ColonyType): PollenPattern[] {
  const patterns: PollenPattern[] = [];

  if (colonyType === 'finance') {
    patterns.push(
      {
        id: 'pg-credit-fraud',
        name: 'credit_card_fraud_pattern',
        colonyType: 'finance',
        threatType: 'fraud',
        weight: 0.89,
        features: [0.9, 0.2, 0.1, 0.85, 0.3, 0.1, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        description: 'Detects credit card fraud patterns',
      },
      {
        id: 'pg-invoice-redflag',
        name: 'invoice_red_flag',
        colonyType: 'finance',
        threatType: 'financial',
        weight: 0.85,
        features: [0.2, 0.9, 0.1, 0.2, 0.1, 0.8, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        description: 'Identifies suspicious invoice patterns',
      },
      {
        id: 'pg-wire-anomaly',
        name: 'wire_transfer_anomaly',
        colonyType: 'finance',
        threatType: 'financial',
        weight: 0.87,
        features: [0.85, 0.2, 0.1, 0.2, 0.9, 0.1, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        description: 'Detects anomalous wire transfer behavior',
      }
    );
  } else if (colonyType === 'healthcare') {
    patterns.push(
      {
        id: 'pg-phi-exposure',
        name: 'phi_exposure_attempt',
        colonyType: 'healthcare',
        threatType: 'data_breach',
        weight: 0.92,
        features: [0.1, 0.95, 0.9, 0.1, 0.1, 0.1, 0.85, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        description: 'Detects attempts to expose PHI data',
      },
      {
        id: 'pg-medical-anomaly',
        name: 'medical_access_anomaly',
        colonyType: 'healthcare',
        threatType: 'data_breach',
        weight: 0.88,
        features: [0.1, 0.85, 0.85, 0.1, 0.1, 0.1, 0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        description: 'Identifies anomalous medical record access',
      },
      {
        id: 'pg-rx-fraud',
        name: 'prescription_fraud',
        colonyType: 'healthcare',
        threatType: 'fraud',
        weight: 0.86,
        features: [0.1, 0.8, 0.2, 0.1, 0.1, 0.1, 0.1, 0.85, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        description: 'Detects prescription fraud patterns',
      }
    );
  } else if (colonyType === 'retail') {
    patterns.push(
      {
        id: 'pg-pos-tamper',
        name: 'pos_device_tampering',
        colonyType: 'retail',
        threatType: 'malware',
        weight: 0.84,
        features: [0.1, 0.2, 0.9, 0.85, 0.1, 0.1, 0.1, 0.1, 0.8, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        description: 'Detects POS device tampering',
      },
      {
        id: 'pg-return-fraud',
        name: 'return_fraud_pattern',
        colonyType: 'retail',
        threatType: 'fraud',
        weight: 0.81,
        features: [0.1, 0.2, 0.85, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        description: 'Identifies return fraud patterns',
      },
      {
        id: 'pg-loyalty-abuse',
        name: 'loyalty_abuse',
        colonyType: 'retail',
        threatType: 'fraud',
        weight: 0.79,
        features: [0.1, 0.2, 0.8, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.85, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        description: 'Detects loyalty program abuse',
      }
    );
  }

  return patterns;
}

// ============================================================================
// Performance Metrics
// ============================================================================

export interface PerformanceMetrics {
  accuracy: number;
  detectionRate: number;
  falsePositiveRate: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingTime: number;
}

export interface ComparisonMetrics {
  baseline: PerformanceMetrics;
  federated: PerformanceMetrics;
  withMeadow: PerformanceMetrics;
}
