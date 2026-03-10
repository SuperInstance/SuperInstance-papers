/**
 * Tests for POLLN Error Classes
 */

import { describe, it, expect } from '@jest/globals';
import {
  PollnError,
  ValidationError,
  InvalidCellError,
  InvalidFormulaError,
  InvalidValueError,
  InvalidRangeError,
  TypeMismatchError,
  FormulaParseError,
  CircularDependencyError,
  DivisionByZeroError,
  PermissionError,
  AccessDeniedError,
  ResourceNotFoundError,
  ReadOnlyError,
  AuthenticationFailedError,
  InsufficientPermissionsError,
  BusinessLogicError,
  VersionConflictError,
  QuotaExceededError,
  LockedCellError,
  SpreadsheetFullError,
  DependencyFailedError,
  SystemError,
  DatabaseError,
  MemoryError,
  ComputationError,
  InternalError,
  ServiceUnavailableError,
  NetworkError,
  NetworkConnectionError,
  TimeoutError,
  ConnectionLostError,
  RequestTooLargeError,
  ExternalServiceError,
  ExternalApiError,
  ExternalApiTimeoutError,
  ExternalServiceUnavailableError,
  CircuitBreakerOpenError,
} from '../PollnError.js';

describe('PollnError', () => {
  describe('Base PollnError', () => {
    it('should create a basic PollnError', () => {
      const error = new PollnError(
        'Test error',
        'INTERNAL_ERROR',
        500,
        { detail: 'test' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.correlationId).toBeDefined();
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should convert to response format', () => {
      const error = new PollnError(
        'Test error',
        'INTERNAL_ERROR',
        500
      );

      const response = error.toResponse();

      expect(response.error).toBe('PollnError');
      expect(response.code).toBe('INTERNAL_ERROR');
      expect(response.message).toBe('Test error');
      expect(response.correlationId).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should convert to JSON', () => {
      const error = new PollnError(
        'Test error',
        'INTERNAL_ERROR',
        500
      );

      const json = error.toJSON();

      expect(json.name).toBe('PollnError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('INTERNAL_ERROR');
    });

    it('should create from generic Error', () => {
      const genericError = new Error('Generic error');
      const pollnError = PollnError.fromError(genericError);

      expect(pollnError).toBeInstanceOf(PollnError);
      expect(pollnError.message).toBe('Generic error');
    });

    it('should return PollnError if already PollnError', () => {
      const originalError = new PollnError(
        'Test error',
        'INTERNAL_ERROR',
        500
      );
      const pollnError = PollnError.fromError(originalError);

      expect(pollnError).toBe(originalError);
    });
  });

  describe('Validation Errors', () => {
    it('should create InvalidCellError', () => {
      const error = new InvalidCellError('ZZ999');

      expect(error.code).toBe('INVALID_CELL');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ cellRef: 'ZZ999' });
    });

    it('should create InvalidFormulaError', () => {
      const error = new InvalidFormulaError('=SUM(', 'Missing closing parenthesis');

      expect(error.code).toBe('INVALID_FORMULA');
      expect(error.details).toEqual({
        formula: '=SUM(',
        reason: 'Missing closing parenthesis',
      });
    });

    it('should create InvalidValueError', () => {
      const error = new InvalidValueError('abc', 'number');

      expect(error.code).toBe('INVALID_VALUE');
      expect(error.details).toEqual({
        value: 'abc',
        expectedType: 'number',
      });
    });

    it('should create InvalidRangeError', () => {
      const error = new InvalidRangeError('A1:B');

      expect(error.code).toBe('INVALID_RANGE');
      expect(error.details).toEqual({ range: 'A1:B' });
    });

    it('should create TypeMismatchError', () => {
      const error = new TypeMismatchError('text', 'number', 'string');

      expect(error.code).toBe('TYPE_MISMATCH');
      expect(error.details).toEqual({
        value: 'text',
        expectedType: 'number',
        actualType: 'string',
      });
    });

    it('should create FormulaParseError', () => {
      const error = new FormulaParseError('=1/0', 'Division by zero');

      expect(error.code).toBe('FORMULA_PARSE_ERROR');
      expect(error.details).toEqual({
        formula: '=1/0',
        parseError: 'Division by zero',
      });
    });

    it('should create CircularDependencyError', () => {
      const error = new CircularDependencyError(['A1', 'B1', 'A1']);

      expect(error.code).toBe('CIRCULAR_DEPENDENCY');
      expect(error.details).toEqual({
        path: ['A1', 'B1', 'A1'],
      });
    });

    it('should create DivisionByZeroError', () => {
      const error = new DivisionByZeroError();

      expect(error.code).toBe('DIVISION_BY_ZERO');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('Permission Errors', () => {
    it('should create AccessDeniedError', () => {
      const error = new AccessDeniedError('Sheet1', 'user123');

      expect(error.code).toBe('ACCESS_DENIED');
      expect(error.statusCode).toBe(403);
      expect(error.details).toEqual({
        resource: 'Sheet1',
        userId: 'user123',
      });
    });

    it('should create ResourceNotFoundError', () => {
      const error = new ResourceNotFoundError('Spreadsheet', 'abc123');

      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({
        resourceType: 'Spreadsheet',
        resourceId: 'abc123',
      });
    });

    it('should create ReadOnlyError', () => {
      const error = new ReadOnlyError('Sheet1');

      expect(error.code).toBe('READ_ONLY');
      expect(error.statusCode).toBe(403);
      expect(error.details).toEqual({ resource: 'Sheet1' });
    });

    it('should create AuthenticationFailedError', () => {
      const error = new AuthenticationFailedError();

      expect(error.code).toBe('AUTHENTICATION_FAILED');
      expect(error.statusCode).toBe(401);
    });

    it('should create InsufficientPermissionsError', () => {
      const error = new InsufficientPermissionsError('write');

      expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(error.statusCode).toBe(403);
      expect(error.details).toEqual({
        requiredPermission: 'write',
      });
    });
  });

  describe('Business Logic Errors', () => {
    it('should create VersionConflictError', () => {
      const error = new VersionConflictError('Sheet1', 2, 3);

      expect(error.code).toBe('VERSION_CONFLICT');
      expect(error.statusCode).toBe(409);
      expect(error.details).toEqual({
        resource: 'Sheet1',
        expectedVersion: 2,
        actualVersion: 3,
      });
    });

    it('should create QuotaExceededError', () => {
      const error = new QuotaExceededError('cells', 10000, 5000);

      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(error.statusCode).toBe(429);
      expect(error.details).toEqual({
        quotaType: 'cells',
        current: 10000,
        limit: 5000,
      });
    });

    it('should create LockedCellError', () => {
      const error = new LockedCellError('A1', 'user456');

      expect(error.code).toBe('LOCKED_CELL');
      expect(error.statusCode).toBe(423);
      expect(error.details).toEqual({
        cellRef: 'A1',
        lockedBy: 'user456',
      });
    });

    it('should create SpreadsheetFullError', () => {
      const error = new SpreadsheetFullError(10000, 10000);

      expect(error.code).toBe('SPREADSHEET_FULL');
      expect(error.statusCode).toBe(413);
      expect(error.details).toEqual({
        currentSize: 10000,
        maxSize: 10000,
      });
    });

    it('should create DependencyFailedError', () => {
      const error = new DependencyFailedError('ExternalAPI', 'Timeout');

      expect(error.code).toBe('DEPENDENCY_FAILED');
      expect(error.statusCode).toBe(424);
      expect(error.details).toEqual({
        dependency: 'ExternalAPI',
        reason: 'Timeout',
      });
    });
  });

  describe('System Errors', () => {
    it('should create DatabaseError', () => {
      const cause = new Error('Connection failed');
      const error = new DatabaseError('query', cause);

      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ operation: 'query' });
      expect(error.cause).toBe(cause);
    });

    it('should create MemoryError', () => {
      const error = new MemoryError(1024, 512);

      expect(error.code).toBe('MEMORY_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({
        requested: 1024,
        available: 512,
      });
    });

    it('should create ComputationError', () => {
      const error = new ComputationError('SUM', 'Stack overflow');

      expect(error.code).toBe('COMPUTATION_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({
        operation: 'SUM',
        reason: 'Stack overflow',
      });
    });

    it('should create InternalError', () => {
      const cause = new Error('Unexpected error');
      const error = new InternalError('Something broke', { detail: 'test' }, undefined, cause);

      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.cause).toBe(cause);
    });

    it('should create ServiceUnavailableError', () => {
      const error = new ServiceUnavailableError('API', 'Maintenance');

      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.statusCode).toBe(503);
      expect(error.details).toEqual({
        service: 'API',
        reason: 'Maintenance',
      });
    });
  });

  describe('Network Errors', () => {
    it('should create NetworkConnectionError', () => {
      const error = new NetworkConnectionError('https://api.example.com');

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(0);
      expect(error.details).toEqual({
        url: 'https://api.example.com',
      });
    });

    it('should create TimeoutError', () => {
      const error = new TimeoutError('fetch', 5000);

      expect(error.code).toBe('TIMEOUT');
      expect(error.statusCode).toBe(408);
      expect(error.details).toEqual({
        operation: 'fetch',
        timeout: 5000,
      });
    });

    it('should create ConnectionLostError', () => {
      const error = new ConnectionLostError('wss://api.example.com');

      expect(error.code).toBe('CONNECTION_LOST');
      expect(error.statusCode).toBe(0);
      expect(error.details).toEqual({
        url: 'wss://api.example.com',
      });
    });

    it('should create RequestTooLargeError', () => {
      const error = new RequestTooLargeError(10485760, 5242880);

      expect(error.code).toBe('REQUEST_TOO_LARGE');
      expect(error.statusCode).toBe(413);
      expect(error.details).toEqual({
        size: 10485760,
        maxSize: 5242880,
      });
    });
  });

  describe('External Service Errors', () => {
    it('should create ExternalApiError', () => {
      const error = new ExternalApiError('Stripe', 'Invalid token');

      expect(error.code).toBe('EXTERNAL_API_ERROR');
      expect(error.statusCode).toBe(502);
      expect(error.details.service).toBe('Stripe');
      expect(error.details.apiError).toBe('Invalid token');
    });

    it('should create ExternalApiTimeoutError', () => {
      const error = new ExternalApiTimeoutError('Stripe', 30000);

      expect(error.code).toBe('EXTERNAL_API_TIMEOUT');
      expect(error.statusCode).toBe(504);
      expect(error.details.service).toBe('Stripe');
      expect(error.details.timeout).toBe(30000);
    });

    it('should create ExternalServiceUnavailableError', () => {
      const error = new ExternalServiceUnavailableError('Stripe', 'Maintenance');

      expect(error.code).toBe('EXTERNAL_API_UNAVAILABLE');
      expect(error.statusCode).toBe(503);
      expect(error.details.service).toBe('Stripe');
      expect(error.details.reason).toBe('Maintenance');
    });
  });

  describe('Circuit Breaker Errors', () => {
    it('should create CircuitBreakerOpenError', () => {
      const error = new CircuitBreakerOpenError('API', 30000);

      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.statusCode).toBe(503);
      expect(error.details).toEqual({
        breakerName: 'API',
        retryAfter: 30000,
      });
    });
  });
});
