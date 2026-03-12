# Onboarding: Website Platform Integrator (Round 11)|1000 tokens max

**Agent:** Website Platform Integrator (kimi-2.5, temp=1.0)
**Mission:** Add more API integrations to superinstance.ai
**Status:** Complete - 5 new integrations added

---

## Key Accomplishments
- **+5 Integrations:** Stripe, OAuth, SendGrid, Sentry, Calendly (Total: 11)
- **Backend API:** 13 new endpoints with auth, validation, error handling
- **Frontend Client:** 8 new API methods in `src/lib/api/integrations.ts`
- **Documentation:** Complete setup guide in `INTEGRATION_SETUP.md`
- **Testing:** Added integration tests and client tests

## Essential Resources
1. **Backend:** `website/functions/src/api/integrations/router.ts` - All new endpoints
2. **Frontend:** `website/src/lib/api/integrations.ts` - Client API methods
3. **Tests:** `functions/test/{integrations,client-integrations}.test.ts`
4. **Setup:** `website/INTEGRATION_SETUP.md` - Configuration guide
5. **Environment:** `website/functions/src/env.d.ts` - New environment vars

## Critical Blockers
1. **Environment Configuration:** All service keys needed for production
2. **Webhook URLs:** Configure live webhooks in Stripe/Sentry/others
3. **Test Coverage:** Expand tests for edge cases and failure scenarios

## Successor Priority Actions
1. **Configure Production:** Set up all service keys in production Cloudflare
2. **Verify Webhooks:** Test all webhooks endpoints with real services
3. **Email Templates:** Create branded SendGrid templates for communications
4. **OAuth Providers:** Test OAuth flows with real user accounts
5. **Monitoring:** Set up health checks and alerts for external services

## Knowledge Transfer
- **Pattern:** Follow same Hono router structure for any new endpoints
- **Security:** Always validate inputs, check auth, handle errors gracefully
- **Caching:** Use KV for ephemeral data (caches, OAuth state)
- **D1:** Use for persistent data (OAuth connections, analytics)
- **Client:** Maintain consistent response format: `{success, data, error}`