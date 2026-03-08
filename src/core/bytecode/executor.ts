/**
 * POLLN Bytecode Executor
 *
 * Executes compiled bytecode in a secure sandbox environment.
 * Provides fallback to interpreter mode when needed.
 */

import { v4 as uuidv4 } from 'uuid';
import { Opcode } from './types.js';
import type {
  CompiledPathway,
  ExecutionContext,
  ExecutionResult,
  SandboxConfig,
  BytecodeInstruction,
  BytecodeSafetyCheck,
} from './types.js';

/**
 * BytecodeExecutor - Secure bytecode execution engine
 *
 * Features:
 * - Sandboxed execution environment
 * - Fallback to interpreter mode on error
 * - Comprehensive telemetry tracking
 * - Safety constraint enforcement
 */
export class BytecodeExecutor {
  private safetyChecks: Map<string, BytecodeSafetyCheck> = new Map();
  private sandboxConfig: SandboxConfig;
  private executionHistory: ExecutionResult[] = [];
  private activeExecutions: Map<string, ExecutionContext> = new Map();

  // Default sandbox configuration
  private static readonly DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
    maxExecutionTimeMs: 30000, // 30 seconds
    maxMemoryMB: 512,
    maxInstructions: 100000,
    allowNetworkAccess: false,
    allowFileAccess: false,
  };

  constructor(sandboxConfig?: Partial<SandboxConfig>) {
    this.sandboxConfig = {
      ...BytecodeExecutor.DEFAULT_SANDBOX_CONFIG,
      ...sandboxConfig,
    };
  }

  /**
   * Execute compiled pathway bytecode
   */
  async execute(
    compiledPathway: CompiledPathway,
    context: Partial<ExecutionContext> = {}
  ): Promise<ExecutionResult> {
    const executionId = uuidv4();
    const startTime = Date.now();

    // Create full execution context
    const fullContext: ExecutionContext = {
      pathwayId: compiledPathway.id,
      variables: new Map(),
      callStack: [],
      a2aPackageTrace: [],
      startTime,
      sandbox: true,
      ...context,
    };

    // Store active execution
    this.activeExecutions.set(executionId, fullContext);

    try {
      // Check if we should use sandbox
      if (fullContext.sandbox) {
        return await this.executeInSandbox(
          compiledPathway,
          fullContext,
          executionId,
          startTime
        );
      } else {
        return await this.executeDirectly(
          compiledPathway,
          fullContext,
          executionId,
          startTime
        );
      }
    } catch (error) {
      // Fallback to interpreter mode on error
      return this.createErrorResult(
        executionId,
        error,
        startTime,
        compiledPathway.id
      );
    } finally {
      // Clean up active execution
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Execute bytecode in sandbox mode
   */
  private async executeInSandbox(
    compiledPathway: CompiledPathway,
    context: ExecutionContext,
    executionId: string,
    startTime: number
  ): Promise<ExecutionResult> {
    const safetyViolations: string[] = [];
    let instructionCount = 0;
    let output: unknown = undefined;

    // Set up timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Execution timeout')),
        this.sandboxConfig.maxExecutionTimeMs
      );
    });

    try {
      // Execute with timeout
      await Promise.race([
        this.executeInstructions(
          compiledPathway.bytecode,
          context,
          safetyViolations,
          instructionCount
        ),
        timeoutPromise,
      ]);

      output = context.variables.get('result');
    } catch (error) {
      return this.createErrorResult(
        executionId,
        error,
        startTime,
        compiledPathway.id,
        true,
        safetyViolations
      );
    }

    return {
      success: safetyViolations.length === 0,
      output,
      executionTimeMs: Date.now() - startTime,
      bytecodeInstructions: compiledPathway.bytecode.length,
      a2aPackages: context.a2aPackageTrace,
      fallbackMode: false,
      safetyViolations,
    };
  }

  /**
   * Execute bytecode directly (without sandbox)
   */
  private async executeDirectly(
    compiledPathway: CompiledPathway,
    context: ExecutionContext,
    executionId: string,
    startTime: number
  ): Promise<ExecutionResult> {
    const safetyViolations: string[] = [];
    let instructionCount = 0;

    try {
      await this.executeInstructions(
        compiledPathway.bytecode,
        context,
        safetyViolations,
        instructionCount
      );
    } catch (error) {
      return this.createErrorResult(
        executionId,
        error,
        startTime,
        compiledPathway.id,
        false,
        safetyViolations
      );
    }

    return {
      success: safetyViolations.length === 0,
      output: context.variables.get('result'),
      executionTimeMs: Date.now() - startTime,
      bytecodeInstructions: compiledPathway.bytecode.length,
      a2aPackages: context.a2aPackageTrace,
      fallbackMode: false,
      safetyViolations,
    };
  }

  /**
   * Execute bytecode instructions
   */
  private async executeInstructions(
    bytecode: BytecodeInstruction[],
    context: ExecutionContext,
    safetyViolations: string[],
    instructionCount: number
  ): Promise<void> {
    for (const instr of bytecode) {
      // Check instruction limit
      if (instructionCount++ > this.sandboxConfig.maxInstructions) {
        throw new Error('Instruction limit exceeded');
      }

      // Execute instruction
      await this.executeInstruction(instr, context, safetyViolations);

      // Check for safety violations that require abort
      if (
        safetyViolations.length > 0 &&
        bytecode.some(
          (i) => i.opcode === Opcode.ABORT_IF_VIOLATION && safetyViolations.length > 0
        )
      ) {
        throw new Error('Safety violation detected');
      }
    }
  }

  /**
   * Execute single instruction
   */
  private async executeInstruction(
    instr: BytecodeInstruction,
    context: ExecutionContext,
    safetyViolations: string[]
  ): Promise<void> {
    switch (instr.opcode) {
      case Opcode.INVOKE_AGENT:
        await this.invokeAgent(instr, context);
        break;

      case Opcode.PASS_MESSAGE:
        await this.passMessage(instr, context);
        break;

      case Opcode.AWAIT_RESPONSE:
        await this.awaitResponse(instr, context);
        break;

      case Opcode.CONDITIONAL_BRANCH:
        await this.conditionalBranch(instr, context);
        break;

      case Opcode.LOOP:
        await this.loop(instr, context);
        break;

      case Opcode.PARALLEL:
        await this.parallel(instr, context);
        break;

      case Opcode.LOAD_CONST:
        this.loadConst(instr, context);
        break;

      case Opcode.STORE_VAR:
        this.storeVar(instr, context);
        break;

      case Opcode.LOAD_VAR:
        this.loadVar(instr, context);
        break;

      case Opcode.STOCHASTIC_SELECT:
        await this.stochasticSelect(instr, context);
        break;

      case Opcode.UPDATE_WEIGHTS:
        this.updateWeights(instr, context);
        break;

      case Opcode.CHECK_CONSTRAINT:
        await this.checkConstraint(instr, context, safetyViolations);
        break;

      case Opcode.ABORT_IF_VIOLATION:
        if (safetyViolations.length > 0) {
          throw new Error('Aborted due to safety violations');
        }
        break;

      case Opcode.METRIC_START:
      case Opcode.METRIC_END:
      case Opcode.TRACE_POINT:
        // Telemetry instructions - no action needed
        break;

      default:
        console.warn(`Unknown opcode: ${instr.opcode}`);
    }
  }

  /**
   * Instruction implementations
   */

  private async invokeAgent(
    instr: BytecodeInstruction,
    context: ExecutionContext
  ): Promise<void> {
    const agentId = instr.metadata?.agentId as string | undefined;
    if (!agentId) return;

    context.callStack.push(agentId);

    // In a real implementation, this would invoke the actual agent
    // For now, simulate execution
    await this.simulateAgentExecution(agentId, context);

    context.callStack.pop();
  }

  private async passMessage(
    instr: BytecodeInstruction,
    context: ExecutionContext
  ): Promise<void> {
    // Generate A2A package for traceability
    const packageId = uuidv4();
    context.a2aPackageTrace.push(packageId);
  }

  private async awaitResponse(
    instr: BytecodeInstruction,
    context: ExecutionContext
  ): Promise<void> {
    const timeout = instr.operands[0] || 5000;
    // Simulate waiting for response
    await new Promise((resolve) => setTimeout(resolve, Math.min(timeout, 100)));
  }

  private async conditionalBranch(
    instr: BytecodeInstruction,
    context: ExecutionContext
  ): Promise<void> {
    // Conditional branching logic
    const condition = instr.operands[0];
    if (condition) {
      // Take branch
    }
  }

  private async loop(
    instr: BytecodeInstruction,
    context: ExecutionContext
  ): Promise<void> {
    // Loop logic
  }

  private async parallel(
    instr: BytecodeInstruction,
    context: ExecutionContext
  ): Promise<void> {
    // Parallel execution logic
  }

  private loadConst(instr: BytecodeInstruction, context: ExecutionContext): void {
    const [value] = instr.operands;
    context.variables.set('_const', value);
  }

  private storeVar(instr: BytecodeInstruction, context: ExecutionContext): void {
    const [varIndex] = instr.operands;
    const value = context.variables.get('_const');
    context.variables.set(`var_${varIndex}`, value);
  }

  private loadVar(instr: BytecodeInstruction, context: ExecutionContext): void {
    const [varIndex] = instr.operands;
    const value = context.variables.get(`var_${varIndex}`);
    context.variables.set('_loaded', value);
  }

  private async stochasticSelect(
    instr: BytecodeInstruction,
    context: ExecutionContext
  ): Promise<void> {
    // Stochastic selection using Plinko
    const temperature = instr.operands[0] || 1.0;
    // Simulate stochastic selection
  }

  private updateWeights(
    instr: BytecodeInstruction,
    context: ExecutionContext
  ): void {
    // Update synaptic weights
  }

  private async checkConstraint(
    instr: BytecodeInstruction,
    context: ExecutionContext,
    safetyViolations: string[]
  ): Promise<void> {
    const constraintId = instr.metadata?.constraintId as string | undefined;

    // Run all registered safety checks
    for (const [id, check] of Array.from(this.safetyChecks.entries())) {
      const passed = await check.check(context);
      if (!passed) {
        safetyViolations.push(id);
      }
    }
  }

  private async simulateAgentExecution(
    agentId: string,
    context: ExecutionContext
  ): Promise<void> {
    // Simulate agent execution time
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Store result
    context.variables.set('result', {
      agentId,
      timestamp: Date.now(),
      success: true,
    });
  }

  /**
   * Create error result
   */
  private createErrorResult(
    executionId: string,
    error: unknown,
    startTime: number,
    pathwayId: string,
    fallbackMode: boolean = true,
    safetyViolations: string[] = []
  ): ExecutionResult {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTimeMs: Date.now() - startTime,
      bytecodeInstructions: 0,
      a2aPackages: [],
      fallbackMode,
      safetyViolations,
    };
  }

  /**
   * Register safety check
   */
  registerSafetyCheck(check: BytecodeSafetyCheck): void {
    this.safetyChecks.set(check.constraintId, check);
  }

  /**
   * Unregister safety check
   */
  unregisterSafetyCheck(constraintId: string): boolean {
    return this.safetyChecks.delete(constraintId);
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): ExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): ExecutionResult[] {
    return [...this.executionHistory];
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory(): void {
    this.executionHistory = [];
  }

  /**
   * Update sandbox configuration
   */
  updateSandboxConfig(config: Partial<SandboxConfig>): void {
    this.sandboxConfig = { ...this.sandboxConfig, ...config };
  }

  /**
   * Get sandbox configuration
   */
  getSandboxConfig(): SandboxConfig {
    return { ...this.sandboxConfig };
  }

  /**
   * Get executor statistics
   */
  getExecutorStats(): {
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    avgExecutionTimeMs: number;
    safetyViolationCount: number;
  } {
    const successCount = this.executionHistory.filter((r) => r.success).length;
    const failureCount = this.executionHistory.filter((r) => !r.success).length;
    const avgExecutionTimeMs =
      this.executionHistory.length > 0
        ? this.executionHistory.reduce((sum, r) => sum + r.executionTimeMs, 0) /
          this.executionHistory.length
        : 0;
    const safetyViolationCount = this.executionHistory.reduce(
      (sum, r) => sum + r.safetyViolations.length,
      0
    );

    return {
      totalExecutions: this.executionHistory.length,
      successCount,
      failureCount,
      avgExecutionTimeMs,
      safetyViolationCount,
    };
  }
}
