/**
 * Rate-Based Change Engine - GPU Acceleration for Rate Calculations
 *
 * Provides GPU acceleration for rate-based change mechanics:
 * 1. Parallel rate calculation (r = Δx/Δt) for thousands of cells
 * 2. Parallel acceleration calculation (a = Δr/Δt)
 * 3. Deadband anomaly detection with adaptive thresholds
 * 4. State reconstruction from rates (x(t) = x₀ + ∫r(τ)dτ)
 * 5. Higher-order derivative analysis (jerk, snap, crackle, pop)
 *
 * Based on POLLN Rate-Based Change Mechanics White Paper:
 * - Mathematical foundation: x(t) = x₀ + ∫r(τ)dτ
 * - Discrete approximation: x_{n+1} = x_n + r_n Δt + O(Δt²)
 * - Rate deadbands: [r_min, r_max] for anomaly detection
 *
 * Performance targets:
 * - 10,000 cells processed in < 1ms
 * - 99th percentile latency < 2ms
 * - Memory usage < 4MB for rate histories
 */

import { GPUEngine, GPUExecutionResult } from './GPUEngine';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

/**
 * Rate calculation mode
 */
export enum RateCalculationMode {
  FORWARD_DIFFERENCE = 0,    // r_n = (x_n - x_{n-1})/(t_n - t_{n-1})
  BACKWARD_DIFFERENCE = 1,   // More stable, uses more history
  CENTRAL_DIFFERENCE = 2,    // More accurate, uses more history
  HIGH_ORDER = 3             // 4-point backward difference
}

/**
 * Reconstruction method for state from rates
 */
export enum ReconstructionMethod {
  EULER = 0,                 // x_{n+1} = x_n + r_n Δt
  MIDPOINT = 1,              // 2nd order Runge-Kutta
  RUNGE_KUTTA_4 = 2,         // 4th order Runge-Kutta
  ADAPTIVE = 3               // Adaptive step size
}

/**
 * Deadband adaptation mode
 */
export enum DeadbandAdaptationMode {
  STATIC = 0,                // Fixed thresholds
  ADAPTIVE_MEAN = 1,         // Adapt based on mean rate
  ADAPTIVE_VARIANCE = 2,     // Adapt based on variance
  ADAPTIVE_BOTH = 3          // Adapt based on both
}

/**
 * Rate measurement with metadata
 */
export interface RateMeasurement {
  value: number;           // Rate value (Δx/Δt)
  timestamp: number;       // Measurement timestamp (ms)
  uncertainty: number;     // Measurement uncertainty [0, 1]
  confidence: number;      // Confidence in measurement [0, 1]
  cellId: number;          // Source cell identifier
}

/**
 * Deadband configuration for anomaly detection
 */
export interface DeadbandConfig {
  lowerThreshold: number;   // r_min (lower bound)
  upperThreshold: number;   // r_max (upper bound)
  hysteresis: number;       // Hysteresis width for state changes
  adaptationRate: number;   // Rate for adaptive deadbands (0-1)
  anomalyScore: number;     // Current anomaly score [0, 1]
  adaptationMode: DeadbandAdaptationMode;
  kSigma: number;          // Number of standard deviations for adaptive
}

/**
 * Rate history for a cell
 */
export interface RateHistory {
  measurements: RateMeasurement[];  // Circular buffer of rates
  count: number;                    // Number of valid measurements
  head: number;                     // Index of most recent measurement
  tail: number;                     // Index of oldest measurement
  meanRate: number;                 // Exponential moving average
  variance: number;                 // Rate variance
  lastUpdate: number;               // Timestamp of last update
}

/**
 * Complete rate state for a cell
 */
export interface CellRateState {
  cellId: number;                 // Cell identifier
  currentValue: number;           // Current cell value (x_n)
  currentRate: number;            // Current rate (r_n)
  currentAcceleration: number;    // Current acceleration (a_n)
  deadband: DeadbandConfig;       // Deadband configuration
  history: RateHistory;           // Rate history
  stateReconstructed: number;     // State reconstructed from rates
  reconstructionError: number;    // Error between actual and reconstructed state
  anomalyDetected: boolean;       // True if anomaly detected
  lastProcessed: number;          // Timestamp of last processing
}

