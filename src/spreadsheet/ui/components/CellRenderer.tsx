/**
 * POLLN Spreadsheet UI - CellRenderer Component
 *
 * Renders individual LOG cells with visual states and animations.
 * Implements "Cell Pulse" concept - living, breathing cells.
 *
 * Features:
 * - Breathing animation based on cell state
 * - Color coding by cell type and logic level
 * - Hover tooltips with cell metadata
 * - Selection state management
 */

import React, { useState, useEffect, useRef } from 'react';
import { CellState, CellType, LogicLevel } from '../../core/types';

/**
 * Cell shape based on logic level
 * L0: circle (simple)
 * L1: diamond (pattern)
 * L2: hexagon (agent)
 * L3: star (LLM)
 */
const getShapeForLevel = (level: LogicLevel): string => {
  const shapes: Record<LogicLevel, string> = {
    [LogicLevel.L0_LOGIC]: 'circle',
    [LogicLevel.L1_PATTERN]: 'diamond',
    [LogicLevel.L2_AGENT]: 'hexagon',
    [LogicLevel.L3_LLM]: 'star',
  };
  return shapes[level] || 'circle';
};

/**
 * Cell color based on cell type
 */
const getColorForType = (type: CellType): string => {
  const colors: Record<CellType, string> = {
    [CellType.INPUT]: '#4CAF50',        // Green
    [CellType.OUTPUT]: '#2196F3',       // Blue
    [CellType.TRANSFORM]: '#FF9800',    // Orange
    [CellType.FILTER]: '#607D8B',       // Blue Grey
    [CellType.AGGREGATE]: '#E91E63',    // Pink
    [CellType.VALIDATE]: '#8BC34A',     // Light Green
    [CellType.ANALYSIS]: '#9C27B0',     // Purple
    [CellType.PREDICTION]: '#F44336',   // Red
    [CellType.DECISION]: '#00BCD4',     // Cyan
    [CellType.EXPLAIN]: '#795548',      // Brown
    [CellType.LOG]: '#9E9E9E',          // Grey
  };
  return colors[type] || '#9E9E9E';
};

/**
 * Breathing animation speed based on state
 */
const getBreathSpeed = (state: CellState): number => {
  const speeds: Record<CellState, number> = {
    [CellState.DORMANT]: 0,
    [CellState.SENSING]: 2000,      // Slow breath
    [CellState.PROCESSING]: 500,    // Rapid pulse
    [CellState.EMITTING]: 200,      // Burst
    [CellState.ERROR]: 150,         // Fast flutter
  };
  return speeds[state] || 1000;
};

interface CellRendererProps {
  id: string;
  type: CellType;
  state: CellState;
  logicLevel: LogicLevel;
  value: unknown;
  confidence?: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onHover?: () => void;
  showOrigin?: boolean;
  sensationCount?: number;
}

/**
 * CellRenderer - Individual cell component with living animations
 */
