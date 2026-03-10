/**
 * Types for the POLLN Spreadsheet Internationalization System
 *
 * Provides comprehensive type definitions for i18n, including:
 * - Translation files structure
 * - Format options for numbers, dates, currency
 * - Plural rules and forms
 * - RTL (Right-to-Left) language support
 * - Formula localization
 */

/**
 * Supported locale codes following BCP 47 standard
 */
export type LocaleCode =
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'ja' // Japanese
  | 'zh' // Chinese
  | 'ar' // Arabic
  | 'pt' // Portuguese
  | 'ru' // Russian
  | 'it' // Italian
  | 'ko' // Korean
  | 'hi'; // Hindi

/**
 * Text direction for layout support
 */
export type TextDirection = 'ltr' | 'rtl';

/**
 * CLDR plural forms as defined by Unicode
 * See: http://cldr.unicode.org/index/cldr-spec/plural-rules
 */
export type PluralForm =
  | 'zero' // For languages that have a special form for 0 (e.g., Arabic: "٠ كتاب")
  | 'one' // Singular form (e.g., English: "1 book")
  | 'two' // Dual form (e.g., Arabic: "٢ كتابان")
  | 'few' // Few form (e.g., Arabic: "٣ كتب")
  | 'many' // Many form (e.g., Arabic: "١١ كتابًا")
  | 'other'; // Default plural form (e.g., English: "2 books", "0 books")

/**
 * Calendar systems supported for date formatting
 */
export type CalendarSystem =
  | 'gregorian' // Standard Gregorian calendar
  | 'buddhist' // Buddhist calendar (used in Thailand)
  | 'islamic' // Islamic/Hijri calendar
  | 'japanese' // Japanese calendar with era names
  | 'chinese' // Chinese calendar
  | 'hebrew'; // Hebrew calendar

/**
 * Number formatting options
 */
export interface NumberFormatOptions {
  /**
   * Minimum number of decimal places
   * @default 0
   */
  minimumFractionDigits?: number;

  /**
   * Maximum number of decimal places
   * @default 3
   */
  maximumFractionDigits?: number;

  /**
   * Minimum number of significant digits
   */
  minimumSignificantDigits?: number;

  /**
   * Maximum number of significant digits
   */
  maximumSignificantDigits?: number;

  /**
   * Whether to use grouping separators (e.g., 1,000)
   * @default true
   */
  useGrouping?: boolean;

  /**
   * Display style for numbers
   */
  style?: 'decimal' | 'currency' | 'percent' | 'unit';

  /**
   * Currency code (when style is 'currency')
   * @example 'USD', 'EUR', 'JPY'
   */
  currency?: string;

  /**
   * How to display the currency symbol
   */
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';

  /**
   * Whether to use scientific notation for large/small numbers
   * @default false
   */
  scientificNotation?: boolean;

  /**
   * Compact display style for large numbers
   */
  compactDisplay?: 'short' | 'long';

  /**
   * Unit to display (when style is 'unit')
   * @example 'kilometer', 'inch', 'celsius'
   */
  unit?: string;

  /**
   * How to display the unit
   */
  unitDisplay?: 'long' | 'short' | 'narrow';
}

/**
 * Date formatting options
 */
export interface DateFormatOptions {
  /**
   * Calendar system to use
   * @default 'gregorian'
   */
  calendar?: CalendarSystem;

  /**
   * Time zone for date formatting
   * @example 'UTC', 'America/New_York', 'Asia/Tokyo'
   */
  timeZone?: string;

  /**
   * Hour cycle (12 or 24 hour)
   */
  hourCycle?: 'h11' | 'h12' | 'h23' | 'h24';

  /**
   * Format of the date
   */
  format?: 'full' | 'long' | 'medium' | 'short' | 'custom';

  /**
   * Custom format pattern (when format is 'custom')
   * Uses LDML date format pattern
   * @example 'yyyy-MM-dd', 'MM/dd/yyyy'
   */
  pattern?: string;

