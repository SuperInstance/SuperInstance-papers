/**
 * OAuth Manager
 *
 * Central manager for OAuth 2.0 authentication flows.
 * Manages multiple providers, token lifecycle, and user sessions.
 */

import { ProviderFactory, Provider, ProviderType } from './Providers';
import { GoogleProvider } from './Providers/google';
import { GitHubProvider } from './Providers/github';
import { MicrosoftProvider } from './Providers/microsoft';
import { CustomProvider } from './Providers/CustomProvider';

export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type: string;
  scope: string;
  provider: ProviderType;
}

export interface OAuthSession {
  state: string;
  codeVerifier?: string;
  provider: ProviderType;
  redirectUri: string;
  createdAt: number;
  expiresAt: number;
}

export interface OAuthUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: ProviderType;
  rawProfile: any;
}

export interface OAuthConfig {
  google?: {
    clientId: string;
    clientSecret: string;
  };
  github?: {
    clientId: string;
    clientSecret: string;
  };
  microsoft?: {
    clientId: string;
    clientSecret: string;
  };
  custom?: {
    [key: string]: {
      clientId: string;
      clientSecret: string;
      endpoints: {
        authorization: string;
        token: string;
        userInfo?: string;
      };
    };
  };
}

export class OAuthManager {
  private sessions = new Map<string, OAuthSession>();
  private tokens = new Map<string, OAuthToken>();
  private profiles = new Map<string, OAuthUserProfile>();
  private baseUrl: string;

  constructor(config: OAuthConfig, baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.initializeProviders(config);
  }

  /**
   * Initialize OAuth providers from configuration
   */
  private initializeProviders(config: OAuthConfig): void {
    const redirectUri = `${this.baseUrl}/auth/callback`;

    // Initialize Google
    if (config.google) {
      ProviderFactory.createAndRegister('google', {
        type: 'google',
        config: {
          clientId: config.google.clientId,
          clientSecret: config.google.clientSecret,
          redirectUri
        }
      });
    }

    // Initialize GitHub
    if (config.github) {
      ProviderFactory.createAndRegister('github', {
        type: 'github',
        config: {
          clientId: config.github.clientId,
          clientSecret: config.github.clientSecret,
          redirectUri
        }
      });
    }

    // Initialize Microsoft
    if (config.microsoft) {
      ProviderFactory.createAndRegister('microsoft', {
        type: 'microsoft',
        config: {
          clientId: config.microsoft.clientId,
          clientSecret: config.microsoft.clientSecret,
          redirectUri
        }
      });
    }

    // Initialize custom providers
    if (config.custom) {
      Object.entries(config.custom).forEach(([id, providerConfig]) => {
        ProviderFactory.createAndRegister(id, {
          type: 'custom',
          config: {
            clientId: providerConfig.clientId,
            clientSecret: providerConfig.clientSecret,
            redirectUri,
            endpoints: providerConfig.endpoints,
            pkce: true
          }
        });
      });
    }
  }

