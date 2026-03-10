/**
 * POLLN Spreadsheet - AdaptiveRenderer Component
 *
 * Intelligently renders grid cells based on device capabilities and viewport.
 * Implements progressive loading, virtual scrolling, and column visibility controls.
 *
 * Performance targets:
 * - Virtual scrolling with 60fps
 * - Progressive loading with lazy hydration
 * - Memory-efficient cell caching
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type {
  Breakpoint,
  AdaptiveRendererProps,
  AdaptiveRendererConfig,
  GridViewport,
  ColumnVisibilityConfig,
  DisplayMode,
} from './types';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AdaptiveRendererConfig = {
  progressiveLoading: true,
  lazyLoadImages: true,
  virtualScrolling: true,
  virtualScrollThreshold: 50,
  columnVisibility: {
    defaultVisible: true,
    breakpoints: {
      mobile: true,
      tablet: true,
      desktop: true,
    },
  },
  rowVisibility: {
    defaultVisible: true,
    breakpoints: {
      mobile: true,
      tablet: true,
      desktop: true,
    },
  },
};

/**
 * AdaptiveRenderer - Smart cell rendering
 *
 * Optimizes rendering based on:
 * - Device capabilities (memory, CPU)
 * - Viewport size and scroll position
 * - Cell visibility settings
 * - Progressive loading strategy
 */
