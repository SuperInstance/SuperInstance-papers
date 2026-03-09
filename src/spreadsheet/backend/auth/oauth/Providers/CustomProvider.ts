/**
 * Custom OAuth 2.0/OIDC Provider
 *
 * Supports any OAuth 2.0 compliant provider:
 * - Keycloak
 * - Auth0
 * - Okta
 * - Custom implementations
 * - Self-hosted OAuth servers
 */

export interface CustomOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
  endpoints: {
    authorization: string;
    token: string;
    userInfo?: string;
    discovery?: string;
    revocation?: string;
    jwks?: string;
  };
  issuer?: string;
  audience?: string;
  pkce: boolean;
  tokenEndpointAuth: 'client_secret_post' | 'client_secret_basic' | 'none';
  userInfoHeaders?: Record<string, string>;
  claims?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface CustomUser {
  [key: string]: any;
}

export class CustomProvider {
  private config: CustomOAuthConfig;

  readonly defaultScopes = ['openid', 'email', 'profile'];

  constructor(config: CustomOAuthConfig) {
    this.config = {
      ...config,
      scopes: config.scopes || this.defaultScopes,
      pkce: config.pkce ?? true
    };

    // Auto-discover endpoints if discovery URL is provided
    if (this.config.endpoints.discovery) {
      this.discoverEndpoints();
    }
  }

  /**
   * Discover endpoints from OpenID Connect metadata
   */
  private async discoverEndpoints(): Promise<void> {
    try {
      const response = await fetch(this.config.endpoints.discovery!);
      const metadata = await response.json();

      // Update endpoints from discovery
      if (metadata.authorization_endpoint) {
        this.config.endpoints.authorization = metadata.authorization_endpoint;
      }
      if (metadata.token_endpoint) {
        this.config.endpoints.token = metadata.token_endpoint;
      }
      if (metadata.userinfo_endpoint) {
        this.config.endpoints.userInfo = metadata.userinfo_endpoint;
      }
      if (metadata.jwks_uri) {
        this.config.endpoints.jwks = metadata.jwks_uri;
      }
      if (metadata.revocation_endpoint) {
        this.config.endpoints.revocation = metadata.revocation_endpoint;
      }

      // Store issuer
      this.config.issuer = metadata.issuer;
    } catch (error) {
      console.warn('Failed to discover OAuth endpoints:', error);
    }
  }

