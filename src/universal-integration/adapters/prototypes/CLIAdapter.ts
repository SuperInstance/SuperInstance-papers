/**
 * CLI Platform Adapter Prototype
 *
 * Adapter for command-line interface communication.
 * Enables SMPbot integration with terminal applications and scripts.
 */

import {
  UniversalPlatformAdapter,
  AdapterConfig,
  AdapterState,
  AdapterEvent
} from '../UniversalPlatformAdapter.js';
import {
  UIPMessage,
  PlatformType,
  MessageType,
  SendResult,
  SendErrorCode,
  PlatformCapabilities,
  RateLimitConfig,
  AuthMethod,
  CURRENT_PROTOCOL_VERSION
} from '../../protocol/types.js';

/**
 * CLI adapter configuration
 */
export interface CLIAdapterConfig extends AdapterConfig {
  options: {
    inputStream?: NodeJS.ReadableStream;
    outputStream?: NodeJS.WritableStream;
    prompt?: string;
    historySize?: number;
    echoInput?: boolean;
    debug?: boolean;
  };
}

/**
 * CLI adapter implementation
 */
export class CLIAdapter extends UniversalPlatformAdapter {
  private inputStream: NodeJS.ReadableStream;
  private outputStream: NodeJS.WritableStream;
  private prompt: string;
  private historySize: number;
  private echoInput: boolean;

  private messageReceiver?: (message: UIPMessage) => Promise<void>;
  private inputBuffer: string = '';
  private history: string[] = [];
  private historyIndex: number = -1;

  /**
   * Constructor
   */
  constructor(config: CLIAdapterConfig) {
    super(config);

    this.inputStream = config.options?.inputStream || process.stdin;
    this.outputStream = config.options?.outputStream || process.stdout;
    this.prompt = config.options?.prompt || '> ';
    this.historySize = config.options?.historySize || 100;
    this.echoInput = config.options?.echoInput !== false;

    // Initialize CLI-specific capabilities
    this.initializeCLICapabilities();
  }

  // ============================================================================
  // UniversalPlatformAdapter Implementation
  // ============================================================================

  /**
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    this.log('Initializing CLI adapter...');

    try {
      // Set up raw mode for stdin if it's a TTY
      if (this.inputStream.isTTY) {
        this.inputStream.setRawMode(true);
        this.inputStream.resume();
      }

      // Set up input handling
      this.setupInputHandling();

      this.setAdapterState(AdapterState.CONNECTED);
      this.emitEvent(AdapterEvent.CONNECTED);

      this.log('CLI adapter initialized successfully');
      this.displayPrompt();

    } catch (error) {
      this.handlePlatformError(error, 'initialize');
      throw error;
    }
  }

  /**
   * Connect to the CLI platform
   */
  async connect(): Promise<void> {
    if (this.isConnected()) {
      this.log('Already connected');
      return;
    }

    this.setAdapterState(AdapterState.CONNECTING);
    this.log('Connecting to CLI platform...');

    try {
      // CLI is always "connected" once initialized
      this.setAdapterState(AdapterState.CONNECTED);
      this.emitEvent(AdapterEvent.CONNECTED);
      this.log('Connected to CLI platform');

      this.displayPrompt();

    } catch (error) {
      this.handlePlatformError(error, 'connect');
      this.setAdapterState(AdapterState.ERROR);
      throw error;
    }
  }

  /**
   * Disconnect from the CLI platform
   */
  async disconnect(): Promise<void> {
    this.log('Disconnecting from CLI platform...');

    try {
      // Clean up input handling
      this.cleanupInputHandling();

      // Reset raw mode
      if (this.inputStream.isTTY) {
        this.inputStream.setRawMode(false);
      }

      this.setAdapterState(AdapterState.DISCONNECTED);
      this.emitEvent(AdapterEvent.DISCONNECTED);
      this.log('Disconnected from CLI platform');

    } catch (error) {
      this.handlePlatformError(error, 'disconnect');
      throw error;
    }
  }

  /**
   * Send a message through the CLI adapter
   */
  async send(message: UIPMessage): Promise<SendResult> {
    const startTime = Date.now();

    try {
      // Validate message
      const validation = this.validateMessage(message);
      if (!validation.valid) {
        return this.createSendResult(false, {
          code: SendErrorCode.INVALID_MESSAGE,
          message: `Invalid message: ${validation.errors.join(', ')}`,
          retryable: false
        }, startTime);
      }

      // Transform message for CLI output
      const transformed = await this.transformToPlatform(message);

      // Output to CLI
      await this.outputToCLI(transformed);

      // Update statistics
      this.emitEvent(AdapterEvent.MESSAGE_SENT, { message });

      return this.createSendResult(true, undefined, startTime);

    } catch (error) {
      this.handlePlatformError(error, 'send');
      return this.createSendResult(false, {
        code: SendErrorCode.PLATFORM_ERROR,
        message: error instanceof Error ? error.message : String(error),
        retryable: false
      }, startTime);
    }
  }

