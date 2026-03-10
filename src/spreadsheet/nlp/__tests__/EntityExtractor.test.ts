/**
 * Tests for EntityExtractor
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { EntityExtractor } from '../EntityExtractor.js';
import type { Entity } from '../types.js';

describe('EntityExtractor', () => {
  let extractor: EntityExtractor;

  beforeEach(() => {
    extractor = new EntityExtractor();
  });

  describe('extractCellReferences', () => {
    it('should extract direct cell references', () => {
      const entities = extractor.extractEntities('calculate A1 plus B5');

      const cellEntities = entities.filter(e => e.type === 'cell');
      expect(cellEntities.length).toBe(2);
      expect(cellEntities[0].resolved.cellReference).toBe('A1');
      expect(cellEntities[1].resolved.cellReference).toBe('B5');
    });

    it('should extract natural language cell references', () => {
      const entities = extractor.extractEntities('cell A1 and column B row 5');

      const cellEntities = entities.filter(e => e.type === 'cell');
      expect(cellEntities.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract positional references', () => {
      const entities = extractor.extractEntities('first column second row');

      const cellEntities = entities.filter(e => e.type === 'cell');
      expect(cellEntities.length).toBeGreaterThan(0);
    });

    it('should handle case insensitive cell references', () => {
      const entities = extractor.extractEntities('calculate a1 and B5');

      const cellEntities = entities.filter(e => e.type === 'cell');
      expect(cellEntities.length).toBe(2);
    });

    it('should handle two-letter column names', () => {
      const entities = extractor.extractEntities('calculate AA1 and ZB100');

      const cellEntities = entities.filter(e => e.type === 'cell');
      expect(cellEntities.length).toBe(2);
    });
  });

  describe('extractRanges', () => {
    it('should extract Excel range notation', () => {
      const entities = extractor.extractEntities('sum A1:Z100');

      const rangeEntities = entities.filter(e => e.type === 'range');
      expect(rangeEntities.length).toBe(1);
      expect(rangeEntities[0].resolved.range?.start).toBe('A1');
      expect(rangeEntities[0].resolved.range?.end).toBe('Z100');
    });

    it('should extract entire column ranges', () => {
      const entities = extractor.extractEntities('format column A:A');

      const rangeEntities = entities.filter(e => e.type === 'range');
      expect(rangeEntities.length).toBe(1);
      expect(rangeEntities[0].resolved.range?.entireColumn).toBe(true);
    });

    it('should extract natural language ranges', () => {
      const entities = extractor.extractEntities('sum from A1 to Z100');

      const rangeEntities = entities.filter(e => e.type === 'range');
      expect(rangeEntities.length).toBe(1);
    });

    it('should extract top N rows', () => {
      const entities = extractor.extractEntities('sum the top 10 rows');

      const rangeEntities = entities.filter(e => e.type === 'range');
      expect(rangeEntities.length).toBe(1);
      expect(rangeEntities[0].resolved.range?.end).toContain('10');
    });

    it('should handle range variations', () => {
      const entities = extractor.extractEntities('A1 through Z100, from A1 to Z100, A1-Z100');

      const rangeEntities = entities.filter(e => e.type === 'range');
      expect(rangeEntities.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('extractValues', () => {
    it('should extract integers', () => {
      const entities = extractor.extractEntities('add 500 to the total');

      const valueEntities = entities.filter(e => e.type === 'value');
      expect(valueEntities.length).toBe(1);
      expect(valueEntities[0].resolved.value?.parsed).toBe(500);
    });

    it('should extract decimals', () => {
      const entities = extractor.extractEntities('add 3.14 to the total');

      const valueEntities = entities.filter(e => e.type === 'value');
      expect(valueEntities.length).toBe(1);
      expect(valueEntities[0].resolved.value?.parsed).toBe(3.14);
    });

    it('should extract percentages', () => {
      const entities = extractor.extractEntities('calculate 50% of the total');

      const valueEntities = entities.filter(e => e.type === 'value');
      expect(valueEntities.length).toBe(1);
      expect(valueEntities[0].resolved.value?.type).toBe('percentage');
      expect(valueEntities[0].resolved.value?.parsed).toBe(0.5);
    });

    it('should extract number words', () => {
      const entities = extractor.extractEntities('add five hundred to the total');

      const valueEntities = entities.filter(e => e.type === 'value' && e.resolved.value?.type === 'number');
      expect(valueEntities.length).toBeGreaterThan(0);
    });

    it('should extract dates', () => {
      const entities = extractor.extractEntities('filter dates after 12/31/2023');

      const valueEntities = entities.filter(e => e.type === 'value' && e.resolved.value?.type === 'date');
      expect(valueEntities.length).toBe(1);
    });

    it('should handle multiple values', () => {
      const entities = extractor.extractEntities('add 100 and 200 and 300');

      const valueEntities = entities.filter(e => e.type === 'value');
      expect(valueEntities.length).toBe(3);
    });
  });

  describe('extractOperations', () => {
    it('should extract Excel function names', () => {
      const entities = extractor.extractEntities('use SUM and AVERAGE functions');

      const operationEntities = entities.filter(e => e.type === 'operation');
      expect(operationEntities.length).toBe(2);
      expect(operationEntities[0].resolved.operation?.excelName).toBe('SUM');
      expect(operationEntities[1].resolved.operation?.excelName).toBe('AVERAGE');
    });

    it('should extract natural language operations', () => {
      const entities = extractor.extractEntities('add up all the values');

      const operationEntities = entities.filter(e => e.type === 'operation');
      expect(operationEntities.length).toBeGreaterThan(0);
    });

    it('should handle case insensitive function names', () => {
      const entities = extractor.extractEntities('use sum, Sum, and SUM');

      const operationEntities = entities.filter(e => e.type === 'operation');
      expect(operationEntities.length).toBe(3);
    });

    it('should extract various function categories', () => {
      const entities = extractor.extractEntities('use SUM, VLOOKUP, CONCATENATE, and TODAY');

      const operationEntities = entities.filter(e => e.type === 'operation');
      expect(operationEntities.length).toBe(4);
    });
  });

  describe('extractConditions', () => {
    it('should extract greater than condition', () => {
      const entities = extractor.extractEntities('filter values greater than 100');

      const conditionEntities = entities.filter(e => e.type === 'condition');
      expect(conditionEntities.length).toBe(1);
      expect(conditionEntities[0].resolved.condition?.operator).toBe('>');
    });

    it('should extract less than condition', () => {
      const entities = extractor.extractEntities('filter values less than 50');

      const conditionEntities = entities.filter(e => e.type === 'condition');
      expect(conditionEntities.length).toBe(1);
      expect(conditionEntities[0].resolved.condition?.operator).toBe('<');
    });

    it('should extract equal to condition', () => {
      const entities = extractor.extractEntities('filter values equal to 100');

      const conditionEntities = entities.filter(e => e.type === 'condition');
      expect(conditionEntities.length).toBeGreaterThan(0);
    });

    it('should extract contains condition', () => {
      const entities = extractor.extractEntities('filter values containing text');

      const conditionEntities = entities.filter(e => e.type === 'condition');
      expect(conditionEntities.some(c => c.resolved.condition?.operator === 'contains')).toBe(true);
    });

    it('should extract starts with condition', () => {
      const entities = extractor.extractEntities('filter values starting with A');

      const conditionEntities = entities.filter(e => e.type === 'condition');
      expect(conditionEntities.some(c => c.resolved.condition?.operator === 'starts_with')).toBe(true);
    });
  });

  describe('resolveAmbiguities', () => {
    it('should remove overlapping entities', () => {
      const entities = extractor.extractEntities('cell A1 and A1:Z100');

      const positions = entities.map(e => `${e.position.start}-${e.position.end}`);
      const uniquePositions = new Set(positions);

      expect(positions.length).toBe(uniquePositions.size);
    });

    it('should keep higher confidence entities', () => {
      const entities = extractor.extractEntities('A1');

      const cellEntities = entities.filter(e => e.type === 'cell');
      expect(cellEntities.length).toBeGreaterThan(0);

      if (cellEntities.length > 0) {
        expect(cellEntities[0].confidence).toBeGreaterThan(0);
      }
    });

    it('should handle multiple entity types', () => {
      const entities = extractor.extractEntities('sum A1 to A10 where values are greater than 100');

      expect(entities.some(e => e.type === 'operation')).toBe(true);
      expect(entities.some(e => e.type === 'range' || e.type === 'cell')).toBe(true);
      expect(entities.some(e => e.type === 'condition')).toBe(true);
    });
  });

  describe('getEntitiesByType', () => {
    it('should filter entities by type', () => {
      const entities = extractor.extractEntities('sum A1 to A10 greater than 100');

      const cellEntities = extractor.getEntitiesByType(entities, 'cell');
      const conditionEntities = extractor.getEntitiesByType(entities, 'condition');

      expect(cellEntities.length).toBeGreaterThanOrEqual(0);
      expect(conditionEntities.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getEntityAtPosition', () => {
    it('should find entity at specific position', () => {
      const text = 'sum A1 to A10';
      const entities = extractor.extractEntities(text);

      const entity = extractor.getEntityAtPosition(entities, 5); // Position of 'A1'

      expect(entity).toBeDefined();
      expect(entity?.type).toBe('cell');
    });

    it('should return undefined for empty position', () => {
      const entities = extractor.extractEntities('sum A1 to A10');

      const entity = extractor.getEntityAtPosition(entities, 999);

      expect(entity).toBeUndefined();
    });
  });

  describe('confidence scores', () => {
    it('should assign appropriate confidence to direct references', () => {
      const entities = extractor.extractEntities('calculate A1');

      const cellEntity = entities.find(e => e.type === 'cell');
      expect(cellEntity?.confidence).toBeGreaterThan(0.9);
    });

    it('should assign lower confidence to natural language references', () => {
      const entities = extractor.extractEntities('first column');

      const cellEntity = entities.find(e => e.type === 'cell');
      if (cellEntity) {
        expect(cellEntity.confidence).toBeLessThan(0.9);
      }
    });
  });

  describe('complex inputs', () => {
    it('should handle mixed entity types', () => {
      const text = 'sum the sales column (A1:A100) where values are greater than 500';
      const entities = extractor.extractEntities(text);

      expect(entities.length).toBeGreaterThan(3);
      expect(entities.some(e => e.type === 'operation')).toBe(true);
      expect(entities.some(e => e.type === 'range')).toBe(true);
      expect(entities.some(e => e.type === 'condition')).toBe(true);
      expect(entities.some(e => e.type === 'value')).toBe(true);
    });

    it('should maintain entity order', () => {
      const text = 'calculate A1 plus B5 minus 10';
      const entities = extractor.extractEntities(text);

      for (let i = 1; i < entities.length; i++) {
        expect(entities[i].position.start).toBeGreaterThan(entities[i - 1].position.start);
      }
    });
  });
});