export const AdaptiveRenderer: React.FC<AdaptiveRendererProps> = ({
  cells,
  rows,
  cols,
  mode,
  config = {},
  onCellRender,
  onViewportChange,
  className = '',
  style = {},
}) => {
  // State
  const [viewport, setViewport] = useState<GridViewPort>({
    firstRow: 0,
    firstCol: 0,
    lastRow: Math.min(rows, getVisibleRowCount(mode)),
    lastCol: Math.min(cols, getVisibleColCount(mode)),
    visibleRows: getVisibleRowCount(mode),
    visibleCols: getVisibleColCount(mode),
  });

  const [renderedCells, setRenderedCells] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportObserverRef = useRef<IntersectionObserver | null>(null);
  const cellCacheRef = useRef<Map<string, React.ReactNode>>(new Map());
  const renderQueueRef = useRef<string[]>([]);

  // Effective configuration
  const effectiveConfig = useMemo<AdaptiveRendererConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...config,
    columnVisibility: {
      ...DEFAULT_CONFIG.columnVisibility,
      ...config.columnVisibility,
    },
    rowVisibility: {
      ...DEFAULT_CONFIG.rowVisibility,
      ...config.rowVisibility,
    },
  }), [config]);

  // Get visible row count based on mode
  function getVisibleRowCount(mode: Breakpoint): number {
    switch (mode) {
      case 'mobile':
        return 10;
      case 'tablet':
        return 20;
      case 'desktop':
        return 30;
    }
  }

  // Get visible column count based on mode
  function getVisibleColCount(mode: Breakpoint): number {
    switch (mode) {
      case 'mobile':
        return 3;
      case 'tablet':
        return 6;
      case 'desktop':
        return 10;
    }
  }

  // Determine display mode based on configuration
  const displayMode = useMemo<DisplayMode>(() => {
    if (mode === 'mobile') return 'simplified';
    if (mode === 'tablet') return 'card';
    return 'full';
  }, [mode]);

  // Get visible columns
  const visibleColumns = useMemo(() => {
    const colConfig = effectiveConfig.columnVisibility!;
    const visible: number[] = [];

    for (let col = 0; col < cols; col++) {
      let isVisible = colConfig.defaultVisible;

      // Check breakpoint-specific visibility
      const breakpointConfig = colConfig.breakpoints[mode];
      if (typeof breakpointConfig === 'boolean') {
        isVisible = breakpointConfig;
      } else if (Array.isArray(breakpointConfig)) {
        isVisible = breakpointConfig.includes(col);
      }

      if (isVisible) {
        visible.push(col);
      }
    }

    return visible;
  }, [cols, effectiveConfig.columnVisibility, mode]);

  // Get visible rows
  const visibleRows = useMemo(() => {
    const rowConfig = effectiveConfig.rowVisibility!;
    const visible: number[] = [];

    for (let row = 0; row < rows; row++) {
      let isVisible = rowConfig.defaultVisible;

      // Check breakpoint-specific visibility
      const breakpointConfig = rowConfig.breakpoints[mode];
      if (typeof breakpointConfig === 'boolean') {
        isVisible = breakpointConfig;
      } else if (Array.isArray(breakpointConfig)) {
        isVisible = breakpointConfig.includes(row);
      }

      if (isVisible) {
        visible.push(row);
      }
    }

    return visible;
  }, [rows, effectiveConfig.rowVisibility, mode]);

  // Filter cells to render
  const cellsToRender = useMemo(() => {
    const allCells = Array.from(cells.values());
    const filtered: typeof allCells = [];

    for (const cell of allCells) {
      const isColVisible = visibleColumns.includes(cell.position.col);
      const isRowVisible = visibleRows.includes(cell.position.row);

      if (isColVisible && isRowVisible) {
        filtered.push(cell);
      }
    }

    return filtered;
  }, [cells, visibleColumns, visibleRows]);

  // Setup intersection observer for virtual scrolling
  useEffect(() => {
    if (!effectiveConfig.virtualScrolling || !containerRef.current) return;

    const observerOptions = {
      root: containerRef.current,
      rootMargin: '100px',
      threshold: 0.1,
    };

    viewportObserverRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const cellId = entry.target.getAttribute('data-cell-id');
          if (cellId && !renderedCells.has(cellId)) {
            queueCellForRender(cellId);
          }
        }
      });
    }, observerOptions);

    return () => {
      viewportObserverRef.current?.disconnect();
    };
  }, [effectiveConfig.virtualScrolling, renderedCells]);

  // Notify viewport change
  useEffect(() => {
    onViewportChange?.({
      start: viewport.firstRow,
      end: viewport.lastRow,
    });
  }, [viewport, onViewportChange]);

  // Queue cell for rendering
  const queueCellForRender = useCallback((cellId: string) => {
    if (!renderQueueRef.current.includes(cellId)) {
      renderQueueRef.current.push(cellId);
      processRenderQueue();
    }
  }, [renderedCells]);

  // Process render queue with progressive loading
  const processRenderQueue = useCallback(() => {
    if (isLoading || renderQueueRef.current.length === 0) return;

    setIsLoading(true);

    // Use requestIdleCallback for non-blocking rendering
    const processBatch = (deadline: IdleDeadline) => {
      while (deadline.timeRemaining() > 0 && renderQueueRef.current.length > 0) {
        const cellId = renderQueueRef.current.shift()!;
        setRenderedCells(prev => new Set([...prev, cellId]));
        onCellRender?.(cellId);
      }

      if (renderQueueRef.current.length > 0) {
        requestIdleCallback(processBatch);
      } else {
        setIsLoading(false);
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(processBatch);
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        while (renderQueueRef.current.length > 0) {
          const cellId = renderQueueRef.current.shift()!;
          setRenderedCells(prev => new Set([...prev, cellId]));
          onCellRender?.(cellId);
        }
        setIsLoading(false);
      }, 0);
    }
  }, [isLoading, onCellRender]);

  // Render cell based on display mode
  const renderCell = useCallback((cellId: string, cell: any) => {
    const isRendered = renderedCells.has(cellId);

    if (!isRendered && effectiveConfig.progressiveLoading) {
      // Render placeholder
      return renderPlaceholder(cell);
    }

    // Render actual cell
    switch (displayMode) {
      case 'simplified':
        return renderSimplifiedCell(cell);
      case 'card':
        return renderCardCell(cell);
      case 'list':
        return renderListCell(cell);
      case 'full':
        return renderFullCell(cell);
      default:
        return renderFullCell(cell);
    }
  }, [renderedCells, effectiveConfig.progressiveLoading, displayMode]);

  // Render placeholder
  const renderPlaceholder = (cell: any) => (
    <div
      key={cell.id}
      data-cell-id={cell.id}
      style={styles.placeholderCell}
    >
      <div style={styles.placeholderShimmer} />
    </div>
  );

  // Render simplified cell (mobile)
  const renderSimplifiedCell = (cell: any) => (
    <div
      key={cell.id}
      data-cell-id={cell.id}
      style={styles.simplifiedCell}
    >
      <span style={styles.simplifiedCellLabel}>
        {String.fromCharCode(65 + cell.position.col)}{cell.position.row + 1}
      </span>
      <span style={styles.simplifiedCellValue}>
        {formatCellValue(cell.value)}
      </span>
    </div>
  );

  // Render card cell (tablet)
  const renderCardCell = (cell: any) => (
    <div
      key={cell.id}
      data-cell-id={cell.id}
      style={styles.cardCell}
    >
      <div style={styles.cardHeader}>
        <span style={styles.cardPosition}>
          {String.fromCharCode(65 + cell.position.col)}{cell.position.row + 1}
        </span>
        <span style={styles.cardType}>{cell.type}</span>
      </div>
      <div style={styles.cardValue}>
        {formatCellValue(cell.value)}
      </div>
      <div style={styles.cardFooter}>
        <span style={styles.cardState}>{cell.state}</span>
        <span style={styles.cardConfidence}>
          {Math.round(cell.confidence * 100)}%
        </span>
      </div>
    </div>
  );

  // Render list cell
  const renderListCell = (cell: any) => (
    <div
      key={cell.id}
      data-cell-id={cell.id}
      style={styles.listCell}
    >
      <div style={styles.listPosition}>
        {String.fromCharCode(65 + cell.position.col)}{cell.position.row + 1}
      </div>
      <div style={styles.listValue}>
        {formatCellValue(cell.value)}
      </div>
      <div style={styles.listState}>{cell.state}</div>
    </div>
  );

  // Render full cell (desktop)
  const renderFullCell = (cell: any) => (
    <div
      key={cell.id}
      data-cell-id={cell.id}
      style={styles.fullCell}
    >
      {formatCellValue(cell.value)}
    </div>
  );

  // Format cell value
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Render grid based on display mode
  const renderGrid = () => {
    switch (displayMode) {
      case 'simplified':
        return renderSimplifiedGrid();
      case 'card':
        return renderCardGrid();
      case 'list':
        return renderListGrid();
      case 'full':
        return renderFullGrid();
    }
  };

  // Render simplified grid
  const renderSimplifiedGrid = () => (
    <div style={styles.simplifiedGrid}>
      {cellsToRender.map(cell => renderCell(cell.id, cell))}
    </div>
  );

  // Render card grid
  const renderCardGrid = () => (
    <div style={styles.cardGrid}>
      {cellsToRender.map(cell => renderCell(cell.id, cell))}
    </div>
  );

  // Render list grid
  const renderListGrid = () => (
    <div style={styles.listGrid}>
      {cellsToRender.map(cell => renderCell(cell.id, cell))}
    </div>
  );

  // Render full grid
  const renderFullGrid = () => (
    <div style={styles.fullGrid}>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} style={styles.fullRow}>
          {Array.from({ length: cols }, (_, col) => {
            if (!visibleColumns.includes(col)) return null;
            const cellId = `${String.fromCharCode(65 + col)}${row + 1}`;
            const cell = cells.get(cellId);
            return renderCell(cellId, cell);
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`adaptive-renderer adaptive-renderer-${mode} ${className}`}
      style={{ ...styles.container, ...style }}
      role="grid"
      aria-label="Adaptive grid view"
    >
      {renderGrid()}

      {/* Loading indicator */}
      {isLoading && (
        <div style={styles.loadingIndicator}>
          <div style={styles.spinner} />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    overflow: 'auto',
    position: 'relative',
  },

  // Placeholder
  placeholderCell: {
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative' as const,
  },
  placeholderShimmer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(90deg, #f5f5f5 25%, #e8e8e8 50%, #f5f5f5 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },

  // Simplified (mobile)
  simplifiedGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1px',
  },
  simplifiedCell: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#fff',
    fontSize: '14px',
  },
  simplifiedCellLabel: {
    fontWeight: 600,
    color: '#666',
  },
  simplifiedCellValue: {
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },

  // Card (tablet)
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '8px',
    padding: '8px',
  },
  cardCell: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  cardPosition: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
  },
  cardType: {
    fontSize: '10px',
    color: '#999',
    textTransform: 'uppercase' as const,
  },
  cardValue: {
    fontSize: '14px',
    color: '#333',
    minHeight: '20px',
    marginBottom: '8px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
  },
  cardState: {
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#f5f5f5',
  },
  cardConfidence: {
    color: '#999',
  },

  // List
  listGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1px',
    backgroundColor: '#e0e0e0',
  },
  listCell: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 80px',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  listPosition: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
  },
  listValue: {
    fontSize: '14px',
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  listState: {
    fontSize: '10px',
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: '#f5f5f5',
    textAlign: 'center' as const,
  },

  // Full (desktop)
  fullGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  fullRow: {
    display: 'flex',
    marginBottom: '1px',
  },
  fullCell: {
    width: '100px',
    height: '40px',
    border: '1px solid #ddd',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    backgroundColor: '#fff',
  },

  // Loading
  loadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #e0e0e0',
    borderTopColor: '#2196F3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

export default AdaptiveRenderer;
