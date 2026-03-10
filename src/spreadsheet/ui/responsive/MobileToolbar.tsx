/**
 * POLLN Spreadsheet - MobileToolbar Component
 *
 * Context-aware bottom navigation toolbar for mobile devices.
 * Features quick actions, floating action button, and collapsed state handling.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type {
  Breakpoint,
  MobileToolbarProps,
  MobileToolbarConfig,
  QuickAction,
  NavItem,
} from './types';

/**
 * Default quick actions
 */
const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'add-cell',
    label: 'Add',
    icon: '+',
    action: () => {},
    variant: 'primary',
  },
  {
    id: 'search',
    label: 'Search',
    icon: '🔍',
    action: () => {},
  },
  {
    id: 'filter',
    label: 'Filter',
    icon: '⚙️',
    action: () => {},
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙',
    action: () => {},
  },
];

/**
 * Default navigation items
 */
const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'cells', label: 'Cells', icon: '📊', active: true },
  { id: 'analysis', label: 'Analysis', icon: '📈' },
  { id: 'collaborate', label: 'Collab', icon: '👥' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

/**
 * MobileToolbar - Bottom navigation for mobile
 *
 * Provides context-aware actions and navigation optimized for touch.
 * Automatically adjusts layout based on breakpoint and available space.
 */
export const MobileToolbar: React.FC<MobileToolbarProps> = ({
  config = {},
  mode = 'mobile',
  onAction,
  onNavigate,
  className = '',
  style = {},
}) => {
  // State
  const [isCollapsed, setIsCollapsed] = useState(config.collapsed || false);
  const [activeFab, setActiveFab] = useState(false);
  const [activeNav, setActiveNav] = useState('cells');

  // Effective configuration
  const effectiveConfig = useMemo<MobileToolbarConfig>(() => ({
    position: 'bottom',
    collapsed: false,
    contextAware: true,
    floatingActionButton: true,
    quickActions: config.quickActions || DEFAULT_QUICK_ACTIONS,
    navigationItems: config.navigationItems || DEFAULT_NAV_ITEMS,
    ...config,
  }), [config]);

  // Filter visible quick actions based on mode
  const visibleQuickActions = useMemo(() => {
    return (effectiveConfig.quickActions || DEFAULT_QUICK_ACTIONS).filter(action => {
      if (typeof action.visible === 'boolean') return action.visible;
      if (typeof action.visible === 'function') return action.visible(mode);
      return true;
    });
  }, [effectiveConfig.quickActions, mode]);

  // Filter visible navigation items based on mode
  const visibleNavItems = useMemo(() => {
    return (effectiveConfig.navigationItems || DEFAULT_NAV_ITEMS).slice(
      0,
      mode === 'mobile' ? 4 : 6
    );
  }, [effectiveConfig.navigationItems, mode]);

  // Handle quick action press
  const handleActionPress = useCallback((actionId: string) => {
    const action = visibleQuickActions.find(a => a.id === actionId);
    if (action && !action.disabled) {
      action.action();
      onAction?.(actionId);
    }
  }, [visibleQuickActions, onAction]);

  // Handle navigation item press
  const handleNavPress = useCallback((itemId: string) => {
    const item = visibleNavItems.find(i => i.id === itemId);
    if (item) {
      setActiveNav(itemId);
      if (item.action) {
        item.action();
      }
      onNavigate?.(itemId);
    }
  }, [visibleNavItems, onNavigate]);

  // Toggle collapse state
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // Render based on position
  const renderToolbar = () => {
    switch (effectiveConfig.position) {
      case 'top':
        return renderTopToolbar();
      case 'floating':
        return renderFloatingToolbar();
      case 'bottom':
      default:
        return renderBottomToolbar();
    }
  };

  // Render bottom toolbar
  const renderBottomToolbar = () => (
    <div style={{
      ...styles.bottomToolbar,
      ...(isCollapsed ? styles.bottomToolbarCollapsed : {}),
    }}>
      {/* Navigation items */}
      <div style={styles.navContainer}>
        {visibleNavItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavPress(item.id)}
            style={{
              ...styles.navButton,
              ...(activeNav === item.id ? styles.navButtonActive : {}),
            }}
            aria-label={item.label}
            aria-current={activeNav === item.id ? 'page' : undefined}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            {!isCollapsed && (
              <span style={styles.navLabel}>{item.label}</span>
            )}
            {item.badge && (
              <span style={styles.navBadge}>{item.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Quick actions */}
      {!isCollapsed && (
        <div style={styles.quickActionsContainer}>
          {visibleQuickActions.map(action => (
            <button
              key={action.id}
              onClick={() => handleActionPress(action.id)}
              disabled={action.disabled}
              style={{
                ...styles.quickActionButton,
                ...(action.variant === 'primary' ? styles.quickActionPrimary : {}),
                ...(action.variant === 'danger' ? styles.quickActionDanger : {}),
                ...(action.disabled ? styles.quickActionDisabled : {}),
              }}
              aria-label={action.label}
            >
              <span style={styles.quickActionIcon}>{action.icon}</span>
            </button>
          ))}
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapse}
        style={styles.collapseButton}
        aria-label={isCollapsed ? 'Expand toolbar' : 'Collapse toolbar'}
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? '↑' : '↓'}
      </button>
    </div>
  );

  // Render top toolbar
  const renderTopToolbar = () => (
    <div style={{
      ...styles.topToolbar,
      ...(isCollapsed ? styles.topToolbarCollapsed : {}),
    }}>
      {/* Title */}
      <div style={styles.toolbarTitle}>
        POLLN Spreadsheet
      </div>

      {/* Quick actions */}
      {!isCollapsed && (
        <div style={styles.quickActionsContainer}>
          {visibleQuickActions.map(action => (
            <button
              key={action.id}
              onClick={() => handleActionPress(action.id)}
              disabled={action.disabled}
              style={{
                ...styles.quickActionButton,
                ...(action.variant === 'primary' ? styles.quickActionPrimary : {}),
                ...(action.disabled ? styles.quickActionDisabled : {}),
              }}
              aria-label={action.label}
            >
              <span style={styles.quickActionIcon}>{action.icon}</span>
              <span style={styles.quickActionLabel}>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapse}
        style={styles.collapseButtonTop}
        aria-label={isCollapsed ? 'Expand toolbar' : 'Collapse toolbar'}
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? '↓' : '↑'}
      </button>
    </div>
  );

  // Render floating toolbar
  const renderFloatingToolbar = () => (
    <>
      {/* Floating action button */}
      {effectiveConfig.floatingActionButton && !isCollapsed && (
        <button
          onClick={() => handleActionPress('add-cell')}
          style={styles.fab}
          aria-label="Add cell"
        >
          <span style={styles.fabIcon}>+</span>
        </button>
      )}

      {/* Floating quick actions */}
      {activeFab && !isCollapsed && (
        <div style={styles.fabMenu}>
          {visibleQuickActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => {
                handleActionPress(action.id);
                setActiveFab(false);
              }}
              disabled={action.disabled}
              style={{
                ...styles.fabMenuItem,
                animationDelay: `${index * 50}ms`,
              }}
              aria-label={action.label}
            >
              <span style={styles.fabMenuIcon}>{action.icon}</span>
              <span style={styles.fabMenuLabel}>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mini FAB to expand */}
      <button
        onClick={() => setActiveFab(!activeFab)}
        style={styles.miniFab}
        aria-label="Quick actions"
        aria-expanded={activeFab}
      >
        {activeFab ? '×' : '⋯'}
      </button>
    </>
  );

  return (
    <div
      className={`mobile-toolbar mobile-toolbar-${mode} ${className}`}
      style={{ ...styles.container, ...style }}
      role="navigation"
      aria-label="Mobile navigation"
    >
      {renderToolbar()}
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#fff',
    borderTop: '1px solid #e0e0e0',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
  },

  // Bottom toolbar
  bottomToolbar: {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '8px',
    backgroundColor: '#fff',
    transition: 'all 0.3s ease',
  },
  bottomToolbarCollapsed: {
    padding: '4px 8px',
  },

  // Top toolbar
  topToolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
  },
  topToolbarCollapsed: {
    padding: '4px 16px',
  },
  toolbarTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    marginRight: 'auto',
  },

  // Navigation
  navContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '8px',
  },
  navButton: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '2px',
    padding: '8px 4px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  navButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  navIcon: {
    fontSize: '20px',
  },
  navLabel: {
    fontSize: '10px',
    color: '#666',
  },
  navBadge: {
    position: 'absolute' as const,
    top: '4px',
    right: '8px',
    minWidth: '16px',
    height: '16px',
    padding: '0 4px',
    borderRadius: '8px',
    backgroundColor: '#f44336',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick actions
  quickActionsContainer: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
  },
  quickActionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: '#f5f5f5',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
  },
  quickActionPrimary: {
    backgroundColor: '#2196F3',
    color: '#fff',
  },
  quickActionDanger: {
    backgroundColor: '#f44336',
    color: '#fff',
  },
  quickActionDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  quickActionIcon: {
    fontSize: '16px',
  },
  quickActionLabel: {
    fontSize: '12px',
  },

  // Collapse button
  collapseButton: {
    position: 'absolute' as const,
    top: '-20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '40px',
    height: '20px',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderBottom: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseButtonTop: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },

  // FAB
  fab: {
    position: 'fixed' as const,
    bottom: '80px',
    right: '16px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#2196F3',
    color: '#fff',
    border: 'none',
    boxShadow: '0 4px 12px rgba(33,150,243,0.4)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  fabIcon: {
    fontSize: '24px',
  },

  // Mini FAB
  miniFab: {
    position: 'fixed' as const,
    bottom: '80px',
    right: '16px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    transition: 'all 0.2s',
  },

  // FAB menu
  fabMenu: {
    position: 'fixed' as const,
    bottom: '128px',
    right: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  fabMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    fontSize: '14px',
    animation: 'slideIn 0.2s ease-out',
    minWidth: '120px',
  },
  fabMenuIcon: {
    fontSize: '18px',
  },
  fabMenuLabel: {
    fontSize: '12px',
  },
};

export default MobileToolbar;
