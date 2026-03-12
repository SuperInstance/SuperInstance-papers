import React, { lazy, Suspense, useRef } from 'react';
import { InteractiveVisualizationErrorBoundary, VisualizationLoader, useInViewport } from './ErrorBoundary';

// Lazy load the optimized interactive components
const OptimizedConfidenceCascadeVisualizer = lazy(() =>
  import('./OptimizedConfidenceCascadeVisualizer').then(module => ({
    default: module.OptimizedConfidenceCascadeVisualizer
  }))
);

const OptimizedRateBasedChangeSimulator = lazy(() =>
  import('./OptimizedRateBasedChangeSimulator').then(module => ({
    default: module.OptimizedRateBasedChangeSimulator
  }))
);

const OptimizedPythagoreanSnapCalculator = lazy(() =>
  import('./OptimizedPythagoreanSnapCalculator').then(module => ({
    default: module.OptimizedPythagoreanSnapCalculator
  }))
);

// Wrapper components with lazy loading and viewport detection
export function LazyConfidenceCascadeVisualizer() {
  const ref = useRef<HTMLDivElement>(null);
  const isInViewport = useInViewport(ref);

  return (
    <div ref={ref} className="w-full">
      {isInViewport ? (
        <InteractiveVisualizationErrorBoundary
          fallback={
            <div className="p-8 bg-red-50 rounded-lg text-center">
              <p className="text-red-600 mb-2">Failed to load confidence cascade visualizer</p>
              <p className="text-sm text-red-500">Please refresh the page to try again</p>
            </div>
          }
        >
          <Suspense
            fallback={
              <VisualizationLoader
                message="Loading confidence cascade visualizer..."
              />
            }
          >
            <OptimizedConfidenceCascadeVisualizer />
          </Suspense>
        </InteractiveVisualizationErrorBoundary>
      ) : (
        <div className="h-96" />
      )}
    </div>
  );
}

export function LazyRateBasedChangeSimulator() {
  const ref = useRef<HTMLDivElement>(null);
  const isInViewport = useInViewport(ref);

  return (
    <div ref={ref} className="w-full">
      {isInViewport ? (
        <InteractiveVisualizationErrorBoundary
          fallback={
            <div className="p-8 bg-red-50 rounded-lg text-center">
              <p className="text-red-600 mb-2">Failed to load rate-based change simulator</p>
              <p className="text-sm text-red-500">Please refresh the page to try again</p>
            </div>
          }
        >
          <Suspense
            fallback={
              <VisualizationLoader
                message="Loading rate-based change simulator..."
              />
            }
          >
            <OptimizedRateBasedChangeSimulator />
          </Suspense>
        </InteractiveVisualizationErrorBoundary>
      ) : (
        <div className="h-96" />
      )}
    </div>
  );
}

export function LazyPythagoreanSnapCalculator() {
  const ref = useRef<HTMLDivElement>(null);
  const isInViewport = useInViewport(ref);

  return (
    <div ref={ref} className="w-full">
      {isInViewport ? (
        <InteractiveVisualizationErrorBoundary
          fallback={
            <div className="p-8 bg-red-50 rounded-lg text-center">
              <p className="text-red-600 mb-2">Failed to load Pythagorean snap calculator</p>
              <p className="text-sm text-red-500">Please refresh the page to try again</p>
            </div>
          }
        >
          <Suspense
            fallback={
              <VisualizationLoader
                message="Loading Pythagorean snap calculator..."
              />
            }
          >
            <OptimizedPythagoreanSnapCalculator />
          </Suspense>
        </InteractiveVisualizationErrorBoundary>
      ) : (
        <div className="h-96" />
      )}
    </div>
  );
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const ref = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const measureName = `${componentName}-load`;
      const startMark = `${measureName}-start`;
      const endMark = `${measureName}-end`;

      // Start measurement
      performance.mark(startMark);

      // End measurement when component mounts
      const observer = new MutationObserver(() => {
        if (ref.current && ref.current.children.length > 0) {
          performance.mark(endMark);
          performance.measure(measureName, startMark, endMark);

          // Log to console in development
          if (process.env.NODE_ENV === 'development') {
            const measure = performance.getEntriesByName(measureName)[0];
            console.log(`${componentName} loaded in ${measure.duration.toFixed(2)}ms`);
          }

          observer.disconnect();
        }
      });

      if (ref.current) {
        observer.observe(ref.current, { childList: true });
      }

      return () => {
        observer.disconnect();
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
        performance.clearMeasures(measureName);
      };
    }
  }, [componentName]);

  return ref;
}