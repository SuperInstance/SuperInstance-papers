# Cell Theater - Consciousness Recording and Replay

> "Every decision is a story worth watching."

Cell Theater provides animated replay of cell decision-making processes in the POLLN spreadsheet system. Watch as cells sense inputs, process information through reasoning steps, and produce outputs - all visualized in real-time.

## Features

### 📼 Recording System

- **Automatic consciousness recording**: Captures every sensation, reasoning step, and decision
- **Timestamped events**: Precise timing for smooth playback
- **Key moment detection**: Automatically marks important events (first input, processing started, decision made, output produced)
- **Compression**: Optimizes recordings for smoother playback
- **Multiple formats**: Export as JSON, video, or GIF

### 🎭 Playback Controls

- **Play/Pause**: Start and stop playback
- **Stop**: Reset to beginning
- **Skip backward/forward**: Jump 5 seconds at a time
- **Step backward/forward**: Move event by event
- **Speed control**: 0.5x, 1x, 1.5x, 2x playback rates
- **Loop**: Repeat a section of the recording
- **Timeline scrubbing**: Drag to any point in the recording

### 🎬 Visualization

- **Cell structure**: Shows head (inputs), body (processing), and tail (outputs)
- **Flow animations**: Watch data flowing into the cell
- **Reasoning steps**: See each step of the decision process
- **Confidence meter**: Real-time confidence visualization
- **Active events**: Highlighted current event with description
- **Visual effects**: Pulses, sparks, and waves for important moments

### 📊 Analytics

- **Event count**: Total number of events recorded
- **Reasoning steps**: Count of processing steps
- **State changes**: Number of state transitions
- **Confidence tracking**: Start, end, and peak confidence values
- **Duration**: Recording length in seconds

## Installation

The Cell Theater is part of the POLLN spreadsheet integration. No additional installation required.

## Usage

### Basic Recording

```typescript
import { ConsciousnessRecorder } from './features/cell-theater';

// Create a recorder
const recorder = new ConsciousnessRecorder();

// Start recording a cell
const sessionId = recorder.startRecording('A1');

// Record events during cell processing
recorder.recordSensation(sessionId, 'A2', 'absolute', 15, CellState.SENSING, 0.8);
recorder.recordReasoning(sessionId, ReasoningStepType.ANALYSIS, 'Analyzing input', input, output, 0.85);
recorder.recordDecision(sessionId, 'Increase value by 10%', 0.9, ['Input: 15', 'Trend: +10%', 'Decision: +10%']);

// Stop recording
const recording = recorder.stopRecording(sessionId);
```

### Integration with Cells

```typescript
import { withRecording } from './features/cell-theater';

// Add recording capability to a cell
const RecordedCell = withRecording(MyCellClass);

// Or use the RecordingIntegration helpers
import { recordCellActivity } from './features/cell-theater';

class MyCell extends LogCell {
  async process(input: unknown) {
    const sessionId = this.startRecording();

    try {
      // ... processing logic ...

      // Automatically record all activity
      recordCellActivity(this.recorder, sessionId, this);

      return result;
    } finally {
      this.stopRecording();
    }
  }
}
```

### Using the Cell Theater Component

```tsx
import { CellTheater } from './features/cell-theater';

function MyComponent() {
  const [recording, setRecording] = useState<ConsciousnessRecording | null>(null);

  return (
    <CellTheater
      recording={recording}
      onClose={() => setRecording(null)}
      onExport={(options) => {
        // Handle export
      }}
    />
  );
}
```

### Colony Recording Manager

For managing recordings across multiple cells:

```typescript
import { ColonyRecordingManager } from './features/cell-theater';

const manager = new ColonyRecordingManager();

// Start recording multiple cells
manager.startCellRecording('A1');
manager.startCellRecording('A2');
manager.startCellRecording('A3');

// ... cells process ...

// Stop all recordings
manager.stopAllRecordings();

// Get recordings
const recordings = manager.getAllRecordings();
```

## API Reference

### ConsciousnessRecorder

