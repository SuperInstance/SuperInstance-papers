/**
 * End-to-End Workflow Integration Tests
 *
 * Comprehensive end-to-end tests covering complete user workflows:
 * - Agent creation from spreadsheet cells
 * - Real-time status updates and reasoning visualization
 * - Equipment management
 * - Cross-session persistence
 * - Concurrent user scenarios
 * - Error recovery and rollback
 *
 * @packageDocumentation
 * @version 4.0.0
 */

import { ClawClient } from '@spreadsheet-moment/agent-core';
import { StateManager, TraceProtocol } from '@spreadsheet-moment/agent-core';
import {
  ClawCellConfig,
  ClawType,
  ModelProvider,
  EquipmentSlot,
  TriggerType,
  LearningStrategy,
  ClawState,
  AgentCellType,
  AgentCellState,
  IAgentCellData
} from '@spreadsheet-moment/agent-core';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const VALID_API_KEY = 'test-api-key-min-length-20';
const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

// ============================================================================
// MOCK WEBSOCKET SERVER
// ============================================================================

class MockWebSocketServer {
  private clients: Map<string, any> = new Map();

  handleConnection(clientId: string, ws: any) {
    this.clients.set(clientId, ws);

    setTimeout(() => {
      if (ws.onopen) {
        ws.onopen(new Event('open'));
      }
    }, 10);
  }

  sendMessage(clientId: string, message: any) {
    const ws = this.clients.get(clientId);
    if (ws && ws.onmessage) {
      setTimeout(() => {
        ws.onmessage({ data: JSON.stringify(message) } as MessageEvent);
      }, 10);
    }
  }

  broadcast(message: any) {
    this.clients.forEach((ws) => {
      if (ws.onmessage) {
        setTimeout(() => {
          ws.onmessage({ data: JSON.stringify(message) } as MessageEvent);
        }, 10);
      }
    });
  }

  disconnectClient(clientId: string) {
    const ws = this.clients.get(clientId);
    if (ws && ws.onclose) {
      ws.onclose({} as CloseEvent);
    }
    this.clients.delete(clientId);
  }
}

// ============================================================================
// END-TO-END WORKFLOW TESTS
// ============================================================================

