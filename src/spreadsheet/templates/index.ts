/**
 * POLLN Spreadsheet Templates - Comprehensive Example Templates
 *
 * This module exports all available spreadsheet templates demonstrating
 * the full capabilities of the POLLN living cell system.
 *
 * Templates included:
 * - FinancialTemplate: Revenue, expenses, cash flow, financial ratios
 * - ProjectTemplate: Task tracking, resource management, Gantt charts
 * - AnalyticsTemplate: Data ingestion, KPIs, dashboards, alerts
 * - InventoryTemplate: Stock monitoring, demand forecasting, replenishment
 *
 * @module templates
 */

import { FinancialTemplate } from './financial/FinancialTemplate';
import { ProjectTemplate } from './project/ProjectTemplate';
import { AnalyticsTemplate } from './analytics/AnalyticsTemplate';
import { InventoryTemplate } from './inventory/InventoryTemplate';

/**
 * Template registry for managing and accessing templates
 */
export class TemplateRegistry {
  private static templates: Map<string, any> = new Map();

  /**
   * Register a template
   */
  public static registerTemplate(name: string, template: any): void {
    this.templates.set(name, template);
  }

  /**
   * Get a template by name
   */
  public static getTemplate(name: string): any {
    return this.templates.get(name);
  }

  /**
   * List all registered templates
   */
  public static listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Check if a template exists
   */
  public static hasTemplate(name: string): boolean {
    return this.templates.has(name);
  }
}

/**
 * Template factory for creating template instances
 */
export class TemplateFactory {
  /**
   * Create a financial template
   */
  public static createFinancial(): FinancialTemplate {
    return new FinancialTemplate();
  }

  /**
   * Create a project template
   */
  public static createProject(): ProjectTemplate {
    return new ProjectTemplate();
  }

  /**
   * Create an analytics template
   */
  public static createAnalytics(): AnalyticsTemplate {
    return new AnalyticsTemplate();
  }

  /**
   * Create an inventory template
   */
  public static createInventory(): InventoryTemplate {
    return new InventoryTemplate();
  }

  /**
   * Create a template by type
   */
  public static createTemplate(type: string): any {
    switch (type.toLowerCase()) {
      case 'financial':
        return this.createFinancial();
      case 'project':
        return this.createProject();
      case 'analytics':
        return this.createAnalytics();
      case 'inventory':
        return this.createInventory();
      default:
        throw new Error(`Unknown template type: ${type}`);
    }
  }

  /**
   * Create a template from configuration
   */
  public static createFromConfig(config: {
    type: string;
    options?: any;
  }): any {
    const template = this.createTemplate(config.type);

    if (config.options) {
      Object.entries(config.options).forEach(([key, value]) => {
        if (typeof template[key] === 'function') {
          template[key](value);
        }
      });
    }

    return template;
  }

  /**
   * Create multiple templates
   */
  public static createTemplates(types: string[]): Map<string, any> {
    const templates = new Map();

    types.forEach(type => {
      try {
        const template = this.createTemplate(type);
        templates.set(type, template);
      } catch (error) {
        console.error(`Failed to create template ${type}:`, error);
      }
    });

    return templates;
  }
}

/**
 * Template metadata for documentation and discovery
 */
