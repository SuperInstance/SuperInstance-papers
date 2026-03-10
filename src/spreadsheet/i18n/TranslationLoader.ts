/**
 * TranslationLoader - Load and cache translation files
 *
 * Handles:
 * - Loading translation files from various sources
 * - Caching translations in memory
 * - Hot reload for development
 * - Fallback to default locale
 * - Dynamic import support
 *
 * @module spreadsheet/i18n
 */

import type {
  LocaleCode,
  TranslationFile,
  TranslationLoadResult,
} from './types.js';

/**
 * Translation loader configuration
 */
export interface TranslationLoaderConfig {
  /**
   * Base URL for loading translation files
   */
  baseUrl?: string;

  /**
   * Enable caching in memory
   */
  cache?: boolean;

  /**
   * Enable hot reload for development
   */
  hotReload?: boolean;

  /**
   * Custom loader function
   */
  loader?: (locale: LocaleCode) => Promise<TranslationFile | null>;

  /**
   * Load timeout in milliseconds
   */
  timeout?: number;
}

/**
 * Translation file extension mapping
 */
const TRANSLATION_EXTENSIONS = ['.json', '.ts', '.js'];

/**
 * Cache for loaded translations
 */
const translationCache = new Map<LocaleCode, TranslationFile>();

/**
 * Hot reload watchers
 */
const hotReloadWatchers = new Map<LocaleCode, FileSystemWatcher>();

/**
 * FileSystemWatcher interface for hot reload
 */
interface FileSystemWatcher {
  close(): void;
}

/**
 * TranslationLoader class
 *
 * @example
 * ```typescript
 * const loader = new TranslationLoader({
 *   baseUrl: '/locales',
 *   cache: true,
 *   hotReload: true,
 * });
 *
 * const result = await loader.load('en');
 * if (result.success) {
 *   console.log(result.translations);
 * }
 * ```
 */
export class TranslationLoader {
  private config: Required<TranslationLoaderConfig>;
  private cache: Map<LocaleCode, TranslationFile>;

  constructor(config: TranslationLoaderConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '/locales',
      cache: config.cache ?? true,
      hotReload: config.hotReload ?? false,
      loader: config.loader || this.defaultLoader.bind(this),
      timeout: config.timeout || 5000,
    };

