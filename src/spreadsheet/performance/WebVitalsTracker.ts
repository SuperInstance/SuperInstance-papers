/**
 * POLLN Spreadsheet - Web Vitals Tracker
 *
 * Comprehensive Web Vitals tracking including:
 * - Core Web Vitals (FCP, LCP, CLS, FID, INP)
 * - Additional metrics (TBT, TTI, FMP)
 * - Rating system (good, needs-improvement, poor)
 * - Attribution support
 */

import { WebVitals, RatedWebVital, WebVitalsRating } from './types';

/**
 * Rating thresholds for Web Vitals
 */
const RATING_THRESHOLDS = {
  fcp: { good: 1800, poor: 3000 }, // ms
  lcp: { good: 2500, poor: 4000 }, // ms
  cls: { good: 0.1, poor: 0.25 }, // score
  fid: { good: 100, poor: 300 }, // ms
  inp: { good: 200, poor: 500 }, // ms
  tti: { good: 3800, poor: 7300 }, // ms
  tbt: { good: 200, poor: 600 }, // ms
} as const;

/**
 * Web Vitals tracking configuration
 */
interface WebVitalsConfig {
  reportAllChanges?: boolean;
  reportCallback?: (metric: RatedWebVital) => void;
  attributionEnabled?: boolean;
  navigationTiming?: boolean;
}

/**
 * Entry handler type
 */
type EntryHandler = (entry: PerformanceEntry) => void;

/**
 * Web Vitals change handler
 */
type MetricChangeHandler = (metric: RatedWebVital) => void;

/**
 * Web Vitals Tracker
 *
 * Tracks all Core Web Vitals and additional performance metrics
 * with automatic rating and attribution support.
 */
export class WebVitalsTracker {
  private metrics: Partial<WebVitals> = {};
  private ratedMetrics: Map<string, RatedWebVital> = new Map();
  private config: WebVitalsConfig;
  private observers: Map<string, PerformanceObserver> = new Map();
  private changeHandlers: Set<MetricChangeHandler> = new Set();
  private hasReported = false;

  // Performance timing
  private navigationTiming: PerformanceNavigationTiming | null = null;
  private paintTiming: Map<string, number> = new Map();

  // Long task tracking
  private longTasks: PerformanceEntry[] = [];

  constructor(config: WebVitalsConfig = {}) {
    this.config = {
      reportAllChanges: false,
      attributionEnabled: true,
      navigationTiming: true,
      ...config,
    };

    this.initialize();
  }

  /**
   * Initialize tracking
   */
  private initialize(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      console.warn('Web Vitals tracking requires PerformanceObserver support');
      return;
    }

