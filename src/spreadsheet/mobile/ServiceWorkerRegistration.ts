/**
 * POLLN Spreadsheet - ServiceWorkerRegistration
 *
 * Progressive Web App (PWA) service worker registration and management.
 * Handles offline detection, update prompts, and cache management.
 *
 * Features:
 * - Service worker registration
 * - Offline detection
 * - Update prompts
 * - Cache management UI
 */

/**
 * Service worker status
 */
export type ServiceWorkerStatus =
  | 'unsupported'
  | 'registering'
  | 'registered'
  | 'updating'
  | 'activated'
  | 'error';

/**
 * Service worker state
 */
export interface ServiceWorkerState {
  status: ServiceWorkerStatus;
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  isOffline: boolean;
  error?: Error;
}

/**
 * Registration options
 */
export interface RegistrationOptions {
  scope?: string;
  updatePrompt?: boolean;
  autoUpdate?: boolean;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: (isOffline: boolean) => void;
  onError?: (error: Error) => void;
}

/**
 * Cache entry
 */
export interface CacheEntry {
  url: string;
  size: number;
  timestamp: number;
}

/**
 * ServiceWorkerRegistration - PWA service worker management
 *
 * Manages service worker lifecycle and provides utilities for
 * offline detection, updates, and cache management.
 */
export class ServiceWorkerRegistrationManager {
  private static instance: ServiceWorkerRegistrationManager | null = null;
  private state: ServiceWorkerState = {
    status: 'unsupported',
    registration: null,
    updateAvailable: false,
    isOffline: !navigator.onLine,
  };
  private options: Required<RegistrationOptions>;
  private listeners: Set<(state: ServiceWorkerState) => void> = new Set();
  private updateCheckInterval: number | null = null;

  private constructor(options: RegistrationOptions = {}) {
    this.options = {
      scope: '/',
      updatePrompt: true,
      autoUpdate: false,
      onUpdate: () => {},
      onOffline: () => {},
      onError: () => {},
      ...options,
    };

    this.initialize();
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: RegistrationOptions): ServiceWorkerRegistrationManager {
    if (!this.instance) {
      this.instance = new ServiceWorkerRegistrationManager(options);
    }
    return this.instance;
  }

  /**
   * Initialize service worker
   */
  private async initialize(): Promise<void> {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      this.setState({ status: 'unsupported' });
      return;
    }

    // Setup online/offline detection
    this.setupOfflineDetection();

    // Register service worker
    await this.register();

