/**
 * I18nManager - Main internationalization manager for POLLN spreadsheets
 *
 * Provides comprehensive i18n support including:
 * - Translation management with fallback support
 * - Locale detection from multiple sources
 * - Number, date, and currency formatting
 * - RTL language support
 * - Pluralization with CLDR rules
 * - Formula localization
 * - Hot reload for development
 *
 * @module spreadsheet/i18n
 */

import type {
  LocaleCode,
  TranslationKey,
  TranslationParams,
  TranslationFile,
  NumberFormatOptions,
  DateFormatOptions,
  RelativeTimeFormatOptions,
  I18nConfig,
  LocaleDetectionResult,
  TranslationLoadResult,
  I18nEvents,
} from './types.js';
import { LocaleDetector } from './LocaleDetector.js';
import { TranslationLoader } from './TranslationLoader.js';
import { NumberFormatter } from './NumberFormatter.js';
import { DateFormatter } from './DateFormatter.js';
import { Pluralizer } from './Pluralizer.js';
import { FormulaTranslator } from './FormulaTranslator.js';

/**
 * Main i18n manager class
 *
 * @example
 * ```typescript
 * const i18n = new I18nManager();
 * await i18n.init();
 *
 * // Simple translation
 * const title = i18n.t('ui.common.title');
 *
 * // Translation with parameters
 * const message = i18n.t('ui.welcome.user', { name: 'John' });
 *
 * // Change locale
 * await i18n.setLocale('es');
 *
 * // Format number
 * const formatted = i18n.formatNumber(1234.56, { style: 'currency', currency: 'USD' });
 * ```
 */
export class I18nManager {
  private currentLocale: LocaleCode;
  private defaultLocale: LocaleCode;
  private fallbackLocale: LocaleCode;
  private supportedLocales: Set<LocaleCode>;
  private translations: Map<LocaleCode, TranslationFile>;
  private config: Required<I18nConfig>;
  private loader: TranslationLoader;
  private detector: LocaleDetector;
  private numberFormatter: NumberFormatter;
  private dateFormatter: DateFormatter;
  private pluralizer: Pluralizer;
  private formulaTranslator: FormulaTranslator;
  private listeners: Map<keyof I18nEvents, Set<Function>>;
  private initialized: boolean = false;
  private loadingPromise: Map<LocaleCode, Promise<TranslationLoadResult>>;

  /**
   * Create a new I18nManager instance
   *
   * @param config - Configuration options
   */
  constructor(config: I18nConfig = {}) {
    this.config = {
      defaultLocale: config.defaultLocale || 'en',
      fallbackLocale: config.fallbackLocale || 'en',
      supportedLocales: config.supportedLocales || this.getDefaultSupportedLocales(),
      debug: config.debug ?? false,
      localesBaseUrl: config.localesBaseUrl || '/locales',
      hotReload: config.hotReload ?? false,
      cache: config.cache ?? true,
      detection: config.detection || {},
    };

    this.defaultLocale = this.config.defaultLocale;
    this.fallbackLocale = this.config.fallbackLocale;
    this.supportedLocales = new Set(this.config.supportedLocales);
    this.currentLocale = this.defaultLocale;
    this.translations = new Map();
    this.listeners = new Map();
    this.loadingPromise = new Map();

    // Initialize components
    this.loader = new TranslationLoader({
      baseUrl: this.config.localesBaseUrl,
      cache: this.config.cache,
      hotReload: this.config.hotReload,
    });

    this.detector = new LocaleDetector({
      supportedLocales: Array.from(this.supportedLocales),
      fallbackLocale: this.fallbackLocale,
      ...this.config.detection,
    });

    this.numberFormatter = new NumberFormatter();
    this.dateFormatter = new DateFormatter();
    this.pluralizer = new Pluralizer();
    this.formulaTranslator = new FormulaTranslator();
  }

  /**
   * Initialize the i18n manager
   * Detects locale and loads translations
   *
   * @param locale - Optional locale override
   * @returns Promise that resolves when initialization is complete
   */
  async init(locale?: LocaleCode): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Detect or use provided locale
      const detectedLocale = locale || await this.detectLocale();
      this.currentLocale = detectedLocale;

      // Load default locale translations first
      await this.loadTranslations(this.defaultLocale);

      // Load current locale translations
      if (this.currentLocale !== this.defaultLocale) {
        await this.loadTranslations(this.currentLocale);
      }

