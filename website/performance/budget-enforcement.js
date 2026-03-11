// Performance Budget Enforcement System
// Enforces performance budgets during development and CI/CD

import { webVitalsConfig } from './web-vitals.config.js';

class PerformanceBudgetEnforcer {
  constructor() {
    this.budgets = webVitalsConfig.budgets;
    this.bundleBudgets = webVitalsConfig.bundleBudgets;
    this.violations = [];
  }

  // Analyze current page performance
  async analyzePage() {
    console.log('Analyzing page performance against budgets...');

    const analysis = {
      timestamp: Date.now(),
      url: window.location.href,
      coreWebVitals: {},
      bundleSizes: {},
      assetCounts: {},
      violations: [],
      recommendations: [],
    };

    // Analyze Core Web Vitals
    await this.analyzeCoreWebVitals(analysis);

    // Analyze bundle sizes
    await this.analyzeBundleSizes(analysis);

    // Analyze asset counts
    await this.analyzeAssetCounts(analysis);

    // Generate recommendations
    this.generateRecommendations(analysis);

    // Log results
    this.logAnalysis(analysis);

    return analysis;
  }

  // Analyze Core Web Vitals
  async analyzeCoreWebVitals(analysis) {
    if ('webVitals' in window) {
      const { getCLS, getFID, getLCP, getFCP, getTTFB } = await import('web-vitals');

      const metrics = await Promise.all([
        this.getMetricWithBudget('LCP', getLCP, this.budgets.lcp),
        this.getMetricWithBudget('FID', getFID, this.budgets.fid),
        this.getMetricWithBudget('CLS', getCLS, this.budgets.cls),
        this.getMetricWithBudget('FCP', getFCP, this.budgets.fcp),
      ]);

      metrics.forEach(({ name, value, status, budget }) => {
        analysis.coreWebVitals[name] = { value, status, budget };

        if (status === 'error' || status === 'warning') {
          analysis.violations.push({
            type: 'CORE_WEB_VITAL',
            metric: name,
            value,
            budget,
            status,
          });
        }
      });
    }
  }

  // Get metric with budget check
  async getMetricWithBudget(name, getMetric, budget) {
    return new Promise((resolve) => {
      getMetric((metric) => {
        const value = metric.value;
        let status = 'pass';

        if (value > budget.error) {
          status = 'error';
        } else if (value > budget.warning) {
          status = 'warning';
        }

        resolve({ name, value, status, budget });
      });
    });
  }

  // Analyze bundle sizes
  async analyzeBundleSizes(analysis) {
    const resources = performance.getEntriesByType('resource');
    const scripts = resources.filter(r => r.initiatorType === 'script');
    const styles = resources.filter(r => r.initiatorType === 'stylesheet');
    const images = resources.filter(r => r.initiatorType === 'img');

    // Analyze JavaScript
    const jsAnalysis = this.analyzeResourceType('javascript', scripts, this.bundleBudgets.javascript);
    analysis.bundleSizes.javascript = jsAnalysis;

    // Analyze CSS
    const cssAnalysis = this.analyzeResourceType('css', styles, this.bundleBudgets.css);
    analysis.bundleSizes.css = cssAnalysis;

    // Analyze Images
    const imageAnalysis = this.analyzeResourceType('images', images, this.bundleBudgets.images);
    analysis.bundleSizes.images = imageAnalysis;

    // Check for violations
    [jsAnalysis, cssAnalysis, imageAnalysis].forEach((resourceAnalysis) => {
      if (resourceAnalysis.status === 'error' || resourceAnalysis.status === 'warning') {
        analysis.violations.push({
          type: 'BUNDLE_SIZE',
          resourceType: resourceAnalysis.type,
          ...resourceAnalysis,
        });
      }
    });
  }

