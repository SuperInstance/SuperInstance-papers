/**
 * Specialized Code Review Agents
 */

import { BaseAgent } from '../../src/core/agent.js';
import type { AgentConfig, A2APackage } from '../../src/core/types.js';
import { v4 as uuidv4 } from 'uuid';

export interface ReviewAnalysis {
  confidence: number;
  bid: number;
  issues: string[];
  suggestions: string[];
  severity: 'critical' | 'warning' | 'info' | 'suggestion';
}

/**
 * SecurityAgent - Identifies security vulnerabilities
 */
export class SecurityAgent extends BaseAgent {
  private reviewCount = 0;

  constructor(config: AgentConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    console.log(`  ${this.id} initialized`);
  }

  async process<T>(input: T): Promise<A2APackage<T>> {
    this.touch();
    this.reviewCount++;

    const code = input as string;
    const analysis = this.analyzeSecurity(code);

    const review = this.formatReview(analysis);

    const a2aPackage: A2APackage<T> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: 'colony',
      type: 'security-review',
      payload: review as T,
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: 'PUBLIC' as any,
      layer: 'DELIBERATE' as any,
    };

    return a2aPackage;
  }

  async shutdown(): Promise<void> {
    console.log(`  ${this.id} shutdown (reviewed ${this.reviewCount} files)`);
  }

  private analyzeSecurity(code: string): ReviewAnalysis {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let severity: 'critical' | 'warning' | 'info' | 'suggestion' = 'info';
    let confidence = 0.5;

    const lowerCode = code.toLowerCase();

    // Check for common security issues
    if (lowerCode.includes('eval(') || lowerCode.includes('exec(')) {
      issues.push('Use of eval/exec allows arbitrary code execution');
      severity = 'critical';
      confidence = 0.95;
    }

    if (lowerCode.includes('innerHTML')) {
      issues.push('Direct innerHTML assignment may lead to XSS vulnerabilities');
      severity = severity === 'critical' ? 'critical' : 'warning';
      confidence = Math.max(confidence, 0.85);
    }

    if (!lowerCode.includes('validate') && !lowerCode.includes('sanitize')) {
      if (lowerCode.includes('input') || lowerCode.includes('user')) {
        issues.push('No input validation detected');
        suggestions.push('Add input validation and sanitization');
        severity = severity === 'critical' ? 'critical' : 'warning';
        confidence = Math.max(confidence, 0.75);
      }
    }

    if (lowerCode.includes('.then(') && !lowerCode.includes('catch')) {
      issues.push('Promise without error handling may expose errors');
      suggestions.push('Add .catch() for proper error handling');
      severity = severity === 'critical' ? 'critical' : 'warning';
      confidence = Math.max(confidence, 0.7);
    }

    if (lowerCode.includes('password') || lowerCode.includes('secret') || lowerCode.includes('token')) {
      if (lowerCode.includes('console.log') || lowerCode.includes('print')) {
        issues.push('Sensitive data may be logged');
        severity = 'critical';
        confidence = Math.max(confidence, 0.9);
      }
    }

    if (issues.length === 0) {
      suggestions.push('No obvious security issues found - consider security audit');
      severity = 'info';
      confidence = 0.6;
    }

    return {
      confidence,
      bid: confidence * 0.9 + 0.1,
      issues,
      suggestions,
      severity,
    };
  }

  private formatReview(analysis: ReviewAnalysis): string {
    const parts: string[] = [];

    if (analysis.issues.length > 0) {
      parts.push(`${analysis.severity.toUpperCase()}: ${analysis.issues.join('. ')}`);
    }

    if (analysis.suggestions.length > 0) {
      parts.push(`SUGGESTION: ${analysis.suggestions.join('. ')}`);
    }

    return parts.join('. ') + '.';
  }
}

/**
 * StyleAgent - Reviews code style and formatting
 */
export class StyleAgent extends BaseAgent {
  private reviewCount = 0;

  constructor(config: AgentConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    console.log(`  ${this.id} initialized`);
  }

  async process<T>(input: T): Promise<A2APackage<T>> {
    this.touch();
    this.reviewCount++;

    const code = input as string;
    const analysis = this.analyzeStyle(code);
    const review = this.formatReview(analysis);

    const a2aPackage: A2APackage<T> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: 'colony',
      type: 'style-review',
      payload: review as T,
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: 'PUBLIC' as any,
      layer: 'HABITUAL' as any,
    };

