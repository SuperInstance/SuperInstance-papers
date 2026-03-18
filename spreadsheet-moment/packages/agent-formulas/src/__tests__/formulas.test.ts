/**
 * Formula Functions Unit Tests
 *
 * Phase 3: Comprehensive unit tests for CLAW_* formula functions
 *
 * @packageDocumentation
 * @version 3.0.0
 */

import { CLAW_NEW } from '../functions/CLAW_NEW';
import { CLAW_QUERY } from '../functions/CLAW_QUERY';
import { CLAW_CANCEL } from '../functions/CLAW_CANCEL';
import ClawClientManager from '../utils/ClawClientManager';

// Mock environment variables
const mockEnv = {
  CLAW_API_URL: 'https://api.test.claw.com',
  CLAW_WS_URL: 'wss://api.test.claw.com/ws',
  CLAW_API_KEY: 'test_api_key_sufficient_length_123',
  CLAW_TIMEOUT: '30000',
  CLAW_MAX_RETRIES: '3',
  CLAW_DEBUG: 'false'
};

// Mock ClawClient
jest.mock('@spreadsheet-moment/agent-core', () => ({
  ClawClient: jest.fn().mockImplementation(() => ({
    createClaw: jest.fn().mockResolvedValue({
      clawId: 'claw_test_123',
      status: 'created'
    }),
    queryClaw: jest.fn().mockResolvedValue({
      clawId: 'claw_test_123',
      exists: true,
      state: {
        state: 'DORMANT',
        confidence: 0.8,
        lastUpdated: Date.now()
      },
      reasoning: [],
      memory: {}
    }),
    cancelClaw: jest.fn().mockResolvedValue({
      status: 'cancelled',
      message: 'Successfully cancelled'
    }),
    getConnectionStatus: jest.fn().mockReturnValue({
      http: true,
      websocket: true,
      healthy: true,
      disposed: false
    }),
    subscribeToClaw: jest.fn(),
    dispose: jest.fn()
  }))
}));

