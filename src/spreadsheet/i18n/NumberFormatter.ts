/**
 * NumberFormatter - Format numbers according to locale conventions
 *
 * Handles:
 * - Decimal separators (comma vs period)
 * - Thousand separators (comma, period, space, none)
 * - Precision control
 * - Scientific notation
 * - Currency formatting
 * - Percent formatting
 * - Compact notation (1K, 1M, 1B)
 * - Unit formatting
 *
 * @module spreadsheet/i18n
 */

import type {
  LocaleCode,
  NumberFormatOptions,
} from './types.js';

/**
 * Locale-specific number format metadata
 */
interface NumberFormatMetadata {
  decimalSeparator: string;
  thousandsSeparator: string;
  groupingPattern: number[];
  currencySymbolPrefix: boolean;
  currencySpace: boolean;
}

/**
 * Number formatting metadata for common locales
 */
const NUMBER_FORMAT_METADATA: Record<LocaleCode, NumberFormatMetadata> = {
  en: {
    decimalSeparator: '.',
    thousandsSeparator: ',',
    groupingPattern: [3],
    currencySymbolPrefix: true,
    currencySpace: false,
  },
  es: {
    decimalSeparator: ',',
    thousandsSeparator: '.',
    groupingPattern: [3],
    currencySymbolPrefix: false,
    currencySpace: true,
  },
  fr: {
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    groupingPattern: [3],
    currencySymbolPrefix: false,
    currencySpace: false,
  },
  de: {
    decimalSeparator: ',',
    thousandsSeparator: '.',
    groupingPattern: [3],
    currencySymbolPrefix: true,
    currencySpace: false,
  },
  ja: {
    decimalSeparator: '.',
    thousandsSeparator: ',',
    groupingPattern: [3],
    currencySymbolPrefix: true,
    currencySpace: false,
  },
  zh: {
    decimalSeparator: '.',
    thousandsSeparator: ',',
    groupingPattern: [4],
    currencySymbolPrefix: true,
    currencySpace: false,
  },
  ar: {
    decimalSeparator: '٫', // Arabic decimal separator
    thousandsSeparator: '٬', // Arabic thousands separator
    groupingPattern: [3],
    currencySymbolPrefix: true,
    currencySpace: false,
  },
  pt: {
    decimalSeparator: ',',
    thousandsSeparator: '.',
    groupingPattern: [3],
    currencySymbolPrefix: false,
    currencySpace: true,
  },
  ru: {
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    groupingPattern: [3],
    currencySymbolPrefix: true,
    currencySpace: true,
  },
  it: {
    decimalSeparator: ',',
    thousandsSeparator: '.',
    groupingPattern: [3],
    currencySymbolPrefix: true,
    currencySpace: false,
  },
  ko: {
    decimalSeparator: '.',
    thousandsSeparator: ',',
    groupingPattern: [4],
    currencySymbolPrefix: true,
    currencySpace: false,
  },
  hi: {
    decimalSeparator: '.',
    thousandsSeparator: ',',
    groupingPattern: [3, 2], // Indian numbering system: 1,00,000
    currencySymbolPrefix: true,
    currencySpace: false,
  },
};

/**
 * NumberFormatter class
 *
 * @example
 * ```typescript
 * const formatter = new NumberFormatter();
 *
 * // Basic formatting
 * formatter.format(1234.56, 'en') // '1,234.56'
 * formatter.format(1234.56, 'de') // '1.234,56'
 *
 * // Currency formatting
 * formatter.format(1234.56, 'en', {
 *   style: 'currency',
 *   currency: 'USD'
 * }) // '$1,234.56'
 *
 * // Percent formatting
 * formatter.format(0.1234, 'en', {
 *   style: 'percent',
 *   minimumFractionDigits: 2
 * }) // '12.34%'
 *
 * // Scientific notation
 * formatter.format(1234567, 'en', {
 *   scientificNotation: true
 * }) // '1.23E6'
 *
 * // Compact notation
 * formatter.format(1500, 'en', {
 *   compactDisplay: 'short'
 * }) // '1.5K'
 * ```
 */
