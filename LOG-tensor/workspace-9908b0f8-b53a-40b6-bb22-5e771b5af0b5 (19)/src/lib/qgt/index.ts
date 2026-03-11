/**
 * QGT (Quaternion Geometric Transformer) Library
 * 
 * A novel SE(3)-equivariant architecture for geometric deep learning.
 */

// Core quaternion operations
export {
  Quaternion,
  Vector3,
  Matrix3,
  quaternionMultiply,
  quaternionConjugate,
  quaternionNorm,
  quaternionNormalize,
  quaternionToMatrix,
  matrixToQuaternion,
  quaternionSlerp,
  randomQuaternion,
  randomRotationMatrix,
  rotateVector,
  rotateVectors,
  rotateMatrix,
  cross,
  dot,
  vectorNorm,
  vectorNormalize,
  matrixFrobeniusNorm,
  identityMatrix,
  axisAngleToQuaternion,
  quaternionToAxisAngle,
  testEquivariance,
} from './quaternion';

// Frame utilities
export {
  Frame,
  FrameAveragingResult,
  computeLocalFrame,
  computeCanonicalFrames,
  applyFrameTransformPosition,
  applyInverseFrameTransformPosition,
  applyFrameTransformVector,
  applyInverseFrameTransformVector,
  averageInvariantOverFrames,
  averageEquivariantOverFrames,
  validateFrameAveraging,
} from './frameUtils';

// Spherical harmonics
export {
  SphericalHarmonicCoefficients,
  WignerDMatrix,
  computeYlm,
  computeAllYlm,
  computeWignerD,
  computeWignerDFromQuaternion,
  clebschGordan,
  getClebschGordanCoefficients,
  computeHigherOrderFeatures,
  validateWignerDOrthogonality,
  validateWignerDHomomorphism,
} from './sphericalHarmonics';

// Core model
export {
  QGTConfig,
  GeometricGraph,
  QGTOutput,
  QuaternionPositionEncoding,
  FrameAveragedAttention,
  HigherOrderMessagePassing,
  QGTModel,
  createQGTModel,
} from './qgtCore';

// Quaternion Neural Pathways (Schema 5)
export {
  // Types
  QuaternionVector,
  QuaternionBatch,
  QuaternionGradient,
  QuaternionLayerConfig,
  QuaternionForwardResult,
  // Classes
  QuaternionWeight,
  QuaternionLinear,
  QuaternionMLP,
  // Activation Functions
  quaternionReLU,
  quaternionReLUVector,
  quaternionReLUBatch,
  quaternionGated,
  quaternionGatedBatch,
  quaternionTanh,
  quaternionTanhBatch,
  quaternionNormalizeActivation,
  quaternionSplit,
  // Equivariance Testing
  testQuaternionEquivariance,
  testWeightEquivariance,
  testLinearEquivariance,
  testMLPEquivariance,
  // Utility Functions
  createRandomQuaternionBatch,
  vectorsToPureQuaternions,
  pureQuaternionsToVectors,
  quaternionBatchNorm,
  normalizeQuaternionBatch,
  // Advanced Operations
  quaternionAttention,
  quaternionMessagePassing,
} from './quaternionPathways';

// Fractal Rotation Hierarchies (Schema 7)
export {
  FractalScaleConfig,
  FractalHierarchyConfig,
  ScaleAttentionOutput,
  FractalAttentionOutput,
  SelfSimilarityValidation,
  ScaleSelectionStrategy,
  FractalAttention,
  SelfSimilarityValidator,
  OptimizedFractalAttention,
  createDefaultFractalScales,
  createFractalAttention,
  createSelfSimilarityValidator,
  validateFractalHierarchy,
  computeScaleImportance,
  selectOptimalScales,
} from './fractalHierarchies';

// Group Cohomology Attention (Schema 6)
export {
  CohomologyClass,
  WindingNumberResult,
  CohomologyAttentionConfig,
  CohomologyAttentionOutput,
  CupProductResult,
  computeWindingNumber,
  computeAllWindingNumbers,
  computeInvariantWindingFeatures,
  CohomologyAttention,
  CupProduct,
  testWindingNumberInvariance,
  testCohomologyAttentionInvariance,
  computeCharacteristicScale,
  createTestConfiguration,
  createCohomologyAttention,
  createCupProduct,
} from './cohomologyAttention';

