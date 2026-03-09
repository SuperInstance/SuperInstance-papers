/**
 * Network Layout Algorithms for Cell Garden Visualization
 *
 * Provides force-directed, circular, hierarchical, and grid layouts
 * for visualizing cell networks and their relationships.
 */

import type { CellType, CellState } from '../../core/types.js';

/**
 * Node representing a cell in the layout
 */
export interface LayoutNode {
  id: string;
  type: CellType;
  state: CellState;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  radius: number;
  mass?: number;
  fixed?: boolean;
}

/**
 * Link representing a relationship between cells
 */
export interface LayoutLink {
  source: string | LayoutNode;
  target: string | LayoutNode;
  type: 'data' | 'control' | 'sensation' | 'entanglement';
  strength?: number;
  length?: number;
}

/**
 * Layout configuration options
 */
export interface LayoutOptions {
  width: number;
  height: number;
  padding?: number;
  iterations?: number;
  linkDistance?: number;
  linkStrength?: number;
  chargeStrength?: number;
  gravity?: number;
  friction?: number;
  nodeRadius?: (node: LayoutNode) => number;
}

/**
 * Layout type enumeration
 */
export enum LayoutType {
  FORCE_DIRECTED = 'force-directed',
  CIRCULAR = 'circular',
  HIERARCHICAL = 'hierarchical',
  GRID = 'grid',
  SPATIAL = 'spatial',
}

/**
 * Force-Directed Graph Layout
 *
 * Uses physics-based simulation to position nodes
 */
export class ForceDirectedLayout {
  private nodes: LayoutNode[] = [];
  private links: LayoutLink[] = [];
  private options: Required<LayoutOptions>;

  constructor(options: LayoutOptions) {
    this.options = {
      width: options.width,
      height: options.height,
      padding: options.padding ?? 50,
      iterations: options.iterations ?? 300,
      linkDistance: options.linkDistance ?? 100,
      linkStrength: options.linkStrength ?? 0.1,
      chargeStrength: options.chargeStrength ?? -30,
      gravity: options.gravity ?? 0.1,
      friction: options.friction ?? 0.9,
      nodeRadius: options.nodeRadius ?? ((n: LayoutNode) => 20),
    };
  }

  /**
   * Initialize the layout with nodes and links
   */
  initialize(nodes: LayoutNode[], links: LayoutLink[]): void {
    this.nodes = nodes.map(node => ({
      ...node,
      vx: 0,
      vy: 0,
      mass: 1,
    }));

    this.links = links.map(link => ({
      ...link,
      strength: link.strength ?? this.options.linkStrength,
      length: link.length ?? this.options.linkDistance,
    }));

    // Resolve source/target references
    this.links.forEach(link => {
      if (typeof link.source === 'string') {
        const sourceNode = this.nodes.find(n => n.id === link.source);
        if (sourceNode) link.source = sourceNode;
      }
      if (typeof link.target === 'string') {
        const targetNode = this.nodes.find(n => n.id === link.target);
        if (targetNode) link.target = targetNode;
      }
    });
  }

  /**
   * Run the force simulation
   */
  simulate(): void {
    const alpha = 1;
    const alphaDecay = 1 - Math.pow(0.001, 1 / this.options.iterations);

    for (let i = 0; i < this.options.iterations; i++) {
      this.tick(alpha * Math.pow(1 - alphaDecay, i));
    }
  }

  /**
   * Single simulation tick
   */
  private tick(alpha: number): void {
    // Apply forces
    this.applyCoulombLaw(alpha);
    this.applyHookeLaw(alpha);
    this.applyGravity(alpha);
    this.updatePositions();
    this.constrainToBounds();
  }

  /**
   * Coulomb's law - repulsion between all nodes
   */
  private applyCoulombLaw(alpha: number): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (node.fixed) continue;

