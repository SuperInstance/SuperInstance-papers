/**
 * OAuth Router
 *
 * Express router for OAuth 2.0 authentication endpoints
 */

import { Router, Request, Response } from 'express';
import { OAuthManager, AccountLinkingService } from '../auth/oauth/index.js';

export interface OAuthRouterConfig {
  oauthManager: OAuthManager;
  accountLinking: AccountLinkingService;
  baseUrl: string;
}

/**
 * Create OAuth router
 */
export function createOAuthRouter(config: OAuthRouterConfig): Router {
  const router = Router();
  const { oauthManager, accountLinking, baseUrl } = config;

  /**
   * GET /oauth/providers
   *
   * Get list of enabled OAuth providers
   */
  router.get('/providers', (_req: Request, res: Response) => {
    const providers = oauthManager.getProviders();

    res.json({
      providers: providers.map(p => ({
        id: p.id,
        name: p.info.name,
        icon: p.info.icon,
        color: p.info.color,
        features: p.info.features
      }))
    });
  });

  /**
   * GET /oauth/authorize/:provider
   *
   * Generate authorization URL for a provider
   *
   * Query params:
   * - redirect_uri: Custom redirect URI (optional)
   * - state: Custom state parameter (optional)
   * - login_hint: Email hint for auto-fill (optional)
   * - prompt: 'none' | 'login' | 'consent' | 'select_account' (optional)
   */
  router.get('/authorize/:provider', async (req: Request, res: Response) => {
    try {
      const provider = req.params.provider;
      const redirectUri = (req.query.redirect_uri as string) || `${baseUrl}/auth/callback`;
      const state = req.query.state as string | undefined;
      const loginHint = req.query.login_hint as string | undefined;
      const prompt = req.query.prompt as string | undefined;

      const { url, state: generatedState } = await oauthManager.getAuthorizationUrl(provider, {
        redirectUri,
        state,
        loginHint,
        prompt
      });

      res.json({
        authorization_url: url,
        state: generatedState,
        provider
      });
    } catch (error) {
      console.error('[OAuth] Authorization error:', error);
      res.status(400).json({
        error: 'authorization_failed',
        message: error instanceof Error ? error.message : 'Failed to generate authorization URL'
      });
    }
  });

  /**
   * POST /oauth/callback
   *
   * Handle OAuth callback
   *
   * Body:
   * - provider: Provider ID
   * - code: Authorization code
   * - state: State parameter
   */
  router.post('/callback', async (req: Request, res: Response) => {
    try {
      const { provider, code, state } = req.body;

      if (!provider || !code || !state) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'Missing required parameters: provider, code, state'
        });
      }

      const result = await oauthManager.handleCallback(state, code);

      if (!result.success) {
        return res.status(400).json({
          error: 'oauth_error',
          message: result.error
        });
      }

      // Get user profile
      const profile = await oauthManager.getUserProfile(result.userId!);

      if (!profile) {
        return res.status(500).json({
          error: 'profile_error',
          message: 'Failed to fetch user profile'
        });
      }

      // Create or link account
      const { account, created } = await accountLinking.createOrGetAccount(
        profile.provider,
        profile.id,
        {
          email: profile.email,
          name: profile.name,
          picture: profile.picture
        }
      );

      // Generate JWT token (would integrate with existing auth service)
      // For now, return the account info
      res.json({
        success: true,
        account: {
          id: account.id,
          email: account.email,
          name: account.name,
          picture: account.picture,
          primaryProvider: account.primaryProvider,
          linkedAccounts: account.linkedAccounts.length
        },
        created,
        profile
      });
    } catch (error) {
      console.error('[OAuth] Callback error:', error);
      res.status(500).json({
        error: 'callback_error',
        message: error instanceof Error ? error.message : 'Failed to handle OAuth callback'
      });
    }
  });

  /**
   * GET /oauth/account
   *
   * Get current user account (requires authentication)
   */
  router.get('/account', async (req: Request, res: Response) => {
    try {
      // This would use the JWT from the request
      // For now, returning a placeholder
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required'
        });
      }

      const account = accountLinking.getAccount(userId);

      if (!account) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Account not found'
        });
      }

      res.json({
        id: account.id,
        email: account.email,
        name: account.name,
        picture: account.picture,
        primaryProvider: account.primaryProvider,
        linkedAccounts: account.linkedAccounts
      });
    } catch (error) {
      console.error('[OAuth] Account error:', error);
      res.status(500).json({
        error: 'account_error',
        message: error instanceof Error ? error.message : 'Failed to fetch account'
      });
    }
  });

  /**
   * POST /oauth/link
   *
   * Link another OAuth provider to current account
   *
   * Body:
   * - provider: Provider ID
   * - code: Authorization code
   * - state: State parameter
   */
  router.post('/link', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required'
        });
      }

      const { provider, code, state } = req.body;

      if (!provider || !code || !state) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'Missing required parameters: provider, code, state'
        });
      }

      // Handle OAuth callback
      const result = await oauthManager.handleCallback(state, code);

      if (!result.success || !result.userId) {
        return res.status(400).json({
          error: 'oauth_error',
          message: result.error
        });
      }

      // Get profile
      const profile = await oauthManager.getUserProfile(result.userId);

      if (!profile) {
        return res.status(500).json({
          error: 'profile_error',
          message: 'Failed to fetch user profile'
        });
      }

      // Link to account
      const { account, created } = await accountLinking.linkProviderToAccount(userId, {
        id: `${profile.provider}:${profile.id}`,
        provider: profile.provider,
        providerUserId: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture
      });

      res.json({
        success: true,
        account,
        linked: created
      });
    } catch (error) {
      console.error('[OAuth] Link error:', error);
      res.status(500).json({
        error: 'link_error',
        message: error instanceof Error ? error.message : 'Failed to link provider'
      });
    }
  });

  /**
   * DELETE /oauth/link/:provider
   *
   * Unlink an OAuth provider from current account
   */
  router.delete('/link/:provider', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required'
        });
      }

      const provider = req.params.provider;

      // Get account to find provider user ID
      const account = accountLinking.getAccount(userId);

      if (!account) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Account not found'
        });
      }

      const linkedAccount = account.linkedAccounts.find(la => la.provider === provider);

      if (!linkedAccount) {
        return res.status(404).json({
          error: 'not_linked',
          message: 'Provider not linked to account'
        });
      }

      // Unlink provider
      await accountLinking.unlinkProvider(userId, provider, linkedAccount.providerUserId);

      // Revoke OAuth tokens
      await oauthManager.logout(`${provider}:${linkedAccount.providerUserId}`);

      res.json({
        success: true,
        message: 'Provider unlinked successfully'
      });
    } catch (error) {
      console.error('[OAuth] Unlink error:', error);
      res.status(500).json({
        error: 'unlink_error',
        message: error instanceof Error ? error.message : 'Failed to unlink provider'
      });
    }
  });

  /**
   * PUT /oauth/primary/:provider
   *
   * Set a linked provider as the primary account
   */
  router.put('/primary/:provider', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required'
        });
      }

      const provider = req.params.provider;

      // Get account to find provider user ID
      const account = accountLinking.getAccount(userId);

      if (!account) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Account not found'
        });
      }

      const linkedAccount = account.linkedAccounts.find(la => la.provider === provider);

      if (!linkedAccount) {
        return res.status(404).json({
          error: 'not_linked',
          message: 'Provider not linked to account'
        });
      }

      // Switch primary provider
      const updated = accountLinking.switchPrimaryProvider(
        userId,
        provider,
        linkedAccount.providerUserId
      );

      res.json({
        success: true,
        primaryProvider: updated?.primaryProvider
      });
    } catch (error) {
      console.error('[OAuth] Set primary error:', error);
      res.status(500).json({
        error: 'set_primary_error',
        message: error instanceof Error ? error.message : 'Failed to set primary provider'
      });
    }
  });

  /**
   * POST /oauth/refresh
   *
   * Refresh access token
   *
   * Body:
   * - provider: Provider ID
   * - refresh_token: Refresh token
   */
  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      const { provider, refresh_token } = req.body;

      if (!provider || !refresh_token) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'Missing required parameters: provider, refresh_token'
        });
      }

      const newToken = await oauthManager.refreshAccessToken(`${provider}:user`);

      if (!newToken) {
        return res.status(400).json({
          error: 'refresh_failed',
          message: 'Failed to refresh token'
        });
      }

      res.json({
        success: true,
        access_token: newToken
      });
    } catch (error) {
      console.error('[OAuth] Refresh error:', error);
      res.status(500).json({
        error: 'refresh_error',
        message: error instanceof Error ? error.message : 'Failed to refresh token'
      });
    }
  });

  /**
   * POST /oauth/logout
   *
   * Logout user and revoke tokens
   */
  router.post('/logout', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required'
        });
      }

      // Get account
      const account = accountLinking.getAccount(userId);

      if (account) {
        // Revoke all OAuth tokens
        for (const linkedAccount of account.linkedAccounts) {
          await oauthManager.logout(`${linkedAccount.provider}:${linkedAccount.providerUserId}`);
        }
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('[OAuth] Logout error:', error);
      res.status(500).json({
        error: 'logout_error',
        message: error instanceof Error ? error.message : 'Failed to logout'
      });
    }
  });

  /**
   * GET /oauth/device/code
   *
   * Request device authorization code (for CLI/mobile apps)
   *
   * Query params:
   * - provider: Provider ID
   */
  router.get('/device/code', async (req: Request, res: Response) => {
    try {
      const provider = req.query.provider as string;

      if (!provider) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'Missing required parameter: provider'
        });
      }

      const deviceFlow = oauthManager.getDeviceFlow();

      if (!deviceFlow.supportsDeviceFlow(provider)) {
        return res.status(400).json({
          error: 'not_supported',
          message: 'Provider does not support device flow'
        });
      }

      const response = await deviceFlow.requestDeviceAuthorization({
        providerId: provider
      });

      res.json({
        device_code: response.deviceCode,
        user_code: deviceFlow.formatUserCode(response.userCode),
        verification_uri: response.verificationUri,
        verification_uri_complete: response.verificationUriComplete,
        expires_in: response.expiresIn,
        interval: response.interval,
        instructions: deviceFlow.generateDisplayInstructions(response, provider)
      });
    } catch (error) {
      console.error('[OAuth] Device code error:', error);
      res.status(500).json({
        error: 'device_code_error',
        message: error instanceof Error ? error.message : 'Failed to request device code'
      });
    }
  });

  /**
   * GET /oauth/stats
   *
   * Get OAuth statistics (admin only)
   */
  router.get('/stats', (_req: Request, res: Response) => {
    const stats = accountLinking.getStats();

    res.json({
      total_accounts: stats.totalAccounts,
      total_links: stats.totalLinks,
      provider_distribution: stats.providerDistribution,
      active_sessions: oauthManager.getSessionCount(),
      enabled_providers: oauthManager.getEnabledProviders().length
    });
  });

  return router;
}

export default createOAuthRouter;
