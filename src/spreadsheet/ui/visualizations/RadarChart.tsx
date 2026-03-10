/**
 * RadarChart - Multi-variable comparison visualization
 *
 * Displays multiple variables on a radial axis for comparing multiple data series.
 * Features customizable axes, area fills, and interactive tooltips.
 */

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

// ============================================================================
// Type Definitions
// ============================================================================

export interface RadarAxis {
  key: string;
  label: string;
  min?: number;
  max?: number;
}

export interface RadarSeries {
  name: string;
  data: Record<string, number>;
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
}

export interface RadarChartProps {
  data: RadarSeries[];
  axes: RadarAxis[];
  width?: number;
  height?: number;
  margin?: number;
  maxValue?: number;
  levels?: number;
  showAxes?: boolean;
  showLabels?: boolean;
  showPoints?: boolean;
  showGrid?: boolean;
  enableAnimation?: boolean;
  animationDuration?: number;
  onSeriesHover?: (series: RadarSeries | null) => void;
  onAxisClick?: (axis: RadarAxis) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface HoverState {
  series: RadarSeries | null;
  axisIndex: number;
  value: number;
  mouseX: number;
  mouseY: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getSeriesColor(series: RadarSeries, index: number): string {
  return series.color || d3.schemeCategory10[index % 10];
}

function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

// ============================================================================
// Main Component
// ============================================================================

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  axes,
  width = 600,
  height = 600,
  margin = 60,
  maxValue,
  levels = 5,
  showAxes = true,
  showLabels = true,
  showPoints = true,
  showGrid = true,
  enableAnimation = true,
  animationDuration = 750,
  onSeriesHover,
  onAxisClick,
  className = '',
  style = {},
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverState, setHoverState] = useState<HoverState | null>(null);

  // Calculate dimensions
  const radius = Math.min(width, height) / 2 - margin;
  const centerX = width / 2;
  const centerY = height / 2;
  const angleSlice = (Math.PI * 2) / axes.length;

  // Calculate global max value
  const globalMax = maxValue !== undefined
    ? maxValue
    : Math.max(
        ...data.flatMap((series) =>
          axes.map((axis) => {
            const value = series.data[axis.key] || 0;
            const min = axis.min ?? 0;
            const max = axis.max ?? 1;
            return normalizeValue(value, min, max);
          })
        )
      );

  // Calculate point position
  const getPosition = (value: number, axisIndex: number, min: number, max: number): [number, number] => {
    const normalizedValue = normalizeValue(value, min, max);
    const radiusScaled = radius * normalizedValue;
    const angle = axisIndex * angleSlice - Math.PI / 2;

    return [
      centerX + radiusScaled * Math.cos(angle),
      centerY + radiusScaled * Math.sin(angle)
    ];
  };

  // Generate path for a series
  const generatePath = (series: RadarSeries): string => {
    const points = axes.map((axis, index) => {
      const value = series.data[axis.key] || 0;
      const min = axis.min ?? 0;
      const max = axis.max ?? globalMax;
      return getPosition(value, index, min, max);
    });

    return d3.lineRadial<d3.LineRadialCoordinate>
      .curve(d3.curveLinearClosed)
      .angle((_, i) => i * angleSlice)
      .radius((d) => Math.sqrt(Math.pow(d[0] - centerX, 2) + Math.pow(d[1] - centerY, 2)))
      (points as any) || '';
  };

