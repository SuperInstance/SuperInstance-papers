/**
 * EnvironmentProvider - Environment variable based secret storage
 *
 * Simple provider for development and testing.
 * Not recommended for production use.
 */

import { SecretProvider, SecretValue, EnvironmentProviderConfig } from './types';

export class EnvironmentProvider implements SecretProvider {
  name = 'environment';
  type = 'environment' as const;
  private config: EnvironmentProviderConfig;
  private ready = false;

  constructor(config: EnvironmentProviderConfig = {}) {
    this.config = {
      enabled: true,
      priority: 999,
      prefix: 'SECRET_',
      allowedKeys: [],
      blockedKeys: ['password', 'secret', 'token', 'key'],
      ...config
    };
  }

  async initialize(): Promise<void> {
    // Validate configuration
    if (this.config.prefix && !/^[A-Z_]+$/.test(this.config.prefix)) {
      throw new Error('Environment prefix must be uppercase letters and underscores only');
    }

    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  onReady(callback: () => void): void {
    if (this.ready) {
      callback();
    } else {
      // For environment provider, we're ready immediately
      setImmediate(callback);
    }
  }

  async getSecret(key: string): Promise<SecretValue> {
    this.ensureReady();

    const envKey = this.getEnvKey(key);
    const value = process.env[envKey];

    if (!value) {
      throw new Error(`Secret not found: ${key}`);
    }

    return {
      value,
      version: 1,
      createdAt: new Date(),
      metadata: {
        provider: 'environment',
        envKey
      }
    };
  }

  async setSecret(key: string, secret: SecretValue): Promise<void> {
    this.ensureReady();
    throw new Error('Cannot set secrets in environment provider (read-only)');
  }

  async deleteSecret(key: string): Promise<void> {
    this.ensureReady();
    throw new Error('Cannot delete secrets in environment provider (read-only)');
  }

  async listSecrets(): Promise<string[]> {
    this.ensureReady();

    const prefix = this.config.prefix ?? '';
    const keys: string[] = [];

    for (const [envKey, value] of Object.entries(process.env)) {
      if (envKey.startsWith(prefix) && value) {
        // Remove prefix to get secret key
        const key = envKey.substring(prefix.length);
        if (this.isKeyAllowed(key)) {
          keys.push(key);
        }
      }
    }

    return keys;
  }

  async hasSecret(key: string): Promise<boolean> {
    this.ensureReady();

    const envKey = this.getEnvKey(key);
    return process.env[envKey] !== undefined;
  }

  async getSecretMetadata(key: string): Promise<Record<string, unknown>> {
    this.ensureReady();

    const envKey = this.getEnvKey(key);
    const exists = process.env[envKey] !== undefined;

    return {
      exists,
      provider: 'environment',
      envKey,
      readonly: true
    };
  }

  async close(): Promise<void> {
    this.ready = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.ready;
  }

  private ensureReady(): void {
    if (!this.ready) {
      throw new Error('EnvironmentProvider not initialized');
    }
  }

  private getEnvKey(key: string): string {
    const prefix = this.config.prefix ?? '';
    return `${prefix}${key}`;
  }

  private isKeyAllowed(key: string): boolean {
    const lowerKey = key.toLowerCase();

    // Check blocked keys
    if (this.config.blockedKeys) {
      for (const blocked of this.config.blockedKeys) {
        if (lowerKey.includes(blocked.toLowerCase())) {
          return false;
        }
      }
    }

    // Check allowed keys (if specified)
    if (this.config.allowedKeys && this.config.allowedKeys.length > 0) {
      return this.config.allowedKeys.includes(key);
    }

    return true;
  }
}