      for (let j = i + 1; j < this.nodes.length; j++) {
        const other = this.nodes[j];
        if (other.fixed) continue;

        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const distanceSq = dx * dx + dy * dy || 1;
        const distance = Math.sqrt(distanceSq);

        const force = (this.options.chargeStrength * node.mass! * other.mass!) / distanceSq;

        const fx = (dx / distance) * force * alpha;
        const fy = (dy / distance) * force * alpha;

        node.vx! += fx / node.mass!;
        node.vy! += fy / node.mass!;
        other.vx! -= fx / other.mass!;
        other.vy! -= fy / other.mass!;
      }
    }
  }

  /**
   * Hooke's law - attraction along links
   */
  private applyHookeLaw(alpha: number): void {
    this.links.forEach(link => {
      const source = link.source as LayoutNode;
      const target = link.target as LayoutNode;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;

      const force = (distance - link.length!) * link.strength!;

      const fx = (dx / distance) * force * alpha;
      const fy = (dy / distance) * force * alpha;

      if (!source.fixed) {
        source.vx! += fx / source.mass!;
        source.vy! += fy / source.mass!;
      }
      if (!target.fixed) {
        target.vx! -= fx / target.mass!;
        target.vy! -= fy / target.mass!;
      }
    });
  }

  /**
   * Gravity - pull nodes toward center
   */
  private applyGravity(alpha: number): void {
    const cx = this.options.width / 2;
    const cy = this.options.height / 2;

    this.nodes.forEach(node => {
      if (node.fixed) return;

      const dx = cx - node.x;
      const dy = cy - node.y;

      node.vx! += dx * this.options.gravity * alpha;
      node.vy! += dy * this.options.gravity * alpha;
    });
  }

  /**
   * Update positions based on velocity
   */
  private updatePositions(): void {
    this.nodes.forEach(node => {
      if (node.fixed) return;

      node.vx! *= this.options.friction;
      node.vy! *= this.options.friction;

      node.x += node.vx!;
      node.y += node.vy!;
    });
  }

  /**
   * Constrain nodes to bounds
   */
  private constrainToBounds(): void {
    const pad = this.options.padding;

    this.nodes.forEach(node => {
      if (node.fixed) return;

      const r = this.options.nodeRadius(node);

      node.x = Math.max(pad + r, Math.min(this.options.width - pad - r, node.x));
      node.y = Math.max(pad + r, Math.min(this.options.height - pad - r, node.y));
    });
  }

  /**
   * Get the positioned nodes
   */
  getNodes(): LayoutNode[] {
    return this.nodes;
  }

  /**
   * Get the positioned links
   */
  getLinks(): LayoutLink[] {
    return this.links;
  }
}

/**
 * Circular Layout
 *
 * Arranges nodes in a circle
 */
export class CircularLayout {
  private options: Required<LayoutOptions>;

  constructor(options: LayoutOptions) {
    this.options = {
      width: options.width,
      height: options.height,
      padding: options.padding ?? 50,
      iterations: options.iterations ?? 1,
      linkDistance: options.linkDistance ?? 100,
      linkStrength: options.linkStrength ?? 0.1,
      chargeStrength: options.chargeStrength ?? -30,
      gravity: options.gravity ?? 0.1,
      friction: options.friction ?? 0.9,
      nodeRadius: options.nodeRadius ?? ((n: LayoutNode) => 20),
    };
  }

  /**
   * Initialize and arrange nodes in a circle
   */
  initialize(nodes: LayoutNode[], links: LayoutLink[]): void {
    const cx = this.options.width / 2;
    const cy = this.options.height / 2;
    const radius = Math.min(
      (this.options.width - this.options.padding * 2) / 2,
      (this.options.height - this.options.padding * 2) / 2
    );

    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      node.x = cx + radius * Math.cos(angle);
      node.y = cy + radius * Math.sin(angle);
      node.vx = 0;
      node.vy = 0;
    });
  }

  simulate(): void {
    // No simulation needed for circular layout
  }

  getNodes(): LayoutNode[] {
    return [];
  }

  getLinks(): LayoutLink[] {
    return [];
  }
}