  /**
   * Generate authorization URL
   */
  async getAuthorizationUrl(
    providerId: string,
    options: {
      state?: string;
      loginHint?: string;
      prompt?: string;
      domainHint?: string;
    } = {}
  ): Promise<{ url: string; state: string; codeVerifier?: string }> {
    const provider = ProviderFactory.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const state = options.state || this.generateState();
    const codeVerifier = provider instanceof GoogleProvider ||
                         provider instanceof MicrosoftProvider ||
                         (provider instanceof CustomProvider && provider['config']?.pkce)
      ? this.generateCodeVerifier()
      : undefined;

    const url = provider.getAuthorizationUrl({
      state,
      codeVerifier,
      loginHint: options.loginHint,
      prompt: options.prompt,
      domainHint: options.domainHint
    });

    // Store session
    this.sessions.set(state, {
      state,
      codeVerifier,
      provider: providerId as ProviderType,
      redirectUri: `${this.baseUrl}/auth/callback`,
      createdAt: Date.now(),
      expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
    });

    return { url, state, codeVerifier };
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(
    state: string,
    code: string,
    error?: string
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    // Check for errors
    if (error) {
      return { success: false, error };
    }

    // Get session
    const session = this.sessions.get(state);
    if (!session) {
      return { success: false, error: 'Invalid or expired session' };
    }

    // Check expiration
    if (session.expiresAt < Date.now()) {
      this.sessions.delete(state);
      return { success: false, error: 'Session expired' };
    }

    // Get provider
    const provider = ProviderFactory.get(session.provider);
    if (!provider) {
      return { success: false, error: 'Provider not found' };
    }

    try {
      // Exchange code for tokens
      const tokens = await provider.exchangeCodeForTokens(code, session.codeVerifier);

      // Store token
      const userId = `${session.provider}:${tokens.access_token.substring(0, 10)}`;
      this.tokens.set(userId, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Date.now() + (tokens.expires_in * 1000),
        token_type: tokens.token_type,
        scope: tokens.scope,
        provider: session.provider
      });

      // Fetch user profile
      const profile = await provider.getUserProfile(tokens.access_token);
      const userProfile: OAuthUserProfile = {
        id: profile.id || profile.login,
        email: profile.email || profile.userPrincipalName,
        name: profile.name || profile.displayName || profile.login,
        picture: profile.picture || profile.avatar_url,
        provider: session.provider,
        rawProfile: profile
      };
      this.profiles.set(userId, userProfile);

      // Clean up session
      this.sessions.delete(state);

      return { success: true, userId };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(userId: string): Promise<string | null> {
    const token = this.tokens.get(userId);
    if (!token || !token.refresh_token) {
      return null;
    }

    const provider = ProviderFactory.get(token.provider);
    if (!provider) {
      return null;
    }

    try {
      const newTokens = await provider.refreshAccessToken(token.refresh_token);

      // Update token
      this.tokens.set(userId, {
        ...token,
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || token.refresh_token,
        expires_at: Date.now() + (newTokens.expires_in * 1000)
      });

      return newTokens.access_token;
    } catch {
      return null;
    }
  }

  /**
   * Get valid access token
   */
  async getAccessToken(userId: string): Promise<string | null> {
    const token = this.tokens.get(userId);
    if (!token) {
      return null;
    }

    // Check if token is expired
    if (token.expires_at < Date.now()) {
      // Try to refresh
      return this.refreshAccessToken(userId);
    }

    return token.access_token;
  }

  /**
   * Get user profile
   */
  getUserProfile(userId: string): OAuthUserProfile | null {
    return this.profiles.get(userId) || null;
  }

  /**
   * Revoke token and logout
   */
  async logout(userId: string): Promise<void> {
    const token = this.tokens.get(userId);
    if (!token) {
      return;
    }

    const provider = ProviderFactory.get(token.provider);
    if (provider && typeof provider.revokeToken === 'function') {
      await provider.revokeToken(token.access_token);
    }

    this.tokens.delete(userId);
    this.profiles.delete(userId);
  }

  /**
   * Validate token
   */
  async validateToken(userId: string): Promise<boolean> {
    const token = this.tokens.get(userId);
    if (!token) {
      return false;
    }

    // Check expiration
    if (token.expires_at < Date.now()) {
      // Try to refresh
      const newToken = await this.refreshAccessToken(userId);
      return newToken !== null;
    }

    return true;
  }

  /**
   * Get provider info
   */
  getProviders(): Array<{ id: string; info: any }> {
    return ProviderFactory.getAllProviderInfo();
  }

  /**
   * Get enabled providers
   */
  getEnabledProviders(): string[] {
    return Array.from(ProviderFactory.getAll().keys());
  }

  /**
   * Check if provider is enabled
   */
  isProviderEnabled(providerId: string): boolean {
    return ProviderFactory.has(providerId);
  }

  /**
   * Generate state parameter
   */
  private generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate code verifier for PKCE
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [state, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(state);
      }
    }
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get user count
   */
  getUserCount(): number {
    return this.tokens.size;
  }

  /**
   * Export state (for persistence)
   */
  exportState(): {
    sessions: Array<[string, OAuthSession]>;
    tokens: Array<[string, OAuthToken]>;
    profiles: Array<[string, OAuthUserProfile]>;
  } {
    return {
      sessions: Array.from(this.sessions.entries()),
      tokens: Array.from(this.tokens.entries()),
      profiles: Array.from(this.profiles.entries())
    };
  }

  /**
   * Import state (for restoration)
   */
  importState(state: {
    sessions: Array<[string, OAuthSession]>;
    tokens: Array<[string, OAuthToken]>;
    profiles: Array<[string, OAuthUserProfile]>;
  }): void {
    this.sessions = new Map(state.sessions);
    this.tokens = new Map(state.tokens);
    this.profiles = new Map(state.profiles);
  }
}
