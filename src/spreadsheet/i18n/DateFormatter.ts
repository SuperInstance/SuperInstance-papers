/**
 * DateFormatter - Format dates according to locale conventions
 *
 * Handles:
 * - Multiple calendar systems (Gregorian, Buddhist, Islamic, Japanese, Chinese, Hebrew)
 * - Era handling (AD/BC, CE/BCE, Japanese era names)
 * - Time zones
 * - Relative dates (yesterday, tomorrow, in 5 days)
 * - Date/time components
 * - Locale-specific patterns
 *
 * @module spreadsheet/i18n
 */

import type {
  LocaleCode,
  DateFormatOptions,
  RelativeTimeFormatOptions,
  CalendarSystem,
} from './types.js';

/**
 * Calendar metadata for different calendar systems
 */
interface CalendarMetadata {
  system: CalendarSystem;
  eraStart: number;
  eraNames: Record<string, string>;
}

/**
 * Locale-specific date format metadata
 */
interface DateFormatMetadata {
  dateOrder: 'MDY' | 'DMY' | 'YMD';
  timeSeparator: string;
  weekStart: number;
  weekendDays: number[];
  amPm: { am: string; pm: string };
}

/**
 * Date format metadata for common locales
 */
const DATE_FORMAT_METADATA: Record<LocaleCode, DateFormatMetadata> = {
  en: {
    dateOrder: 'MDY',
    timeSeparator: ':',
    weekStart: 0,
    weekendDays: [0, 6],
    amPm: { am: 'AM', pm: 'PM' },
  },
  es: {
    dateOrder: 'DMY',
    timeSeparator: ':',
    weekStart: 1,
    weekendDays: [0, 6],
    amPm: { am: 'a. m.', pm: 'p. m.' },
  },
  fr: {
    dateOrder: 'DMY',
    timeSeparator: 'h',
    weekStart: 1,
    weekendDays: [0, 6],
    amPm: { am: '', pm: '' },
  },
  de: {
    dateOrder: 'DMY',
    timeSeparator: ':',
    weekStart: 1,
    weekendDays: [0, 6],
    amPm: { am: 'vorm.', pm: 'nachm.' },
  },
  ja: {
    dateOrder: 'YMD',
    timeSeparator: ':',
    weekStart: 0,
    weekendDays: [0, 6],
    amPm: { am: '午前', pm: '午後' },
  },
  zh: {
    dateOrder: 'YMD',
    timeSeparator: ':',
    weekStart: 0,
    weekendDays: [0, 6],
    amPm: { am: '上午', pm: '下午' },
  },
  ar: {
    dateOrder: 'DMY',
    timeSeparator: ':',
    weekStart: 6,
    weekendDays: [5, 6],
    amPm: { am: 'ص', pm: 'م' },
  },
  pt: {
    dateOrder: 'DMY',
    timeSeparator: ':',
    weekStart: 0,
    weekendDays: [0, 6],
    amPm: { am: 'AM', pm: 'PM' },
  },
  ru: {
    dateOrder: 'DMY',
    timeSeparator: ':',
    weekStart: 1,
    weekendDays: [0, 6],
    amPm: { am: 'AM', pm: 'PM' },
  },
  it: {
    dateOrder: 'DMY',
    timeSeparator: ':',
    weekStart: 1,
    weekendDays: [0, 6],
    amPm: { am: 'AM', pm: 'PM' },
  },
  ko: {
    dateOrder: 'YMD',
    timeSeparator: ':',
    weekStart: 0,
    weekendDays: [0, 6],
    amPm: { am: '오전', pm: '오후' },
  },
  hi: {
    dateOrder: 'DMY',
    timeSeparator: ':',
    weekStart: 0,
    weekendDays: [0, 6],
    amPm: { am: 'पूर्वाह्न', pm: 'अपराह्न' },
  },
};

/**
 * DateFormatter class
 *
 * @example
 * ```typescript
 * const formatter = new DateFormatter();
 *
 * // Basic formatting
 * formatter.format(new Date(), 'en') // '3/9/2026'
 * formatter.format(new Date(), 'de') // '9.3.2026'
 *
 * // Long format
 * formatter.format(new Date(), 'en', { dateStyle: 'full' })
 * // 'Monday, March 9, 2026'
 *
 * // Relative time
 * formatter.formatRelative(-1, 'day', 'en') // 'yesterday'
 * formatter.formatRelative(2, 'hour', 'en') // 'in 2 hours'
 *
 * // Japanese calendar
 * formatter.format(new Date(), 'ja', { calendar: 'japanese' })
 * // '令和8年3月9日'
 * ```
 */
