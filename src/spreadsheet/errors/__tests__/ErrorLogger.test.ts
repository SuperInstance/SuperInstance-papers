/**
 * Tests for Error Logger
 */

import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { ErrorLogger, globalErrorLogger, redactSensitiveData } from '../ErrorLogger.js';
import { PollnError, InvalidCellError, NetworkError } from '../PollnError.js';
import { ErrorSeverity } from '../types.js';

describe('ErrorLogger', () => {
  let logger: ErrorLogger;

  beforeEach(() => {
    logger = new ErrorLogger({
      logToConsole: false,
      logEndpoint: '',
    });
  });

  describe('logError', () => {
    it('should log error', () => {
      const error = new InvalidCellError('ZZ999');
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      logger.logError(error);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should respect severity filter', () => {
      logger = new ErrorLogger({
        minSeverity: ErrorSeverity.HIGH,
        logToConsole: false,
      });

      const lowSeverityError = new InvalidCellError('ZZ999');
      const highSeverityError = new NetworkError('Network error', 'NETWORK_ERROR', 0);

      const lowSpy = vi.spyOn(logger as any, 'logToConsole');
      const highSpy = vi.spyOn(logger as any, 'logToConsole');

      logger.logError(lowSeverityError);
      logger.logError(highSeverityError);

      // Low severity should not log
      expect(lowSpy).not.toHaveBeenCalled();
      // High severity should log
      expect(highSpy).toHaveBeenCalled();
    });

    it('should include context', () => {
      const error = new InvalidCellError('ZZ999');
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      logger.logError(error, {
        userId: 'user123',
        sessionId: 'session456',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INVALID_CELL]'),
        expect.objectContaining({
          context: expect.objectContaining({
            userId: 'user123',
            sessionId: 'session456',
          }),
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('logErrors', () => {
    it('should log multiple errors', () => {
      const errors = [
        { error: new InvalidCellError('ZZ999') },
        { error: new NetworkError('Network error', 'NETWORK_ERROR', 0) },
      ];

      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      logger.logErrors(errors);

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });
  });

  describe('getRecentErrors', () => {
    it('should return recent errors', () => {
      const error1 = new InvalidCellError('ZZ999');
      const error2 = new InvalidCellError('AA111');

      logger.logError(error1);
      logger.logError(error2);

      const recent = logger.getRecentErrors(2);

      expect(recent).toHaveLength(2);
      expect(recent[0].error).toBe(error1);
      expect(recent[1].error).toBe(error2);
    });

    it('should limit count', () => {
      for (let i = 0; i < 10; i++) {
        logger.logError(new InvalidCellError(`ZZ${i}`));
      }

      const recent = logger.getRecentErrors(5);

      expect(recent).toHaveLength(5);
    });
  });

  describe('clearBuffer', () => {
    it('should clear error buffer', () => {
      logger.logError(new InvalidCellError('ZZ999'));
      logger.clearBuffer();

      const recent = logger.getRecentErrors();

      expect(recent).toHaveLength(0);
    });
  });

  describe('getErrorStats', () => {
    it('should calculate error statistics', () => {
      logger.logError(new InvalidCellError('ZZ999'));
      logger.logError(new InvalidCellError('AA111'));
      logger.logError(new NetworkError('Network error', 'NETWORK_ERROR', 0));

      const stats = logger.getErrorStats();

      expect(stats.total).toBe(3);
      expect(stats.byCode['INVALID_CELL']).toBe(2);
      expect(stats.byCode['NETWORK_ERROR']).toBe(1);
    });
  });

  describe('redactSensitiveData', () => {
    it('should redact passwords', () => {
      const data = JSON.stringify({ password: 'secret123' });
      const redacted = logger.redactSensitiveData(data);

      expect(redacted).toContain('***REDACTED***');
      expect(redacted).not.toContain('secret123');
    });

    it('should redact tokens', () => {
      const data = JSON.stringify({ token: 'abc123xyz' });
      const redacted = logger.redactSensitiveData(data);

      expect(redacted).toContain('***REDACTED***');
      expect(redacted).not.toContain('abc123xyz');
    });

    it('should redact email addresses', () => {
      const data = 'Email: user@example.com';
      const redacted = logger.redactSensitiveData(data);

      expect(redacted).toContain('***@***.***');
      expect(redacted).not.toContain('user@example.com');
    });

    it('should redact credit card numbers', () => {
      const data = 'Card: 4111-1111-1111-1111';
      const redacted = logger.redactSensitiveData(data);

      expect(redacted).toContain('****-****-****-****');
      expect(redacted).not.toContain('4111-1111-1111-1111');
    });

    it('should redact SSN numbers', () => {
      const data = 'SSN: 123-45-6789';
      const redacted = logger.redactSensitiveData(data);

      expect(redacted).toContain('***-**-****');
      expect(redacted).not.toContain('123-45-6789');
    });
  });

  describe('addSensitivePattern', () => {
    it('should add custom sensitive pattern', () => {
      logger.addSensitivePattern({
        pattern: /custom_key:\s*([^\s]+)/gi,
        replacement: 'custom_key: ***REDACTED***',
        description: 'Custom key',
      });

      const data = 'custom_key: secret_value';
      const redacted = logger.redactSensitiveData(data);

      expect(redacted).toContain('***REDACTED***');
      expect(redacted).not.toContain('secret_value');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      logger.updateConfig({
        minSeverity: ErrorSeverity.HIGH,
        includeStackTrace: false,
      });

      const highSeverityError = new NetworkError('Network error', 'NETWORK_ERROR', 0);
      const lowSeverityError = new InvalidCellError('ZZ999');

      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      logger.logError(highSeverityError);
      logger.logError(lowSeverityError);

      // Only high severity should log
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });
  });
});

describe('globalErrorLogger', () => {
  it('should be singleton instance', () => {
    expect(globalErrorLogger).toBeInstanceOf(ErrorLogger);
  });
});

describe('redactSensitiveData', () => {
  it('should redact sensitive data using global logger', () => {
    const data = 'Password: secret123';
    const redacted = redactSensitiveData(data);

    expect(redacted).toContain('***REDACTED***');
    expect(redacted).not.toContain('secret123');
  });
});
