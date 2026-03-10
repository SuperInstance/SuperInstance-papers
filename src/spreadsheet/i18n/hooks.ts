/**
 * React hooks for internationalization
 *
 * Provides convenient React hooks for using the i18n system
 * in React components.
 *
 * @module spreadsheet/i18n/hooks
 */

import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import type {
  LocaleCode,
  TranslationKey,
  TranslationParams,
  NumberFormatOptions,
  DateFormatOptions,
  I18nConfig,
} from './types.js';
import { I18nManager, getI18nManager } from './I18nManager.js';

/**
 * I18n context type
 */
interface I18nContextValue {
  i18n: I18nManager;
  locale: LocaleCode;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatNumber: (value: number, options?: NumberFormatOptions) => string;
  formatDate: (date: Date, options?: DateFormatOptions) => string;
  changeLocale: (locale: LocaleCode) => Promise<void>;
  isRTL: boolean;
  isLoading: boolean;
}

/**
 * I18n context
 */
const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Props for I18nProvider
 */
export interface I18nProviderProps {
  children: React.ReactNode;
  config?: I18nConfig;
  initialLocale?: LocaleCode;
}

/**
 * I18n Provider component
 *
 * Wraps the application and provides i18n context
 *
 * @example
 * ```tsx
 * <I18nProvider initialLocale="es">
 *   <App />
 * </I18nProvider>
 * ```
 */
export function I18nProvider({ children, config, initialLocale }: I18nProviderProps): React.ReactElement {
  const [i18n] = useState(() => getI18nManager(config));
  const [locale, setLocale] = useState<LocaleCode>(initialLocale || 'en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      setIsLoading(true);
      try {
        await i18n.init(initialLocale);
        if (isMounted) {
          setLocale(i18n.getLocale());
        }
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    init();

    // Listen for locale changes
    const handleLocaleChange = (newLocale: LocaleCode) => {
      if (isMounted) {
        setLocale(newLocale);
      }
    };

    (i18n as any).on('localeChange', handleLocaleChange);

    return () => {
      isMounted = false;
      (i18n as any).off('localeChange', handleLocaleChange);
    };
  }, [i18n, initialLocale]);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams): string => {
      return i18n.t(key, params);
    },
    [i18n]
  );

  const formatNumber = useCallback(
    (value: number, options?: NumberFormatOptions): string => {
      return i18n.formatNumber(value, options);
    },
    [i18n]
  );

  const formatDate = useCallback(
    (date: Date, options?: DateFormatOptions): string => {
      return i18n.formatDate(date, options);
    },
    [i18n]
  );

  const changeLocale = useCallback(
    async (newLocale: LocaleCode): Promise<void> => {
      await i18n.setLocale(newLocale);
    },
    [i18n]
  );

  const contextValue: I18nContextValue = {
    i18n,
    locale,
    t,
    formatNumber,
    formatDate,
    changeLocale,
    isRTL: i18n.isRTL(),
    isLoading,
  };

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

/**
 * Error message for missing I18nProvider
 */
const MISSING_PROVIDER_ERROR = 'useI18n must be used within an I18nProvider';

/**
 * useI18n hook
 *
 * Provides access to the i18n system
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t, locale, changeLocale, isRTL } = useI18n();
 *
 *   return (
 *     <div dir={isRTL ? 'rtl' : 'ltr'}>
 *       <h1>{t('ui.common.title')}</h1>
 *       <p>{t('ui.welcome.user', { name: 'John' })}</p>
 *       <button onClick={() => changeLocale('es')}>
 *         Switch to Spanish
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error(MISSING_PROVIDER_ERROR);
  }

  return context;
}

/**
 * useTranslation hook
 *
 * Simplified hook that only returns the translation function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const t = useTranslation();
 *
 *   return <h1>{t('ui.common.title')}</h1>;
 * }
 * ```
 */
export function useTranslation(): (
  key: TranslationKey,
  params?: TranslationParams
) => string {
  const { t } = useI18n();
  return t;
}

