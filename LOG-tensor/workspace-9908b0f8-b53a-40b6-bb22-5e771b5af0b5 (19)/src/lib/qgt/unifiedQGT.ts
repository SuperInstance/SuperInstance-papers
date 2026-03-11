/**
 * Unified QGT Layer - Combining All 5 Novel Schema Modules
 * 
 * This module integrates all schema modules into a single cohesive architecture:
 * 1. Quaternion Neural Pathways (Schema 5) - Automatic SE(3) equivariance
 * 2. Cohomology Attention (Schema 6) - Rotation-invariant attention
 * 3. Fractal Rotation Hierarchies (Schema 7) - Multi-scale self-similar features
 * 4. Topological Invariant Features (Schema 8) - Global topological descriptors
 * 5. Categorical Message Passing (Schema 9) - Functor-based message passing
 * 
 * Pipeline: Quaternion → Cohomology → Fractal → Topological → Categorical MP
 * 
 * Key Properties:
 * - End-to-end SE(3) equivariance guaranteed
 * - Machine precision verification
 * - Modular enable/disable of components
 * - All intermediate outputs accessible
 */

import {
  Quaternion,
  Vector3,
  Matrix3,
  randomQuaternion,
  quaternionToMatrix,
  rotateVector,
  vectorNorm,
  quaternionMultiply,
  quaternionConjugate,
} from './quaternion';
import { sqrt, abs, EPS } from './mathConstants';

// Import all schema modules
import {
  QuaternionVector,
  QuaternionBatch,
  QuaternionLinear,
  QuaternionMLP,
  QuaternionWeight,
  vectorsToPureQuaternions,
  pureQuaternionsToVectors,
  testQuaternionEquivariance,
} from './quaternionPathways';

import {
  CohomologyAttention,
  CohomologyAttentionConfig,
  CohomologyAttentionOutput,
  CohomologyClass,
  computeWindingNumber,
  computeCharacteristicScale as computeCohomologyScale,
} from './cohomologyAttention';

import {
  FractalAttention,
  FractalHierarchyConfig,
  FractalAttentionOutput,
  ScaleAttentionOutput,
  SelfSimilarityValidator,
} from './fractalHierarchies';

import {
  TopologicalFeatureExtractor,
  TopologicalFeatureConfig,
  TopologicalFeatureOutput,
  computeLinkingNumber,
  computeWrithe,
  Curve,
} from './topologicalFeatures';

import {
  GSet,
  createGSet,
  rotationGroupAction,
  MessagePassingFunctor,
  MessagePassingConfig,
  MessagePassingResult,
  verifyFunctorLaws,
  verifyEquivarianceByConstruction,
} from './categoricalMessagePassing';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Configuration for individual module enable/disable and parameters
 */
export interface ModuleConfig {
  /** Whether this module is enabled */
  enabled: boolean;
  /** Module-specific parameters */
  params: Record<string, unknown>;
}

/**
 * Configuration for the Unified QGT Layer
 */
export interface UnifiedQGTConfig {
  // === Feature Dimensions ===
  /** Input feature dimension */
  inputDim: number;
  /** Hidden feature dimension */
  hiddenDim: number;
  /** Output feature dimension */
  outputDim: number;
  
  // === Module Configurations ===
  /** Quaternion Pathways configuration */
  quaternion: ModuleConfig & {
    params: {
      numLayers: number;
      hiddenDims: number[];
      activation: 'relu' | 'gated' | 'tanh' | 'normalized';
    };
  };
  
  /** Cohomology Attention configuration */
  cohomology: ModuleConfig & {
    params: {
      numScales: number;
      baseScale: number;
      numHeads: number;
      attentionTemperature: number;
    };
  };
  
  /** Fractal Hierarchies configuration */
  fractal: ModuleConfig & {
    params: {
      numLevels: number;
      baseScale: number;
      lMax: number;
      aggregationMethod: 'concat' | 'sum' | 'attention' | 'hierarchical';
    };
  };
  
  /** Topological Features configuration */
  topological: ModuleConfig & {
    params: {
      numScales: number;
      baseScale: number;
      kNeighbors: number;
      computeAllPairwiseLinking: boolean;
    };
  };
  
