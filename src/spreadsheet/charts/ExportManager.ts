/**
 * POLLN Spreadsheet - ExportManager
 *
 * Handles chart export to various formats including PNG, SVG, and PDF.
 * Supports high-resolution export and custom dimensions.
 */

import {
  ExportFormat,
  ExportOptions,
} from './types.js';

/**
 * ExportManager - Manages chart export functionality
 */
export class ExportManager {
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /**
   * Export chart to specified format
   */
  public async export(options: ExportOptions): Promise<Blob> {
    switch (options.format) {
      case ExportFormat.PNG:
        return this.exportToPNG(options);
      case ExportFormat.SVG:
        return this.exportToSVG(options);
      case ExportFormat.PDF:
        return this.exportToPDF(options);
      case ExportFormat.JPEG:
        return this.exportToJPEG(options);
      case ExportFormat.WEBP:
        return this.exportToWebP(options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export canvas to PNG
   */
  private async exportToPNG(options: ExportOptions): Promise<Blob> {
    const { width, height, backgroundColor, quality } = options;

    // Create temporary canvas for export
    const exportCanvas = this.createExportCanvas(width, height, backgroundColor);
    const ctx = exportCanvas.getContext('2d')!;

    // Draw original canvas onto export canvas
    ctx.drawImage(this.canvas, 0, 0, exportCanvas.width, exportCanvas.height);

    // Convert to blob
    return new Promise((resolve, reject) => {
      exportCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create PNG blob'));
          }
        },
        'image/png',
        quality ?? 1.0
      );
    });
  }

