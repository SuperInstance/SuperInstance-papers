/**
 * TensorFlow.js Pattern Recognition Module
 *
 * Comprehensive ML models for spreadsheet cell pattern recognition.
 * All models run in-browser with GPU acceleration support.
 */

// Core Models
export { TrendModel } from './TrendModel';
export type {
  TrendPrediction,
  TrendModelConfig
} from './TrendModel';

export { AnomalyModel } from './AnomalyModel';
export type {
  AnomalyScore,
  AnomalyModelConfig
} from './AnomalyModel';

export { ClusteringModel } from './ClusteringModel';
export type {
  ClusterAssignment,
  ClusterInfo,
  ClusteringResult,
  ClusteringModelConfig
} from './ClusteringModel';

// Training & Management
export { ModelTrainer } from './ModelTrainer';
export type {
  TrainingConfig,
  TrainingProgress,
  TrainingResult
} from './ModelTrainer';

export { ModelRegistry } from './ModelRegistry';
export type {
  ModelMetadata,
  ModelVersion
} from './ModelRegistry';

// Inference
export { InferenceEngine } from './InferenceEngine';
export type {
  InferenceRequest,
  InferenceResult,
  InferenceOptions
} from './InferenceEngine';

// Re-export TensorFlow.js for convenience
export * from '@tensorflow/tfjs';