  // Analyze resource type
  analyzeResourceType(type, resources, budget) {
    const totalSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    const initialSize = resources
      .filter(r => !r.name.includes('async') && !r.name.includes('defer'))
      .reduce((sum, r) => sum + (r.transferSize || 0), 0);

    const analysis = {
      type,
      resourceCount: resources.length,
      totalSize,
      initialSize,
      budget,
      status: 'pass',
      largestResources: resources
        .sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0))
        .slice(0, 5)
        .map(r => ({
          name: r.name,
          size: r.transferSize || 0,
          duration: r.duration,
        })),
    };

    // Check against budget
    if (type === 'javascript') {
      if (initialSize > budget.initial) analysis.status = 'error';
      else if (totalSize > budget.total) analysis.status = 'warning';
    } else if (type === 'css') {
      if (initialSize > budget.initial) analysis.status = 'error';
      else if (totalSize > budget.total) analysis.status = 'warning';
    } else if (type === 'images') {
      const oversizedImages = resources.filter(r => (r.transferSize || 0) > budget.perImage);
      if (oversizedImages.length > 0) analysis.status = 'warning';
      if (totalSize > budget.total) analysis.status = 'error';
    }

    return analysis;
  }

  // Analyze asset counts
  async analyzeAssetCounts(analysis) {
    const resources = performance.getEntriesByType('resource');

    // Count requests by domain
    const domains = new Set();
    resources.forEach(r => {
      try {
        const url = new URL(r.name);
        domains.add(url.hostname);
      } catch (e) {
        // Ignore invalid URLs
      }
    });

    // Count redirects
    const redirects = resources.filter(r => r.redirectEnd > 0).length;

    analysis.assetCounts = {
      totalRequests: resources.length,
      uniqueDomains: domains.size,
      redirects,
      status: 'pass',
    };

    // Check against thresholds
    if (resources.length > 30) analysis.assetCounts.status = 'warning';
    if (domains.size > 10) analysis.assetCounts.status = 'warning';
    if (redirects > 2) analysis.assetCounts.status = 'warning';

    if (analysis.assetCounts.status === 'warning') {
      analysis.violations.push({
        type: 'ASSET_COUNT',
        ...analysis.assetCounts,
      });
    }
  }

  // Generate recommendations
  generateRecommendations(analysis) {
    const recommendations = [];

    // Core Web Vitals recommendations
    Object.entries(analysis.coreWebVitals).forEach(([metric, data]) => {
      if (data.status === 'error' || data.status === 'warning') {
        recommendations.push(this.getRecommendationForMetric(metric, data));
      }
    });

    // Bundle size recommendations
    Object.entries(analysis.bundleSizes).forEach(([type, data]) => {
      if (data.status === 'error' || data.status === 'warning') {
        recommendations.push(this.getRecommendationForBundle(type, data));
      }
    });

    // Asset count recommendations
    if (analysis.assetCounts.status === 'warning') {
      recommendations.push(this.getRecommendationForAssetCounts(analysis.assetCounts));
    }

    analysis.recommendations = recommendations;
  }

  // Get recommendation for metric
  getRecommendationForMetric(metric, data) {
    const recommendations = {
      LCP: `Reduce Largest Contentful Paint from ${data.value}ms to under ${data.budget.warning}ms. Consider: optimizing images, implementing lazy loading, using a CDN.`,
      FID: `Reduce First Input Delay from ${data.value}ms to under ${data.budget.warning}ms. Consider: reducing JavaScript execution time, code splitting, optimizing event handlers.`,
      CLS: `Reduce Cumulative Layout Shift from ${data.value} to under ${data.budget.warning}. Consider: setting explicit dimensions for media, reserving space for ads, avoiding inserting content above existing content.`,
      FCP: `Reduce First Contentful Paint from ${data.value}ms to under ${data.budget.warning}ms. Consider: eliminating render-blocking resources, minimizing CSS, preloading key resources.`,
    };

    return {
      type: 'METRIC_OPTIMIZATION',
      metric,
      currentValue: data.value,
      targetValue: data.budget.warning,
      recommendation: recommendations[metric] || `Optimize ${metric} performance.`,
      priority: data.status === 'error' ? 'high' : 'medium',
    };
  }

  // Get recommendation for bundle
  getRecommendationForBundle(type, data) {
    const recommendations = {
      javascript: `Reduce JavaScript bundle size. Current: ${this.formatBytes(data.initialSize)} initial, ${this.formatBytes(data.totalSize)} total. Target: ${this.formatBytes(data.budget.initial)} initial, ${this.formatBytes(data.budget.total)} total. Consider: code splitting, tree shaking, removing unused dependencies.`,
      css: `Reduce CSS bundle size. Current: ${this.formatBytes(data.initialSize)} initial, ${this.formatBytes(data.totalSize)} total. Target: ${this.formatBytes(data.budget.initial)} initial, ${this.formatBytes(data.budget.total)} total. Consider: purging unused CSS, minification, critical CSS extraction.`,
      images: `Optimize images. ${data.largestResources.length} large images detected. Target: ${this.formatBytes(data.budget.perImage)} per image, ${this.formatBytes(data.budget.total)} total. Consider: compression, modern formats (WebP/AVIF), responsive images.`,
    };

    return {
      type: 'BUNDLE_OPTIMIZATION',
      resourceType: type,
      currentSize: data.initialSize,
      targetSize: data.budget.initial,
      recommendation: recommendations[type] || `Optimize ${type} bundle size.`,
      priority: data.status === 'error' ? 'high' : 'medium',
    };
  }

  // Get recommendation for asset counts
  getRecommendationForAssetCounts(data) {
    return {
      type: 'ASSET_OPTIMIZATION',
      currentRequests: data.totalRequests,
      currentDomains: data.uniqueDomains,
      currentRedirects: data.redirects,
      recommendation: `Reduce asset counts. Current: ${data.totalRequests} requests, ${data.uniqueDomains} domains, ${data.redirects} redirects. Target: <30 requests, <10 domains, <2 redirects. Consider: bundling assets, domain sharding, eliminating redirects.`,
      priority: 'medium',
    };
  }

  // Format bytes for display
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Log analysis results
  logAnalysis(analysis) {
    console.group('📊 Performance Budget Analysis');
    console.log('URL:', analysis.url);
    console.log('Timestamp:', new Date(analysis.timestamp).toISOString());

    // Core Web Vitals
    console.group('Core Web Vitals:');
    Object.entries(analysis.coreWebVitals).forEach(([metric, data]) => {
      console.log(`${metric}: ${data.value} (${data.status})`);
    });
    console.groupEnd();

    // Bundle Sizes
    console.group('Bundle Sizes:');
    Object.entries(analysis.bundleSizes).forEach(([type, data]) => {
      console.log(`${type}: ${this.formatBytes(data.initialSize)} initial, ${this.formatBytes(data.totalSize)} total (${data.status})`);
    });
    console.groupEnd();

    // Violations
    if (analysis.violations.length > 0) {
      console.group('🚨 Violations:', analysis.violations.length);
      analysis.violations.forEach(v => {
        console.log(`${v.type}:`, v);
      });
      console.groupEnd();
    }

    // Recommendations
    if (analysis.recommendations.length > 0) {
      console.group('💡 Recommendations:', analysis.recommendations.length);
      analysis.recommendations.forEach(r => {
        console.log(`[${r.priority.toUpperCase()}] ${r.type}:`, r.recommendation);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }

  // Export analysis as JSON
  exportAnalysis(analysis) {
    return JSON.stringify(analysis, null, 2);
  }

  // Save analysis to file (for CI/CD)
  saveAnalysisToFile(analysis, filename = 'performance-analysis.json') {
    const blob = new Blob([this.exportAnalysis(analysis)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const budgetEnforcer = new PerformanceBudgetEnforcer();

// Auto-run in development
if (process.env.NODE_ENV === 'development') {
  window.addEventListener('load', () => {
    setTimeout(async () => {
      console.log('Running performance budget analysis...');
      const analysis = await budgetEnforcer.analyzePage();

      // Show notification if violations found
      if (analysis.violations.length > 0) {
        budgetEnforcer.showNotification(analysis);
      }
    }, 3000); // Wait 3 seconds for page to stabilize
  });
}

// Add notification method
budgetEnforcer.showNotification = function(analysis) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 8px;
    padding: 16px;
    max-width: 400px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: start; gap: 12px;">
      <div style="color: #d97706; font-size: 20px;">⚠️</div>
      <div>
        <div style="font-weight: 600; margin-bottom: 8px; color: #92400e;">
          Performance Budget Violations: ${analysis.violations.length}
        </div>
        <div style="font-size: 14px; color: #78350f; margin-bottom: 12px;">
          ${analysis.violations.slice(0, 2).map(v => `${v.type}`).join(', ')}${analysis.violations.length > 2 ? '...' : ''}
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
            background: #f59e0b;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
          ">Dismiss</button>
          <button onclick="window.budgetEnforcer.saveAnalysisToFile(window.lastAnalysis)" style="
            background: white;
            color: #78350f;
            border: 1px solid #f59e0b;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
          ">Export Report</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(notification);
  window.lastAnalysis = analysis;

  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 30000);
};

// Export for manual control
export default budgetEnforcer;