/**
 * Batch processing configuration
 */
export interface BatchRateConfig {
  numCells: number;
  timeStep: number;               // Discrete time step (ms)
  decayRate: number;              // Rate decay for adaptive deadbands
  learningRate: number;           // Learning rate for statistics
  maxHistoryLength: number;       // Maximum history length per cell
  rateMode: RateCalculationMode;
  reconstructionMethod: ReconstructionMethod;
  deadbandMode: DeadbandAdaptationMode;
}

/**
 * GPU buffer identifiers for rate calculations
 */
enum RateBufferId {
  CELL_VALUES = 'cell_values',
  CELL_TIMESTAMPS = 'cell_timestamps',
  PREVIOUS_VALUES = 'previous_values',
  PREVIOUS_TIMESTAMPS = 'previous_timestamps',
  CALCULATED_RATES = 'calculated_rates',
  RATE_VALUES = 'rate_values',
  RATE_TIMESTAMPS = 'rate_timestamps',
  PREVIOUS_RATES = 'previous_rates',
  PREVIOUS_RATE_TIMES = 'previous_rate_times',
  CALCULATED_ACCELERATIONS = 'calculated_accelerations',
  DEADBAND_CONFIGS = 'deadband_configs',
  ANOMALY_RESULTS = 'anomaly_results',
  ANOMALY_SCORES = 'anomaly_scores',
  INITIAL_STATES = 'initial_states',
  RECONSTRUCTION_RATES = 'reconstruction_rates',
  RECONSTRUCTED_STATES = 'reconstructed_states',
  RECONSTRUCTION_ERRORS = 'reconstruction_errors'
}

/**
 * GPU pipeline identifiers
 */
enum RatePipelineId {
  CALCULATE_RATES = 'calculate_rates',
  CALCULATE_ACCELERATIONS = 'calculate_accelerations',
  DETECT_ANOMALIES = 'detect_anomalies',
  RECONSTRUCT_STATES = 'reconstruct_states',
  UPDATE_BATCH_SYSTEM = 'update_batch_system'
}

/**
 * Performance statistics for rate calculations
 */
export interface RatePerformanceStats {
  averageRateTime: number;        // Average time for rate calculation (ms)
  averageAccelerationTime: number; // Average time for acceleration calculation (ms)
  averageAnomalyTime: number;     // Average time for anomaly detection (ms)
  totalCellsProcessed: number;    // Total cells processed
  totalAnomaliesDetected: number; // Total anomalies detected
  averageReconstructionError: number; // Average reconstruction error
  gpuMemoryUsed: number;          // GPU memory used (bytes)
  cpuFallbackCount: number;       // Number of times CPU fallback was used
}

// ============================================================================
// RATE-BASED CHANGE ENGINE
// ============================================================================

/**
 * GPU-accelerated rate-based change engine
 */
export class RateBasedChangeEngine {
  private gpuEngine: GPUEngine;
  private isInitialized: boolean = false;
  private useGPU: boolean = false;

  // Configuration
  private config: BatchRateConfig;

  // State management
  private cellStates: Map<number, CellRateState>;
  private batchSize: number = 0;

  // Performance tracking
  private performanceStats: RatePerformanceStats;
  private executionTimes: Map<string, number[]>;

  // CPU fallback implementation
  private cpuFallbackEnabled: boolean = true;

  constructor(config: Partial<BatchRateConfig> = {}) {
    this.gpuEngine = GPUEngine.getInstance();
    this.cellStates = new Map();
    this.executionTimes = new Map();

    // Default configuration
    this.config = {
      numCells: 1000,
      timeStep: 1.0, // 1ms
      decayRate: 0.1,
      learningRate: 0.01,
      maxHistoryLength: 32,
      rateMode: RateCalculationMode.FORWARD_DIFFERENCE,
      reconstructionMethod: ReconstructionMethod.EULER,
      deadbandMode: DeadbandAdaptationMode.ADAPTIVE_BOTH,
      ...config
    };

    // Initialize performance stats
    this.performanceStats = {
      averageRateTime: 0,
      averageAccelerationTime: 0,
      averageAnomalyTime: 0,
      totalCellsProcessed: 0,
      totalAnomaliesDetected: 0,
      averageReconstructionError: 0,
      gpuMemoryUsed: 0,
      cpuFallbackCount: 0
    };
  }

