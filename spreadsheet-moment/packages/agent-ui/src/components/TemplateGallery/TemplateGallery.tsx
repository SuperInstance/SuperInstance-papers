/**
 * Template Gallery Component
 *
 * Main gallery component for browsing and selecting templates
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Template,
  TemplateFilters,
  TemplateCategory,
  TemplateCategoryInfo,
  TemplateGalleryProps
} from './types';
import { TemplateCard } from './TemplateCard';
import { TemplatePreview } from './TemplatePreview';
import { TemplateEditor } from './TemplateEditor';

/**
 * Template category information mapping
 */
const CATEGORY_INFO: Record<TemplateCategory, TemplateCategoryInfo> = {
  [TemplateCategory.DATA_ANALYSIS]: {
    id: TemplateCategory.DATA_ANALYSIS,
    name: 'Data Analysis',
    description: 'Analyze and visualize data with intelligent agents',
    icon: '📊',
    color: '#4299e1'
  },
  [TemplateCategory.AUTOMATION]: {
    id: TemplateCategory.AUTOMATION,
    name: 'Automation',
    description: 'Automate repetitive tasks with Claw agents',
    icon: '⚙️',
    color: '#ed8936'
  },
  [TemplateCategory.REPORTING]: {
    id: TemplateCategory.REPORTING,
    name: 'Reporting',
    description: 'Generate reports automatically',
    icon: '📈',
    color: '#48bb78'
  },
  [TemplateCategory.FINANCE]: {
    id: TemplateCategory.FINANCE,
    name: 'Finance',
    description: 'Financial modeling and analysis',
    icon: '💰',
    color: '#9f7aea'
  },
  [TemplateCategory.PROJECT_MANAGEMENT]: {
    id: TemplateCategory.PROJECT_MANAGEMENT,
    name: 'Project Management',
    description: 'Track and manage projects',
    icon: '📋',
    color: '#38b2ac'
  },
  [TemplateCategory.INTEGRATION]: {
    id: TemplateCategory.INTEGRATION,
    name: 'Integration',
    description: 'Connect with external services',
    icon: '🔌',
    color: '#e53e3e'
  },
  [TemplateCategory.MACHINE_LEARNING]: {
    id: TemplateCategory.MACHINE_LEARNING,
    name: 'Machine Learning',
    description: 'ML-powered analysis and predictions',
    icon: '🤖',
    color: '#667eea'
  },
  [TemplateCategory.CUSTOM]: {
    id: TemplateCategory.CUSTOM,
    name: 'Custom',
    description: 'Community-created templates',
    icon: '✨',
    color: '#718096'
  }
};

/**
 * Sample templates data (in production, this would come from an API)
 */
const SAMPLE_TEMPLATES: Template[] = [
  {
    metadata: {
      id: 'temp-001',
      name: 'Sales Dashboard with AI Insights',
      description: 'Track sales metrics with automatic anomaly detection and forecasting',
      author: {
        name: 'SpreadsheetMoment Team',
        id: 'sm-team',
        avatar: '👥'
      },
      category: TemplateCategory.DATA_ANALYSIS,
      tags: ['sales', 'dashboard', 'forecasting', 'anomaly-detection'],
      createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      usageCount: 1234,
      rating: 4.8,
      ratingCount: 89,
      thumbnail: '/templates/sales-dashboard.png',
      difficulty: 'intermediate',
      estimatedTime: 15,
      featured: true,
      verified: true
    },
    sheets: [
      {
        name: 'Dashboard',
        cells: [
          { location: 'A1', value: 'Sales Dashboard', isClawCell: false },
          {
            location: 'B2',
            value: '=CLAW_NEW("anomaly_detector", "deepseek-chat", "Detect sales anomalies")',
            isClawCell: true,
            clawConfig: {
              name: 'anomaly_detector',
              model: 'deepseek-chat',
              purpose: 'Detect sales anomalies',
              trigger: { type: 'data', source: 'sales_data' },
              equipment: ['MEMORY', 'REASONING']
            }
          }
        ],
        dimensions: { rows: 20, columns: 10 }
      }
    ],
    config: {
      autoStartAgents: true,
      requiredPermissions: ['data.read', 'data.write']
    }
  },
  {
    metadata: {
      id: 'temp-002',
      name: 'Invoice Generator',
      description: 'Automatically generate invoices from order data',
      author: {
        name: 'Community Contributor',
        id: 'user-123',
        avatar: '👤'
      },
      category: TemplateCategory.AUTOMATION,
      tags: ['invoice', 'automation', 'finance'],
      createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      usageCount: 567,
      rating: 4.5,
      ratingCount: 42,
      difficulty: 'beginner',
      estimatedTime: 10,
      featured: false,
      verified: true
    },
    sheets: [
      {
        name: 'Invoice',
        cells: [
          { location: 'A1', value: 'Invoice Generator', isClawCell: false },
          {
            location: 'C1',
            value: '=CLAW_NEW("invoice_bot", "deepseek-chat", "Generate invoices from orders")',
            isClawCell: true,
            clawConfig: {
              name: 'invoice_bot',
              model: 'deepseek-chat',
              purpose: 'Generate invoices from orders',
              trigger: { type: 'data', source: 'orders' },
              equipment: ['MEMORY']
            }
          }
        ],
        dimensions: { rows: 15, columns: 8 }
      }
    ],
    config: {
      autoStartAgents: false,
      requiredPermissions: ['data.read', 'data.write']
    }
  }
];