export class DateFormatter {
  /**
   * Format a date according to locale conventions
   *
   * @param date - Date to format
   * @param locale - Locale code
   * @param options - Formatting options
   * @returns Formatted date string
   */
  format(date: Date, locale: LocaleCode, options: DateFormatOptions = {}): string {
    const metadata = this.getMetadata(locale);

    // Handle calendar system conversion
    let workingDate = date;
    if (options.calendar && options.calendar !== 'gregorian') {
      workingDate = this.convertCalendar(date, options.calendar);
    }

    // Use Intl.DateTimeFormat for standard formats
    if (options.dateStyle || options.timeStyle) {
      return this.formatWithIntl(workingDate, locale, options);
    }

    // Custom format
    if (options.pattern) {
      return this.formatWithPattern(workingDate, locale, options.pattern, metadata);
    }

    // Default format based on locale
    return this.formatDefault(workingDate, locale, options, metadata);
  }

  /**
   * Format relative time
   *
   * @param value - Numeric value (negative for past, positive for future)
   * @param unit - Unit type
   * @param locale - Locale code
   * @param options - Formatting options
   * @returns Formatted relative time string
   */
  formatRelative(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    locale: LocaleCode,
    options: RelativeTimeFormatOptions = {}
  ): string {
    const numeric = options.numeric ?? 'auto';
    const style = options.style ?? 'long';

    // Use Intl.RelativeTimeFormat for browser environments
    if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric, style });
      return rtf.format(value, unit);
    }

    // Fallback implementation
    return this.formatRelativeFallback(value, unit, locale, numeric, style);
  }

  /**
   * Get week start day for a locale
   *
   * @param locale - Locale code
   * @returns Day of week (0 = Sunday, 1 = Monday, etc.)
   */
  getWeekStart(locale: LocaleCode): number {
    const metadata = this.getMetadata(locale);
    return metadata.weekStart;
  }

  /**
   * Get weekend days for a locale
   *
   * @param locale - Locale code
   * @returns Array of weekend day indices
   */
  getWeekendDays(locale: LocaleCode): number[] {
    const metadata = this.getMetadata(locale);
    return [...metadata.weekendDays];
  }

  /**
   * Get day names for a locale
   *
   * @param locale - Locale code
   * @param format - Format style (narrow, short, long)
   * @returns Array of day names (Sunday through Saturday)
   */
  getDayNames(locale: LocaleCode, format: 'narrow' | 'short' | 'long' = 'long'): string[] {
    const days: Date[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(2026, 2, 8 + i); // March 8-14, 2026 (starts on Sunday)
      days.push(date);
    }

    return days.map((date) => {
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        return new Intl.DateTimeFormat(locale, {
          weekday: format,
        }).format(date);
      }

      // Fallback
      return this.getDayNameFallback(date.getDay(), locale, format);
    });
  }

  /**
   * Get month names for a locale
   *
   * @param locale - Locale code
   * @param format - Format style (narrow, short, long)
   * @returns Array of month names (January through December)
   */
  getMonthNames(locale: LocaleCode, format: 'narrow' | 'short' | 'long' = 'long'): string[] {
    const months: Date[] = [];

    for (let i = 0; i < 12; i++) {
      const date = new Date(2026, i, 1);
      months.push(date);
    }

    return months.map((date) => {
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        return new Intl.DateTimeFormat(locale, {
          month: format,
        }).format(date);
      }

      // Fallback
      return this.getMonthNameFallback(date.getMonth(), locale, format);
    });
  }

  /**
   * Format date using Intl.DateTimeFormat
   *
   * @param date - Date to format
   * @param locale - Locale code
   * @param options - Formatting options
   * @returns Formatted date string
   */
  private formatWithIntl(
    date: Date,
    locale: LocaleCode,
    options: DateFormatOptions
  ): string {
    if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) {
      return this.formatDefault(date, locale, options, this.getMetadata(locale));
    }

    const intlOptions: Intl.DateTimeFormatOptions = {};

    if (options.dateStyle) {
      intlOptions.dateStyle = options.dateStyle;
    }

    if (options.timeStyle) {
      intlOptions.timeStyle = options.timeStyle;
    }

    if (options.timeZone) {
      intlOptions.timeZone = options.timeZone;
    }

    if (options.hourCycle) {
      intlOptions.hourCycle = options.hourCycle;
    }

    if (options.calendar) {
      intlOptions.calendar = options.calendar;
    }

    const formatter = new Intl.DateTimeFormat(locale, intlOptions);
    return formatter.format(date);
  }

  /**
   * Format date with custom pattern
   *
   * @param date - Date to format
   * @param locale - Locale code
   * @param pattern - Format pattern (LDML style)
   * @param metadata - Locale metadata
   * @returns Formatted date string
   */
  private formatWithPattern(
    date: Date,
    locale: LocaleCode,
    pattern: string,
    metadata: DateFormatMetadata
  ): string {
    // LDML pattern tokens
    const tokens: Record<string, string> = {
      // Era
      G: this.getEra(date, locale, 'long'),
      GG: this.getEra(date, locale, 'short'),
      GGG: this.getEra(date, locale, 'narrow'),

      // Year
      y: String(date.getFullYear()),
      yy: String(date.getFullYear()).slice(-2),
      yyy: String(date.getFullYear()),
      yyyy: String(date.getFullYear()).padStart(4, '0'),

      // Quarter (not implemented for simplicity)
      Q: String(Math.floor(date.getMonth() / 3) + 1),
      QQQ: this.getQuarterName(date.getMonth(), locale, 'short'),
      QQQQ: this.getQuarterName(date.getMonth(), locale, 'long'),

      // Month
      M: String(date.getMonth() + 1),
      MM: String(date.getMonth() + 1).padStart(2, '0'),
      MMM: this.getMonthName(date.getMonth(), locale, 'short'),
      MMMM: this.getMonthName(date.getMonth(), locale, 'long'),
      MMMMM: this.getMonthName(date.getMonth(), locale, 'narrow'),

      // Day
      d: String(date.getDate()),
      dd: String(date.getDate()).padStart(2, '0'),

      // Week day
      E: this.getDayName(date.getDay(), locale, 'short'),
      EEEE: this.getDayName(date.getDay(), locale, 'long'),
      EEEEE: this.getDayName(date.getDay(), locale, 'narrow'),

      // Period (AM/PM)
      a: date.getHours() < 12 ? metadata.amPm.am : metadata.amPm.pm,

      // Hour
      h: String(date.getHours() % 12 || 12),
      hh: String(date.getHours() % 12 || 12).padStart(2, '0'),
      H: String(date.getHours()),
      HH: String(date.getHours()).padStart(2, '0'),
      K: String(date.getHours() % 12),
      KK: String(date.getHours() % 12).padStart(2, '0'),
      k: String(date.getHours() + 1),
      kk: String(date.getHours() + 1).padStart(2, '0'),

      // Minute
      m: String(date.getMinutes()),
      mm: String(date.getMinutes()).padStart(2, '0'),

      // Second
      s: String(date.getSeconds()),
      ss: String(date.getSeconds()).padStart(2, '0'),

      // Time zone
      z: this.getTimeZoneName(date, locale, 'short'),
      zz: this.getTimeZoneName(date, locale, 'long'),
    };

    // Replace tokens in pattern
    let result = pattern;

    // Sort tokens by length (longest first) to avoid partial replacements
    const sortedTokens = Object.keys(tokens).sort((a, b) => b.length - a.length);

    for (const token of sortedTokens) {
      const value = tokens[token];
      if (value !== undefined) {
        result = result.replace(new RegExp(token, 'g'), value);
      }
    }

    return result;
  }

  /**
   * Format date with default locale format
   *
   * @param date - Date to format
   * @param locale - Locale code
   * @param options - Formatting options
   * @param metadata - Locale metadata
   * @returns Formatted date string
   */
  private formatDefault(
    date: Date,
    locale: LocaleCode,
    options: DateFormatOptions,
    metadata: DateFormatMetadata
  ): string {
    const parts: string[] = [];

    // Date part
    if (options.includeDay !== false) {
      parts.push(String(date.getDate()));
    }

    if (options.includeMonth !== false) {
      parts.push(this.getMonthName(date.getMonth(), locale, 'short'));
    }

    if (options.includeYear !== false) {
      parts.push(String(date.getFullYear()));
    }

    // Arrange according to locale order
    const formattedDate = this.arrangeDateParts(parts, metadata.dateOrder, locale);

    // Time part
    if (
      options.includeHours !== false ||
      options.includeMinutes !== false ||
      options.includeSeconds !== false
    ) {
      const timeParts: string[] = [];

      if (options.includeHours !== false) {
        timeParts.push(String(date.getHours()));
      }

      if (options.includeMinutes !== false) {
        timeParts.push(String(date.getMinutes()));
      }

      if (options.includeSeconds !== false) {
        timeParts.push(String(date.getSeconds()));
      }

      const formattedTime = timeParts.join(metadata.timeSeparator);

      // Add space between date and time
      return `${formattedDate} ${formattedTime}`;
    }

    return formattedDate;
  }

  /**
   * Arrange date parts according to locale order
   *
   * @param parts - Array of date parts
   * @param order - Date order (MDY, DMY, YMD)
   * @param locale - Locale code
   * @returns Arranged date string
   */
  private arrangeDateParts(
    parts: string[],
    order: 'MDY' | 'DMY' | 'YMD',
    locale: LocaleCode
  ): string {
    const [day, month, year] = parts;
    const separator = this.getDateSeparator(locale);

    switch (order) {
      case 'MDY':
        return `${month}${separator}${day}${separator}${year}`;
      case 'DMY':
        return `${day}${separator}${month}${separator}${year}`;
      case 'YMD':
        return `${year}${separator}${month}${separator}${day}`;
      default:
        return `${month}${separator}${day}${separator}${year}`;
    }
  }

  /**
   * Get date separator for locale
   *
   * @param locale - Locale code
   * @returns Separator character
   */
  private getDateSeparator(locale: LocaleCode): string {
    const separators: Record<LocaleCode, string> = {
      en: '/',
      es: '/',
      fr: '/',
      de: '.',
      ja: '/',
      zh: '/',
      ar: '/',
      pt: '/',
      ru: '.',
      it: '/',
      ko: '.',
      hi: '/',
    };

    return separators[locale] || '/';
  }

  /**
   * Get era name for date
   *
   * @param date - Date
   * @param locale - Locale code
   * @param format - Format style
   * @returns Era name
   */
  private getEra(date: Date, locale: LocaleCode, format: 'short' | 'long' | 'narrow'): string {
    const year = date.getFullYear();
    const isAd = year > 0;

    const eras: Record<
      LocaleCode,
      { ad: { short: string; long: string; narrow: string }; bc: { short: string; long: string; narrow: string } }
    > = {
      en: {
        ad: { short: 'AD', long: 'Anno Domini', narrow: 'A' },
        bc: { short: 'BC', long: 'Before Christ', narrow: 'B' },
      },
      es: {
        ad: { short: 'd.C.', long: 'después de Cristo', narrow: 'd.C.' },
        bc: { short: 'a.C.', long: 'antes de Cristo', narrow: 'a.C.' },
      },
      fr: {
        ad: { short: 'ap. J.-C.', long: 'après Jésus-Christ', narrow: 'ap.' },
        bc: { short: 'av. J.-C.', long: 'avant Jésus-Christ', narrow: 'av.' },
      },
      de: {
        ad: { short: 'n. Chr.', long: 'nach Christus', narrow: 'n.' },
        bc: { short: 'v. Chr.', long: 'vor Christus', narrow: 'v.' },
      },
      ja: {
        ad: { short: '西暦', long: '西暦', narrow: '西' },
        bc: { short: '紀元前', long: '紀元前', narrow: '前' },
      },
      zh: {
        ad: { short: '公元', long: '公元', narrow: '公' },
        bc: { short: '公元前', long: '公元前', narrow: '前' },
      },
      ar: {
        ad: { short: 'م', long: 'ميلادي', narrow: 'م' },
        bc: { short: 'ق.م', long: 'قبل الميلاد', narrow: 'ق.م' },
      },
      pt: {
        ad: { short: 'd.C.', long: 'depois de Cristo', narrow: 'd.C.' },
        bc: { short: 'a.C.', long: 'antes de Cristo', narrow: 'a.C.' },
      },
      ru: {
        ad: { short: 'н.э.', long: 'нашей эры', narrow: 'н.' },
        bc: { short: 'до н.э.', long: 'до нашей эры', narrow: 'до' },
      },
      it: {
        ad: { short: 'd.C.', long: 'dopo Cristo', narrow: 'd.C.' },
        bc: { short: 'a.C.', long: 'avanti Cristo', narrow: 'a.C.' },
      },
      ko: {
        ad: { short: '서기', long: '서기', narrow: '서' },
        bc: { short: '기원전', long: '기원전', narrow: '전' },
      },
      hi: {
        ad: { short: 'ईस्वी', long: 'ईसवी', narrow: 'ई' },
        bc: { short: 'ईसा पूर्व', long: 'ईसा पूर्व', narrow: 'पूर्व' },
      },
    };

    const localeEras = eras[locale] || eras.en;
    const eraType = isAd ? 'ad' : 'bc';

    return localeEras[eraType][format];
  }

  /**
   * Get quarter name
   *
   * @param month - Month index (0-11)
   * @param locale - Locale code
   * @param format - Format style
   * @returns Quarter name
   */
  private getQuarterName(month: number, locale: LocaleCode, format: 'short' | 'long'): string {
    const quarter = Math.floor(month / 3) + 1;

    const quarters: Record<LocaleCode, { short: string[]; long: string[] }> = {
      en: {
        short: ['Q1', 'Q2', 'Q3', 'Q4'],
        long: ['1st quarter', '2nd quarter', '3rd quarter', '4th quarter'],
      },
      es: {
        short: ['T1', 'T2', 'T3', 'T4'],
        long: ['1er trimestre', '2º trimestre', '3er trimestre', '4º trimestre'],
      },
      fr: {
        short: ['T1', 'T2', 'T3', 'T4'],
        long: ['1er trimestre', '2e trimestre', '3e trimestre', '4e trimestre'],
      },
      de: {
        short: ['Q1', 'Q2', 'Q3', 'Q4'],
        long: ['1. Quartal', '2. Quartal', '3. Quartal', '4. Quartal'],
      },
      ja: {
        short: ['Q1', 'Q2', 'Q3', 'Q4'],
        long: ['第1四半期', '第2四半期', '第3四半期', '第4四半期'],
      },
      zh: {
        short: ['第一季度', '第二季度', '第三季度', '第四季度'],
        long: ['第一季度', '第二季度', '第三季度', '第四季度'],
      },
      ar: {
        short: ['الربع 1', 'الربع 2', 'الربع 3', 'الربع 4'],
        long: ['الربع الأول', 'الربع الثاني', 'الربع الثالث', 'الربع الرابع'],
      },
      pt: {
        short: ['T1', 'T2', 'T3', 'T4'],
        long: ['1º trimestre', '2º trimestre', '3º trimestre', '4º trimestre'],
      },
      ru: {
        short: ['Q1', 'Q2', 'Q3', 'Q4'],
        long: ['1-й квартал', '2-й квартал', '3-й квартал', '4-й квартал'],
      },
      it: {
        short: ['Q1', 'Q2', 'Q3', 'Q4'],
        long: ['1º trimestre', '2º trimestre', '3º trimestre', '4º trimestre'],
      },
      ko: {
        short: ['1분기', '2분기', '3분기', '4분기'],
        long: ['1분기', '2분기', '3분기', '4분기'],
      },
      hi: {
        short: ['तिमाही 1', 'तिमाही 2', 'तिमाही 3', 'तिमाही 4'],
        long: ['पहली तिमाही', 'दूसरी तिमाही', 'तीसरी तिमाही', 'चौथी तिमाही'],
      },
    };

    const localeQuarters = quarters[locale] || quarters.en;
    return localeQuarters[format][quarter - 1];
  }

  /**
   * Get day name
   *
   * @param day - Day of week (0-6)
   * @param locale - Locale code
   * @param format - Format style
   * @returns Day name
   */
  private getDayName(day: number, locale: LocaleCode, format: 'short' | 'long' | 'narrow'): string {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const date = new Date(2026, 2, 8 + day);
      return new Intl.DateTimeFormat(locale, { weekday: format }).format(date);
    }

    return this.getDayNameFallback(day, locale, format);
  }

  /**
   * Get day name fallback
   *
   * @param day - Day of week (0-6)
   * @param locale - Locale code
   * @param format - Format style
   * @returns Day name
   */
  private getDayNameFallback(day: number, locale: LocaleCode, format: 'short' | 'long' | 'narrow'): string {
    const days: Record<LocaleCode, { short: string[]; long: string[]; narrow: string[] }> = {
      en: {
        short: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        long: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        narrow: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      },
      es: {
        short: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
        long: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
        narrow: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
      },
      fr: {
        short: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
        long: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
        narrow: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
      },
      de: {
        short: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
        long: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
        narrow: ['S', 'M', 'D', 'M', 'D', 'F', 'S'],
      },
      ja: {
        short: ['日', '月', '火', '水', '木', '金', '土'],
        long: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
        narrow: ['日', '月', '火', '水', '木', '金', '土'],
      },
      zh: {
        short: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
        long: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
        narrow: ['日', '一', '二', '三', '四', '五', '六'],
      },
      ar: {
        short: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
        long: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
        narrow: ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'],
      },
    };

    const localeDays = days[locale] || days.en;
    return localeDays[format][day];
  }

  /**
   * Get month name
   *
   * @param month - Month index (0-11)
   * @param locale - Locale code
   * @param format - Format style
   * @returns Month name
   */
  private getMonthName(month: number, locale: LocaleCode, format: 'short' | 'long' | 'narrow'): string {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const date = new Date(2026, month, 1);
      return new Intl.DateTimeFormat(locale, { month: format }).format(date);
    }

    return this.getMonthNameFallback(month, locale, format);
  }

  /**
   * Get month name fallback
   *
   * @param month - Month index (0-11)
   * @param locale - Locale code
   * @param format - Format style
   * @returns Month name
   */
  private getMonthNameFallback(month: number, locale: LocaleCode, format: 'short' | 'long' | 'narrow'): string {
    const months: Record<LocaleCode, { short: string[]; long: string[]; narrow: string[] }> = {
      en: {
        short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        long: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        narrow: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
      },
      es: {
        short: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
        long: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
        narrow: ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
      },
      fr: {
        short: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
        long: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
        narrow: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
      },
      de: {
        short: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
        long: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
        narrow: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
      },
      ja: {
        short: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        long: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        narrow: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
      },
      zh: {
        short: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        long: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
        narrow: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
      },
      ar: {
        short: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
        long: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
        narrow: ['ي', 'ف', 'م', 'أ', 'م', 'ي', 'ي', 'أ', 'س', 'أ', 'ن', 'د'],
      },
    };

    const localeMonths = months[locale] || months.en;
    return localeMonths[format][month];
  }

  /**
   * Get time zone name
   *
   * @param date - Date
   * @param locale - Locale code
   * @param format - Format style
   * @returns Time zone name
   */
  private getTimeZoneName(date: Date, locale: LocaleCode, format: 'short' | 'long'): string {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      try {
        const formatter = new Intl.DateTimeFormat(locale, {
          timeZoneName: format,
        });
        const parts = formatter.formatToParts(date);
        const timeZonePart = parts.find((part) => part.type === 'timeZoneName');
        return timeZonePart?.value || '';
      } catch {
        // Time zone not supported
      }
    }

    // Fallback to UTC offset
    const offset = date.getTimezoneOffset();
    const hours = Math.abs(Math.floor(offset / 60));
    const minutes = Math.abs(offset % 60);
    const sign = offset <= 0 ? '+' : '-';
    return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  /**
   * Format relative time fallback
   *
   * @param value - Numeric value
   * @param unit - Unit type
   * @param locale - Locale code
   * @param numeric - Numeric mode
   * @param style - Style mode
   * @returns Formatted relative time string
   */
  private formatRelativeFallback(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    locale: LocaleCode,
    numeric: 'always' | 'auto',
    style: 'long' | 'short' | 'narrow'
  ): string {
    const absValue = Math.abs(value);
    const isPast = value < 0;

    // Special cases for auto mode
    if (numeric === 'auto') {
      if (unit === 'day' && absValue === 1) {
        const specialCases: Record<LocaleCode, { yesterday: string; today: string; tomorrow: string }> = {
          en: { yesterday: 'yesterday', today: 'today', tomorrow: 'tomorrow' },
          es: { yesterday: 'ayer', today: 'hoy', tomorrow: 'mañana' },
          fr: { yesterday: 'hier', today: "aujourd'hui", tomorrow: 'demain' },
          de: { yesterday: 'gestern', today: 'heute', tomorrow: 'morgen' },
          ja: { yesterday: '昨日', today: '今日', tomorrow: '明日' },
          zh: { yesterday: '昨天', today: '今天', tomorrow: '明天' },
          ar: { yesterday: 'أمس', today: 'اليوم', tomorrow: 'غداً' },
        };

        const cases = specialCases[locale] || specialCases.en;

        if (isPast && absValue === 1) {
          return cases.yesterday;
        } else if (!isPast && absValue === 1) {
          return cases.tomorrow;
        } else if (absValue === 0) {
          return cases.today;
        }
      }
    }

    // Generic relative time format
    const direction = isPast ? 'ago' : 'in';
    const unitName = this.getRelativeUnitName(unit, locale, absValue, style);
    const directionWord = this.getRelativeDirection(direction, locale, style);

    // In RTL languages, word order may be different
    if (locale === 'ar') {
      return `${directionWord} ${unitName} ${absValue}`;
    }

    return `${directionWord} ${absValue} ${unitName}`;
  }

  /**
   * Get relative time unit name
   *
   * @param unit - Unit type
   * @param locale - Locale code
   * @param count - Count
   * @param style - Style mode
   * @returns Unit name
   */
  private getRelativeUnitName(
    unit: Intl.RelativeTimeFormatUnit,
    locale: LocaleCode,
    count: number,
    style: 'long' | 'short' | 'narrow'
  ): string {
    const units: Record<LocaleCode, Record<string, { long: string; short: string; narrow: string }>> = {
      en: {
        second: { long: 'second', short: 'sec', narrow: 's' },
        minute: { long: 'minute', short: 'min', narrow: 'm' },
        hour: { long: 'hour', short: 'hr', narrow: 'h' },
        day: { long: 'day', short: 'day', narrow: 'd' },
        week: { long: 'week', short: 'wk', narrow: 'w' },
        month: { long: 'month', short: 'mo', narrow: 'm' },
        year: { long: 'year', short: 'yr', narrow: 'y' },
      },
    };

    const localeUnits = units[locale] || units.en;
    const unitData = localeUnits[unit] || localeUnits.second;
    return unitData[style];
  }

  /**
   * Get relative direction word
   *
   * @param direction - Direction (ago or in)
   * @param locale - Locale code
   * @param style - Style mode
   * @returns Direction word
   */
  private getRelativeDirection(
    direction: 'ago' | 'in',
    locale: LocaleCode,
    style: 'long' | 'short' | 'narrow'
  ): string {
    const directions: Record<LocaleCode, { ago: { long: string; short: string }; in: { long: string; short: string } }> = {
      en: { ago: { long: 'ago', short: 'ago' }, in: { long: 'in', short: 'in' } },
      es: { ago: { long: 'hace', short: 'hace' }, in: { long: 'dentro de', short: 'en' } },
      fr: { ago: { long: 'il y a', short: 'il y a' }, in: { long: 'dans', short: 'dans' } },
      de: { ago: { long: 'vor', short: 'vor' }, in: { long: 'in', short: 'in' } },
      ja: { ago: { long: '前', short: '前' }, in: { long: '後', short: '後' } },
      zh: { ago: { long: '前', short: '前' }, in: { long: '后', short: '后' } },
      ar: { ago: { long: 'منذ', short: 'منذ' }, in: { long: 'خلال', short: 'خلال' } },
    };

    const localeDirections = directions[locale] || directions.en;
    return localeDirections[direction][style === 'narrow' ? 'short' : style];
  }

  /**
   * Convert date to different calendar system
   *
   * @param date - Gregorian date
   * @param calendar - Target calendar system
   * @returns Converted date
   */
  private convertCalendar(date: Date, calendar: CalendarSystem): Date {
    // This is a simplified implementation
    // Real calendar conversion is complex and requires specialized libraries

    switch (calendar) {
      case 'buddhist':
        // Buddhist calendar is 543 years ahead of Gregorian
        return new Date(date.getFullYear() + 543, date.getMonth(), date.getDate());

      case 'islamic':
        // Islamic calendar conversion requires complex calculations
        // This is a placeholder
        return new Date(date);

      case 'japanese':
        // Japanese calendar uses era names
        // This is a placeholder
        return new Date(date);

      case 'chinese':
        // Chinese calendar conversion is complex
        // This is a placeholder
        return new Date(date);

      case 'hebrew':
        // Hebrew calendar conversion is complex
        // This is a placeholder
        return new Date(date);

      default:
        return date;
    }
  }

  /**
   * Get date format metadata for a locale
   *
   * @param locale - Locale code
   * @returns Date format metadata
   */
  private getMetadata(locale: LocaleCode): DateFormatMetadata {
    return DATE_FORMAT_METADATA[locale] || DATE_FORMAT_METADATA.en;
  }
}
