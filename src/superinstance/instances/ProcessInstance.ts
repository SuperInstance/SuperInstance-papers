/**
 * ProcessInstance - Implementation for computational process instances
 *
 * Represents running computational processes that can be started, stopped,
 * monitored, and interacted with via standard I/O streams.
 */

import {
  BaseSuperInstance, InstanceType, InstanceState, InstanceCapability,
  CellPosition, InstanceConfiguration, InstancePermissions,
  InstanceMessage, InstanceMessageResponse, InstanceStatus, InstanceMetrics,
  Connection, ConnectionType, InstanceSnapshot, ValidationResult
} from '../types/base';

/**
 * ProcessSignal - Signals that can be sent to processes
 */
export enum ProcessSignal {
  SIGINT = 'SIGINT',    // Interrupt from keyboard
  SIGTERM = 'SIGTERM',  // Termination signal
  SIGKILL = 'SIGKILL',  // Kill signal (cannot be caught)
  SIGHUP = 'SIGHUP',    // Hangup detected on controlling terminal
  SIGUSR1 = 'SIGUSR1',  // User-defined signal 1
  SIGUSR2 = 'SIGUSR2',  // User-defined signal 2
}

/**
 * StdioConfiguration - Standard I/O configuration
 */
export interface StdioConfiguration {
  stdin: 'pipe' | 'inherit' | 'ignore' | 'file';
  stdout: 'pipe' | 'inherit' | 'ignore' | 'file';
  stderr: 'pipe' | 'inherit' | 'ignore' | 'file';
  stdinFile?: string;
  stdoutFile?: string;
  stderrFile?: string;
}

/**
 * ResourceUsage - Process resource usage statistics
 */
export interface ResourceUsage {
  cpuTime: number;      // CPU time in milliseconds
  memory: number;       // Memory usage in bytes
  diskRead: number;     // Disk read in bytes
  diskWrite: number;    // Disk write in bytes
  networkIn: number;    // Network input in bytes
  networkOut: number;   // Network output in bytes
}

/**
 * StackFrame - Stack frame for debugging
 */
export interface StackFrame {
  function: string;
  file: string;
  line: number;
  column: number;
}

/**
 * ProfileData - Profiling data
 */
export interface ProfileData {
  samples: ProfileSample[];
  duration: number;
  startTime: number;
  endTime: number;
}

/**
 * ProfileSample - Single profiling sample
 */
export interface ProfileSample {
  timestamp: number;
  stack: StackFrame[];
  memory: number;
  cpu: number;
}

/**
 * DebuggerSession - Debugger session interface
 */
export interface DebuggerSession {
  id: string;
  breakpoints: Breakpoint[];
  paused: boolean;
  currentFrame?: StackFrame;
  variables: Record<string, any>;
}

/**
 * Breakpoint - Debugger breakpoint
 */
export interface Breakpoint {
  id: string;
  file: string;
  line: number;
  enabled: boolean;
  condition?: string;
}

/**
 * SignalHandler - Signal handler function
 */
export type SignalHandler = (signal: ProcessSignal) => void;

/**
 * ProcessInstance - Interface for process instances
 */
export interface ProcessInstance {
  type: InstanceType.PROCESS;

  // Process-specific properties
  pid?: number;
  command: string;
  arguments: string[];
  workingDirectory: string;
  environment: Record<string, string>;
  stdio: StdioConfiguration;

  // Process lifecycle
  start(): Promise<void>;
  stop(signal?: ProcessSignal): Promise<void>;
  kill(): Promise<void>;
  restart(): Promise<void>;

  // Process monitoring
  getExitCode(): Promise<number | null>;
  getResourceUsage(): Promise<ResourceUsage>;
  getChildren(): Promise<ProcessInstance[]>;
  isRunning(): Promise<boolean>;

  // I/O operations
  writeToStdin(data: string | Buffer): Promise<void>;
  readFromStdout(): Promise<string>;
  readFromStderr(): Promise<string>;
  pipeTo(target: ProcessInstance | any): Promise<void>;

  // Signal handling
  sendSignal(signal: ProcessSignal): Promise<void>;
  onSignal(handler: SignalHandler): void;

  // Debugging
  attachDebugger(): Promise<DebuggerSession>;
  getStackTrace(): Promise<StackFrame[]>;
  profile(duration: number): Promise<ProfileData>;
}

/**
 * ConcreteProcessInstance - Implementation of ProcessInstance
 */
