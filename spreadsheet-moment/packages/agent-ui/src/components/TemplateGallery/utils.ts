/**
 * Template Utilities
 *
 * Helper functions for template operations
 */

import { Template, TemplateCategory, TemplateMetadata } from './types';

/**
 * Get category information
 */
export function getCategoryInfo(category: TemplateCategory) {
  const info: Record<TemplateCategory, { icon: string; color: string; name: string }> = {
    [TemplateCategory.DATA_ANALYSIS]: {
      icon: '📊',
      color: '#4299e1',
      name: 'Data Analysis'
    },
    [TemplateCategory.AUTOMATION]: { icon: '⚙️', color: '#ed8936', name: 'Automation' },
    [TemplateCategory.REPORTING]: { icon: '📈', color: '#48bb78', name: 'Reporting' },
    [TemplateCategory.FINANCE]: { icon: '💰', color: '#9f7aea', name: 'Finance' },
    [TemplateCategory.PROJECT_MANAGEMENT]: {
      icon: '📋',
      color: '#38b2ac',
      name: 'Project Management'
    },
    [TemplateCategory.INTEGRATION]: { icon: '🔌', color: '#e53e3e', name: 'Integration' },
    [TemplateCategory.MACHINE_LEARNING]: {
      icon: '🤖',
      color: '#667eea',
      name: 'Machine Learning'
    },
    [TemplateCategory.CUSTOM]: { icon: '✨', color: '#718096', name: 'Custom' }
  };
  return info[category];
}

/**
 * Format number with K/M/B suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Format date relative to now
 */
export function formatDateRelative(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  if (weeks < 4) {
    return `${weeks}w ago`;
  }
  if (months < 12) {
    return `${months}mo ago`;
  }
  return `${years}y ago`;
}

/**
 * Validate template structure
 */
export function validateTemplate(template: Template): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate metadata
  if (!template.metadata.id) {
    errors.push('Template metadata must have an id');
  }
  if (!template.metadata.name) {
    errors.push('Template metadata must have a name');
  }
  if (!template.metadata.description) {
    errors.push('Template metadata must have a description');
  }
  if (!template.metadata.author?.name) {
    errors.push('Template metadata must have an author name');
  }

  // Validate sheets
  if (!template.sheets || template.sheets.length === 0) {
    errors.push('Template must have at least one sheet');
  } else {
    template.sheets.forEach((sheet, sheetIndex) => {
      if (!sheet.name) {
        errors.push(`Sheet ${sheetIndex + 1} must have a name`);
      }
      if (!sheet.cells || sheet.cells.length === 0) {
        errors.push(`Sheet "${sheet.name}" must have at least one cell`);
      }
      if (!sheet.dimensions) {
        errors.push(`Sheet "${sheet.name}" must have dimensions`);
      }
    });
  }

  // Validate config
  if (!template.config) {
    errors.push('Template must have a config');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Search templates by query
 */
export function searchTemplates(
  templates: Template[],
  query: string
): Template[] {
  const normalizedQuery = query.toLowerCase();

  return templates.filter(template => {
    const { metadata } = template;

    return (
      metadata.name.toLowerCase().includes(normalizedQuery) ||
      metadata.description.toLowerCase().includes(normalizedQuery) ||
      metadata.tags.some(tag => tag.toLowerCase().includes(normalizedQuery)) ||
      metadata.author.name.toLowerCase().includes(normalizedQuery)
    );
  });
}

/**
 * Sort templates by various criteria
 */
export function sortTemplates(
  templates: Template[],
  sortBy: 'popular' | 'recent' | 'rating' | 'name'
): Template[] {
  const sorted = [...templates];

  switch (sortBy) {
    case 'popular':
      sorted.sort((a, b) => b.metadata.usageCount - a.metadata.usageCount);
      break;
    case 'recent':
      sorted.sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt);
      break;
    case 'rating':
      sorted.sort((a, b) => b.metadata.rating - a.metadata.rating);
      break;
    case 'name':
      sorted.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
      break;
  }

  return sorted;
}

/**
 * Export template to JSON
 */
export function exportTemplate(template: Template): string {
  return JSON.stringify(template, null, 2);
}

/**
 * Import template from JSON
 */
export function importTemplate(json: string): Template | null {
  try {
    const template = JSON.parse(json) as Template;
    const validation = validateTemplate(template);

    if (!validation.valid) {
      console.error('Invalid template:', validation.errors);
      return null;
    }

    return template;
  } catch (error) {
    console.error('Failed to parse template JSON:', error);
    return null;
  }
}

/**
 * Clone template
 */
export function cloneTemplate(template: Template, newId?: string): Template {
  return {
    ...template,
    metadata: {
      ...template.metadata,
      id: newId || `clone-${template.metadata.id}-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  };
}
