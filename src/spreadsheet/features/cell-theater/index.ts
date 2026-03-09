/**
 * Cell Theater - Exports
 *
 * Consciousness recording and replay for cell decision-making.
 */

export * from './types.js';
export { ConsciousnessRecorder } from './ConsciousnessRecorder.js';
export { CellTheater } from './CellTheater.js';
export { ReplayPlayer } from './ReplayPlayer.js';
export { StageRenderer } from './StageRenderer.js';
export { Timeline } from './Timeline.js';
export { withRecording, recordCellActivity, ColonyRecordingManager } from './RecordingIntegration.js';
export { CellInspectorWithTheater } from './CellInspectorWithTheater.js';
