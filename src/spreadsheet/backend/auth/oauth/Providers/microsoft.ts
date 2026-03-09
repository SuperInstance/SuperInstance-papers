/**
 * Microsoft Azure AD OAuth Provider Configuration
 *
 * Supports:
 * - Microsoft identity platform (v2.0)
 * - Azure AD B2C
 * - Azure AD (v1.0)
 * - Multi-tenant organizations
 */

export interface MicrosoftOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
  authority?: string; // 'common' | 'organizations' | 'consumers' | custom tenant
  tenantId?: string;
}

export interface MicrosoftUser {
  id: string;
  displayName: string;
  givenName: string;
  surname: string;
  userPrincipalName: string;
  mail: string;
  otherMails?: string[];
  jobTitle?: string;
  officeLocation?: string;
  preferredLanguage?: string;
  businessPhones?: string[];
  mobilePhone?: string;
  usageLocation?: string;
  accountEnabled?: boolean;
}

export interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  expires_on?: string;
  id_token: string;
  token_type: string;
  scope: string;
  resource?: string;
}

export class MicrosoftProvider {
  private config: MicrosoftOAuthConfig;

  readonly endpoints = {
    authorization: `https://login.microsoftonline.com/${this.config.authority || 'common'}/oauth2/v2.0/authorize`,
    token: `https://login.microsoftonline.com/${this.config.authority || 'common'}/oauth2/v2.0/token`,
    userInfo: 'https://graph.microsoft.com/v1.0/me',
    discovery: `https://login.microsoftonline.com/${this.config.authority || 'common'}/v2.0/.well-known/openid-configuration`
  };

  readonly defaultScopes = [
    'openid',
    'email',
    'profile',
    'User.Read'
  ];

  constructor(config: MicrosoftOAuthConfig) {
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
    prompt?: 'login' | 'none' | 'consent' | 'select_account';
    loginHint?: string;
    domainHint?: string; // 'consumers' | 'organizations'
  }): string {
    const {
      state,
      codeVerifier,
      prompt = 'select_account',
      loginHint,
      domainHint
    } = params;

    const queryParams = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes!.join(' '),
      state,
      prompt,
      response_mode: 'query'
    });

    if (codeVerifier) {
      const challenge = this.generateCodeChallenge(codeVerifier);
      queryParams.append('code_challenge', challenge);
      queryParams.append('code_challenge_method', 'S256');
    }

    if (loginHint) {
      queryParams.append('login_hint', loginHint);
    }

    if (domainHint) {
      queryParams.append('domain_hint', domainHint);
    }

    return `${this.endpoints.authorization}?${queryParams.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier?: string
  ): Promise<MicrosoftTokenResponse> {
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
  async refreshAccessToken(refreshToken: string): Promise<MicrosoftTokenResponse> {
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
   * Fetch user profile using Microsoft Graph API
   */
  async getUserProfile(accessToken: string): Promise<MicrosoftUser> {
    const response = await fetch(this.endpoints.userInfo, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user's photo
   */
  async getUserPhoto(accessToken: string): Promise<ArrayBuffer | null> {
    const response = await fetch(`${this.endpoints.userInfo}/photo/$value`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      return null;
    }

    return response.arrayBuffer();
  }

  /**
   * Validate ID token
   */
  async validateIdToken(idToken: string): Promise<any> {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid ID token format');
    }

    const payload = JSON.parse(atob(parts[1]));

    // Basic validation
    if (!payload.iss?.includes('login.microsoftonline.com')) {
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
   * Get user's groups
   */
  async getUserGroups(accessToken: string): Promise<Array<{
    id: string;
    displayName: string;
    description?: string;
  }>> {
    const response = await fetch(`${this.endpoints.userInfo}/memberOf`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user groups: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
  }

  /**
   * Revoke token (sign out)
   */
  async revokeToken(): Promise<void> {
    // Microsoft doesn't have a revoke endpoint
    // Tokens are invalidated when user signs out
    // Can use end_session_endpoint to sign out
  }

  /**
   * Get sign-out URL
   */
  getSignOutUrl(postLogoutRedirectUri: string): string {
    return `https://login.microsoftonline.com/${this.config.authority || 'common'}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
  }

  /**
   * Get OpenID Connect configuration
   */
  async getOIDCConfiguration(): Promise<any> {
    const response = await fetch(this.endpoints.discovery);
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
    return MicrosoftProvider.base64UrlEncode(array);
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
    return MicrosoftProvider.base64UrlEncode(data);
  }

  /**
   * Get provider info for UI
   */
  getProviderInfo() {
    return {
      id: 'microsoft',
      name: 'Microsoft',
      icon: 'microsoft',
      color: '#00a4ef',
      scopes: this.config.scopes,
      features: {
        openid: true,
        offline: true,
        linking: true
      }
    };
  }

  /**
   * Parse tenant from authority
   */
  private getTenant(): string {
    if (this.config.tenantId) {
      return this.config.tenantId;
    }

    const authority = this.config.authority || 'common';
    if (authority.includes('organizations')) {
      return 'organizations';
    } else if (authority.includes('consumers')) {
      return 'consumers';
    }

    return 'common';
  }
}