export const CellRenderer: React.FC<CellRendererProps> = ({
  id,
  type,
  state,
  logicLevel,
  value,
  confidence = 0.5,
  isSelected = false,
  onSelect,
  onHover,
  showOrigin = false,
  sensationCount = 0,
}) => {
  const [isBreathing, setIsBreathing] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);
  const breathRef = useRef<number>();
  const cellRef = useRef<HTMLDivElement>(null);

  // Breathing animation
  useEffect(() => {
    const speed = getBreathSpeed(state);
    if (speed === 0) {
      setIsBreathing(false);
      return;
    }

    setIsBreathing(true);

    const animate = () => {
      setPulsePhase((prev) => (prev + 1) % 360);
      breathRef.current = requestAnimationFrame(animate);
    };

    breathRef.current = requestAnimationFrame(animate);

    return () => {
      if (breathRef.current) {
        cancelAnimationFrame(breathRef.current);
      }
    };
  }, [state]);

  // Calculate pulse scale based on phase
  const pulseScale = isBreathing
    ? 1 + Math.sin((pulsePhase * Math.PI * 2) / (getBreathSpeed(state) / 16)) * 0.05
    : 1;

  // Calculate opacity based on confidence
  const opacity = 0.6 + (confidence * 0.4);

  // Base styles
  const baseStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative' as const,
  };

  // Cell shape styles
  const shapeStyles: Record<string, React.CSSProperties> = {
    circle: {
      borderRadius: '50%',
    },
    diamond: {
      transform: 'rotate(45deg)',
      borderRadius: '4px',
    },
    hexagon: {
      clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
    },
    star: {
      clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    },
  };

  const shape = getShapeForLevel(logicLevel);
  const color = getColorForType(type);

  // Selection glow
  const selectedGlow = isSelected
    ? {
        boxShadow: `0 0 20px ${color}, 0 0 40px ${color}80`,
        transform: `scale(${pulseScale * 1.05})`,
      }
    : {};

  return (
    <div
      ref={cellRef}
      className="log-cell"
      data-cell-id={id}
      data-cell-type={type}
      data-cell-state={state}
      onClick={onSelect}
      onMouseEnter={onHover}
      style={{
        ...baseStyle,
        ...shapeStyles[shape],
        backgroundColor: color,
        opacity,
        transform: `scale(${pulseScale})`,
        ...selectedGlow,
      }}
    >
      {/* Origin point glow */}
      {showOrigin && (
        <div
          className="cell-origin"
          style={{
            position: 'absolute' as const,
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            boxShadow: `0 0 ${8 + pulsePhase / 10}px #FFFFFF`,
            opacity: 0.9,
          }}
        />
      )}

      {/* Sensation indicator */}
      {sensationCount > 0 && (
        <div
          className="sensation-badge"
          style={{
            position: 'absolute' as const,
            top: '-4px',
            right: '-4px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#FFC107',
            color: '#000',
            fontSize: '10px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {sensationCount}
        </div>
      )}

      {/* Cell value preview */}
      <div
        className="cell-value"
        style={{
          color: '#FFFFFF',
          fontSize: '11px',
          fontWeight: '500',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' as const,
          maxWidth: '80%',
          textAlign: 'center' as const,
        }}
      >
        {value !== null && value !== undefined ? String(value).slice(0, 8) : ''}
      </div>

      {/* Error indicator */}
      {state === CellState.ERROR && (
        <div
          className="error-indicator"
          style={{
            position: 'absolute' as const,
            bottom: '-2px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            height: '2px',
            backgroundColor: '#FF0000',
            animation: 'error-flash 0.5s infinite',
          }}
        />
      )}
    </div>
  );
};

/**
 * CellRenderer with tooltip support
 */
export const CellRendererWithTooltip: React.FC<CellRendererProps> = (props) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({ x: rect.left, y: rect.top });
    setShowTooltip(true);
    props.onHover?.();
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <div style={{ position: 'relative' as const }}>
      <CellRenderer {...props} onHover={handleMouseEnter} />
      {showTooltip && (
        <CellTooltip
          cell={props}
          position={tooltipPosition}
          onClose={() => setShowTooltip(false)}
        />
      )}
    </div>
  );
};

/**
 * Cell tooltip component
 */
interface CellTooltipProps {
  cell: CellRendererProps;
  position: { x: number; y: number };
  onClose: () => void;
}

const CellTooltip: React.FC<CellTooltipProps> = ({ cell, position, onClose }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={tooltipRef}
      className="cell-tooltip"
      style={{
        position: 'fixed' as const,
        left: position.x,
        top: position.y - 120,
        width: '250px',
        backgroundColor: '#1E1E1E',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '12px',
        color: '#FFFFFF',
        fontSize: '12px',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ marginBottom: '8px' }}>
        <strong>{cell.id}</strong>
        <span style={{ marginLeft: '8px', color: '#888' }}>{cell.type}</span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div>State: <span style={{ color: getColorForType(cell.type) }}>{cell.state}</span></div>
        <div>Logic Level: L{cell.logicLevel}</div>
        <div>Confidence: {(cell.confidence * 100).toFixed(0)}%</div>
      </div>

      {cell.value !== null && cell.value !== undefined && (
        <div style={{ marginBottom: '8px' }}>
          <div>Value:</div>
          <div style={{
            backgroundColor: '#2A2A2A',
            padding: '8px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '11px',
            wordBreak: 'break-all' as const,
          }}>
            {typeof cell.value === 'object'
              ? JSON.stringify(cell.value, null, 2)
              : String(cell.value)}
          </div>
        </div>
      )}

      {cell.sensationCount > 0 && (
        <div style={{ color: '#FFC107' }}>
          Monitoring {cell.sensationCount} sensation(s)
        </div>
      )}
    </div>
  );
};

export default CellRenderer;
