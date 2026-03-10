/**
 * @file telemetry/EventTypes.ts
 * @brief Event type definitions, schemas, and validation for the telemetry system
 *
 * This file provides comprehensive event type definitions, validation schemas,
 * and event registration functionality. It ensures type safety and data integrity
 * throughout the telemetry collection process.
 *
 * @copyright Copyright (c) 2026 POLLN
 * @license MIT
 */

import {
  BaseEvent,
  UIEvent,
  CellEvent,
  PerformanceEvent,
  ErrorEvent,
  FeatureEvent,
  LifecycleEvent,
  EventCategory,
  EventPriority,
  PrivacyLevel,
  PIIType,
} from './types.js';

/**
 * Event schema definition
 */
export interface EventSchema {
  /** Event type name */
  type: string;

  /** Event category */
  category: EventCategory;

  /** Default priority */
  priority: EventPriority;

  /** Default privacy level */
  privacyLevel: PrivacyLevel;

  /** Required properties */
  required: string[];

  /** Optional properties with their types */
  optional?: Record<string, PropertyType>;

  /** Property validators */
  validators?: Record<string, Validator>;

  /** Whether this event contains sensitive data */
  sensitive: boolean;

  /** Description for documentation */
  description: string;

  /** Event version for schema evolution */
  version: string;
}

/**
 * Property type definitions
 */
export type PropertyType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'timestamp'
  | 'email'
  | 'url'
  | 'coordinates';

/**
 * Validator function type
 */
export type Validator = (value: unknown) => boolean | string;

/**
 * Event validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Warnings (non-blocking) */
  warnings: string[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  /** Property path */
  path: string;

  /** Error message */
  message: string;

  /** Invalid value */
  value: unknown;

  /** Expected type */
  expected: string;
}

/**
 * Event registry mapping
 */
export type EventRegistry = Map<string, EventSchema>;

/**
 * ========================================================================
 * UI EVENT SCHEMAS
 * ========================================================================
 */

/**
 * Click event schema
 * Tracks user clicks on UI elements
 */
export const CLICK_EVENT_SCHEMA: EventSchema = {
  type: 'ui_click',
  category: EventCategory.UI,
  priority: EventPriority.NORMAL,
  privacyLevel: PrivacyLevel.ANONYMOUS,
  required: ['element'],
  optional: {
    text: 'string',
    container: 'string',
    coordinates: 'object',
    target: 'url',
  },
  validators: {
    element: (value: unknown) => {
      if (typeof value !== 'string') return false;
      // Element should not contain PII
      return !containsPII(value);
    },
    text: (value: unknown) => {
      if (typeof value !== 'string') return 'Must be a string';
      if (value.length > 100) return 'Text too long (max 100 chars)';
      return !containsPII(value);
    },
  },
  sensitive: false,
  description: 'User clicked on a UI element',
  version: '1.0.0',
};

/**
 * Hover event schema
 * Tracks mouse hover events
 */
export const HOVER_EVENT_SCHEMA: EventSchema = {
  type: 'ui_hover',
  category: EventCategory.UI,
  priority: EventPriority.LOW,
  privacyLevel: PrivacyLevel.ANONYMOUS,
  required: ['element'],
  optional: {
    duration: 'number',
    container: 'string',
  },
  validators: {
    duration: (value: unknown) => {
      if (typeof value !== 'number') return false;
      return value >= 0 && value <= 60000; // Max 1 minute
    },
  },
  sensitive: false,
  description: 'User hovered over a UI element',
  version: '1.0.0',
};

/**
 * Scroll event schema
 * Tracks page and element scrolling
 */
export const SCROLL_EVENT_SCHEMA: EventSchema = {
  type: 'ui_scroll',
  category: EventCategory.UI,
  priority: EventPriority.LOW,
  privacyLevel: PrivacyLevel.ANONYMOUS,
  required: [],
  optional: {
    position: 'number',
    direction: 'string',
    element: 'string',
    viewportHeight: 'number',
    scrollHeight: 'number',
  },
  validators: {
    position: (value: unknown) => {
      if (typeof value !== 'number') return false;
      return value >= 0 && value <= 100; // Percentage
    },
  },
  sensitive: false,
  description: 'User scrolled content',
  version: '1.0.0',
};

