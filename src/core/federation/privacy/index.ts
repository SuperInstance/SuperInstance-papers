/**
 * POLLN Privacy Module Index
 * Pattern-Organized Large Language Network
 *
 * Exports all privacy-enhanced federated learning components.
 */

export { DifferentialPrivacy, createDefaultDPConfig, createStrictDPConfig, createRelaxedDPConfig, calculateOptimalEpsilon, calculateDeltaFromEpsilon, advancedComposition } from './differential-privacy.js';
export { SecureAggregation, createDefaultSecureAggregationConfig, createFastSecureAggregationConfig, createMaxSecuritySecureAggregationConfig } from './secure-aggregation.js';

export type { DifferentialPrivacyConfig, PrivacyAccountant, ClippedGradients, NoisedGradients } from './differential-privacy.js';
export type { SecureAggregationConfig, MaskedGradients, UnmaskingShare, SecureAggregationResult } from './secure-aggregation.js';
