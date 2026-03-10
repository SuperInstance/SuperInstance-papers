/**
 * StyleConverter - Convert cell formatting from various platforms to POLLN
 *
 * Handles Excel, Google Sheets, Airtable, and Notion style conversion
 * including conditional formatting, cell styling, and theme conversion.
 */

export interface CellStyle {
  font?: FontStyle;
  fill?: FillStyle;
  border?: BorderStyle;
  alignment?: AlignmentStyle;
  numberFormat?: string;
  protection?: ProtectionStyle;
}

export interface FontStyle {
  name?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: Color;
}

export interface FillStyle {
  type?: 'solid' | 'gradient' | 'pattern';
  color?: Color;
  pattern?: string;
}

export interface BorderStyle {
  top?: BorderEdge;
  right?: BorderEdge;
  bottom?: BorderEdge;
  left?: BorderEdge;
  diagonal?: BorderEdge;
}

export interface BorderEdge {
  style?: 'none' | 'thin' | 'medium' | 'thick' | 'double' | 'dotted' | 'dashed';
  color?: Color;
}

export interface AlignmentStyle {
  horizontal?: 'left' | 'center' | 'right' | 'fill' | 'justify';
  vertical?: 'top' | 'center' | 'bottom' | 'justify';
  wrapText?: boolean;
  indent?: number;
  shrinkToFit?: boolean;
}

export interface ProtectionStyle {
  locked?: boolean;
  hidden?: boolean;
}

export interface Color {
  rgb?: string;
  theme?: number;
  indexed?: number;
  tint?: number;
}

export interface ConditionalFormat {
  condition: ConditionalCondition;
  style: CellStyle;
  priority?: number;
}

export interface ConditionalCondition {
  type: 'cellIs' | 'expression' | 'colorScale' | 'dataBar' | 'iconSet';
  operator?: string;
  value1?: any;
  value2?: any;
  formula?: string;
}

export interface ThemeConversion {
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
  effects?: Record<string, any>;
}

/**
 * StyleConverter - Convert platform-specific styles to POLLN
 */
export class StyleConverter {
  private excelColorIndex: Map<number, string>;
  private googleSheetsColorMap: Record<string, string>;

  constructor() {
    this.excelColorIndex = this.initializeExcelColorIndex();
    this.googleSheetsColorMap = this.initializeGoogleSheetsColorMap();
  }

  /**
   * Convert Excel style to POLLN style
   */
  convertExcelStyle(excelStyle: any): CellStyle {
    const style: CellStyle = {};

    // Convert font
    if (excelStyle.font) {
      style.font = this.convertExcelFont(excelStyle.font);
    }

    // Convert fill
    if (excelStyle.fill) {
      style.fill = this.convertExcelFill(excelStyle.fill);
    }

    // Convert border
    if (excelStyle.border) {
      style.border = this.convertExcelBorder(excelStyle.border);
    }

    // Convert alignment
    if (excelStyle.alignment) {
      style.alignment = this.convertExcelAlignment(excelStyle.alignment);
    }

    // Convert number format
    if (excelStyle.numFmt) {
      style.numberFormat = this.convertExcelNumberFormat(excelStyle.numFmt);
    }

    // Convert protection
    if (excelStyle.protection) {
      style.protection = this.convertExcelProtection(excelStyle.protection);
    }

    return style;
  }

  /**
   * Convert Google Sheets style to POLLN style
   */
  convertGoogleSheetsStyle(gsStyle: any): CellStyle {
    const style: CellStyle = {};

    // Convert effective format
    if (gsStyle.effectiveFormat) {
      const format = gsStyle.effectiveFormat;

      if (format.textFormat) {
        style.font = this.convertGoogleSheetsFont(format.textFormat);
      }

      if (format.backgroundColor) {
        style.fill = {
          type: 'solid',
          color: this.convertGoogleSheetsColor(format.backgroundColor),
        };
      }

      if (format.borders) {
        style.border = this.convertGoogleSheetsBorders(format.borders);
      }

      if (format.horizontalAlign || format.verticalAlign) {
        style.alignment = {
          horizontal: this.convertGoogleSheetsHorizontalAlign(format.horizontalAlign),
          vertical: this.convertGoogleSheetsVerticalAlign(format.verticalAlign),
          wrapText: format.wrapStrategy === 'WRAP',
        };
      }

      if (format.numberFormat) {
        style.numberFormat = this.convertGoogleSheetsNumberFormat(format.numberFormat);
      }
    }

    return style;
  }

