/**
 * Pluralizer - Handle pluralization according to CLDR rules
 *
 * Implements CLDR (Unicode Common Locale Data Repository) plural rules
 * for all supported languages.
 *
 * Handles:
 * - Zero, one, two, few, many, other forms
 * - Language-specific rules
 * - Context-aware plurals (cardinal vs ordinal)
 * - Number-aware plurals
 *
 * @module spreadsheet/i18n
 */

import type {
  LocaleCode,
  PluralForm,
} from './types.js';

/**
 * Plural rule function type
 */
type PluralRule = (count: number) => PluralForm;

/**
 * CLDR plural rules for each locale
 */
const PLURAL_RULES: Record<LocaleCode, PluralRule> = {
  // English: 1 = one, everything else = other
  en: (count: number): PluralForm => {
    if (count === 1) {
      return 'one';
    }
    return 'other';
  },

  // Spanish: 1 = one, everything else = other
  es: (count: number): PluralForm => {
    if (count === 1) {
      return 'one';
    }
    return 'other';
  },

  // French: 0-1 = one, everything else = other
  fr: (count: number): PluralForm => {
    if (count >= 0 && count < 2) {
      return 'one';
    }
    return 'other';
  },

  // German: 1 = one, everything else = other
  de: (count: number): PluralForm => {
    if (count === 1) {
      return 'one';
    }
    return 'other';
  },

  // Japanese: Always other
  ja: (count: number): PluralForm => {
    return 'other';
  },

  // Chinese: Always other
  zh: (count: number): PluralForm => {
    return 'other';
  },

  // Arabic: Complex plural rules
  // 0 = zero, 1 = one, 2 = two, 3-10 = few, 11-99 = many, 100+ = other
  ar: (count: number): PluralForm => {
    const n = Math.abs(count);
    if (n === 0) {
      return 'zero';
    }
    if (n === 1) {
      return 'one';
    }
    if (n === 2) {
      return 'two';
    }
    if (n >= 3 && n <= 10) {
      return 'few';
    }
    if (n >= 11 && n <= 99) {
      return 'many';
    }
    return 'other';
  },

  // Portuguese: 0-1 = one, everything else = other (European variant differs)
  pt: (count: number): PluralForm => {
    if (count >= 0 && count < 2) {
      return 'one';
    }
    return 'other';
  },

  // Russian: Complex plural rules
  // Ends in 1 (not 11) = one, ends in 2-4 (not 12-14) = few, other = many
  ru: (count: number): PluralForm => {
    const n = Math.abs(count);
    const n10 = n % 10;
    const n100 = n % 100;

    if (n10 === 1 && n100 !== 11) {
      return 'one';
    }
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) {
      return 'few';
    }
    if (n10 === 0 || (n10 >= 5 && n10 <= 9) || (n100 >= 11 && n100 <= 14)) {
      return 'many';
    }
    return 'other';
  },

  // Italian: 1, 11, 101, etc. = one (ordinal is different)
  it: (count: number): PluralForm => {
    if (count === 1) {
      return 'one';
    }
    return 'other';
  },

  // Korean: Always other
  ko: (count: number): PluralForm => {
    return 'other';
  },

  // Hindi: 0-1 = one, everything else = other
  hi: (count: number): PluralForm => {
    if (count >= 0 && count < 2) {
      return 'one';
    }
    return 'other';
  },
};

/**
 * Available plural forms for each locale
 */
const PLURAL_FORMS: Record<LocaleCode, PluralForm[]> = {
  en: ['one', 'other'],
  es: ['one', 'other'],
  fr: ['one', 'other'],
  de: ['one', 'other'],
  ja: ['other'],
  zh: ['other'],
  ar: ['zero', 'one', 'two', 'few', 'many', 'other'],
  pt: ['one', 'other'],
  ru: ['one', 'few', 'many', 'other'],
  it: ['one', 'other'],
  ko: ['other'],
  hi: ['one', 'other'],
};

/**
 * Pluralizer class
 *
 * @example
 * ```typescript
 * const pluralizer = new Pluralizer();
 *
 * // Get plural form
 * pluralizer.getForm(1, 'en') // 'one'
 * pluralizer.getForm(2, 'en') // 'other'
 * pluralizer.getForm(0, 'ar') // 'zero'
 * pluralizer.getForm(5, 'ar') // 'few'
 *
 * // Check if form is available
 * pluralizer.hasForm('zero', 'ar') // true
 * pluralizer.hasForm('zero', 'en') // false
 *
 * // Get all forms
 * pluralizer.getForms('ar') // ['zero', 'one', 'two', 'few', 'many', 'other']
 * ```
 */
