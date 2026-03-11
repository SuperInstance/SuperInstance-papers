import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import compress from 'astro-compress';

export default defineConfig({
  output: 'static',
  // Note: Cloudflare adapter not needed for static sites
  // Remove adapter for static deployment or change to output: 'server'/'hybrid'
  // adapter: cloudflare(),
  integrations: [
    react({
      // Enable React 18 streaming
      experimentalReactChildren: true,
    }),
    tailwind(),
    compress({
      // Compress HTML, CSS, JavaScript, and images
      CSS: true,
      HTML: true,
      Image: true,
      JavaScript: true,
      SVG: true,
      // Brotli compression
      Brotli: true,
      // Gzip compression
      Gzip: true,
      // Log compression results
      verbose: true,
    }),
  ],
  site: 'https://superinstance.ai',
  base: '/',
  // Security middleware configuration
  security: {
    // Enable security headers
    headers: true,
    // Enable CSP
    csp: true,
    // Enable rate limiting (requires server-side rendering)
    rateLimit: false, // Disabled for static site
  },
  // Performance optimizations
  vite: {
    build: {
      // Enable code splitting
      rollupOptions: {
        output: {
          manualChunks: {
            // Split React into separate chunk
            'react-vendor': ['react', 'react-dom'],
            // Split UI components
            'ui-components': ['./src/components/ui/Button.tsx', './src/components/ui/Card.tsx'],
          },
        },
      },
      // Minify JavaScript
      minify: 'terser',
      // Enable sourcemaps for debugging
      sourcemap: true,
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
  },
});