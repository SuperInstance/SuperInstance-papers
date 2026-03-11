# Website Monitoring & Analytics Setup

This document outlines the monitoring and analytics setup for the SuperInstance website deployed on Cloudflare.

## Overview

The monitoring system provides:
- **Real-time analytics** - Traffic, user behavior, conversions
- **Performance monitoring** - Core Web Vitals, page load times
- **Error tracking** - JavaScript errors, API failures
- **Uptime monitoring** - Website availability
- **Security monitoring** - Security events, attacks

## Monitoring Stack

### Built-in Cloudflare Monitoring

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **Cloudflare Analytics** | Traffic analytics, bandwidth, visitors | Automatic with Pages |
| **Cloudflare Web Analytics** | Privacy-focused analytics | Enabled in `wrangler.toml` |
| **Cloudflare Error Pages** | Error tracking and reporting | Automatic with Pages |
| **Cloudflare Cache Analytics** | Cache performance | Automatic with Cloudflare |
| **Cloudflare Security Events** | Security monitoring | Automatic with WAF |

### Optional Third-Party Services

| Service | Purpose | When to Enable |
|---------|---------|----------------|
| **Google Analytics** | Advanced analytics | If detailed user tracking needed |
| **Plausible Analytics** | Privacy-focused analytics | Alternative to Google Analytics |
| **Sentry** | Error tracking | For detailed error debugging |
| **Lighthouse CI** | Performance testing | CI/CD pipeline |

## Configuration

### Cloudflare Analytics

Cloudflare Analytics is automatically enabled with Cloudflare Pages. To view analytics:

1. Go to Cloudflare Dashboard
2. Navigate to **Analytics & Logs** > **Web Analytics**
3. Select `superinstance.ai` domain
4. View real-time and historical data

### Performance Monitoring

#### Core Web Vitals Tracking

Core Web Vitals are tracked automatically by Cloudflare. Key metrics:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | > 4.0s |
| **FID** (First Input Delay) | < 100ms | > 300ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | > 0.25 |

#### Lighthouse Performance Testing

Lighthouse tests run automatically in CI/CD:

```bash
# Run locally
npm run test:performance

# View results
# Check GitHub Actions artifacts after CI run
```

### Error Tracking

#### Cloudflare Error Tracking

Errors are automatically tracked by Cloudflare Pages:

1. Go to Cloudflare Dashboard
2. Navigate to **Pages** > **superinstance-website**
3. Click **View Builds & Deployments**
4. Check **Deployment Logs** for errors

#### JavaScript Error Tracking

Client-side errors are tracked via Cloudflare's beacon API. To view:

1. Cloudflare Dashboard > **Analytics & Logs** > **Web Analytics**
2. Filter by **Errors** tab
3. View error types and frequencies

### Uptime Monitoring

#### Cloudflare Uptime Monitoring

Set up uptime checks in Cloudflare:

1. Go to **Analytics & Logs** > **Notifications**
2. Create new notification
3. Select **Uptime** trigger
4. Configure check intervals and alert channels

#### Recommended Uptime Checks

| Check | URL | Interval | Regions |
|-------|-----|----------|---------|
| Homepage | `https://superinstance.ai` | 60s | NAM, EU, APAC |
| API Health | `https://api.superinstance.ai/health` | 60s | NAM, EU |
| Documentation | `https://superinstance.ai/docs` | 300s | NAM |

## Alerting Configuration

### Critical Alerts

Set up these alerts for immediate notification:

| Alert | Condition | Notification Channel |
|-------|-----------|---------------------|
| **Website Down** | Uptime < 99% for 5 minutes | Email, Slack, PagerDuty |
| **High Error Rate** | Error rate > 5% | Email, Slack |
| **Performance Degradation** | LCP > 4s for 10% of users | Email, Slack |
| **Security Attack** | WAF blocks > 100/minute | Email, Slack, PagerDuty |

### Warning Alerts

These alerts indicate potential issues:

| Alert | Condition | Notification Channel |
|-------|-----------|---------------------|
| **Increased Latency** | TTFB > 1s for 10% of users | Email |
| **Cache Miss Rate** | Cache hit ratio < 80% | Email |
| **Bandwidth Spike** | Bandwidth > 2x daily average | Email |

