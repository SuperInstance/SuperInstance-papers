/**
 * Voice Command Handler
 *
 * Handles voice input for natural language queries.
 * Uses Web Speech API for browser-based speech recognition.
 */

import { NLQueryEngine, QueryContext, QueryResult } from './NLQueryEngine.js';

/**
 * Voice command state
 */
export enum VoiceState {
  IDLE = 'idle',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  ERROR = 'error',
}

/**
 * Voice command event
 */
export interface VoiceCommandEvent {
  state: VoiceState;
  transcript?: string;
  error?: string;
}

/**
 * Voice command configuration
 */
export interface VoiceCommandConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onStateChange?: (event: VoiceCommandEvent) => void;
  onTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
}

/**
 * Voice Command Handler
 *
 * Manages voice input using Web Speech API
 */
export class VoiceCommand {
  private recognition: any | null = null;
  private queryEngine: NLQueryEngine;
  private config: VoiceCommandConfig;
  private state: VoiceState = VoiceState.IDLE;
  private isSupported: boolean = false;

  constructor(config: VoiceCommandConfig = {}) {
    this.config = {
      language: 'en-US',
      continuous: false,
      interimResults: true,
      maxAlternatives: 1,
      ...config,
    };

    this.queryEngine = new NLQueryEngine();
    this.initializeSpeechRecognition();
  }

  /**
   * Initialize speech recognition
   */
  private initializeSpeechRecognition(): void {
    // Check for browser support
    if (typeof window === 'undefined') {
      this.state = VoiceState.ERROR;
      this.notifyStateChange({
        state: VoiceState.ERROR,
        error: 'Voice commands only supported in browser environment',
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.state = VoiceState.ERROR;
      this.notifyStateChange({
        state: VoiceState.ERROR,
        error: 'Speech recognition not supported in this browser',
      });
      return;
    }

    this.isSupported = true;
    this.recognition = new SpeechRecognition();

    // Configure recognition
    this.recognition.lang = this.config.language || 'en-US';
    this.recognition.continuous = this.config.continuous || false;
    this.recognition.interimResults = this.config.interimResults || true;
    this.recognition.maxAlternatives = this.config.maxAlternatives || 1;

    // Set up event handlers
    this.recognition.onstart = () => this.handleStart();
    this.recognition.onend = () => this.handleEnd();
    this.recognition.onresult = (event: any) => this.handleResult(event);
    this.recognition.onerror = (event: any) => this.handleError(event);
  }

  /**
   * Start listening for voice input
   */
  startListening(): void {
    if (!this.isSupported || !this.recognition) {
      this.notifyError('Speech recognition not available');
      return;
    }

    if (this.state === VoiceState.LISTENING) {
      return; // Already listening
    }

    try {
      this.recognition.start();
    } catch (error) {
      this.notifyError(`Failed to start listening: ${error}`);
    }
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (!this.isSupported || !this.recognition) {
      return;
    }

    if (this.state !== VoiceState.LISTENING) {
      return; // Not listening
    }

    try {
      this.recognition.stop();
    } catch (error) {
      this.notifyError(`Failed to stop listening: ${error}`);
    }
  }

  /**
   * Abort listening immediately
   */
  abortListening(): void {
    if (!this.isSupported || !this.recognition) {
      return;
    }

    try {
      this.recognition.abort();
    } catch (error) {
      this.notifyError(`Failed to abort listening: ${error}`);
    }
  }

  /**
   * Execute a voice command
   */
  async executeCommand(transcript: string, context: QueryContext): Promise<QueryResult> {
    this.setState(VoiceState.PROCESSING);

    try {
      const result = await this.queryEngine.executeQuery(transcript, context);

      this.setState(VoiceState.IDLE);
      return result;
    } catch (error) {
      this.setState(VoiceState.ERROR);
      this.notifyError(error instanceof Error ? error.message : 'Unknown error');

      return {
        success: false,
        results: [],
        count: 0,
        explanation: 'Error executing voice command',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current state
   */
  getState(): VoiceState {
    return this.state;
  }

  /**
   * Check if voice is supported
   */
  isVoiceSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Set language
   */
  setLanguage(language: string): void {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  /**
   * Handle recognition start
   */
  private handleStart(): void {
    this.setState(VoiceState.LISTENING);
  }

  /**
   * Handle recognition end
   */
  private handleEnd(): void {
    if (this.state !== VoiceState.ERROR) {
      this.setState(VoiceState.IDLE);
    }
  }

  /**
   * Handle recognition result
   */
  private handleResult(event: any): void {
    const last = event.results.length - 1;
    const transcript = event.results[last][0].transcript;
    const confidence = event.results[last][0].confidence;

    // Only notify for final results
    if (event.results[last].isFinal) {
      this.notifyTranscript(transcript);
    }
  }

  /**
   * Handle recognition error
   */
  private handleError(event: any): void {
    const errorMessages: Record<string, string> = {
      'no-speech': 'No speech detected',
      'audio-capture': 'No microphone found',
      'not-allowed': 'Microphone permission denied',
      'network': 'Network error',
      'aborted': 'Recognition aborted',
    };

    const errorMessage = errorMessages[event.error] || event.error || 'Unknown error';

    this.setState(VoiceState.ERROR);
    this.notifyError(errorMessage);
  }

  /**
   * Set state and notify listeners
   */
  private setState(state: VoiceState): void {
    this.state = state;
    this.notifyStateChange({ state });
  }

  /**
   * Notify state change
   */
  private notifyStateChange(event: VoiceCommandEvent): void {
    if (this.config.onStateChange) {
      this.config.onStateChange(event);
    }
  }

  /**
   * Notify transcript
   */
  private notifyTranscript(transcript: string): void {
    if (this.config.onTranscript) {
      this.config.onTranscript(transcript);
    }
  }

  /**
   * Notify error
   */
  private notifyError(error: string): void {
    if (this.config.onError) {
      this.config.onError(error);
    }
  }

  /**
   * Convert speech to text (one-shot)
   */
  async speechToText(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported || !this.recognition) {
        reject(new Error('Speech recognition not available'));
        return;
      }

      const originalConfig = { ...this.config };

      // Set up one-time handlers
      this.config.onTranscript = (transcript: string) => {
        resolve(transcript);
        this.config = originalConfig;
      };

      this.config.onError = (error: string) => {
        reject(new Error(error));
        this.config = originalConfig;
      };

      this.startListening();
    });
  }
}

/**
 * Voice command builder
 */
export class VoiceCommandBuilder {
  private config: VoiceCommandConfig = {};

  language(language: string): this {
    this.config.language = language;
    return this;
  }

  continuous(continuous: boolean): this {
    this.config.continuous = continuous;
    return this;
  }

  interimResults(interimResults: boolean): this {
    this.config.interimResults = interimResults;
    return this;
  }

  onStateChange(handler: (event: VoiceCommandEvent) => void): this {
    this.config.onStateChange = handler;
    return this;
  }

  onTranscript(handler: (transcript: string) => void): this {
    this.config.onTranscript = handler;
    return this;
  }

  onError(handler: (error: string) => void): this {
    this.config.onError = handler;
    return this;
  }

  build(): VoiceCommand {
    return new VoiceCommand(this.config);
  }
}

/**
 * Utility function to create voice command with common settings
 */
export function createVoiceCommand(config?: VoiceCommandConfig): VoiceCommand {
  return new VoiceCommand(config);
}