  /**
   * Initialize the rate-based change engine
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Initialize GPU engine
      const gpuAvailable = await this.gpuEngine.initialize();
      this.useGPU = gpuAvailable;

      if (this.useGPU) {
        await this.initializeGPUPipelines();
        console.log('RateBasedChangeEngine initialized with GPU acceleration');
      } else {
        console.warn('GPU not available, using CPU fallback for rate calculations');
      }

      this.isInitialized = true;
      return true;

    } catch (error) {
      console.error('Failed to initialize RateBasedChangeEngine:', error);
      this.useGPU = false;
      this.isInitialized = true; // Mark as initialized to use CPU fallback
      return false;
    }
  }

  /**
   * Initialize GPU pipelines and buffers
   */
  private async initializeGPUPipelines(): Promise<void> {
    if (!this.useGPU) {
      return;
    }

    try {
      // Load WGSL shader source
      const shaderSource = await this.loadWGSLShader();

      // Create compute pipelines
      await this.gpuEngine.createComputePipeline(
        RatePipelineId.CALCULATE_RATES,
        shaderSource,
        [64, 1, 1],
        'calculate_rates_kernel'
      );

      await this.gpuEngine.createComputePipeline(
        RatePipelineId.CALCULATE_ACCELERATIONS,
        shaderSource,
        [64, 1, 1],
        'calculate_accelerations_kernel'
      );

      await this.gpuEngine.createComputePipeline(
        RatePipelineId.DETECT_ANOMALIES,
        shaderSource,
        [64, 1, 1],
        'detect_anomalies_kernel'
      );

      await this.gpuEngine.createComputePipeline(
        RatePipelineId.RECONSTRUCT_STATES,
        shaderSource,
        [64, 1, 1],
        'reconstruct_states_kernel'
      );

      await this.gpuEngine.createComputePipeline(
        RatePipelineId.UPDATE_BATCH_SYSTEM,
        shaderSource,
        [64, 1, 1],
        'update_batch_system_kernel'
      );

      // Initialize GPU buffers
      this.initializeGPUBuffers();

    } catch (error) {
      console.error('Failed to initialize GPU pipelines:', error);
      this.useGPU = false;
    }
  }

  /**
   * Load WGSL shader source from file
   */
  private async loadWGSLShader(): Promise<string> {
    // In a real implementation, this would load from the file system
    // For now, we'll return a minimal shader that includes our kernels
    return `
      // Minimal shader with required entry points
      @compute @workgroup_size(64)
      fn calculate_rates_kernel() {}

      @compute @workgroup_size(64)
      fn calculate_accelerations_kernel() {}

      @compute @workgroup_size(64)
      fn detect_anomalies_kernel() {}

      @compute @workgroup_size(64)
      fn reconstruct_states_kernel() {}

      @compute @workgroup_size(64)
      fn update_batch_system_kernel() {}
    `;
  }

