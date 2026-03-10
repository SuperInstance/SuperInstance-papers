/**
 * ColorContrastChecker - WCAG 2.1 AA compliant color contrast validation
 * WCAG 2.1 Level AA (1.4.3 Contrast Minimum) and AAA (1.4.6 Contrast Enhanced)
 */

import { ContrastResult, ColorBlindnessType } from './types';

/**
 * RGB color representation
 */
interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * HSL color representation
 */
interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * ColorContrastChecker class
 * Validates color contrast ratios against WCAG standards
 */
export class ColorContrastChecker {
  /**
   * Calculate relative luminance of a color
   * WCAG 2.0 definition: https://www.w3.org/TR/WCAG20/#relativeluminancedef
   */
  private calculateLuminance(rgb: RGB): number {
    const { r, g, b } = this.normalizeRGB(rgb);

    const linearR = this.toLinearChannel(r);
    const linearG = this.toLinearChannel(g);
    const linearB = this.toLinearChannel(b);

    return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
  }

  /**
   * Normalize RGB values to 0-1 range
   */
  private normalizeRGB(rgb: RGB): RGB {
    return {
      r: rgb.r / 255,
      g: rgb.g / 255,
      b: rgb.b / 255,
    };
  }

  /**
   * Convert color channel to linear value
   */
  private toLinearChannel(channel: number): number {
    if (channel <= 0.03928) {
      return channel / 12.92;
    }
    return Math.pow((channel + 0.055) / 1.055, 2.4);
  }

  /**
   * Calculate contrast ratio between two colors
   * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter color
   */
  calculateContrastRatio(foreground: string, background: string): number {
    const fgRGB = this.parseColor(foreground);
    const bgRGB = this.parseColor(background);

    const fgLuminance = this.calculateLuminance(fgRGB);
    const bgLuminance = this.calculateLuminance(bgRGB);

    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Check if contrast ratio passes WCAG AA standard
   * 4.5:1 for normal text, 3:1 for large text (18pt or 14pt bold)
   */
  passesAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
    const ratio = this.calculateContrastRatio(foreground, background);
    const minimum = isLargeText ? 3.0 : 4.5;
    return ratio >= minimum;
  }