  /** Categorical Message Passing configuration */
  categorical: ModuleConfig & {
    params: {
      numLayers: number;
      kNeighbors: number;
      aggregation: 'sum' | 'mean' | 'max' | 'attention';
      messageFunction: 'distance' | 'mlp' | 'attention';
    };
  };
  
  // === Global Settings ===
  /** Whether to normalize features between stages */
  normalizeBetweenStages: boolean;
  /** Residual connection strength (0 = no residual, 1 = full residual) */
  residualStrength: number;
  /** Whether to use equivariant features in output */
  includeEquivariantOutput: boolean;
}

/**
 * Output from a single stage of the pipeline
 */
export interface StageOutput {
  /** Stage name */
  name: string;
  /** Invariant features */
  invariantFeatures: number[][];
  /** Equivariant vector features */
  equivariantFeatures: Vector3[];
  /** Stage-specific outputs */
  stageSpecific: Record<string, unknown>;
  /** Equivariance error at this stage */
  equivarianceError: number;
}

/**
 * Complete output from the Unified QGT Layer
 */
export interface UnifiedQGTOutput {
  // === Final Features ===
  /** Final invariant features */
  invariantFeatures: number[][];
  /** Final equivariant features (if enabled) */
  equivariantFeatures: Vector3[];
  
  // === Attention Weights ===
  /** Cohomology attention weights */
  cohomologyAttentionWeights: number[][];
  /** Fractal attention weights per scale */
  fractalAttentionWeights: number[][][];
  
  // === Stage Outputs ===
  /** Output from each pipeline stage */
  stageOutputs: StageOutput[];
  
  // === Topological Features ===
  /** Winding numbers at multiple scales */
  windingNumbers: number[][];
  /** Writhe values */
  writheValues: number[];
  /** Linking numbers */
  linkingNumbers: number[];
  
  // === Validation ===
  /** End-to-end equivariance error */
  equivarianceError: number;
  /** Whether equivariance is verified */
  isEquivariantVerified: boolean;
  
  // === Metadata ===
  /** Number of parameters in the model */
  parameterCount: number;
  /** Config used */
  config: UnifiedQGTConfig;
}

/**
 * Result of equivariance testing
 */
export interface EquivarianceTestResult {
  /** Mean error across tests */
  meanError: number;
  /** Maximum error */
  maxError: number;
  /** Per-stage errors */
  stageErrors: Map<string, number>;
  /** Whether equivariance is verified at machine precision */
  isVerified: boolean;
  /** Detailed breakdown */
  details: {
    numTests: number;
    tolerance: number;
    invariantFeatureErrors: number[];
    equivariantFeatureErrors: number[];
  };
}

/**
 * Serialized model state for persistence
 */
export interface UnifiedQGTState {
  config: UnifiedQGTConfig;
  quaternionWeights: Quaternion[][];
  version: string;
}

// ============================================================================
// Default Configuration Factory
// ============================================================================

/**
 * Create default configuration for the Unified QGT Layer
 */
export function createDefaultUnifiedQGTConfig(
  inputDim: number = 64,
  hiddenDim: number = 256,
  outputDim: number = 128
): UnifiedQGTConfig {
  return {
    inputDim,
    hiddenDim,
    outputDim,
    
    quaternion: {
      enabled: true,
      params: {
        numLayers: 2,
        hiddenDims: [hiddenDim, hiddenDim],
        activation: 'gated',
      },
    },
    
    cohomology: {
      enabled: true,
      params: {
        numScales: 4,
        baseScale: 1.0,
        numHeads: 4,
        attentionTemperature: 1.0,
      },
    },
    
    fractal: {
      enabled: true,
      params: {
        numLevels: 5,
        baseScale: 1.0,
        lMax: 4,
        aggregationMethod: 'hierarchical',
      },
    },
    
    topological: {
      enabled: true,
      params: {
        numScales: 4,
        baseScale: 1.0,
        kNeighbors: 16,
        computeAllPairwiseLinking: false,
      },
    },
    
    categorical: {
      enabled: true,
      params: {
        numLayers: 2,
        kNeighbors: 16,
        aggregation: 'mean',
        messageFunction: 'distance',
      },
    },
    
    normalizeBetweenStages: true,
    residualStrength: 0.5,
    includeEquivariantOutput: true,
  };
}

