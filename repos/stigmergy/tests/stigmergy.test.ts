import { Stigmergy, PheromoneType, TrailFollower } from '../src/stigmergy';

// ============================================================================
// BASIC TESTS
// ============================================================================

describe('Stigmergy', () => {
  let stigmergy: Stigmergy;

  beforeEach(() => {
    stigmergy = new Stigmergy({
      maxPheromones: 100,
      evaporationInterval: 1000,
      detectionRadius: 0.5
    });
  });

  afterEach(() => {
    stigmergy.shutdown();
  });

  test('deposits pheromones correctly', () => {
    const position = { coordinates: [0, 0] };
    const pheromone = stigmergy.deposit(
      'agent-1',
      PheromoneType.PATHWAY,
      position,
      0.8
    );

    expect(pheromone).toBeDefined();
    expect(pheromone.type).toBe(PheromoneType.PATHWAY);
    expect(pheromone.strength).toBe(0.8);
    expect(pheromone.position).toEqual(position);
    expect(pheromone.sourceId).toBe('agent-1');
  });

  test('detects nearby pheromones', () => {
    const position = { coordinates: [0, 0] };
    stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position, 1.0);
    stigmergy.deposit('agent-1', PheromoneType.DANGER, { coordinates: [0.2, 0.2] }, 0.5);

    const detected = stigmergy.detect(position);

    expect(detected.nearby.length).toBe(2);
    expect(detected.strongest).toBeDefined();
    expect(detected.strongest?.type).toBe(PheromoneType.PATHWAY); // Higher strength
  });

  test('detects specific types only', () => {
    stigmergy.deposit('agent-1', PheromoneType.RESOURCE, { coordinates: [0, 0] }, 1.0);
    stigmergy.deposit('agent-1', PheromoneType.DANGER, { coordinates: [0.2, 0.2] }, 1.0);
    stigmergy.deposit('agent-1', PheromoneType.PATHWAY, { coordinates: [0.3, 0.3] }, 1.0);

    const resourceDetections = stigmergy.detect({ coordinates: [0, 0] }, [PheromoneType.RESOURCE]);
    expect(resourceDetections.nearby.length).toBe(1);
    expect(resourceDetections.nearby[0].type).toBe(PheromoneType.RESOURCE);

    const dangerDetections = stigmergy.detect({ coordinates: [0, 0] }, [PheromoneType.DANGER]);
    expect(dangerDetections.nearby.length).toBe(1);
  });

  test('follows pheromones and reinforces them', () => {
    const position = { coordinates: [0, 0] };
    const pheromone = stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position, 0.5);

    const initialStrength = pheromone.strength;

    // Follow and reinforce
    stigmergy.follow(pheromone.id, 'agent-2');

    // Re-detect to see updated strength
    const detected = stigmergy.detect(position);
    expect(detected.strongest?.strength).toBeGreaterThan(initialStrength);
  });

  test('evaporates pheromones over time', () => {
    const position = { coordinates: [0, 0] };
    stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position, 0.5);

    // Simulate time passing with extreme decay
    stigmergy.evaporate();

    const detected = stigmergy.detect(position);
    expect(detected.nearby[0].strength).toBeLessThan(0.5);
  });

  test('respects max pheromone limit', () => {
    const stigmergy = new Stigmergy({ maxPheromones: 2 });

    stigmergy.deposit('agent-1', PheromoneType.PATHWAY, { coordinates: [0, 0] }, 1.0);
    stigmergy.deposit('agent-1', PheromoneType.PATHWAY, { coordinates: [1, 1] }, 1.0);
    stigmergy.deposit('agent-1', PheromoneType.PATHWAY, { coordinates: [2, 2] }, 1.0);

    const stats = stigmergy.getStats();
    expect(stats.totalDeposited).toBe(3);
    expect(stigmergy.evaporateOldest).toHaveBeenCalledTimes(1);

    stigmergy.shutdown();
  });

  test('tracks statistics', () => {
    stigmergy.deposit('agent-1', PheromoneType.PATHWAY, { coordinates: [0, 0] }, 1.0);
    stigmergy.deposit('agent-1', PheromoneType.DANGER, { coordinates: [0, 0] }, 1.0);
    stigmergy.follow('some-id', 'agent-2'); // Won't count as no pheromone

    const stats = stigmergy.getStats();
    expect(stats.totalDeposited).toBe(2);
    expect(stats.byType[PheromoneType.PATHWAY]).toBe(1);
    expect(stats.byType[PheromoneType.DANGER]).toBe(1);
  });

  test('reset clears all data', () => {
    stigmergy.deposit('agent-1', PheromoneType.PATHWAY, { coordinates: [0, 0] }, 1.0);
    stigmergy.deposit('agent-1', PheromoneType.RESOURCE, { coordinates: [0, 0] }, 1.0);

    stigmergy.reset();

    const detected = stigmergy.detect({ coordinates: [0, 0] });
    expect(detected.nearby.length).toBe(0);

    const stats = stigmergy.getStats();
    expect(stats.totalDeposited).toBe(0);
    expect(stats.byType[PheromoneType.PATHWAY]).toBe(0);
  });
});

