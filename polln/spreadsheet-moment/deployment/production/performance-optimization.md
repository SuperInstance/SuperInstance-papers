# Production Performance Optimization Configuration

**Repository:** spreadsheet-moment
**Environment:** Production
**Version:** 1.0.0
**Date:** 2026-03-16
**Status:** Production Ready

---

## Table of Contents

1. [Performance Strategy](#performance-strategy)
2. [Bundle Optimization](#bundle-optimization)
3. [Caching Strategy](#caching-strategy)
4. [CDN Configuration](#cdn-configuration)
5. [Code Splitting](#code-splitting)
6. [Lazy Loading](#lazy-loading)
7. [Asset Optimization](#asset-optimization)
8. [API Optimization](#api-optimization)
9. [Database Optimization](#database-optimization)
10. [Performance Budgets](#performance-budgets)

---

## Performance Strategy

### Performance Goals

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **First Contentful Paint (FCP)** | < 1.5s | TBD | 🔄 |
| **Largest Contentful Paint (LCP)** | < 2.5s | TBD | 🔄 |
| **First Input Delay (FID)** | < 100ms | TBD | 🔄 |
| **Cumulative Layout Shift (CLS)** | < 0.1 | TBD | 🔄 |
| **Time to Interactive (TTI)** | < 3.5s | TBD | 🔄 |
| **Total Blocking Time (TBT)** | < 300ms | TBD | 🔄 |
| **Speed Index** | < 3.4s | TBD | 🔄 |
| **Time to First Byte (TTFB)** | < 600ms | TBD | 🔄 |

### Performance Optimization Layers

```
┌─────────────────────────────────────────────────────────────┐
│                  PERFORMANCE OPTIMIZATION LAYERS              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. EDGE OPTIMIZATION                                │    │
│  │     • Cloudflare CDN (300+ locations)                │    │
│  │     • Edge caching for static assets                 │    │
│  │     • HTTP/3 and TLS 1.3                            │    │
│  │     • Brotli compression                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  2. BUNDLE OPTIMIZATION                             │    │
│  │     • Tree shaking                                  │    │
│  │     • Code splitting                                │    │
│  │     • Minification                                  │    │
│  │     • Compression                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  3. LOADING OPTIMIZATION                            │    │
│  │     • Lazy loading                                  │    │
│  │     • Prefetching                                   │    │
│  │     • Preloading                                    │    │
│  │     • Resource hints                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  4. CACHING STRATEGY                                │    │
│  │     • Static asset caching                          │    │
│  │     • API response caching                          │    │
│  │     • Browser caching                               │    │
│  │     • CDN caching                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  5. RUNTIME OPTIMIZATION                            │    │
│  │     • Debouncing                                    │    │
│  │     • Throttling                                    │    │
│  │     • Virtualization                                │    │
│  │     • Request batching                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Bundle Optimization

### Build Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    // Output directory
    outDir: 'dist',

    // Generate source maps for production
    sourcemap: false, // Disable for production security

    // Minify
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log'],
      },
      format: {
        comments: false,
      },
    },

    // Target modern browsers
    target: 'es2020',

    // Chunk size warnings
    chunkSizeWarningLimit: 500,

    // Rollup options
    rollupOptions: {
      output: {
        // Manual chunk splitting
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // React libraries
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            // UI library
            if (id.includes('@univerjs')) {
              return 'vendor-univer';
            }
            // Other vendors
            return 'vendor';
          }
        },
        // Asset file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },

  // Dependencies to pre-bundle
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
```

### Bundle Analysis

```bash
# Analyze bundle size
pnpm build -- --report

# View bundle analyzer
open dist/stats.html
```

### Bundle Size Targets

| Bundle | Target | Maximum | Current |
|--------|--------|---------|---------|
| **Initial JS** | < 100KB | < 200KB | TBD |
| **Vendor React** | < 50KB | < 100KB | TBD |
| **Vendor Univer** | < 200KB | < 400KB | TBD |
| **Initial CSS** | < 20KB | < 50KB | TBD |
| **Total Initial** | < 300KB | < 500KB | TBD |

---

## Caching Strategy

### Cache Configuration

```typescript
// Cache Headers Configuration
export interface CacheConfig {
  enabled: boolean;
  maxAge: number;
  staleWhileRevalidate: number;
  staleIfError: number;
  vary: string[];
}

export const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // Static assets (images, fonts, etc.)
  static: {
    enabled: true,
    maxAge: 31536000, // 1 year
    staleWhileRevalidate: 86400, // 1 day
    staleIfError: 3600, // 1 hour
    vary: ['Accept-Encoding'],
  },

  // JavaScript bundles
  javascript: {
    enabled: true,
    maxAge: 86400, // 1 day
    staleWhileRevalidate: 3600, // 1 hour
    staleIfError: 600, // 10 minutes
    vary: ['Accept-Encoding'],
  },

  // API responses
  api: {
    enabled: true,
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 60, // 1 minute
    staleIfError: 60, // 1 minute
    vary: ['Accept', 'Authorization'],
  },

  // HTML pages
  html: {
    enabled: true,
    maxAge: 0, // No caching
    staleWhileRevalidate: 0,
    staleIfError: 0,
    vary: ['Accept-Encoding'],
  },

  // Cell data
  cells: {
    enabled: true,
    maxAge: 60, // 1 minute
    staleWhileRevalidate: 30, // 30 seconds
    staleIfError: 30, // 30 seconds
    vary: ['Authorization'],
  },
};

// Apply cache headers
export function applyCacheHeaders(
  response: Response,
  config: CacheConfig
): Response {
  if (!config.enabled) {
    return response;
  }

  const headers = new Headers(response.headers);

  // Cache-Control header
  const cacheDirectives = [
    `max-age=${config.maxAge}`,
    `stale-while-revalidate=${config.staleWhileRevalidate}`,
    `stale-if-error=${config.staleIfError}`,
    'public',
  ];

  headers.set('Cache-Control', cacheDirectives.join(', '));

  // Vary header
  if (config.vary.length > 0) {
    headers.set('Vary', config.vary.join(', '));
  }

  // ETag
  const etag = generateETag(response);
  headers.set('ETag', etag);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Generate ETag
function generateETag(response: Response): string {
  const crypto = require('crypto');
  const body = response.body;
  const hash = crypto.createHash('sha256').update(body).digest('base64');
  return `"${hash}"`;
}
```

### Cache Implementation

```typescript
// Cache Manager
export class CacheManager {
  private cache: Cache;
  private config: Record<string, CacheConfig>;

  constructor(cache: Cache, config: Record<string, CacheConfig>) {
    this.cache = cache;
    this.config = config;
  }

  async get(request: Request, type: string): Promise<Response | null> {
    const config = this.config[type];
    if (!config || !config.enabled) {
      return null;
    }

    // Check cache
    const cached = await this.cache.match(request);
    if (cached) {
      return cached;
    }

    return null;
  }

  async set(request: Request, response: Response, type: string): Promise<void> {
    const config = this.config[type];
    if (!config || !config.enabled) {
      return;
    }

    // Apply cache headers
    const cachedResponse = applyCacheHeaders(response, config);

    // Store in cache
    await this.cache.put(request, cachedResponse);
  }
}
```

---

## CDN Configuration

### Cloudflare CDN Configuration

```toml
# wrangler.production.toml - CDN Configuration

# Enable Brotli compression
[build.args]
BROTLI = "true"

# Cache configuration
[env.production.vars]
CDN_ENABLED = "true"
CDN_CACHE_URLS = "/*"
CDN_BYPASS_URLS = "/api/*,/ws/*"

# Cache rules
# 1. Static assets (images, fonts, css, js)
#    - Cache: 1 year
#    - Edge cache: 1 month
#    - Browser cache: 1 year
#
# 2. HTML pages
#    - Cache: 5 minutes
#    - Edge cache: 1 hour
#    - Browser cache: no cache
#
# 3. API responses
#    - Cache: 5 minutes
#    - Edge cache: 5 minutes
#    - Browser cache: no cache
#
# 4. WebSocket connections
#    - Cache: disabled
#    - Edge cache: disabled
#    - Browser cache: disabled
```

### CDN Optimization Features

```typescript
// CDN Optimization Configuration
export const CDN_OPTIMIZATION = {
  // Enable HTTP/2
  http2: true,

  // Enable HTTP/3
  http3: true,

  // Enable 0-RTT connection resumption
  zeroRTT: true,

  // Enable TLS 1.3
  tls13: true,

  // Enable Brotli compression
  brotli: true,

  // Enable Gzip compression (fallback)
  gzip: true,

  // Enable minification
  minify: {
    html: true,
    css: true,
    js: true,
  },

  // Enable image optimization
  imageOptimization: {
    webp: true,
    avif: true,
    quality: 85,
  },

  // Enable code minification
  codeMinification: true,

  // Enable edge caching
  edgeCaching: true,

  // Enable prefetch
  prefetch: true,

  // Enable preconnect
  preconnect: true,
};
```

---

## Code Splitting

### Code Splitting Strategy

```typescript
// Code splitting configuration
export const CODE_SPLITTING_CONFIG = {
  // Split by route
  splitByRoute: true,

  // Split by vendor
  splitByVendor: true,

  // Split by feature
  splitByFeature: true,

  // Define chunks
  chunks: {
    // Core React
    'vendor-react': ['react', 'react-dom', 'react-router-dom'],

    // UI library
    'vendor-univer': ['@univerjs/core', '@univerjs/design', '@univerui/ui'],

    // Utility libraries
    'vendor-utils': ['lodash', 'axios', 'date-fns'],

    // Agent features
    'feature-agent': [
      './components/AgentCore',
      './components/AgentVisualizer',
      './components/TraceViewer',
    ],

    // Formula features
    'feature-formulas': [
      './components/FormulaBar',
      './components/FormulaEditor',
      './components/FormulaParser',
    ],

    // Collaboration features
    'feature-collaboration': [
      './components/CollaborativeEditor',
      './components/UserPresence',
      './components/CommentPanel',
    ],
  },
};
```

### Lazy Loading Implementation

```typescript
// Lazy loading components
import { lazy, Suspense } from 'react';

// Lazy load agent components
const AgentCore = lazy(() => import('./components/AgentCore'));
const AgentVisualizer = lazy(() => import('./components/AgentVisualizer'));
const TraceViewer = lazy(() => import('./components/TraceViewer'));

// Lazy load formula components
const FormulaBar = lazy(() => import('./components/FormulaBar'));
const FormulaEditor = lazy(() => import('./components/FormulaEditor'));

// Lazy load collaboration components
const CollaborativeEditor = lazy(() => import('./components/CollaborativeEditor'));
const UserPresence = lazy(() => import('./components/UserPresence'));

// Usage with Suspense
function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Router>
        <Route path="/agent" component={AgentCore} />
        <Route path="/formulas" component={FormulaBar} />
        <Route path="/collaborate" component={CollaborativeEditor} />
      </Router>
    </Suspense>
  );
}
```

---

## Lazy Loading

### Lazy Loading Strategy

```typescript
// Lazy loading utilities
export class LazyLoader {
  // Lazy load components
  static lazyLoad<T>(
    importFn: () => Promise<T>
  (): () => Promise<T> {
    return () =>
      new Promise((resolve) => {
        // Add small delay to show loading state
        setTimeout(() => {
          resolve(importFn());
        }, 100);
      });
  }

  // Lazy load with timeout
  static lazyLoadWithTimeout<T>(
    importFn: () => Promise<T>,
    timeout: number = 5000
  ): Promise<T> {
    return Promise.race([
      importFn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);
  }

  // Lazy load with retry
  static async lazyLoadWithRetry<T>(
    importFn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    try {
      return await importFn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.lazyLoadWithRetry(importFn, retries - 1, delay);
    }
  }
}
```

### Image Lazy Loading

```typescript
// Image lazy loading component
import { useRef, useEffect, useState } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export function LazyImage({
  src,
  alt,
  className,
  loading = 'lazy',
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsLoaded(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={isLoaded ? src : undefined}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setError('Failed to load image')}
      style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
    />
  );
}
```

---

## Asset Optimization

### Image Optimization

```typescript
// Image optimization configuration
export const IMAGE_OPTIMIZATION_CONFIG = {
  // Enable WebP format
  webp: true,

  // Enable AVIF format
  avif: true,

  // Image quality
  quality: 85,

  // Enable responsive images
  responsive: true,

  // Image sizes
  sizes: [320, 640, 960, 1280, 1920],

  // Enable lazy loading
  lazy: true,

  // Enable progressive loading
  progressive: true,
};

// Image optimizer utility
export class ImageOptimizer {
  static optimizeImage(
    src: string,
    options: Partial<typeof IMAGE_OPTIMIZATION_CONFIG> = {}
  ): string {
    const config = { ...IMAGE_OPTIMIZATION_CONFIG, ...options };

    // Add query parameters for Cloudflare Image Resizing
    const params = new URLSearchParams({
      format: config.avif ? 'avif' : 'webp',
      quality: config.quality.toString(),
    });

    return `${src}?${params.toString()}`;
  }

  static generateSrcSet(src: string, sizes: number[]): string {
    return sizes
      .map((size) => `${this.optimizeImage(src, { sizes: [size] })} ${size}w`)
      .join(', ');
  }
}
```

### Font Optimization

```typescript
// Font optimization configuration
export const FONT_OPTIMIZATION_CONFIG = {
  // Enable font subsetting
  subsetting: true,

  // Enable font display swap
  displaySwap: true,

  // Enable preconnect
  preconnect: true,

  // Enable preload
  preload: true,
};

// Font optimization utilities
export class FontOptimizer {
  static generateFontFace(
    family: string,
    src: string,
    weight: string = 'normal',
    style: string = 'normal'
  ): string {
    return `
      @font-face {
        font-family: '${family}';
        src: url('${src}') format('woff2');
        font-weight: ${weight};
        font-style: ${style};
        font-display: swap;
      }
    `;
  }
}
```

---

## API Optimization

### Request Batching

```typescript
// Request batching utility
export class RequestBatcher {
  private batch: Map<string, any[]> = new Map();
  private timeout: NodeJS.Timeout | null = null;

  constructor(private delay: number = 100) {}

  async batch<T>(key: string, request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      // Add to batch
      if (!this.batch.has(key)) {
        this.batch.set(key, []);
      }
      this.batch.get(key)!.push({ resolve, reject, request });

      // Reset timeout
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.timeout = setTimeout(() => this.flush(), this.delay);
    });
  }

  private async flush(): Promise<void> {
    const batch = new Map(this.batch);
    this.batch.clear();

    for (const [key, requests] of batch) {
      try {
        // Execute all requests in parallel
        const responses = await Promise.all(
          requests.map(({ request }) => request())
        );

        // Resolve all promises
        requests.forEach(({ resolve }, index) => {
          resolve(responses[index]);
        });
      } catch (error) {
        // Reject all promises
        requests.forEach(({ reject }) => {
          reject(error);
        });
      }
    }
  }
}
```

### Request Debouncing

```typescript
// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
```

---

## Database Optimization

### Query Optimization

```typescript
// Database query optimizer
export class QueryOptimizer {
  // Cache query results
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  async executeQuery<T>(
    key: string,
    query: () => Promise<T>,
    ttl: number = 60000 // 1 minute
  ): Promise<T> {
    // Check cache
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }

    // Execute query
    const data = await query();

    // Cache result
    this.cache.set(key, { data, timestamp: Date.now() });

    return data;
  }

  // Clear cache
  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
```

---

## Performance Budgets

### Performance Budget Configuration

```json
{
  "budgets": [
    {
      "type": "initial",
      "maxSize": "200KB",
      "compression": "brotli"
    },
    {
      "type": "script",
      "maxSize": "100KB",
      "compression": "brotli"
    },
    {
      "type": "stylesheet",
      "maxSize": "20KB",
      "compression": "brotli"
    },
    {
      "type": "image",
      "maxSize": "500KB",
      "compression": "auto"
    },
    {
      "type": "total",
      "maxSize": "500KB",
      "compression": "brotli"
    }
  ]
}
```

### Performance Budget Validation

```typescript
// Performance budget validator
export class PerformanceBudgetValidator {
  private budgets: any[];

  constructor(budgetsFile: string) {
    this.budgets = JSON.parse(require('fs').readFileSync(budgetsFile, 'utf8'));
  }

  validate(buildStats: any): {
    passed: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    for (const budget of this.budgets) {
      const actual = this.getSize(buildStats, budget.type);
      const maxSize = this.parseSize(budget.maxSize);

      if (actual > maxSize) {
        violations.push(
          `${budget.type} size (${this.formatSize(actual)}) exceeds budget (${budget.maxSize})`
        );
      }
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  private getSize(buildStats: any, type: string): number {
    // Extract size from build stats based on type
    // This is a simplified example
    return buildStats.sizes[type] || 0;
  }

  private parseSize(size: string): number {
    const match = size.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)?$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();

    switch (unit) {
      case 'KB':
        return value * 1024;
      case 'MB':
        return value * 1024 * 1024;
      case 'GB':
        return value * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
```

---

**Performance Optimization Version:** 1.0.0
**Last Updated:** 2026-03-16
**Next Review:** 2026-06-16