export class NumberFormatter {
  /**
   * Format a number according to locale conventions
   *
   * @param value - Number to format
   * @param locale - Locale code
   * @param options - Formatting options
   * @returns Formatted number string
   */
  format(value: number, locale: LocaleCode, options: NumberFormatOptions = {}): string {
    // Handle special cases
    if (!Number.isFinite(value)) {
      return this.formatSpecial(value, locale);
    }

    // Apply style-specific transformations
    let workingValue = value;

    if (options.style === 'percent') {
      workingValue = value * 100;
    }

    // Format the number
    let formatted = this.formatNumber(workingValue, locale, options);

    // Add style suffixes/prefixes
    if (options.style === 'percent') {
      const percentSymbol = this.getPercentSymbol(locale);
      formatted = this.addSuffix(formatted, percentSymbol, locale, options);
    } else if (options.style === 'currency' && options.currency) {
      formatted = this.formatCurrency(formatted, options.currency, locale, options);
    } else if (options.style === 'unit' && options.unit) {
      formatted = this.formatUnit(formatted, options.unit, locale, options);
    }

    return formatted;
  }

  /**
   * Parse a formatted number string back to a number
   *
   * @param formatted - Formatted number string
   * @param locale - Locale code
   * @returns Parsed number or NaN if invalid
   *
   * @example
   * ```typescript
   * formatter.parse('1,234.56', 'en') // 1234.56
   * formatter.parse('1.234,56', 'de') // 1234.56
   * ```
   */
  parse(formatted: string, locale: LocaleCode): number {
    const metadata = this.getMetadata(locale);

    // Remove locale-specific formatting
    let cleaned = formatted;

    // Remove thousands separators
    if (metadata.thousandsSeparator) {
      const escapedSeparator = metadata.thousandsSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(escapedSeparator, 'g'), '');
    }

