/**
 * OAuth Types
 *
 * Shared type definitions for OAuth 2.0 and OpenID Connect
 */

/**
 * OAuth configuration interface
 */
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

/**
 * OAuth token response
 */
export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

/**
 * OAuth user profile
 */
export interface OAuthUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: string;
  rawProfile: any;
}

/**
 * OAuth provider configuration
 */
export interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  revocationEndpoint?: string;
  issuer?: string;
  audience?: string;
  pkce?: boolean;
}

/**
 * OAuth error response
 */
export interface OAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
  state?: string;
}

/**
 * OAuth session state
 */
export interface OAuthSessionState {
  state: string;
  codeVerifier?: string;
  redirectUri: string;
  provider: string;
  createdAt: number;
  expiresAt: number;
}
