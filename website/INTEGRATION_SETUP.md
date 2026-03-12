# SuperInstance API Integrations Setup Guide

This guide covers the setup of all API integrations added in Round 11 for the superinstance.ai platform.

## Quick Start

1. Copy the `.env.example` file and update with your API keys:
```bash
cp .env.example .env
```

2. Follow the instructions below for each integration you want to enable.

## Integration Configuration

### Stripe Payment Processing

For handling subscription payments and billing:

1. **Create a Stripe account** at https://stripe.com
2. **Get your API keys** from the Stripe Dashboard
3. **Set up webhooks** in your Stripe account pointing to `https://your-domain.com/api/integrations/stripe/webhook`
4. **Add to `.env`:**
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

5. **Create prices/products** in Stripe Dashboard for your subscriptions

### OAuth Providers (Google/GitHub/Microsoft)

For user authentication via OAuth:

#### Google OAuth
1. **Create Google OAuth credentials** at https://console.cloud.google.com/apis/credentials
2. **Add authorized redirect URI:** `https://your-domain.com/api/integrations/oauth/callback/google`
3. **Add to `.env`:**
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

#### GitHub OAuth
1. **Create GitHub OAuth App** at https://github.com/settings/applications/new
2. **Set Authorization callback URL:** `https://your-domain.com/api/integrations/oauth/callback/github`
3. **Add to `.env`:**
```env
GITHUB_OAUTH_CLIENT_ID=your-client-id
GITHUB_OAUTH_CLIENT_SECRET=your-client-secret
```

#### Microsoft OAuth
1. **Register application** at https://portal.azure.com
2. **Add redirect URI:** `https://your-domain.com/api/integrations/oauth/callback/microsoft`
3. **Add to `.env`:**
```env
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
```

### SendGrid Email Service

For sending transactional emails:

1. **Create SendGrid account** at https://sendgrid.com
2. **Get API key** from SendGrid Dashboard
3. **Verify sender** in SendGrid (domain or email)
4. **Add to `.env`:**
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
```

5. **Create email templates** in SendGrid (optional)

### Sentry Error Tracking

For monitoring errors and issues:

1. **Create Sentry project** at https://sentry.io
2. **Get DSN and project details**
3. **Add to `.env`:**
```env
SENTRY_DSN_KEY=public-key
SENTRY_PROJECT_ID=project-id
SENTRY_INGEST_URL=https://sentry.io
```

### Calendly Demo Scheduling

For booking demo calls:

1. **Get Calendly API key** at https://calendly.com/integrations/api_webhooks
2. **Find your organization URI** in Calendly settings
3. **Add to `.env`:**
```env
CALENDLY_API_KEY=CX.xxxxxxxxxxxxxxxxxxxxxxxx
```

## Additional Configuration

### User Preferences Storage
The platform uses KV storage (Cloudflare KV) for:
- User preferences
- GitHub repo cache (5min)
- OAuth state (10min)
- Email subscriptions

### Required D1 Tables
Ensure these tables exist for integrations:
```sql
CREATE TABLE oauth_connections (
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_user_id)
);

CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_data TEXT,
  category TEXT,
  created_at INTEGER NOT NULL
);
```

## Testing Integrations

1. **Run backend tests:**
```bash
cd website/functions
npm test integrations.test.ts
```

2. **Run frontend client tests:**
```bash
cd website/functions
npm test client-integrations.test.ts
```

## Security Considerations

1. **All webhooks** require proper secret validation
2. **OAuth flows** use state parameter for CSRF protection
3. **Email sending** requires authenticated users
4. **Error reporting** includes sanitized user data only
5. **Payment webhooks** include signature verification

## Troubleshooting

### Stripe webhook not working?
- Check webhook endpoint URL in Stripe dashboard
- Verify webhook secret is correctly set in `.env`
- Check Cloudflare Workers logs for errors

### OAuth redirect not working?
- Verify redirect URLs in OAuth provider settings
- Check state parameter validation
- Ensure HTTPS for production URLs

### SendGrid emails not sending?
- Verify email sender is authenticated in SendGrid
- Check API key has necessary permissions
- Review email template names if using templates

### Sentry not catching errors?
- Verify DSN format is correct
- Check Sentry project permissions
- Test error capture locally first

## API Endpoints Reference

### Stripe Integration
- `POST /api/integrations/stripe/checkout` - Create checkout session
- `POST /api/integrations/stripe/webhook` - Handle webhooks
- `POST /api/integrations/stripe/portal` - Create customer portal

### OAuth Integration
- `POST /api/integrations/oauth/connect/:provider` - Initiate OAuth flow
- `GET /api/integrations/oauth/callback/:provider` - OAuth callback handler

### Email Integration
- `POST /api/integrations/email/send` - Send email
- `GET /api/integrations/email/templates` - Get email templates
- `POST /api/integrations/email/subscribe` - Subscribe to email list

### Error Tracking
- `POST /api/integrations/errors/capture` - Capture error
- `POST /api/integrations/errors/context` - Add context
- `POST /api/integrations/errors/user` - Set user context

### Demo Scheduling
- `GET /api/integrations/calendly/event-types` - Get event types
- `POST /api/integrations/calendly/schedule` - Schedule demo
- `GET /api/integrations/calendly/events` - Get user events

### Search
- `POST /api/integrations/search` - Search content using vector DB

## Frontend Client Usage

See `src/lib/api/integrations.ts` for all client methods. Example:

```typescript
// Create checkout
const checkout = await createStripeCheckout(priceId, successUrl, cancelUrl)

// Schedule demo
const demo = await scheduleDemo({
  email: 'user@example.com',
  name: 'John Doe',
  startTime: new Date().toISOString()
})

// Capture error
await captureError('Component failed', { level: 'error' })
```

## Production Deployment

1. **Set up staging environment** first
2. **Test all integrations** in staging
3. **Configure production domain** in each service
4. **Enable webhook security** (signatures verification)
5. **Set up monitoring** for each service
6. **Document integration health** checks

## Support

For issues with specific integrations:
- **Stripe**: Check logs in Stripe Dashboard
- **OAuth**: Verify client configurations
- **SendGrid**: Monitor email delivery status
- **Sentry**: Check issue dashboard
- **Calendly**: Verify API key permissions

For codebase issues or new integrations, please open an issue on GitHub.