export const TemplateMetadata = {
  financial: {
    name: 'Financial Management',
    description: 'Comprehensive financial tracking with revenue, expenses, budgets, and forecasting',
    features: [
      'Revenue tracking with trend analysis',
      'Expense categorization with variance detection',
      'Budget planning with real-time monitoring',
      'Cash flow projection',
      'Financial ratio calculation',
      'Multi-currency support'
    ],
    cellTypes: ['InputCell', 'AggregateCell', 'AnalysisCell', 'PredictionCell', 'DecisionCell'],
    complexity: 'advanced',
    useCases: ['budgeting', 'forecasting', 'financial_analysis', 'reporting']
  },
  project: {
    name: 'Project Management',
    description: 'Complete project tracking with tasks, resources, timelines, and risk assessment',
    features: [
      'Task tracking with dependencies',
      'Resource allocation and utilization',
      'Timeline visualization (Gantt charts)',
      'Critical path analysis',
      'Risk assessment and mitigation',
      'Milestone tracking'
    ],
    cellTypes: ['InputCell', 'TransformCell', 'AnalysisCell', 'PredictionCell', 'DecisionCell'],
    complexity: 'advanced',
    useCases: ['project_tracking', 'resource_management', 'schedule_optimization', 'risk_management']
  },
  analytics: {
    name: 'Analytics Dashboard',
    description: 'Real-time analytics with data ingestion, KPI tracking, and intelligent alerting',
    features: [
      'Multi-source data ingestion',
      'Real-time data transformation',
      'KPI calculation and tracking',
      'Trend analysis and anomaly detection',
      'Predictive forecasting',
      'Automated alerting and reporting'
    ],
    cellTypes: ['InputCell', 'TransformCell', 'AggregateCell', 'AnalysisCell', 'PredictionCell', 'DecisionCell'],
    complexity: 'expert',
    useCases: ['business_intelligence', 'monitoring', 'reporting', 'alerting']
  },
  inventory: {
    name: 'Inventory Management',
    description: 'Complete inventory system with stock monitoring, demand forecasting, and replenishment',
    features: [
      'Real-time stock level monitoring',
      'Demand forecasting and prediction',
      'Reorder point calculation',
      'Safety stock optimization',
      'Supplier performance tracking',
      'EOQ analysis'
    ],
    cellTypes: ['InputCell', 'TransformCell', 'AnalysisCell', 'PredictionCell', 'DecisionCell'],
    complexity: 'advanced',
    useCases: ['inventory_tracking', 'demand_planning', 'replenishment', 'supplier_management']
  }
};

/**
 * Template usage examples
 */
export const TemplateExamples = {
  financial: {
    title: 'Getting Started with Financial Template',
    description: 'Basic financial tracking setup',
    code: `
import { FinancialTemplate } from '@spreadsheet/templates/financial';

// Create template with sample data
const financial = FinancialTemplate.generateSampleData();

// Add custom revenue source
financial.addRevenueSource({
  id: 'consulting',
  name: 'Consulting Services',
  category: 'service',
  monthly: {
    january: 45000,
    february: 52000,
    march: 58000
  }
});

// Get revenue trend
const trend = financial.getRevenueTrend();
console.log('Revenue trend:', trend);

// Check for budget alerts
const alerts = financial.getVarianceAlerts();
alerts.forEach(alert => console.log('Alert:', alert));
`
  },
  project: {
    title: 'Getting Started with Project Template',
    description: 'Basic project management setup',
    code: `
import { ProjectTemplate } from '@spreadsheet/templates/project';

// Create template with sample data
const project = ProjectTemplate.generateSampleData();

// Add a new task
project.addTask({
  id: 'task_api_docs',
  name: 'Write API Documentation',
  status: 'pending',
  assignee: 'alice',
  estimatedHours: 16,
  dependencies: ['create_api'],
  priority: 'medium'
});

// Update task status
project.updateTaskStatus('task_api_docs', 'in_progress', 4);

// Get project status
const status = project.getProjectStatus();
console.log('Project status:', status);

// Analyze critical path
const criticalPath = project.getCriticalPath();
console.log('Critical path:', criticalPath);
`
  },
  analytics: {
    title: 'Getting Started with Analytics Template',
    description: 'Basic analytics dashboard setup',
    code: `
import { AnalyticsTemplate } from '@spreadsheet/templates/analytics';

// Create template with sample data
const analytics = AnalyticsTemplate.generateSampleData();

// Add custom KPI
analytics.addKPI('conversion_rate', {
  name: 'Conversion Rate',
  calculation: 'conversions / visitors',
  groupBy: ['date'],
  format: 'percentage'
});

// Set up alert
analytics.addAlert('conversion_drop', {
  name: 'Conversion Rate Drop',
  kpi: 'conversion_rate',
  condition: 'below_threshold',
  threshold: 0.02,
  severity: 'warning',
  actions: ['notify_team', 'create_report']
});

// Get dashboard data
const dashboard = analytics.getDashboardData();
console.log('Dashboard:', dashboard);

// Check alerts
const alerts = analytics.checkAlerts();
alerts.forEach(alert => {
  if (alert.triggered) {
    console.log('Alert triggered:', alert);
  }
});
`
  },
  inventory: {
    title: 'Getting Started with Inventory Template',
    description: 'Basic inventory management setup',
    code: `
import { InventoryTemplate } from '@spreadsheet/templates/inventory';

// Create template with sample data
const inventory = InventoryTemplate.generateSampleData();

// Add new item
inventory.addItem({
  sku: 'PROD-X',
  name: 'Product X',
  quantity: 100,
  reorderPoint: 30,
  economicOrderQty: 150,
  unitCost: 75.00,
  holdingCostPct: 0.20
});

// Record sales
inventory.recordSale('PROD-X', {
  sku: 'PROD-X',
  quantity: 15,
  date: new Date(),
  price: 99.00
});

// Check stock status
const status = inventory.getStockStatus('PROD-X');
console.log('Stock status:', status);

// Check if reorder needed
const reorder = inventory.checkReorder('PROD-X');
if (reorder.shouldReorder) {
  const poNumber = inventory.createPurchaseOrder('PROD-X', reorder.recommendedQty);
  console.log('Created PO:', poNumber);
}
`
  }
};