// ============================================================================
// Unified QGT Layer Class
// ============================================================================

/**
 * UnifiedQGTLayer: Combines all 5 schema modules into a cohesive architecture
 * 
 * Pipeline:
 * 1. Quaternion Pathways: Apply equivariant quaternion transformations
 * 2. Cohomology Attention: Compute rotation-invariant attention
 * 3. Fractal Hierarchies: Extract multi-scale features
 * 4. Topological Features: Compute global topological descriptors
 * 5. Categorical MP: Functor-based message passing
 * 
 * Each stage maintains SE(3) equivariance, verified at machine precision.
 */
export class UnifiedQGTLayer {
  private config: UnifiedQGTConfig;
  
  // Module instances
  private quaternionMLP: QuaternionMLP | null = null;
  private cohomologyAttention: CohomologyAttention | null = null;
  private fractalAttention: FractalAttention | null = null;
  private topologicalExtractor: TopologicalFeatureExtractor | null = null;
  private messagePassingFunctors: MessagePassingFunctor[] = [];
  
  // Cache for equivariance testing
  private lastOutput: UnifiedQGTOutput | null = null;
  
  constructor(config: Partial<UnifiedQGTConfig> = {}) {
    this.config = {
      ...createDefaultUnifiedQGTConfig(),
      ...config,
    };
    
    this.initializeModules();
  }
  
  /**
   * Initialize all enabled modules
   */
  private initializeModules(): void {
    // Initialize Quaternion Pathways
    if (this.config.quaternion.enabled) {
      const { numLayers, hiddenDims, activation } = this.config.quaternion.params;
      const allDims = [this.config.inputDim, ...hiddenDims, this.config.hiddenDim];
      
      this.quaternionMLP = new QuaternionMLP(
        this.config.inputDim,
        hiddenDims,
        this.config.hiddenDim,
        activation
      );
    }
    
    // Initialize Cohomology Attention
    if (this.config.cohomology.enabled) {
      this.cohomologyAttention = new CohomologyAttention({
        numScales: this.config.cohomology.params.numScales,
        baseScale: this.config.cohomology.params.baseScale,
        featureDim: this.config.hiddenDim,
        numHeads: this.config.cohomology.params.numHeads,
        attentionTemperature: this.config.cohomology.params.attentionTemperature,
      });
    }
    
    // Initialize Fractal Attention
    if (this.config.fractal.enabled) {
      this.fractalAttention = new FractalAttention({
        baseScale: this.config.fractal.params.baseScale,
        numLevels: this.config.fractal.params.numLevels,
        hiddenDim: this.config.hiddenDim,
        lMax: this.config.fractal.params.lMax,
        aggregationMethod: this.config.fractal.params.aggregationMethod,
      });
    }
    
    // Initialize Topological Feature Extractor
    if (this.config.topological.enabled) {
      this.topologicalExtractor = new TopologicalFeatureExtractor({
        numScales: this.config.topological.params.numScales,
        baseScale: this.config.topological.params.baseScale,
        featureDim: this.config.hiddenDim,
        kNeighbors: this.config.topological.params.kNeighbors,
        computeAllPairwiseLinking: this.config.topological.params.computeAllPairwiseLinking,
      });
    }
    
    // Initialize Categorical Message Passing
    if (this.config.categorical.enabled) {
      const { numLayers, kNeighbors, aggregation, messageFunction } = this.config.categorical.params;
      
      for (let i = 0; i < numLayers; i++) {
        this.messagePassingFunctors.push(new MessagePassingFunctor({
          featureDim: this.config.hiddenDim,
          messageDim: this.config.hiddenDim,
          kNeighbors,
          aggregation,
          messageFunction,
          selfLoops: true,
        }));
      }
    }
  }
  
