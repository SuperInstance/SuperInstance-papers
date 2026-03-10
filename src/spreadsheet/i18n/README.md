# POLLN Spreadsheet Internationalization (i18n) System

A comprehensive, production-ready internationalization system for the POLLN spreadsheet application. Supports multiple languages with RTL (right-to-left) text direction, proper number/date/currency formatting, pluralization, and formula translation.

## Features

### Core Features

- **Multi-language Support**: 12+ languages including English, Spanish, French, German, Japanese, Chinese, Arabic, and more
- **RTL Support**: Full right-to-left text direction support for Arabic and other RTL languages
- **Number Formatting**: Locale-specific number formatting with proper decimal/thousand separators
- **Date/Time Formatting**: Localized date and time formatting with multiple calendar systems
- **Currency Formatting**: Automatic currency symbol placement and formatting
- **Pluralization**: CLDR-compliant plural rules for all supported languages
- **Formula Translation**: Spreadsheet function names translated across languages
- **React Hooks**: Easy-to-use React hooks for seamless integration
- **TypeScript**: Full TypeScript support with comprehensive type definitions
- **Hot Reload**: Development mode with hot reload for translation changes

## Installation

The i18n system is included in the POLLN spreadsheet package. No additional installation required.

## Quick Start

### Basic Usage

```typescript
import { I18nManager } from '@polln/spreadsheet/i18n';

// Create and initialize the i18n manager
const i18n = new I18nManager();
await i18n.init();

// Simple translation
const title = i18n.t('ui.common.save'); // "Save"

// Translation with parameters
const message = i18n.t('ui.welcome.user', { name: 'John' });
// "Welcome, John!"

// Format numbers
const formatted = i18n.formatNumber(1234.56, {
  style: 'currency',
  currency: 'USD'
}); // "$1,234.56"

// Change locale
await i18n.setLocale('es');
i18n.t('ui.common.save'); // "Guardar"
```

### React Integration

```tsx
import { I18nProvider, useI18n } from '@polln/spreadsheet/i18n';

function App() {
  return (
    <I18nProvider initialLocale="es">
      <MyComponent />
    </I18nProvider>
  );
}

function MyComponent() {
  const { t, locale, changeLocale, isRTL } = useI18n();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1>{t('ui.common.title')}</h1>
      <p>{t('ui.plurals.item', { count: 5 })}</p>
      <button onClick={() => changeLocale('fr')}>
        Français
      </button>
    </div>
  );
}
```

## Supported Languages

| Language | Code | RTL | Plural Forms |
|----------|-----|-----|--------------|
| English | `en` | No | one, other |
| Spanish | `es` | No | one, other |
| French | `fr` | No | one, other |
| German | `de` | No | one, other |
| Japanese | `ja` | No | other |
| Chinese | `zh` | No | other |
| Arabic | `ar` | Yes | zero, one, two, few, many, other |
| Portuguese | `pt` | No | one, other |
| Russian | `ru` | No | one, few, many, other |
| Italian | `it` | No | one, other |
| Korean | `ko` | No | other |
| Hindi | `hi` | No | one, other |

## API Reference

### I18nManager

Main class for managing internationalization.

#### Constructor

```typescript
new I18nManager(config?: I18nConfig)
```

**Config Options:**

- `defaultLocale`: Default locale (default: `'en'`)
- `fallbackLocale`: Fallback locale (default: `'en'`)
- `supportedLocales`: Array of supported locales
- `debug`: Enable debug mode (default: `false`)
- `localesBaseUrl`: Base URL for translation files (default: `'/locales'`)
- `hotReload`: Enable hot reload (default: `false`)
- `cache`: Cache translations (default: `true`)

#### Methods

##### `init(locale?: LocaleCode): Promise<void>`

Initialize the i18n manager and load translations.

##### `t(key: string, params?: Record<string, unknown>): string`

Translate a key with optional parameters.

```typescript
i18n.t('ui.common.save'); // "Save"
i18n.t('ui.welcome.user', { name: 'John' }); // "Welcome, John!"
i18n.t('ui.plurals.item', { count: 5 }); // "5 items"
```

##### `setLocale(locale: string): Promise<void>`

Change the current locale.

