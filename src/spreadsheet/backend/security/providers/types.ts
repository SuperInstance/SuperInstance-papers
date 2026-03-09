/**
 * Provider type definitions for secret management
 */

import { SecretValue } from '../SecretManager';

export interface SecretProvider {
  name: string;
  type: 'environment' | 'vault' | 'aws' | 'azure' | 'gcp';

  /**
   * Initialize the provider
   */
  initialize(): Promise<void>;

  /**
   * Check if provider is ready
   */
  isReady(): boolean;

  /**
   * Optional callback when provider is ready
   */
  onReady?(callback: () => void): void;

  /**
   * Get a secret value
   */
  getSecret(key: string): Promise<SecretValue>;

  /**
   * Set a secret value
   */
  setSecret(key: string, value: SecretValue): Promise<void>;

  /**
   * Delete a secret
   */
  deleteSecret(key: string): Promise<void>;

  /**
   * List all secret keys
   */
  listSecrets(): Promise<string[]>;

  /**
   * Check if secret exists
   */
  hasSecret(key: string): Promise<boolean>;

  /**
   * Get secret metadata
   */
  getSecretMetadata(key: string): Promise<Record<string, unknown>>;

  /**
   * Close provider connection
   */
  close?(): Promise<void>;

  /**
   * Health check
   */
  healthCheck?(): Promise<boolean>;
}

export interface ProviderConfig {
  enabled: boolean;
  priority: number;
  fallback?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface EnvironmentProviderConfig extends ProviderConfig {
  prefix?: string;
  allowedKeys?: string[];
  blockedKeys?: string[];
}

export interface VaultProviderConfig extends ProviderConfig {
  address: string;
  token?: string;
  roleId?: string;
  secretId?: string;
  namespace?: string;
  mount?: string;
  timeout?: number;
}

export interface AWSSecretsProviderConfig extends ProviderConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  prefix?: string;
  endpoint?: string;
}

export interface AzureKeyVaultProviderConfig extends ProviderConfig {
  vaultName: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  managedIdentityClientId?: string;
}

export interface GCPSecretManagerProviderConfig extends ProviderConfig {
  projectId: string;
  keyFilename?: string;
  credentials?: Record<string, unknown>;
  prefix?: string;
}
