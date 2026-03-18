/**
 * Bundle Optimizer
 *
 * Utilities for optimizing bundle size and loading
 */

/**
 * Code split point marker
 */
export function codeSplit<T>(loader: () => Promise<T>): () => Promise<T> {
  return loader;
}

/**
 * Create a dynamic import with chunk name
 */
export function dynamicImport(
  chunkName: string,
  importer: () => Promise<any>
): Promise<any> {
  // Add webpack chunk name comment
  /* webpackChunkName: "[request]" */
  return importer();
}

/**
 * Measure bundle size
 */
export function measureBundleSize(): Promise<number> {
  if (typeof performance === 'undefined') {
    return Promise.resolve(0);
  }

  return new Promise((resolve) => {
    // Wait for performance entries to be available
    setTimeout(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsEntries = entries.filter(entry => entry.name.endsWith('.js'));
      const totalSize = jsEntries.reduce((acc, entry) => acc + (entry.transferSize || 0), 0);
      resolve(totalSize / 1024); // Convert to KB
    }, 1000);
  });
}

/**
 * Get bundle analysis
 */
export async function getBundleAnalysis(): Promise<{
  totalSize: number;
  chunks: Array<{
    name: string;
    size: number;
    url: string;
  }>;
  recommendations: string[];
}> {
  if (typeof performance === 'undefined') {
    return {
      totalSize: 0,
      chunks: [],
      recommendations: []
    };
  }

  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const jsEntries = entries.filter(entry => entry.name.endsWith('.js'));

  const chunks = jsEntries.map(entry => ({
    name: entry.name.split('/').pop() || entry.name,
    size: entry.transferSize || 0,
    url: entry.name
  }));

  const totalSize = chunks.reduce((acc, chunk) => acc + chunk.size, 0);

  const recommendations: string[] = [];

  // Analyze chunk sizes
  const largeChunks = chunks.filter(chunk => chunk.size > 200 * 1024); // >200KB
  if (largeChunks.length > 0) {
    recommendations.push(
      `Consider code splitting: ${largeChunks.length} chunks exceed 200KB`
    );
  }

  // Check for duplicate chunks
  const chunkNames = chunks.map(c => c.name);
  const duplicates = chunkNames.filter((name, index) => chunkNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    recommendations.push(
      `Duplicate chunks detected: ${[...new Set(duplicates)].join(', ')}`
    );
  }

  return {
    totalSize: totalSize / 1024, // Convert to KB
    chunks: chunks.map(c => ({ ...c, size: c.size / 1024 })),
    recommendations
  };
}

/**
 * Preload critical bundles
 */
export function preloadCriticalBundles(bundles: string[]): void {
  if (typeof document === 'undefined') {
    return;
  }

  bundles.forEach(bundle => {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = bundle;
    document.head.appendChild(link);
  });
}

/**
 * Create a bundle router for code splitting
 */
export function createBundleRouter(routes: Record<string, () => Promise<any>>) {
  const loadedRoutes = new Set<string>();

  return {
    /**
     * Get a route loader
     */
    getRouteLoader: (path: string) => {
      return async () => {
        if (!loadedRoutes.has(path)) {
          const loader = routes[path];
          if (loader) {
            await loader();
            loadedRoutes.add(path);
          }
        }
      };
    },

    /**
     * Preload a route
     */
    preloadRoute: async function(path: string): Promise<void> {
      const loader = routes[path];
      if (loader && !loadedRoutes.has(path)) {
        await loader();
        loadedRoutes.add(path);
      }
    },

    /**
     * Preload multiple routes
     */
    preloadRoutes: async function(paths: string[]): Promise<void> {
      const self = this;
      await Promise.all(paths.map(path => self.preloadRoute(path)));
    },

    /**
     * Check if route is loaded
     */
    isRouteLoaded: (path: string): boolean => {
      return loadedRoutes.has(path);
    }
  };
}
