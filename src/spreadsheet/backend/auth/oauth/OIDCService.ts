/**
 * OpenID Connect Service
 *
 * Handles OIDC-specific operations:
 * - Discovery endpoint
 * - ID token validation
 * - Claim extraction
 * - UserInfo endpoint
 */

import { ProviderFactory } from './Providers';
import { GoogleProvider } from './Providers/google';
import { MicrosoftProvider } from './Providers/microsoft';
import { CustomProvider } from './Providers/CustomProvider';

export interface OIDCConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  revocation_endpoint?: string;
  end_session_endpoint?: string;
  response_types_supported: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  scopes_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  claims_supported: string[];
  code_challenge_methods_supported?: string[];
}

export interface IDTokenClaims {
  iss: string; // Issuer
  sub: string; // Subject
  aud: string; // Audience
  exp: number; // Expiration
  iat: number; // Issued at
  auth_time?: number; // Authentication time
  nonce?: string; // Nonce
  acr?: string; // Authentication context class reference
  amr?: string[]; // Authentication methods references
  azp?: string; // Authorized party
  name?: string;
  given_name?: string;
  family_name?: string;
  middle_name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string;
  website?: string;
  email?: string;
  email_verified?: boolean;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: {
    formatted?: string;
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  updated_at?: number;
  [key: string]: any;
}

export interface JWK {
  kty: string; // Key type
  kid: string; // Key ID
  use: string; // Public key use
  alg: string; // Algorithm
  n?: string; // Modulus (RSA)
  e?: string; // Exponent (RSA)
  x?: string; // X coordinate (EC)
  y?: string; // Y coordinate (EC)
  crv?: string; // Curve (EC)
}

export interface JWKS {
  keys: JWK[];
}

export class OIDCService {
  /**
   * Fetch OpenID Connect discovery document
   */
  static async fetchDiscovery(
    issuer: string,
    wellKnownSuffix: string = '/.well-known/openid-configuration'
  ): Promise<OIDCConfiguration> {
    const url = issuer.endsWith(wellKnownSuffix)
      ? issuer
      : `${issuer}${wellKnownSuffix}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch discovery document: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch JWKS (JSON Web Key Set)
   */
  static async fetchJWKS(jwksUri: string): Promise<JWKS> {
    const response = await fetch(jwksUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Validate ID token
   */
  static async validateIDToken(
    idToken: string,
    config: {
      issuer: string;
      audience: string;
      jwksUri?: string;
      nonce?: string;
      maxAge?: number;
    }
  ): Promise<IDTokenClaims> {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid ID token format');
    }

    // Decode header
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1])) as IDTokenClaims;

    // Validate issuer
    if (payload.iss !== config.issuer) {
      throw new Error(`Invalid issuer: expected ${config.issuer}, got ${payload.iss}`);
    }

    // Validate audience
    if (!payload.aud.includes(config.audience)) {
      throw new Error(`Invalid audience: ${payload.aud}`);
    }

    // Validate expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    // Validate issued at
    const clockSkew = 300; // 5 minutes
    if (payload.iat > Math.floor(Date.now() / 1000) + clockSkew) {
      throw new Error('Token issued in the future');
    }

    // Validate nonce if provided
    if (config.nonce && payload.nonce !== config.nonce) {
      throw new Error('Invalid nonce');
    }

    // Validate auth time if max age is specified
    if (config.maxAge && payload.auth_time) {
      const authAge = Math.floor(Date.now() / 1000) - payload.auth_time;
      if (authAge > config.maxAge) {
        throw new Error('Authentication too old');
      }
    }

    // Validate signature if JWKS is provided
    if (config.jwksUri) {
      await this.verifySignature(idToken, config.jwksUri);
    }

    return payload;
  }

  /**
   * Verify ID token signature using JWKS
   */
  private static async verifySignature(idToken: string, jwksUri: string): Promise<void> {
    const parts = idToken.split('.');
    const header = JSON.parse(atob(parts[0]));

    // Fetch JWKS
    const jwks = await this.fetchJWKS(jwksUri);

    // Find matching key
    const key = jwks.keys.find(k => k.kid === header.kid);
    if (!key) {
      throw new Error(`Key not found: ${header.kid}`);
    }

    // In a real implementation, you would verify the signature using crypto.subtle
    // This is a simplified version that just checks the key exists
    // For production, use a proper JWT library like jose

    // TODO: Implement actual signature verification
    // - Import key using crypto.subtle.importKey
    // - Verify signature using crypto.subtle.verify
  }

  /**
   * Extract claims from ID token
   */
  static extractClaims(idToken: string): IDTokenClaims {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid ID token format');
    }

    return JSON.parse(atob(parts[1]));
  }

  /**
   * Fetch UserInfo
   */
  static async fetchUserInfo(
    userInfoEndpoint: string,
    accessToken: string
  ): Promise<IDTokenClaims> {
    const response = await fetch(userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch UserInfo: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get provider-specific OIDC configuration
   */
  static async getProviderConfiguration(
    providerId: string
  ): Promise<OIDCConfiguration | null> {
    const provider = ProviderFactory.get(providerId);
    if (!provider) {
      return null;
    }

    // Google
    if (provider instanceof GoogleProvider) {
      return provider.getOIDCConfiguration();
    }

    // Microsoft
    if (provider instanceof MicrosoftProvider) {
      return provider.getOIDCConfiguration();
    }

    // Custom provider
    if (provider instanceof CustomProvider && provider['config'].endpoints.discovery) {
      return this.fetchDiscovery(provider['config'].endpoints.discovery);
    }

    // GitHub doesn't support OIDC
    return null;
  }

  /**
   * Validate ID token for a specific provider
   */
  static async validateProviderIDToken(
    providerId: string,
    idToken: string
  ): Promise<IDTokenClaims> {
    const provider = ProviderFactory.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    // Google
    if (provider instanceof GoogleProvider) {
      const config = await provider.getOIDCConfiguration();
      const claims = this.extractClaims(idToken);

      return this.validateIDToken(idToken, {
        issuer: config.issuer,
        audience: provider['config'].clientId
      });
    }

    // Microsoft
    if (provider instanceof MicrosoftProvider) {
      const config = await provider.getOIDCConfiguration();
      const claims = this.extractClaims(idToken);

      return this.validateIDToken(idToken, {
        issuer: config.issuer,
        audience: provider['config'].clientId
      });
    }

    // Custom provider
    if (provider instanceof CustomProvider) {
      const claims = this.extractClaims(idToken);

      if (provider['config'].issuer) {
        return this.validateIDToken(idToken, {
          issuer: provider['config'].issuer,
          audience: provider['config'].audience || provider['config'].clientId,
          jwksUri: provider['config'].endpoints.jwks
        });
      }
    }

    // GitHub doesn't support OIDC
    throw new Error(`Provider ${providerId} doesn't support OIDC`);
  }