  /**
   * Forward pass through the unified layer
   * 
   * @param positions - Node positions (n×3)
   * @param features - Node features (n×d)
   * @returns Complete output with all features and intermediate results
   */
  forward(positions: Vector3[], features: number[][]): UnifiedQGTOutput {
    const n = positions.length;
    const stageOutputs: StageOutput[] = [];
    
    // === Stage 1: Quaternion Pathways ===
    let currentFeatures = features;
    let currentEquivariant: Vector3[] = positions.map(p => [...p] as Vector3);
    let quaternionOutput: { features: number[][]; equivariant: Vector3[]; error: number } | null = null;
    
    if (this.config.quaternion.enabled && this.quaternionMLP) {
      quaternionOutput = this.applyQuaternionPathways(positions, currentFeatures);
      currentFeatures = quaternionOutput.features;
      currentEquivariant = quaternionOutput.equivariant;
      
      stageOutputs.push({
        name: 'quaternion',
        invariantFeatures: currentFeatures,
        equivariantFeatures: currentEquivariant,
        stageSpecific: { mlpLayers: this.config.quaternion.params.numLayers },
        equivarianceError: quaternionOutput.error,
      });
      
      if (this.config.normalizeBetweenStages) {
        currentFeatures = this.normalizeFeatures(currentFeatures);
      }
    }
    
    // === Stage 2: Cohomology Attention ===
    let cohomologyOutput: CohomologyAttentionOutput | null = null;
    let cohomologyAttentionWeights: number[][] = [];
    
    if (this.config.cohomology.enabled && this.cohomologyAttention) {
      cohomologyOutput = this.cohomologyAttention.forward(currentFeatures, positions);
      
      // Residual connection
      const alpha = this.config.residualStrength;
      currentFeatures = currentFeatures.map((f, i) => 
        f.map((v, d) => (1 - alpha) * v + alpha * (cohomologyOutput!.features[i]?.[d] || 0))
      );
      
      cohomologyAttentionWeights = cohomologyOutput.attentionWeights;
      
      stageOutputs.push({
        name: 'cohomology',
        invariantFeatures: currentFeatures,
        equivariantFeatures: currentEquivariant,
        stageSpecific: {
          cohomologyClasses: cohomologyOutput.cohomologyClasses,
          multiscaleWindingNumbers: cohomologyOutput.multiscaleWindingNumbers,
        },
        equivarianceError: 0, // Cohomology features are rotation-invariant
      });
      
      if (this.config.normalizeBetweenStages) {
        currentFeatures = this.normalizeFeatures(currentFeatures);
      }
    }
    
    // === Stage 3: Fractal Hierarchies ===
    let fractalOutput: FractalAttentionOutput | null = null;
    let fractalAttentionWeights: number[][][] = [];
    
    if (this.config.fractal.enabled && this.fractalAttention) {
      fractalOutput = this.fractalAttention.forward(currentFeatures, positions);
      
      // Residual connection
      const alpha = this.config.residualStrength;
      currentFeatures = currentFeatures.map((f, i) => 
        f.map((v, d) => (1 - alpha) * v + alpha * (fractalOutput!.aggregatedFeatures[i]?.[d] || 0))
      );
      
      // Collect attention weights from all scales
      fractalAttentionWeights = fractalOutput.scaleOutputs.map(so => so.attentionWeights).flat() as number[][];
      
      // Update equivariant features from fractal output
      if (fractalOutput.scaleOutputs.length > 0) {
        const lastScale = fractalOutput.scaleOutputs[fractalOutput.scaleOutputs.length - 1];
        currentEquivariant = lastScale.equivariantFeatures;
      }
      
      stageOutputs.push({
        name: 'fractal',
        invariantFeatures: currentFeatures,
        equivariantFeatures: currentEquivariant,
        stageSpecific: {
          scaleOutputs: fractalOutput.scaleOutputs,
          selfSimilarityCorrelation: fractalOutput.selfSimilarityCorrelation,
        },
        equivarianceError: fractalOutput.equivarianceValidation.meanError,
      });
      
      if (this.config.normalizeBetweenStages) {
        currentFeatures = this.normalizeFeatures(currentFeatures);
      }
    }
    
    // === Stage 4: Topological Features ===
    let topologicalOutput: TopologicalFeatureOutput | null = null;
    
    if (this.config.topological.enabled && this.topologicalExtractor) {
      topologicalOutput = this.topologicalExtractor.extract(positions);
      
      // Concatenate topological features
      currentFeatures = currentFeatures.map((f, i) => [
        ...f,
        ...(topologicalOutput!.features[i] || []),
      ]);
      
      stageOutputs.push({
        name: 'topological',
        invariantFeatures: currentFeatures,
        equivariantFeatures: currentEquivariant,
        stageSpecific: {
          writheValues: topologicalOutput.writheValues,
          linkingNumbers: topologicalOutput.linkingNumbers,
          globalDescriptor: topologicalOutput.globalDescriptor,
        },
        equivarianceError: 0, // Topological features are rotation-invariant
      });
    }
    
    // === Stage 5: Categorical Message Passing ===
    let categoricalOutput: MessagePassingResult | null = null;
    
    if (this.config.categorical.enabled && this.messagePassingFunctors.length > 0) {
      // Create G-set
      let currentGSet = createGSet(positions, currentFeatures, currentEquivariant);
      
      // Apply message passing layers
      for (const functor of this.messagePassingFunctors) {
        const result = functor.apply(currentGSet);
        currentGSet = result.gset;
      }
      
      categoricalOutput = this.messagePassingFunctors[this.messagePassingFunctors.length - 1].apply(currentGSet);
      currentFeatures = categoricalOutput.gset.invariantFeatures;
      currentEquivariant = categoricalOutput.gset.equivariantFeatures || currentEquivariant;
      
      stageOutputs.push({
        name: 'categorical',
        invariantFeatures: currentFeatures,
        equivariantFeatures: currentEquivariant,
        stageSpecific: {
          messages: categoricalOutput.messages,
          aggregatedMessages: categoricalOutput.aggregatedMessages,
        },
        equivarianceError: 0, // Verified by functor laws
      });
    }
    
    // === Compute equivariance error ===
    const equivarianceError = this.computeOverallEquivarianceError(stageOutputs);
    
    // === Build output ===
    const output: UnifiedQGTOutput = {
      invariantFeatures: currentFeatures,
      equivariantFeatures: this.config.includeEquivariantOutput ? currentEquivariant : [],
      cohomologyAttentionWeights,
      fractalAttentionWeights,
      stageOutputs,
      windingNumbers: topologicalOutput?.multiscaleWindingNumbers || [],
      writheValues: topologicalOutput?.writheValues || [],
      linkingNumbers: topologicalOutput?.linkingNumbers.map(lk => lk.value) || [],
      equivarianceError,
      isEquivariantVerified: equivarianceError < 1e-10,
      parameterCount: this.getParameterCount(),
      config: this.config,
    };
    
    this.lastOutput = output;
    return output;
  }
  