  /**
   * Convert conditional formatting
   */
  convertConditionalFormat(
    platform: 'excel' | 'google' | 'airtable' | 'notion',
    format: any
  ): ConditionalFormat | null {
    try {
      switch (platform) {
        case 'excel':
          return this.convertExcelConditionalFormat(format);
        case 'google':
          return this.convertGoogleSheetsConditionalFormat(format);
        default:
          return null;
      }
    } catch (error) {
      console.warn('Failed to convert conditional format:', error);
      return null;
    }
  }

  /**
   * Convert theme
   */
  convertTheme(
    platform: 'excel' | 'google',
    theme: any
  ): ThemeConversion {
    const conversion: ThemeConversion = {};

    switch (platform) {
      case 'excel':
        conversion.colors = this.convertExcelThemeColors(theme);
        conversion.fonts = this.convertExcelThemeFonts(theme);
        break;
      case 'google':
        conversion.colors = this.convertGoogleSheetsThemeColors(theme);
        break;
    }

    return conversion;
  }

  /**
   * Convert Excel font
   */
  private convertExcelFont(excelFont: any): FontStyle {
    const font: FontStyle = {};

    if (excelFont.name) font.name = excelFont.name;
    if (excelFont.sz) font.size = excelFont.sz;
    if (excelFont.b) font.bold = excelFont.b;
    if (excelFont.i) font.italic = excelFont.i;
    if (excelFont.u) font.underline = true;
    if (excelFont.strike) font.strike = excelFont.strike;
    if (excelFont.color) {
      font.color = this.convertExcelColor(excelFont.color);
    }

    return font;
  }

  /**
   * Convert Google Sheets font
   */
  private convertGoogleSheetsFont(gsFont: any): FontStyle {
    const font: FontStyle = {};

    if (gsFont.fontFamily) font.name = gsFont.fontFamily;
    if (gsFont.fontSize) font.size = gsFont.fontSize;
    if (gsFont.bold) font.bold = gsFont.bold;
    if (gsFont.italic) font.italic = gsFont.italic;
    if (gsFont.underline) font.underline = true;
    if (gsFont.strikethrough) font.strike = gsFont.strikethrough;
    if (gsFont.foregroundColor) {
      font.color = this.convertGoogleSheetsColor(gsFont.foregroundColor);
    }

    return font;
  }

  /**
   * Convert Excel fill
   */
  private convertExcelFill(excelFill: any): FillStyle {
    const fill: FillStyle = {};

    if (excelFill.patternType) {
      fill.type = excelFill.patternType.toLowerCase();
    }

    if (excelFill.fgColor) {
      fill.color = this.convertExcelColor(excelFill.fgColor);
    }

    return fill;
  }

  /**
   * Convert Excel border
   */
  private convertExcelBorder(excelBorder: any): BorderStyle {
    const border: BorderStyle = {};

    if (excelBorder.top) border.top = this.convertExcelBorderEdge(excelBorder.top);
    if (excelBorder.right) border.right = this.convertExcelBorderEdge(excelBorder.right);
    if (excelBorder.bottom) border.bottom = this.convertExcelBorderEdge(excelBorder.bottom);
    if (excelBorder.left) border.left = this.convertExcelBorderEdge(excelBorder.left);

    return border;
  }

  /**
   * Convert Excel border edge
   */
  private convertExcelBorderEdge(excelEdge: any): BorderEdge {
    const edge: BorderEdge = {};

    if (excelEdge.style) {
      edge.style = this.convertExcelBorderStyle(excelEdge.style);
    }

    if (excelEdge.color) {
      edge.color = this.convertExcelColor(excelEdge.color);
    }

    return edge;
  }

  /**
   * Convert Excel border style
   */
  private convertExcelBorderStyle(style: string): BorderEdge['style'] {
    const styleMap: Record<string, BorderEdge['style']> = {
      'thin': 'thin',
      'medium': 'medium',
      'thick': 'thick',
      'double': 'double',
      'dotted': 'dotted',
      'dashed': 'dashed',
      'mediumDashed': 'dashed',
      'dashDot': 'dashed',
      'mediumDashDot': 'dashed',
    };

    return styleMap[style] || 'thin';
  }