      // Load fallback locale if different
      if (
        this.fallbackLocale !== this.defaultLocale &&
        this.fallbackLocale !== this.currentLocale
      ) {
        await this.loadTranslations(this.fallbackLocale);
      }

      this.initialized = true;

      if (this.config.debug) {
        console.log(`[I18n] Initialized with locale: ${this.currentLocale}`);
      }
    } catch (error) {
      console.error('[I18n] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Translate a key
   *
   * @param key - Translation key (supports dot notation)
   * @param params - Parameters for interpolation
   * @returns Translated string
   *
   * @example
   * ```typescript
   * i18n.t('ui.common.save') // 'Save'
   * i18n.t('ui.welcome.user', { name: 'John' }) // 'Welcome, John!'
   * i18n.t('ui.items.count', { count: 5 }) // '5 items'
   * ```
   */
  t(key: TranslationKey, params?: TranslationParams): string {
    const translation = this.getTranslation(key, this.currentLocale);

    if (!translation) {
      this.emit('missingTranslation', key, this.currentLocale);

      if (this.config.debug) {
        console.warn(`[I18n] Missing translation: ${key} for locale: ${this.currentLocale}`);
      }

      // Try fallback
      const fallbackTranslation = this.getTranslation(key, this.fallbackLocale);
      if (fallbackTranslation) {
        return this.interpolate(fallbackTranslation, params);
      }

      return key;
    }

    return this.interpolate(translation, params);
  }

  /**
   * Check if a translation key exists
   *
   * @param key - Translation key to check
   * @param locale - Locale to check (defaults to current)
   * @returns True if translation exists
   */
  exists(key: TranslationKey, locale?: LocaleCode): boolean {
    const targetLocale = locale || this.currentLocale;
    const translation = this.getTranslation(key, targetLocale);
    return translation !== null;
  }

  /**
   * Get current locale
   *
   * @returns Current locale code
   */
  getLocale(): LocaleCode {
    return this.currentLocale;
  }

  /**
   * Get supported locales
   *
   * @returns Array of supported locale codes
   */
  getSupportedLocales(): LocaleCode[] {
    return Array.from(this.supportedLocales);
  }

  /**
   * Get text direction for current locale
   *
   * @returns 'rtl' or 'ltr'
   */
  getDirection(): 'rtl' | 'ltr' {
    const translation = this.translations.get(this.currentLocale);
    return translation?.direction || 'ltr';
  }

  /**
   * Check if current locale is RTL
   *
   * @returns True if locale is RTL
   */
  isRTL(): boolean {
    return this.getDirection() === 'rtl';
  }

  /**
   * Change the current locale
   *
   * @param locale - New locale code
   * @returns Promise that resolves when locale is changed
   */
  async setLocale(locale: LocaleCode): Promise<void> {
    if (locale === this.currentLocale) {
      return;
    }

    if (!this.supportedLocales.has(locale)) {
      console.warn(`[I18n] Unsupported locale: ${locale}`);
      return;
    }

    const previousLocale = this.currentLocale;

    try {
      // Load translations for new locale
      await this.loadTranslations(locale);

      // Update current locale
      this.currentLocale = locale;

      // Emit change event
      this.emit('localeChange', locale, previousLocale);

      if (this.config.debug) {
        console.log(`[I18n] Locale changed: ${previousLocale} -> ${locale}`);
      }
    } catch (error) {
      console.error(`[I18n] Failed to set locale: ${locale}`, error);
      throw error;
    }
  }

  /**
   * Format a number according to locale rules
   *
   * @param value - Number to format
   * @param options - Formatting options
   * @returns Formatted number string
   *
   * @example
   * ```typescript
   * i18n.formatNumber(1234.56) // '1,234.56' (en)
   * i18n.formatNumber(1234.56) // '1.234,56' (de)
   * i18n.formatNumber(1234.56, { style: 'currency', currency: 'USD' }) // '$1,234.56'
   * ```
   */
  formatNumber(value: number, options?: NumberFormatOptions): string {
    const locale = this.currentLocale;
    const translation = this.translations.get(locale);

    // Merge locale-specific defaults with provided options
    const defaultOptions = translation?.formats?.number;
    const mergedOptions = { ...defaultOptions, ...options };

    return this.numberFormatter.format(value, locale, mergedOptions);
  }

  /**
   * Format a date according to locale rules
   *
   * @param date - Date to format
   * @param options - Formatting options
   * @returns Formatted date string
   *
   * @example
   * ```typescript
   * i18n.formatDate(new Date()) // '3/9/2026' (en)
   * i18n.formatDate(new Date()) // '09.03.2026' (de)
   * i18n.formatDate(new Date(), { dateStyle: 'full' }) // 'Monday, March 9, 2026'
   * ```
   */
  formatDate(date: Date, options?: DateFormatOptions): string {
    const locale = this.currentLocale;
    const translation = this.translations.get(locale);

    // Merge locale-specific defaults with provided options
    const defaultOptions = translation?.formats?.date;
    const mergedOptions = { ...defaultOptions, ...options };

    return this.dateFormatter.format(date, locale, mergedOptions);
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   *
   * @param value - Numeric value
   * @param unit - Unit type (second, minute, hour, day, etc.)
   * @param options - Formatting options
   * @returns Formatted relative time string
   *
   * @example
   * ```typescript
   * i18n.formatRelativeTime(-1, 'day') // 'yesterday'
   * i18n.formatRelativeTime(2, 'hour') // 'in 2 hours'
   * ```
   */
  formatRelativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: RelativeTimeFormatOptions
  ): string {
    const locale = this.currentLocale;
    return this.dateFormatter.formatRelative(value, unit, locale, options);
  }

  /**
   * Format currency
   *
   * @param value - Amount to format
   * @param currency - Currency code (e.g., 'USD', 'EUR')
   * @param options - Additional formatting options
   * @returns Formatted currency string
   *
   * @example
   * ```typescript
   * i18n.formatCurrency(1234.56, 'USD') // '$1,234.56'
   * i18n.formatCurrency(1234.56, 'EUR') // '1.234,56 €'
   * ```
   */
  formatCurrency(value: number, currency: string, options?: NumberFormatOptions): string {
    return this.formatNumber(value, {
      ...options,
      style: 'currency',
      currency,
    });
  }

  /**
   * Translate a formula name
   *
   * @param formulaName - English formula name (e.g., 'SUM', 'AVERAGE')
   * @returns Localized formula name
   *
   * @example
   * ```typescript
   * i18n.translateFormula('SUM') // 'SUMA' (es)
   * i18n.translateFormula('AVERAGE') // 'MITTELWERT' (de)
   * ```
   */
  translateFormula(formulaName: string): string {
    const translation = this.translations.get(this.currentLocale);
    const formulaTranslations = translation?.messages?.formulas;

    if (!formulaTranslations) {
      return formulaName;
    }

    return this.formulaTranslator.translate(formulaName, formulaTranslations);
  }

  /**
   * Get the plural form for a count
   *
   * @param count - Count to determine plural form for
   * @returns Plural form (e.g., 'one', 'other')
   */
  getPluralForm(count: number): string {
    return this.pluralizer.getForm(count, this.currentLocale);
  }

  /**
   * Add an event listener
   *
   * @param event - Event name
   * @param callback - Event handler
   */
  on<K extends keyof I18nEvents>(event: K, callback: I18nEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove an event listener
   *
   * @param event - Event name
   * @param callback - Event handler to remove
   */
  off<K extends keyof I18nEvents>(event: K, callback: I18nEvents[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(callback);
    }
  }

  /**
   * Clear all translations from memory
   * Useful for testing or memory management
   */
  clearCache(): void {
    this.translations.clear();
    this.loadingPromise.clear();
  }

  /**
   * Reload translations for current locale
   * Useful for hot reload in development
   *
   * @returns Promise that resolves when reload is complete
   */
  async reload(): Promise<void> {
    if (!this.config.hotReload) {
      console.warn('[I18n] Hot reload is not enabled');
      return;
    }

    const locale = this.currentLocale;
    this.translations.delete(locale);
    this.loadingPromise.delete(locale);

    await this.loadTranslations(locale);

    if (this.config.debug) {
      console.log(`[I18n] Reloaded translations for locale: ${locale}`);
    }
  }

  /**
   * Get locale information
   *
   * @param locale - Locale code (defaults to current)
   * @returns Locale metadata or undefined
   */
  getLocaleInfo(locale?: LocaleCode): TranslationFile | undefined {
    const targetLocale = locale || this.currentLocale;
    return this.translations.get(targetLocale);
  }

  /**
   * Detect locale from various sources
   *
   * @returns Promise resolving to detected locale
   */
  private async detectLocale(): Promise<LocaleCode> {
    const result: LocaleDetectionResult = await this.detector.detect();

    if (this.config.debug) {
      console.log(`[I18n] Detected locale: ${result.locale} (method: ${result.method})`);
    }

    return result.locale;
  }

  /**
   * Load translations for a locale
   *
   * @param locale - Locale to load
   * @returns Promise resolving to load result
   */
  private async loadTranslations(locale: LocaleCode): Promise<TranslationLoadResult> {
    // Check if already loading
    if (this.loadingPromise.has(locale)) {
      return this.loadingPromise.get(locale)!;
    }

    // Check if already loaded
    if (this.translations.has(locale)) {
      return {
        locale,
        success: true,
        translations: this.translations.get(locale)!,
      };
    }

    // Load translations
    const loadPromise = this.loader.load(locale).then((result) => {
      if (result.success && result.translations) {
        this.translations.set(locale, result.translations);
      }
      this.emit('translationsLoaded', result);
      return result;
    });

    this.loadingPromise.set(locale, loadPromise);

    try {
      return await loadPromise;
    } finally {
      this.loadingPromise.delete(locale);
    }
  }

  /**
   * Get translation by key
   *
   * @param key - Translation key
   * @param locale - Locale
   * @returns Translation or null
   */
  private getTranslation(
    key: TranslationKey,
    locale: LocaleCode
  ): string | Record<string, string> | null {
    const translation = this.translations.get(locale);
    if (!translation) {
      return null;
    }

    // Navigate through nested keys
    const parts = key.split('.');
    let current: any = translation.messages;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }

    // Handle both simple strings and translation objects
    if (typeof current === 'string') {
      return current;
    }

    if (typeof current === 'object' && current !== null) {
      // Check for message property in translation object
      if ('message' in current) {
        return current;
      }
      // Return as-is for plural forms
      return current;
    }

    return null;
  }

  /**
   * Interpolate parameters into translation string
   *
   * @param translation - Translation string or object
   * @param params - Parameters to interpolate
   * @returns Interpolated string
   */
  private interpolate(
    translation: string | Record<string, string>,
    params?: TranslationParams
  ): string {
    if (!params) {
      if (typeof translation === 'string') {
        return translation;
      }
      // Handle pluralized translation
      if (typeof translation === 'object' && translation.message) {
        const count = params?.count as number || 1;
        const pluralForm = this.getPluralForm(count);
        const pluralTranslation = translation.plural?.[pluralForm] || translation.message;
        return this.interpolate(pluralTranslation, { ...params, count });
      }
      return translation.message || '';
    }

    let template: string;

    // Handle pluralized translations
    if (typeof translation === 'object' && translation.message) {
      const count = params.count as number || 1;
      const pluralForm = this.getPluralForm(count);
      template = translation.plural?.[pluralForm] || translation.message;
    } else if (typeof translation === 'string') {
      template = translation;
    } else {
      return String(translation);
    }

    // Replace {{placeholder}} patterns
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key in params) {
        return String(params[key]);
      }
      return match;
    });
  }

  /**
   * Emit an event
   *
   * @param event - Event name
   * @param args - Event arguments
   */
  private emit<K extends keyof I18nEvents>(event: K, ...args: any[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          (handler as any)(...args);
        } catch (error) {
          console.error(`[I18n] Error in ${event} handler:`, error);
        }
      }
    }
  }

  /**
   * Get default supported locales
   *
   * @returns Array of default locale codes
   */
  private getDefaultSupportedLocales(): LocaleCode[] {
    return ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ar'];
  }
}

/**
 * Global i18n manager instance
 * Can be used as a singleton throughout the application
 */
let globalI18nManager: I18nManager | null = null;

/**
 * Get or create the global i18n manager instance
 *
 * @param config - Configuration options (only used on first call)
 * @returns Global i18n manager instance
 *
 * @example
 * ```typescript
 * const i18n = getI18nManager();
 * await i18n.init();
 * ```
 */
export function getI18nManager(config?: I18nConfig): I18nManager {
  if (!globalI18nManager) {
    globalI18nManager = new I18nManager(config);
  }
  return globalI18nManager;
}