describe('ClawClientManager', () => {
  beforeEach(() => {
    // Reset environment
    process.env = { ...mockEnv } as any;
    ClawClientManager.dispose();
  });

  afterEach(() => {
    ClawClientManager.dispose();
  });

  describe('getClient', () => {
    it('should return null when no API URL is configured', () => {
      delete process.env.CLAW_API_URL;
      const client = ClawClientManager.getClient();
      expect(client).toBeNull();
    });

    it('should create client when API URL is configured', () => {
      const client = ClawClientManager.getClient();
      expect(client).not.toBeNull();
    });

    it('should return same instance on subsequent calls', () => {
      const client1 = ClawClientManager.getClient();
      const client2 = ClawClientManager.getClient();
      expect(client1).toBe(client2);
    });
  });

  describe('dispose', () => {
    it('should dispose client instance', () => {
      ClawClientManager.getClient();
      ClawClientManager.dispose();
      expect(ClawClientManager.hasClient()).toBe(false);
    });

    it('should be safe to call multiple times', () => {
      ClawClientManager.getClient();
      ClawClientManager.dispose();
      ClawClientManager.dispose();
      expect(ClawClientManager.hasClient()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should recreate client after reset', () => {
      const client1 = ClawClientManager.getClient();
      const client2 = ClawClientManager.reset();
      expect(client1).not.toBe(client2);
    });
  });
});

describe('CLAW_NEW Formula', () => {
  beforeEach(() => {
    process.env = { ...mockEnv } as any;
  });

  afterEach(() => {
    ClawClientManager.dispose();
  });

  describe('validation', () => {
    it('should require purpose parameter', async () => {
      const result = await CLAW_NEW.execute({ context: {} }, '' as any);
      expect(result).toContain('#ERROR');
      expect(result).toContain('Purpose is required');
    });

    it('should validate agent type', async () => {
      const result = await CLAW_NEW.execute(
        { context: {} },
        'Test purpose',
        'INVALID_TYPE'
      );
      expect(result).toContain('#ERROR');
      expect(result).toContain('Invalid agent type');
    });

    it('should validate model provider', async () => {
      const result = await CLAW_NEW.execute(
        { context: {} },
        'Test purpose',
        'SENSOR',
        'invalid_provider'
      );
      expect(result).toContain('#ERROR');
      expect(result).toContain('Invalid model provider');
    });

    it('should validate equipment', async () => {
      const result = await CLAW_NEW.execute(
        { context: {} },
        'Test purpose',
        'SENSOR',
        'deepseek',
        'INVALID_EQUIPMENT'
      );
      expect(result).toContain('#ERROR');
      expect(result).toContain('No valid equipment slots');
    });
  });

  describe('execution', () => {
    it('should create claw with valid parameters', async () => {
      const result = await CLAW_NEW.execute(
        { context: { cellId: 'A1', position: [0, 0], sheetId: 'sheet1' } },
        'Monitor stock prices',
        'SENSOR',
        'deepseek',
        'MEMORY,REASONING'
      );

      expect(result).not.toContain('#ERROR');
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^claw_/);
    });

    it('should use default values for optional parameters', async () => {
      const result = await CLAW_NEW.execute(
        { context: { cellId: 'A1', position: [0, 0] } },
        'Test purpose'
      );

      expect(result).not.toContain('#ERROR');
    });

    it('should handle API errors gracefully', async () => {
      // Test with no API configured
      delete process.env.CLAW_API_URL;

      const result = await CLAW_NEW.execute(
        { context: { cellId: 'A1', position: [0, 0] } },
        'Test purpose'
      );

      // Should still return a claw ID (local mode)
      expect(result).toMatch(/^claw_/);
    });

    it('should subscribe to updates when WebSocket is enabled', async () => {
      const client = ClawClientManager.getClient();
      const context = { cellId: 'A1', position: [0, 0], sheetId: 'sheet1' };

      await CLAW_NEW.execute(context, 'Test purpose');

      expect(client?.subscribeToClaw).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace in purpose', async () => {
      const result = await CLAW_NEW.execute(
        { context: { cellId: 'A1', position: [0, 0] } },
        '  Test purpose  '
      );

      expect(result).not.toContain('#ERROR');
    });

    it('should handle mixed case agent type', async () => {
      const result = await CLAW_NEW.execute(
        { context: { cellId: 'A1', position: [0, 0] } },
        'Test purpose',
        'sensor'
      );

      expect(result).not.toContain('#ERROR');
    });

    it('should handle mixed case model provider', async () => {
      const result = await CLAW_NEW.execute(
        { context: { cellId: 'A1', position: [0, 0] } },
        'Test purpose',
        'SENSOR',
        'DEEPSEEK'
      );

      expect(result).not.toContain('#ERROR');
    });

    it('should handle equipment with spaces', async () => {
      const result = await CLAW_NEW.execute(
        { context: { cellId: 'A1', position: [0, 0] } },
        'Test purpose',
        'SENSOR',
        'deepseek',
        'MEMORY , REASONING '
      );

      expect(result).not.toContain('#ERROR');
    });
  });
});

