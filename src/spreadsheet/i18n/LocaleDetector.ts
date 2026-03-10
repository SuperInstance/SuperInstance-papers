/**
 * LocaleDetector - Detect user's preferred locale
 *
 * Detects locale from multiple sources in priority order:
 * 1. URL query parameter
 * 2. URL path
 * 3. User profile/settings
 * 4. LocalStorage
 * 5. Cookie
 * 6. Browser language
 * 7. Default fallback
 *
 * @module spreadsheet/i18n
 */

import type {
  LocaleCode,
  LocaleDetectionResult,
} from './types.js';

/**
 * Locale detector configuration
 */
export interface LocaleDetectorConfig {
  /**
   * Supported locales
   */
  supportedLocales: LocaleCode[];

  /**
   * Fallback locale
   */
  fallbackLocale: LocaleCode;

  /**
   * Query parameter name for locale
   * @default 'lang'
   */
  queryParameter?: string;

  /**
   * URL path pattern for locale
   * @default /^\/([a-z]{2})(?:\/|$)/
   */
  urlPattern?: RegExp;

  /**
   * LocalStorage key for locale
   * @default 'locale'
   */
  storageKey?: string;

  /**
   * Cookie key for locale
   * @default 'locale'
   */
  cookieKey?: string;

  /**
   * Check browser language
   * @default true
   */
  browser?: boolean;

  /**
   * Custom user profile detector
   */
  userProfile?: (user: unknown) => LocaleCode | null;
}

/**
 * LocaleDetector class
 *
 * @example
 * ```typescript
 * const detector = new LocaleDetector({
 *   supportedLocales: ['en', 'es', 'fr', 'de'],
 *   fallbackLocale: 'en',
 * });
 *
 * const result = await detector.detect();
 * console.log(result.locale); // 'es'
 * ```
 */
export class LocaleDetector {
  private config: Required<LocaleDetectorConfig>;

  constructor(config: LocaleDetectorConfig) {
    this.config = {
      supportedLocales: config.supportedLocales,
      fallbackLocale: config.fallbackLocale,
      queryParameter: config.queryParameter || 'lang',
      urlPattern: config.urlPattern || /^\/([a-z]{2})(?:\/|$)/,
      storageKey: config.storageKey || 'locale',
      cookieKey: config.cookieKey || 'locale',
      browser: config.browser ?? true,
      userProfile: config.userProfile || (() => null),
    };
  }

  /**
   * Detect locale from all available sources
   * Returns the first valid locale found
   *
   * @returns Promise resolving to detection result
   */
  async detect(): Promise<LocaleDetectionResult> {
    // Detection strategies in priority order
    const strategies = [
      this.detectFromQuery.bind(this),
      this.detectFromUrl.bind(this),
      this.detectFromStorage.bind(this),
      this.detectFromCookie.bind(this),
      this.detectFromBrowser.bind(this),
    ];

    for (const strategy of strategies) {
      const result = strategy();
      if (result) {
        return result;
      }
    }

    // Fallback to default
    return {
      locale: this.config.fallbackLocale,
      method: 'default',
      confidence: 0,
      isExplicitPreference: false,
    };
  }

