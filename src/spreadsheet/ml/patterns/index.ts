/**
 * Pattern recognition module exports
 */

export { PatternDetector, PatternType, DetectedPattern, PatternDetectionOptions } from './PatternDetector';
export { AnomalyDetector, AnomalyMethod, AnomalyResult, AnomalyDetectionOptions } from './AnomalyDetector';
export { TrendAnalyzer, TrendMethod, TrendResult, TrendAnalysisOptions } from './TrendAnalyzer';
export {
  PatternLibrary,
  PatternDefinition,
  PatternCategory
} from './PatternLibrary';
export {
  PatternCell,
  PatternCellBody,
  PatternCellConfig,
  PatternCellState,
  PatternAlert,
  createPatternCell
} from './PatternCell';

export type {
  PatternEvent,
  PatternEventHandler,
  PatternDetectedEvent,
  PatternAlertEvent,
  PatternStatisticsEvent,
  PatternAcknowledgedEvent,
  PatternClearedEvent,
  PatternOptionsUpdatedEvent
} from './websocket-types';

export {
  PatternEventBus,
  patternEventBus,
  PatternWebSocketIntegration,
  createPatternWebSocketIntegration
} from './websocket-integration';