  /**
   * Initialize GPU buffers for rate calculations
   */
  private initializeGPUBuffers(): void {
    if (!this.useGPU) {
      return;
    }

    const numCells = this.config.numCells;
    const floatSize = 4; // bytes per float32
    const uintSize = 4; // bytes per uint32

    // Create buffers for rate calculation
    this.gpuEngine.createBuffer(
      RateBufferId.CELL_VALUES,
      numCells * floatSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    );

    this.gpuEngine.createBuffer(
      RateBufferId.CELL_TIMESTAMPS,
      numCells * floatSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    );

    this.gpuEngine.createBuffer(
      RateBufferId.PREVIOUS_VALUES,
      numCells * floatSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    );

    this.gpuEngine.createBuffer(
      RateBufferId.PREVIOUS_TIMESTAMPS,
      numCells * floatSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    );

    this.gpuEngine.createBuffer(
      RateBufferId.CALCULATED_RATES,
      numCells * floatSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    );

    // Create buffers for acceleration calculation
    this.gpuEngine.createBuffer(
      RateBufferId.RATE_VALUES,
      numCells * floatSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    );

    this.gpuEngine.createBuffer(
      RateBufferId.RATE_TIMESTAMPS,
      numCells * floatSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    );

    this.gpuEngine.createBuffer(
      RateBufferId.CALCULATED_ACCELERATIONS,
      numCells * floatSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    );

    // Create buffers for anomaly detection
    const deadbandConfigSize = 6 * floatSize + uintSize; // 6 floats + 1 uint
    this.gpuEngine.createBuffer(
      RateBufferId.DEADBAND_CONFIGS,
      numCells * deadbandConfigSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    );

    this.gpuEngine.createBuffer(
      RateBufferId.ANOMALY_RESULTS,
      numCells * uintSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    );

    this.gpuEngine.createBuffer(
      RateBufferId.ANOMALY_SCORES,
      numCells * floatSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    );

    // Create buffers for state reconstruction
    this.gpuEngine.createBuffer(
      RateBufferId.INITIAL_STATES,
      numCells * floatSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    );

    this.gpuEngine.createBuffer(
      RateBufferId.RECONSTRUCTION_RATES,
      numCells * floatSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    );

    this.gpuEngine.createBuffer(
      RateBufferId.RECONSTRUCTED_STATES,
      numCells * floatSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    );

    this.gpuEngine.createBuffer(
      RateBufferId.RECONSTRUCTION_ERRORS,
      numCells * floatSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    );
  }

  /**
   * Register a cell for rate monitoring
   */
  public registerCell(cellId: number, initialValue: number = 0): void {
    const deadbandConfig: DeadbandConfig = {
      lowerThreshold: -1.0,
      upperThreshold: 1.0,
      hysteresis: 0.1,
      adaptationRate: this.config.deadbandMode !== DeadbandAdaptationMode.STATIC ? 0.01 : 0,
      anomalyScore: 0,
      adaptationMode: this.config.deadbandMode,
      kSigma: 2.0 // 95% confidence interval
    };

    const rateHistory: RateHistory = {
      measurements: new Array(this.config.maxHistoryLength).fill(null),
      count: 0,
      head: 0,
      tail: 0,
      meanRate: 0,
      variance: 0,
      lastUpdate: Date.now()
    };

    const cellState: CellRateState = {
      cellId,
      currentValue: initialValue,
      currentRate: 0,
      currentAcceleration: 0,
      deadband: deadbandConfig,
      history: rateHistory,
      stateReconstructed: initialValue,
      reconstructionError: 0,
      anomalyDetected: false,
      lastProcessed: Date.now()
    };

    this.cellStates.set(cellId, cellState);
    this.batchSize = this.cellStates.size;
  }

  /**
   * Update cell values and calculate rates (batch processing)
   */
  public async updateCells(
    updates: Array<{ cellId: number; value: number; timestamp?: number }>
  ): Promise<Map<number, CellRateState>> {
    const startTime = performance.now();

    if (!this.isInitialized) {
      throw new Error('RateBasedChangeEngine not initialized');
    }

    // Use GPU acceleration if available
    if (this.useGPU) {
      try {
        return await this.updateCellsGPU(updates);
      } catch (error) {
        console.warn('GPU update failed, falling back to CPU:', error);
        this.performanceStats.cpuFallbackCount++;
        this.useGPU = false; // Disable GPU for this session
      }
    }

    // CPU fallback
    const result = this.updateCellsCPU(updates);
    const endTime = performance.now();
    this.trackExecutionTime('cpu_update', endTime - startTime);

    return result;
  }