/**
 * Hierarchical Layout
 *
 * Arranges nodes in layers based on dependencies
 */
export class HierarchicalLayout {
  private options: Required<LayoutOptions>;
  private nodes: LayoutNode[] = [];
  private links: LayoutLink[] = [];

  constructor(options: LayoutOptions) {
    this.options = {
      width: options.width,
      height: options.height,
      padding: options.padding ?? 50,
      iterations: options.iterations ?? 1,
      linkDistance: options.linkDistance ?? 100,
      linkStrength: options.linkStrength ?? 0.1,
      chargeStrength: options.chargeStrength ?? -30,
      gravity: options.gravity ?? 0.1,
      friction: options.friction ?? 0.9,
      nodeRadius: options.nodeRadius ?? ((n: LayoutNode) => 20),
    };
  }

  /**
   * Initialize and arrange nodes hierarchically
   */
  initialize(nodes: LayoutNode[], links: LayoutLink[]): void {
    this.nodes = nodes;
    this.links = links;

    // Build adjacency list
    const incoming = new Map<string, string[]>();
    const outgoing = new Map<string, string[]>();

    nodes.forEach(n => {
      incoming.set(n.id, []);
      outgoing.set(n.id, []);
    });

    links.forEach(link => {
      const source = typeof link.source === 'string' ? link.source : link.source.id;
      const target = typeof link.target === 'string' ? link.target : link.target.id;

      incoming.get(target)?.push(source);
      outgoing.get(source)?.push(target);
    });

    // Calculate levels using topological sort
    const levels = new Map<string, number>();
    const visited = new Set<string>();

    const calculateLevel = (nodeId: string): number => {
      if (levels.has(nodeId)) return levels.get(nodeId)!;

      const sources = incoming.get(nodeId) ?? [];
      if (sources.length === 0) {
        levels.set(nodeId, 0);
        return 0;
      }

      let maxSourceLevel = 0;
      sources.forEach(source => {
        const sourceLevel = calculateLevel(source);
        maxSourceLevel = Math.max(maxSourceLevel, sourceLevel);
      });

      const level = maxSourceLevel + 1;
      levels.set(nodeId, level);
      return level;
    };

    nodes.forEach(n => calculateLevel(n.id));

    // Group nodes by level
    const levelsToNodes = new Map<number, LayoutNode[]>();
    nodes.forEach(n => {
      const level = levels.get(n.id) ?? 0;
      if (!levelsToNodes.has(level)) {
        levelsToNodes.set(level, []);
      }
      levelsToNodes.get(level)!.push(n);
    });

    // Position nodes
    const maxLevel = Math.max(...levels.values());
    const levelHeight = (this.options.height - this.options.padding * 2) / (maxLevel + 1);

    levelsToNodes.forEach((nodesAtLevel, level) => {
      const y = this.options.padding + levelHeight * (level + 0.5);
      const levelWidth = this.options.width - this.options.padding * 2;
      const nodeWidth = levelWidth / nodesAtLevel.length;

      nodesAtLevel.forEach((node, i) => {
        node.x = this.options.padding + nodeWidth * (i + 0.5);
        node.y = y;
        node.vx = 0;
        node.vy = 0;
      });
    });
  }

  simulate(): void {
    // No simulation needed for hierarchical layout
  }

  getNodes(): LayoutNode[] {
    return this.nodes;
  }

  getLinks(): LayoutLink[] {
    return this.links;
  }
}

/**
 * Grid Layout
 *
 * Arranges nodes in a regular grid
 */
export class GridLayout {
  private options: Required<LayoutOptions>;

  constructor(options: LayoutOptions) {
    this.options = {
      width: options.width,
      height: options.height,
      padding: options.padding ?? 50,
      iterations: options.iterations ?? 1,
      linkDistance: options.linkDistance ?? 100,
      linkStrength: options.linkStrength ?? 0.1,
      chargeStrength: options.chargeStrength ?? -30,
      gravity: options.gravity ?? 0.1,
      friction: options.friction ?? 0.9,
      nodeRadius: options.nodeRadius ?? ((n: LayoutNode) => 20),
    };
  }