    return a2aPackage;
  }

  async shutdown(): Promise<void> {
    console.log(`  ${this.id} shutdown (reviewed ${this.reviewCount} files)`);
  }

  private analyzeStyle(code: string): ReviewAnalysis {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let severity: 'critical' | 'warning' | 'info' | 'suggestion' = 'suggestion';
    let confidence = 0.4;

    // Check for style issues
    const hasVar = code.includes('var ');
    const hasConsole = code.includes('console.');
    const longLine = code.split('\n').some(line => line.length > 100);

    if (hasVar) {
      issues.push('Use of var is discouraged');
      suggestions.push('Consider using const or let');
      severity = 'warning';
      confidence = Math.max(confidence, 0.6);
    }

    if (hasConsole) {
      suggestions.push('Remove console.log statements for production');
      confidence = Math.max(confidence, 0.5);
    }

    if (longLine) {
      suggestions.push('Some lines exceed 100 characters');
      confidence = Math.max(confidence, 0.45);
    }

    if (issues.length === 0 && suggestions.length === 0) {
      suggestions.push('Code appears well-formatted');
      severity = 'info';
    }

    return {
      confidence,
      bid: confidence * 0.7 + 0.2,
      issues,
      suggestions,
      severity,
    };
  }

  private formatReview(analysis: ReviewAnalysis): string {
    const parts: string[] = [];

    for (const issue of analysis.issues) {
      parts.push(issue);
    }

    for (const suggestion of analysis.suggestions) {
      parts.push(suggestion);
    }

    return parts.join('. ') + '.';
  }
}

/**
 * PerformanceAgent - Analyzes performance implications
 */
export class PerformanceAgent extends BaseAgent {
  private reviewCount = 0;

  constructor(config: AgentConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    console.log(`  ${this.id} initialized`);
  }

  async process<T>(input: T): Promise<A2APackage<T>> {
    this.touch();
    this.reviewCount++;

    const code = input as string;
    const analysis = this.analyzePerformance(code);
    const review = this.formatReview(analysis);

    const a2aPackage: A2APackage<T> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: 'colony',
      type: 'performance-review',
      payload: review as T,
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: 'PUBLIC' as any,
      layer: 'DELIBERATE' as any,
    };

    return a2aPackage;
  }

  async shutdown(): Promise<void> {
    console.log(`  ${this.id} shutdown (reviewed ${this.reviewCount} files)`);
  }

  private analyzePerformance(code: string): ReviewAnalysis {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let severity: 'critical' | 'warning' | 'info' | 'suggestion' = 'info';
    let confidence = 0.5;

    const lowerCode = code.toLowerCase();

    // Check for performance issues
    if (lowerCode.includes('.find(') && !lowerCode.includes('.findindex(')) {
      issues.push('Using find() without predicate may cause unexpected behavior');
      suggestions.push('Ensure find() receives a predicate function');
      severity = 'warning';
      confidence = Math.max(confidence, 0.7);
    }

    if (lowerCode.includes('for(') && lowerCode.includes('.length')) {
      suggestions.push('Consider caching array length in loops');
      confidence = Math.max(confidence, 0.55);
    }

    if (lowerCode.includes('dom.') && lowerCode.includes('loop')) {
      issues.push('DOM manipulation in loop may cause reflows');
      suggestions.push('Batch DOM operations or use document fragment');
      severity = 'warning';
      confidence = Math.max(confidence, 0.75);
    }

    if (lowerCode.includes('settimeout') || lowerCode.includes('setinterval')) {
      suggestions.push('Consider using requestAnimationFrame for animations');
      confidence = Math.max(confidence, 0.6);
    }

    if (issues.length === 0 && suggestions.length === 0) {
      suggestions.push('No obvious performance issues detected');
      severity = 'info';
    }

    return {
      confidence,
      bid: confidence * 0.8 + 0.15,
      issues,
      suggestions,
      severity,
    };
  }

  private formatReview(analysis: ReviewAnalysis): string {
    const parts: string[] = [];

    for (const issue of analysis.issues) {
      parts.push(`${analysis.severity.toUpperCase()}: ${issue}`);
    }

    for (const suggestion of analysis.suggestions) {
      parts.push(`OPTIMIZE: ${suggestion}`);
    }

    return parts.join('. ') + '.';
  }
}

