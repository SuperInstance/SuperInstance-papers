// Performance Monitoring System for SuperInstance.AI
// Tracks Core Web Vitals, custom metrics, and performance budgets

import { webVitalsConfig, performanceThresholds } from './web-vitals.config.js';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = performanceThresholds;
    this.violations = [];
    this.isMonitoring = false;
  }

  // Start monitoring
  start() {
    if (this.isMonitoring) {
      console.warn('Performance monitoring already started');
      return;
    }

    console.log('Starting performance monitoring...');
    this.isMonitoring = true;

    // Monitor Core Web Vitals
    this.monitorCoreWebVitals();

    // Monitor custom metrics
    this.monitorCustomMetrics();

    // Monitor resource loading
    this.monitorResourceLoading();

    // Monitor memory usage
    this.monitorMemoryUsage();

    // Monitor long tasks
    this.monitorLongTasks();

    // Report initial metrics
    this.reportMetrics();
  }

  // Monitor Core Web Vitals
  monitorCoreWebVitals() {
    if ('webVitals' in window) {
      import('web-vitals').then(({ getCLS, getFID, getLCP, getFCP, getTTFB }) => {
        getCLS(this.handleMetric.bind(this, 'CLS'));
        getFID(this.handleMetric.bind(this, 'FID'));
        getLCP(this.handleMetric.bind(this, 'LCP'));
        getFCP(this.handleMetric.bind(this, 'FCP'));
        getTTFB(this.handleMetric.bind(this, 'TTFB'));
      });
    } else {
      console.warn('web-vitals library not available');
    }
  }

  // Monitor custom metrics
  monitorCustomMetrics() {
    // Time to Interactive (TTI) - simplified calculation
    this.monitorTTI();

    // First Input Delay (FID) polyfill
    this.monitorFIDPolyfill();

    // Cumulative Layout Shift (CLS) polyfill
    this.monitorCLSPolyfill();
  }

  // Monitor Time to Interactive
  monitorTTI() {
    let tti = null;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask') {
          const fcp = performance.getEntriesByType('paint')
            .find(p => p.name === 'first-contentful-paint');

          if (fcp && !tti) {
            tti = fcp.startTime + entry.startTime;
            this.handleMetric('TTI', tti);
            observer.disconnect();
            break;
          }
        }
      }
    });
    observer.observe({ entryTypes: ['longtask'] });
  }

  // Monitor FID polyfill
  monitorFIDPolyfill() {
    let firstInputTime = null;
    let firstInputDelay = null;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'first-input' && !firstInputDelay) {
          firstInputTime = entry.startTime;
          firstInputDelay = entry.processingStart - entry.startTime;
          this.handleMetric('FID', firstInputDelay);
          observer.disconnect();
          break;
        }
      }
    });
    observer.observe({ entryTypes: ['first-input'] });
  }

  // Monitor CLS polyfill
  monitorCLSPolyfill() {
    let cls = 0;
    let previousLayoutShiftScore = 0;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          const layoutShiftScore = entry.value;
          cls += layoutShiftScore - previousLayoutShiftScore;
          previousLayoutShiftScore = layoutShiftScore;
        }
      }
      this.handleMetric('CLS', cls);
    });
    observer.observe({ entryTypes: ['layout-shift'] });
  }

  // Monitor resource loading
  monitorResourceLoading() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          this.trackResource(entry);
        }
      }
    });
    observer.observe({ entryTypes: ['resource'] });
  }

  // Track individual resource
  trackResource(entry) {
    const resource = {
      name: entry.name,
      duration: entry.duration,
      size: entry.transferSize || 0,
      type: entry.initiatorType,
      startTime: entry.startTime,
    };

    // Check against bundle budgets
    this.checkBundleBudget(resource);

    // Store resource
    if (!this.metrics.has('resources')) {
      this.metrics.set('resources', []);
    }
    this.metrics.get('resources').push(resource);
  }

  // Check bundle budget
  checkBundleBudget(resource) {
    const budgets = this.thresholds.bundleSize;

    if (resource.type === 'script') {
      if (resource.size > budgets.jsInitial) {
        this.recordViolation('JS_BUNDLE_SIZE', {
          resource: resource.name,
          size: resource.size,
          limit: budgets.jsInitial,
        });
      }
    } else if (resource.type === 'stylesheet') {
      if (resource.size > budgets.cssInitial) {
        this.recordViolation('CSS_BUNDLE_SIZE', {
          resource: resource.name,
          size: resource.size,
          limit: budgets.cssInitial,
        });
      }
    }
  }

  // Monitor memory usage
  monitorMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        this.handleMetric('MEMORY_USED', memory.usedJSHeapSize);
        this.handleMetric('MEMORY_TOTAL', memory.totalJSHeapSize);
        this.handleMetric('MEMORY_LIMIT', memory.jsHeapSizeLimit);
      }, 10000); // Check every 10 seconds
    }
  }

  // Monitor long tasks
  monitorLongTasks() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) { // 50ms threshold for long tasks
          this.handleMetric('LONG_TASK', entry.duration);

          // Check against TBT threshold
          if (entry.duration > this.thresholds.additionalMetrics.tbt) {
            this.recordViolation('LONG_TASK_DURATION', {
              duration: entry.duration,
              limit: this.thresholds.additionalMetrics.tbt,
            });
          }
        }
      }
    });
    observer.observe({ entryTypes: ['longtask'] });
  }

  // Handle metric measurement
  handleMetric(name, value) {
    console.log(`[Performance] ${name}: ${value}`);

    // Store metric
    this.metrics.set(name, {
      value,
      timestamp: Date.now(),
      unit: this.getMetricUnit(name),
    });

    // Check against thresholds
    this.checkThreshold(name, value);

    // Report to analytics
    this.reportToAnalytics(name, value);
  }

  // Get metric unit
  getMetricUnit(name) {
    const units = {
      LCP: 'ms',
      FID: 'ms',
      CLS: 'unitless',
      FCP: 'ms',
      TTFB: 'ms',
      TTI: 'ms',
      TBT: 'ms',
      SPEED_INDEX: 'ms',
      MEMORY_USED: 'bytes',
      MEMORY_TOTAL: 'bytes',
      MEMORY_LIMIT: 'bytes',
      LONG_TASK: 'ms',
    };
    return units[name] || 'unknown';
  }

  // Check against threshold
  checkThreshold(name, value) {
    const threshold = this.getThreshold(name);
    if (threshold && value > threshold) {
      this.recordViolation(name, {
        value,
        threshold,
        difference: value - threshold,
      });
    }
  }

  // Get threshold for metric
  getThreshold(name) {
    // Core Web Vitals
    if (name in this.thresholds.coreWebVitals) {
      return this.thresholds.coreWebVitals[name];
    }

    // Additional metrics
    if (name in this.thresholds.additionalMetrics) {
      return this.thresholds.additionalMetrics[name];
    }

    return null;
  }

  // Record violation
  recordViolation(type, data) {
    const violation = {
      type,
      data,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.violations.push(violation);
    console.warn(`[Performance Violation] ${type}:`, data);

    // Send alert
    this.sendAlert(violation);
  }

  // Send alert
  sendAlert(violation) {
    // Send to Slack (if configured)
    if (webVitalsConfig.alerts.slack) {
      this.sendSlackAlert(violation);
    }

    // Send to email (if configured)
    if (webVitalsConfig.alerts.email) {
      this.sendEmailAlert(violation);
    }

    // Send to webhook (if configured)
    if (webVitalsConfig.alerts.webhook) {
      this.sendWebhookAlert(violation);
    }
  }

  // Send Slack alert
  sendSlackAlert(violation) {
    const message = {
      text: `🚨 Performance Violation: ${violation.type}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Performance Violation Detected*\nType: ${violation.type}\nURL: ${violation.url}\nTimestamp: ${new Date(violation.timestamp).toISOString()}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Data: \`${JSON.stringify(violation.data, null, 2)}\``,
          },
        },
      ],
    };

    fetch(webVitalsConfig.alerts.slack, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    }).catch(console.error);
  }

  // Send email alert
  sendEmailAlert(violation) {
    // Implementation would depend on email service
    console.log('Email alert would be sent:', violation);
  }

  // Send webhook alert
  sendWebhookAlert(violation) {
    fetch(webVitalsConfig.alerts.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(violation),
    }).catch(console.error);
  }

  // Report to analytics
  reportToAnalytics(name, value) {
    if (window.analytics) {
      window.analytics.track('performance_metric', {
        metric: name,
        value,
        unit: this.getMetricUnit(name),
        url: window.location.href,
      });
    }
  }

  // Report all metrics
  reportMetrics() {
    const report = {
      timestamp: Date.now(),
      url: window.location.href,
      metrics: Object.fromEntries(this.metrics),
      violations: this.violations,
      userAgent: navigator.userAgent,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
      } : null,
    };

    // Log report
    console.log('[Performance Report]', report);

    // Send to analytics
    if (window.analytics) {
      window.analytics.track('performance_report', report);
    }

    // Store locally (for debugging)
    this.storeReport(report);

    return report;
  }

  // Store report locally
  storeReport(report) {
    try {
      const reports = JSON.parse(localStorage.getItem('performance_reports') || '[]');
      reports.push(report);

      // Keep only last 100 reports
      if (reports.length > 100) {
        reports.splice(0, reports.length - 100);
      }

      localStorage.setItem('performance_reports', JSON.stringify(reports));
    } catch (error) {
      console.error('Failed to store performance report:', error);
    }
  }

  // Get stored reports
  getStoredReports() {
    try {
      return JSON.parse(localStorage.getItem('performance_reports') || '[]');
    } catch (error) {
      console.error('Failed to get stored reports:', error);
      return [];
    }
  }

  // Clear stored reports
  clearStoredReports() {
    localStorage.removeItem('performance_reports');
  }

  // Stop monitoring
  stop() {
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceMonitor.start();
    }, 1000); // Start 1 second after load
  });
}

// Export for manual control
export default performanceMonitor;