  /**
   * Get standard scopes for OIDC
   */
  static getStandardScopes(): string[] {
    return [
      'openid',
      'profile',
      'email',
      'address',
      'phone',
      'offline_access'
    ];
  }

  /**
   * Check if provider supports OIDC
   */
  static supportsOIDC(providerId: string): boolean {
    const provider = ProviderFactory.get(providerId);
    if (!provider) {
      return false;
    }

    return provider instanceof GoogleProvider ||
           provider instanceof MicrosoftProvider ||
           (provider instanceof CustomProvider && provider['config'].scopes?.includes('openid'));
  }

  /**
   * Generate nonce for ID token validation
   */
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Build claims parameter
   */
  static buildClaimsParameter(params: {
    idToken?: Record<string, null | string>;
    userInfo?: Record<string, null | string>;
  }): string {
    const claims: any = {};

    if (params.idToken) {
      claims.id_token = params.idToken;
    }

    if (params.userInfo) {
      claims.userinfo = params.userInfo;
    }

    return JSON.stringify(claims);
  }

  /**
   * Get end session URL (for logout)
   */
  static getEndSessionUrl(
    providerId: string,
    postLogoutRedirectUri: string,
    idTokenHint?: string
  ): string | null {
    const provider = ProviderFactory.get(providerId);
    if (!provider) {
      return null;
    }

    // Microsoft
    if (provider instanceof MicrosoftProvider) {
      return provider.getSignOutUrl(postLogoutRedirectUri);
    }

    // For other providers, you'd need to construct from discovery document
    return null;
  }
}
