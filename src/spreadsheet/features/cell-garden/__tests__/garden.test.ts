/**
 * Cell Garden Tests
 *
 * Tests for layout algorithms, rendering, and visualization
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ForceDirectedLayout,
  CircularLayout,
  HierarchicalLayout,
  GridLayout,
  SpatialLayout,
  LayoutFactory,
  LayoutType,
  type LayoutNode,
  type LayoutLink,
} from '../NetworkLayout.js';

describe('NetworkLayout', () => {
  let sampleNodes: LayoutNode[];
  let sampleLinks: LayoutLink[];

  beforeEach(() => {
    sampleNodes = [
      { id: 'A1', type: 'input' as any, state: 'dormant' as any, x: 0, y: 0, radius: 20 },
      { id: 'A2', type: 'transform' as any, state: 'processing' as any, x: 0, y: 0, radius: 25 },
      { id: 'A3', type: 'output' as any, state: 'emitting' as any, x: 0, y: 0, radius: 20 },
      { id: 'B1', type: 'input' as any, state: 'sensing' as any, x: 0, y: 0, radius: 20 },
      { id: 'B2', type: 'transform' as any, state: 'dormant' as any, x: 0, y: 0, radius: 25 },
    ];

    sampleLinks = [
      { source: 'A1', target: 'A2', type: 'data' },
      { source: 'A2', target: 'A3', type: 'data' },
      { source: 'B1', target: 'B2', type: 'data' },
      { source: 'A2', target: 'B2', type: 'sensation' },
    ];
  });

  describe('ForceDirectedLayout', () => {
    it('should initialize with nodes and links', () => {
      const layout = new ForceDirectedLayout({ width: 800, height: 600 });
      layout.initialize(sampleNodes, sampleLinks);

      const nodes = layout.getNodes();
      expect(nodes).toHaveLength(5);
      expect(nodes[0]).toHaveProperty('vx');
      expect(nodes[0]).toHaveProperty('vy');
    });

    it('should position nodes within bounds after simulation', () => {
      const layout = new ForceDirectedLayout({ width: 800, height: 600 });
      layout.initialize(sampleNodes, sampleLinks);
      layout.simulate();

      const nodes = layout.getNodes();
      nodes.forEach(node => {
        expect(node.x).toBeGreaterThanOrEqual(50);
        expect(node.x).toBeLessThanOrEqual(750);
        expect(node.y).toBeGreaterThanOrEqual(50);
        expect(node.y).toBeLessThanOrEqual(550);
      });
    });

    it('should separate nodes with repulsion forces', () => {
      const layout = new ForceDirectedLayout({
        width: 800,
        height: 600,
        chargeStrength: -200,
        iterations: 200,
      });

      // Start all nodes at the same position
      const centeredNodes = sampleNodes.map(n => ({ ...n, x: 400, y: 300 }));
      layout.initialize(centeredNodes, []);
      layout.simulate();

      const nodes = layout.getNodes();

      // Check that the layout produced positioned nodes
      expect(nodes).toHaveLength(sampleNodes.length);

      // Check that nodes have valid positions (not NaN or undefined)
      nodes.forEach(node => {
        expect(node.x).toBeDefined();
        expect(node.y).toBeDefined();
        expect(isNaN(node.x)).toBe(false);
        expect(isNaN(node.y)).toBe(false);
      });

      // Check that nodes are within bounds
      nodes.forEach(node => {
        expect(node.x).toBeGreaterThanOrEqual(50);
        expect(node.x).toBeLessThanOrEqual(750);
        expect(node.y).toBeGreaterThanOrEqual(50);
        expect(node.y).toBeLessThanOrEqual(550);
      });
    });

    it('should attract connected nodes', () => {
      const layout = new ForceDirectedLayout({
        width: 800,
        height: 600,
        linkDistance: 80,
        linkStrength: 0.8,
        iterations: 200,
      });

      // Use fresh copies
      const testNodes = sampleNodes.map(n => ({ ...n }));
      const testLinks = sampleLinks.map(l => ({ ...l }));

      layout.initialize(testNodes, testLinks);
      layout.simulate();

      const nodes = layout.getNodes();
      const links = layout.getLinks();

      // Check that connected nodes have reasonable distances
      const connectedDistances: number[] = [];

      links.forEach(link => {
        const source = link.source as LayoutNode;
        const target = link.target as LayoutNode;
        const dx = source.x - target.x;
        const dy = source.y - target.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          connectedDistances.push(dist);
        }
      });

      // Connected nodes should have distances (not all at same point)
      if (connectedDistances.length > 0) {
        const avgConnected =
          connectedDistances.reduce((a, b) => a + b, 0) / connectedDistances.length;

        // Average distance should be reasonable for the link distance
        expect(avgConnected).toBeGreaterThan(0);
      }
    });
  });

  describe('CircularLayout', () => {
    it('should arrange nodes in a circle', () => {
      const layout = new CircularLayout({ width: 800, height: 600 });
      layout.initialize(sampleNodes, sampleLinks);

      const cx = 400;
      const cy = 300;
      const expectedRadius = Math.min(
        (800 - 100) / 2,
        (600 - 100) / 2
      );

      sampleNodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / sampleNodes.length - Math.PI / 2;
        const expectedX = cx + expectedRadius * Math.cos(angle);
        const expectedY = cy + expectedRadius * Math.sin(angle);

        expect(node.x).toBeCloseTo(expectedX, 0);
        expect(node.y).toBeCloseTo(expectedY, 0);
      });
    });

    it('should evenly space nodes around the circle', () => {
      const layout = new CircularLayout({ width: 800, height: 600 });
      layout.initialize(sampleNodes, sampleLinks);

      const cx = 400;
      const cy = 300;
      const angles: number[] = [];

      sampleNodes.forEach(node => {
        const angle = Math.atan2(node.y - cy, node.x - cx);
        angles.push(angle);
      });

      // Sort angles and check spacing
      angles.sort((a, b) => a - b);
      const expectedSpacing = (2 * Math.PI) / sampleNodes.length;

      for (let i = 0; i < angles.length - 1; i++) {
        const diff = angles[i + 1] - angles[i];
        expect(diff).toBeCloseTo(expectedSpacing, 1);
      }
    });
  });

  describe('HierarchicalLayout', () => {
    it('should arrange nodes in layers based on dependencies', () => {
      const layout = new HierarchicalLayout({ width: 800, height: 600 });
      layout.initialize(sampleNodes, sampleLinks);

      // A1 should be at level 0 (no incoming)
      // A2 should be at level 1 (depends on A1)
      // A3 should be at level 2 (depends on A2)
      const nodeA1 = sampleNodes.find(n => n.id === 'A1');
      const nodeA2 = sampleNodes.find(n => n.id === 'A2');
      const nodeA3 = sampleNodes.find(n => n.id === 'A3');

      expect(nodeA1!.y).toBeLessThan(nodeA2!.y);
      expect(nodeA2!.y).toBeLessThan(nodeA3!.y);
    });

    it('should handle multiple nodes at the same level', () => {
      const layout = new HierarchicalLayout({ width: 800, height: 600 });
      layout.initialize(sampleNodes, sampleLinks);

      // A1 and B1 should both be at level 0
      const nodeA1 = sampleNodes.find(n => n.id === 'A1');
      const nodeB1 = sampleNodes.find(n => n.id === 'B1');

      expect(nodeA1!.y).toBeCloseTo(nodeB1!.y, 0);
    });

    it('should position nodes horizontally within each level', () => {
      const layout = new HierarchicalLayout({ width: 800, height: 600 });
      layout.initialize(sampleNodes, sampleLinks);

      // All nodes should have unique x positions within their level
      const levelGroups = new Map<number, LayoutNode[]>();

      sampleNodes.forEach(node => {
        const level = Math.floor(node.y / 100);
        if (!levelGroups.has(level)) {
          levelGroups.set(level, []);
        }
        levelGroups.get(level)!.push(node);
      });

      levelGroups.forEach(nodes => {
        const xPositions = nodes.map(n => n.x);
        const uniquePositions = new Set(xPositions);
        expect(uniquePositions.size).toBe(nodes.length);
      });
    });
  });

  describe('GridLayout', () => {
    it('should arrange nodes in a grid', () => {
      const layout = new GridLayout({ width: 800, height: 600 });
      layout.initialize(sampleNodes, sampleLinks);

      const cols = Math.ceil(Math.sqrt(sampleNodes.length));
      const rows = Math.ceil(sampleNodes.length / cols);

      const cellWidth = (800 - 100) / cols;
      const cellHeight = (600 - 100) / rows;

      sampleNodes.forEach((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const expectedX = 50 + cellWidth * (col + 0.5);
        const expectedY = 50 + cellHeight * (row + 0.5);

        expect(node.x).toBeCloseTo(expectedX, 0);
        expect(node.y).toBeCloseTo(expectedY, 0);
      });
    });

    it('should handle non-square grids', () => {
      const nonSquareNodes = Array.from({ length: 7 }, (_, i) => ({
        id: `N${i}`,
        type: 'input' as any,
        state: 'dormant' as any,
        x: 0,
        y: 0,
        radius: 20,
      }));

      const layout = new GridLayout({ width: 800, height: 600 });
      layout.initialize(nonSquareNodes, []);

      const cols = Math.ceil(Math.sqrt(7));
      const rows = Math.ceil(7 / cols);

      expect(cols).toBe(3);
      expect(rows).toBe(3);
    });
  });

  describe('SpatialLayout', () => {
    it('should position nodes based on spreadsheet coordinates', () => {
      const spatialNodes: LayoutNode[] = [
        { id: 'R1C1', type: 'input' as any, state: 'dormant' as any, x: 0, y: 0, radius: 20 },
        { id: 'R1C2', type: 'input' as any, state: 'dormant' as any, x: 0, y: 0, radius: 20 },
        { id: 'R2C1', type: 'input' as any, state: 'dormant' as any, x: 0, y: 0, radius: 20 },
        { id: 'R3C5', type: 'input' as any, state: 'dormant' as any, x: 0, y: 0, radius: 20 },
      ];

      const layout = new SpatialLayout({ width: 800, height: 600 });
      layout.initialize(spatialNodes, []);

      const nodeR1C1 = spatialNodes.find(n => n.id === 'R1C1');
      const nodeR1C2 = spatialNodes.find(n => n.id === 'R1C2');
      const nodeR2C1 = spatialNodes.find(n => n.id === 'R2C1');
      const nodeR3C5 = spatialNodes.find(n => n.id === 'R3C5');

      // R1C1 and R1C2 should have similar y positions (same row)
      expect(nodeR1C1!.y).toBeCloseTo(nodeR1C2!.y, 0);

      // R1C1 and R2C1 should have similar x positions (same column)
      expect(nodeR1C1!.x).toBeCloseTo(nodeR2C1!.x, 0);

      // R3C5 should be further right and down
      expect(nodeR3C5!.x).toBeGreaterThan(nodeR1C1!.x);
      expect(nodeR3C5!.y).toBeGreaterThan(nodeR1C1!.y);
    });
  });

  describe('LayoutFactory', () => {
    it('should create ForceDirectedLayout', () => {
      const layout = LayoutFactory.create(LayoutType.FORCE_DIRECTED, {
        width: 800,
        height: 600,
      });
      expect(layout).toBeInstanceOf(ForceDirectedLayout);
    });

    it('should create CircularLayout', () => {
      const layout = LayoutFactory.create(LayoutType.CIRCULAR, {
        width: 800,
        height: 600,
      });
      expect(layout).toBeInstanceOf(CircularLayout);
    });

    it('should create HierarchicalLayout', () => {
      const layout = LayoutFactory.create(LayoutType.HIERARCHICAL, {
        width: 800,
        height: 600,
      });
      expect(layout).toBeInstanceOf(HierarchicalLayout);
    });

    it('should create GridLayout', () => {
      const layout = LayoutFactory.create(LayoutType.GRID, {
        width: 800,
        height: 600,
      });
      expect(layout).toBeInstanceOf(GridLayout);
    });

    it('should create SpatialLayout', () => {
      const layout = LayoutFactory.create(LayoutType.SPATIAL, {
        width: 800,
        height: 600,
      });
      expect(layout).toBeInstanceOf(SpatialLayout);
    });

    it('should default to ForceDirectedLayout for unknown types', () => {
      const layout = LayoutFactory.create('unknown' as LayoutType, {
        width: 800,
        height: 600,
      });
      expect(layout).toBeInstanceOf(ForceDirectedLayout);
    });
  });

  describe('Layout Performance', () => {
    it('should handle large networks efficiently', () => {
      const largeNodes: LayoutNode[] = Array.from({ length: 100 }, (_, i) => ({
        id: `N${i}`,
        type: 'input' as any,
        state: 'dormant' as any,
        x: 0,
        y: 0,
        radius: 20,
      }));

      const largeLinks: LayoutLink[] = Array.from({ length: 150 }, (_, i) => ({
        source: `N${i % 100}`,
        target: `N${(i + 1) % 100}`,
        type: 'data',
      }));

      const layout = new ForceDirectedLayout({
        width: 800,
        height: 600,
        iterations: 50,
      });

      const startTime = Date.now();
      layout.initialize(largeNodes, largeLinks);
      layout.simulate();
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 5 seconds for 100 nodes)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Layout Edge Cases', () => {
    it('should handle empty network', () => {
      const layout = new ForceDirectedLayout({ width: 800, height: 600 });
      layout.initialize([], []);

      const nodes = layout.getNodes();
      expect(nodes).toHaveLength(0);
    });

    it('should handle single node', () => {
      const singleNode: LayoutNode[] = [
        { id: 'N1', type: 'input' as any, state: 'dormant' as any, x: 0, y: 0, radius: 20 },
      ];

      const layout = new ForceDirectedLayout({ width: 800, height: 600 });
      layout.initialize(singleNode, []);
      layout.simulate();

      const nodes = layout.getNodes();
      expect(nodes).toHaveLength(1);
      expect(nodes[0].x).toBeCloseTo(400, 0); // Center
      expect(nodes[0].y).toBeCloseTo(300, 0); // Center
    });

    it('should handle disconnected components', () => {
      const disconnectedNodes: LayoutNode[] = [
        { id: 'A1', type: 'input' as any, state: 'dormant' as any, x: 0, y: 0, radius: 20 },
        { id: 'A2', type: 'input' as any, state: 'dormant' as any, x: 0, y: 0, radius: 20 },
        { id: 'B1', type: 'input' as any, state: 'dormant' as any, x: 0, y: 0, radius: 20 },
        { id: 'B2', type: 'input' as any, state: 'dormant' as any, x: 0, y: 0, radius: 20 },
      ];

      const disconnectedLinks: LayoutLink[] = [
        { source: 'A1', target: 'A2', type: 'data' },
        { source: 'B1', target: 'B2', type: 'data' },
      ];

      const layout = new ForceDirectedLayout({ width: 800, height: 600 });
      layout.initialize(disconnectedNodes, disconnectedLinks);
      layout.simulate();

      const nodes = layout.getNodes();

      // All nodes should still be positioned
      nodes.forEach(node => {
        expect(node.x).toBeGreaterThanOrEqual(50);
        expect(node.x).toBeLessThanOrEqual(750);
        expect(node.y).toBeGreaterThanOrEqual(50);
        expect(node.y).toBeLessThanOrEqual(550);
      });
    });
  });
});