/**
 * ========================================================================
 * CELL EVENT SCHEMAS
 * ========================================================================
 */

/**
 * Cell creation event schema
 */
export const CELL_CREATE_SCHEMA: EventSchema = {
  type: 'cell_create',
  category: EventCategory.CELL,
  priority: EventPriority.HIGH,
  privacyLevel: PrivacyLevel.ANONYMOUS,
  required: ['cellType'],
  optional: {
    location: 'object',
    dataSize: 'number',
    parentCell: 'string',
  },
  validators: {
    cellType: (value: unknown) => {
      const validTypes = [
        'InputCell',
        'OutputCell',
        'TransformCell',
        'FilterCell',
        'AggregateCell',
        'ValidateCell',
        'AnalysisCell',
        'PredictionCell',
        'DecisionCell',
        'ExplainCell',
      ];
      return typeof value === 'string' && validTypes.includes(value);
    },
    location: (value: unknown) => {
      if (typeof value !== 'object' || value === null) return false;
      const loc = value as Record<string, unknown>;
      return (
        typeof loc.row === 'number' &&
        loc.row >= 0 &&
        (typeof loc.column === 'string' || typeof loc.column === 'number')
      );
    },
  },
  sensitive: false,
  description: 'User created a new cell',
  version: '1.0.0',
};

/**
 * Cell update event schema
 */
export const CELL_UPDATE_SCHEMA: EventSchema = {
  type: 'cell_update',
  category: EventCategory.CELL,
  priority: EventPriority.HIGH,
  privacyLevel: PrivacyLevel.PERSONAL,
  required: ['cellType'],
  optional: {
    location: 'object',
    changeType: 'string',
    dataSize: 'number',
    previousValueHash: 'string',
  },
  validators: {
    changeType: (value: unknown) => {
      const validTypes = ['value', 'formula', 'format', 'dependencies'];
      return typeof value === 'string' && validTypes.includes(value);
    },
  },
  sensitive: true, // May contain user data
  description: 'User updated a cell',
  version: '1.0.0',
};

/**
 * Cell transformation event schema
 */
export const CELL_TRANSFORM_SCHEMA: EventSchema = {
  type: 'cell_transform',
  category: EventCategory.CELL,
  priority: EventPriority.HIGH,
  privacyLevel: PrivacyLevel.PERSONAL,
  required: ['cellType', 'transformation'],
  optional: {
    location: 'object',
    inputSize: 'number',
    outputSize: 'number',
    duration: 'number',
  },
  validators: {
    transformation: (value: unknown) => {
      if (typeof value !== 'string') return false;
      // Sanitize transformation name
      return !containsPII(value);
    },
  },
  sensitive: true,
  description: 'Cell transformation was applied',
  version: '1.0.0',
};

/**
 * ========================================================================
 * PERFORMANCE EVENT SCHEMAS
 * ========================================================================
 */

/**
 * Performance metric event schema
 */
export const PERF_METRIC_SCHEMA: EventSchema = {
  type: 'perf_metric',
  category: EventCategory.PERFORMANCE,
  priority: EventPriority.NORMAL,
  privacyLevel: PrivacyLevel.ANONYMOUS,
  required: ['metric', 'duration'],
  optional: {
    threshold: 'number',
    operation: 'string',
    metadata: 'object',
  },
  validators: {
    metric: (value: unknown) => {
      const validMetrics = [
        'cell_evaluation',
        'transformation_time',
        'render_time',
        'api_latency',
        'memory_usage',
        'cpu_usage',
      ];
      return typeof value === 'string' && validMetrics.includes(value);
    },
    duration: (value: unknown) => {
      if (typeof value !== 'number') return false;
      return value >= 0 && value <= 3600000; // Max 1 hour
    },
  },
  sensitive: false,
  description: 'Performance metric was measured',
  version: '1.0.0',
};

/**
 * Slow operation event schema
 */
export const PERF_SLOW_SCHEMA: EventSchema = {
  type: 'perf_slow',
  category: EventCategory.PERFORMANCE,
  priority: EventPriority.HIGH,
  privacyLevel: PrivacyLevel.ANONYMOUS,
  required: ['metric', 'duration', 'threshold'],
  optional: {
    operation: 'string',
    stackTrace: 'string',
  },
  validators: {
    duration: (value: unknown) => {
      if (typeof value !== 'number') return false;
      return value > 0;
    },
  },
  sensitive: false,
  description: 'Operation exceeded performance threshold',
  version: '1.0.0',
};