  /**
   * Initialize and arrange nodes in a grid
   */
  initialize(nodes: LayoutNode[], links: LayoutLink[]): void {
    const count = nodes.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const cellWidth = (this.options.width - this.options.padding * 2) / cols;
    const cellHeight = (this.options.height - this.options.padding * 2) / rows;

    nodes.forEach((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      node.x = this.options.padding + cellWidth * (col + 0.5);
      node.y = this.options.padding + cellHeight * (row + 0.5);
      node.vx = 0;
      node.vy = 0;
    });
  }

  simulate(): void {
    // No simulation needed for grid layout
  }

  getNodes(): LayoutNode[] {
    return [];
  }

  getLinks(): LayoutLink[] {
    return [];
  }
}

/**
 * Spatial Layout
 *
 * Positions nodes based on their actual spreadsheet coordinates
 */
export class SpatialLayout {
  private options: Required<LayoutOptions>;

  constructor(options: LayoutOptions) {
    this.options = {
      width: options.width,
      height: options.height,
      padding: options.padding ?? 50,
      iterations: options.iterations ?? 1,
      linkDistance: options.linkDistance ?? 100,
      linkStrength: options.linkStrength ?? 0.1,
      chargeStrength: options.chargeStrength ?? -30,
      gravity: options.gravity ?? 0.1,
      friction: options.friction ?? 0.9,
      nodeRadius: options.nodeRadius ?? ((n: LayoutNode) => 20),
    };
  }

  /**
   * Initialize and arrange nodes spatially
   */
  initialize(nodes: LayoutNode[], links: LayoutLink[]): void {
    // Find bounds
    let minRow = Infinity, maxRow = -Infinity;
    let minCol = Infinity, maxCol = -Infinity;

    nodes.forEach(n => {
      const pos = this.getPosition(n);
      minRow = Math.min(minRow, pos.row);
      maxRow = Math.max(maxRow, pos.row);
      minCol = Math.min(minCol, pos.col);
      maxCol = Math.max(maxCol, pos.col);
    });

    const rowSpan = maxRow - minRow + 1 || 1;
    const colSpan = maxCol - minCol + 1 || 1;

    const scaleX = (this.options.width - this.options.padding * 2) / colSpan;
    const scaleY = (this.options.height - this.options.padding * 2) / rowSpan;

    nodes.forEach(node => {
      const pos = this.getPosition(node);
      const col = pos.col - minCol;
      const row = pos.row - minRow;

      node.x = this.options.padding + scaleX * (col + 0.5);
      node.y = this.options.padding + scaleY * (row + 0.5);
      node.vx = 0;
      node.vy = 0;
    });
  }

  private getPosition(node: LayoutNode): { row: number; col: number } {
    // Parse position from ID or use metadata
    const match = node.id.match(/R(\d+)C(\d+)/);
    if (match) {
      return { row: parseInt(match[1]), col: parseInt(match[2]) };
    }
    return { row: 0, col: 0 };
  }

  simulate(): void {
    // No simulation needed for spatial layout
  }

  getNodes(): LayoutNode[] {
    return [];
  }

  getLinks(): LayoutLink[] {
    return [];
  }
}

/**
 * Factory for creating layout instances
 */
export class LayoutFactory {
  static create(type: LayoutType, options: LayoutOptions) {
    switch (type) {
      case LayoutType.FORCE_DIRECTED:
        return new ForceDirectedLayout(options);
      case LayoutType.CIRCULAR:
        return new CircularLayout(options);
      case LayoutType.HIERARCHICAL:
        return new HierarchicalLayout(options);
      case LayoutType.GRID:
        return new GridLayout(options);
      case LayoutType.SPATIAL:
        return new SpatialLayout(options);
      default:
        return new ForceDirectedLayout(options);
    }
  }
}
