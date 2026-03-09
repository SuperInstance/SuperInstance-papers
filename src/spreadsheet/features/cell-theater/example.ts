/**
 * Cell Theater - Usage Examples
 *
 * This file demonstrates how to use the Cell Theater features
 * in your POLLN spreadsheet application.
 */

import {
  ConsciousnessRecorder,
  ColonyRecordingManager,
  withRecording,
  recordCellActivity,
  CellTheater,
  CellInspectorWithTheater,
} from './index';
import { LogCell } from '../../core/LogCell.js';
import { CellType, CellState, SensationType, ReasoningStepType } from '../../core/types';

// ============================================================================
// Example 1: Basic Recording
// ============================================================================

function basicRecordingExample() {
  // Create a recorder
  const recorder = new ConsciousnessRecorder();

  // Simulate a cell processing
  const cellId = 'A1';
  const sessionId = recorder.startRecording(cellId);

  // Simulate processing with recording
  setTimeout(() => {
    // Cell receives sensation from A2
    recorder.recordSensation(
      sessionId,
      'A2',
      SensationType.ABSOLUTE_CHANGE,
      15,
      CellState.SENSING,
      0.8
    );
  }, 100);

  setTimeout(() => {
    // Cell processes with reasoning
    recorder.recordReasoning(
      sessionId,
      ReasoningStepType.ANALYSIS,
      'Analyzing input value of 15',
      15,
      { trend: 'increasing' },
      0.85
    );
  }, 500);

  setTimeout(() => {
    // Cell makes decision
    recorder.recordDecision(
      sessionId,
      'Increase output by 10%',
      0.9,
      ['Input: 15', 'Trend: increasing', 'Decision: +10%']
    );
  }, 1000);

  setTimeout(() => {
    // Cell produces output
    recorder.recordOutput(
      sessionId,
      'B1',
      16.5,
      0.9
    );

    // Stop recording
    const recording = recorder.stopRecording(sessionId);
    console.log('Recording saved:', recording?.id);

    // Get all recordings for the cell
    const recordings = recorder.getRecordingsForCell(cellId);
    console.log(`Cell ${cellId} has ${recordings.length} recording(s)`);
  }, 1500);
}

// ============================================================================
// Example 2: Recording-Enabled Cell
// ============================================================================

// Create a recording-enabled cell class
const RecordingEnabledCell = withRecording(LogCell);

class MyDecisionCell extends RecordingEnabledCell {
  async processInput(input: unknown) {
    // Recording is automatically started by the withRecording mixin

    // Simulate sensation
    this.recordSensation('A2', SensationType.ABSOLUTE_CHANGE, 15);

    // Simulate reasoning
    this.recordReasoning(
      ReasoningStepType.ANALYSIS,
      'Analyzing input',
      input,
      { analysis: 'complete' },
      0.8
    );

    // Simulate decision
    this.recordDecision(
      'Process value',
      0.9,
      ['Analyzed input', 'Made decision']
    );

    // Recording is automatically stopped

    return {
      value: input,
      confidence: 0.9,
    };
  }
}

async function recordingEnabledCellExample() {
  const cell = new MyDecisionCell({
    id: 'B1',
    type: CellType.DECISION,
    logicLevel: 2,
  });

  // Add a recorder
  const recorder = new ConsciousnessRecorder();
  cell.setRecorder(recorder);

  // Process - automatically recorded
  await cell.processInput(15);

  // Get the recording
  const recordings = recorder.getRecordingsForCell('B1');
  const latestRecording = recordings[recordings.length - 1];

  console.log('Recording duration:', latestRecording.duration, 'ms');
  console.log('Events recorded:', latestRecording.stats.totalEvents);
}

// ============================================================================
// Example 3: Colony Recording
// ============================================================================

function colonyRecordingExample() {
  const manager = new ColonyRecordingManager();

  // Start recording multiple cells
  const cells = ['A1', 'A2', 'A3', 'B1', 'B2'];
  cells.forEach(cellId => {
    manager.startCellRecording(cellId);
    console.log(`Started recording ${cellId}`);
  });

  // Simulate colony activity
  setTimeout(() => {
    // Get all recordings
    const allRecordings = manager.getAllRecordings();
    console.log(`Total recordings: ${allRecordings.length}`);

    // Get recordings for specific cell
    const a1Recordings = manager.getCellRecordings('A1');
    console.log(`A1 has ${a1Recordings.length} recording(s)`);

    // Stop all recordings
    manager.stopAllRecordings();
  }, 5000);
}

