/**
 * GitHub OAuth Provider Configuration
 *
 * Supports:
 * - GitHub OAuth 2.0
 * - GitHub App integration
 * - Enterprise GitHub instances
 */

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
  baseUrl?: string; // For GitHub Enterprise
}

export interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  type: string;
  site_admin: boolean;
  name: string;
  company: string | null;
  blog: string;
  location: string;
  email: string | null;
  hireable: boolean;
  bio: string;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  private_gists: number;
  total_private_repos: number;
  owned_private_repos: number;
  disk_usage: number;
  collaborators: number;
  two_factor_authentication: boolean;
  plan: {
    name: string;
    space: number;
    private_repos: number;
    collaborators: number;
  };
}

export interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

export class GitHubProvider {
  private config: GitHubOAuthConfig;

  readonly endpoints = {
    authorization: this.config.baseUrl
      ? `${this.config.baseUrl}/login/oauth/authorize`
      : 'https://github.com/login/oauth/authorize',
    token: this.config.baseUrl
      ? `${this.config.baseUrl}/login/oauth/access_token`
      : 'https://github.com/login/oauth/access_token',
    userInfo: this.config.baseUrl
      ? `${this.config.baseUrl}/api/v3/user`
      : 'https://api.github.com/user',
    userEmails: this.config.baseUrl
      ? `${this.config.baseUrl}/api/v3/user/emails`
      : 'https://api.github.com/user/emails'
  };

  readonly defaultScopes = [
    'user:email',
    'read:user'
  ];

  constructor(config: GitHubOAuthConfig) {
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
    login?: string; // Suggest username
    allowSignup?: boolean;
  }): string {
    const { state, login, allowSignup = true } = params;

    const queryParams = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes!.join(' '),
      state,
      allow_signup: allowSignup.toString()
    });

    if (login) {
      queryParams.append('login', login);
    }

    return `${this.endpoints.authorization}?${queryParams.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    token_type: string;
    scope: string;
    error?: string;
    error_description?: string;
  }> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri
    });

    const response = await fetch(this.endpoints.token, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
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
   * Fetch user profile
   */
  async getUserProfile(accessToken: string): Promise<GitHubUser> {
    const response = await fetch(this.endpoints.userInfo, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'POLLN-Spreadsheet'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch user emails
   */
  async getUserEmails(accessToken: string): Promise<GitHubEmail[]> {
    const response = await fetch(this.endpoints.userEmails, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'POLLN-Spreadsheet'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user emails: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get primary verified email
   */
  async getPrimaryEmail(accessToken: string): Promise<string> {
    const emails = await this.getUserEmails(accessToken);
    const primary = emails.find(e => e.primary && e.verified);

    if (!primary) {
      throw new Error('No primary verified email found');
    }

    return primary.email;
  }

  /**
   * Refresh token (GitHub uses non-expiring tokens)
   */
  async refreshAccessToken(): Promise<never> {
    throw new Error('GitHub access tokens do not expire');
  }

  /**
   * Revoke token
   */
  async revokeToken(accessToken: string, clientId: string): Promise<void> {
    // GitHub doesn't have a revoke endpoint
    // Users must revoke via GitHub settings
    // Alternative: Delete application authorization
    await fetch('https://api.github.com/applications/grants', {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${this.config.clientSecret}`)}`
      },
      body: JSON.stringify({ access_token: accessToken })
    });
  }

  /**
   * Check if token is valid
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.getUserProfile(accessToken);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get user organizations
   */
  async getUserOrganizations(accessToken: string): Promise<Array<{
    login: string;
    id: number;
    node_id: string;
    url: string;
    repos_url: string;
    events_url: string;
    hooks_url: string;
    issues_url: string;
    members_url: string;
    public_members_url: string;
    avatar_url: string;
    description: string;
  }>> {
    const response = await fetch(`${this.endpoints.userInfo}/orgs`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'POLLN-Spreadsheet'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user organizations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get provider info for UI
   */
  getProviderInfo() {
    return {
      id: 'github',
      name: 'GitHub',
      icon: 'github',
      color: '#333',
      scopes: this.config.scopes,
      features: {
        openid: false,
        offline: false,
        linking: true
      }
    };
  }

  /**
   * Parse GitHub Enterprise URL
   */
  private parseEnterpriseUrl(baseUrl: string): { api: string; auth: string } {
    const url = new URL(baseUrl);
    return {
      api: `${url.origin}/api/v3`,
      auth: `${url.origin}/login/oauth`
    };
  }

  /**
   * Generate state for CSRF protection
   */
  static generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
}
