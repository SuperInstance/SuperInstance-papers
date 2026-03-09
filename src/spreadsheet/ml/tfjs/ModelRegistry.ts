/**
 * ModelRegistry.ts - Model management and versioning system
 *
 * Manages trained models with version control, metadata tracking,
 * lazy loading, and memory optimization.
 */

import * as tf from '@tensorflow/tfjs';
import { TrendModel } from './TrendModel';
import { AnomalyModel } from './AnomalyModel';
import { ClusteringModel } from './ClusteringModel';

export interface ModelMetadata {
  id: string;
  type: 'trend' | 'anomaly' | 'clustering';
  version: string;
  config: any;
  trainingDate: number;
  lastUsed: number;
  accuracy?: number;
  loss?: number;
  dataSize: number;
  tags: string[];
  description?: string;
}

export interface ModelVersion {
  version: string;
  modelId: string;
  created: number;
  metadata: ModelMetadata;
  isLoaded: boolean;
}

export class ModelRegistry {
  private db: IDBDatabase | null = null;
  private loadedModels: Map<string, any> = new Map();
  private modelVersions: Map<string, ModelVersion[]> = new Map();
  private maxLoadedModels: number = 5;
  private memoryThreshold: number = 100 * 1024 * 1024; // 100MB

  constructor() {
    this.initializeDB();
    this.setupMemoryMonitoring();
  }

  /**
   * Initialize IndexedDB for model storage
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ModelRegistryDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for model metadata
        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', { keyPath: 'id' });
          metadataStore.createIndex('type', 'type', { unique: false });
          metadataStore.createIndex('version', 'version', { unique: false });
          metadataStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }

        // Store for model versions
        if (!db.objectStoreNames.contains('versions')) {
          const versionsStore = db.createObjectStore('versions', { keyPath: 'modelId' });
          versionsStore.createIndex('created', 'created', { unique: false });
        }
      };
    });
  }

  /**
   * Register a trained model
   */
  async registerModel(
    modelId: string,
    type: 'trend' | 'anomaly' | 'clustering',
    model: any,
    metadata: Partial<ModelMetadata>
  ): Promise<void> {
    const fullMetadata: ModelMetadata = {
      id: modelId,
      type,
      version: metadata.version || '1.0.0',
      config: metadata.config || {},
      trainingDate: metadata.trainingDate || Date.now(),
      lastUsed: Date.now(),
      accuracy: metadata.accuracy,
      loss: metadata.loss,
      dataSize: metadata.dataSize || 0,
      tags: metadata.tags || [],
      description: metadata.description
    };

    // Save to IndexedDB
    const transaction = this.db!.transaction(['metadata', 'versions'], 'readwrite');
    const metadataStore = transaction.objectStore('metadata');
    metadataStore.put(fullMetadata);

    // Add version entry
    const versionEntry: ModelVersion = {
      version: fullMetadata.version,
      modelId,
      created: fullMetadata.trainingDate,
      metadata: fullMetadata,
      isLoaded: true
    };

    const versionsStore = transaction.objectStore('versions');
    versionsStore.put(versionEntry);

    // Track in memory
    if (!this.modelVersions.has(modelId)) {
      this.modelVersions.set(modelId, []);
    }
    this.modelVersions.get(modelId)!.push(versionEntry);

    // Keep model in memory
    this.loadedModels.set(modelId, model);
    await this.enforceMemoryLimits();
  }

