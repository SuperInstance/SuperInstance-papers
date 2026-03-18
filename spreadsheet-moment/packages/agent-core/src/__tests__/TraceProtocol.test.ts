import { TraceProtocol, AgentCellState } from '../index';

describe('TraceProtocol', () => {
  let traceProtocol: TraceProtocol;

  beforeEach(() => {
    traceProtocol = new TraceProtocol();
  });

  afterEach(() => {
    traceProtocol.dispose();
  });

  describe('generate', () => {
    it('should generate a unique trace ID', () => {
      const traceId1 = traceProtocol.generate('cell_A1');
      const traceId2 = traceProtocol.generate('cell_A1');

      expect(traceId1).not.toBe(traceId2);
      expect(traceId1).toMatch(/^trace_\d+_[a-z0-9]+_cell_A1$/);
    });

    it('should include origin ID in trace ID', () => {
      const traceId = traceProtocol.generate('origin_cell');
      expect(traceId).toContain('origin_cell');
    });

    it('should initialize trace with origin in path', () => {
      const traceId = traceProtocol.generate('cell_A1');
      const path = traceProtocol.getPath(traceId);

      expect(path).toEqual(['cell_A1']);
    });
  });

  describe('checkCollision', () => {
    it('should detect recursive loops', () => {
      const traceId = traceProtocol.generate('cell_A1');
      traceProtocol.checkCollision(traceId, 'cell_B1');
      traceProtocol.checkCollision(traceId, 'cell_C1');

      const hasCollision = traceProtocol.checkCollision(traceId, 'cell_A1');

      expect(hasCollision).toBe(true);
    });

    it('should return false for new cells', () => {
      const traceId = traceProtocol.generate('cell_A1');
      const hasCollision = traceProtocol.checkCollision(traceId, 'cell_B1');

      expect(hasCollision).toBe(false);
    });

    it('should track path correctly', () => {
      const traceId = traceProtocol.generate('cell_A1');
      traceProtocol.checkCollision(traceId, 'cell_B1');
      traceProtocol.checkCollision(traceId, 'cell_C1');

      const path = traceProtocol.getPath(traceId);

      expect(path).toEqual(['cell_A1', 'cell_B1', 'cell_C1']);
    });

    it('should handle non-existent trace IDs gracefully', () => {
      const hasCollision = traceProtocol.checkCollision('non_existent', 'cell_A1');

      expect(hasCollision).toBe(false);
    });
  });

  describe('complete', () => {
    it('should mark trace for cleanup', () => {
      const traceId = traceProtocol.generate('cell_A1');
      traceProtocol.complete(traceId);

      // Trace should still exist but be marked for cleanup
      const path = traceProtocol.getPath(traceId);
      expect(path).toEqual(['cell_A1']);
    });
  });

  describe('getStats', () => {
    it('should return active trace count', () => {
      traceProtocol.generate('cell_A1');
      traceProtocol.generate('cell_B1');
      traceProtocol.generate('cell_C1');

      const stats = traceProtocol.getStats();

      expect(stats.active).toBe(3);
    });

    it('should return total path length', () => {
      const traceId1 = traceProtocol.generate('cell_A1');
      const traceId2 = traceProtocol.generate('cell_B1');

      traceProtocol.checkCollision(traceId1, 'cell_B1');
      traceProtocol.checkCollision(traceId1, 'cell_C1');
      traceProtocol.checkCollision(traceId2, 'cell_D1');

      const stats = traceProtocol.getStats();

      expect(stats.totalPaths).toBe(6); // 3 + 2 = 5 + origins = 6
    });
  });

  describe('dispose', () => {
    it('should clear all traces', () => {
      traceProtocol.generate('cell_A1');
      traceProtocol.generate('cell_B1');

      traceProtocol.dispose();

      const stats = traceProtocol.getStats();
      expect(stats.active).toBe(0);
    });

    it('should stop cleanup timer', () => {
      const traceId = traceProtocol.generate('cell_A1');
      traceProtocol.dispose();

      // Should not throw error
      traceProtocol.complete(traceId);
    });
  });
});
