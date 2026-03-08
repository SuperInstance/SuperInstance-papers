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

// Knowledge Succession
export {
  KnowledgeSuccessionManager,
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

// Tile Dreaming (Overnight Optimization)
export { TileDreamer, withDreaming } from './tiledreaming.js';
export type {
  TileDreamingConfig,
  TileExperience,
  TileDreamResult,
  SleepReport,
} from './tiledreaming.js';

// KVCOMM Anchor-Based KV-Cache Communication
export {
  KVAnchorPool,
  AnchorMatcher,
  OffsetPredictor,
  AnchorPredictor,
} from './kvanchor.js';
export type {
  KVCacheSegment,
  KVCacheMetadata,
  KVAnchor,
  OffsetPrediction,
  AnchorMatch,
  KVAnchorPoolConfig,
  AnchorMatcherConfig,
  OffsetPredictorConfig,
} from './kvanchor.js';

// Tile System
export {
  BaseTile,
  TileCategory,
  TilePipeline,
  TileLifecycleManager,
} from './tile.js';
export type {
  Tile,
  TileConfig,
  TileContext,
  TileResult,
  TileOutcome,
  Observation,
  PollenGrain as TilePollenGrain,
  TileVariant,
} from './tile.js';

// Cache Utilities
export {
  CacheSlicer,
  CacheConcatenator,
  CacheReplacer,
  CacheIndexSelector,
  CacheSplitter,
  cacheSlicer,
  cacheConcatenator,
  cacheReplacer,
  cacheIndexSelector,
  cacheSplitter,
  cloneCacheData,
  validateCache,
  getCacheStats,
} from "./cacheutils.js";
export type {
  TensorLike,
  Cache,
  CacheMetadata,
  SliceSpec,
  Span,
  SplitResult,
  CacheOptions,
} from "./cacheutils.js";

// Context Sharing (KVCOMM-inspired)
export {
  SharedContextManager,
  ContextSegmentImpl,
  ContextReusePolicyImpl,
  ContextDiffTracker,
  PlaceholderContextManager,
} from './contextshare.js';
export {
  ContextPrivacy,
} from './contextshare.js';
export type {
  ContextSegment,
  SharedContext,
  ContextReuseDecision,
  ContextOffset,
  ContextReusePolicy,
  ContextDiff,
  SharedContextManagerConfig,
  ContextSharingStats,
  Placeholder,
  ContextTemplate,
} from './contextshare.js';

// KV-Tile Integration (Tile + KV Anchor Bridge)
export {
  TileKVCache,
  TileAnchorBridge,
  TileContextReuse,
} from './kvtile.js';
export type {
  TileKVCacheEntry,
  TileCacheStats,
  TileKVCacheConfig,
  CacheLookupResult,
  TileReuseStats,
  ContextDiff as TileContextDiff,
} from './kvtile.js';

// KV-Federated Integration
export {
  FederatedKVSync,
  PrivacyAwareAnchors,
  AnchorAggregation,
} from './kvfederated.js';
export type {
  PrivateKVAnchor,
  AnchorSyncPackage,
  AggregatedAnchor,
  AnchorPrivacyBudget,
  FederatedKVSyncConfig,
  PrivacyAwareAnchorConfig,
  AnchorAggregationConfig,
  FederatedKVStats,
} from './kvfederated.js';

// KV-Dream Integration (KV-cache + WorldModel dreaming)
export {
  DreamKVManager,
  DreamAnchors,
  ImaginationCache,
  KVDreamIntegration,
} from './kvdream.js';
export type {
  KVDreamConfig,
  DreamKVCache,
  DreamAnchor,
  ImaginationCache as ImaginationCacheEntry,
  KVDreamResult,
  KVDreamStats,
} from './kvdream.js';

// KV-Cache Meadow Marketplace
export {
  AnchorMarket,
  AnchorPollenManager,
  CommunityAnchorPool,
} from './kvmeadow.js';
export type {
  AnchorListing,
  AnchorRequest,
  AnchorPollen,
  ProvenanceData,
  ProvenanceModification,
  AnchorVote,
  CommunityAnchor,
  MarketplaceStats,
  CommunityPoolStats,
} from './kvmeadow.js';

// ANN Index for KV-Anchor Optimization
export {
  ANNIndex,
  benchmarkANNIndex,
  generateRandomEmbeddings,
} from './ann-index.js';
export type {
  ANNAlgorithm,
  ANNIndexConfig,
  SearchResult,
  BuildStats,
  SearchStats,
} from './ann-index.js';

// LMCache Adapter (LMCache Backend Integration)
export {
  LMCacheAdapter,
  KVCacheSerializer,
  PythonBridge,
  createLMCacheAdapter,
} from './lmcache-adapter.js';
export type {
  LMCacheBackendType,
  LMCacheAdapterConfig,
  LMCacheLookupOptions,
  LMCacheStoreOptions,
  LMCacheStats,
  SerializedLMCache,
  SerializedTensor,
  LMKVCache,
  BatchResult,
} from './lmcache-adapter.js';

// Distributed Coordination (Phase 4 Sprint 2)
export {
  DistributedBackend,
  MemoryBackend,
  RedisBackend,
  NATSBackend,
  createBackend,
  DiscoveryService,
  LoadBalancer,
  DistributedPheromones,
  GradientTaskAllocator,
  ColonyFederation,
  FederationManager,
  DistributedCoordination,
  createDistributedCoordination,
  DEFAULT_DISTRIBUTED_CONFIG,
} from './distributed/index.js';
export type {
  DistributedConfig,
  NodeInfo,
  PheromoneField,
  DistributedMessage,
  ClusterState,
  ClusterMetrics,
  ColonyInfo as DistributedColonyInfo,
  FederationState,
  FederationMessage,
  FederationMessageType,
  PheromoneGradient,
  PheromoneQuery,
  PheromoneUpdate,
  DiscoveryConfig,
  DiscoveryEvent,
  LoadBalancerConfig,
  LoadReport,
  MessageQueueConfig,
  QueuedMessage,
  DistributedCoordinationConfig,
} from './distributed/index.js';

// Guardian Angel Safety System (Phase 4 Sprint 5)
export {
  GuardianAngelAgent,
  GuardianLearningSystem,
  GuardianIntegratedSafety,
  createGuardianSafety,
  createGuardianAgent,
  createGuardianContext,
  isAllowed,
  isModified,
  isVetoed,
  applyModifications,
  DEFAULT_GUARDIAN_CONFIG,
  GUARDIAN_SEVERITY,
  GUARDIAN_DECISIONS,
  BUILT_IN_CONSTRAINTS,
  getConstraintsByCategory,
  getConstraintsBySeverity,
  getActiveConstraints,
  getConstraintById,
  CONSTRAINT_CATEGORIES,
} from './guardian/index.js';
export type {
  GuardianDecision,
  ConstraintSeverity,
  ConstraintCategory,
  GuardianContext,
  ConstraintResult,
  GuardianConstraint,
  ConstraintStats,
  GuardianReview,
  GuardianFeedback,
  GuardianStats,
  GuardianConfig,
  GuardianAlert,
  ExecutionMonitor,
  ResourceSnapshot,
  WeightAdjustment,
  AdaptationResult,
  GuardianState,
  LearningConfig,
  LearningMetrics,
  ConstraintLearningMetrics,
} from './guardian/index.js';

// Bytecode Bridge (Phase 4 Sprint 1)
export {
  BytecodeBridge,
  StabilityAnalyzer,
  BytecodeCompiler,
  BytecodeExecutor,
  createBytecodeBridge,
} from './bytecode/index.js';
export type {
  // Types
  Opcode,
  BytecodeInstruction,
  CompiledPathway,
  PathwayAnalysis,
  PathwayTrace,
  PathwayStats,
  CompilationConfig,
  CompilationResult,
  DecompilationContext,
  ExecutionContext,
  ExecutionResult,
  SandboxConfig,
  PathwayCacheEntry,
  OptimizationPass,
  BytecodeMetrics,
  BytecodeTelemetry,
  BytecodeBridgeConfig,
  BytecodeSafetyCheck,
  BytecodePlinkoConfig,
} from './bytecode/index.js';