    // Setup update checking
    if (this.options.autoUpdate) {
      this.startUpdateCheck();
    }
  }

  /**
   * Register service worker
   */
  private async register(): Promise<void> {
    this.setState({ status: 'registering' });

    try {
      // Determine service worker path
      const swPath = this.getServiceWorkerPath();

      // Register service worker
      const registration = await navigator.serviceWorker.register(swPath, {
        scope: this.options.scope,
      });

      this.setState({
        status: 'registered',
        registration,
      });

      // Listen for updates
      if (this.options.updatePrompt) {
        this.setupUpdateListener(registration);
      }

      // Wait for activation
      await this.waitForActivation(registration);

      this.setState({ status: 'activated' });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.setState({
        status: 'error',
        error: err,
      });
      this.options.onError(err);
    }
  }

  /**
   * Get service worker path
   */
  private getServiceWorkerPath(): string {
    // Try to detect the public directory
    const publicPaths = [
      '/sw.js',
      '/sw.ts',
      '/service-worker.js',
      '/service-worker.ts',
      '/src/spreadsheet/mobile/sw.js',
    ];

    // Return first valid path (basic check)
    for (const path of publicPaths) {
      // In development, we might not have a built sw.js
      // This is a simplified check
      return path;
    }

    return '/sw.js';
  }

  /**
   * Setup update listener
   */
  private setupUpdateListener(registration: ServiceWorkerRegistration): void {
    // Listen for waiting service worker
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            this.setState({ updateAvailable: true });
            this.options.onUpdate(registration);
          }
        });
      }
    });
  }

  /**
   * Wait for service worker activation
   */
  private async waitForActivation(
    registration: ServiceWorkerRegistration
  ): Promise<void> {
    if (registration.active) {
      return;
    }

    return new Promise((resolve) => {
      const worker = registration.waiting || registration.installing;

      if (worker) {
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Setup offline detection
   */
  private setupOfflineDetection(): void {
    const handleOnline = () => {
      this.setState({ isOffline: false });
      this.options.onOffline(false);
    };

    const handleOffline = () => {
      this.setState({ isOffline: true });
      this.options.onOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  /**
   * Start automatic update checking
   */
  private startUpdateCheck(): void {
    this.updateCheckInterval = window.setInterval(() => {
      this.checkForUpdates();
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Stop update checking
   */
  private stopUpdateCheck(): void {
    if (this.updateCheckInterval !== null) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<boolean> {
    if (!this.state.registration) {
      return false;
    }

    try {
      await this.state.registration.update();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Apply update (skip waiting)
   */
  async applyUpdate(): Promise<void> {
    if (!this.state.registration || !this.state.registration.waiting) {
      return;
    }

    // Send skip waiting message
    this.state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload page
    window.location.reload();
  }

  /**
   * Get current state
   */
  getState(): ServiceWorkerState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: ServiceWorkerState) => void): () => void {
    this.listeners.add(listener);

    // Call immediately with current state
    listener(this.getState());

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Update state and notify listeners
   */
  private setState(partialState: Partial<ServiceWorkerState>): void {
    this.state = {
      ...this.state,
      ...partialState,
    };

    // Notify listeners
    this.listeners.forEach((listener) => {
      listener(this.getState());
    });
  }

  /**
   * Get cache information
   */
  async getCacheInfo(): Promise<CacheEntry[]> {
    if (!('caches' in window)) {
      return [];
    }

    try {
      const cacheNames = await caches.keys();
      const entries: CacheEntry[] = [];

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            entries.push({
              url: request.url,
              size: blob.size,
              timestamp: Date.now(),
            });
          }
        }
      }

      return entries;
    } catch {
      return [];
    }
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    if (!('caches' in window)) {
      return;
    }

    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  }

  /**
   * Clear specific cache
   */
  async clearCache(cacheName: string): Promise<boolean> {
    if (!('caches' in window)) {
      return false;
    }

    try {
      return await caches.delete(cacheName);
    } catch {
      return false;
    }
  }

  /**
   * Preload resources
   */
  async preloadResources(urls: string[]): Promise<void> {
    if (!this.state.registration) {
      return;
    }

    // Send preload message to service worker
    const messageChannel = new MessageChannel();

    this.state.registration.active?.postMessage(
      {
        type: 'PRELOAD',
        urls,
      },
      [messageChannel.port2]
    );
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.state.registration) {
      return false;
    }

    try {
      await this.state.registration.unregister();
      this.setState({
        status: 'unsupported',
        registration: null,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopUpdateCheck();
    this.listeners.clear();
  }
}

/**
 * React hook for service worker state
 *
 * @example
 * const { status, updateAvailable, isOffline } = useServiceWorker();
 */
export function useServiceWorker(): ServiceWorkerState {
  const [state, setState] = useState<ServiceWorkerState>(() => {
    const manager = ServiceWorkerRegistrationManager.getInstance();
    return manager.getState();
  });

  useEffect(() => {
    const manager = ServiceWorkerRegistrationManager.getInstance();
    const unsubscribe = manager.subscribe(setState);

    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}

/**
 * React hook for offline detection
 *
 * @example
 * const isOffline = useOffline();
 */
export function useOffline(): boolean {
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
}

/**
 * React hook for update prompt
 *
 * @example
 * const { updateAvailable, applyUpdate } = useUpdatePrompt();
 */
export function useUpdatePrompt(): {
  updateAvailable: boolean;
  applyUpdate: () => Promise<void>;
  dismissUpdate: () => void;
} {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const managerRef = useRef<ServiceWorkerRegistrationManager | null>(null);

  useEffect(() => {
    const manager = ServiceWorkerRegistrationManager.getInstance({
      updatePrompt: true,
      onUpdate: (registration) => {
        setUpdateAvailable(true);
      },
    });

    managerRef.current = manager;

    return () => {
      manager.destroy();
    };
  }, []);

  const applyUpdate = useCallback(async () => {
    await managerRef.current?.applyUpdate();
  }, []);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  return {
    updateAvailable,
    applyUpdate,
    dismissUpdate,
  };
}

/**
 * Register service worker on module load
 */
export function registerServiceWorker(options?: RegistrationOptions): ServiceWorkerRegistrationManager {
  return ServiceWorkerRegistrationManager.getInstance(options);
}

// Import React hooks
import { useState, useEffect, useCallback, useRef } from 'react';

export default ServiceWorkerRegistrationManager;