// ============================================================================
// TRAIL FOLLOWER TESTS
// ============================================================================

describe('TrailFollower', () => {
  let stigmergy: Stigmergy;
  let follower: TrailFollower;

  beforeEach(() => {
    stigmergy = new Stigmergy();
    follower = new TrailFollower(stigmergy, 'agent-123');
  });

  test('follows trails correctly', () => {
    const targetPosition = { coordinates: [10, 20] };
    stigmergy.deposit('leader', PheromoneType.PATHWAY, targetPosition, 1.0);

    const result = follower.followTrail(targetPosition, PheromoneType.PATHWAY);

    expect(result.found).toBe(true);
    expect(result.pheromone).toBeDefined();
    expect(result.pheromone?.type).toBe(PheromoneType.PATHWAY);
    expect(result.direction).toEqual(targetPosition);
  });

  test('returns false when no trail found', () => {
    const result = follower.followTrail(
      { coordinates: [0, 0] },
      PheromoneType.PATHWAY
    );

    expect(result.found).toBe(false);
    expect(result.pheromone).toBeNull();
    expect(result.direction).toBeUndefined();
  });

  test('leaves signals', () => {
    const position = { coordinates: [5, 5] };
    const pheromone = follower.leaveSignal(
      PheromoneType.DANGER,
      position,
      0.5
    );

    expect(pheromone).toBeDefined();
    expect(pheromone.type).toBe(PheromoneType.DANGER);
    expect(pheromone.strength).toBe(0.5);
    expect(pheromone.position).toEqual(position);
  });

  test('leaves signals with metadata', () => {
    const position = { coordinates: [5, 5] };
    const metadata = new Map([
      ['threat', 'malicious-ip'],
      ['confidence', 0.8]
    ]);

    const pheromone = follower.leaveSignal(
      PheromoneType.DANGER,
      position,
      0.5,
      metadata
    );

    expect(pheromone.metadata.get('threat')).toBe('malicious-ip');
    expect(pheromone.metadata.get('confidence')).toBe(0.8);
  });

  test('tracks followed trails count', () => {
    expect(follower.getFollowedCount()).toBe(0);

    stigmergy.deposit('leader', PheromoneType.PATHWAY, { coordinates: [1, 1] }, 1.0);
    follower.followTrail({ coordinates: [1, 1] }, PheromoneType.PATHWAY);
    expect(follower.getFollowedCount()).toBe(1);

    follower.followTrail({ coordinates: [1, 1] }, PheromoneType.PATHWAY);
    expect(follower.getFollowedCount()).toBe(2);
  });
});

// ============================================================================
// EVENT TESTING
// ============================================================================

