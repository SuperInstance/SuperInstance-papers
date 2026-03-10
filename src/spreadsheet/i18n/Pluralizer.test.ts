/**
 * Tests for Pluralizer
 */

import { describe, it, expect } from '@jest/globals';
import { Pluralizer } from './Pluralizer.js';
import type { LocaleCode, PluralForm } from './types.js';

describe('Pluralizer', () => {
  const pluralizer = new Pluralizer();

  describe('English pluralization', () => {
    it('should use "one" for 1', () => {
      expect(pluralizer.getForm(1, 'en')).toBe('one');
    });

    it('should use "other" for 0', () => {
      expect(pluralizer.getForm(0, 'en')).toBe('other');
    });

    it('should use "other" for 2+', () => {
      expect(pluralizer.getForm(2, 'en')).toBe('other');
      expect(pluralizer.getForm(5, 'en')).toBe('other');
      expect(pluralizer.getForm(100, 'en')).toBe('other');
    });

    it('should have correct forms', () => {
      expect(pluralizer.getForms('en')).toEqual(['one', 'other']);
    });
  });

  describe('Spanish pluralization', () => {
    it('should use "one" for 1', () => {
      expect(pluralizer.getForm(1, 'es')).toBe('one');
    });

    it('should use "other" for other numbers', () => {
      expect(pluralizer.getForm(0, 'es')).toBe('other');
      expect(pluralizer.getForm(2, 'es')).toBe('other');
    });
  });

  describe('French pluralization', () => {
    it('should use "one" for 0-1', () => {
      expect(pluralizer.getForm(0, 'fr')).toBe('one');
      expect(pluralizer.getForm(1, 'fr')).toBe('one');
    });

    it('should use "other" for 2+', () => {
      expect(pluralizer.getForm(2, 'fr')).toBe('other');
      expect(pluralizer.getForm(10, 'fr')).toBe('other');
    });
  });

  describe('Japanese pluralization', () => {
    it('should always use "other"', () => {
      expect(pluralizer.getForm(0, 'ja')).toBe('other');
      expect(pluralizer.getForm(1, 'ja')).toBe('other');
      expect(pluralizer.getForm(100, 'ja')).toBe('other');
    });

    it('should only have "other" form', () => {
      expect(pluralizer.getForms('ja')).toEqual(['other']);
    });
  });

  describe('Chinese pluralization', () => {
    it('should always use "other"', () => {
      expect(pluralizer.getForm(0, 'zh')).toBe('other');
      expect(pluralizer.getForm(1, 'zh')).toBe('other');
      expect(pluralizer.getForm(100, 'zh')).toBe('other');
    });
  });

  describe('Arabic pluralization', () => {
    it('should use "zero" for 0', () => {
      expect(pluralizer.getForm(0, 'ar')).toBe('zero');
    });

    it('should use "one" for 1', () => {
      expect(pluralizer.getForm(1, 'ar')).toBe('one');
    });

    it('should use "two" for 2', () => {
      expect(pluralizer.getForm(2, 'ar')).toBe('two');
    });

    it('should use "few" for 3-10', () => {
      expect(pluralizer.getForm(3, 'ar')).toBe('few');
      expect(pluralizer.getForm(7, 'ar')).toBe('few');
      expect(pluralizer.getForm(10, 'ar')).toBe('few');
    });

    it('should use "many" for 11-99', () => {
      expect(pluralizer.getForm(11, 'ar')).toBe('many');
      expect(pluralizer.getForm(50, 'ar')).toBe('many');
      expect(pluralizer.getForm(99, 'ar')).toBe('many');
    });

    it('should use "other" for 100+', () => {
      expect(pluralizer.getForm(100, 'ar')).toBe('other');
      expect(pluralizer.getForm(1000, 'ar')).toBe('other');
    });

    it('should have all forms', () => {
      expect(pluralizer.getForms('ar')).toEqual([
        'zero',
        'one',
        'two',
        'few',
        'many',
        'other',
      ]);
    });
  });

  describe('Russian pluralization', () => {
    it('should use "one" for numbers ending in 1 (not 11)', () => {
      expect(pluralizer.getForm(1, 'ru')).toBe('one');
      expect(pluralizer.getForm(21, 'ru')).toBe('one');
      expect(pluralizer.getForm(101, 'ru')).toBe('one');
    });

    it('should use "few" for numbers ending in 2-4 (not 12-14)', () => {
      expect(pluralizer.getForm(2, 'ru')).toBe('few');
      expect(pluralizer.getForm(3, 'ru')).toBe('few');
      expect(pluralizer.getForm(4, 'ru')).toBe('few');
      expect(pluralizer.getForm(22, 'ru')).toBe('few');
      expect(pluralizer.getForm(23, 'ru')).toBe('few');
    });

    it('should use "many" for numbers ending in 0, 5-9, 11-14', () => {
      expect(pluralizer.getForm(0, 'ru')).toBe('many');
      expect(pluralizer.getForm(5, 'ru')).toBe('many');
      expect(pluralizer.getForm(10, 'ru')).toBe('many');
      expect(pluralizer.getForm(11, 'ru')).toBe('many');
      expect(pluralizer.getForm(12, 'ru')).toBe('many');
      expect(pluralizer.getForm(14, 'ru')).toBe('many');
      expect(pluralizer.getForm(15, 'ru')).toBe('many');
    });
  });

  describe('pluralize method', () => {
    it('should return correct pluralization', () => {
      const translations = {
        one: '{{count}} item',
        other: '{{count}} items',
      };

      expect(pluralizer.pluralize(translations, 1, 'en')).toBe('1 item');
      expect(pluralizer.pluralize(translations, 5, 'en')).toBe('5 items');
    });

    it('should handle missing forms', () => {
      const translations = {
        other: '{{count}} items',
      };

      expect(pluralizer.pluralize(translations, 1, 'en')).toBe('1 items');
    });
  });

  describe('ordinal numbers', () => {
    it('should format English ordinals', () => {
      expect(pluralizer.formatOrdinal(1, 'en')).toBe('1st');
      expect(pluralizer.formatOrdinal(2, 'en')).toBe('2nd');
      expect(pluralizer.formatOrdinal(3, 'en')).toBe('3rd');
      expect(pluralizer.formatOrdinal(4, 'en')).toBe('4th');
      expect(pluralizer.formatOrdinal(11, 'en')).toBe('11th');
      expect(pluralizer.formatOrdinal(12, 'en')).toBe('12th');
      expect(pluralizer.formatOrdinal(13, 'en')).toBe('13th');
      expect(pluralizer.formatOrdinal(21, 'en')).toBe('21st');
      expect(pluralizer.formatOrdinal(22, 'en')).toBe('22nd');
      expect(pluralizer.formatOrdinal(23, 'en')).toBe('23rd');
      expect(pluralizer.formatOrdinal(24, 'en')).toBe('24th');
    });

    it('should format French ordinals', () => {
      expect(pluralizer.formatOrdinal(1, 'fr')).toBe('1er');
      expect(pluralizer.formatOrdinal(2, 'fr')).toBe('2e');
      expect(pluralizer.formatOrdinal(3, 'fr')).toBe('3e');
    });
  });

  describe('validation', () => {
    it('should validate complete translations', () => {
      const enTranslations = {
        one: 'item',
        other: 'items',
      };

      expect(pluralizer.validate(enTranslations, 'en')).toBe(true);
    });

    it('should fail incomplete translations', () => {
      const partialTranslations = {
        one: 'item',
      };

      expect(pluralizer.validate(partialTranslations, 'en')).toBe(false);
    });

    it('should validate Arabic translations', () => {
      const arTranslations = {
        zero: '٠',
        one: '١',
        two: '٢',
        few: 'بعض',
        many: 'الكثير',
        other: 'آخر',
      };

      expect(pluralizer.validate(arTranslations, 'ar')).toBe(true);
    });

    it('should return missing forms', () => {
      const partialTranslations = {
        one: 'item',
      };

      const missing = pluralizer.getMissingForms(partialTranslations, 'en');
      expect(missing).toEqual(['other']);
    });
  });

  describe('createPluralizer', () => {
    it('should create locale-specific pluralizer', () => {
      const pluralizeEn = pluralizer.createPluralizer('en');

      const translations = {
        one: '{{count}} item',
        other: '{{count}} items',
      };

      expect(pluralizeEn(translations, 1)).toBe('1 item');
      expect(pluralizeEn(translations, 5)).toBe('5 items');
    });
  });

  describe('isSameForm', () => {
    it('should compare plural forms', () => {
      expect(pluralizer.isSameForm(1, 2, 'en')).toBe(false);
      expect(pluralizer.isSameForm(2, 5, 'en')).toBe(true);
    });
  });

  describe('getCountsForForm', () => {
    it('should return counts for a form', () => {
      const ones = pluralizer.getCountsForForm('one', 'en', 10);
      expect(ones).toEqual([1]);

      const others = pluralizer.getCountsForForm('other', 'en', 10);
      expect(others).toContain(0);
      expect(others).toContain(2);
      expect(others).toContain(10);
    });

    it('should return counts for Arabic forms', () => {
      const zeros = pluralizer.getCountsForForm('zero', 'ar', 10);
      expect(zeros).toEqual([0]);

      const fews = pluralizer.getCountsForForm('few', 'ar', 20);
      expect(fews).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });
});