  /**
   * Get model by ID with lazy loading
   */
  async getModel(modelId: string): Promise<any | null> {
    // Check if already loaded
    if (this.loadedModels.has(modelId)) {
      const model = this.loadedModels.get(modelId);
      await this.updateLastUsed(modelId);
      return model;
    }

    // Load from storage
    const metadata = await this.getMetadata(modelId);
    if (!metadata) {
      return null;
    }

    let model: any;
    switch (metadata.type) {
      case 'trend':
        model = new TrendModel(metadata.config);
        await model.loadModel(modelId);
        break;
      case 'anomaly':
        model = new AnomalyModel(metadata.config);
        // Load model implementation
        break;
      case 'clustering':
        model = new ClusteringModel(metadata.config);
        // Load model implementation
        break;
      default:
        return null;
    }

    // Cache in memory
    this.loadedModels.set(modelId, model);
    await this.updateLastUsed(modelId);
    await this.enforceMemoryLimits();

    return model;
  }

  /**
   * Get model metadata
   */
  async getMetadata(modelId: string): Promise<ModelMetadata | null> {
    const transaction = this.db!.transaction(['metadata'], 'readonly');
    const store = transaction.objectStore('metadata');
    const request = store.get(modelId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(modelId: string): Promise<void> {
    const metadata = await this.getMetadata(modelId);
    if (metadata) {
      metadata.lastUsed = Date.now();
      const transaction = this.db!.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      store.put(metadata);
    }
  }

  /**
   * List all models
   */
  async listModels(filters?: {
    type?: 'trend' | 'anomaly' | 'clustering';
    tags?: string[];
    minAccuracy?: number;
  }): Promise<ModelMetadata[]> {
    const transaction = this.db!.transaction(['metadata'], 'readonly');
    const store = transaction.objectStore('metadata');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        let models = request.result;

        // Apply filters
        if (filters) {
          if (filters.type) {
            models = models.filter((m: ModelMetadata) => m.type === filters.type);
          }
          if (filters.tags && filters.tags.length > 0) {
            models = models.filter((m: ModelMetadata) =>
              filters.tags!.some(tag => m.tags.includes(tag))
            );
          }
          if (filters.minAccuracy !== undefined) {
            models = models.filter((m: ModelMetadata) =>
              m.accuracy !== undefined && m.accuracy >= filters.minAccuracy!
            );
          }
        }

        // Sort by last used
        models.sort((a: ModelMetadata, b: ModelMetadata) => b.lastUsed - a.lastUsed);

        resolve(models);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * List model versions
   */
  async listVersions(modelId: string): Promise<ModelVersion[]> {
    if (this.modelVersions.has(modelId)) {
      return this.modelVersions.get(modelId)!;
    }

    const transaction = this.db!.transaction(['versions'], 'readonly');
    const store = transaction.objectStore('versions');
    const index = store.index('modelId');
    const request = index.getAll(modelId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const versions = request.result;
        this.modelVersions.set(modelId, versions);
        resolve(versions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Create new version of model
   */
  async createVersion(
    baseModelId: string,
    newModelId: string,
    model: any,
    changes: Partial<ModelMetadata>
  ): Promise<void> {
    const baseMetadata = await this.getMetadata(baseModelId);
    if (!baseMetadata) {
      throw new Error('Base model not found');
    }

    // Increment version
    const versionParts = baseMetadata.version.split('.');
    versionParts[2] = String(parseInt(versionParts[2]) + 1);
    const newVersion = versionParts.join('.');

    const newMetadata: ModelMetadata = {
      ...baseMetadata,
      id: newModelId,
      version: newVersion,
      trainingDate: Date.now(),
      lastUsed: Date.now(),
      ...changes
    };

    await this.registerModel(newModelId, baseMetadata.type, model, newMetadata);
  }

  /**
   * Delete model
   */
  async deleteModel(modelId: string): Promise<void> {
    // Remove from memory
    const model = this.loadedModels.get(modelId);
    if (model && model.dispose) {
      model.dispose();
    }
    this.loadedModels.delete(modelId);

    // Remove from IndexedDB
    const transaction = this.db!.transaction(['metadata', 'versions'], 'readwrite');
    transaction.objectStore('metadata').delete(modelId);
    transaction.objectStore('versions').delete(modelId);

    // Remove from version tracking
    this.modelVersions.delete(modelId);
  }

  /**
   * Enforce memory limits
   */
  private async enforceMemoryLimits(): Promise<void> {
    // Check if we need to unload models
    while (this.loadedModels.size > this.maxLoadedModels) {
      // Find least recently used model
      let oldestModelId: string | null = null;
      let oldestTime = Infinity;

      for (const [modelId, model] of this.loadedModels) {
        const metadata = await this.getMetadata(modelId);
        if (metadata && metadata.lastUsed < oldestTime) {
          oldestTime = metadata.lastUsed;
          oldestModelId = modelId;
        }
      }

      // Unload oldest model
      if (oldestModelId) {
        await this.unloadModel(oldestModelId);
      }
    }

    // Check memory usage
    const memoryUsage = await this.getMemoryUsage();
    if (memoryUsage > this.memoryThreshold) {
      // Unload models until memory is under threshold
      while (memoryUsage > this.memoryThreshold * 0.8 && this.loadedModels.size > 1) {
        const oldestModelId = this.findLeastRecentlyUsed();
        if (oldestModelId) {
          await this.unloadModel(oldestModelId);
        } else {
          break;
        }
      }
    }
  }

  /**
   * Unload model from memory
   */
  private async unloadModel(modelId: string): Promise<void> {
    const model = this.loadedModels.get(modelId);
    if (model && model.dispose) {
      model.dispose();
    }
    this.loadedModels.delete(modelId);

    // Update version tracking
    const versions = this.modelVersions.get(modelId);
    if (versions) {
      versions.forEach(v => v.isLoaded = false);
    }
  }

  /**
   * Find least recently used model
   */
  private async findLeastRecentlyUsed(): string | null {
    let oldestModelId: string | null = null;
    let oldestTime = Infinity;

    for (const modelId of this.loadedModels.keys()) {
      const metadata = await this.getMetadata(modelId);
      if (metadata && metadata.lastUsed < oldestTime) {
        oldestTime = metadata.lastUsed;
        oldestModelId = modelId;
      }
    }

    return oldestModelId;
  }

  /**
   * Get current memory usage
   */
  private async getMemoryUsage(): Promise<number> {
    // Estimate memory usage
    let usage = 0;
    for (const [modelId, model] of this.loadedModels) {
      // Rough estimate based on model size
      const metadata = await this.getMetadata(modelId);
      if (metadata) {
        usage += metadata.dataSize;
      }
    }
    return usage;
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    // Monitor memory usage periodically
    setInterval(async () => {
      await this.enforceMemoryLimits();
    }, 60000); // Check every minute
  }

  /**
   * Search models by tags
   */
  async searchByTags(tags: string[]): Promise<ModelMetadata[]> {
    return this.listModels({ tags });
  }

  /**
   * Get best model by type and accuracy
   */
  async getBestModel(type: 'trend' | 'anomaly' | 'clustering'): Promise<ModelMetadata | null> {
    const models = await this.listModels({ type });
    if (models.length === 0) return null;

    // Sort by accuracy
    models.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
    return models[0];
  }

  /**
   * Export model metadata
   */
  async exportMetadata(modelId: string): Promise<string> {
    const metadata = await this.getMetadata(modelId);
    const versions = await this.listVersions(modelId);

    return JSON.stringify({
      metadata,
      versions
    }, null, 2);
  }

  /**
   * Import model metadata
   */
  async importMetadata(data: string): Promise<void> {
    const { metadata, versions } = JSON.parse(data);

    const transaction = this.db!.transaction(['metadata', 'versions'], 'readwrite');
    transaction.objectStore('metadata').put(metadata);
    versions.forEach((v: ModelVersion) => {
      transaction.objectStore('versions').put(v);
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Dispose all loaded models
    for (const [modelId, model] of this.loadedModels) {
      if (model.dispose) {
        model.dispose();
      }
    }
    this.loadedModels.clear();
    this.modelVersions.clear();
  }
}
