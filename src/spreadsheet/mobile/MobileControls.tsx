/**
 * POLLN Spreadsheet - MobileControls
 *
 * Mobile-specific controls including floating action button (FAB),
 * bottom navigation, quick actions menu, and voice input button.
 *
 * Optimized for touch interactions with proper hit targets and
 * visual feedback.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Quick action item
 */
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  enabled?: boolean;
}

/**
 * Bottom navigation item
 */
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  onClick: () => void;
}

/**
 * Props for MobileControls
 */
export interface MobileControlsProps {
  onAddCell?: () => void;
  onRefresh?: () => void;
  onSettings?: () => void;
  onSearch?: () => void;
  onVoiceInput?: () => void;
  quickActions?: QuickAction[];
  navItems?: NavItem[];
  activeNavId?: string;
  fabIcon?: string;
  enableVoice?: boolean;
  enableHapticFeedback?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * MobileControls - Mobile-specific controls
 *
 * Provides touch-optimized controls for mobile interfaces including:
 * - Floating action button (FAB)
 * - Bottom navigation
 * - Quick actions menu
 * - Voice input button
 */
export const MobileControls: React.FC<MobileControlsProps> = ({
  onAddCell,
  onRefresh,
  onSettings,
  onSearch,
  onVoiceInput,
  quickActions = [],
  navItems = [],
  activeNavId,
  fabIcon = '+',
  enableVoice = false,
  enableHapticFeedback = true,
  className = '',
  style = {},
}) => {
  // State
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);

  // Refs
  const fabRef = useRef<HTMLButtonElement>(null);

  /**
   * Trigger haptic feedback
   */
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (enableHapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, [enableHapticFeedback]);

  /**
   * Handle FAB click
   */
  const handleFabClick = useCallback(() => {
    triggerHaptic(15);
    setQuickActionsOpen(!quickActionsOpen);
  }, [quickActionsOpen, triggerHaptic]);

  /**
   * Handle quick action click
   */
  const handleQuickAction = useCallback((action: QuickAction) => {
    triggerHaptic(20);
    action.onClick();
    setQuickActionsOpen(false);
  }, [triggerHaptic]);

