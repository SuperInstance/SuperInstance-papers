/**
 * POLLN Security Module - Cryptographic Utilities
 * Provides signing, encryption, and key management for POLLN
 */

import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Type Definitions
// ============================================================================

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  keyId: string;
  createdAt: number;
  expiresAt?: number;
}

export interface Signature {
  algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  value: string;
  keyId: string;
  timestamp: number;
}

export interface EncryptedData {
  algorithm: 'aes-256-gcm' | 'aes-256-cbc';
  iv: string;
  salt: string;
  authTag?: string;
  data: string;
  keyId: string;
  timestamp: number;
}

export interface SignedData<T> {
  data: T;
  signature: Signature;
}

// ============================================================================
// Key Management
// ============================================================================

export class KeyManager {
  private keys: Map<string, KeyPair> = new Map();
  private masterKey: Buffer;
  private defaultKeyExpiry: number;

  constructor(masterKey?: Buffer, defaultKeyExpiry: number = 365 * 24 * 60 * 60 * 1000) {
    this.masterKey = masterKey || randomBytes(32);
    this.defaultKeyExpiry = defaultKeyExpiry;
  }

  /**
   * Generate a new key pair
   */
  generateKeyPair(expiresIn?: number): KeyPair {
    const keyId = uuidv4();
    const now = Date.now();
    const expiresAt = expiresIn ? now + expiresIn : now + this.defaultKeyExpiry;

    // Generate key pair using HMAC (simplified for POLLN)
    // In production, use RSA or ECDSA for asymmetric signatures
    const publicKey = randomBytes(32).toString('base64');
    const privateKey = randomBytes(32).toString('base64');

    const keyPair: KeyPair = {
      publicKey,
      privateKey,
      keyId,
      createdAt: now,
      expiresAt,
    };

    this.keys.set(keyId, keyPair);
    return keyPair;
  }

  /**
   * Get a key pair by ID
   */
  getKeyPair(keyId: string): KeyPair | undefined {
    const keyPair = this.keys.get(keyId);
    if (!keyPair) {
      return undefined;
    }

    // Check expiration
    if (keyPair.expiresAt && Date.now() > keyPair.expiresAt) {
      this.keys.delete(keyId);
      return undefined;
    }

    return keyPair;
  }

  /**
   * Revoke a key pair
   */
  revokeKeyPair(keyId: string): boolean {
    return this.keys.delete(keyId);
  }

  /**
   * Get active key ID (most recent)
   */
  getActiveKeyId(): string | undefined {
    const allKeys = Array.from(this.keys.values());
    const activeKeys = allKeys
      .filter(k => !k.expiresAt || k.expiresAt > Date.now())
      .sort((a, b) => b.createdAt - a.createdAt);

    return activeKeys[0]?.keyId;
  }

  /**
   * Clean up expired keys
   */
  cleanupExpiredKeys(): number {
    let count = 0;
    const now = Date.now();

    const keyEntries = Array.from(this.keys.entries());
    for (const [keyId, keyPair] of keyEntries) {
      if (keyPair.expiresAt && keyPair.expiresAt < now) {
        this.keys.delete(keyId);
        count++;
      }
    }

    return count;
  }

  /**
   * Get master key (for encryption)
   */
  getMasterKey(): Buffer {
    return this.masterKey;
  }

  /**
   * Derive encryption key from master key
   */
  deriveKey(keyId: string, salt: Buffer): Buffer {
    return createHmac('sha256', this.masterKey)
      .update(keyId)
      .update(salt)
      .digest();
  }
}

// ============================================================================
// Digital Signatures
// ============================================================================

export class SignatureService {
  private keyManager: KeyManager;
  private defaultAlgorithm: Signature['algorithm'] = 'HS512';

  constructor(keyManager: KeyManager) {
    this.keyManager = keyManager;
  }

