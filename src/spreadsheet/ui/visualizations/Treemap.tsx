/**
 * Treemap - Hierarchical data visualization component
 *
 * Displays hierarchical data using the squarified treemap algorithm.
 * Features drill-down capability, color coding, and size by value.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

// ============================================================================
// Type Definitions
// ============================================================================

export interface TreemapNode {
  name: string;
  value: number;
  children?: TreemapNode[];
  color?: string;
  category?: string;
  [key: string]: any;
}

export interface TreemapProps {
  data: TreemapNode;
  width?: number;
  height?: number;
  padding?: number;
  paddingOuter?: number;
  paddingInner?: number;
  cornerRadius?: number;
  colorScale?: 'category' | 'value' | 'depth' | 'custom';
  customColors?: Record<string, string>;
  colorRange?: [string, string];
  showLabels?: boolean;
  showValues?: boolean;
  showHierarchy?: boolean;
  enableDrillDown?: boolean;
  enableZoom?: boolean;
  onNodeClick?: (node: d3.HierarchyRectangularNode<TreemapNode>) => void;
  onNodeHover?: (node: d3.HierarchyRectangularNode<TreemapNode> | null) => void;
  labelColor?: string | ((node: d3.HierarchyRectangularNode<TreemapNode>) => string);
  minLabelSize?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface Breadcrumb {
  name: string;
  node: d3.HierarchyRectangularNode<TreemapNode>;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getNodeColor(
  node: d3.HierarchyRectangularNode<TreemapNode>,
  scale: 'category' | 'value' | 'depth' | 'custom',
  customColors?: Record<string, string>,
  colorRange?: [string, string]
): string {
  const data = node.data;

  switch (scale) {
    case 'category':
      if (data.category && customColors?.[data.category]) {
        return customColors[data.category];
      }
      return d3.schemeTableau10[hashCode(data.category || data.name) % 10];

    case 'value':
      if (colorRange) {
        const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, node.parent ? node.parent.value : 1]);
        return colorScale(node.value);
      }
      return d3.interpolateBlues(node.parent ? node.value / node.parent.value : 1);

    case 'depth':
      const depthColor = d3.scaleOrdinal(d3.schemePastel1).domain(d3.range(0, node.depth + 1).map(String));
      return depthColor(String(node.depth));

    case 'custom':
      return data.color || '#3b82f6';

    default:
      return '#3b82f6';
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function shouldShowLabel(
  node: d3.HierarchyRectangularNode<TreemapNode>,
  minSize: number
): boolean {
  const width = node.x1 - node.x0;
  const height = node.y1 - node.y0;
  return width >= minSize && height >= minSize;
}

// ============================================================================
// Main Component
// ============================================================================

export const Treemap: React.FC<TreemapProps> = ({
  data,
  width = 800,
  height = 600,
  padding = 1,
  paddingOuter = 0,
  paddingInner = 2,
  cornerRadius = 4,
  colorScale = 'category',
  customColors,
  colorRange,
  showLabels = true,
  showValues = false,
  showHierarchy = false,
  enableDrillDown = true,
  enableZoom = true,
  onNodeClick,
  onNodeHover,
  labelColor = '#ffffff',
  minLabelSize = 40,
  className = '',
  style = {},
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rootNode, setRootNode] = useState<d3.HierarchyRectangularNode<TreemapNode> | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [hoveredNode, setHoveredNode] = useState<d3.HierarchyRectangularNode<TreemapNode> | null>(null);
  const [selectedNode, setSelectedNode] = useState<d3.HierarchyRectangularNode<TreemapNode> | null>(null);

  // Create hierarchy
  const createHierarchy = useCallback((nodeData: TreemapNode, parent?: d3.HierarchyRectangularNode<TreemapNode>) => {
    const hierarchy = d3
      .hierarchy<TreemapNode>(nodeData)
      .sum((d) => (d.children && d.children.length > 0 ? 0 : d.value))
      .sort((a, b) => b.value! - a.value!);

    return d3
      .treemap<TreemapNode>()
      .tile(d3.treemapSquarify)
      .size([width, height])
      .paddingOuter(paddingOuter)
      .paddingInner(paddingInner)
      .paddingTop(paddingOuter + 20)
      .round(true)(hierarchy);
  }, [width, height, paddingInner, paddingOuter]);

  // Initialize
  useEffect(() => {
    if (!data) return;

    const root = createHierarchy(data);
    setRootNode(root);
    setBreadcrumbs([{ name: data.name, node: root }]);
  }, [data, createHierarchy]);

  // Render treemap
  useEffect(() => {
    if (!svgRef.current || !rootNode) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const currentRoot = selectedNode || rootNode;
    if (!currentRoot) return;

    const g = svg.append('g').attr('class', 'treemap-container');

    // Setup zoom
    if (enableZoom) {
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 3])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });

      svg.call(zoom);
    }

    // Draw cells
    const cells = g
      .selectAll<SVGRectElement, d3.HierarchyRectangularNode<TreemapNode>>('rect')
      .data(currentRoot.descendants())
      .enter()
      .append('g')
      .attr('class', 'cell');

    cells
      .append('rect')
      .attr('x', (d) => d.x0)
      .attr('y', (d) => d.y0)
      .attr('width', (d) => d.x1 - d.x0 - padding)
      .attr('height', (d) => d.y1 - d.y0 - padding)
      .attr('fill', (d) => getNodeColor(d, colorScale, customColors, colorRange))
      .attr('stroke', '#fff')
      .attr('stroke-width', padding)
      .attr('rx', cornerRadius)
      .attr('ry', cornerRadius)
      .style('cursor', d => d.children && d.children.length > 0 && enableDrillDown ? 'pointer' : 'default')
      .style('opacity', 1)
      .on('click', (event, d) => {
        event.stopPropagation();

        // Drill down logic
        if (enableDrillDown && d.children && d.children.length > 0) {
          setSelectedNode(d);
          setBreadcrumbs((prev) => [
            ...prev.slice(0, breadcrumbs.findIndex((b) => b.node === d) + 1 || prev.length),
            { name: d.data.name, node: d },
          ]);
        }

        onNodeClick?.(d);
      })
      .on('mouseover', (event, d) => {
        setHoveredNode(d);
        onNodeHover?.(d);

        d3.select(event.currentTarget)
          .transition()
          .duration(150)
          .attr('fill', (d) => {
            const baseColor = getNodeColor(d, colorScale, customColors, colorRange);
            return d3.color(baseColor)?.brighter(0.3) || baseColor;
          });
      })
      .on('mouseout', (event, d) => {
        setHoveredNode(null);
        onNodeHover?.(null);

        d3.select(event.currentTarget)
          .transition()
          .duration(150)
          .attr('fill', (d) => getNodeColor(d, colorScale, customColors, colorRange));
      });

    // Add labels
    if (showLabels) {
      cells.each(function (d) {
        if (!shouldShowLabel(d, minLabelSize)) return;

        const cell = d3.select(this);
        const nodeWidth = d.x1 - d.x0;
        const nodeHeight = d.y1 - d.y0;

        // Label background
        const labelText = d.data.name;
        const valueText = showValues ? d.value.toLocaleString() : '';

        cell
          .append('text')
          .attr('x', d.x0 + nodeWidth / 2)
          .attr('y', d.y0 + nodeHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .style('font-size', `${Math.min(nodeWidth, nodeHeight) / 8}px`)
          .style('font-weight', '600')
          .style('pointer-events', 'none')
          .attr('fill', typeof labelColor === 'function' ? labelColor(d) : labelColor)
          .text(labelText)
          .clone(true)
          .lower()
          .attr('fill', 'none')
          .attr('stroke', 'rgba(0,0,0,0.3)')
          .attr('stroke-width', 2);

        if (showValues && valueText) {
          cell
            .append('text')
            .attr('x', d.x0 + nodeWidth / 2)
            .attr('y', d.y0 + nodeHeight / 2 + Math.min(nodeWidth, nodeHeight) / 8)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('font-size', `${Math.min(nodeWidth, nodeHeight) / 10}px`)
            .style('font-weight', '400')
            .style('pointer-events', 'none')
            .attr('fill', typeof labelColor === 'function' ? labelColor(d) : labelColor)
            .attr('opacity', 0.8)
            .text(valueText);
        }
      });
    }

    // Show hierarchy lines if enabled
    if (showHierarchy && currentRoot.depth > 0) {
      g.append('g')
        .attr('class', 'hierarchy-lines')
        .selectAll('line')
        .data(currentRoot.descendants().filter((d) => d.depth > 0))
        .enter()
        .append('line')
        .attr('x1', (d) => d.x0)
        .attr('y1', (d) => d.y0)
        .attr('x2', (d) => d.x1)
        .attr('y2', (d) => d.y1)
        .attr('stroke', '#000')
        .attr('stroke-width', 2)
        .attr('opacity', 0.1);
    }
  }, [
    rootNode,
    selectedNode,
    padding,
    cornerRadius,
    colorScale,
    customColors,
    colorRange,
    showLabels,
    showValues,
    showHierarchy,
    enableDrillDown,
    enableZoom,
    minLabelSize,
    labelColor,
    onNodeClick,
    onNodeHover,
    breadcrumbs,
    width,
    height,
  ]);

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = useCallback((index: number) => {
    const target = breadcrumbs[index];
    setSelectedNode(target.node);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  }, [breadcrumbs]);

  // Handle back to root
  const handleBackToRoot = useCallback(() => {
    setSelectedNode(null);
    setBreadcrumbs([{ name: data.name, node: rootNode! }]);
  }, [data.name, rootNode]);

  return (
    <div className={`treemap-wrapper ${className}`} style={style}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label={`Treemap showing ${data.name} hierarchy`}
      >
        <desc>
          Treemap visualization of {data.name} with {rootNode?.descendants().length || 0} nodes
        </desc>
      </svg>

      {/* Breadcrumbs */}
      {enableDrillDown && breadcrumbs.length > 1 && (
        <div
          className="treemap-breadcrumbs"
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            display: 'flex',
            gap: '4px',
            flexWrap: 'wrap',
            maxWidth: width - 20,
          }}
        >
          <button
            onClick={handleBackToRoot}
            style={{
              padding: '6px 10px',
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '500',
            }}
          >
            🏠 Root
          </button>

          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <span style={{ color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                ›
              </span>
              <button
                onClick={() => handleBreadcrumbClick(index)}
                style={{
                  padding: '6px 10px',
                  background: index === breadcrumbs.length - 1 ? '#3b82f6' : 'rgba(255, 255, 255, 0.9)',
                  color: index === breadcrumbs.length - 1 ? '#fff' : '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '500',
                }}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="treemap-tooltip"
          style={{
            position: 'fixed',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '150px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
            {hoveredNode.data.name}
          </div>

          {hoveredNode.data.category && (
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#64748b' }}>Category: </span>
              <span>{hoveredNode.data.category}</span>
            </div>
          )}

          <div style={{ marginBottom: '4px' }}>
            <span style={{ color: '#64748b' }}>Value: </span>
            <span style={{ fontWeight: '600' }}>{hoveredNode.value.toLocaleString()}</span>
          </div>

          <div style={{ marginBottom: '4px' }}>
            <span style={{ color: '#64748b' }}>Share: </span>
            <span style={{ fontWeight: '600' }}>
              {((hoveredNode.value / (hoveredNode.parent?.value || 1)) * 100).toFixed(1)}%
            </span>
          </div>

          {hoveredNode.children && hoveredNode.children.length > 0 && (
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b' }}>
                {hoveredNode.children.length} child node{hoveredNode.children.length > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '11px', marginTop: '2px' }}>
                Click to drill down
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {colorScale === 'category' && customColors && (
        <div
          className="treemap-legend"
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '11px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Categories</div>
          {Object.entries(customColors).slice(0, 8).map(([category, color]) => (
            <div key={category} style={{ display: 'flex', alignItems: 'center', marginTop: '3px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  background: color,
                  marginRight: '6px',
                }}
              />
              <span>{category}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {rootNode && (
        <div
          className="treemap-stats"
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
          <div>
            <strong>{rootNode.descendants().length}</strong> nodes
          </div>
          <div>
            <strong>{rootNode.leaves().length}</strong> leaves
          </div>
          <div>
            <strong>{rootNode.height}</strong> levels
          </div>
        </div>
      )}
    </div>
  );
};

export default Treemap;
