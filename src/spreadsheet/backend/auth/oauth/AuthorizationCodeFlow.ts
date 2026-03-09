/**
 * Authorization Code Flow
 *
 * Implements OAuth 2.0 Authorization Code Flow:
 * - Generate authorization URL
 * - Handle callback
 * - Exchange code for tokens
 * - Token refresh flow
 */

import { ProviderFactory, ProviderType } from './Providers';
import { OAuthManager } from './OAuthManager';

export interface AuthorizationRequest {
  providerId: string;
  redirectUri: string;
  scope?: string[];
  state?: string;
  codeVerifier?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'plain' | 'S256';
  prompt?: 'none' | 'login' | 'consent' | 'select_account';
  loginHint?: string;
  maxAge?: number;
  uiLocales?: string;
  claims?: string;
  extras?: Record<string, string>;
}

export interface AuthorizationResponse {
  code: string;
  state: string;
  error?: string;
  errorDescription?: string;
  errorUri?: string;
}

export interface TokenRequest {
  code: string;
  redirectUri: string;
  codeVerifier?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string;
  scope?: string;
  idToken?: string;
  expiresIn?: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  scope?: string;
  clientId?: string;
  clientSecret?: string;
}

export class AuthorizationCodeFlow {
  constructor(private oauthManager: OAuthManager) {}

  /**
   * Generate authorization URL
   */
  async generateAuthorizationUrl(request: AuthorizationRequest): Promise<{
    url: string;
    state: string;
    codeVerifier?: string;
  }> {
    const provider = ProviderFactory.get(request.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${request.providerId}`);
    }

    // Generate state if not provided
    const state = request.state || this.generateState();

    // Generate PKCE code verifier if provider supports it
    const codeVerifier = request.codeVerifier || this.shouldUsePKCE(request.providerId)
      ? this.generateCodeVerifier()
      : undefined;

    // Generate authorization URL
    const url = provider.getAuthorizationUrl({
      state,
      codeVerifier,
      loginHint: request.loginHint,
      prompt: request.prompt
    });

    return { url, state, codeVerifier };
  }

   /**
   * Handle authorization response (callback)
   */
  async handleAuthorizationResponse(
    response: AuthorizationResponse,
    sessionData: {
      state: string;
      codeVerifier?: string;
      redirectUri: string;
      providerId: string;
    }
  ): Promise<TokenResponse> {
    // Validate state
    if (response.state !== sessionData.state) {
      throw new Error('Invalid state parameter');
    }

    // Check for errors
    if (response.error) {
      throw new Error(`OAuth error: ${response.error} - ${response.errorDescription}`);
    }

    // Exchange code for tokens
    return this.exchangeCodeForToken(
      sessionData.providerId,
      {
        code: response.code,
        redirectUri: sessionData.redirectUri,
        codeVerifier: sessionData.codeVerifier
      }
    );
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(
    providerId: string,
    request: TokenRequest
  ): Promise<TokenResponse> {
    const provider = ProviderFactory.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const tokens = await provider.exchangeCodeForTokens(
      request.code,
      request.codeVerifier
    );

    return {
      accessToken: tokens.access_token,
      tokenType: tokens.token_type,
      expiresIn: tokens.expires_in,
      refreshToken: tokens.refresh_token,
      scope: tokens.scope,
      idToken: (tokens as any).id_token
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    providerId: string,
    request: RefreshTokenRequest
  ): Promise<TokenResponse> {
    const provider = ProviderFactory.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const tokens = await provider.refreshAccessToken(request.refreshToken);

    return {
      accessToken: tokens.access_token,
      tokenType: tokens.token_type,
      expiresIn: tokens.expires_in,
      refreshToken: tokens.refresh_token || request.refreshToken,
      scope: tokens.scope,
      idToken: (tokens as any).id_token
    };
  }

  /**
   * Build full redirect URL with parameters
   */
  buildRedirectUrl(
    baseUrl: string,
    params: Record<string, string>
  ): string {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    return url.toString();
  }

  /**
   * Parse authorization response from URL
   */
  parseAuthorizationResponse(url: string): AuthorizationResponse {
    const parsedUrl = new URL(url);

    return {
      code: parsedUrl.searchParams.get('code') || '',
      state: parsedUrl.searchParams.get('state') || '',
      error: parsedUrl.searchParams.get('error') || undefined,
      errorDescription: parsedUrl.searchParams.get('error_description') || undefined,
      errorUri: parsedUrl.searchParams.get('error_uri') || undefined
    };
  }

  /**
   * Validate authorization response
   */
  validateAuthorizationResponse(response: AuthorizationResponse): {
    valid: boolean;
    error?: string;
  } {
    // Check if code is present
    if (!response.code) {
      return {
        valid: false,
        error: response.errorDescription || response.error || 'No authorization code received'
      };
    }

    // Check if state is present
    if (!response.state) {
      return {
        valid: false,
        error: 'State parameter missing'
      };
    }

    return { valid: true };
  }

  /**
   * Should use PKCE for this provider
   */
  private shouldUsePKCE(providerId: string): boolean {
    const provider = ProviderFactory.get(providerId);

    if (!provider) {
      return false;
    }

    // Google, Microsoft, and custom providers support PKCE
    return providerId === 'google' ||
           providerId === 'microsoft' ||
           providerId.startsWith('custom_');
  }

  /**
   * Generate secure state parameter
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
   * Calculate token expiration date
   */
  calculateTokenExpiration(expiresIn: number): Date {
    return new Date(Date.now() + expiresIn * 1000);
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(expiresAt: Date, bufferSeconds: number = 300): boolean {
    return new Date(Date.now() + bufferSeconds * 1000) >= expiresAt;
  }

  /**
   * Should refresh token
   */
  shouldRefreshToken(expiresAt: Date, bufferSeconds: number = 300): boolean {
    return this.isTokenExpired(expiresAt, bufferSeconds);
  }

  /**
   * Build error redirect URL
   */
  buildErrorRedirectUrl(
    redirectUri: string,
    error: string,
    errorDescription?: string,
    state?: string
  ): string {
    const params: Record<string, string> = {
      error,
      ...(errorDescription && { error_description: errorDescription }),
      ...(state && { state })
    };

    return this.buildRedirectUrl(redirectUri, params);
  }

  /**
   * Build success redirect URL
   */
  buildSuccessRedirectUrl(
    redirectUri: string,
    code: string,
    state: string
  ): string {
    return this.buildRedirectUrl(redirectUri, {
      code,
      state
    });
  }
}
