/**
 * Heatmap - 2D heatmap visualization component
 *
 * Displays data density or intensity using color gradients.
 * Supports multiple color scales, interpolation methods, and contour lines.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

// ============================================================================
// Type Definitions
// ============================================================================

export type ColorScale =
  | 'sequential'
  | 'diverging'
  | 'categorical'
  | 'viridis'
  | 'plasma'
  | 'inferno'
  | 'magma'
  | 'cividis'
  | 'warm'
  | 'cool'
  | 'blues'
  | 'reds'
  | 'greens';

export type InterpolationMethod = 'nearest' | 'linear' | 'cubic' | 'bilinear';

export interface HeatmapDataPoint {
  x: number;
  y: number;
  value: number;
}

export interface HeatmapProps {
  data: number[][] | HeatmapDataPoint[];
  width?: number;
  height?: number;
  xLabels?: string[];
  yLabels?: string[];
  colorScale?: ColorScale;
  customColors?: [string, string]; // [low, high] for custom scale
  showLabels?: boolean;
  showContourLines?: boolean;
  contourLevels?: number;
  interpolation?: InterpolationMethod;
  cellGap?: number;
  onCellClick?: (x: number, y: number, value: number) => void;
  onCellHover?: (x: number, y: number, value: number) => void;
  minValue?: number;
  maxValue?: number;
  legendPosition?: 'right' | 'bottom' | 'none';
  className?: string;
  style?: React.CSSProperties;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  value: number;
  labelX?: string;
  labelY?: string;
  mouseX: number;
  mouseY: number;
}

// ============================================================================
// Color Scale Generators
// ============================================================================

function getColorScale(
  type: ColorScale,
  domain: [number, number],
  customColors?: [string, string]
): d3.ScaleLinear<string, string> {
  const [min, max] = domain;

  if (customColors) {
    return d3.scaleLinear<string>().domain([min, (min + max) / 2, max]).range([customColors[0], '#ffffff', customColors[1]]);
  }

  switch (type) {
    case 'viridis':
      return d3.scaleSequential(d3.interpolateViridis).domain([min, max]);
    case 'plasma':
      return d3.scaleSequential(d3.interpolatePlasma).domain([min, max]);
    case 'inferno':
      return d3.scaleSequential(d3.interpolateInferno).domain([min, max]);
    case 'magma':
      return d3.scaleSequential(d3.interpolateMagma).domain([min, max]);
    case 'cividis':
      return d3.scaleSequential(d3.interpolateCividis).domain([min, max]);
    case 'warm':
      return d3.scaleSequential(d3.interpolateWarm).domain([min, max]);
    case 'cool':
      return d3.scaleSequential(d3.interpolateCool).domain([min, max]);
    case 'blues':
      return d3.scaleSequential(d3.interpolateBlues).domain([min, max]);
    case 'reds':
      return d3.scaleSequential(d3.interpolateReds).domain([min, max]);
    case 'greens':
      return d3.scaleSequential(d3.interpolateGreens).domain([min, max]);
    case 'sequential':
      return d3.scaleSequential(d3.interpolateTurbo).domain([min, max]);
    case 'diverging':
      return d3.scaleDiverging(d3.interpolateRdYlBu).domain([min, (min + max) / 2, max]);
    case 'categorical':
      return d3.scaleLinear<string>().domain([min, max]).range(['#3b82f6', '#8b5cf6', '#ec4899']);
    default:
      return d3.scaleSequential(d3.interpolateTurbo).domain([min, max]);
  }
}

// ============================================================================
// Data Processing
// ============================================================================

function normalizeData(
  data: number[][] | HeatmapDataPoint[]
): { matrix: number[][]; rows: number; cols: number } {
  if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === 'number') {
    const matrix = data as number[][];
    return { matrix, rows: matrix.length, cols: matrix[0].length };
  }

  // Convert point data to matrix
  const points = data as HeatmapDataPoint[];
  const xValues = [...new Set(points.map((p) => p.x))].sort((a, b) => a - b);
  const yValues = [...new Set(points.map((p) => p.y))].sort((a, b) => a - b);

  const rows = yValues.length;
  const cols = xValues.length;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (const point of points) {
    const xIndex = xValues.indexOf(point.x);
    const yIndex = yValues.indexOf(point.y);
    if (xIndex >= 0 && yIndex >= 0) {
      matrix[yIndex][xIndex] = point.value;
    }
  }

  return { matrix, rows, cols };
}

function interpolateData(
  matrix: number[][],
  method: InterpolationMethod
): number[][] {
  if (method === 'nearest') return matrix;

  const rows = matrix.length;
  const cols = matrix[0].length;
  const scale = 2; // 2x interpolation

  const newRows = rows * scale - (scale - 1);
  const newCols = cols * scale - (scale - 1);
  const result: number[][] = Array.from({ length: newRows }, () => Array(newCols).fill(0));

  for (let i = 0; i < newRows; i++) {
    for (let j = 0; j < newCols; j++) {
      const x = j / scale;
      const y = i / scale;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const x1 = Math.min(x0 + 1, cols - 1);
      const y1 = Math.min(y0 + 1, rows - 1);

      if (method === 'bilinear' || method === 'linear') {
        // Bilinear interpolation
        const dx = x - x0;
        const dy = y - y0;
        const v00 = matrix[y0][x0];
        const v10 = matrix[y0][x1];
        const v01 = matrix[y1][x0];
        const v11 = matrix[y1][x1];

        const v0 = v00 * (1 - dx) + v10 * dx;
        const v1 = v01 * (1 - dx) + v11 * dx;
        result[i][j] = v0 * (1 - dy) + v1 * dy;
      } else if (method === 'cubic') {
        // Simplified cubic interpolation
        const neighbors = [
          matrix[Math.max(0, y0 - 1)][Math.max(0, x0 - 1)],
          matrix[Math.max(0, y0 - 1)][x0],
          matrix[Math.max(0, y0 - 1)][Math.min(cols - 1, x0 + 1)],
          matrix[y0][Math.max(0, x0 - 1)],
          matrix[y0][x0],
          matrix[y0][Math.min(cols - 1, x0 + 1)],
          matrix[Math.min(rows - 1, y0 + 1)][Math.max(0, x0 - 1)],
          matrix[Math.min(rows - 1, y0 + 1)][x0],
          matrix[Math.min(rows - 1, y0 + 1)][Math.min(cols - 1, x0 + 1)],
        ];
        result[i][j] = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
      }
    }
  }

  return result;
}

// ============================================================================
// Main Component
// ============================================================================

export const Heatmap: React.FC<HeatmapProps> = ({
  data,
  width = 800,
  height = 600,
  xLabels,
  yLabels,
  colorScale = 'viridis',
  customColors,
  showLabels = true,
  showContourLines = false,
  contourLevels = 5,
  interpolation = 'nearest',
  cellGap = 0,
  onCellClick,
  onCellHover,
  minValue,
  maxValue,
  legendPosition = 'right',
  className = '',
  style = {},
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    value: 0,
    mouseX: 0,
    mouseY: 0,
  });

  // Process data
  const { matrix, rows, cols } = normalizeData(data);

  // Calculate value range
  const allValues = matrix.flat();
  const dataMin = minValue !== undefined ? minValue : Math.min(...allValues);
  const dataMax = maxValue !== undefined ? maxValue : Math.max(...allValues);

  // Apply interpolation
  const displayMatrix = interpolation !== 'nearest' ? interpolateData(matrix, interpolation) : matrix;
  const displayRows = displayMatrix.length;
  const displayCols = displayMatrix[0].length;

  // Calculate dimensions
  const legendWidth = legendPosition === 'right' ? 80 : 0;
  const legendHeight = legendPosition === 'bottom' ? 80 : 0;
  const plotWidth = width - legendWidth;
  const plotHeight = height - legendHeight;
  const cellWidth = plotWidth / displayCols;
  const cellHeight = plotHeight / displayRows;

  // Create color scale
  const colorScaleFn = getColorScale(colorScale, [dataMin, dataMax], customColors);

  // Generate contour paths if enabled
  const contourPaths = showContourLines
    ? d3
        .contours()
        .size([displayCols, displayRows])
        .thresholds(d3.range(contourLevels).map((i) => dataMin + ((dataMax - dataMin) * i) / contourLevels))(
        displayMatrix.flat()
      )
    : [];

  // Handle cell interactions
  const handleCellClick = useCallback(
    (colIndex: number, rowIndex: number) => {
      const originalRowIndex = Math.floor((rowIndex / displayRows) * rows);
      const originalColIndex = Math.floor((colIndex / displayCols) * cols);
      onCellClick?.(originalColIndex, originalRowIndex, matrix[originalRowIndex][originalColIndex]);
    },
    [displayRows, displayCols, rows, cols, matrix, onCellClick]
  );

  const handleCellHover = useCallback(
    (colIndex: number, rowIndex: number, event: React.MouseEvent) => {
      const originalRowIndex = Math.floor((rowIndex / displayRows) * rows);
      const originalColIndex = Math.floor((colIndex / displayCols) * cols);
      const value = matrix[originalRowIndex][originalColIndex];

      setTooltip({
        visible: true,
        x: originalColIndex,
        y: originalRowIndex,
        value,
        labelX: xLabels?.[originalColIndex],
        labelY: yLabels?.[originalRowIndex],
        mouseX: event.clientX,
        mouseY: event.clientY,
      });

      onCellHover?.(originalColIndex, originalRowIndex, value);
    },
    [displayRows, displayCols, rows, cols, matrix, xLabels, yLabels, onCellHover]
  );

  const handleCellLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <div className={`heatmap-wrapper ${className}`} style={style}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label={`Heatmap showing ${rows}x${cols} data matrix`}
      >
        <desc>
          Heatmap visualization with {rows} rows and {cols} columns. Values range from {dataMin.toFixed(2)} to{' '}
          {dataMax.toFixed(2)}.
        </desc>

        {/* Main heatmap */}
        <g transform={`translate(0, 0)`}>
          {displayMatrix.map((row, rowIndex) =>
            row.map((value, colIndex) => {
              const x = colIndex * cellWidth;
              const y = rowIndex * cellHeight;
              const color = colorScaleFn(value);

              return (
                <rect
                  key={`${rowIndex}-${colIndex}`}
                  x={x}
                  y={y}
                  width={cellWidth - cellGap}
                  height={cellHeight - cellGap}
                  fill={color}
                  stroke={cellGap > 0 ? '#fff' : 'none'}
                  strokeWidth={cellGap}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleCellClick(colIndex, rowIndex)}
                  onMouseEnter={(e) => handleCellHover(colIndex, rowIndex, e)}
                  onMouseLeave={handleCellLeave}
                  aria-label={`Cell ${rowIndex},${colIndex}: ${value.toFixed(2)}`}
                />
              );
            })
          )}

          {/* Contour lines */}
          {showContourLines &&
            contourPaths.map((contour, i) => (
              <g key={i} transform={`scale(${cellWidth}, ${cellHeight})`}>
                {contour.coordinates.map((coords, j) => (
                  <path
                    key={j}
                    d={`M${coords.map((c) => `${c[0]},${c[1]}`).join(' L')} Z`}
                    fill="none"
                    stroke="#000"
                    strokeWidth={1 / cellWidth}
                    opacity={0.3}
                  />
                ))}
              </g>
            ))}
        </g>

        {/* X-axis labels */}
        {showLabels && xLabels && (
          <g transform={`translate(0, ${plotHeight})`}>
            {xLabels.map((label, i) => {
              // Skip labels if there are too many
              const step = Math.ceil(cols / 20);
              if (i % step !== 0) return null;

              const x = (i / cols) * plotWidth + cellWidth / 2;
              return (
                <text
                  key={i}
                  x={x}
                  y={15}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#64748b"
                  transform={`rotate(${cols > 10 ? -45 : 0}, ${x}, 15)`}
                >
                  {label}
                </text>
              );
            })}
          </g>
        )}

        {/* Y-axis labels */}
        {showLabels && yLabels && (
          <g transform={`translate(${plotWidth}, 0)`}>
            {yLabels.map((label, i) => {
              const step = Math.ceil(rows / 20);
              if (i % step !== 0) return null;

              const y = (i / rows) * plotHeight + cellHeight / 2;
              return (
                <text
                  key={i}
                  x={10}
                  y={y}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill="#64748b"
                >
                  {label}
                </text>
              );
            })}
          </g>
        )}

        {/* Color scale legend */}
        {legendPosition !== 'none' && (
          <g>
            <defs>
              <linearGradient id="legend-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
                {Array.from({ length: 100 }, (_, i) => {
                  const value = dataMin + ((dataMax - dataMin) * i) / 100;
                  const color = colorScaleFn(value);
                  return <stop key={i} offset={`${i}%`} stopColor={color} />;
                })}
              </linearGradient>
            </defs>

            {legendPosition === 'right' ? (
              <g transform={`translate(${plotWidth + 10}, 0)`}>
                <rect x={0} y={0} width={20} height={plotHeight} fill="url(#legend-gradient)" />
                <text x={10} y={-10} textAnchor="middle" fontSize={11} fill="#64748b">
                  {dataMax.toFixed(2)}
                </text>
                <text x={10} y={plotHeight + 15} textAnchor="middle" fontSize={11} fill="#64748b">
                  {dataMin.toFixed(2)}
                </text>
              </g>
            ) : (
              <g transform={`translate(0, ${plotHeight + 10})`}>
                <rect x={0} y={0} width={plotWidth} height={20} fill="url(#legend-gradient)" />
                <text x={0} y={35} textAnchor="start" fontSize={11} fill="#64748b">
                  {dataMin.toFixed(2)}
                </text>
                <text x={plotWidth} y={35} textAnchor="end" fontSize={11} fill="#64748b">
                  {dataMax.toFixed(2)}
                </text>
              </g>
            )}
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="heatmap-tooltip"
          style={{
            position: 'fixed',
            left: tooltip.mouseX + 15,
            top: tooltip.mouseY + 15,
            background: 'rgba(0, 0, 0, 0.85)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            [{tooltip.x}, {tooltip.y}]
          </div>
          {tooltip.labelX && <div>X: {tooltip.labelX}</div>}
          {tooltip.labelY && <div>Y: {tooltip.labelY}</div>}
          <div style={{ marginTop: '4px', fontSize: '14px' }}>{tooltip.value.toFixed(4)}</div>
        </div>
      )}
    </div>
  );
};

export default Heatmap;
