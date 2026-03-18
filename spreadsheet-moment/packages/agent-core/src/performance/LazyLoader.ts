/**
 * Lazy Loader
 *
 * Utilities for lazy loading components and resources
 */

import React from 'react';

/**
 * Lazy load a component
 */
export function lazyLoad<T extends { default: React.ComponentType<any> }>(
  loader: () => Promise<T>,
  fallback?: React.ComponentType
): React.LazyExoticComponent<React.ComponentType<any>> {
  return React.lazy(() => loader() as Promise<{ default: React.ComponentType<any> }>);
}

/**
 * Create a lazy loading wrapper with timeout
 */
export function createLazyLoaderWithTimeout<T>(
  loader: () => Promise<T>,
  timeout: number
): () => Promise<T> {
  return () => {
    return Promise.race([
      loader(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Lazy loading timed out after ${timeout}ms`)), timeout)
      )
    ]);
  };
}

/**
 * Preload a resource
 */
export function preloadResource(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;

    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to preload ${url}`));

    document.head.appendChild(link);
  });
}

/**
 * Preload an image
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
  });
}

/**
 * Lazy load images with Intersection Observer
 */
export function lazyLoadImages(
  selector: string = 'img[data-src]',
  options?: IntersectionObserverInit
): void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    // Fallback: load all images immediately
    const images = document.querySelectorAll(selector);
    images.forEach(img => {
      const element = img as HTMLImageElement;
      const src = element.getAttribute('data-src');
      if (src) {
        element.src = src;
        element.removeAttribute('data-src');
      }
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.getAttribute('data-src');
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }
    });
  }, options);

  const images = document.querySelectorAll(selector);
  images.forEach(img => observer.observe(img));
}

/**
 * Create a bundle loader
 */
export function createBundleLoader(bundles: Record<string, () => Promise<any>>) {
  const loadedBundles = new Set<string>();

  return {
    /**
     * Load a bundle by name
     */
    load: async (name: string): Promise<any> => {
      if (loadedBundles.has(name)) {
        return Promise.resolve();
      }

      const loader = bundles[name];
      if (!loader) {
        throw new Error(`Bundle "${name}" not found`);
      }

      await loader();
      loadedBundles.add(name);
    },

    /**
     * Preload multiple bundles
     */
    preloadMultiple: async function(names: string[]): Promise<void> {
      const self = this;
      await Promise.all(names.map(name => self.load(name)));
    },

    /**
     * Check if a bundle is loaded
     */
    isLoaded: (name: string): boolean => {
      return loadedBundles.has(name);
    }
  };
}
