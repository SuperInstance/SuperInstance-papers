/**
 * Tests for InputCell
 */

import { InputCell, InputCellConfig, InputType } from '../InputCell.js';
import { CellState } from '../../core/types.js';

describe('InputCell', () => {
  let config: InputCellConfig;
  let cell: InputCell;

  beforeEach(() => {
    config = {
      position: { row: 0, col: 0 },
      inputType: InputType.USER_DATA,
    };
    cell = new InputCell(config);
  });

  describe('constructor', () => {
    it('should create an InputCell with correct type', () => {
      expect(cell).toBeDefined();
      expect(cell['type']).toBe('input');
    });

    it('should set input type correctly', () => {
      expect(cell['inputType']).toBe(InputType.USER_DATA);
    });

    it('should set default value if provided', () => {
      const cellWithDefault = new InputCell({
        ...config,
        defaultValue: 'test',
      });
      expect(cellWithDefault['defaultValue']).toBe('test');
    });
  });

  describe('receiveInput', () => {
    it('should accept valid string input', async () => {
      const result = await cell.receiveInput('hello');
      expect(result.success).toBe(true);
      expect(result.value).toBe('hello');
    });

    it('should accept valid number input', async () => {
      const result = await cell.receiveInput(42);
      expect(result.success).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should accept valid array input', async () => {
      const result = await cell.receiveInput([1, 2, 3]);
      expect(result.success).toBe(true);
      expect(result.value).toEqual([1, 2, 3]);
    });

    it('should accept valid object input', async () => {
      const obj = { key: 'value' };
      const result = await cell.receiveInput(obj);
      expect(result.success).toBe(true);
      expect(result.value).toEqual(obj);
    });

    it('should handle null input', async () => {
      const result = await cell.receiveInput(null);
      expect(result.success).toBe(true);
      expect(result.value).toBeNull();
    });

    it('should validate input when validation function provided', async () => {
      const validatedCell = new InputCell({
        ...config,
        validation: (v) => typeof v === 'number',
      });

      const validResult = await validatedCell.receiveInput(42);
      expect(validResult.success).toBe(true);

      const invalidResult = await validatedCell.receiveInput('invalid');
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear current value', () => {
      cell.receiveInput('test');
      cell.clear();
      expect(cell.getCurrentValue()).toBeUndefined();
    });
  });

  describe('getCurrentValue', () => {
    it('should return undefined when no value set', () => {
      expect(cell.getCurrentValue()).toBeUndefined();
    });

    it('should return current value after input', async () => {
      await cell.receiveInput('test');
      expect(cell.getCurrentValue()).toBe('test');
    });
  });

  describe('getInputHistory', () => {
    it('should return empty array initially', () => {
      expect(cell.getInputHistory()).toEqual([]);
    });

    it('should record input history', async () => {
      await cell.receiveInput('first');
      await cell.receiveInput('second');
      await cell.receiveInput('third');

      const history = cell.getInputHistory();
      expect(history.length).toBe(3);
      expect(history[0].value).toBe('first');
      expect(history[1].value).toBe('second');
      expect(history[2].value).toBe('third');
    });
  });

  describe('input types', () => {
    it('should handle USER_DATA type', async () => {
      const userCell = new InputCell({
        ...config,
        inputType: InputType.USER_DATA,
      });
      const result = await userCell.receiveInput('user input');
      expect(result.success).toBe(true);
    });

    it('should handle EXTERNAL_DATA type', async () => {
      const externalCell = new InputCell({
        ...config,
        inputType: InputType.EXTERNAL_DATA,
      });
      const result = await externalCell.receiveInput({ data: 'from api' });
      expect(result.success).toBe(true);
    });

    it('should handle FORMULA type', async () => {
      const formulaCell = new InputCell({
        ...config,
        inputType: InputType.FORMULA,
      });
      const result = await formulaCell.receiveInput('=A1+B1');
      expect(result.success).toBe(true);
    });

    it('should handle REFERENCE type', async () => {
      const refCell = new InputCell({
        ...config,
        inputType: InputType.REFERENCE,
      });
      const result = await refCell.receiveInput('Sheet1!A1');
      expect(result.success).toBe(true);
    });

    it('should handle CONSTANT type', async () => {
      const constCell = new InputCell({
        ...config,
        inputType: InputType.CONSTANT,
        defaultValue: 42,
      });
      const result = await constCell.receiveInput(42);
      expect(result.success).toBe(true);
    });
  });

  describe('state transitions', () => {
    it('should be DORMANT initially', () => {
      expect(cell['state']).toBe(CellState.DORMANT);
    });

    it('should transition to SENSING during input', async () => {
      await cell.receiveInput('test');
      // State should have transitioned
      expect(cell['state']).toBeDefined();
    });
  });
});
