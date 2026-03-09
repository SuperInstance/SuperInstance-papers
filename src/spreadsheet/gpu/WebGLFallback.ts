/**
 * WebGLFallback.ts - WebGL 2.0 Fallback for Compute Operations
 *
 * Provides WebGL 2.0 transform feedback fallback for browsers without WebGPU support.
 * Enables GPU-accelerated computations on older hardware.
 */

export interface WebGLCellData {
  value: number;
  previousValue: number;
  velocity: number;
  acceleration: number;
  timestamp: number;
  flags: number;
}

export interface WebGLConfig {
  cellCount: number;
  currentTime: number;
  deltaTime: number;
  decayRate: number;
}

export interface WebGLResult {
  cells: WebGLCellData[];
  executionTime: number;
}

/**
 * WebGL 2.0 Compute Fallback
 */
export class WebGLFallback {
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private transformFeedback: WebGLTransformFeedback | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private isSupported: boolean = false;

  /**
   * Initialize WebGL 2.0 context
   */
  initialize(canvas?: HTMLCanvasElement): boolean {
    // Create or use provided canvas
    const targetCanvas = canvas || document.createElement('canvas');

    try {
      this.gl = targetCanvas.getContext('webgl2');

      if (!this.gl) {
        console.warn('WebGL 2.0 not supported');
        return false;
      }

      // Check for transform feedback support
      const ext = this.gl.getExtension('EXT_color_buffer_float');
      if (!ext) {
        console.warn('Float transform feedback not supported');
      }

      this.isSupported = true;
      return true;
    } catch (error) {
      console.error('WebGL initialization failed:', error);
      return false;
    }
  }

  /**
   * Load compute shader program
   */
  loadComputeShaders(): boolean {
    if (!this.gl) {
      return false;
    }

    // Vertex shader for transform feedback
    const vertexShaderSource = `
      #version 300 es

      // Cell data input
      in float value;
      in float previousValue;
      in float velocity;
      in float acceleration;
      in float timestamp;
      in float flags;

      // Uniforms
      uniform float u_currentTime;
      uniform float u_deltaTime;
      uniform float u_decayRate;
      uniform uint u_cellCount;

      // Transform feedback outputs
      out float outValue;
      out float outPreviousValue;
      out float outVelocity;
      out float outAcceleration;
      out float outTimestamp;
      out float outFlags;

      const uint FLAG_ACTIVE = 1u;

      void main() {
        // Skip inactive cells
        if ((uint(flags) & FLAG_ACTIVE) == 0u) {
          outValue = value;
          outPreviousValue = previousValue;
          outVelocity = velocity;
          outAcceleration = acceleration;
          outTimestamp = timestamp;
          outFlags = flags;
          return;
        }

        // Calculate velocity
        float dt = u_currentTime - timestamp;
        float newVelocity = velocity;
        if (dt > 0.0) {
          newVelocity = (value - previousValue) / dt;
        }

        // Apply decay
        float newValue = value;
        if (u_decayRate > 0.0) {
          newValue = value * (1.0 - u_decayRate * u_deltaTime);
        }

        // Output
        outValue = newValue;
        outPreviousValue = value;
        outVelocity = newVelocity;
        outAcceleration = newVelocity - velocity;
        outTimestamp = u_currentTime;
        outFlags = flags;
      }
    `;

    // Fragment shader (minimal, for transform feedback)
    const fragmentShaderSource = `
      #version 300 es
      precision highp float;

      void main() {
        // Not used in transform feedback
      }
    `;

    // Compile shaders
    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      return false;
    }