  /**
   * Convert Excel alignment
   */
  private convertExcelAlignment(excelAlign: any): AlignmentStyle {
    const alignment: AlignmentStyle = {};

    if (excelAlign.horizontal) {
      alignment.horizontal = excelAlign.horizontal.toLowerCase();
    }

    if (excelAlign.vertical) {
      alignment.vertical = excelAlign.vertical.toLowerCase();
    }

    if (excelAlign.wrapText) alignment.wrapText = excelAlign.wrapText;
    if (excelAlign.indent) alignment.indent = excelAlign.indent;
    if (excelAlign.shrinkToFit) alignment.shrinkToFit = excelAlign.shrinkToFit;

    return alignment;
  }

  /**
   * Convert Excel number format
   */
  private convertExcelNumberFormat(fmt: any): string {
    if (typeof fmt === 'string') return fmt;
    if (fmt && fmt.code) return fmt.code;
    return 'General';
  }

  /**
   * Convert Excel protection
   */
  private convertExcelProtection(excelProt: any): ProtectionStyle {
    const protection: ProtectionStyle = {};

    if (excelProt.locked !== undefined) protection.locked = excelProt.locked;
    if (excelProt.hidden !== undefined) protection.hidden = excelProt.hidden;

    return protection;
  }

  /**
   * Convert Excel color
   */
  private convertExcelColor(excelColor: any): Color {
    const color: Color = {};

    if (excelColor.rgb) {
      color.rgb = excelColor.rgb;
    } else if (excelColor.theme !== undefined) {
      color.theme = excelColor.theme;
      if (excelColor.tint !== undefined) color.tint = excelColor.tint;
    } else if (excelColor.indexed !== undefined) {
      const rgb = this.excelColorIndex.get(excelColor.indexed);
      if (rgb) color.rgb = rgb;
    }

    return color;
  }