describe('events', () => {
  test('emits deposit events', (done) => {
    const stigmergy = new Stigmergy();

    stigmergy.on('deposit', (data) => {
      expect(data.type).toBe(PheromoneType.PATHWAY);
      expect(data.sourceId).toBe('test-agent');
      expect(data.position).toEqual({ coordinates: [1, 2] });
      stigmergy.shutdown();
      done();
    });

    stigmergy.deposit('test-agent', PheromoneType.PATHWAY, { coordinates: [1, 2] });
  });

  test('emits evaporated events', (done) => {
    const stigmergy = new Stigmergy();

    // Create a very weak signal that will evaporate immediately
    const pheromone = stigmergy.deposit('agent', PheromoneType.PATHWAY, { coordinates: [0, 0] }, 0.001);
    pheromone.strength = 0.009; // Just below the threshold
    pheromone.createdAt = Date.now() - 1000000; // Long ago

    stigmergy.on('evaporated', (data) => {
      expect(data.count).toBeGreaterThan(0);
      stigmergy.shutdown();
      done();
    });

    stigmergy.evaporate();
  });

  test('emits followed events', (done) => {
    const stigmergy = new Stigmergy();
    const pheromone = stigmergy.deposit('agent-1', PheromoneType.PATHWAY, { coordinates: [0, 0] });

    stigmergy.on('followed', (data) => {
      expect(data.pheromoneId).toBe(pheromone.id);
      expect(data.followerId).toBe('agent-2');
      stigmergy.shutdown();
      done();
    });

    stigmergy.follow(pheromone.id, 'agent-2');
  });
});

// ============================================================================
// EDGE CASES AND POSITION TYPES
// ============================================================================

describe('position types and edge cases', () => {
  test('handles coordinate-based positions', () => {
    const stigmergy = new Stigmergy({ detectionRadius: 5.0 });

    stigmergy.deposit('agent', PheromoneType.PATHWAY, { coordinates: [0, 0] }, 1.0);

    // Should detect within radius
    const inside = stigmergy.detect({ coordinates: [3, 4] }); // Distance 5
    expect(inside.nearby.length).toBe(1);

    // Should not detect outside radius
    const outside = stigmergy.detect({ coordinates: [4, 4] }); // Distance ~5.6 > 5
    expect(outside.nearby.length).toBe(0);

    stigmergy.shutdown();
  });

  test('handles topic-based positions', () => {
    const stigmergy = new Stigmergy({ detectionRadius: 0.5 });

    stigmergy.deposit('agent', PheromoneType.PATHWAY, { topic: 'task-processing' });

    const sameTopic = stigmergy.detect({ topic: 'task-processing' });
    expect(sameTopic.nearby.length).toBe(1);

    const differentTopic = stigmergy.detect({ topic: 'user-interface' });
    expect(differentTopic.nearby.length).toBe(0);

    stigmergy.shutdown();
  });

  test('handles mixed position properties', () => {
    const stigmergy = new Stigmergy();

    stigmergy.deposit('agent', PheromoneType.PATHWAY, {
      coordinates: [0, 0],
      topic: 'routing',
      taskType: 'pathfinding'
    });

    // Should detect even with partial position info
    const detected = stigmergy.detect({
      coordinates: [0.1, 0.1],
      topic: 'routing'
    });

    expect(detected.nearby.length).toBe(1);
    stigmergy.shutdown();
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('performance', () => {
  test('handles many signals efficiently', () => {
    const stigmergy = new Stigmergy({
      maxPheromones: 10000,
      evaporationInterval: 3600000 // 1 hour - disable for test
    });

    const start = Date.now();

    // Deposit many signals
    for (let i = 0; i < 1000; i++) {
      stigmergy.deposit(`agent-${i%10}`, PheromoneType.PATHWAY, {
        coordinates: [Math.random() * 100, Math.random() * 100]
      }, Math.random());
    }

    const depositTime = Date.now() - start;

    // Detect near a position
    const detectStart = Date.now();
    const result = stigmergy.detect({ coordinates: [50, 50] });
    const detectTime = Date.now() - detectStart;

    expect(depositTime).toBeLessThan(1000); // 1 second max
    expect(detectTime).toBeLessThan(50);   // 50ms max
    expect(result.nearby.length).toBeGreaterThan(0);

    stigmergy.shutdown();
  });
});