  /**
   * Which components to include
   */
  dateStyle?: 'full' | 'long' | 'medium' | 'short';

  /**
   * Time style
   */
  timeStyle?: 'full' | 'long' | 'medium' | 'short';

  /**
   * Include era (AD/BC, CE/BCE, etc.)
   */
  includeEra?: boolean;

  /**
   * Include weekday name
   */
  includeWeekday?: boolean;

  /**
   * Include year
   */
  includeYear?: boolean;

  /**
   * Include month
   */
  includeMonth?: boolean;

  /**
   * Include day
   */
  includeDay?: boolean;

  /**
   * Include hours
   */
  includeHours?: boolean;

  /**
   * Include minutes
   */
  includeMinutes?: boolean;

  /**
   * Include seconds
   */
  includeSeconds?: boolean;

  /**
   * Include time zone name
   */
  includeTimeZone?: boolean;
}

/**
 * Relative time formatting options
 */
export interface RelativeTimeFormatOptions {
  /**
   * Numeric or text format
   */
  numeric?: 'always' | 'auto';

  /**
   * Style of the output
   */
  style?: 'long' | 'short' | 'narrow';
}

/**
 * Locale-specific format configurations
 */
export interface LocaleFormats {
  /**
   * Default number format for this locale
   */
  number?: NumberFormatOptions;

  /**
   * Default currency format
   */
  currency?: NumberFormatOptions;

  /**
   * Default percent format
   */
  percent?: NumberFormatOptions;

  /**
   * Default date format
   */
  date?: DateFormatOptions;

  /**
   * Default time format
   */
  time?: DateFormatOptions;

  /**
   * Default datetime format
   */
  datetime?: DateFormatOptions;

  /**
   * Decimal separator character
   * @default '.'
   * @example ',' for many European locales
   */
  decimalSeparator?: string;

  /**
   * Thousands separator character
   * @default ','
   * @example '.' for many European locales, ' ' for French
   */
  thousandsSeparator?: string;

  /**
   * List separator character
   * @default ','
   * @example ';' for German
   */
  listSeparator?: string;

  /**
   * Text direction for layout
   */
  direction?: TextDirection;

  /**
   * First day of week (0 = Sunday, 1 = Monday, etc.)
   */
  firstDayOfWeek?: number;

  /**
   * Weekend days (array of day indices)
   */
  weekendDays?: number[];

  /**
   * Calendar system
   */
  calendar?: CalendarSystem;
}

/**
 * Translation message with optional plural forms
 */
export type TranslationMessage =
  | string // Simple string translation
  | Record<PluralForm, string> // Pluralized translation
  | {
      message: string;
      context?: string;
      plural?: Record<PluralForm, string>;
      description?: string;
    };

/**
 * Formula translation mapping
 */
export interface FormulaTranslation {
  /**
   * Native formula name (English)
   */
  name: string;

  /**
   * Localized formula name
   */
  localName: string;

  /**
   * Localized syntax description
   */
  syntax?: string;

  /**
   * Localized description
   */
  description?: string;

  /**
   * Localized parameter names
   */
  parameters?: Record<string, string>;

  /**
   * Example usage with translated formula
   */
  examples?: string[];
}

/**
 * Spreadsheet-specific translations
 */
export interface SpreadsheetTranslations {
  /**
   * UI labels and messages
   */
  ui: Record<string, TranslationMessage>;

  /**
   * Formula translations
   */
  formulas?: Record<string, FormulaTranslation>;

  /**
   * Error messages
   */
  errors?: Record<string, TranslationMessage>;

  /**
   * Cell types
   */
  cellTypes?: Record<string, TranslationMessage>;

  /**
   * Chart types and labels
   */
  charts?: Record<string, TranslationMessage>;

  /**
   * Validation messages
   */
  validation?: Record<string, TranslationMessage>;
}

/**
 * Complete translation file structure
 */
export interface TranslationFile {
  /**
   * Locale code (BCP 47)
   */
  locale: LocaleCode;

  /**
   * Language name in native script
   * @example 'English', 'Español', '中文'
   */
  languageName: string;

