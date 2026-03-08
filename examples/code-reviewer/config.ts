/**
 * Code Reviewer Configuration
 */

export const config = {
  // Review agent types
  reviewAgents: [
    {
      id: 'security-agent',
      name: 'SecurityAgent',
      description: 'Checks for security vulnerabilities',
      focus: ['input-validation', 'authentication', 'authorization', 'injection'],
      baseConfidence: 0.8,
      baseBid: 0.85,
    },
    {
      id: 'style-agent',
      name: 'StyleAgent',
      description: 'Reviews code style and formatting',
      focus: ['naming', 'formatting', 'consistency', 'linting'],
      baseConfidence: 0.6,
      baseBid: 0.5,
    },
    {
      id: 'performance-agent',
      name: 'PerformanceAgent',
      description: 'Analyzes performance implications',
      focus: ['complexity', 'memory', 'async', 'optimization'],
      baseConfidence: 0.7,
      baseBid: 0.65,
    },
    {
      id: 'test-agent',
      name: 'TestAgent',
      description: 'Evaluates test coverage and quality',
      focus: ['coverage', 'edge-cases', 'assertions', 'mocking'],
      baseConfidence: 0.65,
      baseBid: 0.6,
    },
    {
      id: 'documentation-agent',
      name: 'DocumentationAgent',
      description: 'Checks documentation completeness',
      focus: ['comments', 'types', 'examples', 'readme'],
      baseConfidence: 0.5,
      baseBid: 0.4,
    },
  ],

  // Value network configuration
  valueNetwork: {
    discountFactor: 0.99, // γ - future reward discount
    tdLambda: 0.8, // λ - eligibility trace decay
    learningRate: 0.01, // α - update rate
    hiddenLayers: [64, 32],
    inputDimension: 128,
    minSamplesForTraining: 3, // Lower for demo
    trainingIntervalMs: 1000,
  },

  // Plinko selection configuration
  plinko: {
    temperature: 1.0,
    minTemperature: 0.1,
    decayRate: 0.05,
  },
};

export interface CodeSample {
  id: string;
  code: string;
  language: string;
  context?: string;
  filePath?: string;
}

export interface ReviewResult {
  agentId: string;
  agentName: string;
  review: string;
  severity: 'critical' | 'warning' | 'info' | 'suggestion';
  value: number;
  confidence: number;
  timestamp: number;
}