Main recorder class for capturing cell consciousness.

#### Methods

- `startRecording(cellId: string): string` - Start a new recording session
- `stopRecording(sessionId: string): ConsciousnessRecording | null` - Stop and save recording
- `pauseRecording(sessionId: string): boolean` - Pause a recording
- `resumeRecording(sessionId: string): boolean` - Resume a paused recording
- `recordSensation(...)` - Record a sensation event
- `recordReasoning(...)` - Record a reasoning step
- `recordStateChange(...)` - Record a state change
- `recordDecision(...)` - Record a decision
- `recordConfidence(...)` - Record a confidence update
- `recordOutput(...)` - Record an output
- `getRecording(recordingId: string)` - Get a recording by ID
- `getRecordingsForCell(cellId: string)` - Get all recordings for a cell
- `getAllRecordings()` - Get all recordings
- `deleteRecording(recordingId: string)` - Delete a recording
- `exportRecording(recordingId: string)` - Export as JSON
- `importRecording(json: string)` - Import from JSON
- `clearAllRecordings()` - Delete all recordings

### ConsciousnessRecording

A complete recording of a cell's decision process.

#### Properties

- `id: string` - Unique recording ID
- `cellId: string` - ID of the recorded cell
- `cellType: string` - Type of the cell
- `startTime: number` - Recording start timestamp
- `endTime: number` - Recording end timestamp
- `duration: number` - Recording duration in milliseconds
- `events: ConsciousnessEvent[]` - All recorded events
- `keyMoments: object` - Important timestamps
- `stats: object` - Recording statistics
- `inputs: array` - Input values
- `outputs: array` - Output values

### ConsciousnessEvent

A single event in the consciousness stream.

#### Properties

- `id: string` - Unique event ID
- `type: TheaterEventType` - Event type
- `timestamp: number` - Time from start (ms)
- `data: object` - Event data including:
  - `description: string` - Human-readable description
  - `value: unknown` - Event value
  - `state: CellState` - Cell state at event
  - `confidence: number` - Confidence at event
  - `visualization: object` - Visual styling hints

## Event Types

- `SENSATION_RECEIVED` - Cell sensed another cell's state
- `INPUT_VALIDATED` - Input was validated
- `INPUT_TRANSFORMED` - Input was transformed
- `PROCESSING_STARTED` - Processing began
- `REASONING_STEP` - A reasoning step occurred
- `PATTERN_MATCHED` - A pattern was matched
- `INFERENCE_MADE` - An inference was made
- `DECISION_MADE` - A decision was reached
- `CONFIDENCE_UPDATED` - Confidence changed
- `OUTPUT_READY` - Output was produced
- `EFFECT_TRIGGERED` - An effect was triggered
- `NOTIFICATION_SENT` - A notification was sent
- `STATE_CHANGED` - Cell state changed

## Visualization Colors

- **Green (#4CAF50)**: Input, sensation, positive outcomes
- **Blue (#2196F3)**: Processing, analysis
- **Orange (#FF9800)**: Output, confidence changes
- **Purple (#9C27B0)**: Reasoning, inference
- **Red (#F44336)**: Errors, low confidence
- **Gray (#666)**: Dormant, inactive states

## Performance Considerations

- **Memory**: Recordings are stored in memory. Consider clearing old recordings periodically.
- **Compression**: Enable compression for longer recordings (>10 seconds).
- **Max duration**: Default max recording is 60 seconds. Adjust via config.
- **Event rate**: High-frequency events (>100/sec) may impact playback smoothness.

## Future Enhancements

- [ ] Video/gif export (client-side rendering)
- [ ] Recording comparison (side-by-side view)
- [ ] Event filtering (show/hide event types)
- [ ] Annotation system (add notes to recordings)
- [ ] Sharing system (export/import recordings)
- [ ] Recording editing (trim, splice recordings)
- [ ] Real-time recording (watch cell as it processes)
- [ ] Multi-cell theater (replay colony interactions)

## License

MIT - Part of the POLLN project by SuperInstance.AI