  useEffect(() => {
    if (!svgRef.current || !data.length || !axes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create main group
    const g = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);

    // Draw grid levels
    if (showGrid) {
      const levelGroup = g.append('g').attr('class', 'grid-levels');

      for (let i = levels; i > 0; i--) {
        const levelRadius = (radius * i) / levels;

        levelGroup
          .append('circle')
          .attr('r', levelRadius)
          .attr('fill', 'none')
          .attr('stroke', '#e2e8f0')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,4');

        // Add level labels
        if (showLabels) {
          levelGroup
            .append('text')
            .attr('y', -levelRadius - 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('fill', '#94a3b8')
            .text(`${((i / levels) * 100).toFixed(0)}%`);
        }
      }
    }

    // Draw axes
    if (showAxes) {
      const axisGroup = g.append('g').attr('class', 'axes');

      axes.forEach((axis, index) => {
        const angle = index * angleSlice - Math.PI / 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        // Axis line
        axisGroup
          .append('line')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', x)
          .attr('y2', y)
          .attr('stroke', '#cbd5e1')
          .attr('stroke-width', 1)
          .style('cursor', 'pointer')
          .on('click', () => onAxisClick?.(axis));

        // Axis label
        if (showLabels) {
          const labelRadius = radius + 25;
          const labelX = labelRadius * Math.cos(angle);
          const labelY = labelRadius * Math.sin(angle);

          axisGroup
            .append('text')
            .attr('x', labelX)
            .attr('y', labelY)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('fill', '#334155')
            .style('cursor', 'pointer')
            .text(axis.label)
            .on('click', () => onAxisClick?.(axis));
        }
      });
    }

    // Draw data series
    data.forEach((series, seriesIndex) => {
      const seriesColor = getSeriesColor(series, seriesIndex);
      const seriesGroup = g.append('g').attr('class', `series-${seriesIndex}`);

      // Draw filled area
      const pathData = axes.map((axis, index) => {
        const value = series.data[axis.key] || 0;
        const min = axis.min ?? 0;
        const max = axis.max ?? globalMax;
        const normalizedValue = normalizeValue(value, min, max);
        const r = radius * normalizedValue;
        const angle = index * angleSlice - Math.PI / 2;

        return [r * Math.cos(angle), r * Math.sin(angle)];
      });

      const areaPath = d3
        .lineRadial()
        .curve(d3.curveLinearClosed)
        .angle((_, i) => i * angleSlice)
        .radius((d) => Math.sqrt(Math.pow(d[0], 2) + Math.pow(d[1], 2)))(pathData as any);

      seriesGroup
        .append('path')
        .datum(pathData)
        .attr('d', areaPath)
        .attr('fill', seriesColor)
        .attr('fill-opacity', series.fillOpacity ?? 0.2)
        .attr('stroke', seriesColor)
        .attr('stroke-width', series.strokeWidth ?? 2)
        .style('cursor', 'pointer')
        .on('mouseover', () => {
          onSeriesHover?.(series);
          d3.select(`.series-${seriesIndex} path`).attr('fill-opacity', 0.4);
        })
        .on('mouseout', () => {
          onSeriesHover?.(null);
          d3.select(`.series-${seriesIndex} path`).attr('fill-opacity', series.fillOpacity ?? 0.2);
        });

      // Draw points
      if (showPoints) {
        axes.forEach((axis, index) => {
          const value = series.data[axis.key] || 0;
          const min = axis.min ?? 0;
          const max = axis.max ?? globalMax;
          const [x, y] = getPosition(value, index, min, max);

          seriesGroup
            .append('circle')
            .attr('cx', x - centerX)
            .attr('cy', y - centerY)
            .attr('r', 4)
            .attr('fill', seriesColor)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', (event) => {
              const rect = svgRef.current?.getBoundingClientRect();
              setHoverState({
                series,
                axisIndex: index,
                value,
                mouseX: event.clientX,
                mouseY: event.clientY,
              });
            })
            .on('mouseout', () => {
              setHoverState(null);
            });
        });
      }
    });

    // Add animation if enabled
    if (enableAnimation) {
      g.selectAll('path')
        .attr('opacity', 0)
        .transition()
        .duration(animationDuration)
        .attr('opacity', 1);
    }
  }, [
    data,
    axes,
    width,
    height,
    radius,
    centerX,
    centerY,
    angleSlice,
    globalMax,
    levels,
    showAxes,
    showLabels,
    showPoints,
    showGrid,
    enableAnimation,
    animationDuration,
    onSeriesHover,
    onAxisClick,
    getPosition,
  ]);

  return (
    <div className={`radar-chart-wrapper ${className}`} style={style}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label={`Radar chart comparing ${data.length} series across ${axes.length} axes`}
      >
        <desc>
          Radar chart with {data.length} data series and {axes.length} axes
        </desc>
      </svg>

      {/* Tooltip */}
      {hoverState && (
        <div
          className="radar-chart-tooltip"
          style={{
            position: 'fixed',
            left: hoverState.mouseX + 15,
            top: hoverState.mouseY + 15,
            background: 'rgba(0, 0, 0, 0.85)',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '13px' }}>
            {hoverState.series.name}
          </div>
          <div>
            <span style={{ opacity: 0.8 }}>{axes[hoverState.axisIndex].label}:</span>{' '}
            <span style={{ fontWeight: '600' }}>{hoverState.value.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        className="radar-chart-legend"
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '11px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Series</div>
        {data.map((series, index) => (
          <div
            key={series.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '4px',
              cursor: 'pointer',
            }}
            onMouseEnter={() => onSeriesHover?.(series)}
            onMouseLeave={() => onSeriesHover?.(null)}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: getSeriesColor(series, index),
                marginRight: '6px',
              }}
            />
            <span>{series.name}</span>
          </div>
        ))}
      </div>

      {/* Axis info */}
      {showLabels && (
        <div
          className="radar-chart-axes-info"
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Axes</div>
          <div>{axes.length} dimensions</div>
          {maxValue !== undefined && <div>Max: {maxValue.toFixed(2)}</div>}
        </div>
      )}
    </div>
  );
};

export default RadarChart;
