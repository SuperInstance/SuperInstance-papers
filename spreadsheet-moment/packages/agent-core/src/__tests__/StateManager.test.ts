import { StateManager, AgentCellState, IAgentCellData, IAgentConfig } from '../index';

describe('StateManager', () => {
  let stateManager: StateManager;
  let cellData: IAgentCellData;

  beforeEach(() => {
    stateManager = new StateManager();
    cellData = {
      v: 'test value',
      origin_id: 'origin_A1',
      cell_type: 'SENSOR' as any,
      state: AgentCellState.DORMANT
    };
  });

  describe('canTransition', () => {
    it('should allow valid DORMANT transitions', () => {
      expect(stateManager.canTransition(AgentCellState.DORMANT, AgentCellState.THINKING)).toBe(true);
      expect(stateManager.canTransition(AgentCellState.DORMANT, AgentCellState.ERROR)).toBe(true);
    });

    it('should allow valid THINKING transitions', () => {
      expect(stateManager.canTransition(AgentCellState.THINKING, AgentCellState.NEEDS_REVIEW)).toBe(true);
      expect(stateManager.canTransition(AgentCellState.THINKING, AgentCellState.POSTED)).toBe(true);
      expect(stateManager.canTransition(AgentCellState.THINKING, AgentCellState.ERROR)).toBe(true);
    });

    it('should allow valid NEEDS_REVIEW transitions', () => {
      expect(stateManager.canTransition(AgentCellState.NEEDS_REVIEW, AgentCellState.POSTED)).toBe(true);
      expect(stateManager.canTransition(AgentCellState.NEEDS_REVIEW, AgentCellState.ARCHIVED)).toBe(true);
      expect(stateManager.canTransition(AgentCellState.NEEDS_REVIEW, AgentCellState.THINKING)).toBe(true);
      expect(stateManager.canTransition(AgentCellState.NEEDS_REVIEW, AgentCellState.ERROR)).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(stateManager.canTransition(AgentCellState.DORMANT, AgentCellState.POSTED)).toBe(false);
      expect(stateManager.canTransition(AgentCellState.THINKING, AgentCellState.ARCHIVED)).toBe(false);
      expect(stateManager.canTransition(AgentCellState.POSTED, AgentCellState.NEEDS_REVIEW)).toBe(false);
    });

    it('should handle undefined state as DORMANT', () => {
      const undefinedCell: IAgentCellData = {};
      expect(stateManager.canTransition(undefinedCell.state as any, AgentCellState.THINKING)).toBe(false);
    });
  });

  describe('transition', () => {
    it('should execute valid transitions', () => {
      const updated = stateManager.transition(cellData, AgentCellState.THINKING);

      expect(updated.state).toBe(AgentCellState.THINKING);
      expect(updated.updated_at).toBeDefined();
      expect(updated.updated_at).toBeLessThanOrEqual(Date.now());
    });

    it('should throw error for invalid transitions', () => {
      expect(() => {
        stateManager.transition(cellData, AgentCellState.POSTED);
      }).toThrow('Invalid state transition');
    });

    it('should include error message for ERROR state', () => {
      const errorMessage = 'Test error';
      const updated = stateManager.transition(cellData, AgentCellState.ERROR, errorMessage);

      expect(updated.state).toBe(AgentCellState.ERROR);
      expect(updated.error).toBe(errorMessage);
    });

    it('should clear error message when leaving ERROR state', () => {
      cellData.state = AgentCellState.ERROR;
      cellData.error = 'Previous error';

      const updated = stateManager.transition(cellData, AgentCellState.DORMANT);

      expect(updated.state).toBe(AgentCellState.DORMANT);
      expect(updated.error).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should transition to DORMANT state', () => {
      cellData.state = AgentCellState.THINKING;
      const updated = stateManager.reset(cellData);

      expect(updated.state).toBe(AgentCellState.DORMANT);
    });
  });

  describe('requestReview', () => {
    it('should transition to NEEDS_REVIEW and set requires_approval', () => {
      cellData.state = AgentCellState.THINKING;
      const updated = stateManager.requestReview(cellData);

      expect(updated.state).toBe(AgentCellState.NEEDS_REVIEW);
      expect(updated.requires_approval).toBe(true);
    });
  });

  describe('approve', () => {
    it('should transition to POSTED and clear requires_approval', () => {
      cellData.state = AgentCellState.NEEDS_REVIEW;
      cellData.requires_approval = true;

      const updated = stateManager.approve(cellData);

      expect(updated.state).toBe(AgentCellState.POSTED);
      expect(updated.requires_approval).toBe(false);
    });
  });

  describe('reject', () => {
    it('should transition to THINKING and clear requires_approval', () => {
      cellData.state = AgentCellState.NEEDS_REVIEW;
      cellData.requires_approval = true;

      const updated = stateManager.reject(cellData);

      expect(updated.state).toBe(AgentCellState.THINKING);
      expect(updated.requires_approval).toBe(false);
    });
  });
});
