/**
 * SkipLinks - Skip navigation links for keyboard users
 * WCAG 2.1 Level AA Compliant (2.4.1 Bypass Blocks)
 */

import React, { useState, useEffect } from 'react';
import { SkipLink as SkipLinkType } from './types';

interface SkipLinksProps {
  /**
   * Array of skip links to render
   */
  links: SkipLinkType[];

  /**
   * CSS class name
   */
  className?: string;

  /**
   * Whether to show links on focus only
   */
  showOnFocus?: boolean;
}

interface SkipLinkButtonProps {
  id: string;
  label: string;
  target: string;
  hotkey?: string;
  className?: string;
}

/**
 * Styles for skip links
 */
const SKIP_LINK_STYLES = `
  .skip-links {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    background: white;
    border: 2px solid #000;
    border-radius: 4px;
  }

  .skip-link {
    position: absolute;
    top: -100px;
    left: 0;
    padding: 8px 16px;
    background: #000;
    color: #fff;
    text-decoration: none;
    border-radius: 4px;
    font-weight: bold;
    font-size: 14px;
    transition: top 0.3s ease;
    z-index: 9999;
  }

  .skip-link:hover,
  .skip-link:focus {
    top: 0;
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  .skip-link.hotkey-hint {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .skip-link .hotkey {
    display: inline-block;
    padding: 2px 6px;
    background: #333;
    border-radius: 3px;
    font-size: 11px;
    font-family: monospace;
  }

  @media (prefers-reduced-motion: reduce) {
    .skip-link {
      transition: none;
    }
  }
`;

/**
 * SkipLinkButton component
 * Individual skip link button
 */
export const SkipLinkButton: React.FC<SkipLinkButtonProps> = ({
  id,
  label,
  target,
  hotkey,
  className = '',
}) => {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();

    const targetElement = document.getElementById(target);
    if (targetElement) {
      // Set tabindex to make element focusable
      targetElement.setAttribute('tabindex', '-1');

      // Focus the element
      targetElement.focus();

      // Announce to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.className = 'sr-only';
      announcement.textContent = `Navigated to ${label}`;
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);

      // Remove tabindex after user navigates away
      const handleBlur = (): void => {
        targetElement.removeAttribute('tabindex');
        targetElement.removeEventListener('blur', handleBlur);
      };
      targetElement.addEventListener('blur', handleBlur);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>): void => {
    if (hotkey && event.key === hotkey.toLowerCase()) {
      handleClick(event as any);
    }
  };

  return (
    <a
      href={`#${target}`}
      className={`skip-link ${className}`.trim()}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-skip-link={id}
    >
      {hotkey ? (
        <span className="skip-link hotkey-hint">
          {label}
          <span className="hotkey">{hotkey}</span>
        </span>
      ) : (
        label
      )}
    </a>
  );
};

/**
 * SkipLinks component
 * Container for skip navigation links
 */
export const SkipLinks: React.FC<SkipLinksProps> = ({
  links,
  className = '',
  showOnFocus = true,
}) => {
  const [hasFocus, setHasFocus] = useState(false);

  useEffect(() => {
    // Inject styles
    if (!document.getElementById('skip-link-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'skip-link-styles';
      styleSheet.textContent = SKIP_LINK_STYLES;
      document.head.appendChild(styleSheet);
    }
  }, []);

  const containerClass = showOnFocus
    ? 'skip-links skip-links-focus-only'
    : 'skip-links';

  return (
    <nav
      className={`${containerClass} ${className}`.trim()}
      aria-label="Skip navigation"
      onFocus={() => setHasFocus(true)}
      onBlur={() => setHasFocus(false)}
    >
      {links.map((link) => (
        <SkipLinkButton
          key={link.id}
          id={link.id}
          label={link.label}
          target={link.target}
          hotkey={link.hotkey}
        />
      ))}
    </nav>
  );
};

/**
 * Default skip links for spreadsheet
 */
export const DEFAULT_SKIP_LINKS: SkipLinkType[] = [
  {
    id: 'skip-to-cells',
    label: 'Skip to main content',
    target: 'spreadsheet-grid',
  },
  {
    id: 'skip-to-nav',
    label: 'Skip to navigation',
    target: 'main-navigation',
  },
  {
    id: 'skip-to-toolbar',
    label: 'Skip to toolbar',
    target: 'spreadsheet-toolbar',
  },
];

/**
 * useSkipLinks hook
 * Manages skip link behavior
 */
export const useSkipLinks = () => {
  const [activeLink, setActiveLink] = useState<string | null>(null);

  const registerSkipTarget = (id: string): void => {
    const element = document.getElementById(id);
    if (element) {
      element.setAttribute('tabindex', '-1');
    }
  };

  const activateSkipLink = (linkId: string): void => {
    setActiveLink(linkId);
    setTimeout(() => setActiveLink(null), 1000);
  };

  return {
    activeLink,
    registerSkipTarget,
    activateSkipLink,
  };
};

/**
 * withSkipLinks HOC
 * Adds skip links to a component
 */
export const withSkipLinks = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  skipLinks: SkipLinkType[] = DEFAULT_SKIP_LINKS
): React.ComponentType<P> => {
  return (props) => {
    return (
      <>
        <SkipLinks links={skipLinks} />
        <WrappedComponent {...(props as P)} />
      </>
    );
  };
};

/**
 * SkipLinkContainer component
 * Wraps content and provides target for skip links
 */
export const SkipLinkContainer: React.FC<{
  id: string;
  children: React.ReactNode;
  className?: string;
  announceOnFocus?: boolean;
}> = ({ id, children, className = '', announceOnFocus = true }) => {
  const handleFocus = (): void => {
    if (announceOnFocus) {
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.className = 'sr-only';
      announcement.textContent = `Navigated to ${id.replace(/-/g, ' ')}`;
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }
  };

  return (
    <div
      id={id}
      className={className}
      tabIndex={-1}
      onFocus={handleFocus}
    >
      {children}
    </div>
  );
};

/**
 * Keyboard shortcut handler for skip links
 */
export const useSkipLinkShortcuts = (
  shortcuts: Record<string, string> = {}
): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const key = event.key.toLowerCase();
      const targetId = shortcuts[key];

      if (targetId) {
        event.preventDefault();
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          targetElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

export default SkipLinks;
