/**
 * Tests for ColorContrastChecker
 */

import { describe, it, expect } from 'vitest';
import { ColorContrastChecker } from '../ColorContrastChecker';
import { ColorBlindnessType } from '../types';

describe('ColorContrastChecker', () => {
  let checker: ColorContrastChecker;

  beforeEach(() => {
    checker = new ColorContrastChecker();
  });

  describe('calculateContrastRatio', () => {
    it('should calculate contrast ratio for black and white', () => {
      const ratio = checker.calculateContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('should calculate contrast ratio for gray on white', () => {
      const ratio = checker.calculateContrastRatio('#767676', '#FFFFFF');
      expect(ratio).toBeCloseTo(4.54, 1);
    });

    it('should calculate contrast ratio for white on black', () => {
      const ratio = checker.calculateContrastRatio('#FFFFFF', '#000000');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('should parse hex colors', () => {
      const ratio = checker.calculateContrastRatio('#F00', '#FFF');
      expect(ratio).toBeGreaterThan(3);
    });

    it('should parse rgb colors', () => {
      const ratio = checker.calculateContrastRatio('rgb(255, 0, 0)', 'rgb(255, 255, 255)');
      expect(ratio).toBeGreaterThan(3);
    });

    it('should parse rgba colors', () => {
      const ratio = checker.calculateContrastRatio('rgba(255, 0, 0, 0.5)', 'rgb(255, 255, 255)');
      expect(ratio).toBeGreaterThan(3);
    });

    it('should parse named colors', () => {
      const ratio = checker.calculateContrastRatio('red', 'white');
      expect(ratio).toBeGreaterThan(3);
    });
  });

  describe('passesAA', () => {
    it('should pass AA for normal text with 4.5:1 ratio', () => {
      const passes = checker.passesAA('#000000', '#FFFFFF');
      expect(passes).toBe(true);
    });

    it('should fail AA for normal text below 4.5:1 ratio', () => {
      const passes = checker.passesAA('#767676', '#FFFFFF');
      expect(passes).toBe(false);
    });

    it('should pass AA for large text with 3:1 ratio', () => {
      const passes = checker.passesAA('#595959', '#FFFFFF', true);
      expect(passes).toBe(true);
    });
  });

  describe('passesAAA', () => {
    it('should pass AAA for normal text with 7:1 ratio', () => {
      const passes = checker.passesAAA('#000000', '#FFFFFF');
      expect(passes).toBe(true);
    });

    it('should fail AAA for normal text below 7:1 ratio', () => {
      const passes = checker.passesAAA('#595959', '#FFFFFF');
      expect(passes).toBe(false);
    });

    it('should pass AAA for large text with 4.5:1 ratio', () => {
      const passes = checker.passesAAA('#000000', '#FFFFFF', true);
      expect(passes).toBe(true);
    });
  });

  describe('checkContrast', () => {
    it('should return comprehensive contrast result', () => {
      const result = checker.checkContrast('#000000', '#FFFFFF');

      expect(result.ratio).toBeCloseTo(21, 0);
      expect(result.passesAA).toBe(true);
      expect(result.passesAAA).toBe(true);
      expect(result.passesAALarge).toBe(true);
      expect(result.passesAAALarge).toBe(true);
      expect(result.foreground).toBe('#000000');
      expect(result.background).toBe('#FFFFFF');
    });

    it('should handle large text parameter', () => {
      const result = checker.checkContrast('#767676', '#FFFFFF', true);

      expect(result.passesAALarge).toBe(true);
      expect(result.passesAA).toBe(false);
    });
  });

  describe('parseColor', () => {
    it('should parse short hex color', () => {
      const rgb = checker.parseColor('#F00');
      expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should parse long hex color', () => {
      const rgb = checker.parseColor('#FF0000');
      expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should parse rgb color', () => {
      const rgb = checker.parseColor('rgb(255, 0, 0)');
      expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should parse rgba color', () => {
      const rgb = checker.parseColor('rgba(255, 0, 0, 0.5)');
      expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should parse named colors', () => {
      expect(checker.parseColor('black')).toEqual({ r: 0, g: 0, b: 0 });
      expect(checker.parseColor('white')).toEqual({ r: 255, g: 255, b: 255 });
      expect(checker.parseColor('red')).toEqual({ r: 255, g: 0, b: 0 });
      expect(checker.parseColor('blue')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should throw error for invalid hex', () => {
      expect(() => checker.parseColor('#GGG')).toThrow();
    });

    it('should throw error for invalid rgb', () => {
      expect(() => checker.parseColor('rgb(300, 0, 0)')).toThrow();
    });

    it('should throw error for unknown named color', () => {
      expect(() => checker.parseColor('notacolor')).toThrow();
    });
  });

  describe('simulateColorBlindness', () => {
    it('should simulate protanopia', () => {
      const result = checker.simulateColorBlindness('#FF0000', 'protanopia');
      expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });

    it('should simulate deuteranopia', () => {
      const result = checker.simulateColorBlindness('#00FF00', 'deuteranopia');
      expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });

    it('should simulate tritanopia', () => {
      const result = checker.simulateColorBlindness('#0000FF', 'tritanopia');
      expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });

    it('should simulate achromatopsia', () => {
      const result = checker.simulateColorBlindness('#FF0000', 'achromatopsia');
      const rgb = checker.parseColor(result);
      expect(rgb.r).toBeCloseTo(rgb.g);
      expect(rgb.g).toBeCloseTo(rgb.b);
    });

    it('should simulate protanomaly', () => {
      const result = checker.simulateColorBlindness('#FF0000', 'protanomaly');
      expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });

    it('should simulate deuteranomaly', () => {
      const result = checker.simulateColorBlindness('#00FF00', 'deuteranomaly');
      expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });

    it('should simulate tritanomaly', () => {
      const result = checker.simulateColorBlindness('#0000FF', 'tritanomaly');
      expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });

    it('should simulate achromatomaly', () => {
      const result = checker.simulateColorBlindness('#FF0000', 'achromatomaly');
      expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  describe('suggestAccessibleColor', () => {
    it('should suggest darker color if foreground is lighter', () => {
      const original = '#CCCCCC';
      const background = '#FFFFFF';
      const suggested = checker.suggestAccessibleColor(original, background, 4.5);

      const originalRatio = checker.calculateContrastRatio(original, background);
      const suggestedRatio = checker.calculateContrastRatio(suggested, background);

      expect(suggestedRatio).toBeGreaterThanOrEqual(4.5);
      expect(suggestedRatio).toBeGreaterThan(originalRatio);
    });

    it('should suggest lighter color if foreground is darker', () => {
      const original = '#333333';
      const background = '#000000';
      const suggested = checker.suggestAccessibleColor(original, background, 4.5);

      const originalRatio = checker.calculateContrastRatio(original, background);
      const suggestedRatio = checker.calculateContrastRatio(suggested, background);

      expect(suggestedRatio).toBeGreaterThanOrEqual(4.5);
      expect(suggestedRatio).toBeGreaterThan(originalRatio);
    });

    it('should return color that passes AA', () => {
      const suggested = checker.suggestAccessibleColor('#CCCCCC', '#FFFFFF', 4.5);
      const passes = checker.passesAA(suggested, '#FFFFFF');
      expect(passes).toBe(true);
    });
  });

  describe('checkPaletteAccessibility', () => {
    it('should check multiple colors against background', () => {
      const palette = [
        { color: '#000000', usage: 'Text' },
        { color: '#CCCCCC', usage: 'Secondary text', isLargeText: true },
        { color: '#767676', usage: 'Disabled text' },
      ];

      const results = checker.checkPaletteAccessibility(palette, '#FFFFFF');

      expect(results).toHaveLength(3);
      expect(results[0].accessible).toBe(true);
      expect(results[1].accessible).toBe(true);
      expect(results[2].accessible).toBe(false);
    });

    it('should include contrast results', () => {
      const palette = [
        { color: '#000000', usage: 'Text' },
      ];

      const results = checker.checkPaletteAccessibility(palette, '#FFFFFF');

      expect(results[0].result).toBeDefined();
      expect(results[0].result.ratio).toBeCloseTo(21, 0);
    });
  });
});