  /**
   * Check if contrast ratio passes WCAG AAA standard
   * 7:1 for normal text, 4.5:1 for large text
   */
  passesAAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
    const ratio = this.calculateContrastRatio(foreground, background);
    const minimum = isLargeText ? 4.5 : 7.0;
    return ratio >= minimum;
  }

  /**
   * Get comprehensive contrast result
   */
  checkContrast(
    foreground: string,
    background: string,
    isLargeText: boolean = false
  ): ContrastResult {
    const ratio = this.calculateContrastRatio(foreground, background);

    return {
      ratio: Math.round(ratio * 100) / 100,
      passesAA: this.passesAA(foreground, background, isLargeText),
      passesAAA: this.passesAAA(foreground, background, isLargeText),
      passesAALarge: this.passesAA(foreground, background, true),
      passesAAALarge: this.passesAAA(foreground, background, true),
      foreground,
      background,
    };
  }

  /**
   * Parse color string to RGB
   * Supports: hex (#RGB, #RRGGBB), rgb(), rgba(), color names
   */
  parseColor(color: string): RGB {
    // Hex color
    if (color.startsWith('#')) {
      return this.parseHexColor(color);
    }

    // RGB/RGBA color
    if (color.startsWith('rgb')) {
      return this.parseRgbColor(color);
    }

    // Named color
    return this.parseNamedColor(color);
  }

  /**
   * Parse hex color to RGB
   */
  private parseHexColor(hex: string): RGB {
    const hexValue = hex.slice(1);

    if (hexValue.length === 3) {
      const r = parseInt(hexValue[0] + hexValue[0], 16);
      const g = parseInt(hexValue[1] + hexValue[1], 16);
      const b = parseInt(hexValue[2] + hexValue[2], 16);
      return { r, g, b };
    }

    if (hexValue.length === 6) {
      const r = parseInt(hexValue.slice(0, 2), 16);
      const g = parseInt(hexValue.slice(2, 4), 16);
      const b = parseInt(hexValue.slice(4, 6), 16);
      return { r, g, b };
    }

    throw new Error(`Invalid hex color: ${hex}`);
  }

  /**
   * Parse rgb/rgba color to RGB
   */
  private parseRgbColor(rgb: string): RGB {
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (!match) {
      throw new Error(`Invalid RGB color: ${rgb}`);
    }

    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
    };
  }

  /**
   * Parse named color to RGB
   */
  private parseNamedColor(name: string): RGB {
    const namedColors: Record<string, RGB> = {
      black: { r: 0, g: 0, b: 0 },
      white: { r: 255, g: 255, b: 255 },
      red: { r: 255, g: 0, b: 0 },
      green: { r: 0, g: 128, b: 0 },
      blue: { r: 0, g: 0, b: 255 },
      yellow: { r: 255, g: 255, b: 0 },
      cyan: { r: 0, g: 255, b: 255 },
      magenta: { r: 255, g: 0, b: 255 },
      gray: { r: 128, g: 128, b: 128 },
      grey: { r: 128, g: 128, b: 128 },
      silver: { r: 192, g: 192, b: 192 },
      maroon: { r: 128, g: 0, b: 0 },
      olive: { r: 128, g: 128, b: 0 },
      lime: { r: 0, g: 255, b: 0 },
      aqua: { r: 0, g: 255, b: 255 },
      teal: { r: 0, g: 128, b: 128 },
      navy: { r: 0, g: 0, b: 128 },
      fuchsia: { r: 255, g: 0, b: 255 },
      purple: { r: 128, g: 0, b: 128 },
      orange: { r: 255, g: 165, b: 0 },
    };

    const lowerName = name.toLowerCase().trim();
    const rgb = namedColors[lowerName];

    if (!rgb) {
      throw new Error(`Unknown color name: ${name}`);
    }

    return rgb;
  }

  /**
   * Simulate color blindness
   * Uses the Brettel, Viénot, & Mollon (1997) algorithm
   */
  simulateColorBlindness(color: string, type: ColorBlindnessType): string {
    const rgb = this.parseColor(color);
    const result = this.applyColorBlindnessMatrix(rgb, type);
    return this.rgbToHex(result);
  }

  /**
   * Apply color blindness transformation matrix
   */
  private applyColorBlindnessMatrix(rgb: RGB, type: ColorBlindnessType): RGB {
    const { r, g, b } = this.normalizeRGB(rgb);

    let matrix: number[][];

    switch (type) {
      case 'protanopia':
        // Red-blind
        matrix = [
          [0.567, 0.433, 0],
          [0.558, 0.442, 0],
          [0, 0.242, 0.758],
        ];
        break;
      case 'deuteranopia':
        // Green-blind
        matrix = [
          [0.625, 0.375, 0],
          [0.7, 0.3, 0],
          [0, 0.3, 0.7],
        ];
        break;
      case 'tritanopia':
        // Blue-blind
        matrix = [
          [0.95, 0.05, 0],
          [0, 0.433, 0.567],
          [0, 0.475, 0.525],
        ];
        break;
      case 'achromatopsia':
        // Complete color blindness
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        return { r: Math.round(gray * 255), g: Math.round(gray * 255), b: Math.round(gray * 255) };
      case 'protanomaly':
        // Red-weak
        matrix = [
          [0.817, 0.183, 0],
          [0.333, 0.667, 0],
          [0, 0.125, 0.875],
        ];
        break;
      case 'deuteranomaly':
        // Green-weak
        matrix = [
          [0.8, 0.2, 0],
          [0.258, 0.742, 0],
          [0, 0.142, 0.858],
        ];
        break;
      case 'tritanomaly':
        // Blue-weak
        matrix = [
          [0.967, 0.033, 0],
          [0, 0.733, 0.267],
          [0, 0.183, 0.817],
        ];
        break;
      case 'achromatomaly':
        // Partial color blindness
        const avgGray = (r + g + b) / 3;
        const partialR = r * 0.5 + avgGray * 0.5;
        const partialG = g * 0.5 + avgGray * 0.5;
        const partialB = b * 0.5 + avgGray * 0.5;
        return {
          r: Math.round(partialR * 255),
          g: Math.round(partialG * 255),
          b: Math.round(partialB * 255),
        };
      default:
        return { r: rgb.r * 255, g: rgb.g * 255, b: rgb.b * 255 };
    }

    const resultR = matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b;
    const resultG = matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b;
    const resultB = matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b;

    return {
      r: Math.round(resultR * 255),
      g: Math.round(resultG * 255),
      b: Math.round(resultB * 255),
    };
  }

  /**
   * Convert RGB to hex string
   */
  private rgbToHex(rgb: RGB): string {
    const toHex = (n: number): string => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  /**
   * Suggest a more accessible color
   * Adjusts foreground color to meet AA standard
   */
  suggestAccessibleColor(
    foreground: string,
    background: string,
    targetRatio: number = 4.5
  ): string {
    const fgRGB = this.parseColor(foreground);
    const bgRGB = this.parseColor(background);

    let currentRatio = this.calculateContrastRatio(foreground, background);
    let adjustedFG = { ...fgRGB };

    // If foreground is lighter than background, darken it
    const fgLuminance = this.calculateLuminance(fgRGB);
    const bgLuminance = this.calculateLuminance(bgRGB);

    if (fgLuminance > bgLuminance) {
      // Darken foreground
      while (currentRatio < targetRatio && (adjustedFG.r > 0 || adjustedFG.g > 0 || adjustedFG.b > 0)) {
        adjustedFG.r = Math.max(0, adjustedFG.r - 5);
        adjustedFG.g = Math.max(0, adjustedFG.g - 5);
        adjustedFG.b = Math.max(0, adjustedFG.b - 5);
        currentRatio = this.calculateContrastRatio(this.rgbToHex(adjustedFG), background);
      }
    } else {
      // Lighten foreground
      while (currentRatio < targetRatio && (adjustedFG.r < 255 || adjustedFG.g < 255 || adjustedFG.b < 255)) {
        adjustedFG.r = Math.min(255, adjustedFG.r + 5);
        adjustedFG.g = Math.min(255, adjustedFG.g + 5);
        adjustedFG.b = Math.min(255, adjustedFG.b + 5);
        currentRatio = this.calculateContrastRatio(this.rgbToHex(adjustedFG), background);
      }
    }

    return this.rgbToHex(adjustedFG);
  }

  /**
   * Check if a color palette is accessible
   */
  checkPaletteAccessibility(
    palette: Array<{ color: string; usage: string; isLargeText?: boolean }>,
    background: string
  ): Array<{ color: string; usage: string; result: ContrastResult; accessible: boolean }> {
    return palette.map((item) => ({
      color: item.color,
      usage: item.usage,
      result: this.checkContrast(item.color, background, item.isLargeText),
      accessible: this.passesAA(item.color, background, item.isLargeText),
    }));
  }
}

/**
 * Singleton instance
 */
export const colorContrastChecker = new ColorContrastChecker();
