/**
 * POLLN Spreadsheet - ResponsiveGrid Component
 *
 * Main responsive grid component that adapts layout based on breakpoint.
 * Features touch-optimized interactions, swipe navigation, and pinch-to-zoom.
 *
 * Performance targets:
 * - First Contentful Paint < 1.5s on mobile
 * - Time to Interactive < 3s on mobile
 * - 60fps animations
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useBreakpoint, useViewportSize } from './useBreakpoint';
import { useTouchGestures } from './useTouchGestures';
import type {
  Breakpoint,
  ResponsiveGridProps,
  ResponsiveCellData,
  GridViewport,
  ZoomState,
  PanState,
  SwipeDirection,
  DisplayMode,
} from './types';

/**
 * ResponsiveGrid - Adaptive spreadsheet grid
 *
 * Automatically adjusts layout and interactions based on device capabilities.
 * Mobile-optimized with touch gestures, desktop with full keyboard/mouse support.
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  cells,
  rows,
  cols,
  config = {},
  mode: propMode,
  onModeChange,
  onCellSelect,
  onCellLongPress,
  onCellDoubleClick,
  onRefresh,
  onLoadMore,
  onSwipe,
  onPinch,
  onZoomChange,
  onPan,
  selectedCellId,
  className = '',
  style = {},
  children,
}) => {
  // Breakpoint detection
  const detectedMode = useBreakpoint();
  const mode = propMode || detectedMode;
  const viewport = useViewportSize();

  // State
  const [viewportState, setViewportState] = useState<GridViewPort>({
    firstRow: 0,
    firstCol: 0,
    lastRow: Math.min(rows, 20),
    lastCol: Math.min(cols, 10),
    visibleRows: 20,
    visibleCols: 10,
  });

  const [zoomState, setZoomState] = useState<ZoomState>({
    level: 1,
    min: 0.5,
    max: 3,
    step: 0.1,
  });

  const [panState, setPanState] = useState<PanState>({
    x: 0,
    y: 0,
    minX: -500,
    maxX: 500,
    minY: -500,
    maxY: 500,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Refs
  const gridRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const pullStartYRef = useRef(0);
  const pulledDistanceRef = useRef(0);

  // Effective configuration with defaults
  const effectiveConfig = useMemo(() => ({
    enableTouchGestures: true,
    enablePinchZoom: true,
    enableSwipeNavigation: true,
    enablePullToRefresh: true,
    enableHapticFeedback: true,
    enableInfiniteScroll: true,
    infiniteScrollThreshold: 200,
    performanceMode: 'balanced' as const,
    ...config,
  }), [config]);

  // Touch gestures
  const touchGestures = useTouchGestures(gridRef, {
    onSwipe: useCallback((direction: SwipeDirection) => {
      if (effectiveConfig.enableSwipeNavigation) {
        handleSwipe(direction);
      }
    }, [effectiveConfig.enableSwipeNavigation]),
    onPinch: useCallback((scale: number) => {
      if (effectiveConfig.enablePinchZoom) {
        handlePinch(scale);
      }
    }, [effectiveConfig.enablePinchZoom]),
    onLongPress: useCallback(() => {
      // Triggered when long pressing on empty space
      // Could show context menu or create new cell
    }, []),
    onPan: useCallback((deltaX: number, deltaY: number) => {
      if (onPan) {
        onPan(deltaX, deltaY);
      } else {
        handlePan(deltaX, deltaY);
      }
    }, [onPan]),
  }, {
    enableHapticFeedback: effectiveConfig.enableHapticFeedback,
  });

  // Notify mode change
  useEffect(() => {
    if (onModeChange && mode !== detectedMode) {
      onModeChange(mode);
    }
  }, [mode, detectedMode, onModeChange]);

  // Handle swipe gesture
  const handleSwipe = useCallback((direction: SwipeDirection) => {
    onSwipe?.(direction);

    // Implement swipe navigation
    switch (direction) {
      case 'left':
        // Move to next column or page
        if (viewportState.lastCol < cols) {
          setViewportState(prev => ({
            ...prev,
            firstCol: Math.min(prev.firstCol + 5, cols - viewportState.visibleCols),
            lastCol: Math.min(prev.lastCol + 5, cols),
          }));
        }
        break;
      case 'right':
        // Move to previous column or page
        if (viewportState.firstCol > 0) {
          setViewportState(prev => ({
            ...prev,
            firstCol: Math.max(prev.firstCol - 5, 0),
            lastCol: Math.max(prev.lastCol - 5, viewportState.visibleCols),
          }));
        }
        break;
      case 'up':
        // Move to previous row
        if (viewportState.firstRow > 0) {
          setViewportState(prev => ({
            ...prev,
            firstRow: Math.max(prev.firstRow - 10, 0),
            lastRow: Math.max(prev.lastRow - 10, viewportState.visibleRows),
          }));
        }
        break;
      case 'down':
        // Move to next row
        if (viewportState.lastRow < rows) {
          setViewportState(prev => ({
            ...prev,
            firstRow: Math.min(prev.firstRow + 10, rows - viewportState.visibleRows),
            lastRow: Math.min(prev.lastRow + 10, rows),
          }));
        }
        break;
    }
  }, [onSwipe, viewportState, cols, rows]);

  // Handle pinch to zoom
  const handlePinch = useCallback((scale: number) => {
    const newZoom = Math.max(
      zoomState.min,
      Math.min(zoomState.max, scale)
    );

    setZoomState(prev => ({ ...prev, level: newZoom }));
    onPinch?.(scale);
    onZoomChange?.(newZoom);
  }, [zoomState.min, zoomState.max, onPinch, onZoomChange]);

  // Handle pan
  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    setPanState(prev => ({
      ...prev,
      x: Math.max(prev.minX, Math.min(prev.maxX, prev.x + deltaX)),
      y: Math.max(prev.minY, Math.min(prev.maxY, prev.y + deltaY)),
    }));
  }, []);

  // Handle cell selection
  const handleCellSelect = useCallback((cellId: string, position: { row: number; col: number }) => {
    onCellSelect?.(cellId, position);
  }, [onCellSelect]);

  // Handle cell long press
  const handleCellLongPress = useCallback((cellId: string, position: { row: number; col: number }) => {
    onCellLongPress?.(cellId, position);
  }, [onCellLongPress]);

  // Handle pull to refresh
  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      pulledDistanceRef.current = 0;
    }
  }, [onRefresh, isRefreshing]);

  // Handle infinite scroll
  const handleLoadMore = useCallback(async () => {
    if (!onLoadMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoadingMore(false);
    }
  }, [onLoadMore, isLoadingMore]);

  // Render appropriate grid layout based on mode
  const renderGridLayout = () => {
    switch (mode) {
      case 'mobile':
        return renderMobileGrid();
      case 'tablet':
        return renderTabletGrid();
      case 'desktop':
        return renderDesktopGrid();
      default:
        return renderDesktopGrid();
    }
  };

  // Render mobile grid (simplified)
  const renderMobileGrid = () => {
    const visibleCells = getVisibleCells('simplified');

    return (
      <div style={styles.mobileGridContainer}>
        {visibleCells.map(cell => renderMobileCell(cell))}
      </div>
    );
  };

  // Render tablet grid (balanced)
  const renderTabletGrid = () => {
    const visibleCells = getVisibleCells('card');

    return (
      <div style={styles.tabletGridContainer}>
        {visibleCells.map(cell => renderCardCell(cell))}
      </div>
    );
  };

  // Render desktop grid (full)
  const renderDesktopGrid = () => {
    return (
      <div style={{
        transform: `translate(${panState.x}px, ${panState.y}px) scale(${zoomState.level})`,
        transformOrigin: 'top left',
        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
      }}>
        {/* Column headers */}
        <div style={styles.rowHeader}>
          <div style={{ width: '40px', flexShrink: 0 }} />
          {Array.from({ length: cols }, (_, i) => (
            <div key={i} style={styles.columnHeader}>
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} style={styles.gridRow}>
            <div style={styles.rowHeaderCell}>
              {row + 1}
            </div>
            {Array.from({ length: cols }, (_, col) => {
              const cellId = `${String.fromCharCode(65 + col)}${row + 1}`;
              const cell = cells.get(cellId);
              return renderDesktopCell(cellId, cell, row, col);
            })}
          </div>
        ))}
      </div>
    );
  };

  // Render mobile cell (simplified)
  const renderMobileCell = (cell: ResponsiveCellData) => (
    <div
      key={cell.id}
      onClick={() => handleCellSelect(cell.id, cell.position)}
      onContextMenu={(e) => {
        e.preventDefault();
        handleCellLongPress(cell.id, cell.position);
      }}
      style={{
        ...styles.mobileCell,
        ...(selectedCellId === cell.id ? styles.mobileCellSelected : {}),
      }}
    >
      <div style={styles.mobileCellHeader}>
        <span style={styles.mobileCellPosition}>
          {String.fromCharCode(65 + cell.position.col)}{cell.position.row + 1}
        </span>
        <span style={styles.mobileCellType}>{cell.type}</span>
      </div>
      <div style={styles.mobileCellValue}>
        {formatCellValue(cell.value)}
      </div>
    </div>
  );

  // Render card cell (tablet)
  const renderCardCell = (cell: ResponsiveCellData) => (
    <div
      key={cell.id}
      onClick={() => handleCellSelect(cell.id, cell.position)}
      style={{
        ...styles.cardCell,
        ...(selectedCellId === cell.id ? styles.cardCellSelected : {}),
      }}
    >
      <div style={styles.cardCellHeader}>
        <span style={styles.cardCellPosition}>
          {String.fromCharCode(65 + cell.position.col)}{cell.position.row + 1}
        </span>
        <span style={styles.cardCellType}>{cell.type}</span>
      </div>
      <div style={styles.cardCellValue}>
        {formatCellValue(cell.value)}
      </div>
      <div style={styles.cardCellFooter}>
        <span style={styles.cardCellState}>{cell.state}</span>
        <span style={styles.cardCellConfidence}>
          {Math.round(cell.confidence * 100)}%
        </span>
      </div>
    </div>
  );

  // Render desktop cell (full)
  const renderDesktopCell = (
    cellId: string,
    cell: ResponsiveCellData | undefined,
    row: number,
    col: number
  ) => (
    <div
      key={cellId}
      onClick={() => cell && handleCellSelect(cell.id, cell.position)}
      onDoubleClick={() => cell && onCellDoubleClick?.(cell.id)}
      style={{
        ...styles.desktopCell,
        ...(selectedCellId === cellId ? styles.desktopCellSelected : {}),
      }}
    >
      {cell ? formatCellValue(cell.value) : ''}
    </div>
  );

  // Get visible cells based on display mode
  const getVisibleCells = (displayMode: DisplayMode): ResponsiveCellData[] => {
    const allCells = Array.from(cells.values());

    if (displayMode === 'simplified') {
      // Show fewer cells on mobile
      return allCells.slice(0, 20);
    } else if (displayMode === 'card') {
      // Show more cells on tablet
      return allCells.slice(0, 50);
    } else {
      return allCells;
    }
  };

  // Format cell value for display
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div
      ref={gridRef}
      className={`responsive-grid responsive-grid-${mode} ${className}`}
      style={{ ...styles.container, ...style }}
      aria-label="Spreadsheet grid"
      role="grid"
    >
      {/* Mode indicator (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={styles.modeIndicator}>
          {mode} • {viewport.orientation} • {Math.round(viewport.width)}x{Math.round(viewport.height)}
        </div>
      )}

      {/* Grid content */}
      {renderGridLayout()}

      {/* Children (additional overlays) */}
      {children}

      {/* Refreshing indicator */}
      {isRefreshing && (
        <div style={styles.refreshingIndicator}>
          <div style={styles.spinner} />
          <span>Refreshing...</span>
        </div>
      )}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div style={styles.loadingIndicator}>
          <div style={styles.spinner} />
          <span>Loading more...</span>
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
    backgroundColor: '#f5f5f5',
    touchAction: 'manipulation', // Optimize for touch
  },

  // Mode indicator
  modeIndicator: {
    position: 'fixed',
    bottom: '8px',
    right: '8px',
    padding: '4px 8px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: '10px',
    borderRadius: '4px',
    zIndex: 1000,
  },

  // Mobile grid
  mobileGridContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1px',
    padding: '8px',
  },
  mobileCell: {
    backgroundColor: '#fff',
    padding: '12px',
    borderRadius: '8px',
    minHeight: '60px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  mobileCellSelected: {
    backgroundColor: '#e3f2fd',
    boxShadow: '0 0 0 2px #2196F3',
  },
  mobileCellHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '12px',
  },
  mobileCellPosition: {
    fontWeight: 600,
    color: '#666',
  },
  mobileCellType: {
    color: '#999',
    textTransform: 'uppercase' as const,
    fontSize: '10px',
  },
  mobileCellValue: {
    fontSize: '14px',
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },

  // Tablet grid
  tabletGridContainer: {
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
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  cardCellSelected: {
    boxShadow: '0 0 0 2px #2196F3',
  },
  cardCellHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  cardCellPosition: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
  },
  cardCellType: {
    fontSize: '10px',
    color: '#999',
    textTransform: 'uppercase' as const,
  },
  cardCellValue: {
    fontSize: '14px',
    color: '#333',
    minHeight: '20px',
    marginBottom: '8px',
    wordBreak: 'break-word' as const,
  },
  cardCellFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
  },
  cardCellState: {
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#f5f5f5',
  },
  cardCellConfidence: {
    color: '#999',
  },

  // Desktop grid
  rowHeader: {
    display: 'flex',
    marginBottom: '4px',
  },
  columnHeader: {
    width: '100px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#888',
    fontSize: '12px',
    fontWeight: 'bold',
    border: '1px solid #ddd',
    backgroundColor: '#f9f9f9',
  },
  gridRow: {
    display: 'flex',
    marginBottom: '1px',
  },
  rowHeaderCell: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#888',
    fontSize: '12px',
    fontWeight: 'bold',
    border: '1px solid #ddd',
    backgroundColor: '#f9f9f9',
  },
  desktopCell: {
    width: '100px',
    height: '40px',
    border: '1px solid #ddd',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    userSelect: 'none',
  },
  desktopCellSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
    borderWidth: '2px',
  },

  // Indicators
  refreshingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  loadingIndicator: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '16px',
    gap: '8px',
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

export default ResponsiveGrid;
