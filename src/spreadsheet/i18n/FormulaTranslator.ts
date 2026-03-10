/**
 * FormulaTranslator - Translate spreadsheet formulas between languages
 *
 * Handles:
 * - Function name translation (SUM -> SOMME in French)
 * - Formula syntax localization (comma vs semicolon separators)
 * - Bilingual formula support
 * - Parameter name translation
 * - Example translation
 *
 * @module spreadsheet/i18n
 */

import type {
  LocaleCode,
  FormulaTranslation,
} from './types.js';

/**
 * Standard spreadsheet function names (English)
 */
const STANDARD_FUNCTIONS = [
  // Basic functions
  'SUM', 'AVERAGE', 'COUNT', 'COUNTA', 'COUNTBLANK', 'COUNTIF',
  'MIN', 'MAX', 'PRODUCT', 'STDEV', 'STDEVP', 'VAR', 'VARP',
  'MEDIAN', 'MODE', 'LARGE', 'SMALL',

  // Logical functions
  'IF', 'AND', 'OR', 'NOT', 'XOR', 'IFERROR', 'IFNA',

  // Text functions
  'CONCATENATE', 'LEFT', 'RIGHT', 'MID', 'LEN', 'LOWER', 'UPPER',
  'PROPER', 'TRIM', 'SUBSTITUTE', 'REPLACE', 'FIND', 'SEARCH',
  'TEXT', 'VALUE', 'EXACT',

  // Date/Time functions
  'DATE', 'TIME', 'NOW', 'TODAY', 'YEAR', 'MONTH', 'DAY', 'HOUR',
  'MINUTE', 'SECOND', 'WEEKDAY', 'WEEKNUM', 'EDATE', 'EOMONTH',
  'WORKDAY', 'NETWORKDAYS', 'DATEDIF',

  // Lookup functions
  'VLOOKUP', 'HLOOKUP', 'LOOKUP', 'INDEX', 'MATCH', 'OFFSET',
  'INDIRECT', 'CHOOSE',

  // Math functions
  'ABS', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'INT', 'TRUNC', 'CEILING',
  'FLOOR', 'POWER', 'SQRT', 'LOG', 'LOG10', 'LN', 'EXP', 'PI',
  'RAND', 'RANDBETWEEN', 'MOD', 'QUOTIENT',

  // Statistical functions
  'CORREL', 'COVARIANCE', 'FORECAST', 'GROWTH', 'INTERCEPT', 'SLOPE',
  'TREND', 'LINEST', 'LOGEST',

  // Financial functions
  'PMT', 'IPMT', 'PPMT', 'PV', 'FV', 'RATE', 'NPV', 'IRR',

  // Information functions
  'ISBLANK', 'ISERROR', 'ISNUMBER', 'ISTEXT', 'ISLOGICAL', 'ISNA',
  'ISREF', 'ISFORMULA', 'CELL', 'INFO', 'ERROR', 'TYPE', 'NA',

  // Database functions
  'DSUM', 'DAVERAGE', 'DCOUNT', 'DMIN', 'DMAX',

  // Array functions
  'SUMPRODUCT', 'SUMSQ', 'TRANSPOSE', 'MMULT', 'MUNIT',

  // Conditional
  'SUMIF', 'SUMIFS', 'AVERAGEIF', 'AVERAGEIFS', 'COUNTIF', 'COUNTIFS',
];

/**
 * Function name translations for each locale
 */
const FUNCTION_TRANSLATIONS: Record<
  LocaleCode,
  Record<string, string> | undefined
