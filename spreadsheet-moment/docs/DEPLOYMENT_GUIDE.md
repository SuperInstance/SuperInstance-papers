# 🚀 Spreadsheet Moment Deployment Guide

## ✅ Deployment Status: PRODUCTION LIVE

**Website URL:** https://spreadsheet-moment.pages.dev
**Repository:** https://github.com/SuperInstance/spreadsheet-moment
**Date:** 2026-03-15
**Status:** Fully deployed and operational

---

## 🎉 What's Been Deployed

### ✅ Completed Tasks

1. **Website Pages Created**
   - Home page (https://spreadsheet-moment.pages.dev)
   - Documentation page (https://spreadsheet-moment.pages.dev/docs.html)
   - API Reference page (https://spreadsheet-moment.pages.dev/api.html)
   - Tutorials page (https://spreadsheet-moment.pages.dev/tutorials.html)

2. **Navigation System**
   - Sticky navigation bar on all pages
   - Consistent footer with links
   - Smooth page transitions

3. **GitHub Actions Auto-Deployment**
   - Automatic deployment on push to main branch
   - Workflow file: .github/workflows/website-deploy.yml
   - Deploys both SuperInstance and Spreadsheet Moment websites

4. **Analytics Integration**
   - Cloudflare Web Analytics ready (add your token)
   - Google Analytics placeholder (add your tracking ID)

---

## 📋 What YOU Need To Do

### Step 1: Add Cloudflare API Credentials to GitHub

**REQUIRED for auto-deployment to work:**

1. Get your Cloudflare API Token:
   - Go to https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token"
   - Use "Edit Cloudflare Workers" template
   - Set permissions: Account > Cloudflare Pages > Edit
   - Copy the token

2. Get your Cloudflare Account ID:
   - Go to https://dash.cloudflare.com
   - Click on your domain/account
   - Copy Account ID from right sidebar

3. Add secrets to GitHub repository:
   - Go to: https://github.com/SuperInstance/spreadsheet-moment/settings/secrets/actions
   - Click "New repository secret"
   - Add CLOUDFLARE_API_TOKEN = (your API token)
   - Add CLOUDFLARE_ACCOUNT_ID = (your account ID)

### Step 2: (Optional) Set Up Custom Domain

**To use your own domain instead of .pages.dev:**

1. Go to https://dash.cloudflare.com
2. Navigate to Workers & Pages > spreadsheet-moment
3. Click "Custom Domains"
4. Add your domain (e.g., app.spreadsheet-moment.com)
5. Update DNS records as instructed

### Step 3: (Optional) Add Analytics

**Cloudflare Web Analytics:**
1. Go to https://dash.cloudflare.com > Analytics & Logs > Web Analytics
2. Click "Add application"
3. Copy the provided script
4. Replace token in spreadsheet-moment/website/dist/analytics.html

**Google Analytics:**
1. Create a Google Analytics property
2. Get your Measurement ID (G-XXXXXXXXXX)
3. Uncomment and update the Google Analytics script in analytics.html

---

## 🔄 How Auto-Deployment Works

**Automatic deployment triggers:**
- Push to main branch
- Changes to spreadsheet-moment/website/** files
- Manual trigger via GitHub Actions tab

**Process:**
1. You push changes to GitHub
2. GitHub Actions workflow starts automatically
3. Website files are deployed to Cloudflare Pages
4. New deployment is live within seconds

**To check deployment status:**
- Go to: https://github.com/SuperInstance/spreadsheet-moment/actions
- See workflow runs and their status

---

## 🛠️ Making Updates

### Quick Update (Recommended)

1. Edit files in spreadsheet-moment/website/dist/
2. Commit and push to GitHub
3. Auto-deployment handles the rest

```bash
git add spreadsheet-moment/website/dist/
git commit -m "Update website content"
git push origin main
```

### Using Wrangler CLI (Alternative)

```bash
cd spreadsheet-moment/website
npx wrangler pages deploy dist --project-name=spreadsheet-moment
```

---

## 🆘 Troubleshooting

### Deployment fails

**Check:**
1. GitHub Actions are enabled
2. Cloudflare credentials are correct
3. spreadsheet-moment/website/dist/ directory exists

### Website not updating

**Solution:**
1. Check GitHub Actions status
2. Clear browser cache (Ctrl+Shift+R)
3. Verify deployment completed successfully

### Analytics not working

**Check:**
1. Cloudflare analytics token is correct
2. Script is included in HTML pages
3. Wait 24 hours for data to appear

---

## 📞 Support & Resources

**Documentation:**
- Main: https://spreadsheet-moment.pages.dev/docs.html
- API: https://spreadsheet-moment.pages.dev/api.html
- Tutorials: https://spreadsheet-moment.pages.dev/tutorials.html

**Repository:**
- GitHub: https://github.com/SuperInstance/spreadsheet-moment
- Issues: https://github.com/SuperInstance/spreadsheet-moment/issues

**Community:**
- Discord: https://discord.gg/superinstance
- Email: support@superinstance.ai

---

## ✨ Deployment Checklist

- [x] Website deployed to Cloudflare Pages
- [x] Multiple pages created (Home, Docs, API, Tutorials)
- [x] Navigation system implemented
- [x] GitHub Actions auto-deployment configured
- [x] Analytics integration prepared
- [x] Responsive design implemented
- [ ] **YOUR TASK:** Add Cloudflare API credentials to GitHub
- [ ] **YOUR TASK (Optional):** Set up custom domain
- [ ] **YOUR TASK (Optional):** Add analytics tracking

---

**Status:** Production deployment complete! 🚀
**Last Updated:** 2026-03-15
**Version:** 1.0.0

*Ready for global traffic!*