  /**
   * Language name in English
   * @example 'English', 'Spanish', 'Chinese'
   */
  languageNameEnglish: string;

  /**
   * Text direction for layout
   */
  direction: TextDirection;

  /**
   * Locale-specific formats
   */
  formats?: LocaleFormats;

  /**
   * Plural rules for this locale
   */
  pluralRules?: {
    /**
     * Function to determine plural form for a count
     */
    getForm(count: number): PluralForm;

    /**
     * All plural forms used by this locale
     */
    forms: PluralForm[];
  };

  /**
   * Spreadsheet translations
   */
  messages: SpreadsheetTranslations;

  /**
   * Version of the translation file
   */
  version?: string;

  /**
   * Last update timestamp
   */
  lastUpdated?: string;

  /**
   * Translators and contributors
   */
  translators?: string[];
}

/**
 * Translation key path
 * Supports nested keys using dot notation
 * @example 'ui.common.save', 'errors.invalidValue'
 */
export type TranslationKey = string;

/**
 * Translation parameters for interpolation
 */
export type TranslationParams = Record<string, string | number | boolean>;

/**
 * I18n manager configuration
 */
export interface I18nConfig {
  /**
   * Default locale to use
   * @default 'en'
   */
  defaultLocale?: LocaleCode;

  /**
   * Fallback locale when translation is missing
   * @default 'en'
   */
  fallbackLocale?: LocaleCode;

  /**
   * Supported locales
   */
  supportedLocales?: LocaleCode[];

  /**
   * Enable debug mode for missing translations
   * @default false
   */
  debug?: boolean;

  /**
   * Base URL for loading translation files
   * @default '/locales'
   */
  localesBaseUrl?: string;

  /**
   * Enable hot reload in development
   * @default false
   */
  hotReload?: boolean;

  /**
   * Cache translations in memory
   * @default true
   */
  cache?: boolean;

  /**
   * Detection strategies and their priority
   */
  detection?: {
    /**
     * Check URL query parameter
     * @default 'lang'
     */
    queryParameter?: string;

    /**
     * Check URL path
     * @default '/:locale/*'
     */
    urlPattern?: RegExp;

    /**
     * Check localStorage key
     * @default 'locale'
     */
    storageKey?: string;

    /**
     * Check cookie key
     * @default 'locale'
     */
    cookieKey?: string;

    /**
     * Check browser language
     * @default true
     */
    browser?: boolean;

    /**
     * Check user profile/settings
     */
    userProfile?: (user: unknown) => LocaleCode | null;
  };
}

/**
 * Locale detection result
 */
export interface LocaleDetectionResult {
  /**
   * Detected locale
   */
  locale: LocaleCode;

  /**
   * Detection method used
   */
  method: 'url' | 'query' | 'storage' | 'cookie' | 'browser' | 'userProfile' | 'default';

  /**
   * Confidence score (0-1)
   */
  confidence: number;

  /**
   * User preference (explicit vs detected)
   */
  isExplicitPreference: boolean;
}

/**
 * Translation loading result
 */
export interface TranslationLoadResult {
  /**
   * Locale that was loaded
   */
  locale: LocaleCode;

  /**
   * Whether the load was successful
   */
  success: boolean;

  /**
   * Loaded translations
   */
  translations?: TranslationFile;

  /**
   * Error message if failed
   */
  error?: string;

  /**
   * Whether fallback was used
   */
  usedFallback?: boolean;
}

/**
 * I18n manager events
 */
export interface I18nEvents {
  /**
   * Fired when locale changes
   */
  localeChange: (locale: LocaleCode, previousLocale: LocaleCode) => void;

  /**
   * Fired when translations are loaded
   */
  translationsLoaded: (result: TranslationLoadResult) => void;

  /**
   * Fired when translation fails
   */
  translationError: (error: Error, locale: LocaleCode) => void;

  /**
   * Fired when a translation is missing
   */
  missingTranslation: (key: TranslationKey, locale: LocaleCode) => void;
}
