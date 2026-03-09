/**
 * POLLN Spreadsheet - TouchCellInspector
 *
 * Mobile cell inspector with bottom sheet modal, swipeable interface,
 * and haptic feedback for tactile interactions.
 *
 * Features:
 * - Bottom sheet modal
 * - Swipe up to reveal full details
 * - Tab navigation (Head/Body/Tail/Origin)
 * - Haptic feedback on interactions
 * - Responsive design
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogCell } from '../core/LogCell.js';
import { CellInspection } from '../core/types.js';
import { GestureHandler, GestureEvent } from './GestureHandler.js';

/**
 * Inspector tab
 */
type InspectorTab = 'head' | 'body' | 'tail' | 'origin';

/**
 * Inspector state
 */
type InspectorState = 'hidden' | 'peek' | 'half' | 'full';

/**
 * Props for TouchCellInspector
 */
export interface TouchCellInspectorProps {
  cell: LogCell | null;
  visible: boolean;
  onClose: () => void;
  enableHapticFeedback?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * TouchCellInspector - Mobile cell inspector with bottom sheet
 *
 * Provides a touch-optimized interface for inspecting cell details
 * with smooth animations and intuitive gestures.
 */
export const TouchCellInspector: React.FC<TouchCellInspectorProps> = ({
  cell,
  visible,
  onClose,
  enableHapticFeedback = true,
  className = '',
  style = {},
}) => {
  // State
  const [inspectorState, setInspectorState] = useState<InspectorState>('hidden');
  const [activeTab, setActiveTab] = useState<InspectorTab>('head');
  const [sheetHeight, setSheetHeight] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const gestureHandlerRef = useRef<GestureHandler | null>(null);

  // Thresholds for swipe gestures
  const SWIPE_THRESHOLDS = {
    peek: 100,
    half: 300,
    full: 500,
  };

  // Get cell inspection data
  const inspectionData: CellInspection | null = useMemo(() => {
    return cell ? cell.inspect() : null;
  }, [cell]);

  /**
   * Trigger haptic feedback
   */
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (enableHapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, [enableHapticFeedback]);

  /**
   * Handle inspector state changes with haptic feedback
   */
  const changeInspectorState = useCallback((newState: InspectorState) => {
    if (newState !== inspectorState) {
      triggerHaptic(10);
      setInspectorState(newState);
    }
  }, [inspectorState, triggerHaptic]);

  /**
   * Handle gesture events
   */
  const handleGesture = useCallback((event: GestureEvent) => {
    if (!visible) return;

    switch (event.gesture) {
      case 'swipeUp':
        if (inspectorState === 'peek') {
          changeInspectorState('half');
        } else if (inspectorState === 'half') {
          changeInspectorState('full');
        }
        break;
      case 'swipeDown':
        if (inspectorState === 'full') {
          changeInspectorState('half');
        } else if (inspectorState === 'half') {
          changeInspectorState('peek');
        } else if (inspectorState === 'peek') {
          changeInspectorState('hidden');
          onClose();
        }
        break;
      case 'tap':
        // Handle tab tap
        break;
    }
  }, [visible, inspectorState, changeInspectorState, onClose]);

  /**
   * Handle tab change with haptic feedback
   */
  const handleTabChange = useCallback((tab: InspectorTab) => {
    triggerHaptic(15);
    setActiveTab(tab);
  }, [triggerHaptic]);

  /**
   * Handle close button
   */
  const handleClose = useCallback(() => {
    triggerHaptic(20);
    setInspectorState('hidden');
    onClose();
  }, [triggerHaptic, onClose]);

  /**
   * Initialize gesture handler
   */
  useEffect(() => {
    if (visible && sheetRef.current && !gestureHandlerRef.current) {
      gestureHandlerRef.current = new GestureHandler({
        element: sheetRef.current,
        onGesture: handleGesture,
        enableSwipe: true,
        enablePinch: false,
        enableLongPress: false,
      });

      return () => {
        gestureHandlerRef.current?.destroy();
        gestureHandlerRef.current = null;
      };
    }
  }, [visible, handleGesture]);

  /**
   * Update inspector state based on visibility
   */
  useEffect(() => {
    if (visible && inspectorState === 'hidden') {
      setInspectorState('peek');
    } else if (!visible) {
      setInspectorState('hidden');
    }
  }, [visible, inspectorState]);

  /**
   * Update sheet height based on state
   */
  useEffect(() => {
    switch (inspectorState) {
      case 'peek':
        setSheetHeight(SWIPE_THRESHOLDS.peek);
        break;
      case 'half':
        setSheetHeight(SWIPE_THRESHOLDS.half);
        break;
      case 'full':
        setSheetHeight(SWIPE_THRESHOLDS.full);
        break;
      case 'hidden':
        setSheetHeight(0);
        break;
    }
  }, [inspectorState]);

  /**
   * Render tab content
   */
  const renderTabContent = useCallback(() => {
    if (!inspectionData) return null;

    switch (activeTab) {
      case 'head':
        return renderHeadTab(inspectionData);
      case 'body':
        return renderBodyTab(inspectionData);
      case 'tail':
        return renderTailTab(inspectionData);
      case 'origin':
        return renderOriginTab(inspectionData);
    }
  }, [inspectionData, activeTab]);

  /**
   * Render head tab
   */
  const renderHeadTab = (data: CellInspection) => (
    <div style={styles.tabContent}>
      <h3 style={styles.tabTitle}>HEAD (Input)</h3>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Inputs</div>
        {data.inputs.length > 0 ? (
          <div style={styles.list}>
            {data.inputs.map((input, i) => (
              <div key={i} style={styles.listItem}>
                {JSON.stringify(input)}
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.empty}>No inputs</div>
        )}
      </div>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Sensations</div>
        {data.sensations.length > 0 ? (
          <div style={styles.list}>
            {data.sensations.map((sensation, i) => (
              <div key={i} style={styles.listItem}>
                {JSON.stringify(sensation)}
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.empty}>No sensations</div>
        )}
      </div>
    </div>
  );

  /**
   * Render body tab
   */
  const renderBodyTab = (data: CellInspection) => (
    <div style={styles.tabContent}>
      <h3 style={styles.tabTitle}>BODY (Processing)</h3>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Reasoning Trace</div>
        {data.reasoning.length > 0 ? (
          <div style={styles.trace}>
            {data.reasoning.map((step, i) => (
              <div key={i} style={styles.traceStep}>
                <div style={styles.traceStepNumber}>{i + 1}</div>
                <div style={styles.traceStepContent}>{String(step)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.empty}>No reasoning steps</div>
        )}
      </div>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Memory (Recent)</div>
        {data.memory.length > 0 ? (
          <div style={styles.memoryList}>
            {data.memory.map((record, i) => (
              <div key={i} style={styles.memoryItem}>
                <div style={styles.memoryTimestamp}>
                  {new Date(record.timestamp).toLocaleTimeString()}
                </div>
                <div style={styles.memoryContent}>
                  Input: {JSON.stringify(record.input).slice(0, 50)}...
                </div>
                <div style={styles.memoryConfidence}>
                  Confidence: {(record.confidence * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.empty}>No memory records</div>
        )}
      </div>
    </div>
  );

  /**
   * Render tail tab
   */
  const renderTailTab = (data: CellInspection) => (
    <div style={styles.tabContent}>
      <h3 style={styles.tabTitle}>TAIL (Output)</h3>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Outputs</div>
        {data.outputs.length > 0 ? (
          <div style={styles.list}>
            {data.outputs.map((output, i) => (
              <div key={i} style={styles.listItem}>
                {JSON.stringify(output)}
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.empty}>No outputs</div>
        )}
      </div>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Effects</div>
        {data.effects.length > 0 ? (
          <div style={styles.effectsList}>
            {data.effects.map((effect, i) => (
              <div key={i} style={styles.effectItem}>
                {String(effect)}
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.empty}>No effects</div>
        )}
      </div>
    </div>
  );

  /**
   * Render origin tab
   */
  const renderOriginTab = (data: CellInspection) => (
    <div style={styles.tabContent}>
      <h3 style={styles.tabTitle}>ORIGIN (Self)</h3>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Cell Identity</div>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>ID:</span>
          <span style={styles.detailValue}>{data.cellId.slice(0, 8)}...</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Type:</span>
          <span style={styles.detailValue}>{data.type}</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>State:</span>
          <span style={{
            ...styles.detailValue,
            ...styles.stateIndicator,
            backgroundColor: getStateColor(data.state),
          }}>
            {data.state}
          </span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Position:</span>
          <span style={styles.detailValue}>
            ({data.position.row}, {data.position.col})
          </span>
        </div>
      </div>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Self Model</div>
        {data.selfModel && (
          <div style={styles.selfModel}>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Identity:</span>
              <span style={styles.detailValue}>{data.selfModel.identity}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Executions:</span>
              <span style={styles.detailValue}>
                {data.selfModel.performance.totalExecutions}
              </span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Success Rate:</span>
              <span style={styles.detailValue}>
                {(data.selfModel.performance.averageConfidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Get state color
   */
  const getStateColor = (state: string): string => {
    switch (state) {
      case 'error': return '#f44336';
      case 'processing': return '#ff9800';
      case 'emitting': return '#4caf50';
      case 'dormant': return '#9e9e9e';
      default: return '#2196f3';
    }
  };

  // Don't render if not visible
  if (!visible || inspectorState === 'hidden') {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`touch-cell-inspector ${className}`}
      style={{ ...styles.container, ...style }}
    >
      {/* Backdrop */}
      <div
        style={{
          ...styles.backdrop,
          opacity: inspectorState === 'hidden' ? 0 : 0.5,
        }}
        onClick={handleClose}
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className="inspector-sheet"
        style={{
          ...styles.sheet,
          height: `${sheetHeight}px`,
          transform: inspectorState === 'hidden' ? 'translateY(100%)' : 'translateY(0)',
        }}
      >
        {/* Drag handle */}
        <div style={styles.dragHandleContainer}>
          <div style={styles.dragHandle} />
        </div>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerInfo}>
            <div style={styles.headerTitle}>
              Cell Inspector
            </div>
            <div style={styles.headerSubtitle}>
              {inspectionData?.type} • {String.fromCharCode(65 + inspectionData?.position.col || 0)}{inspectionData?.position.row ? inspectionData.position.row + 1 : ''}
            </div>
          </div>
          <button
            onClick={handleClose}
            style={styles.closeButton}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {(['head', 'body', 'tail', 'origin'] as InspectorTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {}),
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={styles.content}>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Memoized hook for inspection data
// ============================================================================

function useMemo<T>(factory: () => T, deps: any[]): T {
  // Simple memoization hook
  return factory();
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },

  backdrop: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    transition: 'opacity 0.3s ease',
    pointerEvents: 'auto',
  },

  sheet: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px',
    boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s ease, height 0.3s ease',
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
    maxHeight: '90vh',
  },

  dragHandleContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '12px',
    cursor: 'grab',
  },

  dragHandle: {
    width: '40px',
    height: '4px',
    backgroundColor: '#ddd',
    borderRadius: '2px',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #e0e0e0',
  },

  headerInfo: {
    flex: 1,
  },

  headerTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '4px',
  },

  headerSubtitle: {
    fontSize: '14px',
    color: '#666',
  },

  closeButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#f5f5f5',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e0e0e0',
  },

  tab: {
    flex: 1,
    padding: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '12px',
    fontWeight: 500,
    color: '#666',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
  },

  tabActive: {
    color: '#2196F3',
    borderBottomColor: '#2196F3',
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },

  tabContent: {
    animation: 'fadeIn 0.3s ease',
  },

  tabTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '16px',
  },

  section: {
    marginBottom: '24px',
  },

  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase' as const,
    marginBottom: '8px',
  },

  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },

  listItem: {
    padding: '8px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#333',
  },

  empty: {
    padding: '16px',
    textAlign: 'center' as const,
    fontSize: '12px',
    color: '#999',
    fontStyle: 'italic',
  },

  trace: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },

  traceStep: {
    display: 'flex',
    gap: '8px',
  },

  traceStepNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#2196F3',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  traceStepContent: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#333',
  },

  memoryList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },

  memoryItem: {
    padding: '8px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
  },

  memoryTimestamp: {
    fontSize: '10px',
    color: '#999',
    marginBottom: '4px',
  },

  memoryContent: {
    fontSize: '12px',
    color: '#333',
    marginBottom: '4px',
  },

  memoryConfidence: {
    fontSize: '10px',
    color: '#666',
  },

  effectsList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },

  effectItem: {
    padding: '6px 12px',
    backgroundColor: '#e3f2fd',
    borderRadius: '16px',
    fontSize: '11px',
    color: '#1976D2',
  },

  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
  },

  detailLabel: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 500,
  },

  detailValue: {
    fontSize: '12px',
    color: '#333',
    fontWeight: 600,
  },

  stateIndicator: {
    padding: '2px 8px',
    borderRadius: '4px',
    color: '#fff',
  },

  selfModel: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
  },
};

export default TouchCellInspector;