##### `getLocale(): string`

Get the current locale.

##### `getSupportedLocales(): string[]`

Get all supported locales.

##### `isRTL(): boolean`

Check if the current locale is RTL (right-to-left).

##### `formatNumber(value: number, options?: NumberFormatOptions): string`

Format a number according to locale conventions.

```typescript
i18n.formatNumber(1234.56); // "1,234.56" (en)
i18n.formatNumber(1234.56); // "1.234,56" (de)

i18n.formatNumber(1234.56, {
  style: 'currency',
  currency: 'USD'
}); // "$1,234.56"

i18n.formatNumber(0.1234, {
  style: 'percent'
}); // "12.34%"
```

##### `formatDate(date: Date, options?: DateFormatOptions): string`

Format a date according to locale conventions.

```typescript
i18n.formatDate(new Date()); // "3/9/2026" (en)
i18n.formatDate(new Date(), { dateStyle: 'full' }); // "Monday, March 9, 2026"
```

##### `formatCurrency(value: number, currency: string): string`

Format currency with proper symbol placement.

```typescript
i18n.formatCurrency(1234.56, 'USD'); // "$1,234.56"
i18n.formatCurrency(1234.56, 'EUR'); // "1.234,56 €" (de)
```

##### `translateFormula(formulaName: string): string`

Translate a formula name to the current locale.

```typescript
i18n.translateFormula('SUM'); // "SUMA" (es)
i18n.translateFormula('AVERAGE'); // "MOYENNE" (fr)
```

### React Hooks

#### `useI18n()`

Main hook for accessing i18n functionality.

```typescript
const {
  i18n,           // I18nManager instance
  locale,         // Current locale
  t,              // Translation function
  formatNumber,   // Number formatter
  formatDate,     // Date formatter
  changeLocale,   // Function to change locale
  isRTL,          // Is RTL locale
  isLoading       // Is loading
} = useI18n();
```

#### `useTranslation()`

Simplified hook that only returns the translation function.

```typescript
const t = useTranslation();
return <h1>{t('ui.common.title')}</h1>;
```

#### `useLocale()`

Hook for locale management.

```typescript
const { locale, changeLocale, isLoading } = useLocale();
```

#### `useFormattedNumber()`

Hook for number formatting.

```typescript
const formatNumber = useFormattedNumber();
return <p>{formatNumber(1234.56)}</p>;
```

#### `useFormattedDate()`

Hook for date formatting.

```typescript
const formatDate = useFormattedDate();
return <p>{formatDate(new Date())}</p>;
```

#### `useRTL()`

Hook for RTL detection.

```typescript
const isRTL = useRTL();
return <div dir={isRTL ? 'rtl' : 'ltr'}>Content</div>;
```

#### `usePlural()`

Hook for pluralization.

```typescript
const plural = usePlural();
return <p>{plural(5, 'ui.plurals.item')}</p>; // "5 items"
```

## Translation Files

Translation files are stored in `src/spreadsheet/i18n/locales/` as JSON files.

### Structure

```json
{
  "locale": "en",
  "languageName": "English",
  "languageNameEnglish": "English",
  "direction": "ltr",
  "messages": {
    "ui": {
      "common": {
        "save": "Save",
        "cancel": "Cancel"
      }
    },
    "plurals": {
      "item": {
        "one": "{{count}} item",
        "other": "{{count}} items"
      }
    }
  },
  "formats": {
    "decimalSeparator": ".",
    "thousandsSeparator": ",",
    "dateOrder": "MDY"
  },
  "formulas": {
    "SUM": {
      "name": "SUM",
      "localName": "SUM",
      "syntax": "SUM(number1, [number2], ...)",
      "description": "Adds all the numbers in a range of cells"
    }
  }
}
```

## Number Formatting

### Locale-Specific Separators

| Locale | Decimal | Thousands |
|--------|---------|-----------|
| English | `.` | `,` |
| German | `,` | `.` |
| French | `,` | ` ` |
| Spanish | `,` | `.` |

### Formatting Options

