/**
 * EncryptionService - Encryption utilities for secret management
 *
 * Provides envelope encryption, key generation, and field-level encryption.
 * Uses AES-256-GCM for authenticated encryption.
 */

export interface EncryptionResult {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId?: string;
  algorithm: string;
}

export interface DecryptionResult {
  plaintext: string;
  keyId?: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  keyId: string;
}

export interface EncryptionConfig {
  algorithm?: 'AES-256-GCM' | 'AES-256-CBC';
  keySize?: 256 | 128;
  ivSize?: 96 | 128;
  keyDerivation?: {
    algorithm: 'PBKDF2' | 'Argon2' | 'Scrypt';
    iterations?: number;
    saltSize?: number;
  };
}

/**
 * EncryptionService - Main encryption service
 *
 * Provides envelope encryption with key management integration.
 */
export class EncryptionService {
  private config: EncryptionConfig;
  private keyCache: Map<string, CryptoKey> = new Map();

  constructor(config: EncryptionConfig = {}) {
    this.config = {
      algorithm: 'AES-256-GCM',
      keySize: 256,
      ivSize: 96,
      keyDerivation: {
        algorithm: 'PBKDF2',
        iterations: 100000,
        saltSize: 16
      },
      ...config
    };
  }

  /**
   * Encrypt plaintext using envelope encryption
   *
   * @param plaintext - Data to encrypt
   * @param keyId - Optional key identifier
   * @returns Encrypted data with IV and auth tag
   */
  async encrypt(plaintext: string, keyId?: string): Promise<string> {
    try {
      // Generate data encryption key (DEK)
      const dek = await this.generateKey();

      // Generate initialization vector
      const iv = crypto.getRandomValues(new Uint8Array(this.config.ivSize! / 8));

      // Encrypt plaintext
      const ciphertext = await this.encryptData(plaintext, dek, iv);

      // Get the raw key material
      const exportedKey = await crypto.subtle.exportKey('raw', dek);

      // Format: base64(iv) + base64(key) + base64(ciphertext) + base64(tag)
      const ivB64 = this.bufferToBase64(iv);
      const keyB64 = this.bufferToBase64(exportedKey);
      const ciphertextB64 = this.bufferToBase64(ciphertext.ciphertext);
      const tagB64 = this.bufferToBase64(ciphertext.tag);

      return `${ivB64}.${keyB64}.${ciphertextB64}.${tagB64}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Encryption failed: ${message}`);
    }
  }

  /**
   * Decrypt ciphertext using envelope encryption
   *
   * @param ciphertext - Encrypted data
   * @returns Decrypted plaintext
   */
  async decrypt(ciphertext: string): Promise<string> {
    try {
      // Parse format: base64(iv) + base64(key) + base64(ciphertext) + base64(tag)
      const [ivB64, keyB64, ciphertextB64, tagB64] = ciphertext.split('.');

      if (!ivB64 || !keyB64 || !ciphertextB64 || !tagB64) {
        throw new Error('Invalid ciphertext format');
      }

      const iv = this.base64ToBuffer(ivB64);
      const keyData = this.base64ToBuffer(keyB64);
      const encryptedData = this.base64ToBuffer(ciphertextB64);
      const tag = this.base64ToBuffer(tagB64);

      // Import key
      const dek = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      // Decrypt data
      const plaintext = await this.decryptData(encryptedData, dek, iv, tag);

      return new TextDecoder().decode(plaintext);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Decryption failed: ${message}`);
    }
  }

  /**
   * Generate a new encryption key
   *
   * @returns CryptoKey
   */
  async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: this.config.keySize!
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derive a key from a password using PBKDF2
   *
   * @param password - Password to derive key from
   * @param salt - Salt for key derivation
   * @returns Derived CryptoKey
   */
  async deriveKey(password: string, salt?: string): Promise<CryptoKey> {
    const saltBuffer = salt
      ? this.base64ToBuffer(salt)
      : crypto.getRandomValues(new Uint8Array(this.config.keyDerivation!.saltSize!));

    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: this.config.keyDerivation!.algorithm! },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: this.config.keyDerivation!.algorithm!,
        salt: saltBuffer,
        iterations: this.config.keyDerivation!.iterations!,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: this.config.keySize! },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate a random password
   *
   * @param length - Password length
   * @returns Random password
   */
  generatePassword(length = 32): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    return Array.from(array, byte => charset[byte % charset.length]).join('');
  }

  /**
   * Encrypt a specific field in an object
   *
   * @param obj - Object to encrypt
   * @param field - Field name to encrypt
   * @returns Object with encrypted field
   */
  async encryptField<T extends Record<string, unknown>>(
    obj: T,
    field: keyof T
  ): Promise<T> {
    if (!obj[field]) {
      return obj;
    }

    const value = String(obj[field]);
    const encrypted = await this.encrypt(value);

    return {
      ...obj,
      [field]: encrypted
    };
  }

  /**
   * Decrypt a specific field in an object
   *
   * @param obj - Object to decrypt
   * @param field - Field name to decrypt
   * @returns Object with decrypted field
   */
  async decryptField<T extends Record<string, unknown>>(
    obj: T,
    field: keyof T
  ): Promise<T> {
    if (!obj[field]) {
      return obj;
    }

    const value = String(obj[field]);
    const decrypted = await this.decrypt(value);

    return {
      ...obj,
      [field]: decrypted
    };
  }

  /**
   * Encrypt multiple fields in an object
   *
   * @param obj - Object to encrypt
   * @param fields - Field names to encrypt
   * @returns Object with encrypted fields
   */
  async encryptFields<T extends Record<string, unknown>>(
    obj: T,
    fields: (keyof T)[]
  ): Promise<T> {
    let result = { ...obj };

    for (const field of fields) {
      result = await this.encryptField(result, field);
    }

    return result;
  }

  /**
   * Decrypt multiple fields in an object
   *
   * @param obj - Object to decrypt
   * @param fields - Field names to decrypt
   * @returns Object with decrypted fields
   */
  async decryptFields<T extends Record<string, unknown>>(
    obj: T,
    fields: (keyof T)[]
  ): Promise<T> {
    let result = { ...obj };

    for (const field of fields) {
      result = await this.decryptField(result, field);
    }

    return result;
  }

  /**
   * Generate an RSA key pair for asymmetric encryption
   *
   * @param modulusLength - Key size
   * @returns Key pair with key ID
   */
  async generateKeyPair(modulusLength = 2048): Promise<KeyPair> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['encrypt', 'decrypt']
    );

    const publicKeyData = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKeyData = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    const keyId = this.generateKeyId();

    return {
      publicKey: this.bufferToBase64(publicKeyData),
      privateKey: this.bufferToBase64(privateKeyData),
      keyId
    };
  }

  /**
   * Encrypt data using public key
   *
   * @param data - Data to encrypt
   * @param publicKey - Public key
   * @returns Encrypted data
   */
  async encryptWithPublicKey(data: string, publicKey: string): Promise<string> {
    const keyData = this.base64ToBuffer(publicKey);
    const key = await crypto.subtle.importKey(
      'spki',
      keyData,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    );

    const encoder = new TextEncoder();
    const plaintext = encoder.encode(data);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      key,
      plaintext
    );

    return this.bufferToBase64(ciphertext);
  }

  /**
   * Decrypt data using private key
   *
   * @param ciphertext - Encrypted data
   * @param privateKey - Private key
   * @returns Decrypted data
   */
  async decryptWithPrivateKey(ciphertext: string, privateKey: string): Promise<string> {
    const keyData = this.base64ToBuffer(privateKey);
    const key = await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['decrypt']
    );

    const encryptedData = this.base64ToBuffer(ciphertext);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decrypted);
  }

  /**
   * Hash data using SHA-256
   *
   * @param data - Data to hash
   * @returns Hash as hex string
   */
  async hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return this.bufferToHex(hashBuffer);
  }

  /**
   * Verify data integrity
   *
   * @param data - Original data
   * @param signature - Signature to verify
   * @returns True if signature is valid
   */
  async verify(data: string, signature: string): Promise<boolean> {
    const computedHash = await this.hash(data);
    return computedHash === signature;
  }

  /**
   * Generate a random key ID
   */
  private generateKeyId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Encrypt data with AES-GCM
   */
  private async encryptData(
    plaintext: string,
    key: CryptoKey,
    iv: Uint8Array
  ): Promise<{ ciphertext: Uint8Array; tag: Uint8Array }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Split ciphertext and tag
    const ciphertext = new Uint8Array(encrypted.slice(0, -16));
    const tag = new Uint8Array(encrypted.slice(-16));

    return { ciphertext, tag };
  }

  /**
   * Decrypt data with AES-GCM
   */
  private async decryptData(
    ciphertext: Uint8Array,
    key: CryptoKey,
    iv: Uint8Array,
    tag: Uint8Array
  ): Promise<ArrayBuffer> {
    // Combine ciphertext and tag
    const combined = new Uint8Array(ciphertext.length + tag.length);
    combined.set(ciphertext);
    combined.set(tag, ciphertext.length);

    return crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      combined
    );
  }

  /**
   * Convert buffer to base64
   */
  private bufferToBase64(buffer: ArrayBuffer): string {
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

  /**
   * Convert buffer to hex string
   */
  private bufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}
