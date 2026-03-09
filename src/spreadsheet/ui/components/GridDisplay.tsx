/**
 * POLLN Spreadsheet UI - GridDisplay Component
 *
 * Main grid view for displaying LOG cells in a spreadsheet layout.
 * Implements "Cell Pulse" concept with living, breathing cells.
 *
 * Features:
 * - Virtual scrolling for large grids
 * - Cell selection and highlighting
 * - Zoom and pan controls
 * - Grid size customization
 * - Cell state visualization
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { CellType, CellState, LogicLevel } from '../../core/types';
import { CellRendererWithTooltip } from './CellRenderer.js';

export interface GridCell {
  id: string;
  row: number;
  col: number;
  type: CellType;
  state: CellState;
  logicLevel: LogicLevel;
  value: unknown;
  confidence: number;
  watching: string[];
  sensations: number;
}

interface GridDisplayProps {
  cells: Map<string, GridCell>;
  rows: number;
  cols: number;
  onCellSelect?: (cellId: string) => void;
  selectedCellId?: string;
}

/**
 * GridDisplay - Main spreadsheet grid view
 */
export const GridDisplay: React.FC<GridDisplayProps> = ({
  cells,
  rows,
  cols,
  onCellSelect,
  selectedCellId,
}) => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const gridRef = useRef<HTMLDivElement>(null);

  // Calculate cell size based on zoom
  const cellSize = useMemo(() => ({
    width: 100 * zoom,
    height: 40 * zoom,
  }), [zoom]);

  // Handle cell selection
  const handleCellSelect = useCallback((cellId: string) => {
    onCellSelect?.(cellId);
  }, [onCellSelect]);

  // Handle mouse down for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  }, [pan]);

  // Handle mouse move for panning
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle zoom with wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.5, Math.min(2, prev + delta)));
    }
  }, []);

  // Get cell at position
  const getCellAt = (row: number, col: number): GridCell | undefined => {
    const cellId = `${String.fromCharCode(65 + col)}${row + 1}`;
    return cells.get(cellId);
  };

  // Generate grid rows
  const gridRows = useMemo(() => {
    const rows = [];
    for (let row = 0; row < rows; row++) {
      const cells = [];
      for (let col = 0; col < cols; col++) {
        const cell = getCellAt(row, col);
        cells.push({
          row,
          col,
          cell: cell || {
            id: `${String.fromCharCode(65 + col)}${row + 1}`,
            row,
            col,
            type: CellType.LOG,
            state: CellState.DORMANT,
            logicLevel: LogicLevel.L0_LOGIC,
            value: null,
            confidence: 0,
            watching: [],
            sensations: 0,
          },
        });
      }
      rows.push(cells);
    }
    return rows;
  }, [cells, rows, cols]);

  return (
    <div className="grid-display" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#121212',
      overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 16px',
        backgroundColor: '#1E1E1E',
        borderBottom: '1px solid #333',
      }}>
        <span style={{ color: '#888', fontSize: '12px' }}>Zoom:</span>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          style={{ width: '100px' }}
        />
        <span style={{ color: '#FFF', fontSize: '12px' }}>
          {Math.round(zoom * 100)}%
        </span>

        <div style={{ flex: 1 }} />

        <span style={{ color: '#888', fontSize: '12px' }}>
          {cells.size} cells
        </span>

        {selectedCellId && (
          <span style={{ color: '#2196F3', fontSize: '12px' }}>
            {selectedCellId}
          </span>
        )}
      </div>

      {/* Grid container */}
      <div
        ref={gridRef}
        className="grid-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative' as const,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <div
          className="grid-content"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'top left',
            padding: '20px',
          }}
        >
          {/* Column headers */}
          <div style={{ display: 'flex', marginBottom: '8px' }}>
            <div style={{ width: '40px', flexShrink: 0 }} />
            {Array.from({ length: cols }, (_, col) => (
              <div
                key={col}
                style={{
                  width: cellSize.width,
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#888',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {String.fromCharCode(65 + col)}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {gridRows.map((rowData, rowIndex) => (
            <div key={rowIndex} style={{ display: 'flex', marginBottom: '4px' }}>
              {/* Row header */}
              <div
                style={{
                  width: '40px',
                  height: cellSize.height,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#888',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}
              >
                {rowIndex + 1}
              </div>

              {/* Cells */}
              {rowData.map(({ col, cell }) => (
                <div
                  key={`${rowIndex}-${col}`}
                  style={{
                    width: cellSize.width,
                    height: cellSize.height,
                    border: '1px solid #333',
                    position: 'relative' as const,
                  }}
                >
                  <CellRendererWithTooltip
                    {...cell}
                    isSelected={selectedCellId === cell.id}
                    onSelect={() => handleCellSelect(cell.id)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '8px 16px',
        backgroundColor: '#1E1E1E',
        borderTop: '1px solid #333',
        fontSize: '11px',
        color: '#666',
      }}>
        <span>Ctrl+Scroll to zoom</span>
        <span>Alt+Drag to pan</span>
        <span>Click cell to inspect</span>

        <div style={{ flex: 1 }} />

        {hoveredCell && (
          <span style={{ color: '#2196F3' }}>
            {hoveredCell}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * GridDisplay with sensation overlay
 */
export const GridDisplayWithSensations: React.FC<GridDisplayProps & {
  sensations: Array<{
    from: string;
    to: string;
    type: string;
    strength: number;
  }>;
}> = ({ sensations, ...props }) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <GridDisplay {...props} />
      <SensationOverlay
        cells={props.cells}
        sensations={sensations}
      />
    </div>
  );
};

/**
 * SensationOverlay - Canvas overlay for sensation visualization
 * Implements "Sensation Lens" concept - X-ray vision for cell relationships
 */
interface SensationOverlayProps {
  cells: Map<string, GridCell>;
  sensations: Array<{
    from: string;
    to: string;
    type: string;
    strength: number;
  }>;
}

const SensationOverlay: React.FC<SensationOverlayProps> = ({ cells, sensations }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showSensations, setShowSensations] = useState(false);

  const getSensationColor = (type: string): string => {
    const colors: Record<string, string> = {
      absolute: '#2196F3',    // Blue
      velocity: '#4CAF50',    // Green
      acceleration: '#9C27B0', // Purple
      pattern: '#FFEB3B',     // Yellow
      anomaly: '#F44336',     // Red
      presence: '#9E9E9E',    // Grey
    };
    return colors[type] || '#666';
  };

  useEffect(() => {
    if (!showSensations || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw sensation connections
    sensations.forEach((sensation) => {
      const fromCell = cells.get(sensation.from);
      const toCell = cells.get(sensation.to);

      if (!fromCell || !toCell) return;

      // Calculate positions (simplified - would need actual cell positions)
      const fromX = fromCell.col * 100 + 50;
      const fromY = fromCell.row * 40 + 20;
      const toX = toCell.col * 100 + 50;
      const toY = toCell.row * 40 + 20;

      // Draw line
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = getSensationColor(sensation.type);
      ctx.lineWidth = sensation.strength * 3;
      ctx.globalAlpha = 0.3 + sensation.strength * 0.5;
      ctx.stroke();

      // Draw animated pulse
      const time = Date.now() / 1000;
      const pulseX = fromX + (toX - fromX) * ((time % 1) * 2 - 1);
      const pulseY = fromY + (toY - fromY) * ((time % 1) * 2 - 1);

      ctx.beginPath();
      ctx.arc(pulseX, pulseY, 4, 0, Math.PI * 2);
      ctx.fillStyle = getSensationColor(sensation.type);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
  }, [showSensations, sensations, cells]);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setShowSensations(!showSensations)}
        style={{
          position: 'absolute',
          top: '60px',
          right: '20px',
          padding: '8px 16px',
          backgroundColor: showSensations ? '#2196F3' : '#333',
          color: '#FFF',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          zIndex: 100,
        }}
      >
        {showSensations ? 'Hide' : 'Show'} Sensations
      </button>

      {/* Canvas overlay */}
      {showSensations && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}
    </>
  );
};

export default GridDisplay;
