/**
 * FormulaConverter - Convert formulas from various platforms to POLLN
 *
 * Handles Excel, Google Sheets, Airtable, and Notion formula conversion
 * with function mapping, reference adjustment, and error handling.
 */

export interface FormulaConversionOptions {
  preserveReferences?: boolean;
  strictMode?: boolean;
  customFunctions?: Record<string, string>;
}

export interface ConversionResult {
  formula: string;
  warnings: ConversionWarning[];
  errors: ConversionError[];
}

export interface ConversionWarning {
  original: string;
  converted: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ConversionError {
  original: string;
  message: string;
  fatal: boolean;
}

/**
 * FormulaConverter - Convert platform-specific formulas to POLLN
 */
export class FormulaConverter {
  private excelFunctionMap: Record<string, string>;
  private googleSheetsFunctionMap: Record<string, string>;
  private airtableFunctionMap: Record<string, string>;
  private notionFunctionMap: Record<string, string>;

  constructor() {
    this.excelFunctionMap = this.initializeExcelFunctionMap();
    this.googleSheetsFunctionMap = this.initializeGoogleSheetsFunctionMap();
    this.airtableFunctionMap = this.initializeAirtableFunctionMap();
    this.notionFunctionMap = this.initializeNotionFunctionMap();
  }

  /**
   * Convert Excel formula to POLLN
   */
  convertExcelFormula(
    formula: string,
    sheetName: string = '',
    options: FormulaConversionOptions = {}
  ): string {
    const result: ConversionResult = {
      formula: '',
      warnings: [],
      errors: [],
    };

    try {
      // Remove leading equals sign
      let cleanedFormula = formula.trim();
      if (cleanedFormula.startsWith('=')) {
        cleanedFormula = cleanedFormula.substring(1);
      }

      // Convert cell references
      cleanedFormula = this.convertExcelReferences(cleanedFormula, sheetName, options);

      // Convert functions
      cleanedFormula = this.convertFunctions(
        cleanedFormula,
        this.excelFunctionMap,
        options
      );

      // Handle ranges
      cleanedFormula = this.convertExcelRanges(cleanedFormula, sheetName);

      result.formula = cleanedFormula;

      // Validate result
      if (options.strictMode) {
        const validation = this.validateFormula(cleanedFormula);
        result.warnings.push(...validation.warnings);
        result.errors.push(...validation.errors);
      }

      return cleanedFormula;
    } catch (error) {
      throw new Error(`Formula conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert Google Sheets formula to POLLN
   */
  convertGoogleSheetsFormula(
    formula: string,
    sheetName: string = '',
    options: FormulaConversionOptions = {}
  ): string {
    try {
      // Remove leading equals sign
      let cleanedFormula = formula.trim();
      if (cleanedFormula.startsWith('=')) {
        cleanedFormula = cleanedFormula.substring(1);
      }

      // Convert cell references (Google Sheets uses A1 notation like Excel)
      cleanedFormula = this.convertExcelReferences(cleanedFormula, sheetName, options);

      // Convert functions
      cleanedFormula = this.convertFunctions(
        cleanedFormula,
        this.googleSheetsFunctionMap,
        options
      };

      // Handle Google Sheets specific functions
      cleanedFormula = this.convertGoogleSheetsSpecificFunctions(cleanedFormula);

      return cleanedFormula;
    } catch (error) {
      throw new Error(`Google Sheets formula conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert Airtable formula to POLLN
   */
  convertAirtableFormula(
    formula: string,
    tableName: string = '',
    options: FormulaConversionOptions = {}
  ): string {
    try {
      let cleanedFormula = formula.trim();

      // Convert Airtable field references to cell references
      cleanedFormula = this.convertAirtableFieldReferences(cleanedFormula, tableName);

      // Convert functions
      cleanedFormula = this.convertFunctions(
        cleanedFormula,
        this.airtableFunctionMap,
        options
      };

      return cleanedFormula;
    } catch (error) {
      throw new Error(`Airtable formula conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert Notion formula to POLLN
   */
  convertNotionFormula(
    formula: string,
    databaseId: string = '',
    options: FormulaConversionOptions = {}
  ): string {
    try {
      let cleanedFormula = formula.trim();

      // Convert Notion property references
      cleanedFormula = this.convertNotionPropertyReferences(cleanedFormula, databaseId);

      // Convert functions
      cleanedFormula = this.convertFunctions(
        cleanedFormula,
        this.notionFunctionMap,
        options
      };

      return cleanedFormula;
    } catch (error) {
      throw new Error(`Notion formula conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert Excel cell references to POLLN format
   */
  private convertExcelReferences(
    formula: string,
    sheetName: string,
    options: FormulaConversionOptions
  ): string {
    // Excel references: A1, $A$1, Sheet1!A1, etc.
    const referencePattern = /([A-Za-z]+)?!?(\$?[A-Z]+\$?\d+)/g;

    return formula.replace(referencePattern, (match, sheet, ref) => {
      if (options.preserveReferences) {
        return match;
      }

      // Convert to POLLN cell reference format
      const cleanRef = ref.replace(/\$/g, '');
      const fullSheet = sheet || sheetName;

      return `cell("${fullSheet}", "${cleanRef}")`;
    });
  }

  /**
   * Convert Excel ranges to POLLN format
   */
  private convertExcelRanges(formula: string, sheetName: string): string {
    // Excel ranges: A1:B10, Sheet1!A1:B10
    const rangePattern = /([A-Za-z]+)?!?([A-Z]+\d+):([A-Z]+\d+)/g;

    return formula.replace(rangePattern, (match, sheet, start, end) => {
      const fullSheet = sheet || sheetName;
      return `range("${fullSheet}", "${start}", "${end}")`;
    });
  }

  /**
   * Convert Airtable field references to cell references
   */
  private convertAirtableFieldReferences(formula: string, tableName: string): string {
    // Airtable references: {Field Name}
    const fieldPattern = /\{([^}]+)\}/g;

    return formula.replace(fieldPattern, (match, fieldName) => {
      return `cell("${tableName}", "${fieldName}")`;
    });
  }

  /**
   * Convert Notion property references to cell references
   */
  private convertNotionPropertyReferences(formula: string, databaseId: string): string {
    // Notion references: prop("Property Name")
    const propPattern = /prop\("([^"]+)"\)/g;

    return formula.replace(propPattern, (match, propName) => {
      return `cell("${databaseId}", "${propName}")`;
    });
  }

  /**
   * Convert functions using provided function map
   */
  private convertFunctions(
    formula: string,
    functionMap: Record<string, string>,
    options: FormulaConversionOptions
  ): string {
    let result = formula;

    // Sort functions by length (longest first) to handle substrings correctly
    const sortedFunctions = Object.keys(functionMap).sort((a, b) => b.length - a.length);

    for (const originalFunc of sortedFunctions) {
      const pollnFunc = functionMap[originalFunc];
      const pattern = new RegExp(`\\b${originalFunc}\\(`, 'g');

      result = result.replace(pattern, `${pollnFunc}(`);
    }

    // Apply custom functions
    if (options.customFunctions) {
      for (const [original, custom] of Object.entries(options.customFunctions)) {
        const pattern = new RegExp(`\\b${original}\\(`, 'g');
        result = result.replace(pattern, `${custom}(`);
      }
    }

    return result;
  }

  /**
   * Convert Google Sheets specific functions
   */
  private convertGoogleSheetsSpecificFunctions(formula: string): string {
    // Google Sheets unique functions
    const gsSpecific: Record<string, string> = {
      'GOOGLETRANSLATE': 'translate',
      'GOOGLEFINANCE': 'finance_data',
      'IMPORTDATA': 'import_data',
      'IMPORTHTML': 'import_html',
      'IMPORTXML': 'import_xml',
      'IMAGE': 'embed_image',
      'SPARKLINE': 'sparkline',
    };

    return this.convertFunctions(formula, gsSpecific, {});
  }

  /**
   * Validate converted formula
   */
  private validateFormula(formula: string): ConversionResult {
    const result: ConversionResult = {
      formula,
      warnings: [],
      errors: [],
    };

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of formula) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) {
        result.errors.push({
          original: formula,
          message: 'Unbalanced parentheses',
          fatal: true,
        });
        return result;
      }
    }

    if (parenCount !== 0) {
      result.warnings.push({
        original: formula,
        converted: formula,
        message: 'Possible unbalanced parentheses',
        severity: 'medium',
      });
    }

    // Check for unsupported functions
    const unsupportedFunctions = this.findUnsupportedFunctions(formula);
    if (unsupportedFunctions.length > 0) {
      result.warnings.push({
        original: formula,
        converted: formula,
        message: `Unsupported functions: ${unsupportedFunctions.join(', ')}`,
        severity: 'high',
      });
    }

    return result;
  }

  /**
   * Find unsupported functions in formula
   */
  private findUnsupportedFunctions(formula: string): string[] {
    // Extract function names
    const functionPattern = /\b([A-Z_][A-Z0-9_]*)\(/gi;
    const matches = formula.match(functionPattern) || [];

    // Check against supported functions
    const supportedFunctions = new Set([
      ...Object.keys(this.excelFunctionMap),
      ...Object.keys(this.googleSheetsFunctionMap),
      ...Object.keys(this.airtableFunctionMap),
      ...Object.keys(this.notionFunctionMap),
    ]);

    return matches
      .map(m => m.replace(/\($/, '').toUpperCase())
      .filter(f => !supportedFunctions.has(f));
  }

  /**
   * Initialize Excel function mapping
   */
  private initializeExcelFunctionMap(): Record<string, string> {
    return {
      // Math & Trig
      'SUM': 'sum',
      'AVERAGE': 'average',
      'MEDIAN': 'median',
      'MODE': 'mode',
      'STDEV': 'stdev',
      'STDEV.S': 'stdev',
      'STDEV.P': 'stdevp',
      'VAR': 'variance',
      'VAR.S': 'variance',
      'VAR.P': 'variancep',
      'MIN': 'min',
      'MAX': 'max',
      'COUNT': 'count',
      'COUNTA': 'counta',
      'COUNTBLANK': 'countblank',
      'ROUND': 'round',
      'ROUNDUP': 'roundup',
      'ROUNDDOWN': 'rounddown',
      'FLOOR': 'floor',
      'CEILING': 'ceiling',
      'ABS': 'abs',
      'POWER': 'power',
      'SQRT': 'sqrt',
      'LOG': 'log',
      'LOG10': 'log10',
      'LN': 'ln',
      'EXP': 'exp',
      'SIN': 'sin',
      'COS': 'cos',
      'TAN': 'tan',
      'ASIN': 'asin',
      'ACOS': 'acos',
      'ATAN': 'atan',
      'PI': 'PI',
      'E': 'E',

      // Logical
      'IF': 'if',
      'AND': 'and',
      'OR': 'or',
      'NOT': 'not',
      'IFERROR': 'iferror',
      'IFNA': 'ifna',
      'TRUE': 'true',
      'FALSE': 'false',

      // Text
      'CONCATENATE': 'concatenate',
      'LEFT': 'left',
      'RIGHT': 'right',
      'MID': 'mid',
      'LEN': 'len',
      'LOWER': 'lower',
      'UPPER': 'upper',
      'PROPER': 'proper',
      'TRIM': 'trim',
      'SUBSTITUTE': 'substitute',
      'REPLACE': 'replace',
      'TEXT': 'text',
      'VALUE': 'value',
      'FIND': 'find',
      'SEARCH': 'search',

      // Date & Time
      'TODAY': 'today',
      'NOW': 'now',
      'DATE': 'date',
      'TIME': 'time',
      'YEAR': 'year',
      'MONTH': 'month',
      'DAY': 'day',
      'HOUR': 'hour',
      'MINUTE': 'minute',
      'SECOND': 'second',
      'WEEKDAY': 'weekday',
      'DATEDIF': 'datedif',
      'EDATE': 'edate',
      'EOMONTH': 'eomonth',

      // Lookup & Reference
      'VLOOKUP': 'vlookup',
      'HLOOKUP': 'hlookup',
      'INDEX': 'index',
      'MATCH': 'match',
      'LOOKUP': 'lookup',
      'INDIRECT': 'indirect',
      'OFFSET': 'offset',
      'CHOOSE': 'choose',

      // Financial
      'PMT': 'pmt',
      'PV': 'pv',
      'FV': 'fv',
      'NPV': 'npv',
      'IRR': 'irr',
      'RATE': 'rate',
      'NPER': 'nper',

      // Statistical
      'CORREL': 'correl',
      'COVAR': 'covar',
      'FORECAST': 'forecast',
      'TREND': 'trend',
      'GROWTH': 'growth',
    };
  }

  /**
   * Initialize Google Sheets function mapping
   */
  private initializeGoogleSheetsFunctionMap(): Record<string, string> {
    // Most functions are same as Excel
    const map = { ...this.excelFunctionMap };

    // Google Sheets specific
    map['ARRAYFORMULA'] = 'arrayformula';
    map['FILTER'] = 'filter';
    map['SORT'] = 'sort';
    map['UNIQUE'] = 'unique';
    map['QUERY'] = 'query';
    map['SPLIT'] = 'split';
    map['JOIN'] = 'join';
    map['TRANSPOSE'] = 'transpose';
    map['FLATTEN'] = 'flatten';

    return map;
  }

  /**
   * Initialize Airtable function mapping
   */
  private initializeAirtableFunctionMap(): Record<string, string> {
    return {
      // Text functions
      'FIND': 'find',
      'LEFT': 'left',
      'RIGHT': 'right',
      'MID': 'mid',
      'SUBSTITUTE': 'substitute',
      'UPPER': 'upper',
      'LOWER': 'lower',
      'TRIM': 'trim',
      'REPLACE': 'replace',
      'SEARCH': 'search',
      'T': 't',
      'LEN': 'len',

      // Date & Time
      'TODAY': 'today',
      'NOW': 'now',
      'DATETIME_DIFF': 'datetime_diff',
      'DATETIME_PARSE': 'datetime_parse',
      'DATETIME_FORMAT': 'datetime_format',
      'DATESTR': 'datestr',
      'TIMESTR': 'timestr',
      'TONOW': 'tonow',
      'FROMNOW': 'fromnow',
      'WEEKDAY': 'weekday',
      'WEEKNUM': 'weeknum',
      'ISOWEEKNUM': 'isoweeknum',
      'IS_SAME': 'is_same',
      'ERROR': 'error',

      // Math
      'ABS': 'abs',
      'CEILING': 'ceiling',
      'ROUND': 'round',
      'FLOOR': 'floor',
      'SQRT': 'sqrt',
      'LOG': 'log',
      'POWER': 'power',
      'MOD': 'mod',
      'AVERAGE': 'average',
      'SUM': 'sum',
      'COUNT': 'count',
      'MIN': 'min',
      'MAX': 'max',

      // Logical
      'IF': 'if',
      'SWITCH': 'switch',
      'AND': 'and',
      'OR': 'or',
      'NOT': 'not',
      'BLANK': 'blank',

      // Array & Aggregation
      'ARRAYJOIN': 'arrayjoin',
      'ARRAYUNIQUE': 'arrayunique',
      'ARRAYCOMPACT': 'arraycompact',
    };
  }

  /**
   * Initialize Notion function mapping
   */
  private initializeNotionFunctionMap(): Record<string, string> {
    return {
      // Text
      'format': 'format',
      'concat': 'concatenate',
      'contains': 'contains',
      'replace': 'replace',
      'replaceAll': 'replace_all',
      'test': 'test',
      'length': 'len',

      // Date & Time
      'now': 'now',
      'today': 'today',
      'dateAdd': 'date_add',
      'dateSubtract': 'date_subtract',
      'dateBetween': 'date_between',
      'formatDate': 'format_date',
      'timestamp': 'timestamp',
      'fromTimestamp': 'from_timestamp',

      // Math
      'abs': 'abs',
      'cbrt': 'cbrt',
      'ceil': 'ceiling',
      'floor': 'floor',
      'ln': 'ln',
      'log10': 'log10',
      'log2': 'log2',
      'max': 'max',
      'min': 'min',
      'round': 'round',
      'sqrt': 'sqrt',
      'exp': 'exp',
      'pow': 'power',

      // Logical
      'if': 'if',
      'larger': 'larger',
      'smaller': 'smaller',
      'equal': 'equal',
      'unequal': 'unequal',

      // Type conversion
      'number': 'number',
      'string': 'string',
      'boolean': 'boolean',
    };
  }
}
