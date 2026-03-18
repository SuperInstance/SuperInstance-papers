/**
 * Tutorial Overlay Component
 *
 * Overlay for highlighting tutorial targets
 */

import React, { useEffect, useState } from 'react';

/**
 * Tutorial Overlay Props
 */
interface TutorialOverlayProps {
  target?: string;
  className?: string;
}

/**
 * Tutorial Overlay Component
 */
export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  target,
  className = ''
}) => {
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!target) {
      return;
    }

    const updateHighlight = () => {
      const targetElement = document.querySelector(target);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setHighlightStyle({
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`
        });

        // Scroll target into view
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    updateHighlight();

    // Recalculate on window resize
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight);

    return () => {
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight);
    };
  }, [target]);

  if (!target) {
    return (
      <div className={`tutorial-overlay ${className}`} style={{ opacity: 0.3 }} />
    );
  }

  return (
    <>
      {/* Dark overlay */}
      <div className={`tutorial-overlay ${className}`} style={{ opacity: 0.7 }} />

      {/* Highlight cutout */}
      {target && (
        <div
          className="tutorial-highlight"
          style={highlightStyle}
        >
          <div className="tutorial-highlight-border" />
        </div>
      )}
    </>
  );
};

export default TutorialOverlay;
