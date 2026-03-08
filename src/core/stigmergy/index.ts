/**
 * POLLN Stigmergy System
 *
 * Exports enhanced stigmergy components
 */

export { EnhancedStigmergy } from './enhanced-stigmergy';

// Re-export base types
export {
  PheromoneType,
  type Pheromone,
  type Position,
  type StigmergyConfig,
} from '../../coordination/stigmergy';

// Export enhanced types
export type {
  DecayModel,
  DecayParameters,
  TrailVisualization,
  InterferencePattern,
  AdaptiveStrengthConfig,
} from './enhanced-stigmergy';