/**
 * ========================================================================
 * ERROR EVENT SCHEMAS
 * ========================================================================
 */

/**
 * Runtime error event schema
 */
export const ERROR_RUNTIME_SCHEMA: EventSchema = {
  type: 'error_runtime',
  category: EventCategory.ERROR,
  priority: EventPriority.CRITICAL,
  privacyLevel: PrivacyLevel.PERSONAL,
  required: ['message', 'component'],
  optional: {
    code: 'string',
    stack: 'string',
    action: 'string',
    userAgent: 'string',
  },
  validators: {
    message: (value: unknown) => {
      if (typeof value !== 'string') return false;
      if (value.length > 500) return 'Message too long';
      // Sanitize error message to remove potential PII
      return !detectPII(value).detected;
    },
    component: (value: unknown) => {
      const validComponents = [
        'cell_engine',
        'transform_engine',
        'ui_renderer',
        'api_client',
        'storage_manager',
        'collaboration',
      ];
      return typeof value === 'string' && validComponents.includes(value);
    },
  },
  sensitive: true,
  description: 'Runtime error occurred',
  version: '1.0.0',
};

/**
 * Network error event schema
 */
export const ERROR_NETWORK_SCHEMA: EventSchema = {
  type: 'error_network',
  category: EventCategory.ERROR,
  priority: EventPriority.HIGH,
  privacyLevel: PrivacyLevel.ANONYMOUS,
  required: ['message'],
  optional: {
    code: 'number',
    url: 'string',
    method: 'string',
    retryAttempt: 'number',
  },
  validators: {
    code: (value: unknown) => {
      if (typeof value !== 'number') return false;
      return value >= 400 && value < 600;
    },
    url: (value: unknown) => {
      if (typeof value !== 'string') return false;
      // Remove query parameters that might contain sensitive data
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    },
  },
  sensitive: false,
  description: 'Network error occurred',
  version: '1.0.0',
};

/**
 * Validation error event schema
 */
export const ERROR_VALIDATION_SCHEMA: EventSchema = {
  type: 'error_validation',
  category: EventCategory.ERROR,
  priority: EventPriority.NORMAL,
  privacyLevel: PrivacyLevel.PERSONAL,
  required: ['message', 'field'],
  optional: {
    value: 'string',
    constraint: 'string',
    rule: 'string',
  },
  validators: {
    field: (value: unknown) => {
      if (typeof value !== 'string') return false;
      // Sanitize field name
      return !containsPII(value);
    },
  },
  sensitive: true,
  description: 'Validation error occurred',
  version: '1.0.0',
};

/**
 * ========================================================================
 * FEATURE EVENT SCHEMAS
 * ========================================================================
 */

/**
 * Feature use event schema
 */
export const FEATURE_USE_SCHEMA: EventSchema = {
  type: 'feature_use',
  category: EventCategory.FEATURE,
  priority: EventPriority.HIGH,
  privacyLevel: PrivacyLevel.ANONYMOUS,
  required: ['feature'],
  optional: {
    version: 'string',
    duration: 'number',
    parameters: 'object',
    success: 'boolean',
  },
  validators: {
    feature: (value: unknown) => {
      const validFeatures = [
        'cell_transformations',
        'predictions',
        'collaboration',
        'templates',
        'export_import',
        'formulas',
        'charts',
        'automation',
      ];
      return typeof value === 'string' && validFeatures.includes(value);
    },
  },
  sensitive: false,
  description: 'User used a feature',
  version: '1.0.0',
};

/**
 * Feature discovery event schema
 */
export const FEATURE_DISCOVER_SCHEMA: EventSchema = {
  type: 'feature_discover',
  category: EventCategory.FEATURE,
  priority: EventPriority.NORMAL,
  privacyLevel: PrivacyLevel.ANONYMOUS,
  required: ['feature'],
  optional: {
    discoveryMethod: 'string',
    timeToDiscover: 'number',
  },
  validators: {
    discoveryMethod: (value: unknown) => {
      const validMethods = ['exploration', 'onboarding', 'search', 'suggestion', 'help'];
      return typeof value === 'string' && validMethods.includes(value);
    },
  },
  sensitive: false,
  description: 'User discovered a new feature',
  version: '1.0.0',
};

