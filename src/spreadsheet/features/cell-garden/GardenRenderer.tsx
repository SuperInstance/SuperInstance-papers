/**
 * Garden Renderer - Canvas/WebGL Rendering for Cell Garden
 *
 * Provides high-performance rendering of cell network visualizations
 * using HTML5 Canvas with optional WebGL acceleration.
 */

import type { LayoutNode, LayoutLink } from './NetworkLayout.js';
import type { CellType, CellState } from '../../core/types.js';

/**
 * Render configuration options
 */
export interface RenderOptions {
  width: number;
  height: number;
  pixelRatio?: number;
  backgroundColor?: string;
  showLabels?: boolean;
  showLinks?: boolean;
  animateLinks?: boolean;
  linkWidth?: number;
  nodeScale?: number;
  enableGlow?: boolean;
  enableShadows?: boolean;
}

/**
 * Color scheme for cell types
 */
const CELL_TYPE_COLORS: Record<CellType, string> = {
  input: '#4CAF50',
  output: '#2196F3',
  storage: '#9C27B0',
  transform: '#FF9800',
  filter: '#F44336',
  aggregate: '#00BCD4',
  validate: '#8BC34A',
  analysis: '#E91E63',
  prediction: '#9C27B0',
  decision: '#FF5722',
  explain: '#795548',
  notify: '#607D8B',
  trigger: '#3F51B5',
  schedule: '#009688',
  coordinate: '#CDDC39',
};

/**
 * Color scheme for cell states
 */
const CELL_STATE_COLORS: Record<string, string> = {
  dormant: '#9E9E9E',
  sensing: '#FFEB3B',
  processing: '#2196F3',
  emitting: '#4CAF50',
  learning: '#9C27B0',
  error: '#F44336',
};

/**
 * Link type colors
 */
const LINK_TYPE_COLORS: Record<string, string> = {
  data: '#2196F3',
  control: '#FF9800',
  sensation: '#4CAF50',
  entanglement: '#9C27B0',
};

/**
 * Garden Renderer Class
 */
