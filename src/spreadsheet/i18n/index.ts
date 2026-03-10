/**
 * POLLN Spreadsheet Internationalization System
 *
 * A comprehensive i18n system supporting:
 * - Multiple locales with RTL support
 * - Number, date, and currency formatting
 * - Pluralization with CLDR rules
 * - Formula translation
 * - React hooks for easy integration
 *
 * @module spreadsheet/i18n
 *
 * @example
 * ```typescript
 * import { I18nManager } from './spreadsheet/i18n';
 *
 * const i18n = new I18nManager();
 * await i18n.init();
 *
 * // Simple translation
 * const title = i18n.t('ui.common.title');
 *
 * // Translation with parameters
 * const message = i18n.t('ui.welcome.user', { name: 'John' });
 *
 * // Format number
 * const formatted = i18n.formatNumber(1234.56, {
 *   style: 'currency',
 *   currency: 'USD'
 * });
 *
 * // Change locale
 * await i18n.setLocale('es');
 * ```
 *
 * @example With React
 * ```tsx
 * import { I18nProvider, useI18n } from './spreadsheet/i18n';
 *
 * function App() {
 *   return (
 *     <I18nProvider initialLocale="es">
 *       <MyComponent />
 *     </I18nProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const { t, locale, changeLocale, isRTL } = useI18n();
 *
 *   return (
 *     <div dir={isRTL ? 'rtl' : 'ltr'}>
 *       <h1>{t('ui.common.title')}</h1>
 *       <button onClick={() => changeLocale('fr')}>
 *         Français
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

// Main manager
export { I18nManager, getI18nManager } from './I18nManager.js';

// Components
export { TranslationLoader } from './TranslationLoader.js';
export { LocaleDetector, detectLocaleFromHeader } from './LocaleDetector.js';
export { NumberFormatter } from './NumberFormatter.js';
export { DateFormatter } from './DateFormatter.js';
export { Pluralizer, pluralizer } from './Pluralizer.js';
export { FormulaTranslator, formulaTranslator } from './FormulaTranslator.js';

// React hooks
export {
  I18nProvider,
  useI18n,
  useTranslation,
  useLocale,
  useFormattedNumber,
  useFormattedDate,
  useRTL,
  usePlural,
  useI18nEffect,
  useI18nMemo,
  withI18n,
  injectI18n,
  type I18nProviderProps,
  type I18nContextValue,
} from './hooks.js';

// Types
export type {
  LocaleCode,
  TextDirection,
  PluralForm,
  CalendarSystem,
  NumberFormatOptions,
  DateFormatOptions,
  RelativeTimeFormatOptions,
  LocaleFormats,
  TranslationMessage,
  FormulaTranslation,
  SpreadsheetTranslations,
  TranslationFile,
  TranslationKey,
  TranslationParams,
  I18nConfig,
  LocaleDetectionResult,
  TranslationLoadResult,
  I18nEvents,
} from './types.js';

// Default export
export { I18nManager as default } from './I18nManager.js';
