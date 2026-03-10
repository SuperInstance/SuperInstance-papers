/**
 * OAuth Authentication Tests
 *
 * Tests for OAuth 2.0 and OpenID Connect functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { OAuthManager, OAuthConfig, OAuthToken, OAuthUserProfile, OAuthSessionState } from './OAuthManager';
import { OIDCService, IDTokenClaims, OIDCConfiguration } from './OIDCService';
import { AccountLinkingService, UserAccount, LinkedAccount } from './AccountLinking';
import { AuthorizationCodeFlow } from './AuthorizationCodeFlow';
import { DeviceCodeFlow } from './DeviceCodeFlow';
import { ProviderFactory } from './Providers';

// Mock fetch
global.fetch = jest.fn();

describe('OAuth Manager', () => {
  let oauthManager: OAuthManager;
  let mockConfig: OAuthConfig;

  beforeEach(() => {
    mockConfig = {
      google: {
        clientId: 'test-google-client-id',
        clientSecret: 'test-google-client-secret'
      },
      github: {
        clientId: 'test-github-client-id',
        clientSecret: 'test-github-client-secret'
      },
      microsoft: {
        clientId: 'test-microsoft-client-id',
        clientSecret: 'test-microsoft-client-secret'
      }
    };

    oauthManager = new OAuthManager(mockConfig, 'http://localhost:3000');

    // Reset fetch mock
    jest.resetAllMocks();
  });

  afterEach(() => {
    ProviderFactory.clear();
  });

  describe('Provider Management', () => {
    it('should initialize with default providers', () => {
      const providers = oauthManager.getEnabledProviders();
      expect(providers).toContain('google');
      expect(providers).toContain('github');
      expect(providers).toContain('microsoft');
    });

    it('should check if provider is enabled', () => {
      expect(oauthManager.isProviderEnabled('google')).toBe(true);
      expect(oauthManager.isProviderEnabled('github')).toBe(true);
      expect(oauthManager.isProviderEnabled('microsoft')).toBe(true);
      expect(oauthManager.isProviderEnabled('unknown')).toBe(false);
    });

    it('should get provider info', () => {
      const providers = oauthManager.getProviders();
      expect(providers.length).toBeGreaterThan(0);

      const googleProvider = providers.find(p => p.id === 'google');
      expect(googleProvider).toBeDefined();
      expect(googleProvider?.info.name).toBe('Google');
    });
  });

  describe('Authorization URL Generation', () => {
    it('should generate Google authorization URL', async () => {
      const { url, state } = await oauthManager.getAuthorizationUrl('google');

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-google-client-id');
      expect(url).toContain('redirect_uri=http://localhost:3000/auth/callback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=');
      expect(state).toBeDefined();
      expect(state).toHaveLength(32);
    });

    it('should generate GitHub authorization URL', async () => {
      const { url, state } = await oauthManager.getAuthorizationUrl('github');

      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test-github-client-id');
      expect(url).toContain('redirect_uri=http://localhost:3000/auth/callback');
      expect(state).toBeDefined();
    });

    it('should generate Microsoft authorization URL', async () => {
      const { url, state } = await oauthManager.getAuthorizationUrl('microsoft');

      expect(url).toContain('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      expect(url).toContain('client_id=test-microsoft-client-id');
      expect(state).toBeDefined();
    });

    it('should support custom state parameter', async () => {
      const customState = 'my-custom-state-123';
      const { state } = await oauthManager.getAuthorizationUrl('google', { state: customState });

      expect(state).toBe(customState);
    });

    it('should support login hint', async () => {
      const { url } = await oauthManager.getAuthorizationUrl('google', {
        loginHint: 'user@example.com'
      });

      expect(url).toContain('login_hint=user@example.com');
    });

    it('should support prompt parameter', async () => {
      const { url } = await oauthManager.getAuthorizationUrl('google', {
        prompt: 'select_account'
      });

      expect(url).toContain('prompt=select_account');
    });
  });

  describe('Token Exchange', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile'
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse
      });

      const { url, state } = await oauthManager.getAuthorizationUrl('google');

      const result = await oauthManager.handleCallback(state, 'mock-auth-code');

      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle OAuth errors', async () => {
      const { url, state } = await oauthManager.getAuthorizationUrl('google');

      const result = await oauthManager.handleCallback(state, undefined, 'access_denied');

      expect(result.success).toBe(false);
      expect(result.error).toBe('access_denied');
    });

    it('should validate state parameter', async () => {
      const result = await oauthManager.handleCallback('invalid-state', 'mock-code');

      expect(result.success).toBe(false);
      expect(result.error).toContain('session');
    });

    it('should handle expired sessions', async () => {
      const { state } = await oauthManager.getAuthorizationUrl('google');

      // Manually expire the session
      const sessions = oauthManager['sessions'];
      const session = sessions.get(state);
      if (session) {
        session.expiresAt = Date.now() - 1000;
      }

      const result = await oauthManager.handleCallback(state, 'mock-code');

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });
  });

  describe('User Profile', () => {
    it('should fetch Google user profile', async () => {
      const mockProfile = {
        id: '123456789',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg'
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockProfile
      });

      const profile = await oauthManager.getUserProfile('user-123');

      expect(profile).toBeDefined();
      expect(profile?.email).toBe('user@example.com');
      expect(profile?.name).toBe('Test User');
    });

    it('should handle missing user profile', async () => {
      const profile = await oauthManager.getUserProfile('nonexistent-user');

      expect(profile).toBeNull();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token', async () => {
      const mockRefreshResponse = {
        access_token: 'new-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile'
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRefreshResponse
      });

      const newToken = await oauthManager.refreshAccessToken('user-123');

      expect(newToken).toBeDefined();
      expect(newToken).toBe('new-access-token');
    });

    it('should handle refresh failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'invalid_grant' })
      });

      const newToken = await oauthManager.refreshAccessToken('user-123');

      expect(newToken).toBeNull();
    });
  });

  describe('Token Validation', () => {
    it('should validate valid token', async () => {
      // Set up a mock session
      const { state } = await oauthManager.getAuthorizationUrl('google');

      const isValid = await oauthManager.validateToken('user-123');

      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('Logout', () => {
    it('should logout user and revoke token', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true
      });

      await oauthManager.logout('user-123');

      // Verify token is removed
      const profile = await oauthManager.getUserProfile('user-123');
      expect(profile).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should track active sessions', () => {
      const initialCount = oauthManager.getSessionCount();

      oauthManager.getAuthorizationUrl('google');
      oauthManager.getAuthorizationUrl('github');

      expect(oauthManager.getSessionCount()).toBe(initialCount + 2);
    });

    it('should clean up expired sessions', () => {
      oauthManager.getAuthorizationUrl('google');
      oauthManager.cleanupExpiredSessions();

      const count = oauthManager.getSessionCount();
      expect(count).toBe(0);
    });
  });

  describe('State Export/Import', () => {
    it('should export state', () => {
      const state = oauthManager.exportState();

      expect(state).toBeDefined();
      expect(state.sessions).toBeInstanceOf(Array);
      expect(state.tokens).toBeInstanceOf(Array);
      expect(state.profiles).toBeInstanceOf(Array);
    });

    it('should import state', () => {
      const exportedState = {
        sessions: [],
        tokens: [],
        profiles: []
      };

      oauthManager.importState(exportedState);

      const importedState = oauthManager.exportState();
      expect(importedState).toBeDefined();
    });
  });
});

describe('OIDC Service', () => {
  describe('Discovery', () => {
    it('should fetch OIDC configuration', async () => {
      const mockConfig: OIDCConfiguration = {
        issuer: 'https://accounts.google.com',
        authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        token_endpoint: 'https://oauth2.googleapis.com/token',
        userinfo_endpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
        jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
        revocation_endpoint: 'https://oauth2.googleapis.com/revoke',
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        scopes_supported: ['openid', 'email', 'profile'],
        token_endpoint_auth_methods_supported: ['client_secret_post'],
        claims_supported: ['sub', 'email', 'name']
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockConfig
      });

      const config = await OIDCService.fetchDiscovery('https://accounts.google.com');

      expect(config).toBeDefined();
      expect(config.issuer).toBe('https://accounts.google.com');
    });

    it('should handle discovery failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Not Found'
      });

      await expect(
        OIDCService.fetchDiscovery('https://invalid.example.com')
      ).rejects.toThrow();
    });
  });

  describe('ID Token Validation', () => {
    it('should validate ID token claims', async () => {
      const mockIdToken = `header.${btoa(JSON.stringify({
        iss: 'https://accounts.google.com',
        aud: 'test-client-id',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        sub: '123456789',
        email: 'user@example.com',
        name: 'Test User'
      }))}.signature`;

      const claims = await OIDCService.validateIDToken(mockIdToken, {
        issuer: 'https://accounts.google.com',
        audience: 'test-client-id'
      });

      expect(claims).toBeDefined();
      expect(claims.email).toBe('user@example.com');
    });

    it('should reject expired token', async () => {
      const expiredToken = `header.${btoa(JSON.stringify({
        iss: 'https://accounts.google.com',
        aud: 'test-client-id',
        exp: Math.floor(Date.now() / 1000) - 3600,
        iat: Math.floor(Date.now() / 1000) - 7200
      }))}.signature`;

      await expect(
        OIDCService.validateIDToken(expiredToken, {
          issuer: 'https://accounts.google.com',
          audience: 'test-client-id'
        })
      ).rejects.toThrow('expired');
    });

    it('should reject invalid issuer', async () => {
      const invalidToken = `header.${btoa(JSON.stringify({
        iss: 'https://invalid.example.com',
        aud: 'test-client-id',
        exp: Math.floor(Date.now() / 1000) + 3600
      }))}.signature`;

      await expect(
        OIDCService.validateIDToken(invalidToken, {
          issuer: 'https://accounts.google.com',
          audience: 'test-client-id'
        })
      ).rejects.toThrow('issuer');
    });

    it('should reject invalid audience', async () => {
      const invalidToken = `header.${btoa(JSON.stringify({
        iss: 'https://accounts.google.com',
        aud: 'wrong-client-id',
        exp: Math.floor(Date.now() / 1000) + 3600
      }))}.signature`;

      await expect(
        OIDCService.validateIDToken(invalidToken, {
          issuer: 'https://accounts.google.com',
          audience: 'test-client-id'
        })
      ).rejects.toThrow('audience');
    });
  });

  describe('Claims Extraction', () => {
    it('should extract claims from ID token', () => {
      const claims = {
        sub: '123456789',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg'
      };

      const idToken = `header.${btoa(JSON.stringify(claims))}.signature`;

      const extracted = OIDCService.extractClaims(idToken);

      expect(extracted).toEqual(claims);
    });

    it('should handle malformed ID token', () => {
      expect(() => {
        OIDCService.extractClaims('invalid-token');
      }).toThrow();
    });
  });

  describe('UserInfo', () => {
    it('should fetch UserInfo', async () => {
      const mockUserInfo = {
        sub: '123456789',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg'
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUserInfo
      });

      const userInfo = await OIDCService.fetchUserInfo(
        'https://example.com/userinfo',
        'access-token'
      );

      expect(userInfo).toEqual(mockUserInfo);
    });

    it('should handle UserInfo fetch failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized'
      });

      await expect(
        OIDCService.fetchUserInfo('https://example.com/userinfo', 'invalid-token')
      ).rejects.toThrow();
    });
  });

  describe('Nonce', () => {
    it('should generate nonce', () => {
      const nonce1 = OIDCService.generateNonce();
      const nonce2 = OIDCService.generateNonce();

      expect(nonce1).toBeDefined();
      expect(nonce2).toBeDefined();
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toHaveLength(32);
    });
  });

  describe('Claims Parameter', () => {
    it('should build claims parameter', () => {
      const claims = OIDCService.buildClaimsParameter({
        idToken: { email: null, name: null },
        userInfo: { picture: null }
      });

      const parsed = JSON.parse(claims);
      expect(parsed.id_token).toEqual({ email: null, name: null });
      expect(parsed.userinfo).toEqual({ picture: null });
    });
  });
});

describe('Account Linking Service', () => {
  let accountLinking: AccountLinkingService;
  let oauthManager: OAuthManager;

  beforeEach(() => {
    oauthManager = new OAuthManager({
      google: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret'
      }
    });

    accountLinking = new AccountLinkingService(oauthManager);
  });

  describe('Account Creation', () => {
    it('should create new account', async () => {
      const { account, created } = await accountLinking.createOrGetAccount(
        'google',
        '123456789',
        {
          email: 'user@example.com',
          name: 'Test User',
          picture: 'https://example.com/photo.jpg'
        }
      );

      expect(created).toBe(true);
      expect(account).toBeDefined();
      expect(account.email).toBe('user@example.com');
      expect(account.name).toBe('Test User');
      expect(account.linkedAccounts).toHaveLength(1);
    });

    it('should return existing account', async () => {
      const profile = {
        email: 'user@example.com',
        name: 'Test User'
      };

      await accountLinking.createOrGetAccount('google', '123456789', profile);

      const { account, created } = await accountLinking.createOrGetAccount(
        'google',
        '123456789',
        profile
      );

      expect(created).toBe(false);
      expect(account.linkedAccounts).toHaveLength(1);
    });
  });

  describe('Provider Linking', () => {
    it('should link provider to existing account by email', async () => {
      const profile = {
        email: 'user@example.com',
        name: 'Test User'
      };

      await accountLinking.createOrGetAccount('google', '123456789', profile);

      const { account, created } = await accountLinking.createOrGetAccount(
        'github',
        '987654321',
        { ...profile, name: 'GitHub User' }
      );

      expect(created).toBe(false);
      expect(account.linkedAccounts).toHaveLength(2);
      expect(account.linkedAccounts.some(la => la.provider === 'github')).toBe(true);
    });

    it('should prevent duplicate provider links', async () => {
      const profile = {
        email: 'user@example.com',
        name: 'Test User'
      };

      await accountLinking.createOrGetAccount('google', '123456789', profile);

      const { account, created } = await accountLinking.createOrGetAccount(
        'google',
        '123456789',
        profile
      );

      expect(created).toBe(false);
      expect(account.linkedAccounts).toHaveLength(1);
    });

    it('should prevent linking provider to multiple accounts', async () => {
      const profile1 = {
        email: 'user1@example.com',
        name: 'User One'
      };

      const profile2 = {
        email: 'user2@example.com',
        name: 'User Two'
      };

      await accountLinking.createOrGetAccount('google', '123456789', profile1);
      await accountLinking.createOrGetAccount('github', '987654321', profile2);

      await expect(
        accountLinking.linkProviderToAccount('user_123', {
          id: 'google:123456789',
          provider: 'google',
          providerUserId: '123456789',
          email: 'user1@example.com',
          name: 'User One'
        })
      ).rejects.toThrow('already linked');
    });
  });

  describe('Provider Unlinking', () => {
    it('should unlink provider from account', async () => {
      const profile = {
        email: 'user@example.com',
        name: 'Test User'
      };

      const { account } = await accountLinking.createOrGetAccount('google', '123456789', profile);

      await accountLinking.createOrGetAccount('github', '987654321', profile);

      await accountLinking.unlinkProvider(account.id, 'github', '987654321');

      expect(accountLinking.isProviderLinked(account.id, 'github')).toBe(false);
    });

    it('should prevent unlinking primary provider if only one', async () => {
      const profile = {
        email: 'user@example.com',
        name: 'Test User'
      };

      const { account } = await accountLinking.createOrGetAccount('google', '123456789', profile);

      await expect(
        accountLinking.unlinkProvider(account.id, 'google', '123456789')
      ).rejects.toThrow('only provider');
    });
  });

  describe('Account Lookup', () => {
    it('should find account by provider', async () => {
      const profile = {
        email: 'user@example.com',
        name: 'Test User'
      };

      const { account } = await accountLinking.createOrGetAccount('google', '123456789', profile);

      const found = accountLinking.findAccountByProvider('google', '123456789');

      expect(found).toBeDefined();
      expect(found?.id).toBe(account.id);
    });

    it('should find accounts by email', async () => {
      const profile = {
        email: 'user@example.com',
        name: 'Test User'
      };

      await accountLinking.createOrGetAccount('google', '123456789', profile);

      const found = accountLinking.findAccountsByEmail('user@example.com');

      expect(found).toHaveLength(1);
      expect(found[0].email).toBe('user@example.com');
    });
  });

  describe('Account Merging', () => {
    it('should merge two accounts', async () => {
      const profile1 = {
        email: 'user1@example.com',
        name: 'User One'
      };

      const profile2 = {
        email: 'user2@example.com',
        name: 'User Two'
      };

      const { account: account1 } = await accountLinking.createOrGetAccount('google', '123456789', profile1);
      const { account: account2 } = await accountLinking.createOrGetAccount('github', '987654321', profile2);

      const merged = await accountLinking.mergeAccounts(account1.id, account2.id);

      expect(merged.linkedAccounts).toHaveLength(2);
      expect(accountLinking.getAccount(account2.id)).toBeNull();
    });
  });

  describe('Account Update', () => {
    it('should update account profile', async () => {
      const profile = {
        email: 'user@example.com',
        name: 'Test User'
      };

      const { account } = await accountLinking.createOrGetAccount('google', '123456789', profile);

      const updated = accountLinking.updateAccount(account.id, {
        name: 'Updated Name'
      });

      expect(updated?.name).toBe('Updated Name');
    });
  });

  describe('Statistics', () => {
    it('should get statistics', async () => {
      const profile = {
        email: 'user@example.com',
        name: 'Test User'
      };

      await accountLinking.createOrGetAccount('google', '123456789', profile);

      const stats = accountLinking.getStats();

      expect(stats.totalAccounts).toBe(1);
      expect(stats.totalLinks).toBe(1);
      expect(stats.providerDistribution).toEqual({
        google: 1
      });
    });
  });
});

describe('Authorization Code Flow', () => {
  let authFlow: AuthorizationCodeFlow;
  let oauthManager: OAuthManager;

  beforeEach(() => {
    oauthManager = new OAuthManager({
      google: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret'
      }
    });

    authFlow = oauthManager.getAuthorizationFlow();
  });

  describe('Authorization URL', () => {
    it('should generate authorization URL', async () => {
      const { url, state } = await authFlow.generateAuthorizationUrl({
        providerId: 'google',
        redirectUri: 'http://localhost:3000/callback'
      });

      expect(url).toBeDefined();
      expect(state).toBeDefined();
      expect(url).toContain('client_id');
      expect(url).toContain('redirect_uri');
    });
  });

  describe('Token Exchange', () => {
    it('should exchange code for token', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse
      });

      const token = await authFlow.exchangeCodeForToken('google', {
        code: 'test-code',
        redirectUri: 'http://localhost:3000/callback'
      });

      expect(token.accessToken).toBe('test-access-token');
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token', async () => {
      const mockRefreshResponse = {
        access_token: 'new-access-token',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRefreshResponse
      });

      const token = await authFlow.refreshAccessToken('google', {
        refreshToken: 'test-refresh-token'
      });

      expect(token.accessToken).toBe('new-access-token');
    });
  });

  describe('Response Parsing', () => {
    it('should parse authorization response', () => {
      const callbackUrl = 'http://localhost:3000/callback?code=test-code&state=test-state';

      const response = authFlow.parseAuthorizationResponse(callbackUrl);

      expect(response.code).toBe('test-code');
      expect(response.state).toBe('test-state');
    });

    it('should parse error response', () => {
      const errorUrl = 'http://localhost:3000/callback?error=access_denied&error_description=User denied';

      const response = authFlow.parseAuthorizationResponse(errorUrl);

      expect(response.error).toBe('access_denied');
      expect(response.errorDescription).toBe('User denied');
    });
  });

  describe('Token Expiration', () => {
    it('should check if token is expired', () => {
      const expiredDate = new Date(Date.now() - 1000);
      const validDate = new Date(Date.now() + 3600000);

      expect(authFlow.isTokenExpired(expiredDate)).toBe(true);
      expect(authFlow.isTokenExpired(validDate)).toBe(false);
    });

    it('should calculate token expiration', () => {
      const expiration = authFlow.calculateTokenExpiration(3600);

      expect(expiration.getTime()).toBeGreaterThan(Date.now());
      expect(expiration.getTime()).toBeLessThan(Date.now() + 3700000);
    });
  });
});

describe('Device Code Flow', () => {
  let deviceFlow: DeviceCodeFlow;
  let oauthManager: OAuthManager;

  beforeEach(() => {
    oauthManager = new OAuthManager({
      microsoft: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret'
      }
    });

    deviceFlow = oauthManager.getDeviceFlow();
  });

  describe('Device Authorization', () => {
    it('should request device authorization', async () => {
      const mockDeviceResponse = {
        device_code: 'test-device-code',
        user_code: 'ABCD-1234',
        verification_uri: 'https://microsoft.com/devicelogin',
        expires_in: 900,
        interval: 5
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockDeviceResponse
      });

      const response = await deviceFlow.requestDeviceAuthorization({
        providerId: 'microsoft'
      });

      expect(response.deviceCode).toBe('test-device-code');
      expect(response.userCode).toBe('ABCD-1234');
      expect(response.verificationUri).toBeDefined();
    });

    it('should format user code', () => {
      const formatted = deviceFlow.formatUserCode('ABCD1234');

      expect(formatted).toBe('ABCD-1234');
    });

    it('should generate display instructions', () => {
      const mockResponse = {
        deviceCode: 'test-device-code',
        userCode: 'ABCD1234',
        verificationUri: 'https://example.com/verify',
        expiresIn: 900,
        interval: 5
      };

      const instructions = deviceFlow.generateDisplayInstructions(mockResponse, 'Test Provider');

      expect(instructions).toContain('ABCD-1234');
      expect(instructions).toContain('https://example.com/verify');
      expect(instructions).toContain('Test Provider');
    });
  });

  describe('Token Polling', () => {
    it('should poll for token', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse
      });

      // Mock polling to return immediately
      jest.spyOn(deviceFlow as any, 'requestDeviceToken').mockResolvedValue(mockTokenResponse);

      const token = await deviceFlow.pollForToken('microsoft', {
        deviceCode: 'test-device-code',
        interval: 1,
        maxAttempts: 1
      });

      expect(token.accessToken).toBe('test-access-token');
    });

    it('should handle polling timeout', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'authorization_pending' })
      });

      await expect(
        deviceFlow.pollForToken('microsoft', {
          deviceCode: 'test-device-code',
          interval: 1,
          maxAttempts: 1
        })
      ).rejects.toThrow('timed out');
    });
  });

  describe('Device Flow Support', () => {
    it('should check if provider supports device flow', () => {
      expect(deviceFlow.supportsDeviceFlow('microsoft')).toBe(true);
      expect(deviceFlow.supportsDeviceFlow('google')).toBe(false);
    });
  });

  describe('Poll Cancellation', () => {
    it('should cancel active poll', () => {
      const abortController = new AbortController();
      jest.spyOn(deviceFlow['activePolls'], 'set').mockReturnValue(abortController);

      deviceFlow.cancelPoll('test-device-code');

      // Verify cancellation logic
      expect(deviceFlow.getActivePollCount()).toBe(0);
    });

    it('should cancel all active polls', () => {
      deviceFlow.cancelAllPolls();

      expect(deviceFlow.getActivePollCount()).toBe(0);
    });
  });
});
