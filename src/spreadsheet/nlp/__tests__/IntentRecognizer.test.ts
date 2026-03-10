/**
 * Tests for IntentRecognizer
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { IntentRecognizer } from '../IntentRecognizer.js';
import type { SpreadsheetIntent, Entity } from '../types.js';

describe('IntentRecognizer', () => {
  let recognizer: IntentRecognizer;

  beforeEach(() => {
    recognizer = new IntentRecognizer();
  });

  describe('detectIntent', () => {
    it('should detect formula creation intent', () => {
      const intent = recognizer.detectIntent('calculate the sum of column A');

      expect(intent.type).toBe('create_formula');
      expect(intent.confidence).toBeGreaterThan(0);
      expect(intent.action).toBeTruthy();
    });

    it('should detect analysis intent', () => {
      const intent = recognizer.detectIntent('analyze the sales data trends');

      expect(intent.type).toBe('analyze');
    });

    it('should detect navigation intent', () => {
      const intent = recognizer.detectIntent('go to cell B10');

      expect(intent.type).toBe('navigate');
    });

    it('should detect formatting intent', () => {
      const intent = recognizer.detectIntent('format column A as currency');

      expect(intent.type).toBe('format');
    });

    it('should detect chart creation intent', () => {
      const intent = recognizer.detectIntent('create a bar chart');

      expect(intent.type).toBe('chart');
    });

    it('should detect filter intent', () => {
      const intent = recognizer.detectIntent('filter values greater than 100');

      expect(intent.type).toBe('filter');
    });

    it('should detect sort intent', () => {
      const intent = recognizer.detectIntent('sort by column A descending');

      expect(intent.type).toBe('sort');
    });

    it('should detect validation intent', () => {
      const intent = recognizer.detectIntent('validate the data for errors');

      expect(intent.type).toBe('validate');
    });

    it('should detect transform intent', () => {
      const intent = recognizer.detectIntent('convert column A to uppercase');

      expect(intent.type).toBe('transform');
    });

    it('should detect aggregate intent', () => {
      const intent = recognizer.detectIntent('aggregate sales by region');

      expect(intent.type).toBe('aggregate');
    });

    it('should increase confidence with matching entities', () => {
      const entities: Entity[] = [
        {
          type: 'operation',
          text: 'sum',
          position: { start: 0, end: 3 },
          resolved: { operation: { name: 'sum', excelName: 'SUM', parameters: [] } },
          confidence: 0.9,
        },
        {
          type: 'value',
          text: '100',
          position: { start: 10, end: 13 },
          resolved: { value: { type: 'number', raw: '100', parsed: 100 } },
          confidence: 0.95,
        },
      ];

      const intent = recognizer.detectIntent('sum the values', entities);

      expect(intent.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('extractAction', () => {
    it('should extract action from formula creation request', () => {
      const intent = recognizer.detectIntent('calculate the total sales');

      expect(intent.action).toBe('total sales');
    });

    it('should extract action from analysis request', () => {
      const intent = recognizer.detectIntent('analyze the customer trends');

      expect(intent.action).toBe('customer trends');
    });

    it('should extract action from navigation request', () => {
      const intent = recognizer.detectIntent('go to the summary section');

      expect(intent.action).toBe('summary section');
    });
  });

  describe('getAlternativeIntents', () => {
    it('should return alternative intents', () => {
      const alternatives = recognizer.getAlternativeIntents('analyze and calculate the sum');

      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives.length).toBeLessThanOrEqual(3);
    });

    it('should exclude primary intent from alternatives', () => {
      const primary = recognizer.detectIntent('sum the values');
      const alternatives = recognizer.getAlternativeIntents('sum the values');

      expect(alternatives.some(alt => alt.type === primary.type)).toBe(false);
    });

    it('should return alternatives sorted by confidence', () => {
      const alternatives = recognizer.getAlternativeIntents('calculate the average');

      for (let i = 1; i < alternatives.length; i++) {
        expect(alternatives[i - 1].confidence).toBeGreaterThanOrEqual(alternatives[i].confidence);
      }
    });
  });

  describe('custom patterns', () => {
    it('should add custom pattern', () => {
      recognizer.addCustomPattern('create_formula', /compute/i);

      const intent = recognizer.detectIntent('compute the total');

      expect(intent.type).toBe('create_formula');
    });

    it('should remove custom pattern', () => {
      const customPattern = /customcalc/i;
      recognizer.addCustomPattern('create_formula', customPattern);

      let intent = recognizer.detectIntent('customcalc the total');
      expect(intent.type).toBe('create_formula');

      recognizer.removePattern('create_formula', customPattern);

      intent = recognizer.detectIntent('customcalc the total');
      // Should have lower confidence after removal
    });
  });

  describe('getPatterns', () => {
    it('should return patterns for intent type', () => {
      const patterns = recognizer.getPatterns('create_formula');

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown intent type', () => {
      const patterns = recognizer.getPatterns('unknown' as any);

      expect(patterns).toEqual([]);
    });
  });

  describe('confidence scoring', () => {
    it('should normalize confidence to 0-1 range', () => {
      const intents = [
        recognizer.detectIntent('calculate sum average count max min'),
        recognizer.detectIntent('analyze the data'),
        recognizer.detectIntent('simple request'),
      ];

      for (const intent of intents) {
        expect(intent.confidence).toBeGreaterThanOrEqual(0);
        expect(intent.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should give higher confidence for multiple pattern matches', () => {
      const intent1 = recognizer.detectIntent('calculate the sum');
      const intent2 = recognizer.detectIntent('sum');

      // Multiple keywords should increase confidence
      expect(intent1.confidence).toBeGreaterThan(intent2.confidence);
    });
  });
});
