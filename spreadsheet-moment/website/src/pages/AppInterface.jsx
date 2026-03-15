import React, { useState, useCallback, useEffect } from 'react';
import '../styles/globals.css';

// Agent cell types
const CELL_TYPES = {
  EMPTY: 'empty',
  SENSOR: 'sensor',
  ANALYZER: 'analyzer',
  CONTROLLER: 'controller',
  ORCHESTRATOR: 'orchestrator'
};

// Agentic cell states (Origin-Centric Design)
const CELL_STATES = {
  DORMANT: 'dormant',           // Idle, waiting for trigger
  THINKING: 'thinking',         // Visual reasoning in progress
  NEEDS_REVIEW: 'needs_review', // HITL approval required
  POSTED: 'posted',             // Action completed
  ARCHIVED: 'archived',         // Auto-handled by agent handshake
  ERROR: 'error'                // Recursive loop or error detected
};

// Initial grid data (20 columns x 100 rows)
const createEmptyGrid = (rows = 100, cols = 20) => {
  return Array(rows).fill(null).map((_, rowIndex) =>
    Array(cols).fill(null).map((_, colIndex) => ({
      type: CELL_TYPES.EMPTY,
      value: '',
      config: null,
      connections: [],
      state: CELL_STATES.DORMANT,
      // Origin-Centric Design properties
      originId: `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`,
      coordinateKey: `${rowIndex}-${colIndex}`,
      traceId: null,
      reasoning: [],
      createdAt: null,
      lastUpdate: null
    }))
  );
};