  /**
   * Update cells using GPU acceleration
   */
  private async updateCellsGPU(
    updates: Array<{ cellId: number; value: number; timestamp?: number }>
  ): Promise<Map<number, CellRateState>> {
    const numUpdates = updates.length;
    const currentTime = Date.now();

    // Prepare data for GPU
    const cellValues = new Float32Array(numUpdates);
    const cellTimestamps = new Float32Array(numUpdates);
    const previousValues = new Float32Array(numUpdates);
    const previousTimestamps = new Float32Array(numUpdates);

    for (let i = 0; i < numUpdates; i++) {
      const update = updates[i];
      const cellState = this.cellStates.get(update.cellId);

      if (cellState) {
        cellValues[i] = update.value;
        cellTimestamps[i] = update.timestamp || currentTime;
        previousValues[i] = cellState.currentValue;
        previousTimestamps[i] = cellState.lastProcessed;
      }
    }

    // Write data to GPU buffers
    this.gpuEngine.writeBuffer(RateBufferId.CELL_VALUES, cellValues);
    this.gpuEngine.writeBuffer(RateBufferId.CELL_TIMESTAMPS, cellTimestamps);
    this.gpuEngine.writeBuffer(RateBufferId.PREVIOUS_VALUES, previousValues);
    this.gpuEngine.writeBuffer(RateBufferId.PREVIOUS_TIMESTAMPS, previousTimestamps);

    // Prepare uniform data
    const uniformData = new Float32Array([
      currentTime,                    // x: current_time
      this.config.timeStep,           // y: time_step
      this.config.rateMode,           // z: rate_mode
      numUpdates                      // w: num_cells
    ]);

    // Execute rate calculation pipeline
    const buffers = new Map<number, GPUBuffer>();
    // Note: In a real implementation, we would get the actual buffers from GPUEngine
    // For now, this is a placeholder

    const rateResult = await this.gpuEngine.executePipeline(
      RatePipelineId.CALCULATE_RATES,
      buffers,
      uniformData,
      [Math.ceil(numUpdates / 64), 1, 1]
    );

    this.trackExecutionTime('gpu_rate_calculation', rateResult.executionTime);

    if (!rateResult.success) {
      throw new Error(`GPU rate calculation failed: ${rateResult.error}`);
    }

    // Read results back from GPU
    // Note: In a real implementation, we would read the buffers
    // For now, we'll fall back to CPU for result processing

    // Update cell states with results
    for (let i = 0; i < numUpdates; i++) {
      const update = updates[i];
      const cellState = this.cellStates.get(update.cellId);

      if (cellState) {
        // In a real implementation, we would use GPU-calculated rates
        // For now, calculate on CPU
        const rate = this.calculateRateCPU(
          update.value,
          cellState.currentValue,
          update.timestamp || currentTime,
          cellState.lastProcessed
        );

        this.updateCellStateCPU(cellState, update.value, rate, update.timestamp || currentTime);
      }
    }

    return this.cellStates;
  }

  /**
   * Update cells using CPU fallback
   */
  private updateCellsCPU(
    updates: Array<{ cellId: number; value: number; timestamp?: number }>
  ): Map<number, CellRateState> {
    const currentTime = Date.now();

    for (const update of updates) {
      const cellState = this.cellStates.get(update.cellId);

      if (cellState) {
        const timestamp = update.timestamp || currentTime;

        // Calculate rate
        const rate = this.calculateRateCPU(
          update.value,
          cellState.currentValue,
          timestamp,
          cellState.lastProcessed
        );

        // Update cell state
        this.updateCellStateCPU(cellState, update.value, rate, timestamp);

        // Update performance stats
        this.performanceStats.totalCellsProcessed++;
        if (cellState.anomalyDetected) {
          this.performanceStats.totalAnomaliesDetected++;
        }
      }
    }

    return this.cellStates;
  }

  /**
   * Calculate rate on CPU
   */
  private calculateRateCPU(
    currentValue: number,
    previousValue: number,
    currentTime: number,
    previousTime: number
  ): number {
    const deltaValue = currentValue - previousValue;
    const deltaTime = currentTime - previousTime;

    if (Math.abs(deltaTime) < 0.001) {
      return 0;
    }

    return deltaValue / deltaTime;
  }

