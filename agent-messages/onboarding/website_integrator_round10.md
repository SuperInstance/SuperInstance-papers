# Website Platform Integrator - Round 10 Onboarding (MAX 1,000 TOKENS)

## Executive Summary
- Built complete platform integrations for superinstance.ai
- 6 new API endpoints with GitHub, Buttondown, Plausible integrations
- Dual-track analytics (local D1 + Plausible) with GDPR compliance
- KV-cached user preferences with theme automation

## Essential Resources
- `/website/functions/src/api/integrations/router.ts` - Main integration logic
- `/website/src/lib/api/integrations.ts` - Frontend API client library
- `/website/functions/scripts/add-integration-tables.sql` - D1 schema updates
- `/website/wrangler.toml` - KV namespace bindings

## Critical Blockers
- **KV namespaces must be created**: Run `npx wrangler kv:namespace create` for all 4 namespaces before deployment
- **Third-party tokens required**: Need BUTTONDOWN_API_KEY, GITHUB_TOKEN, PLAUSIBLE_API_KEY

## Next Actions
1. Create KV namespaces using deployment script
2. Add environment secrets for external APIs
3. Test newsletter signup flow (currently localhost only)
4. Configure GitHub webhook for release notifications

## Key Insight
The integration pattern uses KV for fast lookups (user prefs, GitHub stats) while D1 stores analytics data permanently. Cache TTLs balance freshness vs API rate limits. Frontend uses client-side caching with server sync for authenticated users.

## Quick Deploy
```bash
cd website/functions
npm run deploy:integrations  # Creates namespaces + updates schema
```