export class Pluralizer {
  /**
   * Get the plural form for a count in a locale
   *
   * @param count - The count to determine plural form for
   * @param locale - Locale code
   * @returns Plural form
   */
  getForm(count: number, locale: LocaleCode): PluralForm {
    const rule = PLURAL_RULES[locale] || PLURAL_RULES.en;
    return rule(count);
  }

  /**
   * Get all available plural forms for a locale
   *
   * @param locale - Locale code
   * @returns Array of plural forms
   */
  getForms(locale: LocaleCode): PluralForm[] {
    return PLURAL_FORMS[locale] || PLURAL_FORMS.en;
  }

  /**
   * Check if a locale has a specific plural form
   *
   * @param form - Plural form to check
   * @param locale - Locale code
   * @returns True if the form is available
   */
  hasForm(form: PluralForm, locale: LocaleCode): boolean {
    const forms = this.getForms(locale);
    return forms.includes(form);
  }

  /**
   * Get a pluralized translation
   *
   * @param translations - Object with plural forms as keys
   * @param count - The count to use for selection
   * @param locale - Locale code
   * @returns Pluralized translation
   *
   * @example
   * ```typescript
   * const translations = {
   *   one: 'You have {{count}} message',
   *   other: 'You have {{count}} messages'
   * };
   * pluralizer.pluralize(translations, 5, 'en') // 'You have 5 messages'
   * ```
   */
  pluralize(
    translations: Partial<Record<PluralForm, string>>,
    count: number,
    locale: LocaleCode
  ): string {
    const form = this.getForm(count, locale);
    const translation = translations[form] || translations.other || '';

    return translation.replace('{{count}}', String(count));
  }

  /**
   * Create a pluralization function for a specific locale
   *
   * @param locale - Locale code
   * @returns Pluralization function
   *
   * @example
   * ```typescript
   * const pluralize = pluralizer.createPluralizer('en');
   * pluralize({ one: 'item', other: 'items' }, 3) // 'items'
   * ```
   */
  createPluralizer(
    locale: LocaleCode
  ): (
    translations: Partial<Record<PluralForm, string>>,
    count: number
  ) => string {
    return (translations: Partial<Record<PluralForm, string>>, count: number) => {
      return this.pluralize(translations, count, locale);
    };
  }

  /**
   * Ordinal plural rules (for 1st, 2nd, 3rd, 4th, etc.)
   *
   * @param count - The count to determine ordinal form for
   * @param locale - Locale code
   * @returns Ordinal form
   *
   * @example
   * ```typescript
   * pluralizer.ordinal(1, 'en') // 'one' (1st)
   * pluralizer.ordinal(2, 'en') // 'two' (2nd)
   * pluralizer.ordinal(3, 'en') // 'few' (3rd)
   * pluralizer.ordinal(4, 'en') // 'other' (4th)
   * ```
   */
  ordinal(count: number, locale: LocaleCode): PluralForm {
    // English ordinal rules
    if (locale === 'en') {
      const n10 = count % 10;
      const n100 = count % 100;

      if (n10 === 1 && n100 !== 11) {
        return 'one';
      }
      if (n10 === 2 && n100 !== 12) {
        return 'two';
      }
      if (n10 === 3 && n100 !== 13) {
        return 'few';
      }
      return 'other';
    }

    // For other languages, fall back to cardinal rules
    return this.getForm(count, locale);
  }

  /**
   * Get ordinal suffix for a number
   *
   * @param count - The count to get suffix for
   * @param locale - Locale code
   * @returns Ordinal suffix
   *
   * @example
   * ```typescript
   * pluralizer.getOrdinalSuffix(1, 'en') // 'st'
   * pluralizer.getOrdinalSuffix(2, 'en') // 'nd'
   * pluralizer.getOrdinalSuffix(3, 'en') // 'rd'
   * pluralizer.getOrdinalSuffix(4, 'en') // 'th'
   * ```
   */
  getOrdinalSuffix(count: number, locale: LocaleCode): string {
    // English ordinal suffixes
    if (locale === 'en') {
      const n10 = count % 10;
      const n100 = count % 100;

      if (n10 === 1 && n100 !== 11) {
        return 'st';
      }
      if (n10 === 2 && n100 !== 12) {
        return 'nd';
      }
      if (n10 === 3 && n100 !== 13) {
        return 'rd';
      }
      return 'th';
    }

    // Spanish ordinal suffixes
    if (locale === 'es') {
      if (count === 1) {
        return 'º';
      }
      return 'º';
    }

    // French ordinal suffixes
    if (locale === 'fr') {
      if (count === 1) {
        return 'er';
      }
      return 'e';
    }

    // German ordinal suffixes
    if (locale === 'de') {
      return '.';
    }

    // Japanese ordinal counter
    if (locale === 'ja') {
      return '番目';
    }

    // Chinese ordinal counter
    if (locale === 'zh') {
      return '第';
    }

    // Default to English
    return this.getOrdinalSuffix(count, 'en');
  }

