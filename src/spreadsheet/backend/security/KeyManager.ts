/**
 * KeyManager - KMS integration for encryption key management
 *
 * Integrates with AWS KMS, Azure Key Vault, Google Cloud KMS, and local fallback.
 */

export interface KeyMetadata {
  keyId: string;
  Arn?: string;
  created?: Date;
  enabled?: boolean;
  keySize?: number;
  keyUsage?: string;
}

export interface EncryptResult {
  ciphertext: string;
  keyId: string;
  algorithm: string;
}

export interface DecryptResult {
  plaintext: string;
  keyId: string;
}

export type KMSProvider = 'aws' | 'azure' | 'gcp' | 'local';

export interface KeyManagerConfig {
  provider: KMSProvider;
  fallbackToLocal?: boolean;
  aws?: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    keyId?: string;
  };
  azure?: {
    vaultName: string;
    keyName: string;
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
  };
  gcp?: {
    projectId: string;
    location: string;
    keyRing: string;
    keyName: string;
    keyFilename?: string;
  };
  local?: {
    keyPath?: string;
    keySize?: number;
  };
}

/**
 * KeyManager - Main key management class
 *
 * Provides KMS integration with automatic fallback to local encryption.
 */
export class KeyManager {
  private provider: KMSProvider;
  private fallbackToLocal: boolean;
  private config: KeyManagerConfig;
  private currentKeyId?: string;
  private keyCache: Map<string, CryptoKey> = new Map();

  constructor(config: KeyManagerConfig) {
    this.provider = config.provider;
    this.fallbackToLocal = config.fallbackToLocal ?? true;
    this.config = config;
  }