/**
 * ========================================================================
 * LIFECYCLE EVENT SCHEMAS
 * ========================================================================
 */

/**
 * Session start event schema
 */
export const SESSION_START_SCHEMA: EventSchema = {
  type: 'session_start',
  category: EventCategory.LIFECYCLE,
  priority: EventPriority.HIGH,
  privacyLevel: PrivacyLevel.ANONYMOUS,
  required: [],
  optional: {
    referrer: 'url',
    utmSource: 'string',
    utmMedium: 'string',
    utmCampaign: 'string',
    entryPoint: 'string',
  },
  validators: {
    entryPoint: (value: unknown) => {
      const validEntries = ['direct', 'link', 'search', 'social', 'email'];
      return typeof value === 'string' && validEntries.includes(value);
    },
  },
  sensitive: false,
  description: 'User session started',
  version: '1.0.0',
};

/**
 * Session end event schema
 */
export const SESSION_END_SCHEMA: EventSchema = {
  type: 'session_end',
  category: EventCategory.LIFECYCLE,
  priority: EventPriority.HIGH,
  privacyLevel: PrivacyLevel.ANONYMOUS,
  required: ['duration'],
  optional: {
    exitReason: 'string',
    pageCount: 'number',
    eventCount: 'number',
  },
  validators: {
    duration: (value: unknown) => {
      if (typeof value !== 'number') return false;
      return value > 0;
    },
    exitReason: (value: unknown) => {
      const validReasons = ['logout', 'timeout', 'close', 'navigate_away', 'crash'];
      return typeof value === 'string' && validReasons.includes(value);
    },
  },
  sensitive: false,
  description: 'User session ended',
  version: '1.0.0',
};

/**
 * ========================================================================
 * EVENT REGISTRY
 * ========================================================================
 */

/**
 * Global event registry
 * Contains all registered event schemas
 */
export const EVENT_REGISTRY: EventRegistry = new Map([
  // UI Events
  ['ui_click', CLICK_EVENT_SCHEMA],
  ['ui_hover', HOVER_EVENT_SCHEMA],
  ['ui_scroll', SCROLL_EVENT_SCHEMA],

  // Cell Events
  ['cell_create', CELL_CREATE_SCHEMA],
  ['cell_update', CELL_UPDATE_SCHEMA],
  ['cell_transform', CELL_TRANSFORM_SCHEMA],

  // Performance Events
  ['perf_metric', PERF_METRIC_SCHEMA],
  ['perf_slow', PERF_SLOW_SCHEMA],

  // Error Events
  ['error_runtime', ERROR_RUNTIME_SCHEMA],
  ['error_network', ERROR_NETWORK_SCHEMA],
  ['error_validation', ERROR_VALIDATION_SCHEMA],

  // Feature Events
  ['feature_use', FEATURE_USE_SCHEMA],
  ['feature_discover', FEATURE_DISCOVER_SCHEMA],

  // Lifecycle Events
  ['session_start', SESSION_START_SCHEMA],
  ['session_end', SESSION_END_SCHEMA],
]);

/**
 * ========================================================================
 * VALIDATION FUNCTIONS
 * ========================================================================
 */

/**
 * Get event schema by type
 * @param type - Event type
 * @returns Event schema or undefined
 */
export function getEventSchema(type: string): EventSchema | undefined {
  return EVENT_REGISTRY.get(type);
}

/**
 * Validate an event against its schema
 * @param event - Event to validate
 * @returns Validation result
 */