export class ConcreteProcessInstance extends BaseSuperInstance implements ProcessInstance {
  type = InstanceType.PROCESS;
  pid?: number;
  command: string;
  arguments: string[];
  workingDirectory: string;
  environment: Record<string, string>;
  stdio: StdioConfiguration;

  private process: any = null; // In browser, this would be a Web Worker or similar
  private signalHandlers: Map<ProcessSignal, SignalHandler[]> = new Map();
  private stdoutBuffer: string[] = [];
  private stderrBuffer: string[] = [];
  private stdinQueue: (string | Buffer)[] = [];
  private exitCode: number | null = null;
  private startTime: number = 0;
  private resourceUsage: ResourceUsage = {
    cpuTime: 0,
    memory: 0,
    diskRead: 0,
    diskWrite: 0,
    networkIn: 0,
    networkOut: 0
  };

  private connections: Map<string, Connection> = new Map();
  private children: SuperInstance[] = [];
  private parents: SuperInstance[] = [];
  private debuggerSession?: DebuggerSession;
  private profiling: boolean = false;
  private profileData: ProfileSample[] = [];

  constructor(config: {
    id: string;
    name: string;
    description: string;
    cellPosition: CellPosition;
    spreadsheetId: string;
    command: string;
    arguments?: string[];
    workingDirectory?: string;
    environment?: Record<string, string>;
    stdio?: Partial<StdioConfiguration>;
    configuration?: Partial<InstanceConfiguration>;
  }) {
    super({
      id: config.id,
      type: InstanceType.PROCESS,
      name: config.name,
      description: config.description,
      cellPosition: config.cellPosition,
      spreadsheetId: config.spreadsheetId,
      configuration: config.configuration,
      capabilities: ['execute', 'computation', 'communication', 'monitoring']
    });

    this.command = config.command;
    this.arguments = config.arguments || [];
    this.workingDirectory = config.workingDirectory || '/';
    this.environment = config.environment || {};
    this.stdio = {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      ...config.stdio
    };
  }

  async initialize(config?: Partial<InstanceConfiguration>): Promise<void> {
    if (config) {
      this.configuration = { ...this.configuration, ...config };
    }

    const validation = this.validateConfiguration(this.configuration);
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Initialize process environment
    await this.initializeEnvironment();
    this.updateState(InstanceState.INITIALIZED);
  }

  async activate(): Promise<void> {
    if (this.state !== InstanceState.INITIALIZED && this.state !== InstanceState.IDLE) {
      throw new Error(`Cannot activate from state: ${this.state}`);
    }

    // In a real implementation, this would start the actual process
    // For now, we simulate process startup
    this.startTime = Date.now();
    this.pid = Math.floor(Math.random() * 10000) + 1000; // Simulated PID
    this.updateState(InstanceState.STARTING);

    // Simulate process startup delay
    await new Promise(resolve => setTimeout(resolve, 100));

    this.updateState(InstanceState.RUNNING);

    // Start simulated process execution
    this.simulateProcessExecution();
  }

  async deactivate(): Promise<void> {
    if (this.state !== InstanceState.RUNNING && this.state !== InstanceState.PROCESSING) {
      throw new Error(`Cannot deactivate from state: ${this.state}`);
    }

    await this.stop(ProcessSignal.SIGTERM);
    this.updateState(InstanceState.IDLE);
  }

  async terminate(): Promise<void> {
    // Kill the process if it's running
    if (await this.isRunning()) {
      await this.kill();
    }

    // Clean up connections
    this.connections.clear();
    this.children = [];
    this.parents = [];
    this.signalHandlers.clear();
    this.stdoutBuffer = [];
    this.stderrBuffer = [];
    this.stdinQueue = [];

    this.updateState(InstanceState.TERMINATED);
  }