// Generate unique trace ID for Origin-Centric Design
const generateTraceId = () => {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Simulated reasoning blocks (Visual Thinking)
const generateReasoning = (cellType, coordinate) => {
  const reasoningTemplates = {
    [CELL_TYPES.SENSOR]: [
      `Monitoring external data source for ${coordinate}...`,
      `Detecting changes in input stream...`,
      `Filtering noise from signal...`,
      `Validating data integrity...`,
      `✓ Data received and parsed successfully`
    ],
    [CELL_TYPES.ANALYZER]: [
      `Loading ML model for ${coordinate} analysis...`,
      `Processing input vector through neural network...`,
      `Applying attention mechanisms to key features...`,
      `Computing confidence scores...`,
      `✓ Analysis complete: 94.7% confidence`
    ],
    [CELL_TYPES.CONTROLLER]: [
      `Evaluating control state for ${coordinate}...`,
      `Checking safety constraints before action...`,
      `Computing optimal control parameters...`,
      `Preparing actuation commands...`,
      `✓ Control signal sent successfully`
    ],
    [CELL_TYPES.ORCHESTRATOR]: [
      `Scanning neighbor cells for coordination...`,
      `Building dependency graph for ${coordinate}...`,
      `Checking for circular dependencies (OCD check)...`,
      `Scheduling parallel execution...`,
      `✓ Coordination plan established`
    ]
  };

  return reasoningTemplates[cellType] || [];
};

function AppInterface() {
  const [grid, setGrid] = useState(() => createEmptyGrid());
  const [selectedCell, setSelectedCell] = useState(null);
  const [messages, setMessages] = useState([]);
  const [visualThinkingOpen, setVisualThinkingOpen] = useState(false);

  // Handle cell selection
  const handleCellClick = useCallback((rowIndex, colIndex) => {
    const cell = grid[rowIndex][colIndex];
    setSelectedCell({ row: rowIndex, col: colIndex, cell });

    // Auto-open visual thinking for active cells
    if (cell.type !== CELL_TYPES.EMPTY && cell.state === CELL_STATES.THINKING) {
      setVisualThinkingOpen(true);
    }
  }, [grid]);

  // Create agent cell with Origin-Centric Design
  const createAgentCell = useCallback((rowIndex, colIndex, type, config) => {
    const originId = `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`;
    const traceId = generateTraceId();

    setGrid(prevGrid => {
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) =>
              cIdx === colIndex
                ? {
                    type,
                    value: config.name || `${type}_${originId}`,
                    config,
                    connections: config.connections || [],
                    state: CELL_STATES.THINKING,
                    // Origin-Centric Design
                    originId,
                    coordinateKey: `${rowIndex}-${colIndex}`,
                    traceId,
                    reasoning: [],
                    createdAt: new Date().toISOString(),
                    lastUpdate: new Date().toISOString()
                  }
                : cell
            )
          : row
      );
      return newGrid;
    });

    // Add message to the log
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        type: 'success',
        text: `Created ${type} cell at ${originId} (Trace: ${traceId.substr(0, 12)}...)`,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);

    // Start reasoning simulation
    simulateReasoning(rowIndex, colIndex, type, originId, traceId);
  }, []);

  // Simulate visual thinking process
  const simulateReasoning = useCallback((rowIndex, colIndex, cellType, originId, traceId) => {
    const reasoningSteps = generateReasoning(cellType, originId);
    let stepIndex = 0;

    const reasoningInterval = setInterval(() => {
      if (stepIndex >= reasoningSteps.length) {
        clearInterval(reasoningInterval);

        // Transition to NEEDS_REVIEW for HITL
        setGrid(prevGrid => {
          const newGrid = prevGrid.map((row, rIdx) =>
            rIdx === rowIndex
              ? row.map((cell, cIdx) =>
                  cIdx === colIndex
                    ? {
                        ...cell,
                        state: CELL_STATES.NEEDS_REVIEW,
                        reasoning: reasoningSteps,
                        lastUpdate: new Date().toISOString()
                      }
                    : cell
              )
            : row
          );
          return newGrid;
        });

        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            type: 'info',
            text: `${originId}: Awaiting your approval`,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);

        return;
      }

      // Add reasoning step
      setGrid(prevGrid => {
        const newGrid = prevGrid.map((row, rIdx) =>
          rIdx === rowIndex
            ? row.map((cell, cIdx) =>
                cIdx === colIndex
                  ? {
                      ...cell,
                      reasoning: [...cell.reasoning, reasoningSteps[stepIndex]],
                      lastUpdate: new Date().toISOString()
                    }
                  : cell
              )
            : row
        );
        return newGrid;
      });

      stepIndex++;
    }, 800);
  }, []);

  // Approve action (HITL)
  const approveAction = useCallback(() => {
    if (!selectedCell) return;

    setGrid(prevGrid => {
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === selectedCell.row
          ? row.map((cell, cIdx) =>
              cIdx === selectedCell.col
                ? {
                    ...cell,
                    state: CELL_STATES.POSTED,
                    lastUpdate: new Date().toISOString()
                  }
                  : cell
            )
          : row
      );
      return newGrid;
    });

    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        type: 'success',
        text: `${selectedCell.cell.originId}: Action approved and executed`,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  }, [selectedCell]);

  // Reject action (provide correction)
  const rejectAction = useCallback(() => {
    if (!selectedCell) return;

    setGrid(prevGrid => {
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === selectedCell.row
          ? row.map((cell, cIdx) =>
              cIdx === selectedCell.col
                ? {
                    ...cell,
                    state: CELL_STATES.DORMANT,
                    reasoning: [],
                    lastUpdate: new Date().toISOString()
                  }
                  : cell
            )
          : row
      );
      return newGrid;
    });

    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        type: 'error',
        text: `${selectedCell.cell.originId}: Action rejected - cell returned to dormant`,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  }, [selectedCell]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedCell(null);
    setVisualThinkingOpen(false);
  }, []);

  // Cell style based on type and state
  const getCellStyle = (cell, isSelected) => {
    const baseStyle = {
      border: '1px solid #565869',
      padding: '8px',
      minWidth: '120px',
      height: '30px',
      fontSize: '14px',
      cursor: 'pointer',
      background: '#202123',
      transition: 'all 200ms ease-out',
      fontFamily: 'var(--font-mono)',
      color: '#ececf1'
    };

    if (cell.type === CELL_TYPES.EMPTY) {
      if (isSelected) {
        return {
          ...baseStyle,
          borderColor: '#22c55e',
          background: 'rgba(34, 197, 94, 0.1)',
          boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.3)'
        };
      }
      return baseStyle;
    }

    const typeStyles = {
      [CELL_TYPES.SENSOR]: {
        bg: 'rgba(96, 165, 250, 0.1)',
        border: '#3b82f6',
        glow: 'rgba(59, 130, 246, 0.3)'
      },
      [CELL_TYPES.ANALYZER]: {
        bg: 'rgba(139, 92, 246, 0.1)',
        border: '#8b5cf6',
        glow: 'rgba(139, 92, 246, 0.3)'
      },
      [CELL_TYPES.CONTROLLER]: {
        bg: 'rgba(251, 146, 60, 0.1)',
        border: '#f97316',
        glow: 'rgba(249, 115, 22, 0.3)'
      },
      [CELL_TYPES.ORCHESTRATOR]: {
        bg: 'rgba(34, 197, 94, 0.1)',
        border: '#22c55e',
        glow: 'rgba(34, 197, 94, 0.3)'
      }
    };

    const style = typeStyles[cell.type] || typeStyles[CELL_TYPES.SENSOR];

    // State-based styling
    let stateOverlay = {};
    switch (cell.state) {
      case CELL_STATES.THINKING:
        stateOverlay = {
          animation: 'pulse 1.5s ease-in-out infinite',
          boxShadow: `0 0 15px ${style.glow}`
        };
        break;
      case CELL_STATES.NEEDS_REVIEW:
        stateOverlay = {
          borderColor: '#fbbf24',
          boxShadow: '0 0 10px rgba(251, 191, 36, 0.5)'
        };
        break;
      case CELL_STATES.POSTED:
        stateOverlay = {
          borderColor: '#22c55e',
          opacity: 0.8
        };
        break;
      case CELL_STATES.ERROR:
        stateOverlay = {
          borderColor: '#ef4444',
          boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
        };
        break;
      default:
        break;
    }

    return {
      ...baseStyle,
      background: style.bg,
      borderColor: isSelected ? '#22c55e' : style.border,
      ...stateOverlay,
      boxShadow: isSelected
        ? '0 0 0 2px rgba(34, 197, 94, 0.3)'
        : stateOverlay.boxShadow || (cell.state === CELL_STATES.DORMANT ? 'none' : `0 0 8px ${style.glow}`)
    };
  };

  const getCellIcon = (type) => {
    const icons = {
      [CELL_TYPES.SENSOR]: '🔍',
      [CELL_TYPES.ANALYZER]: '🧠',
      [CELL_TYPES.CONTROLLER]: '⚙️',
      [CELL_TYPES.ORCHESTRATOR]: '🎯'
    };
    return icons[type] || '';
  };

  const getStateIcon = (state) => {
    const icons = {
      [CELL_STATES.DORMANT]: '💤',
      [CELL_STATES.THINKING]: '💭',
      [CELL_STATES.NEEDS_REVIEW]: '⚠️',
      [CELL_STATES.POSTED]: '✅',
      [CELL_STATES.ARCHIVED]: '📦',
      [CELL_STATES.ERROR]: '❌'
    };
    return icons[state] || '';
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', background: '#202123' }}>
      {/* Main Grid Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            margin: 0,
            fontSize: '2.5em',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #22c55e 0%, #3b82f6 50%, #8b5cf6 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 200%',
            animation: 'gradientShift 3s ease infinite'
          }}>
            Spreadsheet Moment
          </h1>
          <p style={{
            margin: '8px 0 0 0',
            color: '#8e8ea0',
            fontSize: '1.1em'
          }}>
            Agentic Spreadsheet with Origin-Centric Design • Click any cell to create an intelligent agent
          </p>
        </div>

        {/* Grid Container */}
        <div style={{
          border: '2px solid #40414f',
          borderRadius: '12px',
          background: '#1a1b1e',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
        }}>
          {/* Column Headers */}
          <div style={{
            display: 'flex',
            background: '#343541',
            borderBottom: '1px solid #40414f'
          }}>
            <div style={{
              width: '50px',
              height: '30px',
              border: '1px solid #40414f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}></div>
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} style={{
                width: '120px',
                height: '30px',
                border: '1px solid #40414f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '12px',
                color: '#8e8ea0'
              }}>
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: 'flex' }}>
              {/* Row Header */}
              <div style={{
                width: '50px',
                height: '30px',
                border: '1px solid #40414f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '12px',
                color: '#8e8ea0',
                background: '#343541'
              }}>
                {rowIndex + 1}
              </div>

              {/* Cells */}
              {row.map((cell, colIndex) => {
                const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    style={getCellStyle(cell, isSelected)}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                  >
                    {cell.type !== CELL_TYPES.EMPTY && (
                      <span style={{ marginRight: '4px' }}>
                        {getCellIcon(cell.type)}
                      </span>
                    )}
                    <span>{cell.value || ''}</span>
                    {cell.type !== CELL_TYPES.EMPTY && (
                      <span style={{ marginLeft: '4px', fontSize: '10px' }}>
                        {getStateIcon(cell.state)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Side Panel */}
      <div style={{
        width: '420px',
        borderLeft: '1px solid #40414f',
        padding: '24px',
        overflow: 'auto',
        background: '#1a1b1e'
      }}>
        {selectedCell && selectedCell.cell.type === CELL_TYPES.EMPTY ? (
          <div>
            <h2 style={{
              marginTop: 0,
              marginBottom: '8px',
              fontSize: '1.8em',
              color: '#ececf1'
            }}>
              Create Agent Cell
            </h2>
            <p style={{
              color: '#8e8ea0',
              marginBottom: '24px',
              fontSize: '0.95em'
            }}>
              Selected: <strong style={{ color: '#22c55e' }}>
                {selectedCell.cell.originId}
              </strong>
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: '#ececf1',
                fontSize: '0.9em'
              }}>
                Cell Type:
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#343541',
                  border: '1px solid #565869',
                  borderRadius: '8px',
                  color: '#ececf1',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
                onChange={(e) => {
                  const type = e.target.value;
                  const config = {
                    name: `${type}_${selectedCell.cell.originId}`,
                    connections: []
                  };
                  createAgentCell(selectedCell.row, selectedCell.col, type, config);
                }}
                defaultValue=""
              >
                <option value="">Select type...</option>
                <option value={CELL_TYPES.SENSOR}>🔍 Sensor</option>
                <option value={CELL_TYPES.ANALYZER}>🧠 Analyzer</option>
                <option value={CELL_TYPES.CONTROLLER}>⚙️ Controller</option>
                <option value={CELL_TYPES.ORCHESTRATOR}>🎯 Orchestrator</option>
              </select>
            </div>

            <button
              onClick={clearSelection}
              className="btn-secondary"
              style={{ width: '100%' }}
            >
              Cancel
            </button>
          </div>
        ) : selectedCell ? (
          <div>
            <h2 style={{
              marginTop: 0,
              marginBottom: '8px',
              fontSize: '1.8em',
              color: '#ececf1'
            }}>
              Cell Properties
            </h2>
            <p style={{
              color: '#8e8ea0',
              marginBottom: '24px',
              fontSize: '0.95em'
            }}>
              {selectedCell.cell.originId}
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
                color: '#ececf1',
                fontSize: '0.85em',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Type
              </label>
              <div style={{
                padding: '10px 12px',
                background: '#343541',
                border: '1px solid #565869',
                borderRadius: '8px',
                color: '#ececf1'
              }}>
                {getCellIcon(selectedCell.cell.type)} {selectedCell.cell.type}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
                color: '#ececf1',
                fontSize: '0.85em',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                State
              </label>
              <div style={{
                padding: '10px 12px',
                background: '#343541',
                border: '1px solid #565869',
                borderRadius: '8px',
                color: '#ececf1',
                textTransform: 'capitalize',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>{getStateIcon(selectedCell.cell.state)}</span>
                <span>{selectedCell.cell.state.replace(/_/g, ' ')}</span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
                color: '#ececf1',
                fontSize: '0.85em',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Origin ID (OCD)
              </label>
              <div style={{
                padding: '10px 12px',
                background: '#343541',
                border: '1px solid #565869',
                borderRadius: '8px',
                color: '#ececf1',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px'
              }}>
                {selectedCell.cell.originId}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
                color: '#ececf1',
                fontSize: '0.85em',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Trace ID
              </label>
              <div style={{
                padding: '10px 12px',
                background: '#343541',
                border: '1px solid #565869',
                borderRadius: '8px',
                color: '#8e8ea0',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px'
              }}>
                {selectedCell.cell.traceId || 'N/A'}
              </div>
            </div>

            {/* HITL Buttons for NEEDS_REVIEW state */}
            {selectedCell.cell.state === CELL_STATES.NEEDS_REVIEW && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 600,
                  color: '#fbbf24',
                  fontSize: '0.9em'
                }}>
                  ⚠️ Action Requires Approval
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={approveAction}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                      color: 'white',
                      padding: '12px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)',
                      transition: 'all 200ms ease-out'
                    }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={rejectAction}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                      color: 'white',
                      padding: '12px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)',
                      transition: 'all 200ms ease-out'
                    }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            )}

            {/* Visual Thinking Toggle */}
            {selectedCell.cell.type !== CELL_TYPES.EMPTY && selectedCell.cell.reasoning.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => setVisualThinkingOpen(!visualThinkingOpen)}
                  style={{
                    width: '100%',
                    background: '#343541',
                    color: '#8b5cf6',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    border: '1px solid #8b5cf6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 200ms ease-out'
                  }}
                >
                  <span>💭</span>
                  <span>{visualThinkingOpen ? 'Hide' : 'Show'} Visual Thinking</span>
                </button>
              </div>
            )}

            {/* Visual Thinking Panel */}
            {visualThinkingOpen && selectedCell.cell.reasoning.length > 0 && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: '#1e1e24',
                border: '1px solid #8b5cf6',
                borderRadius: '8px',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                <div style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: '#c5c5d2',
                  lineHeight: '1.6'
                }}>
                  {selectedCell.cell.reasoning.map((step, idx) => (
                    <div key={idx} style={{
                      marginBottom: '4px',
                      paddingLeft: idx === selectedCell.cell.reasoning.length - 1 ? '0' : '12px',
                      borderLeft: idx === selectedCell.cell.reasoning.length - 1 ? 'none' : '2px solid #8b5cf6',
                      opacity: idx === selectedCell.cell.reasoning.length - 1 ? 1 : 0.7
                    }}>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setGrid(prevGrid => {
                  const newGrid = prevGrid.map((row, rIdx) =>
                    rIdx === selectedCell.row
                      ? row.map((cell, cIdx) =>
                          cIdx === selectedCell.col
                            ? {
                                type: CELL_TYPES.EMPTY,
                                value: '',
                                config: null,
                                connections: [],
                                state: CELL_STATES.DORMANT,
                                originId: cell.originId,
                                coordinateKey: cell.coordinateKey,
                                traceId: null,
                                reasoning: [],
                                createdAt: null,
                                lastUpdate: null
                              }
                            : cell
                        )
                      : row
                  );
                  return newGrid;
                });
                clearSelection();
              }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                color: 'white',
                padding: '10px',
                borderRadius: '8px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)',
                transition: 'all 200ms ease-out'
              }}
            >
              Clear Cell
            </button>
          </div>
        ) : (
          <div>
            <h2 style={{
              marginTop: 0,
              marginBottom: '16px',
              fontSize: '1.8em',
              color: '#ececf1'
            }}>
              Getting Started
            </h2>
            <p style={{
              color: '#8e8ea0',
              lineHeight: '1.7',
              marginBottom: '24px'
            }}>
              Click any cell in the grid to create an agentic cell. Features:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                padding: '12px',
                background: '#343541',
                borderRadius: '8px',
                border: '1px solid #40414f',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '1.5em' }}>💭</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#ececf1', marginBottom: '2px' }}>Visual Thinking</div>
                  <div style={{ fontSize: '0.9em', color: '#8e8ea0' }}>See agent reasoning before action</div>
                </div>
              </div>

              <div style={{
                padding: '12px',
                background: '#343541',
                borderRadius: '8px',
                border: '1px solid #40414f',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '1.5em' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#ececf1', marginBottom: '2px' }}>Human-in-the-Loop</div>
                  <div style={{ fontSize: '0.9em', color: '#8e8ea0' }}>Approve or reject agent actions</div>
                </div>
              </div>

              <div style={{
                padding: '12px',
                background: '#343541',
                borderRadius: '8px',
                border: '1px solid #40414f',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '1.5em' }}>🔐</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#ececf1', marginBottom: '2px' }}>Origin-Centric Design</div>
                  <div style={{ fontSize: '0.9em', color: '#8e8ea0' }}>Trace IDs prevent recursive loops</div>
                </div>
              </div>

              <div style={{
                padding: '12px',
                background: '#343541',
                borderRadius: '8px',
                border: '1px solid #40414f',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '1.5em' }}>🤝</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#ececf1', marginBottom: '2px' }}>Agent Handshake</div>
                  <div style={{ fontSize: '0.9em', color: '#8e8ea0' }}>Auto-filter bot interactions</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Log */}
        <div style={{ marginTop: '32px' }}>
          <h3 style={{
            marginBottom: '16px',
            color: '#ececf1',
            fontSize: '1.3em'
          }}>
            Activity Log
          </h3>
          <div style={{
            background: '#343541',
            border: '1px solid #40414f',
            borderRadius: '12px',
            padding: '12px',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            {messages.length === 0 ? (
              <p style={{
                color: '#8e8ea0',
                fontStyle: 'italic',
                textAlign: 'center',
                fontSize: '0.9em'
              }}>
                No activity yet
              </p>
            ) : (
              messages.slice().reverse().map(msg => (
                <div key={msg.id} style={{
                  padding: '6px 0',
                  borderBottom: '1px solid #40414f',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <span style={{
                    color: '#8e8ea0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    minWidth: '60px'
                  }}>
                    [{msg.timestamp}]
                  </span>
                  <span style={{
                    color: msg.type === 'success' ? '#22c55e' :
                           msg.type === 'error' ? '#ef4444' : '#3b82f6',
                    flex: 1
                  }}>
                    {msg.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginTop: '24px' }}>
          <h3 style={{
            marginBottom: '16px',
            color: '#ececf1',
            fontSize: '1.3em'
          }}>
            Grid Stats
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div style={{
              padding: '12px',
              background: '#343541',
              borderRadius: '8px',
              border: '1px solid #40414f',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '1.8em',
                fontWeight: 700,
                color: '#22c55e'
              }}>
                {grid.flat().filter(c => c.type !== CELL_TYPES.EMPTY).length}
              </div>
              <div style={{
                fontSize: '0.85em',
                color: '#8e8ea0'
              }}>
                Active Cells
              </div>
            </div>

            <div style={{
              padding: '12px',
              background: '#343541',
              borderRadius: '8px',
              border: '1px solid #40414f',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '1.8em',
                fontWeight: 700,
                color: '#fbbf24'
              }}>
                {grid.flat().filter(c => c.state === CELL_STATES.NEEDS_REVIEW).length}
              </div>
              <div style={{
                fontSize: '0.85em',
                color: '#8e8ea0'
              }}>
                Need Review
              </div>
            </div>

            <div style={{
              padding: '12px',
              background: '#343541',
              borderRadius: '8px',
              border: '1px solid #40414f',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '1.8em',
                fontWeight: 700,
                color: '#8b5cf6'
              }}>
                {grid.flat().filter(c => c.state === CELL_STATES.THINKING).length}
              </div>
              <div style={{
                fontSize: '0.85em',
                color: '#8e8ea0'
              }}>
                Thinking
              </div>
            </div>

            <div style={{
              padding: '12px',
              background: '#343541',
              borderRadius: '8px',
              border: '1px solid #40414f',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '1.8em',
                fontWeight: 700,
                color: '#3b82f6'
              }}>
                {grid.length * grid[0].length}
              </div>
              <div style={{
                fontSize: '0.85em',
                color: '#8e8ea0'
              }}>
                Total Cells
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppInterface;