  /**
   * Register message receiver callback
   */
  receive(callback: (message: UIPMessage) => Promise<void>): void {
    this.messageReceiver = callback;
    this.log('Message receiver registered');
  }

  // ============================================================================
  // CLI-Specific Methods
  // ============================================================================

  /**
   * Display prompt
   */
  displayPrompt(): void {
    if (this.outputStream.writable) {
      this.outputStream.write(`\n${this.prompt}`);
    }
  }

  /**
   * Clear current line
   */
  clearLine(): void {
    if (this.outputStream.writable) {
      this.outputStream.write('\r\x1b[K');
    }
  }

  /**
   * Write output to CLI
   */
  writeOutput(text: string): void {
    if (this.outputStream.writable) {
      this.outputStream.write(text);
    }
  }

  /**
   * Write line to CLI
   */
  writeLine(text: string): void {
    this.writeOutput(text + '\n');
  }

  /**
   * Handle user input
   */
  async handleInput(input: string): Promise<void> {
    if (!input.trim()) {
      this.displayPrompt();
      return;
    }

    // Add to history
    this.addToHistory(input);

    // Create UIP message from input
    const message = this.createMessageFromInput(input);

    // Pass to receiver if registered
    if (this.messageReceiver) {
      try {
        await this.messageReceiver(message);
        this.emitEvent(AdapterEvent.MESSAGE_RECEIVED, { message });
      } catch (error) {
        this.writeLine(`Error handling input: ${error}`);
      }
    }

    // Display prompt for next input
    this.displayPrompt();
  }

  /**
   * Handle special keys
   */
  handleSpecialKey(key: string): boolean {
    switch (key) {
      case '\u0003': // Ctrl+C
        this.writeLine('^C');
        process.exit(0);
        return true;

      case '\r': // Enter
      case '\n':
        this.handleEnter();
        return true;

      case '\u007f': // Backspace
        this.handleBackspace();
        return true;

      case '\u001b[A': // Up arrow
        this.handleUpArrow();
        return true;

      case '\u001b[B': // Down arrow
        this.handleDownArrow();
        return true;

      case '\u001b[D': // Left arrow
        // Move cursor left
        return true;

      case '\u001b[C': // Right arrow
        // Move cursor right
        return true;

      default:
        return false;
    }
  }

  /**
   * Handle Enter key
   */
  private handleEnter(): void {
    if (this.echoInput) {
      this.writeLine('');
    }

    const input = this.inputBuffer.trim();
    this.inputBuffer = '';

    if (input) {
      this.handleInput(input).catch(error => {
        this.writeLine(`Error: ${error}`);
      });
    } else {
      this.displayPrompt();
    }
  }

  /**
   * Handle Backspace key
   */
  private handleBackspace(): void {
    if (this.inputBuffer.length > 0) {
      this.inputBuffer = this.inputBuffer.slice(0, -1);
      this.clearLine();
      this.writeOutput(this.prompt + this.inputBuffer);
    }
  }