/**
 * useLocale hook
 *
 * Returns the current locale and function to change it
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { locale, changeLocale, isLoading } = useLocale();
 *
 *   if (isLoading) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Current locale: {locale}</p>
       <button onClick={() => changeLocale('es')}>
 *         Español
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useLocale(): {
  locale: LocaleCode;
  changeLocale: (locale: LocaleCode) => Promise<void>;
  isLoading: boolean;
} {
  const { locale, changeLocale, isLoading } = useI18n();
  return { locale, changeLocale, isLoading };
}

/**
 * useFormattedNumber hook
 *
 * Returns a function to format numbers according to locale
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const formatNumber = useFormattedNumber();
 *
 *   return (
 *     <div>
 *       <p>{formatNumber(1234.56)}</p>
 *       <p>{formatNumber(1234.56, { style: 'currency', currency: 'USD' })}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFormattedNumber(): (
  value: number,
  options?: NumberFormatOptions
) => string {
  const { formatNumber } = useI18n();
  return formatNumber;
}

/**
 * useFormattedDate hook
 *
 * Returns a function to format dates according to locale
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const formatDate = useFormattedDate();
 *
 *   return (
 *     <div>
 *       <p>{formatDate(new Date())}</p>
 *       <p>{formatDate(new Date(), { dateStyle: 'full' })}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFormattedDate(): (
  date: Date,
  options?: DateFormatOptions
) => string {
  const { formatDate } = useI18n();
  return formatDate;
}

/**
 * useRTL hook
 *
 * Returns whether the current locale is RTL (right-to-left)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isRTL = useRTL();
 *
 *   return <div dir={isRTL ? 'rtl' : 'ltr'}>Content</div>;
 * }
 * ```
 */
export function useRTL(): boolean {
  const { isRTL } = useI18n();
  return isRTL;
}

/**
 * usePlural hook
 *
 * Returns a function to get plural forms
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const plural = usePlural();
 *
 *   return (
 *     <div>
 *       <p>{plural(1, 'ui.plurals.item')}</p>
 *       <p>{plural(5, 'ui.plurals.item')}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePlural(): (
  count: number,
  key: TranslationKey,
  params?: Omit<TranslationParams, 'count'>
) => string {
  const { t } = useI18n();

  return useCallback(
    (count: number, key: TranslationKey, params?: Omit<TranslationParams, 'count'>): string => {
      return t(key, { ...params, count });
    },
    [t]
  );
}

/**
 * useI18nEffect hook
 *
 * Run an effect when the locale changes
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useI18nEffect((locale) => {
 *     console.log('Locale changed to:', locale);
 *     document.documentElement.lang = locale;
 *   });
 *
 *   return <div>Content</div>;
 * }
 * ```
 */
export function useI18nEffect(
  effect: (locale: LocaleCode) => void | (() => void),
  deps: React.DependencyList = []
): void {
  const { locale } = useI18n();

  useEffect(() => {
    return effect(locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, ...deps]);
}

/**
 * useI18nMemo hook
 *
 * Memoize a value based on locale
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const messages = useI18nMemo(() => ({
 *     title: t('ui.common.title'),
 *     description: t('ui.common.description'),
 *   }), []);
 *
 *   return <div>{messages.title}</div>;
 * }
 * ```
 */
export function useI18nMemo<T>(
  factory: () => T,
  deps: React.DependencyList = []
): T {
  const { locale } = useI18n();

  return useMemo(factory, [locale, ...deps]);
}

/**
 * Import React's useMemo
 */
import { useMemo } from 'react';

/**
 * HOC to add i18n props to a component
 *
 * @example
 * ```tsx
 * interface Props {
 *   title: string;
 * }
 *
 * const MyComponent = ({ title }: Props) => <div>{title}</div>;
 *
 * const LocalizedMyComponent = withI18n(MyComponent, {
 *   title: 'ui.common.title'
 * });
 * ```
 */
export function withI18n<P extends object>(
  Component: React.ComponentType<P>,
  translations: Record<keyof P, TranslationKey>
): React.ComponentType<Omit<P, keyof typeof translations>> {
  return function WithI18nComponent(props: Omit<P, keyof typeof translations>) {
    const t = useTranslation();

    const translatedProps = Object.fromEntries(
      Object.entries(translations).map(([prop, key]) => [prop, t(key)])
    ) as P;

    return <Component {...props} {...translatedProps} />;
  };
}

/**
 * HOC to inject i18n context into a component
 *
 * @example
 * ```tsx
 * interface Props {
 *   i18n: I18nContextValue;
 * }
 *
 * const MyComponent = ({ i18n }: Props) => {
 *   const { t, locale } = i18n;
 *   return <div>{t('ui.common.title')}</div>;
 * };
 *
 * export default injectI18n(MyComponent);
 * ```
 */
export function injectI18n<P extends object>(
  Component: React.ComponentType<P & { i18n: I18nContextValue }>
): React.ComponentType<P> {
  return function InjectI18nComponent(props: P) {
    const i18n = useI18n();

    return <Component {...props} i18n={i18n} />;
  };
}