  /**
   * Convert Google Sheets color
   */
  private convertGoogleSheetsColor(gsColor: any): Color {
    const color: Color = {};

    if (gsColor.red !== undefined || gsColor.green !== undefined || gsColor.blue !== undefined) {
      const r = Math.round((gsColor.red ?? 0) * 255);
      const g = Math.round((gsColor.green ?? 0) * 255);
      const b = Math.round((gsColor.blue ?? 0) * 255);
      color.rgb = `${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    return color;
  }

  /**
   * Convert Google Sheets borders
   */
  private convertGoogleSheetsBorders(gsBorders: any): BorderStyle {
    const border: BorderStyle = {};

    const convertEdge = (edge: any): BorderEdge => {
      if (!edge) return {};
      const result: BorderEdge = {};

      if (edge.style) {
        result.style = this.convertGoogleSheetsBorderStyle(edge.style);
      }

      if (edge.color) {
        result.color = this.convertGoogleSheetsColor(edge.color);
      }

      return result;
    };

    if (gsBorders.top) border.top = convertEdge(gsBorders.top);
    if (gsBorders.right) border.right = convertEdge(gsBorders.right);
    if (gsBorders.bottom) border.bottom = convertEdge(gsBorders.bottom);
    if (gsBorders.left) border.left = convertEdge(gsBorders.left);

    return border;
  }

  /**
   * Convert Google Sheets border style
   */
  private convertGoogleSheetsBorderStyle(style: string): BorderEdge['style'] {
    const styleMap: Record<string, BorderEdge['style']> = {
      'DOTTED': 'dotted',
      'DASHED': 'dashed',
      'SOLID': 'thin',
      'SOLID_MEDIUM': 'medium',
      'SOLID_THICK': 'thick',
      'DOUBLE': 'double',
    };

    return styleMap[style] || 'thin';
  }

  /**
   * Convert Google Sheets horizontal alignment
   */
  private convertGoogleSheetsHorizontalAlign(align: string): AlignmentStyle['horizontal'] {
    const alignMap: Record<string, AlignmentStyle['horizontal']> = {
      'LEFT': 'left',
      'CENTER': 'center',
      'RIGHT': 'right',
    };

    return alignMap[align] || 'left';
  }

  /**
   * Convert Google Sheets vertical alignment
   */
  private convertGoogleSheetsVerticalAlign(align: string): AlignmentStyle['vertical'] {
    const alignMap: Record<string, AlignmentStyle['vertical']> = {
      'TOP': 'top',
      'MIDDLE': 'center',
      'BOTTOM': 'bottom',
    };

    return alignMap[align] || 'bottom';
  }

  /**
   * Convert Google Sheets number format
   */
  private convertGoogleSheetsNumberFormat(format: any): string {
    if (format.type) {
      return format.type;
    }
    if (format.pattern) {
      return format.pattern;
    }
    return 'General';
  }

  /**
   * Convert Excel conditional format
   */
  private convertExcelConditionalFormat(excelFormat: any): ConditionalFormat | null {
    const condition: ConditionalCondition = {
      type: 'cellIs',
    };

    // Implementation depends on Excel conditional format structure
    // This is a simplified version

    return {
      condition,
      style: this.convertExcelStyle(excelFormat.style || {}),
      priority: excelFormat.priority,
    };
  }

  /**
   * Convert Google Sheets conditional format
   */
  private convertGoogleSheetsConditionalFormat(gsFormat: any): ConditionalFormat | null {
    const condition: ConditionalCondition = {
      type: 'expression',
    };

    // Implementation depends on Google Sheets conditional format structure
    // This is a simplified version

    return {
      condition,
      style: this.convertGoogleSheetsStyle(gsFormat.format || {}),
    };
  }

  /**
   * Convert Excel theme colors
   */
  private convertExcelThemeColors(theme: any): Record<string, string> {
    // Excel theme color mapping
    return {
      'background1': '#ffffff',
      'text1': '#000000',
      'background2': '#eeeeee',
      'text2': '#ffffff',
      'accent1': '#4f81bd',
      'accent2': '#c0504d',
      'accent3': '#9bbb59',
      'accent4': '#8064a2',
      'accent5': '#4bacc6',
      'accent6': '#f79646',
    };
  }

  /**
   * Convert Excel theme fonts
   */
  private convertExcelThemeFonts(theme: any): Record<string, string> {
    return {
      'major': 'Calibri',
      'minor': 'Calibri',
    };
  }

  /**
   * Convert Google Sheets theme colors
   */
  private convertGoogleSheetsThemeColors(theme: any): Record<string, string> {
    // Google Sheets uses a simpler color system
    return {};
  }

  /**
   * Initialize Excel color index
   */
  private initializeExcelColorIndex(): Map<number, string> {
    return new Map([
      [1, '000000'],
      [2, 'ffffff'],
      [3, 'ff0000'],
      [4, '00ff00'],
      [5, '0000ff'],
      [6, 'ffff00'],
      [7, 'ff00ff'],
      [8, '00ffff'],
      [9, '800000'],
      [10, '008000'],
      [11, '000080'],
      [12, '808000'],
      [13, '800080'],
      [14, '008080'],
      [15, 'c0c0c0'],
      [16, '808080'],
      [17, '9999ff'],
      [18, '993366'],
      [19, 'ffffcc'],
      [20, 'ccffff'],
      [21, '660066'],
      [22, 'ff8080'],
      [23, '0066cc'],
      [24, 'ccccff'],
      [25, '000080'],
      [26, 'ff00ff'],
      [27, 'ffff00'],
      [28, '00ffff'],
      [29, '800080'],
      [30, '800000'],
      [31, '008080'],
      [32, '0000ff'],
      [33, '00ccff'],
      [34, 'ccffcc'],
      [35, 'ffff99'],
      [36, '99ccff'],
      [37, 'ff99cc'],
      [38, 'cc99ff'],
      [39, 'ffcc99'],
      [40, '3366ff'],
      [41, '33cccc'],
      [42, '99cc00'],
      [43, 'ffcc00'],
      [44, 'ff9900'],
      [45, 'ff6600'],
      [46, '666699'],
      [47, '969696'],
      [48, '003366'],
      [49, '339966'],
      [50, '003300'],
      [51, '333300'],
      [52, '993300'],
      [53, '993366'],
      [54, '333399'],
      [55, '333333'],
    ]);
  }

  /**
   * Initialize Google Sheets color map
   */
  private initializeGoogleSheetsColorMap(): Record<string, string> {
    return {
      'BLACK': '#000000',
      'WHITE': '#ffffff',
      'RED': '#ff0000',
      'GREEN': '#00ff00',
      'BLUE': '#0000ff',
      'YELLOW': '#ffff00',
      'MAGENTA': '#ff00ff',
      'CYAN': '#00ffff',
    };
  }
}
