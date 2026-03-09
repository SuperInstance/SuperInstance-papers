/**
 * Export/Import UI Components
 *
 * React components for user-friendly export and import operations
 * with progress indicators, error handling, and conflict resolution.
 */

import React, { useState, useRef, useCallback } from 'react';
import type {
  ExportFormat,
  ImportSource,
  ExportConfig,
  ImportConfig,
  ImportResult,
  ExportStatistics,
  ProgressCallback,
} from '../types.js';

// Styles (inline for portability, can be moved to CSS)
const styles = {
  container: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  } as React.CSSProperties,

  button: {
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  buttonPrimary: {
    backgroundColor: '#007bff',
    color: 'white',
  } as React.CSSProperties,

  buttonSecondary: {
    backgroundColor: '#6c757d',
    color: 'white',
  } as React.CSSProperties,

  buttonSuccess: {
    backgroundColor: '#28a745',
    color: 'white',
  } as React.CSSProperties,

  buttonHover: {
    transform: 'translateY(-1px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  } as React.CSSProperties,

  dropdown: {
    position: 'relative',
  } as React.CSSProperties,

  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000,
    minWidth: '200px',
  } as React.CSSProperties,

  dropdownItem: {
    padding: '10px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #eee',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,

  dropdownItemHover: {
    backgroundColor: '#f8f9fa',
  } as React.CSSProperties,

  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  } as React.CSSProperties,

  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
  } as React.CSSProperties,

  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '16px',
  } as React.CSSProperties,

  progressFill: {
    height: '100%',
    backgroundColor: '#007bff',
    transition: 'width 0.3s ease',
  } as React.CSSProperties,

  dropZone: {
    border: '2px dashed #ccc',
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  dropZoneActive: {
    borderColor: '#007bff',
    backgroundColor: '#f8f9fa',
  } as React.CSSProperties,

  dropZoneHover: {
    borderColor: '#007bff',
    backgroundColor: '#e7f3ff',
  } as React.CSSProperties,
};

/**
 * Export Button Component
 */
