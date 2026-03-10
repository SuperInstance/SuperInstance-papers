/**
 * SankeyDiagram - Flow visualization component
 *
 * Displays flow and transformations between nodes.
 * Features interactive filtering, gradient link coloring, and smooth animations.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SankeyNode {
  name: string;
  value?: number;
  group?: string;
  color?: string;
  [key: string]: any;
}

export interface SankeyLink {
  source: string | number;
  target: string | number;
  value: number;
  color?: string;
  opacity?: number;
  [key: string]: any;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface SankeyDiagramProps {
  data: SankeyData;
  width?: number;
  height?: number;
  nodeWidth?: number;
  nodePadding?: number;
  nodeColor?: string | ((node: SankeyNode) => string);
  linkColor?: 'source' | 'target' | 'gradient' | 'custom' | ((link: any) => string);
  linkOpacity?: number;
  showLabels?: boolean;
  showValues?: boolean;
  enableZoom?: boolean;
  onNodeClick?: (node: SankeyNode) => void;
  onLinkClick?: (link: SankeyLink) => void;
  onNodeHover?: (node: SankeyNode | null) => void;
  sortByValue?: boolean;
  curvature?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface InternalNode extends d3.SankeyNode<d3.SankeyExtraNode>, SankeyNode {
  id: string;
}

interface InternalLink extends d3.SankeyLink<d3.SankeyExtraNode, {}> {
  id: string;
  source: InternalNode;
  target: InternalNode;
  originalData: SankeyLink;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultNodeColor(node: SankeyNode, index: number): string {
  if (node.color) return node.color;

  const group = node.group || `group-${index}`;
  const colorMap: Record<string, string> = {
    source: '#3b82f6',
    intermediate: '#8b5cf6',
    target: '#10b981',
    default: d3.schemeCategory10[index % 10],
  };

  return colorMap[group as string] || d3.schemeCategory10[index % 10];
}

function getLinkColor(
  link: InternalLink,
  mode: 'source' | 'target' | 'gradient' | 'custom' | ((link: any) => string)
): string {
  if (typeof mode === 'function') {
    return mode(link.originalData);
  }

  switch (mode) {
    case 'source':
      return link.source.color || '#3b82f6';
    case 'target':
      return link.target.color || '#10b981';
    case 'gradient':
      return `url(#gradient-${link.id})`;
    case 'custom':
      return link.originalData.color || '#94a3b8';
    default:
      return '#94a3b8';
  }
}

// ============================================================================
// Main Component
// ============================================================================

export const SankeyDiagram: React.FC<SankeyDiagramProps> = ({
  data,
  width = 800,
  height = 600,
  nodeWidth = 15,
  nodePadding = 10,
  nodeColor = getDefaultNodeColor,
  linkColor = 'gradient',
  linkOpacity = 0.3,
  showLabels = true,
  showValues = false,
  enableZoom = true,
  onNodeClick,
  onLinkClick,
  onNodeHover,
  sortByValue = true,
  curvature = 0.5,
  className = '',
  style = {},
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<InternalNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<InternalLink | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length || !data.links.length) return;

    // Clear previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create main group
    const g = svg.append('g').attr('class', 'sankey-container');

    // Setup zoom
    if (enableZoom) {
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 2])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });

      svg.call(zoom);
    }

    // Create sankey generator
    const sankey = d3
      .sankey<InternalNode, InternalLink>()
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
      .extent([
        [50, 50],
        [width - 50, height - 50],
      ]);

    // Prepare nodes with IDs
    const nodes: InternalNode[] = data.nodes.map((node, i) => ({
      ...node,
      id: node.name || `node-${i}`,
      color: typeof nodeColor === 'function' ? nodeColor(node, i) : nodeColor,
    }));

    // Prepare links with node references
    const nodeMap = new Map(nodes.map((n) => [n.name, n]));
    const links: InternalLink[] = data.links
      .map((link, i) => {
        const sourceNode =
          typeof link.source === 'string' ? nodeMap.get(link.source) : nodes[link.source as number];
        const targetNode =
          typeof link.target === 'string' ? nodeMap.get(link.target) : nodes[link.target as number];

        if (!sourceNode || !targetNode) return null;

        return {
          ...link,
          id: `link-${i}`,
          source: sourceNode,
          target: targetNode,
          originalData: link,
        };
      })
      .filter((l): l is InternalLink => l !== null);

    // Sort nodes by value if requested
    if (sortByValue) {
      nodes.sort((a, b) => (b.value || 0) - (a.value || 0));
    }

    // Generate sankey layout
    const { nodes: layoutNodes, links: layoutLinks } = sankey({
      nodes: nodes as any,
      links: links as any,
    });

    // Create gradients for links
    const defs = g.append('defs');
    layoutLinks.forEach((link) => {
      const gradient = defs
        .append('linearGradient')
        .attr('id', `gradient-${link.id}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', link.source.x1!)
        .attr('x2', link.target.x0!);

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', link.source.color || '#3b82f6');

      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', link.target.color || '#10b981');
    });

    // Draw links
    const linkGroup = g.append('g').attr('class', 'links').attr('fill', 'none').attr('stroke-opacity', linkOpacity);

    linkGroup
      .selectAll('path')
      .data(layoutLinks)
      .enter()
      .append('path')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('stroke', (d) => getLinkColor(d, linkColor))
      .attr('stroke-width', (d) => Math.max(1, d.width!))
      .style('cursor', 'pointer')
      .style('mix-blend-mode', 'multiply')
      .on('click', (event, d) => {
        event.stopPropagation();
        onLinkClick?.(d.originalData);
      })
      .on('mouseover', (event, d) => {
        setHoveredLink(d);
        d3.select(event.currentTarget).attr('stroke-opacity', 0.7);
      })
      .on('mouseout', (event) => {
        setHoveredLink(null);
        d3.select(event.currentTarget).attr('stroke-opacity', linkOpacity);
      });

    // Draw nodes
    const nodeGroup = g.append('g').attr('class', 'nodes').attr('font-family', 'Arial, sans-serif').attr('font-size', 12);

    const nodesSelection = nodeGroup
      .selectAll<SVGGElement, InternalNode>('g')
      .data(layoutNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick?.(d);
      })
      .on('mouseover', (event, d) => {
        setHoveredNode(d);
        onNodeHover?.(d);
      })
      .on('mouseout', () => {
        setHoveredNode(null);
        onNodeHover?.(null);
      });

    nodesSelection
      .append('rect')
      .attr('x', (d) => d.x0!)
      .attr('y', (d) => d.y0!)
      .attr('height', (d) => d.y1! - d.y0!)
      .attr('width', (d) => d.x1! - d.x0!)
      .attr('fill', (d) => d.color || '#3b82f6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', 1);

    // Add labels
    if (showLabels) {
      nodesSelection
        .append('text')
        .attr('x', (d) => (d.x0! < width / 2 ? d.x1! + 6 : d.x0! - 6))
        .attr('y', (d) => (d.y1! + d.y0!) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', (d) => (d.x0! < width / 2 ? 'start' : 'end'))
        .text((d) => d.name)
        .attr('fill', '#334155')
        .style('font-weight', '500')
        .clone(true)
        .lower()
        .attr('fill', 'none')
        .attr('stroke', '#fff')
        .attr('stroke-width', 3);
    }

    // Add values
    if (showValues) {
      nodesSelection
        .append('text')
        .attr('x', (d) => (d.x0! < width / 2 ? d.x1! + 6 : d.x0! - 6))
        .attr('y', (d) => (d.y1! + d.y0!) / 2)
        .attr('dy', '1.5em')
        .attr('text-anchor', (d) => (d.x0! < width / 2 ? 'start' : 'end'))
        .text((d) => d.value?.toFixed(1) || '0')
        .attr('fill', '#64748b')
        .style('font-size', '10px')
        .clone(true)
        .lower()
        .attr('fill', 'none')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);
    }

    // Add link labels on hover
    const linkLabels = g.append('g').attr('class', 'link-labels').attr('font-size', '10px').attr('fill', '#fff');

    linkGroup
      .selectAll<SVGTextElement, InternalLink>('text')
      .data(layoutLinks)
      .enter()
      .append('text')
      .attr('class', 'link-label')
      .text((d) => d.value.toFixed(1))
      .attr('x', (d) => (d.source.x1! + d.target.x0!) / 2)
      .attr('y', (d) => (d.y0! + d.y1!) / 2)
      .attr('text-anchor', 'middle')
      .attr('opacity', 0)
      .style('pointer-events', 'none');

    // Show link labels on link hover
    linkGroup.selectAll('path').on('mouseenter', function (event, d) {
      d3.select(this.parentElement)
        .select('.link-label')
        .transition()
        .duration(200)
        .attr('opacity', 1);
    });

    linkGroup.selectAll('path').on('mouseleave', function () {
      d3.select(this.parentElement)
        .select('.link-label')
        .transition()
        .duration(200)
        .attr('opacity', 0);
    });
  }, [
    data,
    width,
    height,
    nodeWidth,
    nodePadding,
    nodeColor,
    linkColor,
    linkOpacity,
    showLabels,
    showValues,
    enableZoom,
    sortByValue,
    onNodeClick,
    onLinkClick,
    onNodeHover,
  ]);

  return (
    <div className={`sankey-diagram-wrapper ${className}`} style={style}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label={`Sankey diagram showing flow between ${data.nodes.length} nodes`}
      >
        <desc>
          Flow diagram with {data.nodes.length} nodes and {data.links.length} links
        </desc>
      </svg>

      {/* Node Tooltip */}
      {hoveredNode && (
        <div
          className="sankey-tooltip"
          style={{
            position: 'fixed',
            left: '50%',
            top: '10px',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '12px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '200px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '15px' }}>{hoveredNode.name}</div>
          {hoveredNode.group && (
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#64748b' }}>Group: </span>
              <span>{hoveredNode.group}</span>
            </div>
          )}
          <div>
            <span style={{ color: '#64748b' }}>Value: </span>
            <span style={{ fontWeight: '600' }}>{(hoveredNode.value || 0).toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Link Tooltip */}
      {hoveredLink && (
        <div
          className="sankey-link-tooltip"
          style={{
            position: 'fixed',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          <div style={{ fontWeight: '600' }}>
            {hoveredLink.source.name} → {hoveredLink.target.name}
          </div>
          <div style={{ marginTop: '4px' }}>
            <span style={{ color: '#64748b' }}>Flow: </span>
            <span style={{ fontWeight: 'bold' }}>{hoveredLink.value.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        className="sankey-legend"
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
        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Nodes ({data.nodes.length})</div>
        {Array.from(new Set(data.nodes.map((n) => n.group || 'default'))).slice(0, 5).map((group) => {
          const groupNodes = data.nodes.filter((n) => (n.group || 'default') === group);
          const sampleNode = groupNodes[0];
          const color = typeof nodeColor === 'function' ? nodeColor(sampleNode, 0) : nodeColor;

          return (
            <div key={group} style={{ display: 'flex', alignItems: 'center', marginTop: '3px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  background: color,
                  marginRight: '6px',
                }}
              />
              <span>{group}</span>
              <span style={{ marginLeft: 'auto', color: '#64748b' }}>({groupNodes.length})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SankeyDiagram;
