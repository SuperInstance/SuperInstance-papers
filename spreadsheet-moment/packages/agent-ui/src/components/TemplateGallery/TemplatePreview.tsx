/**
 * Template Preview Component
 *
 * Modal for previewing template details before using
 */

import React, { useState } from 'react';
import { Template, TemplatePreviewProps } from './types';
import { getCategoryInfo, formatDateRelative, formatNumber } from './utils';

/**
 * TemplatePreview Component
 */
export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  onClose,
  onUse,
  showCodePreview = false,
  className = ''
}) => {
  const { metadata, sheets, config } = template;
  const categoryInfo = getCategoryInfo(metadata.category);
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'sheets'>('overview');

  /**
   * Get claw cells count
   */
  const getClawCellsCount = () => {
    return sheets.reduce((count, sheet) => {
      return (
        count +
        sheet.cells.filter(cell => cell.isClawCell && cell.clawConfig).length
      );
    }, 0);
  };

  /**
   * Render overview tab
   */
  const renderOverview = () => (
    <div className="template-preview-overview">
      {/* Description */}
      <div className="preview-section">
        <h3>Description</h3>
        <p>{metadata.description}</p>
      </div>

      {/* Features */}
      <div className="preview-section">
        <h3>Features</h3>
        <ul className="feature-list">
          <li>
            <span className="feature-icon">🤖</span>
            <span>
              <strong>{getClawCellsCount()} Claw Agent{getClawCellsCount() !== 1 ? 's' : ''}</strong>
            </span>
          </li>
          <li>
            <span className="feature-icon">📊</span>
            <span>
              <strong>{sheets.length} Sheet{sheets.length !== 1 ? 's' : ''}</strong>
            </span>
          </li>
          {config.autoStartAgents && (
            <li>
              <span className="feature-icon">▶️</span>
              <span>Auto-start agents</span>
            </li>
          )}
          {metadata.verified && (
            <li>
              <span className="feature-icon">✅</span>
              <span>Verified template</span>
            </li>
          )}
        </ul>
      </div>

      {/* Tags */}
      {metadata.tags.length > 0 && (
        <div className="preview-section">
          <h3>Tags</h3>
          <div className="tags-list">
            {metadata.tags.map(tag => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Requirements */}
      {config.requiredPermissions && config.requiredPermissions.length > 0 && (
        <div className="preview-section">
          <h3>Required Permissions</h3>
          <ul className="permissions-list">
            {config.requiredPermissions.map(permission => (
              <li key={permission}>{permission}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats */}
      <div className="preview-section">
        <h3>Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">{formatNumber(metadata.usageCount)}</div>
            <div className="stat-label">Uses</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{metadata.rating.toFixed(1)}</div>
            <div className="stat-label">Rating</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{metadata.ratingCount}</div>
            <div className="stat-label">Reviews</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{metadata.estimatedTime}m</div>
            <div className="stat-label">Setup Time</div>
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Render code tab
   */
  const renderCode = () => (
    <div className="template-preview-code">
      <div className="preview-section">
        <h3>Template Configuration</h3>
        <pre className="code-block">
          <code>{JSON.stringify(template, null, 2)}</code>
        </pre>
      </div>

      {/* Claw Configurations */}
      {getClawCellsCount() > 0 && (
        <div className="preview-section">
          <h3>Claw Agents</h3>
          {sheets.map(sheet => (
            <div key={sheet.name}>
              <h4>{sheet.name}</h4>
              {sheet.cells
                .filter(cell => cell.isClawCell && cell.clawConfig)
                .map((cell, index) => (
                  <div key={index} className="claw-config-item">
                    <div className="claw-location">{cell.location}</div>
                    <div className="claw-name">{cell.clawConfig!.name}</div>
                    <div className="claw-model">{cell.clawConfig!.model}</div>
                    <div className="claw-purpose">{cell.clawConfig!.purpose}</div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /**
   * Render sheets tab
   */
  const renderSheets = () => (
    <div className="template-preview-sheets">
      {sheets.map(sheet => (
        <div key={sheet.name} className="sheet-preview">
          <h3>{sheet.name}</h3>
          <div className="sheet-info">
            <span>Dimensions: {sheet.dimensions.rows} × {sheet.dimensions.columns}</span>
            <span>
              Cells: {sheet.cells.length} (
              {sheet.cells.filter(c => c.isClawCell).length} Claw agents)
            </span>
          </div>

          {/* Cell preview grid */}
          <div className="sheet-grid-preview">
            {sheet.cells.slice(0, 20).map((cell, index) => (
              <div
                key={index}
                className={`grid-cell ${cell.isClawCell ? 'claw-cell' : ''}`}
                style={{
                  gridRow: parseInt(cell.location.slice(1)) + 1,
                  gridColumn: cell.location.charCodeAt(0) - 64
                }}
                title={`${cell.location}: ${cell.value}`}
              >
                {cell.isClawCell ? '🤖' : ''}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`template-preview-modal ${className}`}>
      <div className="template-preview-backdrop" onClick={onClose} />
      <div className="template-preview-content">
        {/* Header */}
        <div className="template-preview-header">
          <div className="header-left">
            <span className="template-icon">{categoryInfo.icon}</span>
            <div>
              <h2>{metadata.name}</h2>
              <div className="header-meta">
                <span className="author">
                  {metadata.author.avatar} {metadata.author.name}
                </span>
                <span className="separator">•</span>
                <span className="updated">{formatDateRelative(metadata.updatedAt)}</span>
                {metadata.verified && (
                  <>
                    <span className="separator">•</span>
                    <span className="verified-badge">Verified</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="template-preview-tabs">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          {showCodePreview && (
            <button
              className={`tab-button ${activeTab === 'code' ? 'active' : ''}`}
              onClick={() => setActiveTab('code')}
            >
              Code
            </button>
          )}
          <button
            className={`tab-button ${activeTab === 'sheets' ? 'active' : ''}`}
            onClick={() => setActiveTab('sheets')}
          >
            Sheets
          </button>
        </div>

        {/* Content */}
        <div className="template-preview-body">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'code' && renderCode()}
          {activeTab === 'sheets' && renderSheets()}
        </div>

        {/* Footer */}
        <div className="template-preview-footer">
          <button className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary"
            onClick={() => onUse(template)}
            style={{ backgroundColor: categoryInfo.color }}
          >
            Use Template
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;
