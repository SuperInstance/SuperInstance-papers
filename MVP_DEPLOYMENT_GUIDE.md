# SuperInstance MVP - Deployment Guide

**Last Updated:** March 18, 2026
**Version:** 1.0.0-mvp
**Target Audience:** Developers, DevOps Engineers

---

## Executive Summary

This guide covers deployment of **working components only**. Since claw is not ready, this guide focuses on:
- constrainttheory (web demo)
- dodecet-encoder (Rust crate/WASM/npm package)
- spreadsheet-moment (frontend only)

**IMPORTANT:** This is **not a production deployment guide**. This is for **development, testing, and demonstration purposes only**.

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **constrainttheory** | 2 CPU, 4GB RAM | 4 CPU, 8GB RAM |
| **dodecet-encoder** | Any | Any |
| **spreadsheet-moment** | 2 CPU, 4GB RAM | 4 CPU, 16GB RAM |

### Software Requirements

- **Rust:** 1.70+ (for constrainttheory, dodecet-encoder)
- **Node.js:** 18+ (for spreadsheet-moment)
- **pnpm:** 8+ (for spreadsheet-moment)
- **Git:** For cloning repositories
- **Cloudflare Account** (for constrainttheory web demo)

---

## Deployment 1: constrainttheory Web Demo

### Option A: Cloudflare Workers (Recommended)

**Time:** 15 minutes
**Cost:** Free tier available
**Difficulty:** Easy

#### Step 1: Prepare the Project

```bash
# Clone the repository
git clone https://github.com/SuperInstance/constrainttheory.git
cd constrainttheory

# Build WASM package
cd packages/constraint-theory-wasm
wasm-pack build --target web --out-dir pkg
```

#### Step 2: Create Cloudflare Worker

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create worker
wrangler init constrainttheory-demo
cd constrainttheory-demo
```

#### Step 3: Configure Worker

Create `wrangler.toml`:

```toml
name = "constrainttheory-demo"
main = "worker.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "constrainttheory-assets"
```

Create `worker.ts`:

```typescript
import { handleRequest } from './handler';

export default {
  async fetch(request: Request): Promise<Response> {
    return handleRequest(request);
  },
};
```

#### Step 4: Deploy

```bash
# Deploy to Cloudflare
wrangler deploy

# Your demo is now live at:
# https://constrainttheory-demo.YOUR_SUBDOMAIN.workers.dev
```

#### Step 5: Configure Custom Domain (Optional)

```bash
# Add custom domain
wrangler domains add constraint-theory.superinstance.ai
```

**Result:** https://constraint-theory.superinstance.ai (already deployed)

---

### Option B: Vercel/Netlify

**Time:** 10 minutes
**Cost:** Free tier available
**Difficulty:** Easy

#### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd constrainttheory/web-simulator
vercel

# Follow prompts
# Your demo is now live!
```

#### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd constrainttheory/web-simulator
netlify deploy --prod

# Your demo is now live!
```

---

### Option C: Self-Hosted (Docker)

**Time:** 20 minutes
**Cost:** Server hosting
**Difficulty:** Medium

#### Create Dockerfile

```dockerfile
FROM nginx:alpine

# Copy built files
COPY web-simulator/dist/ /usr/share/nginx/html/

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### Build and Run

```bash
# Build image
docker build -t constrainttheory-demo .

# Run container
docker run -d -p 8080:80 constrainttheory-demo

# Access at http://localhost:8080
```

---

## Deployment 2: dodecet-encoder

### Option A: Publish to crates.io

**Time:** 30 minutes
**Cost:** Free
**Difficulty:** Medium

#### Prerequisites

- Rust installed
- crates.io account
- GitHub account

#### Step 1: Prepare for Publication

```bash
cd dodecet-encoder

# Run tests
cargo test --release

# Check documentation
cargo doc --open

# Format code
cargo fmt

# Lint
cargo clippy -- -D warnings
```

#### Step 2: Login to crates.io

```bash
cargo login
# Enter your API token
```

#### Step 3: Publish

```bash
# Dry run
cargo publish --dry-run

# Publish for real
cargo publish
```

**Result:** https://crates.io/crates/dodecet-encoder

---

### Option B: Publish to npm (WASM)

**Time:** 30 minutes
**Cost:** Free
**Difficulty:** Medium

#### Step 1: Build WASM Package

```bash
cd dodecet-encoder/wasm

# Install dependencies
npm install

# Build WASM
wasm-pack build --target bundler

# Pack for npm
npm pack
```

#### Step 2: Publish to npm

```bash
# Login to npm
npm login

# Publish
npm publish --access public
```

**Result:** https://www.npmjs.com/package/dodecet-encoder

---

### Option C: Self-Hosted Documentation

**Time:** 15 minutes
**Cost:** Free
**Difficulty:** Easy

#### Generate and Deploy Docs

```bash
cd dodecet-encoder

# Generate documentation
cargo doc --no-deps --open

# Deploy to GitHub Pages
echo "<meta http-equiv=refresh content=0;url=dodecet_encoder/index.html>" > target/doc/index.html
gh-pages -d target/doc
```

**Result:** Documentation hosted on GitHub Pages

---

## Deployment 3: spreadsheet-moment

### Option A: Vercel (Recommended)

**Time:** 20 minutes
**Cost:** Free tier available
**Difficulty:** Easy

#### Step 1: Prepare for Deployment

```bash
cd spreadsheet-moment

# Install dependencies
pnpm install

# Build packages
pnpm build

# Test build
pnpm test
```

#### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: spreadsheet-moment
# - Directory: ./website
# - Settings: Use defaults
```

#### Step 3: Configure Environment Variables

In Vercel dashboard:
- Add environment variables (if needed)
- Configure build settings
- Set up custom domain

**Result:** https://spreadsheet-moment.vercel.app

---

### Option B: Netlify

**Time:** 20 minutes
**Cost:** Free tier available
**Difficulty:** Easy

#### Step 1: Create netlify.toml

```toml
[build]
  command = "pnpm build"
  publish = "website/dist"

[functions]
  directory = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Step 2: Deploy

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

---

### Option C: Self-Hosted (Node.js)

**Time:** 30 minutes
**Cost:** Server hosting
**Difficulty:** Medium

#### Step 1: Build for Production

```bash
cd spreadsheet-moment

pnpm install
pnpm build
```

#### Step 2: Create Production Server

Create `server.js`:

```javascript
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'website/dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'website/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### Step 3: Run with PM2

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name spreadsheet-moment

# Save PM2 config
pm2 save

# Setup startup script
pm2 startup
```

---

## Deployment Architecture

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Users                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  CDN (Cloudflare)                       │
│  • Static assets (constrainttheory demo)                │
│  • DDoS protection                                      │
│  • SSL/TLS termination                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Application Servers                         │
│  • spreadsheet-moment (Vercel/Netlify)                  │
│  • constrainttheory web demo                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               Package Registries                         │
│  • crates.io (dodecet-encoder)                          │
│  • npm (dodecet-encoder WASM)                           │
└─────────────────────────────────────────────────────────┘
```

---

## Monitoring and Maintenance

### Health Checks

Create `health-check.js`:

```javascript
const https = require('https');

function checkHealth(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve(`${url} is healthy`);
      } else {
        reject(`${url} returned ${res.statusCode}`);
      }
    }).on('error', reject);
  });
}

async function main() {
  const services = [
    'https://constraint-theory.superinstance.ai',
    'https://spreadsheet-moment.vercel.app',
  ];

  for (const service of services) {
    try {
      const result = await checkHealth(service);
      console.log(`✅ ${result}`);
    } catch (error) {
      console.error(`❌ ${error}`);
    }
  }
}

main();
```

### Log Aggregation

**For development:** Use console.log

**For production:** Consider:
- Cloudflare Analytics (for web demo)
- Vercel Analytics (for spreadsheet-moment)
- Sentry (for error tracking)

---

## Security Considerations

### ⚠️ Important Security Notes

1. **No Authentication Implemented**
   - All demos are public
   - No user management
   - No access control

2. **No Rate Limiting**
   - Vulnerable to abuse
   - Consider Cloudflare rate limiting

3. **No Input Validation**
   - Sanitize all user inputs
   - Validate all API requests

4. **HTTPS Only**
   - Always use HTTPS in production
   - Configure SSL/TLS properly

5. **No Security Audit**
   - This is research software
   - Not reviewed for security
   - Use at your own risk

---

## Cost Estimates

### Free Tier Options

| Service | Free Tier | Limitations |
|---------|-----------|-------------|
| Cloudflare Workers | 100k requests/day | Fair use policy |
| Vercel | 100GB bandwidth | 10GB build logs |
| Netlify | 100GB bandwidth | 300 min build time |
| GitHub Pages | 1GB storage | 100GB bandwidth |

### Paid Tier Options

| Service | Starting Cost | When Needed |
|---------|---------------|-------------|
| Cloudflare Workers | $5/month | >100k requests/day |
| Vercel Pro | $20/month | Production usage |
| Netlify Pro | $19/month | Production usage |
| AWS Lightsail | $3.50/month | Self-hosted option |

---

## Troubleshooting

### Common Issues

**Issue:** Build fails with "Out of memory"
**Solution:** Increase Node.js memory limit: `NODE_OPTIONS=--max-old-space-size=4096 pnpm build`

**Issue:** Deployment fails with "Module not found"
**Solution:** Check that all dependencies are installed: `pnpm install`

**Issue:** Web demo shows blank page
**Solution:** Check browser console for errors, verify WASM is built correctly

**Issue:** Tests fail in production but pass locally
**Solution:** Check environment variables, verify build configuration

---

## Rollback Procedure

### Vercel Rollback

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

### Netlify Rollback

```bash
# List deployments
netlify deploy:ls

# Rollback to previous deployment
netlify deploy --prod --site [site-id] --message "Rollback"
```

### Cloudflare Rollback

```bash
# Rollback worker to previous version
wrangler rollback [worker-name]
```

---

## Backup and Recovery

### Backup Strategy

1. **Code:** GitHub (automatic)
2. **Documentation:** GitHub (automatic)
3. **Deployments:** Platform-provided backups
4. **Data:** No persistent data (stateless)

### Recovery Procedure

```bash
# Clone repository
git clone https://github.com/SuperInstance/[repo].git

# Checkout specific tag
git checkout v1.0.0-mvp

# Redeploy
vercel --prod
```

---

## Next Steps

### After Deployment

1. **Test all deployments**
   - Verify constrainttheory demo works
   - Test spreadsheet-moment loads
   - Confirm dodecet-encoder packages installable

2. **Set up monitoring**
   - Configure health checks
   - Set up error tracking
   - Monitor usage metrics

3. **Document custom domains**
   - Update DNS records
   - Configure SSL certificates
   - Update documentation

---

## Conclusion

This guide covers deployment of **working components only**. Since claw is not ready, end-to-end agent deployment is not possible.

**What you CAN deploy:**
- ✅ constrainttheory web demo
- ✅ dodecet-encoder packages
- ✅ spreadsheet-moment frontend

**What you CANNOT deploy yet:**
- ❌ claw agent engine
- ❌ End-to-end agent execution
- ❌ Production agent system

**This is for development and testing only, not production use.**

---

**Last Updated:** March 18, 2026
**Maintained By:** SuperInstance Team
**Version:** 1.0.0-mvp
