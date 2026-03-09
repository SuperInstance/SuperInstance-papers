/**
 * POLLN Spreadsheet UI - CellInspector with Cell Theater
 *
 * Enhanced Cell Inspector with integrated Cell Theater for consciousness replay.
 * Shows head/body/tail/origin information with reasoning traces AND theater playback.
 *
 * Features:
 * - All original CellInspector features
 * - Cell Theater tab for consciousness replay
 * - Recording management
 * - Export functionality
 */

import React, { useState } from 'react';
import { CellState, CellType, LogicLevel } from '../../core/types';
import { CellTheater } from './CellTheater';
import {
  ConsciousnessRecorder,
  ConsciousnessRecording,
  ExportOptions,
} from './index';

interface CellData {
  id: string;
  type: CellType;
  state: CellState;
  logicLevel: LogicLevel;
  value: unknown;
  confidence: number;

  // Head (input)
  headInputs: Array<{
    source: string;
    value: unknown;
    timestamp: number;
  }>;

  // Body (processing)
  bodyProcessing: {
    steps: Array<{
      name: string;
      description: string;
      duration: number;
    }>;
    reasoningTrace?: string[];
  };

  // Tail (output)
  tailOutputs: Array<{
    target: string;
    value: unknown;
    timestamp: number;
  }>;

  // Origin (self-reference)
  originMonitoring: {
    watching: string[];
    sensations: Array<{
      target: string;
      type: string;
      value: number;
      threshold?: number;
    }>;
  };

  // Performance
  metrics: {
    executionTime: number;
    memoryUsage: number;
    totalExecutions: number;
    averageConfidence: number;
  };

  // History
  history: Array<{
    timestamp: number;
    value: unknown;
    confidence: number;
    state: CellState;
  }>;

  // Recordings
  recordings?: ConsciousnessRecording[];
}

interface CellInspectorWithTheaterProps {
  cell: CellData | null;
  onClose: () => void;
  recorder?: ConsciousnessRecorder;
}

/**
 * CellInspectorWithTheater - Enhanced inspector with Cell Theater
 */