  async serialize(): Promise<InstanceSnapshot> {
    return {
      id: this.id,
      type: this.type,
      state: this.state,
      data: {
        command: this.command,
        arguments: this.arguments,
        workingDirectory: this.workingDirectory,
        environment: this.environment,
        stdio: this.stdio,
        exitCode: this.exitCode,
        resourceUsage: this.resourceUsage
      },
      configuration: this.configuration,
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }

  async deserialize(snapshot: InstanceSnapshot): Promise<void> {
    if (snapshot.type !== InstanceType.PROCESS) {
      throw new Error(`Cannot deserialize snapshot of type ${snapshot.type} into ProcessInstance`);
    }

    const data = snapshot.data;
    this.command = data.command;
    this.arguments = data.arguments;
    this.workingDirectory = data.workingDirectory;
    this.environment = data.environment;
    this.stdio = data.stdio;
    this.exitCode = data.exitCode;
    this.resourceUsage = data.resourceUsage;

    this.configuration = snapshot.configuration;
    this.updateState(snapshot.state as InstanceState);
  }

  async sendMessage(message: InstanceMessage): Promise<InstanceMessageResponse> {
    try {
      await this.receiveMessage(message);
      return {
        messageId: message.id,
        status: 'success',
        payload: { received: true, timestamp: Date.now() }
      };
    } catch (error) {
      return {
        messageId: message.id,
        status: 'error',
        error: {
          code: 'MESSAGE_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true,
          context: { messageType: message.type }
        }
      };
    }
  }

  async receiveMessage(message: InstanceMessage): Promise<void> {
    switch (message.type) {
      case 'command':
        await this.handleCommandMessage(message);
        break;
      case 'data':
        await this.handleDataMessage(message);
        break;
      case 'signal':
        await this.handleSignalMessage(message);
        break;
      default:
        console.warn(`Unhandled message type: ${message.type}`);
    }
  }

  async getStatus(): Promise<InstanceStatus> {
    const isRunning = await this.isRunning();

    return {
      state: this.state,
      health: this.calculateHealth(),
      uptime: isRunning ? Date.now() - this.startTime : 0,
      warnings: this.getWarnings(),
      lastError: undefined
    };
  }

  async getMetrics(): Promise<InstanceMetrics> {
    const usage = await this.getResourceUsage();
    const isRunning = await this.isRunning();

    return {
      cpuUsage: isRunning ? usage.cpuTime / (Date.now() - this.startTime) * 100 : 0,
      memoryUsage: usage.memory / 1024 / 1024, // Convert to MB
      diskUsage: (usage.diskRead + usage.diskWrite) / 1024 / 1024, // Convert to MB
      networkIn: usage.networkIn,
      networkOut: usage.networkOut,
      requestCount: this.stdinQueue.length,
      errorRate: this.stderrBuffer.length > 100 ? 0.1 : 0,
      latency: { p50: 10, p90: 50, p95: 100, p99: 500, max: 1000 }
    };
  }

  async getChildren(): Promise<SuperInstance[]> {
    return [...this.children];
  }

  async getParents(): Promise<SuperInstance[]> {
    return [...this.parents];
  }

  async getNeighbors(): Promise<SuperInstance[]> {
    // In a real implementation, this would query the spreadsheet for neighboring cells
    return [];
  }

  async connectTo(target: SuperInstance, connectionType: ConnectionType): Promise<Connection> {
    const connection: Connection = {
      id: `${this.id}-${target.id}-${Date.now()}`,
      source: this.id,
      target: target.id,
      type: connectionType,
      bandwidth: 1000, // 1 Gbps
      latency: 10, // 10ms
      reliability: 0.99,
      establishedAt: Date.now()
    };

    this.connections.set(connection.id, connection);

    // If connecting to another process, set up piping
    if (connectionType === ConnectionType.STREAM && target.type === InstanceType.PROCESS) {
      await this.pipeTo(target as ProcessInstance);
    }

    return connection;
  }

  async disconnectFrom(target: SuperInstance): Promise<void> {
    for (const [id, connection] of this.connections) {
      if (connection.target === target.id) {
        this.connections.delete(id);
        break;
      }
    }
  }

  // ProcessInstance specific methods

  async start(): Promise<void> {
    if (await this.isRunning()) {
      throw new Error('Process is already running');
    }

    this.updateState(InstanceState.STARTING);
    this.startTime = Date.now();
    this.exitCode = null;

    // In a real implementation, this would spawn the actual process
    // For simulation, we create a simulated process
    this.pid = Math.floor(Math.random() * 10000) + 1000;

    // Simulate startup delay
    await new Promise(resolve => setTimeout(resolve, 100));

    this.updateState(InstanceState.RUNNING);
    this.simulateProcessExecution();
  }

  async stop(signal: ProcessSignal = ProcessSignal.SIGTERM): Promise<void> {
    if (!await this.isRunning()) {
      throw new Error('Process is not running');
    }

    this.updateState(InstanceState.STOPPING);

    // Send signal to process
    await this.sendSignal(signal);

    // Simulate graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate process exit
    this.exitCode = 0;
    this.pid = undefined;
    this.updateState(InstanceState.STOPPED);
  }

  async kill(): Promise<void> {
    if (!await this.isRunning()) {
      return;
    }

    this.updateState(InstanceState.STOPPING);

    // Send kill signal
    await this.sendSignal(ProcessSignal.SIGKILL);

    // Immediate termination
    this.exitCode = 137; // SIGKILL exit code
    this.pid = undefined;
    this.updateState(InstanceState.TERMINATED);
  }

  async restart(): Promise<void> {
    if (await this.isRunning()) {
      await this.stop();
    }

    await new Promise(resolve => setTimeout(resolve, 100));
    await this.start();
  }

  async getExitCode(): Promise<number | null> {
    return this.exitCode;
  }

  async getResourceUsage(): Promise<ResourceUsage> {
    if (!await this.isRunning()) {
      return this.resourceUsage;
    }

    // Simulate resource usage
    const uptime = Date.now() - this.startTime;
    return {
      cpuTime: uptime * 0.1, // 10% CPU usage
      memory: 50 * 1024 * 1024, // 50 MB
      diskRead: this.stdinQueue.length * 1024, // 1KB per input
      diskWrite: (this.stdoutBuffer.length + this.stderrBuffer.length) * 512, // 512B per output
      networkIn: this.connections.size * 1024,
      networkOut: this.connections.size * 2048
    };
  }

  async getChildrenProcesses(): Promise<ProcessInstance[]> {
    // In a real implementation, this would return child processes
    return [];
  }

  async isRunning(): Promise<boolean> {
    return this.state === InstanceState.RUNNING || this.state === InstanceState.PROCESSING;
  }

  async writeToStdin(data: string | Buffer): Promise<void> {
    if (!await this.isRunning()) {
      throw new Error('Process is not running');
    }

    const dataStr = typeof data === 'string' ? data : data.toString();
    this.stdinQueue.push(dataStr);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 10));