/**
 * TemplateGallery Component
 */
export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  onSelectTemplate,
  onUseTemplate,
  filters: initialFilters = {},
  onFiltersChange,
  showFeatured = true,
  showCategories = true,
  className = ''
}) => {
  const [filters, setFilters] = useState<TemplateFilters>(initialFilters);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  /**
   * Filter and sort templates
   */
  const filteredTemplates = useMemo(() => {
    let templates = [...SAMPLE_TEMPLATES];

    // Apply filters
    if (filters.category) {
      templates = templates.filter(t => t.metadata.category === filters.category);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      templates = templates.filter(t =>
        t.metadata.name.toLowerCase().includes(query) ||
        t.metadata.description.toLowerCase().includes(query) ||
        t.metadata.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (filters.difficulty) {
      templates = templates.filter(t => t.metadata.difficulty === filters.difficulty);
    }

    if (filters.minRating) {
      templates = templates.filter(t => t.metadata.rating >= filters.minRating!);
    }

    if (filters.featuredOnly) {
      templates = templates.filter(t => t.metadata.featured);
    }

    if (filters.verifiedOnly) {
      templates = templates.filter(t => t.metadata.verified);
    }

    // Sort templates
    switch (filters.sortBy) {
      case 'popular':
        templates.sort((a, b) => b.metadata.usageCount - a.metadata.usageCount);
        break;
      case 'recent':
        templates.sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt);
        break;
      case 'rating':
        templates.sort((a, b) => b.metadata.rating - a.metadata.rating);
        break;
      case 'name':
        templates.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
        break;
      default:
        templates.sort((a, b) => b.metadata.usageCount - a.metadata.usageCount);
    }

    return templates;
  }, [filters]);

  /**
   * Featured templates
   */
  const featuredTemplates = useMemo(() => {
    return SAMPLE_TEMPLATES.filter(t => t.metadata.featured);
  }, []);

  /**
   * Handle template click
   */
  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    onSelectTemplate(template);
    setIsPreviewOpen(true);
  };

  /**
   * Handle template use
   */
  const handleTemplateUse = (template: Template) => {
    onUseTemplate(template);
    setIsPreviewOpen(false);
  };

  /**
   * Handle filters change
   */
  const handleFiltersChange = (newFilters: TemplateFilters) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  return (
    <div className={`template-gallery ${className}`}>
      {/* Header */}
      <div className="template-gallery-header">
        <h2>Template Gallery</h2>
        <p>Discover and use community-created spreadsheet templates</p>
      </div>

      {/* Search Bar */}
      <div className="template-gallery-search">
        <input
          type="text"
          placeholder="Search templates..."
          value={filters.searchQuery || ''}
          onChange={(e) => handleFiltersChange({ ...filters, searchQuery: e.target.value })}
          className="template-search-input"
        />
      </div>

      {/* Categories */}
      {showCategories && (
        <div className="template-gallery-categories">
          {Object.values(CATEGORY_INFO).map(category => (
            <button
              key={category.id}
              className={`template-category-button ${
                filters.category === category.id ? 'active' : ''
              }`}
              onClick={() =>
                handleFiltersChange({
                  ...filters,
                  category: filters.category === category.id ? undefined : category.id
                })
              }
              style={{ '--category-color': category.color } as React.CSSProperties}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Featured Section */}
      {showFeatured && featuredTemplates.length > 0 && (
        <div className="template-gallery-section">
          <h3>Featured Templates</h3>
          <div className="template-grid featured">
            {featuredTemplates.map(template => (
              <TemplateCard
                key={template.metadata.id}
                template={template}
                onClick={handleTemplateClick}
                onUse={handleTemplateUse}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Templates Section */}
      <div className="template-gallery-section">
        <h3>
          All Templates
          <span className="template-count">({filteredTemplates.length})</span>
        </h3>

        {filteredTemplates.length === 0 ? (
          <div className="template-gallery-empty">
            <p>No templates found matching your filters</p>
            <button
              onClick={() => handleFiltersChange({})}
              className="clear-filters-button"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="template-grid">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.metadata.id}
                template={template}
                onClick={handleTemplateClick}
                onUse={handleTemplateUse}
              />
            ))}
          </div>
        )}
      </div>

      {/* Template Preview Modal */}
      {isPreviewOpen && selectedTemplate && (
        <TemplatePreview
          template={selectedTemplate}
          onClose={() => setIsPreviewOpen(false)}
          onUse={handleTemplateUse}
        />
      )}

      {/* Template Editor Modal */}
      {isEditorOpen && (
        <TemplateEditor
          template={selectedTemplate || undefined}
          onSave={(template) => {
            // Handle save
            setIsEditorOpen(false);
          }}
          onCancel={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  );
};

export default TemplateGallery;
