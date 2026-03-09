/**
 * POLLN Spreadsheet - MobileGrid Component
 *
 * Mobile-optimized grid display with card-based layout, swipeable cells,
 * pull-to-refresh, and infinite scroll capabilities.
 *
 * Target: First Contentful Paint < 1.5s on mobile
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LogCell } from '../core/LogCell.js';
import { CellState } from '../core/types.js';
import { GestureHandler, GestureEvent } from './GestureHandler.js';
import { ResponsiveBreakpoints, Breakpoint } from './ResponsiveBreakpoints.js';

/**
 * Cell data for mobile display
 */
export interface MobileCellData {
  id: string;
  position: { row: number; col: number };
  value: any;
  state: CellState;
  type: string;
  timestamp: number;
}

/**
 * Mobile grid configuration
 */
export interface MobileGridConfig {
  initialRowCount?: number;
  initialColCount?: number;
  cardView?: boolean;
  enablePullToRefresh?: boolean;
  enableInfiniteScroll?: boolean;
  infiniteScrollThreshold?: number;
  enableSwipeGestures?: boolean;
  enableHapticFeedback?: boolean;
  customCardRenderer?: (cell: MobileCellData) => React.ReactNode;
}

/**
 * Props for MobileGrid component
 */
export interface MobileGridProps {
  cells: Map<string, LogCell>;
  config?: MobileGridConfig;
  onCellSelect?: (cellId: string, position: { row: number; col: number }) => void;
  onCellLongPress?: (cellId: string, position: { row: number; col: number }) => void;
  onRefresh?: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
  onSwipeLeft?: (cellId: string) => void;
  onSwipeRight?: (cellId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * View mode for mobile grid
 */
type ViewMode = 'card' | 'list' | 'grid';

/**
 * MobileGrid - Optimized for mobile devices
 *
 * Features:
 * - Card-based layout (default view)
 * - Swipeable cell cards
 * - Pull-to-refresh
 * - Infinite scroll
 * - Touch-optimized cell selection
 */
export const MobileGrid: React.FC<MobileGridProps> = ({
  cells,
  config = {},
  onCellSelect,
  onCellLongPress,
  onRefresh,
  onLoadMore,
  onSwipeLeft,
  onSwipeRight,
  className = '',
  style = {},
}) => {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>(config.cardView !== false ? 'card' : 'grid');
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>(
    ResponsiveBreakpoints.getCurrentBreakpoint()
  );
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [pulledDistance, setPulledDistance] = useState(0);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const gestureHandlerRef = useRef<GestureHandler | null>(null);
  const lastScrollTopRef = useRef(0);
  const pullStartYRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Configuration with defaults
  const effectiveConfig = useMemo(() => ({
    cardView: true,
    enablePullToRefresh: true,
    enableInfiniteScroll: true,
    infiniteScrollThreshold: 200,
    enableSwipeGestures: true,
    enableHapticFeedback: true,
    ...config,
  }), [config]);

  // Convert cells to mobile-optimized format
  const mobileCells: MobileCellData[] = useMemo(() => {
    return Array.from(cells.values()).map(cell => ({
      id: cell.id,
      position: cell.position,
      value: (cell as any).value,
      state: cell.getState(),
      type: cell.type,
      timestamp: Date.now(),
    }));
  }, [cells]);

  // Handle gesture events
  const handleGesture = useCallback((event: GestureEvent) => {
    const { gesture, cellId, position } = event;

    if (effectiveConfig.enableHapticFeedback && 'vibrate' in navigator) {
      switch (gesture) {
        case 'tap':
          navigator.vibrate(10);
          break;
        case 'longPress':
          navigator.vibrate([20, 50, 20]);
          break;
        case 'swipeLeft':
        case 'swipeRight':
          navigator.vibrate(15);
          break;
      }
    }

    switch (gesture) {
      case 'tap':
        setSelectedCellId(cellId);
        onCellSelect?.(cellId, position);
        break;
      case 'longPress':
        setSelectedCellId(cellId);
        onCellLongPress?.(cellId, position);
        break;
      case 'swipeLeft':
        onSwipeLeft?.(cellId);
        break;
      case 'swipeRight':
        onSwipeRight?.(cellId);
        break;
      case 'pinchIn':
        setViewMode('card');
        break;
      case 'pinchOut':
        setViewMode('grid');
        break;
    }
  }, [effectiveConfig.enableHapticFeedback, onCellSelect, onCellLongPress, onSwipeLeft, onSwipeRight]);

  // Handle pull-to-refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!effectiveConfig.enablePullToRefresh || !onRefresh) return;

    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    pullStartYRef.current = touch.clientY;

    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setPulledDistance(0);
    }
  }, [effectiveConfig.enablePullToRefresh, onRefresh]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!effectiveConfig.enablePullToRefresh || !onRefresh) return;
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - pullStartYRef.current;

    if (containerRef.current && containerRef.current.scrollTop === 0 && deltaY > 0) {
      e.preventDefault();
      const maxPull = 120;
      setPulledDistance(Math.min(deltaY * 0.5, maxPull));
    }
  }, [effectiveConfig.enablePullToRefresh, onRefresh]);

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    if (!effectiveConfig.enablePullToRefresh || !onRefresh) return;
    if (!touchStartRef.current) return;

    if (pulledDistance > 80 && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPulledDistance(0);
      }
    } else {
      setPulledDistance(0);
    }

    touchStartRef.current = null;
  }, [effectiveConfig.enablePullToRefresh, onRefresh, pulledDistance, refreshing]);

  // Handle infinite scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!effectiveConfig.enableInfiniteScroll || !onLoadMore || loadingMore) return;

    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;

    // Detect scroll direction
    const scrollingDown = scrollTop > lastScrollTopRef.current;
    lastScrollTopRef.current = scrollTop;

    if (scrollingDown && scrollTop + clientHeight >= scrollHeight - effectiveConfig.infiniteScrollThreshold) {
      setLoadingMore(true);
      onLoadMore().finally(() => {
        setLoadingMore(false);
      });
    }
  }, [effectiveConfig.enableInfiniteScroll, effectiveConfig.infiniteScrollThreshold, onLoadMore, loadingMore]);

  // Handle breakpoint changes
  useEffect(() => {
    const handleResize = () => {
      const newBreakpoint = ResponsiveBreakpoints.getCurrentBreakpoint();
      if (newBreakpoint !== currentBreakpoint) {
        setCurrentBreakpoint(newBreakpoint);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentBreakpoint]);

  // Initialize gesture handler
  useEffect(() => {
    if (effectiveConfig.enableSwipeGestures && containerRef.current) {
      gestureHandlerRef.current = new GestureHandler({
        element: containerRef.current,
        onGesture: handleGesture,
        enableSwipe: true,
        enablePinch: true,
        enableLongPress: true,
      });

      return () => {
        gestureHandlerRef.current?.destroy();
      };
    }
  }, [effectiveConfig.enableSwipeGestures, handleGesture]);

  // Render cell card
  const renderCellCard = useCallback((cell: MobileCellData) => {
    if (effectiveConfig.customCardRenderer) {
      return effectiveConfig.customCardRenderer(cell);
    }

    return (
      <div
        key={cell.id}
        className={`mobile-cell-card ${selectedCellId === cell.id ? 'selected' : ''}`}
        data-cell-id={cell.id}
        data-row={cell.position.row}
        data-col={cell.position.col}
        style={styles.cellCard}
      >
        <div style={styles.cellHeader}>
          <span style={styles.cellPosition}>
            {String.fromCharCode(65 + cell.position.col)}{cell.position.row + 1}
          </span>
          <span style={styles.cellType}>{cell.type}</span>
        </div>

        <div style={styles.cellValue}>
          {formatCellValue(cell.value)}
        </div>

        <div style={styles.cellFooter}>
          <span style={styles.cellState}>{cell.state}</span>
          <span style={styles.cellTimestamp}>
            {formatTimestamp(cell.timestamp)}
          </span>
        </div>

        {selectedCellId === cell.id && (
          <div style={styles.cellSelectionIndicator} />
        )}
      </div>
    );
  }, [selectedCellId, effectiveConfig.customCardRenderer]);

  // Render cell list item
  const renderCellListItem = useCallback((cell: MobileCellData) => (
    <div
      key={cell.id}
      className={`mobile-cell-list-item ${selectedCellId === cell.id ? 'selected' : ''}`}
      data-cell-id={cell.id}
      style={styles.cellListItem}
    >
      <div style={styles.cellListPosition}>
        {String.fromCharCode(65 + cell.position.col)}{cell.position.row + 1}
      </div>
      <div style={styles.cellListValue}>
        {formatCellValue(cell.value)}
      </div>
      <div style={styles.cellListState}>
        {cell.state}
      </div>
    </div>
  ), [selectedCellId]);

  // Render grid cell
  const renderGridCell = useCallback((cell: MobileCellData) => (
    <div
      key={cell.id}
      className={`mobile-grid-cell ${selectedCellId === cell.id ? 'selected' : ''}`}
      data-cell-id={cell.id}
      style={{
        ...styles.gridCell,
        backgroundColor: getCellColor(cell.state),
      }}
    >
      {formatCellValue(cell.value)}
    </div>
  ), [selectedCellId]);

  // Render content based on view mode
  const renderContent = () => {
    const visibleCells = mobileCells.slice(visibleRange.start, visibleRange.end);

    switch (viewMode) {
      case 'card':
        return (
          <div style={styles.cardContainer}>
            {visibleCells.map(renderCellCard)}
          </div>
        );
      case 'list':
        return (
          <div style={styles.listContainer}>
            {visibleCells.map(renderCellListItem)}
          </div>
        );
      case 'grid':
        return (
          <div style={styles.gridContainer}>
            {visibleCells.map(renderGridCell)}
          </div>
        );
    }
  };

  // Render pull-to-refresh indicator
  const renderPullToRefresh = () => {
    if (!effectiveConfig.enablePullToRefresh) return null;

    const rotation = Math.min(pulledDistance / 80, 1) * 360;

    return (
      <div style={{
        ...styles.pullToRefresh,
        height: pulledDistance > 0 ? pulledDistance : 0,
      }}>
        <div style={{
          ...styles.refreshIcon,
          transform: `rotate(${rotation}deg)`,
        }}>
          {refreshing ? '⟳' : '↓'}
        </div>
        {pulledDistance > 80 && !refreshing && (
          <div style={styles.releaseText}>Release to refresh</div>
        )}
      </div>
    );
  };

  // Render loading indicator
  const renderLoadingIndicator = () => {
    if (!loadingMore) return null;
    return (
      <div style={styles.loadingIndicator}>
        <div style={styles.spinner} />
        <span>Loading more...</span>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`mobile-grid ${className}`}
      style={{ ...styles.container, ...style }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onScroll={handleScroll}
    >
      {/* Pull to refresh */}
      {renderPullToRefresh()}

      {/* View mode toggle */}
      <div style={styles.viewToggle}>
        <button
          onClick={() => setViewMode('card')}
          style={{
            ...styles.viewToggleButton,
            ...(viewMode === 'card' ? styles.viewToggleActive : {}),
          }}
        >
          Card
        </button>
        <button
          onClick={() => setViewMode('list')}
          style={{
            ...styles.viewToggleButton,
            ...(viewMode === 'list' ? styles.viewToggleActive : {}),
          }}
        >
          List
        </button>
        <button
          onClick={() => setViewMode('grid')}
          style={{
            ...styles.viewToggleButton,
            ...(viewMode === 'grid' ? styles.viewToggleActive : {}),
          }}
        >
          Grid
        </button>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Loading indicator */}
      {renderLoadingIndicator()}

      {/* Empty state */}
      {mobileCells.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📊</div>
          <div style={styles.emptyText}>No cells yet</div>
          <div style={styles.emptySubtext}>Add cells to get started</div>
        </div>
      )}

      {/* Breakpoint indicator (debug) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={styles.breakpointBadge}>
          {currentBreakpoint}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

function getCellColor(state: CellState): string {
  switch (state) {
    case 'error': return '#fee';
    case 'processing': return '#ffc';
    case 'emitting': return '#efe';
    case 'dormant': return '#f9f9f9';
    default: return '#fff';
  }
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
    position: 'relative',
    backgroundColor: '#f5f5f5',
  },

  // Pull to refresh
  pullToRefresh: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    transition: 'height 0.2s ease-out',
  },
  refreshIcon: {
    fontSize: '24px',
    marginBottom: '8px',
    transition: 'transform 0.2s ease-out',
  },
  releaseText: {
    fontSize: '12px',
    color: '#666',
  },

  // View toggle
  viewToggle: {
    display: 'flex',
    gap: '4px',
    padding: '8px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
  viewToggleButton: {
    flex: 1,
    padding: '8px 12px',
    border: 'none',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  viewToggleActive: {
    backgroundColor: '#2196F3',
    color: '#fff',
  },

  // Card view
  cardContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
    padding: '12px',
  },
  cellCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    position: 'relative' as const,
  },
  cellHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  cellPosition: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
  },
  cellType: {
    fontSize: '10px',
    color: '#999',
    textTransform: 'uppercase' as const,
  },
  cellValue: {
    fontSize: '14px',
    color: '#333',
    minHeight: '20px',
    marginBottom: '8px',
    wordBreak: 'break-word' as const,
  },
  cellFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: '#999',
  },
  cellState: {
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#f5f5f5',
  },
  cellTimestamp: {
    color: '#999',
  },
  cellSelectionIndicator: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#2196F3',
  },

  // List view
  listContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1px',
    backgroundColor: '#e0e0e0',
  },
  cellListItem: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 80px',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cellListPosition: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
  },
  cellListValue: {
    fontSize: '14px',
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  cellListState: {
    fontSize: '10px',
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: '#f5f5f5',
    textAlign: 'center' as const,
  },

  // Grid view
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap: '1px',
    backgroundColor: '#e0e0e0',
  },
  gridCell: {
    aspectRatio: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    fontSize: '12px',
    textAlign: 'center' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },

  // Loading
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

  // Empty state
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#666',
  },

  // Breakpoint badge (debug)
  breakpointBadge: {
    position: 'fixed' as const,
    bottom: '8px',
    right: '8px',
    padding: '4px 8px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: '10px',
    borderRadius: '4px',
    zIndex: 1000,
  },
};

export default MobileGrid;