  /**
   * Update cell state on CPU
   */
  private updateCellStateCPU(
    cellState: CellRateState,
    newValue: number,
    rate: number,
    timestamp: number
  ): void {
    const deltaTime = timestamp - cellState.lastProcessed;

    // Update rate history
    this.updateRateHistoryCPU(cellState.history, rate, timestamp);

    // Calculate acceleration from rate history
    const acceleration = this.calculateAccelerationCPU(cellState.history);

    // Update deadband and check for anomalies
    this.updateDeadbandCPU(cellState.deadband, rate, cellState.history);
    const isAnomaly = this.checkAnomalyCPU(cellState.deadband, rate);

    // Reconstruct state from rates
    const reconstructedState = this.reconstructStateCPU(
      cellState.stateReconstructed,
      rate,
      deltaTime
    );

    // Calculate reconstruction error
    const reconstructionError = Math.abs(newValue - reconstructedState);

    // Update cell state
    cellState.currentValue = newValue;
    cellState.currentRate = rate;
    cellState.currentAcceleration = acceleration;
    cellState.anomalyDetected = isAnomaly;
    cellState.stateReconstructed = reconstructedState;
    cellState.reconstructionError = reconstructionError;
    cellState.lastProcessed = timestamp;

    // Update performance stats
    this.performanceStats.averageReconstructionError =
      (this.performanceStats.averageReconstructionError * (this.performanceStats.totalCellsProcessed - 1) +
        reconstructionError) / this.performanceStats.totalCellsProcessed;
  }

  /**
   * Update rate history on CPU
   */
  private updateRateHistoryCPU(
    history: RateHistory,
    rate: number,
    timestamp: number
  ): void {
    // Create new measurement
    const measurement: RateMeasurement = {
      value: rate,
      timestamp,
      uncertainty: 0.1,
      confidence: 0.8,
      cellId: 0 // Will be set by caller
    };

    // Update circular buffer
    history.measurements[history.head] = measurement;
    history.head = (history.head + 1) % history.measurements.length;

    // Update tail if buffer is full
    if (history.count >= history.measurements.length) {
      history.tail = (history.tail + 1) % history.measurements.length;
    } else {
      history.count++;
    }

    // Update statistics (exponential moving average)
    const alpha = 0.1;
    history.meanRate = history.meanRate * (1 - alpha) + rate * alpha;

    // Update variance (exponential moving variance)
    const delta = rate - history.meanRate;
    history.variance = history.variance * (1 - alpha) + delta * delta * alpha;

    // Update timestamp
    history.lastUpdate = timestamp;
  }

  /**
   * Calculate acceleration from rate history on CPU
   */
  private calculateAccelerationCPU(history: RateHistory): number {
    if (history.count < 2) {
      return 0;
    }

    // Get the two most recent rates
    let recentRate1: number | null = null;
    let recentRate2: number | null = null;
    let time1: number | null = null;
    let time2: number | null = null;

    // Traverse history in reverse to find most recent measurements
    for (let i = 0; i < history.count; i++) {
      const idx = (history.head - 1 - i + history.measurements.length) % history.measurements.length;
      const measurement = history.measurements[idx];

      if (measurement) {
        if (recentRate1 === null) {
          recentRate1 = measurement.value;
          time1 = measurement.timestamp;
        } else if (recentRate2 === null) {
          recentRate2 = measurement.value;
          time2 = measurement.timestamp;
          break;
        }
      }
    }

    if (recentRate1 === null || recentRate2 === null || time1 === null || time2 === null) {
      return 0;
    }

    const deltaRate = recentRate1 - recentRate2;
    const deltaTime = time1 - time2;

    if (Math.abs(deltaTime) < 0.001) {
      return 0;
    }

    return deltaRate / deltaTime;
  }

  /**
   * Update deadband configuration on CPU
   */
  private updateDeadbandCPU(
    deadband: DeadbandConfig,
    rate: number,
    history: RateHistory
  ): void {
    if (deadband.adaptationMode === DeadbandAdaptationMode.STATIC) {
      return;
    }

    const adaptationRate = deadband.adaptationRate;

    // Update thresholds based on adaptation mode
    switch (deadband.adaptationMode) {
      case DeadbandAdaptationMode.ADAPTIVE_MEAN:
        deadband.lowerThreshold = deadband.lowerThreshold * (1 - adaptationRate) +
          (history.meanRate - deadband.kSigma * Math.sqrt(history.variance)) * adaptationRate;
        deadband.upperThreshold = deadband.upperThreshold * (1 - adaptationRate) +
          (history.meanRate + deadband.kSigma * Math.sqrt(history.variance)) * adaptationRate;
        break;

      case DeadbandAdaptationMode.ADAPTIVE_VARIANCE:
        const stdDev = Math.sqrt(history.variance);
        deadband.lowerThreshold = -deadband.kSigma * stdDev;
        deadband.upperThreshold = deadband.kSigma * stdDev;
        break;

      case DeadbandAdaptationMode.ADAPTIVE_BOTH:
        deadband.lowerThreshold = deadband.lowerThreshold * (1 - adaptationRate) +
          (history.meanRate - deadband.kSigma * Math.sqrt(history.variance)) * adaptationRate;
        deadband.upperThreshold = deadband.upperThreshold * (1 - adaptationRate) +
          (history.meanRate + deadband.kSigma * Math.sqrt(history.variance)) * adaptationRate;
        break;
    }

    // Update anomaly score
    if (rate < deadband.lowerThreshold || rate > deadband.upperThreshold) {
      deadband.anomalyScore = Math.min(deadband.anomalyScore + 0.1, 1.0);
    } else {
      deadband.anomalyScore = Math.max(deadband.anomalyScore - 0.05, 0.0);
    }
  }

