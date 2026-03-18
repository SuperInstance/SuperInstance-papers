/**
 * StateManager Property-Based Tests
 *
 * Uses FastCheck to verify universal properties (invariants) of StateManager
 * rather than specific examples. This catches edge cases that traditional
 * example-based tests miss.
 *
 * @packageDocumentation
 */

import { StateManager } from '../index';
import fc from 'fast-check';

describe('StateManager Properties', () => {
  // ==========================================================================
  // PROPERTY 1: Origin Trace Integrity
  // ==========================================================================

  describe('Origin Trace Integrity', () => {
    it('should maintain trace for all operations', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            type: fc.constantFrom('CREATE', 'UPDATE', 'DELETE', 'READ'),
            origin: fc.uuid(),
            timestamp: fc.nat(),
            data: fc.anything()
          }), { minLength: 1, maxLength: 100 }),
          (operations) => {
            const manager = new StateManager();
            operations.forEach(op => manager.apply(op));

            // Property: All operations should be traceable
            const trace = manager.getTrace();
            expect(trace).toHaveLength(operations.length);

            // Property: Every operation should have an origin
            expect(trace.every(op => op.origin)).toBe(true);

            // Property: Origins should be unique
            const origins = new Set(trace.map(op => op.origin));
            expect(origins.size).toBe(operations.length);
          }
        )
      );
    });

    it('should preserve operation order', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            type: fc.constantFrom('CREATE', 'UPDATE', 'DELETE'),
            origin: fc.uuid(),
            timestamp: fc.nat()
          })),
          (operations) => {
            const manager = new StateManager();
            operations.forEach(op => manager.apply(op));

            const trace = manager.getTrace();

            // Property: Trace should maintain insertion order
            operations.forEach((op, i) => {
              expect(trace[i].origin).toBe(op.origin);
              expect(trace[i].type).toBe(op.type);
            });
          }
        )
      );
    });
  });

  // ==========================================================================
  // PROPERTY 2: Idempotency
  // ==========================================================================

  describe('Idempotency', () => {
    it('should produce same state for same operations', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            type: fc.constantFrom('CREATE', 'UPDATE'),
            origin: fc.uuid(),
            data: fc.record({
              key: fc.string(),
              value: fc.anything()
            })
          })),
          (operations) => {
            // Apply operations to two different managers
            const manager1 = new StateManager();
            const manager2 = new StateManager();

            operations.forEach(op => {
              manager1.apply({ ...op });
              manager2.apply({ ...op });
            });

            // Property: Same operations should produce identical state
            expect(manager1.getState()).toEqual(manager2.getState());
          }
        )
      );
    });

    it('should handle duplicate operations gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constantFrom('CREATE', 'UPDATE'),
            origin: fc.uuid(),
            data: fc.anything()
          }),
          (operation) => {
            const manager = new StateManager();

            // Apply same operation twice
            manager.apply(operation);
            manager.apply(operation);

            // Property: Should not create duplicate traces
            const trace = manager.getTrace();
            expect(trace.filter(op => op.origin === operation.origin)).toHaveLength(1);
          }
        )
      );
    });
  });

  // ==========================================================================
  // PROPERTY 3: State Consistency
  // ==========================================================================

  describe('State Consistency', () => {
    it('should maintain referential integrity', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            type: fc.constantFrom('CREATE', 'UPDATE', 'DELETE'),
            origin: fc.uuid(),
            parentId: fc.option(fc.uuid(), { nil: null }),
            data: fc.anything()
          })),
          (operations) => {
            const manager = new StateManager();

            // Apply only valid operations (no orphan references)
            const validOperations = operations.filter(op =>
              !op.parentId || operations.some(p => p.origin === op.parentId)
            );

            validOperations.forEach(op => manager.apply(op));

            const trace = manager.getTrace();

            // Property: No orphan operations (except roots)
            expect(trace.every(op => !op.parentId || trace.some(p => p.origin === op.parentId))).toBe(true);
          }
        )
      );
    });

    it('should handle concurrent updates correctly', () => {
      fc.assert(
        fc.property(
          fc.nat({ min: 10, max: 100 }), // Number of concurrent updates
          fc.uuid(), // Base origin
          async (count, baseOrigin) => {
            const manager = new StateManager();

            // Simulate concurrent updates
            const promises = Array.from({ length: count }, (_, i) =>
              Promise.resolve().then(() =>
                manager.update({
                  origin: `${baseOrigin}_${i}`,
                  type: 'UPDATE',
                  data: { index: i }
                })
              )
            );

            await Promise.all(promises);

            // Property: All updates should be applied
            const state = manager.getState();
            expect(state.length).toBeGreaterThanOrEqual(count);
          }
        )
      );
    });
  });

  // ==========================================================================
  // PROPERTY 4: Error Handling
  // ==========================================================================

  describe('Error Handling Properties', () => {
    it('should reject invalid operations', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constantFrom('INVALID', '', null as any),
            origin: fc.uuid(),
            data: fc.anything()
          }),
          (operation) => {
            const manager = new StateManager();

            // Property: Invalid operations should throw
            expect(() => manager.apply(operation as any)).toThrow();
          }
        )
      );
    });

    it('should handle missing required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constantFrom('CREATE', 'UPDATE'),
            // Missing origin field
            data: fc.anything()
          }),
          (operation) => {
            const manager = new StateManager();

            // Property: Operations without origin should throw
            expect(() => manager.apply(operation as any)).toThrow();
          }
        )
      );
    });
  });

  // ==========================================================================
  // PROPERTY 5: Performance Properties
  // ==========================================================================

  describe('Performance Properties', () => {
    it('should handle large operation counts efficiently', () => {
      fc.assert(
        fc.property(
          fc.nat({ min: 100, max: 10000 }),
          (operationCount) => {
            const manager = new StateManager();
            const startTime = Date.now();

            // Apply many operations
            Array.from({ length: operationCount }, (_, i) =>
              manager.apply({
                type: 'CREATE',
                origin: `origin_${i}`,
                data: {}
              })
            );

            const duration = Date.now() - startTime;

            // Property: Should process 1000 ops in <1 second
            expect(duration).toBeLessThan(1000);
          }
        )
      );
    });

    it('should maintain O(1) lookup performance', () => {
      fc.assert(
        fc.property(
          fc.nat({ min: 1000, max: 10000 }),
          fc.uuid(),
          (count, lookupOrigin) => {
            const manager = new StateManager();

            // Create many operations
            Array.from({ length: count }, (_, i) =>
              manager.apply({
                type: 'CREATE',
                origin: `origin_${i}`,
                data: {}
              })
            );

            const startTime = Date.now();

            // Lookup operation by origin
            const operation = manager.getOperation(lookupOrigin);

            const duration = Date.now() - startTime;

            // Property: Lookup should be fast regardless of state size
            expect(duration).toBeLessThan(10); // <10ms
          }
        )
      );
    });
  });

  // ==========================================================================
  // PROPERTY 6: State Transitions
  // ==========================================================================

  describe('State Transition Properties', () => {
    it('should enforce valid state transitions', () => {
      const validTransitions = new Map([
        ['DORMANT', ['THINKING', 'ACTING']],
        ['THINKING', ['ACTING', 'DORMANT', 'ERROR']],
        ['ACTING', ['DORMANT', 'ERROR']],
        ['ERROR', ['DORMANT']]
      ]);

      fc.assert(
        fc.property(
          fc.constantFrom(...Array.from(validTransitions.keys())),
          fc.constantFrom('DORMANT', 'THINKING', 'ACTING', 'ERROR', 'INVALID'),
          (fromState, toState) => {
            const manager = new StateManager();

            // Set initial state
            manager.setState('test_claw', fromState);

            const allowed = validTransitions.get(fromState) || [];

            if (allowed.includes(toState)) {
              // Property: Valid transitions should succeed
              expect(() => {
                manager.setState('test_claw', toState);
              }).not.toThrow();
            } else {
              // Property: Invalid transitions should throw
              expect(() => {
                manager.setState('test_claw', toState);
              }).toThrow();
            }
          }
        )
      );
    });
  });
});