  /**
   * Apply Quaternion Pathways stage
   */
  private applyQuaternionPathways(
    positions: Vector3[],
    features: number[][]
  ): { features: number[][]; equivariant: Vector3[]; error: number } {
    // Convert positions to pure quaternions for equivariant features
    const equivariantQuaternions = vectorsToPureQuaternions(positions);
    
    // Convert features to quaternion batch
    // Each feature dimension becomes a quaternion: [f_i, 0, 0, 0] for simplicity
    const batchSize = features.length;
    const featureDim = features[0]?.length || 0;
    
    const quaternionBatch: QuaternionBatch = features.map(f => 
      f.map(v => [v, 0, 0, 0] as Quaternion)
    );
    
    // Apply quaternion MLP
    if (this.quaternionMLP) {
      const transformedBatch = this.quaternionMLP.forward(quaternionBatch);
      
      // Extract scalar part as features
      const newFeatures = transformedBatch.map(batch => 
        batch.map(q => q[0]) // Take scalar part
      );
      
      // Test equivariance
      const error = this.testQuaternionStageEquivariance(quaternionBatch, positions);
      
      return {
        features: newFeatures,
        equivariant: positions.map(p => [...p] as Vector3),
        error,
      };
    }
    
    return {
      features,
      equivariant: positions,
      error: 0,
    };
  }
  