```typescript
interface NumberFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  minimumSignificantDigits?: number;
  maximumSignificantDigits?: number;
  useGrouping?: boolean;
  style?: 'decimal' | 'currency' | 'percent' | 'unit';
  currency?: string;
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
  scientificNotation?: boolean;
  compactDisplay?: 'short' | 'long';
  unit?: string;
  unitDisplay?: 'long' | 'short' | 'narrow';
}
```

## Date Formatting

### Supported Calendars

- Gregorian (default)
- Buddhist
- Islamic
- Japanese
- Chinese
- Hebrew

### Formatting Options

```typescript
interface DateFormatOptions {
  calendar?: CalendarSystem;
  timeZone?: string;
  hourCycle?: 'h11' | 'h12' | 'h23' | 'h24';
  format?: 'full' | 'long' | 'medium' | 'short' | 'custom';
  pattern?: string;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  includeEra?: boolean;
  includeWeekday?: boolean;
  includeYear?: boolean;
  includeMonth?: boolean;
  includeDay?: boolean;
  includeHours?: boolean;
  includeMinutes?: boolean;
  includeSeconds?: boolean;
  includeTimeZone?: boolean;
}
```

## Pluralization

The system supports CLDR plural rules:

- **zero**: For languages that have a special form for 0 (Arabic)
- **one**: Singular form (English: "1 book")
- **two**: Dual form (Arabic: "٢ كتابان")
- **few**: Few form (Arabic: "٣ كتب")
- **many**: Many form (Arabic: "١١ كتابًا")
- **other**: Default plural form (English: "2 books")

### Usage

```typescript
// In translation file
{
  "plurals": {
    "item": {
      "one": "{{count}} item",
      "other": "{{count}} items"
    }
  }
}

// In code
i18n.t('ui.plurals.item', { count: 1 }); // "1 item"
i18n.t('ui.plurals.item', { count: 5 }); // "5 items"
```

## Formula Translation

Spreadsheet functions are translated across languages:

| English | Spanish | French | German |
|---------|---------|--------|--------|
| SUM | SUMA | SOMME | SUMME |
| AVERAGE | PROMEDIO | MOYENNE | MITTELWERT |
| IF | SI | SI | WENN |
| VLOOKUP | BUSCARV | RECHERCHEV | SVERWEIS |

### Usage

```typescript
i18n.translateFormula('SUM'); // "SUMA" (es)
i18n.translateFormula('IF'); // "SI" (es)

// Translate complete formula
translator.translateFormula('=SUM(A1,B1)', 'es'); // "=SUMA(A1;B1)"
```

## RTL Support

Right-to-left text direction is fully supported for Arabic and other RTL languages.

### Detection

```typescript
i18n.isRTL(); // true for Arabic, false for others
i18n.getDirection(); // 'rtl' or 'ltr'
```

### React Example

```tsx
function MyComponent() {
  const { isRTL } = useI18n();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Content automatically lays out correctly */}
    </div>
  );
}
```

## Testing

The i18n system includes comprehensive tests:

```bash
# Run all i18n tests
npm test -- src/spreadsheet/i18n/

# Run specific test file
npm test -- src/spreadsheet/i18n/I18nManager.test.ts

# Run with coverage
npm run test:coverage -- src/spreadsheet/i18n/
```

## Best Practices

1. **Always wrap your app with `I18nProvider`** when using React
2. **Use translation keys consistently** across the application
3. **Provide context in key names** (e.g., `ui.common.save` vs `save`)
4. **Include parameters for dynamic content** using `{{param}}` syntax
5. **Test with RTL languages** to ensure proper layout
6. **Format numbers/dates using the i18n system**, not manual formatting
7. **Handle missing translations** gracefully with fallbacks

## Performance

- Translations are cached in memory after loading
- Hot reload is available in development mode
- Lazy loading of locale files
- Efficient plural form calculation
- Minimal re-renders with React hooks

## Browser Support

- Modern browsers with ES2022 support
- Requires `Intl` API support (available in all modern browsers)
- Fallback implementations for older browsers

## Contributing

To add a new language:

1. Create a new locale file in `locales/` (e.g., `it.json`)
2. Translate all UI messages
3. Add locale-specific formatting rules
4. Translate formula names
5. Add plural forms if needed
6. Update the supported locales list
7. Add tests for the new locale

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions, please visit the POLLN repository.