// Topological Invariant Features (Schema 8)
export {
  // Types
  LinkingNumberResult,
  WritheResult,
  TopologicalFeatureConfig,
  TopologicalFeatureOutput,
  Curve,
  PointTopologicalFeatures,
  // Linking Number Functions
  computeLinkingNumber,
  computeLinkingNumberProjection,
  // Writhe Functions
  computeWrithe,
  computeLocalWrithe,
  // Winding Number Functions
  computeCurveWindingNumber,
  // Feature Extractor
  TopologicalFeatureExtractor,
  // Invariance Testing
  testTopologicalInvariance,
  benchmarkTopologicalFeatures,
  // Utility Functions
  createTopologicalTestConfiguration,
  createTrefoilKnot,
  createFigureEightKnot,
  createTopologicalFeatureExtractor,
} from './topologicalFeatures';

// Categorical Message Passing (Schema 9)
export {
  // Types
  GroupElement,
  GSet,
  GroupAction,
  GSetMorphism,
  MessagePassingConfig,
  Message,
  MessagePassingResult,
  FunctorVerificationResult,
  NaturalTransformation,
  NaturalityVerificationResult,
  // G-Set Operations
  createGSet,
  rotationGroupAction,
  identityGroupElement,
  composeGroupElements,
  inverseGroupElement,
  // Functor
  MessagePassingFunctor,
  createMessagePassingFunctor,
  // Verification
  verifyIdentityLaw,
  verifyCompositionLaw,
  verifyFunctorLaws,
  verifyEquivarianceByConstruction,
  verifyNaturality,
  verifyCategoricalMessagePassing,
  // Natural Transformations
  createNaturalTransformation,
  applyNaturalTransformation,
  // Composed Layers
  ComposedMessagePassing,
  // Utilities
  createTestGSet,
} from './categoricalMessagePassing';

// Unified QGT Layer (All Schemas Combined)
export {
  // Types
  ModuleConfig,
  UnifiedQGTConfig,
  StageOutput,
  UnifiedQGTOutput,
  EquivarianceTestResult,
  UnifiedQGTState,
  // Main Class
  UnifiedQGTLayer,
  // Configuration
  createDefaultUnifiedQGTConfig,
  createTestUnifiedQGTConfig,
  // Factory
  createUnifiedQGT,
  // Testing
  testUnifiedQGTEquivariance,
  benchmarkUnifiedQGT,
} from './unifiedQGT';

// SE(3)-QGT (6D Pose: Position + Orientation)
export {
  // Types
  DualQuaternion,
  Twist,
  SE3Matrix,
  Pose6D,
  SE3QGTConfig,
  // Dual Quaternion Operations
  dualQuaternionIdentity,
  dualQuaternionFromRT,
  dualQuaternionFromMatrix,
  dualQuaternionMultiply,
  dualQuaternionConjugate,
  dualQuaternionInverse,
  dualQuaternionTransformPoint,
  dualQuaternionToTwist,
  twistToDualQuaternion,
  // Classes
  DualQuaternionPositionalEncoding,
  ScrewAttention,
  TwistFeedForward,
  SE3QGT,
  // Utilities
  createPosesFromPositions,
  generateRandomPoses,
  randomSE3,
} from './se3Core';

// Cohomological Fiber Attention (AI-Discovered Architecture)
export {
  // Types
  SE3Element,
  IrrepFeature,
  BundlePoint,
  CohomologicalAttentionConfig,
  Group2Cocycle,
  // SE(3) Operations
  se3Identity,
  randomSE3Element,
  se3Multiply,
  se3Inverse,
  relativeSE3,
  se3Action,
  // Cohomology
  windingNumberCocycle,
  translationCocycle,
  combinedCocycle,
  // Lie Algebra
  se3Log,
  lieBracket,
  // Class
  CohomologicalFiberAttention,
  // Utilities
  createBundlePoints,
  generateRandomPositions,
} from './cohomologicalFiberAttention';

// Spin Trajectory Dynamics (Direction as First-Class Data)
export {
  // Types
  SpinState,
  SpinWeight,
  SpinDynamicsConfig,
  HigherDimDirection,
  SpinTrajectoryResult,
  // Classes
  SpinHamiltonian,
  SpinDynamicsSimulator,
  HigherDimensionalDirection,
  SpinTrajectoryField,
  // Utilities
  createRandomSpinState,
  createRandomWeights,
} from './spinTrajectory';