## Dashboard Setup

### Cloudflare Dashboard

Recommended dashboard configuration:

1. **Overview Dashboard**
   - Requests per second
   - Bandwidth usage
   - Cache hit ratio
   - Error rate

2. **Performance Dashboard**
   - Core Web Vitals (LCP, FID, CLS)
   - Page load times
   - Time to First Byte (TTFB)

3. **Security Dashboard**
   - WAF events
   - DDoS attacks blocked
   - Bot traffic

### Custom Metrics Tracking

Track these custom metrics for business insights:

| Metric | Purpose | Tracking Method |
|--------|---------|-----------------|
| **Demo Usage** | Interactive demo engagement | Custom events |
| **Documentation Views** | Documentation page views | Page view tracking |
| **API Calls** | API endpoint usage | Custom events |
| **User Signups** | New user registrations | Conversion tracking |

## Privacy Considerations

### Data Collection Compliance

- **GDPR Compliance**: All tracking respects Do Not Track headers
- **Cookie Consent**: Implement cookie consent banner for non-essential tracking
- **Data Anonymization**: IP addresses are anonymized by default
- **Data Retention**: Configured per data type (see `monitoring.config.js`)

### Privacy-Focused Configuration

```javascript
// In monitoring.config.js
privacy: {
  anonymizeIp: true,
  respectDnt: true, // Respect Do Not Track headers
  cookieConsent: true, // Require cookie consent
  dataRetention: {
    analytics: 26, // 26 months for analytics
    logs: 30, // 30 days for logs
  }
}
```

## Troubleshooting

### Common Issues

**No analytics data appearing**
- Verify Cloudflare Analytics is enabled in `wrangler.toml`
- Check domain is properly configured in Cloudflare
- Wait 24 hours for initial data collection

**High error rates**
- Check deployment logs in Cloudflare Pages
- Review JavaScript console errors
- Verify API endpoints are responding

**Performance alerts triggering**
- Run Lighthouse audit locally
- Check resource loading times
- Review Core Web Vitals in Chrome DevTools

**Uptime alerts false positives**
- Verify uptime check URLs are correct
- Check network connectivity from monitoring regions
- Review alert thresholds

### Debugging Steps

1. **Check Cloudflare Dashboard** for immediate issues
2. **Review GitHub Actions logs** for build/deployment errors
3. **Run local tests** to reproduce issues
4. **Check browser console** for client-side errors
5. **Review monitoring configuration** for misconfigurations

## Maintenance

### Regular Tasks

| Task | Frequency | Purpose |
|------|-----------|---------|
| Review alerts | Daily | Identify ongoing issues |
| Check performance metrics | Weekly | Track performance trends |
| Review error rates | Weekly | Identify recurring errors |
| Update monitoring config | Monthly | Adjust thresholds, add new metrics |
| Audit data retention | Quarterly | Ensure compliance with policies |

### Performance Optimization

Based on monitoring data:

1. **If LCP is high**: Optimize images, implement lazy loading
2. **If FID is high**: Reduce JavaScript execution time
3. **If CLS is high**: Add size attributes to images, avoid layout shifts
4. **If TTFB is high**: Optimize server response, enable caching

## Cost Management

### Cloudflare Free Tier Limits

| Resource | Free Tier Limit | Monitoring Strategy |
|----------|-----------------|---------------------|
| Analytics data | Unlimited | No cost concerns |
| Uptime checks | 3 checks | Use for critical endpoints |
| Page rules | 3 rules | Use for redirects and caching |
| Workers requests | 100k/day | Monitor usage, upgrade if needed |

### Upgrade Considerations

Upgrade to Cloudflare Pro when:
- Uptime checks needed for more than 3 endpoints
- Advanced analytics features required
- Higher rate limits needed for Workers
- Advanced security features needed

## References

- [Cloudflare Analytics Documentation](https://developers.cloudflare.com/analytics/)
- [Core Web Vitals Documentation](https://web.dev/vitals/)
- [Cloudflare Pages Monitoring](https://developers.cloudflare.com/pages/platform/monitoring/)
- [GDPR Compliance Guide](https://gdpr.eu/)