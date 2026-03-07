/**
 * Core exports
 */

export * from './types.js';
export { BaseAgent } from './agent.js';
export { SPOREProtocol } from './protocol.js';
export { PlinkoLayer } from './decision.js';
export type { PlinkoConfig } from './decision.js';
export type { PlinkoResult } from './decision.js';
export type { AgentProposal } from './decision.js';
export { HebbianLearning } from './learning.js';
export { GraphEvolution } from './evolution.js';
export { Colony } from './colony.js';
export type { ColonyConfig } from './colony.js';
export type { ColonyStats } from './colony.js';
export { A2APackageSystem } from './communication.js';
export type { A2APackageSystemConfig } from './communication.js';
export { BES } from './embedding.js';
export type { BESConfig } from './embedding.js';
export type { PollenGrain } from './embedding.js';
export type { PrivacyTier } from './embedding.js';
export { SafetyLayer } from './safety.js';
export type { ConstitutionalConstraint } from './safety.js';
export type { SafetyCheckResult } from './safety.js';
export type { EmergencyState } from './safety.js';
export { WorldModel } from './worldmodel.js';
export type { WorldModelConfig } from './worldmodel.js';
export type { DreamEpisode } from './worldmodel.js';

// Federated Learning (Phase 3: Collective Intelligence)
export { FederatedLearningCoordinator } from './federated.js';
export type {
  ColonyInfo,
  ModelVersion,
  GradientUpdate,
  FederatedRoundConfig,
  FederatedRoundStatus,
  PrivacyAccounting,
  FederationConfig,
} from './federated.js';

// Concrete Agents
export { TaskAgent, RoleAgent, CoreAgent, TileCategory } from './agents.js';

// Knowledge Succession
export {
  KnowledgeSuccessionManager,
  TileLifecycleManager,
  KnowledgeStage,
} from './succession.js';
export type {
  KnowledgePacket,
  PatternData,
  TransferReason,
  SuccessionEvent,
} from './succession.js';

// META Tiles (Pluripotent Agents)
export {
  MetaTile,
  MetaTileManager,
  MetaTileState,
  DifferentiationPotential,
} from './meta.js';
export type {
  MetaTileConfig,
  DifferentiationSignal,
  DifferentiationRecord,
} from './meta.js';

// Value Network (TD(λ) Learning)
export {
  ValueNetwork,
  ValueNetworkManager,
} from './valuenetwork.js';
export type {
  ValuePrediction,
  Trajectory,
  StateAction,
  ValueNetworkConfig,
  TrainingSample,
} from './valuenetwork.js';

// Dream-Based Policy Optimization
export {
  DreamBasedPolicyOptimizer,
  DreamManager,
} from './dreaming.js';
export type {
  DreamingConfig,
  PolicyParameters,
  PolicyImprovement,
  Experience,
  DreamOptimizationResult,
  ActionDistribution,
} from './dreaming.js';

// Meadow (Phase 3: Collective Intelligence)
export { Meadow } from './meadow.js';
export {
  CommunityPermission,
  CommunityVisibility,
  FPICStatus,
  RestrictionLevel,
} from './meadow.js';
export type {
  CommunityConfig,
  CommunityState,
  CommunityMembership,
  SharedPollenGrain,
  FPICConsent,
  BenefitSharing,
  TKLabels,
  DiscoveryFilters,
  Recommendation,
  CommunityRule,
  ModerationAction,
  MeadowStats,
} from './meadow.js';