export class GardenRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: Required<RenderOptions>;
  private nodes: LayoutNode[] = [];
  private links: LayoutLink[] = [];
  private hoveredNode: LayoutNode | null = null;
  private selectedNode: LayoutNode | null = null;
  private animationFrame: number | null = null;
  private linkAnimations: Map<string, number> = new Map();

  constructor(canvas: HTMLCanvasElement, options: RenderOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;

    this.options = {
      width: options.width,
      height: options.height,
      pixelRatio: options.pixelRatio ?? window.devicePixelRatio ?? 1,
      backgroundColor: options.backgroundColor ?? '#1a1a2e',
      showLabels: options.showLabels ?? true,
      showLinks: options.showLinks ?? true,
      animateLinks: options.animateLinks ?? true,
      linkWidth: options.linkWidth ?? 2,
      nodeScale: options.nodeScale ?? 1,
      enableGlow: options.enableGlow ?? true,
      enableShadows: options.enableShadows ?? true,
    };

    this.setupCanvas();
  }

  /**
   * Setup canvas with proper sizing
   */
  private setupCanvas(): void {
    const { width, height, pixelRatio } = this.options;
    this.canvas.width = width * pixelRatio;
    this.canvas.height = height * pixelRatio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(pixelRatio, pixelRatio);
  }

  /**
   * Set the nodes and links to render
   */
  setData(nodes: LayoutNode[], links: LayoutLink[]): void {
    this.nodes = nodes;
    this.links = links;
  }

  /**
   * Main render method
   */
  render(): void {
    this.clear();
    this.renderLinks();
    this.renderNodes();
    this.renderLabels();
    this.renderHover();
  }

  /**
   * Clear the canvas
   */
  private clear(): void {
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.options.width, this.options.height);
  }

  /**
   * Render all links
   */
  private renderLinks(): void {
    if (!this.options.showLinks) return;

    this.links.forEach(link => {
      const source = typeof link.source === 'string'
        ? this.nodes.find(n => n.id === link.source)
        : link.source;
      const target = typeof link.target === 'string'
        ? this.nodes.find(n => n.id === link.target)
        : link.target;

      if (!source || !target) return;

      this.renderLink(source, target, link);
    });
  }

  /**
   * Render a single link
   */
  private renderLink(
    source: LayoutNode,
    target: LayoutNode,
    link: LayoutLink
  ): void {
    const baseColor = LINK_TYPE_COLORS[link.type] || '#666';
    const width = this.options.linkWidth;

    this.ctx.beginPath();
    this.ctx.moveTo(source.x, source.y);
    this.ctx.lineTo(target.x, target.y);

    if (this.options.animateLinks && link.type === 'entanglement') {
      // Animated dashed line for entanglements
      const offset = this.getLinkAnimation(link);
      this.ctx.setLineDash([5, 5]);
      this.ctx.lineDashOffset = -offset;
      this.ctx.strokeStyle = baseColor;
      this.ctx.lineWidth = width;
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    } else {
      // Solid line with gradient
      const gradient = this.ctx.createLinearGradient(
        source.x, source.y,
        target.x, target.y
      );
      gradient.addColorStop(0, this.getNodeColor(source));
      gradient.addColorStop(1, this.getNodeColor(target));

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = width;
      this.ctx.stroke();
    }
  }

  /**
   * Get animation offset for a link
   */
  private getLinkAnimation(link: LayoutLink): number {
    const key = `${typeof link.source === 'string' ? link.source : link.source.id}-${
      typeof link.target === 'string' ? link.target : link.target.id
    }`;
    if (!this.linkAnimations.has(key)) {
      this.linkAnimations.set(key, 0);
    }
    const offset = this.linkAnimations.get(key)!;
    this.linkAnimations.set(key, (offset + 0.5) % 10);
    return offset;
  }

  /**
   * Render all nodes
   */
  private renderNodes(): void {
    this.nodes.forEach(node => {
      this.renderNode(node);
    });
  }

  /**
   * Render a single node
   */
  private renderNode(node: LayoutNode): void {
    const radius = node.radius * this.options.nodeScale;
    const color = this.getNodeColor(node);

    // Shadow
    if (this.options.enableShadows) {
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetX = 2;
      this.ctx.shadowOffsetY = 2;
    }

    // Glow effect
    if (this.options.enableGlow && node.state !== 'dormant') {
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 20;
    }

    // Main circle
    this.ctx.beginPath();
    this.ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();

    // Border
    this.ctx.shadowColor = 'transparent';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // State indicator
    this.renderStateIndicator(node, radius);
  }

  /**
   * Render state indicator for a node
   */
  private renderStateIndicator(node: LayoutNode, radius: number): void {
    if (node.state === 'dormant') return;

    const indicatorRadius = radius * 0.3;
    const indicatorColor = CELL_STATE_COLORS[node.state] || '#fff';

    this.ctx.beginPath();
    this.ctx.arc(node.x, node.y, indicatorRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = indicatorColor;
    this.ctx.fill();
  }

  /**
   * Render all labels
   */
  private renderLabels(): void {
    if (!this.options.showLabels) return;

    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.nodes.forEach(node => {
      this.renderLabel(node);
    });
  }

  /**
   * Render a single label
   */
  private renderLabel(node: LayoutNode): void {
    const radius = node.radius * this.options.nodeScale;
    const labelY = node.y + radius + 15;

    // Background for label
    const label = node.id;
    const metrics = this.ctx.measureText(label);
    const padding = 4;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(
      node.x - metrics.width / 2 - padding,
      labelY - 10,
      metrics.width + padding * 2,
      20
    );

    // Label text
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(label, node.x, labelY);
  }

  /**
   * Render hover effect
   */
  private renderHover(): void {
    if (!this.hoveredNode) return;

    const node = this.hoveredNode;
    const radius = node.radius * this.options.nodeScale * 1.2;

    // Hover ring
    this.ctx.beginPath();
    this.ctx.arc(node.x, node.y, radius + 5, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
  }

  /**
   * Get color for a node
   */
  private getNodeColor(node: LayoutNode): string {
    return CELL_TYPE_COLORS[node.type] || '#666';
  }

  /**
   * Handle mouse move for hover detection
   */
  handleMouseMove(x: number, y: number): void {
    const prevHover = this.hoveredNode;
    this.hoveredNode = this.findNodeAt(x, y);

    if (prevHover !== this.hoveredNode) {
      this.render();
      this.canvas.style.cursor = this.hoveredNode ? 'pointer' : 'default';
    }
  }

  /**
   * Handle mouse click for selection
   */
  handleMouseClick(x: number, y: number): LayoutNode | null {
    const node = this.findNodeAt(x, y);
    this.selectedNode = node;
    this.render();
    return node;
  }

  /**
   * Find node at position
   */
  private findNodeAt(x: number, y: number): LayoutNode | null {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const radius = node.radius * this.options.nodeScale;
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy <= radius * radius) {
        return node;
      }
    }
    return null;
  }

  /**
   * Start animation loop
   */
  startAnimation(): void {
    const animate = () => {
      this.render();
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  /**
   * Stop animation loop
   */
  stopAnimation(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Get node at position (for external use)
   */
  getNodeAt(x: number, y: number): LayoutNode | null {
    return this.findNodeAt(x, y);
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectedNode = null;
    this.render();
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<RenderOptions>): void {
    this.options = { ...this.options, ...options };
    this.setupCanvas();
    this.render();
  }

  /**
   * Export canvas as image
   */
  exportAsImage(format: 'png' | 'jpeg' = 'png'): string {
    return this.canvas.toDataURL(`image/${format}`);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAnimation();
    this.linkAnimations.clear();
  }
}

/**
 * WebGL Renderer (optional, for larger networks)
 */
export class WebGLGardenRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private options: Required<RenderOptions>;

  constructor(canvas: HTMLCanvasElement, options: RenderOptions) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    this.gl = gl as WebGLRenderingContext;

    this.options = {
      width: options.width,
      height: options.height,
      pixelRatio: options.pixelRatio ?? window.devicePixelRatio ?? 1,
      backgroundColor: options.backgroundColor ?? '#1a1a2e',
      showLabels: options.showLabels ?? true,
      showLinks: options.showLinks ?? true,
      animateLinks: options.animateLinks ?? true,
      linkWidth: options.linkWidth ?? 2,
      nodeScale: options.nodeScale ?? 1,
      enableGlow: options.enableGlow ?? true,
      enableShadows: options.enableShadows ?? true,
    };

    this.setupWebGL();
  }

  private setupWebGL(): void {
    const gl = this.gl;

    // Vertex shader
    const vsSource = `
      attribute vec2 a_position;
      attribute vec3 a_color;
      attribute float a_radius;

      uniform vec2 u_resolution;

      varying vec3 v_color;

      void main() {
        vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        gl_PointSize = a_radius * 2.0;
        v_color = a_color;
      }
    `;

    // Fragment shader
    const fsSource = `
      precision mediump float;
      varying vec3 v_color;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;
        gl_FragColor = vec4(v_color, 1.0);
      }
    `;

    // Compile shaders
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

    // Create program
    this.program = gl.createProgram();
    gl.attachShader(this.program!, vertexShader);
    gl.attachShader(this.program!, fragmentShader);
    gl.linkProgram(this.program!);

    if (!gl.getProgramParameter(this.program!, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(this.program!));
    }
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      throw new Error('Shader compilation failed');
    }

    return shader;
  }

  render(nodes: LayoutNode[], links: LayoutLink[]): void {
    const gl = this.gl;

    // Clear
    const bgColor = this.hexToRgb(this.options.backgroundColor);
    gl.clearColor(bgColor.r / 255, bgColor.g / 255, bgColor.b / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program!);

    // Set resolution
    const resolutionLocation = gl.getUniformLocation(this.program!, 'u_resolution');
    gl.uniform2f(resolutionLocation, this.options.width, this.options.height);

    // Render nodes
    this.renderNodes(nodes);
  }

  private renderNodes(nodes: LayoutNode[]): void {
    const gl = this.gl;

    // Prepare data
    const positions: number[] = [];
    const colors: number[] = [];
    const radii: number[] = [];

    nodes.forEach(node => {
      positions.push(node.x, node.y);
      const color = this.hexToRgb(this.getNodeColor(node));
      colors.push(color.r / 255, color.g / 255, color.b / 255);
      radii.push(node.radius * this.options.nodeScale);
    });

    // Create buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(this.program!, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    const colorLocation = gl.getAttribLocation(this.program!, 'a_color');
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

    const radiusBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, radiusBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(radii), gl.STATIC_DRAW);

    const radiusLocation = gl.getAttribLocation(this.program!, 'a_radius');
    gl.enableVertexAttribArray(radiusLocation);
    gl.vertexAttribPointer(radiusLocation, 1, gl.FLOAT, false, 0, 0);

    // Draw
    gl.drawArrays(gl.POINTS, 0, nodes.length);
  }

  private getNodeColor(node: LayoutNode): string {
    return CELL_TYPE_COLORS[node.type] || '#666';
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  destroy(): void {
    const gl = this.gl;
    if (this.program) {
      gl.deleteProgram(this.program);
    }
  }
}