  /**
   * Export canvas to JPEG
   */
  private async exportToJPEG(options: ExportOptions): Promise<Blob> {
    const { width, height, backgroundColor = '#ffffff', quality } = options;

    // Create temporary canvas for export
    const exportCanvas = this.createExportCanvas(width, height, backgroundColor);
    const ctx = exportCanvas.getContext('2d')!;

    // Draw background (JPEG doesn't support transparency)
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw original canvas onto export canvas
    ctx.drawImage(this.canvas, 0, 0, exportCanvas.width, exportCanvas.height);

    // Convert to blob
    return new Promise((resolve, reject) => {
      exportCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create JPEG blob'));
          }
        },
        'image/jpeg',
        quality ?? 0.92
      );
    });
  }

  /**
   * Export canvas to WebP
   */
  private async exportToWebP(options: ExportOptions): Promise<Blob> {
    const { width, height, backgroundColor, quality } = options;

    // Create temporary canvas for export
    const exportCanvas = this.createExportCanvas(width, height, backgroundColor);
    const ctx = exportCanvas.getContext('2d')!;

    // Draw original canvas onto export canvas
    ctx.drawImage(this.canvas, 0, 0, exportCanvas.width, exportCanvas.height);

    // Check WebP support
    if (!this.supportsWebP()) {
      throw new Error('WebP is not supported in this browser');
    }

    // Convert to blob
    return new Promise((resolve, reject) => {
      exportCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create WebP blob'));
          }
        },
        'image/webp',
        quality ?? 0.8
      );
    });
  }

  /**
   * Export canvas to SVG
   */
  private async exportToSVG(options: ExportOptions): Promise<Blob> {
    const { width, height, backgroundColor } = options;

    // Get canvas data
    const dataURL = this.canvas.toDataURL('image/png');

    // Create SVG string
    const svgString = this.createSVGString(dataURL, width, height, backgroundColor);

    // Convert to blob
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    return blob;
  }

  /**
   * Export canvas to PDF
   */
  private async exportToPDF(options: ExportOptions): Promise<Blob> {
    // Check if jsPDF is available
    if (typeof window === 'undefined' || !(window as any).jspdf) {
      throw new Error('jsPDF library is required for PDF export. Please include jsPDF in your project.');
    }

    const { width, height, backgroundColor, title, author, subject, keywords, creator } = options;

    // Get canvas data URL
    const dataURL = this.canvas.toDataURL('image/png', 1.0);

    // Create PDF
    const jsPDF = (window as any).jsPDF;
    const pdf = new jsPDF({
      orientation: width! > height! ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width!, height!],
    });

    // Set metadata
    if (title) pdf.setProperties({ title });
    if (author) pdf.setProperties({ author });
    if (subject) pdf.setProperties({ subject });
    if (keywords) pdf.setProperties({ keywords: keywords.join(', ') });
    if (creator) pdf.setProperties({ creator });

    // Add image to PDF
    pdf.addImage(dataURL, 'PNG', 0, 0, width!, height!);

    // Generate PDF blob
    const pdfBlob = pdf.output('blob');
    return pdfBlob;
  }

  /**
   * Create export canvas with specified dimensions
   */
  private createExportCanvas(
    width?: number,
    height?: number,
    backgroundColor?: string
  ): HTMLCanvasElement {
    const exportCanvas = document.createElement('canvas');

    // Use provided dimensions or canvas dimensions
    const canvasWidth = width ?? this.canvas.width;
    const canvasHeight = height ?? this.canvas.height;

    // Apply device pixel ratio for high resolution
    const dpr = window.devicePixelRatio || 1;
    exportCanvas.width = canvasWidth * dpr;
    exportCanvas.height = canvasHeight * dpr;

    const ctx = exportCanvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // Set background color if provided
    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    return exportCanvas;
  }

  /**
   * Create SVG string from canvas data
   */
  private createSVGString(
    dataURL: string,
    width?: number,
    height?: number,
    backgroundColor?: string
  ): string {
    const canvasWidth = width ?? this.canvas.width;
    const canvasHeight = height ?? this.canvas.height;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  ${backgroundColor ? `<rect width="100%" height="100%" fill="${backgroundColor}"/>` : ''}
  <image xlink:href="${dataURL}" width="${canvasWidth}" height="${canvasHeight}"/>
</svg>`;

    return svg;
  }

  /**
   * Check if WebP is supported
   */
  private supportsWebP(): boolean {
    if (typeof document === 'undefined') return false;

    const elem = document.createElement('canvas');
    if (elem.getContext && elem.getContext('2d')) {
      return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
  }

  /**
   * Download chart as file
   */
  public async download(options: ExportOptions, filename?: string): Promise<void> {
    const blob = await this.export(options);

    // Generate filename
    const defaultFilename = `chart-${Date.now()}.${options.format}`;
    const finalFilename = filename ?? defaultFilename;

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get data URL for the chart
   */
  public getDataURL(format: ExportFormat = ExportFormat.PNG, quality?: number): string {
    switch (format) {
      case ExportFormat.PNG:
        return this.canvas.toDataURL('image/png');
      case ExportFormat.JPEG:
        return this.canvas.toDataURL('image/jpeg', quality ?? 0.92);
      case ExportFormat.WEBP:
        if (this.supportsWebP()) {
          return this.canvas.toDataURL('image/webp', quality ?? 0.8);
        }
        throw new Error('WebP is not supported in this browser');
      default:
        throw new Error(`Cannot get data URL for format: ${format}`);
    }
  }

  /**
   * Export chart with high resolution
   */
  public async exportHighRes(options: ExportOptions, scale: number = 2): Promise<Blob> {
    const originalWidth = this.canvas.width;
    const originalHeight = this.canvas.height;

    // Scale dimensions
    const scaledOptions: ExportOptions = {
      ...options,
      width: (options.width ?? originalWidth) * scale,
      height: (options.height ?? originalHeight) * scale,
    };

    return this.export(scaledOptions);
  }

  /**
   * Export chart with custom dimensions
   */
  public async exportCustom(
    width: number,
    height: number,
    options?: Partial<ExportOptions>
  ): Promise<Blob> {
    const exportOptions: ExportOptions = {
      format: ExportFormat.PNG,
      width,
      height,
      ...options,
    };

    return this.export(exportOptions);
  }
}

/**
 * Export helper functions
 */
export class ExportHelpers {
  /**
   * Convert blob to data URL
   */
  static async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convert blob to array buffer
   */
  static async blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * Download blob as file
   */
  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get file extension for format
   */
  static getFileExtension(format: ExportFormat): string {
    switch (format) {
      case ExportFormat.PNG:
        return 'png';
      case ExportFormat.JPEG:
        return 'jpg';
      case ExportFormat.SVG:
        return 'svg';
      case ExportFormat.PDF:
        return 'pdf';
      case ExportFormat.WEBP:
        return 'webp';
      default:
        return 'png';
    }
  }

  /**
   * Get MIME type for format
   */
  static getMimeType(format: ExportFormat): string {
    switch (format) {
      case ExportFormat.PNG:
        return 'image/png';
      case ExportFormat.JPEG:
        return 'image/jpeg';
      case ExportFormat.SVG:
        return 'image/svg+xml';
      case ExportFormat.PDF:
        return 'application/pdf';
      case ExportFormat.WEBP:
        return 'image/webp';
      default:
        return 'image/png';
    }
  }

  /**
   * Calculate optimal export dimensions based on DPI
   */
  static calculateDimensionsForDPI(
    width: number,
    height: number,
    dpi: number = 300
  ): { width: number; height: number } {
    const standardDPI = 96;
    const scale = dpi / standardDPI;

    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    };
  }

  /**
   * Generate filename with timestamp
   */
  static generateFilename(
    prefix: string = 'chart',
    format: ExportFormat,
    includeTimestamp: boolean = true
  ): string {
    const extension = ExportHelpers.getFileExtension(format);
    const timestamp = includeTimestamp ? `-${Date.now()}` : '';
    return `${prefix}${timestamp}.${extension}`;
  }
}
