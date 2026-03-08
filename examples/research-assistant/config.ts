/**
 * Research Assistant Configuration
 */

export const config = {
  // META tile configuration
  metaTileCount: 3,
  metaTileConfig: {
    potential: 'UNIVERSAL', // Can become any agent type
    environmentalSensitivity: 0.8, // High sensitivity to signals
    differentiationThreshold: 0.5, // Differentiate when signal exceeds this
    reDifferentiationCooldown: 60000, // 1 minute cooldown
    maxDifferentiations: 3,
    signalDecayRate: 0.05, // Slow signal decay
    explorationScale: 0.2,
    attractionStrength: 0.6,
    fisherRegularization: 0.01,
    banditLearningRate: 0.1,
  },

  // Dreaming configuration
  dreamingConfig: {
    dreamHorizon: 20, // Short dreams for demo
    dreamBatchSize: 5,
    dreamIntervalMs: 10000, // 10 seconds
    explorationRate: 0.15,
    ppoClipEpsilon: 0.2,
    ppoEpochs: 3,
    learningRate: 0.001,
    entropyCoefficient: 0.01,
    valueLossCoefficient: 0.5,
    replayBufferSize: 1000,
    replaySampleSize: 10,
    prioritizationAlpha: 0.6,
    policyHiddenDim: 32,
    policyLayers: 2,
    actionSpaceSize: 8,
    improvementWindow: 50,
    minImprovementThreshold: 0.01,
  },

  // World model configuration
  worldModelConfig: {
    latentDim: 16,
    hiddenDim: 32,
    actionDim: 1,
    learningRate: 0.001,
    batchSize: 32,
    uncertaintyThreshold: 0.3,
  },

  // Research task types
  taskTypes: {
    LITERATURE_REVIEW: {
      agentType: 'role',
      urgency: 0.8,
      description: 'Analyze and summarize academic papers',
    },
    DATA_ANALYSIS: {
      agentType: 'task',
      urgency: 0.9,
      description: 'Process and analyze datasets',
    },
    WRITING_ASSIST: {
      agentType: 'role',
      urgency: 0.7,
      description: 'Help with research writing',
    },
    EXPERIMENT_DESIGN: {
      agentType: 'role',
      urgency: 0.85,
      description: 'Design experimental protocols',
    },
    CODE_REVIEW: {
      agentType: 'task',
      urgency: 0.75,
      description: 'Review and improve research code',
    },
  },
};

export interface ResearchTask {
  id: string;
  type: keyof typeof config.taskTypes;
  description: string;
  data?: Record<string, unknown>;
  urgency: number;
}
