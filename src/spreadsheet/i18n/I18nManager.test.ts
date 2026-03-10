/**
 * Tests for I18nManager
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { I18nManager } from './I18nManager.js';
import type { LocaleCode, TranslationFile } from './types.js';

describe('I18nManager', () => {
  let i18n: I18nManager;

  // Mock translation data
  const mockTranslations: Record<LocaleCode, TranslationFile> = {
    en: {
      locale: 'en',
      languageName: 'English',
      languageNameEnglish: 'English',
      direction: 'ltr',
      messages: {
        ui: {
          common: {
            save: 'Save',
            cancel: 'Cancel',
          },
        },
        plurals: {
          item: {
            one: '{{count}} item',
            other: '{{count}} items',
          },
        },
      },
      formats: {
        decimalSeparator: '.',
        thousandsSeparator: ',',
      },
    },
    es: {
      locale: 'es',
      languageName: 'Español',
      languageNameEnglish: 'Spanish',
      direction: 'ltr',
      messages: {
        ui: {
          common: {
            save: 'Guardar',
            cancel: 'Cancelar',
          },
        },
        plurals: {
          item: {
            one: '{{count}} elemento',
            other: '{{count}} elementos',
          },
        },
      },
      formats: {
        decimalSeparator: ',',
        thousandsSeparator: '.',
      },
    },
    ar: {
      locale: 'ar',
      languageName: 'العربية',
      languageNameEnglish: 'Arabic',
      direction: 'rtl',
      messages: {
        ui: {
          common: {
            save: 'حفظ',
            cancel: 'إلغاء',
          },
        },
        plurals: {
          item: {
            zero: '٠ عنصر',
            one: 'عنصر واحد',
            two: 'عنصران',
            few: '{{count}} عناصر',
            many: '{{count}} عنصرًا',
            other: '{{count}} عنصر',
          },
        },
      },
      formats: {
        decimalSeparator: '٫',
        thousandsSeparator: '٬',
      },
    },
  };

  beforeEach(() => {
    i18n = new I18nManager({
      defaultLocale: 'en',
      fallbackLocale: 'en',
      supportedLocales: ['en', 'es', 'ar'],
      debug: false,
    });

    // Mock the loader to return our test data
    (i18n as any).loader.load = async (locale: LocaleCode) => {
      const translations = mockTranslations[locale];
      if (translations) {
        return {
          locale,
          success: true,
          translations,
        };
      }
      return {
        locale,
        success: false,
        error: `Locale ${locale} not found`,
      };
    };
  });

  afterEach(async () => {
    i18n.clearCache();
  });

  describe('initialization', () => {
    it('should initialize with default locale', async () => {
      await i18n.init();
      expect(i18n.getLocale()).toBe('en');
    });

    it('should initialize with specified locale', async () => {
      await i18n.init('es');
      expect(i18n.getLocale()).toBe('es');
    });

    it('should load fallback locale when different from default', async () => {
      const manager = new I18nManager({
        defaultLocale: 'es',
        fallbackLocale: 'en',
        supportedLocales: ['en', 'es'],
      });

      (manager as any).loader.load = async (locale: LocaleCode) => {
        const translations = mockTranslations[locale];
        if (translations) {
          return {
            locale,
            success: true,
            translations,
          };
        }
        return {
          locale,
          success: false,
          error: `Locale ${locale} not found`,
        };
      };

      await manager.init('es');
      expect(manager.getLocale()).toBe('es');
    });
  });

  describe('translation', () => {
    beforeEach(async () => {
      await i18n.init('en');
    });

    it('should translate simple keys', () => {
      expect(i18n.t('ui.common.save')).toBe('Save');
      expect(i18n.t('ui.common.cancel')).toBe('Cancel');
    });

    it('should interpolate parameters', () => {
      expect(i18n.t('ui.plurals.item', { count: 1 })).toBe('1 item');
      expect(i18n.t('ui.plurals.item', { count: 5 })).toBe('5 items');
    });

    it('should use fallback when translation is missing', () => {
      expect(i18n.t('ui.common.missing')).toBe('ui.common.missing');
    });

    it('should check if translation exists', () => {
      expect(i18n.exists('ui.common.save')).toBe(true);
      expect(i18n.exists('ui.common.missing')).toBe(false);
    });
  });

  describe('locale switching', () => {
    beforeEach(async () => {
      await i18n.init('en');
    });

    it('should change locale', async () => {
      await i18n.setLocale('es');
      expect(i18n.getLocale()).toBe('es');
      expect(i18n.t('ui.common.save')).toBe('Guardar');
    });

    it('should emit locale change event', async () => {
      const listener = jest.fn();
      (i18n as any).on('localeChange', listener);

      await i18n.setLocale('es');
      expect(listener).toHaveBeenCalledWith('es', 'en');

      (i18n as any).off('localeChange', listener);
    });

    it('should not change to unsupported locale', async () => {
      const originalLocale = i18n.getLocale();
      await i18n.setLocale('fr' as LocaleCode);
      expect(i18n.getLocale()).toBe(originalLocale);
    });
  });

  describe('RTL support', () => {
    it('should detect LTR locale', async () => {
      await i18n.init('en');
      expect(i18n.isRTL()).toBe(false);
      expect(i18n.getDirection()).toBe('ltr');
    });

    it('should detect RTL locale', async () => {
      await i18n.init('ar');
      expect(i18n.isRTL()).toBe(true);
      expect(i18n.getDirection()).toBe('rtl');
    });
  });

  describe('number formatting', () => {
    it('should format numbers in English', async () => {
      await i18n.init('en');
      expect(i18n.formatNumber(1234.56)).toBe('1,234.56');
    });

    it('should format numbers in Spanish', async () => {
      await i18n.init('es');
      expect(i18n.formatNumber(1234.56)).toBe('1.234,56');
    });

    it('should format currency', async () => {
      await i18n.init('en');
      expect(i18n.formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
    });

    it('should format percentages', async () => {
      await i18n.init('en');
      expect(i18n.formatNumber(0.1234, { style: 'percent' })).toBe('12.34%');
    });
  });

  describe('date formatting', () => {
    it('should format dates', async () => {
      await i18n.init('en');
      const date = new Date(2026, 2, 9); // March 9, 2026
      expect(i18n.formatDate(date)).toContain('2026');
    });

    it('should format relative time', async () => {
      await i18n.init('en');
      expect(i18n.formatRelativeTime(-1, 'day')).toBe('yesterday');
      expect(i18n.formatRelativeTime(2, 'hour')).toContain('2');
    });
  });

  describe('pluralization', () => {
    beforeEach(async () => {
      await i18n.init('en');
    });

    it('should get plural form for English', () => {
      expect(i18n.getPluralForm(1)).toBe('one');
      expect(i18n.getPluralForm(2)).toBe('other');
    });

    it('should get plural form for Arabic', async () => {
      await i18n.setLocale('ar');
      expect(i18n.getPluralForm(0)).toBe('zero');
      expect(i18n.getPluralForm(1)).toBe('one');
      expect(i18n.getPluralForm(2)).toBe('two');
      expect(i18n.getPluralForm(5)).toBe('few');
      expect(i18n.getPluralForm(15)).toBe('many');
      expect(i18n.getPluralForm(100)).toBe('other');
    });
  });

  describe('supported locales', () => {
    beforeEach(async () => {
      await i18n.init();
    });

    it('should return list of supported locales', () => {
      const locales = i18n.getSupportedLocales();
      expect(locales).toContain('en');
      expect(locales).toContain('es');
      expect(locales).toContain('ar');
    });
  });

  describe('caching', () => {
    it('should cache loaded translations', async () => {
      await i18n.init('en');

      // Check that translations are cached
      const localeInfo = i18n.getLocaleInfo('en');
      expect(localeInfo).toBeDefined();
      expect(localeInfo?.locale).toBe('en');
    });

    it('should clear cache', async () => {
      await i18n.init('en');
      i18n.clearCache();

      const localeInfo = i18n.getLocaleInfo('en');
      expect(localeInfo).toBeUndefined();
    });
  });

  describe('event listeners', () => {
    beforeEach(async () => {
      await i18n.init('en');
    });

    it('should add and remove event listeners', async () => {
      const listener = jest.fn();

      (i18n as any).on('localeChange', listener);
      await i18n.setLocale('es');
      expect(listener).toHaveBeenCalled();

      listener.mockClear();
      (i18n as any).off('localeChange', listener);
      await i18n.setLocale('en');
      expect(listener).not.toHaveBeenCalled();
    });

    it('should emit missing translation event', () => {
      const listener = jest.fn();
      (i18n as any).on('missingTranslation', listener);

      i18n.t('ui.nonexistent.key');
      expect(listener).toHaveBeenCalledWith('ui.nonexistent.key', 'en');

      (i18n as any).off('missingTranslation', listener);
    });
  });

  describe('error handling', () => {
    it('should handle missing translations gracefully', async () => {
      await i18n.init('en');
      expect(() => i18n.t('missing.key')).not.toThrow();
      expect(i18n.t('missing.key')).toBe('missing.key');
    });

    it('should handle invalid locale change gracefully', async () => {
      await i18n.init('en');
      await expect(i18n.setLocale('invalid' as LocaleCode)).resolves.toBeUndefined();
    });
  });
});
