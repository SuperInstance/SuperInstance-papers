/**
 * Google OAuth 2.0 Provider Configuration
 *
 * Supports:
 * - Google OAuth 2.0 authorization
 * - OpenID Connect
 * - Google Identity Platform
 * - PKCE flow
 */

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

export interface GoogleUser {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
  hd?: string; // hosted domain
}

export class GoogleProvider {
  private config: GoogleOAuthConfig;

  readonly endpoints = {
    authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    userInfo: 'https://www.googleapis.com/oauth2/v2/userinfo',
    revoke: 'https://oauth2.googleapis.com/revoke',
    discovery: 'https://accounts.google.com/.well-known/openid-configuration'
  };

  readonly defaultScopes = [
    'openid',
    'email',
    'profile'
  ];

  constructor(config: GoogleOAuthConfig) {
    this.config = {
      ...config,
      scopes: config.scopes || this.defaultScopes
    };
  }

  /**
   * Generate authorization URL
   */
  getAuthorizationUrl(params: {
    state: string;
    codeVerifier?: string;
    loginHint?: string;
    prompt?: 'none' | 'consent' | 'select_account';
    accessType?: 'online' | 'offline';
  }): string {
    const { state, codeVerifier, loginHint, prompt = 'consent', accessType = 'offline' } = params;

    const queryParams = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes!.join(' '),
      state,
      prompt,
      access_type: accessType
    });

    if (codeVerifier) {
      // PKCE code challenge (SHA256)
      const challenge = this.generateCodeChallenge(codeVerifier);
      queryParams.append('code_challenge', challenge);
      queryParams.append('code_challenge_method', 'S256');
    }

    if (loginHint) {
      queryParams.append('login_hint', loginHint);
    }

    return `${this.endpoints.authorization}?${queryParams.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, codeVerifier?: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    id_token?: string;
    token_type: string;
    scope: string;
  }> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri
    });

    if (codeVerifier) {
      body.append('code_verifier', codeVerifier);
    }

    const response = await fetch(this.endpoints.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    token_type: string;
    scope: string;
  }> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const response = await fetch(this.endpoints.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  /**
   * Fetch user profile
   */
  async getUserProfile(accessToken: string): Promise<GoogleUser> {
    const response = await fetch(`${this.endpoints.userInfo}?alt=json`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Revoke token
   */
  async revokeToken(token: string): Promise<void> {
    await fetch(`${this.endpoints.revoke}?token=${token}`, {
      method: 'POST'
    });
  }

  /**
   * Get OpenID Connect configuration
   */
  async getOIDCConfiguration(): Promise<{
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint: string;
    revocation_endpoint: string;
    jwks_uri: string;
    response_types_supported: string[];
    subject_types_supported: string[];
    id_token_signing_alg_values_supported: string[];
    scopes_supported: string[];
    token_endpoint_auth_methods_supported: string[];
    claims_supported: string[];
  }> {
    const response = await fetch(this.endpoints.discovery);
    return response.json();
  }

  /**
   * Generate code challenge for PKCE
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    // Convert to base64url encoding
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);

    return this.base64UrlEncode(new Uint8Array(digest));
  }

  /**
   * Generate code verifier for PKCE
   */
  static generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return GoogleProvider.base64UrlEncode(array);
  }

  /**
   * Base64URL encode
   */
  private static base64UrlEncode(data: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...data));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private base64UrlEncode(data: Uint8Array): string {
    return GoogleProvider.base64UrlEncode(data);
  }

  /**
   * Validate ID token
   */
  async validateIdToken(idToken: string): Promise<any> {
    // For full validation, you would:
    // 1. Fetch JWKS from Google
    // 2. Verify signature
    // 3. Verify claims (iss, aud, exp, etc.)

    // For now, just decode without verification
    // In production, use a proper JWT library
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid ID token format');
    }

    const payload = JSON.parse(atob(parts[1]));

    // Basic validation
    if (payload.iss !== 'https://accounts.google.com') {
      throw new Error('Invalid issuer');
    }

    if (payload.aud !== this.config.clientId) {
      throw new Error('Invalid audience');
    }

    if (payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    return payload;
  }

  /**
   * Get provider info for UI
   */
  getProviderInfo() {
    return {
      id: 'google',
      name: 'Google',
      icon: 'google',
      color: '#4285f4',
      scopes: this.config.scopes,
      features: {
        openid: true,
        offline: true,
        linking: true
      }
    };
  }
}