export function validateEvent(event: BaseEvent): ValidationResult {
  const schema = getEventSchema(event.type);
  if (!schema) {
    return {
      valid: false,
      errors: [
        {
          path: 'type',
          message: `Unknown event type: ${event.type}`,
          value: event.type,
          expected: 'registered event type',
        },
      ],
      warnings: [],
    };
  }

  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Validate required properties
  for (const prop of schema.required) {
    if (!(prop in (event.properties || {}))) {
      errors.push({
        path: `properties.${prop}`,
        message: `Missing required property: ${prop}`,
        value: undefined,
        expected: 'required property',
      });
    }
  }

  // Validate optional properties
  if (schema.optional && event.properties) {
    for (const [prop, type] of Object.entries(schema.optional)) {
      const value = event.properties[prop];
      if (value !== undefined) {
        if (!validatePropertyType(value, type)) {
          errors.push({
            path: `properties.${prop}`,
            message: `Invalid type for property: ${prop}`,
            value,
            expected: type,
          });
        }
      }
    }
  }

  // Run custom validators
  if (schema.validators && event.properties) {
    for (const [prop, validator] of Object.entries(schema.validators)) {
      const value = event.properties[prop];
      if (value !== undefined) {
        const result = validator(value);
        if (result !== true) {
          if (typeof result === 'string') {
            errors.push({
              path: `properties.${prop}`,
              message: result,
              value,
              expected: 'custom validation',
            });
          } else {
            errors.push({
              path: `properties.${prop}`,
              message: `Validation failed for property: ${prop}`,
              value,
              expected: 'custom validation',
            });
          }
        }
      }
    }
  }

  // Check for PII in sensitive events
  if (schema.sensitive) {
    for (const [key, value] of Object.entries(event.properties || {})) {
      if (typeof value === 'string') {
        const piiResult = detectPII(value);
        if (piiResult.detected) {
          warnings.push(
            `Property '${key}' may contain PII: ${piiResult.types.join(', ')}`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate property type
 * @param value - Property value
 * @param type - Expected type
 * @returns Whether type is valid
 */
function validatePropertyType(value: unknown, type: PropertyType): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'timestamp':
      return typeof value === 'string' && !isNaN(Date.parse(value));
    case 'email':
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case 'url':
      try {
        new URL(value as string);
        return true;
      } catch {
        return false;
      }
    case 'coordinates':
      return (
        typeof value === 'object' &&
        value !== null &&
        'x' in value &&
        'y' in value &&
        typeof (value as { x: unknown }).x === 'number' &&
        typeof (value as { y: unknown }).y === 'number'
      );
    default:
      return false;
  }
}

/**
 * Register a custom event schema
 * @param schema - Event schema to register
 */
export function registerEventSchema(schema: EventSchema): void {
  if (EVENT_REGISTRY.has(schema.type)) {
    throw new Error(`Event type already registered: ${schema.type}`);
  }
  EVENT_REGISTRY.set(schema.type, schema);
}

/**
 * Unregister an event schema
 * @param type - Event type to unregister
 */
export function unregisterEventSchema(type: string): void {
  EVENT_REGISTRY.delete(type);
}

/**
 * Get all registered event types
 * @returns Array of event type names
 */
export function getRegisteredEventTypes(): string[] {
  return Array.from(EVENT_REGISTRY.keys());
}

/**
 * ========================================================================
 * PII DETECTION HELPERS
 * ========================================================================
 */

/**
 * Detect potential PII in a string
 * @param text - Text to check
 * @returns PII detection result
 */
export function detectPII(text: string): { detected: boolean; types: PIIType[]; confidence: number } {
  const detected: PIIType[] = [];
  let confidence = 0;

  // Email detection
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)) {
    detected.push(PIIType.EMAIL);
    confidence = Math.max(confidence, 0.9);
  }

  // Phone detection
  if (/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) {
    detected.push(PIIType.PHONE);
    confidence = Math.max(confidence, 0.8);
  }

  // Credit card detection
  if (/\b(?:\d[ -]*?){13,16}\b/.test(text)) {
    detected.push(PIIType.CREDIT_CARD);
    confidence = Math.max(confidence, 0.7);
  }

  // SSN detection
  if (/\b\d{3}-?\d{2}-?\d{4}\b/.test(text)) {
    detected.push(PIIType.SSN);
    confidence = Math.max(confidence, 0.95);
  }

  // IP address detection
  if (/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(text)) {
    detected.push(PIIType.IP_ADDRESS);
    confidence = Math.max(confidence, 0.85);
  }

  return {
    detected: detected.length > 0,
    types: detected,
    confidence,
  };
}

/**
 * Check if string contains PII
 * @param text - Text to check
 * @returns Whether PII is present
 */
function containsPII(text: string): boolean {
  return detectPII(text).detected;
}
