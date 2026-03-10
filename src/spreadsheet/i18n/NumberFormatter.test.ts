/**
 * Tests for NumberFormatter
 */

import { describe, it, expect } from '@jest/globals';
import { NumberFormatter } from './NumberFormatter.js';
import type { LocaleCode } from './types.js';

describe('NumberFormatter', () => {
  const formatter = new NumberFormatter();

  describe('English formatting', () => {
    it('should format basic numbers', () => {
      expect(formatter.format(1234.56, 'en')).toBe('1,234.56');
      expect(formatter.format(0, 'en')).toBe('0');
      expect(formatter.format(-1234.56, 'en')).toBe('-1,234.56');
    });

    it('should format large numbers', () => {
      expect(formatter.format(1000000, 'en')).toBe('1,000,000');
      expect(formatter.format(1234567890.12, 'en')).toBe('1,234,567,890.12');
    });

    it('should format with precision', () => {
      expect(
        formatter.format(1234.5678, 'en', { maximumFractionDigits: 2 })
      ).toBe('1,234.57');

      expect(
        formatter.format(1234.5, 'en', { minimumFractionDigits: 2 })
      ).toBe('1,234.50');
    });

    it('should format currency', () => {
      expect(
        formatter.format(1234.56, 'en', {
          style: 'currency',
          currency: 'USD',
        })
      ).toBe('$1,234.56');

      expect(
        formatter.format(1234.56, 'en', {
          style: 'currency',
          currency: 'EUR',
        })
      ).toBe('€1,234.56');
    });

    it('should format percentages', () => {
      expect(formatter.format(0.1234, 'en', { style: 'percent' })).toBe(
        '12.34%'
      );

      expect(
        formatter.format(0.5, 'en', {
          style: 'percent',
          minimumFractionDigits: 0,
        })
      ).toBe('50%');
    });

    it('should format in compact notation', () => {
      expect(
        formatter.format(1500, 'en', { compactDisplay: 'short' })
      ).toBe('1.5K');

      expect(
        formatter.format(1500000, 'en', { compactDisplay: 'short' })
      ).toBe('1.5M');

      expect(
        formatter.format(1500000000, 'en', { compactDisplay: 'short' })
      ).toBe('1.5B');
    });

    it('should format in scientific notation', () => {
      expect(
        formatter.format(1234567, 'en', { scientificNotation: true })
      ).toBe('1.234567E6');

      expect(
        formatter.format(0.000123, 'en', { scientificNotation: true })
      ).toContain('E');
    });
  });

  describe('German formatting', () => {
    it('should use German number format', () => {
      expect(formatter.format(1234.56, 'de')).toBe('1.234,56');
      expect(formatter.format(1000000, 'de')).toBe('1.000.000');
    });

    it('should format currency', () => {
      expect(
        formatter.format(1234.56, 'de', {
          style: 'currency',
          currency: 'EUR',
        })
      ).toBe('1.234,56 €');
    });
  });

  describe('French formatting', () => {
    it('should use French number format', () => {
      expect(formatter.format(1234.56, 'fr')).toBe('1 234,56');
      expect(formatter.format(1000000, 'fr')).toBe('1 000 000');
    });

    it('should format currency', () => {
      expect(
        formatter.format(1234.56, 'fr', {
          style: 'currency',
          currency: 'EUR',
        })
      ).toBe('1 234,56 €');
    });
  });

  describe('Spanish formatting', () => {
    it('should use Spanish number format', () => {
      expect(formatter.format(1234.56, 'es')).toBe('1.234,56');
      expect(formatter.format(1000000, 'es')).toBe('1.000.000');
    });

    it('should format currency', () => {
      expect(
        formatter.format(1234.56, 'es', {
          style: 'currency',
          currency: 'EUR',
        })
      ).toBe('1.234,56 €');
    });
  });

  describe('Japanese formatting', () => {
    it('should use Japanese number format', () => {
      expect(formatter.format(1234.56, 'ja')).toBe('1,234.56');
    });

    it('should format compact numbers', () => {
      expect(
        formatter.format(10000, 'ja', { compactDisplay: 'short' })
      ).toBe('1万');
    });
  });

  describe('Chinese formatting', () => {
    it('should use Chinese number format', () => {
      expect(formatter.format(1234.56, 'zh')).toBe('1,234.56');
    });

    it('should group by 4 digits', () => {
      expect(formatter.format(10000, 'zh')).toBe('10,000');
    });
  });

  describe('Arabic formatting', () => {
    it('should use Arabic number format', () => {
      expect(formatter.format(1234.56, 'ar')).toBe('١٬٢٣٤٫٥٦');
    });

    it('should format currency', () => {
      expect(
        formatter.format(1234.56, 'ar', {
          style: 'currency',
          currency: 'USD',
        })
      ).toContain('$');
    });
  });

  describe('Indian numbering system', () => {
    it('should group digits correctly', () => {
      expect(formatter.format(100000, 'hi')).toBe('1,00,000');
      expect(formatter.format(10000000, 'hi')).toBe('1,00,00,000');
    });
  });

  describe('parsing', () => {
    it('should parse English numbers', () => {
      expect(formatter.parse('1,234.56', 'en')).toBe(1234.56);
      expect(formatter.parse('-1,234.56', 'en')).toBe(-1234.56);
    });

    it('should parse German numbers', () => {
      expect(formatter.parse('1.234,56', 'de')).toBe(1234.56);
      expect(formatter.parse('-1.234,56', 'de')).toBe(-1234.56);
    });

    it('should parse French numbers', () => {
      expect(formatter.parse('1 234,56', 'fr')).toBe(1234.56);
    });

    it('should parse percentages', () => {
      expect(formatter.parse('50%', 'en')).toBe(50);
    });

    it('should parse currency', () => {
      expect(formatter.parse('$1,234.56', 'en')).toBe(1234.56);
      expect(formatter.parse('1.234,56 €', 'de')).toBe(1234.56);
    });
  });

  describe('special values', () => {
    it('should format Infinity', () => {
      expect(formatter.format(Infinity, 'en')).toBe('Infinity');
      expect(formatter.format(-Infinity, 'en')).toBe('-Infinity');
    });

    it('should format NaN', () => {
      expect(formatter.format(NaN, 'en')).toBe('NaN');
    });

    it('should format very small numbers', () => {
      expect(formatter.format(0.000001, 'en')).toBe('0.000001');
    });

    it('should handle negative zero', () => {
      expect(formatter.format(-0, 'en')).toBe('0');
    });
  });

  describe('unit formatting', () => {
    it('should format with units', () => {
      expect(
        formatter.format(100, 'en', {
          style: 'unit',
          unit: 'kilometer',
        })
      ).toBe('100 kilometer');
    });

    it('should use short unit display', () => {
      expect(
        formatter.format(100, 'en', {
          style: 'unit',
          unit: 'kilometer',
          unitDisplay: 'short',
        })
      ).toBe('100 km');
    });
  });

  describe('significant digits', () => {
    it('should format with significant digits', () => {
      expect(
        formatter.format(123.456, 'en', {
          maximumSignificantDigits: 3,
        })
      ).toBe('123');

      expect(
        formatter.format(0.00123456, 'en', {
          maximumSignificantDigits: 3,
        })
      ).toBe('0.00123');
    });

    it('should format with minimum significant digits', () => {
      expect(
        formatter.format(123, 'en', {
          minimumSignificantDigits: 5,
          maximumSignificantDigits: 5,
        })
      ).toBe('123.00');
    });
  });
});
