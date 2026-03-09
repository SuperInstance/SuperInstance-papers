/**
 * CellTail Unit Tests
 *
 * Comprehensive tests for the CellTail output and action system
 */

import {
  CellTail,
  CellReference,
  EffectType,
  ActionType,
  OutputChannel,
  Effect,
  Action,
  ActionResult,
  CellSubscriber,
  RetryPolicy,
} from '../CellTail';

describe('CellTail', () => {
  let cellTail: CellTail;
  let cellId: string;

  beforeEach(() => {
    cellId = 'test-cell-1';
    cellTail = new CellTail(cellId);
  });

  afterEach(() => {
    cellTail.destroy();
  });

  describe('Constructor', () => {
    it('should create a CellTail with unique ID', () => {
      expect(cellTail.id).toBeDefined();
      expect(typeof cellTail.id).toBe('string');
      expect(cellTail.cellId).toBe(cellId);
    });

    it('should create a CellTail with custom config', () => {
      const config = {
        maxOutputs: 10,
        maxEffects: 5,
        maxActions: 3,
        maxSubscribers: 20,
      };
      const customTail = new CellTail('test-cell-2', config);

      expect(customTail).toBeDefined();
      customTail.destroy();
    });

    it('should use default limits when config not provided', () => {
      expect(cellTail.getStats().outputsCount).toBe(0);
      expect(cellTail.getStats().effectsCount).toBe(0);
      expect(cellTail.getStats().actionsCount).toBe(0);
      expect(cellTail.getStats().subscribersCount).toBe(0);
    });
  });

  describe('Output Channels', () => {
    it('should emit an output channel', () => {
      const output = cellTail.emitOutput('result', 42);

      expect(output).toBeDefined();
      expect(output.name).toBe('result');
      expect(output.value).toBe(42);
      expect(output.id).toBeDefined();
      expect(output.timestamp).toBeDefined();
    });

    it('should emit an output with metadata', () => {
      const metadata = { confidence: 0.95, source: 'test' };
      const output = cellTail.emitOutput('result', 42, metadata);

      expect(output.metadata).toEqual(metadata);
    });

    it('should store outputs and allow retrieval', () => {
      cellTail.emitOutput('result', 42);
      cellTail.emitOutput('result', 43);
      cellTail.emitOutput('other', 'value');

      const allOutputs = cellTail.getOutputs();
      expect(allOutputs).toHaveLength(3);

      const resultOutputs = cellTail.getOutputsByName('result');
      expect(resultOutputs).toHaveLength(2);

      const latestResult = cellTail.getOutput('result');
      expect(latestResult?.value).toBe(43);
    });

    it('should respect max outputs limit', () => {
      const limitedTail = new CellTail('test-cell-3', { maxOutputs: 2 });
      limitedTail.emitOutput('out1', 1);
      limitedTail.emitOutput('out2', 2);
      limitedTail.emitOutput('out3', 3);

      const outputs = limitedTail.getOutputs();
      expect(outputs).toHaveLength(2);
      expect(outputs[0].value).toBe(3); // Most recent
      expect(outputs[1].value).toBe(2);

      limitedTail.destroy();
    });

    it('should return undefined for non-existent output name', () => {
      const output = cellTail.getOutput('nonexistent');
      expect(output).toBeUndefined();
    });

    it('should clear all outputs', () => {
      cellTail.emitOutput('result', 42);
      cellTail.emitOutput('other', 'value');

      expect(cellTail.getStats().outputsCount).toBe(2);

      cellTail.clearOutputs();

      expect(cellTail.getStats().outputsCount).toBe(0);
      expect(cellTail.getOutputs()).toHaveLength(0);
    });

    it('should update stats on emit', () => {
      const stats1 = cellTail.getStats();
      expect(stats1.totalEmits).toBe(0);

      cellTail.emitOutput('result', 42);

      const stats2 = cellTail.getStats();
      expect(stats2.totalEmits).toBe(1);
      expect(stats2.lastEmitTime).toBeGreaterThan(0);
    });

    it('should emit events when output is created', (done) => {
      cellTail.on('output', (output: OutputChannel) => {
        expect(output.name).toBe('result');
        expect(output.value).toBe(42);
        done();
      });

      cellTail.emitOutput('result', 42);
    });
  });

  describe('Effects', () => {
    let source: CellReference;
    let target: CellReference;

    beforeEach(() => {
      source = { row: 0, col: 0 };
      target = { row: 1, col: 0 };
    });

    it('should add an effect', () => {
      const effect = cellTail.addEffect(
        EffectType.TRIGGER,
        target,
        source,
        { data: 'test' }
      );

      expect(effect).toBeDefined();
      expect(effect.id).toBeDefined();
      expect(effect.type).toBe(EffectType.TRIGGER);
      expect(effect.source).toEqual(source);
      expect(effect.target).toEqual(target);
      expect(effect.payload).toEqual({ data: 'test' });
    });

    it('should add effect with condition', () => {
      let conditionMet = false;
      const effect = cellTail.addEffect(
        EffectType.TRIGGER,
        target,
        source,
        null,
        {
          condition: () => conditionMet,
        }
      );

      expect(effect.condition).toBeDefined();
    });

    it('should add effect with delay', () => {
      const effect = cellTail.addEffect(
        EffectType.TRIGGER,
        target,
        source,
        null,
        { delay: 100 }
      );

      expect(effect.delay).toBe(100);
    });

    it('should retrieve all effects', () => {
      cellTail.addEffect(EffectType.TRIGGER, target, source);
      cellTail.addEffect(EffectType.INVALIDATE, target, source);

      const effects = cellTail.getEffects();
      expect(effects).toHaveLength(2);
    });

    it('should retrieve effects for specific target', () => {
      const target1 = { row: 1, col: 0 };
      const target2 = { row: 2, col: 0 };

      cellTail.addEffect(EffectType.TRIGGER, target1, source);
      cellTail.addEffect(EffectType.INVALIDATE, target2, source);

      const effectsForTarget1 = cellTail.getEffectsForTarget(target1);
      expect(effectsForTarget1).toHaveLength(1);
      expect(effectsForTarget1[0].target).toEqual(target1);
    });

    it('should trigger an effect', async () => {
      const effect = cellTail.addEffect(
        EffectType.TRIGGER,
        target,
        source
      );

      const result = await cellTail.triggerEffect(effect.id);
      expect(result).toBe(true);
    });

    it('should not trigger effect when condition fails', async () => {
      const effect = cellTail.addEffect(
        EffectType.TRIGGER,
        target,
        source,
        null,
        {
          condition: () => false,
        }
      );

      const result = await cellTail.triggerEffect(effect.id);
      expect(result).toBe(false);
    });

    it('should trigger effect with delay', async () => {
      const delay = 50;
      const effect = cellTail.addEffect(
        EffectType.TRIGGER,
        target,
        source,
        null,
        { delay }
      );

      const startTime = Date.now();
      await cellTail.triggerEffect(effect.id);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(delay);
    });

    it('should return false for non-existent effect', async () => {
      const result = await cellTail.triggerEffect('non-existent');
      expect(result).toBe(false);
    });

    it('should trigger all effects', async () => {
      cellTail.addEffect(EffectType.TRIGGER, target, source);
      cellTail.addEffect(EffectType.INVALIDATE, target, source);

      const triggeredCount = await cellTail.triggerAllEffects();
      expect(triggeredCount).toBe(2);
    });

    it('should remove an effect', () => {
      const effect = cellTail.addEffect(
        EffectType.TRIGGER,
        target,
        source
      );

      expect(cellTail.getEffects()).toHaveLength(1);

      const removed = cellTail.removeEffect(effect.id);
      expect(removed).toBe(true);
      expect(cellTail.getEffects()).toHaveLength(0);
    });

    it('should return false when removing non-existent effect', () => {
      const removed = cellTail.removeEffect('non-existent');
      expect(removed).toBe(false);
    });

    it('should clear all effects', () => {
      cellTail.addEffect(EffectType.TRIGGER, target, source);
      cellTail.addEffect(EffectType.INVALIDATE, target, source);

      expect(cellTail.getStats().effectsCount).toBe(2);

      cellTail.clearEffects();

      expect(cellTail.getStats().effectsCount).toBe(0);
    });

    it('should respect max effects limit', () => {
      const limitedTail = new CellTail('test-cell-4', { maxEffects: 2 });
      const source = { row: 0, col: 0 };
      const target = { row: 1, col: 0 };

      limitedTail.addEffect(EffectType.TRIGGER, target, source);
      limitedTail.addEffect(EffectType.INVALIDATE, target, source);
      limitedTail.addEffect(EffectType.NOTIFY, target, source);

      const effects = limitedTail.getEffects();
      expect(effects).toHaveLength(2);

      limitedTail.destroy();
    });

    it('should emit events when effect is triggered', (done) => {
      const effect = cellTail.addEffect(
        EffectType.TRIGGER,
        target,
        source
      );

      cellTail.on('effect', (triggeredEffect: Effect) => {
        expect(triggeredEffect.id).toBe(effect.id);
        expect(triggeredEffect.type).toBe(EffectType.TRIGGER);
        done();
      });

      cellTail.triggerEffect(effect.id);
    });

    it('should update stats when effects are triggered', async () => {
      const effect = cellTail.addEffect(
        EffectType.TRIGGER,
        target,
        source
      );

      const stats1 = cellTail.getStats();
      expect(stats1.totalEffectsTriggered).toBe(0);

      await cellTail.triggerEffect(effect.id);

      const stats2 = cellTail.getStats();
      expect(stats2.totalEffectsTriggered).toBe(1);
    });
  });

  describe('Actions', () => {
    it('should add an action', () => {
      const executeFn = async () => ({
        success: true,
        data: 'result',
        duration: 10,
      });

      const action = cellTail.addAction(
        ActionType.API_CALL,
        executeFn,
        { url: 'https://api.example.com' }
      );

      expect(action).toBeDefined();
      expect(action.id).toBeDefined();
      expect(action.type).toBe(ActionType.API_CALL);
      expect(action.config).toEqual({ url: 'https://api.example.com' });
    });

    it('should add action with condition', () => {
      const executeFn = async () => ({
        success: true,
        duration: 10,
      });

      const action = cellTail.addAction(
        ActionType.API_CALL,
        executeFn,
        {},
        {
          condition: () => true,
        }
      );

      expect(action.condition).toBeDefined();
    });

    it('should add action with retry policy', () => {
      const executeFn = async () => ({
        success: true,
        duration: 10,
      });

      const retryPolicy: RetryPolicy = {
        maxRetries: 3,
        backoffMs: 100,
        retryableErrors: ['network', 'timeout'],
      };

      const action = cellTail.addAction(
        ActionType.API_CALL,
        executeFn,
        {},
        { retryPolicy }
      );

      expect(action.retryPolicy).toEqual(retryPolicy);
    });

    it('should execute an action successfully', async () => {
      const mockData = { result: 'success' };
      const executeFn = async () => ({
        success: true,
        data: mockData,
        duration: 50,
      });

      const action = cellTail.addAction(ActionType.API_CALL, executeFn);
      const result = await cellTail.executeAction(action.id);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.duration).toBe(50);
    });

    it('should execute action and fail when condition not met', async () => {
      const executeFn = async () => ({
        success: true,
        duration: 10,
      });

      const action = cellTail.addAction(
        ActionType.API_CALL,
        executeFn,
        {},
        { condition: () => false }
      );

      const result = await cellTail.executeAction(action.id);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Action condition not met');
    });

    it('should throw error for non-existent action', async () => {
      await expect(
        cellTail.executeAction('non-existent')
      ).rejects.toThrow('Action non-existent not found');
    });

    it('should handle action execution errors', async () => {
      const executeFn = async () => {
        throw new Error('Execution failed');
      };

      const action = cellTail.addAction(ActionType.API_CALL, executeFn);

      const result = await cellTail.executeAction(action.id);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Execution failed');
    });

    it('should execute all actions', async () => {
      const executeFn1 = async () => ({ success: true, duration: 10 });
      const executeFn2 = async () => ({ success: true, duration: 20 });

      const action1 = cellTail.addAction(ActionType.API_CALL, executeFn1);
      const action2 = cellTail.addAction(ActionType.WEBHOOK, executeFn2);

      const results = await cellTail.executeAllActions();

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should retry action on retryable errors', async () => {
      let attempts = 0;
      const executeFn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('network timeout');
        }
        return { success: true, duration: 10 };
      };

      const retryPolicy: RetryPolicy = {
        maxRetries: 3,
        backoffMs: 10,
        retryableErrors: ['network', 'timeout'],
      };

      const action = cellTail.addAction(
        ActionType.API_CALL,
        executeFn,
        {},
        { retryPolicy }
      );

      const result = await cellTail.executeAction(action.id);

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });

    it('should not retry non-retryable errors', async () => {
      let attempts = 0;
      const executeFn = async () => {
        attempts++;
        throw new Error('authentication failed');
      };

      const retryPolicy: RetryPolicy = {
        maxRetries: 3,
        backoffMs: 10,
        retryableErrors: ['network', 'timeout'],
      };

      const action = cellTail.addAction(
        ActionType.API_CALL,
        executeFn,
        {},
        { retryPolicy }
      );

      const result = await cellTail.executeAction(action.id);

      expect(result.success).toBe(false);
      expect(attempts).toBe(1); // Only initial attempt
    });

    it('should respect max retries', async () => {
      let attempts = 0;
      const executeFn = async () => {
        attempts++;
        throw new Error('network timeout');
      };

      const retryPolicy: RetryPolicy = {
        maxRetries: 2,
        backoffMs: 10,
        retryableErrors: ['network', 'timeout'],
      };

      const action = cellTail.addAction(
        ActionType.API_CALL,
        executeFn,
        {},
        { retryPolicy }
      );

      const result = await cellTail.executeAction(action.id);

      expect(result.success).toBe(false);
      expect(attempts).toBe(3); // Initial + 2 retries
    });

    it('should retrieve all actions', () => {
      const executeFn = async () => ({ success: true, duration: 10 });

      cellTail.addAction(ActionType.API_CALL, executeFn);
      cellTail.addAction(ActionType.WEBHOOK, executeFn);

      const actions = cellTail.getActions();
      expect(actions).toHaveLength(2);
    });

    it('should remove an action', () => {
      const executeFn = async () => ({ success: true, duration: 10 });

      const action = cellTail.addAction(ActionType.API_CALL, executeFn);

      expect(cellTail.getActions()).toHaveLength(1);

      const removed = cellTail.removeAction(action.id);
      expect(removed).toBe(true);
      expect(cellTail.getActions()).toHaveLength(0);
    });

    it('should clear all actions', () => {
      const executeFn = async () => ({ success: true, duration: 10 });

      cellTail.addAction(ActionType.API_CALL, executeFn);
      cellTail.addAction(ActionType.WEBHOOK, executeFn);

      expect(cellTail.getStats().actionsCount).toBe(2);

      cellTail.clearActions();

      expect(cellTail.getStats().actionsCount).toBe(0);
    });

    it('should respect max actions limit', () => {
      const limitedTail = new CellTail('test-cell-5', { maxActions: 2 });
      const executeFn = async () => ({ success: true, duration: 10 });

      limitedTail.addAction(ActionType.API_CALL, executeFn);
      limitedTail.addAction(ActionType.WEBHOOK, executeFn);
      limitedTail.addAction(ActionType.EMAIL, executeFn);

      const actions = limitedTail.getActions();
      expect(actions).toHaveLength(2);

      limitedTail.destroy();
    });

    it('should emit events when action is executed', (done) => {
      const executeFn = async () => ({ success: true, duration: 10 });
      const action = cellTail.addAction(ActionType.API_CALL, executeFn);

      cellTail.on('action', ({ action: executedAction, result }: any) => {
        expect(executedAction.id).toBe(action.id);
        expect(result.success).toBe(true);
        done();
      });

      cellTail.executeAction(action.id);
    });

    it('should update stats when actions are executed', async () => {
      const executeFn = async () => ({ success: true, duration: 10 });
      const action = cellTail.addAction(ActionType.API_CALL, executeFn);

      const stats1 = cellTail.getStats();
      expect(stats1.totalActionsExecuted).toBe(0);

      await cellTail.executeAction(action.id);

      const stats2 = cellTail.getStats();
      expect(stats2.totalActionsExecuted).toBe(1);
    });
  });

  describe('Subscribers', () => {
    let cellRef: CellReference;
    let callback: jest.Mock;
    let subscriberId: string;

    beforeEach(() => {
      cellRef = { row: 1, col: 0 };
      callback = jest.fn();
      subscriberId = cellTail.subscribe(cellRef, callback);
    });

    it('should add a subscriber', () => {
      expect(subscriberId).toBeDefined();
      expect(typeof subscriberId).toBe('string');
      expect(cellTail.getSubscribers()).toHaveLength(1);
    });

    it('should add subscriber with filter', () => {
      const filter = (output: OutputChannel) => output.name === 'result';
      const callback2 = jest.fn();

      const subId = cellTail.subscribe({ row: 2, col: 0 }, callback2, filter);

      expect(subId).toBeDefined();
      const subscribers = cellTail.getSubscribers();
      expect(subscribers).toHaveLength(2);
      expect(subscribers[1].filter).toBeDefined();
    });

    it('should notify subscribers on output', () => {
      const output = cellTail.emitOutput('result', 42);

      expect(callback).toHaveBeenCalledWith(output);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should apply filter to notifications', () => {
      const filter = (output: OutputChannel) => output.name === 'result';
      const callback2 = jest.fn();

      cellTail.subscribe({ row: 2, col: 0 }, callback2, filter);

      cellTail.emitOutput('other', 'value');
      expect(callback2).not.toHaveBeenCalled();

      cellTail.emitOutput('result', 42);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should notify all subscribers', () => {
      const callback2 = jest.fn();
      cellTail.subscribe({ row: 2, col: 0 }, callback2);

      const output = cellTail.emitOutput('result', 42);

      expect(callback).toHaveBeenCalledWith(output);
      expect(callback2).toHaveBeenCalledWith(output);
    });

    it('should unsubscribe a subscriber', () => {
      expect(cellTail.getSubscribers()).toHaveLength(1);

      const removed = cellTail.unsubscribe(subscriberId);
      expect(removed).toBe(true);
      expect(cellTail.getSubscribers()).toHaveLength(0);
    });

    it('should return false when unsubscribing non-existent subscriber', () => {
      const removed = cellTail.unsubscribe('non-existent');
      expect(removed).toBe(false);
    });

    it('should not notify unsubscribed subscribers', () => {
      cellTail.unsubscribe(subscriberId);

      cellTail.emitOutput('result', 42);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should respect max subscribers limit', () => {
      const limitedTail = new CellTail('test-cell-6', { maxSubscribers: 2 });
      const callback = jest.fn();
      const cellRef = { row: 1, col: 0 };

      limitedTail.subscribe(cellRef, callback);
      limitedTail.subscribe({ row: 2, col: 0 }, callback);

      expect(() => {
        limitedTail.subscribe({ row: 3, col: 0 }, callback);
      }).toThrow('Maximum subscribers reached');

      limitedTail.destroy();
    });

    it('should clear all subscribers', () => {
      const callback2 = jest.fn();
      cellTail.subscribe({ row: 2, col: 0 }, callback2);

      expect(cellTail.getStats().subscribersCount).toBe(2);

      cellTail.clearSubscribers();

      expect(cellTail.getStats().subscribersCount).toBe(0);

      cellTail.emitOutput('result', 42);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should emit events when subscriber is added', (done) => {
      const newTail = new CellTail('test-cell-7');

      newTail.on('subscribed', (subscriber: CellSubscriber) => {
        expect(subscriber.cellRef).toEqual(cellRef);
        newTail.destroy();
        done();
      });

      newTail.subscribe(cellRef, callback);
    });

    it('should emit events when subscriber is removed', (done) => {
      cellTail.on('unsubscribed', (id: string) => {
        expect(id).toBe(subscriberId);
        done();
      });

      cellTail.unsubscribe(subscriberId);
    });

    it('should handle subscriber callback errors gracefully', (done) => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      cellTail.subscribe({ row: 2, col: 0 }, errorCallback);

      cellTail.on('subscriber-error', ({ subscriber, error }: any) => {
        expect(error.message).toBe('Callback error');
        expect(subscriber.callback).toBe(errorCallback);
        done();
      });

      cellTail.emitOutput('result', 42);
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', () => {
      const executeFn = async () => ({ success: true, duration: 10 });
      const cellRef = { row: 1, col: 0 };
      const target = { row: 2, col: 0 };
      const source = { row: 0, col: 0 };
      const callback = jest.fn();

      cellTail.emitOutput('result', 42);
      cellTail.emitOutput('result', 43);
      cellTail.addEffect(EffectType.TRIGGER, target, source);
      cellTail.addAction(ActionType.API_CALL, executeFn);
      cellTail.subscribe(cellRef, callback);

      const stats = cellTail.getStats();

      expect(stats.outputsCount).toBe(2);
      expect(stats.effectsCount).toBe(1);
      expect(stats.actionsCount).toBe(1);
      expect(stats.subscribersCount).toBe(1);
      expect(stats.totalEmits).toBe(2);
      expect(stats.lastEmitTime).toBeGreaterThan(0);
    });
  });

  describe('Reset', () => {
    it('should reset all state', async () => {
      const executeFn = async () => ({ success: true, duration: 10 });
      const cellRef = { row: 1, col: 0 };
      const target = { row: 2, col: 0 };
      const source = { row: 0, col: 0 };
      const callback = jest.fn();

      cellTail.emitOutput('result', 42);
      cellTail.addEffect(EffectType.TRIGGER, target, source);
      cellTail.addAction(ActionType.API_CALL, executeFn);
      cellTail.subscribe(cellRef, callback);

      expect(cellTail.getStats().outputsCount).toBeGreaterThan(0);

      cellTail.reset();

      const stats = cellTail.getStats();

      expect(stats.outputsCount).toBe(0);
      expect(stats.effectsCount).toBe(0);
      expect(stats.actionsCount).toBe(0);
      expect(stats.subscribersCount).toBe(0);
      expect(stats.totalEmits).toBe(0);
      expect(stats.totalEffectsTriggered).toBe(0);
      expect(stats.totalActionsExecuted).toBe(0);
      expect(stats.lastEmitTime).toBe(0);
    });
  });

  describe('Destroy', () => {
    it('should remove all event listeners on destroy', () => {
      const listener = jest.fn();
      cellTail.on('output', listener);

      expect(cellTail.listenerCount('output')).toBe(1);

      cellTail.destroy();

      expect(cellTail.listenerCount('output')).toBe(0);
    });

    it('should reset state on destroy', () => {
      cellTail.emitOutput('result', 42);

      expect(cellTail.getStats().outputsCount).toBe(1);

      cellTail.destroy();

      expect(cellTail.getStats().outputsCount).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex workflow', async () => {
      const executeFn = async () => ({ success: true, data: 'api-result', duration: 50 });
      const cellRef = { row: 1, col: 0 };
      const target = { row: 2, col: 0 };
      const source = { row: 0, col: 0 };
      const callback = jest.fn();

      // Subscribe
      const subscriberId = cellTail.subscribe(cellRef, callback);

      // Emit output (should notify subscriber)
      const output = cellTail.emitOutput('result', 42);
      expect(callback).toHaveBeenCalledWith(output);

      // Add effect
      const effect = cellTail.addEffect(
        EffectType.TRIGGER,
        target,
        source,
        { triggerValue: 42 }
      );

      // Trigger effect
      await cellTail.triggerEffect(effect.id);
      expect(cellTail.getStats().totalEffectsTriggered).toBe(1);

      // Add and execute action
      const action = cellTail.addAction(
        ActionType.API_CALL,
        executeFn,
        { endpoint: '/test' }
      );

      const actionResult = await cellTail.executeAction(action.id);
      expect(actionResult.success).toBe(true);
      expect(actionResult.data).toBe('api-result');
      expect(cellTail.getStats().totalActionsExecuted).toBe(1);

      // Verify stats
      const stats = cellTail.getStats();
      expect(stats.outputsCount).toBe(1);
      expect(stats.effectsCount).toBe(1);
      expect(stats.actionsCount).toBe(1);
      expect(stats.subscribersCount).toBe(1);

      // Cleanup
      cellTail.unsubscribe(subscriberId);
      expect(cellTail.getStats().subscribersCount).toBe(0);
    });

    it('should handle error conditions gracefully', async () => {
      const errorExecuteFn = async () => {
        throw new Error('Action failed');
      };

      const cellRef = { row: 1, col: 0 };
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      // Add failing action
      const action = cellTail.addAction(
        ActionType.API_CALL,
        errorExecuteFn
      );

      // Execute and handle error
      const result = await cellTail.executeAction(action.id);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Add error-prone subscriber
      cellTail.subscribe(cellRef, errorCallback);

      // Emit (should handle callback error)
      cellTail.emitOutput('result', 42);

      // Verify stats still correct
      expect(cellTail.getStats().totalActionsExecuted).toBe(1);
      expect(cellTail.getStats().totalEmits).toBe(1);
    });
  });
});
