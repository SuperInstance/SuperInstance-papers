/**
 * NetworkGraph - Force-directed graph visualization component
 *
 * Displays network/graph data with interactive dragging, zoom, and pan.
 * Supports clustering algorithms and custom styling.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

// ============================================================================
// Type Definitions
// ============================================================================

export interface NetworkNode {
  id: string;
  label?: string;
  value?: number;
  group?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  [key: string]: any;
}

export interface NetworkLink {
  id: string;
  source: string | NetworkNode;
  target: string | NetworkNode;
  value?: number;
  label?: string;
  [key: string]: any;
}

export interface NetworkGraphProps {
  data: {
    nodes: NetworkNode[];
    links: NetworkLink[];
  };
  width?: number;
  height?: number;
  nodeRadius?: number | ((node: NetworkNode) => number);
  linkWidth?: number | ((link: NetworkLink) => number);
  nodeColor?: string | ((node: NetworkNode) => string);
  linkColor?: string | ((link: NetworkLink) => string);
  onNodeClick?: (node: NetworkNode) => void;
  onLinkClick?: (link: NetworkLink) => void;
  onNodeHover?: (node: NetworkNode | null) => void;
  showLabels?: boolean;
  enableZoom?: boolean;
  enableDrag?: boolean;
  clusteringEnabled?: boolean;
  clusterCount?: number;
  chargeStrength?: number;
  linkDistance?: number | ((link: NetworkLink) => number);
  className?: string;
  style?: React.CSSProperties;
}

interface SimulationState {
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  simulation: d3.Simulation<NetworkNode, NetworkLink> | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultNodeColor(node: NetworkNode): string {
  const group = node.group || 'default';
  const colorMap: Record<string, string> = {
    default: '#3b82f6',
    primary: '#8b5cf6',
    secondary: '#ec4899',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  };
  return colorMap[group] || d3.schemeCategory10[hashCode(group) % 10];
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

function calculateCluster(nodes: NetworkNode[], linkDistance: number): NetworkNode[][] {
  // Group nodes by proximity
  const clusters: NetworkNode[][] = [];
  const visited = new Set<string>();

  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const cluster: NetworkNode[] = [node];
    visited.add(node.id);

    // Find nearby nodes
    for (const other of nodes) {
      if (visited.has(other.id)) continue;

      const dx = (node.x || 0) - (other.x || 0);
      const dy = (node.y || 0) - (other.y || 0);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < linkDistance * 2) {
        cluster.push(other);
        visited.add(other.id);
      }
    }

    if (cluster.length > 0) {
      clusters.push(cluster);
    }
  }

  return clusters;
}

// ============================================================================
// Main Component
// ============================================================================

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  data,
  width = 800,
  height = 600,
  nodeRadius = 8,
  linkWidth = 2,
  nodeColor = getDefaultNodeColor,
  linkColor = '#94a3b8',
  onNodeClick,
  onLinkClick,
  onNodeHover,
  showLabels = true,
  enableZoom = true,
  enableDrag = true,
  clusteringEnabled = false,
  clusterCount = 3,
  chargeStrength = -300,
  linkDistance = 100,
  className = '',
  style = {},
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkLink> | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);

  // Resolve styling functions
  const getNodeRadius = useCallback(
    (node: NetworkNode): number => {
      return typeof nodeRadius === 'function' ? nodeRadius(node) : nodeRadius;
    },
    [nodeRadius]
  );

  const getLinkWidth = useCallback(
    (link: NetworkLink): number => {
      return typeof linkWidth === 'function' ? linkWidth(link) : linkWidth;
    },
    [linkWidth]
  );

  const getNodeColor = useCallback(
    (node: NetworkNode): string => {
      return typeof nodeColor === 'function' ? nodeColor(node) : nodeColor;
    },
    [nodeColor]
  );

  const getLinkColorValue = useCallback(
    (link: NetworkLink): string => {
      return typeof linkColor === 'function' ? linkColor(link) : linkColor;
    },
    [linkColor]
  );

  // Initialize simulation
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    // Clear previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create main group for zoom/pan
    const g = svg.append('g').attr('class', 'network-graph-container');

    // Setup zoom behavior
    let zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
    if (enableZoom) {
      zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });

      svg.call(zoom);
    }

    // Create force simulation
    const simulation = d3
      .forceSimulation<NetworkNode>(data.nodes)
      .force(
        'link',
        d3
          .forceLink<NetworkNode, NetworkLink>(data.links)
          .id((d) => d.id)
          .distance(linkDistance)
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d) => getNodeRadius(d) + 2));

    simulationRef.current = simulation;

    // Create links
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll<SVGLineElement, NetworkLink>('line')
      .data(data.links)
      .enter()
      .append('line')
      .attr('stroke', (d) => getLinkColorValue(d))
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => getLinkWidth(d))
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onLinkClick?.(d);
      });

    // Create nodes
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGCircleElement, NetworkNode>('circle')
      .data(data.nodes)
      .enter()
      .append('circle')
      .attr('r', (d) => getNodeRadius(d))
      .attr('fill', (d) => getNodeColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', enableDrag ? 'grab' : 'pointer')
      .call(
        d3
          .drag<SVGCircleElement, NetworkNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended) as any
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        onNodeClick?.(d);
      })
      .on('mouseover', (event, d) => {
        setHoveredNode(d);
        onNodeHover?.(d);
        d3.select(event.currentTarget).attr('stroke', '#ffd700').attr('stroke-width', 3);
      })
      .on('mouseout', (event) => {
        setHoveredNode(null);
        onNodeHover?.(null);
        d3.select(event.currentTarget).attr('stroke', '#fff').attr('stroke-width', 2);
      });

    // Add labels
    if (showLabels) {
      const labels = g
        .append('g')
        .attr('class', 'labels')
        .selectAll<SVGTextElement, NetworkNode>('text')
        .data(data.nodes)
        .enter()
        .append('text')
        .text((d) => d.label || d.id)
        .attr('font-size', 12)
        .attr('font-family', 'Arial, sans-serif')
        .attr('text-anchor', 'middle')
        .attr('dy', (d) => getNodeRadius(d) + 15)
        .attr('fill', '#334155')
        .style('pointer-events', 'none');

      // Update labels on tick
      simulation.on('tick', () => {
        link
          .attr('x1', (d) => (d.source as NetworkNode).x!)
          .attr('y1', (d) => (d.source as NetworkNode).y!)
          .attr('x2', (d) => (d.target as NetworkNode).x!)
          .attr('y2', (d) => (d.target as NetworkNode).y!);

        node.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!);

        labels.attr('x', (d) => d.x!).attr('y', (d) => d.y!);
      });
    } else {
      simulation.on('tick', () => {
        link
          .attr('x1', (d) => (d.source as NetworkNode).x!)
          .attr('y1', (d) => (d.source as NetworkNode).y!)
          .attr('x2', (d) => (d.target as NetworkNode).x!)
          .attr('y2', (d) => (d.target as NetworkNode).y!);

        node.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!);
      });
    }

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, NetworkNode, NetworkNode>, d: NetworkNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      d3.select(event.currentTarget).style('cursor', 'grabbing');
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, NetworkNode, NetworkNode>, d: NetworkNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, NetworkNode, NetworkNode>, d: NetworkNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
      d3.select(event.currentTarget).style('cursor', 'grab');
    }

    // Cleanup
    return () => {
      simulation.stop();
      simulationRef.current = null;
    };
  }, [
    data,
    width,
    height,
    enableZoom,
    enableDrag,
    linkDistance,
    chargeStrength,
    getNodeRadius,
    getLinkWidth,
    getNodeColor,
    getLinkColorValue,
    showLabels,
    onNodeClick,
    onLinkClick,
    onNodeHover,
  ]);

  // Handle clustering
  useEffect(() => {
    if (!clusteringEnabled || !simulationRef.current) return;

    const distance = typeof linkDistance === 'number' ? linkDistance : 100;
    const clusters = calculateCluster(data.nodes, distance);

    // Apply cluster forces
    clusters.forEach((cluster, i) => {
      if (cluster.length < 2) return;

      const centerX = (width / clusters.length) * (i + 0.5);
      const centerY = height / 2;

      cluster.forEach((node) => {
        node.fx = node.fx || node.x;
        node.fy = node.fy || node.y;
      });

      simulationRef.current!.force(
        `cluster-${i}`,
        d3.forceX(centerX).strength(0.1)
      );
    });

    simulationRef.current.alpha(1).restart();
  }, [clusteringEnabled, clusterCount, data, width, height, linkDistance]);

  // Reset selection on background click
  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className={`network-graph-wrapper ${className}`} style={style}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onClick={handleBackgroundClick}
        role="img"
        aria-label="Network graph visualization"
      >
        <desc>
          Network graph with {data.nodes.length} nodes and {data.links.length} links
        </desc>
      </svg>

      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="network-graph-tooltip"
          style={{
            position: 'absolute',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <div>
            <strong>{hoveredNode.label || hoveredNode.id}</strong>
          </div>
          {hoveredNode.group && (
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Group: {hoveredNode.group}</div>
          )}
          {hoveredNode.value !== undefined && (
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Value: {hoveredNode.value}</div>
          )}
        </div>
      )}

      {/* Legend */}
      <div
        className="network-graph-legend"
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Groups</div>
        {Array.from(new Set(data.nodes.map((n) => n.group || 'default'))).map((group) => (
          <div key={group} style={{ display: 'flex', alignItems: 'center', marginTop: '3px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: getNodeColor({ group } as NetworkNode),
                marginRight: '5px',
              }}
            />
            <span>{group}</span>
          </div>
        ))}
      </div>

      {/* Info panel */}
      {selectedNode && (
        <div
          className="network-graph-info"
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            minWidth: '150px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            {selectedNode.label || selectedNode.id}
          </div>
          {selectedNode.group && (
            <div style={{ marginBottom: '4px' }}>
              <span style={{ opacity: 0.7 }}>Group: </span>
              <span>{selectedNode.group}</span>
            </div>
          )}
          {selectedNode.value !== undefined && (
            <div style={{ marginBottom: '4px' }}>
              <span style={{ opacity: 0.7 }}>Value: </span>
              <span>{selectedNode.value}</span>
            </div>
          )}
          {selectedNode.x !== undefined && selectedNode.y !== undefined && (
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ opacity: 0.7 }}>Position:</div>
              <div>X: {selectedNode.x.toFixed(2)}</div>
              <div>Y: {selectedNode.y.toFixed(2)}</div>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div
        className="network-graph-controls"
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          gap: '5px',
        }}
      >
        {enableZoom && (
          <>
            <button
              onClick={() => {
                const svg = d3.select(svgRef.current);
                const zoom = svg.property('__zoom') as d3.ZoomTransform | undefined;
                if (svgRef.current && zoom) {
                  svg.transition().call(
                    d3.zoom<SVGSVGElement, unknown>().transform,
                    d3.zoomIdentity.translate(0, 0).scale(1)
                  );
                }
              }}
              style={{
                padding: '5px 10px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
              aria-label="Reset zoom"
            >
              Reset Zoom
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default NetworkGraph;