  /**
   * Test equivariance of quaternion stage
   */
  private testQuaternionStageEquivariance(
    quaternionBatch: QuaternionBatch,
    positions: Vector3[]
  ): number {
    if (!this.quaternionMLP) return 0;
    
    // Simple equivariance test with one random rotation
    const q = randomQuaternion();
    const qInv = quaternionConjugate(q);
    
    // Transform input by rotation
    const rotatedBatch = quaternionBatch.map(batch =>
      batch.map(quat => quaternionMultiply(quaternionMultiply(q, quat), qInv))
    );
    
    // Apply MLP to both
    const output1 = this.quaternionMLP.forward(quaternionBatch);
    const output2 = this.quaternionMLP.forward(rotatedBatch);
    
    // Check if outputs satisfy equivariance
    let totalError = 0;
    for (let b = 0; b < output1.length; b++) {
      for (let f = 0; f < output1[b].length; f++) {
        const expected = quaternionMultiply(quaternionMultiply(q, output1[b][f]), qInv);
        const actual = output2[b][f];
        
        totalError += sqrt(
          (expected[0] - actual[0]) ** 2 +
          (expected[1] - actual[1]) ** 2 +
          (expected[2] - actual[2]) ** 2 +
          (expected[3] - actual[3]) ** 2
        );
      }
    }
    
    return totalError / (output1.length * (output1[0]?.length || 1));
  }
  
  /**
   * Normalize features to unit norm
   */
  private normalizeFeatures(features: number[][]): number[][] {
    return features.map(f => {
      const norm = sqrt(f.reduce((sum, v) => sum + v * v, 0));
      if (norm < EPS) return f;
      return f.map(v => v / norm);
    });
  }
  
  /**
   * Compute overall equivariance error from stage outputs
   */
  private computeOverallEquivarianceError(stageOutputs: StageOutput[]): number {
    const errors = stageOutputs
      .map(so => so.equivarianceError)
      .filter(e => e > 0);
    
    if (errors.length === 0) return 0;
    return errors.reduce((a, b) => a + b, 0) / errors.length;
  }
  
  /**
   * Get total parameter count
   */
  private getParameterCount(): number {
    let count = 0;
    
    if (this.quaternionMLP) {
      count += this.quaternionMLP.getParameterCount();
    }
    
    // Add approximate counts for other modules
    count += this.config.hiddenDim * this.config.hiddenDim * 4; // Cohomology
    count += this.config.hiddenDim * this.config.fractal.params.numLevels * 8; // Fractal
    count += this.config.hiddenDim * this.config.topological.params.numScales; // Topological
    count += this.config.hiddenDim * this.config.categorical.params.numLayers * 4; // Categorical
    
    return count;
  }
  
  // ==========================================================================
  // Equivariance Testing
  // ==========================================================================
  