  /**
   * Sign data
   */
  sign<T>(data: T, keyId?: string, algorithm?: Signature['algorithm']): SignedData<T> {
    const activeKeyId = keyId || this.keyManager.getActiveKeyId();
    if (!activeKeyId) {
      throw new Error('No active key available for signing');
    }

    const keyPair = this.keyManager.getKeyPair(activeKeyId);
    if (!keyPair) {
      throw new Error(`Key pair not found: ${activeKeyId}`);
    }

    const algo = algorithm || this.defaultAlgorithm;
    const dataString = JSON.stringify(data);
    const signature = this.createSignature(dataString, keyPair.privateKey, algo);

    return {
      data,
      signature: {
        algorithm: algo,
        value: signature,
        keyId: activeKeyId,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Verify signed data
   */
  verifySignedData<T>(signedData: SignedData<T>): boolean {
    const { data, signature } = signedData;
    const keyPair = this.keyManager.getKeyPair(signature.keyId);

    if (!keyPair) {
      return false;
    }

    const dataString = JSON.stringify(data);
    const expectedSignature = this.createSignature(
      dataString,
      keyPair.privateKey,
      signature.algorithm
    );

    // Use timing-safe comparison
    return this.timingSafeEqual(
      Buffer.from(signature.value),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Create signature using HMAC
   */
  private createSignature(
    data: string,
    privateKey: string,
    algorithm: Signature['algorithm']
  ): string {
    const algoMap: Record<Signature['algorithm'], string> = {
      'HS256': 'sha256',
      'HS384': 'sha384',
      'HS512': 'sha512',
      'RS256': 'sha256',
      'RS384': 'sha384',
      'RS512': 'sha512',
    };

    const hashAlgo = algoMap[algorithm];
    const key = Buffer.from(privateKey, 'base64');

    return createHmac(hashAlgo, key)
      .update(data)
      .digest('base64');
  }

  /**
   * Timing-safe string comparison
   */
  private timingSafeEqual(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }

    return result === 0;
  }

  /**
   * Sign A2A package
   */
  signA2APackage<T>(pkg: T, keyId?: string): SignedData<T> {
    return this.sign(pkg, keyId, 'HS512');
  }

  /**
   * Verify A2A package signature
   */
  verifyA2APackage<T>(signedPkg: SignedData<T>): boolean {
    return this.verifySignedData(signedPkg);
  }
}

// ============================================================================
// Encryption Service
// ============================================================================

export class EncryptionService {
  private keyManager: KeyManager;
  private defaultAlgorithm: EncryptedData['algorithm'] = 'aes-256-gcm';

  constructor(keyManager: KeyManager) {
    this.keyManager = keyManager;
  }

  /**
   * Encrypt data
   */
  encrypt<T>(data: T, keyId?: string): EncryptedData {
    const activeKeyId = keyId || uuidv4();
    const iv = randomBytes(16);
    const salt = randomBytes(32);
    const key = this.keyManager.deriveKey(activeKeyId, salt);

    const dataString = JSON.stringify(data);
    const dataBuffer = Buffer.from(dataString, 'utf-8');

    let encrypted: Buffer;
    let authTag: Buffer | undefined;

    if (this.defaultAlgorithm === 'aes-256-gcm') {
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
      authTag = cipher.getAuthTag();
    } else {
      const cipher = createCipheriv('aes-256-cbc', key, iv);
      encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
    }

    return {
      algorithm: this.defaultAlgorithm,
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
      authTag: authTag?.toString('base64'),
      data: encrypted.toString('base64'),
      keyId: activeKeyId,
      timestamp: Date.now(),
    };
  }

  /**
   * Decrypt data
   */
  decrypt<T>(encryptedData: EncryptedData): T | null {
    try {
      // Extract salt from encrypted data
      const salt = encryptedData.salt
        ? Buffer.from(encryptedData.salt, 'base64')
        : Buffer.alloc(32);

      const key = this.keyManager.deriveKey(encryptedData.keyId, salt);
      const iv = Buffer.from(encryptedData.iv, 'base64');

      const encrypted = Buffer.from(encryptedData.data, 'base64');
      let decrypted: Buffer;

      if (encryptedData.algorithm === 'aes-256-gcm') {
        const decipher = createDecipheriv('aes-256-gcm', key, iv);
        if (encryptedData.authTag) {
          decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
        }
        decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      } else {
        const decipher = createDecipheriv('aes-256-cbc', key, iv);
        decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      }

      const dataString = decrypted.toString('utf-8');
      return JSON.parse(dataString) as T;
    } catch (error) {
      return null;
    }
  }

  /**
   * Encrypt federated sync data
   */
  encryptFederatedData<T>(data: T, colonyId: string): EncryptedData {
    return this.encrypt(data, colonyId);
  }

  /**
   * Decrypt federated sync data
   */
  decryptFederatedData<T>(encryptedData: EncryptedData): T | null {
    return this.decrypt<T>(encryptedData);
  }

  /**
   * Generate secure hash
   */
  hash(data: string | Buffer, algorithm: string = 'sha256'): string {
    return createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Generate HMAC
   */
  hmac(data: string | Buffer, key: Buffer, algorithm: string = 'sha256'): string {
    return createHmac(algorithm, key).update(data).digest('hex');
  }

  /**
   * Generate random token
   */
  generateToken(length: number = 32): string {
    return randomBytes(length).toString('base64').slice(0, length);
  }
}

// ============================================================================
// Security Configuration
// ============================================================================

export interface SecurityConfig {
  // Signing
  signingKeyId?: string;
  signingAlgorithm: Signature['algorithm'];
  keyRotationInterval: number;
  keyExpiry: number;

  // Encryption
  encryptionKeyId?: string;
  encryptionAlgorithm: EncryptedData['algorithm'];
  encryptFederatedSync: boolean;
  encryptA2APackages: boolean;

  // Validation
  enforceSignatures: boolean;
  enforceEncryption: boolean;
  allowUnsignedInbound: boolean;
  allowUnencryptedInbound: boolean;

  // Key management
  autoRotateKeys: boolean;
  retainExpiredKeys: boolean;
  backupKeys: boolean;

  // Audit
  logAllCryptoOperations: boolean;
  logFailedVerifications: boolean;
}

export class SecurityConfigManager {
  private config: SecurityConfig;
  private keyManager: KeyManager;
  private signatureService: SignatureService;
  private encryptionService: EncryptionService;

  constructor(
    keyManager: KeyManager,
    config?: Partial<SecurityConfig>
  ) {
    this.keyManager = keyManager;
    this.signatureService = new SignatureService(keyManager);
    this.encryptionService = new EncryptionService(keyManager);

    this.config = {
      signingAlgorithm: 'HS512',
      keyRotationInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
      keyExpiry: 90 * 24 * 60 * 60 * 1000, // 90 days
      encryptionAlgorithm: 'aes-256-gcm',
      encryptFederatedSync: true,
      encryptA2APackages: false,
      enforceSignatures: true,
      enforceEncryption: false,
      allowUnsignedInbound: true,
      allowUnencryptedInbound: true,
      autoRotateKeys: true,
      retainExpiredKeys: true,
      backupKeys: false,
      logAllCryptoOperations: false,
      logFailedVerifications: true,
      ...config,
    };
  }

  /**
   * Get security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration
   */
  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get signature service
   */
  getSignatureService(): SignatureService {
    return this.signatureService;
  }

  /**
   * Get encryption service
   */
  getEncryptionService(): EncryptionService {
    return this.encryptionService;
  }

  /**
   * Get key manager
   */
  getKeyManager(): KeyManager {
    return this.keyManager;
  }

  /**
   * Rotate keys
   */
  rotateKeys(): KeyPair {
    const newKeyPair = this.keyManager.generateKeyPair(this.config.keyExpiry);

    if (this.config.signingKeyId) {
      // Keep old key for verification
      // In production, implement proper key rotation
    }

    this.config.signingKeyId = newKeyPair.keyId;
    return newKeyPair;
  }

  /**
   * Initialize security
   */
  initialize(): KeyPair {
    if (!this.config.signingKeyId) {
      const keyPair = this.keyManager.generateKeyPair(this.config.keyExpiry);
      this.config.signingKeyId = keyPair.keyId;
      return keyPair;
    }

    const existingKey = this.keyManager.getKeyPair(this.config.signingKeyId);
    if (!existingKey) {
      const keyPair = this.keyManager.generateKeyPair(this.config.keyExpiry);
      this.config.signingKeyId = keyPair.keyId;
      return keyPair;
    }

    return existingKey;
  }

  /**
   * Check if encryption is required
   */
  isEncryptionRequired(operation: 'federated' | 'a2a' | 'storage'): boolean {
    switch (operation) {
      case 'federated':
        return this.config.encryptFederatedSync;
      case 'a2a':
        return this.config.encryptA2APackages;
      case 'storage':
        return this.config.enforceEncryption;
      default:
        return false;
    }
  }

  /**
   * Check if signature is required
   */
  isSignatureRequired(operation: 'federated' | 'a2a' | 'api'): boolean {
    switch (operation) {
      case 'federated':
      case 'a2a':
        return this.config.enforceSignatures;
      case 'api':
        return true; // Always require signatures for API
      default:
        return false;
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a default security manager
 */
export function createSecurityManager(config?: Partial<SecurityConfig>): SecurityConfigManager {
  const keyManager = new KeyManager();
  return new SecurityConfigManager(keyManager, config);
}

/**
 * Generate a secure random ID
 */
export function generateSecureId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Hash a password
 */
export function hashPassword(password: string, salt?: string): string {
  const actualSalt = salt || randomBytes(16).toString('hex');
  const hash = createHmac('sha256', actualSalt).update(password).digest('hex');
  return `${actualSalt}:${hash}`;
}

/**
 * Verify a password
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const expectedHash = createHmac('sha256', salt).update(password).digest('hex');
  return hash === expectedHash;
}
