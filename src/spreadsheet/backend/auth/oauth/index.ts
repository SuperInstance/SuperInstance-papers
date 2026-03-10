/**
 * OAuth Authentication Module
 *
 * Main entry point for OAuth 2.0 and OpenID Connect functionality
 */

export { OAuthManager } from './OAuthManager';
export type {
  OAuthConfig,
  OAuthToken,
  OAuthUserProfile,
  OAuthSession,
  OAuthState
} from './OAuthManager';

export { OIDCService } from './OIDCService';
export type {
  OIDCConfiguration,
  IDTokenClaims,
  JWK,
  JWKS
} from './OIDCService';

export { AccountLinkingService } from './AccountLinking';
export type {
  LinkedAccount,
  UserAccount,
  LinkRequest
} from './AccountLinking';

export { AuthorizationCodeFlow } from './AuthorizationCodeFlow';
export type {
  AuthorizationRequest,
  AuthorizationResponse,
  TokenRequest,
  TokenResponse,
  RefreshTokenRequest
} from './AuthorizationCodeFlow';

export { DeviceCodeFlow } from './DeviceCodeFlow';
export type {
  DeviceAuthorizationRequest,
  DeviceAuthorizationResponse,
  DeviceTokenPollRequest,
  DeviceTokenResponse,
  DeviceTokenError
} from './DeviceCodeFlow';

export * from './Providers';
export * from './types';
