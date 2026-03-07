/**
 * Core exports
 */

export * from './types';
export { BaseAgent } from './agent';
export { SPOREProtocol } from './protocol';
export { PlinkoLayer } from './decision';
export type { PlinkoConfig, from './decision';
export type { PlinkoResult } from './decision';
export type { AgentProposal } from './decision';
export { HebbianLearning } from './learning';
export { Colony } from './colony';
export type { ColonyConfig } from './colony';
export type { ColonyStats } from './colony';
export { A2APackageSystem } from './communication';
export type { A2APackageSystemConfig } from './communication';
export { BES } from './embedding';
export type { BESConfig } from './embedding';
export type { PollenGrain } from './embedding';
export type { PrivacyTier } from './embedding';
export { SafetyLayer } from './safety';
export type { ConstitutionalConstraint } from './safety';
export type { SafetyCheckResult } from './safety';
export type { EmergencyState } from './safety';
export { WorldModel } from './worldmodel';
export type { WorldModelConfig } from './worldmodel';
export type { DreamEpisode } from './worldmodel';
