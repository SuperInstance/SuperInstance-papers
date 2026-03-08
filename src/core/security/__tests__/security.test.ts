/**
 * Security Module Tests
 * Comprehensive tests for cryptographic, audit, and security features
 */

import {
  KeyManager,
  SignatureService,
  EncryptionService,
  SecurityConfigManager,
  createSecurityManager,
  generateSecureId,
  hashPassword,
  verifyPassword,
  AuditLogger,
  createAuditLogger,
} from '../index.js';

describe('Security Module', () => {
  // ==========================================================================
  // Key Management Tests
  // ==========================================================================

  describe('KeyManager', () => {
    let keyManager: KeyManager;

    beforeEach(() => {
      keyManager = new KeyManager();
    });

    test('should generate a key pair', () => {
      const keyPair = keyManager.generateKeyPair();

      expect(keyPair).toBeDefined();
      expect(keyPair.keyId).toBeDefined();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.createdAt).toBeLessThanOrEqual(Date.now());
      expect(keyPair.expiresAt).toBeGreaterThan(Date.now());
    });

    test('should retrieve a stored key pair', () => {
      const keyPair = keyManager.generateKeyPair();
      const retrieved = keyManager.getKeyPair(keyPair.keyId);

      expect(retrieved).toEqual(keyPair);
    });

    test('should return undefined for non-existent key', () => {
      const retrieved = keyManager.getKeyPair('non-existent');
      expect(retrieved).toBeUndefined();
    });

    test('should revoke a key pair', () => {
      const keyPair = keyManager.generateKeyPair();
      const revoked = keyManager.revokeKeyPair(keyPair.keyId);

      expect(revoked).toBe(true);
      expect(keyManager.getKeyPair(keyPair.keyId)).toBeUndefined();
    });

    test('should get active key ID', () => {
      const keyPair = keyManager.generateKeyPair();
      const activeKeyId = keyManager.getActiveKeyId();

      expect(activeKeyId).toBe(keyPair.keyId);
    });

    test('should clean up expired keys', () => {
      const shortExpiry = 100; // 100ms
      keyManager.generateKeyPair(shortExpiry);

      // Wait for key to expire
      return new Promise(resolve => setTimeout(resolve, 150))
        .then(() => {
          const count = keyManager.cleanupExpiredKeys();
          expect(count).toBeGreaterThanOrEqual(1);
        });
    });
  });

  // ==========================================================================
  // Signature Service Tests
  // ==========================================================================

  describe('SignatureService', () => {
    let keyManager: KeyManager;
    let signatureService: SignatureService;

    beforeEach(() => {
      keyManager = new KeyManager();
      // Generate a key pair before creating signature service
      keyManager.generateKeyPair();
      signatureService = new SignatureService(keyManager);
    });

    test('should sign data', () => {
      const data = { message: 'test data' };
      const signed = signatureService.sign(data);

      expect(signed.data).toEqual(data);
      expect(signed.signature).toBeDefined();
      expect(signed.signature.value).toBeDefined();
      expect(signed.signature.keyId).toBeDefined();
      expect(signed.signature.timestamp).toBeLessThanOrEqual(Date.now());
    });

    test('should verify signed data', () => {
      const data = { message: 'test data' };
      const signed = signatureService.sign(data);
      const verified = signatureService.verifySignedData(signed);

      expect(verified).toBe(true);
    });

    test('should fail verification for tampered data', () => {
      const data = { message: 'test data' };
      const signed = signatureService.sign(data);

      // Tamper with data
      signed.data.message = 'tampered data';

      const verified = signatureService.verifySignedData(signed);
      expect(verified).toBe(false);
    });

    test('should sign A2A packages', () => {
      const pkg = {
        id: 'pkg-123',
        senderId: 'agent-1',
        receiverId: 'agent-2',
        type: 'test',
        payload: { data: 'test' },
      };

      const signedPkg = signatureService.signA2APackage(pkg);

      expect(signedPkg.data).toEqual(pkg);
      expect(signedPkg.signature).toBeDefined();
    });

    test('should verify A2A packages', () => {
      const pkg = {
        id: 'pkg-123',
        senderId: 'agent-1',
        receiverId: 'agent-2',
        type: 'test',
        payload: { data: 'test' },
      };

      const signedPkg = signatureService.signA2APackage(pkg);
      const verified = signatureService.verifyA2APackage(signedPkg);

      expect(verified).toBe(true);
    });
  });

  // ==========================================================================
  // Encryption Service Tests
  // ==========================================================================

  describe('EncryptionService', () => {
    let keyManager: KeyManager;
    let encryptionService: EncryptionService;

    beforeEach(() => {
      keyManager = new KeyManager();
      encryptionService = new EncryptionService(keyManager);
    });

    test('should encrypt data', () => {
      const data = { secret: 'sensitive data' };
      const encrypted = encryptionService.encrypt(data);

      expect(encrypted.data).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.keyId).toBeDefined();
      expect(encrypted.algorithm).toBeDefined();
      expect(encrypted.timestamp).toBeDefined();
    });

    test('should decrypt data', () => {
      const data = { secret: 'sensitive data' };
      const encrypted = encryptionService.encrypt(data);
      const decrypted = encryptionService.decrypt<typeof data>(encrypted);

      expect(decrypted).toEqual(data);
    });

    test('should return null for invalid encrypted data', () => {
      const invalidEncrypted = {
        algorithm: 'aes-256-gcm' as const,
        iv: 'invalid',
        data: 'invalid',
        keyId: 'invalid',
        timestamp: Date.now(),
      };

      const decrypted = encryptionService.decrypt(invalidEncrypted);
      expect(decrypted).toBeNull();
    });

    test('should encrypt federated data', () => {
      const data = { anchors: ['anchor1', 'anchor2'] };
      const encrypted = encryptionService.encryptFederatedData(data, 'colony-1');

      expect(encrypted.keyId).toBe('colony-1');
    });

    test('should decrypt federated data', () => {
      const data = { anchors: ['anchor1', 'anchor2'] };
      const encrypted = encryptionService.encryptFederatedData(data, 'colony-1');
      const decrypted = encryptionService.decryptFederatedData<typeof data>(encrypted);

      expect(decrypted).toEqual(data);
    });

    test('should generate hash', () => {
      const data = 'test data';
      const hash = encryptionService.hash(data);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    test('should generate consistent hashes', () => {
      const data = 'test data';
      const hash1 = encryptionService.hash(data);
      const hash2 = encryptionService.hash(data);

      expect(hash1).toBe(hash2);
    });

    test('should generate random token', () => {
      const token = encryptionService.generateToken(32);

      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
      expect(token.length).toBeLessThanOrEqual(32);
    });
  });

  // ==========================================================================
  // Security Config Manager Tests
  // ==========================================================================

  describe('SecurityConfigManager', () => {
    let securityManager: SecurityConfigManager;

    beforeEach(() => {
      securityManager = createSecurityManager();
    });

    test('should initialize security', () => {
      const keyPair = securityManager.initialize();

      expect(keyPair).toBeDefined();
      expect(keyPair.keyId).toBeDefined();
    });

    test('should get security configuration', () => {
      const config = securityManager.getConfig();

      expect(config).toBeDefined();
      expect(config.signingAlgorithm).toBeDefined();
      expect(config.encryptionAlgorithm).toBeDefined();
    });

    test('should update security configuration', () => {
      securityManager.updateConfig({
        enforceSignatures: false,
        encryptFederatedSync: false,
      });

      const config = securityManager.getConfig();
      expect(config.enforceSignatures).toBe(false);
      expect(config.encryptFederatedSync).toBe(false);
    });

    test('should check encryption requirements', () => {
      const isRequired = securityManager.isEncryptionRequired('federated');
      expect(typeof isRequired).toBe('boolean');
    });

    test('should check signature requirements', () => {
      const isRequired = securityManager.isSignatureRequired('a2a');
      expect(typeof isRequired).toBe('boolean');
    });

    test('should rotate keys', () => {
      const oldKeyPair = securityManager.initialize();
      const newKeyPair = securityManager.rotateKeys();

      expect(newKeyPair.keyId).toBeDefined();
      expect(newKeyPair.keyId).not.toBe(oldKeyPair.keyId);
    });

    test('should provide signature service', () => {
      const signatureService = securityManager.getSignatureService();
      expect(signatureService).toBeInstanceOf(SignatureService);
    });

    test('should provide encryption service', () => {
      const encryptionService = securityManager.getEncryptionService();
      expect(encryptionService).toBeInstanceOf(EncryptionService);
    });

    test('should provide key manager', () => {
      const keyManager = securityManager.getKeyManager();
      expect(keyManager).toBeInstanceOf(KeyManager);
    });
  });

  // ==========================================================================
  // Utility Functions Tests
  // ==========================================================================

  describe('Utility Functions', () => {
    test('should generate secure ID', () => {
      const id = generateSecureId();

      expect(id).toBeDefined();
      expect(id).toHaveLength(32); // 16 bytes = 32 hex characters
      expect(id).toMatch(/^[a-f0-9]+$/);
    });

    test('should generate unique secure IDs', () => {
      const id1 = generateSecureId();
      const id2 = generateSecureId();

      expect(id1).not.toBe(id2);
    });

    test('should hash password', () => {
      const password = 'securePassword123';
      const hashed = hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).toContain(':');
      const [salt, hash] = hashed.split(':');
      expect(salt).toBeDefined();
      expect(hash).toBeDefined();
    });

    test('should verify correct password', () => {
      const password = 'securePassword123';
      const hashed = hashPassword(password);
      const verified = verifyPassword(password, hashed);

      expect(verified).toBe(true);
    });

    test('should reject incorrect password', () => {
      const password = 'securePassword123';
      const hashed = hashPassword(password);
      const verified = verifyPassword('wrongPassword', hashed);

      expect(verified).toBe(false);
    });

    test('should generate different hashes for same password', () => {
      const password = 'securePassword123';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salt
    });
  });

  // ==========================================================================
  // Audit Logger Tests
  // ==========================================================================

  describe('AuditLogger', () => {
    let auditLogger: AuditLogger;

    beforeEach(() => {
      auditLogger = createAuditLogger({
        enableConsole: false,
        enableFile: false,
        asyncLogging: false,
      });
    });

    afterEach(() => {
      auditLogger.shutdown();
    });

    test('should log audit event', () => {
      const eventId = auditLogger.log({
        eventType: 'authentication',
        severity: 'info',
        category: 'auth',
        action: 'login',
        outcome: 'success',
        details: {},
      });

      expect(eventId).toBeDefined();
    });

    test('should log authentication event', () => {
      const eventId = auditLogger.logAuthentication(
        'login',
        { id: 'user-1', type: 'user' },
        'success'
      );

      expect(eventId).toBeDefined();
    });

    test('should log authorization event', () => {
      const eventId = auditLogger.logAuthorization(
        'access_granted',
        { id: 'user-1', type: 'user' },
        { type: 'colony', id: 'colony-1' },
        'success'
      );

      expect(eventId).toBeDefined();
    });

    test('should log crypto operation', () => {
      const eventId = auditLogger.logCryptoOperation(
        'sign',
        'success',
        { keyId: 'key-1' }
      );

      expect(eventId).toBeDefined();
    });

    test('should log security event', () => {
      const eventId = auditLogger.logSecurityEvent(
        'intrusion_detected',
        'critical',
        'failure',
        { ip: '192.168.1.1' }
      );

      expect(eventId).toBeDefined();
    });

    test('should log rate limit exceeded', () => {
      const eventId = auditLogger.logRateLimitExceeded(
        { id: 'user-1', type: 'user' },
        { endpoint: '/api/colony' }
      );

      expect(eventId).toBeDefined();
    });

    test('should log signature failure', () => {
      const eventId = auditLogger.logSignatureFailure({
        packageId: 'pkg-123',
        reason: 'invalid_signature',
      });

      expect(eventId).toBeDefined();
    });

    test('should query audit events', () => {
      auditLogger.logAuthentication('login', { id: 'user-1', type: 'user' }, 'success');
      auditLogger.logAuthentication('logout', { id: 'user-1', type: 'user' }, 'success');

      const events = auditLogger.query({
        eventTypes: ['authentication'],
        limit: 10,
      });

      expect(events.length).toBe(2);
    });

    test('should filter by severity', () => {
      auditLogger.logSecurityEvent('test', 'info', 'success', {});
      auditLogger.logSecurityEvent('test', 'critical', 'failure', {});

      const events = auditLogger.query({
        severities: ['critical'],
      });

      expect(events.length).toBe(1);
      expect(events[0].severity).toBe('critical');
    });

    test('should get audit statistics', () => {
      auditLogger.logAuthentication('login', { id: 'user-1', type: 'user' }, 'success');
      auditLogger.logAuthentication('login', { id: 'user-2', type: 'user' }, 'success');
      auditLogger.logAuthentication('login', { id: 'user-1', type: 'user' }, 'failure');

      const stats = auditLogger.getStatistics();

      expect(stats.totalEvents).toBe(3);
      expect(stats.eventsByOutcome.success).toBe(2);
      expect(stats.eventsByOutcome.failure).toBe(1);
    });

    test('should get recent events', () => {
      auditLogger.logSecurityEvent('test1', 'info', 'success', {});
      auditLogger.logSecurityEvent('test2', 'info', 'success', {});
      auditLogger.logSecurityEvent('test3', 'info', 'success', {});

      const recent = auditLogger.getRecentEvents(2);

      expect(recent.length).toBe(2);
      expect(recent[0].action).toBe('test3');
      expect(recent[1].action).toBe('test2');
    });

    test('should clear old events', () => {
      const eventId = auditLogger.logSecurityEvent('old', 'info', 'success', {});
      // Get the event to check its timestamp
      const events = auditLogger.getRecentEvents(1);
      const eventTime = events[0].timestamp;

      // Set the threshold to be after the event time
      const oldTime = eventTime + 1;

      const count = auditLogger.clearOldEvents(oldTime);

      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should clear all events', () => {
      auditLogger.logSecurityEvent('test', 'info', 'success', {});
      expect(auditLogger.getRecentEvents().length).toBeGreaterThan(0);

      auditLogger.clearAllEvents();
      expect(auditLogger.getRecentEvents().length).toBe(0);
    });

    test('should log federated sync', () => {
      const eventId = auditLogger.logFederatedSync(
        'send',
        'colony-1',
        'success',
        { anchorsCount: 10 }
      );

      expect(eventId).toBeDefined();
    });

    test('should log A2A communication', () => {
      const eventId = auditLogger.logA2ACommunication(
        'agent-1',
        'agent-2',
        'test_type',
        'success',
        { payloadSize: 1024 }
      );

      expect(eventId).toBeDefined();
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Security Integration', () => {
    let securityManager: SecurityConfigManager;
    let auditLogger: AuditLogger;

    beforeEach(() => {
      securityManager = createSecurityManager({
        enforceSignatures: true,
        encryptFederatedSync: true,
      });
      // Initialize security to generate keys
      securityManager.initialize();
      auditLogger = createAuditLogger({
        enableConsole: false,
        enableFile: false,
        asyncLogging: false,
      });
    });

    afterEach(() => {
      auditLogger.shutdown();
    });

    test('should sign and verify A2A package with audit', () => {
      const signatureService = securityManager.getSignatureService();

      const pkg = {
        id: 'pkg-123',
        senderId: 'agent-1',
        receiverId: 'agent-2',
        type: 'test',
        payload: { data: 'test' },
      };

      const signedPkg = signatureService.signA2APackage(pkg);
      const verified = signatureService.verifyA2APackage(signedPkg);

      expect(verified).toBe(true);

      // Log the communication
      auditLogger.logA2ACommunication(
        pkg.senderId,
        pkg.receiverId,
        pkg.type,
        verified ? 'success' : 'failure',
        { packageId: pkg.id }
      );
    });

    test('should encrypt and decrypt federated data with audit', () => {
      const encryptionService = securityManager.getEncryptionService();

      const data = {
        colonyId: 'colony-1',
        anchors: [
          { id: 'anchor-1', data: 'test1' },
          { id: 'anchor-2', data: 'test2' },
        ],
      };

      const encrypted = encryptionService.encryptFederatedData(data, data.colonyId);
      const decrypted = encryptionService.decryptFederatedData<typeof data>(encrypted);

      expect(decrypted).toEqual(data);

      // Log the federated sync
      auditLogger.logFederatedSync(
        'send',
        data.colonyId,
        decrypted ? 'success' : 'failure',
        { anchorsCount: data.anchors.length }
      );
    });

    test('should handle security event workflow', () => {
      const signatureService = securityManager.getSignatureService();

      // Simulate a security event
      const pkg = { id: 'pkg-123', data: 'test' };
      const signedPkg = signatureService.sign(pkg);

      // Tamper with the package
      signedPkg.data = 'tampered';

      const verified = signatureService.verifySignedData(signedPkg);

      // Log the security event
      if (!verified) {
        auditLogger.logSignatureFailure({
          packageId: pkg.id,
          reason: 'verification_failed',
          timestamp: Date.now(),
        });
      }

      expect(verified).toBe(false);
    });

    test('should rotate keys and maintain verification', () => {
      const signatureService = securityManager.getSignatureService();

      // Sign with old key
      const pkg1 = { id: 'pkg-1', data: 'test1' };
      const signed1 = signatureService.sign(pkg1);

      // Rotate keys
      securityManager.rotateKeys();

      // Sign with new key
      const pkg2 = { id: 'pkg-2', data: 'test2' };
      const signed2 = signatureService.sign(pkg2);

      // Both should verify (old key is retained)
      expect(signatureService.verifySignedData(signed1)).toBe(true);
      expect(signatureService.verifySignedData(signed2)).toBe(true);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    test('should handle signing with no active key', () => {
      const keyManager = new KeyManager();
      const signatureService = new SignatureService(keyManager);

      // Don't generate any keys
      expect(() => {
        signatureService.sign({ test: 'data' });
      }).toThrow();
    });

    test('should handle verification with invalid key', () => {
      const keyManager = new KeyManager();
      const signatureService = new SignatureService(keyManager);

      const signedData = {
        data: { test: 'data' },
        signature: {
          algorithm: 'HS512' as const,
          value: 'invalid',
          keyId: 'non-existent',
          timestamp: Date.now(),
        },
      };

      expect(signatureService.verifySignedData(signedData)).toBe(false);
    });

    test('should handle decryption with invalid data', () => {
      const keyManager = new KeyManager();
      const encryptionService = new EncryptionService(keyManager);

      const invalidEncrypted = {
        algorithm: 'aes-256-gcm' as const,
        iv: 'invalid-base64===',
        data: 'invalid-base64===',
        keyId: 'test',
        timestamp: Date.now(),
      };

      expect(encryptionService.decrypt(invalidEncrypted)).toBeNull();
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    test('should sign multiple packages efficiently', () => {
      const keyManager = new KeyManager();
      keyManager.generateKeyPair();
      const signatureService = new SignatureService(keyManager);

      const packages = Array.from({ length: 100 }, (_, i) => ({
        id: `pkg-${i}`,
        data: `test-data-${i}`,
      }));

      const startTime = Date.now();

      for (const pkg of packages) {
        signatureService.sign(pkg);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should sign 100 packages in less than 1 second
      expect(duration).toBeLessThan(1000);
    });

    test('should encrypt multiple data items efficiently', () => {
      const keyManager = new KeyManager();
      const encryptionService = new EncryptionService(keyManager);

      const dataItems = Array.from({ length: 100 }, (_, i) => ({
        id: `data-${i}`,
        value: `test-value-${i}`.repeat(10), // ~150 bytes
      }));

      const startTime = Date.now();

      for (const data of dataItems) {
        encryptionService.encrypt(data);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should encrypt 100 items in less than 1 second
      expect(duration).toBeLessThan(1000);
    });

    test('should handle audit logging efficiently', () => {
      const auditLogger = createAuditLogger({
        enableConsole: false,
        enableFile: false,
        asyncLogging: false,
      });

      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        auditLogger.logSecurityEvent('test', 'info', 'success', { index: i });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      auditLogger.shutdown();

      // Should log 1000 events in less than 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});