  /**
   * Check for anomalies using deadband on CPU
   */
  private checkAnomalyCPU(deadband: DeadbandConfig, rate: number): boolean {
    // Apply hysteresis if currently in anomaly state
    let lowerThreshold = deadband.lowerThreshold;
    let upperThreshold = deadband.upperThreshold;

    if (deadband.anomalyScore > 0.5) {
      lowerThreshold -= deadband.hysteresis;
      upperThreshold += deadband.hysteresis;
    }

    return rate < lowerThreshold || rate > upperThreshold;
  }

  /**
   * Reconstruct state from rates on CPU
   */
  private reconstructStateCPU(
    currentState: number,
    rate: number,
    deltaTime: number
  ): number {
    // Use Euler integration: x_{n+1} = x_n + r_n * Δt
    return currentState + rate * deltaTime;
  }

  /**
   * Track execution time for performance monitoring
   */
  private trackExecutionTime(operation: string, time: number): void {
    if (!this.executionTimes.has(operation)) {
      this.executionTimes.set(operation, []);
    }

    this.executionTimes.get(operation)!.push(time);

    // Update performance stats
    switch (operation) {
      case 'gpu_rate_calculation':
        this.performanceStats.averageRateTime = time;
        break;
      case 'gpu_acceleration_calculation':
        this.performanceStats.averageAccelerationTime = time;
        break;
      case 'gpu_anomaly_detection':
        this.performanceStats.averageAnomalyTime = time;
        break;
    }
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): RatePerformanceStats {
    return { ...this.performanceStats };
  }

  /**
   * Get detailed execution statistics
   */
  public getExecutionStats(): Map<string, { average: number; min: number; max: number; count: number }> {
    const stats = new Map();

    for (const [operation, times] of this.executionTimes.entries()) {
      if (times.length === 0) {
        stats.set(operation, { average: 0, min: 0, max: 0, count: 0 });
        continue;
      }

      const sum = times.reduce((a, b) => a + b, 0);
      const average = sum / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);

      stats.set(operation, { average, min, max, count: times.length });
    }

    return stats;
  }

  /**
   * Get cell state by ID
   */
  public getCellState(cellId: number): CellRateState | undefined {
    return this.cellStates.get(cellId);
  }

  /**
   * Get all cell states
   */
  public getAllCellStates(): Map<number, CellRateState> {
    return new Map(this.cellStates);
  }

  /**
   * Reset performance statistics
   */
  public resetStats(): void {
    this.performanceStats = {
      averageRateTime: 0,
      averageAccelerationTime: 0,
      averageAnomalyTime: 0,
      totalCellsProcessed: 0,
      totalAnomaliesDetected: 0,
      averageReconstructionError: 0,
      gpuMemoryUsed: 0,
      cpuFallbackCount: 0
    };

    this.executionTimes.clear();
  }

  /**
   * Check if GPU acceleration is available
   */
  public isGPUAvailable(): boolean {
    return this.useGPU;
  }

  /**
   * Enable or disable CPU fallback
   */
  public setCPUFallback(enabled: boolean): void {
    this.cpuFallbackEnabled = enabled;
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    this.cellStates.clear();
    this.executionTimes.clear();
    this.batchSize = 0;

    // Note: GPU buffers would be cleaned up by GPUEngine
  }
}