  /**
   * Handle nav item click
   */
  const handleNavClick = useCallback((item: NavItem) => {
    triggerHaptic(10);
    item.onClick();
  }, [triggerHaptic]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    triggerHaptic(10);
    onRefresh?.();
  }, [triggerHaptic, onRefresh]);

  /**
   * Handle settings
   */
  const handleSettings = useCallback(() => {
    triggerHaptic(10);
    onSettings?.();
  }, [triggerHaptic, onSettings]);

  /**
   * Handle search
   */
  const handleSearch = useCallback(() => {
    triggerHaptic(10);
    onSearch?.();
  }, [triggerHaptic, onSearch]);

  /**
   * Handle voice input
   */
  const handleVoiceInput = useCallback(() => {
    triggerHaptic([20, 50, 20]);
    setVoiceListening(!voiceListening);
    onVoiceInput?.();
  }, [voiceListening, triggerHaptic, onVoiceInput]);

  /**
   * Close quick actions when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setQuickActionsOpen(false);
      }
    };

    if (quickActionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [quickActionsOpen]);

  return (
    <div
      className={`mobile-controls ${className}`}
      style={{ ...styles.container, ...style }}
    >
      {/* Quick actions overlay */}
      {quickActionsOpen && (
        <div style={styles.quickActionsOverlay}>
          {quickActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              disabled={action.enabled === false}
              style={{
                ...styles.quickAction,
                transform: `translateY(${(index + 1) * -60}px)`,
                opacity: action.enabled === false ? 0.5 : 1,
              }}
            >
              <span style={styles.quickActionIcon}>{action.icon}</span>
              <span style={styles.quickActionLabel}>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        ref={fabRef}
        onClick={handleFabClick}
        style={{
          ...styles.fab,
          transform: quickActionsOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
        aria-label="Add"
      >
        {fabIcon}
      </button>

      {/* Voice input button */}
      {enableVoice && (
        <button
          onClick={handleVoiceInput}
          style={{
            ...styles.voiceButton,
            ...(voiceListening ? styles.voiceButtonListening : {}),
          }}
          aria-label="Voice input"
        >
          <span style={styles.voiceButtonIcon}>🎤</span>
          {voiceListening && (
            <span style={styles.voiceButtonPulse} />
          )}
        </button>
      )}

      {/* Bottom navigation */}
      {navItems.length > 0 && (
        <nav style={styles.bottomNav}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              style={{
                ...styles.navItem,
                ...(activeNavId === item.id ? styles.navItemActive : {}),
              }}
              aria-label={item.label}
            >
              <span style={styles.navItemIcon}>{item.icon}</span>
              <span style={styles.navItemLabel}>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span style={styles.navItemBadge}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
      )}

      {/* Top action bar */}
      <div style={styles.topActionBar}>
        <button
          onClick={handleSearch}
          style={styles.topActionButton}
          aria-label="Search"
        >
          🔍
        </button>
        <button
          onClick={handleRefresh}
          style={styles.topActionButton}
          aria-label="Refresh"
        >
          🔄
        </button>
        <button
          onClick={handleSettings}
          style={styles.topActionButton}
          aria-label="Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 900,
  },

  // Quick actions
  quickActionsOverlay: {
    position: 'absolute' as const,
    bottom: '80px',
    right: '16px',
    pointerEvents: 'auto',
  },

  quickAction: {
    position: 'absolute' as const,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#2196F3',
    color: '#fff',
    border: 'none',
    borderRadius: '24px',
    fontSize: '14px',
    fontWeight: 500,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    transition: 'transform 0.3s ease, opacity 0.3s ease',
    whiteSpace: 'nowrap' as const,
  },

  quickActionIcon: {
    fontSize: '18px',
  },

  quickActionLabel: {
    fontSize: '14px',
  },

  // Floating Action Button
  fab: {
    position: 'absolute' as const,
    bottom: '80px',
    right: '16px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#2196F3',
    color: '#fff',
    border: 'none',
    fontSize: '24px',
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    userSelect: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
  },

  // Voice button
  voiceButton: {
    position: 'absolute' as const,
    bottom: '80px',
    right: '88px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    border: '2px solid #2196F3',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },

  voiceButtonListening: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
    animation: 'pulse 1.5s ease-in-out infinite',
  },

  voiceButtonIcon: {
    fontSize: '20px',
  },

  voiceButtonPulse: {
    position: 'absolute' as const,
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: '2px solid #f44336',
    animation: 'ripple 1.5s ease-in-out infinite',
  },

  // Bottom navigation
  bottomNav: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    backgroundColor: '#fff',
    borderTop: '1px solid #e0e0e0',
    boxShadow: '0 -2px 4px rgba(0,0,0,0.05)',
    pointerEvents: 'auto',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },

  navItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    padding: '8px 4px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#666',
    fontSize: '10px',
    cursor: 'pointer',
    transition: 'color 0.2s',
    position: 'relative' as const,
  },

  navItemActive: {
    color: '#2196F3',
  },

  navItemIcon: {
    fontSize: '20px',
  },

  navItemLabel: {
    fontSize: '10px',
    fontWeight: 500,
  },

  navItemBadge: {
    position: 'absolute' as const,
    top: '4px',
    right: '25%',
    minWidth: '16px',
    height: '16px',
    borderRadius: '8px',
    backgroundColor: '#f44336',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
  },

  // Top action bar
  topActionBar: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    display: 'flex',
    gap: '8px',
    pointerEvents: 'auto',
  },

  topActionButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    border: 'none',
    fontSize: '18px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  @keyframes ripple {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  .mobile-controls button:active {
    transform: scale(0.95);
  }
`;
document.head.appendChild(styleSheet);

export default MobileControls;