/**
 * TestAgent - Evaluates test coverage and quality
 */
export class TestAgent extends BaseAgent {
  private reviewCount = 0;

  constructor(config: AgentConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    console.log(`  ${this.id} initialized`);
  }

  async process<T>(input: T): Promise<A2APackage<T>> {
    this.touch();
    this.reviewCount++;

    const code = input as string;
    const analysis = this.analyzeTesting(code);
    const review = this.formatReview(analysis);

    const a2aPackage: A2APackage<T> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: 'colony',
      type: 'test-review',
      payload: review as T,
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: 'PUBLIC' as any,
      layer: 'DELIBERATE' as any,
    };

    return a2aPackage;
  }

  async shutdown(): Promise<void> {
    console.log(`  ${this.id} shutdown (reviewed ${this.reviewCount} files)`);
  }

  private analyzeTesting(code: string): ReviewAnalysis {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let severity: 'critical' | 'warning' | 'info' | 'suggestion' = 'info';
    let confidence = 0.5;

    const lowerCode = code.toLowerCase();

    // Check for testing considerations
    const hasConditionals = lowerCode.includes('if(') || lowerCode.includes('switch(');
    const hasErrorHandling = lowerCode.includes('try') || lowerCode.includes('catch');
    const hasEdgeCases = lowerCode.includes('null') || lowerCode.includes('undefined');

    if (hasConditionals) {
      suggestions.push('Test all conditional branches');
      confidence = Math.max(confidence, 0.6);
    }

    if (hasErrorHandling) {
      suggestions.push('Test error paths and exception handling');
      confidence = Math.max(confidence, 0.65);
    }

    if (hasEdgeCases) {
      suggestions.push('Test edge cases (null, undefined, empty values)');
      confidence = Math.max(confidence, 0.6);
    }

    if (!hasConditionals && !hasErrorHandling && !hasEdgeCases) {
      suggestions.push('Consider writing unit tests for this code');
      severity = 'suggestion';
      confidence = 0.4;
    }

    return {
      confidence,
      bid: confidence * 0.75 + 0.2,
      issues,
      suggestions,
      severity,
    };
  }

  private formatReview(analysis: ReviewAnalysis): string {
    const parts: string[] = [];

    for (const suggestion of analysis.suggestions) {
      parts.push(`TEST: ${suggestion}`);
    }

    return parts.join('. ') + '.';
  }
}

/**
 * DocumentationAgent - Checks documentation completeness
 */
export class DocumentationAgent extends BaseAgent {
  private reviewCount = 0;

  constructor(config: AgentConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    console.log(`  ${this.id} initialized`);
  }

  async process<T>(input: T): Promise<A2APackage<T>> {
    this.touch();
    this.reviewCount++;

    const code = input as string;
    const analysis = this.analyzeDocumentation(code);
    const review = this.formatReview(analysis);

    const a2aPackage: A2APackage<T> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: 'colony',
      type: 'documentation-review',
      payload: review as T,
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: 'PUBLIC' as any,
      layer: 'HABITUAL' as any,
    };

    return a2aPackage;
  }

  async shutdown(): Promise<void> {
    console.log(`  ${this.id} shutdown (reviewed ${this.reviewCount} files)`);
  }

  private analyzeDocumentation(code: string): ReviewAnalysis {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let severity: 'critical' | 'warning' | 'info' | 'suggestion' = 'suggestion';
    let confidence = 0.3;

    // Check for documentation
    const hasComments = code.includes('//') || code.includes('/*') || code.includes('*');
    const hasFunction = code.includes('function ') || code.includes('=>');
    const hasJSDoc = code.includes('/**');

    if (hasFunction && !hasJSDoc) {
      suggestions.push('Consider adding JSDoc comments for functions');
      confidence = Math.max(confidence, 0.5);
    }

    if (!hasComments) {
      suggestions.push('Add comments to explain complex logic');
      confidence = Math.max(confidence, 0.4);
    }

    if (hasComments) {
      suggestions.push('Documentation present - good for maintainability');
      severity = 'info';
    }

    return {
      confidence,
      bid: confidence * 0.6 + 0.1,
      issues,
      suggestions,
      severity,
    };
  }

  private formatReview(analysis: ReviewAnalysis): string {
    const parts: string[] = [];

    for (const suggestion of analysis.suggestions) {
      parts.push(suggestion);
    }

    return parts.join('. ') + '.';
  }
}