    // Create program
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);

    // Specify transform feedback varyings
    this.gl.transformFeedbackVaryings(
      this.program,
      [
        'outValue',
        'outPreviousValue',
        'outVelocity',
        'outAcceleration',
        'outTimestamp',
        'outFlags',
      ],
      this.gl.SEPARATE_ATTRIBS,
    );

    // Link program
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Program link error:', this.gl.getProgramInfoLog(this.program));
      return false;
    }

    // Create VAO and transform feedback object
    this.vao = this.gl.createVertexArray();
    this.transformFeedback = this.gl.createTransformFeedback();

    return true;
  }

  /**
   * Process cells on GPU
   */
  processCells(cells: WebGLCellData[], config: WebGLConfig): WebGLResult {
    if (!this.gl || !this.program || !this.vao || !this.transformFeedback) {
      throw new Error('WebGL not properly initialized');
    }

    const startTime = performance.now();

    // Create input buffer
    const inputBuffer = this.createCellBuffer(cells);
    const outputBuffer = this.createCellBuffer(new Array(cells.length));

    // Setup VAO
    this.gl.bindVertexArray(this.vao);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, inputBuffer);

    // Setup attributes
    const stride = 6 * 4; // 6 floats per cell
    this.gl.vertexAttribPointer(0, 1, this.gl.FLOAT, false, stride, 0); // value
    this.gl.vertexAttribPointer(1, 1, this.gl.FLOAT, false, stride, 4); // previousValue
    this.gl.vertexAttribPointer(2, 1, this.gl.FLOAT, false, stride, 8); // velocity
    this.gl.vertexAttribPointer(3, 1, this.gl.FLOAT, false, stride, 12); // acceleration
    this.gl.vertexAttribPointer(4, 1, this.gl.FLOAT, false, stride, 16); // timestamp
    this.gl.vertexAttribPointer(5, 1, this.gl.FLOAT, false, stride, 20); // flags

    for (let i = 0; i < 6; i++) {
      this.gl.enableVertexAttribArray(i);
    }

    // Setup transform feedback
    this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, 0, outputBuffer);
    this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, this.transformFeedback);

    // Use program
    this.gl.useProgram(this.program);

    // Set uniforms
    const currentTimeLoc = this.gl.getUniformLocation(this.program, 'u_currentTime');
    const deltaTimeLoc = this.gl.getUniformLocation(this.program, 'u_deltaTime');
    const decayRateLoc = this.gl.getUniformLocation(this.program, 'u_decayRate');
    const cellCountLoc = this.gl.getUniformLocation(this.program, 'u_cellCount');

    this.gl.uniform1f(currentTimeLoc, config.currentTime);
    this.gl.uniform1f(deltaTimeLoc, config.deltaTime);
    this.gl.uniform1f(decayRateLoc, config.decayRate);
    this.gl.uniform1ui(cellCountLoc, config.cellCount);

    // Disable rasterization
    this.gl.enable(this.gl.RASTERIZER_DISCARD);

    // Begin transform feedback
    this.gl.beginTransformFeedback(this.gl.POINTS);
    this.gl.drawArrays(this.gl.POINTS, 0, config.cellCount);
    this.gl.endTransformFeedback();

    // Enable rasterization
    this.gl.disable(this.gl.RASTERIZER_DISCARD);

    // Read back results
    const resultCells = this.readCellBuffer(outputBuffer, cells.length);

    // Cleanup
    this.gl.deleteBuffer(inputBuffer);
    this.gl.deleteBuffer(outputBuffer);
    this.gl.bindVertexArray(null);
    this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, null);

    const executionTime = performance.now() - startTime;

    return {
      cells: resultCells,
      executionTime,
    };
  }

  /**
   * Create cell buffer
   */
  private createCellBuffer(cells: WebGLCellData[]): WebGLBuffer {
    if (!this.gl) {
      throw new Error('WebGL not initialized');
    }

    const data = new Float32Array(cells.length * 6);

    for (let i = 0; i < cells.length; i++) {
      const offset = i * 6;
      data[offset + 0] = cells[i].value;
      data[offset + 1] = cells[i].previousValue;
      data[offset + 2] = cells[i].velocity;
      data[offset + 3] = cells[i].acceleration;
      data[offset + 4] = cells[i].timestamp;
      data[offset + 5] = cells[i].flags;
    }

    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.DYNAMIC_COPY);

    return buffer!;
  }

  /**
   * Read cell buffer
   */
  private readCellBuffer(buffer: WebGLBuffer, count: number): WebGLCellData[] {
    if (!this.gl) {
      throw new Error('WebGL not initialized');
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    const data = new Float32Array(count * 6);
    this.gl.getBufferSubData(this.gl.ARRAY_BUFFER, 0, data);

    const cells: WebGLCellData[] = [];

    for (let i = 0; i < count; i++) {
      const offset = i * 6;
      cells.push({
        value: data[offset + 0],
        previousValue: data[offset + 1],
        velocity: data[offset + 2],
        acceleration: data[offset + 3],
        timestamp: data[offset + 4],
        flags: data[offset + 5],
      });
    }

    return cells;
  }

  /**
   * Compile shader
   */
  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) {
      return null;
    }

    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Check if WebGL is supported
   */
  isAvailable(): boolean {
    return this.isSupported;
  }

  /**
   * Get device info
   */
  getDeviceInfo(): string {
    if (!this.gl) {
      return 'WebGL not initialized';
    }

    const debugInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = this.gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      return `WebGL: ${vendor} ${renderer}`;
    }

    return 'WebGL: Unknown device';
  }

  /**
   * Get performance hints
   */
  getPerformanceHints(): string[] {
    const hints: string[] = [];

    if (!this.gl) {
      return hints;
    }

    const maxVertexAttribs = this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS);
    const maxVaryingVectors = this.gl.getParameter(this.gl.MAX_VARYING_VECTORS);
    const maxTransformFeedbackSeparateAttribs = this.gl.getParameter(
      this.gl.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS,
    );

    hints.push(`Max vertex attributes: ${maxVertexAttribs}`);
    hints.push(`Max varying vectors: ${maxVaryingVectors}`);
    hints.push(`Max transform feedback attribs: ${maxTransformFeedbackSeparateAttribs}`);

    return hints;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.gl) {
      if (this.program) {
        this.gl.deleteProgram(this.program);
      }
      if (this.vao) {
        this.gl.deleteVertexArray(this.vao);
      }
      if (this.transformFeedback) {
        this.gl.deleteTransformFeedback(this.transformFeedback);
      }
    }

    this.program = null;
    this.vao = null;
    this.transformFeedback = null;
  }
}

/**
 * Singleton instance
 */
let webglInstance: WebGLFallback | null = null;

export function getWebGLFallback(): WebGLFallback | null {
  if (!webglInstance) {
    webglInstance = new WebGLFallback();
    const initialized = webglInstance.initialize();
    if (initialized) {
      webglInstance.loadComputeShaders();
    } else {
      webglInstance = null;
    }
  }
  return webglInstance;
}
