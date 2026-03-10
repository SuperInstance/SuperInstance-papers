/**
 * Tests for FormulaTranslator
 */

import { describe, it, expect } from '@jest/globals';
import { FormulaTranslator } from './FormulaTranslator.js';
import type { LocaleCode } from './types.js';

describe('FormulaTranslator', () => {
  const translator = new FormulaTranslator();

  describe('function name translation', () => {
    it('should translate function names to Spanish', () => {
      expect(translator.translate('SUM', 'es')).toBe('SUMA');
      expect(translator.translate('AVERAGE', 'es')).toBe('PROMEDIO');
      expect(translator.translate('IF', 'es')).toBe('SI');
      expect(translator.translate('VLOOKUP', 'es')).toBe('BUSCARV');
    });

    it('should translate function names to French', () => {
      expect(translator.translate('SUM', 'fr')).toBe('SOMME');
      expect(translator.translate('AVERAGE', 'fr')).toBe('MOYENNE');
      expect(translator.translate('IF', 'fr')).toBe('SI');
      expect(translator.translate('VLOOKUP', 'fr')).toBe('RECHERCHEV');
    });

    it('should translate function names to German', () => {
      expect(translator.translate('SUM', 'de')).toBe('SUMME');
      expect(translator.translate('AVERAGE', 'de')).toBe('MITTELWERT');
      expect(translator.translate('IF', 'de')).toBe('WENN');
      expect(translator.translate('VLOOKUP', 'de')).toBe('SVERWEIS');
    });

    it('should handle unknown functions', () => {
      expect(translator.translate('UNKNOWN', 'es')).toBe('UNKNOWN');
    });

    it('should be case-insensitive', () => {
      expect(translator.translate('sum', 'es')).toBe('SUMA');
      expect(translator.translate('Sum', 'es')).toBe('SUMA');
      expect(translator.translate('SUM', 'es')).toBe('SUMA');
    });
  });

  describe('function name translation to English', () => {
    it('should translate from Spanish to English', () => {
      expect(translator.translateToEnglish('SUMA', 'es')).toBe('SUM');
      expect(translator.translateToEnglish('PROMEDIO', 'es')).toBe('AVERAGE');
      expect(translator.translateToEnglish('SI', 'es')).toBe('IF');
    });

    it('should translate from French to English', () => {
      expect(translator.translateToEnglish('SOMME', 'fr')).toBe('SUM');
      expect(translator.translateToEnglish('MOYENNE', 'fr')).toBe('AVERAGE');
    });

    it('should handle unknown local names', () => {
      expect(translator.translateToEnglish('UNKNOWN', 'es')).toBe('UNKNOWN');
    });
  });

  describe('formula translation', () => {
    it('should translate simple formulas to Spanish', () => {
      expect(translator.translateFormula('=SUM(A1,B1)', 'es')).toBe(
        '=SUMA(A1;B1)'
      );
      expect(translator.translateFormula('=AVERAGE(A1:A10)', 'es')).toBe(
        '=PROMEDIO(A1:A10)'
      );
    });

    it('should translate formulas with nested functions', () => {
      expect(
        translator.translateFormula('=SUM(A1,IF(B1>0,C1,D1))', 'es')
      ).toBe('=SUMA(A1;SI(B1>0;C1;D1))');
    });

    it('should translate to French', () => {
      expect(translator.translateFormula('=SUM(A1,B1)', 'fr')).toBe(
        '=SOMME(A1;B1)'
      );
      expect(translator.translateFormula('=IF(A1>0,"Yes","No")', 'fr')).toBe(
        '=SI(A1>0;"Yes";"No")'
      );
    });

    it('should translate to German', () => {
      expect(translator.translateFormula('=SUM(A1,B1)', 'de')).toBe(
        '=SUMME(A1;B1)'
      );
      expect(translator.translateFormula('=IF(A1>0,"Yes","No")', 'de')).toBe(
        '=WENN(A1>0;"Yes";"No")'
      );
    });

    it('should preserve leading equals sign', () => {
      expect(translator.translateFormula('SUM(A1,B1)', 'es')).toBe(
        'SUMA(A1;B1)'
      );
      expect(translator.translateFormula('=SUM(A1,B1)', 'es')).toBe(
        '=SUMA(A1;B1)'
      );
    });

    it('should handle formulas without functions', () => {
      expect(translator.translateFormula('=A1+B1', 'es')).toBe('=A1+B1');
      expect(translator.translateFormula('=A1*B1+C1', 'es')).toBe('=A1*B1+C1');
    });
  });

  describe('formula translation to English', () => {
    it('should translate from Spanish to English', () => {
      expect(translator.translateFormulaToEnglish('=SUMA(A1;B1)', 'es')).toBe(
        '=SUM(A1,B1)'
      );
      expect(
        translator.translateFormulaToEnglish(
          '=SI(A1>0; "Sí"; "No")',
          'es'
        )
      ).toBe('=IF(A1>0, "Sí"; "No")');
    });

    it('should translate from French to English', () => {
      expect(translator.translateFormulaToEnglish('=SOMME(A1;B1)', 'fr')).toBe(
        '=SUM(A1,B1)'
      );
    });
  });

  describe('argument separators', () => {
    it('should get correct separator for locale', () => {
      expect(translator.getArgumentSeparator('en')).toBe(',');
      expect(translator.getArgumentSeparator('es')).toBe(';');
      expect(translator.getArgumentSeparator('fr')).toBe(';');
      expect(translator.getArgumentSeparator('de')).toBe(';');
      expect(translator.getArgumentSeparator('ja')).toBe(',');
    });
  });

  describe('function validation', () => {
    it('should validate English functions', () => {
      expect(translator.isValidFunction('SUM', 'en')).toBe(true);
      expect(translator.isValidFunction('AVERAGE', 'en')).toBe(true);
      expect(translator.isValidFunction('UNKNOWN', 'en')).toBe(false);
    });

    it('should validate localized functions', () => {
      expect(translator.isValidFunction('SUMA', 'es')).toBe(true);
      expect(translator.isValidFunction('PROMEDIO', 'es')).toBe(true);
      expect(translator.isValidFunction('SOMME', 'fr')).toBe(true);
      expect(translator.isValidFunction('SUMME', 'de')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(translator.isValidFunction('sum', 'en')).toBe(true);
      expect(translator.isValidFunction('suma', 'es')).toBe(true);
    });
  });

  describe('function suggestions', () => {
    it('should suggest English functions', () => {
      const suggestions = translator.suggestFunctions('S', 'en');
      expect(suggestions).toContain('SUM');
      expect(suggestions).toContain('STDEV');
      expect(suggestions).toContain('SUBSTITUTE');
    });

    it('should suggest localized functions', () => {
      const suggestions = translator.suggestFunctions('S', 'es');
      expect(suggestions).toContain('SUMA');
      expect(suggestions).toContain('STDEV');
    });

    it('should return empty array for no matches', () => {
      const suggestions = translator.suggestFunctions('XYZ', 'en');
      expect(suggestions).toEqual([]);
    });
  });

  describe('function extraction', () => {
    it('should extract function names from formula', () => {
      const functions = translator.extractFunctions('=SUM(A1,IF(B1,AVERAGE(C1,D1),E1))');
      expect(functions).toContain('SUM');
      expect(functions).toContain('IF');
      expect(functions).toContain('AVERAGE');
    });

    it('should handle duplicate functions', () => {
      const functions = translator.extractFunctions('=SUM(A1,SUM(B1,C1))');
      expect(functions).toEqual(['SUM']);
    });

    it('should handle formulas without functions', () => {
      const functions = translator.extractFunctions('=A1+B1*C1');
      expect(functions).toEqual([]);
    });
  });

  describe('complexity scoring', () => {
    it('should score simple formulas', () => {
      expect(translator.getComplexityScore('=SUM(A1,B1)')).toBeGreaterThan(0);
      expect(translator.getComplexityScore('=A1+B1')).toBeGreaterThan(0);
    });

    it('should score complex formulas higher', () => {
      const simple = translator.getComplexityScore('=SUM(A1,B1)');
      const complex = translator.getComplexityScore(
        '=SUM(A1,IF(B1>0,AVERAGE(C1,D1),E1))'
      );
      expect(complex).toBeGreaterThan(simple);
    });

    it('should count nested functions', () => {
      const oneLevel = translator.getComplexityScore('=SUM(A1,B1)');
      const twoLevels = translator.getComplexityScore(
        '=SUM(A1,AVERAGE(B1,C1))'
      );
      const threeLevels = translator.getComplexityScore(
        '=SUM(A1,AVERAGE(B1,IF(C1>0,D1,E1)))'
      );

      expect(threeLevels).toBeGreaterThan(twoLevels);
      expect(twoLevels).toBeGreaterThan(oneLevel);
    });
  });

  describe('syntax validation', () => {
    it('should validate correct syntax', () => {
      expect(translator.validateSyntax('=SUM(A1,B1)')).toBe(true);
      expect(translator.validateSyntax('=A1+B1')).toBe(true);
      expect(translator.validateSyntax('=IF(A1>0,"Yes","No")')).toBe(true);
    });

    it('should detect unbalanced parentheses', () => {
      expect(translator.validateSyntax('=SUM(A1,B1')).toBe(false);
      expect(translator.validateSyntax('=SUM(A1,B1))')).toBe(false);
    });

    it('should detect invalid characters', () => {
      expect(translator.validateSyntax('=SUM(A1,B1)#')).toBe(false);
    });
  });

  describe('get all functions', () => {
    it('should return empty object for English', () => {
      const functions = translator.getFunctions('en');
      expect(functions).toEqual({});
    });

    it('should return translations for Spanish', () => {
      const functions = translator.getFunctions('es');
      expect(functions).toHaveProperty('SUM');
      expect(functions.SUM).toBe('SUMA');
      expect(functions).toHaveProperty('AVERAGE');
      expect(functions.AVERAGE).toBe('PROMEDIO');
    });

    it('should return translations for French', () => {
      const functions = translator.getFunctions('fr');
      expect(functions).toHaveProperty('SUM');
      expect(functions.SUM).toBe('SOMME');
    });
  });
});