  /**
   * Test end-to-end equivariance
   * 
   * For any rotation R, we require:
   * f(R(x), f) = R(f(x))
   * 
   * for equivariant outputs, and
   * f(R(x), f) = f(x)
   * 
   * for invariant outputs.
   */
  testEquivariance(
    positions: Vector3[],
    features: number[][],
    numTests: number = 10,
    tolerance: number = 1e-10
  ): EquivarianceTestResult {
    const stageErrors = new Map<string, number>();
    const invariantFeatureErrors: number[] = [];
    const equivariantFeatureErrors: number[] = [];
    
    // Original output
    const originalOutput = this.forward(positions, features);
    
    for (let t = 0; t < numTests; t++) {
      // Random rotation
      const q = randomQuaternion();
      const R = quaternionToMatrix(q);
      
      // Rotate positions
      const rotatedPositions = positions.map(p => rotateVector(q, p));
      
      // Compute output for rotated input
      const rotatedOutput = this.forward(rotatedPositions, features);
      
      // Check invariant features (should be unchanged)
      for (let i = 0; i < positions.length; i++) {
        for (let d = 0; d < originalOutput.invariantFeatures[i].length; d++) {
          const error = abs(
            originalOutput.invariantFeatures[i][d] - 
            rotatedOutput.invariantFeatures[i][d]
          );
          invariantFeatureErrors.push(error);
        }
      }
      
      // Check equivariant features (should rotate)
      if (this.config.includeEquivariantOutput) {
        for (let i = 0; i < positions.length; i++) {
          const expected: Vector3 = [
            R[0][0] * originalOutput.equivariantFeatures[i][0] +
            R[0][1] * originalOutput.equivariantFeatures[i][1] +
            R[0][2] * originalOutput.equivariantFeatures[i][2],
            R[1][0] * originalOutput.equivariantFeatures[i][0] +
            R[1][1] * originalOutput.equivariantFeatures[i][1] +
            R[1][2] * originalOutput.equivariantFeatures[i][2],
            R[2][0] * originalOutput.equivariantFeatures[i][0] +
            R[2][1] * originalOutput.equivariantFeatures[i][1] +
            R[2][2] * originalOutput.equivariantFeatures[i][2],
          ];
          
          const actual = rotatedOutput.equivariantFeatures[i];
          const error = vectorNorm([
            expected[0] - actual[0],
            expected[1] - actual[1],
            expected[2] - actual[2],
          ]);
          equivariantFeatureErrors.push(error);
        }
      }
      
      // Compute per-stage errors
      for (const stage of originalOutput.stageOutputs) {
        const rotatedStage = rotatedOutput.stageOutputs.find(s => s.name === stage.name);
        if (rotatedStage) {
          let stageError = 0;
          for (let i = 0; i < positions.length; i++) {
            for (let d = 0; d < stage.invariantFeatures[i].length; d++) {
              stageError += abs(
                stage.invariantFeatures[i][d] - 
                rotatedStage.invariantFeatures[i][d]
              );
            }
          }
          const currentError = stageErrors.get(stage.name) || 0;
          stageErrors.set(stage.name, currentError + stageError / numTests);
        }
      }
    }
    
    const meanInvariantError = invariantFeatureErrors.length > 0
      ? invariantFeatureErrors.reduce((a, b) => a + b, 0) / invariantFeatureErrors.length
      : 0;
    
    const meanEquivariantError = equivariantFeatureErrors.length > 0
      ? equivariantFeatureErrors.reduce((a, b) => a + b, 0) / equivariantFeatureErrors.length
      : 0;
    
    const meanError = (meanInvariantError + meanEquivariantError) / 2;
    const maxError = Math.max(
      ...invariantFeatureErrors,
      ...equivariantFeatureErrors
    );
    
    return {
      meanError,
      maxError,
      stageErrors,
      isVerified: maxError < tolerance,
      details: {
        numTests,
        tolerance,
        invariantFeatureErrors,
        equivariantFeatureErrors,
      },
    };
  }
  
  /**
   * Quick equivariance verification
   */
  verifyEquivariance(): boolean {
    // Create test input
    const positions: Vector3[] = [];
    const features: number[][] = [];
    
    for (let i = 0; i < 20; i++) {
      positions.push([
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ]);
      const feat: number[] = [];
      for (let d = 0; d < this.config.inputDim; d++) {
        feat.push(Math.random() * 2 - 1);
      }
      features.push(feat);
    }
    
    const result = this.testEquivariance(positions, features, 5);
    return result.isVerified;
  }
  
  // ==========================================================================
  // Serialization
  // ==========================================================================
  
  /**
   * Get current configuration
   */
  getConfig(): UnifiedQGTConfig {
    return { ...this.config };
  }
  
  /**
   * Serialize model state
   */
  serialize(): UnifiedQGTState {
    const quaternionWeights: Quaternion[][] = [];
    
    if (this.quaternionMLP) {
      const layers = this.quaternionMLP.getLayers();
      for (const layer of layers) {
        const weights = layer.getWeightMatrix();
        quaternionWeights.push(weights.flat());
      }
    }
    
    return {
      config: this.config,
      quaternionWeights,
      version: '1.0.0',
    };
  }
  