    this.setupNavigationTiming();
    this.setupPaintTiming();
    this.setupFCP();
    this.setupLCP();
    this.setupCLS();
    this.setupFID();
    this.setupINP();
    this.setupTBT();
    this.setupLongTasks();
  }

  /**
   * Setup navigation timing
   */
  private setupNavigationTiming(): void {
    if (!this.config.navigationTiming) return;

    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (navEntry) {
      this.navigationTiming = navEntry;
      this.calculateTTI();
    }
  }

  /**
   * Setup paint timing
   */
  private setupPaintTiming(): void {
    const paintEntries = performance.getEntriesByType('paint');

    for (const entry of paintEntries) {
      if (entry.name === 'first-paint' || entry.name === 'first-contentful-paint') {
        this.paintTiming.set(entry.name, entry.startTime);
      }
    }
  }

  /**
   * Setup First Contentful Paint tracking
   */
  private setupFCP(): void {
    const fcp = this.paintTiming.get('first-contentful-paint');

    if (fcp !== undefined) {
      this.metrics.fcp = fcp;
      this.reportMetric('fcp', fcp, RATING_THRESHOLDS.fcp);
    }
  }

  /**
   * Setup Largest Contentful Paint tracking
   */
  private setupLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as LargestContentfulPaint;

        if (lastEntry) {
          this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
          this.reportMetric('lcp', this.metrics.lcp, RATING_THRESHOLDS.lcp, {
            element: lastEntry.element?.tagName || 'unknown',
            url: lastEntry.url || '',
          });
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.set('lcp', observer);
    } catch (e) {
      console.warn('LCP tracking not supported', e);
    }
  }

  /**
   * Setup Cumulative Layout Shift tracking
   */
  private setupCLS(): void {
    try {
      let clsValue = 0;
      let sessionValue = 0;
      let sessionEntries: PerformanceEntry[] = [];

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            sessionValue += (entry as any).value;
            sessionEntries.push(entry);
          }
        }

        clsValue = sessionValue;
        this.metrics.cls = clsValue;
        this.reportMetric('cls', clsValue, RATING_THRESHOLDS.cls, {
          entries: sessionEntries.length,
        });
      });

      observer.observe({ type: 'layout-shift', buffered: true });
      this.observers.set('cls', observer);
    } catch (e) {
      console.warn('CLS tracking not supported', e);
    }
  }

  /**
   * Setup First Input Delay tracking
   */
  private setupFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as any;
          this.metrics.fid = fidEntry.processingStart - fidEntry.startTime;
          this.reportMetric('fid', this.metrics.fid, RATING_THRESHOLDS.fid, {
            eventType: fidEntry.name,
            target: fidEntry.target?.tagName || 'unknown',
          });

          // Only report first FID
          if (!this.config.reportAllChanges) {
            observer.disconnect();
          }
        }
      });

      observer.observe({ type: 'first-input', buffered: true });
      this.observers.set('fid', observer);
    } catch (e) {
      console.warn('FID tracking not supported', e);
    }
  }

  /**
   * Setup Interaction to Next Paint tracking
   */
  private setupINP(): void {
    try {
      let inpValue = 0;
      let entries: PerformanceEntry[] = [];

      const observer = new PerformanceObserver((list) => {
        entries = entries.concat(list.getEntries());

        for (const entry of list.getEntries()) {
          const inpEntry = entry as any;
          const inp = inpEntry.processingStart - inpEntry.startTime;

          if (inp > inpValue) {
            inpValue = inp;
            this.metrics.inp = inp;
            this.reportMetric('inp', inp, RATING_THRESHOLDS.inp, {
              eventType: inpEntry.name,
              target: inpEntry.target?.tagName || 'unknown',
            });
          }
        }
      });

      observer.observe({ type: 'event', buffered: true, durationThreshold: 0 });
      this.observers.set('inp', observer);
    } catch (e) {
      console.warn('INP tracking not supported', e);
    }
  }

  /**
   * Setup Total Blocking Time tracking
   */
  private setupTBT(): void {
    // TBT is calculated from long tasks
    this.calculateTBT();
  }

  /**
   * Setup long task tracking
   */
  private setupLongTasks(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.longTasks.push(entry);
        }

        this.calculateTBT();
      });

      observer.observe({ type: 'longtask', buffered: true });
      this.observers.set('longtask', observer);
    } catch (e) {
      console.warn('Long task tracking not supported', e);
    }
  }

  /**
   * Calculate Total Blocking Time
   */
  private calculateTBT(): void {
    if (!this.navigationTiming) return;

    const fcp = this.metrics.fcp || 0;
    const tti = this.metrics.tti || 0;

    let tbt = 0;

    for (const entry of this.longTasks) {
      const startTime = entry.startTime;
      const duration = entry.duration;

      // Only count long tasks between FCP and TTI
      if (startTime >= fcp && startTime < tti) {
        const blockingTime = Math.max(0, duration - 50);
        tbt += blockingTime;
      }
    }

    this.metrics.tbt = tbt;
    this.reportMetric('tbt', tbt, RATING_THRESHOLDS.tbt);
  }

  /**
   * Calculate Time to Interactive
   */
  private calculateTTI(): void {
    if (!this.navigationTiming) return;

    // TTI = FCP + network + JS idle
    // This is a simplified calculation
    const domContentLoaded = this.navigationTiming.domContentLoadedEventEnd;
    const fcp = this.metrics.fcp || 0;

    // Find a 5-second window after FCP with no long tasks
    let tti = domContentLoaded;
    const windowSize = 5000;
    const longTaskThreshold = 50;

    // Sort long tasks by time
    const sortedTasks = [...this.longTasks].sort((a, b) => a.startTime - b.startTime);

    // Find first quiet window
    let candidateTime = Math.max(fcp, domContentLoaded);
    let foundQuietWindow = false;

    while (!foundQuietWindow && candidateTime < 30000) {
      // Check if there's a long task in the next 5 seconds
      const hasBlockingTask = sortedTasks.some(
        (task) => task.startTime >= candidateTime && task.startTime < candidateTime + windowSize
      );

      if (!hasBlockingTask) {
        tti = candidateTime;
        foundQuietWindow = true;
      } else {
        // Move candidate past the blocking task
        const nextBlockingTask = sortedTasks.find((task) => task.startTime >= candidateTime);
        if (nextBlockingTask) {
          candidateTime = nextBlockingTask.startTime + nextBlockingTask.duration;
        }
      }
    }

    this.metrics.tti = tti;
    this.reportMetric('tti', tti, RATING_THRESHOLDS.tti);
  }

  /**
   * Report a metric with rating
   */
  private reportMetric(
    name: string,
    value: number,
    thresholds: { good: number; poor: number },
    attribution?: Record<string, any>
  ): void {
    const rating = this.getRating(value, thresholds);

    const ratedMetric: RatedWebVital = {
      name,
      value,
      rating,
      target: thresholds.good,
      timestamp: Date.now(),
    };

    this.ratedMetrics.set(name, ratedMetric);

    // Notify handlers
    for (const handler of this.changeHandlers) {
      try {
        handler(ratedMetric);
      } catch (error) {
        console.error('Error in metric change handler:', error);
      }
    }

    // Call config callback
    if (this.config.reportCallback) {
      try {
        this.config.reportCallback(ratedMetric);
      } catch (error) {
        console.error('Error in report callback:', error);
      }
    }

    this.hasReported = true;
  }

  /**
   * Get rating for a value
   */
  private getRating(value: number, thresholds: { good: number; poor: number }): WebVitalsRating {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Subscribe to metric changes
   */
  onChange(handler: MetricChangeHandler): () => void {
    this.changeHandlers.add(handler);
    return () => {
      this.changeHandlers.delete(handler);
    };
  }

  /**
   * Get all Web Vitals
   */
  getWebVitals(): Partial<WebVitals> {
    return { ...this.metrics };
  }

  /**
   * Get rated metrics
   */
  getRatedMetrics(): Map<string, RatedWebVital> {
    return new Map(this.ratedMetrics);
  }

  /**
   * Get a specific rated metric
   */
  getRatedMetric(name: string): RatedWebVital | null {
    return this.ratedMetrics.get(name) || null;
  }

  /**
   * Check if all Core Web Vitals have been reported
   */
  hasAllCoreWebVitals(): boolean {
    return (
      this.metrics.fcp !== undefined &&
      this.metrics.lcp !== undefined &&
      this.metrics.cls !== undefined &&
      this.metrics.fid !== undefined
    );
  }

  /**
   * Get overall performance score
   */
  getOverallScore(): number {
    const coreVitals = ['fcp', 'lcp', 'cls', 'fid'] as const;
    let totalScore = 0;
    let count = 0;

    for (const vital of coreVitals) {
      const rated = this.ratedMetrics.get(vital);
      if (rated) {
        switch (rated.rating) {
          case 'good':
            totalScore += 100;
            break;
          case 'needs-improvement':
            totalScore += 50;
            break;
          case 'poor':
            totalScore += 0;
            break;
        }
        count++;
      }
    }

    return count > 0 ? Math.round(totalScore / count) : 0;
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    score: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    metrics: Array<{ name: string; value: number; rating: WebVitalsRating }>;
  } {
    const score = this.getOverallScore();
    let rating: 'good' | 'needs-improvement' | 'poor';

    if (score >= 90) rating = 'good';
    else if (score >= 50) rating = 'needs-improvement';
    else rating = 'poor';

    const metrics = Array.from(this.ratedMetrics.entries()).map(([name, metric]) => ({
      name,
      value: metric.value,
      rating: metric.rating,
    }));

    return { score, rating, metrics };
  }

  /**
   * Disconnect all observers
   */
  disconnect(): void {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {};
    this.ratedMetrics.clear();
    this.longTasks = [];
    this.hasReported = false;
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        ratedMetrics: Array.from(this.ratedMetrics.entries()),
        summary: this.getSummary(),
      },
      null,
      2
    );
  }

  /**
   * Check if tracking is supported
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'PerformanceObserver' in window;
  }
}

/**
 * Utility function to measure Web Vitals automatically
 */
export function measureWebVitals(
  config?: WebVitalsConfig
): {
  tracker: WebVitalsTracker;
  promise: Promise<WebVitals>;
} {
  const tracker = new WebVitalsTracker(config);

  const promise = new Promise<WebVitals>((resolve) => {
    // Wait for all Core Web Vitals or timeout
    const timeout = setTimeout(() => {
      resolve(tracker.getWebVitals() as WebVitals);
    }, 10000); // 10 second timeout

    const unsubscribe = tracker.onChange(() => {
      if (tracker.hasAllCoreWebVitals()) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(tracker.getWebVitals() as WebVitals);
      }
    });
  });

  return { tracker, promise };
}

/**
 * Utility function to get current Web Vitals
 */
export async function getWebVitals(
  config?: WebVitalsConfig
): Promise<WebVitals> {
  const { promise } = measureWebVitals(config);
  return promise;
}

/**
 * Utility function to observe Web Vitals changes
 */
export function observeWebVitals(
  callback: (metric: RatedWebVital) => void,
  config?: WebVitalsConfig
): () => void {
  const tracker = new WebVitalsTracker({
    ...config,
    reportCallback: callback,
  });

  return () => {
    tracker.disconnect();
  };
}
