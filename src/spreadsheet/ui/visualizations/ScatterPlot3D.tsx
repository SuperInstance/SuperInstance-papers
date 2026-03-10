/**
 * ScatterPlot3D - Three-dimensional data visualization
 *
 * Displays 3D point clouds with rotation, zoom, and color mapping.
 * Features regression planes, selection tools, and multiple data series.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Point3D {
  x: number;
  y: number;
  z: number;
  label?: string;
  color?: string;
  size?: number;
  [key: string]: any;
}

export interface Scatter3DSeries {
  name: string;
  data: Point3D[];
  color?: string;
  pointSize?: number;
  opacity?: number;
}

export interface RegressionPlane {
  equation: (x: number, y: number) => number;
  color?: string;
  opacity?: number;
}

export type ColorDimension = 'x' | 'y' | 'z' | 'custom' | 'series';

export interface ScatterPlot3DProps {
  data: Scatter3DSeries[];
  width?: number;
  height?: number;
  depth?: number;
  pointSize?: number;
  colorDimension?: ColorDimension;
  colorScale?: string[];
  enableRotation?: boolean;
  enableZoom?: boolean;
  enableSelection?: boolean;
  showAxes?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  regressionPlane?: RegressionPlane;
  initialRotation?: { theta: number; phi: number };
  onPointClick?: (point: Point3D, series: Scatter3DSeries) => void;
  onPointHover?: (point: Point3D | null) => void;
  onSelectionChange?: (selected: Point3D[]) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface RotationState {
  theta: number; // Rotation around Y axis
  phi: number; // Rotation around X axis
}

interface ProjectionState {
  x: number;
  y: number;
  scale: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function project3DTo2D(
  x: number,
  y: number,
  z: number,
  rotation: RotationState,
  projection: ProjectionState,
  center: { x: number; y: number }
): { x: number; y: number; z: number } {
  // Apply rotation
  const cosTheta = Math.cos(rotation.theta);
  const sinTheta = Math.sin(rotation.theta);
  const cosPhi = Math.cos(rotation.phi);
  const sinPhi = Math.sin(rotation.phi);

  // Rotate around Y axis (theta)
  let x1 = x * cosTheta - z * sinTheta;
  let z1 = x * sinTheta + z * cosTheta;
  let y1 = y;

  // Rotate around X axis (phi)
  let y2 = y1 * cosPhi - z1 * sinPhi;
  let z2 = y1 * sinPhi + z1 * cosPhi;
  let x2 = x1;

  // Simple perspective projection
  const perspective = 1000;
  const scale = perspective / (perspective + z2) * projection.scale;

  return {
    x: center.x + x2 * scale,
    y: center.y - y2 * scale, // Flip Y for screen coordinates
    z: z2, // Keep Z for depth sorting
  };
}

function getPointColor(
  point: Point3D,
  series: Scatter3DSeries,
  seriesIndex: number,
  dimension: ColorDimension,
  colorScale?: string[],
  allPoints?: Point3D[]
): string {
  if (dimension === 'series') {
    return series.color || d3.schemeCategory10[seriesIndex % 10];
  }

  if (dimension === 'custom') {
    return point.color || series.color || d3.schemeCategory10[seriesIndex % 10];
  }

  if (colorScale && colorScale.length > 0) {
    let value: number;
    switch (dimension) {
      case 'x':
        value = point.x;
        break;
      case 'y':
        value = point.y;
        break;
      case 'z':
        value = point.z;
        break;
      default:
        value = point.x;
    }

    if (allPoints && allPoints.length > 0) {
      const values = allPoints.map((p) => (dimension === 'x' ? p.x : dimension === 'y' ? p.y : p.z));
      const min = Math.min(...values);
      const max = Math.max(...values);
      const normalized = (value - min) / (max - min);
      const index = Math.floor(normalized * (colorScale.length - 1));
      return colorScale[Math.max(0, Math.min(colorScale.length - 1, index))];
    }
  }

  return series.color || d3.schemeCategory10[seriesIndex % 10];
}

// ============================================================================
// Main Component
// ============================================================================

export const ScatterPlot3D: React.FC<ScatterPlot3DProps> = ({
  data,
  width = 800,
  height = 600,
  depth = 600,
  pointSize = 6,
  colorDimension = 'series',
  colorScale = d3.schemeViridis[7],
  enableRotation = true,
  enableZoom = true,
  enableSelection = false,
  showAxes = true,
  showGrid = true,
  showLabels = false,
  regressionPlane,
  initialRotation = { theta: -Math.PI / 4, phi: Math.PI / 6 },
  onPointClick,
  onPointHover,
  onSelectionChange,
  className = '',
  style = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState<RotationState>(initialRotation);
  const [projection, setProjection] = useState<ProjectionState>({ x: 0, y: 0, scale: 1 });
  const [hoveredPoint, setHoveredPoint] = useState<Point3D | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Collect all points for color scaling
  const allPoints = data.flatMap((series) => series.data);

  // Calculate data bounds
  const bounds = {
    x: [Math.min(...allPoints.map((p) => p.x)), Math.max(...allPoints.map((p) => p.x))],
    y: [Math.min(...allPoints.map((p) => p.y)), Math.max(...allPoints.map((p) => p.y))],
    z: [Math.min(...allPoints.map((p) => p.z)), Math.max(...allPoints.map((p) => p.z))],
  };

  const ranges = {
    x: bounds.x[1] - bounds.x[0],
    y: bounds.y[1] - bounds.y[0],
    z: bounds.z[1] - bounds.z[0],
  };

  const maxRange = Math.max(ranges.x, ranges.y, ranges.z);
  const center = {
    x: width / 2,
    y: height / 2,
  };

  // Normalize point to cube centered at origin
  const normalizePoint = (point: Point3D): Point3D => ({
    ...point,
    x: ((point.x - (bounds.x[0] + bounds.x[1]) / 2) / maxRange) * 0.8 * Math.min(width, height),
    y: ((point.y - (bounds.y[0] + bounds.y[1]) / 2) / maxRange) * 0.8 * Math.min(width, height),
    z: ((point.z - (bounds.z[0] + bounds.z[1]) / 2) / maxRange) * 0.8 * Math.min(width, height),
  });

  // Render scene
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.5;

      // Draw cube edges
      const cubeSize = (maxRange * 0.8 * Math.min(width, height)) / 2;
      const corners = [
        [-1, -1, -1],
        [1, -1, -1],
        [1, 1, -1],
        [-1, 1, -1],
        [-1, -1, 1],
        [1, -1, 1],
        [1, 1, 1],
        [-1, 1, 1],
      ].map(([x, y, z]) =>
        project3DTo2D(x * cubeSize, y * cubeSize, z * cubeSize, rotation, projection, center)
      );

      const edges = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0], // Back face
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4], // Front face
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7], // Connecting edges
      ];

      edges.forEach(([i, j]) => {
        ctx.beginPath();
        ctx.moveTo(corners[i].x, corners[i].y);
        ctx.lineTo(corners[j].x, corners[j].y);
        ctx.stroke();
      });
    }

    // Draw axes
    if (showAxes) {
      const axisLength = (maxRange * 0.8 * Math.min(width, height)) / 2;
      const origin = project3DTo2D(0, 0, 0, rotation, projection, center);

      // X axis
      const xAxis = project3DTo2D(axisLength, 0, 0, rotation, projection, center);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(xAxis.x, xAxis.y);
      ctx.stroke();

      // Y axis
      const yAxis = project3DTo2D(0, axisLength, 0, rotation, projection, center);
      ctx.strokeStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(yAxis.x, yAxis.y);
      ctx.stroke();

      // Z axis
      const zAxis = project3DTo2D(0, 0, axisLength, rotation, projection, center);
      ctx.strokeStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(zAxis.x, zAxis.y);
      ctx.stroke();

      // Labels
      ctx.font = 'bold 12px Arial';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('X', xAxis.x + 5, xAxis.y);
      ctx.fillStyle = '#22c55e';
      ctx.fillText('Y', yAxis.x + 5, yAxis.y);
      ctx.fillStyle = '#3b82f6';
      ctx.fillText('Z', zAxis.x + 5, zAxis.y);
    }

    // Draw regression plane
    if (regressionPlane) {
      const planeSize = (maxRange * 0.8 * Math.min(width, height)) / 2;
      const gridSize = 10;
      const step = (planeSize * 2) / gridSize;

      ctx.fillStyle = regressionPlane.color || 'rgba(59, 130, 246, 0.2)';
      ctx.strokeStyle = regressionPlane.color || 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 1;

      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const x0 = -planeSize + i * step;
          const y0 = -planeSize + j * step;

          const corners = [
            project3DTo2D(x0, y0, regressionPlane.equation(x0, y0), rotation, projection, center),
            project3DTo2D(x0 + step, y0, regressionPlane.equation(x0 + step, y0), rotation, projection, center),
            project3DTo2D(
              x0 + step,
              y0 + step,
              regressionPlane.equation(x0 + step, y0 + step),
              rotation,
              projection,
              center
            ),
            project3DTo2D(x0, y0 + step, regressionPlane.equation(x0, y0 + step), rotation, projection, center),
          ];

          ctx.beginPath();
          ctx.moveTo(corners[0].x, corners[0].y);
          corners.slice(1).forEach((corner) => ctx.lineTo(corner.x, corner.y));
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    // Draw points (sorted by depth)
    const projectedPoints: Array<{
      point: Point3D;
      projected: { x: number; y: number; z: number };
      series: Scatter3DSeries;
      seriesIndex: number;
      normalized: Point3D;
    }> = [];

    data.forEach((series, seriesIndex) => {
      series.data.forEach((point) => {
        const normalized = normalizePoint(point);
        const projected = project3DTo2D(normalized.x, normalized.y, normalized.z, rotation, projection, center);
        projectedPoints.push({
          point,
          projected,
          series,
          seriesIndex,
          normalized,
        });
      });
    });

    // Sort by Z (depth) - far points first
    projectedPoints.sort((a, b) => b.projected.z - a.projected.z);

    // Draw points
    projectedPoints.forEach(({ point, projected, series, seriesIndex, normalized }) => {
      const color = getPointColor(normalized, series, seriesIndex, colorDimension, colorScale, allPoints);
      const size = point.size || series.pointSize || pointSize;
      const opacity = point.label && selectedPoints.has(point.label) ? 1 : series.opacity ?? 0.8;

      // Draw point
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, size, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      ctx.fill();

      // Highlight hovered/selected points
      if (point.label && (point === hoveredPoint || selectedPoints.has(point.label))) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      // Draw labels
      if (showLabels && point.label) {
        ctx.font = '10px Arial';
        ctx.fillStyle = '#334155';
        ctx.fillText(point.label, projected.x + size + 2, projected.y + 3);
      }
    });
  }, [
    data,
    width,
    height,
    rotation,
    projection,
    bounds,
    maxRange,
    center,
    showAxes,
    showGrid,
    showLabels,
    regressionPlane,
    colorDimension,
    colorScale,
    pointSize,
    allPoints,
    hoveredPoint,
    selectedPoints,
    normalizePoint,
  ]);

  // Animation loop
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      render();
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [render]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!enableRotation) return;

    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging && enableRotation) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;

      setRotation((prev) => ({
        theta: prev.theta + deltaX * 0.01,
        phi: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, prev.phi + deltaY * 0.01)),
      }));

      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else {
      // Check for point hover
      let foundPoint: Point3D | null = null;
      let foundSeries: Scatter3DSeries | null = null;

      for (const series of data) {
        for (const point of series.data) {
          const normalized = normalizePoint(point);
          const projected = project3DTo2D(normalized.x, normalized.y, normalized.z, rotation, projection, center);
          const size = point.size || series.pointSize || pointSize;
          const distance = Math.sqrt(Math.pow(projected.x - mouseX, 2) + Math.pow(projected.y - mouseY, 2));

          if (distance <= size + 2) {
            foundPoint = point;
            foundSeries = series;
            break;
          }
        }

        if (foundPoint) break;
      }

      setHoveredPoint(foundPoint);
      onPointHover?.(foundPoint);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredPoint(null);
    onPointHover?.(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!enableSelection || !hoveredPoint) return;

    const pointId = hoveredPoint.label || JSON.stringify(hoveredPoint);

    setSelectedPoints((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pointId)) {
        newSet.delete(pointId);
      } else {
        newSet.add(pointId);
      }
      onSelectionChange?.(Array.from(newSet).map((id) => allPoints.find((p) => (p.label || JSON.stringify(p)) === id)!));
      return newSet;
    });

    onPointClick?.(hoveredPoint, data.find((s) => s.data.includes(hoveredPoint))!);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!enableZoom) return;

    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

    setProjection((prev) => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, prev.scale * zoomFactor)),
    }));
  };

  const resetView = () => {
    setRotation(initialRotation);
    setProjection({ x: 0, y: 0, scale: 1 });
    setSelectedPoints(new Set());
  };

  return (
    <div className={`scatter-3d-wrapper ${className}`} style={style}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onWheel={handleWheel}
        style={{
          cursor: isDragging ? 'grabbing' : enableRotation ? 'grab' : 'default',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
        }}
        role="img"
        aria-label={`3D scatter plot with ${allPoints.length} points`}
      />

      {/* Controls */}
      <div
        className="scatter-3d-controls"
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <button
          onClick={resetView}
          style={{
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
          }}
        >
          Reset View
        </button>

        {selectedPoints.size > 0 && (
          <button
            onClick={() => {
              setSelectedPoints(new Set());
              onSelectionChange?.([]);
            }}
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
            Clear ({selectedPoints.size})
          </button>
        )}
      </div>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="scatter-3d-tooltip"
          style={{
            position: 'fixed',
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
          {hoveredPoint.label && (
            <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '13px' }}>
              {hoveredPoint.label}
            </div>
          )}
          <div>
            <span style={{ opacity: 0.8 }}>X:</span> {hoveredPoint.x.toFixed(3)}
          </div>
          <div>
            <span style={{ opacity: 0.8 }}>Y:</span> {hoveredPoint.y.toFixed(3)}
          </div>
          <div>
            <span style={{ opacity: 0.8 }}>Z:</span> {hoveredPoint.z.toFixed(3)}
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        className="scatter-3d-legend"
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '11px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
          {data.length} Series ({allPoints.length} points)
        </div>
        {data.map((series, index) => (
          <div key={series.name} style={{ display: 'flex', alignItems: 'center', marginTop: '3px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: getPointColor({ x: 0, y: 0, z: 0 }, series, index, 'series'),
                marginRight: '6px',
              }}
            />
            <span>{series.name}</span>
            <span style={{ marginLeft: 'auto', color: '#64748b' }}>({series.data.length})</span>
          </div>
        ))}
        {enableRotation && (
          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #e2e8f0', color: '#64748b' }}>
            Drag to rotate • Scroll to zoom
          </div>
        )}
      </div>
    </div>
  );
};

export default ScatterPlot3D;