    // Replace decimal separator with period
    if (metadata.decimalSeparator && metadata.decimalSeparator !== '.') {
      const escapedSeparator = metadata.decimalSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(escapedSeparator, 'g'), '.');
    }

    // Remove currency symbols and percent signs
    cleaned = cleaned.replace(/[^\d.\-+eE]/g, '');

    return parseFloat(cleaned);
  }

  /**
   * Format a number with basic locale conventions
   *
   * @param value - Number to format
   * @param locale - Locale code
   * @param options - Formatting options
   * @returns Formatted number string
   */
  private formatNumber(
    value: number,
    locale: LocaleCode,
    options: NumberFormatOptions
  ): string {
    const metadata = this.getMetadata(locale);

    // Handle scientific notation
    if (options.scientificNotation) {
      return this.formatScientific(value, locale, options);
    }

    // Handle compact notation
    if (options.compactDisplay) {
      return this.formatCompact(value, locale, options);
    }

    // Round to appropriate precision
    const rounded = this.round(value, options);

    // Split into integer and decimal parts
    const parts = rounded.toFixed(options.maximumFractionDigits || 3).split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Format integer part with grouping separators
    const formattedInteger = this.formatInteger(
      parseInt(integerPart, 10),
      metadata
    );

    // Combine with decimal part
    if (decimalPart && parseInt(decimalPart, 10) > 0) {
      return `${formattedInteger}${metadata.decimalSeparator}${this.truncateDecimal(decimalPart, options)}`;
    }

    return formattedInteger;
  }

  /**
   * Format integer part with grouping separators
   *
   * @param value - Integer value
   * @param metadata - Locale metadata
   * @returns Formatted integer string
   */
  private formatInteger(value: number, metadata: NumberFormatMetadata): string {
    const absolute = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absolute === 0) {
      return '0';
    }

    // Use Intl for complex grouping patterns
    if (metadata.groupingPattern.length > 1 || metadata.groupingPattern[0] !== 3) {
      return sign + this.formatIntegerCustom(absolute, metadata);
    }

    // Simple grouping (groups of 3)
    const reversed = absolute.toString().split('').reverse().join('');
    const grouped = reversed.match(/.{1,3}/g)!.join(',');
    return sign + grouped.split('').reverse().join('');
  }

  /**
   * Format integer with custom grouping pattern
   *
   * @param value - Integer value
   * @param metadata - Locale metadata
   * @returns Formatted integer string
   */
  private formatIntegerCustom(value: number, metadata: NumberFormatMetadata): string {
    const digits = value.toString().split('').reverse();
    const groups: string[] = [];
    let currentIndex = 0;
    let patternIndex = 0;

    while (currentIndex < digits.length) {
      const groupSize = metadata.groupingPattern[
        Math.min(patternIndex, metadata.groupingPattern.length - 1)
      ];

      const group = digits
        .slice(currentIndex, currentIndex + groupSize)
        .reverse()
        .join('');

      groups.unshift(group);
      currentIndex += groupSize;
      patternIndex++;
    }

    return groups.join(metadata.thousandsSeparator);
  }

  /**
   * Format number in scientific notation
   *
   * @param value - Number to format
   * @param locale - Locale code
   * @param options - Formatting options
   * @returns Formatted number string
   */
  private formatScientific(
    value: number,
    locale: LocaleCode,
    options: NumberFormatOptions
  ): string {
    if (value === 0) {
      return '0';
    }

    const exponent = Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / Math.pow(10, exponent);

    const formattedMantissa = this.formatNumber(mantissa, locale, {
      ...options,
      scientificNotation: false,
    });

    const metadata = this.getMetadata(locale);
    const eSymbol = this.getESymbol(locale);

    return `${formattedMantissa}${eSymbol}${exponent}`;
  }

  /**
   * Format number in compact notation
   *
   * @param value - Number to format
   * @param locale - Locale code
   * @param options - Formatting options
   * @returns Formatted number string
   */
  private formatCompact(
    value: number,
    locale: LocaleCode,
    options: NumberFormatOptions
  ): string {
    const absValue = Math.abs(value);
    const threshold = 1000;
    const compactStyle = options.compactDisplay || 'short';

    if (absValue < threshold) {
      return this.formatNumber(value, locale, { ...options, compactDisplay: undefined });
    }

    const compactUnits = this.getCompactUnits(locale, compactStyle);
    const exponent = Math.floor(Math.log10(absValue) / 3);
    const divisor = Math.pow(1000, exponent);
    const compactValue = value / divisor;

    const formattedValue = this.formatNumber(compactValue, locale, {
      ...options,
      compactDisplay: undefined,
      maximumFractionDigits: exponent > 0 ? 1 : 0,
    });

    const unit = compactUnits[exponent - 1] || '';

    return `${formattedValue}${unit}`;
  }

  /**
   * Format currency
   *
   * @param formattedNumber - Formatted number string
   * @param currency - Currency code
   * @param locale - Locale code
   * @param options - Formatting options
   * @returns Formatted currency string
   */
  private formatCurrency(
    formattedNumber: string,
    currency: string,
    locale: LocaleCode,
    options: NumberFormatOptions
  ): string {
    const metadata = this.getMetadata(locale);
    const symbol = this.getCurrencySymbol(currency, options.currencyDisplay);

    if (metadata.currencySymbolPrefix) {
      if (metadata.currencySpace) {
        return `${symbol} ${formattedNumber}`;
      }
      return `${symbol}${formattedNumber}`;
    } else {
      if (metadata.currencySpace) {
        return `${formattedNumber} ${symbol}`;
      }
      return `${formattedNumber}${symbol}`;
    }
  }

  /**
   * Format unit
   *
   * @param formattedNumber - Formatted number string
   * @param unit - Unit code
   * @param locale - Locale code
   * @param options - Formatting options
   * @returns Formatted unit string
   */
  private formatUnit(
    formattedNumber: string,
    unit: string,
    locale: LocaleCode,
    options: NumberFormatOptions
  ): string {
    const unitDisplay = this.getUnitDisplay(unit, locale, options.unitDisplay);

    // In RTL languages, the unit comes before the number
    if (locale === 'ar') {
      return `${unitDisplay} ${formattedNumber}`;
    }

    return `${formattedNumber} ${unitDisplay}`;
  }

  /**
   * Get compact notation units for a locale
   *
   * @param locale - Locale code
   * @param style - Compact style (short or long)
   * @returns Array of compact units
   */
  private getCompactUnits(locale: LocaleCode, style: 'short' | 'long'): string[] {
    const units: Record<LocaleCode, { short: string[]; long: string[] }> = {
      en: {
        short: ['K', 'M', 'B', 'T'],
        long: [' thousand', ' million', ' billion', ' trillion'],
      },
      es: {
        short: ['k', 'M', 'B', 'T'],
        long: [' mil', ' millones', ' mil millones', ' billones'],
      },
      fr: {
        short: ['k', 'M', 'Md', 'Bn'],
        long: [' mille', ' millions', ' milliards', ' billions'],
      },
      de: {
        short: ['Tsd.', 'Mio.', 'Mrd.', 'Bio.'],
        long: [' Tausend', ' Millionen', ' Milliarden', ' Billionen'],
      },
      ja: {
        short: ['万', '億', '兆', '京'],
        long: ['万', '億', '兆', '京'],
      },
      zh: {
        short: ['万', '亿', '万亿'],
        long: ['万', '亿', '万亿'],
      },
      ar: {
        short: ['ألف', 'مليون', 'مليار', 'تريليون'],
        long: [' ألف', ' مليون', ' مليار', ' تريليون'],
      },
      pt: {
        short: ['k', 'M', 'B', 'T'],
        long: [' mil', ' milhões', ' bilhões', ' trilhões'],
      },
      ru: {
        short: ['тыс.', 'млн', 'млрд', 'трлн'],
        long: [' тысяча', ' миллион', ' миллиард', ' триллион'],
      },
      it: {
        short: ['mila', 'Mln', 'Mrd', 'Bln'],
        long: [' mila', ' milioni', ' miliardi', ' bilioni'],
      },
      ko: {
        short: ['천', '만', '억', '조'],
        long: ['천', '만', '억', '조'],
      },
      hi: {
        short: ['K', 'M', 'B', 'T'],
        long: [' हजार', ' मिलियन', ' अरब', ' खरब'],
      },
    };

    return units[locale]?.[style] || units.en[style];
  }

  /**
   * Get currency symbol
   *
   * @param currency - Currency code
   * @param display - Display style
   * @returns Currency symbol or code
   */
  private getCurrencySymbol(
    currency: string,
    display?: 'symbol' | 'narrowSymbol' | 'code' | 'name'
  ): string {
    if (display === 'code') {
      return currency;
    }

    const symbols: Record<string, { symbol: string; narrowSymbol: string; name: string }> = {
      USD: { symbol: '$', narrowSymbol: '$', name: 'US dollar' },
      EUR: { symbol: '€', narrowSymbol: '€', name: 'euro' },
      GBP: { symbol: '£', narrowSymbol: '£', name: 'British pound' },
      JPY: { symbol: '¥', narrowSymbol: '¥', name: 'Japanese yen' },
      CNY: { symbol: '¥', narrowSymbol: '¥', name: 'Chinese yuan' },
      INR: { symbol: '₹', narrowSymbol: '₹', name: 'Indian rupee' },
      KRW: { symbol: '₩', narrowSymbol: '₩', name: 'South Korean won' },
      BRL: { symbol: 'R$', narrowSymbol: 'R$', name: 'Brazilian real' },
      RUB: { symbol: '₽', narrowSymbol: '₽', name: 'Russian ruble' },
    };

    const currencyData = symbols[currency];
    if (!currencyData) {
      return currency;
    }

    if (display === 'name') {
      return currencyData.name;
    }

    return display === 'narrowSymbol' ? currencyData.narrowSymbol : currencyData.symbol;
  }

  /**
   * Get unit display string
   *
   * @param unit - Unit code
   * @param locale - Locale code
   * @param display - Display style
   * @returns Localized unit string
   */
  private getUnitDisplay(
    unit: string,
    locale: LocaleCode,
    display?: 'long' | 'short' | 'narrow'
  ): string {
    // This is a simplified implementation
    // In a real system, you would use ICU unit formatting
    return unit;
  }

  /**
   * Get percent symbol for locale
   *
   * @param locale - Locale code
   * @returns Percent symbol
   */
  private getPercentSymbol(locale: LocaleCode): string {
    // Most languages use '%', but some position it differently
    return '%';
  }

  /**
   * Get "E" symbol for scientific notation
   *
   * @param locale - Locale code
   * @returns E symbol
   */
  private getESymbol(locale: LocaleCode): string {
    if (locale === 'fr') {
      return 'E';
    }
    return 'E';
  }

  /**
   * Round a number to specified precision
   *
   * @param value - Number to round
   * @param options - Formatting options
   * @returns Rounded number
   */
  private round(value: number, options: NumberFormatOptions): number {
    const minFrac = options.minimumFractionDigits ?? 0;
    const maxFrac = options.maximumFractionDigits ?? 3;
    const minSig = options.minimumSignificantDigits;
    const maxSig = options.maximumSignificantDigits;

    if (minSig !== undefined || maxSig !== undefined) {
      // Round to significant digits
      const digits = Math.floor(Math.log10(Math.abs(value))) + 1;
      const precision = maxSig !== undefined ? maxSig - digits : 0;
      const factor = Math.pow(10, precision);
      return Math.round(value * factor) / factor;
    }

    // Round to fractional digits
    const factor = Math.pow(10, maxFrac);
    return Math.round(value * factor) / factor;
  }

  /**
   * Truncate decimal part to remove trailing zeros
   *
   * @param decimal - Decimal part string
   * @param options - Formatting options
   * @returns Truncated decimal string
   */
  private truncateDecimal(decimal: string, options: NumberFormatOptions): string {
    const minFrac = options.minimumFractionDigits ?? 0;

    if (minFrac === 0) {
      // Remove trailing zeros
      return decimal.replace(/0+$/, '');
    }

    return decimal.slice(0, minFrac);
  }

  /**
   * Format special number values (Infinity, NaN)
   *
   * @param value - Special number value
   * @param locale - Locale code
   * @returns Formatted special value string
   */
  private formatSpecial(value: number, locale: LocaleCode): string {
    const specialStrings: Record<LocaleCode, { infinity: string; nan: string }> = {
      en: { infinity: 'Infinity', nan: 'NaN' },
      es: { infinity: 'Infinito', nan: 'NaN' },
      fr: { infinity: 'Infini', nan: 'NaN' },
      de: { infinity: 'Unendlich', nan: 'NaN' },
      ja: { infinity: '無限大', nan: 'NaN' },
      zh: { infinity: '无穷大', nan: 'NaN' },
      ar: { infinity: 'ما لا نهاية', nan: 'ليس رقماً' },
      pt: { infinity: 'Infinito', nan: 'NaN' },
      ru: { infinity: 'Бесконечность', nan: 'NaN' },
      it: { infinity: 'Infinito', nan: 'NaN' },
      ko: { infinity: '무한대', nan: 'NaN' },
      hi: { infinity: 'अनंत', nan: 'NaN' },
    };

    const strings = specialStrings[locale] || specialStrings.en;

    if (Number.isNaN(value)) {
      return strings.nan;
    }

    if (value === Infinity) {
      return strings.infinity;
    }

    if (value === -Infinity) {
      return `-${strings.infinity}`;
    }

    return String(value);
  }

  /**
   * Add suffix to formatted number
   *
   * @param formatted - Formatted number string
   * @param suffix - Suffix to add
   * @param locale - Locale code
   * @param options - Formatting options
   * @returns Formatted string with suffix
   */
  private addSuffix(
    formatted: string,
    suffix: string,
    locale: LocaleCode,
    options: NumberFormatOptions
  ): string {
    // In RTL languages, the suffix becomes a prefix
    if (locale === 'ar') {
      return `${suffix}${formatted}`;
    }

    return `${formatted}${suffix}`;
  }

  /**
   * Get number format metadata for a locale
   *
   * @param locale - Locale code
   * @returns Number format metadata
   */
  private getMetadata(locale: LocaleCode): NumberFormatMetadata {
    return NUMBER_FORMAT_METADATA[locale] || NUMBER_FORMAT_METADATA.en;
  }
}