  /**
   * Initialize the key manager
   */
  async initialize(): Promise<void> {
    try {
      switch (this.provider) {
        case 'aws':
          await this.initializeAWS();
          break;
        case 'azure':
          await this.initializeAzure();
          break;
        case 'gcp':
          await this.initializeGCP();
          break;
        case 'local':
          await this.initializeLocal();
          break;
        default:
          throw new Error(`Unsupported provider: ${this.provider}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (this.fallbackToLocal) {
        console.warn(`Failed to initialize ${this.provider}, falling back to local: ${message}`);
        await this.initializeLocal();
      } else {
        throw new Error(`Failed to initialize KeyManager: ${message}`);
      }
    }
  }

  /**
   * Encrypt data using KMS
   *
   * @param plaintext - Data to encrypt
   * @returns Encrypted data with key ID
   */
  async encrypt(plaintext: string): Promise<EncryptResult> {
    try {
      switch (this.provider) {
        case 'aws':
          return await this.encryptAWS(plaintext);
        case 'azure':
          return await this.encryptAzure(plaintext);
        case 'gcp':
          return await this.encryptGCP(plaintext);
        case 'local':
          return await this.encryptLocal(plaintext);
        default:
          throw new Error(`Unsupported provider: ${this.provider}`);
      }
    } catch (error) {
      if (this.fallbackToLocal && this.provider !== 'local') {
        console.warn('KMS encryption failed, using local fallback');
        return await this.encryptLocal(plaintext);
      }
      throw error;
    }
  }

  /**
   * Decrypt data using KMS
   *
   * @param ciphertext - Encrypted data
   * @param keyId - Key identifier
   * @returns Decrypted plaintext
   */
  async decrypt(ciphertext: string, keyId?: string): Promise<DecryptResult> {
    try {
      // Try to determine provider from ciphertext format
      const provider = this.detectProviderFromCiphertext(ciphertext);

      switch (provider) {
        case 'aws':
          return await this.decryptAWS(ciphertext);
        case 'azure':
          return await this.decryptAzure(ciphertext);
        case 'gcp':
          return await this.decryptGCP(ciphertext);
        case 'local':
          return await this.decryptLocal(ciphertext);
        default:
          throw new Error(`Unable to detect provider from ciphertext`);
      }
    } catch (error) {
      if (this.fallbackToLocal && provider !== 'local') {
        console.warn('KMS decryption failed, attempting local fallback');
        return await this.decryptLocal(ciphertext);
      }
      throw error;
    }
  }

  /**
   * Generate a new data key
   *
   * @param keyId - Optional key ID
   * @returns Generated key material
   */
  async generateDataKey(keyId?: string): Promise<{ plaintext: string; ciphertext: string }> {
    switch (this.provider) {
      case 'aws':
        return await this.generateDataKeyAWS(keyId);
      default:
        // For other providers, use local generation
        return await this.generateDataKeyLocal();
    }
  }

  /**
   * Get current key ID
   */
  getCurrentKeyId(): string | undefined {
    return this.currentKeyId;
  }

  /**
   * List all available keys
   */
  async listKeys(): Promise<KeyMetadata[]> {
    switch (this.provider) {
      case 'aws':
        return await this.listKeysAWS();
      case 'azure':
        return await this.listKeysAzure();
      case 'gcp':
        return await this.listKeysGCP();
      case 'local':
        return await this.listKeysLocal();
      default:
        return [];
    }
  }

  /**
   * Rotate encryption key
   */
  async rotateKey(): Promise<string> {
    // Implementation depends on provider
    throw new Error('Key rotation not implemented for this provider');
  }

  /**
   * Initialize AWS KMS
   */
  private async initializeAWS(): Promise<void> {
    if (!this.config.aws?.region) {
      throw new Error('AWS region is required');
    }

    // Use configured key ID or create/list keys
    if (this.config.aws?.keyId) {
      this.currentKeyId = this.config.aws.keyId;
    } else {
      // List keys and use the first one
      const keys = await this.listKeysAWS();
      if (keys.length > 0) {
        this.currentKeyId = keys[0].keyId;
      }
    }
  }

  /**
   * Encrypt with AWS KMS
   */
  private async encryptAWS(plaintext: string): Promise<EncryptResult> {
    const { KMSClient, EncryptCommand } = await import('@aws-sdk/client-kms');

    const client = this.createAWSKMSClient();
    const keyId = this.currentKeyId ?? this.config.aws?.keyId;

    if (!keyId) {
      throw new Error('No KMS key ID available');
    }

    const command = new EncryptCommand({
      KeyId: keyId,
      Plaintext: new TextEncoder().encode(plaintext)
    });

    const response = await client.send(command);

    return {
      ciphertext: this.bufferToBase64(response.CiphertextBlob as Uint8Array),
      keyId: response.KeyId ?? keyId,
      algorithm: response.EncryptionAlgorithm ?? 'AES_256'
    };
  }

  /**
   * Decrypt with AWS KMS
   */
  private async decryptAWS(ciphertext: string): Promise<DecryptResult> {
    const { KMSClient, DecryptCommand } = await import('@aws-sdk/client-kms');

    const client = this.createAWSKMSClient();

    const command = new DecryptCommand({
      CiphertextBlob: this.base64ToBuffer(ciphertext)
    });

    const response = await client.send(command);

    return {
      plaintext: new TextDecoder().decode(response.Plaintext as Uint8Array),
      keyId: response.KeyId ?? this.currentKeyId ?? 'unknown'
    };
  }

  /**
   * Generate data key with AWS KMS
   */
  private async generateDataKeyAWS(keyId?: string): Promise<{ plaintext: string; ciphertext: string }> {
    const { KMSClient, GenerateDataKeyCommand } = await import('@aws-sdk/client-kms');

    const client = this.createAWSKMSClient();

    const command = new GenerateDataKeyCommand({
      KeyId: keyId ?? this.currentKeyId ?? this.config.aws?.keyId,
      KeySpec: 'AES_256'
    });

    const response = await client.send(command);

    return {
      plaintext: this.bufferToBase64(response.Plaintext as Uint8Array),
      ciphertext: this.bufferToBase64(response.CiphertextBlob as Uint8Array)
    };
  }

  /**
   * List keys with AWS KMS
   */
  private async listKeysAWS(): Promise<KeyMetadata[]> {
    const { KMSClient, ListKeysCommand } = await import('@aws-sdk/client-kms');

    const client = this.createAWSKMSClient();

    const command = new ListKeysCommand({});

    const response = await client.send(command);

    return (response.Keys ?? []).map(key => ({
      keyId: key.KeyId ?? '',
      Arn: key.KeyArn
    }));
  }

  /**
   * Create AWS KMS client
   */
  private createAWSKMSClient() {
    const { KMSClient } = require('@aws-sdk/client-kms');

    const config: Record<string, unknown> = {
      region: this.config.aws?.region
    };

    if (this.config.aws?.accessKeyId && this.config.aws?.secretAccessKey) {
      config.credentials = {
        accessKeyId: this.config.aws.accessKeyId,
        secretAccessKey: this.config.aws.secretAccessKey
      };
    }

    return new KMSClient(config);
  }

  /**
   * Initialize Azure Key Vault
   */
  private async initializeAzure(): Promise<void> {
    // Azure initialization would go here
    this.currentKeyId = `${this.config.azure?.vaultName}/${this.config.azure?.keyName}`;
  }

  /**
   * Encrypt with Azure Key Vault
   */
  private async encryptAzure(plaintext: string): Promise<EncryptResult> {
    const { CryptographyClient } = await import('@azure/keyvault-keys');

    // Implementation would use Azure SDK
    throw new Error('Azure encryption not implemented yet');
  }

  /**
   * Decrypt with Azure Key Vault
   */
  private async decryptAzure(ciphertext: string): Promise<DecryptResult> {
    // Implementation would use Azure SDK
    throw new Error('Azure decryption not implemented yet');
  }

  /**
   * List keys with Azure Key Vault
   */
  private async listKeysAzure(): Promise<KeyMetadata[]> {
    // Implementation would use Azure SDK
    throw new Error('Azure key listing not implemented yet');
  }

  /**
   * Initialize Google Cloud KMS
   */
  private async initializeGCP(): Promise<void> {
    // GCP initialization would go here
    this.currentKeyId = `projects/${this.config.gcp?.projectId}/locations/${this.config.gcp?.location}/keyRings/${this.config.gcp?.keyRing}/cryptoKeys/${this.config.gcp?.keyName}`;
  }

  /**
   * Encrypt with Google Cloud KMS
   */
  private async encryptGCP(plaintext: string): Promise<EncryptResult> {
    const { KeyManagementServiceClient } = await import('@google-cloud/kms');

    const client = new KeyManagementServiceClient();
    const keyName = this.currentKeyId ?? this.config.gcp?.keyName;

    if (!keyName) {
      throw new Error('No KMS key name available');
    }

    const [response] = await client.encrypt({
      name: keyName,
      plaintext: Buffer.from(plaintext)
    });

    return {
      ciphertext: response.ciphertext.toString('base64'),
      keyId: keyName,
      algorithm: 'GOOGLE_SYMMETRIC_ENCRYPTION'
    };
  }

  /**
   * Decrypt with Google Cloud KMS
   */
  private async decryptGCP(ciphertext: string): Promise<DecryptResult> {
    const { KeyManagementServiceClient } = await import('@google-cloud/kms');

    const client = new KeyManagementServiceClient();

    const [response] = await client.decrypt({
      name: this.currentKeyId ?? '',
      ciphertext: Buffer.from(ciphertext, 'base64')
    });

    return {
      plaintext: response.plaintext.toString('utf-8'),
      keyId: this.currentKeyId ?? 'unknown'
    };
  }

  /**
   * List keys with Google Cloud KMS
   */
  private async listKeysGCP(): Promise<KeyMetadata[]> {
    const { KeyManagementServiceClient } = await import('@google-cloud/kms');

    const client = new KeyManagementServiceClient();
    const projectId = this.config.gcp?.projectId ?? '';
    const location = this.config.gcp?.location ?? '-';
    const keyRing = this.config.gcp?.keyRing ?? '';

    const [keys] = await client.listCryptoKeys({
      parent: `projects/${projectId}/locations/${location}/keyRings/${keyRing}`
    });

    return keys.map(key => ({
      keyId: key.name ?? '',
      created: key.createTime ? new Date(key.createTime) : undefined,
      keySize: 256,
      keyUsage: 'ENCRYPT_DECRYPT'
    }));
  }

  /**
   * Initialize local key management
   */
  private async initializeLocal(): Promise<void> {
    this.currentKeyId = 'local-key';

    // Check if key file exists
    if (this.config.local?.keyPath) {
      try {
        const fs = await import('fs/promises');
        const keyData = await fs.readFile(this.config.local.keyPath, 'utf-8');
        const keyBuffer = this.base64ToBuffer(keyData.trim());

        const key = await crypto.subtle.importKey(
          'raw',
          keyBuffer,
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );

        this.keyCache.set('local-key', key);
      } catch (error) {
        // Generate new key if file doesn't exist
        await this.generateLocalKey();
      }
    } else {
      await this.generateLocalKey();
    }
  }

  /**
   * Generate local encryption key
   */
  private async generateLocalKey(): Promise<void> {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: this.config.local?.keySize ?? 256 },
      true,
      ['encrypt', 'decrypt']
    );

    this.keyCache.set('local-key', key);

    // Save to file if path provided
    if (this.config.local?.keyPath) {
      const exportedKey = await crypto.subtle.exportKey('raw', key);
      const keyData = this.bufferToBase64(exportedKey);

      const fs = await import('fs/promises');
      await fs.writeFile(this.config.local.keyPath, keyData, 'utf-8');
    }
  }

  /**
   * Encrypt with local key
   */
  private async encryptLocal(plaintext: string): Promise<EncryptResult> {
    const key = this.keyCache.get('local-key');
    if (!key) {
      throw new Error('Local key not initialized');
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return {
      ciphertext: `${this.bufferToBase64(iv)}.${this.bufferToBase64(encrypted)}`,
      keyId: 'local-key',
      algorithm: 'AES-256-GCM'
    };
  }

  /**
   * Decrypt with local key
   */
  private async decryptLocal(ciphertext: string): Promise<DecryptResult> {
    const key = this.keyCache.get('local-key');
    if (!key) {
      throw new Error('Local key not initialized');
    }

    const [ivB64, encryptedB64] = ciphertext.split('.');
    if (!ivB64 || !encryptedB64) {
      throw new Error('Invalid ciphertext format');
    }

    const iv = this.base64ToBuffer(ivB64);
    const encrypted = this.base64ToBuffer(encryptedB64);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return {
      plaintext: new TextDecoder().decode(decrypted),
      keyId: 'local-key'
    };
  }

  /**
   * Generate data key locally
   */
  private async generateDataKeyLocal(): Promise<{ plaintext: string; ciphertext: string }> {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const keyData = this.bufferToBase64(exportedKey);

    return {
      plaintext: keyData,
      ciphertext: keyData // For local, plaintext and ciphertext are the same
    };
  }

  /**
   * List local keys
   */
  private async listKeysLocal(): Promise<KeyMetadata[]> {
    return [{
      keyId: 'local-key',
      created: new Date(),
      enabled: true,
      keySize: this.config.local?.keySize ?? 256,
      keyUsage: 'ENCRYPT_DECRYPT'
    }];
  }

  /**
   * Detect provider from ciphertext format
   */
  private detectProviderFromCiphertext(ciphertext: string): KMSProvider {
    if (ciphertext.includes('.')) {
      // Format: iv.encrypted (local)
      return 'local';
    } else {
      // Assume AWS KMS base64 format
      return 'aws';
    }
  }

  /**
   * Convert buffer to base64
   */
  private bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to buffer
   */
  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