  /**
   * Handle Up arrow (history)
   */
  private handleUpArrow(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.inputBuffer = this.history[this.history.length - 1 - this.historyIndex];
      this.clearLine();
      this.writeOutput(this.prompt + this.inputBuffer);
    }
  }

  /**
   * Handle Down arrow (history)
   */
  private handleDownArrow(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.inputBuffer = this.history[this.history.length - 1 - this.historyIndex];
      this.clearLine();
      this.writeOutput(this.prompt + this.inputBuffer);
    } else if (this.historyIndex === 0) {
      this.historyIndex = -1;
      this.inputBuffer = '';
      this.clearLine();
      this.writeOutput(this.prompt);
    }
  }

  /**
   * Add input to history
   */
  private addToHistory(input: string): void {
    this.history.push(input);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }
    this.historyIndex = -1;
  }

  // ============================================================================
  // Setup and Cleanup
  // ============================================================================

  /**
   * Set up input handling
   */
  private setupInputHandling(): void {
    this.inputStream.on('data', (chunk: Buffer) => {
      const data = chunk.toString();

      // Handle special keys
      if (this.handleSpecialKey(data)) {
        return;
      }

      // Add to input buffer
      this.inputBuffer += data;

      // Echo input if enabled
      if (this.echoInput) {
        this.writeOutput(data);
      }
    });

    this.inputStream.on('error', (error) => {
      this.handlePlatformError(error, 'input stream');
    });

    this.inputStream.on('end', () => {
      this.log('Input stream ended');
      this.disconnect().catch(() => {});
    });
  }

  /**
   * Clean up input handling
   */
  private cleanupInputHandling(): void {
    this.inputStream.removeAllListeners('data');
    this.inputStream.removeAllListeners('error');
    this.inputStream.removeAllListeners('end');
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  /**
   * Create UIP message from CLI input
   */
  private createMessageFromInput(input: string): UIPMessage {
    // Parse input to determine message type
    let type: MessageType = MessageType.TEXT;
    let payload: unknown = input;

    // Check if it's a command (starts with /)
    if (input.startsWith('/')) {
      type = MessageType.COMMAND;
      const parts = input.slice(1).split(' ');
      payload = {
        command: parts[0],
        args: parts.slice(1)
      };
    }
    // Check if it's a query (ends with ?)
    else if (input.trim().endsWith('?')) {
      type = MessageType.QUERY;
      payload = input.trim();
    }

    return {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      source: {
        platform: PlatformType.CLI,
        channel: 'terminal',
        sessionId: process.pid.toString()
      },
      target: {
        platform: PlatformType.API,
        channel: 'cli-router'
      },
      type,
      payload,
      metadata: {
        priority: 'normal',
        ttl: 5 * 60 * 1000 // 5 minutes
      }
    };
  }

  /**
   * Output message to CLI
   */
  private async outputToCLI(data: unknown): Promise<void> {
    if (typeof data === 'string') {
      this.writeLine(data);
    } else if (typeof data === 'object' && data !== null) {
      // Pretty print objects
      const formatted = JSON.stringify(data, null, 2);
      this.writeLine(formatted);
    } else {
      this.writeLine(String(data));
    }
  }

  // ============================================================================
  // Message Transformation
  // ============================================================================

  /**
   * Transform UIP message to CLI format
   */
  protected async transformToPlatform(message: UIPMessage): Promise<unknown> {
    // For CLI, we want readable output
    switch (message.type) {
      case MessageType.TEXT:
        return message.payload;

      case MessageType.RESPONSE:
        if (typeof message.payload === 'object' && message.payload !== null) {
          const response = message.payload as Record<string, unknown>;
          if (response.output !== undefined) {
            return response.output;
          }
        }
        return message.payload;

      case MessageType.ERROR:
        const errorPayload = message.payload as Record<string, unknown>;
        return `Error: ${errorPayload.error || 'Unknown error'}`;

      default:
        // Create a readable representation
        return {
          type: message.type,
          content: message.payload,
          confidence: message.metadata?.confidence,
          timestamp: new Date(message.timestamp).toISOString()
        };
    }
  }

  /**
   * Transform CLI message to UIP format
   */
  protected async transformFromPlatform(data: unknown): Promise<UIPMessage> {
    // CLI adapter creates messages directly from input
    // This method is not typically used for CLI
    throw new Error('CLI adapter does not transform from platform format');
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Initialize CLI-specific capabilities
   */
  private initializeCLICapabilities(): void {
    const cliCapabilities: Partial<PlatformCapabilities> = {
      platform: PlatformType.CLI,
      supportedMessageTypes: [
        MessageType.TEXT,
        MessageType.COMMAND,
        MessageType.QUERY,
        MessageType.RESPONSE,
        MessageType.ERROR
      ],
      maxMessageSize: 64 * 1024, // 64KB for CLI
      supportsFiles: false,
      supportsRealtime: false,
      supportsStateSync: false,
      rateLimits: {
        maxRequests: 100,
        windowMs: 1000 // 1 second
      },
      authenticationMethods: [],
      features: [
        'interactive',
        'history',
        'line-editing'
      ]
    };

    this.capabilities = { ...this.capabilities, ...cliCapabilities };
  }

  /**
   * Create send result
   */
  private createSendResult(
    success: boolean,
    error?: { code: SendErrorCode; message: string; retryable: boolean; retryDelay?: number },
    startTime?: number,
    metadata?: { platformMessageId?: string; rateLimitInfo?: any }
  ): SendResult {
    const duration = startTime ? Date.now() - startTime : 0;

    return {
      success,
      messageId: metadata?.platformMessageId,
      error,
      metadata: {
        timestamp: Date.now(),
        duration,
        platformMessageId: metadata?.platformMessageId,
        rateLimitInfo: metadata?.rateLimitInfo
      }
    };
  }

  /**
   * Log message if debug is enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.options?.debug) {
      console.log('[CLIAdapter]', ...args);
    }
  }
}