  /**
   * Format an ordinal number
   *
   * @param count - The count to format
   * @param locale - Locale code
   * @returns Formatted ordinal string
   *
   * @example
   * ```typescript
   * pluralizer.formatOrdinal(1, 'en') // '1st'
   * pluralizer.formatOrdinal(2, 'en') // '2nd'
   * pluralizer.formatOrdinal(3, 'en') // '3rd'
   * pluralizer.formatOrdinal(4, 'en') // '4th'
   * ```
   */
  formatOrdinal(count: number, locale: LocaleCode): string {
    const suffix = this.getOrdinalSuffix(count, locale);

    // In Chinese and Japanese, the counter comes before the number
    if (locale === 'zh') {
      return `${suffix}${count}`;
    }
    if (locale === 'ja') {
      return `${count}${suffix}`;
    }

    return `${count}${suffix}`;
  }

  /**
   * Get plural rule explanation for a locale
   * Useful for documentation and debugging
   *
   * @param locale - Locale code
   * @returns Explanation of plural rules
   */
  getRuleExplanation(locale: LocaleCode): string {
    const explanations: Record<LocaleCode, string> = {
      en: '1 = one, everything else = other',
      es: '1 = one, everything else = other',
      fr: '0-1 = one, everything else = other',
      de: '1 = one, everything else = other',
      ja: 'Always other (no plural distinction)',
      zh: 'Always other (no plural distinction)',
      ar: '0 = zero, 1 = one, 2 = two, 3-10 = few, 11-99 = many, 100+ = other',
      pt: '0-1 = one, everything else = other',
      ru: 'Ends in 1 (not 11) = one, ends in 2-4 (not 12-14) = few, other = many',
      it: '1 = one, everything else = other',
      ko: 'Always other (no plural distinction)',
      hi: '0-1 = one, everything else = other',
    };

    return explanations[locale] || explanations.en;
  }

  /**
   * Test if two counts have the same plural form
   *
   * @param count1 - First count
   * @param count2 - Second count
   * @param locale - Locale code
   * @returns True if both counts have the same form
   *
   * @example
   * ```typescript
   * pluralizer.isSameForm(1, 2, 'en') // false (one vs other)
   * pluralizer.isSameForm(2, 5, 'en') // true (both other)
   * ```
   */
  isSameForm(count1: number, count2: number, locale: LocaleCode): boolean {
    return this.getForm(count1, locale) === this.getForm(count2, locale);
  }

  /**
   * Get all counts that match a specific plural form
   * Useful for testing and documentation
   *
   * @param form - Plural form
   * @param locale - Locale code
   * @param limit - Maximum count to check
   * @returns Array of counts that match the form
   *
   * @example
   * ```typescript
   * pluralizer.getCountsForForm('one', 'en', 10) // [1]
   * pluralizer.getCountsForForm('other', 'en', 10) // [0, 2, 3, 4, 5, 6, 7, 8, 9, 10]
   * pluralizer.getCountsForForm('few', 'ar', 20) // [3, 4, 5, 6, 7, 8, 9, 10]
   * ```
   */
  getCountsForForm(form: PluralForm, locale: LocaleCode, limit: number = 100): number[] {
    const counts: number[] = [];

    for (let i = 0; i <= limit; i++) {
      if (this.getForm(i, locale) === form) {
        counts.push(i);
      }
    }

    return counts;
  }

  /**
   * Validate plural translation completeness
   *
   * @param translations - Object with plural forms
   * @param locale - Locale code
   * @returns True if all required forms are present
   *
   * @example
   * ```typescript
   * const translations = { one: 'item', other: 'items' };
   * pluralizer.validate(translations, 'en') // true
   *
   * const partial = { one: 'item' };
   * pluralizer.validate(partial, 'en') // false (missing 'other')
   *
   * const arabic = { zero: '٠', one: '١', two: '٢', few: 'بعض', many: 'الكثير', other: 'آخر' };
   * pluralizer.validate(arabic, 'ar') // true
   * ```
   */
  validate(
    translations: Partial<Record<PluralForm, string>>,
    locale: LocaleCode
  ): boolean {
    const requiredForms = this.getForms(locale);

    for (const form of requiredForms) {
      if (!translations[form]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get missing plural forms
   *
   * @param translations - Object with plural forms
   * @param locale - Locale code
   * @returns Array of missing forms
   */
  getMissingForms(
    translations: Partial<Record<PluralForm, string>>,
    locale: LocaleCode
  ): PluralForm[] {
    const requiredForms = this.getForms(locale);
    const missing: PluralForm[] = [];

    for (const form of requiredForms) {
      if (!translations[form]) {
        missing.push(form);
      }
    }

    return missing;
  }
}

/**
 * Export a singleton instance for convenience
 */
export const pluralizer = new Pluralizer();
