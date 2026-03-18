/**
 * Tutorial Progress Component
 *
 * Progress indicator for tutorials
 */

import React from 'react';

/**
 * Tutorial Progress Props
 */
interface TutorialProgressProps {
  current: number;
  total: number;
  progress: number;
  className?: string;
}

/**
 * Tutorial Progress Component
 */
export const TutorialProgress: React.FC<TutorialProgressProps> = ({
  current,
  total,
  progress,
  className = ''
}) => {
  const percentage = Math.round(progress * 100);

  return (
    <div className={`tutorial-progress ${className}`}>
      {/* Progress Bar */}
      <div className="tutorial-progress-bar">
        <div
          className="tutorial-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Progress Text */}
      <div className="tutorial-progress-text">
        {current} of {total} steps ({percentage}%)
      </div>

      {/* Step Dots */}
      <div className="tutorial-progress-dots">
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            className={`tutorial-progress-dot ${index < current ? 'completed' : ''} ${
              index === current - 1 ? 'active' : ''
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default TutorialProgress;