// ============================================================================
// Example 4: React Component Integration
// ============================================================================

// This would be in your React component
/*
import { useState } from 'react';
import { CellTheater } from './features/cell-theater';

function SpreadsheetApp() {
  const [selectedRecording, setSelectedRecording] = useState(null);

  return (
    <div>
      <SpreadsheetGrid onCellSelect={handleCellSelect} />

      {selectedRecording && (
        <CellTheater
          recording={selectedRecording}
          onClose={() => setSelectedRecording(null)}
          onExport={(options) => {
            // Handle export
            console.log('Exporting with options:', options);
          }}
        />
      )}
    </div>
  );
}

// Or use the enhanced Cell Inspector
function SpreadsheetAppWithInspector() {
  const [selectedCell, setSelectedCell] = useState(null);
  const [recorder] = useState(() => new ColonyRecordingManager());

  return (
    <div>
      <SpreadsheetGrid
        onCellSelect={(cell) => {
          // Start recording when cell is selected
          recorder.startCellRecording(cell.id);
          setSelectedCell(cell);
        }}
      />

      {selectedCell && (
        <CellInspectorWithTheater
          cell={selectedCell}
          onClose={() => {
            // Stop recording when inspector closes
            recorder.stopCellRecording(selectedCell.id);
            setSelectedCell(null);
          }}
          recorder={recorder.getRecorder()}
        />
      )}
    </div>
  );
}
*/

// ============================================================================
// Example 5: Export and Import
// ============================================================================

function exportImportExample() {
  const recorder = new ConsciousnessRecorder();

  // Create a recording
  const sessionId = recorder.startRecording('A1');
  recorder.recordSensation(sessionId, 'A2', SensationType.ABSOLUTE_CHANGE, 15, CellState.SENSING, 0.8);
  const recording = recorder.stopRecording(sessionId);

  if (recording) {
    // Export as JSON
    const json = recorder.exportRecording(recording.id);
    console.log('Exported JSON:', json?.substring(0, 100) + '...');

    // Save to file (in browser)
    /*
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.cellId}_recording.json`;
    a.click();
    */

    // Import from JSON
    if (json) {
      const imported = recorder.importRecording(json);
      console.log('Imported recording:', imported?.id);
    }
  }
}

// ============================================================================
// Example 6: Recording Statistics
// ============================================================================

function recordingStatsExample() {
  const recorder = new ConsciousnessRecorder();

  // Create some recordings
  for (let i = 0; i < 5; i++) {
    const sessionId = recorder.startRecording(`A${i + 1}`);
    recorder.recordSensation(sessionId, 'source', SensationType.ABSOLUTE_CHANGE, i * 10, CellState.SENSING, 0.8);
    recorder.recordReasoning(sessionId, ReasoningStepType.ANALYSIS, `Processing ${i}`, i, i * 2, 0.85);
    recorder.stopRecording(sessionId);
  }

  // Get all recordings
  const allRecordings = recorder.getAllRecordings();

  // Calculate statistics
  const stats = {
    totalRecordings: allRecordings.length,
    totalEvents: allRecordings.reduce((sum, r) => sum + r.stats.totalEvents, 0),
    totalReasoningSteps: allRecordings.reduce((sum, r) => sum + r.stats.reasoningSteps, 0),
    averageDuration: allRecordings.reduce((sum, r) => sum + r.duration, 0) / allRecordings.length,
    averageConfidence: allRecordings.reduce((sum, r) => sum + r.stats.confidencePeak, 0) / allRecordings.length,
  };

  console.log('Recording Statistics:', stats);
}

// ============================================================================
// Run Examples
// ============================================================================

// Uncomment to run examples:
// basicRecordingExample();
// recordingEnabledCellExample();
// colonyRecordingExample();
// exportImportExample();
// recordingStatsExample();

export {
  basicRecordingExample,
  recordingEnabledCellExample,
  colonyRecordingExample,
  exportImportExample,
  recordingStatsExample,
};
