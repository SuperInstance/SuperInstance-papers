/**
 * ParallelCoordinates - Multi-dimensional data visualization
 *
 * Displays multiple dimensions on parallel axes with brushing and filtering.
 * Supports highlighting, axis reordering, and normalization options.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

// ============================================================================
// Type Definitions
// ============================================================================

export interface DataPoint {
  [key: string]: number | string;
}

export interface AxisConfig {
  key: string;
  label?: string;
  type?: 'number' | 'string';
  domain?: [number, number];
  inverted?: boolean;
  color?: string;
}

export interface ParallelCoordinatesProps {
  data: DataPoint[];
  dimensions: AxisConfig[];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  lineColor?: string | ((d: DataPoint, i: number) => string);
  lineOpacity?: number;
  lineWidth?: number;
  showAxes?: boolean;
  showLabels?: boolean;
  enableBrushing?: boolean;
  enableDrag?: boolean;
  selectedData?: DataPoint[];
  onSelectionChange?: (selected: DataPoint[]) => void;
  onAxisReorder?: (newOrder: string[]) => void;
  onLineClick?: (d: DataPoint) => void;
  onLineHover?: (d: DataPoint | null) => void;
  normalizeMethod?: 'minmax' | 'zscore' | 'rank';
  className?: string;
  style?: React.CSSProperties;
}

interface BrushState {
  [dimension: string]: [number, number] | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function normalizeValue(
  value: number,
  domain: [number, number],
  method: 'minmax' | 'zscore' | 'rank'
): number {
  const [min, max] = domain;

  switch (method) {
    case 'minmax':
      return max === min ? 0.5 : (value - min) / (max - min);
    case 'zscore':
      const mean = (min + max) / 2;
      const std = (max - min) / 4; // Approximate std dev
      return std === 0 ? 0.5 : 0.5 + ((value - mean) / (std * 2));
    case 'rank':
      // Rank-based normalization would need full dataset
      return max === min ? 0.5 : (value - min) / (max - min);
    default:
      return max === min ? 0.5 : (value - min) / (max - min);
  }
}

function getDefaultLineColor(d: DataPoint, i: number): string {
  return d3.schemeCategory10[i % 10];
}

// ============================================================================
// Main Component
// ============================================================================

export const ParallelCoordinates: React.FC<ParallelCoordinatesProps> = ({
  data,
  dimensions,
  width = 800,
  height = 600,
  margin = { top: 40, right: 40, bottom: 40, left: 40 },
  lineColor = getDefaultLineColor,
  lineOpacity = 0.6,
  lineWidth = 1.5,
  showAxes = true,
  showLabels = true,
  enableBrushing = true,
  enableDrag = true,
  selectedData = [],
  onSelectionChange,
  onAxisReorder,
  onLineClick,
  onLineHover,
  normalizeMethod = 'minmax',
  className = '',
  style = {},
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [brushState, setBrushState] = useState<BrushState>({});
  const [hoveredData, setHoveredData] = useState<DataPoint | null>(null);
  const [axisOrder, setAxisOrder] = useState<string[]>(dimensions.map((d) => d.key));
  const [draggedAxis, setDraggedAxis] = useState<string | null>(null);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Calculate domains for each dimension
  const domains = useCallback(() => {
    const doms: Record<string, [number, number]> = {};

    dimensions.forEach((dim) => {
      const values = data.map((d) => d[dim.key] as number).filter((v) => typeof v === 'number') as number[];

      if (dim.domain) {
        doms[dim.key] = dim.domain;
      } else {
        doms[dim.key] = [d3.min(values) || 0, d3.max(values) || 1];
      }
    });

    return doms;
  }, [data, dimensions]);

  const dimensionDomains = domains();

  // Create scales for each dimension
  const scales = useCallback(() => {
    const scs: Record<string, d3.ScaleLinear<number, number>> = {};
    const xStep = innerWidth / (axisOrder.length - 1);

    axisOrder.forEach((key, i) => {
      const domain = dimensionDomains[key];
      const invert = dimensions.find((d) => d.key === key)?.inverted;

      scs[key] = d3
        .scaleLinear()
        .domain(invert ? [domain[1], domain[0]] : domain)
        .range([innerHeight, 0]);
    });

    return scs;
  }, [axisOrder, dimensionDomains, dimensions, innerHeight]);

  const dimensionScales = scales();

  // X position for each dimension
  const getX = (key: string) => {
    const index = axisOrder.indexOf(key);
    return margin.left + (index * innerWidth) / (axisOrder.length - 1);
  };

  // Generate path for a data point
  const generatePath = useCallback(
    (d: DataPoint): string => {
      const points = axisOrder.map((key) => {
        const x = getX(key);
        const y = dimensionScales[key](d[key] as number);
        return [x, y];
      });

      return d3.line()(points as [number, number][]) || '';
    },
    [axisOrder, dimensionScales]
  );

  // Filter data based on brushes
  const filteredData = useCallback((): DataPoint[] => {
    return data.filter((d) => {
      for (const [dim, range] of Object.entries(brushState)) {
        if (range) {
          const value = d[dim] as number;
          const scale = dimensionScales[dim];
          const y = scale(value);
          const [y0, y1] = range;
          if (y < Math.min(y0, y1) || y > Math.max(y0, y1)) {
            return false;
          }
        }
      }
      return true;
    });
  }, [data, brushState, dimensionScales]);

  const visibleData = filteredData();

  // Clear brush for a dimension
  const clearBrush = useCallback((dimension: string) => {
    setBrushState((prev) => {
      const newState = { ...prev };
      delete newState[dimension];
      return newState;
    });
  }, []);

  // Clear all brushes
  const clearAllBrushes = useCallback(() => {
    setBrushState({});
  }, []);

  // Render visualization
  useEffect(() => {
    if (!svgRef.current || !data.length || !axisOrder.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create axes
    if (showAxes) {
      const axisGroups = g.append('g').attr('class', 'axes');

      axisOrder.forEach((key) => {
        const axisG = axisGroups.append('g').attr('class', `axis axis-${key}`).attr('transform', `translate(${getX(key) - margin.left}, 0)`);

        // Draw axis line
        axisG.append('line').attr('y1', 0).attr('y2', innerHeight).attr('stroke', '#cbd5e1').attr('stroke-width', 1);

        // Add ticks
        const scale = dimensionScales[key];
        const ticks = scale.ticks(5);

        ticks.forEach((tick) => {
          const y = scale(tick);

          axisG
            .append('line')
            .attr('y1', y)
            .attr('y2', y)
            .attr('x1', -5)
            .attr('x2', 5)
            .attr('stroke', '#94a3b8')
            .attr('stroke-width', 1);

          axisG
            .append('text')
            .attr('y', y)
            .attr('x', -10)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '10px')
            .attr('fill', '#64748b')
            .text(tick.toFixed(1));
        });

        // Add label
        if (showLabels) {
          const config = dimensions.find((d) => d.key === key);
          const label = config?.label || key;

          axisG
            .append('text')
            .attr('y', -15)
            .attr('text-anchor', 'middle')
            .attr('font-weight', 'bold')
            .attr('font-size', '12px')
            .attr('fill', '#334155')
            .style('cursor', enableDrag ? 'grab' : 'default')
            .text(label)
            .on('mouseover', function () {
              if (enableDrag) {
                d3.select(this).style('cursor', 'grab').attr('fill', '#3b82f6');
              }
            })
            .on('mouseout', function () {
              if (enableDrag) {
                d3.select(this).style('cursor', 'grab').attr('fill', '#334155');
              }
            })
            .call(
              d3
                .drag<SVGTextElement, unknown>()
                .on('start', (event, d) => {
                  setDraggedAxis(key);
                  d3.select(event.sourceEvent.target as SVGTextElement).style('cursor', 'grabbing');
                })
                .on('drag', (event) => {
                  if (!draggedAxis) return;

                  // Find closest axis position
                  const x = event.x;
                  let closestIndex = 0;
                  let minDist = Infinity;

                  axisOrder.forEach((key, i) => {
                    const axisX = getX(key);
                    const dist = Math.abs(axisX - x);
                    if (dist < minDist) {
                      minDist = dist;
                      closestIndex = i;
                    }
                  });

                  // Reorder if needed
                  const currentIndex = axisOrder.indexOf(draggedAxis);
                  if (currentIndex !== closestIndex) {
                    const newOrder = [...axisOrder];
                    newOrder.splice(currentIndex, 1);
                    newOrder.splice(closestIndex, 0, draggedAxis);
                    setAxisOrder(newOrder);
                    onAxisReorder?.(newOrder);
                  }
                })
                .on('end', () => {
                  setDraggedAxis(null);
                }) as any
            );
        }

        // Add brush
        if (enableBrushing) {
          const brush = d3
            .brushY<SVGGElement>()
            .extent([
              [-10, 0],
              [10, innerHeight],
            ])
            .on('start brush end', (event) => {
              const selection = event.selection;
              if (selection) {
                setBrushState((prev) => ({
                  ...prev,
                  [key]: selection as [number, number],
                }));
              } else {
                clearBrush(key);
              }
            });

          axisG.call(brush as any);

          // Add clear button for brush
          axisG
            .append('circle')
            .attr('cy', innerHeight + 15)
            .attr('r', 8)
            .attr('fill', '#ef4444')
            .attr('opacity', 0)
            .style('cursor', 'pointer')
            .on('mouseover', function () {
              if (brushState[key]) {
                d3.select(this).attr('opacity', 1);
              }
            })
            .on('mouseout', function () {
              d3.select(this).attr('opacity', 0);
            })
            .on('click', () => {
              clearBrush(key);
              axisG.select('.brush').call(brush.move, null);
            });
        }
      });
    }

    // Draw lines
    const lineGroup = g.append('g').attr('class', 'lines');

    const lines = lineGroup
      .selectAll<SVGPathElement, DataPoint>('path')
      .data(data)
      .enter()
      .append('path')
      .attr('d', (d) => generatePath(d))
      .attr('fill', 'none')
      .attr('stroke', (d, i) => (typeof lineColor === 'function' ? lineColor(d, i) : lineColor))
      .attr('stroke-width', lineWidth)
      .attr('stroke-opacity', (d) =>
        selectedData.length > 0 ? (selectedData.includes(d) ? 1 : 0.1) : lineOpacity
      )
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onLineClick?.(d);
      })
      .on('mouseover', (event, d) => {
        setHoveredData(d);
        onLineHover?.(d);
        d3.select(event.currentTarget).attr('stroke-width', lineWidth * 2).attr('stroke-opacity', 1);
      })
      .on('mouseout', (event) => {
        setHoveredData(null);
        onLineHover?.(null);
        d3.select(event.currentTarget).attr('stroke-width', lineWidth).attr('stroke-opacity', (d) =>
          selectedData.length > 0 ? (selectedData.includes(d) ? 1 : 0.1) : lineOpacity
        );
      });

    // Highlight selected lines
    if (selectedData.length > 0) {
      lines
        .filter((d) => selectedData.includes(d))
        .attr('stroke-width', lineWidth * 1.5)
        .attr('stroke-opacity', 1)
        .raise();
    }
  }, [
    data,
    axisOrder,
    dimensions,
    dimensionScales,
    margin,
    innerWidth,
    innerHeight,
    showAxes,
    showLabels,
    enableBrushing,
    enableDrag,
    generatePath,
    lineColor,
    lineOpacity,
    lineWidth,
    selectedData,
    brushState,
    draggedAxis,
    onLineClick,
    onLineHover,
    onAxisReorder,
    clearBrush,
    getX,
  ]);

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(visibleData);
    }
  }, [visibleData, onSelectionChange]);

  return (
    <div className={`parallel-coordinates-wrapper ${className}`} style={style}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label={`Parallel coordinates with ${dimensions.length} dimensions and ${data.length} data points`}
      >
        <desc>
          Parallel coordinates plot showing {data.length} observations across {dimensions.length} dimensions
        </desc>
      </svg>

      {/* Tooltip */}
      {hoveredData && (
        <div
          className="parallel-coordinates-tooltip"
          style={{
            position: 'fixed',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '150px',
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' }}>
            Data Point
          </div>
          {axisOrder.map((key) => {
            const config = dimensions.find((d) => d.key === key);
            const label = config?.label || key;
            const value = hoveredData[key];

            return (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>{label}:</span>
                <span style={{ fontWeight: '500' }}>{typeof value === 'number' ? value.toFixed(2) : value}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Controls */}
      <div
        className="parallel-coordinates-controls"
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {Object.keys(brushState).length > 0 && (
          <button
            onClick={clearAllBrushes}
            style={{
              padding: '8px 12px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            Clear All Filters
          </button>
        )}

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {visibleData.length} / {data.length} visible
          </div>
          {Object.keys(brushState).length > 0 && (
            <div style={{ color: '#64748b' }}>{Object.keys(brushState).length} filter(s) active</div>
          )}
        </div>
      </div>

      {/* Instructions */}
      {enableDrag && showLabels && (
        <div
          className="parallel-coordinates-instructions"
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#64748b',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          Drag axis labels to reorder dimensions
        </div>
      )}
    </div>
  );
};

export default ParallelCoordinates;
