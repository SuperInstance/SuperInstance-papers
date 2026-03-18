/**
 * Template Card Component
 *
 * Individual template card for display in gallery
 */

import React from 'react';
import { Template, TemplateCardProps, TemplateCategory } from './types';

/**
 * Get category information
 */
function getCategoryInfo(category: TemplateCategory) {
  const info: Record<TemplateCategory, { icon: string; color: string }> = {
    [TemplateCategory.DATA_ANALYSIS]: { icon: '📊', color: '#4299e1' },
    [TemplateCategory.AUTOMATION]: { icon: '⚙️', color: '#ed8936' },
    [TemplateCategory.REPORTING]: { icon: '📈', color: '#48bb78' },
    [TemplateCategory.FINANCE]: { icon: '💰', color: '#9f7aea' },
    [TemplateCategory.PROJECT_MANAGEMENT]: { icon: '📋', color: '#38b2ac' },
    [TemplateCategory.INTEGRATION]: { icon: '🔌', color: '#e53e3e' },
    [TemplateCategory.MACHINE_LEARNING]: { icon: '🤖', color: '#667eea' },
    [TemplateCategory.CUSTOM]: { icon: '✨', color: '#718096' }
  };
  return info[category];
}

/**
 * Format number with K/M suffix
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * TemplateCard Component
 */
export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onClick,
  onUse,
  showUsageCount = true,
  showRating = true,
  compact = false,
  className = ''
}) => {
  const { metadata } = template;
  const categoryInfo = getCategoryInfo(metadata.category);

  /**
   * Handle card click
   */
  const handleCardClick = () => {
    onClick?.(template);
  };

  /**
   * Handle use button click
   */
  const handleUseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUse?.(template);
  };

  /**
   * Get difficulty badge color
   */
  const getDifficultyColor = () => {
    switch (metadata.difficulty) {
      case 'beginner':
        return '#48bb78';
      case 'intermediate':
        return '#ed8936';
      case 'advanced':
        return '#e53e3e';
      default:
        return '#718096';
    }
  };

  return (
    <div
      className={`template-card ${compact ? 'compact' : ''} ${className}`}
      onClick={handleCardClick}
      style={{ '--category-color': categoryInfo.color } as React.CSSProperties}
    >
      {/* Thumbnail */}
      {metadata.thumbnail ? (
        <div className="template-card-thumbnail">
          <img src={metadata.thumbnail} alt={metadata.name} />
          {metadata.featured && (
            <div className="template-card-badge featured">Featured</div>
          )}
          {metadata.verified && (
            <div className="template-card-badge verified">Verified</div>
          )}
        </div>
      ) : (
        <div
          className="template-card-thumbnail placeholder"
          style={{ backgroundColor: `${categoryInfo.color}20` }}
        >
          <span className="template-icon">{categoryInfo.icon}</span>
          {metadata.featured && (
            <div className="template-card-badge featured">Featured</div>
          )}
          {metadata.verified && (
            <div className="template-card-badge verified">Verified</div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="template-card-content">
        {/* Title */}
        <h4 className="template-card-title">{metadata.name}</h4>

        {/* Description */}
        {!compact && (
          <p className="template-card-description">{metadata.description}</p>
        )}

        {/* Meta */}
        <div className="template-card-meta">
          {/* Author */}
          <div className="template-card-author">
            <span className="author-avatar">{metadata.author.avatar || '👤'}</span>
            <span className="author-name">{metadata.author.name}</span>
          </div>

          {/* Difficulty */}
          <div
            className="template-card-difficulty"
            style={{ color: getDifficultyColor() }}
          >
            {metadata.difficulty}
          </div>
        </div>

        {/* Stats */}
        <div className="template-card-stats">
          {/* Rating */}
          {showRating && (
            <div className="template-card-rating">
              <span className="rating-stars">
                {'★'.repeat(Math.round(metadata.rating))}
                {'☆'.repeat(5 - Math.round(metadata.rating))}
              </span>
              <span className="rating-value">{metadata.rating.toFixed(1)}</span>
              {metadata.ratingCount > 0 && (
                <span className="rating-count">({metadata.ratingCount})</span>
              )}
            </div>
          )}

          {/* Usage Count */}
          {showUsageCount && (
            <div className="template-card-usage">
              <span className="usage-icon">📥</span>
              <span className="usage-count">{formatNumber(metadata.usageCount)}</span>
            </div>
          )}

          {/* Estimated Time */}
          <div className="template-card-time">
            <span className="time-icon">⏱️</span>
            <span className="time-value">{metadata.estimatedTime}m</span>
          </div>
        </div>

        {/* Tags */}
        {!compact && metadata.tags.length > 0 && (
          <div className="template-card-tags">
            {metadata.tags.slice(0, 3).map(tag => (
              <span key={tag} className="template-tag">
                {tag}
              </span>
            ))}
            {metadata.tags.length > 3 && (
              <span className="template-tag more">+{metadata.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="template-card-actions">
        <button
          className="template-button primary"
          onClick={handleUseClick}
          style={{ backgroundColor: categoryInfo.color }}
        >
          Use Template
        </button>
        <button className="template-button secondary">Preview</button>
      </div>
    </div>
  );
};

export default TemplateCard;
