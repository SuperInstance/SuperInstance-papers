/**
 * Tests for Error Handler
 */

import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { ErrorHandler, globalErrorHandler } from '../ErrorHandler.js';
import { PollnError, InvalidCellError, NetworkError } from '../PollnError.js';
import { ErrorLogger } from '../ErrorLogger.js';

describe('ErrorHandler', () => {
  let handler: ErrorHandler;
  let mockLogger: ErrorLogger;

  beforeEach(() => {
    mockLogger = {
      logError: vi.fn(),
    } as unknown as ErrorLogger;
    handler = new ErrorHandler(mockLogger);
  });

  describe('handle', () => {
    it('should handle PollnError', () => {
      const error = new InvalidCellError('ZZ999');
      const response = handler.handle(error);

      expect(response.code).toBe('INVALID_CELL');
      expect(response.error).toBe('InvalidCellError');
      expect(response.correlationId).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error');
      const response = handler.handle(error);

      expect(response.code).toBe('INTERNAL_ERROR');
      expect(response.error).toBe('PollnError');
      expect(response.message).toBe('Generic error');
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';
      const response = handler.handle(error);

      expect(response.code).toBe('INTERNAL_ERROR');
      expect(response.message).toBe('String error');
    });

    it('should include context in response', () => {
      const error = new InvalidCellError('ZZ999');
      const response = handler.handle(error, {
        userId: 'user123',
        sessionId: 'session456',
      });

      expect(response.correlationId).toBeDefined();
    });
  });

  describe('isRetryable', () => {
    it('should identify retryable errors', () => {
      const error = new NetworkError('Network error', 'NETWORK_ERROR', 0);
      expect(handler.isRetryable(error)).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      const error = new InvalidCellError('ZZ999');
      expect(handler.isRetryable(error)).toBe(false);
    });
  });

  describe('toUserMessage', () => {
    it('should return user-friendly message for known error', () => {
      const error = new InvalidCellError('ZZ999');
      const message = handler.toUserMessage(error);

      expect(message).toBe('The cell reference you entered is not valid. Please check and try again.');
    });

    it('should return error message for unknown error', () => {
      const error = new PollnError('Custom error', 'INTERNAL_ERROR', 500);
      const message = handler.toUserMessage(error);

      expect(message).toBe('Custom error');
    });
  });

  describe('getSuggestedActions', () => {
    it('should return suggested actions for known error', () => {
      const error = new InvalidCellError('ZZ999');
      const actions = handler.getSuggestedActions(error);

      expect(actions).toHaveLength(2);
      expect(actions[0]).toBe('Try again later');
    });
  });

  describe('log', () => {
    it('should log error via logger', () => {
      const error = new InvalidCellError('ZZ999');
      handler.log(error);

      expect(mockLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          severity: expect.any(String),
          retryable: expect.any(Boolean),
        })
      );
    });
  });

  describe('shouldAlert', () => {
    it('should alert for critical errors', () => {
      const error = new PollnError('Critical error', 'INTERNAL_ERROR', 500);
      expect(handler.shouldAlert(error)).toBe(true);
    });

    it('should not alert for low severity errors', () => {
      const error = new InvalidCellError('ZZ999');
      expect(handler.shouldAlert(error)).toBe(false);
    });
  });

  describe('alert', () => {
    it('should log alert for critical errors', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new PollnError('Critical error', 'INTERNAL_ERROR', 500);

      handler.alert(error);

      expect(mockLogger.logError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response from code and message', () => {
      const response = handler.createErrorResponse(
        'INVALID_CELL',
        'Invalid cell reference',
        { cellRef: 'ZZ999' }
      );

      expect(response.code).toBe('INVALID_CELL');
      expect(response.message).toBe('Invalid cell reference');
      expect(response.details).toEqual({ cellRef: 'ZZ999' });
    });
  });

  describe('wrap', () => {
    it('should wrap function with error handling', async () => {
      const fn = async () => {
        throw new InvalidCellError('ZZ999');
      };

      const wrapped = handler.wrap(fn);

      await expect(wrapped()).rejects.toEqual(
        expect.objectContaining({
          code: 'INVALID_CELL',
        })
      );
    });

    it('should return result on success', async () => {
      const fn = async () => 'success';
      const wrapped = handler.wrap(fn);

      await expect(wrapped()).resolves.toBe('success');
    });
  });

  describe('handleAsync', () => {
    it('should handle successful promises', async () => {
      const promise = Promise.resolve('success');
      await expect(handler.handleAsync(promise)).resolves.toBe('success');
    });

    it('should handle rejected promises', async () => {
      const promise = Promise.reject(new InvalidCellError('ZZ999'));
      await expect(handler.handleAsync(promise)).rejects.toEqual(
        expect.objectContaining({
          code: 'INVALID_CELL',
        })
      );
    });
  });
});

describe('globalErrorHandler', () => {
  it('should be singleton instance', () => {
    expect(globalErrorHandler).toBeInstanceOf(ErrorHandler);
  });
});