  /**
   * Generate authorization URL
   */
  getAuthorizationUrl(params: {
    state: string;
    codeVerifier?: string;
    prompt?: string;
    loginHint?: string;
    maxAge?: number;
    uiLocales?: string;
    claims?: string;
    extraParams?: Record<string, string>;
  }): string {
    const {
      state,
      codeVerifier,
      prompt,
      loginHint,
      maxAge,
      uiLocales,
      claims,
      extraParams
    } = params;

    const queryParams = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes!.join(' '),
      state
    });

    if (codeVerifier && this.config.pkce) {
      const challenge = this.generateCodeChallenge(codeVerifier);
      queryParams.append('code_challenge', challenge);
      queryParams.append('code_challenge_method', 'S256');
    }

    if (prompt) {
      queryParams.append('prompt', prompt);
    }

    if (loginHint) {
      queryParams.append('login_hint', loginHint);
    }

    if (maxAge) {
      queryParams.append('max_age', maxAge.toString());
    }

    if (uiLocales) {
      queryParams.append('ui_locales', uiLocales);
    }

    if (claims) {
      queryParams.append('claims', claims);
    }

    // Add custom parameters
    if (extraParams) {
      Object.entries(extraParams).forEach(([key, value]) => {
        queryParams.append(key, value);
      });
    }

    return `${this.config.endpoints.authorization}?${queryParams.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier?: string
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    id_token?: string;
    token_type: string;
    scope: string;
  }> {
    const body = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri
    });

    // Add authentication
    if (this.config.tokenEndpointAuth === 'client_secret_basic') {
      // Will be added via Authorization header
    } else if (this.config.tokenEndpointAuth === 'client_secret_post') {
      body.append('client_id', this.config.clientId);
      body.append('client_secret', this.config.clientSecret);
    }

    if (codeVerifier && this.config.pkce) {
      body.append('code_verifier', codeVerifier);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };

    // Add basic auth if configured
    if (this.config.tokenEndpointAuth === 'client_secret_basic') {
      headers['Authorization'] = 'Basic ' + btoa(`${this.config.clientId}:${this.config.clientSecret}`);
    }

    const response = await fetch(this.config.endpoints.token, {
      method: 'POST',
      headers,
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
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  }> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    // Add authentication
    if (this.config.tokenEndpointAuth === 'client_secret_basic') {
      // Will be added via Authorization header
    } else if (this.config.tokenEndpointAuth === 'client_secret_post') {
      body.append('client_id', this.config.clientId);
      body.append('client_secret', this.config.clientSecret);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };

    if (this.config.tokenEndpointAuth === 'client_secret_basic') {
      headers['Authorization'] = 'Basic ' + btoa(`${this.config.clientId}:${this.config.clientSecret}`);
    }

    const response = await fetch(this.config.endpoints.token, {
      method: 'POST',
      headers,
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
  async getUserProfile(accessToken: string): Promise<CustomUser> {
    if (!this.config.endpoints.userInfo) {
      // If no userInfo endpoint, try to decode from ID token
      throw new Error('User info endpoint not configured');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      ...this.config.userInfoHeaders
    };

    const response = await fetch(this.config.endpoints.userInfo, {
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Revoke token
   */
  async revokeToken(token: string, tokenType: 'access_token' | 'refresh_token' = 'access_token'): Promise<void> {
    if (!this.config.endpoints.revocation) {
      console.warn('Revocation endpoint not configured');
      return;
    }

    const body = new URLSearchParams({
      token,
      token_type_hint: tokenType,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    await fetch(this.config.endpoints.revocation, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
  }

  /**
   * Validate ID token (basic validation)
   */
  async validateIdToken(idToken: string): Promise<any> {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid ID token format');
    }

    const payload = JSON.parse(atob(parts[1]));

    // Basic validation
    if (this.config.issuer && payload.iss !== this.config.issuer) {
      throw new Error('Invalid issuer');
    }

    if (this.config.audience && payload.aud !== this.config.audience) {
      throw new Error('Invalid audience');
    }

    if (payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    return payload;
  }

  /**
   * Fetch JWKS for token signature verification
   */
  async getJWKS(): Promise<{
    keys: Array<{
      kty: string;
      kid: string;
      use: string;
      alg: string;
      n: string;
      e: string;
    }>;
  }> {
    if (!this.config.endpoints.jwks) {
      throw new Error('JWKS endpoint not configured');
    }

    const response = await fetch(this.config.endpoints.jwks);
    return response.json();
  }

  /**
   * Introspect token (RFC 7662)
   */
  async introspectToken(token: string): Promise<{
    active: boolean;
    scope?: string;
    client_id?: string;
    username?: string;
    exp?: number;
    iat?: number;
    sub?: string;
    aud?: string;
    iss?: string;
    token_type?: string;
  }> {
    const body = new URLSearchParams({
      token,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    const response = await fetch(`${this.config.endpoints.token}/introspect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      throw new Error(`Token introspection failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate code challenge for PKCE
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
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
    return CustomProvider.base64UrlEncode(array);
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
    return CustomProvider.base64UrlEncode(data);
  }

  /**
   * Get provider info for UI
   */
  getProviderInfo() {
    const url = new URL(this.config.endpoints.authorization);
    const domain = url.hostname;

    return {
      id: 'custom',
      name: 'Custom Provider',
      icon: 'lock',
      color: '#6b7280',
      domain,
      scopes: this.config.scopes,
      features: {
        openid: this.config.scopes!.includes('openid'),
        offline: this.config.scopes!.includes('offline_access'),
        linking: true,
        pkce: this.config.pkce
      }
    };
  }
}
