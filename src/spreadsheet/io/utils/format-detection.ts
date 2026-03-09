/**
 * Format detection utilities
 */

import type { ExportFormat, ImportSource } from '../types.js';

/**
 * Detect format from file extension
 */
export function detectFormat(filename: string): ExportFormat | null {
  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'json':
      return ExportFormat.JSON;
    case 'csv':
      return ExportFormat.CSV;
    case 'xlsx':
    case 'xls':
      return ExportFormat.EXCEL;
    case 'pdf':
      return ExportFormat.PDF;
    case 'polln':
      return ExportFormat.POLLN;
    default:
      return null;
  }
}

/**
 * Detect import source from context
 */
export function detectImportSource(data: any): ImportSource | null {
  if (data instanceof File) {
    return ImportSource.FILE;
  }

  if (data instanceof DataTransfer) {
    return ImportSource.DRAG_DROP;
  }

  if (typeof data === 'string') {
    if (data.startsWith('http://') || data.startsWith('https://')) {
      return ImportSource.URL;
    }

    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'polln_cells' || parsed.type === 'polln_values') {
        return ImportSource.CLIPBOARD;
      }
    } catch {
      // Not JSON, could be CSV text
      return ImportSource.CLIPBOARD;
    }
  }

  if (Buffer.isBuffer(data)) {
    return ImportSource.FILE;
  }

  return null;
}

/**
 * Check if format is compatible with another
 */
export function isCompatibleFormat(
  format1: ExportFormat,
  format2: ExportFormat
): boolean {
  // Same format is always compatible
  if (format1 === format2) {
    return true;
  }

  // JSON and POLLN are mutually compatible (POLLN is serialized JSON)
  if ((format1 === ExportFormat.JSON || format1 === ExportFormat.POLLN) &&
      (format2 === ExportFormat.JSON || format2 === ExportFormat.POLLN)) {
    return true;
  }

  // CSV and Excel are somewhat compatible (tabular data)
  if ((format1 === ExportFormat.CSV || format1 === ExportFormat.EXCEL) &&
      (format2 === ExportFormat.CSV || format2 === ExportFormat.EXCEL)) {
    return true;
  }

  return false;
}

/**
 * Get mime type for format
 */
export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case ExportFormat.JSON:
      return 'application/json';
    case ExportFormat.CSV:
      return 'text/csv';
    case ExportFormat.EXCEL:
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case ExportFormat.PDF:
      return 'application/pdf';
    case ExportFormat.POLLN:
      return 'application/octet-stream';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case ExportFormat.JSON:
      return '.json';
    case ExportFormat.CSV:
      return '.csv';
    case ExportFormat.EXCEL:
      return '.xlsx';
    case ExportFormat.PDF:
      return '.pdf';
    case ExportFormat.POLLN:
      return '.polln';
    default:
      return '.dat';
  }
}

/**
 * Validate format against capabilities
 */
export function validateFormatCapabilities(
  format: ExportFormat,
  capabilities: {
    supportsMetadata?: boolean;
    supportsHistory?: boolean;
    supportsTrace?: boolean;
    supportsBinary?: boolean;
  }
): { compatible: boolean; missingCapabilities: string[] } {
  const missingCapabilities: string[] = [];

  const formatCapabilities: Record<ExportFormat, string[]> = {
    [ExportFormat.JSON]: ['metadata', 'history', 'trace', 'binary'],
    [ExportFormat.CSV]: [],
    [ExportFormat.EXCEL]: ['metadata'],
    [ExportFormat.PDF]: ['metadata', 'history'],
    [ExportFormat.POLLN]: ['metadata', 'history', 'trace', 'binary'],
  };

  const available = formatCapabilities[format];

  if (capabilities.supportsMetadata && !available.includes('metadata')) {
    missingCapabilities.push('metadata');
  }

  if (capabilities.supportsHistory && !available.includes('history')) {
    missingCapabilities.push('history');
  }

  if (capabilities.supportsTrace && !available.includes('trace')) {
    missingCapabilities.push('trace');
  }

  if (capabilities.supportsBinary && !available.includes('binary')) {
    missingCapabilities.push('binary');
  }

  return {
    compatible: missingCapabilities.length === 0,
    missingCapabilities,
  };
}

/**
 * Suggest format based on requirements
 */
export function suggestFormat(requirements: {
  needFullState?: boolean;
  needHumanReadable?: boolean;
  needCompactSize?: boolean;
  needTabular?: boolean;
  needVisualization?: boolean;
}): ExportFormat {
  if (requirements.needVisualization) {
    return ExportFormat.PDF;
  }

  if (requirements.needTabular) {
    return ExportFormat.EXCEL;
  }

  if (requirements.needCompactSize && requirements.needFullState) {
    return ExportFormat.POLLN;
  }

  if (requirements.needHumanReadable && requirements.needFullState) {
    return ExportFormat.JSON;
  }

  if (requirements.needCompactSize) {
    return ExportFormat.CSV;
  }

  return ExportFormat.JSON;
}