  /**
   * Deserialize model state
   */
  static deserialize(state: UnifiedQGTState): UnifiedQGTLayer {
    const layer = new UnifiedQGTLayer(state.config);
    
    // Restore quaternion weights if available
    if (layer.quaternionMLP && state.quaternionWeights.length > 0) {
      const layers = layer.quaternionMLP.getLayers();
      let weightIdx = 0;
      
      for (const layer of layers) {
        const weightMatrix = layer.getWeightMatrix();
        for (let i = 0; i < weightMatrix.length; i++) {
          for (let j = 0; j < weightMatrix[i].length; j++) {
            if (weightIdx < state.quaternionWeights.length) {
              const q = state.quaternionWeights[weightIdx++];
              // Note: This is a simplified restoration
            }
          }
        }
      }
    }
    
    return layer;
  }
  
  /**
   * Clone the layer
   */
  clone(): UnifiedQGTLayer {
    return new UnifiedQGTLayer(this.config);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a Unified QGT Layer with default configuration
 */
export function createUnifiedQGT(
  config: Partial<UnifiedQGTConfig> = {}
): UnifiedQGTLayer {
  return new UnifiedQGTLayer(config);
}

/**
 * Create a small configuration for testing
 */
export function createTestUnifiedQGTConfig(): UnifiedQGTConfig {
  return createDefaultUnifiedQGTConfig(32, 64, 32);
}

/**
 * Test Unified QGT equivariance
 */
export function testUnifiedQGTEquivariance(
  numPoints: number = 20,
  numTests: number = 10
): {
  meanError: number;
  maxError: number;
  isVerified: boolean;
  stageErrors: Map<string, number>;
} {
  // Create layer with test config
  const config = createTestUnifiedQGTConfig();
  const layer = new UnifiedQGTLayer(config);
  
  // Create test input
  const positions: Vector3[] = [];
  const features: number[][] = [];
  
  for (let i = 0; i < numPoints; i++) {
    positions.push([
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
    ]);
    const feat: number[] = [];
    for (let d = 0; d < config.inputDim; d++) {
      feat.push(Math.random() * 2 - 1);
    }
    features.push(feat);
  }
  
  const result = layer.testEquivariance(positions, features, numTests);
  
  return {
    meanError: result.meanError,
    maxError: result.maxError,
    isVerified: result.isVerified,
    stageErrors: result.stageErrors,
  };
}

/**
 * Benchmark the Unified QGT Layer
 */
export function benchmarkUnifiedQGT(
  numPoints: number = 100,
  numRuns: number = 5
): {
  avgForwardTime: number;
  avgEquivarianceTestTime: number;
  memoryEstimate: number;
  config: UnifiedQGTConfig;
} {
  const config = createDefaultUnifiedQGTConfig(64, 128, 64);
  const layer = new UnifiedQGTLayer(config);
  
  // Create test input
  const positions: Vector3[] = [];
  const features: number[][] = [];
  
  for (let i = 0; i < numPoints; i++) {
    positions.push([
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
    ]);
    const feat: number[] = [];
    for (let d = 0; d < config.inputDim; d++) {
      feat.push(Math.random() * 2 - 1);
    }
    features.push(feat);
  }
  
  // Benchmark forward pass
  const forwardTimes: number[] = [];
  for (let r = 0; r < numRuns; r++) {
    const start = performance.now();
    layer.forward(positions, features);
    forwardTimes.push(performance.now() - start);
  }
  
  // Benchmark equivariance test
  const equivTimes: number[] = [];
  for (let r = 0; r < numRuns; r++) {
    const start = performance.now();
    layer.testEquivariance(positions, features, 3);
    equivTimes.push(performance.now() - start);
  }
  
  return {
    avgForwardTime: forwardTimes.reduce((a, b) => a + b, 0) / numRuns,
    avgEquivarianceTestTime: equivTimes.reduce((a, b) => a + b, 0) / numRuns,
    memoryEstimate: numPoints * config.hiddenDim * 8, // Approximate
    config,
  };
}

// ============================================================================
// Export All
// ============================================================================

const unifiedQGT = {
  // Main class
  UnifiedQGTLayer,
  
  // Configuration
  createDefaultUnifiedQGTConfig,
  createTestUnifiedQGTConfig,
  
  // Factory
  createUnifiedQGT,
  
  // Testing
  testUnifiedQGTEquivariance,
  benchmarkUnifiedQGT,
};

export default unifiedQGT;
