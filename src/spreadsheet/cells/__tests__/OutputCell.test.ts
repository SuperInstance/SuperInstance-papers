/**
 * Tests for OutputCell
 */

import { OutputCell, OutputCellConfig, OutputFormat } from '../OutputCell.js';
import { CellState } from '../../core/types.js';

describe('OutputCell', () => {
  let config: OutputCellConfig;
  let cell: OutputCell;

  beforeEach(() => {
    config = {
      position: { row: 0, col: 0 },
    outputFormat: OutputFormat.RAW,
  };
    cell = new OutputCell(config);
  });

  describe('constructor', () => {
    it('should create an OutputCell with correct type', () => {
      expect(cell).toBeDefined();
      expect(cell['type']).toBe('output');
    });

    it('should set output format correctly', () => {
      expect(cell['outputFormat']).toBe(OutputFormat.RAW);
    });

    it('should set label if provided', () => {
      const labeledCell = new OutputCell({
        ...config,
        label: 'Total Sales',
      });
      expect(labeledCell['label']).toBe('Total Sales');
    });

    it('should set description if provided', () => {
      const descCell = new OutputCell({
        ...config,
        description: 'Sum of all sales',
      });
      expect(descCell['description']).toBe('Sum of all sales');
    });
  });

  describe('output', () => {
    it('should output raw value', async () => {
      const result = await cell.output('test value');
      expect(result.success).toBe(true);
      expect(result.value).toBe('test value');
    });

    it('should output number value', async () => {
      const result = await cell.output(42);
      expect(result.success).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should output object value', async () => {
      const obj = { key: 'value' };
      const result = await cell.output(obj);
      expect(result.success).toBe(true);
      expect(result.value).toEqual(obj);
    });
  });

  describe('output formats', () => {
    it('should output as JSON', async () => {
      const jsonCell = new OutputCell({
        ...config,
        outputFormat: OutputFormat.JSON,
      });
      const result = await jsonCell.output({ key: 'value' });
      expect(result.success).toBe(true);
      expect(typeof result.value).toBe('string');
      expect(JSON.parse(result.value as string)).toEqual({ key: 'value' });
    });

    it('should output as CSV', async () => {
      const csvCell = new OutputCell({
        ...config,
        outputFormat: OutputFormat.CSV,
      });
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      const result = await csvCell.output(data);
      expect(result.success).toBe(true);
      expect(typeof result.value).toBe('string');
      expect(result.value).toContain('name,age');
    });

    it('should output as table', async () => {
      const tableCell = new OutputCell({
        ...config,
        outputFormat: OutputFormat.TABLE,
      });
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      const result = await tableCell.output(data);
      expect(result.success).toBe(true);
      expect(result.value.type).toBe('table');
      expect(result.value.rowCount).toBe(2);
    });
  });

  describe('output history', () => {
    it('should track output history', async () => {
      await cell.output('first');
      await cell.output('second');

      const history = cell.getOutputHistory();
      expect(history.length).toBe(2);
      expect(history[0].value).toBe('first');
      expect(history[1].value).toBe('second');
    });

    it('should include formatted values in history', async () => {
      const jsonCell = new OutputCell({
        ...config,
        outputFormat: OutputFormat.JSON,
      });
      await jsonCell.output({ key: 'value' });

      const history = jsonCell.getOutputHistory();
      expect(history[0].formatted).toBeDefined();
    });
  });

  describe('getLabel', () => {
    it('should return undefined if no label', () => {
      expect(cell.getLabel()).toBeUndefined();
    });

    it('should return label if set', () => {
      const labeledCell = new OutputCell({
        ...config,
        label: 'Test Label',
      });
      expect(labeledCell.getLabel()).toBe('Test Label');
    });
  });

  describe('state transitions', () => {
    it('should be DORMANT initially', () => {
      expect(cell['state']).toBe(CellState.DORMANT);
    });

    it('should transition through states during output', async () => {
      await cell.output('test');
      expect(cell['state']).toBeDefined();
    });
  });
});