describe('End-to-End Workflow Tests', () => {
  let mockServer: MockWebSocketServer;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockServer = new MockWebSocketServer();

    global.WebSocket = jest.fn((url) => {
      const clientId = url.split('/').pop() || 'default';
      const ws = {
        url,
        readyState: WebSocket.CONNECTING,
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        send: jest.fn(),
        close: jest.fn((code?: number, reason?: string) => {
          ws.readyState = WebSocket.CLOSED;
          if (ws.onclose) {
            ws.onclose({ code, reason } as CloseEvent);
          }
        }),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      } as any;

      mockServer.handleConnection(clientId, ws);
      return ws;
    }) as any;

    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  describe('Agent Creation Workflow', () => {
    it('should complete full agent creation lifecycle', async () => {
      // Step 1: Create agent configuration
      const config: ClawCellConfig = {
        id: 'claw_sensor_1',
        type: ClawType.SENSOR,
        position: [0, 0],
        model: {
          provider: ModelProvider.DEEPSEEK,
          model: 'deepseek-chat',
          apiKey: 'test-model-key-12345678'
        },
        seed: {
          purpose: 'Monitor temperature sensors',
          trigger: {
            type: TriggerType.CELL_CHANGE,
            cellId: 'A1'
          },
          learningStrategy: LearningStrategy.REINFORCEMENT
        },
        equipment: [EquipmentSlot.MEMORY, EquipmentSlot.REASONING],
        relationships: [],
        state: ClawState.DORMANT,
        confidence: 0.5
      };

      // Step 2: Create Claw API client
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clawId: config.id,
          status: 'created',
          config
        })
      });

      const client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      // Wait for WebSocket connection
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 3: Create claw via API
      const createResponse = await client.createClaw({
        config,
        context: {
          sheetId: 'sheet_1',
          userId: 'user_1',
          cellId: 'A1'
        }
      });

      expect(createResponse.clawId).toBe(config.id);
      expect(createResponse.status).toBe('created');

      // Step 4: Update cell state
      const stateManager = new StateManager();
      const cellData: IAgentCellData = {
        v: config.id,
        origin_id: config.id,
        cell_type: AgentCellType.SENSOR,
        state: AgentCellState.DORMANT
      };

      const updatedCell = stateManager.transition(cellData, AgentCellState.THINKING);
      expect(updatedCell.state).toBe(AgentCellState.THINKING);

      // Step 5: Receive real-time updates
      const reasoningPromise = new Promise<void>((resolve) => {
        client.on('reasoningStep', (data) => {
          expect(data.payload.clawId).toBe(config.id);
          expect(data.payload.step.content).toBeDefined();
          resolve();
        });
      });

      mockServer.broadcast({
        type: 'reasoning_step',
        traceId: 'trace_1',
        timestamp: Date.now(),
        payload: {
          clawId: config.id,
          cellId: 'A1',
          step: {
            stepNumber: 1,
            content: 'Analyzing temperature data...',
            timestamp: Date.now(),
            confidence: 0.8
          },
          isFinal: false
        }
      });

      await reasoningPromise;

      // Step 6: Complete workflow
      await client.dispose();
      expect(client.isDisposedClient()).toBe(true);
    });

    it('should handle agent creation with all equipment types', async () => {
      const allEquipment = [
        EquipmentSlot.MEMORY,
        EquipmentSlot.REASONING,
        EquipmentSlot.CONSENSUS,
        EquipmentSlot.SPREADSHEET,
        EquipmentSlot.DISTILLATION,
        EquipmentSlot.COORDINATION
      ];

      const config: ClawCellConfig = {
        id: 'claw_full_1',
        type: ClawType.ORCHESTRATOR,
        position: [0, 0],
        model: {
          provider: ModelProvider.DEEPSEEK,
          model: 'deepseek-chat',
          apiKey: 'test-model-key-12345678'
        },
        seed: {
          purpose: 'Full featured orchestrator',
          trigger: {
            type: TriggerType.PERIODIC,
            interval: 5000
          },
          learningStrategy: LearningStrategy.REINFORCEMENT
        },
        equipment: allEquipment,
        relationships: [],
        state: ClawState.DORMANT,
        confidence: 0.5
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clawId: config.id,
          status: 'created',
          config
        })
      });

      const client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const response = await client.createClaw({
        config,
        context: {
          sheetId: 'sheet_1',
          userId: 'user_1'
        }
      });

      expect(response.clawId).toBe(config.id);
      expect(response.config.equipment).toEqual(allEquipment);

      await client.dispose();
    });

    it('should handle validation errors in agent creation', async () => {
      const invalidConfig = {
        id: '', // Invalid: empty ID
        type: ClawType.SENSOR,
        position: [0, 0],
        model: {
          provider: ModelProvider.DEEPSEEK,
          model: 'deepseek-chat',
          apiKey: 'short' // Invalid: too short
        } as any,
        seed: {
          purpose: '', // Invalid: empty purpose
          trigger: {
            type: TriggerType.CELL_CHANGE,
            cellId: ''
          },
          learningStrategy: LearningStrategy.REINFORCEMENT
        },
        equipment: [],
        relationships: [],
        state: ClawState.DORMANT,
        confidence: 0.5
      };

      const client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      try {
        await client.createClaw({
          config: invalidConfig,
          context: {
            sheetId: 'sheet_1',
            userId: 'user_1'
          }
        });
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.message).toContain('VALIDATION_ERROR');
      }

      await client.dispose();
    });
  });

  describe('Real-Time Status Updates', () => {
    it('should receive and display reasoning steps', async () => {
      const client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const reasoningSteps: any[] = [];
      client.on('reasoningStep', (data) => {
        reasoningSteps.push(data);
      });

      // Simulate multi-step reasoning process
      const steps = [
        { stepNumber: 1, content: 'Analyzing cell data...', confidence: 0.6 },
        { stepNumber: 2, content: 'Detecting patterns...', confidence: 0.7 },
        { stepNumber: 3, content: 'Evaluating options...', confidence: 0.8 },
        { stepNumber: 4, content: 'Reaching conclusion...', confidence: 0.9 }
      ];

      for (const step of steps) {
        mockServer.broadcast({
          type: 'reasoning_step',
          traceId: 'trace_reasoning',
          timestamp: Date.now(),
          payload: {
            clawId: 'claw_1',
            cellId: 'A1',
            step: {
              ...step,
              timestamp: Date.now()
            },
            isFinal: step.stepNumber === steps.length
          }
        });

        await new Promise(resolve => setTimeout(resolve, 20));
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(reasoningSteps.length).toBe(steps.length);
      expect(reasoningSteps[0].payload.step.content).toBe(steps[0].content);
      expect(reasoningSteps[reasoningSteps.length - 1].payload.isFinal).toBe(true);

      await client.dispose();
    });

    it('should update agent state transitions', async () => {
      const client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const stateUpdates: any[] = [];
      client.on('stateChanged', (data) => {
        stateUpdates.push(data);
      });

      const transitions = [
        { from: 'DORMANT', to: 'THINKING' },
        { from: 'THINKING', to: 'NEEDS_REVIEW' },
        { from: 'NEEDS_REVIEW', to: 'POSTED' }
      ];

      for (const transition of transitions) {
        mockServer.broadcast({
          type: 'state_changed',
          traceId: 'trace_state',
          timestamp: Date.now(),
          payload: {
            clawId: 'claw_1',
            cellId: 'A1',
            previousState: transition.from,
            newState: transition.to,
            timestamp: Date.now()
          }
        });

        await new Promise(resolve => setTimeout(resolve, 20));
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(stateUpdates.length).toBe(transitions.length);
      expect(stateUpdates[0].payload.newState).toBe('THINKING');
      expect(stateUpdates[stateUpdates.length - 1].payload.newState).toBe('POSTED');

      await client.dispose();
    });

    it('should handle equipment status updates', async () => {
      const client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const equipmentUpdates: any[] = [];
      client.on('equipmentChanged', (data) => {
        equipmentUpdates.push(data);
      });

      const equipmentChanges = [
        { slot: 'MEMORY', status: 'equipped', active: true },
        { slot: 'REASONING', status: 'equipped', active: true },
        { slot: 'MEMORY', status: 'unequipped', active: false }
      ];

      for (const change of equipmentChanges) {
        mockServer.broadcast({
          type: 'equipment_changed',
          traceId: 'trace_equipment',
          timestamp: Date.now(),
          payload: {
            clawId: 'claw_1',
            cellId: 'A1',
            slot: change.slot,
            status: change.status,
            active: change.active,
            timestamp: Date.now()
          }
        });

        await new Promise(resolve => setTimeout(resolve, 20));
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(equipmentUpdates.length).toBe(equipmentChanges.length);

      await client.dispose();
    });
  });

  describe('State Management', () => {
    it('should maintain state across sessions', async () => {
      const config: ClawCellConfig = {
        id: 'claw_persistent_1',
        type: ClawType.SENSOR,
        position: [0, 0],
        model: {
          provider: ModelProvider.DEEPSEEK,
          model: 'deepseek-chat',
          apiKey: 'test-model-key-12345678'
        },
        seed: {
          purpose: 'Persistent sensor',
          trigger: {
            type: TriggerType.CELL_CHANGE,
            cellId: 'A1'
          },
          learningStrategy: LearningStrategy.REINFORCEMENT
        },
        equipment: [EquipmentSlot.MEMORY],
        relationships: [],
        state: ClawState.DORMANT,
        confidence: 0.5
      };

      // Session 1: Create agent
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clawId: config.id,
          status: 'created',
          config
        })
      });

      const client1 = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      await client1.createClaw({
        config,
        context: {
          sheetId: 'sheet_1',
          userId: 'user_1'
        }
      });

      await client1.dispose();

      // Session 2: Query agent state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clawId: config.id,
          exists: true,
          state: {
            clawId: config.id,
            state: ClawState.DORMANT,
            reasoning: ['Step 1: Initial analysis'],
            memory: ['Data point 1', 'Data point 2'],
            confidence: 0.7,
            lastUpdated: Date.now()
          },
          reasoning: ['Step 1: Initial analysis'],
          memory: ['Data point 1', 'Data point 2'],
          relationships: []
        })
      });

      const client2 = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const queryResponse = await client2.queryClaw({
        clawId: config.id,
        includeReasoning: true,
        includeMemory: true
      });

      expect(queryResponse.exists).toBe(true);
      expect(queryResponse.state.state).toBe(ClawState.DORMANT);
      expect(queryResponse.reasoning).toHaveLength(1);
      expect(queryResponse.memory).toHaveLength(2);

      await client2.dispose();
    });

    it('should recover from errors gracefully', async () => {
      const stateManager = new StateManager();
      const cellData: IAgentCellData = {
        v: 'claw_1',
        origin_id: 'claw_1',
        cell_type: AgentCellType.SENSOR,
        state: AgentCellState.THINKING,
        reasoning: ['Step 1', 'Step 2'],
        memory: ['Data 1']
      };

      // Simulate error during processing
      const errorCell = stateManager.transition(
        cellData,
        AgentCellState.ERROR,
        'Processing timeout'
      );

      expect(errorCell.state).toBe(AgentCellState.ERROR);
      expect(errorCell.error).toBe('Processing timeout');
      expect(errorCell.reasoning).toEqual(['Step 1', 'Step 2']); // Preserved

      // Recovery: reset to DORMANT
      const recoveredCell = stateManager.reset(errorCell);

      expect(recoveredCell.state).toBe(AgentCellState.DORMANT);
      expect(recoveredCell.error).toBeUndefined();
      expect(recoveredCell.reasoning).toEqual(['Step 1', 'Step 2']); // Still preserved
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous agent operations', async () => {
      const client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      // Create multiple agents concurrently
      const agentConfigs = Array.from({ length: 10 }, (_, i) => ({
        id: `claw_concurrent_${i}`,
        type: ClawType.SENSOR,
        position: [i, 0],
        model: {
          provider: ModelProvider.DEEPSEEK,
          model: 'deepseek-chat',
          apiKey: 'test-model-key-12345678'
        },
        seed: {
          purpose: `Concurrent sensor ${i}`,
          trigger: {
            type: TriggerType.CELL_CHANGE,
            cellId: `A${i + 1}`
          },
          learningStrategy: LearningStrategy.REINFORCEMENT
        },
        equipment: [EquipmentSlot.MEMORY],
        relationships: [],
        state: ClawState.DORMANT,
        confidence: 0.5
      }));

      // Mock responses for all agents
      agentConfigs.forEach(config => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            clawId: config.id,
            status: 'created',
            config
          })
        });
      });

      // Create all agents concurrently
      const createPromises = agentConfigs.map(config =>
        client.createClaw({
          config,
          context: {
            sheetId: 'sheet_1',
            userId: 'user_1'
          }
        })
      );

      const results = await Promise.all(createPromises);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.clawId).toBe(agentConfigs[i].id);
        expect(result.status).toBe('created');
      });

      await client.dispose();
    });

    it('should handle multiple users accessing same agent', async () => {
      const clawId = 'claw_shared_1';

      // User 1 creates agent
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clawId,
          status: 'created',
          config: {
            id: clawId,
            type: ClawType.SENSOR,
            position: [0, 0]
          }
        })
      });

      const client1 = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      await client1.createClaw({
        config: {
          id: clawId,
          type: ClawType.SENSOR,
          position: [0, 0],
          model: {
            provider: ModelProvider.DEEPSEEK,
            model: 'deepseek-chat',
            apiKey: 'test-model-key-12345678'
          },
          seed: {
            purpose: 'Shared sensor',
            trigger: {
              type: TriggerType.CELL_CHANGE,
              cellId: 'A1'
            },
            learningStrategy: LearningStrategy.REINFORCEMENT
          },
          equipment: [],
          relationships: [],
          state: ClawState.DORMANT,
          confidence: 0.5
        },
        context: {
          sheetId: 'sheet_1',
          userId: 'user_1'
        }
      });

      // User 2 queries same agent
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clawId,
          exists: true,
          state: {
            clawId,
            state: ClawState.THINKING,
            reasoning: [],
            memory: [],
            confidence: 0.6,
            lastUpdated: Date.now()
          },
          reasoning: [],
          memory: [],
          relationships: []
        })
      });

      const client2 = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const queryResponse = await client2.queryClaw({
        clawId,
        includeReasoning: true,
        includeMemory: true
      });

      expect(queryResponse.exists).toBe(true);
      expect(queryResponse.state.state).toBe(ClawState.THINKING);

      await Promise.all([client1.dispose(), client2.dispose()]);
    });
  });

  describe('Trace Protocol Integration', () => {
    it('should detect and prevent recursive loops', () => {
      const traceProtocol = new TraceProtocol();

      const trace1 = traceProtocol.createTrace('origin_A1', 'A1');
      expect(traceProtocol.isRecursive(trace1, 'A2')).toBe(false);

      // Add A2 to trace
      const trace2 = traceProtocol.addToTrace(trace1, 'A2');
      expect(traceProtocol.isRecursive(trace2, 'A3')).toBe(false);

      // Try to revisit A1 - should detect recursion
      expect(traceProtocol.isRecursive(trace2, 'A1')).toBe(true);

      // Clean cell should not trigger recursion
      expect(traceProtocol.isRecursive(trace2, 'B1')).toBe(false);
    });

    it('should manage complex trace paths', () => {
      const traceProtocol = new TraceProtocol();

      // Create complex trace: A1 -> A2 -> A3 -> A4 -> A5
      let trace = traceProtocol.createTrace('origin_A1', 'A1');
      trace = traceProtocol.addToTrace(trace, 'A2');
      trace = traceProtocol.addToTrace(trace, 'A3');
      trace = traceProtocol.addToTrace(trace, 'A4');
      trace = traceProtocol.addToTrace(trace, 'A5');

      // Check various recursion scenarios
      expect(traceProtocol.isRecursive(trace, 'A1')).toBe(true);
      expect(traceProtocol.isRecursive(trace, 'A3')).toBe(true);
      expect(traceProtocol.isRecursive(trace, 'A6')).toBe(false);

      // Verify trace length
      expect(trace.path.length).toBe(5);
    });

    it('should handle concurrent trace operations', () => {
      const traceProtocol = new TraceProtocol();

      // Create multiple independent traces
      const trace1 = traceProtocol.createTrace('origin_A1', 'A1');
      const trace2 = traceProtocol.createTrace('origin_B1', 'B1');
      const trace3 = traceProtocol.createTrace('origin_C1', 'C1');

      // Extend traces independently
      const extendedTrace1 = traceProtocol.addToTrace(trace1, 'A2');
      const extendedTrace2 = traceProtocol.addToTrace(trace2, 'B2');

      // Traces should remain independent
      expect(extendedTrace1.path).toContain('A1');
      expect(extendedTrace1.path).toContain('A2');
      expect(extendedTrace1.path).not.toContain('B1');

      expect(extendedTrace2.path).toContain('B1');
      expect(extendedTrace2.path).toContain('B2');
      expect(extendedTrace2.path).not.toContain('A1');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete agent creation within performance targets', async () => {
      const config: ClawCellConfig = {
        id: 'claw_perf_1',
        type: ClawType.SENSOR,
        position: [0, 0],
        model: {
          provider: ModelProvider.DEEPSEEK,
          model: 'deepseek-chat',
          apiKey: 'test-model-key-12345678'
        },
        seed: {
          purpose: 'Performance test',
          trigger: {
            type: TriggerType.CELL_CHANGE,
            cellId: 'A1'
          },
          learningStrategy: LearningStrategy.REINFORCEMENT
        },
        equipment: [EquipmentSlot.MEMORY],
        relationships: [],
        state: ClawState.DORMANT,
        confidence: 0.5
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          clawId: config.id,
          status: 'created',
          config
        })
      });

      const client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const startTime = Date.now();

      await client.createClaw({
        config,
        context: {
          sheetId: 'sheet_1',
          userId: 'user_1'
        }
      });

      const elapsed = Date.now() - startTime;

      // Should complete within 100ms
      expect(elapsed).toBeLessThan(100);

      await client.dispose();
    });

    it('should handle rapid state transitions efficiently', () => {
      const stateManager = new StateManager();
      const cellData: IAgentCellData = {
        v: 'claw_1',
        origin_id: 'claw_1',
        cell_type: AgentCellType.SENSOR,
        state: AgentCellState.DORMANT
      };

      const startTime = Date.now();

      // Perform rapid transitions
      let currentCell = cellData;
      const transitions = 1000;

      for (let i = 0; i < transitions; i++) {
        if (i % 2 === 0) {
          currentCell = stateManager.transition(currentCell, AgentCellState.THINKING);
        } else {
          currentCell = stateManager.transition(currentCell, AgentCellState.DORMANT);
        }
      }

      const elapsed = Date.now() - startTime;

      // Should handle 1000 transitions quickly (< 100ms)
      expect(elapsed).toBeLessThan(100);
    });
  });
});