    this.cache = new Map();
  }

  /**
   * Load translations for a locale
   *
   * @param locale - Locale code to load
   * @returns Promise resolving to load result
   */
  async load(locale: LocaleCode): Promise<TranslationLoadResult> {
    try {
      // Check cache first
      if (this.cache.has(locale)) {
        return {
          locale,
          success: true,
          translations: this.cache.get(locale)!,
        };
      }

      // Load translations
      const translations = await this.withTimeout(
        this.config.loader(locale),
        this.config.timeout
      );

      if (!translations) {
        return {
          locale,
          success: false,
          error: `Failed to load translations for locale: ${locale}`,
        };
      }

      // Validate translation file structure
      const validation = this.validateTranslations(translations);
      if (!validation.valid) {
        return {
          locale,
          success: false,
          error: `Invalid translation file structure: ${validation.errors.join(', ')}`,
        };
      }

      // Cache the translations
      if (this.config.cache) {
        this.cache.set(locale, translations);
      }

      // Set up hot reload if enabled
      if (this.config.hotReload) {
        this.setupHotReload(locale);
      }

      return {
        locale,
        success: true,
        translations,
      };
    } catch (error) {
      return {
        locale,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Preload multiple locales
   *
   * @param locales - Array of locale codes to preload
   * @returns Promise resolving to array of load results
   */
  async preload(locales: LocaleCode[]): Promise<TranslationLoadResult[]> {
    const results = await Promise.all(
      locales.map((locale) => this.load(locale))
    );

    return results;
  }

  /**
   * Clear the translation cache
   *
   * @param locale - Specific locale to clear, or undefined to clear all
   */
  clearCache(locale?: LocaleCode): void {
    if (locale) {
      this.cache.delete(locale);
      this.stopHotReload(locale);
    } else {
      this.cache.clear();
      // Stop all hot reload watchers
      for (const [locale] of hotReloadWatchers) {
        this.stopHotReload(locale);
      }
    }
  }

  /**
   * Check if a locale is cached
   *
   * @param locale - Locale code to check
   * @returns True if locale is cached
   */
  isCached(locale: LocaleCode): boolean {
    return this.cache.has(locale);
  }

  /**
   * Get cached translations
   *
   * @param locale - Locale code
   * @returns Cached translations or undefined
   */
  getCached(locale: LocaleCode): TranslationFile | undefined {
    return this.cache.get(locale);
  }

  /**
   * Reload translations for a locale
   *
   * @param locale - Locale to reload
   * @returns Promise resolving to reload result
   */
  async reload(locale: LocaleCode): Promise<TranslationLoadResult> {
    // Clear from cache
    this.cache.delete(locale);

    // Stop existing hot reload watcher
    this.stopHotReload(locale);

    // Reload
    return this.load(locale);
  }

  /**
   * Set up hot reload for a locale
   *
   * @param locale - Locale to watch
   */
  private setupHotReload(locale: LocaleCode): void {
    // Only set up hot reload in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Stop existing watcher if any
    this.stopHotReload(locale);

    // In a real implementation, you would use a file watcher here
    // For now, this is a placeholder for the hot reload functionality
    //
    // Example with chokidar (Node.js):
    // const watcher = chokidar.watch(this.getLocalePath(locale));
    // watcher.on('change', () => {
    //   this.reload(locale);
    // });
  }

  /**
   * Stop hot reload for a locale
   *
   * @param locale - Locale to stop watching
   */
  private stopHotReload(locale: LocaleCode): void {
    const watcher = hotReloadWatchers.get(locale);
    if (watcher) {
      watcher.close();
      hotReloadWatchers.delete(locale);
    }
  }

  /**
   * Default loader implementation
   * Tries multiple file extensions and sources
   *
   * @param locale - Locale to load
   * @returns Promise resolving to translations or null
   */
  private async defaultLoader(locale: LocaleCode): Promise<TranslationFile | null> {
    // Try dynamic import first (for bundled translations)
    try {
      const dynamicImport = await this.dynamicImport(locale);
      if (dynamicImport) {
        return dynamicImport;
      }
    } catch {
      // Continue to other methods
    }

    // Try fetch (for server-side or browser)
    try {
      const fetched = await this.fetchTranslation(locale);
      if (fetched) {
        return fetched;
      }
    } catch {
      // Continue to other methods
    }

    // Try require (Node.js)
    try {
      const required = await this.requireTranslation(locale);
      if (required) {
        return required;
      }
    } catch {
      // No translation found
    }

    return null;
  }

  /**
   * Dynamic import for bundled translations
   *
   * @param locale - Locale to import
   * @returns Promise resolving to translations or null
   */
  private async dynamicImport(locale: LocaleCode): Promise<TranslationFile | null> {
    // This is a placeholder for dynamic import
    // In a real implementation, you would use:
    // const module = await import(`./locales/${locale}.ts`);
    // return module.default || module;

    return null;
  }

  /**
   * Fetch translation file via HTTP
   *
   * @param locale - Locale to fetch
   * @returns Promise resolving to translations or null
   */
  private async fetchTranslation(locale: LocaleCode): Promise<TranslationFile | null> {
    if (typeof fetch === 'undefined') {
      return null;
    }

    const url = this.getLocalePath(locale, '.json');

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data as TranslationFile;
    } catch {
      return null;
    }
  }

  /**
   * Require translation file (Node.js)
   *
   * @param locale - Locale to require
   * @returns Promise resolving to translations or null
   */
  private async requireTranslation(locale: LocaleCode): Promise<TranslationFile | null> {
    // This is a placeholder for require
    // In a real Node.js implementation, you would use:
    // const path = this.getLocalePath(locale, '.json');
    // const data = require(path);
    // return data;

    return null;
  }

  /**
   * Get the file path for a locale
   *
   * @param locale - Locale code
   * @param extension - File extension
   * @returns Full path to translation file
   */
  private getLocalePath(locale: LocaleCode, extension: string = '.json'): string {
    return `${this.config.baseUrl}/${locale}${extension}`;
  }

  /**
   * Validate translation file structure
   *
   * @param translations - Translation file to validate
   * @returns Validation result
   */
  private validateTranslations(translations: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (typeof translations !== 'object' || translations === null) {
      return {
        valid: false,
        errors: ['Translation file must be an object'],
      };
    }

    if (!translations.locale) {
      errors.push('Missing required field: locale');
    }

    if (!translations.messages) {
      errors.push('Missing required field: messages');
    }

    if (typeof translations.messages !== 'object') {
      errors.push('Field "messages" must be an object');
    }

    // Check direction if present
    if (translations.direction && !['ltr', 'rtl'].includes(translations.direction)) {
      errors.push('Field "direction" must be "ltr" or "rtl"');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Wrap a promise with a timeout
   *
   * @param promise - Promise to wrap
   * @param timeoutMs - Timeout in milliseconds
   * @returns Promise that rejects after timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    });

    return Promise.race([promise, timeout]);
  }
}

/**
 * Export a singleton instance for convenience
 */
export const translationLoader = new TranslationLoader();