describe('CLAW_QUERY Formula', () => {
  beforeEach(() => {
    process.env = { ...mockEnv } as any;
  });

  afterEach(() => {
    ClawClientManager.dispose();
  });

  describe('validation', () => {
    it('should require claw_id parameter', async () => {
      const result = await CLAW_QUERY.execute({ context: {} }, '' as any);
      expect(result).toContain('#ERROR');
      expect(result).toContain('claw_id is required');
    });

    it('should accept valid claw ID', async () => {
      const result = await CLAW_QUERY.execute(
        { context: {} },
        'claw_test_123'
      );

      expect(result).not.toContain('#ERROR');
    });
  });

  describe('execution', () => {
    it('should return claw state', async () => {
      const result = await CLAW_QUERY.execute(
        { context: {} },
        'claw_test_123',
        true,
        false
      );

      expect(result).not.toContain('#ERROR');
      const parsed = JSON.parse(result as string);
      expect(parsed.clawId).toBe('claw_test_123');
      expect(parsed.state).toBeDefined();
      expect(parsed.confidence).toBeDefined();
    });

    it('should include reasoning when requested', async () => {
      const result = await CLAW_QUERY.execute(
        { context: {} },
        'claw_test_123',
        true,
        false
      );

      const parsed = JSON.parse(result as string);
      expect(parsed.reasoning).toBeDefined();
    });

    it('should include memory when requested', async () => {
      const result = await CLAW_QUERY.execute(
        { context: {} },
        'claw_test_123',
        false,
        true
      );

      const parsed = JSON.parse(result as string);
      expect(parsed.memory).toBeDefined();
    });

    it('should handle not found error', async () => {
      const client = ClawClientManager.getClient();
      (client as any).queryClaw.mockResolvedValueOnce({
        exists: false
      });

      const result = await CLAW_QUERY.execute(
        { context: {} },
        'claw_nonexistent'
      );

      expect(result).toContain('#ERROR');
      expect(result).toContain('not found');
    });

    it('should handle missing API gracefully', async () => {
      delete process.env.CLAW_API_URL;

      const result = await CLAW_QUERY.execute(
        { context: {} },
        'claw_test_123'
      );

      expect(result).toContain('#ERROR');
      expect(result).toContain('not configured');
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace in claw ID', async () => {
      const result = await CLAW_QUERY.execute(
        { context: {} },
        '  claw_test_123  '
      );

      expect(result).not.toContain('#ERROR');
    });

    it('should use default values for optional parameters', async () => {
      const result = await CLAW_QUERY.execute(
        { context: {} },
        'claw_test_123'
      );

      expect(result).not.toContain('#ERROR');
      const parsed = JSON.parse(result as string);
      expect(parsed.reasoning).toBeDefined(); // Default: true
      expect(parsed.memory).toBeUndefined(); // Default: false
    });
  });
});

describe('CLAW_CANCEL Formula', () => {
  beforeEach(() => {
    process.env = { ...mockEnv } as any;
  });

  afterEach(() => {
    ClawClientManager.dispose();
  });

  describe('validation', () => {
    it('should require claw_id parameter', async () => {
      const result = await CLAW_CANCEL.execute({ context: {} }, '' as any);
      expect(result).toContain('#ERROR');
      expect(result).toContain('claw_id is required');
    });

    it('should accept valid claw ID', async () => {
      const result = await CLAW_CANCEL.execute(
        { context: {} },
        'claw_test_123'
      );

      expect(result).not.toContain('#ERROR');
      expect(result).toContain('CANCELLED');
    });
  });

  describe('execution', () => {
    it('should cancel running claw', async () => {
      const result = await CLAW_CANCEL.execute(
        { context: {} },
        'claw_test_123',
        'User cancelled'
      );

      expect(result).toContain('CANCELLED');
      expect(result).toContain('claw_test_123');
    });

    it('should handle not running status', async () => {
      const client = ClawClientManager.getClient();
      (client as any).cancelClaw.mockResolvedValueOnce({
        status: 'not_running'
      });

      const result = await CLAW_CANCEL.execute(
        { context: {} },
        'claw_test_123'
      );

      expect(result).toContain('NOT_RUNNING');
    });

    it('should handle missing API gracefully', async () => {
      delete process.env.CLAW_API_URL;

      const result = await CLAW_CANCEL.execute(
        { context: {} },
        'claw_test_123'
      );

      expect(result).toContain('#ERROR');
      expect(result).toContain('not configured');
    });

    it('should use default reason when not provided', async () => {
      const client = ClawClientManager.getClient();
      const cancelSpy = jest.spyOn(client as any, 'cancelClaw');

      await CLAW_CANCEL.execute({ context: {} }, 'claw_test_123');

      expect(cancelSpy).toHaveBeenCalledWith({
        clawId: 'claw_test_123',
        reason: 'User cancelled'
      });
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace in claw ID', async () => {
      const result = await CLAW_CANCEL.execute(
        { context: {} },
        '  claw_test_123  '
      );

      expect(result).not.toContain('#ERROR');
    });

    it('should handle empty reason', async () => {
      const client = ClawClientManager.getClient();
      const cancelSpy = jest.spyOn(client as any, 'cancelClaw');

      await CLAW_CANCEL.execute(
        { context: {} },
        'claw_test_123',
        '   '
      );

      expect(cancelSpy).toHaveBeenCalledWith({
        clawId: 'claw_test_123',
        reason: 'User cancelled'
      });
    });
  });
});