> = {
  en: undefined, // English is the default

  es: {
    SUM: 'SUMA',
    AVERAGE: 'PROMEDIO',
    COUNT: 'CONTAR',
    COUNTA: 'CONTARA',
    COUNTBLANK: 'CONTAR.BLANCO',
    COUNTIF: 'CONTAR.SI',
    MIN: 'MIN',
    MAX: 'MAX',
    PRODUCT: 'PRODUCTO',
    STDEV: 'DESVEST',
    STDEVP: 'DESVEST.P',
    VAR: 'VAR',
    VARP: 'VAR.P',
    MEDIAN: 'MEDIANA',
    MODE: 'MODA',
    LARGE: 'K.ESIMO.MAYOR',
    SMALL: 'K.ESIMO.MENOR',
    IF: 'SI',
    AND: 'Y',
    OR: 'O',
    NOT: 'NO',
    IFERROR: 'SI.ERROR',
    IFNA: 'SI.NA',
    CONCATENATE: 'CONCATENAR',
    LEFT: 'IZQUIERDA',
    RIGHT: 'DERECHA',
    MID: 'EXTRAE',
    LEN: 'LARGO',
    LOWER: 'MINUSC',
    UPPER: 'MAYUSC',
    PROPER: 'NOMPROPIO',
    TRIM: 'ESPACIOS',
    SUBSTITUTE: 'SUSTITUIR',
    REPLACE: 'REEMPLAZAR',
    FIND: 'ENCONTRAR',
    SEARCH: 'HALLAR',
    TEXT: 'TEXTO',
    VALUE: 'VALOR',
    EXACT: 'IGUAL',
    DATE: 'FECHA',
    TIME: 'NSHORA',
    NOW: 'AHORA',
    TODAY: 'HOY',
    YEAR: 'AÑO',
    MONTH: 'MES',
    DAY: 'DIA',
    HOUR: 'HORA',
    MINUTE: 'MINUTO',
    SECOND: 'SEGUNDO',
    WEEKDAY: 'DIASEM',
    WEEKNUM: 'NUM.DE.SEMANA',
    VLOOKUP: 'BUSCARV',
    HLOOKUP: 'BUSCARH',
    LOOKUP: 'BUSCAR',
    INDEX: 'INDICE',
    MATCH: 'COINCIDIR',
    OFFSET: 'DESREF',
    INDIRECT: 'INDIRECTO',
    ABS: 'ABS',
    ROUND: 'REDONDEAR',
    ROUNDUP: 'REDONDEAR.MAS',
    ROUNDDOWN: 'REDONDEAR.MENOS',
    INT: 'ENTERO',
    TRUNC: 'TRUNCAR',
    CEILING: 'REDONDEAR.ARRIBA',
    FLOOR: 'REDONDEAR.ABAJO',
    POWER: 'POTENCIA',
    SQRT: 'RAIZ',
    LOG: 'LOG',
    LOG10: 'LOG10',
    LN: 'LN',
    EXP: 'EXP',
    PI: 'PI',
    RAND: 'ALEATORIO',
    RANDBETWEEN: 'ALEATORIO.ENTRE',
    MOD: 'RESIDUO',
    SUMIF: 'SUMAR.SI',
    SUMIFS: 'SUMAR.SI.CONJUNTO',
    AVERAGEIF: 'PROMEDIO.SI',
    AVERAGEIFS: 'PROMEDIO.SI.CONJUNTO',
  },

  fr: {
    SUM: 'SOMME',
    AVERAGE: 'MOYENNE',
    COUNT: 'NB',
    COUNTA: 'NBVAL',
    COUNTBLANK: 'NB.VIDE',
    COUNTIF: 'NB.SI',
    MIN: 'MIN',
    MAX: 'MAX',
    PRODUCT: 'PRODUIT',
    STDEV: 'ECARTYPE',
    STDEVP: 'ECARTYPEP',
    VAR: 'VAR',
    VARP: 'VAR.P',
    MEDIAN: 'MEDIANE',
    MODE: 'MODE',
    LARGE: 'GRANDE.VALEUR',
    SMALL: 'PETITE.VALEUR',
    IF: 'SI',
    AND: 'ET',
    OR: 'OU',
    NOT: 'NON',
    IFERROR: 'SIERREUR',
    IFNA: 'SI.NA',
    CONCATENATE: 'CONCATENER',
    LEFT: 'GAUCHE',
    RIGHT: 'DROITE',
    MID: 'STXT',
    LEN: 'NBCAR',
    LOWER: 'MINUSCULE',
    UPPER: 'MAJUSCULE',
    PROPER: 'NOMPROPRE',
    TRIM: 'SUPPRESPACE',
    SUBSTITUTE: 'SUBSTITUE',
    REPLACE: 'REMNPLACER',
    FIND: 'TROUVE',
    SEARCH: 'CHERCHE',
    TEXT: 'TEXTE',
    VALUE: 'CNUM',
    EXACT: 'EXACT',
    DATE: 'DATE',
    TIME: 'TEMPS',
    NOW: 'MAINTENANT',
    TODAY: 'AUJOURDHUI',
    YEAR: 'ANNEE',
    MONTH: 'MOIS',
    DAY: 'JOUR',
    HOUR: 'HEURE',
    MINUTE: 'MINUTE',
    SECOND: 'SECONDE',
    WEEKDAY: 'JOURSEM',
    WEEKNUM: 'NO.SEMAINE',
    VLOOKUP: 'RECHERCHEV',
    HLOOKUP: 'RECHERCHEH',
    LOOKUP: 'RECHERCHE',
    INDEX: 'INDEX',
    MATCH: 'EQUIV',
    OFFSET: 'DECALER',
    INDIRECT: 'INDIRECT',
    ABS: 'ABS',
    ROUND: 'ARRONDI',
    ROUNDUP: 'ARRONDI.SUP',
    ROUNDDOWN: 'ARRONDI.INF',
    INT: 'ENT',
    TRUNC: 'TRONQUE',
    CEILING: 'PLAFOND',
    FLOOR: 'PLANCHER',
    POWER: 'PUISSANCE',
    SQRT: 'RACINE',
    LOG: 'LOG',
    LOG10: 'LOG10',
    LN: 'LN',
    EXP: 'EXP',
    PI: 'PI',
    RAND: 'ALEA',
    RANDBETWEEN: 'ALEA.ENTRE.BORNES',
    MOD: 'MOD',
    SUMIF: 'SOMME.SI',
    SUMIFS: 'SOMME.SI.ENS',
    AVERAGEIF: 'MOYENNE.SI',
    AVERAGEIFS: 'MOYENNE.SI.ENS',
  },

  de: {
    SUM: 'SUMME',
    AVERAGE: 'MITTELWERT',
    COUNT: 'ANZAHL',
    COUNTA: 'ANZAHL2',
    COUNTBLANK: 'ANZAHLLEEREZELLEN',
    COUNTIF: 'ZÄHLENWENN',
    MIN: 'MIN',
    MAX: 'MAX',
    PRODUCT: 'PRODUKT',
    STDEV: 'STABW',
    STDEVP: 'STABWN',
    VAR: 'VARIANZ',
    VARP: 'VARIANZEN',
    MEDIAN: 'MEDIAN',
    MODE: 'MODALWERT',
    LARGE: 'KGRÖSSTE',
    SMALL: 'KKLEINSTE',
    IF: 'WENN',
    AND: 'UND',
    OR: 'ODER',
    NOT: 'NICHT',
    IFERROR: 'WENNFEHLER',
    IFNA: 'WENNNV',
    CONCATENATE: 'VERKETTEN',
    LEFT: 'LINKS',
    RIGHT: 'RECHTS',
    MID: 'TEIL',
    LEN: 'LÄNGE',
    LOWER: 'KLEIN',
    UPPER: 'GROSS',
    PROPER: 'GROSS2',
    TRIM: 'GLÄTTEN',
    SUBSTITUTE: 'WECHSELN',
    REPLACE: 'ERSETZEN',
    FIND: 'FINDEN',
    SEARCH: 'SUCHEN',
    TEXT: 'TEXT',
    VALUE: 'WERT',
    EXACT: 'IDENTISCH',
    DATE: 'DATUM',
    TIME: 'ZEIT',
    NOW: 'JETZT',
    TODAY: 'HEUTE',
    YEAR: 'JAHR',
    MONTH: 'MONAT',
    DAY: 'TAG',
    HOUR: 'STUNDE',
    MINUTE: 'MINUTE',
    SECOND: 'SEKUNDE',
    WEEKDAY: 'WOCHENTAG',
    WEEKNUM: 'KALENDERWOCHE',
    VLOOKUP: 'SVERWEIS',
    HLOOKUP: 'WVERWEIS',
    LOOKUP: 'VERWEIS',
    INDEX: 'INDEX',
    MATCH: 'VERGLEICH',
    OFFSET: 'BEREICH.VERSCHIEBEN',
    INDIRECT: 'INDIREKT',
    ABS: 'ABS',
    ROUND: 'RUNDEN',
    ROUNDUP: 'RUNDEN.AUF',
    ROUNDDOWN: 'RUNDEN.AB',
    INT: 'GANZZAHL',
    TRUNC: 'KÜRZEN',
    CEILING: 'OBERGRENZE',
    FLOOR: 'UNTERGRENZE',
    POWER: 'POTENZ',
    SQRT: 'WURZEL',
    LOG: 'LOG',
    LOG10: 'LOG10',
    LN: 'LN',
    EXP: 'EXP',
    PI: 'PI',
    RAND: 'ZUFALLSZAHL',
    RANDBETWEEN: 'ZUFALLSBEREICH',
    MOD: 'REST',
    SUMIF: 'SUMMEWENN',
    SUMIFS: 'SUMMEWENNS',
    AVERAGEIF: 'MITTELWERTWENN',
    AVERAGEIFS: 'MITTELWERTWENNS',
  },

  ja: {
    SUM: 'SUM',
    AVERAGE: 'AVERAGE',
    COUNT: 'COUNT',
    COUNTA: 'COUNTA',
    COUNTBLANK: 'COUNTBLANK',
    COUNTIF: 'COUNTIF',
    MIN: 'MIN',
    MAX: 'MAX',
    PRODUCT: 'PRODUCT',
    STDEV: 'STDEV',
    STDEVP: 'STDEVP',
    VAR: 'VAR',
    VARP: 'VARP',
    MEDIAN: 'MEDIAN',
    MODE: 'MODE',
    LARGE: 'LARGE',
    SMALL: 'SMALL',
    IF: 'IF',
    AND: 'AND',
    OR: 'OR',
    NOT: 'NOT',
    IFERROR: 'IFERROR',
    IFNA: 'IFNA',
    CONCATENATE: 'CONCATENATE',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
    MID: 'MID',
    LEN: 'LEN',
    LOWER: 'LOWER',
    UPPER: 'UPPER',
    PROPER: 'PROPER',
    TRIM: 'TRIM',
    SUBSTITUTE: 'SUBSTITUTE',
    REPLACE: 'REPLACE',
    FIND: 'FIND',
    SEARCH: 'SEARCH',
    TEXT: 'TEXT',
    VALUE: 'VALUE',
    EXACT: 'EXACT',
    DATE: 'DATE',
    TIME: 'TIME',
    NOW: 'NOW',
    TODAY: 'TODAY',
    YEAR: 'YEAR',
    MONTH: 'MONTH',
    DAY: 'DAY',
    HOUR: 'HOUR',
    MINUTE: 'MINUTE',
    SECOND: 'SECOND',
    WEEKDAY: 'WEEKDAY',
    WEEKNUM: 'WEEKNUM',
    VLOOKUP: 'VLOOKUP',
    HLOOKUP: 'HLOOKUP',
    LOOKUP: 'LOOKUP',
    INDEX: 'INDEX',
    MATCH: 'MATCH',
    OFFSET: 'OFFSET',
    INDIRECT: 'INDIRECT',
    ABS: 'ABS',
    ROUND: 'ROUND',
    ROUNDUP: 'ROUNDUP',
    ROUNDDOWN: 'ROUNDDOWN',
    INT: 'INT',
    TRUNC: 'TRUNC',
    CEILING: 'CEILING',
    FLOOR: 'FLOOR',
    POWER: 'POWER',
    SQRT: 'SQRT',
    LOG: 'LOG',
    LOG10: 'LOG10',
    LN: 'LN',
    EXP: 'EXP',
    PI: 'PI',
    RAND: 'RAND',
    RANDBETWEEN: 'RANDBETWEEN',
    MOD: 'MOD',
    SUMIF: 'SUMIF',
    SUMIFS: 'SUMIFS',
    AVERAGEIF: 'AVERAGEIF',
    AVERAGEIFS: 'AVERAGEIFS',
  },

  zh: {
    SUM: 'SUM',
    AVERAGE: 'AVERAGE',
    COUNT: 'COUNT',
    COUNTA: 'COUNTA',
    COUNTBLANK: 'COUNTBLANK',
    COUNTIF: 'COUNTIF',
    MIN: 'MIN',
    MAX: 'MAX',
    PRODUCT: 'PRODUCT',
    STDEV: 'STDEV',
    STDEVP: 'STDEVP',
    VAR: 'VAR',
    VARP: 'VARP',
    MEDIAN: 'MEDIAN',
    MODE: 'MODE',
    LARGE: 'LARGE',
    SMALL: 'SMALL',
    IF: 'IF',
    AND: 'AND',
    OR: 'OR',
    NOT: 'NOT',
    IFERROR: 'IFERROR',
    IFNA: 'IFNA',
    CONCATENATE: 'CONCATENATE',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
    MID: 'MID',
    LEN: 'LEN',
    LOWER: 'LOWER',
    UPPER: 'UPPER',
    PROPER: 'PROPER',
    TRIM: 'TRIM',
    SUBSTITUTE: 'SUBSTITUTE',
    REPLACE: 'REPLACE',
    FIND: 'FIND',
    SEARCH: 'SEARCH',
    TEXT: 'TEXT',
    VALUE: 'VALUE',
    EXACT: 'EXACT',
    DATE: 'DATE',
    TIME: 'TIME',
    NOW: 'NOW',
    TODAY: 'TODAY',
    YEAR: 'YEAR',
    MONTH: 'MONTH',
    DAY: 'DAY',
    HOUR: 'HOUR',
    MINUTE: 'MINUTE',
    SECOND: 'SECOND',
    WEEKDAY: 'WEEKDAY',
    WEEKNUM: 'WEEKNUM',
    VLOOKUP: 'VLOOKUP',
    HLOOKUP: 'HLOOKUP',
    LOOKUP: 'LOOKUP',
    INDEX: 'INDEX',
    MATCH: 'MATCH',
    OFFSET: 'OFFSET',
    INDIRECT: 'INDIRECT',
    ABS: 'ABS',
    ROUND: 'ROUND',
    ROUNDUP: 'ROUNDUP',
    ROUNDDOWN: 'ROUNDDOWN',
    INT: 'INT',
    TRUNC: 'TRUNC',
    CEILING: 'CEILING',
    FLOOR: 'FLOOR',
    POWER: 'POWER',
    SQRT: 'SQRT',
    LOG: 'LOG',
    LOG10: 'LOG10',
    LN: 'LN',
    EXP: 'EXP',
    PI: 'PI',
    RAND: 'RAND',
    RANDBETWEEN: 'RANDBETWEEN',
    MOD: 'MOD',
    SUMIF: 'SUMIF',
    SUMIFS: 'SUMIFS',
    AVERAGEIF: 'AVERAGEIF',
    AVERAGEIFS: 'AVERAGEIFS',
  },

  ar: {
    SUM: 'SUM',
    AVERAGE: 'AVERAGE',
    COUNT: 'COUNT',
    COUNTA: 'COUNTA',
    COUNTBLANK: 'COUNTBLANK',
    COUNTIF: 'COUNTIF',
    MIN: 'MIN',
    MAX: 'MAX',
    PRODUCT: 'PRODUCT',
    STDEV: 'STDEV',
    STDEVP: 'STDEVP',
    VAR: 'VAR',
    VARP: 'VARP',
    MEDIAN: 'MEDIAN',
    MODE: 'MODE',
    LARGE: 'LARGE',
    SMALL: 'SMALL',
    IF: 'IF',
    AND: 'AND',
    OR: 'OR',
    NOT: 'NOT',
    IFERROR: 'IFERROR',
    IFNA: 'IFNA',
    CONCATENATE: 'CONCATENATE',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
    MID: 'MID',
    LEN: 'LEN',
    LOWER: 'LOWER',
    UPPER: 'UPPER',
    PROPER: 'PROPER',
    TRIM: 'TRIM',
    SUBSTITUTE: 'SUBSTITUTE',
    REPLACE: 'REPLACE',
    FIND: 'FIND',
    SEARCH: 'SEARCH',
    TEXT: 'TEXT',
    VALUE: 'VALUE',
    EXACT: 'EXACT',
    DATE: 'DATE',
    TIME: 'TIME',
    NOW: 'NOW',
    TODAY: 'TODAY',
    YEAR: 'YEAR',
    MONTH: 'MONTH',
    DAY: 'DAY',
    HOUR: 'HOUR',
    MINUTE: 'MINUTE',
    SECOND: 'SECOND',
    WEEKDAY: 'WEEKDAY',
    WEEKNUM: 'WEEKNUM',
    VLOOKUP: 'VLOOKUP',
    HLOOKUP: 'HLOOKUP',
    LOOKUP: 'LOOKUP',
    INDEX: 'INDEX',
    MATCH: 'MATCH',
    OFFSET: 'OFFSET',
    INDIRECT: 'INDIRECT',
    ABS: 'ABS',
    ROUND: 'ROUND',
    ROUNDUP: 'ROUNDUP',
    ROUNDDOWN: 'ROUNDDOWN',
    INT: 'INT',
    TRUNC: 'TRUNC',
    CEILING: 'CEILING',
    FLOOR: 'FLOOR',
    POWER: 'POWER',
    SQRT: 'SQRT',
    LOG: 'LOG',
    LOG10: 'LOG10',
    LN: 'LN',
    EXP: 'EXP',
    PI: 'PI',
    RAND: 'RAND',
    RANDBETWEEN: 'RANDBETWEEN',
    MOD: 'MOD',
    SUMIF: 'SUMIF',
    SUMIFS: 'SUMIFS',
    AVERAGEIF: 'AVERAGEIF',
    AVERAGEIFS: 'AVERAGEIFS',
  },

  pt: {
    SUM: 'SOMA',
    AVERAGE: 'MÉDIA',
    COUNT: 'CONT.NÚM',
    COUNTA: 'CONT.VALUES',
    COUNTBLANK: 'CONT.VAZIO',
    COUNTIF: 'CONT.SE',
    MIN: 'MÍN',
    MAX: 'MÁX',
    PRODUCT: 'PRODUTO',
    STDEV: 'DESVPAD',
    STDEVP: 'DESVPAD.P',
    VAR: 'VAR',
    VARP: 'VAR.P',
    MEDIAN: 'MED',
    MODE: 'MODO',
    LARGE: 'MAIOR',
    SMALL: 'MENOR',
    IF: 'SE',
    AND: 'E',
    OR: 'OU',
    NOT: 'NÃO',
    IFERROR: 'SEERRO',
    IFNA: 'SE.NA',
    CONCATENATE: 'CONCATENAR',
    LEFT: 'ESQUERDA',
    RIGHT: 'DIREITA',
    MID: 'EXT.TEXTO',
    LEN: 'NÚM.CARACT',
    LOWER: 'MINÚSCULA',
    UPPER: 'MAIÚSCULA',
    PROPER: 'PRI.MAIÚSCULA',
    TRIM: 'TIRAR.ESPAÇO',
    SUBSTITUTE: 'SUBSTITUIR',
    REPLACE: 'SUBSTITUIR',
    FIND: 'LOCALIZAR',
    SEARCH: 'PROCURAR',
    TEXT: 'TEXTO',
    VALUE: 'VALOR',
    EXACT: 'EXATO',
    DATE: 'DATA',
    TIME: 'TEMPO',
    NOW: 'AGORA',
    TODAY: 'HOJE',
    YEAR: 'ANO',
    MONTH: 'MÊS',
    DAY: 'DIA',
    HOUR: 'HORA',
    MINUTE: 'MINUTO',
    SECOND: 'SEGUNDO',
    WEEKDAY: 'DIA.SE',
    WEEKNUM: 'NÚM.SE',
    VLOOKUP: 'PROCV',
    HLOOKUP: 'PROCH',
    LOOKUP: 'PROC',
    INDEX: 'ÍNDICE',
    MATCH: 'CORRESP',
    OFFSET: 'DESLOC',
    INDIRECT: 'INDIRETO',
    ABS: 'ABS',
    ROUND: 'ARRED',
    ROUNDUP: 'ARRED.PARA.CIMA',
    ROUNDDOWN: 'ARRED.PARA.BAIXO',
    INT: 'INT',
    TRUNC: 'TRUNCAR',
    CEILING: 'TETO',
    FLOOR: 'CHÃO',
    POWER: 'POTÊNCIA',
    SQRT: 'RAIZ',
    LOG: 'LOG',
    LOG10: 'LOG10',
    LN: 'LN',
    EXP: 'EXP',
    PI: 'PI',
    RAND: 'ALEATÓRIO',
    RANDBETWEEN: 'ALEATÓRIOENTRE',
    MOD: 'MOD',
    SUMIF: 'SOMASE',
    SUMIFS: 'SOMASES',
    AVERAGEIF: 'MÉDIASE',
    AVERAGEIFS: 'MÉDIASES',
  },

  ru: {
    SUM: 'СУММ',
    AVERAGE: 'СРЗНАЧ',
    COUNT: 'СЧЁТ',
    COUNTA: 'СЧЁТЗ',
    COUNTBLANK: 'СЧИТАТЬПУСТОТЫ',
    COUNTIF: 'СЧЁТЕСЛИ',
    MIN: 'МИН',
    MAX: 'МАКС',
    PRODUCT: 'ПРОИЗВЕД',
    STDEV: 'СТАНДОТКЛОН',
    STDEVP: 'СТАНДОТКЛОН.Г',
    VAR: 'ДИСП',
    VARP: 'ДИСП.Г',
    MEDIAN: 'МЕДИАНА',
    MODE: 'МОДА',
    LARGE: 'НАИБОЛЬШИЙ',
    SMALL: 'НАИМЕНЬШИЙ',
    IF: 'ЕСЛИ',
    AND: 'И',
    OR: 'ИЛИ',
    NOT: 'НЕ',
    IFERROR: 'ЕСЛИОШИБКА',
    IFNA: 'ЕСНД',
    CONCATENATE: 'СЦЕПИТЬ',
    LEFT: 'ЛЕВСИМВ',
    RIGHT: 'ПРАВСИМВ',
    MID: 'ПСТР',
    LEN: 'ДЛСТР',
    LOWER: 'СТРОЧН',
    UPPER: 'ПРОПИСН',
    PROPER: 'ПРОПНАЧ',
    TRIM: 'СЖПРОБЕЛЫ',
    SUBSTITUTE: 'ПОДСТАВИТЬ',
    REPLACE: 'ЗАМЕНИТЬ',
    FIND: 'НАЙТИ',
    SEARCH: 'ПОИСК',
    TEXT: 'ТЕКСТ',
    VALUE: 'ЗНАЧЕН',
    EXACT: 'СОВПАД',
    DATE: 'ДАТА',
    TIME: 'ВРЕМЯ',
    NOW: 'ТДАТА',
    TODAY: 'СЕГОДНЯ',
    YEAR: 'ГОД',
    MONTH: 'МЕСЯЦ',
    DAY: 'ДЕНЬ',
    HOUR: 'ЧАС',
    MINUTE: 'МИНУТЫ',
    SECOND: 'СЕКУНДЫ',
    WEEKDAY: 'ДЕНЬНЕД',
    WEEKNUM: 'НОМНЕДЕЛИ',
    VLOOKUP: 'ВПР',
    HLOOKUP: 'ГПР',
    LOOKUP: 'ПРОСМОТР',
    INDEX: 'ИНДЕКС',
    MATCH: 'ПОИСКПОЗ',
    OFFSET: 'СМЕЩ',
    INDIRECT: 'ДВССЫЛ',
    ABS: 'ABS',
    ROUND: 'ОКРУГЛ',
    ROUNDUP: 'ОКРУГЛВВЕРХ',
    ROUNDDOWN: 'ОКРУГЛВНИЗ',
    INT: 'ЦЕЛОЕ',
    TRUNC: 'ОТБР',
    CEILING: 'ОКРВВЕРХ',
    FLOOR: 'ОКРВНИЗ',
    POWER: 'СТЕПЕНЬ',
    SQRT: 'КОРЕНЬ',
    LOG: 'LOG',
    LOG10: 'LOG10',
    LN: 'LN',
    EXP: 'EXP',
    PI: 'ПИ',
    RAND: 'СЛЧИС',
    RANDBETWEEN: 'СЛУЧМЕЖДУ',
    MOD: 'ОСТАТ',
    SUMIF: 'СУММЕСЛИ',
    SUMIFS: 'СУММЕСЛИМН',
    AVERAGEIF: 'СРЗНАЧЕСЛИ',
    AVERAGEIFS: 'СРЗНАЧЕСЛИМН',
  },

  it: {
    SUM: 'SOMMA',
    AVERAGE: 'MEDIA',
    COUNT: 'CONTA.NUMERI',
    COUNTA: 'CONTA.VALORI',
    COUNTBLANK: 'CONTA.VUOTE',
    COUNTIF: 'CONTA.SE',
    MIN: 'MIN',
    MAX: 'MAX',
    PRODUCT: 'PRODOTTO',
    STDEV: 'DEV.ST',
    STDEVP: 'DEV.ST.P',
    VAR: 'VAR',
    VARP: 'VAR.P',
    MEDIAN: 'MEDIANA',
    MODE: 'MODA',
    LARGE: 'GRANDE',
    SMALL: 'PICCOLO',
    IF: 'SE',
    AND: 'E',
    OR: 'O',
    NOT: 'NON',
    IFERROR: 'SE.ERRORE',
    IFNA: 'SE.NA',
    CONCATENATE: 'CONCATENA',
    LEFT: 'SINISTRA',
    RIGHT: 'DESTRA',
    MID: 'STRINGA.ESTRAI',
    LEN: 'LUNGHEZZA',
    LOWER: 'MINUSC',
    UPPER: 'MAIUSC',
    PROPER: 'MAIUSC.INIZ',
    TRIM: 'ANNULLA.SPAZI',
    SUBSTITUTE: 'SOSTITUISCI',
    REPLACE: 'RIMPIAZZA',
    FIND: 'TROVA',
    SEARCH: 'CERCA',
    TEXT: 'TESTO',
    VALUE: 'VALORE',
    EXACT: 'ESATTO',
    DATE: 'DATA',
    TIME: 'ORA',
    NOW: 'ADESSO',
    TODAY: 'OGGI',
    YEAR: 'ANNO',
    MONTH: 'MESE',
    DAY: 'GIORNO',
    HOUR: 'ORA',
    MINUTE: 'MINUTO',
    SECOND: 'SECONDO',
    WEEKDAY: 'GIORNO.SETTIMANA',
    WEEKNUM: 'NUM.SETTIMANA',
    VLOOKUP: 'CERCA.VERT',
    HLOOKUP: 'CERCA.ORIZZ',
    LOOKUP: 'CERCA',
    INDEX: 'INDICE',
    MATCH: 'CONFRONTA',
    OFFSET: 'SCARTO',
    INDIRECT: 'INDIRETTO',
    ABS: 'ASS',
    ROUND: 'ARROTONDA',
    ROUNDUP: 'ARROTONDA.ECCESSO',
    ROUNDDOWN: 'ARROTONDA.DIFETTO',
    INT: 'INT',
    TRUNC: 'TRONCA',
    CEILING: 'ARROTONDA.ECCESSO',
    FLOOR: 'ARROTONDA.DIFETTO',
    POWER: 'POTENZA',
    SQRT: 'RADQ',
    LOG: 'LOG',
    LOG10: 'LOG10',
    LN: 'LN',
    EXP: 'EXP',
    PI: 'PI.GRECO',
    RAND: 'CASUALE',
    RANDBETWEEN: 'CASUALE.TRA',
    MOD: 'RESTO',
    SUMIF: 'SOMMA.SE',
    SUMIFS: 'SOMMA.PIÙ.SE',
    AVERAGEIF: 'MEDIA.SE',
    AVERAGEIFS: 'MEDIA.PIÙ.SE',
  },

  ko: {
    SUM: 'SUM',
    AVERAGE: 'AVERAGE',
    COUNT: 'COUNT',
    COUNTA: 'COUNTA',
    COUNTBLANK: 'COUNTBLANK',
    COUNTIF: 'COUNTIF',
    MIN: 'MIN',
    MAX: 'MAX',
    PRODUCT: 'PRODUCT',
    STDEV: 'STDEV',
    STDEVP: 'STDEVP',
    VAR: 'VAR',
    VARP: 'VARP',
    MEDIAN: 'MEDIAN',
    MODE: 'MODE',
    LARGE: 'LARGE',
    SMALL: 'SMALL',
    IF: 'IF',
    AND: 'AND',
    OR: 'OR',
    NOT: 'NOT',
    IFERROR: 'IFERROR',
    IFNA: 'IFNA',
    CONCATENATE: 'CONCATENATE',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
    MID: 'MID',
    LEN: 'LEN',
    LOWER: 'LOWER',
    UPPER: 'UPPER',
    PROPER: 'PROPER',
    TRIM: 'TRIM',
    SUBSTITUTE: 'SUBSTITUTE',
    REPLACE: 'REPLACE',
    FIND: 'FIND',
    SEARCH: 'SEARCH',
    TEXT: 'TEXT',
    VALUE: 'VALUE',
    EXACT: 'EXACT',
    DATE: 'DATE',
    TIME: 'TIME',
    NOW: 'NOW',
    TODAY: 'TODAY',
    YEAR: 'YEAR',
    MONTH: 'MONTH',
    DAY: 'DAY',
    HOUR: 'HOUR',
    MINUTE: 'MINUTE',
    SECOND: 'SECOND',
    WEEKDAY: 'WEEKDAY',
    WEEKNUM: 'WEEKNUM',
    VLOOKUP: 'VLOOKUP',
    HLOOKUP: 'HLOOKUP',
    LOOKUP: 'LOOKUP',
    INDEX: 'INDEX',
    MATCH: 'MATCH',
    OFFSET: 'OFFSET',
    INDIRECT: 'INDIRECT',
    ABS: 'ABS',
    ROUND: 'ROUND',
    ROUNDUP: 'ROUNDUP',
    ROUNDDOWN: 'ROUNDDOWN',
    INT: 'INT',
    TRUNC: 'TRUNC',
    CEILING: 'CEILING',
    FLOOR: 'FLOOR',
    POWER: 'POWER',
    SQRT: 'SQRT',
    LOG: 'LOG',
    LOG10: 'LOG10',
    LN: 'LN',
    EXP: 'EXP',
    PI: 'PI',
    RAND: 'RAND',
    RANDBETWEEN: 'RANDBETWEEN',
    MOD: 'MOD',
    SUMIF: 'SUMIF',
    SUMIFS: 'SUMIFS',
    AVERAGEIF: 'AVERAGEIF',
    AVERAGEIFS: 'AVERAGEIFS',
  },

  hi: {
    SUM: 'SUM',
    AVERAGE: 'AVERAGE',
    COUNT: 'COUNT',
    COUNTA: 'COUNTA',
    COUNTBLANK: 'COUNTBLANK',
    COUNTIF: 'COUNTIF',
    MIN: 'MIN',
    MAX: 'MAX',
    PRODUCT: 'PRODUCT',
    STDEV: 'STDEV',
    STDEVP: 'STDEVP',
    VAR: 'VAR',
    VARP: 'VARP',
    MEDIAN: 'MEDIAN',
    MODE: 'MODE',
    LARGE: 'LARGE',
    SMALL: 'SMALL',
    IF: 'IF',
    AND: 'AND',
    OR: 'OR',
    NOT: 'NOT',
    IFERROR: 'IFERROR',
    IFNA: 'IFNA',
    CONCATENATE: 'CONCATENATE',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
    MID: 'MID',
    LEN: 'LEN',
    LOWER: 'LOWER',
    UPPER: 'UPPER',
    PROPER: 'PROPER',
    TRIM: 'TRIM',
    SUBSTITUTE: 'SUBSTITUTE',
    REPLACE: 'REPLACE',
    FIND: 'FIND',
    SEARCH: 'SEARCH',
    TEXT: 'TEXT',
    VALUE: 'VALUE',
    EXACT: 'EXACT',
    DATE: 'DATE',
    TIME: 'TIME',
    NOW: 'NOW',
    TODAY: 'TODAY',
    YEAR: 'YEAR',
    MONTH: 'MONTH',
    DAY: 'DAY',
    HOUR: 'HOUR',
    MINUTE: 'MINUTE',
    SECOND: 'SECOND',
    WEEKDAY: 'WEEKDAY',
    WEEKNUM: 'WEEKNUM',
    VLOOKUP: 'VLOOKUP',
    HLOOKUP: 'HLOOKUP',
    LOOKUP: 'LOOKUP',
    INDEX: 'INDEX',
    MATCH: 'MATCH',
    OFFSET: 'OFFSET',
    INDIRECT: 'INDIRECT',
    ABS: 'ABS',
    ROUND: 'ROUND',
    ROUNDUP: 'ROUNDUP',
    ROUNDDOWN: 'ROUNDDOWN',
    INT: 'INT',
    TRUNC: 'TRUNC',
    CEILING: 'CEILING',
    FLOOR: 'FLOOR',
    POWER: 'POWER',
    SQRT: 'SQRT',
    LOG: 'LOG',
    LOG10: 'LOG10',
    LN: 'LN',
    EXP: 'EXP',
    PI: 'PI',
    RAND: 'RAND',
    RANDBETWEEN: 'RANDBETWEEN',
    MOD: 'MOD',
    SUMIF: 'SUMIF',
    SUMIFS: 'SUMIFS',
    AVERAGEIF: 'AVERAGEIF',
    AVERAGEIFS: 'AVERAGEIFS',
  },
};