    // Simulate output generation
    this.stdoutBuffer.push(`Processed: ${dataStr.substring(0, 50)}...`);
  }

  async readFromStdout(): Promise<string> {
    if (this.stdoutBuffer.length === 0) {
      return '';
    }

    const output = this.stdoutBuffer.join('\n');
    this.stdoutBuffer = [];
    return output;
  }

  async readFromStderr(): Promise<string> {
    if (this.stderrBuffer.length === 0) {
      return '';
    }

    const output = this.stderrBuffer.join('\n');
    this.stderrBuffer = [];
    return output;
  }

  async pipeTo(target: ProcessInstance | any): Promise<void> {
    // In a real implementation, this would set up piping between processes
    // For simulation, we just log the connection
    console.log(`Piping from ${this.id} to ${target.id || target}`);
  }

  async sendSignal(signal: ProcessSignal): Promise<void> {
    if (!await this.isRunning()) {
      throw new Error('Process is not running');
    }

    // Call signal handlers
    const handlers = this.signalHandlers.get(signal) || [];
    for (const handler of handlers) {
      try {
        handler(signal);
      } catch (error) {
        console.error(`Error in signal handler for ${signal}:`, error);
      }
    }

    // Handle specific signals
    switch (signal) {
      case ProcessSignal.SIGINT:
      case ProcessSignal.SIGTERM:
        // Graceful shutdown
        await this.stop(signal);
        break;
      case ProcessSignal.SIGKILL:
        // Forceful termination
        await this.kill();
        break;
    }
  }

  onSignal(handler: SignalHandler): void {
    // Add handler for all signals by default
    for (const signal of Object.values(ProcessSignal)) {
      if (!this.signalHandlers.has(signal)) {
        this.signalHandlers.set(signal, []);
      }
      this.signalHandlers.get(signal)!.push(handler);
    }
  }

  async attachDebugger(): Promise<DebuggerSession> {
    if (!await this.isRunning()) {
      throw new Error('Process is not running');
    }

    this.debuggerSession = {
      id: `debug-${this.id}-${Date.now()}`,
      breakpoints: [],
      paused: false,
      variables: {}
    };

    return this.debuggerSession;
  }

  async getStackTrace(): Promise<StackFrame[]> {
    if (!await this.isRunning()) {
      return [];
    }

    // Simulated stack trace
    return [
      {
        function: 'main',
        file: this.command,
        line: 1,
        column: 1
      },
      {
        function: 'processInput',
        file: 'internal/process.js',
        line: 42,
        column: 15
      }
    ];
  }

  async profile(duration: number): Promise<ProfileData> {
    if (!await this.isRunning()) {
      throw new Error('Process is not running');
    }

    if (this.profiling) {
      throw new Error('Profiling already in progress');
    }

    this.profiling = true;
    this.profileData = [];
    const startTime = Date.now();

    // Simulate profiling
    const interval = setInterval(() => {
      if (!this.profiling || Date.now() - startTime >= duration) {
        clearInterval(interval);
        this.profiling = false;
        return;
      }

      this.profileData.push({
        timestamp: Date.now(),
        stack: [
          {
            function: 'simulatedFunction',
            file: 'simulation.js',
            line: Math.floor(Math.random() * 100),
            column: Math.floor(Math.random() * 50)
          }
        ],
        memory: Math.random() * 100 * 1024 * 1024, // Up to 100MB
        cpu: Math.random() * 100 // 0-100%
      });
    }, 100);

    // Wait for profiling to complete
    await new Promise(resolve => setTimeout(resolve, duration));

    return {
      samples: this.profileData,
      duration,
      startTime,
      endTime: Date.now()
    };
  }

  // Private helper methods

  private async initializeEnvironment(): Promise<void> {
    // Set up default environment variables
    this.environment = {
      PATH: '/usr/local/bin:/usr/bin:/bin',
      HOME: this.workingDirectory,
      USER: 'spreadsheet-user',
      ...this.environment
    };
  }

  private simulateProcessExecution(): void {
    // Simulate periodic process activity
    const interval = setInterval(() => {
      if (!this.isRunning()) {
        clearInterval(interval);
        return;
      }

      // Simulate occasional output
      if (Math.random() > 0.7) {
        this.stdoutBuffer.push(`[${new Date().toISOString()}] Process ${this.pid} running`);
      }

      // Simulate occasional errors
      if (Math.random() > 0.9) {
        this.stderrBuffer.push(`[${new Date().toISOString()}] Warning: Simulated error`);
      }

      // Process stdin queue
      if (this.stdinQueue.length > 0) {
        const input = this.stdinQueue.shift();
        this.stdoutBuffer.push(`Processed input: ${input}`);
      }

      // Update resource usage
      this.updateResourceUsage();
    }, 1000);
  }

  private updateResourceUsage(): void {
    if (!this.isRunning()) {
      return;
    }

    const uptime = Date.now() - this.startTime;
    this.resourceUsage = {
      cpuTime: uptime * 0.1, // 10% CPU usage
      memory: 50 * 1024 * 1024 + Math.random() * 10 * 1024 * 1024, // 50-60MB
      diskRead: this.stdinQueue.length * 1024,
      diskWrite: (this.stdoutBuffer.length + this.stderrBuffer.length) * 512,
      networkIn: this.connections.size * 1024 * Math.random(),
      networkOut: this.connections.size * 2048 * Math.random()
    };
  }

  private handleCommandMessage(message: InstanceMessage): void {
    const { payload } = message;

    if (payload && payload.command) {
      switch (payload.command) {
        case 'start':
          this.start();
          break;
        case 'stop':
          this.stop(payload.signal);
          break;
        case 'restart':
          this.restart();
          break;
        case 'status':
          // Return status via response
          break;
      }
    }
  }

  private handleDataMessage(message: InstanceMessage): void {
    const { payload } = message;

    if (payload && payload.data) {
      this.writeToStdin(payload.data);
    }
  }

  private handleSignalMessage(message: InstanceMessage): void {
    const { payload } = message;

    if (payload && payload.signal) {
      this.sendSignal(payload.signal as ProcessSignal);
    }
  }

  private calculateHealth(): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
    if (this.state === InstanceState.ERROR) {
      return 'unhealthy';
    }

    if (this.state === InstanceState.DEGRADED || this.state === InstanceState.RECOVERING) {
      return 'degraded';
    }

    if ([InstanceState.RUNNING, InstanceState.PROCESSING].includes(this.state)) {
      // Check for error conditions
      if (this.stderrBuffer.length > 10) {
        return 'degraded';
      }
      return 'healthy';
    }

    if ([InstanceState.IDLE, InstanceState.STOPPED].includes(this.state)) {
      return 'healthy';
    }

    return 'unknown';
  }

  private getWarnings(): string[] {
    const warnings: string[] = [];

    if (this.stderrBuffer.length > 5) {
      warnings.push(`Process has ${this.stderrBuffer.length} error messages`);
    }

    if (this.stdinQueue.length > 100) {
      warnings.push(`Input queue has ${this.stdinQueue.length} pending items`);
    }

    const usage = this.resourceUsage;
    if (usage.memory > this.configuration.constraints.maxMemory * 1024 * 1024) {
      warnings.push(`Memory usage (${Math.round(usage.memory / 1024 / 1024)}MB) exceeds limit`);
    }

    if (usage.cpuTime > this.configuration.constraints.maxRuntime) {
      warnings.push(`CPU time (${Math.round(usage.cpuTime)}ms) exceeds runtime limit`);
    }

    return warnings;
  }
}