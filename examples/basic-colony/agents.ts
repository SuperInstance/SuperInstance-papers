/**
 * Simple Agent Implementations for Basic Colony Demo
 */

import { BaseAgent } from '../../src/core/agent.js';
import type { A2APackage, AgentConfig } from '../../src/core/types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * GreeterAgent - Handles greetings and welcomes
 */
export class GreeterAgent extends BaseAgent {
  private responseCount = 0;

  constructor(config: AgentConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    console.log(`  ${this.id} initialized`);
  }

  async process<T>(input: T): Promise<A2APackage<T>> {
    this.touch();
    this.responseCount++;

    const message = input as string;
    const lowerMessage = message.toLowerCase();

    // Check if this is a greeting
    const isGreeting = lowerMessage.includes('hello') ||
                       lowerMessage.includes('hi') ||
                       lowerMessage.includes('hey') ||
                       lowerMessage.includes('greetings');

    // Calculate confidence based on input
    const confidence = isGreeting ? 0.9 : 0.3;

    // Generate response
    const response = isGreeting
      ? `Hello! Welcome to our colony. How can I help you today? (#${this.responseCount})`
      : `I'm a greeter, but I can still say hi! (#${this.responseCount})`;

    const a2aPackage: A2APackage<T> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: 'colony',
      type: 'greeting',
      payload: response as T,
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: 'PUBLIC' as any,
      layer: 'DELIBERATE' as any,
    };

    return a2aPackage;
  }

  async shutdown(): Promise<void> {
    console.log(`  ${this.id} shutdown (handled ${this.responseCount} requests)`);
  }

  // Calculate bid based on input
  calculateBid(input: string): number {
    const lower = input.toLowerCase();
    const hasGreeting = lower.includes('hello') || lower.includes('hi') || lower.includes('hey');
    return hasGreeting ? 0.9 : 0.2;
  }

  // Calculate confidence for this input
  calculateConfidence(input: string): number {
    const lower = input.toLowerCase();
    const hasGreeting = lower.includes('hello') || lower.includes('hi') || lower.includes('hey');
    return hasGreeting ? 0.85 : 0.25;
  }
}

/**
 * TaskAgent - Handles tasks and work items
 */
export class TaskAgent extends BaseAgent {
  private tasksCompleted = 0;

  constructor(config: AgentConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    console.log(`  ${this.id} initialized`);
  }

  async process<T>(input: T): Promise<A2APackage<T>> {
    this.touch();
    this.tasksCompleted++;

    const message = input as string;
    const lowerMessage = message.toLowerCase();

    // Check if this is a task request
    const isTask = lowerMessage.includes('help') ||
                   lowerMessage.includes('task') ||
                   lowerMessage.includes('do') ||
                   lowerMessage.includes('need') ||
                   lowerMessage.includes('please');

    const confidence = isTask ? 0.95 : 0.4;

    const response = isTask
      ? `I'll help you with that task! I've completed ${this.tasksCompleted} tasks so far.`
      : `I'm a task agent. Send me a task and I'll get it done!`;

    const a2aPackage: A2APackage<T> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: 'colony',
      type: 'task-response',
      payload: response as T,
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: 'PUBLIC' as any,
      layer: 'DELIBERATE' as any,
    };

    return a2aPackage;
  }

  async shutdown(): Promise<void> {
    console.log(`  ${this.id} shutdown (completed ${this.tasksCompleted} tasks)`);
  }

  calculateBid(input: string): number {
    const lower = input.toLowerCase();
    const hasTask = lower.includes('help') || lower.includes('task') ||
                    lower.includes('do') || lower.includes('need');
    return hasTask ? 0.95 : 0.3;
  }

  calculateConfidence(input: string): number {
    const lower = input.toLowerCase();
    const hasTask = lower.includes('help') || lower.includes('task') ||
                    lower.includes('do') || lower.includes('need');
    return hasTask ? 0.9 : 0.35;
  }
}

/**
 * FarewellAgent - Handles goodbyes
 */
export class FarewellAgent extends BaseAgent {
  private farewellCount = 0;

  constructor(config: AgentConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    console.log(`  ${this.id} initialized`);
  }

  async process<T>(input: T): Promise<A2APackage<T>> {
    this.touch();
    this.farewellCount++;

    const message = input as string;
    const lowerMessage = message.toLowerCase();

    // Check if this is a farewell
    const isFarewell = lowerMessage.includes('goodbye') ||
                       lowerMessage.includes('bye') ||
                       lowerMessage.includes('see you') ||
                       lowerMessage.includes('farewell');

    const confidence = isFarewell ? 0.98 : 0.15;

    const response = isFarewell
      ? `Goodbye! Have a wonderful day! Come back soon! (#${this.farewellCount})`
      : `I'm here to say goodbye. Are you leaving?`;

    const a2aPackage: A2APackage<T> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: 'colony',
      type: 'farewell',
      payload: response as T,
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: 'PUBLIC' as any,
      layer: 'DELIBERATE' as any,
    };

    return a2aPackage;
  }

  async shutdown(): Promise<void> {
    console.log(`  ${this.id} shutdown (handled ${this.farewellCount} farewells)`);
  }

  calculateBid(input: string): number {
    const lower = input.toLowerCase();
    const hasFarewell = lower.includes('goodbye') || lower.includes('bye') ||
                        lower.includes('see you') || lower.includes('farewell');
    return hasFarewell ? 0.98 : 0.1;
  }

  calculateConfidence(input: string): number {
    const lower = input.toLowerCase();
    const hasFarewell = lower.includes('goodbye') || lower.includes('bye') ||
                        lower.includes('see you') || lower.includes('farewell');
    return hasFarewell ? 0.95 : 0.1;
  }
}