/**
 * Formula argument separator for each locale
 */
const ARGUMENT_SEPARATORS: Record<LocaleCode, string> = {
  en: ',',
  es: ';',
  fr: ';',
  de: ';',
  ja: ',',
  zh: ',',
  ar: ',',
  pt: ';',
  ru: ';',
  it: ';',
  ko: ',',
  hi: ',',
};

/**
 * FormulaTranslator class
 *
 * @example
 * ```typescript
 * const translator = new FormulaTranslator();
 *
 * // Translate function name
 * translator.translate('SUM', 'es') // 'SUMA'
 * translator.translate('SUM', 'fr') // 'SOMME'
 *
 * // Translate formula
 * translator.translateFormula('=SUM(A1,B1)', 'es') // '=SUMA(A1;B1)'
 *
 * // Get all function names for locale
 * const frFunctions = translator.getFunctions('fr');
 * ```
 */
export class FormulaTranslator {
  /**
   * Translate a function name from English to target locale
   *
   * @param functionName - English function name
   * @param locale - Target locale
   * @returns Localized function name
   */
  translate(functionName: string, locale: LocaleCode): string {
    const translations = FUNCTION_TRANSLATIONS[locale];

    if (!translations) {
      return functionName; // No translation available
    }

    // Case-insensitive lookup
    const upperName = functionName.toUpperCase();

    for (const [key, value] of Object.entries(translations)) {
      if (key.toUpperCase() === upperName) {
        return value;
      }
    }

    // If no translation found, return original
    return functionName;
  }

