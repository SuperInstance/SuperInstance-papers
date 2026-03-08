/**
 * POLLN Guardian Constraints
 * Built-in safety constraints for Guardian Angel system
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  GuardianConstraint,
  GuardianContext,
  ConstraintResult,
  ConstraintCategory,
  ConstraintSeverity,
} from './types.js';

// ============================================================================
// Constraint Factory
// ============================================================================

function createConstraint(
  name: string,
  description: string,
  category: ConstraintCategory,
  severity: ConstraintSeverity,
  evaluate: (context: GuardianContext) => Promise<ConstraintResult>,
  weight: number = 1.0
): GuardianConstraint {
  return {
    id: uuidv4(),
    name,
    description,
    category,
    severity,
    weight,
    active: true,
    version: 1,
    evaluate,
    adaptiveWeight: true,
    falsePositiveCount: 0,
    falseNegativeCount: 0,
    lastAdjusted: Date.now(),
  };
}

// ============================================================================
// Resource Limit Constraints
// ============================================================================

export const memoryLimitConstraint = createConstraint(
  'Memory Limit',
  'Ensures agent execution does not exceed memory limits',
  'resource_limits',
  'high',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const MAX_MEMORY_MB = 4096; // 4GB default
    const estimatedMemory = context.estimatedMemoryMB || 0;

    if (estimatedMemory > MAX_MEMORY_MB) {
      return {
        passed: false,
        decision: 'VETO',
        reason: `Estimated memory usage (${estimatedMemory}MB) exceeds limit (${MAX_MEMORY_MB}MB)`,
        severity: 'high',
        confidence: 0.95,
        modifications: {
          estimatedMemoryMB: MAX_MEMORY_MB,
        },
      };
    }

    if (estimatedMemory > MAX_MEMORY_MB * 0.8) {
      return {
        passed: true,
        decision: 'MODIFY',
        reason: `Memory usage close to limit (${estimatedMemory}MB/${MAX_MEMORY_MB}MB)`,
        severity: 'medium',
        confidence: 0.8,
      };
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'Memory usage within acceptable limits',
      severity: 'low',
      confidence: 0.9,
    };
  },
  1.0
);

export const cpuLimitConstraint = createConstraint(
  'CPU Time Limit',
  'Prevents agents from monopolizing CPU resources',
  'resource_limits',
  'high',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const MAX_CPU_MS = 10000; // 10 seconds
    const estimatedCpu = context.estimatedCpuMs || 0;

    if (estimatedCpu > MAX_CPU_MS) {
      return {
        passed: false,
        decision: 'VETO',
        reason: `Estimated CPU time (${estimatedCpu}ms) exceeds limit (${MAX_CPU_MS}ms)`,
        severity: 'high',
        confidence: 0.95,
      };
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'CPU time within acceptable limits',
      severity: 'low',
      confidence: 0.9,
    };
  },
  0.9
);

export const executionDurationConstraint = createConstraint(
  'Execution Duration',
  'Limits how long an agent can run',
  'resource_limits',
  'high',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const MAX_DURATION = 30000; // 30 seconds
    const estimatedDuration = context.estimatedDuration || 0;

    if (estimatedDuration > MAX_DURATION) {
      return {
        passed: false,
        decision: 'VETO',
        reason: `Estimated duration (${estimatedDuration}ms) exceeds limit (${MAX_DURATION}ms)`,
        severity: 'high',
        confidence: 0.95,
      };
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'Execution duration within acceptable limits',
      severity: 'low',
      confidence: 0.9,
    };
  },
  0.9
);

// ============================================================================
// Action Control Constraints
// ============================================================================

export const actionWhitelistConstraint = createConstraint(
  'Action Whitelist',
  'Only allows whitelisted actions to execute',
  'action_control',
  'critical',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const WHITELISTED_ACTIONS = [
      'analyze',
      'process',
      'transform',
      'query',
      'search',
      'validate',
      'calculate',
      'summarize',
      'classify',
      'recommend',
    ];

    const action = context.action.toLowerCase();

    if (!WHITELISTED_ACTIONS.some(allowed => action.includes(allowed))) {
      return {
        passed: false,
        decision: 'VETO',
        reason: `Action "${context.action}" is not whitelisted`,
        severity: 'critical',
        confidence: 1.0,
      };
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'Action is whitelisted',
      severity: 'low',
      confidence: 1.0,
    };
  },
  1.0
);

export const actionBlacklistConstraint = createConstraint(
  'Action Blacklist',
  'Blocks dangerous or prohibited actions',
  'action_control',
  'critical',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const BLACKLISTED_ACTIONS = [
      'delete',
      'destroy',
      'format',
      'wipe',
      'erase',
      'drop_table',
      'truncate',
      'exec',
      'eval',
      'system',
      'shell',
      'sudo',
      'admin',
      'root',
    ];

    const action = context.action.toLowerCase();

    if (BLACKLISTED_ACTIONS.some(prohibited => action.includes(prohibited))) {
      return {
        passed: false,
        decision: 'VETO',
        reason: `Action "${context.action}" is blacklisted`,
        severity: 'critical',
        confidence: 1.0,
      };
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'Action is not blacklisted',
      severity: 'low',
      confidence: 1.0,
    };
  },
  1.0
);

export const fileOperationConstraint = createConstraint(
  'File Operation Safety',
  'Validates file operations for safety',
  'action_control',
  'high',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const dangerousPaths = [
      '/etc/',
      '/sys/',
      '/proc/',
      '/boot/',
      'C:\\Windows\\',
      'C:\\Program Files\\',
      '~/.ssh/',
      '~/.gnupg/',
    ];

    const payloadStr = JSON.stringify(context.payload).toLowerCase();

    for (const path of dangerousPaths) {
      if (payloadStr.includes(path.toLowerCase())) {
        return {
          passed: false,
          decision: 'VETO',
          reason: `File operation references dangerous path: ${path}`,
          severity: 'critical',
          confidence: 0.95,
        };
      }
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'File operation appears safe',
      severity: 'low',
      confidence: 0.85,
    };
  },
  0.95
);

// ============================================================================
// Rate Limiting Constraints
// ============================================================================

const executionCounts = new Map<string, { count: number; resetTime: number }>();

export const agentRateLimitConstraint = createConstraint(
  'Agent Rate Limit',
  'Prevents agents from executing too frequently',
  'rate_limiting',
  'medium',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const MAX_EXECUTIONS_PER_MINUTE = 60;
    const WINDOW_MS = 60000; // 1 minute
    const now = Date.now();

    let counter = executionCounts.get(context.agentId);
    if (!counter || now > counter.resetTime) {
      counter = { count: 0, resetTime: now + WINDOW_MS };
      executionCounts.set(context.agentId, counter);
    }

    counter.count++;

    if (counter.count > MAX_EXECUTIONS_PER_MINUTE) {
      return {
        passed: false,
        decision: 'VETO',
        reason: `Agent has exceeded rate limit (${counter.count}/${MAX_EXECUTIONS_PER_MINUTE} per minute)`,
        severity: 'medium',
        confidence: 1.0,
      };
    }

    const utilization = counter.count / MAX_EXECUTIONS_PER_MINUTE;
    if (utilization > 0.8) {
      return {
        passed: true,
        decision: 'MODIFY',
        reason: `Agent approaching rate limit (${counter.count}/${MAX_EXECUTIONS_PER_MINUTE})`,
        severity: 'low',
        confidence: 0.9,
      };
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'Agent within rate limits',
      severity: 'low',
      confidence: 0.95,
    };
  },
  0.7
);

export const globalRateLimitConstraint = createConstraint(
  'Global Rate Limit',
  'Prevents system overload from total execution rate',
  'rate_limiting',
  'high',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const MAX_GLOBAL_EXECUTIONS_PER_SECOND = 100;

    let globalCounter = executionCounts.get('__global__');
    if (!globalCounter || Date.now() > globalCounter.resetTime) {
      globalCounter = { count: 0, resetTime: Date.now() + 1000 };
      executionCounts.set('__global__', globalCounter);
    }

    globalCounter.count++;

    if (globalCounter.count > MAX_GLOBAL_EXECUTIONS_PER_SECOND) {
      return {
        passed: false,
        decision: 'VETO',
        reason: `System rate limit exceeded (${globalCounter.count}/${MAX_GLOBAL_EXECUTIONS_PER_SECOND} per second)`,
        severity: 'high',
        confidence: 1.0,
      };
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'System within rate limits',
      severity: 'low',
      confidence: 0.95,
    };
  },
  0.8
);

// ============================================================================
// Privacy Protection Constraints
// ============================================================================

export const piiDetectionConstraint = createConstraint(
  'PII Detection',
  'Detects and blocks execution of actions containing PII',
  'privacy_protection',
  'high',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{16}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone
      /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // IP address
    ];

    const payloadStr = JSON.stringify(context.payload);

    for (const pattern of piiPatterns) {
      if (pattern.test(payloadStr)) {
        return {
          passed: false,
          decision: 'VETO',
          reason: 'Payload contains potential PII',
          severity: 'high',
          confidence: 0.85,
        };
      }
    }

    if (context.containsPII) {
      return {
        passed: false,
        decision: 'VETO',
        reason: 'Payload flagged as containing PII',
        severity: 'high',
        confidence: 0.9,
      };
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'No PII detected',
      severity: 'low',
      confidence: 0.8,
    };
  },
  0.95
);

export const sensitiveDataConstraint = createConstraint(
  'Sensitive Data Protection',
  'Protects sensitive data from unauthorized access',
  'privacy_protection',
  'high',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const sensitiveKeywords = [
      'password',
      'secret',
      'token',
      'api_key',
      'credential',
      'private_key',
      'auth',
    ];

    const payloadStr = JSON.stringify(context.payload).toLowerCase();

    for (const keyword of sensitiveKeywords) {
      if (payloadStr.includes(keyword)) {
        return {
          passed: false,
          decision: 'VETO',
          reason: `Payload contains sensitive data keyword: ${keyword}`,
          severity: 'high',
          confidence: 0.85,
        };
      }
    }

    if (context.containsSensitiveData) {
      return {
        passed: false,
        decision: 'VETO',
        reason: 'Payload flagged as containing sensitive data',
        severity: 'high',
        confidence: 0.9,
      };
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'No sensitive data detected',
      severity: 'low',
      confidence: 0.85,
    };
  },
  0.9
);

export const privacyLevelConstraint = createConstraint(
  'Privacy Level Enforcement',
  'Enforces appropriate privacy levels for actions',
  'privacy_protection',
  'medium',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    if (context.privacyLevel === 'PRIVATE' && context.layer !== 'SAFETY') {
      return {
        passed: false,
        decision: 'VETO',
        reason: 'Private data can only be accessed at SAFETY layer',
        severity: 'high',
        confidence: 1.0,
      };
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'Privacy level appropriate for execution',
      severity: 'low',
      confidence: 0.95,
    };
  },
  0.8
);

// ============================================================================
// Ethical Guidelines Constraints
// ============================================================================

export const harmPreventionConstraint = createConstraint(
  'Harm Prevention',
  'Prevents actions that could cause harm',
  'ethical_guidelines',
  'critical',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const harmfulPatterns = [
      'exploit',
      'vulnerability',
      'attack',
      'malware',
      'weapon',
      'violence',
      'harmful',
      'dangerous',
    ];

    const actionStr = context.action.toLowerCase();
    const payloadStr = JSON.stringify(context.payload).toLowerCase();

    for (const pattern of harmfulPatterns) {
      if (actionStr.includes(pattern) || payloadStr.includes(pattern)) {
        return {
          passed: false,
          decision: 'VETO',
          reason: `Action may cause harm: contains "${pattern}"`,
          severity: 'critical',
          confidence: 0.9,
        };
      }
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'Action appears safe',
      severity: 'low',
      confidence: 0.85,
    };
  },
  1.0
);

export const biasDetectionConstraint = createConstraint(
  'Bias Detection',
  'Detects potential bias in agent decisions',
  'ethical_guidelines',
  'medium',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const biasIndicators = [
      'gender',
      'race',
      'ethnicity',
      'religion',
      'age',
      'disability',
    ];

    const payloadStr = JSON.stringify(context.payload).toLowerCase();

    let suspiciousCount = 0;
    for (const indicator of biasIndicators) {
      if (payloadStr.includes(indicator)) {
        suspiciousCount++;
      }
    }

    if (suspiciousCount >= 2) {
      return {
        passed: true,
        decision: 'MODIFY',
        reason: 'Action may involve sensitive demographic data',
        severity: 'medium',
        confidence: 0.7,
      };
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'No bias indicators detected',
      severity: 'low',
      confidence: 0.8,
    };
  },
  0.7
);

export const transparencyConstraint = createConstraint(
  'Transparency Requirement',
  'Ensures agent actions are traceable and explainable',
  'ethical_guidelines',
  'medium',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    if (!context.trace || context.trace.length === 0) {
      return {
        passed: true,
        decision: 'MODIFY',
        reason: 'Action lacks traceability - minimal causal chain',
        severity: 'low',
        confidence: 0.9,
      };
    }

    if (context.trace.length < 2) {
      return {
        passed: true,
        decision: 'ALLOW',
        reason: 'Action has basic traceability',
        severity: 'low',
        confidence: 0.8,
      };
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'Action has good traceability',
      severity: 'low',
      confidence: 0.95,
    };
  },
  0.6
);

// ============================================================================
// Output Validation Constraints
// ============================================================================

export const outputSizeConstraint = createConstraint(
  'Output Size Limit',
  'Prevents agents from generating excessively large outputs',
  'output_validation',
  'medium',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10MB
    const payloadSize = JSON.stringify(context.payload).length;

    if (payloadSize > MAX_OUTPUT_SIZE) {
      return {
        passed: false,
        decision: 'VETO',
        reason: `Payload size (${payloadSize} bytes) exceeds limit (${MAX_OUTPUT_SIZE} bytes)`,
        severity: 'medium',
        confidence: 0.95,
      };
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'Payload size within acceptable limits',
      severity: 'low',
      confidence: 0.9,
    };
  },
  0.7
);

export const outputFormatConstraint = createConstraint(
  'Output Format Validation',
  'Ensures agent outputs are valid and well-formed',
  'output_validation',
  'low',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    try {
      JSON.stringify(context.payload);
      return {
        passed: true,
        decision: 'ALLOW',
        reason: 'Payload is valid JSON',
        severity: 'low',
        confidence: 1.0,
      };
    } catch {
      return {
        passed: false,
        decision: 'VETO',
        reason: 'Payload is not valid JSON',
        severity: 'high',
        confidence: 1.0,
      };
    }
  },
  0.5
);

export const maliciousContentConstraint = createConstraint(
  'Malicious Content Detection',
  'Detects potentially malicious content in outputs',
  'output_validation',
  'critical',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const maliciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // Event handlers
      /<iframe[^>]*>/gi,
    ];

    const payloadStr = JSON.stringify(context.payload);

    for (const pattern of maliciousPatterns) {
      if (pattern.test(payloadStr)) {
        return {
          passed: false,
          decision: 'VETO',
          reason: 'Payload contains potentially malicious content',
          severity: 'critical',
          confidence: 0.9,
        };
      }
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'No malicious content detected',
      severity: 'low',
      confidence: 0.85,
    };
  },
  0.95
);

// ============================================================================
// Security Constraints
// ============================================================================

export const injectionAttackConstraint = createConstraint(
  'Injection Attack Prevention',
  'Prevents SQL, command, and code injection attacks',
  'security',
  'critical',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const injectionPatterns = [
      /('|('')|;|\-\-|\#|\/\*|\*\/|xp_|sp_)/gi, // SQL injection
      /\|&|;\$\(|>\(|`\$\(/gi, // Command injection
      /eval\(|exec\(|system\(/gi, // Code injection
    ];

    const payloadStr = JSON.stringify(context.payload);

    for (const pattern of injectionPatterns) {
      if (pattern.test(payloadStr)) {
        return {
          passed: false,
          decision: 'VETO',
          reason: 'Payload contains potential injection attack',
          severity: 'critical',
          confidence: 0.9,
        };
      }
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'No injection patterns detected',
      severity: 'low',
      confidence: 0.9,
    };
  },
  1.0
);

export const networkAccessConstraint = createConstraint(
  'Network Access Control',
  'Controls which external network calls agents can make',
  'security',
  'high',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const allowedDomains = [
      'api.openai.com',
      'api.anthropic.com',
      'localhost',
      '127.0.0.1',
    ];

    const payloadStr = JSON.stringify(context.payload).toLowerCase();

    // Check for URLs in payload
    const urlPattern = /https?:\/\/[^\s"']+/gi;
    const urls = payloadStr.match(urlPattern) || [];

    for (const url of urls) {
      const domain = new URL(url).hostname;
      if (!allowedDomains.some(allowed => domain.includes(allowed))) {
        return {
          passed: false,
          decision: 'VETO',
          reason: `Attempt to access unauthorized domain: ${domain}`,
          severity: 'high',
          confidence: 0.95,
        };
      }
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'Network access authorized',
      severity: 'low',
      confidence: 0.9,
    };
  },
  0.9
);

// ============================================================================
// Compliance Constraints
// ============================================================================

export const auditTrailConstraint = createConstraint(
  'Audit Trail Requirement',
  'Ensures all actions are properly logged for audit',
  'compliance',
  'medium',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    if (!context.trace || context.trace.length === 0) {
      return {
        passed: true,
        decision: 'MODIFY',
        reason: 'Action missing audit trail - adding trace',
        severity: 'medium',
        confidence: 0.9,
        metadata: { requiresTrace: true },
      };
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'Action has proper audit trail',
      severity: 'low',
      confidence: 0.95,
    };
  },
  0.7
);

export const dataRetentionConstraint = createConstraint(
  'Data Retention Policy',
  'Enforces data retention and deletion policies',
  'compliance',
  'low',
  async (context: GuardianContext): Promise<ConstraintResult> => {
    const MAX_RETENTION_DAYS = 30;

    // Check if metadata contains timestamp
    const timestamp = context.metadata.timestamp as number | undefined;
    if (timestamp) {
      const ageDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
      if (ageDays > MAX_RETENTION_DAYS) {
        return {
          passed: false,
          decision: 'VETO',
          reason: `Data exceeds retention policy (${ageDays.toFixed(0)} days > ${MAX_RETENTION_DAYS} days)`,
          severity: 'medium',
          confidence: 0.95,
        };
      }
    }

    return {
      passed: true,
      decision: 'ALLOW',
      reason: 'Data within retention policy',
      severity: 'low',
      confidence: 0.9,
    };
  },
  0.5
);

// ============================================================================
// Built-in Constraints Collection
// ============================================================================

export const BUILT_IN_CONSTRAINTS: GuardianConstraint[] = [
  // Resource limits
  memoryLimitConstraint,
  cpuLimitConstraint,
  executionDurationConstraint,

  // Action control
  actionWhitelistConstraint,
  actionBlacklistConstraint,
  fileOperationConstraint,

  // Rate limiting
  agentRateLimitConstraint,
  globalRateLimitConstraint,

  // Privacy protection
  piiDetectionConstraint,
  sensitiveDataConstraint,
  privacyLevelConstraint,

  // Ethical guidelines
  harmPreventionConstraint,
  biasDetectionConstraint,
  transparencyConstraint,

  // Output validation
  outputSizeConstraint,
  outputFormatConstraint,
  maliciousContentConstraint,

  // Security
  injectionAttackConstraint,
  networkAccessConstraint,

  // Compliance
  auditTrailConstraint,
  dataRetentionConstraint,
];

// ============================================================================
// Constraint Categories
// ============================================================================

export const CONSTRAINT_CATEGORIES: Record<ConstraintCategory, string> = {
  resource_limits: 'Resource Limits',
  action_control: 'Action Control',
  rate_limiting: 'Rate Limiting',
  privacy_protection: 'Privacy Protection',
  ethical_guidelines: 'Ethical Guidelines',
  output_validation: 'Output Validation',
  security: 'Security',
  compliance: 'Compliance',
};

// ============================================================================
// Helper Functions
// ============================================================================

export function getConstraintsByCategory(
  category: ConstraintCategory
): GuardianConstraint[] {
  return BUILT_IN_CONSTRAINTS.filter(c => c.category === category);
}

export function getConstraintsBySeverity(
  severity: ConstraintSeverity
): GuardianConstraint[] {
  return BUILT_IN_CONSTRAINTS.filter(c => c.severity === severity);
}

export function getActiveConstraints(): GuardianConstraint[] {
  return BUILT_IN_CONSTRAINTS.filter(c => c.active);
}

export function getConstraintById(id: string): GuardianConstraint | undefined {
  return BUILT_IN_CONSTRAINTS.find(c => c.id === id);
}