/**
 * Template comparison utility
 */
export class TemplateComparator {
  /**
   * Compare templates by features
   */
  public static compareByFeature(feature: string): any[] {
    const templates = Object.entries(TemplateMetadata);

    return templates.map(([key, meta]) => ({
      name: key,
      hasFeature: meta.features.some(f => f.toLowerCase().includes(feature.toLowerCase()))
    }));
  }

  /**
   * Compare templates by complexity
   */
  public static compareByComplexity(): any[] {
    const templates = Object.entries(TemplateMetadata);
    const complexityOrder = ['basic', 'intermediate', 'advanced', 'expert'];

    return templates
      .map(([key, meta]) => ({
        name: key,
        complexity: meta.complexity,
        level: complexityOrder.indexOf(meta.complexity)
      }))
      .sort((a, b) => a.level - b.level);
  }

  /**
   * Find templates by use case
   */
  public static findByUseCase(useCase: string): string[] {
    const templates = Object.entries(TemplateMetadata);

    return templates
      .filter(([key, meta]) =>
        meta.useCases.some(uc => uc.toLowerCase().includes(useCase.toLowerCase()))
      )
      .map(([key]) => key);
  }
}

/**
 * Template validator for checking template configurations
 */
export class TemplateValidator {
  /**
   * Validate a template instance
   */
  public static validate(template: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.colony) {
      errors.push('Template missing colony instance');
    }

    if (!template.consciousness) {
      errors.push('Template missing consciousness stream');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate template configuration
   */
  public static validateConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.type) {
      errors.push('Configuration missing type');
    }

    if (!TemplateMetadata[config.type]) {
      errors.push(`Unknown template type: ${config.type}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}

// Register all built-in templates
TemplateRegistry.registerTemplate('financial', FinancialTemplate);
TemplateRegistry.registerTemplate('project', ProjectTemplate);
TemplateRegistry.registerTemplate('analytics', AnalyticsTemplate);
TemplateRegistry.registerTemplate('inventory', InventoryTemplate);

// Export all templates
export {
  FinancialTemplate,
  ProjectTemplate,
  AnalyticsTemplate,
  InventoryTemplate
};

// Export utilities
export {
  TemplateRegistry,
  TemplateFactory,
  TemplateMetadata,
  TemplateExamples,
  TemplateComparator,
  TemplateValidator
};

/**
 * Default export for convenience
 */
export default {
  FinancialTemplate,
  ProjectTemplate,
  AnalyticsTemplate,
  InventoryTemplate,
  TemplateRegistry,
  TemplateFactory,
  TemplateMetadata,
  TemplateExamples,
  TemplateComparator,
  TemplateValidator
};
