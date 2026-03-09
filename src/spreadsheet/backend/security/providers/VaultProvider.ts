/**
 * VaultProvider - HashiCorp Vault integration
 *
 * Production-grade secret storage with audit logging and automatic encryption.
 */

import { SecretProvider, SecretValue, VaultProviderConfig } from './types';

interface VaultResponse {
  data: {
    data: Record<string, unknown>;
    metadata?: {
      version?: number;
      created_time?: string;
      updated_time?: string;
    };
  };
}

interface VaultHealthResponse {
  initialized: boolean;
  sealed: boolean;
  standby: boolean;
}

export class VaultProvider implements SecretProvider {
  name = 'vault';
  type = 'vault' as const;
  private config: VaultProviderConfig;
  private ready = false;
  private token?: string;
  private readyCallbacks: Array<() => void> = [];

  constructor(config: VaultProviderConfig) {
    if (!config.address) {
      throw new Error('Vault address is required');
    }

    this.config = {
      enabled: true,
      priority: 100,
      timeout: 30000,
      mount: 'secret',
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      // Authenticate with Vault
      if (this.config.token) {
        this.token = this.config.token;
      } else if (this.config.roleId && this.config.secretId) {
        // AppRole authentication
        this.token = await this.authenticateAppRole();
      } else {
        throw new Error('Either token or roleId/secretId must be provided');
      }

      // Verify connection
      const health = await this.healthCheck();
      if (!health) {
        throw new Error('Vault health check failed');
      }

      this.ready = true;
      this.notifyReady();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to initialize VaultProvider: ${message}`);
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  onReady(callback: () => void): void {
    if (this.ready) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  }

  async getSecret(key: string): Promise<SecretValue> {
    this.ensureReady();

    try {
      const path = this.getSecretPath(key);
      const response = await this.vaultRequest<VVaultResponse>('GET', path);

      if (!response.data || !response.data.data) {
        throw new Error(`Secret not found: ${key}`);
      }

      const data = response.data.data;
      const metadata = response.data.metadata;

      // Extract value (support both simple and complex secrets)
      const value = typeof data.value === 'string'
        ? data.value as string
        : JSON.stringify(data);

      return {
        value,
        version: metadata?.version ?? 1,
        createdAt: metadata?.created_time
          ? new Date(metadata.created_time)
          : new Date(),
        metadata: {
          provider: 'vault',
          path,
          rawData: data
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get secret from Vault: ${message}`);
    }
  }

  async setSecret(key: string, secret: SecretValue): Promise<void> {
    this.ensureReady();

    try {
      const path = this.getSecretPath(key);
      const data = {
        data: {
          value: secret.value,
          version: secret.version,
          createdAt: secret.createdAt.toISOString(),
          ...secret.metadata
        }
      };

      await this.vaultRequest('POST', path, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to set secret in Vault: ${message}`);
    }
  }

  async deleteSecret(key: string): Promise<void> {
    this.ensureReady();

    try {
      const path = this.getSecretPath(key);
      await this.vaultRequest('DELETE', path);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to delete secret from Vault: ${message}`);
    }
  }

  async listSecrets(): Promise<string[]> {
    this.ensureReady();

    try {
      const mount = this.config.mount ?? 'secret';
      const path = `/v1/${mount}/metadata/?list=true`;
      const response = await this.vaultRequest<{ data: { keys: string[] } }>('GET', path);

      return response.data.keys ?? [];
    } catch (error) {
      // If path doesn't exist, return empty array
      if (error instanceof Error && error.message.includes('404')) {
        return [];
      }
      throw error;
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
      const path = this.getSecretPath(key);
      const response = await this.vaultRequest<VaultResponse>('GET', path);

      return {
        exists: true,
        provider: 'vault',
        path,
        version: response.data.metadata?.version,
        createdTime: response.data.metadata?.created_time,
        updatedTime: response.data.metadata?.updated_time
      };
    } catch (error) {
      return {
        exists: false,
        provider: 'vault',
        path: this.getSecretPath(key)
      };
    }
  }

  async close(): Promise<void> {
    this.ready = false;
    this.token = undefined;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.address}/v1/sys/health`, {
        signal: AbortSignal.timeout(this.config.timeout ?? 30000)
      });

      if (!response.ok) {
        return false;
      }

      const health = await response.json() as VaultHealthResponse;
      return !health.sealed && health.initialized;
    } catch (error) {
      return false;
    }
  }

  private async authenticateAppRole(): Promise<string> {
    const path = '/v1/auth/approle/login';
    const data = {
      role_id: this.config.roleId,
      secret_id: this.config.secretId
    };

    const response = await this.vaultRequest<{ auth: { client_token: string } }>(
      'POST',
      path,
      data
    );

    return response.auth.client_token;
  }

  private async vaultRequest<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = new URL(path, this.config.address);

    // Add namespace if configured
    if (this.config.namespace) {
      url.searchParams.set('namespace', this.config.namespace);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['X-Vault-Token'] = this.token;
    }

    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout ?? 30000)
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vault request failed: ${response.status} ${error}`);
    }

    return response.json() as Promise<T>;
  }

  private getSecretPath(key: string): string {
    const mount = this.config.mount ?? 'secret';
    return `/v1/${mount}/data/${key}`;
  }

  private notifyReady(): void {
    for (const callback of this.readyCallbacks) {
      callback();
    }
    this.readyCallbacks = [];
  }

  private ensureReady(): void {
    if (!this.ready) {
      throw new Error('VaultProvider not initialized');
    }
  }
}