export interface ExportButtonProps {
  cells: any[];
  onExportComplete?: (data: any, statistics: ExportStatistics) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  config?: Partial<ExportConfig>;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  cells,
  onExportComplete,
  onError,
  disabled = false,
  config = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });

  const handleExport = useCallback(async (format: ExportFormat) => {
    setIsExporting(true);
    setIsOpen(false);

    try {
      const { Exporter } = await import('../Exporter.js');
      const exporter = new Exporter();

      const progressCallback: ProgressCallback = (current, total, stage) => {
        setProgress({ current, total, stage });
      };

      const result = await exporter.export(
        cells,
        { format, ...config, pretty: true },
        progressCallback
      );

      // Download file
      await downloadFile(result.data, format);

      onExportComplete?.(result.data, result.statistics);
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsExporting(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, [cells, config, onExportComplete, onError]);

  const downloadFile = async (data: any, format: ExportFormat) => {
    let blob: Blob;
    let filename = `polln-export-${Date.now()}`;

    switch (format) {
      case 'json':
        blob = new Blob([data], { type: 'application/json' });
        filename += '.json';
        break;

      case 'csv':
        const csv = convertToCSV(data);
        blob = new Blob([csv], { type: 'text/csv' });
        filename += '.csv';
        break;

      case 'excel':
        // Would need a library like xlsx
        blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        filename += '.xlsx';
        break;

      case 'pdf':
        blob = new Blob([data], { type: 'application/pdf' });
        filename += '.pdf';
        break;

      case 'polln':
        blob = new Blob([data], { type: 'application/octet-stream' });
        filename += '.polln';
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (csvData: any): string => {
    const { headers, rows } = csvData;
    const headerRow = headers.join(',');
    const dataRows = rows.map((row: any) =>
      headers.map(h => JSON.stringify(row[h] || '')).join(',')
    );
    return [headerRow, ...dataRows].join('\n');
  };

  return (
    <div style={styles.dropdown}>
      <button
        style={{ ...styles.button, ...styles.buttonPrimary }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
      >
        {isExporting ? (
          <>
            <span>⏳</span>
            <span>Exporting... {progress.current}/{progress.total}</span>
          </>
        ) : (
          <>
            <span>📤</span>
            <span>Export</span>
            <span>▼</span>
          </>
        )}
      </button>

      {isOpen && !isExporting && (
        <div style={styles.dropdownMenu}>
          <div style={{ ...styles.dropdownItem, ...styles.dropdownItemHover }} onClick={() => handleExport('json')}>
            <span>📄</span>
            <span>JSON</span>
          </div>
          <div style={styles.dropdownItem} onClick={() => handleExport('csv')}>
            <span>📊</span>
            <span>CSV</span>
          </div>
          <div style={styles.dropdownItem} onClick={() => handleExport('excel')}>
            <span>📈</span>
            <span>Excel</span>
          </div>
          <div style={styles.dropdownItem} onClick={() => handleExport('pdf')}>
            <span>📑</span>
            <span>PDF</span>
          </div>
          <div style={styles.dropdownItem} onClick={() => handleExport('polln')}>
            <span>🔒</span>
            <span>POLLN (Binary)</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Import Button Component
 */
export interface ImportButtonProps {
  onImportComplete?: (result: ImportResult) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  config?: Partial<ImportConfig>;
  accept?: string;
}

export const ImportButton: React.FC<ImportButtonProps> = ({
  onImportComplete,
  onError,
  disabled = false,
  config = {},
  accept = '.json,.csv,.polln',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showDropZone, setShowDropZone] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = useCallback(async (file: File) => {
    setIsImporting(true);
    setShowDropZone(false);

    try {
      const { Importer } = await import('../Importer.js');
      const importer = new Importer();

      const progressCallback: ProgressCallback = (current, total, stage) => {
        setProgress({ current, total, stage });
      };

      const data = await file.arrayBuffer();
      const buffer = Buffer.from(data);

      const result = await importer.import(
        'file',
        buffer,
        { source: 'file', ...config },
        undefined,
        progressCallback
      );

      onImportComplete?.(result);
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsImporting(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, [config, onImportComplete, onError]);

  const handleClipboardImport = useCallback(async () => {
    setIsImporting(true);
    setIsOpen(false);

    try {
      const clipboardData = await navigator.clipboard.readText();
      const { Importer } = await import('../Importer.js');
      const importer = new Importer();

      const result = await importer.import(
        'clipboard',
        clipboardData,
        { source: 'clipboard', ...config }
      );

      onImportComplete?.(result);
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsImporting(false);
    }
  }, [config, onImportComplete, onError]);

  const handleURLImport = useCallback(async () => {
    const url = prompt('Enter URL to import from:');
    if (!url) return;

    setIsImporting(true);
    setIsOpen(false);

    try {
      const { Importer } = await import('../Importer.js');
      const importer = new Importer();

      const result = await importer.import(
        'url',
        url,
        { source: 'url', ...config }
      );

      onImportComplete?.(result);
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsImporting(false);
    }
  }, [config, onImportComplete, onError]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setShowDropZone(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileImport(files[0]);
    }
  }, [handleFileImport]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <>
      <div style={styles.dropdown}>
        <button
          style={{ ...styles.button, ...styles.buttonSuccess }}
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || isImporting}
        >
          {isImporting ? (
            <>
              <span>⏳</span>
              <span>Importing... {progress.current}/{progress.total}</span>
            </>
          ) : (
            <>
              <span>📥</span>
              <span>Import</span>
              <span>▼</span>
            </>
          )}
        </button>

        {isOpen && !isImporting && (
          <div style={styles.dropdownMenu}>
            <div style={styles.dropdownItem} onClick={() => fileInputRef.current?.click()}>
              <span>📁</span>
              <span>From File</span>
            </div>
            <div style={styles.dropdownItem} onClick={handleClipboardImport}>
              <span>📋</span>
              <span>From Clipboard</span>
            </div>
            <div style={styles.dropdownItem} onClick={handleURLImport}>
              <span>🔗</span>
              <span>From URL</span>
            </div>
            <div style={styles.dropdownItem} onClick={() => setShowDropZone(true)}>
              <span>📥</span>
              <span>Drag & Drop</span>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileImport(file);
        }}
      />

      {showDropZone && (
        <ImportDropZone
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClose={() => setShowDropZone(false)}
        />
      )}
    </>
  );
};

/**
 * Drop Zone Component
 */
interface ImportDropZoneProps {
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onClose: () => void;
}

const ImportDropZone: React.FC<ImportDropZoneProps> = ({ onDrop, onDragOver, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div style={styles.modal} onClick={onClose}>
      <div
        style={{
          ...styles.dropZone,
          ...(isDragging ? styles.dropZoneActive : {}),
        }}
        onDrop={(e) => {
          setIsDragging(false);
          onDrop(e);
        }}
        onDragOver={(e) => {
          setIsDragging(true);
          onDragOver(e);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📥</div>
        <h3>Drop your file here</h3>
        <p style={{ color: '#666', marginTop: '8px' }}>
          Supports: JSON, CSV, POLLN
        </p>
        <button
          style={{ ...styles.button, ...styles.buttonSecondary, marginTop: '16px' }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

/**
 * Progress Modal Component
 */
export interface ProgressModalProps {
  isOpen: boolean;
  current: number;
  total: number;
  stage: string;
  title?: string;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  current,
  total,
  stage,
  title = 'Processing',
}) => {
  if (!isOpen) return null;

  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h2>{title}</h2>
        <p style={{ color: '#666', marginTop: '8px' }}>{stage}</p>

        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${percentage}%` }} />
        </div>

        <p style={{ textAlign: 'center', marginTop: '8px' }}>
          {current} / {total} ({Math.round(percentage)}%)
        </p>
      </div>
    </div>
  );
};

/**
 * Combined Export/Import Toolbar
 */
export interface ExportImportToolbarProps {
  cells: any[];
  onExportComplete?: (data: any, statistics: ExportStatistics) => void;
  onImportComplete?: (result: ImportResult) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
}

export const ExportImportToolbar: React.FC<ExportImportToolbarProps> = ({
  cells,
  onExportComplete,
  onImportComplete,
  onError,
  disabled = false,
}) => {
  return (
    <div style={styles.container}>
      <ExportButton
        cells={cells}
        onExportComplete={onExportComplete}
        onError={onError}
        disabled={disabled}
      />

      <ImportButton
        onImportComplete={onImportComplete}
        onError={onError}
        disabled={disabled}
      />
    </div>
  );
};

export default ExportImportToolbar;