  /**
   * Detect locale from URL query parameter
   *
   * @returns Detection result or null
   */
  private detectFromQuery(): LocaleDetectionResult | null {
    try {
      const url = this.getUrl();

      if (!url) {
        return null;
      }

      const queryParam = this.config.queryParameter;
      const searchParams = new URLSearchParams(url.search);
      const locale = searchParams.get(queryParam);

      if (locale && this.isSupported(locale as LocaleCode)) {
        return {
          locale: locale as LocaleCode,
          method: 'query',
          confidence: 1.0,
          isExplicitPreference: true,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Detect locale from URL path
   *
   * @returns Detection result or null
   */
  private detectFromUrl(): LocaleDetectionResult | null {
    try {
      const url = this.getUrl();

      if (!url) {
        return null;
      }

      const pattern = this.config.urlPattern;
      const match = url.pathname.match(pattern);

      if (match && match[1]) {
        const locale = match[1] as LocaleCode;

        if (this.isSupported(locale)) {
          return {
            locale,
            method: 'url',
            confidence: 0.95,
            isExplicitPreference: true,
          };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Detect locale from local storage
   *
   * @returns Detection result or null
   */
  private detectFromStorage(): LocaleDetectionResult | null {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return null;
      }

      const key = this.config.storageKey;
      const stored = localStorage.getItem(key);

      if (stored && this.isSupported(stored as LocaleCode)) {
        return {
          locale: stored as LocaleCode,
          method: 'storage',
          confidence: 0.9,
          isExplicitPreference: true,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Detect locale from cookie
   *
   * @returns Detection result or null
   */
  private detectFromCookie(): LocaleDetectionResult | null {
    try {
      if (typeof document === 'undefined') {
        return null;
      }

      const key = this.config.cookieKey;
      const cookies = document.cookie.split(';');

      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');

        if (name === key && value) {
          const locale = decodeURIComponent(value);

          if (this.isSupported(locale as LocaleCode)) {
            return {
              locale: locale as LocaleCode,
              method: 'cookie',
              confidence: 0.85,
              isExplicitPreference: true,
            };
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Detect locale from browser language
   *
   * @returns Detection result or null
   */
  private detectFromBrowser(): LocaleDetectionResult | null {
    if (!this.config.browser) {
      return null;
    }

    try {
      if (typeof navigator === 'undefined') {
        return null;
      }

      // Try navigator.language first
      let locale = this.parseBrowserLocale(navigator.language);

      if (locale && this.isSupported(locale)) {
        return {
          locale,
          method: 'browser',
          confidence: 0.7,
          isExplicitPreference: false,
        };
      }

      // Try navigator.languages array
      if (navigator.languages) {
        for (const lang of navigator.languages) {
          locale = this.parseBrowserLocale(lang);

          if (locale && this.isSupported(locale)) {
            return {
              locale,
              method: 'browser',
              confidence: 0.6,
              isExplicitPreference: false,
            };
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Parse browser locale string
   * Handles both simple codes ('en') and full locale strings ('en-US', 'en_US')
   *
   * @param locale - Browser locale string
   * @returns Parsed locale code or null
   */
  private parseBrowserLocale(locale: string): LocaleCode | null {
    if (!locale) {
      return null;
    }

    // Extract language code (before '-' or '_')
    const match = locale.match(/^([a-z]{2})/i);

    if (match) {
      const code = match[1].toLowerCase() as LocaleCode;

      if (this.isSupported(code)) {
        return code;
      }
    }

    return null;
  }

  /**
   * Check if a locale is supported
   *
   * @param locale - Locale code to check
   * @returns True if supported
   */
  private isSupported(locale: LocaleCode): boolean {
    return this.config.supportedLocales.includes(locale);
  }

  /**
   * Get current URL (works in browser and Node.js)
   *
   * @returns URL object or null
   */
  private getUrl(): URL | null {
    try {
      // Browser
      if (typeof window !== 'undefined' && window.location) {
        return new URL(window.location.href);
      }

      // Node.js with global URL
      if (typeof globalThis !== 'undefined' && (globalThis as any).URL) {
        return new URL((globalThis as any).URL);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get the best match for a locale
   * Handles locale fallback (e.g., 'en-US' -> 'en')
   *
   * @param locale - Requested locale
   * @returns Best matching supported locale
   */
  getBestMatch(locale: string): LocaleCode {
    // Direct match
    if (this.isSupported(locale as LocaleCode)) {
      return locale as LocaleCode;
    }

    // Try language code only (strip region)
    const langCode = locale.split('-')[0]?.toLowerCase();
    if (langCode && this.isSupported(langCode as LocaleCode)) {
      return langCode as LocaleCode;
    }

    // Return fallback
    return this.config.fallbackLocale;
  }

  /**
   * Parse Accept-Language header
   * Useful for server-side detection
   *
   * @param header - Accept-Language header value
   * @returns Array of locale codes with quality values
   *
   * @example
   * ```typescript
   * const locales = detector.parseAcceptLanguage('en-US,en;q=0.9,es;q=0.8');
   * // [{ locale: 'en-US', q: 1.0 }, { locale: 'en', q: 0.9 }, { locale: 'es', q: 0.8 }]
   * ```
   */
  parseAcceptLanguage(header: string): Array<{ locale: string; q: number }> {
    const locales: Array<{ locale: string; q: number }> = [];

    if (!header) {
      return locales;
    }

    const parts = header.split(',');

    for (const part of parts) {
      const [locale, qPart] = part.trim().split(';q=');
      const q = qPart ? parseFloat(qPart) : 1.0;

      locales.push({
        locale: locale.toLowerCase(),
        q,
      });
    }

    // Sort by quality value descending
    locales.sort((a, b) => b.q - a.q);

    return locales;
  }

  /**
   * Detect locale from Accept-Language header
   *
   * @param header - Accept-Language header value
   * @returns Detection result or null
   */
  detectFromAcceptLanguage(header: string): LocaleDetectionResult | null {
    const locales = this.parseAcceptLanguage(header);

    for (const { locale } of locales) {
      const parsed = this.parseBrowserLocale(locale);

      if (parsed && this.isSupported(parsed)) {
        return {
          locale: parsed,
          method: 'browser',
          confidence: 0.7,
          isExplicitPreference: false,
        };
      }
    }

    return null;
  }
}

/**
 * Utility function to detect locale from Accept-Language header
 * Useful for server-side applications
 *
 * @param header - Accept-Language header value
 * @param supportedLocales - Array of supported locales
 * @param fallbackLocale - Fallback locale
 * @returns Detected locale code
 *
 * @example
 * ```typescript
 * const locale = detectLocaleFromHeader(
 *   'en-US,en;q=0.9,es;q=0.8',
 *   ['en', 'es', 'fr'],
 *   'en'
 * );
 * // Returns 'en'
 * ```
 */
export function detectLocaleFromHeader(
  header: string,
  supportedLocales: LocaleCode[],
  fallbackLocale: LocaleCode
): LocaleCode {
  const detector = new LocaleDetector({
    supportedLocales,
    fallbackLocale,
  });

  const result = detector.detectFromAcceptLanguage(header);

  return result?.locale || fallbackLocale;
}
