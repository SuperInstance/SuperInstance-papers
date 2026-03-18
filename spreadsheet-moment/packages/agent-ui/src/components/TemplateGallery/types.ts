/**
 * Template Types
 *
 * Type definitions for the template gallery system
 */

/**
 * Template categories for organization
 */
export enum TemplateCategory {
  DATA_ANALYSIS = 'data_analysis',
  AUTOMATION = 'automation',
  REPORTING = 'reporting',
  FINANCE = 'finance',
  PROJECT_MANAGEMENT = 'project_management',
  INTEGRATION = 'integration',
  MACHINE_LEARNING = 'machine_learning',
  CUSTOM = 'custom'
}

/**
 * Template category metadata
 */
export interface TemplateCategoryInfo {
  id: TemplateCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
}

/**
 * Individual cell configuration in a template
 */
export interface TemplateCell {
  /** Cell location (e.g., "A1", "B2") */
  location: string;

  /** Cell value or formula */
  value: string | number;

  /** Whether this cell contains a Claw agent */
  isClawCell?: boolean;

  /** Claw agent configuration (if applicable) */
  clawConfig?: {
    name: string;
    model: string;
    purpose: string;
    trigger?: {
      type: 'data' | 'periodic' | 'manual';
      interval?: number;
      source?: string;
    };
    equipment?: string[];
  };
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  /** Unique template identifier */
  id: string;

  /** Template name */
  name: string;

  /** Template description */
  description: string;

  /** Template author */
  author: {
    name: string;
    id: string;
    avatar?: string;
  };

  /** Template category */
  category: TemplateCategory;

  /** Tags for searchability */
  tags: string[];

  /** Creation timestamp */
  createdAt: number;

  /** Last updated timestamp */
  updatedAt: number;

  /** Usage count */
  usageCount: number;

  /** Rating (0-5) */
  rating: number;

  /** Number of ratings */
  ratingCount: number;

  /** Template thumbnail URL */
  thumbnail?: string;

  /** Difficulty level */
  difficulty: 'beginner' | 'intermediate' | 'advanced';

  /** Estimated time to setup */
  estimatedTime: number;

  /** Featured status */
  featured: boolean;

  /** Verified status */
  verified: boolean;
}

/**
 * Complete template definition
 */
export interface Template {
  /** Template metadata */
  metadata: TemplateMetadata;

  /** Sheet data */
  sheets: {
    /** Sheet name */
    name: string;

    /** Sheet cells */
    cells: TemplateCell[];

    /** Sheet dimensions */
    dimensions: {
      rows: number;
      columns: number;
    };
  }[];

  /** Template configuration */
  config: {
    /** Auto-start agents on load */
    autoStartAgents?: boolean;

    /** Required permissions */
    requiredPermissions?: string[];

    /** Dependencies */
    dependencies?: {
      package: string;
      version: string;
    }[];
  };
}

/**
 * Template filter options
 */
export interface TemplateFilters {
  /** Category filter */
  category?: TemplateCategory;

  /** Search query */
  searchQuery?: string;

  /** Difficulty filter */
  difficulty?: 'beginner' | 'intermediate' | 'advanced';

  /** Minimum rating */
  minRating?: number;

  /** Featured only */
  featuredOnly?: boolean;

  /** Verified only */
  verifiedOnly?: boolean;

  /** Sort order */
  sortBy?: 'popular' | 'recent' | 'rating' | 'name';
}

/**
 * Template gallery props
 */
export interface TemplateGalleryProps {
  /** On template select callback */
  onSelectTemplate: (template: Template) => void;

  /** On template use callback */
  onUseTemplate: (template: Template) => void;

  /** Current filters */
  filters?: TemplateFilters;

  /** On filters change */
  onFiltersChange?: (filters: TemplateFilters) => void;

  /** Show featured section */
  showFeatured?: boolean;

  /** Show categories */
  showCategories?: boolean;

  /** Custom class name */
  className?: string;
}

/**
 * Template card props
 */
export interface TemplateCardProps {
  /** Template data */
  template: Template;

  /** On click callback */
  onClick?: (template: Template) => void;

  /** On use callback */
  onUse?: (template: Template) => void;

  /** Show usage count */
  showUsageCount?: boolean;

  /** Show rating */
  showRating?: boolean;

  /** Compact mode */
  compact?: boolean;

  /** Custom class name */
  className?: string;
}

/**
 * Template preview props
 */
export interface TemplatePreviewProps {
  /** Template to preview */
  template: Template;

  /** On close callback */
  onClose: () => void;

  /** On use callback */
  onUse: (template: Template) => void;

  /** Show code preview */
  showCodePreview?: boolean;

  /** Custom class name */
  className?: string;
}

/**
 * Template editor props
 */
export interface TemplateEditorProps {
  /** Template to edit (undefined for new template) */
  template?: Template;

  /** On save callback */
  onSave: (template: Template) => void;

  /** On cancel callback */
  onCancel: () => void;

  /** Read-only mode */
  readOnly?: boolean;

  /** Custom class name */
  className?: string;
}