  /**
   * Translate a function name from target locale to English
   *
   * @param localName - Localized function name
   * @param locale - Source locale
   * @returns English function name
   */
  translateToEnglish(localName: string, locale: LocaleCode): string {
    const translations = FUNCTION_TRANSLATIONS[locale];

    if (!translations) {
      return localName; // No translation available
    }

    // Case-insensitive lookup
    const upperName = localName.toUpperCase();

    for (const [key, value] of Object.entries(translations)) {
      if (value.toUpperCase() === upperName) {
        return key;
      }
    }

    // If no translation found, return original
    return localName;
  }

  /**
   * Translate a complete formula from English to target locale
   *
   * @param formula - Formula in English
   * @param locale - Target locale
   * @returns Localized formula
   *
   * @example
   * ```typescript
   * translator.translateFormula('=SUM(A1,B1)', 'es') // '=SUMA(A1;B1)'
   * translator.translateFormula('=AVERAGE(A1:A10)', 'fr') // '=MOYENNE(A1:A10)'
   * ```
   */
  translateFormula(formula: string, locale: LocaleCode): string {
    // Remove leading '='
    const cleanFormula = formula.startsWith('=') ? formula.slice(1) : formula;

    // Get argument separator for locale
    const separator = ARGUMENT_SEPARATORS[locale] || ',';
    const englishSeparator = ',';

    // Find all function names and translate them
    let result = cleanFormula;

    // Match function names (word characters followed by opening parenthesis)
    const functionRegex = /([A-Z][A-Z0-9.]*)\(/gi;

    result = result.replace(functionRegex, (match, funcName) => {
      const translated = this.translate(funcName, locale);
      return `${translated}(`;
    });

    // Replace argument separators (but not within quotes or strings)
    // This is a simplified implementation - a full parser would be more robust
    if (separator !== englishSeparator) {
      result = this.replaceArgumentSeparators(result, englishSeparator, separator);
    }

    // Re-add '=' if it was present
    return formula.startsWith('=') ? `=${result}` : result;
  }

  /**
   * Translate a complete formula from target locale to English
   *
   * @param formula - Formula in target locale
   * @param locale - Source locale
   * @returns Formula in English
   */
  translateFormulaToEnglish(formula: string, locale: LocaleCode): string {
    // Remove leading '='
    const cleanFormula = formula.startsWith('=') ? formula.slice(1) : formula;

    // Get argument separator for locale
    const separator = ARGUMENT_SEPARATORS[locale] || ',';
    const englishSeparator = ',';

    // Replace argument separators first
    let result = cleanFormula;

    if (separator !== englishSeparator) {
      result = this.replaceArgumentSeparators(result, separator, englishSeparator);
    }

    // Find all function names and translate them to English
    const functionRegex = /([A-Z][A-Z0-9.]*)\(/gi;

    result = result.replace(functionRegex, (match, funcName) => {
      const translated = this.translateToEnglish(funcName, locale);
      return `${translated}(`;
    });

    // Re-add '=' if it was present
    return formula.startsWith('=') ? `=${result}` : result;
  }

  /**
   * Get all function names for a locale
   *
   * @param locale - Locale code
   * @returns Object with English and localized names
   */
  getFunctions(locale: LocaleCode): Record<string, string> {
    return FUNCTION_TRANSLATIONS[locale] || {};
  }

  /**
   * Get argument separator for a locale
   *
   * @param locale - Locale code
   * @returns Argument separator character
   */
  getArgumentSeparator(locale: LocaleCode): string {
    return ARGUMENT_SEPARATORS[locale] || ',';
  }

  /**
   * Check if a function name is valid in a locale
   *
   * @param functionName - Function name to check
   * @param locale - Locale code
   * @returns True if function exists
   */
  isValidFunction(functionName: string, locale: LocaleCode): boolean {
    // Check if it's a standard English function
    if (STANDARD_FUNCTIONS.includes(functionName.toUpperCase())) {
      return true;
    }

    // Check if it's a localized function
    const englishName = this.translateToEnglish(functionName, locale);
    return STANDARD_FUNCTIONS.includes(englishName.toUpperCase());
  }

  /**
   * Get formula suggestions as user types
   *
   * @param partial - Partial function name
   * @param locale - Locale code
   * @returns Array of matching function names
   */
  suggestFunctions(partial: string, locale: LocaleCode): string[] {
    const functions = this.getFunctions(locale);
    const partialUpper = partial.toUpperCase();
    const suggestions: string[] = [];

    // Check standard English functions
    for (const func of STANDARD_FUNCTIONS) {
      if (func.startsWith(partialUpper)) {
        suggestions.push(func);
      }
    }

    // Check localized functions
    for (const [english, local] of Object.entries(functions)) {
      if (local.startsWith(partialUpper) || english.startsWith(partialUpper)) {
        suggestions.push(local);
      }
    }

    // Remove duplicates and sort
    return [...new Set(suggestions)].sort();
  }

  /**
   * Replace argument separators in a formula
   *
   * @param formula - Formula string
   * @param oldSeparator - Old separator
   * @param newSeparator - New separator
   * @returns Formula with replaced separators
   */
  private replaceArgumentSeparators(
    formula: string,
    oldSeparator: string,
    newSeparator: string
  ): string {
    const result: string[] = [];
    let inQuotes = false;
    let inParentheses = 0;
    let quoteChar = '';

    for (let i = 0; i < formula.length; i++) {
      const char = formula[i];

      // Handle quote state
      if ((char === '"' || char === "'") && (i === 0 || formula[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
      }

      // Track parentheses
      if (!inQuotes && char === '(') {
        inParentheses++;
      } else if (!inQuotes && char === ')') {
        inParentheses--;
      }

      // Replace separators only if not in quotes and not in nested function calls
      if (!inQuotes && inParentheses > 0 && char === oldSeparator) {
        result.push(newSeparator);
      } else {
        result.push(char);
      }
    }

    return result.join('');
  }

  /**
   * Extract function names from a formula
   *
   * @param formula - Formula string
   * @returns Array of function names found
   */
  extractFunctions(formula: string): string[] {
    const functions: string[] = [];
    const functionRegex = /([A-Z][A-Z0-9.]*)\(/gi;
    let match;

    while ((match = functionRegex.exec(formula)) !== null) {
      functions.push(match[1]);
    }

    return [...new Set(functions)];
  }

  /**
   * Get formula complexity score
   *
   * @param formula - Formula string
   * @returns Complexity score (higher = more complex)
   */
  getComplexityScore(formula: string): number {
    let score = 0;

    // Count functions
    const functions = this.extractFunctions(formula);
    score += functions.length * 2;

    // Count nested functions
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of formula) {
      if (char === '(') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === ')') {
        currentDepth--;
      }
    }

    score += maxDepth * 3;

    // Count operators
    const operators = (formula.match(/[+\-*/^&=<>]/g) || []).length;
    score += operators;

    // Count references
    const references = (formula.match(/[A-Z]+[0-9]+/g) || []).length;
    score += references;

    return score;
  }

  /**
   * Validate formula syntax (basic validation)
   *
   * @param formula - Formula string
   * @returns True if syntax appears valid
   */
  validateSyntax(formula: string): boolean {
    // Check balanced parentheses
    let parentheses = 0;

    for (const char of formula) {
      if (char === '(') {
        parentheses++;
      } else if (char === ')') {
        parentheses--;
      }

      if (parentheses < 0) {
        return false; // More closing than opening
      }
    }

    if (parentheses !== 0) {
      return false; // Unbalanced
    }

    // Check for invalid characters
    const invalidChars = formula.match(/[^\w\s\+\-\*\/\^&=<>()\.,;:\'"!\[\]@_$%]/g);
    if (invalidChars && invalidChars.length > 0) {
      return false;
    }

    return true;
  }
}

/**
 * Export a singleton instance for convenience
 */
export const formulaTranslator = new FormulaTranslator();