export const CellInspectorWithTheater: React.FC<CellInspectorWithTheaterProps> = ({
  cell,
  onClose,
  recorder,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'head' | 'body' | 'tail' | 'origin' | 'history' | 'theater'
  >('overview');

  const [selectedRecording, setSelectedRecording] = useState<ConsciousnessRecording | null>(null);

  if (!cell) {
    return (
      <div className="cell-inspector-empty" style={{
        width: '320px',
        height: '100%',
        backgroundColor: '#1E1E1E',
        borderLeft: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
      }}>
        Select a cell to inspect
      </div>
    );
  }

  const getStateColor = (state: CellState): string => {
    const colors: Record<CellState, string> = {
      [CellState.DORMANT]: '#666',
      [CellState.SENSING]: '#4CAF50',
      [CellState.PROCESSING]: '#2196F3',
      [CellState.EMITTING]: '#FF9800',
      [CellState.ERROR]: '#F44336',
    };
    return colors[state];
  };

  const getTypeColor = (type: CellType): string => {
    const colors: Record<CellType, string> = {
      [CellType.INPUT]: '#4CAF50',
      [CellType.OUTPUT]: '#2196F3',
      [CellType.TRANSFORM]: '#FF9800',
      [CellType.FILTER]: '#607D8B',
      [CellType.AGGREGATE]: '#E91E63',
      [CellType.VALIDATE]: '#8BC34A',
      [CellType.ANALYSIS]: '#9C27B0',
      [CellType.PREDICTION]: '#F44336',
      [CellType.DECISION]: '#00BCD4',
      [CellType.EXPLAIN]: '#795548',
      [CellType.LOG]: '#9E9E9E',
    };
    return colors[type];
  };

  const handleExport = (options: ExportOptions) => {
    if (!recorder || !selectedRecording) return;

    const exported = recorder.exportRecording(selectedRecording.id);
    if (exported) {
      const blob = new Blob([exported], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedRecording.cellId}_recording.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Show full theater view when in theater tab
  if (activeTab === 'theater' && selectedRecording) {
    return (
      <div className="cell-theater-full" style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <CellTheater
          recording={selectedRecording}
          onClose={() => setSelectedRecording(null)}
          onExport={handleExport}
        />
      </div>
    );
  }

  return (
    <div className="cell-inspector" style={{
      width: '320px',
      height: '100%',
      backgroundColor: '#1E1E1E',
      borderLeft: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#FFF' }}>
            {cell.id}
          </div>
          <div style={{ fontSize: '11px', color: getTypeColor(cell.type) }}>
            {cell.type} • L{cell.logicLevel}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #333',
        overflowX: 'auto',
      }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'head', label: 'Head' },
          { id: 'body', label: 'Body' },
          { id: 'tail', label: 'Tail' },
          { id: 'origin', label: 'Origin' },
          { id: 'history', label: 'History' },
          { id: 'theater', label: '🎭 Theater' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #2196F3' : 'none',
              color: activeTab === tab.id ? '#FFF' : '#666',
              cursor: 'pointer',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
      }}>
        {activeTab === 'overview' && <OverviewTab cell={cell} />}
        {activeTab === 'head' && <HeadTab cell={cell} />}
        {activeTab === 'body' && <BodyTab cell={cell} />}
        {activeTab === 'tail' && <TailTab cell={cell} />}
        {activeTab === 'origin' && <OriginTab cell={cell} />}
        {activeTab === 'history' && <HistoryTab cell={cell} />}
        {activeTab === 'theater' && (
          <TheaterTab
            cell={cell}
            recordings={cell.recordings || []}
            onSelectRecording={setSelectedRecording}
          />
        )}
      </div>

      {/* Footer - State indicator */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getStateColor(cell.state),
        }} />
        <span style={{ fontSize: '12px', color: '#888' }}>
          {cell.state}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#666' }}>
          {(cell.confidence * 100).toFixed(0)}% conf
        </span>
      </div>
    </div>
  );
};

/* Tab Components */

const OverviewTab: React.FC<{ cell: CellData }> = ({ cell }) => (
  <div className="inspector-overview">
    <Section title="Current State">
      <StatRow label="State" value={cell.state} />
      <StatRow label="Logic Level" value={`L${cell.logicLevel}`} />
      <StatRow label="Confidence" value={`${(cell.confidence * 100).toFixed(0)}%`} />
    </Section>

    <Section title="Value">
      <ValueDisplay value={cell.value} />
    </Section>

    <Section title="Performance">
      <StatRow label="Exec Time" value={`${cell.metrics.executionTime}ms`} />
      <StatRow label="Memory" value={`${cell.metrics.memoryUsage}KB`} />
      <StatRow label="Total Execs" value={cell.metrics.totalExecutions} />
      <StatRow label="Avg Conf" value={`${(cell.metrics.averageConfidence * 100).toFixed(0)}%`} />
    </Section>

    <Section title="Connections">
      <StatRow label="Inputs" value={cell.headInputs.length} />
      <StatRow label="Outputs" value={cell.tailOutputs.length} />
      <StatRow label="Watching" value={cell.originMonitoring.watching.length} />
      <StatRow label="Sensations" value={cell.originMonitoring.sensations.length} />
    </Section>
  </div>
);

const HeadTab: React.FC<{ cell: CellData }> = ({ cell }) => (
  <div className="inspector-head">
    <Section title="Head (Input Receptor)">
      {cell.headInputs.length === 0 ? (
        <div style={{ color: '#666', fontSize: '12px' }}>No inputs</div>
      ) : (
        cell.headInputs.map((input, i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#2A2A2A',
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '8px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#2196F3', marginBottom: '4px' }}>
              From: {input.source}
            </div>
            <ValueDisplay value={input.value} />
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
              {new Date(input.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))
      )}
    </Section>
  </div>
);

const BodyTab: React.FC<{ cell: CellData }> = ({ cell }) => (
  <div className="inspector-body">
    <Section title="Body (Processing)">
      {cell.bodyProcessing.steps.length === 0 ? (
        <div style={{ color: '#666', fontSize: '12px' }}>No processing steps</div>
      ) : (
        cell.bodyProcessing.steps.map((step, i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#2A2A2A',
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '8px',
              borderLeft: `3px solid ${step.duration > 100 ? '#FF9800' : '#4CAF50'}`,
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
              {step.name}
            </div>
            <div style={{ fontSize: '11px', color: '#AAA', marginBottom: '4px' }}>
              {step.description}
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              {step.duration}ms
            </div>
          </div>
        ))
      )}
    </Section>

    {cell.bodyProcessing.reasoningTrace && cell.bodyProcessing.reasoningTrace.length > 0 && (
      <Section title="Reasoning Trace">
        {cell.bodyProcessing.reasoningTrace.map((reason, i) => (
          <div
            key={i}
            style={{
              fontSize: '11px',
              color: '#AAA',
              padding: '6px 0',
              borderBottom: '1px solid #333',
            }}
          >
            <span style={{ color: '#666', marginRight: '8px' }}>{i + 1}.</span>
            {reason}
          </div>
        ))}
      </Section>
    )}
  </div>
);

const TailTab: React.FC<{ cell: CellData }> = ({ cell }) => (
  <div className="inspector-tail">
    <Section title="Tail (Output Emitter)">
      {cell.tailOutputs.length === 0 ? (
        <div style={{ color: '#666', fontSize: '12px' }}>No outputs</div>
      ) : (
        cell.tailOutputs.map((output, i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#2A2A2A',
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '8px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#4CAF50', marginBottom: '4px' }}>
              To: {output.target}
            </div>
            <ValueDisplay value={output.value} />
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
              {new Date(output.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))
      )}
    </Section>
  </div>
);

const OriginTab: React.FC<{ cell: CellData }> = ({ cell }) => (
  <div className="inspector-origin">
    <Section title="Origin (Self-Reference)">
      <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>
        This cell monitors {cell.originMonitoring.watching.length} other cell(s)
      </div>

      {cell.originMonitoring.watching.map((target, i) => (
        <div
          key={i}
          style={{
            backgroundColor: '#2A2A2A',
            padding: '8px 10px',
            borderRadius: '4px',
            marginBottom: '6px',
            fontSize: '12px',
            color: '#FFF',
          }}
        >
          {target}
        </div>
      ))}
    </Section>

    <Section title="Sensations">
      {cell.originMonitoring.sensations.length === 0 ? (
        <div style={{ color: '#666', fontSize: '12px' }}>No active sensations</div>
      ) : (
        cell.originMonitoring.sensations.map((sensation, i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#2A2A2A',
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', color: '#2196F3' }}>
                {sensation.target}
              </span>
              <span style={{ fontSize: '10px', color: '#888' }}>
                {sensation.type}
              </span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
              {sensation.value.toFixed(3)}
            </div>
            {sensation.threshold !== undefined && (
              <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                Threshold: {sensation.threshold}
              </div>
            )}
          </div>
        ))
      )}
    </Section>
  </div>
);

const HistoryTab: React.FC<{ cell: CellData }> = ({ cell }) => (
  <div className="inspector-history">
    <Section title="Execution History">
      {cell.history.length === 0 ? (
        <div style={{ color: '#666', fontSize: '12px' }}>No history</div>
      ) : (
        cell.history.map((entry, i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#2A2A2A',
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', color: '#666' }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span style={{ fontSize: '10px', color: getStateColor(entry.state) }}>
                {entry.state}
              </span>
            </div>
            <ValueDisplay value={entry.value} />
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
              Conf: {(entry.confidence * 100).toFixed(0)}%
            </div>
          </div>
        ))
      )}
    </Section>
  </div>
);

const TheaterTab: React.FC<{
  cell: CellData;
  recordings: ConsciousnessRecording[];
  onSelectRecording: (recording: ConsciousnessRecording) => void;
}> = ({ cell, recordings, onSelectRecording }) => (
  <div className="inspector-theater">
    <Section title="🎭 Cell Theater">
      <p style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>
        Replay the cell's decision-making process with animated visualization.
      </p>

      {recordings.length === 0 ? (
        <div style={{
          backgroundColor: '#2A2A2A',
          padding: '16px',
          borderRadius: '6px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📼</div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            No recordings yet
          </div>
          <div style={{ fontSize: '10px', color: '#444' }}>
            Recordings are automatically created when the cell processes data
          </div>
        </div>
      ) : (
        recordings.map((recording) => (
          <div
            key={recording.id}
            onClick={() => onSelectRecording(recording)}
            style={{
              backgroundColor: '#2A2A2A',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '8px',
              cursor: 'pointer',
              border: '1px solid #333',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2196F3';
              e.currentTarget.style.backgroundColor = '#333';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#333';
              e.currentTarget.style.backgroundColor = '#2A2A2A';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: '#FFF' }}>
                {new Date(recording.startTime).toLocaleString()}
              </span>
              <span style={{ fontSize: '10px', color: '#2196F3' }}>
                {(recording.duration / 1000).toFixed(1)}s
              </span>
            </div>

            <div style={{ fontSize: '10px', color: '#888', marginBottom: '6px' }}>
              {recording.stats.totalEvents} events • {recording.stats.reasoningSteps}{' '}
              reasoning steps
            </div>

            <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
              <span style={{ color: '#4CAF50' }}>
                {(recording.stats.confidenceStart * 100).toFixed(0)}%
              </span>
              <span style={{ color: '#888' }}>→</span>
              <span style={{ color: recording.stats.confidenceEnd > recording.stats.confidenceStart ? '#4CAF50' : '#F44336' }}>
                {(recording.stats.confidenceEnd * 100).toFixed(0)}%
              </span>
              <span style={{ color: '#FFC107', marginLeft: 'auto' }}>
                Peak: {(recording.stats.confidencePeak * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))
      )}
    </Section>
  </div>
);

/* Helper Components */

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#888',
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }}>
      {title}
    </div>
    {children}
  </div>
);

const StatRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '12px',
    borderBottom: '1px solid #333',
  }}>
    <span style={{ color: '#888' }}>{label}</span>
    <span style={{ color: '#FFF' }}>{value}</span>
  </div>
);

const ValueDisplay: React.FC<{ value: unknown }> = ({ value }) => {
  if (value === null) {
    return <div style={{ color: '#666', fontSize: '12px' }}>null</div>;
  }
  if (value === undefined) {
    return <div style={{ color: '#666', fontSize: '12px' }}>undefined</div>;
  }
  if (typeof value === 'object') {
    return (
      <pre style={{
        backgroundColor: '#222',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '10px',
        overflow: 'auto',
        maxHeight: '150px',
      }}>
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return (
    <div style={{
      backgroundColor: '#222',
      padding: '8px',
      borderRadius: '4px',
      fontSize: '12px',
      wordBreak: 'break-all',
    }}>
      {String(value)}
    </div>
  );
};

const getStateColor = (state: CellState): string => {
  const colors: Record<CellState, string> = {
    [CellState.DORMANT]: '#666',
    [CellState.SENSING]: '#4CAF50',
    [CellState.PROCESSING]: '#2196F3',
    [CellState.EMITTING]: '#FF9800',
    [CellState.ERROR]: '#F44336',
  };
  return colors[state];
};

export default CellInspectorWithTheater;
