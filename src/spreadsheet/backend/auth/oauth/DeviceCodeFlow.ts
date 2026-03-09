/**
 * Device Authorization Flow
 *
 * Implements OAuth 2.0 Device Authorization Grant (RFC 8628):
 * - For CLI/mobile/TV apps without browsers
 * - Poll-based token acquisition
 * - User code display
 */

import { ProviderFactory } from './Providers';
import { OAuthManager } from './OAuthManager';

export interface DeviceAuthorizationRequest {
  providerId: string;
  clientId?: string;
  scopes?: string[];
}

export interface DeviceAuthorizationResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresIn: number;
  interval: number;
}

export interface DeviceTokenPollRequest {
  deviceCode: string;
  interval: number;
  maxAttempts?: number;
}

export interface DeviceTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string;
  scope?: string;
  idToken?: string;
}

export interface DeviceTokenError {
  error: 'authorization_pending' | 'slow_down' | 'access_denied' | 'expired_token' | string;
  errorDescription?: string;
}

export class DeviceCodeFlow {
  private activePolls = new Map<string, AbortController>();

  constructor(private oauthManager: OAuthManager) {}

  /**
   * Request device authorization
   */
  async requestDeviceAuthorization(
    request: DeviceAuthorizationRequest
  ): Promise<DeviceAuthorizationResponse> {
    const provider = ProviderFactory.get(request.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${request.providerId}`);
    }

    // Currently, only Microsoft and custom providers support device flow
    // Google and GitHub don't have native device flow support

    if (request.providerId === 'microsoft') {
      return this.requestMicrosoftDeviceCode(request);
    }

    // For custom providers, attempt device authorization
    if (request.providerId.startsWith('custom_')) {
      return this.requestCustomDeviceCode(provider, request);
    }

    throw new Error(`Provider ${request.providerId} doesn't support device flow`);
  }

  /**
   * Request Microsoft device code
   */
  private async requestMicrosoftDeviceCode(
    request: DeviceAuthorizationRequest
  ): Promise<DeviceAuthorizationResponse> {
    const provider = ProviderFactory.get(request.providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    // Microsoft device authorization endpoint
    const deviceEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/devicecode';

    const body = new URLSearchParams({
      client_id: provider['config'].clientId,
      scope: (request.scopes || ['openid', 'email', 'profile']).join(' ')
    });

    const response = await fetch(deviceEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Device authorization failed: ${error.error}`);
    }

    const data = await response.json();

    return {
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      verificationUriComplete: data.verification_uri_complete,
      expiresIn: data.expires_in,
      interval: data.interval
    };
  }

  /**
   * Request custom provider device code
   */
  private async requestCustomDeviceCode(
    provider: any,
    request: DeviceAuthorizationRequest
  ): Promise<DeviceAuthorizationResponse> {
    // Try to discover device authorization endpoint
    const discoveryUrl = provider['config']?.endpoints?.discovery;
    if (!discoveryUrl) {
      throw new Error('Device authorization not supported: no discovery endpoint');
    }

    try {
      const discovery = await fetch(discoveryUrl);
      const metadata = await discovery.json();

      if (!metadata.device_authorization_endpoint) {
        throw new Error('Device authorization endpoint not found');
      }

      const body = new URLSearchParams({
        client_id: provider['config'].clientId,
        scope: (request.scopes || ['openid', 'email', 'profile']).join(' ')
      });

      const response = await fetch(metadata.device_authorization_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Device authorization failed: ${error.error}`);
      }

      const data = await response.json();

      return {
        deviceCode: data.device_code,
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        verificationUriComplete: data.verification_uri_complete,
        expiresIn: data.expires_in,
        interval: data.interval || 5
      };
    } catch (error) {
      throw new Error(`Device authorization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Poll for token
   */
  async pollForToken(
    providerId: string,
    request: DeviceTokenPollRequest,
    onProgress?: (status: 'pending' | 'success' | 'error', error?: string) => void
  ): Promise<DeviceTokenResponse> {
    const provider = ProviderFactory.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const maxAttempts = request.maxAttempts || (1800 / request.interval); // Default 30 minutes
    let attempts = 0;

    const poll = async (): Promise<DeviceTokenResponse> => {
      attempts++;

      if (attempts > maxAttempts) {
        throw new Error('Device authorization timed out');
      }

      try {
        const token = await this.requestDeviceToken(provider, request.deviceCode);

        if (onProgress) {
          onProgress('success');
        }

        return token;
      } catch (error) {
        const err = error as DeviceTokenError;

        if (err.error === 'authorization_pending') {
          if (onProgress) {
            onProgress('pending');
          }

          // Wait before next poll
          await this.sleep(request.interval * 1000);
          return poll();
        }

        if (err.error === 'slow_down') {
          if (onProgress) {
            onProgress('pending');
          }

          // Wait longer before next poll
          await this.sleep((request.interval * 2) * 1000);
          return poll();
        }

        if (onProgress) {
          onProgress('error', err.errorDescription || err.error);
        }

        throw error;
      }
    };

    return poll();
  }

  /**
   * Poll for token with abort support
   */
  async pollForTokenWithAbort(
    providerId: string,
    request: DeviceTokenPollRequest,
    signal: AbortSignal,
    onProgress?: (status: 'pending' | 'success' | 'error', error?: string) => void
  ): Promise<DeviceTokenResponse> {
    const promise = this.pollForToken(providerId, request, onProgress);

    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => {
          reject(new Error('Polling aborted'));
        });
      })
    ]);
  }

  /**
   * Request device token
   */
  private async requestDeviceToken(
    provider: any,
    deviceCode: string
  ): Promise<DeviceTokenResponse> {
    const tokenEndpoint = provider['config']?.endpoints?.token;

    if (!tokenEndpoint) {
      throw new Error('Token endpoint not configured');
    }

    const body = new URLSearchParams({
      client_id: provider['config'].clientId,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: deviceCode
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      throw data as DeviceTokenError;
    }

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token,
      scope: data.scope,
      idToken: data.id_token
    };
  }

  /**
   * Format user code for display
   */
  formatUserCode(userCode: string): string {
    // Display as XXXX-XXXX
    if (userCode.length === 8) {
      return `${userCode.substring(0, 4)}-${userCode.substring(4)}`;
    }
    return userCode;
  }

  /**
   * Generate display instructions
   */
  generateDisplayInstructions(
    response: DeviceAuthorizationResponse,
    providerName: string
  ): string {
    const formattedCode = this.formatUserCode(response.userCode);

    return `
To sign in with ${providerName}:

1. On your computer or mobile device:
   Go to: ${response.verificationUri}

2. Enter this code:
   ${formattedCode}

3. Sign in and authorize this application

Waiting for authorization...
    `.trim();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cancel active poll
   */
  cancelPoll(deviceCode: string): void {
    const controller = this.activePolls.get(deviceCode);
    if (controller) {
      controller.abort();
      this.activePolls.delete(deviceCode);
    }
  }

  /**
   * Cancel all active polls
   */
  cancelAllPolls(): void {
    for (const controller of this.activePolls.values()) {
      controller.abort();
    }
    this.activePolls.clear();
  }

  /**
   * Get active poll count
   */
  getActivePollCount(): number {
    return this.activePolls.size;
  }

  /**
   * Check if provider supports device flow
   */
  supportsDeviceFlow(providerId: string): boolean {
    // Microsoft has native support
    if (providerId === 'microsoft') {
      return true;
    }

    // Custom providers might support it
    if (providerId.startsWith('custom_')) {
      const provider = ProviderFactory.get(providerId);
      return provider !== undefined;
    }

    return false;
  }

  /**
   * Calculate expiration time
   */
  calculateExpirationTime(expiresIn: number): Date {
    return new Date(Date.now() + expiresIn * 1000);
  }

  /**
   * Check if authorization is expired
   */
  isAuthorizationExpired(expiresAt: Date): boolean {
    return new Date() >= expiresAt;
  }

  /**
   * Get remaining time
   */
  getRemainingTime(expiresAt: Date): number {
    const remaining = expiresAt.getTime() - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  }
}
