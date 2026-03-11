import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'static',
  // Note: Cloudflare adapter not needed for static sites
  // Remove adapter for static deployment or change to output: 'server'/'hybrid'
  // adapter: cloudflare(),
  integrations: [react(), tailwind()],
  site: 'https://superinstance.ai',
  base: '/',
});