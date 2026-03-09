/**
 * AzureKeyVaultProvider - Azure Key Vault integration
 *
 * Production-grade secret storage with automatic encryption and rotation.
 */

import { SecretProvider, SecretValue, AzureKeyVaultProviderConfig } from './types';

interface AzureSecret {
  value: string;
  contentType?: string;
  id: string;
  attributes: {
    enabled: boolean;
    created: number;
    updated: number;
    recoveryLevel: string;
    recoverableDays?: number;
  };
  kid?: string;
  managed?: boolean;
}

interface AzureSecretListResponse {
  value: Array<{
    id: string;
    attributes: {
      enabled: boolean;
      created: number;
      updated: number;
    };
  }>;
  nextLink?: string;
}

export class AzureKeyVaultProvider implements SecretProvider {
  name = 'azure-keyvault';
  type = 'azure' as const;
  private config: AzureKeyVaultProviderConfig;
  private ready = false;
  private credential?: any;

  constructor(config: AzureKeyVaultProviderConfig) {
    if (!config.vaultName) {
      throw new Error('Azure Key Vault name is required');
    }

    this.config = {
      enabled: true,
      priority: 100,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      // Import Azure SDK
      const {
        DefaultAzureCredential,
        ClientSecretCredential,
        ManagedIdentityCredential
      } = await import('@azure/identity');

      // Create credential
      if (this.config.clientId && this.config.clientSecret && this.config.tenantId) {
        // Use client secret
        this.credential = new ClientSecretCredential(
          this.config.tenantId,
          this.config.clientId,
          this.config.clientSecret
        );
      } else if (this.config.managedIdentityClientId) {
        // Use managed identity
        this.credential = new ManagedIdentityCredential({
          clientId: this.config.managedIdentityClientId
        });
      } else {
        // Use default credential (tries multiple sources)
        this.credential = new DefaultAzureCredential();
      }

      // Verify connection
      await this.healthCheck();

      this.ready = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to initialize AzureKeyVaultProvider: ${message}`);
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  onReady(callback: () => void): void {
    if (this.ready) {
      callback();
    } else {
      setImmediate(callback);
    }
  }

  async getSecret(key: string): Promise<SecretValue> {
    this.ensureReady();

    try {
      const { SecretClient } = await import('@azure/keyvault-secrets');
      const client = this.createClient();

      const response = await this.executeWithRetry(
        async () => await client.getSecret(key)
      );

      return {
        value: response.value,
        version: this.extractVersion(response.properties?.version),
        createdAt: response.properties?.createdOn
          ? new Date(response.properties.createdOn)
          : new Date(),
        metadata: {
          provider: 'azure-keyvault',
          id: response.id,
          contentType: response.properties?.contentType,
          managed: response.properties?.managed,
          recoveryLevel: response.properties?.recoveryLevel
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get secret from Azure Key Vault: ${message}`);
    }
  }

  async setSecret(key: string, secret: SecretValue): Promise<void> {
    this.ensureReady();

    try {
      const { SecretClient } = await import('@azure/keyvault-secrets');
      const client = this.createClient();

      const options: Record<string, unknown> = {
        contentType: secret.metadata?.contentType as string ?? 'application/json'
      };

      // Add tags if present
      if (secret.metadata?.tags) {
        options.tags = secret.metadata.tags as Record<string, string>;
      }

      await this.executeWithRetry(
        async () => await client.setSecret(key, secret.value, options)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to set secret in Azure Key Vault: ${message}`);
    }
  }

  async deleteSecret(key: string): Promise<void> {
    this.ensureReady();

    try {
      const { SecretClient } = await import('@azure/keyvault-secrets');
      const client = this.createClient();

      await this.executeWithRetry(
        async () => await client.beginDeleteSecret(key)
      );

      // Purge the secret to permanently delete it
      await this.executeWithRetry(
        async () => await client.purgeDeletedSecret(key)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to delete secret from Azure Key Vault: ${message}`);
    }
  }

  async listSecrets(): Promise<string[]> {
    this.ensureReady();

    try {
      const { SecretClient } = await import('@azure/keyvault-secrets');
      const client = this.createClient();

      const secrets: string[] = [];
      for await (const secretProperties of client.listPropertiesOfSecrets()) {
        if (secretProperties.name) {
          secrets.push(secretProperties.name);
        }
      }

      return secrets;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to list secrets from Azure Key Vault: ${message}`);
    }
  }

  async hasSecret(key: string): Promise<boolean> {
    this.ensureReady();

    try {
      await this.getSecret(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getSecretMetadata(key: string): Promise<Record<string, unknown>> {
    this.ensureReady();

    try {
      const { SecretClient } = await import('@azure/keyvault-secrets');
      const client = this.createClient();

      const response = await this.executeWithRetry(
        async () => await client.getSecret(key)
      );

      return {
        exists: true,
        provider: 'azure-keyvault',
        id: response.id,
        version: this.extractVersion(response.properties?.version),
        contentType: response.properties?.contentType,
        managed: response.properties?.managed,
        enabled: response.properties?.enabled,
        createdOn: response.properties?.createdOn,
        updatedOn: response.properties?.updatedOn,
        recoverableDays: response.properties?.recoverableDays,
        recoveryLevel: response.properties?.recoveryLevel
      };
    } catch (error) {
      return {
        exists: false,
        provider: 'azure-keyvault',
        key
      };
    }
  }

  async close(): Promise<void> {
    this.ready = false;
    this.credential = undefined;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try to list secrets to verify connection
      await this.listSecrets();
      return true;
    } catch (error) {
      return false;
    }
  }

  private createClient() {
    const { SecretClient } = require('@azure/keyvault-secrets');
    const vaultUrl = `https://${this.config.vaultName}.vault.azure.net`;
    return new SecretClient(vaultUrl, this.credential);
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    const maxAttempts = this.config.retryAttempts ?? 3;
    const delay = this.config.retryDelay ?? 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }

    throw new Error('Max retry attempts reached');
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors or rate limiting
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
    return (
      retryableCodes.includes(error.code) ||
      error.statusCode === 429 || // Too Many Requests
      error.statusCode === 503    // Service Unavailable
    );
  }

  private extractVersion(version?: string): number {
    if (!version) return 1;
    const match = version.match(/(\d+)$/);
    return match ? parseInt(match[1]) : 1;
  }

  private ensureReady(): void {
    if (!this.ready) {
      throw new Error('AzureKeyVaultProvider not initialized');
    }
  }
}
